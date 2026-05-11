import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	crdtDocument?: string | null;
	title: string;
};

type Snapshot = {
	label: string;
	primaryState: NormalizedState | null;
	secondaryState: NormalizedState | null;
};

type Scenario = {
	initialContent: string;
	insert: (
		primaryEditor: Editor,
		primaryPage: Page,
		collaboratorEditor: Editor,
		collaboratorPage: Page,
		targetText: string
	) => Promise< void >;
	name: string;
	optionalPrelude?: (
		collaborationUtils: CollaborationUtilsClass,
		primaryEditor: Editor,
		primaryPage: Page,
		collaboratorEditor: Editor,
		collaboratorPage: Page
	) => Promise< void >;
	saveBeforeDelete: boolean;
	targetText: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
	targetText: string;
};

const RESULT_DIR = process.env.RTC_4B50_RESULT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_4B50_ATTEMPTS ?? '1', 10 );

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
			username: `rtc4b50${ uniqueSuffix }`,
			email: `rtc4b50+${ uniqueSuffix }@example.com`,
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

function paragraph( text: string ) {
	return `<!-- wp:paragraph -->\n<p>${ text }</p>\n<!-- /wp:paragraph -->`;
}

function heading( text: string, level = 2 ) {
	const attributes = level === 2 ? '' : ` {"level":${ level }}`;
	return `<!-- wp:heading${ attributes } -->\n<h${ level } class="wp-block-heading">${ text }</h${ level }>\n<!-- /wp:heading -->`;
}

const HEADING_TARGET = 'triage 4b50 heading target';
const PARAGRAPH_TARGET = 'triage 4b50 paragraph target';

const SCENARIOS: Scenario[] = [
	{
		name: 'heading-insert-then-remote-delete',
		initialContent: [
			paragraph( 'Seed 951552 baseline paragraph.' ),
			paragraph( 'Seed 951552 keeps a second paragraph for deletes and moves.' ),
			paragraph( 'Shared editing target paragraph.' ),
		].join( '\n' ),
		targetText: HEADING_TARGET,
		saveBeforeDelete: false,
		optionalPrelude: async (
			collaborationUtils,
			primaryEditor,
			primaryPage,
			collaboratorEditor,
			collaboratorPage
		) => {
			await clickBlockByText(
				collaboratorEditor,
				collaboratorPage,
				'Shared editing target paragraph.'
			);
			await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
			await waitForSessionReady( collaborationUtils );
			await clickBlockByText(
				primaryEditor,
				primaryPage,
				'Seed 951552 baseline paragraph.'
			);
			await primaryPage.keyboard.press( 'End' );
			await primaryPage.keyboard.type( ' updated', { delay: 20 } );
			await waitForSessionReady( collaborationUtils );
			await clickBlockByText(
				collaboratorEditor,
				collaboratorPage,
				'Seed 951552 keeps a second paragraph for deletes and moves.'
			);
			await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		},
		insert: async (
			_primaryEditor,
			_primaryPage,
			collaboratorEditor,
			collaboratorPage,
			targetText
		) => {
			await insertHeadingAfterText(
				collaboratorEditor,
				collaboratorPage,
				'Seed 951552 baseline paragraph. updated',
				targetText
			);
		},
	},
	{
		name: 'heading-insert-save-then-remote-delete',
		initialContent: [
			paragraph( 'Seed 951732 baseline paragraph.' ),
			paragraph( 'Shared editing target paragraph.' ),
			paragraph( 'Seed 951732 keeps a second paragraph for deletes and moves.' ),
		].join( '\n' ),
		targetText: `${ HEADING_TARGET } save`,
		saveBeforeDelete: true,
		optionalPrelude: async (
			collaborationUtils,
			primaryEditor,
			primaryPage,
			collaboratorEditor,
			collaboratorPage
		) => {
			await appendParagraphAtEnd(
				primaryEditor,
				primaryPage,
				'triage 4b50 primary paragraph'
			);
			await waitForSessionReady( collaborationUtils );
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				'triage 4b50 collaborator paragraph'
			);
		},
		insert: async (
			_primaryEditor,
			_primaryPage,
			collaboratorEditor,
			collaboratorPage,
			targetText
		) => {
			await insertHeadingAfterText(
				collaboratorEditor,
				collaboratorPage,
				'triage 4b50 collaborator paragraph',
				targetText
			);
		},
	},
	{
		name: 'paragraph-append-then-remote-delete',
		initialContent: [
			heading( 'Seed 950605 multibyte heading' ),
			paragraph( 'Emoji and multibyte: hi cafe naive.' ),
			paragraph( 'Another paragraph exists so the top-level list is not degenerate.' ),
		].join( '\n' ),
		targetText: PARAGRAPH_TARGET,
		saveBeforeDelete: false,
		insert: async (
			_primaryEditor,
			_primaryPage,
			collaboratorEditor,
			collaboratorPage,
			targetText
		) => {
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				targetText
			);
		},
	},
	{
		name: 'paragraph-append-save-then-remote-delete',
		initialContent: [
			heading( 'Seed 950605 multibyte heading' ),
			paragraph( 'Emoji and multibyte: hi cafe naive.' ),
			paragraph( 'Another paragraph exists so the top-level list is not degenerate.' ),
		].join( '\n' ),
		targetText: `${ PARAGRAPH_TARGET } save`,
		saveBeforeDelete: true,
		insert: async (
			_primaryEditor,
			_primaryPage,
			collaboratorEditor,
			collaboratorPage,
			targetText
		) => {
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				targetText
			);
		},
	},
];

