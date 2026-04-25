<?php
/**
 * Plugin Name: Gutenberg Test Nested Rich Selection
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-nested-rich-selection
 */

/**
 * Registers a custom script for the plugin.
 */
function enqueue_nested_rich_selection_plugin_script() {
	wp_enqueue_script(
		'gutenberg-test-nested-rich-selection',
		plugins_url( 'nested-rich-selection/index.js', __FILE__ ),
		array(
			'wp-blocks',
			'wp-block-editor',
			'wp-element',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'nested-rich-selection/index.js' ),
		true
	);
}

add_action( 'init', 'enqueue_nested_rich_selection_plugin_script' );
