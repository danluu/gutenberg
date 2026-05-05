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
	blockCount: number;
	blocksJson: string;
	label: string;
	persistedContent: string;
	persistedTitle: string;
	title: string;
};

type ScenarioResult = {
	error?: string;
	finalSaver: 'collaborator' | 'primary';
	name: string;
	postId?: number;
	snapshots: Snapshot[];
	symptom?: {
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
			username: `rtcb89${ uniqueSuffix }`,
			email: `rtcb89+${ uniqueSuffix }@example.com`,
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

const RESULT_DIR = process.env.RTC_B89_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 950269 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
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
): Promise< Snapshot > {
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

async function clickParagraphByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
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
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function insertSearchBlockAtEnd( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 15 } );
	await expect( titleBox ).toContainText( title );
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
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

async function appendTextToParagraph(
	editor: Editor,
	page: Page,
	textToFind: string,
	suffix: string
) {
	await clickParagraphByText( editor, page, textToFind );
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix );
	await expect(
		editor.canvas.getByText( suffix.trim(), { exact: false } )
	).toBeVisible();
}

async function runScenario( {
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
	finalSaver: 'collaborator' | 'primary';
	page: Page;
	requestUtils: any;
	scenarioName: string;
} ): Promise< ScenarioResult > {
	const appendMarker = `rtc-b89-append-${ Date.now() }`;
	const checkpointMarker = `rtc-b89-checkpoint-${ Date.now() }`;
	const titleMarker = `rtc-b89-title-${ Date.now() }`;
	const editSuffix = ` rtc-b89-edit-${ Date.now() }`;

	const result: ScenarioResult = {
		finalSaver,
		name: scenarioName,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		title: `RTC b89 ${ scenarioName }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: INITIAL_CONTENT,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'initial', collaborationUtils, requestUtils, post.id )
		);

		await appendParagraphAtEnd( collaboratorEditor, collaboratorPage, appendMarker );
		result.snapshots.push(
			await captureSnapshot(
				'after-collaborator-append',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await clickParagraphByText(
			collaboratorEditor,
			collaboratorPage,
			'Another paragraph exists so the top-level list is not degenerate.'
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		result.snapshots.push(
			await captureSnapshot(
				'after-collaborator-delete',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await clickParagraphByText(
			editor,
			page,
			'Seed 950269 multibyte heading'
		);
		await moveSelectedBlockDown( page, editor );
		result.snapshots.push(
			await captureSnapshot(
				'after-primary-move',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await appendTextToParagraph(
			editor,
			page,
			'Emoji and multibyte',
			editSuffix
		);
		result.snapshots.push(
			await captureSnapshot(
				'after-primary-edit',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			checkpointMarker
		);
		await insertSearchBlockAtEnd( collaboratorPage );
		await typeTitle( collaboratorEditor, collaboratorPage, titleMarker );
		await clickSaveDraft( collaboratorPage );
		result.snapshots.push(
			await captureSnapshot(
				'after-collaborator-save',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'after-primary-reload',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await clickParagraphByText( editor, page, checkpointMarker );
		await moveSelectedBlockDown( page, editor );
		result.snapshots.push(
			await captureSnapshot(
				'after-post-reload-move',
				collaborationUtils,
				requestUtils,
				post.id
			)
		);

		await clickParagraphByText(
			collaboratorEditor,
			collaboratorPage,
			appendMarker
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		result.snapshots.push(
			await captureSnapshot(
				'after-post-reload-delete',
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

		const symptom = result.snapshots.find(
			( snapshot ) =>
				snapshot.blockCount === 0 || snapshot.persistedContent.length === 0
		);
		if ( symptom ) {
			result.symptom = {
				blockCount: symptom.blockCount,
				label: symptom.label,
				persistedContentLength: symptom.persistedContent.length,
			};
		}
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const finalSaver of [ 'collaborator', 'primary' ] as const ) {
	test( `b89fb1e674e8 realistic ${ finalSaver } final save`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			finalSaver,
			page,
			requestUtils,
			scenarioName: `realistic-${ finalSaver }-${ Date.now() }`,
		} );

		expect( result.error ).toBeUndefined();
		expect( result.symptom ).toBeUndefined();
	} );
}
