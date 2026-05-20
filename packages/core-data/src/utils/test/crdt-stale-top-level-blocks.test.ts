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
	const serializeMockBlock = ( block: {
		attributes: Record< string, unknown >;
		name: string;
	} ): string => {
		if ( block.name === 'core/search' ) {
			return `<!-- wp:search ${ JSON.stringify(
				block.attributes
			) } /-->`;
		}

		return `<p>${ block.attributes.content }</p>`;
	};

	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { attributes: Record< string, unknown >; name: string }[]
		) => blocks.map( serializeMockBlock ).join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/search',
				attributes: {
					label: { type: 'string', role: 'content' },
					placeholder: { type: 'string', role: 'content' },
					buttonText: { type: 'string', role: 'content' },
					buttonPosition: { type: 'string' },
					query: { type: 'object' },
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

function searchBlock( clientId: string, marker: string ): Block {
	return {
		name: 'core/search',
		clientId,
		attributes: {
			buttonPosition: 'button-inside',
			buttonText: `Find ${ marker }`,
			label: `Search label ${ marker }`,
			placeholder: `Search placeholder ${ marker }`,
			query: { post_type: 'post' },
		},
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

function serializeBlock( block: Block ): string {
	if ( block.name === 'core/search' ) {
		return `<!-- wp:search ${ JSON.stringify( block.attributes ) } /-->`;
	}

	return `<p>${ block.attributes.content }</p>`;
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks.map( serializeBlock ).join( '\n\n' );
}

function occurrencesOf( value: string, needle: string ): number {
	return value.split( needle ).length - 1;
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

	it( 'reapplies a local suffix append when the explicit base differs from current blocks', () => {
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

	it( 'updates an already-present local suffix append with the latest content', () => {
		const partialContent =
			'rtcw-7310672-7-u1-ui-undo-redo-paragraph-9gmc undo redo pa';
		const fullContent =
			'rtcw-7310672-7-u1-ui-undo-redo-paragraph-9gmc undo redo paragraph';
		const baseBlocks = [
			paragraph( 'intro', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const currentBlocks = [
			...baseBlocks,
			paragraph( 'local-appended', partialContent ),
		];
		const blocksWithUpdatedLocalAppend = [
			...baseBlocks,
			paragraph( 'local-appended', fullContent ),
		];

		mergeCrdtBlocks( yblocks, currentBlocks, null );
		mergeCrdtBlocks(
			yblocks,
			blocksWithUpdatedLocalAppend,
			null,
			baseBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha',
			'Beta',
			fullContent,
		] );
		expect( clientIdsOf( yblocks ) ).toEqual( [
			'intro',
			'unchanged',
			'local-appended',
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

	it( 'derives checkpoint search content from merged blocks before save', () => {
		const searchMarker = 'rtc-save-search-option-marker-unit';
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
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
			...initialBlocks,
			paragraph( 'remote-appended', 'Gamma remote' ),
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

		const staleLocalBlocks = [
			paragraph( 'local-edited', 'Alpha local edit' ),
			paragraph( 'unchanged', 'Beta' ),
			paragraph( 'checkpoint-paragraph', 'Checkpoint paragraph' ),
			searchBlock( 'checkpoint-search', searchMarker ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: staleLocalBlocks,
				content: serializeBlocks( staleLocalBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const mergedBlocks = postBlocks( doc ).toJSON() as Block[];
		const mergedClientIds = mergedBlocks.map( ( block ) => block.clientId );
		const content = postContent( doc );

		expect( mergedClientIds ).toEqual(
			expect.arrayContaining( [
				'local-edited',
				'unchanged',
				'checkpoint-paragraph',
				'checkpoint-search',
				'remote-appended',
			] )
		);
		expect( content ).toContain( 'Alpha local edit' );
		expect( content ).toContain( 'Checkpoint paragraph' );
		expect( content ).toContain( 'Gamma remote' );
		expect( occurrencesOf( content, searchMarker ) ).toBe( 3 );

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
} );
