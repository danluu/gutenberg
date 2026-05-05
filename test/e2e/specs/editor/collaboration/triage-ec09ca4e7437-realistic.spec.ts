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

type NormalizedState = {
	blocks: NormalizedBlock[];
	title: string;
};

type ScenarioResult = {
	actionError?: string;
	beforeAction?: {
		primary: NormalizedState;
		secondary: NormalizedState;
	};
	convergenceError?: string;
	postId?: number;
	reproduced: boolean;
	scenario: string;
	afterAction?: {
		primary: NormalizedState;
		secondary: NormalizedState;
	};
	symptoms?: {
		primary: Record< string, boolean >;
		primaryOrder: string[];
		secondary: Record< string, boolean >;
		secondaryOrder: string[];
		statesDiffer: boolean;
	};
};

const OUTPUT_DIR = process.env.RTC_EC09_REALISTIC_OUTPUT_DIR;

const HEADING_TEXT = 'Seed 956573 multibyte heading';
const EMOJI_TEXT =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const PLAIN_TEXT =
	'Another paragraph exists so the top-level list is not degenerate.';
const NESTED_PARAGRAPH = 'Seed 956573 step 2 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 956573 step 2 user 0 nested heading';
const CONCURRENT_0 = 'Seed 956573 step 1 user 0 concurrent paragraph 284205';
const CONCURRENT_1 = 'Seed 956573 step 1 user 1 concurrent paragraph 37161';

const PRE_MOVE_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ PLAIN_TEXT }</p>`,
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
	'<!-- wp:pullquote {"citation":"<em>alpha</em><strong>beta</strong>","value":"x"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>x</p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:paragraph -->',
	`<p>${ CONCURRENT_0 }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CONCURRENT_1 }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		if ( process.env.GUTENBERG_RTC_TEST_WS_PROVIDER === '1' ) {
			await requestUtils.activatePlugin(
				'gutenberg-test-plugin-rtc-websocket-provider'
			);
		}

		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
		} );

		if ( process.env.RTC_EC09_SKIP_SET_COLLAB !== '1' ) {
			await setCollaboration( requestUtils, true );
		}
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
			username: `rtcec09${ uniqueSuffix }`,
			email: `rtcec09+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ScenarioResult ) {
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
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout,
	} );
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primary, secondary ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return { primary, secondary };
}

function topLevelOrder( state: NormalizedState ) {
	return ( state.blocks ?? [] ).map( ( block ) => {
		const content =
			typeof block.attributes?.content === 'string'
				? block.attributes.content
				: typeof block.attributes?.value === 'string'
					? block.attributes.value
					: '';
		return `${ block.name }:${ content }`;
	} );
}

function summarizeSymptoms( state: NormalizedState ) {
	const blocks = state.blocks ?? [];
	return {
		groupLostInnerBlocks: blocks.some(
			( block ) =>
				block.name === 'core/group' &&
				( block.innerBlocks ?? [] ).length === 0 &&
				typeof block.attributes?.content === 'string'
		),
		pullquoteGainedInnerBlocks: blocks.some(
			( block ) =>
				block.name === 'core/pullquote' &&
				( block.innerBlocks ?? [] ).length > 0
		),
		paragraphGainedPullquoteAttrs: blocks.some(
			( block ) =>
				block.name === 'core/paragraph' &&
				typeof block.attributes?.value === 'string' &&
				typeof block.attributes?.citation === 'string'
		),
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

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
}

async function moveEmojiParagraphToBottomViaToolbar(
	page: Page,
	editor: Editor
) {
	await clickBlockByText( editor, page, EMOJI_TEXT );
	for ( let index = 0; index < 5; index++ ) {
		await moveSelectedBlockDown( page, editor );
	}
}

async function moveEmojiParagraphViaOverviewDrag( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const rows = overview.getByRole( 'gridcell' );
	const emojiRow = rows.filter( { hasText: 'Emoji and multibyte:' } ).first();
	const tailRow = rows.filter( { hasText: CONCURRENT_1 } ).first();
	await expect( emojiRow ).toBeVisible();
	await expect( tailRow ).toBeVisible();
	await emojiRow.dragTo( tailRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	performMove,
	scenario,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	performMove: ( page: Page, editor: Editor ) => Promise< void >;
	scenario: string;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		reproduced: false,
		scenario,
	};
	const post = await requestUtils.createPost( {
		content: PRE_MOVE_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC ec09 realistic ${ scenario }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.beforeAction = await captureStates( collaborationUtils );
	} catch ( error ) {
		result.actionError = formatError( error );
		return result;
	}

	try {
		await performMove( page, collaborationUtils.editor );
	} catch ( error ) {
		result.actionError = formatError( error );
	}

	try {
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 15000,
		} );
	} catch ( error ) {
		result.convergenceError = formatError( error );
	}

	try {
		result.afterAction = await captureStates( collaborationUtils );
		const primary = summarizeSymptoms( result.afterAction.primary );
		const secondary = summarizeSymptoms( result.afterAction.secondary );
		const statesDiffer =
			JSON.stringify( result.afterAction.primary ) !==
			JSON.stringify( result.afterAction.secondary );
		result.symptoms = {
			primary,
			primaryOrder: topLevelOrder( result.afterAction.primary ),
			secondary,
			secondaryOrder: topLevelOrder( result.afterAction.secondary ),
			statesDiffer,
		};
		result.reproduced =
			statesDiffer &&
			( Object.values( primary ).some( Boolean ) ||
				Object.values( secondary ).some( Boolean ) );
	} catch ( error ) {
		if ( ! result.convergenceError ) {
			result.convergenceError = formatError( error );
		}
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	{
		name: 'toolbar-five-moves',
		performMove: moveEmojiParagraphToBottomViaToolbar,
	},
	{
		name: 'overview-drag',
		performMove: moveEmojiParagraphViaOverviewDrag,
	},
] ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );
		const result = await runScenario( {
			performMove: scenario.performMove,
			scenario: scenario.name,
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} );
		writeResult( result );
	} );
}
