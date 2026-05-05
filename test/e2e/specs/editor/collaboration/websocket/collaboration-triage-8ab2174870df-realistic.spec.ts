import fs from 'fs';
import path from 'path';

import { expect, test as base, type Editor } from '@wordpress/e2e-test-utils-playwright';
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
	convergenceError: string | null;
	exactTextsPresentOnBoth: boolean;
	postId: number;
	primaryState: unknown;
	relatedTextCorruption: boolean;
	reproduced: boolean;
	scenario: string;
	secondaryState: unknown;
	statesEqual: boolean;
};

const OUTPUT_DIR = process.env.RTC_8AB217_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952957 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

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
			username: `rtc8ab${ uniqueSuffix }`,
			email: `rtc8ab+${ uniqueSuffix }@example.com`,
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

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	editor,
	page,
	postId,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	page: Page;
	postId: number;
	scenario: 'enter-after-anchor' | 'shortcut-after-anchor';
} ) {
	const primaryText = `Seed 952957 realistic primary ${ scenario } ${ attempt }`;
	const secondaryText = `Seed 952957 realistic collaborator ${ scenario } ${ attempt }`;
	const anchorText =
		'Another paragraph exists so the top-level list is not degenerate.';

	if ( scenario === 'enter-after-anchor' ) {
		await Promise.all( [
			insertParagraphAfterText( editor, page, anchorText, primaryText ),
			insertParagraphAfterText(
				collaboratorEditor,
				collaboratorPage,
				anchorText,
				secondaryText
			),
		] );
	} else {
		await Promise.all( [
			insertParagraphWithShortcut( editor, page, anchorText, primaryText ),
			insertParagraphWithShortcut(
				collaboratorEditor,
				collaboratorPage,
				anchorText,
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
	const relatedTextCorruption = ! exactTextsPresentOnBoth;
	const reproduced = convergenceError !== null || ! statesEqual;

	writeResult( {
		attempt,
		convergenceError,
		exactTextsPresentOnBoth,
		postId,
		primaryState,
		relatedTextCorruption,
		reproduced,
		scenario,
		secondaryState,
		statesEqual,
	} );

	expect( reproduced || relatedTextCorruption ).toBe( false );
}

test.describe( 'RTC triage 8ab2174870df realistic concurrent paragraph search', () => {
	for ( const scenario of [
		'enter-after-anchor',
		'shortcut-after-anchor',
	] as const ) {
		for ( const attempt of [ 0, 1, 2, 3 ] ) {
			test( `${ scenario } attempt ${ attempt }`, async ( {
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
					title: `RTC 8ab217 realistic ${ scenario } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser(
					post.id,
					collaboratorUser
				);
				await waitForSessionReady( collaborationUtils );

				await runScenario( {
					attempt,
					collaborationUtils,
					collaboratorEditor,
					collaboratorPage,
					editor,
					page,
					postId: post.id,
					scenario,
				} );
			} );
		}
	}
} );
