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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'RTC seed 952938 initial title';
const STRUCTURED_HEADING = 'Seed 952938 structured content';
const ORIGINAL_GROUP_TEXT = 'Nested group paragraph alpha.';
const INSERTED_GROUP_PARAGRAPH = 'Seed 952938 step 0 user 1 nested paragraph';
const INSERTED_GROUP_HEADING = 'Seed 952938 step 0 user 1 nested heading';

const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952938 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952938 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952938 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item three for sync coverage.</li>',
	'<!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
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
			username: `rtcf659${ uniqueSuffix }`,
			email: `rtcf659+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
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

async function clickCanvasText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function showBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertSeededGroupBeforeOriginal(
	page: Page,
	editor: Editor
) {
	await page.bringToFront();
	await clickCanvasText( editor, page, ORIGINAL_GROUP_TEXT );
	await showBlockOptions( page, editor );

	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( '/group', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const groupVariation = page.getByRole( 'button', { name: 'Group' } );
	if ( await groupVariation.isVisible().catch( () => false ) ) {
		await groupVariation.click();
	}

	const groups = editor.canvas.locator( '[data-type="core/group"]' );
	await expect( groups ).toHaveCount( 2 );

	const firstGroup = groups.first();
	const defaultAppender = firstGroup.getByRole( 'button', {
		name: 'Add default block',
	} );
	if ( await defaultAppender.isVisible().catch( () => false ) ) {
		await defaultAppender.click();
	}

	await page.keyboard.type( INSERTED_GROUP_PARAGRAPH, { delay: 20 } );
	await expect(
		editor.canvas.getByText( INSERTED_GROUP_PARAGRAPH, { exact: false } )
	).toBeVisible();

	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( INSERTED_GROUP_HEADING, { delay: 20 } );

	await expect(
		editor.canvas.getByText( INSERTED_GROUP_HEADING, { exact: false } )
	).toBeVisible();
}

async function selectFirstGroupInListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const firstGroupRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } )
		.first();
	await expect( firstGroupRow ).toBeVisible();
	await firstGroupRow.click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
}

async function dragFirstGroupBelowSecond( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const groupRows = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } );
	await expect( groupRows ).toHaveCount( 2 );
	await groupRows.first().dragTo( groupRows.nth( 1 ) );
}

function hasDuplicateInsertedGroup( state: any ) {
	if ( ! state || ! Array.isArray( state.blocks ) ) {
		return false;
	}

	const matchingGroups = state.blocks.filter(
		( block: any ) =>
			block?.name === 'core/group' &&
			Array.isArray( block.innerBlocks ) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.attributes?.content === INSERTED_GROUP_PARAGRAPH
			) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.attributes?.content === INSERTED_GROUP_HEADING
			)
	);

	return matchingGroups.length >= 2;
}

function lostOriginalGroup( state: any ) {
	if ( ! state || ! Array.isArray( state.blocks ) ) {
		return false;
	}

	return ! state.blocks.some(
		( block: any ) =>
			block?.name === 'core/group' &&
			Array.isArray( block.innerBlocks ) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.attributes?.content === 'Nested group paragraph alpha.'
			) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.attributes?.content === 'Nested group paragraph beta.'
			)
	);
}

test.describe.configure( { mode: 'serial' } );

test( 'preseeded-group-move-down-on-other-collaborator', async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	page,
	editor,
} ) => {
	test.setTimeout( 180000 );

	const result: ScenarioResult = {
		name: 'preseeded-group-move-down-on-other-collaborator',
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await page.bringToFront();
		await clickCanvasText( collaboratorEditor, collaboratorPage, INSERTED_GROUP_PARAGRAPH );
		await selectFirstGroupInListView( page );
		await moveSelectedBlockDown( page, editor );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-move' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-wait' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			hasDuplicateInsertedGroup( ( finalSnapshot as any ).primaryState ) ||
			hasDuplicateInsertedGroup( ( finalSnapshot as any ).secondaryState ) ||
			lostOriginalGroup( ( finalSnapshot as any ).primaryState ) ||
			lostOriginalGroup( ( finalSnapshot as any ).secondaryState );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	} finally {
		writeScenarioResult( result );
	}
} );

test( 'preseeded-group-drag-below-second-on-other-collaborator', async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	page,
} ) => {
	test.setTimeout( 180000 );

	const result: ScenarioResult = {
		name: 'preseeded-group-drag-below-second-on-other-collaborator',
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await page.bringToFront();
		await dragFirstGroupBelowSecond( page );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-drag' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-wait' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			hasDuplicateInsertedGroup( ( finalSnapshot as any ).primaryState ) ||
			hasDuplicateInsertedGroup( ( finalSnapshot as any ).secondaryState ) ||
			lostOriginalGroup( ( finalSnapshot as any ).primaryState ) ||
			lostOriginalGroup( ( finalSnapshot as any ).secondaryState );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	} finally {
		writeScenarioResult( result );
	}
} );
