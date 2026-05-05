import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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

type ScenarioName =
	| 'exact-move-original-up'
	| 'exact-no-step0-title'
	| 'move-updated-down';

type ScenarioConfig = {
	includeStep0TitleEdit: boolean;
	moveDirection: 'up' | 'down';
	moveTarget: 'original' | 'updated';
	name: ScenarioName;
};

type ScenarioResult = {
	afterReloadState?: unknown;
	afterSaveState?: unknown;
	convergedAfterMove?: boolean;
	error?: string;
	finalPersistedState?: unknown;
	finalPrimaryState?: unknown;
	finalSecondaryState?: unknown;
	moveDirection: 'up' | 'down';
	moveTarget: 'original' | 'updated';
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
};

const OUTPUT_DIR = process.env.RTC_E2E33_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const SHOULD_FAIL_ON_REPRO =
	process.env.RTC_E2E33_FAIL_ON_REPRO !== '0';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 950917 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const ORIGINAL_FIRST_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const ORIGINAL_SECOND_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const STEP0_TITLE = 'RTC seed 950917 step 0 user 1 title 184601';
const UPDATED_PARAGRAPH =
	'Seed 950917 step 1 user 1 updated paragraph 615097';
const CHECKPOINT_MARKER = 'rtc-save-paragraph-marker-950917-1-1-end';
const TITLE_MARKER = 'rtc-save-title-marker-950917-1-1-end';

const SCENARIOS: ScenarioConfig[] = [
	{
		includeStep0TitleEdit: true,
		moveDirection: 'up',
		moveTarget: 'original',
		name: 'exact-move-original-up',
	},
	{
		includeStep0TitleEdit: false,
		moveDirection: 'up',
		moveTarget: 'original',
		name: 'exact-no-step0-title',
	},
	{
		includeStep0TitleEdit: true,
		moveDirection: 'down',
		moveTarget: 'updated',
		name: 'move-updated-down',
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
			username: `rtce2e33${ uniqueSuffix }`,
			email: `rtce2e33+${ uniqueSuffix }@example.com`,
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

async function captureStates(
	collaborationUtils: CollaborationUtilsClass,
	includeCrdtDocument = true
) {
	const [ finalPrimaryState, finalSecondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument }
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument,
		} ),
	] );

	return {
		finalPrimaryState,
		finalSecondaryState,
	};
}

async function getPersistedState( requestUtils: any, postId: number ) {
	const post = await requestUtils.rest( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'id,title.raw,content.raw,meta',
		},
	} );

	return {
		content: post?.content?.raw ?? '',
		crdtDocument: post?.meta?._crdt_document ?? null,
		title: post?.title?.raw ?? '',
	};
}

async function clearAndType(
	page: Page,
	locator: Locator,
	text: string
) {
	await expect( locator ).toBeVisible();
	await locator.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( text, { delay: 15 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	nextTitle: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await clearAndType( page, titleBox, nextTitle );
	await expect( titleBox ).toContainText( nextTitle );
}

async function replaceParagraphText(
	paragraph: Locator,
	page: Page,
	editor: Editor,
	nextText: string
) {
	await clearAndType( page, paragraph, nextText );
	await expect( editor.canvas.getByText( nextText, { exact: false } ) ).toBeVisible();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function saveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled( { timeout: 20000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20000 } );
}

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'up' | 'down'
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'up' ? 'Move up' : 'Move down',
		} )
		.click();
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
	scenario: ScenarioConfig;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		moveDirection: scenario.moveDirection,
		moveTarget: scenario.moveTarget,
		name: scenario.name,
		reproduced: false,
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 950917 initial title',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		if ( scenario.includeStep0TitleEdit ) {
			await typePostTitle( collaboratorEditor, collaboratorPage, STEP0_TITLE );
			await waitForSessionReady( collaborationUtils );
		}

		await replaceParagraphText(
			collaboratorEditor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.first(),
			collaboratorPage,
			collaboratorEditor,
			UPDATED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			CHECKPOINT_MARKER
		);
		await typePostTitle( collaboratorEditor, collaboratorPage, TITLE_MARKER );
		await saveDraft( collaboratorPage );
		await waitForSessionReady( collaborationUtils, true );

		result.afterSaveState = await captureStates( collaborationUtils, true );

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await waitForSessionReady( collaborationUtils, true );
		result.afterReloadState = await captureStates( collaborationUtils, true );

		const moveIndex = scenario.moveTarget === 'original' ? 1 : 0;
		await clearTransientUi( collaboratorPage, collaboratorEditor );
		await collaboratorEditor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.nth( moveIndex )
			.click();
		await moveSelectedBlock(
			collaboratorPage,
			collaboratorEditor,
			scenario.moveDirection
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
			result.convergedAfterMove = true;
		} catch ( error ) {
			result.convergedAfterMove = false;
			result.error =
				error instanceof Error
					? error.stack ?? error.message
					: String( error );
			result.reproduced =
				result.error.includes( 'Collaborative state did not converge' );
		}

		Object.assign( result, await captureStates( collaborationUtils, true ) );
		result.finalPersistedState = await getPersistedState(
			requestUtils,
			post.id
		);
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			Object.assign( result, await captureStates( collaborationUtils, true ) );
		} catch {}
		try {
			result.finalPersistedState = await getPersistedState(
				requestUtils,
				post.id
			);
		} catch {}
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( `e2e33 realistic ${ scenario.name }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
			scenario,
		} );

		if ( result.reproduced && SHOULD_FAIL_ON_REPRO ) {
			throw new Error(
				`Realistic scenario ${ scenario.name } reproduced the target divergence.\n${ result.error ?? '' }`
			);
		}
	} );
}
