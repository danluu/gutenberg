import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		await requestUtils.setupRest();
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

test.use( {
	baseURL: process.env.WP_BASE_URL,
} );

async function loginAsAdmin(
	page: import( '@playwright/test' ).Page
) {
	await page.goto( '/wp-login.php' );
	if ( page.url().includes( '/wp-admin/' ) ) {
		return;
	}
	await page.locator( '#user_login' ).fill(
		process.env.WP_USERNAME || 'admin'
	);
	await page.locator( '#user_pass' ).fill(
		process.env.WP_PASSWORD || 'password'
	);
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	page: import( '@playwright/test' ).Page,
	secondPage: import( '@playwright/test' ).Page
) {
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( secondPage, {
		timeout: 20000,
	} );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function appendParagraph(
	editor: import( '@wordpress/e2e-test-utils-playwright' ).Editor,
	page: import( '@playwright/test' ).Page,
	text: string,
	isFirstEdit = false
) {
	if ( isFirstEdit ) {
		await editor.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();
		await page.keyboard.type( text );
		return;
	}

	await editor.canvas
		.getByRole( 'document', { name: /Block: Paragraph/ } )
		.last()
		.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
}

async function saveDraftWithoutStrictSnackbar(
	editor: import( '@wordpress/e2e-test-utils-playwright' ).Editor
) {
	const topBar = editor.page.getByRole( 'region', {
		name: 'Editor top bar',
	} );
	await topBar.getByRole( 'button', { name: 'Save draft' } ).click();

	await expect
		.poll(
			async () => {
				if ( await topBar.getByRole( 'button', { name: 'Saved' } ).count() ) {
					return true;
				}

				const snackbars = editor.page.getByTestId( 'snackbar' );
				const count = await snackbars.count();
				for ( let index = 0; index < count; index++ ) {
					if (
						( await snackbars.nth( index ).innerText() ).includes(
							'Draft saved'
						)
					) {
						return true;
					}
				}

				return false;
			},
			{ timeout: 20000 }
		)
		.toBe( true );
}

async function fetchRevisions(
	requestUtils: {
		rest: < T >( options: {
			method?: string;
			path: string;
			params?: Record< string, string | number | boolean >;
		} ) => Promise< T >;
	},
	postId: number
) {
	return requestUtils.rest< Array< { id: number } > >( {
		path: `/wp/v2/posts/${ postId }/revisions`,
		params: {
			context: 'edit',
			per_page: 100,
			_fields: 'id',
		},
	} );
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	editor,
	page,
	runIndex,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( options: {
			title: string;
			status: string;
			date_gmt: string;
		} ) => Promise< { id: number } >;
	};
	editor: import( '@wordpress/e2e-test-utils-playwright' ).Editor;
	page: import( '@playwright/test' ).Page;
	runIndex: number;
} ) {
	const post = await requestUtils.createPost( {
		title: `RTC realistic revisions probe ${ runIndex } ${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
	} );

	await loginAsAdmin( page );
	await collaborationUtils.openPost( post.id );
	const { editor: editor2, page: page2 } = await collaborationUtils.joinUser(
		post.id,
		collaboratorUser
	);
	await waitForSessionReady( collaborationUtils, page, page2 );

	await appendParagraph(
		editor,
		page,
		`rtc-realistic-run-${ runIndex }-initial-${ Date.now() }`,
		true
	);
	await saveDraftWithoutStrictSnackbar( editor );
	await waitForSessionReady( collaborationUtils, page, page2 );

	for ( let iteration = 0; iteration < 6; iteration++ ) {
		const actorEditor = iteration % 2 === 0 ? editor2 : editor;
		const actorPage = iteration % 2 === 0 ? page2 : page;
		const marker = `rtc-realistic-run-${ runIndex }-step-${ iteration }-${ Date.now() }`;

		await appendParagraph( actorEditor, actorPage, marker );
		await saveDraftWithoutStrictSnackbar( actorEditor );
		await waitForSessionReady( collaborationUtils, page, page2 );

		if ( iteration === 1 || iteration === 4 ) {
			await page2.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled( page2, {
				timeout: 20000,
			} );
			await waitForSessionReady( collaborationUtils, page, page2 );
		}
	}

	const revisions = await fetchRevisions( requestUtils, post.id );
	expect( revisions.length ).toBeGreaterThan( 1 );

	await page.bringToFront();
	await editor.openDocumentSettingsSidebar();
	const settingsSidebar = page.getByRole( 'region', {
		name: 'Editor settings',
	} );
	await settingsSidebar.getByRole( 'tab', { name: 'Post' } ).click();

	const revisionsButton = settingsSidebar.locator(
		'.editor-private-post-last-revision__button'
	);
	await expect( revisionsButton ).toBeVisible( { timeout: 10000 } );
	await revisionsButton.click();

	const slider = page.getByRole( 'slider', { name: 'Revision' } );
	await expect( slider ).toBeVisible( { timeout: 10000 } );
	await slider.focus();
	await page.keyboard.press( 'ArrowLeft' );
	await expect( page.getByRole( 'button', { name: 'Restore' } ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Exit' } ).click();
}

test.describe( 'RTC realistic revision probe for 1ff6022506e5', () => {
	test( 'keeps the revisions slider available after repeated collaborative saves and reloads', async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 240000 );

		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
			editor,
			page,
			runIndex: 0,
		} );

		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
			editor,
			page,
			runIndex: 1,
		} );
	} );
} );
