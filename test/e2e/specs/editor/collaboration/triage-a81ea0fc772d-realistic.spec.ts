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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	title: string;
};

type ScenarioName =
	| 'reload-remote-paragraph-then-move-paragraph-down'
	| 'reload-remote-paragraph-and-heading-then-move-paragraph-down';

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	primaryState?: NormalizedState;
	reproduced: boolean;
	secondaryState?: NormalizedState;
};

const OUTPUT_DIR = process.env.RTC_A81EA0FC772D_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TITLE = 'RTC a81ea0fc772d realistic move repro';
const STEP1_PARAGRAPH = 'Seed 952549 step 1 user 0 paragraph 175203';
const GROUP_NESTED = 'Seed 952549 step 4 user 1 nested paragraph';
const LIVE_HEADING = 'Seed 952549 step 10 user 1 heading';
const LIVE_PARAGRAPH = 'Seed 952549 step 5 user 1 concurrent paragraph 378473';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952549 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952549 step 0 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952549 step 0 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ GROUP_NESTED }</p>`,
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP1_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952549-1-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952549-1-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-952549-1-1-end","buttonText":"Find rtc-save-search-option-marker-952549-1-1-end","buttonPosition":"button-inside"} /-->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table><tbody>',
	'<tr><td>initial row 1 A seed 952549 step 8 user 0</td><td>initial row 1 B seed 952549 step 8 user 0</td></tr>',
	'<tr><td>initial row 2 A seed 952549 step 8 user 0</td><td>initial row 2 B seed 952549 step 8 user 0</td></tr>',
	'</tbody></table></figure>',
	'<!-- /wp:table -->',
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
			username: `rtca81e${ uniqueSuffix }`,
			email: `rtca81e+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function stateShowsArchivedCorruption( state: NormalizedState | undefined ) {
	if ( ! state ) {
		return false;
	}

	const serialized = JSON.stringify( state.blocks );
	return (
		serialized.includes(
			'"name":"core/group","attributes":{"content":"Seed 952549 step 1 user 0 paragraph 175203"'
		) ||
		serialized.includes(
			'"name":"core/heading","attributes":{"content":"Seed 952549 step 10 user 1 heading","level":3},"innerBlocks":[{"name":"core/paragraph"'
		) ||
		serialized.includes(
			'"name":"core/search","attributes":{"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-952549-1-1-end","buttonUseIcon":false,"content":"Emoji and multibyte'
		)
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
): Promise< NormalizedState > {
	return ( await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: false,
	} ) ) as NormalizedState;
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
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function chooseMenuItem(
	page: Page,
	preferred: string,
	fallback: string
) {
	const preferredItem = page.getByRole( 'menuitem', { name: preferred } );
	if ( await preferredItem.isVisible().catch( () => false ) ) {
		await preferredItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: fallback } ).click();
}

async function insertParagraphAfterText(
	page: Page,
	editor: Editor,
	anchorText: string,
	paragraphText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function insertHeadingAfterText(
	page: Page,
	editor: Editor,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( headingText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function moveParagraphDownTwice(
	page: Page,
	editor: Editor,
	text: string
) {
	await clickBlockByText( editor, page, text );
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );

	for ( let attempt = 0; attempt < 2; attempt++ ) {
		await expect( moveDownButton ).toBeEnabled();
		await moveDownButton.click();
	}
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: ScenarioName;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario,
		reproduced: false,
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );

		await insertParagraphAfterText(
			collaboratorPage,
			collaboratorEditor,
			'Emoji and multibyte',
			LIVE_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );

		if (
			scenario ===
			'reload-remote-paragraph-and-heading-then-move-paragraph-down'
		) {
			await insertHeadingAfterText(
				collaboratorPage,
				collaboratorEditor,
				LIVE_PARAGRAPH,
				LIVE_HEADING
			);
			await waitForSessionReady( collaborationUtils );
		}

		await moveParagraphDownTwice(
			page,
			primaryEditor,
			STEP1_PARAGRAPH
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.primaryState = await captureState( collaborationUtils, page );
		result.secondaryState = await captureState(
			collaborationUtils,
			collaboratorPage
		);
		result.reproduced =
			stateShowsArchivedCorruption( result.primaryState ) ||
			stateShowsArchivedCorruption( result.secondaryState );
	} catch ( error ) {
		result.error = formatError( error );
	} finally {
		writeScenarioResult( result );
	}

	return result;
}

for ( const scenario of [
	'reload-remote-paragraph-then-move-paragraph-down',
	'reload-remote-paragraph-and-heading-then-move-paragraph-down',
] as const ) {
	test( scenario, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
			scenario,
		} );

		expect( result.error ).toBeUndefined();
		expect( result.reproduced ).toBe( false );
	} );
}
