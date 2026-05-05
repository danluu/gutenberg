import fs from 'fs';
import path from 'path';

import { expect, test as base, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Locator, Page, Request } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type EditorState = {
	domHasMarker: boolean;
	domHasSearchButton: boolean;
	editedContentHasMarker: boolean;
	editedTitle: string;
	isDirty: boolean;
	visibleTitle: string;
};

type RestSnapshot = {
	contentHasMarker: boolean;
	contentHasSearch: boolean;
	label: string;
	title: string;
};

type SavePayloadSummary = {
	contentHasMarker: boolean;
	contentHasSearch: boolean;
	keys: string[];
	metaCrdtLength: number;
	title: string;
};

type ScenarioResult = {
	error?: string;
	name: string;
	postId?: number;
	preSaveActor?: EditorState;
	preSaveOther?: EditorState;
	reason?: string;
	reproduced: boolean;
	restSnapshots: RestSnapshot[];
	savePayload?: SavePayloadSummary;
};

type Scenario = {
	name: string;
	saveActor: 'collaborator' | 'primary';
};

type RestPost = {
	content: {
		raw: string;
	};
	meta: {
		_crdt_document?: string;
	};
	title: {
		raw: string;
	};
};

const RESULT_DIR =
	process.env.RTC_D853DBB76BF7_RESULT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/d853dbb76bf7/realistic-results';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';

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

const NESTED_PARAGRAPH = 'Seed 953095 step 0 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 953095 step 0 user 0 nested heading';
const UPDATED_PARAGRAPH = 'Seed 953095 step 1 user 1 updated paragraph 300587';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953095-1-1-end';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-953095-1-1-end';

