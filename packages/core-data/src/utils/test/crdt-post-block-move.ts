/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: jest.fn( ( blocks ) => blocks ),
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/heading',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

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
import {
	type Block,
	type YBlock,
	type YBlockAttributes,
	type YBlocks,
} from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const syncedProperties = new Set< string >( [ 'blocks' ] );

function getBlocks( doc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

function getYBlockContent( block: YBlock ): string {
	const content = ( block.get( 'attributes' ) as YBlockAttributes ).get(
		'content'
	) as Y.Text;
	return content.toString();
}

function getOptionalYBlockContent( block: YBlock ): string | undefined {
	const attributes = block.get( 'attributes' ) as
		| YBlockAttributes
		| undefined;
	const content = attributes?.get( 'content' ) as Y.Text | undefined;
	return content?.toString();
}

function getAdjacentMoveBlocks() {
	const insertedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Inserted paragraph' },
		innerBlocks: [],
		clientId: 'inserted-block',
	};
	const movedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Moved paragraph' },
		innerBlocks: [],
		clientId: 'moved-block',
	};
	const displacedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Displaced paragraph' },
		innerBlocks: [],
		clientId: 'displaced-block',
	};

	return {
		displacedBlock,
		insertedBlock,
		movedBlock,
	};
}

function getPermutationBlocks() {
	return [ 'Alpha', 'Bravo', 'Charlie', 'Delta' ].map(
		( content, index ): Block => ( {
			name: 'core/paragraph',
			attributes: { content },
			innerBlocks: [],
			clientId: `permutation-block-${ index }`,
		} )
	);
}

function getPermutations< T >( values: T[] ): T[][] {
	if ( values.length <= 1 ) {
		return [ values ];
	}

	return values.flatMap( ( value, index ) =>
		getPermutations( [
			...values.slice( 0, index ),
			...values.slice( index + 1 ),
		] ).map( ( permutation ) => [ value, ...permutation ] )
	);
}

function getNestedMoveBlocks() {
	const introBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Nested intro paragraph' },
		innerBlocks: [],
		clientId: 'nested-intro-block',
	};
	const movedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Nested moved paragraph' },
		innerBlocks: [],
		clientId: 'nested-moved-block',
	};
	const displacedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'Nested displaced paragraph' },
		innerBlocks: [],
		clientId: 'nested-displaced-block',
	};
	const groupBlock: Block = {
		name: 'core/group',
		attributes: {},
		innerBlocks: [ introBlock, movedBlock, displacedBlock ],
		clientId: 'group-block',
	};

	return {
		displacedBlock,
		groupBlock,
		introBlock,
		movedBlock,
	};
}

function getRealisticStructuralEditBlocks() {
	const headingBlock: Block = {
		name: 'core/heading',
		attributes: { content: 'Seed 5ee0be2f9b7d top-level heading' },
		innerBlocks: [],
		clientId: 'heading-block',
	};
	const insertedBlock: Block = {
		name: 'core/paragraph',
		attributes: { content: 'RTC 5ee0be2f9b7d inserted paragraph' },
		innerBlocks: [],
		clientId: 'inserted-block',
	};
	const movedBlock: Block = {
		name: 'core/paragraph',
		attributes: {
			content:
				'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.',
		},
		innerBlocks: [],
		clientId: 'moved-block',
	};
	const displacedBlock: Block = {
		name: 'core/paragraph',
		attributes: {
			content:
				'Another paragraph exists so the top-level list is not degenerate.',
		},
		innerBlocks: [],
		clientId: 'displaced-block',
	};

	return {
		displacedBlock,
		headingBlock,
		insertedBlock,
		movedBlock,
	};
}

