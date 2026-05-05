import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Result = {
	error?: string;
	finalBlockCount?: number;
	invalidNoticeCount?: number;
	notes: string[];
	persistedContentLength?: number;
	persistedTitle?: string;
	postId?: number;
	reproduced: boolean;
};

type RestPost = {
	content: { raw: string };
	title: { raw: string };
};

const OUTPUT_DIR = process.env.RTC_B60E_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954557 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 954557 step 3 user 1 paragraph 570976</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"><!-- wp:paragraph -->',
	'<p>Seed 954557 step 1 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954557 step 1 user 1 nested heading</h3>',
	'<!-- /wp:heading --></div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 954557 0</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-954557-3-0-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-954557-3-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-954557-3-0-end","buttonText":"Find rtc-save-search-option-marker-954557-3-0-end","buttonPosition":"button-inside"} /-->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page,
			requestUtils,
		} );

		await setCollaboration( requestUtils, true );
		await use( utils );
		await utils.teardown();
	},
	collaboratorUser: async (
		{ collaborationUtils, requestUtils },
		use,
		testInfo
	) => {
		const uniqueSuffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `b60e${ uniqueSuffix }`,
			email: `b60e+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: Result ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'result.json' ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	return collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	let searchBox = page.getByRole( 'searchbox', { name: 'Search' } );

	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', {
				name: 'Block Inserter',
				exact: true,
			} )
			.click();
		searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	}

	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
}

async function addCheckpoint(
	editor: Editor,
	page: Page,
	paragraphText: string,
	titleText: string
) {
	await appendParagraphAtEnd( editor, page, paragraphText );
	await insertBlockFromInserter( page, 'Search' );
	await typeTitle( editor, page, titleText );
	await editor.saveDraft();
}

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string,
	level: 3 | 4
) {
	const anchor = editor.canvas.getByText( anchorText, { exact: false } );
	await expect( anchor ).toBeVisible();
	await anchor.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect(
		page.locator( '.components-autocomplete__results[role="listbox"]' )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+${ level }` );
	await page.keyboard.type( headingText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function editParagraphText(
	editor: Editor,
	page: Page,
	oldText: string,
	newText: string
) {
	const paragraph = editor.canvas.getByText( oldText, { exact: false } );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( newText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function fetchPersistedPost(
	requestUtils: {
		rest: < T >( args: {
			path: string;
			params: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
) {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw,title.raw',
		},
	} );
}

test( 'seed-shaped real-user sequence does not obviously reproduce empty-body collapse', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );

	const result: Result = {
		notes: [],
		reproduced: false,
	};
	let caughtError: unknown;

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'rtc-save-title-marker-954557-3-0-end',
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );

		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'joined-collaborator-and-converged' );

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'reloaded-primary-and-resynced' );

		await insertHeadingAfterText(
			editor,
			page,
			'Seed 954557 step 3 user 1 paragraph 570976',
			'Seed 954557 step 5 user 0 heading',
			3
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'inserted-primary-heading-3' );

		await insertHeadingAfterText(
			collaboratorEditor,
			collaboratorPage,
			'Seed 954557 step 5 user 0 heading',
			'Seed 954557 step 6 user 1 heading',
			4
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'inserted-collaborator-heading-4' );

		await editParagraphText(
			editor,
			page,
			'Seed 954557 step 1 user 1 nested paragraph',
			'Seed 954557 step 7 user 0 nested paragraph'
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'edited-nested-paragraph' );

		await addCheckpoint(
			editor,
			page,
			'rtc-save-paragraph-marker-954557-7-0-end',
			'rtc-save-title-marker-954557-7-0-end'
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'saved-second-checkpoint' );

		await insertHeadingAfterText(
			collaboratorEditor,
			collaboratorPage,
			'rtc-save-paragraph-marker-954557-7-0-end',
			'Seed 954557 step 8 user 1 heading',
			3
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'inserted-step8-heading' );

		await appendParagraphAtEnd(
			editor,
			page,
			'Seed 954557 step 9 user 0 paragraph'
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'inserted-step9-paragraph' );

		await insertHeadingAfterText(
			collaboratorEditor,
			collaboratorPage,
			'Seed 954557 step 9 user 0 paragraph',
			'Seed 954557 step 10 user 1 heading',
			3
		);
		await waitForSessionReady( collaborationUtils );
		result.notes.push( 'inserted-step10-heading' );

		await editParagraphText(
			editor,
			page,
			'Seed 954557 step 9 user 0 paragraph',
			'Seed 954557 step 11 user 0 paragraph edited'
		);
		const finalState = await waitForSessionReady( collaborationUtils );
		result.finalBlockCount = finalState.blocks.length;

		const persisted = await fetchPersistedPost( requestUtils, post.id );
		result.persistedContentLength = persisted.content.raw.length;
		result.persistedTitle = persisted.title.raw;

		const invalidNoticeCount = await page
			.getByText( 'Block contains unexpected or invalid content.' )
			.count();
		result.invalidNoticeCount = invalidNoticeCount;

		if (
			finalState.blocks.length === 0 ||
			persisted.content.raw.trim() === ''
		) {
			result.reproduced = true;
		} else {
			result.notes.push( 'no-empty-body-or-zero-block-collapse-observed' );
		}
	} catch ( error ) {
		caughtError = error;
		result.error = formatError( error );
	} finally {
		writeResult( result );
	}

	if ( caughtError ) {
		throw caughtError;
	}
} );
