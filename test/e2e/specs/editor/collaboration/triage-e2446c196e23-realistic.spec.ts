import fs from 'fs';
import path from 'path';

import type { Editor, Page } from '@wordpress/e2e-test-utils-playwright';
import {
	expect,
	test as base,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ScenarioName =
	| 'tab-indent'
	| 'listview-drag'
	| 'canvas-drag';

type ScenarioResult = {
	actorNested: boolean;
	actorState?: unknown;
	convergenceError?: string;
	moveAppliedOnActor: boolean;
	name: ScenarioName;
	peerResponsive: boolean;
	peerState?: unknown;
	postId?: number;
	reproduced: boolean;
};

const OUTPUT_DIR =
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-13-20260502T225226Z/.triage-watcher/signatures/e2446c196e23/realistic-results';
const TITLE = 'RTC seed 952967 realistic move probe';
const MOVED_PARAGRAPH = 'rtc-save-paragraph-marker-952967-3-1-end';
const TARGET_GROUP_PARAGRAPH = 'Seed 952967 step 7 user 1 nested paragraph';

const PRESEEDED_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 4 user 1 updated paragraph 675088</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 6 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952967 step 6 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 10 user 1 paragraph 794186</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 3 user 0 paragraph 125702</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p><em>italic</em><em>italic</em></p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 7 user 1 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 952967 step 7 user 1 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952967-3-1-end","placeholder":"Search placeholder rtc-save-search-option-marker-952967-3-1-end","buttonText":"Find rtc-save-search-option-marker-952967-3-1-end","buttonPosition":"button-inside"} /-->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 952967 step 5 user 0 paragraph 575839</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>rtc-save-paragraph-marker-952967-6-0-end</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:search {"label":"Search label rtc-save-search-option-marker-952967-6-0-end","placeholder":"Search placeholder rtc-save-search-option-marker-952967-6-0-end","buttonText":"Find rtc-save-search-option-marker-952967-6-0-end","buttonPosition":"button-inside"} /-->',
	'',
	'<!-- wp:table {"hasFixedLayout":true} -->',
	'<figure class="wp-block-table"><table><tbody>',
	'<tr><td>initial row 1 A seed 952967 step 9 user 0</td><td>initial row 1 B seed 952967 step 9 user 0</td></tr>',
	'<tr><td>initial row 2 A seed 952967 step 9 user 0</td><td>initial row 2 B seed 952967 step 9 user 0</td></tr>',
	'</tbody></table></figure>',
	'<!-- /wp:table -->',
].join( '\n' );

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
			username: `rtce2446r${ uniqueSuffix }`,
			email: `rtce2446r+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Realistic',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: ScenarioResult ) {
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

async function getStateWithTimeout(
	collaborationUtils: CollaborationUtilsClass,
	page: Page,
	timeoutMs = 5000
) {
	return Promise.race( [
		collaborationUtils.getNormalizedPostState( page, {
			includeCrdtDocument: true,
		} ),
		new Promise( ( _, reject ) =>
			setTimeout(
				() =>
					reject(
						new Error(
							`Timed out after ${ timeoutMs }ms waiting for normalized state.`
						)
					),
				timeoutMs
			)
		),
	] );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

function paragraphNestedInTargetGroup( state: any ) {
	const groups = ( state?.blocks ?? [] ).filter(
		( block: any ) => block.name === 'core/group'
	);
	return groups.some( ( group: any ) => {
		const texts = ( group.innerBlocks ?? [] ).map(
			( inner: any ) => inner.attributes?.content
		);
		return (
			texts.includes( TARGET_GROUP_PARAGRAPH ) &&
			texts.includes( MOVED_PARAGRAPH )
		);
	} );
}

async function selectMovedParagraph( page: Page, editor: Editor ) {
	const paragraph = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( { hasText: MOVED_PARAGRAPH } )
		.first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	return paragraph;
}

async function moveByTabIndent( page: Page, editor: Editor ) {
	await selectMovedParagraph( page, editor );
	await page.keyboard.press( 'Tab' );
}

async function moveByListViewDrag( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const paragraphRow = overview.getByRole( 'gridcell' ).filter( {
		hasText: MOVED_PARAGRAPH,
	} ).first();
	const groupRows = overview.getByRole( 'gridcell' ).filter( {
		hasText: 'Group',
	} );
	const groupRow = groupRows.last();
	await expect( paragraphRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await paragraphRow.dragTo( groupRow );
}

async function moveByCanvasDrag( page: Page, editor: Editor ) {
	const paragraph = await selectMovedParagraph( page, editor );
	const target = editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( { hasText: TARGET_GROUP_PARAGRAPH } )
		.first();
	await expect( target ).toBeVisible();
	const startBox = await paragraph.boundingBox();
	const targetBox = await target.boundingBox();
	if ( ! startBox || ! targetBox ) {
		throw new Error( 'Missing drag bounding box.' );
	}
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2
	);
	await page.mouse.down();
	await page.mouse.move(
		targetBox.x + 32,
		targetBox.y + targetBox.height / 3,
		{ steps: 12 }
	);
	await page.mouse.up();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	move,
	name,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	move: ( page: Page, editor: Editor ) => Promise< void >;
	name: ScenarioName;
	requestUtils: any;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		actorNested: false,
		moveAppliedOnActor: false,
		name,
		peerResponsive: true,
		reproduced: false,
	};

	const post = await requestUtils.createPost( {
		content: PRESEEDED_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: TITLE,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForSessionReady( collaborationUtils );

		await move( collaborationUtils.allPages[ 0 ], editor );
		await collaborationUtils.allPages[ 0 ].waitForTimeout( 1000 );

		try {
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		try {
			result.actorState = await getStateWithTimeout(
				collaborationUtils,
				collaborationUtils.allPages[ 0 ]
			);
		} catch ( error ) {
			result.actorState = { error: formatError( error ) };
		}

		try {
			result.peerState = await getStateWithTimeout(
				collaborationUtils,
				collaboratorPage
			);
		} catch ( error ) {
			result.peerResponsive = false;
			result.peerState = { error: formatError( error ) };
		}

		result.actorNested = paragraphNestedInTargetGroup( result.actorState );
		result.moveAppliedOnActor = result.actorNested;
		result.reproduced =
			result.moveAppliedOnActor &&
			( ! result.peerResponsive || !! result.convergenceError );
	} catch ( error ) {
		result.convergenceError = formatError( error );
	}

	return result;
}

test.describe.serial( 'RTC 952967 realistic move attempts', () => {
	test.setTimeout( 180000 );

	const scenarios: Array< {
		name: ScenarioName;
		move: ( page: Page, editor: Editor ) => Promise< void >;
	} > = [
		{ name: 'tab-indent', move: moveByTabIndent },
		{ name: 'listview-drag', move: moveByListViewDrag },
		{ name: 'canvas-drag', move: moveByCanvasDrag },
	];

	for ( const scenario of scenarios ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			requestUtils,
		} ) => {
			const result = await runScenario( {
				collaborationUtils,
				collaboratorUser,
				editor,
				move: scenario.move,
				name: scenario.name,
				requestUtils,
			} );
			writeResult( result );
		} );
	}
} );
