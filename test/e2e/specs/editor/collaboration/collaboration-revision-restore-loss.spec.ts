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

test.describe( 'Collaboration - revision restore loss', () => {
	test( 'does not resurrect content from a newer revision after an older revision is restored', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 90_000 );

		const oldMarker = 'rtc-old-revision-marker';
		const newMarker = 'rtc-new-revision-marker';
		const postRestoreMarker = 'rtc-post-restore-collaborator-edit';

		const post = await requestUtils.createPost( {
			title: 'RTC revision restore loss repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery();
		const { editor2, page2 } = collaborationUtils;

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
			.poll( () => editor2.getBlocks(), { timeout: 20_000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: oldMarker },
				},
				{
					name: 'core/paragraph',
					attributes: { content: newMarker },
				},
			] );

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

		await expect
			.poll( () => editor.getBlocks(), { timeout: 20_000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: oldMarker },
				},
			] );

		await expect
			.poll( () => editor2.getBlocks(), { timeout: 20_000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: oldMarker },
				},
			] );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( postRestoreMarker );
		await editor2.saveDraft();

		await expect
			.poll( () => getPersistedContent( requestUtils, post.id ), {
				timeout: 20_000,
			} )
			.toContain( postRestoreMarker );

		const persistedContent = await getPersistedContent(
			requestUtils,
			post.id
		);
		expect( persistedContent ).toContain( oldMarker );
		expect( persistedContent ).not.toContain( newMarker );
	} );
} );
