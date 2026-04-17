/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * "Add tab" button in the block toolbar for the tab block.
 * Inserts a new core/tab into the tab-panel. The tabs-menu items attribute
 * is kept in sync automatically via useTabMenuItemsSync.
 *
 * @param {Object} props
 * @param {string} props.tabsClientId The client ID of the parent tabs block.
 * @return {React.JSX.Element} The toolbar control element.
 */
export default function AddTabToolbarControl( { tabsClientId } ) {
	const {
		insertBlock,
		updateBlockAttributes,
		selectBlock,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch( blockEditorStore );

	const { tabPanelClientId, tabCount, tabsMenuClientId } = useSelect(
		( select ) => {
			if ( ! tabsClientId ) {
				return {
					tabPanelClientId: null,
					tabCount: 0,
					tabsMenuClientId: null,
				};
			}
			const { getBlocks } = select( blockEditorStore );
			const innerBlocks = getBlocks( tabsClientId );
			const tabPanel = innerBlocks.find(
				( block ) => block.name === 'core/tab-panel'
			);
			const tabsMenu = innerBlocks.find(
				( block ) => block.name === 'core/tabs-menu'
			);
			return {
				tabPanelClientId: tabPanel?.clientId || null,
				tabCount: tabPanel?.innerBlocks?.length || 0,
				tabsMenuClientId: tabsMenu?.clientId || null,
			};
		},
		[ tabsClientId ]
	);

	const addTab = () => {
		if ( ! tabPanelClientId ) {
			return;
		}

		const newTabBlock = createBlock( 'core/tab', {
			label: __( 'Tab' ),
		} );
		insertBlock( newTabBlock, undefined, tabPanelClientId, false );

		// Switch editor active tab to the new tab.
		const newIndex = tabCount;
		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes( tabsClientId, {
			editorActiveTabIndex: newIndex,
		} );

		// Select the tabs-menu block so focus stays in the menu area.
		if ( tabsMenuClientId ) {
			selectBlock( tabsMenuClientId );
		}
	};

	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<ToolbarButton
					className="components-toolbar__control"
					onClick={ addTab }
					text={ __( 'Add tab' ) }
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}
