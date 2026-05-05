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
	blocks?: NormalizedBlock[];
	crdtDocument?: string | null;
	title?: string;
};

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: NormalizedState;
	primarySummary: string[];
	secondaryState: NormalizedState;
	secondarySummary: string[];
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_87101_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'RTC seed 953134 initial title';
const STRUCTURED_HEADING = 'Seed 953134 structured content';
const QUOTE_TEXT = 'Quoted content for merge and persistence checks.';
const QUOTE_CITATION = 'RTC Fuzzer';
const UPDATED_PARAGRAPH = 'Nested update seed 953134 step 0 user 1 123189';
const ORIGINAL_PARAGRAPH = 'Nested group paragraph alpha.';
const BETA_PARAGRAPH = 'Nested group paragraph beta.';

const BASE_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STRUCTURED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ ORIGINAL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ BETA_PARAGRAPH }</p>`,
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
	`<blockquote class="wp-block-quote"><p>${ QUOTE_TEXT }</p><cite>${ QUOTE_CITATION }</cite></blockquote>`,
	'<!-- /wp:quote -->',
].join( '\n' );

const PRESTEP2_CONTENT = [
	'<!-- wp:quote -->',
	`<blockquote class="wp-block-quote"><p>${ QUOTE_TEXT }</p><cite>${ QUOTE_CITATION }</cite></blockquote>`,
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STRUCTURED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ UPDATED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ BETA_PARAGRAPH }</p>`,
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
			username: `rtc87101${ uniqueSuffix }`,
			email: `rtc87101+${ uniqueSuffix }@example.com`,
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

