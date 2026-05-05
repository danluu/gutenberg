import fs from 'fs';
import path from 'path';

import {
	expect,
	test as base,
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

type Scenario = {
	anchorText: string;
	initialContent: string;
	insertMode: 'enter-after-anchor' | 'shortcut-after-anchor';
	name: string;
	preTitleEdit?: string;
};

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	exactTextsPresentOnBoth: boolean;
	notes: string[];
	postId: number;
	primaryState: unknown;
	reproduced: boolean;
	scenario: string;
	secondaryState: unknown;
	statesEqual: boolean;
};

const OUTPUT_DIR = process.env.RTC_5EA8_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_5EA8_ATTEMPTS ?? '3', 10 );
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const BASE_1_INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954181 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASE_3_INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'base-1-enter-after-anchor',
		insertMode: 'enter-after-anchor',
		anchorText: 'Another paragraph exists so the top-level list is not degenerate.',
		initialContent: BASE_1_INITIAL_CONTENT,
	},
	{
		name: 'base-1-shortcut-after-anchor',
		insertMode: 'shortcut-after-anchor',
		anchorText: 'Another paragraph exists so the top-level list is not degenerate.',
		initialContent: BASE_1_INITIAL_CONTENT,
	},
	{
		name: 'base-3-enter-after-tail',
		insertMode: 'enter-after-anchor',
		anchorText: 'Tail paragraph kept for save and reload stability checks.',
		initialContent: BASE_3_INITIAL_CONTENT,
	},
	{
		name: 'base-3-shortcut-after-tail',
		insertMode: 'shortcut-after-anchor',
		anchorText: 'Tail paragraph kept for save and reload stability checks.',
		initialContent: BASE_3_INITIAL_CONTENT,
	},
];

const test = base.extend< Fixtures >( {
	collaborationUtils: async ( { admin, editor, requestUtils, page }, use ) => {
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
			username: `rtc5ea8${ uniqueSuffix }`,
			email: `rtc5ea8+${ uniqueSuffix }@example.com`,
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

function writeResult( result: AttemptResult ) {
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

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas.getByText( text, { exact: false } );
	await expect( paragraph.last() ).toBeVisible();
	await paragraph.last().click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	existingText: string,
	insertedText: string
) {
	await clickParagraphByText( editor, page, existingText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( insertedText, { delay: 10 } );
}

async function insertParagraphWithShortcut(
	editor: Editor,
	page: Page,
	existingText: string,
	insertedText: string
) {
	await clickParagraphByText( editor, page, existingText );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+Y` );
	await page.keyboard.type( insertedText, { delay: 10 } );
}

async function updateTitle(
	page: Page,
	newTitle: string
) {
	const titleInput = page.getByRole( 'textbox', { name: 'Add title' } );
	await titleInput.click();
	await titleInput.fill( newTitle );
	await page.keyboard.press( 'Tab' );
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
}

for ( const scenario of SCENARIOS ) {
	test.describe( scenario.name, () => {
		for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
			test( `attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				const post = await requestUtils.createPost( {
					title: `RTC 5ea8 ${ scenario.name } ${ attempt }`,
					status: 'draft',
					date_gmt: new Date().toISOString(),
					content: scenario.initialContent,
				} );

				await collaborationUtils.openPost( post.id );
				const { editor: collaboratorEditor, page: collaboratorPage } =
					await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				const notes: string[] = [];
				if ( scenario.preTitleEdit ) {
					await updateTitle(
						collaboratorPage,
						`${ scenario.preTitleEdit } ${ attempt }`
					);
					await collaborationUtils.waitForConvergence( {
						includeCrdtDocument: true,
						timeout: 20000,
					} );
					notes.push( 'Applied a collaborator title edit before concurrent insertion.' );
				}

				const primaryText =
					`RTC realistic primary ${ scenario.name } ${ attempt }`;
				const secondaryText =
					`RTC realistic collaborator ${ scenario.name } ${ attempt }`;

				if ( scenario.insertMode === 'enter-after-anchor' ) {
					await Promise.all( [
						insertParagraphAfterText(
							editor,
							page,
							scenario.anchorText,
							primaryText
						),
						insertParagraphAfterText(
							collaboratorEditor,
							collaboratorPage,
							scenario.anchorText,
							secondaryText
						),
					] );
				} else {
					await Promise.all( [
						insertParagraphWithShortcut(
							editor,
							page,
							scenario.anchorText,
							primaryText
						),
						insertParagraphWithShortcut(
							collaboratorEditor,
							collaboratorPage,
							scenario.anchorText,
							secondaryText
						),
					] );
				}

				let convergenceError: string | null = null;
				try {
					await collaborationUtils.waitForConvergence( {
						includeCrdtDocument: true,
						timeout: 20000,
					} );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryState, secondaryState ] = await Promise.all( [
					normalizeState( collaborationUtils, page ),
					normalizeState( collaborationUtils, collaboratorPage ),
				] );
				const primaryJson = JSON.stringify( primaryState );
				const secondaryJson = JSON.stringify( secondaryState );
				const statesEqual = primaryJson === secondaryJson;
				const exactTextsPresentOnBoth =
					primaryJson.includes( primaryText ) &&
					primaryJson.includes( secondaryText ) &&
					secondaryJson.includes( primaryText ) &&
					secondaryJson.includes( secondaryText );
				const reproduced =
					convergenceError !== null ||
					! statesEqual ||
					! exactTextsPresentOnBoth;

				writeResult( {
					attempt,
					convergenceError,
					exactTextsPresentOnBoth,
					notes,
					postId: post.id,
					primaryState,
					reproduced,
					scenario: scenario.name,
					secondaryState,
					statesEqual,
				} );
			} );
		}
	} );
}
