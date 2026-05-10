/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => {
	const serialize = ( block: {
		attributes?: Record< string, unknown >;
		innerBlocks?: unknown[];
		name: string;
	} ): string => {
		switch ( block.name ) {
			case 'core/paragraph':
				return `<p>${ block.attributes?.content ?? '' }</p>`;
			case 'core/heading':
				return `<h3>${ block.attributes?.content ?? '' }</h3>`;
			case 'core/group':
				return `<div class="wp-block-group">${ (
					block.innerBlocks ?? []
				)
					.map( serialize )
					.join( '' ) }</div>`;
			case 'core/search':
				return '<form class="wp-block-search"></form>';
			default:
				return '';
		}
	};

	return {
		__unstableSerializeAndClean: ( blocks: unknown[] ) =>
			blocks.map( serialize ).join( '\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: () => [],
	getShiftedSelection: ( selection: unknown ) => selection,
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import type { Block, YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

const STEP_4_USER_1 = 'Seed 953336 step 4 user 1 concurrent paragraph 770817';
const STEP_4_USER_0 = 'Seed 953336 step 4 user 0 concurrent paragraph 371104';
const STEP_5_HEADING = 'Seed 953336 step 5 user 1 heading';
const STEP_2_PARAGRAPH = 'Seed 953336 step 2 user 1 paragraph 934955';
const INITIAL_NESTED_PARAGRAPH = 'Seed 953336 step 1 user 1 nested paragraph';
const NESTED_PARAGRAPH = 'Nested update seed 953336 step 3 user 1 997472';
const NESTED_HEADING = 'Seed 953336 step 1 user 1 nested heading';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953336-2-1-end';
const SEARCH_LABEL =
	'Search label rtc-save-search-option-marker-953336-2-1-end';

function paragraph( clientId: string, content: string ): Block {
	return {
		attributes: { content },
		clientId,
		innerBlocks: [],
		name: 'core/paragraph',
	};
}

function heading( clientId: string, content: string, level = 3 ): Block {
	return {
		attributes: { content, level },
		clientId,
		innerBlocks: [],
		name: 'core/heading',
	};
}

function group( nestedParagraphContent: string ): Block {
	return {
		attributes: { layout: { type: 'constrained' } },
		clientId: 'group',
		innerBlocks: [
			paragraph( 'group-nested-paragraph', nestedParagraphContent ),
			heading( 'group-nested-heading', NESTED_HEADING, 3 ),
		],
		name: 'core/group',
	};
}

function search(): Block {
	return {
		attributes: {
			buttonPosition: 'button-inside',
			buttonText: 'Find rtc-save-search-option-marker-953336-2-1-end',
			label: SEARCH_LABEL,
			placeholder:
				'Search placeholder rtc-save-search-option-marker-953336-2-1-end',
			showLabel: true,
		},
		clientId: 'search',
		innerBlocks: [],
		name: 'core/search',
	};
}

function checkpointBlocks(): Block[] {
	return [
		paragraph( 'baseline', 'Seed 953336 baseline paragraph.' ),
		paragraph(
			'second',
			'Seed 953336 keeps a second paragraph for deletes and moves.'
		),
		paragraph( 'shared', 'Shared editing target paragraph.' ),
		paragraph(
			'step0-user1',
			'Seed 953336 step 0 user 1 concurrent paragraph 823861'
		),
		paragraph(
			'step0-user0',
			'Seed 953336 step 0 user 0 concurrent paragraph 288211'
		),
		group( INITIAL_NESTED_PARAGRAPH ),
		paragraph( 'step2', STEP_2_PARAGRAPH ),
		paragraph( 'checkpoint', CHECKPOINT_PARAGRAPH ),
		search(),
	];
}

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) );
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/paragraph' ) {
				return `<p>${ block.attributes.content }</p>`;
			}
			if ( block.name === 'core/heading' ) {
				return `<h3>${ block.attributes.content }</h3>`;
			}
			if ( block.name === 'core/group' ) {
				return `<div>${ serializeBlocks(
					block.innerBlocks ?? []
				) }</div>`;
			}
			return '<form></form>';
		} )
		.join( '\n' );
}

function applyBlocks( doc: Y.Doc, blocks: Block[], baseBlocks?: Block[] ) {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks: cloneBlocks( blocks ),
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks
			? {
					baseRecord: {
						blocks: cloneBlocks( baseBlocks ),
						content: serializeBlocks( baseBlocks ),
					},
			  }
			: {}
	);
}

function syncDocs( a: Y.Doc, b: Y.Doc ) {
	Y.applyUpdate( b, Y.encodeStateAsUpdate( a ) );
	Y.applyUpdate( a, Y.encodeStateAsUpdate( b ) );
}

function postBlocks( doc: Y.Doc ): Block[] {
	const yblocks = getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
	return yblocks.toJSON() as Block[];
}

