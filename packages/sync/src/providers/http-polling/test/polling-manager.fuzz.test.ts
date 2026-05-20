/**
 * External dependencies
 */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';
import { type SyncPayload } from '../types';

jest.mock( 'yjs', () => ( {
	mergeUpdatesV2: jest.fn( () => new Uint8Array() ),
	applyUpdateV2: jest.fn(),
	encodeStateAsUpdateV2: jest.fn( () => new Uint8Array() ),
} ) );

jest.mock( 'lib0/encoding', () => ( {
	createEncoder: jest.fn( () => ( {} ) ),
	toUint8Array: jest.fn( () => new Uint8Array( [ 0 ] ) ),
} ) );

jest.mock( 'lib0/decoding', () => ( {
	createDecoder: jest.fn( () => ( {} ) ),
} ) );

jest.mock( 'y-protocols/sync', () => ( {
	writeSyncStep1: jest.fn(),
	readSyncMessage: jest.fn(),
} ) );

jest.mock( 'y-protocols/awareness', () => ( {
	removeAwarenessStates: jest.fn(),
} ) );

jest.mock( '@wordpress/hooks', () => ( {
	applyFilters: jest.fn(
		( _hook: string, defaultValue: unknown ) => defaultValue
	),
} ) );

jest.mock( '../config', () => ( {
	...( jest.requireActual( '../config' ) as object ),
	MAX_ROOMS_PER_REQUEST: 10,
	MAX_UPDATE_SIZE_IN_BYTES: 1024,
} ) );

jest.mock( '../utils', () => ( {
	...( jest.requireActual( '../utils' ) as object ),
	postSyncUpdate: jest.fn(),
	postSyncUpdateNonBlocking: jest.fn(),
} ) );

interface PollingManager {
	registerRoom: ( options: {
		room: string;
		doc: unknown;
		awareness: unknown;
		log: () => void;
		onStatusChange: ( status?: unknown ) => void;
		onSync: ( status?: unknown ) => void;
	} ) => void;
	unregisterRoom: (
		room: string,
		options?: { sendDisconnectSignal?: boolean }
	) => void;
}

type MockDoc = ReturnType< typeof createMockDoc >;
type MockAwareness = ReturnType< typeof createMockAwareness >;

function createMockDoc( clientID = 1 ) {
	return { clientID, on: jest.fn(), off: jest.fn() };
}

function getOnDocUpdate( doc: MockDoc ) {
	const call = doc.on.mock.calls.find(
		( args: unknown[] ) => args[ 0 ] === 'updateV2'
	);
	if ( ! call ) {
		throw new Error( 'onDocUpdate not registered' );
	}
	return call[ 1 ] as ( update: Uint8Array, origin: unknown ) => void;
}

function createMockAwareness( clientID = 1 ) {
	const states = new Map< number, unknown >( [ [ clientID, {} ] ] );

	return {
		clientID,
		getLocalState: jest.fn( () => ( {} ) ),
		getStates: jest.fn( () => states ),
		on: jest.fn(),
		off: jest.fn(),
		emit: jest.fn(),
	};
}

function simulateVisibilityChange( state: string ) {
	Object.defineProperty( document, 'visibilityState', {
		configurable: true,
		get: () => state,
	} );
	document.dispatchEvent( new Event( 'visibilitychange' ) );
}

function snapshotPayload( payload: SyncPayload ) {
	return {
		rooms: payload.rooms.map( ( room ) => ( {
			after: room.after,
			room: room.room,
			updateCount: room.updates.length,
			updateTypes: room.updates.map( ( update ) => update.type ),
		} ) ),
	};
}

