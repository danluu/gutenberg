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

/**
 * Mock getBlockTypes so CRDT merging treats Pullquote text as rich text.
 */
jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/group',
			attributes: {},
		},
		{
			name: 'core/pullquote',
			attributes: {
				value: { type: 'rich-text' },
				citation: { type: 'rich-text' },
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

function pullquote( clientId: string, value = 'RTC Pullquote body' ): Block {
	return {
		name: 'core/pullquote',
		clientId,
		attributes: {
			value,
			citation: 'RTC Pullquote citation',
		},
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] = [] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks,
	};
}

function describeBlocks( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => {
		const childDescriptions = describeBlocks( block.innerBlocks ?? [] );
		const children = childDescriptions.length
			? `[${ childDescriptions.join( ',' ) }]`
			: '';
		const value =
			typeof block.attributes.value === 'string'
				? `:${ block.attributes.value }`
				: '';

		return `${ block.name }:${ block.clientId }${ value }${ children }`;
	} );
}

function countClientId( blocks: Block[], clientId: string ): number {
	return blocks.reduce(
		( count, block ) =>
			count +
			( block.clientId === clientId ? 1 : 0 ) +
			countClientId( block.innerBlocks ?? [], clientId ),
		0
	);
}

describe( 'Pullquote move into Group stale snapshot', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not keep a stale top-level Pullquote after the same Pullquote is remotely moved into a Group', () => {
		const initialBlocks = [
			pullquote( 'pullquote-client-id' ),
			group( 'group-client-id' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const movedBlocks = [
			group( 'group-client-id', [ pullquote( 'pullquote-client-id' ) ] ),
		];
		mergeCrdtBlocks( remoteBlocks, movedBlocks, null );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		const staleLocalBlocks = [
			pullquote( 'pullquote-client-id' ),
			group( 'group-client-id' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocks, null );

		const finalBlocks = yblocks.toJSON() as Block[];
		expect( describeBlocks( finalBlocks ) ).toEqual( [
			'core/group:group-client-id[core/pullquote:pullquote-client-id:RTC Pullquote body]',
		] );
		expect( countClientId( finalBlocks, 'pullquote-client-id' ) ).toBe( 1 );

		remoteDoc.destroy();
	} );

	it( 'keeps a local Pullquote edit while adopting the remote move into a Group', () => {
		const initialBlocks = [
			pullquote( 'pullquote-client-id' ),
			group( 'group-client-id' ),
		];
		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		const movedBlocks = [
			group( 'group-client-id', [ pullquote( 'pullquote-client-id' ) ] ),
		];
		mergeCrdtBlocks( remoteBlocks, movedBlocks, null );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		const staleLocalBlocksWithEdit = [
			pullquote( 'pullquote-client-id', 'Local edit after stale view' ),
			group( 'group-client-id' ),
		];
		mergeCrdtBlocks( yblocks, staleLocalBlocksWithEdit, null );

		const finalBlocks = yblocks.toJSON() as Block[];
		expect( describeBlocks( finalBlocks ) ).toEqual( [
			'core/group:group-client-id[core/pullquote:pullquote-client-id:Local edit after stale view]',
		] );
		expect( countClientId( finalBlocks, 'pullquote-client-id' ) ).toBe( 1 );

		remoteDoc.destroy();
	} );
} );
