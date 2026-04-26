<?php
/**
 * Plugin Name: Gutenberg Test Collaboration Privilege Escalation
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-collaboration-privilege-escalation
 */

/**
 * Registers admin-only post meta that is still displayed by the test sidebar.
 */
function gutenberg_test_collaboration_privilege_escalation_register_meta(): void {
	register_post_meta(
		'post',
		'rtc_privileged_meta',
		array(
			'auth_callback' => static function ( bool $_allowed, string $_meta_key, int $_object_id, int $user_id ): bool {
				return user_can( $user_id, 'manage_options' );
			},
			'show_in_rest'  => true,
			'single'        => true,
			'type'          => 'string',
		)
	);
}
add_action( 'init', 'gutenberg_test_collaboration_privilege_escalation_register_meta' );

/**
 * Enqueues a normal editor sidebar control for the admin-only meta field.
 */
function gutenberg_test_collaboration_privilege_escalation_enqueue(): void {
	wp_enqueue_script(
		'gutenberg-test-collaboration-privilege-escalation',
		plugins_url( 'collaboration-privilege-escalation/index.js', __FILE__ ),
		array(
			'wp-components',
			'wp-data',
			'wp-editor',
			'wp-element',
			'wp-plugins',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'collaboration-privilege-escalation/index.js' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'gutenberg_test_collaboration_privilege_escalation_enqueue' );
