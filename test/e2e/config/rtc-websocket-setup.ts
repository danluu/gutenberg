/**
 * WebSocket-provider-specific globalSetup pieces.
 *
 * Kept in its own module so test/e2e/config/global-setup.ts doesn't have
 * to carry the bundle build, runtime-config write, and sync-server reset
 * machinery the WS suite needs. Activated by playwright.rtc-websocket.config.ts
 * via the GUTENBERG_RTC_TEST_WS_PROVIDER env var.
 */

/**
 * External dependencies
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { build as esbuildBuild } from 'esbuild';
import type { FileHandle } from 'node:fs/promises';

/**
 * WordPress dependencies
 */
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

const PROVIDER_PLUGIN = 'gutenberg-test-plugin-rtc-websocket-provider';
const RUNTIME_CONFIG_LOCK_TIMEOUT_MS = 10000;
const RUNTIME_CONFIG_LOCK_STALE_MS = 30000;
const RUNTIME_CONFIG_LOCK_POLL_MS = 50;

type RuntimeConfig = {
	url?: string;
	urlsByHost?: Record< string, string >;
};

function getProviderPluginDir() {
	return path.resolve(
		__dirname,
		'../../../packages/e2e-tests/plugins/rtc-websocket-provider'
	);
}

function getResolvedWsUrl() {
	return (
		process.env.GUTENBERG_RTC_TEST_WS_URL ||
		`ws://127.0.0.1:${ process.env.GUTENBERG_RTC_TEST_WS_PORT || '18991' }`
	);
}

function getBaseUrlHostAliases() {
	const aliases = new Set< string >();
	const baseUrlCandidates = [
		process.env.WP_BASE_URL,
		process.env.RTC_FUZZ_BASE_URL,
		process.env.PLAYWRIGHT_BASE_URL,
	];

	for ( const rawUrl of baseUrlCandidates ) {
		if ( ! rawUrl ) {
			continue;
		}

		try {
			aliases.add( new URL( rawUrl ).host.toLowerCase() );
		} catch {
			// Ignore non-URL values; the port fallback below still covers wp-env.
		}
	}

	const wpEnvPort = process.env.WP_ENV_PORT;
	if ( wpEnvPort ) {
		aliases.add( `localhost:${ wpEnvPort }` );
		aliases.add( `127.0.0.1:${ wpEnvPort }` );
	}

	return aliases;
}

async function buildProviderBundle() {
	const pluginDir = getProviderPluginDir();
	await esbuildBuild( {
		entryPoints: [ path.join( pluginDir, 'src/index.js' ) ],
		outfile: path.join( pluginDir, 'build/index.js' ),
		bundle: true,
		format: 'iife',
		target: 'es2020',
		alias: { yjs: path.join( pluginDir, 'src/yjs-external.js' ) },
		logLevel: 'warning',
	} );
}

