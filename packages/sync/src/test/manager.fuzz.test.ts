/**
 * External dependencies
 */
import * as Y from 'yjs';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';

/**
 * Internal dependencies
 */
import {
	CRDT_RECORD_MAP_KEY,
	CRDT_STATE_MAP_KEY,
	CRDT_STATE_MAP_SAVED_AT_KEY as SAVED_AT_KEY,
	LOCAL_SYNC_MANAGER_ORIGIN,
} from '../config';
import { createSyncManager } from '../manager';
import { getProviderCreators } from '../providers';
import type {
	CollectionHandlers,
	ObjectData,
	ProviderCreatorResult,
	RecordHandlers,
	SyncConfig,
} from '../types';
import { deserializeCrdtDoc } from '../utils';

interface SeededRandom {
	bool: ( probability?: number ) => boolean;
	intBetween: ( minInclusive: number, maxInclusive: number ) => number;
	pick: < T >( values: readonly T[] ) => T;
	string: ( prefix?: string ) => string;
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

	function next(): number {
		return nextUint32() / 0x100000000;
	}

	function int( maxExclusive: number ): number {
		if ( maxExclusive <= 0 ) {
			return 0;
		}

		return Math.floor( next() * maxExclusive );
	}

	return {
		bool( probability = 0.5 ) {
			return next() < probability;
		},
		intBetween( minInclusive, maxInclusive ) {
			return minInclusive + int( maxInclusive - minInclusive + 1 );
		},
		pick< T >( values: readonly T[] ): T {
			if ( values.length === 0 ) {
				throw new Error( 'Cannot pick from an empty array.' );
			}

			return values[ int( values.length ) ];
		},
		string( prefix = 'seed' ) {
			return `${ prefix }-${ nextUint32().toString( 36 ) }`;
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

function intFromEnv(
	name: string,
	defaultValue: number,
	options: {
		min?: number;
	} = {}
): number {
	const value = readIntFromEnv( name ) ?? defaultValue;

	if ( options.min !== undefined && value < options.min ) {
		throw new Error(
			`Expected ${ name } to be >= ${ options.min }, got "${ value }".`
		);
	}

	return value;
}

jest.mock( '../providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

const mockGetProviderCreators = jest.mocked( getProviderCreators );

type EntityKey = 'a' | 'b';
type FieldKey = 'content' | 'title';
type TestRecord = {
	content: string;
	id: string;
	meta: {
		_crdt_document?: string | null;
	};
	title: string;
} & ObjectData;

const ENTITY_IDS: Record< EntityKey, string > = {
	a: '101',
	b: '202',
};
const ENTITY_KEYS = Object.keys( ENTITY_IDS ) as EntityKey[];
const FIELDS: FieldKey[] = [ 'title', 'content' ];
const OBJECT_TYPE = 'postType/post';
const SEEDS = seededRangeFromEnv( 8, 601 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_MANAGER_STEPS', 14, {
	min: 1,
} );

function cloneRecord< T >( value: T ): T {
	return JSON.parse( JSON.stringify( value ) ) as T;
}

function flushAsyncWork(): Promise< void > {
	return new Promise( ( resolve ) => {
		setTimeout( () => {
			setTimeout( resolve, 0 );
		}, 0 );
	} );
}

function normalizeRecord( record: TestRecord ) {
	return {
		content: record.content,
		title: record.title,
	};
}

function getDocSnapshot( ydoc: Y.Doc ) {
	const recordMap = ydoc.getMap( CRDT_RECORD_MAP_KEY );

	return {
		content: String( recordMap.get( 'content' ) ?? '' ),
		title: String( recordMap.get( 'title' ) ?? '' ),
	};
}

function getPersistedSnapshot( serialized: string | null ) {
	if ( ! serialized ) {
		throw new Error( 'Expected a persisted CRDT document.' );
	}

	const ydoc = deserializeCrdtDoc( serialized );

	if ( ! ydoc ) {
		throw new Error( 'Failed to deserialize persisted CRDT document.' );
	}

	try {
		return getDocSnapshot( ydoc );
	} finally {
		ydoc.destroy();
	}
}

function createRemoteSavedAtUpdate( savedAt: number ) {
	const remoteDoc = new Y.Doc();
	remoteDoc.getMap( CRDT_STATE_MAP_KEY ).set( SAVED_AT_KEY, savedAt );
	const update = Y.encodeStateAsUpdateV2( remoteDoc );
	remoteDoc.destroy();
	return update;
}

function assertDefined< T >(
	value: T | null | undefined,
	message: string
): NonNullable< T > {
	if ( value === null || value === undefined ) {
		throw new Error( message );
	}

	return value as NonNullable< T >;
}

type YDocTransactSpy = jest.SpiedFunction< Y.Doc[ 'transact' ] >;

function assertPersistedSnapshot(
	persistedSnapshot: ReturnType< typeof getPersistedSnapshot > | null,
	expectedSnapshot: ReturnType< typeof getDocSnapshot >,
	isSave: boolean
) {
	expect( persistedSnapshot ).toEqual( isSave ? expectedSnapshot : null );
}

function assertRefetchCount( refetchCallCount: number, expectedCount: number ) {
	expect( refetchCallCount ).toBe( expectedCount );
}

function assertUnloadState( {
	activeCollectionTransactSpy,
	beforeTransactCalls,
	nextSavedAt,
	persistedDoc,
}: {
	activeCollectionTransactSpy: YDocTransactSpy;
	beforeTransactCalls: number;
	nextSavedAt: unknown;
	persistedDoc: string | null;
} ) {
	expect( persistedDoc ).toBeNull();
	expect( activeCollectionTransactSpy.mock.calls.length ).toBeGreaterThan(
		beforeTransactCalls
	);
	expect( activeCollectionTransactSpy.mock.calls.at( -1 )?.[ 1 ] ).toBe(
		LOCAL_SYNC_MANAGER_ORIGIN
	);
	expect( typeof nextSavedAt ).toBe( 'number' );
}

describe( 'SyncManager fuzzing', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	afterEach( () => {
		jest.restoreAllMocks();
	} );

	it.each( SEEDS )(
		'preserves entity isolation and persistence invariants (seed %i)',
		async ( seed ) => {
			const rng = createSeededRandom( seed );
			const trace: string[] = [];
			const records: Record< EntityKey, TestRecord > = {
				a: {
					id: ENTITY_IDS.a,
					title: 'Seed A title',
					content: 'Seed A content',
					meta: {},
				},
				b: {
					id: ENTITY_IDS.b,
					title: 'Seed B title',
					content: 'Seed B content',
					meta: {},
				},
			};
			const expected = {
				a: normalizeRecord( records.a ),
				b: normalizeRecord( records.b ),
			};
			const entityDocs = new Map< EntityKey, Y.Doc >();
			const loaded = new Set< EntityKey >();
			const observedProviderUpdates: Array< {
				byteLength: number;
				objectId: string | null;
				origin: unknown;
			} > = [];
			let collectionDoc: Y.Doc | null = null;
			let collectionTransactSpy: YDocTransactSpy | undefined;

			const collectionHandlers: CollectionHandlers = {
				onStatusChange: jest.fn(),
				refetchRecords: jest.fn( async () => Promise.resolve() ),
			};

			const recordHandlers = ENTITY_KEYS.reduce(
				( acc, key ) => ( {
					...acc,
					[ key ]: {
						addUndoMeta: jest.fn(),
						editRecord: jest.fn(
							( changes: Partial< ObjectData > ) => {
								Object.assign( records[ key ], changes );
							}
						),
						getEditedRecord: jest.fn( async () =>
							Promise.resolve( cloneRecord( records[ key ] ) )
						),
						onStatusChange: jest.fn(),
						persistCRDTDoc: jest.fn(),
						refetchRecord: jest.fn( async () => Promise.resolve() ),
						restoreUndoMeta: jest.fn(),
					} satisfies RecordHandlers,
				} ),
				{} as Record< EntityKey, RecordHandlers >
			);

			const syncConfig: SyncConfig = {
				applyChangesToCRDTDoc: jest.fn(
					( ydoc: Y.Doc, changes: Partial< ObjectData > ) => {
						const recordMap = ydoc.getMap( CRDT_RECORD_MAP_KEY );

						for ( const field of FIELDS ) {
							if ( field in changes ) {
								recordMap.set( field, changes[ field ] );
							}
						}
					}
				),
				getChangesFromCRDTDoc: jest.fn(
					( ydoc: Y.Doc, editedRecord: ObjectData ) => {
						const snapshot = getDocSnapshot( ydoc );
						const changes: ObjectData = {};

						for ( const field of FIELDS ) {
							if ( editedRecord[ field ] !== snapshot[ field ] ) {
								changes[ field ] = snapshot[ field ];
							}
						}

						return changes;
					}
				),
				getPersistedCRDTDoc: jest.fn(
					( record: ObjectData ) =>
						( record as TestRecord ).meta?._crdt_document ?? null
				),
			};

			const providerCreator = jest.fn(
				async ( {
					objectId,
					ydoc,
				}: {
					objectId: string | null;
					ydoc: Y.Doc;
				} ): Promise< ProviderCreatorResult > => {
					const onUpdate = (
						update: Uint8Array,
						origin: unknown
					) => {
						observedProviderUpdates.push( {
							byteLength: update.byteLength,
							objectId,
							origin,
						} );
					};

					ydoc.on( 'updateV2', onUpdate );

					if ( objectId === null ) {
						collectionDoc = ydoc;
						collectionTransactSpy = jest.spyOn(
							collectionDoc,
							'transact'
						);
					} else {
						const key = ENTITY_KEYS.find(
							( entityKey ) =>
								ENTITY_IDS[ entityKey ] === objectId
						);

						if ( ! key ) {
							throw new Error(
								`Unexpected objectId ${ objectId } in provider creator.`
							);
						}

						entityDocs.set( key, ydoc );
					}

					return {
						destroy: jest.fn( () => {
							ydoc.off( 'updateV2', onUpdate );

							if ( objectId === null ) {
								collectionDoc = null;
								collectionTransactSpy?.mockRestore();
								collectionTransactSpy = undefined;
								return;
							}

							const key = ENTITY_KEYS.find(
								( entityKey ) =>
									ENTITY_IDS[ entityKey ] === objectId
							);

							if ( key ) {
								entityDocs.delete( key );
								loaded.delete( key );
							}
						} ),
						on: jest.fn(),
					};
				}
			);

			mockGetProviderCreators.mockReturnValue( [ providerCreator ] );

			const manager = createSyncManager();

			async function loadEntity( key: EntityKey ) {
				if ( loaded.has( key ) ) {
					return;
				}

				await manager.load(
					syncConfig,
					OBJECT_TYPE,
					ENTITY_IDS[ key ],
					records[ key ],
					recordHandlers[ key ]
				);
				loaded.add( key );
				await flushAsyncWork();
			}

			function isStateSettled() {
				for ( const key of ENTITY_KEYS ) {
					if (
						JSON.stringify( normalizeRecord( records[ key ] ) ) !==
						JSON.stringify( expected[ key ] )
					) {
						return false;
					}

					if ( ! loaded.has( key ) ) {
						continue;
					}

					const ydoc = entityDocs.get( key );

					if ( ! ydoc ) {
						return false;
					}

					if (
						JSON.stringify( getDocSnapshot( ydoc ) ) !==
						JSON.stringify( expected[ key ] )
					) {
						return false;
					}

					if (
						0 !==
						Object.keys(
							syncConfig.getChangesFromCRDTDoc(
								ydoc,
								records[ key ]
							)
						).length
					) {
						return false;
					}
				}

				return true;
			}

			function getEntityDoc( key: EntityKey ): Y.Doc {
				const ydoc = entityDocs.get( key );

				if ( ! ydoc ) {
					throw new Error( `Missing Y.Doc for entity ${ key }.` );
				}

				return ydoc;
			}

			function assertLoadedEntityMatches( key: EntityKey ) {
				expect( normalizeRecord( records[ key ] ) ).toEqual(
					expected[ key ]
				);

				if ( ! loaded.has( key ) ) {
					return;
				}

				const ydoc = getEntityDoc( key );
				expect( getDocSnapshot( ydoc ) ).toEqual( expected[ key ] );
				expect(
					syncConfig.getChangesFromCRDTDoc( ydoc, records[ key ] )
				).toEqual( {} );
			}

			function assertNoLargeOutboundLikeProviderUpdates() {
				const largeOutboundLikeUpdates = observedProviderUpdates.filter(
					( update ) =>
						update.objectId !== null &&
						update.byteLength > 64 &&
						update.origin == null
				);

				expect( largeOutboundLikeUpdates ).toEqual( [] );
			}

			async function waitForSettledState() {
				for ( let attempt = 0; attempt < 8; attempt++ ) {
					if ( isStateSettled() ) {
						return;
					}

					await flushAsyncWork();
				}

				for ( const key of ENTITY_KEYS ) {
					assertLoadedEntityMatches( key );
				}
			}

			try {
				await manager.loadCollection(
					syncConfig,
					OBJECT_TYPE,
					collectionHandlers
				);
				await loadEntity( 'a' );
				await loadEntity( 'b' );

				for ( let step = 0; step < STEP_COUNT; step++ ) {
					const action = rng.pick( [
						'local-update',
						'persisted-reload',
						'collection-remote-save',
						'unload',
					] as const );

					switch ( action ) {
						case 'local-update': {
							const key = rng.pick( ENTITY_KEYS );
							const field = rng.pick( FIELDS );
							const isLargeValue = rng.bool( 0.35 );
							const value = `${ field }-${ seed }-${ step }-${ rng.string(
								key
							) }${
								isLargeValue
									? `-${ 'x'.repeat(
											rng.intBetween( 128, 512 )
									  ) }`
									: ''
							}`;
							const isSave = rng.bool( 0.4 );

							await loadEntity( key );
							records[ key ][ field ] = value;
							expected[ key ][ field ] = value;
							trace.push(
								`${ step }: local ${ key }.${ field } -> ${ JSON.stringify(
									value
								) }${ isLargeValue ? ' [large]' : '' }${
									isSave ? ' [save]' : ''
								}`
							);

							manager.update(
								OBJECT_TYPE,
								ENTITY_IDS[ key ],
								{ [ field ]: value },
								`fuzz-local-${ step }`,
								{
									isNewUndoLevel: rng.bool( 0.3 ),
									isSave,
								}
							);
							await flushAsyncWork();

							let persistedSnapshot: ReturnType<
								typeof getPersistedSnapshot
							> | null = null;
							if ( isSave ) {
								records[ key ].meta._crdt_document =
									await manager.createPersistedCRDTDoc(
										OBJECT_TYPE,
										ENTITY_IDS[ key ]
									);
								persistedSnapshot = getPersistedSnapshot(
									records[ key ].meta._crdt_document ?? null
								);
							}
							assertPersistedSnapshot(
								persistedSnapshot,
								expected[ key ],
								isSave
							);
							break;
						}

						case 'persisted-reload': {
							const key = rng.pick( ENTITY_KEYS );
							const shouldInvalidate = rng.bool( 0.5 );

							await loadEntity( key );
							records[ key ].meta._crdt_document =
								await manager.createPersistedCRDTDoc(
									OBJECT_TYPE,
									ENTITY_IDS[ key ]
								);
							trace.push(
								`${ step }: persist and reload ${ key }`
							);

							manager.unload( OBJECT_TYPE, ENTITY_IDS[ key ] );
							await flushAsyncWork();

							if ( shouldInvalidate ) {
								const field = rng.pick( FIELDS );
								const value = `${ field }-invalidated-${ seed }-${ step }-${ rng.string(
									key
								) }`;

								records[ key ][ field ] = value;
								expected[ key ][ field ] = value;
								trace.push(
									`${ step }: invalidate persisted ${ key }.${ field } -> ${ JSON.stringify(
										value
									) }`
								);
							}

							await loadEntity( key );
							break;
						}

						case 'collection-remote-save': {
							const before = (
								collectionHandlers.refetchRecords as jest.Mock
							 ).mock.calls.length;
							const activeCollectionDoc: Y.Doc = assertDefined(
								collectionDoc,
								'Expected collection Y.Doc to be loaded.'
							);

							const savedAt = Date.now() + 60_000 + seed + step;
							trace.push(
								`${ step }: collection remote save marker -> ${ savedAt }`
							);
							Y.applyUpdateV2(
								activeCollectionDoc,
								createRemoteSavedAtUpdate( savedAt )
							);
							await flushAsyncWork();
							const refetchCallCount = (
								collectionHandlers.refetchRecords as jest.Mock
							 ).mock.calls.length;
							assertRefetchCount( refetchCallCount, before + 1 );
							break;
						}

						case 'unload': {
							const key = rng.pick( ENTITY_KEYS );
							const beforeTransactCalls =
								collectionTransactSpy?.mock.calls.length ?? 0;

							await loadEntity( key );
							trace.push( `${ step }: unload ${ key }` );
							manager.unload( OBJECT_TYPE, ENTITY_IDS[ key ] );
							await flushAsyncWork();
							const persistedDoc =
								await manager.createPersistedCRDTDoc(
									OBJECT_TYPE,
									ENTITY_IDS[ key ]
								);
							const activeCollectionDoc: Y.Doc = assertDefined(
								collectionDoc,
								'Expected collection Y.Doc during unload.'
							);
							const activeCollectionTransactSpy: YDocTransactSpy =
								assertDefined(
									collectionTransactSpy,
									'Expected collection transact spy during unload.'
								);

							const nextSavedAt = activeCollectionDoc
								.getMap( CRDT_STATE_MAP_KEY )
								.get( SAVED_AT_KEY );
							assertUnloadState( {
								activeCollectionTransactSpy,
								beforeTransactCalls,
								nextSavedAt,
								persistedDoc,
							} );
							break;
						}
					}

					await waitForSettledState();
					assertNoLargeOutboundLikeProviderUpdates();
				}

				for ( const key of ENTITY_KEYS ) {
					await loadEntity( key );
					const serialized = await manager.createPersistedCRDTDoc(
						OBJECT_TYPE,
						ENTITY_IDS[ key ]
					);

					expect( getPersistedSnapshot( serialized ) ).toEqual(
						expected[ key ]
					);
				}
				assertNoLargeOutboundLikeProviderUpdates();
			} catch ( error ) {
				throw new Error(
					`SyncManager fuzz failed for seed ${ seed }\n${ trace.join(
						'\n'
					) }\nObserved provider updates: ${ JSON.stringify(
						observedProviderUpdates
					) }\n${
						error instanceof Error ? error.message : String( error )
					}`
				);
			}
		}
	);
} );
