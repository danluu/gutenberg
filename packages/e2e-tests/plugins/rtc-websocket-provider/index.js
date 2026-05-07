( function () {
	const TEST_PROVIDER_NAMESPACE = 'gutenberg-test/rtc-websocket-provider';
	const DEFAULT_URL = 'ws://127.0.0.1:18991';
	const CRDT_RECORD_MAP_KEY = 'document';
	const HAS_PROVIDER_SYNCED_REMOTE_STATE_META =
		'hasProviderSyncedRemoteState';
	const LOCAL_SYNC_MANAGER_ORIGIN = 'syncManager';
	const REMOTE_ORIGIN = { source: TEST_PROVIDER_NAMESPACE };
	let emptyYjsUpdateV2Base64 = null;

	const settings = window.gutenbergTestWebSocketSync || {};
	const globalState = ( window.__gutenbergTestWebSocketSync = {
		controls: {},
		rooms: {},
		tick: 0,
		url: settings.url || DEFAULT_URL,
		delayNextMessage( delayMs ) {
			this.controls.delayNextMessageMs = Number( delayMs ) || 0;
		},
		closeNextSocket() {
			this.controls.closeNextSocket = true;
		},
	} );

	function toBase64( bytes ) {
		let binary = '';
		for ( let offset = 0; offset < bytes.length; offset += 0x8000 ) {
			binary += String.fromCharCode.apply(
				null,
				bytes.subarray( offset, offset + 0x8000 )
			);
		}
		return window.btoa( binary );
	}

	function fromBase64( value ) {
		const binary = window.atob( value );
		const bytes = new Uint8Array( binary.length );
		for ( let i = 0; i < binary.length; i++ ) {
			bytes[ i ] = binary.charCodeAt( i );
		}
		return bytes;
	}

	function getEmptyYjsUpdateV2Base64() {
		if ( emptyYjsUpdateV2Base64 ) {
			return emptyYjsUpdateV2Base64;
		}

		const emptyDoc = new window.wp.sync.Y.Doc();
		emptyYjsUpdateV2Base64 = toBase64(
			window.wp.sync.Y.encodeStateAsUpdateV2(
				emptyDoc,
				window.wp.sync.Y.encodeStateVector( emptyDoc )
			)
		);
		emptyDoc.destroy();
		return emptyYjsUpdateV2Base64;
	}

	function isEmptyYjsUpdateV2( encodedUpdate ) {
		return encodedUpdate === getEmptyYjsUpdateV2Base64();
	}

	function hasDocumentState( ydoc ) {
		return ydoc.getMap( CRDT_RECORD_MAP_KEY ).size > 0;
	}

	function ensureRoomDebugState( room ) {
		if ( ! globalState.rooms[ room ] ) {
			globalState.rooms[ room ] = {
				awarenessCount: 0,
				clientId: null,
				receivedMessages: 0,
				sentMessages: 0,
				synced: false,
				status: 'disconnected',
			};
		}
		return globalState.rooms[ room ];
	}

	function updateDebugState( room, patch ) {
		Object.assign( ensureRoomDebugState( room ), patch );
		globalState.tick += 1;
	}

	function emitAwarenessChange( awareness, change ) {
		awareness.emit( 'change', [ change ] );
	}

	function applyAwarenessState( awareness, state ) {
		const currentStates = awareness.getStates();
		const added = [];
		const updated = [];
		const removed = [];

		for ( const [ clientIdString, awarenessState ] of Object.entries(
			state || {}
		) ) {
			const clientId = Number( clientIdString );
			if ( clientId === awareness.clientID ) {
				continue;
			}

			if ( awarenessState === null ) {
				if ( currentStates.delete( clientId ) ) {
					removed.push( clientId );
				}
				continue;
			}

			if ( ! currentStates.has( clientId ) ) {
				currentStates.set( clientId, awarenessState );
				added.push( clientId );
				continue;
			}

			if (
				JSON.stringify( currentStates.get( clientId ) ) !==
				JSON.stringify( awarenessState )
			) {
				currentStates.set( clientId, awarenessState );
				updated.push( clientId );
			}
		}

		if ( added.length || updated.length || removed.length ) {
			emitAwarenessChange( awareness, { added, updated, removed } );
		}
	}

	function removeAwarenessClients( awareness, clientIds ) {
		const removed = [];
		for ( const clientId of clientIds || [] ) {
			const normalizedClientId = Number( clientId );
			if (
				normalizedClientId !== awareness.clientID &&
				awareness.getStates().delete( normalizedClientId )
			) {
				removed.push( normalizedClientId );
			}
		}

		if ( removed.length ) {
			emitAwarenessChange( awareness, {
				added: [],
				updated: [],
				removed,
			} );
		}
	}

	class TestWebSocketProvider {
		constructor( { awareness, requiresDocumentState, room, ydoc } ) {
			this.awareness = awareness || new window.wp.sync.Awareness( ydoc );
			this.allowSyncManagerUpdates = false;
			this.currentStatus = { status: 'connecting' };
			this.destroyed = false;
			this.listeners = {
				status: new Set(),
			};
			this.pendingMessages = [];
			this.reconnectDelayMs = 250;
			this.requiresDocumentState = requiresDocumentState;
			this.room = room;
			this.hasCompletedInitialSync = false;
			this.waitingForPeerSnapshot = false;
			this.resolveReady = null;
			this.ready = new Promise( ( resolve ) => {
				this.resolveReady = resolve;
			} );
			this.socket = null;
			this.synced = false;
			this.ydoc = ydoc;

			this.onDocUpdate = this.onDocUpdate.bind( this );
			this.onAwarenessUpdate = this.onAwarenessUpdate.bind( this );
			this.ydoc.on( 'updateV2', this.onDocUpdate );
			this.awareness.on( 'change', this.onAwarenessUpdate );

			updateDebugState( this.room, {
				clientId: this.ydoc.clientID,
				status: 'connecting',
			} );
			this.connect();
		}

		on( event, callback ) {
			if ( this.listeners[ event ] ) {
				this.listeners[ event ].add( callback );
				if ( event === 'status' ) {
					callback( this.currentStatus );
				}
			}
		}

		emitStatus( status ) {
			this.currentStatus = status;
			updateDebugState( this.room, { status: status.status } );
			for ( const callback of this.listeners.status ) {
				callback( status );
			}
		}

		connect() {
			if ( this.destroyed ) {
				return;
			}

			this.emitStatus( { status: 'connecting' } );
			const socket = new window.WebSocket( globalState.url );
			this.socket = socket;

			socket.addEventListener( 'open', () => {
				this.reconnectDelayMs = 250;
				this.send( {
					type: 'join',
					room: this.room,
					clientId: this.ydoc.clientID,
					awareness: this.awareness.getLocalState() || {},
					stateVector: toBase64(
						window.wp.sync.Y.encodeStateVector( this.ydoc )
					),
				} );
			} );

			socket.addEventListener( 'message', ( event ) => {
				this.handleMessage( event.data );
			} );

			socket.addEventListener( 'close', () => {
				if ( this.destroyed ) {
					return;
				}

				this.synced = false;
				updateDebugState( this.room, { synced: false } );
				this.emitStatus( { status: 'disconnected' } );
				const delay = this.reconnectDelayMs;
				this.reconnectDelayMs = Math.min(
					this.reconnectDelayMs * 2,
					5000
				);
				window.setTimeout( () => this.connect(), delay );
			} );

			socket.addEventListener( 'error', () => {
				if ( ! this.destroyed ) {
					this.emitStatus( { status: 'disconnected' } );
				}
			} );
		}

		flushPendingMessages() {
			const messages = this.pendingMessages.splice( 0 );
			for ( const message of messages ) {
				this.send( message );
			}
		}

		send( payload ) {
			if ( ! this.socket || this.socket.readyState !== WebSocket.OPEN ) {
				if ( ! this.destroyed ) {
					this.pendingMessages.push( payload );
				}
				return;
			}

			const sendNow = () => {
				if (
					globalState.controls.closeNextSocket &&
					this.socket.readyState === WebSocket.OPEN
				) {
					globalState.controls.closeNextSocket = false;
					this.pendingMessages.unshift( payload );
					this.socket.close( 4000, 'Injected test close' );
					return;
				}

				this.socket.send( JSON.stringify( payload ) );
				const state = ensureRoomDebugState( this.room );
				updateDebugState( this.room, {
					sentMessages: state.sentMessages + 1,
				} );
			};

			const delayMs = globalState.controls.delayNextMessageMs || 0;
			if ( delayMs > 0 ) {
				globalState.controls.delayNextMessageMs = 0;
				window.setTimeout( sendNow, delayMs );
				return;
			}

			sendNow();
		}

		handleMessage( rawMessage ) {
			let message;
			try {
				message = JSON.parse( rawMessage );
			} catch {
				return;
			}

			if ( message.room && message.room !== this.room ) {
				return;
			}

			const state = ensureRoomDebugState( this.room );
			updateDebugState( this.room, {
				receivedMessages: state.receivedMessages + 1,
			} );

			if ( message.type === 'snapshot' ) {
				const updates = message.updates || [];
				const hasExistingPeers = Number( message.peerCount ) > 1;
				window.setTimeout( () => {
					const isInitialSync = ! this.hasCompletedInitialSync;
					for ( const update of updates ) {
						window.wp.sync.Y.applyUpdateV2(
							this.ydoc,
							fromBase64( update ),
							REMOTE_ORIGIN
						);
					}
					const hasPeerState =
						updates.length > 0 &&
						( ! this.requiresDocumentState ||
							hasDocumentState( this.ydoc ) );
					if ( ! this.hasCompletedInitialSync ) {
						this.allowSyncManagerUpdates =
							! hasPeerState && ! hasExistingPeers;
						this.waitingForPeerSnapshot =
							! hasPeerState && hasExistingPeers;
						if ( hasPeerState ) {
							this.ydoc.meta?.set(
								HAS_PROVIDER_SYNCED_REMOTE_STATE_META,
								true
							);
						}
					}
					applyAwarenessState( this.awareness, message.awareness );
					if ( this.waitingForPeerSnapshot ) {
						updateDebugState( this.room, {
							awarenessCount: this.awareness.getStates().size,
						} );
						return;
					}
					this.markSynced( {
						discardPendingMessages: isInitialSync && hasPeerState,
					} );
					updateDebugState( this.room, {
						awarenessCount: this.awareness.getStates().size,
					} );
				}, 0 );
				return;
			} else if (
				message.type === 'update' &&
				message.clientId !== this.ydoc.clientID
			) {
				window.wp.sync.Y.applyUpdateV2(
					this.ydoc,
					fromBase64( message.update ),
					REMOTE_ORIGIN
				);
				const isPeerSnapshotResponse =
					this.waitingForPeerSnapshot &&
					! isEmptyYjsUpdateV2( message.update ) &&
					( ! this.requiresDocumentState ||
						hasDocumentState( this.ydoc ) );
				if ( isPeerSnapshotResponse ) {
					this.waitingForPeerSnapshot = false;
					this.ydoc.meta?.set(
						HAS_PROVIDER_SYNCED_REMOTE_STATE_META,
						true
					);
					this.markSynced( { discardPendingMessages: true } );
				}
			} else if (
				message.type === 'sync-request' &&
				message.clientId !== this.ydoc.clientID
			) {
				const stateVector = message.stateVector
					? fromBase64( message.stateVector )
					: undefined;
				this.send( {
					type: 'update',
					room: this.room,
					clientId: this.ydoc.clientID,
					update: toBase64(
						window.wp.sync.Y.encodeStateAsUpdateV2(
							this.ydoc,
							stateVector
						)
					),
				} );
			} else if ( message.type === 'awareness' ) {
				applyAwarenessState( this.awareness, message.awareness );
			} else if ( message.type === 'remove-awareness' ) {
				removeAwarenessClients( this.awareness, message.clientIds );
			}

			updateDebugState( this.room, {
				awarenessCount: this.awareness.getStates().size,
			} );
		}

		markSynced( { discardPendingMessages = false } = {} ) {
			this.synced = true;
			updateDebugState( this.room, { synced: true } );
			this.emitStatus( { status: 'connected' } );

			if ( discardPendingMessages ) {
				this.pendingMessages = [];
			} else {
				this.flushPendingMessages();
			}

			this.hasCompletedInitialSync = true;

			if ( this.resolveReady ) {
				this.resolveReady();
				this.resolveReady = null;
			}
		}

		onDocUpdate( update, origin ) {
			if (
				origin === REMOTE_ORIGIN ||
				( origin === LOCAL_SYNC_MANAGER_ORIGIN &&
					this.synced &&
					! this.allowSyncManagerUpdates )
			) {
				return;
			}

			const message = {
				type: 'update',
				room: this.room,
				clientId: this.ydoc.clientID,
				update: toBase64( update ),
			};

			if ( ! this.synced ) {
				this.pendingMessages.push( message );
				return;
			}

			this.send( message );
		}

		onAwarenessUpdate() {
			updateDebugState( this.room, {
				awarenessCount: this.awareness.getStates().size,
			} );
			const message = {
				type: 'awareness',
				room: this.room,
				clientId: this.ydoc.clientID,
				awareness: this.awareness.getLocalState() || {},
			};

			if ( ! this.synced ) {
				this.pendingMessages.push( message );
				return;
			}

			this.send( message );
		}

		destroy() {
			this.destroyed = true;
			this.pendingMessages = [];
			this.ydoc.off( 'updateV2', this.onDocUpdate );
			this.awareness.off( 'change', this.onAwarenessUpdate );
			this.send( {
				type: 'leave',
				room: this.room,
				clientId: this.ydoc.clientID,
			} );

			if ( this.socket ) {
				this.socket.close( 1000, 'destroy' );
			}

			this.synced = false;
			updateDebugState( this.room, { synced: false } );
			this.emitStatus( { status: 'disconnected' } );
		}
	}

	function createWebSocketProvider() {
		return async ( { awareness, objectType, objectId, ydoc } ) => {
			const room = objectId
				? `${ objectType }:${ objectId }`
				: objectType;
			const provider = new TestWebSocketProvider( {
				awareness,
				requiresDocumentState: objectId !== null,
				room,
				ydoc,
			} );
			await provider.ready;

			return {
				destroy: () => provider.destroy(),
				on: ( event, callback ) => provider.on( event, callback ),
			};
		};
	}

	window.wp.hooks.addFilter(
		'sync.providers',
		TEST_PROVIDER_NAMESPACE,
		() => [ createWebSocketProvider() ]
	);
} )();
