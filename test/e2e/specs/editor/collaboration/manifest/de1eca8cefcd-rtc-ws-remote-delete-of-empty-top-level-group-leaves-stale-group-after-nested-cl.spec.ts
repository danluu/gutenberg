import fs from 'fs';
import path from 'path';

import {
	expect,
	test as base,
	type Editor,
	type Page,
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

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR =
	process.env.RTC_TRIAGE_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/de1eca8cefcd/realistic-results';

const TITLE = 'rtc-save-title-marker-953145-2-0-end';
const EMPTY_GROUP_PRESTATE = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953145 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"></div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953145 step 0 user 1 updated paragraph 465518</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953145-1-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-953145-1-0-end","buttonText":"Find rtc-save-search-option-marker-953145-1-0-end","buttonPosition":"button-inside","placeholder":"Search placeholder rtc-save-search-option-marker-953145-1-0-end"} /-->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953145-2-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-953145-2-0-end","buttonText":"Find rtc-save-search-option-marker-953145-2-0-end","buttonPosition":"button-inside","placeholder":"Search placeholder rtc-save-search-option-marker-953145-2-0-end"} /-->',
	'<!-- wp:paragraph -->',
	'<p>Seed 953145 step 3 user 1 paragraph 554419</p>',
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
		await requestUtils.setupRest();
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
			username: `rtcde1e${ uniqueSuffix }`,
			email: `rtcde1e+${ uniqueSuffix }@example.com`,
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
	return error instanceof Error ? error.stack ?? error.message : String( error );
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20_000
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
			collaborationUtils.allPages[ 0 ],
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return {
		label,
		primaryState,
		secondaryState,
	};
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function selectEmptyGroup( page: Page, editor: Editor ) {
	const groupBlock = editor.canvas
		.getByRole( 'document', { name: 'Block: Group' } )
		.first();

	await expect( groupBlock ).toBeVisible();
	await editor.selectBlocks( groupBlock ).catch( () => {} );
	if (
		!( await groupBlock
			.evaluate( ( node ) => node.classList.contains( 'is-selected' ) )
			.catch( () => false ) )
	) {
		await groupBlock.click();
	}
	await expect
		.poll( () =>
			groupBlock.evaluate( ( node ) =>
				node.classList.contains( 'is-selected' )
			)
		)
		.toBe( true );
}

async function deleteSelectedGroup( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function runScenario(
	name: string,
	deleteFrom: 'primary' | 'secondary',
	fixtures: {
		collaborationUtils: CollaborationUtilsClass;
		collaboratorUser: UserCredentials;
		requestUtils: {
			createPost: ( post: {
				content: string;
				status: string;
				title: string;
			} ) => Promise< { id: number } >;
		};
	}
) {
	const { collaborationUtils, collaboratorUser, requestUtils } = fixtures;
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			title: TITLE,
			status: 'draft',
			content: EMPTY_GROUP_PRESTATE,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'before-delete' )
		);

		const page =
			deleteFrom === 'primary'
				? collaborationUtils.allPages[ 0 ]
				: collaborationUtils.getPage( 0 );
		const editor =
			deleteFrom === 'primary'
				? collaborationUtils.allEditors[ 0 ]
				: collaborationUtils.allEditors[ 1 ];

		await selectEmptyGroup( page, editor );
		await deleteSelectedGroup( page, editor );
		await expect(
			editor.canvas.getByRole( 'document', { name: 'Block: Group' } )
		).toHaveCount( 0 );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-local-delete' )
		);

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 10_000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-convergence-check' )
		);

		const finalSnapshot = result.snapshots.at( -1 );
		const finalPrimary = JSON.stringify( finalSnapshot?.primaryState ?? null );
		const finalSecondary = JSON.stringify(
			finalSnapshot?.secondaryState ?? null
		);

		result.reproduced =
			!! result.convergenceError &&
			finalPrimary.includes( '"core/group"' ) !==
				finalSecondary.includes( '"core/group"' );
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	expect( result.error ).toBeUndefined();
} 

test.describe( 'RTC empty group delete triage', () => {
	test( 'secondary deletes preseeded empty group', async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		await runScenario( 'secondary-deletes-empty-group', 'secondary', {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} );
	} );

	test( 'primary deletes preseeded empty group', async ( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} ) => {
		await runScenario( 'primary-deletes-empty-group', 'primary', {
			collaborationUtils,
			collaboratorUser,
			requestUtils,
		} );
	} );
} );
