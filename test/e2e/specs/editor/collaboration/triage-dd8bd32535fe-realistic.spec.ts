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
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks?: NormalizedBlock[];
	title?: string;
};

type Snapshot = {
	label: string;
	primaryState: NormalizedState;
	secondaryState: NormalizedState;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_DD8BD_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TITLE = 'RTC seed 953576 initial title';
const MOVED_HEADING = 'Seed 953576 step 0 user 1 heading';
const NESTED_PARAGRAPH = 'Seed 953576 step 1 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 953576 step 1 user 1 nested heading';
const RELOAD_TITLE = 'rtc-save-title-marker-953906-5-1-end';
const RELOAD_GROUP_PARAGRAPH = 'Nested group paragraph alpha.';
const RELOAD_INSERTED_HEADING = 'Seed 953906 step 6 user 0 heading';
const RELOAD_ANCHOR_TEXT =
	'Search label rtc-save-search-option-marker-953906-5-1-end';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953576 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953576 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ MOVED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );

const RELOAD_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
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
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 953906 step 0 user 1 heading</h4>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item one for block movement.</li>',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953906 step 4 user 1 concurrent paragraph 998930</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 953906 step 4 user 0 concurrent paragraph 212486</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953906-5-1-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953906-5-1-end","label":"Search label rtc-save-search-option-marker-953906-5-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-953906-5-1-end"} /-->',
].join( '\n' );

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
			username: `rtcdd8bd${ uniqueSuffix }`,
			email: `rtcdd8bd+${ uniqueSuffix }@example.com`,
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

function getTopLevelHeadingContents( state: NormalizedState ) {
	return ( state.blocks ?? [] )
		.filter( ( block ) => block.name === 'core/heading' )
		.map( ( block ) => String( block.attributes?.content ?? '' ) );
}

function getGroupHeadingContents( state: NormalizedState ) {
	return ( state.blocks ?? [] )
		.filter( ( block ) => block.name === 'core/group' )
		.flatMap( ( block ) => block.innerBlocks ?? [] )
		.filter( ( block ) => block.name === 'core/heading' )
		.map( ( block ) => String( block.attributes?.content ?? '' ) );
}

function hasDuplicateNestedHeadingDivergence(
	primaryState: NormalizedState,
	secondaryState: NormalizedState,
	targetHeading: string
) {
	const primaryTopLevelHeadings = getTopLevelHeadingContents( primaryState );
	const secondaryTopLevelHeadings = getTopLevelHeadingContents(
		secondaryState
	);
	const primaryGroupHeadings = getGroupHeadingContents( primaryState );
	const secondaryGroupHeadings = getGroupHeadingContents( secondaryState );

	return (
		primaryGroupHeadings.includes( targetHeading ) &&
		secondaryGroupHeadings.includes( targetHeading ) &&
		primaryTopLevelHeadings.includes( targetHeading ) !==
			secondaryTopLevelHeadings.includes( targetHeading )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const primaryState = await collaborationUtils.getNormalizedPostState(
		collaborationUtils.primaryPage
	);
	const secondaryPage = collaborationUtils.getPage( 0 );
	const secondaryState = await collaborationUtils.getNormalizedPostState(
		secondaryPage
	);

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

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function clickMenuItem( page: Page, names: string[] ) {
	for ( const name of names ) {
		const item = page.getByRole( 'menuitem', { name } );
		if ( await item.isVisible().catch( () => false ) ) {
			await item.click();
			return;
		}
	}

	throw new Error( `None of the menu items were visible: ${ names.join( ', ' ) }` );
}

async function insertHeadingBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( anchorText, { exact: false } ).first().click();
	await openBlockOptions( page, editor );
	await clickMenuItem( page, [ 'Add before', 'Insert before' ] );
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+4` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function dragHeadingIntoGroup(
	page: Page,
	headingText: string,
	nestedParagraphIndex: number
) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const headingRow = cells.filter( { hasText: headingText } ).first();
	const groupRow = overview.getByRole( 'gridcell', { name: 'Group' } ).first();

	await expect( groupRow ).toBeVisible();
	await groupRow.click();
	await page.keyboard.press( 'ArrowRight' );

	const paragraphRows = overview.getByRole( 'gridcell', { name: 'Paragraph' } );
	const firstNestedRow = paragraphRows.nth( nestedParagraphIndex );

	await expect( headingRow ).toBeVisible();
	await expect( firstNestedRow ).toBeVisible();
	await headingRow.dragTo( firstNestedRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	name,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	name: string;
	page: Page;
	requestUtils: {
		createPost: ( post: {
			content: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
} ) {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			title: TITLE,
			status: 'draft',
			content: INITIAL_CONTENT,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await dragHeadingIntoGroup( page, MOVED_HEADING, 3 );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-drag' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-wait' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = hasDuplicateNestedHeadingDivergence(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState,
			MOVED_HEADING
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	expect( result.snapshots.length ).toBeGreaterThan( 0 );
}

test.describe( 'RTC dd8bd32535fe realistic repro search', () => {
	test.describe.configure( { mode: 'serial' } );

	test( 'seed-953576-prestep-drag-heading-into-group', async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			name: 'seed-953576-prestep-drag-heading-into-group',
			page,
			requestUtils,
		} );
	} );

	test( 'seed-953906-reload-then-drag-heading-into-group', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		const result: ScenarioResult = {
			name: 'seed-953906-reload-then-drag-heading-into-group',
			reproduced: false,
			snapshots: [],
		};

		try {
			const post = await requestUtils.createPost( {
				content: RELOAD_CONTENT,
				status: 'draft',
				title: RELOAD_TITLE,
			} );
			result.postId = post.id;

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'initial' )
			);

			await insertHeadingBeforeText(
				editor,
				page,
				RELOAD_ANCHOR_TEXT,
				RELOAD_INSERTED_HEADING
			);
			try {
				await collaborationUtils.waitForConvergence( { timeout: 20000 } );
			} catch ( error ) {
				result.convergenceError = formatError( error );
			}
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-insert' )
			);

			await page.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 20000,
			} );
			await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-reload' )
			);

			await dragHeadingIntoGroup(
				collaboratorPage,
				RELOAD_INSERTED_HEADING,
				0
			);
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-drag' )
			);

			try {
				await collaborationUtils.waitForConvergence( {
					timeout: 15000,
				} );
			} catch ( error ) {
				result.convergenceError = result.convergenceError
					? `${ result.convergenceError }\n\n---\n\n${ formatError( error ) }`
					: formatError( error );
			}

			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-wait' )
			);

			const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
			result.reproduced = hasDuplicateNestedHeadingDivergence(
				finalSnapshot.primaryState,
				finalSnapshot.secondaryState,
				RELOAD_INSERTED_HEADING
			);
		} catch ( error ) {
			result.error = formatError( error );
		}

		writeScenarioResult( result );
		expect( result.snapshots.length ).toBeGreaterThan( 0 );
	} );
} );
