/**
 * External dependencies
 */
import type { Page, Request } from '@playwright/test';
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import { SECOND_USER } from './fixtures/collaboration-utils';

const COMMENT_COLLECTION_ROOM = 'root/comment';
const NOTE_TARGET_TEXT_PREFIX = 'Primary unregister note target';

type SyncRoomPayload = {
	room: string;
	updates: { type: string }[];
};

type SyncPayload = {
	rooms: SyncRoomPayload[];
};

declare global {
	interface Window {
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
