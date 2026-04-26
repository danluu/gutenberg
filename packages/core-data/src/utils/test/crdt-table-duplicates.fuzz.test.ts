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

const SEEDS = seededRangeFromEnv( 16, 9101 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_TABLE_DUPLICATE_STEPS', 32, {
	min: 1,
} );

type LogicalCell = {
	content: string;
	id: string;
};

type LogicalRow = {
	cells: LogicalCell[];
	id: string;
};

type Peer = {
	doc: Y.Doc;
	name: string;
	rows: LogicalRow[];
	yblocks: Y.Array< YBlock >;
};

function cloneRows( rows: LogicalRow[] ): LogicalRow[] {
	return JSON.parse( JSON.stringify( rows ) ) as LogicalRow[];
}

function rowsToBlocks( rows: LogicalRow[] ): Block[] {
	return [
		{
			name: 'core/table',
			clientId: 'table',
			attributes: {
				body: rows.map( ( row ) => ( {
					cells: row.cells.map( ( cell ) => ( {
						content: cell.content,
						tag: 'td',
					} ) ),
				} ) ),
			},
			innerBlocks: [],
		},
	];
}

function getBody( peer: Peer ): { cells: { content: string }[] }[] {
	const block = peer.yblocks.get( 0 );
	const attrs = block.get( 'attributes' ) as Y.Map< unknown >;
	return ( attrs.get( 'body' ) as Y.Array< unknown > ).toJSON() as {
		cells: { content: string }[];
	}[];
}

function bodySignature( peer: Peer ): string[] {
	return getBody( peer ).map( ( row ) =>
		row.cells.map( ( cell ) => cell.content ).join( '|' )
	);
}

function syncBothWays( a: Peer, b: Peer ): void {
	Y.applyUpdateV2( b.doc, Y.encodeStateAsUpdateV2( a.doc ), 'sync-a-to-b' );
	Y.applyUpdateV2( a.doc, Y.encodeStateAsUpdateV2( b.doc ), 'sync-b-to-a' );
}

function createPeer( name: string, rows: LogicalRow[] ): Peer {
	const doc = new Y.Doc();
	const yblocks = doc.getArray< YBlock >( 'blocks' );
	const peer = {
		doc,
		name,
		rows: cloneRows( rows ),
		yblocks,
	};

	mergeCrdtBlocks( yblocks, rowsToBlocks( peer.rows ), null );
	return peer;
}

function chooseDuplicateRowPair(
	rows: LogicalRow[],
	rng: ReturnType< typeof createSeededRandom >
): [ number, number ] | null {
	const signatures = rows.map( ( row ) =>
		row.cells.map( ( cell ) => cell.content ).join( '|' )
	);
	const pairs: [ number, number ][] = [];

	for ( let i = 0; i < signatures.length; i++ ) {
		for ( let j = i + 1; j < signatures.length; j++ ) {
			if ( signatures[ i ] === signatures[ j ] ) {
				pairs.push( [ i, j ] );
			}
		}
	}

	return pairs.length > 0 ? rng.pick( pairs ) : null;
}

function insertDuplicateRows(
	peer: Peer,
	seed: number,
	step: number,
	rng: ReturnType< typeof createSeededRandom >
): string {
	const content = `duplicate-${ seed }-${ rng.intBetween( 0, 4 ) }`;
	const rowA: LogicalRow = {
		cells: [ { content, id: `row-${ step }-a-cell` } ],
		id: `row-${ step }-a`,
	};
	const rowB: LogicalRow = {
		cells: [ { content, id: `row-${ step }-b-cell` } ],
		id: `row-${ step }-b`,
	};
	const index = rng.intBetween( 0, peer.rows.length );
	peer.rows.splice( index, 0, rowA, rowB );
	mergeCrdtBlocks( peer.yblocks, rowsToBlocks( peer.rows ), null );
	return `${ peer.name } inserted duplicate rows ${ rowA.id }/${ rowB.id } at ${ index }`;
}

function editLaterDuplicateRowAndDeleteEarlierDuplicateRow(
	editor: Peer,
	deleter: Peer,
	seed: number,
	step: number,
	rng: ReturnType< typeof createSeededRandom >
): { editedContent?: string; trace: string } {
	const pair = chooseDuplicateRowPair( editor.rows, rng );

	if ( ! pair ) {
		return { trace: insertDuplicateRows( editor, seed, step, rng ) };
	}

	const [ earlierIndex, laterIndex ] = pair;
	const targetId = editor.rows[ laterIndex ].id;
	const deletedId = deleter.rows[ earlierIndex ].id;
	const editedContent = `edited-${ targetId }-${ seed }-${ step }`;

	editor.rows[ laterIndex ].cells[ 0 ].content = editedContent;
	deleter.rows.splice( earlierIndex, 1 );

	mergeCrdtBlocks( editor.yblocks, rowsToBlocks( editor.rows ), null );
	mergeCrdtBlocks( deleter.yblocks, rowsToBlocks( deleter.rows ), null );

	return {
		editedContent,
		trace: `${ editor.name } edited later duplicate ${ targetId }, ${ deleter.name } deleted earlier duplicate ${ deletedId }`,
	};
}

