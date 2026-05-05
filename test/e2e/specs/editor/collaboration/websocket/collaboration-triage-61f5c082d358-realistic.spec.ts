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
} from '../fixtures/collaboration-utils';

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
	blocks: NormalizedBlock[];
	title: string;
};

type ScenarioResult = {
	afterActions?: unknown;
	beforeActions?: unknown;
	error?: string;
	exactArchivedShape?: boolean;
	name: string;
	postId?: number;
	reproduced: boolean;
};

const RESULT_DIR = process.env.RTC_61F5C082D358_RESULT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const TEXT = {
	heading: 'Seed 953933 multibyte heading',
	updatedParagraph: 'Seed 953933 step 2 user 0 updated paragraph 892077',
	anotherParagraph:
		'Another paragraph exists so the top-level list is not degenerate.',
	nestedParagraph: 'Seed 953933 step 1 user 1 nested paragraph',
	nestedHeading: 'Seed 953933 step 1 user 1 nested heading',
	checkpointParagraph: 'rtc-save-paragraph-marker-953933-4-0-end',
	searchMarker: 'rtc-save-search-option-marker-953933-4-0-end',
	step5Paragraph: 'Seed 953933 step 5 user 0 paragraph 743828',
	step7Paragraph: 'Seed 953933 step 7 user 1 paragraph 253442',
	title: 'rtc-save-title-marker-953933-4-0-end',
};

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ TEXT.heading }</h2>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ TEXT.updatedParagraph }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ TEXT.anotherParagraph }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ TEXT.nestedParagraph }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ TEXT.nestedHeading }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ TEXT.checkpointParagraph }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	`<!-- wp:search {"label":"Search label ${ TEXT.searchMarker }","showLabel":true,"placeholder":"Search placeholder ${ TEXT.searchMarker }","buttonText":"Find ${ TEXT.searchMarker }","buttonPosition":"button-inside"} /-->`,
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
			username: `rtc61f5${ uniqueSuffix }`,
			email: `rtc61f5+${ uniqueSuffix }@example.com`,
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

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primarySummary: summarizeState( primaryState ),
		secondarySummary: summarizeState( secondaryState ),
		primaryState,
		secondaryState,
	};
}

function summarizeState( state: NormalizedState ) {
	return {
		title: state.title,
		blocks: state.blocks.map( summarizeBlock ),
	};
}

function summarizeBlock( block: NormalizedBlock ) {
	return {
		name: block.name,
		content:
			typeof block.attributes?.content === 'string'
				? block.attributes.content
				: null,
		buttonText:
			typeof block.attributes?.buttonText === 'string'
				? block.attributes.buttonText
				: null,
		label:
			typeof block.attributes?.label === 'string'
				? block.attributes.label
				: null,
		placeholder:
			typeof block.attributes?.placeholder === 'string'
				? block.attributes.placeholder
				: null,
		nested: ( block.innerBlocks ?? [] ).map( summarizeBlock ),
	};
}

