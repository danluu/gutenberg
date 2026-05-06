/**
 * WordPress dependencies
 */
import type { Page } from '@playwright/test';
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import type CollaborationUtils from './fixtures/collaboration-utils';
import { SECOND_USER } from './fixtures/collaboration-utils';

const INSERTED_PARAGRAPH =
	'RTC ec47 realistic inserted paragraph natural action repro';
const MOVED_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const SIBLING_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 950301 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ SIBLING_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	serializedContent: string;
	title: string;
};

async function getNormalizedPostState(
	page: Page
): Promise< NormalizedState > {
	return page.evaluate( () => {
		const normalizeBlocks = (
			blockTree: Array< {
				attributes?: Record< string, unknown >;
				innerBlocks?: Array< unknown >;
				name: string;
			} >
		): NormalizedBlock[] =>
			blockTree.map( ( block ) => ( {
				name: block.name,
				attributes: JSON.parse(
					JSON.stringify( block.attributes ?? {} )
				),
				innerBlocks: normalizeBlocks(
					( block.innerBlocks ?? [] ) as Array< {
						attributes?: Record< string, unknown >;
						innerBlocks?: Array< unknown >;
						name: string;
					} >
				),
			} ) );

		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			blocks: normalizeBlocks( blocks ),
			serializedContent: ( window as any ).wp.blocks.serialize( blocks ),
		};
	} );
}

async function waitForConvergence(
	pages: Page[],
	{ timeout = 20000 }: { timeout?: number } = {}
) {
	const deadline = Date.now() + timeout;
	let lastStates: NormalizedState[] = [];

	while ( Date.now() < deadline ) {
		lastStates = await Promise.all( pages.map( getNormalizedPostState ) );
		const firstState = JSON.stringify( lastStates[ 0 ] );

		if (
			lastStates.every(
				( state ) => JSON.stringify( state ) === firstState
			)
		) {
			return lastStates[ 0 ];
		}

		await pages[ 0 ].waitForTimeout( 250 );
	}

	throw new Error(
		`Collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
			lastStates
		) }`
	);
}

async function waitForSessionReady(
	pages: Page[],
	collaborationUtils: CollaborationUtils
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await waitForConvergence( pages, { timeout: 20000 } );
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
	await editor.canvas.getByText( text, { exact: false } ).click();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function insertParagraphBeforeSelected(
	editor: Editor,
	page: Page,
	text: string
) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page
		.getByRole( 'menuitem', { name: /^(Add|Insert) before/ } )
		.click();
	await page.keyboard.type( text, { delay: 15 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

test.describe( 'RTC top-level structural reconciliation', () => {
	test( 'keeps a sibling after a paragraph is moved below it following collaborative edits', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC ec47 realistic natural action repro',
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );
		const pages = [ page, collaboratorPage ];
		await waitForSessionReady( pages, collaborationUtils );

		await clickBlockByText( editor, page, 'Seed 950301 multibyte heading' );
		await deleteSelectedBlock( page, editor );
		await waitForSessionReady( pages, collaborationUtils );

		await clickBlockByText(
			collaboratorEditor,
			collaboratorPage,
			'Emoji and multibyte'
		);
		await insertParagraphBeforeSelected(
			collaboratorEditor,
			collaboratorPage,
			INSERTED_PARAGRAPH
		);
		await waitForSessionReady( pages, collaborationUtils );

		await clickBlockByText( editor, page, 'Emoji and multibyte' );
		await moveSelectedBlockDown( page, editor );

		const finalState = await waitForConvergence( pages, {
			timeout: 20000,
		} );
		const contents = finalState.blocks.map(
			( block ) => block.attributes.content
		);

		expect( contents ).toEqual( [
			INSERTED_PARAGRAPH,
			SIBLING_PARAGRAPH,
			MOVED_PARAGRAPH,
		] );
	} );
} );
