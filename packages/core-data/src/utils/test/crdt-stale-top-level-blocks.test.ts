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
} );
