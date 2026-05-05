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
	return {
		...actual,
		__unstableSerializeAndClean: (
			blocks: { name: string; attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) =>
					block.name === 'core/table'
						? '<figure class="wp-block-table"><table><tbody><tr><td>table</td></tr></tbody></table></figure>'
						: `<p>${ block.attributes.content ?? '' }</p>`
				)
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/group',
				attributes: {},
			},
			{
				name: 'core/table',
				attributes: {
					body: {
						type: 'array',
						query: {
							cells: {
								type: 'array',
								query: {
									content: { type: 'rich-text' },
									tag: { type: 'string' },
								},
							},
						},
					},
				},
			},
		],
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import {
	applyPostChangesToCRDTDoc,
	getPostChangesFromCRDTDoc,
	type YPostRecord,
} from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const SYNCED_BLOCK_PROPERTIES = new Set( [ 'blocks' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function table( clientId: string, content = 'remote table' ): Block {
	return {
		name: 'core/table',
		clientId,
		attributes: {
			body: [
				{
					cells: [
						{ content, tag: 'td' },
						{ content: `${ content } B`, tag: 'td' },
					],
				},
			],
		},
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

function postBlocks( doc: Y.Doc ): YBlocks {
	return getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
		'blocks'
	) as YBlocks;
}

function blockNames( doc: Y.Doc ): string[] {
	return ( postBlocks( doc ).toJSON() as Block[] ).map(
		( block ) => block.name
	);
}

function blockContents( doc: Y.Doc ): string[] {
	return ( postBlocks( doc ).toJSON() as Block[] ).map( ( block ) =>
		block.name === 'core/table'
			? 'table'
			: ( block.attributes.content as string )
	);
}

function firstGroupInnerContents( doc: Y.Doc ): string[] {
	const [ firstBlock ] = postBlocks( doc ).toJSON() as Block[];
	return firstBlock.innerBlocks.map(
		( block ) => block.attributes.content as string
	);
}

describe( 'remote top-level inserts and later deletes', () => {
	it( 'preserves a remote table insert when a stale local snapshot edits another block', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: [ ...initialBlocks, table( 'remote-table' ) ] },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		applyPostChangesToCRDTDoc(
			localDoc,
			{
				blocks: [
					paragraph( 'alpha', 'Alpha local edit' ),
					paragraph( 'beta', 'Beta' ),
				],
			},
			SYNCED_BLOCK_PROPERTIES
		);

		expect( blockNames( localDoc ) ).toEqual( [
			'core/paragraph',
			'core/paragraph',
			'core/table',
		] );
		expect( blockContents( localDoc ) ).toEqual( [
			'Alpha local edit',
			'Beta',
			'table',
		] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'does not reintroduce a remote table after that remote insert has become the local base', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const blocksWithRemoteTable = [
			...initialBlocks,
			table( 'remote-table' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: blocksWithRemoteTable },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		const deliveredChanges = getPostChangesFromCRDTDoc(
			localDoc,
			{ blocks: initialBlocks } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		expect(
			( deliveredChanges.blocks as Block[] ).map(
				( block ) => block.clientId
			)
		).toEqual( [ 'alpha', 'beta', 'remote-table' ] );

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		expect( blockNames( localDoc ) ).toEqual( [
			'core/paragraph',
			'core/paragraph',
		] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'matches the source order: collaborator paragraph, primary table, collaborator table delete', () => {
		const primaryDoc = new Y.Doc();
		const collaboratorDoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'seed-a', 'Seed A' ),
			paragraph( 'seed-b', 'Seed B' ),
			paragraph( 'target', 'Target' ),
		];

		applyPostChangesToCRDTDoc(
			primaryDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		const blocksAfterCollaboratorParagraph = [
			paragraph( 'seed-a', 'Seed A' ),
			paragraph( 'collaborator-paragraph', 'Collaborator paragraph' ),
			paragraph( 'seed-b', 'Seed B' ),
			paragraph( 'target', 'Target' ),
		];
		applyPostChangesToCRDTDoc(
			collaboratorDoc,
			{ blocks: blocksAfterCollaboratorParagraph },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );

		const paragraphDeliveredToPrimary = getPostChangesFromCRDTDoc(
			primaryDoc,
			{ blocks: initialBlocks } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		const primaryBlocksWithCollaboratorParagraph =
			paragraphDeliveredToPrimary.blocks as Block[];
		expect(
			primaryBlocksWithCollaboratorParagraph.map(
				( block ) => block.clientId
			)
		).toEqual( [ 'seed-a', 'collaborator-paragraph', 'seed-b', 'target' ] );

		const blocksWithPrimaryTable = [
			...primaryBlocksWithCollaboratorParagraph,
			table( 'primary-table', 'Primary table' ),
		];
		applyPostChangesToCRDTDoc(
			primaryDoc,
			{ blocks: blocksWithPrimaryTable },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( collaboratorDoc, Y.encodeStateAsUpdate( primaryDoc ) );

		const tableDeliveredToCollaborator = getPostChangesFromCRDTDoc(
			collaboratorDoc,
			{ blocks: blocksAfterCollaboratorParagraph } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		expect(
			( tableDeliveredToCollaborator.blocks as Block[] ).map(
				( block ) => block.clientId
			)
		).toEqual( [
			'seed-a',
			'collaborator-paragraph',
			'seed-b',
			'target',
			'primary-table',
		] );

		applyPostChangesToCRDTDoc(
			collaboratorDoc,
			{ blocks: blocksAfterCollaboratorParagraph },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( primaryDoc, Y.encodeStateAsUpdate( collaboratorDoc ) );

		expect( blockContents( primaryDoc ) ).toEqual( [
			'Seed A',
			'Collaborator paragraph',
			'Seed B',
			'Target',
		] );

		primaryDoc.destroy();
		collaboratorDoc.destroy();
	} );

	it( 'deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const blocksWithDeliveredParagraph = [
			...initialBlocks,
			paragraph( 'delivered-paragraph', 'Delivered paragraph' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: blocksWithDeliveredParagraph },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		const deliveredChanges = getPostChangesFromCRDTDoc(
			localDoc,
			{ blocks: initialBlocks } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		expect(
			( deliveredChanges.blocks as Block[] ).map(
				( block ) => block.clientId
			)
		).toEqual( [ 'alpha', 'beta', 'delivered-paragraph' ] );

		const blocksWithUnseenTable = [
			...blocksWithDeliveredParagraph,
			table( 'unseen-table' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: blocksWithUnseenTable },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		expect( blockContents( localDoc ) ).toEqual( [
			'Alpha',
			'Beta',
			'table',
		] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'does not reintroduce a remote paragraph after that remote insert has become the local base', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const initialBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const blocksWithRemoteParagraph = [
			...initialBlocks,
			paragraph( 'remote-paragraph', 'Remote paragraph' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: blocksWithRemoteParagraph },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		const deliveredChanges = getPostChangesFromCRDTDoc(
			localDoc,
			{ blocks: initialBlocks } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		expect(
			( deliveredChanges.blocks as Block[] ).map(
				( block ) => block.clientId
			)
		).toEqual( [ 'alpha', 'beta', 'remote-paragraph' ] );

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		expect( blockContents( localDoc ) ).toEqual( [ 'Alpha', 'Beta' ] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );

	it( 'does not reintroduce a remote nested paragraph after that remote insert has become the local base', () => {
		const localDoc = new Y.Doc();
		const remoteDoc = new Y.Doc();
		const initialInnerBlocks = [
			paragraph( 'alpha', 'Alpha' ),
			paragraph( 'beta', 'Beta' ),
		];
		const initialBlocks = [ group( 'group', initialInnerBlocks ) ];

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( localDoc ) );

		const blocksWithRemoteNestedParagraph = [
			group( 'group', [
				...initialInnerBlocks,
				paragraph( 'remote-nested-paragraph', 'Remote nested' ),
			] ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: blocksWithRemoteNestedParagraph },
			SYNCED_BLOCK_PROPERTIES
		);
		Y.applyUpdate( localDoc, Y.encodeStateAsUpdate( remoteDoc ) );

		const deliveredChanges = getPostChangesFromCRDTDoc(
			localDoc,
			{ blocks: initialBlocks } as never,
			SYNCED_BLOCK_PROPERTIES
		);
		const [ deliveredGroup ] = deliveredChanges.blocks as Block[];
		expect(
			deliveredGroup.innerBlocks.map( ( block ) => block.clientId )
		).toEqual( [ 'alpha', 'beta', 'remote-nested-paragraph' ] );

		applyPostChangesToCRDTDoc(
			localDoc,
			{ blocks: initialBlocks },
			SYNCED_BLOCK_PROPERTIES
		);

		expect( firstGroupInnerContents( localDoc ) ).toEqual( [
			'Alpha',
			'Beta',
		] );

		localDoc.destroy();
		remoteDoc.destroy();
	} );
} );
