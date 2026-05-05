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
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioName =
	| 'sequential-delete-baseline-then-move-shared-up'
	| 'burst-delete-baseline-then-move-shared-up';

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_74DD_OUTPUT_DIR;
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 951036 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 951036 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASELINE = 'Seed 951036 baseline paragraph.';
const SECOND = 'Seed 951036 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';

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
			username: `rtc74dd${ uniqueSuffix }`,
			email: `rtc74dd+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ScenarioResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function summarizeState( state: any ) {
	return ( state?.blocks ?? [] ).map(
		( block: any ) => block?.attributes?.content ?? block?.name ?? 'unknown'
	);
}

function isExactSeedFamily(primaryState: any, secondaryState: any) {
	const [ pageA, pageB ] = [ primaryState, secondaryState ].map( summarizeState );
	const expected = [ SHARED, SECOND ];
	const corrupted = [ SHARED, SHARED ];

	return (
		( JSON.stringify( pageA ) === JSON.stringify( expected ) &&
			JSON.stringify( pageB ) === JSON.stringify( corrupted ) ) ||
		( JSON.stringify( pageB ) === JSON.stringify( expected ) &&
			JSON.stringify( pageA ) === JSON.stringify( corrupted ) )
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

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function moveSelectedBlockUp( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } )
		.click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	name,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: ScenarioName;
	page: Page;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC 74dd realistic ${ name }`,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'initial' )
		);

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			BASELINE
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		if ( name === 'sequential-delete-baseline-then-move-shared-up' ) {
			await waitForSessionReady( collaborationUtils );
		} else {
			await expect(
				editor.canvas.getByText( BASELINE, { exact: false } )
			).not.toBeVisible( { timeout: 20000 } );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-delete' )
		);

		await clickBlockByText( editor, page, SHARED );
		await moveSelectedBlockUp( page, editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-move' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = isExactSeedFamily(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeResult( result );
	return result;
}

for ( const name of [
	'sequential-delete-baseline-then-move-shared-up',
	'burst-delete-baseline-then-move-shared-up',
] as const ) {
	test( `74dd realistic search: ${ name }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			name,
			page,
			requestUtils,
		} );

		expect( result.error ).toBeUndefined();
		if ( result.reproduced ) {
			throw new Error(
				`Reproduced 74dd seed family in scenario ${ name }: ${ JSON.stringify(
					result.snapshots[ result.snapshots.length - 1 ]
				) }`
			);
		}
	} );
}
