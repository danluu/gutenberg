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
	primaryBlocks: string[];
	reproduced: boolean;
	scenarioId: string;
	secondaryBlocks: string[];
};

type Scenario = {
	id: string;
	waitAfterInsert: boolean;
};

const OUTPUT_DIR = process.env.RTC_007E79_RESULT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 951364 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951364 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const SCENARIOS: Scenario[] = [
	{
		id: 'sequential-insert-then-delete-baseline',
		waitAfterInsert: true,
	},
	{
		id: 'burst-insert-then-delete-baseline',
		waitAfterInsert: false,
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
			username: `rtc007e${ uniqueSuffix }`,
			email: `rtc007e+${ uniqueSuffix }@example.com`,
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
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickParagraphByText(
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

async function insertParagraphBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clickParagraphByText( editor, page, anchorText );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function deleteParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickParagraphByText( editor, page, text );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function getParagraphs(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );

	return state.blocks
		.filter(
			( block ): block is {
				attributes: {
					content?: string;
				};
				name: string;
			} => block.name === 'core/paragraph'
		)
		.map( ( block ) => block.attributes.content ?? '' );
}

test.describe( 'RTC triage 007e79caf228 realistic insert then delete baseline', () => {
	for ( const scenario of SCENARIOS ) {
		for ( const attempt of [ 0, 1, 2 ] ) {
			test( `${ scenario.id } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const marker = `rtc-007e79-${ scenario.id }-${ attempt }`;
				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC 007e79 realistic ${ scenario.id } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					page: collaboratorPage,
				} = await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				await insertParagraphBeforeText(
					editor,
					page,
					'Seed 951364 baseline paragraph.',
					marker
				);

				if ( scenario.waitAfterInsert ) {
					await waitForSessionReady( collaborationUtils );
				}

				await deleteParagraphByText(
					editor,
					page,
					'Seed 951364 baseline paragraph.'
				);

				let convergenceError: string | null = null;
				try {
					await waitForSessionReady( collaborationUtils );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
					getParagraphs( collaborationUtils, page ),
					getParagraphs( collaborationUtils, collaboratorPage ),
				] );

				const result: AttemptResult = {
					attempt,
					convergenceError,
					primaryBlocks,
					reproduced:
						convergenceError !== null ||
						primaryBlocks.join( '\n' ) !==
							secondaryBlocks.join( '\n' ) ||
						primaryBlocks.includes( 'Seed 951364 baseline paragraph.' ) ||
						secondaryBlocks.includes( 'Seed 951364 baseline paragraph.' ),
					scenarioId: scenario.id,
					secondaryBlocks,
				};
				writeAttemptResult( result );

				expect( result.reproduced ).toBe( false );
				expect( primaryBlocks ).toEqual( [
					marker,
					'Seed 951364 keeps a second paragraph for deletes and moves.',
					'Shared editing target paragraph.',
				] );
				expect( secondaryBlocks ).toEqual( primaryBlocks );
			} );
		}
	}
} );
