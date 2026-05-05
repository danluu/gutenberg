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

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	process.env.RTC_TRIAGE_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/a58adfbbd531/realistic-results';
const END_OF_LINE_KEY =
	process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';

const TITLE = 'RTC seed 953867 initial title';
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const APPENDED_PARAGRAPH = 'Seed 953867 step 1 user 0 paragraph 469879';
const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953867 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953867 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
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
		await requestUtils.setupRest();
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-rtc-websocket-provider'
		);
		await setCollaboration( requestUtils, true );
		await resetWsServer();
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
			username: `rtca58a${ uniqueSuffix }`,
			email: `rtca58a+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	return error instanceof Error ? error.stack ?? error.message : String( error );
}

async function resetWsServer() {
	const wsUrl =
		process.env.GUTENBERG_RTC_TEST_WS_URL || 'ws://127.0.0.1:19087';
	const resetUrl = new URL( wsUrl );
	resetUrl.protocol = resetUrl.protocol === 'wss:' ? 'https:' : 'http:';
	resetUrl.pathname = '/reset';
	resetUrl.search = '';
	resetUrl.hash = '';
	const response = await fetch( resetUrl, { method: 'POST' } );
	if ( ! response.ok && response.status !== 204 ) {
		throw new Error( `WS reset failed with ${ response.status }` );
	}
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20_000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return {
		label,
		primaryState,
		secondaryState,
	};
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function loginAsAdmin( page: Page ) {
	await page.goto( '/wp-login.php' );

	if ( page.url().includes( '/wp-admin/' ) ) {
		return;
	}

	await page.locator( '#user_login' ).fill( ADMIN_USERNAME );
	await page.locator( '#user_pass' ).fill( ADMIN_PASSWORD );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addParagraphAfterSelected(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );

	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } ).first()
	).toBeVisible();
}

async function addParagraphWithEnter(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	const lastParagraph = editor.canvas
		.getByText( TAIL_PARAGRAPH, { exact: false } )
		.first();
	await lastParagraph.click();
	await page.keyboard.press( END_OF_LINE_KEY );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } ).first()
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runScenario(
	{
		append,
		name,
	}: {
		append: ( page: Page, editor: Editor, paragraphText: string ) => Promise< void >;
		name: string;
	},
	{
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	}: {
		collaborationUtils: CollaborationUtilsClass;
		collaboratorUser: UserCredentials;
		page: Page;
		requestUtils: any;
	}
) {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: PRESEEDED_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await loginAsAdmin( page );
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickBlockByText( primaryEditor, page, TAIL_PARAGRAPH );
		await append( page, primaryEditor, APPENDED_PARAGRAPH );
		await collaborationUtils.waitForConvergence( { timeout: 20_000 } );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-append' )
		);

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			APPENDED_PARAGRAPH
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 20_000 } );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-delete' )
			);
		} catch ( error ) {
			result.reproduced = true;
			result.convergenceError = formatError( error );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-delete-diverged' )
			);
			writeScenarioResult( result );
			throw error;
		}
	} catch ( error ) {
		if ( ! result.reproduced ) {
			result.error = formatError( error );
		}
		writeScenarioResult( result );
		throw error;
	} finally {
		if ( ! result.reproduced ) {
			writeScenarioResult( result );
		}
		await requestUtils
			.rest( {
				method: 'DELETE',
				path: `/wp/v2/posts/${ post.id }`,
				params: { force: true },
			} )
			.catch( () => {} );
	}
}

test( 'primary add-after then collaborator delete', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180_000 );
	await runScenario(
		{
			append: addParagraphAfterSelected,
			name: 'add-after-then-delete',
		},
		{
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		}
	);
} );

test( 'primary enter then collaborator delete', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180_000 );
	await runScenario(
		{
			append: addParagraphWithEnter,
			name: 'enter-then-delete',
		},
		{
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		}
	);
} );
