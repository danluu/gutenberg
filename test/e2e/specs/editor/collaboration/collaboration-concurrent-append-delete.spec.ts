/**
 * WordPress dependencies
 */
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

async function deleteParagraph( editor: Editor, text: string ) {
	await editor.canvas.getByText( text, { exact: true } ).click();
	await editor.clickBlockOptionsMenuItem( 'Delete' );
}

async function getParagraphContents( editor: Editor ) {
	const blocks = await editor.getBlocks();
	return blocks.map( ( block ) => String( block.attributes.content ?? '' ) );
}

test.describe( 'Collaboration - Concurrent Append Delete', () => {
	test( 'deleting a collaborator paragraph after concurrent appends converges', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC concurrent append delete',
			status: 'draft',
			content:
				'<!-- wp:paragraph --><p>Alpha</p><!-- /wp:paragraph -->' +
				'<!-- wp:paragraph --><p>First user concurrent append</p><!-- /wp:paragraph -->' +
				'<!-- wp:paragraph --><p>Beta</p><!-- /wp:paragraph -->',
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( post.id );

		const { editor2 } = collaborationUtils;

		await expect( async () => {
			const contents = await getParagraphContents( editor2 );
			expect( contents ).toContain( 'First user concurrent append' );
		} ).toPass( { timeout: 10_000 } );

		await expect( async () => {
			const contents = await getParagraphContents( editor );
			expect( contents ).toContain( 'First user concurrent append' );
		} ).toPass( { timeout: 10_000 } );

		await Promise.all( [
			deleteParagraph( editor2, 'First user concurrent append' ),
			( async () => {
				await editor.canvas
					.getByText( 'Alpha', { exact: true } )
					.click();
				await page.keyboard.press( 'End' );
				await page.keyboard.insertText( ' edited by first user' );
			} )(),
		] );

		for ( const currentEditor of [ editor, editor2 ] ) {
			await expect( async () => {
				const contents = await getParagraphContents( currentEditor );
				expect( contents ).toContain( 'Alpha edited by first user' );
				expect( contents ).toContain( 'Beta' );
				expect( contents ).not.toContain(
					'First user concurrent append'
				);
			} ).toPass( { timeout: 10_000 } );
		}
	} );
} );
