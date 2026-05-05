import fs from 'fs';
import path from 'path';

import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	exactTextsPresentOnBoth: boolean;
	postId: number;
	primaryState: unknown;
	reproducedArchivedFamily: boolean;
	scenario: string;
	secondaryState: unknown;
	statesEqual: boolean;
};

const OUTPUT_DIR = process.env.RTC_15DF6C_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
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
			username: `rtc15df${ uniqueSuffix }`,
			email: `rtc15df+${ uniqueSuffix }@example.com`,
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

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertParagraphAfterSearchByShortcut(
	page: Page,
	editor: Editor,
	text: string
) {
	await selectLastSearchBlock( page, editor );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+Y` );
	await page.keyboard.type( text, { delay: 10 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function insertParagraphAfterSearchByMenu(
	page: Page,
	editor: Editor,
	text: string
) {
	await selectLastSearchBlock( page, editor );
	await openBlockOptions( page, editor );
	const addAfter = page.getByRole( 'menuitem', {
		name: /Add after|Insert after/i,
	} );
	await expect( addAfter ).toBeVisible();
	await addAfter.click();
	await page.keyboard.type( text, { delay: 10 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
}

function paragraphTexts( state: any ): string[] {
	return ( state?.blocks ?? [] )
		.filter( ( block: any ) => block?.name === 'core/paragraph' )
		.map( ( block: any ) => block?.attributes?.content ?? '' );
}

function hasArchivedFamilySplit(
	primaryState: any,
	secondaryState: any,
	primaryText: string,
	secondaryText: string
) {
	const primaryTexts = paragraphTexts( primaryState );
	const secondaryTexts = paragraphTexts( secondaryState );
	return (
		primaryTexts.includes( primaryText ) &&
		primaryTexts.includes( secondaryText ) &&
		secondaryTexts.includes( primaryText ) !==
			secondaryTexts.includes( secondaryText )
	);
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	editor,
	page,
	postId,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	page: Page;
	postId: number;
	scenario: 'menu-after-search' | 'shortcut-after-search';
} ) {
	const primaryText = `rtc15df primary ${ scenario } ${ attempt }`;
	const secondaryText = `rtc15df secondary ${ scenario } ${ attempt }`;

	if ( scenario === 'menu-after-search' ) {
		await Promise.all( [
			insertParagraphAfterSearchByMenu( page, editor, primaryText ),
			insertParagraphAfterSearchByMenu(
				collaboratorPage,
				collaboratorEditor,
				secondaryText
			),
		] );
	} else {
		await Promise.all( [
			insertParagraphAfterSearchByShortcut( page, editor, primaryText ),
			insertParagraphAfterSearchByShortcut(
				collaboratorPage,
				collaboratorEditor,
				secondaryText
			),
		] );
	}

	let convergenceError: string | null = null;
	try {
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
	} catch ( error ) {
		convergenceError =
			error instanceof Error ? error.message : String( error );
	}

	const [ primaryState, secondaryState ] = await Promise.all( [
		normalizeState( collaborationUtils, page ),
		normalizeState( collaborationUtils, collaboratorPage ),
	] );
	const primaryJson = JSON.stringify( primaryState );
	const secondaryJson = JSON.stringify( secondaryState );
	const statesEqual = primaryJson === secondaryJson;
	const exactTextsPresentOnBoth =
		primaryJson.includes( primaryText ) &&
		primaryJson.includes( secondaryText ) &&
		secondaryJson.includes( primaryText ) &&
		secondaryJson.includes( secondaryText );
	const reproducedArchivedFamily =
		convergenceError !== null ||
		hasArchivedFamilySplit(
			primaryState,
			secondaryState,
			primaryText,
			secondaryText
		);

	writeResult( {
		attempt,
		convergenceError,
		exactTextsPresentOnBoth,
		postId,
		primaryState,
		reproducedArchivedFamily,
		scenario,
		secondaryState,
		statesEqual,
	} );

	expect( reproducedArchivedFamily || ! exactTextsPresentOnBoth ).toBe(
		false
	);
}

test.describe(
	'RTC triage 15df6c950a26 realistic concurrent append after Search',
	() => {
		for ( const scenario of [
			'menu-after-search',
			'shortcut-after-search',
		] as const ) {
			for ( const attempt of [ 0, 1 ] ) {
				test( `${ scenario } attempt ${ attempt }`, async ( {
					collaborationUtils,
					collaboratorUser,
					editor,
					page,
					requestUtils,
				} ) => {
					test.setTimeout( 120000 );
					const post = await requestUtils.createPost( {
						content: INITIAL_CONTENT,
						date_gmt: new Date().toISOString(),
						status: 'draft',
						title: `rtc-save-title-marker-953376-2-1-end`,
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

					await expect(
						editor.canvas.getByText( SEARCH_2_LABEL, { exact: false } )
					).toBeVisible();
					await expect(
						collaboratorEditor.canvas.getByText( SEARCH_2_LABEL, {
							exact: false,
						} )
					).toBeVisible();
					await expect(
						editor.canvas.getByRole( 'searchbox', {
							name: 'Optional placeholder text',
						} ).last()
					).toBeVisible();

					await runScenario( {
						attempt,
						collaborationUtils,
						collaboratorEditor,
						collaboratorPage,
						editor,
						page,
						postId: post.id,
						scenario,
					} );
				} );
			}
		}
	}
);
