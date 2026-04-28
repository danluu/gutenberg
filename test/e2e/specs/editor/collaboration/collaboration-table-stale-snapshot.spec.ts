/**
 * WordPress dependencies
 */
import { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

const EMPTY_TABLE = `<!-- wp:table -->
<figure class="wp-block-table"><table><tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table></figure>
<!-- /wp:table -->`;

const ONE_COLUMN_TABLE = `<!-- wp:table -->
<figure class="wp-block-table"><table><tbody><tr><td></td></tr><tr><td></td></tr></tbody></table></figure>
<!-- /wp:table -->`;

const LABELED_ONE_COLUMN_TABLE = `<!-- wp:table -->
<figure class="wp-block-table"><table><tbody><tr><td>A1</td></tr><tr><td>A2</td></tr></tbody></table></figure>
<!-- /wp:table -->`;

const THREE_ROW_ONE_COLUMN_TABLE = `<!-- wp:table -->
<figure class="wp-block-table"><table><tbody><tr><td>A1</td></tr><tr><td>A2</td></tr><tr><td>A3</td></tr></tbody></table></figure>
<!-- /wp:table -->`;

const TEXT_COLUMNS = `<!-- wp:text-columns {"columns":2,"width":"center"} -->
<div class="wp-block-text-columns aligncenter columns-2"><div class="wp-block-column"><p>C1</p></div><div class="wp-block-column"><p>C2</p></div></div>
<!-- /wp:text-columns -->`;

async function getBodyCellTexts( editor: any ): Promise< string[] > {
	const texts = await editor.canvas
		.locator( 'role=textbox[name="Body cell text"i]' )
		.allTextContents();
	return texts.map( ( text: string ) => text.replace( /\uFEFF/g, '' ) );
}

async function typeInBodyCell(
	page: any,
	editor: any,
	index: number,
	text: string
) {
	const cell = editor.canvas
		.locator( 'role=textbox[name="Body cell text"i]' )
		.nth( index );
	await cell.click();
	await page.keyboard.type( text );
}

async function typeInCaption( page: any, editor: any, text: string ) {
	const caption = editor.canvas.locator(
		'role=textbox[name="Table caption text"i]'
	);
	await caption.click();
	await page.keyboard.type( text );
}

async function getTextColumnTexts( editor: any ): Promise< string[] > {
	const texts = await editor.canvas
		.locator( 'role=textbox[name=/Column \\d+ text/i]' )
		.allTextContents();
	return texts.map( ( text: string ) => text.replace( /\uFEFF/g, '' ) );
}

async function typeInTextColumn(
	page: any,
	editor: any,
	index: number,
	text: string
) {
	const column = editor.canvas
		.locator( 'role=textbox[name=/Column \\d+ text/i]' )
		.nth( index );
	await column.click();
	await page.keyboard.type( text );
}

test.describe( 'Collaboration - table stale snapshots', () => {
	test( 'preserves a remote table cell edit when another user edits a different cell', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale snapshot',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: EMPTY_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ '', '', '', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ '', '', '', '' ] );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await typeInBodyCell( page2, editor2, 3, 'remote-B2' );
		await userAReceivesSync;
		await typeInBodyCell( page, editor, 0, 'local-A1' );

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'local-A1', '', '', 'remote-B2' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'local-A1', '', '', 'remote-B2' ] );
	} );

	test( 'preserves a remotely appended table row when another user edits a different cell', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale append',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ '', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ '', '' ] );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor2.clickBlockToolbarButton( 'Edit table' );
		await page2
			.locator( 'role=menuitem[name="Insert row after"i]' )
			.click();

		await userAReceivesSync;
		await typeInBodyCell( page, editor, 0, 'local-A1' );

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'local-A1', '', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'local-A1', '', '' ] );
	} );

	test( 'preserves a remotely appended table row while another user keeps typing', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale append while typing',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ '', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ '', '' ] );

		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 0 )
			.click();

		const userATyping = page.keyboard.type(
			'local-A1-local-A1-local-A1-local-A1-local-A1',
			{ delay: 30 }
		);

		await expect
			.poll(
				async () => ( await getBodyCellTexts( editor ) )[ 0 ].length,
				{ timeout: 5_000 }
			)
			.toBeGreaterThan( 4 );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor2.clickBlockToolbarButton( 'Edit table' );
		await page2
			.locator( 'role=menuitem[name="Insert row after"i]' )
			.click();

		await userAReceivesSync;
		await userATyping;

		const userAText = await getBodyCellTexts( editor );
		expect( userAText[ 0 ] ).toContain( 'local-A1' );

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toHaveLength( 3 );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toHaveLength( 3 );
	} );

	test( 'preserves a remote table row when another user edits the table caption', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale caption',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: LABELED_ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor2.clickBlockToolbarButton( 'Edit table' );
		await page2
			.locator( 'role=menuitem[name="Insert row after"i]' )
			.click();

		await userAReceivesSync;
		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 0 )
			.click();
		await page.getByRole( 'button', { name: 'Add caption' } ).click();
		await editor.canvas
			.locator( 'role=textbox[name="Table caption text"i]' )
			.waitFor();
		await typeInCaption( page, editor, 'local caption' );

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
	} );

	test( 'preserves a remote table row when another user changes column alignment', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale alignment',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: LABELED_ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );

		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 0 )
			.click();

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor2.clickBlockToolbarButton( 'Edit table' );
		await page2
			.locator( 'role=menuitem[name="Insert row after"i]' )
			.click();

		await userAReceivesSync;
		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 0 )
			.click();
		await editor.clickBlockToolbarButton( 'Change column alignment' );
		await page
			.locator( 'role=menuitemradio[name="Align column right"i]' )
			.click();

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
	} );

	test( 'preserves a remote table row when another user undoes a local table edit', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale undo',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: LABELED_ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );

		await typeInBodyCell( page, editor, 0, '-local' );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'A1-local', 'A2' ] );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor2.clickBlockToolbarButton( 'Edit table' );
		await page2
			.locator( 'role=menuitem[name="Insert row after"i]' )
			.click();

		await userAReceivesSync;
		await page.keyboard.press(
			process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
		);

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
	} );

	test( 'preserves a remote cell edit when another user deletes a different row', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale delete row',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: THREE_ROW_ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2', 'A3' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2', 'A3' ] );

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await typeInBodyCell( page2, editor2, 2, '-remote' );
		await userAReceivesSync;
		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 0 )
			.click();
		await editor.clickBlockToolbarButton( 'Edit table' );
		await page.locator( 'role=menuitem[name="Delete row"i]' ).click();

		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'A2', 'A3-remote' ] );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'A2', 'A3-remote' ] );
	} );

	test( 'preserves rows during repeated concurrent table menu actions', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale repeated menu actions',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: LABELED_ONE_COLUMN_TABLE,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		let expectedRows = 2;
		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toHaveLength( expectedRows );
		await expect
			.poll( () => getBodyCellTexts( editor2 ), { timeout: 10_000 } )
			.toHaveLength( expectedRows );

		for ( let i = 0; i < 6; i++ ) {
			await editor.canvas
				.locator( 'role=textbox[name="Body cell text"i]' )
				.nth( 0 )
				.click();
			await editor2.canvas
				.locator( 'role=textbox[name="Body cell text"i]' )
				.nth( expectedRows - 1 )
				.click();

			await Promise.all( [
				( async () => {
					await editor.clickBlockToolbarButton(
						'Change column alignment'
					);
					await page
						.locator(
							i % 2
								? 'role=menuitemradio[name="Align column left"i]'
								: 'role=menuitemradio[name="Align column right"i]'
						)
						.click();
				} )(),
				( async () => {
					await editor2.clickBlockToolbarButton( 'Edit table' );
					await page2
						.locator( 'role=menuitem[name="Insert row after"i]' )
						.click();
				} )(),
			] );

			expectedRows++;
			await expect
				.poll( () => getBodyCellTexts( editor ), { timeout: 20_000 } )
				.toHaveLength( expectedRows );
			await expect
				.poll( () => getBodyCellTexts( editor2 ), { timeout: 20_000 } )
				.toHaveLength( expectedRows );
		}
	} );

	test( 'preserves a remote text-column edit when another user changes block alignment', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC text columns stale query array',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: TEXT_COLUMNS,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getTextColumnTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'C1', 'C2' ] );
		await expect
			.poll( () => getTextColumnTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'C1', 'C2' ] );

		await editor.canvas
			.locator( 'role=textbox[name="Column 1 text"i]' )
			.click();

		const userAReceivesSync = page.waitForResponse(
			( response ) =>
				response.url().includes( 'wp-sync' ) &&
				response.status() === 200,
			{ timeout: 15_000 }
		);

		await typeInTextColumn( page2, editor2, 1, '-remote' );
		await userAReceivesSync;
		await editor.canvas
			.locator( 'role=textbox[name="Column 1 text"i]' )
			.click();
		await editor.clickBlockToolbarButton( 'Align' );
		await page.locator( 'role=menuitemradio[name="Full width"i]' ).click();

		await expect
			.poll( () => getTextColumnTexts( editor ), { timeout: 15_000 } )
			.toEqual( [ 'C1', 'C2-remote' ] );
		await expect
			.poll( () => getTextColumnTexts( editor2 ), { timeout: 15_000 } )
			.toEqual( [ 'C1', 'C2-remote' ] );
	} );

	test( 'preserves simultaneous text-column edits in different columns', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC text columns simultaneous edits',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: TEXT_COLUMNS,
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2, editor2 } = collaborationUtils;

		await expect
			.poll( () => getTextColumnTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'C1', 'C2' ] );
		await expect
			.poll( () => getTextColumnTexts( editor2 ), { timeout: 10_000 } )
			.toEqual( [ 'C1', 'C2' ] );

		await editor.canvas
			.locator( 'role=textbox[name="Column 1 text"i]' )
			.click();
		await editor2.canvas
			.locator( 'role=textbox[name="Column 2 text"i]' )
			.click();

		await Promise.all( [
			page.keyboard.type( '-local-local-local', { delay: 20 } ),
			page2.keyboard.type( '-remote-remote-remote', { delay: 20 } ),
		] );

		await expect
			.poll( () => getTextColumnTexts( editor ), { timeout: 20_000 } )
			.toEqual( [ 'C1-local-local-local', 'C2-remote-remote-remote' ] );
		await expect
			.poll( () => getTextColumnTexts( editor2 ), { timeout: 20_000 } )
			.toEqual( [ 'C1-local-local-local', 'C2-remote-remote-remote' ] );
	} );

	test( 'preserves an unsaved remote row when a second user edits during initial sync catch-up', async ( {
		collaborationUtils,
		requestUtils,
		page,
		editor,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC table stale initial catch-up',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: LABELED_ONE_COLUMN_TABLE,
		} );

		await collaborationUtils.openPost( post.id );
		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2' ] );

		await editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.nth( 1 )
			.click();
		await editor.clickBlockToolbarButton( 'Edit table' );
		await page.locator( 'role=menuitem[name="Insert row after"i]' ).click();
		await expect
			.poll( () => getBodyCellTexts( editor ), { timeout: 10_000 } )
			.toEqual( [ 'A1', 'A2', '' ] );
		await collaborationUtils.waitForSyncCycle( page, 2 );

		const context = await page
			.context()
			.browser()!
			.newContext( {
				baseURL: process.env.WP_BASE_URL || 'http://localhost:8889',
			} );
		const latePage = await context.newPage();

		try {
			await latePage.goto( '/wp-login.php' );
			await latePage
				.locator( '#user_login' )
				.fill( SECOND_USER.username );
			await latePage.locator( '#user_pass' ).fill( SECOND_USER.password );
			await latePage.getByRole( 'button', { name: 'Log In' } ).click();
			await latePage.waitForURL( '**/wp-admin/**' );

			const lateUserReceivesSync = latePage.waitForResponse(
				( response ) =>
					response.url().includes( 'wp-sync' ) &&
					response.status() === 200,
				{ timeout: 15_000 }
			);

			await latePage.goto(
				`/wp-admin/post.php?post=${ post.id }&action=edit`
			);
			await latePage.waitForFunction(
				() => window?.wp?.data && window?.wp?.blocks
			);
			await latePage.evaluate( () => {
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'welcomeGuide', false );
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'fullscreenMode', false );
			} );

			const lateEditor = new Editor( { page: latePage } );
			await lateUserReceivesSync;
			await typeInBodyCell( latePage, lateEditor, 0, '-late' );

			await expect
				.poll( () => getBodyCellTexts( editor ), { timeout: 20_000 } )
				.toEqual( [ 'A1-late', 'A2', '' ] );
			await expect
				.poll( () => getBodyCellTexts( lateEditor ), {
					timeout: 20_000,
				} )
				.toEqual( [ 'A1-late', 'A2', '' ] );
		} finally {
			await context.close();
		}
	} );
} );
