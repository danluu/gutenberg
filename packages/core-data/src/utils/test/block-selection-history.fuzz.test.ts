/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import {
	createBlockSelectionHistory,
	YSelectionType,
	type YRelativeSelection,
} from '../block-selection-history';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import type { WPSelection } from '../../types';

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
	defaultStart: number
): number[] {
	const count =
		readIntFromEnv( 'GUTENBERG_RTC_SELECTION_HISTORY_FUZZ_SEED_COUNT' ) ??
		defaultCount;
	const start =
		readIntFromEnv( 'GUTENBERG_RTC_SELECTION_HISTORY_FUZZ_SEED_START' ) ??
		defaultStart;

	if ( count < 0 ) {
		throw new Error(
			'Expected GUTENBERG_RTC_SELECTION_HISTORY_FUZZ_SEED_COUNT to be non-negative.'
		);
	}

	return Array.from( { length: count }, ( _value, index ) => start + index );
}

const SEEDS = seededRangeFromEnv( 8, 1701 );

type TextTarget = {
	attributeKey: string;
	isNested: boolean;
	label: string;
	text: Y.Text;
};

function createSelection(
	clientId: string,
	attributeKey: string,
	offset: number
): WPSelection {
	const selectionPoint = {
		clientId,
		attributeKey,
		offset,
	};

	return {
		selectionStart: selectionPoint,
		selectionEnd: selectionPoint,
	};
}

function wrapTextInRandomNestedValue(
	targetText: Y.Text,
	rng: SeededRandom
): Y.Map< unknown > | Y.Array< unknown > {
	switch ( rng.int( 4 ) ) {
		case 0: {
			const wrapper = new Y.Map< unknown >();
			wrapper.set( 'content', targetText );
			wrapper.set( 'label', 'object-leaf' );
			return wrapper;
		}

		case 1: {
			const inner = new Y.Map< unknown >();
			inner.set( 'content', targetText );
			const wrapper = new Y.Map< unknown >();
			wrapper.set( 'inner', inner );
			wrapper.set( 'label', 'object-object-leaf' );
			return wrapper;
		}

		case 2: {
			const item = new Y.Map< unknown >();
			item.set( 'content', targetText );
			item.set( 'label', 'array-object-leaf' );
			const wrapper = new Y.Array< unknown >();
			wrapper.push( [ item ] );
			return wrapper;
		}

		default: {
			const item = new Y.Map< unknown >();
			item.set( 'content', targetText );
			const items = new Y.Array< unknown >();
			items.push( [ item ] );
			const wrapper = new Y.Map< unknown >();
			wrapper.set( 'items', items );
			wrapper.set( 'label', 'object-array-object-leaf' );
			return wrapper;
		}
	}
}

function createDocWithFuzzedRichTextTargets(
	seed: number,
	rng: SeededRandom
): {
	targets: TextTarget[];
	ydoc: Y.Doc;
} {
	const ydoc = new Y.Doc();
	const documentMap = ydoc.getMap( CRDT_RECORD_MAP_KEY );
	const blocks = new Y.Array< Y.Map< unknown > >();
	const block = new Y.Map< unknown >();
	const attributes = new Y.Map< unknown >();
	const targets: TextTarget[] = [];

	documentMap.set( 'blocks', blocks );
	block.set( 'clientId', 'block-1' );
	block.set( 'name', 'test/nested-rich-text-history' );
	block.set( 'innerBlocks', new Y.Array() );

	const directText = new Y.Text( `direct target ${ seed } text` );
	attributes.set( 'direct', directText );
	targets.push( {
		attributeKey: 'direct',
		isNested: false,
		label: 'direct',
		text: directText,
	} );

	for ( let index = 0; index < 4; index++ ) {
		const attributeKey = `nested${ index }`;
		const nestedText = new Y.Text(
			`nested target ${ seed } ${ index } text`
		);
		attributes.set(
			attributeKey,
			wrapTextInRandomNestedValue( nestedText, rng )
		);
		targets.push( {
			attributeKey,
			isNested: true,
			label: attributeKey,
			text: nestedText,
		} );
	}

	block.set( 'attributes', attributes );
	blocks.push( [ block ] );

	return { targets, ydoc };
}

describe( 'BlockSelectionHistory fuzzing', () => {
	it.each( SEEDS )(
		'tracks rich-text selections through direct and nested attributes (seed %i)',
		( seed ) => {
			const rng = createSeededRandom( seed );
			const { targets, ydoc } = createDocWithFuzzedRichTextTargets(
				seed,
				rng
			);
			const history = createBlockSelectionHistory( ydoc, 6 );
			const nestedTargets = targets.filter(
				( target ) => target.isNested
			);
			const target = rng.bool( 0.8 )
				? rng.pick( nestedTargets )
				: rng.pick( targets );
			const offset = rng.intBetween(
				1,
				Math.max( 1, target.text.length - 1 )
			);
			const prefix = `prefix-${ seed }-`;

			try {
				history.updateSelection(
					createSelection( 'block-1', target.attributeKey, offset )
				);

				const [ latestSelection ] = history.getSelectionHistory();
				expect( latestSelection.start.type ).toBe(
					YSelectionType.RelativeSelection
				);
				expect( latestSelection.end.type ).toBe(
					YSelectionType.RelativeSelection
				);

				target.text.insert( 0, prefix );

				const start = latestSelection.start as YRelativeSelection;
				const absolutePosition =
					Y.createAbsolutePositionFromRelativePosition(
						start.relativePosition,
						ydoc
					);

				expect( absolutePosition?.type ).toBe( target.text );
				expect( absolutePosition?.index ).toBe(
					offset + prefix.length
				);
			} catch ( error ) {
				throw new Error(
					`Block selection history fuzz failed for seed ${ seed } target ${
						target.label
					}\n${
						error instanceof Error ? error.message : String( error )
					}`
				);
			} finally {
				ydoc.destroy();
			}
		}
	);
} );
