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

type NormalizedState = {
	blocks: NormalizedBlock[];
	crdtDocument?: string | null;
	title: string;
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	finalPrimaryHasHeading?: boolean;
	finalSecondaryHasHeading?: boolean;
	postId?: number;
	postTitle?: string;
	primaryState?: NormalizedState | null;
	reproduced: boolean;
	secondaryState?: NormalizedState | null;
};

const OUTPUT_DIR = process.env.RTC_80149_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt(
	process.env.RTC_80149_ATTEMPTS ?? '3',
	10
);

const INSERTED_HEADING = 'Seed 952331 step 2 user 0 heading';
const APPENDED_PARAGRAPH = 'Seed 952331 step 0 user 1 paragraph 671793';
const TITLE_MARKER = 'rtc-save-title-marker-952331-1-1-end';
const TABLE_ANCHOR = '<em>italic</em><em>italic</em>';

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
			username: `rtc80149${ uniqueSuffix }`,
			email: `rtc80149+${ uniqueSuffix }@example.com`,
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

function paragraph( text: string ) {
	return `<!-- wp:paragraph -->\n<p>${ text }</p>\n<!-- /wp:paragraph -->`;
}

function heading( text: string, level = 2 ) {
	const attributes = level === 2 ? '' : ` {"level":${ level }}`;
	return `<!-- wp:heading${ attributes } -->\n<h${ level } class="wp-block-heading">${ text }</h${ level }>\n<!-- /wp:heading -->`;
}

function rawParagraph( innerHtml: string ) {
	return `<!-- wp:paragraph -->\n<p>${ innerHtml }</p>\n<!-- /wp:paragraph -->`;
}

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`reload-heading-table-delete-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

function blocksContainText( state: NormalizedState | null | undefined, text: string ) {
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

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
): Promise< NormalizedState > {
	return ( await collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} ) ) as NormalizedState;
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

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function insertTableAfterText( editor: Editor, page: Page, anchorText: string ) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( '/table', { delay: 20 } );
	await expect(
		page.getByRole( 'option', { name: 'Table', selected: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	const createTableButton = editor.canvas.getByRole( 'button', {
		name: 'Create Table',
	} );
	await expect( createTableButton ).toBeVisible();
	await createTableButton.click();
	await expect(
		editor.canvas.getByRole( 'document', { name: /Block: Table/i } )
	).toBeVisible();
}

async function deleteBlockByText( editor: Editor, page: Page, text: string ) {
	await clickBlockByText( editor, page, text );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const post = await requestUtils.createPost( {
		content: [
			paragraph(
				'Long shared paragraph used as the initial collaborative editing surface.'
			),
			heading( 'Follow-up heading' ),
			paragraph(
				'Tail paragraph kept for save and reload stability checks.'
			),
			paragraph( APPENDED_PARAGRAPH ),
			rawParagraph( TABLE_ANCHOR ),
		].join( '\n' ),
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE_MARKER } realistic ${ attempt }`,
	} );

	const result: AttemptResult = {
		attempt,
		postId: post.id,
		postTitle: `${ TITLE_MARKER } realistic ${ attempt }`,
		reproduced: false,
	};

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );
		await reloadAndWait( page, collaborationUtils );

		await insertHeadingAfterText(
			primaryEditor,
			page,
			'Long shared paragraph used as the initial collaborative editing surface.',
			INSERTED_HEADING
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await insertTableAfterText(
			primaryEditor,
			page,
			APPENDED_PARAGRAPH
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await deleteBlockByText(
			collaboratorEditor,
			collaboratorPage,
			INSERTED_HEADING
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.message : String( error );
		}

		result.primaryState = await captureState( collaborationUtils, page );
		result.secondaryState = await captureState(
			collaborationUtils,
			collaboratorPage
		);
		result.finalPrimaryHasHeading = blocksContainText(
			result.primaryState,
			INSERTED_HEADING
		);
		result.finalSecondaryHasHeading = blocksContainText(
			result.secondaryState,
			INSERTED_HEADING
		);
		result.reproduced =
			!! result.convergenceError &&
			result.finalPrimaryHasHeading === true &&
			result.finalSecondaryHasHeading === false;
		return result;
	} catch ( error ) {
		result.error = error instanceof Error ? error.message : String( error );
		return result;
	}
}

for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
	test( `reload-heading-table-delete attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} );
		writeAttemptResult( result );
		expect( result.error ).toBeUndefined();
		expect( result.reproduced ).toBe( true );
	} );
}
