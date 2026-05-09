/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;
	const serializeBlock = ( block: {
		attributes?: Record< string, unknown >;
		innerBlocks?: unknown[];
		name: string;
	} ): string => {
		if ( block.name === 'core/group' ) {
			return `<div>${ ( block.innerBlocks ?? [] )
				.map( serializeBlock )
				.join( '\n' ) }</div>`;
		}

		if ( block.name === 'core/search' ) {
			return `<form>${ block.attributes?.label ?? '' }</form>`;
		}

		if ( block.name === 'core/heading' ) {
			return `<h2>${ block.attributes?.content ?? '' }</h2>`;
		}

		return `<p>${ block.attributes?.content ?? '' }</p>`;
	};

	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: {
				attributes?: Record< string, unknown >;
				innerBlocks?: unknown[];
				name: string;
			}[]
		) => blocks.map( serializeBlock ).join( '\n\n' ),
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
				name: 'core/group',
				attributes: { layout: { type: 'object' } },
			},
			{
				name: 'core/search',
				attributes: {
					buttonPosition: { type: 'string' },
					buttonText: { type: 'string' },
					label: { type: 'string' },
					placeholder: { type: 'string' },
					showLabel: { type: 'boolean' },
				},
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

function makeBlock(
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
	return makeBlock( 'core/paragraph', clientId, { content } );
}

function serializeBlocks( blocks: Block[] ): string {
	const serializeBlock = ( block: Block ): string => {
		if ( block.name === 'core/group' ) {
			return `<div>${ ( block.innerBlocks ?? [] )
				.map( serializeBlock )
				.join( '\n' ) }</div>`;
		}

		if ( block.name === 'core/search' ) {
			return `<form>${ block.attributes.label ?? '' }</form>`;
		}

		if ( block.name === 'core/heading' ) {
			return `<h2>${ block.attributes.content ?? '' }</h2>`;
		}

		return `<p>${ block.attributes.content ?? '' }</p>`;
	};

	return blocks.map( serializeBlock ).join( '\n\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	).toJSON() as Block[];
}

describe( '917b18171038 stale Search move with baseRecord', () => {
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

	it( 'preserves a remote Group move when the stale local Search move carries baseRecord', () => {
		const heading = makeBlock( 'core/heading', 'heading', {
			content: 'Seed 953041 heading',
		} );
		const concurrent = paragraph(
			'concurrent',
			'Seed 953041 concurrent paragraph'
		);
		const emptyGroup = makeBlock(
			'core/group',
			'group',
			{ layout: { type: 'constrained' } },
			[]
		);
		const searchOne = makeBlock( 'core/search', 'search-one', {
			buttonPosition: 'button-inside',
			buttonText: 'Find initial',
			label: 'Search label initial',
			placeholder: 'Search placeholder initial',
			showLabel: true,
		} );
		const checkpoint = paragraph(
			'checkpoint',
			'rtc-save-paragraph-marker-953041-4-0-end'
		);
		const checkpointSearch = makeBlock(
			'core/search',
			'checkpoint-search',
			{
				buttonPosition: 'button-inside',
				buttonText: 'Find checkpoint',
				label: 'Search label checkpoint',
				placeholder: 'Search placeholder checkpoint',
				showLabel: true,
			}
		);
		const moved = paragraph( 'moved', 'Seed 953041 moved tail paragraph' );
		const initialBlocks = [
			heading,
			concurrent,
			emptyGroup,
			searchOne,
			checkpoint,
			checkpointSearch,
			moved,
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

		const groupWithConcurrent = makeBlock(
			'core/group',
			'group',
			{ layout: { type: 'constrained' } },
			[ concurrent ]
		);
		const remoteGroupMove = [
			heading,
			groupWithConcurrent,
			searchOne,
			checkpoint,
			checkpointSearch,
			moved,
		];
		applyPostChangesToCRDTDoc(
			actorDoc,
			{
				blocks: remoteGroupMove,
				content: serializeBlocks( remoteGroupMove ),
			},
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );

		const staleCheckpointSearchMove = [
			checkpointSearch,
			heading,
			concurrent,
			emptyGroup,
			searchOne,
			checkpoint,
			moved,
		];
		applyPostChangesToCRDTDoc(
			viewerDoc,
			{
				blocks: staleCheckpointSearchMove,
				content: serializeBlocks( staleCheckpointSearchMove ),
			},
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);

		const blocks = postBlocks( viewerDoc );

		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'checkpoint-search',
			'heading',
			'group',
			'search-one',
			'checkpoint',
			'moved',
		] );
		expect( blocks[ 2 ].innerBlocks.map( ( block ) => block.clientId ) ).toEqual(
			[ 'concurrent' ]
		);
		expect(
			blocks.filter( ( block ) => block.clientId === 'concurrent' )
		).toHaveLength( 0 );
		expect(
			blocks
				.filter( ( block ) => block.name === 'core/search' )
				.some( ( block ) =>
					Object.prototype.hasOwnProperty.call(
						block.attributes,
						'content'
					)
				)
		).toBe( false );
	} );
} );
