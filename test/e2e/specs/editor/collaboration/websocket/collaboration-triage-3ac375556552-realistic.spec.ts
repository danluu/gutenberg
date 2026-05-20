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

type ScenarioName = 'append-from-tail-enter' | 'append-via-add-after';

type AttemptResult = {
	attempt: number;
	deleteConvergenceError: string | null;
	deleteWaitMs: number;
	exactDeleteBug: boolean;
	insertConvergenceError: string | null;
	insertedPresentAfterDelete: boolean;
	postId: number;
	primaryContainsInsertedAfterDelete: boolean;
	primaryState: unknown;
	reproduced: boolean;
	scenario: ScenarioName;
	secondaryContainsInsertedAfterDelete: boolean;
	secondaryState: unknown;
	semanticDeleteBug: boolean;
	statesEqualAfterDelete: boolean;
	statesEqualAfterInsert: boolean;
};

const OUTPUT_DIR = process.env.RTC_3AC3_OUTPUT_DIR;
const SHARED_PARAGRAPH = 'Shared editing target paragraph.';

function readPositiveIntEnv( name: string, fallback: number ) {
	const value = process.env[ name ];
	if ( ! value ) {
		return fallback;
	}

	const parsed = Number.parseInt( value, 10 );
	return Number.isFinite( parsed ) && parsed > 0 ? parsed : fallback;
}

const DELETE_CONVERGENCE_TIMEOUT_MS = readPositiveIntEnv(
	'RTC_3AC3_DELETE_CONVERGENCE_TIMEOUT_MS',
	15000
);
const TEST_TIMEOUT_MS = readPositiveIntEnv(
	'RTC_3AC3_TEST_TIMEOUT_MS',
	Math.max( 120000, DELETE_CONVERGENCE_TIMEOUT_MS + 90000 )
);

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 954092 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954092 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED_PARAGRAPH }</p>`,
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
			username: `rtc3ac3${ uniqueSuffix }`,
			email: `rtc3ac3+${ uniqueSuffix }@example.com`,
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

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	const block = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	paragraphText: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 10 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function addAfterSelectedAndTypeParagraph(
	editor: Editor,
	page: Page,
	paragraphText: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( paragraphText, { delay: 10 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page );
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
	scenario: ScenarioName;
} ) {
	const insertedParagraph = `Seed 954092 realistic ${ scenario } ${ attempt } paragraph`;

	if ( scenario === 'append-from-tail-enter' ) {
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			insertedParagraph
		);
	} else {
		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			SHARED_PARAGRAPH
		);
		await addAfterSelectedAndTypeParagraph(
			collaboratorEditor,
			collaboratorPage,
			insertedParagraph
		);
	}

	let insertConvergenceError: string | null = null;
	try {
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
	} catch ( error ) {
		insertConvergenceError =
			error instanceof Error ? error.message : String( error );
	}

	const [ primaryAfterInsert, secondaryAfterInsert ] = await Promise.all( [
		normalizeState( collaborationUtils, page ),
		normalizeState( collaborationUtils, collaboratorPage ),
	] );
	const primaryInsertJson = JSON.stringify( primaryAfterInsert );
	const secondaryInsertJson = JSON.stringify( secondaryAfterInsert );
	const statesEqualAfterInsert = primaryInsertJson === secondaryInsertJson;

	let primaryAfterDelete = primaryAfterInsert;
	let secondaryAfterDelete = secondaryAfterInsert;
	let statesEqualAfterDelete = statesEqualAfterInsert;
	let deleteConvergenceError: string | null = null;
	let exactDeleteBug = false;
	let primaryContainsInsertedAfterDelete = false;
	let secondaryContainsInsertedAfterDelete = false;
	let insertedPresentAfterDelete = false;
	let semanticDeleteBug = false;

	if ( statesEqualAfterInsert ) {
		await clickBlockByText( editor, page, insertedParagraph );
		await deleteSelectedBlock( page, editor );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: DELETE_CONVERGENCE_TIMEOUT_MS,
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
		primaryContainsInsertedAfterDelete =
			primaryDeleteJson.includes( insertedParagraph );
		secondaryContainsInsertedAfterDelete =
			secondaryDeleteJson.includes( insertedParagraph );
		insertedPresentAfterDelete =
			primaryContainsInsertedAfterDelete ||
			secondaryContainsInsertedAfterDelete;
		semanticDeleteBug = insertedPresentAfterDelete;
		exactDeleteBug =
			primaryContainsInsertedAfterDelete !==
				secondaryContainsInsertedAfterDelete &&
			primaryDeleteJson.includes( SHARED_PARAGRAPH ) &&
			secondaryDeleteJson.includes( SHARED_PARAGRAPH );
	}

	const reproduced =
		insertConvergenceError !== null ||
		deleteConvergenceError !== null ||
		! statesEqualAfterDelete ||
		semanticDeleteBug;

	writeResult( {
		attempt,
		deleteConvergenceError,
		deleteWaitMs: DELETE_CONVERGENCE_TIMEOUT_MS,
		exactDeleteBug,
		insertConvergenceError,
		insertedPresentAfterDelete,
		postId,
		primaryContainsInsertedAfterDelete,
		primaryState: primaryAfterDelete,
		reproduced,
		scenario,
		secondaryContainsInsertedAfterDelete,
		secondaryState: secondaryAfterDelete,
		semanticDeleteBug,
		statesEqualAfterDelete,
		statesEqualAfterInsert,
	} );

	expect( reproduced ).toBe( false );
}

test.describe( 'RTC triage 3ac375556552 realistic remote paragraph delete search', () => {
	for ( const scenario of [
		'append-from-tail-enter',
		'append-via-add-after',
	] as const ) {
		for ( const attempt of [ 0, 1, 2 ] ) {
			test( `${ scenario } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( TEST_TIMEOUT_MS );

				const post = await requestUtils.createPost( {
					title: `RTC 3ac3 ${ scenario } ${ attempt }`,
					content: INITIAL_CONTENT,
					status: 'draft',
				} );

				await collaborationUtils.openPost( post.id );
				const { editor: collaboratorEditor, page: collaboratorPage } =
					await collaborationUtils.joinUser(
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
