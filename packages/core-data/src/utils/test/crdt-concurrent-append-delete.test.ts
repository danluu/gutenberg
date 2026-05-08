/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * Mock getBlockTypes so CRDT merging can identify rich-text attributes.
 */
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

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function syncDocs( left: Y.Doc, right: Y.Doc ): void {
	const leftUpdate = Y.encodeStateAsUpdate( left );
	const rightUpdate = Y.encodeStateAsUpdate( right );

	Y.applyUpdate( left, rightUpdate );
	Y.applyUpdate( right, leftUpdate );
}

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

describe( 'concurrent top-level append and delete reconciliation', () => {
	it( 'propagates deleting a collaborator paragraph that arrived after a concurrent append', () => {
		const firstDoc = new Y.Doc();
		const secondDoc = new Y.Doc();
		const firstBlocks = firstDoc.getArray< YBlock >();
		const secondBlocks = secondDoc.getArray< YBlock >();
		const initialBlocks = [
			paragraph( 'first', 'Alpha' ),
			paragraph( 'second', 'Beta' ),
		];

		mergeCrdtBlocks( firstBlocks, initialBlocks, null );
		Y.applyUpdate( secondDoc, Y.encodeStateAsUpdate( firstDoc ) );

		mergeCrdtBlocks(
			firstBlocks,
			[
				...initialBlocks,
				paragraph( 'first-appended', 'First user append' ),
			],
			null
		);
		mergeCrdtBlocks(
			secondBlocks,
			[
				...initialBlocks,
				paragraph( 'second-appended', 'Second user append' ),
			],
			null
		);

		syncDocs( firstDoc, secondDoc );
		expect( contentsOf( firstBlocks ).sort() ).toEqual( [
			'Alpha',
			'Beta',
			'First user append',
			'Second user append',
		] );
		expect( contentsOf( secondBlocks ).sort() ).toEqual( [
			'Alpha',
			'Beta',
			'First user append',
			'Second user append',
		] );

		mergeCrdtBlocks(
			secondBlocks,
			( secondBlocks.toJSON() as Block[] ).filter(
				( block ) => block.clientId !== 'first-appended'
			),
			null
		);
		syncDocs( firstDoc, secondDoc );

		expect( contentsOf( firstBlocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Second user append',
		] );
		expect( contentsOf( secondBlocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Second user append',
		] );

		mergeCrdtBlocks(
			firstBlocks,
			[
				...initialBlocks,
				paragraph( 'first-appended', 'First user append' ),
				paragraph( 'second-appended', 'Second user append' ),
			],
			null
		);

		expect( contentsOf( firstBlocks ) ).toEqual( [
			'Alpha',
			'Beta',
			'Second user append',
		] );

		firstDoc.destroy();
		secondDoc.destroy();
	} );
} );
