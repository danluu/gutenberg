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

type Scenario = {
	actor: 'primary' | 'collaborator';
	name: string;
	reloadTarget: 'primary' | 'collaborator';
};

type Snapshot = {
	label: string;
	persistedPost: {
		contentRaw: string;
		crdtDocument: string | null;
		titleRaw: string;
	};
	primaryState: unknown;
	secondaryState: unknown;
};

type AttemptResult = {
	actor: 'primary' | 'collaborator';
	attempt: number;
	convergenceError?: string;
	name: string;
	postId?: number;
	persistedMismatch: boolean;
	reloadTarget: 'primary' | 'collaborator';
	reproduced: boolean;
	reproducedShape: boolean;
	snapshots: Snapshot[];
};

type NormalizedState = {
	blocks?: unknown[];
	crdtDocument?: string | null;
	title?: string;
};

const OUTPUT_DIR = process.env.RTC_FA80_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_FA80_ATTEMPTS ?? '1',
	10
);
const FAIL_ON_REPRO = process.env.RTC_FA80_FAIL_ON_REPRO === '1';
const SCENARIO_FILTER = (
	process.env.RTC_FA80_SCENARIO_FILTER ?? ''
)
	.split( ',' )
	.map( ( value ) => value.trim() )
	.filter( Boolean );

const INITIAL_TITLE = 'RTC seed 954147 initial title';
const HEADING_TEXT = 'Follow-up heading';
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const APPENDED_PARAGRAPH = 'Seed 954147 step 1 user 1 paragraph 620912';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		actor: 'collaborator',
		name: 'collaborator-actions-primary-reload',
		reloadTarget: 'primary',
	},
	{
		actor: 'collaborator',
		name: 'collaborator-actions-collaborator-reload',
		reloadTarget: 'collaborator',
	},
	{
		actor: 'primary',
		name: 'primary-actions-primary-reload',
		reloadTarget: 'primary',
	},
	{
		actor: 'primary',
		name: 'primary-actions-collaborator-reload',
		reloadTarget: 'collaborator',
	},
].filter(
	( scenario ) =>
		SCENARIO_FILTER.length === 0 ||
		SCENARIO_FILTER.includes( scenario.name )
);

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
			username: `rtcfa80${ uniqueSuffix }`,
			email: `rtcfa80+${ uniqueSuffix }@example.com`,
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

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }-attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForVisibleConvergence(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
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
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
		requestUtils.rest< {
			content?: { raw?: string };
			meta?: { _crdt_document?: string | null };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw,meta._crdt_document',
			},
		} ),
	] );

	return {
		label,
		persistedPost: {
			contentRaw: persistedPost.content?.raw ?? '',
			crdtDocument: persistedPost.meta?._crdt_document ?? null,
			titleRaw: persistedPost.title?.raw ?? '',
		},
		primaryState,
		secondaryState,
	};
}

function stripCrdtDocument( state: NormalizedState ) {
	return {
		blocks: state.blocks ?? [],
		title: state.title ?? '',
	};
}

function matchesFailureShape( snapshot: Snapshot ): boolean {
	const primaryState = snapshot.primaryState as NormalizedState;
	const secondaryState = snapshot.secondaryState as NormalizedState;

	if ( ! primaryState || ! secondaryState ) {
		return false;
	}

	return (
		JSON.stringify( stripCrdtDocument( primaryState ) ) ===
			JSON.stringify( stripCrdtDocument( secondaryState ) ) &&
		typeof primaryState.crdtDocument === 'string' &&
		typeof secondaryState.crdtDocument === 'string' &&
		primaryState.crdtDocument !== secondaryState.crdtDocument
	);
}

function matchesPersistedMismatch( snapshot: Snapshot ): boolean {
	const primaryState = snapshot.primaryState as NormalizedState;
	const secondaryState = snapshot.secondaryState as NormalizedState;

	if ( ! primaryState || ! secondaryState ) {
		return false;
	}

	const visibleStateMatches =
		JSON.stringify( stripCrdtDocument( primaryState ) ) ===
		JSON.stringify( stripCrdtDocument( secondaryState ) );
	const pagesShowAppendedParagraph =
		JSON.stringify( primaryState.blocks ?? [] ).includes( APPENDED_PARAGRAPH ) &&
		JSON.stringify( secondaryState.blocks ?? [] ).includes( APPENDED_PARAGRAPH );
	const pagesAgreeOnDocument =
		typeof primaryState.crdtDocument === 'string' &&
		primaryState.crdtDocument === secondaryState.crdtDocument;
	const persistedContentIsStale = ! snapshot.persistedPost.contentRaw.includes(
		APPENDED_PARAGRAPH
	);
	const persistedDocumentDiffers =
		typeof primaryState.crdtDocument === 'string' &&
		typeof snapshot.persistedPost.crdtDocument === 'string' &&
		primaryState.crdtDocument !== snapshot.persistedPost.crdtDocument;

	return (
		visibleStateMatches &&
		pagesShowAppendedParagraph &&
		pagesAgreeOnDocument &&
		( persistedContentIsStale || persistedDocumentDiffers )
	);
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

async function moveSelectedBlockUp( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveUp = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } );
	await expect( moveUp ).toBeEnabled();
	await moveUp.click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		actor: scenario.actor,
		attempt,
		name: scenario.name,
		persistedMismatch: false,
		reloadTarget: scenario.reloadTarget,
		reproduced: false,
		reproducedShape: false,
		snapshots: [],
	};
	const scenarioTitle = `${ INITIAL_TITLE } ${ scenario.name } ${ attempt }`;

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: scenarioTitle,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForVisibleConvergence( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		const actorEditor =
			scenario.actor === 'primary' ? editor : collaboratorEditor;
		const actorPage =
			scenario.actor === 'primary' ? page : collaboratorPage;
		const reloadPage =
			scenario.reloadTarget === 'primary' ? page : collaboratorPage;

		await clickBlockByText( actorEditor, actorPage, HEADING_TEXT );
		await moveSelectedBlockUp( actorPage, actorEditor );
		await waitForVisibleConvergence( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-move-up'
			)
		);

		await appendParagraphAtEnd(
			actorEditor,
			actorPage,
			TAIL_PARAGRAPH,
			APPENDED_PARAGRAPH
		);
		await waitForVisibleConvergence( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'before-reload'
			)
		);

		await reloadPageAndWait( reloadPage, collaborationUtils );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.stack ?? error.message : String( error );
			const snapshot = await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-failed-crdt-convergence'
			);
			result.snapshots.push( snapshot );
			result.reproducedShape = matchesFailureShape( snapshot );
			result.reproduced = result.reproducedShape;
			return result;
		}

		const afterReloadSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-reload-converged'
		);
		result.snapshots.push( afterReloadSnapshot );
		result.persistedMismatch = matchesPersistedMismatch( afterReloadSnapshot );
		result.reproduced = result.persistedMismatch;
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
					'after-unexpected-error'
				)
			);
		} catch {}
		return result;
	}
}

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );
			writeAttemptResult( result );

			if ( FAIL_ON_REPRO && result.reproduced ) {
				throw new Error(
					`Reproduced ${ scenario.name } on attempt ${ attempt }`
				);
			}
		} );
	}
}
