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

function tableBlockWithPartialRowIds(
	rows: Array< { cells: string[]; id?: string } >
): Block {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( row, rowIndex ) => ( {
				...( row.id ? { __unstableSyncId: row.id } : {} ),
				cells: row.cells.map( ( content, index ) => ( {
					__unstableSyncId: `${
						row.id ?? `1/attributes/body/${ rowIndex }`
					}/cells/${ index }`,
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

describe( '59b7e7cdec39 stale table body merge', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	it( 'keeps a stale-local appended replacement row without resurrecting the remotely deleted tail row', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

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

	it( 'does not keep a locally edited tail row when the remote delete arrives after a local replacement append', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

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
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'does not resurrect the deleted tail row when the stale replacement append reaches the deleting peer first', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlock( [
					[ 'initial row 1 A', 'remote edited row 1 B' ],
				] ),
			],
			null
		);
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
		syncDocs( docB, docA );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'drops an incrementally edited stale tail row when the replacement append is sent after the remote delete', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local edited deleted row A', 'initial row 2 B' ],
				] ),
			],
			null
		);

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

	it( 'does not hydrate a replacement row id onto a skipped stale row during incremental typing', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local edited deleted row A', 'initial row 2 B' ],
				] ),
			],
			null
		);

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
					[ '', '' ],
				] ),
			],
			null
		);
		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local edited deleted row A', 'initial row 2 B' ],
					[ 'local appended row A', '' ],
				] ),
			],
			null
		);
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

	it( 'does not reinsert a stale edited row when the editor replays a remote survivor edit beside the local append', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

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
					[ 'initial row 1 A', 'remote edited row 1 B' ],
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

	it( 'converges when both peers independently initialize the same table before syncing', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
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
		syncDocs( docA, docB );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'preserves row identity when an edited table snapshot keeps only some row ids', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( initialRows ) ], null );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlockWithPartialRowIds( [
					{
						cells: [ 'initial row 1 A', 'initial row 1 B' ],
						id: '1/attributes/body/0',
					},
					{
						cells: [
							'local edited deleted row A',
							'initial row 2 B',
						],
					},
				] ),
			],
			null
		);
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
		syncDocs( docA, docB );

		const expectedRows = [ [ 'initial row 1 A', 'remote edited row 1 B' ] ];
		expect( getTableRows( yblocksA ) ).toEqual( expectedRows );
		expect( getTableRows( yblocksB ) ).toEqual( expectedRows );
	} );

	it( 'carries row identity through edited table snapshots that lost their non-serialized symbol ids', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const initialBlock = tableBlockWithRowIds( [
			{ cells: [ 'initial row 1 A', 'initial row 1 B' ], id: 'row-1' },
			{ cells: [ 'initial row 2 A', 'initial row 2 B' ], id: 'row-2' },
		] );

		mergeCrdtBlocks( yblocksA, [ initialBlock ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ initialBlock ], null );

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'initial row 1 A', 'initial row 1 B' ],
					[ 'local edited deleted row A', 'initial row 2 B' ],
				] ),
			],
			null
		);
		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlockWithRowIds( [
					{
						cells: [ 'initial row 1 A', 'remote edited row 1 B' ],
						id: 'row-1',
					},
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
} );
