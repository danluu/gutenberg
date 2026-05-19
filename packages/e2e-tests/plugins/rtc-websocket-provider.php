<?php
/**
 * Plugin Name: Gutenberg Test Plugin, RTC WebSocket Provider
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-rtc-websocket-provider
 */

/**
 * Returns the current request host for selecting host-specific runtime config.
 *
 * @return string Current HTTP host, if available.
 */
function gutenberg_test_rtc_websocket_provider_get_request_host() {
	if ( ! empty( $_SERVER['HTTP_HOST'] ) ) {
		return strtolower( sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) );
	}

	if ( ! empty( $_SERVER['SERVER_NAME'] ) && ! empty( $_SERVER['SERVER_PORT'] ) ) {
		return strtolower(
			sanitize_text_field( wp_unslash( $_SERVER['SERVER_NAME'] ) ) . ':' .
			sanitize_text_field( wp_unslash( $_SERVER['SERVER_PORT'] ) )
		);
	}

	return '';
}

/**
 * Returns the configured WebSocket URL for the current request.
 *
 * @param array $config Runtime config decoded from JSON.
 * @return string WebSocket URL, if configured.
 */
function gutenberg_test_rtc_websocket_provider_get_configured_url( $config ) {
	$request_host = gutenberg_test_rtc_websocket_provider_get_request_host();

	if (
		$request_host &&
		! empty( $config['urlsByHost'] ) &&
		is_array( $config['urlsByHost'] ) &&
		! empty( $config['urlsByHost'][ $request_host ] )
	) {
		return $config['urlsByHost'][ $request_host ];
	}

	if ( ! empty( $config['url'] ) ) {
		return $config['url'];
	}

	return '';
}

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
		if ( is_array( $config ) ) {
			$ws_url = gutenberg_test_rtc_websocket_provider_get_configured_url( $config );
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

	wp_enqueue_script(
		'gutenberg-test-rtc-websocket-provider',
		plugins_url( 'rtc-websocket-provider/build/index.js', __FILE__ ),
		array( 'wp-hooks', 'wp-sync' ),
		filemtime( $script_path ),
		true
	);

	wp_add_inline_script(
		'gutenberg-test-rtc-websocket-provider',
		'window.gutenbergTestWebSocketSync = ' . wp_json_encode(
			array(
				'url' => $ws_url,
			)
		) . ';',
		'before'
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_rtc_websocket_provider_enqueue' );
