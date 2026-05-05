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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	collaboratorEditedTitle: string;
	label: string;
	persistedContentHasSecondMarker: boolean;
	persistedTitle: string;
	primaryEditedTitle: string;
};

type ScenarioResult = {
	error?: string;
	name: string;
	observation?: {
		firstTitle: string;
		outcome: 'converged' | 'stale-title' | 'title-diverged';
		secondTitle: string;
		snapshots: Snapshot[];
	};
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

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC title triage baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>row 1 A</td><td>row 1 B</td></tr><tr><td>row 2 A</td><td>row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

function writeScenarioResult( result: ScenarioResult ) {
	const outputDir = process.env.RTC_952A_REPRO_DIR;
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
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
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
	await page.keyboard.type( nextTitle, { delay: 20 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function editSecondTableCell(
	editor: Editor,
	page: Page,
	text: string
) {
	const secondCell = editor.canvas
		.getByRole( 'textbox', { name: 'Body cell text' } )
		.nth( 1 );
	await expect( secondCell ).toBeVisible();
	await secondCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
	await expect( secondCell ).toHaveText( text );
}

async function clickSaveDraft( page: Page ) {
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

async function getEditedTitle( page: Page ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' ) ?? ''
	);
}

async function getPersistedState(
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
): Promise< { content: string; title: string } > {
	const post = await requestUtils.rest< {
		content?: string | { raw?: string; rendered?: string };
		title?: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw',
		},
	} );

	const title =
		typeof post.title === 'string'
			? post.title
			: post.title?.raw ?? post.title?.rendered ?? '';
	const content =
		typeof post.content === 'string'
			? post.content
			: post.content?.raw ?? post.content?.rendered ?? '';

	return { content, title };
}

async function collectSnapshot(
	label: string,
	page: Page,
	collaboratorPage: Page,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	secondMarker: string
): Promise< Snapshot > {
	const [ primaryEditedTitle, collaboratorEditedTitle, persistedState ] =
		await Promise.all( [
			getEditedTitle( page ),
			getEditedTitle( collaboratorPage ),
			getPersistedState( requestUtils, postId ),
		] );

	return {
		collaboratorEditedTitle,
		label,
		persistedContentHasSecondMarker:
			persistedState.content.includes( secondMarker ),
		persistedTitle: persistedState.title,
		primaryEditedTitle,
	};
}

function getOutcome(
	snapshots: Snapshot[],
	firstTitle: string,
	secondTitle: string
): ScenarioResult[ 'observation' ][ 'outcome' ] {
	const finalSnapshot = snapshots[ snapshots.length - 1 ];

	if (
		finalSnapshot.persistedContentHasSecondMarker &&
		finalSnapshot.persistedTitle === firstTitle
	) {
		return 'stale-title';
	}

	if (
		finalSnapshot.persistedTitle === secondTitle &&
		finalSnapshot.primaryEditedTitle === secondTitle &&
		finalSnapshot.collaboratorEditedTitle === secondTitle
	) {
		return 'converged';
	}

	return 'title-diverged';
}

async function observeAfterSave(
	page: Page,
	collaboratorPage: Page,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	firstTitle: string,
	secondTitle: string,
	secondMarker: string
): Promise< ScenarioResult[ 'observation' ] > {
	const snapshots: Snapshot[] = [];

	for ( let attempt = 0; attempt < 20; attempt++ ) {
		const snapshot = await collectSnapshot(
			`post-save-${ attempt }`,
			page,
			collaboratorPage,
			requestUtils,
			postId,
			secondMarker
		);
		snapshots.push( snapshot );

		if (
			snapshot.persistedContentHasSecondMarker &&
			snapshot.persistedTitle === firstTitle
		) {
			return {
				firstTitle,
				outcome: 'stale-title',
				secondTitle,
				snapshots,
			};
		}

		await page.waitForTimeout( 250 );
	}

	return {
		firstTitle,
		outcome: getOutcome( snapshots, firstTitle, secondTitle ),
		secondTitle,
		snapshots,
	};
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	name,
	page,
	requestUtils,
	reloadCollaborator,
	updateTable,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: string;
	page: Page;
	requestUtils: any;
	reloadCollaborator: boolean;
	updateTable: boolean;
} ): Promise< ScenarioResult > {
	const firstTitle = `${ name } first title`;
	const secondTitle = `${ name } second title`;
	const secondMarker = `${ name } second marker`;

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ name } initial title`,
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await typePostTitle( collaboratorEditor, collaboratorPage, firstTitle );
	await clickSaveDraft( collaboratorPage );
	await waitForSessionReady( collaborationUtils );

	await expect
		.poll( () => getPersistedState( requestUtils, post.id ), {
			timeout: 20000,
		} )
		.toMatchObject( { title: firstTitle } );

	if ( reloadCollaborator ) {
		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{ timeout: 20000 }
		);
		await waitForSessionReady( collaborationUtils );
	}

	if ( updateTable ) {
		await editSecondTableCell(
			editor,
			page,
			`${ name } table mutation`
		);
	}

	await appendParagraphAtEnd( editor, page, secondMarker );
	await typePostTitle( editor, page, secondTitle );
	const snapshots = [
		await collectSnapshot(
			'before-second-save',
			page,
			collaboratorPage,
			requestUtils,
			post.id,
			secondMarker
		),
	];

	await clickSaveDraft( page );
	const postSaveObservation = await observeAfterSave(
		page,
		collaboratorPage,
		requestUtils,
		post.id,
		firstTitle,
		secondTitle,
		secondMarker
	);

	return {
		name,
		observation: {
			...postSaveObservation,
			snapshots: [ ...snapshots, ...postSaveObservation.snapshots ],
		},
	};
}

for ( const scenario of [
	{
		name: 'distinct-user-second-title-no-reload',
		reloadCollaborator: false,
		updateTable: false,
	},
	{
		name: 'distinct-user-second-title-after-reload',
		reloadCollaborator: true,
		updateTable: false,
	},
	{
		name: 'distinct-user-second-title-with-table-edit',
		reloadCollaborator: false,
		updateTable: true,
	},
] ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		let result: ScenarioResult;
		try {
			result = await runScenario( {
				collaborationUtils,
				collaboratorUser,
				editor,
				name: scenario.name,
				page,
				requestUtils,
				reloadCollaborator: scenario.reloadCollaborator,
				updateTable: scenario.updateTable,
			} );
		} catch ( error ) {
			result = {
				error: error instanceof Error ? error.stack : String( error ),
				name: scenario.name,
			};
		}

		writeScenarioResult( result );
		expect( result.name ).toBe( scenario.name );
	} );
}
