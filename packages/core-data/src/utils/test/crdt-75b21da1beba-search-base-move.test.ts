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

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { name: string; attributes: Record< string, unknown > }[]
		) =>
			blocks
				.map( ( block ) => {
					if ( block.name === 'core/search' ) {
						return `<!-- wp:search {"label":"${ block.attributes.label }"} /-->`;
					}
					return `<p>${ block.attributes.content }</p>`;
				} )
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/search',
				attributes: {
					buttonPosition: { type: 'string' },
					buttonText: { type: 'string' },
					label: { type: 'string' },
					placeholder: { type: 'string' },
				},
			},
		],
	};
} );

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

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function search( clientId: string, marker: string ): Block {
	return {
		name: 'core/search',
		clientId,
		attributes: {
			buttonPosition: 'button-inside',
			buttonText: `Find ${ marker }`,
			label: `Search label ${ marker }`,
			placeholder: `Search placeholder ${ marker }`,
		},
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/search' ) {
				return `<!-- wp:search {"label":"${ block.attributes.label }"} /-->`;
			}
			return `<p>${ block.attributes.content }</p>`;
		} )
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

function blockSummary( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => {
		if ( block.name === 'core/search' ) {
			return `${ block.name }:${ block.attributes.label }`;
		}
		return `${ block.name }:${ block.attributes.content }`;
	} );
}

describe( '75b21da1beba Search checkpoint stale-base move', () => {
	let actorDoc: Y.Doc;
	let viewerDoc: Y.Doc;

	beforeEach( () => {
		actorDoc = new Y.Doc();
		viewerDoc = new Y.Doc();
	} );

	afterEach( () => {
		actorDoc.destroy();
		viewerDoc.destroy();
	} );

	it( 'preserves a concurrent Search insert when applying a stale paragraph move with an explicit base record', () => {
		const checkpoint =
			'rtc-save-paragraph-marker-75b21da1beba-checkpoint';
		const moved = 'Seed 75b21da1beba moved paragraph';
		const initialBlocks = [
			paragraph( 'intro', 'Intro paragraph' ),
			search( 'search-one', 'search-one' ),
			paragraph( 'checkpoint', checkpoint ),
			search( 'search-two', 'search-two' ),
			paragraph( 'tail', moved ),
		];

		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: initialBlocks,
				content: serializeBlocks( initialBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const withRemoteSearch = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			search( 'remote-search', 'remote-search' ),
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
			initialBlocks[ 4 ],
		];
		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: withRemoteSearch,
				content: serializeBlocks( withRemoteSearch ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleMoveWithoutRemoteSearch = [
			initialBlocks[ 0 ],
			initialBlocks[ 4 ],
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		applyPostChangesToCRDTDoc(
			viewerDoc,
			{
				blocks: staleMoveWithoutRemoteSearch,
				content: serializeBlocks( staleMoveWithoutRemoteSearch ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const viewerBlocks = postBlocks( viewerDoc );
		expect( blockSummary( viewerBlocks ) ).toEqual( [
			'core/paragraph:Intro paragraph',
			'core/paragraph:Seed 75b21da1beba moved paragraph',
			'core/search:Search label search-one',
			'core/search:Search label remote-search',
			'core/paragraph:rtc-save-paragraph-marker-75b21da1beba-checkpoint',
			'core/search:Search label search-two',
		] );
		expect(
			viewerBlocks.filter(
				( block ) =>
					block.name === 'core/search' &&
					block.attributes.label === 'Search label remote-search'
			)
		).toHaveLength( 1 );
		expect(
			viewerBlocks.some(
				( block ) =>
					block.name === 'core/search' &&
					block.attributes.content === checkpoint
			)
		).toBe( false );
		expect( postContent( viewerDoc ) ).toContain(
			'Search label remote-search'
		);

		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );
		expect( blockSummary( postBlocks( actorDoc ) ) ).toEqual(
			blockSummary( viewerBlocks )
		);
		expect( postContent( actorDoc ) ).toBe( postContent( viewerDoc ) );
	} );
} );
