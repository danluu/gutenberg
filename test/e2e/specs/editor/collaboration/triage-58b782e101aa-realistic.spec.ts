/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

async function getPersistedContent(
	requestUtils: {
		rest: < T >( options: {
			method?: string;
			path: string;
		} ) => Promise< T >;
	},
	postId: number
): Promise< string > {
	const post = await requestUtils.rest< {
		content: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }?context=edit`,
	} );

	return typeof post.content === 'string'
		? post.content
		: post.content.raw ?? post.content.rendered ?? '';
}

async function waitForSessionReady(
	page: import( '@playwright/test' ).Page,
	secondPage: import( '@playwright/test' ).Page,
	collaborationUtils: {
		waitForConvergence: ( options?: {
			timeout?: number;
			includeCrdtDocument?: boolean;
		} ) => Promise< {
			blocks: Array< unknown >;
			crdtDocument?: string | null;
		}>;
	}
) {
	await expect(
		page.getByRole( 'button', { name: /Collaborators list, 2 online/ } )
	).toBeVisible( { timeout: 20000 } );
	await expect(
		secondPage.getByRole( 'button', {
			name: /Collaborators list, 2 online/,
		} )
	).toBeVisible( { timeout: 20000 } );
	return collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

test.describe( 'Collaboration - triage 58b782e101aa', () => {
	test( 'does not resurrect a newer paragraph after restoring an older revision and reloading', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 120_000 );

		const oldMarker = 'rtc-triage-58b782e101aa-old';
		const newMarker = 'rtc-triage-58b782e101aa-new';

		const post = await requestUtils.createPost( {
			title: 'RTC triage 58b782e101aa',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await waitForSessionReady( page, collaborationUtils.page2, collaborationUtils );

		await editor.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();
		await page.keyboard.type( oldMarker );
		await editor.saveDraft();

		await editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( newMarker );
		await editor.saveDraft();

		await expect
			.poll( () => getPersistedContent( requestUtils, post.id ), {
				timeout: 20000,
			} )
			.toContain( newMarker );

		await editor.openDocumentSettingsSidebar();
		const settingsSidebar = page.getByRole( 'region', {
			name: 'Editor settings',
		} );
		await settingsSidebar.getByRole( 'tab', { name: 'Post' } ).click();
		await settingsSidebar
			.locator( '.editor-private-post-last-revision__button' )
			.click();

		const restoreButton = page.getByRole( 'button', { name: 'Restore' } );
		await expect( restoreButton ).toBeVisible();

		const slider = page.getByRole( 'slider', { name: 'Revision' } );
		await slider.focus();
		await page.keyboard.press( 'ArrowLeft' );

		await expect( editor.canvas.getByText( oldMarker ) ).toBeVisible();
		await expect( editor.canvas.getByText( newMarker ) ).toBeHidden();

		await restoreButton.click();
		await expect(
			page
				.getByRole( 'button', { name: 'Dismiss this notice' } )
				.filter( { hasText: 'Restored to revision' } )
		).toBeVisible();

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );

		const reloadedState = await waitForSessionReady(
			page,
			collaborationUtils.page2,
			collaborationUtils
		);
		const reloadedBlocks = JSON.stringify( reloadedState.blocks );
		const persistedContent = await getPersistedContent( requestUtils, post.id );

		expect( persistedContent ).toContain( oldMarker );
		expect( persistedContent ).not.toContain( newMarker );
		expect( reloadedBlocks ).toContain( oldMarker );
		expect( reloadedBlocks ).not.toContain( newMarker );
	} );
} );
