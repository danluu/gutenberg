/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useBlockEditingMode } from '@wordpress/block-editor';
import { getBlockBindingsSource } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { withPatternOverrideControls } from '../pattern-overrides';

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
	useBlockEditingMode: jest.fn( () => 'default' ),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockBindingsSource: jest.fn( () => null ),
} ) );

jest.mock( '@wordpress/data/src/components/use-select', () => jest.fn() );

jest.mock( '@wordpress/hooks', () => ( {
	addFilter: jest.fn(),
	applyFilters: jest.fn( ( hookName, value ) => value ),
} ) );

jest.mock( '@wordpress/patterns', () => ( {
	privateApis: {},
} ) );

jest.mock( '../../lock-unlock', () => ( {
	unlock: jest.fn( () => ( {
		PatternOverridesControls: () => <div>Pattern override controls</div>,
		ResetOverridesControl: () => <div>Reset override control</div>,
		PATTERN_TYPES: {
			user: 'wp_block',
		},
		PATTERN_SYNC_TYPES: {
			unsynced: 'unsynced',
		},
	} ) ),
} ) );

jest.mock( '../../store', () => ( {
	store: 'core/editor',
} ) );

const BlockEdit = ( props ) => <div>Block edit: { props.name }</div>;
const WrappedBlockEdit = withPatternOverrideControls( BlockEdit );

function setupUseSelectMock( {
	supportedAttributes = {},
	currentPostType = 'wp_block',
	syncStatus = undefined,
} = {} ) {
	useSelect.mockImplementation( ( mapSelect ) => {
		return mapSelect( ( store ) => {
			if ( store === 'core/block-editor' ) {
				return {
					getSettings: () => ( {
						__experimentalBlockBindingsSupportedAttributes:
							supportedAttributes,
					} ),
				};
			}

			return {
				getCurrentPostType: () => currentPostType,
				getEditedPostAttribute: ( attribute ) => {
					if ( attribute === 'meta' ) {
						return {
							wp_pattern_sync_status: syncStatus,
						};
					}
					if ( attribute === 'wp_pattern_sync_status' ) {
						return syncStatus;
					}
					return undefined;
				},
			};
		} );
	} );
}

describe( 'withPatternOverrideControls', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		getBlockBindingsSource.mockReturnValue( null );
		useBlockEditingMode.mockReturnValue( 'default' );
	} );

	it( 'does not subscribe to block-editor settings for unselected blocks', () => {
		useSelect.mockImplementation( () => {
			throw new Error( 'Unselected blocks should not call useSelect.' );
		} );

		render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected={ false }
				attributes={ {} }
			/>
		);

		expect(
			screen.getByText( 'Block edit: core/paragraph' )
		).toBeVisible();
		expect( useSelect ).not.toHaveBeenCalled();
	} );

	it( 'does not mount store-backed controls for selected unsupported blocks', () => {
		setupUseSelectMock();

		render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {} }
			/>
		);

		expect(
			screen.getByText( 'Block edit: core/paragraph' )
		).toBeVisible();
		expect( useSelect ).toHaveBeenCalledTimes( 1 );
		expect( useBlockEditingMode ).not.toHaveBeenCalled();
	} );

	it( 'mounts controls for selected supported blocks', () => {
		setupUseSelectMock( {
			supportedAttributes: {
				'core/paragraph': {
					content: true,
				},
			},
		} );
		getBlockBindingsSource.mockReturnValue( {} );

		render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {} }
			/>
		);

		expect(
			screen.getByText( 'Block edit: core/paragraph' )
		).toBeVisible();
		expect( screen.getByText( 'Pattern override controls' ) ).toBeVisible();
		expect( useSelect ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'reads current support settings when a block becomes selected', () => {
		setupUseSelectMock( {
			supportedAttributes: {
				'core/paragraph': {
					content: true,
				},
			},
		} );
		getBlockBindingsSource.mockReturnValue( {} );

		const { rerender } = render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected={ false }
				attributes={ {} }
			/>
		);

		expect( useSelect ).not.toHaveBeenCalled();

		rerender(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {} }
			/>
		);

		expect( screen.getByText( 'Pattern override controls' ) ).toBeVisible();
		expect( useSelect ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'updates support while selected', () => {
		const supportedAttributes = {};
		setupUseSelectMock( { supportedAttributes } );
		getBlockBindingsSource.mockReturnValue( {} );

		const { rerender } = render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {} }
			/>
		);

		expect(
			screen.queryByText( 'Pattern override controls' )
		).not.toBeInTheDocument();

		supportedAttributes[ 'core/paragraph' ] = {
			content: true,
		};
		rerender(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {} }
			/>
		);

		expect( screen.getByText( 'Pattern override controls' ) ).toBeVisible();
	} );

	it( 'keeps the unsynced reset control behind the selected supported path', () => {
		setupUseSelectMock( {
			supportedAttributes: {
				'core/paragraph': {
					content: true,
				},
			},
			syncStatus: 'unsynced',
		} );
		getBlockBindingsSource.mockReturnValue( {} );

		render(
			<WrappedBlockEdit
				name="core/paragraph"
				isSelected
				attributes={ {
					metadata: {
						name: 'pattern paragraph',
						bindings: {
							content: {
								source: 'core/pattern-overrides',
							},
						},
					},
				} }
			/>
		);

		expect( screen.getByText( 'Reset override control' ) ).toBeVisible();
		expect(
			screen.queryByText( 'Pattern override controls' )
		).not.toBeInTheDocument();
	} );
} );
