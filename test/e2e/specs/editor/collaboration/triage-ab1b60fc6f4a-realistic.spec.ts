import fs from 'node:fs/promises';
import path from 'node:path';

import {
	expect,
	test as base,
} from '@wordpress/e2e-test-utils-playwright';
import type { Locator, Page, TestInfo } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

const ATTEMPTS = Number.parseInt(
	process.env.RTC_AB1B60FC6F4A_ATTEMPTS ?? '4',
	10
);
const OUTPUT_DIR =
	process.env.RTC_AB1B60FC6F4A_OUTPUT_DIR ??
	path.join( process.cwd(), 'artifacts', 'ab1b60fc6f4a-realistic-results' );

const STEP4_USER0 = 'Seed 953255 step 4 user 0 concurrent paragraph 185113';
const STEP4_USER1 = 'Seed 953255 step 4 user 1 concurrent paragraph 169940';
const STEP5_USER0 = 'Seed 953255 step 5 user 0 concurrent paragraph 270490';
const STEP5_USER1 = 'Seed 953255 step 5 user 1 concurrent paragraph 707446';
const POST_TITLE = 'rtc-save-title-marker-953255-3-0-end';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953255-3-0-end';
const SEARCH_MARKER = 'rtc-save-search-option-marker-953255-3-0-end';

const STEP3_SAVED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953255 step 0 user 0 heading</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953255 step 2 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953255 step 2 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953255 step 3 user 1 updated paragraph 279791</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"label":"Search label ${ SEARCH_MARKER }","placeholder":"Search placeholder ${ SEARCH_MARKER }","buttonText":"Find ${ SEARCH_MARKER }","buttonPosition":"button-inside"} /-->`,
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
			username: `rtcrepro${ uniqueSuffix }`,
			email: `rtcrepro+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Repro',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( { timeout: 15000 } );
}

async function appendParagraphAfterParagraph(
	paragraph: Locator,
	page: Page,
	text: string
) {
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
}

async function captureStates(
	collaborationUtils: CollaborationUtilsClass,
	page: Page,
	collaboratorPage: Page
) {
	const [ primary, collaborator ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( page ),
		collaborationUtils.getNormalizedPostState( collaboratorPage ),
	] );

	return { collaborator, primary };
}

async function writeResult(
	testInfo: TestInfo,
	attempt: number,
	result: Record< string, unknown >
) {
	await fs.mkdir( OUTPUT_DIR, { recursive: true } );
	await fs.writeFile(
		path.join(
			OUTPUT_DIR,
			`${ testInfo.titlePath.at( -1 ) ?? 'attempt' }-${ attempt }.json`
		),
		JSON.stringify( result, null, 2 ) + '\n'
	);
}

for ( let attempt = 0; attempt < ATTEMPTS; attempt++ ) {
	test(
		`realistic checkpoint-state concurrent appends attempt ${ attempt }`,
		async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		}, testInfo ) => {
			test.setTimeout( 180000 );

			const post = await requestUtils.createPost( {
				content: STEP3_SAVED_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: POST_TITLE,
			} );

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			const result: Record< string, unknown > = {
				attempt,
				postId: post.id,
				step3Title: POST_TITLE,
			};

			try {
				const initialState = await collaborationUtils.waitForConvergence( {
					timeout: 15000,
				} );
				result.initialState = initialState;

				await Promise.all( [
					appendParagraphAfterParagraph(
						editor.canvas
							.getByRole( 'document', {
								name: 'Block: Paragraph',
							} )
							.last(),
						page,
						STEP4_USER0
					),
					appendParagraphAfterParagraph(
						collaboratorEditor.canvas
							.getByRole( 'document', {
								name: 'Block: Paragraph',
							} )
							.last(),
						collaboratorPage,
						STEP4_USER1
					),
				] );

				const afterRoundOne =
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
				result.afterRoundOne = afterRoundOne;
				expect( JSON.stringify( afterRoundOne.blocks ) ).toContain(
					STEP4_USER0
				);
				expect( JSON.stringify( afterRoundOne.blocks ) ).toContain(
					STEP4_USER1
				);

				await Promise.all( [
					appendParagraphAfterParagraph(
						editor.canvas
							.getByRole( 'document', {
								name: 'Block: Paragraph',
							} )
							.last(),
						page,
						STEP5_USER0
					),
					appendParagraphAfterParagraph(
						collaboratorEditor.canvas
							.getByRole( 'document', {
								name: 'Block: Paragraph',
							} )
							.last(),
						collaboratorPage,
						STEP5_USER1
					),
				] );

				const finalState = await collaborationUtils.waitForConvergence( {
					timeout: 20000,
				} );
				result.finalState = finalState;
				result.finalStatesByPage = await captureStates(
					collaborationUtils,
					page,
					collaboratorPage
				);

				const finalBlocks = JSON.stringify( finalState.blocks );
				expect( finalBlocks ).toContain( STEP4_USER0 );
				expect( finalBlocks ).toContain( STEP4_USER1 );
				expect( finalBlocks ).toContain( STEP5_USER0 );
				expect( finalBlocks ).toContain( STEP5_USER1 );
				result.reproduced = false;
			} catch ( error ) {
				result.error =
					error instanceof Error
						? error.stack ?? error.message
						: String( error );
				result.finalStatesByPage = await captureStates(
					collaborationUtils,
					page,
					collaboratorPage
				).catch( () => null );
				result.reproduced = true;
				await writeResult( testInfo, attempt, result );
				throw error;
			}

			await writeResult( testInfo, attempt, result );
		}
	);
}
