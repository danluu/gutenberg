/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

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
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
		.join( '\n\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as Block[];
}

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

function contentsOf( doc: Y.Doc ): string[] {
	return postBlocks( doc ).map(
		( block ) => block.attributes.content as string
	);
}

function applyBlocks(
	doc: Y.Doc,
	blocks: Block[],
	baseBlocks?: Block[]
): void {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks ? { baseRecord: { blocks: baseBlocks } } : undefined
	);
}

describe( '1e119c9ca737 sequential delete stale reload reconstruction', () => {
	const initialBlocks = [
		paragraph( 'first', 'Alpha' ),
		paragraph( 'second', 'Beta' ),
		paragraph( 'third', 'Gamma' ),
	];
	const afterFirstDelete = [ initialBlocks[ 0 ], initialBlocks[ 2 ] ];
	const afterSecondDelete = [ initialBlocks[ 0 ] ];

	afterEach( () => {
		jest.restoreAllMocks();
	} );

	it( 'keeps both remote deletes when a stale reload snapshot arrives after reconnect', () => {
		const deletingPeer = new Y.Doc();
		const reloadingPeer = new Y.Doc();

		applyBlocks( reloadingPeer, initialBlocks );
		Y.applyUpdate( deletingPeer, Y.encodeStateAsUpdate( reloadingPeer ) );

		applyBlocks( deletingPeer, afterFirstDelete, initialBlocks );
		Y.applyUpdate( reloadingPeer, Y.encodeStateAsUpdate( deletingPeer ) );
		applyBlocks( deletingPeer, afterSecondDelete, afterFirstDelete );
		Y.applyUpdate( reloadingPeer, Y.encodeStateAsUpdate( deletingPeer ) );

		expect( contentsOf( reloadingPeer ) ).toEqual( [ 'Alpha' ] );

		applyBlocks( reloadingPeer, initialBlocks, initialBlocks );

		expect( contentsOf( reloadingPeer ) ).toEqual( [ 'Alpha' ] );
		expect( postContent( reloadingPeer ) ).toContain( '<p>Alpha</p>' );
		expect( postContent( reloadingPeer ) ).not.toContain( 'Beta' );
		expect( postContent( reloadingPeer ) ).not.toContain( 'Gamma' );

		Y.applyUpdate( deletingPeer, Y.encodeStateAsUpdate( reloadingPeer ) );
		expect( contentsOf( deletingPeer ) ).toEqual( [ 'Alpha' ] );
		expect( postContent( deletingPeer ) ).toBe(
			postContent( reloadingPeer )
		);

		deletingPeer.destroy();
		reloadingPeer.destroy();
	} );

	it( 'keeps both remote deletes when the stale reload snapshot wins the socket race', () => {
		const deletingPeer = new Y.Doc();
		const reloadingPeer = new Y.Doc();

		applyBlocks( reloadingPeer, initialBlocks );
		Y.applyUpdate( deletingPeer, Y.encodeStateAsUpdate( reloadingPeer ) );

		applyBlocks( deletingPeer, afterFirstDelete, initialBlocks );
		applyBlocks( deletingPeer, afterSecondDelete, afterFirstDelete );
		applyBlocks( reloadingPeer, initialBlocks, initialBlocks );
		Y.applyUpdate( reloadingPeer, Y.encodeStateAsUpdate( deletingPeer ) );

		expect( contentsOf( reloadingPeer ) ).toEqual( [ 'Alpha' ] );
		expect( postContent( reloadingPeer ) ).toContain( '<p>Alpha</p>' );
		expect( postContent( reloadingPeer ) ).not.toContain( 'Beta' );
		expect( postContent( reloadingPeer ) ).not.toContain( 'Gamma' );

		Y.applyUpdate( deletingPeer, Y.encodeStateAsUpdate( reloadingPeer ) );
		expect( contentsOf( deletingPeer ) ).toEqual( [ 'Alpha' ] );
		expect( postContent( deletingPeer ) ).toBe(
			postContent( reloadingPeer )
		);

		deletingPeer.destroy();
		reloadingPeer.destroy();
	} );
} );
