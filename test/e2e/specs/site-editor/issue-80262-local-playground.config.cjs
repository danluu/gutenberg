const os = require( 'node:os' );
const path = require( 'node:path' );
const { defineConfig } = require( '@playwright/test' );

// This reproduction owns its WordPress Playground and raw Chrome processes;
// it intentionally does not start the repository's wp-env web server.
module.exports = defineConfig( {
	testDir: __dirname,
	testMatch: 'issue-80262-local-playground.spec.js',
	outputDir: path.join(
		os.tmpdir(),
		'gutenberg-issue-80262-local-playwright-output'
	),
	reporter: 'list',
	workers: 1,
	use: {
		headless: true,
		screenshot: 'off',
		trace: 'off',
		video: 'off',
	},
} );
