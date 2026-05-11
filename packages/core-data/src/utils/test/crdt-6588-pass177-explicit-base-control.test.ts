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
	const serializeBlock = ( block: {
		name: string;
		attributes?: Record< string, unknown >;
		innerBlocks?: unknown[];
	} ): string => {
		if ( block.name === 'core/heading' ) {
			return `<h2>${ block.attributes?.content ?? '' }</h2>`;
		}
		if ( block.name === 'core/group' ) {
			return `<div>${ ( block.innerBlocks ?? [] )
				.map( serializeBlock )
				.join( '\n' ) }</div>`;
		}
		if ( block.name === 'core/pullquote' ) {
			return `<figure>${ block.attributes?.value ?? '' }</figure>`;
		}
		return `<p>${ block.attributes?.content ?? '' }</p>`;
	};

	return {
		...actual,
		__unstableSerializeAndClean: ( blocks: unknown[] ) =>
			blocks.map( serializeBlock ).join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/group',
				attributes: {},
			},
			{
				name: 'core/pullquote',
				attributes: {
					citation: { type: 'rich-text' },
					value: { type: 'rich-text' },
				},
			},
		],
	};
} );

/**
 * Internal dependencies
 */
import {
	mergeCrdtBlocks,
	type Block,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';

const LONG_PARAGRAPH =
	'Long shared paragraph used as the initial collaborative editing surface.';
const FOLLOW_UP_HEADING = 'Follow-up heading';
const TAIL_PARAGRAPH =
	'Tail paragraph kept for save and reload stability checks.';
const GROUP_PARAGRAPH = 'Seed 954095 step 2 user 0 nested paragraph';

function block(
	name: string,
	clientId: string,
	attributes: Record< string, unknown > = {},
	innerBlocks: Block[] = []
): Block {
	return {
		name,
		clientId,
		attributes,
		innerBlocks,
	};
}

function paragraph( clientId: string, content: string ): Block {
	return block( 'core/paragraph', clientId, { content } );
}

function heading( clientId: string, content: string ): Block {
	return block( 'core/heading', clientId, { content } );
}

function group( clientId: string, childContent: string ): Block {
	return block( 'core/group', clientId, {}, [
		paragraph( `${ clientId }-child`, childContent ),
	] );
}

function pullquote( clientId: string, value: string ): Block {
	return block( 'core/pullquote', clientId, {
		citation: '<em>b</em><em>i</em>',
		value,
	} );
}

function blocksFrom( yblocks: YBlocks ): Block[] {
	return yblocks.toJSON() as Block[];
}

function summary( blocks: Block[] ): string[] {
	return blocks.map( ( candidate ) => {
		if ( candidate.name === 'core/group' ) {
			return `group:${
				candidate.innerBlocks[ 0 ]?.attributes.content ?? ''
			}`;
		}
		if ( candidate.name === 'core/heading' ) {
			return `heading:${ candidate.attributes.content ?? '' }`;
		}
		if ( candidate.name === 'core/pullquote' ) {
			return `pullquote:${ candidate.attributes.value ?? '' }`;
		}
		return `paragraph:${ candidate.attributes.content ?? '' }`;
	} );
}

function applyPostBlocks(
	yblocks: YBlocks,
	blocks: Block[],
	baseBlocks?: Block[]
): void {
	mergeCrdtBlocks( yblocks, blocks, null, baseBlocks );
}

describe( '6588affd5149 explicit-base stale Group insert control', () => {
	let actorDoc: Y.Doc;
	let actorBlocks: Y.Array< YBlock >;
	let viewerDoc: Y.Doc;
	let viewerBlocks: Y.Array< YBlock >;

	beforeEach( () => {
		actorDoc = new Y.Doc();
		actorBlocks = actorDoc.getArray< YBlock >( 'blocks' );
		viewerDoc = new Y.Doc();
		viewerBlocks = viewerDoc.getArray< YBlock >( 'blocks' );
	} );

	afterEach( () => {
		actorDoc.destroy();
		viewerDoc.destroy();
	} );

	function createScenario() {
		const initialBlocks = [
			paragraph( 'long-paragraph', LONG_PARAGRAPH ),
			heading( 'follow-up-heading', FOLLOW_UP_HEADING ),
			paragraph( 'tail-paragraph', TAIL_PARAGRAPH ),
			paragraph( 'formatted-paragraph', '<em>italic</em>beta 954095 0' ),
			pullquote( 'pullquote', '<em>alpha</em><strong>beta</strong>' ),
		];
		const withRemoteGroup = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
			group( 'inserted-group', GROUP_PARAGRAPH ),
			initialBlocks[ 3 ],
			initialBlocks[ 4 ],
		];
		const staleLocalEdit = [
			paragraph(
				'long-paragraph',
				`${ LONG_PARAGRAPH } Local stale edit.`
			),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
			initialBlocks[ 4 ],
		];

		applyPostBlocks( viewerBlocks, initialBlocks );
		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );
		applyPostBlocks( actorBlocks, withRemoteGroup, initialBlocks );
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		expect( summary( blocksFrom( viewerBlocks ) ) ).toEqual( [
			`paragraph:${ LONG_PARAGRAPH }`,
			`heading:${ FOLLOW_UP_HEADING }`,
			`paragraph:${ TAIL_PARAGRAPH }`,
			`group:${ GROUP_PARAGRAPH }`,
			'paragraph:<em>italic</em>beta 954095 0',
			'pullquote:<em>alpha</em><strong>beta</strong>',
		] );

		return { initialBlocks, staleLocalEdit };
	}

	it( 'keeps the remote Group through the cache-only stale snapshot path', () => {
		const { staleLocalEdit } = createScenario();
		applyPostBlocks( viewerBlocks, staleLocalEdit );

		expect( summary( blocksFrom( viewerBlocks ) ) ).toEqual( [
			`paragraph:${ LONG_PARAGRAPH } Local stale edit.`,
			`heading:${ FOLLOW_UP_HEADING }`,
			`paragraph:${ TAIL_PARAGRAPH }`,
			`group:${ GROUP_PARAGRAPH }`,
			'paragraph:<em>italic</em>beta 954095 0',
			'pullquote:<em>alpha</em><strong>beta</strong>',
		] );
	} );

	it( 'keeps the remote Group through the explicit baseRecord.blocks path', () => {
		const { initialBlocks, staleLocalEdit } = createScenario();
		applyPostBlocks( viewerBlocks, staleLocalEdit, initialBlocks );

		expect( summary( blocksFrom( viewerBlocks ) ) ).toEqual( [
			`paragraph:${ LONG_PARAGRAPH } Local stale edit.`,
			`heading:${ FOLLOW_UP_HEADING }`,
			`paragraph:${ TAIL_PARAGRAPH }`,
			`group:${ GROUP_PARAGRAPH }`,
			'paragraph:<em>italic</em>beta 954095 0',
			'pullquote:<em>alpha</em><strong>beta</strong>',
		] );
	} );
} );
