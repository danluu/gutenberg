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

type LocalSnapshot = {
	blockNames: string[];
	editedContent: string;
	isSavingPost: boolean;
	title: string;
};

type ScenarioResult = {
	error?: string;
	localAfterSave?: {
		collaborator: LocalSnapshot;
		primary: LocalSnapshot;
	};
	name: string;
	observedCorruption: boolean;
	persistedContent?: string;
	persistedTitle?: string;
	saveError?: string;
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
			username: `rtc2f06${ uniqueSuffix }`,
			email: `rtc2f06+${ uniqueSuffix }@example.com`,
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

const OUTPUT_DIR =
	process.env.RTC_TRIAGE_OUTPUT_DIR ||
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/2f060b0d43fe/realistic-repro-results';

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953213 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function writeScenarioResult( result: ScenarioResult ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function contentLooksCorrupted( content: string ) {
	return /wp:par+r+agraph|wp:pa<\/h2>|wp:post-content|wheading|grouheading|paragragraph/.test(
		content
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function insertBlockFromInserter( page: Page, blockName: string ) {
	const searchBox = page.getByRole( 'searchbox', { name: 'Search' } );
	if ( ! ( await searchBox.isVisible().catch( () => false ) ) ) {
		await page
			.getByRole( 'button', { name: 'Block Inserter', exact: true } )
			.click();
	}
	await searchBox.fill( blockName );
	await page.getByRole( 'option', { name: blockName, exact: true } ).click();
}

async function appendToParagraph(
	editor: Editor,
	page: Page,
	index: number,
	text: string
) {
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.nth( index );
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( text, { delay: 20 } );
}

async function insertHeadingAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await insertBlockFromInserter( page, 'Heading' );
	await page.keyboard.type( text, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function insertGroupAtEnd(
	editor: Editor,
	page: Page,
	groupParagraph: string,
	groupHeading: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await insertBlockFromInserter( page, 'Group' );
	await editor.canvas
		.getByRole( 'button', {
			name: 'Group: Gather blocks in a container.',
		} )
		.click();
	await page.keyboard.type( groupParagraph, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await insertBlockFromInserter( page, 'Heading' );
	await page.keyboard.type( groupHeading, { delay: 20 } );
	await page.keyboard.press( 'Escape' );
}

async function appendCheckpoint(
	editor: Editor,
	page: Page,
	paragraphText: string,
	titleText: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( paragraphText, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await insertBlockFromInserter( page, 'Search' );

	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( titleText, { delay: 20 } );
}

async function getLocalSnapshot( page: Page ): Promise< LocalSnapshot > {
	return page.evaluate( () => ( {
		blockNames: ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block: { name: string } ) => block.name ),
		editedContent: ( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostContent(),
		isSavingPost: ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		title: ( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' ),
	} ) );
}

async function settleSavingState( page: Page ) {
	try {
		await page.waitForFunction(
			() => ! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
			undefined,
			{ timeout: 15000 }
		);
	} catch {}
}

async function runScenario( {
	collaborationUtils,
	collaboratorEditor,
	collaboratorPage,
	editor,
	name,
	page,
	postId,
	requestUtils,
	saveFrom,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorEditor: Editor;
	collaboratorPage: Page;
	editor: Editor;
	name: string;
	page: Page;
	postId: number;
	requestUtils: any;
	saveFrom: 'collaborator' | 'primary';
} ) {
	const result: ScenarioResult = {
		name,
		observedCorruption: false,
	};

	try {
		await appendToParagraph(
			collaboratorEditor,
			collaboratorPage,
			0,
			` ${ name } step0`
		);
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );

		await appendToParagraph( editor, page, 1, ` ${ name } step1` );
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );

		await reloadAndWait( page, collaborationUtils );

		await insertHeadingAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`${ name } heading`
		);
		await collaborationUtils.waitForConvergence( { timeout: 15000 } );

		await insertGroupAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`${ name } nested paragraph`,
			`${ name } nested heading`
		);
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );

		if ( saveFrom === 'primary' ) {
			await appendCheckpoint(
				editor,
				page,
				`${ name } checkpoint paragraph`,
				`${ name } checkpoint title`
			);
			await editor.saveDraft();
		} else {
			await appendCheckpoint(
				collaboratorEditor,
				collaboratorPage,
				`${ name } checkpoint paragraph`,
				`${ name } checkpoint title`
			);
			await collaboratorEditor.saveDraft();
		}
	} catch ( error ) {
		result.saveError =
			error instanceof Error ? error.stack || error.message : String( error );
	}

	await Promise.all( [ settleSavingState( page ), settleSavingState( collaboratorPage ) ] );

	try {
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 10000,
		} );
	} catch ( error ) {
		result.error =
			error instanceof Error ? error.stack || error.message : String( error );
	}

	const persistedPost = await requestUtils.rest< {
		content: { raw: string };
		title: { raw: string };
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw,title.raw',
		},
	} );
	result.persistedContent = persistedPost.content.raw;
	result.persistedTitle = persistedPost.title.raw;
	result.localAfterSave = {
		collaborator: await getLocalSnapshot( collaboratorPage ),
		primary: await getLocalSnapshot( page ),
	};
	result.observedCorruption =
		contentLooksCorrupted( result.persistedContent ) ||
		contentLooksCorrupted( result.localAfterSave.primary.editedContent ) ||
		contentLooksCorrupted( result.localAfterSave.collaborator.editedContent ) ||
		result.localAfterSave.primary.isSavingPost ||
		result.localAfterSave.collaborator.isSavingPost;

	writeScenarioResult( result );

	expect( result.saveError, result.saveError ).toBeUndefined();
	expect(
		result.observedCorruption,
		result.error || result.saveError || 'scenario converged without corruption'
	).toBe( false );
}

test.describe( 'RTC realistic triage 2f060b0d43fe', () => {
	test.describe.configure( { mode: 'serial' } );

	for ( const saveFrom of [ 'primary', 'collaborator' ] as const ) {
		test( `reload plus heading/group edits stay healthy when ${ saveFrom } saves`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const name = `reload-heading-group-${ saveFrom }-save`;
			const post = await requestUtils.createPost( {
				content: INITIAL_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: `${ name } initial ${ Date.now() }`,
			} );

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			await runScenario( {
				collaborationUtils,
				collaboratorEditor,
				collaboratorPage,
				editor,
				name,
				page,
				postId: post.id,
				requestUtils,
				saveFrom,
			} );
		} );
	}
} );
