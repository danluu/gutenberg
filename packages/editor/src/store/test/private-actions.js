/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import { restoreRevision } from '../private-actions';

describe( 'Private post actions', () => {
	describe( 'restoreRevision()', () => {
		let originalCollaborationEnabled;

		beforeEach( () => {
			originalCollaborationEnabled = window._wpCollaborationEnabled;
			window._wpCollaborationEnabled = true;
		} );

		afterEach( () => {
			window._wpCollaborationEnabled = originalCollaborationEnabled;
		} );

		it( 'clears persisted CRDT document meta before saving the restored revision', async () => {
			const revision = {
				id: 123,
				date: '2026-05-17T07:00:00',
				content: {
					raw: '<!-- wp:paragraph --><p>Older</p><!-- /wp:paragraph -->',
				},
				title: { raw: 'Older title' },
				excerpt: { raw: 'Older excerpt' },
				meta: {
					existing: 'meta',
				},
			};
			const dispatch = {
				editPost: jest.fn(),
				savePost: jest.fn(),
				setCurrentRevisionId: jest.fn(),
			};
			const select = {
				getCurrentPostId: jest.fn( () => 44 ),
				getCurrentPostType: jest.fn( () => 'post' ),
			};
			const coreSelectors = {
				getEntityConfig: jest.fn( () => ( { revisionKey: 'id' } ) ),
			};
			const coreResolvers = {
				getRevision: jest.fn().mockResolvedValue( revision ),
			};
			const noticeActions = {
				createSuccessNotice: jest.fn(),
			};
			const registry = {
				dispatch: jest.fn( ( store ) =>
					store === noticesStore ? noticeActions : {}
				),
				resolveSelect: jest.fn( ( store ) =>
					store === coreStore ? coreResolvers : {}
				),
				select: jest.fn( ( store ) =>
					store === coreStore ? coreSelectors : {}
				),
			};

			await restoreRevision( revision.id )( {
				dispatch,
				registry,
				select,
			} );

			expect( dispatch.editPost ).toHaveBeenCalledWith( {
				blocks: undefined,
				content: revision.content.raw,
				excerpt: revision.excerpt.raw,
				meta: {
					existing: 'meta',
					_crdt_document: '',
				},
				title: revision.title.raw,
			} );
			expect( dispatch.setCurrentRevisionId ).toHaveBeenCalledWith(
				null
			);
			expect( dispatch.savePost ).toHaveBeenCalled();
		} );
	} );
} );
