/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';

/**
 * WordPress dependencies
 */
import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

const OUTPUT_DIR = process.env.RTC_810C_PASS177_OUTPUT_DIR;
const TYPE_DELAY_MS = Number.parseInt(
	process.env.RTC_810C_PASS177_TYPE_DELAY_MS ?? '160',
	10
);
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Lead paragraph before the shared insertion point.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Anchor paragraph for shared insertion.</p>',
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
		const suffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtc810cp177${ suffix }`,
			email: `rtc810cp177+${ suffix }@example.com`,
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

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
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

async function insertAfterAnchor(
	editor: Editor,
	page: Page,
	insertedText: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas
		.getByText( 'Anchor paragraph for shared insertion.', { exact: true } )
		.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+Y` );
	await page.keyboard.type( insertedText, { delay: TYPE_DELAY_MS } );
}

function writeResult( result: unknown ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'shortcut-race.json' ),
		JSON.stringify( result, null, 2 )
	);
}

test.describe( 'RTC 810c pass177 same-anchor Insert after race', () => {
	test( 'preserves both collaborators typed text', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 150000 );

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC 810c pass177 same-anchor Insert after race',
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		const primaryText = 'Seed 953009 pass177 primary shortcut race';
		const secondaryText = 'Seed 953009 pass177 collaborator shortcut race';

		await Promise.all( [
			insertAfterAnchor( editor, page, primaryText ),
			insertAfterAnchor(
				collaboratorEditor,
				collaboratorPage,
				secondaryText
			),
		] );

		let convergenceError: string | null = null;
		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 20000,
			} );
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
		const primaryJson = JSON.stringify( primaryState );
		const secondaryJson = JSON.stringify( secondaryState );
		const statesEqual = primaryJson === secondaryJson;
		const exactTextsPresentOnBoth =
			primaryJson.includes( primaryText ) &&
			primaryJson.includes( secondaryText ) &&
			secondaryJson.includes( primaryText ) &&
			secondaryJson.includes( secondaryText );

		writeResult( {
			convergenceError,
			exactTextsPresentOnBoth,
			primaryState,
			secondaryState,
			statesEqual,
			typeDelayMs: TYPE_DELAY_MS,
		} );

		expect( convergenceError ).toBeNull();
		expect( statesEqual ).toBe( true );
		expect( exactTextsPresentOnBoth ).toBe( true );
	} );
} );
