/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Internal dependencies
 */
import { MAX_UPDATE_SIZE_IN_BYTES } from '../config';
import { uint8ArrayToBase64 } from '../utils';

interface SeededRandom {
	intBetween: ( minInclusive: number, maxInclusive: number ) => number;
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

	function int( maxExclusive: number ): number {
		return maxExclusive <= 0
			? 0
			: Math.floor( ( nextUint32() / 0x100000000 ) * maxExclusive );
	}

	return {
		intBetween( minInclusive, maxInclusive ) {
			return minInclusive + int( maxInclusive - minInclusive + 1 );
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

function seededRangeFromEnv( defaultCount: number, defaultStart: number ) {
	const count = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_COUNT' ) ?? defaultCount;
	const start = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_START' ) ?? defaultStart;
	if ( count < 0 ) {
		throw new Error(
			`Expected GUTENBERG_FUZZ_SEED_COUNT to be non-negative, got "${ count }".`
		);
	}
	return Array.from( { length: count }, ( _value, index ) => start + index );
}

const SERVER_MAX_ENCODED_UPDATE_SIZE_IN_BYTES = 1 * 1024 * 1024;
const SEEDS = seededRangeFromEnv( 24, 12101 );

function updateOfLength( length: number ): Uint8Array {
	const update = new Uint8Array( length );
	for ( let i = 0; i < update.length; i++ ) {
		update[ i ] = i % 251;
	}
	return update;
}

describe( 'http-polling config fuzzing', () => {
	it.each( SEEDS )(
		'raw update limit never exceeds the server base64 payload limit (seed %i)',
		( seed ) => {
			const rng = createSeededRandom( seed );
			const candidateLengths = [
				0,
				1,
				2,
				3,
				MAX_UPDATE_SIZE_IN_BYTES - rng.intBetween( 0, 16 ),
				MAX_UPDATE_SIZE_IN_BYTES,
			].filter( ( length ) => length >= 0 );

			for ( const length of candidateLengths ) {
				const encoded = uint8ArrayToBase64( updateOfLength( length ) );
				expect( encoded.length ).toBeLessThanOrEqual(
					SERVER_MAX_ENCODED_UPDATE_SIZE_IN_BYTES
				);
			}
		}
	);
} );
