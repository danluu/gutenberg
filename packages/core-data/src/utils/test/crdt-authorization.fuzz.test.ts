/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * Internal dependencies
 */
import {
	applyPostChangesToCRDTDoc,
	getPostChangesFromCRDTDoc,
	type PostChanges,
} from '../crdt';
import type { Post } from '../../entity-types';

jest.mock( '@wordpress/data', () => ( {
	dispatch: jest.fn( () => ( { resetSelection: jest.fn() } ) ),
	select: jest.fn( () => ( { getBlock: jest.fn( () => null ) } ) ),
	// Needed because @wordpress/rich-text initialises its store at import time.
	combineReducers: jest.fn( () => jest.fn( () => ( {} ) ) ),
	createReduxStore: jest.fn( () => ( {} ) ),
	register: jest.fn(),
	createSelector: ( selector: unknown ) => selector,
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: jest.fn( ( blocks ) =>
		JSON.stringify( blocks )
	),
	getBlockTypes: jest.fn( () => [] ),
	isUnmodifiedBlock: jest.fn( () => false ),
} ) );

interface SeededRandom {
	bool: ( probability?: number ) => boolean;
	int: ( maxExclusive: number ) => number;
	intBetween: ( minInclusive: number, maxInclusive: number ) => number;
	pick: < T >( values: readonly T[] ) => T;
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
		int,
		intBetween( minInclusive, maxInclusive ) {
			return minInclusive + int( maxInclusive - minInclusive + 1 );
		},
		pick< T >( values: readonly T[] ): T {
			if ( values.length === 0 ) {
				throw new Error( 'Cannot pick from an empty array.' );
			}

			return values[ int( values.length ) ];
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

type ActorKey = 'privileged' | 'limited';
type MetaKey = '_workflow_locked' | 'review_score' | 'sponsor_id';
type TopLevelField =
	| 'author'
	| 'categories'
	| 'comment_status'
	| 'content'
	| 'date'
	| 'excerpt'
	| 'featured_media'
	| 'format'
	| 'genre'
	| 'ping_status'
	| 'slug'
	| 'status'
	| 'sticky'
	| 'tags'
	| 'template'
	| 'title';
type FieldPath = TopLevelField | `meta.${ MetaKey }`;

interface CapabilityProfile {
	label: string;
	directlyWritablePaths: Set< FieldPath >;
}

interface MutationTarget {
	path: FieldPath;
	weight: number;
}

type TestPostRecord = {
	author: number;
	categories: number[];
	comment_status: string;
	content: string;
	date: string;
	excerpt: string;
	featured_media: number;
	format: string;
	genre: number[];
	id: number;
	meta: Record< MetaKey, boolean | number | string >;
	modified: string;
	ping_status: string;
	slug: string;
	status: string;
	sticky: boolean;
	tags: number[];
	template: string;
	title: string;
};

const SEEDS = seededRangeFromEnv( 8, 1901 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_AUTHZ_STEPS', 16, {
	min: 1,
} );

const syncedProperties = new Set< string >( [
	'author',
	'categories',
	'comment_status',
	'content',
	'date',
	'excerpt',
	'featured_media',
	'format',
	'genre',
	'meta',
	'ping_status',
	'slug',
	'status',
	'sticky',
	'tags',
	'template',
	'title',
] );

const BASE_DIRECT_WRITE_PATHS: FieldPath[] = [
	'content',
	'excerpt',
	'slug',
	'title',
];

const PRIVILEGED_DIRECT_WRITE_PATHS: FieldPath[] = [
	...BASE_DIRECT_WRITE_PATHS,
	'author',
	'categories',
	'comment_status',
	'date',
	'featured_media',
	'format',
	'genre',
	'meta._workflow_locked',
	'meta.review_score',
	'meta.sponsor_id',
	'ping_status',
	'status',
	'sticky',
	'tags',
	'template',
];

const MUTATION_TARGETS: MutationTarget[] = [
	{ path: 'title', weight: 4 },
	{ path: 'content', weight: 4 },
	{ path: 'excerpt', weight: 2 },
	{ path: 'slug', weight: 2 },
	{ path: 'author', weight: 5 },
	{ path: 'status', weight: 5 },
	{ path: 'date', weight: 3 },
	{ path: 'featured_media', weight: 3 },
	{ path: 'sticky', weight: 3 },
	{ path: 'comment_status', weight: 2 },
	{ path: 'ping_status', weight: 2 },
	{ path: 'format', weight: 2 },
	{ path: 'template', weight: 2 },
	{ path: 'categories', weight: 4 },
	{ path: 'tags', weight: 4 },
	{ path: 'genre', weight: 4 },
	{ path: 'meta._workflow_locked', weight: 5 },
	{ path: 'meta.review_score', weight: 5 },
	{ path: 'meta.sponsor_id', weight: 5 },
];

function cloneRecord< T >( record: T ): T {
	return JSON.parse( JSON.stringify( record ) ) as T;
}

function createInitialRecord(): TestPostRecord {
	return {
		author: 1,
		categories: [ 11 ],
		comment_status: 'open',
		content: 'Initial collaborative content',
		date: '2026-03-01T10:00:00',
		excerpt: 'Initial excerpt',
		featured_media: 31,
		format: 'standard',
		genre: [ 41 ],
		id: 101,
		meta: {
			_workflow_locked: false,
			review_score: 10,
			sponsor_id: 51,
		},
		modified: '2026-03-02T10:00:00',
		ping_status: 'open',
		slug: 'initial-collaborative-post',
		status: 'draft',
		sticky: false,
		tags: [ 21 ],
		template: '',
		title: 'Initial title',
	};
}

function createProfiles(
	rng: SeededRandom
): Record< ActorKey, CapabilityProfile > {
	const limitedWritable = new Set< FieldPath >( BASE_DIRECT_WRITE_PATHS );

	if ( rng.bool( 0.35 ) ) {
		limitedWritable.add( 'comment_status' );
	}

	if ( rng.bool( 0.35 ) ) {
		limitedWritable.add( 'ping_status' );
	}

	if ( rng.bool( 0.25 ) ) {
		limitedWritable.add( 'format' );
	}

	return {
		limited: {
			directlyWritablePaths: limitedWritable,
			label: 'limited collaborator',
		},
		privileged: {
			directlyWritablePaths: new Set( PRIVILEGED_DIRECT_WRITE_PATHS ),
			label: 'privileged collaborator',
		},
	};
}

function pickWeightedMutationTarget(
	rng: SeededRandom,
	targets: readonly MutationTarget[]
): MutationTarget {
	const totalWeight = targets.reduce(
		( total, target ) => total + target.weight,
		0
	);
	let cursor = rng.intBetween( 1, totalWeight );

	for ( const target of targets ) {
		cursor -= target.weight;

		if ( cursor <= 0 ) {
			return target;
		}
	}

	return targets[ targets.length - 1 ];
}

function mutatePath(
	record: TestPostRecord,
	path: FieldPath,
	seed: number,
	step: number,
	rng: SeededRandom
): Partial< PostChanges > {
	const token = `${ seed }-${ step }-${ rng.intBetween( 1, 1000 ) }`;

	switch ( path ) {
		case 'author':
			return { author: rng.intBetween( 2, 25 ) };

		case 'categories':
		case 'tags':
		case 'genre':
			return {
				[ path ]: [ rng.intBetween( 1, 20 ), rng.intBetween( 21, 40 ) ],
			} as Partial< PostChanges >;

		case 'comment_status':
		case 'ping_status':
			return { [ path ]: rng.pick( [ 'open', 'closed' ] ) };

		case 'content':
		case 'excerpt':
		case 'title':
			return {
				[ path ]: `${ record[ path ] } ${ path }-${ token }`,
			};

		case 'date':
			return {
				date: `2026-03-${ rng
					.intBetween( 3, 28 )
					.toString()
					.padStart( 2, '0' ) }T${ rng
					.intBetween( 0, 23 )
					.toString()
					.padStart( 2, '0' ) }:00:00`,
			};

		case 'featured_media':
			return { featured_media: rng.intBetween( 100, 200 ) };

		case 'format':
			return {
				format: rng.pick( [ 'aside', 'gallery', 'quote', 'standard' ] ),
			};

		case 'slug':
			return { slug: `slug-${ token }` };

		case 'status':
			return {
				status: rng.pick( [
					'draft',
					'future',
					'pending',
					'private',
					'publish',
				] ),
			};

		case 'sticky':
			return { sticky: ! record.sticky };

		case 'template':
			return {
				template: rng.pick( [ '', 'full-width', 'landing' ] ),
			};

		case 'meta._workflow_locked':
			return {
				meta: {
					_workflow_locked: ! record.meta._workflow_locked,
				},
			};

		case 'meta.review_score':
			return {
				meta: {
					review_score: rng.intBetween( 1, 100 ),
				},
			};

		case 'meta.sponsor_id':
			return {
				meta: {
					sponsor_id: `sponsor-${ token }`,
				},
			};
	}
}

function applyChangesToRecord(
	record: TestPostRecord,
	changes: Partial< PostChanges >
) {
	for ( const [ key, value ] of Object.entries( changes ) ) {
		if ( key === 'meta' ) {
			record.meta = {
				...record.meta,
				...( value as TestPostRecord[ 'meta' ] ),
			};
			continue;
		}

		( record as unknown as Record< string, unknown > )[ key ] = value;
	}
}

function hasChanged( before: unknown, after: unknown ): boolean {
	return JSON.stringify( before ) !== JSON.stringify( after );
}

function getChangedPaths(
	recordBeforeChanges: TestPostRecord,
	changes: Partial< PostChanges >
): FieldPath[] {
	const paths: FieldPath[] = [];

	for ( const [ key, value ] of Object.entries( changes ) ) {
		if ( key === 'meta' ) {
			const metaChanges = value as Partial< TestPostRecord[ 'meta' ] >;

			for ( const metaKey of Object.keys( metaChanges ) as MetaKey[] ) {
				if (
					hasChanged(
						recordBeforeChanges.meta[ metaKey ],
						metaChanges[ metaKey ]
					)
				) {
					paths.push( `meta.${ metaKey }` );
				}
			}

			continue;
		}

		if (
			hasChanged(
				( recordBeforeChanges as unknown as Record< string, unknown > )[
					key
				],
				value
			)
		) {
			paths.push( key as TopLevelField );
		}
	}

	return paths;
}

function canDirectlyWrite(
	profile: CapabilityProfile,
	path: FieldPath
): boolean {
	return profile.directlyWritablePaths.has( path );
}

function runAuthorizationScenario( seed: number ) {
	const rng = createSeededRandom( seed );
	const profiles = createProfiles( rng );
	const records: Record< ActorKey, TestPostRecord > = {
		limited: createInitialRecord(),
		privileged: createInitialRecord(),
	};
	const docs: Record< ActorKey, Y.Doc > = {
		limited: new Y.Doc(),
		privileged: new Y.Doc(),
	};
	const trace: string[] = [];
	const escalationCandidates: string[] = [];
	const escalatedPaths = new Set< FieldPath >();

	try {
		applyPostChangesToCRDTDoc(
			docs.privileged,
			cloneRecord( records.privileged ) as PostChanges,
			syncedProperties
		);
		Y.applyUpdateV2(
			docs.limited,
			Y.encodeStateAsUpdateV2( docs.privileged )
		);

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			const sourceKey: ActorKey = rng.bool( 0.65 )
				? 'limited'
				: 'privileged';
			const targetKey: ActorKey =
				sourceKey === 'limited' ? 'privileged' : 'limited';
			const sourceProfile = profiles[ sourceKey ];
			const targetProfile = profiles[ targetKey ];
			const target = pickWeightedMutationTarget( rng, MUTATION_TARGETS );
			const changes = mutatePath(
				records[ sourceKey ],
				target.path,
				seed,
				step,
				rng
			);

			trace.push(
				`${ step }: ${ sourceProfile.label } mutates ${
					target.path
				} -> ${ JSON.stringify( changes ) }`
			);

			applyChangesToRecord( records[ sourceKey ], changes );
			applyPostChangesToCRDTDoc(
				docs[ sourceKey ],
				changes,
				syncedProperties
			);

			const update = Y.encodeStateAsUpdateV2(
				docs[ sourceKey ],
				Y.encodeStateVector( docs[ targetKey ] )
			);
			Y.applyUpdateV2( docs[ targetKey ], update );

			const targetRecordBeforeChanges = cloneRecord(
				records[ targetKey ]
			);
			const receivedChanges = getPostChangesFromCRDTDoc(
				docs[ targetKey ],
				records[ targetKey ] as unknown as Post,
				syncedProperties
			);
			const changedPaths = getChangedPaths(
				targetRecordBeforeChanges,
				receivedChanges
			);
			const unauthorizedPaths = changedPaths.filter(
				( path ) =>
					! canDirectlyWrite( sourceProfile, path ) &&
					canDirectlyWrite( targetProfile, path )
			);

			for ( const path of unauthorizedPaths ) {
				escalatedPaths.add( path );
				escalationCandidates.push(
					`${ step }: ${
						sourceProfile.label
					} cannot directly save ${ path }, but ${
						targetProfile.label
					} would dirty it via ${ JSON.stringify( receivedChanges ) }`
				);
			}

			applyChangesToRecord( records[ targetKey ], receivedChanges );
		}

		expect( escalationCandidates ).toEqual( [] );
	} catch ( error ) {
		throw new Error(
			`RTC CRDT authorization fuzz failed for seed ${ seed }\n` +
				`Escalated paths: ${ JSON.stringify(
					Array.from( escalatedPaths ).sort()
				) }\n` +
				`Trace:\n${ trace.join( '\n' ) }\n` +
				`Privilege escalation candidates:\n${ escalationCandidates.join(
					'\n'
				) }\n` +
				`${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		docs.limited.destroy();
		docs.privileged.destroy();
	}
}

describe( 'CRDT authorization fuzzing', () => {
	it.each( SEEDS )(
		'does not turn lower-privilege remote edits into privileged save payloads (seed %i)',
		( seed ) => {
			runAuthorizationScenario( seed );
		}
	);
} );
