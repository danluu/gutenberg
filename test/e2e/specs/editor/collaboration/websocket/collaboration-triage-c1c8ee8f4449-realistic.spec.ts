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

type AttemptResult = {
	attempt: number;
	converged: boolean;
	error?: string;
	headingText: string;
	postId?: number;
	primaryState?: unknown;
	producedFailureShape: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_C1C8_REALISTIC_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt(
	process.env.RTC_C1C8_REALISTIC_ATTEMPTS ?? '8',
	10
);
const HEADING_TEXT = 'Seed 954733 multibyte heading';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const OTHER_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ OTHER_PARAGRAPH }</p>`,
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
			username: `rtcc1c8r${ uniqueSuffix }`,
			email: `rtcc1c8r+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Realistic',
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
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
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
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function prepareMoveEmojiDown( editor: Editor, page: Page ) {
	await clickBlockByText( editor, page, EMOJI_PARAGRAPH );
	await editor.showBlockToolbar();
	const button = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( button ).toBeEnabled();
	return button;
}

async function insertHeadingBeforeHeading(
	editor: Editor,
	page: Page,
	headingText: string
) {
	await clickBlockByText( editor, page, HEADING_TEXT );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( '/heading', { delay: 15 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

function summarizeBlocks( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/heading' ) {
			return `heading:${ block?.attributes?.content ?? '' }`;
		}
		return `${ block?.name ?? 'unknown' }:${ block?.attributes?.content ?? '' }`;
	} );
}

function matchesFailureShape(
	primaryState: any,
	secondaryState: any,
	insertedHeadingText: string
) {
	const summaries = [
		summarizeBlocks( primaryState ),
		summarizeBlocks( secondaryState ),
	];
	const expectedA = [
		`heading:${ insertedHeadingText }`,
		`heading:${ HEADING_TEXT }`,
		`core/paragraph:${ OTHER_PARAGRAPH }`,
		`core/paragraph:${ EMOJI_PARAGRAPH }`,
	];
	const expectedB = [
		`heading:${ insertedHeadingText }`,
		`heading:${ HEADING_TEXT }`,
		`core/paragraph:${ EMOJI_PARAGRAPH }`,
		`core/paragraph:${ EMOJI_PARAGRAPH }`,
	];

	return summaries.some(
		( summary, index ) =>
			JSON.stringify( summary ) === JSON.stringify( expectedA ) &&
			JSON.stringify( summaries[ ( index + 1 ) % 2 ] ) ===
				JSON.stringify( expectedB )
	);
}

test.describe.configure( { mode: 'serial' } );

for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
	test( `realistic concurrent insert/move attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result: AttemptResult = {
			attempt,
			converged: false,
			headingText: `RTC c1c8 realistic heading ${ attempt }`,
			producedFailureShape: false,
		};
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC c1c8 realistic attempt ${ attempt }`,
		} );
		result.postId = post.id;

		try {
			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			const moveDownButton = await prepareMoveEmojiDown(
				collaborationUtils.editor,
				collaborationUtils.primaryPage
			);

			await Promise.all( [
				insertHeadingBeforeHeading(
					collaboratorEditor,
					collaboratorPage,
					result.headingText
				),
				moveDownButton.click(),
			] );

			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
			result.converged = true;
		} catch ( error ) {
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		const [ primaryState, secondaryState ] = await Promise.all( [
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.allPages[ 0 ]
			),
			collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		] );
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.producedFailureShape = matchesFailureShape(
			primaryState,
			secondaryState,
			result.headingText
		);

		writeAttemptResult( result );

		expect( result.error ).toBeUndefined();
		expect( result.producedFailureShape ).toBe( false );
	} );
}
