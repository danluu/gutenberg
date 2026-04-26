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

	$post_id = isset( $_GET['post'] )
		? absint( wp_unslash( $_GET['post'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		: 0;
	$mode    = '';

	if ( $post_id ) {
		$title = get_the_title( $post_id );
		$user  = wp_get_current_user();

		if ( false !== strpos( $title, 'RTC automatic provider recovery no-query' ) ) {
			$mode = 'collaborator' === $user->user_login
				? 'ready-default'
				: 'auto-default';
		} elseif ( false !== strpos( $title, 'RTC partial default provider no-query' ) ) {
			$mode = 'partial-default';
		}
	}

	wp_add_inline_script(
		'gutenberg-test-sync-provider-lifecycle',
		'window.__rtcProviderLifecycleConfig = ' . wp_json_encode(
			array(
				'mode' => $mode,
			)
		) . ';',
		'before'
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_sync_provider_lifecycle_scripts' );
