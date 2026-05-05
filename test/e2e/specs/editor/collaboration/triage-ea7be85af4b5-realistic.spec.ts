import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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

type ScenarioName =
	| 'preseeded-search-insert-then-move'
	| 'exact-pre-move-state'
	| 'live-save-reload-insert-then-move';

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_EA7_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INSERTED_PARAGRAPH = 'Seed 951345 step 4 user 1 paragraph 5312';
const UPDATED_PARAGRAPH = 'Seed 951345 step 2 user 0 updated paragraph 158086';
const MULTIBYTE_HEADING = 'Seed 951345 multibyte heading';
const INSERTED_HEADING = 'Seed 951345 step 3 user 0 heading';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-951345-3-0-end';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-951345-3-0-end';
const SEARCH_BUTTON = 'Find rtc-save-search-option-marker-951345-3-0-end';
const SEARCH_LABEL = 'Search label rtc-save-search-option-marker-951345-3-0-end';
const SEARCH_PLACEHOLDER =
	'Search placeholder rtc-save-search-option-marker-951345-3-0-end';

const SAVED_SEARCH_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ INSERTED_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ MULTIBYTE_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ UPDATED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"${ SEARCH_BUTTON }","label":"${ SEARCH_LABEL }","placeholder":"${ SEARCH_PLACEHOLDER }"} /-->`,
].join( '\n' );

const EXACT_PRE_MOVE_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ INSERTED_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ MULTIBYTE_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ UPDATED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ INSERTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"${ SEARCH_BUTTON }","label":"${ SEARCH_LABEL }","placeholder":"${ SEARCH_PLACEHOLDER }"} /-->`,
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>x</p><cite>ab<em>b</em><strong>i</strong>t</cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
].join( '\n' );

const LIVE_START_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ INSERTED_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ MULTIBYTE_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ UPDATED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
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
			username: `rtcea7${ uniqueSuffix }`,
			email: `rtcea7+${ uniqueSuffix }@example.com`,
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

function countParagraphMatches( state: any, text: string ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.filter(
		( block: any ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === text
	).length;
}

function hasSearchBlock( state: any ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.some( ( block: any ) => block?.name === 'core/search' );
}

function hasSearchLossSymptom( primaryState: any, secondaryState: any ) {
	const primaryHasSearch = hasSearchBlock( primaryState );
	const secondaryHasSearch = hasSearchBlock( secondaryState );
	const primaryParagraphCopies = countParagraphMatches(
		primaryState,
		INSERTED_PARAGRAPH
	);
	const secondaryParagraphCopies = countParagraphMatches(
		secondaryState,
		INSERTED_PARAGRAPH
	);

	return (
		primaryHasSearch !== secondaryHasSearch &&
		( primaryParagraphCopies >= 2 || secondaryParagraphCopies >= 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	includeCrdtDocument = false
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument,
		timeout: 20000,
	} );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persisted ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
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
		persistedContent: persisted.content?.raw ?? '',
		persistedTitle: persisted.title?.raw ?? '',
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

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string,
	{ last = false }: { last?: boolean } = {}
) {
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } );
	await ( last ? locator.last() : locator.first() ).click();
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

async function saveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled( { timeout: 20000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20000 } );
}

