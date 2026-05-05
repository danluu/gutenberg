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
	name: string;
	notes: string[];
	postId?: number;
	reproduced: boolean;
};

const RESULT_DIR = process.env.RTC_15322705B364_RESULT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
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
			username: `rtc153227${ uniqueSuffix }`,
			email: `rtc153227+${ uniqueSuffix }@example.com`,
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

function summarizeBlocks(
	blocks: Array< { innerBlocks?: Array< unknown >; name: string } >
) {
	return blocks.map( ( block ) => {
		const name = block.name.replace( /^core\//, '' );
		const childCount = block.innerBlocks?.length ?? 0;
		return childCount > 0 ? `${ name }[${ childCount }]` : name;
	} );
}

function isObservedReproduction( error: unknown ) {
	const message = formatError( error );
	return [
		'Collaborative state did not converge',
		'Target page, context or browser has been closed',
		'exceeded 30000ms without resolving',
	].some( ( snippet ) => message.includes( snippet ) );
}

async function raceWithTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	label: string
): Promise<T> {
	let timer: NodeJS.Timeout | undefined;

	try {
		return await Promise.race( [
			promise,
			new Promise< never >( ( _resolve, reject ) => {
				timer = setTimeout( () => {
					reject(
						new Error(
							`${ label } exceeded ${ timeoutMs }ms without resolving`
						)
					);
				}, timeoutMs );
			} ),
		] );
	} finally {
		if ( timer ) {
			clearTimeout( timer );
		}
	}
}

async function waitForConvergenceGuarded(
	collaborationUtils: CollaborationUtilsClass,
	label: string,
	{ includeCrdtDocument = false }: { includeCrdtDocument?: boolean } = {}
) {
	return raceWithTimeout(
		collaborationUtils.waitForConvergence( {
			includeCrdtDocument,
			timeout: 20000,
		} ),
		30000,
		label
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForConvergenceGuarded( collaborationUtils, label );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', {
				name: 'Block Inserter',
				exact: true,
			} )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function typePostTitle(
	editor: Editor,
	page: Page,
	nextTitle: string
) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( nextTitle, { delay: 20 } );
	await expect( titleBox ).toContainText( nextTitle );
}

async function appendParagraphAfterLastBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
}

async function addCheckpoint(
	editor: Editor,
	page: Page,
	paragraphText: string,
	titleText: string
) {
	await appendParagraphAfterLastBlock( editor, page, paragraphText );
	await insertBlockFromInserter( page, 'Search' );
	await typePostTitle( editor, page, titleText );
	await editor.saveDraft();
}

async function reloadAndResync(
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

async function insertGroupAtEnd(
	editor: Editor,
	page: Page,
	groupText: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( groupText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function insertTableAfterSelectedGroup(
	editor: Editor,
	page: Page,
	secondCellText: string
) {
	await insertBlockFromInserter( page, 'Table' );
	await editor.canvas.getByRole( 'button', { name: 'Create Table' } ).click();

	const secondCell = editor.canvas
		.getByRole( 'textbox', { name: 'Body cell text' } )
		.nth( 1 );
	await secondCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( secondCellText, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function dragTableIntoGroup( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();

	const cells = overview.getByRole( 'gridcell' );
	const tableRow = cells.filter( { hasText: 'Table' } ).first();
	const groupRow = cells.filter( { hasText: 'Group' } ).first();

	await expect( tableRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await tableRow.dragTo( groupRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	doubleCheckpoint,
	editor,
	name,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	doubleCheckpoint: boolean;
	editor: Editor;
	name: string;
	page: Page;
	requestUtils: {
		createPost: ( post: {
			content: string;
			date_gmt: string;
			status: string;
			title: string;
		} ) => Promise< { id: number } >;
	};
} ) {
	const result: ScenarioResult = {
		name,
		notes: [],
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: `${ name } initial title`,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils, `${ name } initial` );

		await addCheckpoint(
			collaboratorEditor,
			collaboratorPage,
			`${ name } checkpoint one paragraph`,
			`${ name } checkpoint one title`
		);
		let state = await waitForConvergenceGuarded(
			collaborationUtils,
			`${ name } after checkpoint one`,
			{ includeCrdtDocument: true }
		);
		result.notes.push(
			`after checkpoint one: ${ summarizeBlocks( state.blocks ).join( '|' ) }`
		);

		await reloadAndResync( page, collaborationUtils, `${ name } reload one` );

		if ( doubleCheckpoint ) {
			await addCheckpoint(
				editor,
				page,
				`${ name } checkpoint two paragraph`,
				`${ name } checkpoint two title`
			);
			state = await waitForConvergenceGuarded(
				collaborationUtils,
				`${ name } after checkpoint two`,
				{ includeCrdtDocument: true }
			);
			result.notes.push(
				`after checkpoint two: ${ summarizeBlocks( state.blocks ).join( '|' ) }`
			);

			await reloadAndResync(
				collaboratorPage,
				collaborationUtils,
				`${ name } reload two`
			);
		}

		await insertGroupAtEnd( editor, page, `${ name } group paragraph` );
		state = await waitForConvergenceGuarded(
			collaborationUtils,
			`${ name } after group insert`
		);
		result.notes.push(
			`after group insert: ${ summarizeBlocks( state.blocks ).join( '|' ) }`
		);

		await insertTableAfterSelectedGroup(
			editor,
			page,
			`${ name } table cell`
		);
		state = await waitForConvergenceGuarded(
			collaborationUtils,
			`${ name } after table insert`
		);
		result.notes.push(
			`after table insert: ${ summarizeBlocks( state.blocks ).join( '|' ) }`
		);

		await dragTableIntoGroup( page );
		await waitForConvergenceGuarded(
			collaborationUtils,
			`${ name } after table drag`
		);

		await appendParagraphAfterLastBlock(
			collaboratorEditor,
			collaboratorPage,
			`${ name } trailing paragraph`
		);
		await collaboratorEditor.saveDraft();
		state = await waitForConvergenceGuarded(
			collaborationUtils,
			`${ name } final`,
			{ includeCrdtDocument: true }
		);
		result.notes.push(
			`final: ${ summarizeBlocks( state.blocks ).join( '|' ) }`
		);
	} catch ( error ) {
		result.error = formatError( error );
		result.reproduced = isObservedReproduction( error );
	}

	writeScenarioResult( result );
	expect( result.reproduced, result.error ?? 'scenario converged' ).toBe( false );
	expect( result.error, result.error ).toBeUndefined();
}

test.describe( 'RTC realistic triage 15322705b364', () => {
	test.describe.configure( { mode: 'serial' } );

	test( 'single-checkpoint reload plus group/table drag converges', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			doubleCheckpoint: false,
			editor,
			name: 'single-checkpoint-reload-table-drag-into-group',
			page,
			requestUtils,
		} );
	} );

	test( 'double-checkpoint reload plus group/table drag converges', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			doubleCheckpoint: true,
			editor,
			name: 'double-checkpoint-reload-table-drag-into-group',
			page,
			requestUtils,
		} );
	} );
} );
