/**
 * WordPress dependencies
 */
import { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const HEADING_TEXT = 'A91 remote heading';
const ALPHA_TEXT = 'Alpha base paragraph';
const ALPHA_EDITED_TEXT = 'Alpha base paragraph local edit';
const BETA_TEXT = 'Beta base paragraph';

test.use( { video: 'on', trace: 'on' } );

async function annotate( page, actor: string, message: string ) {
	await page.evaluate(
		( { actorName, line } ) => {
			const id = 'a91-action-log';
			let log = document.getElementById( id );

			if ( ! log ) {
				log = document.createElement( 'pre' );
				log.id = id;
				Object.assign( log.style, {
					position: 'fixed',
					left: '8px',
					bottom: '8px',
					zIndex: '2147483647',
					maxWidth: '520px',
					maxHeight: '40vh',
					overflow: 'auto',
					margin: '0',
					padding: '8px',
					background: 'rgba( 0, 0, 0, 0.78 )',
					color: 'white',
					font: '12px/1.35 monospace',
					whiteSpace: 'pre-wrap',
					pointerEvents: 'none',
				} );
				document.body.appendChild( log );
			}

			log.textContent += `${ actorName }: ${ line }\n`;
		},
		{ actorName: actor, line: message }
	);
}

function initialContent() {
	return [
		'<!-- wp:paragraph -->',
		`<p>${ ALPHA_TEXT }</p>`,
		'<!-- /wp:paragraph -->',
		'',
		'<!-- wp:paragraph -->',
		`<p>${ BETA_TEXT }</p>`,
		'<!-- /wp:paragraph -->',
	].join( '\n' );
}

function blockSummary(
	blocks: Array< {
		name: string;
		attributes?: Record< string, unknown >;
	} >
) {
	return blocks.map( ( block ) => ( {
		name: block.name,
		content:
			typeof block.attributes?.content === 'string'
				? block.attributes.content
				: '',
	} ) );
}

test.describe( 'Collaboration - stale heading delete a91ac70bb0c3', () => {
	test( 'does not preserve a deleted remote heading after another user edits a stale paragraph', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
		browser,
	} ) => {
		test.setTimeout( 60_000 );

		const post = await requestUtils.createPost( {
			title: 'a91 stale heading delete',
			content: initialContent(),
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		const adminStorageState = await page.context().storageState();
		const context2 = await browser.newContext( {
			baseURL: process.env.WP_BASE_URL || 'http://localhost:10145',
			storageState: adminStorageState,
		} );
		const page2 = await context2.newPage();
		await page2.goto( `/wp-admin/post.php?post=${ post.id }&action=edit` );
		await page2.waitForFunction(
			() => window?.wp?.data && window?.wp?.blocks
		);
		await page2.evaluate( () => {
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'core/edit-post', 'welcomeGuide', false );
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'core/edit-post', 'fullscreenMode', false );
		} );
		await collaborationUtils.waitForCollaborationReady( page2 );
		const editor2 = new Editor( { page: page2 } );

		await annotate( page, 'User A', 'opened collaborative post' );
		await annotate( page2, 'User B', 'opened collaborative post' );

		await expect
			.poll( () => editor.getBlocks(), { timeout: 10_000 } )
			.toHaveLength( 2 );
		await expect
			.poll( () => editor2.getBlocks(), { timeout: 10_000 } )
			.toHaveLength( 2 );

		await annotate(
			page2,
			'User B',
			'inserts a Heading after the second paragraph with keyboard UI'
		);
		await editor2.canvas
			.locator( '[data-type="core/paragraph"]' )
			.filter( { hasText: BETA_TEXT } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( '/heading', { delay: 20 } );
		await page2
			.getByRole( 'option', { name: 'Heading', exact: true } )
			.click();
		await page2.keyboard.type( HEADING_TEXT );

		await expect
			.poll( () => editor.getBlocks(), { timeout: 10_000 } )
			.toMatchObject( [
				{ name: 'core/paragraph', attributes: { content: ALPHA_TEXT } },
				{ name: 'core/paragraph', attributes: { content: BETA_TEXT } },
				{
					name: 'core/heading',
					attributes: { content: HEADING_TEXT },
				},
			] );

		await annotate(
			page,
			'User A',
			'deletes the Heading from the block options menu'
		);
		await editor.canvas
			.locator( '[data-type="core/heading"]' )
			.filter( { hasText: HEADING_TEXT } )
			.click();
		await editor.clickBlockOptionsMenuItem( 'Delete' );

		await expect
			.poll(
				async () =>
					blockSummary( await editor.getBlocks() ).some(
						( block ) => block.content === HEADING_TEXT
					),
				{ timeout: 5_000 }
			)
			.toBe( false );

		await annotate(
			page2,
			'User B',
			'immediately edits the first paragraph before waiting for another sync cycle'
		);
		await editor2.canvas
			.locator( '[data-type="core/paragraph"]' )
			.filter( { hasText: ALPHA_TEXT } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.type( ' local edit' );

		await Promise.allSettled( [
			collaborationUtils.waitForSyncCycle( page, 2, { timeout: 15_000 } ),
			collaborationUtils.waitForSyncCycle( page2, 2, {
				timeout: 15_000,
			} ),
		] );

		const finalA = blockSummary( await editor.getBlocks() );
		const finalB = blockSummary( await editor2.getBlocks() );
		await annotate( page, 'User A final', JSON.stringify( finalA ) );
		await annotate( page2, 'User B final', JSON.stringify( finalB ) );

		for ( const finalBlocks of [ finalA, finalB ] ) {
			expect( finalBlocks ).toEqual(
				expect.arrayContaining( [
					expect.objectContaining( {
						name: 'core/paragraph',
						content: ALPHA_EDITED_TEXT,
					} ),
					expect.objectContaining( {
						name: 'core/paragraph',
						content: BETA_TEXT,
					} ),
				] )
			);
			expect(
				finalBlocks.some(
					( block ) =>
						block.name === 'core/heading' &&
						block.content === HEADING_TEXT
				)
			).toBe( false );
		}
	} );
} );
