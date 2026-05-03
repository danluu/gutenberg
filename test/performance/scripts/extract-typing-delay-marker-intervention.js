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
		runId: 'marker_normal_targeted',
		traceType: 'targeted',
		intervention: 'normal marker',
		dir: 'artifacts/typing-delay-mark-normal-targeted',
	},
	{
		runId: 'marker_noop_targeted',
		traceType: 'targeted',
		intervention: 'marker no-op',
		dir: 'artifacts/typing-delay-mark-noop-targeted',
	},
	{
		runId: 'marker_next_not_persistent_targeted',
		traceType: 'targeted',
		intervention: 'mark next not persistent',
		dir: 'artifacts/typing-delay-mark-next-not-persistent-targeted',
	},
	{
		runId: 'marker_normal_spans',
		traceType: 'span trace',
		intervention: 'normal marker',
		dir: 'artifacts/typing-delay-mark-normal-spans',
	},
	{
		runId: 'marker_noop_spans',
		traceType: 'span trace',
		intervention: 'marker no-op',
		dir: 'artifacts/typing-delay-mark-noop-spans',
	},
	{
		runId: 'marker_next_not_persistent_spans',
		traceType: 'span trace',
		intervention: 'mark next not persistent',
		dir: 'artifacts/typing-delay-mark-next-not-persistent-spans',
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

function groupedBy( rows, keyForRow ) {
	const grouped = new Map();
	for ( const row of rows ) {
		const key = keyForRow( row );
		if ( ! grouped.has( key ) ) {
			grouped.set( key, [] );
		}
		grouped.get( key ).push( row );
	}
	return grouped;
}

function changedPersistentState( event ) {
	return (
		event.before?.isPersistent !== event.after?.isPersistent ||
		event.before?.isTyping !== event.after?.isTyping
	);
}

function readRuns() {
	return runs.map( ( run ) => {
		const jsonPath = newestJson( run.dir );
		if ( ! jsonPath ) {
			throw new Error( `Missing benchmark JSON in ${ run.dir }` );
		}

		// eslint-disable-next-line no-console
		console.log( `Reading ${ path.relative( repoRoot, jsonPath ) }` );
		return {
			...run,
			jsonPath,
			data: JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) ),
		};
	} );
}

const loadedRuns = readRuns();

const sampleRows = loadedRuns.flatMap( ( run ) =>
	run.data.records
		.filter( ( record ) => ! record.isThrowaway )
		.map( ( record ) => ( {
			run_id: run.runId,
			trace_type: run.traceType,
			intervention: run.intervention,
			json_path: path.relative( repoRoot, run.jsonPath ),
			delay_ms: record.delayMs,
			round: record.round,
			sample_index: record.sampleIndex,
			delay_sample_index: record.delaySampleIndex,
			latency_ms: record.latencyMs,
			keydown_ms: record.keydownMs,
			keypress_ms: record.keypressMs,
			keyup_ms: record.keyupMs,
		} ) )
);

const summaryRows = Array.from(
	groupedBy(
		sampleRows,
		( row ) => `${ row.run_id }\t${ row.delay_ms }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	const latencies = rows.map( ( row ) => row.latency_ms );
	const keypresses = rows.map( ( row ) => row.keypress_ms );
	return {
		run_id: first.run_id,
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		n: rows.length,
		latency_p10_ms: quantile( latencies, 0.1 ),
		latency_p50_ms: quantile( latencies, 0.5 ),
		latency_p90_ms: quantile( latencies, 0.9 ),
		latency_mean_ms:
			latencies.reduce( ( sum, value ) => sum + value, 0 ) /
			latencies.length,
		keypress_p50_ms: quantile( keypresses, 0.5 ),
	};
} );

const actionRows = loadedRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.map( ( summary ) => {
		const markActions = ( summary.dataEvents || [] ).filter(
			( event ) =>
				event.storeName === 'core/block-editor' &&
				event.actionName === '__unstableMarkLastChangeAsPersistent'
		);
		const markNextNotPersistentActions = (
			summary.dataEvents || []
		).filter(
			( event ) =>
				event.storeName === 'core/block-editor' &&
				event.actionName === '__unstableMarkNextChangeAsNotPersistent'
		);
		const timers = ( summary.timerEvents || [] ).filter(
			( event ) => event.requestedTimeoutMs === 1000
		);
		const interventionEvents =
			summary.markPersistentInterventionEvents || [];
		return {
			run_id: run.runId,
			trace_type: run.traceType,
			intervention: run.intervention,
			delay_ms: summary.delayMs,
			round: summary.round,
			mark_actions: markActions.length,
			mark_actions_changing_visible_state: markActions.filter(
				changedPersistentState
			).length,
			mark_next_not_persistent_actions:
				markNextNotPersistentActions.length,
			mark_next_not_persistent_actions_changing_visible_state:
				markNextNotPersistentActions.filter( changedPersistentState )
					.length,
			intervention_events: interventionEvents.length,
			timers_scheduled: timers.length,
			timers_fired: timers.filter( ( event ) => event.firedAtMs ).length,
			timers_cleared_before_fire: timers.filter(
				( event ) => event.clearedAtMs && ! event.firedAtMs
			).length,
		};
	} )
);

const actionSampleRows = loadedRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.flatMap( ( summary ) =>
		( summary.dataEvents || [] )
			.filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					[
						'__unstableMarkLastChangeAsPersistent',
						'__unstableMarkNextChangeAsNotPersistent',
						'updateBlockAttributes',
					].includes( event.actionName )
			)
			.map( ( event ) => ( {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				delay_ms: summary.delayMs,
				round: summary.round,
				action_name: event.actionName,
				duration_ms: event.durationMs,
				before_is_persistent: event.before?.isPersistent,
				after_is_persistent: event.after?.isPersistent,
				before_is_typing: event.before?.isTyping,
				after_is_typing: event.after?.isTyping,
			} ) )
	)
);

const actionDurationRows = Array.from(
	groupedBy(
		actionSampleRows,
		( row ) => `${ row.run_id }\t${ row.delay_ms }\t${ row.action_name }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	const durations = rows.map( ( row ) => row.duration_ms );
	return {
		run_id: first.run_id,
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		action_name: first.action_name,
		n: rows.length,
		duration_p50_ms: quantile( durations, 0.5 ),
		duration_mean_ms:
			durations.reduce( ( sum, value ) => sum + value, 0 ) /
			durations.length,
		before_persistent_count: rows.filter(
			( row ) => row.before_is_persistent
		).length,
		after_persistent_count: rows.filter(
			( row ) => row.after_is_persistent
		).length,
	};
} );

