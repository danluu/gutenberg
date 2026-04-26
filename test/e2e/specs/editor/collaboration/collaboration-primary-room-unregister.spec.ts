/**
 * External dependencies
 */
import type { Page, Request } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import type { UserCredentials } from './fixtures/collaboration-utils';

const SECOND_ADMIN: UserCredentials = {
	username: 'rtc_primary_unregister_admin',
	email: 'rtc-primary-unregister-admin@example.com',
	firstName: 'RTC',
	lastName: 'Primary',
	password: 'password',
	roles: [ 'administrator' ],
};

type SyncRoomPayload = {
	room: string;
	updates: { type: string }[];
};

type SyncPayload = {
	rooms: SyncRoomPayload[];
};

declare global {
	interface Window {
		__rtcRoomLifecycle?: {
			deleteError: string | null;
			deleteFinished: boolean;
			renameError: string | null;
			renameFinished: boolean;
		};
		_wpCollaborationEnabled?: boolean;
	}
}

function isSyncRequest( request: Request ) {
	return request.method() === 'POST' && request.url().includes( 'wp-sync' );
}

function getSyncPayload( request: Request ): SyncPayload | null {
	const data = request.postData();
	if ( ! data ) {
		return null;
	}

	try {
		return JSON.parse( data ) as SyncPayload;
	} catch {
		return null;
	}
}

async function setDefaultCategory( page: Page, categoryId: number ) {
	await page.goto( '/wp-admin/options-writing.php' );
	await page
		.locator( '#default_category' )
		.selectOption( String( categoryId ) );
	await page.getByRole( 'button', { name: 'Save Changes' } ).click();
	await expect( page.getByText( 'Settings saved.' ) ).toBeVisible();
}

async function loadDefaultCategoryViaPublishPanel(
	page: Page,
	categoryId: number
) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Publish', exact: true } )
		.click();

	await page.waitForFunction(
		( id ) =>
			window.wp?.data
				?.select( 'core' )
				.hasFinishedResolution( 'getEntityRecord', [
					'taxonomy',
					'category',
					id,
				] ),
		categoryId,
		{ timeout: 15000 }
	);

	await page
		.getByRole( 'region', { name: 'Editor publish' } )
		.getByRole( 'button', { name: 'Cancel' } )
		.click();
}

async function waitForCategoryCollaborator( page: Page, categoryRoom: string ) {
	await page.waitForResponse(
		async ( response ) => {
			if (
				response.request().method() !== 'POST' ||
				! response.url().includes( 'wp-sync' ) ||
				response.status() !== 200
			) {
				return false;
			}

			const body = await response.json().catch( () => null );
			const room = body?.rooms?.find(
				( item ) => item.room === categoryRoom
			);
			return room && Object.keys( room.awareness ?? {} ).length > 1;
		},
		{ timeout: 20000 }
	);
}

test.describe( 'Collaboration - primary room unregister', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-sync-room-lifecycle'
		);
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-plugin-sync-room-lifecycle'
		);
	} );

	test( 'resumes category updates after the original post room is deleted in place', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const category = await requestUtils.rest< { id: number } >( {
			method: 'POST',
			path: '/wp/v2/categories',
			data: { name: `rtc-primary-unregister-${ Date.now() }` },
		} );
		const setupPage = await page.context().newPage();
		await setDefaultCategory( setupPage, category.id );
		await setupPage.close();

		const primaryPost = await requestUtils.createPost( {
			title: 'RTC primary unregister repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const secondaryPost = await requestUtils.createPost( {
			title: 'RTC secondary category peer',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ primaryPost.id }`;
		const categoryRoom = `taxonomy/category:${ category.id }`;

		await admin.visitAdminPage(
			'post.php',
			`post=${ primaryPost.id }&action=edit&rtc_room_lifecycle=primary-unregister&rtc_category_id=${ category.id }`
		);
		await editor.setPreferences( 'core/edit-post', {
			welcomeGuide: false,
			fullscreenMode: false,
		} );
		await collaborationUtils.waitForCollaborationReady( page );
		await loadDefaultCategoryViaPublishPanel( page, category.id );

		await page
			.getByRole( 'button', {
				name: 'Delete current post in place',
			} )
			.click();
		await expect
			.poll(
				() =>
					page.evaluate(
						() => window.__rtcRoomLifecycle?.deleteFinished
					),
				{ timeout: 10000 }
			)
			.toBe( true );
		expect(
			await page.evaluate( () => window.__rtcRoomLifecycle?.deleteError )
		).toBeNull();

		await requestUtils.createUser( SECOND_ADMIN );
		const { page: page2 } = await collaborationUtils.joinUser(
			secondaryPost.id,
			SECOND_ADMIN
		);
		await loadDefaultCategoryViaPublishPanel( page2, category.id );
		await waitForCategoryCollaborator( page, categoryRoom );

		await page
			.getByRole( 'button', { name: 'Rename loaded category' } )
			.click();
		await expect
			.poll(
				() =>
					page.evaluate(
						() => window.__rtcRoomLifecycle?.renameFinished
					),
				{ timeout: 10000 }
			)
			.toBe( true );
		expect(
			await page.evaluate( () => window.__rtcRoomLifecycle?.renameError )
		).toBeNull();

		const request = await page.waitForRequest(
			( candidate ) => {
				if ( ! isSyncRequest( candidate ) ) {
					return false;
				}

				const payload = getSyncPayload( candidate );
				return (
					payload?.rooms.some(
						( room ) => room.room === categoryRoom
					) ?? false
				);
			},
			{ timeout: 10000 }
		);
		const payload = getSyncPayload( request );
		const postPayload = payload?.rooms.find(
			( room ) => room.room === postRoom
		);
		const categoryPayload = payload?.rooms.find(
			( room ) => room.room === categoryRoom
		);

		expect( postPayload ).toBeUndefined();
		expect( categoryPayload?.updates.length ).toBeGreaterThan( 0 );
	} );
} );
