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
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn(),
	getShiftedSelection: jest.fn(),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc, type YPostRecord } from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );
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

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( block ) => `<p>${ block.attributes.content }</p>` )
		.join( '\n\n' );
}

function recordForBlocks( blocks: Block[] ): ObjectData {
	return {
		id: 1,
		blocks: cloneBlocks( blocks ),
		content: serializeBlocks( blocks ),
	};
}

function syncDocs( first: CRDTDoc, second: CRDTDoc ) {
	Y.applyUpdateV2( second, Y.encodeStateAsUpdateV2( first ) );
	Y.applyUpdateV2( first, Y.encodeStateAsUpdateV2( second ) );
}

function waitForDeferredUpdate() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

function postBlocks( doc: CRDTDoc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as Block[];
}

function contentsOf( doc: CRDTDoc ): string[] {
	return postBlocks( doc ).map(
		( block ) => block.attributes.content as string
	);
}

function createPostSyncConfig(
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
				SYNCED_POST_PROPERTIES,
				options
			);
		},
		getChangesFromCRDTDoc: ( ydoc: CRDTDoc, editedRecord: ObjectData ) => {
			const blocks = postBlocks( ydoc );

			return JSON.stringify( blocks ) ===
				JSON.stringify( editedRecord.blocks )
				? {}
				: { blocks, content: serializeBlocks( blocks ) };
		},
		getPersistedCRDTDoc: () => null,
	};
}

function createHandlers( initialBlocks: Block[] ) {
	let editedBlocks = cloneBlocks( initialBlocks );

	return {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn( ( changes: { blocks?: Block[] } ) => {
			if ( changes.blocks ) {
				editedBlocks = cloneBlocks( changes.blocks );
			}
		} ),
		getEditedRecord: jest.fn( async () => recordForBlocks( editedBlocks ) ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};
}

describe( '9b8e54918df2 SyncManager stale base-record window', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'does not reapply stale base-record structure after a remote delete has arrived', async () => {
		let primaryDoc: CRDTDoc | undefined;
		let secondaryDoc: CRDTDoc | undefined;
		const primaryManager = createSyncManager();
		const secondaryManager = createSyncManager();

		const inserted = paragraph(
			'recent-remote-insert',
			'RTC realistic 9b8e paragraph'
		);
		const seedOne = paragraph(
			'seed-one',
			'Seed 950584 baseline paragraph.'
		);
		const seedTwo = paragraph(
			'seed-two',
			'Seed 950584 keeps a second paragraph for deletes and moves.'
		);
		const initialBlocks = [ seedOne, seedTwo ];
		const withInserted = [ inserted, seedOne, seedTwo ];
		const afterDelete = [ seedOne, seedTwo ];

		await primaryManager.load(
			createPostSyncConfig( ( ydoc ) => {
				primaryDoc = ydoc;
			} ),
			OBJECT_TYPE,
			OBJECT_ID,
			recordForBlocks( initialBlocks ),
			createHandlers( initialBlocks )
		);
		await secondaryManager.load(
			createPostSyncConfig( ( ydoc ) => {
				secondaryDoc = ydoc;
			} ),
			OBJECT_TYPE,
			OBJECT_ID,
			recordForBlocks( initialBlocks ),
			createHandlers( initialBlocks )
		);

		expect( primaryDoc ).toBeDefined();
		expect( secondaryDoc ).toBeDefined();

		primaryManager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			recordForBlocks( withInserted ),
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: recordForBlocks( initialBlocks ) }
		);
		await waitForDeferredUpdate();
		syncDocs( primaryDoc as CRDTDoc, secondaryDoc as CRDTDoc );
		await waitForDeferredUpdate();

		secondaryManager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			recordForBlocks( afterDelete ),
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: recordForBlocks( withInserted ) }
		);
		await waitForDeferredUpdate();
		syncDocs( secondaryDoc as CRDTDoc, primaryDoc as CRDTDoc );

		const staleLocalEdit = [
			inserted,
			paragraph( 'seed-one', 'Seed 950584 local follow-up edit.' ),
			seedTwo,
		];
		primaryManager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			recordForBlocks( staleLocalEdit ),
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: recordForBlocks( withInserted ) }
		);
		await waitForDeferredUpdate();

		expect( contentsOf( primaryDoc as CRDTDoc ) ).toEqual( [
			'Seed 950584 local follow-up edit.',
			'Seed 950584 keeps a second paragraph for deletes and moves.',
		] );

		primaryManager.unload( OBJECT_TYPE, OBJECT_ID );
		secondaryManager.unload( OBJECT_TYPE, OBJECT_ID );
	} );
} );
