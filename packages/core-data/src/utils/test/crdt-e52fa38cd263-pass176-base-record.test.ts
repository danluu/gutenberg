/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( () => null ),
	updateSelectionHistory: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: ( blocks: any[] ) =>
		blocks
			.map( ( block ) => {
				if ( block.name === 'core/group' ) {
					return `<div>${ ( block.innerBlocks ?? [] )
						.map(
							( child: any ) =>
								child.attributes?.content ?? child.name
						)
						.join( ' ' ) }</div>`;
				}
				return `<p>${ block.attributes?.content ?? block.name }</p>`;
			} )
			.join( '\n' ),
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/group',
			attributes: {},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

const BASELINE = 'Seed 953452 baseline paragraph.';
const SECOND = 'Seed 953452 keeps a second paragraph for deletes and moves.';
const SHARED = 'Shared editing target paragraph.';
const ITALIC_HTML = '<em>italic</em>beta';
const STEP2 = 'Seed 953452 step 2 user 1 paragraph 183935';
const STEP3_PARAGRAPH = 'Seed 953452 step 3 user 0 nested paragraph';
const STEP3_HEADING = 'Seed 953452 step 3 user 0 nested heading';
const STEP4 = 'Seed 953452 step 4 user 0 paragraph 795863';

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function heading( clientId: string, content: string ): Block {
	return {
		name: 'core/heading',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks,
	};
}

function initialBlocks(): Block[] {
	return [
		paragraph( 'baseline', BASELINE ),
		paragraph( 'second', SECOND ),
		paragraph( 'shared', SHARED ),
		paragraph( 'italic', ITALIC_HTML ),
	];
}

function withRemoteInserts(): Block[] {
	const [ baseline, second, shared, italic ] = initialBlocks();
	return [
		group( 'remote-group', [
			paragraph( 'remote-group-paragraph', STEP3_PARAGRAPH ),
			heading( 'remote-group-heading', STEP3_HEADING ),
		] ),
		baseline,
		second,
		shared,
		paragraph( 'remote-step4', STEP4 ),
		italic,
		paragraph( 'remote-step2', STEP2 ),
	];
}

function staleLocalMove(): Block[] {
	const [ baseline, second, shared, italic ] = initialBlocks();
	return [ second, baseline, shared, italic ];
}

function postBlocks( doc: Y.Doc ): Block[] {
	const blocks = getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
	return blocks.toJSON() as Block[];
}

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/group' ) {
				return ( block.innerBlocks ?? [] )
					.map( ( child ) => child.attributes.content )
					.join( '\n' );
			}
			return block.attributes.content;
		} )
		.join( '\n' );
}

function topLevelSummary( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => {
		if ( block.name === 'core/group' ) {
			return `group:${ ( block.innerBlocks ?? [] )
				.map( ( child ) => child.attributes.content )
				.join( ' | ' ) }`;
		}
		return String( block.attributes.content );
	} );
}

function countContaining( values: string[], needle: string ): number {
	return values.filter( ( value ) => value.includes( needle ) ).length;
}

describe( 'e52fa38cd263 stale move through baseRecord product path', () => {
	let localDoc: Y.Doc;
	let remoteDoc: Y.Doc;

	beforeEach( () => {
		localDoc = new Y.Doc();
		remoteDoc = new Y.Doc();
	} );

	afterEach( () => {
		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'preserves every remote insert exactly once when a stale local move supplies base blocks', () => {
		const baseBlocks = initialBlocks();
		applyPostChangesToCRDTDoc(
			localDoc,
			{
				blocks: baseBlocks,
				content: serializeBlocks( baseBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const remoteBlocks = withRemoteInserts();
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: remoteBlocks,
				content: serializeBlocks( remoteBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		const movedBlocks = staleLocalMove();
		applyPostChangesToCRDTDoc(
			localDoc,
			{
				blocks: movedBlocks,
				content: serializeBlocks( movedBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{
				baseRecord: {
					blocks: baseBlocks,
					content: serializeBlocks( baseBlocks ),
				},
			}
		);

		const summary = topLevelSummary( postBlocks( localDoc ) );
		expect( countContaining( summary, STEP3_PARAGRAPH ) ).toBe( 1 );
		expect( countContaining( summary, STEP3_HEADING ) ).toBe( 1 );
		expect( summary.filter( ( value ) => value === BASELINE ) ).toHaveLength(
			1
		);
		expect( summary.filter( ( value ) => value === SECOND ) ).toHaveLength(
			1
		);
		expect( summary.filter( ( value ) => value === STEP4 ) ).toHaveLength(
			1
		);
		expect( summary.filter( ( value ) => value === STEP2 ) ).toHaveLength(
			1
		);
		expect( summary.indexOf( SECOND ) ).toBeLessThan(
			summary.indexOf( BASELINE )
		);

		const content = postContent( localDoc );
		for ( const expected of [
			STEP3_PARAGRAPH,
			STEP3_HEADING,
			BASELINE,
			SECOND,
			STEP4,
			STEP2,
		] ) {
			expect( content ).toContain( expected );
		}
	} );
} );
