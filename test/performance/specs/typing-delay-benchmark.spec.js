/* eslint-disable no-bitwise, no-console, playwright/expect-expect */

/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';

/**
 * WordPress dependencies
 */
import { test, Metrics } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { PerfUtils } from '../fixtures';

const repoRoot = path.resolve( process.cwd(), '../..' );

const outputDir =
	process.env.BENCHMARK_OUTPUT_DIR ||
	path.join( repoRoot, 'artifacts', 'typing-delay-benchmark' );

function intEnv( name, defaultValue ) {
	const value = process.env[ name ];
	if ( value === undefined || value === '' ) {
		return defaultValue;
	}

	const parsed = Number.parseInt( value, 10 );
	if ( Number.isNaN( parsed ) ) {
		throw new Error( `Invalid integer for ${ name }: ${ value }` );
	}

	return parsed;
}

const minDelayMs = intEnv( 'BENCHMARK_MIN_DELAY_MS', 0 );
const maxDelayMs = intEnv( 'BENCHMARK_MAX_DELAY_MS', 1100 );
const delayStepMs = intEnv( 'BENCHMARK_DELAY_STEP_MS', 10 );
const rounds = intEnv( 'BENCHMARK_ROUNDS', 3 );
const samplesPerDelay = intEnv( 'BENCHMARK_SAMPLES_PER_DELAY', 10 );
const throwawayPerDelay = intEnv( 'BENCHMARK_THROWAWAY_PER_DELAY', 1 );
const settleBetweenDelayRunsMs = intEnv(
	'BENCHMARK_SETTLE_BETWEEN_DELAY_RUNS_MS',
	0
);
const orderMode = process.env.BENCHMARK_ORDER_MODE || 'mixed';
const delayMode = process.env.BENCHMARK_DELAY_MODE || 'keyboard';
const postKeyupGapMs = intEnv( 'BENCHMARK_POST_KEYUP_GAP_MS', 0 );
const scenario = process.env.BENCHMARK_SCENARIO || 'large-post-paragraph';
const nativeTimerBusyWaitMs = intEnv(
	'BENCHMARK_NATIVE_TIMER_BUSY_WAIT_MS',
	0
);
const seed = intEnv( 'BENCHMARK_SEED', 51383 );
const tracePersistence =
	process.env.BENCHMARK_TRACE_PERSISTENCE === '1' ||
	process.env.BENCHMARK_TRACE_PERSISTENCE === 'true';
const traceData =
	process.env.BENCHMARK_TRACE_DATA === '1' ||
	process.env.BENCHMARK_TRACE_DATA === 'true';
const traceEventListeners =
	process.env.BENCHMARK_TRACE_EVENT_LISTENERS === '1' ||
	process.env.BENCHMARK_TRACE_EVENT_LISTENERS === 'true';
const useBrowserTrace =
	process.env.BENCHMARK_USE_BROWSER_TRACE !== '0' &&
	process.env.BENCHMARK_USE_BROWSER_TRACE !== 'false';
const traceRichTextSpans =
	process.env.BENCHMARK_TRACE_RICH_TEXT_SPANS === '1' ||
	process.env.BENCHMARK_TRACE_RICH_TEXT_SPANS === 'true';
const traceDataSpans =
	process.env.BENCHMARK_TRACE_DATA_SPANS === '1' ||
	process.env.BENCHMARK_TRACE_DATA_SPANS === 'true';
const traceAllDataSpans =
	process.env.BENCHMARK_TRACE_ALL_DATA_SPANS === '1' ||
	process.env.BENCHMARK_TRACE_ALL_DATA_SPANS === 'true';
const rewriteTimeout1000Ms =
	process.env.BENCHMARK_REWRITE_TIMEOUT_1000_MS === undefined
		? null
		: intEnv( 'BENCHMARK_REWRITE_TIMEOUT_1000_MS', 1000 );
const markPersistentIntervention =
	process.env.BENCHMARK_MARK_PERSISTENT_INTERVENTION || 'normal';
const traceTimers =
	process.env.BENCHMARK_TRACE_TIMERS === '1' ||
	process.env.BENCHMARK_TRACE_TIMERS === 'true' ||
	rewriteTimeout1000Ms !== null;
const traceSchedulers =
	process.env.BENCHMARK_TRACE_SCHEDULERS === '1' ||
	process.env.BENCHMARK_TRACE_SCHEDULERS === 'true';
const traceGapEvents =
	process.env.BENCHMARK_TRACE_GAP_EVENTS === '1' ||
	process.env.BENCHMARK_TRACE_GAP_EVENTS === 'true';
const traceVisualLatency =
	process.env.BENCHMARK_TRACE_VISUAL_LATENCY === '1' ||
	process.env.BENCHMARK_TRACE_VISUAL_LATENCY === 'true';
const traceRenderEvents =
	process.env.BENCHMARK_TRACE_RENDER_EVENTS === '1' ||
	process.env.BENCHMARK_TRACE_RENDER_EVENTS === 'true';
const renderTraceWindowMs = intEnv( 'BENCHMARK_RENDER_TRACE_WINDOW_MS', 150 );
const traceScreenshotPixels =
	process.env.BENCHMARK_TRACE_SCREENSHOT_PIXELS === '1' ||
	process.env.BENCHMARK_TRACE_SCREENSHOT_PIXELS === 'true';
const traceScreenshots =
	traceScreenshotPixels ||
	process.env.BENCHMARK_TRACE_SCREENSHOTS === '1' ||
	process.env.BENCHMARK_TRACE_SCREENSHOTS === 'true';
const screenshotTraceWindowMs = intEnv(
	'BENCHMARK_SCREENSHOT_TRACE_WINDOW_MS',
	250
);
const freshEditorPerDelay =
	process.env.BENCHMARK_FRESH_EDITOR_PER_DELAY === '1' ||
	process.env.BENCHMARK_FRESH_EDITOR_PER_DELAY === 'true';
const waitForPersistenceBetweenKeys =
	process.env.BENCHMARK_WAIT_FOR_PERSISTENCE_BETWEEN_KEYS === '1' ||
	process.env.BENCHMARK_WAIT_FOR_PERSISTENCE_BETWEEN_KEYS === 'true';
const settleBeforeEditorSetupMs = intEnv(
	'BENCHMARK_SETTLE_BEFORE_EDITOR_SETUP_MS',
	0
);
const settleAfterEditorSetupMs = intEnv(
	'BENCHMARK_SETTLE_AFTER_EDITOR_SETUP_MS',
	0
);
const setupStyle = process.env.BENCHMARK_SETUP_STYLE || 'benchmark-live-editor';
const preTypingWarmupMs = intEnv( 'BENCHMARK_PRE_TYPE_WARMUP_MS', 0 );
const preTypingWarmupMode =
	process.env.BENCHMARK_PRE_TYPE_WARMUP_MODE || 'none';
const explicitDelays = process.env.BENCHMARK_DELAYS_MS
	? process.env.BENCHMARK_DELAYS_MS.split( ',' ).map( ( delay ) => {
			const parsed = Number.parseInt( delay.trim(), 10 );
			if ( Number.isNaN( parsed ) ) {
				throw new Error(
					`Invalid delay in BENCHMARK_DELAYS_MS: ${ delay }`
				);
			}
			return parsed;
	  } )
	: null;
const supportedScenarios = [
	'empty-post-paragraph',
	'small-containers-paragraph',
	'large-post-paragraph',
	'thousand-paragraphs-paragraph',
	'native-contenteditable-timer',
];
const supportedDelayModes = [
	'keyboard',
	'between-keys',
	'after-persistence',
	'hold-then-keyup-gap',
	'type-one-char-hold',
	'down-up-key-hold',
	'cdp-key-hold',
	'cdp-key-hold-page-evaluate',
	'cdp-key-hold-runtime-evaluate',
];
const supportedPreTypingWarmupModes = [ 'none', 'main-thread-busy-loop' ];
const supportedSetupStyles = [
	'benchmark-live-editor',
	'ci-post-editor-typing',
];
const supportedTaskpolicyTiers = [ 0, 1, 2, 3, 4, 5 ];
const supportedMarkPersistentInterventions = [
	'normal',
	'noop',
	'noop-then-busy-wait-150',
	'worker-busy-wait-20-no-message',
	'worker-busy-wait-40-no-message',
	'worker-busy-wait-80-no-message',
	'worker-busy-wait-150',
	'worker-busy-wait-150-no-message',
	'worker-delay-150',
	'worker-delay-150-no-message',
	'external-cpu-20-no-message',
	'external-cpu-40-no-message',
	'external-cpu-80-no-message',
	'external-cpu-150-no-message',
	'external-delay-150-no-message',
	'external-persistent-cpu-20-no-message',
	'external-persistent-cpu-40-no-message',
	'external-persistent-cpu-80-no-message',
	'external-persistent-cpu-150-no-message',
	'external-persistent-delay-150-no-message',
	'external-background-cpu-noop',
	'external-background-cpu-2-noop',
	'external-background-cpu-4-noop',
	'external-background-cpu-8-noop',
	'external-background-nice-cpu-noop',
	'external-background-taskpolicy-cpu-noop',
	'external-background-taskpolicy-cpu-4-noop',
	'external-background-taskpolicy-cpu-8-noop',
	'external-background-taskpolicy-utility-cpu-noop',
	'external-background-taskpolicy-qos-background-cpu-noop',
	'external-background-taskpolicy-maintenance-cpu-noop',
	...supportedTaskpolicyTiers.map(
		( tier ) => `external-background-taskpolicy-latency-${ tier }-cpu-noop`
	),
	...supportedTaskpolicyTiers.map(
		( tier ) =>
			`external-background-taskpolicy-throughput-${ tier }-cpu-noop`
	),
	'external-background-idle-noop',
	'delayed-noop-150',
	'raw-unknown-action',
	'mark-next-not-persistent',
	'mark-last-then-mark-next-not-persistent',
	'normal-then-busy-wait-150',
	'busy-wait-20',
	'busy-wait-40',
	'toggle-selection',
	'toggle-template-validity',
	'toggle-block-highlight',
	'stop-typing',
	'start-typing',
	'stop-start-typing',
	'stop-start-typing-then-busy-wait-150',
];

function sleepMs( delayMs ) {
	if ( delayMs <= 0 ) {
		return Promise.resolve();
	}
	return new Promise( ( resolve ) => setTimeout( resolve, delayMs ) );
}

function isNativeScenario() {
	return scenario === 'native-contenteditable-timer';
}

function installEventListenerTracing() {
	if ( window.__typingBenchmarkEventListenerTracingInstalled ) {
		window.__typingBenchmarkEventListenerEvents =
			window.__typingBenchmarkEventListenerEvents || [];
		return;
	}

	const tracedEventTypes = new Set( [
		'keydown',
		'keypress',
		'beforeinput',
		'input',
		'keyup',
	] );
	const originalAddEventListener = EventTarget.prototype.addEventListener;
	const originalRemoveEventListener =
		EventTarget.prototype.removeEventListener;
	const wrappedListeners = new WeakMap();
	let listenerId = 0;

	function eventTargetLabel( target ) {
		if ( target === window ) {
			return 'window';
		}

		if ( target === document ) {
			return 'document';
		}

		if ( target?.nodeType === Node.DOCUMENT_NODE ) {
			return 'document';
		}

		if ( target?.nodeType !== Node.ELEMENT_NODE ) {
			return target?.constructor?.name || String( target );
		}

		const id = target.id ? `#${ target.id }` : '';
		const className =
			typeof target.className === 'string' && target.className
				? `.${ target.className
						.trim()
						.split( /\s+/ )
						.slice( 0, 3 )
						.join( '.' ) }`
				: '';
		const role = target.getAttribute?.( 'role' )
			? `[role="${ target.getAttribute( 'role' ) }"]`
			: '';
		return `${ target.tagName.toLowerCase() }${ id }${ className }${ role }`;
	}

	function listenerSource( listener ) {
		const callback =
			typeof listener === 'function' ? listener : listener?.handleEvent;
		return callback
			? Function.prototype.toString.call( callback ).slice( 0, 300 )
			: String( listener ).slice( 0, 300 );
	}

	function listenerName( listener ) {
		const callback =
			typeof listener === 'function' ? listener : listener?.handleEvent;
		return callback?.name || listener?.constructor?.name || '';
	}

	function captureFromOptions( options ) {
		return typeof options === 'boolean' ? options : !! options?.capture;
	}

	function getWrappedListener( listener, type, options, target ) {
		if (
			! listener ||
			! tracedEventTypes.has( type ) ||
			listener.__typingBenchmarkIgnoreListener
		) {
			return listener;
		}

		let wrappedByCapture = wrappedListeners.get( listener );
		if ( ! wrappedByCapture ) {
			wrappedByCapture = new Map();
			wrappedListeners.set( listener, wrappedByCapture );
		}

		const capture = captureFromOptions( options );
		const key = `${ type }:${ capture }`;
		const existing = wrappedByCapture.get( key );
		if ( existing ) {
			return existing;
		}

		const id = ++listenerId;
		const registeredAtMs = performance.now();
		const registrationStack = new Error().stack?.slice( 0, 1200 );
		const source = listenerSource( listener );
		const name = listenerName( listener );
		const targetLabel = eventTargetLabel( target );

		const wrapped = function wrappedTypingBenchmarkEventListener( event ) {
			const start = performance.now();
			let status = 'returned';
			let result;

			try {
				if ( typeof listener === 'function' ) {
					result = listener.call( this, event );
				} else {
					result = listener.handleEvent.call( listener, event );
				}
			} catch ( error ) {
				status = 'threw';
				throw error;
			} finally {
				const stop = performance.now();
				window.__typingBenchmarkEventListenerEvents.push( {
					id,
					type: event.type,
					startedAtMs: start,
					durationMs: stop - start,
					status,
					eventPhase: event.eventPhase,
					capture,
					targetLabel,
					currentTargetLabel: eventTargetLabel( event.currentTarget ),
					eventTargetLabel: eventTargetLabel( event.target ),
					listenerName: name,
					listenerSource: source,
					registeredAtMs,
					registrationStack,
					key: event.key,
					code: event.code,
					inputType: event.inputType,
					data: event.data,
				} );
			}

			return result;
		};

		wrappedByCapture.set( key, wrapped );
		return wrapped;
	}

	EventTarget.prototype.addEventListener = function addEventListener(
		type,
		listener,
		options
	) {
		return originalAddEventListener.call(
			this,
			type,
			getWrappedListener( listener, type, options, this ),
			options
		);
	};

	EventTarget.prototype.removeEventListener = function removeEventListener(
		type,
		listener,
		options
	) {
		const capture = captureFromOptions( options );
		const wrapped = wrappedListeners
			.get( listener )
			?.get( `${ type }:${ capture }` );
		return originalRemoveEventListener.call(
			this,
			type,
			wrapped || listener,
			options
		);
	};

	window.__typingBenchmarkEventListenerEvents = [];
	window.__typingBenchmarkEventListenerTracingInstalled = true;

	if ( window.__typingBenchmarkEventListenerFrameObserverInstalled ) {
		return;
	}

	const installerSource = `(${ installEventListenerTracing.toString() })()`;

	function installInChildFrames() {
		for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
			try {
				const childWindow = iframe.contentWindow;
				if (
					childWindow &&
					! childWindow.__typingBenchmarkEventListenerTracingInstalled
				) {
					childWindow.eval( installerSource );
				}
			} catch {
				// Cross-origin or not-yet-ready frames are irrelevant here.
			}
		}
	}

	installInChildFrames();
	new MutationObserver( installInChildFrames ).observe( document, {
		childList: true,
		subtree: true,
	} );
	window.setInterval( installInChildFrames, 50 );
	window.__typingBenchmarkEventListenerFrameObserverInstalled = true;
}

