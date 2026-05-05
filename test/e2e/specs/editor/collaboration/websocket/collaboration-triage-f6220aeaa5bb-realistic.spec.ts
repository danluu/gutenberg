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

type ScenarioName = 'add-after-heading' | 'add-before-remaining-paragraph';

type AttemptSnapshot = {
	label: string;
	primaryOrder: string[];
	secondaryOrder: string[];
};

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: ScenarioName;
	snapshots: AttemptSnapshot[];
};

const OUTPUT_DIR = process.env.RTC_F6220_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_F6220_ATTEMPTS ?? '4', 10 );
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const HEADING_TEXT = 'Seed 956553 multibyte heading';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const REMAINING_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const INSERTED_HEADING = 'Seed 956553 step 1 user 0 heading';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ REMAINING_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page,
			requestUtils,
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
			username: `rtcf6220${ uniqueSuffix }`,
			email: `rtcf6220+${ uniqueSuffix }@example.com`,
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

function hasExactOrderMismatch(
	primaryOrder: string[],
	secondaryOrder: string[]
) {
	const expectedOne = [ HEADING_TEXT, INSERTED_HEADING, REMAINING_PARAGRAPH ];
	const expectedTwo = [ INSERTED_HEADING, HEADING_TEXT, REMAINING_PARAGRAPH ];
	const asJson = ( value: string[] ) => JSON.stringify( value );
	return (
		( asJson( primaryOrder ) === asJson( expectedOne ) &&
			asJson( secondaryOrder ) === asJson( expectedTwo ) ) ||
		( asJson( primaryOrder ) === asJson( expectedTwo ) &&
			asJson( secondaryOrder ) === asJson( expectedOne ) )
	);
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

async function waitForReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< AttemptSnapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryOrder: summarizeState( primaryState ),
		secondaryOrder: summarizeState( secondaryState ),
	};
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
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function chooseMenuItem(
	page: Page,
	preferred: string,
	fallback: string
) {
	const preferredItem = page.getByRole( 'menuitem', { name: preferred } );
	if ( await preferredItem.isVisible().catch( () => false ) ) {
		await preferredItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: fallback } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertHeadingNearSelection(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function insertHeadingAfterHeading(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await insertHeadingNearSelection( editor, page, text );
}

async function insertHeadingBeforeParagraph(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add before', 'Insert before' );
	await insertHeadingNearSelection( editor, page, text );
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
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
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `triage f6220 ${ scenario } ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickBlockByText( collaborationUtils.editor, page, EMOJI_PARAGRAPH );
		await deleteSelectedBlock( page, collaborationUtils.editor );
		await waitForReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-delete' )
		);

		if ( scenario === 'add-after-heading' ) {
			await insertHeadingAfterHeading(
				collaborationUtils.editor,
				page,
				HEADING_TEXT,
				INSERTED_HEADING
			);
		} else {
			await insertHeadingBeforeParagraph(
				collaborationUtils.editor,
				page,
				REMAINING_PARAGRAPH,
				INSERTED_HEADING
			);
		}

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.error = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-insert'
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced = hasExactOrderMismatch(
			finalSnapshot.primaryOrder,
			finalSnapshot.secondaryOrder
		);
	} catch ( error ) {
		result.error = formatError( error );
		try {
			const failureSnapshot = await captureSnapshot(
				collaborationUtils,
				'after-failure'
			);
			result.snapshots.push( failureSnapshot );
			result.reproduced = hasExactOrderMismatch(
				failureSnapshot.primaryOrder,
				failureSnapshot.secondaryOrder
			);
		} catch {}
	}

	writeAttemptResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'add-after-heading',
	'add-before-remaining-paragraph',
] as const ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `f6220 ${ scenario} attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				scenario,
			} );

			if ( result.reproduced ) {
				return;
			}

			expect( result.error ).toBeUndefined();
		} );
	}
}
