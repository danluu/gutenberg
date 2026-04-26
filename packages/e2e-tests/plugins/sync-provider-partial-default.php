<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Sync Provider Partial Default
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-sync-provider-partial-default
 */

/**
 * Registers a provider extension that appends a failing provider after
 * Gutenberg's default HTTP provider.
 */
function gutenberg_test_sync_provider_partial_default_scripts() {
	wp_enqueue_script(
		'gutenberg-test-sync-provider-partial-default',
		plugins_url( 'sync-provider-lifecycle/index.js', __FILE__ ),
		array(
			'wp-data',
			'wp-dom-ready',
			'wp-hooks',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'sync-provider-lifecycle/index.js' ),
		true
	);

	wp_add_inline_script(
		'gutenberg-test-sync-provider-partial-default',
		'window.__rtcProviderLifecycleConfig = ' . wp_json_encode(
			array(
				'mode' => 'partial-default',
			)
		) . ';',
		'before'
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_sync_provider_partial_default_scripts' );
