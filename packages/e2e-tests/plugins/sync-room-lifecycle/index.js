( function () {
	const params = new URLSearchParams( window.location.search );
	const mode = params.get( 'rtc_room_lifecycle' );

	if ( mode !== 'primary-unregister' ) {
		return;
	}

	const state = {
		deleteError: null,
		deleteFinished: false,
		deleteStarted: false,
		mode,
		renameError: null,
		renameFinished: false,
		renameStarted: false,
	};

	window.__rtcRoomLifecycle = state;

	function addButton( id, text, bottom, onClick ) {
		const button = document.createElement( 'button' );
		button.id = id;
		button.type = 'button';
		button.textContent = text;
		button.style.position = 'fixed';
		button.style.right = '12px';
		button.style.bottom = bottom;
		button.style.zIndex = '100000';
		button.addEventListener( 'click', onClick );
		document.body.appendChild( button );
	}

	wp.domReady( function () {
		addButton(
			'rtc-delete-current-post-in-place',
			'Delete current post in place',
			'56px',
			async function () {
				const postId = wp.data
					.select( 'core/editor' )
					.getCurrentPostId();

				state.deleteStarted = true;
				state.deleteFinished = false;
				state.deleteError = null;

				try {
					await wp.data
						.dispatch( 'core' )
						.deleteEntityRecord( 'postType', 'post', postId );
				} catch ( error ) {
					state.deleteError = String(
						error?.message ?? error ?? 'unknown error'
					);
				}

				state.deleteFinished = true;
			}
		);

		addButton(
			'rtc-rename-loaded-category',
			'Rename loaded category',
			'12px',
			async function () {
				const categoryId = Number(
					params.get( 'rtc_category_id' ) ?? 0
				);

				state.renameStarted = true;
				state.renameFinished = false;
				state.renameError = null;

				try {
					wp.data
						.dispatch( 'core' )
						.editEntityRecord( 'taxonomy', 'category', categoryId, {
							name: `rtc-renamed-${ Date.now() }`,
						} );
				} catch ( error ) {
					state.renameError = String(
						error?.message ?? error ?? 'unknown error'
					);
				}

				state.renameFinished = true;
			}
		);
	} );
} )();
