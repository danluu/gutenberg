/**
 * External dependencies
 */
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' );

	return {
		...actual,
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
	};
} );

/**
 * Internal dependencies
 */
import { applyPostChangesToCRDTDoc, getPostChangesFromCRDTDoc } from '../crdt';
import { mergeCrdtBlocks } from '../crdt-blocks';

const DEFAULT_INPUTS = [
	'dGFibGUtcXVlcnktYXJyYXktcmVtb3RlLWNlbGwtZWRpdA==',
	'dGFibGUtcXVlcnktYXJyYXktYXBwZW5kLXJvdw==',
	'dGFibGUtcXVlcnktYXJyYXktcHJlcGVuZC1yb3c=',
	'dGFibGUtcXVlcnktYXJyYXktZGVsZXRlLXJvdw==',
];
const SYNCED_PROPERTIES = new Set( [ 'blocks' ] );
const TEXT_FRAGMENTS = [
	'A',
	'B',
	'C',
	'cell',
	'remote',
	'local',
	'&copy;',
	'<strong>x</strong>',
	'<em>y</em>',
	'',
];
const SCENARIOS = [
	'remote-cell-edit',
	'remote-append-row',
	'remote-prepend-row',
	'remote-delete-row',
];
const SEMANTIC_FEATURES = new Set();

jest.setTimeout( 120000 );

afterAll( () => {
	const featurePath = process.env.GUTENBERG_RTC_CG_FEATURE_FILE;

	if ( ! featurePath ) {
		return;
	}

	fs.writeFileSync(
		featurePath,
		`${ JSON.stringify( [ ...SEMANTIC_FEATURES ].sort(), null, 2 ) }\n`
	);
} );

function readInputCases() {
	const inputPath =
		process.env.GUTENBERG_RTC_CG_INPUT_FILE ||
		process.env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE;
	const inputValue =
		process.env.GUTENBERG_RTC_CG_INPUT_B64 ||
		process.env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_B64;
	let encodedInputs = DEFAULT_INPUTS;

	if ( inputPath ) {
		encodedInputs = JSON.parse( fs.readFileSync( inputPath, 'utf8' ) );
	} else if ( inputValue ) {
		encodedInputs = [ inputValue ];
	}

	return encodedInputs.map( ( encoded ) =>
		Array.from( Buffer.from( encoded, 'base64' ) )
	);
}

function addFeature( feature ) {
	SEMANTIC_FEATURES.add( feature );
}

function addBucketedFeature( prefix, value ) {
	const numericValue = Number.isFinite( value ) ? Math.max( 0, value ) : 0;
	const bounds = [ 0, 1, 2, 3, 4, 8, 16, 32, 64 ];
	const bound = bounds.find( ( candidate ) => numericValue <= candidate );

	addFeature(
		`${ prefix }:${ bound === undefined ? 'gt-64' : `le-${ bound }` }`
	);
}

function readByte( bytes, state ) {
	const value = bytes[ state.offset % bytes.length ] ?? 0;
	state.offset++;
	return value;
}

function pick( values, bytes, state ) {
	return values[ readByte( bytes, state ) % values.length ];
}

function makeText( bytes, state, rowIndex, cellIndex ) {
	const fragment = pick( TEXT_FRAGMENTS, bytes, state );
	const suffix =
		readByte( bytes, state ) % 3 === 0
			? `-${ readByte( bytes, state ) % 17 }`
			: '';

	return `r${ rowIndex }c${ cellIndex }-${ fragment }${ suffix }`;
}

function makeRows( bytes, state ) {
	const rowCount = 2 + ( readByte( bytes, state ) % 3 );
	const cellCount = 2 + ( readByte( bytes, state ) % 3 );
	const rows = [];

	for ( let rowIndex = 0; rowIndex < rowCount; rowIndex++ ) {
		const row = [];

		for ( let cellIndex = 0; cellIndex < cellCount; cellIndex++ ) {
			row.push( makeText( bytes, state, rowIndex, cellIndex ) );
		}

		rows.push( row );
	}

	return rows;
}