function sleep( ms: number ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

async function withRuntimeConfigLock(
	configPath: string,
	callback: () => Promise< void >
) {
	const lockPath = `${ configPath }.lock`;
	const startedAt = Date.now();
	let lockHandle: FileHandle | null = null;

	while ( ! lockHandle ) {
		try {
			lockHandle = await fs.open( lockPath, 'wx' );
		} catch ( error ) {
			if (
				! (
					error instanceof Error &&
					'code' in error &&
					error.code === 'EEXIST'
				)
			) {
				throw error;
			}

			const stat = await fs.stat( lockPath ).catch( () => null );
			if (
				stat &&
				Date.now() - stat.mtimeMs > RUNTIME_CONFIG_LOCK_STALE_MS
			) {
				await fs.rm( lockPath, { force: true } );
				continue;
			}

			if ( Date.now() - startedAt > RUNTIME_CONFIG_LOCK_TIMEOUT_MS ) {
				throw new Error(
					`Timed out waiting for RTC WebSocket runtime config lock: ${ lockPath }`
				);
			}

			await sleep( RUNTIME_CONFIG_LOCK_POLL_MS );
		}
	}

	try {
		await callback();
	} finally {
		await lockHandle.close();
		await fs.rm( lockPath, { force: true } );
	}
}

async function readRuntimeConfig(
	configPath: string
): Promise< RuntimeConfig > {
	try {
		const config = JSON.parse( await fs.readFile( configPath, 'utf8' ) );
		return config && typeof config === 'object' ? config : {};
	} catch ( error ) {
		if (
			error instanceof Error &&
			'code' in error &&
			error.code === 'ENOENT'
		) {
			return {};
		}
		throw error;
	}
}

// Write the resolved WS URL where the PHP test plugin can read it. wp-env
// does not forward host env vars into the WordPress container, so
// getenv( 'GUTENBERG_RTC_TEST_WS_URL' ) inside PHP would always return false
// and the browser would fall back to ws://127.0.0.1:18991, ignoring any port
// override. The plugin directory is bind-mounted into the container, so a
// file written here on the host is visible to PHP at the same relative path.
//
// Multiple RTC fuzz wp-env instances can share one checkout while running on
// different HTTP and WebSocket ports. Keep a host-keyed map so one globalSetup
// run does not clobber the URL needed by another active editor page.
async function writeRuntimeConfig() {
	const pluginDir = getProviderPluginDir();
	const configPath = path.join( pluginDir, 'build/runtime-config.json' );
	await fs.mkdir( path.dirname( configPath ), { recursive: true } );
	await withRuntimeConfigLock( configPath, async () => {
		const existingConfig = await readRuntimeConfig( configPath );
		const url = getResolvedWsUrl();
		const urlsByHost = {
			...( existingConfig.urlsByHost ?? {} ),
		};

		for ( const host of getBaseUrlHostAliases() ) {
			urlsByHost[ host ] = url;
		}

		const nextConfig: RuntimeConfig = {
			...existingConfig,
			url,
			urlsByHost,
		};
		const tempPath = `${ configPath }.${ process.pid }.tmp`;
		await fs.writeFile( tempPath, JSON.stringify( nextConfig ) + '\n' );
		await fs.rename( tempPath, configPath );
	} );
}

async function resetSyncServer() {
	const resetUrl = new URL( getResolvedWsUrl() );
	resetUrl.protocol = resetUrl.protocol === 'wss:' ? 'https:' : 'http:';
	resetUrl.pathname = '/reset';
	resetUrl.search = '';
	resetUrl.hash = '';

	let lastError: unknown;
	for ( let attempts = 0; attempts < 20; attempts++ ) {
		try {
			const response = await fetch( resetUrl, { method: 'POST' } );
			if ( response.ok || response.status === 204 ) {
				return;
			}
			lastError = new Error(
				`WebSocket sync server reset failed with HTTP ${ response.status }`
			);
		} catch ( error ) {
			lastError = error;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw lastError;
}

/**
 * Set up the WebSocket provider for a globalSetup run.
 *
 * Resolves once any work the WS suite needs is complete: bundle built,
 * runtime config written, plugin activated, and sync server reset. When
 * the WS suite is inactive, just deactivates the plugin so a stale
 * activation from a previous run doesn't bleed into the default suite.
 *
 * @param requestUtils RequestUtils instance for plugin activation calls.
 */
export async function setupRtcWebSocketProvider(
	requestUtils: RequestUtils
): Promise< void > {
	const enabled = process.env.GUTENBERG_RTC_TEST_WS_PROVIDER === '1';

	if ( ! enabled ) {
		await requestUtils.deactivatePlugin( PROVIDER_PLUGIN );
		return;
	}

	// Bundle and runtime config must exist before WP enqueues the plugin
	// script, so build them first. The sync-server reset is independent
	// and can race the plugin activation.
	await buildProviderBundle();
	await writeRuntimeConfig();

	const tasks: Array< Promise< unknown > > = [
		requestUtils.activatePlugin( PROVIDER_PLUGIN ),
	];
	if ( process.env.GUTENBERG_RTC_TEST_WS_SKIP_RESET !== '1' ) {
		tasks.push( resetSyncServer() );
	}
	await Promise.all( tasks );
}
