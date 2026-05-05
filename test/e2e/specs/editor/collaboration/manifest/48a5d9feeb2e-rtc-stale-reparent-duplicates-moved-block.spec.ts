import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioResult = {
	convergenceError?: string;
	name: string;
	reproduced: boolean;
	states: Array< {
		label: string;
		primaryBlocks: unknown;
		primaryTitle: string;
		secondaryBlocks: unknown;
		secondaryTitle: string;
	} >;
};

const RESULT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-12-20260502T091028Z/.triage-watcher/signatures/48a5d9feeb2e/repros';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const PRIMARY_PARAGRAPH =
	'Seed 952466 step 0 user 0 concurrent paragraph 601362';
const SECONDARY_PARAGRAPH =
	'Seed 952466 step 0 user 1 concurrent paragraph 222352';
const TITLE = 'RTC seed 952466 step 1 user 0 title 598749';
const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952466 structured content</h3>',
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
	'<ul><li>List item one for block movement.</li><li>List item two for delete coverage.</li><li>List item three for sync coverage.</li></ul>',
	'<!-- /wp:list -->',
	'<!-- wp:quote {"citation":"RTC Fuzzer"} -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
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
			username: `rtc48a5${ uniqueSuffix }`,
			email: `rtc48a5+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	return error instanceof Error ? error.stack ?? error.message : String( error );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryBlocks: primaryState.blocks,
		primaryTitle: primaryState.title,
		secondaryBlocks: secondaryState.blocks,
		secondaryTitle: secondaryState.title,
	};
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
	await page.keyboard.type( text, { delay: 20 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	title: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function openListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function ensureGroupExpanded( page: Page, overview: ReturnType< Page['locator'] > ) {
	const collapsedGroup = overview
		.getByRole( 'link', { name: 'Group', expanded: false } )
		.first();
	if ( await collapsedGroup.isVisible().catch( () => false ) ) {
		await collapsedGroup.click();
		await page.keyboard.press( 'ArrowRight' );
	}
}

async function dragParagraphIntoGroup(
	page: Page,
	paragraphText: string
) {
	const overview = await openListView( page );
	await ensureGroupExpanded( page, overview );
	const sourceRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: paragraphText } )
		.first();
	const targetRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Nested group paragraph alpha.' } )
		.first();
	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
}

function hasDuplicateNestedParagraph( state: any ) {
	const blocks = state.blocks ?? [];
	const group = blocks.find( ( block: any ) => block.name === 'core/group' );
	const nestedContents = new Set(
		( group?.innerBlocks ?? [] ).map(
			( block: any ) => block.attributes?.content ?? ''
		)
	);
	const topLevelContents = blocks.map(
		( block: any ) => block.attributes?.content ?? ''
	);
	return topLevelContents.some( ( content: string ) => nestedContents.has( content ) );
}

async function runSeedShapedScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: 'seed-shaped-store-dispatch',
		reproduced: false,
		states: [],
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 952466 initial title',
	} );

	try {
		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'initial' )
		);

		await Promise.all( [
			page.evaluate( ( content ) => {
				const block = ( window as any ).wp.blocks.createBlock(
					'core/paragraph',
					{ content }
				);
				( window as any ).wp.data
					.dispatch( 'core/block-editor' )
					.insertBlock( block );
			}, PRIMARY_PARAGRAPH ),
			collaboratorPage.evaluate( ( content ) => {
				const block = ( window as any ).wp.blocks.createBlock(
					'core/paragraph',
					{ content }
				);
				( window as any ).wp.data
					.dispatch( 'core/block-editor' )
					.insertBlock( block );
			}, SECONDARY_PARAGRAPH ),
		] );
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'after-concurrent-insert' )
		);

		await page.evaluate( ( title ) => {
			( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
				title,
			} );
		}, TITLE );
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'after-title' )
		);

		await collaboratorPage.evaluate( ( content ) => {
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const group = blocks.find(
				( block: any ) => block.name === 'core/group'
			);
			const source = blocks.find(
				( block: any ) =>
					block.name === 'core/paragraph' &&
					block.attributes?.content === content
			);
			if ( ! group || ! source ) {
				throw new Error( 'Failed to find group/source block.' );
			}
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.moveBlockToPosition( source.clientId, '', group.clientId, 0 );
		}, PRIMARY_PARAGRAPH );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalState = await captureState( collaborationUtils, 'after-move' );
		result.states.push( finalState );
		result.reproduced =
			hasDuplicateNestedParagraph( {
				blocks: finalState.primaryBlocks,
			} ) !==
			hasDuplicateNestedParagraph( {
				blocks: finalState.secondaryBlocks,
			} );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

async function runRealisticScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: 'realistic-list-view-drag',
		reproduced: false,
		states: [],
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 952466 initial title',
	} );

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'initial' )
		);

		await Promise.all( [
			appendParagraphAtEnd( primaryEditor, page, PRIMARY_PARAGRAPH ),
			appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				SECONDARY_PARAGRAPH
			),
		] );
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'after-concurrent-insert' )
		);

		await typePostTitle( primaryEditor, page, TITLE );
		await waitForSessionReady( collaborationUtils );
		result.states.push(
			await captureState( collaborationUtils, 'after-title' )
		);

		await dragParagraphIntoGroup( collaboratorPage, PRIMARY_PARAGRAPH );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalState = await captureState( collaborationUtils, 'after-drag' );
		result.states.push( finalState );
		result.reproduced =
			hasDuplicateNestedParagraph( {
				blocks: finalState.primaryBlocks,
			} ) !==
			hasDuplicateNestedParagraph( {
				blocks: finalState.secondaryBlocks,
			} );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

test( 'seed-shaped store-dispatch repro', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	const result = await runSeedShapedScenario( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} );

	expect.soft( result.states.length ).toBeGreaterThan( 0 );
} );

test( 'realistic list-view drag repro search', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	const result = await runRealisticScenario( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} );

	expect.soft( result.states.length ).toBeGreaterThan( 0 );
} );