const SCENARIOS: Scenario[] = [
	{
		name: 'collaborator-save-after-checkpoint',
		saveActor: 'collaborator',
	},
	{
		name: 'primary-save-after-remote-checkpoint',
		saveActor: 'primary',
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

		await requestUtils.setupRest();
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
			username: `rtcd853${ uniqueSuffix }`,
			email: `rtcd853+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', {
				name: 'Block Inserter',
				exact: true,
			} )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect(
		page.locator( '.components-autocomplete__results' ).last()
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	nextTitle: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextTitle, { delay: 20 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function logInPrimaryUser( page: Page ) {
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( ADMIN_USERNAME );
	await page.locator( '#user_pass' ).fill( ADMIN_PASSWORD );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
}

async function insertGroupAfterFirstParagraph(
	editor: Editor,
	page: Page
) {
	await editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.first()
		.click();
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( NESTED_PARAGRAPH, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( NESTED_HEADING, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function replaceParagraphText(
	paragraph: Locator,
	page: Page,
	nextText: string
) {
	await paragraph.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( nextText, { delay: 10 } );
	await expect( paragraph ).toContainText( nextText );
}

async function appendCheckpointBodyFromParagraph(
	paragraph: Locator,
	page: Page
) {
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( CHECKPOINT_PARAGRAPH, { delay: 10 } );
	await page.keyboard.press( 'Enter' );
	await insertBlockFromInserter( page, 'Search' );
	await page.keyboard.press( 'Escape' );
}

async function getEditorState( page: Page ): Promise< EditorState > {
	return page.evaluate( ( marker ) => {
		const editedContent = ( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostContent();
		const editedTitle = ( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' );
		const isDirty = ( window as any ).wp.data
			.select( 'core/editor' )
			.isEditedPostDirty();
		const visibleTitle =
			document.querySelector( '.editor-post-title__input' )?.textContent ??
			'';
		const textContent = document.body.textContent ?? '';

		return {
			domHasMarker: textContent.includes( marker ),
			domHasSearchButton: textContent.includes( `Find ${ marker }` ),
			editedContentHasMarker: editedContent.includes( marker ),
			editedTitle: editedTitle ?? '',
			isDirty: !! isDirty,
			visibleTitle,
		};
	}, CHECKPOINT_PARAGRAPH );
}

async function getRestPost(
	requestUtils: any,
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw,meta',
		},
	} );
}

async function resetWsSyncServer() {
	const wsUrl =
		process.env.GUTENBERG_RTC_TEST_WS_URL ||
		`ws://127.0.0.1:${ process.env.GUTENBERG_RTC_TEST_WS_PORT || '18994' }`;
	const resetUrl = new URL( wsUrl );
	resetUrl.protocol = resetUrl.protocol === 'wss:' ? 'https:' : 'http:';
	resetUrl.pathname = '/reset';
	resetUrl.search = '';
	resetUrl.hash = '';

	const response = await fetch( resetUrl, { method: 'POST' } );
	if ( ! response.ok && response.status !== 204 ) {
		throw new Error( `WS sync reset failed with HTTP ${ response.status }` );
	}
}

function summarizeRequestPayload( request: Request ): SavePayloadSummary {
	let json: any = {};
	try {
		json = request.postDataJSON();
	} catch {
		json = {};
	}

	const content = typeof json?.content === 'string' ? json.content : '';
	const title = typeof json?.title === 'string' ? json.title : '';
	const crdt =
		typeof json?.meta?._crdt_document === 'string'
			? json.meta._crdt_document
			: '';

	return {
		contentHasMarker: content.includes( CHECKPOINT_PARAGRAPH ),
		contentHasSearch: content.includes( '<!-- wp:search' ),
		keys: Object.keys( json ?? {} ),
		metaCrdtLength: crdt.length,
		title,
	};
}

async function pollRestSnapshots(
	requestUtils: any,
	postId: number
): Promise< RestSnapshot[] > {
	const snapshots: RestSnapshot[] = [];

	for ( let attempt = 0; attempt < 10; attempt++ ) {
		const post = await getRestPost( requestUtils, postId );
		snapshots.push( {
			contentHasMarker: post.content.raw.includes( CHECKPOINT_PARAGRAPH ),
			contentHasSearch: post.content.raw.includes( '<!-- wp:search' ),
			label: `poll-${ attempt }`,
			title: post.title.raw,
		} );
		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	return snapshots;
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
		name: scenario.name,
		reproduced: false,
		restSnapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC d853 initial ${ Date.now().toString( 36 ) }`,
	} );
	result.postId = post.id;

	try {
		await resetWsSyncServer();
		await logInPrimaryUser( page );
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );

		await waitForSessionReady( collaborationUtils );

		await insertGroupAfterFirstParagraph( editor, page );
		await waitForSessionReady( collaborationUtils );

		await replaceParagraphText(
			collaboratorEditor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last(),
			collaboratorPage,
			UPDATED_PARAGRAPH
		);
		await waitForSessionReady( collaborationUtils );

		await appendCheckpointBodyFromParagraph(
			collaboratorEditor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last(),
			collaboratorPage
		);
		await typePostTitle(
			collaboratorEditor,
			collaboratorPage,
			CHECKPOINT_TITLE
		);

		await expect(
			editor.canvas.getByText( CHECKPOINT_PARAGRAPH, { exact: true } )
		).toBeVisible();

		const actorPage = scenario.saveActor === 'primary' ? page : collaboratorPage;
		const actorEditor =
			scenario.saveActor === 'primary' ? editor : collaboratorEditor;
		const otherPage = scenario.saveActor === 'primary' ? collaboratorPage : page;

		result.preSaveActor = await getEditorState( actorPage );
		result.preSaveOther = await getEditorState( otherPage );

		if ( ! result.preSaveActor.isDirty ) {
			result.reason = 'save actor never became dirty after remote checkpoint changes';
			return result;
		}

		const saveRequestPromise = actorPage.waitForRequest(
			( request ) =>
				request.method() === 'POST' &&
				request.url().includes( `/wp-json/wp/v2/posts/${ post.id }` ) &&
				request.url().includes( '_locale=user' ),
			{ timeout: 20000 }
		);
		await actorEditor.saveDraft();
		const saveRequest = await saveRequestPromise;
		result.savePayload = summarizeRequestPayload( saveRequest );

		await collaborationUtils.waitForEntityReadyAndSaveSettled( actorPage, {
			timeout: 20000,
		} );
		result.restSnapshots = await pollRestSnapshots( requestUtils, post.id );

		const stalePayload =
			! result.savePayload.contentHasMarker ||
			result.savePayload.title !== CHECKPOINT_TITLE;
		const stalePersisted = result.restSnapshots.some(
			( snapshot ) =>
				! snapshot.contentHasMarker || snapshot.title !== CHECKPOINT_TITLE
		);

		if ( stalePayload ) {
			result.reproduced = true;
			result.reason =
				'save request payload omitted the live checkpoint body or title';
		} else if ( stalePersisted ) {
			result.reproduced = true;
			result.reason =
				'persisted post reverted to a stale body or title after save';
		} else {
			result.reason =
				'live checkpoint changes saved with matching payload and stayed persisted';
		}

		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( `search realistic save-path repro: ${ scenario.name }`, async ( {
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
		writeScenarioResult( result );
	} );
}
