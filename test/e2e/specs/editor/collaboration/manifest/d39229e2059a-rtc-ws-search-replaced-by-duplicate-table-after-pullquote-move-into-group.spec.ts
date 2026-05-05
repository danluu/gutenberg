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
	crdtDocument?: string | null;
	title?: string;
};

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: NormalizedState;
	secondaryState: NormalizedState;
};

type Scenario = {
	includeCollaboratorReload: boolean;
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	exactArchivedSplit: boolean;
	moveAppliedOnActor: boolean;
	name: string;
	postId?: number;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_D39229_OUTPUT_DIR;
const TITLE = 'rtc-save-title-marker-953034-2-0-end';
const SEARCH_MARKER = 'rtc-save-search-option-marker-953034-2-0-end';
const PARAGRAPH_MARKER = 'rtc-save-paragraph-marker-953034-2-0-end';
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const PRESEEDED_CONTENT = [
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 953034 step 2 user 0 heading</h4>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_MARKER }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953034 step 4 user 1</td><td>initial row 1 B seed 953034 step 4 user 1</td></tr><tr><td>initial row 2 A seed 953034 step 4 user 1</td><td>initial row 2 B seed 953034 step 4 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH_MARKER }","label":"Search label ${ SEARCH_MARKER }","placeholder":"Search placeholder ${ SEARCH_MARKER }","showLabel":true} /-->`,
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:pullquote {"value":"","citation":"<em>alpha</em><strong>beta</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p></p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em><em>italic</em></p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		includeCollaboratorReload: false,
		name: 'preseeded-pullquote-into-group',
	},
	{
		includeCollaboratorReload: true,
		name: 'preseeded-collaborator-reload-then-pullquote-into-group',
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
			username: `rtc39229${ uniqueSuffix }`,
			email: `rtc39229+${ uniqueSuffix }@example.com`,
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

function stripMarkup( value: unknown ) {
	return String( value ?? '' ).replaceAll( /<[^>]+>/g, '' ).trim();
}

function topLevelBlocks( state: NormalizedState ) {
	return state.blocks ?? [];
}

function topLevelNames( state: NormalizedState ) {
	return topLevelBlocks( state ).map( ( block ) => block.name );
}

function getSearchBlock( state: NormalizedState ) {
	return topLevelBlocks( state ).find(
		( block ) =>
			block.name === 'core/search' &&
			JSON.stringify( block.attributes ?? {} ).includes( SEARCH_MARKER )
	);
}

function getGroupBlock( state: NormalizedState ) {
	return topLevelBlocks( state ).find( ( block ) => block.name === 'core/group' );
}

function groupChildrenSummary( state: NormalizedState ) {
	return ( getGroupBlock( state )?.innerBlocks ?? [] ).map( ( block ) => ( {
		citation: stripMarkup( block.attributes?.citation ),
		content: stripMarkup( block.attributes?.content ?? block.attributes?.value ),
		name: block.name,
	} ) );
}

function hasNestedPullquoteGroup( state: NormalizedState ) {
	return (
		JSON.stringify( groupChildrenSummary( state ) ) ===
		JSON.stringify( [
			{
				citation: 'alphabeta',
				content: '',
				name: 'core/pullquote',
			},
			{
				citation: '',
				content: 'Nested group paragraph alpha.',
				name: 'core/paragraph',
			},
			{
				citation: '',
				content: 'Nested group paragraph beta.',
				name: 'core/paragraph',
			},
		] )
	);
}

function hasTopLevelPullquote( state: NormalizedState ) {
	return topLevelBlocks( state ).some( ( block ) => block.name === 'core/pullquote' );
}

function hasHealthyPostMoveShape( state: NormalizedState ) {
	return (
		JSON.stringify( topLevelNames( state ) ) ===
			JSON.stringify( [
				'core/list',
				'core/heading',
				'core/paragraph',
				'core/table',
				'core/search',
				'core/group',
				'core/paragraph',
			] ) &&
		!! getSearchBlock( state ) &&
		hasNestedPullquoteGroup( state ) &&
		! hasTopLevelPullquote( state )
	);
}

function hasArchivedBadShape( state: NormalizedState ) {
	return (
		JSON.stringify( topLevelNames( state ) ) ===
			JSON.stringify( [
				'core/list',
				'core/heading',
				'core/paragraph',
				'core/table',
				'core/table',
				'core/group',
				'core/paragraph',
			] ) &&
		! getSearchBlock( state ) &&
		hasNestedPullquoteGroup( state ) &&
		! hasTopLevelPullquote( state )
	);
}

function hasExactArchivedSplit(
	primaryState: NormalizedState,
	secondaryState: NormalizedState
) {
	return (
		( hasHealthyPostMoveShape( primaryState ) &&
			hasArchivedBadShape( secondaryState ) ) ||
		( hasHealthyPostMoveShape( secondaryState ) &&
			hasArchivedBadShape( primaryState ) )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			params?: Record< string, string >;
			path: string;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		requestUtils.rest< {
			content?: { raw?: string };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw',
			},
		} ),
	] );

	return {
		label,
		persistedContent: persistedPost.content?.raw ?? '',
		persistedTitle: persistedPost.title?.raw ?? '',
		primaryState: primaryState as NormalizedState,
		secondaryState: secondaryState as NormalizedState,
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

async function selectPullquote( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const pullquoteText = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await expect( pullquoteText ).toBeVisible();
	await pullquoteText.click();
	await editor.showBlockToolbar();
}

async function dragTopLevelPullquoteIntoGroup( page: Page, editor: Editor ) {
	await selectPullquote( page, editor );
	const dragHandle = page.locator(
		'role=toolbar[name="Block tools"i] >> role=button[name="Drag"i][include-hidden]'
	);
	const groupBlock = editor.canvas.getByRole( 'document', {
		name: 'Block: Group',
	} );
	await expect( dragHandle ).toBeVisible();
	await expect( groupBlock ).toBeVisible();
	await dragHandle.hover();
	await page.mouse.down();
	const groupBox = await groupBlock.boundingBox();
	if ( ! groupBox ) {
		throw new Error( 'Could not determine group block position.' );
	}
	await page.mouse.move(
		groupBox.x + groupBox.width * 0.5,
		groupBox.y + groupBox.height * 0.5,
		{ steps: 20 }
	);
	await page.mouse.up();
}

async function moveTopLevelPullquoteIntoGroupByKeyboard(
	page: Page,
	editor: Editor
) {
	await selectPullquote( page, editor );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Shift+]` ).catch( () => {} );
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
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		exactArchivedSplit: false,
		moveAppliedOnActor: false,
		name: scenario.name,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: PRESEEDED_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
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
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		if ( scenario.includeCollaboratorReload ) {
			await reloadEditorPage( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-collaborator-reload'
				)
			);
		}

		await dragTopLevelPullquoteIntoGroup( page, primaryEditor );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-toolbar-drag-before-wait'
			)
		);

		if (
			! hasNestedPullquoteGroup(
				result.snapshots[ result.snapshots.length - 1 ].primaryState
			)
		) {
			await moveTopLevelPullquoteIntoGroupByKeyboard( page, primaryEditor );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-keyboard-move-before-wait'
				)
			);
		}

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-wait'
		);
		result.snapshots.push( finalSnapshot );
		result.moveAppliedOnActor = hasNestedPullquoteGroup(
			finalSnapshot.primaryState
		);
		result.exactArchivedSplit = hasExactArchivedSplit(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
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
