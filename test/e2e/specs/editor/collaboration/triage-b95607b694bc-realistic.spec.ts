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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type NormalizedState = Awaited<
	ReturnType< CollaborationUtilsClass['getNormalizedPostState'] >
>;

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	primaryState?: NormalizedState;
	reproduced: boolean;
	scenario: string;
	secondaryState?: NormalizedState;
};

type Scenario = {
	content: string;
	moveCount: number;
	name: string;
	prepare?: ( editor: Editor, page: Page ) => Promise< void >;
};

const OUTPUT_DIR =
	process.env.RTC_B956_OUTPUT_DIR ??
	'/tmp/rtc-b956-realistic-output';
const ATTEMPTS = Number.parseInt( process.env.RTC_B956_ATTEMPTS ?? '1', 10 );

const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const FOLLOW_UP_HEADING = 'Follow-up heading';
const INSERTED_HEADING = 'Seed 954495 step 0 user 0 heading';
const TAIL_PARAGRAPH = 'Tail paragraph kept for save and reload stability checks.';

const BASE_THREE_BLOCKS = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRESEEDED_FOUR_BLOCKS = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ INSERTED_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'preseeded-heading-move-down-thrice',
		content: PRESEEDED_FOUR_BLOCKS,
		moveCount: 3,
	},
	{
		name: 'live-insert-heading-via-inserter-then-move-down-thrice',
		content: BASE_THREE_BLOCKS,
		moveCount: 3,
		prepare: async ( editor, page ) => {
			await clickBlockByText( editor, page, FOLLOW_UP_HEADING );
			await insertBlockFromInserter( page, 'Heading' );
			const editable = editor.canvas
				.locator( '[contenteditable="true"]' )
				.last();
			await expect( editable ).toBeVisible();
			await editable.click();
			await page.keyboard.type( INSERTED_HEADING, { delay: 15 } );
			await expect(
				editor.canvas.getByText( INSERTED_HEADING, {
					exact: false,
				} )
			).toBeVisible();
		},
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
			username: `rtcb956${ uniqueSuffix }`,
			email: `rtcb956+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primaryState,
		secondaryState,
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

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', {
				name: 'Block Inserter',
				exact: true,
			} )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function moveSelectedBlockDownManyTimes(
	editor: Editor,
	page: Page,
	count: number
) {
	for ( let index = 0; index < count; index++ ) {
		await editor.showBlockToolbar();
		const moveDown = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } );
		await expect( moveDown ).toBeEnabled();
		await moveDown.click();
	}
}

async function runAttempt( {
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
	requestUtils: {
		createPost: ( input: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenario: scenario.name,
	};
	const post = await requestUtils.createPost( {
		content: scenario.content,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC b956 ${ scenario.name } ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		if ( scenario.prepare ) {
			await scenario.prepare( editor, page );
			await collaborationUtils.waitForConvergence( { timeout: 60000 } );
		}

		await clickBlockByText( editor, page, LONG_PARAGRAPH );
		await moveSelectedBlockDownManyTimes( editor, page, scenario.moveCount );
		await collaborationUtils.waitForConvergence( { timeout: 60000 } );

		Object.assign( result, await getStates( collaborationUtils ) );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		result.reproduced = true;
		try {
			Object.assign( result, await getStates( collaborationUtils ) );
		} catch {}
	}

	writeResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 5 * 60 * 1000 );
			await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );
		} );
	}
}
