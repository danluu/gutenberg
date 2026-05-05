import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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
	persistedContent: string;
	persistedTitle: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	reproduced: boolean;
	reproducedAt?: string;
	snapshots: Snapshot[];
};

const RESULT_DIR = process.env.RTC_41C14_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_41C14_ATTEMPTS ?? '5', 10 );
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const APPENDED_PARAGRAPH = 'Seed 953299 step 0 user 1 paragraph 257884';
const GROUP_PARAGRAPH = 'Seed 953299 step 1 user 0 nested paragraph';
const GROUP_HEADING = 'Seed 953299 step 1 user 0 nested heading';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953299-1-0-end';
const CHECKPOINT_SEARCH = 'rtc-save-search-option-marker-953299-1-0-end';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-953299-1-0-end';
const SEARCH_LABEL = `Search label ${ CHECKPOINT_SEARCH }`;
const SEARCH_BUTTON = `Find ${ CHECKPOINT_SEARCH }`;
const SEARCH_PLACEHOLDER = `Search placeholder ${ CHECKPOINT_SEARCH }`;

const PRE_SAVE_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ GROUP_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ GROUP_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ APPENDED_PARAGRAPH }</p>`,
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
			username: `rtc41c14${ uniqueSuffix }`,
			email: `rtc41c14+${ uniqueSuffix }@example.com`,
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
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function getPersistedState(
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
) {
	const post = await requestUtils.rest< {
		content?: string | { raw?: string; rendered?: string };
		title?: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw',
		},
	} );

	return {
		content:
			typeof post.content === 'string'
				? post.content
				: post.content?.raw ?? post.content?.rendered ?? '',
		title:
			typeof post.title === 'string'
				? post.title
				: post.title?.raw ?? post.title?.rendered ?? '',
	};
}

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persisted ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ], {
			includeCrdtDocument: true,
		} ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
		getPersistedState( requestUtils, postId ),
	] );

	return {
		label,
		persistedContent: persisted.content,
		persistedTitle: persisted.title,
		primaryState,
		secondaryState,
	};
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function clearAndType(
	page: Page,
	input: Locator,
	text: string
) {
	await expect( input ).toBeVisible();
	await input.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( text, { delay: 15 } );
}

async function insertSearchBlockAtEnd(
	editor: Editor,
	page: Page
) {
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );
	const labelField = editor.canvas
		.getByRole( 'textbox', { name: 'Label text' } )
		.last();
	await clearAndType( page, labelField, SEARCH_LABEL );
	const buttonField = editor.canvas.getByRole( 'textbox', {
		name: 'Button text',
	} );
	await clearAndType( page, buttonField, SEARCH_BUTTON );

	// Some builds do not expose the placeholder control in-canvas for Search.
	const placeholderField = editor.canvas.getByRole( 'textbox', {
		name: 'Placeholder text',
	} );
	if ( await placeholderField.count() ) {
		await clearAndType( page, placeholderField, SEARCH_PLACEHOLDER );
	}
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await clearAndType( page, titleBox, title );
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

function countOccurrences( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1;
}

function isCorruptionSnapshot( snapshot: Snapshot ) {
	if (
		snapshot.label !== 'after-save' &&
		snapshot.label !== 'after-reload'
	) {
		return false;
	}

	const normalized = JSON.stringify( snapshot.primaryState );
	return (
		snapshot.persistedTitle !== CHECKPOINT_TITLE ||
		! snapshot.persistedContent.includes( CHECKPOINT_PARAGRAPH ) ||
		snapshot.persistedContent.includes( 'grougroup' ) ||
		snapshot.persistedContent.includes( 'paragraragraph' ) ||
		snapshot.persistedContent.includes( '/wp:post-content' ) ||
		snapshot.persistedContent.includes( 'rtc-rtc-savave' ) ||
		snapshot.persistedContent.includes( 'marker--marker' ) ||
		countOccurrences( snapshot.persistedContent, CHECKPOINT_PARAGRAPH ) > 1 ||
		normalized.includes( 'core/missing' ) ||
		normalized.includes( 'grougroup' ) ||
		normalized.includes( 'paragraragraph' )
	);
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
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: PRE_SAVE_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 41c14 realistic attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'initial', collaborationUtils, requestUtils, post.id )
		);

		await appendParagraphAtEnd( editor, page, CHECKPOINT_PARAGRAPH );
		await insertSearchBlockAtEnd( editor, page );
		await typeTitle( editor, page, CHECKPOINT_TITLE );
		await saveDraft( page );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
		result.snapshots.push(
			await captureSnapshot(
				'after-save',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{ timeout: 20000 }
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'after-reload',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					'after-failure',
					collaborationUtils,
					requestUtils,
					post.id
				)
			);
		} catch {}
	}

	const corruptionSnapshot = result.snapshots.find( isCorruptionSnapshot );
	if ( corruptionSnapshot ) {
		result.reproduced = true;
		result.reproducedAt = corruptionSnapshot.label;
	}

	writeAttemptResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
	test( `41c14 realistic checkpoint reload attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} );

		if ( result.reproduced && ! result.error ) {
			return;
		}

		expect( result.error ).toBeUndefined();
	} );
}
