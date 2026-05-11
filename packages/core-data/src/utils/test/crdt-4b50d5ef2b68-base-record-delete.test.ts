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

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: (
		blocks: { name: string; attributes: { content?: string } }[]
	) =>
		blocks
			.map( ( block ) =>
				block.name === 'core/heading'
					? `<h2>${ block.attributes.content }</h2>`
					: `<p>${ block.attributes.content }</p>`
			)
			.join( '\n\n' ),
	getBlockTypes: () => [
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: () => undefined,
	getShiftedSelection: () => undefined,
	updateSelectionHistory: () => undefined,
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function makeBlock(
	name: 'core/heading' | 'core/paragraph',
	clientId: string,
	content: string
): Block {
	return {
		name,
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) =>
			block.name === 'core/heading'
				? `<h2>${ block.attributes.content }</h2>`
				: `<p>${ block.attributes.content }</p>`
		)
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

function contentsOf( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => block.attributes.content as string );
}

describe( '4b50d5ef2b68 saved remote insert/delete adapter replay', () => {
	let doc: Y.Doc;

	beforeEach( () => {
		doc = new Y.Doc();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not resurrect a deleted saved heading from a stale baseRecord edit', () => {
		const initialBlocks = [
			makeBlock( 'core/paragraph', 'alpha', 'Alpha' ),
			makeBlock( 'core/paragraph', 'beta', 'Beta' ),
		];
		const withSavedRemoteHeading = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			makeBlock( 'core/heading', 'gamma', 'Gamma saved heading' ),
		];
		const afterRemoteDelete = [ initialBlocks[ 0 ], initialBlocks[ 1 ] ];
		const staleLocalEdit = [
			initialBlocks[ 0 ],
			makeBlock(
				'core/paragraph',
				'beta',
				'Beta collaborator stale edit'
			),
			withSavedRemoteHeading[ 2 ],
		];

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: initialBlocks,
				content: serializeBlocks( initialBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: withSavedRemoteHeading,
				content: serializeBlocks( withSavedRemoteHeading ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: afterRemoteDelete,
				content: serializeBlocks( afterRemoteDelete ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: withSavedRemoteHeading } }
		);
		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Beta',
		] );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: staleLocalEdit,
				content: serializeBlocks( staleLocalEdit ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: withSavedRemoteHeading } }
		);

		expect( contentsOf( postBlocks( doc ) ) ).toEqual( [
			'Alpha',
			'Beta collaborator stale edit',
		] );
		expect( postContent( doc ) ).toContain(
			'Beta collaborator stale edit'
		);
		expect( postContent( doc ) ).not.toContain( 'Gamma saved heading' );
	} );
} );
