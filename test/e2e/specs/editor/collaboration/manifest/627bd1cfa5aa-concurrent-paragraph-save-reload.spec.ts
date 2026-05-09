/**
 * External dependencies
 */
import type { BrowserContext, Page, Request } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type {
	Admin,
	Editor,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from '../fixtures';

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const ADMIN_USER = process.env.WP_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD || 'password';

type RestField = { raw?: string; rendered?: string } | string;
type RestPost = {
	content?: RestField;
	id: number;
	meta?: { _crdt_document?: string | null };
};

type SaveTraceEntry = {
	label: string;
	method: string;
	requestPostData: string;
	responseContentRaw?: string;
	responseStatus?: number;
	url: string;
};

type SaveSummary = {
	label: string;
	requestHasA: boolean;
	requestHasB: boolean;
	requestIsEmpty: boolean;
	responseHasA: boolean;
	responseHasB: boolean;
	responseIsEmpty: boolean;
	responseStatus?: number;
};

type EditorSnapshot = {
	blockCount: number;
	blockText: string[];
	editedPostContent: string;
};

type ScenarioResult = {
	attempt: number;
	bSave?: SaveSummary;
	beforeBSaveHadA: boolean;
	emptyContentSaves: SaveSummary[];
	finalContent: string;
	finalHasA: boolean;
	finalHasB: boolean;
	markerA: string;
	markerB: string;
	persistedCRDTDocLength: number;
	postId: number;
	reloaded: EditorSnapshot;
	reloadedHasA: boolean;
	reloadedHasB: boolean;
	stalePreconditionExercised: boolean;
};

function paragraphMarkup( content: string ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function rawField( field?: RestField ): string {
	if ( ! field ) {
		return '';
	}
	return typeof field === 'string'
		? field
		: field.raw ?? field.rendered ?? '';
}

function isPostSaveRequest( request: Request, postId: number ) {
	const url = request.url();
	const method = request.method();
	return (
		( method === 'POST' || method === 'PUT' ) &&
		( url.includes( `/wp/v2/posts/${ postId }` ) ||
			url.includes( `rest_route=%2Fwp%2Fv2%2Fposts%2F${ postId }` ) )
	);
}

function attachSaveTrace( page: Page, label: string, postId: number ) {
	const entries: SaveTraceEntry[] = [];

	page.on( 'request', ( request ) => {
		if ( ! isPostSaveRequest( request, postId ) ) {
			return;
		}
		entries.push( {
			label,
			method: request.method(),
			requestPostData: request.postData() ?? '',
			url: request.url(),
		} );
	} );

	page.on( 'response', async ( response ) => {
		const request = response.request();
		if ( ! isPostSaveRequest( request, postId ) ) {
			return;
		}
		const entry = entries
			.slice()
			.reverse()
			.find(
				( item ) =>
					item.url === request.url() &&
					item.method === request.method() &&
					item.responseStatus === undefined
			);
		if ( ! entry ) {
			return;
		}
		entry.responseStatus = response.status();
		try {
			const body = await response.json();
			entry.responseContentRaw = body?.content?.raw ?? '';
		} catch {
			entry.responseContentRaw = '';
		}
	} );

	return entries;
}

function requestContent( entry: SaveTraceEntry ) {
	try {
		return String( JSON.parse( entry.requestPostData )?.content ?? '' );
	} catch {}
	return new URLSearchParams( entry.requestPostData ).get( 'content' ) ?? '';
}

function summarizeSave(
	entry: SaveTraceEntry,
	markerA: string,
	markerB: string
): SaveSummary {
	const requestBody = requestContent( entry );
	const responseBody = String( entry.responseContentRaw ?? '' );
	return {
		label: entry.label,
		requestHasA: requestBody.includes( markerA ),
		requestHasB: requestBody.includes( markerB ),
		requestIsEmpty: requestBody === '',
		responseHasA: responseBody.includes( markerA ),
		responseHasB: responseBody.includes( markerB ),
		responseIsEmpty: responseBody === '',
		responseStatus: entry.responseStatus,
	};
}

function summarizeSaves(
	entries: SaveTraceEntry[],
	markerA: string,
	markerB: string
) {
	return entries.map( ( entry ) =>
		summarizeSave( entry, markerA, markerB )
	);
}

function latestSaveForLabel(
	entries: SaveTraceEntry[],
	markerA: string,
	markerB: string,
	label: string
): SaveSummary | undefined {
	return summarizeSaves( entries, markerA, markerB )
		.filter( ( entry ) => entry.label === label )
		.reverse()
		.find(
			( entry ) =>
				entry.requestHasA ||
				entry.requestHasB ||
				entry.responseHasA ||
				entry.responseHasB
		);
}

async function waitForEditorReady( page: Page, postId: number ) {
	await page.waitForFunction(
		( id ) =>
			( window as any )._wpCollaborationEnabled === true &&
			( window as any ).wp?.data &&
			( window as any ).wp?.blocks &&
			( window as any ).wp.data
				.select( 'core/editor' )
				.getCurrentPostId() === Number( id ) &&
			( window as any ).wp.data
				.select( 'core' )
				.hasFinishedResolution( 'getEntityRecord', [
					'postType',
					'post',
					Number( id ),
				] ) &&
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		postId,
		{ timeout: 30000 }
	);
	await page.waitForFunction(
		() => document.querySelector( 'iframe[name="editor-canvas"]' ),
		undefined,
		{ timeout: 30000 }
	);
}

async function openPrimaryEditor(
	admin: Admin,
	editor: Editor,
	page: Page,
	postId: number
) {
	await admin.visitAdminPage( 'post.php', `post=${ postId }&action=edit` );
	await editor.setPreferences( 'core/edit-post', {
		welcomeGuide: false,
		fullscreenMode: false,
	} );
	await waitForEditorReady( page, postId );
}

async function openSameAdminEditor( admin: Admin, postId: number ) {
	const context = await admin.browser.newContext( {
		baseURL: BASE_URL,
	} );
	const page = await context.newPage();

	try {
		await page.goto( '/wp-login.php' );
		await page.locator( '#user_login' ).fill( ADMIN_USER );
		await page.locator( '#user_pass' ).fill( ADMIN_PASSWORD );
		await page.getByRole( 'button', { name: 'Log In' } ).click();
		await page.waitForURL( '**/wp-admin/**' );

		await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
		await page.evaluate( () => {
			( window as any ).wp.data
				.dispatch( 'core/preferences' )
				.set( 'core/edit-post', 'welcomeGuide', false );
			( window as any ).wp.data
				.dispatch( 'core/preferences' )
				.set( 'core/edit-post', 'fullscreenMode', false );
		} );
		await waitForEditorReady( page, postId );
		return { context, page };
	} catch ( error ) {
		await context.close();
		throw error;
	}
}

async function waitForMutualDiscovery( pageA: Page, pageB: Page ) {
	await Promise.all(
		[ pageA, pageB ].map( ( page ) =>
			page
				.getByRole( 'button', { name: /Collaborators list/ } )
				.waitFor( { timeout: 30000 } )
		)
	);
}

function editorFrame( page: Page ) {
	const frame = page.frame( { name: 'editor-canvas' } );
	if ( ! frame ) {
		throw new Error( 'Editor iframe is not available.' );
	}
	return frame;
}

async function appendParagraphWithKeyboard( page: Page, marker: string ) {
	const frame = editorFrame( page );
	const editable = frame
		.locator( '[data-type="core/paragraph"][contenteditable="true"]' )
		.first();
	await editable.waitFor( { state: 'visible', timeout: 30000 } );

	await editable.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( marker );
	await page.waitForFunction(
		( expected ) =>
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some( ( block: { attributes?: { content?: string } } ) =>
					String( block.attributes?.content ?? '' ).includes(
						expected
					)
				),
		marker,
		{ timeout: 7000 }
	);
}

async function saveDraftWithToolbar( page: Page ) {
	const button = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: /^Save draft$/ } );
	await button.waitFor( { state: 'visible', timeout: 30000 } );
	await page.waitForFunction(
		() =>
			( window as any ).wp.data
				.select( 'core/editor' )
				.isEditedPostDirty(),
		undefined,
		{ timeout: 30000 }
	);
	await button.click();
	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: 30000 }
	);
}

