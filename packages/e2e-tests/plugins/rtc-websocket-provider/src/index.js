/**
 * Test-only WebSocket sync provider for Gutenberg RTC e2e tests.
 *
 * Speaks the y-websocket binary protocol against test/e2e/bin/rtc-test-ws-sync-server.mjs
 * (which is built on @y/websocket-server) so the test harness exercises the same
 * wire format as production deployments. Exposes a small debug surface on
 * window.__gutenbergTestWebSocketSync.rooms that the Playwright fixtures poll.
 */

// eslint-disable-next-line import/no-extraneous-dependencies -- declared in test/e2e/package.json, only loaded by the WS e2e harness.
import { WebsocketProvider } from 'y-websocket';

const TEST_PROVIDER_NAMESPACE = 'gutenberg-test/rtc-websocket-provider';
const DEFAULT_URL = 'ws://127.0.0.1:18991';
const HAS_PROVIDER_SYNCED_REMOTE_STATE_META = 'hasProviderSyncedRemoteState';

const settings = window.gutenbergTestWebSocketSync || {};
const globalState = ( window.__gutenbergTestWebSocketSync = {
	providerDiagnostics: [],
	rooms: {},
	tick: 0,
	url: settings.url || DEFAULT_URL,
} );
let nextProviderToken = 1;
const activeProviders = new Map();

function ensureRoomDebugState( room ) {
	if ( ! globalState.rooms[ room ] ) {
		globalState.rooms[ room ] = {
			awarenessCount: 0,
			clientId: null,
			createdTick: null,
			destroyed: false,
			destroyedTick: null,
			duplicateActiveProviderCount: 0,
			duplicateActiveProviderEvents: [],
			lastAwarenessTick: null,
			lastStatusTick: null,
			lastSyncTick: null,
			providerToken: null,
			status: 'disconnected',
			staleReadyEventCount: 0,
			staleReadyEvents: [],
			synced: false,
		};
	}
	return globalState.rooms[ room ];
}

function updateDebugState( room, patch ) {
	Object.assign( ensureRoomDebugState( room ), patch );
	globalState.tick += 1;
}

function isFuzzOnlyAssertionsEnabled() {
	return (
		window.__GUTENBERG_RTC_FUZZ_ONLY_ASSERTIONS__ === true ||
		window.__GUTENBERG_RTC_BROWSER_FUZZ_ONLY_ASSERTIONS__ === true
	);
}

function pushProviderDiagnostic( room, diagnostic ) {
	if ( ! isFuzzOnlyAssertionsEnabled() ) {
		return;
	}

	const diagnostics = globalState.providerDiagnostics;
	if ( diagnostics.length >= 20 ) {
		return;
	}

	globalState.tick += 1;
	diagnostics.push( {
		...diagnostic,
		room,
		tick: globalState.tick,
	} );
}

function rememberBoundedRoomEvent( roomState, key, event ) {
	roomState[ key ] = [ ...( roomState[ key ] || [] ), event ].slice( -10 );
}

function recordDuplicateActiveProvider( room, providerToken, ydoc ) {
	const existing = activeProviders.get( room );
	if ( ! existing || existing.doc === ydoc ) {
		return;
	}

	const roomState = ensureRoomDebugState( room );
	const event = {
		currentClientId: roomState.clientId,
		currentProviderToken: existing.providerToken,
		nextClientId: ydoc.clientID,
		nextProviderToken: providerToken,
	};

	roomState.duplicateActiveProviderCount += 1;
	rememberBoundedRoomEvent(
		roomState,
		'duplicateActiveProviderEvents',
		event
	);
	pushProviderDiagnostic( room, {
		...event,
		kind: 'duplicate-active-provider',
	} );
}

function recordStalePositiveReadyEvent( room, providerToken, patch ) {
	const roomState = ensureRoomDebugState( room );
	const eventTypes = [];

	if ( patch.status === 'connected' ) {
		eventTypes.push( 'status:connected' );
	}
	if ( patch.synced === true ) {
		eventTypes.push( 'sync:true' );
	}
	if ( eventTypes.length === 0 || roomState.providerToken === null ) {
		return;
	}

	const event = {
		currentProviderToken: roomState.providerToken,
		currentStatus: roomState.status,
		currentSynced: roomState.synced,
		eventTypes,
		staleProviderToken: providerToken,
	};

	roomState.staleReadyEventCount += eventTypes.length;
	rememberBoundedRoomEvent( roomState, 'staleReadyEvents', event );
	pushProviderDiagnostic( room, {
		...event,
		kind: 'stale-positive-ready-event',
	} );
}

