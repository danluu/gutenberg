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
	primaryState: any;
	secondaryState: any;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_5FE7_ADD_AFTER_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_5FE7_ADD_AFTER_ATTEMPTS ?? '10',
	10
);
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
const TAIL_TEXT = 'Tail paragraph kept for save and reload stability checks.';

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
			username: `rtc5fe7b${ uniqueSuffix }`,
			email: `rtc5fe7b+${ uniqueSuffix }@example.com`,
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

function ensureOutputDir() {
	if ( OUTPUT_DIR ) {
		fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	}
}

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	ensureOutputDir();
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
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

async function addParagraphAfterSelected(
	editor: Editor,
	page: Page,
	content: string
) {
	await clickBlockByText( editor, page, TAIL_TEXT );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( content, { delay: 10 } );
}

function assertExpectedState(
	snapshot: Snapshot,
	primaryParagraph: string,
	secondaryParagraph: string
) {
	const states = [ snapshot.primaryState, snapshot.secondaryState ];
	for ( const state of states ) {
		expect( state.title ).toBeTruthy();
		expect( Array.isArray( state.blocks ) ).toBe( true );
		expect( state.blocks ).toHaveLength( 5 );
		expect( state.blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( state.blocks[ 0 ].attributes.content ).toContain(
			'Long shared paragraph'
		);
		expect( state.blocks[ 1 ].name ).toBe( 'core/heading' );
		expect( state.blocks[ 1 ].attributes.content ).toBe(
			'Follow-up heading'
		);
		expect( state.blocks[ 2 ].name ).toBe( 'core/paragraph' );
		expect( state.blocks[ 2 ].attributes.content ).toBe( TAIL_TEXT );
		const trailingContents = [
			state.blocks[ 3 ].attributes.content,
			state.blocks[ 4 ].attributes.content,
		].sort();
		expect( trailingContents ).toEqual(
			[ primaryParagraph, secondaryParagraph ].sort()
		);
	}
}

async function saveFailureScreenshots(
	attempt: number,
	page: Page,
	collaboratorPage: Page
) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	ensureOutputDir();
	await page.screenshot( {
		fullPage: true,
		path: path.join( OUTPUT_DIR, `attempt-${ attempt }-primary.png` ),
	} );
	await collaboratorPage.screenshot( {
		fullPage: true,
		path: path.join( OUTPUT_DIR, `attempt-${ attempt }-secondary.png` ),
	} );
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		snapshots: [],
	};
	const primaryParagraph = `RTC 5fe7 add-after primary paragraph ${ attempt }`;
	const secondaryParagraph = `RTC 5fe7 add-after collaborator paragraph ${ attempt }`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 5fe7 add-after attempt ${ attempt }`,
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
				'before-concurrent-add-after'
			)
		);

		await Promise.all( [
			addParagraphAfterSelected(
				collaborationUtils.editor,
				page,
				primaryParagraph
			),
			addParagraphAfterSelected(
				collaboratorEditor,
				collaboratorPage,
				secondaryParagraph
			),
		] );

		await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		const afterConvergence = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-convergence'
		);
		result.snapshots.push( afterConvergence );
		assertExpectedState(
			afterConvergence,
			primaryParagraph,
			secondaryParagraph
		);
	} catch ( error ) {
		result.reproduced = true;
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
		try {
			await saveFailureScreenshots(
				attempt,
				page,
				collaborationUtils.getPage( 0 )
			);
		} catch {}
	}

	writeAttemptResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
	test( `5fe7 add-after realistic attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} );

		if ( result.reproduced ) {
			throw new Error(
				`realistic concurrent add-after diverged on attempt ${ attempt }`
			);
		}
	} );
}
