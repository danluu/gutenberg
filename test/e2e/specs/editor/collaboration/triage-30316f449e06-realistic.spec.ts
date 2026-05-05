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

type Snapshot = {
	label: string;
	primarySummary: string[];
	secondarySummary: string[];
};

type Scenario = {
	id: string;
	initialContent: string;
	run: ( args: {
		collaborationUtils: CollaborationUtilsClass;
		primaryEditor: Editor;
		primaryPage: Page;
		secondaryEditor: Editor;
		secondaryPage: Page;
	} ) => Promise< void >;
};

type ScenarioResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	exactTargetShape: boolean;
	postId?: number;
	reproduced: boolean;
	scenarioId: string;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_30316F449E06_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_30316F449E06_ATTEMPTS ?? '1',
	10
);
const SHOULD_FAIL_ON_REPRO =
	process.env.RTC_30316F449E06_FAIL_ON_REPRO === '1';

const TITLE = 'rtc-save-title-marker-953853-4-0-end';
const MULTIBYTE_HEADING = 'Seed 953853 multibyte heading';
const INSERTED_HEADING = 'Seed 953853 step 6 user 1 heading';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const ANOTHER_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const NESTED_PARAGRAPH = 'Seed 953853 step 1 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 953853 step 1 user 1 nested heading';
const MARKER_1 = 'rtc-save-paragraph-marker-953853-1-1-end';
const SEARCH_1 = 'rtc-save-search-option-marker-953853-1-1-end';
const SEARCH_4 = 'rtc-save-search-option-marker-953853-4-0-end';
const SEARCH_4_BUTTON = `Find ${ SEARCH_4 }`;
const ITALIC_PARAGRAPH = '<em>italic</em>beta 953853 1';

function searchBlock( marker: string ) {
	return [
		`<!-- wp:search {"label":"Search label ${ marker }","placeholder":"Search placeholder ${ marker }","buttonText":"Find ${ marker }","buttonPosition":"button-inside","showLabel":true} /-->`,
	];
}

