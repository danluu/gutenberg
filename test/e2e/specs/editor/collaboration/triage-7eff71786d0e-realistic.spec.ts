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
	convergenceError: null | string;
	name: string;
	primaryRows: string[][];
};

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
			username: `rtc7eff${ uniqueSuffix }`,
			email: `rtc7eff+${ uniqueSuffix }@example.com`,
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

const RESULT_DIR = process.env.RTC_7EFF71786D0E_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const SINGLE_ROW_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Remote cell edit before local append.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

const TWO_ROW_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Delete row then remote cell edit before local append.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr><tr><td>initial row 2 A</td><td>initial row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

function writeResult( result: AttemptResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			RESULT_DIR,
			`${ result.name }-attempt-${ result.attempt }.json`
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

async function getTableRows( editor: Editor ) {
	return editor.canvas
		.locator( 'tbody tr' )
		.evaluateAll( ( rows ) =>
			rows.map( ( row ) =>
				Array.from( row.querySelectorAll( 'td' ), ( cell ) =>
					( cell.textContent ?? '' ).trim()
				)
			)
		);
}

async function editLastCell( editor: Editor, page: Page, text: string ) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	const target = cells.nth( ( await cells.count() ) - 1 );
	await expect( target ).toBeVisible();
	await target.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text, { delay: 20 } );
	await expect( target ).toHaveText( text );
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
	await page.keyboard.type( firstCellText, { delay: 20 } );
	await cells.nth( originalCount + 1 ).click();
	await page.keyboard.type( secondCellText, { delay: 20 } );
}

async function deleteSecondRow( editor: Editor, page: Page ) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells ).toHaveCount( 4 );
	await cells.nth( 2 ).click();
	await editor.clickBlockToolbarButton( 'Edit table' );
	await page.getByRole( 'menuitem', { name: 'Delete row' } ).click();
	await expect( cells ).toHaveCount( 2 );
}

async function runScenario( {
	attempt,
	collaboratorPage,
	collaborationUtils,
	editor,
	name,
	page,
	primarySetup,
	collaboratorEditor,
}: {
	attempt: number;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	collaborationUtils: CollaborationUtilsClass;
	editor: Editor;
	name: string;
	page: Page;
	primarySetup: () => Promise< void >;
} ) {
	await primarySetup();
	await waitForSessionReady( collaborationUtils );

	await editLastCell(
		collaboratorEditor,
		collaboratorPage,
		`table-option-952396-10-1-1 attempt ${ attempt }`
	);
	await waitForSessionReady( collaborationUtils );

	await appendRowAtEnd(
		editor,
		page,
		`table-option-952396-11-0-4 A attempt ${ attempt }`,
		`table-option-952396-11-0-4 B attempt ${ attempt }`
	);

	let convergenceError: null | string = null;
	try {
		await waitForSessionReady( collaborationUtils );
	} catch ( error ) {
		convergenceError =
			error instanceof Error ? error.message : String( error );
	}

	const [ primaryRows, collaboratorRows ] = await Promise.all( [
		getTableRows( editor ),
		getTableRows( collaboratorEditor ),
	] );
	const result = {
		attempt,
		collaboratorRows,
		convergenceError,
		name,
		primaryRows,
	};
	writeResult( result );

	expect( convergenceError ).toBeNull();
	expect( primaryRows ).toHaveLength( 2 );
	expect( collaboratorRows ).toHaveLength( 2 );
	expect( collaboratorRows ).toEqual( primaryRows );
}

test.describe( 'RTC triage 7eff71786d0e realistic row append after remote cell edit', () => {
	for ( const attempt of [ 0, 1 ] ) {
		test( `single-row-remote-edit-then-append attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: `RTC 7eff single-row ${ Date.now() }-${ attempt }`,
				status: 'draft',
				content: SINGLE_ROW_CONTENT,
				date_gmt: new Date().toISOString(),
			} );

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await runScenario( {
				attempt,
				collaboratorEditor,
				collaboratorPage,
				collaborationUtils,
				editor,
				name: 'single-row-remote-edit-then-append',
				page,
				primarySetup: async () => {},
			} );
		} );

		test( `delete-then-remote-edit-then-append attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: `RTC 7eff delete-row ${ Date.now() }-${ attempt }`,
				status: 'draft',
				content: TWO_ROW_CONTENT,
				date_gmt: new Date().toISOString(),
			} );

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await runScenario( {
				attempt,
				collaboratorEditor,
				collaboratorPage,
				collaborationUtils,
				editor,
				name: 'delete-then-remote-edit-then-append',
				page,
				primarySetup: async () => {
					await deleteSecondRow( editor, page );
				},
			} );
		} );
	}
} );
