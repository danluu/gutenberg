/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { RichTextData } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import {
	describeReplayStep,
	findMinimalFailingWindow,
	generateScenario,
	materializeScenarioStates,
	replayScenario,
	toValue,
} from './merge-rich-text-fuzz-utils';

const STEP_COUNT = 160;
const ENABLED = process.env.GUTENBERG_RTC_MINIMIZE === '1';
const REQUESTED_SEED = process.env.GUTENBERG_RTC_MINIMIZE_SEED
	? Number.parseInt( process.env.GUTENBERG_RTC_MINIMIZE_SEED, 10 )
	: null;
const CASES = [ 46016, 46153, 46181 ].filter(
	( seed ) => REQUESTED_SEED === null || seed === REQUESTED_SEED
);

function roundTripPreservesHTML( html: string ) {
	try {
		return RichTextData.fromHTMLString( html ).toHTMLString() === html;
	} catch {
		return false;
	}
}

( ENABLED ? describe : describe.skip )( 'mergeRichTextUpdate minimizer', () => {
	it.each( CASES )( 'minimizes seed %i', ( seed ) => {
		const scenario = generateScenario( seed, STEP_COUNT );
		const minimal = findMinimalFailingWindow(
			scenario.initialFragments,
			scenario.steps
		);

		expect( minimal ).not.toBeNull();
		if ( ! minimal ) {
			return;
		}

		const replay = replayScenario(
			minimal.initialFragments,
			minimal.steps
		);
		expect( replay.ok ).toBe( false );
		if ( replay.ok ) {
			return;
		}

		const windowStates = materializeScenarioStates(
			minimal.initialFragments,
			minimal.steps
		).map( toValue );
		const summary = {
			actual: replay.failure.actual,
			endStepIndex: minimal.endStepIndex,
			expected: replay.failure.expected,
			failureStepIndexWithinWindow: replay.failure.stepIndex,
			initialFragments: minimal.initialFragments,
			initialValue: toValue( minimal.initialFragments ),
			roundTripPreservedByState: windowStates.map( ( value ) => ( {
				preserved: roundTripPreservesHTML( value ),
				value,
			} ) ),
			seed,
			startStepIndex: minimal.startStepIndex,
			steps: minimal.steps.map( ( step ) => ( {
				cursorPosition: step.cursorPosition,
				description: describeReplayStep( step ),
				idempotentReplay: step.idempotentReplay,
			} ) ),
		};

		// eslint-disable-next-line no-console
		console.log( JSON.stringify( summary, null, 2 ) );
	} );
} );
