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
	content: string;
	kind: 'delete-only' | 'drag-then-delete' | 'tab-indent-then-delete';
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	deleteSplitObserved?: boolean;
	dragApplied?: boolean;
	error?: string;
	name: string;
	postId?: number;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	process.env.RTC_TRIAGE_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/a48cbaacb3c8/realistic-results';
const WS_URL =
	process.env.GUTENBERG_RTC_TEST_WS_URL || 'ws://127.0.0.1:19007';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';
const TITLE = 'RTC seed 953113 initial title';
const MOVED_MARKER =
	'Another paragraph exists so the top-level list is not degenerate.';
const FIRST_GROUP_PARAGRAPH = 'Seed 953113 step 0 user 1 nested paragraph';
const INITIAL_CONTENT_AFTER_STEP0 = [
	'<!-- wp:heading {"level":2} -->',
	'<h2 class="wp-block-heading">Seed 953113 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953113 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953113 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );
const INITIAL_CONTENT_AFTER_STEP1 = [
	'<!-- wp:heading {"level":2} -->',
	'<h2 class="wp-block-heading">Seed 953113 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953113 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953113 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		content: INITIAL_CONTENT_AFTER_STEP0,
		kind: 'drag-then-delete',
		name: 'drag-then-delete-from-step0',
	},
	{
		content: INITIAL_CONTENT_AFTER_STEP0,
		kind: 'tab-indent-then-delete',
		name: 'tab-indent-then-delete-from-step0',
	},
	{
		content: INITIAL_CONTENT_AFTER_STEP1,
		kind: 'delete-only',
		name: 'delete-only-from-step1',
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
			username: `rtca48c${ uniqueSuffix }`,
			email: `rtca48c+${ uniqueSuffix }@example.com`,
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

async function indentParagraphByTab( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( MOVED_MARKER, { exact: false } ),
		} )
		.first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await page.keyboard.press( 'Tab' );
}

async function deleteMarkerParagraph( page: Page, editor: Editor ) {
	await clickBlockByText( editor, page, MOVED_MARKER );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function applyMoveScenario(
	page: Page,
	editor: Editor,
	kind: Scenario['kind']
) {
	if ( kind === 'drag-then-delete' ) {
		await dragParagraphIntoFirstGroup( page, editor );
		return;
	}
	if ( kind === 'tab-indent-then-delete' ) {
		await indentParagraphByTab( page, editor );
	}
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
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: scenario.content,
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

		if ( scenario.kind !== 'delete-only' ) {
			await applyMoveScenario(
				collaboratorPage,
				collaboratorEditor,
				scenario.kind
			);
			await waitForSessionReady( collaborationUtils );
			const afterMove = await captureSnapshot(
				collaborationUtils,
				'after-move'
			);
			result.snapshots.push( afterMove );
			result.dragApplied =
				markerInFirstGroup( afterMove.primaryState ) &&
				markerInFirstGroup( afterMove.secondaryState );
		}

		await deleteMarkerParagraph( primaryPage, primaryEditor );
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
		result.deleteSplitObserved = reproducedDeleteSplit(
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
