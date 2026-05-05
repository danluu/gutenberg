import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	reproduced: boolean;
	states: Array< {
		label: string;
		primary: unknown;
		secondary: unknown;
	} >;
};

const RESULT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-12-20260502T091028Z/.triage-watcher/signatures/202ccabd7496/realistic-results';
const TARGET_PARAGRAPH = 'Seed 952563 step 0 user 1 updated paragraph 570725';
const STEP3_PARAGRAPH = 'Seed 952563 step 3 user 1 paragraph 964027';
const STEP4_PARAGRAPH = 'Seed 952563 step 4 user 1 paragraph 974962';
const NESTED_PARAGRAPH = 'Seed 952563 step 1 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 952563 step 1 user 0 nested heading';
const TITLE = 'rtc-save-title-marker-952563-3-0-end';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP3_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP4_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ TARGET_PARAGRAPH }</p>`,
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
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table><tbody>',
	'<tr><td>initial row 1 A seed 952563 step 2 user 1</td><td>initial row 1 B seed 952563 step 2 user 1</td></tr>',
	'<tr><td>initial row 2 A seed 952563 step 2 user 1</td><td>initial row 2 B seed 952563 step 2 user 1</td></tr>',
	'</tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952563-3-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952563-3-0-end","showLabel":true,"placeholder":"Search placeholder rtc-save-search-option-marker-952563-3-0-end","buttonText":"Find rtc-save-search-option-marker-952563-3-0-end","buttonPosition":"button-inside"} /-->',
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
			username: `rtc202c${ uniqueSuffix }`,
			email: `rtc202c+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	return error instanceof Error ? error.stack ?? error.message : String( error );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	const [ primary, secondary ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return { label, primary, secondary };
}

async function openListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function ensureGroupExpanded( page: Page, overview: Locator ) {
	const collapsedGroup = overview
		.getByRole( 'link', { name: 'Group', expanded: false } )
		.first();
	if ( await collapsedGroup.isVisible().catch( () => false ) ) {
		await collapsedGroup.click();
		await page.keyboard.press( 'ArrowRight' );
	}
}

async function dragParagraphIntoGroup( page: Page, paragraphText: string ) {
	const overview = await openListView( page );
	await ensureGroupExpanded( page, overview );
	const sourceRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: paragraphText } )
		.first();
	const targetRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: NESTED_PARAGRAPH } )
		.first();
	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
}

function hasTargetCorruption( state: any ) {
	return ( state.blocks ?? [] ).some(
		( block: any ) =>
			block.name === 'core/paragraph' &&
			block.attributes?.content === STEP4_PARAGRAPH &&
			( block.innerBlocks?.length ?? 0 ) === 3
	);
}

async function runScenario( {
	afterReload,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	afterReload: boolean;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: afterReload ? 'reload-then-drag-into-group' : 'drag-into-group',
		reproduced: false,
		states: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		void collaboratorEditor;
		await waitForSessionReady( collaborationUtils );
		result.states.push( await captureState( collaborationUtils, 'initial' ) );

		if ( afterReload ) {
			await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
			await waitForSessionReady( collaborationUtils );
			result.states.push(
				await captureState( collaborationUtils, 'after-reload' )
			);
		}

		await dragParagraphIntoGroup( page, TARGET_PARAGRAPH );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalState = await captureState(
			collaborationUtils,
			afterReload ? 'after-reload-drag' : 'after-drag'
		);
		result.states.push( finalState );
		result.reproduced =
			hasTargetCorruption( finalState.primary ) ||
			hasTargetCorruption( finalState.secondary );
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

test( 'drag into group from saved state', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	const result = await runScenario( {
		afterReload: false,
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} );
	expect.soft( result.states.length ).toBeGreaterThan( 0 );
} );

test( 'reload then drag into group', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	const result = await runScenario( {
		afterReload: true,
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} );
	expect.soft( result.states.length ).toBeGreaterThan( 0 );
} );
