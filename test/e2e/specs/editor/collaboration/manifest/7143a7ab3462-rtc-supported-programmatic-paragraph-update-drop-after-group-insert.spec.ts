import fs from 'fs';
import path from 'path';

import type { Locator, Page } from '@playwright/test';
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

type AttemptResult = {
	error?: string;
	name: string;
	postId?: number;
	primaryProviders?: string[];
	primaryState?: unknown;
	primarySummary?: string[];
	reproduced: boolean;
	secondaryProviders?: string[];
	secondaryState?: unknown;
	secondarySummary?: string[];
	updatedTextVisibleOnPrimary?: boolean;
	updatedTextVisibleOnSecondary?: boolean;
};

const OUTPUT_DIR = process.env.RTC_7143_RESULTS_DIR ?? __dirname;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const PROGRAMMATIC_UPDATED_TEXT = 'Seed 954077 step 1 user 0 updated paragraph 44210';
const REALISTIC_UPDATED_TEXT_PREFIX =
	'RTC 7143 realistic updated paragraph';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954077 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const STEP0_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 954077 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 954077 step 0 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 954077 step 0 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
].join( '\n' );

const TAIL_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';

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
			username: `rtc7143${ uniqueSuffix }`,
			email: `rtc7143+${ uniqueSuffix }@example.com`,
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

function writeResult( name: string, result: AttemptResult ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function summarizeBlocks( blocks: any[], prefix = '' ): string[] {
	const summary: string[] = [];
	for ( const block of blocks ) {
		const text =
			block?.attributes?.content ??
			block?.attributes?.value ??
			block?.attributes?.citation ??
			'';
		summary.push( `${ prefix }${ block.name }:${ String( text ) }` );
		if ( Array.isArray( block?.innerBlocks ) && block.innerBlocks.length > 0 ) {
			summary.push( ...summarizeBlocks( block.innerBlocks, `${ prefix }  ` ) );
		}
	}
	return summary;
}

async function getStates( collaborationUtils: CollaborationUtilsClass ) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( collaborationUtils.allPages[ 0 ] ),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		primaryState,
		secondaryState,
	};
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
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
	await editor.canvas
		.getByText( text, { exact: false } )
		.first()
		.click( {
			position: {
				x: 24,
				y: 12,
			},
		} );
}

async function selectBlockViaOverview( page: Page, text: string ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	await overview
		.getByRole( 'gridcell' )
		.filter( { hasText: text } )
		.first()
		.click();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function clearAndType( page: Page, locator: Locator, text: string ) {
	await expect( locator ).toBeVisible();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( text, { delay: 15 } );
}

async function replaceParagraphText(
	editor: Editor,
	page: Page,
	currentText: string,
	nextText: string
) {
	await clearTransientUi( page, editor );
	await selectBlockViaOverview( page, currentText );
	await clickBlockByText( editor, page, currentText );
	await clearAndType(
		page,
		editor.canvas.getByText( currentText, { exact: false } ).first(),
		nextText
	);
	await expect(
		editor.canvas.getByText( nextText, { exact: false } )
	).toBeVisible();
}

async function getAvailableProviders( page: Page ) {
	return page.evaluate( () => {
		return Object.keys(
			( window as any ).wp?.hooks?.applyFilters( 'sync.providers', {} ) ?? {}
		);
	} );
}

async function runProgrammaticScenario( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: any;
} ): Promise< AttemptResult > {
	const result: AttemptResult = {
		name: 'programmatic-exact-two-step',
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			title: 'RTC 7143 programmatic exact two-step',
			status: 'draft',
			content: INITIAL_CONTENT,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		result.primaryProviders = await getAvailableProviders(
			collaborationUtils.allPages[ 0 ]
		);
		result.secondaryProviders = await getAvailableProviders(
			collaborationUtils.getPage( 0 )
		);

		await collaborationUtils.allPages[ 0 ].evaluate( () => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const paragraphBlock = ( window as any ).wp.blocks.createBlock(
				'core/paragraph',
				{
					content: 'Seed 954077 step 0 user 0 nested paragraph',
				}
			);
			const headingBlock = ( window as any ).wp.blocks.createBlock(
				'core/heading',
				{
					content: 'Seed 954077 step 0 user 0 nested heading',
					level: 3,
				}
			);
			const groupBlock = ( window as any ).wp.blocks.createBlock(
				'core/group',
				{
					layout: { type: 'constrained' },
				},
				[ paragraphBlock, headingBlock ]
			);

			blockEditor.insertBlock( groupBlock, blocks.length );
		} );

		await collaborationUtils.waitForConvergence( { timeout: 15000 } );

		await collaborationUtils.allPages[ 0 ].evaluate(
			( updatedText ) => {
				const blockEditor = ( window as any ).wp.data.dispatch(
					'core/block-editor'
				);
				const blocks = ( window as any ).wp.data
					.select( 'core/block-editor' )
					.getBlocks();
				const paragraphs = blocks.filter(
					( block: { name: string } ) => block.name === 'core/paragraph'
				);
				const target = paragraphs[ paragraphs.length - 1 ];
				blockEditor.updateBlockAttributes( target.clientId, {
					content: updatedText,
				} );
			},
			PROGRAMMATIC_UPDATED_TEXT
		);

		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( error ) {
			result.error = formatError( error );
		}

		const { primaryState, secondaryState } = await getStates(
			collaborationUtils
		);
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.primarySummary = summarizeBlocks( ( primaryState as any ).blocks ?? [] );
		result.secondarySummary = summarizeBlocks(
			( secondaryState as any ).blocks ?? []
		);
		result.updatedTextVisibleOnPrimary = JSON.stringify( primaryState ).includes(
			PROGRAMMATIC_UPDATED_TEXT
		);
		result.updatedTextVisibleOnSecondary = JSON.stringify(
			secondaryState
		).includes( PROGRAMMATIC_UPDATED_TEXT );
		result.reproduced =
			result.updatedTextVisibleOnPrimary === true &&
			result.updatedTextVisibleOnSecondary === false;
	} catch ( error ) {
		result.error = formatError( error );
	}

	return result;
}

