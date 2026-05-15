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

function table( clientId: string ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {},
		innerBlocks: [],
	};
}

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

function blockTreeOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( blockTreeSignature );
}

function blockTreeSignature( block: Block ): string {
	if ( block.name === 'core/group' ) {
		return `${ block.clientId }:${ block.name }[${ block.innerBlocks
			.map( blockTreeSignature )
			.join( ',' ) }]`;
	}

	return `${ block.clientId }:${ block.attributes.content }`;
}

function clientIdsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.clientId ?? ''
	);
}

function blockIdentityLabels( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => `${ block.name }:${ block.clientId }`
	);
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

	it( 'applies a local suffix append when the explicit base differs from current blocks', () => {
		const baseBlocks = [
			paragraph( 'canonicalized', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const currentBlocks = [
			paragraph( 'canonicalized', 'Alpha canonicalized' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const blocksWithLocalAppend = [
			...baseBlocks,
			paragraph( 'checkpoint-paragraph', 'Checkpoint paragraph' ),
			paragraph( 'checkpoint-search', 'Checkpoint search' ),
		];

		mergeCrdtBlocks( yblocks, currentBlocks, null );
		mergeCrdtBlocks( yblocks, blocksWithLocalAppend, null, baseBlocks );
		mergeCrdtBlocks( yblocks, blocksWithLocalAppend, null, baseBlocks );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha canonicalized',
			'Beta',
			'Checkpoint paragraph',
			'Checkpoint search',
		] );
	} );

	it( 'inserts a missing local checkpoint paragraph before an already-present suffix block', () => {
		const baseBlocks = [
			paragraph( 'intro', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const currentBlocks = [
			...baseBlocks,
			paragraph( 'checkpoint-search', 'Checkpoint search' ),
		];
		const blocksWithLocalAppend = [
			...baseBlocks,
			paragraph( 'checkpoint-paragraph', 'Checkpoint paragraph' ),
			paragraph( 'checkpoint-search', 'Checkpoint search' ),
		];

		mergeCrdtBlocks( yblocks, currentBlocks, null );
		mergeCrdtBlocks( yblocks, blocksWithLocalAppend, null, baseBlocks );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Checkpoint paragraph',
			'Checkpoint search',
		] );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'intro',
			'unchanged',
			'checkpoint-paragraph',
			'checkpoint-search',
		] );
	} );

	it( 'does not collapse distinct appended blocks with matching content', () => {
		const baseBlocks = [ paragraph( 'base', 'Alpha' ) ];
		const currentBlocks = [
			...baseBlocks,
			paragraph( 'remote-appended', 'Duplicate content' ),
		];
		const blocksWithLocalAppend = [
			...baseBlocks,
			paragraph( 'local-appended', 'Duplicate content' ),
		];

		mergeCrdtBlocks( yblocks, currentBlocks, null );
		mergeCrdtBlocks( yblocks, blocksWithLocalAppend, null, baseBlocks );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Duplicate content',
			'Duplicate content',
		] );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'base',
			'local-appended',
			'remote-appended',
		] );
	} );

	it( 'does not append a stale suffix when the base tail anchor is absent', () => {
		const baseBlocks = [
			paragraph( 'base-start', 'Alpha' ),
			paragraph( 'base-tail', 'Beta' ),
		];
		const currentBlocks = [
			paragraph( 'base-start', 'Alpha' ),
			paragraph( 'replacement', 'Beta' ),
			paragraph( 'remote-tail', 'Remote tail' ),
		];
		const blocksWithLocalAppend = [
			...baseBlocks,
			paragraph( 'local-appended', 'Local suffix' ),
		];

		mergeCrdtBlocks( yblocks, currentBlocks, null );
		mergeCrdtBlocks( yblocks, blocksWithLocalAppend, null, baseBlocks );

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Remote tail',
		] );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'base-start',
			'replacement',
			'remote-tail',
		] );
	} );

	it( 'applies an explicit-base suffix append through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'canonicalized', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const currentBlocks = [
			paragraph( 'canonicalized', 'Alpha canonicalized' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const blocksWithLocalAppend = [
			...baseBlocks,
			paragraph( 'checkpoint-paragraph', 'Checkpoint paragraph' ),
		];

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: blocksWithLocalAppend },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha canonicalized',
			'Beta',
			'Checkpoint paragraph',
		] );
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

	it( 'preserves a remote move into a group when a stale local edit still has the moved source top-level', () => {
		const initialBlocks = [
			paragraph( 'moved', 'Moved' ),
			group( 'target-group' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				group( 'target-group', [ paragraph( 'moved', 'Moved' ) ] ),
				paragraph( 'tail', 'Tail' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( blockTreeOf( yblocks ) ).toEqual( [
			'target-group:core/group[moved:Moved]',
			'tail:Tail',
		] );

		const staleLocalBlocks = [
			paragraph( 'moved', 'Moved' ),
			group( 'target-group' ),
			paragraph( 'tail', 'Tail local edit' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocks, null );

		expect( blockTreeOf( yblocks ) ).toEqual( [
			'target-group:core/group[moved:Moved]',
			'tail:Tail local edit',
		] );

		remoteDoc.destroy();
	} );

	it( 'preserves identity when a stale top-level move follows a remote append and group prepend', () => {
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'long', 'LongParagraph' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[ ...initialBlocks, paragraph( 'inserted', 'InsertedParagraph' ) ],
			null
		);
		mergeCrdtBlocks(
			remoteBlocks,
			[
				group( 'prepended-group' ),
				...initialBlocks,
				paragraph( 'inserted', 'InsertedParagraph' ),
			],
			null
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( blockTreeOf( yblocks ) ).toEqual( [
			'prepended-group:core/group[]',
			'heading:Heading',
			'tail:Tail',
			'long:LongParagraph',
			'inserted:InsertedParagraph',
		] );

		const staleLocalMove = [
			group( 'prepended-group' ),
			paragraph( 'heading', 'Heading' ),
			paragraph( 'tail', 'Tail' ),
			paragraph( 'inserted', 'InsertedParagraph' ),
			paragraph( 'long', 'LongParagraph' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalMove, null );

		expect( blockTreeOf( yblocks ) ).toEqual( [
			'prepended-group:core/group[]',
			'heading:Heading',
			'tail:Tail',
			'inserted:InsertedParagraph',
			'long:LongParagraph',
		] );

		remoteDoc.destroy();
	} );

	it( 'applies a stale local top-level delete while preserving a remote append', () => {
		const baseBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'deleted', 'Deleted' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, baseBlocks, null );

		const currentBlocks = [
			...baseBlocks,
			paragraph( 'remote-appended', 'Remote' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Deleted',
			'Tail',
			'Remote',
		] );

		mergeCrdtBlocks(
			yblocks,
			[ paragraph( 'alpha', 'Alpha' ), paragraph( 'tail', 'Tail' ) ],
			null,
			baseBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Tail',
			'Remote',
		] );
	} );

	it( 'applies a stale local trailing table delete while preserving a remote append', () => {
		const baseBlocks = [ paragraph( 'alpha', 'Alpha' ), table( 'table' ) ];
		mergeCrdtBlocks( yblocks, baseBlocks, null );

		const currentBlocks = [
			...baseBlocks,
			paragraph( 'remote-appended', 'Remote' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );
		expect( blockIdentityLabels( yblocks ) ).toEqual( [
			'core/paragraph:alpha',
			'core/table:table',
			'core/paragraph:remote-appended',
		] );

		mergeCrdtBlocks(
			yblocks,
			[ paragraph( 'alpha', 'Alpha' ) ],
			null,
			baseBlocks
		);

		expect( blockIdentityLabels( yblocks ) ).toEqual( [
			'core/paragraph:alpha',
			'core/paragraph:remote-appended',
		] );
	} );

	it( 'applies a stale local top-level delete through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'deleted', 'Deleted' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: baseBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const currentBlocks = [
			...baseBlocks,
			paragraph( 'remote-appended', 'Remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Deleted',
			'Tail',
			'Remote',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'alpha', 'Alpha' ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Tail',
			'Remote',
		] );
	} );

	it( 'applies a stale local middle insert while preserving a remote insert', () => {
		const baseBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, baseBlocks, null );

		const currentBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'remote-inserted', 'Remote' ),
			paragraph( 'tail', 'Tail' ),
		];
		mergeCrdtBlocks( yblocks, currentBlocks, null );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Remote',
			'Tail',
		] );

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'alpha', 'Alpha' ),
				paragraph( 'inserted', 'Inserted' ),
				paragraph( 'beta', 'Beta' ),
				paragraph( 'tail', 'Tail' ),
			],
			null,
			baseBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Inserted',
			'Beta',
			'Remote',
			'Tail',
		] );
	} );

	it( 'applies a stale local middle insert through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: baseBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const currentBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'remote-inserted', 'Remote' ),
			paragraph( 'tail', 'Tail' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Beta',
			'Remote',
			'Tail',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'alpha', 'Alpha' ),
					paragraph( 'inserted', 'Inserted' ),
					paragraph( 'beta', 'Beta' ),
					paragraph( 'tail', 'Tail' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Inserted',
			'Beta',
			'Remote',
			'Tail',
		] );
	} );

	it( 'preserves retained top-level siblings when a stale explicit-base move follows a current-only insert', () => {
		const baseBlocks = [
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];
		const currentBlocks = [
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph( 'inserted', 'Inserted after the base snapshot.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];
		const staleMovedBlocks = [
			paragraph( 'inserted', 'Inserted after the base snapshot.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];

		mergeCrdtBlocks( yblocks, baseBlocks, null );
		mergeCrdtBlocks( yblocks, currentBlocks, null );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'baseline',
			'inserted',
			'second',
			'shared',
		] );

		mergeCrdtBlocks( yblocks, staleMovedBlocks, null, baseBlocks );

		expect( clientIdsOf( yblocks ) ).toEqual( [
			'inserted',
			'second',
			'baseline',
			'shared',
		] );
		expect( contentsOf( yblocks ) ).toEqual( [
			'Inserted after the base snapshot.',
			'Seed 953452 keeps a second paragraph for deletes and moves.',
			'Seed 953452 baseline paragraph.',
			'Shared editing target paragraph.',
		] );
	} );

	it( 'preserves retained top-level siblings with an explicit base through the post CRDT adapter', () => {
		const baseBlocks = [
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];
		const currentBlocks = [
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph( 'inserted', 'Inserted after the base snapshot.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];
		const staleMovedBlocks = [
			paragraph( 'inserted', 'Inserted after the base snapshot.' ),
			paragraph(
				'second',
				'Seed 953452 keeps a second paragraph for deletes and moves.'
			),
			paragraph( 'baseline', 'Seed 953452 baseline paragraph.' ),
			paragraph( 'shared', 'Shared editing target paragraph.' ),
		];

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: baseBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: currentBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const yPostBlocks = postBlocks( doc );
		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'baseline',
			'inserted',
			'second',
			'shared',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleMovedBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		expect( clientIdsOf( yPostBlocks ) ).toEqual( [
			'inserted',
			'second',
			'baseline',
			'shared',
		] );
		expect( contentsOf( yPostBlocks ) ).toEqual( [
			'Inserted after the base snapshot.',
			'Seed 953452 keeps a second paragraph for deletes and moves.',
			'Seed 953452 baseline paragraph.',
			'Shared editing target paragraph.',
		] );
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

	it( 'preserves top-level order when a stale insert follows a converged delete through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'deleted-remotely', 'Alpha' ),
			paragraph( 'first-survivor', 'Beta' ),
			paragraph( 'second-survivor', 'Gamma' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		const afterRemoteDeleteBlocks = [
			paragraph( 'first-survivor', 'Beta' ),
			paragraph( 'second-survivor', 'Gamma' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: afterRemoteDeleteBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Beta',
			'Gamma',
		] );

		const staleLocalInsertedBlocks = [
			...afterRemoteDeleteBlocks,
			paragraph( 'inserted-locally', 'Delta' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleLocalInsertedBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Beta',
			'Gamma',
			'Delta',
		] );

		remoteDoc.destroy();
	} );
} );
