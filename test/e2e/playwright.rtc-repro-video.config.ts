/**
 * External dependencies
 */
import { defineConfig } from '@playwright/test';

/**
 * Internal dependencies
 */
import baseConfig from './playwright.config';

const config = defineConfig( {
	...baseConfig,
	use: {
		...baseConfig.use,
		video: 'retain-on-failure',
		trace: 'off',
		screenshot: 'only-on-failure',
	},
} );

export default config;
