#!/usr/bin/env node

/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );

const repoRoot = path.resolve( __dirname, '../../..' );
const reportDataDir = path.join(
	repoRoot,
	'test/performance/reports/typing-delay-benchmark/data'
);

const runs = [
	{
		runId: 'native_runtime_repeat_raw_cdp',
		repeatMode: 'raw CDP only',
		repeatCount: 0,
		dir: 'test/performance/artifacts/typing-delay-native-runtime-repeat-cdp-key-hold',
	},
	...[
		{
			delayMode: 'cdp-key-hold-runtime-evaluate-repeat',
			repeatMode: 'Runtime.evaluate',
		},
		{
			delayMode: 'cdp-key-hold-runtime-call-function-on-repeat',
			repeatMode: 'Runtime.callFunctionOn',
		},
	].flatMap( ( mode ) =>
		[ 1, 3, 7, 11, 17 ].map( ( repeatCount ) => ( {
			runId: `native_runtime_repeat_${ mode.delayMode }_${ repeatCount }`,
			repeatMode: mode.repeatMode,
			repeatCount,
			dir: `test/performance/artifacts/typing-delay-native-runtime-repeat-${ mode.delayMode }-${ repeatCount }`,
		} ) )
	),
];

function newestJson( dir ) {
	const absDir = path.join( repoRoot, dir );
	if ( ! fs.existsSync( absDir ) ) {
		return null;
	}

	return fs
		.readdirSync( absDir )
		.filter( ( file ) => /^typing-delay-benchmark-\d+\.json$/.test( file ) )
		.map( ( file ) => path.join( absDir, file ) )
		.sort(
			( left, right ) =>
				fs.statSync( right ).mtimeMs - fs.statSync( left ).mtimeMs
		)[ 0 ];
}

function csvEscape( value ) {
	if ( value === undefined || value === null || Number.isNaN( value ) ) {
		return '';
	}

	const text = String( value );
	if ( /[",\n\r]/.test( text ) ) {
		return `"${ text.replace( /"/g, '""' ) }"`;
	}
	return text;
}

function writeCsv( file, rows, columns ) {
	const csv = [
		columns.join( ',' ),
		...rows.map( ( row ) =>
			columns.map( ( column ) => csvEscape( row[ column ] ) ).join( ',' )
		),
	].join( '\n' );
	fs.writeFileSync( file, `${ csv }\n` );
}

function quantile( values, p ) {
	const sorted = values
		.filter( ( value ) => Number.isFinite( value ) )
		.sort( ( left, right ) => left - right );
	if ( sorted.length === 0 ) {
		return null;
	}

	const index = ( sorted.length - 1 ) * p;
	const lower = Math.floor( index );
	const upper = Math.ceil( index );
	if ( lower === upper ) {
		return sorted[ lower ];
	}
	return (
		sorted[ lower ] +
		( sorted[ upper ] - sorted[ lower ] ) * ( index - lower )
	);
}

function rowsForRun( run ) {
	const jsonPath = newestJson( run.dir );
	if ( ! jsonPath ) {
		throw new Error(
			`Missing native-runtime-repeat JSON for ${ run.runId }`
		);
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ jsonPath }` );
	const data = JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) );
	const summary = data.delayRunSummaries[ 0 ];
	const gapEventsByKeyIndex = new Map(
		( summary.gapTraceEvents || [] ).map( ( event ) => [
			event.keyIndex,
			event,
		] )
	);

	return data.records
		.filter( ( record ) => ! record.isThrowaway && record.sampleIndex > 0 )
		.map( ( record ) => {
			const gapEvent = gapEventsByKeyIndex.get( record.sampleIndex );

			return {
				run_id: run.runId,
				scenario: data.metadata.scenario,
				repeat_mode: run.repeatMode,
				repeat_count: run.repeatCount,
				delay_mode: data.metadata.delayMode,
				sample_index: record.sampleIndex,
				json_path: path.relative( repoRoot, jsonPath ),
				actual_post_keyup_gap_ms: gapEvent?.gapDurationMs,
				latency_ms: record.latencyMs,
				keydown_ms: record.keydownMs,
				keypress_ms: record.keypressMs,
				keyup_ms: record.keyupMs,
			};
		} );
}

fs.mkdirSync( reportDataDir, { recursive: true } );

const sampleRows = runs.flatMap( rowsForRun );
const summaryRows = runs.map( ( run ) => {
	const rows = sampleRows.filter( ( row ) => row.run_id === run.runId );
	return {
		run_id: run.runId,
		scenario: rows[ 0 ]?.scenario,
		repeat_mode: run.repeatMode,
		repeat_count: run.repeatCount,
		delay_mode: rows[ 0 ]?.delay_mode,
		n: rows.length,
		actual_post_keyup_gap_p10_ms: quantile(
			rows.map( ( row ) => row.actual_post_keyup_gap_ms ),
			0.1
		),
		actual_post_keyup_gap_p50_ms: quantile(
			rows.map( ( row ) => row.actual_post_keyup_gap_ms ),
			0.5
		),
		actual_post_keyup_gap_p90_ms: quantile(
			rows.map( ( row ) => row.actual_post_keyup_gap_ms ),
			0.9
		),
		keypress_p10_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.1
		),
		keypress_p50_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.5
		),
		keypress_p90_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.9
		),
		latency_p50_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
			0.5
		),
		json_path: rows[ 0 ]?.json_path,
	};
} );

writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-native-runtime-repeat-samples.csv'
	),
	sampleRows,
	[
		'run_id',
		'scenario',
		'repeat_mode',
		'repeat_count',
		'delay_mode',
		'sample_index',
		'json_path',
		'actual_post_keyup_gap_ms',
		'latency_ms',
		'keydown_ms',
		'keypress_ms',
		'keyup_ms',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-native-runtime-repeat-summary.csv'
	),
	summaryRows,
	[
		'run_id',
		'scenario',
		'repeat_mode',
		'repeat_count',
		'delay_mode',
		'n',
		'actual_post_keyup_gap_p10_ms',
		'actual_post_keyup_gap_p50_ms',
		'actual_post_keyup_gap_p90_ms',
		'keypress_p10_ms',
		'keypress_p50_ms',
		'keypress_p90_ms',
		'latency_p50_ms',
		'json_path',
	]
);

// eslint-disable-next-line no-console
console.log(
	`Wrote native runtime-repeat CSVs to ${ path.relative(
		repoRoot,
		reportDataDir
	) }`
);
