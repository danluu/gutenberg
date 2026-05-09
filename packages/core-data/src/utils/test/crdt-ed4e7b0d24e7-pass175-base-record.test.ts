/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: (
		blocks: {
			name: string;
			attributes: { content?: string; value?: string; citation?: string };
			innerBlocks: unknown[];
		}[]
	) =>
		blocks
			.map( ( block ) => {
				if ( block.name === 'core/heading' ) {
					return `<h2>${ block.attributes.content }</h2>`;
				}
				if ( block.name === 'core/group' ) {
					return '<div class="wp-block-group"></div>';
				}
				if ( block.name === 'core/pullquote' ) {
					return `<figure class="wp-block-pullquote"><blockquote><p>${ block.attributes.value }</p><cite>${ block.attributes.citation }</cite></blockquote></figure>`;
				}
				return `<p>${ block.attributes.content }</p>`;
			} )
			.join( '\n\n' ),
	getBlockTypes: () => [
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/pullquote',
			attributes: {
				citation: { type: 'rich-text' },
				value: { type: 'rich-text' },
			},
		},
	],
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( ( selection ) => selection ),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function makeBlock(
	name: string,
	clientId: string,
	attributes: Record< string, unknown >,
	innerBlocks: Block[] = []
): Block {
	return {
		name,
		clientId,
		attributes,
		innerBlocks,
	};
}

function paragraph( clientId: string, content: string ): Block {
	return makeBlock( 'core/paragraph', clientId, { content } );
}

function heading( clientId: string, content: string ): Block {
	return makeBlock( 'core/heading', clientId, { content } );
}

function group( clientId: string ): Block {
	return makeBlock( 'core/group', clientId, {}, [
		paragraph( 'group-paragraph', 'Seed 953941 nested paragraph' ),
		heading( 'group-heading', 'Seed 953941 nested heading' ),
	] );
}

function pullquote( clientId: string ): Block {
	return makeBlock( 'core/pullquote', clientId, {
		citation: 'a<strong>it</strong>',
		value: 'x',
	} );
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/heading' ) {
				return `<h2>${ block.attributes.content }</h2>`;
			}
			if ( block.name === 'core/group' ) {
				return '<div class="wp-block-group"></div>';
			}
			if ( block.name === 'core/pullquote' ) {
				return `<figure class="wp-block-pullquote"><blockquote><p>${ block.attributes.value }</p><cite>${ block.attributes.citation }</cite></blockquote></figure>`;
			}
			return `<p>${ block.attributes.content }</p>`;
		} )
		.join( '\n\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as Block[];
}

function summarizeBlocks( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => {
		const text =
			block.name === 'core/pullquote'
				? block.attributes.value
				: block.attributes.content;
		return `${ block.clientId }:${ block.name }:${ text ?? '' }`;
	} );
}

function applyBlocks(
	doc: Y.Doc,
	blocks: Block[],
	options: { baseRecord?: { blocks: Block[] } } = {}
) {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		options
	);
}

function createSeedBlocks() {
	return [
		paragraph( 'emoji', 'Emoji and multibyte paragraph' ),
		paragraph( 'another', 'Another paragraph exists' ),
		heading( 'heading', 'Seed 953941 heading' ),
		group( 'group' ),
	];
}

describe( 'ed4e7b0d24e7 explicit base-record stale move', () => {
	let actorDoc: Y.Doc;
	let staleMoverDoc: Y.Doc;

	beforeEach( () => {
		actorDoc = new Y.Doc();
		staleMoverDoc = new Y.Doc();
	} );

	afterEach( () => {
		actorDoc.destroy();
		staleMoverDoc.destroy();
	} );

	it( 'preserves a remote top-level Pullquote when the stale move uses cached local history', () => {
		const initialBlocks = createSeedBlocks();
		applyBlocks( actorDoc, initialBlocks );
		Y.applyUpdate( staleMoverDoc, Y.encodeStateAsUpdate( actorDoc ) );
		applyBlocks( staleMoverDoc, initialBlocks );

		const withRemotePullquote = [
			...initialBlocks,
			pullquote( 'remote-pullquote' ),
		];
		applyBlocks( actorDoc, withRemotePullquote );
		Y.applyUpdate( staleMoverDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleAdjacentMove = [
			initialBlocks[ 1 ],
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		applyBlocks( staleMoverDoc, staleAdjacentMove );

		expect( summarizeBlocks( postBlocks( staleMoverDoc ) ) ).toEqual( [
			'another:core/paragraph:Another paragraph exists',
			'emoji:core/paragraph:Emoji and multibyte paragraph',
			'heading:core/heading:Seed 953941 heading',
			'group:core/group:',
			'remote-pullquote:core/pullquote:x',
		] );
	} );

	it( 'preserves a remote top-level Pullquote when the stale move has an explicit baseRecord', () => {
		const initialBlocks = createSeedBlocks();
		applyBlocks( actorDoc, initialBlocks );
		Y.applyUpdate( staleMoverDoc, Y.encodeStateAsUpdate( actorDoc ) );
		applyBlocks( staleMoverDoc, initialBlocks, {
			baseRecord: { blocks: initialBlocks },
		} );

		const withRemotePullquote = [
			...initialBlocks,
			pullquote( 'remote-pullquote' ),
		];
		applyBlocks( actorDoc, withRemotePullquote, {
			baseRecord: { blocks: initialBlocks },
		} );
		Y.applyUpdate( staleMoverDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleAdjacentMove = [
			initialBlocks[ 1 ],
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		applyBlocks( staleMoverDoc, staleAdjacentMove, {
			baseRecord: { blocks: initialBlocks },
		} );

		expect( summarizeBlocks( postBlocks( staleMoverDoc ) ) ).toEqual( [
			'another:core/paragraph:Another paragraph exists',
			'emoji:core/paragraph:Emoji and multibyte paragraph',
			'heading:core/heading:Seed 953941 heading',
			'group:core/group:',
			'remote-pullquote:core/pullquote:x',
		] );
	} );
} );
