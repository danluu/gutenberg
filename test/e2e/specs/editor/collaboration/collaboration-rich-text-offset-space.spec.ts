/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const OLD_HTML = '<em>italic</em><em>italic</em>';
const NEW_HTML = '<em>italic</em>beta';
const TEXT_OFFSET = 10;
const USER_SEEDED_HTML = 'italic<em>betabetax</em>';
const USER_OLD_HTML = 'italic<em>betabeta</em>';
const USER_NEW_HTML = 'italic<em>beta</em>beta';
const USER_SELECTION_START_OFFSET = 10;
const USER_SELECTION_END_OFFSET = 14;
const ITALIC_SHORTCUT = process.platform === 'darwin' ? 'Meta+I' : 'Control+I';

test.describe( 'Collaboration - RichText Offset Space', () => {
	test( 'preserves formatted paragraph content when syncing a text-space selection offset', async ( {
		collaborationUtils,
		requestUtils,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC RichText Offset Space',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: `<!-- wp:paragraph --><p>${ OLD_HTML }</p><!-- /wp:paragraph -->`,
		} );

		await collaborationUtils.openCollaborativeSession( post.id );

		const { editor2, page2 } = collaborationUtils;

		// Seed the CRDT `blocks` tree first. When the CRDT document only has
		// `content.raw`, the first block edit initializes `blocks` instead of
		// diffing existing rich text.
		await page.evaluate( ( offset ) => {
			const postId = ( window as any ).wp.data
				.select( 'core/editor' )
				.getCurrentPostId();
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const clientId = blocks[ 0 ].clientId;

			( window as any ).wp.data.dispatch( 'core' ).editEntityRecord(
				'postType',
				'post',
				postId,
				{
					blocks,
					selection: {
						selectionStart: {
							clientId,
							attributeKey: 'content',
							offset,
						},
						selectionEnd: {
							clientId,
							attributeKey: 'content',
							offset,
						},
					},
				},
				{ isCached: true }
			);
		}, TEXT_OFFSET );

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await page.evaluate(
			( { newHtml, offset } ) => {
				const postId = ( window as any ).wp.data
					.select( 'core/editor' )
					.getCurrentPostId();
				const blocks = ( window as any ).wp.data
					.select( 'core/block-editor' )
					.getBlocks();
				const clientId = blocks[ 0 ].clientId;
				const nextBlocks = [
					{
						...blocks[ 0 ],
						attributes: {
							...blocks[ 0 ].attributes,
							content: newHtml,
						},
					},
				];

				( window as any ).wp.data.dispatch( 'core' ).editEntityRecord(
					'postType',
					'post',
					postId,
					{
						blocks: nextBlocks,
						selection: {
							selectionStart: {
								clientId,
								attributeKey: 'content',
								offset,
							},
							selectionEnd: {
								clientId,
								attributeKey: 'content',
								offset,
							},
						},
					},
					{ isCached: true }
				);
			},
			{ newHtml: NEW_HTML, offset: TEXT_OFFSET }
		);

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: NEW_HTML },
				},
			] );
	} );

	test( 'preserves formatted paragraph content when a user unitalicizes part of an italic run', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC RichText Offset Space - User Flow',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: `<!-- wp:paragraph --><p>${ USER_SEEDED_HTML }</p><!-- /wp:paragraph -->`,
		} );

		await collaborationUtils.openCollaborativeSession( post.id );

		const { editor2, page2 } = collaborationUtils;
		const paragraph = editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.first();

		// The first rich-text edit seeds the CRDT `blocks` tree. Start from a
		// paragraph with one extra italic character so a real Backspace returns
		// the editor to the known old value before the repro action.
		await paragraph.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Backspace' );

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => editor.getBlocks(), { timeout: 10000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: USER_OLD_HTML },
				},
			] );
		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: USER_OLD_HTML },
				},
			] );

		await paragraph.click();
		await page.keyboard.press( 'End' );
		for ( let i = 0; i < 4; i++ ) {
			await page.keyboard.press( 'Shift+ArrowLeft' );
		}

		const selectedWordOffsets = await page.evaluate( () => {
			const selectionStart = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getSelectionStart();
			const selectionEnd = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getSelectionEnd();

			return {
				startOffset: selectionStart.offset,
				endOffset: selectionEnd.offset,
			};
		} );

		expect( selectedWordOffsets.startOffset ).toBe(
			USER_SELECTION_START_OFFSET
		);
		expect( selectedWordOffsets.endOffset ).toBe(
			USER_SELECTION_END_OFFSET
		);

		// This is the repro action. Pre-fix, the local editor has
		// USER_NEW_HTML, but the collaborator receives
		// `italic<em>beta</em>/em>`.
		await page.keyboard.press( ITALIC_SHORTCUT );

		await expect
			.poll( () => editor.getBlocks(), { timeout: 10000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: USER_NEW_HTML },
				},
			] );

		const finalOffsets = await page.evaluate( () => {
			const selectionStart = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getSelectionStart();
			const selectionEnd = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getSelectionEnd();

			return {
				startOffset: selectionStart.offset,
				endOffset: selectionEnd.offset,
			};
		} );

		expect( finalOffsets.startOffset ).toBe( USER_SELECTION_START_OFFSET );
		expect( finalOffsets.endOffset ).toBe( USER_SELECTION_END_OFFSET );

		await collaborationUtils.waitForSyncCycle( page );
		await collaborationUtils.waitForSyncCycle( page2 );

		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10000 } )
			.toMatchObject( [
				{
					name: 'core/paragraph',
					attributes: { content: USER_NEW_HTML },
				},
			] );
	} );
} );
