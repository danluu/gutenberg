/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

test.describe( 'Collaboration - Awareness exception repro', () => {
	test( 'malformed awareness from one collaborator does not crash another editor', async ( {
		collaborationUtils,
		requestUtils,
		page,
	} ) => {
		const pageErrors: string[] = [];
		page.on( 'pageerror', ( error ) => {
			pageErrors.push( error.message );
		} );

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

		// Give the victim editor enough time to receive the next awareness poll.
		await collaborationUtils.waitForSyncCycle( page, 2, {
			timeout: 15000,
		} );

		expect(
			pageErrors.some( ( message ) =>
				message.includes(
					"Cannot read properties of undefined (reading 'avatar_urls')"
				)
			)
		).toBe( false );
		await expect(
			page.getByText( 'The editor has encountered an unexpected error.' )
		).toBeHidden();
	} );
} );
