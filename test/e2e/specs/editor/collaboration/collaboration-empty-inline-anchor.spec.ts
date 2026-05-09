/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const VALID_PARAGRAPH =
	'<p>Before <a id="empty-anchor"></a> after</p>';
const BLOCK_MARKUP = `<!-- wp:paragraph -->
${ VALID_PARAGRAPH }
<!-- /wp:paragraph -->`;

test.describe( 'Collaboration - empty inline anchors', () => {
	test( 'syncs and saves empty inline anchors without corrupting paragraph HTML', async ( {
		collaborationUtils,
		page,
		pageUtils,
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC empty inline anchor',
			content:
				'<!-- wp:paragraph -->\n<p>Initial content</p>\n<!-- /wp:paragraph -->',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openCollaborativeSession( post.id );

		const codeEditor = page.getByRole( 'textbox', {
			name: 'Type text or HTML',
		} );

		await pageUtils.pressKeys( 'secondary+M' );
		await codeEditor.fill( BLOCK_MARKUP );

		await expect
			.poll(
				async () =>
					await collaborationUtils.editor2.getEditedPostContent(),
				{ timeout: 20_000 }
			)
			.toContain( VALID_PARAGRAPH );

		await collaborationUtils.editor2.saveDraft();

		const savedPost = await requestUtils.rest< {
			content: { raw: string };
		} >( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
		} );

		expect( savedPost.content.raw ).toContain( VALID_PARAGRAPH );
	} );
} );
