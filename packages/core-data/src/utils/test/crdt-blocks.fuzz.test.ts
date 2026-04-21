/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';
import {
	createSeededRandom,
	intFromEnv,
	seededRangeFromEnv,
} from './seeded-rng';

let mockDedupedClientId = 0;

jest.mock( 'uuid', () => ( {
	v4: () => `deduped-client-id-${ mockDedupedClientId++ }`,
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/image',
			attributes: {
				blob: { type: 'string', role: 'local' },
				url: { type: 'string' },
			},
		},
		{
			name: 'core/group',
			attributes: {},
		},
	],
} ) );

type PendingUpdate = {
	source: 'a' | 'b';
	update: Uint8Array;
};

const INITIAL_SYNC_ORIGIN = 'initial-sync';
const REMOTE_SYNC_ORIGIN = 'remote-sync';
const SEEDS = seededRangeFromEnv( 10, 301 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_CRDT_BLOCK_STEPS', 14, {
	min: 1,
} );

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function stripClientIds( blocks: Block[] ): Block[] {
	return JSON.parse(
		JSON.stringify( blocks, ( key, value ) =>
			key === 'clientId' ? undefined : value
		)
	) as Block[];
}

function captureLocalUpdates(
	doc: Y.Doc,
	source: PendingUpdate[ 'source' ],
	pendingUpdates: PendingUpdate[]
) {
	doc.on( 'updateV2', ( update: Uint8Array, origin: unknown ) => {
		if ( origin === INITIAL_SYNC_ORIGIN || origin === REMOTE_SYNC_ORIGIN ) {
			return;
		}

		pendingUpdates.push( { source, update } );
	} );
}

function getBlocks( yblocks: Y.Array< YBlock > ): Block[] {
	return cloneBlocks( yblocks.toJSON() as Block[] );
}

function createParagraph(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: {
			content: `${ rng.pick( [
				'alpha',
				'beta',
				'gamma',
			] ) }-${ rng.intBetween( 0, 999 ) }`,
		},
		innerBlocks: [],
	};
}

function createImage(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'core/image',
		clientId,
		attributes: {
			url: `https://example.com/${ rng.string( 'image' ) }.png`,
			blob: `blob:${ rng.string( 'local-only' ) }`,
		},
		innerBlocks: [],
	};
}

function createGroup(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string,
	innerClientId: string
): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks: [ createParagraph( rng, innerClientId ) ],
	};
}

function walkBlocks( blocks: Block[], callback: ( block: Block ) => void ) {
	for ( const block of blocks ) {
		callback( block );
		walkBlocks( block.innerBlocks ?? [], callback );
	}
}

function validateStructure( blocks: Block[] ) {
	walkBlocks( blocks, ( block ) => {
		expect( typeof block.name ).toBe( 'string' );
		expect( Array.isArray( block.innerBlocks ) ).toBe( true );

		if ( block.name === 'core/image' ) {
			expect( block.attributes ).not.toHaveProperty( 'blob' );
		}
	} );
}

function flushPendingUpdates(
	docA: Y.Doc,
	docB: Y.Doc,
	pendingUpdates: PendingUpdate[],
	rng: ReturnType< typeof createSeededRandom >,
	trace: string[]
) {
	while ( pendingUpdates.length > 0 ) {
		const updateIndex = rng.int( pendingUpdates.length );
		const [ entry ] = pendingUpdates.splice( updateIndex, 1 );
		const targetDoc = entry.source === 'a' ? docB : docA;

		trace.push( `deliver ${ entry.source } blocks` );
		Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );

		if ( rng.bool( 0.2 ) ) {
			trace.push( `replay ${ entry.source } blocks` );
			Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );
		}
	}
}

