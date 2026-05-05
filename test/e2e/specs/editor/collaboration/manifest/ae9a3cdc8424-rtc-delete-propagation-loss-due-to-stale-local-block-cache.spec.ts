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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	crdtDocument?: string | null;
	title: string;
};

type AttemptResult = {
	attempt: number;
	collaboratorHasHeading?: boolean;
	convergenceError?: string | null;
	error?: string;
	postId?: number;
	primaryHasHeading?: boolean;
	primaryState?: NormalizedState | null;
	reproduced: boolean;
	scenario: string;
	secondaryState?: NormalizedState | null;
};

type Scenario = {
	id: string;
	reloadCollaborator: boolean;
};

const OUTPUT_DIR = process.env.RTC_AE9A_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_AE9A_ATTEMPTS ?? '3', 10 );

const INSERTED_HEADING = 'Seed 952537 step 2 user 1 heading';
const APPENDED_PARAGRAPH = 'Seed 952537 step 0 user 1 paragraph 163197';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-952537-1-0-end';
const TITLE_MARKER = 'rtc-save-title-marker-952537-1-0-end';
const SEARCH_MARKER = 'rtc-save-search-option-marker-952537-1-0-end';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952537 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ APPENDED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-952537-1-0-end","label":"Search label rtc-save-search-option-marker-952537-1-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-952537-1-0-end"} /-->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		id: 'checkpoint-state-no-reload',
		reloadCollaborator: false,
	},
	{
		id: 'checkpoint-state-reload-collaborator',
		reloadCollaborator: true,
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
			username: `rtcae9a${ uniqueSuffix }`,
			email: `rtcae9a+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `${ result.scenario }-attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function blocksContainText( state: NormalizedState | null | undefined, text: string ) {
	return JSON.stringify( state?.blocks ?? [] ).includes( text );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
): Promise< NormalizedState > {
	return ( await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
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

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function deleteBlockByText( editor: Editor, page: Page, text: string ) {
	await clickBlockByText( editor, page, text );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE_MARKER } realistic ${ scenario.id } ${ attempt }`,
	} );

	const result: AttemptResult = {
		attempt,
		postId: post.id,
		reproduced: false,
		scenario: scenario.id,
	};

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );

		if ( scenario.reloadCollaborator ) {
			await reloadAndWait( collaboratorPage, collaborationUtils );
		}

		await insertHeadingAfterText(
			collaboratorEditor,
			collaboratorPage,
			CHECKPOINT_PARAGRAPH,
			INSERTED_HEADING
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		await expect(
			primaryEditor.canvas.getByText( INSERTED_HEADING, { exact: false } )
		).toBeVisible( { timeout: 20000 } );

		await deleteBlockByText( primaryEditor, page, INSERTED_HEADING );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.message : String( error );
		}

		result.primaryState = await captureState( collaborationUtils, page );
		result.secondaryState = await captureState(
			collaborationUtils,
			collaboratorPage
		);
		result.primaryHasHeading = blocksContainText(
			result.primaryState,
			INSERTED_HEADING
		);
		result.collaboratorHasHeading = blocksContainText(
			result.secondaryState,
			INSERTED_HEADING
		);
		result.reproduced =
			!! result.convergenceError &&
			result.primaryHasHeading === false &&
			result.collaboratorHasHeading === true &&
			blocksContainText( result.primaryState, SEARCH_MARKER ) &&
			blocksContainText( result.secondaryState, SEARCH_MARKER );
		return result;
	} catch ( error ) {
		result.error = error instanceof Error ? error.stack ?? error.message : String( error );
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				scenario,
			} );

			writeAttemptResult( result );
			expect( result.error ).toBeUndefined();
		} );
	}
}