function installRichTextSpanTracing() {
	if ( window.__typingBenchmarkRichTextSpanTracingInstalled ) {
		window.__typingBenchmarkRichTextSpanEvents =
			window.__typingBenchmarkRichTextSpanEvents || [];
		return;
	}

	window.__typingBenchmarkRichTextSpanEvents = [];
	let depth = 0;

	window.__typingBenchmarkTraceRichTextSpan = function traceRichTextSpan(
		name,
		callback,
		metadata = {}
	) {
		const startedAtMs = performance.now();
		const currentDepth = depth;
		depth++;
		let status = 'returned';
		let result;

		try {
			result = callback();
		} catch ( error ) {
			status = 'threw';
			throw error;
		} finally {
			depth--;
			window.__typingBenchmarkRichTextSpanEvents.push( {
				name,
				startedAtMs,
				durationMs: performance.now() - startedAtMs,
				status,
				depth: currentDepth,
				metadata,
			} );
		}

		return result;
	};

	window.__typingBenchmarkRichTextSpanTracingInstalled = true;

	if ( window.__typingBenchmarkRichTextSpanFrameObserverInstalled ) {
		return;
	}

	const installerSource = `(${ installRichTextSpanTracing.toString() })()`;

	function installInChildFrames() {
		for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
			try {
				const childWindow = iframe.contentWindow;
				if (
					childWindow &&
					! childWindow.__typingBenchmarkRichTextSpanTracingInstalled
				) {
					childWindow.eval( installerSource );
				}
			} catch {
				// Cross-origin or not-yet-ready frames are irrelevant here.
			}
		}
	}

	installInChildFrames();
	new MutationObserver( installInChildFrames ).observe( document, {
		childList: true,
		subtree: true,
	} );
	window.setInterval( installInChildFrames, 50 );
	window.__typingBenchmarkRichTextSpanFrameObserverInstalled = true;
}

function installDataSpanTracing() {
	if ( window.__typingBenchmarkDataSpanTracingInstalled ) {
		window.__typingBenchmarkDataSpanEvents =
			window.__typingBenchmarkDataSpanEvents || [];
		window.__typingBenchmarkUseSelectMetadata =
			window.__typingBenchmarkUseSelectMetadata || [];
		return;
	}

	window.__typingBenchmarkDataSpanEvents = [];
	window.__typingBenchmarkUseSelectMetadata = [];
	let depth = 0;
	let batchDepth = 0;
	const defaultExcludedSpanNames = new Set( [
		'data.emitter.emit',
		'data.reduxStore.listener',
	] );

	window.__typingBenchmarkTraceDataSpan = function traceDataSpan(
		name,
		callback,
		metadata = {}
	) {
		const startedAtMs = performance.now();
		const currentDepth = depth;
		const isBatchRoot = name === 'data.registry.batch.total';
		const shouldCapture =
			window.__typingBenchmarkTraceAllDataSpans ||
			( ! defaultExcludedSpanNames.has( name ) &&
				( batchDepth > 0 ||
					name.indexOf( 'data.registry.batch.' ) === 0 ) );
		if ( isBatchRoot ) {
			batchDepth++;
		}
		depth++;
		let status = 'returned';
		let result;

		try {
			result = callback();
		} catch ( error ) {
			status = 'threw';
			throw error;
		} finally {
			depth--;
			if ( shouldCapture ) {
				window.__typingBenchmarkDataSpanEvents.push( {
					name,
					startedAtMs,
					durationMs: performance.now() - startedAtMs,
					status,
					depth: currentDepth,
					metadata,
				} );
			}
			if ( isBatchRoot ) {
				batchDepth--;
			}
		}

		return result;
	};

	window.__typingBenchmarkDataSpanTracingInstalled = true;

	if ( window.__typingBenchmarkDataSpanFrameObserverInstalled ) {
		return;
	}

	const installerSource = `(${ installDataSpanTracing.toString() })()`;

	function installInChildFrames() {
		for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
			try {
				const childWindow = iframe.contentWindow;
				if (
					childWindow &&
					! childWindow.__typingBenchmarkDataSpanTracingInstalled
				) {
					childWindow.eval( installerSource );
				}
			} catch {
				// Cross-origin or not-yet-ready frames are irrelevant here.
			}
		}
	}

	installInChildFrames();
	new MutationObserver( installInChildFrames ).observe( document, {
		childList: true,
		subtree: true,
	} );
	window.setInterval( installInChildFrames, 50 );
	window.__typingBenchmarkDataSpanFrameObserverInstalled = true;
}

function installVisualLatencyTracing() {
	if ( window.__typingBenchmarkVisualLatencyTracingInstalled ) {
		window.__typingBenchmarkVisualLatencyEvents =
			window.__typingBenchmarkVisualLatencyEvents || [];
		return;
	}

	window.__typingBenchmarkVisualLatencyEvents = [];
	let nextId = 0;
	const pendingRecords = [];
	window.__typingBenchmarkResetVisualLatencyTracing = () => {
		window.__typingBenchmarkVisualLatencyEvents = [];
		pendingRecords.length = 0;
		nextId = 0;
	};

	function now() {
		return performance.now();
	}

	function targetLabel( target ) {
		if ( target === window ) {
			return 'window';
		}
		if ( target === document ) {
			return 'document';
		}
		if ( target?.nodeType !== Node.ELEMENT_NODE ) {
			return target?.constructor?.name || String( target );
		}
		const id = target.id ? `#${ target.id }` : '';
		const className =
			typeof target.className === 'string' && target.className
				? `.${ target.className
						.trim()
						.split( /\s+/ )
						.slice( 0, 3 )
						.join( '.' ) }`
				: '';
		const role = target.getAttribute?.( 'role' )
			? `[role="${ target.getAttribute( 'role' ) }"]`
			: '';
		return `${ target.tagName.toLowerCase() }${ id }${ className }${ role }`;
	}

	function textLength( target ) {
		if ( typeof target?.value === 'string' ) {
			return target.value.length;
		}
		return target?.textContent?.length ?? null;
	}

	function latestRecord() {
		for ( let i = pendingRecords.length - 1; i >= 0; i-- ) {
			const record = pendingRecords[ i ];
			if ( ! record.inputAtMs || ! record.firstRafAfterInputAtMs ) {
				return record;
			}
		}
		return null;
	}

	function scheduleInputRafs( record, schedulerWindow = window ) {
		if ( record.inputRafScheduled ) {
			return;
		}
		record.inputRafScheduled = true;
		schedulerWindow.requestAnimationFrame( ( timestamp ) => {
			record.firstRafAfterInputAtMs = now();
			record.firstRafAfterInputTimestampMs = timestamp;
			schedulerWindow.requestAnimationFrame( ( secondTimestamp ) => {
				record.secondRafAfterInputAtMs = now();
				record.secondRafAfterInputTimestampMs = secondTimestamp;
			} );
		} );
	}

	function scheduleMutationRafs( record, schedulerWindow = window ) {
		if ( record.mutationRafScheduled ) {
			return;
		}
		record.mutationRafScheduled = true;
		schedulerWindow.requestAnimationFrame( ( timestamp ) => {
			record.firstRafAfterMutationAtMs = now();
			record.firstRafAfterMutationTimestampMs = timestamp;
			schedulerWindow.requestAnimationFrame( ( secondTimestamp ) => {
				record.secondRafAfterMutationAtMs = now();
				record.secondRafAfterMutationTimestampMs = secondTimestamp;
			} );
		} );
	}

	function installChildDocumentProbes( childWindow, frameName ) {
		const childDocument = childWindow.document;
		if (
			! childDocument ||
			childDocument.__typingBenchmarkVisualLatencyParentProbeInstalled
		) {
			return;
		}
		childDocument.__typingBenchmarkVisualLatencyParentProbeInstalled = true;

		childDocument.addEventListener(
			'beforeinput',
			( event ) => {
				const record = latestRecord();
				if ( ! record ) {
					return;
				}
				record.beforeinputAtMs = now();
				record.beforeinputWindowName = frameName;
				record.inputType = event.inputType;
				record.inputData = event.data;
				record.targetTextLengthAtBeforeInput = textLength(
					event.target
				);
			},
			true
		);

		childDocument.addEventListener(
			'input',
			( event ) => {
				const record = latestRecord();
				if ( ! record ) {
					return;
				}
				record.inputAtMs = now();
				record.inputWindowName = frameName;
				record.inputTargetLabel = targetLabel( event.target );
				record.targetTextLengthAtInput = textLength( event.target );
				scheduleInputRafs( record, childWindow );
			},
			true
		);

		new childWindow.MutationObserver( ( mutations ) => {
			const record = latestRecord();
			if ( ! record ) {
				return;
			}
			if ( ! record.firstMutationAtMs ) {
				record.firstMutationAtMs = now();
				record.mutationWindowName = frameName;
			}
			record.mutationBatchCount = ( record.mutationBatchCount || 0 ) + 1;
			record.mutationRecordCount =
				( record.mutationRecordCount || 0 ) + mutations.length;
			scheduleMutationRafs( record, childWindow );
		} ).observe( childDocument, {
			childList: true,
			characterData: true,
			subtree: true,
		} );
	}

	document.addEventListener(
		'keydown',
		( event ) => {
			if ( event.key !== 'x' && event.key !== 'X' ) {
				return;
			}
			const record = {
				id: ++nextId,
				key: event.key,
				code: event.code,
				keydownAtMs: now(),
				targetLabel: targetLabel( event.target ),
				targetTextLengthAtKeydown: textLength( event.target ),
			};
			pendingRecords.push( record );
			window.__typingBenchmarkVisualLatencyEvents.push( record );
		},
		true
	);

	document.addEventListener(
		'beforeinput',
		( event ) => {
			const record = latestRecord();
			if ( ! record ) {
				return;
			}
			record.beforeinputAtMs = now();
			record.inputType = event.inputType;
			record.inputData = event.data;
			record.targetTextLengthAtBeforeInput = textLength( event.target );
		},
		true
	);

	document.addEventListener(
		'input',
		( event ) => {
			const record = latestRecord();
			if ( ! record ) {
				return;
			}
			record.inputAtMs = now();
			record.inputTargetLabel = targetLabel( event.target );
			record.targetTextLengthAtInput = textLength( event.target );
			scheduleInputRafs( record );
		},
		true
	);

	new MutationObserver( ( mutations ) => {
		const record = latestRecord();
		if ( ! record ) {
			return;
		}
		if ( ! record.firstMutationAtMs ) {
			record.firstMutationAtMs = now();
		}
		record.mutationBatchCount = ( record.mutationBatchCount || 0 ) + 1;
		record.mutationRecordCount =
			( record.mutationRecordCount || 0 ) + mutations.length;
		scheduleMutationRafs( record );
	} ).observe( document, {
		childList: true,
		characterData: true,
		subtree: true,
	} );

	window.__typingBenchmarkVisualLatencyTracingInstalled = true;

	if ( window.__typingBenchmarkVisualLatencyFrameObserverInstalled ) {
		return;
	}

	const installerSource = `(${ installVisualLatencyTracing.toString() })()`;

	function installInChildFrames() {
		for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
			try {
				const childWindow = iframe.contentWindow;
				if (
					childWindow &&
					! childWindow.__typingBenchmarkVisualLatencyTracingInstalled
				) {
					childWindow.eval( installerSource );
				}
				if ( childWindow ) {
					installChildDocumentProbes(
						childWindow,
						iframe.name || iframe.id || 'iframe'
					);
				}
			} catch {
				// Cross-origin or not-yet-ready frames are irrelevant here.
			}
		}
	}

	installInChildFrames();
	new MutationObserver( installInChildFrames ).observe( document, {
		childList: true,
		subtree: true,
	} );
	window.setInterval( installInChildFrames, 50 );
	window.__typingBenchmarkVisualLatencyFrameObserverInstalled = true;
}

if ( delayStepMs <= 0 ) {
	throw new Error( 'BENCHMARK_DELAY_STEP_MS must be greater than 0.' );
}

if ( renderTraceWindowMs <= 0 ) {
	throw new Error(
		'BENCHMARK_RENDER_TRACE_WINDOW_MS must be greater than 0.'
	);
}

if ( screenshotTraceWindowMs <= 0 ) {
	throw new Error(
		'BENCHMARK_SCREENSHOT_TRACE_WINDOW_MS must be greater than 0.'
	);
}

if ( maxDelayMs < minDelayMs ) {
	throw new Error(
		'BENCHMARK_MAX_DELAY_MS must be >= BENCHMARK_MIN_DELAY_MS.'
	);
}

if ( ( maxDelayMs - minDelayMs ) % delayStepMs !== 0 ) {
	throw new Error(
		'Delay range must be exactly divisible by BENCHMARK_DELAY_STEP_MS.'
	);
}

if ( ! supportedDelayModes.includes( delayMode ) ) {
	throw new Error(
		`Unsupported BENCHMARK_DELAY_MODE: ${ delayMode }. ` +
			`Supported modes: ${ supportedDelayModes.join( ', ' ) }.`
	);
}

if ( ! supportedPreTypingWarmupModes.includes( preTypingWarmupMode ) ) {
	throw new Error(
		`Unsupported BENCHMARK_PRE_TYPE_WARMUP_MODE: ${ preTypingWarmupMode }. ` +
			`Supported modes: ${ supportedPreTypingWarmupModes.join( ', ' ) }.`
	);
}

if ( preTypingWarmupMode === 'none' && preTypingWarmupMs !== 0 ) {
	throw new Error(
		'BENCHMARK_PRE_TYPE_WARMUP_MS requires BENCHMARK_PRE_TYPE_WARMUP_MODE.'
	);
}

if ( preTypingWarmupMode !== 'none' && preTypingWarmupMs <= 0 ) {
	throw new Error(
		'BENCHMARK_PRE_TYPE_WARMUP_MS must be greater than 0 when a pre-type warmup mode is set.'
	);
}

if (
	! supportedMarkPersistentInterventions.includes(
		markPersistentIntervention
	)
) {
	throw new Error(
		`Unsupported BENCHMARK_MARK_PERSISTENT_INTERVENTION: ${ markPersistentIntervention }. ` +
			`Supported modes: ${ supportedMarkPersistentInterventions.join(
				', '
			) }.`
	);
}

if (
	isNativeScenario() &&
	( waitForPersistenceBetweenKeys || delayMode === 'after-persistence' )
) {
	throw new Error(
		'Native contenteditable scenarios do not support persistence-wait delay modes.'
	);
}

const delays = [];
if ( explicitDelays ) {
	delays.push( ...explicitDelays );
} else {
	for ( let delay = minDelayMs; delay <= maxDelayMs; delay += delayStepMs ) {
		delays.push( delay );
	}
}

