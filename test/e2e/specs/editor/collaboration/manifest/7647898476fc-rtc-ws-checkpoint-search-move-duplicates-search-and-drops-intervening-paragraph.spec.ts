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

type Snapshot = {
	label: string;
	primaryBlocks: string[];
	secondaryBlocks: string[];
};

type ScenarioResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproducedAnyCorruption: boolean;
	reproducedExactArchivedSplit: boolean;
	scenario: string;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_7647898476FC_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt(
	process.env.RTC_7647898476FC_ATTEMPTS ?? '1',
	10
);
const WP_USERNAME = process.env.WP_USERNAME || 'admin';
const WP_PASSWORD = process.env.WP_PASSWORD || 'password';

const SEARCH1_MARKER = 'rtc-save-search-option-marker-953856-1-1-end';
const SEARCH3_MARKER = 'rtc-save-search-option-marker-953856-3-0-end';
const ARCHIVED_SHARED = 'Shared editing target paragraph.';
const ARCHIVED_CP0 = 'Seed 953856 step 0 user 0 concurrent paragraph 930320';
const ARCHIVED_CP1 = 'Seed 953856 step 0 user 1 concurrent paragraph 459539';
const ARCHIVED_MARKER1 = 'rtc-save-paragraph-marker-953856-1-1-end';
const ARCHIVED_MARKER3 = 'rtc-save-paragraph-marker-953856-3-0-end';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 step 3 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953856 step 3 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 step 0 user 0 concurrent paragraph 930320</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 step 0 user 1 concurrent paragraph 459539</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953856-1-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953856-1-1-end","label":"Search label rtc-save-search-option-marker-953856-1-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953856-1-1-end"} /-->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953856-3-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953856-3-0-end","label":"Search label rtc-save-search-option-marker-953856-3-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953856-3-0-end"} /-->',
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

		await requestUtils.setupRest();
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-rtc-websocket-provider'
		);
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
			username: `rtc7647${ uniqueSuffix }`,
			email: `rtc7647+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenario }.attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function deleteCreatedPost( requestUtils: any, postId?: number ) {
	if ( ! postId ) {
		return;
	}

	try {
		await requestUtils.rest( {
			method: 'DELETE',
			path: `/wp/v2/posts/${ postId }`,
			params: {
				force: true,
			},
		} );
	} catch {}
}

async function getBlockTexts(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page );
	return state.blocks.map( ( block ) => {
		if ( block.name === 'core/search' ) {
			return `core/search:${ String(
				block.attributes?.content ?? block.attributes?.label ?? ''
			) }`;
		}
		return String( block.attributes?.content ?? block.name );
	} );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
		getBlockTexts( collaborationUtils, collaborationUtils.allPages[ 0 ] ),
		getBlockTexts( collaborationUtils, collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryBlocks,
		secondaryBlocks,
	};
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 40000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function loginPrimaryAdmin( page: Page ) {
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( WP_USERNAME );
	await page.locator( '#user_pass' ).fill( WP_PASSWORD );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
}

async function clickSearchBlock( page: Page, editor: Editor ) {
	await page.bringToFront();
	const searchLabel = editor.canvas
		.getByText( `Search label ${ SEARCH1_MARKER }`, { exact: false } )
		.first();
	await expect( searchLabel ).toBeVisible();
	await searchLabel.click();
}

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'up' | 'down'
) {
	await page.bringToFront();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'up' ? 'Move up' : 'Move down',
		} )
		.click();
}

async function dragSearchRowBeforeShared( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const searchRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: `Search label ${ SEARCH1_MARKER }` } )
		.first();
	const sharedRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: ARCHIVED_SHARED } )
		.first();

	await expect( searchRow ).toBeVisible();
	await expect( sharedRow ).toBeVisible();
	await searchRow.dragTo( sharedRow );
}

function isExactArchivedSplit( primaryBlocks: string[], secondaryBlocks: string[] ) {
	const good = [
		'Seed 953856 baseline paragraph.',
		'core/group',
		`core/search:Search label ${ SEARCH1_MARKER }`,
		ARCHIVED_SHARED,
		ARCHIVED_CP0,
		ARCHIVED_CP1,
		ARCHIVED_MARKER1,
		ARCHIVED_MARKER3,
		`core/search:Search label ${ SEARCH3_MARKER }`,
	];
	const bad = [
		'Seed 953856 baseline paragraph.',
		'core/group',
		`core/search:Search label ${ SEARCH1_MARKER }`,
		ARCHIVED_CP0,
		ARCHIVED_CP1,
		ARCHIVED_MARKER1,
		`core/search:${ ARCHIVED_MARKER1 }`,
		ARCHIVED_MARKER3,
		`core/search:Search label ${ SEARCH3_MARKER }`,
	];

	return (
		JSON.stringify( primaryBlocks ) === JSON.stringify( good ) &&
		JSON.stringify( secondaryBlocks ) === JSON.stringify( bad )
	) || (
		JSON.stringify( primaryBlocks ) === JSON.stringify( bad ) &&
		JSON.stringify( secondaryBlocks ) === JSON.stringify( good )
	);
}

function hasAnyCorruption( primaryBlocks: string[], secondaryBlocks: string[] ) {
	return (
		primaryBlocks.some( ( block ) => block === `core/search:${ ARCHIVED_MARKER1 }` ) ||
		secondaryBlocks.some( ( block ) => block === `core/search:${ ARCHIVED_MARKER1 }` ) ||
		primaryBlocks.filter( ( block ) => block.includes( `Search label ${ SEARCH1_MARKER }` ) ).length > 1 ||
		secondaryBlocks.filter( ( block ) => block.includes( `Search label ${ SEARCH1_MARKER }` ) ).length > 1 ||
		primaryBlocks.includes( ARCHIVED_SHARED ) !== secondaryBlocks.includes( ARCHIVED_SHARED )
	);
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
	scenario: 'move-up-four-times' | 'drag-before-shared';
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		attempt,
		reproducedAnyCorruption: false,
		reproducedExactArchivedSplit: false,
		scenario,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 953856 step 8 user 1 title 330057',
	} );
	result.postId = post.id;

	try {
		await loginPrimaryAdmin( page );
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickSearchBlock( page, editor );

		if ( scenario === 'move-up-four-times' ) {
			for ( let i = 0; i < 4; i++ ) {
				await moveSelectedBlock( page, editor, 'up' );
			}
		} else {
			await dragSearchRowBeforeShared( page );
		}

		try {
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-move' )
		);
		const { primaryBlocks, secondaryBlocks } = result.snapshots.at( -1 )!;
		result.reproducedExactArchivedSplit = isExactArchivedSplit(
			primaryBlocks,
			secondaryBlocks
		);
		result.reproducedAnyCorruption = hasAnyCorruption(
			primaryBlocks,
			secondaryBlocks
		);

		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		return result;
	} finally {
		writeResult( result );
		await deleteCreatedPost( requestUtils, post.id );
	}
}

for ( const scenario of [ 'move-up-four-times', 'drag-before-shared' ] as const ) {
	for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
		test( `${ scenario } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
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
		} );
	}
}
