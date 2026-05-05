import fs from 'fs';
import path from 'path';

import { expect, test as base, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Locator, Page } from '@playwright/test';

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
	deleteConvergenceError: string | null;
	exactDeleteBug: boolean;
	postId: number;
	primaryState: unknown;
	relatedInsertCorruption: boolean;
	reproduced: boolean;
	scenario: string;
	secondaryState: unknown;
	statesEqualAfterInsert: boolean;
	statesEqualAfterDelete: boolean;
};

const OUTPUT_DIR = process.env.RTC_44AD7_OUTPUT_DIR;
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
			username: `rtc44ad${ uniqueSuffix }`,
			email: `rtc44ad+${ uniqueSuffix }@example.com`,
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

async function appendParagraphAfterLastBlock(
	editor: Editor,
	page: Page,
	insertedText: string
) {
	const lastDocument = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( insertedText, { delay: 10 } );
}

async function insertParagraphAfterAnchor(
	editor: Editor,
	page: Page,
	anchorText: string,
	insertedText: string
) {
	await clickParagraphByText( editor, page, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( insertedText, { delay: 10 } );
}

async function insertParagraphAfterAnchorWithShortcut(
	editor: Editor,
	page: Page,
	anchorText: string,
	insertedText: string
) {
	await clickParagraphByText( editor, page, anchorText );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+Y` );
	await page.keyboard.type( insertedText, { delay: 10 } );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function selectBlockByInsertedText(
	editor: Editor,
	page: Page,
	text: string
) {
	const paragraph = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
}

function statesContainBothTexts(
	primaryJson: string,
	secondaryJson: string,
	primaryText: string,
	secondaryText: string
) {
	return (
		primaryJson.includes( primaryText ) &&
		primaryJson.includes( secondaryText ) &&
		secondaryJson.includes( primaryText ) &&
		secondaryJson.includes( secondaryText )
	);
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
	scenario:
		| 'append-after-tail'
		| 'enter-after-anchor'
		| 'shortcut-after-anchor';
} ) {
	const primaryText = `Seed 952957 realistic primary ${ scenario } ${ attempt }`;
	const secondaryText = `Seed 952957 realistic collaborator ${ scenario } ${ attempt }`;
	const anchorText =
		'Another paragraph exists so the top-level list is not degenerate.';

	if ( scenario === 'append-after-tail' ) {
		await Promise.all( [
			appendParagraphAfterLastBlock( editor, page, primaryText ),
			appendParagraphAfterLastBlock(
				collaboratorEditor,
				collaboratorPage,
				secondaryText
			),
		] );
	} else if ( scenario === 'enter-after-anchor' ) {
		await Promise.all( [
			insertParagraphAfterAnchor( editor, page, anchorText, primaryText ),
			insertParagraphAfterAnchor(
				collaboratorEditor,
				collaboratorPage,
				anchorText,
				secondaryText
			),
		] );
	} else {
		await Promise.all( [
			insertParagraphAfterAnchorWithShortcut(
				editor,
				page,
				anchorText,
				primaryText
			),
			insertParagraphAfterAnchorWithShortcut(
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

	const [ primaryAfterInsert, secondaryAfterInsert ] = await Promise.all( [
		normalizeState( collaborationUtils, page ),
		normalizeState( collaborationUtils, collaboratorPage ),
	] );
	const primaryInsertJson = JSON.stringify( primaryAfterInsert );
	const secondaryInsertJson = JSON.stringify( secondaryAfterInsert );
	const statesEqualAfterInsert = primaryInsertJson === secondaryInsertJson;
	const relatedInsertCorruption = ! statesContainBothTexts(
		primaryInsertJson,
		secondaryInsertJson,
		primaryText,
		secondaryText
	);

	let primaryAfterDelete = primaryAfterInsert;
	let secondaryAfterDelete = secondaryAfterInsert;
	let statesEqualAfterDelete = statesEqualAfterInsert;
	let deleteConvergenceError: string | null = null;
	let exactDeleteBug = false;

	if ( statesEqualAfterInsert && ! relatedInsertCorruption ) {
		await selectBlockByInsertedText( collaboratorEditor, collaboratorPage, primaryText );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			deleteConvergenceError =
				error instanceof Error ? error.message : String( error );
		}

		[ primaryAfterDelete, secondaryAfterDelete ] = await Promise.all( [
			normalizeState( collaborationUtils, page ),
			normalizeState( collaborationUtils, collaboratorPage ),
		] );
		const primaryDeleteJson = JSON.stringify( primaryAfterDelete );
		const secondaryDeleteJson = JSON.stringify( secondaryAfterDelete );
		statesEqualAfterDelete = primaryDeleteJson === secondaryDeleteJson;
		exactDeleteBug =
			primaryDeleteJson.includes( primaryText ) !==
				secondaryDeleteJson.includes( primaryText ) &&
			primaryDeleteJson.includes( secondaryText ) &&
			secondaryDeleteJson.includes( secondaryText );
	}

	const reproduced =
		convergenceError !== null ||
		deleteConvergenceError !== null ||
		relatedInsertCorruption ||
		! statesEqualAfterDelete;

	writeResult( {
		attempt,
		convergenceError,
		deleteConvergenceError,
		exactDeleteBug,
		postId,
		primaryState: primaryAfterDelete,
		relatedInsertCorruption,
		reproduced,
		scenario,
		secondaryState: secondaryAfterDelete,
		statesEqualAfterInsert,
		statesEqualAfterDelete,
	} );

	expect( reproduced ).toBe( false );
}

test.describe( 'RTC triage 44ad7b17993d realistic concurrent insert/delete search', () => {
	for ( const scenario of [
		'append-after-tail',
		'enter-after-anchor',
		'shortcut-after-anchor',
	] as const ) {
		for ( const attempt of [ 0, 1 ] ) {
			test( `${ scenario} attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const post = await requestUtils.createPost( {
					title: `RTC 44ad ${ scenario } ${ attempt }`,
					content: INITIAL_CONTENT,
					status: 'draft',
				} );

				await collaborationUtils.openPost( post.id );
				const { editor: collaboratorEditor, page: collaboratorPage } =
					await collaborationUtils.joinUser( post.id, collaboratorUser );
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