function seededRandom( initialSeed ) {
	let state = initialSeed >>> 0;

	return () => {
		state += 0x6d2b79f5;
		let t = state;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

function shuffled( values, initialSeed ) {
	const output = [ ...values ];
	const random = seededRandom( initialSeed );

	for ( let i = output.length - 1; i > 0; i-- ) {
		const j = Math.floor( random() * ( i + 1 ) );
		[ output[ i ], output[ j ] ] = [ output[ j ], output[ i ] ];
	}

	return output;
}

function delaysForRound( round ) {
	if ( orderMode === 'ascending' ) {
		return [ ...delays ];
	}

	if ( orderMode === 'descending' ) {
		return [ ...delays ].reverse();
	}

	if ( orderMode === 'shuffle' ) {
		return shuffled( delays, seed + round );
	}

	if ( orderMode === 'mixed' ) {
		if ( round % 3 === 0 ) {
			return [ ...delays ];
		}

		if ( round % 3 === 1 ) {
			return [ ...delays ].reverse();
		}

		return shuffled( delays, seed + round );
	}

	throw new Error( `Unknown BENCHMARK_ORDER_MODE: ${ orderMode }` );
}

function keyboardEventDispatches( trace ) {
	return trace.traceEvents
		.filter(
			( item ) =>
				item.cat === 'devtools.timeline' &&
				item.name === 'EventDispatch' &&
				[ 'keydown', 'keypress', 'keyup' ].includes(
					item?.args?.data?.type
				) &&
				!! item.dur
		)
		.map( ( item ) => ( {
			type: item.args.data.type,
			durationMs: item.dur / 1000,
			timestampMs: item.ts / 1000,
		} ) )
		.sort( ( a, b ) => a.timestampMs - b.timestampMs );
}

function groupKeyboardDispatches( dispatches ) {
	const groups = [];
	let currentGroup = {
		keydownEvents: [],
		keypress: null,
		keyup: null,
	};

	for ( const event of dispatches ) {
		if (
			event.type === 'keydown' &&
			( currentGroup.keypress || currentGroup.keyup )
		) {
			currentGroup = {
				keydownEvents: [],
				keypress: null,
				keyup: null,
			};
		}

		if ( event.type === 'keydown' ) {
			currentGroup.keydownEvents.push( event );
			continue;
		}

		if ( event.type === 'keypress' ) {
			currentGroup.keypress = event;
			continue;
		}

		currentGroup.keyup = event;

		if (
			currentGroup.keydownEvents.length > 0 &&
			currentGroup.keypress &&
			currentGroup.keyup
		) {
			groups.push( currentGroup );
		}

		currentGroup = {
			keydownEvents: [],
			keypress: null,
			keyup: null,
		};
	}

	return groups;
}

function groupedKeyboardEvents( trace ) {
	return groupKeyboardDispatches( keyboardEventDispatches( trace ) );
}

const renderTraceEventNames = new Set( [
	'BeginFrame',
	'CompositeLayers',
	'DrawFrame',
	'FireAnimationFrame',
	'Layerize',
	'Layout',
	'Paint',
	'PrePaint',
	'ScheduleStyleRecalculation',
	'UpdateLayoutTree',
] );
const renderTraceCategories = [
	'devtools.timeline',
	'disabled-by-default-devtools.timeline',
	'disabled-by-default-devtools.timeline.frame',
	'blink',
	'cc',
	'disabled-by-default-cc.debug',
];
const screenshotTraceCategories = [
	'devtools.timeline',
	'disabled-by-default-devtools.screenshot',
];

function browserTraceOptions() {
	if ( ! traceRenderEvents && ! traceScreenshots ) {
		return undefined;
	}

	return {
		screenshots: traceScreenshots,
		categories: [
			...new Set( [
				...( traceRenderEvents
					? renderTraceCategories
					: [ 'devtools.timeline' ] ),
				...( traceScreenshots ? screenshotTraceCategories : [] ),
			] ),
		],
	};
}

function renderTraceEventsForKeyWindows( trace ) {
	return trace.traceEvents
		.filter(
			( item ) =>
				renderTraceEventNames.has( item.name ) &&
				( item.ph === 'X' || item.ph === 'I' || item.ph === 'i' )
		)
		.map( ( item ) => ( {
			name: item.name,
			category: item.cat,
			durationMs: item.dur ? item.dur / 1000 : 0,
			timestampMs: item.ts / 1000,
		} ) )
		.sort( ( a, b ) => a.timestampMs - b.timestampMs );
}

function renderTraceEventDeltasForKey( renderEvents, keydownTimestampMs ) {
	if ( ! renderEvents ) {
		return {};
	}

	const windowStartMs = keydownTimestampMs;
	const windowStopMs = keydownTimestampMs + renderTraceWindowMs;
	const eventsInWindow = renderEvents.filter(
		( event ) =>
			event.timestampMs >= windowStartMs &&
			event.timestampMs <= windowStopMs
	);
	const firstEvent = eventsInWindow[ 0 ];
	const totalDurationMs = eventsInWindow.reduce(
		( sum, event ) => sum + event.durationMs,
		0
	);

	function firstDeltaMs( names ) {
		const nameSet = Array.isArray( names ) ? new Set( names ) : null;
		const event = eventsInWindow.find( ( item ) =>
			nameSet ? nameSet.has( item.name ) : item.name === names
		);
		return event ? event.timestampMs - keydownTimestampMs : undefined;
	}

	return {
		renderFirstEventAfterKeydownName: firstEvent?.name,
		renderFirstEventAfterKeydownMs: firstEvent
			? firstEvent.timestampMs - keydownTimestampMs
			: undefined,
		renderTraceEventCountAfterKeydown: eventsInWindow.length,
		renderTraceEventDurationAfterKeydownMs: totalDurationMs,
		renderFirstBeginFrameAfterKeydownMs: firstDeltaMs( 'BeginFrame' ),
		renderFirstFireAnimationFrameAfterKeydownMs:
			firstDeltaMs( 'FireAnimationFrame' ),
		renderFirstUpdateLayoutTreeAfterKeydownMs:
			firstDeltaMs( 'UpdateLayoutTree' ),
		renderFirstLayoutAfterKeydownMs: firstDeltaMs( 'Layout' ),
		renderFirstPrePaintAfterKeydownMs: firstDeltaMs( 'PrePaint' ),
		renderFirstPaintAfterKeydownMs: firstDeltaMs( 'Paint' ),
		renderFirstLayerizeAfterKeydownMs: firstDeltaMs( 'Layerize' ),
		renderFirstCompositeLayersAfterKeydownMs:
			firstDeltaMs( 'CompositeLayers' ),
		renderFirstDrawFrameAfterKeydownMs: firstDeltaMs( 'DrawFrame' ),
	};
}

function screenshotHash( snapshot ) {
	if ( ! snapshot ) {
		return undefined;
	}
	return createHash( 'sha1' ).update( snapshot ).digest( 'hex' );
}

function screenshotTraceEventsForKeyWindows( trace ) {
	return trace.traceEvents
		.filter(
			( item ) =>
				item.name === 'Screenshot' &&
				typeof item.args?.snapshot === 'string'
		)
		.map( ( item ) => ( {
			durationMs: item.dur ? item.dur / 1000 : 0,
			snapshot: item.args.snapshot,
			snapshotBytes: item.args.snapshot.length,
			snapshotHash: screenshotHash( item.args.snapshot ),
			timestampMs: item.ts / 1000,
		} ) )
		.sort( ( a, b ) => a.timestampMs - b.timestampMs );
}

function screenshotTraceDeltasForKey( screenshotEvents, keydownTimestampMs ) {
	if ( ! screenshotEvents ) {
		return { metrics: {} };
	}

	const windowStartMs = keydownTimestampMs;
	const windowStopMs = keydownTimestampMs + screenshotTraceWindowMs;
	const previousScreenshot = screenshotEvents
		.filter( ( event ) => event.timestampMs < keydownTimestampMs )
		.at( -1 );
	const screenshotsInWindow = screenshotEvents.filter(
		( event ) =>
			event.timestampMs >= windowStartMs &&
			event.timestampMs <= windowStopMs
	);
	const firstScreenshot = screenshotsInWindow[ 0 ];
	const firstChangedScreenshot =
		previousScreenshot &&
		screenshotsInWindow.find(
			( event ) => event.snapshotHash !== previousScreenshot.snapshotHash
		);

	return {
		previousSnapshot: previousScreenshot?.snapshot,
		changedSnapshot: firstChangedScreenshot?.snapshot,
		metrics: {
			screenshotTraceEventCountAfterKeydown: screenshotsInWindow.length,
			screenshotPreviousBeforeKeydownMs: previousScreenshot
				? keydownTimestampMs - previousScreenshot.timestampMs
				: undefined,
			screenshotFirstAfterKeydownMs: firstScreenshot
				? firstScreenshot.timestampMs - keydownTimestampMs
				: undefined,
			screenshotFirstAfterKeydownHash: firstScreenshot?.snapshotHash,
			screenshotFirstAfterKeydownBytes: firstScreenshot?.snapshotBytes,
			screenshotFirstChangedAfterKeydownMs: firstChangedScreenshot
				? firstChangedScreenshot.timestampMs - keydownTimestampMs
				: undefined,
			screenshotFirstChangedAfterKeydownHash:
				firstChangedScreenshot?.snapshotHash,
			screenshotFirstChangedAfterKeydownBytes:
				firstChangedScreenshot?.snapshotBytes,
		},
	};
}

function eventListenerKeyboardDispatches( events ) {
	const dispatches = [];
	let currentDispatch = null;
	const listenerEvents = events
		.filter(
			( event ) =>
				[ 'keydown', 'keypress', 'keyup' ].includes( event.type ) &&
				typeof event.durationMs === 'number'
		)
		.sort( ( a, b ) => a.startedAtMs - b.startedAtMs );

	function flushDispatch() {
		if ( ! currentDispatch ) {
			return;
		}

		dispatches.push( {
			type: currentDispatch.type,
			timestampMs: currentDispatch.startedAtMs,
			durationMs:
				currentDispatch.stoppedAtMs - currentDispatch.startedAtMs,
			listenerDurationMs: currentDispatch.listenerDurationMs,
		} );
		currentDispatch = null;
	}

	for ( const event of listenerEvents ) {
		const startedAtMs = event.startedAtMs;
		const stoppedAtMs = startedAtMs + event.durationMs;
		const startsAfterCurrentDispatch =
			currentDispatch && startedAtMs > currentDispatch.stoppedAtMs + 2;

		if (
			! currentDispatch ||
			event.type !== currentDispatch.type ||
			startsAfterCurrentDispatch
		) {
			flushDispatch();
			currentDispatch = {
				type: event.type,
				startedAtMs,
				stoppedAtMs,
				listenerDurationMs: 0,
			};
		}

		currentDispatch.stoppedAtMs = Math.max(
			currentDispatch.stoppedAtMs,
			stoppedAtMs
		);
		currentDispatch.listenerDurationMs += event.durationMs;
	}

	flushDispatch();

	return dispatches;
}

async function dispatchCdpKeyPress( cdpSession, delayMs ) {
	const keyDownEvent = {
		modifiers: 0,
		windowsVirtualKeyCode: 88,
		code: 'KeyX',
		commands: [],
		key: 'x',
		text: 'x',
		unmodifiedText: 'x',
		autoRepeat: false,
		location: 0,
		isKeypad: false,
	};
	const keyUpEvent = {
		modifiers: 0,
		key: 'x',
		windowsVirtualKeyCode: 88,
		code: 'KeyX',
		location: 0,
	};

	await cdpSession.send( 'Input.dispatchKeyEvent', {
		type: 'keyDown',
		...keyDownEvent,
	} );
	await sleepMs( delayMs );
	await cdpSession.send( 'Input.dispatchKeyEvent', {
		type: 'keyUp',
		...keyUpEvent,
	} );
}

function traceEventsForKeyGaps( trace ) {
	const keyGroups = groupedKeyboardEvents( trace );
	const events = [];

	for ( let keyIndex = 1; keyIndex < keyGroups.length; keyIndex++ ) {
		const previousKeyup = keyGroups[ keyIndex - 1 ].keyup;
		const currentFirstKeydown = keyGroups[ keyIndex ].keydownEvents[ 0 ];
		const gapStartMs = previousKeyup.timestampMs + previousKeyup.durationMs;
		const gapStopMs = currentFirstKeydown.timestampMs;

		for ( const event of trace.traceEvents ) {
			const timestampMs = event.ts / 1000;
			const durationMs = ( event.dur || 0 ) / 1000;
			const eventStopMs = timestampMs + durationMs;

			if ( eventStopMs < gapStartMs || timestampMs > gapStopMs ) {
				continue;
			}

			events.push( {
				keyIndex,
				gapStartMs,
				gapStopMs,
				gapDurationMs: gapStopMs - gapStartMs,
				name: event.name,
				category: event.cat,
				phase: event.ph,
				timestampMs,
				durationMs,
				relativeStartMs: timestampMs - gapStartMs,
				argsType: event.args?.data?.type,
				argsFrame: event.args?.data?.frame,
				argsUrl: event.args?.data?.url,
			} );
		}
	}

	return events;
}

function benchmarkTimeoutMs() {
	const sampleCount = samplesPerDelay + throwawayPerDelay;
	const intentionalDelayMs =
		rounds *
		sampleCount *
		delays.reduce(
			( sum, delay ) =>
				sum +
				delay +
				( delayMode === 'hold-then-keyup-gap' ? postKeyupGapMs : 0 ),
			0
		);
	const settleMs = rounds * delays.length * settleBetweenDelayRunsMs;
	const preTypingWarmupAllowanceMs =
		rounds * delays.length * preTypingWarmupMs;
	const setupCount = freshEditorPerDelay ? rounds * delays.length : 1;
	const stateWaitMs =
		waitForPersistenceBetweenKeys || delayMode === 'after-persistence'
			? rounds * delays.length * sampleCount * 1500
			: 0;
	const setupAllowanceMs =
		20 * 60 * 1000 +
		setupCount *
			( 60 * 1000 +
				settleBeforeEditorSetupMs +
				settleAfterEditorSetupMs );

	return Math.max(
		intEnv( 'BENCHMARK_TIMEOUT_MS', 0 ),
		intentionalDelayMs * 2 +
			stateWaitMs +
			settleMs +
			preTypingWarmupAllowanceMs +
			setupAllowanceMs
	);
}

test.describe( 'Typing delay benchmark', () => {
	test.use( {
		perfUtils: async ( { page }, use ) => {
			await use( new PerfUtils( { page } ) );
		},
		metrics: async ( { page }, use ) => {
			await use( new Metrics( { page } ) );
		},
	} );

	test( scenario, async ( { admin, editor, metrics, page, perfUtils } ) => {
		test.setTimeout( benchmarkTimeoutMs() );

		if ( ! supportedScenarios.includes( scenario ) ) {
			throw new Error(
				`Unsupported BENCHMARK_SCENARIO: ${ scenario }. ` +
					`Supported scenarios: ${ supportedScenarios.join( ', ' ) }.`
			);
		}
		if ( ! supportedSetupStyles.includes( setupStyle ) ) {
			throw new Error(
				`Unsupported BENCHMARK_SETUP_STYLE: ${ setupStyle }. ` +
					`Supported styles: ${ supportedSetupStyles.join( ', ' ) }.`
			);
		}
		if (
			setupStyle === 'ci-post-editor-typing' &&
			scenario !== 'large-post-paragraph'
		) {
			throw new Error(
				'BENCHMARK_SETUP_STYLE=ci-post-editor-typing only supports ' +
					'BENCHMARK_SCENARIO=large-post-paragraph.'
			);
		}
		if (
			setupStyle === 'ci-post-editor-typing' &&
			! [ 'keyboard', 'between-keys' ].includes( delayMode )
		) {
			throw new Error(
				'BENCHMARK_SETUP_STYLE=ci-post-editor-typing only supports ' +
					'BENCHMARK_DELAY_MODE=keyboard or between-keys.'
			);
		}

		fs.mkdirSync( outputDir, { recursive: true } );

		async function setupEventListenerTracingInitScript() {
			if ( ! traceEventListeners ) {
				return;
			}

			await page.addInitScript( installEventListenerTracing );
			await page
				.evaluate( installEventListenerTracing )
				.catch( () => undefined );
		}

		async function setupEventListenerTracingInCurrentContext() {
			if ( ! traceEventListeners ) {
				return;
			}

			await page.evaluate( installEventListenerTracing );
		}

		async function resetEventListenerTracing() {
			if ( ! traceEventListeners ) {
				return;
			}

			await page.evaluate( () => {
				const windows = [ window ];
				for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
					try {
						if ( iframe.contentWindow ) {
							windows.push( iframe.contentWindow );
						}
					} catch {
						// Ignore inaccessible frames.
					}
				}

				for ( const currentWindow of windows ) {
					currentWindow.__typingBenchmarkEventListenerEvents = [];
				}
			} );
		}

		async function collectEventListenerEvents( startMs, stopMs ) {
			if ( ! traceEventListeners ) {
				return undefined;
			}

			return await page.evaluate(
				( {
					startMs: collectionStartMs,
					stopMs: collectionStopMs,
				} ) => {
					const windows = [ { name: 'parent', window } ];
					for ( const iframe of document.querySelectorAll(
						'iframe'
					) ) {
						try {
							if ( iframe.contentWindow ) {
								windows.push( {
									name: iframe.name || iframe.id || 'iframe',
									window: iframe.contentWindow,
								} );
							}
						} catch {
							// Ignore inaccessible frames.
						}
					}

					return windows.flatMap(
						( { name, window: currentWindow } ) =>
							(
								currentWindow.__typingBenchmarkEventListenerEvents ||
								[]
							)
								.filter(
									( event ) =>
										event.startedAtMs >=
											collectionStartMs - 5 &&
										event.startedAtMs <=
											collectionStopMs + 5
								)
								.map( ( event ) => ( {
									...event,
									windowName: name,
								} ) )
					);
				},
				{ startMs, stopMs }
			);
		}

		async function setupRichTextSpanTracingInitScript() {
			if ( ! traceRichTextSpans ) {
				return;
			}

			await page.addInitScript( installRichTextSpanTracing );
			await page
				.evaluate( installRichTextSpanTracing )
				.catch( () => undefined );
		}

		async function setupRichTextSpanTracingInCurrentContext() {
			if ( ! traceRichTextSpans ) {
				return;
			}

			await page.evaluate( installRichTextSpanTracing );
		}

		async function resetRichTextSpanTracing() {
			if ( ! traceRichTextSpans ) {
				return;
			}

			await page.evaluate( () => {
				const windows = [ window ];
				for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
					try {
						if ( iframe.contentWindow ) {
							windows.push( iframe.contentWindow );
						}
					} catch {
						// Ignore inaccessible frames.
					}
				}

				for ( const currentWindow of windows ) {
					currentWindow.__typingBenchmarkRichTextSpanEvents = [];
				}
			} );
		}

		async function setupDataSpanTracingInitScript() {
			if ( ! traceDataSpans ) {
				return;
			}

			await page.addInitScript( ( shouldTraceAllDataSpans ) => {
				window.__typingBenchmarkTraceAllDataSpans =
					shouldTraceAllDataSpans;
			}, traceAllDataSpans );
			await page.addInitScript( installDataSpanTracing );
			await page
				.evaluate( ( shouldTraceAllDataSpans ) => {
					window.__typingBenchmarkTraceAllDataSpans =
						shouldTraceAllDataSpans;
				}, traceAllDataSpans )
				.catch( () => undefined );
			await page
				.evaluate( installDataSpanTracing )
				.catch( () => undefined );
		}

		async function setupDataSpanTracingInCurrentContext() {
			if ( ! traceDataSpans ) {
				return;
			}

			await page.evaluate( ( shouldTraceAllDataSpans ) => {
				window.__typingBenchmarkTraceAllDataSpans =
					shouldTraceAllDataSpans;
			}, traceAllDataSpans );
			await page.evaluate( installDataSpanTracing );
		}

		async function resetDataSpanTracing() {
			if ( ! traceDataSpans ) {
				return;
			}

			await page.evaluate( () => {
				const windows = [ window ];
				for ( const iframe of document.querySelectorAll( 'iframe' ) ) {
					try {
						if ( iframe.contentWindow ) {
							windows.push( iframe.contentWindow );
						}
					} catch {
						// Ignore inaccessible frames.
					}
				}

				for ( const currentWindow of windows ) {
					currentWindow.__typingBenchmarkDataSpanEvents = [];
				}
			} );
		}

		async function setupVisualLatencyTracingInitScript() {
			if ( ! traceVisualLatency ) {
				return;
			}

			await page.addInitScript( installVisualLatencyTracing );
			await page
				.evaluate( installVisualLatencyTracing )
				.catch( () => undefined );
		}

		async function setupVisualLatencyTracingInCurrentContext() {
			if ( ! traceVisualLatency ) {
				return;
			}

			for ( const frame of page.frames() ) {
				await frame
					.evaluate( installVisualLatencyTracing )
					.catch( () => undefined );
			}
		}

		async function resetVisualLatencyTracing() {
			if ( ! traceVisualLatency ) {
				return;
			}

			await Promise.all(
				page.frames().map( ( frame ) =>
					frame
						.evaluate( () => {
							if (
								window.__typingBenchmarkResetVisualLatencyTracing
							) {
								window.__typingBenchmarkResetVisualLatencyTracing();
							} else {
								window.__typingBenchmarkVisualLatencyEvents =
									[];
							}
						} )
						.catch( () => undefined )
				)
			);
		}

		async function collectVisualLatencyEvents( startMs, stopMs ) {
			if ( ! traceVisualLatency ) {
				return undefined;
			}

			const frames = page.frames();
			const groups = await Promise.all(
				frames.map( async ( frame ) => ( {
					name:
						frame === page.mainFrame()
							? 'parent'
							: frame.name() || 'iframe',
					events: await frame
						.evaluate(
							( {
								startMs: collectionStartMs,
								stopMs: collectionStopMs,
							} ) =>
								(
									window.__typingBenchmarkVisualLatencyEvents ||
									[]
								).filter(
									( event ) =>
										event.keydownAtMs >=
											collectionStartMs - 5 &&
										event.keydownAtMs <=
											collectionStopMs + 100
								),
							{ startMs, stopMs }
						)
						.catch( () => [] ),
				} ) )
			);

			return groups.flatMap( ( { name, events } ) =>
				events.map( ( event ) => ( {
					...event,
					windowName: name,
				} ) )
			);
		}

		async function screenshotPixelDiffForSnapshots(
			previousSnapshot,
			changedSnapshot,
			targetBoundingBox,
			characterBoundingBox,
			viewportSize
		) {
			if (
				! traceScreenshotPixels ||
				! previousSnapshot ||
				! changedSnapshot ||
				! targetBoundingBox ||
				! viewportSize
			) {
				return {};
			}

			try {
				const sharp = ( await import( 'sharp' ) ).default;
				const snapshotBuffer = ( snapshot ) =>
					Buffer.from( snapshot.split( ',' ).at( -1 ), 'base64' );
				const decode = async ( snapshot ) => {
					const decoded = await sharp( snapshotBuffer( snapshot ) )
						.ensureAlpha()
						.raw()
						.toBuffer( { resolveWithObject: true } );

					return {
						data: decoded.data,
						width: decoded.info.width,
						height: decoded.info.height,
					};
				};

				const [ previousImage, changedImage ] = await Promise.all( [
					decode( previousSnapshot ),
					decode( changedSnapshot ),
				] );
				const width = Math.min(
					previousImage.width,
					changedImage.width
				);
				const height = Math.min(
					previousImage.height,
					changedImage.height
				);

				let changedPixelCount = 0;
				let minX = width;
				let minY = height;
				let maxX = -1;
				let maxY = -1;

				for ( let y = 0; y < height; y++ ) {
					for ( let x = 0; x < width; x++ ) {
						const offset = ( y * width + x ) * 4;
						const redDelta = Math.abs(
							previousImage.data[ offset ] -
								changedImage.data[ offset ]
						);
						const greenDelta = Math.abs(
							previousImage.data[ offset + 1 ] -
								changedImage.data[ offset + 1 ]
						);
						const blueDelta = Math.abs(
							previousImage.data[ offset + 2 ] -
								changedImage.data[ offset + 2 ]
						);
						if ( redDelta + greenDelta + blueDelta <= 60 ) {
							continue;
						}

						changedPixelCount++;
						minX = Math.min( minX, x );
						minY = Math.min( minY, y );
						maxX = Math.max( maxX, x );
						maxY = Math.max( maxY, y );
					}
				}

				if ( changedPixelCount === 0 ) {
					return {
						screenshotDiffImageWidth: width,
						screenshotDiffImageHeight: height,
						screenshotChangedPixelCount: 0,
						screenshotChangedPixelRatio: 0,
						screenshotChangedBoxOverlapsTarget: false,
					};
				}

				const changedBoxArea =
					( maxX - minX + 1 ) * ( maxY - minY + 1 );
				const centerX = ( minX + maxX ) / 2;
				const centerY = ( minY + maxY ) / 2;
				const scaleX = width / viewportSize.width;
				const scaleY = height / viewportSize.height;
				const overlapMetricsForBox = ( box ) => {
					if ( ! box ) {
						return undefined;
					}

					const boxMinX = box.x * scaleX;
					const boxMinY = box.y * scaleY;
					const boxMaxX = ( box.x + box.width ) * scaleX;
					const boxMaxY = ( box.y + box.height ) * scaleY;
					const overlapMinX = Math.max( minX, boxMinX );
					const overlapMinY = Math.max( minY, boxMinY );
					const overlapMaxX = Math.min( maxX, boxMaxX );
					const overlapMaxY = Math.min( maxY, boxMaxY );
					const overlapWidth = Math.max(
						0,
						overlapMaxX - overlapMinX
					);
					const overlapHeight = Math.max(
						0,
						overlapMaxY - overlapMinY
					);
					const overlapArea = overlapWidth * overlapHeight;

					return {
						overlapArea,
						overlapRatio: overlapArea / changedBoxArea,
						overlaps: overlapArea > 0,
						centerInBox:
							centerX >= boxMinX &&
							centerX <= boxMaxX &&
							centerY >= boxMinY &&
							centerY <= boxMaxY,
					};
				};
				const targetOverlap = overlapMetricsForBox( targetBoundingBox );
				const characterOverlap =
					overlapMetricsForBox( characterBoundingBox );

				return {
					screenshotDiffImageWidth: width,
					screenshotDiffImageHeight: height,
					screenshotChangedPixelCount: changedPixelCount,
					screenshotChangedPixelRatio:
						changedPixelCount / ( width * height ),
					screenshotChangedMinX: minX,
					screenshotChangedMinY: minY,
					screenshotChangedMaxX: maxX,
					screenshotChangedMaxY: maxY,
					screenshotChangedBoxArea: changedBoxArea,
					screenshotChangedBoxOverlapTargetArea:
						targetOverlap.overlapArea,
					screenshotChangedBoxOverlapTargetRatio:
						targetOverlap.overlapRatio,
					screenshotChangedBoxOverlapsTarget: targetOverlap.overlaps,
					screenshotChangedBoxCenterInTarget:
						targetOverlap.centerInBox,
					screenshotChangedBoxOverlapCharacterArea:
						characterOverlap?.overlapArea,
					screenshotChangedBoxOverlapCharacterRatio:
						characterOverlap?.overlapRatio,
					screenshotChangedBoxOverlapsCharacter:
						characterOverlap?.overlaps,
					screenshotChangedBoxCenterInCharacter:
						characterOverlap?.centerInBox,
				};
			} catch ( error ) {
				return {
					screenshotPixelDiffFailed: true,
					screenshotPixelDiffError: error.message,
				};
			}
		}

		async function setupPersistenceTracing() {
			if ( ! tracePersistence ) {
				return;
			}

			await page.evaluate( () => {
				if ( ! window.wp?.data?.select ) {
					window.__typingBenchmarkPersistenceEvents =
						window.__typingBenchmarkPersistenceEvents || [];
					window.__typingBenchmarkPersistenceUnsubscribe?.();
					window.__typingBenchmarkPersistenceUnsubscribe = null;
					return;
				}

				const select = window.wp.data.select( 'core/block-editor' );
				window.__typingBenchmarkPersistenceEvents = [];
				window.__typingBenchmarkPersistenceUnsubscribe?.();

				let previous = {
					isPersistent: select.isLastBlockChangePersistent(),
					isTyping: select.isTyping(),
				};

				window.__typingBenchmarkPersistenceUnsubscribe =
					window.wp.data.subscribe( () => {
						const next = {
							isPersistent: select.isLastBlockChangePersistent(),
							isTyping: select.isTyping(),
						};

						if (
							next.isPersistent === previous.isPersistent &&
							next.isTyping === previous.isTyping
						) {
							return;
						}

						window.__typingBenchmarkPersistenceEvents.push( {
							nowMs: performance.now(),
							...next,
						} );
						previous = next;
					}, 'core/block-editor' );
			} );
		}

		let externalCpuBurnerExposed = false;
		let externalPersistentProcess = null;
		let externalBackgroundProcesses = [];
		function ensureExternalPersistentProcess() {
			if ( externalPersistentProcess ) {
				return externalPersistentProcess;
			}

			const source = `
process.on('message', ({ durationMs, processMode }) => {
	if (processMode === 'delay') {
		setTimeout(() => {}, durationMs);
		return;
	}
	const stop = Date.now() + durationMs;
	while (Date.now() < stop) Math.sqrt(Math.random());
});
process.on('disconnect', () => process.exit(0));
setInterval(() => {}, 2147483647);
`;
			externalPersistentProcess = spawn(
				process.execPath,
				[ '-e', source ],
				{ stdio: [ 'ignore', 'ignore', 'ignore', 'ipc' ] }
			);
			return externalPersistentProcess;
		}

		function ensureExternalBackgroundProcesses(
			processMode,
			count,
			priorityMode = 'normal'
		) {
			if ( externalBackgroundProcesses.length > 0 ) {
				return externalBackgroundProcesses;
			}

			const source =
				processMode === 'cpu'
					? 'while (true) Math.sqrt(Math.random());'
					: 'setInterval(() => {}, 2147483647);';
			let command = process.execPath;
			let args = [ '-e', source ];
			if ( priorityMode === 'nice' ) {
				command = '/usr/bin/nice';
				args = [ '-n', '20', process.execPath, '-e', source ];
			} else if ( priorityMode === 'taskpolicy-background' ) {
				command = '/usr/sbin/taskpolicy';
				args = [ '-b', process.execPath, '-e', source ];
			} else if ( priorityMode.startsWith( 'taskpolicy-qos-' ) ) {
				command = '/usr/sbin/taskpolicy';
				args = [
					'-c',
					priorityMode.replace( 'taskpolicy-qos-', '' ),
					process.execPath,
					'-e',
					source,
				];
			} else if ( priorityMode.startsWith( 'taskpolicy-latency-' ) ) {
				command = '/usr/sbin/taskpolicy';
				args = [
					'-l',
					priorityMode.replace( 'taskpolicy-latency-', '' ),
					process.execPath,
					'-e',
					source,
				];
			} else if ( priorityMode.startsWith( 'taskpolicy-throughput-' ) ) {
				command = '/usr/sbin/taskpolicy';
				args = [
					'-t',
					priorityMode.replace( 'taskpolicy-throughput-', '' ),
					process.execPath,
					'-e',
					source,
				];
			}
			externalBackgroundProcesses = Array.from( { length: count }, () => {
				const child = spawn( command, args, { stdio: 'ignore' } );
				child.on( 'error', ( error ) => {
					// Surface setup failures in the Playwright process instead of
					// silently running the intended CPU-control case without CPU work.
					throw error;
				} );
				return child;
			} );
			process.once( 'exit', () => {
				for ( const child of externalBackgroundProcesses ) {
					child.kill();
				}
			} );
			return externalBackgroundProcesses;
		}

		function cleanupExternalPersistentProcess() {
			if ( externalPersistentProcess ) {
				externalPersistentProcess.kill();
				externalPersistentProcess = null;
			}
			if ( externalBackgroundProcesses.length > 0 ) {
				for ( const child of externalBackgroundProcesses ) {
					child.kill();
				}
				externalBackgroundProcesses = [];
			}
		}

		async function setupMarkPersistentIntervention() {
			if (
				markPersistentIntervention === 'normal' ||
				isNativeScenario()
			) {
				return null;
			}

			if (
				markPersistentIntervention.startsWith( 'external-persistent-' )
			) {
				ensureExternalPersistentProcess();
			}
			if (
				markPersistentIntervention === 'external-background-cpu-noop'
			) {
				ensureExternalBackgroundProcesses( 'cpu', 1 );
			}
			if (
				markPersistentIntervention === 'external-background-cpu-2-noop'
			) {
				ensureExternalBackgroundProcesses( 'cpu', 2 );
			}
			if (
				markPersistentIntervention === 'external-background-cpu-4-noop'
			) {
				ensureExternalBackgroundProcesses( 'cpu', 4 );
			}
			if (
				markPersistentIntervention === 'external-background-cpu-8-noop'
			) {
				ensureExternalBackgroundProcesses( 'cpu', 8 );
			}
			if (
				markPersistentIntervention ===
				'external-background-nice-cpu-noop'
			) {
				ensureExternalBackgroundProcesses( 'cpu', 1, 'nice' );
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-cpu-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					'taskpolicy-background'
				);
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-cpu-4-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					4,
					'taskpolicy-background'
				);
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-cpu-8-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					8,
					'taskpolicy-background'
				);
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-utility-cpu-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					'taskpolicy-qos-utility'
				);
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-qos-background-cpu-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					'taskpolicy-qos-background'
				);
			}
			if (
				markPersistentIntervention ===
				'external-background-taskpolicy-maintenance-cpu-noop'
			) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					'taskpolicy-qos-maintenance'
				);
			}
			const latencyTierMatch = markPersistentIntervention.match(
				/^external-background-taskpolicy-latency-(\d+)-cpu-noop$/
			);
			if ( latencyTierMatch ) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					`taskpolicy-latency-${ latencyTierMatch[ 1 ] }`
				);
			}
			const throughputTierMatch = markPersistentIntervention.match(
				/^external-background-taskpolicy-throughput-(\d+)-cpu-noop$/
			);
			if ( throughputTierMatch ) {
				ensureExternalBackgroundProcesses(
					'cpu',
					1,
					`taskpolicy-throughput-${ throughputTierMatch[ 1 ] }`
				);
			}
			if (
				markPersistentIntervention === 'external-background-idle-noop'
			) {
				ensureExternalBackgroundProcesses( 'idle', 1 );
			}

			if (
				markPersistentIntervention.startsWith( 'external-' ) &&
				! externalCpuBurnerExposed
			) {
				await page.exposeFunction(
					'__typingBenchmarkStartExternalProcess',
					( { durationMs, processMode, persistent } ) => {
						if ( persistent ) {
							ensureExternalPersistentProcess().send( {
								durationMs,
								processMode,
							} );
							return;
						}

						const source =
							processMode === 'delay'
								? 'const duration=Number(process.argv[1]); setTimeout(() => process.exit(0), duration);'
								: 'const duration=Number(process.argv[1]); const stop=Date.now()+duration; while (Date.now()<stop) Math.sqrt(Math.random());';
						const child = spawn(
							process.execPath,
							[ '-e', source, String( durationMs ) ],
							{
								stdio: 'ignore',
								detached: true,
							}
						);
						child.unref();
					}
				);
				externalCpuBurnerExposed = true;
			}

			return await page.evaluate(
				( { mode } ) => {
					const actions =
						window.wp?.data?.dispatch?.( 'core/block-editor' );
					const select =
						window.wp?.data?.select?.( 'core/block-editor' );
					let rawDispatch = null;
					if ( mode === 'raw-unknown-action' ) {
						rawDispatch =
							window.__typingBenchmarkRawStoreDispatch || null;
						if (
							! rawDispatch &&
							typeof window.wp?.data?.use === 'function'
						) {
							const registry = window.wp.data.use(
								( dataRegistry ) => ( {
									__typingBenchmarkRawStoreDispatch(
										storeName,
										action
									) {
										return dataRegistry.stores?.[
											storeName
										]?.store?.dispatch?.( action );
									},
								} )
							);
							rawDispatch =
								registry?.__typingBenchmarkRawStoreDispatch ||
								null;
							window.__typingBenchmarkRawStoreDispatch =
								rawDispatch;
						}
					}

					if (
						! actions ||
						! select ||
						typeof actions.__unstableMarkLastChangeAsPersistent !==
							'function' ||
						( [
							'mark-next-not-persistent',
							'mark-last-then-mark-next-not-persistent',
						].includes( mode ) &&
							typeof actions.__unstableMarkNextChangeAsNotPersistent !==
								'function' ) ||
						( [
							'stop-typing',
							'start-typing',
							'stop-start-typing',
							'stop-start-typing-then-busy-wait-150',
						].includes( mode ) &&
							( typeof actions.stopTyping !== 'function' ||
								typeof actions.startTyping !== 'function' ) ) ||
						( mode === 'toggle-selection' &&
							typeof actions.toggleSelection !== 'function' ) ||
						( mode === 'toggle-template-validity' &&
							typeof actions.setTemplateValidity !==
								'function' ) ||
						( mode === 'toggle-block-highlight' &&
							typeof actions.toggleBlockHighlight !==
								'function' ) ||
						( mode === 'raw-unknown-action' &&
							typeof rawDispatch !== 'function' )
					) {
						return { installed: false, reason: 'missing-actions' };
					}

					if (
						! actions.__typingBenchmarkOriginalMarkLastChangeAsPersistent
					) {
						Object.defineProperty(
							actions,
							'__typingBenchmarkOriginalMarkLastChangeAsPersistent',
							{
								value: actions.__unstableMarkLastChangeAsPersistent,
								enumerable: false,
							}
						);
					}

					const original =
						actions.__typingBenchmarkOriginalMarkLastChangeAsPersistent;
					window.__typingBenchmarkMarkPersistentInterventionEvents =
						[];

					function blockEditorSnapshot() {
						const snapshot = {};
						for ( const [ key, selectorName ] of [
							[ 'isPersistent', 'isLastBlockChangePersistent' ],
							[ 'isTyping', 'isTyping' ],
							[ 'blockCount', 'getBlockCount' ],
							[
								'selectedBlockClientId',
								'getSelectedBlockClientId',
							],
							[ 'selectedBlockName', 'getSelectedBlockName' ],
						] ) {
							try {
								if (
									typeof select[ selectorName ] === 'function'
								) {
									snapshot[ key ] = select[ selectorName ]();
								}
							} catch {
								snapshot[ key ] = null;
							}
						}

						return snapshot;
					}

					actions.__unstableMarkLastChangeAsPersistent =
						function intervenedMarkLastChangeAsPersistent() {
							const before = blockEditorSnapshot();
							const start = performance.now();
							let status = 'returned';
							let result;

							function busyWait( durationMs ) {
								const stopAt = performance.now() + durationMs;
								while ( performance.now() < stopAt ) {}
							}

							function startWorkerBusyWait( durationMs ) {
								const startedAtMs = performance.now();
								const source = `
							self.onmessage = ( event ) => {
								const stopAt = performance.now() + event.data.durationMs;
								while ( performance.now() < stopAt ) {}
								self.postMessage( {} );
							};
						`;
								const url = URL.createObjectURL(
									new Blob( [ source ], {
										type: 'text/javascript',
									} )
								);
								const worker = new Worker( url );
								worker.onmessage = () => {
									const finishedAtMs = performance.now();
									worker.terminate();
									URL.revokeObjectURL( url );
									window.__typingBenchmarkMarkPersistentInterventionEvents.push(
										{
											nowMs: startedAtMs,
											durationMs:
												finishedAtMs - startedAtMs,
											mode,
											status: 'worker-returned',
											before,
											after: blockEditorSnapshot(),
										}
									);
								};
								worker.postMessage( { durationMs } );
							}

							function startWorkerBusyWaitNoMessage(
								durationMs
							) {
								const startedAtMs = performance.now();
								const source = `
							self.onmessage = ( event ) => {
								const stopAt = performance.now() + event.data.durationMs;
								while ( performance.now() < stopAt ) {}
								self.close();
							};
						`;
								const url = URL.createObjectURL(
									new Blob( [ source ], {
										type: 'text/javascript',
									} )
								);
								const worker = new Worker( url );
								worker.postMessage( { durationMs } );
								window.__typingBenchmarkMarkPersistentInterventionEvents.push(
									{
										nowMs: startedAtMs,
										durationMs,
										mode,
										status: 'worker-started-no-message',
										before,
										after: blockEditorSnapshot(),
									}
								);
							}

							function startWorkerDelayNoMessage( delayMs ) {
								const startedAtMs = performance.now();
								const source = `
							self.onmessage = ( event ) => {
								setTimeout( () => self.close(), event.data.delayMs );
							};
						`;
								const url = URL.createObjectURL(
									new Blob( [ source ], {
										type: 'text/javascript',
									} )
								);
								const worker = new Worker( url );
								worker.postMessage( { delayMs } );
								window.__typingBenchmarkMarkPersistentInterventionEvents.push(
									{
										nowMs: startedAtMs,
										durationMs: delayMs,
										mode,
										status: 'worker-delay-no-message',
										before,
										after: blockEditorSnapshot(),
									}
								);
							}

							function startWorkerDelay( delayMs ) {
								const startedAtMs = performance.now();
								const source = `
							self.onmessage = ( event ) => {
								setTimeout( () => self.postMessage( {} ), event.data.delayMs );
							};
						`;
								const url = URL.createObjectURL(
									new Blob( [ source ], {
										type: 'text/javascript',
									} )
								);
								const worker = new Worker( url );
								worker.onmessage = () => {
									const finishedAtMs = performance.now();
									worker.terminate();
									URL.revokeObjectURL( url );
									window.__typingBenchmarkMarkPersistentInterventionEvents.push(
										{
											nowMs: startedAtMs,
											durationMs:
												finishedAtMs - startedAtMs,
											mode,
											status: 'worker-delay-returned',
											before,
											after: blockEditorSnapshot(),
										}
									);
								};
								worker.postMessage( { delayMs } );
							}

							function startDelayedNoop( delayMs ) {
								const startedAtMs = performance.now();
								window.setTimeout( () => {
									window.__typingBenchmarkMarkPersistentInterventionEvents.push(
										{
											nowMs: startedAtMs,
											durationMs:
												performance.now() - startedAtMs,
											mode,
											status: 'delayed-noop-returned',
											before,
											after: blockEditorSnapshot(),
										}
									);
								}, delayMs );
							}

							function startExternalProcessNoMessage(
								durationMs,
								processMode,
								persistent = false
							) {
								const startedAtMs = performance.now();
								window.__typingBenchmarkStartExternalProcess?.(
									{
										durationMs,
										processMode,
										persistent,
									}
								);
								window.__typingBenchmarkMarkPersistentInterventionEvents.push(
									{
										nowMs: startedAtMs,
										durationMs,
										mode,
										status: `external-${
											persistent ? 'persistent-' : ''
										}${ processMode }-started`,
										before,
										after: blockEditorSnapshot(),
									}
								);
							}

							function durationForMode( durationsByMode ) {
								const durationMs = durationsByMode[ mode ];
								if ( durationMs === undefined ) {
									throw new Error(
										`Missing duration for mode: ${ mode }`
									);
								}
								return durationMs;
							}

							try {
								if ( mode === 'noop' ) {
									result = undefined;
								} else if (
									mode === 'noop-then-busy-wait-150'
								) {
									busyWait( 150 );
									result = undefined;
								} else if ( mode === 'worker-busy-wait-150' ) {
									startWorkerBusyWait( 150 );
									result = undefined;
								} else if (
									mode === 'worker-busy-wait-20-no-message' ||
									mode === 'worker-busy-wait-40-no-message' ||
									mode === 'worker-busy-wait-80-no-message'
								) {
									startWorkerBusyWaitNoMessage(
										durationForMode( {
											'worker-busy-wait-20-no-message': 20,
											'worker-busy-wait-40-no-message': 40,
											'worker-busy-wait-80-no-message': 80,
										} )
									);
									result = undefined;
								} else if (
									mode === 'worker-busy-wait-150-no-message'
								) {
									startWorkerBusyWaitNoMessage( 150 );
									result = undefined;
								} else if ( mode === 'worker-delay-150' ) {
									startWorkerDelay( 150 );
									result = undefined;
								} else if (
									mode === 'worker-delay-150-no-message'
								) {
									startWorkerDelayNoMessage( 150 );
									result = undefined;
								} else if (
									mode === 'external-cpu-20-no-message' ||
									mode === 'external-cpu-40-no-message' ||
									mode === 'external-cpu-80-no-message' ||
									mode === 'external-cpu-150-no-message'
								) {
									startExternalProcessNoMessage(
										durationForMode( {
											'external-cpu-20-no-message': 20,
											'external-cpu-40-no-message': 40,
											'external-cpu-80-no-message': 80,
											'external-cpu-150-no-message': 150,
										} ),
										'cpu'
									);
									result = undefined;
								} else if (
									mode === 'external-delay-150-no-message'
								) {
									startExternalProcessNoMessage(
										150,
										'delay'
									);
									result = undefined;
								} else if (
									mode ===
										'external-persistent-cpu-20-no-message' ||
									mode ===
										'external-persistent-cpu-40-no-message' ||
									mode ===
										'external-persistent-cpu-80-no-message' ||
									mode ===
										'external-persistent-cpu-150-no-message'
								) {
									startExternalProcessNoMessage(
										durationForMode( {
											'external-persistent-cpu-20-no-message': 20,
											'external-persistent-cpu-40-no-message': 40,
											'external-persistent-cpu-80-no-message': 80,
											'external-persistent-cpu-150-no-message': 150,
										} ),
										'cpu',
										true
									);
									result = undefined;
								} else if (
									mode ===
									'external-persistent-delay-150-no-message'
								) {
									startExternalProcessNoMessage(
										150,
										'delay',
										true
									);
									result = undefined;
								} else if (
									mode === 'external-background-cpu-noop' ||
									mode === 'external-background-cpu-2-noop' ||
									mode === 'external-background-cpu-4-noop' ||
									mode === 'external-background-cpu-8-noop' ||
									mode ===
										'external-background-nice-cpu-noop' ||
									mode ===
										'external-background-taskpolicy-cpu-noop' ||
									mode ===
										'external-background-taskpolicy-cpu-4-noop' ||
									mode ===
										'external-background-taskpolicy-cpu-8-noop' ||
									mode ===
										'external-background-taskpolicy-utility-cpu-noop' ||
									mode ===
										'external-background-taskpolicy-qos-background-cpu-noop' ||
									mode ===
										'external-background-taskpolicy-maintenance-cpu-noop' ||
									mode.startsWith(
										'external-background-taskpolicy-latency-'
									) ||
									mode.startsWith(
										'external-background-taskpolicy-throughput-'
									) ||
									mode === 'external-background-idle-noop'
								) {
									result = undefined;
								} else if ( mode === 'delayed-noop-150' ) {
									startDelayedNoop( 150 );
									result = undefined;
								} else if ( mode === 'raw-unknown-action' ) {
									result = rawDispatch( 'core/block-editor', {
										type: 'TYPING_BENCHMARK_UNKNOWN_ACTION',
										nowMs: start,
									} );
								} else if (
									mode === 'mark-next-not-persistent'
								) {
									result =
										actions.__unstableMarkNextChangeAsNotPersistent();
								} else if (
									mode ===
									'mark-last-then-mark-next-not-persistent'
								) {
									result = original.apply( this, arguments );
									actions.__unstableMarkNextChangeAsNotPersistent();
								} else if (
									mode === 'normal-then-busy-wait-150'
								) {
									result = original.apply( this, arguments );
									busyWait( 150 );
								} else if (
									mode === 'busy-wait-20' ||
									mode === 'busy-wait-40'
								) {
									busyWait(
										mode === 'busy-wait-40' ? 40 : 20
									);
									result = undefined;
								} else if ( mode === 'toggle-selection' ) {
									actions.toggleSelection( false );
									result = actions.toggleSelection( true );
								} else if (
									mode === 'toggle-template-validity'
								) {
									actions.setTemplateValidity( false );
									result =
										actions.setTemplateValidity( true );
								} else if (
									mode === 'toggle-block-highlight'
								) {
									const clientId =
										select.getSelectedBlockClientId?.();
									actions.toggleBlockHighlight(
										clientId,
										true
									);
									result = actions.toggleBlockHighlight(
										clientId,
										false
									);
								} else if ( mode === 'stop-typing' ) {
									result = actions.stopTyping();
								} else if ( mode === 'start-typing' ) {
									result = actions.startTyping();
								} else if ( mode === 'stop-start-typing' ) {
									actions.stopTyping();
									result = actions.startTyping();
								} else if (
									mode ===
									'stop-start-typing-then-busy-wait-150'
								) {
									actions.stopTyping();
									result = actions.startTyping();
									busyWait( 150 );
								} else {
									result = original.apply( this, arguments );
								}
							} catch ( error ) {
								status = 'threw';
								throw error;
							} finally {
								window.__typingBenchmarkMarkPersistentInterventionEvents.push(
									{
										nowMs: start,
										durationMs: performance.now() - start,
										mode,
										status,
										before,
										after: blockEditorSnapshot(),
									}
								);
							}

							return result;
						};

					return { installed: true, mode };
				},
				{ mode: markPersistentIntervention }
			);
		}

		async function setupDataTracing() {
			if ( ! traceData ) {
				await resetEventListenerTracing();
				await resetRichTextSpanTracing();
				await resetDataSpanTracing();
				return;
			}

			return await page.evaluate( () => {
				const keyboardEventTypes = [
					'keydown',
					'keypress',
					'beforeinput',
					'input',
					'keyup',
					'selectionchange',
				];
				window.__typingBenchmarkBrowserEvents = [];
				window.__typingBenchmarkDataEvents = [];
				window.__typingBenchmarkDataInstrumentation = [];
				window.__typingBenchmarkEventListenerEvents = [];
				window.__typingBenchmarkRichTextSpanEvents = [];
				window.__typingBenchmarkDataSpanEvents = [];
				window.__typingBenchmarkBrowserUnsubscribers?.forEach(
					( unsubscribe ) => unsubscribe()
				);
				window.__typingBenchmarkBrowserUnsubscribers = [];

				function blockEditorSnapshot() {
					const select =
						window.wp?.data?.select?.( 'core/block-editor' );

					if ( ! select ) {
						return window.__typingBenchmarkNativeState || {};
					}

					const snapshot = {};
					for ( const [ key, selectorName ] of [
						[ 'isPersistent', 'isLastBlockChangePersistent' ],
						[ 'isTyping', 'isTyping' ],
						[ 'blockCount', 'getBlockCount' ],
						[ 'selectedBlockClientId', 'getSelectedBlockClientId' ],
						[ 'selectedBlockName', 'getSelectedBlockName' ],
					] ) {
						try {
							if (
								typeof select[ selectorName ] === 'function'
							) {
								snapshot[ key ] = select[ selectorName ]();
							}
						} catch {
							snapshot[ key ] = null;
						}
					}

					return snapshot;
				}

				const documents = [
					{ name: 'parent', document: window.document },
					{
						name: 'editor-canvas',
						document: window.document.querySelector(
							'iframe[name="editor-canvas"]'
						)?.contentDocument,
					},
				].filter( ( { document } ) => !! document );

				for ( const eventType of keyboardEventTypes ) {
					for ( const { name, document } of documents ) {
						const listener = ( event ) => {
							window.__typingBenchmarkBrowserEvents.push( {
								nowMs: performance.now(),
								documentName: name,
								type: event.type,
								key: event.key,
								code: event.code,
								repeat: event.repeat,
								isComposing: event.isComposing,
								isTrusted: event.isTrusted,
								location: event.location,
								keyCode: event.keyCode,
								charCode: event.charCode,
								which: event.which,
								altKey: event.altKey,
								ctrlKey: event.ctrlKey,
								metaKey: event.metaKey,
								shiftKey: event.shiftKey,
								cancelable: event.cancelable,
								defaultPrevented: event.defaultPrevented,
								inputType: event.inputType,
								data: event.data,
								targetTagName: event.target?.tagName,
								targetRole:
									event.target?.getAttribute?.( 'role' ),
								...blockEditorSnapshot(),
							} );
						};
						listener.__typingBenchmarkIgnoreListener = true;

						document.addEventListener( eventType, listener, true );
						window.__typingBenchmarkBrowserUnsubscribers.push( () =>
							document.removeEventListener(
								eventType,
								listener,
								true
							)
						);
					}
				}

				for ( const storeName of [
					'core/block-editor',
					'core/editor',
					'core/edit-post',
					'core/preferences',
					'core/interface',
					'core/data',
				] ) {
					const actions = window.wp?.data?.dispatch?.( storeName );

					if ( ! actions ) {
						continue;
					}

					if ( ! actions.__typingBenchmarkOriginalActions ) {
						Object.defineProperty(
							actions,
							'__typingBenchmarkOriginalActions',
							{
								value: {},
								enumerable: false,
							}
						);
					}

					const originalActions =
						actions.__typingBenchmarkOriginalActions;
					const wrappedActionNames = [];

					for ( const actionName of Object.keys( actions ) ) {
						if ( typeof actions[ actionName ] !== 'function' ) {
							continue;
						}

						if ( originalActions[ actionName ] ) {
							wrappedActionNames.push( actionName );
							continue;
						}

						originalActions[ actionName ] = actions[ actionName ];
						wrappedActionNames.push( actionName );
						actions[ actionName ] = function tracedAction() {
							const before = blockEditorSnapshot();
							const start = performance.now();
							let status = 'returned';
							let result;

							try {
								result = originalActions[ actionName ].apply(
									this,
									arguments
								);
							} catch ( error ) {
								status = 'threw';
								throw error;
							} finally {
								const stop = performance.now();
								window.__typingBenchmarkDataEvents.push( {
									nowMs: start,
									durationMs: stop - start,
									storeName,
									actionName,
									status,
									returnedPromise:
										typeof result?.then === 'function',
									before,
									after: blockEditorSnapshot(),
								} );
							}

							return result;
						};
					}

					window.__typingBenchmarkDataInstrumentation.push( {
						storeName,
						actionCount: wrappedActionNames.length,
						wrappedActionNames,
					} );
				}

				return window.__typingBenchmarkDataInstrumentation;
			} );
		}

		async function setupTimerTracing() {
			if ( ! traceTimers && ! traceSchedulers ) {
				return;
			}

			await page.evaluate(
				( { timeoutRewriteMs, shouldTraceSchedulers } ) => {
					if ( ! window.__typingBenchmarkOriginalSetTimeout ) {
						window.__typingBenchmarkOriginalSetTimeout =
							window.setTimeout.bind( window );
					}
					if ( ! window.__typingBenchmarkOriginalClearTimeout ) {
						window.__typingBenchmarkOriginalClearTimeout =
							window.clearTimeout.bind( window );
					}
					if (
						! window.__typingBenchmarkOriginalRequestAnimationFrame
					) {
						window.__typingBenchmarkOriginalRequestAnimationFrame =
							window.requestAnimationFrame?.bind( window );
					}
					if (
						! window.__typingBenchmarkOriginalCancelAnimationFrame
					) {
						window.__typingBenchmarkOriginalCancelAnimationFrame =
							window.cancelAnimationFrame?.bind( window );
					}
					if (
						! window.__typingBenchmarkOriginalRequestIdleCallback
					) {
						window.__typingBenchmarkOriginalRequestIdleCallback =
							window.requestIdleCallback?.bind( window );
					}
					if (
						! window.__typingBenchmarkOriginalCancelIdleCallback
					) {
						window.__typingBenchmarkOriginalCancelIdleCallback =
							window.cancelIdleCallback?.bind( window );
					}

					const originalSetTimeout =
						window.__typingBenchmarkOriginalSetTimeout;
					const originalClearTimeout =
						window.__typingBenchmarkOriginalClearTimeout;
					const originalRequestAnimationFrame =
						window.__typingBenchmarkOriginalRequestAnimationFrame;
					const originalCancelAnimationFrame =
						window.__typingBenchmarkOriginalCancelAnimationFrame;
					const originalRequestIdleCallback =
						window.__typingBenchmarkOriginalRequestIdleCallback;
					const originalCancelIdleCallback =
						window.__typingBenchmarkOriginalCancelIdleCallback;

					window.__typingBenchmarkTimerEvents = [];
					window.__typingBenchmarkSchedulerEvents = [];
					let schedulerEventId = 0;

					function callbackSource( callback ) {
						return typeof callback === 'function'
							? Function.prototype.toString
									.call( callback )
									.slice( 0, 240 )
							: String( callback ).slice( 0, 240 );
					}

					function stackTrace() {
						return new Error().stack?.slice( 0, 1000 );
					}

					window.setTimeout = ( callback, timeout, ...args ) => {
						const requestedTimeoutMs = Number( timeout );
						const shouldRewrite =
							timeoutRewriteMs !== null &&
							requestedTimeoutMs === 1000;
						const event = {
							id: ++schedulerEventId,
							type: 'setTimeout',
							scheduledAtMs: performance.now(),
							requestedTimeoutMs,
							effectiveTimeoutMs: shouldRewrite
								? timeoutRewriteMs
								: requestedTimeoutMs,
							rewritten: shouldRewrite,
							callbackSource: callbackSource( callback ),
							stack: stackTrace(),
						};
						window.__typingBenchmarkTimerEvents.push( event );
						if ( shouldTraceSchedulers ) {
							window.__typingBenchmarkSchedulerEvents.push(
								event
							);
						}

						const wrappedCallback =
							typeof callback === 'function'
								? function wrappedTypingBenchmarkTimer(
										...callbackArgs
								  ) {
										event.firedAtMs = performance.now();
										try {
											return callback.apply(
												this,
												callbackArgs
											);
										} finally {
											event.finishedAtMs =
												performance.now();
										}
								  }
								: callback;

						const timeoutId = originalSetTimeout(
							wrappedCallback,
							shouldRewrite ? timeoutRewriteMs : timeout,
							...args
						);
						event.nativeId = Number( timeoutId );
						return timeoutId;
					};

					window.clearTimeout = ( timeoutId ) => {
						const numericTimeoutId = Number( timeoutId );
						for (
							let i =
								window.__typingBenchmarkTimerEvents.length - 1;
							i >= 0;
							i--
						) {
							const event =
								window.__typingBenchmarkTimerEvents[ i ];
							if (
								event.nativeId === numericTimeoutId &&
								event.clearedAtMs === undefined
							) {
								event.clearedAtMs = performance.now();
								break;
							}
						}
						return originalClearTimeout( timeoutId );
					};

					if (
						shouldTraceSchedulers &&
						originalRequestAnimationFrame
					) {
						window.requestAnimationFrame = ( callback ) => {
							const event = {
								id: ++schedulerEventId,
								type: 'requestAnimationFrame',
								scheduledAtMs: performance.now(),
								callbackSource: callbackSource( callback ),
								stack: stackTrace(),
							};
							window.__typingBenchmarkSchedulerEvents.push(
								event
							);

							const frameId = originalRequestAnimationFrame(
								function wrappedTypingBenchmarkAnimationFrame(
									timestamp
								) {
									event.firedAtMs = performance.now();
									event.frameTimestampMs = timestamp;
									try {
										return callback.call( this, timestamp );
									} finally {
										event.finishedAtMs = performance.now();
									}
								}
							);
							event.nativeId = Number( frameId );
							return frameId;
						};

						window.cancelAnimationFrame = ( frameId ) => {
							const numericFrameId = Number( frameId );
							for (
								let i =
									window.__typingBenchmarkSchedulerEvents
										.length - 1;
								i >= 0;
								i--
							) {
								const event =
									window.__typingBenchmarkSchedulerEvents[
										i
									];
								if (
									event.type === 'requestAnimationFrame' &&
									event.nativeId === numericFrameId &&
									event.clearedAtMs === undefined
								) {
									event.clearedAtMs = performance.now();
									break;
								}
							}
							return originalCancelAnimationFrame?.( frameId );
						};
					}

					if (
						shouldTraceSchedulers &&
						originalRequestIdleCallback
					) {
						window.requestIdleCallback = ( callback, options ) => {
							const event = {
								id: ++schedulerEventId,
								type: 'requestIdleCallback',
								scheduledAtMs: performance.now(),
								timeoutMs: options?.timeout,
								callbackSource: callbackSource( callback ),
								stack: stackTrace(),
							};
							window.__typingBenchmarkSchedulerEvents.push(
								event
							);

							const idleId = originalRequestIdleCallback(
								function wrappedTypingBenchmarkIdleCallback(
									deadline
								) {
									event.firedAtMs = performance.now();
									event.didTimeout = deadline.didTimeout;
									event.timeRemainingMs =
										deadline.timeRemaining();
									try {
										return callback.call( this, deadline );
									} finally {
										event.finishedAtMs = performance.now();
									}
								},
								options
							);
							event.nativeId = Number( idleId );
							return idleId;
						};

						window.cancelIdleCallback = ( idleId ) => {
							const numericIdleId = Number( idleId );
							for (
								let i =
									window.__typingBenchmarkSchedulerEvents
										.length - 1;
								i >= 0;
								i--
							) {
								const event =
									window.__typingBenchmarkSchedulerEvents[
										i
									];
								if (
									event.type === 'requestIdleCallback' &&
									event.nativeId === numericIdleId &&
									event.clearedAtMs === undefined
								) {
									event.clearedAtMs = performance.now();
									break;
								}
							}
							return originalCancelIdleCallback?.( idleId );
						};
					}
				},
				{
					timeoutRewriteMs: rewriteTimeout1000Ms,
					shouldTraceSchedulers: traceSchedulers,
				}
			);
		}

		let editorSetupIndex = -1;
		let paragraph;
		let canvas;

		async function setupEditor() {
			editorSetupIndex++;

			const setupStartedAtEpochMs = Date.now();
			if ( settleBeforeEditorSetupMs > 0 ) {
				// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
				await page.waitForTimeout( settleBeforeEditorSetupMs );
			}
			const setupWorkStartedAtEpochMs = Date.now();

			if ( isNativeScenario() ) {
				await page.setContent( `<!doctype html>
					<html>
						<head>
							<meta charset="utf-8" />
							<title>Native contenteditable typing benchmark</title>
							<style>
								body {
									font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
									margin: 32px;
								}

								#typing-benchmark-target {
									border: 1px solid #94a3b8;
									min-height: 240px;
									padding: 16px;
									white-space: pre-wrap;
								}
							</style>
						</head>
						<body>
							<div
								id="typing-benchmark-target"
								contenteditable="true"
								role="textbox"
								aria-label="Typing benchmark target"
								spellcheck="false"
							></div>
						</body>
					</html>` );
				await setupEventListenerTracingInCurrentContext();
				await setupRichTextSpanTracingInCurrentContext();
				await setupDataSpanTracingInCurrentContext();
				await setupVisualLatencyTracingInCurrentContext();
				await setupTimerTracing();
				await page.evaluate(
					( { busyWaitMs } ) => {
						const target = document.getElementById(
							'typing-benchmark-target'
						);
						let timeoutId = null;
						let isPersistent = true;

						window.__typingBenchmarkPersistenceEvents = [];
						window.__typingBenchmarkNativeState = {
							isPersistent,
						};

						target.addEventListener( 'input', () => {
							isPersistent = false;
							window.__typingBenchmarkNativeState = {
								isPersistent,
							};
							window.__typingBenchmarkPersistenceEvents.push( {
								nowMs: performance.now(),
								isPersistent,
								isTyping: true,
								source: 'native-input',
							} );

							if ( timeoutId !== null ) {
								window.clearTimeout( timeoutId );
							}

							timeoutId = window.setTimeout( () => {
								const startedAtMs = performance.now();
								isPersistent = true;
								window.__typingBenchmarkNativeState = {
									isPersistent,
								};
								if ( busyWaitMs > 0 ) {
									const stopAt =
										performance.now() + busyWaitMs;
									while ( performance.now() < stopAt ) {}
								}
								window.__typingBenchmarkPersistenceEvents.push(
									{
										nowMs: startedAtMs,
										durationMs:
											performance.now() - startedAtMs,
										busyWaitMs,
										isPersistent,
										isTyping: false,
										source: 'native-timeout',
									}
								);
							}, 1000 );
						} );
					},
					{ busyWaitMs: nativeTimerBusyWaitMs }
				);
				await setupPersistenceTracing();
				const dataTracingSetup = await setupDataTracing();
				await resetEventListenerTracing();
				await resetRichTextSpanTracing();
				await resetDataSpanTracing();
				await resetVisualLatencyTracing();
				paragraph = page.getByRole( 'textbox', {
					name: 'Typing benchmark target',
				} );
				await paragraph.click();

				const setupReadyAtEpochMs = Date.now();
				if ( settleAfterEditorSetupMs > 0 ) {
					// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
					await page.waitForTimeout( settleAfterEditorSetupMs );
				}

				return {
					editorSetupIndex,
					setupStartedAtEpochMs,
					setupWorkStartedAtEpochMs,
					setupReadyAtEpochMs,
					setupStoppedAtEpochMs: Date.now(),
					setupStyle,
					setupDraftId: null,
					setupBlockCount: 0,
					dataTracingSetup,
				};
			}

			let setupDraftId = null;
			let markPersistentInterventionSetup;
			if ( setupStyle === 'ci-post-editor-typing' ) {
				await admin.createNewPost();
				await perfUtils.loadBlocksForLargePost();
				await editor.insertBlock( { name: 'core/paragraph' } );
				setupDraftId = await perfUtils.saveDraft();
				await admin.editPost( setupDraftId );
				await perfUtils.disableAutosave();
				markPersistentInterventionSetup =
					await setupMarkPersistentIntervention();
			} else {
				await admin.createNewPost();
				await perfUtils.disableAutosave();
				markPersistentInterventionSetup =
					await setupMarkPersistentIntervention();
				if ( scenario === 'large-post-paragraph' ) {
					await perfUtils.loadBlocksForLargePost();
				} else if ( scenario === 'small-containers-paragraph' ) {
					await perfUtils.loadBlocksForSmallPostWithContainers();
				} else if ( scenario === 'thousand-paragraphs-paragraph' ) {
					await perfUtils.load1000Paragraphs();
				}
				if ( scenario !== 'small-containers-paragraph' ) {
					await editor.insertBlock( { name: 'core/paragraph' } );
				}
			}

			const setupBlockCount = await page.evaluate( () =>
				window.wp.data.select( 'core/block-editor' ).getBlockCount()
			);

			canvas = await perfUtils.getCanvas();
			if ( scenario === 'small-containers-paragraph' ) {
				paragraph = canvas
					.getByRole( 'document', {
						name: /Paragraph block|Block: Paragraph/,
					} )
					.first();
			} else {
				paragraph = canvas.getByRole( 'document', {
					name: /Empty block/i,
				} );
			}

			if ( setupStyle !== 'ci-post-editor-typing' ) {
				await paragraph.click();
			}
			await setupRichTextSpanTracingInCurrentContext();
			await setupDataSpanTracingInCurrentContext();
			await setupVisualLatencyTracingInCurrentContext();
			await setupTimerTracing();
			await setupPersistenceTracing();
			const dataTracingSetup = await setupDataTracing();
			await resetEventListenerTracing();
			await resetRichTextSpanTracing();
			await resetDataSpanTracing();
			await resetVisualLatencyTracing();

			const setupReadyAtEpochMs = Date.now();
			if ( settleAfterEditorSetupMs > 0 ) {
				// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
				await page.waitForTimeout( settleAfterEditorSetupMs );
			}

			return {
				editorSetupIndex,
				setupStartedAtEpochMs,
				setupWorkStartedAtEpochMs,
				setupReadyAtEpochMs,
				setupStoppedAtEpochMs: Date.now(),
				setupStyle,
				setupDraftId,
				setupBlockCount,
				dataTracingSetup,
				markPersistentInterventionSetup,
			};
		}

		async function screenshotTargetLocator() {
			if ( ! traceScreenshots ) {
				return null;
			}

			const paragraphBox = await paragraph
				.boundingBox()
				.catch( () => null );
			if ( paragraphBox ) {
				return paragraph;
			}

			if ( ! canvas ) {
				return null;
			}

			return canvas.locator( '[contenteditable="true"]' ).last();
		}

		async function screenshotTargetBoundingBox() {
			const target = await screenshotTargetLocator();
			return await target?.boundingBox().catch( () => null );
		}

		function screenshotContentEditableLocator() {
			if ( ! traceScreenshotPixels ) {
				return null;
			}

			if ( canvas ) {
				return canvas.locator( '[contenteditable="true"]' ).last();
			}

			return paragraph;
		}

		async function screenshotCharacterTextLength() {
			if ( ! traceScreenshotPixels ) {
				return null;
			}

			const target = screenshotContentEditableLocator();
			return await target
				?.evaluate( ( element ) => element.textContent.length )
				.catch( () => null );
		}

		async function screenshotCharacterBoundingBoxes(
			startCharacterIndex,
			count
		) {
			if (
				! traceScreenshotPixels ||
				startCharacterIndex === null ||
				startCharacterIndex === undefined
			) {
				return [];
			}

			const target = screenshotContentEditableLocator();
			return (
				( await target
					?.evaluate(
						(
							element,
							{
								count: characterCount,
								startCharacterIndex: firstCharacterIndex,
							}
						) => {
							const document = element.ownerDocument;
							const window = document.defaultView;
							const frameElement = window.frameElement;
							const frameRect = frameElement
								? frameElement.getBoundingClientRect()
								: { left: 0, top: 0 };
							const textNodes = [];
							const walker = document.createTreeWalker(
								element,
								window.NodeFilter.SHOW_TEXT
							);
							let node = walker.nextNode();
							while ( node ) {
								textNodes.push( node );
								node = walker.nextNode();
							}

							function endpointForIndex(
								characterIndex,
								preferNextAtBoundary
							) {
								let remaining = characterIndex;
								for ( const textNode of textNodes ) {
									if (
										remaining < textNode.length ||
										( remaining === textNode.length &&
											! preferNextAtBoundary )
									) {
										return {
											node: textNode,
											offset: remaining,
										};
									}
									remaining -= textNode.length;
								}

								const lastNode =
									textNodes[ textNodes.length - 1 ];
								if ( ! lastNode ) {
									return null;
								}

								return {
									node: lastNode,
									offset: lastNode.length,
								};
							}

							const boxes = [];
							for ( let i = 0; i < characterCount; i++ ) {
								const characterIndex = firstCharacterIndex + i;
								const start = endpointForIndex(
									characterIndex,
									true
								);
								const end = endpointForIndex(
									characterIndex + 1,
									false
								);
								if ( ! start || ! end ) {
									boxes.push( null );
									continue;
								}

								const range = document.createRange();
								range.setStart( start.node, start.offset );
								range.setEnd( end.node, end.offset );
								const rect = range.getBoundingClientRect();
								boxes.push( {
									x: rect.left + frameRect.left,
									y: rect.top + frameRect.top,
									width: rect.width,
									height: rect.height,
								} );
							}

							return boxes;
						},
						{ count, startCharacterIndex }
					)
					.catch( () => [] ) ) || []
			);
		}

		async function runPreTypingWarmup() {
			if ( preTypingWarmupMode === 'none' ) {
				return null;
			}

			const startedAtEpochMs = Date.now();
			const result = await page.evaluate(
				( { mode, durationMs } ) => {
					const startedAtMs = performance.now();
					if ( mode === 'main-thread-busy-loop' ) {
						const stopAtMs = startedAtMs + durationMs;
						let accumulator = 0;
						while ( performance.now() < stopAtMs ) {
							accumulator += Math.sqrt( accumulator + 1 );
						}
						const stoppedAtMs = performance.now();
						return {
							mode,
							requestedDurationMs: durationMs,
							actualDurationMs: stoppedAtMs - startedAtMs,
							accumulator,
						};
					}

					throw new Error( `Unsupported warmup mode: ${ mode }` );
				},
				{
					mode: preTypingWarmupMode,
					durationMs: preTypingWarmupMs,
				}
			);

			return {
				...result,
				startedAtEpochMs,
				stoppedAtEpochMs: Date.now(),
			};
		}

		let editorSetup = null;
		await setupEventListenerTracingInitScript();
		await setupRichTextSpanTracingInitScript();
		await setupDataSpanTracingInitScript();
		await setupVisualLatencyTracingInitScript();
		if ( ! freshEditorPerDelay ) {
			editorSetup = await setupEditor();
		}

		const records = [];
		const delayRunSummaries = [];
		const benchmarkStartedAtEpochMs = Date.now();
		let globalTypedCharacterIndex = 0;
		let globalRetainedSampleIndex = 0;
		const retainedSamplesByDelay = new Map(
			delays.map( ( delay ) => [ delay, 0 ] )
		);
		const sampleCount = samplesPerDelay + throwawayPerDelay;

		for ( let round = 0; round < rounds; round++ ) {
			const orderedDelays = delaysForRound( round );

			for ( const delayMs of orderedDelays ) {
				if ( freshEditorPerDelay ) {
					editorSetup = await setupEditor();
				}

				if ( settleBetweenDelayRunsMs > 0 ) {
					// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
					await page.waitForTimeout( settleBetweenDelayRunsMs );
				}

				const preTypingWarmup = await runPreTypingWarmup();
				const targetBoundingBox = await screenshotTargetBoundingBox();
				const viewportSize = traceScreenshots
					? page.viewportSize()
					: null;
				const textLengthBeforeRun =
					await screenshotCharacterTextLength();
				const runStartedAtEpochMs = Date.now();
				const runStartedAtBrowserNowMs = await page.evaluate( () =>
					performance.now()
				);

				if ( useBrowserTrace ) {
					await metrics.startTracing( browserTraceOptions() );
				}
				if (
					waitForPersistenceBetweenKeys ||
					delayMode === 'after-persistence'
				) {
					for ( let i = 0; i < sampleCount; i++ ) {
						await page.waitForFunction(
							() =>
								window.wp.data
									.select( 'core/block-editor' )
									.isLastBlockChangePersistent(),
							{
								timeout: Math.max( 30_000, delayMs * 4 ),
							}
						);
						if (
							delayMode === 'after-persistence' &&
							delayMs > 0
						) {
							// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
							await page.waitForTimeout( delayMs );
						}
						await page.keyboard.type( 'x' );
					}
				} else if ( delayMode === 'between-keys' ) {
					if ( setupStyle === 'ci-post-editor-typing' ) {
						await paragraph.click();
					}
					for ( let i = 0; i < sampleCount; i++ ) {
						await page.keyboard.type( 'x' );
						if ( delayMs > 0 && i < sampleCount - 1 ) {
							// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
							await page.waitForTimeout( delayMs );
						}
					}
				} else if ( delayMode === 'hold-then-keyup-gap' ) {
					for ( let i = 0; i < sampleCount; i++ ) {
						await page.keyboard.press( 'x', { delay: delayMs } );
						if ( postKeyupGapMs > 0 && i < sampleCount - 1 ) {
							// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
							await page.waitForTimeout( postKeyupGapMs );
						}
					}
				} else if ( delayMode === 'type-one-char-hold' ) {
					for ( let i = 0; i < sampleCount; i++ ) {
						await page.keyboard.type( 'x', {
							delay: delayMs,
							timeout: Math.max( 30_000, delayMs * 4 ),
						} );
						if ( postKeyupGapMs > 0 && i < sampleCount - 1 ) {
							await sleepMs( postKeyupGapMs );
						}
					}
				} else if ( delayMode === 'down-up-key-hold' ) {
					for ( let i = 0; i < sampleCount; i++ ) {
						await page.keyboard.down( 'x' );
						await sleepMs( delayMs );
						await page.keyboard.up( 'x' );
						if ( postKeyupGapMs > 0 && i < sampleCount - 1 ) {
							await sleepMs( postKeyupGapMs );
						}
					}
				} else if (
					delayMode === 'cdp-key-hold' ||
					delayMode === 'cdp-key-hold-page-evaluate' ||
					delayMode === 'cdp-key-hold-runtime-evaluate'
				) {
					const cdpSession = await page
						.context()
						.newCDPSession( page );
					try {
						for ( let i = 0; i < sampleCount; i++ ) {
							await dispatchCdpKeyPress( cdpSession, delayMs );
							if (
								delayMode === 'cdp-key-hold-page-evaluate' &&
								i < sampleCount - 1
							) {
								await page.evaluate( () => undefined );
							}
							if (
								delayMode === 'cdp-key-hold-runtime-evaluate' &&
								i < sampleCount - 1
							) {
								await cdpSession.send( 'Runtime.evaluate', {
									expression: 'undefined',
								} );
							}
							if ( postKeyupGapMs > 0 && i < sampleCount - 1 ) {
								await sleepMs( postKeyupGapMs );
							}
						}
					} finally {
						await cdpSession.detach();
					}
				} else {
					const typeTarget =
						setupStyle === 'ci-post-editor-typing'
							? paragraph
							: page.keyboard;
					await typeTarget.type( 'x'.repeat( sampleCount ), {
						delay: delayMs,
						timeout: Math.max( 30_000, sampleCount * delayMs * 4 ),
					} );
				}
				if ( useBrowserTrace ) {
					await metrics.stopTracing();
				}
				const textLengthAfterRun =
					await screenshotCharacterTextLength();
				const firstTypedCharacterIndex =
					textLengthAfterRun === null ||
					textLengthAfterRun === undefined
						? null
						: textLengthAfterRun - sampleCount;
				const characterBoundingBoxes =
					await screenshotCharacterBoundingBoxes(
						firstTypedCharacterIndex,
						sampleCount
					);
				if ( traceVisualLatency ) {
					await page.evaluate(
						() =>
							new Promise( ( resolve ) => {
								window.requestAnimationFrame( () =>
									window.requestAnimationFrame( resolve )
								);
							} )
					);
				}

				const runStoppedAtBrowserNowMs = await page.evaluate( () =>
					performance.now()
				);
				const runStoppedAtEpochMs = Date.now();
				const eventListenerEvents = await collectEventListenerEvents(
					runStartedAtBrowserNowMs,
					runStoppedAtBrowserNowMs
				);
				const visualLatencyEvents = await collectVisualLatencyEvents(
					runStartedAtBrowserNowMs,
					runStoppedAtBrowserNowMs
				);

				const keyboardEvents = useBrowserTrace
					? keyboardEventDispatches( metrics.trace )
					: eventListenerKeyboardDispatches(
							eventListenerEvents || []
					  );
				const keyGroups = groupKeyboardDispatches( keyboardEvents );
				const renderTraceEvents =
					useBrowserTrace && traceRenderEvents
						? renderTraceEventsForKeyWindows( metrics.trace )
						: undefined;
				const screenshotTraceEvents =
					useBrowserTrace && traceScreenshots
						? screenshotTraceEventsForKeyWindows( metrics.trace )
						: undefined;

				delayRunSummaries.push( {
					round,
					delayMs,
					editorSetupIndex: editorSetup.editorSetupIndex,
					editorSetupStartedAtEpochMs:
						editorSetup.setupStartedAtEpochMs,
					editorSetupWorkStartedAtEpochMs:
						editorSetup.setupWorkStartedAtEpochMs,
					editorSetupReadyAtEpochMs: editorSetup.setupReadyAtEpochMs,
					editorSetupStoppedAtEpochMs:
						editorSetup.setupStoppedAtEpochMs,
					editorSetupStyle: editorSetup.setupStyle,
					editorSetupDraftId: editorSetup.setupDraftId,
					editorSetupBlockCount: editorSetup.setupBlockCount,
					dataTracingSetup: editorSetup.dataTracingSetup,
					markPersistentInterventionSetup:
						editorSetup.markPersistentInterventionSetup,
					expectedKeyGroups: sampleCount,
					keyGroups: keyGroups.length,
					keyDownEvents: keyboardEvents.filter(
						( event ) => event.type === 'keydown'
					).length,
					keyPressEvents: keyboardEvents.filter(
						( event ) => event.type === 'keypress'
					).length,
					keyUpEvents: keyboardEvents.filter(
						( event ) => event.type === 'keyup'
					).length,
					runStartedAtEpochMs,
					runStoppedAtEpochMs,
					runStartedAtBrowserNowMs,
					runStoppedAtBrowserNowMs,
					targetBoundingBox,
					viewportSize,
					preTypingWarmup,
					persistenceEvents: tracePersistence
						? await page.evaluate(
								( { startMs, stopMs } ) =>
									window.__typingBenchmarkPersistenceEvents.filter(
										( event ) =>
											event.nowMs >= startMs - 5 &&
											event.nowMs <= stopMs + 5
									),
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					browserEvents: traceData
						? await page.evaluate(
								( { startMs, stopMs } ) =>
									window.__typingBenchmarkBrowserEvents.filter(
										( event ) =>
											event.nowMs >= startMs - 5 &&
											event.nowMs <= stopMs + 5
									),
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					dataEvents: traceData
						? await page.evaluate(
								( { startMs, stopMs } ) =>
									window.__typingBenchmarkDataEvents.filter(
										( event ) =>
											event.nowMs >= startMs - 5 &&
											event.nowMs <= stopMs + 5
									),
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					timerEvents: traceTimers
						? await page.evaluate(
								( { startMs, stopMs } ) =>
									window.__typingBenchmarkTimerEvents.filter(
										( event ) =>
											event.scheduledAtMs <= stopMs + 5 &&
											( event.firedAtMs ??
												event.scheduledAtMs ) >=
												startMs - 5
									),
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					markPersistentInterventionEvents:
						markPersistentIntervention === 'normal'
							? undefined
							: await page.evaluate(
									( { startMs, stopMs } ) =>
										(
											window.__typingBenchmarkMarkPersistentInterventionEvents ||
											[]
										).filter(
											( event ) =>
												event.nowMs >= startMs - 5 &&
												event.nowMs <= stopMs + 5
										),
									{
										startMs: runStartedAtBrowserNowMs,
										stopMs: runStoppedAtBrowserNowMs,
									}
							  ),
					schedulerEvents: traceSchedulers
						? await page.evaluate(
								( { startMs, stopMs } ) =>
									window.__typingBenchmarkSchedulerEvents.filter(
										( event ) =>
											event.scheduledAtMs <= stopMs + 5 &&
											( event.firedAtMs ??
												event.scheduledAtMs ) >=
												startMs - 5
									),
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					visualLatencyEvents,
					renderTraceEventCount: renderTraceEvents?.length,
					screenshotTraceEventCount: screenshotTraceEvents?.length,
					gapTraceEvents: traceGapEvents
						? traceEventsForKeyGaps( metrics.trace )
						: undefined,
					eventListenerEvents,
					richTextSpanEvents: traceRichTextSpans
						? await page.evaluate(
								( { startMs, stopMs } ) => {
									const windows = [
										{ name: 'parent', window },
									];
									for ( const iframe of document.querySelectorAll(
										'iframe'
									) ) {
										try {
											if ( iframe.contentWindow ) {
												windows.push( {
													name:
														iframe.name ||
														iframe.id ||
														'iframe',
													window: iframe.contentWindow,
												} );
											}
										} catch {
											// Ignore inaccessible frames.
										}
									}

									return windows.flatMap(
										( { name, window: currentWindow } ) =>
											(
												currentWindow.__typingBenchmarkRichTextSpanEvents ||
												[]
											)
												.filter(
													( event ) =>
														event.startedAtMs >=
															startMs - 5 &&
														event.startedAtMs <=
															stopMs + 5
												)
												.map( ( event ) => ( {
													...event,
													windowName: name,
												} ) )
									);
								},
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
					dataSpanEvents: traceDataSpans
						? await page.evaluate(
								( { startMs, stopMs } ) => {
									const windows = [
										{ name: 'parent', window },
									];
									for ( const iframe of document.querySelectorAll(
										'iframe'
									) ) {
										try {
											if ( iframe.contentWindow ) {
												windows.push( {
													name:
														iframe.name ||
														iframe.id ||
														'iframe',
													window: iframe.contentWindow,
												} );
											}
										} catch {
											// Ignore inaccessible frames.
										}
									}

									return windows.flatMap(
										( { name, window: currentWindow } ) =>
											(
												currentWindow.__typingBenchmarkDataSpanEvents ||
												[]
											)
												.filter(
													( event ) =>
														event.startedAtMs >=
															startMs - 5 &&
														event.startedAtMs <=
															stopMs + 5
												)
												.map( ( event ) => ( {
													...event,
													windowName: name,
												} ) )
									);
								},
								{
									startMs: runStartedAtBrowserNowMs,
									stopMs: runStoppedAtBrowserNowMs,
								}
						  )
						: undefined,
				} );

				for (
					let sampleIndex = 0;
					sampleIndex < keyGroups.length;
					sampleIndex++
				) {
					const keyGroup = keyGroups[ sampleIndex ];
					const keydown = keyGroup.keydownEvents.at( -1 );
					const keydownAllMs = keyGroup.keydownEvents.reduce(
						( sum, event ) => sum + event.durationMs,
						0
					);
					const keypress = keyGroup.keypress;
					const keyup = keyGroup.keyup;
					const visualLatencyEvent =
						visualLatencyEvents?.[ sampleIndex ];
					const renderTraceDeltas = renderTraceEventDeltasForKey(
						renderTraceEvents,
						keydown.timestampMs
					);
					const {
						metrics: screenshotTraceDeltas,
						previousSnapshot,
						changedSnapshot,
					} = screenshotTraceDeltasForKey(
						screenshotTraceEvents,
						keydown.timestampMs
					);
					const screenshotPixelDiffDeltas =
						await screenshotPixelDiffForSnapshots(
							previousSnapshot,
							changedSnapshot,
							targetBoundingBox,
							characterBoundingBoxes[ sampleIndex ],
							viewportSize
						);
					const isThrowaway = sampleIndex < throwawayPerDelay;
					const delaySampleIndex =
						retainedSamplesByDelay.get( delayMs );

					records.push( {
						scenario,
						round,
						delayMs,
						setupStyle,
						sampleIndex,
						isThrowaway,
						delaySampleIndex: isThrowaway ? null : delaySampleIndex,
						globalTypedCharacterIndex,
						globalRetainedSampleIndex: isThrowaway
							? null
							: globalRetainedSampleIndex,
						editorSetupIndex: editorSetup.editorSetupIndex,
						elapsedMsSinceBenchmarkStart:
							runStartedAtEpochMs - benchmarkStartedAtEpochMs,
						runStartedAtEpochMs,
						runStoppedAtEpochMs,
						runStartedAtBrowserNowMs,
						runStoppedAtBrowserNowMs,
						keydownEventCount: keyGroup.keydownEvents.length,
						keydownMs: keydown.durationMs,
						keydownAllMs,
						keypressMs: keypress.durationMs,
						keyupMs: keyup.durationMs,
						latencyMs:
							keydown.durationMs +
							keypress.durationMs +
							keyup.durationMs,
						latencyAllKeydownsMs:
							keydownAllMs +
							keypress.durationMs +
							keyup.durationMs,
						keydownTimestampMs: keydown.timestampMs,
						firstKeydownTimestampMs:
							keyGroup.keydownEvents[ 0 ].timestampMs,
						keypressTimestampMs: keypress.timestampMs,
						keyupTimestampMs: keyup.timestampMs,
						textLengthBeforeRun,
						textLengthAfterRun,
						typedCharacterTextIndex:
							firstTypedCharacterIndex === null ||
							firstTypedCharacterIndex === undefined
								? undefined
								: firstTypedCharacterIndex + sampleIndex,
						typedCharacterBoxX:
							characterBoundingBoxes[ sampleIndex ]?.x,
						typedCharacterBoxY:
							characterBoundingBoxes[ sampleIndex ]?.y,
						typedCharacterBoxWidth:
							characterBoundingBoxes[ sampleIndex ]?.width,
						typedCharacterBoxHeight:
							characterBoundingBoxes[ sampleIndex ]?.height,
						visualWindowName: visualLatencyEvent?.windowName,
						visualInputWindowName:
							visualLatencyEvent?.inputWindowName,
						visualMutationWindowName:
							visualLatencyEvent?.mutationWindowName,
						visualKeydownAtMs: visualLatencyEvent?.keydownAtMs,
						visualBeforeinputAtMs:
							visualLatencyEvent?.beforeinputAtMs,
						visualInputAtMs: visualLatencyEvent?.inputAtMs,
						visualFirstMutationAtMs:
							visualLatencyEvent?.firstMutationAtMs,
						visualFirstRafAfterInputAtMs:
							visualLatencyEvent?.firstRafAfterInputAtMs,
						visualSecondRafAfterInputAtMs:
							visualLatencyEvent?.secondRafAfterInputAtMs,
						visualFirstRafAfterMutationAtMs:
							visualLatencyEvent?.firstRafAfterMutationAtMs,
						visualSecondRafAfterMutationAtMs:
							visualLatencyEvent?.secondRafAfterMutationAtMs,
						visualKeydownToInputMs:
							visualLatencyEvent?.inputAtMs === undefined
								? undefined
								: visualLatencyEvent.inputAtMs -
								  visualLatencyEvent.keydownAtMs,
						visualInputToFirstRafMs:
							visualLatencyEvent?.firstRafAfterInputAtMs ===
								undefined ||
							visualLatencyEvent?.inputAtMs === undefined
								? undefined
								: visualLatencyEvent.firstRafAfterInputAtMs -
								  visualLatencyEvent.inputAtMs,
						visualInputToSecondRafMs:
							visualLatencyEvent?.secondRafAfterInputAtMs ===
								undefined ||
							visualLatencyEvent?.inputAtMs === undefined
								? undefined
								: visualLatencyEvent.secondRafAfterInputAtMs -
								  visualLatencyEvent.inputAtMs,
						visualKeydownToFirstRafAfterInputMs:
							visualLatencyEvent?.firstRafAfterInputAtMs ===
							undefined
								? undefined
								: visualLatencyEvent.firstRafAfterInputAtMs -
								  visualLatencyEvent.keydownAtMs,
						visualKeydownToSecondRafAfterInputMs:
							visualLatencyEvent?.secondRafAfterInputAtMs ===
							undefined
								? undefined
								: visualLatencyEvent.secondRafAfterInputAtMs -
								  visualLatencyEvent.keydownAtMs,
						visualKeydownToFirstMutationMs:
							visualLatencyEvent?.firstMutationAtMs === undefined
								? undefined
								: visualLatencyEvent.firstMutationAtMs -
								  visualLatencyEvent.keydownAtMs,
						...renderTraceDeltas,
						...screenshotTraceDeltas,
						...screenshotPixelDiffDeltas,
					} );

					globalTypedCharacterIndex++;

					if ( ! isThrowaway ) {
						retainedSamplesByDelay.set(
							delayMs,
							delaySampleIndex + 1
						);
						globalRetainedSampleIndex++;
					}
				}

				if ( useBrowserTrace && keyGroups.length !== sampleCount ) {
					console.warn(
						`Delay ${ delayMs }ms round ${ round } produced ` +
							`${ keyGroups.length } key groups, expected ${ sampleCount }.`
					);
				}
			}
		}

		cleanupExternalPersistentProcess();

		const benchmarkStoppedAtEpochMs = Date.now();
		const useSelectMetadata = traceDataSpans
			? await page.evaluate( () => {
					const windows = [ { name: 'parent', window } ];
					for ( const iframe of document.querySelectorAll(
						'iframe'
					) ) {
						try {
							if ( iframe.contentWindow ) {
								windows.push( {
									name: iframe.name || iframe.id || 'iframe',
									window: iframe.contentWindow,
								} );
							}
						} catch {
							// Ignore inaccessible frames.
						}
					}

					return windows.flatMap(
						( { name, window: currentWindow } ) =>
							(
								currentWindow.__typingBenchmarkUseSelectMetadata ||
								[]
							).map( ( metadata ) => ( {
								...metadata,
								windowName: name,
							} ) )
					);
			  } )
			: undefined;
		const result = {
			metadata: {
				scenario,
				minDelayMs,
				maxDelayMs,
				delayStepMs,
				delays,
				delayCount: delays.length,
				rounds,
				samplesPerDelay,
				throwawayPerDelay,
				traceData,
				traceTimers,
				traceSchedulers,
				markPersistentIntervention,
				traceGapEvents,
				traceEventListeners,
				useBrowserTrace,
				latencyMetric: useBrowserTrace
					? 'browser EventDispatch trace'
					: 'event listener dispatch span',
				traceRichTextSpans,
				traceDataSpans,
				traceAllDataSpans,
				traceVisualLatency,
				traceRenderEvents,
				renderTraceWindowMs,
				traceScreenshots,
				traceScreenshotPixels,
				screenshotTraceWindowMs,
				freshEditorPerDelay,
				waitForPersistenceBetweenKeys,
				delayMode,
				postKeyupGapMs,
				settleBeforeEditorSetupMs,
				settleAfterEditorSetupMs,
				setupStyle,
				settleBetweenDelayRunsMs,
				preTypingWarmupMode,
				preTypingWarmupMs,
				orderMode,
				seed,
				benchmarkStartedAtEpochMs,
				benchmarkStoppedAtEpochMs,
				retainedSampleCount: globalRetainedSampleIndex,
				totalTypedCharacters: globalTypedCharacterIndex,
				userAgent: await page.evaluate( () => navigator.userAgent ),
			},
			delayRunSummaries,
			records,
			useSelectMetadata,
		};
		const outputPath = path.join(
			outputDir,
			`typing-delay-benchmark-${ benchmarkStartedAtEpochMs }.json`
		);

		fs.writeFileSync( outputPath, JSON.stringify( result, null, 2 ) );
		console.log( `Typing delay benchmark results: ${ outputPath }` );
	} );
} );

/* eslint-enable no-bitwise, no-console, playwright/expect-expect */
