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
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type Scenario = {
	name: string;
	saveAndReloadBeforeMove: boolean;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_814B_OUTPUT_DIR;
const TITLE = 'rtc-save-title-marker-952866-4-0-end';
const MOVED_PARAGRAPH = 'Seed 952866 step 4 user 0 paragraph 172107';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-952866-4-0-end';
const SEARCH_ONE_LABEL =
	'Search label rtc-save-search-option-marker-952866-3-1-end';

const PRESEEDED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952866 structured content</h3>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested update seed 952866 step 6 user 1 712367</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested update seed 952866 step 2 user 1 762326</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 952866 step 0 user 0 paragraph 234838</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 952866 step 5 user 0 updated paragraph 794262</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952866 step 7 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952866 step 7 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-952866-3-1-end","label":"Search label rtc-save-search-option-marker-952866-3-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-952866-3-1-end","showLabel":true} /-->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-952866-4-0-end","label":"Search label rtc-save-search-option-marker-952866-4-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-952866-4-0-end","showLabel":true} /-->',
	'',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 952866 1</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'exact-pre-move-direct',
		saveAndReloadBeforeMove: false,
	},
	{
		name: 'exact-pre-move-after-save-reload',
		saveAndReloadBeforeMove: true,
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
			username: `rtc814b${ uniqueSuffix }`,
			email: `rtc814b+${ uniqueSuffix }@example.com`,
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

function countBlocksByName(
	blocks: NormalizedBlock[] = [],
	targetName: string
): number {
	return blocks.reduce( ( total, block ) => {
		return (
			total +
			( block.name === targetName ? 1 : 0 ) +
			countBlocksByName( block.innerBlocks ?? [], targetName )
		);
	}, 0 );
}

function countParagraphCopies( state: unknown, text: string ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.filter(
		( block ) =>
			block.name === 'core/paragraph' &&
			block.attributes?.content === text
	).length;
}

function hasSearchWithCorruptedContent(
	state: unknown,
	searchLabel: string,
	corruptedContent: string
) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.some(
		( block ) =>
			block.name === 'core/search' &&
			block.attributes?.label === searchLabel &&
			block.attributes?.content === corruptedContent
	);
}

function hasFailureShape( primaryState: unknown, secondaryState: unknown ) {
	const primaryBlocks =
		( primaryState as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	const secondaryBlocks =
		( secondaryState as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	const primarySearchCount = countBlocksByName( primaryBlocks, 'core/search' );
	const secondarySearchCount = countBlocksByName(
		secondaryBlocks,
		'core/search'
	);

	return (
		primarySearchCount !== secondarySearchCount &&
		( countParagraphCopies( primaryState, MOVED_PARAGRAPH ) >= 2 ||
			countParagraphCopies( secondaryState, MOVED_PARAGRAPH ) >= 2 ) &&
		( hasSearchWithCorruptedContent(
			primaryState,
			SEARCH_ONE_LABEL,
			CHECKPOINT_PARAGRAPH
		) ||
			hasSearchWithCorruptedContent(
				secondaryState,
				SEARCH_ONE_LABEL,
				CHECKPOINT_PARAGRAPH
			) )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	includeCrdtDocument = false
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument,
		timeout: 20000,
	} );
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
	const [ primaryState, secondaryState, persisted ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
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

	return {
		label,
		persistedContent: persisted.content?.raw ?? '',
		persistedTitle: persisted.title?.raw ?? '',
		primaryState,
		secondaryState,
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

async function clickParagraphByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function moveSelectedBlockUp(
	page: Page,
	editor: Editor,
	moveCount: number
) {
	for ( let attempt = 0; attempt < moveCount; attempt++ ) {
		await editor.showBlockToolbar();
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } )
			.click();
	}
}

async function reloadViewer(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils, true );
}

async function saveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeVisible( { timeout: 20000 } );
	await expect( saveButton ).toBeEnabled( { timeout: 20000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20000 } );
}

async function appendTitleSuffix( editor: Editor, page: Page, suffix: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible( { timeout: 20000 } );
	await titleBox.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix, { delay: 15 } );
	await expect( titleBox ).toContainText( suffix, { timeout: 20000 } );
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
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
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
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils, true );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		if ( scenario.saveAndReloadBeforeMove ) {
			await appendTitleSuffix( editor, page, ' reload-checkpoint' );
			await saveDraft( page );
			await waitForSessionReady( collaborationUtils, true );
			await reloadViewer( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-save-reload'
				)
			);
		}

		await clickParagraphByText( editor, page, MOVED_PARAGRAPH );
		await moveSelectedBlockUp( page, editor, 4 );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-move'
			)
		);
		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = hasFailureShape(
			( finalSnapshot as Snapshot ).primaryState,
			( finalSnapshot as Snapshot ).secondaryState
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
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
