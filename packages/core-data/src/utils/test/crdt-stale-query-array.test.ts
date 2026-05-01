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
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
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
import { createSeededRandom, seededRangeFromEnv } from './seeded-rng';

const TABLE_STALE_SEEDS = seededRangeFromEnv( 48, 13001 );
const TOP_LEVEL_STALE_SEEDS = seededRangeFromEnv( 48, 14001 );

function paragraphBlock( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

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

function syncDocs( from: Y.Doc, to: Y.Doc ) {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function getTableBody( yblocks: Y.Array< YBlock > ) {
	return yblocks.toJSON()[ 0 ].attributes.body as {
		cells: { content: string }[];
	}[];
}

function getParagraphContents( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] )
		.filter( ( block ) => block.name === 'core/paragraph' )
		.map( ( block ) => String( block.attributes.content ?? '' ) );
}

function cloneRows( rows: string[][] ): string[][] {
	return rows.map( ( cells ) => [ ...cells ] );
}

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function tableBodyContains(
	rows: ReturnType< typeof getTableBody >,
	value: string
): boolean {
	return rows.some( ( row ) =>
		row.cells.some( ( cell ) => cell.content === value )
	);
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

	function createSyncedBlockDocs( initialBlocks: Block[] ) {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();

		mergeCrdtBlocks( yblocksA, initialBlocks, null );
		syncDocs( docA, docB );

		return { docA, docB, yblocksA, yblocksB };
	}

	function mergeBlockSnapshot( yblocks: Y.Array< YBlock >, blocks: Block[] ) {
		mergeCrdtBlocks( yblocks, cloneBlocks( blocks ), null );
	}

	function runRandomStaleTableScenario( seed: number ) {
		const rng = createSeededRandom( seed );
		const initialRows = [
			[ `seed-${ seed }-A1`, `seed-${ seed }-B1` ],
			[ `seed-${ seed }-A2`, `seed-${ seed }-B2` ],
			[ `seed-${ seed }-A3`, `seed-${ seed }-B3` ],
		];
		const staleLocalRows = cloneRows( initialRows );
		const remoteRows = cloneRows( initialRows );
		const localMarker = `local-table-${ seed }`;
		const remoteMarker = `remote-table-${ seed }`;
		const scenario = rng.pick( [
			'remote-cell-edit',
			'remote-append-row',
			'remote-prepend-row',
			'remote-delete-row',
			'remote-append-cell',
			'remote-delete-cell',
		] as const );
		const { docA, docB, yblocksA, yblocksB } =
			createSyncedDocs( initialRows );

		try {
			switch ( scenario ) {
				case 'remote-cell-edit':
					remoteRows[ 1 ][ 1 ] = remoteMarker;
					break;

				case 'remote-append-row':
					remoteRows.push( [
						remoteMarker,
						`remote-tail-${ seed }`,
					] );
					break;

				case 'remote-prepend-row':
					remoteRows.unshift( [
						remoteMarker,
						`remote-head-${ seed }`,
					] );
					break;

				case 'remote-delete-row':
					remoteRows[ 2 ][ 0 ] = remoteMarker;
					mergeCrdtBlocks(
						yblocksB,
						[ tableBlock( remoteRows ) ],
						null
					);
					syncDocs( docB, docA );
					remoteRows.splice( 2, 1 );
					break;

				case 'remote-append-cell':
					remoteRows[ 1 ].push( remoteMarker );
					break;

				case 'remote-delete-cell':
					remoteRows[ 1 ][ 1 ] = remoteMarker;
					mergeCrdtBlocks(
						yblocksB,
						[ tableBlock( remoteRows ) ],
						null
					);
					syncDocs( docB, docA );
					remoteRows[ 1 ].splice( 1, 1 );
					break;
			}

			mergeCrdtBlocks( yblocksB, [ tableBlock( remoteRows ) ], null );
			syncDocs( docB, docA );

			staleLocalRows[ 0 ][ 0 ] = localMarker;
			mergeCrdtBlocks( yblocksA, [ tableBlock( staleLocalRows ) ], null );

			const body = getTableBody( yblocksA );
			expect( tableBodyContains( body, localMarker ) ).toBe( true );

			if (
				scenario === 'remote-delete-row' ||
				scenario === 'remote-delete-cell'
			) {
				expect( tableBodyContains( body, remoteMarker ) ).toBe( false );
			} else {
				expect( tableBodyContains( body, remoteMarker ) ).toBe( true );
			}
		} catch ( error ) {
			throw new Error(
				`Stale table query-array fuzz failed for seed ${ seed } (${ scenario }): ${
					error instanceof Error ? error.message : String( error )
				}\nBody: ${ JSON.stringify( getTableBody( yblocksA ) ) }`
			);
		}
	}

	function runRandomTopLevelStaleSnapshotScenario( seed: number ) {
		const rng = createSeededRandom( seed );
		const initialBlocks = [
			paragraphBlock( 'paragraph-a', `seed-${ seed }-A` ),
			paragraphBlock( 'paragraph-b', `seed-${ seed }-B` ),
			paragraphBlock( 'paragraph-c', `seed-${ seed }-C` ),
		];
		const staleLocalBlocks = cloneBlocks( initialBlocks );
		const remoteBlocks = cloneBlocks( initialBlocks );
		const localMarker = `local-top-level-${ seed }`;
		const remoteMarker = `remote-top-level-${ seed }`;
		const scenario = rng.pick( [
			'remote-edit-block',
			'remote-append-block',
			'remote-prepend-block',
			'remote-delete-block',
		] as const );
		const { docA, docB, yblocksA, yblocksB } =
			createSyncedBlockDocs( initialBlocks );

		try {
			switch ( scenario ) {
				case 'remote-edit-block':
					remoteBlocks[ 2 ].attributes.content = remoteMarker;
					break;

				case 'remote-append-block':
					remoteBlocks.push(
						paragraphBlock( 'remote-append', remoteMarker )
					);
					break;

				case 'remote-prepend-block':
					remoteBlocks.unshift(
						paragraphBlock( 'remote-prepend', remoteMarker )
					);
					break;

				case 'remote-delete-block':
					remoteBlocks[ 2 ].attributes.content = remoteMarker;
					mergeBlockSnapshot( yblocksB, remoteBlocks );
					syncDocs( docB, docA );
					remoteBlocks.splice( 2, 1 );
					break;
			}

			mergeBlockSnapshot( yblocksB, remoteBlocks );
			syncDocs( docB, docA );

			staleLocalBlocks[ 0 ].attributes.content = localMarker;
			mergeBlockSnapshot( yblocksA, staleLocalBlocks );

			const contents = getParagraphContents( yblocksA );
			expect( contents ).toContain( localMarker );

			if ( scenario === 'remote-delete-block' ) {
				expect( contents ).not.toContain( remoteMarker );
				expect( contents ).not.toContain( `seed-${ seed }-C` );
			} else {
				expect( contents ).toContain( remoteMarker );
			}
		} catch ( error ) {
			throw new Error(
				`Top-level stale block fuzz failed for seed ${ seed } (${ scenario }): ${
					error instanceof Error ? error.message : String( error )
				}\nBlocks: ${ JSON.stringify( yblocksA.toJSON() ) }`
			);
		}
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

	it.each( TABLE_STALE_SEEDS )(
		'preserves remote query-array operations after a stale table snapshot (seed %i)',
		( seed ) => {
			runRandomStaleTableScenario( seed );
		}
	);

	it.each( TOP_LEVEL_STALE_SEEDS )(
		'preserves remote top-level block operations after a stale block snapshot (seed %i)',
		( seed ) => {
			runRandomTopLevelStaleSnapshotScenario( seed );
		}
	);
} );
