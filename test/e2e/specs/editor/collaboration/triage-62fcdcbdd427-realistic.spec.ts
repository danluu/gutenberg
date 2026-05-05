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

type ScenarioName =
	| 'sequential-delete-emoji-move-heading'
	| 'burst-delete-emoji-move-heading'
	| 'sequential-delete-another-move-heading'
	| 'burst-delete-another-move-heading'
	| 'burst-delete-emoji-move-another';

type ScenarioResult = {
	error?: string;
	name: ScenarioName;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_62F_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 950393 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
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
			username: `rtc62f${ uniqueSuffix }`,
			email: `rtc62f+${ uniqueSuffix }@example.com`,
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

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	for ( const currentPage of collaborationUtils.allPages ) {
		await expect(
			currentPage.getByRole( 'button', {
				name: /Collaborators list, 2 online/,
			} )
		).toBeVisible( { timeout: 20000 } );
	}

	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{
				includeCrdtDocument: true,
			}
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
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
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function addHeadingBeforeSelected(
	page: Page,
	editor: Editor,
	headingText: string
) {
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+4` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function appendFormattedParagraphAtEnd(
	page: Page,
	editor: Editor,
	textSuffix: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'italic', { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( `beta ${ textSuffix }`, { delay: 15 } );
	await expect(
		editor.canvas.getByText( `italicbeta ${ textSuffix }`, {
			exact: false,
		} )
	).toBeVisible();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: ScenarioName;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario,
		reproduced: false,
	};
	const insertedHeading = 'Seed 950393 step 2 user 0 heading';
	const insertedItalicSuffix = '950393 0';
	const deleteTarget =
		scenario === 'sequential-delete-another-move-heading' ||
		scenario === 'burst-delete-another-move-heading'
			? 'Another paragraph exists so the top-level list is not degenerate.'
			: 'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
	const moveTarget =
		scenario === 'burst-delete-emoji-move-another'
			? 'Another paragraph exists so the top-level list is not degenerate.'
			: 'Seed 950393 multibyte heading';
	const isBurst = scenario.startsWith( 'burst-' );

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ scenario } initial title`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );

		await appendFormattedParagraphAtEnd(
			page,
			primaryEditor,
			insertedItalicSuffix
		);
		if ( ! isBurst ) {
			await waitForSessionReady( collaborationUtils );
		}

		await clickBlockByText( collaboratorEditor, collaboratorPage, deleteTarget );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		if ( ! isBurst ) {
			await waitForSessionReady( collaborationUtils );
		}

		await clickBlockByText( primaryEditor, page, 'Seed 950393 multibyte heading' );
		await addHeadingBeforeSelected( page, primaryEditor, insertedHeading );
		if ( ! isBurst ) {
			await waitForSessionReady( collaborationUtils );
		}

		await clickBlockByText( collaboratorEditor, collaboratorPage, moveTarget );
		await moveSelectedBlockDown( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			Object.assign( result, await captureStates( collaborationUtils ) );
			writeScenarioResult( result );
			return result;
		}

		Object.assign( result, await captureStates( collaborationUtils ) );
		writeScenarioResult( result );
		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			Object.assign( result, await captureStates( collaborationUtils ) );
		} catch {}
		writeScenarioResult( result );
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'sequential-delete-emoji-move-heading',
	'burst-delete-emoji-move-heading',
	'sequential-delete-another-move-heading',
	'burst-delete-another-move-heading',
	'burst-delete-emoji-move-another',
] as const ) {
	test( scenario, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
			scenario,
		} );
	} );
}
