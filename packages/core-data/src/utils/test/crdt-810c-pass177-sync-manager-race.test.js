/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: () => '',
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => null ),
	getShiftedSelection: jest.fn( () => null ),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { applyPostChangesToCRDTDoc, getPostChangesFromCRDTDoc } from '../crdt';

const mockGetProviderCreators = jest.mocked( getProviderCreators );
const SYNCED_PROPERTIES = new Set( [ 'blocks' ] );
const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = 1;

function paragraph( clientId, content ) {
	return {
		clientId,
		name: 'core/paragraph',
		attributes: { content },
		innerBlocks: [],
	};
}

function blockTexts( blocks ) {
	return blocks.map( ( block ) => String( block.attributes.content ) );
}

function selectionInBlock( clientId, offset ) {
	return {
		selectionStart: {
			attributeKey: 'content',
			clientId,
			offset,
		},
		selectionEnd: {
			attributeKey: 'content',
			clientId,
			offset,
		},
	};
}

async function waitForTimers() {
	await new Promise( ( resolve ) => setTimeout( resolve, 20 ) );
}

describe( '810c pass177 SyncManager queued-local race', () => {
	let capturedDoc;
	let editedRecord;

	beforeEach( () => {
		jest.clearAllMocks();
		capturedDoc = undefined;
		editedRecord = {
			id: OBJECT_ID,
			blocks: [
				paragraph( 'lead', 'Lead paragraph' ),
				paragraph( 'anchor', 'Shared anchor' ),
			],
		};
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async ( { ydoc } ) => {
				capturedDoc = ydoc;
				return {
					destroy: jest.fn(),
					on: jest.fn(),
				};
			} ),
		] );
	} );

	it( 'preserves a local first character when a remote same-anchor insert reconciles before the queued local update runs', async () => {
		const manager = createSyncManager();
		const syncConfig = {
			applyChangesToCRDTDoc: ( ydoc, changes, options ) =>
				applyPostChangesToCRDTDoc(
					ydoc,
					changes,
					SYNCED_PROPERTIES,
					options
				),
			getChangesFromCRDTDoc: ( ydoc, record ) =>
				getPostChangesFromCRDTDoc( ydoc, record, SYNCED_PROPERTIES ),
			getPersistedCRDTDoc: jest.fn( () => null ),
		};
		const handlers = {
			addUndoMeta: jest.fn(),
			editRecord: jest.fn( ( edits ) => {
				editedRecord = { ...editedRecord, ...edits };
			} ),
			getEditedRecord: jest.fn( async () => editedRecord ),
			onStatusChange: jest.fn(),
			persistCRDTDoc: jest.fn(),
			refetchRecord: jest.fn(),
			restoreUndoMeta: jest.fn(),
		};

		await manager.load(
			syncConfig,
			OBJECT_TYPE,
			OBJECT_ID,
			editedRecord,
			handlers
		);

		const initialBlocks = editedRecord.blocks;
		const localBlocksWithFirstCharacter = [
			...initialBlocks,
			paragraph( 'primary-insert', 'S' ),
		];

		const remoteDoc = new Y.Doc();
		Y.applyUpdate( remoteDoc, Y.encodeStateAsUpdate( capturedDoc ) );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{
				blocks: [
					...initialBlocks,
					paragraph( 'secondary-insert', '' ),
				],
			},
			SYNCED_PROPERTIES,
			{ baseRecord: { blocks: initialBlocks } }
		);
		const remoteInsertUpdate = Y.encodeStateAsUpdate(
			remoteDoc,
			Y.encodeStateVector( capturedDoc )
		);

		manager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			{
				blocks: localBlocksWithFirstCharacter,
				selection: selectionInBlock( 'primary-insert', 1 ),
			},
			'local-editor',
			{
				baseRecord: { blocks: initialBlocks },
				isNewUndoLevel: false,
			}
		);
		editedRecord = {
			...editedRecord,
			blocks: localBlocksWithFirstCharacter,
		};

		Y.applyUpdate( capturedDoc, remoteInsertUpdate );
		await waitForTimers();

		const crdtBlocks = getPostChangesFromCRDTDoc(
			capturedDoc,
			{ id: OBJECT_ID, blocks: [] },
			SYNCED_PROPERTIES
		).blocks;

		expect( blockTexts( editedRecord.blocks ) ).toEqual( [
			'Lead paragraph',
			'Shared anchor',
			'',
			'S',
		] );
		expect( blockTexts( crdtBlocks ) ).toEqual( [
			'Lead paragraph',
			'Shared anchor',
			'',
			'S',
		] );

		remoteDoc.destroy();
		manager.unload( OBJECT_TYPE, OBJECT_ID );
	} );
} );
