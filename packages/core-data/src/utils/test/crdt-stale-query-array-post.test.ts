/**
 * WordPress dependencies
 */
import { RichTextData } from '@wordpress/rich-text';
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest, afterEach } from '@jest/globals';

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

describe( 'post CRDT stale query-array snapshots', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	it( 'preserves a remote table cell edit through the post changes adapter', () => {
		const docA = new Y.Doc();
		const docB = new Y.Doc();
		docs.push( docA, docB );

		applyBlocks( docA, [
			tableBlock( [
				[ 'A1', 'B1' ],
				[ 'A2', 'B2' ],
			] ),
		] );
		syncDocs( docA, docB );

		applyBlocks( docB, [
			tableBlock( [
				[ 'A1', 'B1' ],
				[ 'A2', 'remote-B2' ],
			] ),
		] );
		syncDocs( docB, docA );
		expect( getBody( docA )[ 1 ][ 1 ] ).toBe( 'remote-B2' );

		applyBlocks( docA, [
			tableBlock( [
				[ 'local-A1', 'B1' ],
				[ 'A2', 'B2' ],
			] ),
		] );

		expect( getBody( docA ) ).toEqual( [
			[ 'local-A1', 'B1' ],
			[ 'A2', 'remote-B2' ],
		] );
	} );
} );
