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
jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
} ) );

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

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function contentsOf( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

function postBlocks( ydoc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( ydoc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

describe( 'stale top-level delete snapshots', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not resurrect a remotely deleted top-level block from a stale local snapshot', () => {
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

		mergeCrdtBlocks(
			yblocks,
			[
				paragraph( 'local-edited', 'Alpha local edit' ),
				paragraph( 'unchanged', 'Beta' ),
				paragraph( 'remote-deleted', 'Gamma' ),
			],
			null
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
		] );

		remoteDoc.destroy();
	} );

	it( 'does not resurrect a remote delete from a stale base-record edit', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
			paragraph( 'remote-deleted', 'Gamma' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		( mergeCrdtBlocks as any )(
			remoteBlocks,
			[
				paragraph( 'local-edited', 'Alpha' ),
				paragraph( 'unchanged', 'Beta' ),
			],
			null,
			initialBlocks
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Alpha', 'Beta' ] );

		( mergeCrdtBlocks as any )(
			yblocks,
			[
				paragraph( 'local-edited', 'Alpha local edit' ),
				paragraph( 'unchanged', 'Beta' ),
				paragraph( 'remote-deleted', 'Gamma' ),
			],
			null,
			initialBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
		] );

		remoteDoc.destroy();
	} );

	it( 'does not resurrect a remote delete through the post adapter with a stale base-record edit', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
			paragraph( 'remote-deleted', 'Gamma' ),
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
					paragraph( 'local-edited', 'Alpha' ),
					paragraph( 'unchanged', 'Beta' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Beta',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'local-edited', 'Alpha local edit' ),
					paragraph( 'unchanged', 'Beta' ),
					paragraph( 'remote-deleted', 'Gamma' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha local edit',
			'Beta',
		] );

		remoteDoc.destroy();
	} );

	it( 'does not drop a remote append while reconciling a stale base-record edit', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		( mergeCrdtBlocks as any )(
			remoteBlocks,
			[
				paragraph( 'local-edited', 'Alpha' ),
				paragraph( 'unchanged', 'Beta' ),
				paragraph( 'remote-appended', 'Gamma' ),
			],
			null,
			initialBlocks
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect( contentsOf( yblocks ) ).toEqual( [ 'Alpha', 'Beta', 'Gamma' ] );

		( mergeCrdtBlocks as any )(
			yblocks,
			[
				paragraph( 'local-edited', 'Alpha local edit' ),
				paragraph( 'unchanged', 'Beta' ),
			],
			null,
			initialBlocks
		);

		expect( contentsOf( yblocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
			'Gamma',
		] );

		remoteDoc.destroy();
	} );
} );
