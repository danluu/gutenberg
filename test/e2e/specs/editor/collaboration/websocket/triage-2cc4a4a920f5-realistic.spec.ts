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

type PersistedState = {
	content: string;
	title: string;
};

type Snapshot = {
	blockCount: number;
	checkpointMarkerPresent: boolean;
	label: string;
	persistedCheckpointMarkerPresent: boolean;
	persistedSearchBlockPresent: boolean;
	persistedTitle: string;
	searchBlockPresent: boolean;
	title: string;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	persistedObservationCount?: number;
	persistedSawCheckpointMarker?: boolean;
	snapshots: Snapshot[];
	symptom?: {
		label: string;
		persistedTitle: string;
		title: string;
	};
};

type ReproResult = {
	attempts: AttemptResult[];
	name: string;
};

const RESULT_DIR = process.env.RTC_2CC4_REPRO_DIR;
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
			username: `rtc2cc4${ uniqueSuffix }`,
			email: `rtc2cc4+${ uniqueSuffix }@example.com`,
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
): Promise< PersistedState > {
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

async function pollPersistedStateForCheckpoint(
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	checkpointMarker: string
) {
	const observations: PersistedState[] = [];
	const deadline = Date.now() + 15000;

	while ( Date.now() < deadline ) {
		const state = await getPersistedState( requestUtils, postId );
		observations.push( state );

		if ( state.content.includes( checkpointMarker ) ) {
			return {
				observations,
				sawCheckpointMarker: true,
			};
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 500 ) );
	}

	return {
		observations,
		sawCheckpointMarker: false,
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
	checkpointMarker: string
): Promise< Snapshot > {
	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	const persisted = await getPersistedState( requestUtils, postId );
	const blocksJson = JSON.stringify( state.blocks );

	return {
		blockCount: state.blocks.length,
		checkpointMarkerPresent: blocksJson.includes( checkpointMarker ),
		label,
		persistedCheckpointMarkerPresent: persisted.content.includes(
			checkpointMarker
		),
		persistedSearchBlockPresent: persisted.content.includes( '<!-- wp:search' ),
		persistedTitle: persisted.title,
		searchBlockPresent: blocksJson.includes( 'core/search' ),
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
	const checkpointMarker = `rtc-2cc4-checkpoint-${ attempt }-${ Date.now() }`;
	const titleMarker = `rtc-2cc4-title-${ attempt }-${ Date.now() }`;

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 2cc4 realistic ${ attempt } initial title`,
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
				checkpointMarker
			)
		);

		await appendParagraphAtEnd(
			editor,
			page,
			`Seed realistic ${ attempt } primary concurrent paragraph`
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`Seed realistic ${ attempt } collaborator concurrent paragraph`
		);
		await waitForSessionReady( collaborationUtils );

		await appendToParagraph(
			collaboratorEditor,
			collaboratorPage,
			'Long shared paragraph used as the initial collaborative editing surface.',
			` collaborator edit ${ attempt }`
		);
		await waitForSessionReady( collaborationUtils );

		await appendToParagraph(
			editor,
			page,
			'Tail paragraph kept for save and reload stability checks.',
			` primary edit ${ attempt }`
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd(
			editor,
			page,
			`Seed realistic ${ attempt } primary insert one`
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd(
			editor,
			page,
			`Seed realistic ${ attempt } primary insert two`
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd(
			editor,
			page,
			`Seed realistic ${ attempt } primary concurrent second`
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`Seed realistic ${ attempt } collaborator concurrent second`
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`Seed realistic ${ attempt } collaborator final append`
		);
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd( editor, page, checkpointMarker );
		await insertSearchBlockAtEnd( editor, page );
		await typeTitle( editor, page, titleMarker );
		await saveDraft( page );

		const persistedPoll = await pollPersistedStateForCheckpoint(
			requestUtils,
			post.id,
			checkpointMarker
		);
		attemptResult.persistedObservationCount =
			persistedPoll.observations.length;
		attemptResult.persistedSawCheckpointMarker =
			persistedPoll.sawCheckpointMarker;

		attemptResult.snapshots.push(
			await captureSnapshot(
				'after-primary-save',
				collaborationUtils,
				requestUtils,
				post.id,
				checkpointMarker
			)
		);

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 20000,
			}
		);
		await waitForSessionReady( collaborationUtils );

		attemptResult.snapshots.push(
			await captureSnapshot(
				'after-collaborator-reload',
				collaborationUtils,
				requestUtils,
				post.id,
				checkpointMarker
			)
		);

		const symptomSnapshot = attemptResult.snapshots.find(
			( snapshot ) =>
				snapshot.checkpointMarkerPresent &&
				snapshot.searchBlockPresent &&
				snapshot.title.includes( titleMarker ) &&
				! snapshot.persistedCheckpointMarkerPresent
		);

		if ( symptomSnapshot ) {
			attemptResult.symptom = {
				label: symptomSnapshot.label,
				persistedTitle: symptomSnapshot.persistedTitle,
				title: symptomSnapshot.title,
			};
		}
	} catch ( error ) {
		attemptResult.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	return attemptResult;
}

test.describe.configure( { mode: 'serial' } );

test( '2cc4a4a920f5 realistic save preserves checkpoint in persisted post', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );

	const attempts: AttemptResult[] = [
		await runAttempt( {
			attempt: 0,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ),
	];

	const result: ReproResult = {
		attempts,
		name: '2cc4a4a920f5-realistic',
	};
	writeResult( result );

	const firstError = attempts.find( ( attempt ) => attempt.error );
	const firstSymptom = attempts.find( ( attempt ) => attempt.symptom );

	expect( firstError?.error ).toBeUndefined();
	expect( firstSymptom?.symptom ).toBeUndefined();
} );
