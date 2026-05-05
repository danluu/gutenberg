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

type StateSummary = {
	topLevel: string[];
};

type Snapshot = {
	label: string;
	primaryState: unknown;
	primarySummary: StateSummary;
	secondaryState: unknown;
	secondarySummary: StateSummary;
};

type ScenarioResult = {
	convergenceError?: string;
	name: string;
	postId?: number;
	reproduced: boolean;
	reproductionKind?: 'group-misordered' | 'group-missing';
	snapshots: Snapshot[];
};

type ProbeResult = {
	error?: string;
	reproduced: boolean;
	reproductionKind?: ScenarioResult['reproductionKind'];
	snapshot: Snapshot;
};

const OUTPUT_DIR =
	process.env.RTC_7998_REALISTIC_OUTPUT_DIR ?? '/tmp/rtc-7998-realistic';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953181 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

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
			username: `rtc7998${ uniqueSuffix }`,
			email: `rtc7998+${ uniqueSuffix }@example.com`,
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

function writeResult( result: ScenarioResult ) {
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

function summarizeState( state: any ): StateSummary {
	return {
		topLevel: ( state?.blocks ?? [] ).map( ( block: any ) => {
			const content =
				typeof block?.attributes?.content === 'string'
					? block.attributes.content
					: '';
			if ( block?.name === 'core/group' ) {
				const nested = ( block?.innerBlocks ?? [] )
					.map( ( inner: any ) => inner?.attributes?.content ?? inner?.name )
					.join( '|' );
				return `group:${ nested }`;
			}
			return `${ String( block?.name ?? 'unknown' ).replace( /^core\//, '' ) }:${ content }`;
		} ),
	};
}

function formatError( error: unknown ) {
	if ( error instanceof Error ) {
		return error.stack ?? error.message;
	}
	return String( error );
}

function findGroupIndex( summary: StateSummary ): number {
	return summary.topLevel.findIndex( ( entry ) => entry.startsWith( 'group:' ) );
}

function isGroupMissingMismatch(
	primarySummary: StateSummary,
	secondarySummary: StateSummary
): boolean {
	const primaryHasGroup = findGroupIndex( primarySummary ) !== -1;
	const secondaryHasGroup = findGroupIndex( secondarySummary ) !== -1;
	return primaryHasGroup !== secondaryHasGroup;
}

function isGroupMisorderedMismatch(
	primarySummary: StateSummary,
	secondarySummary: StateSummary
): boolean {
	const primaryGroupIndex = findGroupIndex( primarySummary );
	const secondaryGroupIndex = findGroupIndex( secondarySummary );

	return (
		primaryGroupIndex !== -1 &&
		secondaryGroupIndex !== -1 &&
		primaryGroupIndex !== secondaryGroupIndex
	);
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20_000 } );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
	] );

	return {
		label,
		primaryState,
		primarySummary: summarizeState( primaryState ),
		secondaryState,
		secondarySummary: summarizeState( secondaryState ),
	};
}

async function slashInsert( page: Page, command: string ) {
	await page.keyboard.type( `/${ command }` );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function insertAfterSelectedBlock( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
		return;
	}
	await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
}

