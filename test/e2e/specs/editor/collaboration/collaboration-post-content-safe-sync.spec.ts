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
	name: string;
	attributes: {
		content?: unknown;
	};
};

async function getParagraphContents( editor: Editor ) {
	const blocks = await editor.getBlocks();
	return blocks
		.filter( ( block: EditorBlock ) => block.name === 'core/paragraph' )
		.map( ( block ) => block.attributes.content );
}

test.describe( 'Collaboration - Post Content Safe Sync', () => {
	test( 'User B types a paragraph, User A sees it', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const marker = `Natural keyboard paragraph ${ Date.now() }`;
		const post = await requestUtils.createPost( {
			title: 'Post content safe sync natural repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		const { page: page2, editor: editor2 } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );

		await Promise.all( [
			collaborationUtils.waitForSyncCycle( page ),
			collaborationUtils.waitForSyncCycle( page2 ),
		] );

		await editor2.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();
		await page2.keyboard.type( marker );

		await expect
			.poll( () => getParagraphContents( editor2 ), { timeout: 5000 } )
			.toContain( marker );

		await Promise.all( [
			collaborationUtils.waitForSyncCycle( page ),
			collaborationUtils.waitForSyncCycle( page2 ),
		] );

		await expect
			.poll( () => getParagraphContents( editor ), { timeout: 10000 } )
			.toContain( marker );
	} );
} );
