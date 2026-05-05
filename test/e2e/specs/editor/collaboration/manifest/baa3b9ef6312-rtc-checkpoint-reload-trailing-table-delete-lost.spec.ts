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
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	collaboratorState: unknown;
};

type ScenarioResult = {
	attempt: string;
	error?: string;
	outcome: 'converged' | 'diverged';
	postId?: number;
	snapshots: Snapshot[];
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
			username: `rtc152d${ uniqueSuffix }`,
			email: `rtc152d+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Delete',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

const RESULT_DIR = process.env.RTC_152D_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 950586 structured content</h3>',
	'<!-- /wp:heading -->',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 950586 step 2 user 0 heading</h4>',
	'<!-- /wp:heading -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph alpha.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Nested group paragraph beta.</p>',
	'<!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item -->',
	'<li>List item one for block movement.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item two for delete coverage.</li>',
	'<!-- /wp:list-item -->',
	'<!-- wp:list-item -->',
	'<li>List item three for sync coverage.</li>',
	'<!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em><em>italic</em></p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function writeResult( result: ScenarioResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.attempt }.json` ),
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

async function captureSnapshot(
	label: string,
	collaborationUtils: CollaborationUtilsClass,
	primaryPage: Page,
	collaboratorPage: Page
): Promise< Snapshot > {
	return {
		label,
		primaryState: await collaborationUtils.getNormalizedPostState(
			primaryPage,
			{ includeCrdtDocument: true }
		),
		collaboratorState: await collaborationUtils.getNormalizedPostState(
			collaboratorPage,
			{ includeCrdtDocument: true }
		),
	};
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 15 } );
	await expect( titleBox ).toContainText( title );
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( text, { delay: 10 } );
	await expect( editor.canvas.getByText( text ) ).toBeVisible();
}

async function insertSearchBlockAtEnd( editor: Editor, page: Page ) {
	await editor.canvas.getByRole( 'document' ).last().click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/search' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Search' } ).last()
	).toBeVisible();
}

async function saveDraft( page: Page ) {
	const saveButton = page.getByRole( 'button', { name: 'Save draft' } );
	await expect( saveButton ).toBeEnabled( { timeout: 20000 } );
	await saveButton.click();
	await expect(
		page
			.getByTestId( 'snackbar' )
			.getByText( /Draft saved|Draft saved by/ )
			.first()
	).toBeVisible( { timeout: 20000 } );
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
}

async function insertTableAtEnd(
	editor: Editor,
	page: Page,
	marker: string
) {
	await editor.canvas
		.getByRole( 'document', { name: 'Block: Search' } )
		.last()
		.click();
	await page.keyboard.press( 'ControlOrMeta+Alt+y' );
	await page.keyboard.type( '/table' );
	await expect(
		page.getByRole( 'option', { name: 'Table', selected: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.press( 'Space' );
	await expect(
		editor.canvas.getByRole( 'document', { name: 'Block: Table' } ).last()
	).toBeVisible();
	await page.keyboard.type( marker, { delay: 10 } );
	await page.keyboard.press( 'ArrowRight' );
	await page.keyboard.type( `${ marker } sibling`, { delay: 10 } );
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page
		.locator( '[role="menu"]' )
		.last()
		.getByRole( 'menuitem', { name: /^Delete/ } )
		.click();
}

test( 'realistic table delete after checkpoint reload stays converged', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const attempt = `realistic-table-delete-after-checkpoint-${ Date.now() }`;
	const checkpointMarker = `rtc-save-paragraph-marker-realistic-${ Date.now() }`;
	const titleMarker = `rtc-save-title-marker-realistic-${ Date.now() }`;
	const tableMarker = `rtc-table-marker-realistic-${ Date.now() }`;
	const snapshots: Snapshot[] = [];

	const post = await requestUtils.createPost( {
		title: `RTC realistic 152d initial ${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: INITIAL_CONTENT,
	} );

	const result: ScenarioResult = {
		attempt,
		outcome: 'converged',
		postId: post.id,
		snapshots,
	};

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		snapshots.push(
			await captureSnapshot(
				'initial',
				collaborationUtils,
				page,
				collaboratorPage
			)
		);

		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			checkpointMarker
		);
		await insertSearchBlockAtEnd( collaboratorEditor, collaboratorPage );
		await typeTitle( collaboratorEditor, collaboratorPage, titleMarker );
		await saveDraft( collaboratorPage );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
		snapshots.push(
			await captureSnapshot(
				'after-checkpoint-save',
				collaborationUtils,
				page,
				collaboratorPage
			)
		);

		await reloadAndWait( page, collaborationUtils );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
		snapshots.push(
			await captureSnapshot(
				'after-primary-reload',
				collaborationUtils,
				page,
				collaboratorPage
			)
		);

		await insertTableAtEnd( editor, page, tableMarker );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );
		snapshots.push(
			await captureSnapshot(
				'after-primary-table-insert',
				collaborationUtils,
				page,
				collaboratorPage
			)
		);

		await collaboratorEditor.canvas.getByText( tableMarker ).first().click();
		await collaboratorPage.keyboard.press( 'Escape' );
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.outcome = 'diverged';
			result.error =
				error instanceof Error ? error.message : String( error );
			snapshots.push(
				await captureSnapshot(
					'after-collaborator-delete-timeout',
					collaborationUtils,
					page,
					collaboratorPage
				)
			);
			writeResult( result );
			throw error;
		}

		const finalState = await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 5000,
		} );
		snapshots.push(
			await captureSnapshot(
				'after-collaborator-delete',
				collaborationUtils,
				page,
				collaboratorPage
			)
		);
		expect( JSON.stringify( finalState ) ).not.toContain( tableMarker );
		expect( JSON.stringify( finalState ) ).toContain( checkpointMarker );
		expect( JSON.stringify( finalState ) ).toContain( titleMarker );
		expect( JSON.stringify( finalState ) ).toContain( 'core/search' );
	} catch ( error ) {
		result.outcome = 'diverged';
		result.error = error instanceof Error ? error.message : String( error );
		writeResult( result );
		throw error;
	}

	writeResult( result );
} );
