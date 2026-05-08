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

const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

async function waitForWebSocketPeers(
	pages: Page[],
	postId: number,
	{ timeout = 20000 }: { timeout?: number } = {}
) {
	const room = `postType/post:${ postId }`;
	await Promise.all(
		pages.map( ( page ) =>
			page.waitForFunction(
				( { expectedPeers, roomName } ) => {
					const roomState = ( window as any )
						.__gutenbergTestWebSocketSync?.rooms?.[ roomName ];
					return (
						roomState?.status === 'connected' &&
						roomState?.awarenessCount >= expectedPeers
					);
				},
				{ expectedPeers: pages.length, roomName: room },
				{ timeout }
			)
		)
	);
}

async function getNormalizedPostState( page: Page ) {
	return page.evaluate( () => {
		const normalizeBlock = ( block: any ): any => ( {
			name: block.name,
			attributes: block.attributes,
			innerBlocks: ( block.innerBlocks || [] ).map( normalizeBlock ),
		} );
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( normalizeBlock );

		return {
			blocks,
			title: ( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostAttribute( 'title' ),
		};
	} );
}

async function waitForConvergence(
	pages: Page[],
	{ timeout = 20000 }: { timeout?: number } = {}
) {
	const start = Date.now();
	let lastStates: unknown[] = [];

	while ( Date.now() - start < timeout ) {
		lastStates = await Promise.all( pages.map( getNormalizedPostState ) );
		const [ firstState, ...otherStates ] = lastStates.map( ( state ) =>
			JSON.stringify( state )
		);

		if ( otherStates.every( ( state ) => state === firstState ) ) {
			return;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw new Error(
		`Collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
			lastStates
		) }`
	);
}

async function waitForSessionReady(
	pages: Page[],
	postId: number,
	{ timeout = 20000 }: { timeout?: number } = {}
) {
	await waitForWebSocketPeers( pages, postId, { timeout } );
	await waitForConvergence( pages, { timeout } );
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 20 } );
	await expect( titleBox ).toContainText( title );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function addParagraphAfterSelected(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}

	await page.keyboard.type( paragraphText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( paragraphText, { exact: false } )
	).toBeVisible();
}

async function addHeadingBeforeSelected(
	page: Page,
	editor: Editor,
	headingText: string
) {
	await openBlockOptions( page, editor );
	const addBeforeItem = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBeforeItem.isVisible().catch( () => false ) ) {
		await addBeforeItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}

	await page.keyboard.type( '/heading' );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( `${ MODIFIER_KEY }+Alt+4` );
	await page.keyboard.type( headingText, { delay: 15 } );
	await expect(
		editor.canvas.getByText( headingText, { exact: false } )
	).toBeVisible();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await openBlockOptions( page, editor );
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

test.describe.configure( { mode: 'serial' } );

test( 'remote delete after paragraph and heading insert converges without stale paragraph', async ( {
	collaborationUtils,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const titleText = 'RTC seed 951195 step 1 user 0 title 545253';
	const insertedParagraph = 'Seed 951195 step 2 user 0 paragraph 879021';
	const insertedHeading = 'Seed 951195 step 3 user 0 heading';

	const post = await requestUtils.createPost( {
		content: INITIAL_CONTENT,
		date_gmt: new Date().toISOString(),
		status: 'draft',
		title: 'RTC seed 951195 initial title',
	} );

	await collaborationUtils.openPost( post.id );
	const { editor: collaboratorEditor, page: collaboratorPage } =
		await collaborationUtils.joinUser( post.id, SECOND_USER );
	const [ primaryEditor ] = collaborationUtils.allEditors;
	const pages = collaborationUtils.allPages;

	await waitForSessionReady( pages, post.id );

	await typeTitle( primaryEditor, page, titleText );
	await waitForSessionReady( pages, post.id );

	await clickBlockByText( primaryEditor, page, 'Follow-up heading' );
	await addParagraphAfterSelected( page, primaryEditor, insertedParagraph );
	await waitForSessionReady( pages, post.id );

	await clickBlockByText(
		primaryEditor,
		page,
		'Tail paragraph kept for save and reload stability checks.'
	);
	await addHeadingBeforeSelected( page, primaryEditor, insertedHeading );
	await waitForSessionReady( pages, post.id );

	await clickBlockByText(
		collaboratorEditor,
		collaboratorPage,
		insertedParagraph
	);
	await deleteSelectedBlock( collaboratorPage, collaboratorEditor );

	await waitForConvergence( pages, { timeout: 15000 } );
	await expect(
		primaryEditor.canvas.getByText( insertedParagraph, { exact: false } )
	).toHaveCount( 0 );
	await expect(
		collaboratorEditor.canvas.getByText( insertedParagraph, {
			exact: false,
		} )
	).toHaveCount( 0 );
} );
