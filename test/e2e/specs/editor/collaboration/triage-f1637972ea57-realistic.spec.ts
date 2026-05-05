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
	| 'sequential-delete-emoji-then-move-heading-down'
	| 'burst-delete-emoji-then-move-heading-down'
	| 'sequential-delete-emoji-then-move-heading-up'
	| 'burst-delete-emoji-then-move-heading-up';

type ScenarioResult = {
	error?: string;
	name: ScenarioName;
	postId?: number;
	primaryState?: unknown;
	reproduced: boolean;
	reproducedExact?: boolean;
	reproducedRelated?: boolean;
	secondaryState?: unknown;
};

const OUTPUT_DIR = process.env.RTC_F163_OUTPUT_DIR;

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 952345 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const EXPECTED_EXACT_A = JSON.stringify( [
	{
		name: 'core/paragraph',
		attributes: {
			content: 'Another paragraph exists so the top-level list is not degenerate.',
			dropCap: false,
		},
	},
	{
		name: 'core/heading',
		attributes: {
			content: 'Seed 952345 multibyte heading',
			level: 2,
		},
	},
] );

const EXPECTED_EXACT_B = JSON.stringify( [
	{
		name: 'core/heading',
		attributes: {
			content: 'Seed 952345 multibyte heading',
			level: 2,
		},
	},
	{
		name: 'core/paragraph',
		attributes: {
			content: 'Another paragraph exists so the top-level list is not degenerate.',
			dropCap: false,
		},
	},
] );

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
			username: `rtcf163${ uniqueSuffix }`,
			email: `rtcf163+${ uniqueSuffix }@example.com`,
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
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function semanticBlocks( state: any ) {
	return state.blocks.map( ( block: any ) => ( {
		name: block.name,
		attributes: block.attributes,
	} ) );
}

function isExactSplit( primaryState: any, secondaryState: any ) {
	const primary = JSON.stringify( semanticBlocks( primaryState ) );
	const secondary = JSON.stringify( semanticBlocks( secondaryState ) );

	return (
		( primary === EXPECTED_EXACT_A && secondary === EXPECTED_EXACT_B ) ||
		( primary === EXPECTED_EXACT_B && secondary === EXPECTED_EXACT_A )
	);
}

function isRelatedTwoBlockOrderSplit( primaryState: any, secondaryState: any ) {
	const primaryBlocks = semanticBlocks( primaryState );
	const secondaryBlocks = semanticBlocks( secondaryState );
	if ( primaryBlocks.length !== 2 || secondaryBlocks.length !== 2 ) {
		return false;
	}

	if ( JSON.stringify( primaryBlocks ) === JSON.stringify( secondaryBlocks ) ) {
		return false;
	}

	const blockSet = ( blocks: Array< { name: string; attributes: unknown } > ) =>
		JSON.stringify(
			[ ...blocks ]
				.map( ( block ) => JSON.stringify( block ) )
				.sort()
		);

	return blockSet( primaryBlocks ) === blockSet( secondaryBlocks );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	for ( const currentPage of collaborationUtils.allPages ) {
		await expect(
			currentPage.getByRole( 'button', {
				name: /Collaborators list, 2 online/,
			} )
		).toBeVisible( { timeout: 20000 } );
	}

	await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
}

async function captureStates( collaborationUtils: CollaborationUtilsClass ) {
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

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'up' | 'down'
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'down' ? 'Move down' : 'Move up',
		} )
		.click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: ScenarioName;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario,
		reproduced: false,
		reproducedExact: false,
		reproducedRelated: false,
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ scenario } initial title`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;
		const burst = scenario.startsWith( 'burst-' );
		const direction = scenario.endsWith( '-down' ) ? 'down' : 'up';

		await waitForSessionReady( collaborationUtils );

		await clickBlockByText(
			primaryEditor,
			page,
			'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.'
		);
		await deleteSelectedBlock( page, primaryEditor );
		if ( ! burst ) {
			await waitForSessionReady( collaborationUtils );
		}

		await clickBlockByText(
			primaryEditor,
			page,
			'Seed 952345 multibyte heading'
		);
		await moveSelectedBlock( page, primaryEditor, direction );

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.reproduced = true;
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
			Object.assign( result, await captureStates( collaborationUtils ) );
			result.reproducedExact = isExactSplit(
				result.primaryState,
				result.secondaryState
			);
			result.reproducedRelated =
				! result.reproducedExact &&
				isRelatedTwoBlockOrderSplit(
					result.primaryState,
					result.secondaryState
				);
			writeScenarioResult( result );
			return result;
		}

		Object.assign( result, await captureStates( collaborationUtils ) );
		result.reproducedExact = isExactSplit(
			result.primaryState,
			result.secondaryState
		);
		result.reproducedRelated =
			! result.reproducedExact &&
			isRelatedTwoBlockOrderSplit(
				result.primaryState,
				result.secondaryState
			);
		writeScenarioResult( result );
		return result;
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack ?? error.message : String( error );
		try {
			Object.assign( result, await captureStates( collaborationUtils ) );
			result.reproducedExact = isExactSplit(
				result.primaryState,
				result.secondaryState
			);
			result.reproducedRelated =
				! result.reproducedExact &&
				isRelatedTwoBlockOrderSplit(
					result.primaryState,
					result.secondaryState
				);
		} catch {}
		writeScenarioResult( result );
		return result;
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'sequential-delete-emoji-then-move-heading-down',
	'burst-delete-emoji-then-move-heading-down',
	'sequential-delete-emoji-then-move-heading-up',
	'burst-delete-emoji-then-move-heading-up',
] as const ) {
	test( scenario, async ( {
		collaborationUtils,
		collaboratorUser,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
			scenario,
		} );

		expect.soft( result.error ).toBeUndefined();
	} );
}