const pathRows = loadedRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.flatMap( ( summary ) =>
		( summary.dataSpanEvents || [] )
			.filter(
				( event ) =>
					event.name === 'block-editor.useBlockSync.updateParent'
			)
			.map( ( event ) => ( {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				delay_ms: summary.delayMs,
				round: summary.round,
				started_at_ms: event.startedAtMs,
				duration_ms: event.durationMs,
				update_parent: event.metadata?.updateParent,
				blocks_changed: event.metadata?.blocksChanged,
				selection_changed: event.metadata?.selectionChanged,
				did_persistence_change: event.metadata?.didPersistenceChange,
				are_blocks_different: event.metadata?.areBlocksDifferent,
				previous_are_blocks_different:
					event.metadata?.previousAreBlocksDifferent,
				new_is_persistent: event.metadata?.newIsPersistent,
			} ) )
	)
);

const pathSummaryRows = Array.from(
	groupedBy(
		pathRows,
		( row ) => `${ row.run_id }\t${ row.delay_ms }\t${ row.update_parent }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		run_id: first.run_id,
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		update_parent: first.update_parent,
		n: rows.length,
		duration_p50_ms: quantile(
			rows.map( ( row ) => row.duration_ms ),
			0.5
		),
		did_persistence_change_count: rows.filter(
			( row ) => row.did_persistence_change
		).length,
		new_is_persistent_count: rows.filter( ( row ) => row.new_is_persistent )
			.length,
	};
} );

fs.mkdirSync( reportDataDir, { recursive: true } );
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-intervention-samples.csv' ),
	sampleRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'json_path',
		'delay_ms',
		'round',
		'sample_index',
		'delay_sample_index',
		'latency_ms',
		'keydown_ms',
		'keypress_ms',
		'keyup_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-intervention-summary.csv' ),
	summaryRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'n',
		'latency_p10_ms',
		'latency_p50_ms',
		'latency_p90_ms',
		'latency_mean_ms',
		'keypress_p50_ms',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-intervention-action-summary.csv'
	),
	actionRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'mark_actions',
		'mark_actions_changing_visible_state',
		'mark_next_not_persistent_actions',
		'mark_next_not_persistent_actions_changing_visible_state',
		'intervention_events',
		'timers_scheduled',
		'timers_fired',
		'timers_cleared_before_fire',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-action-samples.csv' ),
	actionSampleRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'action_name',
		'duration_ms',
		'before_is_persistent',
		'after_is_persistent',
		'before_is_typing',
		'after_is_typing',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-action-duration-summary.csv'
	),
	actionDurationRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'action_name',
		'n',
		'duration_p50_ms',
		'duration_mean_ms',
		'before_persistent_count',
		'after_persistent_count',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-path-samples.csv' ),
	pathRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'started_at_ms',
		'duration_ms',
		'update_parent',
		'blocks_changed',
		'selection_changed',
		'did_persistence_change',
		'are_blocks_different',
		'previous_are_blocks_different',
		'new_is_persistent',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-path-summary.csv' ),
	pathSummaryRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'update_parent',
		'n',
		'duration_p50_ms',
		'did_persistence_change_count',
		'new_is_persistent_count',
	]
);
