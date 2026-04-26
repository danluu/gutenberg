/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

test.describe( 'Collaboration - Awareness exception repro', () => {
	test( 'one collaborator can crash another editor with malformed awareness', async ( {
		collaborationUtils,
		requestUtils,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Awareness Exception Repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		await collaborationUtils.page2.evaluate( async ( postId ) => {
			await ( window as any ).wp.apiFetch( {
				path: '/wp-sync/v1/updates',
				method: 'POST',
				data: {
					rooms: [
						{
							after: 0,
							awareness: {
								unexpected: 'missing collaboratorInfo',
							},
							client_id: 987654321,
							room: `postType/post:${ postId }`,
							updates: [],
						},
					],
				},
			} );
		}, post.id );

		await expect(
			page.getByText( 'The editor has encountered an unexpected error.' )
		).toBeVisible( { timeout: 15000 } );
	} );
} );
