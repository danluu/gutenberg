/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

test.describe( 'Issue 80262 iframe load lifecycle mechanism', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'emptytheme' );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'twentytwentyone' );
	} );

	test( 'handles a native load event that races with a transient detach', async ( {
		admin,
		editor,
		page,
	} ) => {
		const pageErrors = [];
		page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) );

		await admin.visitSiteEditor( {
			postId: 'emptytheme//index',
			postType: 'wp_template',
			canvas: 'edit',
		} );

		const iframe = page.locator( 'iframe[name="editor-canvas"]' );
		await expect( iframe ).toBeVisible();
		await expect(
			editor.canvas.locator( 'body.block-editor-iframe__body' )
		).toBeVisible();

		/*
		 * This is mechanism coverage, not the canonical human-flow reproduction.
		 * It deliberately creates the native DOM timing observed by the exception:
		 * the iframe's non-bubbling load event is already in its capture phase when
		 * the element loses its browsing context. The event path still reaches the
		 * real target listener in `block-editor/components/iframe`, where current
		 * trunk reads a null `contentDocument`. Reinsertion on the next task causes
		 * a second, valid native load, so a lifecycle-safe handler can recover.
		 * No DOM getter or application store is mocked.
		 */
		await iframe.evaluate( ( frame ) => {
			return new Promise( ( resolve, reject ) => {
				const parent = frame.parentNode;
				const nextSibling = frame.nextSibling;
				let didDetach = false;

				const cleanup = () => {
					clearTimeout( timeoutId );
					document.removeEventListener( 'load', onLoadCapture, true );
					frame.removeEventListener( 'load', onLoadTarget );
				};

				const onLoadCapture = ( event ) => {
					if ( event.target !== frame || didDetach ) {
						return;
					}

					didDetach = true;
					frame.remove();
					setTimeout( () => {
						parent.insertBefore( frame, nextSibling );
					}, 0 );
				};

				const onLoadTarget = () => {
					if ( ! frame.isConnected || ! frame.contentDocument ) {
						return;
					}

					cleanup();
					resolve();
				};

				document.addEventListener( 'load', onLoadCapture, true );
				frame.addEventListener( 'load', onLoadTarget );
				const timeoutId = setTimeout( () => {
					cleanup();
					reject(
						new Error( 'The reinserted iframe did not reload.' )
					);
				}, 10_000 );

				// Reload the component's existing blob document through the browser.
				frame.src = frame.src;
			} );
		} );

		await expect( iframe ).toBeVisible();
		await expect(
			editor.canvas.locator( 'body.block-editor-iframe__body' )
		).toBeVisible();
		const iframeDocumentErrors = pageErrors.filter(
			( message ) =>
				message.includes( 'documentElement' ) &&
				message.includes( 'null' )
		);
		expect( iframeDocumentErrors ).toEqual( [] );
	} );
} );
