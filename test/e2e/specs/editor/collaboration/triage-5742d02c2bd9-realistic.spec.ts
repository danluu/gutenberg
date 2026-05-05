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

type Scenario = {
	includeReload: boolean;
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	moveAppliedOnActor: boolean;
	name: string;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_5742_OUTPUT_DIR;
const TITLE = 'RTC 5742 realistic paragraph into existing group';
const MOVED_PARAGRAPH = 'Seed 954030 step 6 user 0 concurrent paragraph 254361';
const TARGET_GROUP_HEADING = 'Seed 954030 step 2 user 0 heading';
const PRESEEDED_CONTENT = [
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item three for sync coverage.</li>',
	'<!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954030 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954030 step 2 user 0 heading</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Nested update seed 954030 step 0 user 0 11046</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954030 step 5 user 0 updated paragraph 821750</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954030 step 6 user 1 concurrent paragraph 320162</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		includeReload: false,
		name: 'toolbar-drag',
	},
	{
		includeReload: true,
		name: 'toolbar-drag-after-reload',
	},
];

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
			username: `rtc5742ui${ uniqueSuffix }`,
			email: `rtc5742ui+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

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

async function reloadEditorPage(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function selectMovedParagraph( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas.getByText( MOVED_PARAGRAPH, {
		exact: false,
	} );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	return paragraph;
}

async function moveByToolbarDrag( page: Page, editor: Editor ) {
	const paragraph = await selectMovedParagraph( page, editor );
	await editor.showBlockToolbar();
	const dragHandle = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Drag' } );
	await expect( dragHandle ).toBeVisible();
	const startBox = await dragHandle.boundingBox();
	const target = editor.canvas
		.getByRole( 'document', { name: 'Block: Heading 3' } )
		.filter( {
			has: editor.canvas.getByText( TARGET_GROUP_HEADING, {
				exact: false,
			} ),
		} )
		.first();
	await expect( target ).toBeVisible();
	const targetBox = await target.boundingBox();
	if ( ! startBox || ! targetBox ) {
		throw new Error( 'Could not determine toolbar-drag positions.' );
	}
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2
	);
	await page.mouse.down();
	await page.mouse.move( targetBox.x + 24, targetBox.y + 8, {
		steps: 20,
	} );
	await page.mouse.up();
	await expect( paragraph ).toBeVisible();
}

async function moveByListViewDrag( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const paragraphRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: MOVED_PARAGRAPH,
	} ).first();
	const groupRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: 'Group',
	} ).first();
	await expect( paragraphRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await paragraphRow.dragTo( groupRow );
}

function countParagraphCopies( state: any, text: string ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.filter(
		( block: any ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === text
	).length;
}

function groupContainsParagraph( state: any, groupHeading: string, text: string ) {
	const blocks = Array.isArray( state?.blocks ) ? state.blocks : [];
	return blocks.some(
		( block: any ) =>
			block?.name === 'core/group' &&
			Array.isArray( block.innerBlocks ) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.name === 'core/heading' &&
					inner?.attributes?.content === groupHeading
			) &&
			block.innerBlocks.some(
				( inner: any ) =>
					inner?.name === 'core/paragraph' &&
					inner?.attributes?.content === text
			)
	);
}

async function getState(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	return collaborationUtils.getNormalizedPostState( page, {
		includeCrdtDocument: true,
	} );
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
	scenario: Scenario;
} ) {
	const result: ScenarioResult = {
		moveAppliedOnActor: false,
		name: scenario.name,
		reproduced: false,
	};

	const post = await requestUtils.createPost( {
		content: PRESEEDED_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE } ${ scenario.name }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const collaborator = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);

		await waitForSessionReady( collaborationUtils );

		if ( scenario.includeReload ) {
			await reloadEditorPage( collaborator.page, collaborationUtils );
		}

		await moveByToolbarDrag( collaborator.page, collaborator.editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const [ primaryState, secondaryState ] = await Promise.all( [
			getState( page, collaborationUtils ),
			getState( collaborator.page, collaborationUtils ),
		] );
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.moveAppliedOnActor = groupContainsParagraph(
			secondaryState,
			TARGET_GROUP_HEADING,
			MOVED_PARAGRAPH
		);
		result.reproduced = Boolean(
			result.moveAppliedOnActor &&
				(
					result.convergenceError ||
					countParagraphCopies( primaryState, MOVED_PARAGRAPH ) >= 1 ||
					countParagraphCopies( secondaryState, MOVED_PARAGRAPH ) >= 1
				)
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );
		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
			scenario,
		} );
		expect( result.error ).toBeUndefined();
	} );
}
