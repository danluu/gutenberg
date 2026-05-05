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

type ScenarioSnapshot = {
	blockCount: number;
	blocksJson: string;
	label: string;
	persistedContent: string;
	persistedTitle: string;
	title: string;
};

type ScenarioResult = {
	expectedCheckpointParagraph: string;
	expectedFinalHeading: string;
	expectedTitle: string;
	name: string;
	snapshots: ScenarioSnapshot[];
	targetSymptom: null | {
		blockCount: number;
		label: string;
		persistedContentLength: number;
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
			username: `rtca2e${ uniqueSuffix }`,
			email: `rtca2e+${ uniqueSuffix }@example.com`,
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

const RESULT_DIR = process.env.RTC_A2E6705_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950056 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950056 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em> seed paragraph</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
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

async function getPersistedState(
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
) {
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

	return {
		content:
			typeof post.content === 'string'
				? post.content
				: post.content?.raw ?? post.content?.rendered ?? '',
		title:
			typeof post.title === 'string'
				? post.title
				: post.title?.raw ?? post.title?.rendered ?? '',
	};
}

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
): Promise< ScenarioSnapshot > {
	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	const persisted = await getPersistedState( requestUtils, postId );

	return {
		blockCount: state.blocks.length,
		blocksJson: JSON.stringify( state.blocks ),
		label,
		persistedContent: persisted.content,
		persistedTitle: persisted.title,
		title: state.title,
	};
}

async function clickParagraphByText( editor: Editor, text: string ) {
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function openBlockOptionsAndDelete( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
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

async function insertBlockFromInserter( page: Page, blockName: string ) {
	await page
		.getByRole( 'button', {
			name: 'Block Inserter',
			exact: true,
		} )
		.click();

	const inserterPanel = page.getByRole( 'region', {
		name: 'Block Library',
	} );
	const searchBox = inserterPanel.getByRole( 'searchbox', {
		name: 'Search',
	} );
	await searchBox.fill( blockName );
	await inserterPanel
		.getByRole( 'tabpanel', { name: 'Blocks' } )
		.getByRole( 'option', { name: blockName, exact: true } )
		.click();
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.locator(
			'role=toolbar[name="Block tools"i] >> role=button[name="Move down"i]'
		)
		.click();
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

async function runSeed950056LikeScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	finalSaver,
	page,
	requestUtils,
	scenarioName,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	finalSaver: 'primary' | 'collaborator';
	page: Page;
	requestUtils: any;
	scenarioName: string;
} ): Promise< ScenarioResult > {
	const checkpointParagraph = `rtc-a2e6705-checkpoint-${ Date.now() }`;
	const collaboratorParagraph = `rtc-a2e6705-collaborator-${ Date.now() }`;
	const primaryParagraph = `rtc-a2e6705-primary-${ Date.now() }`;
	const finalHeading = `rtc-a2e6705-heading-${ Date.now() }`;
	const checkpointTitle = `rtc-a2e6705-title-a-${ Date.now() }`;
	const secondTitle = `rtc-a2e6705-title-b-${ Date.now() }`;
	const formattedSuffix = ` rtc-a2e6705-format-${ Date.now() }`;
	const editedBaselineSuffix = ` rtc-a2e6705-edit-${ Date.now() }`;

	const result: ScenarioResult = {
		expectedCheckpointParagraph: checkpointParagraph,
		expectedFinalHeading: finalHeading,
		expectedTitle: secondTitle,
		name: scenarioName,
		snapshots: [],
		targetSymptom: null,
	};

	const post = await requestUtils.createPost( {
		title: `RTC a2e6705 ${ scenarioName }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: INITIAL_CONTENT,
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );
	result.snapshots.push(
		await captureSnapshot( 'initial', collaborationUtils, requestUtils, post.id )
	);

	await clickParagraphByText( collaboratorEditor, 'Seed 950056 keeps a second paragraph' );
	await openBlockOptionsAndDelete( collaboratorPage, collaboratorEditor );
	result.snapshots.push(
		await captureSnapshot(
			'after-delete',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await clickParagraphByText( editor, 'Seed 950056 baseline paragraph.' );
	await page.keyboard.press( 'End' );
	await page.keyboard.type( editedBaselineSuffix );
	result.snapshots.push(
		await captureSnapshot(
			'after-primary-edit',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await Promise.all( [
		appendParagraphAtEnd( editor, page, primaryParagraph ),
		appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			collaboratorParagraph
		),
	] );
	result.snapshots.push(
		await captureSnapshot(
			'after-two-appends',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await appendParagraphAtEnd( editor, page, checkpointParagraph );
	await clickParagraphByText( editor, checkpointParagraph );
	await insertBlockFromInserter( page, 'Search' );
	await typeTitle( editor, page, checkpointTitle );
	await clickSaveDraft( page );
	result.snapshots.push(
		await captureSnapshot(
			'after-checkpoint-save',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( collaboratorPage, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
	result.snapshots.push(
		await captureSnapshot(
			'after-collaborator-reload',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await typeTitle( editor, page, secondTitle );
	result.snapshots.push(
		await captureSnapshot(
			'after-second-title',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await clickParagraphByText( collaboratorEditor, 'italic' );
	await collaboratorPage.keyboard.press( 'End' );
	await collaboratorPage.keyboard.type( formattedSuffix );
	result.snapshots.push(
		await captureSnapshot(
			'after-formatted-edit',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await clickParagraphByText( editor, checkpointParagraph );
	await moveSelectedBlockDown( page, editor );
	result.snapshots.push(
		await captureSnapshot(
			'after-move-down',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	await clickParagraphByText(
		collaboratorEditor,
		collaboratorParagraph
	);
	await insertBlockFromInserter( collaboratorPage, 'Heading' );
	await collaboratorPage.keyboard.type( finalHeading );
	result.snapshots.push(
		await captureSnapshot(
			'after-heading-insert',
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	if ( finalSaver === 'primary' ) {
		await clickSaveDraft( page );
	} else {
		await clickSaveDraft( collaboratorPage );
	}
	result.snapshots.push(
		await captureSnapshot(
			`after-final-save-${ finalSaver }`,
			collaborationUtils,
			requestUtils,
			post.id
		)
	);

	const targetSnapshot = result.snapshots.find(
		( snapshot ) =>
			snapshot.blockCount === 0 || snapshot.persistedContent.length === 0
	);

	if ( targetSnapshot ) {
		result.targetSymptom = {
			blockCount: targetSnapshot.blockCount,
			label: targetSnapshot.label,
			persistedContentLength: targetSnapshot.persistedContent.length,
		};
	}

	writeScenarioResult( result );
	return result;
}

test( 'a2e6705b1ea0 realistic sequence with final save by primary', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result = await runSeed950056LikeScenario( {
		collaborationUtils,
		collaboratorUser,
		editor,
		finalSaver: 'primary',
		page,
		requestUtils,
		scenarioName: 'final-save-primary',
	} );

	expect( result.targetSymptom ).toBeNull();
	expect(
		result.snapshots[ result.snapshots.length - 1 ].blocksJson
	).toContain( result.expectedFinalHeading );
	expect(
		result.snapshots[ result.snapshots.length - 1 ].persistedContent
	).toContain( result.expectedCheckpointParagraph );
	expect(
		result.snapshots[ result.snapshots.length - 1 ].persistedTitle
	).toContain( result.expectedTitle );
} );
