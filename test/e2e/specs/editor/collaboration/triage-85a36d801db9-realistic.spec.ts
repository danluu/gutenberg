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
			username: `rtcrow${ uniqueSuffix }`,
			email: `rtcrow+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Rows',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

const RESULT_DIR = process.env.RTC_ROW_APPEND_REPRO_DIR;

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Sequential table row append repro.</p>',
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
			`table-row-append-realistic-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( { timeout: 15000 } );
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

async function getTableRows( editor: Editor ) {
	return editor.canvas.locator( 'tbody tr' ).evaluateAll( ( rows ) =>
		rows.map( ( row ) =>
			Array.from( row.querySelectorAll( 'td' ), ( cell ) =>
				( cell.textContent ?? '' ).trim()
			)
		)
	);
}

test.describe( 'RTC triage 85a36d801db9 realistic row append', () => {
	for ( const attempt of [ 0, 1, 2 ] ) {
		test( `attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: `RTC realistic row append ${ Date.now() }-${ attempt }`,
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
				`primary attempt ${ attempt } row 3 A`,
				`primary attempt ${ attempt } row 3 B`
			);
			await waitForSessionReady( collaborationUtils );

			await appendRowAtEnd(
				collaboratorEditor,
				collaboratorPage,
				`collaborator attempt ${ attempt } row 4 A`,
				`collaborator attempt ${ attempt } row 4 B`
			);
			await waitForSessionReady( collaborationUtils );

			const [ primaryRows, collaboratorRows ] = await Promise.all( [
				getTableRows( editor ),
				getTableRows( collaboratorEditor ),
			] );
			const result = {
				attempt,
				collaboratorRows,
				primaryRows,
			};
			writeResult( result );

			expect( primaryRows ).toHaveLength( 4 );
			expect( collaboratorRows ).toHaveLength( 4 );
			expect( primaryRows ).toEqual( collaboratorRows );
		} );
	}
} );
