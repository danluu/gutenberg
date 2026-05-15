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

/**
 * Mock getBlockTypes so CRDT merging can identify rich-text attributes.
 */
jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) => `<p>${ block.attributes.content }</p>` )
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/pullquote',
				attributes: {
					value: { type: 'rich-text' },
					citation: { type: 'rich-text' },
				},
			},
			{
				name: 'core/table',
				attributes: {
					caption: { type: 'rich-text' },
					head: {
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
					foot: {
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
	};
} );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_BLOCK_PROPERTIES = new Set( [ 'blocks' ] );
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] = [] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks,
	};
}

function pullquote( clientId: string, value: string, citation: string ): Block {
	return {
		name: 'core/pullquote',
		clientId,
		attributes: { value, citation },
		innerBlocks: [],
	};
}

function table(
	clientId: string,
	cellContent: string,
	caption: string
): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {
			caption,
			head: [],
			body: [
				{
					cells: [
						{
							content: cellContent,
							tag: 'td',
						},
					],
				},
			],
			foot: [],
		},
		innerBlocks: [],
	};
}

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

function clientIdsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.clientId as string
	);
}

function allClientIdsOf( blocks: Block[] ): string[] {
	return blocks.flatMap( ( block ) => [
		block.clientId as string,
		...allClientIdsOf( block.innerBlocks ?? [] ),
	] );
}

function allBlocksOf( blocks: Block[] ): Block[] {
	return blocks.flatMap( ( block ) => [
		block,
		...allBlocksOf( block.innerBlocks ?? [] ),
	] );
}

function postBlocks( doc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
		.join( '\n\n' );
}

