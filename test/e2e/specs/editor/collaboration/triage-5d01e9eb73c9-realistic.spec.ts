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
} from './fixtures/collaboration-utils';

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
	initialContent: string;
	name: string;
	saveAndReloadBeforeMove: boolean;
	setup: ( args: {
		collaborationUtils: CollaborationUtilsClass;
		primaryEditor: Editor;
		primaryPage: Page;
		secondaryEditor: Editor;
		secondaryPage: Page;
	} ) => Promise< void >;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_5D01_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'RTC seed 952922 initial title';
const STRUCTURED_HEADING = 'Seed 952922 structured content';
const QUOTE_TEXT = 'Nested update seed 952922 step 0 user 1 264840';
const INSERTED_GROUP_PARAGRAPH = 'Seed 952922 step 2 user 1 paragraph 220953';

const BASE_2_INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STRUCTURED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item one for block movement.</li>',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
	'',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
].join( '\n' );

const EXACT_PRE_MOVE_CONTENT = [
	'<!-- wp:quote -->',
	`<blockquote class="wp-block-quote"><p>${ QUOTE_TEXT }</p><cite>RTC Fuzzer</cite></blockquote>`,
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STRUCTURED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ INSERTED_GROUP_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item one for block movement.</li>',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
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
			username: `rtc5d01${ uniqueSuffix }`,
			email: `rtc5d01+${ uniqueSuffix }@example.com`,
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

function getTopLevelBlocks( state: unknown ): NormalizedBlock[] {
	return ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
}

function findTopLevelHeading( state: unknown ) {
	return getTopLevelBlocks( state ).find(
		( block ) =>
			block.name === 'core/heading' &&
			block.attributes?.content === STRUCTURED_HEADING
	);
}

function countTopLevelHeadings( state: unknown ) {
	return getTopLevelBlocks( state ).filter(
		( block ) =>
			block.name === 'core/heading' &&
			block.attributes?.content === STRUCTURED_HEADING
	).length;
}

function findTopLevelGroup( state: unknown ) {
	return getTopLevelBlocks( state ).find( ( block ) => block.name === 'core/group' );
}

function blockContainsParagraph( block: NormalizedBlock | undefined, text: string ) {
	if ( ! block ) {
		return false;
	}

	const innerBlocks = block.innerBlocks ?? [];
	return innerBlocks.some(
		( innerBlock ) =>
			innerBlock.name === 'core/paragraph' &&
			innerBlock.attributes?.content === text
	);
}

function hasTargetCorruption( state: unknown ) {
	const heading = findTopLevelHeading( state );
	const group = findTopLevelGroup( state );

	return (
		( heading?.innerBlocks?.length ?? 0 ) > 0 &&
		countTopLevelHeadings( state ) >= 2 &&
		blockContainsParagraph( heading, INSERTED_GROUP_PARAGRAPH ) &&
		blockContainsParagraph( group, INSERTED_GROUP_PARAGRAPH )
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

async function replaceRichTextSelection(
	page: Page,
	text: string
) {
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text, { delay: 20 } );
}

async function replaceQuoteText( editor: Editor, page: Page ) {
	await clickCanvasText(
		editor,
		page,
		'Quoted content for merge and persistence checks.'
	);
	await replaceRichTextSelection( page, QUOTE_TEXT );
	await expect( editor.canvas.getByText( QUOTE_TEXT ) ).toBeVisible();
}

async function moveQuoteToTop( editor: Editor, page: Page ) {
	await clearTransientUi( page, editor );
	await editor.canvas.locator( '[data-type="core/quote"]' ).first().click();

	for ( let index = 0; index < 3; index++ ) {
		await editor.showBlockToolbar();
		const moveUp = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } );
		await expect( moveUp ).toBeEnabled();
		await moveUp.click();
	}
}

async function insertParagraphBeforeAlpha(
	editor: Editor,
	page: Page
) {
	await clickCanvasText( editor, page, 'Nested group paragraph alpha.' );
	await showBlockOptions( page, editor );

	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( INSERTED_GROUP_PARAGRAPH, { delay: 20 } );
	await expect( editor.canvas.getByText( INSERTED_GROUP_PARAGRAPH ) ).toBeVisible();
}

async function moveStructuredHeadingToBottom(
	editor: Editor,
	page: Page
) {
	await clickCanvasText( editor, page, STRUCTURED_HEADING );

	for ( let index = 0; index < 2; index++ ) {
		await editor.showBlockToolbar();
		const moveDown = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } );
		await expect( moveDown ).toBeEnabled();
		await moveDown.click();
	}
}

async function reloadViewerAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils, true );
}

const SCENARIOS: Scenario[] = [
	{
		name: 'preseeded-toolbar-move-down',
		initialContent: EXACT_PRE_MOVE_CONTENT,
		saveAndReloadBeforeMove: false,
		setup: async () => {},
	},
	{
		name: 'live-rebuild-toolbar-move-down',
		initialContent: BASE_2_INITIAL_CONTENT,
		saveAndReloadBeforeMove: false,
		setup: async ( { collaborationUtils, secondaryEditor, secondaryPage } ) => {
			await secondaryPage.bringToFront();
			await replaceQuoteText( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
			await moveQuoteToTop( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
			await insertParagraphBeforeAlpha( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
		},
	},
	{
		name: 'live-rebuild-save-reload-toolbar-move-down',
		initialContent: BASE_2_INITIAL_CONTENT,
		saveAndReloadBeforeMove: true,
		setup: async ( { collaborationUtils, secondaryEditor, secondaryPage } ) => {
			await secondaryPage.bringToFront();
			await replaceQuoteText( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
			await moveQuoteToTop( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
			await insertParagraphBeforeAlpha( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils );
		},
	},
];

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	};
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: scenario.initialContent,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: secondaryEditor, page: secondaryPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = ( collaborationUtils as any ).editor as Editor;
		const primaryPage = collaborationUtils.allPages[ 0 ];

		await waitForSessionReady( collaborationUtils, true );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await scenario.setup( {
			collaborationUtils,
			primaryEditor,
			primaryPage,
			secondaryEditor,
			secondaryPage,
		} );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-setup'
			)
		);

		if ( scenario.saveAndReloadBeforeMove ) {
			await secondaryPage.bringToFront();
			await secondaryEditor.saveDraft();
			await waitForSessionReady( collaborationUtils, true );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-save'
				)
			);

			await reloadViewerAndWait( primaryPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-reload'
				)
			);
		}

		await primaryPage.bringToFront();
		await moveStructuredHeadingToBottom( primaryEditor, primaryPage );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-move-action'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-final-wait'
			)
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			hasTargetCorruption( finalSnapshot.primaryState ) ||
			hasTargetCorruption( finalSnapshot.secondaryState );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			requestUtils: requestUtils as any,
			scenario,
		} );

		expect( result.snapshots.length ).toBeGreaterThan( 0 );
	} );
}
