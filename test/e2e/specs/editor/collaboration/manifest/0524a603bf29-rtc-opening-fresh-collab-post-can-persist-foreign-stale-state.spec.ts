import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioResult = {
	afterOpenStates?: unknown[];
	beforeSaveStates?: unknown[];
	afterReloadStates?: unknown[];
	afterSaveStates?: unknown[];
	afterMoveStates?: unknown[];
	error?: string;
	persistedAfterOpen?: {
		content: string;
		title: string;
	};
	postId?: number;
	reproduced: boolean;
	reproducedReason?: string;
};

const RESULT_DIR = process.env.RTC_0524_REPRO_DIR;
const STOP_AFTER_OPEN = process.env.RTC_0524_STOP_AFTER_OPEN === '1';
const ASSERT_OPEN_EXPECTED =
	process.env.RTC_0524_ASSERT_OPEN_EXPECTED === '1';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 951569 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
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
			username: `rtc0524${ uniqueSuffix }`,
			email: `rtc0524+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ScenarioResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, 'realistic-result.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	return Promise.all(
		collaborationUtils.allPages.map( ( sessionPage ) =>
			collaborationUtils.getNormalizedPostState( sessionPage, {
				includeCrdtDocument: true,
			} )
		)
	);
}

async function getPersistedPostState( requestUtils: any, postId: number ) {
	const persistedPost = await requestUtils.rest( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
		},
	} );

	return {
		content: persistedPost.content?.raw ?? '',
		title: persistedPost.title?.raw ?? '',
	};
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function insertSearchBlockAtEnd( editor: Editor, page: Page ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function typeSearchLabel(
	editor: Editor,
	page: Page,
	label: string
) {
	const labelField = editor.canvas
		.getByRole( 'textbox', { name: 'Label text' } )
		.last();
	await labelField.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( label );
	await expect( labelField ).toContainText( label );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

async function saveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled( { timeout: 20000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20000 } );
}

async function moveSelectedBlockDownOnce( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDownButton ).toBeEnabled( { timeout: 20000 } );
	await moveDownButton.click();
}

test.describe.configure( { mode: 'serial' } );

test( '0524 realistic repro attempt', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result: ScenarioResult = {
		reproduced: false,
	};
	const appendedParagraph = `Seed 951569 step 1 user 0 paragraph ${ Date.now() }`;
	const checkpointMarker = `rtc-save-paragraph-marker-951569-1-0-end`;
	const searchLabel = `Search label rtc-save-search-option-marker-951569-1-0-end`;
	const title = `rtc-save-title-marker-951569-1-0-end`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC 0524 realistic repro',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );
		result.afterOpenStates = await getStates( collaborationUtils );
		result.persistedAfterOpen = await getPersistedPostState(
			requestUtils,
			post.id
		);
		if ( STOP_AFTER_OPEN ) {
			if ( ASSERT_OPEN_EXPECTED ) {
				const expectedTitle = 'RTC 0524 realistic repro';
				const expectedFirstHeading = 'Seed 951569 multibyte heading';
				const matchesExpected = result.afterOpenStates.every(
					( state: any ) =>
						state?.title === expectedTitle &&
						state?.blocks?.[ 0 ]?.attributes?.content ===
							expectedFirstHeading
				);
				if (
					! matchesExpected ||
					result.persistedAfterOpen.title !== expectedTitle ||
					! result.persistedAfterOpen.content.includes(
						expectedFirstHeading
					)
				) {
					result.reproduced = true;
					result.reproducedReason =
						'Opening a fresh collaborative post replaced its visible and persisted state with a stale foreign RTC document.';
					writeResult( result );
					throw new Error(
						`Opening a fresh collaborative post replaced it with stale state: ${ JSON.stringify(
							{
								afterOpenStates: result.afterOpenStates,
								persistedAfterOpen:
									result.persistedAfterOpen,
							}
						) }`
					);
				}
			}
			writeResult( result );
			return;
		}

		await appendParagraphAtEnd( editor, page, appendedParagraph );
		await appendParagraphAtEnd( editor, page, checkpointMarker );
		await insertSearchBlockAtEnd( editor, page );
		await typeSearchLabel( editor, page, searchLabel );
		await typeTitle( editor, page, title );
		await waitForSessionReady( collaborationUtils );
		result.beforeSaveStates = await getStates( collaborationUtils );
		await saveDraft( page );
		await waitForSessionReady( collaborationUtils );
		result.afterSaveStates = await getStates( collaborationUtils );

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 20000,
			}
		);
		await waitForSessionReady( collaborationUtils );
		result.afterReloadStates = await getStates( collaborationUtils );

		await clickBlockByText(
			editor,
			page,
			'Emoji and multibyte: hi'
		);
		for ( let moveCount = 0; moveCount < 4; moveCount++ ) {
			await moveSelectedBlockDownOnce( page, editor );
		}

		await waitForSessionReady( collaborationUtils );
		result.afterMoveStates = await getStates( collaborationUtils );
		writeResult( result );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.afterMoveStates = await getStates( collaborationUtils );
		} catch {}
		if (
			result.error?.includes( 'Collaborative state did not converge within' )
		) {
			result.reproduced = true;
			result.reproducedReason =
				'After save, collaborator reload, and moving the emoji paragraph downward, the collaborative editors no longer converged.';
		}
		writeResult( result );
		throw error;
	}
} );
