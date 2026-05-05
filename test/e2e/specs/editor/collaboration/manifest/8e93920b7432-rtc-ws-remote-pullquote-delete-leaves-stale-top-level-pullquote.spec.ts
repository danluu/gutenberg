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

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	process.env.RTC_TRIAGE_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-17-20260504T165737Z/.triage-watcher/signatures/8e93920b7432/realistic-results';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const MINIMAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 956472 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 956472 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SEED_956472_PRESTATE_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 956472 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 956472 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"><!-- wp:paragraph -->',
	'<p>Seed 956472 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 956472 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading --></div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

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
			username: `rtc8e${ uniqueSuffix }`,
			email: `rtc8e+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
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
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{
				includeCrdtDocument: true,
			}
		),
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

async function insertPullquoteAtEnd(
	editor: Editor,
	page: Page,
	anchorText: string,
	value = 'x',
	citationLead = 'b',
	citationTail = 'i'
) {
	const anchor = editor.canvas.getByText( anchorText, { exact: false } ).first();
	await expect( anchor ).toBeVisible();
	await anchor.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/pullquote' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.type( value );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( citationLead );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( citationTail );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );

	await expect( quoteBox ).toContainText( value );
	await expect( citationBox ).toContainText( `${ citationLead }${ citationTail }` );
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runScenario( {
	anchorText,
	collaborationUtils,
	collaboratorUser,
	content,
	insertOnPrimary,
	name,
	page,
	requestUtils,
}: {
	anchorText: string;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	content: string;
	insertOnPrimary: boolean;
	name: string;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `${ name } initial title`,
		} );
		result.postId = post.id;

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

		if ( insertOnPrimary ) {
			await insertPullquoteAtEnd(
				collaborationUtils.editor,
				page,
				anchorText
			);
		} else {
			await insertPullquoteAtEnd(
				collaboratorEditor,
				collaboratorPage,
				anchorText
			);
		}
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-pullquote-insert'
			)
		);

		const deletingEditor = insertOnPrimary
			? collaboratorEditor
			: collaborationUtils.editor;
		const deletingPage = insertOnPrimary ? collaboratorPage : page;
		const deletingPullquoteText = deletingEditor.canvas.getByRole( 'textbox', {
			name: 'Pullquote text',
		} );
		await expect( deletingPullquoteText ).toBeVisible();
		await deletingPullquoteText.click();
		await deleteSelectedBlock( deletingPage, deletingEditor );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-delete'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
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
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	{
		anchorText: 'Shared editing target paragraph.',
		initialContent: MINIMAL_CONTENT,
		insertOnPrimary: false,
		name: 'minimal-collaborator-insert-primary-delete',
	},
	{
		anchorText: 'Shared editing target paragraph.',
		initialContent: SEED_956472_PRESTATE_CONTENT,
		insertOnPrimary: true,
		name: 'seed-956472-primary-insert-collaborator-delete',
	},
	{
		anchorText: 'Shared editing target paragraph.',
		initialContent: SEED_956472_PRESTATE_CONTENT,
		insertOnPrimary: false,
		name: 'seed-956472-collaborator-insert-primary-delete',
	},
] ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		await runScenario( {
			anchorText: scenario.anchorText,
			collaborationUtils,
			collaboratorUser,
			content: scenario.initialContent,
			insertOnPrimary: scenario.insertOnPrimary,
			name: scenario.name,
			page,
			requestUtils,
		} );
	} );
}
