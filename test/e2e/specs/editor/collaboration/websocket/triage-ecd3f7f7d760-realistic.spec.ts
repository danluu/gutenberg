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
	emojiParagraphStillPresent: boolean;
	primaryBlockNames: string[];
	primaryParagraphs: string[];
	reproduced: boolean;
	scenarioId: string;
	secondaryBlockNames: string[];
	secondaryParagraphs: string[];
	tablePresentOnBothPages: boolean;
	updatedParagraphPresentOnBothPages: boolean;
};

type Scenario = {
	id: string;
	waitAfterInsert: boolean;
};

const OUTPUT_DIR = process.env.RTC_ECD3_OUTPUT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":2} -->',
	'<h2 class="wp-block-heading">Seed 951509 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const SCENARIOS: Scenario[] = [
	{
		id: 'sequential-edit-insert-table-delete-emoji',
		waitAfterInsert: true,
	},
	{
		id: 'burst-edit-insert-table-delete-emoji',
		waitAfterInsert: false,
	},
];

const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const ORIGINAL_TRAILING_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const UPDATED_PARAGRAPH = 'Seed 951509 step 0 user 0 updated paragraph 95968';

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
			username: `rtcecd3${ uniqueSuffix }`,
			email: `rtcecd3+${ uniqueSuffix }@example.com`,
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

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptionsMenu( page: Page ) {
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function replaceParagraphTextByText(
	editor: Editor,
	page: Page,
	originalText: string,
	nextText: string
) {
	await clickBlockByText( editor, page, originalText );
	await page.keyboard.press(
		`${ process.platform === 'darwin' ? 'Meta' : 'Control' }+A`
	);
	await page.keyboard.type( nextText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( nextText, { exact: false } ).first()
	).toBeVisible();
}

async function insertTableAfterText(
	editor: Editor,
	page: Page,
	anchorText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( '/table', { delay: 20 } );
	await expect(
		page.getByRole( 'option', { name: 'Table', selected: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	const createTableButton = editor.canvas.getByRole( 'button', {
		name: 'Create Table',
	} );
	await expect( createTableButton ).toBeVisible();
	await createTableButton.click();
	await expect(
		editor.canvas.getByRole( 'document', { name: /Block: Table/i } )
	).toBeVisible();
}

async function deleteParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickBlockByText( editor, page, text );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function getStateSummary(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );

	return {
		blockNames: state.blocks.map( ( block ) => block.name ),
		paragraphs: state.blocks
			.filter(
				( block ): block is {
					attributes: {
						content?: string;
					};
					name: string;
				} => block.name === 'core/paragraph'
			)
			.map( ( block ) => block.attributes.content ?? '' ),
	};
}

test.describe( 'RTC triage ecd3f7f7d760 realistic edit + table + delete', () => {
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

				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC ecd3 realistic ${ scenario.id } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					page: collaboratorPage,
				} = await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				await replaceParagraphTextByText(
					editor,
					page,
					ORIGINAL_TRAILING_PARAGRAPH,
					UPDATED_PARAGRAPH
				);
				await waitForSessionReady( collaborationUtils );

				await insertTableAfterText( editor, page, UPDATED_PARAGRAPH );

				if ( scenario.waitAfterInsert ) {
					await waitForSessionReady( collaborationUtils );
				}

				await deleteParagraphByText( editor, page, EMOJI_PARAGRAPH );

				let convergenceError: string | null = null;
				try {
					await waitForSessionReady( collaborationUtils );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryState, secondaryState ] = await Promise.all( [
					getStateSummary( collaborationUtils, page ),
					getStateSummary( collaborationUtils, collaboratorPage ),
				] );

				const result: AttemptResult = {
					attempt,
					convergenceError,
					emojiParagraphStillPresent:
						primaryState.paragraphs.includes( EMOJI_PARAGRAPH ) ||
						secondaryState.paragraphs.includes( EMOJI_PARAGRAPH ),
					primaryBlockNames: primaryState.blockNames,
					primaryParagraphs: primaryState.paragraphs,
					reproduced:
						convergenceError !== null ||
						JSON.stringify( primaryState ) !==
							JSON.stringify( secondaryState ) ||
						primaryState.paragraphs.includes( EMOJI_PARAGRAPH ) ||
						secondaryState.paragraphs.includes( EMOJI_PARAGRAPH ) ||
						! primaryState.blockNames.includes( 'core/table' ) ||
						! secondaryState.blockNames.includes( 'core/table' ) ||
						! primaryState.paragraphs.includes( UPDATED_PARAGRAPH ) ||
						! secondaryState.paragraphs.includes( UPDATED_PARAGRAPH ),
					scenarioId: scenario.id,
					secondaryBlockNames: secondaryState.blockNames,
					secondaryParagraphs: secondaryState.paragraphs,
					tablePresentOnBothPages:
						primaryState.blockNames.includes( 'core/table' ) &&
						secondaryState.blockNames.includes( 'core/table' ),
					updatedParagraphPresentOnBothPages:
						primaryState.paragraphs.includes( UPDATED_PARAGRAPH ) &&
						secondaryState.paragraphs.includes( UPDATED_PARAGRAPH ),
				};
				writeAttemptResult( result );

				expect( result.reproduced ).toBe( false );
				expect( result.emojiParagraphStillPresent ).toBe( false );
				expect( result.tablePresentOnBothPages ).toBe( true );
				expect( result.updatedParagraphPresentOnBothPages ).toBe( true );
				expect( result.primaryBlockNames ).toEqual( [
					'core/heading',
					'core/paragraph',
					'core/table',
				] );
				expect( result.secondaryBlockNames ).toEqual( [
					'core/heading',
					'core/paragraph',
					'core/table',
				] );
				expect( result.primaryParagraphs ).toEqual( [ UPDATED_PARAGRAPH ] );
				expect( result.secondaryParagraphs ).toEqual( [ UPDATED_PARAGRAPH ] );
			} );
		}
	}
} );
