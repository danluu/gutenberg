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
	finalParagraphText: string;
	initialContent: string;
	name: string;
	run: ( context: ScenarioContext ) => Promise< void >;
};

type ScenarioContext = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	page: Page;
};

type ScenarioResult = {
	afterAction?: {
		primary: unknown;
		secondary: unknown;
	};
	beforeAction?: {
		primary: unknown;
		secondary: unknown;
	};
	convergedAfterAction?: boolean;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: string;
};

const OUTPUT_DIR = process.env.RTC_04AC84E75930_OUTPUT_DIR;
const SHOULD_FAIL_ON_REPRO =
	process.env.RTC_04AC84E75930_FAIL_ON_REPRO !== '0';

const HEADING_TEXT = 'Seed 954510 structured content';
const GROUP_PARAGRAPH_TEXT = 'Nested update seed 954510 step 8 user 1 845873';
const ITALIC_PARAGRAPH_HTML = '<em>italic</em><em>italic</em>';
const USER_0_PARAGRAPH = 'Seed 954510 step 7 user 0 concurrent paragraph 746541';
const USER_1_PARAGRAPH = 'Seed 954510 step 7 user 1 concurrent paragraph 986839';
const STEP_2_PARAGRAPH = 'Seed 954510 step 2 user 0 paragraph 29098';

const GROUP_BLOCK = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ HEADING_TEXT }</h3>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ GROUP_PARAGRAPH_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );

const LIST_BLOCK = [
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
].join( '\n' );

const STEP_8_CONTENT = [
	GROUP_BLOCK,
	'<!-- wp:paragraph -->',
	`<p>${ STEP_2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	LIST_BLOCK,
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_PARAGRAPH_HTML }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ USER_0_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ USER_1_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const STEP_9_CONTENT = [
	GROUP_BLOCK,
	LIST_BLOCK,
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_PARAGRAPH_HTML }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ USER_0_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ STEP_2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ USER_1_PARAGRAPH }</p>`,
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
			username: `rtc04ac${ uniqueSuffix }`,
			email: `rtc04ac+${ uniqueSuffix }@example.com`,
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

const SCENARIOS: Scenario[] = [
	{
		name: 'preloaded-step9-move-last-paragraph-to-top',
		initialContent: STEP_9_CONTENT,
		finalParagraphText: USER_1_PARAGRAPH,
		run: async ( { editor, page } ) => {
			await clickBlockByText( editor, page, USER_1_PARAGRAPH );
			await moveSelectedBlock( editor, page, 'up', 5 );
		},
	},
	{
		name: 'preloaded-step8-move-step2-down-reload-then-move-last-to-top',
		initialContent: STEP_8_CONTENT,
		finalParagraphText: USER_1_PARAGRAPH,
		run: async ( {
			collaborationUtils,
			collaboratorPage,
			editor,
			page,
		} ) => {
			await clickBlockByText( editor, page, STEP_2_PARAGRAPH );
			await moveSelectedBlock( editor, page, 'down', 3 );
			await waitForSessionReady( collaborationUtils );
			await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaboratorPage,
				{ timeout: 20000 }
			);
			await waitForSessionReady( collaborationUtils );
			await clickBlockByText( editor, page, USER_1_PARAGRAPH );
			await moveSelectedBlock( editor, page, 'up', 5 );
		},
	},
];

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
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
	] );

	return { primary, secondary };
}

function summarizeBlock( block: NormalizedBlock ) {
	return {
		content:
			typeof block.attributes?.content === 'string'
				? block.attributes.content
				: null,
		innerBlocks: ( block.innerBlocks ?? [] ).map( summarizeBlock ),
		name: block.name,
	};
}

function summarizeState( state: NormalizedState ) {
	return {
		blocks: state.blocks.map( summarizeBlock ),
		title: state.title,
	};
}

function hasParagraphOwningListItems( state: NormalizedState ) {
	return state.blocks.some(
		( block ) =>
			block.name === 'core/paragraph' &&
			( block.innerBlocks ?? [] ).some(
				( innerBlock ) => innerBlock.name === 'core/list-item'
			)
	);
}

function hasDuplicateParagraphText( state: NormalizedState, text: string ) {
	let count = 0;
	for ( const block of state.blocks ) {
		if ( block.name !== 'core/paragraph' ) {
			continue;
		}

		if ( block.attributes?.content === text ) {
			count++;
		}
	}

	return count > 1;
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const block = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
}

async function moveSelectedBlock(
	editor: Editor,
	page: Page,
	direction: 'up' | 'down',
	steps: number
) {
	await page.bringToFront();
	await editor.showBlockToolbar();

	for ( let index = 0; index < steps; index++ ) {
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', {
				name: direction === 'up' ? 'Move up' : 'Move down',
			} )
			.click();
	}
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
		reproduced: false,
		scenario: scenario.name,
	};

	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 04ac84 realistic ${ scenario.name }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		result.beforeAction = await captureStates( collaborationUtils );

		await scenario.run( {
			collaborationUtils,
			collaboratorEditor,
			collaboratorPage,
			editor,
			page,
		} );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
			result.convergedAfterAction = true;
		} catch ( error ) {
			result.error = formatError( error );
			result.convergedAfterAction = false;
		}

		result.afterAction = await captureStates( collaborationUtils );

		const primaryState = result.afterAction.primary as NormalizedState;
		const secondaryState = result.afterAction.secondary as NormalizedState;
		const primarySummary = summarizeState( primaryState );
		const secondarySummary = summarizeState( secondaryState );
		const statesMatch =
			JSON.stringify( primarySummary ) === JSON.stringify( secondarySummary );

		result.reproduced =
			result.convergedAfterAction === false ||
			hasParagraphOwningListItems( primaryState ) ||
			hasParagraphOwningListItems( secondaryState ) ||
			hasDuplicateParagraphText(
				primaryState,
				scenario.finalParagraphText
			) ||
			hasDuplicateParagraphText(
				secondaryState,
				scenario.finalParagraphText
			) ||
			! statesMatch;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.afterAction = await captureStates( collaborationUtils );
		} catch {}
	}

	writeScenarioResult( result );

	if ( result.reproduced && SHOULD_FAIL_ON_REPRO ) {
		throw new Error(
			`Realistic scenario reproduced the target divergence.\n${ result.error ?? '' }`
		);
	}
}

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );
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
