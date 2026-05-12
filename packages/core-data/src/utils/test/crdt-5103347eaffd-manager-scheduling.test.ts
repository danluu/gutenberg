/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: (
		blocks: Array< { attributes: Record< string, unknown >; name: string } >
	) =>
		blocks
			.map( ( block ) => {
				if ( block.name === 'core/search' ) {
					return '<!-- wp:search /-->';
				}
				if ( block.name === 'core/table' ) {
					return '<!-- wp:table --><figure><table></table></figure><!-- /wp:table -->';
				}
				if ( block.name === 'core/list' ) {
					return '<!-- wp:list --><ul><li>List item</li></ul><!-- /wp:list -->';
				}
				return `<p>${ block.attributes.content ?? '' }</p>`;
			} )
			.join( '\n\n' ),
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/search',
			attributes: {
				label: { type: 'string' },
				buttonText: { type: 'string' },
			},
		},
		{
			name: 'core/table',
			attributes: {
				hasFixedLayout: { type: 'boolean' },
				body: { type: 'array' },
			},
		},
		{
			name: 'core/list',
			attributes: { ordered: { type: 'boolean' } },
		},
		{
			name: 'core/list-item',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: () => [],
	getShiftedSelection: () => undefined,
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import type {
	CRDTDoc,
	ObjectData,
	RecordHandlers,
	SyncConfig,
} from '../../../../sync/src/types';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const mockGetProviderCreators = jest.mocked( getProviderCreators );
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks' ] );

function paragraph( clientId: string, content: string ): Block {
	return {
		clientId,
		name: 'core/paragraph',
		attributes: { content },
		innerBlocks: [],
	};
}

function search( clientId: string ): Block {
	return {
		clientId,
		name: 'core/search',
		attributes: {
			label: 'Search posts',
			buttonText: 'Search',
		},
		innerBlocks: [],
	};
}

function table( clientId: string ): Block {
	return {
		clientId,
		name: 'core/table',
		attributes: {
			hasFixedLayout: true,
			body: [
				{
					cells: [ { content: 'Cell A' }, { content: 'Cell B' } ],
				},
			],
		},
		innerBlocks: [],
	};
}

function list( clientId: string ): Block {
	return {
		clientId,
		name: 'core/list',
		attributes: { ordered: false },
		innerBlocks: [
			{
				clientId: `${ clientId }-item`,
				name: 'core/list-item',
				attributes: { content: 'List item' },
				innerBlocks: [],
			},
		],
	};
}

function waitForNextTick() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

function applyBlocks( doc: Y.Doc, blocks: Block[], baseBlocks?: Block[] ) {
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks },
		SYNCED_POST_PROPERTIES,
		baseBlocks
			? {
					baseRecord: {
						blocks: baseBlocks,
					},
			  }
			: undefined
	);
}

function getBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as Block[];
}

describe( '5103347eaffd manager stale base scheduling path', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'preserves a remote insert after remote reconciliation has timed out but the local base is still stale', async () => {
		const initialBlocks = [
			paragraph( 'paragraph-a', 'Paragraph A' ),
			search( 'search-a' ),
			table( 'table-a' ),
			list( 'list-a' ),
		];
		const remoteInsertedBlocks = [
			initialBlocks[ 0 ],
			paragraph( 'remote-paragraph', 'Remote paragraph' ),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		const staleLocalMove = [
			initialBlocks[ 2 ],
			initialBlocks[ 0 ],
			initialBlocks[ 1 ],
			initialBlocks[ 3 ],
		];
		const staleEditedRecord = {
			id: 1,
			blocks: initialBlocks,
		};

		let capturedDoc: Y.Doc | undefined;
		const handlers: jest.MockedObject< RecordHandlers > = {
			addUndoMeta: jest.fn(),
			editRecord: jest.fn(),
			getEditedRecord: jest.fn( async () => staleEditedRecord ),
			onStatusChange: jest.fn(),
			persistCRDTDoc: jest.fn(),
			refetchRecord: jest.fn( async () => {} ),
			restoreUndoMeta: jest.fn(),
		};
		const syncConfig: SyncConfig = {
			applyChangesToCRDTDoc: (
				ydoc: CRDTDoc,
				changes: Partial< ObjectData >,
				options = {}
			) => {
				capturedDoc = ydoc;
				applyPostChangesToCRDTDoc(
					ydoc,
					changes,
					SYNCED_POST_PROPERTIES,
					options
				);
			},
			getChangesFromCRDTDoc: jest.fn( () => ( {
				blocks: remoteInsertedBlocks,
			} ) ),
			getPersistedCRDTDoc: jest.fn( () => null ),
		};

		const manager = createSyncManager();
		await manager.load(
			syncConfig,
			'postType/post',
			'1',
			staleEditedRecord,
			handlers
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdate(
			remoteDoc,
			Y.encodeStateAsUpdate( capturedDoc as Y.Doc )
		);
		applyBlocks( remoteDoc, remoteInsertedBlocks, initialBlocks );
		Y.applyUpdate(
			capturedDoc as Y.Doc,
			Y.encodeStateAsUpdate( remoteDoc )
		);
		remoteDoc.destroy();

		expect(
			getBlocks( capturedDoc as Y.Doc ).map( ( block ) => block.clientId )
		).toEqual( [
			'paragraph-a',
			'remote-paragraph',
			'search-a',
			'table-a',
			'list-a',
		] );

		// The manager eventually clears reconciling keys even if the edited
		// record still has not caught up with the remote CRDT state.
		for ( let i = 0; i < 8; i++ ) {
			await waitForNextTick();
		}

		manager.update(
			'postType/post',
			'1',
			{ blocks: staleLocalMove },
			'LOCAL_EDITOR_ORIGIN',
			{
				baseRecord: staleEditedRecord,
			}
		);
		await waitForNextTick();

		expect( getBlocks( capturedDoc as Y.Doc ) ).toEqual( [
			expect.objectContaining( {
				clientId: 'table-a',
				name: 'core/table',
			} ),
			expect.objectContaining( {
				clientId: 'paragraph-a',
				name: 'core/paragraph',
				attributes: { content: 'Paragraph A' },
			} ),
			expect.objectContaining( {
				clientId: 'remote-paragraph',
				name: 'core/paragraph',
				attributes: { content: 'Remote paragraph' },
			} ),
			expect.objectContaining( {
				clientId: 'search-a',
				name: 'core/search',
			} ),
			expect.objectContaining( {
				clientId: 'list-a',
				name: 'core/list',
			} ),
		] );

		manager.unload( 'postType/post', '1' );
	} );
} );
