import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
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

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type AttemptResult = {
	attempt: number;
	error?: string;
	finalPrimaryParagraphs?: string[];
	finalSecondaryParagraphs?: string[];
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_4492F7048C22_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_4492F7048C22_ATTEMPTS ?? '2',
	10
);
const INITIAL_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953888 step 0 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953888 step 0 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953888 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953888 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const EXPECTED_FINAL_PARAGRAPHS = [
	'Seed 953888 keeps a second paragraph for deletes and moves.',
	'Shared editing target paragraph.',
	'Seed 953888 baseline paragraph.',
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
			username: `rtc4492${ uniqueSuffix }`,
			email: `rtc4492+${ uniqueSuffix }@example.com`,
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
		path.join( OUTPUT_DIR, `move-baseline-down-twice-attempt-${ result.attempt }.json` ),
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
			collaborationUtils.allPages[ 0 ],
			{
				includeCrdtDocument: true,
			}
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
	] );

	return {
		label,
		primaryState,
		secondaryState,
	};
}

function getTopLevelParagraphs( state: unknown ): string[] {
	const blocks = ( state as { blocks?: Array< { name?: string; attributes?: { content?: string } } > } )
		.blocks;

	if ( ! Array.isArray( blocks ) ) {
		return [];
	}

	return blocks
		.filter( ( block ) => block?.name === 'core/paragraph' )
		.map( ( block ) => block.attributes?.content ?? '' );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function moveSelectedBlockDownTwice( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await moveDownButton.click();
	await moveDownButton.click();
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		snapshots: [],
	};
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 4492 realistic attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickBlockByText(
			collaborationUtils.editor,
			collaborationUtils.primaryPage,
			'Seed 953888 baseline paragraph.'
		);
		await moveSelectedBlockDownTwice(
			collaborationUtils.primaryPage,
			collaborationUtils.editor
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.reproduced = true;
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-failed-convergence' )
			);
			return result;
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			'after-move'
		);
		result.snapshots.push( finalSnapshot );
		result.finalPrimaryParagraphs = getTopLevelParagraphs(
			finalSnapshot.primaryState
		);
		result.finalSecondaryParagraphs = getTopLevelParagraphs(
			finalSnapshot.secondaryState
		);

		if (
			JSON.stringify( result.finalPrimaryParagraphs ) !==
				JSON.stringify( EXPECTED_FINAL_PARAGRAPHS ) ||
			JSON.stringify( result.finalSecondaryParagraphs ) !==
				JSON.stringify( EXPECTED_FINAL_PARAGRAPHS )
		) {
			result.reproduced = true;
		}

		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			result.snapshots.push(
				await captureSnapshot( collaborationUtils, 'after-error' )
			);
		} catch {}
		return result;
	} finally {
		writeAttemptResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
	test( `move-baseline-down-twice attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} );

		expect( result.error ).toBeUndefined();
	} );
}
