/* eslint-disable no-bitwise, no-console, playwright/expect-expect */

/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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
const freshEditorPerDelay =
	process.env.BENCHMARK_FRESH_EDITOR_PER_DELAY === '1' ||
	process.env.BENCHMARK_FRESH_EDITOR_PER_DELAY === 'true';
const waitForPersistenceBetweenKeys =
	process.env.BENCHMARK_WAIT_FOR_PERSISTENCE_BETWEEN_KEYS === '1' ||
	process.env.BENCHMARK_WAIT_FOR_PERSISTENCE_BETWEEN_KEYS === 'true';
const settleAfterEditorSetupMs = intEnv(
	'BENCHMARK_SETTLE_AFTER_EDITOR_SETUP_MS',
	0
);
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

if ( delayStepMs <= 0 ) {
	throw new Error( 'BENCHMARK_DELAY_STEP_MS must be greater than 0.' );
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
	const setupCount = freshEditorPerDelay ? rounds * delays.length : 1;
	const stateWaitMs =
		waitForPersistenceBetweenKeys || delayMode === 'after-persistence'
			? rounds * delays.length * sampleCount * 1500
			: 0;
	const setupAllowanceMs =
		20 * 60 * 1000 + setupCount * ( 60 * 1000 + settleAfterEditorSetupMs );

	return Math.max(
		intEnv( 'BENCHMARK_TIMEOUT_MS', 0 ),
		intentionalDelayMs * 2 + stateWaitMs + settleMs + setupAllowanceMs
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
										mode ===
											'worker-busy-wait-20-no-message'
											? 20
											: mode ===
											  'worker-busy-wait-40-no-message'
											? 40
											: 80
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
										mode === 'external-cpu-20-no-message'
											? 20
											: mode ===
											  'external-cpu-40-no-message'
											? 40
											: mode ===
											  'external-cpu-80-no-message'
											? 80
											: 150,
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
										mode ===
											'external-persistent-cpu-20-no-message'
											? 20
											: mode ===
											  'external-persistent-cpu-40-no-message'
											? 40
											: mode ===
											  'external-persistent-cpu-80-no-message'
											? 80
											: 150,
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

		async function setupEditor() {
			editorSetupIndex++;

			const setupStartedAtEpochMs = Date.now();
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
				paragraph = page.getByRole( 'textbox', {
					name: 'Typing benchmark target',
				} );
				await paragraph.click();

				if ( settleAfterEditorSetupMs > 0 ) {
					// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
					await page.waitForTimeout( settleAfterEditorSetupMs );
				}

				return {
					editorSetupIndex,
					setupStartedAtEpochMs,
					setupStoppedAtEpochMs: Date.now(),
					setupBlockCount: 0,
					dataTracingSetup,
				};
			}

			await admin.createNewPost();
			await perfUtils.disableAutosave();
			const markPersistentInterventionSetup =
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

			const setupBlockCount = await page.evaluate( () =>
				window.wp.data.select( 'core/block-editor' ).getBlockCount()
			);

			const canvas = await perfUtils.getCanvas();
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

			await paragraph.click();
			await setupRichTextSpanTracingInCurrentContext();
			await setupDataSpanTracingInCurrentContext();
			await setupTimerTracing();
			await setupPersistenceTracing();
			const dataTracingSetup = await setupDataTracing();
			await resetEventListenerTracing();
			await resetRichTextSpanTracing();
			await resetDataSpanTracing();

			if ( settleAfterEditorSetupMs > 0 ) {
				// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
				await page.waitForTimeout( settleAfterEditorSetupMs );
			}

			return {
				editorSetupIndex,
				setupStartedAtEpochMs,
				setupStoppedAtEpochMs: Date.now(),
				setupBlockCount,
				dataTracingSetup,
				markPersistentInterventionSetup,
			};
		}

		let editorSetup = null;
		await setupEventListenerTracingInitScript();
		await setupRichTextSpanTracingInitScript();
		await setupDataSpanTracingInitScript();
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

				const runStartedAtEpochMs = Date.now();
				const runStartedAtBrowserNowMs = await page.evaluate( () =>
					performance.now()
				);

				if ( useBrowserTrace ) {
					await metrics.startTracing();
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
					await page.keyboard.type( 'x'.repeat( sampleCount ), {
						delay: delayMs,
						timeout: Math.max( 30_000, sampleCount * delayMs * 4 ),
					} );
				}
				if ( useBrowserTrace ) {
					await metrics.stopTracing();
				}

				const runStoppedAtBrowserNowMs = await page.evaluate( () =>
					performance.now()
				);
				const runStoppedAtEpochMs = Date.now();
				const eventListenerEvents = await collectEventListenerEvents(
					runStartedAtBrowserNowMs,
					runStoppedAtBrowserNowMs
				);

				const keyboardEvents = useBrowserTrace
					? keyboardEventDispatches( metrics.trace )
					: eventListenerKeyboardDispatches(
							eventListenerEvents || []
					  );
				const keyGroups = groupKeyboardDispatches( keyboardEvents );

				delayRunSummaries.push( {
					round,
					delayMs,
					editorSetupIndex: editorSetup.editorSetupIndex,
					editorSetupStartedAtEpochMs:
						editorSetup.setupStartedAtEpochMs,
					editorSetupStoppedAtEpochMs:
						editorSetup.setupStoppedAtEpochMs,
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
					const isThrowaway = sampleIndex < throwawayPerDelay;
					const delaySampleIndex =
						retainedSamplesByDelay.get( delayMs );

					records.push( {
						scenario,
						round,
						delayMs,
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
				freshEditorPerDelay,
				waitForPersistenceBetweenKeys,
				delayMode,
				postKeyupGapMs,
				settleAfterEditorSetupMs,
				settleBetweenDelayRunsMs,
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
