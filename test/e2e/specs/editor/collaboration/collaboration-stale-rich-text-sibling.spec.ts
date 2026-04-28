/**
 * External dependencies
 */
import type { Locator, Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

async function replaceText(
	page: Page,
	locator: Locator,
	text: string,
	options: Parameters< Page[ 'keyboard' ][ 'type' ] >[ 1 ] = {}
) {
	await locator.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( text, options );
}

function getFileBlock(
	blocks: Awaited< ReturnType< Editor[ 'getBlocks' ] > >
) {
	const fileBlock = blocks.find( ( block ) => block.name === 'core/file' );

	if ( ! fileBlock ) {
		throw new Error( 'File block not found.' );
	}

	return fileBlock;
}

test.describe( 'Collaboration - Stale rich-text sibling snapshots', () => {
	test( 'keeps a remote file name edit while another user edits the download button text', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 45_000 );

		const post = await requestUtils.createPost( {
			title: 'RTC stale rich text sibling repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: [
				'<!-- wp:file {"href":"https://example.com/initial.pdf","textLinkHref":"https://example.com/initial.pdf"} -->',
				'<div class="wp-block-file"><a href="https://example.com/initial.pdf">Initial file</a><a href="https://example.com/initial.pdf" class="wp-block-file__button wp-element-button" download>Download</a></div>',
				'<!-- /wp:file -->',
			].join( '\n' ),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		const { editor2, page2 } = collaborationUtils;

		await expect
			.poll( () => editor.getBlocks(), { timeout: 10_000 } )
			.toMatchObject( [
				{
					name: 'core/file',
					attributes: {
						fileName: 'Initial file',
						downloadButtonText: 'Download',
					},
				},
			] );
		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10_000 } )
			.toMatchObject( [
				{
					name: 'core/file',
					attributes: {
						fileName: 'Initial file',
						downloadButtonText: 'Download',
					},
				},
			] );

		const fileNameB = editor2.canvas
			.locator( '[data-type="core/file"] a[contenteditable="true"]' )
			.first();
		const downloadButtonA = editor.canvas
			.locator(
				'[data-type="core/file"] [aria-label="Download button text"]'
			)
			.first();

		const remoteSyncSeenByA = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200
		);
		await replaceText( page2, fileNameB, 'Remote file', {
			delay: 10,
		} );
		await remoteSyncSeenByA;

		await replaceText( page, downloadButtonA, 'Local button ', {
			delay: 10,
		} );

		for ( let i = 0; i < 12; i++ ) {
			await page.keyboard.type( `chunk${ i } `, {
				delay: 15,
			} );
		}

		await expect( async () => {
			const fileA = getFileBlock( await editor.getBlocks() );
			const fileB = getFileBlock( await editor2.getBlocks() );

			expect( fileA.attributes.fileName ).toBe( 'Remote file' );
			expect( fileB.attributes.fileName ).toBe( 'Remote file' );
			expect( fileA.attributes.downloadButtonText ).toContain(
				'Local button'
			);
			expect( fileB.attributes.downloadButtonText ).toContain(
				'Local button'
			);
		} ).toPass( { timeout: 20_000 } );
	} );
} );
