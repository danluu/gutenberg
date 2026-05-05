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

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproduced: boolean;
	states: {
		afterMove?: any;
		initial?: any;
	};
};

const OUTPUT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/7423aed9058a/repros/results/shared-realistic';
const ATTEMPTS = Number.parseInt( process.env.RTC_7423_ATTEMPTS ?? '4', 10 );
const HEADING_TEXT = 'Seed 953617 multibyte heading';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const TAIL_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const NESTED_PARAGRAPH = 'Seed 953617 step 0 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 953617 step 0 user 1 nested heading';
const STEP0_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
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
			username: `rtc7423r${ uniqueSuffix }`,
			email: `rtc7423r+${ uniqueSuffix }@example.com`,
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
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function summarizeTopLevel( state: any ) {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/group' ) {
			return `core/group:[${ ( block?.innerBlocks ?? [] )
				.map(
					( inner: any ) =>
						`${ inner?.name }:${ inner?.attributes?.content ?? '' }`
				)
				.join( '|' ) }]`;
		}
		return `${ block?.name }:${ block?.attributes?.content ?? '' }`;
	} );
}

function matchesFailureShape( firstState: any, secondState: any ) {
	const good = [
		`core/group:[core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
		`core/paragraph:${ EMOJI_PARAGRAPH }`,
		`core/heading:${ HEADING_TEXT }`,
		`core/paragraph:${ TAIL_PARAGRAPH }`,
	];
	const corrupted = [
		`core/group:[core/paragraph:${ NESTED_PARAGRAPH }|core/heading:${ NESTED_HEADING }]`,
		`core/heading:${ HEADING_TEXT }`,
		`core/heading:${ HEADING_TEXT }`,
		`core/paragraph:${ TAIL_PARAGRAPH }`,
	];
	const [ first, second ] = [ firstState, secondState ].map( summarizeTopLevel );
	return (
		( JSON.stringify( first ) === JSON.stringify( good ) &&
			JSON.stringify( second ) === JSON.stringify( corrupted ) ) ||
		( JSON.stringify( second ) === JSON.stringify( good ) &&
			JSON.stringify( first ) === JSON.stringify( corrupted ) )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
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

async function moveSelectedBlockDown(
	page: Page,
	editor: Editor,
	count = 1
) {
	await editor.showBlockToolbar();
	const moveDownButton = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	for ( let index = 0; index < count; index++ ) {
		await moveDownButton.click();
	}
}

async function getBothStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );
	return { primaryState, secondaryState };
}

async function runAttempt( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		reproduced: false,
		states: {},
	};

	const post = await requestUtils.createPost( {
		content: STEP0_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC 7423 realistic ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.states.initial = await getBothStates( collaborationUtils );
		writeAttemptResult( result );

		await page.bringToFront();
		await clickBlockByText( editor, page, HEADING_TEXT );
		await moveSelectedBlockDown( page, editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.states.afterMove = await getBothStates( collaborationUtils );
		result.reproduced = matchesFailureShape(
			result.states.afterMove.primaryState,
			result.states.afterMove.secondaryState
		);
		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeAttemptResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

test( 'shared realistic heading move attempt loop', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} );

		if ( result.reproduced ) {
			throw new Error(
				`Reproduced realistic divergence on attempt ${ attempt }: ${ JSON.stringify(
					{
						postId: result.postId,
						primary: summarizeTopLevel(
							result.states.afterMove?.primaryState
						),
						secondary: summarizeTopLevel(
							result.states.afterMove?.secondaryState
						),
					}
				) }`
			);
		}
	}

	expect( true ).toBe( true );
} );
