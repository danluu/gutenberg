import fs from 'fs';
import path from 'path';

import type { Browser, BrowserContext, Page } from '@playwright/test';
import {
	test as base,
	expect,
	Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	primaryBlocks: string[];
	reproduced: boolean;
	scenarioId: string;
	secondaryBlocks: string[];
};

type Scenario = {
	id: string;
	waitAfterMove: boolean;
};

const OUTPUT_DIR = process.env.RTC_CFC514_RESULT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 951640 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951640 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const BASELINE = 'Seed 951640 baseline paragraph.';
const SECOND = 'Seed 951640 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';
const TAIL = 'rtc-cfc514-tail-italic';
const ADMIN_USER = {
	username: process.env.WP_USERNAME ?? 'admin',
	password: process.env.WP_PASSWORD ?? 'password',
};
const SCENARIOS: Scenario[] = [
	{
		id: 'sequential-shared-up-then-delete-second',
		waitAfterMove: true,
	},
	{
		id: 'burst-shared-up-then-delete-second',
		waitAfterMove: false,
	},
];

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
			username: `rtccfc${ uniqueSuffix }`,
			email: `rtccfc+${ uniqueSuffix }@example.com`,
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

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function openPostInFreshContext( {
	browser,
	postId,
	user,
}: {
	browser: Browser;
	postId: number;
	user: {
		password: string;
		username: string;
	};
} ): Promise< {
	context: BrowserContext;
	editor: Editor;
	page: Page;
} > {
	const context = await browser.newContext( {
		baseURL: process.env.WP_BASE_URL,
		storageState: { cookies: [], origins: [] },
	} );
	const freshPage = await context.newPage();
	const freshEditor = new Editor( { page: freshPage } );

	await freshPage.goto( '/wp-login.php' );
	await freshPage.locator( '#user_login' ).fill( user.username );
	await freshPage.locator( '#user_pass' ).fill( user.password );
	await freshPage.getByRole( 'button', { name: 'Log In' } ).click();
	await freshPage.waitForURL( '**/wp-admin/**' );
	await freshPage.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await freshPage.waitForFunction(
		() => window?.wp?.data && window?.wp?.blocks,
		undefined,
		{ timeout: 30000 }
	);
	await freshEditor.setPreferences( 'core/edit-post', {
		welcomeGuide: false,
		fullscreenMode: false,
	} );

	return {
		context,
		editor: freshEditor,
		page: freshPage,
	};
}

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( paragraph ).toBeVisible();
	const bounds = await paragraph.boundingBox();
	if ( ! bounds ) {
		throw new Error( `No bounding box found for paragraph: ${ text }` );
	}
	await page.mouse.click(
		bounds.x + Math.min( bounds.width - 12, 180 ),
		bounds.y + Math.min( bounds.height - 8, 24 )
	);
}

async function openBlockOptionsMenu( page: Page ) {
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addBlockRelative(
	page: Page,
	editor: Editor,
	position: 'before' | 'after'
) {
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	const preferredName = position === 'before' ? 'Add before' : 'Add after';
	const fallbackName = position === 'before' ? 'Insert before' : 'Insert after';
	const preferredItem = page.getByRole( 'menuitem', {
		name: preferredName,
	} );
	if ( await preferredItem.isVisible().catch( () => false ) ) {
		await preferredItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: fallbackName } ).click();
	}
}

function getExpectedTailContent( marker: string ) {
	return `<em>italic</em> ${ marker }`;
}

async function insertTailParagraphAfterShared(
	editor: Editor,
	page: Page,
	marker: string
) {
	await page.bringToFront();
	await clickParagraphByText( editor, page, SHARED );
	await addBlockRelative( page, editor, 'after' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'italic', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( ` ${ marker }`, { delay: 20 } );
	await expect(
		editor.canvas.getByText( marker, { exact: false } )
	).toBeVisible();
}

async function moveParagraphToTop(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clickParagraphByText( editor, page, text );
	await editor.showBlockToolbar();
	const moveUp = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } );
	await moveUp.click();
	await moveUp.click();
}

async function deleteParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clickParagraphByText( editor, page, text );
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await page.keyboard.press( 'Backspace' );
}

async function getParagraphs(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page );
	return state.blocks
		.filter(
			( block ): block is {
				attributes: {
					content?: string;
				};
				name: string;
			} => block.name === 'core/paragraph'
		)
		.map( ( block ) => block.attributes.content ?? '' );
}

async function expectInitialParagraphs(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	await expect( await getParagraphs( collaborationUtils, page ) ).toEqual( [
		BASELINE,
		SECOND,
		SHARED,
	] );
}

test.describe( 'RTC triage cfc514d1e7f6 realistic move then delete second', () => {
	for ( const scenario of SCENARIOS ) {
		for ( const attempt of [ 0, 1, 2, 3 ] ) {
			test( `${ scenario.id } attempt ${ attempt }`, async ( {
				admin,
				collaborationUtils,
				collaboratorUser,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const marker = `${ TAIL }-${ scenario.id }-${ attempt }`;
				const expectedTail = getExpectedTailContent( marker );
				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC cfc514 realistic ${ scenario.id } ${ attempt }`,
				} );

				const primarySession = await openPostInFreshContext( {
					browser: admin.browser,
					postId: post.id,
					user: ADMIN_USER,
				} );
				collaborationUtils.primaryPage = primarySession.page;
				collaborationUtils.editor = primarySession.editor;

				try {
					const {
						editor: collaboratorEditor,
						page: collaboratorPage,
					} = await collaborationUtils.joinUser( post.id, collaboratorUser );
					await waitForSessionReady( collaborationUtils );
					await Promise.all( [
						expectInitialParagraphs( collaborationUtils, primarySession.page ),
						expectInitialParagraphs( collaborationUtils, collaboratorPage ),
					] );

					await insertTailParagraphAfterShared(
						primarySession.editor,
						primarySession.page,
						marker
					);
					await waitForSessionReady( collaborationUtils );

					await moveParagraphToTop(
						collaboratorEditor,
						collaboratorPage,
						SHARED
					);

					if ( scenario.waitAfterMove ) {
						await waitForSessionReady( collaborationUtils );
					}

					await deleteParagraphByText(
						primarySession.editor,
						primarySession.page,
						SECOND
					);

					let convergenceError: string | null = null;
					try {
						await waitForSessionReady( collaborationUtils );
					} catch ( error ) {
						convergenceError =
							error instanceof Error ? error.message : String( error );
					}

					const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
						getParagraphs( collaborationUtils, primarySession.page ),
						getParagraphs( collaborationUtils, collaboratorPage ),
					] );

					const result: AttemptResult = {
						attempt,
						convergenceError,
						primaryBlocks,
						reproduced:
							convergenceError !== null ||
							primaryBlocks.join( '\n' ) !==
								secondaryBlocks.join( '\n' ) ||
							primaryBlocks.includes( SECOND ) !==
								secondaryBlocks.includes( SECOND ),
						scenarioId: scenario.id,
						secondaryBlocks,
					};
					writeAttemptResult( result );

					expect( result.reproduced ).toBe( false );
					expect( primaryBlocks ).toEqual( [
						SHARED,
						BASELINE,
						expectedTail,
					] );
					expect( secondaryBlocks ).toEqual( primaryBlocks );
				} finally {
					await primarySession.context.close();
				}
			} );
		}
	}
} );