describe( 'post CRDT block move reconciliation', () => {
	let doc: Y.Doc;

	afterEach( () => {
		doc?.destroy();
	} );

	it( 'represents adjacent pure block moves as structural post block changes', () => {
		doc = new Y.Doc();
		const { displacedBlock, insertedBlock, movedBlock } =
			getAdjacentMoveBlocks();

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);

		const blocks = getBlocks( doc );
		const arrayDeltas: unknown[] = [];
		const nonArrayEventTargets: string[] = [];

		blocks.observeDeep( ( events ) => {
			for ( const event of events ) {
				if ( event.target === blocks ) {
					arrayDeltas.push( event.changes.delta );
					continue;
				}

				nonArrayEventTargets.push( event.target.constructor.name );
			}
		} );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, displacedBlock, movedBlock ],
			},
			syncedProperties
		);

		expect( nonArrayEventTargets ).toEqual( [] );
		expect( arrayDeltas ).toHaveLength( 1 );
		expect( blocks.toJSON() ).toEqual( [
			insertedBlock,
			displacedBlock,
			movedBlock,
		] );
	} );

	it( 'applies adjacent pure block moves to remote peers as structural post block changes', () => {
		doc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const { displacedBlock, insertedBlock, movedBlock } =
			getAdjacentMoveBlocks();

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const blocks = getBlocks( doc );
		const remoteBlocks = getBlocks( remoteDoc );
		const remoteStateVector = Y.encodeStateVector( remoteDoc );
		const remoteArrayDeltas: unknown[] = [];
		const remoteNonArrayEventTargets: string[] = [];

		remoteBlocks.observeDeep( ( events ) => {
			for ( const event of events ) {
				if ( event.target === remoteBlocks ) {
					remoteArrayDeltas.push( event.changes.delta );
					continue;
				}

				remoteNonArrayEventTargets.push(
					event.target.constructor.name
				);
			}
		} );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, displacedBlock, movedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate(
			remoteDoc,
			Y.encodeStateAsUpdate( doc, remoteStateVector )
		);

		expect( remoteNonArrayEventTargets ).toEqual( [] );
		expect( remoteArrayDeltas ).toHaveLength( 1 );
		expect( blocks.toJSON() ).toEqual( [
			insertedBlock,
			displacedBlock,
			movedBlock,
		] );
		expect( remoteBlocks.toJSON() ).toEqual( [
			insertedBlock,
			displacedBlock,
			movedBlock,
		] );

		remoteDoc.destroy();
	} );

	it( 'represents all pure block permutations as structural remote changes', () => {
		const initialBlocks = getPermutationBlocks();
		const permutations = getPermutations( initialBlocks ).filter(
			( permutation ) =>
				permutation.some(
					( block, index ) =>
						block.clientId !== initialBlocks[ index ].clientId
				)
		);

		for ( const permutation of permutations ) {
			doc = new Y.Doc();
			const remoteDoc = new Y.Doc();

			applyPostChangesToCRDTDoc(
				doc,
				{
					blocks: initialBlocks,
				},
				syncedProperties
			);
			Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

			const blocks = getBlocks( doc );
			const remoteBlocks = getBlocks( remoteDoc );
			const remoteStateVector = Y.encodeStateVector( remoteDoc );
			const remoteArrayDeltas: unknown[] = [];
			const remoteNonArrayEventTargets: string[] = [];

			remoteBlocks.observeDeep( ( events ) => {
				for ( const event of events ) {
					if ( event.target === remoteBlocks ) {
						remoteArrayDeltas.push( event.changes.delta );
						continue;
					}

					remoteNonArrayEventTargets.push(
						event.target.constructor.name
					);
				}
			} );

			applyPostChangesToCRDTDoc(
				doc,
				{
					blocks: permutation,
				},
				syncedProperties
			);
			Y.applyUpdate(
				remoteDoc,
				Y.encodeStateAsUpdate( doc, remoteStateVector )
			);

			expect( remoteNonArrayEventTargets ).toEqual( [] );
			expect( remoteArrayDeltas ).toHaveLength( 1 );
			expect( blocks.toJSON() ).toEqual( permutation );
			expect( remoteBlocks.toJSON() ).toEqual( permutation );

			remoteDoc.destroy();
			doc.destroy();
		}
	} );

	it( 'applies nested pure block moves to remote peers as structural child block changes', () => {
		doc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const { displacedBlock, groupBlock, introBlock, movedBlock } =
			getNestedMoveBlocks();
		const reorderedGroupBlock: Block = {
			...groupBlock,
			innerBlocks: [ introBlock, displacedBlock, movedBlock ],
		};

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ groupBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const blocks = getBlocks( doc );
		const remoteBlocks = getBlocks( remoteDoc );
		const remoteGroupBlock = remoteBlocks.get( 0 );
		const remoteInnerBlocks = remoteGroupBlock.get(
			'innerBlocks'
		) as YBlocks;
		const remoteStateVector = Y.encodeStateVector( remoteDoc );
		const remoteArrayDeltas: unknown[] = [];
		const remoteNonArrayEventTargets: string[] = [];

		remoteInnerBlocks.observeDeep( ( events ) => {
			for ( const event of events ) {
				if ( event.target === remoteInnerBlocks ) {
					remoteArrayDeltas.push( event.changes.delta );
					continue;
				}

				remoteNonArrayEventTargets.push(
					event.target.constructor.name
				);
			}
		} );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ reorderedGroupBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate(
			remoteDoc,
			Y.encodeStateAsUpdate( doc, remoteStateVector )
		);

		expect( remoteNonArrayEventTargets ).toEqual( [] );
		expect( remoteArrayDeltas ).toHaveLength( 1 );
		expect( blocks.toJSON() ).toEqual( [ reorderedGroupBlock ] );
		expect( remoteBlocks.toJSON() ).toEqual( [ reorderedGroupBlock ] );

		remoteDoc.destroy();
	} );

	it( 'replays the generated structural edit sequence as a structural remote move', () => {
		doc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const { displacedBlock, headingBlock, insertedBlock, movedBlock } =
			getRealisticStructuralEditBlocks();

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ headingBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ movedBlock, displacedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const blocks = getBlocks( doc );
		const remoteBlocks = getBlocks( remoteDoc );
		const remoteStateVector = Y.encodeStateVector( remoteDoc );
		const remoteArrayDeltas: unknown[] = [];
		const remoteNonArrayEventTargets: string[] = [];

		remoteBlocks.observeDeep( ( events ) => {
			for ( const event of events ) {
				if ( event.target === remoteBlocks ) {
					remoteArrayDeltas.push( event.changes.delta );
					continue;
				}

				remoteNonArrayEventTargets.push(
					event.target.constructor.name
				);
			}
		} );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, displacedBlock, movedBlock ],
			},
			syncedProperties
		);
		Y.applyUpdate(
			remoteDoc,
			Y.encodeStateAsUpdate( doc, remoteStateVector )
		);

		expect( remoteNonArrayEventTargets ).toEqual( [] );
		expect( remoteArrayDeltas ).toHaveLength( 1 );
		expect( blocks.toJSON() ).toEqual( [
			insertedBlock,
			displacedBlock,
			movedBlock,
		] );
		expect( remoteBlocks.toJSON() ).toEqual( [
			insertedBlock,
			displacedBlock,
			movedBlock,
		] );

		remoteDoc.destroy();
	} );

	it( 'does not morph post-entrypoint block records during the generated structural edit sequence', () => {
		doc = new Y.Doc();
		const { displacedBlock, headingBlock, insertedBlock, movedBlock } =
			getRealisticStructuralEditBlocks();

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ headingBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ movedBlock, displacedBlock ],
			},
			syncedProperties
		);

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, movedBlock, displacedBlock ],
			},
			syncedProperties
		);

		const blocks = getBlocks( doc );
		const movedYBlock = blocks.get( 1 );
		const displacedYBlock = blocks.get( 2 );
		const rewrittenClientIds: string[] = [];

		blocks.observeDeep( ( events ) => {
			for ( const event of events ) {
				if (
					event.target instanceof Y.Map &&
					event.keysChanged.has( 'clientId' )
				) {
					rewrittenClientIds.push(
						event.target.get( 'clientId' ) as string
					);
				}
			}
		} );

		applyPostChangesToCRDTDoc(
			doc,
			{
				blocks: [ insertedBlock, displacedBlock, movedBlock ],
			},
			syncedProperties
		);

		expect( [ undefined, movedBlock.attributes.content ] ).toContain(
			getOptionalYBlockContent( movedYBlock )
		);
		expect( [ undefined, displacedBlock.attributes.content ] ).toContain(
			getOptionalYBlockContent( displacedYBlock )
		);
		expect( rewrittenClientIds ).toEqual( [] );
		expect(
			Array.from( { length: blocks.length }, ( _value, index ) =>
				getYBlockContent( blocks.get( index ) )
			)
		).toEqual( [
			insertedBlock.attributes.content,
			displacedBlock.attributes.content,
			movedBlock.attributes.content,
		] );
	} );
} );
