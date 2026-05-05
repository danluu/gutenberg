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
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Scenario = {
	name: string;
	performHeadingMove: (
		page: Page,
		editor: Editor
	) => Promise< void >;
};

type Result = {
	afterActions?: unknown;
	convergenceError?: string;
	headingMoveError?: string;
	headingNestedOnPrimary?: boolean;
	name: string;
	postId?: number;
	reproduced: boolean;
	searchMoveError?: string;
};

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

const OUTPUT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/0d27c057d6ea/realistic-results';
const TITLE = 'rtc-save-title-marker-953135-3-0-end';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953135-3-0-end';
const CHECKPOINT_SEARCH_LABEL =
	'Search label rtc-save-search-option-marker-953135-3-0-end';
const MOVED_HEADING = 'Follow-up heading';
const TOP_LEVEL_HEADING = 'Seed 953135 step 1 user 0 heading';

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953135 step 2 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953135 step 2 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953135 step 1 user 0 heading</h3>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p><strong>alpha</strong> beta</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953135-3-0-end","label":"Search label rtc-save-search-option-marker-953135-3-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953135-3-0-end","showLabel":true} /-->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'tab-indent-then-search-move',
		performHeadingMove: async ( page, editor ) => {
			await clickBlockByText( editor, MOVED_HEADING );
			await page.keyboard.press( 'Tab' );
		},
	},
	{
		name: 'overview-drag-then-search-move',
		performHeadingMove: async ( page ) => {
			await page.getByRole( 'button', { name: 'Document Overview' } ).click();
			const overview = page.getByRole( 'region', { name: 'Document Overview' } );
			await expect( overview ).toBeVisible( { timeout: 10000 } );
			const cells = overview.getByRole( 'gridcell' );
			const headingRow = cells.filter( { hasText: MOVED_HEADING } ).first();
			const groupRow = cells.filter( { hasText: 'Group' } ).first();
			await expect( headingRow ).toBeVisible( { timeout: 10000 } );
			await expect( groupRow ).toBeVisible( { timeout: 10000 } );
			await headingRow.dragTo( groupRow );
			await page.getByRole( 'button', { name: 'Document Overview' } ).click();
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
			username: `rtc0d27${ uniqueSuffix }`,
			email: `rtc0d27+${ uniqueSuffix }@example.com`,
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

function writeResult( result: Result ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clickBlockByText( editor: Editor, text: string ) {
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function moveSelectedBlockUp(
	page: Page,
	editor: Editor,
	count: number
) {
	for ( let index = 0; index < count; index++ ) {
		await editor.showBlockToolbar();
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } )
			.click();
	}
}

function findBlocks(
	blocks: NormalizedBlock[],
	predicate: ( block: NormalizedBlock ) => boolean
): NormalizedBlock[] {
	const matches: NormalizedBlock[] = [];
	for ( const block of blocks ) {
		if ( predicate( block ) ) {
			matches.push( block );
		}
		matches.push( ...findBlocks( block.innerBlocks ?? [], predicate ) );
	}
	return matches;
}

function getFailureShape( state: unknown ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	const searchBlocks = findBlocks(
		blocks,
		( block ) => block.name === 'core/search'
	);
	const topLevelHeadings = blocks.filter(
		( block ) =>
			block.name === 'core/heading' &&
			block.attributes?.content === TOP_LEVEL_HEADING
	);
	const contaminatedSearch = searchBlocks.find(
		( block ) =>
			block.attributes?.label === CHECKPOINT_SEARCH_LABEL &&
			block.attributes?.content === CHECKPOINT_PARAGRAPH
	);
	return {
		contaminatedSearch: !! contaminatedSearch,
		searchCount: searchBlocks.length,
		topLevelHeadingCount: topLevelHeadings.length,
	};
}

function isHeadingNestedInGroup( state: unknown ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.some(
		( block ) =>
			block.name === 'core/group' &&
			( block.innerBlocks ?? [] ).some(
				( inner ) =>
					inner.name === 'core/heading' &&
					inner.attributes?.content === MOVED_HEADING
			)
	);
}

test.describe( '0d27c057d6ea realistic probe', () => {
	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const result: Result = {
				name: scenario.name,
				reproduced: false,
			};

			const post = await requestUtils.createPost( {
				content: PRESEEDED_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: TITLE,
			} );
			result.postId = post.id;

			try {
				await collaborationUtils.openPost( post.id );
				await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );

				try {
					await scenario.performHeadingMove( page, editor );
				} catch ( error ) {
					result.headingMoveError = formatError( error );
				}

				await collaborationUtils.waitForConvergence( { timeout: 5000 } ).catch( () => {} );
				result.headingNestedOnPrimary = isHeadingNestedInGroup(
					await collaborationUtils.getNormalizedPostState(
						collaborationUtils.allPages[ 0 ]
					)
				);

				try {
					await clickBlockByText(
						editor,
						`Find rtc-save-search-option-marker-953135-3-0-end`
					);
					await moveSelectedBlockUp( page, editor, 3 );
				} catch ( error ) {
					result.searchMoveError = formatError( error );
				}

				try {
					await collaborationUtils.waitForConvergence( { timeout: 5000 } );
				} catch ( error ) {
					result.convergenceError = formatError( error );
				}

				const [ primaryState, secondaryState ] = await Promise.all( [
					collaborationUtils.getNormalizedPostState(
						collaborationUtils.allPages[ 0 ]
					),
					collaborationUtils.getNormalizedPostState(
						collaborationUtils.getPage( 0 )
					),
				] );
				result.afterActions = {
					primaryState,
					secondaryState,
				};

				const primaryShape = getFailureShape( primaryState );
				const secondaryShape = getFailureShape( secondaryState );
				result.reproduced =
					primaryShape.searchCount !== secondaryShape.searchCount &&
					( primaryShape.contaminatedSearch ||
						secondaryShape.contaminatedSearch ) &&
					( primaryShape.topLevelHeadingCount !==
						secondaryShape.topLevelHeadingCount );
			} finally {
				writeResult( result );
			}
		} );
	}
} );
