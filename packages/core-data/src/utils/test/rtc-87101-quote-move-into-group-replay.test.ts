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
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/quote',
			attributes: {},
		},
		{
			name: 'core/group',
			attributes: {},
		},
		{
			name: 'core/list',
			attributes: {},
		},
		{
			name: 'core/list-item',
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

const HEADING_TEXT = 'Seed 953134 structured content';
const QUOTE_TEXT = 'Quoted content for merge and persistence checks.';
const ORIGINAL_PARAGRAPH = 'Nested group paragraph alpha.';
const UPDATED_PARAGRAPH = 'Nested update seed 953134 step 0 user 1 123189';
const BETA_PARAGRAPH = 'Nested group paragraph beta.';

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function heading(): Block {
	return {
		name: 'core/heading',
		clientId: 'heading',
		attributes: { content: HEADING_TEXT, level: 3 },
		innerBlocks: [],
	};
}

function quote(): Block {
	return {
		name: 'core/quote',
		clientId: 'quote',
		attributes: {},
		innerBlocks: [ paragraph( 'quote-paragraph', QUOTE_TEXT ) ],
	};
}

function group( firstParagraph = ORIGINAL_PARAGRAPH ): Block {
	return {
		name: 'core/group',
		clientId: 'group',
		attributes: { layout: { type: 'constrained' } },
		innerBlocks: [
			paragraph( 'nested-alpha', firstParagraph ),
			paragraph( 'nested-beta', BETA_PARAGRAPH ),
		],
	};
}

function groupWithQuote(): Block {
	return {
		...group( UPDATED_PARAGRAPH ),
		innerBlocks: [
			quote(),
			paragraph( 'nested-alpha', UPDATED_PARAGRAPH ),
			paragraph( 'nested-beta', BETA_PARAGRAPH ),
		],
	};
}

function list(): Block {
	return {
		name: 'core/list',
		clientId: 'list',
		attributes: {},
		innerBlocks: [
			{
				name: 'core/list-item',
				clientId: 'list-item-1',
				attributes: { content: 'List item one for block movement.' },
				innerBlocks: [],
			},
			{
				name: 'core/list-item',
				clientId: 'list-item-2',
				attributes: { content: 'List item two for delete coverage.' },
				innerBlocks: [],
			},
			{
				name: 'core/list-item',
				clientId: 'list-item-3',
				attributes: { content: 'List item three for sync coverage.' },
				innerBlocks: [],
			},
		],
	};
}

function initialBlocks(): Block[] {
	return [ heading(), group(), list(), quote() ];
}

function editedNestedBlocks(): Block[] {
	return [ heading(), group( UPDATED_PARAGRAPH ), list(), quote() ];
}

function quoteMovedToTopBlocks(): Block[] {
	return [ quote(), heading(), group( UPDATED_PARAGRAPH ), list() ];
}

function quoteMovedIntoGroupBlocks(): Block[] {
	return [ heading(), groupWithQuote(), list() ];
}

function labels( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => {
		const suffix =
			block.innerBlocks.length > 0
				? `[${ block.innerBlocks.length }]`
				: '';
		return `${ block.name.replace( /^core\//, '' ) }${ suffix }`;
	} );
}

describe( '87101fb17dd3 quote move into group replay', () => {
	it( 'does not graft group children onto the preceding heading after a stale top-level quote reorder', () => {
		const primaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		const secondaryDoc = new Y.Doc();
		const secondaryBlocks = secondaryDoc.getArray< YBlock >();

		mergeCrdtBlocks( primaryBlocks, initialBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		mergeCrdtBlocks( secondaryBlocks, editedNestedBlocks(), null );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

		mergeCrdtBlocks( primaryBlocks, quoteMovedToTopBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		expect( labels( secondaryBlocks ) ).toEqual( [
			'quote[1]',
			'heading',
			'group[2]',
			'list[3]',
		] );

		mergeCrdtBlocks( secondaryBlocks, quoteMovedIntoGroupBlocks(), null );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		const expected = [ 'heading', 'group[3]', 'list[3]' ];
		expect( labels( secondaryBlocks ) ).toEqual( expected );
		expect( labels( primaryBlocks ) ).toEqual( expected );

		primaryDoc.destroy();
		secondaryDoc.destroy();
	} );
} );
