/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import {
	type CRDTDoc,
	type ObjectData,
	type SyncConfig,
	Y,
} from '@wordpress/sync';

/**
 * Mock sync providers so SyncManager.load creates an in-memory entity state.
 */
jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	store: 'core/block-editor',
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc } from '../crdt';
import { type Block, type YBlock } from '../crdt-blocks';

const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';
const SYNCED_PROPERTIES = new Set( [ 'blocks' ] );
const mockGetProviderCreators = jest.mocked( getProviderCreators );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		attributes: { content },
		innerBlocks: [],
		clientId,
	};
}

function createInitialBlocks(): Block[] {
	return [ paragraph( 'anchor', 'Anchor' ), paragraph( 'tail', 'Tail' ) ];
}

function appendBlock( blocks: Block[], clientId: string, content: string ) {
	return [ ...blocks, paragraph( clientId, content ) ];
}

function getBlocksArray( ydoc: CRDTDoc ): Y.Array< YBlock > {
	const recordMap = ydoc.getMap( CRDT_RECORD_MAP_KEY );
	let blocks = recordMap.get( 'blocks' );

	if ( ! ( blocks instanceof Y.Array ) ) {
		blocks = new Y.Array< YBlock >();
		recordMap.set( 'blocks', blocks );
	}

	return blocks as Y.Array< YBlock >;
}

function getContents( ydoc: CRDTDoc ): string[] {
	return ( getBlocksArray( ydoc ).toJSON() as Block[] ).map( ( block ) =>
		String( block.attributes.content )
	);
}

function applyBlocks( ydoc: CRDTDoc, blocks: Block[], baseBlocks?: Block[] ) {
	applyPostChangesToCRDTDoc(
		ydoc,
		{ blocks },
		SYNCED_PROPERTIES,
		baseBlocks ? { baseRecord: { id: 1, blocks: baseBlocks } } : {}
	);
}

function createBlocksSyncConfig(
	onApply?: ( ydoc: CRDTDoc ) => void
): SyncConfig {
	return {
		applyChangesToCRDTDoc: (
			ydoc: CRDTDoc,
			changes: ObjectData,
			options?: { baseRecord?: ObjectData }
		) => {
			onApply?.( ydoc );
			applyPostChangesToCRDTDoc(
				ydoc,
				changes,
				SYNCED_PROPERTIES,
				options
			);
		},
		createAwareness: jest.fn(),
		getChangesFromCRDTDoc: jest.fn( () => ( {} ) ),
		getPersistedCRDTDoc: jest.fn( () => null ),
	};
}

function createHandlers( blocks: Block[] ) {
	return {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn(),
		getEditedRecord: jest.fn( async () => ( { id: 1, blocks } ) ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};
}

function waitForDeferredUpdate() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

describe( 'RTC stale base-record block updates', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'preserves a remote append when applyPostChangesToCRDTDoc receives a stale baseRecord', () => {
		const doc = new Y.Doc();
		const initialBlocks = createInitialBlocks();

		try {
			applyBlocks( doc, initialBlocks );
			applyBlocks(
				doc,
				appendBlock( initialBlocks, 'remote-appended', 'Remote append' )
			);
			applyBlocks(
				doc,
				appendBlock( initialBlocks, 'local-appended', 'Local append' ),
				initialBlocks
			);

			expect( getContents( doc ) ).toEqual( [
				'Anchor',
				'Tail',
				'Remote append',
				'Local append',
			] );
		} finally {
			doc.destroy();
		}
	} );

	it( 'preserves a remote append when SyncManager.update forwards a stale baseRecord', async () => {
		let capturedDoc: CRDTDoc | undefined;
		const manager = createSyncManager();
		const initialBlocks = createInitialBlocks();
		const syncConfig = createBlocksSyncConfig( ( ydoc ) => {
			capturedDoc = ydoc;
		} );

		await manager.load(
			syncConfig,
			OBJECT_TYPE,
			OBJECT_ID,
			{ id: 1, blocks: initialBlocks },
			createHandlers( initialBlocks )
		);

		expect( capturedDoc ).toBeDefined();

		applyBlocks(
			capturedDoc as CRDTDoc,
			appendBlock( initialBlocks, 'remote-appended', 'Remote append' )
		);
		manager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			{
				blocks: appendBlock(
					initialBlocks,
					'local-appended',
					'Local append'
				),
			},
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: { id: 1, blocks: initialBlocks } }
		);
		await waitForDeferredUpdate();

		expect( getContents( capturedDoc as CRDTDoc ) ).toEqual( [
			'Anchor',
			'Tail',
			'Remote append',
			'Local append',
		] );

		manager.unload( OBJECT_TYPE, OBJECT_ID );
	} );
} );
