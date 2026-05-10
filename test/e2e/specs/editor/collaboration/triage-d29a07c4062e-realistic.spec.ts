/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const D29_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>D29 escaped <a href="https://example.test/search?q=alpha&#38;beta=2" title="A&amp;B">&lt;em&gt;paragraph&lt;/em&gt;</a> and &notin text.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">D29 heading <a href="https://example.test/ref?one=1&#38;two=2" title="H&amp;B">&lt;em&gt;title&lt;/em&gt;</a> and &notin text.</h2>',
	'<!-- /wp:heading -->',
].join( '\n' );

async function getCurrentPostId( page: Page ): Promise< number > {
	return page.evaluate( () =>
		( window as any ).wp.data.select( 'core/editor' ).getCurrentPostId()
	);
}

async function isSavingPost( page: Page ): Promise< boolean > {
	return page.evaluate( () =>
		( window as any ).wp.data.select( 'core/editor' ).isSavingPost()
	);
}

async function getInvalidBlockCount( page: Page ): Promise< number > {
	return page.evaluate(
		() =>
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.filter( ( block: { isValid?: boolean } ) => ! block.isValid )
				.length
	);
}

test.describe( 'Collaboration - d29 entity reference normalization', () => {
	test( 'entity-equivalent invalid blocks do not churn persisted RTC state on collaborative reload', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		pageUtils,
	} ) => {
		test.setTimeout( 90000 );

		await admin.createNewPost();
		await editor.setPreferences( 'core/edit-post', {
			welcomeGuide: false,
			fullscreenMode: false,
		} );

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( 'RTC entity reference normalization d29' );

		await pageUtils.pressKeys( 'secondary+M' );
		await page
			.getByRole( 'textbox', { name: 'Type text or HTML' } )
			.fill( D29_CONTENT );
		await pageUtils.pressKeys( 'secondary+M' );

		await expect(
			editor.canvas
				.getByText( 'Block contains unexpected or invalid content' )
				.first()
		).toBeVisible();

		await pageUtils.pressKeys( 'primary+s' );
		await expect(
			page
				.getByRole( 'button', { name: 'Dismiss this notice' } )
				.filter( { hasText: 'Draft saved' } )
		).toBeVisible( { timeout: 15000 } );

		const postId = await getCurrentPostId( page );
		await collaborationUtils.openCollaborativeSession( postId );
		await Promise.all( [
			collaborationUtils.waitForEntityReadyAndSaveSettled( page ),
			collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaborationUtils.page2
			),
		] );

		await expect
			.poll(
				async () =>
					(
						await Promise.all( [
							isSavingPost( page ),
							isSavingPost( collaborationUtils.page2 ),
						] )
					).every( ( isSaving ) => ! isSaving ),
				{ timeout: 10000 }
			)
			.toBe( true );

		await expect
			.poll(
				async () =>
					Promise.all( [
						getInvalidBlockCount( page ),
						getInvalidBlockCount( collaborationUtils.page2 ),
					] ),
				{ timeout: 10000 }
			)
			.toEqual( [ 2, 2 ] );

		await expect
			.poll(
				async () => {
					const documents = await Promise.all( [
						collaborationUtils.getCrdtDocument( page ),
						collaborationUtils.getCrdtDocument(
							collaborationUtils.page2
						),
					] );

					return documents[ 0 ] && documents[ 0 ] === documents[ 1 ];
				},
				{ timeout: 10000 }
			)
			.toBe( true );

		const crdtDocumentAfterCollaborativeHydration =
			await collaborationUtils.getCrdtDocument( page );
		expect( crdtDocumentAfterCollaborativeHydration ).toBeTruthy();

		await Promise.all( [
			page.reload(),
			collaborationUtils.page2.reload(),
		] );
		await Promise.all( [
			collaborationUtils.waitForEntityReadyAndSaveSettled( page ),
			collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaborationUtils.page2
			),
		] );

		await expect
			.poll(
				async () =>
					Promise.all( [
						collaborationUtils.getCrdtDocument( page ),
						collaborationUtils.getCrdtDocument(
							collaborationUtils.page2
						),
					] ),
				{ timeout: 10000 }
			)
			.toEqual( [
				crdtDocumentAfterCollaborativeHydration,
				crdtDocumentAfterCollaborativeHydration,
			] );
	} );
} );
