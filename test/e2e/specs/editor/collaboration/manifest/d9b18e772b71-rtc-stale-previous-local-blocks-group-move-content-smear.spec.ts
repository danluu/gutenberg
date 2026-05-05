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
	primarySummary: string[];
	secondarySummary: string[];
};

type Scenario = {
	id: string;
	initialContent: string;
	moveMethod: 'drag' | 'toolbar';
	prepareRemoteInsert: boolean;
};

type ScenarioResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	exactTargetShape: boolean;
	postId?: number;
	reproduced: boolean;
	scenarioId: string;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	process.env.RTC_D9B18E772B71_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/d9b18e772b71/realistic-results';
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_D9B18E772B71_ATTEMPTS ?? '3',
	10
);
const SHOULD_FAIL_ON_REPRO =
	process.env.RTC_D9B18E772B71_FAIL_ON_REPRO !== '0';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const END_OF_LINE_KEY =
	process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';

const TITLE = 'RTC seed 952949 initial title';
const UPDATED_TITLE = 'RTC seed 952949 step 2 user 1 title 701639';
const HEADING = 'Seed 952949 multibyte heading';
const EMOJI =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const ANOTHER =
	'Another paragraph exists so the top-level list is not degenerate.';
const NESTED_PARAGRAPH = 'Seed 952949 step 1 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 952949 step 1 user 1 nested heading';

const PRESEEDED_STEP0_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ANOTHER }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
].join( '\n' );

const PRESEEDED_STEP1_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI }</p>`,
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
	`<p>${ ANOTHER }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
].join( '\n' );

const EXPECTED_GOOD = [
	`core/paragraph:${ EMOJI }`,
	`core/paragraph:${ ANOTHER }`,
	`core/heading:${ HEADING }`,
	`core/group[content=null;nested=core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
];

const EXPECTED_CORRUPTED = [
	`core/paragraph:${ EMOJI }`,
	`core/group[content=${ ANOTHER };nested=]`,
	`core/paragraph:${ ANOTHER }`,
	`core/group[content=null;nested=core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
];

const SCENARIOS: Scenario[] = [
	{
		id: 'preseeded-step0-secondary-inserts-group-primary-toolbar-move',
		initialContent: PRESEEDED_STEP0_CONTENT,
		moveMethod: 'toolbar',
		prepareRemoteInsert: true,
	},
	{
		id: 'preseeded-step0-secondary-inserts-group-primary-drag',
		initialContent: PRESEEDED_STEP0_CONTENT,
		moveMethod: 'drag',
		prepareRemoteInsert: true,
	},
	{
		id: 'preseeded-step1-primary-toolbar-move',
		initialContent: PRESEEDED_STEP1_CONTENT,
		moveMethod: 'toolbar',
		prepareRemoteInsert: false,
	},
	{
		id: 'preseeded-step1-primary-drag',
		initialContent: PRESEEDED_STEP1_CONTENT,
		moveMethod: 'drag',
		prepareRemoteInsert: false,
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
			username: `rtcd9b1${ uniqueSuffix }`,
			email: `rtcd9b1+${ uniqueSuffix }@example.com`,
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
		path.join(
			OUTPUT_DIR,
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/group' ) {
			const nested = ( block?.innerBlocks ?? [] ).map(
				( inner: any ) =>
					`${ inner?.name ?? '' }:${ inner?.attributes?.content ?? '' }`
			);
			return `core/group[content=${ block?.attributes?.content ?? 'null' };nested=${ nested.join(
				'|'
			) }]`;
		}
		return `${ block?.name }:${ block?.attributes?.content ?? '' }`;
	} );
}

function matchesExpectedSplit(
	primarySummary: string[],
	secondarySummary: string[]
) {
	const primary = JSON.stringify( primarySummary );
	const secondary = JSON.stringify( secondarySummary );
	const expected = JSON.stringify( EXPECTED_GOOD );
	const corrupted = JSON.stringify( EXPECTED_CORRUPTED );

	return (
		( primary === expected && secondary === corrupted ) ||
		( primary === corrupted && secondary === expected )
	);
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
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
	] );

	return {
		label,
		primarySummary: summarizeState( primaryState ),
		secondarySummary: summarizeState( secondaryState ),
	};
}

