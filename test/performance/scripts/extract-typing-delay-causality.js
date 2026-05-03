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
		runId: 'causality_keyboard_1300',
		caseLabel: 'Playwright key-hold burst',
		timelineDir: 'artifacts/typing-delay-causality-timeline-keyboard1300',
		spanDir: 'artifacts/typing-delay-causality-keyboard1300',
	},
	{
		runId: 'causality_between_1300',
		caseLabel: 'Complete keypress, then wait',
		timelineDir: 'artifacts/typing-delay-causality-timeline-between1300',
		spanDir: 'artifacts/typing-delay-causality-between1300',
	},
	{
		runId: 'causality_hold_1300_gap_0',
		caseLabel: 'Held 1300ms, natural keyup gap',
		timelineDir: 'artifacts/typing-delay-causality-timeline-hold1300-gap0',
		spanDir: 'artifacts/typing-delay-causality-hold1300-gap0',
	},
	{
		runId: 'causality_hold_990_gap_310',
		caseLabel: 'Held 990ms, 310ms keyup gap',
		timelineDir: 'artifacts/typing-delay-causality-timeline-hold990-gap310',
		spanDir: 'artifacts/typing-delay-causality-hold990-gap310',
	},
	{
		runId: 'causality_hold_1300_gap_1000',
		caseLabel: 'Held 1300ms, 1000ms keyup gap',
		timelineDir:
			'artifacts/typing-delay-causality-timeline-hold1300-gap1000',
		spanDir: 'artifacts/typing-delay-causality-hold1300-gap1000',
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

function extractTimelineRows( run ) {
	const jsonPath = newestJson( run.timelineDir );
	if ( ! jsonPath ) {
		throw new Error( `Missing timeline JSON in ${ run.timelineDir }` );
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ jsonPath }` );
	const data = JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) );
	const summary = data.delayRunSummaries[ 0 ];
	const keyGroups = buildKeyGroups( summary.browserEvents || [] );
	const persistentMarks = ( summary.dataEvents || [] )
		.filter(
			( event ) =>
				event.storeName === 'core/block-editor' &&
				event.actionName === '__unstableMarkLastChangeAsPersistent'
		)
		.sort( ( left, right ) => left.nowMs - right.nowMs );

	return data.records
		.filter( ( record ) => ! record.isThrowaway && record.sampleIndex > 0 )
		.map( ( record ) => {
			const currentGroup = keyGroups[ record.sampleIndex ];
			const previousGroup = keyGroups[ record.sampleIndex - 1 ];
			const previousInput = previousGroup?.input;
			const previousKeyup = previousGroup?.keyup;
			const currentKeydown = currentGroup?.keydowns.at( -1 );
			const mark = persistentMarks
				.filter(
					( event ) =>
						previousInput &&
						currentKeydown &&
						event.nowMs > previousInput.nowMs &&
						event.nowMs < currentKeydown.nowMs
				)
				.at( -1 );

			return {
				run_id: run.runId,
				case_label: run.caseLabel,
				json_path: path.relative( repoRoot, jsonPath ),
				delay_mode: data.metadata.delayMode,
				delay_ms: record.delayMs,
				post_keyup_gap_ms: data.metadata.postKeyupGapMs,
				sample_index: record.sampleIndex,
				latency_ms: record.latencyMs,
				keydown_ms: record.keydownMs,
				keypress_ms: record.keypressMs,
				keyup_ms: record.keyupMs,
				previous_input_to_previous_keyup_ms:
					previousInput && previousKeyup
						? previousKeyup.nowMs - previousInput.nowMs
						: null,
				previous_keyup_to_mark_ms:
					mark && previousKeyup
						? mark.nowMs - previousKeyup.nowMs
						: null,
				mark_to_current_keydown_ms:
					mark && currentKeydown
						? currentKeydown.nowMs - mark.nowMs
						: null,
				previous_keyup_to_current_keydown_ms:
					previousKeyup && currentKeydown
						? currentKeydown.nowMs - previousKeyup.nowMs
						: null,
				mark_during_previous_key_hold:
					mark && previousKeyup
						? mark.nowMs < previousKeyup.nowMs
						: null,
				mark_action_duration_ms: mark?.durationMs,
				current_keydown_is_persistent: currentKeydown?.isPersistent,
				current_keydown_is_typing: currentKeydown?.isTyping,
			};
		} );
}

function extractSpanRows( run ) {
	const jsonPath = newestJson( run.spanDir );
	if ( ! jsonPath ) {
		throw new Error( `Missing span JSON in ${ run.spanDir }` );
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ jsonPath }` );
	const data = JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) );
	const summary = data.delayRunSummaries[ 0 ];
	const richSpans = summary.richTextSpanEvents || [];
	const dataSpans = summary.dataSpanEvents || [];
	const richBatches = richSpans
		.filter(
			( event ) => event.name === 'rich-text.handleChange.registryBatch'
		)
		.sort( ( left, right ) => left.startedAtMs - right.startedAtMs )
		.map( ( event, index ) => ( {
			inputIndex: index,
			start: event.startedAtMs,
			end: event.startedAtMs + event.durationMs,
		} ) );
	const dataBatchRoots = dataSpans
		.filter( ( event ) => event.name === 'data.registry.batch.total' )
		.map( ( event ) => ( {
			start: event.startedAtMs,
			end: event.startedAtMs + event.durationMs,
		} ) );
	const matchedBatches = [];

	for ( const richBatch of richBatches ) {
		const dataBatch = dataBatchRoots
			.filter(
				( batch ) =>
					batch.start >= richBatch.start - 0.05 &&
					batch.start <= richBatch.end + 0.05
			)
			.map( ( batch ) => ( {
				...batch,
				delta: Math.abs( batch.start - richBatch.start ),
			} ) )
			.sort( ( left, right ) => left.delta - right.delta )[ 0 ];
		if ( dataBatch ) {
			matchedBatches.push( {
				inputIndex: richBatch.inputIndex,
				start: dataBatch.start,
				end: dataBatch.end,
			} );
		}
	}

	const rows = [];
	const richNames = [
		'rich-text.onInput.total',
		'rich-text.handleChange.registryBatch',
		'rich-text.handleChange.onSelectionChange',
		'rich-text.handleChange.onChange',
	];
	for ( const name of richNames ) {
		richSpans
			.filter( ( event ) => event.name === name )
			.sort( ( left, right ) => left.startedAtMs - right.startedAtMs )
			.forEach( ( event, inputIndex ) => {
				if ( inputIndex === 0 ) {
					return;
				}
				rows.push( {
					run_id: run.runId,
					case_label: run.caseLabel,
					json_path: path.relative( repoRoot, jsonPath ),
					delay_mode: data.metadata.delayMode,
					delay_ms: summary.delayMs,
					post_keyup_gap_ms: data.metadata.postKeyupGapMs,
					input_index: inputIndex,
					component: name,
					duration_ms: event.durationMs,
				} );
			} );
	}

	function componentForDataSpan( event ) {
		const metadata = event.metadata || {};
		if ( event.name === 'data.registry.batch.total' ) {
			return 'data.registry.batch.total';
		}
		if ( event.name === 'data.registry.batch.callback' ) {
			return 'data.registry.batch.callback';
		}
		if (
			event.name === 'data.registry.batch.resumeStore' &&
			metadata.storeName === 'core/block-editor'
		) {
			return 'data.registry.batch.resumeStore core/block-editor';
		}
		if (
			event.name === 'data.emitter.listener' &&
			metadata.emitterKind === 'store' &&
			metadata.storeName === 'core/block-editor' &&
			metadata.listenerType === 'store subscriber'
		) {
			return 'data.emitter.listener core/block-editor subscribers';
		}
		if ( event.name === 'data.useSelect.onChange' ) {
			return 'data.useSelect.onChange';
		}
		if ( event.name === 'data.useSelect.mapSelect' ) {
			return 'data.useSelect.mapSelect';
		}
		return null;
	}

	for ( const batch of matchedBatches ) {
		if ( batch.inputIndex === 0 ) {
			continue;
		}
		const byComponent = new Map();
		for ( const event of dataSpans ) {
			if (
				event.startedAtMs < batch.start - 0.0001 ||
				event.startedAtMs > batch.end + 0.0001
			) {
				continue;
			}

			const component = componentForDataSpan( event );
			if ( ! component ) {
				continue;
			}
			byComponent.set(
				component,
				( byComponent.get( component ) || 0 ) +
					( event.durationMs || 0 )
			);
		}

		for ( const [ component, duration ] of byComponent ) {
			rows.push( {
				run_id: run.runId,
				case_label: run.caseLabel,
				json_path: path.relative( repoRoot, jsonPath ),
				delay_mode: data.metadata.delayMode,
				delay_ms: summary.delayMs,
				post_keyup_gap_ms: data.metadata.postKeyupGapMs,
				input_index: batch.inputIndex,
				component,
				duration_ms: duration,
			} );
		}
	}

	return rows;
}

