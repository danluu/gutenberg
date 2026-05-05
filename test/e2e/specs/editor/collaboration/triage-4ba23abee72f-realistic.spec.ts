import fs from 'fs';
import path from 'path';

import { test as base, expect, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type PageTitleState = {
	backupNoticeVisible: boolean;
	editedTitle: string;
	localAutosave: string | null;
	visibleTitle: string;
};

type ScenarioResult = {
	afterReload: {
		collaborator: PageTitleState;
		primary: PageTitleState;
	};
	beforeReload: {
		collaborator: PageTitleState;
		primary: PageTitleState;
	};
	bodyMarker: string;
	convergenceError: string | null;
	expectedTitle: string;
	name: string;
	persistedTitle: string;
	reloadedPage: 'collaborator' | 'primary';
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

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

function writeScenarioResult( result: ScenarioResult ) {
	const outputDir = process.env.RTC_TRIAGE_OUTPUT_DIR;
	if ( ! outputDir ) {
		return;
	}

	fs.mkdirSync( outputDir, { recursive: true } );
	fs.writeFileSync(
		path.join( outputDir, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );
	await collaborationUtils.waitForConvergence( {
		timeout: 20_000,
		includeCrdtDocument: true,
	} );
}

async function getPersistedTitle(
	requestUtils: {
		rest: < T >( options: { path: string } ) => Promise< T >;
	},
	postId: number
): Promise< string > {
	const post = await requestUtils.rest< {
		title: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }?context=edit`,
	} );

	return typeof post.title === 'string'
		? post.title
		: post.title.raw ?? post.title.rendered ?? '';
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	nextTitle: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextTitle, { delay: 25 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function getPageTitleState( page: Page ): Promise< PageTitleState > {
	return page.evaluate( () => {
		const editedTitle =
			( window as any ).wp?.data
				?.select( 'core/editor' )
				?.getEditedPostAttribute( 'title' ) ?? '';
		const postId = ( window as any ).wp?.data
			?.select( 'core/editor' )
			?.getCurrentPostId();
		const localAutosave =
			typeof postId === 'number'
				? window.sessionStorage.getItem(
						`wp-autosave-block-editor-post-${ postId }`
				  )
				: null;

		return {
			editedTitle,
			visibleTitle:
				document.querySelector( '.editor-post-title__input' )
					?.textContent ?? '',
			backupNoticeVisible: !! document.body.textContent?.includes(
				'The backup of this post in your browser is different from the version below.'
			),
			localAutosave,
		};
	} );
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
	reloadTarget: 'collaborator' | 'primary';
	requestUtils: {
		createPost: ( data: Record< string, unknown > ) => Promise< { id: number } >;
		rest: < T >( options: { path: string } ) => Promise< T >;
	};
} ): Promise< ScenarioResult > {
	const scenarioId = `${ reloadTarget }-${ Date.now() }`;
	const initialTitle = `RTC triage 4ba23 initial ${ scenarioId }`;
	const expectedTitle = `RTC triage 4ba23 updated ${ scenarioId }`;
	const bodyMarker = `RTC triage body marker ${ scenarioId }`;

	const post = await requestUtils.createPost( {
		title: initialTitle,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Initial body paragraph.</p><!-- /wp:paragraph -->',
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await typePostTitle( editor, page, expectedTitle );
	await expect
		.poll( () => getPageTitleState( collaboratorPage ), { timeout: 20_000 } )
		.toMatchObject( { editedTitle: expectedTitle } );

	await collaboratorEditor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.first()
		.click();
	await collaboratorPage.keyboard.press( 'End' );
	await collaboratorPage.keyboard.press( 'Enter' );
	await collaboratorPage.keyboard.type( bodyMarker );
	await expect( editor.canvas.getByText( bodyMarker ) ).toBeVisible( {
		timeout: 20_000,
	} );
	await collaborationUtils.waitForConvergence( { timeout: 20_000 } );

	const beforeReload = {
		primary: await getPageTitleState( page ),
		collaborator: await getPageTitleState( collaboratorPage ),
	};

	const targetPage = reloadTarget === 'primary' ? page : collaboratorPage;
	await targetPage.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( targetPage, {
		timeout: 20_000,
	} );

	let convergenceError = null;
	try {
		await waitForSessionReady( collaborationUtils );
	} catch ( error ) {
		convergenceError = error instanceof Error ? error.stack ?? error.message : String( error );
	}

	const afterReload = {
		primary: await getPageTitleState( page ),
		collaborator: await getPageTitleState( collaboratorPage ),
	};
	const persistedTitle = await getPersistedTitle( requestUtils, post.id );

	return {
		name: `reload-${ reloadTarget }`,
		reloadedPage: reloadTarget,
		expectedTitle,
		bodyMarker,
		beforeReload,
		afterReload,
		persistedTitle,
		convergenceError,
	};
}

test.describe.configure( { mode: 'serial' } );

for ( const reloadTarget of [ 'primary', 'collaborator' ] as const ) {
	test( `records title state after distinct-user reload of ${ reloadTarget }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180_000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			reloadTarget,
			requestUtils,
		} );

		writeScenarioResult( result );
		expect( result.name ).toBe( `reload-${ reloadTarget }` );
	} );
}
