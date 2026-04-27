/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

test.describe( 'Collaboration update size limits', () => {
	test( 'rejects a pasted paragraph that fits the client raw limit but exceeds the server base64 limit', async ( {
		collaborationUtils,
		context,
		editor,
		page,
		requestUtils,
	} ) => {
		test.slow();

		await context.grantPermissions( [
			'clipboard-read',
			'clipboard-write',
		] );

		const post = await requestUtils.createPost( {
			title: 'RTC base64 update limit repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		const { page: page2 } = await collaborationUtils.joinUser(
			post.id,
			SECOND_USER
		);
		await collaborationUtils.waitForMutualDiscovery();

		const rejectedSyncRequests: number[] = [];
		const trackRejectedSyncRequest = ( response: {
			status: () => number;
			url: () => string;
		} ) => {
			if (
				response.url().includes( 'wp-sync' ) &&
				response.status() >= 400
			) {
				rejectedSyncRequests.push( response.status() );
			}
		};
		page.on( 'response', trackRejectedSyncRequest );
		page2.on( 'response', trackRejectedSyncRequest );

		await editor.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();

		// This size is below the polling manager's raw Uint8Array limit
		// (1 MiB) but above the server's effective raw limit once base64
		// expansion is included.
		const largeContent = 'x'.repeat( 789000 );
		await page.evaluate(
			( text: string ) => window.navigator.clipboard.writeText( text ),
			largeContent
		);

		const pasteModifier =
			process.platform === 'darwin' ? 'Meta' : 'Control';
		await page.keyboard.press( `${ pasteModifier }+v` );

		await expect
			.poll( () => rejectedSyncRequests, { timeout: 45000 } )
			.toContain( 400 );

		await page.goto( 'about:blank' );
		await page2.goto( 'about:blank' );
	} );
} );
