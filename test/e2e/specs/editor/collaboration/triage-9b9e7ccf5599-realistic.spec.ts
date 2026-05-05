import fs from 'fs';
import path from 'path';

import type { Page, Request } from '@playwright/test';
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

type SaveEvent = {
	actor: 'primary' | 'collaborator';
	contentLength: number;
	crdtLength: number;
	failed: boolean;
	method: string;
	status?: number;
	title: string;
	url: string;
};

type Snapshot = {
	blockCount: number;
	crdtLength: number;
	label: string;
	persistedContentLength: number;
	persistedTitle: string;
	saveEventCount: number;
	title: string;
};

type ScenarioResult = {
	error?: string;
	name: string;
	postId?: number;
	reloadTarget: 'primary' | 'collaborator';
	saveEvents: SaveEvent[];
	snapshots: Snapshot[];
	symptom?: {
		blockCount: number;
		emptyContentSaveCount: number;
		label: string;
		persistedContentLength: number;
	};
};

const OUTPUT_DIR = process.env.RTC_9B9E7CCF_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC 9b9e baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>RTC 9b9e nested paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">RTC 9b9e nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC 9b9e second paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC 9b9e shared paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:pullquote -->',
	'<figure class="wp-block-pullquote"><blockquote><p>RTC 9b9e pullquote text</p><cite>RTC 9b9e citation</cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
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
		await setCollaboration( requestUtils, false );
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
			username: `rtc9b9e${ uniqueSuffix }`,
			email: `rtc9b9e+${ uniqueSuffix }@example.com`,
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
	{ includeCrdtDocument = false }: { includeCrdtDocument?: boolean } = {}
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument,
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
		meta?: { _crdt_document?: string | null };
		title?: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw,meta._crdt_document',
		},
	} );

	return {
		content:
			typeof post.content === 'string'
				? post.content
				: post.content?.raw ?? post.content?.rendered ?? '',
		crdtLength: post.meta?._crdt_document?.length ?? 0,
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
	postId: number,
	saveEvents: SaveEvent[]
): Promise< Snapshot > {
	const state = await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
	const persisted = await getPersistedState( requestUtils, postId );

	return {
		blockCount: state.blocks.length,
		crdtLength: persisted.crdtLength,
		label,
		persistedContentLength: persisted.content.length,
		persistedTitle: persisted.title,
		saveEventCount: saveEvents.length,
		title: state.title,
	};
}

function isPostSaveRequest( url: string, postId: number ) {
	return url.includes( `/wp/v2/posts/${ postId }` );
}

function watchSaveRequests(
	page: Page,
	actor: 'primary' | 'collaborator',
	postId: number,
	saveEvents: SaveEvent[]
) {
	const pushEvent = async (
		request: Request,
		failed: boolean,
		status?: number
	) => {
		if (
			request.method() !== 'POST' ||
			! isPostSaveRequest( request.url(), postId )
		) {
			return;
		}

		let postData: Record< string, any > = {};
		try {
			postData = request.postDataJSON() as Record< string, any >;
		} catch {}

		saveEvents.push( {
			actor,
			contentLength: String( postData.content ?? '' ).length,
			crdtLength:
				typeof postData.meta?._crdt_document === 'string'
					? postData.meta._crdt_document.length
					: 0,
			failed,
			method: request.method(),
			status,
			title: String( postData.title ?? '' ),
			url: request.url(),
		} );
	};

	const finishedHandler = async ( request: any ) => {
		const response = await request.response();
		await pushEvent( request, false, response?.status() );
	};
	const failedHandler = async ( request: any ) => {
		await pushEvent( request, true );
	};

	page.on( 'requestfinished', finishedHandler );
	page.on( 'requestfailed', failedHandler );

	return () => {
		page.off( 'requestfinished', finishedHandler );
		page.off( 'requestfailed', failedHandler );
	};
}

async function clickTextInCanvas( editor: Editor, text: string ) {
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function appendParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickTextInCanvas( editor, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 10 } );
	await expect( titleBox ).toContainText( title );
}

async function replaceParagraphText(
	editor: Editor,
	page: Page,
	previousText: string,
	nextText: string
) {
	await clickTextInCanvas( editor, previousText );
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextText, { delay: 10 } );
	await expect( editor.canvas.getByText( nextText ) ).toBeVisible();
}

