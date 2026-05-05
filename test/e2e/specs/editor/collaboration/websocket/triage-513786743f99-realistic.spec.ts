import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	label: string;
	persistedPost: {
		contentRaw: string;
		titleRaw: string;
	};
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	reproducedFamilyShape: boolean;
	snapshots: Snapshot[];
};

type Scenario = {
	name: string;
	reloadTarget: 'primary' | 'collaborator';
};

const OUTPUT_DIR = process.env.RTC_513786_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 951176 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951176 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const STEP0_TEXT = 'Seed 951176 step 0 user 1 paragraph 691310';
const STEP1_HEADING = 'Seed 951176 step 1 user 0 heading';
const STEP2_HEADING = 'Seed 951176 step 2 user 1 heading';
const STEP3_TITLE = 'RTC seed 951176 step 3 user 1 title 438781';
const STEP4_USER0 = 'Seed 951176 step 4 user 0 concurrent paragraph 540321';
const STEP4_USER1 = 'Seed 951176 step 4 user 1 concurrent paragraph 700230';
const STEP5_HEADING = 'Seed 951176 step 5 user 0 heading';

const SCENARIOS: Scenario[] = [
	{
		name: 'reload-primary-delete-first-paragraph-move-heading-down',
		reloadTarget: 'primary',
	},
	{
		name: 'reload-collaborator-delete-first-paragraph-move-heading-down',
		reloadTarget: 'collaborator',
	},
];

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page,
			requestUtils,
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
			username: `rtc513${ uniqueSuffix }`,
			email: `rtc513+${ uniqueSuffix }@example.com`,
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

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 40000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{
				includeCrdtDocument: true,
			}
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
		requestUtils.rest< {
			content?: { raw?: string };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw',
			},
		} ),
	] );

	return {
		label,
		persistedPost: {
			contentRaw: persistedPost.content?.raw ?? '',
			titleRaw: persistedPost.title?.raw ?? '',
		},
		primaryState,
		secondaryState,
	};
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await expect( page.locator( '[aria-selected="true"]' ).first() ).toBeVisible();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addHeadingBeforeSelected(
	page: Page,
	editor: Editor,
	headingText: string,
	level: 2 | 4
) {
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+${ level }` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDown ).toBeEnabled();
	await moveDown.click();
}

async function setTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', { name: 'Add title' } );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( title, { delay: 10 } );
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

function looksLikeFamilyShape( state: unknown ): boolean {
	const serialized = JSON.stringify( state );
	return (
		serialized.includes( STEP5_HEADING ) ||
		serialized.includes( STEP4_USER0 ) ||
		serialized.includes( STEP4_USER1 )
	);
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		reproducedFamilyShape: false,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await appendParagraphAtEnd( collaboratorEditor, collaboratorPage, STEP0_TEXT );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( editor, page, 'Shared editing target paragraph.' );
		await addHeadingBeforeSelected( page, editor, STEP1_HEADING, 2 );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( collaboratorEditor, collaboratorPage, STEP1_HEADING );
		await addHeadingBeforeSelected(
			collaboratorPage,
			collaboratorEditor,
			STEP2_HEADING,
			4
		);
		await waitForSessionReady( collaborationUtils );

		await setTitle( collaboratorEditor, collaboratorPage, STEP3_TITLE );
		await waitForSessionReady( collaborationUtils );

		await appendParagraphAtEnd( editor, page, STEP4_USER0 );
		await waitForSessionReady( collaborationUtils );
		await appendParagraphAtEnd( collaboratorEditor, collaboratorPage, STEP4_USER1 );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( editor, page, STEP4_USER1 );
		await addHeadingBeforeSelected( page, editor, STEP5_HEADING, 2 );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'before-reload'
			)
		);

		if ( scenario.reloadTarget === 'primary' ) {
			await reloadPageAndWait( page, collaborationUtils );
		} else {
			await reloadPageAndWait( collaboratorPage, collaborationUtils );
		}
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-reload'
			)
		);

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			'Seed 951176 baseline paragraph.'
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-delete'
			)
		);

		await clickBlockByText( editor, page, STEP5_HEADING );
		await moveSelectedBlockDown( page, editor );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-failed-convergence'
				)
			);
			const lastSnapshot = result.snapshots[ result.snapshots.length - 1 ];
			result.reproducedFamilyShape =
				looksLikeFamilyShape( lastSnapshot.primaryState ) &&
				looksLikeFamilyShape( lastSnapshot.secondaryState );
			return result;
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-convergence'
			)
		);
		return result;
	} catch ( error ) {
		result.convergenceError =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-exception'
				)
			);
		} catch {}
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
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
			page,
			requestUtils,
			scenario,
		} );
		writeScenarioResult( result );
		expect( result.convergenceError ).toBeUndefined();
	} );
}
