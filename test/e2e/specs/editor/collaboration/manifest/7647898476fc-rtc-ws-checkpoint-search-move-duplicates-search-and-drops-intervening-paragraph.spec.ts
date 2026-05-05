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
import { test, expect } from '../fixtures';
import { SECOND_USER } from '../fixtures/collaboration-utils';

const SEARCH1_MARKER = 'rtc-save-search-option-marker-953856-1-1-end';
const SEARCH3_MARKER = 'rtc-save-search-option-marker-953856-3-0-end';
const SHARED_PARAGRAPH = 'Shared editing target paragraph.';
const CP0 = 'Seed 953856 step 0 user 0 concurrent paragraph 930320';
const CP1 = 'Seed 953856 step 0 user 1 concurrent paragraph 459539';
const MARKER1 = 'rtc-save-paragraph-marker-953856-1-1-end';
const MARKER3 = 'rtc-save-paragraph-marker-953856-3-0-end';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:group {"layout":{"type":"constrained"}} -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph -->',
	'<p>Seed 953856 step 3 user 0 nested paragraph</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Seed 953856 step 3 user 0 nested heading</h3>',
	'<!-- /wp:heading -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:paragraph -->',
	`<p>${ CP0 }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ CP1 }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ MARKER1 }</p>`,
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH1_MARKER }","label":"Search label ${ SEARCH1_MARKER }","placeholder":"Search placeholder ${ SEARCH1_MARKER }"} /-->`,
	'<!-- wp:paragraph -->',
	`<p>${ MARKER3 }</p>`,
	'<!-- /wp:paragraph -->',
	`<!-- wp:search {"buttonPosition":"button-inside","buttonText":"Find ${ SEARCH3_MARKER }","label":"Search label ${ SEARCH3_MARKER }","placeholder":"Search placeholder ${ SEARCH3_MARKER }"} /-->`,
].join( '\n' );

type Block = {
	attributes?: Record< string, unknown >;
	name: string;
};

function summarizeBlocks( blocks: Block[] ) {
	return blocks.map( ( block ) => {
		if ( block.name === 'core/search' ) {
			return `core/search:${ String( block.attributes?.label ?? '' ) }`;
		}

		if ( block.name === 'core/group' ) {
			return 'core/group';
		}

		return `${ block.name }:${ String( block.attributes?.content ?? '' ) }`;
	} );
}

async function getSummary( editor: Editor ) {
	return summarizeBlocks( ( await editor.getBlocks() ) as Block[] );
}

async function insertSharedParagraphAfterGroup( editor: Editor, page: Page ) {
	await editor.canvas
		.getByRole( 'document', {
			name: 'Block: Paragraph',
		} )
		.filter( { hasText: CP0 } )
		.click();
	await page.keyboard.press( 'ControlOrMeta+Alt+t' );
	await page.keyboard.type( SHARED_PARAGRAPH );
}

async function selectFirstSearchBlock( editor: Editor ) {
	const label = editor.canvas.getByText( `Search label ${ SEARCH1_MARKER }`, {
		exact: false,
	} );
	await expect( label ).toBeVisible();
	await label.click();
}

async function moveSelectedBlockUp( editor: Editor, page: Page ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move up' } )
		.click();
}

test.describe( 'RTC manifest 7647898476fc', () => {
	test( 'preserves an intervening paragraph when a Search block is moved from a stale view', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 60_000 );

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			status: 'draft',
			title: 'RTC stale Search move 7647898476fc',
		} );
		await collaborationUtils.openPost( post.id );
		const { editor: editor2, page: page2 } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );

		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10_000 } )
			.toHaveLength( 8 );

		const expectedWithShared = [
			'core/paragraph:Seed 953856 baseline paragraph.',
			'core/group',
			`core/paragraph:${ SHARED_PARAGRAPH }`,
			`core/paragraph:${ CP0 }`,
			`core/paragraph:${ CP1 }`,
			`core/paragraph:${ MARKER1 }`,
			`core/search:Search label ${ SEARCH1_MARKER }`,
			`core/paragraph:${ MARKER3 }`,
			`core/search:Search label ${ SEARCH3_MARKER }`,
		];

		await selectFirstSearchBlock( editor );

		await insertSharedParagraphAfterGroup( editor2, page2 );
		await expect
			.poll( () => getSummary( editor2 ), { timeout: 10_000 } )
			.toEqual( expectedWithShared );
		await moveSelectedBlockUp( editor, page );

		const expected = [
			'core/paragraph:Seed 953856 baseline paragraph.',
			'core/group',
			`core/paragraph:${ SHARED_PARAGRAPH }`,
			`core/paragraph:${ CP0 }`,
			`core/paragraph:${ CP1 }`,
			`core/search:Search label ${ SEARCH1_MARKER }`,
			`core/paragraph:${ MARKER1 }`,
			`core/paragraph:${ MARKER3 }`,
			`core/search:Search label ${ SEARCH3_MARKER }`,
		];

		for ( const ed of [ editor, editor2 ] ) {
			await expect
				.poll( () => getSummary( ed ), { timeout: 15_000 } )
				.toEqual( expected );
		}
	} );
} );
