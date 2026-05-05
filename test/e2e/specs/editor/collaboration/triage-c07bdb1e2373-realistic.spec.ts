import fs from 'fs';
import path from 'path';

import { test as base, expect, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type RestPostRecord = {
	content?: { raw?: string; rendered?: string } | string;
	meta?: { _crdt_document?: string | null };
	title?: { raw?: string; rendered?: string } | string;
};

type AttemptResult = {
	afterHeadingError?: string;
	afterHeadingPrimary?: unknown;
	afterHeadingSecondary?: unknown;
	afterReloadPrimary?: unknown;
	afterReloadSecondary?: unknown;
	attempt: number;
	persistedAfterReload?: RestPostRecord;
	persistedAfterSave?: RestPostRecord;
	reproduced: boolean;
	reproducedReason?: string;
};

type ReproResult = {
	attempts: AttemptResult[];
};

const RESULT_DIR = process.env.RTC_C07_RESULT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
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
			username: `rtcc07${ uniqueSuffix }`,
			email: `rtcc07+${ uniqueSuffix }@example.com`,
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

test.use( { trace: 'on' } );

function writeResult( result: ReproResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, 'realistic-result.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
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

async function addAfterSelected( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
}

async function insertParagraphAfterHeading(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickBlockByText( editor, page, 'Follow-up heading' );
	await addAfterSelected( page, editor );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function appendCheckpointBody(
	editor: Editor,
	page: Page,
	paragraphMarker: string,
	searchMarker: string
) {
	const lastParagraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last();
	await lastParagraph.click();
	await addAfterSelected( page, editor );
	await page.keyboard.type( paragraphMarker, { delay: 10 } );
	await expect(
		editor.canvas.getByText( paragraphMarker, { exact: false } )
	).toBeVisible();

	await clickBlockByText( editor, page, paragraphMarker );
	await addAfterSelected( page, editor );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();

	const labelField = editor.canvas
		.getByRole( 'textbox', { name: 'Label text' } )
		.last();
	await labelField.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( `Search label ${ searchMarker }`, { delay: 10 } );

	const placeholderField = editor.canvas
		.getByRole( 'searchbox', { name: 'Optional placeholder text' } )
		.last();
	await placeholderField.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( `Search placeholder ${ searchMarker }`, {
		delay: 10,
	} );

	const buttonField = editor.canvas
		.getByRole( 'textbox', { name: 'Button text' } )
		.last();
	await buttonField.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( `Find ${ searchMarker }`, { delay: 10 } );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 10 } );
	await expect( titleBox ).toContainText( title );
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

async function insertHeadingBeforeFirstParagraph(
	editor: Editor,
	page: Page,
	headingText: string
) {
	await clickBlockByText(
		editor,
		page,
		'Long shared paragraph used as the initial collaborative editing surface.'
	);
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 10 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function getPersistedPost(
	requestUtils: any,
	postId: number
): Promise< RestPostRecord > {
	return requestUtils.rest< RestPostRecord >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw,meta._crdt_document',
		},
	} );
}

function stringifyBlocks( state: unknown ): string {
	return JSON.stringify(
		(state as { blocks?: unknown[] } | null)?.blocks ?? []
	);
}

function matchesSeedFamily(
	stateA: unknown,
	stateB: unknown,
	headingText: string,
	paragraphMarker: string,
	searchMarker: string
): string | null {
	for ( const [ index, state ] of [ stateA, stateB ].entries() ) {
		const blocksJson = stringifyBlocks( state );
		const hasHeading = blocksJson.includes( headingText );
		const hasParagraphMarker = blocksJson.includes( paragraphMarker );
		const hasSearchMarker = blocksJson.includes( searchMarker );
		const hasDuplicateSuffix =
			blocksJson.includes(
				'Long shared paragraph used as the initial collaborative editing surface.'
			) &&
			blocksJson.includes( 'Follow-up heading' ) &&
			blocksJson.includes(
				'Tail paragraph kept for save and reload stability checks.'
			);

		if (
			hasHeading &&
			hasParagraphMarker &&
			hasSearchMarker &&
			hasDuplicateSuffix &&
			blocksJson.indexOf( paragraphMarker ) < blocksJson.lastIndexOf(
				'Tail paragraph kept for save and reload stability checks.'
			)
		) {
			return `page ${ index } kept the checkpoint title/body but appended duplicated baseline blocks after the saved Search boundary`;
		}
	}

	return null;
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const paragraphText = 'Seed 951371 step 1 user 0 paragraph 130243';
	const paragraphMarker = 'rtc-save-paragraph-marker-951371-1-0-end';
	const searchMarker = 'rtc-save-search-option-marker-951371-1-0-end';
	const titleMarker = 'rtc-save-title-marker-951371-1-0-end';
	const headingText = 'Seed 951371 step 2 user 0 heading';

	const result: AttemptResult = {
		attempt,
		reproduced: false,
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `c07 realistic attempt ${ attempt }`,
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await insertParagraphAfterHeading( editor, page, paragraphText );
	await appendCheckpointBody( editor, page, paragraphMarker, searchMarker );
	await typeTitle( editor, page, titleMarker );
	await saveDraft( page );

	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	result.persistedAfterSave = await getPersistedPost( requestUtils, post.id );

	await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( collaboratorPage, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
	result.afterReloadPrimary = await collaborationUtils.getNormalizedPostState(
		page,
		{ includeCrdtDocument: true }
	);
	result.afterReloadSecondary = await collaborationUtils.getNormalizedPostState(
		collaboratorPage,
		{ includeCrdtDocument: true }
	);
	result.persistedAfterReload = await getPersistedPost( requestUtils, post.id );

	await insertHeadingBeforeFirstParagraph( editor, page, headingText );

	try {
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
	} catch ( error ) {
		result.afterHeadingError =
			error instanceof Error ? error.message : String( error );
		result.afterHeadingPrimary =
			await collaborationUtils.getNormalizedPostState( page, {
				includeCrdtDocument: true,
			} );
		result.afterHeadingSecondary =
			await collaborationUtils.getNormalizedPostState( collaboratorPage, {
				includeCrdtDocument: true,
			} );
		result.reproducedReason = matchesSeedFamily(
			result.afterHeadingPrimary,
			result.afterHeadingSecondary,
			headingText,
			paragraphMarker,
			searchMarker
		);
		result.reproduced = !! result.reproducedReason;
	}

	return result;
}

test( 'c07bdb1e2373 realistic save-reload-heading sequence', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 300000 );

	const attempts: AttemptResult[] = [];

	for ( let attempt = 1; attempt <= 3; attempt++ ) {
		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} );
		attempts.push( result );
		writeResult( { attempts } );
		if ( result.reproduced ) {
			break;
		}
	}

	writeResult( { attempts } );
} );
