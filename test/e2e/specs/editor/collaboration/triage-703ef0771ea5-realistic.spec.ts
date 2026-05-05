import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	collaboratorRows: string[][];
	convergenceError: string | null;
	primaryRows: string[][];
	scenario: string;
};

type Scenario = {
	name: string;
	reloadCollaboratorAfterSave: boolean;
	saveCheckpoint: boolean;
};

const RESULT_DIR = process.env.RTC_ROW_PREPEND_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC realistic stale-local checkpoint paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 950885 step 5 user 1</td><td>initial row 1 B seed 950885 step 5 user 1</td></tr><tr><td>initial row 2 A seed 950885 step 5 user 1</td><td>initial row 2 B seed 950885 step 5 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'title-checkpoint-no-save',
		reloadCollaboratorAfterSave: false,
		saveCheckpoint: false,
	},
	{
		name: 'title-checkpoint-save-and-reload',
		reloadCollaboratorAfterSave: true,
		saveCheckpoint: true,
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
			username: `rtcpre${ uniqueSuffix }`,
			email: `rtcpre+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Prepend',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: AttemptResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			RESULT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function appendRowAtEnd(
	editor: Editor,
	page: Page,
	firstCellText: string,
	secondCellText: string
) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	const originalCount = await cells.count();
	await cells.nth( originalCount - 1 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row after' } ).click();
	await expect( cells ).toHaveCount( originalCount + 2 );
	await cells.nth( originalCount ).click();
	await page.keyboard.type( firstCellText );
	await cells.nth( originalCount + 1 ).click();
	await page.keyboard.type( secondCellText );
}

async function prependRowAtStart(
	editor: Editor,
	page: Page,
	firstCellText: string,
	secondCellText: string
) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	const originalCount = await cells.count();
	await cells.first().click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row before' } ).click();
	await expect( cells ).toHaveCount( originalCount + 2 );
	await cells.first().click();
	await page.keyboard.type( firstCellText );
	await cells.nth( 1 ).click();
	await page.keyboard.type( secondCellText );
}

async function deleteSecondRow( editor: Editor, page: Page ) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells ).toHaveCount( 6 );
	await cells.nth( 2 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Delete row' } ).click();
}

async function editRowSecondCellByFirstCellText(
	editor: Editor,
	page: Page,
	firstCellText: string,
	text: string
) {
	const row = editor.canvas
		.locator( 'tbody tr' )
		.filter( { hasText: firstCellText } )
		.first();
	await expect( row ).toBeVisible();
	const cell = row.getByRole( 'textbox', { name: 'Body cell text' } ).nth( 1 );
	await cell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
}

async function setTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

async function reloadCollaborator(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function getTableRows( editor: Editor ) {
	return editor.canvas.locator( 'tbody tr' ).evaluateAll( ( rows ) =>
		rows.map( ( row ) =>
			Array.from( row.querySelectorAll( 'td' ), ( cell ) =>
				( cell.textContent ?? '' ).trim()
			)
		)
	);
}

test.describe( 'RTC triage 703ef0771ea5 realistic stale-local prepend search', () => {
	for ( const scenario of SCENARIOS ) {
		for ( const attempt of [ 0, 1 ] ) {
			test( `${ scenario.name } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				const post = await requestUtils.createPost( {
					title: `RTC realistic prepend ${ Date.now() }-${ attempt }`,
					status: 'draft',
					content: INITIAL_CONTENT,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				await appendRowAtEnd(
					editor,
					page,
					'table-option-950885-6-0-2',
					'table-option-950885-6-0-2 sibling'
				);
				await waitForSessionReady( collaborationUtils );

				await deleteSecondRow( collaboratorEditor, collaboratorPage );
				await waitForSessionReady( collaborationUtils );

				await setTitle(
					editor,
					page,
					`rtc-save-title-marker-950885-8-0-end realistic ${ scenario.name } ${ attempt }`
				);
				await waitForSessionReady( collaborationUtils );

				if ( scenario.saveCheckpoint ) {
					await editor.saveDraft();
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
					if ( scenario.reloadCollaboratorAfterSave ) {
						await reloadCollaborator(
							collaborationUtils,
							collaboratorPage
						);
					}
				}

				await appendRowAtEnd(
					collaboratorEditor,
					collaboratorPage,
					'table-option-950885-9-1-2',
					'table-option-950885-9-1-2 sibling'
				);
				await waitForSessionReady( collaborationUtils );
				await prependRowAtStart(
					collaboratorEditor,
					collaboratorPage,
					'table-option-950885-10-1-3',
					'table-option-950885-10-1-3 sibling'
				);
				await waitForSessionReady( collaborationUtils );

				await editRowSecondCellByFirstCellText(
					editor,
					page,
					'table-option-950885-9-1-2',
					'table-option-950885-11-0-1'
				);

				let convergenceError: string | null = null;
				try {
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryRows, collaboratorRows ] = await Promise.all( [
					getTableRows( editor ),
					getTableRows( collaboratorEditor ),
				] );
				writeResult( {
					attempt,
					collaboratorRows,
					convergenceError,
					primaryRows,
					scenario: scenario.name,
				} );
			} );
		}
	}
} );
