/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

async function getTableBodyCellContents(
	editor: import('@wordpress/e2e-test-utils-playwright').Editor
) {
	const [ table ] = await editor.getBlocks();
	return table.attributes.body.map(
		( row: { cells: { content: string }[] } ) => row.cells[ 0 ].content
	);
}

async function createThreeByOneTableWithDuplicateRows( {
	editor,
	page,
}: {
	editor: import('@wordpress/e2e-test-utils-playwright').Editor;
	page: import('@playwright/test').Page;
} ) {
	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( '/table' );
	await page.keyboard.press( 'Enter' );

	const columnCountInput = editor.canvas.getByRole( 'spinbutton', {
		name: 'Column count',
	} );
	await columnCountInput.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( '1' );

	const rowCountInput = editor.canvas.getByRole( 'spinbutton', {
		name: 'Row count',
	} );
	await rowCountInput.click();
	await page.keyboard.press( 'ControlOrMeta+a' );
	await page.keyboard.type( '3' );

	await editor.canvas.getByRole( 'button', { name: 'Create Table' } ).click();

	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );

	await cells.nth( 0 ).click();
	await page.keyboard.type( 'anchor' );
	await cells.nth( 1 ).click();
	await page.keyboard.type( 'same' );
	await cells.nth( 2 ).click();
	await page.keyboard.type( 'same' );
	await page.keyboard.press( 'Escape' );
}

test.describe( 'Collaboration - duplicate table rows', () => {
	test( 'syncs duplicate table row contents created through the table UI', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 45_000 );

		const post = await requestUtils.createPost( {
			title: 'Duplicate table row collaboration repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		const { editor2, page2 } = collaborationUtils;
		await collaborationUtils.waitForMutualDiscovery();
		await createThreeByOneTableWithDuplicateRows( { editor, page } );
		await expect
			.poll( () => getTableBodyCellContents( editor ), {
				timeout: 10_000,
			} )
			.toEqual( [ 'anchor', 'same', 'same' ] );
		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );
		await expect
			.poll( () => getTableBodyCellContents( editor2 ), {
				timeout: 15_000,
			} )
			.toEqual( [ 'anchor', 'same', 'same' ] );
		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => getTableBodyCellContents( editor ), {
				timeout: 10_000,
			} )
			.toEqual( [ 'anchor', 'same', 'same' ] );
		await expect
			.poll( () => getTableBodyCellContents( editor2 ), {
				timeout: 10_000,
			} )
			.toEqual( [ 'anchor', 'same', 'same' ] );
	} );
} );
