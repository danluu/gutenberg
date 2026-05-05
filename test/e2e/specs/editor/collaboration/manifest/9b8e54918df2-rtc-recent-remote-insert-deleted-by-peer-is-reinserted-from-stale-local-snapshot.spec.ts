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

type AttemptResult = {
	error?: string;
	insertedParagraph: string;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_9B8E_OUTPUT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 950584 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950584 keeps a second paragraph for deletes and moves.</p>',
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
			username: `rtc9b8e${ uniqueSuffix }`,
			email: `rtc9b8e+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, 'realistic-playwright-result.json' ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
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
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();

	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

test.describe.configure( { mode: 'serial' } );

test( 'reproduces remote-insert deletion divergence with real UI actions', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const insertedParagraph = `RTC realistic 9b8e paragraph ${ Date.now() }`;
	const result: AttemptResult = {
		insertedParagraph,
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC realistic 9b8e title',
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText(
			editor,
			page,
			'Seed 950584 baseline paragraph.'
		);
		await insertParagraphBeforeSelected( editor, page, insertedParagraph );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			insertedParagraph
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 10000 } );
			Object.assign( result, await getStates( collaborationUtils ) );
			result.error =
				'Expected divergence after deleting a remote-inserted block, but both pages converged.';
			writeResult( result );
			throw new Error( result.error );
		} catch ( error ) {
			Object.assign( result, await getStates( collaborationUtils ) );
			const primaryJson = JSON.stringify( result.primaryState );
			const secondaryJson = JSON.stringify( result.secondaryState );
			result.reproduced =
				primaryJson.includes( insertedParagraph ) &&
				! secondaryJson.includes( insertedParagraph );

			if ( ! result.reproduced ) {
				result.error =
					error instanceof Error
						? error.stack ?? error.message
						: String( error );
				writeResult( result );
				throw error;
			}
		}
	} catch ( error ) {
		if ( ! result.error ) {
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}
		writeResult( result );
		throw error;
	}

	writeResult( result );
} );
