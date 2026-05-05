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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	blocks: Array< {
		attributes: Record< string, unknown >;
		innerBlocks: Snapshot['blocks'];
		name: string;
	} >;
	title: string;
};

const OUTPUT_DIR = process.env.RTC_41A3_OUTPUT_DIR ?? process.cwd();
const BASELINE = 'Seed 956728 baseline paragraph.';
const SECOND = 'Seed 956728 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';
const INSERTED_PARAGRAPH = 'Seed 956728 step 0 user 0 paragraph 394072';
const GROUP_PARAGRAPH = 'Seed 956728 step 1 user 0 nested paragraph';
const GROUP_HEADING = 'Seed 956728 step 1 user 0 nested heading';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async ( { admin, editor, requestUtils, page }, use ) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'none',
			editor,
			requestUtils,
			page,
		} );

		await setCollaboration( requestUtils, true );
		await use( utils );
		await utils.teardown();
	},
	collaboratorUser: async ( { requestUtils }, use, testInfo ) => {
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
			username: `rtc41a3${ uniqueSuffix }`,
			email: `rtc41a3+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};

		await requestUtils.createUser( collaboratorUser );
		await use( collaboratorUser );
	},
} );

function writeResult( fileName: string, payload: unknown ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, fileName ),
		JSON.stringify( payload, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
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

async function clickCanvasText( editor: Editor, page: Page, text: string ) {
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

async function clickAddAfter( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
}

async function addParagraphAfterSelected(
	page: Page,
	editor: Editor,
	text: string
) {
	await clickAddAfter( page, editor );
	await page.keyboard.type( text, { delay: 20 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible(
		{
			timeout: 10000,
		}
	);
}

async function insertGroupAfterSelected(
	page: Page,
	editor: Editor,
	paragraphText: string,
	headingText: string
) {
	await clickAddAfter( page, editor );
	await page.keyboard.type( '/group', { delay: 20 } );

	const slashGroupOption = page.getByRole( 'option', {
		name: 'Group',
		exact: true,
	} );
	if ( await slashGroupOption.isVisible().catch( () => false ) ) {
		await slashGroupOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}

	const groupVariationButton = editor.canvas.getByRole( 'button', {
		name: 'Group: Gather blocks in a container.',
	} );
	if ( await groupVariationButton.isVisible().catch( () => false ) ) {
		await groupVariationButton.click();
	}

	await page.keyboard.type( paragraphText, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );

	const slashHeadingOption = page.getByRole( 'option', {
		name: 'Heading',
		exact: true,
	} );
	if ( await slashHeadingOption.isVisible().catch( () => false ) ) {
		await slashHeadingOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}

	await page.keyboard.type( headingText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );

	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible( { timeout: 10000 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible( { timeout: 10000 } );
}

async function captureStates(
	collaborationUtils: CollaborationUtilsClass
): Promise< { primaryState: Snapshot; secondaryState: Snapshot } > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return { primaryState, secondaryState };
}

function summarizeTopLevelBlocks( state: Snapshot ) {
	return state.blocks.map( ( block ) => {
		if ( block.name === 'core/group' ) {
			return {
				name: block.name,
				inner: block.innerBlocks.map(
					( innerBlock ) => innerBlock.attributes.content ?? innerBlock.name
				),
			};
		}
		return block.attributes.content ?? block.name;
	} );
}

function isTargetMismatch( primaryState: Snapshot, secondaryState: Snapshot ) {
	const summarize = ( state: Snapshot ) => summarizeTopLevelBlocks( state );
	const primaryTop = summarize( primaryState );
	const secondaryTop = summarize( secondaryState );

	const exactExpected = [
		BASELINE,
		INSERTED_PARAGRAPH,
		SECOND,
	];

	const isPrimaryExpected =
		JSON.stringify( primaryTop.slice( 0, 3 ) ) === JSON.stringify( exactExpected ) &&
		JSON.stringify( secondaryTop.slice( 0, 3 ) ) ===
			JSON.stringify( exactExpected );
	if ( ! isPrimaryExpected ) {
		return false;
	}

	const groupDescriptor = {
		name: 'core/group',
		inner: [ GROUP_PARAGRAPH, GROUP_HEADING ],
	};
	const primaryTail = primaryTop.slice( 3 );
	const secondaryTail = secondaryTop.slice( 3 );

	return (
		JSON.stringify( primaryTail ) ===
			JSON.stringify( [ groupDescriptor, SHARED ] ) &&
		JSON.stringify( secondaryTail ) ===
			JSON.stringify( [ SHARED, groupDescriptor ] )
	);
}

test( 'realistic paragraph then group insert diverges on order', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 956728 initial title',
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	await clickCanvasText( editor, page, BASELINE );
	await addParagraphAfterSelected( page, editor, INSERTED_PARAGRAPH );
	await waitForSessionReady( collaborationUtils );

	await clickCanvasText( editor, page, SECOND );
	await insertGroupAfterSelected(
		page,
		editor,
		GROUP_PARAGRAPH,
		GROUP_HEADING
	);

	let convergenceError: string | undefined;
	try {
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );
	} catch ( error ) {
		convergenceError =
			error instanceof Error ? error.stack ?? error.message : String( error );
	}

	const { primaryState, secondaryState } = await captureStates(
		collaborationUtils
	);
	const reproduced = isTargetMismatch( primaryState, secondaryState );

	writeResult( 'realistic-group-insert-order.json', {
		convergenceError,
		postId: post.id,
		primaryTopLevel: summarizeTopLevelBlocks( primaryState ),
		primaryState,
		reproduced,
		secondaryTopLevel: summarizeTopLevelBlocks( secondaryState ),
		secondaryState,
	});

	expect( reproduced ).toBe( true );
	expect( convergenceError ).toBeTruthy();
} );
