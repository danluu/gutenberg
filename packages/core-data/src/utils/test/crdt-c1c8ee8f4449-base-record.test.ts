/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) => `<p>${ block.attributes.content }</p>` )
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( ( selection ) => selection ),
	restoreSelection: jest.fn( ( selection ) => selection ),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function block(
	name: 'core/heading' | 'core/paragraph',
	clientId: string,
	content: string
): Block {
	return {
		name,
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( item ) => `<p>${ item.attributes.content }</p>` )
		.join( '\n\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	).toJSON() as Block[];
}

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

function summaries( blocks: Block[] ): string[] {
	return blocks.map(
		( item ) => `${ item.name }:${ item.attributes.content }`
	);
}

function applyPostChanges(
	doc: Y.Doc,
	blocks: Block[],
	baseBlocks?: Block[]
) {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks
			? {
					baseRecord: {
						blocks: baseBlocks,
						content: serializeBlocks( baseBlocks ),
					},
			  }
			: undefined
	);
}

describe( 'c1c8ee8f4449 stale base-record move', () => {
	it( 'preserves a remote heading insert when a local paragraph move is based on a stale baseRecord', () => {
		const initialBlocks = [
			block( 'core/heading', 'original-heading', 'Seed 954733 heading' ),
			block( 'core/paragraph', 'emoji-paragraph', 'Emoji paragraph' ),
			block( 'core/paragraph', 'tail-paragraph', 'Other paragraph' ),
		];
		const remoteBlocks = [
			block( 'core/heading', 'inserted-heading', 'Inserted heading' ),
			...initialBlocks,
		];
		const staleLocalMove = [
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 1 ],
		];

		const doc = new Y.Doc();
		applyPostChanges( doc, initialBlocks );

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChanges( remoteDoc, remoteBlocks, initialBlocks );

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		applyPostChanges( doc, staleLocalMove, initialBlocks );

		expect( summaries( postBlocks( doc ) ) ).toEqual( [
			'core/heading:Inserted heading',
			'core/heading:Seed 954733 heading',
			'core/paragraph:Other paragraph',
			'core/paragraph:Emoji paragraph',
		] );
		expect( postContent( doc ) ).toContain( 'Inserted heading' );
		expect( postContent( doc ) ).toContain( 'Other paragraph' );
		expect( postContent( doc ) ).toContain( 'Emoji paragraph' );

		remoteDoc.destroy();
		doc.destroy();
	} );
} );