async function editorHasText( page: Page, marker: string ) {
	return page.evaluate(
		( expected ) =>
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some( ( block: { attributes?: { content?: string } } ) =>
					String( block.attributes?.content ?? '' ).includes(
						expected
					)
				),
		marker
	);
}

async function getEditorSnapshot( page: Page ): Promise< EditorSnapshot > {
	return page.evaluate( () => {
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();
		return {
			blockCount: blocks.length,
			blockText: blocks.map( ( block: { attributes?: unknown } ) =>
				JSON.stringify( block.attributes ?? {} )
			),
			editedPostContent:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostContent() ?? '',
		};
	} );
}

async function waitForServerText(
	requestUtils: RequestUtils,
	postId: number,
	marker: string
) {
	await expect
		.poll(
			async () =>
				rawField(
					(
						await requestUtils.rest< RestPost >( {
							path: `/wp/v2/posts/${ postId }?context=edit`,
						} )
					).content
				),
			{ timeout: 30000 }
		)
		.toContain( marker );
}

async function getPersistedPost(
	requestUtils: RequestUtils,
	postId: number
) {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId}`,
		params: {
			context: 'edit',
			_fields: 'id,content.raw,meta._crdt_document',
		},
	} );
}

async function runScenario( {
	admin,
	attempt,
	editor,
	page,
	requestUtils,
}: {
	admin: Admin;
	attempt: number;
	editor: Editor;
	page: Page;
	requestUtils: RequestUtils;
} ): Promise< ScenarioResult > {
	const markerA = `rtc-627-a-${ Date.now() }-${ attempt }`;
	const markerB = `rtc-627-b-${ Date.now() }-${ attempt }`;
	const post = await requestUtils.createPost( {
		title: `627bd1 reload oracle ${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: paragraphMarkup( 'Initial body.' ),
	} );
	const postId = post.id;
	let secondaryContext: BrowserContext | undefined;

	try {
		await openPrimaryEditor( admin, editor, page, postId );
		const joined = await openSameAdminEditor( admin, postId );
		secondaryContext = joined.context;
		const pageB = joined.page;
		const saveTraceA = attachSaveTrace( page, 'A', postId );
		const saveTraceB = attachSaveTrace( pageB, 'B', postId );

		await waitForMutualDiscovery( page, pageB );

		await appendParagraphWithKeyboard( page, markerA );
		await saveDraftWithToolbar( page );
		await waitForServerText( requestUtils, postId, markerA );

		const beforeBSaveHadA = await editorHasText( pageB, markerA );
		if ( beforeBSaveHadA ) {
			return {
				attempt,
				beforeBSaveHadA,
				emptyContentSaves: [],
				finalContent: '',
				finalHasA: false,
				finalHasB: false,
				markerA,
				markerB,
				persistedCRDTDocLength: 0,
				postId,
				reloaded: {
					blockCount: -1,
					blockText: [],
					editedPostContent: '',
				},
				reloadedHasA: false,
				reloadedHasB: false,
				stalePreconditionExercised: false,
			};
		}

		await appendParagraphWithKeyboard( pageB, markerB );
		await saveDraftWithToolbar( pageB );
		await waitForServerText( requestUtils, postId, markerB );

		await pageB.reload( { waitUntil: 'domcontentloaded' } );
		await waitForEditorReady( pageB, postId );
		const reloaded = await getEditorSnapshot( pageB );
		const persistedPost = await getPersistedPost( requestUtils, postId );
		const finalContent = rawField( persistedPost.content );
		const allSaves = [ ...saveTraceA, ...saveTraceB ];
		const saveSummaries = summarizeSaves( allSaves, markerA, markerB );

		return {
			attempt,
			bSave: latestSaveForLabel( allSaves, markerA, markerB, 'B' ),
			beforeBSaveHadA,
			emptyContentSaves: saveSummaries.filter(
				( entry ) => entry.requestIsEmpty || entry.responseIsEmpty
			),
			finalContent,
			finalHasA: finalContent.includes( markerA ),
			finalHasB: finalContent.includes( markerB ),
			markerA,
			markerB,
			persistedCRDTDocLength: String(
				persistedPost.meta?._crdt_document ?? ''
			).length,
			postId,
			reloaded,
			reloadedHasA:
				reloaded.editedPostContent.includes( markerA ) ||
				reloaded.blockText.some( ( text ) => text.includes( markerA ) ),
			reloadedHasB:
				reloaded.editedPostContent.includes( markerB ) ||
				reloaded.blockText.some( ( text ) => text.includes( markerB ) ),
			stalePreconditionExercised: true,
		};
	} finally {
		await secondaryContext?.close();
	}
}

