import fs from 'fs';
import path from 'path';

import {
	expect,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

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

type Scenario = {
	actor: 'primary' | 'secondary';
	canvasDropTarget?: 'center' | 'start';
	dragMode: 'canvas' | 'listview';
	listViewTarget?: 'group' | 'nested-paragraph';
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	exactArchivedSplit?: boolean;
	finalStates?: {
		primary: NormalizedState;
		secondary: NormalizedState;
	};
	moveAppliedOnActor?: boolean;
	name: string;
	postId?: number;
	reproduced: boolean;
};

const OUTPUT_DIR = process.env.RTC_87EA40A2FDB1_OUTPUT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 954221 step 2 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954221 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954221 step 1 user 1 updated paragraph 357940</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 954221 step 4 user 1</td><td>initial row 1 B seed 954221 step 4 user 1</td></tr><tr><td>initial row 2 A seed 954221 step 4 user 1</td><td>initial row 2 B seed 954221 step 4 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		actor: 'primary',
		dragMode: 'listview',
		listViewTarget: 'group',
		name: 'primary-listview-drag',
	},
	{
		actor: 'secondary',
		dragMode: 'listview',
		listViewTarget: 'group',
		name: 'secondary-listview-drag',
	},
	{
		actor: 'primary',
		dragMode: 'listview',
		listViewTarget: 'nested-paragraph',
		name: 'primary-listview-drop-on-nested-paragraph',
	},
	{
		actor: 'secondary',
		dragMode: 'listview',
		listViewTarget: 'nested-paragraph',
		name: 'secondary-listview-drop-on-nested-paragraph',
	},
	{
		actor: 'primary',
		canvasDropTarget: 'center',
		dragMode: 'canvas',
		name: 'primary-canvas-drag',
	},
	{
		actor: 'secondary',
		canvasDropTarget: 'center',
		dragMode: 'canvas',
		name: 'secondary-canvas-drag',
	},
	{
		actor: 'primary',
		canvasDropTarget: 'start',
		dragMode: 'canvas',
		name: 'primary-canvas-drag-before-nested-paragraph',
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
			username: `rtc87ea${ uniqueSuffix }`,
			email: `rtc87ea+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function sameBlocks( a: NormalizedBlock[] | undefined, b: NormalizedBlock[] | undefined ) {
	return JSON.stringify( a ?? [] ) === JSON.stringify( b ?? [] );
}

function getGroup( state: NormalizedState ) {
	return ( state.blocks ?? [] ).find( ( block ) => block.name === 'core/group' );
}

function actorMoveApplied( state: NormalizedState ) {
	const blocks = state.blocks ?? [];
	const group = getGroup( state );
	const groupChildren = group?.innerBlocks ?? [];
	const hasNestedTable = groupChildren.some(
		( block ) => block.name === 'core/table'
	);
	const hasTopLevelTable = blocks.some( ( block ) => block.name === 'core/table' );

	return hasNestedTable && ! hasTopLevelTable;
}

function matchesArchivedGoodState( state: NormalizedState ) {
	const blocks = state.blocks ?? [];
	if ( blocks.length !== 3 ) {
		return false;
	}

	const group = blocks[ 0 ];
	const groupChildren = group?.innerBlocks ?? [];

	return (
		group?.name === 'core/group' &&
		groupChildren.length === 2 &&
		groupChildren[ 0 ]?.name === 'core/table' &&
		groupChildren[ 1 ]?.name === 'core/paragraph' &&
		blocks[ 1 ]?.name === 'core/heading' &&
		blocks[ 2 ]?.name === 'core/paragraph'
	);
}

function hasArchivedSplit( first: NormalizedState, second: NormalizedState ) {
	const firstBlocks = first.blocks ?? [];
	const secondBlocks = second.blocks ?? [];

	const options = [
		[ first, second, firstBlocks, secondBlocks ],
		[ second, first, secondBlocks, firstBlocks ],
	] as const;

	for ( const [ good, bad, goodBlocks, badBlocks ] of options ) {
		if ( ! matchesArchivedGoodState( good ) ) {
			continue;
		}
		if ( badBlocks.length !== 4 ) {
			continue;
		}
		if (
			sameBlocks( badBlocks.slice( 0, 3 ), goodBlocks ) &&
			badBlocks[ 3 ]?.name === 'core/table'
		) {
			return true;
		}
	}

	return false;
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function dragTableIntoGroup(
	page: Page,
	target: Scenario['listViewTarget'] = 'group'
) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const tableRow = cells.filter( { hasText: 'Table' } ).first();
	const dropRow =
		target === 'nested-paragraph'
			? cells
					.filter( {
						hasText: 'Seed 954221 step 2 user 1 nested paragraph',
					} )
					.first()
			: cells.filter( { hasText: 'Group' } ).first();

	await expect( tableRow ).toBeVisible();
	await expect( dropRow ).toBeVisible();
	await tableRow.dragTo( dropRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function canvasDragTableIntoGroup(
	page: Page,
	editor: Editor,
	dropTarget: 'center' | 'start'
) {
	const groupBlock = editor.canvas
		.getByRole( 'document', {
			name: 'Block: Group',
		} )
		.first();
	const tableCell = editor.canvas
		.getByText( 'initial row 1 A seed 954221 step 4 user 1' )
		.first();

	await expect( tableCell ).toBeVisible();
	await expect( groupBlock ).toBeVisible();

	await tableCell.click();
	await editor.showBlockToolbar();
	const dragHandle = page.locator(
		'role=toolbar[name="Block tools"i] >> role=button[name="Drag"i][include-hidden]'
	);
	await dragHandle.hover();
	await page.mouse.down();
	const groupBox = await groupBlock.boundingBox();
	if ( ! groupBox ) {
		throw new Error( 'Could not determine group block position.' );
	}
	const targetY =
		dropTarget === 'start'
			? groupBox.y + Math.min( 24, groupBox.height * 0.2 )
			: groupBox.y + groupBox.height * 0.5;
	await page.mouse.move(
		groupBox.x + groupBox.width * 0.5,
		targetY,
		{ steps: 20 }
	);
	await page.mouse.up();
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primary, secondary ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primary: primary as NormalizedState,
		secondary: secondary as NormalizedState,
	};
}

async function runScenario( {
	actor,
	canvasDropTarget,
	collaborationUtils,
	collaboratorUser,
	dragMode,
	listViewTarget,
	name,
	requestUtils,
}: {
	actor: Scenario['actor'];
	canvasDropTarget?: Scenario['canvasDropTarget'];
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	dragMode: Scenario['dragMode'];
	listViewTarget?: Scenario['listViewTarget'];
	name: string;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
} ) {
	const result: ScenarioResult = {
		name,
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC seed 954221 initial title',
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { page: secondaryPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );

		const actorPage =
			actor === 'primary' ? collaborationUtils.allPages[ 0 ] : secondaryPage;
		const actorEditor =
			actor === 'primary'
				? collaborationUtils.allEditors[ 0 ]
				: collaborationUtils.allEditors[ 1 ];
		if ( dragMode === 'canvas' ) {
			await canvasDragTableIntoGroup(
				actorPage,
				actorEditor,
				canvasDropTarget ?? 'center'
			);
		} else {
			await dragTableIntoGroup( actorPage, listViewTarget );
		}

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.finalStates = await captureStates( collaborationUtils );
		result.moveAppliedOnActor = actorMoveApplied(
			actor === 'primary'
				? result.finalStates.primary
				: result.finalStates.secondary
		);
		result.exactArchivedSplit = hasArchivedSplit(
			result.finalStates.primary,
			result.finalStates.secondary
		);
		result.reproduced = !! result.exactArchivedSplit;
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
}

for ( const scenario of SCENARIOS ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		await runScenario( {
			actor: scenario.actor,
			canvasDropTarget: scenario.canvasDropTarget,
			collaborationUtils,
			collaboratorUser,
			dragMode: scenario.dragMode,
			listViewTarget: scenario.listViewTarget,
			name: scenario.name,
			requestUtils,
		} );
	} );
}
