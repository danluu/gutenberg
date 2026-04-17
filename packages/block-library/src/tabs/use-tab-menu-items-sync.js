/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';

/**
 * Keep the tabs-menu block's `tabs` attribute in sync with the tab blocks.
 *
 * Whenever the list of core/tab blocks changes (add, remove, reorder, or
 * label edit), this hook updates the `tabs` attribute on the core/tabs-menu
 * block so that save.js can render the correct buttons.
 *
 * @param {Object}      props
 * @param {Array}       props.tabs             Raw core/tab block objects.
 * @param {string|null} props.tabsMenuClientId Client ID of the core/tabs-menu block.
 */
export default function useTabMenuItemsSync( { tabs, tabsMenuClientId } ) {
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch( blockEditorStore );

	const prevTabsRef = useRef( null );

	useEffect( () => {
		if ( ! tabsMenuClientId ) {
			return;
		}

		const newTabs = tabs.map( ( tab ) => ( {
			label: tab.attributes.label || '',
		} ) );

		// Only update if tabs actually changed to avoid unnecessary re-renders.
		const serialized = JSON.stringify( newTabs );
		if ( serialized === prevTabsRef.current ) {
			return;
		}
		prevTabsRef.current = serialized;

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes( tabsMenuClientId, { tabs: newTabs } );
	}, [
		tabs,
		tabsMenuClientId,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	] );
}
