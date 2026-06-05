/**
 * Internal dependencies
 */
import { hasRenderableCollaboratorInfo } from '../utils';

describe( 'hasRenderableCollaboratorInfo', () => {
	const validCollaborator = {
		clientId: 2,
		isConnected: true,
		isMe: false,
		collaboratorInfo: {
			avatar_urls: {
				24: 'https://example.com/avatar-24.jpg',
				48: 'https://example.com/avatar-48.jpg',
			},
			browserType: 'Chrome',
			enteredAt: 1704067200000,
			id: 100,
			name: 'Alice',
			slug: 'alice',
		},
	};

	it( 'accepts collaborator state with renderable collaborator info', () => {
		expect( hasRenderableCollaboratorInfo( validCollaborator ) ).toBe(
			true
		);
	} );

	it( 'rejects missing collaborator info', () => {
		expect(
			hasRenderableCollaboratorInfo( {
				clientId: 2,
				isConnected: true,
				isMe: false,
			} )
		).toBe( false );
	} );

	it( 'rejects non-string avatar URLs', () => {
		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				collaboratorInfo: {
					...validCollaborator.collaboratorInfo,
					avatar_urls: { 24: null },
				},
			} )
		).toBe( false );
	} );

	it( 'rejects malformed enhanced state fields', () => {
		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				clientId: Number.NaN,
			} )
		).toBe( false );

		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				isConnected: 'true',
			} )
		).toBe( false );

		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				isMe: null,
			} )
		).toBe( false );
	} );

	it( 'rejects malformed collaborator info numbers', () => {
		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				collaboratorInfo: {
					...validCollaborator.collaboratorInfo,
					id: 100.5,
				},
			} )
		).toBe( false );

		expect(
			hasRenderableCollaboratorInfo( {
				...validCollaborator,
				collaboratorInfo: {
					...validCollaborator.collaboratorInfo,
					enteredAt: Number.POSITIVE_INFINITY,
				},
			} )
		).toBe( false );
	} );
} );
