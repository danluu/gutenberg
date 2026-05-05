const { test, expect, Editor } = require( '@wordpress/e2e-test-utils-playwright' );

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const ADMIN_USERNAME = process.env.WP_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD || 'password';

const RAW_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 950011 refs: AT&amp T, AT&amp;T, copy &copy 2026, reg &reg , decimal &#38 , hex &#x26 and escaped tags &lt;em&gt;text&lt;/em&gt;. <a href="https://example.test/path?name=Tom&amp;mode=rich&#x26-debug=1" aria-label="Tom &amp Jerry &copy 2026">aria refs</a></p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Heading refs &amp optional &copy 950011 with &#x26; hex</h3>',
	'<!-- /wp:heading -->',
].join( '\n' );

async function setCollaboration( requestUtils, enabled ) {
	const response = await requestUtils.request.get(
		'/wp-admin/options-writing.php'
	);
	const html = await response.text();
	const nonce = html.match( /name="_wpnonce" value="([^"]+)"/ )[ 1 ];

	await requestUtils.request.post( '/wp-admin/options.php', {
		form: {
			option_page: 'writing',
			action: 'update',
			_wpnonce: nonce,
			_wp_http_referer: '/wp-admin/options-writing.php',
			submit: 'Save Changes',
			default_category: '1',
			default_post_format: '0',
			wp_collaboration_enabled: enabled ? '1' : '0',
		},
	} );
}

async function waitForEntityReadyAndSaveSettled( page, timeout = 20_000 ) {
	await page.waitForFunction(
		() => {
			const postId = window.wp?.data?.select( 'core/editor' )?.getCurrentPostId();
			if ( ! postId ) {
				return false;
			}

			if ( window._wpCollaborationEnabled !== true ) {
				return false;
			}

			if (
				! window.wp.data
					.select( 'core' )
					.hasFinishedResolution( 'getEntityRecord', [
						'postType',
						'post',
						postId,
					] )
			) {
				return false;
			}

			return ! window.wp.data.select( 'core/editor' ).isSavingPost();
		},
		undefined,
		{ timeout }
	);
}

async function joinSameUserSession( browser, postId ) {
	return joinUserSession( browser, postId, {
		username: ADMIN_USERNAME,
		password: ADMIN_PASSWORD,
	} );
}

async function joinUserSession( browser, postId, credentials ) {
	const context = await browser.newContext( {
		baseURL: BASE_URL,
		storageState: { cookies: [], origins: [] },
	} );
	const page = await context.newPage();

	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( credentials.username );
	await page.locator( '#user_pass' ).fill( credentials.password );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( '**/wp-admin/**' );
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.waitForFunction( () => window?.wp?.data && window?.wp?.blocks );

	const editor = new Editor( { page } );
	await editor.setPreferences( 'core/edit-post', {
		welcomeGuide: false,
		fullscreenMode: false,
	} );
	await waitForEntityReadyAndSaveSettled( page );

	return { context, page, editor };
}

async function appendParagraphText( editor, page, text ) {
	await editor.canvas.locator( '[data-type="core/paragraph"]' ).last().click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
}

async function getEditedContent( page ) {
	return page.evaluate( () =>
		window.wp.data.select( 'core/editor' ).getEditedPostContent()
	);
}

async function getEditedTitle( page ) {
	return page.evaluate( () =>
		window.wp.data.select( 'core/editor' ).getEditedPostAttribute( 'title' )
	);
}

async function getBlockCount( page ) {
	return page.evaluate(
		() => window.wp.data.select( 'core/block-editor' ).getBlocks().length
	);
}

