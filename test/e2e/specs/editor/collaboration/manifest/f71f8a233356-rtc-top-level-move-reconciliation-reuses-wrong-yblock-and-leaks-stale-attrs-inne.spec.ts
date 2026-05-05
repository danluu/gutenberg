import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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

type NormalizedState = {
	blocks: Array< {
		attributes?: Record< string, unknown >;
		innerBlocks?: NormalizedState['blocks'];
		name: string;
	} >;
	title: string;
};

type Result = {
	convergenceError?: string;
	error?: string;
	postId?: number;
	primaryState?: NormalizedState;
	reproduced: boolean;
	secondaryState?: NormalizedState;
};

const OUTPUT_DIR = process.env.RTC_F71F8A233356_OUTPUT_DIR;
const TITLE = 'RTC f71f8a233356 realistic repro';
const HEADING_TEXT = 'Seed 952609 multibyte heading';
const STABLE_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const APPENDED_PARAGRAPH = 'Seed 952609 step 0 user 1 paragraph 157583';
const NESTED_PARAGRAPH = 'Seed 952609 step 2 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 952609 step 2 user 0 nested heading';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
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
	`<p>${ STABLE_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ APPENDED_PARAGRAPH }</p>`,
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
			username: `rtcf71f${ uniqueSuffix }`,
			email: `rtcf71f+${ uniqueSuffix }@example.com`,
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

function writeResult( result: Result ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'realistic-attempt.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primaryState: primaryState as NormalizedState,
		secondaryState: secondaryState as NormalizedState,
	};
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

async function dragTopLevelBlockIntoGroup( page: Page, blockText: string ) {
	const overview = await openListView( page );
	await ensureGroupExpanded( page, overview );
	const sourceRow =
		blockText === APPENDED_PARAGRAPH
			? overview
					.getByRole( 'row', { level: 1 } )
					.filter( { hasText: 'Paragraph' } )
					.last()
			: overview
					.getByRole( 'gridcell' )
					.filter( { hasText: blockText } )
					.first();
	const targetRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } )
		.first();
	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function moveParagraphUp( page: Page, editor: Editor, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } )
		.click();
}

function stateShowsArchivedCorruption(
	state: NormalizedState | undefined
): boolean {
	const blocks = state?.blocks ?? [];
	if ( blocks.length !== 2 ) {
		return false;
	}

	const maybeCorruptedParagraph = blocks[ 1 ];
	return (
		blocks[ 0 ]?.name === 'core/paragraph' &&
		blocks[ 0 ]?.attributes?.content === STABLE_PARAGRAPH &&
		maybeCorruptedParagraph?.name === 'core/paragraph' &&
		maybeCorruptedParagraph?.attributes?.content === STABLE_PARAGRAPH &&
		( maybeCorruptedParagraph?.innerBlocks?.length ?? 0 ) === 4
	);
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic repro for f71f8a233356', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const result: Result = {
		reproduced: false,
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await dragTopLevelBlockIntoGroup( collaboratorPage, HEADING_TEXT );
		await waitForSessionReady( collaborationUtils );

		await dragTopLevelBlockIntoGroup(
			collaboratorPage,
			APPENDED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		try {
			await moveParagraphUp( page, editor, STABLE_PARAGRAPH );
			await waitForSessionReady( collaborationUtils );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		Object.assign( result, await getStates( collaborationUtils ) );
		result.reproduced =
			stateShowsArchivedCorruption( result.primaryState ) ||
			stateShowsArchivedCorruption( result.secondaryState );
		writeResult( result );

		if ( result.convergenceError ) {
			throw new Error( result.convergenceError );
		}
	} catch ( error ) {
		result.error = formatError( error );
		try {
			Object.assign( result, await getStates( collaborationUtils ) );
			result.reproduced =
				stateShowsArchivedCorruption( result.primaryState ) ||
				stateShowsArchivedCorruption( result.secondaryState );
		} catch {}
		writeResult( result );
		throw error;
	}
} );
