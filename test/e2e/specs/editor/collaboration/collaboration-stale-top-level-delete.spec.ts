/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const END_OF_LINE_KEY =
	process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';

const ALPHA = 'Alpha paragraph for stale delete repro.';
const BETA = 'Beta paragraph for stale delete repro.';
const APPENDED = 'Recently appended paragraph that should stay deleted.';
const COLLABORATOR_EDIT = ' Collaborator keeps typing after delete.';

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
			username: `rtc185a${ uniqueSuffix }`,
			email: `rtc185a+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Delete',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function appendParagraphAfterSelected(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await page.keyboard.press( END_OF_LINE_KEY );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 10 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } ).first()
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

test( 'delete of a collaborator-appended paragraph survives a stale collaborator edit', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const post = await requestUtils.createPost( {
		title: 'RTC stale top-level delete repro',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: [
			'<!-- wp:paragraph -->',
			`<p>${ ALPHA }</p>`,
			'<!-- /wp:paragraph -->',
			'<!-- wp:paragraph -->',
			`<p>${ BETA }</p>`,
			'<!-- /wp:paragraph -->',
		].join( '\n' ),
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	const primaryEditor = collaborationUtils.allEditors[ 0 ];

	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	await clickBlockByText( collaboratorEditor, collaboratorPage, BETA );
	await appendParagraphAfterSelected(
		collaboratorPage,
		collaboratorEditor,
		APPENDED
	);

	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	await clickBlockByText( collaboratorEditor, collaboratorPage, ALPHA );
	await collaboratorPage.keyboard.press( END_OF_LINE_KEY );

	await clickBlockByText( primaryEditor, page, APPENDED );

	await Promise.all( [
		deleteSelectedBlock( page, primaryEditor ),
		collaboratorPage.keyboard.type( COLLABORATOR_EDIT, { delay: 10 } ),
	] );

	const state = await collaborationUtils.waitForConvergence( {
		timeout: 30000,
	} );
	const serializedBlocks = JSON.stringify( state.blocks );

	expect( serializedBlocks ).toContain( `${ ALPHA }${ COLLABORATOR_EDIT }` );
	expect( serializedBlocks ).not.toContain( APPENDED );

	await collaboratorPage.keyboard.press( `${ MODIFIER_KEY }+S` );
} );
