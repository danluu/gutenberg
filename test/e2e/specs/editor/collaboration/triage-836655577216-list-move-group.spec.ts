/**
 * External dependencies
 */
import type { Page, Route } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Heading to delete</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:list -->',
	'<ul class="wp-block-list">',
	'<!-- wp:list-item --><li>One</li><!-- /wp:list-item -->',
	'<!-- wp:list-item --><li>Two</li><!-- /wp:list-item -->',
	'<!-- wp:list-item --><li>Three</li><!-- /wp:list-item -->',
	'</ul>',
	'<!-- /wp:list -->',
	'<!-- wp:group -->',
	'<div class="wp-block-group">',
	'<!-- wp:paragraph --><p>Group child one</p><!-- /wp:paragraph -->',
	'<!-- wp:paragraph --><p>Group child two</p><!-- /wp:paragraph -->',
	'</div>',
	'<!-- /wp:group -->',
	'<!-- wp:quote -->',
	'<blockquote class="wp-block-quote">',
	'<!-- wp:paragraph --><p>Quote body</p><!-- /wp:paragraph -->',
	'</blockquote>',
	'<!-- /wp:quote -->',
].join( '\n' );

async function delaySyncRequests( page: Page ) {
	const pendingRoutes: Route[] = [];
	let released = false;

	await page.route( '**/*wp-sync*', async ( route ) => {
		if ( released ) {
			await route.continue();
			return;
		}
		pendingRoutes.push( route );
	} );

	return async () => {
		released = true;
		await page.unroute( '**/*wp-sync*' );
		for ( const route of pendingRoutes.splice( 0 ) ) {
			await route.continue();
		}
	};
}

async function blockSummary( page: Page ) {
	return page.evaluate( () =>
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block ) => ( {
				name: block.name,
				innerBlocks: block.innerBlocks.length,
			} ) )
	);
}

async function openListView( page: Page ) {
	const button = page.getByRole( 'button', { name: 'Document Overview' } );
	if ( ( await button.getAttribute( 'aria-expanded' ) ) !== 'true' ) {
		await button.click();
	}
	await expect(
		page.getByRole( 'region', { name: 'Document Overview' } )
	).toBeVisible();
}

test.describe( 'Collaboration - 836655577216 list move group corruption', () => {
	test( 'stale list move preserves group after concurrent heading delete and pullquote insert', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC 836655577216 list move group',
			status: 'draft',
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openCollaborativeSession( post.id );

		const collaboratorPage = collaborationUtils.page2;
		const collaboratorEditor = collaborationUtils.editor2;
		const releaseCollaboratorSync =
			await delaySyncRequests( collaboratorPage );

		await editor.canvas.getByText( 'Heading to delete' ).click();
		await editor.clickBlockOptionsMenuItem( 'Delete' );

		await openListView( page );
		await page
			.locator( '.block-editor-list-view-tree' )
			.getByText( /^Quote$/ )
			.click();
		await editor.clickBlockOptionsMenuItem( 'Add after' );
		await page.keyboard.type( '/pullquote' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Inserted pullquote' );

		await openListView( collaboratorPage );
		await collaboratorPage
			.locator( '.block-editor-list-view-tree' )
			.getByText( /^List$/ )
			.click();
		await collaboratorEditor.clickBlockToolbarButton( 'Move up' );

		await releaseCollaboratorSync();
		await collaborationUtils.waitForSyncCycle( page, 2, {
			timeout: 15000,
		} );
		await collaborationUtils.waitForSyncCycle( collaboratorPage, 2, {
			timeout: 15000,
		} );

		await expect
			.poll( () => blockSummary( page ), { timeout: 15000 } )
			.toEqual( [
				{ name: 'core/list', innerBlocks: 3 },
				{ name: 'core/group', innerBlocks: 2 },
				{ name: 'core/quote', innerBlocks: 1 },
				{ name: 'core/pullquote', innerBlocks: 0 },
			] );

		await expect
			.poll( () => blockSummary( collaboratorPage ), { timeout: 15000 } )
			.toEqual( [
				{ name: 'core/list', innerBlocks: 3 },
				{ name: 'core/group', innerBlocks: 2 },
				{ name: 'core/quote', innerBlocks: 1 },
				{ name: 'core/pullquote', innerBlocks: 0 },
			] );
	} );
} );
