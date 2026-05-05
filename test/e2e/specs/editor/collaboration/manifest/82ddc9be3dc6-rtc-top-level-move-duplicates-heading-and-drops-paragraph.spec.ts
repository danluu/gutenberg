import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';

import {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

const OUTPUT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/82ddc9be3dc6/repros/realistic';
const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8950';
const ADMIN_USER = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';

const TITLE = 'RTC seed 953920 step 1 user 1 title 800592';
const BASELINE = 'Seed 953920 baseline paragraph.';
const SECOND = 'Seed 953920 keeps a second paragraph for deletes and moves.';
const NESTED_PARAGRAPH = 'Seed 953920 step 0 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 953920 step 0 user 1 nested heading';
const SHARED = 'Shared editing target paragraph.';
const HEADING = 'Seed 953920 step 3 user 0 heading';
const APPENDED = 'Seed 953920 step 2 user 1 paragraph 649884';

const PRE_MOVE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":2} -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ APPENDED }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

type Snapshot = {
	label: string;
	persistedPost: {
		contentRaw: string;
		crdtDocument: string | null;
		titleRaw: string;
	};
	primaryState: any;
	secondaryState: any;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: string;
	snapshots: Snapshot[];
};

type ScenarioContext = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorPage: Page;
	collaboratorEditor: Editor;
	postId: number;
	requestUtils: RequestUtils;
	result: ScenarioResult;
};

function writeScenarioResult( result: ScenarioResult ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.scenario }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function summarizeTopLevel( state: any ) {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/group' ) {
			return `core/group:[${ ( block?.innerBlocks ?? [] )
				.map(
					( inner: any ) =>
						`${ inner?.name }:${ inner?.attributes?.content ?? '' }`
				)
				.join( '|' ) }]`;
		}
		return `${ block?.name }:${ block?.attributes?.content ?? '' }`;
	} );
}

function matchesSeedShape( primaryState: any, secondaryState: any ) {
	const expectedGood = [
		`core/paragraph:${ BASELINE }`,
		`core/paragraph:${ SECOND }`,
		`core/group:[core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
		`core/paragraph:${ SHARED }`,
		`core/paragraph:${ APPENDED }`,
		`core/heading:${ HEADING }`,
	];
	const expectedCorrupted = [
		`core/paragraph:${ BASELINE }`,
		`core/paragraph:${ SECOND }`,
		`core/group:[core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
		`core/paragraph:${ SHARED }`,
		`core/heading:${ HEADING }`,
		`core/heading:${ HEADING }`,
	];
	const [ first, second ] = [ primaryState, secondaryState ].map(
		summarizeTopLevel
	);

	return (
		( JSON.stringify( first ) === JSON.stringify( expectedGood ) &&
			JSON.stringify( second ) === JSON.stringify( expectedCorrupted ) ) ||
		( JSON.stringify( second ) === JSON.stringify( expectedGood ) &&
			JSON.stringify( first ) === JSON.stringify( expectedCorrupted ) )
	);
}

async function login( page: Page, username: string, password: string ) {
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( username );
	await page.locator( '#user_pass' ).fill( password );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 60000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: RequestUtils,
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		requestUtils.rest< {
			content?: { raw?: string };
			meta?: { _crdt_document?: string | null };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw,meta._crdt_document',
			},
		} ),
	] );

	return {
		label,
		persistedPost: {
			contentRaw: persistedPost.content?.raw ?? '',
			crdtDocument: persistedPost.meta?._crdt_document ?? null,
			titleRaw: persistedPost.title?.raw ?? '',
		},
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
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function moveSelectedBlock(
	page: Page,
	direction: 'up' | 'down'
) {
	const label = direction === 'up' ? 'Move up' : 'Move down';
	const button = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: label } );
	await expect( button ).toBeEnabled();
	await button.click();
}

async function runScenario(
	context: ScenarioContext,
	action: () => Promise< void >
) {
	await waitForSessionReady( context.collaborationUtils );
	context.result.snapshots.push(
		await captureSnapshot(
			context.collaborationUtils,
			context.requestUtils,
			context.postId,
			'initial'
		)
	);
	writeScenarioResult( context.result );

	await action();

	try {
		await context.collaborationUtils.waitForConvergence( { timeout: 30000 } );
	} catch ( error ) {
		context.result.convergenceError = formatError( error );
	}

	context.result.snapshots.push(
		await captureSnapshot(
			context.collaborationUtils,
			context.requestUtils,
			context.postId,
			'after-move'
		)
	);
	const finalSnapshot =
		context.result.snapshots[ context.result.snapshots.length - 1 ];
	context.result.reproduced = matchesSeedShape(
		finalSnapshot.primaryState,
		finalSnapshot.secondaryState
	);
	writeScenarioResult( context.result );
}

