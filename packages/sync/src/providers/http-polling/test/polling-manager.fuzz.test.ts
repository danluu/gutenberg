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
import type { SyncResponse } from '../types';

/**
 * Internal dependencies
 */
interface SeededRandom {
	bool: ( probability?: number ) => boolean;
}

/* eslint-disable no-bitwise */
function createSeededRandom( seed: number ): SeededRandom {
	let state = seed >>> 0;

	if ( state === 0 ) {
		state = 0x9e3779b9;
	}

	function nextUint32(): number {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
		value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
		return ( value ^ ( value >>> 14 ) ) >>> 0;
	}

	return {
		bool( probability = 0.5 ) {
			return nextUint32() / 0x100000000 < probability;
		},
	};
}
/* eslint-enable no-bitwise */

function readIntFromEnv( name: string ): number | undefined {
	const value = process.env[ name ];

	if ( value === undefined || value === '' ) {
		return undefined;
	}

	const parsed = Number.parseInt( value, 10 );

	if ( Number.isNaN( parsed ) ) {
		throw new Error(
			`Expected ${ name } to be an integer, got "${ value }".`
		);
	}

	return parsed;
}

function seededRangeFromEnv(
	defaultCount: number,
	defaultStart = 1
): number[] {
	const count = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_COUNT' ) ?? defaultCount;
	const start = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_START' ) ?? defaultStart;

	if ( count < 0 ) {
		throw new Error(
			`Expected GUTENBERG_FUZZ_SEED_COUNT to be non-negative, got "${ count }".`
		);
	}

	return Array.from( { length: count }, ( _value, index ) => start + index );
}

// Mock all external dependencies before imports.
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
	MAX_UPDATE_SIZE_IN_BYTES: 10,
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
		onStatusChange: () => void;
		onSync: () => void;
	} ) => void;
	retryNow: () => void;
	unregisterRoom: (
		room: string,
		options?: { sendDisconnectSignal?: boolean }
	) => void;
}

const SEEDS = seededRangeFromEnv( 8, 501 );
const PRIMARY_ROOM = 'postType/post:1';
const CONFLICTING_ROOM = 'postType/post:10';
const COLLECTION_ROOM = 'collection-room';

function createMockDoc( clientID = 1 ) {
	return { clientID, on: jest.fn(), off: jest.fn() };
}

function getOnDocUpdate( doc: ReturnType< typeof createMockDoc > ) {
	const call = doc.on.mock.calls.find(
		( args: unknown[] ) => args[ 0 ] === 'updateV2'
	);
	if ( ! call ) {
		throw new Error( 'onDocUpdate not registered' );
	}
	return call[ 1 ] as ( update: Uint8Array, origin: unknown ) => void;
}

function createMockAwareness() {
	return {
		clientID: 1,
		getLocalState: jest.fn( () => ( {} ) ),
		getStates: jest.fn( () => new Map() ),
		on: jest.fn(),
		off: jest.fn(),
		emit: jest.fn(),
	};
}

function createAwarenessState( hasCollaborators: boolean ) {
	if ( ! hasCollaborators ) {
		return {
			1: { collaboratorInfo: { id: 100 } },
		};
	}

	return {
		1: { collaboratorInfo: { id: 100 } },
		2: { collaboratorInfo: { id: 200 } },
	};
}

function createResponse(
	rooms: string[],
	{
		hasCollaborators,
		endCursor = 1,
	}: {
		hasCollaborators: boolean;
		endCursor?: number;
	}
): SyncResponse {
	return {
		rooms: rooms.map( ( room, index ) => ( {
			room,
			end_cursor: endCursor + index,
			awareness:
				room === PRIMARY_ROOM
					? createAwarenessState( hasCollaborators )
					: {},
			updates: [],
		} ) ),
	};
}

function getLastPayload(
	mockPostSyncUpdate: jest.Mock< typeof import('../utils').postSyncUpdate >
) {
	return mockPostSyncUpdate.mock.calls.at( -1 )?.[ 0 ] as
		| {
				rooms: {
					room: string;
					updates: { type: string }[];
				}[];
		  }
		| undefined;
}

