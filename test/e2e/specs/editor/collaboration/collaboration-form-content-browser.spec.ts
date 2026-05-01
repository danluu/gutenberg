/**
 * External dependencies
 */
import type { BrowserContext, Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { setCollaboration } from './fixtures/collaboration-utils';

type RestField = { raw?: string; rendered?: string } | string;
type RestPost = {
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
	createPost: (
		data: Record< string, unknown >
	) => Promise< { id: number } >;
	rest: < T >( options: {
		method?: string;
		params?: Record< string, unknown >;
		path: string;
	} ) => Promise< T >;
	setGutenbergExperiments: ( experiments: string[] ) => Promise< void >;
};

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const MODIFIER = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

const test = base.extend< { collaborationSetup: void } >( {
	collaborationSetup: [
		async ( { requestUtils }, use ) => {
			await setCollaboration( requestUtils, true );
			await ( requestUtils as RequestUtilsLike ).setGutenbergExperiments(
				[ 'gutenberg-form-blocks' ]
			);

			await use();
		},
		{ auto: true },
	],
} );

function rawField( field?: RestField ): string {
	if ( ! field ) {
		return '';
	}

	return typeof field === 'string'
		? field
		: field.raw ?? field.rendered ?? '';
}

async function openEditor( page: Page, postId: number ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.waitForFunction(
		() =>
			( window as Window & { _wpCollaborationEnabled?: boolean } )
				._wpCollaborationEnabled === true &&
			!! window.wp?.blocks?.getBlockType( 'core/form' ),
		undefined,
		{ timeout: 30000 }
	);

	const welcomeGuideClose = page.getByRole( 'button', { name: 'Close' } );
	if ( await welcomeGuideClose.isVisible() ) {
		await welcomeGuideClose.click();
	}
}

async function openSameUserSession(
	page: Page,
	postId: number
): Promise< { context: BrowserContext; page: Page } > {
	const context = await page.context().browser()!.newContext( {
		baseURL: BASE_URL,
		storageState: await page.context().storageState(),
		viewport: { width: 1280, height: 900 },
	} );
	const sameUserPage = await context.newPage();

	await openEditor( sameUserPage, postId );

	return { context, page: sameUserPage };
}

async function focusLastParagraph( page: Page ) {
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await canvas
		.getByRole( 'document', { name: /Block: Paragraph/ } )
		.last()
		.click( { force: true } );
	await page.keyboard.press( 'End' );
}

async function addMarkedFormAtCursor(
	page: Page,
	bodyMarker: string,
	fieldPrefix: string
) {
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );

	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( bodyMarker );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/form' );
	await page.getByRole( 'option', { name: 'Form', exact: true } ).click();

	await canvas.getByText( 'Name', { exact: true } ).last().waitFor();

	for ( const [ defaultLabel, marker ] of [
		[ 'Name', `${ fieldPrefix }-name` ],
		[ 'Email', `${ fieldPrefix }-email` ],
		[ 'Comment', `${ fieldPrefix }-story` ],
	] ) {
		await canvas.getByText( defaultLabel, { exact: true } ).last().click();
		await page.keyboard.press( MODIFIER );
		await page.keyboard.type( marker );
	}
}

async function addMarkedFormAfterLastParagraph(
	page: Page,
	bodyMarker: string,
	fieldPrefix: string
) {
	await focusLastParagraph( page );
	await addMarkedFormAtCursor( page, bodyMarker, fieldPrefix );
}

async function saveDraft( page: Page ) {
	await page.getByRole( 'button', { name: 'Save draft' } ).click();
	await page.getByRole( 'button', { name: 'Saved' } ).waitFor();
}

async function getPost(
	requestUtils: RequestUtilsLike,
	id: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ id }?context=edit`,
	} );
}

async function getRevisions(
	requestUtils: RequestUtilsLike,
	id: number
): Promise< RestRevision[] > {
	return requestUtils.rest< RestRevision[] >( {
		path: `/wp/v2/posts/${ id }/revisions`,
		params: {
			context: 'edit',
			per_page: 100,
			_fields: 'id,title.raw,content.raw',
		},
	} );
}

test.describe( 'Collaboration - Form content stale overwrite browser repro', () => {
	test( 'preserves customer form content after a stale same-account save through normal editor actions', async ( {
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 180_000 );

		const typedRequestUtils = requestUtils as RequestUtilsLike;
		const post = await typedRequestUtils.createPost( {
			title: 'form-overwrite-title-browser',
			status: 'draft',
			content:
				'<!-- wp:paragraph --><p>Initial form post body.</p><!-- /wp:paragraph -->',
		} );
		const customerMarkers = [
			'form-overwrite-customer-body-browser',
			'form-overwrite-customer-browser-name',
			'form-overwrite-customer-browser-email',
			'form-overwrite-customer-browser-story',
		];
		const staleMarkers = [
			'form-overwrite-stale-body-browser',
			'form-overwrite-stale-browser-name',
			'form-overwrite-stale-browser-email',
			'form-overwrite-stale-browser-story',
		];

		await openEditor( page, post.id );
		const staleSession = await openSameUserSession( page, post.id );

		try {
			await focusLastParagraph( staleSession.page );

			await addMarkedFormAfterLastParagraph(
				page,
				customerMarkers[ 0 ],
				'form-overwrite-customer-browser'
			);
			await saveDraft( page );

			await addMarkedFormAtCursor(
				staleSession.page,
				staleMarkers[ 0 ],
				'form-overwrite-stale-browser'
			);
			await saveDraft( staleSession.page );

			const currentPost = await getPost( typedRequestUtils, post.id );
			const currentText = `${ rawField( currentPost.title ) }\n${ rawField(
				currentPost.content
			) }`;
			const revisions = await getRevisions( typedRequestUtils, post.id );

			for ( const marker of [
				...customerMarkers,
				...staleMarkers,
			] ) {
				expect( currentText ).toContain( marker );
				expect(
					revisions.some( ( revision ) =>
						`${ rawField( revision.title ) }\n${ rawField(
							revision.content
						) }`.includes( marker )
					),
					`Expected revision history to contain ${ marker }`
				).toBe( true );
			}
		} finally {
			await staleSession.context.close();
		}
	} );
} );
