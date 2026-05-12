/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: (
		blocks: { attributes: { content?: string } }[]
	) =>
		blocks
			.map( ( block ) => `<p>${ block.attributes.content }</p>` )
			.join( '\n\n' ),
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn(),
	getShiftedSelection: jest.fn(),
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

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
		.join( '\n\n' );
}

function applyBlocks( doc: Y.Doc, blocks: Block[], baseBlocks?: Block[] ) {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks ? { baseRecord: { blocks: baseBlocks } } : undefined
	);
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

function contentsOf( doc: Y.Doc ): string[] {
	return postBlocks( doc ).map(
		( block ) => block.attributes.content as string
	);
}

describe( '9b8e54918df2 stale base-record delete path', () => {
	it( 'keeps a peer-deleted recent insert deleted through a stale base-record edit', () => {
		const primaryDoc = new Y.Doc();
		const secondaryDoc = new Y.Doc();

		try {
			const inserted = paragraph(
				'recent-remote-insert',
				'RTC realistic 9b8e paragraph'
			);
			const seedOne = paragraph(
				'seed-one',
				'Seed 950584 baseline paragraph.'
			);
			const seedTwo = paragraph(
				'seed-two',
				'Seed 950584 keeps a second paragraph for deletes and moves.'
			);
			const withInserted = [ inserted, seedOne, seedTwo ];
			const afterDelete = [ seedOne, seedTwo ];

			applyBlocks( primaryDoc, withInserted );
			Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

			applyBlocks( secondaryDoc, afterDelete, withInserted );
			Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );
			expect( contentsOf( primaryDoc ) ).toEqual( [
				'Seed 950584 baseline paragraph.',
				'Seed 950584 keeps a second paragraph for deletes and moves.',
			] );

			const staleLocalEdit = [
				inserted,
				paragraph( 'seed-one', 'Seed 950584 local follow-up edit.' ),
				seedTwo,
			];
			applyBlocks( primaryDoc, staleLocalEdit, withInserted );

			expect( contentsOf( primaryDoc ) ).toEqual( [
				'Seed 950584 local follow-up edit.',
				'Seed 950584 keeps a second paragraph for deletes and moves.',
			] );
			expect( postContent( primaryDoc ) ).not.toContain(
				'RTC realistic 9b8e paragraph'
			);
			expect( postContent( primaryDoc ) ).not.toContain(
				'Seed 950584 baseline paragraph.'
			);
		} finally {
			primaryDoc.destroy();
			secondaryDoc.destroy();
		}
	} );
} );