describe( 'polling-manager seeded state-machine fuzz', () => {
	let pollingManager: PollingManager;
	let mockApplyFilters: jest.Mock<
		typeof import('@wordpress/hooks').applyFilters
	>;
	let mockPostSyncUpdate: jest.Mock<
		typeof import('../utils').postSyncUpdate
	>;
	const docs = new Map< string, MockDoc >();
	const awarenesses = new Map< string, MockAwareness >();

	beforeEach( () => {
		jest.useFakeTimers();
		docs.clear();
		awarenesses.clear();

		jest.isolateModules( () => {
			pollingManager = require( '../polling-manager' ).pollingManager;
			mockApplyFilters = require( '@wordpress/hooks' ).applyFilters;
			mockPostSyncUpdate = require( '../utils' ).postSyncUpdate;
		} );
		mockApplyFilters.mockImplementation(
			( _hook: string, defaultValue: unknown ) => defaultValue
		);
	} );

	afterEach( () => {
		jest.clearAllTimers();
		jest.useRealTimers();
		Object.defineProperty( document, 'visibilityState', {
			configurable: true,
			get: () => 'visible',
		} );
	} );

	function registerRoom( room: string, clientID: number ) {
		const doc = createMockDoc( clientID );
		const awareness = createMockAwareness( clientID );
		docs.set( room, doc );
		awarenesses.set( room, awareness );
		pollingManager.registerRoom( {
			room,
			doc,
			awareness,
			log: jest.fn(),
			onStatusChange: jest.fn(),
			onSync: jest.fn(),
		} );
	}

	function enqueueUpdates( rooms: string[], count: number, seed: number ) {
		for ( const room of rooms ) {
			const doc = docs.get( room );
			if ( ! doc ) {
				continue;
			}
			const onDocUpdate = getOnDocUpdate( doc );
			for ( let index = 0; index < count; index++ ) {
				onDocUpdate(
					new Uint8Array( [
						( seed + index ) % 251,
						( seed * 3 + index ) % 251,
						( seed * 7 + index ) % 251,
					] ),
					`seed-${ seed }`
				);
			}
		}
	}

	it( 'keeps healthy HTTP rooms moving through retry, forbidden, backlog, compaction, and visibility churn', async () => {
		const payloads: Array< ReturnType< typeof snapshotPayload > > = [];
		let transientRejected = false;
		let forbiddenRejected = false;
		let forbiddenRejectedAt = -1;

		mockPostSyncUpdate.mockImplementation(
			async ( payload: SyncPayload ) => {
				const snapshot = snapshotPayload( payload );
				payloads.push( snapshot );

				if (
					! transientRejected &&
					snapshot.rooms.some( ( room ) => room.updateCount > 1 )
				) {
					transientRejected = true;
					throw new Error( 'seeded transient sync failure' );
				}

				if (
					! forbiddenRejected &&
					snapshot.rooms.some(
						( room ) => room.room === 'forbidden-room'
					) &&
					payloads.length > 2
				) {
					forbiddenRejected = true;
					forbiddenRejectedAt = payloads.length - 1;
					throw {
						code: 'rest_cannot_edit',
						message:
							'You do not have permission to sync this entity: forbidden-room.',
						data: { status: 403 },
					};
				}

				return {
					rooms: payload.rooms.map( ( room ) => ( {
						room: room.room,
						end_cursor: payloads.length,
						awareness:
							room.room === 'primary'
								? { 1: {}, 2: {}, 3: {} }
								: {},
						updates: [],
						should_compact:
							room.room === 'primary' &&
							payloads.length % 5 === 0,
					} ) ),
				};
			}
		);

		registerRoom( 'primary', 1 );
		registerRoom( 'forbidden-room', 2 );
		for ( let index = 1; index <= 14; index++ ) {
			registerRoom( `overflow-${ index }`, index + 2 );
		}

		await jest.advanceTimersByTimeAsync( 0 );

		enqueueUpdates(
			[
				'primary',
				'overflow-1',
				'overflow-2',
				'overflow-7',
				'overflow-11',
			],
			4,
			41
		);

		for ( let step = 0; step < 18; step++ ) {
			if ( step === 2 ) {
				simulateVisibilityChange( 'hidden' );
				simulateVisibilityChange( 'visible' );
			}
			if ( step === 9 ) {
				pollingManager.unregisterRoom( 'overflow-2' );
			}
			await jest.advanceTimersByTimeAsync( 4000 );
		}

		expect( transientRejected ).toBe( true );
		expect( forbiddenRejected ).toBe( true );
		expect(
			payloads.every( ( payload ) => payload.rooms.length <= 10 )
		).toBe( true );
		expect(
			payloads.some( ( payload ) =>
				payload.rooms.some( ( room ) => room.updateCount > 0 )
			)
		).toBe( true );
		expect(
			payloads.some( ( payload ) =>
				payload.rooms.some( ( room ) =>
					room.updateTypes.includes( 'compaction' )
				)
			)
		).toBe( true );

		const laterPayloads = payloads.slice( forbiddenRejectedAt + 1 );
		expect(
			laterPayloads.every(
				( payload ) =>
					! payload.rooms.some(
						( room ) => room.room === 'forbidden-room'
					)
			)
		).toBe( true );
		expect(
			laterPayloads.some( ( payload ) =>
				payload.rooms.some( ( room ) => room.room === 'primary' )
			)
		).toBe( true );

		const overflowRoomsSeen = new Set(
			payloads
				.flatMap( ( payload ) =>
					payload.rooms.map( ( room ) => room.room )
				)
				.filter( ( room ) => room.startsWith( 'overflow-' ) )
		);
		expect( overflowRoomsSeen.size ).toBeGreaterThanOrEqual( 12 );
	} );

	it( 'processes hundreds of allowed peers in one room without dropping awareness or disconnecting', async () => {
		const peerCount = 128;
		const payloads: Array< ReturnType< typeof snapshotPayload > > = [];
		const awarenessState = Object.fromEntries(
			Array.from( { length: peerCount }, ( _value, index ) => {
				const clientId = index + 1;
				return [
					String( clientId ),
					{
						cursor: {
							clientId,
							offset: index % 17,
						},
						user: {
							id: clientId,
							name: `User ${ clientId }`,
						},
					},
				];
			} )
		);

		mockApplyFilters.mockImplementation(
			( hook: string, defaultValue: unknown ) =>
				hook === 'sync.pollingProvider.maxClientsPerRoom'
					? peerCount
					: defaultValue
		);
		mockPostSyncUpdate.mockImplementation(
			async ( payload: SyncPayload ) => {
				payloads.push( snapshotPayload( payload ) );
				return {
					rooms: payload.rooms.map( ( room ) => ( {
						room: room.room,
						end_cursor: payloads.length,
						awareness: awarenessState,
						updates: [],
					} ) ),
				};
			}
		);

		registerRoom( 'primary', 1 );
		await jest.advanceTimersByTimeAsync( 0 );
		await jest.advanceTimersByTimeAsync( 4000 );

		const awareness = awarenesses.get( 'primary' );
		expect( awareness ).toBeDefined();
		expect( awareness!.getStates().size ).toBe( peerCount );
		expect( awareness!.emit ).toHaveBeenCalledWith( 'change', [
			expect.objectContaining( {
				added: expect.arrayContaining( [ 2, 64, 128 ] ),
			} ),
		] );
		expect( payloads.length ).toBeGreaterThanOrEqual( 1 );
		expect(
			payloads.every( ( payload ) => payload.rooms.length <= 10 )
		).toBe( true );
	} );
	} );
