import fs from 'fs';
import path from 'path';

import { test as base, expect, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type TitleState = {
	edited: string;
	visible: string;
};

type TimelineEntry = {
	label: string;
	primary: TitleState;
	collaborator: TitleState;
};

type ScenarioObservation = {
	finalState: TimelineEntry;
	outcome: 'converged' | 'corrupted' | 'diverged' | 'stale';
	timeline: TimelineEntry[];
};

type ScenarioResult = {
	error?: string;
	name: string;
	observation?: ScenarioObservation;
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

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const CHECKPOINT_ONE_TITLE = 'rtc-save-marker-950045-2-1-title';
const CHECKPOINT_TWO_TITLE = 'rtc-save-marker-950045-10-0-title';
const TITLE_STEP_SIX = 'RTC seed 950045 step 6 user 0 title 904437';
const TITLE_STEP_SEVEN = 'RTC seed 950045 step 7 user 0 title 694938';
const TITLE_STEP_TEN = 'RTC seed 950045 step 10 user 0 title 962770';

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( { timeout: 15000 } );
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
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

async function getTitleState( page: Page ): Promise< TitleState > {
	return page.evaluate( () => {
		const edited = ( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' );
		const visible =
			document.querySelector( '.editor-post-title__input' )
				?.textContent ?? '';

		return {
			edited: edited ?? '',
			visible,
		};
	} );
}

async function recordTimelineEntry(
	label: string,
	primaryPage: Page,
	collaboratorPage: Page
): Promise< TimelineEntry > {
	return {
		label,
		primary: await getTitleState( primaryPage ),
		collaborator: await getTitleState( collaboratorPage ),
	};
}

function getObservationOutcome(
	finalEntry: TimelineEntry,
	expectedTitle: string,
	knownTitles: Set< string >
): ScenarioObservation[ 'outcome' ] {
	const primaryTitles = new Set(
		[
		finalEntry.primary.edited,
		finalEntry.primary.visible,
		].filter( Boolean )
	);
	const collaboratorTitles = new Set(
		[
		finalEntry.collaborator.edited,
		finalEntry.collaborator.visible,
		].filter( Boolean )
	);
	const combinedTitles = new Set( [
		...primaryTitles,
		...collaboratorTitles,
	] );

	if (
		primaryTitles.size === 1 &&
		collaboratorTitles.size === 1 &&
		primaryTitles.has( expectedTitle ) &&
		collaboratorTitles.has( expectedTitle )
	) {
		return 'converged';
	}

	if ( combinedTitles.size > 1 ) {
		return 'diverged';
	}

	const [ onlyTitle ] = Array.from( combinedTitles );
	return knownTitles.has( onlyTitle ) ? 'stale' : 'corrupted';
}

async function observeTitles(
	primaryPage: Page,
	collaboratorPage: Page,
	expectedTitle: string,
	knownTitles: Set< string >,
	labelPrefix: string
): Promise< ScenarioObservation > {
	const timeline: TimelineEntry[] = [];

	for ( let attempt = 0; attempt < 16; attempt++ ) {
		const entry = await recordTimelineEntry(
			`${ labelPrefix }-${ attempt }`,
			primaryPage,
			collaboratorPage
		);
		timeline.push( entry );

		const outcome = getObservationOutcome(
			entry,
			expectedTitle,
			knownTitles
		);
		if ( outcome !== 'converged' ) {
			return {
				finalState: entry,
				outcome,
				timeline,
			};
		}

		await primaryPage.waitForTimeout( 250 );
	}

	const finalState = timeline[ timeline.length - 1 ];
	return {
		finalState,
		outcome: getObservationOutcome( finalState, expectedTitle, knownTitles ),
		timeline,
	};
}

async function addCheckpointLikeBody(
	editor: Editor,
	page: Page,
	prefix: string
) {
	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( `checkpoint paragraph ${ prefix }` );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( `follow-up paragraph ${ prefix }` );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( `checkpoint heading ${ prefix }` );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );
}

function writeScenarioResult( result: ScenarioResult ) {
	const outputDir = process.env.RTC_TITLE_REPRO_DIR;
	if ( ! outputDir ) {
		return;
	}

	fs.mkdirSync( outputDir, { recursive: true } );
	fs.writeFileSync(
		path.join( outputDir, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function runScenario( {
	addCheckpointBody,
	collaborationUtils,
	collaboratorUser,
	name,
	page,
	requestUtils,
	editor,
	reloadCollaborator,
	runSecondCheckpoint,
}: {
	addCheckpointBody: boolean;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	name: string;
	page: Page;
	requestUtils: any;
	editor: Editor;
	reloadCollaborator: boolean;
	runSecondCheckpoint: boolean;
} ): Promise< ScenarioResult > {
	const post = await requestUtils.createPost( {
		title: `${ name } initial title`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	const timeline: TimelineEntry[] = [];
	const knownTitles = new Set< string >( [
		`${ name } initial title`,
		CHECKPOINT_ONE_TITLE,
		CHECKPOINT_TWO_TITLE,
		TITLE_STEP_SIX,
		TITLE_STEP_SEVEN,
		TITLE_STEP_TEN,
	] );

	timeline.push(
		await recordTimelineEntry( 'initial', page, collaboratorPage )
	);

	if ( addCheckpointBody ) {
		await addCheckpointLikeBody( editor, page, name );
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		timeline.push(
			await recordTimelineEntry(
				'after-body',
				page,
				collaboratorPage
			)
		);
	}

	await typePostTitle( collaboratorEditor, collaboratorPage, CHECKPOINT_ONE_TITLE );
	timeline.push(
		await recordTimelineEntry(
			'after-checkpoint-one-title',
			page,
			collaboratorPage
		)
	);
	await collaboratorEditor.saveDraft();
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 15000,
	} );
	timeline.push(
		await recordTimelineEntry(
			'after-checkpoint-one-save',
			page,
			collaboratorPage
		)
	);

	if ( reloadCollaborator ) {
		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 15000,
			}
		);
		await waitForSessionReady( collaborationUtils );
		timeline.push(
			await recordTimelineEntry(
				'after-collaborator-reload',
				page,
				collaboratorPage
			)
		);
	}

	for ( const [ label, title ] of [
		[ 'after-title-step-six', TITLE_STEP_SIX ],
		[ 'after-title-step-seven', TITLE_STEP_SEVEN ],
		[ 'after-title-step-ten', TITLE_STEP_TEN ],
	] ) {
		await typePostTitle( editor, page, title );
		timeline.push(
			await recordTimelineEntry( label, page, collaboratorPage )
		);
		try {
			await collaborationUtils.waitForConvergence( { timeout: 5000 } );
		} catch ( error ) {
			timeline.push(
				await recordTimelineEntry(
					`${ label }-nonconverged`,
					page,
					collaboratorPage
				)
			);
		}
	}

	let expectedTitle = TITLE_STEP_TEN;
	if ( runSecondCheckpoint ) {
		await typePostTitle( editor, page, CHECKPOINT_TWO_TITLE );
		expectedTitle = CHECKPOINT_TWO_TITLE;
		timeline.push(
			await recordTimelineEntry(
				'after-checkpoint-two-title',
				page,
				collaboratorPage
			)
		);
	}

	const observation = await observeTitles(
		page,
		collaboratorPage,
		expectedTitle,
		knownTitles,
		name
	);

	return {
		name,
		observation: {
			...observation,
			timeline: [ ...timeline, ...observation.timeline ],
		},
	};
}

test( 'realistic title edit after checkpoint reload', async ( {
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
			addCheckpointBody: false,
			collaborationUtils,
			collaboratorUser,
			editor,
			name: 'title-only-reload',
			page,
			requestUtils,
			reloadCollaborator: true,
			runSecondCheckpoint: false,
		} );
	} catch ( error ) {
		result = {
			error: error instanceof Error ? error.stack : String( error ),
			name: 'title-only-reload',
		};
	}

	writeScenarioResult( result );
	expect( result.name ).toBe( 'title-only-reload' );
} );

test( 'realistic second checkpoint title after reload', async ( {
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
			addCheckpointBody: false,
			collaborationUtils,
			collaboratorUser,
			editor,
			name: 'title-only-reload-second-checkpoint',
			page,
			requestUtils,
			reloadCollaborator: true,
			runSecondCheckpoint: true,
		} );
	} catch ( error ) {
		result = {
			error: error instanceof Error ? error.stack : String( error ),
			name: 'title-only-reload-second-checkpoint',
		};
	}

	writeScenarioResult( result );
	expect( result.name ).toBe( 'title-only-reload-second-checkpoint' );
} );

test( 'realistic second checkpoint title with body edits', async ( {
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
			addCheckpointBody: true,
			collaborationUtils,
			collaboratorUser,
			editor,
			name: 'body-and-reload-second-checkpoint',
			page,
			requestUtils,
			reloadCollaborator: true,
			runSecondCheckpoint: true,
		} );
	} catch ( error ) {
		result = {
			error: error instanceof Error ? error.stack : String( error ),
			name: 'body-and-reload-second-checkpoint',
		};
	}

	writeScenarioResult( result );
	expect( result.name ).toBe( 'body-and-reload-second-checkpoint' );
} );
