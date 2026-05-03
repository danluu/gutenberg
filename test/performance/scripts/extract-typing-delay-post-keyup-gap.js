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
		runId: 'post_keyup_keyboard_1300',
		caseLabel: 'Playwright key-hold burst',
		schedulerDir: 'artifacts/typing-delay-postkeyup-scheduler-keyboard1300',
		gapTraceDir: 'artifacts/typing-delay-postkeyup-gaptrace-keyboard1300',
		keyFlagDir: 'artifacts/typing-delay-key-flags-keyboard1300',
	},
	{
		runId: 'post_keyup_hold_1300_gap_0',
		caseLabel: 'Held 1300ms, natural keyup gap',
		schedulerDir:
			'artifacts/typing-delay-postkeyup-scheduler-hold1300-gap0',
		gapTraceDir: 'artifacts/typing-delay-postkeyup-gaptrace-hold1300-gap0',
		keyFlagDir: 'artifacts/typing-delay-key-flags-hold1300-gap0',
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

function summarizeGapScheduler( data ) {
	const summary = data.delayRunSummaries[ 0 ];
	const groups = buildKeyGroups( summary.browserEvents || [] );
	const schedulerEvents = summary.schedulerEvents || [];
	const dataEvents = summary.dataEvents || [];
	const browserEvents = summary.browserEvents || [];
	const rows = new Map();

	for ( const record of data.records ) {
		if ( record.isThrowaway || record.sampleIndex === 0 ) {
			continue;
		}

		const previousGroup = groups[ record.sampleIndex - 1 ];
		const currentGroup = groups[ record.sampleIndex ];
		const gapStart = previousGroup?.keyup?.nowMs;
		const gapStop = currentGroup?.keydowns.at( -1 )?.nowMs;
		if ( gapStart === undefined || gapStop === undefined ) {
			continue;
		}

		const gapSchedulerEvents = schedulerEvents.filter(
			( event ) =>
				event.firedAtMs >= gapStart && event.firedAtMs <= gapStop
		);
		const gapDataEvents = dataEvents.filter(
			( event ) => event.nowMs >= gapStart && event.nowMs <= gapStop
		);
		const gapBrowserEvents = browserEvents.filter(
			( event ) => event.nowMs >= gapStart && event.nowMs <= gapStop
		);

		rows.set( record.sampleIndex, {
			sample_index: record.sampleIndex,
			latency_ms: record.latencyMs,
			keypress_ms: record.keypressMs,
			previous_keyup_to_current_keydown_ms: gapStop - gapStart,
			scheduler_event_count: gapSchedulerEvents.length,
			scheduler_callback_ms: gapSchedulerEvents.reduce(
				( sum, event ) =>
					sum +
					Math.max(
						0,
						( event.finishedAtMs ?? event.firedAtMs ) -
							( event.firedAtMs ?? event.scheduledAtMs )
					),
				0
			),
			raf_count: gapSchedulerEvents.filter(
				( event ) => event.type === 'requestAnimationFrame'
			).length,
			timer_count: gapSchedulerEvents.filter(
				( event ) => event.type === 'setTimeout'
			).length,
			idle_count: gapSchedulerEvents.filter(
				( event ) => event.type === 'requestIdleCallback'
			).length,
			data_event_count: gapDataEvents.length,
			data_event_duration_ms: gapDataEvents.reduce(
				( sum, event ) => sum + ( event.durationMs || 0 ),
				0
			),
			selectionchange_count: gapBrowserEvents.filter(
				( event ) => event.type === 'selectionchange'
			).length,
		} );
	}

	return rows;
}

function summarizeGapTrace( data ) {
	const summary = data.delayRunSummaries[ 0 ];
	const rows = new Map();
	const byKey = new Map();

	for ( const event of summary.gapTraceEvents || [] ) {
		if ( ! byKey.has( event.keyIndex ) ) {
			byKey.set( event.keyIndex, [] );
		}
		byKey.get( event.keyIndex ).push( event );
	}

	for ( const record of data.records ) {
		if ( record.isThrowaway || record.sampleIndex === 0 ) {
			continue;
		}

		const events = byKey.get( record.sampleIndex ) || [];
		const nonKeyEvents = events.filter(
			( event ) =>
				event.durationMs > 0.001 &&
				! (
					event.name === 'EventDispatch' &&
					[ 'keyup', 'keydown' ].includes( event.argsType )
				)
		);
		const byName = new Map();
		for ( const event of nonKeyEvents ) {
			const key = event.argsType
				? `${ event.name }:${ event.argsType }`
				: event.name;
			const current = byName.get( key ) || { count: 0, duration: 0 };
			current.count++;
			current.duration += event.durationMs || 0;
			byName.set( key, current );
		}

		rows.set( record.sampleIndex, {
			sample_index: record.sampleIndex,
			raw_gap_trace_event_count: events.length,
			non_key_gap_trace_event_count: nonKeyEvents.length,
			non_key_gap_trace_duration_ms: nonKeyEvents.reduce(
				( sum, event ) => sum + ( event.durationMs || 0 ),
				0
			),
			top_gap_trace_events: Array.from( byName.entries() )
				.sort(
					( left, right ) => right[ 1 ].duration - left[ 1 ].duration
				)
				.slice( 0, 4 )
				.map(
					( [ name, value ] ) =>
						`${ name } n=${
							value.count
						} ms=${ value.duration.toFixed( 2 ) }`
				)
				.join( '; ' ),
		} );
	}

	return rows;
}

function summarizeKeyFlags( data ) {
	const summary = data.delayRunSummaries[ 0 ];
	const groups = buildKeyGroups( summary.browserEvents || [] );
	const rows = new Map();

	for ( const record of data.records ) {
		if ( record.isThrowaway || record.sampleIndex === 0 ) {
			continue;
		}

		const group = groups[ record.sampleIndex ];
		const keydown = group?.keydowns.at( -1 );
		rows.set( record.sampleIndex, {
			sample_index: record.sampleIndex,
			keydown_repeat: keydown?.repeat,
			keypress_repeat: group?.keypress?.repeat,
			keyup_repeat: group?.keyup?.repeat,
			keydown_is_composing: keydown?.isComposing,
			keypress_is_composing: group?.keypress?.isComposing,
			input_is_composing: group?.input?.isComposing,
			keydown_state: `${ keydown?.isPersistent }/${ keydown?.isTyping }`,
			keypress_state: `${ group?.keypress?.isPersistent }/${ group?.keypress?.isTyping }`,
			beforeinput_state: `${ group?.beforeinput?.isPersistent }/${ group?.beforeinput?.isTyping }`,
			input_state: `${ group?.input?.isPersistent }/${ group?.input?.isTyping }`,
		} );
	}

	return rows;
}

function readRunRows( run ) {
	const schedulerPath = newestJson( run.schedulerDir );
	const gapTracePath = newestJson( run.gapTraceDir );
	const keyFlagPath = newestJson( run.keyFlagDir );
	if ( ! schedulerPath || ! gapTracePath || ! keyFlagPath ) {
		throw new Error(
			`Missing post-keyup diagnostic JSON for ${ run.runId }`
		);
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ schedulerPath }` );
	const schedulerRows = summarizeGapScheduler(
		JSON.parse( fs.readFileSync( schedulerPath, 'utf8' ) )
	);
	// eslint-disable-next-line no-console
	console.log( `Reading ${ gapTracePath }` );
	const gapTraceRows = summarizeGapTrace(
		JSON.parse( fs.readFileSync( gapTracePath, 'utf8' ) )
	);
	// eslint-disable-next-line no-console
	console.log( `Reading ${ keyFlagPath }` );
	const keyFlagRows = summarizeKeyFlags(
		JSON.parse( fs.readFileSync( keyFlagPath, 'utf8' ) )
	);

	const sampleIndexes = new Set( [
		...schedulerRows.keys(),
		...gapTraceRows.keys(),
		...keyFlagRows.keys(),
	] );

	return Array.from( sampleIndexes )
		.sort( ( left, right ) => left - right )
		.map( ( sampleIndex ) => ( {
			run_id: run.runId,
			case_label: run.caseLabel,
			sample_index: sampleIndex,
			scheduler_json_path: path.relative( repoRoot, schedulerPath ),
			gap_trace_json_path: path.relative( repoRoot, gapTracePath ),
			key_flag_json_path: path.relative( repoRoot, keyFlagPath ),
			...schedulerRows.get( sampleIndex ),
			...gapTraceRows.get( sampleIndex ),
			...keyFlagRows.get( sampleIndex ),
		} ) );
}

fs.mkdirSync( reportDataDir, { recursive: true } );

const sampleRows = runs.flatMap( readRunRows );
const summaryRows = runs.map( ( run ) => {
	const rows = sampleRows.filter( ( row ) => row.run_id === run.runId );
	return {
		run_id: run.runId,
		case_label: run.caseLabel,
		n: rows.length,
		latency_median_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
			0.5
		),
		keypress_median_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.5
		),
		previous_keyup_to_current_keydown_median_ms: quantile(
			rows.map( ( row ) => row.previous_keyup_to_current_keydown_ms ),
			0.5
		),
		scheduler_event_median_count: quantile(
			rows.map( ( row ) => row.scheduler_event_count ),
			0.5
		),
		scheduler_callback_median_ms: quantile(
			rows.map( ( row ) => row.scheduler_callback_ms ),
			0.5
		),
		raf_median_count: quantile(
			rows.map( ( row ) => row.raf_count ),
			0.5
		),
		timer_median_count: quantile(
			rows.map( ( row ) => row.timer_count ),
			0.5
		),
		data_event_median_count: quantile(
			rows.map( ( row ) => row.data_event_count ),
			0.5
		),
		data_event_median_ms: quantile(
			rows.map( ( row ) => row.data_event_duration_ms ),
			0.5
		),
		selectionchange_median_count: quantile(
			rows.map( ( row ) => row.selectionchange_count ),
			0.5
		),
		non_key_gap_trace_median_count: quantile(
			rows.map( ( row ) => row.non_key_gap_trace_event_count ),
			0.5
		),
		non_key_gap_trace_median_ms: quantile(
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
	};
} );

writeCsv(
	path.join( reportDataDir, 'typing-delay-post-keyup-gap-samples.csv' ),
	sampleRows,
	[
		'run_id',
		'case_label',
		'sample_index',
		'scheduler_json_path',
		'gap_trace_json_path',
		'key_flag_json_path',
		'latency_ms',
		'keypress_ms',
		'previous_keyup_to_current_keydown_ms',
		'scheduler_event_count',
		'scheduler_callback_ms',
		'raf_count',
		'timer_count',
		'idle_count',
		'data_event_count',
		'data_event_duration_ms',
		'selectionchange_count',
		'raw_gap_trace_event_count',
		'non_key_gap_trace_event_count',
		'non_key_gap_trace_duration_ms',
		'top_gap_trace_events',
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
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-post-keyup-gap-summary.csv' ),
	summaryRows,
	[
		'run_id',
		'case_label',
		'n',
		'latency_median_ms',
		'keypress_median_ms',
		'previous_keyup_to_current_keydown_median_ms',
		'scheduler_event_median_count',
		'scheduler_callback_median_ms',
		'raf_median_count',
		'timer_median_count',
		'data_event_median_count',
		'data_event_median_ms',
		'selectionchange_median_count',
		'non_key_gap_trace_median_count',
		'non_key_gap_trace_median_ms',
		'keydown_repeat_count',
		'keypress_repeat_count',
		'any_composing_count',
		'distinct_key_states',
	]
);

// eslint-disable-next-line no-console
console.log(
	`Wrote post-keyup gap CSVs to ${ path.relative( repoRoot, reportDataDir ) }`
);
