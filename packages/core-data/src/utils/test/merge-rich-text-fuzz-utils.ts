/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import { mergeRichTextUpdate } from '../crdt-blocks';
import { createSeededRandom } from './seeded-rng';

export const FRAGMENTS = [
	'alpha',
	'beta',
	'gamma',
	' ',
	'\n',
	'😀',
	'👩🏽‍💻',
	'e\u0301',
	'&nbsp;',
	'<strong>bold</strong>',
	'<em>italic</em>',
	'<a href="https://example.com">link</a>',
	'<!-- wp:paragraph --><p>seed</p><!-- /wp:paragraph -->',
] as const;

type Fragment = ( typeof FRAGMENTS )[ number ];
type MutationKind =
	| 'insert'
	| 'delete'
	| 'replace'
	| 'duplicate-span'
	| 'wrap-strong';

type ReplayStepBase = {
	cursorPosition: number | null;
	idempotentReplay: boolean;
};

export type ReplayStep =
	| ( ReplayStepBase & {
			fragment: Fragment;
			index: number;
			kind: 'insert';
	  } )
	| ( ReplayStepBase & {
			end: number;
			kind: 'delete';
			start: number;
	  } )
	| ( ReplayStepBase & {
			end: number;
			fragment: Fragment;
			kind: 'replace';
			start: number;
	  } )
	| ( ReplayStepBase & {
			end: number;
			kind: 'duplicate-span';
			start: number;
	  } )
	| ( ReplayStepBase & {
			end: number;
			kind: 'wrap-strong';
			start: number;
	  } );

export type GeneratedScenario = {
	initialFragments: string[];
	steps: ReplayStep[];
};

export type ReplayFailure = {
	actual: string;
	expected: string;
	step: ReplayStep;
	stepIndex: number;
	type: 'merge-mismatch';
};

export type ReplayResult =
	| {
			finalFragments: string[];
			finalValue: string;
			ok: true;
	  }
	| {
			failure: ReplayFailure;
			finalFragments: string[];
			finalValue: string;
			ok: false;
	  };

export type MinimalReplayWindow = {
	endStepIndex: number;
	failure: ReplayFailure;
	initialFragments: string[];
	startStepIndex: number;
	steps: ReplayStep[];
};

function cloneFragments( fragments: readonly string[] ): string[] {
	return [ ...fragments ];
}

function assertIndexRange(
	fragments: readonly string[],
	start: number,
	end: number
) {
	if ( start < 0 || end < 0 || start >= end || end > fragments.length ) {
		throw new Error(
			`Invalid fragment range ${ start }-${ end } for length ${ fragments.length }.`
		);
	}
}

function assertInsertIndex( fragments: readonly string[], index: number ) {
	if ( index < 0 || index > fragments.length ) {
		throw new Error(
			`Invalid insert index ${ index } for length ${ fragments.length }.`
		);
	}
}

export function toValue( fragments: readonly string[] ): string {
	return fragments.join( '' );
}

export function getCursorOffset(
	fragments: readonly string[],
	tokenIndex: number
): number {
	return toValue( fragments.slice( 0, tokenIndex ) ).length;
}

export function describeReplayStep( step: ReplayStep ): string {
	switch ( step.kind ) {
		case 'insert':
			return `insert ${ JSON.stringify( step.fragment ) } at ${
				step.index
			}`;
		case 'delete':
			return `delete ${ step.start }-${ step.end }`;
		case 'replace':
			return `replace ${ step.start }-${
				step.end
			} with ${ JSON.stringify( step.fragment ) }`;
		case 'duplicate-span':
			return `duplicate ${ step.start }-${ step.end }`;
		case 'wrap-strong':
			return `wrap ${ step.start }-${ step.end } in <strong>`;
	}
}

function createInitialFragments(
	rng: ReturnType< typeof createSeededRandom >
): string[] {
	const fragmentCount = rng.intBetween( 1, 3 );
	const fragments: string[] = [];

	for ( let index = 0; index < fragmentCount; index++ ) {
		fragments.push( rng.pick( FRAGMENTS ) );
	}

	return fragments;
}

