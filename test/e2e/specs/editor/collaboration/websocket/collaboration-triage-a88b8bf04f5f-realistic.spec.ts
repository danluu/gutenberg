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
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Scenario = {
	name: string;
	reloadViewerBeforeEdits: boolean;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_A88B_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_TITLE = 'rtc-save-title-marker-953559-4-0-end';
const NEXT_TITLE = 'rtc-save-title-marker-953559-9-0-end';
const ANCHOR_PARAGRAPH = 'Seed 953559 step 7 user 0 paragraph 93081';
const NEXT_PARAGRAPH = 'rtc-save-paragraph-marker-953559-9-0-end';

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953559 step 2 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953559 step 2 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953559 step 0 user 0 paragraph 550407</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953559 step 3 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953559 step 3 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953559-4-0-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953559 step 6 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953559 step 6 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953559-4-0-end","label":"Search label rtc-save-search-option-marker-953559-4-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953559-4-0-end","showLabel":true} /-->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ ANCHOR_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'exact-state-direct',
		reloadViewerBeforeEdits: false,
	},
	{
		name: 'exact-state-after-viewer-reload',
		reloadViewerBeforeEdits: true,
	},
];

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
			username: `rtca88b${ uniqueSuffix }`,
			email: `rtca88b+${ uniqueSuffix }@example.com`,
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

function stateContainsParagraph( state: unknown, text: string ) {
	const blocks = ( state as { blocks?: Array< any > } )?.blocks ?? [];
	return blocks.some(
		( block ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === text
	);
}

function stateContainsTitle( state: unknown, text: string ) {
	return ( state as { title?: string } )?.title === text;
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		secondaryState,
	};
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clearAndType(
	page: Page,
	locator: any,
	text: string
) {
	await expect( locator ).toBeVisible();
	await locator.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( text, { delay: 15 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function clickMenuItem( page: Page, names: string[] ) {
	for ( const name of names ) {
		const item = page.getByRole( 'menuitem', { name } );
		if ( await item.isVisible().catch( () => false ) ) {
			await item.click();
			return;
		}
	}

	throw new Error( `None of the menu items were visible: ${ names.join( ', ' ) }` );
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	title: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await clearAndType( page, titleBox, title );
	await expect( titleBox ).toContainText( title );
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( anchorText, { exact: false } ).first().click();
	await openBlockOptions( page, editor );
	await clickMenuItem( page, [ 'Add after', 'Insert after' ] );
	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function reloadViewerAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload();
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function runScenario( {
	adminEditor,
	adminPage,
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	adminEditor: Editor;
	adminPage: Page;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: PRESEEDED_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: INITIAL_TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		if ( scenario.reloadViewerBeforeEdits ) {
			await reloadViewerAndWait( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-viewer-reload' )
			);
		}

		await adminPage.bringToFront();
		await typePostTitle( adminEditor, adminPage, NEXT_TITLE );
		await insertParagraphAfterText(
			adminEditor,
			adminPage,
			ANCHOR_PARAGRAPH,
			NEXT_PARAGRAPH
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-actions' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		const primaryHasTitle = stateContainsTitle(
			finalSnapshot.primaryState,
			NEXT_TITLE
		);
		const secondaryHasTitle = stateContainsTitle(
			finalSnapshot.secondaryState,
			NEXT_TITLE
		);
		const primaryHasParagraph = stateContainsParagraph(
			finalSnapshot.primaryState,
			NEXT_PARAGRAPH
		);
		const secondaryHasParagraph = stateContainsParagraph(
			finalSnapshot.secondaryState,
			NEXT_PARAGRAPH
		);

		result.reproduced =
			primaryHasTitle &&
			secondaryHasTitle &&
			( ! primaryHasParagraph || ! secondaryHasParagraph );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe( 'RTC triage a88b8bf04f5f realistic repro search', () => {
	test.describe.configure( { mode: 'serial' } );

	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const result = await runScenario( {
				adminEditor: editor,
				adminPage: page,
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );
			expect( result.postId ).toBeDefined();
		} );
	}
} );
