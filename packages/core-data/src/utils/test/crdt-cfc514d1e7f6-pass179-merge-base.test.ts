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

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

function syncDocs( targetDoc: Y.Doc, sourceDoc: Y.Doc ): void {
	Y.applyUpdate( targetDoc, Y.encodeStateAsUpdate( sourceDoc ) );
}

describe( 'cfc514d1e7f6 direct base-record block merge', () => {
	let primaryDoc: Y.Doc;
	let peerDoc: Y.Doc;
	let primaryBlocks: Y.Array< YBlock >;
	let peerBlocks: Y.Array< YBlock >;

	beforeEach( () => {
		primaryDoc = new Y.Doc();
		peerDoc = new Y.Doc();
		primaryBlocks = primaryDoc.getArray< YBlock >();
		peerBlocks = peerDoc.getArray< YBlock >();
	} );

	afterEach( () => {
		primaryDoc.destroy();
		peerDoc.destroy();
	} );

	it( 'does not resurrect a remotely deleted paragraph from a stale base snapshot', () => {
		const baseline = paragraph(
			'baseline',
			'Seed 951640 baseline paragraph.'
		);
		const second = paragraph(
			'original-second',
			'Seed 951640 keeps a second paragraph for deletes and moves.'
		);
		const shared = paragraph(
			'shared-target',
			'Shared editing target paragraph.'
		);
		const tail = paragraph( 'tail', 'rtc-cfc514-tail-italic' );

		const initial = [ baseline, second, shared ];
		const withTail = [ baseline, second, shared, tail ];
		const afterMove = [ shared, baseline, second, tail ];
		const afterDelete = [ shared, baseline, tail ];

		mergeCrdtBlocks( primaryBlocks, initial, null );
		syncDocs( peerDoc, primaryDoc );

		mergeCrdtBlocks( primaryBlocks, withTail, null, initial );
		syncDocs( peerDoc, primaryDoc );

		mergeCrdtBlocks( peerBlocks, afterMove, null, withTail );
		syncDocs( primaryDoc, peerDoc );

		mergeCrdtBlocks( primaryBlocks, afterDelete, null, afterMove );
		syncDocs( peerDoc, primaryDoc );

		expect( contentsOf( peerBlocks ) ).toEqual( [
			'Shared editing target paragraph.',
			'Seed 951640 baseline paragraph.',
			'rtc-cfc514-tail-italic',
		] );

		const stalePeerSnapshot = [
			paragraph(
				'shared-target',
				'Shared editing target paragraph with peer local edit.'
			),
			baseline,
			second,
			tail,
		];

		mergeCrdtBlocks( peerBlocks, stalePeerSnapshot, null, afterMove );
		syncDocs( primaryDoc, peerDoc );

		const expected = [
			'Shared editing target paragraph with peer local edit.',
			'Seed 951640 baseline paragraph.',
			'rtc-cfc514-tail-italic',
		];

		expect( contentsOf( peerBlocks ) ).toEqual( expected );
		expect( contentsOf( primaryBlocks ) ).toEqual( expected );
	} );
} );
