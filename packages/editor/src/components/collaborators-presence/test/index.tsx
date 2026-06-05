/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * Internal dependencies
 */
import { CollaboratorsPresence } from '..';

let mockActiveCollaborators: unknown[] = [];

jest.mock( '@wordpress/components', () => {
	const { forwardRef } = require( '@wordpress/element' );

	return {
		Button: forwardRef(
			(
				{
					children,
					isPressed,
					__next40pxDefaultSize,
					...props
				}: {
					children: React.ReactNode;
					isPressed?: boolean;
					__next40pxDefaultSize?: boolean;
				},
				ref: React.Ref< HTMLButtonElement >
			) => (
				<button
					type="button"
					ref={ ref }
					aria-pressed={ isPressed }
					{ ...props }
				>
					{ children }
				</button>
			)
		),
	};
} );

jest.mock( '@wordpress/core-data', () => ( {
	privateApis: {},
} ) );

jest.mock( '../../../lock-unlock', () => ( {
	unlock: jest.fn( () => ( {
		useActiveCollaborators: jest.fn( () => mockActiveCollaborators ),
	} ) ),
} ) );

jest.mock( '../avatar', () => ( {
	__esModule: true,
	default: ( { name }: { name?: string } ) => (
		<span role="img" aria-label={ name } />
	),
} ) );

jest.mock( '../avatar-group', () => ( {
	__esModule: true,
	default: ( { children }: { children: React.ReactNode } ) => (
		<div>{ children }</div>
	),
} ) );

jest.mock( '../list', () => ( {
	CollaboratorsList: () => null,
} ) );

jest.mock( '../../collaborators-overlay', () => ( {
	CollaboratorsOverlay: () => null,
} ) );

function makeCollaborator( overrides: Record< string, unknown > = {} ) {
	return {
		clientId: 2,
		isConnected: true,
		isMe: false,
		collaboratorInfo: {
			id: 200,
			name: 'Bob',
			slug: 'bob',
			avatar_urls: {
				24: 'https://example.com/bob-24.jpg',
				48: 'https://example.com/bob-48.jpg',
			},
			browserType: 'Chrome',
			enteredAt: 1704067200000,
		},
		...overrides,
	};
}

describe( 'CollaboratorsPresence', () => {
	beforeEach( () => {
		mockActiveCollaborators = [];
	} );

	it( 'filters malformed active collaborator state before rendering avatars', () => {
		mockActiveCollaborators = [
			makeCollaborator( {
				clientId: 1,
				isMe: true,
				collaboratorInfo: {
					id: 100,
					name: 'Me',
					slug: 'me',
					avatar_urls: {},
					browserType: 'Safari',
					enteredAt: 1704067100000,
				},
			} ),
			{
				clientId: 3,
				isConnected: true,
				isMe: false,
			},
			makeCollaborator(),
			makeCollaborator( {
				clientId: Number.NaN,
				collaboratorInfo: {
					id: 300,
					name: 'Charlie',
					slug: 'charlie',
					avatar_urls: {},
					browserType: 'Firefox',
					enteredAt: 1704067300000,
				},
			} ),
		];

		expect( () =>
			render( <CollaboratorsPresence postId={ 123 } postType="post" /> )
		).not.toThrow();

		expect(
			screen.getByRole( 'button', {
				name: 'Collaborators list, 2 online',
			} )
		).toBeInTheDocument();
		expect( screen.getByRole( 'img', { name: 'Me' } ) ).toBeInTheDocument();
		expect(
			screen.getByRole( 'img', { name: 'Bob' } )
		).toBeInTheDocument();
		expect(
			screen.queryByRole( 'img', { name: 'Charlie' } )
		).not.toBeInTheDocument();
	} );
} );
