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

async function typeChunks(
	page: Page,
	chunks: string[],
	options: Parameters< Page[ 'keyboard' ][ 'type' ] >[ 1 ] = {}
) {
	for ( const chunk of chunks ) {
		await page.keyboard.type( chunk, options );
	}
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
	test( 'keeps a remote file name edit while another user continuously edits the download button text', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 90_000 );

		const post = await requestUtils.createPost( {
			title: 'RTC stale rich text sibling repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: [
				'<!-- wp:file {"href":"https://example.com/initial.pdf","textLinkHref":"https://example.com/initial.pdf"} -->',
				'<div class="wp-block-file"><a href="https://example.com/initial.pdf">Initial file</a><a href="https://example.com/initial.pdf" class="wp-block-file__button wp-element-button" download>Download</a></div>',
				'<!-- /wp:file -->',
				// A large but ordinary post makes remote block-tree reconciliation
				// overlap with user A's continued typing.
				...Array.from(
					{ length: 2000 },
					( _, i ) =>
						`<!-- wp:paragraph --><p>Filler paragraph ${ i }</p><!-- /wp:paragraph -->`
				),
			].join( '\n' ),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		const { editor2, page2 } = collaborationUtils;

		await expect
			.poll(
				async () => {
					const fileBlock = getFileBlock( await editor.getBlocks() );
					return {
						fileName: fileBlock.attributes.fileName,
						downloadButtonText:
							fileBlock.attributes.downloadButtonText,
					};
				},
				{ timeout: 20_000 }
			)
			.toEqual( {
				fileName: 'Initial file',
				downloadButtonText: 'Download',
			} );
		await expect
			.poll(
				async () => {
					const fileBlock = getFileBlock( await editor2.getBlocks() );
					return {
						fileName: fileBlock.attributes.fileName,
						downloadButtonText:
							fileBlock.attributes.downloadButtonText,
					};
				},
				{ timeout: 20_000 }
			)
			.toEqual( {
				fileName: 'Initial file',
				downloadButtonText: 'Download',
			} );

		const fileNameB = editor2.canvas
			.locator( '[data-type="core/file"] a[contenteditable="true"]' )
			.first();
		const downloadButtonA = editor.canvas
			.locator(
				'[data-type="core/file"] [aria-label="Download button text"]'
			)
			.first();

		await replaceText( page, downloadButtonA, 'Local button ', {
			delay: 10,
		} );

		const typingA = typeChunks(
			page,
			Array.from( { length: 100 }, ( _, i ) => `chunk${ i } ` ),
			{ delay: 25 }
		);

		await collaborationUtils.waitForSyncCycle( page, 1 );
		await replaceText( page2, fileNameB, 'Remote file', {
			delay: 20,
		} );

		await typingA;
		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

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
