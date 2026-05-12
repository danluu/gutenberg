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

const ALPHA = '59ce alpha paragraph should survive.';
const BETA = '59ce beta paragraph delete target.';
const GAMMA = '59ce gamma paragraph should survive.';

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ ALPHA }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ BETA }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ GAMMA }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

type LiveSummary = {
	blockCount: number;
	blockText: string[];
	title: string;
};

async function getLiveSummary( page: Page ): Promise< LiveSummary > {
	return page.evaluate( () => {
		const blocks = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks();

		return {
			blockCount: blocks.length,
			blockText: blocks.map(
				( block: { attributes?: { content?: string } } ) =>
					block.attributes?.content ?? ''
			),
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
		};
	} );
}

async function getPersistedContent(
	requestUtils: {
		rest: < T >( options: { path: string } ) => Promise< T >;
	},
	postId: number
): Promise< string > {
	const post = await requestUtils.rest< {
		content?: { raw?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }?context=edit`,
	} );

	return post.content?.raw ?? '';
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitem', { name: 'Delete' } ).click();
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title );
	await expect( titleBox ).toContainText( title );
}

function countOccurrences( content: string, marker: string ) {
	return content.split( marker ).length - 1;
}

test.describe( 'Collaboration - RTC reload stale save reconciliation', () => {
	test( 'does not persist stale or duplicated body after collaborator delete and reload save', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180000 );

		const post = await requestUtils.createPost( {
			content: INITIAL_CONTENT,
			date_gmt: new Date().toISOString(),
			status: 'draft',
			title: '59ce initial delete reload save',
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, SECOND_USER );

		await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );

		await collaboratorEditor.canvas.getByText( BETA ).click();
		await deleteSelectedBlock( collaboratorPage, collaboratorEditor );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 20000,
		} );

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
		await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 30000,
		} );

		await typeTitle( editor, page, '59ce saved delete reload save' );
		await editor.saveDraft();
		await expect(
			page
				.getByTestId( 'snackbar' )
				.getByText( /Draft saved|Draft saved by/ )
		).toBeVisible( { timeout: 20000 } );

		const persistedContent = await getPersistedContent(
			requestUtils,
			post.id
		);
		const afterSave = {
			primary: await getLiveSummary( page ),
			collaborator: await getLiveSummary( collaboratorPage ),
		};

		expect( afterSave.primary.blockText ).toEqual( [ ALPHA, GAMMA ] );
		expect( afterSave.collaborator.blockText ).toEqual( [ ALPHA, GAMMA ] );
		expect( persistedContent ).toContain( ALPHA );
		expect( persistedContent ).not.toContain( BETA );
		expect( countOccurrences( persistedContent, GAMMA ) ).toBe( 1 );
	} );
} );
