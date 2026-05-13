/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

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

function syncDocs( from: Y.Doc, to: Y.Doc ): void {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

const mergeWithBase = mergeCrdtBlocks as (
	yblocks: YBlocks,
	blocks: Block[],
	cursor: null,
	baseBlocks?: Block[]
) => void;

describe( 'pass 178 da9e95 baseBlocks stale top-level move probe', () => {
	it( 'preserves a remote sibling when the local move carries a stale base block list', () => {
		const primaryDoc = new Y.Doc();
		const secondaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		const secondaryBlocks = secondaryDoc.getArray< YBlock >();

		try {
			const initialBlocks = [
				paragraph( 'heading', 'Heading' ),
				paragraph( 'emoji', 'Emoji paragraph' ),
				paragraph( 'another', 'Another paragraph' ),
			];
			const withRemoteSibling = [
				initialBlocks[ 0 ],
				paragraph( 'remote-sibling', 'Remote sibling' ),
				initialBlocks[ 1 ],
				initialBlocks[ 2 ],
			];
			const staleTopLevelMove = [
				initialBlocks[ 1 ],
				initialBlocks[ 0 ],
				initialBlocks[ 2 ],
			];

			mergeCrdtBlocks( primaryBlocks, initialBlocks, null );
			syncDocs( primaryDoc, secondaryDoc );
			mergeCrdtBlocks( secondaryBlocks, initialBlocks, null );

			mergeCrdtBlocks( primaryBlocks, withRemoteSibling, null );
			syncDocs( primaryDoc, secondaryDoc );
			expect( contentsOf( secondaryBlocks ) ).toEqual( [
				'Heading',
				'Remote sibling',
				'Emoji paragraph',
				'Another paragraph',
			] );

			mergeWithBase(
				secondaryBlocks,
				staleTopLevelMove,
				null,
				initialBlocks
			);
			syncDocs( secondaryDoc, primaryDoc );

			const expectedContents = [
				'Emoji paragraph',
				'Heading',
				'Remote sibling',
				'Another paragraph',
			];
			expect( contentsOf( secondaryBlocks ) ).toEqual( expectedContents );
			expect( contentsOf( primaryBlocks ) ).toEqual( expectedContents );
		} finally {
			primaryDoc.destroy();
			secondaryDoc.destroy();
		}
	} );
} );
