/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import type { UserCredentials } from './fixtures/collaboration-utils';
import type CollaborationUtils from './fixtures/collaboration-utils';

const ADMIN_USER: UserCredentials = {
	username: process.env.WP_USERNAME ?? 'admin',
	email: 'wordpress@example.com',
	firstName: 'Admin',
	lastName: 'User',
	password: process.env.WP_PASSWORD ?? 'password',
	roles: [ 'administrator' ],
};

async function waitForSameUserSession(
	collaborationUtils: CollaborationUtils
) {
	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout: 20_000,
			} )
		)
	);
	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForSyncCycle( page, 2, { timeout: 20_000 } )
		)
	);
}

async function getPersistedTitle(
	requestUtils: {
		rest: < T >( options: { path: string } ) => Promise< T >;
	},
	postId: number
): Promise< string > {
	const post = await requestUtils.rest< {
		title: string | { raw?: string; rendered?: string };
	} >( {
		path: `/wp/v2/posts/${ postId }?context=edit`,
	} );

	return typeof post.title === 'string'
		? post.title
		: post.title.raw ?? post.title.rendered ?? '';
}

async function getRevisionTitles(
	requestUtils: {
		rest: < T >( options: { path: string } ) => Promise< T >;
	},
	postId: number
): Promise< string[] > {
	const revisions = await requestUtils.rest<
		Array< { title?: string | { raw?: string; rendered?: string } } >
	>( {
		path: `/wp/v2/posts/${ postId }/revisions?context=edit`,
	} );

	return revisions.map( ( revision ) => {
		if ( typeof revision.title === 'string' ) {
			return revision.title;
		}

		return revision.title?.raw ?? revision.title?.rendered ?? '';
	} );
}

async function getEditedTitle( page: {
	evaluate: < T >( callback: () => T ) => Promise< T >;
} ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' )
	);
}

test.describe( 'Collaboration - same user title loss', () => {
	test( 'keeps a saved title when a stale same-user session saves another edit', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const initialTitle = 'RTC same-user initial title';
		const customerTitle = 'RTC same-user customer saved title';
		const supportMarker = 'rtc-same-user-support-marker';

		const post = await requestUtils.createPost( {
			title: initialTitle,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, ADMIN_USER );
		await waitForSameUserSession( collaborationUtils );
		const { editor2, page2 } = collaborationUtils;

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( customerTitle );
		await editor.saveDraft();

		await expect
			.poll( () => getPersistedTitle( requestUtils, post.id ), {
				timeout: 20_000,
			} )
			.toBe( customerTitle );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( supportMarker );
		await editor2.saveDraft();

		await expect
			.poll( () => getPersistedTitle( requestUtils, post.id ), {
				timeout: 20_000,
			} )
			.toBe( customerTitle );

		expect( await getEditedTitle( page ) ).toBe( customerTitle );
	} );

	test( 'updates the visible title in another same-user browser session', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const customerTitle = 'RTC same-user live title';

		const post = await requestUtils.createPost( {
			title: 'RTC same-user live initial',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, ADMIN_USER );
		await waitForSameUserSession( collaborationUtils );
		const { page2 } = collaborationUtils;

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( customerTitle );

		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( customerTitle );
		expect( await getEditedTitle( page ) ).toBe( customerTitle );
	} );

	test( 'keeps an unsaved same-user title in a reloaded browser session', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const customerTitle = 'RTC same-user unsaved title before reload';

		const post = await requestUtils.createPost( {
			title: 'RTC same-user reload initial',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, ADMIN_USER );
		await waitForSameUserSession( collaborationUtils );
		const { editor2, page2 } = collaborationUtils;

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( customerTitle );
		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( customerTitle );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( 'same user reload companion edit' );

		await page2.reload( { waitUntil: 'domcontentloaded' } );
		await waitForSameUserSession( collaborationUtils );

		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( customerTitle );
		expect( await getEditedTitle( page ) ).toBe( customerTitle );
	} );

	test( 'keeps unsaved same-user block content in a reloaded browser session', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const customerMarker = 'rtc-same-user-unsaved-content-before-reload';

		const post = await requestUtils.createPost( {
			title: 'RTC same-user content reload initial',
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, ADMIN_USER );
		await waitForSameUserSession( collaborationUtils );
		const { editor2, page2 } = collaborationUtils;

		await editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( customerMarker );
		await expect( editor2.canvas.getByText( customerMarker ) ).toBeVisible(
			{
				timeout: 20_000,
			}
		);

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.first()
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( 'same user content companion edit' );

		await page2.reload( { waitUntil: 'domcontentloaded' } );
		await waitForSameUserSession( collaborationUtils );

		await expect( editor.canvas.getByText( customerMarker ) ).toBeVisible( {
			timeout: 20_000,
		} );
		await expect( editor2.canvas.getByText( customerMarker ) ).toBeVisible(
			{
				timeout: 20_000,
			}
		);
	} );

	test( 'saves the active title after a same-user browser session reloads', async ( {
		collaborationUtils,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 90_000 );

		const initialTitle = 'RTC same-user save-after-reload initial';
		const customerTitle = 'RTC same-user save-after-reload customer title';

		const post = await requestUtils.createPost( {
			title: initialTitle,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, ADMIN_USER );
		await waitForSameUserSession( collaborationUtils );
		const { editor2, page2 } = collaborationUtils;

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( customerTitle );
		await expect
			.poll( () => getEditedTitle( page2 ), { timeout: 20_000 } )
			.toBe( customerTitle );

		await editor2.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.click();
		await page2.keyboard.press( 'End' );
		await page2.keyboard.press( 'Enter' );
		await page2.keyboard.type( 'same user save-after-reload edit' );

		await page2.reload( { waitUntil: 'domcontentloaded' } );
		await waitForSameUserSession( collaborationUtils );

		await editor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.first()
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'same user post-reload active edit' );
		await editor.saveDraft();

		await expect
			.poll( () => getPersistedTitle( requestUtils, post.id ), {
				timeout: 20_000,
			} )
			.toBe( customerTitle );
		expect( await getRevisionTitles( requestUtils, post.id ) ).toContain(
			customerTitle
		);
		expect( await getEditedTitle( page ) ).toBe( customerTitle );
	} );
} );
