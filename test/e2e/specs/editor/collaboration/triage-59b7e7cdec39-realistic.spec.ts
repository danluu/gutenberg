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

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC stale table body replacement row repro.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr><tr><td>initial row 2 A</td><td>initial row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

function bodyCells( editor: Editor ) {
	return editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
}

async function getTableRows( editor: Editor ) {
	return editor.canvas
		.locator( 'tbody tr' )
		.evaluateAll( ( rows ) =>
			rows.map( ( row ) =>
				Array.from( row.querySelectorAll( 'td' ), ( cell ) =>
					( cell.textContent ?? '' ).trim()
				)
			)
		);
}

async function waitForRows(
	primaryEditor: Editor,
	collaboratorEditor: Editor,
	expectedRows: string[][]
) {
	await expect
		.poll(
			async () => [
				await getTableRows( primaryEditor ),
				await getTableRows( collaboratorEditor ),
			],
			{ timeout: 20000 }
		)
		.toEqual( [ expectedRows, expectedRows ] );
}

async function editFirstRowSecondCellAndDeleteTail(
	editor: Editor,
	page: Page
) {
	const cells = bodyCells( editor );
	await cells.nth( 1 ).click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( 'remote edited row 1 B' );
	await cells.nth( 2 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Delete row' } ).click();
}

async function editTailAndAppendReplacement( editor: Editor, page: Page ) {
	const cells = bodyCells( editor );
	await cells.nth( 2 ).click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( 'local edited deleted row A' );
	await cells.nth( 3 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row after' } ).click();
	await expect( cells ).toHaveCount( 6 );
	await cells.nth( 4 ).click();
	await page.keyboard.type( 'local appended row A' );
	await cells.nth( 5 ).click();
	await page.keyboard.type( 'local appended row B' );
}

test.describe( 'RTC triage 59b7e7cdec39 realistic table body merge', () => {
	test( 'keeps a replacement row appended from a stale table while preserving the remote delete', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: `RTC realistic 59b7e7cdec39 ${ Date.now() }`,
			status: 'draft',
			content: INITIAL_CONTENT,
		} );

		await collaborationUtils.openCollaborativeSession( post.id );
		const { editor2: collaboratorEditor, page2: collaboratorPage } =
			collaborationUtils;

		await waitForRows( editor, collaboratorEditor, [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		] );

		await Promise.all( [
			editTailAndAppendReplacement( editor, page ),
			editFirstRowSecondCellAndDeleteTail(
				collaboratorEditor,
				collaboratorPage
			),
		] );

		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		await waitForRows( editor, collaboratorEditor, expectedRows );
		await expect( getTableRows( editor ) ).resolves.toEqual( expectedRows );
		await expect( getTableRows( collaboratorEditor ) ).resolves.toEqual(
			expectedRows
		);
	} );
} );
