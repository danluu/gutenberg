/**
 * External dependencies
 */
import { paramCase as kebabCase } from 'change-case';

/**
 * Internal dependencies
 */
import type { RequestUtils } from './index';

const PLUGIN_STATUS_UPDATE_RETRIES = 3;
const PLUGIN_STATUS_UPDATE_RETRY_DELAY_MS = 250;

function isJsonParseError( error: unknown ) {
	return (
		error instanceof SyntaxError &&
		/JSON|Unexpected end of input/i.test( error.message )
	);
}

async function waitForRetryDelay() {
	await new Promise( ( resolve ) =>
		setTimeout( resolve, PLUGIN_STATUS_UPDATE_RETRY_DELAY_MS )
	);
}

/**
 * Fetch the plugins from API and cache them in memory,
 * since they are unlikely to change during testing.
 *
 * @param this
 * @param forceRefetch Force refetch the installed plugins to update the cache.
 */
async function getPluginsMap( this: RequestUtils, forceRefetch = false ) {
	if ( ! forceRefetch && this.pluginsMap ) {
		return this.pluginsMap;
	}

	const plugins = await this.rest( {
		path: '/wp/v2/plugins',
	} );
	this.pluginsMap = {};
	for ( const plugin of plugins ) {
		// Ideally, we should be using sanitize_title() in PHP rather than kebabCase(),
		// but we don't have the exact port of it in JS.
		// This is a good approximation though.
		const slug = kebabCase( plugin.name.toLowerCase() );
		this.pluginsMap[ slug ] = plugin.plugin;
	}
	return this.pluginsMap;
}

/**
 * Finds a plugin in the plugin map.
 *
 * Attempts to provide a helpful error message if not found.
 *
 * @param slug       Plugin slug.
 * @param pluginsMap Plugins map.
 */
function getPluginFromMap(
	slug: string,
	pluginsMap: Record< string, string >
) {
	const plugin = pluginsMap[ slug ];

	if ( ! plugin ) {
		for ( const key of Object.keys( pluginsMap ) ) {
			if (
				key.toLowerCase().replace( /-/g, '' ) ===
				slug.toLowerCase().replace( /-/g, '' )
			) {
				throw new Error(
					`The plugin "${ slug }" isn't installed. Did you perhaps mean "${ key }"?`
				);
			}
		}

		throw new Error( `The plugin "${ slug }" isn't installed` );
	}

	return plugin;
}

async function updatePluginStatus(
	this: RequestUtils,
	plugin: string,
	status: 'active' | 'inactive'
) {
	for (
		let attempt = 1;
		attempt <= PLUGIN_STATUS_UPDATE_RETRIES;
		attempt++
	) {
		try {
			await this.rest( {
				method: 'PUT',
				path: `/wp/v2/plugins/${ plugin }`,
				data: { status },
			} );
			return;
		} catch ( error ) {
			if (
				attempt === PLUGIN_STATUS_UPDATE_RETRIES ||
				! isJsonParseError( error )
			) {
				throw error;
			}

			await waitForRetryDelay();
		}
	}
}

/**
 * Activates an installed plugin.
 *
 * @param this RequestUtils.
 * @param slug Plugin slug.
 */
async function activatePlugin( this: RequestUtils, slug: string ) {
	const pluginsMap = await this.getPluginsMap();
	const plugin = getPluginFromMap( slug, pluginsMap );

	await updatePluginStatus.call( this, plugin, 'active' );
}

/**
 * Deactivates an active plugin.
 *
 * @param this RequestUtils.
 * @param slug Plugin slug.
 */
async function deactivatePlugin( this: RequestUtils, slug: string ) {
	const pluginsMap = await this.getPluginsMap();
	const plugin = getPluginFromMap( slug, pluginsMap );

	await updatePluginStatus.call( this, plugin, 'inactive' );
}

export { getPluginsMap, activatePlugin, deactivatePlugin };
