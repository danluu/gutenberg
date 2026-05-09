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

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks?: NormalizedBlock[];
	crdtDocument?: string | null;
	title?: string;
};

type Snapshot = {
	label: string;
	persistedContent: string;
	persistedTitle: string;
	primaryState: NormalizedState;
	secondaryState: NormalizedState;
};

type Scenario = {
	includeReloadBeforeDrag: boolean;
	name: string;
};

type ScenarioResult = {
	convergenceError?: string;
	error?: string;
	immediateSaveError?: string;
	name: string;
	persistenceError?: string;
	postId?: number;
	reproduced: boolean;
	snapshots: Snapshot[];
};

const OUTPUT_DIR = process.env.RTC_8603_REPRO_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TITLE = 'RTC 8603 pullquote into group repro';
const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed-shaped heading</h3>',
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
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		includeReloadBeforeDrag: false,
		name: 'remote-pullquote-drag-into-group',
	},
	{
		includeReloadBeforeDrag: true,
		name: 'remote-pullquote-reload-drag-into-group',
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
			username: `rtc8603${ uniqueSuffix }`,
			email: `rtc8603+${ uniqueSuffix }@example.com`,
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

function stripMarkup( html: unknown ) {
	return String( html ?? '' ).replaceAll( /<[^>]+>/g, '' );
}

function blocksEqual( a: NormalizedBlock[], b: NormalizedBlock[] ) {
	return JSON.stringify( a ) === JSON.stringify( b );
}

function hasTopLevelExtraPullquote(
	longerBlocks: NormalizedBlock[],
	shorterBlocks: NormalizedBlock[]
) {
	if ( longerBlocks.length !== shorterBlocks.length + 1 ) {
		return false;
	}
	const extraBlock = longerBlocks.at( -1 );
	return (
		extraBlock?.name === 'core/pullquote' &&
		blocksEqual( longerBlocks.slice( 0, -1 ), shorterBlocks )
	);
}

function hasDuplicatePullquoteShape(
	primaryState: NormalizedState,
	secondaryState: NormalizedState
) {
	const primaryBlocks = primaryState.blocks ?? [];
	const secondaryBlocks = secondaryState.blocks ?? [];
	return (
		hasTopLevelExtraPullquote( primaryBlocks, secondaryBlocks ) ||
		hasTopLevelExtraPullquote( secondaryBlocks, primaryBlocks )
	);
}

function countOccurrences( value: string, needle: string ) {
	return value.split( needle ).length - 1;
}

function stateHasTopLevelPullquote( state: NormalizedState ) {
	return ( state.blocks ?? [] ).some(
		( block ) => block.name === 'core/pullquote'
	);
}

function groupPullquoteCount( state: NormalizedState ) {
	return ( state.blocks ?? [] )
		.filter( ( block ) => block.name === 'core/group' )
		.reduce(
			( count, block ) =>
				count +
				( block.innerBlocks ?? [] ).filter(
					( innerBlock ) => innerBlock.name === 'core/pullquote'
				).length,
			0
		);
}

function persistedContentHasSingleNestedPullquote( content: string ) {
	const groupStart = content.indexOf( '<!-- wp:group' );
	const groupEnd = content.indexOf( '<!-- /wp:group -->', groupStart );
	const pullquoteStart = content.indexOf( '<!-- wp:pullquote' );

	return (
		countOccurrences( content, '<!-- wp:pullquote' ) === 1 &&
		groupStart !== -1 &&
		groupEnd !== -1 &&
		pullquoteStart > groupStart &&
		pullquoteStart < groupEnd
	);
}

function validateNestedOnlySnapshot( snapshot: Snapshot ) {
	const errors = [];
	for ( const [ label, state ] of [
		[ 'primary', snapshot.primaryState ],
		[ 'secondary', snapshot.secondaryState ],
	] as const ) {
		if ( stateHasTopLevelPullquote( state ) ) {
			errors.push(
				`${ snapshot.label }: ${ label } still has a top-level Pullquote`
			);
		}
		if ( groupPullquoteCount( state ) !== 1 ) {
			errors.push(
				`${ snapshot.label }: ${ label } has ${ groupPullquoteCount(
					state
				) } nested Pullquote blocks in Group`
			);
		}
	}
	if (
		! persistedContentHasSingleNestedPullquote( snapshot.persistedContent )
	) {
		errors.push(
			`${ snapshot.label }: persisted content is not a single Pullquote inside the Group`
		);
	}
	return errors;
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persistedPost ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
		requestUtils.rest< {
			content?: { raw?: string };
			title?: { raw?: string };
		} >( {
			path: `/wp/v2/posts/${ postId }`,
			params: {
				context: 'edit',
				_fields: 'content.raw,title.raw',
			},
		} ),
	] );

	return {
		label,
		persistedContent: persistedPost.content?.raw ?? '',
		persistedTitle: persistedPost.title?.raw ?? '',
		primaryState: primaryState as NormalizedState,
		secondaryState: secondaryState as NormalizedState,
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

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertPullquoteAfterText(
	editor: Editor,
	page: Page,
	anchorText: string
) {
	await clickBlockByText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( '/pullquote' );
	await expect(
		page.locator( '.components-autocomplete__results[role="listbox"]' )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( 'alpha' );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'beta' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( 'plain ' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	await page.keyboard.type( 'text' );
	await page.keyboard.press( `${ MODIFIER_KEY }+B` );

	await expect( quoteBox ).toContainText( 'alpha' );
	await expect( quoteBox ).toContainText( 'beta' );
	await expect( citationBox ).toContainText( 'plain text' );
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

async function dragTopLevelPullquoteIntoGroup( page: Page, editor: Editor ) {
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

async function clickSaveDraft( page: Page ) {
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

function summarizePullquotes( state: NormalizedState ) {
	return ( state.blocks ?? [] )
		.flatMap( ( block ) => {
			const entries = [];
			if ( block.name === 'core/pullquote' ) {
				entries.push(
					`top:${ stripMarkup(
						block.attributes?.value
					) }|${ stripMarkup( block.attributes?.citation ) }`
				);
			}
			for ( const innerBlock of block.innerBlocks ?? [] ) {
				if ( innerBlock.name === 'core/pullquote' ) {
					entries.push(
						`nested:${ stripMarkup(
							innerBlock.attributes?.value
						) }|${ stripMarkup( innerBlock.attributes?.citation ) }`
					);
				}
			}
			return entries;
		} )
		.sort();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
	scenario,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	page: Page;
	requestUtils: any;
	scenario: Scenario;
} ): Promise< ScenarioResult > {
	const result: ScenarioResult = {
		name: scenario.name,
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `${ TITLE } ${ scenario.name }`,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		const primaryEditor = collaborationUtils.editor;

		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'initial'
			)
		);

		await insertPullquoteAfterText(
			collaboratorEditor,
			collaboratorPage,
			'Tail paragraph kept for save and reload stability checks.'
		);
		await waitForSessionReady( collaborationUtils );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-remote-pullquote'
			)
		);

		if ( scenario.includeReloadBeforeDrag ) {
			await reloadEditorPage( collaboratorPage, collaborationUtils );
			result.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					'after-reload'
				)
			);
		}

		await dragTopLevelPullquoteIntoGroup( page, primaryEditor );
		result.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-drag-before-wait'
			)
		);

		await clickSaveDraft( collaboratorPage );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 20000,
			}
		);
		const afterImmediateSaveSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-immediate-collaborator-save'
		);
		result.snapshots.push( afterImmediateSaveSnapshot );
		if (
			! persistedContentHasSingleNestedPullquote(
				afterImmediateSaveSnapshot.persistedContent
			)
		) {
			result.immediateSaveError =
				'immediate collaborator save before convergence did not persist exactly one Pullquote inside the Group';
		}

		try {
			await collaborationUtils.waitForConvergence( {
				timeout: 15000,
			} );
		} catch ( error ) {
			result.convergenceError = formatError( error );
		}

		const finalSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-wait'
		);
		result.snapshots.push( finalSnapshot );
		result.reproduced = hasDuplicatePullquoteShape(
			finalSnapshot.primaryState,
			finalSnapshot.secondaryState
		);

		await clickSaveDraft( collaboratorPage );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 20000,
			}
		);
		const afterSaveSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-collaborator-save'
		);
		result.snapshots.push( afterSaveSnapshot );

		await Promise.all( [
			page.reload( { waitUntil: 'domcontentloaded' } ),
			collaboratorPage.reload( { waitUntil: 'domcontentloaded' } ),
		] );
		await Promise.all( [
			collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 20000,
			} ),
			collaborationUtils.waitForEntityReadyAndSaveSettled(
				collaboratorPage,
				{
					timeout: 20000,
				}
			),
		] );
		await waitForSessionReady( collaborationUtils );
		const afterReloadSnapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			post.id,
			'after-save-reload'
		);
		result.snapshots.push( afterReloadSnapshot );

		const persistenceErrors = [
			...validateNestedOnlySnapshot( afterSaveSnapshot ),
			...validateNestedOnlySnapshot( afterReloadSnapshot ),
		];
		if ( persistenceErrors.length > 0 ) {
			result.persistenceError = persistenceErrors.join( '\n' );
		}

		if ( result.reproduced ) {
			const summary = {
				primary: summarizePullquotes( finalSnapshot.primaryState ),
				secondary: summarizePullquotes( finalSnapshot.secondaryState ),
			};
			fs.writeFileSync(
				path.join(
					OUTPUT_DIR ?? '.',
					`${ scenario.name }-summary.json`
				),
				JSON.stringify( summary, null, 2 )
			);
		}

		return result;
	} catch ( error ) {
		result.error = formatError( error );
		return result;
	} finally {
		writeScenarioResult( result );
	}
}

test.describe.configure( { mode: 'serial' } );

for ( const scenario of SCENARIOS ) {
	test(
		scenario.name,
		async ( {
			collaborationUtils,
			collaboratorUser,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 180000 );

			const result = await runScenario( {
				collaborationUtils,
				collaboratorUser,
				page,
				requestUtils,
				scenario,
			} );
			expect( result.error ).toBeUndefined();
			expect( result.convergenceError ).toBeUndefined();
			expect( result.reproduced ).toBe( false );
			expect( result.persistenceError ).toBeUndefined();
			const finalSnapshot = result.snapshots.at( -1 );
			expect( finalSnapshot ).toBeDefined();
			expect(
				blocksEqual(
					finalSnapshot?.primaryState.blocks ?? [],
					finalSnapshot?.secondaryState.blocks ?? []
				)
			).toBe( true );
		}
	);
}
