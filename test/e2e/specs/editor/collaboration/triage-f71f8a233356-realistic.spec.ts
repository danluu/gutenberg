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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	title: string;
};

type AttemptResult = {
	error?: string;
	postId?: number;
	primaryState?: unknown;
	secondaryState?: unknown;
};

const OUTPUT_DIR =
	process.env.RTC_F71F8A233356_OUTPUT_DIR ??
	process.env.RTC_64EDF2F8_OUTPUT_DIR;
const REMOTE_INSERTED_TEXT = 'RTC f71f8 duplicate remote paragraph';
const PARAGRAPH_A_TEXT = 'RTC f71f8 duplicate paragraph A';
const PARAGRAPH_B_TEXT = 'RTC f71f8 duplicate paragraph B';
const TABLE_CELL_A_TEXT = 'RTC f71f8 duplicate table cell A';
const TABLE_CELL_B_TEXT = 'RTC f71f8 duplicate table cell B';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_A_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	`<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>${ TABLE_CELL_A_TEXT }</td><td>${ TABLE_CELL_B_TEXT }</td></tr></tbody></table></figure>`,
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_B_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

// This natural editor workflow covers the same reconciliation family as
// f71f8a233356, but it did not fail before the fix in this pass. The
// low-level same-array regression test is the failing f71 reproducer.
const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			editor,
			requestUtils,
			page,
		} );

		await setCollaboration( requestUtils, true );
		await use( utils );
		await utils.teardown();
	},
	collaboratorUser: async ( { requestUtils }, use, testInfo ) => {
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
			username: `rtc64e${ uniqueSuffix }`,
			email: `rtc64e+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		await requestUtils.createUser( collaboratorUser );

		await use( collaboratorUser );
	},
} );

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'realistic-attempt.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForConvergence( collaborationUtils, { timeout: 20000 } );
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primaryState,
		secondaryState,
	};
}

async function getNormalizedPostState(
	page: Page
): Promise< NormalizedState > {
	return page.evaluate( () => {
		const normalizeBlocks = (
			blockTree: Array< {
				attributes?: Record< string, unknown >;
				innerBlocks?: Array< unknown >;
				name: string;
			} >
		): NormalizedBlock[] =>
			blockTree.map( ( block ) => ( {
				name: block.name,
				attributes: JSON.parse(
					JSON.stringify( block.attributes ?? {} )
				),
				innerBlocks: normalizeBlocks(
					( block.innerBlocks ?? [] ) as Array< {
						attributes?: Record< string, unknown >;
						innerBlocks?: Array< unknown >;
						name: string;
					} >
				),
			} ) );
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			blocks: normalizeBlocks( blocks ),
		};
	} );
}

async function waitForConvergence(
	collaborationUtils: CollaborationUtilsClass,
	{ timeout = 15000 }: { timeout?: number } = {}
): Promise< NormalizedState > {
	const deadline = Date.now() + timeout;
	let lastStates: NormalizedState[] = [];

	while ( Date.now() < deadline ) {
		lastStates = await Promise.all(
			collaborationUtils.allPages.map( ( participantPage ) =>
				getNormalizedPostState( participantPage )
			)
		);

		const serializedFirstState = JSON.stringify( lastStates[ 0 ] );
		if (
			lastStates.every(
				( state ) => JSON.stringify( state ) === serializedFirstState
			)
		) {
			return lastStates[ 0 ];
		}

		await collaborationUtils.allPages[ 0 ].waitForTimeout( 250 );
	}

	throw new Error(
		`Collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
			lastStates
		) }`
	);
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
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page
		.getByRole( 'menuitem', { name: /Add before|Insert before/ } )
		.click();
	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function moveSelectedBlockUp( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } )
		.click();
}

function assertExpectedBlocks( state: unknown ) {
	const blocks = ( state as NormalizedState ).blocks;

	expect( blocks.map( ( block ) => block.name ) ).toEqual( [
		'core/paragraph',
		'core/paragraph',
		'core/paragraph',
		'core/table',
	] );
	expect( blocks[ 0 ].attributes ).toMatchObject( {
		content: REMOTE_INSERTED_TEXT,
	} );
	expect( blocks[ 1 ].attributes ).toMatchObject( {
		content: PARAGRAPH_A_TEXT,
	} );
	expect( blocks[ 2 ].attributes ).toMatchObject( {
		content: PARAGRAPH_B_TEXT,
	} );
	expect( blocks[ 2 ].attributes ).not.toHaveProperty( 'body' );
	expect( JSON.stringify( blocks[ 2 ].attributes ) ).not.toContain(
		TABLE_CELL_A_TEXT
	);
	expect( blocks[ 3 ].attributes ).toMatchObject( {
		hasFixedLayout: true,
		body: [
			{
				cells: [
					{ content: TABLE_CELL_A_TEXT, tag: 'td' },
					{ content: TABLE_CELL_B_TEXT, tag: 'td' },
				],
			},
		],
	} );
	expect( JSON.stringify( blocks[ 3 ].attributes ) ).not.toContain(
		PARAGRAPH_B_TEXT
	);
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic duplicate-family coverage for f71f8a233356', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const result: AttemptResult = {};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC f71f8 duplicate-family realistic repro',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			PARAGRAPH_A_TEXT
		);
		await clickBlockByText( editor, page, PARAGRAPH_B_TEXT );
		await Promise.all( [
			insertParagraphBeforeSelected(
				collaboratorEditor,
				collaboratorPage,
				REMOTE_INSERTED_TEXT
			),
			moveSelectedBlockUp( page, editor ),
		] );
		await waitForSessionReady( collaborationUtils );

		const states = await getStates( collaborationUtils );
		Object.assign( result, states );
		writeAttemptResult( result );

		assertExpectedBlocks( states.primaryState );
		assertExpectedBlocks( states.secondaryState );
		expect( states.primaryState ).toEqual( states.secondaryState );
	} catch ( error ) {
		result.error =
			error instanceof Error
				? error.stack ?? error.message
				: String( error );
		try {
			Object.assign( result, await getStates( collaborationUtils ) );
		} catch {}
		writeAttemptResult( result );
		throw error;
	}
} );
