/**
 * WordPress dependencies
 */
import { type Editor } from '@wordpress/e2e-test-utils-playwright';
import { type Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from '../fixtures';

const TABLE_CONTENT = [
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>A1</td></tr><tr><td>A2</td></tr></tbody></table></figure>',
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

async function clearEditorBrowserStorage( page: Page ) {
	await page.goto( '/wp-admin/' );
	const origin = new URL( page.url() ).origin;
	await page.evaluate( () => {
		window.localStorage.clear();
		window.sessionStorage.clear();
	} );
	const session = await page.context().newCDPSession( page );
	await session.send( 'Storage.clearDataForOrigin', {
		origin,
		storageTypes:
			'appcache,cache_storage,file_systems,indexeddb,local_storage,service_workers,shader_cache,websql',
	} );
	await session.detach();
}

async function appendOneCellRowAtEnd(
	editor: Editor,
	page: Page,
	cellText: string
) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	const originalCount = await cells.count();
	expect( originalCount ).toBeGreaterThan( 1 );
	await cells.last().click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row after' } ).click();
	await expect( cells ).toHaveCount( originalCount + 1 );
	await cells.nth( originalCount ).click();
	await page.keyboard.type( cellText );
	await expect( cells.nth( originalCount ) ).toHaveText( cellText );
}

async function prependOneCellRowInCodeEditor( page: Page, text: string ) {
	const codeEditor = page.getByRole( 'textbox', {
		name: 'Type text or HTML',
	} );
	const html = await codeEditor.inputValue();
	expect( html ).toContain( '<tr><td>A1</td></tr>' );
	expect( html ).not.toContain( 'remote-appended' );

	await codeEditor.fill(
		html.replace(
			'<tr><td>A1</td></tr>',
			`<tr><td>${ text }</td></tr><tr><td>A1</td></tr>`
		)
	);
}

test.describe( 'RTC WebSocket stale table row prepend', () => {
	test( 'preserves a remote appended row after a stale local code-editor prepend', async ( {
		collaborationUtils,
		editor,
		requestUtils,
		page,
		pageUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: `RTC 943c670fbf29 ${ Date.now() }`,
			status: 'draft',
			content: TABLE_CONTENT,
			date_gmt: new Date().toISOString(),
		} );
		await clearEditorBrowserStorage( page );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { editor2, page2 } = collaborationUtils;
		const initialRows = [ [ 'A1' ], [ 'A2' ] ];
		await expect
			.poll( () => getTableRows( editor ), { timeout: 15000 } )
			.toEqual( initialRows );
		await expect
			.poll( () => getTableRows( editor2 ), { timeout: 15000 } )
			.toEqual( initialRows );

		await pageUtils.pressKeys( 'secondary+M' );
		await prependOneCellRowInCodeEditor( page, 'local-prepended' );

		await appendOneCellRowAtEnd( editor2, page2, 'remote-appended' );
		await pageUtils.pressKeys( 'secondary+M' );

		const expectedRows = [
			[ 'local-prepended' ],
			[ 'A1' ],
			[ 'A2' ],
			[ 'remote-appended' ],
		];

		await expect
			.poll( () => getTableRows( editor ), { timeout: 10000 } )
			.toEqual( expectedRows );
		await expect
			.poll( () => getTableRows( editor2 ), { timeout: 10000 } )
			.toEqual( expectedRows );
	} );
} );
