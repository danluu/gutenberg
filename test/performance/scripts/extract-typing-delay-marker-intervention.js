#!/usr/bin/env node

/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { SourceMapConsumer } = require( 'source-map' );

const repoRoot = path.resolve( __dirname, '../../..' );
const reportDataDir = path.join(
	repoRoot,
	'test/performance/reports/typing-delay-benchmark/data'
);
const sourceMapConsumers = new Map();

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
		runId: 'marker_last_then_next_not_persistent_targeted',
		traceType: 'targeted',
		intervention: 'mark last, then force next transient',
		dir: 'artifacts/typing-delay-mark-last-then-next-not-persistent-targeted',
	},
	{
		runId: 'marker_stop_start_typing_targeted',
		traceType: 'targeted',
		intervention: 'stop/start typing',
		dir: 'artifacts/typing-delay-mark-stop-start-typing-targeted',
	},
	{
		runId: 'marker_busy_wait_20_targeted',
		traceType: 'targeted',
		intervention: 'busy wait 20ms',
		dir: 'artifacts/typing-delay-mark-busy-wait-20-targeted',
	},
	{
		runId: 'marker_busy_wait_40_targeted',
		traceType: 'targeted',
		intervention: 'busy wait 40ms',
		dir: 'artifacts/typing-delay-mark-busy-wait-40-targeted',
	},
	{
		runId: 'marker_toggle_selection_targeted',
		traceType: 'targeted',
		intervention: 'toggle selection',
		dir: 'artifacts/typing-delay-mark-toggle-selection-targeted',
	},
	{
		runId: 'marker_toggle_template_validity_targeted',
		traceType: 'targeted',
		intervention: 'toggle template validity',
		dir: 'artifacts/typing-delay-mark-toggle-template-validity-targeted',
	},
	{
		runId: 'marker_toggle_block_highlight_targeted',
		traceType: 'targeted',
		intervention: 'toggle block highlight',
		dir: 'artifacts/typing-delay-mark-toggle-block-highlight-targeted',
	},
	{
		runId: 'marker_stop_typing_targeted',
		traceType: 'targeted',
		intervention: 'stop typing',
		dir: 'artifacts/typing-delay-mark-stop-typing-targeted',
	},
	{
		runId: 'marker_start_typing_targeted',
		traceType: 'targeted',
		intervention: 'start typing',
		dir: 'artifacts/typing-delay-mark-start-typing-targeted',
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
	{
		runId: 'marker_last_then_next_not_persistent_spans',
		traceType: 'span trace',
		intervention: 'mark last, then force next transient',
		dir: 'artifacts/typing-delay-mark-last-then-next-not-persistent-spans',
	},
	{
		runId: 'marker_stop_start_typing_spans',
		traceType: 'span trace',
		intervention: 'stop/start typing',
		dir: 'artifacts/typing-delay-mark-stop-start-typing-spans',
	},
	{
		runId: 'marker_busy_wait_20_spans',
		traceType: 'span trace',
		intervention: 'busy wait 20ms',
		dir: 'artifacts/typing-delay-mark-busy-wait-20-spans',
	},
	{
		runId: 'marker_toggle_selection_spans',
		traceType: 'span trace',
		intervention: 'toggle selection',
		dir: 'artifacts/typing-delay-mark-toggle-selection-spans',
	},
	{
		runId: 'marker_toggle_template_validity_spans',
		traceType: 'span trace',
		intervention: 'toggle template validity',
		dir: 'artifacts/typing-delay-mark-toggle-template-validity-spans',
	},
	{
		runId: 'marker_toggle_block_highlight_spans',
		traceType: 'span trace',
		intervention: 'toggle block highlight',
		dir: 'artifacts/typing-delay-mark-toggle-block-highlight-spans',
	},
	{
		runId: 'marker_stop_typing_spans',
		traceType: 'span trace',
		intervention: 'stop typing',
		dir: 'artifacts/typing-delay-mark-stop-typing-spans',
	},
	{
		runId: 'marker_start_typing_spans',
		traceType: 'span trace',
		intervention: 'start typing',
		dir: 'artifacts/typing-delay-mark-start-typing-spans',
	},
];

const timeoutRewriteRuns = [
	{
		runId: 'timeout_970_marker_targeted',
		traceType: 'timeout rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 970,
		dir: 'artifacts/typing-delay-timeout-970-marker-targeted',
	},
];

const allDataSpanRuns = [
	{
		runId: 'marker_normal_allspans_1000',
		traceType: 'all data spans',
		intervention: 'normal marker',
		dir: 'artifacts/typing-delay-mark-normal-allspans-1000',
	},
	{
		runId: 'marker_noop_allspans_1000',
		traceType: 'all data spans',
		intervention: 'marker no-op',
		dir: 'artifacts/typing-delay-mark-noop-allspans-1000',
	},
	{
		runId: 'marker_raw_unknown_action_allspans_1000',
		traceType: 'all data spans',
		intervention: 'raw unknown action',
		dir: 'test/performance/artifacts/typing-delay-mark-raw-unknown-action-allspans-trace-1000',
	},
	{
		runId: 'marker_next_not_persistent_allspans_1000',
		traceType: 'all data spans',
		intervention: 'mark next not persistent',
		dir: 'artifacts/typing-delay-mark-next-not-persistent-allspans-1000',
	},
	{
		runId: 'marker_stop_start_typing_allspans_1000',
		traceType: 'all data spans',
		intervention: 'stop/start typing',
		dir: 'artifacts/typing-delay-mark-stop-start-typing-allspans-1000',
	},
	{
		runId: 'marker_toggle_selection_allspans_1000',
		traceType: 'all data spans',
		intervention: 'toggle selection',
		dir: 'artifacts/typing-delay-mark-toggle-selection-allspans-1000',
	},
];

const reduxListenerOwnerRuns = [
	{
		runId: 'redux_listener_owner_normal_1000',
		traceType: 'redux listener owner attribution',
		intervention: 'normal marker',
		dir: 'test/performance/artifacts/typing-delay-redux-listener-owner-data-normal-1000-small',
	},
	{
		runId: 'redux_listener_owner_noop_1000',
		traceType: 'redux listener owner attribution',
		intervention: 'marker no-op',
		dir: 'test/performance/artifacts/typing-delay-redux-listener-owner-data-noop-1000-small',
	},
	{
		runId: 'redux_listener_owner_next_not_persistent_1000',
		traceType: 'redux listener owner attribution',
		intervention: 'mark next not persistent',
		dir: 'test/performance/artifacts/typing-delay-redux-listener-owner-data-next-1000-small',
	},
];

const listenerProbeRuns = [
	{
		runId: 'marker_normal_listener_1000',
		traceType: 'event listener probe',
		intervention: 'normal marker',
		dir: 'artifacts/typing-delay-mark-normal-listener-1000',
	},
	{
		runId: 'marker_noop_listener_1000',
		traceType: 'event listener probe',
		intervention: 'marker no-op',
		dir: 'artifacts/typing-delay-mark-noop-listener-1000',
	},
	{
		runId: 'marker_toggle_selection_listener_1000',
		traceType: 'event listener probe',
		intervention: 'toggle selection',
		dir: 'artifacts/typing-delay-mark-toggle-selection-listener-1000',
	},
	{
		runId: 'marker_stop_start_typing_listener_1000',
		traceType: 'event listener probe',
		intervention: 'stop/start typing',
		dir: 'artifacts/typing-delay-mark-stop-start-typing-listener-1000',
	},
];

const markerGapDenseRuns = [
	{
		runId: 'marker_normal_gap_dense',
		traceType: 'gap dense',
		intervention: 'normal marker',
		dir: 'artifacts/typing-delay-mark-normal-gap-dense',
	},
	{
		runId: 'marker_noop_gap_dense',
		traceType: 'gap dense',
		intervention: 'marker no-op',
		dir: 'artifacts/typing-delay-mark-noop-gap-dense',
	},
	{
		runId: 'marker_stop_start_typing_gap_dense',
		traceType: 'gap dense',
		intervention: 'stop/start typing',
		dir: 'artifacts/typing-delay-mark-stop-start-typing-gap-dense',
	},
];

const fixedHoldTimerRewriteRuns = [
	{
		runId: 'fixed_hold_normal_timeout_1000_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 1000,
		dir: 'artifacts/typing-delay-fixed-hold-normal-timeout-1000-delay-1300',
	},
	{
		runId: 'fixed_hold_normal_timeout_1100_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 1100,
		dir: 'artifacts/typing-delay-fixed-hold-normal-timeout-1100-delay-1300',
	},
	{
		runId: 'fixed_hold_normal_timeout_1200_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 1200,
		dir: 'artifacts/typing-delay-fixed-hold-normal-timeout-1200-delay-1300',
	},
	{
		runId: 'fixed_hold_normal_timeout_1250_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 1250,
		dir: 'artifacts/typing-delay-fixed-hold-normal-timeout-1250-delay-1300',
	},
	{
		runId: 'fixed_hold_normal_timeout_1270_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'normal marker',
		rewriteTimeoutMs: 1270,
		dir: 'artifacts/typing-delay-fixed-hold-normal-timeout-1270-delay-1300',
	},
	{
		runId: 'fixed_hold_noop_timeout_1250_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'marker no-op',
		rewriteTimeoutMs: 1250,
		dir: 'artifacts/typing-delay-fixed-hold-noop-timeout-1250-delay-1300',
	},
	{
		runId: 'fixed_hold_stop_start_timeout_1250_delay_1300',
		traceType: 'fixed hold timer rewrite',
		intervention: 'stop/start typing',
		rewriteTimeoutMs: 1250,
		dir: 'artifacts/typing-delay-fixed-hold-stop-start-timeout-1250-delay-1300',
	},
];

const taskEndProximityRuns = [
	{
		runId: 'task_end_noop_timeout_1250_delay_1300',
		traceType: 'task end proximity',
		intervention: 'marker no-op',
		rewriteTimeoutMs: 1250,
		dir: 'artifacts/typing-delay-fixed-hold-noop-timeout-1250-delay-1300',
	},
	{
		runId: 'task_end_noop_busy_150_timeout_1000_delay_1300',
		traceType: 'task end proximity',
		intervention: 'no-op + busy wait 150ms',
		rewriteTimeoutMs: 1000,
		dir: 'artifacts/typing-delay-task-end-noop-then-busy-150-timeout-1000-delay-1300',
	},
	{
		runId: 'task_end_busy_20_timeout_1230_delay_1300',
		traceType: 'task end proximity',
		intervention: 'busy wait 20ms',
		rewriteTimeoutMs: 1230,
		dir: 'artifacts/typing-delay-task-end-busy-20-timeout-1230-delay-1300',
	},
	{
		runId: 'task_end_busy_40_timeout_1210_delay_1300',
		traceType: 'task end proximity',
		intervention: 'busy wait 40ms',
		rewriteTimeoutMs: 1210,
		dir: 'artifacts/typing-delay-task-end-busy-40-timeout-1210-delay-1300',
	},
	{
		runId: 'task_end_noop_busy_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'no-op + busy wait 150ms',
		rewriteTimeoutMs: 1100,
		dir: 'artifacts/typing-delay-task-end-noop-then-busy-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_worker_busy_150_timeout_1000_delay_1300',
		traceType: 'task end proximity',
		intervention: 'worker busy wait 150ms',
		rewriteTimeoutMs: 1000,
		dir: 'test/performance/artifacts/typing-delay-task-end-worker-busy-150-timeout-1000-delay-1300',
	},
	{
		runId: 'task_end_worker_busy_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'worker busy wait 150ms',
		rewriteTimeoutMs: 1100,
		dir: 'test/performance/artifacts/typing-delay-task-end-worker-busy-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_worker_busy_no_message_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'worker busy wait 150ms, no message',
		rewriteTimeoutMs: 1100,
		dir: 'test/performance/artifacts/typing-delay-task-end-worker-busy-no-message-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_worker_delay_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'worker delay 150ms, no CPU',
		rewriteTimeoutMs: 1100,
		dir: 'test/performance/artifacts/typing-delay-task-end-worker-delay-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_delayed_noop_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'delayed no-op 150ms',
		rewriteTimeoutMs: 1100,
		dir: 'test/performance/artifacts/typing-delay-task-end-delayed-noop-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_normal_busy_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'normal marker + busy wait 150ms',
		rewriteTimeoutMs: 1100,
		dir: 'artifacts/typing-delay-task-end-normal-then-busy-150-timeout-1100-delay-1300',
	},
	{
		runId: 'task_end_stop_start_busy_150_timeout_1100_delay_1300',
		traceType: 'task end proximity',
		intervention: 'stop/start + busy wait 150ms',
		rewriteTimeoutMs: 1100,
		dir: 'artifacts/typing-delay-task-end-stop-start-then-busy-150-timeout-1100-delay-1300',
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

function ownerFrame( stack = '' ) {
	for ( const line of stack.split( '\n' ).slice( 1 ) ) {
		if ( line.includes( '/build/scripts/data/' ) ) {
			continue;
		}
		if ( line.includes( '/build/scripts/vendors/' ) ) {
			continue;
		}

		const match = line.match(
			/build\/scripts\/([^/]+)\/index(?:\.min)?\.js[^:]*:(\d+):(\d+)/
		);
		if ( match ) {
			return {
				script: match[ 1 ],
				line: Number( match[ 2 ] ),
				column: Number( match[ 3 ] ),
				frame: `${ match[ 1 ] }:${ match[ 2 ] }:${ match[ 3 ] }`,
			};
		}
	}

	return {
		script: 'unknown',
		line: null,
		column: null,
		frame: 'unknown',
	};
}

function sourceMapConsumer( script ) {
	if ( sourceMapConsumers.has( script ) ) {
		return sourceMapConsumers.get( script );
	}

	const mapPath = path.join(
		repoRoot,
		'build/scripts',
		script,
		'index.min.js.map'
	);
	if ( ! fs.existsSync( mapPath ) ) {
		sourceMapConsumers.set( script, null );
		return null;
	}

	const consumer = new SourceMapConsumer(
		JSON.parse( fs.readFileSync( mapPath, 'utf8' ) )
	);
	sourceMapConsumers.set( script, consumer );
	return consumer;
}

function originalPosition( frame ) {
	const consumer = sourceMapConsumer( frame.script );
	if ( ! consumer || frame.line === null || frame.column === null ) {
		return {};
	}

	const position = consumer.originalPositionFor( {
		line: frame.line,
		column: frame.column,
	} );

	return {
		sourcePath: position.source
			? position.source.replace( /^\.\.\/\.\.\/\.\.\//, '' )
			: '',
		sourceLine: position.line || '',
		sourceColumn: position.column ?? '',
		sourceName: position.name || '',
	};
}

function sourceSnippet( source = '' ) {
	return source.replace( /\s+/g, ' ' ).slice( 0, 180 );
}

function useSelectMetadataById( run ) {
	const metadataById = new Map();
	for ( const metadata of run.data.useSelectMetadata || [] ) {
		const frame = ownerFrame( metadata.useSelectStack );
		metadataById.set(
			`${ metadata.windowName }:${ metadata.useSelectId }`,
			{
				...metadata,
				...frame,
				...originalPosition( frame ),
				sourceSnippet: sourceSnippet( metadata.initialMapSelectSource ),
			}
		);
	}
	return metadataById;
}

function ownerForUseSelectSpan( metadataById, span ) {
	if ( ! span?.metadata?.useSelectId ) {
		return {
			ownerScript: 'unknown',
			ownerFrame: 'unknown',
			sourcePath: '(non-useSelect)',
			sourceLine: '',
			sourceColumn: '',
			sourceName: '',
			sourceSnippet: '',
			hasUseSelectOwner: false,
		};
	}

	const metadata =
		metadataById.get(
			`${ span.windowName }:${ span.metadata.useSelectId }`
		) || {};
	return {
		ownerScript: metadata.script || 'unknown',
		ownerFrame: metadata.frame || 'unknown',
		sourcePath: metadata.sourcePath || '',
		sourceLine: metadata.sourceLine || '',
		sourceColumn: metadata.sourceColumn || '',
		sourceName: metadata.sourceName || '',
		sourceSnippet: metadata.sourceSnippet || '',
		hasUseSelectOwner: true,
	};
}

function ownerKey( owner ) {
	return [
		owner.sourcePath,
		owner.sourceLine,
		owner.sourceColumn,
		owner.sourceName,
		owner.sourceSnippet,
	].join( '\t' );
}

function ensureOwnerGroup( groups, base, owner ) {
	const key = [
		base.run_id,
		base.intervention,
		base.window_kind,
		base.sample_id,
		ownerKey( owner ),
	].join( '\t' );

	if ( ! groups.has( key ) ) {
		groups.set( key, {
			...base,
			owner_script: owner.ownerScript,
			owner_frame: owner.ownerFrame,
			source_path: owner.sourcePath,
			source_line: owner.sourceLine,
			source_column: owner.sourceColumn,
			source_name: owner.sourceName,
			source_snippet: owner.sourceSnippet,
			has_use_select_owner: owner.hasUseSelectOwner,
			use_select_ids: new Set(),
			on_change_count: 0,
			on_change_duration_ms: 0,
			on_store_change_count: 0,
			on_store_change_duration_ms: 0,
			react_listener_count: 0,
			react_listener_duration_ms: 0,
			map_select_count: 0,
			map_select_duration_ms: 0,
			update_value_count: 0,
			update_value_duration_ms: 0,
			render_queue_add_count: 0,
			render_queue_add_duration_ms: 0,
			outer_listener_count: 0,
			outer_listener_duration_ms: 0,
		} );
	}

	return groups.get( key );
}

function addUseSelectOwnerSpan( groups, base, metadataById, span ) {
	const owner = ownerForUseSelectSpan( metadataById, span );
	const group = ensureOwnerGroup( groups, base, owner );

	if ( span.metadata?.useSelectId ) {
		group.use_select_ids.add(
			`${ span.windowName }:${ span.metadata.useSelectId }`
		);
	}

	if ( span.name === 'data.useSelect.onChange' ) {
		group.on_change_count++;
		group.on_change_duration_ms += span.durationMs || 0;
	} else if ( span.name === 'data.useSelect.onStoreChange' ) {
		group.on_store_change_count++;
		group.on_store_change_duration_ms += span.durationMs || 0;
	} else if ( span.name === 'data.useSelect.reactListener' ) {
		group.react_listener_count++;
		group.react_listener_duration_ms += span.durationMs || 0;
	} else if ( span.name === 'data.useSelect.mapSelect' ) {
		group.map_select_count++;
		group.map_select_duration_ms += span.durationMs || 0;
	} else if ( span.name === 'data.useSelect.updateValue' ) {
		group.update_value_count++;
		group.update_value_duration_ms += span.durationMs || 0;
	} else if ( span.name === 'data.useSelect.renderQueueAdd' ) {
		group.render_queue_add_count++;
		group.render_queue_add_duration_ms += span.durationMs || 0;
	}
}

function addOuterListenerOwnerSpan(
	groups,
	base,
	metadataById,
	listenerSpan,
	ownerSpan
) {
	const owner = ownerForUseSelectSpan( metadataById, ownerSpan );
	const group = ensureOwnerGroup( groups, base, owner );
	group.outer_listener_count++;
	group.outer_listener_duration_ms += listenerSpan.durationMs || 0;
}

function firstUseSelectOnChangeInsideListener( spans, listenerSpan ) {
	const listenerStartedAt = listenerSpan.startedAtMs;
	const listenerStoppedAt =
		listenerSpan.startedAtMs + ( listenerSpan.durationMs || 0 ) + 0.0001;
	return spans.find(
		( span ) =>
			span.name === 'data.useSelect.onChange' &&
			span.startedAtMs >= listenerStartedAt &&
			span.startedAtMs <= listenerStoppedAt
	);
}

function compactOwnerRows( groups ) {
	return Array.from( groups.values() ).map( ( row ) => ( {
		...row,
		use_select_instances: row.use_select_ids.size,
		use_select_ids: undefined,
	} ) );
}

function summarizeOwnerRows( rows ) {
	return Array.from(
		groupedBy( rows, ( row ) =>
			[
				row.intervention,
				row.window_kind,
				row.source_path,
				row.source_line,
				row.source_column,
				row.source_name,
				row.source_snippet,
			].join( '\t' )
		).entries()
	).map( ( [ , ownerRows ] ) => {
		const first = ownerRows[ 0 ];
		return {
			trace_type: first.trace_type,
			intervention: first.intervention,
			window_kind: first.window_kind,
			owner_script: first.owner_script,
			owner_frame: first.owner_frame,
			source_path: first.source_path,
			source_line: first.source_line,
			source_column: first.source_column,
			source_name: first.source_name,
			source_snippet: first.source_snippet,
			n_windows: ownerRows.length,
			use_select_instances_max: maxFinite(
				ownerRows.map( ( row ) => row.use_select_instances )
			),
			on_change_count_p50: quantile(
				ownerRows.map( ( row ) => row.on_change_count ),
				0.5
			),
			on_change_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.on_change_duration_ms ),
				0.5
			),
			on_change_duration_p90_ms: quantile(
				ownerRows.map( ( row ) => row.on_change_duration_ms ),
				0.9
			),
			on_change_duration_sum_ms: ownerRows.reduce(
				( sum, row ) => sum + row.on_change_duration_ms,
				0
			),
			on_store_change_count_p50: quantile(
				ownerRows.map( ( row ) => row.on_store_change_count ),
				0.5
			),
			on_store_change_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.on_store_change_duration_ms ),
				0.5
			),
			react_listener_count_p50: quantile(
				ownerRows.map( ( row ) => row.react_listener_count ),
				0.5
			),
			react_listener_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.react_listener_duration_ms ),
				0.5
			),
			map_select_count_p50: quantile(
				ownerRows.map( ( row ) => row.map_select_count ),
				0.5
			),
			map_select_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.map_select_duration_ms ),
				0.5
			),
			update_value_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.update_value_duration_ms ),
				0.5
			),
			render_queue_add_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.render_queue_add_duration_ms ),
				0.5
			),
			outer_listener_count_p50: quantile(
				ownerRows.map( ( row ) => row.outer_listener_count ),
				0.5
			),
			outer_listener_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.outer_listener_duration_ms ),
				0.5
			),
			outer_listener_duration_p90_ms: quantile(
				ownerRows.map( ( row ) => row.outer_listener_duration_ms ),
				0.9
			),
			outer_listener_duration_sum_ms: ownerRows.reduce(
				( sum, row ) => sum + row.outer_listener_duration_ms,
				0
			),
		};
	} );
}

