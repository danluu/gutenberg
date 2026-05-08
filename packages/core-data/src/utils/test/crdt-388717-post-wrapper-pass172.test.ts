/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

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
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( ( selection ) => selection ),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import {
	applyPostChangesToCRDTDoc,
	type YPostRecord,
} from '../crdt';
import type { Block, YBlocks } from '../crdt-blocks';
import { getRootMap, type YMapWrap } from '../crdt-utils';

const syncedProperties = new Set< string >( [ 'blocks', 'content' ] );

const paragraph = ( clientId: string, content: string ): Block => ( {
	name: 'core/paragraph',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const heading = ( clientId: string, content: string ): Block => ( {
	name: 'core/heading',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const cloneBlocks = ( blocks: Block[] ): Block[] =>
	JSON.parse( JSON.stringify( blocks ) ) as Block[];

const getBlockLabels = ( ydoc: Y.Doc ): string[] => {
	const map = getRootMap< YPostRecord >(
		ydoc,
		CRDT_RECORD_MAP_KEY
	) as YMapWrap< YPostRecord >;
	const blocks = map.get( 'blocks' ) as YBlocks;
	return ( blocks.toJSON() as Block[] ).map(
		( block ) => String( block.attributes.content )
	);
};

describe( 'RTC stale reload move-delete post wrapper regression 388717ee691c', () => {
	it( 'does not rehydrate a deleted top-level paragraph as a duplicate tail block', () => {
		const ydoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'long-paragraph', 'Long paragraph' ),
			heading( 'follow-up-heading', 'Follow-up heading' ),
			paragraph( 'tail-paragraph', 'Tail paragraph' ),
		];
		const movedBlocks = [
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 1 ],
		];
		const deletedAfterMoveBlocks = [ initialBlocks[ 2 ], initialBlocks[ 1 ] ];

		try {
			applyPostChangesToCRDTDoc(
				ydoc,
				{ blocks: cloneBlocks( initialBlocks ) },
				syncedProperties
			);

			applyPostChangesToCRDTDoc(
				ydoc,
				{ blocks: cloneBlocks( movedBlocks ) },
				syncedProperties,
				{ baseRecord: { blocks: cloneBlocks( initialBlocks ) } }
			);

			applyPostChangesToCRDTDoc(
				ydoc,
				{ blocks: cloneBlocks( deletedAfterMoveBlocks ) },
				syncedProperties,
				{ baseRecord: { blocks: cloneBlocks( movedBlocks ) } }
			);

			applyPostChangesToCRDTDoc(
				ydoc,
				{ blocks: cloneBlocks( initialBlocks ) },
				syncedProperties,
				{ baseRecord: { blocks: cloneBlocks( initialBlocks ) } }
			);

			expect( getBlockLabels( ydoc ) ).toEqual( [
				'Tail paragraph',
				'Follow-up heading',
			] );
		} finally {
			ydoc.destroy();
		}
	} );
} );