function mutateBlocks(
	blocks: Block[],
	rng: ReturnType< typeof createSeededRandom >,
	nextClientId: () => string
): string {
	const action = rng.pick( [
		'insert-paragraph',
		'insert-image',
		'insert-group',
		'edit-text',
		'move-top-level',
		'delete-top-level',
	] as const );

	switch ( action ) {
		case 'insert-paragraph': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createParagraph( rng, nextClientId() )
			);
			return action;
		}

		case 'insert-image': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createImage( rng, nextClientId() )
			);
			return action;
		}

		case 'insert-group': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createGroup( rng, nextClientId(), nextClientId() )
			);
			return action;
		}

		case 'edit-text': {
			const editableBlocks: Block[] = [];
			walkBlocks( blocks, ( block ) => {
				if (
					block.name === 'core/paragraph' &&
					typeof block.attributes.content === 'string'
				) {
					editableBlocks.push( block );
				}
			} );

			if ( editableBlocks.length === 0 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return `${ action }-fallback-insert`;
			}

			const selected = rng.pick( editableBlocks );
			selected.attributes.content = `${
				selected.attributes.content
			} ${ rng.string( 'edit' ) }`;
			return action;
		}

		case 'move-top-level': {
			if ( blocks.length < 2 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return `${ action }-fallback-insert`;
			}

			const fromIndex = rng.int( blocks.length );
			const toIndex = rng.int( blocks.length );
			const [ block ] = blocks.splice( fromIndex, 1 );
			blocks.splice( toIndex, 0, block );
			return `${ action }-${ fromIndex }-${ toIndex }`;
		}

		case 'delete-top-level': {
			if ( blocks.length <= 1 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return `${ action }-fallback-insert`;
			}

			blocks.splice( rng.int( blocks.length ), 1 );
			return action;
		}
	}

	return action;
}

function runScenario( seed: number ) {
	const rng = createSeededRandom( seed );
	const pendingUpdates: PendingUpdate[] = [];
	const trace: string[] = [];
	const docA = new Y.Doc();
	const docB = new Y.Doc();
	const yblocksA = docA.getArray< YBlock >( 'blocks' );
	const yblocksB = docB.getArray< YBlock >( 'blocks' );
	let clientIdCounter = 0;

	function nextClientId(): string {
		clientIdCounter++;
		return `fuzz-client-${ seed }-${ clientIdCounter }`;
	}

	try {
		mockDedupedClientId = 0;
		captureLocalUpdates( docA, 'a', pendingUpdates );
		captureLocalUpdates( docB, 'b', pendingUpdates );

		mergeCrdtBlocks(
			yblocksA,
			[
				createParagraph( rng, nextClientId() ),
				createGroup( rng, nextClientId(), nextClientId() ),
			],
			null
		);
		Y.applyUpdateV2(
			docB,
			Y.encodeStateAsUpdateV2( docA ),
			INITIAL_SYNC_ORIGIN
		);
		pendingUpdates.length = 0;

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			const source = rng.pick( [ 'a', 'b' ] as const );
			const sourceYBlocks = source === 'a' ? yblocksA : yblocksB;
			const nextBlocks = getBlocks( sourceYBlocks );
			const action = mutateBlocks( nextBlocks, rng, nextClientId );

			trace.push( `${ step }: ${ source } ${ action }` );
			mergeCrdtBlocks( sourceYBlocks, nextBlocks, null );

			if ( rng.bool( 0.5 ) ) {
				flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );
			}
		}

		flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );

		const blocksA = getBlocks( yblocksA );
		const blocksB = getBlocks( yblocksB );

		validateStructure( blocksA );
		validateStructure( blocksB );
		expect( stripClientIds( blocksA ) ).toEqual(
			stripClientIds( blocksB )
		);
	} catch ( error ) {
		throw new Error(
			`RTC block fuzz failed for seed ${ seed }\n${ trace.join(
				'\n'
			) }\n${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

describe( 'crdt-blocks fuzzing', () => {
	it.each( SEEDS )(
		'concurrent-block-tree-edits-preserve-structure (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);
} );
