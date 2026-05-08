/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/heading',
			attributes: {
				content: { type: 'rich-text' },
				level: { type: 'number' },
			},
		},
		{
			name: 'core/group',
			attributes: { layout: { type: 'object' } },
		},
	],
} ) );

const GROUP_LAYOUT = { type: 'constrained' };

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function heading( clientId: string, content: string, level?: number ): Block {
	return {
		name: 'core/heading',
		clientId,
		attributes:
			typeof level === 'number' ? { content, level } : { content },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: { layout: GROUP_LAYOUT },
		innerBlocks,
	};
}

function initialBlocks(): Block[] {
	return [
		heading( 'heading', 'Seed 952609 multibyte heading' ),
		group( 'group', [
			paragraph( 'nested-paragraph', 'Seed 952609 nested paragraph' ),
			heading( 'nested-heading', 'Seed 952609 nested heading', 3 ),
		] ),
		paragraph(
			'stable-paragraph',
			'Another paragraph exists so the top-level list is not degenerate.'
		),
		paragraph( 'appended-paragraph', 'Seed 952609 appended paragraph' ),
	];
}

function afterRemoteMoveIntoGroup(): Block[] {
	return [
		group( 'group', [
			paragraph( 'nested-paragraph', 'Seed 952609 nested paragraph' ),
			heading( 'nested-heading', 'Seed 952609 nested heading', 3 ),
			heading( 'heading', 'Seed 952609 multibyte heading' ),
			paragraph( 'appended-paragraph', 'Seed 952609 appended paragraph' ),
		] ),
		paragraph(
			'stable-paragraph',
			'Another paragraph exists so the top-level list is not degenerate.'
		),
	];
}

function afterLocalMoveUp(): Block[] {
	const [ movedGroup, stableParagraph ] = afterRemoteMoveIntoGroup();
	return [ stableParagraph, movedGroup ];
}

function ids( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.clientId as string
	);
}

function names( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => block.name );
}

describe( 'RTC f71f8a233356 group/paragraph top-level move', () => {
	it( 'observes the paragraph move after remote move-into-group operations when the editor reuses the block array', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const localBlocks = localDoc.getArray< YBlock >( 'blocks' );
		const remoteBlocks = remoteDoc.getArray< YBlock >( 'blocks' );
		const reusableEditorBlocks = initialBlocks();

		mergeCrdtBlocks( localBlocks, reusableEditorBlocks, null );
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		mergeCrdtBlocks( remoteBlocks, afterRemoteMoveIntoGroup(), null );
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		reusableEditorBlocks.splice(
			0,
			reusableEditorBlocks.length,
			...afterLocalMoveUp()
		);
		mergeCrdtBlocks( localBlocks, reusableEditorBlocks, null );

		expect( ids( localBlocks ) ).toEqual( [ 'stable-paragraph', 'group' ] );
		expect( names( localBlocks ) ).toEqual( [
			'core/paragraph',
			'core/group',
		] );

		const blocks = localBlocks.toJSON() as Block[];
		expect( blocks[ 0 ].innerBlocks ).toHaveLength( 0 );
		expect( blocks[ 1 ].innerBlocks ).toHaveLength( 4 );

		localDoc.destroy();
		remoteDoc.destroy();
	} );
} );