async function runUntilStalePrecondition(
	options: Omit< Parameters< typeof runScenario >[ 0 ], 'attempt' >,
	maxAttempts: number
) {
	let lastResult: ScenarioResult | undefined;
	for ( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
		lastResult = await runScenario( {
			...options,
			attempt,
		} );
		if ( lastResult.stalePreconditionExercised ) {
			return lastResult;
		}
	}
	throw new Error(
		`Could not exercise a stale same-account editor before polling caught up after ${ maxAttempts } attempts. Last result: ${ JSON.stringify(
			lastResult
		) }`
	);
}

test( 'keeps a non-empty block list after stale same-user paragraph save and reload', async ( {
	admin,
	collaborationUtils,
	editor,
	page,
	requestUtils,
}, testInfo ) => {
	test.setTimeout( 180000 );
	void collaborationUtils;

	const result = await runUntilStalePrecondition(
		{
			admin,
			editor,
			page,
			requestUtils,
		},
		6
	);

	await testInfo.attach( '627bd1cfa5aa-reload-oracle', {
		body: JSON.stringify( result, null, 2 ),
		contentType: 'application/json',
	} );

	expect( result.beforeBSaveHadA ).toBe( false );
	expect( result.bSave?.requestHasB ).toBe( true );
	expect( result.bSave?.responseStatus ).toBe( 200 );
	expect(
		result.emptyContentSaves.filter(
			( entry ) =>
				! entry.responseStatus ||
				( entry.responseStatus >= 200 && entry.responseStatus < 300 )
		)
	).toEqual( [] );
	expect( result.finalHasA ).toBe( true );
	expect( result.finalHasB ).toBe( true );
	expect( result.reloaded.blockCount ).toBeGreaterThan( 0 );
	expect( result.reloaded.editedPostContent ).not.toBe( '' );
	expect( result.reloadedHasA ).toBe( true );
	expect( result.reloadedHasB ).toBe( true );
	expect( result.persistedCRDTDocLength ).toBeGreaterThan( 0 );
} );
