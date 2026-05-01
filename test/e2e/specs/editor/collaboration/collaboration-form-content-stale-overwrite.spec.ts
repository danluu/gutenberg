/**
 * External dependencies
 */
import type { BrowserContext, Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test as base,
	expect,
	Editor,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import CollaborationUtils, {
	setCollaboration,
} from './fixtures/collaboration-utils';

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

const test = base.extend< { collaborationUtils: CollaborationUtils } >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		await setCollaboration( requestUtils, true );
		await ( requestUtils as RequestUtilsLike ).setGutenbergExperiments( [
			'gutenberg-form-blocks',
		] );

		const utils = new CollaborationUtils( {
			admin,
			editor,
			requestUtils,
			page,
		} );

		try {
			await use( utils );
		} finally {
			await utils.teardown();
		}
	},
} );

function rawField( field?: RestField ): string {
	if ( ! field ) {
		return '';
	}

	return typeof field === 'string'
		? field
		: field.raw ?? field.rendered ?? '';
}

async function openSameUserSession(
	page: Page,
	postId: number
): Promise< { context: BrowserContext; page: Page; editor: Editor } > {
	const context = await page.context().browser()!.newContext( {
		baseURL: BASE_URL,
		storageState: await page.context().storageState(),
	} );
	const sameUserPage = await context.newPage();

	await sameUserPage.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await sameUserPage.waitForFunction(
		() => window?.wp?.data && window?.wp?.blocks,
		undefined,
		{ timeout: 30000 }
	);
	await sameUserPage.evaluate( () => {
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await waitForCollaborationReady( sameUserPage );

	return {
		context,
		page: sameUserPage,
		editor: new Editor( { page: sameUserPage } ),
	};
}

async function openPrimarySession( page: Page, postId: number ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.waitForFunction(
		() => window?.wp?.data && window?.wp?.blocks,
		undefined,
		{ timeout: 30000 }
	);
	await page.evaluate( () => {
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await waitForCollaborationReady( page );
}

async function waitForCollaborationReady( page: Page ) {
	await page.waitForFunction(
		() =>
			( window as Window & { _wpCollaborationEnabled?: boolean } )
				._wpCollaborationEnabled === true &&
			window?.wp?.data &&
			window?.wp?.blocks,
		undefined,
		{ timeout: 30000 }
	);
}

async function waitForSaveSettled( page: Page ) {
	await page.waitForFunction(
		() => ! window.wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: 30000 }
	);
}

async function savePost( page: Page ) {
	await page.evaluate( () => {
		window.wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await waitForSaveSettled( page );
}

async function insertMarkedForm(
	page: Page,
	title: string,
	formMarker: string,
	fieldMarkers: string[]
) {
	await page.evaluate(
		( { nextTitle, marker, markers } ) => {
			const blocks = window.wp.blocks;
			const editorDispatch =
				window.wp.data.dispatch( 'core/editor' );
			const blockDispatch =
				window.wp.data.dispatch( 'core/block-editor' );
			const missingBlockTypes = [
				'core/form',
				'core/form-input',
				'core/form-submit-button',
			].filter( ( blockName ) => ! blocks.getBlockType( blockName ) );

			if ( missingBlockTypes.length ) {
				throw new Error(
					`Form block experiment did not register: ${ missingBlockTypes.join(
						', '
					) }`
				);
			}

			const createFormInput = (
				type: string,
				name: string,
				label: string,
				attrs: Record< string, unknown > = {}
			) =>
				blocks.createBlock( 'core/form-input', {
					type,
					name,
					label,
					required: type !== 'url',
					visibilityPermissions: 'all',
					...attrs,
				} );

			const form = blocks.createBlock(
				'core/form',
				{
					method: 'post',
					submissionMethod: 'email',
				},
				[
					createFormInput(
						'text',
						`traveler-${ marker }`,
						`Traveler ${ markers[ 0 ] }`
					),
					createFormInput(
						'email',
						`email-${ marker }`,
						`Email ${ markers[ 1 ] }`
					),
					createFormInput(
						'textarea',
						`story-${ marker }`,
						`Story ${ markers[ 2 ] }`,
						{
							placeholder: `Tell us ${ marker }`,
						}
					),
					blocks.createBlock( 'core/form-submit-button', {}, [
						blocks.createBlock( 'core/buttons', {}, [
							blocks.createBlock( 'core/button', {
								tagName: 'button',
								text: `Submit ${ marker }`,
								type: 'submit',
							} ),
						] ),
					] ),
				]
			);

			blockDispatch.insertBlocks( [
				blocks.createBlock( 'core/paragraph', {
					content: `Form intro ${ marker }`,
				} ),
				form,
			] );
			editorDispatch.editPost( { title: nextTitle } );
		},
		{ nextTitle: title, marker: formMarker, markers: fieldMarkers }
	);
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

test.describe( 'Collaboration - Form content stale overwrite', () => {
	test( 'preserves customer form markers after a stale same-account save', async ( {
		collaborationUtils,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const typedRequestUtils = requestUtils as RequestUtilsLike;
		const post = await typedRequestUtils.createPost( {
			title: 'Form content stale overwrite initial',
			status: 'draft',
			content:
				'<!-- wp:paragraph --><p>Initial form post body.</p><!-- /wp:paragraph -->',
		} );
		const customerTitle = 'form-overwrite-customer-title-direct';
		const customerForm = 'form-overwrite-customer-body-direct';
		const customerFields = [
			'form-overwrite-customer-name-direct',
			'form-overwrite-customer-email-direct',
			'form-overwrite-customer-story-direct',
		];
		const staleForm = 'form-overwrite-stale-body-direct';
		const staleFields = [
			'form-overwrite-stale-name-direct',
			'form-overwrite-stale-email-direct',
			'form-overwrite-stale-story-direct',
		];
		const requiredMarkers = [
			customerForm,
			...customerFields,
			staleForm,
			...staleFields,
		];

		await openPrimarySession( page, post.id );
		const staleSession = await openSameUserSession( page, post.id );

		try {
			await insertMarkedForm(
				page,
				customerTitle,
				customerForm,
				customerFields
			);
			await savePost( page );

			await expect
				.poll(
					async () =>
						rawField(
							( await getPost( typedRequestUtils, post.id ) )
								.content
						),
					{ timeout: 30000 }
				)
				.toContain( customerFields[ 2 ] );

			await insertMarkedForm(
				staleSession.page,
				customerTitle,
				staleForm,
				staleFields
			);
			await savePost( staleSession.page );

			const currentPost = await getPost( typedRequestUtils, post.id );
			const currentText = `${ rawField( currentPost.title ) }\n${ rawField(
				currentPost.content
			) }`;
			const revisions = await getRevisions( typedRequestUtils, post.id );

			for ( const marker of requiredMarkers ) {
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
