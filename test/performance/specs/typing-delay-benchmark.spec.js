/* eslint-disable no-bitwise, no-console, playwright/expect-expect */

/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';

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
const scenario = process.env.BENCHMARK_SCENARIO || 'large-post-paragraph';
const seed = intEnv( 'BENCHMARK_SEED', 51383 );
const tracePersistence =
	process.env.BENCHMARK_TRACE_PERSISTENCE === '1' ||
	process.env.BENCHMARK_TRACE_PERSISTENCE === 'true';
const traceData =
	process.env.BENCHMARK_TRACE_DATA === '1' ||
	process.env.BENCHMARK_TRACE_DATA === 'true';
const rewriteTimeout1000Ms =
	process.env.BENCHMARK_REWRITE_TIMEOUT_1000_MS === undefined
		? null
		: intEnv( 'BENCHMARK_REWRITE_TIMEOUT_1000_MS', 1000 );
const traceTimers =
	process.env.BENCHMARK_TRACE_TIMERS === '1' ||
	process.env.BENCHMARK_TRACE_TIMERS === 'true' ||
	rewriteTimeout1000Ms !== null;
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
];

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

function groupedKeyboardEvents( trace ) {
	const groups = [];
	let currentGroup = {
		keydownEvents: [],
		keypress: null,
		keyup: null,
	};

	for ( const event of keyboardEventDispatches( trace ) ) {
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

function benchmarkTimeoutMs() {
	const sampleCount = samplesPerDelay + throwawayPerDelay;
	const intentionalDelayMs =
		rounds *
		sampleCount *
		delays.reduce( ( sum, delay ) => sum + delay, 0 );
	const settleMs = rounds * delays.length * settleBetweenDelayRunsMs;
	const setupCount = freshEditorPerDelay ? rounds * delays.length : 1;
	const stateWaitMs = waitForPersistenceBetweenKeys
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

		async function setupPersistenceTracing() {
			if ( ! tracePersistence ) {
				return;
			}

			await page.evaluate( () => {
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

		async function setupDataTracing() {
			if ( ! traceData ) {
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
				window.__typingBenchmarkBrowserUnsubscribers?.forEach(
					( unsubscribe ) => unsubscribe()
				);
				window.__typingBenchmarkBrowserUnsubscribers = [];

				function blockEditorSnapshot() {
					const select =
						window.wp?.data?.select?.( 'core/block-editor' );

					if ( ! select ) {
						return {};
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
								inputType: event.inputType,
								data: event.data,
								targetTagName: event.target?.tagName,
								targetRole:
									event.target?.getAttribute?.( 'role' ),
								...blockEditorSnapshot(),
							} );
						};

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
			if ( ! traceTimers ) {
				return;
			}

			await page.evaluate( ( timeoutRewriteMs ) => {
				if ( ! window.__typingBenchmarkOriginalSetTimeout ) {
					window.__typingBenchmarkOriginalSetTimeout =
						window.setTimeout.bind( window );
				}
				if ( ! window.__typingBenchmarkOriginalClearTimeout ) {
					window.__typingBenchmarkOriginalClearTimeout =
						window.clearTimeout.bind( window );
				}

				const originalSetTimeout =
					window.__typingBenchmarkOriginalSetTimeout;
				window.__typingBenchmarkTimerEvents = [];
				window.setTimeout = ( callback, timeout, ...args ) => {
					const requestedTimeoutMs = Number( timeout );
					const shouldRewrite =
						timeoutRewriteMs !== null &&
						requestedTimeoutMs === 1000;
					const event = {
						scheduledAtMs: performance.now(),
						requestedTimeoutMs,
						effectiveTimeoutMs: shouldRewrite
							? timeoutRewriteMs
							: requestedTimeoutMs,
						rewritten: shouldRewrite,
						callbackSource:
							typeof callback === 'function'
								? Function.prototype.toString
										.call( callback )
										.slice( 0, 240 )
								: String( callback ).slice( 0, 240 ),
						stack: new Error().stack?.slice( 0, 1000 ),
					};
					window.__typingBenchmarkTimerEvents.push( event );

					const wrappedCallback =
						typeof callback === 'function'
							? function wrappedTypingBenchmarkTimer(
									...callbackArgs
							  ) {
									event.firedAtMs = performance.now();
									return callback.apply( this, callbackArgs );
							  }
							: callback;

					return originalSetTimeout(
						wrappedCallback,
						shouldRewrite ? timeoutRewriteMs : timeout,
						...args
					);
				};
			}, rewriteTimeout1000Ms );
		}

		let editorSetupIndex = -1;
		let paragraph;

		async function setupEditor() {
			editorSetupIndex++;

			const setupStartedAtEpochMs = Date.now();
			await admin.createNewPost();
			await perfUtils.disableAutosave();
			if ( scenario === 'large-post-paragraph' ) {
				await perfUtils.loadBlocksForLargePost();
			} else if ( scenario === 'small-containers-paragraph' ) {
				await perfUtils.loadBlocksForSmallPostWithContainers();
			} else if ( scenario === 'thousand-paragraphs-paragraph' ) {
				await perfUtils.load1000Paragraphs();
			}
			await editor.insertBlock( { name: 'core/paragraph' } );

			const setupBlockCount = await page.evaluate( () =>
				window.wp.data.select( 'core/block-editor' ).getBlockCount()
			);

			const canvas = await perfUtils.getCanvas();
			paragraph = canvas.getByRole( 'document', {
				name: /Empty block/i,
			} );

			await paragraph.click();
			await setupTimerTracing();
			await setupPersistenceTracing();
			const dataTracingSetup = await setupDataTracing();

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
			};
		}

		let editorSetup = null;
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

				await metrics.startTracing();
				if ( waitForPersistenceBetweenKeys ) {
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
						await page.keyboard.type( 'x' );
					}
				} else {
					await page.keyboard.type( 'x'.repeat( sampleCount ), {
						delay: delayMs,
						timeout: Math.max( 30_000, sampleCount * delayMs * 4 ),
					} );
				}
				await metrics.stopTracing();

				const runStoppedAtBrowserNowMs = await page.evaluate( () =>
					performance.now()
				);
				const runStoppedAtEpochMs = Date.now();

				const keyboardEvents = keyboardEventDispatches( metrics.trace );
				const keyGroups = groupedKeyboardEvents( metrics.trace );

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

				if ( keyGroups.length !== sampleCount ) {
					console.warn(
						`Delay ${ delayMs }ms round ${ round } produced ` +
							`${ keyGroups.length } key groups, expected ${ sampleCount }.`
					);
				}
			}
		}

		const benchmarkStoppedAtEpochMs = Date.now();
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
				freshEditorPerDelay,
				waitForPersistenceBetweenKeys,
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
