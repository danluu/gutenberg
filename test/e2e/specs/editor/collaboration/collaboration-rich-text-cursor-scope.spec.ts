/**
 * External dependencies
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type {
	Editor,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const PLUGIN = 'gutenberg-test-cursor-scope-bug';
const BLOCK_NAME = 'test/cursor-scope-bug';
const BLOCK_TITLE = 'Cursor Scope Bug';
const INITIAL_SECOND = '<em>b</em><em>i</em>';
const TARGET_SECOND = 'ab<em>b</em><strong>it</strong>';
const STEP_TWO_SECOND = 'a<strong>it</strong>';
const STEP_THREE_SECOND = 'ab<em>b</em><strong>i</strong>t';
const STEP_THREE_EXPECTED_TEXT = 'abbit';
const INITIAL_FILE_NAME = 'gamma';
const TARGET_FILE_NAME = 'manual';
const INITIAL_BUTTON_TEXT = 'Download';

async function readSecondHtml( page: Page ) {
	return page.evaluate( ( blockName ) => {
		const block = window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.find( ( currentBlock ) => currentBlock?.name === blockName );
		const second = block?.attributes?.second;
		return typeof second === 'string'
			? second
			: second?.toHTMLString?.() ?? second?.valueOf?.();
	}, BLOCK_NAME );
}

async function insertCursorScopeBlockViaInserter( page: Page ) {
	const inserterButton = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Block Inserter', exact: true } );
	const blockLibrary = page.getByRole( 'region', { name: 'Block Library' } );
	const searchBox = blockLibrary.getByRole( 'searchbox', { name: 'Search' } );

	await inserterButton.click();
	await searchBox.fill( BLOCK_TITLE );
	await blockLibrary.getByText( BLOCK_TITLE, { exact: true } ).click();
}

function getDownloadButtonField( page: Page ) {
	return page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator(
			'[data-type="core/file"] [aria-label="Download button text"]'
		);
}

async function seedFileBlockMedia( requestUtils: RequestUtils ) {
	const tempDir = await mkdtemp(
		path.join( os.tmpdir(), 'rtc-cursor-scope-file-' )
	);
	const gammaPath = path.join( tempDir, `${ INITIAL_FILE_NAME }.txt` );
	const manualPath = path.join( tempDir, `${ TARGET_FILE_NAME }.txt` );

	await requestUtils.deleteAllMedia();
	await writeFile( gammaPath, 'gamma\n' );
	await writeFile( manualPath, 'manual\n' );

	try {
		const gamma = await requestUtils.uploadMedia( gammaPath );
		const manual = await requestUtils.uploadMedia( manualPath );
		return { gamma, manual, tempDir };
	} catch ( error ) {
		await rm( tempDir, { force: true, recursive: true } );
		throw error;
	}
}

async function readFileName( page: Page ) {
	return page.evaluate( () => {
		const block = window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.find( ( currentBlock ) => currentBlock?.name === 'core/file' );
		return block?.attributes?.fileName;
	} );
}

async function readSelectionStart( page: Page ) {
	return page.evaluate( () =>
		window.wp.data.select( 'core/block-editor' ).getSelectionStart()
	);
}

async function moveCaretToOffset( page: Page, targetOffset: number ) {
	const downloadButton = getDownloadButtonField( page );
	const boundingBox = await downloadButton.boundingBox();

	if ( ! boundingBox ) {
		throw new Error( 'Download button field not visible.' );
	}

	await page.mouse.click(
		boundingBox.x + boundingBox.width - 4,
		boundingBox.y + boundingBox.height / 2
	);

	for ( let attempt = 0; attempt < 12; attempt += 1 ) {
		const selectionStart = await readSelectionStart( page );
		if ( selectionStart?.offset === targetOffset ) {
			return;
		}
		await page.keyboard.press(
			selectionStart?.offset > targetOffset ? 'ArrowLeft' : 'ArrowRight'
		);
	}

	throw new Error( `Failed to move caret to offset ${ targetOffset }.` );
}

async function replaceFileViaMediaLibrary( {
	editor,
	page,
	targetMediaId,
}: {
	editor: Editor;
	page: Page;
	targetMediaId: number;
} ) {
	await editor.clickBlockToolbarButton( 'Replace' );
	await page.getByRole( 'menuitem', { name: 'Open Media Library' } ).click();

	const mediaDialog = page.locator( '.media-modal' );

	await expect( mediaDialog ).toBeVisible();
	await mediaDialog.getByRole( 'tab', { name: 'Media Library' } ).click();
	await mediaDialog
		.locator(
			`.attachments-browser .attachment[data-id="${ targetMediaId }"]`
		)
		.click();
	await mediaDialog
		.getByRole( 'button', { name: 'Select', exact: true } )
		.click();
	await expect( mediaDialog ).toBeHidden();
}

async function expectNoLaterVisibleCorruption( {
	collaborationUtils,
	editor,
	page,
}: {
	collaborationUtils: {
		page2: Page;
		waitForSyncCycle: (
			currentPage: Page,
			cycles: number,
			options?: { timeout?: number }
		) => Promise< void >;
	};
	editor: {
		saveDraft: () => Promise< void >;
	};
	page: Page;
} ) {
	const { page2 } = collaborationUtils;

	await expect
		.poll( () => readSecondHtml( page ), { timeout: 10000 } )
		.toBe( INITIAL_SECOND );
	await expect
		.poll( () => readSecondHtml( page2 ), { timeout: 10000 } )
		.toBe( INITIAL_SECOND );

	const firstField = page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator( 'p.first[contenteditable="true"]' );
	const secondField = page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator( 'p.second[contenteditable="true"]' );
	const secondFieldPage2 = page2
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator( 'p.second[contenteditable="true"]' );

	await firstField.click();
	await firstField.type( 'x' );

	await expect
		.poll( () => readSecondHtml( page2 ), { timeout: 10000 } )
		.toBe( TARGET_SECOND );

	await firstField.type( 'y' );

	await expect
		.poll( () => readSecondHtml( page2 ), { timeout: 10000 } )
		.toBe( STEP_TWO_SECOND );

	await firstField.type( 'q' );

	await collaborationUtils.waitForSyncCycle( page, 2, {
		timeout: 15000,
	} );
	await collaborationUtils.waitForSyncCycle( page2, 2, {
		timeout: 15000,
	} );

	await expect
		.poll( () => readSecondHtml( page ), { timeout: 10000 } )
		.toBe( STEP_THREE_SECOND );
	await expect
		.poll( () => readSecondHtml( page2 ), { timeout: 10000 } )
		.toBe( STEP_THREE_SECOND );

	await expect( secondField ).toContainText( STEP_THREE_EXPECTED_TEXT );
	await expect( secondFieldPage2 ).toContainText( STEP_THREE_EXPECTED_TEXT );

	await editor.saveDraft();
	await collaborationUtils.waitForSyncCycle( page, 2, {
		timeout: 15000,
	} );
	await collaborationUtils.waitForSyncCycle( page2, 2, {
		timeout: 15000,
	} );

	await expect
		.poll( () => readSecondHtml( page2 ), { timeout: 10000 } )
		.toBe( STEP_THREE_SECOND );
	await expect( secondFieldPage2 ).toContainText( STEP_THREE_EXPECTED_TEXT );
}

test.describe( 'Collaboration - RichText Cursor Scope', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( PLUGIN );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin( PLUGIN );
	} );

	test( 'keeps collaborator rich text correct', async ( {
		collaborationUtils,
		editor,
		requestUtils,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC RichText Cursor Scope',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { page2 } = collaborationUtils;

		for ( const currentPage of [ page, page2 ] ) {
			await currentPage.waitForFunction(
				( blockName ) => !! window.wp.blocks.getBlockType( blockName ),
				BLOCK_NAME
			);
		}

		await page.evaluate(
			( { blockName, second } ) => {
				const block = window.wp.blocks.createBlock( blockName, {
					first: '',
					second,
				} );
				window.wp.data
					.dispatch( 'core/block-editor' )
					.insertBlock( block );
			},
			{ blockName: BLOCK_NAME, second: INITIAL_SECOND }
		);

		await expectNoLaterVisibleCorruption( {
			collaborationUtils,
			editor,
			page,
		} );
	} );

	test( 'keeps collaborator rich text correct with the real inserter and typing interactions', async ( {
		collaborationUtils,
		editor,
		requestUtils,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC RichText Cursor Scope High Level',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		for ( const currentPage of [ page, collaborationUtils.page2 ] ) {
			await currentPage.waitForFunction(
				( blockName ) => !! window.wp.blocks.getBlockType( blockName ),
				BLOCK_NAME
			);
		}

		await insertCursorScopeBlockViaInserter( page );
		await expectNoLaterVisibleCorruption( {
			collaborationUtils,
			editor,
			page,
		} );
	} );

	test( 'keeps core/file collaborator file name correct after a real toggle then file replacement', async ( {
		collaborationUtils,
		editor,
		requestUtils,
		page,
	} ) => {
		const { gamma, manual, tempDir } =
			await seedFileBlockMedia( requestUtils );

		try {
			const post = await requestUtils.createPost( {
				title: 'RTC RichText Cursor Scope File Block',
				status: 'draft',
				date_gmt: new Date().toISOString(),
			} );
			await collaborationUtils.openCollaborativeSession( post.id );
			const { page2 } = collaborationUtils;

			await page.evaluate(
				( { mediaId, mediaUrl } ) => {
					const block = window.wp.blocks.createBlock( 'core/file', {
						id: mediaId,
						href: mediaUrl,
						fileName: 'gamma',
						textLinkHref: mediaUrl,
						showDownloadButton: true,
						downloadButtonText: 'Download',
					} );
					window.wp.data
						.dispatch( 'core/block-editor' )
						.insertBlock( block );
				},
				{ mediaId: gamma.id, mediaUrl: gamma.source_url }
			);
			await collaborationUtils.waitForSyncCycle( page, 2, {
				timeout: 15000,
			} );
			await collaborationUtils.waitForSyncCycle( page2, 2, {
				timeout: 15000,
			} );

			await moveCaretToOffset( page, 2 );
			await page
				.getByRole( 'checkbox', { name: 'Open in new tab' } )
				.click();
			await collaborationUtils.waitForSyncCycle( page, 2, {
				timeout: 15000,
			} );
			await collaborationUtils.waitForSyncCycle( page2, 2, {
				timeout: 15000,
			} );

			await expect( getDownloadButtonField( page ) ).toHaveText(
				INITIAL_BUTTON_TEXT
			);
			await expect( getDownloadButtonField( page2 ) ).toHaveText(
				INITIAL_BUTTON_TEXT
			);

			await replaceFileViaMediaLibrary( {
				editor,
				page,
				targetMediaId: manual.id,
			} );
			await collaborationUtils.waitForSyncCycle( page, 2, {
				timeout: 15000,
			} );
			await collaborationUtils.waitForSyncCycle( page2, 2, {
				timeout: 15000,
			} );

			await expect
				.poll( () => readFileName( page ), { timeout: 10000 } )
				.toBe( TARGET_FILE_NAME );
			await expect
				.poll( () => readFileName( page2 ), { timeout: 10000 } )
				.toBe( TARGET_FILE_NAME );

			await editor.saveDraft();
			await collaborationUtils.waitForSyncCycle( page, 2, {
				timeout: 15000,
			} );
			await collaborationUtils.waitForSyncCycle( page2, 2, {
				timeout: 15000,
			} );
			await expect
				.poll( () => readFileName( page2 ), { timeout: 10000 } )
				.toBe( TARGET_FILE_NAME );
		} finally {
			await rm( tempDir, { force: true, recursive: true } );
		}
	} );
} );
