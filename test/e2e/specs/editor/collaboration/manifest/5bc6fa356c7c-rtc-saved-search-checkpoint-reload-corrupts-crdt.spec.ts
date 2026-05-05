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
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	blockCount: number;
	blocksJson: string;
	label: string;
	markerIndex: number;
	persistedContent: string;
	searchIndex: number;
	title: string;
};

type ScenarioResult = {
	divergentStates?: unknown[];
	error?: string;
	name: string;
	reproduced: boolean;
	reproducedReason?: string;
	snapshots: Snapshot[];
};

type ReproResult = {
	scenarios: ScenarioResult[];
};

const RESULT_DIR = process.env.RTC_6207_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
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
			username: `rtc6207${ uniqueSuffix }`,
			email: `rtc6207+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ReproResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, 'realistic-result.json' ),
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

async function getPersistedContent( requestUtils: any, postId: number ) {
	const persistedPost = await requestUtils.rest< {
		content: { raw?: string; rendered?: string } | string;
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );

	if ( typeof persistedPost.content === 'string' ) {
		return persistedPost.content;
	}

	return persistedPost.content?.raw ?? persistedPost.content?.rendered ?? '';
}

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: any,
	postId: number,
	marker: string
): Promise< Snapshot > {
	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	const blocksJson = JSON.stringify( state.blocks );
	const persistedContent = await getPersistedContent( requestUtils, postId );

	return {
		blockCount: state.blocks.length,
		blocksJson,
		label,
		markerIndex: blocksJson.indexOf( marker ),
		persistedContent,
		searchIndex: blocksJson.indexOf( 'core/search' ),
		title: state.title,
	};
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

async function insertSearchBlockAtEnd( editor: Editor, page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function typeSearchLabel(
	editor: Editor,
	page: Page,
	label: string
) {
	const labelField = editor.canvas
		.getByRole( 'textbox', { name: 'Label text' } )
		.last();
	await labelField.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( label );
	await expect( labelField ).toContainText( label );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

async function saveDraft( page: Page ) {
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

async function createCheckpoint(
	editor: Editor,
	page: Page,
	title: string,
	marker: string,
	searchLabel: string
) {
	await appendParagraphAtEnd( editor, page, marker );
	await insertSearchBlockAtEnd( editor, page );
	await typeSearchLabel( editor, page, searchLabel );
	await typeTitle( editor, page, title );
	await saveDraft( page );
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenarioName,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenarioName: string;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenarioName,
		reproduced: false,
		snapshots: [],
	};
	const marker = `${ scenarioName } paragraph marker ${ Date.now() }`;
	const searchLabel = `${ scenarioName } search label ${ Date.now() }`;
	const title = `${ scenarioName } title ${ Date.now() }`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ scenarioName } initial title`,
	} );

	try {
		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'initial',
				collaborationUtils,
				requestUtils,
				post.id,
				marker
			)
		);

		await createCheckpoint( editor, page, title, marker, searchLabel );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				'after-checkpoint-save',
				collaborationUtils,
				requestUtils,
				post.id,
				marker
			)
		);

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 20000,
			}
		);
		try {
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					'after-collaborator-reload',
					collaborationUtils,
					requestUtils,
					post.id,
					marker
				)
			);
		} catch ( error ) {
			result.reproduced = true;
			result.reproducedReason =
				'Collaborator reload after a saved search+paragraph checkpoint caused the collaborative session to diverge.';
			result.error =
				error instanceof Error
					? error.stack ?? error.message
					: String( error );
			result.divergentStates = await Promise.all(
				collaborationUtils.allPages.map( ( sessionPage ) =>
					collaborationUtils.getNormalizedPostState( sessionPage, {
						includeCrdtDocument: true,
					} )
				)
			);
		}
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

test( '6207 realistic search checkpoint move scenarios', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const result: ReproResult = {
		scenarios: [
			await runScenario( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenarioName: 'checkpoint-save-then-collaborator-reload',
			} ),
		],
	};

	writeResult( result );
	expect( result.scenarios.length ).toBe( 1 );
} );