function writeScenarioResult( result: ScenarioResult, attempt: number ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }-attempt-${ attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function blocksContainText( state: NormalizedState | null, text: string ) {
	return JSON.stringify( state?.blocks ?? [] ).includes( text );
}

function hasLostDeleteShape( snapshot: Snapshot, targetText: string ) {
	const primaryHasTarget = blocksContainText(
		snapshot.primaryState,
		targetText
	);
	const secondaryHasTarget = blocksContainText(
		snapshot.secondaryState,
		targetText
	);
	return primaryHasTarget !== secondaryHasTarget;
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: false,
		timeout: 20000,
	} );
}

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass
): Promise< Snapshot > {
	try {
		const [ primaryState, secondaryState ] = await Promise.all( [
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.allPages[ 0 ],
				{
					includeCrdtDocument: true,
				}
			),
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.getPage( 0 ),
				{
					includeCrdtDocument: true,
				}
			),
		] );

		return {
			label,
			primaryState: primaryState as NormalizedState,
			secondaryState: secondaryState as NormalizedState,
		};
	} catch {
		return {
			label,
			primaryState: null,
			secondaryState: null,
		};
	}
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function chooseMenuItem(
	page: Page,
	preferred: string,
	fallback: string
) {
	const preferredItem = page.getByRole( 'menuitem', { name: preferred } );
	if ( await preferredItem.isVisible().catch( () => false ) ) {
		await preferredItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: fallback } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await chooseMenuItem( page, 'Add after', 'Insert after' );
	await page.keyboard.type( '/heading' );
	await expect(
		page.getByRole( 'listbox' ).filter( { hasText: 'Heading' } ).last()
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 20 } );
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
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
		targetText: scenario.targetText,
	};

	const post = await requestUtils.createPost( {
		content: scenario.initialContent,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `triage 4b50 ${ scenario.name } ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'initial', collaborationUtils )
		);

		if ( scenario.optionalPrelude ) {
			await scenario.optionalPrelude(
				collaborationUtils,
				primaryEditor,
				page,
				collaboratorEditor,
				collaboratorPage
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( 'after-prelude', collaborationUtils )
			);
		}

		await scenario.insert(
			primaryEditor,
			page,
			collaboratorEditor,
			collaboratorPage,
			scenario.targetText
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( 'after-insert', collaborationUtils )
		);

		if ( scenario.saveBeforeDelete ) {
			await primaryEditor.saveDraft();
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( 'after-save', collaborationUtils )
			);
		}

		await clickBlockByText(
			primaryEditor,
			page,
			scenario.targetText
		);
		await deleteSelectedBlock( page, primaryEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: false,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		const finalSnapshot = await captureSnapshot(
			'after-remote-delete',
			collaborationUtils
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced = hasLostDeleteShape(
			finalSnapshot,
			scenario.targetText
		);
		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		result.snapshots.push(
			await captureSnapshot( 'after-error', collaborationUtils )
		);
		result.reproduced = result.snapshots.some( ( snapshot ) =>
			hasLostDeleteShape( snapshot, scenario.targetText )
		);
		return result;
	} finally {
		writeScenarioResult( result, attempt );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );
			const result = await runScenario( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				scenario,
			} );
			const finalSnapshot =
				result.snapshots[ result.snapshots.length - 1 ];

			expect( result.error ).toBeUndefined();
			expect( result.convergenceError ).toBeUndefined();
			expect( result.reproduced ).toBe( false );
			expect(
				blocksContainText(
					finalSnapshot?.primaryState ?? null,
					scenario.targetText
				)
			).toBe( false );
			expect(
				blocksContainText(
					finalSnapshot?.secondaryState ?? null,
					scenario.targetText
				)
			).toBe( false );
		} );
	}
}
