/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type PostChanges } from '../crdt';
import { getRootMap } from '../crdt-utils';
import {
	createSeededRandom,
	intFromEnv,
	seededRangeFromEnv,
} from './seeded-rng';

type TextField = 'content' | 'excerpt' | 'title';
type PendingUpdate = {
	source: 'a' | 'b';
	update: Uint8Array;
};

const FIELDS: TextField[] = [ 'title', 'content', 'excerpt' ];
const INITIAL_SYNC_ORIGIN = 'initial-sync';
const REMOTE_SYNC_ORIGIN = 'remote-sync';
const syncedProperties = new Set< string >( FIELDS );
const SEEDS = seededRangeFromEnv( 12, 101 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_CRDT_STEPS', 18, {
	min: 1,
} );

function getFieldValue( doc: Y.Doc, field: TextField ): string {
	return (
		getRootMap( doc, CRDT_RECORD_MAP_KEY ).get( field )?.toString() ?? ''
	);
}

function captureLocalUpdates(
	doc: Y.Doc,
	source: PendingUpdate[ 'source' ],
	pendingUpdates: PendingUpdate[]
) {
	doc.on( 'updateV2', ( update: Uint8Array, origin: unknown ) => {
		if ( origin === INITIAL_SYNC_ORIGIN || origin === REMOTE_SYNC_ORIGIN ) {
			return;
		}

		pendingUpdates.push( {
			source,
			update,
		} );
	} );
}

function mutateText(
	currentValue: string,
	rng: ReturnType< typeof createSeededRandom >
): string {
	const operation = rng.pick( [ 'insert', 'delete', 'replace' ] as const );
	const token = `${ rng.pick( [
		'alpha',
		'beta',
		'gamma',
		'emoji',
	] ) }-${ rng.intBetween( 0, 999 ) }${ rng.bool( 0.2 ) ? 'é' : '' }`;

	if ( currentValue.length === 0 || operation === 'insert' ) {
		const insertAt = rng.intBetween( 0, currentValue.length );
		return (
			currentValue.slice( 0, insertAt ) +
			token +
			currentValue.slice( insertAt )
		);
	}

	if ( operation === 'delete' ) {
		const start = rng.int( currentValue.length );
		const end = rng.intBetween( start + 1, currentValue.length );
		return currentValue.slice( 0, start ) + currentValue.slice( end );
	}

	const start = rng.int( currentValue.length );
	const end = rng.intBetween( start + 1, currentValue.length );
	return currentValue.slice( 0, start ) + token + currentValue.slice( end );
}

function flushPendingUpdates(
	docA: Y.Doc,
	docB: Y.Doc,
	pendingUpdates: PendingUpdate[],
	rng: ReturnType< typeof createSeededRandom >,
	trace: string[]
) {
	while ( pendingUpdates.length > 0 ) {
		const updateIndex = rng.int( pendingUpdates.length );
		const [ entry ] = pendingUpdates.splice( updateIndex, 1 );
		const targetDoc = entry.source === 'a' ? docB : docA;

		trace.push(
			`deliver ${ entry.source } -> ${ entry.source === 'a' ? 'b' : 'a' }`
		);
		Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );

		if ( rng.bool( 0.25 ) ) {
			trace.push(
				`replay ${ entry.source } -> ${
					entry.source === 'a' ? 'b' : 'a'
				}`
			);
			Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );
		}
	}
}

function runScenario( seed: number ) {
	const rng = createSeededRandom( seed );
	const trace: string[] = [];
	const pendingUpdates: PendingUpdate[] = [];
	const docA = new Y.Doc();
	const docB = new Y.Doc();

	try {
		captureLocalUpdates( docA, 'a', pendingUpdates );
		captureLocalUpdates( docB, 'b', pendingUpdates );

		applyPostChangesToCRDTDoc(
			docA,
			{
				content: 'Initial collaborative content',
				excerpt: 'Initial excerpt',
				title: 'Initial title',
			} as PostChanges,
			syncedProperties
		);
		Y.applyUpdateV2(
			docB,
			Y.encodeStateAsUpdateV2( docA ),
			INITIAL_SYNC_ORIGIN
		);
		pendingUpdates.length = 0;

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			const source = rng.pick( [ 'a', 'b' ] as const );
			const field = rng.pick( FIELDS );
			const sourceDoc = source === 'a' ? docA : docB;
			const nextValue = mutateText(
				getFieldValue( sourceDoc, field ),
				rng
			);

			trace.push(
				`${ step }: ${ source }.${ field } -> ${ JSON.stringify(
					nextValue
				) }`
			);

			applyPostChangesToCRDTDoc(
				sourceDoc,
				{
					[ field ]: nextValue,
				} as PostChanges,
				syncedProperties
			);

			if ( rng.bool( 0.4 ) ) {
				flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );
			}
		}

		flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );

		const snapshotA = Object.fromEntries(
			FIELDS.map( ( field ) => [ field, getFieldValue( docA, field ) ] )
		);
		const snapshotB = Object.fromEntries(
			FIELDS.map( ( field ) => [ field, getFieldValue( docB, field ) ] )
		);

		expect( snapshotA ).toEqual( snapshotB );
	} catch ( error ) {
		throw new Error(
			`RTC rich-text fuzz failed for seed ${ seed }\n${ trace.join(
				'\n'
			) }\n${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

describe( 'crdt fuzzing', () => {
	it.each( SEEDS )(
		'concurrent-rich-text-edits-converge (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);
} );
