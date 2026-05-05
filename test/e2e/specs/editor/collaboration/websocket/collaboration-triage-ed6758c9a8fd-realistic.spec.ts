import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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

type Scenario = {
	initialContent: string;
	name: string;
	run: ( args: {
		collaborationUtils: CollaborationUtilsClass;
		primaryEditor: Editor;
		primaryPage: Page;
		secondaryEditor: Editor;
		secondaryPage: Page;
	} ) => Promise< void >;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	primarySummary: string[];
	secondaryState: unknown;
	secondarySummary: string[];
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_ED6758_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const TITLE = 'rtc-save-title-marker-953235-2-0-end';
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const STEP0_PARAGRAPH = 'Seed 953235 step 0 user 0 paragraph 313416';
const STEP1_PARAGRAPH = 'Seed 953235 step 1 user 1 nested paragraph';
const STEP1_HEADING = 'Seed 953235 step 1 user 1 nested heading';
const STEP2_PARAGRAPH = 'Seed 953235 step 2 user 0 nested paragraph';
const STEP2_HEADING = 'Seed 953235 step 2 user 0 nested heading';
const STEP3_HEADING = 'Seed 953235 step 3 user 1 heading';
const STEP4_PARAGRAPH = 'Seed 953235 step 4 user 0 paragraph 955525';
const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953235-2-0-end';
const CHECKPOINT_SEARCH =
	'rtc-save-search-option-marker-953235-2-0-end';

const CHECKPOINT_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP1_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP1_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP0_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP2_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953235-2-0-end","label":"Search label rtc-save-search-option-marker-953235-2-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953235-2-0-end","showLabel":true} /-->',
].join( '\n' );