async function cleanupPost( requestUtils: RequestUtils, postId?: number ) {
	if ( ! postId ) {
		return;
	}

	try {
		await requestUtils.rest( {
			method: 'DELETE',
			params: {
				force: 'true',
			},
			path: `/wp/v2/posts/${ postId }`,
		} );
	} catch {
		// Ignore cleanup failures so the attempt result survives.
	}
}

test.describe( '82ddc9be3dc6 realistic repro search', () => {
	test( 'heading-down-toolbar-user1', async ( { browser, browserName } ) => {
		const requestUtils = await RequestUtils.setup( { baseURL: BASE_URL } );
		await requestUtils.setupRest();
		await setCollaboration( requestUtils, true );

		const collaboratorSuffix = `${ process.pid.toString( 36 ) }${ Date.now().toString( 36 ) }`.slice(
			-12
		);
		const collaboratorUser: UserCredentials = {
			email: `rtc82dd+${ collaboratorSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
			username: `rtc82dd${ collaboratorSuffix }`,
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		const post = await requestUtils.createPost( {
			content: PRE_MOVE_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );

		const result: ScenarioResult = {
			postId: post.id,
			reproduced: false,
			scenario: 'heading-down-toolbar-user1',
			snapshots: [],
		};
		writeScenarioResult( result );

		const adminContext = await browser.newContext( {
			baseURL: BASE_URL,
		} );
		const adminPage = await adminContext.newPage();
		const editor = new Editor( { page: adminPage } );
		const pageUtils = new PageUtils( {
			browserName,
			page: adminPage,
		} );
		const admin = new Admin( {
			editor,
			page: adminPage,
			pageUtils,
		} );
		const collaborationUtils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page: adminPage,
			requestUtils,
		} );
		collaborationUtils.registerCleanupUser( createdUser.id );

		try {
			await login( adminPage, ADMIN_USER, ADMIN_PASSWORD );
			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );

			await runScenario(
				{
					collaborationUtils,
					collaboratorEditor,
					collaboratorPage,
					postId: post.id,
					requestUtils,
					result,
				},
				async () => {
					await collaboratorPage.bringToFront();
					await clickBlockByText(
						collaboratorEditor,
						collaboratorPage,
						HEADING
					);
					await collaboratorEditor.showBlockToolbar();
					await moveSelectedBlock( collaboratorPage, 'down' );
				}
			);
		} catch ( error ) {
			result.error = formatError( error );
			writeScenarioResult( result );
		} finally {
			await cleanupPost( requestUtils, post.id );
			await collaborationUtils.teardown().catch( () => {} );
			await adminContext.close().catch( () => {} );
			await requestUtils.request.dispose().catch( () => {} );
		}
	} );

	test( 'paragraph-up-toolbar-user1', async ( { browser, browserName } ) => {
		const requestUtils = await RequestUtils.setup( { baseURL: BASE_URL } );
		await requestUtils.setupRest();
		await setCollaboration( requestUtils, true );

		const collaboratorSuffix = `${ process.pid.toString( 36 ) }${ Date.now().toString( 36 ) }`.slice(
			-12
		);
		const collaboratorUser: UserCredentials = {
			email: `rtc82ddp+${ collaboratorSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
			username: `rtc82ddp${ collaboratorSuffix }`,
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		const post = await requestUtils.createPost( {
			content: PRE_MOVE_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );

		const result: ScenarioResult = {
			postId: post.id,
			reproduced: false,
			scenario: 'paragraph-up-toolbar-user1',
			snapshots: [],
		};
		writeScenarioResult( result );

		const adminContext = await browser.newContext( {
			baseURL: BASE_URL,
		} );
		const adminPage = await adminContext.newPage();
		const editor = new Editor( { page: adminPage } );
		const pageUtils = new PageUtils( {
			browserName,
			page: adminPage,
		} );
		const admin = new Admin( {
			editor,
			page: adminPage,
			pageUtils,
		} );
		const collaborationUtils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page: adminPage,
			requestUtils,
		} );
		collaborationUtils.registerCleanupUser( createdUser.id );

		try {
			await login( adminPage, ADMIN_USER, ADMIN_PASSWORD );
			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );

			await runScenario(
				{
					collaborationUtils,
					collaboratorEditor,
					collaboratorPage,
					postId: post.id,
					requestUtils,
					result,
				},
				async () => {
					await collaboratorPage.bringToFront();
					await clickBlockByText(
						collaboratorEditor,
						collaboratorPage,
						APPENDED
					);
					await collaboratorEditor.showBlockToolbar();
					await moveSelectedBlock( collaboratorPage, 'up' );
				}
			);
		} catch ( error ) {
			result.error = formatError( error );
			writeScenarioResult( result );
		} finally {
			await cleanupPost( requestUtils, post.id );
			await collaborationUtils.teardown().catch( () => {} );
			await adminContext.close().catch( () => {} );
			await requestUtils.request.dispose().catch( () => {} );
		}
	} );
} );
