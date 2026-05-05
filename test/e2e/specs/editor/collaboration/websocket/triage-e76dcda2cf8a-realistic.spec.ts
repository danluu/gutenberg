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

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	primaryBlocks: string[];
	reproduced: boolean;
	scenarioId: string;
	secondaryBlocks: string[];
};

type Scenario = {
	id: string;
	includeExtraBlocks: boolean;
	insertHeadingText: string;
	waitAfterInsert: boolean;
};

const OUTPUT_DIR = process.env.RTC_E76D_RESULT_DIR;
const BASE_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 952080 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952080 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const FULL_CONTENT = [
	BASE_CONTENT,
	'<!-- wp:pullquote {"value":"plain <em>changed</em>","citation":"<em>b</em><em>i</em>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>plain <em>changed</em></p><cite><em>b</em><em>i</em></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 952080 step 2 user 0</td><td>initial row 1 B seed 952080 step 2 user 0</td></tr><tr><td>initial row 2 A seed 952080 step 2 user 0</td><td>initial row 2 B seed 952080 step 2 user 0</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );
const TARGET_PARAGRAPH =
	'Seed 952080 keeps a second paragraph for deletes and moves.';
const REMAINING_BLOCKS = [
	'core/heading:Seed 952080 step 0 user 0 heading',
	'core/paragraph:Seed 952080 baseline paragraph.',
	'core/paragraph:Shared editing target paragraph.',
];
const FULL_EXPECTED_BLOCKS = [
	...REMAINING_BLOCKS,
	'core/pullquote:plain <em>changed</em>',
	'core/table:',
];
const SCENARIOS: Scenario[] = [
	{
		id: 'minimal-sequential',
		includeExtraBlocks: false,
		insertHeadingText: 'Seed 952080 step 0 user 0 heading',
		waitAfterInsert: true,
	},
	{
		id: 'minimal-burst',
		includeExtraBlocks: false,
		insertHeadingText: 'Seed 952080 step 0 user 0 heading',
		waitAfterInsert: false,
	},
	{
		id: 'seed-shaped-sequential',
		includeExtraBlocks: true,
		insertHeadingText: 'Seed 952080 step 0 user 0 heading',
		waitAfterInsert: true,
	},
];

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
			username: `rtce76${ uniqueSuffix }`,
			email: `rtce76+${ uniqueSuffix }@example.com`,
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

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
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

async function clickCanvasText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptionsMenu( page: Page ) {
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertHeadingBeforeBaseline(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickCanvasText( editor, page, 'Seed 952080 baseline paragraph.' );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( '/heading', { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function deleteParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickCanvasText( editor, page, text );
	await editor.showBlockToolbar();
	await openBlockOptionsMenu( page );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function getBlockSummary(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	const state = await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );

	return state.blocks.map( ( block ) => {
		const content =
			block.name === 'core/heading'
				? String( ( block.attributes as { content?: string } ).content ?? '' )
				: block.name === 'core/paragraph'
				? String( ( block.attributes as { content?: string } ).content ?? '' )
				: block.name === 'core/pullquote'
				? String( ( block.attributes as { value?: string } ).value ?? '' )
				: '';
		return `${ block.name }:${ content }`;
	} );
}

test.describe( 'RTC triage e76dcda2cf8a realistic delete second after local heading insert', () => {
	for ( const scenario of SCENARIOS ) {
		for ( const attempt of [ 0, 1, 2 ] ) {
			test( `${ scenario.id } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const initialContent = scenario.includeExtraBlocks
					? FULL_CONTENT
					: BASE_CONTENT;
				const post = await requestUtils.createPost( {
					content: initialContent,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC e76 realistic ${ scenario.id } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const { page: collaboratorPage } = await collaborationUtils.joinUser(
					post.id,
					collaboratorUser
				);
				await waitForSessionReady( collaborationUtils );

				await insertHeadingBeforeBaseline(
					editor,
					page,
					scenario.insertHeadingText
				);

				if ( scenario.waitAfterInsert ) {
					await waitForSessionReady( collaborationUtils );
				}

				await deleteParagraphByText( editor, page, TARGET_PARAGRAPH );

				let convergenceError: string | null = null;
				try {
					await waitForSessionReady( collaborationUtils );
				} catch ( error ) {
					convergenceError =
						error instanceof Error ? error.message : String( error );
				}

				const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
					getBlockSummary( collaborationUtils, page ),
					getBlockSummary( collaborationUtils, collaboratorPage ),
				] );
				const expectedBlocks = scenario.includeExtraBlocks
					? FULL_EXPECTED_BLOCKS
					: REMAINING_BLOCKS;
				const result: AttemptResult = {
					attempt,
					convergenceError,
					primaryBlocks,
					reproduced:
						convergenceError !== null ||
						primaryBlocks.join( '\n' ) !==
							secondaryBlocks.join( '\n' ) ||
						primaryBlocks.includes(
							`core/paragraph:${ TARGET_PARAGRAPH }`
						) ||
						secondaryBlocks.includes(
							`core/paragraph:${ TARGET_PARAGRAPH }`
						),
					scenarioId: scenario.id,
					secondaryBlocks,
				};
				writeAttemptResult( result );

				expect( primaryBlocks ).toEqual( expectedBlocks );
				expect( secondaryBlocks ).toEqual( expectedBlocks );
			} );
		}
	}
} );
