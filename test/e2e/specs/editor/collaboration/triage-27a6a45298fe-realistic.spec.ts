import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	type Editor,
	expect,
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
	convergenceError: string | null;
	error?: string;
	finalPrimary?: string[];
	finalSecondary?: string[];
	postId?: number;
	reproduced: boolean;
};

type OutputShape = {
	attempts: AttemptResult[];
	scenario: string;
};

const OUTPUT_DIR = process.env.RTC_27A6_OUTPUT_DIR;
const SCENARIO = 'preseeded-collaborator-moves-table-down-six-slots';

const CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953052 step 3 user 0 heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953052 step 0 user 0 updated paragraph 411036</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953052 step 1 user 0</td><td>initial row 1 B seed 953052 step 1 user 0</td></tr><tr><td>initial row 2 A seed 953052 step 1 user 0</td><td>table-option-953052-2-0-1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953052 step 7 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953052 step 7 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953052 step 4 user 1 updated paragraph 987236</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953052 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-953052-1-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953052-1-0-end","buttonText":"Find rtc-save-search-option-marker-953052-1-0-end","buttonPosition":"button-inside"} /-->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953052-3-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-953052-3-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953052-3-0-end","buttonText":"Find rtc-save-search-option-marker-953052-3-0-end","buttonPosition":"button-inside"} /-->',
].join( '\n' );

const GOOD = [
	'Seed 953052 step 3 user 0 heading',
	'Seed 953052 step 0 user 0 updated paragraph 411036',
	'core/group',
	'Seed 953052 step 4 user 1 updated paragraph 987236',
	'Seed 953052 keeps a second paragraph for deletes and moves.',
	'Search label rtc-save-search-option-marker-953052-1-0-end',
	'Shared editing target paragraph.',
	'rtc-save-paragraph-marker-953052-3-0-end',
	'core/table',
	'Search label rtc-save-search-option-marker-953052-3-0-end',
];

const BAD = [
	'Seed 953052 step 3 user 0 heading',
	'Seed 953052 step 0 user 0 updated paragraph 411036',
	'core/group',
	'Seed 953052 step 4 user 1 updated paragraph 987236',
	'Seed 953052 keeps a second paragraph for deletes and moves.',
	'Search label rtc-save-search-option-marker-953052-1-0-end',
	'Shared editing target paragraph.',
	'Shared editing target paragraph.',
	'core/table',
	'Search label rtc-save-search-option-marker-953052-3-0-end',
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
			username: `rtc27a6${ uniqueSuffix }`,
			email: `rtc27a6+${ uniqueSuffix }@example.com`,
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

function summarizeState( state: any ) {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block.name === 'core/group' || block.name === 'core/table' ) {
			return block.name;
		}

		return (
			block?.attributes?.content ??
			block?.attributes?.label ??
			block?.attributes?.placeholder ??
			block?.name ??
			'unknown'
		);
	} );
}

function writeResult( result: OutputShape ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ SCENARIO }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function matchesArchivedFamily(
	primarySummary: string[],
	secondarySummary: string[]
) {
	return (
		( JSON.stringify( primarySummary ) === JSON.stringify( BAD ) &&
			JSON.stringify( secondarySummary ) === JSON.stringify( GOOD ) ) ||
		( JSON.stringify( primarySummary ) === JSON.stringify( GOOD ) &&
			JSON.stringify( secondarySummary ) === JSON.stringify( BAD ) )
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

async function clickTable( editor: Editor ) {
	const page = editor.page;
	await page.bringToFront();
	await clearTransientUi( page, editor );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	const tableRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: 'Table',
	} );
	await expect( tableRow ).toBeVisible();
	await tableRow.first().click();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function collectSummaries( collaborationUtils: CollaborationUtilsClass ) {
	const [ primary, secondary ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primary: summarizeState( primary ),
		secondary: summarizeState( secondary ),
	};
}

test( SCENARIO, async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
} ) => {
	const output: OutputShape = {
		attempts: [],
		scenario: SCENARIO,
	};

	for ( let attempt = 0; attempt < 1; attempt++ ) {
		const attemptResult: AttemptResult = {
			attempt,
			convergenceError: null,
			reproduced: false,
		};

		try {
			const post = await requestUtils.createPost( {
				title: `RTC seed 953052 step 8 user 0 title 889556 attempt ${ attempt }`,
				status: 'draft',
				content: CONTENT,
			} );
			attemptResult.postId = post.id;

			await collaborationUtils.openPost( post.id );
			const { page, editor } = await collaborationUtils.joinUser(
				post.id,
				collaboratorUser
			);
			await waitForSessionReady( collaborationUtils );

			await clickTable( editor );
			for ( let move = 0; move < 6; move++ ) {
				await moveSelectedBlockDown( page, editor );
				await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
					timeout: 10000,
				} );
			}

			try {
				await collaborationUtils.waitForConvergence( {
					timeout: 10000,
				} );
			} catch ( error ) {
				attemptResult.convergenceError = formatError( error );
			}

			const { primary, secondary } = await collectSummaries(
				collaborationUtils
			);
			attemptResult.finalPrimary = primary;
			attemptResult.finalSecondary = secondary;
			attemptResult.reproduced = matchesArchivedFamily(
				primary,
				secondary
			);
		} catch ( error ) {
			attemptResult.error = formatError( error );
		}

		output.attempts.push( attemptResult );
		writeResult( output );
	}

	expect( output.attempts ).toHaveLength( 1 );
} );