describe( 'stale top-level block snapshots', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'preserves a remote top-level append when a stale local edit touches a different block', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[ ...initialBlocks, paragraph( 'remote-appended', 'Gamma' ) ],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );

		const staleLocalBlocks = [
			paragraph( 'local-edited', 'Alpha local edit' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocks, null );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
			'Gamma',
		] );

		remoteDoc.destroy();
	} );

	it( 'preserves a remote top-level delete when a stale local edit touches a different block', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
			paragraph( 'remote-deleted', 'Gamma' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'local-edited', 'Alpha' ),
				paragraph( 'unchanged', 'Beta' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Alpha', 'Beta' ] );

		const staleLocalBlocks = [
			paragraph( 'local-edited', 'Alpha local edit' ),
			paragraph( 'unchanged', 'Beta' ),
			paragraph( 'remote-deleted', 'Gamma' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocks, null );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
		] );

		remoteDoc.destroy();
	} );

	it( 'preserves a remote rich-text edit when a stale local edit touches a different block', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'remote-edited', 'Beta' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'local-edited', 'Alpha' ),
				paragraph( 'remote-edited', 'Beta remote edit' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Beta remote edit',
		] );

		const staleLocalBlocks = [
			paragraph( 'local-edited', 'Alpha stale edit' ),
			paragraph( 'remote-edited', 'Beta' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocks, null );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha stale edit',
			'Beta remote edit',
		] );

		remoteDoc.destroy();
	} );

	it( 'derives post content from merged blocks instead of stale serialized content', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'remote-edited', 'Beta' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: initialBlocks,
				content: serializeBlocks( initialBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const remoteBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'remote-edited', 'Beta remote edit' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: remoteBlocks,
				content: serializeBlocks( remoteBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( postContent( doc ) ).toContain( 'Beta remote edit' );

		const staleLocalBlocks = [
			paragraph( 'local-edited', 'Alpha stale edit' ),
			paragraph( 'remote-edited', 'Beta' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: staleLocalBlocks,
				content: serializeBlocks( staleLocalBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha stale edit',
			'Beta remote edit',
		] );
		expect( postContent( doc ) ).toContain( 'Alpha stale edit' );
		expect( postContent( doc ) ).toContain( 'Beta remote edit' );

		remoteDoc.destroy();
	} );

	it( 'preserves a remote top-level append through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					...initialBlocks,
					paragraph( 'remote-appended', 'Gamma' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Beta',
			'Gamma',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'local-edited', 'Alpha local edit' ),
					paragraph( 'unchanged', 'Beta' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha local edit',
			'Beta',
			'Gamma',
		] );

		remoteDoc.destroy();
	} );

	it( 'deletes a cached previous-local top-level block without mutating it into the retained successor', () => {
		const initialBlocks = [
			paragraph( 'inserted', 'Inserted' ),
			paragraph( 'deleted-original', 'Deleted original' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[ ...initialBlocks, paragraph( 'remote-appended', 'Remote' ) ],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		const deletedYBlock = yblocks.get( 1 );
		const tailYBlock = yblocks.get( 2 );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Inserted',
			'Deleted original',
			'Tail',
			'Remote',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'inserted', 'Inserted' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Inserted',
			'Tail',
			'Remote',
		] );
		expect( yblocks.toArray() ).not.toContain( deletedYBlock );
		expect( yblocks.get( 1 ) ).toBe( tailYBlock );

		remoteDoc.destroy();
	} );

	it( 'deletes a cached previous-local top-level block through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'inserted', 'Inserted' ),
			paragraph( 'deleted-original', 'Deleted original' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					...initialBlocks,
					paragraph( 'remote-appended', 'Remote' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		const yPostBlocks = postBlocks( doc );
		const deletedYBlock = yPostBlocks.get( 1 );
		const tailYBlock = yPostBlocks.get( 2 );
		expect( contentsOf( yPostBlocks ) ).toEqual( [
			'Inserted',
			'Deleted original',
			'Tail',
			'Remote',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'inserted', 'Inserted' ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( contentsOf( yPostBlocks ) ).toEqual( [
			'Inserted',
			'Tail',
			'Remote',
		] );
		expect( yPostBlocks.toArray() ).not.toContain( deletedYBlock );
		expect( yPostBlocks.get( 1 ) ).toBe( tailYBlock );

		remoteDoc.destroy();
	} );

	it( 'reorders cached previous-local top-level blocks without mutating a block into a current-only insert', () => {
		const initialBlocks = [
			paragraph( 'anchor', 'Anchor' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'anchor', 'Anchor' ),
				paragraph( 'moved', 'Moved' ),
				paragraph( 'remote', 'Remote' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'anchor',
			'moved',
			'remote',
			'tail',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'anchor', 'Anchor' ),
				paragraph( 'remote', 'Remote' ),
				paragraph( 'tail', 'Tail' ),
				paragraph( 'moved', 'Moved' ),
			],
			null
		);

		expect( clientIdsOf( yblocks ) ).toEqual( [
			'anchor',
			'remote',
			'tail',
			'moved',
		] );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Anchor',
			'Remote',
			'Tail',
			'Moved',
		] );

		remoteDoc.destroy();
	} );

	it( 'reorders a one-block previous-local cache without mutating it into a current-only insert', () => {
		const initialBlocks = [ paragraph( 'anchor', 'Anchor' ) ];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'anchor', 'Anchor' ),
				paragraph( 'remote', 'Remote' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( yblocks ) ).toEqual( [ 'anchor', 'remote' ] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'remote', 'Remote' ),
				paragraph( 'anchor', 'Anchor' ),
			],
			null
		);

		expect( clientIdsOf( yblocks ) ).toEqual( [ 'remote', 'anchor' ] );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Remote', 'Anchor' ] );

		remoteDoc.destroy();
	} );

	it( 'reorders cached previous-local top-level blocks through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'anchor', 'Anchor' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					paragraph( 'anchor', 'Anchor' ),
					paragraph( 'moved', 'Moved' ),
					paragraph( 'remote', 'Remote' ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		const yPostBlocks = postBlocks( doc );
		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'anchor',
			'moved',
			'remote',
			'tail',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'anchor', 'Anchor' ),
					paragraph( 'remote', 'Remote' ),
					paragraph( 'tail', 'Tail' ),
					paragraph( 'moved', 'Moved' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'anchor',
			'remote',
			'tail',
			'moved',
		] );
		expect( contentsOf( yPostBlocks ) ).toEqual( [
			'Anchor',
			'Remote',
			'Tail',
			'Moved',
		] );

		remoteDoc.destroy();
	} );

	it( 'reorders retained previous-local blocks after a cached delete', () => {
		const initialBlocks = [
			paragraph( 'baseline', 'Baseline' ),
			paragraph( 'middle', 'Middle' ),
			paragraph( 'shared', 'Shared' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'baseline', 'Baseline' ),
				paragraph( 'shared', 'Shared' ),
			],
			null
		);
		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'shared', 'Shared' ),
				paragraph( 'baseline', 'Baseline' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( yblocks ) ).toEqual( [ 'shared', 'baseline' ] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'baseline', 'Baseline' ),
				paragraph( 'shared', 'Shared' ),
			],
			null
		);

		expect( clientIdsOf( yblocks ) ).toEqual( [ 'baseline', 'shared' ] );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Baseline', 'Shared' ] );

		remoteDoc.destroy();
	} );

	it( 'reorders retained previous-local blocks after a cached delete through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'baseline', 'Baseline' ),
			paragraph( 'middle', 'Middle' ),
			paragraph( 'shared', 'Shared' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					paragraph( 'baseline', 'Baseline' ),
					paragraph( 'shared', 'Shared' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					paragraph( 'shared', 'Shared' ),
					paragraph( 'baseline', 'Baseline' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		const yPostBlocks = postBlocks( doc );
		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'shared',
			'baseline',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'baseline', 'Baseline' ),
					paragraph( 'shared', 'Shared' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'baseline',
			'shared',
		] );
		expect( contentsOf( yPostBlocks ) ).toEqual( [ 'Baseline', 'Shared' ] );

		remoteDoc.destroy();
	} );

	it( 'does not merge a stale identified table into a different live paragraph', () => {
		const baseBlocks = [
			table( 'stale-table', 'A', 'Old caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Live paragraph' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'remote-extra', 'Remote append' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-table', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
			'remote-extra',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Live paragraph' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'live-para', 'Edited live paragraph' ),
				paragraph( 'tail', 'Tail' ),
				paragraph( 'remote-extra', 'Remote append' ),
			],
			null
		);

		expect( ( yblocks.toJSON() as Block[] )[ 0 ].attributes.content ).toBe(
			'Edited live paragraph'
		);
	} );

	it( 'does not merge a stale identified table through the post CRDT adapter', () => {
		const baseBlocks = [
			table( 'stale-table', 'A', 'Old caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Live paragraph' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'remote-extra', 'Remote append' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-table', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const yPostBlocks = postBlocks( doc );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		const blocks = yPostBlocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
			'remote-extra',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Live paragraph' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'live-para', 'Edited live paragraph' ),
					paragraph( 'tail', 'Tail' ),
					paragraph( 'remote-extra', 'Remote append' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect(
			( yPostBlocks.toJSON() as Block[] )[ 0 ].attributes.content
		).toBe( 'Edited live paragraph' );
	} );

	it( 'does not positionally merge an equal-length stale identified table into a different live paragraph', () => {
		const baseBlocks = [
			table( 'stale-table', 'A', 'Old caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Live paragraph' ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-table', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Live paragraph' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'live-para', 'Edited live paragraph' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		expect( ( yblocks.toJSON() as Block[] )[ 0 ].attributes.content ).toBe(
			'Edited live paragraph'
		);
	} );

	it( 'does not positionally merge an equal-length stale identified table through the post CRDT adapter', () => {
		const baseBlocks = [
			table( 'stale-table', 'A', 'Old caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Live paragraph' ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-table', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const yPostBlocks = postBlocks( doc );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		const blocks = yPostBlocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Live paragraph' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'live-para', 'Edited live paragraph' ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect(
			( yPostBlocks.toJSON() as Block[] )[ 0 ].attributes.content
		).toBe( 'Edited live paragraph' );
	} );

	it( 'does not merge a stale block transform into a different live paragraph', () => {
		const baseBlocks = [
			paragraph( 'stale-block', 'Old paragraph' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Live paragraph' ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-block', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Live paragraph' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );
	} );

	it( 'does not semantically merge a stale block transform into a different live paragraph', () => {
		const baseBlocks = [
			paragraph( 'stale-block', 'Same' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Same' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'remote-extra', 'Remote append' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-block', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
			'remote-extra',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Same' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );
	} );

	it( 'does not semantically merge a stale block transform through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'stale-block', 'Same' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'live-para', 'Same' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'remote-extra', 'Remote append' ),
		];
		const staleIncomingBlocks = [
			table( 'stale-block', 'A local', 'Local caption' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const yPostBlocks = postBlocks( doc );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		const blocks = yPostBlocks.toJSON() as Block[];
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'live-para',
			'tail',
			'remote-extra',
		] );
		expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 0 ].attributes.content ).toBe( 'Same' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'caption' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'body' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'head' );
		expect( blocks[ 0 ].attributes ).not.toHaveProperty( 'foot' );
	} );

	it( 'retires a cached previous-local top-level source when the block moves into a current-only group', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				paragraph( 'moved', 'Moved' ),
				group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [
					paragraph( 'nested', 'Nested' ),
					paragraph( 'moved', 'Moved' ),
				] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );

		const blocks = yblocks.toJSON() as Block[];
		expect( allClientIdsOf( blocks ) ).toEqual( [
			'heading',
			'group',
			'nested',
			'moved',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );

		remoteDoc.destroy();
	} );

	it( 'retires a cached previous-local top-level source through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					paragraph( 'heading', 'Heading' ),
					paragraph( 'moved', 'Moved' ),
					group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		const yPostBlocks = postBlocks( doc );
		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'heading', 'Heading' ),
					group( 'group', [
						paragraph( 'nested', 'Nested' ),
						paragraph( 'moved', 'Moved' ),
					] ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );

		const blocks = yPostBlocks.toJSON() as Block[];
		expect( allClientIdsOf( blocks ) ).toEqual( [
			'heading',
			'group',
			'nested',
			'moved',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );

		remoteDoc.destroy();
	} );

	it( 'preserves a current source edit while retiring a cached previous-local top-level source', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				paragraph( 'moved', 'Moved remotely' ),
				group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [
					paragraph( 'nested', 'Nested' ),
					paragraph( 'moved', 'Moved' ),
				] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.content ).toBe(
			'Moved remotely'
		);

		remoteDoc.destroy();
	} );

	it( 'preserves a current-only sibling while retiring a cached previous-local top-level source', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'moved', 'Moved' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				paragraph( 'moved', 'Moved' ),
				group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
				paragraph( 'note', 'Fresh remote note' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [
					paragraph( 'nested', 'Nested' ),
					paragraph( 'moved', 'Moved' ),
				] ),
				paragraph( 'note', 'Stale local note' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'note',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );
		expect( blocks[ 2 ].attributes.content ).toBe( 'Fresh remote note' );

		remoteDoc.destroy();
	} );

	it( 'retires an explicit-base stale top-level source moved into a group', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );
		expect( allClientIdsOf( blocks ) ).toEqual( [
			'heading',
			'group',
			'nested',
			'moved',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );
		expect( blocks[ 1 ].innerBlocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.value ).toBe(
			'Current quote'
		);
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.citation ).toBe(
			'Current citation'
		);
		expect( blocks[ 2 ].name ).toBe( 'core/paragraph' );
		expect( blocks[ 2 ].attributes.content ).toBe( 'Tail' );
		expect( blocks[ 2 ].attributes ).not.toHaveProperty( 'value' );
		expect( blocks[ 2 ].attributes ).not.toHaveProperty( 'citation' );
	} );

	it( 'retires an explicit-base stale top-level source through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const yPostBlocks = postBlocks( doc );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		const blocks = yPostBlocks.toJSON() as Block[];
		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );
		expect( allClientIdsOf( blocks ) ).toEqual( [
			'heading',
			'group',
			'nested',
			'moved',
			'tail',
		] );
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.value ).toBe(
			'Current quote'
		);
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.citation ).toBe(
			'Current citation'
		);
		expect( blocks[ 2 ].attributes ).not.toHaveProperty( 'value' );
		expect( blocks[ 2 ].attributes ).not.toHaveProperty( 'citation' );
	} );

	it( 'does not retire an explicit-base source when the destination has independent nested content', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'note', 'Current-only note' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote' );
		expect( blocks[ 1 ].attributes.citation ).toBe( 'Current citation' );
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'note' ] );
		expect( blocks[ 2 ].innerBlocks[ 0 ].attributes.content ).toBe(
			'Current-only note'
		);
	} );

	it( 'preserves a current-only sibling while retiring an explicit-base stale top-level source', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'note', 'Fresh current note' ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'note', 'Stale incoming note' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'note',
			'tail',
		] );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested', 'moved' ] );
		expect( blocks[ 1 ].innerBlocks[ 1 ].attributes.value ).toBe(
			'Current quote'
		);
		expect( blocks[ 2 ].attributes.content ).toBe( 'Fresh current note' );
	} );

	it( 'does not retire an explicit-base source when the top-level order also changes', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'heading', 'Heading' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote' );
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested' ] );
	} );

	it( 'does not retire multiple explicit-base top-level sources in one guarded merge', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved-a', 'Base quote A', 'Base citation A' ),
			pullquote( 'moved-b', 'Base quote B', 'Base citation B' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved-a', 'Current quote A', 'Current citation A' ),
			pullquote( 'moved-b', 'Current quote B', 'Current citation B' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved-a', 'Base quote A', 'Base citation A' ),
				pullquote( 'moved-b', 'Base quote B', 'Base citation B' ),
			] ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved-a',
			'moved-b',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote A' );
		expect( blocks[ 2 ].attributes.value ).toBe( 'Current quote B' );
		expect(
			blocks[ 3 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested' ] );
	} );

	it( 'does not retire an explicit-base source when top-level incoming IDs are duplicated', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'heading', 'Duplicate heading' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote' );
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested' ] );
	} );

	it( 'does not retire an explicit-base source when a top-level incoming ID is missing', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			{
				name: 'core/paragraph',
				attributes: { content: 'Missing id' },
				innerBlocks: [],
			},
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote' );
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested' ] );
	} );

	it( 'does not merge an explicit-base source that appears both top-level and nested', () => {
		const baseBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const currentBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Current quote', 'Current citation' ),
			group( 'group', [ paragraph( 'nested', 'Nested' ) ] ),
			paragraph( 'tail', 'Tail' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'heading', 'Heading' ),
			pullquote( 'moved', 'Base quote', 'Base citation' ),
			group( 'group', [
				paragraph( 'nested', 'Nested' ),
				pullquote( 'moved', 'Base quote', 'Base citation' ),
			] ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );

		mergeCrdtBlocks( yblocks, staleIncomingBlocks, null, baseBlocks );

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].name ).toBe( 'core/pullquote' );
		expect( blocks[ 1 ].attributes.value ).toBe( 'Current quote' );
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'nested' ] );
	} );

	it( 'retires a current-only table source when a stale snapshot moves it into a group', () => {
		const currentTable = table( 'moved-table', 'Cell', 'Caption' );
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				currentTable,
				group( 'group' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved-table',
			'group',
			'tail',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [ table( 'moved-table', 'Cell', 'Caption' ) ] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		const blocks = yblocks.toJSON() as Block[];
		const tables = allBlocksOf( blocks ).filter(
			( block ) => block.name === 'core/table'
		);
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'group',
			'tail',
		] );
		expect( tables ).toHaveLength( 1 );
		expect(
			blocks[ 1 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'moved-table' ] );
		expect( blocks[ 1 ].innerBlocks[ 0 ].attributes.caption ).toBe(
			'Caption'
		);
		expect(
			blocks[ 1 ].innerBlocks[ 0 ].attributes.body[ 0 ].cells[ 0 ].content
		).toBe( 'Cell' );

		remoteDoc.destroy();
	} );

	it( 'does not retire a current-only table source when the destination has current-only nested content', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				table( 'moved-table', 'Cell', 'Caption' ),
				group( 'group', [ paragraph( 'note', 'Note' ) ] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [
					paragraph( 'note', 'Note' ),
					table( 'moved-table', 'Cell', 'Caption' ),
				] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved-table',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].attributes.caption ).toBe( 'Caption' );
		expect( blocks[ 1 ].attributes.body[ 0 ].cells[ 0 ].content ).toBe(
			'Cell'
		);
		expect(
			blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId )
		).toContain( 'note' );

		remoteDoc.destroy();
	} );

	it( 'does not retire a current-only table source when the nested payload differs', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			group( 'group' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				paragraph( 'heading', 'Heading' ),
				table( 'moved-table', 'Current cell', 'Current caption' ),
				group( 'group' ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'heading', 'Heading' ),
				group( 'group', [
					table( 'moved-table', 'Incoming cell', 'Incoming caption' ),
				] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		const blocks = yblocks.toJSON() as Block[];
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'heading',
			'moved-table',
			'group',
			'tail',
		] );
		expect( blocks[ 1 ].attributes.caption ).toBe( 'Current caption' );
		expect( blocks[ 1 ].attributes.body[ 0 ].cells[ 0 ].content ).toBe(
			'Current cell'
		);

		remoteDoc.destroy();
	} );
} );
