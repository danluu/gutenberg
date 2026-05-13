/**
 * WordPress dependencies
 */
import { type Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * External dependencies
 */
import type { Locator, Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from '../fixtures';
import { SECOND_USER } from '../fixtures/collaboration-utils';

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

async function insertTwoByTwoTable( editor: Editor, page: Page ) {
	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( '/table' );
	await page.keyboard.press( 'Enter' );

	const columnCount = editor.canvas.getByRole( 'spinbutton', {
		name: /column count/i,
	} );
	await expect( columnCount ).toBeVisible();
	await columnCount.fill( '2' );
	await editor.canvas
		.getByRole( 'spinbutton', { name: /row count/i } )
		.fill( '2' );
	await editor.canvas
		.getByRole( 'button', { name: /create table/i } )
		.click();

	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells ).toHaveCount( 4 );

	for ( const [ index, text ] of [
		[ 0, 'initial row 1 A seed 950491 step 1 user 0' ],
		[ 1, 'initial row 1 B seed 950491 step 1 user 0' ],
		[ 2, 'initial row 2 A seed 950491 step 1 user 0' ],
		[ 3, 'initial row 2 B seed 950491 step 1 user 0' ],
	] as const ) {
		await cells.nth( index ).click();
		await page.keyboard.type( text );
	}
}

async function replaceCellText( page: Page, cell: Locator, text: string ) {
	await cell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
	await expect( cell ).toContainText( text );
}

async function prependRow(
	editor: Editor,
	page: Page,
	firstCellText: string,
	secondCellText: string
) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells ).toHaveCount( 4 );
	await cells.first().click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row before' } ).click();
	await expect( cells ).toHaveCount( 6 );
	await cells.first().click();
	await page.keyboard.type( firstCellText );
	await cells.nth( 1 ).click();
	await page.keyboard.type( secondCellText );
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

test.describe( 'RTC triage 9000e0395bb1 realistic table prepend after cell edit', () => {
	test( 'preserves the trailing row after a remote tail-cell edit and collaborator row prepend', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const post = await requestUtils.createPost( {
			title: `RTC realistic table prepend ${ Date.now() }`,
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await insertTwoByTwoTable( editor, page );
		await expect( async () => {
			expect( await getTableRows( editor ) ).toHaveLength( 2 );
		} ).toPass();

		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );

		const collaboratorEditor = collaborationUtils.editor2;
		const collaboratorPage = collaborationUtils.page2;
		await expect( async () => {
			expect( await getTableRows( collaboratorEditor ) ).toHaveLength(
				2
			);
		} ).toPass( { timeout: 15_000 } );

		const primaryCells = editor.canvas.getByRole( 'textbox', {
			name: 'Body cell text',
		} );
		await replaceCellText(
			page,
			primaryCells.nth( 3 ),
			'table-option-950491-7-0-1'
		);
		await expect(
			collaboratorEditor.canvas
				.getByRole( 'textbox', { name: 'Body cell text' } )
				.nth( 3 )
		).toContainText( 'table-option-950491-7-0-1', {
			timeout: 15_000,
		} );

		await prependRow(
			collaboratorEditor,
			collaboratorPage,
			'table-option-950491-8-1-3',
			'table-option-950491-8-1-3 sibling'
		);

		await expect( async () => {
			const [ primaryRows, collaboratorRows ] = await Promise.all( [
				getTableRows( editor ),
				getTableRows( collaboratorEditor ),
			] );
			expect( primaryRows ).toEqual( collaboratorRows );
			expect( primaryRows ).toHaveLength( 3 );
			expect( primaryRows[ 2 ][ 0 ] ).toBe(
				'initial row 2 A seed 950491 step 1 user 0'
			);
			expect( primaryRows[ 2 ][ 1 ] ).toBe( 'table-option-950491-7-0-1' );
		} ).toPass( { timeout: 20_000 } );
	} );
} );
