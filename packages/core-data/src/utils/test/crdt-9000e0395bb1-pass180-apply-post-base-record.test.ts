/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: () => '',
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

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: () => [],
	getShiftedSelection: () => null,
	updateSelectionHistory: () => {},
} ) );

/**
 * Internal dependencies
 */
import {
	applyPostChangesToCRDTDoc,
	getPostChangesFromCRDTDoc,
	type PostChanges,
} from '../crdt';
import type { Block } from '../crdt-blocks';
import type { Post } from '../../entity-types';

type TableRows = string[][];

const syncedProperties = new Set( [ 'blocks' ] );

function cloneRows( rows: TableRows ): TableRows {
	return rows.map( ( row ) => [ ...row ] );
}

function tableBlock( rows: TableRows ): Block {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( cells ) => ( {
				cells: cells.map( ( content ) => ( { content, tag: 'td' } ) ),
			} ) ),
		},
		innerBlocks: [],
	};
}

function applyBlocks(
	doc: Y.Doc,
	blocks: Block[],
	baseBlocks?: Block[]
): void {
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks } as PostChanges,
		syncedProperties,
		baseBlocks ? { baseRecord: { blocks: baseBlocks } } : {}
	);
}

function syncDocs( from: Y.Doc, to: Y.Doc ): void {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function getBody( doc: Y.Doc ): TableRows {
	const changes = getPostChangesFromCRDTDoc(
		doc,
		{ blocks: [] } as unknown as Post,
		syncedProperties
	);
	const block = ( changes.blocks as Block[] )[ 0 ];
	const body = block.attributes.body as {
		cells: { content: string }[];
	}[];

	return body.map( ( row ) =>
		row.cells.map( ( cell ) => String( cell.content ) )
	);
}

function setupDocsAfterRemoteTailEdit() {
	const localDoc = new Y.Doc();
	const remoteDoc = new Y.Doc();
	const initialRows = [
		[ 'A1', 'B1' ],
		[ 'A2', 'B2' ],
	];
	const remoteRows = cloneRows( initialRows );
	remoteRows[ 1 ][ 1 ] = 'B2-remote';

	applyBlocks( localDoc, [ tableBlock( initialRows ) ] );
	syncDocs( localDoc, remoteDoc );
	applyBlocks( remoteDoc, [ tableBlock( remoteRows ) ] );
	syncDocs( remoteDoc, localDoc );

	expect( getBody( localDoc ) ).toEqual( [
		[ 'A1', 'B1' ],
		[ 'A2', 'B2-remote' ],
	] );

	return { initialRows, localDoc, remoteDoc, remoteRows };
}

describe( '9000e0395bb1 post adapter baseRecord table prepend', () => {
	it( 'preserves the remote tail cell when the local prepend payload is current', () => {
		const { localDoc, remoteDoc, remoteRows } =
			setupDocsAfterRemoteTailEdit();
		const prependedRows = [ [ 'A0-local', 'B0-local' ], ...remoteRows ];

		try {
			applyBlocks(
				localDoc,
				[ tableBlock( prependedRows ) ],
				[ tableBlock( remoteRows ) ]
			);

			expect( getBody( localDoc ) ).toEqual( [
				[ 'A0-local', 'B0-local' ],
				[ 'A1', 'B1' ],
				[ 'A2', 'B2-remote' ],
			] );
		} finally {
			localDoc.destroy();
			remoteDoc.destroy();
		}
	} );

	it( 'rebases a stale table prepend against the current editor base record', () => {
		const { initialRows, localDoc, remoteDoc, remoteRows } =
			setupDocsAfterRemoteTailEdit();
		const stalePrependedRows = [
			[ 'A0-local', 'B0-local' ],
			...initialRows,
		];

		try {
			applyBlocks(
				localDoc,
				[ tableBlock( stalePrependedRows ) ],
				[ tableBlock( remoteRows ) ]
			);

			expect( getBody( localDoc ) ).toEqual( [
				[ 'A0-local', 'B0-local' ],
				[ 'A1', 'B1' ],
				[ 'A2', 'B2-remote' ],
			] );
		} finally {
			localDoc.destroy();
			remoteDoc.destroy();
		}
	} );
} );
