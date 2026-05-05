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

type Snapshot = {
	label: string;
	persistedContent: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type Scenario = {
	initialContent: string;
	name: string;
	sequence: ( args: {
		collaborationUtils: CollaborationUtilsClass;
		editor: Editor;
		page: Page;
		primaryParagraph: string;
		secondaryEditor: Editor;
		secondaryPage: Page;
		secondaryParagraph: string;
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

const OUTPUT_DIR = process.env.RTC_AB4A_OUTPUT_DIR;
const TITLE = 'RTC seed 953022 initial title';
const QUOTE_TEXT = 'Quoted content for merge and persistence checks.';

const BASE_INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953022 structured content</h3>',
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

const PRESEEDED_PRE_MOVE_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953022 structured content</h3>',
	'<!-- /wp:heading -->',
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
	'<!-- wp:paragraph -->',
	'<p>seed 953022 primary concurrent paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>seed 953022 secondary concurrent paragraph</p>',
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
			username: `rtcab4a${ uniqueSuffix }`,
			email: `rtcab4a+${ uniqueSuffix }@example.com`,
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
		name: 'preseeded-toolbar-move-down',
		initialContent: PRESEEDED_PRE_MOVE_CONTENT,
		sequence: async ( { editor, page } ) => {
			await moveQuoteDownOnce( editor, page );
		},
	},
	{
		name: 'live-sequential-delete-then-move',
		initialContent: BASE_INITIAL_CONTENT,
		sequence: async ( {
			collaborationUtils,
			editor,
			page,
			primaryParagraph,
			secondaryEditor,
			secondaryPage,
			secondaryParagraph,
		} ) => {
			await appendConcurrentParagraphs(
				editor,
				page,
				primaryParagraph,
				secondaryEditor,
				secondaryPage,
				secondaryParagraph
			);
			await waitForSessionReady( collaborationUtils );
			await deleteTopLevelGroup( secondaryPage );
			await waitForSessionReady( collaborationUtils );
			await moveQuoteDownOnce( editor, page );
		},
	},
	{
		name: 'live-overlap-delete-and-move',
		initialContent: BASE_INITIAL_CONTENT,
		sequence: async ( {
			collaborationUtils,
			editor,
			page,
			primaryParagraph,
			secondaryEditor,
			secondaryPage,
			secondaryParagraph,
		} ) => {
			await appendConcurrentParagraphs(
				editor,
				page,
				primaryParagraph,
				secondaryEditor,
				secondaryPage,
				secondaryParagraph
			);
			await waitForSessionReady( collaborationUtils );
			await deleteTopLevelGroup( secondaryPage );
			await moveQuoteDownOnce( editor, page );
		},
	},
];

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

function isSmearedQuoteParagraph(
	block: NormalizedBlock | undefined,
	expectedContent: string
) {
	return (
		block?.name === 'core/paragraph' &&
		block.attributes?.citation === 'RTC Fuzzer' &&
		block.attributes?.content === expectedContent &&
		block.innerBlocks?.[ 0 ]?.name === 'core/paragraph' &&
		block.innerBlocks?.[ 0 ]?.attributes?.content === QUOTE_TEXT
	);
}

function hasArchivedFailureShape(
	primaryState: unknown,
	secondaryState: unknown,
	primaryParagraph: string,
	secondaryParagraph: string
) {
	const states = [ primaryState, secondaryState ] as Array< {
		blocks?: NormalizedBlock[];
	} >;

	return states.some( ( candidate, index ) => {
		const other = states[ ( index + 1 ) % 2 ];
		const blocks = candidate.blocks ?? [];
		const otherBlocks = other.blocks ?? [];
		return (
			blocks.length === 5 &&
			otherBlocks.length === 5 &&
			blocks[ 0 ]?.name === 'core/heading' &&
			blocks[ 1 ]?.name === 'core/list' &&
			blocks[ 2 ]?.name === 'core/paragraph' &&
			blocks[ 2 ]?.attributes?.content === primaryParagraph &&
			isSmearedQuoteParagraph( blocks[ 3 ], primaryParagraph ) &&
			blocks[ 4 ]?.name === 'core/paragraph' &&
			blocks[ 4 ]?.attributes?.content === secondaryParagraph &&
			otherBlocks[ 0 ]?.name === 'core/heading' &&
			otherBlocks[ 1 ]?.name === 'core/list' &&
			otherBlocks[ 2 ]?.name === 'core/paragraph' &&
			otherBlocks[ 2 ]?.attributes?.content === primaryParagraph &&
			otherBlocks[ 3 ]?.name === 'core/quote' &&
			otherBlocks[ 3 ]?.attributes?.citation === 'RTC Fuzzer' &&
			otherBlocks[ 4 ]?.name === 'core/paragraph' &&
			otherBlocks[ 4 ]?.attributes?.content === secondaryParagraph
		);
	} );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	const deadline = Date.now() + 20000;

	while ( Date.now() < deadline ) {
		const states = await Promise.all(
			collaborationUtils.allPages.map( ( pageHandle ) =>
				collaborationUtils.getNormalizedPostState( pageHandle )
			)
		);
		const normalized = states.map( normalizeReadyState );
		const first = JSON.stringify( normalized[ 0 ] );
		const isSettled = normalized.every(
			( state ) => JSON.stringify( state ) === first
		);

		if ( isSettled ) {
			return;
		}

		await collaborationUtils.allPages[ 0 ].waitForTimeout( 250 );
	}

	throw new Error( 'Timed out waiting for normalized collaboration session readiness.' );
}

function normalizeReadyState( value: unknown ): unknown {
	if ( Array.isArray( value ) ) {
		return value.map( normalizeReadyState );
	}

	if ( ! value || typeof value !== 'object' ) {
		return value;
	}

	const record = value as Record< string, unknown >;

	if (
		record.name === 'core/quote' &&
		record.attributes &&
		typeof record.attributes === 'object' &&
		(record.attributes as Record< string, unknown >).value === ''
	) {
		const normalizedAttributes = {
			...( record.attributes as Record< string, unknown > ),
		};
		delete normalizedAttributes.value;
		return {
			...record,
			attributes: normalizeReadyState( normalizedAttributes ),
			innerBlocks: normalizeReadyState( record.innerBlocks ),
		};
	}

	const normalized: Record< string, unknown > = {};

	for ( const [ key, innerValue ] of Object.entries( record ) ) {
		normalized[ key ] = normalizeReadyState( innerValue );
	}

	return normalized;
}

async function getPersistedContent(
	requestUtils: {
		rest: < T >( options: {
			params?: Record< string, string >;
			path: string;
		} ) => Promise< T >;
	},
	postId: number
) {
	const post = await requestUtils.rest< {
		content?: { raw?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );

	return post.content?.raw ?? '';
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			params?: Record< string, string >;
			path: string;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedContent ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		getPersistedContent( requestUtils, postId ),
	] );

	return {
		label,
		persistedContent,
		primaryState,
		secondaryState,
	};
}

async function clearTransientUi( page: Page ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clearTransientUi( page );
	const insertedParagraph = editor.canvas.getByText( text );
	try {
		await editor.canvas.getByRole( 'document' ).last().click();
		await page.keyboard.press( 'ArrowDown' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( text, { delay: 20 } );
		await expect( insertedParagraph ).toBeVisible( { timeout: 5000 } );
		return;
	} catch {
		await clearTransientUi( page );
	}

	await editor.canvas.getByRole( 'document' ).last().click();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addAfter = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfter.isVisible().catch( () => false ) ) {
		await addAfter.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( text, { delay: 20 } );
	await expect( insertedParagraph ).toBeVisible();
}

async function appendConcurrentParagraphs(
	editor: Editor,
	page: Page,
	primaryParagraph: string,
	secondaryEditor: Editor,
	secondaryPage: Page,
	secondaryParagraph: string
) {
	await appendParagraphAtEnd( editor, page, primaryParagraph );
	await appendParagraphAtEnd(
		secondaryEditor,
		secondaryPage,
		secondaryParagraph
	);
}

async function deleteTopLevelGroup( page: Page ) {
	await page.bringToFront();
	await clearTransientUi( page );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const groupRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: 'Group',
	} ).first();
	await expect( groupRow ).toBeVisible();
	await groupRow.click();
	await page.keyboard.press( 'Backspace' );
}

