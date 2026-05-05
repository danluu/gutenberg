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
	checkpointMarkerPresent: boolean;
	label: string;
	optionMarkerPresent: boolean;
	persistedCheckpointMarkerPresent: boolean;
	persistedContentLength: number;
	persistedOptionMarkerPresent: boolean;
	persistedTitle: string;
	title: string;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	snapshots: Snapshot[];
	symptom?: {
		blockCount: number;
		label: string;
		persistedContentLength: number;
	};
};

type ReproResult = {
	attempts: AttemptResult[];
	name: string;
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
			username: `rtcf9012${ uniqueSuffix }`,
			email: `rtcf9012+${ uniqueSuffix }@example.com`,
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

const RESULT_DIR = process.env.RTC_F9012_REPRO_DIR;
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

function writeResult( result: ReproResult ) {
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
	postId: number,
	checkpointMarker: string,
	optionMarker: string
): Promise< Snapshot > {
	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	const persisted = await getPersistedState( requestUtils, postId );
	const blocksJson = JSON.stringify( state.blocks );

	return {
		blockCount: state.blocks.length,
		blocksJson,
		checkpointMarkerPresent: blocksJson.includes( checkpointMarker ),
		label,
		optionMarkerPresent:
			blocksJson.includes( optionMarker ) || blocksJson.includes( 'core/search' ),
		persistedCheckpointMarkerPresent: persisted.content.includes( checkpointMarker ),
		persistedContentLength: persisted.content.length,
		persistedOptionMarkerPresent:
			persisted.content.includes( optionMarker ) ||
			persisted.content.includes( '<!-- wp:search' ),
		persistedTitle: persisted.title,
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

async function appendToParagraph(
	editor: Editor,
	page: Page,
	textToFind: string,
	suffix: string
) {
	await editor.canvas.getByText( textToFind, { exact: false } ).click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix );
	await expect(
		editor.canvas.getByText( suffix.trim(), { exact: false } )
	).toBeVisible();
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

async function performCheckpointSave(
	editor: Editor,
	page: Page,
	titleMarker: string,
	checkpointMarker: string,
	optionMarker: string
) {
	await appendParagraphAtEnd( editor, page, checkpointMarker );
	await insertSearchBlockAtEnd( editor, page );
	await typeTitle( editor, page, titleMarker );
	await saveDraft( page );
	await expect( editor.canvas.getByText( checkpointMarker ) ).toBeVisible();
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const attemptResult: AttemptResult = {
		attempt,
		snapshots: [],
	};

	const firstCheckpointMarker = `rtc-f9012-first-paragraph-${ attempt }-${ Date.now() }`;
	const firstOptionMarker = `rtc-f9012-first-search-${ attempt }-${ Date.now() }`;
	const firstTitle = `rtc-f9012-first-title-${ attempt }-${ Date.now() }`;
	const secondCheckpointMarker = `rtc-f9012-second-paragraph-${ attempt }-${ Date.now() }`;
	const secondOptionMarker = `rtc-f9012-second-search-${ attempt }-${ Date.now() }`;
	const secondTitle = `rtc-f9012-second-title-${ attempt }-${ Date.now() }`;
	const primarySuffix = ` rtc-f9012-primary-edit-${ attempt }`;
	const collaboratorSuffix = ` rtc-f9012-collaborator-edit-${ attempt }`;

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC f9012 realistic ${ attempt } initial title`,
	} );

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		attemptResult.snapshots.push(
			await captureSnapshot(
				'initial',
				collaborationUtils,
				requestUtils,
				post.id,
				firstCheckpointMarker,
				firstOptionMarker
			)
		);

		await performCheckpointSave(
			collaboratorEditor,
			collaboratorPage,
			firstTitle,
			firstCheckpointMarker,
			firstOptionMarker
		);
		attemptResult.snapshots.push(
			await captureSnapshot(
				'after-first-save',
				collaborationUtils,
				requestUtils,
				post.id,
				firstCheckpointMarker,
				firstOptionMarker
			)
		);

		await appendToParagraph(
			editor,
			page,
			'Tail paragraph kept for save and reload stability checks.',
			primarySuffix
		);
		await appendToParagraph(
			collaboratorEditor,
			collaboratorPage,
			'Long shared paragraph used as the initial collaborative editing surface.',
			collaboratorSuffix
		);
		attemptResult.snapshots.push(
			await captureSnapshot(
				'after-ordinary-edits',
				collaborationUtils,
				requestUtils,
				post.id,
				secondCheckpointMarker,
				secondOptionMarker
			)
		);

		await performCheckpointSave(
			collaboratorEditor,
			collaboratorPage,
			secondTitle,
			secondCheckpointMarker,
			secondOptionMarker
		);
		attemptResult.snapshots.push(
			await captureSnapshot(
				'after-second-save',
				collaborationUtils,
				requestUtils,
				post.id,
				secondCheckpointMarker,
				secondOptionMarker
			)
		);

		const symptomSnapshot = attemptResult.snapshots.find(
			( snapshot ) =>
				snapshot.persistedCheckpointMarkerPresent &&
				snapshot.persistedOptionMarkerPresent &&
				( snapshot.blockCount === 0 ||
					! snapshot.checkpointMarkerPresent ||
					! snapshot.optionMarkerPresent )
		);

		if ( symptomSnapshot ) {
			attemptResult.symptom = {
				blockCount: symptomSnapshot.blockCount,
				label: symptomSnapshot.label,
				persistedContentLength: symptomSnapshot.persistedContentLength,
			};
		}
	} catch ( error ) {
		attemptResult.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	return attemptResult;
}

test.describe.configure( { mode: 'serial' } );

for ( const attempt of [ 0, 1, 2 ] as const ) {
	test( `f9012fe22f5d realistic collaborator checkpoint save attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const attemptResult = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} );
		const result: ReproResult = {
			attempts: [ attemptResult ],
			name: `f9012fe22f5d-realistic-attempt-${ attempt }`,
		};

		writeResult( result );

		expect( attemptResult.error ).toBeUndefined();
		expect( attemptResult.symptom ).toBeUndefined();
	} );
}
