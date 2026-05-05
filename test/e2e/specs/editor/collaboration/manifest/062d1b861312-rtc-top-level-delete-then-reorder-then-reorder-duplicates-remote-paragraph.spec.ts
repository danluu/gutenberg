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

type ScenarioName =
	| 'sequential-delete-second-move-shared-move-baseline'
	| 'burst-delete-second-move-shared-move-baseline';

type Snapshot = {
	label: string;
	primaryDebug: unknown;
	primaryState: unknown;
	secondaryDebug: unknown;
	secondaryState: unknown;
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	name: ScenarioName;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_062D_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_062D_ATTEMPTS ?? '1',
	10
);

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 954892 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 954892 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const BASELINE = 'Seed 954892 baseline paragraph.';
const SECOND = 'Seed 954892 keeps a second paragraph for deletes and moves.';
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
		try {
			await use( utils );
		} finally {
			await utils.teardown();
			await setCollaboration( requestUtils, false );
		}
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
			Math.random().toString( 36 ).slice( 2, 8 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtc062d${ uniqueSuffix }`,
			email: `rtc062d+${ uniqueSuffix }@example.com`,
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
	return ( state?.blocks ?? [] ).map(
		( block: any ) => block?.attributes?.content ?? block?.name ?? 'unknown'
	);
}

function writeResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.name }-attempt-${ String( result.attempt ).padStart( 2, '0' ) }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

function looksLikeSeedFamily( primaryState: any, secondaryState: any ) {
	const [ pageA, pageB ] = [ primaryState, secondaryState ].map( summarizeState );
	const expected = [ BASELINE, SHARED ];
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
	const getDebugState = ( page: Page ) =>
		page.evaluate( () =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.map( ( block: any ) => ( {
					clientId: block.clientId,
					content: block.attributes?.content ?? null,
					name: block.name,
				} ) )
		);

	const [
		primaryDebug,
		primaryState,
		secondaryDebug,
		secondaryState,
	] = await Promise.all( [
		getDebugState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		getDebugState( collaborationUtils.getPage( 0 ) ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryDebug,
		primaryState,
		secondaryDebug,
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
	const target = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( target ).toBeVisible();
	await target.click();
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
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	name,
	page,
	requestUtils,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: ScenarioName;
	page: Page;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		name,
		reproduced: false,
		snapshots: [],
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `RTC 062d realistic ${ name } ${ attempt }`,
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
			SECOND
		);
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		if ( name === 'sequential-delete-second-move-shared-move-baseline' ) {
			await waitForSessionReady( collaborationUtils );
		} else {
			await expect(
				editor.canvas.getByText( SECOND, { exact: false } )
			).not.toBeVisible( { timeout: 20000 } );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-delete' )
		);

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			SHARED
		);
		await moveSelectedBlockUp( collaboratorPage, collaboratorEditor );

		if ( name === 'sequential-delete-second-move-shared-move-baseline' ) {
			await waitForSessionReady( collaborationUtils );
		} else {
			await expect(
				editor.canvas.getByRole( 'document' ).nth( 0 )
			).toContainText( SHARED, { timeout: 20000 } );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-shared-move' )
		);

		await clickBlockByText( editor, page, BASELINE );
		await moveSelectedBlockUp( page, editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-baseline-move' )
		);

		const finalSnapshot = result.snapshots[ result.snapshots.length - 1 ];
		result.reproduced = looksLikeSeedFamily(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const name of [
	'sequential-delete-second-move-shared-move-baseline',
	'burst-delete-second-move-shared-move-baseline',
] as const ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `062d realistic ${ name} attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const result = await runScenario( {
				attempt,
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
					`Reproduced 062d seed family in scenario ${ name } attempt ${ attempt }: ${ JSON.stringify(
						result.snapshots[ result.snapshots.length - 1 ]
					) }`
				);
			}
		} );
	}
}