async function insertParagraphBeforeSearch(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickParagraphByText( editor, page, CHECKPOINT_PARAGRAPH );
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function moveParagraphDownOnce(
	editor: Editor,
	page: Page,
	paragraphText: string
) {
	await clickParagraphByText( editor, page, paragraphText );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function appendCheckpointParagraphAndSearch(
	editor: Editor,
	page: Page
) {
	const lastParagraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last();
	await expect( lastParagraph ).toBeVisible();
	await lastParagraph.click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( CHECKPOINT_PARAGRAPH, { delay: 15 } );
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await slashInsert( page, 'search' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function reloadViewer(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils, true );
}

async function runScenario( {
	content,
	collaborationUtils,
	collaboratorUser,
	editor,
	name,
	page,
	requestUtils,
	runSteps,
	title,
}: {
	content: string;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: ScenarioName;
	page: Page;
	requestUtils: any;
	runSteps: ( args: {
		collaborationUtils: CollaborationUtilsClass;
		collaboratorEditor: Editor;
		collaboratorPage: Page;
		editor: Editor;
		page: Page;
		requestUtils: any;
		postId: number;
		result: ScenarioResult;
	} ) => Promise< void >;
	title: string;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils, true );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await runSteps( {
			collaborationUtils,
			collaboratorEditor,
			collaboratorPage,
			editor,
			page,
			requestUtils,
			postId: post.id,
			result,
		} );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

test( 'ea7 preseeded saved-search insert then move', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result = await runScenario( {
		content: SAVED_SEARCH_CONTENT,
		collaborationUtils,
		collaboratorUser,
		editor,
		name: 'preseeded-search-insert-then-move',
		page,
		requestUtils,
		runSteps: async ( {
			collaborationUtils: utils,
			collaboratorEditor,
			collaboratorPage,
			requestUtils: rq,
			postId,
			result: scenarioResult,
		} ) => {
			await insertParagraphBeforeSearch(
				collaboratorEditor,
				collaboratorPage,
				INSERTED_PARAGRAPH
			);
			await waitForSessionReady( utils );
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-insert' )
			);

			await moveParagraphDownOnce( editor, page, INSERTED_PARAGRAPH );
			try {
				await utils.waitForConvergence( { timeout: 15000 } );
			} catch ( error ) {
				scenarioResult.convergenceError = formatError( error );
			}
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-move' )
			);
			const finalSnapshot =
				scenarioResult.snapshots[ scenarioResult.snapshots.length - 1 ];
			scenarioResult.reproduced = hasSearchLossSymptom(
				( finalSnapshot as Snapshot ).primaryState,
				( finalSnapshot as Snapshot ).secondaryState
			);
		},
		title: CHECKPOINT_TITLE,
	} );

	expect( result.error ).toBeUndefined();
} );

test( 'ea7 exact pre-move state', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result = await runScenario( {
		content: EXACT_PRE_MOVE_CONTENT,
		collaborationUtils,
		collaboratorUser,
		editor,
		name: 'exact-pre-move-state',
		page,
		requestUtils,
		runSteps: async ( {
			collaborationUtils: utils,
			requestUtils: rq,
			postId,
			result: scenarioResult,
		} ) => {
			await moveParagraphDownOnce( editor, page, INSERTED_PARAGRAPH );
			try {
				await utils.waitForConvergence( { timeout: 15000 } );
			} catch ( error ) {
				scenarioResult.convergenceError = formatError( error );
			}
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-move' )
			);
			const finalSnapshot =
				scenarioResult.snapshots[ scenarioResult.snapshots.length - 1 ];
			scenarioResult.reproduced = hasSearchLossSymptom(
				( finalSnapshot as Snapshot ).primaryState,
				( finalSnapshot as Snapshot ).secondaryState
			);
		},
		title: CHECKPOINT_TITLE,
	} );

	expect( result.error ).toBeUndefined();
} );

test( 'ea7 live save reload insert then move', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );

	const result = await runScenario( {
		content: LIVE_START_CONTENT,
		collaborationUtils,
		collaboratorUser,
		editor,
		name: 'live-save-reload-insert-then-move',
		page,
		requestUtils,
		runSteps: async ( {
			collaborationUtils: utils,
			collaboratorEditor,
			collaboratorPage,
			requestUtils: rq,
			postId,
			result: scenarioResult,
		} ) => {
			await appendCheckpointParagraphAndSearch( editor, page );
			await typeTitle( editor, page, CHECKPOINT_TITLE );
			await saveDraft( page );
			await waitForSessionReady( utils, true );
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-save' )
			);

			await reloadViewer( collaboratorPage, utils );
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-reload' )
			);

			await insertParagraphBeforeSearch(
				collaboratorEditor,
				collaboratorPage,
				INSERTED_PARAGRAPH
			);
			await waitForSessionReady( utils );
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-insert' )
			);

			await moveParagraphDownOnce( editor, page, INSERTED_PARAGRAPH );
			try {
				await utils.waitForConvergence( { timeout: 15000 } );
			} catch ( error ) {
				scenarioResult.convergenceError = formatError( error );
			}
			scenarioResult.snapshots.push(
				await captureSnapshot( utils, rq, postId, 'after-move' )
			);
			const finalSnapshot =
				scenarioResult.snapshots[ scenarioResult.snapshots.length - 1 ];
			scenarioResult.reproduced = hasSearchLossSymptom(
				( finalSnapshot as Snapshot ).primaryState,
				( finalSnapshot as Snapshot ).secondaryState
			);
		},
		title: 'RTC ea7 live repro',
	} );

	expect( result.error ).toBeUndefined();
} );