function updateCurrentProviderDebugState( room, providerToken, patch ) {
	const roomState = ensureRoomDebugState( room );
	if ( roomState.providerToken !== providerToken ) {
		recordStalePositiveReadyEvent( room, providerToken, patch );
		return;
	}

	updateDebugState( room, patch );
}

function areUint8ArraysEqual( a, b ) {
	if ( a.length !== b.length ) {
		return false;
	}

	return a.every( ( value, index ) => value === b[ index ] );
}

function createWebSocketProvider() {
	return async ( { awareness, objectType, objectId, ydoc } ) => {
		const room = objectId ? `${ objectType }:${ objectId }` : objectType;
		const initialStateVector = window.wp.sync.Y.encodeStateVector( ydoc );
		const providerToken = nextProviderToken++;
		let resolveInitialSync;
		const initialSync = new Promise( ( resolve ) => {
			resolveInitialSync = resolve;
		} );

		recordDuplicateActiveProvider( room, providerToken, ydoc );
		activeProviders.set( room, {
			doc: ydoc,
			providerToken,
		} );

		updateDebugState( room, {
			clientId: ydoc.clientID,
			createdTick: globalState.tick + 1,
			destroyed: false,
			destroyedTick: null,
			providerToken,
			status: 'connecting',
			synced: false,
		} );

		const provider = new WebsocketProvider( globalState.url, room, ydoc, {
			awareness,
			connect: false,
			// Disable BroadcastChannel so cross-tab sync always goes through
			// the WebSocket. Tests need to exercise the wire transport.
			disableBc: true,
		} );

		const statusListeners = new Set();

		const onStatus = ( event ) => {
			// A fresh socket means the previous sync handshake (if any) is
			// no longer current. y-websocket re-fires 'sync' once sync step 2
			// completes on the new connection.
			const patch = {
				lastStatusTick: globalState.tick + 1,
				status: event.status,
			};
			if ( event.status !== 'connected' ) {
				patch.synced = false;
			}
			updateCurrentProviderDebugState( room, providerToken, patch );
			for ( const callback of statusListeners ) {
				callback( { status: event.status } );
			}
		};
		provider.on( 'status', onStatus );

		// y-websocket distinguishes socket connection from sync completion.
		// 'connected' means the WS is open; 'sync' fires once sync step 2 has
		// landed and the doc reflects the server state. Tests that need real
		// convergence should wait on `synced`, not just `status`.
		const onSync = ( isSynced ) => {
			if ( isSynced ) {
				const currentStateVector =
					window.wp.sync.Y.encodeStateVector( ydoc );

				if (
					! areUint8ArraysEqual(
						currentStateVector,
						initialStateVector
					)
				) {
					ydoc.meta.set(
						HAS_PROVIDER_SYNCED_REMOTE_STATE_META,
						true
					);
				}

				resolveInitialSync();
			}
			updateCurrentProviderDebugState( room, providerToken, {
				lastSyncTick: globalState.tick + 1,
				synced: !! isSynced,
			} );
		};
		provider.on( 'sync', onSync );

		const onAwarenessChange = () => {
			updateCurrentProviderDebugState( room, providerToken, {
				awarenessCount: ( awareness || provider.awareness ).getStates()
					.size,
				lastAwarenessTick: globalState.tick + 1,
			} );
		};
		const awarenessInstance = awareness || provider.awareness;
		awarenessInstance.on( 'change', onAwarenessChange );
		onAwarenessChange();

		provider.connect();

		await initialSync;

		return {
			destroy: () => {
				const activeProvider = activeProviders.get( room );
				if ( activeProvider?.providerToken === providerToken ) {
					activeProviders.delete( room );
				}
				awarenessInstance.off( 'change', onAwarenessChange );
				provider.off( 'status', onStatus );
				provider.off( 'sync', onSync );
				provider.destroy();
				updateCurrentProviderDebugState( room, providerToken, {
					destroyed: true,
					destroyedTick: globalState.tick + 1,
					status: 'disconnected',
					synced: false,
				} );
			},
			on: ( event, callback ) => {
				if ( event === 'status' ) {
					statusListeners.add( callback );
					callback( {
						status: ensureRoomDebugState( room ).status,
					} );
				}
			},
		};
	};
}

window.wp.hooks.addFilter( 'sync.providers', TEST_PROVIDER_NAMESPACE, () => [
	createWebSocketProvider(),
] );
