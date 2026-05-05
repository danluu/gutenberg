/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

/**
 * Internal dependencies
 */
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

describe( 'fa621013afa9 stale top-level block snapshots', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not delete a remote top-level insert when a stale local snapshot follows a delete', () => {
		const initialBlocks = [
			paragraph( 'deleted-heading', 'Seed heading' ),
			paragraph( 'anchor-paragraph', 'Emoji and multibyte paragraph' ),
			paragraph( 'tail-paragraph', 'Trailing paragraph' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const afterDelete = [
			paragraph( 'anchor-paragraph', 'Emoji and multibyte paragraph' ),
			paragraph( 'tail-paragraph', 'Trailing paragraph' ),
		];
		mergeCrdtBlocks( yblocks, afterDelete, null );
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph(
					'anchor-paragraph',
					'Emoji and multibyte paragraph'
				),
				paragraph(
					'inserted-after-anchor',
					'Remote inserted paragraph'
				),
				paragraph( 'tail-paragraph', 'Trailing paragraph' ),
			],
			null
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Emoji and multibyte paragraph',
			'Remote inserted paragraph',
			'Trailing paragraph',
		] );

		mergeCrdtBlocks( yblocks, afterDelete, null );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Emoji and multibyte paragraph',
			'Remote inserted paragraph',
			'Trailing paragraph',
		] );
		remoteDoc.destroy();
	} );
} );
