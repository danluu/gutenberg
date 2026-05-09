/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' ) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) => `<p>${ block.attributes.content }</p>` )
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
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

type ApplyPostChangesWithOptions = (
	ydoc: Y.Doc,
	changes: { blocks: Block[]; content: string },
	syncedProperties: Set< string >,
	options?: { baseRecord?: { blocks: Block[] } }
) => void;

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function group( clientId: string, innerBlocks: Block[] ): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks,
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
		.join( '\n\n' );
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

function contentsOf( blocks: Block[] ): string[] {
	return blocks.map( ( block ) => block.attributes.content as string );
}

function contentsOfTree( blocks: Block[] ): string[] {
	const contents: string[] = [];

	blocks.forEach( ( block ) => {
		if ( typeof block.attributes.content === 'string' ) {
			contents.push( block.attributes.content );
		}
		contents.push( ...contentsOfTree( block.innerBlocks ?? [] ) );
	} );

	return contents;
}

function replaceContent(
	blocks: Block[],
	clientId: string,
	content: string
): Block[] {
	return blocks.map( ( block ) =>
		block.clientId === clientId
			? {
					...block,
					attributes: {
						...block.attributes,
						content,
					},
			  }
			: block
	);
}

function replaceContentInTree(
	blocks: Block[],
	clientId: string,
	content: string
): Block[] {
	return blocks.map( ( block ) => {
		const nextBlock =
			block.clientId === clientId
				? {
						...block,
						attributes: {
							...block.attributes,
							content,
						},
				  }
				: block;
		const nextInnerBlocks = replaceContentInTree(
			nextBlock.innerBlocks ?? [],
			clientId,
			content
		);

		return nextInnerBlocks === nextBlock.innerBlocks
			? nextBlock
			: {
					...nextBlock,
					innerBlocks: nextInnerBlocks,
			  };
	} );
}

function removeBlock( blocks: Block[], clientId: string ): Block[] {
	return blocks.filter( ( block ) => block.clientId !== clientId );
}

function removeBlockInTree( blocks: Block[], clientId: string ): Block[] {
	return blocks.flatMap( ( block ) => {
		if ( block.clientId === clientId ) {
			return [];
		}

		const nextInnerBlocks = removeBlockInTree(
			block.innerBlocks ?? [],
			clientId
		);

		return [
			nextInnerBlocks === block.innerBlocks
				? block
				: {
						...block,
						innerBlocks: nextInnerBlocks,
				  },
		];
	} );
}

function applyBlocks(
	doc: Y.Doc,
	blocks: Block[],
	baseBlocks?: Block[]
): void {
	( applyPostChangesToCRDTDoc as ApplyPostChangesWithOptions )(
		doc,
		{
			blocks,
			content: serializeBlocks( blocks ),
		},
		SYNCED_POST_PROPERTIES,
		baseBlocks ? { baseRecord: { blocks: baseBlocks } } : undefined
	);
}

function seedConcurrentInsertAndDelete() {
	const primaryDoc = new Y.Doc();
	const collaboratorDoc = new Y.Doc();
	const initialBlocks = [
		paragraph( 'anchor', 'Anchor paragraph' ),
		paragraph( 'tail', 'Tail paragraph' ),
	];
	const primaryParagraph = paragraph(
		'primary-insert',
		'Primary paragraph deleted by collaborator'
	);
	const collaboratorParagraph = paragraph(
		'collaborator-insert',
		'Collaborator paragraph kept'
	);

	applyBlocks( primaryDoc, initialBlocks );
	Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

	applyBlocks(
		primaryDoc,
		[ initialBlocks[ 0 ], primaryParagraph, initialBlocks[ 1 ] ],
		initialBlocks
	);
	applyBlocks(
		collaboratorDoc,
		[ initialBlocks[ 0 ], collaboratorParagraph, initialBlocks[ 1 ] ],
		initialBlocks
	);

	Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );
	Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

	const queuedPrimaryBase = postBlocks( primaryDoc );
	const queuedPrimaryEdit = replaceContent(
		queuedPrimaryBase,
		'anchor',
		'Anchor paragraph edited by primary'
	);

	const collaboratorDeleteBase = postBlocks( collaboratorDoc );
	const collaboratorAfterDelete = removeBlock(
		collaboratorDeleteBase,
		'primary-insert'
	);
	applyBlocks(
		collaboratorDoc,
		collaboratorAfterDelete,
		collaboratorDeleteBase
	);

	Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );

	return {
		collaboratorDoc,
		primaryDoc,
		queuedPrimaryBase,
		queuedPrimaryEdit,
	};
}

