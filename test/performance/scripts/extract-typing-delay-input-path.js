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
		runId: 'current_keyboard_1300',
		inputPath: 'Playwright keyboard.type key-hold burst',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-current-keyboard1300',
	},
	{
		runId: 'current_hold_press_1300_gap_0',
		inputPath: 'Playwright keyboard.press per key',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-current-hold1300-gap0',
	},
	{
		runId: 'current_type_one_char_1300',
		inputPath: 'Playwright keyboard.type one char per call',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-current-type-one-char1300',
	},
	{
		runId: 'current_down_up_1300',
		inputPath: 'Playwright keyboard.down/up per key',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-current-down-up1300',
	},
	{
		runId: 'cdp_page_evaluate_gap_0',
		inputPath: 'Raw CDP plus page.evaluate per key',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-cdp-page-evaluate-gap0',
	},
	{
		runId: 'cdp_runtime_evaluate_gap_0',
		inputPath: 'Raw CDP plus Runtime.evaluate per key',
		requestedPostKeyupGapMs: 0,
		dir: 'artifacts/typing-delay-cdp-runtime-evaluate-gap0',
	},
	...[ 0, 5, 10, 16, 33, 100, 310, 1000 ].map( ( gapMs ) => ( {
		runId: `cdp_gap_${ gapMs }`,
		inputPath: 'Raw CDP Input.dispatchKeyEvent',
		requestedPostKeyupGapMs: gapMs,
		dir: `artifacts/typing-delay-cdp-gap${ gapMs }`,
	} ) ),
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

function buildKeyGroups( browserEvents ) {
	const events = browserEvents
		.filter(
			( event ) =>
				event.documentName === 'editor-canvas' &&
				[
					'keydown',
					'keypress',
					'beforeinput',
					'input',
					'keyup',
				].includes( event.type )
		)
		.sort( ( left, right ) => left.nowMs - right.nowMs );

	const groups = [];
	let current = {
		keydowns: [],
		keypress: null,
		beforeinput: null,
		input: null,
		keyup: null,
	};

	for ( const event of events ) {
		if (
			event.type === 'keydown' &&
			( current.keypress || current.keyup )
		) {
			current = {
				keydowns: [],
				keypress: null,
				beforeinput: null,
				input: null,
				keyup: null,
			};
		}

		if ( event.type === 'keydown' ) {
			current.keydowns.push( event );
		} else if ( event.type === 'keypress' ) {
			current.keypress = event;
		} else if ( event.type === 'beforeinput' ) {
			current.beforeinput = event;
		} else if ( event.type === 'input' ) {
			current.input = event;
		} else if ( event.type === 'keyup' ) {
			current.keyup = event;
			if ( current.keydowns.length > 0 && current.keypress ) {
				groups.push( current );
				current = {
					keydowns: [],
					keypress: null,
					beforeinput: null,
					input: null,
					keyup: null,
				};
			}
		}
	}

	return groups;
}

function summarizeGapTraceEvents( summary ) {
	const byKey = new Map();
	for ( const event of summary.gapTraceEvents || [] ) {
		if ( ! byKey.has( event.keyIndex ) ) {
			byKey.set( event.keyIndex, [] );
		}
		byKey.get( event.keyIndex ).push( event );
	}
	return byKey;
}

function nonKeyGapTraceEvents( events ) {
	return events.filter(
		( event ) =>
			event.durationMs > 0.001 &&
			! (
				event.name === 'EventDispatch' &&
				[ 'keyup', 'keydown' ].includes( event.argsType )
			)
	);
}

function eventSignature( event ) {
	if ( ! event ) {
		return '';
	}
	return [
		`type=${ event.type }`,
		`trusted=${ event.isTrusted }`,
		`key=${ event.key }`,
		`code=${ event.code }`,
		`location=${ event.location }`,
		`keyCode=${ event.keyCode }`,
		`charCode=${ event.charCode }`,
		`which=${ event.which }`,
		`repeat=${ event.repeat }`,
		`composing=${ event.isComposing }`,
		`mods=${ event.altKey }/${ event.ctrlKey }/${ event.metaKey }/${ event.shiftKey }`,
		`cancelable=${ event.cancelable }`,
		`defaultPrevented=${ event.defaultPrevented }`,
	].join( '|' );
}