function ownerDiffRows( summaryRows, baselineIntervention = 'normal marker' ) {
	const rowKey = ( row ) =>
		[
			row.window_kind,
			row.source_path,
			row.source_line,
			row.source_column,
			row.source_name,
			row.source_snippet,
		].join( '\t' );
	const baselineRowsByKey = new Map(
		summaryRows
			.filter( ( row ) => row.intervention === baselineIntervention )
			.map( ( row ) => [ rowKey( row ), row ] )
	);

	return summaryRows
		.filter( ( row ) => row.intervention !== baselineIntervention )
		.map( ( row ) => {
			const baseline = baselineRowsByKey.get( rowKey( row ) );
			return {
				trace_type: row.trace_type,
				window_kind: row.window_kind,
				comparison: `${ row.intervention } minus ${ baselineIntervention }`,
				intervention: row.intervention,
				baseline_intervention: baselineIntervention,
				owner_script: row.owner_script,
				owner_frame: row.owner_frame,
				source_path: row.source_path,
				source_line: row.source_line,
				source_column: row.source_column,
				source_name: row.source_name,
				source_snippet: row.source_snippet,
				intervention_on_change_duration_p50_ms:
					row.on_change_duration_p50_ms,
				baseline_on_change_duration_p50_ms:
					baseline?.on_change_duration_p50_ms ?? 0,
				diff_on_change_duration_p50_ms:
					row.on_change_duration_p50_ms -
					( baseline?.on_change_duration_p50_ms ?? 0 ),
				intervention_on_change_count_p50: row.on_change_count_p50,
				baseline_on_change_count_p50:
					baseline?.on_change_count_p50 ?? 0,
				diff_on_change_count_p50:
					row.on_change_count_p50 -
					( baseline?.on_change_count_p50 ?? 0 ),
				intervention_on_store_change_duration_p50_ms:
					row.on_store_change_duration_p50_ms,
				baseline_on_store_change_duration_p50_ms:
					baseline?.on_store_change_duration_p50_ms ?? 0,
				diff_on_store_change_duration_p50_ms:
					row.on_store_change_duration_p50_ms -
					( baseline?.on_store_change_duration_p50_ms ?? 0 ),
				intervention_react_listener_duration_p50_ms:
					row.react_listener_duration_p50_ms,
				baseline_react_listener_duration_p50_ms:
					baseline?.react_listener_duration_p50_ms ?? 0,
				diff_react_listener_duration_p50_ms:
					row.react_listener_duration_p50_ms -
					( baseline?.react_listener_duration_p50_ms ?? 0 ),
				intervention_outer_listener_duration_p50_ms:
					row.outer_listener_duration_p50_ms,
				baseline_outer_listener_duration_p50_ms:
					baseline?.outer_listener_duration_p50_ms ?? 0,
				diff_outer_listener_duration_p50_ms:
					row.outer_listener_duration_p50_ms -
					( baseline?.outer_listener_duration_p50_ms ?? 0 ),
				intervention_outer_listener_count_p50:
					row.outer_listener_count_p50,
				baseline_outer_listener_count_p50:
					baseline?.outer_listener_count_p50 ?? 0,
				diff_outer_listener_count_p50:
					row.outer_listener_count_p50 -
					( baseline?.outer_listener_count_p50 ?? 0 ),
			};
		} );
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

function readOptionalRuns( optionalRuns ) {
	return optionalRuns
		.map( ( run ) => {
			const jsonPath = newestJson( run.dir );
			if ( ! jsonPath ) {
				return null;
			}

			// eslint-disable-next-line no-console
			console.log( `Reading ${ path.relative( repoRoot, jsonPath ) }` );
			return {
				...run,
				jsonPath,
				data: JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) ),
			};
		} )
		.filter( Boolean );
}

const loadedTimeoutRewriteRuns = readOptionalRuns( timeoutRewriteRuns );
const loadedAllDataSpanRuns = readOptionalRuns( allDataSpanRuns );
const loadedReduxListenerOwnerRuns = readOptionalRuns( reduxListenerOwnerRuns );
const loadedListenerProbeRuns = readOptionalRuns( listenerProbeRuns );
const loadedMarkerGapDenseRuns = readOptionalRuns( markerGapDenseRuns );
const loadedFixedHoldTimerRewriteRuns = readOptionalRuns(
	fixedHoldTimerRewriteRuns
);
const loadedTaskEndProximityRuns = readOptionalRuns( taskEndProximityRuns );

function summaryKey( row ) {
	return `${ row.delayMs }\t${ row.round }\t${ row.editorSetupIndex }`;
}

function spanCategory( event ) {
	const metadata = event.metadata || {};
	if ( event.name === 'data.reduxStore.rootSubscribe' ) {
		return `rootSubscribe:${ metadata.storeName || '' }`;
	}
	if ( event.name === 'data.reduxStore.listener' ) {
		return `reduxListener:${ metadata.storeName || '' }`;
	}
	if ( event.name.startsWith( 'data.useSelect.' ) ) {
		return event.name.replace( 'data.useSelect.', 'useSelect.' );
	}
	if ( event.name === 'data.emitter.notifyListeners' ) {
		return `notify:${ metadata.emitterKind || '' }:${
			metadata.storeName || ''
		}`;
	}
	if ( event.name === 'data.emitter.listener' ) {
		return `emitterListener:${ metadata.emitterKind || '' }:${
			metadata.storeName || ''
		}:${ metadata.listenerType || '' }`;
	}
	if ( event.name === 'data.emitter.emit' ) {
		return `emit:${ metadata.emitterKind || '' }:${
			metadata.storeName || ''
		}`;
	}
	if ( event.name === 'data.emitter.resume' ) {
		return `resume:${ metadata.emitterKind || '' }:${
			metadata.storeName || ''
		}`;
	}
	return event.name;
}

function eventWithLatestEnd( events ) {
	return events.reduce(
		( latest, event ) =>
			! latest ||
			event.nowMs + ( event.durationMs || 0 ) >
				latest.nowMs + ( latest.durationMs || 0 )
				? event
				: latest,
		null
	);
}

function buildPairedRows( runsToPair ) {
	return runsToPair.flatMap( ( run ) => {
		const recordsBySummary = groupedBy( run.data.records, summaryKey );

		return run.data.delayRunSummaries.flatMap( ( summary ) => {
			const records = (
				recordsBySummary.get( summaryKey( summary ) ) || []
			)
				.slice()
				.sort(
					( left, right ) => left.sampleIndex - right.sampleIndex
				);
			const editorEvents = ( summary.browserEvents || [] ).filter(
				( event ) => event.documentName === 'editor-canvas'
			);
			const keydowns = editorEvents.filter(
				( event ) => event.type === 'keydown'
			);
			const inputs = editorEvents.filter(
				( event ) => event.type === 'input'
			);
			const markerActions = ( summary.dataEvents || [] ).filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					event.actionName === '__unstableMarkLastChangeAsPersistent'
			);
			const interventionEvents =
				summary.markPersistentInterventionEvents || [];

			return records.flatMap( ( record, recordIndex ) => {
				if ( record.isThrowaway ) {
					return [];
				}

				const currentKeydown = keydowns[ recordIndex ];
				const previousInput = inputs[ recordIndex - 1 ];
				if ( ! currentKeydown || ! previousInput ) {
					return [];
				}

				const priorMarkerActions = markerActions.filter(
					( event ) =>
						event.nowMs > previousInput.nowMs &&
						event.nowMs < currentKeydown.nowMs
				);
				const lastMarkerAction =
					priorMarkerActions[ priorMarkerActions.length - 1 ];
				const markerActionDurationMs = priorMarkerActions.reduce(
					( sum, event ) => sum + ( event.durationMs || 0 ),
					0
				);
				const priorInterventionEvents = interventionEvents.filter(
					( event ) =>
						event.nowMs > previousInput.nowMs &&
						event.nowMs < currentKeydown.nowMs
				);
				const lastInterventionStartEvent =
					priorInterventionEvents[
						priorInterventionEvents.length - 1
					];
				const lastInterventionEndEvent = eventWithLatestEnd(
					priorInterventionEvents
				);
				const interventionDurationMs = priorInterventionEvents.reduce(
					( sum, event ) => sum + ( event.durationMs || 0 ),
					0
				);

				return {
					run_id: run.runId,
					trace_type: run.traceType,
					intervention: run.intervention,
					rewrite_timeout_ms: run.rewriteTimeoutMs,
					delay_ms: record.delayMs,
					round: record.round,
					sample_index: record.sampleIndex,
					delay_sample_index: record.delaySampleIndex,
					previous_input_to_current_keydown_ms:
						currentKeydown.nowMs - previousInput.nowMs,
					previous_input_to_marker_ms: lastMarkerAction
						? lastMarkerAction.nowMs - previousInput.nowMs
						: null,
					marker_to_current_keydown_ms: lastMarkerAction
						? currentKeydown.nowMs - lastMarkerAction.nowMs
						: null,
					marker_action_count: priorMarkerActions.length,
					marker_action_duration_ms: markerActionDurationMs,
					intervention_event_count: priorInterventionEvents.length,
					intervention_duration_ms: interventionDurationMs,
					intervention_to_current_keydown_ms:
						lastInterventionStartEvent
							? currentKeydown.nowMs -
							  lastInterventionStartEvent.nowMs
							: null,
					intervention_end_to_current_keydown_ms:
						lastInterventionEndEvent
							? currentKeydown.nowMs -
							  ( lastInterventionEndEvent.nowMs +
									( lastInterventionEndEvent.durationMs ||
										0 ) )
							: null,
					latency_ms: record.latencyMs,
					keypress_ms: record.keypressMs,
					marker_inclusive_latency_ms:
						record.latencyMs + markerActionDurationMs,
					intervention_inclusive_latency_ms:
						record.latencyMs + interventionDurationMs,
					current_keydown_is_persistent: currentKeydown.isPersistent,
					current_keydown_is_typing: currentKeydown.isTyping,
				};
			} );
		} );
	} );
}

