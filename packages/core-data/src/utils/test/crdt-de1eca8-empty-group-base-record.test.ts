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
	const mockSerializeBlock = ( block: {
		name: string;
		attributes: { content?: string };
		innerBlocks: Array< {
			name: string;
			attributes: { content?: string };
			innerBlocks: [];
		} >;
	} ): string => {
		if ( block.name === 'core/group' ) {
			return [
				'<!-- wp:group {"layout":{"type":"constrained"}} -->',
				`<div class="wp-block-group">${ block.innerBlocks
					.map( mockSerializeBlock )
					.join( '' ) }</div>`,
				'<!-- /wp:group -->',
			].join( '\n' );
		}

		return [
			'<!-- wp:paragraph -->',
			`<p>${ block.attributes.content }</p>`,
			'<!-- /wp:paragraph -->',
		].join( '\n' );
	};

	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: Array< {
				name: string;
				attributes: { content?: string };
				innerBlocks: [];
			} >
		) => blocks.map( mockSerializeBlock ).join( '\n' ),
		getBlockTypes: () => [
			{
				name: 'core/group',
				attributes: { layout: { type: 'object' } },
			},
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

type TestBlock = Block & {
	attributes: {
		content?: string;
		layout?: { type: string };
	};
	innerBlocks: TestBlock[];
};

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function paragraph( clientId: string, content: string ): TestBlock {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: TestBlock[] = [] ): TestBlock {
	return {
		name: 'core/group',
		clientId,
		attributes: { layout: { type: 'constrained' } },
		innerBlocks,
	};
}

function serializeBlock( block: TestBlock ): string {
	if ( block.name === 'core/group' ) {
		return [
			'<!-- wp:group {"layout":{"type":"constrained"}} -->',
			`<div class="wp-block-group">${ block.innerBlocks
				.map( serializeBlock )
				.join( '' ) }</div>`,
			'<!-- /wp:group -->',
		].join( '\n' );
	}

	return [
		'<!-- wp:paragraph -->',
		`<p>${ block.attributes.content }</p>`,
		'<!-- /wp:paragraph -->',
	].join( '\n' );
}

function serializeBlocks( blocks: TestBlock[] ): string {
	return blocks.map( serializeBlock ).join( '\n' );
}

function postBlocks( doc: Y.Doc ): TestBlock[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as TestBlock[];
}

function postContent( doc: Y.Doc ): string {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY )
			.get( 'content' )
			?.toString() ?? ''
	);
}

describe( 'RTC stale baseRecord empty group delete', () => {
	let localDoc: Y.Doc;
	let remoteDoc: Y.Doc;

	beforeEach( () => {
		localDoc = new Y.Doc();
		remoteDoc = new Y.Doc();
	} );

	afterEach( () => {
		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'does not resurrect a remotely deleted empty top-level group from a stale sibling edit', () => {
		const emptyGroupBase = [
			paragraph( 'before', 'Before' ),
			group( 'empty-group' ),
			paragraph( 'after', 'After' ),
		];

		applyPostChangesToCRDTDoc(
			localDoc,
			{
				blocks: emptyGroupBase,
				content: serializeBlocks( emptyGroupBase ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const remoteDeletedGroup = [
			paragraph( 'before', 'Before' ),
			paragraph( 'after', 'After' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: remoteDeletedGroup,
				content: serializeBlocks( remoteDeletedGroup ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: emptyGroupBase } }
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		expect( postBlocks( localDoc ).map( ( block ) => block.name ) ).toEqual(
			[ 'core/paragraph', 'core/paragraph' ]
		);

		const staleLocalEdit = [
			paragraph( 'before', 'Before edited after remote delete' ),
			group( 'empty-group' ),
			paragraph( 'after', 'After' ),
		];
		applyPostChangesToCRDTDoc(
			localDoc,
			{
				blocks: staleLocalEdit,
				content: serializeBlocks( staleLocalEdit ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: emptyGroupBase } }
		);

		const finalBlocks = postBlocks( localDoc );
		expect( finalBlocks.map( ( block ) => block.name ) ).toEqual( [
			'core/paragraph',
			'core/paragraph',
		] );
		expect(
			finalBlocks.map( ( block ) => block.attributes.content )
		).toEqual( [ 'Before edited after remote delete', 'After' ] );
		expect( postContent( localDoc ) ).not.toContain( 'wp:group' );
		expect( postContent( localDoc ) ).toContain(
			'Before edited after remote delete'
		);
	} );
} );
