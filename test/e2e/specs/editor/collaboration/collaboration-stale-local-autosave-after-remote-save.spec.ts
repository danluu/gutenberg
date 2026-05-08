/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

async function getLocalAutosave( page: Page, postId: number ) {
	return page.evaluate( ( id ) => {
		const value = window.sessionStorage.getItem(
			`wp-autosave-block-editor-post-${ id }`
		);
		return value ? JSON.parse( value ) : null;
	}, postId );
}

async function getSerializedBlocks( page: Page ) {
	return page.evaluate( () =>
		JSON.stringify(
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.map(
					( block: {
						attributes?: Record< string, unknown >;
						name: string;
					} ) => ( {
						name: block.name,
						attributes: block.attributes ?? {},
					} )
				)
		)
	);
}

async function waitForSameBlocks( pages: Page[] ) {
	await expect
		.poll(
			async () => {
				const states = await Promise.all(
					pages.map( ( page ) => getSerializedBlocks( page ) )
				);
				return states.every( ( state ) => state === states[ 0 ] );
			},
			{ timeout: 30000 }
		)
		.toBe( true );
}

test.describe( 'Collaboration stale local autosave after remote save reload', () => {
	test( 'does not restore an older browser backup over a peer save after immediate reload', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const aMarker = 'd49alpha';
		const bMarker = 'd49beta';
		const post = await requestUtils.createPost( {
			title: 'RTC stale local autosave after remote save',
			content:
				'<!-- wp:paragraph -->\n<p>initial stale local autosave paragraph</p>\n<!-- /wp:paragraph -->',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		const { page: page2, editor: editor2 } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
		await waitForSameBlocks( [ page, page2 ] );

		await editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.last()
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.insertText( aMarker );

		await expect
			.poll( () => getLocalAutosave( page, post.id ), {
				timeout: 25000,
				message: 'the non-saving tab should have a browser backup',
			} )
			.toMatchObject( {
				content: expect.stringContaining( aMarker ),
			} );

		await waitForSameBlocks( [ page, page2 ] );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.last()
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.insertText( bMarker );

		await expect
			.poll(
				async () => {
					return getSerializedBlocks( page );
				},
				{ timeout: 10000 }
			)
			.toContain( bMarker );

		const staleBackup = await getLocalAutosave( page, post.id );
		expect( staleBackup.content ).toContain( aMarker );
		expect( staleBackup.content ).not.toContain( bMarker );

		await editor2.saveDraft();
		await page.reload( { waitUntil: 'load' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page );

		await expect(
			page.getByText(
				'The backup of this post in your browser is different from the version below.'
			)
		).toHaveCount( 0 );

		const serializedBlocks = await getSerializedBlocks( page );
		expect( serializedBlocks ).toContain( aMarker );
		expect( serializedBlocks ).toContain( bMarker );
	} );
} );
