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

type Scenario = {
	insertMode: 'formatted' | 'plain';
	name: string;
	targetVisibleText: string;
};

type ScenarioResult = {
	error?: string;
	name: string;
	postId?: number;
	primaryState?: NormalizedState;
	reproduced: boolean;
	secondaryState?: NormalizedState;
	targetPresentAfterDelete?: {
		primary: boolean;
		secondary: boolean;
	};
};

const OUTPUT_DIR = process.env.RTC_A35026_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953437 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"><div class="wp-block-group__inner-container">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953437 step 3 user 1 updated paragraph 410660</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953437 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953437 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div></div>',
	'<!-- /wp:group -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953437 step 1 user 1</td><td>initial row 1 B seed 953437 step 1 user 1</td></tr><tr><td>initial row 2 A seed 953437 step 1 user 1</td><td>initial row 2 B seed 953437 step 1 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'plain-after-group-table-then-remote-delete',
		insertMode: 'plain',
		targetVisibleText: 'rtc a35026 plain marker',
	},
	{
		name: 'formatted-after-group-table-then-remote-delete',
		insertMode: 'formatted',
		targetVisibleText: 'italic',
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
			username: `rtca35026${ uniqueSuffix }`,
			email: `rtca35026+${ uniqueSuffix }@example.com`,
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

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout,
	} );
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
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
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

async function addParagraphAfterTable(
	editor: Editor,
	page: Page,
	insertMode: Scenario['insertMode']
) {
	await clickBlockByText(
		editor,
		page,
		'initial row 2 B seed 953437 step 1 user 1'
	);
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );

	if ( insertMode === 'plain' ) {
		await page.keyboard.type( 'rtc a35026 plain marker', { delay: 15 } );
		await expect(
			editor.canvas.getByText( 'rtc a35026 plain marker', {
				exact: false,
			} )
		).toBeVisible();
		return;
	}

	await page.keyboard.press( `${ MODIFIER_KEY }+i` );
	await page.keyboard.type( 'italic', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+i` );
	await page.keyboard.press( `${ MODIFIER_KEY }+b` );
	await page.keyboard.type( 'beta', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+b` );
	await expect(
		editor.canvas.getByText( 'italic', { exact: false } )
	).toBeVisible();
	await expect(
		editor.canvas.getByText( 'beta', { exact: false } )
	).toBeVisible();
}

async function deleteParagraphByVisibleText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickBlockByText( editor, page, text );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

function topLevelTextPresent(
	state: NormalizedState | undefined,
	text: string
): boolean {
	if ( ! state ) {
		return false;
	}

	return JSON.stringify( state.blocks ).includes( text );
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result: ScenarioResult = {
			name: scenario.name,
			reproduced: false,
		};

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC a35026 realistic ${ scenario.name }`,
		} );
		result.postId = post.id;

		try {
			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await addParagraphAfterTable( editor, page, scenario.insertMode );
			await waitForSessionReady( collaborationUtils );

			await deleteParagraphByVisibleText(
				collaboratorEditor,
				collaboratorPage,
				scenario.targetVisibleText
			);

			try {
				await waitForSessionReady( collaborationUtils );
			} catch ( error ) {
				result.error =
					error instanceof Error ? error.stack ?? error.message : String( error );
			}

			result.primaryState = await captureState( collaborationUtils, page );
			result.secondaryState = await captureState(
				collaborationUtils,
				collaboratorPage
			);
			result.targetPresentAfterDelete = {
				primary: topLevelTextPresent(
					result.primaryState,
					scenario.targetVisibleText
				),
				secondary: topLevelTextPresent(
					result.secondaryState,
					scenario.targetVisibleText
				),
			};
			result.reproduced = Boolean(
				result.error ||
					result.targetPresentAfterDelete.primary ||
					result.targetPresentAfterDelete.secondary ||
					JSON.stringify( result.primaryState?.blocks ?? [] ) !==
						JSON.stringify( result.secondaryState?.blocks ?? [] )
			);
			writeScenarioResult( result );

			expect( result.reproduced ).toBe( false );
		} catch ( error ) {
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			try {
				result.primaryState = await captureState( collaborationUtils, page );
			} catch {}
			writeScenarioResult( result );
			throw error;
		}
	} );
}
