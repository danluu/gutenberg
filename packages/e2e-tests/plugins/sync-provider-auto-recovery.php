<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Sync Provider Auto Recovery
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-sync-provider-auto-recovery
 */

/**
 * Registers a provider extension that has a transient startup outage and then
 * automatically recovers while delegating to Gutenberg's default HTTP provider.
 */
function gutenberg_test_sync_provider_auto_recovery_scripts() {
	wp_enqueue_script(
		'gutenberg-test-sync-provider-auto-recovery',
		plugins_url( 'sync-provider-lifecycle/index.js', __FILE__ ),
		array(
			'wp-api-fetch',
			'wp-data',
			'wp-dom-ready',
			'wp-hooks',
		),
		filemtime( plugin_dir_path( __FILE__ ) . 'sync-provider-lifecycle/index.js' ),
		true
	);

	$mode = get_option( 'gutenberg_test_sync_provider_auto_recovery_available', false )
		? 'ready-default'
		: 'auto-default';

	wp_add_inline_script(
		'gutenberg-test-sync-provider-auto-recovery',
		'window.__rtcProviderLifecycleConfig = ' . wp_json_encode(
			array(
				'mode'         => $mode,
				'recoveryPath' => '/gutenberg-test/v1/sync-provider-auto-recovery/recover',
			)
		) . ';',
		'before'
	);
}

add_action( 'enqueue_block_editor_assets', 'gutenberg_test_sync_provider_auto_recovery_scripts' );

/**
 * Registers the provider recovery endpoint.
 */
function gutenberg_test_sync_provider_auto_recovery_rest_routes() {
	register_rest_route(
		'gutenberg-test/v1',
		'/sync-provider-auto-recovery/recover',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'gutenberg_test_sync_provider_auto_recovery_recover',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);
}

add_action( 'rest_api_init', 'gutenberg_test_sync_provider_auto_recovery_rest_routes' );

/**
 * Marks the provider extension as recovered for later editor sessions.
 */
function gutenberg_test_sync_provider_auto_recovery_recover() {
	update_option( 'gutenberg_test_sync_provider_auto_recovery_available', true );
	return rest_ensure_response( array( 'available' => true ) );
}

/**
 * Resets provider availability when the extension is activated.
 */
function gutenberg_test_sync_provider_auto_recovery_activate() {
	update_option( 'gutenberg_test_sync_provider_auto_recovery_available', false );
}

register_activation_hook( __FILE__, 'gutenberg_test_sync_provider_auto_recovery_activate' );

/**
 * Removes provider availability state when the extension is deactivated.
 */
function gutenberg_test_sync_provider_auto_recovery_deactivate() {
	delete_option( 'gutenberg_test_sync_provider_auto_recovery_available' );
}

register_deactivation_hook( __FILE__, 'gutenberg_test_sync_provider_auto_recovery_deactivate' );
