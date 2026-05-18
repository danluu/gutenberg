<?php
/**
 * Plugin Name: Gutenberg Test Plugin, RTC WebSocket Provider
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-rtc-websocket-provider
 */

/**
 * Enqueues a test-only WebSocket sync provider for RTC e2e tests.
 */
function gutenberg_test_rtc_websocket_provider_enqueue() {
	$script_path = plugin_dir_path( __FILE__ ) . 'rtc-websocket-provider/build/index.js';
	$ws_url      = '';

	// The Playwright globalSetup writes the resolved WS URL here so the PHP
	// plugin can find it. wp-env does not forward host env vars into the
	// container, so getenv() alone would always miss any port override.
	$config_path = plugin_dir_path( __FILE__ ) . 'rtc-websocket-provider/build/runtime-config.json';
	if ( file_exists( $config_path ) ) {
		$config = json_decode( file_get_contents( $config_path ), true );
		if ( is_array( $config ) && ! empty( $config['url'] ) ) {
			$ws_url = $config['url'];
		}
	}

	if ( ! $ws_url ) {
		$ws_url = getenv( 'GUTENBERG_RTC_TEST_WS_URL' );
	}

	if ( ! $ws_url ) {
		$ws_port = getenv( 'GUTENBERG_RTC_TEST_WS_PORT' );
		if ( ! $ws_port ) {
			$ws_port = '18991';
		}
		$ws_url = 'ws://127.0.0.1:' . $ws_port;
	}

	$bootstrap_script = sprintf(
		<<<'JS'
( function() {
	const settings = %s;
	const state = window.__gutenbergTestWebSocketSync || {};

	if ( ! state.providerReady ) {
		state.providerReady = new Promise( ( resolve ) => {
			state.resolveProviderReady = resolve;
		} );
	}

	state.bootstrapFilterRegistered = true;
	state.bootstrapProviderCreatorCalls =
		state.bootstrapProviderCreatorCalls || 0;
	state.providerBundleLoaded = state.providerBundleLoaded || false;
	state.providerDiagnostics = state.providerDiagnostics || [];
	state.providerReadyResolved = state.providerReadyResolved || false;
	state.rooms = state.rooms || {};
	state.tick = state.tick || 0;
	state.url = settings.url || state.url;

	window.gutenbergTestWebSocketSync = settings;
	window.__gutenbergTestWebSocketSync = state;

	window.wp.hooks.addFilter(
		'sync.providers',
		'gutenberg-test/rtc-websocket-provider-bootstrap',
		() => [
			async ( providerOptions ) => {
				state.bootstrapProviderCreatorCalls += 1;
				state.tick += 1;
				const createProvider = await state.providerReady;
				return createProvider( providerOptions );
			},
		]
	);
} )();
JS,
		wp_json_encode(
			array(
				'url' => $ws_url,
			)
		)
	);

	wp_add_inline_script(
		'wp-hooks',
		$bootstrap_script,
		'after'
	);

	wp_enqueue_script(
		'gutenberg-test-rtc-websocket-provider',
		plugins_url( 'rtc-websocket-provider/build/index.js', __FILE__ ),
		array( 'wp-hooks', 'wp-sync' ),
		filemtime( $script_path ),
		true
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_rtc_websocket_provider_enqueue' );
