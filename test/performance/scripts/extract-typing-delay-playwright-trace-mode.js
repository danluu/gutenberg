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
		runId: 'playwright_trace_keyboard_multichar_off',
		inputPath: 'multi-character keyboard.type',
		traceMode: 'off',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-keyboard-multichar-off',
	},
	{
		runId: 'playwright_trace_keyboard_press_on',
		inputPath: 'per-key keyboard.press',
		traceMode: 'on',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-keyboard-press-on',
	},
	{
		runId: 'playwright_trace_keyboard_press_off',
		inputPath: 'per-key keyboard.press',
		traceMode: 'off',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-keyboard-press-off',
	},
	{
		runId: 'playwright_trace_raw_cdp_off',
		inputPath: 'raw CDP',
		traceMode: 'off',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-raw-cdp-off',
	},
	{
		runId: 'playwright_trace_page_evaluate_on',
		inputPath: 'raw CDP + page.evaluate',
		traceMode: 'on',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-page-evaluate-on',
	},
	{
		runId: 'playwright_trace_page_evaluate_off',
		inputPath: 'raw CDP + page.evaluate',
		traceMode: 'off',
		dir: 'test/performance/artifacts/typing-delay-playwright-trace-page-evaluate-off',
	},
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
			`Missing Playwright trace-mode JSON for ${ run.runId }`
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
				input_path: run.inputPath,
				trace_mode: run.traceMode,
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
		input_path: run.inputPath,
		trace_mode: run.traceMode,
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
		'typing-delay-playwright-trace-mode-samples.csv'
	),
	sampleRows,
	[
		'run_id',
		'input_path',
		'trace_mode',
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
		'typing-delay-playwright-trace-mode-summary.csv'
	),
	summaryRows,
	[
		'run_id',
		'input_path',
		'trace_mode',
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
	`Wrote Playwright trace-mode CSVs to ${ path.relative(
		repoRoot,
		reportDataDir
	) }`
);