function buildPairedSummaryRows( rows ) {
	return Array.from(
		groupedBy(
			rows,
			( row ) => `${ row.run_id }\t${ row.delay_ms }`
		).entries()
	).map( ( [ , groupRows ] ) => {
		const first = groupRows[ 0 ];
		const latencies = groupRows.map( ( row ) => row.latency_ms );
		const markerActionDurations = groupRows.map(
			( row ) => row.marker_action_duration_ms
		);
		const markerInclusiveLatencies = groupRows.map(
			( row ) => row.marker_inclusive_latency_ms
		);
		const interventionInclusiveLatencies = groupRows.map(
			( row ) => row.intervention_inclusive_latency_ms
		);
		const keypresses = groupRows.map( ( row ) => row.keypress_ms );
		return {
			run_id: first.run_id,
			trace_type: first.trace_type,
			intervention: first.intervention,
			rewrite_timeout_ms: first.rewrite_timeout_ms,
			delay_ms: first.delay_ms,
			n: groupRows.length,
			rows_with_marker_action: groupRows.filter(
				( row ) => row.marker_action_count > 0
			).length,
			rows_with_intervention_event: groupRows.filter(
				( row ) => row.intervention_event_count > 0
			).length,
			latency_p50_ms: quantile( latencies, 0.5 ),
			keypress_p50_ms: quantile( keypresses, 0.5 ),
			previous_input_to_current_keydown_p50_ms: quantile(
				groupRows.map(
					( row ) => row.previous_input_to_current_keydown_ms
				),
				0.5
			),
			previous_input_to_marker_p50_ms: quantile(
				groupRows.map( ( row ) => row.previous_input_to_marker_ms ),
				0.5
			),
			marker_to_current_keydown_p50_ms: quantile(
				groupRows.map( ( row ) => row.marker_to_current_keydown_ms ),
				0.5
			),
			marker_action_duration_p50_ms: quantile(
				markerActionDurations,
				0.5
			),
			intervention_duration_p50_ms: quantile(
				groupRows.map( ( row ) => row.intervention_duration_ms ),
				0.5
			),
			intervention_to_current_keydown_p50_ms: quantile(
				groupRows.map(
					( row ) => row.intervention_to_current_keydown_ms
				),
				0.5
			),
			intervention_end_to_current_keydown_p50_ms: quantile(
				groupRows.map(
					( row ) => row.intervention_end_to_current_keydown_ms
				),
				0.5
			),
			marker_inclusive_latency_p50_ms: quantile(
				markerInclusiveLatencies,
				0.5
			),
			intervention_inclusive_latency_p50_ms: quantile(
				interventionInclusiveLatencies,
				0.5
			),
			marker_inclusive_latency_p10_ms: quantile(
				markerInclusiveLatencies,
				0.1
			),
			marker_inclusive_latency_p90_ms: quantile(
				markerInclusiveLatencies,
				0.9
			),
			current_keydown_persistent_count: groupRows.filter(
				( row ) => row.current_keydown_is_persistent
			).length,
			current_keydown_typing_count: groupRows.filter(
				( row ) => row.current_keydown_is_typing
			).length,
		};
	} );
}

function clusterEventListenerEvents( events, gapMs = 200 ) {
	const sorted = events
		.slice()
		.sort( ( left, right ) => left.startedAtMs - right.startedAtMs );
	const clusters = [];

	for ( const event of sorted ) {
		const last = clusters[ clusters.length - 1 ];
		if ( ! last || event.startedAtMs - last.lastStartedAtMs > gapMs ) {
			clusters.push( {
				events: [],
				startedAtMs: event.startedAtMs,
				lastStartedAtMs: event.startedAtMs,
			} );
		}

		const current = clusters[ clusters.length - 1 ];
		current.events.push( event );
		current.lastStartedAtMs = event.startedAtMs;
	}

	return clusters;
}

function listenerProbeLabel( event ) {
	const source = event.listenerSource || '';
	const stack = event.registrationStack || '';

	if ( source.includes( 'rich-text.onInput.total' ) ) {
		return 'rich-text.onInput.total';
	}
	if ( source.includes( '__unstableAllowPrefixTransf' ) ) {
		return 'rich-text input transform listener';
	}
	if ( source.includes( 'for(let i of o.current)i(n)' ) ) {
		return 'block-editor merged input refs';
	}
	if ( source.includes( '[native code]' ) && stack.includes( 'react-dom' ) ) {
		return event.capture
			? 'React delegated listener, capture'
			: 'React delegated listener, bubble';
	}
	if ( source.includes( 'removeEventListener("selectionchange"' ) ) {
		return 'rich-text cleanup listener';
	}

	return `${ event.listenerName || '(anonymous)' }: ${ source
		.replace( /\s+/g, ' ' )
		.slice( 0, 80 ) }`;
}

function buildListenerProbeRows( probeRuns ) {
	const eventTypes = [
		'keydown',
		'keypress',
		'beforeinput',
		'input',
		'keyup',
	];
	const sampleRowsForProbe = [];
	const listenerRowsForProbe = [];

	for ( const run of probeRuns ) {
		for ( const summary of run.data.delayRunSummaries ) {
			const records = run.data.records
				.filter(
					( record ) =>
						record.delayMs === summary.delayMs &&
						record.round === summary.round &&
						record.editorSetupIndex === summary.editorSetupIndex &&
						! record.isThrowaway
				)
				.sort(
					( left, right ) => left.sampleIndex - right.sampleIndex
				);

			for ( const type of eventTypes ) {
				const events = ( summary.eventListenerEvents || [] ).filter(
					( event ) =>
						event.windowName === 'editor-canvas' &&
						event.type === type
				);
				const clusters = clusterEventListenerEvents( events ).slice(
					1,
					records.length + 1
				);

				clusters.forEach( ( cluster, index ) => {
					sampleRowsForProbe.push( {
						run_id: run.runId,
						trace_type: run.traceType,
						intervention: run.intervention,
						json_path: path.relative( repoRoot, run.jsonPath ),
						delay_ms: summary.delayMs,
						round: summary.round,
						event_type: type,
						occurrence_index: index,
						listener_count: cluster.events.length,
						listener_duration_ms: cluster.events.reduce(
							( total, event ) => total + event.durationMs,
							0
						),
						latency_ms: records[ index ]?.latencyMs,
						keydown_ms: records[ index ]?.keydownMs,
						keypress_ms: records[ index ]?.keypressMs,
						keyup_ms: records[ index ]?.keyupMs,
					} );

					for ( const event of cluster.events ) {
						listenerRowsForProbe.push( {
							run_id: run.runId,
							trace_type: run.traceType,
							intervention: run.intervention,
							json_path: path.relative( repoRoot, run.jsonPath ),
							delay_ms: summary.delayMs,
							round: summary.round,
							event_type: type,
							occurrence_index: index,
							listener_label: listenerProbeLabel( event ),
							window_name: event.windowName,
							current_target_label: event.currentTargetLabel,
							event_target_label: event.eventTargetLabel,
							capture: event.capture,
							listener_name: event.listenerName,
							listener_source: event.listenerSource,
							registration_stack: event.registrationStack,
							duration_ms: event.durationMs,
						} );
					}
				} );
			}
		}
	}

	return { sampleRowsForProbe, listenerRowsForProbe };
}

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

const {
	sampleRowsForProbe: listenerProbeSampleRows,
	listenerRowsForProbe: listenerProbeListenerRows,
} = buildListenerProbeRows( loadedListenerProbeRuns );

const listenerProbeSummaryRows = Array.from(
	groupedBy(
		listenerProbeSampleRows,
		( row ) => `${ row.run_id }\t${ row.delay_ms }\t${ row.event_type }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		run_id: first.run_id,
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		event_type: first.event_type,
		n: rows.length,
		listener_count_p50: quantile(
			rows.map( ( row ) => row.listener_count ),
			0.5
		),
		listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.listener_duration_ms ),
			0.5
		),
		latency_p50_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
			0.5
		),
		keydown_p50_ms: quantile(
			rows.map( ( row ) => row.keydown_ms ),
			0.5
		),
		keypress_p50_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.5
		),
		keyup_p50_ms: quantile(
			rows.map( ( row ) => row.keyup_ms ),
			0.5
		),
	};
} );

const listenerProbeInputListenerSummaryRows = Array.from(
	groupedBy(
		listenerProbeListenerRows.filter(
			( row ) => row.event_type === 'input'
		),
		( row ) => `${ row.run_id }\t${ row.delay_ms }\t${ row.listener_label }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	const rowsByOccurrence = groupedBy(
		rows,
		( row ) => `${ row.round }\t${ row.occurrence_index }`
	);
	const occurrenceDurations = Array.from( rowsByOccurrence.values() ).map(
		( occurrenceRows ) =>
			occurrenceRows.reduce(
				( total, row ) => total + row.duration_ms,
				0
			)
	);

	return {
		run_id: first.run_id,
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		listener_label: first.listener_label,
		n: occurrenceDurations.length,
		duration_p50_ms: quantile( occurrenceDurations, 0.5 ),
		duration_p90_ms: quantile( occurrenceDurations, 0.9 ),
		listener_source: first.listener_source,
		registration_stack: first.registration_stack,
	};
} );

const pairedRows = buildPairedRows( loadedRuns );
const pairedSummaryRows = buildPairedSummaryRows( pairedRows );
const timeoutRewritePairedRows = buildPairedRows( loadedTimeoutRewriteRuns );
const timeoutRewritePairedSummaryRows = buildPairedSummaryRows(
	timeoutRewritePairedRows
);
const markerGapDensePairedRows = buildPairedRows( loadedMarkerGapDenseRuns );
const markerGapDensePairedSummaryRows = buildPairedSummaryRows(
	markerGapDensePairedRows
);
const fixedHoldTimerRewritePairedRows = buildPairedRows(
	loadedFixedHoldTimerRewriteRuns
);
const fixedHoldTimerRewritePairedSummaryRows = buildPairedSummaryRows(
	fixedHoldTimerRewritePairedRows
);
const taskEndProximityPairedRows = buildPairedRows(
	loadedTaskEndProximityRuns
);
const taskEndProximityPairedSummaryRows = buildPairedSummaryRows(
	taskEndProximityPairedRows
);

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
						'stopTyping',
						'startTyping',
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

function sumSpanDuration( spans, predicate ) {
	return spans
		.filter( predicate )
		.reduce( ( sum, span ) => sum + ( span.durationMs || 0 ), 0 );
}

function countSpans( spans, predicate ) {
	return spans.filter( predicate ).length;
}

function maxListenerCount( spans, predicate ) {
	const listenerCounts = spans
		.filter( predicate )
		.map( ( span ) => span.metadata?.listenerCount )
		.filter( ( value ) => Number.isFinite( value ) );
	return listenerCounts.length ? Math.max( ...listenerCounts ) : null;
}

function maxFinite( values ) {
	const finiteValues = values.filter( ( value ) => Number.isFinite( value ) );
	return finiteValues.length ? Math.max( ...finiteValues ) : null;
}

function sumFirst( values, count ) {
	return values.slice( 0, count ).reduce( ( sum, value ) => sum + value, 0 );
}

function reduxListenerDistribution( spans, predicate ) {
	const listenerSpans = spans.filter( predicate );
	const durations = listenerSpans
		.map( ( span ) => span.durationMs || 0 )
		.sort( ( left, right ) => right - left );

	return {
		count: listenerSpans.length,
		nonzeroCount: durations.filter( ( duration ) => duration > 0 ).length,
		top1DurationMs: sumFirst( durations, 1 ),
		top10DurationMs: sumFirst( durations, 10 ),
		top100DurationMs: sumFirst( durations, 100 ),
		allDurationMs: durations.reduce(
			( sum, duration ) => sum + duration,
			0
		),
	};
}

function durationBinMs( durationMs ) {
	return Math.round( ( durationMs || 0 ) * 10 ) / 10;
}

function pairedChildSpanStats( parentSpans, childSpans, childPredicate ) {
	const sortedParents = [ ...parentSpans ].sort(
		( left, right ) => left.startedAtMs - right.startedAtMs
	);
	const sortedChildren = [ ...childSpans ]
		.filter( childPredicate )
		.sort( ( left, right ) => left.startedAtMs - right.startedAtMs );
	const childrenByParent = new Map();
	let childStartIndex = 0;

	for ( const parent of sortedParents ) {
		const parentStart = parent.startedAtMs;
		const parentStop = parentStart + ( parent.durationMs || 0 ) + 0.0001;
		while (
			sortedChildren[ childStartIndex ] &&
			sortedChildren[ childStartIndex ].startedAtMs < parentStart - 0.0001
		) {
			childStartIndex++;
		}

		let childIndex = childStartIndex;
		while (
			sortedChildren[ childIndex ] &&
			sortedChildren[ childIndex ].startedAtMs <= parentStop
		) {
			const child = sortedChildren[ childIndex ];
			if (
				child.startedAtMs >= parentStart &&
				child.depth === parent.depth + 1
			) {
				childrenByParent.set( parent, child );
				childStartIndex = childIndex + 1;
				break;
			}
			childIndex++;
		}
	}

	return childrenByParent;
}

function pausedWrapperStats( spans ) {
	const listenerSpans = spans.filter(
		( span ) =>
			span.name === 'data.reduxStore.listener' &&
			span.metadata?.storeName === 'core/block-editor'
	);
	const childByListener = pairedChildSpanStats(
		listenerSpans,
		spans,
		( span ) =>
			span.name === 'data.emitter.emit' &&
			span.metadata?.storeName === 'core/block-editor' &&
			span.metadata?.isPaused === true
	);
	const binCounts = new Map();
	const addBin = ( component, durationMs ) => {
		const key = `${ component }\t${ durationBinMs( durationMs ) }`;
		binCounts.set( key, ( binCounts.get( key ) || 0 ) + 1 );
	};

	let pausedEmitDurationMs = 0;
	let wrapperOutsideEmitDurationMs = 0;
	let wrapperNonzeroCount = 0;
	let pausedEmitNonzeroCount = 0;
	let wrapperOutsideEmitNonzeroCount = 0;

	for ( const listenerSpan of listenerSpans ) {
		const wrapperDurationMs = listenerSpan.durationMs || 0;
		const childSpan = childByListener.get( listenerSpan );
		const childDurationMs = childSpan?.durationMs || 0;
		const outsideDurationMs = Math.max(
			0,
			wrapperDurationMs - childDurationMs
		);

		pausedEmitDurationMs += childDurationMs;
		wrapperOutsideEmitDurationMs += outsideDurationMs;
		if ( wrapperDurationMs > 0 ) {
			wrapperNonzeroCount++;
		}
		if ( childDurationMs > 0 ) {
			pausedEmitNonzeroCount++;
		}
		if ( outsideDurationMs > 0 ) {
			wrapperOutsideEmitNonzeroCount++;
		}

		addBin( 'Redux listener wrapper', wrapperDurationMs );
		addBin( 'paused emitter.emit child', childDurationMs );
		addBin( 'wrapper outside emitter.emit', outsideDurationMs );
	}

	return {
		listener_count: listenerSpans.length,
		paused_emit_child_count: childByListener.size,
		paused_emit_child_coverage:
			listenerSpans.length === 0
				? null
				: childByListener.size / listenerSpans.length,
		listener_duration_ms: listenerSpans.reduce(
			( sum, span ) => sum + ( span.durationMs || 0 ),
			0
		),
		paused_emit_child_duration_ms: pausedEmitDurationMs,
		wrapper_outside_emit_duration_ms: wrapperOutsideEmitDurationMs,
		listener_nonzero_count: wrapperNonzeroCount,
		paused_emit_child_nonzero_count: pausedEmitNonzeroCount,
		wrapper_outside_emit_nonzero_count: wrapperOutsideEmitNonzeroCount,
		bin_rows: Array.from( binCounts.entries() ).map( ( [ key, count ] ) => {
			const [ component, durationBin ] = key.split( '\t' );
			return {
				component,
				duration_bin_ms: Number( durationBin ),
				count,
			};
		} ),
	};
}

function modeCountsText( values ) {
	const counts = new Map();
	for ( const value of values ) {
		const key = value || '(missing)';
		counts.set( key, ( counts.get( key ) || 0 ) + 1 );
	}
	return Array.from( counts.entries() )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.map( ( [ value, count ] ) => `${ value }:${ count }` )
		.join( '; ' );
}

