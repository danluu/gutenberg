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

type ScenarioName = 'preseeded-list-view-drag' | 'preseeded-canvas-drag';

type Snapshot = {
	label: string;
	primaryState: any;
	secondaryState: any;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	moveAppliedOnActor: boolean;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/74369be1e6ba/realistic-results';
const TITLE = 'rtc-save-title-marker-953306-4-0-end';
const MOVED_PARAGRAPH = 'Seed 953306 step 5 user 1 paragraph 453620';
const SEARCH_MARKER = 'rtc-save-search-option-marker-953306-4-0-end';

const PRESEEDED_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953306 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953306 step 2 user 0 paragraph 50461</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953306 step 0 user 1</td><td>initial row 1 B seed 953306 step 0 user 1</td></tr><tr><td>initial row 2 A seed 953306 step 0 user 1</td><td>initial row 2 B seed 953306 step 0 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
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
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><!-- wp:paragraph -->',
	'<p>Quoted content for merge and persistence checks.</p>',
	'<!-- /wp:paragraph --><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953306-4-0-end</p>',
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH_MARKER }","label":"Search label ${ SEARCH_MARKER }","placeholder":"Search placeholder ${ SEARCH_MARKER }","showLabel":true} /-->`,
].join( '\n' );

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		await requestUtils.activateTheme( 'twentytwentyone' );
		await requestUtils.deactivatePlugin(
			'gutenberg-test-plugin-disables-the-css-animations'
		);
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-rtc-websocket-provider'
		);

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
			username: `rtc74369ui${ uniqueSuffix }`,
			email: `rtc74369ui+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'UI',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeScenarioResult( result: ScenarioResult ) {
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

function findTopLevelBlock( state: any, name: string, marker?: string ) {
	return ( state?.blocks ?? [] ).find( ( block: any ) => {
		if ( block?.name !== name ) {
			return false;
		}
		if ( ! marker ) {
			return true;
		}
		return JSON.stringify( block ).includes( marker );
	} );
}

function hasMovedParagraphNestedInGroup( state: any ) {
	const group = findTopLevelBlock( state, 'core/group' );
	if ( ! group ) {
		return false;
	}
	const inner = ( group.innerBlocks ?? [] ).map( ( block: any ) => ( {
		name: block?.name,
		content: block?.attributes?.content ?? null,
	} ) );
	return JSON.stringify( inner ) === JSON.stringify( [
		{ name: 'core/paragraph', content: MOVED_PARAGRAPH },
		{ name: 'core/paragraph', content: 'Nested group paragraph alpha.' },
		{ name: 'core/paragraph', content: 'Nested group paragraph beta.' },
	] );
}

function hasStaleTopLevelParagraph( state: any ) {
	const topLevelParagraph = ( state?.blocks ?? [] ).find(
		( block: any ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === MOVED_PARAGRAPH
	);
	const group = findTopLevelBlock( state, 'core/group' );
	return (
		!! topLevelParagraph &&
		JSON.stringify( ( group?.innerBlocks ?? [] ).map( ( block: any ) => ( {
			name: block?.name,
			content: block?.attributes?.content ?? null,
		} ) ) ) ===
			JSON.stringify( [
				{
					name: 'core/paragraph',
					content: 'Nested group paragraph alpha.',
				},
				{
					name: 'core/paragraph',
					content: 'Nested group paragraph beta.',
				},
			] )
	);
}

function reproducedFromStates( primaryState: any, secondaryState: any ) {
	return (
		( hasMovedParagraphNestedInGroup( primaryState ) &&
			hasStaleTopLevelParagraph( secondaryState ) ) ||
		( hasMovedParagraphNestedInGroup( secondaryState ) &&
			hasStaleTopLevelParagraph( primaryState ) )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );
	return { label, primaryState, secondaryState };
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function selectMovedParagraph( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText( MOVED_PARAGRAPH, { exact: false } ),
		} )
		.first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	return paragraph;
}

async function moveByListViewDrag( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const cells = overview.getByRole( 'gridcell' );
	const paragraphRows = overview.getByRole( 'gridcell', {
		name: 'Paragraph',
	} );
	const paragraphRowByText = cells.filter( {
		hasText: MOVED_PARAGRAPH,
	} ).first();
	const paragraphRow =
		( await paragraphRowByText.count() ) > 0
			? paragraphRowByText
			: paragraphRows.nth( 1 );
	const groupRow = cells.filter( {
		hasText: 'Group',
	} ).first();
	await expect( paragraphRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	const groupBox = await groupRow.boundingBox();
	await paragraphRow.dragTo( groupRow, {
		targetPosition: {
			x: Math.max( 8, ( groupBox?.width ?? 80 ) - 10 ),
			y: Math.max( 8, ( groupBox?.height ?? 24 ) - 3 ),
		},
	} );
}

async function moveByCanvasDrag( page: Page, editor: Editor ) {
	const paragraph = await selectMovedParagraph( page, editor );
	const target = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( {
			has: editor.canvas.getByText(
				'Nested group paragraph alpha.',
				{ exact: false }
			),
		} )
		.first();
	await expect( target ).toBeVisible();
	const startBox = await paragraph.boundingBox();
	const targetBox = await target.boundingBox();
	if ( ! startBox || ! targetBox ) {
		throw new Error( 'Missing drag bounding box' );
	}
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2
	);
	await page.mouse.down();
	await page.mouse.move(
		targetBox.x + targetBox.width / 2,
		targetBox.y + targetBox.height / 2,
		{ steps: 20 }
	);
	await page.mouse.up();
}

async function runScenario(
	name: ScenarioName,
	applyMove: (
		page: Page,
		editor: Editor
	) => Promise< void >,
	{
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	}: {
		collaborationUtils: CollaborationUtilsClass;
		collaboratorUser: UserCredentials;
		requestUtils: any;
	}
) {
	const result: ScenarioResult = {
		moveAppliedOnActor: false,
		name,
		reproduced: false,
		snapshots: [],
	};
	writeScenarioResult( result );

	try {
		const post = await requestUtils.createPost( {
			title: TITLE,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: PRESEEDED_CONTENT,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'before-move' )
		);

		const actorPage = collaborationUtils.allPages[ 0 ];
		const actorEditor = collaborationUtils.allEditors[ 0 ];
		await applyMove( actorPage, actorEditor );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-ui-action' )
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-convergence-check'
		);
		result.snapshots.push( finalSnapshot );
		result.moveAppliedOnActor = hasMovedParagraphNestedInGroup(
			finalSnapshot.primaryState
		);
		result.reproduced = reproducedFromStates(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);

		writeScenarioResult( result );
	} catch ( error ) {
		result.error = formatError( error );
		writeScenarioResult( result );
		throw error;
	}
}

test.describe.configure( { mode: 'serial' } );

test( 'preseeded list-view drag', async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
} ) => {
	await runScenario( 'preseeded-list-view-drag', moveByListViewDrag, {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} );
} );

test( 'preseeded canvas drag', async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
} ) => {
	await runScenario( 'preseeded-canvas-drag', moveByCanvasDrag, {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} );
} );
