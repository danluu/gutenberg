/**
 * External dependencies
 */
import type { Locator, Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from '../fixtures';
import { SECOND_USER } from '../fixtures/collaboration-utils';

const TARGET_OLD = 'Seed bcbe661 target paragraph';
const TARGET_EDITED = 'Seed bcbe661 edited while move is delayed';
const NESTED_PARAGRAPH = 'Seed bcbe661 nested paragraph';
const NESTED_HEADING = 'Seed bcbe661 nested heading';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed bcbe661 before paragraph A</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed bcbe661 before paragraph B</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ TARGET_OLD }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	`<p>${ NESTED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	`<h3 class="wp-block-heading">${ NESTED_HEADING }</h3>`,
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	'<p>Seed bcbe661 tail paragraph</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

async function openListView( page: Page ) {
	await page.getByRole( 'button', { name: 'Document Overview' } ).click();
	const overview = page.getByRole( 'region', { name: 'Document Overview' } );
	await expect( overview ).toBeVisible();
	return overview;
}

async function ensureGroupExpanded( page: Page, overview: Locator ) {
	const collapsedGroup = overview
		.getByRole( 'link', { name: 'Group', expanded: false } )
		.first();
	if ( await collapsedGroup.isVisible().catch( () => false ) ) {
		await collapsedGroup.click();
		await page.keyboard.press( 'ArrowRight' );
	}
}

async function dragTargetParagraphIntoGroup( page: Page ) {
	const overview = await openListView( page );
	await ensureGroupExpanded( page, overview );

	const sourceRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: TARGET_OLD } )
		.first();
	const targetRow = overview
		.getByRole( 'gridcell' )
		.filter( { hasText: NESTED_PARAGRAPH } )
		.first();

	await expect( sourceRow ).toBeVisible();
	await expect( targetRow ).toBeVisible();
	await sourceRow.dragTo( targetRow );
}

async function replaceParagraphText(
	page: Page,
	editorCanvas: Locator,
	from: string,
	to: string
) {
	await editorCanvas.getByText( from, { exact: true } ).click();
	await page.keyboard.press( 'ControlOrMeta+A' );
	await page.keyboard.type( to );
}

async function clearBrowserRtcState( page: Page ) {
	await page.goto( '/wp-admin/' );
	await page.evaluate( async () => {
		window.localStorage.clear();
		window.sessionStorage.clear();
		const indexedDBWithDatabases = window.indexedDB as IDBFactory & {
			databases?: () => Promise< Array< { name?: string } > >;
		};
		if ( indexedDBWithDatabases.databases ) {
			const databases = await indexedDBWithDatabases.databases();
			await Promise.all(
				databases.map(
					( database ) =>
						new Promise< void >( ( resolve ) => {
							if ( ! database.name ) {
								resolve();
								return;
							}
							const request = window.indexedDB.deleteDatabase(
								database.name
							);
							request.onsuccess = () => resolve();
							request.onerror = () => resolve();
							request.onblocked = () => resolve();
						} )
				)
			);
		}
	} );
}

function summarizeBlocks( blocks: NormalizedBlock[] ) {
	return blocks.map( ( block ) => ( {
		name: block.name,
		content: block.attributes.content,
		inner: summarizeBlocks( block.innerBlocks ),
	} ) );
}

function getMovedParagraphSummary( blocks: NormalizedBlock[] ) {
	const topLevelTargetCount = blocks.filter(
		( block ) =>
			block.name === 'core/paragraph' &&
			block.attributes.content === TARGET_EDITED
	).length;
	const group = blocks.find( ( block ) => block.name === 'core/group' );
	const groupHasContent = Object.hasOwn(
		group?.attributes ?? {},
		'content'
	);
	const firstInner = group?.innerBlocks?.[ 0 ];

	return {
		groupHasContent,
		groupInnerCount: group?.innerBlocks?.length ?? 0,
		movedContent: firstInner?.attributes.content,
		movedName: firstInner?.name,
		topLevelTargetCount,
	};
}

test.describe( 'Collaboration - WebSocket group move stale edit replay', () => {
	test( 'keeps a paragraph edit when another collaborator moves that paragraph into a group', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const post = await requestUtils.createPost( {
			title: 'RTC group move stale edit replay',
			content: INITIAL_CONTENT,
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await clearBrowserRtcState( page );
		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 30_000 } );

		await collaboratorPage.evaluate( () => {
			(
				window as unknown as {
					__gutenbergTestWebSocketSync?: {
						delayNextMessage: ( delayMs: number ) => void;
					};
				}
			).__gutenbergTestWebSocketSync?.delayNextMessage( 3000 );
		} );

		await dragTargetParagraphIntoGroup( collaboratorPage );
		await replaceParagraphText(
			page,
			editor.canvas,
			TARGET_OLD,
			TARGET_EDITED
		);

		await expect
			.poll(
				async () => {
					const states = await Promise.all(
						collaborationUtils.allPages.map( ( currentPage ) =>
							collaborationUtils.getNormalizedPostState(
								currentPage
							)
						)
					);

					return states.map( ( state ) =>
						getMovedParagraphSummary( state.blocks )
					);
				},
				{ timeout: 30_000 }
			)
			.toEqual( [
				{
					groupHasContent: false,
					groupInnerCount: 3,
					movedContent: TARGET_EDITED,
					movedName: 'core/paragraph',
					topLevelTargetCount: 0,
				},
				{
					groupHasContent: false,
					groupInnerCount: 3,
					movedContent: TARGET_EDITED,
					movedName: 'core/paragraph',
					topLevelTargetCount: 0,
				},
			] );

		const finalState = await collaborationUtils.waitForConvergence( {
			timeout: 15_000,
		} );
		expect( summarizeBlocks( finalState.blocks ) ).toContainEqual(
			expect.objectContaining( {
				name: 'core/group',
				inner: expect.arrayContaining( [
					expect.objectContaining( {
						name: 'core/paragraph',
						content: TARGET_EDITED,
					} ),
				] ),
			} )
		);
		await expect(
			collaboratorEditor.canvas.getByText( TARGET_EDITED, {
				exact: true,
			} )
		).toBeVisible();
	} );
} );
