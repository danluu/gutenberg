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
	};
} );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn(),
	getShiftedSelection: jest.fn(),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function block(
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
		.map( ( candidate ) =>
			candidate.name === 'core/heading'
				? `<h2>${ candidate.attributes.content }</h2>`
				: `<p>${ candidate.attributes.content }</p>`
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
	return blocks.map( ( candidate ) => candidate.attributes.content as string );
}

describe( '9cf81e169f7e stale top-level checkpoint move reconstruction', () => {
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

	it( 'preserves the checkpoint paragraph and remote heading through a stale tail move', () => {
		const initialBlocks = [
			block( 'core/heading', 'initial-heading', 'Initial heading' ),
			block( 'core/paragraph', 'shared-body', 'Shared body paragraph' ),
			block(
				'core/paragraph',
				'step-5-checkpoint',
				'Step 5 saved checkpoint paragraph'
			),
			block( 'core/paragraph', 'old-tail', 'Old tail paragraph' ),
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

		const withRemoteHeading = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			block( 'core/heading', 'step-6-heading', 'Step 6 inserted heading' ),
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: withRemoteHeading,
				content: serializeBlocks( withRemoteHeading ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleTailMoveWithoutRemoteHeading = [
			initialBlocks[ 0 ],
			initialBlocks[ 3 ],
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
		];
		applyPostChangesToCRDTDoc(
			viewerDoc,
			{
				blocks: staleTailMoveWithoutRemoteHeading,
				content: serializeBlocks( staleTailMoveWithoutRemoteHeading ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const viewerContents = contentsOf( postBlocks( viewerDoc ) );
		expect( viewerContents ).toEqual( [
			'Initial heading',
			'Old tail paragraph',
			'Shared body paragraph',
			'Step 6 inserted heading',
			'Step 5 saved checkpoint paragraph',
		] );
		expect(
			viewerContents.filter(
				( content ) => content === 'Step 6 inserted heading'
			)
		).toHaveLength( 1 );
		expect( viewerContents ).toContain(
			'Step 5 saved checkpoint paragraph'
		);
		expect( postContent( viewerDoc ) ).toContain(
			'Step 6 inserted heading'
		);
		expect( postContent( viewerDoc ) ).toContain(
			'Step 5 saved checkpoint paragraph'
		);

		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );
		expect( contentsOf( postBlocks( actorDoc ) ) ).toEqual(
			viewerContents
		);
		expect( postContent( actorDoc ) ).toBe( postContent( viewerDoc ) );
	} );
} );
