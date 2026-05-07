/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

async function getEditedTitle( page: Page ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' )
	);
}

test.describe( 'Collaboration - title reload divergence', () => {
	test( 'keeps an unsaved synced title when a collaborator reloads', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const post = await requestUtils.createPost( {
			title: 'RTC title reload initial',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial paragraph.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openCollaborativeSession( post.id );
		const { editor2, page2 } = collaborationUtils;

		const expectedTitle = 'RTC title reload updated by user A';
		const bodyMarker = 'collaborator body edit before reload';

		const titleBox = editor.canvas.getByRole( 'textbox', {
			name: 'Add title',
		} );
		await titleBox.click();
		await page.keyboard.press( `${ MODIFIER_KEY }+A` );
		await page.keyboard.type( expectedTitle );

		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( expectedTitle );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( bodyMarker );

		await expect( editor.canvas.getByText( bodyMarker ) ).toBeVisible( {
			timeout: 20_000,
		} );
		await expect( editor2.canvas.getByText( bodyMarker ) ).toBeVisible( {
			timeout: 20_000,
		} );
		await Promise.all(
			collaborationUtils.allPages.map( ( collaborationPage ) =>
				collaborationUtils.waitForSyncCycle( collaborationPage, 2, {
					timeout: 20_000,
				} )
			)
		);

		await page2.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page2, {
			timeout: 30_000,
		} );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 30_000 } );
		await Promise.all(
			collaborationUtils.allPages.map( ( collaborationPage ) =>
				collaborationUtils.waitForSyncCycle( collaborationPage, 2, {
					timeout: 30_000,
				} )
			)
		);

		await expect
			.poll( () => getEditedTitle( page ), { timeout: 20_000 } )
			.toBe( expectedTitle );
		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( expectedTitle );
		await expect( editor2.canvas.getByText( bodyMarker ) ).toBeVisible();
	} );
} );
