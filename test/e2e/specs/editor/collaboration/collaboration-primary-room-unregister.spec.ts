/**
 * External dependencies
 */
import type { Page, Request } from '@playwright/test';
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import {
	SECOND_USER,
	type UserCredentials,
} from './fixtures/collaboration-utils';

const SECOND_ADMIN: UserCredentials = {
	username: 'rtc_primary_unregister_admin',
	email: 'rtc-primary-unregister-admin@example.com',
	firstName: 'RTC',
	lastName: 'Primary',
	password: 'password',
	roles: [ 'administrator' ],
};

const COMMENT_COLLECTION_ROOM = 'root/comment';
const NOTE_TARGET_TEXT = 'Primary unregister note target';
const NOTE_TARGET_TEXT_PREFIX = NOTE_TARGET_TEXT;

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

async function waitForSyncPayload(
	page: Page,
	predicate: ( payload: SyncPayload ) => boolean,
	timeout = 20000
): Promise< SyncPayload > {
	const request = await page.waitForRequest(
		( candidate ) => {
			if ( ! isSyncRequest( candidate ) ) {
				return false;
			}

			const payload = getSyncPayload( candidate );
			return !! payload && predicate( payload );
		},
		{ timeout }
	);

	return getSyncPayload( request ) as SyncPayload;
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

async function waitForRoomCollaborator( page: Page, roomName: string ) {
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
				( item ) => item.room === roomName
			);
			return room && Object.keys( room.awareness ?? {} ).length > 1;
		},
		{ timeout: 20000 }
	);
}

async function pasteOversizedTitle( page: Page, editor: Editor ) {
	const oversizedTitle = `Oversized RTC primary ${ '0123456789abcdef'.repeat(
		72 * 1024
	) }`;
	const pasteModifier = process.platform === 'darwin' ? 'Meta' : 'Control';
	const title = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );

	await page
		.context()
		.grantPermissions( [ 'clipboard-read', 'clipboard-write' ] );
	await title.click();
	await page.keyboard.press( `${ pasteModifier }+a` );
	await page.evaluate(
		( text: string ) => window.navigator.clipboard.writeText( text ),
		oversizedTitle
	);
	await page.keyboard.press( `${ pasteModifier }+v` );
}

async function addNoteToParagraph(
	page: Page,
	editor: Editor,
	targetText: string,
	noteText: string
) {
	await editor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.filter( { hasText: targetText } )
		.click();
	await editor.clickBlockOptionsMenuItem( 'Add note' );
	await page
		.getByRole( 'textbox', { name: 'New note', exact: true } )
		.fill( noteText );
	await page
		.getByRole( 'region', { name: 'Editor settings' } )
		.getByRole( 'button', { name: 'Add note', exact: true } )
		.click();

	await expect(
		page
			.getByRole( 'region', { name: 'Editor settings' } )
			.getByRole( 'treeitem', { name: `Note: ${ noteText }` } )
	).toBeVisible( { timeout: 10000 } );
}

async function openAllNotesSidebar( page: Page ) {
	const toggleButton = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'All notes', exact: true } );

	await expect( toggleButton ).toBeVisible( { timeout: 10000 } );
	const isExpanded = await toggleButton.getAttribute( 'aria-expanded' );
	if ( isExpanded === 'false' ) {
		await toggleButton.click();
	}
}

test.describe( 'Collaboration - primary room unregister without plugins', () => {
	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllComments( 'note' );
	} );

	test( 'syncs notes after an oversized title removes the original post room', async ( {
		admin,
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120000 );

		await requestUtils.deleteAllComments( 'note' );

		const noteTargetText = `${ NOTE_TARGET_TEXT_PREFIX } ${ Date.now() }`;
		const post = await requestUtils.createPost( {
			title: 'RTC stock primary unregister repro',
			status: 'draft',
			content: `<!-- wp:paragraph --><p>${ noteTargetText }</p><!-- /wp:paragraph -->`,
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;
		const noteText = `note after primary unregister ${ Date.now() }`;

		const initialPayloadPromise = waitForSyncPayload(
			page,
			( payload ) =>
				payload.rooms.some( ( room ) => room.room === postRoom ) &&
				payload.rooms.some(
					( room ) => room.room === COMMENT_COLLECTION_ROOM
				)
		);

		await admin.visitAdminPage(
			'post.php',
			`post=${ post.id }&action=edit`
		);
		await editor.setPreferences( 'core/edit-post', {
			welcomeGuide: false,
			fullscreenMode: false,
		} );
		await collaborationUtils.waitForCollaborationReady( page );

		const initialPayload = await initialPayloadPromise;
		expect( initialPayload.rooms[ 0 ]?.room ).toBe( postRoom );

		const postRemovedPayloadPromise = waitForSyncPayload(
			page,
			( payload ) =>
				payload.rooms.some(
					( room ) => room.room === COMMENT_COLLECTION_ROOM
				) && ! payload.rooms.some( ( room ) => room.room === postRoom ),
			30000
		);

		await pasteOversizedTitle( page, editor );
		await page.waitForFunction(
			() =>
				window.wp?.data
					?.select( 'core/editor' )
					?.isCollaborationEnabledForCurrentPost?.() === false,
			undefined,
			{ timeout: 15000 }
		);
		await postRemovedPayloadPromise;

		await collaborationUtils.joinUser( post.id, SECOND_USER );
		const { page2 } = collaborationUtils;
		await waitForRoomCollaborator( page, COMMENT_COLLECTION_ROOM );

		await addNoteToParagraph( page, editor, noteTargetText, noteText );

		const commentPayload = await waitForSyncPayload(
			page,
			( payload ) => {
				const commentRoom = payload.rooms.find(
					( room ) => room.room === COMMENT_COLLECTION_ROOM
				);
				return ( commentRoom?.updates.length ?? 0 ) > 0;
			},
			10000
		);
		const commentRoom = commentPayload.rooms.find(
			( room ) => room.room === COMMENT_COLLECTION_ROOM
		);
		expect
			.soft(
				commentRoom?.updates.length,
				'normal note creation should send a root/comment update after another user joins that surviving room'
			)
			.toBeGreaterThan( 0 );

		await openAllNotesSidebar( page2 );
		await expect(
			page2
				.getByRole( 'region', { name: 'Editor settings' } )
				.getByRole( 'treeitem', { name: `Note: ${ noteText }` } )
		).toBeVisible( { timeout: 10000 } );
	} );
} );

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
		await waitForRoomCollaborator( page, categoryRoom );

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
