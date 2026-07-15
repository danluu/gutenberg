const { test, expect } = require( '@playwright/test' );
const {
	runLocalPlaygroundRepro,
} = require( './issue-80262-local-playground-repro.cjs' );

const hasOwnedLocalServerInputs = Boolean(
	process.env.LOCAL_PLAYGROUND_DIST && process.env.LOCAL_GUTENBERG_ZIP
);
const hasLoopbackPlayground = Boolean( process.env.LOCAL_PLAYGROUND_URL );

test.describe( 'Issue 80262 local Playground lifecycle', () => {
	test.setTimeout( 480_000 );
	test.skip(
		! hasOwnedLocalServerInputs && ! hasLoopbackPlayground,
		'Set LOCAL_PLAYGROUND_DIST and LOCAL_GUTENBERG_ZIP to run this local-only repro.'
	);

	test( 'keeps the Site Editor canvas readable after the local Playground service worker restarts', async () => {
		// This test deliberately does not request Playwright fixtures. The helper
		// uses short-lived processes so no Playwright/CDP client spans the idle.
		const result = await runLocalPlaygroundRepro();

		expect( result.inconclusive, result.error ).toBe( false );
		expect(
			result.checks.loopbackOnlyRuntime,
			`Unexpected successful external runtime responses: ${ JSON.stringify(
				result.externalSuccessfulResponses
			) }`
		).toBe( true );
		expect(
			result.reproduced,
			`Issue #80262 reproduced locally through ${
				result.trigger.route
			}: ${ JSON.stringify( result.checks ) }`
		).toBe( false );
	} );
} );
