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
	moveCount: number;
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

const OUTPUT_DIR = process.env.RTC_E76_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_E76_ATTEMPTS ?? '3', 10 );
const TITLE = 'rtc-save-title-marker-954292-1-1-end';
const SHARED = 'Shared editing target paragraph.';
const CHECKPOINT = 'rtc-save-paragraph-marker-954292-1-1-end';
const SEARCH_LABEL =
	'Search label rtc-save-search-option-marker-954292-1-1-end';
const PULLQUOTE_TEXT = 'plain changed';
const PULLQUOTE_CITATION = 'alphabeta';

const PRESEEDED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954292 step 1 user 1 heading</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954292 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954292 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 954292 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954292 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954292 step 3 user 0 heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-954292-1-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-954292-1-1-end","label":"Search label rtc-save-search-option-marker-954292-1-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-954292-1-1-end","showLabel":true} /-->',
	'<!-- wp:pullquote {"citation":"<em>alpha</em><strong>beta</strong>","value":"plain <em>changed</em>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>plain <em>changed</em></p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		moveCount: 2,
		name: 'move-shared-down-twice',
		saveAndReloadBeforeMove: false,
	},
	{
		moveCount: 2,
		name: 'save-reload-then-move-shared-down-twice',
		saveAndReloadBeforeMove: true,
	},
	{
		moveCount: 1,
		name: 'move-shared-down-once',
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

function writeScenarioResult( result: ScenarioResult, attempt: number ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }-attempt-${ attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function getBlocks( state: unknown ): NormalizedBlock[] {
	return ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
}

function countBlocksByName(
	blocks: NormalizedBlock[],
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

function countTopLevelParagraphCopies( blocks: NormalizedBlock[], text: string ) {
	return blocks.filter(
		( block ) =>
			block.name === 'core/paragraph' && block.attributes?.content === text
	).length;
}

function getTopLevelSearchLabels( blocks: NormalizedBlock[] ) {
	return blocks
		.filter( ( block ) => block.name === 'core/search' )
		.map( ( block ) => String( block.attributes?.label ?? '' ) );
}

function hasFailureShape( primaryState: unknown, secondaryState: unknown ) {
	const primaryBlocks = getBlocks( primaryState );
	const secondaryBlocks = getBlocks( secondaryState );
	const searchCounts = [
		countBlocksByName( primaryBlocks, 'core/search' ),
		countBlocksByName( secondaryBlocks, 'core/search' ),
	];
	const sharedCopies = [
		countTopLevelParagraphCopies( primaryBlocks, SHARED ),
		countTopLevelParagraphCopies( secondaryBlocks, SHARED ),
	];
	const labels = [
		getTopLevelSearchLabels( primaryBlocks ),
		getTopLevelSearchLabels( secondaryBlocks ),
	];
	const quotes = [
		JSON.stringify( primaryBlocks ),
		JSON.stringify( secondaryBlocks ),
	];

	return (
		searchCounts.includes( 0 ) &&
		searchCounts.includes( 1 ) &&
		sharedCopies.some( ( copies ) => copies >= 2 ) &&
		labels.some( ( stateLabels ) => stateLabels.includes( SEARCH_LABEL ) ) &&
		quotes.some(
			( serialized ) =>
				serialized.includes( PULLQUOTE_TEXT ) &&
				serialized.includes( '<em>alpha</em><strong>beta</strong>' )
		)
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

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	await page.bringToFront();
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( { hasText: text } )
		.first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
}

async function moveSelectedBlockDown(
	page: Page,
	editor: Editor,
	moveCount: number
) {
	for ( let index = 0; index < moveCount; index++ ) {
		await editor.showBlockToolbar();
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } )
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
	await page.evaluate( () => {
		( window as any ).wp.data.dispatch( 'core/editor' ).savePost();
	} );

	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: 20000 }
	);
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
		const { page: collaboratorPage, editor: collaboratorEditor } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils, true );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		if ( scenario.saveAndReloadBeforeMove ) {
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

		await clickParagraphByText( collaboratorEditor, collaboratorPage, SHARED );
		await moveSelectedBlockDown(
			collaboratorPage,
			collaboratorEditor,
			scenario.moveCount
		);

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

	writeScenarioResult( result, attempt );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
	for ( const scenario of SCENARIOS ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
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

			expect.soft( result.error ).toBeUndefined();
		} );
	}
}
