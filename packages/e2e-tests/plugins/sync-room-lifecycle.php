<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Sync Room Lifecycle
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-sync-room-lifecycle
 */

/**
 * Registers room lifecycle repro helpers for the block editor.
 */
function gutenberg_test_sync_room_lifecycle_scripts() {
	wp_enqueue_script(
		'gutenberg-test-sync-room-lifecycle',
		plugins_url( 'sync-room-lifecycle/index.js', __FILE__ ),
		array(
			'wp-data',
			'wp-dom-ready',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'sync-room-lifecycle/index.js' ),
		true
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_sync_room_lifecycle_scripts' );
