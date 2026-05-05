import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

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
			username: `rtcrepro${ uniqueSuffix }`,
			email: `rtcrepro+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Repro',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( { timeout: 15000 } );
}

async function slashInsert( page: import( '@playwright/test' ).Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function getNormalizedState( collaborationUtils: CollaborationUtilsClass ) {
	return collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 15000,
	} );
}

test( 'realistic save/refresh flow preserves existing content', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const post = await requestUtils.createPost( {
		title: `Realistic save refresh repro ${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: editor2, page: page2 } = await collaborationUtils.joinUser(
		post.id,
		collaboratorUser
	);
	await waitForSessionReady( collaborationUtils );

	const alpha = `Alpha paragraph ${ Date.now() }`;
	const beta = `Beta paragraph ${ Date.now() }`;
	const gamma = `Gamma paragraph ${ Date.now() }`;
	const delta = `Delta paragraph ${ Date.now() }`;

	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( alpha );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( beta );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( 'Realistic heading marker' );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );

	await expect
		.poll( async () => {
			const state = await getNormalizedState( collaborationUtils );
			return JSON.stringify( state.blocks );
		} )
		.toContain( alpha );

	await editor2.canvas
		.getByRole( 'document', { name: 'Block: Search' } )
		.click();
	await page2.keyboard.press( 'ArrowDown' );
	await page2.keyboard.press( 'Enter' );
	await page2.keyboard.type( gamma );

	await expect
		.poll( async () => {
			const state = await getNormalizedState( collaborationUtils );
			return JSON.stringify( state.blocks );
		} )
		.toContain( gamma );

	await editor.saveDraft();
	await getNormalizedState( collaborationUtils );

	await page2.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page2, {
		timeout: 15000,
	} );
	await waitForSessionReady( collaborationUtils );

	await editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last()
		.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( delta );

	await editor.saveDraft();

	const finalState = await getNormalizedState( collaborationUtils );
	const finalBlocks = JSON.stringify( finalState.blocks );
	expect( finalBlocks ).toContain( alpha );
	expect( finalBlocks ).toContain( beta );
	expect( finalBlocks ).toContain( gamma );
	expect( finalBlocks ).toContain( delta );
	expect( finalBlocks ).toContain( 'core/search' );

	const persistedPost = await requestUtils.rest< {
		content: { raw: string };
	} >( {
		path: `/wp/v2/posts/${ post.id }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );
	expect( persistedPost.content.raw ).toContain( alpha );
	expect( persistedPost.content.raw ).toContain( beta );
	expect( persistedPost.content.raw ).toContain( gamma );
	expect( persistedPost.content.raw ).toContain( delta );
	expect( persistedPost.content.raw ).toContain( 'wp:search' );
} );