const PRE_MOVE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ STEP4_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP3_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP1_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP1_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ STEP0_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ STEP2_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ STEP2_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ CHECKPOINT_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953235-2-0-end","label":"Search label rtc-save-search-option-marker-953235-2-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953235-2-0-end","showLabel":true} /-->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		name: 'checkpoint-rebuild-drag',
		initialContent: CHECKPOINT_CONTENT,
		run: async ( {
			collaborationUtils,
			primaryEditor,
			primaryPage,
			secondaryEditor,
			secondaryPage,
		} ) => {
			await secondaryPage.bringToFront();
			await insertHeadingAfterText(
				secondaryEditor,
				secondaryPage,
				LONG_PARAGRAPH,
				STEP3_HEADING
			);
			await waitForSessionReady( collaborationUtils );

			await primaryPage.bringToFront();
			await insertParagraphBeforeText(
				primaryEditor,
				primaryPage,
				LONG_PARAGRAPH,
				STEP4_PARAGRAPH
			);
			await waitForSessionReady( collaborationUtils );

			await secondaryPage.bringToFront();
			await dragParagraphIntoFirstGroup( secondaryPage, LONG_PARAGRAPH );
		},
	},
	{
		name: 'exact-pre-move-drag',
		initialContent: PRE_MOVE_CONTENT,
		run: async ( { secondaryPage } ) => {
			await secondaryPage.bringToFront();
			await dragParagraphIntoFirstGroup( secondaryPage, LONG_PARAGRAPH );
		},
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
			username: `rtced6758${ uniqueSuffix }`,
			email: `rtced6758+${ uniqueSuffix }@example.com`,
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

function summarizeBlocks( state: unknown ): string[] {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.map( ( block ) => {
		const content = String(
			block.attributes?.content ?? block.attributes?.label ?? ''
		).slice( 0, 40 );
		const childCount = block.innerBlocks?.length ?? 0;
		const base = `${ block.name.replace( /^core\//, '' ) }${ childCount ? `[${ childCount }]` : '' }`;
		return content ? `${ base}:${ content }` : base;
	} );
}

function findTopLevelHeading( state: unknown, text: string ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.find(
		( block ) =>
			block.name === 'core/heading' &&
			block.attributes?.content === text
	);
}

function findGroupContaining( state: unknown, text: string ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.find(
		( block ) =>
			block.name === 'core/group' &&
			( block.innerBlocks ?? [] ).some(
				( innerBlock ) =>
					innerBlock.name === 'core/paragraph' &&
					innerBlock.attributes?.content === text
			)
	);
}

function countTopLevelParagraphs( state: unknown, text: string ) {
	const blocks = ( state as { blocks?: NormalizedBlock[] } )?.blocks ?? [];
	return blocks.filter(
		( block ) =>
			block.name === 'core/paragraph' &&
			block.attributes?.content === text
	).length;
}

function headingContainsParagraph( block: NormalizedBlock | undefined, text: string ) {
	return ( block?.innerBlocks ?? [] ).some(
		( innerBlock ) =>
			innerBlock.name === 'core/paragraph' &&
			innerBlock.attributes?.content === text
	);
}

function stateLooksCorrupted( state: unknown ) {
	const heading = findTopLevelHeading( state, STEP3_HEADING );
	return (
		countTopLevelParagraphs( state, LONG_PARAGRAPH ) > 0 &&
		headingContainsParagraph( heading, LONG_PARAGRAPH ) &&
		headingContainsParagraph( heading, STEP1_PARAGRAPH )
	);
}

function stateLooksExpected( state: unknown ) {
	const heading = findTopLevelHeading( state, STEP3_HEADING );
	const group = findGroupContaining( state, STEP1_PARAGRAPH );
	return (
		countTopLevelParagraphs( state, LONG_PARAGRAPH ) === 0 &&
		( heading?.innerBlocks?.length ?? 0 ) === 0 &&
		( group?.innerBlocks ?? [] ).some(
			( innerBlock ) =>
				innerBlock.name === 'core/paragraph' &&
				innerBlock.attributes?.content === LONG_PARAGRAPH
		)
	);
}

function reproducedFailureShape( primaryState: unknown, secondaryState: unknown ) {
	return (
		( stateLooksCorrupted( primaryState ) &&
			stateLooksExpected( secondaryState ) ) ||
		( stateLooksCorrupted( secondaryState ) &&
			stateLooksExpected( primaryState ) )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	try {
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	} catch {
		await Promise.all(
			collaborationUtils.allPages.map( ( page ) =>
				expect(
					page.getByRole( 'button', {
						name: /Collaborators list, 2 online/,
					} )
				).toBeVisible( { timeout: 5000 } )
			)
		);
	}
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
		primarySummary: summarizeBlocks( primaryState ),
		secondaryState,
		secondarySummary: summarizeBlocks( secondaryState ),
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

async function insertHeadingAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	headingText: string
) {
	await clickCanvasText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await clickMenuItem( page, [ 'Add after', 'Insert after' ] );
	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function insertParagraphBeforeText(
	editor: Editor,
	page: Page,
	anchorText: string,
	paragraphText: string
) {
	await clickCanvasText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	await clickMenuItem( page, [ 'Add before', 'Insert before' ] );
	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function dragParagraphIntoFirstGroup( page: Page, paragraphText: string ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const paragraphRows = overview.getByRole( 'gridcell', { name: 'Paragraph' } );
	const paragraphRowByText = cells.filter( { hasText: paragraphText } ).first();
	const paragraphRow =
		( await paragraphRowByText.count() ) > 0
			? paragraphRowByText
			: paragraphRows.nth( 1 );
	const groupRow = cells.filter( { hasText: 'Group' } ).first();

	await expect( paragraphRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await paragraphRow.dragTo( groupRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	adminEditor,
	adminPage,
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
	adminEditor: Editor;
	adminPage: Page;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: scenario.initialContent,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: secondaryEditor, page: secondaryPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await scenario.run( {
			collaborationUtils,
			primaryEditor: adminEditor,
			primaryPage: adminPage,
			secondaryEditor,
			secondaryPage,
		} );

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-actions' )
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-wait' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = reproducedFailureShape(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe( 'RTC triage ed6758c9a8fd realistic repro search', () => {
	test.describe.configure( { mode: 'serial' } );

	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const result = await runScenario( {
				adminEditor: editor,
				adminPage: page,
				collaborationUtils,
				collaboratorUser,
				requestUtils,
				scenario,
			} );
			expect( result.postId ).toBeDefined();
		} );
	}
} );