function inputEventsForSummary( summary ) {
	return ( summary.browserEvents || [] ).filter(
		( event ) =>
			event.documentName === 'editor-canvas' && event.type === 'input'
	);
}

function recordForInputSample( run, summary, sampleIndex ) {
	return ( run.data.records || [] ).find(
		( record ) =>
			record.round === summary.round &&
			record.delayMs === summary.delayMs &&
			record.editorSetupIndex === summary.editorSetupIndex &&
			record.sampleIndex === sampleIndex
	);
}

function firstRootBatchAfterInput( spans, inputEvent ) {
	return spans
		.filter(
			( span ) =>
				span.name === 'data.registry.batch.total' &&
				span.depth === 0 &&
				span.startedAtMs >= inputEvent.nowMs - 1 &&
				span.startedAtMs < inputEvent.nowMs + 10
		)
		.sort( ( left, right ) => left.startedAtMs - right.startedAtMs )[ 0 ];
}

function spansInWindow( spans, startMs, stopMs ) {
	return spans.filter(
		( span ) => span.startedAtMs >= startMs && span.startedAtMs <= stopMs
	);
}

function spansStartedInWindow( spans, startMs, stopMs ) {
	return spans.filter(
		( span ) =>
			span.startedAtMs >= startMs && span.startedAtMs < stopMs - 0.0001
	);
}

function firstBlockEditorActionInWindow(
	dataEvents,
	actionName,
	startMs,
	stopMs
) {
	return dataEvents.find(
		( event ) =>
			event.storeName === 'core/block-editor' &&
			event.actionName === actionName &&
			event.nowMs >= startMs &&
			event.nowMs < stopMs
	);
}

function actionStartedSpans( spans, action ) {
	if ( ! action ) {
		return [];
	}
	return spansStartedInWindow(
		spans,
		action.nowMs,
		action.nowMs + ( action.durationMs || 0 )
	);
}

function ensureReduxListenerOwnerGroup( groups, base, owner ) {
	const key = [
		base.run_id,
		base.intervention,
		base.window_kind,
		base.sample_id,
		ownerKey( owner ),
	].join( '\t' );

	if ( ! groups.has( key ) ) {
		groups.set( key, {
			...base,
			owner_script: owner.ownerScript,
			owner_frame: owner.ownerFrame,
			source_path: owner.sourcePath,
			source_line: owner.sourceLine,
			source_column: owner.sourceColumn,
			source_name: owner.sourceName,
			source_snippet: owner.sourceSnippet,
			has_use_select_owner: owner.hasUseSelectOwner,
			use_select_ids: new Set(),
			listener_count: 0,
			listener_duration_ms: 0,
		} );
	}

	return groups.get( key );
}

function addReduxListenerOwnerSpan( groups, base, metadataById, span ) {
	if (
		span.name !== 'data.reduxStore.listener' ||
		span.metadata?.storeName !== 'core/block-editor'
	) {
		return;
	}

	const owner = ownerForUseSelectSpan( metadataById, span );
	const group = ensureReduxListenerOwnerGroup( groups, base, owner );

	if ( span.metadata?.useSelectId ) {
		group.use_select_ids.add(
			`${ span.windowName }:${ span.metadata.useSelectId }`
		);
	}
	group.listener_count++;
	group.listener_duration_ms += span.durationMs || 0;
}

function compactReduxListenerOwnerRows( groups ) {
	return Array.from( groups.values() ).map( ( row ) => ( {
		...row,
		use_select_instances: row.use_select_ids.size,
		use_select_ids: undefined,
	} ) );
}

function summarizeReduxListenerOwnerRows( rows ) {
	return Array.from(
		groupedBy( rows, ( row ) =>
			[
				row.intervention,
				row.window_kind,
				row.source_path,
				row.source_line,
				row.source_column,
				row.source_name,
				row.source_snippet,
			].join( '\t' )
		).entries()
	).map( ( [ , ownerRows ] ) => {
		const first = ownerRows[ 0 ];
		return {
			trace_type: first.trace_type,
			intervention: first.intervention,
			window_kind: first.window_kind,
			owner_script: first.owner_script,
			owner_frame: first.owner_frame,
			source_path: first.source_path,
			source_line: first.source_line,
			source_column: first.source_column,
			source_name: first.source_name,
			source_snippet: first.source_snippet,
			n_windows: ownerRows.length,
			use_select_instances_max: maxFinite(
				ownerRows.map( ( row ) => row.use_select_instances )
			),
			listener_count_p50: quantile(
				ownerRows.map( ( row ) => row.listener_count ),
				0.5
			),
			listener_duration_p50_ms: quantile(
				ownerRows.map( ( row ) => row.listener_duration_ms ),
				0.5
			),
			listener_duration_p90_ms: quantile(
				ownerRows.map( ( row ) => row.listener_duration_ms ),
				0.9
			),
			listener_duration_sum_ms: ownerRows.reduce(
				( sum, row ) => sum + row.listener_duration_ms,
				0
			),
		};
	} );
}

function buildReduxListenerOwnerDiffRows(
	ownerSummaryRows,
	baselineIntervention = 'normal marker'
) {
	const rowKey = ( row ) =>
		[
			row.window_kind,
			row.source_path,
			row.source_line,
			row.source_column,
			row.source_name,
			row.source_snippet,
		].join( '\t' );
	const baselineRowsByKey = new Map(
		ownerSummaryRows
			.filter( ( row ) => row.intervention === baselineIntervention )
			.map( ( row ) => [ rowKey( row ), row ] )
	);

	return ownerSummaryRows
		.filter( ( row ) => row.intervention !== baselineIntervention )
		.map( ( row ) => {
			const baseline = baselineRowsByKey.get( rowKey( row ) );
			return {
				trace_type: row.trace_type,
				window_kind: row.window_kind,
				comparison: `${ row.intervention } minus ${ baselineIntervention }`,
				intervention: row.intervention,
				baseline_intervention: baselineIntervention,
				owner_script: row.owner_script,
				owner_frame: row.owner_frame,
				source_path: row.source_path,
				source_line: row.source_line,
				source_column: row.source_column,
				source_name: row.source_name,
				source_snippet: row.source_snippet,
				intervention_listener_duration_p50_ms:
					row.listener_duration_p50_ms,
				baseline_listener_duration_p50_ms:
					baseline?.listener_duration_p50_ms ?? 0,
				diff_listener_duration_p50_ms:
					row.listener_duration_p50_ms -
					( baseline?.listener_duration_p50_ms ?? 0 ),
				intervention_listener_count_p50: row.listener_count_p50,
				baseline_listener_count_p50: baseline?.listener_count_p50 ?? 0,
				diff_listener_count_p50:
					row.listener_count_p50 -
					( baseline?.listener_count_p50 ?? 0 ),
			};
		} );
}

const allSpanActionRows = loadedAllDataSpanRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.flatMap( ( summary ) => {
		const spans = summary.dataSpanEvents || [];
		return ( summary.dataEvents || [] )
			.filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					[
						'__unstableMarkLastChangeAsPersistent',
						'__unstableMarkNextChangeAsNotPersistent',
						'updateBlockAttributes',
					].includes( event.actionName )
			)
			.map( ( action, actionIndex ) => {
				const actionStart = action.nowMs;
				const actionStop = action.nowMs + action.durationMs;
				const actionSpans = spans.filter(
					( span ) =>
						span.startedAtMs >= actionStart &&
						span.startedAtMs <= actionStop
				);
				const blockEditorRootSubscribe = ( span ) =>
					span.name === 'data.reduxStore.rootSubscribe' &&
					span.metadata?.storeName === 'core/block-editor';
				const blockEditorReduxListener = ( span ) =>
					span.name === 'data.reduxStore.listener' &&
					span.metadata?.storeName === 'core/block-editor';
				const useBlockSyncUpdateParent = ( span ) =>
					span.name === 'block-editor.useBlockSync.updateParent';
				const updateParentSpans = actionSpans.filter(
					useBlockSyncUpdateParent
				);

				return {
					run_id: run.runId,
					trace_type: run.traceType,
					intervention: run.intervention,
					delay_ms: summary.delayMs,
					round: summary.round,
					action_name: action.actionName,
					action_index: actionIndex,
					action_duration_ms: action.durationMs,
					span_count: actionSpans.length,
					block_editor_listener_count: maxListenerCount(
						actionSpans,
						blockEditorRootSubscribe
					),
					root_subscribe_count: countSpans(
						actionSpans,
						blockEditorRootSubscribe
					),
					root_subscribe_duration_ms: sumSpanDuration(
						actionSpans,
						blockEditorRootSubscribe
					),
					redux_listener_count: countSpans(
						actionSpans,
						blockEditorReduxListener
					),
					redux_listener_duration_ms: sumSpanDuration(
						actionSpans,
						blockEditorReduxListener
					),
					use_select_on_change_count: countSpans(
						actionSpans,
						( span ) => span.name === 'data.useSelect.onChange'
					),
					use_select_on_change_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) => span.name === 'data.useSelect.onChange'
					),
					use_select_on_store_change_count: countSpans(
						actionSpans,
						( span ) => span.name === 'data.useSelect.onStoreChange'
					),
					use_select_on_store_change_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) => span.name === 'data.useSelect.onStoreChange'
					),
					use_select_react_listener_count: countSpans(
						actionSpans,
						( span ) => span.name === 'data.useSelect.reactListener'
					),
					use_select_react_listener_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) => span.name === 'data.useSelect.reactListener'
					),
					use_select_map_select_count: countSpans(
						actionSpans,
						( span ) => span.name === 'data.useSelect.mapSelect'
					),
					use_select_map_select_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) => span.name === 'data.useSelect.mapSelect'
					),
					use_select_render_queue_add_count: countSpans(
						actionSpans,
						( span ) =>
							span.name === 'data.useSelect.renderQueueAdd'
					),
					use_select_render_queue_add_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) =>
							span.name === 'data.useSelect.renderQueueAdd'
					),
					registry_batch_total_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) => span.name === 'data.registry.batch.total'
					),
					use_block_sync_batch_duration_ms: sumSpanDuration(
						actionSpans,
						( span ) =>
							span.name ===
							'block-editor.useBlockSync.registryBatch'
					),
					use_block_sync_update_parent_count:
						updateParentSpans.length,
					use_block_sync_update_parent_duration_ms:
						updateParentSpans.reduce(
							( sum, span ) => sum + ( span.durationMs || 0 ),
							0
						),
					use_block_sync_did_persistence_change_count:
						updateParentSpans.filter(
							( span ) =>
								span.metadata?.didPersistenceChange === true
						).length,
					use_block_sync_on_change_count: updateParentSpans.filter(
						( span ) => span.metadata?.updateParent === 'onChange'
					).length,
					use_block_sync_on_input_count: updateParentSpans.filter(
						( span ) => span.metadata?.updateParent === 'onInput'
					).length,
				};
			} );
	} )
);

