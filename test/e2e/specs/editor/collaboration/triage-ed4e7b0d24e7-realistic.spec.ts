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

type Scenario = {
	initialContent: string;
	insertPullquote: boolean;
	name: string;
	reloadBeforePullquote: boolean;
};

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	corruptedStateFound: boolean;
	error?: string;
	expectedStateFound: boolean;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_ED4E_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'RTC seed 953941 initial title';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const ANOTHER_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const HEADING = 'Seed 953941 multibyte heading';
const GROUP_PARAGRAPH = 'Seed 953941 step 2 user 1 nested paragraph';
const GROUP_HEADING = 'Seed 953941 step 2 user 1 nested heading';

const STEP_2_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ ANOTHER_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ GROUP_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ GROUP_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );

const STEP_3_CONTENT = [
	STEP_2_CONTENT,
	'',
	'<!-- wp:pullquote {"value":"x","citation":"a<strong>it</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>x</p><cite>a<strong>it</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'preseeded-step3-toolbar-move-down',
		initialContent: STEP_3_CONTENT,
		insertPullquote: false,
		reloadBeforePullquote: false,
	},
	{
		name: 'preseeded-step2-pullquote-toolbar-move-down',
		initialContent: STEP_2_CONTENT,
		insertPullquote: true,
		reloadBeforePullquote: false,
	},
	{
		name: 'preseeded-step2-reload-pullquote-toolbar-move-down',
		initialContent: STEP_2_CONTENT,
		insertPullquote: true,
		reloadBeforePullquote: true,
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
			username: `rtced4e${ uniqueSuffix }`,
			email: `rtced4e+${ uniqueSuffix }@example.com`,
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

function getTopLevelParagraphContents( state: unknown ) {
	return getTopLevelBlocks( state )
		.filter( ( block ) => block.name === 'core/paragraph' )
		.map( ( block ) => String( block.attributes?.content ?? '' ) );
}

function getTopLevelNames( state: unknown ) {
	return getTopLevelBlocks( state ).map( ( block ) => block.name );
}

function findTopLevelGroup( state: unknown ) {
	return getTopLevelBlocks( state ).find( ( block ) => block.name === 'core/group' );
}

function groupMatchesSeedShape( group: NormalizedBlock | undefined ) {
	if ( ! group ) {
		return false;
	}

	const innerBlocks = group.innerBlocks ?? [];
	return (
		innerBlocks.length === 2 &&
		innerBlocks[ 0 ]?.name === 'core/paragraph' &&
		innerBlocks[ 0 ]?.attributes?.content === GROUP_PARAGRAPH &&
		innerBlocks[ 1 ]?.name === 'core/heading' &&
		innerBlocks[ 1 ]?.attributes?.content === GROUP_HEADING
	);
}

function matchesExpectedState( state: unknown ) {
	const names = getTopLevelNames( state );
	const paragraphs = getTopLevelParagraphContents( state );

	return (
		names.join( '|' ) ===
			[
				'core/paragraph',
				'core/paragraph',
				'core/heading',
				'core/group',
				'core/pullquote',
			].join( '|' ) &&
		paragraphs[ 0 ] === ANOTHER_PARAGRAPH &&
		paragraphs[ 1 ] === EMOJI_PARAGRAPH &&
		groupMatchesSeedShape( findTopLevelGroup( state ) )
	);
}

function matchesArchivedCorruption( state: unknown ) {
	const names = getTopLevelNames( state );
	const paragraphs = getTopLevelParagraphContents( state );

	return (
		names.join( '|' ) ===
			[
				'core/paragraph',
				'core/paragraph',
				'core/heading',
				'core/group',
				'core/pullquote',
			].join( '|' ) &&
		paragraphs[ 0 ] === ANOTHER_PARAGRAPH &&
		paragraphs[ 1 ] === ANOTHER_PARAGRAPH &&
		groupMatchesSeedShape( findTopLevelGroup( state ) )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	includeCrdtDocument = true
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

async function openFreshParagraph( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
}

async function insertPullquoteAtEnd( editor: Editor, page: Page ) {
	await clearTransientUi( page, editor );
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page
		.getByRole( 'button', {
			name: 'Block Inserter',
			exact: true,
		} )
		.click();
	const inserterPanel = page.getByRole( 'region', {
		name: 'Block Library',
	} );
	const searchBox = inserterPanel.getByRole( 'searchbox', {
		name: 'Search',
	} );
	await searchBox.fill( 'Pullquote' );
	await inserterPanel
		.getByRole( 'tabpanel', { name: 'Blocks' } )
		.getByRole( 'option', { name: 'Pullquote', exact: true } )
		.click();

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.type( 'x' );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( 'a' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'it' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );

	await expect( quoteBox ).toContainText( 'x' );
	await expect( citationBox ).toContainText( 'ait' );
}

async function moveEmojiParagraphDown( editor: Editor, page: Page ) {
	await clickCanvasText( editor, page, EMOJI_PARAGRAPH );
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
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
		corruptedStateFound: false,
		expectedStateFound: false,
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

		if ( scenario.reloadBeforePullquote ) {
			await reloadViewerAndWait( secondaryPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-reload'
				)
			);
		}

		if ( scenario.insertPullquote ) {
			await secondaryPage.bringToFront();
			await insertPullquoteAtEnd( secondaryEditor, secondaryPage );
			await waitForSessionReady( collaborationUtils, true );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-pullquote'
				)
			);
		}

		await primaryPage.bringToFront();
		await moveEmojiParagraphDown( primaryEditor, primaryPage );
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
		result.expectedStateFound =
			matchesExpectedState( finalSnapshot.primaryState ) &&
			matchesExpectedState( finalSnapshot.secondaryState );
		result.corruptedStateFound =
			matchesArchivedCorruption( finalSnapshot.primaryState ) ||
			matchesArchivedCorruption( finalSnapshot.secondaryState );
		result.reproduced = result.corruptedStateFound;
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
