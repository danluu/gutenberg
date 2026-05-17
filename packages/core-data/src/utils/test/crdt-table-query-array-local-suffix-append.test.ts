/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/table',
			attributes: {
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
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

function tableBlock( rows: string[] ): Block {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( content ) => ( {
				cells: [ { content, tag: 'td' } ],
			} ) ),
		},
		innerBlocks: [],
	};
}

function bodyContents( yblocks: Y.Array< YBlock > ): string[] {
	return (
		yblocks.toJSON()[ 0 ].attributes.body as {
			cells: { content: string }[];
		}[]
	 ).map( ( row ) => row.cells[ 0 ].content );
}

function syncDocs( from: Y.Doc, to: Y.Doc ): void {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

describe( 'table query-array local suffix append after reload', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	it( 'preserves a four-row local suffix append with a stale two-row explicit base', () => {
		const baseBlocks = [ tableBlock( [ 'A1', 'A2' ] ) ];
		const remoteBlocks = [ tableBlock( [ 'A1', 'A2', 'remote-A3' ] ) ];
		const localBlocks = [
			tableBlock( [ 'A1', 'A2', 'remote-A3', 'local-A4' ] ),
		];

		const remoteDoc = new Y.Doc();
		const localDoc = new Y.Doc();
		const reloadedDoc = new Y.Doc();
		docs.push( remoteDoc, localDoc, reloadedDoc );

		const remoteYBlocks = remoteDoc.getArray< YBlock >();
		const localYBlocks = localDoc.getArray< YBlock >();
		mergeCrdtBlocks( remoteYBlocks, baseBlocks, null );
		syncDocs( remoteDoc, localDoc );

		mergeCrdtBlocks( remoteYBlocks, remoteBlocks, null, baseBlocks );
		syncDocs( remoteDoc, localDoc );
		expect( bodyContents( localYBlocks ) ).toEqual( [
			'A1',
			'A2',
			'remote-A3',
		] );

		Y.applyUpdate( reloadedDoc, Y.encodeStateAsUpdate( localDoc ) );
		const reloadedYBlocks = reloadedDoc.getArray< YBlock >();

		mergeCrdtBlocks( reloadedYBlocks, localBlocks, null, baseBlocks );
		syncDocs( reloadedDoc, remoteDoc );

		const expectedRows = [ 'A1', 'A2', 'remote-A3', 'local-A4' ];
		expect( bodyContents( reloadedYBlocks ) ).toEqual( expectedRows );
		expect( bodyContents( remoteYBlocks ) ).toEqual( expectedRows );
	} );
} );
