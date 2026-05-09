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

jest.mock( '@wordpress/blocks', () => ( {
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
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

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

function paragraph( clientId: string, content: string ): Block {
	return block( 'core/paragraph', clientId, content );
}

function heading( clientId: string, content: string ): Block {
	return block( 'core/heading', clientId, content );
}

function contentsOf( yblocks: Y.Array< YBlock > ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( candidate ) => candidate.attributes.content as string
	);
}

describe( 'a91ac70bb0c3 stale top-level heading delete', () => {
	let localDoc: Y.Doc;
	let localBlocks: Y.Array< YBlock >;
	let remoteDoc: Y.Doc;
	let remoteBlocks: Y.Array< YBlock >;

	beforeEach( () => {
		localDoc = new Y.Doc();
		localBlocks = localDoc.getArray< YBlock >();
		remoteDoc = new Y.Doc();
		remoteBlocks = remoteDoc.getArray< YBlock >();
	} );

	afterEach( () => {
		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'does not resurrect a remotely deleted top-level heading from a stale local paragraph edit', () => {
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			heading( 'remote-heading', 'Remote heading' ),
			paragraph( 'beta', 'Beta' ),
		];
		mergeCrdtBlocks( localBlocks, initialBlocks, null );

		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );
		mergeCrdtBlocks(
			remoteBlocks,
			[ paragraph( 'alpha', 'Alpha' ), paragraph( 'beta', 'Beta' ) ],
			null
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		expect( contentsOf( localBlocks ) ).toEqual( [ 'Alpha', 'Beta' ] );

		mergeCrdtBlocks(
			localBlocks,
			[
				paragraph( 'alpha', 'Alpha local edit' ),
				heading( 'remote-heading', 'Remote heading' ),
				paragraph( 'beta', 'Beta' ),
			],
			null
		);

		expect( contentsOf( localBlocks ) ).toEqual( [
			'Alpha local edit',
			'Beta',
		] );
	} );
} );
