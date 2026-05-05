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

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

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

function tableBlockWithRowIds(
	rows: Array< { cells: string[]; id: string } >
): Block {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( row ) => ( {
				__unstableSyncId: row.id,
				cells: row.cells.map( ( content, index ) => ( {
					__unstableSyncId: `${ row.id }/cells/${ index }`,
					content,
					tag: 'td',
				} ) ),
			} ) ),
		},
		innerBlocks: [],
	};
}

function syncDocs( from: Y.Doc, to: Y.Doc ) {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function getTableRows( yblocks: Y.Array< YBlock > ): string[][] {
	const [ table ] = yblocks.toJSON() as Block[];
	const body = table.attributes.body as Array< {
		cells: Array< { content: string } >;
	} >;

	return body.map( ( row ) => row.cells.map( ( cell ) => cell.content ) );
}

describe( 'stale table row CRDT snapshots', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	function createSyncedDocs( initialRows: string[][] ) {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

		return { docA, docB, yblocksA, yblocksB };
	}

	it( 'preserves a local appended row after a remote delete and cell edit', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		] );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'initial row 1 A', 'initial row 1 B' ] ] ) ],
			null
		);
		syncDocs( docA, docB );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlock( [
					[ 'initial row 1 A', 'remote edited row 1 B' ],
				] ),
			],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local appended row A', 'local appended row B' ],
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'does not resurrect a remotely deleted row from a stale local edit', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'initial row 1 A' ],
			[ 'initial row 2 A' ],
			[ 'initial row 3 A' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ 'initial row 1 A' ], [ 'initial row 2 A' ] ] ) ],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'local edited row 1 A' ],
					[ 'initial row 2 A' ],
					[ 'initial row 3 A' ],
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'local edited row 1 A' ],
			[ 'initial row 2 A' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'keeps a stale-local append while dropping a stale edit to a remotely deleted row', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlock( [
					[ 'initial row 1 A', 'remote edited row 1 B' ],
				] ),
			],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local edited deleted row A', 'initial row 2 B' ],
					[ 'local appended row A', 'local appended row B' ],
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'preserves a local middle insert before a remotely edited row', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'initial row 2 A', 'remote edited row 2 B' ],
				] ),
			],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[
						'local inserted middle row A',
						'local inserted middle row B',
					],
					[ 'initial row 2 A', 'initial row 2 B' ],
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'local inserted middle row A', 'local inserted middle row B' ],
			[ 'initial row 2 A', 'remote edited row 2 B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'does not delete a remote replacement row from a stale local delete', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();

		const initialBlock = tableBlockWithRowIds( [
			{ cells: [ 'initial row 1 A' ], id: 'row-1' },
			{ cells: [ 'initial row 2 A' ], id: 'row-2' },
		] );
		mergeCrdtBlocks( yblocksA, [ initialBlock ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ initialBlock ], null );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlockWithRowIds( [
					{ cells: [ 'initial row 1 A' ], id: 'row-1' },
					{ cells: [ 'remote replacement row A' ], id: 'row-3' },
				] ),
			],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlockWithRowIds( [
					{ cells: [ 'initial row 1 A' ], id: 'row-1' },
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A' ],
			[ 'remote replacement row A' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'preserves a remote edit to one duplicate row while appending from a stale local snapshot', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();

		const initialBlock = tableBlockWithRowIds( [
			{ cells: [ 'duplicate row A', 'duplicate row B' ], id: 'row-1' },
			{ cells: [ 'duplicate row A', 'duplicate row B' ], id: 'row-2' },
		] );
		mergeCrdtBlocks( yblocksA, [ initialBlock ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ initialBlock ], null );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlockWithRowIds( [
					{
						cells: [ 'duplicate row A', 'duplicate row B' ],
						id: 'row-1',
					},
					{
						cells: [ 'duplicate row A', 'remote edited row B' ],
						id: 'row-2',
					},
				] ),
			],
			null
		);
		syncDocs( docB, docA );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlockWithRowIds( [
					{
						cells: [ 'duplicate row A', 'duplicate row B' ],
						id: 'row-1',
					},
					{
						cells: [ 'duplicate row A', 'duplicate row B' ],
						id: 'row-2',
					},
					{
						cells: [
							'local appended row A',
							'local appended row B',
						],
						id: 'row-3',
					},
				] ),
			],
			null
		);
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'duplicate row A', 'duplicate row B' ],
			[ 'duplicate row A', 'remote edited row B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );
} );
