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
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	primarySummary: string[];
	secondaryState: unknown;
	secondarySummary: string[];
};

type ScenarioName =
	| 'toolbar-empty-pullquote'
	| 'toolbar-xy-pullquote'
	| 'drag-empty-pullquote';

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	semanticConvergenceError?: string;
	snapshots: Snapshot[];
};

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const OUTPUT_DIR = process.env.RTC_06AD_OUTPUT_DIR;
const TITLE = 'RTC seed 951314 initial title';
const FIRST_PARAGRAPH = 'Seed 951314 step 1 user 0 concurrent paragraph 58346';
const SECOND_PARAGRAPH =
	'Seed 951314 step 1 user 1 concurrent paragraph 168606';
const INSERTED_HEADING = 'Seed 951314 step 4 user 0 heading';
const FORMATTED_PARAGRAPH = 'plain changed';

const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 951314 structured content</h3>',
	'<!-- /wp:heading -->',
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
		await setCollaboration( requestUtils, false );
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
			username: `rtc06ad${ uniqueSuffix }`,
			email: `rtc06ad+${ uniqueSuffix }@example.com`,
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

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if (
			block?.name === 'core/group' ||
			block?.name === 'core/list' ||
			block?.name === 'core/quote'
		) {
			return `${ String( block.name ).replace( /^core\//, '' ) }[${
				block.innerBlocks?.length ?? 0
			}]`;
		}

		return String( block?.name ?? 'unknown' ).replace( /^core\//, '' );
	} );
}

function isTargetCorruption(
	primarySummary: string[],
	secondarySummary: string[]
) {
	const expected =
		'heading|heading|group[2]|quote[1]|list[3]|paragraph|paragraph|pullquote|paragraph';
	const corrupted =
		'heading|heading|quote[2]|quote[1]|list[3]|paragraph|paragraph|pullquote|paragraph';
	const primary = primarySummary.join( '|' );
	const secondary = secondarySummary.join( '|' );

	return (
		( primary === expected && secondary === corrupted ) ||
		( primary === corrupted && secondary === expected )
	);
}

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

function normalizeBlockForSemanticComparison( block: any ): any {
	const nextBlock = {
		...block,
		attributes: { ...( block?.attributes ?? {} ) },
		innerBlocks: Array.isArray( block?.innerBlocks )
			? block.innerBlocks.map( normalizeBlockForSemanticComparison )
			: [],
	};

	if (
		nextBlock.name === 'core/quote' &&
		nextBlock.attributes?.value === ''
	) {
		delete nextBlock.attributes.value;
	}

	return nextBlock;
}

function normalizeStateForSemanticComparison( state: any ) {
	return {
		title: state?.title ?? '',
		blocks: Array.isArray( state?.blocks )
			? state.blocks.map( normalizeBlockForSemanticComparison )
			: [],
	};
}