function rowsForRun( run ) {
	const jsonPath = newestJson( run.dir );
	if ( ! jsonPath ) {
		throw new Error(
			`Missing input-path diagnostic JSON for ${ run.runId }`
		);
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ jsonPath }` );
	const data = JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) );
	const summary = data.delayRunSummaries[ 0 ];
	const groups = buildKeyGroups( summary.browserEvents || [] );
	const gapTraceByKey = summarizeGapTraceEvents( summary );

	return data.records
		.filter( ( record ) => ! record.isThrowaway && record.sampleIndex > 0 )
		.map( ( record ) => {
			const previousGroup = groups[ record.sampleIndex - 1 ];
			const currentGroup = groups[ record.sampleIndex ];
			const keydown = currentGroup?.keydowns.at( -1 );
			const gapTraceEvents = nonKeyGapTraceEvents(
				gapTraceByKey.get( record.sampleIndex ) || []
			);

			return {
				run_id: run.runId,
				input_path: run.inputPath,
				delay_mode: data.metadata.delayMode,
				requested_post_keyup_gap_ms: run.requestedPostKeyupGapMs,
				actual_post_keyup_gap_ms:
					keydown?.nowMs - previousGroup?.keyup?.nowMs,
				sample_index: record.sampleIndex,
				json_path: path.relative( repoRoot, jsonPath ),
				latency_ms: record.latencyMs,
				keypress_ms: record.keypressMs,
				keydown_repeat: keydown?.repeat,
				keypress_repeat: currentGroup?.keypress?.repeat,
				keyup_repeat: currentGroup?.keyup?.repeat,
				keydown_is_composing: keydown?.isComposing,
				keypress_is_composing: currentGroup?.keypress?.isComposing,
				input_is_composing: currentGroup?.input?.isComposing,
				keydown_state: `${ keydown?.isPersistent }/${ keydown?.isTyping }`,
				keypress_state: `${ currentGroup?.keypress?.isPersistent }/${ currentGroup?.keypress?.isTyping }`,
				beforeinput_state: `${ currentGroup?.beforeinput?.isPersistent }/${ currentGroup?.beforeinput?.isTyping }`,
				input_state: `${ currentGroup?.input?.isPersistent }/${ currentGroup?.input?.isTyping }`,
				keydown_signature: eventSignature( keydown ),
				keypress_signature: eventSignature( currentGroup?.keypress ),
				beforeinput_signature: eventSignature(
					currentGroup?.beforeinput
				),
				input_signature: eventSignature( currentGroup?.input ),
				keyup_signature: eventSignature( currentGroup?.keyup ),
				non_key_gap_trace_event_count: gapTraceEvents.length,
				non_key_gap_trace_duration_ms: gapTraceEvents.reduce(
					( sum, event ) => sum + ( event.durationMs || 0 ),
					0
				),
				top_gap_trace_events: gapTraceEvents
					.slice()
					.sort(
						( left, right ) =>
							( right.durationMs || 0 ) - ( left.durationMs || 0 )
					)
					.slice( 0, 4 )
					.map( ( event ) =>
						event.argsType
							? `${ event.name }:${ event.argsType }`
							: event.name
					)
					.join( '; ' ),
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
		delay_mode: rows[ 0 ]?.delay_mode,
		requested_post_keyup_gap_ms: run.requestedPostKeyupGapMs,
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
		non_key_gap_trace_p50_count: quantile(
			rows.map( ( row ) => row.non_key_gap_trace_event_count ),
			0.5
		),
		non_key_gap_trace_p50_ms: quantile(
			rows.map( ( row ) => row.non_key_gap_trace_duration_ms ),
			0.5
		),
		keydown_repeat_count: rows.filter( ( row ) => row.keydown_repeat )
			.length,
		keypress_repeat_count: rows.filter( ( row ) => row.keypress_repeat )
			.length,
		any_composing_count: rows.filter(
			( row ) =>
				row.keydown_is_composing ||
				row.keypress_is_composing ||
				row.input_is_composing
		).length,
		distinct_key_states: Array.from(
			new Set(
				rows.map(
					( row ) =>
						`${ row.keydown_state }/${ row.keypress_state }/${ row.beforeinput_state }/${ row.input_state }`
				)
			)
		).join( '; ' ),
		distinct_event_signatures: Array.from(
			new Set(
				rows.map(
					( row ) =>
						`${ row.keydown_signature }/${ row.keypress_signature }/${ row.beforeinput_signature }/${ row.input_signature }/${ row.keyup_signature }`
				)
			)
		).join( '; ' ),
		json_path: rows[ 0 ]?.json_path,
	};
} );

writeCsv(
	path.join( reportDataDir, 'typing-delay-input-path-samples.csv' ),
	sampleRows,
	[
		'run_id',
		'input_path',
		'delay_mode',
		'requested_post_keyup_gap_ms',
		'actual_post_keyup_gap_ms',
		'sample_index',
		'json_path',
		'latency_ms',
		'keypress_ms',
		'keydown_repeat',
		'keypress_repeat',
		'keyup_repeat',
		'keydown_is_composing',
		'keypress_is_composing',
		'input_is_composing',
		'keydown_state',
		'keypress_state',
		'beforeinput_state',
		'input_state',
		'keydown_signature',
		'keypress_signature',
		'beforeinput_signature',
		'input_signature',
		'keyup_signature',
		'non_key_gap_trace_event_count',
		'non_key_gap_trace_duration_ms',
		'top_gap_trace_events',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-input-path-summary.csv' ),
	summaryRows,
	[
		'run_id',
		'input_path',
		'delay_mode',
		'requested_post_keyup_gap_ms',
		'n',
		'actual_post_keyup_gap_p10_ms',
		'actual_post_keyup_gap_p50_ms',
		'actual_post_keyup_gap_p90_ms',
		'keypress_p10_ms',
		'keypress_p50_ms',
		'keypress_p90_ms',
		'latency_p50_ms',
		'non_key_gap_trace_p50_count',
		'non_key_gap_trace_p50_ms',
		'keydown_repeat_count',
		'keypress_repeat_count',
		'any_composing_count',
		'distinct_key_states',
		'distinct_event_signatures',
		'json_path',
	]
);

// eslint-disable-next-line no-console
console.log(
	`Wrote input-path CSVs to ${ path.relative( repoRoot, reportDataDir ) }`
);