function cloneRows( rows ) {
	return rows.map( ( cells ) => [ ...cells ] );
}

function tableBlock( rows ) {
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

function makeCursorForLocalEdit( localMarker ) {
	return {
		attributeKey: 'body.0.cells.0.content',
		clientId: 'table-1',
		offset: localMarker.length,
	};
}

function syncDocs( from, to ) {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function textValue( value ) {
	if ( value && typeof value.text === 'string' ) {
		return value.text;
	}

	return String( value ?? '' );
}

function bodyFromBlock( block ) {
	const body = block?.attributes?.body;

	if ( ! Array.isArray( body ) ) {
		return [];
	}

	return body.map( ( row ) =>
		( row.cells || [] ).map( ( cell ) => textValue( cell.content ) )
	);
}

function getBodyFromYBlocks( yblocks ) {
	return bodyFromBlock( yblocks.toJSON()[ 0 ] );
}

function getBodyFromPostDoc( doc ) {
	const changes = getPostChangesFromCRDTDoc(
		doc,
		{ blocks: [] },
		SYNCED_PROPERTIES
	);

	return bodyFromBlock( changes.blocks?.[ 0 ] );
}

function rowsContain( rows, marker ) {
	return rows.some( ( row ) => row.includes( marker ) );
}

function assertCondition( condition, code, context ) {
	if ( condition ) {
		return;
	}

	throw new Error(
		[
			`RTC fuzz-only query-array identity postcondition failed: ${ code }`,
			`Context: ${ JSON.stringify( context ) }`,
		].join( '\n' )
	);
}

function assertBodyInvariants( body, context ) {
	assertCondition(
		Array.isArray( body ) && body.length > 0,
		'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:body-missing',
		context
	);

	for ( const [ rowIndex, row ] of body.entries() ) {
		assertCondition(
			Array.isArray( row ) && row.length > 0,
			'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:row-missing',
			{ ...context, rowIndex, row }
		);

		for ( const [ cellIndex, value ] of row.entries() ) {
			assertCondition(
				typeof value === 'string',
				'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:cell-not-string',
				{ ...context, rowIndex, cellIndex, value }
			);
			assertCondition(
				! value.includes( '[object Object]' ),
				'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:object-stringification',
				{ ...context, rowIndex, cellIndex, value }
			);
		}
	}
}

function assertScenarioResult( body, scenarioData, pathLabel ) {
	const { scenario, localMarker, remoteMarker, deletedMarker, initialRows } =
		scenarioData;
	const context = {
		pathLabel,
		scenario,
		localMarker,
		remoteMarker,
		deletedMarker,
		initialRows,
		body,
	};

	assertBodyInvariants( body, context );
	assertCondition(
		rowsContain( body, localMarker ),
		`RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:scenario-${ scenario }:oracle-local-marker`,
		context
	);

	if ( scenario === 'remote-delete-row' ) {
		assertCondition(
			! rowsContain( body, deletedMarker ),
			`RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:scenario-${ scenario }:oracle-deleted-row`,
			context
		);
	} else {
		assertCondition(
			rowsContain( body, remoteMarker ),
			`RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:scenario-${ scenario }:oracle-remote-marker`,
			context
		);
	}
}

function buildScenario( inputBytes, caseIndex ) {
	const state = { offset: caseIndex % Math.max( inputBytes.length, 1 ) };
	const initialRows = makeRows( inputBytes, state );
	const scenario =
		SCENARIOS[ readByte( inputBytes, state ) % SCENARIOS.length ];
	const localMarker = `local-${ caseIndex }-${ readByte(
		inputBytes,
		state
	) }`;
	const remoteMarker = `remote-${ caseIndex }-${ readByte(
		inputBytes,
		state
	) }`;
	const staleLocalRows = cloneRows( initialRows );
	const remoteRows = cloneRows( initialRows );
	const lastRow = remoteRows.length - 1;
	const lastCell = remoteRows[ lastRow ].length - 1;
	let deletedMarker = null;

	staleLocalRows[ 0 ][ 0 ] = localMarker;

	if ( scenario === 'remote-cell-edit' ) {
		remoteRows[ lastRow ][ lastCell ] = remoteMarker;
	} else if ( scenario === 'remote-append-row' ) {
		remoteRows.push(
			Array.from(
				{ length: remoteRows[ 0 ].length },
				( _value, cellIndex ) =>
					cellIndex === 0
						? remoteMarker
						: `remote-tail-${ cellIndex }`
			)
		);
	} else if ( scenario === 'remote-prepend-row' ) {
		remoteRows.unshift(
			Array.from(
				{ length: remoteRows[ 0 ].length },
				( _value, cellIndex ) =>
					cellIndex === 0
						? remoteMarker
						: `remote-head-${ cellIndex }`
			)
		);
	} else {
		deletedMarker = remoteRows[ lastRow ][ 0 ];
		remoteRows.pop();
	}

	addFeature( `scenario:${ scenario }` );
	addBucketedFeature( 'initial:rows', initialRows.length );
	addBucketedFeature( 'initial:cells-per-row', initialRows[ 0 ].length );
	addBucketedFeature(
		'initial:total-cells',
		initialRows.length * initialRows[ 0 ].length
	);
	addBucketedFeature( 'input:bytes', inputBytes.length );

	return {
		scenario,
		initialRows,
		remoteRows,
		staleLocalRows,
		localMarker,
		remoteMarker,
		deletedMarker,
	};
}

function checkDirectMergePath( scenarioData ) {
	addFeature( 'oracle:direct-mergeCrdtBlocks' );
	const docA = new Y.Doc();
	const docB = new Y.Doc();
	const yblocksA = docA.getArray( 'blocks' );
	const yblocksB = docB.getArray( 'blocks' );

	try {
		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( scenarioData.initialRows ) ],
			null
		);
		syncDocs( docA, docB );
		mergeCrdtBlocks(
			yblocksB,
			[ tableBlock( scenarioData.remoteRows ) ],
			null
		);
		syncDocs( docB, docA );
		mergeCrdtBlocks(
			yblocksA,
			[ tableBlock( scenarioData.staleLocalRows ) ],
			makeCursorForLocalEdit( scenarioData.localMarker )
		);

		assertScenarioResult(
			getBodyFromYBlocks( yblocksA ),
			scenarioData,
			'direct-mergeCrdtBlocks'
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

function applyBlocks( doc, rows ) {
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks: [ tableBlock( rows ) ] },
		SYNCED_PROPERTIES
	);
}

function checkPostChangesAdapterPath( scenarioData ) {
	addFeature( 'oracle:post-changes-adapter' );
	const docA = new Y.Doc();
	const docB = new Y.Doc();

	try {
		applyBlocks( docA, scenarioData.initialRows );
		syncDocs( docA, docB );
		applyBlocks( docB, scenarioData.remoteRows );
		syncDocs( docB, docA );
		applyBlocks( docA, scenarioData.staleLocalRows );

		assertScenarioResult(
			getBodyFromPostDoc( docA ),
			scenarioData,
			'post-changes-adapter'
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

function checkTableQueryArrayScenario( inputBytes, caseIndex ) {
	const scenarioData = buildScenario( inputBytes, caseIndex );

	checkDirectMergePath( scenarioData );
	checkPostChangesAdapterPath( scenarioData );
}

describe( 'RTC table query-array CRDT coverage-guided target', () => {
	it( 'preserves acknowledged remote table operations across stale local snapshots', () => {
		const inputCases = readInputCases();

		expect( inputCases.length ).toBeGreaterThan( 0 );

		inputCases.forEach( ( inputBytes, caseIndex ) => {
			expect( inputBytes.length ).toBeGreaterThan( 0 );
			checkTableQueryArrayScenario( inputBytes, caseIndex );
		} );
	} );
} );