const allSpanActionSummaryRows = Array.from(
	groupedBy(
		allSpanActionRows,
		( row ) => `${ row.intervention }\t${ row.action_name }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		action_name: first.action_name,
		n: rows.length,
		action_duration_p50_ms: quantile(
			rows.map( ( row ) => row.action_duration_ms ),
			0.5
		),
		span_count_p50: quantile(
			rows.map( ( row ) => row.span_count ),
			0.5
		),
		block_editor_listener_count_max: maxFinite(
			rows.map( ( row ) => row.block_editor_listener_count )
		),
		root_subscribe_duration_p50_ms: quantile(
			rows.map( ( row ) => row.root_subscribe_duration_ms ),
			0.5
		),
		redux_listener_count_p50: quantile(
			rows.map( ( row ) => row.redux_listener_count ),
			0.5
		),
		use_select_on_change_count_p50: quantile(
			rows.map( ( row ) => row.use_select_on_change_count ),
			0.5
		),
		use_select_on_store_change_count_p50: quantile(
			rows.map( ( row ) => row.use_select_on_store_change_count ),
			0.5
		),
		use_select_on_store_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_on_store_change_duration_ms ),
			0.5
		),
		use_select_react_listener_count_p50: quantile(
			rows.map( ( row ) => row.use_select_react_listener_count ),
			0.5
		),
		use_select_react_listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_react_listener_duration_ms ),
			0.5
		),
		use_select_map_select_count_p50: quantile(
			rows.map( ( row ) => row.use_select_map_select_count ),
			0.5
		),
		registry_batch_total_duration_p50_ms: quantile(
			rows.map( ( row ) => row.registry_batch_total_duration_ms ),
			0.5
		),
		use_block_sync_update_parent_count_p50: quantile(
			rows.map( ( row ) => row.use_block_sync_update_parent_count ),
			0.5
		),
		use_block_sync_update_parent_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_block_sync_update_parent_duration_ms ),
			0.5
		),
		use_block_sync_did_persistence_change_count_sum: rows.reduce(
			( sum, row ) =>
				sum + row.use_block_sync_did_persistence_change_count,
			0
		),
	};
} );

const allSpanInputBatchRows = loadedAllDataSpanRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.flatMap( ( summary ) => {
		const spans = summary.dataSpanEvents || [];
		const dataEvents = summary.dataEvents || [];
		const inputs = inputEventsForSummary( summary );

		return inputs.map( ( inputEvent, sampleIndex ) => {
			const record = recordForInputSample( run, summary, sampleIndex );
			const previousInputEvent = inputs[ sampleIndex - 1 ];
			const previousInputMs =
				previousInputEvent?.nowMs ?? summary.runStartedAtBrowserNowMs;
			const markerActionsBeforeInput = dataEvents.filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					[
						'__unstableMarkLastChangeAsPersistent',
						'__unstableMarkNextChangeAsNotPersistent',
					].includes( event.actionName ) &&
					event.nowMs >= previousInputMs &&
					event.nowMs < inputEvent.nowMs
			);
			const markerSpansBeforeInput = markerActionsBeforeInput.flatMap(
				( action ) =>
					spansInWindow(
						spans,
						action.nowMs,
						action.nowMs + action.durationMs
					)
			);
			const markerUpdateParentSpans = markerSpansBeforeInput.filter(
				( span ) =>
					span.name === 'block-editor.useBlockSync.updateParent'
			);
			const markerBeforeInputDurationMs = markerActionsBeforeInput.reduce(
				( sum, event ) => sum + ( event.durationMs || 0 ),
				0
			);
			const rootBatch = firstRootBatchAfterInput( spans, inputEvent );
			const batchSpans = rootBatch
				? spansInWindow(
						spans,
						rootBatch.startedAtMs,
						rootBatch.startedAtMs + rootBatch.durationMs
				  )
				: [];
			const outerBatchChild = ( span, name ) =>
				rootBatch &&
				span.name === name &&
				span.depth === rootBatch.depth + 1;
			const blockEditorRootSubscribe = ( span ) =>
				span.name === 'data.reduxStore.rootSubscribe' &&
				span.metadata?.storeName === 'core/block-editor';
			const blockEditorReduxListener = ( span ) =>
				span.name === 'data.reduxStore.listener' &&
				span.metadata?.storeName === 'core/block-editor';
			const blockEditorEmitterListener = ( span ) =>
				span.name === 'data.emitter.listener' &&
				span.metadata?.storeName === 'core/block-editor';
			const blockEditorEmitterEmit = ( span ) =>
				span.name === 'data.emitter.emit' &&
				span.metadata?.storeName === 'core/block-editor';
			const pausedBlockEditorEmitterEmit = ( span ) =>
				blockEditorEmitterEmit( span ) &&
				span.metadata?.isPaused === true;
			const blockEditorEmitterNotify = ( span ) =>
				span.name === 'data.emitter.notifyListeners' &&
				span.metadata?.storeName === 'core/block-editor';
			const blockEditorResumeStore = ( span ) =>
				outerBatchChild( span, 'data.registry.batch.resumeStore' ) &&
				span.metadata?.storeName === 'core/block-editor';
			const updateParentSpans = batchSpans.filter(
				( span ) =>
					span.name === 'block-editor.useBlockSync.updateParent'
			);
			const primaryUpdateParent = updateParentSpans[ 0 ];
			const batchStartedAtMs = rootBatch?.startedAtMs ?? inputEvent.nowMs;
			const batchStoppedAtMs = rootBatch
				? rootBatch.startedAtMs + rootBatch.durationMs
				: inputEvent.nowMs + 80;
			const selectionChangeAction = firstBlockEditorActionInWindow(
				dataEvents,
				'selectionChange',
				batchStartedAtMs - 1,
				batchStoppedAtMs + 1
			);
			const updateBlockAction = firstBlockEditorActionInWindow(
				dataEvents,
				'updateBlockAttributes',
				inputEvent.nowMs - 1,
				batchStoppedAtMs + 1
			);
			const selectionChangeSpans = actionStartedSpans(
				spans,
				selectionChangeAction
			);
			const updateBlockActionSpans = actionStartedSpans(
				spans,
				updateBlockAction
			);
			const selectionReduxListeners = reduxListenerDistribution(
				selectionChangeSpans,
				blockEditorReduxListener
			);
			const updateBlockReduxListeners = reduxListenerDistribution(
				updateBlockActionSpans,
				blockEditorReduxListener
			);
			const eventsBeforeContentUpdate = updateBlockAction
				? dataEvents.filter(
						( event ) =>
							event.storeName === 'core/block-editor' &&
							event.nowMs >= inputEvent.nowMs - 5 &&
							event.nowMs < updateBlockAction.nowMs
				  )
				: [];
			const actionsBeforeContentUpdate = eventsBeforeContentUpdate
				.map( ( event ) => event.actionName )
				.join( '; ' );
			const actionsBeforeContentUpdatePersistence =
				eventsBeforeContentUpdate
					.map(
						( event ) =>
							`${ event.actionName }:${ event.after?.isPersistent }`
					)
					.join( '; ' );
			const markerRootSubscribeDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				blockEditorRootSubscribe
			);
			const markerReduxListenerDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				blockEditorReduxListener
			);
			const markerUseSelectOnChangeDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.onChange'
			);
			const markerUseSelectOnStoreChangeDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.onStoreChange'
			);
			const markerUseSelectReactListenerDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.reactListener'
			);
			const markerUseSelectMapSelectDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.mapSelect'
			);
			const markerUseSelectUpdateValueDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.updateValue'
			);
			const markerUseSelectRenderQueueAddDurationMs = sumSpanDuration(
				markerSpansBeforeInput,
				( span ) => span.name === 'data.useSelect.renderQueueAdd'
			);
			const rootSubscribeDurationMs = sumSpanDuration(
				batchSpans,
				blockEditorRootSubscribe
			);
			const reduxListenerDurationMs = sumSpanDuration(
				batchSpans,
				blockEditorReduxListener
			);
			const emitterEmitBlockEditorDurationMs = sumSpanDuration(
				batchSpans,
				blockEditorEmitterEmit
			);
			const pausedEmitterEmitBlockEditorDurationMs = sumSpanDuration(
				batchSpans,
				pausedBlockEditorEmitterEmit
			);
			const emitterNotifyBlockEditorDurationMs = sumSpanDuration(
				batchSpans,
				blockEditorEmitterNotify
			);
			const useSelectOnChangeDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.onChange'
			);
			const useSelectOnStoreChangeDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.onStoreChange'
			);
			const useSelectReactListenerDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.reactListener'
			);
			const useSelectMapSelectDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.mapSelect'
			);
			const useSelectUpdateValueDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.updateValue'
			);
			const useSelectUpdateValueInvalidCount = countSpans(
				batchSpans,
				( span ) =>
					span.name === 'data.useSelect.updateValue' &&
					span.metadata?.lastMapResultValid === false
			);
			const useSelectUpdateValueCachedCount = countSpans(
				batchSpans,
				( span ) =>
					span.name === 'data.useSelect.updateValue' &&
					span.metadata?.hasCachedMapSelect === true
			);
			const useSelectRenderQueueAddDurationMs = sumSpanDuration(
				batchSpans,
				( span ) => span.name === 'data.useSelect.renderQueueAdd'
			);

			return {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				delay_ms: summary.delayMs,
				round: summary.round,
				sample_index: sampleIndex,
				is_throwaway: !! record?.isThrowaway,
				keypress_ms: record?.keypressMs,
				latency_ms: record?.latencyMs,
				input_now_ms: inputEvent.nowMs,
				marker_before_input_count: markerActionsBeforeInput.length,
				marker_before_input_actions: markerActionsBeforeInput
					.map( ( event ) => event.actionName )
					.join( '; ' ),
				marker_before_input_duration_ms: markerBeforeInputDurationMs,
				marker_root_subscribe_duration_ms:
					markerRootSubscribeDurationMs,
				marker_redux_listener_duration_ms:
					markerReduxListenerDurationMs,
				marker_use_select_on_change_duration_ms:
					markerUseSelectOnChangeDurationMs,
				marker_use_select_on_store_change_duration_ms:
					markerUseSelectOnStoreChangeDurationMs,
				marker_use_select_react_listener_duration_ms:
					markerUseSelectReactListenerDurationMs,
				marker_use_select_map_select_duration_ms:
					markerUseSelectMapSelectDurationMs,
				marker_use_select_update_value_duration_ms:
					markerUseSelectUpdateValueDurationMs,
				marker_use_select_render_queue_add_duration_ms:
					markerUseSelectRenderQueueAddDurationMs,
				marker_update_parent_count: markerUpdateParentSpans.length,
				marker_update_parent_duration_ms:
					markerUpdateParentSpans.reduce(
						( sum, span ) => sum + ( span.durationMs || 0 ),
						0
					),
				marker_did_persistence_change_count:
					markerUpdateParentSpans.filter(
						( span ) => span.metadata?.didPersistenceChange === true
					).length,
				marker_update_parent_modes: modeCountsText(
					markerUpdateParentSpans.map(
						( span ) => span.metadata?.updateParent
					)
				),
				actions_before_content_update: actionsBeforeContentUpdate,
				actions_before_content_update_persistence:
					actionsBeforeContentUpdatePersistence,
				content_update_before_persistent:
					updateBlockAction?.before?.isPersistent,
				content_update_after_persistent:
					updateBlockAction?.after?.isPersistent,
				selection_change_before_persistent:
					selectionChangeAction?.before?.isPersistent,
				selection_change_after_persistent:
					selectionChangeAction?.after?.isPersistent,
				update_parent: primaryUpdateParent?.metadata?.updateParent,
				new_is_persistent:
					primaryUpdateParent?.metadata?.newIsPersistent,
				previous_are_blocks_different:
					primaryUpdateParent?.metadata?.previousAreBlocksDifferent,
				did_persistence_change:
					primaryUpdateParent?.metadata?.didPersistenceChange,
				batch_duration_ms: rootBatch?.durationMs,
				batch_callback_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						outerBatchChild( span, 'data.registry.batch.callback' )
				),
				selection_change_duration_ms: selectionChangeAction?.durationMs,
				selection_change_root_subscribe_duration_ms: sumSpanDuration(
					selectionChangeSpans,
					blockEditorRootSubscribe
				),
				selection_change_redux_listener_duration_ms: sumSpanDuration(
					selectionChangeSpans,
					blockEditorReduxListener
				),
				selection_change_redux_listener_nonzero_count:
					selectionReduxListeners.nonzeroCount,
				selection_change_redux_listener_top1_duration_ms:
					selectionReduxListeners.top1DurationMs,
				selection_change_redux_listener_top10_duration_ms:
					selectionReduxListeners.top10DurationMs,
				selection_change_redux_listener_top100_duration_ms:
					selectionReduxListeners.top100DurationMs,
				update_block_attributes_duration_ms:
					updateBlockAction?.durationMs,
				update_block_attributes_root_subscribe_duration_ms:
					sumSpanDuration(
						updateBlockActionSpans,
						blockEditorRootSubscribe
					),
				update_block_attributes_redux_listener_duration_ms:
					sumSpanDuration(
						updateBlockActionSpans,
						blockEditorReduxListener
					),
				update_block_attributes_redux_listener_nonzero_count:
					updateBlockReduxListeners.nonzeroCount,
				update_block_attributes_redux_listener_top1_duration_ms:
					updateBlockReduxListeners.top1DurationMs,
				update_block_attributes_redux_listener_top10_duration_ms:
					updateBlockReduxListeners.top10DurationMs,
				update_block_attributes_redux_listener_top100_duration_ms:
					updateBlockReduxListeners.top100DurationMs,
				root_subscribe_count: countSpans(
					batchSpans,
					blockEditorRootSubscribe
				),
				root_subscribe_duration_ms: rootSubscribeDurationMs,
				root_subscribe_outside_redux_listener_duration_ms: Math.max(
					0,
					rootSubscribeDurationMs - reduxListenerDurationMs
				),
				redux_listener_count: countSpans(
					batchSpans,
					blockEditorReduxListener
				),
				redux_listener_duration_ms: reduxListenerDurationMs,
				redux_listener_outside_emitter_emit_duration_ms: Math.max(
					0,
					reduxListenerDurationMs - emitterEmitBlockEditorDurationMs
				),
				resume_block_editor_duration_ms: sumSpanDuration(
					batchSpans,
					blockEditorResumeStore
				),
				emitter_listener_block_editor_count: countSpans(
					batchSpans,
					blockEditorEmitterListener
				),
				emitter_listener_block_editor_duration_ms: sumSpanDuration(
					batchSpans,
					blockEditorEmitterListener
				),
				emitter_emit_block_editor_count: countSpans(
					batchSpans,
					blockEditorEmitterEmit
				),
				emitter_emit_block_editor_duration_ms:
					emitterEmitBlockEditorDurationMs,
				paused_emitter_emit_block_editor_count: countSpans(
					batchSpans,
					pausedBlockEditorEmitterEmit
				),
				paused_emitter_emit_block_editor_duration_ms:
					pausedEmitterEmitBlockEditorDurationMs,
				emitter_notify_block_editor_count: countSpans(
					batchSpans,
					blockEditorEmitterNotify
				),
				emitter_notify_block_editor_duration_ms:
					emitterNotifyBlockEditorDurationMs,
				use_select_on_change_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.onChange'
				),
				use_select_on_change_duration_ms: useSelectOnChangeDurationMs,
				use_select_on_store_change_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.onStoreChange'
				),
				use_select_on_store_change_duration_ms:
					useSelectOnStoreChangeDurationMs,
				use_select_react_listener_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.reactListener'
				),
				use_select_react_listener_duration_ms:
					useSelectReactListenerDurationMs,
				use_select_map_select_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.mapSelect'
				),
				use_select_map_select_duration_ms: useSelectMapSelectDurationMs,
				use_select_update_value_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.updateValue'
				),
				use_select_update_value_duration_ms:
					useSelectUpdateValueDurationMs,
				use_select_update_value_invalid_count:
					useSelectUpdateValueInvalidCount,
				use_select_update_value_cached_count:
					useSelectUpdateValueCachedCount,
				use_select_render_queue_add_count: countSpans(
					batchSpans,
					( span ) => span.name === 'data.useSelect.renderQueueAdd'
				),
				use_select_render_queue_add_duration_ms:
					useSelectRenderQueueAddDurationMs,
				cycle_latency_ms:
					( record?.latencyMs || 0 ) + markerBeforeInputDurationMs,
				cycle_root_subscribe_duration_ms:
					rootSubscribeDurationMs + markerRootSubscribeDurationMs,
				cycle_redux_listener_duration_ms:
					reduxListenerDurationMs + markerReduxListenerDurationMs,
				cycle_use_select_on_change_duration_ms:
					useSelectOnChangeDurationMs +
					markerUseSelectOnChangeDurationMs,
				cycle_use_select_on_store_change_duration_ms:
					useSelectOnStoreChangeDurationMs +
					markerUseSelectOnStoreChangeDurationMs,
				cycle_use_select_react_listener_duration_ms:
					useSelectReactListenerDurationMs +
					markerUseSelectReactListenerDurationMs,
				cycle_use_select_map_select_duration_ms:
					useSelectMapSelectDurationMs +
					markerUseSelectMapSelectDurationMs,
				cycle_use_select_update_value_duration_ms:
					useSelectUpdateValueDurationMs +
					markerUseSelectUpdateValueDurationMs,
				cycle_use_select_render_queue_add_duration_ms:
					useSelectRenderQueueAddDurationMs +
					markerUseSelectRenderQueueAddDurationMs,
				direct_update_parent_duration_ms: updateParentSpans.reduce(
					( sum, span ) => sum + ( span.durationMs || 0 ),
					0
				),
				use_block_sync_registry_batch_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name === 'block-editor.useBlockSync.registryBatch'
				),
				on_input_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name ===
						'core-data.useEntityBlockEditor.onInput.total'
				),
				on_change_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name ===
						'core-data.useEntityBlockEditor.onChange.total'
				),
				edit_entity_record_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name ===
						'core-data.useEntityBlockEditor.editEntityRecord'
				),
				serialize_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name === 'core-data.useEntityBlockEditor.serialize'
				),
				create_undo_level_duration_ms: sumSpanDuration(
					batchSpans,
					( span ) =>
						span.name ===
						'core-data.useEntityBlockEditor.createUndoLevel'
				),
			};
		} );
	} )
);

const allSpanInputBatchSummaryRows = Array.from(
	groupedBy(
		allSpanInputBatchRows.filter( ( row ) => ! row.is_throwaway ),
		( row ) => row.intervention
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		n_inputs: rows.length,
		update_parent_modes: modeCountsText(
			rows.map( ( row ) => row.update_parent )
		),
		marker_before_input_count_sum: rows.reduce(
			( sum, row ) => sum + row.marker_before_input_count,
			0
		),
		marker_did_persistence_change_count_sum: rows.reduce(
			( sum, row ) => sum + row.marker_did_persistence_change_count,
			0
		),
		marker_before_input_duration_p50_ms: quantile(
			rows.map( ( row ) => row.marker_before_input_duration_ms ),
			0.5
		),
		marker_root_subscribe_duration_p50_ms: quantile(
			rows.map( ( row ) => row.marker_root_subscribe_duration_ms ),
			0.5
		),
		marker_redux_listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.marker_redux_listener_duration_ms ),
			0.5
		),
		marker_use_select_on_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.marker_use_select_on_change_duration_ms ),
			0.5
		),
		marker_use_select_on_store_change_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.marker_use_select_on_store_change_duration_ms
			),
			0.5
		),
		marker_use_select_react_listener_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.marker_use_select_react_listener_duration_ms
			),
			0.5
		),
		marker_use_select_map_select_duration_p50_ms: quantile(
			rows.map( ( row ) => row.marker_use_select_map_select_duration_ms ),
			0.5
		),
		marker_use_select_update_value_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.marker_use_select_update_value_duration_ms
			),
			0.5
		),
		marker_use_select_render_queue_add_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.marker_use_select_render_queue_add_duration_ms
			),
			0.5
		),
		keypress_p50_ms: quantile(
			rows.map( ( row ) => row.keypress_ms ),
			0.5
		),
		latency_p50_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
			0.5
		),
		cycle_latency_p50_ms: quantile(
			rows.map( ( row ) => row.cycle_latency_ms ),
			0.5
		),
		batch_duration_p50_ms: quantile(
			rows.map( ( row ) => row.batch_duration_ms ),
			0.5
		),
		batch_callback_duration_p50_ms: quantile(
			rows.map( ( row ) => row.batch_callback_duration_ms ),
			0.5
		),
		selection_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.selection_change_duration_ms ),
			0.5
		),
		selection_change_root_subscribe_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.selection_change_root_subscribe_duration_ms
			),
			0.5
		),
		selection_change_redux_listener_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.selection_change_redux_listener_duration_ms
			),
			0.5
		),
		selection_change_redux_listener_nonzero_count_p50: quantile(
			rows.map(
				( row ) => row.selection_change_redux_listener_nonzero_count
			),
			0.5
		),
		selection_change_redux_listener_top1_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.selection_change_redux_listener_top1_duration_ms
			),
			0.5
		),
		selection_change_redux_listener_top10_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.selection_change_redux_listener_top10_duration_ms
			),
			0.5
		),
		selection_change_redux_listener_top100_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.selection_change_redux_listener_top100_duration_ms
			),
			0.5
		),
		update_block_attributes_duration_p50_ms: quantile(
			rows.map( ( row ) => row.update_block_attributes_duration_ms ),
			0.5
		),
		update_block_attributes_root_subscribe_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_root_subscribe_duration_ms
			),
			0.5
		),
		update_block_attributes_redux_listener_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_redux_listener_duration_ms
			),
			0.5
		),
		update_block_attributes_redux_listener_nonzero_count_p50: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_redux_listener_nonzero_count
			),
			0.5
		),
		update_block_attributes_redux_listener_top1_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_redux_listener_top1_duration_ms
			),
			0.5
		),
		update_block_attributes_redux_listener_top10_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_redux_listener_top10_duration_ms
			),
			0.5
		),
		update_block_attributes_redux_listener_top100_duration_p50_ms: quantile(
			rows.map(
				( row ) =>
					row.update_block_attributes_redux_listener_top100_duration_ms
			),
			0.5
		),
		root_subscribe_count_p50: quantile(
			rows.map( ( row ) => row.root_subscribe_count ),
			0.5
		),
		root_subscribe_duration_p50_ms: quantile(
			rows.map( ( row ) => row.root_subscribe_duration_ms ),
			0.5
		),
		root_subscribe_outside_redux_listener_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.root_subscribe_outside_redux_listener_duration_ms
			),
			0.5
		),
		cycle_root_subscribe_duration_p50_ms: quantile(
			rows.map( ( row ) => row.cycle_root_subscribe_duration_ms ),
			0.5
		),
		redux_listener_count_p50: quantile(
			rows.map( ( row ) => row.redux_listener_count ),
			0.5
		),
		redux_listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.redux_listener_duration_ms ),
			0.5
		),
		redux_listener_outside_emitter_emit_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.redux_listener_outside_emitter_emit_duration_ms
			),
			0.5
		),
		cycle_redux_listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.cycle_redux_listener_duration_ms ),
			0.5
		),
		resume_block_editor_duration_p50_ms: quantile(
			rows.map( ( row ) => row.resume_block_editor_duration_ms ),
			0.5
		),
		emitter_listener_block_editor_count_p50: quantile(
			rows.map( ( row ) => row.emitter_listener_block_editor_count ),
			0.5
		),
		emitter_listener_block_editor_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.emitter_listener_block_editor_duration_ms
			),
			0.5
		),
		emitter_emit_block_editor_count_p50: quantile(
			rows.map( ( row ) => row.emitter_emit_block_editor_count ),
			0.5
		),
		emitter_emit_block_editor_duration_p50_ms: quantile(
			rows.map( ( row ) => row.emitter_emit_block_editor_duration_ms ),
			0.5
		),
		paused_emitter_emit_block_editor_count_p50: quantile(
			rows.map( ( row ) => row.paused_emitter_emit_block_editor_count ),
			0.5
		),
		paused_emitter_emit_block_editor_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.paused_emitter_emit_block_editor_duration_ms
			),
			0.5
		),
		emitter_notify_block_editor_count_p50: quantile(
			rows.map( ( row ) => row.emitter_notify_block_editor_count ),
			0.5
		),
		emitter_notify_block_editor_duration_p50_ms: quantile(
			rows.map( ( row ) => row.emitter_notify_block_editor_duration_ms ),
			0.5
		),
		use_select_on_change_count_p50: quantile(
			rows.map( ( row ) => row.use_select_on_change_count ),
			0.5
		),
		use_select_on_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_on_change_duration_ms ),
			0.5
		),
		cycle_use_select_on_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.cycle_use_select_on_change_duration_ms ),
			0.5
		),
		use_select_on_store_change_count_p50: quantile(
			rows.map( ( row ) => row.use_select_on_store_change_count ),
			0.5
		),
		use_select_on_store_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_on_store_change_duration_ms ),
			0.5
		),
		cycle_use_select_on_store_change_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.cycle_use_select_on_store_change_duration_ms
			),
			0.5
		),
		use_select_react_listener_count_p50: quantile(
			rows.map( ( row ) => row.use_select_react_listener_count ),
			0.5
		),
		use_select_react_listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_react_listener_duration_ms ),
			0.5
		),
		cycle_use_select_react_listener_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.cycle_use_select_react_listener_duration_ms
			),
			0.5
		),
		use_select_map_select_count_p50: quantile(
			rows.map( ( row ) => row.use_select_map_select_count ),
			0.5
		),
		use_select_map_select_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_map_select_duration_ms ),
			0.5
		),
		cycle_use_select_map_select_duration_p50_ms: quantile(
			rows.map( ( row ) => row.cycle_use_select_map_select_duration_ms ),
			0.5
		),
		use_select_update_value_count_p50: quantile(
			rows.map( ( row ) => row.use_select_update_value_count ),
			0.5
		),
		use_select_update_value_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_update_value_duration_ms ),
			0.5
		),
		use_select_update_value_invalid_count_p50: quantile(
			rows.map( ( row ) => row.use_select_update_value_invalid_count ),
			0.5
		),
		use_select_update_value_cached_count_p50: quantile(
			rows.map( ( row ) => row.use_select_update_value_cached_count ),
			0.5
		),
		cycle_use_select_update_value_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.cycle_use_select_update_value_duration_ms
			),
			0.5
		),
		use_select_render_queue_add_count_p50: quantile(
			rows.map( ( row ) => row.use_select_render_queue_add_count ),
			0.5
		),
		use_select_render_queue_add_duration_p50_ms: quantile(
			rows.map( ( row ) => row.use_select_render_queue_add_duration_ms ),
			0.5
		),
		cycle_use_select_render_queue_add_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.cycle_use_select_render_queue_add_duration_ms
			),
			0.5
		),
		direct_update_parent_duration_p50_ms: quantile(
			rows.map( ( row ) => row.direct_update_parent_duration_ms ),
			0.5
		),
		use_block_sync_registry_batch_duration_p50_ms: quantile(
			rows.map(
				( row ) => row.use_block_sync_registry_batch_duration_ms
			),
			0.5
		),
		on_input_duration_p50_ms: quantile(
			rows.map( ( row ) => row.on_input_duration_ms ),
			0.5
		),
		on_change_duration_p50_ms: quantile(
			rows.map( ( row ) => row.on_change_duration_ms ),
			0.5
		),
		edit_entity_record_duration_p50_ms: quantile(
			rows.map( ( row ) => row.edit_entity_record_duration_ms ),
			0.5
		),
		serialize_duration_p50_ms: quantile(
			rows.map( ( row ) => row.serialize_duration_ms ),
			0.5
		),
		create_undo_level_duration_p50_ms: quantile(
			rows.map( ( row ) => row.create_undo_level_duration_ms ),
			0.5
		),
	};
} );

const pausedWrapperSampleRows = [];
const pausedWrapperBinRows = [];
for ( const run of loadedAllDataSpanRuns ) {
	for ( const summary of run.data.delayRunSummaries ) {
		const spans = summary.dataSpanEvents || [];
		const inputs = inputEventsForSummary( summary );
		for ( const [ sampleIndex, inputEvent ] of inputs.entries() ) {
			const record = recordForInputSample( run, summary, sampleIndex );
			if ( record?.isThrowaway ) {
				continue;
			}
			const rootBatch = firstRootBatchAfterInput( spans, inputEvent );
			if ( ! rootBatch ) {
				continue;
			}
			const batchSpans = spansInWindow(
				spans,
				rootBatch.startedAtMs,
				rootBatch.startedAtMs + rootBatch.durationMs
			);
			const stats = pausedWrapperStats( batchSpans );
			const base = {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				delay_ms: summary.delayMs,
				round: summary.round,
				sample_index: sampleIndex,
			};
			pausedWrapperSampleRows.push( {
				...base,
				listener_count: stats.listener_count,
				paused_emit_child_count: stats.paused_emit_child_count,
				paused_emit_child_coverage: stats.paused_emit_child_coverage,
				listener_duration_ms: stats.listener_duration_ms,
				paused_emit_child_duration_ms:
					stats.paused_emit_child_duration_ms,
				wrapper_outside_emit_duration_ms:
					stats.wrapper_outside_emit_duration_ms,
				listener_nonzero_count: stats.listener_nonzero_count,
				paused_emit_child_nonzero_count:
					stats.paused_emit_child_nonzero_count,
				wrapper_outside_emit_nonzero_count:
					stats.wrapper_outside_emit_nonzero_count,
			} );

			for ( const binRow of stats.bin_rows ) {
				pausedWrapperBinRows.push( {
					...base,
					...binRow,
				} );
			}
		}
	}
}

const pausedWrapperSummaryRows = Array.from(
	groupedBy( pausedWrapperSampleRows, ( row ) => row.intervention ).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		n_inputs: rows.length,
		listener_count_p50: quantile(
			rows.map( ( row ) => row.listener_count ),
			0.5
		),
		paused_emit_child_count_p50: quantile(
			rows.map( ( row ) => row.paused_emit_child_count ),
			0.5
		),
		paused_emit_child_coverage_p50: quantile(
			rows.map( ( row ) => row.paused_emit_child_coverage ),
			0.5
		),
		listener_duration_p50_ms: quantile(
			rows.map( ( row ) => row.listener_duration_ms ),
			0.5
		),
		paused_emit_child_duration_p50_ms: quantile(
			rows.map( ( row ) => row.paused_emit_child_duration_ms ),
			0.5
		),
		wrapper_outside_emit_duration_p50_ms: quantile(
			rows.map( ( row ) => row.wrapper_outside_emit_duration_ms ),
			0.5
		),
		listener_nonzero_count_p50: quantile(
			rows.map( ( row ) => row.listener_nonzero_count ),
			0.5
		),
		paused_emit_child_nonzero_count_p50: quantile(
			rows.map( ( row ) => row.paused_emit_child_nonzero_count ),
			0.5
		),
		wrapper_outside_emit_nonzero_count_p50: quantile(
			rows.map( ( row ) => row.wrapper_outside_emit_nonzero_count ),
			0.5
		),
	};
} );

const pausedWrapperBinSummaryRows = Array.from(
	groupedBy(
		pausedWrapperBinRows,
		( row ) =>
			`${ row.intervention }\t${ row.component }\t${ row.duration_bin_ms }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		component: first.component,
		duration_bin_ms: first.duration_bin_ms,
		n_inputs: rows.length,
		count_p50: quantile(
			rows.map( ( row ) => row.count ),
			0.5
		),
		count_sum: rows.reduce( ( sum, row ) => sum + row.count, 0 ),
	};
} );

