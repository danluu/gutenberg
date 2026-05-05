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
	primaryState: unknown;
	secondaryState: unknown;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	scenarioId: string;
	secondaryState?: unknown;
	snapshots: Snapshot[];
};

type Scenario = {
	anchorText: string;
	id: string;
	initialContent: string;
	inserter: 'collaborator' | 'primary';
	mode: 'insert-after';
	reloadTarget?: 'collaborator' | 'primary';
	saveFrom?: 'collaborator' | 'primary';
};

const OUTPUT_DIR = process.env.RTC_0C33BAD2_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_0C33BAD2_ATTEMPTS ?? '4',
	10
);
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const SIMPLE_INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952337 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SEEDED_INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952337 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952337 step 2 user 1 concurrent paragraph 777161</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 952337 step 1 user 1</td><td>initial row 1 B seed 952337 step 1 user 1</td></tr><tr><td>initial row 2 A seed 952337 step 1 user 1</td><td>initial row 2 B seed 952337 step 1 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952337 step 2 user 0 concurrent paragraph 859911</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952337-3-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952337-3-0-end","showLabel":true,"placeholder":"Search placeholder rtc-save-search-option-marker-952337-3-0-end","buttonText":"Find rtc-save-search-option-marker-952337-3-0-end","buttonPosition":"button-inside"} /-->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 952337 0</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		id: 'simple-insert-after-heading',
		anchorText: 'Seed 952337 multibyte heading',
		initialContent: SIMPLE_INITIAL_CONTENT,
		inserter: 'collaborator',
		mode: 'insert-after',
	},
	{
		id: 'simple-insert-after-second-paragraph',
		anchorText:
			'Another paragraph exists so the top-level list is not degenerate.',
		initialContent: SIMPLE_INITIAL_CONTENT,
		inserter: 'collaborator',
		mode: 'insert-after',
	},
	{
		id: 'seed-shaped-insert-after-second-paragraph',
		anchorText:
			'Another paragraph exists so the top-level list is not degenerate.',
		initialContent: SEEDED_INITIAL_CONTENT,
		inserter: 'collaborator',
		mode: 'insert-after',
	},
	{
		id: 'seed-shaped-reload-insert-after-second-paragraph',
		anchorText:
			'Another paragraph exists so the top-level list is not degenerate.',
		initialContent: SEEDED_INITIAL_CONTENT,
		inserter: 'collaborator',
		mode: 'insert-after',
		reloadTarget: 'collaborator',
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
			username: `rtc0c33${ uniqueSuffix }`,
			email: `rtc0c33+${ uniqueSuffix }@example.com`,
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

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		secondaryState,
	};
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
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
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};

	const headingText = `RTC 0c33 attempt ${ attempt } ${ scenario.id } heading`;
	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 0c33 realistic ${ scenario.id } attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		if ( scenario.saveFrom === 'primary' ) {
			await collaborationUtils.editor.saveDraft();
			await collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaborationUtils.primaryPage,
				{ timeout: 20000 }
			);
			await waitForSessionReady( collaborationUtils );
		} else if ( scenario.saveFrom === 'collaborator' ) {
			await collaboratorEditor.saveDraft();
			await collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaboratorPage,
				{ timeout: 20000 }
			);
			await waitForSessionReady( collaborationUtils );
		}

		if ( scenario.reloadTarget === 'primary' ) {
			await reloadPageAndWait(
				collaborationUtils.primaryPage,
				collaborationUtils
			);
		} else if ( scenario.reloadTarget === 'collaborator' ) {
			await reloadPageAndWait( collaboratorPage, collaborationUtils );
		}

		const inserterEditor =
			scenario.inserter === 'primary'
				? collaborationUtils.editor
				: collaboratorEditor;
		const inserterPage =
			scenario.inserter === 'primary'
				? collaborationUtils.primaryPage
				: collaboratorPage;

		await insertHeadingAfterText(
			inserterEditor,
			inserterPage,
			scenario.anchorText,
			headingText
		);

		await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-insert' )
		);
		result.primaryState = result.snapshots[ result.snapshots.length - 1 ]
			.primaryState;
		result.secondaryState = result.snapshots[ result.snapshots.length - 1 ]
			.secondaryState;
		return result;
	} catch ( error ) {
		result.reproduced = true;
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-failed-convergence' )
			);
			result.primaryState = result.snapshots[ result.snapshots.length - 1 ]
				.primaryState;
			result.secondaryState = result.snapshots[ result.snapshots.length - 1 ]
				.secondaryState;
		} catch {}
		return result;
	} finally {
		writeAttemptResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );

			if ( result.reproduced ) {
				throw new Error(
					`Realistic repro produced divergence for ${ scenario.id } attempt ${ attempt }: ${ result.error ?? 'unknown error' }`
				);
			}
		} );
	}
}
