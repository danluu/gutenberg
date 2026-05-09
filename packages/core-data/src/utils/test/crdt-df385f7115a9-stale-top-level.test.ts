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

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlocks } from '../crdt-blocks';

function makeBlock(
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

function contentsOf( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

describe( 'df385f7115a9 stale checkpoint top-level move reconstruction', () => {
	let actorDoc: Y.Doc;
	let actorBlocks: YBlocks;
	let viewerDoc: Y.Doc;
	let viewerBlocks: YBlocks;

	beforeEach( () => {
		actorDoc = new Y.Doc();
		actorBlocks = actorDoc.getArray< Y.Map< unknown > >() as YBlocks;
		viewerDoc = new Y.Doc();
		viewerBlocks = viewerDoc.getArray< Y.Map< unknown > >() as YBlocks;
	} );

	afterEach( () => {
		actorDoc.destroy();
		viewerDoc.destroy();
	} );

	it( 'preserves a remote checkpoint paragraph through a stale top-level move', () => {
		const initialBlocks = [
			makeBlock(
				'core/heading',
				'seed-heading',
				'Seed 953052 step 3 user 0 heading'
			),
			makeBlock(
				'core/paragraph',
				'shared-target',
				'Shared editing target paragraph.'
			),
			makeBlock(
				'core/paragraph',
				'stable-tail',
				'Seed 953052 keeps a second paragraph for deletes and moves.'
			),
		];

		mergeCrdtBlocks( viewerBlocks, initialBlocks, null );
		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );

		const withCheckpoint = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			makeBlock(
				'core/paragraph',
				'save-checkpoint',
				'rtc-save-paragraph-marker-953052-3-0-end'
			),
			initialBlocks[ 2 ],
		];
		mergeCrdtBlocks( actorBlocks, withCheckpoint, null );
		Y.applyUpdate( viewerDoc, Y.encodeStateAsUpdate( actorDoc ) );
		expect( contentsOf( viewerBlocks ) ).toEqual( [
			'Seed 953052 step 3 user 0 heading',
			'Shared editing target paragraph.',
			'rtc-save-paragraph-marker-953052-3-0-end',
			'Seed 953052 keeps a second paragraph for deletes and moves.',
		] );

		const staleMoveWithoutCheckpoint = [
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 1 ],
		];
		mergeCrdtBlocks( viewerBlocks, staleMoveWithoutCheckpoint, null );

		const viewerContents = contentsOf( viewerBlocks );
		expect( viewerContents ).toEqual( [
			'Seed 953052 step 3 user 0 heading',
			'Seed 953052 keeps a second paragraph for deletes and moves.',
			'Shared editing target paragraph.',
			'rtc-save-paragraph-marker-953052-3-0-end',
		] );
		expect(
			viewerContents.filter(
				( content ) => content === 'Shared editing target paragraph.'
			)
		).toHaveLength( 1 );
		expect( viewerContents ).toContain(
			'rtc-save-paragraph-marker-953052-3-0-end'
		);

		Y.applyUpdate( actorDoc, Y.encodeStateAsUpdate( viewerDoc ) );
		expect( contentsOf( actorBlocks ) ).toEqual( viewerContents );
	} );
} );
