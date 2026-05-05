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

type Snapshot = {
	label: string;
	persistedPost: {
		contentRaw: string;
		crdtDocument: string | null;
		titleRaw: string;
	};
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

type Scenario = {
	appendParagraphBeforeMove: boolean;
	name: string;
};

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const TITLE = 'rtc-save-title-marker-951014-7-0-end';
const STEP_5_TITLE = 'rtc-save-title-marker-951014-5-1-end';
const APPENDED_PARAGRAPH = 'Seed 951014 step 9 user 1 paragraph 848487';

const STEP_5_SAVED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 951014 structured content</h3>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>xy</p><cite>a<strong>it</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-951014-5-1-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-951014-5-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-951014-5-1-end","buttonText":"Find rtc-save-search-option-marker-951014-5-1-end","buttonPosition":"button-inside"} /-->',
].join( '\n' );

const STEP_7_SAVED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 951014 structured content</h3>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 951014 step 6 user 0 heading</h4>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>xy</p><cite>a<strong>it</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 951014 step 7 user 0 updated paragraph 340813</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-951014-5-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-951014-5-1-end","buttonText":"Find rtc-save-search-option-marker-951014-5-1-end","buttonPosition":"button-inside"} /-->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-951014-7-0-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-951014-7-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-951014-7-0-end","buttonText":"Find rtc-save-search-option-marker-951014-7-0-end","buttonPosition":"button-inside"} /-->',
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
			username: `rtc0f44${ uniqueSuffix }`,
			email: `rtc0f44+${ uniqueSuffix }@example.com`,
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

function hasTargetCorruption( state: any ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.some(
		( block: any ) =>
			block?.name === 'core/group' &&
			block?.attributes?.citation === 'RTC Fuzzer'
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
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{
				includeCrdtDocument: true,
			}
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
		requestUtils.rest< {
			content?: { raw?: string };
			meta?: { _crdt_document?: string | null };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw,meta._crdt_document',
			},
		} ),
	] );

	return {
		label,
		persistedPost: {
			contentRaw: persistedPost.content?.raw ?? '',
			crdtDocument: persistedPost.meta?._crdt_document ?? null,
			titleRaw: persistedPost.title?.raw ?? '',
		},
		primaryState,
		secondaryState,
	};
}

async function reloadViewerAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
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
	await page.keyboard.type( text );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function openListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function selectGroupBlockInListView( page: Page ) {
	const overview = await openListView( page );
	const groupRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: 'Group',
	} );
	const row = groupRow.first();
	await expect( row ).toBeVisible();
	await row.click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor, count: number ) {
	for ( let attempt = 0; attempt < count; attempt++ ) {
		await editor.showBlockToolbar();
		const moveDown = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } );
		await expect( moveDown ).toBeEnabled();
		await moveDown.click();
	}
}

async function moveSelectedBlockUp( page: Page, editor: Editor, count: number ) {
	for ( let attempt = 0; attempt < count; attempt++ ) {
		await editor.showBlockToolbar();
		const moveUp = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } );
		await expect( moveUp ).toBeEnabled();
		await moveUp.click();
	}
}

async function selectListViewRowByText( page: Page, text: string ) {
	const overview = await openListView( page );
	const row = overview.getByRole( 'gridcell' ).filter( {
		hasText: text,
	} );
	await expect( row.first() ).toBeVisible();
	await row.first().click();
}

