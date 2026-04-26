/**
 * External dependencies
 */
import type { Page, Request, Response } from '@playwright/test';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import type { UserCredentials } from './fixtures/collaboration-utils';

const SECOND_ADMIN: UserCredentials = {
	username: 'rtc_compaction_admin',
	email: 'rtc-compaction-admin@example.com',
	firstName: 'RTC',
	lastName: 'Admin',
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

type SyncRoomResponse = {
	room: string;
	should_compact?: boolean;
	total_updates?: number;
};

type SyncResponse = {
	rooms: SyncRoomResponse[];
};

function isSyncRequest( request: Request ) {
	return request.method() === 'POST' && request.url().includes( 'wp-sync' );
}

function isSyncResponse( response: Response ) {
	return (
		response.request().method() === 'POST' &&
		response.url().includes( 'wp-sync' )
	);
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

function payloadHasRoom( payload: SyncPayload | null, room: string ) {
	return payload?.rooms.some( ( item ) => item.room === room ) ?? false;
}

function roomHasCompactionUpdate( room: SyncRoomPayload | undefined ) {
	return room?.updates.some( ( update ) => update.type === 'compaction' );
}

async function setDefaultCategory(
	requestUtils: RequestUtils,
	categoryId: number
) {
	const response = await requestUtils.request.get(
		'/wp-admin/options-writing.php'
	);
	const html = await response.text();
	const nonce = html.match( /name="_wpnonce" value="([^"]+)"/ )![ 1 ];

	await requestUtils.request.post( '/wp-admin/options.php', {
		form: {
			option_page: 'writing',
			action: 'update',
			_wpnonce: nonce,
			_wp_http_referer: '/wp-admin/options-writing.php',
			submit: 'Save Changes',
			default_category: categoryId,
			default_post_format: 0,
			wp_collaboration_enabled: 1,
		},
		failOnStatusCode: true,
	} );
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

async function waitForPostCompactionNomination(
	pages: Page[],
	postRoom: string
) {
	const waits = pages.map( ( page ) =>
		page
			.waitForResponse(
				async ( response ) => {
					if (
						! isSyncResponse( response ) ||
						response.status() !== 200
					) {
						return false;
					}

					const body = ( await response
						.json()
						.catch( () => null ) ) as SyncResponse | null;
					return (
						body?.rooms.some(
							( room ) =>
								room.room === postRoom &&
								room.should_compact === true
						) ?? false
					);
				},
				{ timeout: 60000 }
			)
			.then( ( response ) => ( { page, response } ) )
	);

	return Promise.race( waits );
}

async function deleteCategoryThroughAdminUi(
	adminPage: Page,
	categoryId: number
) {
	await adminPage.goto( '/wp-admin/options-writing.php' );
	await adminPage.locator( '#default_category' ).selectOption( '1' );
	await adminPage.getByRole( 'button', { name: 'Save Changes' } ).click();
	await expect( adminPage.getByText( 'Settings saved.' ) ).toBeVisible();

	await adminPage.goto(
		'/wp-admin/edit-tags.php?taxonomy=category&post_type=post'
	);
	const row = adminPage.locator( `#tag-${ categoryId }` );
	await expect( row ).toBeVisible();
	await row.hover();

	adminPage.once( 'dialog', async ( dialog ) => {
		await dialog.accept();
	} );
	await row.locator( '.row-actions .delete a' ).click( { force: true } );
	await expect( row ).toHaveCount( 0 );
}

async function typeTitleUpdates( page: Page, count: number ) {
	const title = page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.getByRole( 'textbox', { name: 'Add title' } );

	await title.click();
	await page.keyboard.press( 'End' );

	for ( let i = 0; i < count; i++ ) {
		await page.keyboard.type( String.fromCharCode( 97 + ( i % 26 ) ), {
			delay: 5,
		} );
	}
}

test.describe( 'Collaboration - compaction and permission loss', () => {
	test( 'retries a queued post compaction after a loaded category room is deleted', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 120000 );

		const category = await requestUtils.rest< { id: number } >( {
			method: 'POST',
			path: '/wp/v2/categories',
			data: { name: `rtc-compaction-${ Date.now() }` },
		} );
		await setDefaultCategory( requestUtils, category.id );

		const post = await requestUtils.createPost( {
			title: 'Compaction Permission Repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;
		const categoryRoom = `taxonomy/category:${ category.id }`;

		await collaborationUtils.openPost( post.id );
		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( 'Compaction Permission Repro' );
		await loadDefaultCategoryViaPublishPanel( page, category.id );

		await requestUtils.createUser( SECOND_ADMIN );
		await collaborationUtils.joinUser( post.id, SECOND_ADMIN );
		const { page2 } = collaborationUtils;
		await loadDefaultCategoryViaPublishPanel( page2, category.id );
		await collaborationUtils.waitForMutualDiscovery();

		const compactionNominationPromise = waitForPostCompactionNomination(
			[ page, page2 ],
			postRoom
		);
		await typeTitleUpdates( page, 80 );
		const { page: compactorPage } = await compactionNominationPromise;

		const forbiddenRequestPromise = compactorPage.waitForRequest(
			( request ) => {
				if ( ! isSyncRequest( request ) ) {
					return false;
				}

				const payload = getSyncPayload( request );
				const postPayload = payload?.rooms.find(
					( room ) => room.room === postRoom
				);

				return (
					payloadHasRoom( payload, categoryRoom ) &&
					roomHasCompactionUpdate( postPayload )
				);
			},
			{ timeout: 10000 }
		);
		const forbiddenResponsePromise = compactorPage.waitForResponse(
			( response ) =>
				isSyncResponse( response ) && response.status() === 403,
			{ timeout: 10000 }
		);

		const adminPage = await page.context().newPage();
		try {
			await deleteCategoryThroughAdminUi( adminPage, category.id );
		} finally {
			await adminPage.close();
		}

		await forbiddenRequestPromise;
		await forbiddenResponsePromise;

		const retryRequest = await compactorPage.waitForRequest(
			isSyncRequest,
			{ timeout: 10000 }
		);
		const retryPayload = getSyncPayload( retryRequest );
		const retryPostRoom = retryPayload?.rooms.find(
			( room ) => room.room === postRoom
		);

		expect( payloadHasRoom( retryPayload, categoryRoom ) ).toBe( false );
		expect( retryPostRoom?.updates ).toEqual(
			expect.arrayContaining( [
				expect.objectContaining( { type: 'compaction' } ),
			] )
		);
	} );
} );
