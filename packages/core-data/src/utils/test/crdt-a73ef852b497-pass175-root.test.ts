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
		{
			name: 'core/list-item',
			attributes: { content: { type: 'rich-text' } },
		},
		{ name: 'core/list', attributes: {} },
		{
			name: 'core/pullquote',
			attributes: {
				value: { type: 'rich-text' },
				citation: { type: 'rich-text' },
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

const paragraph = ( clientId: string, content: string ): Block => ( {
	name: 'core/paragraph',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const listItem = ( clientId: string, content: string ): Block => ( {
	name: 'core/list-item',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const list = (): Block => ( {
	name: 'core/list',
	clientId: 'list',
	attributes: {},
	innerBlocks: [
		listItem( 'list-item-one', 'Alpha list item' ),
		listItem( 'list-item-two', 'Beta list item' ),
	],
} );

const pullquote = (): Block => ( {
	name: 'core/pullquote',
	clientId: 'pullquote',
	attributes: {
		value: '<p>Pullquote value</p>',
		citation: 'Pullquote citation',
	},
	innerBlocks: [],
} );

const initialBlocks = (): Block[] => [
	paragraph( 'intro', 'Intro paragraph' ),
	list(),
	pullquote(),
	paragraph( 'tail', 'Tail paragraph' ),
];

const cloneBlocks = ( blocks: Block[] ): Block[] =>
	JSON.parse( JSON.stringify( blocks ) ) as Block[];

const moveBlock = (
	blocks: Block[],
	clientId: string,
	targetIndex: number
): Block[] => {
	const moved = cloneBlocks( blocks );
	const sourceIndex = moved.findIndex( ( block ) => block.clientId === clientId );
	const [ block ] = moved.splice( sourceIndex, 1 );

	moved.splice( targetIndex, 0, block );
	return moved;
};

const hasListDescendant = ( block: Block ): boolean =>
	( block.innerBlocks ?? [] ).some(
		( innerBlock ) =>
			innerBlock.name === 'core/list' ||
			innerBlock.name === 'core/list-item' ||
			hasListDescendant( innerBlock )
	);

describe( 'a73ef852b497 root-cause interleaving', () => {
	it( 'does not merge a stale Pullquote snapshot into the current List Y block', () => {
		const primaryDoc = new Y.Doc();
		const secondaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		const secondaryBlocks = secondaryDoc.getArray< YBlock >();

		try {
			mergeCrdtBlocks( primaryBlocks, initialBlocks(), null );
			Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );
			mergeCrdtBlocks( secondaryBlocks, initialBlocks(), null );

			// Peer A moves List before Intro: [ list, intro, pullquote, tail ].
			const remoteBlocks = moveBlock( initialBlocks(), 'list', 0 );
			mergeCrdtBlocks( primaryBlocks, remoteBlocks, null );
			Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

			// Peer B still has the old snapshot, deletes Intro, then moves List
			// below Pullquote: [ pullquote, list, tail ].
			const staleAfterDelete = initialBlocks().filter(
				( block ) => block.clientId !== 'intro'
			);
			const staleBlocks = moveBlock( staleAfterDelete, 'list', 1 );

			mergeCrdtBlocks( secondaryBlocks, staleBlocks, null );
			Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

			const mergedBlocks = secondaryBlocks.toJSON() as Block[];

			expect( mergedBlocks ).toHaveLength( 3 );
			expect(
				mergedBlocks.some(
					( block ) =>
						block.name === 'core/pullquote' &&
						hasListDescendant( block )
				)
			).toBe( false );
			expect(
				mergedBlocks.some(
					( block ) =>
						block.name === 'core/paragraph' &&
						( 'value' in block.attributes ||
							'citation' in block.attributes )
				)
			).toBe( false );
		} finally {
			primaryDoc.destroy();
			secondaryDoc.destroy();
		}
	} );
} );
