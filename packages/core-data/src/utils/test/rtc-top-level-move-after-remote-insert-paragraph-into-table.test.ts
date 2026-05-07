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
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlockAttributes,
} from '../crdt-blocks';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/table',
			attributes: {
				hasFixedLayout: { type: 'boolean' },
				body: {
					type: 'array',
					query: {
						cells: {
							type: 'array',
							query: {
								content: { type: 'rich-text' },
								tag: { type: 'string' },
							},
						},
					},
				},
			},
		},
	],
} ) );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function table( clientId: string, cells: string[] ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {
			hasFixedLayout: true,
			body: [
				{
					cells: cells.map( ( content ) => ( {
						content,
						tag: 'td',
					} ) ),
				},
			],
		},
		innerBlocks: [],
	};
}

function blockClientIds( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.clientId as string
	);
}

function blockNames( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => block.name );
}

function firstTableCell( yblock: YBlock ): string {
	const attrs = yblock.get( 'attributes' ) as YBlockAttributes;
	const body = attrs.get( 'body' ) as Y.Array< unknown >;
	const firstRow = body.get( 0 ) as Y.Map< unknown >;
	const cells = firstRow.get( 'cells' ) as Y.Array< unknown >;
	const firstCell = cells.get( 0 ) as Y.Map< unknown >;
	return ( firstCell.get( 'content' ) as Y.Text ).toString();
}

describe( 'RTC top-level move after remote insert near table', () => {
	it( 'does not rewrite a table Y block into the moved paragraph', () => {
		const doc = new Y.Doc();
		const yblocks = doc.getArray< YBlock >( 'blocks' );
		const initialBlocks = [
			paragraph( 'paragraph-a', 'Paragraph A' ),
			table( 'table', [ 'Table cell A', 'Table cell B' ] ),
			paragraph( 'paragraph-b', 'Paragraph B' ),
		];

		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const tableYBlock = yblocks.get( 1 );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'remote-inserted', 'Remote inserted paragraph' ),
				...initialBlocks,
			],
			null
		);
		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'remote-inserted', 'Remote inserted paragraph' ),
				paragraph( 'paragraph-a', 'Paragraph A' ),
				paragraph( 'paragraph-b', 'Paragraph B' ),
				table( 'table', [ 'Table cell A', 'Table cell B' ] ),
			],
			null
		);

		expect( blockClientIds( yblocks ) ).toEqual( [
			'remote-inserted',
			'paragraph-a',
			'paragraph-b',
			'table',
		] );
		expect( blockNames( yblocks ) ).toEqual( [
			'core/paragraph',
			'core/paragraph',
			'core/paragraph',
			'core/table',
		] );
		expect( yblocks.get( 3 ) ).toBe( tableYBlock );
		expect( firstTableCell( tableYBlock ) ).toBe( 'Table cell A' );

		doc.destroy();
	} );

	it( 'observes the move when the editor reuses the block array object after the remote insert', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const localBlocks = localDoc.getArray< YBlock >( 'blocks' );
		const remoteBlocks = remoteDoc.getArray< YBlock >( 'blocks' );
		const reusableEditorBlocks = [
			paragraph( 'paragraph-a', 'Paragraph A' ),
			table( 'table', [ 'Table cell A', 'Table cell B' ] ),
			paragraph( 'paragraph-b', 'Paragraph B' ),
		];

		mergeCrdtBlocks( localBlocks, reusableEditorBlocks, null );
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'remote-inserted', 'Remote inserted paragraph' ),
				paragraph( 'paragraph-a', 'Paragraph A' ),
				table( 'table', [ 'Table cell A', 'Table cell B' ] ),
				paragraph( 'paragraph-b', 'Paragraph B' ),
			],
			null
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		reusableEditorBlocks.splice(
			0,
			reusableEditorBlocks.length,
			paragraph( 'remote-inserted', 'Remote inserted paragraph' ),
			paragraph( 'paragraph-a', 'Paragraph A' ),
			paragraph( 'paragraph-b', 'Paragraph B' ),
			table( 'table', [ 'Table cell A', 'Table cell B' ] )
		);

		mergeCrdtBlocks( localBlocks, reusableEditorBlocks, null );

		expect( blockClientIds( localBlocks ) ).toEqual( [
			'remote-inserted',
			'paragraph-a',
			'paragraph-b',
			'table',
		] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );
} );
