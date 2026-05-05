import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	label: string;
	primaryBlocks: string[];
	secondaryBlocks: string[];
	primaryTexts: string[];
	secondaryTexts: string[];
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

type Scenario = {
	id: string;
	moveSecondStep: 'drag' | 'toolbar-twice';
};

const OUTPUT_DIR = process.env.RTC_891A5CDE299D_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_891A5CDE299D_ATTEMPTS ?? '3',
	10
);
const SHOULD_FAIL_ON_REPRO =
	process.env.RTC_891A5CDE299D_FAIL_ON_REPRO !== '0';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const HEADING = 'Follow-up heading';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const EXPECTED = [ TAIL_PARAGRAPH, HEADING, LONG_PARAGRAPH ];
const CORRUPTED = [ TAIL_PARAGRAPH, TAIL_PARAGRAPH, LONG_PARAGRAPH ];

const SCENARIOS: Scenario[] = [
	{
		id: 'heading-move-down_then-long-drag-to-bottom',
		moveSecondStep: 'drag',
	},
	{
		id: 'heading-move-down_then-long-toolbar-twice',
		moveSecondStep: 'toolbar-twice',
	},
];

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
			username: `rtc891a${ uniqueSuffix }`,
			email: `rtc891a+${ uniqueSuffix }@example.com`,
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

function summarizeBlocks( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => block?.name ?? 'unknown' );
}

function summarizeTexts( state: any ): string[] {
	return ( state?.blocks ?? [] ).map(
		( block: any ) => block?.attributes?.content ?? ''
	);
}

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

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
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
		primaryBlocks: summarizeBlocks( primaryState ),
		secondaryBlocks: summarizeBlocks( secondaryState ),
		primaryTexts: summarizeTexts( primaryState ),
		secondaryTexts: summarizeTexts( secondaryState ),
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

async function selectBlockByText( editor: Editor, page: Page, text: string ) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const block = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
}

async function clickMoveDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( moveDownButton ).toBeVisible();
	await expect( moveDownButton ).toBeEnabled();
	await moveDownButton.click();
}

async function moveHeadingDownOnce( page: Page, editor: Editor ) {
	await selectBlockByText( editor, page, HEADING );
	await clickMoveDown( page, editor );
}

async function moveLongParagraphDownTwice( page: Page, editor: Editor ) {
	await selectBlockByText( editor, page, LONG_PARAGRAPH );
	await clickMoveDown( page, editor );
	await clickMoveDown( page, editor );
}

async function dragLongParagraphToBottom( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const cellTexts = await cells.allTextContents();
	const longParagraphIndex = cellTexts.findIndex( ( text ) =>
		text.includes( LONG_PARAGRAPH.slice( 0, 32 ) )
	);
	const headingIndex = cellTexts.findIndex( ( text ) => text.includes( HEADING ) );

	if ( longParagraphIndex === -1 || headingIndex === -1 ) {
		throw new Error(
			`Could not find list view rows. Cells: ${ JSON.stringify( cellTexts ) }`
		);
	}

	const longParagraphCell = cells.nth( longParagraphIndex );
	const headingCell = cells.nth( headingIndex );

	await expect( longParagraphCell ).toBeVisible();
	await expect( headingCell ).toBeVisible();
	await longParagraphCell.dragTo( headingCell );
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

function isExpectedSplit( snapshot: Snapshot ) {
	const pairs = [
		[ snapshot.primaryTexts, snapshot.secondaryTexts ],
		[ snapshot.secondaryTexts, snapshot.primaryTexts ],
	];

	return pairs.some(
		( [ left, right ] ) =>
			JSON.stringify( left ) === JSON.stringify( EXPECTED ) &&
			JSON.stringify( right ) === JSON.stringify( CORRUPTED )
	);
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
} ) {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		scenarioId: scenario.id,
		snapshots: [],
	};

	let postId: number | undefined;

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			status: 'draft',
			title: `RTC 891a5cde299d realistic repro ${ scenario.id } ${ attempt }`,
		} );
		postId = post.id;
		result.postId = postId;

		await collaborationUtils.openPost( postId );
		await collaborationUtils.joinUser( postId, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		const secondaryPage = collaborationUtils.getPage( 0 );
		const secondaryEditor = collaborationUtils.editor2;

		await moveHeadingDownOnce( secondaryPage, secondaryEditor );
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-heading-move' )
		);

		if ( scenario.moveSecondStep === 'drag' ) {
			await dragLongParagraphToBottom( page );
		} else {
			await moveLongParagraphDownTwice( page, editor );
		}

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.message : String( error );
		}
		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-long-move'
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced =
			!! result.convergenceError && isExpectedSplit( finalSnapshot );
	} catch ( error ) {
		result.error = error instanceof Error ? error.message : String( error );
	} finally {
		writeAttemptResult( result );
		if ( postId ) {
			try {
				await requestUtils.deletePost( postId );
			} catch {}
		}
	}

	if ( result.error ) {
		throw new Error( result.error );
	}

	if ( result.reproduced && SHOULD_FAIL_ON_REPRO ) {
		throw new Error(
			`Reproduced archived split for ${ scenario.id } attempt ${ attempt }`
		);
	}
}

for ( const scenario of SCENARIOS ) {
	test.describe( scenario.id, () => {
		for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
			test( `attempt ${ attempt }`, async ( {
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} ) => {
				await runAttempt( {
					attempt,
					collaborationUtils,
					collaboratorUser,
					editor,
					page,
					requestUtils,
					scenario,
				} );
			} );
		}
	} );
}
