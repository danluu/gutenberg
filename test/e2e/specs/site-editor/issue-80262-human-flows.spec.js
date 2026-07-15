/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const PREVIEW_POST_TITLE = 'Issue 80262 visible post';

function getDesignNavigation( page ) {
	return page.getByRole( 'region', { name: 'Navigation' } );
}

function getPreviewPost( editor ) {
	return editor.canvas.getByText( PREVIEW_POST_TITLE ).first();
}

function getIframeDocumentErrors( pageErrors ) {
	return pageErrors.filter(
		( message ) =>
			message.includes( 'documentElement' ) && message.includes( 'null' )
	);
}

async function openIdentityEditor( { admin, editor, page } ) {
	await admin.visitSiteEditor();
	const designNavigation = getDesignNavigation( page );
	await designNavigation
		.getByRole( 'button', { name: 'Identity', exact: true } )
		.click();

	const previewPost = getPreviewPost( editor );
	await expect( previewPost ).toBeVisible();
	await page
		.getByRole( 'region', { name: 'Editor content' } )
		.getByRole( 'button', { name: 'Edit' } )
		.click();

	return { designNavigation, previewPost };
}

async function setResponsivePostTitleSize( { editor, page }, size ) {
	await editor.canvas
		.getByRole( 'document', { name: 'Block: Query Loop' } )
		.click();
	await page.getByRole( 'button', { name: 'Edit pattern' } ).first().click();

	const topBar = page.getByRole( 'region', { name: 'Editor top bar' } );
	await topBar.getByRole( 'button', { name: 'View', exact: true } ).click();

	const mobileView = page.getByRole( 'menuitemradio', { name: 'Mobile' } );
	if ( ( await mobileView.getAttribute( 'aria-checked' ) ) !== 'true' ) {
		await mobileView.click();
	}

	const responsiveStyles = page.getByRole( 'menuitemcheckbox', {
		name: /Responsive (styles|editing)/,
	} );
	if (
		( await responsiveStyles.getAttribute( 'aria-checked' ) ) !== 'true'
	) {
		await responsiveStyles.click();
	}

	await editor.canvas
		.getByRole( 'document', { name: 'Block: Title' } )
		.first()
		.click();
	await page
		.getByRole( 'region', { name: 'Editor settings' } )
		.getByRole( 'group', { name: 'Font size' } )
		.getByRole( 'radio', { name: size, exact: true } )
		.click();
	await page.getByRole( 'button', { name: 'Exit pattern' } ).first().click();
}

async function openNavigationFromEditor( page ) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Open Navigation', exact: true } )
		.click();
}

async function applyDuskAndSave( page, designNavigation ) {
	await designNavigation
		.getByRole( 'button', { name: 'Styles', exact: true } )
		.click();
	await page.getByRole( 'button', { name: 'Browse styles' } ).click();
	await page
		.getByRole( 'button', { name: 'Dusk', exact: true } )
		.first()
		.click();

	await page.getByRole( 'button', { name: /Review 2 changes/ } ).click();
	const reviewDialog = page.getByRole( 'dialog', { name: 'Review changes' } );
	await expect( reviewDialog.getByText( 'Blog Home' ) ).toBeVisible();
	await expect( reviewDialog.getByText( 'Custom Styles' ) ).toBeVisible();
	await expect(
		reviewDialog.getByText( 'Typography styles.' )
	).toBeVisible();
	await reviewDialog.getByRole( 'button', { name: 'Save' } ).click();
	await expect( page.getByRole( 'button', { name: 'Saved' } ) ).toBeVisible();
}

async function initializeDuskResponsiveState( fixtures ) {
	const { designNavigation, previewPost } =
		await openIdentityEditor( fixtures );
	await setResponsivePostTitleSize( fixtures, 'Large' );
	await openNavigationFromEditor( fixtures.page );
	await applyDuskAndSave( fixtures.page, designNavigation );
	return { designNavigation, previewPost };
}

async function expectPreviewVisibleFiveSecondsLater( previewPost, pageErrors ) {
	await expect( previewPost ).toBeVisible( { timeout: 5_000 } );
	const observationStarted = Date.now();
	await expect
		.poll(
			async () =>
				Date.now() - observationStarted >= 5_000 &&
				( await previewPost.isVisible() ),
			{ timeout: 6_000, intervals: [ 250 ] }
		)
		.toBe( true );
	expect( getIframeDocumentErrors( pageErrors ) ).toEqual( [] );
}

test.describe( 'Issue 80262 reported human flows', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'twentytwentyfive' );
	} );

	test.beforeEach( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllPosts(),
			requestUtils.deleteAllTemplates( 'wp_template' ),
			requestUtils.deleteAllTemplates( 'wp_template_part' ),
			requestUtils.resetThemeGlobalStyles(),
		] );
		await requestUtils.createPost( {
			title: PREVIEW_POST_TITLE,
			content: 'Known preview content',
			status: 'publish',
		} );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllPosts(),
			requestUtils.deleteAllTemplates( 'wp_template' ),
			requestUtils.deleteAllTemplates( 'wp_template_part' ),
			requestUtils.resetThemeGlobalStyles(),
		] );
		await requestUtils.activateTheme( 'twentytwentyone' );
	} );

	test( 'example 1: preview is visible five seconds after Dusk save and opening Identity', async ( {
		admin,
		editor,
		page,
	} ) => {
		const pageErrors = [];
		page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) );

		const { designNavigation, previewPost } =
			await initializeDuskResponsiveState( { admin, editor, page } );
		await designNavigation
			.getByRole( 'button', { name: 'Identity', exact: true } )
			.click();
		await expect(
			page.getByRole( 'heading', { name: 'Identity' } )
		).toBeVisible();
		await expectPreviewVisibleFiveSecondsLater( previewPost, pageErrors );
	} );

	test( 'example 2: preview is visible five seconds after responsive save and opening Styles', async ( {
		admin,
		editor,
		page,
	} ) => {
		const pageErrors = [];
		page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) );

		// The second reporter video starts with the Dusk and responsive edits from
		// the first video already saved, but from a recovered Site Editor session.
		await initializeDuskResponsiveState( { admin, editor, page } );
		expect( getIframeDocumentErrors( pageErrors ) ).toEqual( [] );
		pageErrors.length = 0;
		const { designNavigation, previewPost } = await openIdentityEditor( {
			admin,
			editor,
			page,
		} );

		await setResponsivePostTitleSize( { editor, page }, 'Small' );
		await editor.canvas
			.getByRole( 'document', { name: 'Block: Header' } )
			.click();
		await editor.clickBlockOptionsMenuItem( 'Hide' );
		const hideDialog = page.getByRole( 'dialog', { name: 'Hide block' } );
		await hideDialog
			.getByRole( 'checkbox', { name: /Hide on Mobile/ } )
			.check();
		await hideDialog.getByRole( 'button', { name: 'Apply' } ).click();

		await openNavigationFromEditor( page );
		await expect(
			page.getByRole( 'heading', { name: 'Identity' } )
		).toBeVisible();
		await page.getByRole( 'button', { name: /Review 1 change/ } ).click();
		await page
			.getByRole( 'dialog', { name: 'Review changes' } )
			.getByRole( 'button', { name: 'Save' } )
			.click();
		await expect(
			page.getByRole( 'button', { name: 'Saved' } )
		).toBeVisible();

		await designNavigation
			.getByRole( 'button', { name: 'Styles', exact: true } )
			.click();
		await expect(
			page.getByRole( 'heading', { name: 'Styles' } )
		).toBeVisible();
		await expectPreviewVisibleFiveSecondsLater( previewPost, pageErrors );
	} );
} );
