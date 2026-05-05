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

type ScenarioResult = {
	error?: string;
	finalState?: unknown[];
	name: string;
	persistedContent?: string;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_E52_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const BASELINE = 'Seed 953452 baseline paragraph.';
const SECOND = 'Seed 953452 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';
const ITALIC_HTML = '<em>italic</em>beta';
const STEP2 = 'Seed 953452 step 2 user 1 paragraph 183935';
const STEP3_PARAGRAPH = 'Seed 953452 step 3 user 0 nested paragraph';
const STEP3_HEADING = 'Seed 953452 step 3 user 0 nested heading';
const STEP4 = 'Seed 953452 step 4 user 0 paragraph 795863';
const STEP0_TITLE = 'RTC seed 953452 step 0 user 1 title 229062';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRESEEDED_LIVE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_HTML }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRESEEDED_GROUP_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP3_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP3_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_HTML }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP2 }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRESEEDED_EXACT_PREMOVE_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP3_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP3_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP4 }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_HTML }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP2 }</p>`,
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
			username: `rtce52${ uniqueSuffix }`,
			email: `rtce52+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function topLevelSummary( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/group' ) {
			return `group:${ ( block.innerBlocks ?? [] )
				.map(
					( child: any ) =>
						child?.attributes?.content ?? child?.name ?? 'unknown'
				)
				.join( ' | ' ) }`;
		}
		return block?.attributes?.content ?? block?.name ?? 'unknown';
	} );
}

function matchesTargetFamily(
	primaryState: any,
	secondaryState: any
): boolean {
	const [ primary, secondary ] = [ primaryState, secondaryState ].map(
		topLevelSummary
	);
	const good = [
		`group:${ STEP3_PARAGRAPH } | ${ STEP3_HEADING }`,
		SECOND,
		BASELINE,
		SHARED,
		STEP4,
		ITALIC_HTML,
		STEP2,
	];
	const bad = [
		`group:${ STEP3_PARAGRAPH } | ${ STEP3_HEADING }`,
		BASELINE,
		BASELINE,
		SHARED,
		STEP4,
		ITALIC_HTML,
		STEP2,
	];

	return (
		( JSON.stringify( primary ) === JSON.stringify( good ) &&
			JSON.stringify( secondary ) === JSON.stringify( bad ) ) ||
		( JSON.stringify( primary ) === JSON.stringify( bad ) &&
			JSON.stringify( secondary ) === JSON.stringify( good ) )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickParagraphByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
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
	await searchBox.fill( blockName );
	await inserterPanel
		.getByRole( 'tabpanel', { name: 'Blocks' } )
		.getByRole( 'option', { name: blockName, exact: true } )
		.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addGroupBeforeSelected(
	page: Page,
	editor: Editor,
	paragraphText: string,
	headingText: string
) {
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( headingText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clickParagraphByText( editor, page, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function captureStates(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: any,
	postId: number
) {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
		requestUtils.rest< { content?: { raw?: string } } >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw',
			},
		} ),
	] );

	return {
		persistedContent: persistedPost.content?.raw ?? '',
		primaryState,
		secondaryState,
	};
}

async function runSeedShapedScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	usePreseededItalic,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	usePreseededItalic: boolean;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: usePreseededItalic
			? 'preseeded-italic-live-steps'
			: 'full-live-sequence',
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: usePreseededItalic ? PRESEEDED_LIVE_CONTENT : INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: STEP0_TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: primaryEditor } = collaborationUtils;
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		if ( ! usePreseededItalic ) {
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				'italicbeta'
			);
			await clickParagraphByText(
				collaboratorEditor,
				collaboratorPage,
				'italicbeta'
			);
			await collaboratorPage.keyboard.press( 'Home' );
			for ( let index = 0; index < 6; index++ ) {
				await collaboratorPage.keyboard.press( 'Shift+ArrowRight' );
			}
			await collaboratorPage.keyboard.press( `${ MODIFIER_KEY }+i` );
			await waitForSessionReady( collaborationUtils );
		}

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd( collaboratorEditor, collaboratorPage, STEP2 );
		await waitForSessionReady( collaborationUtils );

		await clickParagraphByText( primaryEditor, page, BASELINE );
		await addGroupBeforeSelected( page, primaryEditor, STEP3_PARAGRAPH, STEP3_HEADING );
		await waitForSessionReady( collaborationUtils );

		await insertParagraphAfterText( primaryEditor, page, SHARED, STEP4 );
		await waitForSessionReady( collaborationUtils );

		await clickParagraphByText( collaboratorEditor, collaboratorPage, BASELINE );
		await moveSelectedBlockDown( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.error = formatError( error );
		}

		const { persistedContent, primaryState, secondaryState } =
			await captureStates( collaborationUtils, requestUtils, post.id );
		result.persistedContent = persistedContent;
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.finalState = [
			topLevelSummary( primaryState ),
			topLevelSummary( secondaryState ),
		];
		result.reproduced = matchesTargetFamily( primaryState, secondaryState );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

async function runPreseededMoveScenario( {
	collaborationUtils,
	collaboratorUser,
	content,
	insertStep4,
	name,
	page,
	reloadPrimary,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	content: string;
	insertStep4: boolean;
	name: string;
	page: Page;
	reloadPrimary: boolean;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name,
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: STEP0_TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: primaryEditor } = collaborationUtils;
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		if ( reloadPrimary ) {
			await page.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 20000,
			} );
			await waitForSessionReady( collaborationUtils );
		}

		if ( insertStep4 ) {
			await insertParagraphAfterText( primaryEditor, page, SHARED, STEP4 );
			await waitForSessionReady( collaborationUtils );
		}

		await clickParagraphByText( collaboratorEditor, collaboratorPage, BASELINE );
		await moveSelectedBlockDown( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.error = formatError( error );
		}

		const { persistedContent, primaryState, secondaryState } =
			await captureStates( collaborationUtils, requestUtils, post.id );
		result.persistedContent = persistedContent;
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.finalState = [
			topLevelSummary( primaryState ),
			topLevelSummary( secondaryState ),
		];
		result.reproduced = matchesTargetFamily( primaryState, secondaryState );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe( 'e52fa38cd263 realistic repro search', () => {
	test( 'seed-shaped realistic scenarios', async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 240000 );

		const results = [
			await runPreseededMoveScenario( {
				collaborationUtils,
				collaboratorUser,
				content: PRESEEDED_EXACT_PREMOVE_CONTENT,
				insertStep4: false,
				name: 'exact-pre-move-primary-reload',
				page,
				reloadPrimary: true,
				requestUtils,
			} ),
			await runPreseededMoveScenario( {
				collaborationUtils,
				collaboratorUser,
				content: PRESEEDED_GROUP_CONTENT,
				insertStep4: true,
				name: 'group-reload-insert-then-move',
				page,
				reloadPrimary: true,
				requestUtils,
			} ),
			await runSeedShapedScenario( {
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				usePreseededItalic: true,
			} ),
		];

		expect( results.some( ( result ) => result.postId ) ).toBeTruthy();
	} );
} );
