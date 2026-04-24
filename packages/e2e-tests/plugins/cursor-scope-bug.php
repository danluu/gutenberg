<?php
/**
 * Plugin Name: Gutenberg Test Cursor Scope Bug
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 */

add_action(
	'init',
	static function () {
		wp_register_script(
			'cursor-scope-bug-editor',
			plugin_dir_url( __FILE__ ) . 'cursor-scope-bug/editor.js',
			array(
				'wp-blocks',
				'wp-block-editor',
				'wp-element',
			),
			filemtime( plugin_dir_path( __FILE__ ) . 'cursor-scope-bug/editor.js' )
		);

		register_block_type_from_metadata( __DIR__ . '/cursor-scope-bug' );
	}
);
