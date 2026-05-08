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

async function saveDraftAndWaitForContent(
	page: import( '@playwright/test' ).Page,
	requestUtils: {
		rest: < T >( options: {
			method?: string;
			path: string;
		} ) => Promise< T >;
	},
	postId: number,
	expectedContent: string
) {
	const saveButton = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled();
	await saveButton.click( { force: true } );

	await expect
		.poll( () => getPersistedContent( requestUtils, postId ), {
			timeout: 20000,
		} )
		.toContain( expectedContent );
}

test.describe( 'Collaboration - triage c05661de30a8', () => {
	test( 'does not resurrect newer body content after restoring an older revision and reloading', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 120_000 );

		const oldMarker = 'rtc-triage-c05661de30a8-old';
		const newMarker = 'rtc-triage-c05661de30a8-new';

		const post = await requestUtils.createPost( {
			title: 'RTC triage c05661de30a8',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );

		await editor.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();
		await page.keyboard.type( oldMarker );
		await expect
			.poll( async () => JSON.stringify( await editor.getBlocks() ) )
			.toContain( oldMarker );
		await saveDraftAndWaitForContent(
			page,
			requestUtils,
			post.id,
			oldMarker
		);

		await editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( newMarker );
		await expect
			.poll( async () => JSON.stringify( await editor.getBlocks() ) )
			.toContain( newMarker );
		await saveDraftAndWaitForContent(
			page,
			requestUtils,
			post.id,
			newMarker
		);

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

		const minRevision = Number(
			( await slider.getAttribute( 'aria-valuemin' ) ) ??
				( await slider.getAttribute( 'min' ) ) ??
				1
		);
		const maxRevision = Number(
			( await slider.getAttribute( 'aria-valuemax' ) ) ??
				( await slider.getAttribute( 'max' ) ) ??
				1
		);
		await page.keyboard.press( 'Home' );
		await page.waitForTimeout( 250 );

		let foundOldRevision = false;
		for (
			let revisionIndex = minRevision;
			revisionIndex <= maxRevision;
			revisionIndex++
		) {
			const showsOld = await editor.canvas
				.getByText( oldMarker )
				.isVisible()
				.catch( () => false );
			const showsNew = await editor.canvas
				.getByText( newMarker )
				.isVisible()
				.catch( () => false );

			if ( showsOld && ! showsNew ) {
				foundOldRevision = true;
				break;
			}

			if ( revisionIndex < maxRevision ) {
				await page.keyboard.press( 'ArrowRight' );
				await page.waitForTimeout( 250 );
			}
		}

		expect( foundOldRevision ).toBe( true );

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
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );

		const reloadedBlocks = JSON.stringify( await editor.getBlocks() );
		const persistedContent = await getPersistedContent(
			requestUtils,
			post.id
		);

		expect( persistedContent ).toContain( oldMarker );
		expect( persistedContent ).not.toContain( newMarker );
		expect( reloadedBlocks ).toContain( oldMarker );
		expect( reloadedBlocks ).not.toContain( newMarker );
	} );
} );
