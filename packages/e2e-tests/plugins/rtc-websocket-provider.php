<?php
/**
 * Plugin Name: Gutenberg Test Plugin, RTC WebSocket Provider
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-rtc-websocket-provider
 */

/**
 * Validates a test WebSocket server URL.
 *
 * @param mixed $url URL candidate.
 * @return string Valid WebSocket URL, or an empty string.
 */
function gutenberg_test_rtc_websocket_provider_validate_url( $url ) {
	if ( ! is_string( $url ) || '' === $url ) {
		return '';
	}

	$url    = trim( $url );
	$parsed = wp_parse_url( $url );

	if (
		! is_array( $parsed ) ||
		empty( $parsed['host'] ) ||
		empty( $parsed['scheme'] ) ||
		! in_array( $parsed['scheme'], array( 'ws', 'wss' ), true )
	) {
		return '';
	}

	return $url;
}

function gutenberg_test_rtc_websocket_provider_enqueue() {
	$script_path = plugin_dir_path( __FILE__ ) . 'rtc-websocket-provider/build/index.js';
	$ws_url      = '';

	// Prefer per-browser request configuration so concurrent local WS test
	// runs from the same checkout cannot change a reloaded page's server.
	if ( ! empty( $_SERVER['HTTP_X_GUTENBERG_RTC_TEST_WS_URL'] ) ) {
		$ws_url = gutenberg_test_rtc_websocket_provider_validate_url(
			sanitize_text_field(
				rawurldecode(
					wp_unslash( $_SERVER['HTTP_X_GUTENBERG_RTC_TEST_WS_URL'] )
				)
			)
		);
	}

	if ( ! $ws_url && ! empty( $_COOKIE['gutenberg_rtc_test_ws_url'] ) ) {
		$ws_url = gutenberg_test_rtc_websocket_provider_validate_url(
			sanitize_text_field(
				rawurldecode(
					wp_unslash( $_COOKIE['gutenberg_rtc_test_ws_url'] )
				)
			)
		);
	}

	// The Playwright globalSetup writes the resolved WS URL here so the PHP
	// plugin can find it. wp-env does not forward host env vars into the
	// container, so getenv() alone would always miss any port override.
	$config_path = plugin_dir_path( __FILE__ ) . 'rtc-websocket-provider/build/runtime-config.json';
	if ( ! $ws_url && file_exists( $config_path ) ) {
		$config = json_decode( file_get_contents( $config_path ), true );
		if (
			is_array( $config ) &&
			! empty( $config['url'] ) &&
			is_string( $config['url'] )
		) {
			$ws_url = gutenberg_test_rtc_websocket_provider_validate_url(
				sanitize_text_field( rawurldecode( $config['url'] ) )
			);
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
