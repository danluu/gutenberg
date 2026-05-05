import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	persistedContent: string;
	persistedTitle: string;
	postId: number;
	primaryState: unknown;
	reproduced: boolean;
	scenario: string;
	secondaryState: unknown;
	statesEqual: boolean;
	textsPresentOnBoth: boolean;
};

const PRESEEDED_TITLE = 'RTC seed 956646 step 6 user 0 title 152415';
const ANCHOR_TEXT = 'Seed 956646 step 7 user 1 paragraph 660210';

const PRESEEDED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 956646 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item three for sync coverage.</li>',
	'<!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:pullquote {"citation":"<em>alpha</em><strong>beta</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p>xy</p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:quote {"citation":"RTC Fuzzer"} -->',
	'<blockquote class="wp-block-quote">',
	'<!-- wp:paragraph -->',
	'<p>Quoted content for merge and persistence checks.</p>',
	'<!-- /wp:paragraph -->',
	'<cite>RTC Fuzzer</cite>',
	'</blockquote>',
	'<!-- /wp:quote -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-956646-2-1-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-956646-2-1-end","buttonUseIcon":false,"label":"Search label rtc-save-search-option-marker-956646-2-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-956646-2-1-end","showLabel":true} /-->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 956646 step 3 user 1</td><td>initial row 1 B seed 956646 step 3 user 1</td></tr><tr><td>initial row 2 A seed 956646 step 3 user 1</td><td>initial row 2 B seed 956646 step 3 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 956646 step 4 user 0 paragraph 676595</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 956646 step 7 user 1 paragraph 660210</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 956646 step 2 user 1 heading</h3>',
	'<!-- /wp:heading -->',
].join( '\n' );

const OUTPUT_DIR = process.env.RTC_AEE89C_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

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
			username: `rtcaee${ uniqueSuffix }`,
			email: `rtcaee+${ uniqueSuffix }@example.com`,
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

function writeResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
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

async function clickCanvasText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	const target = editor.canvas.getByText( text, { exact: false } ).last();
	await expect( target ).toBeVisible();
	await target.click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	existingText: string,
	insertedText: string
) {
	await clickCanvasText( editor, page, existingText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( insertedText, { delay: 12 } );
}

async function replaceParagraphText(
	editor: Editor,
	page: Page,
	existingText: string,
	insertedText: string
) {
	await clickCanvasText( editor, page, existingText );
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( insertedText, { delay: 12 } );
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page );
}

