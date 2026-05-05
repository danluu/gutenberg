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

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	postId: number;
	primaryBlocks: string[];
	reproduced: boolean;
	scenario: string;
	secondaryBlocks: string[];
};

type Scenario = {
	fillCells: boolean;
	name: string;
};

const OUTPUT_DIR = process.env.RTC_DA361_RESULT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 951444 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951444 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const SCENARIOS: Scenario[] = [
	{
		fillCells: true,
		name: 'filled-table-after-delete-second-then-delete-shared',
	},
	{
		fillCells: false,
		name: 'empty-table-after-delete-second-then-delete-shared',
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
			username: `rtcda361${ uniqueSuffix }`,
			email: `rtcda361+${ uniqueSuffix }@example.com`,
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
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptionsMenu( page: Page ) {
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function deleteBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickBlockByText( editor, page, text );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertTableAtEnd(
	editor: Editor,
	page: Page,
	{
		attempt,
		fillCells,
	}: {
		attempt: number;
		fillCells: boolean;
	}
) {
	await clickBlockByText(
		editor,
		page,
		'Shared editing target paragraph.'
	);
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/table' );
	await expect(
		page.getByRole( 'option', { name: 'Table', selected: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.press( 'Space' );

	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells ).toHaveCount( 4 );

	if ( ! fillCells ) {
		return;
	}

	const values = [
		`initial row 1 A realistic attempt ${ attempt }`,
		`initial row 1 B realistic attempt ${ attempt }`,
		`initial row 2 A realistic attempt ${ attempt }`,
		`initial row 2 B realistic attempt ${ attempt }`,
	];

	for ( const [ index, value ] of values.entries() ) {
		await cells.nth( index ).click();
		await page.keyboard.type( value, { delay: 20 } );
	}
}

async function getBlockSummary(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );

	return state.blocks.map( ( block ) => {
		if ( block.name === 'core/paragraph' ) {
			return block.attributes.content ?? '';
		}

		return block.name;
	} );
}

test.describe( 'RTC triage da361be57ba6 realistic delete after table insert', () => {
	for ( const scenario of SCENARIOS ) {
		for ( const attempt of [ 0, 1, 2 ] ) {
			test( `${ scenario.name } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC da361 realistic ${ scenario.name } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				await deleteBlockByText(
					editor,
					page,
					'Seed 951444 keeps a second paragraph for deletes and moves.'
				);
				await waitForSessionReady( collaborationUtils );

				await insertTableAtEnd( collaboratorEditor, collaboratorPage, {
					attempt,
					fillCells: scenario.fillCells,
				} );
				await waitForSessionReady( collaborationUtils );

				await deleteBlockByText(
					editor,
					page,
					'Shared editing target paragraph.'
				);

				let convergenceError: string | null = null;
				try {
					await waitForSessionReady( collaborationUtils );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
					getBlockSummary( collaborationUtils, page ),
					getBlockSummary( collaborationUtils, collaboratorPage ),
				] );

				const result: AttemptResult = {
					attempt,
					convergenceError,
					postId: post.id,
					primaryBlocks,
					reproduced:
						convergenceError !== null ||
						primaryBlocks.join( '\n' ) !==
							secondaryBlocks.join( '\n' ) ||
						secondaryBlocks.includes( 'Shared editing target paragraph.' ),
					scenario: scenario.name,
					secondaryBlocks,
				};
				writeAttemptResult( result );

				expect( result.reproduced ).toBe( false );
				expect( primaryBlocks ).toEqual( [
					'Seed 951444 baseline paragraph.',
					'core/table',
				] );
				expect( secondaryBlocks ).toEqual( primaryBlocks );
			} );
		}
	}
} );
