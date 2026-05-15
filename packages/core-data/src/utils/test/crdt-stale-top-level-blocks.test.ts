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

function blocksOf( yblocks: YBlocks ): Block[] {
	return yblocks.toJSON() as Block[];
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
	it( 'deletes an observed remote top-level append through the post CRDT adapter', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const observedBlocks = [
			...initialBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
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
			{ blocks: observedBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( postBlocks( doc ) ) ).toContain(
			'observed-remote'
		);

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: observedBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).not.toContain(
			'observed-remote'
		);
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		remoteDoc.destroy();
	} );

	it( 'retains delete provenance for a Y-observed explicit-base top-level delete', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const observedBlocks = [
			...initialBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
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
			{ blocks: observedBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( clientIdsOf( postBlocks( doc ) ) ).toContain(
			'observed-remote'
		);

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: observedBlocks } }
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: observedBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		remoteDoc.destroy();
	} );

	it( 'does not resurrect an observed deleted top-level block from a stale post-delete snapshot', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const withRemoteBlock = [
			...initialBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );

		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		expect( clientIdsOf( postBlocks( deletingDoc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );

		deletingDoc.destroy();
	} );

	it( 'retains delete provenance through an intervening clean post-delete snapshot', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const withRemoteBlock = [
			...initialBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		deletingDoc.destroy();
	} );

	it( 'retains delete provenance for staggered stale snapshots of multiple deleted blocks', () => {
		const initialBlocks = [ paragraph( 'alpha', 'Alpha' ) ];
		const withRemoteBlocks = [
			...initialBlocks,
			paragraph( 'first-deleted-remote', 'First deleted remote' ),
			paragraph( 'second-deleted-remote', 'Second deleted remote' ),
		];
		const firstStaleIncomingBlocks = [
			...initialBlocks,
			paragraph( 'first-deleted-remote', 'First deleted remote' ),
		];
		const secondStaleIncomingBlocks = [
			...initialBlocks,
			paragraph( 'second-deleted-remote', 'Second deleted remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlocks } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: firstStaleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: secondStaleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [ 'alpha' ] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'First deleted remote'
		);
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Second deleted remote'
		);

		deletingDoc.destroy();
	} );

	it( 'keeps retained blocks aligned when filtering a stale deleted block before them', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];
		const withDeletedFrontBlock = [
			paragraph( 'deleted-front', 'Deleted front' ),
			...initialBlocks,
		];
		const staleIncomingBlocks = [
			paragraph( 'deleted-front', 'Deleted front' ),
			paragraph( 'beta', 'Beta edited' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withDeletedFrontBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withDeletedFrontBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [ 'beta' ] );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [ 'Beta edited' ] );

		deletingDoc.destroy();
	} );

	it( 'applies retained top-level reorders after filtering a stale deleted block', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];
		const withDeletedFrontBlock = [
			paragraph( 'deleted-front', 'Deleted front' ),
			...initialBlocks,
		];
		const staleIncomingBlocks = [
			paragraph( 'deleted-front', 'Deleted front' ),
			paragraph( 'beta', 'Beta edited' ),
			paragraph( 'alpha', 'Alpha' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withDeletedFrontBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withDeletedFrontBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'beta',
			'alpha',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Beta edited',
			'Alpha',
		] );

		deletingDoc.destroy();
	} );

	it( 'preserves current-only remote content after filtering stale deleted blocks', () => {
		const initialBlocks = [ paragraph( 'alpha', 'Alpha' ) ];
		const withDeletedBlock = [
			...initialBlocks,
			paragraph( 'deleted-stale', 'Deleted stale' ),
		];
		const withCurrentRemoteBlock = [
			...initialBlocks,
			paragraph( 'current-only-remote', 'Newer remote' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'alpha', 'Alpha edited' ),
			paragraph( 'current-only-remote', 'Older remote' ),
			paragraph( 'deleted-stale', 'Deleted stale' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withDeletedBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withDeletedBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: withCurrentRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'current-only-remote',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha edited',
			'Newer remote',
		] );

		deletingDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'filters a stale deleted block from an equal-length post-delete snapshot', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const withRemoteBlock = [
			...initialBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		deletingDoc.destroy();
	} );

	it( 'does not resurrect a single stale block after all blocks were deleted', () => {
		const withRemoteBlock = [
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: [] },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [] );

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: [] } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [] );

		deletingDoc.destroy();
	} );

	it( 'does not resurrect an all-filtered stale block over a non-empty base', () => {
		const baseBlocks = [ paragraph( 'alpha', 'Alpha' ) ];
		const withRemoteBlock = [
			...baseBlocks,
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		const staleIncomingBlocks = [
			paragraph( 'observed-remote', 'Observed remote' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: baseBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [ 'alpha' ] );

		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: staleIncomingBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: baseBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [] );
		expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
			'Observed remote'
		);

		deletingDoc.destroy();
	} );

	it( 'does not apply stale top-level delete filtering inside nested cross-parent moves', () => {
		const nestedObservedBlocks = [
			group( 'group-a', [ paragraph( 'moving', 'Moving edited' ) ] ),
			group( 'group-b', [] ),
		];
		const movedBlocks = [
			group( 'group-a', [] ),
			group( 'group-b', [ paragraph( 'moving', 'Moving edited' ) ] ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					group( 'group-a', [ paragraph( 'moving', 'Moving' ) ] ),
					group( 'group-b', [] ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: nestedObservedBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const movingDoc = new Y.Doc();
		Y.applyUpdate( movingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			movingDoc,
			{ blocks: movedBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: nestedObservedBlocks } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( movingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: nestedObservedBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: movedBlocks } }
		);

		const mergedBlocks = blocksOf( postBlocks( doc ) );
		expect(
			mergedBlocks[ 0 ].innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'moving' ] );
		expect( mergedBlocks[ 1 ].innerBlocks ).toHaveLength( 0 );

		movingDoc.destroy();
	} );

	it( 'preserves an unseen current-only remote append with an explicit unobserved base', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
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
					paragraph( 'unseen-remote', 'Unseen remote' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
			'unseen-remote',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).toContain( 'Unseen remote' );

		remoteDoc.destroy();
	} );

	it( 'does not treat an unapplied previous local snapshot block as delete provenance', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];
		const withConcurrentRemoteBlock = [
			...initialBlocks,
			paragraph( 'concurrent-remote', 'Concurrent remote' ),
		];
		const withLocalAppend = [
			...initialBlocks,
			paragraph( 'local-append', 'Local append' ),
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
			{ blocks: withConcurrentRemoteBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withLocalAppend },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);
		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'concurrent-remote',
		] );

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withConcurrentRemoteBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withLocalAppend },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'local-append',
		] );
		expect( contentsOf( postBlocks( doc ) ) ).toContain( 'Local append' );

		remoteDoc.destroy();
		deletingDoc.destroy();
	} );

	it( 'allows a fresh new-client-id append after an observed delete', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
			paragraph( 'gamma', 'Gamma' ),
		];
		const withDeletedBlock = [
			...initialBlocks,
			paragraph( 'deleted-remote', 'Reusable content' ),
		];
		const withFreshBlock = [
			...initialBlocks,
			paragraph( 'fresh-local', 'Reusable content' ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withDeletedBlock },
			SYNCED_BLOCK_PROPERTIES
		);

		const deletingDoc = new Y.Doc();
		Y.applyUpdate( deletingDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			deletingDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: withDeletedBlock } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( deletingDoc ) );
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: withFreshBlock },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( clientIdsOf( postBlocks( doc ) ) ).toEqual( [
			'alpha',
			'beta',
			'gamma',
			'fresh-local',
		] );
		expect( clientIdsOf( postBlocks( doc ) ) ).not.toContain(
			'deleted-remote'
		);

		deletingDoc.destroy();
	} );
} );
