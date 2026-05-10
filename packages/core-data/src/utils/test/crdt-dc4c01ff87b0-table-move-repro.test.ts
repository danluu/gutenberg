/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/heading',
			attributes: {
				content: { type: 'rich-text' },
				level: { type: 'number' },
			},
		},
		{
			name: 'core/table',
			attributes: {
				body: {
					type: 'array',
					query: {
						cells: {
							type: 'array',
							query: {
								content: { type: 'rich-text' },
								tag: { type: 'string' },
							},
						},
					},
				},
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

const heading = (): Block => ( {
	name: 'core/heading',
	clientId: 'heading',
	attributes: { content: 'Seed 952073 heading', level: 2 },
	innerBlocks: [],
} );

const paragraph = ( clientId: string, content: string ): Block => ( {
	name: 'core/paragraph',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const table = (): Block => ( {
	name: 'core/table',
	clientId: 'table',
	attributes: {
		body: [
			{
				cells: [
					{
						content: 'Seed 952073 table cell',
						tag: 'td',
					},
				],
			},
		],
	},
	innerBlocks: [],
} );

const summarize = ( blocks: Block[] ) =>
	blocks.map( ( block ) => `${ block.name }:${ block.clientId }` );

const INITIAL_BLOCKS = [
	heading(),
	paragraph( 'paragraph-a', 'First paragraph' ),
	paragraph( 'paragraph-b', 'Second paragraph' ),
];

const AFTER_APPEND = [
	heading(),
	paragraph( 'paragraph-a', 'First paragraph' ),
	paragraph( 'paragraph-b', 'Second paragraph' ),
	paragraph( 'paragraph-c', 'Appended paragraph' ),
];

const AFTER_TABLE_INSERT = [
	heading(),
	paragraph( 'paragraph-a', 'First paragraph' ),
	paragraph( 'paragraph-b', 'Second paragraph' ),
	paragraph( 'paragraph-c', 'Appended paragraph' ),
	table(),
];

const AFTER_TABLE_MOVE_TO_INDEX_2 = [
	heading(),
	paragraph( 'paragraph-a', 'First paragraph' ),
	table(),
	paragraph( 'paragraph-b', 'Second paragraph' ),
	paragraph( 'paragraph-c', 'Appended paragraph' ),
];

const AFTER_STALE_PARAGRAPH_EDIT = [
	heading(),
	paragraph( 'paragraph-a', 'First paragraph' ),
	paragraph( 'paragraph-b', 'Second paragraph' ),
	paragraph( 'paragraph-c', 'Peer edited paragraph' ),
];

describe( 'dc4c01ff87b0 table top-level move replay', () => {
	it( 'keeps the moved table at index 2 when the receiver publishes its pre-move snapshot', () => {
		const actorDoc = new Y.Doc();
		const peerDoc = new Y.Doc();
		const actorBlocks = actorDoc.getArray< YBlock >( 'blocks' );
		const peerBlocks = peerDoc.getArray< YBlock >( 'blocks' );

		try {
			mergeCrdtBlocks( actorBlocks, INITIAL_BLOCKS, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, INITIAL_BLOCKS, null );

			mergeCrdtBlocks( actorBlocks, AFTER_APPEND, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null );

			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_INSERT, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, AFTER_TABLE_INSERT, null );

			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_MOVE_TO_INDEX_2, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );

			mergeCrdtBlocks( peerBlocks, AFTER_TABLE_INSERT, null );
			Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( peerDoc ) );

			for ( const blocks of [
				actorBlocks.toJSON() as Block[],
				peerBlocks.toJSON() as Block[],
			] ) {
				expect( summarize( blocks ) ).toEqual( [
					'core/heading:heading',
					'core/paragraph:paragraph-a',
					'core/table:table',
					'core/paragraph:paragraph-b',
					'core/paragraph:paragraph-c',
				] );
			}
		} finally {
			actorDoc.destroy();
			peerDoc.destroy();
		}
	} );

	it( 'does not apply a stale pre-table snapshot as a table move to index 0', () => {
		const actorDoc = new Y.Doc();
		const peerDoc = new Y.Doc();
		const actorBlocks = actorDoc.getArray< YBlock >( 'blocks' );
		const peerBlocks = peerDoc.getArray< YBlock >( 'blocks' );

		try {
			mergeCrdtBlocks( actorBlocks, INITIAL_BLOCKS, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, INITIAL_BLOCKS, null );

			mergeCrdtBlocks( actorBlocks, AFTER_APPEND, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null );

			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_INSERT, null );
			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_MOVE_TO_INDEX_2, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );

			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null );
			Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( peerDoc ) );

			for ( const blocks of [
				actorBlocks.toJSON() as Block[],
				peerBlocks.toJSON() as Block[],
			] ) {
				expect( summarize( blocks ) ).toEqual( [
					'core/heading:heading',
					'core/paragraph:paragraph-a',
					'core/table:table',
					'core/paragraph:paragraph-b',
					'core/paragraph:paragraph-c',
				] );
			}
		} finally {
			actorDoc.destroy();
			peerDoc.destroy();
		}
	} );

	it( 'preserves the moved table when the stale peer snapshot is passed as an explicit base record', () => {
		const actorDoc = new Y.Doc();
		const peerDoc = new Y.Doc();
		const actorBlocks = actorDoc.getArray< YBlock >( 'blocks' );
		const peerBlocks = peerDoc.getArray< YBlock >( 'blocks' );

		try {
			mergeCrdtBlocks( actorBlocks, INITIAL_BLOCKS, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, INITIAL_BLOCKS, null );

			mergeCrdtBlocks( actorBlocks, AFTER_APPEND, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null );

			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_INSERT, null );
			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_MOVE_TO_INDEX_2, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );

			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null, AFTER_APPEND );
			Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( peerDoc ) );

			for ( const blocks of [
				actorBlocks.toJSON() as Block[],
				peerBlocks.toJSON() as Block[],
			] ) {
				expect( summarize( blocks ) ).toEqual( [
					'core/heading:heading',
					'core/paragraph:paragraph-a',
					'core/table:table',
					'core/paragraph:paragraph-b',
					'core/paragraph:paragraph-c',
				] );
			}
		} finally {
			actorDoc.destroy();
			peerDoc.destroy();
		}
	} );

	it( 'merges a stale peer paragraph edit without deleting the remotely moved table', () => {
		const actorDoc = new Y.Doc();
		const peerDoc = new Y.Doc();
		const actorBlocks = actorDoc.getArray< YBlock >( 'blocks' );
		const peerBlocks = peerDoc.getArray< YBlock >( 'blocks' );

		try {
			mergeCrdtBlocks( actorBlocks, INITIAL_BLOCKS, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, INITIAL_BLOCKS, null );

			mergeCrdtBlocks( actorBlocks, AFTER_APPEND, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );
			mergeCrdtBlocks( peerBlocks, AFTER_APPEND, null );

			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_INSERT, null );
			mergeCrdtBlocks( actorBlocks, AFTER_TABLE_MOVE_TO_INDEX_2, null );
			Y.applyUpdate( peerDoc, Y.encodeStateAsUpdate( actorDoc ) );

			mergeCrdtBlocks(
				peerBlocks,
				AFTER_STALE_PARAGRAPH_EDIT,
				null,
				AFTER_APPEND
			);
			Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( peerDoc ) );

			for ( const blocks of [
				actorBlocks.toJSON() as Block[],
				peerBlocks.toJSON() as Block[],
			] ) {
				expect( summarize( blocks ) ).toEqual( [
					'core/heading:heading',
					'core/paragraph:paragraph-a',
					'core/table:table',
					'core/paragraph:paragraph-b',
					'core/paragraph:paragraph-c',
				] );
				expect( blocks[ 4 ].attributes.content ).toBe(
					'Peer edited paragraph'
				);
			}
		} finally {
			actorDoc.destroy();
			peerDoc.destroy();
		}
	} );
} );
