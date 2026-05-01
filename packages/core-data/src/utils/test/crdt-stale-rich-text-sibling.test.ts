/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Mock block schemas so the CRDT layer stores these attributes as Y.Text.
 */
jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;

	return {
		...actual,
		getBlockTypes: () => [
			{
				name: 'core/file',
				attributes: {
					href: { type: 'string' },
					fileName: { type: 'rich-text' },
					downloadButtonText: { type: 'rich-text' },
				},
			},
			{
				name: 'test/rich-text-pair',
				attributes: {
					first: { type: 'rich-text' },
					second: { type: 'rich-text' },
				},
			},
		],
	};
} );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type PostChanges } from '../crdt';
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';

const SYNCED_POST_PROPERTIES = new Set< string >( [ 'blocks' ] );

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function getBlocks( yblocks: YBlocks ): Block[] {
	return cloneBlocks( yblocks.toJSON() as Block[] );
}

function getPostBlocks( doc: Y.Doc ): YBlocks {
	return doc.getMap( CRDT_RECORD_MAP_KEY ).get( 'blocks' ) as YBlocks;
}

describe( 'stale local rich-text sibling snapshots', () => {
	let docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs = [];
	} );

	function createDoc() {
		const doc = new Y.Doc();
		docs.push( doc );
		return doc;
	}

	it( 'preserves a remote rich-text sibling update when mergeCrdtBlocks receives an older local snapshot', () => {
		const docA = createDoc();
		const docB = createDoc();
		const yblocksA = docA.getArray< YBlock >( 'blocks' );
		const yblocksB = docB.getArray< YBlock >( 'blocks' );
		const initialBlocks: Block[] = [
			{
				name: 'test/rich-text-pair',
				clientId: 'pair-1',
				attributes: {
					first: 'initial first',
					second: 'initial second',
				},
				innerBlocks: [],
			},
		];
		const staleLocalSnapshot = cloneBlocks( initialBlocks );

		mergeCrdtBlocks( yblocksA, initialBlocks, null );
		Y.applyUpdateV2( docB, Y.encodeStateAsUpdateV2( docA ) );

		const remoteBlocks = getBlocks( yblocksB );
		remoteBlocks[ 0 ].attributes.second = 'remote second';
		mergeCrdtBlocks( yblocksB, remoteBlocks, null );
		Y.applyUpdateV2( docA, Y.encodeStateAsUpdateV2( docB ) );

		staleLocalSnapshot[ 0 ].attributes.first = 'local first';
		mergeCrdtBlocks( yblocksA, staleLocalSnapshot, null );

		expect( getBlocks( yblocksA ) ).toMatchObject( [
			{
				attributes: {
					first: 'local first',
					second: 'remote second',
				},
			},
		] );
	} );

	it( 'preserves a remote rich-text sibling delete when mergeCrdtBlocks receives an older local snapshot', () => {
		const docA = createDoc();
		const docB = createDoc();
		const yblocksA = docA.getArray< YBlock >( 'blocks' );
		const yblocksB = docB.getArray< YBlock >( 'blocks' );
		const initialBlocks: Block[] = [
			{
				name: 'test/rich-text-pair',
				clientId: 'pair-1',
				attributes: {
					first: 'initial first',
					second: 'remote second',
				},
				innerBlocks: [],
			},
		];
		const staleLocalSnapshot = cloneBlocks( initialBlocks );

		mergeCrdtBlocks( yblocksA, initialBlocks, null );
		Y.applyUpdateV2( docB, Y.encodeStateAsUpdateV2( docA ) );

		const remoteBlocks = getBlocks( yblocksB );
		delete remoteBlocks[ 0 ].attributes.second;
		mergeCrdtBlocks( yblocksB, remoteBlocks, null );
		Y.applyUpdateV2( docA, Y.encodeStateAsUpdateV2( docB ) );

		staleLocalSnapshot[ 0 ].attributes.first = 'local first';
		mergeCrdtBlocks( yblocksA, staleLocalSnapshot, null );

		const [ block ] = getBlocks( yblocksA );

		expect( block.attributes.first ).toBe( 'local first' );
		expect( block.attributes ).not.toHaveProperty( 'second' );
	} );

	it( 'preserves a remote core/file fileName update when the post CRDT adapter receives an older local downloadButtonText snapshot', () => {
		const docA = createDoc();
		const docB = createDoc();
		const initialBlocks: Block[] = [
			{
				name: 'core/file',
				clientId: 'file-1',
				attributes: {
					href: 'https://example.com/initial.pdf',
					fileName: 'initial file',
					downloadButtonText: 'Download',
				},
				innerBlocks: [],
			},
		];
		const staleLocalSnapshot = cloneBlocks( initialBlocks );

		applyPostChangesToCRDTDoc(
			docA,
			{ blocks: initialBlocks } as PostChanges,
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdateV2( docB, Y.encodeStateAsUpdateV2( docA ) );

		const remoteBlocks = getBlocks( getPostBlocks( docB ) );
		remoteBlocks[ 0 ].attributes.fileName = 'remote file';
		applyPostChangesToCRDTDoc(
			docB,
			{ blocks: remoteBlocks } as PostChanges,
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdateV2( docA, Y.encodeStateAsUpdateV2( docB ) );

		staleLocalSnapshot[ 0 ].attributes.downloadButtonText = 'Local button';
		applyPostChangesToCRDTDoc(
			docA,
			{ blocks: staleLocalSnapshot } as PostChanges,
			SYNCED_POST_PROPERTIES
		);

		expect( getBlocks( getPostBlocks( docA ) ) ).toMatchObject( [
			{
				name: 'core/file',
				attributes: {
					fileName: 'remote file',
					downloadButtonText: 'Local button',
				},
			},
		] );
	} );
} );
