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
		__unstableSerializeAndClean: ( blocks: Block[] ) =>
			mockSerializeBlocks( blocks ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/group',
				attributes: {},
			},
		],
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	store: { name: 'core/block-editor' },
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import type { Block, YBlocks } from '../crdt-blocks';
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

function group( clientId: string, childContent: string ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks: [ paragraph( `${ clientId }-child`, childContent ) ],
	};
}

function mockSerializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/group' ) {
				return `<div class="wp-block-group">${ mockSerializeBlocks(
					block.innerBlocks ?? []
				) }</div>`;
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

function blockLabel( block: Block ): string {
	const children = ( block.innerBlocks ?? [] )
		.map( ( child ) => child.attributes.content ?? '' )
		.join( '|' );

	if ( block.name === 'core/group' ) {
		return `group content=${ block.attributes.content ?? '' } children=${ children }`;
	}
	return `paragraph ${ block.attributes.content ?? '' } children=${ children }`;
}

describe( 'base-record CRDT block identity merge', () => {
	it( 'preserves a remote paragraph inserted before a stale local group edit', () => {
		const doc = new Y.Doc();
		const remoteDoc = new Y.Doc();

		const initialBlocks = [
			paragraph( 'before', 'Stable leading paragraph.' ),
			group( 'group', 'Original nested group paragraph.' ),
			paragraph( 'after', 'Stable trailing paragraph.' ),
		];
		const initialRecord = {
			blocks: initialBlocks,
			content: mockSerializeBlocks( initialBlocks ),
		};

		applyPostChangesToCRDTDoc(
			doc,
			initialRecord,
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const remoteBlocks = [
			initialBlocks[ 0 ],
			paragraph(
				'remote-paragraph',
				'Remote paragraph inserted before the group.'
			),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: remoteBlocks,
				content: mockSerializeBlocks( remoteBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: initialRecord }
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		const staleLocalBlocks = [
			initialBlocks[ 0 ],
			group( 'group', 'Locally edited stale group paragraph.' ),
			initialBlocks[ 2 ],
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: staleLocalBlocks,
				content: mockSerializeBlocks( staleLocalBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: initialRecord }
		);

		expect( postBlocks( doc ).map( blockLabel ) ).toEqual( [
			'paragraph Stable leading paragraph. children=',
			'paragraph Remote paragraph inserted before the group. children=',
			'group content= children=Locally edited stale group paragraph.',
			'paragraph Stable trailing paragraph. children=',
		] );

		doc.destroy();
		remoteDoc.destroy();
	} );
} );
