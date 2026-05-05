import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
	type Page,
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
	converged: boolean;
	error?: string;
	name: string;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	secondaryState?: unknown;
};

type RunContext = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: {
		createPost: ( input: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
	secondaryEditor: Editor;
	secondaryPage: Page;
};

const OUTPUT_DIR =
	process.env.RTC_6588_OUTPUT_DIR ??
	'/tmp/rtc-6588affd5149-output';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'RTC seed 954095 initial title';
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const FOLLOW_UP_HEADING = 'Follow-up heading';
const TAIL_PARAGRAPH = 'Tail paragraph kept for save and reload stability checks.';
const FORMATTED_PARAGRAPH_VISIBLE = 'italicbeta 954095 0';
const GROUP_PARAGRAPH = 'Seed 954095 step 2 user 0 nested paragraph';
const GROUP_HEADING = 'Seed 954095 step 2 user 0 nested heading';

const BASE_THREE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PREINSERT_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 954095 0</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:pullquote {"citation":"<em>b</em><em>i</em>","value":"<em>alpha</em><strong>beta</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite><em>b</em><em>i</em></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
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
		const suffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtc6588${ suffix }`,
			email: `rtc6588+${ suffix }@example.com`,
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

function ensureOutputDir() {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
}

function writeScenarioResult( result: ScenarioResult ) {
	ensureOutputDir();
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function getAutocompleteList( page: Page ) {
	return page.locator( '[id^="components-autocomplete-listbox-"]' ).last();
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
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
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertBlockAfterSelected(
	page: Page,
	editor: Editor,
	blockName: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( `/${ blockName.toLowerCase()}`, { delay: 20 } );
	await expect( getAutocompleteList( page ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function insertFormattedParagraphAfterTail(
	editor: Editor,
	page: Page
) {
	await clickBlockByText( editor, page, TAIL_PARAGRAPH );
	await insertBlockAfterSelected( page, editor, 'Paragraph' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'italic', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'beta 954095 0', { delay: 20 } );
	await expect(
		editor.canvas.getByText( FORMATTED_PARAGRAPH_VISIBLE, {
			exact: false,
		} )
	).toBeVisible();
}

async function insertPullquoteAfterFormattedParagraph(
	editor: Editor,
	page: Page
) {
	await clickBlockByText( editor, page, FORMATTED_PARAGRAPH_VISIBLE );
	await insertBlockAfterSelected( page, editor, 'Pullquote' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'alpha', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'beta', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'b', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'i', { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );

	await expect( quoteBox ).toContainText( 'alphabeta' );
	await expect( citationBox ).toContainText( 'bi' );
}

async function insertFilledGroupAfterTail(
	editor: Editor,
	page: Page
) {
	await clickBlockByText( editor, page, TAIL_PARAGRAPH );
	await insertBlockAfterSelected( page, editor, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await editor.canvas.locator( '.wp-block-group' ).first().click();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( GROUP_PARAGRAPH, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( getAutocompleteList( page ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( GROUP_HEADING, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function captureStates(
	collaborationUtils: CollaborationUtilsClass
) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return {
		primaryState,
		secondaryState,
	};
}

function extractSummary( state: any ): string[] {
	if ( ! state?.blocks || ! Array.isArray( state.blocks ) ) {
		return [];
	}

	return state.blocks.map( ( block: any ) => {
		if ( block.name === 'core/group' ) {
			const firstChild = block.innerBlocks?.[ 0 ]?.attributes?.content ?? '';
			return `group:${ firstChild }`;
		}
		if ( block.name === 'core/heading' ) {
			return `heading:${ block.attributes?.content ?? '' }`;
		}
		if ( block.name === 'core/paragraph' ) {
			return `paragraph:${ block.attributes?.content ?? '' }`;
		}
		return block.name;
	} );
}

function isTargetOrderSplit(
	primaryState: any,
	secondaryState: any
) {
	const primarySummary = extractSummary( primaryState );
	const secondarySummary = extractSummary( secondaryState );

	return (
		primarySummary.join( '|' ) !== secondarySummary.join( '|' ) &&
		primarySummary[ 0 ] === `paragraph:${ LONG_PARAGRAPH }` &&
		secondarySummary[ 0 ]?.startsWith( 'group:' ) &&
		secondarySummary[ 1 ] === `paragraph:${ LONG_PARAGRAPH }`
	);
}

async function createScenarioContext(
	{
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	}: Omit< RunContext, 'secondaryEditor' | 'secondaryPage' >,
	content: string,
	name: string
): Promise< RunContext & { postId: number } > {
	const post = await requestUtils.createPost( {
		content,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE } ${ name }`,
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	return {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		postId: post.id,
		requestUtils,
		secondaryEditor: collaborationUtils.editor2,
		secondaryPage: collaborationUtils.page2,
	};
}

async function runScenario(
	name: string,
	setupContent: string,
	run: ( context: RunContext ) => Promise< void>,
	context: Omit< RunContext, 'secondaryEditor' | 'secondaryPage' >
) {
	const result: ScenarioResult = {
		converged: false,
		name,
		reproduced: false,
	};

	try {
		const scenarioContext = await createScenarioContext(
			context,
			setupContent,
			name
		);
		result.postId = scenarioContext.postId;
		await run( scenarioContext );
		await scenarioContext.collaborationUtils.waitForConvergence( {
			timeout: 15000,
		} );
		result.converged = true;
		const { primaryState, secondaryState } = await captureStates(
			scenarioContext.collaborationUtils
		);
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			const { primaryState, secondaryState } = await captureStates(
				context.collaborationUtils
			);
			result.primaryState = primaryState;
			result.secondaryState = secondaryState;
			result.reproduced = isTargetOrderSplit(
				primaryState,
				secondaryState
			);
		} catch {}
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

test( 'bounded realistic search for 6588affd5149', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );
	ensureOutputDir();

	const sharedContext = {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	};

	const results: ScenarioResult[] = [];

	results.push(
		await runScenario(
			'preinsert-primary-filled-group-after-tail',
			PREINSERT_CONTENT,
			async ( scenario ) => {
				await insertFilledGroupAfterTail( scenario.editor, scenario.page );
			},
			sharedContext
		)
	);

	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'summary.json' ),
		JSON.stringify( results, null, 2 )
	);

	expect( results.some( ( result ) => result.reproduced ) ).toBe( false );
} );
