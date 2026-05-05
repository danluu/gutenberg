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
	name: string;
	reloadCollaboratorDuringEdits: boolean;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	expectedOrder: string[];
	primaryOrder?: string[];
	primaryState?: unknown;
	reproduced: boolean;
	scenario: string;
	secondaryOrder?: string[];
	secondaryState?: unknown;
};

const RESULT_DIR = process.env.RTC_307C_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_307C_ATTEMPTS ?? '4', 10 );
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const HEADING_TEXT = 'Follow-up heading';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const FIRST_INSERT = 'RTC 307c realistic first insert';
const SECOND_INSERT = 'RTC 307c realistic second insert';

const SCENARIOS: Scenario[] = [
	{
		name: 'fast-two-inserts',
		reloadCollaboratorDuringEdits: false,
	},
	{
		name: 'reload-collaborator-during-edits',
		reloadCollaboratorDuringEdits: true,
	},
];

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":2} -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const EXPECTED_ORDER = [
	`core/paragraph:${ LONG_PARAGRAPH }`,
	`core/paragraph:${ SECOND_INSERT }`,
	`core/heading:${ HEADING_TEXT }`,
	`core/paragraph:${ FIRST_INSERT }`,
	`core/paragraph:${ TAIL_PARAGRAPH }`,
];
const SHOULD_ENABLE_COLLABORATION =
	process.env.RTC_307C_ENABLE_COLLABORATION === '1';

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

		if ( SHOULD_ENABLE_COLLABORATION ) {
			await setCollaboration( requestUtils, true );
		}
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
			username: `rtc307c${ uniqueSuffix }`,
			email: `rtc307c+${ uniqueSuffix }@example.com`,
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
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			RESULT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string,
	{ useLast = false }: { useLast?: boolean } = {}
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } );
	const target = useLast ? locator.last() : locator.first();
	await expect( target ).toBeVisible();
	await target.click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	existingText: string,
	insertedText: string
) {
	await clickBlockByText( editor, page, existingText, { useLast: true } );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( insertedText, { delay: 12 } );
	await expect(
		editor.canvas.getByText( insertedText, { exact: false } )
	).toBeVisible();
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primaryState,
		secondaryState,
	};
}

function topLevelOrder( state: unknown ): string[] {
	if ( ! state || typeof state !== 'object' || !( 'blocks' in state ) ) {
		return [];
	}

	const blocks = ( state as { blocks?: Array< any > } ).blocks ?? [];
	return blocks.map( ( block ) => {
		const content =
			typeof block?.attributes?.content === 'string'
				? block.attributes.content
				: '';
		return `${ block?.name ?? 'unknown' }:${ content }`;
	} );
}

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const post = await requestUtils.createPost( {
				title: `RTC 307c realistic ${ scenario.name } ${ attempt }`,
				status: 'draft',
				content: INITIAL_CONTENT,
				date_gmt: new Date().toISOString(),
			} );

			await collaborationUtils.openPost( post.id );
			const { page: collaboratorPage } = await collaborationUtils.joinUser(
				post.id,
				collaboratorUser
			);
			await waitForSessionReady( collaborationUtils );

			if ( scenario.reloadCollaboratorDuringEdits ) {
				const reloadPromise = collaboratorPage.reload( {
					waitUntil: 'domcontentloaded',
				} );

				await insertParagraphAfterText(
					editor,
					page,
					HEADING_TEXT,
					FIRST_INSERT
				);
				await insertParagraphAfterText(
					editor,
					page,
					LONG_PARAGRAPH,
					SECOND_INSERT
				);

				await reloadPromise;
				await collaborationUtils.waitForEntityReadyAndSaveSettled(
					collaboratorPage,
					{
						timeout: 20000,
					}
				);
			} else {
				await insertParagraphAfterText(
					editor,
					page,
					HEADING_TEXT,
					FIRST_INSERT
				);
				await insertParagraphAfterText(
					editor,
					page,
					LONG_PARAGRAPH,
					SECOND_INSERT
				);
			}

			const result: AttemptResult = {
				attempt,
				expectedOrder: EXPECTED_ORDER,
				reproduced: false,
				scenario: scenario.name,
			};

			try {
				await waitForSessionReady( collaborationUtils, 30000 );
				const { primaryState, secondaryState } =
					await captureStates( collaborationUtils );
				const primaryOrder = topLevelOrder( primaryState );
				const secondaryOrder = topLevelOrder( secondaryState );

				result.primaryState = primaryState;
				result.secondaryState = secondaryState;
				result.primaryOrder = primaryOrder;
				result.secondaryOrder = secondaryOrder;

				expect( primaryOrder ).toEqual( EXPECTED_ORDER );
				expect( secondaryOrder ).toEqual( EXPECTED_ORDER );
				expect( secondaryState ).toEqual( primaryState );
			} catch ( error ) {
				result.reproduced = true;
				result.error =
					error instanceof Error ? error.stack || error.message : String( error );
				try {
					const { primaryState, secondaryState } =
						await captureStates( collaborationUtils );
					result.primaryState = primaryState;
					result.secondaryState = secondaryState;
					result.primaryOrder = topLevelOrder( primaryState );
					result.secondaryOrder = topLevelOrder( secondaryState );
				} catch ( captureError ) {
					result.error += `\n\nCapture failure: ${ String( captureError ) }`;
				}
				writeAttemptResult( result );
				throw error;
			}

			writeAttemptResult( result );
		} );
	}
}
