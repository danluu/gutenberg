/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
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

type NormalizedPostState = {
	blockLabels: string[];
	blocks: NormalizedBlock[];
	title: string;
};

type AttemptResult = {
	error?: string;
	postId?: number;
	states?: NormalizedPostState[];
};

const OUTPUT_DIR = process.env.RTC_58A322_OUTPUT_DIR;
const REMOTE_INSERTED_TEXT = 'RTC 58a322 remote paragraph';
const PARAGRAPH_A = 'RTC 58a322 paragraph A';
const PARAGRAPH_B = 'RTC 58a322 paragraph B';
const TABLE_CELL_A = 'RTC 58a322 table cell A';
const TABLE_CELL_B = 'RTC 58a322 table cell B';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_A }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	`<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>${ TABLE_CELL_A }</td><td>${ TABLE_CELL_B }</td></tr></tbody></table></figure>`,
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_B }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const EXPECTED_FINAL_LABELS = [
	`core/paragraph:${ REMOTE_INSERTED_TEXT }`,
	`core/paragraph:${ PARAGRAPH_A }`,
	`core/paragraph:${ PARAGRAPH_B }`,
	`core/table:${ TABLE_CELL_A }|${ TABLE_CELL_B }`,
];

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
			username: `rtc58a${ uniqueSuffix }`,
			email: `rtc58a+${ uniqueSuffix }@example.com`,
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

function tableCellText( value: unknown ): string {
	if ( ! Array.isArray( value ) ) {
		return '';
	}

	return value
		.flatMap( ( row ) =>
			Array.isArray( row?.cells )
				? row.cells.map( ( cell: { content?: unknown } ) =>
						String( cell.content ?? '' )
				  )
				: []
		)
		.join( '|' );
}

async function getNormalizedPostState(
	page: Page
): Promise< NormalizedPostState > {
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
		const labelForBlock = ( block: NormalizedBlock ): string => {
			if ( block.name === 'core/table' ) {
				const body = block.attributes.body;
				const cells = Array.isArray( body )
					? body
							.flatMap( ( row ) =>
								Array.isArray( row?.cells )
									? row.cells.map(
											( cell: { content?: unknown } ) =>
												String( cell.content ?? '' )
									  )
									: []
							)
							.join( '|' )
					: '';
				return `${ block.name }:${ cells }`;
			}

			return `${ block.name }:${ String(
				block.attributes.content ?? ''
			) }`;
		};
		const blocks = normalizeBlocks(
			( window as any ).wp.data.select( 'core/block-editor' ).getBlocks()
		);

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			blocks,
			blockLabels: blocks.map( labelForBlock ),
		};
	} );
}

async function getStates(
	collaborationUtils: CollaborationUtilsClass
): Promise< NormalizedPostState[] > {
	return Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			getNormalizedPostState( page )
		)
	);
}

async function expectPostStates(
	collaborationUtils: CollaborationUtilsClass,
	expectedBlockLabels: string[]
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await expect( async () => {
		const states = await getStates( collaborationUtils );
		const serializedFirstState = JSON.stringify( states[ 0 ] );

		for ( const state of states ) {
			expect( JSON.stringify( state ) ).toBe( serializedFirstState );
			expect( state.blockLabels ).toEqual( expectedBlockLabels );
		}
	} ).toPass( { timeout: 20000, intervals: [ 250, 500, 1000 ] } );
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

test.describe.configure( { mode: 'serial' } );

// Assertions run through expectPostStates().
// eslint-disable-next-line playwright/expect-expect
test( 'keeps paragraph and table identities after a remote insert and toolbar move', async ( {
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
		title: 'RTC 58a322 realistic repro',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await expectPostStates( collaborationUtils, [
			`core/paragraph:${ PARAGRAPH_A }`,
			`core/table:${ tableCellText( [
				{
					cells: [
						{ content: TABLE_CELL_A },
						{ content: TABLE_CELL_B },
					],
				},
			] ) }`,
			`core/paragraph:${ PARAGRAPH_B }`,
		] );

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			PARAGRAPH_A
		);
		await insertParagraphBeforeSelected(
			collaboratorEditor,
			collaboratorPage,
			REMOTE_INSERTED_TEXT
		);
		await expectPostStates( collaborationUtils, [
			`core/paragraph:${ REMOTE_INSERTED_TEXT }`,
			`core/paragraph:${ PARAGRAPH_A }`,
			`core/table:${ TABLE_CELL_A }|${ TABLE_CELL_B }`,
			`core/paragraph:${ PARAGRAPH_B }`,
		] );

		await clickBlockByText( editor, page, PARAGRAPH_B );
		await moveSelectedBlockUp( page, editor );
		await expectPostStates( collaborationUtils, EXPECTED_FINAL_LABELS );

		result.states = await getStates( collaborationUtils );
		writeAttemptResult( result );
	} catch ( error ) {
		result.error =
			error instanceof Error
				? error.stack ?? error.message
				: String( error );
		try {
			result.states = await getStates( collaborationUtils );
		} catch {}
		writeAttemptResult( result );
		throw error;
	}
} );
