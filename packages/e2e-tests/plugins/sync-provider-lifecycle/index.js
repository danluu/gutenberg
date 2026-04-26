( function () {
	const params = new URLSearchParams( window.location.search );
	const mode = params.get( 'rtc_provider_lifecycle' );

	if ( ! mode ) {
		return;
	}

	const state = {
		attempts: 0,
		created: 0,
		destroyed: 0,
		failures: 0,
		mode,
		providerAvailable: false,
		retryFinished: false,
		retryStarted: false,
		rooms: {},
	};

	window.__rtcProviderLifecycle = state;

	function getRoomName( options ) {
		return options.objectId
			? `${ options.objectType }:${ options.objectId }`
			: options.objectType;
	}

	function getRoomState( options ) {
		const room = getRoomName( options );
		state.rooms[ room ] ??= {
			attempts: 0,
			created: 0,
			destroyed: 0,
			failures: 0,
		};
		return state.rooms[ room ];
	}

	function createProviderResult( options ) {
		const roomState = getRoomState( options );
		state.created++;
		roomState.created++;

		return {
			destroy() {
				state.destroyed++;
				roomState.destroyed++;
			},
			on() {
				return undefined;
			},
		};
	}

	async function retryProvider( options ) {
		const roomState = getRoomState( options );
		state.attempts++;
		roomState.attempts++;

		if ( ! state.providerAvailable ) {
			state.failures++;
			roomState.failures++;
			throw new Error( 'RTC provider is temporarily unavailable.' );
		}

		return createProviderResult( options );
	}

	async function successfulProvider( options ) {
		const roomState = getRoomState( options );
		state.attempts++;
		roomState.attempts++;
		return createProviderResult( options );
	}

	async function failingProvider( options ) {
		const roomState = getRoomState( options );
		state.attempts++;
		roomState.attempts++;
		state.failures++;
		roomState.failures++;
		throw new Error( 'A later RTC provider failed to start.' );
	}

	wp.hooks.addFilter(
		'sync.providers',
		'gutenberg-test/sync-provider-lifecycle',
		function ( providers ) {
			if ( mode === 'retry' ) {
				return [ retryProvider ];
			}

			if ( mode === 'partial' ) {
				return [ successfulProvider, failingProvider ];
			}

			if ( mode === 'partial-default' ) {
				return [ ...providers, failingProvider ];
			}

			return providers;
		}
	);

	wp.domReady( function () {
		if ( mode !== 'retry' ) {
			return;
		}

		const button = document.createElement( 'button' );
		button.id = 'rtc-provider-retry';
		button.type = 'button';
		button.textContent = 'Reconnect RTC provider';
		button.style.position = 'fixed';
		button.style.right = '12px';
		button.style.bottom = '12px';
		button.style.zIndex = '100000';

		button.addEventListener( 'click', async function () {
			const postId = wp.data.select( 'core/editor' ).getCurrentPostId();

			state.providerAvailable = true;
			state.retryStarted = true;
			state.retryFinished = false;

			wp.data
				.dispatch( 'core' )
				.invalidateResolution( 'getEntityRecord', [
					'postType',
					'post',
					postId,
				] );

			await wp.data
				.resolveSelect( 'core' )
				.getEntityRecord( 'postType', 'post', postId );

			state.retryFinished = true;
		} );

		document.body.appendChild( button );
	} );
} )();
