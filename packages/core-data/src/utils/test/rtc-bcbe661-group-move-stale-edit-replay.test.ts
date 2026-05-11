/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

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

/**
 * Internal dependencies
 */
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';

const TARGET_OLD = 'moved target';
const TARGET_EDITED = 'moved target local edit';
const NESTED_PARAGRAPH = 'nested paragraph';
const NESTED_HEADING = 'nested heading';

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
		attributes: { content, level: 3 },
		innerBlocks: [],
	};
}

function group( innerBlocks: Block[] ): Block {
	return {
		name: 'core/group',
		clientId: 'group',
		attributes: { layout: { type: 'constrained' } },
		innerBlocks,
	};
}

function initialBlocks(): Block[] {
	return [
		paragraph( 'before-a', 'before A' ),
		paragraph( 'before-b', 'before B' ),
		paragraph( 'target', TARGET_OLD ),
		group( [
			paragraph( 'nested-paragraph', NESTED_PARAGRAPH ),
			heading( 'nested-heading', NESTED_HEADING ),
		] ),
		paragraph( 'tail', 'tail' ),
	];
}

function targetEditedTopLevelBlocks(): Block[] {
	return initialBlocks().map( ( block ) =>
		block.clientId === 'target'
			? paragraph( 'target', TARGET_EDITED )
			: block
	);
}

function targetMovedIntoGroupBlocks(): Block[] {
	return [
		paragraph( 'before-a', 'before A' ),
		paragraph( 'before-b', 'before B' ),
		group( [
			paragraph( 'target', TARGET_OLD ),
			paragraph( 'nested-paragraph', NESTED_PARAGRAPH ),
			heading( 'nested-heading', NESTED_HEADING ),
		] ),
		paragraph( 'tail', 'tail' ),
	];
}

function labels( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => {
		const suffix =
			block.innerBlocks.length > 0
				? `[${ block.innerBlocks.length }]`
				: '';
		const content = block.attributes?.content
			? `:${ block.attributes.content }`
			: '';
		return `${ block.clientId }:${ block.name.replace(
			/^core\//,
			''
		) }${ content }${ suffix }`;
	} );
}

describe( 'bcbe66104201 paragraph move into group replay', () => {
	it( 'keeps a stale local edit on a paragraph after that paragraph is remotely moved into a group', () => {
		const primaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		const secondaryDoc = new Y.Doc();
		const secondaryBlocks = secondaryDoc.getArray< YBlock >();

		mergeCrdtBlocks( primaryBlocks, initialBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		mergeCrdtBlocks( secondaryBlocks, targetMovedIntoGroupBlocks(), null );
		mergeCrdtBlocks( primaryBlocks, targetEditedTopLevelBlocks(), null );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

		mergeCrdtBlocks( primaryBlocks, targetEditedTopLevelBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

		const primaryJson = primaryBlocks.toJSON() as Block[];
		const secondaryJson = secondaryBlocks.toJSON() as Block[];
		const primaryGroup = primaryJson.find(
			( block ) => block.clientId === 'group'
		);
		const secondaryGroup = secondaryJson.find(
			( block ) => block.clientId === 'group'
		);

		expect( labels( primaryBlocks ) ).toEqual( [
			'before-a:paragraph:before A',
			'before-b:paragraph:before B',
			'group:group[3]',
			'tail:paragraph:tail',
		] );
		expect( labels( secondaryBlocks ) ).toEqual( labels( primaryBlocks ) );
		expect( primaryGroup?.attributes ).not.toHaveProperty( 'content' );
		expect( secondaryGroup?.attributes ).not.toHaveProperty( 'content' );
		expect( primaryGroup?.innerBlocks?.[ 0 ].attributes.content ).toBe(
			TARGET_EDITED
		);
		expect( secondaryGroup?.innerBlocks?.[ 0 ].attributes.content ).toBe(
			TARGET_EDITED
		);

		primaryDoc.destroy();
		secondaryDoc.destroy();
	} );
} );