async function insertSearchBlockFromEmptyParagraph( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function clickSaveDraft( page: Page ) {
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

async function editPullquote(
	editor: Editor,
	page: Page,
	quoteText: string,
	citationText: string
) {
	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await expect( quoteBox ).toBeVisible();
	await quoteBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	if ( quoteText ) {
		await page.keyboard.type( quoteText, { delay: 10 } );
	}

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( citationText, { delay: 10 } );
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	reloadTarget,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	reloadTarget: 'primary' | 'collaborator';
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const checkpointParagraph = `rtc-9b9e-checkpoint-${ Date.now() }`;
	const checkpointTitle = `rtc-9b9e-title-${ Date.now() }`;
	const primaryParagraph = `rtc-9b9e-primary-${ Date.now() }`;
	const collaboratorParagraph = `rtc-9b9e-collaborator-${ Date.now() }`;
	const postReloadParagraph = `rtc-9b9e-post-reload-${ Date.now() }`;
	const result: ScenarioResult = {
		name: `realistic-${ reloadTarget }-reload`,
		reloadTarget,
		saveEvents: [],
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 9b9e ${ reloadTarget } initial title`,
	} );
	result.postId = post.id;

	let stopPrimaryWatch = () => {};
	let stopCollaboratorWatch = () => {};

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );

		stopPrimaryWatch = watchSaveRequests(
			page,
			'primary',
			post.id,
			result.saveEvents
		);
		stopCollaboratorWatch = watchSaveRequests(
			collaboratorPage,
			'collaborator',
			post.id,
			result.saveEvents
		);

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'initial',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		await appendParagraphAfterText(
			editor,
			page,
			'RTC 9b9e shared paragraph.',
			primaryParagraph
		);
		await appendParagraphAfterText(
			collaboratorEditor,
			collaboratorPage,
			'RTC 9b9e shared paragraph.',
			collaboratorParagraph
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'after-concurrent-append',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		await appendParagraphAfterText(
			editor,
			page,
			primaryParagraph,
			checkpointParagraph
		);
		await page.keyboard.press( 'Enter' );
		await insertSearchBlockFromEmptyParagraph( page );
		await typeTitle( editor, page, checkpointTitle );
		await clickSaveDraft( page );
		await waitForSessionReady( collaborationUtils, {
			includeCrdtDocument: true,
		} );
		result.snapshots.push(
			await captureSnapshot(
				'after-checkpoint-save',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( collaboratorPage, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils, {
			includeCrdtDocument: true,
		} );
		result.snapshots.push(
			await captureSnapshot(
				'after-viewer-reload',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		await clickTextInCanvas( collaboratorEditor, 'RTC 9b9e nested paragraph.' );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await waitForSessionReady( collaborationUtils );

		await clickTextInCanvas( collaboratorEditor, 'RTC 9b9e nested heading' );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'after-empty-group',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		await appendParagraphAfterText(
			editor,
			page,
			checkpointParagraph,
			postReloadParagraph
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'before-target-reload',
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		const pageToReload =
			reloadTarget === 'primary' ? page : collaboratorPage;
		await pageToReload.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( pageToReload, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils, {
			includeCrdtDocument: true,
		} );
		result.snapshots.push(
			await captureSnapshot(
				`after-${ reloadTarget }-reload`,
				collaborationUtils,
				requestUtils,
				post.id,
				result.saveEvents
			)
		);

		const emptyContentSaves = result.saveEvents.filter(
			( event ) =>
				event.contentLength === 0 && event.crdtLength > 0 && ! event.failed
		);
		const symptomSnapshot = result.snapshots.find(
			( snapshot ) =>
				snapshot.blockCount === 0 || snapshot.persistedContentLength === 0
		);

		if ( symptomSnapshot || emptyContentSaves.length > 0 ) {
			result.symptom = {
				blockCount: symptomSnapshot?.blockCount ?? -1,
				emptyContentSaveCount: emptyContentSaves.length,
				label:
					symptomSnapshot?.label ??
					'empty-content-save-with-nonempty-crdt-document',
				persistedContentLength:
					symptomSnapshot?.persistedContentLength ?? -1,
			};
		}
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	} finally {
		stopPrimaryWatch();
		stopCollaboratorWatch();
		writeScenarioResult( result );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const reloadTarget of [ 'primary', 'collaborator' ] as const ) {
	test( `9b9e realistic ${ reloadTarget } reload`, async ( {
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
			reloadTarget,
			requestUtils,
		} );

		expect( result.error ).toBeUndefined();
		expect( result.symptom ).toBeUndefined();
	} );
}
