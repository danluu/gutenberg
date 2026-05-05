import fs from 'fs';
import path from 'path';

import { expect, test as base, type Editor } from '@wordpress/e2e-test-utils-playwright';
import type { Locator, Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type NormalizedState = {
	blocks: Array< {
		attributes?: Record< string, unknown >;
		innerBlocks?: unknown[];
		name: string;
	} >;
	crdtDocument?: string | null;
	title: string;
};

type RestPost = {
	content: {
		raw: string;
	};
	title: {
		raw: string;
	};
};

type Scenario = {
	content: string;
	name: string;
	reloadActor: 'none' | 'primary' | 'secondary';
};

type ScenarioResult = {
	error?: string;
	name: string;
	postId?: number;
	persistedContent?: string;
	persistedTitle?: string;
	primaryInvalidBanner?: boolean;
	primaryState?: NormalizedState;
	reproduced: boolean;
	secondaryInvalidBanner?: boolean;
	secondaryState?: NormalizedState;
};

const OUTPUT_DIR = process.env.RTC_2D8F_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-956485-4-0-end';
const CHECKPOINT_TITLE = 'rtc-save-title-marker-956485-4-0-end';
const SEARCH_LABEL = 'Search label rtc-save-search-option-marker-956485-4-0-end';
const SEARCH_PLACEHOLDER =
	'Search placeholder rtc-save-search-option-marker-956485-4-0-end';
const SEARCH_BUTTON = 'Find rtc-save-search-option-marker-956485-4-0-end';

function block( name: string, body: string, attributes?: Record< string, unknown > ) {
	const serializedAttributes =
		attributes && Object.keys( attributes ).length
			? ` ${ JSON.stringify( attributes ) }`
			: '';
	return `<!-- wp:${ name }${ serializedAttributes } -->\n${ body }\n<!-- /wp:${ name } -->`;
}

function paragraph( text: string ) {
	return block( 'paragraph', `<p>${ text }</p>` );
}

function heading( text: string, level = 2 ) {
	return block(
		'heading',
		`<h${ level } class="wp-block-heading">${ text }</h${ level }>`,
		level === 2 ? undefined : { level }
	);
}

function group( inner: string[] ) {
	return block(
		'group',
		`<div class="wp-block-group">\n${ inner.join( '\n\n' ) }\n</div>`,
		{ layout: { type: 'constrained' } }
	);
}

function table() {
	return block(
		'table',
		[
			'<figure class="wp-block-table"><table><tbody>',
			'<tr><td>initial row 1 A seed 956485 step 4 user 0</td><td>initial row 1 B seed 956485 step 4 user 0</td></tr>',
			'<tr><td>initial row 2 A seed 956485 step 4 user 0</td><td>initial row 2 B seed 956485 step 4 user 0</td></tr>',
			'</tbody></table></figure>',
		].join( '\n' )
	);
}

const PRESEEDED_CONTENT_FAITHFUL = [
	group( [
		paragraph( 'Seed 956485 step 1 user 1 nested paragraph' ),
		heading( 'Seed 956485 step 1 user 1 nested heading', 3 ),
	] ),
	heading( 'Seed 956485 multibyte heading' ),
	paragraph( 'Seed 956485 step 0 user 1 updated paragraph 812473' ),
	heading( 'Seed 956485 step 3 user 1 heading', 3 ),
	table(),
	paragraph( 'Another paragraph exists so the top-level list is not degenerate.' ),
].join( '\n\n' );

const PRESEEDED_CONTENT_MULTIBYTE = [
	group( [
		paragraph( 'Seed 956485 step 1 user 1 nested paragraph' ),
		heading( 'Seed 956485 step 1 user 1 nested heading', 3 ),
	] ),
	heading( 'Seed 956485 multibyte heading' ),
	paragraph( 'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.' ),
	paragraph( 'Seed 956485 step 0 user 1 updated paragraph 812473' ),
	heading( 'Seed 956485 step 3 user 1 heading', 3 ),
	table(),
	paragraph( 'Another paragraph exists so the top-level list is not degenerate.' ),
].join( '\n\n' );

const SCENARIOS: Scenario[] = [
	{
		content: PRESEEDED_CONTENT_FAITHFUL,
		name: 'faithful-step4-secondary-reload',
		reloadActor: 'secondary',
	},
	{
		content: PRESEEDED_CONTENT_MULTIBYTE,
		name: 'multibyte-primary-reload',
		reloadActor: 'primary',
	},
];

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
			username: `rtc2d8f${ uniqueSuffix }`,
			email: `rtc2d8f+${ uniqueSuffix }@example.com`,
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

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function typePostTitle( editor: Editor, page: Page, nextTitle: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( nextTitle, { delay: 20 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function focusFreshParagraph( paragraphBlock: Locator, page: Page ) {
	await paragraphBlock.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
}

async function insertSearchBlockFromEmptyParagraph( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search', { delay: 15 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function configureSearchBlock( page: Page ) {
	const canvas = page.frameLocator( '[name="editor-canvas"]' );
	const labelBox = canvas.getByRole( 'textbox', { name: 'Label text' } ).last();
	const placeholderBox = canvas
		.getByRole( 'searchbox', { name: 'Optional placeholder text' } )
		.last();
	const buttonBox = canvas.getByRole( 'textbox', { name: 'Button text' } ).last();

	await expect( labelBox ).toBeVisible();
	await labelBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( SEARCH_LABEL, { delay: 15 } );

	await expect( placeholderBox ).toBeVisible();
	await placeholderBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( SEARCH_PLACEHOLDER, { delay: 15 } );

	await expect( buttonBox ).toBeVisible();
	await buttonBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( SEARCH_BUTTON, { delay: 15 } );
}

async function appendCheckpointBody( paragraphBlock: Locator, page: Page ) {
	await focusFreshParagraph( paragraphBlock, page );
	await page.keyboard.type( CHECKPOINT_PARAGRAPH, { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await insertSearchBlockFromEmptyParagraph( page );
	await configureSearchBlock( page );
}

async function fetchPersistedPost(
	requestUtils: Fixtures['collaborationUtils']['requestUtils'] | any,
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw,title.raw',
		},
	} );
}

function hasCorruptionShape( content: string ) {
	return [
		'wp:pparagraphragraph',
		'wp:wp:search',
		'buttonPosinPosition',
		'rttc-ssavve',
		'mulmultibytibyte',
		'Block contains unexpected or invalid content',
	].some( ( needle ) => content.includes( needle ) );
}

async function hasInvalidBanner( page: Page ) {
	const unsupportedBlock = page.getByText(
		'Your site doesn’t include support for the "core/pparagraphragraph" block.',
		{ exact: false }
	);
	const invalidBlock = page.getByText(
		'Block contains unexpected or invalid content.'
	);

	return ( await unsupportedBlock.count() ) > 0 || ( await invalidBlock.count() ) > 0;
}

for ( const scenario of SCENARIOS ) {
	test( `realistic repro search for ${ scenario.name }`, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const result: ScenarioResult = {
			name: scenario.name,
			reproduced: false,
		};

		try {
			const post = await requestUtils.createPost( {
				content: scenario.content,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: 'RTC seed 956485 step 2 user 0 title 407050',
			} );
			result.postId = post.id;

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			if ( scenario.reloadActor === 'primary' ) {
				await page.reload( { waitUntil: 'domcontentloaded' } );
				await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
					timeout: 20000,
				} );
				await waitForSessionReady( collaborationUtils );
			} else if ( scenario.reloadActor === 'secondary' ) {
				await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
				await collaborationUtils.waitForEntityReadyAndSaveSettled(
					collaboratorPage,
					{ timeout: 20000 }
				);
				await waitForSessionReady( collaborationUtils );
			}

			const lastParagraph = editor.canvas
				.getByRole( 'document', { name: 'Block: Paragraph' } )
				.last();
			await appendCheckpointBody( lastParagraph, page );
			await typePostTitle( editor, page, CHECKPOINT_TITLE );
			await editor.saveDraft();

			const persisted = await fetchPersistedPost( requestUtils, post.id );
			result.persistedContent = persisted.content.raw;
			result.persistedTitle = persisted.title.raw;
			result.primaryState =
				( await collaborationUtils.getNormalizedPostState( page, {
					includeCrdtDocument: true,
				} ) ) as NormalizedState;
			result.secondaryState =
				( await collaborationUtils.getNormalizedPostState(
					collaboratorPage,
					{
						includeCrdtDocument: true,
					}
				) ) as NormalizedState;
			result.primaryInvalidBanner = await hasInvalidBanner( page );
			result.secondaryInvalidBanner = await hasInvalidBanner( collaboratorPage );
			result.reproduced =
				hasCorruptionShape( result.persistedContent ) ||
				result.primaryInvalidBanner === true ||
				result.secondaryInvalidBanner === true;

			expect( result.persistedTitle ).toContain( CHECKPOINT_TITLE );
			expect( result.persistedContent ).toContain( CHECKPOINT_PARAGRAPH );
			expect( result.persistedContent ).toContain( SEARCH_BUTTON );
		} catch ( error ) {
			result.error = formatError( error );
			throw error;
		} finally {
			writeScenarioResult( result );
		}
	} );
}
