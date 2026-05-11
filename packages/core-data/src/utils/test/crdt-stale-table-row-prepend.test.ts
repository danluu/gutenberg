/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
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

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn(),
	getShiftedSelection: jest.fn(),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { getRootMap } from '../crdt-utils';

const SYNCED_PROPERTIES = new Set( [ 'blocks' ] );

function tableBlock( rows: string[][] ): Block {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( cells ) => ( {
				cells: cells.map( ( content ) => ( { content, tag: 'td' } ) ),
			} ) ),
		},
		innerBlocks: [],
	};
}

function applyBlocks( doc: Y.Doc, blocks: Block[] ): void {
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks },
		SYNCED_PROPERTIES
	);
}

function syncDocs( from: Y.Doc, to: Y.Doc ): void {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function getYBlockTableRows( yblocks: Y.Array< YBlock > ): string[][] {
	const [ table ] = yblocks.toJSON() as Block[];
	const body = table.attributes.body as Array< {
		cells: Array< { content: string } >;
	} >;

	return body.map( ( row ) => row.cells.map( ( cell ) => cell.content ) );
}

function getPostTableRows( doc: Y.Doc ): string[][] {
	const blocks = getRootMap< YPostRecord >(
		doc,
		CRDT_RECORD_MAP_KEY
	).get( 'blocks' );
	return getYBlockTableRows( blocks as Y.Array< YBlock > );
}

describe( 'stale table row CRDT snapshots', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	it( 'preserves a remote appended row after a stale local prepend', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'A1' ], [ 'A2' ] ] ) ],
			null
		);
		syncDocs( docA, docB );

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ 'A1' ], [ 'A2' ], [ 'remote-appended' ] ] ) ],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'local-prepended' ], [ 'A1' ], [ 'A2' ] ] ) ],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'local-prepended' ],
			[ 'A1' ],
			[ 'A2' ],
			[ 'remote-appended' ],
		];
		expect( getYBlockTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getYBlockTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'preserves the remote row through post CRDT changes', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const baseBlocks = [ tableBlock( [ [ 'A1' ], [ 'A2' ] ] ) ];
		const remoteAppendedBlocks = [
			tableBlock( [ [ 'A1' ], [ 'A2' ], [ 'remote-appended' ] ] ),
		];
		const staleLocalPrependedBlocks = [
			tableBlock( [ [ 'local-prepended' ], [ 'A1' ], [ 'A2' ] ] ),
		];

		applyBlocks( docA, baseBlocks );
		syncDocs( docA, docB );

		applyBlocks( docB, remoteAppendedBlocks );
		syncDocs( docB, docA );

		applyBlocks( docA, staleLocalPrependedBlocks );
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'local-prepended' ],
			[ 'A1' ],
			[ 'A2' ],
			[ 'remote-appended' ],
		];
		expect( getPostTableRows( docA ) ).toEqual( expectedRows );
		expect( getPostTableRows( docB ) ).toEqual( expectedRows );
	} );
} );
