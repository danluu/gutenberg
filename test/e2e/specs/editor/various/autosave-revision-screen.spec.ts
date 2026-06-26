/**
 * External dependencies
 */
import type { Page, Response } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

type RestField = { raw?: string; rendered?: string } | string;

type RestPost = {
	id: number;
	content?: RestField;
	title?: RestField;
};

function rawField( field?: RestField ): string {
	if ( ! field ) {
		return '';
	}

	return typeof field === 'string'
		? field
		: field.raw ?? field.rendered ?? '';
}

function blockParagraph( text: string ): string {
	return `<!-- wp:paragraph -->\n<p>${ text }</p>\n<!-- /wp:paragraph -->`;
}

async function getCurrentPostId( page: Page ): Promise< number > {
	return page.evaluate( () =>
		( window as any ).wp.data.select( 'core/editor' ).getCurrentPostId()
	);
}

async function waitForEditorReady( page: Page ): Promise< void > {
	await page.waitForFunction(
		() => {
			const postId = ( window as any ).wp?.data
				?.select( 'core/editor' )
				?.getCurrentPostId?.();

			return (
				!! postId &&
				( window as any ).wp.data
					.select( 'core' )
					.hasFinishedResolution( 'getEntityRecord', [
						'postType',
						'post',
						postId,
					] )
			);
		},
		undefined,
		{ timeout: 30_000 }
	);
}

function isAutosaveResponse( response: Response, postId: number ): boolean {
	if ( response.request().method() !== 'POST' ) {
		return false;
	}

	const url = new URL( response.url() );
	const route = `/wp/v2/posts/${ postId }/autosaves`;

	return (
		url.pathname.includes( `/wp-json${ route }` ) ||
		url.searchParams.get( 'rest_route' ) === route
	);
}

async function waitForAutosaveSettled( page: Page ): Promise< void > {
	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data
				.select( 'core/editor' )
				.isAutosavingPost(),
		undefined,
		{ timeout: 30_000 }
	);
}

async function waitForSaveSettled( page: Page ): Promise< void > {
	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: 30_000 }
	);
}

async function savePublishedPostUsingUi( page: Page ): Promise< void > {
	const saveButton = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Save', exact: true } );

	await expect( saveButton ).toBeEnabled();
	await saveButton.click();
	await waitForSaveSettled( page );
	await page
		.getByRole( 'button', { name: 'Dismiss this notice' } )
		.filter( { hasText: 'updated' } )
		.waitFor( { timeout: 30_000 } );
}

async function useFastAutosaveInterval( page: Page ): Promise< void > {
	await page.evaluate( () => {
		const editorStore = ( window as any ).wp.data.select( 'core/editor' );
		const settings = editorStore.getEditorSettings();

		( window as any ).wp.data
			.dispatch( 'core/editor' )
			.updateEditorSettings( {
				...settings,
				autosaveInterval: 1,
			} );
	} );
}

async function replaceParagraphText(
	page: Page,
	editor: { canvas: ReturnType< Page[ 'frameLocator' ] > },
	text: string
): Promise< void > {
	const paragraph = editor.canvas.getByRole( 'document', {
		name: 'Block: Paragraph',
	} );
	await paragraph.click();
	await page.keyboard.press( 'ControlOrMeta+A' );
	await page.keyboard.type( text );
	await expect( paragraph ).toHaveText( text );
}