function summarizeBlocks( state: NormalizedState ): string[] {
	return ( state.blocks ?? [] ).map( ( block ) => {
		const name = block.name.replace( /^core\//, '' );
		const childCount = block.innerBlocks?.length ?? 0;
		return childCount > 0 ? `${ name }[${ childCount }]` : name;
	} );
}

function blockContainsParagraph(
	block: NormalizedBlock | undefined,
	text: string
) {
	return ( block?.innerBlocks ?? [] ).some(
		( innerBlock ) =>
			innerBlock.name === 'core/paragraph' &&
			innerBlock.attributes?.content === text
	);
}

function blockContainsQuote( block: NormalizedBlock | undefined ) {
	return ( block?.innerBlocks ?? [] ).some(
		( innerBlock ) =>
			innerBlock.name === 'core/quote' &&
			blockContainsParagraph( innerBlock, QUOTE_TEXT )
	);
}

function hasTargetCorruption(
	healthyState: NormalizedState,
	corruptedState: NormalizedState
) {
	const healthyBlocks = healthyState.blocks ?? [];
	const corruptedBlocks = corruptedState.blocks ?? [];
	if (
		JSON.stringify( summarizeBlocks( healthyState ) ) !==
			JSON.stringify( [ 'heading', 'group[3]', 'list[3]' ] ) ||
		JSON.stringify( summarizeBlocks( corruptedState ) ) !==
			JSON.stringify( [ 'quote[1]', 'heading[3]', 'list[3]' ] )
	) {
		return false;
	}

	const healthyGroup = healthyBlocks[ 1 ];
	const corruptedHeading = corruptedBlocks[ 1 ];
	return (
		blockContainsQuote( healthyGroup ) &&
		blockContainsParagraph( healthyGroup, UPDATED_PARAGRAPH ) &&
		blockContainsParagraph( healthyGroup, BETA_PARAGRAPH ) &&
		blockContainsQuote( corruptedHeading ) &&
		blockContainsParagraph( corruptedHeading, UPDATED_PARAGRAPH ) &&
		blockContainsParagraph( corruptedHeading, BETA_PARAGRAPH )
	);
}

function isTargetCorruption(
	primaryState: NormalizedState,
	secondaryState: NormalizedState
) {
	return (
		hasTargetCorruption( primaryState, secondaryState ) ||
		hasTargetCorruption( secondaryState, primaryState )
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
			path: string;
			params?: Record< string, string >;
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

	const normalizedPrimary = primaryState as NormalizedState;
	const normalizedSecondary = secondaryState as NormalizedState;
	return {
		label,
		persistedContent: persistedPost.content?.raw ?? '',
		persistedTitle: persistedPost.title?.raw ?? '',
		primaryState: normalizedPrimary,
		primarySummary: summarizeBlocks( normalizedPrimary ),
		secondaryState: normalizedSecondary,
		secondarySummary: summarizeBlocks( normalizedSecondary ),
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

async function replaceSelectedText( page: Page, text: string ) {
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text, { delay: 20 } );
}

async function updateNestedParagraph(
	editor: Editor,
	page: Page
) {
	await clickCanvasText( editor, page, ORIGINAL_PARAGRAPH );
	await replaceSelectedText( page, UPDATED_PARAGRAPH );
	await expect( editor.canvas.getByText( UPDATED_PARAGRAPH ) ).toBeVisible();
}

async function moveQuoteToTop(
	editor: Editor,
	page: Page
) {
	await clearTransientUi( page, editor );
	await editor.canvas.locator( '[data-type="core/quote"]' ).first().click();

	for ( let index = 0; index < 3; index++ ) {
		await editor.showBlockToolbar();
		const moveUpButton = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } );
		await expect( moveUpButton ).toBeEnabled();
		await moveUpButton.click();
	}
}

async function dragQuoteIntoGroup( page: Page ) {
	await page.bringToFront();
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

async function dragQuoteIntoGroupViaCanvas( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const quoteBlock = editor.canvas.locator( '[data-type="core/quote"]' ).first();
	const groupBlock = editor.canvas.getByRole( 'document', {
		name: 'Block: Group',
	} );

	await expect( quoteBlock ).toBeVisible();
	await expect( groupBlock ).toBeVisible();

	await quoteBlock.click();
	await editor.showBlockToolbar();
	const dragHandle = page.locator(
		'role=toolbar[name="Block tools"i] >> role=button[name="Drag"i][include-hidden]'
	);
	await dragHandle.hover();
	await page.mouse.down();
	const groupBox = await groupBlock.boundingBox();
	if ( ! groupBox ) {
		throw new Error( 'Could not determine group block position.' );
	}
	await page.mouse.move(
		groupBox.x + groupBox.width * 0.5,
		groupBox.y + groupBox.height * 0.5,
		{ steps: 20 }
	);
	await page.mouse.up();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	initialContent,
	name,
	operation,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	initialContent: string;
	name: string;
	operation: ( args: {
		primaryEditor: Editor;
		primaryPage: Page;
		secondaryEditor: Editor;
		secondaryPage: Page;
	} ) => Promise< void >;
	page: Page;
	requestUtils: {
		createPost: ( post: {
			content: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	};
} ) {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			title: TITLE,
			status: 'draft',
			content: initialContent,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await operation( {
			primaryEditor: editor,
			primaryPage: page,
			secondaryEditor: collaborationUtils.allEditors[ 1 ],
			secondaryPage: collaborationUtils.getPage( 0 ),
		} );

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-actions'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'after-wait' )
		);

		const finalSnapshot = result.snapshots.at( -1 );
		if ( finalSnapshot ) {
			result.reproduced = isTargetCorruption(
				finalSnapshot.primaryState,
				finalSnapshot.secondaryState
			);
		}
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	expect( result.snapshots.length ).toBeGreaterThan( 0 );
}

test.describe( 'RTC triage 87101 realistic repro search', () => {
	test.describe.configure( { mode: 'serial' } );

	test( 'preseeded-quote-drag-into-group', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			initialContent: PRESTEP2_CONTENT,
			name: 'preseeded-quote-drag-into-group',
			operation: async ( { secondaryPage } ) => {
				await dragQuoteIntoGroup( secondaryPage );
			},
			page,
			requestUtils,
		} );
	} );

	test( 'live-build-quote-move-then-drag', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			initialContent: BASE_CONTENT,
			name: 'live-build-quote-move-then-drag',
			operation: async ( {
				primaryEditor,
				primaryPage,
				secondaryEditor,
				secondaryPage,
			} ) => {
				await updateNestedParagraph( secondaryEditor, secondaryPage );
				await collaborationUtils.waitForConvergence( { timeout: 15000 } );
				await moveQuoteToTop( primaryEditor, primaryPage );
				await collaborationUtils.waitForConvergence( { timeout: 15000 } );
				await dragQuoteIntoGroup( secondaryPage );
			},
			page,
			requestUtils,
		} );
	} );

	test( 'preseeded-quote-canvas-drag-into-group', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			initialContent: PRESTEP2_CONTENT,
			name: 'preseeded-quote-canvas-drag-into-group',
			operation: async ( { secondaryEditor, secondaryPage } ) => {
				await dragQuoteIntoGroupViaCanvas( secondaryPage, secondaryEditor );
			},
			page,
			requestUtils,
		} );
	} );

	test( 'live-build-quote-move-then-canvas-drag', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			initialContent: BASE_CONTENT,
			name: 'live-build-quote-move-then-canvas-drag',
			operation: async ( {
				primaryEditor,
				primaryPage,
				secondaryEditor,
				secondaryPage,
			} ) => {
				await updateNestedParagraph( secondaryEditor, secondaryPage );
				await collaborationUtils.waitForConvergence( { timeout: 15000 } );
				await moveQuoteToTop( primaryEditor, primaryPage );
				await collaborationUtils.waitForConvergence( { timeout: 15000 } );
				await dragQuoteIntoGroupViaCanvas( secondaryPage, secondaryEditor );
			},
			page,
			requestUtils,
		} );
	} );
} );
