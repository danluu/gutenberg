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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks?: NormalizedBlock[];
	title?: string;
};

type PageStateResult = {
	error?: string;
	responsive: boolean;
	state?: NormalizedState;
};

type Scenario = {
	includeReload: boolean;
	move: ( page: Page, editor: Editor ) => Promise< void >;
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	moveAppliedOnActor?: boolean;
	postId?: number;
	primaryState?: NormalizedState;
	primaryStateError?: string;
	primaryResponsive?: boolean;
	relatedGroupDuplicate?: boolean;
	reproduced: boolean;
	secondaryState?: NormalizedState;
	secondaryStateError?: string;
	secondaryResponsive?: boolean;
};

const OUTPUT_DIR = process.env.RTC_0FF2_OUTPUT_DIR;
const TITLE = 'RTC 0ff2 realistic paragraph-into-group attempt';
const MOVED_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const NESTED_PARAGRAPH = 'Seed 953029 step 0 user 1 nested paragraph';
const PRESEEDED_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953029 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953029 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953029 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953029 step 2 user 0 updated paragraph 621085</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953029 step 3 user 1 concurrent paragraph 801940</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953029 step 3 user 0 concurrent paragraph 317567</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		includeReload: false,
		move: moveByToolbarDrag,
		name: 'preseeded-toolbar-drag',
	},
	{
		includeReload: false,
		move: moveByCanvasDrag,
		name: 'preseeded-canvas-drag',
	},
	{
		includeReload: false,
		move: moveByListViewDrag,
		name: 'preseeded-list-view-drag',
	},
	{
		includeReload: true,
		move: moveByToolbarDrag,
		name: 'preseeded-reload-toolbar-drag',
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
			username: `rtc0ff2ui${ uniqueSuffix }`,
			email: `rtc0ff2ui+${ uniqueSuffix }@example.com`,
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
	const paragraph = editor.canvas.getByText(
		MOVED_PARAGRAPH,
		{ exact: false }
	);
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
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( NESTED_PARAGRAPH, { exact: false } ),
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
	await page.mouse.move( targetBox.x + 32, targetBox.y + targetBox.height / 3, {
		steps: 20,
	} );
	await page.mouse.up();
	await expect( paragraph ).toBeVisible();
}

async function moveByCanvasDrag( page: Page, editor: Editor ) {
	const paragraph = await selectMovedParagraph( page, editor );
	const target = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( NESTED_PARAGRAPH, { exact: false } ),
		} )
		.first();
	await expect( target ).toBeVisible();
	const startBox = await paragraph.boundingBox();
	const targetBox = await target.boundingBox();
	if ( ! startBox || ! targetBox ) {
		throw new Error( 'Could not determine canvas-drag positions.' );
	}
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2
	);
	await page.mouse.down();
	await page.mouse.move( targetBox.x + 32, targetBox.y + targetBox.height / 3, {
		steps: 20,
	} );
	await page.mouse.up();
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

function blockContainsText( block: NormalizedBlock, text: string ): boolean {
	const content = String(
		block.attributes?.content ?? block.attributes?.value ?? ''
	);
	if ( content.includes( text ) ) {
		return true;
	}

	return ( block.innerBlocks ?? [] ).some( ( innerBlock ) =>
		blockContainsText( innerBlock, text )
	);
}

function stateHasMovedParagraphInsideGroup( state?: NormalizedState ) {
	if ( ! state?.blocks?.length ) {
		return false;
	}

	const topLevelHasMovedParagraph = state.blocks.some(
		( block ) =>
			block.name === 'core/paragraph' &&
			blockContainsText( block, MOVED_PARAGRAPH )
	);
	const topLevelGroup = state.blocks.find(
		( block ) => block.name === 'core/group'
	);

	return Boolean(
		topLevelGroup &&
			blockContainsText( topLevelGroup, MOVED_PARAGRAPH ) &&
			! topLevelHasMovedParagraph
	);
}

function detectRelatedGroupDuplicate(
	primaryState: NormalizedState,
	secondaryState: NormalizedState
) {
	const normalize = ( blocks: NormalizedBlock[] = [] ) =>
		JSON.stringify( blocks );

	return normalize( primaryState.blocks ) !== normalize( secondaryState.blocks );
}

async function getPageState(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
): Promise< PageStateResult > {
	try {
		await page.waitForFunction( () => true, undefined, { timeout: 3000 } );
	} catch ( error ) {
		return {
			error: formatError( error ),
			responsive: false,
		};
	}

	try {
		return {
			responsive: true,
			state: ( await collaborationUtils.getNormalizedPostState(
				page
			) ) as NormalizedState,
		};
	} catch ( error ) {
		return {
			error: formatError( error ),
			responsive: true,
		};
	}
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

		await scenario.move( page, collaborationUtils.editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const [ primaryResult, secondaryResult ] = await Promise.all( [
			getPageState( page, collaborationUtils ),
			getPageState( collaborator.page, collaborationUtils ),
		] );
		result.primaryResponsive = primaryResult.responsive;
		result.primaryState = primaryResult.state;
		result.primaryStateError = primaryResult.error;
		result.secondaryResponsive = secondaryResult.responsive;
		result.secondaryState = secondaryResult.state;
		result.secondaryStateError = secondaryResult.error;
		result.moveAppliedOnActor = stateHasMovedParagraphInsideGroup(
			result.primaryState
		);
		if ( result.primaryState && result.secondaryState ) {
			result.relatedGroupDuplicate = detectRelatedGroupDuplicate(
				result.primaryState,
				result.secondaryState
			);
		}
		result.reproduced = Boolean(
			result.moveAppliedOnActor &&
				(
					result.convergenceError ||
					result.relatedGroupDuplicate ||
					! result.primaryResponsive ||
					! result.secondaryResponsive
				)
		);
	} catch ( error ) {
		result.error = formatError( error );
	} finally {
		writeScenarioResult( result );
	}

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