function pickCursorPosition(
	rng: ReturnType< typeof createSeededRandom >,
	preferred: number,
	maxLength: number
): number | null {
	const mode = rng.pick( [
		'preferred',
		'random',
		'null',
		'beyond-end',
	] as const );

	switch ( mode ) {
		case 'preferred':
			return preferred;
		case 'random':
			return rng.intBetween( 0, maxLength );
		case 'null':
			return null;
		case 'beyond-end':
			return maxLength + rng.intBetween( 1, 4 );
	}
}

export function applyReplayStepToFragments(
	currentFragments: readonly string[],
	step: ReplayStep
): string[] {
	const nextFragments = cloneFragments( currentFragments );

	switch ( step.kind ) {
		case 'insert':
			assertInsertIndex( currentFragments, step.index );
			nextFragments.splice( step.index, 0, step.fragment );
			return nextFragments;

		case 'delete':
			assertIndexRange( currentFragments, step.start, step.end );
			nextFragments.splice( step.start, step.end - step.start );
			return nextFragments;

		case 'replace':
			assertIndexRange( currentFragments, step.start, step.end );
			nextFragments.splice(
				step.start,
				step.end - step.start,
				step.fragment
			);
			return nextFragments;

		case 'duplicate-span':
			assertIndexRange( currentFragments, step.start, step.end );
			nextFragments.splice(
				step.end,
				0,
				...currentFragments.slice( step.start, step.end )
			);
			return nextFragments;

		case 'wrap-strong':
			assertIndexRange( currentFragments, step.start, step.end );
			nextFragments.splice( step.start, 0, '<strong>' );
			nextFragments.splice( step.end + 1, 0, '</strong>' );
			return nextFragments;
	}
}

function mutateRichText(
	currentFragments: readonly string[],
	rng: ReturnType< typeof createSeededRandom >
): ReplayStep {
	const kind: MutationKind =
		currentFragments.length === 0
			? 'insert'
			: rng.pick( [
					'insert',
					'delete',
					'replace',
					'duplicate-span',
					'wrap-strong',
			  ] as const );

	switch ( kind ) {
		case 'insert': {
			const index = rng.intBetween( 0, currentFragments.length );
			const fragment = rng.pick( FRAGMENTS );
			const nextFragments = cloneFragments( currentFragments );
			nextFragments.splice( index, 0, fragment );
			return {
				cursorPosition: pickCursorPosition(
					rng,
					getCursorOffset( nextFragments, index + 1 ),
					toValue( nextFragments ).length
				),
				fragment,
				idempotentReplay: rng.bool( 0.2 ),
				index,
				kind,
			};
		}

		case 'delete': {
			const start = rng.int( currentFragments.length );
			const end = rng.intBetween( start + 1, currentFragments.length );
			const nextFragments = cloneFragments( currentFragments );
			nextFragments.splice( start, end - start );
			return {
				cursorPosition: pickCursorPosition(
					rng,
					getCursorOffset( nextFragments, start ),
					toValue( nextFragments ).length
				),
				end,
				idempotentReplay: rng.bool( 0.2 ),
				kind,
				start,
			};
		}

		case 'replace': {
			const start = rng.int( currentFragments.length );
			const end = rng.intBetween( start + 1, currentFragments.length );
			const fragment = rng.pick( FRAGMENTS );
			const nextFragments = cloneFragments( currentFragments );
			nextFragments.splice( start, end - start, fragment );
			return {
				cursorPosition: pickCursorPosition(
					rng,
					getCursorOffset( nextFragments, start + 1 ),
					toValue( nextFragments ).length
				),
				end,
				fragment,
				idempotentReplay: rng.bool( 0.2 ),
				kind,
				start,
			};
		}

		case 'duplicate-span': {
			const start = rng.int( currentFragments.length );
			const end = rng.intBetween( start + 1, currentFragments.length );
			const nextFragments = cloneFragments( currentFragments );
			nextFragments.splice(
				end,
				0,
				...currentFragments.slice( start, end )
			);
			return {
				cursorPosition: pickCursorPosition(
					rng,
					getCursorOffset( nextFragments, end + ( end - start ) ),
					toValue( nextFragments ).length
				),
				end,
				idempotentReplay: rng.bool( 0.2 ),
				kind,
				start,
			};
		}

		case 'wrap-strong': {
			const start = rng.int( currentFragments.length );
			const end = rng.intBetween( start + 1, currentFragments.length );
			const nextFragments = cloneFragments( currentFragments );
			nextFragments.splice( start, 0, '<strong>' );
			nextFragments.splice( end + 1, 0, '</strong>' );
			return {
				cursorPosition: pickCursorPosition(
					rng,
					getCursorOffset( nextFragments, end + 2 ),
					toValue( nextFragments ).length
				),
				end,
				idempotentReplay: rng.bool( 0.2 ),
				kind,
				start,
			};
		}
	}
}

