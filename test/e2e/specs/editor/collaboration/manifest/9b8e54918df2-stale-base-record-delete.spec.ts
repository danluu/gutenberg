import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950584 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950584 keeps a second paragraph for deletes and moves.</p>',
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
			username: `rtc9b8e${ uniqueSuffix }`,
			email: `rtc9b8e+${ uniqueSuffix }@example.com`,
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

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();

	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
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

async function appendToParagraph(
	editor: Editor,
	page: Page,
	text: string,
	suffix: string
) {
	await clickBlockByText( editor, page, text );
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix, { delay: 15 } );
}

function blockContents(
	state: Awaited<
		ReturnType< CollaborationUtilsClass[ 'getNormalizedPostState' ] >
	>
) {
	return state.blocks.map(
		( block ) => block.attributes.content as string | undefined
	);
}

test.describe.configure( { mode: 'serial' } );

test( 'keeps a peer-deleted recent insert deleted after a local follow-up edit', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const insertedParagraph = `RTC realistic 9b8e paragraph ${ Date.now() }`;
	const editedSeed = 'Seed 950584 baseline paragraph. local follow-up edit';

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC realistic 9b8e stale base-record title',
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await clickBlockByText( editor, page, 'Seed 950584 baseline paragraph.' );
	await insertParagraphBeforeSelected( editor, page, insertedParagraph );
	await waitForSessionReady( collaborationUtils );

	await clickBlockByText(
		collaboratorEditor,
		collaboratorPage,
		insertedParagraph
	);
	await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

	await expect(
		editor.canvas.getByText( insertedParagraph, { exact: false } )
	).toBeHidden( { timeout: 10000 } );
	await appendToParagraph(
		editor,
		page,
		'Seed 950584 baseline paragraph.',
		' local follow-up edit'
	);

	const finalState = await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
	const contents = blockContents( finalState );

	expect( contents ).toEqual( [
		editedSeed,
		'Seed 950584 keeps a second paragraph for deletes and moves.',
	] );
	expect( contents ).not.toContain( insertedParagraph );
	expect( contents ).not.toContain( 'Seed 950584 baseline paragraph.' );
} );
