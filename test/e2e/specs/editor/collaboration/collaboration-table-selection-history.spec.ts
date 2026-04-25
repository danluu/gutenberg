/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { LINE_START_KEY, pressKey } from './fixtures/keyboard-utils';

const TABLE_CELL_IDENTIFIER = 'body.0.cells.0.content';

async function getFirstTableCellContent( page: Page ) {
	return page.evaluate( () => {
		const block = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.find(
				( candidate: { name: string } ) =>
					candidate.name === 'core/table'
			);
		const content = block?.attributes?.body?.[ 0 ]?.cells?.[ 0 ]?.content;
		return content?.toString?.() ?? content ?? null;
	} );
}

async function getSelectionSnapshot( page: Page ) {
	return page.evaluate( () => {
		const selection = ( window as any ).wp.data.select(
			'core/block-editor'
		);
		const start = selection.getSelectionStart();
		const end = selection.getSelectionEnd();

		return {
			startAttributeKey: start?.attributeKey,
			startOffset: start?.offset,
			endAttributeKey: end?.attributeKey,
			endOffset: end?.offset,
		};
	} );
}

async function flushSelectionHistoryTimer( page: Page ) {
	await page.evaluate(
		() => new Promise( ( resolve ) => setTimeout( resolve, 0 ) )
	);
}

test.describe( 'Collaboration - Table Selection History', () => {
	test( 'keeps a table cell cursor when another user types before it', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Table Selection History Repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );
		await editor.setIsFixedToolbar( true );

		const { editor2, page2 } = collaborationUtils;
		await editor.insertBlock( { name: 'core/table' } );
		await editor.canvas
			.locator( 'role=button[name="Create Table"i]' )
			.click();

		const firstCell = editor.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.first();
		await expect( firstCell ).toBeVisible();
		await firstCell.click();
		await page.keyboard.type( 'Hello world' );

		await expect
			.poll( () => getFirstTableCellContent( page2 ), {
				timeout: 10000,
			} )
			.toBe( 'Hello world' );

		await firstCell.click();
		await page.keyboard.press( LINE_START_KEY );
		await pressKey( page, 'ArrowRight', 5 );

		await expect
			.poll( () => getSelectionSnapshot( page ), {
				timeout: 5000,
			} )
			.toMatchObject( {
				startAttributeKey: TABLE_CELL_IDENTIFIER,
				startOffset: 5,
				endAttributeKey: TABLE_CELL_IDENTIFIER,
				endOffset: 5,
			} );
		await flushSelectionHistoryTimer( page );

		const firstCell2 = editor2.canvas
			.locator( 'role=textbox[name="Body cell text"i]' )
			.first();
		await firstCell2.click();
		await page2.keyboard.press( LINE_START_KEY );
		await page2.keyboard.type( 'XXX' );

		await expect
			.poll( () => getFirstTableCellContent( page ), {
				timeout: 10000,
			} )
			.toBe( 'XXXHello world' );

		await expect
			.poll( () => getSelectionSnapshot( page ), {
				timeout: 10000,
			} )
			.toMatchObject( {
				startAttributeKey: TABLE_CELL_IDENTIFIER,
				startOffset: 8,
				endAttributeKey: TABLE_CELL_IDENTIFIER,
				endOffset: 8,
			} );

		await page.bringToFront();
		await page.keyboard.type( '!' );

		await expect
			.poll( () => getFirstTableCellContent( page ), {
				timeout: 10000,
			} )
			.toBe( 'XXXHello! world' );
		await expect
			.poll( () => getFirstTableCellContent( page2 ), {
				timeout: 10000,
			} )
			.toBe( 'XXXHello! world' );
	} );
} );
