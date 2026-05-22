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

function bodyContents( yblocks: Y.Array< YBlock > ): string[][] {
	return (
		yblocks.toJSON()[ 0 ].attributes.body as {
			cells: { content: string }[];
		}[]
	 ).map( ( row ) => row.cells.map( ( cell ) => cell.content ) );
}

function syncDocs( from: Y.Doc, to: Y.Doc ): void {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function moveItem< T >( values: T[], fromIndex: number, toIndex: number ) {
	const [ value ] = values.splice( fromIndex, 1 );

	values.splice( toIndex, 0, value );
}

describe( 'table query-array remote reorder preservation', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	it( 'preserves a remotely reordered row when a stale local row edit arrives', () => {
		const initialRows = [
			[ 'a0', 'a1' ],
			[ 'b0', 'b1' ],
			[ 'c0', 'c1' ],
		];
		const remoteRows = initialRows.map( ( row ) => [ ...row ] );
		const staleLocalRows = initialRows.map( ( row ) => [ ...row ] );
		remoteRows[ 1 ][ 0 ] = 'remote-row-marker';
		moveItem( remoteRows, 1, 0 );
		staleLocalRows[ 0 ][ 0 ] = 'local-row-marker';

		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );
		const yblocksA = docA.getArray< YBlock >( 'blocks' );
		const yblocksB = docB.getArray< YBlock >( 'blocks' );

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( remoteRows ) ], null );
		syncDocs( docB, docA );
		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( staleLocalRows ) ],
			{
				attributeKey: 'body.0.cells.0.content',
				clientId: 'table-1',
				offset: 'local-row-marker'.length,
			}
		);

		expect( bodyContents( yblocksA ) ).toEqual( [
			[ 'remote-row-marker', 'b1' ],
			[ 'local-row-marker', 'a1' ],
			[ 'c0', 'c1' ],
		] );
	} );

	it( 'preserves a remotely reordered cell when a stale local cell edit arrives', () => {
		const initialRows = [
			[ 'a0', 'a1', 'a2' ],
			[ 'b0', 'b1', 'b2' ],
		];
		const remoteRows = initialRows.map( ( row ) => [ ...row ] );
		const staleLocalRows = initialRows.map( ( row ) => [ ...row ] );
		remoteRows[ 0 ][ 2 ] = 'remote-cell-marker';
		moveItem( remoteRows[ 0 ], 2, 0 );
		staleLocalRows[ 0 ][ 0 ] = 'local-cell-marker';

		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );
		const yblocksA = docA.getArray< YBlock >( 'blocks' );
		const yblocksB = docB.getArray< YBlock >( 'blocks' );

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( remoteRows ) ], null );
		syncDocs( docB, docA );
		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( staleLocalRows ) ],
			{
				attributeKey: 'body.0.cells.0.content',
				clientId: 'table-1',
				offset: 'local-cell-marker'.length,
			}
		);

		expect( bodyContents( yblocksA ) ).toEqual( [
			[ 'remote-cell-marker', 'local-cell-marker', 'a1' ],
			[ 'b0', 'b1', 'b2' ],
		] );
	} );

	it( 'preserves both markers when stale local and remote edits replace the same cell', () => {
		const initialRows = [
			[ 'a0', 'a1' ],
			[ 'b0', 'b1' ],
		];
		const remoteRows = initialRows.map( ( row ) => [ ...row ] );
		const staleLocalRows = initialRows.map( ( row ) => [ ...row ] );
		remoteRows[ 0 ][ 0 ] = 'remote-cell-marker';
		staleLocalRows[ 0 ][ 0 ] = 'local-cell-marker';

		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );
		const yblocksA = docA.getArray< YBlock >( 'blocks' );
		const yblocksB = docB.getArray< YBlock >( 'blocks' );

		mergeCrdtBlocks( yblocksA, [ tableBlock( initialRows ) ], null );
		syncDocs( docA, docB );
		mergeCrdtBlocks( yblocksB, [ tableBlock( remoteRows ) ], null );
		syncDocs( docB, docA );
		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( staleLocalRows ) ],
			{
				attributeKey: 'body.0.cells.0.content',
				clientId: 'table-1',
				offset: 'local-cell-marker'.length,
			}
		);

		const mergedCell = bodyContents( yblocksA )[ 0 ][ 0 ];
		expect( mergedCell ).toContain( 'local-cell-marker' );
		expect( mergedCell ).toContain( 'remote-cell-marker' );
	} );
} );
