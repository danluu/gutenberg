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
	blocks: NormalizedBlock[];
	title: string;
};

type Scenario = {
	initialContent: string;
	liveSetup: boolean;
	name: string;
};

type ScenarioResult = {
	afterAction?: {
		primary: NormalizedState;
		secondary: NormalizedState;
	};
	beforeAction?: {
		primary: NormalizedState;
		secondary: NormalizedState;
	};
	converged: boolean;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: string;
};

const OUTPUT_DIR = process.env.RTC_D465F26F6B79_RESULT_DIR;

const BASELINE_PARAGRAPH = 'Seed 956512 baseline paragraph.';
const SECOND_PARAGRAPH =
	'Seed 956512 keeps a second paragraph for deletes and moves.';
const SHARED_PARAGRAPH = 'Shared editing target paragraph.';
const NESTED_PARAGRAPH = 'Seed 956512 step 0 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 956512 step 0 user 0 nested heading';
const USER_HEADING = 'Seed 956512 step 1 user 1 heading';

const BASE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRELOADED_CONTENT = [
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
	`<p>${ BASELINE_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":4} -->',
	`<h4 class="wp-block-heading">${ USER_HEADING }</h4>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		initialContent: PRELOADED_CONTENT,
		liveSetup: false,
		name: 'preloaded-overview-drag',
	},
	{
		initialContent: BASE_CONTENT,
		liveSetup: true,
		name: 'live-setup-overview-drag',
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
			username: `rtcd465${ uniqueSuffix }`,
			email: `rtcd465+${ uniqueSuffix }@example.com`,
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

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primary, secondary ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
	] );

	return { primary, secondary };
}

function countSharedParagraphs( state: NormalizedState ) {
	const visit = ( blocks: NormalizedBlock[] ) => {
		let count = 0;
		for ( const block of blocks ) {
			if ( block.attributes?.content === SHARED_PARAGRAPH ) {
				count++;
			}
			count += visit( block.innerBlocks ?? [] );
		}
		return count;
	};

	return visit( state.blocks );
}

function hasTopLevelSharedParagraph( state: NormalizedState ) {
	return state.blocks.some(
		( block ) =>
			block.name === 'core/paragraph' &&
			block.attributes?.content === SHARED_PARAGRAPH
	);
}

function hasNestedSharedParagraph( state: NormalizedState ) {
	return state.blocks.some(
		( block ) =>
			block.name === 'core/group' &&
			( block.innerBlocks ?? [] ).some(
				( inner ) =>
					inner.name === 'core/paragraph' &&
					inner.attributes?.content === SHARED_PARAGRAPH
			)
	);
}

function isBrokenShape( state: NormalizedState ) {
	return (
		countSharedParagraphs( state ) >= 2 &&
		hasTopLevelSharedParagraph( state ) &&
		hasNestedSharedParagraph( state )
	);
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const target = editor.canvas.getByText( text, { exact: true } ).first();
	await expect( target ).toBeVisible();
	await target.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function chooseInsertBefore( page: Page ) {
	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
		return;
	}

	await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
}

async function maybeClickGroupVariation( editor: Editor ) {
	const groupButton = editor.canvas.getByRole( 'button', {
		name: 'Group: Gather blocks in a container.',
	} );
	if ( await groupButton.isVisible().catch( () => false ) ) {
		await groupButton.click();
	}
}

async function insertGroupBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseInsertBefore( page );
	await page.keyboard.type( '/group', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	const groupOption = page.getByRole( 'option', {
		name: 'Group',
		exact: true,
	} );
	if ( await groupOption.isVisible().catch( () => false ) ) {
		await groupOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}

	await maybeClickGroupVariation( editor );
	await page.keyboard.type( NESTED_PARAGRAPH, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	const headingOption = page.getByRole( 'option', {
		name: 'Heading',
		exact: true,
	} );
	if ( await headingOption.isVisible().catch( () => false ) ) {
		await headingOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}

	await page.keyboard.type( NESTED_HEADING, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function insertHeadingBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseInsertBefore( page );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	const headingOption = page.getByRole( 'option', {
		name: 'Heading',
		exact: true,
	} );
	if ( await headingOption.isVisible().catch( () => false ) ) {
		await headingOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}

	await page.keyboard.type( headingText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function openDocumentOverview( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function dragParagraphIntoGroup(
	page: Page,
	paragraphText: string
) {
	const overview = await openDocumentOverview( page );
	const groupRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } )
		.first();
	const paragraphRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: paragraphText } )
		.first();
	await expect( groupRow ).toBeVisible();
	await expect( paragraphRow ).toBeVisible();
	await paragraphRow.dragTo( groupRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ) {
	const result: ScenarioResult = {
		converged: true,
		reproduced: false,
		scenario: scenario.name,
	};

	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC d465 realistic ${ scenario.name }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		if ( scenario.liveSetup ) {
			await insertGroupBeforeText(
				editor,
				page,
				BASELINE_PARAGRAPH
			);
			await waitForSessionReady( collaborationUtils );

			await insertHeadingBeforeText(
				collaboratorEditor,
				collaboratorPage,
				SECOND_PARAGRAPH,
				USER_HEADING
			);
			await waitForSessionReady( collaborationUtils );
		}

		result.beforeAction = await captureStates( collaborationUtils );
		await dragParagraphIntoGroup( page, SHARED_PARAGRAPH );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
			result.converged = true;
		} catch ( error ) {
			result.converged = false;
			result.error = formatError( error );
		}

		result.afterAction = await captureStates( collaborationUtils );
		const primary = result.afterAction.primary;
		const secondary = result.afterAction.secondary;
		const statesMatch =
			JSON.stringify( primary ) === JSON.stringify( secondary );
		result.reproduced =
			! result.converged ||
			isBrokenShape( primary ) ||
			isBrokenShape( secondary ) ||
			! statesMatch;
	} catch ( error ) {
		result.error = formatError( error );
		result.converged = false;
		try {
			result.afterAction = await captureStates( collaborationUtils );
			result.reproduced =
				isBrokenShape( result.afterAction.primary ) ||
				isBrokenShape( result.afterAction.secondary );
		} catch {
			// Ignore secondary capture failures.
		}
	}

	writeScenarioResult( result );
}

test.describe( 'RTC triage d465f26f6b79 realistic repro search', () => {
	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			await runScenario( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );
		} );
	}
} );
