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

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type Scenario = {
	name: string;
	reloadTarget: 'none' | 'primary' | 'collaborator';
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	familyShapeReproduced: boolean;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_7EB_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TITLE = 'rtc-save-title-marker-953336-2-1-end';
const STEP_0_USER_1 = 'Seed 953336 step 0 user 1 concurrent paragraph 823861';
const STEP_0_USER_0 = 'Seed 953336 step 0 user 0 concurrent paragraph 288211';
const STEP_4_USER_1 = 'Seed 953336 step 4 user 1 concurrent paragraph 770817';
const STEP_4_USER_0 = 'Seed 953336 step 4 user 0 concurrent paragraph 371104';
const STEP_5_HEADING = 'Seed 953336 step 5 user 1 heading';
const STEP_2_PARAGRAPH = 'Seed 953336 step 2 user 1 paragraph 934955';
const INITIAL_NESTED_PARAGRAPH = 'Seed 953336 step 1 user 1 nested paragraph';
const NESTED_PARAGRAPH = 'Nested update seed 953336 step 3 user 1 997472';
const NESTED_HEADING = 'Seed 953336 step 1 user 1 nested heading';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953336-2-1-end';
const SEARCH_LABEL =
	'Search label rtc-save-search-option-marker-953336-2-1-end';
const HISTORYFUL_INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const SAVED_CHECKPOINT_INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP_0_USER_1 }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP_0_USER_0 }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ INITIAL_NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP_2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953336-2-1-end","label":"Search label rtc-save-search-option-marker-953336-2-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953336-2-1-end","showLabel":true} /-->',
].join( '\n' );

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 953336 step 5 user 1 heading</h4>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 step 0 user 1 concurrent paragraph 823861</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 step 0 user 0 concurrent paragraph 288211</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested update seed 953336 step 3 user 1 997472</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953336 step 1 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP_2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953336-2-1-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953336-2-1-end","label":"Search label rtc-save-search-option-marker-953336-2-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953336-2-1-end","showLabel":true} /-->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 step 4 user 1 concurrent paragraph 770817</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953336 step 4 user 0 concurrent paragraph 371104</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'direct-move-group-down-five-times',
		reloadTarget: 'none',
	},
	{
		name: 'reload-primary-then-move-group-down-five-times',
		reloadTarget: 'primary',
	},
	{
		name: 'reload-collaborator-then-move-group-down-five-times',
		reloadTarget: 'collaborator',
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
			username: `rtc7eb${ uniqueSuffix }`,
			email: `rtc7eb+${ uniqueSuffix }@example.com`,
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

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			params?: Record< string, string >;
			path: string;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		requestUtils.rest< {
			content?: { raw?: string };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw',
			},
		} ),
	] );

	return {
		label,
		persistedContent: persistedPost.content?.raw ?? '',
		persistedTitle: persistedPost.title?.raw ?? '',
		primaryState,
		secondaryState,
	};
}

async function openListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickCanvasText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	const target = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( target ).toBeVisible();
	await target.click();
}

async function replaceRichTextSelection( page: Page, text: string ) {
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text, { delay: 15 } );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', {
				exact: true,
				name: 'Block Inserter',
			} )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function selectGroupBlockInListView( page: Page ) {
	const overview = await openListView( page );
	const row = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } )
		.first();
	await expect( row ).toBeVisible();
	await row.click();
}

