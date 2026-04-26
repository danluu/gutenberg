<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Sync Provider Lifecycle
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-sync-provider-lifecycle
 */

/**
 * Registers provider lifecycle repro helpers for the block editor.
 */
function gutenberg_test_sync_provider_lifecycle_scripts() {
	wp_enqueue_script(
		'gutenberg-test-sync-provider-lifecycle',
		plugins_url( 'sync-provider-lifecycle/index.js', __FILE__ ),
		array(
			'wp-data',
			'wp-dom-ready',
			'wp-hooks',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'sync-provider-lifecycle/index.js' ),
		true
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_sync_provider_lifecycle_scripts' );
