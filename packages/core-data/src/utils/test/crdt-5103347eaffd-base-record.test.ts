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

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;

	return {
		...actual,
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/search',
				attributes: {
					label: { type: 'string' },
					buttonText: { type: 'string' },
				},
			},
			{
				name: 'core/table',
				attributes: {
					hasFixedLayout: { type: 'boolean' },
					body: { type: 'array' },
				},
			},
			{
				name: 'core/list',
				attributes: { ordered: { type: 'boolean' } },
			},
			{
				name: 'core/list-item',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

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
		clientId,
		name: 'core/paragraph',
		attributes: { content },
		innerBlocks: [],
	};
}

function search( clientId: string ): Block {
	return {
		clientId,
		name: 'core/search',
		attributes: {
			label: 'Search posts',
			buttonText: 'Search',
		},
		innerBlocks: [],
	};
}

function table( clientId: string ): Block {
	return {
		clientId,
		name: 'core/table',
		attributes: {
			hasFixedLayout: true,
			body: [
				{
					cells: [ { content: 'Cell A' }, { content: 'Cell B' } ],
				},
			],
		},
		innerBlocks: [],
	};
}

function list( clientId: string ): Block {
	return {
		clientId,
		name: 'core/list',
		attributes: { ordered: false },
		innerBlocks: [
			{
				clientId: `${ clientId }-item`,
				name: 'core/list-item',
				attributes: { content: 'List item' },
				innerBlocks: [],
			},
		],
	};
}

function blockSummaries( yblocks: YBlocks ) {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => ( {
		clientId: block.clientId,
		name: block.name,
		attributes: block.attributes,
		innerClientIds: ( block.innerBlocks ?? [] ).map(
			( innerBlock ) => innerBlock.clientId
		),
	} ) );
}

describe( '5103347eaffd base-record merge path', () => {
	let doc: Y.Doc;
	let yblocks: YBlocks;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'preserves a remote insert when a stale local top-level move supplies its pre-change base', () => {
		const initialBlocks = [
			paragraph( 'paragraph-a', 'Paragraph A' ),
			search( 'search-a' ),
			table( 'table-a' ),
			list( 'list-a' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				initialBlocks[ 0 ],
				paragraph( 'remote-paragraph', 'Remote paragraph' ),
				initialBlocks[ 1 ],
				initialBlocks[ 2 ],
				initialBlocks[ 3 ],
			],
			null,
			initialBlocks
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect(
			blockSummaries( yblocks ).map( ( block ) => block.clientId )
		).toEqual( [
			'paragraph-a',
			'remote-paragraph',
			'search-a',
			'table-a',
			'list-a',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				initialBlocks[ 2 ],
				initialBlocks[ 0 ],
				initialBlocks[ 1 ],
				initialBlocks[ 3 ],
			],
			null,
			initialBlocks
		);

		expect( blockSummaries( yblocks ) ).toEqual( [
			{
				clientId: 'table-a',
				name: 'core/table',
				attributes: {
					hasFixedLayout: true,
					body: [
						{
							cells: [
								{ content: 'Cell A' },
								{ content: 'Cell B' },
							],
						},
					],
				},
				innerClientIds: [],
			},
			{
				clientId: 'paragraph-a',
				name: 'core/paragraph',
				attributes: { content: 'Paragraph A' },
				innerClientIds: [],
			},
			{
				clientId: 'remote-paragraph',
				name: 'core/paragraph',
				attributes: { content: 'Remote paragraph' },
				innerClientIds: [],
			},
			{
				clientId: 'search-a',
				name: 'core/search',
				attributes: {
					label: 'Search posts',
					buttonText: 'Search',
				},
				innerClientIds: [],
			},
			{
				clientId: 'list-a',
				name: 'core/list',
				attributes: { ordered: false },
				innerClientIds: [ 'list-a-item' ],
			},
		] );

		remoteDoc.destroy();
	} );
} );
