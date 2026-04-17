/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * "Remove Tab" button in the block toolbar for the tab block.
 * Removes the currently active core/tab. The tabs-menu items attribute
 * is kept in sync automatically via useTabMenuItemsSync.
 *
 * @param {Object} props
 * @param {string} props.tabsClientId The client ID of the parent tabs block.
 * @return {React.JSX.Element} The toolbar control element.
 */
export default function RemoveTabToolbarControl( { tabsClientId } ) {
	const {
		removeBlock,
		updateBlockAttributes,
		selectBlock,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch( blockEditorStore );

	const {
		activeTabClientId,
		tabCount,
		editorActiveTabIndex,
		tabsMenuClientId,
	} = useSelect(
		( select ) => {
			if ( ! tabsClientId ) {
				return {
					activeTabClientId: null,
					tabCount: 0,
					editorActiveTabIndex: 0,
					tabsMenuClientId: null,
				};
			}
			const { getBlocks, getBlockAttributes } =
				select( blockEditorStore );
			const tabsAttributes = getBlockAttributes( tabsClientId );
			const activeIndex =
				tabsAttributes?.editorActiveTabIndex ??
				tabsAttributes?.activeTabIndex ??
				0;
			const innerBlocks = getBlocks( tabsClientId );
			const tabPanel = innerBlocks.find(
				( block ) => block.name === 'core/tab-panel'
			);
			const tabsMenu = innerBlocks.find(
				( block ) => block.name === 'core/tabs-menu'
			);
			const tabs = tabPanel?.innerBlocks || [];
			const activeTab = tabs[ activeIndex ];
			return {
				activeTabClientId: activeTab?.clientId || null,
				tabCount: tabs.length,
				editorActiveTabIndex: activeIndex,
				tabsMenuClientId: tabsMenu?.clientId || null,
			};
		},
		[ tabsClientId ]
	);

	const removeTab = () => {
		if ( ! activeTabClientId || tabCount <= 1 ) {
			return;
		}

		// Calculate new active index after removal.
		const newActiveIndex =
			editorActiveTabIndex >= tabCount - 1
				? tabCount - 2
				: editorActiveTabIndex;

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes( tabsClientId, {
			editorActiveTabIndex: newActiveIndex,
		} );

		// Remove the tab content block.
		removeBlock( activeTabClientId, false );

		// Select the tabs-menu so focus moves to the new active tab button.
		if ( tabsMenuClientId ) {
			selectBlock( tabsMenuClientId );
		}
	};

	const isDisabled = tabCount <= 1 || ! activeTabClientId;

	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<ToolbarButton
					className="components-toolbar__control"
					onClick={ removeTab }
					text={ __( 'Remove tab' ) }
					disabled={ isDisabled }
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}
