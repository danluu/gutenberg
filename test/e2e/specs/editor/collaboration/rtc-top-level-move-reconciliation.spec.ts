/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

type NormalizedBlock = {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
};

type NormalizedPostState = {
	blocks: NormalizedBlock[];
	serializedContent: string;
	title: string;
};

type CollaborationTestUtils = {
	allPages: Page[];
	waitForMutualDiscovery: ( options?: {
		timeout?: number;
	} ) => Promise< void >;
};

const HEADING = 'Seed 5ee0be2f9b7d top-level heading';
const MOVED_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const DISPLACED_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const INSERTED_PARAGRAPH = 'RTC 5ee0be2f9b7d inserted paragraph';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ DISPLACED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

async function getNormalizedPostState(
	page: Page
): Promise< NormalizedPostState > {
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
			serializedContent:
				( window as any ).wp.blocks.serialize( blocks ) ?? '',
		};
	} );
}

function getBlockContents( state: NormalizedPostState ): unknown[] {
	return state.blocks.map( ( block ) => block.attributes.content ?? '' );
}

async function expectPostStatesToConverge(
	collaborationUtils: CollaborationTestUtils,
	expectedContents: string[]
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await expect( async () => {
		const states = await Promise.all(
			collaborationUtils.allPages.map( getNormalizedPostState )
		);
		const serializedFirstState = JSON.stringify( states[ 0 ] );

		for ( const state of states ) {
			expect( JSON.stringify( state ) ).toBe( serializedFirstState );
			expect( getBlockContents( state ) ).toEqual( expectedContents );
		}
	} ).toPass( { timeout: 20000, intervals: [ 250, 500, 1000 ] } );
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
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
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

test.describe( 'RTC top-level move reconciliation', () => {
	// Assertions run through expectPostStatesToConverge().
	// eslint-disable-next-line playwright/expect-expect
	test( 'does not duplicate a moved paragraph or drop the adjacent sibling after structural edits', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC top-level move reconciliation',
		} );
		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		const { editor2, page2 } = collaborationUtils;

		await expectPostStatesToConverge( collaborationUtils, [
			HEADING,
			MOVED_PARAGRAPH,
			DISPLACED_PARAGRAPH,
		] );

		await clickBlockByText( editor, page, HEADING );
		await deleteSelectedBlock( page, editor );
		await expectPostStatesToConverge( collaborationUtils, [
			MOVED_PARAGRAPH,
			DISPLACED_PARAGRAPH,
		] );

		await clickBlockByText( editor2, page2, MOVED_PARAGRAPH );
		await insertParagraphBeforeSelected(
			editor2,
			page2,
			INSERTED_PARAGRAPH
		);
		await expectPostStatesToConverge( collaborationUtils, [
			INSERTED_PARAGRAPH,
			MOVED_PARAGRAPH,
			DISPLACED_PARAGRAPH,
		] );

		await clickBlockByText( editor, page, MOVED_PARAGRAPH );
		await moveSelectedBlockDown( page, editor );
		await expectPostStatesToConverge( collaborationUtils, [
			INSERTED_PARAGRAPH,
			DISPLACED_PARAGRAPH,
			MOVED_PARAGRAPH,
		] );
	} );
} );
