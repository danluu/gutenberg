/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

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

const SYNCED_BLOCK_PROPERTIES = new Set( [ 'blocks' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function table( clientId: string ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {
			hasFixedLayout: true,
			caption: '',
			head: [],
			body: [
				{
					cells: [
						{ content: 'A1', tag: 'td' },
						{ content: 'B1', tag: 'td' },
					],
				},
			],
			foot: [],
		},
		innerBlocks: [],
	};
}

function postBlocks( doc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

describe( 'f8a927efad8c baseRecord path', () => {
	it( 'preserves a remote top-level table append when a stale local edit carries baseRecord', () => {
		const initialBlocks = [
			paragraph( 'local-edited', 'Alpha' ),
			paragraph( 'unchanged', 'Beta' ),
		];
		const doc = new Y.Doc();
		applyPostChangesToCRDTDoc(
			doc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: [ ...initialBlocks, table( 'remote-table' ) ] },
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		expect(
			( postBlocks( doc ).toJSON() as Block[] ).map( ( block ) => block.name )
		).toEqual( [ 'core/paragraph', 'core/paragraph', 'core/table' ] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [
					paragraph( 'local-edited', 'Alpha local edit' ),
					paragraph( 'unchanged', 'Beta' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		expect(
			( postBlocks( doc ).toJSON() as Block[] ).map( ( block ) => block.name )
		).toEqual( [ 'core/paragraph', 'core/paragraph', 'core/table' ] );

		doc.destroy();
		remoteDoc.destroy();
	} );
} );
