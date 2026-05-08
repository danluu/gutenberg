const {
	test,
	expect,
	Editor,
} = require( '@wordpress/e2e-test-utils-playwright' );

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const ADMIN_USERNAME = process.env.WP_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.WP_PASSWORD || 'password';

const RAW_VALID_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Plain collaborative paragraph used as the initial editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Plain follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Plain tail paragraph kept for stale retry checks.</p>',
	'<!-- /wp:paragraph -->',
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
			const postId = window.wp?.data
				?.select( 'core/editor' )
				?.getCurrentPostId();
			if ( ! postId || window._wpCollaborationEnabled !== true ) {
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
	const context = await browser.newContext( {
		baseURL: BASE_URL,
		storageState: { cookies: [], origins: [] },
	} );
	const page = await context.newPage();

	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( ADMIN_USERNAME );
	await page.locator( '#user_pass' ).fill( ADMIN_PASSWORD );
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
	await editor.canvas
		.locator( '[data-type="core/paragraph"]' )
		.last()
		.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text );
}

async function getEditedContent( page ) {
	return page.evaluate( () =>
		window.wp.data.select( 'core/editor' ).getEditedPostContent()
	);
}

async function getBlockCount( page ) {
	return page.evaluate(
		() => window.wp.data.select( 'core/block-editor' ).getBlocks().length
	);
}

test.describe( 'Pass 171 valid-content stale CRDT retry probe', () => {
	test( 'same-user stale retry keeps ordinary valid paragraph edits', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 120_000 );

		const titleMarker = 'rtc-pass171-valid-title';
		const firstMarker = 'rtc-pass171-valid-unsaved-marker';
		const saveResponses = [];
		let secondSession;

		await setCollaboration( requestUtils, true );

		try {
			const post = await requestUtils.createPost( {
				title: 'RTC pass 171 valid retry initial title',
				status: 'draft',
				date_gmt: new Date().toISOString(),
				content: RAW_VALID_CONTENT,
			} );

			page.on( 'response', async ( response ) => {
				if (
					response
						.url()
						.includes( `/wp-json/wp/v2/posts/${ post.id }` ) &&
					[ 'POST', 'PUT' ].includes( response.request().method() )
				) {
					saveResponses.push( response.status() );
				}
			} );

			await admin.visitAdminPage(
				'post.php',
				`post=${ post.id }&action=edit`
			);
			await page.waitForFunction(
				() => window?.wp?.data && window?.wp?.blocks
			);
			await editor.setPreferences( 'core/edit-post', {
				welcomeGuide: false,
				fullscreenMode: false,
			} );
			await waitForEntityReadyAndSaveSettled( page );

			secondSession = await joinSameUserSession(
				editor.browser,
				post.id
			);

			await editor.canvas
				.getByRole( 'textbox' )
				.first()
				.fill( titleMarker );
			await appendParagraphText( editor, page, firstMarker );
			await expect
				.poll( () => getEditedContent( page ), { timeout: 15_000 } )
				.toContain( firstMarker );

			await editor.saveDraft();

			await expect
				.poll( () => getBlockCount( page ), { timeout: 15_000 } )
				.toBeGreaterThan( 0 );
			await expect
				.poll( () => getEditedContent( page ), { timeout: 15_000 } )
				.toContain( firstMarker );
			await expect
				.poll( () => getEditedContent( secondSession.page ), {
					timeout: 15_000,
				} )
				.toContain( firstMarker );
			await expect( saveResponses ).toContain( 409 );

			console.log(
				`pass171-valid-stale-retry-save-statuses=${ saveResponses.join(
					','
				) }`
			);
		} finally {
			if ( secondSession ) {
				await secondSession.context.close().catch( () => {} );
			}
			await setCollaboration( requestUtils, false );
		}
	} );
} );
