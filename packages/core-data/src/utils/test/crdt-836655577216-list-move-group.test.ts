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
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( 'uuid', () => ( {
	v4: () => 'mocked-uuid',
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

function initialBlocks(): Block[] {
	return [
		{
			name: 'core/heading',
			clientId: 'heading',
			attributes: { content: 'Heading to delete' },
			innerBlocks: [],
		},
		{
			name: 'core/list',
			clientId: 'list',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/list-item',
					clientId: 'list-item-1',
					attributes: { content: 'One' },
					innerBlocks: [],
				},
				{
					name: 'core/list-item',
					clientId: 'list-item-2',
					attributes: { content: 'Two' },
					innerBlocks: [],
				},
				{
					name: 'core/list-item',
					clientId: 'list-item-3',
					attributes: { content: 'Three' },
					innerBlocks: [],
				},
			],
		},
		{
			name: 'core/group',
			clientId: 'group',
			attributes: {},
			innerBlocks: [
				paragraph( 'group-child-1', 'Group child one' ),
				paragraph( 'group-child-2', 'Group child two' ),
			],
		},
		{
			name: 'core/quote',
			clientId: 'quote',
			attributes: {},
			innerBlocks: [ paragraph( 'quote-child', 'Quote body' ) ],
		},
	];
}

function remoteHeadingDeleteAndPullquoteInsert(): Block[] {
	const [ , list, group, quote ] = initialBlocks();
	return [
		list,
		group,
		quote,
		{
			name: 'core/pullquote',
			clientId: 'pullquote',
			attributes: { value: 'Inserted pullquote' },
			innerBlocks: [],
		},
	];
}

function staleListMoveAboveHeading(): Block[] {
	const [ heading, list, group, quote ] = initialBlocks();
	return [ list, heading, group, quote ];
}

function summarize( yblocks: Y.Array< YBlock > ): string[] {
	return yblocks.toArray().map( ( block ) => {
		const innerBlocks = block.get( 'innerBlocks' ) as
			| Y.Array< YBlock >
			| undefined;
		return `${ block.get( 'name' ) }:${
			innerBlocks?.length ?? 0
		}:${ block.get( 'clientId' ) }`;
	} );
}

describe( 'RTC list move over group reconciliation', () => {
	it( 'rebases a stale list move over a remote heading delete and pullquote insert', () => {
		const doc = new Y.Doc();
		const yblocks = doc.getArray< YBlock >();
		const base = initialBlocks();

		mergeCrdtBlocks( yblocks, base, null );
		mergeCrdtBlocks(
			yblocks,
			remoteHeadingDeleteAndPullquoteInsert(),
			null,
			base
		);
		mergeCrdtBlocks( yblocks, staleListMoveAboveHeading(), null, base );

		expect( summarize( yblocks ) ).toEqual( [
			'core/list:3:list',
			'core/group:2:group',
			'core/quote:1:quote',
			'core/pullquote:0:pullquote',
		] );

		doc.destroy();
	} );

	it( 'keeps two clients converged when the same stale move races the remote edit', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		const yblocksA = docA.getArray< YBlock >();
		const yblocksB = docB.getArray< YBlock >();
		const base = initialBlocks();

		mergeCrdtBlocks( yblocksA, base, null );
		Y.applyUpdate( docB, Y.encodeStateAsUpdate( docA ) );

		mergeCrdtBlocks(
			yblocksA,
			remoteHeadingDeleteAndPullquoteInsert(),
			null,
			base
		);
		mergeCrdtBlocks( yblocksB, staleListMoveAboveHeading(), null, base );

		const updateA = Y.encodeStateAsUpdate( docA );
		const updateB = Y.encodeStateAsUpdate( docB );
		Y.applyUpdate( docA, updateB );
		Y.applyUpdate( docB, updateA );

		expect( summarize( yblocksA ) ).toEqual( summarize( yblocksB ) );
		expect( summarize( yblocksA ) ).toEqual( [
			'core/list:3:list',
			'core/group:2:group',
			'core/quote:1:quote',
			'core/pullquote:0:pullquote',
		] );

		docA.destroy();
		docB.destroy();
	} );
} );
