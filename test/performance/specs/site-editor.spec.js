/* eslint-disable playwright/expect-expect */

/**
 * Node dependencies
 */
import fs from 'fs';
import nodePath from 'path';

/**
 * WordPress dependencies
 */
import { test, Metrics } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { PerfUtils } from '../fixtures';

// See https://github.com/WordPress/gutenberg/issues/51383#issuecomment-1613460429
const DEFAULT_BROWSER_IDLE_WAIT_MS = Number.parseInt(
	process.env.PERFORMANCE_BROWSER_IDLE_WAIT_MS || '1000',
	10
);
const TYPING_DELAY_MS = Number.parseInt(
	process.env.PERFORMANCE_TYPING_DELAY_MS ||
		String( DEFAULT_BROWSER_IDLE_WAIT_MS ),
	10
);
const MEASUREMENT_IDLE_WAIT_MS = Number.parseInt(
	process.env.PERFORMANCE_MEASUREMENT_IDLE_WAIT_MS ||
		String( DEFAULT_BROWSER_IDLE_WAIT_MS ),
	10
);
const PATTERN_READINESS_WAIT =
	process.env.PERFORMANCE_PATTERN_READINESS_WAIT || 'fixed';
const PATTERN_READINESS_TIMEOUT_MS = Number.parseInt(
	process.env.PERFORMANCE_PATTERN_READINESS_TIMEOUT_MS ||
		String( MEASUREMENT_IDLE_WAIT_MS ),
	10
);
const PATTERN_READINESS_QUIET_WINDOW_MS = Number.parseInt(
	process.env.PERFORMANCE_PATTERN_READINESS_QUIET_WINDOW_MS || '100',
	10
);
const RESULTS_OUTPUT_DIR = process.env.SITE_EDITOR_RESULTS_OUTPUT_DIR;

if (
	! Number.isFinite( DEFAULT_BROWSER_IDLE_WAIT_MS ) ||
	DEFAULT_BROWSER_IDLE_WAIT_MS < 0
) {
	throw new Error(
		'PERFORMANCE_BROWSER_IDLE_WAIT_MS must be a non-negative integer.'
	);
}

if ( ! Number.isFinite( TYPING_DELAY_MS ) || TYPING_DELAY_MS < 0 ) {
	throw new Error(
		'PERFORMANCE_TYPING_DELAY_MS must be a non-negative integer.'
	);
}

if (
	! Number.isFinite( MEASUREMENT_IDLE_WAIT_MS ) ||
	MEASUREMENT_IDLE_WAIT_MS < 0
) {
	throw new Error(
		'PERFORMANCE_MEASUREMENT_IDLE_WAIT_MS must be a non-negative integer.'
	);
}

if (
	! Number.isFinite( PATTERN_READINESS_TIMEOUT_MS ) ||
	PATTERN_READINESS_TIMEOUT_MS < 0
) {
	throw new Error(
		'PERFORMANCE_PATTERN_READINESS_TIMEOUT_MS must be a non-negative integer.'
	);
}

if (
	! Number.isFinite( PATTERN_READINESS_QUIET_WINDOW_MS ) ||
	PATTERN_READINESS_QUIET_WINDOW_MS < 0
) {
	throw new Error(
		'PERFORMANCE_PATTERN_READINESS_QUIET_WINDOW_MS must be a non-negative integer.'
	);
}

if (
	! [ 'fixed', 'block-patterns', 'block-patterns-resource-quiet' ].includes(
		PATTERN_READINESS_WAIT
	)
) {
	throw new Error(
		'PERFORMANCE_PATTERN_READINESS_WAIT must be fixed, block-patterns, or block-patterns-resource-quiet.'
	);
}

const results = {
	serverResponse: [],
	firstPaint: [],
	domContentLoaded: [],
	loaded: [],
	firstContentfulPaint: [],
	firstBlock: [],
	type: [],
	typeContainer: [],
	focus: [],
	inserterOpen: [],
	inserterHover: [],
	inserterSearch: [],
	listViewOpen: [],
	navigate: [],
	loadPatterns: [],
	loadPatternsReadiness: [],
	loadPages: [],
};