test.describe( 'Triage repro for 47950776c34e', () => {
	test( 'same-user save on parser-stress content keeps blocks visible', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const titleMarker = 'rtc-realistic-entity-title';
		const firstMarker = 'rtc-realistic-entity-marker';
		const secondMarker = 'rtc-realistic-entity-marker-2';
		let secondSession;

		await setCollaboration( requestUtils, true );

		try {
			const post = await requestUtils.createPost( {
				title: 'RTC repro initial title',
				status: 'draft',
				date_gmt: new Date().toISOString(),
				content: RAW_CONTENT,
			} );

			await admin.visitAdminPage( 'post.php', `post=${ post.id }&action=edit` );
			await page.waitForFunction( () => window?.wp?.data && window?.wp?.blocks );
			await editor.setPreferences( 'core/edit-post', {
				welcomeGuide: false,
				fullscreenMode: false,
			} );
			await waitForEntityReadyAndSaveSettled( page );

			secondSession = await joinSameUserSession( editor.browser, post.id );

			await editor.canvas.getByRole( 'textbox' ).first().fill( titleMarker );
			await appendParagraphText( editor, page, firstMarker );
			await editor.saveDraft();

			await expect
				.poll( () => getBlockCount( page ), { timeout: 15_000 } )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getBlockCount( secondSession.page ), {
					timeout: 15_000,
				} )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getEditedContent( page ), { timeout: 15_000 } )
				.toContain( firstMarker );
			await expect
				.poll( () => getEditedContent( secondSession.page ), {
					timeout: 15_000,
				} )
				.toContain( firstMarker );
			await expect
				.poll( () => getEditedTitle( page ), { timeout: 15_000 } )
				.toBe( titleMarker );
			await expect
				.poll( () => getEditedTitle( secondSession.page ), {
					timeout: 15_000,
				} )
				.toBe( titleMarker );
			await expect(
				editor.canvas.getByText( firstMarker, { exact: true } )
			).toBeVisible();
			await expect(
				secondSession.editor.canvas.getByText( firstMarker, {
					exact: true,
				} )
			).toBeVisible();

			await appendParagraphText(
				secondSession.editor,
				secondSession.page,
				secondMarker
			);
			await secondSession.editor.saveDraft();

			await expect
				.poll( () => getBlockCount( page ), { timeout: 15_000 } )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getEditedContent( page ), { timeout: 15_000 } )
				.toContain( secondMarker );
			await expect(
				editor.canvas.getByText( secondMarker, { exact: true } )
			).toBeVisible();
		} finally {
			if ( secondSession ) {
				await secondSession.context.close().catch( () => {} );
			}
			await setCollaboration( requestUtils, false );
		}
	} );

	test( 'distinct-user save on parser-stress content keeps blocks visible', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const titleMarker = 'rtc-distinct-entity-title';
		const firstMarker = 'rtc-distinct-entity-marker';
		const secondMarker = 'rtc-distinct-entity-marker-2';
		const uniqueSuffix = Date.now().toString( 36 );
		const collaborator = {
			username: `rtctriage${ uniqueSuffix }`,
			email: `rtctriage+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		let secondSession;
		let collaboratorId;

		await setCollaboration( requestUtils, true );

		try {
			const createdUser = await requestUtils.createUser( collaborator );
			collaboratorId = createdUser.id;

			const post = await requestUtils.createPost( {
				title: 'RTC distinct repro initial title',
				status: 'draft',
				date_gmt: new Date().toISOString(),
				content: RAW_CONTENT,
			} );

			await admin.visitAdminPage( 'post.php', `post=${ post.id }&action=edit` );
			await page.waitForFunction( () => window?.wp?.data && window?.wp?.blocks );
			await editor.setPreferences( 'core/edit-post', {
				welcomeGuide: false,
				fullscreenMode: false,
			} );
			await waitForEntityReadyAndSaveSettled( page );

			secondSession = await joinUserSession( editor.browser, post.id, {
				username: collaborator.username,
				password: collaborator.password,
			} );

			await editor.canvas.getByRole( 'textbox' ).first().fill( titleMarker );
			await appendParagraphText( editor, page, firstMarker );
			await editor.saveDraft();

			await expect
				.poll( () => getBlockCount( page ), { timeout: 15_000 } )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getBlockCount( secondSession.page ), {
					timeout: 15_000,
				} )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getEditedContent( secondSession.page ), {
					timeout: 15_000,
				} )
				.toContain( firstMarker );
			await expect
				.poll( () => getEditedTitle( secondSession.page ), {
					timeout: 15_000,
				} )
				.toBe( titleMarker );
			await expect(
				secondSession.editor.canvas.getByText( firstMarker, {
					exact: true,
				} )
			).toBeVisible();

			await appendParagraphText(
				secondSession.editor,
				secondSession.page,
				secondMarker
			);
			await secondSession.editor.saveDraft();

			await expect
				.poll( () => getEditedContent( page ), { timeout: 15_000 } )
				.toContain( secondMarker );
			await expect
				.poll( () => getEditedTitle( page ), { timeout: 15_000 } )
				.toBe( titleMarker );
			await expect(
				editor.canvas.getByText( secondMarker, { exact: true } )
			).toBeVisible();
		} finally {
			if ( secondSession ) {
				await secondSession.context.close().catch( () => {} );
			}
			if ( collaboratorId ) {
				await requestUtils
					.rest( {
						method: 'DELETE',
						path: `/wp/v2/users/${ collaboratorId }`,
						params: {
							force: true,
							reassign: 1,
						},
					} )
					.catch( () => {} );
			}
			await setCollaboration( requestUtils, false );
		}
	} );
} );
