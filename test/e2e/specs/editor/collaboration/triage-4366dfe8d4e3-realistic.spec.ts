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

type AttemptResult = {
	error?: string;
	postId?: number;
	primaryState?: unknown;
	secondaryState?: unknown;
	stage?: string;
};

const OUTPUT_DIR = process.env.RTC_4366DFE8_OUTPUT_DIR;
const REMOTE_INSERTED_TEXT = 'RTC 4366dfe8 remote paragraph';
const TRAILING_PARAGRAPH = 'RTC 4366dfe8 trailing paragraph';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>x</p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 951259 step 1 user 0</td><td>initial row 1 B seed 951259 step 1 user 0</td></tr><tr><td>initial row 2 A seed 951259 step 1 user 0</td><td>initial row 2 B seed 951259 step 1 user 0</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	`<p>${ TRAILING_PARAGRAPH }</p>`,
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
			username: `rtc436${ uniqueSuffix }`,
			email: `rtc436+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, 'realistic-attempt.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
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

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function clickPullquoteText( editor: Editor, page: Page ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByRole( 'textbox', { name: 'Pullquote text' } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page
		.getByRole( 'menuitem', { name: /Add before|Insert before/ } )
		.click();
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic pullquote/table move variant for 4366dfe8d4e3', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const result: AttemptResult = {};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC 4366dfe8 realistic repro',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.stage = 'joined';

		await clickPullquoteText( collaboratorEditor, collaboratorPage );
		await insertParagraphBeforeSelected(
			collaboratorEditor,
			collaboratorPage,
			REMOTE_INSERTED_TEXT
		);
		await waitForSessionReady( collaborationUtils );
		result.stage = 'after-remote-insert';

		await clickPullquoteText( editor, page );
		await moveSelectedBlockDown( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.stage = 'after-first-move';

		await clickBlockByText( editor, page, 'x' );
		await moveSelectedBlockDown( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.stage = 'after-second-move';

		Object.assign( result, await getStates( collaborationUtils ) );
		writeAttemptResult( result );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			Object.assign( result, await getStates( collaborationUtils ) );
		} catch {}
		writeAttemptResult( result );
		throw error;
	}
} );