async function runRealisticScenario( {
	attempt,
	collaborationUtils,
	collaboratorUser,
	editor,
	requestUtils,
	page,
}: {
	attempt: number;
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	requestUtils: any;
	page: Page;
} ): Promise< AttemptResult > {
	const updatedText = `${ REALISTIC_UPDATED_TEXT_PREFIX } ${ attempt }`;
	const result: AttemptResult = {
		name: `realistic-preseeded-step0-shape-attempt-${ attempt }`,
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			title: `RTC 7143 realistic attempt ${ attempt }`,
			status: 'draft',
			content: STEP0_CONTENT,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		result.primaryProviders = await getAvailableProviders(
			collaborationUtils.allPages[ 0 ]
		);
		result.secondaryProviders = await getAvailableProviders(
			collaborationUtils.getPage( 0 )
		);

		await replaceParagraphText( editor, page, TAIL_PARAGRAPH, updatedText );
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );

		const { primaryState, secondaryState } = await getStates(
			collaborationUtils
		);
		result.primaryState = primaryState;
		result.secondaryState = secondaryState;
		result.primarySummary = summarizeBlocks( ( primaryState as any ).blocks ?? [] );
		result.secondarySummary = summarizeBlocks(
			( secondaryState as any ).blocks ?? []
		);
		result.updatedTextVisibleOnPrimary = JSON.stringify( primaryState ).includes(
			updatedText
		);
		result.updatedTextVisibleOnSecondary = JSON.stringify(
			secondaryState
		).includes( updatedText );
		result.reproduced =
			JSON.stringify( primaryState ) !== JSON.stringify( secondaryState );
	} catch ( error ) {
		result.error = formatError( error );
	}

	return result;
}

test.describe.configure( { mode: 'serial' } );

test( 'programmatic exact two-step repro search', async ( {
	collaborationUtils,
	collaboratorUser,
	requestUtils,
} ) => {
	test.setTimeout( 90000 );
	const result = await runProgrammaticScenario( {
		collaborationUtils,
		collaboratorUser,
		requestUtils,
	} );
	writeResult( result.name, result );
} );

for ( const attempt of [ 1, 2, 3 ] ) {
	test(
		`realistic preseeded step0 paragraph edit attempt ${ attempt }`,
		async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 90000 );
			const result = await runRealisticScenario( {
				attempt,
				collaborationUtils,
				collaboratorUser,
				editor,
				page,
				requestUtils,
			} );
			writeResult( result.name, result );
		}
	);
}
