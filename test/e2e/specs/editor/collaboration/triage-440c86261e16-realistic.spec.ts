/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const ENTITY_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 950287 ambiguous refs: &notin; / &notin text, nbsp &nbsp gap, quote &quot;value&quot;, apos &apos;value&apos;, lt &lt and gt &gt. <a href="https://example.test/search?q=alpha&amp;beta=2&amp-gamma=3&#38-delta=4&#x26-epsilon=5" title="A&amp B &copy 2026 &#34 quoted&#34;">attribute refs</a></p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Heading refs &amp optional &copy 950287 with &#x26; hex</h3>',
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

test.describe( 'Collaboration - entity normalization persistence', () => {
	test( 'user-authored entity-rich blocks do not invalidate persisted RTC blocks on collaborative reopen', async ( {
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
			.fill( 'RTC entity normalization seed 950287' );

		await pageUtils.pressKeys( 'secondary+M' );
		await page
			.getByRole( 'textbox', { name: 'Type text or HTML' } )
			.fill( ENTITY_CONTENT );
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
