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
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Mock getBlockTypes so CRDT merging can identify paragraph rich-text content.
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
			{
				name: 'core/search',
				attributes: {
					buttonPosition: { type: 'string' },
					buttonText: { type: 'string' },
					label: { type: 'string' },
					placeholder: { type: 'string' },
				},
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

function group( clientId: string ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks: [
			paragraph( 'nested-paragraph', 'Nested paragraph' ),
			{
				name: 'core/heading',
				clientId: 'nested-heading',
				attributes: { content: 'Nested heading', level: 3 },
				innerBlocks: [],
			},
		],
	};
}

function search( clientId: string, marker: string ): Block {
	return {
		name: 'core/search',
		clientId,
		attributes: {
			buttonPosition: 'button-inside',
			buttonText: `Find ${ marker }`,
			label: `Search label ${ marker }`,
			placeholder: `Search placeholder ${ marker }`,
		},
		innerBlocks: [],
	};
}

function blockSummary( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) => {
		if ( block.name === 'core/search' ) {
			return `core/search:${ block.attributes.label }`;
		}

		if ( block.name === 'core/group' ) {
			return 'core/group';
		}

		return `core/paragraph:${ block.attributes.content }`;
	} );
}

describe( 'stale Search block moves', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'does not drop an acknowledged paragraph when a stale snapshot moves a Search block', () => {
		const firstSearchMarker =
			'rtc-save-search-option-marker-953856-1-1-end';
		const secondSearchMarker =
			'rtc-save-search-option-marker-953856-3-0-end';
		const initialBlocks = [
			paragraph( 'baseline', 'Seed 953856 baseline paragraph.' ),
			group( 'group' ),
			paragraph(
				'concurrent-0',
				'Seed 953856 step 0 user 0 concurrent paragraph 930320'
			),
			paragraph(
				'concurrent-1',
				'Seed 953856 step 0 user 1 concurrent paragraph 459539'
			),
			paragraph( 'marker-1', 'rtc-save-paragraph-marker-953856-1-1-end' ),
			search( 'search-1', firstSearchMarker ),
			paragraph( 'marker-3', 'rtc-save-paragraph-marker-953856-3-0-end' ),
			search( 'search-3', secondSearchMarker ),
		];

		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );
		mergeCrdtBlocks(
			remoteBlocks,
			[
				initialBlocks[ 0 ],
				initialBlocks[ 1 ],
				paragraph( 'shared', 'Shared editing target paragraph.' ),
				...initialBlocks.slice( 2 ),
			],
			null
		);
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );

		const staleLocalMove = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			initialBlocks[ 5 ],
			...initialBlocks.slice( 2, 5 ),
			...initialBlocks.slice( 6 ),
		];
		mergeCrdtBlocks( yblocks, staleLocalMove, null );

		expect( blockSummary( yblocks ) ).toEqual( [
			'core/paragraph:Seed 953856 baseline paragraph.',
			'core/group',
			'core/paragraph:Shared editing target paragraph.',
			`core/search:Search label ${ firstSearchMarker }`,
			'core/paragraph:Seed 953856 step 0 user 0 concurrent paragraph 930320',
			'core/paragraph:Seed 953856 step 0 user 1 concurrent paragraph 459539',
			'core/paragraph:rtc-save-paragraph-marker-953856-1-1-end',
			'core/paragraph:rtc-save-paragraph-marker-953856-3-0-end',
			`core/search:Search label ${ secondSearchMarker }`,
		] );

		remoteDoc.destroy();
	} );

	it( 'does not duplicate blocks when an acknowledged remote paragraph precedes a stale one-slot Search move', () => {
		const firstSearchMarker =
			'rtc-save-search-option-marker-953856-1-1-end';
		const secondSearchMarker =
			'rtc-save-search-option-marker-953856-3-0-end';
		const initialBlocks = [
			paragraph( 'baseline', 'Seed 953856 baseline paragraph.' ),
			group( 'group' ),
			paragraph(
				'concurrent-0',
				'Seed 953856 step 0 user 0 concurrent paragraph 930320'
			),
			paragraph(
				'concurrent-1',
				'Seed 953856 step 0 user 1 concurrent paragraph 459539'
			),
			paragraph( 'marker-1', 'rtc-save-paragraph-marker-953856-1-1-end' ),
			search( 'search-1', firstSearchMarker ),
			paragraph( 'marker-3', 'rtc-save-paragraph-marker-953856-3-0-end' ),
			search( 'search-3', secondSearchMarker ),
		];

		mergeCrdtBlocks( yblocks, initialBlocks, null );

		const withSharedParagraph = [
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			paragraph( 'shared', 'Shared editing target paragraph.' ),
			...initialBlocks.slice( 2 ),
		];
		mergeCrdtBlocks( yblocks, withSharedParagraph, null );

		const staleLocalMove = [
			...initialBlocks.slice( 0, 4 ),
			initialBlocks[ 5 ],
			initialBlocks[ 4 ],
			...initialBlocks.slice( 6 ),
		];
		mergeCrdtBlocks( yblocks, staleLocalMove, null );

		expect( blockSummary( yblocks ) ).toEqual( [
			'core/paragraph:Seed 953856 baseline paragraph.',
			'core/group',
			'core/paragraph:Shared editing target paragraph.',
			'core/paragraph:Seed 953856 step 0 user 0 concurrent paragraph 930320',
			'core/paragraph:Seed 953856 step 0 user 1 concurrent paragraph 459539',
			`core/search:Search label ${ firstSearchMarker }`,
			'core/paragraph:rtc-save-paragraph-marker-953856-1-1-end',
			'core/paragraph:rtc-save-paragraph-marker-953856-3-0-end',
			`core/search:Search label ${ secondSearchMarker }`,
		] );
	} );

	it( 'does not drop a concurrent paragraph when a stale snapshot moves a Search block', () => {
		const firstSearchMarker =
			'rtc-save-search-option-marker-953856-1-1-end';
		const secondSearchMarker =
			'rtc-save-search-option-marker-953856-3-0-end';
		const initialBlocks = [
			paragraph( 'baseline', 'Seed 953856 baseline paragraph.' ),
			group( 'group' ),
			paragraph(
				'concurrent-0',
				'Seed 953856 step 0 user 0 concurrent paragraph 930320'
			),
			paragraph(
				'concurrent-1',
				'Seed 953856 step 0 user 1 concurrent paragraph 459539'
			),
			paragraph( 'marker-1', 'rtc-save-paragraph-marker-953856-1-1-end' ),
			search( 'search-1', firstSearchMarker ),
			paragraph( 'marker-3', 'rtc-save-paragraph-marker-953856-3-0-end' ),
			search( 'search-3', secondSearchMarker ),
		];

		const remoteDoc = new Y.Doc();
		const remoteBlocks = remoteDoc.getArray< YBlock >();

		mergeCrdtBlocks( yblocks, initialBlocks, null );
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		mergeCrdtBlocks(
			remoteBlocks,
			[
				initialBlocks[ 0 ],
				initialBlocks[ 1 ],
				paragraph( 'shared', 'Shared editing target paragraph.' ),
				...initialBlocks.slice( 2 ),
			],
			null
		);

		const staleLocalMove = [
			...initialBlocks.slice( 0, 4 ),
			initialBlocks[ 5 ],
			initialBlocks[ 4 ],
			...initialBlocks.slice( 6 ),
		];
		mergeCrdtBlocks( yblocks, staleLocalMove, null );

		Y.applyUpdate( doc, Y.encodeStateAsUpdate( remoteDoc ) );
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( doc ) );

		expect( blockSummary( yblocks ) ).toEqual( [
			'core/paragraph:Seed 953856 baseline paragraph.',
			'core/group',
			'core/paragraph:Shared editing target paragraph.',
			'core/paragraph:Seed 953856 step 0 user 0 concurrent paragraph 930320',
			'core/paragraph:Seed 953856 step 0 user 1 concurrent paragraph 459539',
			`core/search:Search label ${ firstSearchMarker }`,
			'core/paragraph:rtc-save-paragraph-marker-953856-1-1-end',
			'core/paragraph:rtc-save-paragraph-marker-953856-3-0-end',
			`core/search:Search label ${ secondSearchMarker }`,
		] );

		expect( blockSummary( remoteBlocks ) ).toEqual(
			blockSummary( yblocks )
		);

		remoteDoc.destroy();
	} );
} );
