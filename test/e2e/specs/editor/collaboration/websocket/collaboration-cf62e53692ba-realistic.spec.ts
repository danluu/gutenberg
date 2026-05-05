import fs from 'fs';
import path from 'path';

import { expect, test as base, type Editor, type Page } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type StateSnapshot = {
	label: string;
	persistedPost: {
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
	reloadTarget: 'collaborator' | 'primary';
	reproduced: boolean;
	snapshots: StateSnapshot[];
};

const RESULT_DIR = process.env.RTC_CF62_RESULT_DIR ?? process.cwd();
const ATTEMPTS = Number.parseInt( process.env.RTC_CF62_ATTEMPTS ?? '6', 10 );
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_TITLE = 'RTC seed 953190 initial title';
const TARGET_TITLE = 'RTC seed 953190 step 1 user 0 title 183969';
const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953190 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"><!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph --></div>',
	'<!-- /wp:group -->',
	'<!-- wp:list -->',
	'<ul class="wp-block-list"><!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item three for sync coverage.</li>',
	'<!-- /wp:list-item --></ul>',
	'<!-- /wp:list -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
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
			username: `rtccf62${ uniqueSuffix }`,
			email: `rtccf62+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			RESULT_DIR,
			`${ result.reloadTarget }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	{ includeCrdtDocument = false, timeout = 20000 } = {}
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument,
		timeout,
	} );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickHeadingBlock( page: Page, editor: Editor ) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const heading = editor.canvas
		.getByRole( 'document', { name: 'Block: Heading 3' } )
		.first();
	await expect( heading ).toBeVisible();
	await heading.click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDownButton ).toBeEnabled();
	await moveDownButton.click();
}

async function typeTitle( page: Page, editor: Editor, nextTitle: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', { name: 'Add title' } );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextTitle, { delay: 15 } );
	await expect( titleBox ).toContainText( nextTitle );
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
): Promise< StateSnapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
		requestUtils.rest< {
			meta?: { _crdt_document?: string | null };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'title.raw,meta._crdt_document',
			},
		} ),
	] );

	return {
		label,
		persistedPost: {
			crdtDocument: persistedPost.meta?._crdt_document ?? null,
			titleRaw: persistedPost.title?.raw ?? '',
		},
		primaryState,
		secondaryState,
	};
}

async function reloadPageAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
}

async function runAttempt(
	{
		attempt,
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		reloadTarget,
		requestUtils,
	}: {
		attempt: number;
		collaborationUtils: CollaborationUtilsClass;
		collaboratorUser: UserCredentials;
		editor: Editor;
		page: Page;
		reloadTarget: 'collaborator' | 'primary';
		requestUtils: any;
	}
): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reloadTarget,
		reproduced: false,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: INITIAL_TITLE,
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
			await captureSnapshot( collaborationUtils, requestUtils, post.id, 'initial' )
		);

		await clickHeadingBlock( page, editor );
		await moveSelectedBlockDown( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-move'
			)
		);

		await typeTitle( page, editor, TARGET_TITLE );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-title'
			)
		);

		if ( reloadTarget === 'primary' ) {
			await reloadPageAndWait( page, collaborationUtils );
		} else {
			await reloadPageAndWait( collaboratorPage, collaborationUtils );
		}

		try {
			await waitForSessionReady( collaborationUtils, {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-reload-failure'
				)
			);
			writeAttemptResult( result );
			return result;
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-reload-success'
			)
		);
		writeAttemptResult( result );
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
					'unhandled-error'
				)
			);
		} catch {}
		writeAttemptResult( result );
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const reloadTarget of [ 'primary', 'collaborator' ] as const ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `cf62 realistic ${ reloadTarget } reload attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );
			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				reloadTarget,
				requestUtils,
			} );
			expect( result.reproduced ).toBe( false );
		} );
	}
}
