import path from 'path';

import { defineConfig } from '@playwright/test';

import baseConfig from '../../test/e2e/playwright.config';

export default defineConfig( {
	...baseConfig,
	testDir: path.resolve( __dirname, '../../test/e2e/specs' ),
	webServer: undefined,
	workers: 1,
} );
