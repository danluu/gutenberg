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

type NormalizedState = {
	blocks: NormalizedBlock[];
	crdtDocument?: string | null;
	title: string;
};

type Snapshot = {
	label: string;
	primaryState: NormalizedState | null;
	secondaryState: NormalizedState | null;
};

type Scenario = {
	id: string;
	reloadCollaborator: boolean;
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string | null;
	error?: string;
	postId?: number;
	primaryHasCheckpoint?: boolean;
	primaryState?: NormalizedState | null;
	reproduced: boolean;
	scenario: string;
	secondaryHasCheckpoint?: boolean;
	secondaryState?: NormalizedState | null;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_9DA3_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_9DA3_ATTEMPTS ?? '3', 10 );

const TITLE_MARKER = 'rtc-save-title-marker-954673-4-1-end';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-954673-4-1-end';
const SEARCH_MARKER = 'rtc-save-search-option-marker-954673-4-1-end';
const SEARCH_LABEL = `Search label ${ SEARCH_MARKER }`;
const PRIMARY_PARAGRAPH = 'triage 9da30 primary concurrent paragraph';
const SECONDARY_PARAGRAPH = 'triage 9da30 collaborator concurrent paragraph';

const INITIAL_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954673 step 1 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954673 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p></p><cite>plain <strong>text</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH_MARKER }","label":"Search label ${ SEARCH_MARKER }","placeholder":"Search placeholder ${ SEARCH_MARKER }","showLabel":true} /-->`,
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		id: 'append-then-delete',
		reloadCollaborator: false,
	},
	{
		id: 'reload-append-then-delete',
		reloadCollaborator: true,
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
			username: `rtc9da3${ uniqueSuffix }`,
			email: `rtc9da3+${ uniqueSuffix }@example.com`,
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
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

function blocksContainText(
	state: NormalizedState | null | undefined,
	text: string
) {
	return JSON.stringify( state?.blocks ?? [] ).includes( text );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass
): Promise< Snapshot > {
	try {
		const [ primaryState, secondaryState ] = await Promise.all( [
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.allPages[ 0 ],
				{
					includeCrdtDocument: true,
				}
			),
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.getPage( 0 ),
				{
					includeCrdtDocument: true,
				}
			),
		] );

		return {
			label,
			primaryState: primaryState as NormalizedState,
			secondaryState: secondaryState as NormalizedState,
		};
	} catch {
		return {
			label,
			primaryState: null,
			secondaryState: null,
		};
	}
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

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function chooseMenuItem(
	page: Page,
	preferred: string,
	fallback: string
) {
	const preferredItem = page.getByRole( 'menuitem', { name: preferred } );
	if ( await preferredItem.isVisible().catch( () => false ) ) {
		await preferredItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: fallback } ).click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( '/paragraph', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE_MARKER } realistic ${ scenario.id } ${ attempt }`,
	} );

	const result: AttemptResult = {
		attempt,
		postId: post.id,
		reproduced: false,
		scenario: scenario.id,
		snapshots: [],
	};

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'initial', collaborationUtils )
		);

		if ( scenario.reloadCollaborator ) {
			await reloadAndWait( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( 'after-reload', collaborationUtils )
			);
		}

		await insertParagraphAfterText(
			primaryEditor,
			page,
			SEARCH_LABEL,
			PRIMARY_PARAGRAPH
		);
		await insertParagraphAfterText(
			collaboratorEditor,
			collaboratorPage,
			SEARCH_LABEL,
			SECONDARY_PARAGRAPH
		);

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'after-concurrent-append', collaborationUtils )
		);

		await clickBlockByText( primaryEditor, page, CHECKPOINT_PARAGRAPH );
		await deleteSelectedBlock( page, primaryEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		const finalSnapshot = await captureSnapshot(
			'after-delete',
			collaborationUtils
		);
		result.snapshots.push( finalSnapshot );
		result.primaryState = finalSnapshot.primaryState;
		result.secondaryState = finalSnapshot.secondaryState;
		result.primaryHasCheckpoint = blocksContainText(
			finalSnapshot.primaryState,
			CHECKPOINT_PARAGRAPH
		);
		result.secondaryHasCheckpoint = blocksContainText(
			finalSnapshot.secondaryState,
			CHECKPOINT_PARAGRAPH
		);
		result.reproduced =
			result.primaryHasCheckpoint === false &&
			result.secondaryHasCheckpoint === true &&
			blocksContainText( finalSnapshot.primaryState, SEARCH_MARKER ) &&
			blocksContainText( finalSnapshot.secondaryState, SEARCH_MARKER ) &&
			blocksContainText( finalSnapshot.primaryState, PRIMARY_PARAGRAPH ) &&
			blocksContainText( finalSnapshot.primaryState, SECONDARY_PARAGRAPH ) &&
			blocksContainText( finalSnapshot.secondaryState, PRIMARY_PARAGRAPH ) &&
			blocksContainText( finalSnapshot.secondaryState, SECONDARY_PARAGRAPH );
		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		result.snapshots.push(
			await captureSnapshot( 'after-error', collaborationUtils )
		);
		return result;
	} finally {
		writeAttemptResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );
			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				scenario,
			} );
		} );
	}
}
