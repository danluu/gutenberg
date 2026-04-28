/**
 * External dependencies
 */
import type { Locator, Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const LINE_END_KEY = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';
const SELECT_ALL_KEY = 'ControlOrMeta+a';

function paragraphMarkup( content: string ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function postContent( contents: string[] ) {
	return contents.map( paragraphMarkup ).join( '\n\n' );
}

async function paragraphContents( editor: {
	getBlocks: () => Promise<
		{ name: string; attributes: { content?: string } }[]
	>;
} ) {
	return ( await editor.getBlocks() )
		.filter( ( block ) => block.name === 'core/paragraph' )
		.map( ( block ) => block.attributes.content );
}

type ParagraphEditor = {
	canvas: {
		locator: ( selector: string ) => Locator;
	};
};

async function focusParagraph(
	editor: ParagraphEditor,
	page: Page,
	index: number
) {
	await editor.canvas
		.locator( '[data-type="core/paragraph"]' )
		.nth( index )
		.click();
	await page.keyboard.press( LINE_END_KEY );
}

async function replaceParagraphText(
	editor: ParagraphEditor,
	page: Page,
	index: number,
	text: string
) {
	await editor.canvas
		.locator( '[data-type="core/paragraph"]' )
		.nth( index )
		.click();
	await page.keyboard.press( SELECT_ALL_KEY );
	await page.keyboard.type( text );
}

test.describe( 'Collaboration - stale top-level block snapshots', () => {
	test( 'preserves a remote paragraph append when another user edits an existing paragraph', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC stale top-level append',
			status: 'draft',
			content: postContent( [ 'Alpha', 'Beta' ] ),
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );
		await editor.setIsFixedToolbar( true );

		const { page2 } = collaborationUtils;
		const editor2 = collaborationUtils.editor2;

		await expect
			.poll( () => paragraphContents( editor ) )
			.toEqual( [ 'Alpha', 'Beta' ] );
		await expect
			.poll( () => paragraphContents( editor2 ) )
			.toEqual( [ 'Alpha', 'Beta' ] );

		await focusParagraph( editor2, page2, 1 );
		await Promise.all( [
			( async () => {
				await page2.keyboard.press( 'Enter' );
				await page2.keyboard.type( 'Gamma' );
			} )(),
			replaceParagraphText( editor, page, 0, 'Alpha local' ),
		] );

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => paragraphContents( editor ) )
			.toEqual( [ 'Alpha local', 'Beta', 'Gamma' ] );
		await expect
			.poll( () => paragraphContents( editor2 ) )
			.toEqual( [ 'Alpha local', 'Beta', 'Gamma' ] );
	} );

	test( 'preserves a remote paragraph deletion when another user edits an existing paragraph', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC stale top-level delete',
			status: 'draft',
			content: postContent( [ 'Alpha', 'Beta', 'Gamma' ] ),
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );
		await editor.setIsFixedToolbar( true );

		const { page2 } = collaborationUtils;
		const editor2 = collaborationUtils.editor2;

		await expect
			.poll( () => paragraphContents( editor ) )
			.toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );
		await expect
			.poll( () => paragraphContents( editor2 ) )
			.toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );

		await focusParagraph( editor2, page2, 2 );
		await Promise.all( [
			( async () => {
				await page2.keyboard.press( SELECT_ALL_KEY );
				await page2.keyboard.press( 'Backspace' );
				await page2.keyboard.press( 'Backspace' );
			} )(),
			replaceParagraphText( editor, page, 0, 'Alpha local' ),
		] );

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => paragraphContents( editor ) )
			.toEqual( [ 'Alpha local', 'Beta' ] );
		await expect
			.poll( () => paragraphContents( editor2 ) )
			.toEqual( [ 'Alpha local', 'Beta' ] );
	} );
} );
