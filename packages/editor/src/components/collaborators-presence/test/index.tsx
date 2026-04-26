/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { CollaboratorsPresence } from '../index';

let mockActiveCollaborators: Array< Record< string, unknown > > = [];

jest.mock( '@wordpress/core-data', () => ( {
	privateApis: {},
} ) );

jest.mock( '../../../lock-unlock', () => ( {
	unlock: jest.fn( () => ( {
		useActiveCollaborators: () => mockActiveCollaborators,
	} ) ),
} ) );

jest.mock( '../../collaborators-overlay', () => ( {
	CollaboratorsOverlay: () => null,
} ) );

function makeCollaborator( overrides: Record< string, unknown > = {} ) {
	return {
		clientId: 1,
		isConnected: true,
		isMe: false,
		collaboratorInfo: {
			id: 100,
			name: 'Remote Collaborator',
			slug: 'remote-collaborator',
			avatar_urls: {},
			browserType: 'Chrome',
			enteredAt: 1704067200000,
		},
		...overrides,
	};
}

class TestErrorBoundary extends Component<
	{ children: React.ReactNode },
	{ hasError: boolean }
> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if ( this.state.hasError ) {
			return <div>Test error boundary fallback</div>;
		}

		return this.props.children;
	}
}

describe( 'CollaboratorsPresence awareness crash repro', () => {
	let consoleError: jest.SpyInstance;

	beforeEach( () => {
		mockActiveCollaborators = [];
		consoleError = jest
			.spyOn( console, 'error' )
			.mockImplementation( () => {} );
	} );

	afterEach( () => {
		consoleError.mockRestore();
	} );

	it( 'repro: malformed remote awareness trips the editor error boundary', () => {
		mockActiveCollaborators = [
			makeCollaborator( {
				clientId: 1,
				isMe: true,
				collaboratorInfo: {
					id: 1,
					name: 'Current User',
					slug: 'current-user',
					avatar_urls: {},
					browserType: 'Chrome',
					enteredAt: 1704067200000,
				},
			} ),
			{
				clientId: 2,
				isConnected: true,
				isMe: false,
				unexpected: 'missing collaboratorInfo',
			},
		];

		render(
			<TestErrorBoundary>
				<CollaboratorsPresence postId={ 1 } postType="post" />
			</TestErrorBoundary>
		);

		expect(
			screen.getByText( 'Test error boundary fallback' )
		).toBeInTheDocument();
	} );
} );
