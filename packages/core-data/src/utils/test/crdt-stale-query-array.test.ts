/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest, afterEach } from '@jest/globals';

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

function paragraphBlock( content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId: 'paragraph-1',
		attributes: { content },
		innerBlocks: [],
	};
}

function syncDocs( from: Y.Doc, to: Y.Doc ) {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function getTableBody( yblocks: Y.Array< YBlock > ) {
	return yblocks.toJSON()[ 0 ].attributes.body as {
		cells: { content: string }[];
	}[];
}

describe( 'stale query-array block snapshots', () => {
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

		return { docA, docB, yblocksA, yblocksB };
	}

	it( 'preserves a remote nested cell edit after a stale local cell edit', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'A1', 'B1' ],
			[ 'A2', 'B2' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[
				tableBlock( [
					[ 'A1', 'B1' ],
					[ 'A2', 'remote-B2' ],
				] ),
			],
			null
		);
		syncDocs( docB, docA );
		expect( getTableBody( yblocksA )[ 1 ].cells[ 1 ].content ).toBe(
			'remote-B2'
		);

		mergeCrdtBlocks(
			yblocksA,
			[
				tableBlock( [
					[ 'local-A1', 'B1' ],
					[ 'A2', 'B2' ],
				] ),
			],
			null
		);

		const body = getTableBody( yblocksA );
		expect( body[ 0 ].cells[ 0 ].content ).toBe( 'local-A1' );
		expect( body[ 1 ].cells[ 1 ].content ).toBe( 'remote-B2' );
	} );

	it( 'preserves a remote appended row after a stale local cell edit', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'A1' ],
			[ 'A2' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ 'A1' ], [ 'A2' ], [ 'remote-A3' ] ] ) ],
			null
		);
		syncDocs( docB, docA );
		expect( getTableBody( yblocksA ) ).toHaveLength( 3 );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'local-A1' ], [ 'A2' ] ] ) ],
			null
		);

		const body = getTableBody( yblocksA );
		expect( body ).toHaveLength( 3 );
		expect( body[ 0 ].cells[ 0 ].content ).toBe( 'local-A1' );
		expect( body[ 2 ].cells[ 0 ].content ).toBe( 'remote-A3' );
	} );

	it( 'preserves simultaneous stale local table cell edits and remote row appends', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'table-stale-base-seed-1240001-step-2', 'base sibling' ],
			[
				'table-stale-base-seed-1240001-step-2 row 2',
				'base row 2 sibling',
			],
		] );
		const staleLocalRows = getTableBody( yblocksA ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		const remoteRows = getTableBody( yblocksB ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		const localMarker = 'table-stale-local-cell-seed-1240001-step-2';
		const remoteMarker = 'table-stale-remote-row-seed-1240001-step-2';

		remoteRows.push( [ remoteMarker, `${ remoteMarker } sibling` ] );
		mergeCrdtBlocks( yblocksB, [ tableBlock( remoteRows ) ], null );

		staleLocalRows[ 0 ][ 0 ] = localMarker;
		mergeCrdtBlocks( yblocksA, [ tableBlock( staleLocalRows ) ], null );

		syncDocs( docB, docA );
		syncDocs( docA, docB );

		const bodyA = getTableBody( yblocksA );
		const bodyB = getTableBody( yblocksB );
		expect(
			bodyA.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === localMarker )
			)
		).toBe( true );
		expect(
			bodyA.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === remoteMarker )
			)
		).toBe( true );
		expect(
			bodyB.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === localMarker )
			)
		).toBe( true );
		expect(
			bodyB.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === remoteMarker )
			)
		).toBe( true );
	} );

	it( 'supersedes the prior local cell while preserving remote rows through repeated stale table writes', () => {
		const docLocal = new Y.Doc();
		const docRemote = new Y.Doc();
		docs.push( docLocal, docRemote );

		const yblocksLocal = docLocal.getArray< YBlock >();
		const yblocksRemote = docRemote.getArray< YBlock >();
		const step0Base = 'rtcw-1240001-0-u1-table-stale-base';
		const step0Local = 'rtcw-1240001-0-u1-table-stale-local-cell';
		const step0Remote = 'rtcw-1240001-0-u0-table-stale-remote-row';
		const step1Paragraph = 'rtcw-1240001-1-u0-append-paragraph';
		const step2Base = 'rtcw-1240001-2-u1-table-stale-base';
		const step2Local = 'rtcw-1240001-2-u1-table-stale-local-cell';
		const step2Remote = 'rtcw-1240001-2-u0-table-stale-remote-row';

		mergeCrdtBlocks(
			yblocksLocal,
			[
				tableBlock( [
					[ step0Base, `${ step0Base } sibling` ],
					[ `${ step0Base } row 2`, `${ step0Base } row 2 sibling` ],
				] ),
			],
			null
		);
		syncDocs( docLocal, docRemote );

		const step0LocalRows = getTableBody( yblocksLocal ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		const step0RemoteRows = getTableBody( yblocksRemote ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		step0RemoteRows.push( [ step0Remote, `${ step0Remote } sibling` ] );
		mergeCrdtBlocks(
			yblocksRemote,
			[ tableBlock( step0RemoteRows ) ],
			null
		);
		step0LocalRows[ 0 ][ 0 ] = step0Local;
		mergeCrdtBlocks( yblocksLocal, [ tableBlock( step0LocalRows ) ], null );
		syncDocs( docRemote, docLocal );
		syncDocs( docLocal, docRemote );

		const afterStep0Rows = getTableBody( yblocksRemote ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		mergeCrdtBlocks(
			yblocksRemote,
			[ tableBlock( afterStep0Rows ), paragraphBlock( step1Paragraph ) ],
			null
		);
		syncDocs( docRemote, docLocal );

		const step2BaseRows = getTableBody( yblocksLocal ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		step2BaseRows[ 0 ][ 0 ] = step2Base;
		mergeCrdtBlocks(
			yblocksLocal,
			[ tableBlock( step2BaseRows ), paragraphBlock( step1Paragraph ) ],
			null
		);
		syncDocs( docLocal, docRemote );

		const step2LocalRows = getTableBody( yblocksLocal ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		const step2RemoteRows = getTableBody( yblocksRemote ).map( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		step2RemoteRows.push( [ step2Remote, `${ step2Remote } sibling` ] );
		mergeCrdtBlocks(
			yblocksRemote,
			[ tableBlock( step2RemoteRows ), paragraphBlock( step1Paragraph ) ],
			null
		);
		step2LocalRows[ 0 ][ 0 ] = step2Local;
		mergeCrdtBlocks(
			yblocksLocal,
			[ tableBlock( step2LocalRows ), paragraphBlock( step1Paragraph ) ],
			null
		);
		syncDocs( docRemote, docLocal );
		syncDocs( docLocal, docRemote );

		const body = getTableBody( yblocksLocal );
		const cellContents = body.flatMap( ( row ) =>
			row.cells.map( ( cell ) => cell.content )
		);
		expect( cellContents ).not.toContain( step0Local );
		expect( cellContents ).toContain( step0Remote );
		expect(
			body.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === step2Local )
			)
		).toBe( true );
		expect(
			body.some( ( row ) =>
				row.cells.some( ( cell ) => cell.content === step2Remote )
			)
		).toBe( true );
	} );

	it( 'preserves a remote appended row when an explicit base has the row but a stale local snapshot does not', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ '' ],
			[ '' ],
		] );

		const explicitBaseWithRemoteRow = [
			tableBlock( [ [ '' ], [ '' ], [ '' ] ] ),
		];

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ '' ], [ '' ], [ '' ] ] ) ],
			null
		);
		syncDocs( docB, docA );
		expect( getTableBody( yblocksA ) ).toHaveLength( 3 );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'local-A1' ], [ '' ] ] ) ],
			{
				attributeKey: 'body.0.cells.0.content',
				clientId: 'table-1',
				offset: 'local-A1'.length,
			},
			explicitBaseWithRemoteRow
		);

		const body = getTableBody( yblocksA );
		expect( body ).toHaveLength( 3 );
		expect( body[ 0 ].cells[ 0 ].content ).toBe( 'local-A1' );
	} );

	it( 'still applies an explicit-base row deletion when no rich-text edit cursor is present', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ '' ],
			[ '' ],
		] );

		const explicitBaseWithRemoteRow = [
			tableBlock( [ [ '' ], [ '' ], [ '' ] ] ),
		];

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ '' ], [ '' ], [ '' ] ] ) ],
			null
		);
		syncDocs( docB, docA );
		expect( getTableBody( yblocksA ) ).toHaveLength( 3 );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ '' ], [ '' ] ] ) ],
			null,
			explicitBaseWithRemoteRow
		);

		expect( getTableBody( yblocksA ) ).toHaveLength( 2 );
	} );

	it( 'does not resurrect a remotely deleted row from a stale local snapshot', () => {
		const { docA, docB, yblocksA, yblocksB } = createSyncedDocs( [
			[ 'A1' ],
			[ 'A2' ],
			[ 'A3' ],
		] );

		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( [ [ 'A1' ], [ 'A2' ] ] ) ],
			null
		);
		syncDocs( docB, docA );
		expect( getTableBody( yblocksA ) ).toHaveLength( 2 );

		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( [ [ 'local-A1' ], [ 'A2' ], [ 'A3' ] ] ) ],
			null
		);

		const body = getTableBody( yblocksA );
		expect( body ).toHaveLength( 2 );
		expect( body[ 0 ].cells[ 0 ].content ).toBe( 'local-A1' );
		expect( body.map( ( row ) => row.cells[ 0 ].content ) ).not.toContain(
			'A3'
		);
	} );
} );