async function waitForPatternReadiness( page ) {
	const resourceCountBeforeWait = await page.evaluate(
		() => performance.getEntriesByType( 'resource' ).length
	);
	const getResourceSummaries = async ( startIndex, endIndex ) =>
		await page.evaluate(
			( { start, end } ) =>
				performance
					.getEntriesByType( 'resource' )
					.slice( start, end )
					.map( ( entry ) => ( {
						name: entry.name,
						initiatorType: entry.initiatorType,
						duration: entry.duration,
						transferSize: entry.transferSize,
					} ) ),
			{ start: startIndex, end: endIndex }
		);

	if ( PATTERN_READINESS_WAIT === 'fixed' ) {
		// Wait for the browser to be idle before starting the monitoring.
		// eslint-disable-next-line no-restricted-syntax, playwright/no-wait-for-timeout
		await page.waitForTimeout( MEASUREMENT_IDLE_WAIT_MS );
		const resourceCountAfterWait = await page.evaluate(
			() => performance.getEntriesByType( 'resource' ).length
		);
		return {
			mode: PATTERN_READINESS_WAIT,
			waitMs: MEASUREMENT_IDLE_WAIT_MS,
			timeoutMs: MEASUREMENT_IDLE_WAIT_MS,
			quietWindowMs: null,
			timedOut: false,
			resourceCountBeforeWait,
			resourceCountAfterWait,
			waitResourceDelta: resourceCountAfterWait - resourceCountBeforeWait,
			waitResources: await getResourceSummaries(
				resourceCountBeforeWait,
				resourceCountAfterWait
			),
			hasFinishedResolution: null,
			compatiblePatternCount: null,
			totalPatternCount: null,
			restPatternCount: null,
			settingsPatternCount: null,
			templateArea: null,
			templateSlug: null,
		};
	}

	return await page.evaluate(
		async ( options ) => {
			const { mode, timeoutMs, quietWindowMs } = options;
			const sleep = ( ms ) =>
				new Promise( ( resolve ) => setTimeout( resolve, ms ) );
			const startTime = performance.now();
			const deadline = startTime + timeoutMs;
			const browserResourceCountBeforeWait =
				performance.getEntriesByType( 'resource' ).length;
			let timedOut = false;
			let resolverError = null;

			function resourceSummaries( startIndex, endIndex ) {
				return performance
					.getEntriesByType( 'resource' )
					.slice( startIndex, endIndex )
					.map( ( entry ) => ( {
						name: entry.name,
						initiatorType: entry.initiatorType,
						duration: entry.duration,
						transferSize: entry.transferSize,
					} ) );
			}

			function patternState() {
				const { select } = window.wp.data;
				const core = select( 'core' );
				const editor = select( 'core/editor' );
				const settings = editor.getEditorSettings?.() || {};
				const postType = editor.getCurrentPostType?.();
				const postId = editor.getCurrentPostId?.();
				const record = core.getEditedEntityRecord?.(
					'postType',
					postType,
					postId
				);
				const restPatterns = core.getBlockPatterns?.() || [];
				const settingsPatterns =
					settings.__experimentalAdditionalBlockPatterns ??
					settings.__experimentalBlockPatterns ??
					[];
				const patterns = [ ...settingsPatterns, ...restPatterns ];
				const excludedSources = [
					'core',
					'pattern-directory/core',
					'pattern-directory/featured',
				];
				const templateArea = record?.area;
				const templateSlug = record?.slug;
				const compatiblePatterns = patterns.filter(
					( pattern, index, items ) => {
						if ( ! pattern?.name ) {
							return false;
						}
						const duplicate =
							index !==
							items.findIndex(
								( item ) => item?.name === pattern.name
							);
						if ( duplicate ) {
							return false;
						}
						const navigationOverlayException =
							templateArea === 'navigation-overlay' &&
							pattern.blockTypes?.includes(
								'core/template-part/navigation-overlay'
							);
						if (
							! navigationOverlayException &&
							excludedSources.includes( pattern.source )
						) {
							return false;
						}
						return (
							pattern.templateTypes?.includes( templateSlug ) ||
							pattern.blockTypes?.includes(
								`core/template-part/${ templateArea }`
							)
						);
					}
				);

				return {
					hasFinishedResolution:
						core.hasFinishedResolution?.( 'getBlockPatterns' ) ??
						false,
					isResolving:
						core.isResolving?.( 'getBlockPatterns' ) ?? false,
					compatiblePatternCount: compatiblePatterns.length,
					totalPatternCount: patterns.length,
					restPatternCount: restPatterns.length,
					settingsPatternCount: settingsPatterns.length,
					templateArea,
					templateSlug,
				};
			}

			try {
				await Promise.race( [
					window.wp.data.resolveSelect( 'core' ).getBlockPatterns(),
					sleep( timeoutMs ).then( () => {
						timedOut = true;
					} ),
				] );
			} catch ( error ) {
				resolverError = String( error );
			}

			let state = patternState();
			while (
				! timedOut &&
				performance.now() < deadline &&
				( ! state.hasFinishedResolution ||
					state.compatiblePatternCount === 0 )
			) {
				await sleep( 25 );
				state = patternState();
			}

			if (
				! state.hasFinishedResolution ||
				state.compatiblePatternCount === 0
			) {
				timedOut = true;
			}

			let quietWindowSatisfied = mode !== 'block-patterns-resource-quiet';
			let quietWindowWaitMs = 0;
			if ( ! timedOut && mode === 'block-patterns-resource-quiet' ) {
				let lastResourceCount =
					performance.getEntriesByType( 'resource' ).length;
				let quietSince = performance.now();
				const quietStartTime = quietSince;

				while ( performance.now() < deadline ) {
					await sleep( 25 );
					const resourceCount =
						performance.getEntriesByType( 'resource' ).length;
					if ( resourceCount !== lastResourceCount ) {
						lastResourceCount = resourceCount;
						quietSince = performance.now();
					}

					if ( performance.now() - quietSince >= quietWindowMs ) {
						quietWindowSatisfied = true;
						break;
					}
				}

				quietWindowWaitMs = performance.now() - quietStartTime;
				if ( ! quietWindowSatisfied ) {
					timedOut = true;
				}
			}

			return {
				mode,
				waitMs: performance.now() - startTime,
				timeoutMs,
				quietWindowMs,
				quietWindowSatisfied,
				quietWindowWaitMs,
				timedOut,
				resolverError,
				resourceCountBeforeWait: browserResourceCountBeforeWait,
				resourceCountAfterWait:
					performance.getEntriesByType( 'resource' ).length,
				waitResourceDelta:
					performance.getEntriesByType( 'resource' ).length -
					browserResourceCountBeforeWait,
				waitResources: resourceSummaries(
					browserResourceCountBeforeWait,
					performance.getEntriesByType( 'resource' ).length
				),
				...state,
			};
		},
		{
			mode: PATTERN_READINESS_WAIT,
			timeoutMs: PATTERN_READINESS_TIMEOUT_MS,
			quietWindowMs: PATTERN_READINESS_QUIET_WINDOW_MS,
		}
	);
}