test.describe( 'Autosave revision screen', () => {
	const newerAutosaveNoticeText =
		'There is an autosave of this post that is more recent than the version below.';

	test( 'shows content when viewing a meaningful newer autosave from the editor notice', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const unique = Date.now();
		const title = `Published autosave revision ${ unique }`;
		const initialText = 'The first neutral paragraph is ready for review.';
		const marker = `autosave-revision-marker-${ unique }`;
		const updatedText = `${ initialText } ${ marker }`;

		const post = await requestUtils.createPost( {
			title,
			content: blockParagraph( initialText ),
			status: 'publish',
			date_gmt: new Date().toISOString(),
		} );

		await admin.editPost( post.id );
		await waitForEditorReady( page );

		const postId = await getCurrentPostId( page );
		expect( postId ).toBe( post.id );

		await editor.setContent( blockParagraph( updatedText ) );

		const autosaveRequest = page.waitForResponse(
			( response ) => isAutosaveResponse( response, postId ),
			{ timeout: 30_000 }
		);
		await page.evaluate( () =>
			( window as any ).wp.data.dispatch( 'core/editor' ).autosave()
		);
		const autosaveResponse = await autosaveRequest;
		expect( autosaveResponse.status() ).toBe( 200 );
		await waitForAutosaveSettled( page );

		const autosaves = await requestUtils.rest< RestPost[] >( {
			path: `/wp/v2/posts/${ postId }/autosaves`,
			params: { context: 'edit' },
		} );
		expect(
			autosaves.some( ( autosave ) =>
				rawField( autosave.content ).includes( marker )
			)
		).toBe( true );

		await page.reload();
		await waitForEditorReady( page );

		await expect(
			page.locator( '.components-notice__content' )
		).toContainText( newerAutosaveNoticeText );

		await page.getByRole( 'link', { name: 'View the autosave' } ).click();
		await page.waitForURL( /revision\.php\?revision=\d+/, {
			timeout: 30_000,
		} );

		await expect(
			page.getByRole( 'heading', {
				name: new RegExp( `Compare Revisions of .+${ title }` ),
			} )
		).toBeVisible();
		await expect(
			page.getByText( 'Content', { exact: true } )
		).toBeVisible();
		await expect( page.getByText( marker ) ).toBeVisible();
		await expect( page.getByText( updatedText ) ).toBeVisible();
	} );

	test( 'reproduces the stale newer-autosave notice after a normal category edit is automatically autosaved', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const unique = Date.now();
		const title = `Published category autosave ${ unique }`;
		const initialText = 'The first neutral paragraph is ready for review.';
		const currentText =
			'The updated neutral paragraph is ready for review.';

		const post = await requestUtils.createPost( {
			title,
			content: blockParagraph( initialText ),
			status: 'publish',
			date_gmt: new Date().toISOString(),
		} );

		await admin.editPost( post.id );
		await waitForEditorReady( page );

		await replaceParagraphText( page, editor, currentText );
		await savePublishedPostUsingUi( page );

		const useDefaultAutosaveInterval =
			process.env.WP_E2E_USE_DEFAULT_AUTOSAVE_INTERVAL === '1';
		if ( ! useDefaultAutosaveInterval ) {
			await useFastAutosaveInterval( page );
		}

		const postId = await getCurrentPostId( page );
		const autosaveRequest = page.waitForResponse(
			( response ) => isAutosaveResponse( response, postId ),
			{ timeout: useDefaultAutosaveInterval ? 90_000 : 30_000 }
		);

		await editor.openDocumentSettingsSidebar();
		await page
			.getByRole( 'region', { name: 'Editor settings' } )
			.getByRole( 'tab', { name: 'Post' } )
			.click();
		const panelToggle = page.getByRole( 'button', {
			name: 'Categories',
		} );

		if (
			( await panelToggle.getAttribute( 'aria-expanded' ) ) === 'false'
		) {
			await panelToggle.click();
		}

		await page
			.getByRole( 'button', {
				name: 'Add Category',
				expanded: false,
			} )
			.click();
		await page
			.getByRole( 'textbox', { name: 'New Category Name' } )
			.fill( `autosave category ${ unique }` );
		await page.keyboard.press( 'Enter' );

		const autosaveResponse = await autosaveRequest;
		expect( autosaveResponse.status() ).toBe( 200 );
		await waitForAutosaveSettled( page );

		const autosaves = await requestUtils.rest< RestPost[] >( {
			path: `/wp/v2/posts/${ postId }/autosaves`,
			params: { context: 'edit' },
		} );
		const noOpContentAutosave = autosaves.find( ( autosave ) =>
			rawField( autosave.content ).includes( currentText )
		);
		expect( noOpContentAutosave ).toBeTruthy();

		const savedPost = await requestUtils.rest< RestPost >( {
			path: `/wp/v2/posts/${ postId }`,
			params: { context: 'edit' },
		} );
		expect( rawField( noOpContentAutosave?.content ) ).toBe(
			rawField( savedPost.content )
		);
		expect( rawField( noOpContentAutosave?.title ) ).toBe(
			rawField( savedPost.title )
		);

		page.once( 'dialog', ( dialog ) => dialog.accept() );
		await page.reload();
		await waitForEditorReady( page );

		const notice = page
			.locator( '.components-notice__content' )
			.filter( { hasText: newerAutosaveNoticeText } );
		await expect( notice ).toBeVisible();

		await page.getByRole( 'link', { name: 'View the autosave' } ).click();
		await page.waitForURL( /revision\.php\?revision=\d+/, {
			timeout: 30_000,
		} );

		await expect(
			page.getByRole( 'heading', {
				name: new RegExp( `Compare Revisions of .+${ title }` ),
			} )
		).toBeVisible();
		await expect(
			page.getByText( 'Title', { exact: true } )
		).toBeVisible();
		await expect(
			page.getByText( 'Content', { exact: true } )
		).toBeHidden();
	} );
} );