async function getPersistedState( requestUtils: any, postId: number ) {
	const post = await requestUtils.rest< {
		content?: { raw?: string; rendered?: string } | string;
		title?: { raw?: string; rendered?: string } | string;
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,title.rendered,content.raw,content.rendered',
		},
	} );

	const persistedContent =
		typeof post.content === 'string'
			? post.content
			: post.content?.raw ?? post.content?.rendered ?? '';
	const persistedTitle =
		typeof post.title === 'string'
			? post.title
			: post.title?.raw ?? post.title?.rendered ?? '';

	return { persistedContent, persistedTitle };
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	page,
	editor,
	postId,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	page: Page;
	editor: Editor;
	postId: number;
	requestUtils: any;
	scenario:
		| 'anchor-enter-then-primary-followup'
		| 'anchor-retype-then-primary-followup';
} ) {
	const primaryConcurrent = `primary concurrent paragraph aee89c attempt ${ attempt }`;
	const collaboratorConcurrent = `collaborator concurrent paragraph aee89c attempt ${ attempt }`;
	const primaryFollowup = `primary followup paragraph aee89c attempt ${ attempt }`;

	if ( scenario === 'anchor-enter-then-primary-followup' ) {
		await Promise.all( [
			insertParagraphAfterText( editor, page, ANCHOR_TEXT, primaryConcurrent ),
			insertParagraphAfterText(
				collaboratorEditor,
				collaboratorPage,
				ANCHOR_TEXT,
				collaboratorConcurrent
			),
		] );
	} else {
		await Promise.all( [
			replaceParagraphText( editor, page, ANCHOR_TEXT, primaryConcurrent ),
			replaceParagraphText(
				collaboratorEditor,
				collaboratorPage,
				ANCHOR_TEXT,
				collaboratorConcurrent
			),
		] );
	}

	// The fuzz seed only reached the follow-up append after step 8 convergence.
	// Wait for the two concurrent paragraphs to settle as much as they can first.
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );

	const [ primaryAfterConcurrent, secondaryAfterConcurrent, persistedAfterConcurrent ] =
		await Promise.all( [
			normalizeState( collaborationUtils, page ),
			normalizeState( collaborationUtils, collaboratorPage ),
			getPersistedState( requestUtils, postId ),
		] );
	const primaryAfterConcurrentJson = JSON.stringify( primaryAfterConcurrent );
	const secondaryAfterConcurrentJson = JSON.stringify( secondaryAfterConcurrent );
	const concurrentTextsPresentOnBoth =
		primaryAfterConcurrentJson.includes( primaryConcurrent ) &&
		primaryAfterConcurrentJson.includes( collaboratorConcurrent ) &&
		secondaryAfterConcurrentJson.includes( primaryConcurrent ) &&
		secondaryAfterConcurrentJson.includes( collaboratorConcurrent );

	if ( ! concurrentTextsPresentOnBoth ) {
		writeResult( {
			attempt,
			convergenceError:
				'Concurrent real-user paragraph insertion corrupted or dropped at least one paragraph before the follow-up append.',
			persistedContent: persistedAfterConcurrent.persistedContent,
			persistedTitle: persistedAfterConcurrent.persistedTitle,
			postId,
			primaryState: primaryAfterConcurrent,
			reproduced: true,
			scenario,
			secondaryState: secondaryAfterConcurrent,
			statesEqual:
				primaryAfterConcurrentJson === secondaryAfterConcurrentJson,
			textsPresentOnBoth: false,
		} );

		expect( concurrentTextsPresentOnBoth ).toBe( true );
		return;
	}

	await insertParagraphAfterText(
		editor,
		page,
		primaryConcurrent,
		primaryFollowup
	);

	let convergenceError: string | null = null;
	try {
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
	} catch ( error ) {
		convergenceError =
			error instanceof Error ? error.message : String( error );
	}

	const [ primaryState, secondaryState, persisted ] = await Promise.all( [
		normalizeState( collaborationUtils, page ),
		normalizeState( collaborationUtils, collaboratorPage ),
		getPersistedState( requestUtils, postId ),
	] );
	const primaryJson = JSON.stringify( primaryState );
	const secondaryJson = JSON.stringify( secondaryState );
	const statesEqual = primaryJson === secondaryJson;
	const textsPresentOnBoth =
		primaryJson.includes( primaryConcurrent ) &&
		primaryJson.includes( collaboratorConcurrent ) &&
		primaryJson.includes( primaryFollowup ) &&
		secondaryJson.includes( primaryConcurrent ) &&
		secondaryJson.includes( collaboratorConcurrent ) &&
		secondaryJson.includes( primaryFollowup );
	const reproduced = convergenceError !== null || ! statesEqual || ! textsPresentOnBoth;

	writeResult( {
		attempt,
		convergenceError,
		persistedContent: persisted.persistedContent,
		persistedTitle: persisted.persistedTitle,
		postId,
		primaryState,
		reproduced,
		scenario,
		secondaryState,
		statesEqual,
		textsPresentOnBoth,
	} );

	expect( reproduced ).toBe( false );
}

test.describe( 'aee89c6ef556 realistic concurrent paragraph follow-up search', () => {
	for ( const scenario of [
		'anchor-enter-then-primary-followup',
		'anchor-retype-then-primary-followup',
	] as const ) {
		for ( const attempt of [ 0, 1, 2, 3 ] ) {
			test( `${ scenario } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const post = await requestUtils.createPost( {
					content: PRESEEDED_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: PRESEEDED_TITLE,
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

				await runScenario( {
					attempt,
					collaborationUtils,
					collaboratorEditor,
					collaboratorPage,
					editor,
					page,
					postId: post.id,
					requestUtils,
					scenario,
				} );
			} );
		}
	}
} );
