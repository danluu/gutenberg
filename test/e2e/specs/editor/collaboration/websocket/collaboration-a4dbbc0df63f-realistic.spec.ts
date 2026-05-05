import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
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

type ScenarioName = 'exact-pre-failure-state' | 'seed-shaped-sequence';

type Snapshot = {
	label: string;
	primaryState: unknown;
	primarySummary: string[];
	secondaryState: unknown;
	secondarySummary: string[];
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: ScenarioName;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_A4DB_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_A4DB_ATTEMPTS ?? '2', 10 );
const FAIL_ON_REPRO = process.env.RTC_A4DB_FAIL_ON_REPRO === '1';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const FORMATTED_VISIBLE_TEXT = 'italicbeta 954276 0';
const HEADING_TEXT = 'Seed 954276 step 3 user 1 heading';
const STEP2_TEXT = 'Seed 954276 step 2 user 1 paragraph 745395';
const BASELINE_TEXT = 'Seed 954276 baseline paragraph.';
const SECOND_TEXT = 'Seed 954276 keeps a second paragraph for deletes and moves.';
const SHARED_TEXT = 'Shared editing target paragraph.';

const BASE_INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const EXACT_PRE_FAILURE_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP2_TEXT }</p>`,
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
			username: `rtca4db${ uniqueSuffix }`,
			email: `rtca4db+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		const content = block?.attributes?.content;
		if ( typeof content === 'string' && content.length > 0 ) {
			return content;
		}
		return String( block?.name ?? 'unknown' );
	} );
}

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
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		primarySummary: summarizeState( primaryState ),
		secondaryState,
		secondarySummary: summarizeState( secondaryState ),
	};
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.last()
		.press( 'Escape' )
		.catch( () => {} );
	await page
		.locator( '[data-testid="snackbar-list"]' )
		.waitFor( {
			state: 'hidden',
			timeout: 3000,
		} )
		.catch( () => {} );
	await page
		.locator( '.block-editor-block-popover' )
		.waitFor( {
			state: 'hidden',
			timeout: 3000,
		} )
		.catch( () => {} );
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string,
	{ useLast = false }: { useLast?: boolean } = {}
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } );
	const target = useLast ? locator.last() : locator.first();
	await expect( target ).toBeVisible();

	for ( let attempt = 0; attempt < 2; attempt++ ) {
		try {
			await target.click( { timeout: 4000 } );
			return;
		} catch ( error ) {
			if ( attempt === 1 ) {
				throw error;
			}
			await clearTransientUi( page, editor );
		}
	}
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addAfterSelected( page: Page ) {
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
}

async function addBeforeSelected( page: Page ) {
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await page.bringToFront();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function moveSelectedBlockUp( page: Page, editor: Editor ) {
	await page.bringToFront();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } )
		.click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	insertedText: string
) {
	await clickBlockByText( editor, page, anchorText, { useLast: true } );
	await openBlockOptions( page, editor );
	await addAfterSelected( page );
	await page.keyboard.type( insertedText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( insertedText, { exact: false } )
	).toBeVisible();
}

async function insertHeadingBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await addBeforeSelected( page );
	await page.keyboard.type( '/heading', { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function appendFormattedParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string
) {
	await clickBlockByText( editor, page, anchorText, { useLast: true } );
	await openBlockOptions( page, editor );
	await addAfterSelected( page );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'italic', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'beta 954276 0', { delay: 15 } );
	await expect(
		editor.canvas.getByText( FORMATTED_VISIBLE_TEXT, { exact: false } )
	).toBeVisible();
}

function hasOneSidedFormattedParagraph(
	snapshot: Snapshot | undefined
): boolean {
	if ( ! snapshot ) {
		return false;
	}

	const primaryHas = snapshot.primarySummary.includes( FORMATTED_VISIBLE_TEXT );
	const secondaryHas = snapshot.secondarySummary.includes(
		FORMATTED_VISIBLE_TEXT
	);

	return primaryHas !== secondaryHas;
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: ScenarioName;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenario,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content:
			scenario === 'exact-pre-failure-state'
				? EXACT_PRE_FAILURE_CONTENT
				: BASE_INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC a4db realistic ${ scenario } ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		if ( scenario === 'seed-shaped-sequence' ) {
			await clickBlockByText( collaboratorEditor, collaboratorPage, SHARED_TEXT );
			await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-delete-shared-paragraph'
				)
			);

			await moveSelectedBlockUp( collaboratorPage, collaboratorEditor );
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-move-second-paragraph-up'
				)
			);

			await insertParagraphAfterText(
				collaboratorEditor,
				collaboratorPage,
				BASELINE_TEXT,
				STEP2_TEXT
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-append-seed-step2-paragraph'
				)
			);

			await insertHeadingBeforeText(
				collaboratorEditor,
				collaboratorPage,
				SECOND_TEXT,
				HEADING_TEXT
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-insert-heading' )
			);
		}

		await appendFormattedParagraphAfterText( editor, page, STEP2_TEXT );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				'after-formatted-paragraph-local-visible'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-convergence' )
			);
		} catch ( error ) {
			result.convergenceError = formatError( error );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-failed-convergence'
				)
			);
		}

		const lastSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = hasOneSidedFormattedParagraph( lastSnapshot );
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-error' )
			);
			const lastSnapshot = result.snapshots[ result.snapshots.length - 1 ];
			result.reproduced = hasOneSidedFormattedParagraph( lastSnapshot );
		} catch {}
	}

	writeAttemptResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'exact-pre-failure-state',
	'seed-shaped-sequence',
] as const ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const result = await runScenario( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );

			expect( result.error ).toBeUndefined();
			if ( FAIL_ON_REPRO ) {
				expect(
					result.reproduced,
					result.convergenceError ?? 'Expected one-sided formatted paragraph loss'
				).toBeFalsy();
			}
		} );
	}
}
