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
				name: 'core/table',
				attributes: {},
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
	type MergeCursorPosition,
	type YBlock,
	type YBlocks,
} from '../crdt-blocks';

type MergeWithBase = (
	yblocks: YBlocks,
	incomingBlocks: Block[],
	cursorPosition: MergeCursorPosition,
	baseBlocks?: Block[]
) => void;

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function table( clientId: string ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {},
		innerBlocks: [],
	};
}

function blockSummary( yblocks: YBlocks ): string[] {
	return ( yblocks.toJSON() as Block[] ).map( ( block ) =>
		block.name === 'core/paragraph'
			? ( block.attributes.content as string )
			: block.name
	);
}

function createScenarioBlocks() {
	const baseline = paragraph(
		'seed-951444-baseline',
		'Seed 951444 baseline paragraph.'
	);
	const priorDeleteTarget = paragraph(
		'prior-delete-target',
		'Seed 951444 keeps a second paragraph for deletes and moves.'
	);
	const sharedDeleteTarget = paragraph(
		'shared-delete-target',
		'Shared editing target paragraph.'
	);
	const insertedTable = table( 'inserted-table' );

	return {
		baseline,
		initialBlocks: [ baseline, priorDeleteTarget, sharedDeleteTarget ],
		insertedTable,
		staleTableAuthorSnapshot: [
			paragraph(
				'seed-951444-baseline',
				'Seed 951444 baseline paragraph. collaborator local edit'
			),
			sharedDeleteTarget,
			insertedTable,
		],
		tableAuthorBase: [ baseline, sharedDeleteTarget, insertedTable ],
	};
}

describe( 'RTC da361 stale table/delete merge', () => {
	let doc: Y.Doc;
	let yblocks: Y.Array< YBlock >;

	beforeEach( () => {
		doc = new Y.Doc();
		yblocks = doc.getArray< YBlock >();
	} );

	afterEach( () => {
		doc.destroy();
	} );

	it( 'preserves a remote paragraph delete when a stale table-author snapshot is merged', () => {
		const {
			baseline,
			initialBlocks,
			insertedTable,
			staleTableAuthorSnapshot,
			tableAuthorBase,
		} = createScenarioBlocks();

		mergeCrdtBlocks( yblocks, initialBlocks, null );
		mergeCrdtBlocks( yblocks, tableAuthorBase, null );

		const primaryDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >();
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( doc ) );
		mergeCrdtBlocks( primaryBlocks, [ baseline, insertedTable ], null );
		Y.applyUpdate( doc, Y.encodeStateAsUpdate( primaryDoc ) );
		primaryDoc.destroy();

		expect( blockSummary( yblocks ) ).toEqual( [
			'Seed 951444 baseline paragraph.',
			'core/table',
		] );

		mergeCrdtBlocks( yblocks, staleTableAuthorSnapshot, null );

		expect( blockSummary( yblocks ) ).toEqual( [
			'Seed 951444 baseline paragraph. collaborator local edit',
			'core/table',
		] );
	} );

	it( 'preserves the same remote paragraph delete when the stale snapshot has an explicit base', () => {
		const {
			baseline,
			initialBlocks,
			insertedTable,
			staleTableAuthorSnapshot,
			tableAuthorBase,
		} = createScenarioBlocks();

		mergeCrdtBlocks( yblocks, initialBlocks, null );
		mergeCrdtBlocks( yblocks, tableAuthorBase, null );
		mergeCrdtBlocks( yblocks, [ baseline, insertedTable ], null );

		( mergeCrdtBlocks as MergeWithBase )(
			yblocks,
			staleTableAuthorSnapshot,
			null,
			tableAuthorBase
		);

		expect( blockSummary( yblocks ) ).toEqual( [
			'Seed 951444 baseline paragraph. collaborator local edit',
			'core/table',
		] );
	} );
} );
