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
	'<p>RTC realistic stale-local table body sequence.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr><tr><td>initial row 2 A</td><td>initial row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

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

function bodyCells( editor: Editor ) {
	return editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
}

async function appendRowAtEnd(
	editor: Editor,
	page: Page,
	firstCellText: string,
	secondCellText: string
) {
	const cells = bodyCells( editor );
	const originalCount = await cells.count();
	await cells.nth( originalCount - 1 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row after' } ).click();
	await expect( cells ).toHaveCount( originalCount + 2 );
	await cells.nth( originalCount ).click();
	await page.keyboard.type( firstCellText );
	await cells.nth( originalCount + 1 ).click();
	await page.keyboard.type( secondCellText );
}

async function prependRowAtStart(
	editor: Editor,
	page: Page,
	firstCellText: string,
	secondCellText: string
) {
	const cells = bodyCells( editor );
	const originalCount = await cells.count();
	await cells.first().click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row before' } ).click();
	await expect( cells ).toHaveCount( originalCount + 2 );
	await cells.first().click();
	await page.keyboard.type( firstCellText );
	await cells.nth( 1 ).click();
	await page.keyboard.type( secondCellText );
}

async function deleteSecondRow( editor: Editor, page: Page ) {
	const cells = bodyCells( editor );
	await expect( cells ).toHaveCount( 6 );
	await cells.nth( 2 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Delete row' } ).click();
}

async function editRowSecondCellByFirstCellText(
	editor: Editor,
	page: Page,
	firstCellText: string,
	text: string
) {
	const row = editor.canvas
		.locator( 'tbody tr' )
		.filter( { hasText: firstCellText } )
		.first();
	await expect( row ).toBeVisible();
	const cell = row
		.getByRole( 'textbox', { name: 'Body cell text' } )
		.nth( 1 );
	await cell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
}

test.describe( 'RTC triage 703ef0771ea5 realistic table body merge', () => {
	test( 'preserves a prior appended row after remote delete, append, prepend, and stale tail edit', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: `RTC realistic 703ef0771ea5 ${ Date.now() }`,
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

		await appendRowAtEnd(
			editor,
			page,
			'primary appended A',
			'primary appended B'
		);
		await waitForRows( editor, collaboratorEditor, [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
			[ 'primary appended A', 'primary appended B' ],
		] );

		await deleteSecondRow( collaboratorEditor, collaboratorPage );
		await waitForRows( editor, collaboratorEditor, [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'primary appended A', 'primary appended B' ],
		] );

		await appendRowAtEnd(
			collaboratorEditor,
			collaboratorPage,
			'collaborator appended A',
			'collaborator appended B'
		);
		await waitForRows( editor, collaboratorEditor, [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'primary appended A', 'primary appended B' ],
			[ 'collaborator appended A', 'collaborator appended B' ],
		] );

		await prependRowAtStart(
			collaboratorEditor,
			collaboratorPage,
			'collaborator prepended A',
			'collaborator prepended B'
		);
		await waitForRows( editor, collaboratorEditor, [
			[ 'collaborator prepended A', 'collaborator prepended B' ],
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'primary appended A', 'primary appended B' ],
			[ 'collaborator appended A', 'collaborator appended B' ],
		] );

		await editRowSecondCellByFirstCellText(
			editor,
			page,
			'collaborator appended A',
			'tail cell edited by primary'
		);
		const expectedFinalRows = [
			[ 'collaborator prepended A', 'collaborator prepended B' ],
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'primary appended A', 'primary appended B' ],
			[ 'collaborator appended A', 'tail cell edited by primary' ],
		];
		await waitForRows( editor, collaboratorEditor, expectedFinalRows );
		await expect( getTableRows( editor ) ).resolves.toEqual(
			expectedFinalRows
		);
		await expect( getTableRows( collaboratorEditor ) ).resolves.toEqual(
			expectedFinalRows
		);
	} );
} );
