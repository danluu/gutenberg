/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

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
		const value =
			block.attributes?.content ??
			block.attributes?.label ??
			block.attributes?.buttonText ??
			'';
		const inner = ( block.innerBlocks ?? [] )
			.map( ( innerBlock ) =>
				serializeBlock(
					innerBlock as {
						attributes?: Record< string, unknown >;
						innerBlocks?: unknown[];
						name: string;
					}
				)
			)
			.join( '\n' );

		return [ `${ block.name }:${ value }`, inner ]
			.filter( Boolean )
			.join( '\n' );
	};

	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: {
				attributes?: Record< string, unknown >;
				innerBlocks?: unknown[];
				name: string;
			}[]
		) => blocks.map( serializeBlock ).join( '\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
			{ name: 'core/group', attributes: {} },
			{ name: 'core/search', attributes: {} },
		],
	};
} );

jest.mock( '../crdt-selection', () => ( {
	parseCursorSelection: () => null,
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const CHECKPOINT_PARAGRAPH = 'rtc-save-paragraph-marker-953135-3-0-end';
const CHECKPOINT_SEARCH_LABEL =
	'Search label rtc-save-search-option-marker-953135-3-0-end';
const MOVED_HEADING = 'Follow-up heading';
const TOP_LEVEL_HEADING = 'Seed 953135 step 1 user 0 heading';
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function heading( clientId: string, content: string, level = 2 ): Block {
	return {
		name: 'core/heading',
		clientId,
		attributes: { content, level },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: { layout: { type: 'constrained' } },
		innerBlocks,
	};
}

function search( clientId: string ): Block {
	return {
		name: 'core/search',
		clientId,
		attributes: {
			buttonPosition: 'button-inside',
			buttonText: 'Find rtc-save-search-option-marker-953135-3-0-end',
			label: CHECKPOINT_SEARCH_LABEL,
			placeholder:
				'Search placeholder rtc-save-search-option-marker-953135-3-0-end',
			showLabel: true,
		},
		innerBlocks: [],
	};
}

function seedBlocks(): Block[] {
	return [
		paragraph(
			'intro-paragraph',
			'Long shared paragraph used as the initial collaborative editing surface.'
		),
		group( 'group', [
			paragraph(
				'nested-paragraph',
				'Seed 953135 step 2 user 0 nested paragraph'
			),
			heading(
				'nested-heading',
				'Seed 953135 step 2 user 0 nested heading',
				3
			),
		] ),
		heading( 'follow-up-heading', MOVED_HEADING ),
		paragraph( 'tail-paragraph', 'Tail paragraph kept for save checks.' ),
		heading( 'top-level-heading', TOP_LEVEL_HEADING, 3 ),
		paragraph( 'alpha-paragraph', '<strong>alpha</strong> beta' ),
		paragraph( 'checkpoint-paragraph', CHECKPOINT_PARAGRAPH ),
		search( 'checkpoint-search' ),
	];
}

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function serializeBlocksForInput( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `${ block.name }:${ block.attributes.content ?? '' }` )
		.join( '\n' );
}

function withHeadingInsideGroup( blocks: Block[] ): Block[] {
	const nextBlocks = cloneBlocks( blocks );
	const headingIndex = nextBlocks.findIndex(
		( block ) => block.clientId === 'follow-up-heading'
	);
	const [ movedHeading ] = nextBlocks.splice( headingIndex, 1 );
	const targetGroup = nextBlocks.find(
		( block ) => block.clientId === 'group'
	);

	targetGroup?.innerBlocks.push( movedHeading );
	return nextBlocks;
}

function withSearchMovedUpThreePlaces( blocks: Block[] ): Block[] {
	const nextBlocks = cloneBlocks( blocks );
	const searchIndex = nextBlocks.findIndex(
		( block ) => block.clientId === 'checkpoint-search'
	);
	const [ movedSearch ] = nextBlocks.splice( searchIndex, 1 );
	nextBlocks.splice( searchIndex - 3, 0, movedSearch );
	return nextBlocks;
}

function applyBlocks(
	doc: Y.Doc,
	blocks: Block[],
	baseBlocks?: Block[]
): void {
	const applyPostChanges = applyPostChangesToCRDTDoc as (
		ydoc: Y.Doc,
		changes: { blocks: Block[]; content: string },
		syncedProperties: Set< string >,
		options?: { baseRecord?: { blocks: Block[]; content: string } }
	) => void;

	applyPostChanges(
		doc,
		{
			blocks,
			content: serializeBlocksForInput( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks
			? {
					baseRecord: {
						blocks: baseBlocks,
						content: serializeBlocksForInput( baseBlocks ),
					},
			  }
			: {}
	);
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

function allBlocks( blocks: Block[] ): Block[] {
	return blocks.flatMap( ( block ) => [
		block,
		...allBlocks( block.innerBlocks ?? [] ),
	] );
}

describe( '0d27c057d6ea baseRecord stale Search move replay', () => {
	it( 'preserves a remote heading reparent when the next local Search move has a stale baseRecord', () => {
		const initialBlocks = seedBlocks();
		const reparentedBlocks = withHeadingInsideGroup( initialBlocks );
		const searchMovedBlocks = withSearchMovedUpThreePlaces( initialBlocks );
		const local = new Y.Doc();
		const remote = new Y.Doc();

		try {
			applyBlocks( local, initialBlocks );
			Y.applyUpdate( remote, Y.encodeStateAsUpdate( local ) );
			applyBlocks( remote, initialBlocks, initialBlocks );
			applyBlocks( remote, reparentedBlocks, initialBlocks );
			Y.applyUpdate( local, Y.encodeStateAsUpdate( remote ) );

			applyBlocks( local, searchMovedBlocks, initialBlocks );

			const blocks = postBlocks( local );
			const flattened = allBlocks( blocks );
			const searchBlocks = flattened.filter(
				( block ) => block.name === 'core/search'
			);
			const groupBlocks = blocks.filter(
				( block ) => block.name === 'core/group'
			);

			expect( searchBlocks ).toHaveLength( 1 );
			expect( searchBlocks[ 0 ].attributes.content ).toBeUndefined();
			expect( groupBlocks[ 0 ].innerBlocks ).toEqual(
				expect.arrayContaining( [
					expect.objectContaining( {
						clientId: 'follow-up-heading',
						attributes: expect.objectContaining( {
							content: MOVED_HEADING,
						} ),
					} ),
				] )
			);
			expect(
				blocks.filter(
					( block ) =>
						block.clientId === 'follow-up-heading' ||
						block.attributes.content === MOVED_HEADING
				)
			).toHaveLength( 0 );
			expect(
				blocks.filter(
					( block ) => block.attributes.content === TOP_LEVEL_HEADING
				)
			).toHaveLength( 1 );
			expect( postContent( local ) ).toContain( MOVED_HEADING );
			expect( postContent( local ) ).toContain( TOP_LEVEL_HEADING );
			expect( postContent( local ) ).not.toContain(
				`core/search:${ CHECKPOINT_PARAGRAPH }`
			);
		} finally {
			local.destroy();
			remote.destroy();
		}
	} );
} );