function matchesArchivedBrokenShape( state: NormalizedState ) {
	return JSON.stringify( summarizeState( state ) ) === JSON.stringify( {
		title: TEXT.title,
		blocks: [
			{
				name: 'core/paragraph',
				content: TEXT.step7Paragraph,
				buttonText: null,
				label: null,
				placeholder: null,
				nested: [],
			},
			{
				name: 'core/group',
				content: TEXT.updatedParagraph,
				buttonText: null,
				label: null,
				placeholder: null,
				nested: [],
			},
			{
				name: 'core/paragraph',
				content: TEXT.checkpointParagraph,
				buttonText: null,
				label: null,
				placeholder: null,
				nested: [
					{
						name: 'core/heading',
						content: TEXT.heading,
						buttonText: null,
						label: null,
						placeholder: null,
						nested: [],
					},
					{
						name: 'core/paragraph',
						content: TEXT.anotherParagraph,
						buttonText: null,
						label: null,
						placeholder: null,
						nested: [],
					},
					{
						name: 'core/paragraph',
						content: TEXT.nestedParagraph,
						buttonText: null,
						label: null,
						placeholder: null,
						nested: [],
					},
					{
						name: 'core/heading',
						content: TEXT.nestedHeading,
						buttonText: null,
						label: null,
						placeholder: null,
						nested: [],
					},
				],
			},
			{
				name: 'core/search',
				content: TEXT.checkpointParagraph,
				buttonText: `Find ${ TEXT.searchMarker }`,
				label: `Search label ${ TEXT.searchMarker }`,
				placeholder: `Search placeholder ${ TEXT.searchMarker }`,
				nested: [],
			},
			{
				name: 'core/paragraph',
				content: TEXT.step5Paragraph,
				buttonText: null,
				label: null,
				placeholder: null,
				nested: [],
			},
			{
				name: 'core/paragraph',
				content: TEXT.step7Paragraph,
				buttonText: null,
				label: null,
				placeholder: null,
				nested: [],
			},
		],
	} );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickCanvasText(
	editor: Editor,
	page: Page,
	text: string
) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const target = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( target ).toBeVisible();
	await target.click();
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertParagraphAfterText(
	editor: Editor,
	page: Page,
	anchorText: string,
	text: string
) {
	await clickCanvasText( editor, page, anchorText );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function dragHeadingIntoGroup( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const cells = overview.getByRole( 'gridcell' );
	const headingRow = cells.filter( { hasText: TEXT.heading } ).first();
	const groupRow = cells.filter( { hasText: 'Group' } ).first();

	await expect( headingRow ).toBeVisible();
	await expect( groupRow ).toBeVisible();
	await headingRow.dragTo( groupRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function moveParagraphToTopViaToolbar( page: Page, editor: Editor ) {
	await page.bringToFront();
	await clearTransientUi( page, editor );
	await editor.canvas.getByText( TEXT.step7Paragraph, { exact: true } ).click();
	for ( let step = 0; step < 5; step++ ) {
		await editor.showBlockToolbar();
		const moveUpButton = page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Move up' } );
		await expect( moveUpButton ).toBeEnabled();
		await moveUpButton.click();
	}
}

async function moveParagraphToTopViaOverviewDrag( page: Page ) {
	await page.bringToFront();
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	const cells = overview.getByRole( 'gridcell' );
	const paragraphRow = cells.filter( { hasText: TEXT.step7Paragraph } ).last();
	const anchorRow = cells.filter( {
		hasText: TEXT.updatedParagraph,
	} ).first();

	await expect( paragraphRow ).toBeVisible();
	await expect( anchorRow ).toBeVisible();
	await paragraphRow.dragTo( anchorRow );
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
}

async function runScenario( {
	collaborationUtils,
	collaboratorUser,
	editor,
	finalMove,
	name,
	page,
	requestUtils,
}: {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
	editor: Editor;
	finalMove: 'toolbar' | 'overview-drag';
	name: string;
	page: Page;
	requestUtils: any;
} ) {
	const result: ScenarioResult = {
		name,
		reproduced: false,
	};

	try {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: TEXT.title,
		} );
		result.postId = post.id;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );
		result.beforeActions = await captureSnapshot(
			collaborationUtils,
			'before-actions'
		);

		await insertParagraphAfterText(
			editor,
			page,
			`Search label ${ TEXT.searchMarker }`,
			TEXT.step5Paragraph
		);
		await waitForSessionReady( collaborationUtils );
		await dragHeadingIntoGroup( collaborationUtils.getPage( 0 ) );
		await waitForSessionReady( collaborationUtils );
		await insertParagraphAfterText(
			collaborationUtils.allEditors[ 1 ],
			collaborationUtils.getPage( 0 ),
			TEXT.step5Paragraph,
			TEXT.step7Paragraph
		);
		await waitForSessionReady( collaborationUtils );

		if ( finalMove === 'toolbar' ) {
			await moveParagraphToTopViaToolbar( page, editor );
		} else {
			await moveParagraphToTopViaOverviewDrag( page );
		}

		await waitForSessionReady( collaborationUtils );
		const after = await captureSnapshot( collaborationUtils, 'after-actions' );
		result.afterActions = after;
		result.exactArchivedShape =
			matchesArchivedBrokenShape( after.primaryState ) ||
			matchesArchivedBrokenShape( after.secondaryState );
		result.reproduced = !! result.exactArchivedShape;
	} catch ( error ) {
		result.error = formatError( error );
		try {
			const after = await captureSnapshot(
				collaborationUtils,
				'after-error'
			);
			result.afterActions = after;
			result.exactArchivedShape =
				matchesArchivedBrokenShape( after.primaryState ) ||
				matchesArchivedBrokenShape( after.secondaryState );
			result.reproduced = !! result.exactArchivedShape;
		} catch ( snapshotError ) {
			result.error = `${ result.error }\n\nSnapshot capture failed:\n${ formatError(
				snapshotError
			) }`;
		}
	}

	writeScenarioResult( result );
	if ( result.error ) {
		throw new Error( result.error );
	}
}

test.describe( 'RTC triage 61f5c082d358 realistic repro search', () => {
	test( 'toolbar move-up variant', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			finalMove: 'toolbar',
			name: 'toolbar-move-up',
			page,
			requestUtils,
		} );
	} );

	test( 'document overview drag variant', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		await runScenario( {
			collaborationUtils,
			collaboratorUser,
			editor,
			finalMove: 'overview-drag',
			name: 'overview-drag',
			page,
			requestUtils,
		} );
	} );
} );
