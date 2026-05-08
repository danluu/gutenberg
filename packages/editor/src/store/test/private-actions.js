/**
 * WordPress dependencies
 */
import { parse } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import { restoreRevision } from '../private-actions';

describe( 'Post private actions', () => {
	describe( 'restoreRevision()', () => {
		it( 'applies parsed revision blocks and saves as an authoritative revision restore', async () => {
			const revisionContent =
				'<!-- wp:paragraph -->\n<p>old revision</p>\n<!-- /wp:paragraph -->';
			const revision = {
				id: 10,
				date: '2026-05-07T00:00:00',
				content: { raw: revisionContent },
				title: { raw: 'Old title' },
				excerpt: { raw: 'Old excerpt' },
				meta: { footnotes: '' },
			};
			const createSuccessNotice = jest.fn();
			const getRevision = jest.fn().mockResolvedValue( revision );
			const dispatch = {
				editPost: jest.fn(),
				savePost: jest.fn(),
				setCurrentRevisionId: jest.fn(),
			};
			const select = {
				getCurrentPostId: jest.fn( () => 44 ),
				getCurrentPostType: jest.fn( () => 'post' ),
			};
			const registry = {
				select: jest.fn( ( store ) => {
					if ( store === coreStore ) {
						return {
							getEntityConfig: jest.fn( () => ( {
								revisionKey: 'id',
							} ) ),
						};
					}
					return {};
				} ),
				resolveSelect: jest.fn( ( store ) => {
					if ( store === coreStore ) {
						return { getRevision };
					}
					return {};
				} ),
				dispatch: jest.fn( ( store ) => {
					if ( store === noticesStore ) {
						return { createSuccessNotice };
					}
					return {};
				} ),
			};

			await restoreRevision( 10 )( { select, dispatch, registry } );

			expect( getRevision ).toHaveBeenCalledWith(
				'postType',
				'post',
				44,
				10,
				expect.objectContaining( { context: 'edit' } )
			);
			expect( dispatch.editPost ).toHaveBeenCalledWith( {
				blocks: parse( revisionContent ),
				content: revisionContent,
				excerpt: 'Old excerpt',
				meta: { footnotes: '' },
				title: 'Old title',
			} );
			expect( dispatch.setCurrentRevisionId ).toHaveBeenCalledWith( null );
			expect( dispatch.savePost ).toHaveBeenCalledWith( {
				__unstableIsRevisionRestore: true,
			} );
			expect( createSuccessNotice ).toHaveBeenCalled();
		} );
	} );
} );
