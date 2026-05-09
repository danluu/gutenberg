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
					if ( block.name === 'core/heading' ) {
						return `<h2>${ block.attributes.content }</h2>`;
					}
					if ( block.name === 'core/pullquote' ) {
						return `<figure><blockquote>${ block.attributes.value }</blockquote><cite>${ block.attributes.citation }</cite></figure>`;
					}
					return `<p>${ block.attributes.content ?? '' }</p>`;
				} )
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
			{
				name: 'core/pullquote',
				attributes: {
					value: { type: 'rich-text' },
					citation: { type: 'rich-text' },
				},
			},
			{
				name: 'core/group',
				attributes: { layout: { type: 'object' } },
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

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function heading( clientId: string, content: string ): Block {
	return {
		name: 'core/heading',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function pullquote(
	clientId: string,
	value: string,
	citation: string
): Block {
	return {
		name: 'core/pullquote',
		clientId,
		attributes: { value, citation },
		innerBlocks: [],
	};
}

function group( clientId: string, nestedContent: string ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: { layout: { type: 'constrained' } },
		innerBlocks: [ paragraph( `${ clientId }-nested`, nestedContent ) ],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/heading' ) {
				return `<h2>${ block.attributes.content }</h2>`;
			}
			if ( block.name === 'core/pullquote' ) {
				return `<figure><blockquote>${ block.attributes.value }</blockquote><cite>${ block.attributes.citation }</cite></figure>`;
			}
			return `<p>${ block.attributes.content ?? '' }</p>`;
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

function syncPostBlocks( doc: Y.Doc, blocks: Block[] ) {
	applyPostChangesToCRDTDoc(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES
	);
}

describe( '747c653e7b3b explicit-base stale checkpoint move', () => {
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

	it( 'preserves live inserted blocks and block payloads through a stale Group move', () => {
		const initialBlocks = [
			paragraph( 'intro', 'Seed 953417 intro paragraph' ),
			group( 'group', 'Seed 953417 initial nested paragraph' ),
			paragraph( 'middle', 'Seed 953417 middle paragraph' ),
			pullquote(
				'pullquote',
				'Seed 953417 pullquote value stays pullquote',
				'Seed 953417 pullquote citation'
			),
			heading( 'heading', 'Seed 953417 heading text' ),
			paragraph( 'tail', 'Seed 953417 tail paragraph' ),
		];

		syncPostBlocks( actorDoc, initialBlocks );
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const liveBlocks = [
			initialBlocks[ 0 ],
			paragraph( 'remote-insert', 'Seed 953417 remote insert' ),
			group(
				'group',
				'Seed 953417 remotely edited nested group paragraph'
			),
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
			paragraph( 'local-insert', 'Seed 953417 local insert' ),
			initialBlocks[ 4 ],
			initialBlocks[ 5 ],
		];
		syncPostBlocks( actorDoc, liveBlocks );
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleCheckpointGroupMove = [
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
			initialBlocks[ 4 ],
			initialBlocks[ 5 ],
			initialBlocks[ 1 ],
		];
		applyPostChangesToCRDTDoc(
			viewerDoc,
			{
				blocks: staleCheckpointGroupMove,
				content: serializeBlocks( staleCheckpointGroupMove ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const finalBlocks = postBlocks( viewerDoc );
		expect( finalBlocks.map( ( block ) => block.clientId ) ).toEqual( [
			'intro',
			'remote-insert',
			'middle',
			'pullquote',
			'local-insert',
			'heading',
			'tail',
			'group',
		] );
		expect(
			finalBlocks.find( ( block ) => block.clientId === 'pullquote' )
				?.attributes
		).toEqual( {
			value: 'Seed 953417 pullquote value stays pullquote',
			citation: 'Seed 953417 pullquote citation',
		} );
		expect(
			finalBlocks.find( ( block ) => block.clientId === 'tail' )
				?.attributes
		).toEqual( { content: 'Seed 953417 tail paragraph' } );
		expect(
			finalBlocks
				.find( ( block ) => block.clientId === 'group' )
				?.innerBlocks?.[ 0 ]?.attributes.content
		).toBe( 'Seed 953417 remotely edited nested group paragraph' );
	} );
} );
