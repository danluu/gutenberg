/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC da6 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>RTC da6 nested paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">RTC da6 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC da6 second paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC da6 shared paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>RTC da6 pullquote text</p><cite>RTC da6 citation</cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
].join( '\n' );

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

function getBlockContent( block: {
	attributes?: Record< string, unknown >;
	innerBlocks?: unknown[];
} ): string[] {
	return [
		String( block.attributes?.content ?? '' ),
		...( block.innerBlocks ?? [] ).flatMap( ( innerBlock ) =>
			getBlockContent(
				innerBlock as {
					attributes?: Record< string, unknown >;
					innerBlocks?: unknown[];
				}
			)
		),
	];
}

async function clickTextInCanvas( editor: Editor, text: string ) {
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function appendParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clickTextInCanvas( editor, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 10 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: true } )
	).toBeVisible();
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 10 } );
	await expect( titleBox ).toContainText( title );
}

async function insertSearchBlockFromEmptyParagraph( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect(
		page.locator( '[role="listbox"]' ).filter( { hasText: 'Search' } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function getAllBlockContents( editor: Editor ): Promise< string[] > {
	const blocks = await editor.getBlocks();
	return blocks.flatMap( getBlockContent ).filter( Boolean );
}

async function waitForEditorsToMatch( editors: Editor[] ) {
	await expect( async () => {
		const [ firstContents, ...otherContents ] = await Promise.all(
			editors.map( getAllBlockContents )
		);

		for ( const contents of otherContents ) {
			expect( contents ).toEqual( firstContents );
		}
	} ).toPass( { timeout: 20_000 } );
}

async function clickSaveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled( { timeout: 20_000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20_000 } );
}

async function getParagraphContents( editor: Editor ): Promise< string[] > {
	const blocks = await editor.getBlocks();
	return blocks.map( ( block ) => String( block.attributes?.content ?? '' ) );
}

async function expectParagraphsPresent(
	editor: Editor,
	expectedParagraphs: string[]
) {
	await expect( async () => {
		const contents = await getParagraphContents( editor );
		for ( const paragraph of expectedParagraphs ) {
			expect( contents ).toContain( paragraph );
		}
	} ).toPass( { timeout: 20_000 } );
}

test.describe( 'Collaboration - stale append persistence', () => {
	test( 'preserves both user paragraphs after save and reload when both append after the same paragraph', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const runId = Date.now();
		const primaryText = `rtc-da6-primary-${ runId }`;
		const collaboratorText = `rtc-da6-collaborator-${ runId }`;
		const checkpointText = `rtc-da6-checkpoint-${ runId }`;
		const checkpointTitle = `RTC da6 checkpoint ${ runId }`;
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC da6 stale append ${ runId }`,
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );

		await expect(
			collaboratorEditor.canvas.getByText( 'RTC da6 shared paragraph.', {
				exact: true,
			} )
		).toBeVisible();
		await waitForEditorsToMatch( [ editor, collaboratorEditor ] );

		await appendParagraphAfterText(
			editor,
			page,
			'RTC da6 shared paragraph.',
			primaryText
		);
		await appendParagraphAfterText(
			collaboratorEditor,
			collaboratorPage,
			'RTC da6 shared paragraph.',
			collaboratorText
		);
		await waitForEditorsToMatch( [ editor, collaboratorEditor ] );

		await appendParagraphAfterText(
			editor,
			page,
			primaryText,
			checkpointText
		);
		await waitForEditorsToMatch( [ editor, collaboratorEditor ] );
		await page.keyboard.press( 'Enter' );
		await insertSearchBlockFromEmptyParagraph( page );
		await typeTitle( editor, page, checkpointTitle );
		await clickSaveDraft( page );

		await page.reload( { waitUntil: 'load' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20_000,
		} );

		await expectParagraphsPresent( editor, [
			primaryText,
			collaboratorText,
			checkpointText,
		] );
	} );
} );
