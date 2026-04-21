/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Internal dependencies
 */
import { generateScenario, replayScenario } from './merge-rich-text-fuzz-utils';
import { intFromEnv, seededRangeFromEnv } from './seeded-rng';

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