fs.mkdirSync( reportDataDir, { recursive: true } );

const timelineRows = runs.flatMap( extractTimelineRows );
const spanRows = runs.flatMap( extractSpanRows );
const timelineSummaryRows = [];
for ( const run of runs ) {
	const rows = timelineRows.filter( ( row ) => row.run_id === run.runId );
	if ( rows.length === 0 ) {
		continue;
	}
	timelineSummaryRows.push( {
		run_id: run.runId,
		case_label: run.caseLabel,
		delay_mode: rows[ 0 ].delay_mode,
		delay_ms: rows[ 0 ].delay_ms,
		post_keyup_gap_ms: rows[ 0 ].post_keyup_gap_ms,
		n: rows.length,
		latency_median_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
			0.5
		),
		keypress_median_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.5
		),
		previous_keyup_to_mark_median_ms: quantile(
			rows.map( ( row ) => row.previous_keyup_to_mark_ms ),
			0.5
		),
		mark_to_current_keydown_median_ms: quantile(
			rows.map( ( row ) => row.mark_to_current_keydown_ms ),
			0.5
		),
		previous_keyup_to_current_keydown_median_ms: quantile(
			rows.map( ( row ) => row.previous_keyup_to_current_keydown_ms ),
			0.5
		),
		mark_during_previous_key_hold_count: rows.filter(
			( row ) => row.mark_during_previous_key_hold
		).length,
		mark_action_median_ms: quantile(
			rows.map( ( row ) => row.mark_action_duration_ms ),
			0.5
		),
	} );
}