export function generateScenario(
	seed: number,
	stepCount: number
): GeneratedScenario {
	const rng = createSeededRandom( seed );
	const initialFragments = createInitialFragments( rng );
	const steps: ReplayStep[] = [];
	let currentFragments = cloneFragments( initialFragments );

	for ( let stepIndex = 0; stepIndex < stepCount; stepIndex++ ) {
		const step = mutateRichText( currentFragments, rng );
		steps.push( step );
		currentFragments = applyReplayStepToFragments( currentFragments, step );
	}

	return {
		initialFragments,
		steps,
	};
}

export function materializeScenarioStates(
	initialFragments: readonly string[],
	steps: readonly ReplayStep[]
): string[][] {
	const states = [ cloneFragments( initialFragments ) ];
	let currentFragments = cloneFragments( initialFragments );

	for ( const step of steps ) {
		currentFragments = applyReplayStepToFragments( currentFragments, step );
		states.push( currentFragments );
	}

	return states;
}

export function replayScenario(
	initialFragments: readonly string[],
	steps: readonly ReplayStep[]
): ReplayResult {
	const doc = new Y.Doc();
	const ytext = doc.getText( 'fuzz-rich-text' );
	let currentFragments = cloneFragments( initialFragments );
	let currentValue = toValue( currentFragments );

	try {
		ytext.insert( 0, currentValue );

		for ( let stepIndex = 0; stepIndex < steps.length; stepIndex++ ) {
			const step = steps[ stepIndex ];
			currentFragments = applyReplayStepToFragments(
				currentFragments,
				step
			);
			currentValue = toValue( currentFragments );

			mergeRichTextUpdate( ytext, currentValue, step.cursorPosition );
			if ( ytext.toString() !== currentValue ) {
				return {
					failure: {
						actual: ytext.toString(),
						expected: currentValue,
						step,
						stepIndex,
						type: 'merge-mismatch',
					},
					finalFragments: currentFragments,
					finalValue: ytext.toString(),
					ok: false,
				};
			}

			if ( step.idempotentReplay ) {
				mergeRichTextUpdate( ytext, currentValue, step.cursorPosition );
				if ( ytext.toString() !== currentValue ) {
					return {
						failure: {
							actual: ytext.toString(),
							expected: currentValue,
							step,
							stepIndex,
							type: 'merge-mismatch',
						},
						finalFragments: currentFragments,
						finalValue: ytext.toString(),
						ok: false,
					};
				}
			}
		}

		return {
			finalFragments: currentFragments,
			finalValue: currentValue,
			ok: true,
		};
	} finally {
		doc.destroy();
	}
}

export function findMinimalFailingWindow(
	initialFragments: readonly string[],
	steps: readonly ReplayStep[]
): MinimalReplayWindow | null {
	const states = materializeScenarioStates( initialFragments, steps );

	for ( let windowLength = 1; windowLength <= steps.length; windowLength++ ) {
		for (
			let startStepIndex = 0;
			startStepIndex + windowLength <= steps.length;
			startStepIndex++
		) {
			const replayInitial = states[ startStepIndex ];
			const replaySteps = steps.slice(
				startStepIndex,
				startStepIndex + windowLength
			);
			const result = replayScenario( replayInitial, replaySteps );

			if ( ! result.ok ) {
				return {
					endStepIndex: startStepIndex + windowLength - 1,
					failure: result.failure,
					initialFragments: replayInitial,
					startStepIndex,
					steps: replaySteps,
				};
			}
		}
	}

	return null;
}