function createInitialRows(
	firstDuplicateContent = 'same',
	secondDuplicateContent = 'same'
): LogicalRow[] {
	return [
		{
			cells: [ { content: 'anchor', id: 'anchor-cell' } ],
			id: 'anchor',
		},
		{
			cells: [
				{
					content: firstDuplicateContent,
					id: 'first-duplicate-cell',
				},
			],
			id: 'first-duplicate',
		},
		{
			cells: [
				{
					content: secondDuplicateContent,
					id: 'second-duplicate-cell',
				},
			],
			id: 'second-duplicate',
		},
	];
}

function runEditDeleteRepro( {
	deleteIndex,
	editIndex,
	editedContent,
	initialRows,
}: {
	deleteIndex: number;
	editIndex: number;
	editedContent: string;
	initialRows: LogicalRow[];
} ): string[] {
	const a = createPeer( 'a', initialRows );
	const b = createPeer( 'b', initialRows );

	try {
		syncBothWays( a, b );
		a.rows[ editIndex ].cells[ 0 ].content = editedContent;
		b.rows.splice( deleteIndex, 1 );
		mergeCrdtBlocks( a.yblocks, rowsToBlocks( a.rows ), null );
		mergeCrdtBlocks( b.yblocks, rowsToBlocks( b.rows ), null );
		syncBothWays( a, b );
		expect( bodySignature( a ) ).toEqual( bodySignature( b ) );
		return bodySignature( a );
	} finally {
		a.doc.destroy();
		b.doc.destroy();
	}
}

function runDuplicateEditDeleteRepro(): string[] {
	return runEditDeleteRepro( {
		deleteIndex: 1,
		editedContent: 'edited-second-duplicate',
		editIndex: 2,
		initialRows: createInitialRows(),
	} );
}

function runScenario( seed: number ): void {
	const rng = createSeededRandom( seed );
	const trace: string[] = [];
	const initialRows = createInitialRows();
	const a = createPeer( 'a', initialRows );
	const b = createPeer( 'b', initialRows );

	try {
		syncBothWays( a, b );

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			if ( rng.bool( 0.3 ) ) {
				const peer = rng.pick( [ a, b ] as const );
				trace.push( insertDuplicateRows( peer, seed, step, rng ) );
				const other = peer === a ? b : a;
				other.rows = cloneRows( peer.rows );
				Y.applyUpdateV2(
					other.doc,
					Y.encodeStateAsUpdateV2( peer.doc ),
					`sync-insert-${ step }`
				);
				continue;
			}

			const editor = rng.pick( [ a, b ] as const );
			const deleter = editor === a ? b : a;
			const result = editLaterDuplicateRowAndDeleteEarlierDuplicateRow(
				editor,
				deleter,
				seed,
				step,
				rng
			);
			trace.push( result.trace );
			syncBothWays( a, b );

			const actualA = bodySignature( a );
			const actualB = bodySignature( b );

			expect( actualA ).toEqual( actualB );
			if ( result.editedContent ) {
				expect( actualA ).toContain( result.editedContent );
			}
		}
	} catch ( error ) {
		throw new Error(
			`CRDT table duplicate fuzz failed for seed ${ seed }\n${ trace.join(
				'\n'
			) }\nA: ${ JSON.stringify(
				bodySignature( a )
			) }\nB: ${ JSON.stringify( bodySignature( b ) ) }\n${
				error instanceof Error ? error.message : String( error )
			}`
		);
	} finally {
		a.doc.destroy();
		b.doc.destroy();
	}
}

describe( 'CRDT table duplicate row fuzzing', () => {
	it( 'control: preserves concurrent edits when row contents are distinct', () => {
		expect(
			runEditDeleteRepro( {
				deleteIndex: 1,
				editedContent: 'edited-second-distinct',
				editIndex: 2,
				initialRows: createInitialRows( 'first', 'second' ),
			} )
		).toContain( 'edited-second-distinct' );
	} );

	it( 'control: preserves the earlier duplicate edit when deleting the later duplicate', () => {
		expect(
			runEditDeleteRepro( {
				deleteIndex: 2,
				editedContent: 'edited-first-duplicate',
				editIndex: 1,
				initialRows: createInitialRows(),
			} )
		).toContain( 'edited-first-duplicate' );
	} );

	it( 'reproduces a lost concurrent edit when deleting an earlier duplicate row', () => {
		expect( runDuplicateEditDeleteRepro() ).toContain(
			'edited-second-duplicate'
		);
	} );

	it.each( SEEDS )(
		'preserves concurrent edits to the intended duplicate row (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);
} );
