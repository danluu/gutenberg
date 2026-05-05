import { test as base, expect, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Locator, Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type RestPostContent = {
	content: {
		raw: string;
	};
};

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

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

function countBlocksByName(
	blocks: Array< {
		name: string;
		innerBlocks?: Array< unknown >;
	} >,
	targetName: string
): number {
	return blocks.reduce( ( count, block ) => {
		const nested = countBlocksByName(
			( block.innerBlocks ?? [] ) as Array< {
				name: string;
				innerBlocks?: Array< unknown >;
			} >,
			targetName
		);
		return count + ( block.name === targetName ? 1 : 0 ) + nested;
	}, 0 );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( { timeout: 15000 } );
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
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

async function appendCheckpointBodyFromParagraph(
	paragraph: Locator,
	page: Page,
	paragraphText: string
) {
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 10 } );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'search' );
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

test( 'realistic second checkpoint keeps appended paragraph after reload', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const prefix = Date.now().toString( 36 );
	const initialTitle = `Realistic loss repro ${ prefix }`;
	const baselineParagraph = `baseline paragraph ${ prefix }`;
	const secondParagraph = `second paragraph ${ prefix }`;
	const sharedParagraph = `shared paragraph ${ prefix }`;
	const checkpointOneParagraph = `checkpoint one paragraph ${ prefix }`;
	const checkpointOneTitle = `checkpoint one title ${ prefix }`;
	const checkpointTwoParagraph = `checkpoint two paragraph ${ prefix }`;
	const checkpointTwoTitle = `checkpoint two title ${ prefix }`;
	const collaboratorConcurrent = `collaborator concurrent paragraph ${ prefix }`;
	const primaryConcurrent = `primary concurrent paragraph ${ prefix }`;
	const updatedParagraph = `updated paragraph ${ prefix }`;

	const post = await requestUtils.createPost( {
		title: initialTitle,
		status: 'draft',
		date_gmt: new Date().toISOString(),
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await editor.canvas
		.getByRole( 'button', { name: 'Add default block' } )
		.click();
	await page.keyboard.type( baselineParagraph, { delay: 10 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( secondParagraph, { delay: 10 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( sharedParagraph, { delay: 10 } );

	let state = await collaborationUtils.waitForConvergence( {
		timeout: 15000,
	} );
	let blocksText = JSON.stringify( state.blocks );
	expect( blocksText ).toContain( baselineParagraph );
	expect( blocksText ).toContain( secondParagraph );
	expect( blocksText ).toContain( sharedParagraph );

	await appendCheckpointBodyFromParagraph(
		collaboratorEditor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.last(),
		collaboratorPage,
		checkpointOneParagraph
	);
	await typePostTitle(
		collaboratorEditor,
		collaboratorPage,
		checkpointOneTitle
	);
	await collaboratorEditor.saveDraft();

	state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	blocksText = JSON.stringify( state.blocks );
	expect( state.crdtDocument ).not.toBeNull();
	expect( state.title ).toContain( checkpointOneTitle );
	expect( blocksText ).toContain( checkpointOneParagraph );
	expect( countBlocksByName( state.blocks, 'core/search' ) ).toBe( 1 );

	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 15000,
	} );
	await waitForSessionReady( collaborationUtils );

	await Promise.all( [
		appendParagraphAfterParagraph(
			editor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last(),
			page,
			primaryConcurrent
		),
		appendParagraphAfterParagraph(
			collaboratorEditor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last(),
			collaboratorPage,
			collaboratorConcurrent
		),
	] );

	state = await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
	blocksText = JSON.stringify( state.blocks );
	expect( blocksText ).toContain( primaryConcurrent );
	expect( blocksText ).toContain( collaboratorConcurrent );

	await replaceParagraphText(
		editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.nth( 1 ),
		page,
		updatedParagraph
	);

	state = await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
	expect( JSON.stringify( state.blocks ) ).toContain( updatedParagraph );

	await appendCheckpointBodyFromParagraph(
		editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.last(),
		page,
		checkpointTwoParagraph
	);
	await typePostTitle( editor, page, checkpointTwoTitle );

	state = await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
	blocksText = JSON.stringify( state.blocks );
	expect( state.title ).toContain( checkpointTwoTitle );
	expect( blocksText ).toContain( checkpointTwoParagraph );
	expect( countBlocksByName( state.blocks, 'core/search' ) ).toBe( 2 );

	await editor.saveDraft();
	state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
	blocksText = JSON.stringify( state.blocks );
	expect( state.crdtDocument ).not.toBeNull();
	expect( state.title ).toContain( checkpointTwoTitle );
	expect( blocksText ).toContain( checkpointTwoParagraph );
	expect( countBlocksByName( state.blocks, 'core/search' ) ).toBe( 2 );

	const persisted = await requestUtils.rest< RestPostContent >( {
		path: `/wp/v2/posts/${ post.id }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );
	expect( persisted.content.raw ).toContain( checkpointTwoParagraph );
	expect( persisted.content.raw.match( /<!-- wp:search\b/g )?.length ).toBe( 2 );
} );
