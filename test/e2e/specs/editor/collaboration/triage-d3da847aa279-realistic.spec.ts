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
	label: string;
	primaryState: unknown;
	primarySummary: string[];
	secondaryState: unknown;
	secondarySummary: string[];
};

type Scenario = {
	actionPage: 'primary' | 'secondary';
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	operationObserved?: 'reordered' | 'nested' | 'other';
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const RESULT_DIR = process.env.RTC_D3DA847_RESULTS_DIR;
const TITLE = 'RTC seed 953372 initial title';
const STEP0_PARAGRAPH = 'Seed 953372 step 0 user 1 paragraph 616610';
const BASELINE_PARAGRAPH = 'Seed 953372 baseline paragraph.';
const SECOND_PARAGRAPH =
	'Seed 953372 keeps a second paragraph for deletes and moves.';
const SHARED_PARAGRAPH = 'Shared editing target paragraph.';
const NESTED_PARAGRAPH = 'Seed 953372 step 1 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 953372 step 1 user 1 nested heading';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ STEP0_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ BASELINE_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ SECOND_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
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
	'',
	'<!-- wp:paragraph -->',
	`<p>${ SHARED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		actionPage: 'primary',
		name: 'primary-drag-baseline-onto-group',
	},
	{
		actionPage: 'secondary',
		name: 'secondary-drag-baseline-onto-group',
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
			username: `rtcd3da${ uniqueSuffix }`,
			email: `rtcd3da+${ uniqueSuffix }@example.com`,
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

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		const name = String( block?.name ?? 'unknown' ).replace( /^core\//, '' );
		const content =
			typeof block?.attributes?.content === 'string'
				? `:${ block.attributes.content }`
				: '';
		const childCount = block?.innerBlocks?.length ?? 0;
		return childCount > 0
			? `${ name }${ content }[${ childCount }]`
			: `${ name }${ content }`;
	} );
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function writeScenarioResult( result: ScenarioResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
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
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		primarySummary: summarizeState( primaryState ),
		secondaryState,
		secondarySummary: summarizeState( secondaryState ),
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

async function dragParagraphIntoFirstGroup(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const paragraphRowByText = cells.filter( { hasText: paragraphText } ).first();
	const paragraphRows = overview.getByRole( 'gridcell', { name: 'Paragraph' } );
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

function hasTopLevelParagraph(
	state: any,
	content: string
) {
	return ( state?.blocks ?? [] ).some(
		( block: any ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === content
	);
}

function firstGroupChildren( state: any ): string[] {
	const group = ( state?.blocks ?? [] ).find(
		( block: any ) => block?.name === 'core/group'
	);
	return ( group?.innerBlocks ?? [] )
		.filter( ( block: any ) => block?.name === 'core/paragraph' )
		.map( ( block: any ) => String( block?.attributes?.content ?? '' ) );
}

function detectObservedOperation( snapshot: Snapshot ) {
	const primaryNested = firstGroupChildren( snapshot.primaryState );
	const secondaryNested = firstGroupChildren( snapshot.secondaryState );
	const bothNestedBaseline =
		primaryNested.includes( BASELINE_PARAGRAPH ) &&
		secondaryNested.includes( BASELINE_PARAGRAPH );
	const anyTopLevelBaseline =
		hasTopLevelParagraph( snapshot.primaryState, BASELINE_PARAGRAPH ) ||
		hasTopLevelParagraph( snapshot.secondaryState, BASELINE_PARAGRAPH );

	if ( bothNestedBaseline && anyTopLevelBaseline ) {
		return 'other';
	}
	if ( bothNestedBaseline ) {
		return 'nested';
	}
	return 'reordered';
}

function matchesArchivedDivergence( snapshot: Snapshot ) {
	const primaryTopLevelBaseline = hasTopLevelParagraph(
		snapshot.primaryState,
		BASELINE_PARAGRAPH
	);
	const secondaryTopLevelBaseline = hasTopLevelParagraph(
		snapshot.secondaryState,
		BASELINE_PARAGRAPH
	);
	const primaryTopLevelSecond = hasTopLevelParagraph(
		snapshot.primaryState,
		SECOND_PARAGRAPH
	);
	const secondaryTopLevelSecond = hasTopLevelParagraph(
		snapshot.secondaryState,
		SECOND_PARAGRAPH
	);
	const primaryNested = firstGroupChildren( snapshot.primaryState );
	const secondaryNested = firstGroupChildren( snapshot.secondaryState );

	return (
		primaryNested.includes( BASELINE_PARAGRAPH ) &&
		secondaryNested.includes( BASELINE_PARAGRAPH ) &&
		( ( primaryTopLevelSecond &&
			! primaryTopLevelBaseline &&
			secondaryTopLevelBaseline &&
			! secondaryTopLevelSecond ) ||
			( secondaryTopLevelSecond &&
				! secondaryTopLevelBaseline &&
				primaryTopLevelBaseline &&
				! primaryTopLevelSecond ) )
	);
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
	scenario,
}: {
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
			content: INITIAL_CONTENT,
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

		const primaryEditor = collaborationUtils.editor;
		const primaryPage = collaborationUtils.primaryPage;
		const actionEditor =
			scenario.actionPage === 'primary' ? primaryEditor : secondaryEditor;
		const actionPage =
			scenario.actionPage === 'primary' ? primaryPage : secondaryPage;

		await dragParagraphIntoFirstGroup(
			actionPage,
			actionEditor,
			BASELINE_PARAGRAPH
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-drag'
		);
		result.operationObserved = detectObservedOperation( finalSnapshot );
		result.reproduced = matchesArchivedDivergence( finalSnapshot );
		result.snapshots.push( finalSnapshot );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	return result;
}

test.describe( 'd3da847aa279 realistic search', () => {
	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} ) => {
			const result = await runScenario( {
				collaborationUtils,
				collaboratorUser,
				requestUtils: requestUtils as any,
				scenario,
			} );

			expect( result.error ).toBeUndefined();
			expect( result.reproduced ).toBe( false );
		} );
	}
} );
