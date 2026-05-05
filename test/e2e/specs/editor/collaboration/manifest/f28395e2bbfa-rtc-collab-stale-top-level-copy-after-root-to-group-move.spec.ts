import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
	type Editor,
	type RequestUtils,
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

type Result = {
	convergenceError?: string;
	error?: string;
	postId?: number;
	primaryState?: NormalizedState;
	reproduced: boolean;
	secondaryState?: NormalizedState;
};

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const MOVED_HEADING = 'RTC f28395e2bbfa move-this-heading';
const NESTED_PARAGRAPH = 'RTC f28395e2bbfa group paragraph';
const NESTED_HEADING = 'RTC f28395e2bbfa group heading';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>RTC f28395e2bbfa baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC f28395e2bbfa keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>RTC f28395e2bbfa shared editing target paragraph.</p>',
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

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'none',
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
			'shared',
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -24 );

		const collaboratorUser = {
			username: `rtcf2839${ uniqueSuffix }`,
			email: `rtcf2839+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Shared',
			password: 'password',
			roles: [ 'editor' ],
		};

		await requestUtils.createUser( collaboratorUser );
		await use( collaboratorUser );
	},
} );

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function writeResult( result: Result ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'result.json' ),
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

async function openDocumentOverview( page: Page ) {
	const button = page.getByRole( 'button', { name: 'Document Overview' } );
	await button.click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function dragHeadingIntoGroup(
	page: Page,
	headingText: string,
	nestedParagraphIndex: number
) {
	await page.bringToFront();
	const overview = await openDocumentOverview( page );
	const cells = overview.getByRole( 'gridcell' );
	const headingRow = cells.filter( { hasText: headingText } ).first();
	const groupRow = overview.getByRole( 'gridcell', { name: 'Group' } ).first();

	await expect( groupRow ).toBeVisible();
	await groupRow.click();
	await page.keyboard.press( 'ArrowRight' );

	const paragraphRows = overview.getByRole( 'gridcell', { name: 'Paragraph' } );
	const nestedParagraphRow = paragraphRows.nth( nestedParagraphIndex );

	await expect( headingRow ).toBeVisible();
	await expect( nestedParagraphRow ).toBeVisible();
	await headingRow.dragTo( nestedParagraphRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function captureState(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
) {
	return collaborationUtils.getNormalizedPostState( page );
}

test.describe.configure( { mode: 'serial' } );

test( 'realistic shared heading into group divergence', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result: Result = { reproduced: false };

	try {
		const post = await requestUtils.createPost( {
			title: 'RTC f28395e2bbfa realistic shared repro',
			status: 'draft',
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await dragHeadingIntoGroup( page, MOVED_HEADING, 3 );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.primaryState = await captureState(
			collaborationUtils,
			collaborationUtils.allPages[ 0 ]
		);
		result.secondaryState = await captureState(
			collaborationUtils,
			collaborationUtils.getPage( 0 )
		);
		result.reproduced = hasDuplicateNestedHeadingDivergence(
			result.primaryState,
			result.secondaryState,
			MOVED_HEADING
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeResult( result );

	expect( result.error ).toBeUndefined();
	expect( result.reproduced ).toBe( true );
} );
