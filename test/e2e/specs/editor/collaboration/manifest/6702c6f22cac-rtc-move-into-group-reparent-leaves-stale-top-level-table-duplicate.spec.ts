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
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-12-20260502T091028Z/.triage-watcher/signatures/6702c6f22cac/realistic-results';
const TITLE = 'rtc-6702c6f22cac-realistic';

const INITIAL_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952759 step 0 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952759 step 1 user 0 heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>This is the tail paragraph used in the shared baseline.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952759 step 6 user 0 paragraph 662862</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>Seed 952759 pullquote</p></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952759-3-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952759-3-1-end","showLabel":true,"placeholder":"Search placeholder rtc-save-search-option-marker-952759-3-1-end","buttonText":"Find rtc-save-search-option-marker-952759-3-1-end","buttonPosition":"button-inside"} /-->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table><tbody>',
	'<tr><td>initial row 1 A seed 952759 step 4 user 0</td><td>initial row 1 B seed 952759 step 4 user 0</td></tr>',
	'<tr><td>initial row 2 A seed 952759 step 4 user 0</td><td>initial row 2 B seed 952759 step 4 user 0</td></tr>',
	'</tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	'<p><strong>alpha</strong> beta</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952759 step 7 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952759 step 7 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
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
			username: `rtc6702${ uniqueSuffix }`,
			email: `rtc6702+${ uniqueSuffix }@example.com`,
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

async function dragTableIntoLastGroup( page: Page ) {
	const overview = await openListView( page );

	const rows = overview.getByRole( 'row' );
	const tableRow = rows.filter( { hasText: 'Table' } ).first();
	const targetGroupRow = rows.filter( { hasText: 'Group' } ).last();

	await expect( tableRow ).toBeVisible();
	await expect( targetGroupRow ).toBeVisible();
	await tableRow.dragTo( targetGroupRow );
}

function countTopLevelTables( blocks: any[] ) {
	return blocks.filter( ( block ) => block?.name === 'core/table' ).length;
}

function countNestedTables( blocks: any[] ) {
	const visit = ( innerBlocks: any[] ) =>
		innerBlocks.reduce( ( count, block ) => {
			const self = block?.name === 'core/table' ? 1 : 0;
			return self + visit( block?.innerBlocks ?? [] );
		}, 0 );

	return visit( blocks );
}

function hasDuplicatedMovedTable( state: any ) {
	const blocks = state?.blocks ?? [];
	return countTopLevelTables( blocks ) === 1 && countNestedTables( blocks ) >= 1;
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
		name: afterReload ? 'reload-then-drag-table-into-group' : 'drag-table-into-group',
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
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );
		result.states.push( await captureState( collaborationUtils, 'initial' ) );

		if ( afterReload ) {
			await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
			await waitForSessionReady( collaborationUtils );
			result.states.push(
				await captureState( collaborationUtils, 'after-reload' )
			);
		}

		await dragTableIntoLastGroup( page );

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
			hasDuplicatedMovedTable( finalState.primary ) ||
			hasDuplicatedMovedTable( finalState.secondary );
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

test( 'drag table into group', async ( {
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

test( 'reload then drag table into group', async ( {
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