async function clearTransientUi( page: Page ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await page.bringToFront();
	await clearTransientUi( page );
	const block = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
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

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 15 } );
	await expect( titleBox ).toContainText( title );
}

async function insertRemoteGroup(
	editor: Editor,
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.bringToFront();
	await clickBlockByText( editor, page, EMOJI );
	await page.keyboard.press( END_OF_LINE_KEY );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'group' );
	await page.keyboard.type( NESTED_PARAGRAPH, { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( NESTED_HEADING, { delay: 15 } );
	await waitForSessionReady( collaborationUtils );
	await typeTitle( editor, page, UPDATED_TITLE );
}

async function selectGroupInOverview( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const cells = overview.getByRole( 'gridcell' );
	const cellTexts = await cells.allTextContents();
	const groupIndex = cellTexts.findIndex( ( text ) => {
		const trimmed = text.trim();
		return trimmed === 'Group' || trimmed.startsWith( 'GroupBlock' );
	} );

	if ( groupIndex === -1 ) {
		throw new Error(
			`Could not locate Group in document overview: ${ JSON.stringify(
				cellTexts
			) }`
		);
	}

	const groupCell = cells.nth( groupIndex );
	await expect( groupCell ).toBeVisible();
	await groupCell.click();
	return { overview, cells, cellTexts, groupIndex };
}

async function moveGroupToBottomWithToolbar( editor: Editor, page: Page ) {
	for ( let index = 0; index < 2; index++ ) {
		await selectGroupInOverview( page );
		await editor.showBlockToolbar();
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } )
			.click();
	}
}

async function dragGroupBelowHeading( page: Page ) {
	const { cells, cellTexts, groupIndex } = await selectGroupInOverview( page );
	const headingIndex = cellTexts.findIndex(
		( text ) => text.trim() === HEADING
	);

	if ( groupIndex === -1 || headingIndex === -1 ) {
		throw new Error(
			`Could not locate Group/Heading in document overview: ${ JSON.stringify(
				cellTexts
			) }`
		);
	}

	await cells.nth( groupIndex ).dragTo( cells.nth( headingIndex ) );
}

async function deletePostIfPossible( requestUtils: any, postId?: number ) {
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
		// Cleanup should not mask triage signal.
	}
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
		exactTargetShape: false,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE } ${ scenario.id } attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await loginAsAdmin( page );
		await collaborationUtils.openPost( post.id );
		const {
			editor: secondaryEditor,
			page: secondaryPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		if ( scenario.prepareRemoteInsert ) {
			await insertRemoteGroup(
				secondaryEditor,
				secondaryPage,
				collaborationUtils
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-remote-insert' )
			);
		}

		if ( scenario.moveMethod === 'toolbar' ) {
			await moveGroupToBottomWithToolbar( editor, page );
		} else {
			await dragGroupBelowHeading( page );
		}

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error
					? error.stack ?? error.message
					: String( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-actions' )
		);
		const finalSnapshot = result.snapshots.at( -1 );
		result.exactTargetShape = finalSnapshot
			? matchesExpectedSplit(
					finalSnapshot.primarySummary,
					finalSnapshot.secondarySummary
			  )
			: false;
		result.reproduced = result.exactTargetShape;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-error' )
			);
			const finalSnapshot = result.snapshots.at( -1 );
			result.exactTargetShape = finalSnapshot
				? matchesExpectedSplit(
						finalSnapshot.primarySummary,
						finalSnapshot.secondarySummary
				  )
				: false;
			result.reproduced = result.exactTargetShape;
		} catch {}
	} finally {
		writeScenarioResult( result );
		await deletePostIfPossible( requestUtils, result.postId );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
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

			if ( result.reproduced && SHOULD_FAIL_ON_REPRO ) {
				throw new Error(
					`Realistic scenario reproduced the target divergence.\n${ result.convergenceError ?? '' }`
				);
			}
		} );
	}
}