const AFTER_STEP6_CONTENT = [
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
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ MULTIBYTE_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ INSERTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ANOTHER_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ MARKER_1 }</p>`,
	'<!-- /wp:paragraph -->',
	...searchBlock( SEARCH_1 ),
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	...searchBlock( SEARCH_4 ),
].join( '\n' );

const AFTER_STEP7_CONTENT = [
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
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ INSERTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ MULTIBYTE_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ANOTHER_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ MARKER_1 }</p>`,
	'<!-- /wp:paragraph -->',
	...searchBlock( SEARCH_1 ),
	'<!-- wp:paragraph -->',
	`<p>${ ITALIC_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	...searchBlock( SEARCH_4 ),
].join( '\n' );

const EXPECTED_GOOD = [
	`core/search:Search label ${ SEARCH_4 }`,
	`core/group:${ NESTED_PARAGRAPH }|${ NESTED_HEADING }`,
	`core/heading:${ INSERTED_HEADING }`,
	`core/heading:${ MULTIBYTE_HEADING }`,
	`core/paragraph:${ EMOJI_PARAGRAPH }`,
	`core/paragraph:${ ANOTHER_PARAGRAPH }`,
	`core/paragraph:${ MARKER_1 }`,
	`core/search:Search label ${ SEARCH_1 }`,
	`core/paragraph:${ ITALIC_PARAGRAPH }`,
];

const EXPECTED_CORRUPTED = [
	`core/search:Search label ${ SEARCH_4 }`,
	`core/group:${ NESTED_PARAGRAPH }|${ NESTED_HEADING }`,
	`core/heading:${ MULTIBYTE_HEADING }`,
	`core/heading:${ MULTIBYTE_HEADING }`,
	`core/paragraph:${ EMOJI_PARAGRAPH }`,
	`core/paragraph:${ ANOTHER_PARAGRAPH }`,
	`core/paragraph:${ MARKER_1 }`,
	`core/search:Search label ${ SEARCH_1 }`,
	`core/paragraph:${ ITALIC_PARAGRAPH }`,
];

const SCENARIOS: Scenario[] = [
	{
		id: 'preseeded-step6-primary-move-heading-up-secondary-drag-search-to-top',
		initialContent: AFTER_STEP6_CONTENT,
		run: async ( {
			collaborationUtils,
			primaryEditor,
			primaryPage,
			secondaryPage,
		} ) => {
			await clickBlockByText(
				primaryEditor,
				primaryPage,
				INSERTED_HEADING
			);
			await moveSelectedBlock( primaryEditor, primaryPage, 'up' );
			await waitForSessionReady( collaborationUtils );
			await dragLastOverviewRowToTop( secondaryPage );
		},
	},
	{
		id: 'preseeded-step7-secondary-drag-search-to-top',
		initialContent: AFTER_STEP7_CONTENT,
		run: async ( { secondaryPage } ) => {
			await dragLastOverviewRowToTop( secondaryPage );
		},
	},
	{
		id: 'preseeded-step6-primary-move-heading-up-secondary-move-search-up-eight',
		initialContent: AFTER_STEP6_CONTENT,
		run: async ( {
			collaborationUtils,
			primaryEditor,
			primaryPage,
			secondaryEditor,
			secondaryPage,
		} ) => {
			await clickBlockByText(
				primaryEditor,
				primaryPage,
				INSERTED_HEADING
			);
			await moveSelectedBlock( primaryEditor, primaryPage, 'up' );
			await waitForSessionReady( collaborationUtils );
			await clickBlockByText(
				secondaryEditor,
				secondaryPage,
				SEARCH_4_BUTTON
			);
			for ( let index = 0; index < 8; index++ ) {
				await moveSelectedBlock(
					secondaryEditor,
					secondaryPage,
					'up'
				);
			}
		},
	},
	{
		id: 'preseeded-step7-secondary-move-search-up-eight',
		initialContent: AFTER_STEP7_CONTENT,
		run: async ( { secondaryEditor, secondaryPage } ) => {
			await clickBlockByText(
				secondaryEditor,
				secondaryPage,
				SEARCH_4_BUTTON
			);
			for ( let index = 0; index < 8; index++ ) {
				await moveSelectedBlock(
					secondaryEditor,
					secondaryPage,
					'up'
				);
			}
		},
	},
];

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
			username: `rtc3031${ uniqueSuffix }`,
			email: `rtc3031+${ uniqueSuffix }@example.com`,
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

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/group' ) {
			const nested = ( block?.innerBlocks ?? [] ).map(
				( inner: any ) => inner?.attributes?.content ?? ''
			);
			return `core/group:${ nested.join( '|' ) }`;
		}
		if ( block?.name === 'core/search' ) {
			return `core/search:${ block?.attributes?.label ?? '' }`;
		}
		return `${ block?.name }:${ block?.attributes?.content ?? '' }`;
	} );
}

function matchesExpectedSplit(
	primarySummary: string[],
	secondarySummary: string[]
) {
	const primary = JSON.stringify( primarySummary );
	const secondary = JSON.stringify( secondarySummary );
	const expected = JSON.stringify( EXPECTED_GOOD );
	const corrupted = JSON.stringify( EXPECTED_CORRUPTED );

	return (
		( primary === expected && secondary === corrupted ) ||
		( primary === corrupted && secondary === expected )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
	] );

	return {
		label,
		primarySummary: summarizeState( primaryState ),
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
	direction: 'up' | 'down'
) {
	await page.bringToFront();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'up' ? 'Move up' : 'Move down',
		} )
		.click();
}

async function dragLastOverviewRowToTop( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const count = await cells.count();
	if ( count < 2 ) {
		throw new Error( `Unexpected overview row count: ${ count }` );
	}

	const sourceRow = cells.nth( count - 1 );
	const targetRow = cells.nth( 0 );

	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
}

async function deletePostIfPossible( requestUtils: any, postId?: number ) {
	if ( ! postId ) {
		return;
	}

	try {
		await requestUtils.rest( {
			method: 'DELETE',
			path: `/wp/v2/posts/${ postId }`,
			params: {
				force: true,
			},
		} );
	} catch {}
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		attempt,
		exactTargetShape: false,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE } ${ scenario.id } attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: secondaryEditor,
			page: secondaryPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await scenario.run( {
			collaborationUtils,
			primaryEditor: editor,
			primaryPage: page,
			secondaryEditor,
			secondaryPage,
		} );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error
					? error.stack ?? error.message
					: String( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-actions' )
		);
		const finalSnapshot = result.snapshots.at( -1 );
		result.exactTargetShape = finalSnapshot
			? matchesExpectedSplit(
					finalSnapshot.primarySummary,
					finalSnapshot.secondarySummary
			  )
			: false;
		result.reproduced = result.exactTargetShape;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-error' )
			);
			const finalSnapshot = result.snapshots.at( -1 );
			result.exactTargetShape = finalSnapshot
				? matchesExpectedSplit(
						finalSnapshot.primarySummary,
						finalSnapshot.secondarySummary
				  )
				: false;
			result.reproduced = result.exactTargetShape;
		} catch {}
	} finally {
		writeScenarioResult( result );
		await deletePostIfPossible( requestUtils, result.postId );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test(
			`30316f realistic ${ scenario.id } attempt ${ attempt }`,
			async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 180000 );

				const result = await runScenario( {
					attempt,
					collaborationUtils,
					collaboratorUser,
					editor,
					page,
					requestUtils,
					scenario,
				} );

				if ( result.reproduced && SHOULD_FAIL_ON_REPRO ) {
					throw new Error(
						`Realistic scenario reproduced the target divergence.\n${ result.convergenceError ?? '' }`
					);
				}

				if ( result.error ) {
					throw new Error( result.error );
				}
			}
		);
	}
}