async function insertHeadingAfterParagraph(
	editor: Editor,
	page: Page,
	paragraphText: string,
	headingText: string
) {
	const paragraph = editor.canvas.getByText( paragraphText, {
		exact: false,
	} );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await insertAfterSelectedBlock( page, editor );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function insertGroupAfterBlock(
	editor: Editor,
	page: Page,
	blockText: string,
	nestedParagraphText: string,
	nestedHeadingText: string
) {
	const block = editor.canvas.getByText( blockText, { exact: false } );
	await expect( block ).toBeVisible();
	await block.click();
	await insertAfterSelectedBlock( page, editor );
	await slashInsert( page, 'group' );
	await page.keyboard.type( nestedParagraphText, { delay: 15 } );
	await page.keyboard.press( 'Enter' );
	await slashInsert( page, 'heading' );
	await page.keyboard.type( nestedHeadingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( nestedHeadingText, { exact: false } )
	).toBeVisible();
}

async function formatTailOfParagraph(
	editor: Editor,
	page: Page,
	paragraphText: string,
	plainPrefix: string,
	emphasizedTail: string
) {
	const paragraph = editor.canvas.getByText( paragraphText, {
		exact: false,
	} );
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( ` ${ plainPrefix }`, { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.type( emphasizedTail, { delay: 15 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await expect(
		editor.canvas.getByText( emphasizedTail, { exact: false } )
	).toBeVisible();
}

async function probeConvergence(
	collaborationUtils: CollaborationUtilsClass,
	label: string
): Promise< ProbeResult > {
	try {
		await collaborationUtils.waitForConvergence( { timeout: 15_000 } );
		return {
			reproduced: false,
			snapshot: await captureSnapshot( collaborationUtils, label ),
		};
	} catch ( error ) {
		const snapshot = await captureSnapshot(
			collaborationUtils,
			`${ label }-after-error`
		);
		if (
			isGroupMisorderedMismatch(
				snapshot.primarySummary,
				snapshot.secondarySummary
			)
		) {
			return {
				error: formatError( error ),
				reproduced: true,
				reproductionKind: 'group-misordered',
				snapshot,
			};
		}
		if (
			isGroupMissingMismatch(
				snapshot.primarySummary,
				snapshot.secondarySummary
			)
		) {
			return {
				error: formatError( error ),
				reproduced: true,
				reproductionKind: 'group-missing',
				snapshot,
			};
		}
		return {
			error: formatError( error ),
			reproduced: false,
			snapshot,
		};
	}
}

async function runScenario(
	name: string,
	setup: ( args: {
		editor: Editor;
		page: Page;
		collaboratorEditor: Editor;
		collaboratorPage: Page;
	} ) => Promise< void >,
	args: {
		collaborationUtils: CollaborationUtilsClass;
		collaboratorUser: UserCredentials;
		editor: Editor;
		page: Page;
		requestUtils: any;
	}
): Promise< ScenarioResult > {
	const { collaborationUtils, collaboratorUser, editor, page, requestUtils } =
		args;
	const result: ScenarioResult = {
		name,
		reproduced: false,
		snapshots: [],
	};

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: `RTC ${ name } ${ Date.now().toString( 36 ) }`,
	} );
	result.postId = post.id;

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await waitForSessionReady( collaborationUtils );
	result.snapshots.push(
		await captureSnapshot( collaborationUtils, `${ name }-initial` )
	);

	await setup( { editor, page, collaboratorEditor, collaboratorPage } );
	result.snapshots.push(
		await captureSnapshot( collaborationUtils, `${ name }-after-actions` )
	);

	let probe = await probeConvergence(
		collaborationUtils,
		`${ name }-after-actions`
	);
	result.snapshots.push( probe.snapshot );

	if ( probe.error ) {
		result.convergenceError = probe.error;
	}
	if ( probe.reproduced ) {
		result.reproduced = true;
		result.reproductionKind = probe.reproductionKind;
		return result;
	}

	await editor.saveDraft();
	probe = await probeConvergence( collaborationUtils, `${ name }-after-save` );
	result.snapshots.push( probe.snapshot );
	if ( probe.error && ! result.convergenceError ) {
		result.convergenceError = probe.error;
	}
	if ( probe.reproduced ) {
		result.reproduced = true;
		result.reproductionKind = probe.reproductionKind;
	}

	return result;
}

test( 'realistic heading then group in the same gap', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180_000 );
	const result = await runScenario(
		'heading-then-group-same-gap',
		async ( { editor: primaryEditor, page: primaryPage } ) => {
			await insertHeadingAfterParagraph(
				primaryEditor,
				primaryPage,
				'Emoji and multibyte:',
				'Primary heading inserted before final paragraph'
			);
			await collaborationUtils.waitForConvergence( { timeout: 20_000 } );
			await insertGroupAfterBlock(
				primaryEditor,
				primaryPage,
				'Emoji and multibyte:',
				'Nested paragraph inserted via real UI',
				'Nested heading inserted via real UI'
			);
		},
		{
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		}
	);
	writeResult( result );
	expect( result.snapshots.length ).toBeGreaterThan( 0 );
} );

test( 'realistic formatted paragraph then group after heading', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180_000 );
	const result = await runScenario(
		'formatted-paragraph-then-group-after-heading',
		async ( { editor: primaryEditor, page: primaryPage } ) => {
			await formatTailOfParagraph(
				primaryEditor,
				primaryPage,
				'Another paragraph exists so the top-level list is not degenerate.',
				'plain',
				'changed'
			);
			await collaborationUtils.waitForConvergence( {
				timeout: 20_000,
			} );
			await insertGroupAfterBlock(
				primaryEditor,
				primaryPage,
				'Seed 953181 multibyte heading',
				'Nested paragraph after heading via real UI',
				'Nested heading after heading via real UI'
			);
		},
		{
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		}
	);
	writeResult( result );
	expect( result.snapshots.length ).toBeGreaterThan( 0 );
} );
