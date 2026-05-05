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

type ScenarioResult = {
	error?: string;
	label: string;
	postId?: number;
	primaryState?: unknown;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_D35_REALISTIC_OUTPUT_DIR;
const INITIAL_CONTENT_WITH_TABLE = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953027 step 0 user 0</td><td>initial row 1 B seed 953027 step 0 user 0</td></tr><tr><td>initial row 2 A seed 953027 step 0 user 0</td><td>initial row 2 B seed 953027 step 0 user 0</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );
const GROUP_PARAGRAPH = 'Seed 953027 step 1 user 1 nested paragraph';
const GROUP_HEADING = 'Seed 953027 step 1 user 1 nested heading';
const TAIL_PARAGRAPH = 'Tail paragraph kept for save and reload stability checks.';

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
			username: `rtcd35r${ uniqueSuffix }`,
			email: `rtcd35r+${ uniqueSuffix }@example.com`,
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

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.label }.json` ),
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

async function addBlockBeforeSelected(
	page: Page,
	typeahead: string,
	confirmName: RegExp
) {
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( typeahead, { delay: 25 } );
	await page.getByRole( 'option', { name: confirmName } ).click();
}

async function insertGroupBeforeTail(
	editor: Editor,
	page: Page
) {
	await clickBlockByText( editor, page, TAIL_PARAGRAPH );
	await editor.showBlockToolbar();
	await addBlockBeforeSelected( page, '/group', /Group/ );
	await page.keyboard.type( GROUP_PARAGRAPH, { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 15 } );
	await page.getByRole( 'option', { name: 'Heading 3' } ).click();
	await page.keyboard.type( GROUP_HEADING, { delay: 15 } );
	await expect(
		editor.canvas.getByText( GROUP_PARAGRAPH, { exact: false } )
	).toBeVisible();
	await expect(
		editor.canvas.getByText( GROUP_HEADING, { exact: false } )
	).toBeVisible();
}

async function moveTailParagraphDown(
	editor: Editor,
	page: Page
) {
	await clickBlockByText( editor, page, TAIL_PARAGRAPH );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic d35 move-down scenarios', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const scenario: ScenarioResult = {
		label: 'live-remote-group-then-move-down',
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT_WITH_TABLE,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC d35 realistic repro',
	} );
	scenario.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await insertGroupBeforeTail( collaboratorEditor, collaboratorPage );
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await moveTailParagraphDown( editor, page );
		try {
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		} catch ( error ) {
			scenario.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		Object.assign( scenario, await getStates( collaborationUtils ) );
		writeScenarioResult( scenario );
	} catch ( error ) {
		scenario.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			Object.assign( scenario, await getStates( collaborationUtils ) );
		} catch {}
		writeScenarioResult( scenario );
		throw error;
	}
} );