async function moveQuoteDownOnce( editor: Editor, page: Page ) {
	await page.bringToFront();
	await clearTransientUi( page );
	await editor.canvas.locator( '[data-type="core/quote"]' ).first().click();
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
}

async function runScenario( {
	primaryParagraph,
	scenario,
	secondaryParagraph,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	primaryParagraph: string;
	scenario: Scenario;
	secondaryParagraph: string;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: {
		createPost: ( post: {
			content: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
		rest: < T >( options: {
			params?: Record< string, string >;
			path: string;
		} ) => Promise< T >;
	};
} ) {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			title: TITLE,
			status: 'draft',
			content: scenario.initialContent,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: secondaryEditor, page: secondaryPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await scenario.sequence( {
			collaborationUtils,
			editor,
			page,
			primaryParagraph,
			secondaryEditor,
			secondaryPage,
			secondaryParagraph,
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
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-wait'
			)
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = hasArchivedFailureShape(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState,
			primaryParagraph,
			secondaryParagraph
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
}

test.describe( 'RTC triage ab4a89947ac3 realistic repro search', () => {
	test.describe.configure( { mode: 'serial' } );

	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const primaryParagraph = 'seed 953022 primary concurrent paragraph';
			const secondaryParagraph =
				'seed 953022 secondary concurrent paragraph';

			await runScenario( {
				primaryParagraph,
				scenario,
				secondaryParagraph,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} );
		} );
	}
} );
