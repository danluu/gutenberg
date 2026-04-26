/**
 * External dependencies
 */
import type { Page, Request } from '@playwright/test';
import type { Admin, Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

type ProviderLifecycleState = {
	attempts: number;
	created: number;
	destroyed: number;
	failures: number;
	providerAvailable: boolean;
	retryFinished: boolean;
	retryStarted: boolean;
	rooms: Record< string, ProviderLifecycleRoomState >;
};

type ProviderLifecycleRoomState = {
	attempts: number;
	created: number;
	destroyed: number;
	failures: number;
};

declare global {
	interface Window {
		__rtcProviderLifecycle?: ProviderLifecycleState;
		_wpCollaborationEnabled?: boolean;
	}
}

async function openPostWithProviderLifecycleMode(
	admin: Admin,
	editor: Editor,
	page: Page,
	postId: number,
	mode: 'partial' | 'partial-default' | 'retry'
) {
	await admin.visitAdminPage(
		'post.php',
		`post=${ postId }&action=edit&rtc_provider_lifecycle=${ mode }`
	);
	await editor.setPreferences( 'core/edit-post', {
		welcomeGuide: false,
		fullscreenMode: false,
	} );
	await page.waitForFunction(
		() =>
			window._wpCollaborationEnabled === true &&
			window.wp?.data &&
			window.__rtcProviderLifecycle,
		undefined,
		{ timeout: 15000 }
	);
}

type SyncPayload = {
	rooms: { room: string }[];
};

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

async function waitForRoomRequest(
	page: Page,
	roomName: string,
	timeout = 15000
) {
	await page.waitForRequest(
		( request ) => {
			if ( ! isSyncRequest( request ) ) {
				return false;
			}

			const payload = getSyncPayload( request );
			return (
				payload?.rooms.some( ( room ) => room.room === roomName ) ??
				false
			);
		},
		{ timeout }
	);
}

async function getProviderLifecycleState(
	page: Page
): Promise< ProviderLifecycleState > {
	return page.evaluate(
		() => window.__rtcProviderLifecycle as ProviderLifecycleState
	);
}

async function getProviderLifecycleRoomState(
	page: Page,
	room: string
): Promise< ProviderLifecycleRoomState | undefined > {
	return page.evaluate(
		( roomName ) => window.__rtcProviderLifecycle?.rooms[ roomName ],
		room
	);
}

test.describe( 'Collaboration provider lifecycle repros', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-sync-provider-lifecycle'
		);
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-plugin-sync-provider-lifecycle'
		);
	} );

	test( 'retries provider creation for the same post after a provider becomes available', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC provider retry repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;

		await openPostWithProviderLifecycleMode(
			admin,
			editor,
			page,
			post.id,
			'retry'
		);
		await collaborationUtils.waitForEntityReady( page );

		await expect
			.poll(
				async () => {
					const state = await getProviderLifecycleState( page );
					return state.rooms[ postRoom ]?.failures ?? 0;
				},
				{ timeout: 10000 }
			)
			.toBe( 1 );

		await page
			.getByRole( 'button', { name: 'Reconnect RTC provider' } )
			.click();

		await expect
			.poll(
				async () => {
					const state = await getProviderLifecycleState( page );
					return state.retryFinished;
				},
				{ timeout: 10000 }
			)
			.toBe( true );

		const postState = await getProviderLifecycleRoomState( page, postRoom );
		expect( postState?.attempts ).toBe( 2 );
		expect( postState?.created ).toBe( 1 );
	} );

	test( 'destroys providers that were created before a later provider fails', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC partial provider failure repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;

		await openPostWithProviderLifecycleMode(
			admin,
			editor,
			page,
			post.id,
			'partial'
		);
		await collaborationUtils.waitForEntityReady( page );

		await expect
			.poll(
				async () => {
					const state = await getProviderLifecycleState( page );
					const postState = state.rooms[ postRoom ];
					return {
						created: postState?.created ?? 0,
						failures: postState?.failures ?? 0,
					};
				},
				{ timeout: 10000 }
			)
			.toEqual( {
				created: 1,
				failures: 1,
			} );

		const postState = await getProviderLifecycleRoomState( page, postRoom );
		expect( postState?.destroyed ).toBe( 1 );
	} );

	test( 'cleans up the default HTTP provider when an extension provider fails', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'RTC partial default provider failure repro',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;
		const firstPostRoomRequest = waitForRoomRequest( page, postRoom );

		await openPostWithProviderLifecycleMode(
			admin,
			editor,
			page,
			post.id,
			'partial-default'
		);
		await collaborationUtils.waitForEntityReady( page );

		await expect
			.poll(
				async () => {
					const state = await getProviderLifecycleState( page );
					return state.rooms[ postRoom ]?.failures ?? 0;
				},
				{ timeout: 10000 }
			)
			.toBe( 1 );

		// The real HTTP provider may have already sent its initial sync request
		// before the later extension provider rejected. The leak is that it keeps
		// polling after the failed load should have cleaned it up.
		await firstPostRoomRequest;

		const leakedPostRoomRequest = await waitForRoomRequest(
			page,
			postRoom,
			7000
		)
			.then( () => true )
			.catch( () => false );

		expect( leakedPostRoomRequest ).toBe( false );
	} );
} );