async function waitForSemanticConvergence(
	collaborationUtils: CollaborationUtilsClass,
	{ timeout = 20000 }: { timeout?: number } = {}
) {
	const deadline = Date.now() + timeout;
	let lastStates: unknown[] = [];

	while ( Date.now() < deadline ) {
		lastStates = await Promise.all( [
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.allPages[ 0 ]
			),
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.getPage( 0 )
			),
		] );

		const [ primaryState, secondaryState ] = lastStates.map(
			normalizeStateForSemanticComparison
		);
		if ( JSON.stringify( primaryState ) === JSON.stringify( secondaryState ) ) {
			return lastStates[ 0 ];
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw new Error(
		`Semantic collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
			lastStates
		) }`
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForSemanticConvergence( collaborationUtils, { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		primarySummary: summarizeState( primaryState ),
		secondaryState,
		secondarySummary: summarizeState( secondaryState ),
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

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function clickAddAfter( page: Page ) {
	const addAfter = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfter.isVisible().catch( () => false ) ) {
		await addAfter.click();
		return;
	}

	await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
}

async function typeRichAlphaBeta( page: Page, textbox: Locator ) {
	await textbox.click();
	await page.keyboard.type( 'alphabeta', { delay: 20 } );
	await page.keyboard.press( 'Home' );
	for ( let index = 0; index < 5; index++ ) {
		await page.keyboard.press( 'Shift+ArrowRight' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( 'End' );
	for ( let index = 0; index < 4; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.press( 'ArrowRight' );
}

async function moveQuoteUpTwiceViaToolbar( page: Page, editor: Editor ) {
	for ( let attempt = 0; attempt < 2; attempt++ ) {
		await clearTransientUi( page, editor );
		await editor.canvas.locator( '[data-type="core/quote"]' ).first().click();
		await editor.showBlockToolbar();
		const moveUp = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } );
		await expect( moveUp ).toBeEnabled();
		await moveUp.click();
	}
}

async function moveQuoteDownViaToolbar( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	await editor.canvas.locator( '[data-type="core/quote"]' ).first().click();
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
}

async function dragQuoteAboveGroup( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const quoteRow = cells.filter( { hasText: 'Quote' } ).first();
	const groupRow = cells.filter( { hasText: 'Group' } ).first();

	await expect( quoteRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await quoteRow.dragTo( groupRow );
}

async function dragQuoteBelowGroup( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const quoteRow = cells.filter( { hasText: 'Quote' } ).first();
	const listRow = cells.filter( { hasText: 'List' } ).first();

	await expect( quoteRow ).toBeVisible();
	await expect( listRow ).toBeVisible();
	await quoteRow.dragTo( listRow );
}

async function insertConcurrentParagraphAfterList(
	page: Page,
	editor: Editor,
	text: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.locator( '[data-type="core/list"]' ).first().click();
	await openBlockOptions( page, editor );
	await clickAddAfter( page );
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function insertPullquoteAfterParagraph(
	page: Page,
	editor: Editor,
	paragraphText: string,
	quoteText: '' | 'xy'
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( paragraphText ).click();
	await openBlockOptions( page, editor );
	await clickAddAfter( page );
	await page.keyboard.type( '/pullquote' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await expect( quoteBox ).toBeVisible();
	await quoteBox.click();
	await page.keyboard.type( quoteText || 'xy', { delay: 20 } );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await expect( citationBox ).toBeVisible();
	await typeRichAlphaBeta( page, citationBox );

	if ( quoteText === '' ) {
		await quoteBox.click();
		await page.keyboard.press( `${ MODIFIER_KEY }+A` );
		await page.keyboard.press( 'Backspace' );
	} else {
		await expect( quoteBox ).toContainText( quoteText );
	}

	await expect( citationBox ).toContainText( 'alphabeta' );
}

async function insertFormattedParagraphAfterPullquote( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	await editor.canvas
		.locator( '[data-type="core/pullquote"]' )
		.first()
		.click();
	await openBlockOptions( page, editor );
	await clickAddAfter( page );
	await page.keyboard.type( FORMATTED_PARAGRAPH, { delay: 20 } );
	for ( let index = 0; index < 7; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( 'ArrowRight' );
	await expect( editor.canvas.getByText( 'plain' ) ).toBeVisible();
	await expect( editor.canvas.getByText( 'changed' ) ).toBeVisible();
}

async function insertHeadingAfterInitialHeading( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	await editor.canvas.locator( '[data-type="core/heading"]' ).first().click();
	await openBlockOptions( page, editor );
	await clickAddAfter( page );
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( INSERTED_HEADING, { delay: 20 } );
	await expect( editor.canvas.getByText( INSERTED_HEADING ) ).toBeVisible();
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
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
	scenario: ScenarioName;
} ) {
	const result: ScenarioResult = {
		name: scenario,
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

		if ( scenario === 'drag-empty-pullquote' ) {
			await dragQuoteAboveGroup( page );
		} else {
			await moveQuoteUpTwiceViaToolbar( page, editor );
		}
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-first-move' )
		);

		await Promise.all( [
			insertConcurrentParagraphAfterList( page, editor, FIRST_PARAGRAPH ),
			insertConcurrentParagraphAfterList(
				collaboratorPage,
				collaboratorEditor,
				SECOND_PARAGRAPH
			),
		] );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				'after-concurrent-paragraphs'
			)
		);

		await insertPullquoteAfterParagraph(
			page,
			editor,
			SECOND_PARAGRAPH,
			scenario === 'toolbar-xy-pullquote' ? 'xy' : ''
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-pullquote' )
		);

		await insertFormattedParagraphAfterPullquote( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-formatted-paragraph' )
		);

		await insertHeadingAfterInitialHeading( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-heading' )
		);

		if ( scenario === 'drag-empty-pullquote' ) {
			await dragQuoteBelowGroup( collaboratorPage );
		} else {
			await moveQuoteDownViaToolbar( collaboratorPage, collaboratorEditor );
		}
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-second-move' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-convergence' )
			);
		} catch ( error ) {
			result.convergenceError = formatError( error );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-failed-convergence'
				)
			);
			try {
				await waitForSemanticConvergence( collaborationUtils, {
					timeout: 5000,
				} );
			} catch ( semanticError ) {
				result.semanticConvergenceError =
					formatError( semanticError );
			}
		}

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = isTargetCorruption(
			finalSnapshot.primarySummary,
			finalSnapshot.secondarySummary
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'toolbar-empty-pullquote',
	'toolbar-xy-pullquote',
	'drag-empty-pullquote',
] as const ) {
	test( scenario, async ( {
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
