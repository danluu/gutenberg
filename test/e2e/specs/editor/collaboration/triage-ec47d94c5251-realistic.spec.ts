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

type AttemptResult = {
	attempt: number;
	error?: string;
	postId?: number;
	primaryState?: unknown;
	secondaryState?: unknown;
};

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

type NormalizedCollaborativeState = {
	blocks: NormalizedBlock[];
	crdtDocument: string | null;
	serializedContent: string;
	title: string;
};

const OUTPUT_DIR = process.env.RTC_EC47_OUTPUT_DIR;
const ATTEMPT_COUNT = Number.parseInt(
	process.env.RTC_EC47_ATTEMPTS ?? '1',
	10
);
const INSERTED_PARAGRAPH_PREFIX = 'RTC ec47 realistic inserted paragraph';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 950301 multibyte heading</h2>',
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
		void collaborationUtils;

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
			username: `rtcec47${ uniqueSuffix }`,
			email: `rtcec47+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		await requestUtils.createUser( collaboratorUser );

		await use( collaboratorUser );
	},
} );

function writeAttemptResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForConvergence( collaborationUtils, { timeout: 20000 } );
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

async function getNormalizedPostState(
	page: Page
): Promise< NormalizedCollaborativeState > {
	return page.evaluate( () => {
		const normalizeBlocks = (
			blockTree: Array< {
				attributes?: Record< string, unknown >;
				innerBlocks?: Array< unknown >;
				name: string;
			} >
		): NormalizedBlock[] =>
			blockTree.map( ( block ) => ( {
				name: block.name,
				attributes: JSON.parse(
					JSON.stringify( block.attributes ?? {} )
				),
				innerBlocks: normalizeBlocks(
					( block.innerBlocks ?? [] ) as Array< {
						attributes?: Record< string, unknown >;
						innerBlocks?: Array< unknown >;
						name: string;
					} >
				),
			} ) );

		const postId = ( window as any ).wp.data
			.select( 'core/editor' )
			.getCurrentPostId();
		const record = ( window as any ).wp.data
			.select( 'core' )
			.getEntityRecord( 'postType', 'post', postId );
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			blocks: normalizeBlocks( blocks ),
			serializedContent:
				( window as any ).wp.blocks.serialize( blocks ) ?? '',
			crdtDocument: record?.meta?._crdt_document ?? null,
		};
	} );
}

async function waitForConvergence(
	collaborationUtils: CollaborationUtilsClass,
	{ timeout = 15000 }: { timeout?: number } = {}
): Promise< NormalizedCollaborativeState > {
	const pages = collaborationUtils.allPages;
	const deadline = Date.now() + timeout;
	let lastStates: NormalizedCollaborativeState[] = [];

	while ( Date.now() < deadline ) {
		lastStates = await Promise.all( pages.map( getNormalizedPostState ) );

		const serializedFirstState = JSON.stringify( lastStates[ 0 ] );
		const isSettled = lastStates.every(
			( state ) => JSON.stringify( state ) === serializedFirstState
		);

		if ( isSettled ) {
			return lastStates[ 0 ];
		}

		await pages[ 0 ].waitForTimeout( 250 );
	}

	throw new Error(
		`Collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
			lastStates
		) }`
	);
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
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
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
	};

	const insertedParagraph = `${ INSERTED_PARAGRAPH_PREFIX } ${ attempt }`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC ec47 realistic attempt ${ attempt }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( editor, page, 'Seed 950301 multibyte heading' );
		await deleteSelectedBlock( page, editor );
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			'Emoji and multibyte'
		);
		await insertParagraphBeforeSelected(
			collaboratorEditor,
			collaboratorPage,
			insertedParagraph
		);
		await waitForSessionReady( collaborationUtils );

		await clickBlockByText( editor, page, 'Emoji and multibyte' );
		await moveSelectedBlockDown( page, editor );
		await waitForSessionReady( collaborationUtils );

		Object.assign( result, await getStates( collaborationUtils ) );
	} catch ( error ) {
		result.error =
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

for ( let attempt = 1; attempt <= ATTEMPT_COUNT; attempt++ ) {
	test( `ec47 realistic attempt ${ attempt }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const result = await runAttempt( {
			attempt,
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} );

		expect( result.error ).toBeUndefined();
	} );
}
