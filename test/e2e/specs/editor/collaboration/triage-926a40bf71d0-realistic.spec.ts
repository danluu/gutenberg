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

type ScenarioName =
	| 'preseeded-tab-indent'
	| 'preseeded-list-view-drag'
	| 'preseeded-canvas-drag';

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

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const TITLE = 'rtc-save-title-marker-952951-3-1-end';
const MOVED_PARAGRAPH = 'Seed 952951 step 2 user 1 concurrent paragraph 750594';
const OTHER_PARAGRAPH = 'Seed 952951 step 2 user 0 concurrent paragraph 764027';
const NESTED_PARAGRAPH = 'Seed 952951 step 4 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 952951 step 4 user 1 nested heading';
const SEARCH1_MARKER = 'rtc-save-search-option-marker-952951-1-1-end';
const SEARCH2_MARKER = 'rtc-save-search-option-marker-952951-3-1-end';

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 952951 step 5 user 0 heading</h4>',
	'<!-- /wp:heading -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 952951 0</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952951 step 3 user 1 updated paragraph 409875</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 952951 step 1 user 0 concurrent paragraph 658279</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952951-1-1-end</p>',
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH1_MARKER }","label":"Search label ${ SEARCH1_MARKER }","placeholder":"Search placeholder ${ SEARCH1_MARKER }","showLabel":true} /-->`,
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ OTHER_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952951-3-1-end</p>',
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH2_MARKER }","label":"Search label ${ SEARCH2_MARKER }","placeholder":"Search placeholder ${ SEARCH2_MARKER }","showLabel":true} /-->`,
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
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
			username: `rtc926${ uniqueSuffix }`,
			email: `rtc926+${ uniqueSuffix }@example.com`,
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

function normalizeInnerSummary( block: any ) {
	return JSON.stringify(
		( block?.innerBlocks ?? [] ).map( ( inner: any ) => ( {
			name: inner?.name,
			content: inner?.attributes?.content ?? null,
		} ) )
	);
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

	return (
		normalizeInnerSummary( group ) ===
		JSON.stringify( [
			{ name: 'core/paragraph', content: MOVED_PARAGRAPH },
			{ name: 'core/paragraph', content: NESTED_PARAGRAPH },
			{ name: 'core/heading', content: NESTED_HEADING },
		] )
	);
}

function hasSearchAbsorbSymptom( state: any ) {
	const search = findTopLevelBlock( state, 'core/search', SEARCH2_MARKER );
	if ( ! search ) {
		return false;
	}

	return (
		normalizeInnerSummary( search ) ===
		JSON.stringify( [
			{ name: 'core/paragraph', content: MOVED_PARAGRAPH },
			{ name: 'core/paragraph', content: NESTED_PARAGRAPH },
			{ name: 'core/heading', content: NESTED_HEADING },
		] )
	);
}

function moveAppliedOnActorState( state: any ) {
	return (
		hasMovedParagraphNestedInGroup( state ) &&
		! ( state?.blocks ?? [] ).some(
			( block: any ) =>
				block?.name === 'core/paragraph' &&
				block?.attributes?.content === MOVED_PARAGRAPH
		)
	);
}

function reproducedFromStates( primaryState: any, secondaryState: any ) {
	return (
		( hasSearchAbsorbSymptom( primaryState ) &&
			hasMovedParagraphNestedInGroup( secondaryState ) ) ||
		( hasSearchAbsorbSymptom( secondaryState ) &&
			hasMovedParagraphNestedInGroup( primaryState ) )
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

	return {
		label,
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

async function moveByTabIndent( page: Page, editor: Editor ) {
	await selectMovedParagraph( page, editor );
	await page.keyboard.press( 'Tab' );
}

async function moveByListViewDrag( page: Page ) {
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
		throw new Error( 'Missing drag bounding box' );
	}
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2
	);
	await page.mouse.down();
	await page.mouse.move(
		targetBox.x + 32,
		targetBox.y + targetBox.height / 3,
		{ steps: 10 }
	);
	await page.mouse.up();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	move,
	name,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	move: ( page: Page, editor: Editor ) => Promise< void >;
	name: ScenarioName;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		moveAppliedOnActor: false,
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: PRESEEDED_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'before-move' )
		);

		const actorPage = collaborationUtils.getPage( 0 );
		await move( actorPage, collaborationUtils.allEditors[ 1 ] );
		await actorPage.waitForTimeout( 1000 );
		const afterAction = await captureSnapshot(
			collaborationUtils,
			'after-action'
		);
		result.snapshots.push( afterAction );
		result.moveAppliedOnActor = moveAppliedOnActorState(
			afterAction.secondaryState
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 10000 } );
			const converged = await captureSnapshot(
				collaborationUtils,
				'after-convergence'
			);
			result.snapshots.push( converged );
			result.reproduced = reproducedFromStates(
				converged.primaryState,
				converged.secondaryState
			);
		} catch ( convergenceError ) {
			result.convergenceError = formatError( convergenceError );
			const divergent = await captureSnapshot(
				collaborationUtils,
				'after-convergence-error'
			);
			result.snapshots.push( divergent );
			result.reproduced = reproducedFromStates(
				divergent.primaryState,
				divergent.secondaryState
			);
		}
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

const scenarios: Array< {
	move: ( page: Page, editor: Editor ) => Promise< void >;
	name: ScenarioName;
} > = [
	{ name: 'preseeded-tab-indent', move: moveByTabIndent },
	{ name: 'preseeded-list-view-drag', move: moveByListViewDrag },
	{ name: 'preseeded-canvas-drag', move: moveByCanvasDrag },
];

for ( const scenario of scenarios ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			move: scenario.move,
			name: scenario.name,
			requestUtils,
		} );
	} );
}
