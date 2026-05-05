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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Checkpoint = {
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
	attempt: string;
	checkpoints: Checkpoint[];
	error?: string;
	reloadedUser: 'primary' | 'collaborator';
	savedBeforeReload: boolean;
};

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const ATTEMPTS = [
	{
		name: 'primary-reload-no-save',
		reloadedUser: 'primary' as const,
		savedBeforeReload: false,
	},
	{
		name: 'collaborator-reload-no-save',
		reloadedUser: 'collaborator' as const,
		savedBeforeReload: false,
	},
	{
		name: 'primary-reload-after-save',
		reloadedUser: 'primary' as const,
		savedBeforeReload: true,
	},
];

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950216 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950216 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
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
			username: `rtc7f69${ uniqueSuffix }`,
			email: `rtc7f69+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForVisibleConvergence(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( {
		timeout: 15000,
	} );
}

async function collectCheckpoint(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Checkpoint > {
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

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertPullquoteWithBoldCitation(
	editor: Editor,
	page: Page
) {
	await editor.canvas.getByText( 'Shared editing target paragraph.' ).click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/pullquote' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.type( 'xy' );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( 'a' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'it' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
}

async function replaceCitationWithSplitItalic(
	editor: Editor,
	page: Page
) {
	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'b' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'i' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	reloadedUser,
	savedBeforeReload,
}: {
	attempt: string;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	reloadedUser: 'primary' | 'collaborator';
	savedBeforeReload: boolean;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		checkpoints: [],
		reloadedUser,
		savedBeforeReload,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `${ attempt } initial title`,
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForVisibleConvergence( collaborationUtils );
		result.checkpoints.push(
			await collectCheckpoint(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await insertPullquoteWithBoldCitation(
			collaboratorEditor,
			collaboratorPage
		);
		await replaceCitationWithSplitItalic(
			collaboratorEditor,
			collaboratorPage
		);
		await waitForVisibleConvergence( collaborationUtils );
		result.checkpoints.push(
			await collectCheckpoint(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-pullquote-edit'
			)
		);

		await collaboratorEditor
			.canvas.getByText( 'Seed 950216 baseline paragraph.' )
			.click();
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await waitForVisibleConvergence( collaborationUtils );
		result.checkpoints.push(
			await collectCheckpoint(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-delete'
			)
		);

		if ( savedBeforeReload ) {
			await collaboratorEditor.saveDraft();
			await waitForVisibleConvergence( collaborationUtils );
			result.checkpoints.push(
				await collectCheckpoint(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-save'
				)
			);
		}

		const reloadedPage =
			reloadedUser === 'primary' ? page : collaboratorPage;
		await reloadedPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( reloadedPage, {
			timeout: 15000,
		} );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 15000,
		} );
		result.checkpoints.push(
			await collectCheckpoint(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-reload'
			)
		);
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const attemptConfig of ATTEMPTS ) {
	test( attemptConfig.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runAttempt( {
			attempt: attemptConfig.name,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
			reloadedUser: attemptConfig.reloadedUser,
			savedBeforeReload: attemptConfig.savedBeforeReload,
		} );
		writeAttemptResult( result );
		expect( result.error ).toBeUndefined();
	} );
}
