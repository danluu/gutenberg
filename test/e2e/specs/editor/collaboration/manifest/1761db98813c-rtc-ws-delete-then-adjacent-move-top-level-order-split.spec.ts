import fs from 'fs';
import path from 'path';

import { request, type Page } from '@playwright/test';
import {
	expect,
	RequestUtils,
	test as base,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	requestUtils: RequestUtils;
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	primarySummary: string[];
	secondaryState: unknown;
	secondarySummary: string[];
};

type AttemptResult = {
	attempt: number;
	convergenceError?: string;
	error?: string;
	postId?: number;
	reproduced: boolean;
	scenario: string;
	snapshots: Snapshot[];
};

type Scenario = {
	name: string;
	runMove: ( page: Page, editor: Editor ) => Promise< void >;
};

const OUTPUT_DIR =
	process.env.RTC_1761_OUTPUT_DIR ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-17-20260504T165737Z/.triage-watcher/signatures/1761db98813c/repro-results';
const ATTEMPTS = Number.parseInt( process.env.RTC_1761_ATTEMPTS ?? '2', 10 );
const STORAGE_STATE_PATH =
	process.env.RTC_1761_STORAGE_STATE_PATH ??
	'/Users/danluu/dev/fuzz/gutenberg-fuzz-fixed-base-20260505/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-17-20260504T165737Z/.triage-watcher/signatures/1761db98813c/admin-shared-safe.json';

const TITLE = 'RTC seed 956577 initial title';
const HEADING_TEXT = 'Seed 956577 multibyte heading';
const PARAGRAPH_TEXT =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const TRAILING_TEXT =
	'Another paragraph exists so the top-level list is not degenerate.';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ PARAGRAPH_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ TRAILING_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

async function ensureCollaborationEnabled( requestUtils: any ) {
	const response = await requestUtils.request.get(
		'/wp-admin/options-writing.php'
	);
	const html = await response.text();
	const nonce = html.match(
		/name="_wpnonce"[^>]*value="([^"]+)"/
	)?.[ 1 ];

	if ( ! nonce ) {
		throw new Error(
			'Could not find the collaboration settings nonce on options-writing.php.'
		);
	}

	await requestUtils.request.post( '/wp-admin/options.php', {
		failOnStatusCode: true,
		form: {
			option_page: 'writing',
			action: 'update',
			_wpnonce: nonce,
			_wp_http_referer: '/wp-admin/options-writing.php',
			submit: 'Save Changes',
			default_category: 1,
			default_post_format: 0,
			wp_collaboration_enabled: 1,
		},
	} );
}

const test = base.extend< Fixtures >( {
	requestUtils: async ( {}, use ) => {
		const requestContext = await request.newContext( {
			baseURL: process.env.WP_BASE_URL || 'http://localhost:8995',
			storageState: STORAGE_STATE_PATH,
		} );
		const requestUtils = new RequestUtils( requestContext, {
			storageStatePath: STORAGE_STATE_PATH,
		} );
		await requestUtils.setupRest();
		await use( requestUtils );
		await requestContext.dispose();
	},
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

		await ensureCollaborationEnabled( requestUtils );
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
			username: `rtc1761${ uniqueSuffix }`,
			email: `rtc1761+${ uniqueSuffix }@example.com`,
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

const SCENARIOS: Scenario[] = [
	{
		name: 'delete-trailing-paragraph-then-move-heading-down',
		runMove: async ( page, editor ) => {
			await selectCanvasBlock( page, editor, HEADING_TEXT );
			await moveSelectedBlock( page, editor, 'down' );
		},
	},
	{
		name: 'delete-trailing-paragraph-then-move-paragraph-up',
		runMove: async ( page, editor ) => {
			await selectCanvasBlock( page, editor, PARAGRAPH_TEXT );
			await moveSelectedBlock( page, editor, 'up' );
		},
	},
];

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function summarizeState( state: any ): string[] {
	if ( ! state?.blocks || ! Array.isArray( state.blocks ) ) {
		return [];
	}

	return state.blocks.map( ( block: any, index: number ) => {
		const content =
			typeof block?.attributes?.content === 'string'
				? block.attributes.content
				: '';
		return `${ index }:${ block?.name ?? 'unknown' }:${ content.slice(
			0,
			60
		) }`;
	} );
}

function writeAttemptResult( result: AttemptResult ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`${ result.scenario }-attempt-${ result.attempt }.json`
		),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await Promise.all(
		collaborationUtils.allPages.map( ( currentPage ) =>
			expect(
				currentPage.getByRole( 'button', {
					name: /Collaborators list/i,
				} )
			).toBeVisible( { timeout: 20000 } )
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
			{ includeCrdtDocument: true }
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 ),
			{ includeCrdtDocument: true }
		),
	] );

	return {
		label,
		primaryState,
		primarySummary: summarizeState( primaryState ),
		secondaryState,
		secondarySummary: summarizeState( secondaryState ),
	};
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.bringToFront();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function deleteTrailingParagraph(
	page: Page,
	editor: Editor
) {
	await selectCanvasBlock( page, editor, TRAILING_TEXT );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
	await expect(
		editor.canvas.getByText( TRAILING_TEXT, { exact: false } )
	).toHaveCount( 0 );
}

async function selectCanvasBlock( page: Page, editor: Editor, text: string ) {
	await clearTransientUi( page, editor );
	const block = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
}

async function moveSelectedBlock(
	page: Page,
	editor: Editor,
	direction: 'up' | 'down'
) {
	await page.bringToFront();
	await editor.showBlockToolbar();
	const button = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', {
			name: direction === 'down' ? 'Move down' : 'Move up',
		} );
	await expect( button ).toBeEnabled();
	await button.click();
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		test( `${ scenario.name } attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const result: AttemptResult = {
				attempt,
				reproduced: false,
				scenario: scenario.name,
				snapshots: [],
			};

			const post = await requestUtils.createPost( {
				content: INITIAL_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: TITLE,
			} );
			result.postId = post.id;

			try {
				await collaborationUtils.openPost( post.id );
				await collaborationUtils.joinUser( post.id, collaboratorUser );
				await waitForSessionReady( collaborationUtils );
				result.snapshots.push(
					await captureSnapshot( collaborationUtils, 'after-open' )
				);

				await deleteTrailingParagraph( page, editor );
				await collaborationUtils.waitForConvergence( {
					timeout: 20000,
				} );
				result.snapshots.push(
					await captureSnapshot( collaborationUtils, 'after-delete' )
				);

				await scenario.runMove( page, editor );

				try {
					await collaborationUtils.waitForConvergence( {
						timeout: 20000,
					} );
					result.snapshots.push(
						await captureSnapshot( collaborationUtils, 'after-move' )
					);
				} catch ( error ) {
					result.convergenceError = formatError( error );
					result.reproduced =
						result.convergenceError.includes(
							'Collaborative state did not converge'
						);
					result.snapshots.push(
						await captureSnapshot(
							collaborationUtils,
							'after-move-failure'
						)
					);
					if ( ! result.reproduced ) {
						throw error;
					}
				}
			} catch ( error ) {
				if ( ! result.reproduced ) {
					result.error = formatError( error );
				}
			} finally {
				writeAttemptResult( result );
			}

			if ( result.error ) {
				throw new Error( result.error );
			}
		} );
	}
}
