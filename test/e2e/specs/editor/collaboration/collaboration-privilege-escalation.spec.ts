/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

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

async function openPrivilegedMetaPanel( page: Page ) {
	const panelButton = page
		.getByRole( 'region', { name: 'Editor settings' } )
		.getByRole( 'button', { name: 'RTC privileged meta' } );

	await panelButton.waitFor();

	if ( ( await panelButton.getAttribute( 'aria-expanded' ) ) !== 'true' ) {
		await panelButton.click();
	}
}

test.describe( 'Collaboration privilege escalation repro', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-collaboration-privilege-escalation'
		);
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-collaboration-privilege-escalation'
		);
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllUsers();
		await setCollaboration( requestUtils, false );
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

			await expect( page.getByLabel( 'Privileged meta' ) ).toHaveValue(
				'changed by limited collaborator',
				{
					timeout: 15000,
				}
			);

			await editor.saveDraft();

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
