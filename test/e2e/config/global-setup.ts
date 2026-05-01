/**
 * External dependencies
 */
import { request } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

async function globalSetup( config: FullConfig ) {
	const { storageState, baseURL } = config.projects[ 0 ].use;
	const storageStatePath =
		typeof storageState === 'string' ? storageState : undefined;

	const requestContext = await request.newContext( {
		baseURL,
	} );

	const requestUtils = new RequestUtils( requestContext, {
		storageStatePath,
	} );

	// Authenticate and save the storageState to disk.
	await requestUtils.setupRest();

	const skipGlobalPostCleanup =
		process.env.GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP === '1';

	// Reset the test environment before running the tests.
	const resetTasks = [
		requestUtils.activateTheme( 'twentytwentyone' ),
		// Disable this test plugin as it's conflicting with some of the tests.
		// We already have reduced motion enabled and Playwright will wait for most of the animations anyway.
		requestUtils.deactivatePlugin(
			'gutenberg-test-plugin-disables-the-css-animations'
		),
		requestUtils.deleteAllBlocks(),
		requestUtils.resetPreferences(),
	];

	if ( ! skipGlobalPostCleanup ) {
		resetTasks.push( requestUtils.deleteAllPosts() );
	}

	await Promise.all( resetTasks );

	await requestContext.dispose();
}

export default globalSetup;
