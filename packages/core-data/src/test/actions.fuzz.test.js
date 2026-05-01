/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import { saveEntityRecord } from '../actions';
import { getSyncManager } from '../sync';

jest.mock( '@wordpress/api-fetch' );
jest.mock( '../sync', () => ( {
	getSyncManager: jest.fn(),
	LOCAL_UNDO_IGNORED_ORIGIN: 'local-undo-ignored',
} ) );

/* eslint-disable no-bitwise */
function createSeededRandom( seed ) {
	let state = seed >>> 0;
	if ( state === 0 ) {
		state = 0x9e3779b9;
	}

	function nextUint32() {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
		value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
		return ( value ^ ( value >>> 14 ) ) >>> 0;
	}

	function next() {
		return nextUint32() / 0x100000000;
	}

	function int( maxExclusive ) {
		return maxExclusive <= 0 ? 0 : Math.floor( next() * maxExclusive );
	}

	return {
		bool( probability = 0.5 ) {
			return next() < probability;
		},
		int,
		intBetween( minInclusive, maxInclusive ) {
			return minInclusive + int( maxInclusive - minInclusive + 1 );
		},
		pick( values ) {
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

function readIntFromEnv( name ) {
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

function seededRangeFromEnv( defaultCount, defaultStart ) {
	const count = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_COUNT' ) ?? defaultCount;
	const start = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_START' ) ?? defaultStart;
	if ( count < 0 ) {
		throw new Error(
			`Expected GUTENBERG_FUZZ_SEED_COUNT to be non-negative, got "${ count }".`
		);
	}
	return Array.from( { length: count }, ( _value, index ) => start + index );
}

const FIELDS = [ 'title', 'content', 'excerpt' ];
const SEEDS = seededRangeFromEnv( 12, 11101 );

function createDispatch() {
	return Object.assign( jest.fn(), {
		receiveEntityRecords: jest.fn(),
		__unstableAcquireStoreLock: jest.fn(),
		__unstableReleaseStoreLock: jest.fn(),
	} );
}

function createPostRecord( rng, seed, prefix ) {
	const record = {
		id: seed,
		meta: { _crdt_document: `${ prefix }-crdt-${ seed }` },
		status: 'draft',
	};

	for ( const field of FIELDS ) {
		if ( rng.bool( 0.85 ) ) {
			record[ field ] = `${ prefix }-${ field }-${ rng.string( seed ) }`;
		}
	}

	return record;
}

describe( 'saveEntityRecord fuzzing', () => {
	beforeEach( () => {
		apiFetch.mockReset();
		getSyncManager.mockReset();
	} );

	it.each( SEEDS )(
		'CRDT persistence saves do not replay stale REST fields (seed %i)',
		async ( seed ) => {
			const rng = createSeededRandom( seed );
			const trace = [];
			const persistedRecord = createPostRecord( rng, seed, 'persisted' );
			const editedRecord = {
				...persistedRecord,
				...createPostRecord( rng, seed, 'synced' ),
				id: persistedRecord.id,
			};
			const staleSaveResponse = {
				...editedRecord,
				...createPostRecord( rng, seed, 'stale-response' ),
				id: persistedRecord.id,
			};
			const liveSyncState = {};

			for ( const field of FIELDS ) {
				liveSyncState[ field ] = editedRecord[ field ];
			}
			liveSyncState.isSaved = false;

			const syncManager = {
				update: jest.fn(
					( _objectType, _objectId, changes, _origin, options ) => {
						for ( const field of FIELDS ) {
							if (
								Object.prototype.hasOwnProperty.call(
									changes,
									field
								)
							) {
								liveSyncState[ field ] = changes[ field ];
							}
						}

						if ( options?.isSave ) {
							liveSyncState.isSaved = true;
						}
					}
				),
			};
			const dispatch = createDispatch();
			const select = {
				getRawEntityRecord: () => persistedRecord,
			};
			const resolveSelect = {
				getEntitiesConfig: jest.fn( () => [
					{
						baseURL: '/wp/v2/posts',
						kind: 'postType',
						name: 'post',
						syncConfig: {},
					},
				] ),
			};

			apiFetch.mockImplementation( ( request ) => {
				trace.push(
					`${ request.method } ${ request.path } ${ JSON.stringify(
						request.data
					) }`
				);
				return staleSaveResponse;
			} );
			getSyncManager.mockReturnValue( syncManager );

			try {
				await saveEntityRecord( 'postType', 'post', editedRecord, {
					__unstableSkipSyncUpdate: true,
				} )( { select, dispatch, resolveSelect } );

				expect( syncManager.update ).toHaveBeenCalledWith(
					'postType/post',
					persistedRecord.id,
					{},
					'local-undo-ignored',
					{ isSave: true }
				);
				expect( liveSyncState ).toEqual( {
					content: editedRecord.content,
					excerpt: editedRecord.excerpt,
					isSaved: true,
					title: editedRecord.title,
				} );
			} catch ( error ) {
				throw new Error(
					`saveEntityRecord persistence fuzz failed for seed ${ seed }\n${ trace.join(
						'\n'
					) }\nLive sync: ${ JSON.stringify(
						liveSyncState
					) }\nEdited: ${ JSON.stringify(
						editedRecord
					) }\nStale response: ${ JSON.stringify(
						staleSaveResponse
					) }\n${
						error instanceof Error ? error.message : String( error )
					}`
				);
			}
		}
	);
} );
