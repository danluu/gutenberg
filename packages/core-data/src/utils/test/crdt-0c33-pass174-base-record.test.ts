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
			blocks
				.map( ( block ) => {
					if ( block.name === 'core/heading' ) {
						return `<h${ block.attributes.level ?? 2 }>${
							block.attributes.content
						}</h${ block.attributes.level ?? 2 }>`;
					}
					if ( block.name === 'core/search' ) {
						return `<form>${ block.attributes.label }</form>`;
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
				name: 'core/search',
				attributes: { label: { type: 'string' } },
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

function heading( clientId: string, content: string, level = 2 ): Block {
	return {
		name: 'core/heading',
		clientId,
		attributes: { content, level },
		innerBlocks: [],
	};
}

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function search( clientId: string, label: string ): Block {
	return {
		name: 'core/search',
		clientId,
		attributes: { label },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => {
			if ( block.name === 'core/heading' ) {
				return `<h${ block.attributes.level ?? 2 }>${
					block.attributes.content
				}</h${ block.attributes.level ?? 2 }>`;
			}
			if ( block.name === 'core/search' ) {
				return `<form>${ block.attributes.label }</form>`;
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

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

function labels( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => {
		if ( block.name === 'core/search' ) {
			return `search:${ block.attributes.label }`;
		}
		return `${ block.name }:${ block.attributes.content ?? '' }`;
	} );
}

describe( '0c33bad2fdd0 base-record stale heading insert', () => {
	it( 'preserves a remote interior H3 when a stale local base-record edit follows it', () => {
		const doc = new Y.Doc();
		const remoteDoc = new Y.Doc();

		const initialBlocks = [
			heading( 'seed-heading', 'Seed 952337 multibyte heading' ),
			paragraph(
				'anchor-paragraph',
				'Another paragraph exists so the top-level list is not degenerate.'
			),
			paragraph(
				'user-1-paragraph',
				'Seed 952337 step 2 user 1 concurrent paragraph 777161'
			),
			paragraph(
				'user-0-paragraph',
				'Seed 952337 step 2 user 0 concurrent paragraph 859911'
			),
			paragraph(
				'save-marker',
				'rtc-save-paragraph-marker-952337-3-0-end'
			),
			search(
				'search-marker',
				'Search label rtc-save-search-option-marker-952337-3-0-end'
			),
			paragraph( 'italic-tail', 'italic beta 952337 0' ),
		];
		const initialRecord = {
			blocks: initialBlocks,
			content: serializeBlocks( initialBlocks ),
		};

		applyPostChangesToCRDTDoc(
			doc,
			initialRecord,
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const remoteBlocks = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			heading( 'remote-h3', 'RTC inserted H3', 3 ),
			...initialBlocks.slice( 2 ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: remoteBlocks,
				content: serializeBlocks( remoteBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: initialRecord }
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		const staleLocalBlocks = [
			initialBlocks[ 0 ],
			paragraph(
				'anchor-paragraph',
				'Another paragraph exists so the top-level list is not degenerate. Local stale edit.'
			),
			...initialBlocks.slice( 2 ),
		];
		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: staleLocalBlocks,
				content: serializeBlocks( staleLocalBlocks ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: initialRecord }
		);

		expect( labels( postBlocks( doc ) ) ).toEqual( [
			'core/heading:Seed 952337 multibyte heading',
			'core/paragraph:Another paragraph exists so the top-level list is not degenerate. Local stale edit.',
			'core/heading:RTC inserted H3',
			'core/paragraph:Seed 952337 step 2 user 1 concurrent paragraph 777161',
			'core/paragraph:Seed 952337 step 2 user 0 concurrent paragraph 859911',
			'core/paragraph:rtc-save-paragraph-marker-952337-3-0-end',
			'search:Search label rtc-save-search-option-marker-952337-3-0-end',
			'core/paragraph:italic beta 952337 0',
		] );
		expect( postContent( doc ) ).toContain( 'RTC inserted H3' );

		doc.destroy();
		remoteDoc.destroy();
	} );
} );
