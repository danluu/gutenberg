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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks?: NormalizedBlock[];
	crdtDocument?: string | null;
	title?: string;
};

type Snapshot = {
	label: string;
	primaryState: NormalizedState;
	secondaryState: NormalizedState;
};

type Scenario = {
	includeReloadAfterMove: boolean;
	name: string;
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
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/ecae18a9f40b/realistic-results';
const WS_URL =
	process.env.GUTENBERG_RTC_TEST_WS_URL || 'ws://127.0.0.1:18998';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';
const TITLE = 'rtc-save-title-marker-952929-5-0-end';
const MOVED_MARKER = 'rtc-save-paragraph-marker-952929-5-0-end';
const FIRST_GROUP_PARAGRAPH = 'Seed 952929 step 0 user 1 nested paragraph';
const PRESEEDED_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952929 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952929 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952929 step 1 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952929 step 1 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952929 step 5 user 1 updated paragraph 661966</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952929-3-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952929-3-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-952929-3-1-end","buttonText":"Find rtc-save-search-option-marker-952929-3-1-end","buttonPosition":"button-inside"} /-->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952929 step 4 user 1 paragraph 363029</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952929-5-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952929-5-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-952929-5-0-end","buttonText":"Find rtc-save-search-option-marker-952929-5-0-end","buttonPosition":"button-inside"} /-->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		includeReloadAfterMove: false,
		name: 'drag-into-group-then-delete',
	},
	{
		includeReloadAfterMove: true,
		name: 'drag-into-group-reload-then-delete',
	},
];

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
		await requestUtils.activateTheme( 'twentytwentyone' );
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-rtc-websocket-provider'
		);
		await resetWebSocketServer();
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
			username: `rtcecae${ uniqueSuffix }`,
			email: `rtcecae+${ uniqueSuffix }@example.com`,
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

async function resetWebSocketServer() {
	const resetUrl = new URL( WS_URL );
	resetUrl.protocol = resetUrl.protocol === 'wss:' ? 'https:' : 'http:';
	resetUrl.pathname = '/reset';
	resetUrl.search = '';
	resetUrl.hash = '';

	const response = await fetch( resetUrl, { method: 'POST' } );
	if ( ! response.ok && response.status !== 204 ) {
		throw new Error(
			`WebSocket sync server reset failed with HTTP ${ response.status }`
		);
	}
}

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

function markerInFirstGroup( state: NormalizedState ) {
	const firstGroup = ( state.blocks ?? [] ).find(
		( block ) => block.name === 'core/group'
	);
	return (
		firstGroup?.innerBlocks?.some(
			( block ) =>
				block.name === 'core/paragraph' &&
				String( block.attributes?.content ?? '' ).includes( MOVED_MARKER )
		) ?? false
	);
}

function reproducedDeleteSplit(
	primaryState: NormalizedState,
	secondaryState: NormalizedState
) {
	return markerInFirstGroup( primaryState ) !== markerInFirstGroup( secondaryState );
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
		primaryState: primaryState as NormalizedState,
		secondaryState: secondaryState as NormalizedState,
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

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function reloadEditorPage(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20_000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function dragTo( page: Page, x: number, y: number ) {
	for ( let index = 0; index < 2; index++ ) {
		await page.mouse.move( x, y );
	}
}

async function dragParagraphIntoFirstGroup( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( MOVED_MARKER, { exact: false } ),
		} )
		.first();
	const firstNestedParagraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( FIRST_GROUP_PARAGRAPH, {
				exact: false,
			} ),
		} )
		.first();

	await expect( paragraph ).toBeVisible();
	await expect( firstNestedParagraph ).toBeVisible();

	await paragraph.hover();
	await page.mouse.down();
	const targetBox = await firstNestedParagraph.boundingBox();
	if ( ! targetBox ) {
		throw new Error( 'Could not determine first nested paragraph position.' );
	}
	await dragTo(
		page,
		targetBox.x + 32,
		targetBox.y + Math.max( 4, targetBox.height * 0.2 )
	);
	await page.mouse.up();
}

async function deleteMovedParagraphInsideGroup( page: Page, editor: Editor ) {
	await clickBlockByText( editor, page, MOVED_MARKER );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
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
		await loginAsAdmin( collaborationUtils.allPages[ 0 ] );
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;
		const primaryPage = collaborationUtils.allPages[ 0 ];

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await dragParagraphIntoFirstGroup( collaboratorPage, collaboratorEditor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-drag' )
		);

		if ( scenario.includeReloadAfterMove ) {
			await reloadEditorPage( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-reload' )
			);
		}

		await expect(
			collaboratorEditor.canvas
				.getByText( FIRST_GROUP_PARAGRAPH, { exact: false } )
				.first()
		).toBeVisible();

		await deleteMovedParagraphInsideGroup( primaryPage, primaryEditor );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-delete-before-wait' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15_000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-wait'
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced = reproducedDeleteSplit(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		test.setTimeout( 240_000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
			scenario,
		} );
		expect( result.error ).toBeUndefined();
	} );
}
