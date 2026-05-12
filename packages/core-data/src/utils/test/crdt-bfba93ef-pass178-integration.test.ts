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
			blocks: { attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) => `<p>${ block.attributes.content }</p>` )
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: () => undefined,
	getShiftedSelection: ( selection: unknown ) => selection,
	updateSelectionHistory: () => {},
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

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
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

describe( 'bfba93ef2da8 base-record paragraph insert/move integration route', () => {
	let actorDoc: Y.Doc;
	let moverDoc: Y.Doc;

	beforeEach( () => {
		actorDoc = new Y.Doc();
		moverDoc = new Y.Doc();
	} );

	afterEach( () => {
		actorDoc.destroy();
		moverDoc.destroy();
	} );

	it( 'preserves a remotely inserted paragraph when another peer moves a stale neighboring paragraph snapshot', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'checkpoint', 'Checkpoint' ),
			paragraph( 'tail', 'Tail' ),
		];

		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: initialBlocks,
				content: serializeBlocks( initialBlocks ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( moverDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const withRemoteInsert = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			paragraph( 'remote-inserted', 'Inserted by remote peer' ),
			initialBlocks[ 2 ],
		];
		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: withRemoteInsert,
				content: serializeBlocks( withRemoteInsert ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( moverDoc, Y.encodeStateAsUpdate( actorDoc ) );

		expect( contentsOf( postBlocks( moverDoc ) ) ).toEqual( [
			'Alpha',
			'Checkpoint',
			'Inserted by remote peer',
			'Tail',
		] );

		const staleMoveWithoutRemoteInsert = [
			initialBlocks[ 2 ],
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
		];
		applyPostChangesToCRDTDoc(
			moverDoc,
			{
				blocks: staleMoveWithoutRemoteInsert,
				content: serializeBlocks( staleMoveWithoutRemoteInsert ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const expected = [
			'Tail',
			'Alpha',
			'Checkpoint',
			'Inserted by remote peer',
		];
		expect( contentsOf( postBlocks( moverDoc ) ) ).toEqual( expected );
		expect( postContent( moverDoc ) ).toContain(
			'Inserted by remote peer'
		);

		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( moverDoc ) );
		expect( contentsOf( postBlocks( actorDoc ) ) ).toEqual( expected );
		expect( postContent( actorDoc ) ).toBe( postContent( moverDoc ) );
	} );
} );
