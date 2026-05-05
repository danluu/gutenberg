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
	buildGroup: 'basic' | 'paragraph-and-heading';
	id: string;
	initialContent: string;
	editTableBeforeDelete: boolean;
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

const OUTPUT_DIR = process.env.RTC_929934_OUTPUT_DIR;
const ATTEMPTS = Number.parseInt(
	process.env.RTC_929934_ATTEMPTS ?? '1',
	10
);
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 956592 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 956592 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const INITIAL_CONTENT_WITH_TABLE = [
	INITIAL_CONTENT,
	'',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 956592 step 1 user 1</td><td>initial row 1 B seed 956592 step 1 user 1</td></tr><tr><td>initial row 2 A seed 956592 step 1 user 1</td><td>initial row 2 B seed 956592 step 1 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const SCENARIOS: Scenario[] = [
	{
		buildGroup: 'basic',
		editTableBeforeDelete: false,
		id: 'simple-group-toolbar-delete',
		initialContent: INITIAL_CONTENT,
	},
	{
		buildGroup: 'paragraph-and-heading',
		editTableBeforeDelete: true,
		id: 'seed-956592-shape-toolbar-delete',
		initialContent: INITIAL_CONTENT_WITH_TABLE,
	},
	{
		buildGroup: 'paragraph-and-heading',
		editTableBeforeDelete: false,
		id: 'table-present-seed-shape-toolbar-delete',
		initialContent: INITIAL_CONTENT_WITH_TABLE,
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
			username: `rtc929934${ uniqueSuffix }`,
			email: `rtc929934+${ uniqueSuffix }@example.com`,
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

async function ensureRootSelection( editor: Editor ) {
	await editor.canvas.getByRole( 'document' ).last().click();
}

async function editExistingTableCell(
	editor: Editor,
	page: Page,
	cellText: string
) {
	await page.bringToFront();
	const firstCell = editor.canvas.getByRole( 'textbox', {
		name: 'Body cell text',
	} ).first();
	await expect( firstCell ).toBeVisible();
	await firstCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( cellText, { delay: 20 } );
}

async function insertGroupAtEnd(
	editor: Editor,
	page: Page,
	buildGroup: Scenario['buildGroup'],
	scenarioId: string
) {
	await ensureRootSelection( editor );
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type(
		`${ scenarioId } nested paragraph`,
		{ delay: 20 }
	);
	if ( buildGroup === 'paragraph-and-heading' ) {
		await page.keyboard.press( 'Enter' );
		await insertBlockFromInserter( page, 'Heading' );
		await page.keyboard.type(
			`${ scenarioId } nested heading`,
			{ delay: 20 }
		);
	}
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
		content: scenario.initialContent,
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

		if ( scenario.editTableBeforeDelete ) {
			await collaboratorPage.bringToFront();
			await editExistingTableCell(
				collaboratorEditor,
				collaboratorPage,
				'initial row 1 A seed 956592 step 1 user 1 edited'
			);
			await waitForSessionReady( collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-table-edit'
				)
			);
		}

		await page.bringToFront();
		await insertGroupAtEnd(
			editor,
			page,
			scenario.buildGroup,
			scenario.id
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-group-insert'
			)
		);

		await collaboratorPage.bringToFront();
		await selectLastGroupInOverview( collaboratorPage );
		await collaboratorPage.getByRole( 'button', {
			name: 'Document Overview',
		} ).click();
		await deleteSelectedBlockViaToolbar( collaboratorPage, collaboratorEditor );
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
