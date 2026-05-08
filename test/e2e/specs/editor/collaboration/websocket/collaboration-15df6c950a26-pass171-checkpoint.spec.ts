/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';

/**
 * WordPress dependencies
 */
import {
	expect,
	test as base,
	type Editor,
	type Page,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type RestPost = {
	content: {
		raw?: string;
		rendered?: string;
	};
};

type AttemptResult = {
	afterAppendPrimary: string[];
	afterAppendSecondary: string[];
	afterReloadPrimary: string[];
	afterReloadSecondary: string[];
	attempt: number;
	error: string | null;
	persistedContentContainsBoth: boolean;
	postId: number;
	primaryText: string;
	secondaryText: string;
	statesEqualAfterAppend: boolean;
	statesEqualAfterReload: boolean;
};

const OUTPUT_DIR =
	process.env.RTC_15DF6C_PASS171_OUTPUT_DIR ??
	'/tmp/rtc-15df6c950a26-pass171';
const ATTEMPTS = Number.parseInt(
	process.env.RTC_15DF6C_PASS171_ATTEMPTS ?? '3',
	10
);
const SEARCH_2_LABEL =
	'Search label rtc-save-search-option-marker-953376-2-1-end';
const INITIAL_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953376 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953376 step 2 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953376 step 2 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953376 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953376 step 0 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953376 step 0 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:pullquote {"value":"","citation":"<em>b</em><em>i</em>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p></p><cite><em>b</em><em>i</em></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953376-1-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953376-1-1-end","buttonUseIcon":false,"label":"Search label rtc-save-search-option-marker-953376-1-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953376-1-1-end","showLabel":true} /-->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953376-2-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953376 step 8 user 1 paragraph 25882</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953376-2-1-end","buttonUseIcon":false,"label":"Search label rtc-save-search-option-marker-953376-2-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953376-2-1-end","showLabel":true} /-->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
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
		const suffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtc15df171${ suffix }`,
			email: `rtc15df171+${ suffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Pass171',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function ensureOutputDir() {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
}

function writeResult( result: AttemptResult ) {
	ensureOutputDir();
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function plainText( value: unknown ): string {
	return String( value ?? '' )
		.replaceAll( /<[^>]*>/g, '' )
		.replaceAll( '&nbsp;', ' ' )
		.trim();
}

function paragraphTexts( state: any ): string[] {
	return ( state?.blocks ?? [] )
		.filter( ( block: any ) => block?.name === 'core/paragraph' )
		.map( ( block: any ) => plainText( block?.attributes?.content ) );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 30000,
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

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await titleBox.click();
	await page.keyboard.press( `${ process.platform === 'darwin' ? 'Meta' : 'Control' }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function saveDraft( editor: Editor, page: Page ) {
	if ( typeof editor.saveDraft === 'function' ) {
		await editor.saveDraft();
		return;
	}

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

async function reloadAndResync(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function selectLastSearchBlock( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const label = editor.canvas.getByText( SEARCH_2_LABEL, {
		exact: false,
	} );
	await expect( label.last() ).toBeVisible();
	await label.last().scrollIntoViewIfNeeded();
	await editor.canvas
		.getByRole( 'searchbox', {
			name: 'Optional placeholder text',
		} )
		.last()
		.click();

	const breadcrumb = page
		.getByRole( 'list', { name: 'Block breadcrumb' } )
		.getByRole( 'button', { name: 'Search' } );
	if ( await breadcrumb.isVisible().catch( () => false ) ) {
		await breadcrumb.click();
	}
}

async function insertParagraphAfterSearchByMenu(
	page: Page,
	editor: Editor,
	text: string
) {
	await selectLastSearchBlock( page, editor );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addAfter = page.getByRole( 'menuitem', {
		name: /Add after|Insert after/i,
	} );
	await expect( addAfter ).toBeVisible();
	await addAfter.click();
	await page.keyboard.type( text, { delay: 80 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function normalizedStates(
	collaborationUtils: CollaborationUtilsClass,
	primaryPage: Page,
	secondaryPage: Page
) {
	return Promise.all( [
		collaborationUtils.getNormalizedPostState( primaryPage, {
			includeCrdtDocument: true,
		} ),
		collaborationUtils.getNormalizedPostState( secondaryPage, {
			includeCrdtDocument: true,
		} ),
	] );
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	editor,
	page,
	postId,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	page: Page;
	postId: number;
	requestUtils: {
		rest: < T >( input: { path: string } ) => Promise< T >;
	};
} ) {
	const primaryText = `rtc15df pass171 primary after checkpoint ${ attempt }`;
	const secondaryText = `rtc15df pass171 secondary after checkpoint ${ attempt }`;
	const result: AttemptResult = {
		afterAppendPrimary: [],
		afterAppendSecondary: [],
		afterReloadPrimary: [],
		afterReloadSecondary: [],
		attempt,
		error: null,
		persistedContentContainsBoth: false,
		postId,
		primaryText,
		secondaryText,
		statesEqualAfterAppend: false,
		statesEqualAfterReload: false,
	};

	try {
		await typeTitle(
			editor,
			page,
			`rtc-save-title-marker-953376-pass171-checkpoint-${ attempt }`
		);
		await saveDraft( editor, page );
		await waitForSessionReady( collaborationUtils );
		await reloadAndResync( collaboratorPage, collaborationUtils );

		await Promise.all( [
			insertParagraphAfterSearchByMenu( page, editor, primaryText ),
			insertParagraphAfterSearchByMenu(
				collaboratorPage,
				collaboratorEditor,
				secondaryText
			),
		] );
		await waitForSessionReady( collaborationUtils );

		const [ afterAppendPrimary, afterAppendSecondary ] =
			await normalizedStates( collaborationUtils, page, collaboratorPage );
		result.afterAppendPrimary = paragraphTexts( afterAppendPrimary );
		result.afterAppendSecondary = paragraphTexts( afterAppendSecondary );
		result.statesEqualAfterAppend =
			JSON.stringify( afterAppendPrimary ) ===
			JSON.stringify( afterAppendSecondary );

		for ( const [ label, paragraphs ] of [
			[ 'primary after append', result.afterAppendPrimary ],
			[ 'secondary after append', result.afterAppendSecondary ],
		] as const ) {
			expect( paragraphs, label ).toContain( primaryText );
			expect( paragraphs, label ).toContain( secondaryText );
		}
		expect( result.statesEqualAfterAppend ).toBe( true );

		await saveDraft( editor, page );
		await waitForSessionReady( collaborationUtils );
		await Promise.all( [
			reloadAndResync( page, collaborationUtils ),
			reloadAndResync( collaboratorPage, collaborationUtils ),
		] );

		const [ afterReloadPrimary, afterReloadSecondary ] =
			await normalizedStates( collaborationUtils, page, collaboratorPage );
		result.afterReloadPrimary = paragraphTexts( afterReloadPrimary );
		result.afterReloadSecondary = paragraphTexts( afterReloadSecondary );
		result.statesEqualAfterReload =
			JSON.stringify( afterReloadPrimary ) ===
			JSON.stringify( afterReloadSecondary );

		for ( const [ label, paragraphs ] of [
			[ 'primary after reload', result.afterReloadPrimary ],
			[ 'secondary after reload', result.afterReloadSecondary ],
		] as const ) {
			expect( paragraphs, label ).toContain( primaryText );
			expect( paragraphs, label ).toContain( secondaryText );
		}
		expect( result.statesEqualAfterReload ).toBe( true );

		const persisted = await requestUtils.rest< RestPost >( {
			path: `/wp/v2/posts/${ postId }`,
		} );
		const persistedContent =
			persisted.content.raw ?? persisted.content.rendered ?? '';
		result.persistedContentContainsBoth =
			persistedContent.includes( primaryText ) &&
			persistedContent.includes( secondaryText );
		expect( result.persistedContentContainsBoth ).toBe( true );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		throw error;
	} finally {
		writeResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

test.describe(
	'RTC 15df6c950a26 pass171 checkpointed concurrent tail append',
	() => {
		for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
			test( `menu Add after after save/reload checkpoint attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 180000 );
				ensureOutputDir();

				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `rtc-save-title-marker-953376-pass171-initial-${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser(
					post.id,
					collaboratorUser
				);
				await waitForSessionReady( collaborationUtils );

				await runAttempt( {
					attempt,
					collaborationUtils,
					collaboratorEditor,
					collaboratorPage,
					editor,
					page,
					postId: post.id,
					requestUtils,
				} );
			} );
		}
	}
);