function seedNestedConcurrentInsertAndDelete() {
	const primaryDoc = new Y.Doc();
	const collaboratorDoc = new Y.Doc();
	const initialBlocks = [
		group( 'container', [
			paragraph( 'anchor', 'Nested anchor paragraph' ),
			paragraph( 'tail', 'Nested tail paragraph' ),
		] ),
	];
	const primaryParagraph = paragraph(
		'primary-insert',
		'Primary nested paragraph deleted by collaborator'
	);
	const collaboratorParagraph = paragraph(
		'collaborator-insert',
		'Collaborator nested paragraph kept'
	);

	applyBlocks( primaryDoc, initialBlocks );
	Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

	applyBlocks(
		primaryDoc,
		[
			group( 'container', [
				initialBlocks[ 0 ].innerBlocks[ 0 ],
				primaryParagraph,
				initialBlocks[ 0 ].innerBlocks[ 1 ],
			] ),
		],
		initialBlocks
	);
	applyBlocks(
		collaboratorDoc,
		[
			group( 'container', [
				initialBlocks[ 0 ].innerBlocks[ 0 ],
				collaboratorParagraph,
				initialBlocks[ 0 ].innerBlocks[ 1 ],
			] ),
		],
		initialBlocks
	);

	Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );
	Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

	const queuedPrimaryBase = postBlocks( primaryDoc );
	const queuedPrimaryEdit = replaceContentInTree(
		queuedPrimaryBase,
		'anchor',
		'Nested anchor paragraph edited by primary'
	);

	const collaboratorDeleteBase = postBlocks( collaboratorDoc );
	const collaboratorAfterDelete = removeBlockInTree(
		collaboratorDeleteBase,
		'primary-insert'
	);
	applyBlocks(
		collaboratorDoc,
		collaboratorAfterDelete,
		collaboratorDeleteBase
	);

	Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );

	return {
		collaboratorDoc,
		primaryDoc,
		queuedPrimaryBase,
		queuedPrimaryEdit,
	};
}

function expectDeletedParagraphStaysDeleted( doc: Y.Doc ): void {
	expect( contentsOf( postBlocks( doc ) ) ).toContain(
		'Anchor paragraph edited by primary'
	);
	expect( contentsOf( postBlocks( doc ) ) ).toContain(
		'Collaborator paragraph kept'
	);
	expect( contentsOf( postBlocks( doc ) ) ).not.toContain(
		'Primary paragraph deleted by collaborator'
	);
	expect( postContent( doc ) ).not.toContain(
		'Primary paragraph deleted by collaborator'
	);
}

function expectNestedDeletedParagraphStaysDeleted( doc: Y.Doc ): void {
	expect( contentsOfTree( postBlocks( doc ) ) ).toContain(
		'Nested anchor paragraph edited by primary'
	);
	expect( contentsOfTree( postBlocks( doc ) ) ).toContain(
		'Collaborator nested paragraph kept'
	);
	expect( contentsOfTree( postBlocks( doc ) ) ).not.toContain(
		'Primary nested paragraph deleted by collaborator'
	);
}

describe( 'queued stale local edit after remote delete', () => {
	let docs: Y.Doc[] = [];

	afterEach( () => {
		docs.forEach( ( doc ) => doc.destroy() );
		docs = [];
	} );

	it( 'does not re-add a deleted paragraph from a stale queued snapshot', () => {
		const { primaryDoc, queuedPrimaryEdit } =
			seedConcurrentInsertAndDelete();
		docs.push( primaryDoc );

		expect( contentsOf( postBlocks( primaryDoc ) ) ).not.toContain(
			'Primary paragraph deleted by collaborator'
		);

		applyBlocks( primaryDoc, queuedPrimaryEdit );

		expectDeletedParagraphStaysDeleted( primaryDoc );
	} );

	it( 'does not re-add a deleted paragraph from a stale base-record edit', () => {
		const {
			collaboratorDoc,
			primaryDoc,
			queuedPrimaryBase,
			queuedPrimaryEdit,
		} = seedConcurrentInsertAndDelete();
		docs.push( collaboratorDoc, primaryDoc );

		expect( contentsOf( postBlocks( primaryDoc ) ) ).not.toContain(
			'Primary paragraph deleted by collaborator'
		);

		applyBlocks( primaryDoc, queuedPrimaryEdit, queuedPrimaryBase );
		Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		expectDeletedParagraphStaysDeleted( primaryDoc );
		expect( contentsOf( postBlocks( collaboratorDoc ) ) ).toEqual(
			contentsOf( postBlocks( primaryDoc ) )
		);
	} );

	it( 'does not re-add a nested deleted paragraph from a stale base-record edit', () => {
		const {
			collaboratorDoc,
			primaryDoc,
			queuedPrimaryBase,
			queuedPrimaryEdit,
		} = seedNestedConcurrentInsertAndDelete();
		docs.push( collaboratorDoc, primaryDoc );

		expect( contentsOfTree( postBlocks( primaryDoc ) ) ).not.toContain(
			'Primary nested paragraph deleted by collaborator'
		);

		applyBlocks( primaryDoc, queuedPrimaryEdit, queuedPrimaryBase );
		Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		expectNestedDeletedParagraphStaysDeleted( primaryDoc );
		expect( contentsOfTree( postBlocks( collaboratorDoc ) ) ).toEqual(
			contentsOfTree( postBlocks( primaryDoc ) )
		);
	} );
} );