function moveClientIdTo(
	blocks: Block[],
	clientId: string,
	targetIndex: number
) {
	const moved = cloneBlocks( blocks );
	const sourceIndex = moved.findIndex(
		( block ) => block.clientId === clientId
	);
	const [ block ] = moved.splice( sourceIndex, 1 );
	moved.splice( targetIndex, 0, block );
	return moved;
}

function mutateNestedGroupParagraph( blocks: Block[] ): Block[] {
	return blocks.map( ( block ) =>
		block.name === 'core/group' ? group( NESTED_PARAGRAPH ) : block
	);
}

function appendAfter(
	blocks: Block[],
	afterClientId: string,
	blockToInsert: Block
): Block[] {
	const next = cloneBlocks( blocks );
	const index = next.findIndex(
		( block ) => block.clientId === afterClientId
	);
	next.splice( index + 1, 0, blockToInsert );
	return next;
}

function insertBefore(
	blocks: Block[],
	beforeClientId: string,
	blockToInsert: Block
): Block[] {
	const next = cloneBlocks( blocks );
	const index = next.findIndex(
		( block ) => block.clientId === beforeClientId
	);
	next.splice( index, 0, blockToInsert );
	return next;
}

function createDocsAtLivePreMoveState() {
	const primaryDoc = new Y.Doc();
	const collaboratorDoc = new Y.Doc();
	const checkpoint = checkpointBlocks();

	applyBlocks( primaryDoc, checkpoint );
	syncDocs( primaryDoc, collaboratorDoc );

	let collaboratorBlocks = mutateNestedGroupParagraph( checkpoint );
	applyBlocks( collaboratorDoc, collaboratorBlocks, checkpoint );
	syncDocs( primaryDoc, collaboratorDoc );

	let collaboratorBase = collaboratorBlocks;
	collaboratorBlocks = appendAfter(
		collaboratorBlocks,
		'search',
		paragraph( 'step4-user1', STEP_4_USER_1 )
	);
	applyBlocks( collaboratorDoc, collaboratorBlocks, collaboratorBase );
	syncDocs( primaryDoc, collaboratorDoc );

	const primaryBase = postBlocks( primaryDoc );
	const primaryBlocks = appendAfter(
		primaryBase,
		'step4-user1',
		paragraph( 'step4-user0', STEP_4_USER_0 )
	);
	applyBlocks( primaryDoc, primaryBlocks, primaryBase );
	syncDocs( primaryDoc, collaboratorDoc );

	collaboratorBase = postBlocks( collaboratorDoc );
	collaboratorBlocks = insertBefore(
		collaboratorBase,
		'shared',
		heading( 'step5-heading', STEP_5_HEADING, 4 )
	);
	applyBlocks( collaboratorDoc, collaboratorBlocks, collaboratorBase );
	syncDocs( primaryDoc, collaboratorDoc );

	return {
		checkpoint,
		collaboratorDoc,
		primaryDoc,
	};
}

function assertNoGhostGroupFamily( blocks: Block[] ) {
	const groups = blocks.filter( ( block ) => block.name === 'core/group' );
	expect( groups ).toHaveLength( 1 );
	expect( groups[ 0 ].attributes.content ).toBeUndefined();
	expect( groups[ 0 ].innerBlocks?.[ 0 ].name ).toBe( 'core/paragraph' );
	expect( groups[ 0 ].innerBlocks?.[ 0 ].attributes.content ).toBe(
		NESTED_PARAGRAPH
	);

	const step2 = blocks.find( ( block ) => block.clientId === 'step2' );
	expect( step2?.name ).toBe( 'core/paragraph' );
	expect( step2?.attributes.content ).toBe( STEP_2_PARAGRAPH );

	const searchBlock = blocks.find( ( block ) => block.clientId === 'search' );
	expect( searchBlock?.name ).toBe( 'core/search' );
	expect( searchBlock?.attributes.content ).toBeUndefined();

	for ( const clientId of [
		'step5-heading',
		'step4-user1',
		'step4-user0',
	] ) {
		expect( blocks.some( ( block ) => block.clientId === clientId ) ).toBe(
			true
		);
	}
}

describe( '7eb444df9516 stale top-level Group move', () => {
	it( 'does not create a ghost Group when a stale checkpoint-view move down five lands on a live-edited document', () => {
		expect.hasAssertions();

		const { checkpoint, primaryDoc, collaboratorDoc } =
			createDocsAtLivePreMoveState();
		const staleMovedCheckpoint = moveClientIdTo( checkpoint, 'group', 8 );

		applyBlocks( primaryDoc, staleMovedCheckpoint, checkpoint );
		syncDocs( primaryDoc, collaboratorDoc );

		assertNoGhostGroupFamily( postBlocks( primaryDoc ) );
		assertNoGhostGroupFamily( postBlocks( collaboratorDoc ) );

		primaryDoc.destroy();
		collaboratorDoc.destroy();
	} );
} );
