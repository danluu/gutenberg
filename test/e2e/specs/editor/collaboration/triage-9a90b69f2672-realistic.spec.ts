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

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	title: string;
};

const OUTPUT_DIR = process.env.RTC_9A90_OUTPUT_DIR;
const VIDEO_FRAMES_DIR = process.env.RTC_9A90_VIDEO_FRAMES_DIR;
const TITLE = 'RTC seed 952922 initial title';
const STRUCTURED_HEADING = 'Seed 952922 structured content';
const QUOTE_TEXT = 'Nested update seed 952922 step 0 user 1 264840';
const INSERTED_GROUP_PARAGRAPH =
	'Seed 952922 step 2 user 1 paragraph 220953';

const EXACT_PRE_MOVE_CONTENT = [
	'<!-- wp:quote -->',
	`<blockquote class="wp-block-quote"><p>${ QUOTE_TEXT }</p><cite>RTC Fuzzer</cite></blockquote>`,
	'<!-- /wp:quote -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STRUCTURED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ INSERTED_GROUP_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item one for block movement.</li>',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			editor,
			page,
			requestUtils,
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
			username: `rtc9a90${ uniqueSuffix }`,
			email: `rtc9a90+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};

		await requestUtils.createUser( collaboratorUser );
		await use( collaboratorUser );
	},
} );

function writeJson( name: string, value: unknown ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ name }.json` ),
		JSON.stringify( value, null, 2 )
	);
}

async function getNormalizedState( page: Page ): Promise< NormalizedState > {
	return page.evaluate( () => {
		const normalizeBlocks = (
			blocks: Array< {
				attributes?: Record< string, unknown >;
				innerBlocks?: unknown[];
				name: string;
			} >
		): NormalizedBlock[] =>
			blocks.map( ( block ) => ( {
				name: block.name,
				attributes: JSON.parse(
					JSON.stringify( block.attributes ?? {} )
				),
				innerBlocks: normalizeBlocks(
					( block.innerBlocks ?? [] ) as Array< {
						attributes?: Record< string, unknown >;
						innerBlocks?: unknown[];
						name: string;
					} >
				),
			} ) );

		const postId = ( window as any ).wp.data
			.select( 'core/editor' )
			.getCurrentPostId();
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			blocks: normalizeBlocks( blocks ),
			postId,
		};
	} );
}

async function waitForSync(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout,
			} )
		)
	);
}

async function captureFrame(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		getNormalizedState( collaborationUtils.allPages[ 0 ] ),
		getNormalizedState( collaborationUtils.getPage( 0 ) ),
	] );

	writeJson( label, { primaryState, secondaryState } );

	if ( VIDEO_FRAMES_DIR ) {
		fs.mkdirSync( VIDEO_FRAMES_DIR, { recursive: true } );
		await Promise.all( [
			collaborationUtils.allPages[ 0 ].screenshot( {
				path: path.join( VIDEO_FRAMES_DIR, `${ label }-primary.png` ),
				fullPage: false,
			} ),
			collaborationUtils.getPage( 0 ).screenshot( {
				path: path.join( VIDEO_FRAMES_DIR, `${ label }-secondary.png` ),
				fullPage: false,
			} ),
		] );
	}

	return { primaryState, secondaryState };
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

async function moveStructuredHeadingToBottom( editor: Editor, page: Page ) {
	await clickCanvasText( editor, page, STRUCTURED_HEADING );

	for ( let index = 0; index < 2; index++ ) {
		await editor.showBlockToolbar();
		const moveDown = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move down' } );
		await expect( moveDown ).toBeEnabled();
		await moveDown.click();
	}
}

function topLevelNames( state: NormalizedState ) {
	return state.blocks.map( ( block ) => block.name );
}

function findHeading( state: NormalizedState ) {
	return state.blocks.find(
		( block ) =>
			block.name === 'core/heading' &&
			block.attributes.content === STRUCTURED_HEADING
	);
}

function findGroup( state: NormalizedState ) {
	return state.blocks.find( ( block ) => block.name === 'core/group' );
}

function groupHasInsertedParagraph( state: NormalizedState ) {
	return (
		findGroup( state )?.innerBlocks.some(
			( block ) =>
				block.name === 'core/paragraph' &&
				block.attributes.content === INSERTED_GROUP_PARAGRAPH
		) ?? false
	);
}

test.describe.configure( { mode: 'serial' } );

test( 'preseeded heading move after grouped content remains converged', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const post = await requestUtils.createPost( {
		content: EXACT_PRE_MOVE_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );

	await collaborationUtils.openPost( post.id );
	const { page: secondaryPage } = await collaborationUtils.joinUser(
		post.id,
		collaboratorUser
	);
	await page.setViewportSize( { width: 760, height: 860 } );
	await secondaryPage.setViewportSize( { width: 760, height: 860 } );

	await waitForSync( collaborationUtils );
	await captureFrame( collaborationUtils, '01-initial' );

	await page.bringToFront();
	await moveStructuredHeadingToBottom( editor, page );
	await captureFrame( collaborationUtils, '02-after-user-move' );

	await waitForSync( collaborationUtils );
	const finalStates = await captureFrame(
		collaborationUtils,
		'03-after-sync'
	);

	const expectedNames = [
		'core/quote',
		'core/group',
		'core/list',
		'core/heading',
	];

	for ( const state of [
		finalStates.primaryState,
		finalStates.secondaryState,
	] ) {
		expect( topLevelNames( state ) ).toEqual( expectedNames );
		expect( findHeading( state )?.innerBlocks ).toEqual( [] );
		expect( groupHasInsertedParagraph( state ) ).toBe( true );
	}
} );
