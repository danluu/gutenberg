import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
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
	primaryState: any;
	secondaryState: any;
};

type ScenarioResult = {
	actionError?: string;
	convergenceError?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
	symptoms?: {
		duplicateTailParagraphOnEitherPage: boolean;
		missingFollowUpHeadingOnEitherPage: boolean;
		primaryBlocks: string[];
		secondaryBlocks: string[];
	};
};

const OUTPUT_DIR =
	process.env.RTC_2F1615_OUTPUT_DIR ||
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-18-20260504T170250Z/.triage-watcher/signatures/2f1615fef9d1/repros/output/realistic';
const TITLE = 'RTC 2f1615 realistic move repro';
const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const FOLLOW_UP_HEADING = 'Follow-up heading';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const PRE_FINAL_MOVE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ FOLLOW_UP_HEADING }</h2>`,
	'<!-- /wp:heading -->',
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
			username: `rtc2f1615${ uniqueSuffix }`,
			email: `rtc2f1615+${ uniqueSuffix }@example.com`,
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

function flattenBlockSummary( state: any ): string[] {
	return ( state?.blocks ?? [] ).map(
		( block: any ) =>
			`${ block?.name ?? 'unknown' }:${ block?.attributes?.content ?? '' }`
	);
}

function countTopLevelParagraphs( state: any, text: string ) {
	return ( state?.blocks ?? [] ).filter(
		( block: any ) =>
			block?.name === 'core/paragraph' &&
			block?.attributes?.content === text
	).length;
}

function hasTopLevelHeading( state: any, text: string ) {
	return ( state?.blocks ?? [] ).some(
		( block: any ) =>
			block?.name === 'core/heading' &&
			block?.attributes?.content === text
	);
}

function evaluateOutcome( primaryState: any, secondaryState: any ) {
	const duplicateTailParagraphOnEitherPage =
		countTopLevelParagraphs( primaryState, TAIL_PARAGRAPH ) > 1 ||
		countTopLevelParagraphs( secondaryState, TAIL_PARAGRAPH ) > 1;
	const missingFollowUpHeadingOnEitherPage =
		! hasTopLevelHeading( primaryState, FOLLOW_UP_HEADING ) ||
		! hasTopLevelHeading( secondaryState, FOLLOW_UP_HEADING );
	return {
		reproduced:
			duplicateTailParagraphOnEitherPage &&
			missingFollowUpHeadingOnEitherPage,
		symptoms: {
			duplicateTailParagraphOnEitherPage,
			missingFollowUpHeadingOnEitherPage,
			primaryBlocks: flattenBlockSummary( primaryState ),
			secondaryBlocks: flattenBlockSummary( secondaryState ),
		},
	};
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

async function moveBlockInListViewByIndex(
	page: Page,
	sourceIndex: number,
	targetIndex: number
) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const rows = overview
		.getByRole( 'treegrid', { name: 'Block navigation structure' } )
		.getByRole( 'row' );
	const sourceRow = rows.nth( sourceIndex );
	const targetRow = rows.nth( targetIndex );
	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

function runScenario(
	name: string,
	content: string,
	performMoves: (
		collaborationUtils: CollaborationUtilsClass
	) => Promise< void >
) {
	test( name, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result: ScenarioResult = {
			name,
			reproduced: false,
			snapshots: [],
		};

		const post = await requestUtils.createPost( {
			content,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TITLE,
		} );
		result.postId = post.id;

		try {
			await collaborationUtils.openPost( post.id );
			await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'before-actions' )
			);

			try {
				await performMoves( collaborationUtils );
			} catch ( error ) {
				result.actionError = formatError( error );
				throw error;
			}

			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					'after-actions-before-final-check'
				)
			);

			try {
				await collaborationUtils.waitForConvergence( { timeout: 20000 } );
			} catch ( error ) {
				result.convergenceError = formatError( error );
			}

			const finalSnapshot = await captureSnapshot(
				collaborationUtils,
				'after-final-check'
			);
			result.snapshots.push( finalSnapshot );
			Object.assign(
				result,
				evaluateOutcome(
					finalSnapshot.primaryState,
					finalSnapshot.secondaryState
				)
			);
			writeScenarioResult( result );

			if ( result.reproduced ) {
				throw new Error(
					'Synthetic 2f1615 symptom reproduced with real editor actions.'
				);
			}
		} catch ( error ) {
			if ( result.snapshots.length === 0 ) {
				try {
					result.snapshots.push(
						await captureSnapshot( collaborationUtils, 'failure-snapshot' )
					);
				} catch {}
			}
			writeScenarioResult( result );
			throw error;
		}
	} );
}

runScenario(
	'two-step-listview-tail-then-heading',
	INITIAL_CONTENT,
	async ( collaborationUtils ) => {
		const collaboratorPage = collaborationUtils.getPage( 0 );
		const primaryPage = collaborationUtils.allPages[ 0 ];
		await moveBlockInListViewByIndex( collaboratorPage, 2, 0 );
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		await moveBlockInListViewByIndex( primaryPage, 2, 1 );
	}
);

runScenario(
	'final-move-only-listview-heading-before-long',
	PRE_FINAL_MOVE_CONTENT,
	async ( collaborationUtils ) => {
		await moveBlockInListViewByIndex( collaborationUtils.allPages[ 0 ], 2, 1 );
	}
);
