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

jest.mock( 'uuid', () => ( {
	v4: () => 'mocked-uuid',
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( () => null ),
	updateSelectionHistory: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: (
		blocks: { name: string; clientId?: string }[]
	) =>
		blocks
			.map( ( block ) => `${ block.name }:${ block.clientId ?? '' }` )
			.join( '\n' ),
	getBlockTypes: () => [
		{
			name: 'core/group',
			attributes: {
				layout: { type: 'object' },
			},
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
			name: 'core/table',
			attributes: {
				caption: { type: 'rich-text' },
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

function table( clientId: string, cellContent: string ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {
			caption: `${ cellContent } caption`,
			body: [
				{
					cells: [
						{
							content: cellContent,
							tag: 'td',
						},
					],
				},
			],
		},
		innerBlocks: [],
	};
}

function group( clientId: string ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: { layout: { type: 'constrained' } },
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

function serializeBlocks( blocks: Block[] ): string {
	return blocks.map( ( block ) => block.clientId ).join( '\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	).toJSON() as Block[];
}

function clientIds( blocks: Block[] ): ( string | undefined )[] {
	return blocks.map( ( block ) => block.clientId );
}

describe( '96d728530b28 stale base-record suffix move', () => {
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

	it( 'preserves a remote group and table attributes through a stale pullquote move', () => {
		const initialBlocks = [
			paragraph( 'paragraph-intro', 'intro paragraph' ),
			table( 'table-main', 'table cell survives' ),
			paragraph( 'paragraph-middle', 'middle paragraph' ),
			pullquote(
				'pullquote-main',
				'pullquote body survives',
				'pullquote cite survives'
			),
			paragraph( 'paragraph-tail', 'tail paragraph' ),
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

		const withRemoteGroup = [
			initialBlocks[ 0 ],
			group( 'remote-group' ),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
			initialBlocks[ 4 ],
		];
		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: withRemoteGroup,
				content: serializeBlocks( withRemoteGroup ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const stalePullquoteMove = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			initialBlocks[ 3 ],
			initialBlocks[ 2 ],
			initialBlocks[ 4 ],
		];
		applyPostChangesToCRDTDoc(
			viewerDoc,
			{
				blocks: stalePullquoteMove,
				content: serializeBlocks( stalePullquoteMove ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const blocks = postBlocks( viewerDoc );
		expect( clientIds( blocks ) ).toEqual( [
			'paragraph-intro',
			'remote-group',
			'table-main',
			'pullquote-main',
			'paragraph-middle',
			'paragraph-tail',
		] );
		expect( blocks.map( ( block ) => block.name ) ).toEqual( [
			'core/paragraph',
			'core/group',
			'core/table',
			'core/pullquote',
			'core/paragraph',
			'core/paragraph',
		] );

		const tableBlock = blocks.find(
			( block ) => block.clientId === 'table-main'
		);
		const tableRows = tableBlock?.attributes.body as
			| { cells?: { content?: string; tag?: string }[] }[]
			| undefined;
		expect( tableRows?.[ 0 ]?.cells?.[ 0 ] ).toMatchObject( {
			content: 'table cell survives',
			tag: 'td',
		} );

		const pullquoteBlock = blocks.find(
			( block ) => block.clientId === 'pullquote-main'
		);
		expect( pullquoteBlock?.attributes ).toMatchObject( {
			value: 'pullquote body survives',
			citation: 'pullquote cite survives',
		} );

		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );
		expect( clientIds( postBlocks( actorDoc ) ) ).toEqual(
			clientIds( blocks )
		);
	} );
} );
