const { test, expect } = require( '@playwright/test' );
const { runRepro } = require( './issue-80262-playground-lifecycle-repro.cjs' );

const configuredRunTimeoutMs = Number.parseInt(
	process.env.RUN_TIMEOUT_MS || '360000',
	10
);
let wrapperTimeoutMs = 480_000;
if ( Number.isFinite( configuredRunTimeoutMs ) && configuredRunTimeoutMs > 0 ) {
	wrapperTimeoutMs = configuredRunTimeoutMs + 120_000;
}

test.describe( 'Issue 80262 hosted Playground lifecycle', () => {
	// The helper's watchdog must fire and clean up before the test worker itself
	// is eligible for termination, including when RUN_TIMEOUT_MS is overridden.
	test.setTimeout( wrapperTimeoutMs );

	test( 'keeps the Site Editor canvas readable after Playground restarts its service worker', async () => {
		// Do not request Playwright's page/browser fixtures. runRepro launches a raw
		// browser process so every CDP client can disconnect during the idle window.
		const result = await runRepro();

		expect(
			result.inconclusive,
			result.error || result.inconclusiveReason
		).not.toBe( true );
		expect(
			result.reproduced,
			`Issue #80262 reproduced with block-editor asset ${ result.assetVersion } (matches reporter asset: ${ result.matchesReporterAssetVersion }). See ${ result.artifactDir }.`
		).toBe( false );
	} );
} );
