import fs from 'fs';
import path from 'path';

import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
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

type Scenario = {
	name: string;
	reloadCollaboratorBeforeSave?: boolean;
	saveActor: 'collaborator' | 'primary';
};

type ScenarioResult = {
	actorBecameDirty?: boolean;
	error?: string;
	name: string;
	postId?: number;
	preSaveActor?: EditorState;
	preSaveOther?: EditorState;
	primaryPersistedSnapshots?: RestSnapshot[];
	reason?: string;
	reproduced: boolean;
	restSnapshots: RestSnapshot[];
	savePayload?: SavePayloadSummary;
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
	process.env.RTC_F1F427_OUTPUT_DIR ||
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/f1f427a47ebb/realistic-results';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const ADMIN_USERNAME = process.env.WP_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD ?? 'password';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953364 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953364 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const NESTED_PARAGRAPH = 'Seed 953364 step 1 user 0 nested paragraph';
const NESTED_HEADING = 'Seed 953364 step 1 user 0 nested heading';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953364-1-0-end';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-953364-1-0-end';
const CHECKPOINT_SEARCH = 'rtc-save-search-option-marker-953364-1-0-end';

const SCENARIOS: Scenario[] = [
	{
		name: 'collaborator-save-after-remote-checkpoint',
		saveActor: 'collaborator',
	},
	{
		name: 'collaborator-reload-then-save-after-remote-checkpoint',
		reloadCollaboratorBeforeSave: true,
		saveActor: 'collaborator',
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
			username: `rtcf1f${ uniqueSuffix }`,
			email: `rtcf1f+${ uniqueSuffix }@example.com`,
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
	await page.locator( 'input[aria-label="Label text"]' ).fill(
		`Search label ${ CHECKPOINT_SEARCH }`
	);
	await page.locator( 'input[aria-label="Optional placeholder text"]' ).fill(
		`Search placeholder ${ CHECKPOINT_SEARCH }`
	);
	await page.locator( 'input[aria-label="Button text"]' ).fill(
		`Find ${ CHECKPOINT_SEARCH }`
	);
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

async function pollRestSnapshots(
	requestUtils: any,
	postId: number,
	labelPrefix: string
): Promise< RestSnapshot[] > {
	const snapshots: RestSnapshot[] = [];

	for ( let attempt = 0; attempt < 8; attempt++ ) {
		const post = await getRestPost( requestUtils, postId );
		snapshots.push( {
			contentHasMarker: post.content.raw.includes( CHECKPOINT_PARAGRAPH ),
			contentHasSearch: post.content.raw.includes( CHECKPOINT_SEARCH ),
			label: `${ labelPrefix }-${ attempt }`,
			title: post.title.raw,
		} );
		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	return snapshots;
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
		contentHasSearch: content.includes( CHECKPOINT_SEARCH ),
		keys: Object.keys( json ?? {} ),
		metaCrdtLength: crdt.length,
		title,
	};
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
		title: `RTC f1f427a47ebb initial ${ Date.now().toString( 36 ) }`,
	} );
	result.postId = post.id;

	try {
		await logInPrimaryUser( page );
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );

		await waitForSessionReady( collaborationUtils );

		await insertGroupAfterFirstParagraph( editor, page );
		await waitForSessionReady( collaborationUtils );

		await appendCheckpointBodyFromParagraph(
			editor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last(),
			page
		);
		await typePostTitle( editor, page, CHECKPOINT_TITLE );
		await waitForSessionReady( collaborationUtils );

		await expect(
			collaboratorEditor.canvas.getByText( CHECKPOINT_PARAGRAPH, {
				exact: true,
			} )
		).toBeVisible();
		await expect(
			collaboratorPage.getByText( CHECKPOINT_TITLE, { exact: true } )
		).toBeVisible();

		await editor.saveDraft();
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );
		result.primaryPersistedSnapshots = await pollRestSnapshots(
			requestUtils,
			post.id,
			'after-primary-save'
		);

		if ( scenario.reloadCollaboratorBeforeSave ) {
			await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaboratorPage,
				{
					timeout: 20000,
				}
			);
			await waitForSessionReady( collaborationUtils );
		}

		const actorPage =
			scenario.saveActor === 'primary' ? page : collaboratorPage;
		const actorEditor =
			scenario.saveActor === 'primary' ? editor : collaboratorEditor;
		const otherPage =
			scenario.saveActor === 'primary' ? collaboratorPage : page;

		result.preSaveActor = await getEditorState( actorPage );
		result.preSaveOther = await getEditorState( otherPage );
		result.actorBecameDirty = result.preSaveActor.isDirty;

		if ( ! result.preSaveActor.isDirty ) {
			result.reason =
				'save actor never became dirty after the remote checkpoint save';
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
		result.restSnapshots = await pollRestSnapshots(
			requestUtils,
			post.id,
			'after-actor-save'
		);

		const stalePayload =
			! result.savePayload.contentHasMarker ||
			! result.savePayload.contentHasSearch ||
			result.savePayload.title !== CHECKPOINT_TITLE;
		const stalePersisted = result.restSnapshots.some(
			( snapshot ) =>
				! snapshot.contentHasMarker ||
				! snapshot.contentHasSearch ||
				snapshot.title !== CHECKPOINT_TITLE
		);

		if ( stalePayload ) {
			result.reproduced = true;
			result.reason =
				'save request payload omitted the live checkpoint body, search block, or title';
		} else if ( stalePersisted ) {
			result.reproduced = true;
			result.reason =
				'persisted post lost the checkpoint body, search block, or title after the actor save';
		} else {
			result.reason =
				'actor save payload and persisted post both retained the checkpoint state';
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
