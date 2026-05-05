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
	| 'delete-heading-then-add-after-emoji'
	| 'delete-heading-then-enter-after-emoji';

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	postId?: number;
	primaryState?: unknown;
	scenario: ScenarioName;
	secondaryState?: unknown;
};

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

const OUTPUT_DIR = process.env.RTC_FA621_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_FA621_ATTEMPTS ?? '4',
	10
);

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954081 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

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
			username: `rtcfa621${ uniqueSuffix }`,
			email: `rtcfa621+${ uniqueSuffix }@example.com`,
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
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForConvergence( collaborationUtils, { timeout: 20000 } );
}

async function getNormalizedPostState( page: Page ) {
	return page.evaluate( () => {
		function normalize( block: any ): NormalizedBlock {
			return {
				name: block.name,
				attributes: block.attributes ?? {},
				innerBlocks: ( block.innerBlocks ?? [] ).map( normalize ),
			};
		}

		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( normalize );

		return {
			blocks,
			serializedContent: ( window as any ).wp.blocks.serialize( blocks ),
			title: ( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostAttribute( 'title' ),
		};
	} );
}

async function waitForConvergence(
	collaborationUtils: CollaborationUtilsClass,
	{ timeout }: { timeout: number }
) {
	await expect
		.poll(
			async () => {
				const states = await getStates( collaborationUtils );
				return JSON.stringify( states.primaryState ) ===
					JSON.stringify( states.secondaryState )
					? states.primaryState
					: null;
			},
			{ timeout }
		)
		.not.toBeNull();
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
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

async function insertParagraphAfterSelected(
	page: Page,
	editor: Editor,
	text: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function insertParagraphWithEnter(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickBlockByText( editor, page, anchorText );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
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
	scenario: ScenarioName;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		attempt,
		scenario,
	};
	const insertedText = `RTC fa621 inserted paragraph ${ scenario } ${ attempt }`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC fa621 realistic ${ scenario } ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( editor, page, 'Seed 954081 multibyte heading' );
		await deleteSelectedBlock( page, editor );
		await waitForSessionReady( collaborationUtils );

		if ( scenario === 'delete-heading-then-add-after-emoji' ) {
			await clickBlockByText( editor, page, 'Emoji and multibyte' );
			await insertParagraphAfterSelected( page, editor, insertedText );
		} else {
			await insertParagraphWithEnter(
				editor,
				page,
				'Emoji and multibyte',
				insertedText
			);
		}

		await waitForConvergence( collaborationUtils, { timeout: 15000 } );
		Object.assign( result, await getStates( collaborationUtils ) );
	} catch ( error ) {
		result.convergenceError =
			error instanceof Error
				? error.stack ?? error.message
				: String( error );
		try {
			Object.assign( result, await getStates( collaborationUtils ) );
		} catch {}
	}

	writeAttemptResult( result );
	return result;
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	'delete-heading-then-add-after-emoji',
	'delete-heading-then-enter-after-emoji',
] as const ) {
	for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
		test( `${ scenario } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 45000 );

			const result = await runAttempt( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
				scenario,
			} );

			expect
				.soft(
					result.convergenceError,
					result.convergenceError
						? `Reproduced on attempt ${ result.attempt }`
						: 'No realistic repro found'
				)
				.toBeUndefined();
		} );
	}
}
