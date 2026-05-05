import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
	type Page,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	convergenceError: string | null;
	postId: number;
	primaryState: unknown;
	reproduced: boolean;
	scenario: string;
	secondaryState: unknown;
};

const OUTPUT_DIR = process.env.RTC_31AE5F_OUTPUT_DIR;

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950960 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950960 keeps a second paragraph for deletes and moves.</p>',
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
			username: `rtc31ae${ uniqueSuffix }`,
			email: `rtc31ae+${ uniqueSuffix }@example.com`,
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

function writeResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function focusParagraph(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
	const paragraph = editor.canvas.getByText( text, { exact: false } );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	marker: string
) {
	await focusParagraph( editor, page, anchorText );
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( marker, { delay: 20 } );
	await expect(
		editor.canvas.getByText( marker, { exact: false } )
	).toBeVisible();
}

async function deleteParagraphByMarker(
	editor: Editor,
	page: Page,
	marker: string
) {
	await focusParagraph( editor, page, marker );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function normalizeState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
}

async function runScenario( {
	attempt,
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	editor,
	page,
	postId,
	primaryMarker,
	scenario,
	secondaryMarker,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	page: Page;
	postId: number;
	primaryMarker: string;
	scenario: string;
	secondaryMarker: string;
} ) {
	if ( scenario === 'remote-insert-then-delete' ) {
		await insertParagraphAfterText(
			collaboratorEditor,
			collaboratorPage,
			'Shared editing target paragraph.',
			secondaryMarker
		);
	} else {
		await Promise.all( [
			insertParagraphAfterText(
				editor,
				page,
				'Shared editing target paragraph.',
				primaryMarker
			),
			insertParagraphAfterText(
				collaboratorEditor,
				collaboratorPage,
				'Shared editing target paragraph.',
				secondaryMarker
			),
		] );
	}

	await waitForSessionReady( collaborationUtils );
	await deleteParagraphByMarker( editor, page, secondaryMarker );

	let convergenceError: string | null = null;
	try {
		await waitForSessionReady( collaborationUtils );
	} catch ( error ) {
		convergenceError =
			error instanceof Error ? error.message : String( error );
	}

	const [ primaryState, secondaryState ] = await Promise.all( [
		normalizeState( collaborationUtils, page ),
		normalizeState( collaborationUtils, collaboratorPage ),
	] );
	const reproduced =
		convergenceError !== null ||
		JSON.stringify( primaryState ) !== JSON.stringify( secondaryState );

	writeResult( {
		attempt,
		convergenceError,
		postId,
		primaryState,
		reproduced,
		scenario,
		secondaryState,
	} );

	expect( reproduced ).toBe( false );
}

test.describe( 'RTC triage 31ae5f481d4c realistic paragraph delete search', () => {
	for ( const scenario of [
		'remote-insert-then-delete',
		'concurrent-insert-then-delete',
	] as const ) {
		for ( const attempt of [ 0, 1, 2 ] ) {
			test( `${ scenario } attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				test.setTimeout( 120000 );

				const primaryMarker = `Seed 950960 realistic primary ${ attempt }`;
				const secondaryMarker = `Seed 950960 realistic collaborator ${ attempt }`;
				const post = await requestUtils.createPost( {
					content: INITIAL_CONTENT,
					date_gmt: new Date().toISOString(),
					status: 'draft',
					title: `RTC 31ae5f realistic ${ scenario } ${ attempt }`,
				} );

				await collaborationUtils.openPost( post.id );
				const {
					editor: collaboratorEditor,
					page: collaboratorPage,
				} = await collaborationUtils.joinUser(
					post.id,
					collaboratorUser
				);
				await waitForSessionReady( collaborationUtils );

				try {
					await runScenario( {
						attempt,
						collaborationUtils,
						collaboratorEditor,
						collaboratorPage,
						editor,
						page,
						postId: post.id,
						primaryMarker,
						scenario,
						secondaryMarker,
					} );
				} catch ( error ) {
					const [ primaryState, secondaryState ] = await Promise.all( [
						normalizeState( collaborationUtils, page ).catch(
							( caughtError ) => ( {
								error: String( caughtError ),
							} )
						),
						normalizeState(
							collaborationUtils,
							collaboratorPage
						).catch( ( caughtError ) => ( {
							error: String( caughtError ),
						} ) ),
					] );
					writeResult( {
						attempt,
						convergenceError:
							error instanceof Error
								? error.message
								: String( error ),
						postId: post.id,
						primaryState,
						reproduced: true,
						scenario,
						secondaryState,
					} );
					throw error;
				}
			} );
		}
	}
} );
