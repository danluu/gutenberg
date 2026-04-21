/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Internal dependencies
 */
import { generateScenario, replayScenario } from './merge-rich-text-fuzz-utils';

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

const SEEDS = seededRangeFromEnv( 24, 6001 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_RICH_TEXT_STEPS', 48, {
	min: 1,
} );

function runScenario( seed: number ) {
	const scenario = generateScenario( seed, STEP_COUNT );
	const result = replayScenario( scenario.initialFragments, scenario.steps );

	if ( ! result.ok ) {
		throw new Error(
			`RTC mergeRichTextUpdate fuzz failed for seed ${ seed }\nstep ${
				result.failure.stepIndex
			}: expected ${ JSON.stringify(
				result.failure.expected
			) }, received ${ JSON.stringify( result.failure.actual ) }`
		);
	}
}

describe( 'mergeRichTextUpdate fuzzing', () => {
	it.each( SEEDS )( 'applies cursor-aware updates (seed %i)', ( seed ) => {
		expect( () => runScenario( seed ) ).not.toThrow();
	} );
} );
