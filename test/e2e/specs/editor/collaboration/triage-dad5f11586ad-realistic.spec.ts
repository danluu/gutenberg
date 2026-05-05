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
	initialContent: string;
	move: 'heading-down' | 'tail-up';
	prepare?: 'ui-insert-italic';
};

const OUTPUT_DIR = process.env.RTC_DAD5_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_DAD5_ATTEMPTS ?? '2',
	10
);
const SHOULD_FAIL_ON_REPRO = process.env.RTC_DAD5_FAIL_ON_REPRO === '1';

const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const HEADING = 'Follow-up heading';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const ITALIC_PARAGRAPH = '<em>italic</em>beta 953347 0';

const INITIAL_ORDER = [
	LONG_PARAGRAPH,
	HEADING,
	TAIL_PARAGRAPH,
	ITALIC_PARAGRAPH,
];
const MOVED_ORDER = [
	LONG_PARAGRAPH,
	TAIL_PARAGRAPH,
	HEADING,
	ITALIC_PARAGRAPH,
];

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em>beta 953347 0</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASE_3_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ LONG_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		id: 'preseeded-heading-move-down',
		initialContent: PRESEEDED_CONTENT,
		move: 'heading-down',
	},
	{
		id: 'preseeded-tail-move-up',
		initialContent: PRESEEDED_CONTENT,
		move: 'tail-up',
	},
	{
		id: 'ui-insert-italic-then-heading-move-down',
		initialContent: BASE_3_CONTENT,
		move: 'heading-down',
		prepare: 'ui-insert-italic',
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
			username: `rtcdad5${ uniqueSuffix }`,
			email: `rtcdad5+${ uniqueSuffix }@example.com`,
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
		primaryTexts: ( primaryState?.blocks ?? [] ).map(
			( block: any ) => block?.attributes?.content ?? ''
		),
		secondaryTexts: ( secondaryState?.blocks ?? [] ).map(
			( block: any ) => block?.attributes?.content ?? ''
		),
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

async function clickMoveButton(
	page: Page,
	editor: Editor,
	name: 'Move down' | 'Move up'
) {
	await editor.showBlockToolbar();
	const moveButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name } );
	await expect( moveButton ).toBeVisible();
	await expect( moveButton ).toBeEnabled();
	await moveButton.click();
}

async function performMove(
	page: Page,
	editor: Editor,
	move: Scenario['move']
) {
	if ( move === 'heading-down' ) {
		await selectBlockByText( editor, page, HEADING );
		await clickMoveButton( page, editor, 'Move down' );
		return;
	}

	await selectBlockByText( editor, page, TAIL_PARAGRAPH );
	await clickMoveButton( page, editor, 'Move up' );
}

async function insertItalicParagraphViaUi( page: Page, editor: Editor ) {
	await selectBlockByText( editor, page, TAIL_PARAGRAPH );
	await page.keyboard.press( 'Meta+ArrowRight' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'Meta+i' );
	await page.keyboard.type( 'italic' );
	await page.keyboard.press( 'Meta+i' );
	await page.keyboard.type( 'beta 953347 0' );
}

function isExpectedSplit( snapshot: Snapshot ) {
	const pairs = [
		[ snapshot.primaryTexts, snapshot.secondaryTexts ],
		[ snapshot.secondaryTexts, snapshot.primaryTexts ],
	];

	return pairs.some(
		( [ left, right ] ) =>
			JSON.stringify( left ) === JSON.stringify( MOVED_ORDER ) &&
			JSON.stringify( right ) === JSON.stringify( INITIAL_ORDER )
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
			content: scenario.initialContent,
			status: 'draft',
			title: `RTC dad5f11586ad realistic repro ${ scenario.id } ${ attempt }`,
		} );
		postId = post.id;
		result.postId = postId;

		await collaborationUtils.openPost( postId );
		await collaborationUtils.joinUser( postId, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		if ( scenario.prepare === 'ui-insert-italic' ) {
			await insertItalicParagraphViaUi( page, editor );
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-ui-insert' )
			);
		}

		await performMove( page, editor, scenario.move );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError =
				error instanceof Error ? error.message : String( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-move'
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