async function selectListViewRow( page: Page, text: string ) {
	const overview = await openListView( page );
	const row = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: text } )
		.first();
	await expect( row ).toBeVisible();
	await row.click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function insertGroupAtEndWithNestedContent(
	editor: Editor,
	page: Page,
	paragraphText: string,
	headingText: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( paragraphText, { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect( editor.canvas.getByText( headingText ) ).toBeVisible();
	await page.keyboard.press( 'Escape' );
}

async function insertSearchAtEnd( editor: Editor, page: Page ) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await insertBlockFromInserter( page, 'Search' );
	await expect( editor.canvas.getByRole( 'searchbox' ).first() ).toBeVisible();
	await page.keyboard.press( 'Escape' );
}

async function setTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', { name: 'Add title' } );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( title, { delay: 15 } );
	await expect( titleBox ).toContainText( title );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addHeadingBeforeSelected(
	page: Page,
	editor: Editor,
	headingText: string,
	level = 4
) {
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( '/heading', { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+${ level }` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect( editor.canvas.getByText( headingText ) ).toBeVisible();
}

async function addParagraphAfterSelected(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect( editor.canvas.getByText( paragraphText ) ).toBeVisible();
}

async function updateParagraphText(
	editor: Editor,
	page: Page,
	previousText: string,
	nextText: string
) {
	await clickCanvasText( editor, page, previousText );
	await replaceRichTextSelection( page, nextText );
	await expect( editor.canvas.getByText( nextText ) ).toBeVisible();
}

async function moveSelectedBlockDown(
	page: Page,
	editor: Editor,
	count: number
) {
	for ( let index = 0; index < count; index++ ) {
		await editor.showBlockToolbar();
		const moveDown = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } );
		await expect( moveDown ).toBeEnabled();
		await moveDown.click();
	}
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

function countTopLevelBlocksByName( state: unknown, name: string ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.filter( ( block ) => block.name === name ).length;
}

function hasGhostGroupWithParagraphContent( state: unknown ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.some(
		( block ) =>
			block.name === 'core/group' &&
			typeof block.attributes?.content === 'string' &&
			block.attributes.content.length > 0
	);
}

function hasSearchContentCorruption( state: unknown ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.some(
		( block ) =>
			block.name === 'core/search' &&
			typeof block.attributes?.content === 'string'
	);
}

function hasFailureFamilyShape( primaryState: unknown, secondaryState: unknown ) {
	return (
		countTopLevelBlocksByName( primaryState, 'core/group' ) > 1 ||
		countTopLevelBlocksByName( secondaryState, 'core/group' ) > 1 ||
		hasGhostGroupWithParagraphContent( primaryState ) ||
		hasGhostGroupWithParagraphContent( secondaryState ) ||
		hasSearchContentCorruption( primaryState ) ||
		hasSearchContentCorruption( secondaryState )
	);
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
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		familyShapeReproduced: false,
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: PRESEEDED_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		if ( scenario.reloadTarget === 'primary' ) {
			await reloadPageAndWait( page, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-primary-reload'
				)
			);
		} else if ( scenario.reloadTarget === 'collaborator' ) {
			await reloadPageAndWait( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-collaborator-reload'
				)
			);
		}

		await selectGroupBlockInListView( page );
		await moveSelectedBlockDown( page, editor, 5 );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.convergenceError = formatError( error );
			const snapshot = await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-failed-convergence'
			);
			result.snapshots.push( snapshot );
			result.familyShapeReproduced = hasFailureFamilyShape(
				snapshot.primaryState,
				snapshot.secondaryState
			);
			return result;
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-convergence'
			)
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-exception'
				)
			);
		} catch {}
		return result;
	}
}

async function runHistoryfulScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		familyShapeReproduced: false,
		name: 'historyful-save-then-move-group',
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: HISTORYFUL_INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: '',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await collaboratorPage.bringToFront();
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			STEP_0_USER_1
		);
		await page.bringToFront();
		await appendParagraphAtEnd( editor, page, STEP_0_USER_0 );
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await insertGroupAtEndWithNestedContent(
			collaboratorEditor,
			collaboratorPage,
			INITIAL_NESTED_PARAGRAPH,
			NESTED_HEADING
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			STEP_2_PARAGRAPH
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			CHECKPOINT_PARAGRAPH
		);
		await insertSearchAtEnd( collaboratorEditor, collaboratorPage );
		await setTitle( collaboratorEditor, collaboratorPage, TITLE );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'before-save'
			)
		);

		await collaboratorEditor.saveDraft();
		await Promise.all(
			collaborationUtils.allPages.map( ( currentPage ) =>
				collaborationUtils.waitForEntityReadyAndSaveSettled( currentPage, {
					timeout: 20000,
				} )
			)
		);
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await updateParagraphText(
			collaboratorEditor,
			collaboratorPage,
			INITIAL_NESTED_PARAGRAPH,
			NESTED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			STEP_4_USER_1
		);
		await page.bringToFront();
		await appendParagraphAtEnd( editor, page, STEP_4_USER_0 );
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await clickCanvasText(
			collaboratorEditor,
			collaboratorPage,
			'Shared editing target paragraph.'
		);
		await addHeadingBeforeSelected(
			collaboratorPage,
			collaboratorEditor,
			STEP_5_HEADING
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'before-move'
			)
		);

		await page.bringToFront();
		await selectGroupBlockInListView( page );
		await moveSelectedBlockDown( page, editor, 5 );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.convergenceError = formatError( error );
			const snapshot = await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-failed-convergence'
			);
			result.snapshots.push( snapshot );
			result.familyShapeReproduced = hasFailureFamilyShape(
				snapshot.primaryState,
				snapshot.secondaryState
			);
			return result;
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-convergence'
		);
		result.snapshots.push( finalSnapshot );
		result.familyShapeReproduced = hasFailureFamilyShape(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-exception'
				)
			);
		} catch {}
		return result;
	}
}

async function runPostSaveLiveEditsScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		familyShapeReproduced: false,
		name: 'preseed-checkpoint-save-then-live-edits',
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: SAVED_CHECKPOINT_INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: '',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await collaboratorPage.bringToFront();
		await collaboratorEditor.saveDraft();
		await Promise.all(
			collaborationUtils.allPages.map( ( currentPage ) =>
				collaborationUtils.waitForEntityReadyAndSaveSettled( currentPage, {
					timeout: 20000,
				} )
			)
		);
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await updateParagraphText(
			collaboratorEditor,
			collaboratorPage,
			INITIAL_NESTED_PARAGRAPH,
			NESTED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await selectListViewRow( collaboratorPage, 'Search' );
		await addParagraphAfterSelected(
			collaboratorPage,
			collaboratorEditor,
			STEP_4_USER_1
		);
		await waitForSessionReady( collaborationUtils );

		await page.bringToFront();
		await clickCanvasText( editor, page, STEP_4_USER_1 );
		await addParagraphAfterSelected( page, editor, STEP_4_USER_0 );
		await waitForSessionReady( collaborationUtils );

		await collaboratorPage.bringToFront();
		await clickCanvasText(
			collaboratorEditor,
			collaboratorPage,
			'Shared editing target paragraph.'
		);
		await addHeadingBeforeSelected(
			collaboratorPage,
			collaboratorEditor,
			STEP_5_HEADING
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'before-move'
			)
		);

		await page.bringToFront();
		await selectGroupBlockInListView( page );
		await moveSelectedBlockDown( page, editor, 5 );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.convergenceError = formatError( error );
			const snapshot = await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-failed-convergence'
			);
			result.snapshots.push( snapshot );
			result.familyShapeReproduced = hasFailureFamilyShape(
				snapshot.primaryState,
				snapshot.secondaryState
			);
			return result;
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-convergence'
		);
		result.snapshots.push( finalSnapshot );
		result.familyShapeReproduced = hasFailureFamilyShape(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-exception'
				)
			);
		} catch {}
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );
		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
			scenario,
		} );
		writeScenarioResult( result );
		expect( result.error ).toBeUndefined();
	} );
}

test( 'historyful-save-then-move-group', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );
	const result = await runHistoryfulScenario( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} );
	writeScenarioResult( result );
	expect( result.error ).toBeUndefined();
} );

test( 'preseed-checkpoint-save-then-live-edits', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );
	const result = await runPostSaveLiveEditsScenario( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} );
	writeScenarioResult( result );
	expect( result.error ).toBeUndefined();
} );
