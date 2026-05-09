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
			name: 'core/group',
			attributes: {},
		},
		{
			name: 'core/table',
			attributes: {},
		},
	],
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	store: {},
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
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { getRootMap } from '../crdt-utils';

const SYNCED_BLOCK_PROPERTIES = new Set( [ 'blocks' ] );

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

function table(): Block {
	return {
		name: 'core/table',
		clientId: 'table',
		attributes: {},
		innerBlocks: [],
	};
}

function group( innerBlocks: Block[] = groupChildren() ): Block {
	return {
		name: 'core/group',
		clientId: 'group',
		attributes: { layout: { type: 'constrained' } },
		innerBlocks,
	};
}

function groupChildren(): Block[] {
	return [
		paragraph( 'nested-paragraph', 'Nested group paragraph.' ),
		heading( 'nested-heading', 'Nested group heading.' ),
	];
}

function initialBlocks(): Block[] {
	return [
		paragraph( 'sibling-paragraph', 'Sibling paragraph.' ),
		group(),
		heading( 'tail-heading', 'Tail heading.' ),
		table(),
	];
}

function tableMovedToTopBlocks(): Block[] {
	return [
		table(),
		paragraph( 'sibling-paragraph', 'Sibling paragraph.' ),
		group(),
		heading( 'tail-heading', 'Tail heading.' ),
	];
}

function tableMovedIntoGroupBlocks(): Block[] {
	return [
		paragraph( 'sibling-paragraph', 'Sibling paragraph.' ),
		group( [ table(), ...groupChildren() ] ),
		heading( 'tail-heading', 'Tail heading.' ),
	];
}

function labels( yblocks: YBlocks ): string[] {
	const describeBlock = ( block: Block ): string => {
		const name = block.name.replace( /^core\//, '' );
		const children =
			block.innerBlocks.length > 0
				? `[${ block.innerBlocks.map( describeBlock ).join( ',' ) }]`
				: '';
		return `${ name }:${ block.clientId }${ children }`;
	};

	return ( yblocks.toJSON() as Block[] ).map( describeBlock );
}

function postBlocks( doc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

describe( 'bcc959491960 table move into group replay', () => {
	it( 'does not graft group children onto a sibling paragraph after a stale top-level table reorder', () => {
		const primaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		const secondaryDoc = new Y.Doc();
		const secondaryBlocks = secondaryDoc.getArray< YBlock >();

		mergeCrdtBlocks( primaryBlocks, initialBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		mergeCrdtBlocks( secondaryBlocks, initialBlocks(), null );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

		mergeCrdtBlocks( primaryBlocks, tableMovedToTopBlocks(), null );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		expect( labels( secondaryBlocks ) ).toEqual( [
			'table:table',
			'paragraph:sibling-paragraph',
			'group:group[paragraph:nested-paragraph,heading:nested-heading]',
			'heading:tail-heading',
		] );

		mergeCrdtBlocks( secondaryBlocks, tableMovedIntoGroupBlocks(), null );
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		const expected = [
			'paragraph:sibling-paragraph',
			'group:group[table:table,paragraph:nested-paragraph,heading:nested-heading]',
			'heading:tail-heading',
		];
		expect( labels( secondaryBlocks ) ).toEqual( expected );
		expect( labels( primaryBlocks ) ).toEqual( expected );

		primaryDoc.destroy();
		secondaryDoc.destroy();
	} );

	it( 'replays the stale-cache interleaving through the post CRDT adapter', () => {
		const primaryDoc = new Y.Doc();
		const secondaryDoc = new Y.Doc();

		applyPostChangesToCRDTDoc(
			primaryDoc,
			{ blocks: initialBlocks() },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		applyPostChangesToCRDTDoc(
			secondaryDoc,
			{ blocks: initialBlocks() },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );

		applyPostChangesToCRDTDoc(
			primaryDoc,
			{ blocks: tableMovedToTopBlocks() },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		expect( labels( postBlocks( secondaryDoc ) ) ).toEqual( [
			'table:table',
			'paragraph:sibling-paragraph',
			'group:group[paragraph:nested-paragraph,heading:nested-heading]',
			'heading:tail-heading',
		] );

		applyPostChangesToCRDTDoc(
			secondaryDoc,
			{ blocks: tableMovedIntoGroupBlocks() },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( secondaryDoc ) );
		Y.applyUpdate( secondaryDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		const expected = [
			'paragraph:sibling-paragraph',
			'group:group[table:table,paragraph:nested-paragraph,heading:nested-heading]',
			'heading:tail-heading',
		];
		expect( labels( postBlocks( secondaryDoc ) ) ).toEqual( expected );
		expect( labels( postBlocks( primaryDoc ) ) ).toEqual( expected );

		primaryDoc.destroy();
		secondaryDoc.destroy();
	} );
} );
