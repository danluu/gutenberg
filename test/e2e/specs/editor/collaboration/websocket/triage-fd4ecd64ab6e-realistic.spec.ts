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
} from '../fixtures/collaboration-utils';

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
	states: unknown[] | null;
};

type Scenario = {
	name: string;
	saveAndReloadBeforePrepend: boolean;
	waitForFullConvergenceBeforeEdit: boolean;
};

const RESULT_DIR = process.env.RTC_REMOTE_PREPEND_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC realistic prepend-edit checkpoint paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 950891 step 3 user 1</td><td>initial row 1 B seed 950891 step 3 user 1</td></tr><tr><td>initial row 2 A seed 950891 step 3 user 1</td><td>initial row 2 B seed 950891 step 3 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'wait-row-visible-only',
		saveAndReloadBeforePrepend: false,
		waitForFullConvergenceBeforeEdit: false,
	},
	{
		name: 'wait-full-convergence',
		saveAndReloadBeforePrepend: false,
		waitForFullConvergenceBeforeEdit: true,
	},
	{
		name: 'save-and-reload-before-prepend',
		saveAndReloadBeforePrepend: true,
		waitForFullConvergenceBeforeEdit: true,
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
			username: `rtcrem${ uniqueSuffix }`,
			email: `rtcrem+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'RemotePrepend',
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
	await expect( cells.first() ).toBeVisible();
	await cells.first().click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Insert row before' } ).click();
	await expect( cells ).toHaveCount( originalCount + 2 );
	await cells.first().click();
	await page.keyboard.type( firstCellText );
	await cells.nth( 1 ).click();
	await page.keyboard.type( secondCellText );
}

async function editRowFirstCellBySecondCellText(
	editor: Editor,
	page: Page,
	secondCellText: string,
	text: string
) {
	const row = editor.canvas
		.locator( 'tbody tr' )
		.filter( { hasText: secondCellText } )
		.first();
	await expect( row ).toBeVisible();
	const cell = row.getByRole( 'textbox', { name: 'Body cell text' } ).first();
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

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	return Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
	] );
}

test.describe( 'RTC triage fd4ecd64ab6e realistic remote prepend edit search', () => {
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
					title: `RTC realistic remote prepend ${ Date.now() }-${ attempt }`,
					status: 'draft',
					content: INITIAL_CONTENT,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				if ( scenario.saveAndReloadBeforePrepend ) {
					await setTitle(
						editor,
						page,
						`rtc-save-title-marker-950891-8-1-end realistic ${ scenario.name } ${ attempt }`
					);
					await waitForSessionReady( collaborationUtils );
					await editor.saveDraft();
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
					await reloadCollaborator(
						collaborationUtils,
						collaboratorPage
					);
				}

				await prependRowAtStart(
					editor,
					page,
					'table-option-950891-9-0-3',
					'table-option-950891-9-0-3 sibling'
				);

				if ( scenario.waitForFullConvergenceBeforeEdit ) {
					await waitForSessionReady( collaborationUtils );
				} else {
					const collaboratorCells = collaboratorEditor.canvas.getByRole(
						'textbox',
						{ name: 'Body cell text' }
					);
					await expect( collaboratorCells ).toHaveCount( 6 );
					await expect(
						collaboratorEditor.canvas
							.locator( 'tbody tr' )
							.filter( {
								hasText: 'table-option-950891-9-0-3 sibling',
							} )
							.first()
					).toBeVisible();
				}

				await editRowFirstCellBySecondCellText(
					collaboratorEditor,
					collaboratorPage,
					'table-option-950891-9-0-3 sibling',
					'table-option-950891-10-1-0'
				);

				let convergenceError: string | null = null;
				let states: unknown[] | null = null;
				try {
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
					states = await getStates( collaborationUtils );
				}

				if ( ! states ) {
					states = await getStates( collaborationUtils );
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
					states,
				} );
			} );
		}
	}
} );
