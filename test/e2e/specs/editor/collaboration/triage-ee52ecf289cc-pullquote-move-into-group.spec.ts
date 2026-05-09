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

type EditorBlock = {
	attributes: Record< string, unknown >;
	clientId: string;
	innerBlocks: EditorBlock[];
	name: string;
};

const INITIAL_CONTENT = [
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">RTC Pullquote move heading</h3>',
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
	'<p>Tail paragraph before pullquote insertion.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function stripMarkup( value: unknown ) {
	return String( value ?? '' ).replaceAll( /<[^>]+>/g, '' );
}

function collectPullquotes(
	blocks: EditorBlock[],
	location: 'top' | 'nested' = 'top'
): string[] {
	return blocks.flatMap( ( block ) => {
		const own =
			block.name === 'core/pullquote'
				? [
						`${ location }:${ stripMarkup(
							block.attributes.value
						) }|${ stripMarkup( block.attributes.citation ) }`,
				  ]
				: [];
		return [
			...own,
			...collectPullquotes( block.innerBlocks ?? [], 'nested' ),
		];
	} );
}

function normalizeBlocks( blocks: EditorBlock[] ): unknown {
	return blocks.map( ( block ) => ( {
		name: block.name,
		attributes: block.attributes,
		innerBlocks: normalizeBlocks( block.innerBlocks ?? [] ),
	} ) );
}

async function slashInsertPullquoteAfterTail(
	page: Page,
	editor: Editor
) {
	await editor.canvas
		.getByText( 'Tail paragraph before pullquote insertion.', {
			exact: false,
		} )
		.click();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( '/pullquote' );
	await expect(
		page.locator( '.components-autocomplete__results' )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );

	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );
	await quoteBox.click();
	await page.keyboard.type( 'RTC Pullquote body' );

	const citationBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote citation text',
	} );
	await citationBox.click();
	await page.keyboard.type( 'RTC Pullquote citation' );

	await expect( quoteBox ).toContainText( 'RTC Pullquote body' );
	await expect( citationBox ).toContainText( 'RTC Pullquote citation' );
}

async function dragPullquoteIntoGroup( page: Page, editor: Editor ) {
	const groupBlock = editor.canvas
		.locator( '[data-type="core/group"]' )
		.filter( { hasText: 'Nested group paragraph alpha.' } )
		.first();
	const quoteBox = editor.canvas.getByRole( 'textbox', {
		name: 'Pullquote text',
	} );

	await expect( quoteBox ).toBeVisible();
	await expect( groupBlock ).toBeVisible();

	await quoteBox.click();
	await editor.showBlockToolbar();
	const dragHandle = page.locator(
		'role=toolbar[name="Block tools"i] >> role=button[name="Drag"i][include-hidden]'
	);
	await dragHandle.hover();
	await page.mouse.down();

	const groupBox = await groupBlock.boundingBox();
	if ( ! groupBox ) {
		throw new Error( 'Could not find the Group block bounding box.' );
	}

	await page.mouse.move(
		groupBox.x + groupBox.width * 0.5,
		groupBox.y + groupBox.height * 0.5,
		{ steps: 20 }
	);
	await page.mouse.up();
}

async function typeInPullquoteDuringMove( page: Page, editor: Editor ) {
	await editor.canvas
		.getByRole( 'textbox', {
			name: 'Pullquote text',
		} )
		.click();
	await page.keyboard.type( ' collaborator follow-up' );
}

test.describe( 'RTC Pullquote move into Group', () => {
	test( 'does not leave a stale top-level Pullquote copy', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 120_000 );

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: 'RTC Pullquote move into Group',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.waitForEntityReady( page );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );

		const collaboratorPage = collaborationUtils.page2;
		const collaboratorEditor = collaborationUtils.editor2;

		await slashInsertPullquoteAfterTail(
			collaboratorPage,
			collaboratorEditor
		);
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );

		await Promise.all( [
			dragPullquoteIntoGroup( page, editor ),
			typeInPullquoteDuringMove( collaboratorPage, collaboratorEditor ),
		] );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );

		const [ primaryBlocks, secondaryBlocks ] = await Promise.all( [
			editor.getBlocks() as Promise< EditorBlock[] >,
			collaboratorEditor.getBlocks() as Promise< EditorBlock[] >,
		] );

		expect( normalizeBlocks( primaryBlocks ) ).toEqual(
			normalizeBlocks( secondaryBlocks )
		);
		for ( const blocks of [ primaryBlocks, secondaryBlocks ] ) {
			const pullquotes = collectPullquotes( blocks ).sort();
			expect( pullquotes ).toHaveLength( 1 );
			expect( pullquotes[ 0 ] ).toContain( 'nested:RTC Pullquote body' );
		}
	} );
} );
