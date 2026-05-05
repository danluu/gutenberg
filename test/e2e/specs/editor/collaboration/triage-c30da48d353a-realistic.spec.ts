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
	persistedContent: string;
	persistedTitle: string;
	primaryState: any;
	secondaryState: any;
};

type Scenario = {
	name: string;
	reloadViewerBeforeSave: boolean;
};

type ScenarioResult = {
	error?: string;
	freeformDetected: boolean;
	name: string;
	postId?: number;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_C30_OUTPUT_DIR;
const TITLE = 'RTC seed 953121 initial title';
const TITLE_SUFFIX = ' realistic-save';
const CHECKPOINT_MARKER = 'rtc-save-paragraph-marker-953121-6-1-end';
const SEARCH_MARKER = 'rtc-save-search-option-marker-953121-6-1-end';

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953121 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953121 step 0 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953121 step 0 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953121 step 3 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953121 step 6 user 0 paragraph 116079</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953121 step 5 user 1 paragraph 720734</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_MARKER }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	`<!-- wp:search {"label":"Search label ${ SEARCH_MARKER }","placeholder":"Search placeholder ${ SEARCH_MARKER }","buttonText":"Find ${ SEARCH_MARKER }","buttonPosition":"button-inside"} /-->`,
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{ name: 'save-direct', reloadViewerBeforeSave: false },
	{ name: 'save-after-viewer-reload', reloadViewerBeforeSave: true },
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
			username: `rtcc30${ uniqueSuffix }`,
			email: `rtcc30+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function hasFreeformBlock( blocks: any[] = [] ): boolean {
	for ( const block of blocks ) {
		if ( block?.name === 'core/freeform' ) {
			return true;
		}
		if ( hasFreeformBlock( block?.innerBlocks ?? [] ) ) {
			return true;
		}
	}
	return false;
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function reloadViewer(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function appendTitleSuffix(
	editor: Editor,
	page: Page,
	suffix: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible( { timeout: 20000 } );
	await titleBox.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix, { delay: 15 } );
	await expect( titleBox ).toContainText( suffix, { timeout: 20000 } );
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
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
		requestUtils.rest< {
			content?: { raw?: string; rendered?: string };
			title?: { raw?: string; rendered?: string };
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

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		freeformDetected: false,
		name: scenario.name,
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
		const { editor, page } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		if ( scenario.reloadViewerBeforeSave ) {
			await reloadViewer( collaborationUtils.allPages[ 0 ], collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-viewer-reload'
				)
			);
		}

		await appendTitleSuffix( editor, page, TITLE_SUFFIX );
		await saveDraft( page );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-save'
			)
		);

		result.freeformDetected = result.snapshots.some(
			( snapshot ) =>
				hasFreeformBlock( snapshot.primaryState?.blocks ) ||
				hasFreeformBlock( snapshot.secondaryState?.blocks )
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
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );
		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
			scenario,
		} );

		expect( result.error ).toBeUndefined();
	} );
}
