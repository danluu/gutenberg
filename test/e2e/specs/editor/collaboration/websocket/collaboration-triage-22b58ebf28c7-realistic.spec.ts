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

type Scenario = {
	deleteMethod: 'overview-backspace' | 'toolbar';
	id: string;
};

type Snapshot = {
	label: string;
	persistedContentLength: number;
	primarySummary: string[];
	secondarySummary: string[];
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenarioId: string;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_22B58_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt( process.env.RTC_22B58_ATTEMPTS ?? '2', 10 );
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		deleteMethod: 'overview-backspace',
		id: 'basic-group-overview-delete',
	},
	{
		deleteMethod: 'toolbar',
		id: 'basic-group-toolbar-delete',
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
			username: `rtc22b58${ uniqueSuffix }`,
			email: `rtc22b58+${ uniqueSuffix }@example.com`,
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

test.describe.configure( { mode: 'serial' } );
test.use( { trace: 'on' } );

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenarioId }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function summarizeState( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		const name = String( block?.name ?? 'unknown' ).replace( /^core\//, '' );
		const childCount = block?.innerBlocks?.length ?? 0;
		return childCount > 0 ? `${ name }[${ childCount }]` : name;
	} );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', { name: 'Block Inserter', exact: true } )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function insertGroupAtEnd(
	editor: Editor,
	page: Page,
	paragraphText: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function selectLastGroupInOverview( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const groupRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: 'Group' } )
		.last();
	await expect( groupRow ).toBeVisible();
	await groupRow.click();
}

async function deleteSelectedBlockViaToolbar( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' );
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function deleteScenarioGroup(
	editor: Editor,
	page: Page,
	deleteMethod: Scenario['deleteMethod']
) {
	await page.bringToFront();
	await selectLastGroupInOverview( page );
	if ( deleteMethod === 'overview-backspace' ) {
		await page.keyboard.press( 'Backspace' );
		return;
	}
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	await deleteSelectedBlockViaToolbar( page, editor );
}

async function getPersistedContentLength( requestUtils: any, postId: number ) {
	const post = await requestUtils.rest( {
		method: 'GET',
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );
	return String( post?.content?.raw ?? '' ).length;
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: any,
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedContentLength ] =
		await Promise.all( [
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.allPages[ 0 ]
			),
			collaborationUtils.getNormalizedPostState(
				collaborationUtils.getPage( 0 )
			),
			getPersistedContentLength( requestUtils, postId ),
		] );

	return {
		label,
		persistedContentLength,
		primarySummary: summarizeState( primaryState ),
		secondarySummary: summarizeState( secondaryState ),
	};
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
	scenario,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ scenario.id } initial title`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await collaboratorPage.bringToFront();
		await insertGroupAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`${ scenario.id } paragraph`
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-insert'
			)
		);

		await deleteScenarioGroup( editor, page, scenario.deleteMethod );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-delete'
			)
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				result.convergenceError
					? 'after-failed-convergence'
					: 'after-convergence'
			)
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced =
			!! result.convergenceError ||
			JSON.stringify( finalSnapshot.primarySummary ) !==
				JSON.stringify( finalSnapshot.secondarySummary );
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	}
}

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.id } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );
			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );
			writeAttemptResult( result );
			expect( true ).toBe( true );
		} );
	}
}