const allSpanUseSelectMetadataByRun = new Map(
	loadedAllDataSpanRuns.map( ( run ) => [
		run.runId,
		useSelectMetadataById( run ),
	] )
);

const allSpanInputOwnerGroups = new Map();
for ( const run of loadedAllDataSpanRuns ) {
	const metadataById = allSpanUseSelectMetadataByRun.get( run.runId );
	for ( const summary of run.data.delayRunSummaries ) {
		const spans = summary.dataSpanEvents || [];
		const inputs = inputEventsForSummary( summary );
		for ( const [ sampleIndex, inputEvent ] of inputs.entries() ) {
			const record = recordForInputSample( run, summary, sampleIndex );
			if ( record?.isThrowaway ) {
				continue;
			}
			const rootBatch = firstRootBatchAfterInput( spans, inputEvent );
			if ( ! rootBatch ) {
				continue;
			}
			const batchSpans = spansInWindow(
				spans,
				rootBatch.startedAtMs,
				rootBatch.startedAtMs + rootBatch.durationMs
			);
			const base = {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				window_kind: 'next input registry.batch',
				delay_ms: summary.delayMs,
				round: summary.round,
				sample_id: `${ summary.round }:${ sampleIndex }`,
				sample_index: sampleIndex,
			};

			for ( const span of batchSpans ) {
				if ( ! span.name.startsWith( 'data.useSelect.' ) ) {
					continue;
				}
				addUseSelectOwnerSpan(
					allSpanInputOwnerGroups,
					base,
					metadataById,
					span
				);
			}

			for ( const span of batchSpans ) {
				if (
					span.name !== 'data.emitter.listener' ||
					span.metadata?.storeName !== 'core/block-editor'
				) {
					continue;
				}
				addOuterListenerOwnerSpan(
					allSpanInputOwnerGroups,
					base,
					metadataById,
					span,
					firstUseSelectOnChangeInsideListener( batchSpans, span )
				);
			}
		}
	}
}

const allSpanMarkerOwnerGroups = new Map();
for ( const run of loadedAllDataSpanRuns ) {
	const metadataById = allSpanUseSelectMetadataByRun.get( run.runId );
	for ( const summary of run.data.delayRunSummaries ) {
		const spans = summary.dataSpanEvents || [];
		for ( const [ actionIndex, action ] of (
			summary.dataEvents || []
		).entries() ) {
			if (
				action.storeName !== 'core/block-editor' ||
				action.actionName !== '__unstableMarkLastChangeAsPersistent'
			) {
				continue;
			}
			const actionSpans = spansInWindow(
				spans,
				action.nowMs,
				action.nowMs + action.durationMs
			);
			const base = {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				window_kind: 'marker action',
				delay_ms: summary.delayMs,
				round: summary.round,
				sample_id: `${ summary.round }:${ actionIndex }`,
				sample_index: actionIndex,
			};

			for ( const span of actionSpans ) {
				if ( ! span.name.startsWith( 'data.useSelect.' ) ) {
					continue;
				}
				addUseSelectOwnerSpan(
					allSpanMarkerOwnerGroups,
					base,
					metadataById,
					span
				);
			}

			for ( const span of actionSpans ) {
				if (
					span.name !== 'data.reduxStore.listener' ||
					span.metadata?.storeName !== 'core/block-editor'
				) {
					continue;
				}
				addOuterListenerOwnerSpan(
					allSpanMarkerOwnerGroups,
					base,
					metadataById,
					span,
					firstUseSelectOnChangeInsideListener( actionSpans, span )
				);
			}
		}
	}
}

const allSpanOwnerRows = [
	...compactOwnerRows( allSpanInputOwnerGroups ),
	...compactOwnerRows( allSpanMarkerOwnerGroups ),
];
const allSpanOwnerSummaryRows = summarizeOwnerRows( allSpanOwnerRows );
const allSpanOwnerDiffRows = ownerDiffRows(
	allSpanOwnerSummaryRows.filter(
		( row ) => row.window_kind === 'next input registry.batch'
	)
);

const allSpanCategoryRows = loadedAllDataSpanRuns.flatMap( ( run ) =>
	run.data.delayRunSummaries.flatMap( ( summary ) => {
		const spans = summary.dataSpanEvents || [];
		return ( summary.dataEvents || [] )
			.filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					[
						'__unstableMarkLastChangeAsPersistent',
						'__unstableMarkNextChangeAsNotPersistent',
						'updateBlockAttributes',
					].includes( event.actionName )
			)
			.flatMap( ( action, actionIndex ) => {
				const actionStart = action.nowMs;
				const actionStop = action.nowMs + action.durationMs;
				const groupedSpans = groupedBy(
					spans.filter(
						( span ) =>
							span.startedAtMs >= actionStart &&
							span.startedAtMs <= actionStop
					),
					spanCategory
				);

				return Array.from( groupedSpans.entries() ).map(
					( [ category, categorySpans ] ) => ( {
						run_id: run.runId,
						trace_type: run.traceType,
						intervention: run.intervention,
						delay_ms: summary.delayMs,
						round: summary.round,
						action_name: action.actionName,
						action_index: actionIndex,
						category,
						count: categorySpans.length,
						duration_sum_ms: categorySpans.reduce(
							( sum, span ) => sum + ( span.durationMs || 0 ),
							0
						),
						listener_count_max: maxListenerCount(
							categorySpans,
							() => true
						),
					} )
				);
			} );
	} )
);

