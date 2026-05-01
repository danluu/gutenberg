/**
 * WordPress dependencies
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { setCollaboration } from './fixtures/collaboration-utils';

type RestField = { raw?: string; rendered?: string } | string;
type RestNavigation = {
	content?: RestField;
	id: number;
	title?: RestField;
};
type RestRevision = {
	content?: RestField;
	id: number;
	title?: RestField;
};
type RequestUtilsLike = {
	activateTheme: ( theme: string ) => Promise< void >;
	createNavigationMenu: (
		options: Record< string, unknown >
	) => Promise< { id: number } >;
	createPage: (
		options: Record< string, unknown >
	) => Promise< { id: number; link?: string } >;
	rest: < T >( options: {
		params?: Record< string, unknown >;
		path: string;
	} ) => Promise< T >;
};

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';

function rawField( field?: RestField ): string {
	if ( ! field ) {
		return '';
	}

	return typeof field === 'string'
		? field
		: field.raw ?? field.rendered ?? '';
}

async function getNavigationMenu(
	requestUtils: RequestUtilsLike,
	id: number
): Promise< RestNavigation > {
	return requestUtils.rest< RestNavigation >( {
		path: `/wp/v2/navigation/${ id }?context=edit`,
	} );
}

async function getNavigationRevisions(
	requestUtils: RequestUtilsLike,
	id: number
): Promise< RestRevision[] > {
	return requestUtils.rest< RestRevision[] >( {
		path: `/wp/v2/navigation/${ id }/revisions`,
		params: {
			context: 'edit',
			per_page: 100,
			_fields: 'id,title.raw,content.raw',
		},
	} );
}

async function dismissSiteEditorGuides( page: any ) {
	const getStartedButton = page.getByRole( 'button', {
		name: 'Get started',
	} );

	if ( await getStartedButton.isVisible().catch( () => false ) ) {
		await getStartedButton.click();
	}
}

function navigationCanvas( page: any ) {
	return page.frameLocator( 'iframe[name="editor-canvas"]' );
}

async function openNavigationEditor( page: any, menuId: number ) {
	await page.goto(
		`/wp-admin/site-editor.php?postId=${ menuId }&postType=wp_navigation&canvas=edit`
	);
	await dismissSiteEditorGuides( page );
	await expect(
		navigationCanvas( page )
			.getByRole( 'textbox', { name: 'Navigation link text' } )
			.first()
	).toBeVisible( { timeout: 60_000 } );
}

async function openNavigationLinkAppender( page: any ) {
	await dismissSiteEditorGuides( page );
	const canvas = navigationCanvas( page );
	const firstLink = canvas
		.getByRole( 'textbox', { name: 'Navigation link text' } )
		.first();

	await expect( firstLink ).toBeVisible( { timeout: 30_000 } );
	await firstLink.click();

	const addPageButton = canvas
		.getByRole( 'document', { name: 'Block: Navigation' } )
		.getByLabel( 'Add page' )
		.first();

	await expect( addPageButton ).toBeVisible( { timeout: 30_000 } );
	await addPageButton.click();
	await expect(
		page.getByRole( 'combobox', { name: 'Search or type URL' } )
	).toBeFocused( { timeout: 30_000 } );
}

async function addPageLinkWithUi( page: any, title: string ) {
	await openNavigationLinkAppender( page );
	await page.keyboard.type( title, { delay: 20 } );
	await expect(
		page.getByRole( 'listbox', { name: 'Search results' } )
	).toBeVisible( { timeout: 30_000 } );
	await page.keyboard.press( 'ArrowDown' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'Escape' );
	await expect(
		navigationCanvas( page )
			.getByRole( 'textbox', { name: 'Navigation link text' } )
			.filter( { hasText: title } )
	).toBeVisible( { timeout: 30_000 } );
}

async function addCustomLinkWithUi( page: any, url: string ) {
	await openNavigationLinkAppender( page );
	await page.keyboard.type( url, { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await expect(
		navigationCanvas( page )
			.getByRole( 'textbox', { name: 'Navigation link text' } )
			.filter( { hasText: url.replace( /^https?:\/\//, '' ) } )
	).toBeVisible( { timeout: 30_000 } );
}

async function saveNavigationMenu( page: any ) {
	await dismissSiteEditorGuides( page );
	const saveButton = page
		.getByRole( 'button', { name: 'Save', exact: true } )
		.first();

	await expect( saveButton ).toBeEnabled( { timeout: 30_000 } );
	await saveButton.click();
	await page
		.getByRole( 'button', { name: 'Dismiss this notice' } )
		.filter( { hasText: 'updated' } )
		.waitFor( { timeout: 30_000 } );
}

test.describe( 'Collaboration - navigation menu stale save', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		const typedRequestUtils = requestUtils as unknown as RequestUtilsLike;
		await typedRequestUtils.activateTheme( 'emptytheme' );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		const typedRequestUtils = requestUtils as unknown as RequestUtilsLike;
		await typedRequestUtils.activateTheme( 'twentytwentyone' );
	} );

	test( 'normal two-window menu edits preserve a page link restored by the first window', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		await setCollaboration( requestUtils, true );
		const typedRequestUtils = requestUtils as unknown as RequestUtilsLike;
		const stamp = Date.now();
		const pageTitle = `Debussy Images UI ${ stamp }`;
		const supportUrl = `https://example.com/support-ui-${ stamp }`;
		const pageEntity = await typedRequestUtils.createPage( {
			content: `<!-- wp:paragraph --><p>Debussy UI page body ${ stamp }</p><!-- /wp:paragraph -->`,
			status: 'publish',
			title: pageTitle,
		} );
		const menu = await typedRequestUtils.createNavigationMenu( {
			title: `Zendesk UI restored menu ${ stamp }`,
			status: 'publish',
			content: `<!-- wp:navigation-link {"label":"Home","type":"custom","url":"${ BASE_URL }/","kind":"custom"} /-->`,
		} );
		const staleContext = await admin.browser.newContext( {
			baseURL: BASE_URL,
			storageState: await page.context().storageState(),
		} );
		const stalePage = await staleContext.newPage();

		try {
			await openNavigationEditor( page, menu.id );
			await openNavigationEditor( stalePage, menu.id );

			await addPageLinkWithUi( page, pageTitle );
			await saveNavigationMenu( page );
			await expect
				.poll(
					async () =>
						rawField(
							(
								await getNavigationMenu(
									typedRequestUtils,
									menu.id
								)
							).content
						),
					{ timeout: 30_000 }
				)
				.toContain( pageTitle );

			await addCustomLinkWithUi( stalePage, supportUrl );
			await saveNavigationMenu( stalePage );

			const current = await getNavigationMenu(
				typedRequestUtils,
				menu.id
			);
			const revisions = await getNavigationRevisions(
				typedRequestUtils,
				menu.id
			);
			const currentText = `${ rawField( current.title ) }\n${ rawField(
				current.content
			) }`;
			const revisionText = revisions
				.map(
					( revision ) =>
						`${ rawField( revision.title ) }\n${ rawField(
							revision.content
						) }`
				)
				.join( '\n' );

			expect.soft( currentText ).toContain( 'Home' );
			expect.soft( currentText ).toContain( supportUrl );
			expect.soft( currentText ).toContain( pageTitle );
			expect.soft( currentText ).toContain( String( pageEntity.id ) );
			expect.soft( revisionText ).toContain( pageTitle );
			expect.soft( revisionText ).toContain( supportUrl );
		} finally {
			await staleContext.close();
			await setCollaboration( requestUtils, false );
		}
	} );
} );
