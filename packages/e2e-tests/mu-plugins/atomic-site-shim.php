<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Atomic Site Shim
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-atomic-site-shim
 */

/**
 * Checks whether the current request should emulate an Atomic site.
 *
 * The browser fuzz runner enables this per lane with a cookie so parallel
 * stock and Atomic-shaped lanes can share the same wp-env instance.
 *
 * @return bool Whether the shim is enabled for the current request.
 */
function gutenberg_test_atomic_site_shim_enabled() {
	return isset( $_COOKIE['gutenberg_test_atomic_site_shim'] ) && '1' === $_COOKIE['gutenberg_test_atomic_site_shim'];
}

add_filter(
	'jetpack_is_atomic_site',
	static function ( $is_atomic_site ) {
		return gutenberg_test_atomic_site_shim_enabled() ? true : $is_atomic_site;
	}
);
add_filter(
	'is_atomic_site',
	static function ( $is_atomic_site ) {
		return gutenberg_test_atomic_site_shim_enabled() ? true : $is_atomic_site;
	}
);

add_filter(
	'block_editor_settings_all',
	static function ( $settings ) {
		if ( ! gutenberg_test_atomic_site_shim_enabled() ) {
			return $settings;
		}

		$settings['wpcomAtomicSiteShim'] = array(
			'enabled'      => true,
			'platform'     => 'atomic',
			'pluginStack'  => array( 'jetpack', 'editing-toolkit', 'wpcomsh' ),
			'source'       => 'gutenberg-e2e-fuzz',
			'wpcomshStyle' => true,
		);

		return $settings;
	}
);

add_filter(
	'allowed_block_types_all',
	static function ( $allowed_block_types ) {
		if ( ! gutenberg_test_atomic_site_shim_enabled() ) {
			return $allowed_block_types;
		}

		return $allowed_block_types;
	}
);

add_action(
	'enqueue_block_editor_assets',
	static function () {
		if ( ! gutenberg_test_atomic_site_shim_enabled() ) {
			return;
		}

		wp_register_script(
			'gutenberg-test-atomic-site-shim',
			'',
			array( 'wp-blocks', 'wp-dom-ready', 'wp-hooks' ),
			false,
			true
		);

		wp_enqueue_script( 'gutenberg-test-atomic-site-shim' );
		wp_add_inline_script(
			'gutenberg-test-atomic-site-shim',
			<<<'JS'
( function ( wp ) {
	window._wpAtomicSiteShimEnabled = true;
	window.wpcom = window.wpcom || {};
	window.wpcom.atomicSiteShim = {
		enabled: true,
		platform: 'atomic',
		pluginStack: [ 'jetpack', 'editing-toolkit', 'wpcomsh' ],
	};

	if ( ! wp || ! wp.hooks ) {
		return;
	}

	wp.hooks.addFilter(
		'blocks.registerBlockType',
		'gutenberg-test/atomic-site-shim',
		function ( settings, name ) {
			if ( name !== 'core/list' ) {
				return settings;
			}

			return {
				...settings,
				attributes: {
					...( settings.attributes || {} ),
					atomicShimTrace: {
						type: 'string',
					},
				},
				supports: {
					...( settings.supports || {} ),
					anchor: true,
					className: true,
				},
			};
		}
	);

	wp.domReady( function () {
		if ( wp.blocks && wp.blocks.registerBlockVariation ) {
			wp.blocks.registerBlockVariation( 'core/list', {
				name: 'gutenberg-test-atomic-list',
				title: 'Atomic list',
				attributes: {
					className: 'is-gutenberg-test-atomic-list',
				},
				scope: [ 'inserter' ],
			} );
		}
	} );
} )( window.wp );
JS
		);
	}
);
