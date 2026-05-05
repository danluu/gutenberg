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
	primaryRows: string[][];
	collaboratorRows: string[][];
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
			username: `rtctable${ uniqueSuffix }`,
			email: `rtctable+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Table',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

const RESULT_DIR = process.env.RTC_TABLE_PREPEND_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 950491 0</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 950491 step 1 user 0</td><td>initial row 1 B seed 950491 step 1 user 0</td></tr><tr><td>initial row 2 A seed 950491 step 1 user 0</td><td>initial row 2 B seed 950491 step 1 user 0</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950491 step 5 user 0 paragraph 166443</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function writeResult( result: AttemptResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			RESULT_DIR,
			`table-prepend-stale-edit-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 15000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function editLastRowSecondCell(
	editor: Editor,
	page: Page,
	text: string
) {
	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	const lastCell = cells.nth( ( await cells.count() ) - 1 );
	await expect( lastCell ).toBeVisible();
	await lastCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text, { delay: 20 } );
	await expect( lastCell ).toContainText( text );
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
	await page.keyboard.type( firstCellText, { delay: 20 } );
	await cells.nth( 1 ).click();
	await page.keyboard.type( secondCellText, { delay: 20 } );
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

test.describe( 'RTC triage 9000e0395bb1 realistic table prepend after cell edit', () => {
	for ( const attempt of [ 0, 1, 2 ] ) {
		test( `attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: `RTC realistic table prepend ${ Date.now() }-${ attempt }`,
				status: 'draft',
				content: INITIAL_CONTENT,
			} );

			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await editLastRowSecondCell(
				editor,
				page,
				'table-option-950491-7-0-1'
			);
			await prependRowAtStart(
				collaboratorEditor,
				collaboratorPage,
				'table-option-950491-8-1-3',
				'table-option-950491-8-1-3 sibling'
			);

			await collaborationUtils.waitForConvergence( { timeout: 15000 } );

			const [ primaryRows, collaboratorRows ] = await Promise.all( [
				getTableRows( editor ),
				getTableRows( collaboratorEditor ),
			] );
			writeResult( {
				attempt,
				primaryRows,
				collaboratorRows,
			} );

			expect( primaryRows ).toHaveLength( 3 );
			expect( collaboratorRows ).toHaveLength( 3 );
			expect( primaryRows ).toEqual( collaboratorRows );
			expect( primaryRows[ 2 ][ 0 ] ).toBe(
				'initial row 2 A seed 950491 step 1 user 0'
			);
			expect( primaryRows[ 2 ][ 1 ] ).toBe(
				'table-option-950491-7-0-1'
			);
		} );
	}
} );