const spanSummaryRows = [];
const spanKeys = new Set(
	spanRows.map( ( row ) => `${ row.run_id }\t${ row.component }` )
);
for ( const key of spanKeys ) {
	const [ runId, component ] = key.split( '\t' );
	const rows = spanRows.filter(
		( row ) => row.run_id === runId && row.component === component
	);
	spanSummaryRows.push( {
		run_id: runId,
		case_label: rows[ 0 ].case_label,
		delay_mode: rows[ 0 ].delay_mode,
		delay_ms: rows[ 0 ].delay_ms,
		post_keyup_gap_ms: rows[ 0 ].post_keyup_gap_ms,
		component,
		n: rows.length,
		median_ms: quantile(
			rows.map( ( row ) => row.duration_ms ),
			0.5
		),
		p90_ms: quantile(
			rows.map( ( row ) => row.duration_ms ),
			0.9
		),
	} );
}

writeCsv(
	path.join( reportDataDir, 'typing-delay-causality-samples.csv' ),
	timelineRows,
	[
		'run_id',
		'case_label',
		'json_path',
		'delay_mode',
		'delay_ms',
		'post_keyup_gap_ms',
		'sample_index',
		'latency_ms',
		'keydown_ms',
		'keypress_ms',
		'keyup_ms',
		'previous_input_to_previous_keyup_ms',
		'previous_keyup_to_mark_ms',
		'mark_to_current_keydown_ms',
		'previous_keyup_to_current_keydown_ms',
		'mark_during_previous_key_hold',
		'mark_action_duration_ms',
		'current_keydown_is_persistent',
		'current_keydown_is_typing',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-causality-timeline-summary.csv' ),
	timelineSummaryRows,
	[
		'run_id',
		'case_label',
		'delay_mode',
		'delay_ms',
		'post_keyup_gap_ms',
		'n',
		'latency_median_ms',
		'keypress_median_ms',
		'previous_keyup_to_mark_median_ms',
		'mark_to_current_keydown_median_ms',
		'previous_keyup_to_current_keydown_median_ms',
		'mark_during_previous_key_hold_count',
		'mark_action_median_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-causality-span-samples.csv' ),
	spanRows,
	[
		'run_id',
		'case_label',
		'json_path',
		'delay_mode',
		'delay_ms',
		'post_keyup_gap_ms',
		'input_index',
		'component',
		'duration_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-causality-span-summary.csv' ),
	spanSummaryRows,
	[
		'run_id',
		'case_label',
		'delay_mode',
		'delay_ms',
		'post_keyup_gap_ms',
		'component',
		'n',
		'median_ms',
		'p90_ms',
	]
);

// eslint-disable-next-line no-console
console.log(
	`Wrote causality CSVs to ${ path.relative( repoRoot, reportDataDir ) }`
);
