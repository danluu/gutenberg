/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

const LIMITED_USER: UserCredentials = {
	username: 'rtc_limited_author',
	email: 'rtc_limited_author@example.com',
	firstName: 'RTC',
	lastName: 'Limited',
	password: 'password',
	roles: [ 'contributor' ],
};

const CUSTOM_HTML_SCRIPT_MARKER = 'window.rtcPrivilegeEscalation = true';
const CUSTOM_HTML_SCRIPT = `<script>${ CUSTOM_HTML_SCRIPT_MARKER };</script>`;

async function openPrivilegedMetaPanel( page: Page ) {
	const panelButton = page
		.getByRole( 'region', { name: 'Editor settings' } )
		.getByRole( 'button', { name: 'RTC privileged meta' } );

	await panelButton.waitFor();

	if ( ( await panelButton.getAttribute( 'aria-expanded' ) ) !== 'true' ) {
		await panelButton.click();
	}
}

async function insertCustomHtmlBlock( page: Page, editor: Editor ) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Block Inserter' } )
		.click();
	await page
		.getByRole( 'region', { name: 'Block Library' } )
		.getByRole( 'searchbox', { name: 'Search' } )
		.fill( 'Custom HTML' );
	await page
		.getByRole( 'listbox', { name: 'Blocks' } )
		.getByRole( 'option', { name: 'Custom HTML' } )
		.click();

	await editor.canvas.getByRole( 'button', { name: 'Edit HTML' } ).click();

	const dialog = page.locator( '.block-library-html__modal' );
	await page
		.locator( 'textarea.block-library-html__modal-editor' )
		.fill( CUSTOM_HTML_SCRIPT );
	await dialog.getByRole( 'button', { name: 'Update' } ).click();
}

test.describe( 'Collaboration privilege escalation repro', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-collaboration-privilege-escalation'
		);
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllUsers();
		await setCollaboration( requestUtils, false );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-collaboration-privilege-escalation'
		);
	} );

	test( 'does not save admin-only meta typed by a lower-privilege collaborator', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.deleteAllUsers();
		await setCollaboration( requestUtils, true );

		const limitedUser = await requestUtils.createUser( LIMITED_USER );
		const post = await requestUtils.rest< { id: number } >( {
			method: 'POST',
			path: '/wp/v2/posts',
			data: {
				author: limitedUser.id,
				meta: {
					rtc_privileged_meta: 'admin-only original',
				},
				status: 'draft',
				title: 'RTC privilege escalation repro',
			},
		} );

		const collaborationUtils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'none',
			editor,
			requestUtils,
			page,
		} );

		try {
			await collaborationUtils.openPost( post.id );
			await editor.openDocumentSettingsSidebar();
			await openPrivilegedMetaPanel( page );

			const { page: limitedPage, editor: limitedEditor } =
				await collaborationUtils.joinUser( post.id, LIMITED_USER );
			await limitedEditor.openDocumentSettingsSidebar();
			await openPrivilegedMetaPanel( limitedPage );
			await collaborationUtils.waitForMutualDiscovery();

			const limitedInput = limitedPage.getByLabel( 'Privileged meta' );
			await limitedInput.fill( 'changed by limited collaborator' );

			await collaborationUtils.waitForMutualDiscovery();
			await expect( page.getByLabel( 'Privileged meta' ) ).toHaveValue(
				'admin-only original',
				{
					timeout: 15000,
				}
			);

			await editor.publishPost();

			const savedPost = await requestUtils.rest< {
				meta: Record< string, string >;
			} >( {
				path: `/wp/v2/posts/${ post.id }`,
				params: {
					context: 'edit',
				},
			} );

			expect( savedPost.meta.rtc_privileged_meta ).toBe(
				'admin-only original'
			);
		} finally {
			await collaborationUtils.teardown();
		}
	} );
} );

test.describe( 'Collaboration privilege escalation standard components', () => {
	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllUsers();
		await setCollaboration( requestUtils, false );
	} );

	test( 'does not persist contributor Custom HTML through an admin publish', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await requestUtils.deleteAllUsers();
		await setCollaboration( requestUtils, true );

		const limitedUser = await requestUtils.createUser( LIMITED_USER );
		const post = await requestUtils.rest< { id: number } >( {
			method: 'POST',
			path: '/wp/v2/posts',
			data: {
				author: limitedUser.id,
				status: 'draft',
				title: 'RTC Custom HTML privilege escalation repro',
			},
		} );

		const collaborationUtils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'none',
			editor,
			requestUtils,
			page,
		} );

		try {
			await collaborationUtils.openPost( post.id );

			const { page: limitedPage, editor: limitedEditor } =
				await collaborationUtils.joinUser( post.id, LIMITED_USER );
			await collaborationUtils.waitForMutualDiscovery();

			await insertCustomHtmlBlock( limitedPage, limitedEditor );

			await expect
				.poll( limitedEditor.getEditedPostContent, {
					timeout: 15000,
				} )
				.toContain( CUSTOM_HTML_SCRIPT_MARKER );

			await collaborationUtils.waitForMutualDiscovery();

			expect( await editor.getEditedPostContent() ).not.toContain(
				CUSTOM_HTML_SCRIPT_MARKER
			);

			await editor.publishPost();

			const savedPost = await requestUtils.rest< {
				content: { raw: string };
			} >( {
				path: `/wp/v2/posts/${ post.id }`,
				params: {
					context: 'edit',
				},
			} );

			expect( savedPost.content.raw ).not.toContain(
				CUSTOM_HTML_SCRIPT_MARKER
			);
		} finally {
			await collaborationUtils.teardown();
		}
	} );
} );
