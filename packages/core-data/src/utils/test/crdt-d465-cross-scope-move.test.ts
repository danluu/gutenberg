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
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
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
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function group( innerBlocks: Block[] = [] ): Block {
	return {
		name: 'core/group',
		clientId: 'group',
		attributes: { layout: { type: 'constrained' } },
		innerBlocks,
	};
}

function initialBlocks(): Block[] {
	return [
		group(),
		paragraph( 'moved-paragraph', 'Move me' ),
		paragraph( 'tail-paragraph', 'Tail' ),
	];
}

function movedIntoGroup(): Block[] {
	return [
		group( [ paragraph( 'moved-paragraph', 'Move me' ) ] ),
		paragraph( 'tail-paragraph', 'Tail' ),
	];
}

function staleLocalDuplicateWithTailEdit(): Block[] {
	return [
		group( [ paragraph( 'moved-paragraph', 'Move me' ) ] ),
		paragraph( 'moved-paragraph', 'Move me' ),
		paragraph( 'tail-paragraph', 'Tail local edit' ),
	];
}

function staleOldRootWithTailEdit(): Block[] {
	return [
		group(),
		paragraph( 'moved-paragraph', 'Move me' ),
		paragraph( 'tail-paragraph', 'Tail local edit' ),
	];
}

function rootClientIds( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.clientId as string
	);
}

function groupChildClientIds( yblocks: Y.Array< YBlock > ): string[] {
	const blocks = yblocks.toJSON() as Block[];
	return ( blocks[ 0 ].innerBlocks ?? [] ).map(
		( block ) => block.clientId as string
	);
}

function countMovedParagraphs( blocks: Block[] ): number {
	let count = 0;
	for ( const block of blocks ) {
		if ( block.clientId === 'moved-paragraph' ) {
			count++;
		}
		count += countMovedParagraphs( block.innerBlocks ?? [] );
	}
	return count;
}

describe( 'd465f26f6b79 cross-scope move reconciliation', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not reinsert a stale top-level copy after a paragraph moves into a group without baseBlocks', () => {
		mergeCrdtBlocks( yblocks, initialBlocks(), null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		mergeCrdtBlocks( remoteBlocks, movedIntoGroup(), null );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks( yblocks, staleLocalDuplicateWithTailEdit(), null );

		expect( rootClientIds( yblocks ) ).toEqual( [
			'group',
			'tail-paragraph',
		] );
		expect( groupChildClientIds( yblocks ) ).toEqual( [
			'moved-paragraph',
		] );
		expect( countMovedParagraphs( yblocks.toJSON() as Block[] ) ).toBe( 1 );
		remoteDoc.destroy();
	} );

	it( 'does not reinsert a stale top-level copy after a paragraph moves into a group with baseBlocks', () => {
		const baseBlocks = initialBlocks();
		mergeCrdtBlocks( yblocks, baseBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		mergeCrdtBlocks( remoteBlocks, movedIntoGroup(), null, baseBlocks );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			staleLocalDuplicateWithTailEdit(),
			null,
			baseBlocks
		);

		expect( rootClientIds( yblocks ) ).toEqual( [
			'group',
			'tail-paragraph',
		] );
		expect( groupChildClientIds( yblocks ) ).toEqual( [
			'moved-paragraph',
		] );
		expect( countMovedParagraphs( yblocks.toJSON() as Block[] ) ).toBe( 1 );
		remoteDoc.destroy();
	} );
	it( 'does not reinsert a stale old-root top-level copy after a paragraph moves into a group with baseBlocks', () => {
		const baseBlocks = initialBlocks();
		mergeCrdtBlocks( yblocks, baseBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		mergeCrdtBlocks( remoteBlocks, movedIntoGroup(), null, baseBlocks );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		mergeCrdtBlocks(
			yblocks,
			staleOldRootWithTailEdit(),
			null,
			baseBlocks
		);

		expect( rootClientIds( yblocks ) ).toEqual( [
			'group',
			'tail-paragraph',
		] );
		expect( groupChildClientIds( yblocks ) ).toEqual( [
			'moved-paragraph',
		] );
		expect( countMovedParagraphs( yblocks.toJSON() as Block[] ) ).toBe( 1 );
		remoteDoc.destroy();
	} );
} );
