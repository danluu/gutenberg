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

type Scenario = {
	attempt: number;
	id: string;
	initialContent: string;
	insertPullquoteViaUi: boolean;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	id: string;
	postId?: number;
	reproduced: boolean;
	restContentAfterSecondSave?: string;
	restContentBeforeSecondSave?: string;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_A0555_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-953507-1-0-end';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953507-1-0-end';
const CHECKPOINT_SEARCH = 'rtc-save-search-option-marker-953507-1-0-end';
const FOLLOWUP_AFTER_ROLLBACK =
	'rtc-followup-after-rollback-marker-953507-1-0-end';
const FORMATTED_TEXT = 'plain changed';

const BASE_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASE_WITH_PULLQUOTE = [
	BASE_CONTENT,
	'<!-- wp:pullquote {"value":"x","citation":"plain <strong>text</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>x</p><cite>plain <strong>text</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		attempt: 0,
		id: 'preseed-pullquote-save-reload-formatted',
		initialContent: BASE_WITH_PULLQUOTE,
		insertPullquoteViaUi: false,
	},
	{
		attempt: 1,
		id: 'ui-pullquote-save-reload-formatted',
		initialContent: BASE_CONTENT,
		insertPullquoteViaUi: true,
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
			username: `rtca0555${ uniqueSuffix }`,
			email: `rtca0555+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		await use( collaboratorUser );
	},
} );

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.id }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout,
	} );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return {
		label,
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

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function chooseMenuItem(
	page: Page,
	primaryName: string,
	fallbackName: string
) {
	const primary = page.getByRole( 'menuitem', { name: primaryName } );
	if ( await primary.isVisible().catch( () => false ) ) {
		await primary.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: fallbackName } ).click();
}

async function addAfterSelected( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function appendParagraphAtEnd( editor: Editor, page: Page, text: string ) {
	await page.bringToFront();
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text, { delay: 15 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function insertSearchBlockAtEnd( editor: Editor, page: Page ) {
	await page.bringToFront();
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function insertPullquoteAtEnd(
	editor: Editor,
	page: Page,
	quote: string
) {
	await page.bringToFront();
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/pullquote' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await expect( quoteBox ).toBeVisible();
	await quoteBox.click();
	await page.keyboard.type( quote, { delay: 15 } );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await expect( citationBox ).toBeVisible();
	await citationBox.click();
	await page.keyboard.type( 'plain ', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'text', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
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

async function getRestContent( requestUtils: any, postId: number ) {
	const record = await requestUtils.rest( {
		path: `/wp/v2/posts/${ postId }`,
		params: { context: 'edit' },
	} );
	return record.content?.raw ?? record.content?.rendered ?? '';
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function appendFormattedParagraphAfterSearch(
	editor: Editor,
	page: Page
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const searchBlock = editor.canvas
		.getByRole( 'document', { name: 'Block: Search' } )
		.last();
	await expect( searchBlock ).toBeVisible();
	await searchBlock.click();
	await addAfterSelected( page, editor );
	await page.keyboard.type( 'plain ', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'changed', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await expect(
		editor.canvas.getByText( FORMATTED_TEXT, { exact: false } )
	).toBeVisible();
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
		id: `${ scenario.id }-attempt-${ scenario.attempt }`,
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC a0555 ${ scenario.id } initial`,
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
			await captureSnapshot( collaborationUtils, 'after-open' )
		);

		if ( scenario.insertPullquoteViaUi ) {
			await insertPullquoteAtEnd( editor, page, 'x' );
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-pullquote' )
			);
		}

		await appendParagraphAtEnd( editor, page, CHECKPOINT_PARAGRAPH );
		await waitForSessionReady( collaborationUtils );
		await insertSearchBlockAtEnd( editor, page );
		await waitForSessionReady( collaborationUtils );
		await typeTitle( editor, page, CHECKPOINT_TITLE );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'before-save' )
		);

		await saveDraft( page );
		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				result.convergenceError
					? 'after-save-failed-convergence'
					: 'after-save'
			)
		);

		if ( result.convergenceError ) {
			result.restContentBeforeSecondSave = await getRestContent(
				requestUtils,
				post.id
			);
			await appendParagraphAtEnd(
				editor,
				page,
				FOLLOWUP_AFTER_ROLLBACK
			);
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-followup-edit-in-rolled-back-primary'
				)
			);
			await saveDraft( page );
			result.restContentAfterSecondSave = await getRestContent(
				requestUtils,
				post.id
			);
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-second-save-from-rolled-back-primary'
				)
			);
			result.reproduced = true;
			writeScenarioResult( result );
			return result;
		}

		await reloadPageAndWait( collaboratorPage, collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-collaborator-reload' )
		);

		await appendFormattedParagraphAfterSearch( editor, page );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				'after-formatted-paragraph-visible'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				result.convergenceError
					? 'after-failed-convergence'
					: 'after-convergence'
			)
		);
		result.reproduced = !! result.convergenceError;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-error' )
			);
		} catch {}
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( `${ scenario.id } attempt ${ scenario.attempt }`, async ( {
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

		expect( result.error ).toBeUndefined();
		expect( result.reproduced ).toBe( false );
	} );
}
