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
	attempt: number;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenarioId: string;
	snapshots: Snapshot[];
};

type Scenario = {
	id: string;
	insertAfter: string;
	moveBlockText: string;
	moveDirection: 'down' | 'up';
};

const OUTPUT_DIR = process.env.RTC_B143_REPRO_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_B143_ATTEMPTS ?? '3',
	10
);
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950352 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950352 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		id: 'delete-heading-move-first-down',
		insertAfter: 'Seed 950352 baseline paragraph.',
		moveBlockText: 'Seed 950352 baseline paragraph.',
		moveDirection: 'down',
	},
	{
		id: 'delete-heading-move-third-up',
		insertAfter: 'Seed 950352 baseline paragraph.',
		moveBlockText: 'Shared editing target paragraph.',
		moveDirection: 'up',
	},
];

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
			username: `rtcb143${ uniqueSuffix }`,
			email: `rtcb143+${ uniqueSuffix }@example.com`,
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
		path.join(
			OUTPUT_DIR,
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
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
			{
				includeCrdtDocument: true,
			}
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

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'down' | 'up'
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'down' ? 'Move down' : 'Move up',
		} )
		.click();
}

function hasEmptyEditorState( snapshot: Snapshot ): boolean {
	const primaryBlocks = ( snapshot.primaryState as { blocks?: unknown[] } )
		.blocks;
	const secondaryBlocks = ( snapshot.secondaryState as { blocks?: unknown[] } )
		.blocks;
	return (
		Array.isArray( primaryBlocks ) &&
		Array.isArray( secondaryBlocks ) &&
		( primaryBlocks.length === 0 || secondaryBlocks.length === 0 )
	);
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};

	const headingText = `Seed 950352 attempt ${ attempt } ${ scenario.id } heading`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC b143 realistic ${ scenario.id } attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await insertHeadingAfterText(
			collaboratorEditor,
			collaboratorPage,
			scenario.insertAfter,
			headingText
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-heading-insert'
			)
		);

		await clickBlockByText( collaboratorEditor, collaboratorPage, headingText );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-heading-delete'
			)
		);

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			scenario.moveBlockText
		);
		await moveSelectedBlock(
			collaboratorPage,
			collaboratorEditor,
			scenario.moveDirection
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.reproduced = true;
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-failed-convergence'
				)
			);
			return result;
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-move'
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced = hasEmptyEditorState( finalSnapshot );
		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-error'
				)
			);
		} catch {}
		return result;
	} finally {
		writeAttemptResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );

			expect( result.error ).toBeUndefined();
			expect( result.reproduced ).toBe( false );
		} );
	}
}
