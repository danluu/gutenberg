/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import CollaborationUtils from './fixtures/collaboration-utils';

const OUTPUT_DIR = process.env.RTC_84C9_PASS177_OUTPUT_DIR;
const ANCHOR_TEXT = 'Shared editing target paragraph.';
const FIRST_PARAGRAPH = 'Seed 951507 baseline paragraph.';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ FIRST_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951507 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ANCHOR_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

async function waitForSessionReady(
	collaborationUtils: CollaborationUtils
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function focusParagraph( page: Page, editor: Editor, text: string ) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas.getByText( text, { exact: true } );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addParagraphAfterText(
	page: Page,
	editor: Editor,
	anchorText: string,
	marker: string
) {
	await focusParagraph( page, editor, anchorText );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.insertText( marker );
	await expect(
		editor.canvas.getByText( marker, { exact: true } )
	).toBeVisible();
}

async function deleteParagraphByText(
	page: Page,
	editor: Editor,
	marker: string
) {
	await focusParagraph( page, editor, marker );
	await openBlockOptions( page, editor );
	await page
		.getByRole( 'menu', { name: 'Options' } )
		.last()
		.getByRole( 'menuitem', { name: 'Delete' } )
		.click();
}

async function editParagraphByText(
	page: Page,
	editor: Editor,
	text: string,
	suffix: string
) {
	await focusParagraph( page, editor, text );
	await page.keyboard.press( 'End' );
	await page.keyboard.insertText( suffix );
}

async function captureJson(
	collaborationUtils: CollaborationUtils,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
	return {
		json: JSON.stringify( state ),
		state,
	};
}

function writeResult( result: Record< string, unknown > ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'stale-delete-repro.json' ),
		JSON.stringify( result, null, 2 )
	);
}

test.describe( 'RTC stale top-level delete reconciliation', () => {
	test( 'converges when one user deletes a recent remote paragraph while the remote user keeps editing', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const marker = `Seed 951507 pass177 collaborator paragraph ${ Date.now() }`;
		const staleEditSuffix = ' pass177 collaborator edit';
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC 84c9 pass177 stale delete',
		} );

		await collaborationUtils.openCollaborativeSession( post.id );
		const collaboratorPage = collaborationUtils.page2;
		const collaboratorEditor = collaborationUtils.editor2;
		await waitForSessionReady( collaborationUtils );

		await addParagraphAfterText(
			collaboratorPage,
			collaboratorEditor,
			ANCHOR_TEXT,
			marker
		);
		await waitForSessionReady( collaborationUtils );

		const [ primaryAfterInsert, secondaryAfterInsert ] = await Promise.all( [
			captureJson( collaborationUtils, page ),
			captureJson( collaborationUtils, collaboratorPage ),
		] );
		expect( primaryAfterInsert.json ).toContain( marker );
		expect( secondaryAfterInsert.json ).toContain( marker );

		await Promise.all( [
			deleteParagraphByText( page, editor, marker ),
			editParagraphByText(
				collaboratorPage,
				collaboratorEditor,
				FIRST_PARAGRAPH,
				staleEditSuffix
			),
		] );

		let convergenceError: string | null = null;
		try {
			await waitForSessionReady( collaborationUtils );
		} catch ( error ) {
			convergenceError =
				error instanceof Error ? error.message : String( error );
		}

		const [ primaryAfterDelete, secondaryAfterDelete ] = await Promise.all( [
			captureJson( collaborationUtils, page ),
			captureJson( collaborationUtils, collaboratorPage ),
		] );

		writeResult( {
			convergenceError,
			marker,
			postId: post.id,
			primaryAfterDelete: primaryAfterDelete.state,
			primaryAfterInsert: primaryAfterInsert.state,
			secondaryAfterDelete: secondaryAfterDelete.state,
			secondaryAfterInsert: secondaryAfterInsert.state,
			statesEqualAfterDelete:
				primaryAfterDelete.json === secondaryAfterDelete.json,
		} );

		expect( convergenceError ).toBeNull();
		expect( primaryAfterDelete.json ).toBe( secondaryAfterDelete.json );
		expect( primaryAfterDelete.json ).not.toContain( marker );
		expect( secondaryAfterDelete.json ).not.toContain( marker );
	} );
} );
