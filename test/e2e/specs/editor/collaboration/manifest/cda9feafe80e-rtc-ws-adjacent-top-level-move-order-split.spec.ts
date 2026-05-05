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

type MoveMode = 'baseline-down' | 'shared-up';
type ScenarioName =
	| 'sequential-primary-delete-second-then-baseline-down'
	| 'sequential-primary-delete-second-then-shared-up'
	| 'burst-primary-delete-second-then-baseline-down'
	| 'burst-primary-delete-second-then-shared-up';

type Snapshot = {
	label: string;
	primaryBlocks: string[];
	secondaryBlocks: string[];
};

type ScenarioResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

type Scenario = {
	moveMode: MoveMode;
	name: ScenarioName;
	waitAfterDelete: boolean;
};

const OUTPUT_DIR = process.env.RTC_CDA9_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_CDA9_ATTEMPTS ?? '4', 10 );
const WP_USERNAME = process.env.WP_USERNAME || 'admin';
const WP_PASSWORD = process.env.WP_PASSWORD || 'password';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953420 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953420 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASELINE = 'Seed 953420 baseline paragraph.';
const SECOND = 'Seed 953420 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';

const SCENARIOS: Scenario[] = [
	{
		name: 'sequential-primary-delete-second-then-baseline-down',
		moveMode: 'baseline-down',
		waitAfterDelete: true,
	},
	{
		name: 'sequential-primary-delete-second-then-shared-up',
		moveMode: 'shared-up',
		waitAfterDelete: true,
	},
	{
		name: 'burst-primary-delete-second-then-baseline-down',
		moveMode: 'baseline-down',
		waitAfterDelete: false,
	},
	{
		name: 'burst-primary-delete-second-then-shared-up',
		moveMode: 'shared-up',
		waitAfterDelete: false,
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

		await requestUtils.setupRest();
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
			username: `rtccda9${ uniqueSuffix }`,
			email: `rtccda9+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function writeResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.name }.attempt-${ result.attempt }.json`
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
	} catch {
		// Ignore cleanup failures so they do not mask repro results.
	}
}

function statesMatch( actual: string[], expected: string[] ) {
	return JSON.stringify( actual ) === JSON.stringify( expected );
}

function isExactSeedFamily(
	primaryBlocks: string[],
	secondaryBlocks: string[]
) {
	return (
		( statesMatch( primaryBlocks, [ BASELINE, SHARED ] ) &&
			statesMatch( secondaryBlocks, [ SHARED, BASELINE ] ) ) ||
		( statesMatch( primaryBlocks, [ SHARED, BASELINE ] ) &&
			statesMatch( secondaryBlocks, [ BASELINE, SHARED ] ) )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 40000 } );
	await collaborationUtils.waitForConvergence( { timeout: 40000 } );
}

async function getBlockTexts(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page );
	return state.blocks.map(
		( block ) =>
			typeof block.attributes?.content === 'string'
				? block.attributes.content
				: block.name
	);
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

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function loginPrimaryUser( page: Page ) {
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( WP_USERNAME );
	await page.locator( '#user_pass' ).fill( WP_PASSWORD );
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

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'up' | 'down'
) {
	await editor.showBlockToolbar();
	const moveButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'up' ? 'Move up' : 'Move down',
		} );
	await expect( moveButton ).toBeEnabled();
	await moveButton.click();
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
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		attempt,
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC cda9 realistic ${ scenario.name } ${ attempt }`,
		} );
		result.postId = post.id;

		await loginPrimaryUser( page );
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickBlockByText( editor, page, SECOND );
		await deleteSelectedBlock( page, editor );

		if ( scenario.waitAfterDelete ) {
			await waitForSessionReady( collaborationUtils );
		} else {
			await expect(
				editor.canvas.getByText( SECOND, { exact: false } )
			).not.toBeVisible( { timeout: 20000 } );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-delete' )
		);

		if ( scenario.moveMode === 'baseline-down' ) {
			await clickBlockByText( editor, page, BASELINE );
			await moveSelectedBlock( page, editor, 'down' );
		} else {
			await clickBlockByText( editor, page, SHARED );
			await moveSelectedBlock( page, editor, 'up' );
		}

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-move' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = isExactSeedFamily(
			finalSnapshot.primaryBlocks,
			finalSnapshot.secondaryBlocks
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeResult( result );
	await deleteCreatedPost( requestUtils, result.postId );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `cda9 realistic ${ scenario.name} attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const result = await runScenario( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );

			if ( result.reproduced ) {
				throw new Error(
					`Reproduced cda9 order split in ${ scenario.name } attempt ${ attempt }: ${ JSON.stringify(
						result.snapshots[ result.snapshots.length - 1 ]
					) }`
				);
			}
		} );
	}
}
