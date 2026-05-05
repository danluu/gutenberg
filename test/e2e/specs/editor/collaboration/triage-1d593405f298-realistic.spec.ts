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
	collaboratorCrdtLength: number;
	collaboratorSaving: boolean;
	collaboratorTitle: string;
	elapsedMs: number;
	label: string;
	primaryCrdtLength: number;
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
		outcome: 'post-loop' | 'saving-stuck' | 'settled';
		persistedCrdtLength: number;
		persistedTitle: string;
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
			username: `rtcrepro${ uniqueSuffix }`,
			email: `rtcrepro+${ uniqueSuffix }@example.com`,
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
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">RTC realistic save loop heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>RTC realistic paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>RTC realistic paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A</td><td>initial row 1 B</td></tr><tr><td>initial row 2 A</td><td>initial row 2 B</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
	'<!-- wp:search {"label":"RTC realistic initial search label","placeholder":"RTC realistic initial search placeholder","buttonText":"RTC realistic initial search button","buttonPosition":"button-inside"} /-->',
].join( '\n' );

function writeScenarioResult( result: ScenarioResult ) {
	const outputDir = process.env.RTC_SAVE_LOOP_REPRO_DIR;
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
	await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 15000,
	} );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

async function openFreshParagraph( page: Page ) {
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
}

async function appendParagraphAtEnd( editor: Editor, page: Page, text: string ) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
}

async function insertPullquoteAtEnd(
	editor: Editor,
	page: Page,
	quote: string,
	citation: string
) {
	await openFreshParagraph( page );
	await page.keyboard.type( '/pullquote' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.type( quote );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( citation );
}

async function editSecondTableCell( editor: Editor, page: Page, nextText: string ) {
	const secondCell = editor.canvas
		.getByRole( 'textbox', { name: 'Body cell text' } )
		.nth( 1 );
	await secondCell.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( nextText );
}

async function getPageState( page: Page ) {
	return page.evaluate( () => {
		const postId = ( window as any ).wp.data
			.select( 'core/editor' )
			.getCurrentPostId();
		const record = ( window as any ).wp.data
			.select( 'core' )
			.getEntityRecord( 'postType', 'post', postId );

		return {
			crdtLength: record?.meta?._crdt_document?.length ?? 0,
			isSaving: ( window as any ).wp.data
				.select( 'core/editor' )
				.isSavingPost(),
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
		};
	} );
}

function isPostSaveRequest( url: string, postId: number ) {
	return (
		url.includes( `/wp/v2/posts/${ postId}` ) ||
		url.includes( `%2Fwp%2Fv2%2Fposts%2F${ postId}` )
	);
}

async function observeSaveBehavior(
	primaryPage: Page,
	collaboratorPage: Page,
	postId: number,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	counters: SaveCounters,
	label: string
) {
	const startedAt = Date.now();
	const samples: Sample[] = [];

	for ( let index = 0; index < 24; index++ ) {
		const [ primaryState, collaboratorState ] = await Promise.all( [
			getPageState( primaryPage ),
			getPageState( collaboratorPage ),
		] );
		samples.push( {
			collaboratorCrdtLength: collaboratorState.crdtLength,
			collaboratorSaving: collaboratorState.isSaving,
			collaboratorTitle: collaboratorState.title,
			elapsedMs: Date.now() - startedAt,
			label: `${ label }-${ index }`,
			primaryCrdtLength: primaryState.crdtLength,
			primarySaving: primaryState.isSaving,
			primaryTitle: primaryState.title,
			savePostsByCollaborator: counters.collaborator,
			savePostsByPrimary: counters.primary,
		} );
		await primaryPage.waitForTimeout( 250 );
	}

	const persistedPost = await requestUtils.rest< {
		meta?: { _crdt_document?: string | null };
		title?: { raw?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'meta,title.raw',
		},
	} );
	const finalTail = samples.slice( -6 );
	const stillSaving = finalTail.some(
		( sample ) => sample.primarySaving || sample.collaboratorSaving
	);
	const distinctCrdtPairs = new Set(
		samples.map(
			( sample ) =>
				`${ sample.primaryCrdtLength }:${ sample.collaboratorCrdtLength }`
		)
	);
	const postLoopDetected =
		! stillSaving &&
		counters.primary + counters.collaborator >= 6 &&
		distinctCrdtPairs.size > 2;

	return {
		outcome: stillSaving
			? 'saving-stuck'
			: postLoopDetected
				? 'post-loop'
				: 'settled',
		persistedCrdtLength:
			persistedPost.meta?._crdt_document?.length ?? 0,
		persistedTitle: persistedPost.title?.raw ?? '',
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
	reloadBeforeSecondSave,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	name: string;
	page: Page;
	requestUtils: any;
	reloadBeforeSecondSave: boolean;
} ): Promise< ScenarioResult > {
	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ name } initial title`,
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );

	const counters: SaveCounters = {
		collaborator: 0,
		primary: 0,
	};
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
		const marker = `${ name }-${ Date.now() }`;

		await editSecondTableCell(
			editor,
			page,
			`table-option ${ marker }`
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`paragraph ${ marker }`
		);
		await waitForSessionReady( collaborationUtils );

		await typeTitle(
			collaboratorEditor,
			collaboratorPage,
			`rtc-save-marker-${ marker }-title`
		);
		await collaboratorEditor.saveDraft();
		await waitForSessionReady( collaborationUtils );

		if ( reloadBeforeSecondSave ) {
			await page.reload( { waitUntil: 'domcontentloaded' } );
			await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 15000,
			} );
			await waitForSessionReady( collaborationUtils );

			await appendParagraphAtEnd(
				editor,
				page,
				`after-reload ${ marker }`
			);
			await typeTitle(
				editor,
				page,
				`rtc-save-marker-${ marker }-second-title`
			);
			await editor.saveDraft();
		} else {
			await collaboratorEditor.saveDraft();
		}

		return {
			counters,
			name,
			observation: await observeSaveBehavior(
				page,
				collaboratorPage,
				post.id,
				requestUtils,
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

for ( const scenario of [
	{
		name: 'plain-pullquote-checkpoint',
		reloadBeforeSecondSave: false,
	},
	{
		name: 'reload-double-save-checkpoint',
		reloadBeforeSecondSave: true,
	},
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
			reloadBeforeSecondSave: scenario.reloadBeforeSecondSave,
		} );
		writeScenarioResult( result );
		expect( result.error ).toBeUndefined();
		expect( result.observation?.outcome ).toBe( 'settled' );
	} );
}
