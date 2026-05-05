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

type SaveCounters = {
	collaborator: number;
	primary: number;
};

type Sample = {
	collaboratorSaving: boolean;
	collaboratorTitle: string;
	combinedPostRequests: number;
	elapsedMs: number;
	label: string;
	primarySaving: boolean;
	primaryTitle: string;
	savePostsByCollaborator: number;
	savePostsByPrimary: number;
};

type ScenarioResult = {
	counters: SaveCounters;
	error?: string;
	name: string;
	observation?: {
		outcome: 'saving-stuck' | 'settled';
		postId: number;
		samples: Sample[];
	};
};

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
			username: `rtc9a0c${ uniqueSuffix }`,
			email: `rtc9a0c+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Repro',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":2} -->',
	'<h2 class="wp-block-heading">RTC save-stuck heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>RTC save-stuck paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>RTC save-stuck paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr><tr><td>initial row 2 A</td><td>initial row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:search {"label":"RTC save-stuck initial search label","placeholder":"RTC save-stuck initial search placeholder","buttonText":"RTC save-stuck initial search button","buttonPosition":"button-inside"} /-->',
].join( '\n' );

function writeScenarioResult( result: ScenarioResult ) {
	const outputDir = process.env.RTC_9A0C73D7_REPRO_DIR;
	if ( ! outputDir ) {
		return;
	}

	fs.mkdirSync( outputDir, { recursive: true } );
	fs.writeFileSync(
		path.join( outputDir, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function typePostTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', { name: 'Add title' } );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

async function appendParagraphAfterLastBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
}

async function editSecondTableCell( editor: Editor, page: Page, text: string ) {
	const secondCell = editor.canvas
		.getByRole( 'textbox', { name: 'Body cell text' } )
		.nth( 1 );
	await secondCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
}

async function editSearchButtonText(
	editor: Editor,
	page: Page,
	text: string
) {
	const buttonText = editor.canvas.getByRole( 'textbox', {
		name: 'Button text',
	} );
	await expect( buttonText ).toBeVisible();
	await buttonText.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( text );
}

async function getPageState( page: Page ) {
	return page.evaluate( () => ( {
		isSaving: ( window as any ).wp.data
			.select( 'core/editor' )
			.isSavingPost(),
		title:
			( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostAttribute( 'title' ) ?? '',
	} ) );
}

function isPostSaveRequest( url: string, postId: number ) {
	return url.includes( `/wp/v2/posts/${ postId }` );
}

async function observeSaveBehavior(
	primaryPage: Page,
	collaboratorPage: Page,
	postId: number,
	counters: SaveCounters,
	label: string
) {
	const startedAt = Date.now();
	const samples: Sample[] = [];

	for ( let index = 0; index < 36; index++ ) {
		const [ primaryState, collaboratorState ] = await Promise.all( [
			getPageState( primaryPage ),
			getPageState( collaboratorPage ),
		] );
		samples.push( {
			collaboratorSaving: collaboratorState.isSaving,
			collaboratorTitle: collaboratorState.title,
			combinedPostRequests: counters.primary + counters.collaborator,
			elapsedMs: Date.now() - startedAt,
			label: `${ label }-${ index }`,
			primarySaving: primaryState.isSaving,
			primaryTitle: primaryState.title,
			savePostsByCollaborator: counters.collaborator,
			savePostsByPrimary: counters.primary,
		} );
		await primaryPage.waitForTimeout( 250 );
	}

	const finalTail = samples.slice( -8 );
	const stillSaving = finalTail.some(
		( sample ) => sample.primarySaving || sample.collaboratorSaving
	);

	return {
		outcome: stillSaving ? 'saving-stuck' : 'settled',
		postId,
		samples,
	} as const;
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	name,
	page,
	requestUtils,
	saveBy,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: string;
	page: Page;
	requestUtils: any;
	saveBy: 'collaborator' | 'primary';
} ): Promise< ScenarioResult > {
	const suffix = `${ name }-${ Date.now() }`;
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ suffix } initial title`,
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	const counters: SaveCounters = { collaborator: 0, primary: 0 };
	page.on( 'request', ( request ) => {
		if (
			request.method() === 'POST' &&
			isPostSaveRequest( request.url(), post.id )
		) {
			counters.primary++;
		}
	} );
	collaboratorPage.on( 'request', ( request ) => {
		if (
			request.method() === 'POST' &&
			isPostSaveRequest( request.url(), post.id )
		) {
			counters.collaborator++;
		}
	} );

	try {
		await appendParagraphAfterLastBlock(
			editor,
			page,
			`primary-first-paragraph ${ suffix }`
		);
		await editSecondTableCell(
			collaboratorEditor,
			collaboratorPage,
			`collaborator-table ${ suffix }`
		);
		await waitForSessionReady( collaborationUtils );

		await typePostTitle(
			editor,
			page,
			`primary-first-title ${ suffix }`
		);
		await editor.saveDraft();
		await waitForSessionReady( collaborationUtils );

		await editSearchButtonText(
			editor,
			page,
			`primary-search-button ${ suffix }`
		);
		await appendParagraphAfterLastBlock(
			collaboratorEditor,
			collaboratorPage,
			`collaborator-second-paragraph ${ suffix }`
		);
		await typePostTitle(
			collaboratorEditor,
			collaboratorPage,
			`collaborator-second-title ${ suffix }`
		);

		for ( let index = 0; index < 20; index++ ) {
			const [ primaryState, collaboratorState ] = await Promise.all( [
				getPageState( page ),
				getPageState( collaboratorPage ),
			] );
			if (
				primaryState.title === collaboratorState.title &&
				primaryState.title.includes( `${ suffix }` )
			) {
				break;
			}
			await page.waitForTimeout( 250 );
		}

		if ( saveBy === 'collaborator' ) {
			await collaboratorEditor.saveDraft();
		} else {
			await editor.saveDraft();
		}

		return {
			counters,
			name,
			observation: await observeSaveBehavior(
				page,
				collaboratorPage,
				post.id,
				counters,
				name
			),
		};
	} catch ( error ) {
		return {
			counters,
			error: error instanceof Error ? error.stack ?? error.message : String( error ),
			name,
		};
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of [
	{ name: 'save-by-collaborator', saveBy: 'collaborator' as const },
	{ name: 'save-by-primary', saveBy: 'primary' as const },
] ) {
	test( scenario.name, async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 240000 );

		const result = await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			name: scenario.name,
			page,
			requestUtils,
			saveBy: scenario.saveBy,
		} );
		writeScenarioResult( result );
		expect( result.error ).toBeUndefined();
		expect( result.observation?.outcome ).toBe( 'settled' );
	} );
}