async function insertHeadingAtEndWithMarkdown(
	editor: Editor,
	page: Page,
	text: string
) {
	const appender = editor.canvas.getByRole( 'button', {
		name: 'Add default block',
	} );
	await expect( appender.last() ).toBeVisible();
	await appender.last().click();
	await page.keyboard.type( `#### ${ text }` );
	await page.keyboard.press( 'Enter' );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function replaceParagraphText(
	editor: Editor,
	page: Page,
	previousText: string,
	nextText: string
) {
	const paragraph = editor.canvas.getByText( previousText );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await page.keyboard.press( 'Meta+a' );
	await page.keyboard.type( nextText );
	await expect( editor.canvas.getByText( nextText ) ).toBeVisible();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	};
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: STEP_7_SAVED_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;
		const primaryPage = collaborationUtils.allPages[ 0 ];

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await reloadViewerAndWait( collaboratorPage, collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-viewer-reload'
			)
		);

		if ( scenario.appendParagraphBeforeMove ) {
			await collaboratorPage.bringToFront();
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				APPENDED_PARAGRAPH
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-append'
				)
			);
		}

		await primaryPage.bringToFront();
		await selectGroupBlockInListView( primaryPage );
		await moveSelectedBlockDown( primaryPage, primaryEditor, 3 );

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
				'after-group-move'
			)
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			hasTargetCorruption( finalSnapshot.primaryState ) ||
			hasTargetCorruption( finalSnapshot.secondaryState );
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe( 'RTC triage 0f44e4d158a3 realistic repro', () => {
	const scenarios: Scenario[] = [
		{
			name: 'group-move-after-reload',
			appendParagraphBeforeMove: false,
		},
		{
			name: 'append-then-group-move-after-reload',
			appendParagraphBeforeMove: true,
		},
	];

	for ( const scenario of scenarios ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} ) => {
			const result = await runScenario( {
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );

			expect( result.error ).toBeUndefined();
			expect( result.reproduced ).toBe( true );
		} );
	}
} );

type LiveScenario = {
	finalMoveCount: number;
	firstMoveCount: number;
	name: string;
};

async function runLiveStep5Scenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	};
	scenario: LiveScenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: STEP_5_SAVED_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: STEP_5_TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;
		const primaryPage = collaborationUtils.allPages[ 0 ];

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await reloadViewerAndWait( collaboratorPage, collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-viewer-reload'
			)
		);

		await primaryPage.bringToFront();
		await insertHeadingAtEndWithMarkdown(
			primaryEditor,
			primaryPage,
			'Seed 951014 step 6 user 0 heading'
		);
		await waitForSessionReady( collaborationUtils );
		await primaryEditor.canvas
			.getByText( 'Seed 951014 step 6 user 0 heading' )
			.click();
		await moveSelectedBlockUp( primaryPage, primaryEditor, 4 );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-live-heading'
			)
		);

		await primaryPage.bringToFront();
		await replaceParagraphText(
			primaryEditor,
			primaryPage,
			'rtc-save-paragraph-marker-951014-5-1-end',
			'Seed 951014 step 7 user 0 updated paragraph 340813'
		);
		await waitForSessionReady( collaborationUtils );
		await primaryEditor.saveDraft();
		await waitForSessionReady( collaborationUtils );
		await reloadViewerAndWait( collaboratorPage, collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-live-save-and-reload'
			)
		);

		if ( scenario.firstMoveCount > 0 ) {
			await collaboratorPage.bringToFront();
			await selectGroupBlockInListView( collaboratorPage );
			await moveSelectedBlockDown(
				collaboratorPage,
				collaboratorEditor,
				scenario.firstMoveCount
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-first-group-move'
				)
			);
		}

		await collaboratorPage.bringToFront();
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			APPENDED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-append'
			)
		);

		await primaryPage.bringToFront();
		await selectGroupBlockInListView( primaryPage );
		await moveSelectedBlockDown(
			primaryPage,
			primaryEditor,
			scenario.finalMoveCount
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
				'after-final-group-move'
			)
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			hasTargetCorruption( finalSnapshot.primaryState ) ||
			hasTargetCorruption( finalSnapshot.secondaryState );
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe( 'RTC triage 0f44e4d158a3 step-5 live realistic repro', () => {
	const scenarios: LiveScenario[] = [
		{
			name: 'live-heading-save-reload-then-group-move',
			firstMoveCount: 0,
			finalMoveCount: 3,
		},
		{
			name: 'live-heading-save-reload-split-group-move',
			firstMoveCount: 1,
			finalMoveCount: 2,
		},
	];

	for ( const scenario of scenarios ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} ) => {
			const result = await runLiveStep5Scenario( {
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );

			expect( result.error ).toBeUndefined();
			expect( result.reproduced ).toBe( true );
		} );
	}
} );
