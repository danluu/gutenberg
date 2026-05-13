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

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';
const mockGetProviderCreators = jest.mocked( getProviderCreators );

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
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

function contentsOf( ydoc: CRDTDoc ): string[] {
	return ( getBlocksArray( ydoc ).toJSON() as Block[] ).map(
		( block ) => block.attributes.content as string
	);
}

function syncDocs( from: CRDTDoc, to: CRDTDoc ): void {
	Y.applyUpdateV2( to, Y.encodeStateAsUpdateV2( from ) );
}

function waitForDeferredUpdate(): Promise< void > {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

function preventClientIdCollision( first: CRDTDoc, second: CRDTDoc ): void {
	if ( first.clientID === second.clientID ) {
		second.clientID = first.clientID + 1;
	}
}

function createBlocksSyncConfig(
	onApply: ( ydoc: CRDTDoc ) => void
): SyncConfig {
	return {
		applyChangesToCRDTDoc: (
			ydoc: CRDTDoc,
			changes: ObjectData,
			options?: { baseRecord?: ObjectData }
		) => {
			onApply( ydoc );
			if ( Array.isArray( changes.blocks ) ) {
				mergeCrdtBlocks(
					getBlocksArray( ydoc ),
					changes.blocks as Block[],
					null,
					options?.baseRecord?.blocks as Block[] | undefined
				);
			}
		},
		getChangesFromCRDTDoc: ( ydoc: CRDTDoc, editedRecord: ObjectData ) => {
			const blocks = getBlocksArray( ydoc ).toJSON() as Block[];

			return JSON.stringify( blocks ) ===
				JSON.stringify( editedRecord.blocks )
				? {}
				: { blocks };
		},
		getPersistedCRDTDoc: () => null,
	};
}

function createHandlers( blocks: Block[] ) {
	let editedBlocks = cloneBlocks( blocks );
	let blockNextGetEditedRecord = false;
	let unblockGetEditedRecord: ( () => void ) | undefined;

	const handlers = {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn( ( changes: { blocks?: Block[] } ) => {
			if ( changes.blocks ) {
				editedBlocks = cloneBlocks( changes.blocks );
			}
		} ),
		getEditedRecord: jest.fn( async () => {
			if ( blockNextGetEditedRecord ) {
				blockNextGetEditedRecord = false;
				await new Promise< void >( ( resolve ) => {
					unblockGetEditedRecord = resolve;
				} );
			}

			return {
				id: 1,
				blocks: cloneBlocks( editedBlocks ),
			};
		} ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};

	return {
		handlers,
		blockNextGetEditedRecord: () => {
			blockNextGetEditedRecord = true;
		},
		unblockGetEditedRecord: () => unblockGetEditedRecord?.(),
	};
}

describe( 'pass 179 da9e95 SyncManager stale baseRecord timing probe', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'preserves a remote sibling when a local move is scheduled while remote reconciliation is pending', async () => {
		let localDoc: CRDTDoc | undefined;
		const localManager = createSyncManager();
		const initialBlocks = [
			paragraph( 'heading', 'Heading' ),
			paragraph( 'emoji', 'Emoji paragraph' ),
			paragraph( 'another', 'Another paragraph' ),
		];
		const withRemoteSibling = [
			initialBlocks[ 0 ],
			paragraph( 'remote-sibling', 'Remote sibling' ),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
		];
		const staleTopLevelMove = [
			initialBlocks[ 1 ],
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
		];
		const localHandlers = createHandlers( initialBlocks );
		let remoteDoc: CRDTDoc | undefined;

		await localManager.load(
			createBlocksSyncConfig( ( ydoc ) => {
				localDoc = ydoc;
			} ),
			OBJECT_TYPE,
			OBJECT_ID,
			{ id: 1, blocks: initialBlocks },
			localHandlers.handlers
		);

		expect( localDoc ).toBeDefined();
		await waitForDeferredUpdate();

		remoteDoc = new Y.Doc();
		Y.applyUpdateV2(
			remoteDoc,
			Y.encodeStateAsUpdateV2( localDoc as CRDTDoc )
		);
		preventClientIdCollision( localDoc as CRDTDoc, remoteDoc );
		mergeCrdtBlocks(
			getBlocksArray( remoteDoc ),
			withRemoteSibling,
			null
		);
		expect( contentsOf( remoteDoc as CRDTDoc ) ).toEqual( [
			'Heading',
			'Remote sibling',
			'Emoji paragraph',
			'Another paragraph',
		] );

		localHandlers.blockNextGetEditedRecord();
		syncDocs( remoteDoc as CRDTDoc, localDoc as CRDTDoc );
		expect( contentsOf( localDoc as CRDTDoc ) ).toEqual( [
			'Heading',
			'Remote sibling',
			'Emoji paragraph',
			'Another paragraph',
		] );

		localManager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			{ blocks: staleTopLevelMove },
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: { id: 1, blocks: initialBlocks } }
		);
		await waitForDeferredUpdate();

		const expectedContents = [
			'Emoji paragraph',
			'Heading',
			'Remote sibling',
			'Another paragraph',
		];
		expect( contentsOf( localDoc as CRDTDoc ) ).toEqual( expectedContents );

		localHandlers.unblockGetEditedRecord();
		await waitForDeferredUpdate();
		localManager.unload( OBJECT_TYPE, OBJECT_ID );
		remoteDoc.destroy();
	} );
} );
