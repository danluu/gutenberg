import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioResult = {
	error?: string;
	finalPrimaryState?: unknown;
	finalSecondaryState?: unknown;
	name: string;
	notes: string[];
	persistedContent?: string;
	postId?: number;
	reproduced: boolean;
};

const RESULT_DIR = process.env.RTC_7B3744_RESULT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 956525 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );
const INSERTED_PARAGRAPH = 'Seed 956525 step 0 user 1 paragraph 701006';
const DELETED_PARAGRAPH = 'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const NESTED_PARAGRAPH = 'Seed 956525 step 2 user 1 nested paragraph';
const NESTED_HEADING = 'Seed 956525 step 2 user 1 nested heading';
const TABLE_CELLS = [
	'initial row 1 A seed 956525 step 3 user 0',
	'initial row 1 B seed 956525 step 3 user 0',
	'initial row 2 A seed 956525 step 3 user 0',
	'initial row 2 B seed 956525 step 3 user 0',
];
const STEP2_CONTENT = [
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group"><!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading --></div>',
	'<!-- /wp:group -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 956525 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ INSERTED_PARAGRAPH }</p>`,
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
			.slice( -18 );
		const collaboratorUser = {
			username: `rtc7b3744${ uniqueSuffix }`,
			email: `rtc7b3744+${ uniqueSuffix }@example.com`,
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
	if ( ! RESULT_DIR ) {
		return;
	}
	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function hasTableBlock( state: any ) {
	return ( state?.blocks ?? [] ).some(
		( block: { name?: string } ) => block.name === 'core/table'
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clickBlockByText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect( editor.canvas.getByText( text, { exact: false } ) ).toBeVisible();
}

async function deleteParagraphBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	await clickBlockByText( editor, page, text );
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toHaveCount( 0 );
}

async function insertGroupBeforeHeading(
	editor: Editor,
	page: Page,
	headingText: string
) {
	await clickBlockByText( editor, page, headingText );
	await openBlockOptions( page, editor );
	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.keyboard.type( '/group', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	const groupOption = page.getByRole( 'option', {
		name: 'Group',
		exact: true,
	} );
	if ( await groupOption.isVisible().catch( () => false ) ) {
		await groupOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}
	const groupVariation = editor.canvas.getByRole( 'button', {
		name: 'Group: Gather blocks in a container.',
	} );
	if ( await groupVariation.isVisible().catch( () => false ) ) {
		await groupVariation.click();
	}
	await page.keyboard.type( NESTED_PARAGRAPH, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	const headingOption = page.getByRole( 'option', {
		name: 'Heading',
		exact: true,
	} );
	if ( await headingOption.isVisible().catch( () => false ) ) {
		await headingOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}
	await page.keyboard.type( NESTED_HEADING, { delay: 20 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+3` ).catch( () => {} );
	await page.keyboard.press( 'Escape' );
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils, label );
}

async function insertTableAtEnd(
	editor: Editor,
	page: Page,
	cellTexts: string[],
	anchorText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/table', { delay: 20 } );
	const slashTableOption = page.getByRole( 'option', {
		name: 'Table',
		exact: true,
	} );
	if ( ! ( await slashTableOption.isVisible().catch( () => false ) ) ) {
		await page.getByRole( 'button', {
			name: 'Block Inserter',
			exact: true,
		} ).click();
		const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
		await searchBox.fill( 'Table' );
	}
	const tableOption = page.getByRole( 'option', {
		name: 'Table',
		exact: true,
	} );
	if ( await tableOption.isVisible().catch( () => false ) ) {
		await tableOption.click();
	} else {
		await page.keyboard.press( 'Enter' );
	}
	await editor.canvas.getByRole( 'button', { name: 'Create Table' } ).click();
	const cells = editor.canvas.getByRole( 'textbox', { name: 'Body cell text' } );
	for ( const [ index, text ] of cellTexts.entries() ) {
		const cell = cells.nth( index );
		await cell.click();
		await page.keyboard.press( `${ MODIFIER_KEY }+A` );
		await page.keyboard.type( text, { delay: 20 } );
	}
	await page.keyboard.press( 'Escape' );
}

async function getPersistedPost(
	requestUtils: {
		rest: < T = unknown >( options: {
			params?:
				| string
				| Record< string, string | number | boolean >
				| URLSearchParams;
			path: string;
		} ) => Promise< T >;
	},
	postId: number
) {
	return requestUtils.rest< {
		content?: { raw?: string; rendered?: string } | string;
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );
}

test( 'seed-shaped UI sequence loses a newly inserted table on one peer after reload', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	const result: ScenarioResult = {
		name: 'realistic-seed-shaped-sequence',
		notes: [],
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC seed 956525 initial title',
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady(
			collaborationUtils,
			'after-open-and-join'
		);

		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			INSERTED_PARAGRAPH
		);
		await waitForSessionReady(
			collaborationUtils,
			'after-append-paragraph'
		);

		await deleteParagraphBlock(
			collaboratorEditor,
			collaboratorPage,
			DELETED_PARAGRAPH
		);
		await waitForSessionReady(
			collaborationUtils,
			'after-delete-paragraph'
		);

		await insertGroupBeforeHeading(
			collaboratorEditor,
			collaboratorPage,
			'Seed 956525 multibyte heading'
		);
		await waitForSessionReady(
			collaborationUtils,
			'after-insert-group'
		);

		await reloadAndWait( page, collaborationUtils, 'after-primary-reload' );
		result.notes.push( 'Primary page reloaded and rejoined the session.' );

		await insertTableAtEnd(
			editor,
			page,
			TABLE_CELLS,
			INSERTED_PARAGRAPH
		);
		result.notes.push( 'Primary user inserted a 2x2 table via the inserter.' );

		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		result.finalPrimaryState = await collaborationUtils.getNormalizedPostState(
			page,
			{ includeCrdtDocument: true }
		);
		result.finalSecondaryState = await collaborationUtils.getNormalizedPostState(
			collaboratorPage,
			{ includeCrdtDocument: true }
		);
		const persisted = await getPersistedPost( requestUtils, post.id );
		result.persistedContent =
			typeof persisted.content === 'string'
				? persisted.content
				: persisted.content?.raw ?? persisted.content?.rendered ?? '';
		writeScenarioResult( result );
	} catch ( error ) {
		result.error = formatError( error );
		result.finalPrimaryState = await collaborationUtils.getNormalizedPostState(
			page,
			{ includeCrdtDocument: true }
		);
		result.finalSecondaryState = await collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		);
		const persisted = result.postId
			? await getPersistedPost( requestUtils, result.postId )
			: null;
		result.persistedContent =
			typeof persisted?.content === 'string'
				? persisted.content
				: persisted?.content?.raw ?? persisted?.content?.rendered ?? '';

		const primaryHasTable = hasTableBlock( result.finalPrimaryState );
		const secondaryHasTable = hasTableBlock( result.finalSecondaryState );
		result.reproduced =
			primaryHasTable !== secondaryHasTable &&
			( result.persistedContent?.includes( 'wp:table' ) ?? false );
		writeScenarioResult( result );

		if ( result.reproduced ) {
			throw new Error(
				`Reproduced target divergence: primaryHasTable=${ String(
					primaryHasTable
				) }, secondaryHasTable=${ String( secondaryHasTable ) }`
			);
		}
		throw error;
	}
} );

test( 'post-step-2 reload plus real table insertion still converges', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	const result: ScenarioResult = {
		name: 'step2-state-then-reload-and-table',
		notes: [],
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: STEP2_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC seed 956525 initial title',
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const {
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady(
			collaborationUtils,
			'step2-state-initial'
		);

		await reloadAndWait( page, collaborationUtils, 'step2-state-reload' );
		result.notes.push(
			'Primary page reloaded from a REST-created post-step-2 state.'
		);

		await insertTableAtEnd(
			editor,
			page,
			TABLE_CELLS,
			INSERTED_PARAGRAPH
		);
		result.notes.push(
			'Primary user inserted a table after reload using the inserter.'
		);

		await collaborationUtils.waitForConvergence( { timeout: 20000 } );
		result.finalPrimaryState = await collaborationUtils.getNormalizedPostState(
			page,
			{ includeCrdtDocument: true }
		);
		result.finalSecondaryState = await collaborationUtils.getNormalizedPostState(
			collaboratorPage,
			{ includeCrdtDocument: true }
		);
		const persisted = await getPersistedPost( requestUtils, post.id );
		result.persistedContent =
			typeof persisted.content === 'string'
				? persisted.content
				: persisted.content?.raw ?? persisted.content?.rendered ?? '';
		writeScenarioResult( result );
	} catch ( error ) {
		result.error = formatError( error );
		result.finalPrimaryState = await collaborationUtils.getNormalizedPostState(
			page,
			{ includeCrdtDocument: true }
		);
		result.finalSecondaryState = await collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		);
		const persisted = result.postId
			? await getPersistedPost( requestUtils, result.postId )
			: null;
		result.persistedContent =
			typeof persisted?.content === 'string'
				? persisted.content
				: persisted?.content?.raw ?? persisted?.content?.rendered ?? '';
		const primaryHasTable = hasTableBlock( result.finalPrimaryState );
		const secondaryHasTable = hasTableBlock( result.finalSecondaryState );
		result.reproduced =
			primaryHasTable !== secondaryHasTable &&
			( result.persistedContent?.includes( 'wp:table' ) ?? false );
		writeScenarioResult( result );
		if ( result.reproduced ) {
			throw new Error(
				`Reproduced target divergence from step-2 state: primaryHasTable=${ String(
					primaryHasTable
				) }, secondaryHasTable=${ String( secondaryHasTable ) }`
			);
		}
		throw error;
	}
} );
