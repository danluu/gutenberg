import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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
	attempt: number;
	checkpointContent?: string;
	checkpointTitle?: string;
	convergedState?: unknown;
	error?: string;
	getEditedPostContent?: string;
	getEditedPostTitle?: string;
	hasFreeformBlock?: boolean;
	label: string;
	persistedContentAfterSave?: string;
	postId?: number;
	reproduced: boolean;
};

type RestPostContent = {
	content: {
		raw: string;
	};
};

const OUTPUT_DIR = process.env.RTC_4D8_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952421 multibyte heading</h2>',
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
			username: `rtc4d8${ uniqueSuffix }`,
			email: `rtc4d8+${ uniqueSuffix }@example.com`,
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

async function appendParagraphAfterParagraph(
	paragraph: Locator,
	page: Page,
	text: string
) {
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( paragraph.page().locator( 'body' ) ).toContainText( text );
}

async function appendParagraphAfterLastBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ArrowDown' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function replaceParagraphText(
	paragraph: Locator,
	page: Page,
	nextText: string
) {
	await paragraph.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( nextText, { delay: 10 } );
	await expect( paragraph ).toContainText( nextText );
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }`, { delay: 10 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function insertTableAfterParagraph(
	editor: Editor,
	page: Page,
	cellPrefix: string
) {
	const lastParagraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last();
	await lastParagraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'table' );

	const cells = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} );
	await expect( cells.first() ).toBeVisible();
	const values = [
		`${ cellPrefix } row 1 A`,
		`${ cellPrefix } row 1 B`,
		`${ cellPrefix } row 2 A`,
		`${ cellPrefix } row 2 B`,
	];
	for ( let index = 0; index < values.length; index++ ) {
		const cell = cells.nth( index );
		await cell.click();
		await page.keyboard.press( `${ MODIFIER_KEY }+A` );
		await page.keyboard.type( values[ index ], { delay: 10 } );
		await expect( cell ).toHaveText( values[ index ] );
	}
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	nextTitle: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextTitle, { delay: 20 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function insertCheckpointSearch(
	editor: Editor,
	page: Page,
	paragraphText: string
) {
	const lastParagraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last();
	await appendParagraphAfterParagraph( lastParagraph, page, paragraphText );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDown = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	if ( await moveDown.isVisible().catch( () => false ) ) {
		await moveDown.click();
	}
}

async function getEditedPostContent( page: Page ) {
	return page.evaluate(
		() => ( window as any ).wp.data.select( 'core/editor' ).getEditedPostContent()
	);
}

async function getEditedPostTitle( page: Page ) {
	return page.evaluate(
		() =>
			( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostAttribute( 'title' )
	);
}

async function getConvergedState( collaborationUtils: CollaborationUtilsClass ) {
	return collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

function hasFreeformBlock( state: any ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.some( ( block: any ) => block?.name === 'core/freeform' );
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic refresh-resync can collapse edited post content to the trailing search block', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 360000 );

	for ( let attempt = 1; attempt <= 3; attempt++ ) {
		const label = `attempt-${ attempt }-${ Date.now().toString( 36 ) }`;
		const insertedParagraph = `Seed 952421 step 0 user 1 paragraph ${ label }`;
		const updatedParagraph = `Seed 952421 step 1 user 0 updated paragraph ${ label }`;
		const checkpointParagraph = `rtc-save-paragraph-marker-952421-${ label }`;
		const checkpointTitle = `rtc-save-title-marker-952421-${ label }`;
		const tablePrefix = `Seed 952421 ${ label }`;
		const attemptResult: AttemptResult = {
			attempt,
			checkpointContent: checkpointParagraph,
			checkpointTitle,
			label,
			reproduced: false,
		};

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC 4d8 realistic ${ label }`,
		} );
		attemptResult.postId = post.id;

		try {
			await collaborationUtils.openPost( post.id );
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await appendParagraphAfterLastBlock(
				collaboratorEditor,
				collaboratorPage,
				insertedParagraph
			);
			await waitForSessionReady( collaborationUtils );

			await replaceParagraphText(
				editor.canvas.getByText( insertedParagraph, { exact: false } ),
				page,
				updatedParagraph
			);
			await waitForSessionReady( collaborationUtils );

			await insertTableAfterParagraph( editor, page, tablePrefix );
			await waitForSessionReady( collaborationUtils );

			await appendParagraphAfterLastBlock(
				collaboratorEditor,
				collaboratorPage,
				`Seed 952421 step 3 user 1 paragraph ${ label }`
			);
			await waitForSessionReady( collaborationUtils );

			await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaboratorPage,
				{ timeout: 20000 }
			);
			await waitForSessionReady( collaborationUtils );

			const updatedBlock = collaboratorEditor.canvas.getByText(
				updatedParagraph,
				{ exact: false }
			);
			if ( await updatedBlock.isVisible().catch( () => false ) ) {
				await updatedBlock.click();
				await moveSelectedBlockDown( collaboratorPage, collaboratorEditor );
				await waitForSessionReady( collaborationUtils );
			}

			await insertCheckpointSearch( editor, page, checkpointParagraph );
			await typePostTitle( editor, page, checkpointTitle );
			await waitForSessionReady( collaborationUtils );

			const contentBeforeSave = await getEditedPostContent( page );
			const titleBeforeSave = await getEditedPostTitle( page );
			const convergedState = await getConvergedState( collaborationUtils );
			const persistedBeforeSave = await requestUtils.rest< RestPostContent >( {
				path: `/wp/v2/posts/${ post.id }`,
				params: {
					context: 'edit',
					_fields: 'content.raw',
				},
			} );

			attemptResult.getEditedPostContent = contentBeforeSave;
			attemptResult.getEditedPostTitle = titleBeforeSave;
			attemptResult.convergedState = convergedState;
			attemptResult.hasFreeformBlock = hasFreeformBlock( convergedState );

			if ( ! contentBeforeSave.includes( checkpointParagraph ) ) {
				attemptResult.reproduced = true;
				attemptResult.persistedContentAfterSave = persistedBeforeSave.content.raw;
				writeAttemptResult( attemptResult );
				expect( contentBeforeSave ).toContain( checkpointParagraph );
			}

			await editor.saveDraft();
			await getConvergedState( collaborationUtils );

			const persistedAfterSave = await requestUtils.rest< RestPostContent >( {
				path: `/wp/v2/posts/${ post.id }`,
				params: {
					context: 'edit',
					_fields: 'content.raw',
				},
			} );
			attemptResult.persistedContentAfterSave = persistedAfterSave.content.raw;
			attemptResult.reproduced = ! persistedAfterSave.content.raw.includes(
				checkpointParagraph
			);
		} catch ( error ) {
			attemptResult.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		writeAttemptResult( attemptResult );

		if ( attemptResult.reproduced ) {
			return;
		}
	}

	throw new Error(
		'No realistic reproduction found in three attempts of the refresh-resync-save-loss scenario.'
	);
} );
