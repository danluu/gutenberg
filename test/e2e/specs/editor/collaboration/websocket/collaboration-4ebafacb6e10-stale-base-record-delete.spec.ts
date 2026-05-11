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
	secondaryState: unknown;
};

const OUTPUT_DIR = process.env.RTC_4EBAFAC_OUTPUT_DIR;

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Pass 178 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Pass 178 second paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Pass 178 shared target paragraph.</p>',
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
			username: `rtc4eb${ uniqueSuffix }`,
			email: `rtc4eb+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function focusParagraph( editor: Editor, page: Page, text: string ) {
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
	await page.keyboard.type( marker, { delay: 10 } );
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

async function appendToParagraph(
	editor: Editor,
	page: Page,
	text: string,
	suffix: string
) {
	await focusParagraph( editor, page, text );
	await page.keyboard.press( 'End' );
	await page.keyboard.type( suffix, { delay: 10 } );
}

test.describe( 'RTC 4ebafacb6e10 stale base-record delete repro', () => {
	for ( const attempt of [ 0, 1, 2 ] ) {
		test( `remote insert delete with immediate peer edit attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const marker = `Pass 178 remote paragraph ${ attempt }`;
			const post = await requestUtils.createPost( {
				content: INITIAL_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: `RTC 4ebafacb6e10 pass 178 ${ attempt }`,
			} );

			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForReady( collaborationUtils );

			await insertParagraphAfterText(
				collaboratorEditor,
				collaboratorPage,
				'Pass 178 shared target paragraph.',
				marker
			);
			await waitForReady( collaborationUtils );

			await deleteParagraphByMarker( editor, page, marker );
			await appendToParagraph(
				collaboratorEditor,
				collaboratorPage,
				'Pass 178 baseline paragraph.',
				` edited ${ attempt }`
			);

			let convergenceError: string | null = null;
			try {
				await waitForReady( collaborationUtils );
			} catch ( error ) {
				convergenceError =
					error instanceof Error ? error.message : String( error );
			}

			const [ primaryState, secondaryState ] = await Promise.all( [
				collaborationUtils.getNormalizedPostState( page, {
					includeCrdtDocument: true,
				} ),
				collaborationUtils.getNormalizedPostState( collaboratorPage, {
					includeCrdtDocument: true,
				} ),
			] );
			const serializedPrimary = JSON.stringify( primaryState );
			const serializedSecondary = JSON.stringify( secondaryState );
			const reproduced =
				convergenceError !== null ||
				serializedPrimary !== serializedSecondary ||
				serializedPrimary.includes( marker ) ||
				serializedSecondary.includes( marker );

			writeResult( {
				attempt,
				convergenceError,
				postId: post.id,
				primaryState,
				reproduced,
				secondaryState,
			} );

			expect( reproduced ).toBe( false );
		} );
	}
} );