test.describe( 'Site Editor Performance', () => {
	test.use( {
		perfUtils: async ( { page }, use ) => {
			await use( new PerfUtils( { page } ) );
		},
		metrics: async ( { page }, use ) => {
			await use( new Metrics( { page } ) );
		},
	} );

	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'emptytheme' );
		await requestUtils.deleteAllTemplates( 'wp_template' );
		await requestUtils.deleteAllTemplates( 'wp_template_part' );
	} );

	test.afterAll( async ( { requestUtils }, testInfo ) => {
		await testInfo.attach( 'results', {
			body: JSON.stringify( results, null, 2 ),
			contentType: 'application/json',
		} );

		if ( RESULTS_OUTPUT_DIR ) {
			fs.mkdirSync( RESULTS_OUTPUT_DIR, { recursive: true } );
			fs.writeFileSync(
				nodePath.join(
					RESULTS_OUTPUT_DIR,
					`site-editor-results-${ Date.now() }.json`
				),
				JSON.stringify(
					{
						metadata: {
							browserIdleWait: DEFAULT_BROWSER_IDLE_WAIT_MS,
							typingDelayMs: TYPING_DELAY_MS,
							measurementIdleWaitMs: MEASUREMENT_IDLE_WAIT_MS,
							patternReadinessWait: PATTERN_READINESS_WAIT,
							patternReadinessTimeoutMs:
								PATTERN_READINESS_TIMEOUT_MS,
							patternReadinessQuietWindowMs:
								PATTERN_READINESS_QUIET_WINDOW_MS,
						},
						results,
					},
					null,
					2
				)
			);
		}

		await requestUtils.deleteAllTemplates( 'wp_template' );
		await requestUtils.deleteAllTemplates( 'wp_template_part' );
		await requestUtils.activateTheme( 'twentytwentyone' );
	} );

	test.describe( 'Loading', () => {
		let draftId = null;

		test( 'Setup the test page', async ( { requestUtils, perfUtils } ) => {
			const content = await perfUtils.loadContentForLargePost();
			const page = await requestUtils.createPage( {
				content,
				status: 'draft',
			} );

			draftId = page.id;
		} );

		const samples = 10;
		const throwaway = 1;
		const iterations = samples + throwaway;
		for ( let i = 1; i <= iterations; i++ ) {
			test( `Run the test (${ i } of ${ iterations })`, async ( {
				admin,
				perfUtils,
				metrics,
			} ) => {
				// Go to the test draft.
				await admin.visitSiteEditor( {
					postId: draftId,
					postType: 'page',
					canvas: 'edit',
				} );

				// Wait for the first block.
				const canvas = await perfUtils.getCanvas();
				await canvas.locator( '.wp-block' ).first().waitFor();

				// Get the durations.
				const loadingDurations = await metrics.getLoadingDurations();

				// Save the results.
				if ( i > throwaway ) {
					Object.entries( loadingDurations ).forEach(
						( [ metric, duration ] ) => {
							if ( metric === 'timeSinceResponseEnd' ) {
								results.firstBlock.push( duration );
							} else {
								results[ metric ].push( duration );
							}
						}
					);

					const serverTiming = await metrics.getServerTiming();

					for ( const [ key, value ] of Object.entries(
						serverTiming
					) ) {
						results[ key ] ??= [];
						results[ key ].push( value );
					}
				}
			} );
		}
	} );

	test.describe( 'Typing', () => {
		let draftId = null;

		test( 'Setup the test post', async ( { requestUtils, perfUtils } ) => {
			const content = await perfUtils.loadContentForLargePost();
			const page = await requestUtils.createPage( {
				content:
					content + `<!-- wp:paragraph --><!-- /wp:paragraph -->`,
				status: 'draft',
			} );

			draftId = page.id;
		} );

		test( 'Run the test', async ( { admin, perfUtils, metrics, page } ) => {
			// Go to the test draft.
			await admin.visitSiteEditor( {
				postId: draftId,
				postType: 'page',
				canvas: 'edit',
			} );

			// Enter edit mode (second click is needed for the legacy edit mode).
			const canvas = await perfUtils.getCanvas();

			// Run the test with the sidebar closed
			const toggleSidebarButton = page
				.getByRole( 'region', { name: 'Editor top bar' } )
				.getByRole( 'button', {
					name: 'Settings',
					disabled: false,
				} );
			const isClosed =
				( await toggleSidebarButton.getAttribute(
					'aria-expanded'
				) ) === 'false';
			if ( ! isClosed ) {
				await toggleSidebarButton.click();
			}

			const paragraph = canvas.getByRole( 'document', {
				name: /Empty block/i,
			} );

			// The first character typed triggers a longer time (isTyping change).
			// It can impact the stability of the metric, so we exclude it. It
			// probably deserves a dedicated metric itself, though.
			const samples = 10;
			const throwaway = 1;
			const iterations = samples + throwaway;

			// Start tracing.
			await metrics.startTracing();

			// Type the testing sequence into the empty paragraph.
			await paragraph.type( 'x'.repeat( iterations ), {
				delay: TYPING_DELAY_MS,
				// The extended timeout is needed because the typing is very slow
				// and the `delay` value itself does not extend it.
				timeout: Math.max( iterations * TYPING_DELAY_MS * 2, 5000 ), // 2x the total time to be safe.
			} );

			// Stop tracing.
			await metrics.stopTracing();

			// Get the durations.
			const [ keyDownEvents, keyPressEvents, keyUpEvents ] =
				metrics.getTypingEventDurations();

			// Save the results.
			for ( let i = throwaway; i < iterations; i++ ) {
				results.type.push(
					keyDownEvents[ i ] + keyPressEvents[ i ] + keyUpEvents[ i ]
				);
			}
		} );
	} );

	test.describe( 'Navigating', () => {
		test.beforeAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentythree' );
		} );

		test.afterAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentyone' );
		} );

		const iterations = 5;
		for ( let i = 1; i <= iterations; i++ ) {
			test( `Run the test (${ i } of ${ iterations })`, async ( {
				admin,
				page,
				metrics,
			} ) => {
				await admin.visitSiteEditor( {
					// The old URL is supported in both previous versions and new versions.
					path: '/wp_template',
				} );

				// The Templates index page has changed, so we need to know which UI is in use in the branch.
				// We do so by checking the presence of the dataviews component.
				// If it's there, switch to the list layout before running the test.
				// See https://github.com/WordPress/gutenberg/pull/59792
				const isDataViewsUI = await page
					.getByRole( 'button', { name: 'Layout' } )
					.isVisible();
				if ( isDataViewsUI ) {
					await page
						.getByRole( 'button', { name: 'Layout' } )
						.click();
					await page
						.getByRole( 'menuitemradio' )
						.filter( { has: page.getByText( 'List' ) } )
						.click();
				}

				await metrics.startTracing();
				await page
					.getByRole( 'button', {
						name: 'Single Posts',
						exact: true,
					} )
					.click( { force: true } );
				await metrics.stopTracing();

				// Get the durations.
				const [ mouseClickEvents ] = metrics.getClickEventDurations();

				// Save the results.
				results.navigate.push( mouseClickEvents[ 0 ] );
			} );
		}
	} );

	test.describe( 'Loading Patterns', () => {
		test.beforeAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentyfour' );
		} );

		test.afterAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentyfour' );
		} );

		test( 'Run the test', async ( {
			page,
			admin,
			perfUtils,
			editor,
			requestUtils,
		} ) => {
			await Promise.all(
				Array.from( { length: 10 }, async () => {
					const { id } = await requestUtils.createPost( {
						status: 'publish',
						title: 'A post',
						content: `
<!-- wp:heading -->
<p>Hello</p>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Post content</p>
<!-- /wp:paragraph -->`,
					} );

					return id;
				} )
			);

			const samples = 10;
			for ( let i = 1; i <= samples; i++ ) {
				// We want to start from a fresh state each time, without
				// queries or patterns already cached.
				await admin.visitSiteEditor( { canvas: 'edit' } );
				await editor.openDocumentSettingsSidebar();

				/*
				 * https://github.com/WordPress/gutenberg/pull/55091 updated the HTML by
				 * removing the replace template button in sidebar-edit-mode/template-panel/replace-template-button.js
				 * with a "transform into" list. https://github.com/WordPress/gutenberg/pull/59259 made these tests
				 * compatible with the new UI, however, the performance tests compare previous versions of the UI.
				 *
				 * The following code is a workaround to test the performance of the new UI.
				 * `actionsButtonElement` is used to check if the old UI is present.
				 * If there is a Replace template button (old UI), click it, otherwise, click the "transform into" button.
				 * Once the performance tests are updated to compare compatible versions this code can be removed.
				 */
				const isActionsButtonVisible = await page
					.locator(
						'.edit-site-template-card__actions button[aria-label="Actions"]'
					)
					.isVisible();

				if ( isActionsButtonVisible ) {
					await page
						.getByRole( 'button', {
							name: 'Actions',
						} )
						.click();
				}

				const readiness = await waitForPatternReadiness( page );
				results.loadPatternsReadiness.push( readiness );

				const startTime = performance.now();

				if ( isActionsButtonVisible ) {
					await page
						.getByRole( 'menuitem', { name: 'Replace template' } )
						.click();
				} else {
					await page
						.getByRole( 'button', { name: 'Design' } )
						.or(
							// Locator for backward compatibility with the old UI.
							// The label was updated in https://github.com/WordPress/gutenberg/pull/62161.
							page.getByRole( 'button', {
								name: 'Transform into:',
							} )
						)
						.click();
				}

				const patterns = [
					'Blogging home template',
					'Business home template',
					'Portfolio home template with post featured images',
					'Blogging index template',
				];

				await Promise.all(
					patterns.map( async ( pattern ) => {
						const canvas = await perfUtils.getCanvas(
							page
								.getByRole( 'option', {
									name: pattern,
									exact: true,
								} )
								.getByTitle( 'Editor canvas' )
						);

						// Wait until the first block is rendered AND all
						// patterns are replaced.
						await Promise.all( [
							canvas.locator( '.wp-block' ).first().waitFor(),
							page.waitForFunction(
								() =>
									document.querySelectorAll(
										'[data-type="core/pattern"]'
									).length === 0
							),
						] );
					} )
				);

				const endTime = performance.now();

				results.loadPatterns.push( endTime - startTime );
				readiness.resourceCountAfterMeasurement = await page.evaluate(
					() => performance.getEntriesByType( 'resource' ).length
				);
				readiness.measurementResourceDelta =
					readiness.resourceCountAfterMeasurement -
					readiness.resourceCountAfterWait;
				readiness.measurementResources = await page.evaluate(
					( startIndex ) =>
						performance
							.getEntriesByType( 'resource' )
							.slice( startIndex )
							.map( ( entry ) => ( {
								name: entry.name,
								initiatorType: entry.initiatorType,
								duration: entry.duration,
								transferSize: entry.transferSize,
							} ) ),
					readiness.resourceCountAfterWait
				);

				await page.keyboard.press( 'Escape' );
			}
		} );
	} );

	test.describe( 'Loading Pages', () => {
		test.beforeAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentyfour' );
		} );

		test.afterAll( async ( { requestUtils } ) => {
			await requestUtils.activateTheme( 'twentytwentyfour' );
		} );

		const perPage = 9;

		test( 'Run the test', async ( { page, admin, requestUtils } ) => {
			await Promise.all(
				Array.from( { length: perPage }, async ( el, index ) => {
					const { id } = await requestUtils.createPage( {
						status: 'publish',
						title: `Page (${ index })`,
						content: `
<!-- wp:heading -->
<p>Hello</p>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Post content</p>
<!-- /wp:paragraph -->`,
					} );

					return id;
				} )
			);

			await admin.visitSiteEditor();
			await page.getByRole( 'button', { name: 'Pages' } ).click();

			// Check if we're dealing with the old URL structure.
			const path = new URL( page.url() ).searchParams.get( 'path' );

			const samples = 10;
			for ( let i = 1; i <= samples; i++ ) {
				// Start from the trash view, then navigate to all pages, so we
				// test item loading rather than site editor load as a whole.
				// For some reason `visiSiteEditor` does not work with these
				// parameters.
				await admin.visitAdminPage(
					path
						? 'site-editor.php?path=%2Fpage&layout=table&activeView=trash'
						: 'site-editor.php?postType=page&layout=table&activeView=trash'
				);

				const startTime = performance.now();

				await page.getByRole( 'button', { name: 'All Pages' } ).click();

				// Wait for all pages to be rendered.
				await Promise.all(
					Array.from( { length: perPage }, async ( el, index ) => {
						return await page
							.getByLabel( `Page (${ index })` )
							.waitFor( { state: 'attached' } );
					} )
				);

				const endTime = performance.now();

				results.loadPages.push( endTime - startTime );
			}
		} );
	} );
} );

/* eslint-enable playwright/expect-expect */