describe( 'polling-manager fuzzing', () => {
	let pollingManager: PollingManager;
	let mockPostSyncUpdate: jest.Mock<
		typeof import('../utils').postSyncUpdate
	>;
	let mockPostSyncUpdateNonBlocking: jest.Mock<
		typeof import('../utils').postSyncUpdateNonBlocking
	>;

	beforeEach( () => {
		jest.useFakeTimers();

		jest.isolateModules( () => {
			pollingManager = require( '../polling-manager' ).pollingManager;
			mockPostSyncUpdate = require( '../utils' ).postSyncUpdate;
			mockPostSyncUpdateNonBlocking =
				require( '../utils' ).postSyncUpdateNonBlocking;
		} );
	} );

	afterEach( () => {
		jest.clearAllTimers();
		jest.useRealTimers();
		Object.defineProperty( document, 'visibilityState', {
			configurable: true,
			get: () => 'visible',
		} );
	} );

	it.each( SEEDS )(
		'forbidden-room-isolated-from-other-sync-rooms (seed %i)',
		async ( seed ) => {
			const rng = createSeededRandom( seed );
			const trace: string[] = [];
			const primaryDoc = createMockDoc( 1 );
			const conflictingDoc = createMockDoc( 2 );
			const collectionDoc = createMockDoc( 3 );
			const onStatusChangePrimary = jest.fn();
			const onStatusChangeConflicting = jest.fn();
			const onStatusChangeCollection = jest.fn();
			const activeRooms = new Set< string >( [
				PRIMARY_ROOM,
				CONFLICTING_ROOM,
				COLLECTION_ROOM,
			] );

			try {
				mockPostSyncUpdate.mockResolvedValueOnce(
					createResponse( [ ...activeRooms ], {
						hasCollaborators: false,
					} )
				);

				pollingManager.registerRoom( {
					room: PRIMARY_ROOM,
					doc: primaryDoc,
					awareness: createMockAwareness(),
					log: jest.fn(),
					onStatusChange: onStatusChangePrimary,
					onSync: jest.fn(),
				} );
				pollingManager.registerRoom( {
					room: CONFLICTING_ROOM,
					doc: conflictingDoc,
					awareness: createMockAwareness(),
					log: jest.fn(),
					onStatusChange: onStatusChangeConflicting,
					onSync: jest.fn(),
				} );
				pollingManager.registerRoom( {
					room: COLLECTION_ROOM,
					doc: collectionDoc,
					awareness: createMockAwareness(),
					log: jest.fn(),
					onStatusChange: onStatusChangeCollection,
					onSync: jest.fn(),
				} );

				trace.push( 'initial poll without collaborators' );
				await jest.advanceTimersByTimeAsync( 0 );

				getOnDocUpdate( collectionDoc )(
					new Uint8Array( [ seed % 255, 7 ] ),
					'local-fuzz'
				);
				getOnDocUpdate( conflictingDoc )(
					new Uint8Array( [ ( seed + 1 ) % 255, 9 ] ),
					'local-fuzz'
				);
				trace.push(
					'queued local updates for collection and conflicting rooms'
				);

				if ( rng.bool( 0.5 ) ) {
					mockPostSyncUpdate.mockRejectedValueOnce(
						new Error( `transient failure ${ seed }` )
					);
					trace.push(
						'transient network failure before collaborator detection'
					);
					await jest.advanceTimersByTimeAsync( 4000 );

					mockPostSyncUpdate.mockResolvedValueOnce(
						createResponse( [ ...activeRooms ], {
							hasCollaborators: true,
							endCursor: 10,
						} )
					);
					trace.push( 'manual retry into collaborator discovery' );
					pollingManager.retryNow();
					await jest.advanceTimersByTimeAsync( 0 );
				} else {
					mockPostSyncUpdate.mockResolvedValueOnce(
						createResponse( [ ...activeRooms ], {
							hasCollaborators: true,
							endCursor: 10,
						} )
					);
					trace.push( 'collaborator discovery on scheduled poll' );
					await jest.advanceTimersByTimeAsync( 4000 );
				}

				mockPostSyncUpdate.mockRejectedValueOnce( {
					code: 'rest_cannot_edit',
					message:
						'You do not have permission to sync this entity: postType/post:10.',
					data: { status: 403 },
				} );
				trace.push( '403 for the longer prefix-colliding room' );
				await jest.advanceTimersByTimeAsync( 1000 );

				activeRooms.delete( CONFLICTING_ROOM );
				mockPostSyncUpdate.mockResolvedValueOnce(
					createResponse( [ ...activeRooms ], {
						hasCollaborators: true,
						endCursor: 20,
					} )
				);
				trace.push( 'post-403 recovery poll for surviving rooms' );
				await jest.advanceTimersByTimeAsync( 1000 );

				const lastPayload = getLastPayload( mockPostSyncUpdate );
				expect( lastPayload ).toBeDefined();
				expect(
					lastPayload?.rooms.map( ( room ) => room.room )
				).toEqual( [ ...activeRooms ] );

				const collectionPayload = lastPayload?.rooms.find(
					( room ) => room.room === COLLECTION_ROOM
				);
				expect( collectionPayload?.updates.length ).toBeGreaterThan(
					0
				);

				expect( onStatusChangeConflicting ).not.toHaveBeenCalledWith(
					expect.objectContaining( {
						error: expect.anything(),
					} )
				);
				expect( onStatusChangePrimary ).not.toHaveBeenCalledWith(
					expect.objectContaining( {
						error: expect.anything(),
					} )
				);
				expect( onStatusChangeCollection ).not.toHaveBeenCalledWith(
					expect.objectContaining( {
						error: expect.anything(),
					} )
				);
				expect(
					mockPostSyncUpdateNonBlocking
				).not.toHaveBeenCalledWith(
					expect.objectContaining( {
						rooms: expect.arrayContaining( [
							expect.objectContaining( {
								room: CONFLICTING_ROOM,
							} ),
						] ),
					} )
				);
			} catch ( error ) {
				throw new Error(
					`Polling fuzz failed for seed ${ seed }\n${ trace.join(
						'\n'
					) }\n${
						error instanceof Error ? error.message : String( error )
					}`
				);
			} finally {
				pollingManager.unregisterRoom( PRIMARY_ROOM, {
					sendDisconnectSignal: false,
				} );
				pollingManager.unregisterRoom( CONFLICTING_ROOM, {
					sendDisconnectSignal: false,
				} );
				pollingManager.unregisterRoom( COLLECTION_ROOM, {
					sendDisconnectSignal: false,
				} );
			}
		}
	);
} );
