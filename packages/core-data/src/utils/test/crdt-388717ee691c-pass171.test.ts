/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

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

function contentsOf( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

describe( '388717ee691c stale reload after move and delete', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not rehydrate a deleted top-level paragraph as a duplicate tail block', () => {
		const initialBlocks = [
			paragraph( 'long-paragraph', 'Long paragraph' ),
			heading( 'follow-up-heading', 'Follow-up heading' ),
			paragraph( 'tail-paragraph', 'Tail paragraph' ),
		];
		const movedBlocks = [
			paragraph( 'long-paragraph', 'Long paragraph' ),
			paragraph( 'tail-paragraph', 'Tail paragraph' ),
			heading( 'follow-up-heading', 'Follow-up heading' ),
		];
		const deletedAfterMoveBlocks = [
			paragraph( 'tail-paragraph', 'Tail paragraph' ),
			heading( 'follow-up-heading', 'Follow-up heading' ),
		];
		const staleReloadBlocks = initialBlocks;

		mergeCrdtBlocks( yblocks, initialBlocks, null );
		mergeCrdtBlocks( yblocks, movedBlocks, null, initialBlocks );
		mergeCrdtBlocks(
			yblocks,
			deletedAfterMoveBlocks,
			null,
			movedBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Tail paragraph',
			'Follow-up heading',
		] );

		mergeCrdtBlocks( yblocks, staleReloadBlocks, null, initialBlocks );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Tail paragraph',
			'Follow-up heading',
		] );
	} );
} );
