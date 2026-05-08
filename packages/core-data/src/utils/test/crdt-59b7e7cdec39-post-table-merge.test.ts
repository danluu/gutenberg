/**
 * WordPress dependencies
 */
import { RichTextData } from '@wordpress/rich-text';
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
	};
} );

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

const syncedProperties = new Set( [ 'blocks' ] );

function tableBlock( rows: string[][] ): Block {
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

function applyBlocks( doc: Y.Doc, blocks: Block[] ) {
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks } as PostChanges,
		syncedProperties
	);
}

function syncDocs( from: Y.Doc, to: Y.Doc ) {
	Y.applyUpdate( to, Y.encodeStateAsUpdate( from ) );
}

function textValue( value: unknown ): string {
	if ( value instanceof RichTextData ) {
		return value.text;
	}
	return String( value );
}

function getBody( doc: Y.Doc ): string[][] {
	const changes = getPostChangesFromCRDTDoc(
		doc,
		{ blocks: [] } as unknown as Post,
		syncedProperties
	);
	const block = ( changes.blocks as Block[] )[ 0 ];
	const body = block.attributes.body as {
		cells: { content: unknown }[];
	}[];

	return body.map( ( row ) =>
		row.cells.map( ( cell ) => textValue( cell.content ) )
	);
}

describe( '59b7e7cdec39 post CRDT table body merge', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	function createDocs() {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );
		const initialRows = [
			[ 'initial row 1 A', 'initial row 1 B' ],
			[ 'initial row 2 A', 'initial row 2 B' ],
		];
		applyBlocks( docA, [ tableBlock( initialRows ) ] );
		syncDocs( docA, docB );
		applyBlocks( docB, [ tableBlock( initialRows ) ] );

		return { docA, docB };
	}

	function applyRemoteDelete( doc: Y.Doc ) {
		applyBlocks( doc, [
			tableBlock( [ [ 'initial row 1 A', 'remote edited row 1 B' ] ] ),
		] );
	}

	function applyLocalReplacementAppend( doc: Y.Doc ) {
		applyBlocks( doc, [
			tableBlock( [
				[ 'initial row 1 A', 'initial row 1 B' ],
				[ 'local edited deleted row A', 'initial row 2 B' ],
				[ 'local appended row A', 'local appended row B' ],
			] ),
		] );
	}

	function expectMergedRows( docA: Y.Doc, docB: Y.Doc ) {
		const expectedRows = [
			[ 'initial row 1 A', 'remote edited row 1 B' ],
			[ 'local appended row A', 'local appended row B' ],
		];
		expect( getBody( docA ) ).toEqual( expectedRows );
		expect( getBody( docB ) ).toEqual( expectedRows );
	}

	it( 'drops the stale edited tail row when the remote delete reaches the receiver first', () => {
		const { docA, docB } = createDocs();

		applyRemoteDelete( docB );
		syncDocs( docB, docA );
		applyLocalReplacementAppend( docA );
		syncDocs( docA, docB );

		expectMergedRows( docA, docB );
	} );

	it( 'drops the stale edited tail row when the remote delete arrives after the local replacement append', () => {
		const { docA, docB } = createDocs();

		applyLocalReplacementAppend( docA );
		applyRemoteDelete( docB );
		syncDocs( docB, docA );
		syncDocs( docA, docB );

		expectMergedRows( docA, docB );
	} );
} );
