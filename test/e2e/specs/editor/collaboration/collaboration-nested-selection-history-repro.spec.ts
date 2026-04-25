/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { LINE_START_KEY, pressKey } from './fixtures/keyboard-utils';

const BLOCK_NAME = 'e2e-tests/nested-rich-selection';
const BLOCK_TITLE = 'Nested Rich Selection Repro';
const FIELD_LABEL = 'Nested selection text';
const NESTED_IDENTIFIER = 'body.content';

async function getNestedRichTextContent( page: Page ) {
	return page.evaluate( ( blockName ) => {
		const block = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.find(
				( candidate: { name: string } ) => candidate.name === blockName
			);
		const content = block?.attributes?.body?.content;
		return content?.toString?.() ?? content;
	}, BLOCK_NAME );
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

async function insertNestedRichSelectionBlock( {
	editor,
	page,
}: {
	editor: any;
	page: Page;
} ) {
	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( `/${ BLOCK_TITLE }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', {
			name: `Block: ${ BLOCK_TITLE }`,
		} )
	).toBeVisible();
}

test.use( {
	video: 'on',
} );

test.describe( 'Collaboration - Nested Selection History Repro', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-nested-rich-selection'
		);
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-nested-rich-selection'
		);
	} );

	test( 'keeps a nested rich-text cursor when another user types before it', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Nested Rich Selection History Repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );
		await editor.setIsFixedToolbar( true );

		const { editor2, page2 } = collaborationUtils;
		await insertNestedRichSelectionBlock( { editor, page } );

		const field = editor.canvas.getByRole( 'textbox', {
			name: FIELD_LABEL,
		} );
		await field.click();
		await page.keyboard.type( 'Hello world' );

		await expect
			.poll( () => getNestedRichTextContent( page2 ), {
				timeout: 10000,
			} )
			.toBe( 'Hello world' );

		await field.click();
		await page.keyboard.press( LINE_START_KEY );
		await pressKey( page, 'ArrowRight', 5 );

		await expect
			.poll( () => getSelectionSnapshot( page ), {
				timeout: 5000,
			} )
			.toMatchObject( {
				startAttributeKey: NESTED_IDENTIFIER,
				startOffset: 5,
				endAttributeKey: NESTED_IDENTIFIER,
				endOffset: 5,
			} );
		await flushSelectionHistoryTimer( page );

		const field2 = editor2.canvas.getByRole( 'textbox', {
			name: FIELD_LABEL,
		} );
		await field2.click();
		await page2.keyboard.press( LINE_START_KEY );
		await page2.keyboard.type( 'XXX' );

		await expect
			.poll( () => getNestedRichTextContent( page ), {
				timeout: 10000,
			} )
			.toBe( 'XXXHello world' );

		await expect
			.poll( () => getSelectionSnapshot( page ), {
				timeout: 10000,
			} )
			.toMatchObject( {
				startAttributeKey: NESTED_IDENTIFIER,
				startOffset: 8,
				endAttributeKey: NESTED_IDENTIFIER,
				endOffset: 8,
			} );
	} );
} );