const allSpanCategorySummaryRows = Array.from(
	groupedBy(
		allSpanCategoryRows,
		( row ) =>
			`${ row.intervention }\t${ row.action_name }\t${ row.category }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		action_name: first.action_name,
		category: first.category,
		n_actions: rows.length,
		count_p50: quantile(
			rows.map( ( row ) => row.count ),
			0.5
		),
		duration_sum_p50_ms: quantile(
			rows.map( ( row ) => row.duration_sum_ms ),
			0.5
		),
		listener_count_max: maxFinite(
			rows.map( ( row ) => row.listener_count_max )
		),
	};
} );

const reduxListenerCoverageRows = loadedReduxListenerOwnerRuns.map( ( run ) => {
	const listenerSpans = run.data.delayRunSummaries.flatMap( ( summary ) =>
		( summary.dataSpanEvents || [] ).filter(
			( span ) =>
				span.name === 'data.reduxStore.listener' &&
				span.metadata?.storeName === 'core/block-editor'
		)
	);
	return {
		run_id: run.runId,
		trace_type: run.traceType,
		intervention: run.intervention,
		json_path: path.relative( repoRoot, run.jsonPath ),
		records: run.data.records?.length || 0,
		summaries: run.data.delayRunSummaries?.length || 0,
		use_select_metadata_rows: run.data.useSelectMetadata?.length || 0,
		block_editor_redux_listener_spans: listenerSpans.length,
		block_editor_redux_listener_spans_with_use_select_id:
			listenerSpans.filter( ( span ) => span.metadata?.useSelectId )
				.length,
		block_editor_redux_listener_span_owner_coverage:
			listenerSpans.length === 0
				? null
				: listenerSpans.filter( ( span ) => span.metadata?.useSelectId )
						.length / listenerSpans.length,
	};
} );

const reduxListenerOwnerGroups = new Map();
for ( const run of loadedReduxListenerOwnerRuns ) {
	const metadataById = useSelectMetadataById( run );
	for ( const summary of run.data.delayRunSummaries ) {
		const spans = summary.dataSpanEvents || [];
		const dataEvents = summary.dataEvents || [];
		const inputs = inputEventsForSummary( summary );

		for ( const [ sampleIndex, inputEvent ] of inputs.entries() ) {
			const record = recordForInputSample( run, summary, sampleIndex );
			if ( record?.isThrowaway ) {
				continue;
			}

			const rootBatch = firstRootBatchAfterInput( spans, inputEvent );
			if ( ! rootBatch ) {
				continue;
			}

			const batchStop = rootBatch.startedAtMs + rootBatch.durationMs;
			const previousInputEvent = inputs[ sampleIndex - 1 ];
			const previousInputMs =
				previousInputEvent?.nowMs ?? summary.runStartedAtBrowserNowMs;
			const windows = [];
			const selectionChangeAction = firstBlockEditorActionInWindow(
				dataEvents,
				'selectionChange',
				rootBatch.startedAtMs - 1,
				batchStop + 1
			);
			const updateBlockAction = firstBlockEditorActionInWindow(
				dataEvents,
				'updateBlockAttributes',
				inputEvent.nowMs - 1,
				batchStop + 1
			);
			if ( selectionChangeAction ) {
				windows.push( {
					kind: 'next input selectionChange',
					action: selectionChangeAction,
				} );
			}
			if ( updateBlockAction ) {
				windows.push( {
					kind: 'next input updateBlockAttributes',
					action: updateBlockAction,
				} );
			}
			for ( const markerAction of dataEvents.filter(
				( event ) =>
					event.storeName === 'core/block-editor' &&
					event.actionName ===
						'__unstableMarkLastChangeAsPersistent' &&
					event.nowMs >= previousInputMs &&
					event.nowMs < inputEvent.nowMs
			) ) {
				windows.push( {
					kind: 'marker before input',
					action: markerAction,
				} );
			}

			for ( const window of windows ) {
				const actionSpans = actionStartedSpans( spans, window.action );
				const base = {
					run_id: run.runId,
					trace_type: run.traceType,
					intervention: run.intervention,
					window_kind: window.kind,
					delay_ms: summary.delayMs,
					round: summary.round,
					sample_id: `${ summary.round }:${ sampleIndex }`,
					sample_index: sampleIndex,
					action_name: window.action.actionName,
				};

				for ( const span of actionSpans ) {
					addReduxListenerOwnerSpan(
						reduxListenerOwnerGroups,
						base,
						metadataById,
						span
					);
				}
			}
		}
	}
}

const reduxListenerOwnerRows = compactReduxListenerOwnerRows(
	reduxListenerOwnerGroups
);
const reduxListenerOwnerSummaryRows = summarizeReduxListenerOwnerRows(
	reduxListenerOwnerRows
);
const reduxListenerOwnerDiffRows = buildReduxListenerOwnerDiffRows(
	reduxListenerOwnerSummaryRows.filter( ( row ) =>
		[
			'next input selectionChange',
			'next input updateBlockAttributes',
		].includes( row.window_kind )
	)
);

const richTextRows = loadedRuns.flatMap( ( run ) =>
	run.traceType === 'span trace'
		? run.data.delayRunSummaries.flatMap( ( summary ) =>
				( summary.richTextSpanEvents || [] ).map( ( event ) => ( {
					run_id: run.runId,
					trace_type: run.traceType,
					intervention: run.intervention,
					delay_ms: summary.delayMs,
					name: event.name,
					duration_ms: event.durationMs,
				} ) )
		  )
		: []
);

const richTextSummaryRows = Array.from(
	groupedBy(
		richTextRows,
		( row ) => `${ row.intervention }\t${ row.delay_ms }\t${ row.name }`
	).entries()
).map( ( [ , rows ] ) => {
	const first = rows[ 0 ];
	return {
		trace_type: first.trace_type,
		intervention: first.intervention,
		delay_ms: first.delay_ms,
		name: first.name,
		n: rows.length,
		duration_p50_ms: quantile(
			rows.map( ( row ) => row.duration_ms ),
			0.5
		),
		duration_sum_ms: rows.reduce(
			( sum, row ) => sum + row.duration_ms,
			0
		),
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

const inputPathRows = loadedRuns.flatMap( ( run ) => {
	const recordsBySummary = groupedBy( run.data.records, summaryKey );

	return run.data.delayRunSummaries.flatMap( ( summary ) => {
		const spans = summary.dataSpanEvents || [];
		if ( spans.length === 0 ) {
			return [];
		}

		const inputEvents = inputEventsForSummary( summary );
		const records = ( recordsBySummary.get( summaryKey( summary ) ) || [] )
			.slice()
			.sort( ( left, right ) => left.sampleIndex - right.sampleIndex );

		return records.flatMap( ( record, recordIndex ) => {
			if ( record.isThrowaway ) {
				return [];
			}

			const inputEvent = inputEvents[ recordIndex ];
			if ( ! inputEvent ) {
				return [];
			}

			const rootBatch = firstRootBatchAfterInput( spans, inputEvent );
			const batchSpans = rootBatch
				? spansInWindow(
						spans,
						rootBatch.startedAtMs,
						rootBatch.startedAtMs + rootBatch.durationMs
				  )
				: [];
			const updateParentSpans = batchSpans.filter(
				( span ) =>
					span.name === 'block-editor.useBlockSync.updateParent'
			);

			if ( updateParentSpans.length === 0 ) {
				return [
					{
						run_id: run.runId,
						trace_type: run.traceType,
						intervention: run.intervention,
						delay_ms: record.delayMs,
						round: record.round,
						sample_index: record.sampleIndex,
						delay_sample_index: record.delaySampleIndex,
						update_parent: '(none)',
						duration_ms: 0,
						blocks_changed: '',
						selection_changed: '',
						did_persistence_change: '',
						are_blocks_different: '',
						previous_are_blocks_different: '',
						new_is_persistent: '',
						batch_duration_ms: rootBatch?.durationMs ?? 0,
						latency_ms: record.latencyMs,
						keypress_ms: record.keypressMs,
					},
				];
			}

			return updateParentSpans.map( ( event ) => ( {
				run_id: run.runId,
				trace_type: run.traceType,
				intervention: run.intervention,
				delay_ms: record.delayMs,
				round: record.round,
				sample_index: record.sampleIndex,
				delay_sample_index: record.delaySampleIndex,
				update_parent: event.metadata?.updateParent,
				duration_ms: event.durationMs,
				blocks_changed: event.metadata?.blocksChanged,
				selection_changed: event.metadata?.selectionChanged,
				did_persistence_change: event.metadata?.didPersistenceChange,
				are_blocks_different: event.metadata?.areBlocksDifferent,
				previous_are_blocks_different:
					event.metadata?.previousAreBlocksDifferent,
				new_is_persistent: event.metadata?.newIsPersistent,
				batch_duration_ms: rootBatch?.durationMs ?? 0,
				latency_ms: record.latencyMs,
				keypress_ms: record.keypressMs,
			} ) );
		} );
	} );
} );

const inputPathSummaryRows = Array.from(
	groupedBy(
		inputPathRows,
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
		batch_duration_p50_ms: quantile(
			rows.map( ( row ) => row.batch_duration_ms ),
			0.5
		),
		latency_p50_ms: quantile(
			rows.map( ( row ) => row.latency_ms ),
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
if ( loadedListenerProbeRuns.length > 0 ) {
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-marker-listener-probe-samples.csv'
		),
		listenerProbeSampleRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'json_path',
			'delay_ms',
			'round',
			'event_type',
			'occurrence_index',
			'listener_count',
			'listener_duration_ms',
			'latency_ms',
			'keydown_ms',
			'keypress_ms',
			'keyup_ms',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-marker-listener-probe-summary.csv'
		),
		listenerProbeSummaryRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'delay_ms',
			'event_type',
			'n',
			'listener_count_p50',
			'listener_duration_p50_ms',
			'latency_p50_ms',
			'keydown_p50_ms',
			'keypress_p50_ms',
			'keyup_p50_ms',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-marker-input-listener-summary.csv'
		),
		listenerProbeInputListenerSummaryRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'delay_ms',
			'listener_label',
			'n',
			'duration_p50_ms',
			'duration_p90_ms',
			'listener_source',
			'registration_stack',
		]
	);
}
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
	path.join( reportDataDir, 'typing-delay-marker-paired-samples.csv' ),
	pairedRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'sample_index',
		'delay_sample_index',
		'previous_input_to_current_keydown_ms',
		'previous_input_to_marker_ms',
		'marker_to_current_keydown_ms',
		'marker_action_count',
		'marker_action_duration_ms',
		'latency_ms',
		'keypress_ms',
		'marker_inclusive_latency_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-paired-summary.csv' ),
	pairedSummaryRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'n',
		'rows_with_marker_action',
		'latency_p50_ms',
		'marker_action_duration_p50_ms',
		'marker_inclusive_latency_p50_ms',
		'marker_inclusive_latency_p10_ms',
		'marker_inclusive_latency_p90_ms',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-timeout-970-marker-paired-samples.csv'
	),
	timeoutRewritePairedRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'rewrite_timeout_ms',
		'delay_ms',
		'round',
		'sample_index',
		'delay_sample_index',
		'previous_input_to_current_keydown_ms',
		'previous_input_to_marker_ms',
		'marker_to_current_keydown_ms',
		'marker_action_count',
		'marker_action_duration_ms',
		'latency_ms',
		'keypress_ms',
		'marker_inclusive_latency_ms',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-timeout-970-marker-paired-summary.csv'
	),
	timeoutRewritePairedSummaryRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'rewrite_timeout_ms',
		'delay_ms',
		'n',
		'rows_with_marker_action',
		'latency_p50_ms',
		'marker_action_duration_p50_ms',
		'marker_inclusive_latency_p50_ms',
		'marker_inclusive_latency_p10_ms',
		'marker_inclusive_latency_p90_ms',
	]
);
if ( loadedMarkerGapDenseRuns.length > 0 ) {
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-marker-gap-dense-paired-samples.csv'
		),
		markerGapDensePairedRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'delay_ms',
			'round',
			'sample_index',
			'delay_sample_index',
			'previous_input_to_current_keydown_ms',
			'previous_input_to_marker_ms',
			'marker_to_current_keydown_ms',
			'marker_action_count',
			'marker_action_duration_ms',
			'latency_ms',
			'keypress_ms',
			'marker_inclusive_latency_ms',
			'current_keydown_is_persistent',
			'current_keydown_is_typing',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-marker-gap-dense-paired-summary.csv'
		),
		markerGapDensePairedSummaryRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'delay_ms',
			'n',
			'rows_with_marker_action',
			'latency_p50_ms',
			'keypress_p50_ms',
			'previous_input_to_current_keydown_p50_ms',
			'previous_input_to_marker_p50_ms',
			'marker_to_current_keydown_p50_ms',
			'marker_action_duration_p50_ms',
			'marker_inclusive_latency_p50_ms',
			'marker_inclusive_latency_p10_ms',
			'marker_inclusive_latency_p90_ms',
			'current_keydown_persistent_count',
			'current_keydown_typing_count',
		]
	);
}
if ( loadedFixedHoldTimerRewriteRuns.length > 0 ) {
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-fixed-hold-timer-rewrite-paired-samples.csv'
		),
		fixedHoldTimerRewritePairedRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'rewrite_timeout_ms',
			'delay_ms',
			'round',
			'sample_index',
			'delay_sample_index',
			'previous_input_to_current_keydown_ms',
			'previous_input_to_marker_ms',
			'marker_to_current_keydown_ms',
			'marker_action_count',
			'marker_action_duration_ms',
			'latency_ms',
			'keypress_ms',
			'marker_inclusive_latency_ms',
			'current_keydown_is_persistent',
			'current_keydown_is_typing',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-fixed-hold-timer-rewrite-paired-summary.csv'
		),
		fixedHoldTimerRewritePairedSummaryRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'rewrite_timeout_ms',
			'delay_ms',
			'n',
			'rows_with_marker_action',
			'latency_p50_ms',
			'keypress_p50_ms',
			'previous_input_to_current_keydown_p50_ms',
			'previous_input_to_marker_p50_ms',
			'marker_to_current_keydown_p50_ms',
			'marker_action_duration_p50_ms',
			'marker_inclusive_latency_p50_ms',
			'marker_inclusive_latency_p10_ms',
			'marker_inclusive_latency_p90_ms',
			'current_keydown_persistent_count',
			'current_keydown_typing_count',
		]
	);
}
if ( loadedTaskEndProximityRuns.length > 0 ) {
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-task-end-proximity-paired-samples.csv'
		),
		taskEndProximityPairedRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'rewrite_timeout_ms',
			'delay_ms',
			'round',
			'sample_index',
			'delay_sample_index',
			'previous_input_to_current_keydown_ms',
			'previous_input_to_marker_ms',
			'marker_to_current_keydown_ms',
			'marker_action_count',
			'marker_action_duration_ms',
			'intervention_event_count',
			'intervention_duration_ms',
			'intervention_to_current_keydown_ms',
			'intervention_end_to_current_keydown_ms',
			'latency_ms',
			'keypress_ms',
			'marker_inclusive_latency_ms',
			'intervention_inclusive_latency_ms',
			'current_keydown_is_persistent',
			'current_keydown_is_typing',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-task-end-proximity-paired-summary.csv'
		),
		taskEndProximityPairedSummaryRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'rewrite_timeout_ms',
			'delay_ms',
			'n',
			'rows_with_marker_action',
			'rows_with_intervention_event',
			'latency_p50_ms',
			'keypress_p50_ms',
			'previous_input_to_current_keydown_p50_ms',
			'previous_input_to_marker_p50_ms',
			'marker_to_current_keydown_p50_ms',
			'marker_action_duration_p50_ms',
			'intervention_duration_p50_ms',
			'intervention_to_current_keydown_p50_ms',
			'intervention_end_to_current_keydown_p50_ms',
			'marker_inclusive_latency_p50_ms',
			'intervention_inclusive_latency_p50_ms',
			'marker_inclusive_latency_p10_ms',
			'marker_inclusive_latency_p90_ms',
			'current_keydown_persistent_count',
			'current_keydown_typing_count',
		]
	);
}
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
	path.join(
		reportDataDir,
		'typing-delay-marker-allspan-action-samples.csv'
	),
	allSpanActionRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'action_name',
		'action_index',
		'action_duration_ms',
		'span_count',
		'block_editor_listener_count',
		'root_subscribe_count',
		'root_subscribe_duration_ms',
		'redux_listener_count',
		'redux_listener_duration_ms',
		'use_select_on_change_count',
		'use_select_on_change_duration_ms',
		'use_select_on_store_change_count',
		'use_select_on_store_change_duration_ms',
		'use_select_react_listener_count',
		'use_select_react_listener_duration_ms',
		'use_select_map_select_count',
		'use_select_map_select_duration_ms',
		'use_select_render_queue_add_count',
		'use_select_render_queue_add_duration_ms',
		'registry_batch_total_duration_ms',
		'use_block_sync_batch_duration_ms',
		'use_block_sync_update_parent_count',
		'use_block_sync_update_parent_duration_ms',
		'use_block_sync_did_persistence_change_count',
		'use_block_sync_on_change_count',
		'use_block_sync_on_input_count',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-allspan-action-summary.csv'
	),
	allSpanActionSummaryRows,
	[
		'trace_type',
		'intervention',
		'action_name',
		'n',
		'action_duration_p50_ms',
		'span_count_p50',
		'block_editor_listener_count_max',
		'root_subscribe_duration_p50_ms',
		'redux_listener_count_p50',
		'use_select_on_change_count_p50',
		'use_select_on_store_change_count_p50',
		'use_select_on_store_change_duration_p50_ms',
		'use_select_react_listener_count_p50',
		'use_select_react_listener_duration_p50_ms',
		'use_select_map_select_count_p50',
		'registry_batch_total_duration_p50_ms',
		'use_block_sync_update_parent_count_p50',
		'use_block_sync_update_parent_duration_p50_ms',
		'use_block_sync_did_persistence_change_count_sum',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-allspan-input-batch-samples.csv'
	),
	allSpanInputBatchRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'sample_index',
		'is_throwaway',
		'keypress_ms',
		'latency_ms',
		'input_now_ms',
		'marker_before_input_count',
		'marker_before_input_actions',
		'marker_before_input_duration_ms',
		'marker_root_subscribe_duration_ms',
		'marker_redux_listener_duration_ms',
		'marker_use_select_on_change_duration_ms',
		'marker_use_select_on_store_change_duration_ms',
		'marker_use_select_react_listener_duration_ms',
		'marker_use_select_map_select_duration_ms',
		'marker_use_select_update_value_duration_ms',
		'marker_use_select_render_queue_add_duration_ms',
		'marker_update_parent_count',
		'marker_update_parent_duration_ms',
		'marker_did_persistence_change_count',
		'marker_update_parent_modes',
		'actions_before_content_update',
		'actions_before_content_update_persistence',
		'content_update_before_persistent',
		'content_update_after_persistent',
		'selection_change_before_persistent',
		'selection_change_after_persistent',
		'update_parent',
		'new_is_persistent',
		'previous_are_blocks_different',
		'did_persistence_change',
		'batch_duration_ms',
		'batch_callback_duration_ms',
		'selection_change_duration_ms',
		'selection_change_root_subscribe_duration_ms',
		'selection_change_redux_listener_duration_ms',
		'selection_change_redux_listener_nonzero_count',
		'selection_change_redux_listener_top1_duration_ms',
		'selection_change_redux_listener_top10_duration_ms',
		'selection_change_redux_listener_top100_duration_ms',
		'update_block_attributes_duration_ms',
		'update_block_attributes_root_subscribe_duration_ms',
		'update_block_attributes_redux_listener_duration_ms',
		'update_block_attributes_redux_listener_nonzero_count',
		'update_block_attributes_redux_listener_top1_duration_ms',
		'update_block_attributes_redux_listener_top10_duration_ms',
		'update_block_attributes_redux_listener_top100_duration_ms',
		'root_subscribe_count',
		'root_subscribe_duration_ms',
		'root_subscribe_outside_redux_listener_duration_ms',
		'redux_listener_count',
		'redux_listener_duration_ms',
		'redux_listener_outside_emitter_emit_duration_ms',
		'resume_block_editor_duration_ms',
		'emitter_listener_block_editor_count',
		'emitter_listener_block_editor_duration_ms',
		'emitter_emit_block_editor_count',
		'emitter_emit_block_editor_duration_ms',
		'paused_emitter_emit_block_editor_count',
		'paused_emitter_emit_block_editor_duration_ms',
		'emitter_notify_block_editor_count',
		'emitter_notify_block_editor_duration_ms',
		'use_select_on_change_count',
		'use_select_on_change_duration_ms',
		'use_select_on_store_change_count',
		'use_select_on_store_change_duration_ms',
		'use_select_react_listener_count',
		'use_select_react_listener_duration_ms',
		'use_select_map_select_count',
		'use_select_map_select_duration_ms',
		'use_select_update_value_count',
		'use_select_update_value_duration_ms',
		'use_select_update_value_invalid_count',
		'use_select_update_value_cached_count',
		'use_select_render_queue_add_count',
		'use_select_render_queue_add_duration_ms',
		'cycle_latency_ms',
		'cycle_root_subscribe_duration_ms',
		'cycle_redux_listener_duration_ms',
		'cycle_use_select_on_change_duration_ms',
		'cycle_use_select_on_store_change_duration_ms',
		'cycle_use_select_react_listener_duration_ms',
		'cycle_use_select_map_select_duration_ms',
		'cycle_use_select_update_value_duration_ms',
		'cycle_use_select_render_queue_add_duration_ms',
		'direct_update_parent_duration_ms',
		'use_block_sync_registry_batch_duration_ms',
		'on_input_duration_ms',
		'on_change_duration_ms',
		'edit_entity_record_duration_ms',
		'serialize_duration_ms',
		'create_undo_level_duration_ms',
	]
);
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-allspan-input-batch-summary.csv'
	),
	allSpanInputBatchSummaryRows,
	[
		'trace_type',
		'intervention',
		'n_inputs',
		'update_parent_modes',
		'marker_before_input_count_sum',
		'marker_did_persistence_change_count_sum',
		'marker_before_input_duration_p50_ms',
		'marker_root_subscribe_duration_p50_ms',
		'marker_redux_listener_duration_p50_ms',
		'marker_use_select_on_change_duration_p50_ms',
		'marker_use_select_on_store_change_duration_p50_ms',
		'marker_use_select_react_listener_duration_p50_ms',
		'marker_use_select_map_select_duration_p50_ms',
		'marker_use_select_update_value_duration_p50_ms',
		'marker_use_select_render_queue_add_duration_p50_ms',
		'keypress_p50_ms',
		'latency_p50_ms',
		'cycle_latency_p50_ms',
		'batch_duration_p50_ms',
		'batch_callback_duration_p50_ms',
		'selection_change_duration_p50_ms',
		'selection_change_root_subscribe_duration_p50_ms',
		'selection_change_redux_listener_duration_p50_ms',
		'selection_change_redux_listener_nonzero_count_p50',
		'selection_change_redux_listener_top1_duration_p50_ms',
		'selection_change_redux_listener_top10_duration_p50_ms',
		'selection_change_redux_listener_top100_duration_p50_ms',
		'update_block_attributes_duration_p50_ms',
		'update_block_attributes_root_subscribe_duration_p50_ms',
		'update_block_attributes_redux_listener_duration_p50_ms',
		'update_block_attributes_redux_listener_nonzero_count_p50',
		'update_block_attributes_redux_listener_top1_duration_p50_ms',
		'update_block_attributes_redux_listener_top10_duration_p50_ms',
		'update_block_attributes_redux_listener_top100_duration_p50_ms',
		'root_subscribe_count_p50',
		'root_subscribe_duration_p50_ms',
		'root_subscribe_outside_redux_listener_duration_p50_ms',
		'cycle_root_subscribe_duration_p50_ms',
		'redux_listener_count_p50',
		'redux_listener_duration_p50_ms',
		'redux_listener_outside_emitter_emit_duration_p50_ms',
		'cycle_redux_listener_duration_p50_ms',
		'resume_block_editor_duration_p50_ms',
		'emitter_listener_block_editor_count_p50',
		'emitter_listener_block_editor_duration_p50_ms',
		'emitter_emit_block_editor_count_p50',
		'emitter_emit_block_editor_duration_p50_ms',
		'paused_emitter_emit_block_editor_count_p50',
		'paused_emitter_emit_block_editor_duration_p50_ms',
		'emitter_notify_block_editor_count_p50',
		'emitter_notify_block_editor_duration_p50_ms',
		'use_select_on_change_count_p50',
		'use_select_on_change_duration_p50_ms',
		'cycle_use_select_on_change_duration_p50_ms',
		'use_select_on_store_change_count_p50',
		'use_select_on_store_change_duration_p50_ms',
		'cycle_use_select_on_store_change_duration_p50_ms',
		'use_select_react_listener_count_p50',
		'use_select_react_listener_duration_p50_ms',
		'cycle_use_select_react_listener_duration_p50_ms',
		'use_select_map_select_count_p50',
		'use_select_map_select_duration_p50_ms',
		'cycle_use_select_map_select_duration_p50_ms',
		'use_select_update_value_count_p50',
		'use_select_update_value_duration_p50_ms',
		'use_select_update_value_invalid_count_p50',
		'use_select_update_value_cached_count_p50',
		'cycle_use_select_update_value_duration_p50_ms',
		'use_select_render_queue_add_count_p50',
		'use_select_render_queue_add_duration_p50_ms',
		'cycle_use_select_render_queue_add_duration_p50_ms',
		'direct_update_parent_duration_p50_ms',
		'use_block_sync_registry_batch_duration_p50_ms',
		'on_input_duration_p50_ms',
		'on_change_duration_p50_ms',
		'edit_entity_record_duration_p50_ms',
		'serialize_duration_p50_ms',
		'create_undo_level_duration_p50_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-paused-wrapper-samples.csv' ),
	pausedWrapperSampleRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'sample_index',
		'listener_count',
		'paused_emit_child_count',
		'paused_emit_child_coverage',
		'listener_duration_ms',
		'paused_emit_child_duration_ms',
		'wrapper_outside_emit_duration_ms',
		'listener_nonzero_count',
		'paused_emit_child_nonzero_count',
		'wrapper_outside_emit_nonzero_count',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-paused-wrapper-summary.csv' ),
	pausedWrapperSummaryRows,
	[
		'trace_type',
		'intervention',
		'n_inputs',
		'listener_count_p50',
		'paused_emit_child_count_p50',
		'paused_emit_child_coverage_p50',
		'listener_duration_p50_ms',
		'paused_emit_child_duration_p50_ms',
		'wrapper_outside_emit_duration_p50_ms',
		'listener_nonzero_count_p50',
		'paused_emit_child_nonzero_count_p50',
		'wrapper_outside_emit_nonzero_count_p50',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-paused-wrapper-duration-bins.csv' ),
	pausedWrapperBinSummaryRows,
	[
		'trace_type',
		'intervention',
		'component',
		'duration_bin_ms',
		'n_inputs',
		'count_p50',
		'count_sum',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-allspan-owner-samples.csv' ),
	allSpanOwnerRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'window_kind',
		'delay_ms',
		'round',
		'sample_id',
		'sample_index',
		'owner_script',
		'owner_frame',
		'source_path',
		'source_line',
		'source_column',
		'source_name',
		'source_snippet',
		'has_use_select_owner',
		'use_select_instances',
		'on_change_count',
		'on_change_duration_ms',
		'on_store_change_count',
		'on_store_change_duration_ms',
		'react_listener_count',
		'react_listener_duration_ms',
		'map_select_count',
		'map_select_duration_ms',
		'update_value_count',
		'update_value_duration_ms',
		'render_queue_add_count',
		'render_queue_add_duration_ms',
		'outer_listener_count',
		'outer_listener_duration_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-allspan-owner-summary.csv' ),
	allSpanOwnerSummaryRows,
	[
		'trace_type',
		'intervention',
		'window_kind',
		'owner_script',
		'owner_frame',
		'source_path',
		'source_line',
		'source_column',
		'source_name',
		'source_snippet',
		'n_windows',
		'use_select_instances_max',
		'on_change_count_p50',
		'on_change_duration_p50_ms',
		'on_change_duration_p90_ms',
		'on_change_duration_sum_ms',
		'on_store_change_count_p50',
		'on_store_change_duration_p50_ms',
		'react_listener_count_p50',
		'react_listener_duration_p50_ms',
		'map_select_count_p50',
		'map_select_duration_p50_ms',
		'update_value_duration_p50_ms',
		'render_queue_add_duration_p50_ms',
		'outer_listener_count_p50',
		'outer_listener_duration_p50_ms',
		'outer_listener_duration_p90_ms',
		'outer_listener_duration_sum_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-allspan-owner-diff.csv' ),
	allSpanOwnerDiffRows,
	[
		'trace_type',
		'window_kind',
		'comparison',
		'intervention',
		'baseline_intervention',
		'owner_script',
		'owner_frame',
		'source_path',
		'source_line',
		'source_column',
		'source_name',
		'source_snippet',
		'intervention_on_change_duration_p50_ms',
		'baseline_on_change_duration_p50_ms',
		'diff_on_change_duration_p50_ms',
		'intervention_on_change_count_p50',
		'baseline_on_change_count_p50',
		'diff_on_change_count_p50',
		'intervention_on_store_change_duration_p50_ms',
		'baseline_on_store_change_duration_p50_ms',
		'diff_on_store_change_duration_p50_ms',
		'intervention_react_listener_duration_p50_ms',
		'baseline_react_listener_duration_p50_ms',
		'diff_react_listener_duration_p50_ms',
		'intervention_outer_listener_duration_p50_ms',
		'baseline_outer_listener_duration_p50_ms',
		'diff_outer_listener_duration_p50_ms',
		'intervention_outer_listener_count_p50',
		'baseline_outer_listener_count_p50',
		'diff_outer_listener_count_p50',
	]
);
if ( loadedReduxListenerOwnerRuns.length > 0 ) {
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-redux-listener-owner-coverage.csv'
		),
		reduxListenerCoverageRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'json_path',
			'records',
			'summaries',
			'use_select_metadata_rows',
			'block_editor_redux_listener_spans',
			'block_editor_redux_listener_spans_with_use_select_id',
			'block_editor_redux_listener_span_owner_coverage',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-redux-listener-owner-samples.csv'
		),
		reduxListenerOwnerRows,
		[
			'run_id',
			'trace_type',
			'intervention',
			'window_kind',
			'delay_ms',
			'round',
			'sample_id',
			'sample_index',
			'action_name',
			'owner_script',
			'owner_frame',
			'source_path',
			'source_line',
			'source_column',
			'source_name',
			'source_snippet',
			'has_use_select_owner',
			'use_select_instances',
			'listener_count',
			'listener_duration_ms',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-redux-listener-owner-summary.csv'
		),
		reduxListenerOwnerSummaryRows,
		[
			'trace_type',
			'intervention',
			'window_kind',
			'owner_script',
			'owner_frame',
			'source_path',
			'source_line',
			'source_column',
			'source_name',
			'source_snippet',
			'n_windows',
			'use_select_instances_max',
			'listener_count_p50',
			'listener_duration_p50_ms',
			'listener_duration_p90_ms',
			'listener_duration_sum_ms',
		]
	);
	writeCsv(
		path.join(
			reportDataDir,
			'typing-delay-redux-listener-owner-diff.csv'
		),
		reduxListenerOwnerDiffRows,
		[
			'trace_type',
			'window_kind',
			'comparison',
			'intervention',
			'baseline_intervention',
			'owner_script',
			'owner_frame',
			'source_path',
			'source_line',
			'source_column',
			'source_name',
			'source_snippet',
			'intervention_listener_duration_p50_ms',
			'baseline_listener_duration_p50_ms',
			'diff_listener_duration_p50_ms',
			'intervention_listener_count_p50',
			'baseline_listener_count_p50',
			'diff_listener_count_p50',
		]
	);
}
writeCsv(
	path.join(
		reportDataDir,
		'typing-delay-marker-allspan-category-summary.csv'
	),
	allSpanCategorySummaryRows,
	[
		'trace_type',
		'intervention',
		'action_name',
		'category',
		'n_actions',
		'count_p50',
		'duration_sum_p50_ms',
		'listener_count_max',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-richtext-summary.csv' ),
	richTextSummaryRows,
	[
		'trace_type',
		'intervention',
		'delay_ms',
		'name',
		'n',
		'duration_p50_ms',
		'duration_sum_ms',
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
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-input-path-samples.csv' ),
	inputPathRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'round',
		'sample_index',
		'delay_sample_index',
		'update_parent',
		'duration_ms',
		'blocks_changed',
		'selection_changed',
		'did_persistence_change',
		'are_blocks_different',
		'previous_are_blocks_different',
		'new_is_persistent',
		'batch_duration_ms',
		'latency_ms',
		'keypress_ms',
	]
);
writeCsv(
	path.join( reportDataDir, 'typing-delay-marker-input-path-summary.csv' ),
	inputPathSummaryRows,
	[
		'run_id',
		'trace_type',
		'intervention',
		'delay_ms',
		'update_parent',
		'n',
		'duration_p50_ms',
		'batch_duration_p50_ms',
		'latency_p50_ms',
		'did_persistence_change_count',
		'new_is_persistent_count',
	]
);

for ( const consumer of sourceMapConsumers.values() ) {
	consumer?.destroy?.();
}
