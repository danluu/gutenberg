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
			username: `rtctriage${ uniqueSuffix }`,
			email: `rtctriage+${ uniqueSuffix }@example.com`,
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

async function slashInsert(
	page: import( '@playwright/test' ).Page,
	command: string
) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function overwriteTitle(
	page: import( '@playwright/test' ).Page,
	editor: import( '@wordpress/e2e-test-utils-playwright' ).Editor,
	title: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', { name: 'Add title' } );
	await titleBox.click();
	await page.keyboard.press( 'Meta+a' );
	await page.keyboard.type( title );
}

async function typeSearchLabel(
	editor: import( '@wordpress/e2e-test-utils-playwright' ).Editor,
	page: import( '@playwright/test' ).Page,
	label: string
) {
	const labelField = editor.canvas
		.getByRole( 'textbox', { name: 'Label text' } )
		.last();
	await labelField.click();
	await page.keyboard.type( label );
}

async function getStateJson( collaborationUtils: CollaborationUtilsClass ) {
	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	return JSON.stringify( state );
}

test( 'realistic title edit plus block insertions persist after an earlier collaborative save', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const firstParagraph = `triage-6a8-old-para-${ Date.now() }`;
	const firstSearch = `triage-6a8-old-search-${ Date.now() }`;
	const secondParagraph = `triage-6a8-new-para-${ Date.now() }`;
	const secondTitle = `triage-6a8-title-${ Date.now() }`;

	const post = await requestUtils.createPost( {
		title: `triage-6a8-initial-${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: editor2, page: page2 } = await collaborationUtils.joinUser(
		post.id,
		collaboratorUser
	);
	await waitForSessionReady( collaborationUtils );

	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( firstParagraph );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );
	await typeSearchLabel( editor, page, firstSearch );
	await editor.saveDraft();

	await expect.poll( async () => getStateJson( collaborationUtils ) ).toContain(
		firstParagraph
	);
	await expect.poll( async () => getStateJson( collaborationUtils ) ).toContain(
		firstSearch
	);

	await overwriteTitle( page2, editor2, secondTitle );
	await editor2.canvas
		.getByRole( 'document', { name: 'Block: Search' } )
		.last()
		.click();
	await page2.keyboard.press( 'ArrowDown' );
	await page2.keyboard.press( 'Enter' );
	await page2.keyboard.type( secondParagraph );
	await editor2.saveDraft();

	const finalState = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	const finalStateJson = JSON.stringify( finalState );

	expect( finalState.title ).toContain( secondTitle );
	expect( finalStateJson ).toContain( firstParagraph );
	expect( finalStateJson ).toContain( firstSearch );
	expect( finalStateJson ).toContain( secondParagraph );

	const persistedPost = await requestUtils.rest< {
		content: { raw: string };
		title: { raw: string };
	} >( {
		path: `/wp/v2/posts/${ post.id }`,
		params: {
			context: 'edit',
			_fields: 'content.raw,title.raw',
		},
	} );

	expect( persistedPost.title.raw ).toContain( secondTitle );
	expect( persistedPost.content.raw ).toContain( firstParagraph );
	expect( persistedPost.content.raw ).toContain( firstSearch );
	expect( persistedPost.content.raw ).toContain( secondParagraph );
} );
