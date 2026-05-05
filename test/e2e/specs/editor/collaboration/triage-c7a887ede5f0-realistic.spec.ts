import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
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

type Snapshot = {
	label: string;
	primaryState: unknown;
	secondaryState: unknown;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_C7A887_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TITLE = 'rtc-save-title-marker-953034-2-0-end';
const TAIL_CONTENT = [
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<li>List item one for block movement.</li>',
	'<li>List item two for delete coverage.</li>',
	'<li>List item three for sync coverage.</li>',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:heading {"level":4} -->',
	'<h4 class="wp-block-heading">Seed 953034 step 2 user 0 heading</h4>',
	'<!-- /wp:heading -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote"><p>Quoted content for merge and persistence checks.</p><cite>RTC Fuzzer</cite></blockquote>',
	'<!-- /wp:quote -->',
	'<!-- wp:pullquote {"value":"","citation":"<em>alpha</em><strong>beta</strong>"} -->',
	'<figure class="wp-block-pullquote"><blockquote><p></p><cite><em>alpha</em><strong>beta</strong></cite></blockquote></figure>',
	'<!-- /wp:pullquote -->',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-953034-2-0-end</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find rtc-save-search-option-marker-953034-2-0-end","label":"Search label rtc-save-search-option-marker-953034-2-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-953034-2-0-end","showLabel":true} /-->',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>initial row 1 A seed 953034 step 4 user 1</td><td>initial row 1 B seed 953034 step 4 user 1</td></tr><tr><td>initial row 2 A seed 953034 step 4 user 1</td><td>initial row 2 B seed 953034 step 4 user 1</td></tr></tbody></table></figure>',
	'<!-- /wp:table -->',
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
	'<!-- wp:paragraph -->',
	'<p><em>italic</em><em>italic</em></p>',
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
			username: `rtcc7a${ uniqueSuffix }`,
			email: `rtcc7a+${ uniqueSuffix }@example.com`,
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
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 20000,
			} )
		)
	);
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ],
			{
				includeCrdtDocument: true,
			}
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ), {
			includeCrdtDocument: true,
		} ),
	] );

	return {
		label,
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

async function selectCanvasBlock(
	page: Page,
	editor: Editor,
	selector: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const block = editor.canvas.locator( selector ).first();
	await expect( block ).toBeVisible();
	await block.click( {
		position: {
			x: 12,
			y: 12,
		},
	} );
}

async function moveSelectedDown(
	page: Page,
	editor: Editor,
	count: number
) {
	await editor.showBlockToolbar();
	const button = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	for ( let index = 0; index < count; index++ ) {
		await expect( button ).toBeEnabled();
		await button.click();
	}
}

async function deleteThirdListItem( page: Page, editor: Editor ) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const thirdItem = editor.canvas.getByText(
		'List item three for sync coverage.',
		{
			exact: false,
		}
	);
	await expect( thirdItem ).toBeVisible();
	await thirdItem.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await expect( thirdItem ).toBeHidden( { timeout: 10000 } );
}

async function reloadEditorPage(
	page: Page,
	collaborationUtils: CollaborationUtilsClass
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 20000,
	} );
	await waitForSessionReady( collaborationUtils );
}

async function dragTopLevelPullquoteIntoGroup(
	page: Page,
	editor: Editor
) {
	await clearTransientUi( page, editor );
	const groupBlock = editor.canvas.getByRole( 'document', {
		name: 'Block: Group',
	} );
	const pullquoteText = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );

	await expect( pullquoteText ).toBeVisible();
	await expect( groupBlock ).toBeVisible();

	await pullquoteText.click();
	await editor.showBlockToolbar();
	const dragHandle = page.locator(
		'role=toolbar[name="Block tools"i] >> role=button[name="Drag"i][include-hidden]'
	);
	await dragHandle.hover();
	await page.mouse.down();
	const groupBox = await groupBlock.boundingBox();
	if ( ! groupBox ) {
		throw new Error( 'Could not determine group block position.' );
	}
	await page.mouse.move(
		groupBox.x + groupBox.width * 0.5,
		groupBox.y + groupBox.height * 0.5,
		{ steps: 20 }
	);
	await page.mouse.up();
}

test.describe.configure( { mode: 'serial' } );

test( 'step5-seeded search-table-reload-moves', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const result: ScenarioResult = {
		name: 'step5-seeded-search-table-reload-moves',
		name: 'tail-seeded-search-table-reload-moves',
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: TAIL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-open' )
		);

		await deleteThirdListItem( page, editor );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-list-delete' )
		);

		await reloadEditorPage( collaboratorPage, collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-reload' )
		);

		await selectCanvasBlock(
			collaboratorPage,
			collaboratorEditor,
			'[data-type="core/search"]'
		);
		await moveSelectedDown( collaboratorPage, collaboratorEditor, 1 );
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot( collaborationUtils, 'after-search-move' )
		);

		await dragTopLevelPullquoteIntoGroup( page, editor );
		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 20000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				result.convergenceError
					? 'after-failed-convergence'
					: 'after-convergence'
			)
		);
		result.reproduced = !! result.convergenceError;
	} catch ( error ) {
		result.error = formatError( error );
	}

	writeScenarioResult( result );
	expect( result.error ).toBeUndefined();
} );
