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
 * Mock sync providers so the SyncManager test can model a same-user reload
 * joining an existing room without using browser/network fault injection.
 */
jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { applyPostChangesToCRDTDoc, getPostChangesFromCRDTDoc } from '../crdt';
import type { Post } from '../../entity-types';

const SYNCED_TITLE = new Set( [ 'title' ] );
const INITIAL_TITLE = 'RTC same-user reload initial';
const CUSTOMER_TITLE = 'RTC same-user unsaved title before reload';
const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';
const REMOTE_SYNC_ORIGIN = Symbol( 'same-user-title-reload-sync' );
const mockGetProviderCreators = jest.mocked( getProviderCreators );

function syncDocs( source: Y.Doc, target: Y.Doc ) {
	Y.applyUpdateV2( target, Y.encodeStateAsUpdateV2( source ) );
}

function connectOneWay( source: Y.Doc, target: Y.Doc ) {
	const handler = ( update: Uint8Array, origin: unknown ) => {
		if ( origin === REMOTE_SYNC_ORIGIN ) {
			return;
		}

		Y.applyUpdateV2( target, update, REMOTE_SYNC_ORIGIN );
	};

	source.on( 'updateV2', handler );

	return () => source.off( 'updateV2', handler );
}

function connectDocs( first: Y.Doc, second: Y.Doc ) {
	syncDocs( first, second );
	const disconnectFirst = connectOneWay( first, second );
	const disconnectSecond = connectOneWay( second, first );

	return () => {
		disconnectFirst();
		disconnectSecond();
	};
}

function createTitleSyncConfig(
	onApply?: ( ydoc: CRDTDoc ) => void
): SyncConfig {
	return {
		applyChangesToCRDTDoc: ( ydoc: CRDTDoc, changes: ObjectData ) => {
			onApply?.( ydoc );
			applyPostChangesToCRDTDoc( ydoc, changes, SYNCED_TITLE );
		},
		getChangesFromCRDTDoc: ( ydoc: CRDTDoc, editedRecord: ObjectData ) =>
			getPostChangesFromCRDTDoc(
				ydoc,
				editedRecord as unknown as Post,
				SYNCED_TITLE
			),
		getPersistedCRDTDoc: () => null,
	};
}

function createHandlers( editedTitle: string ) {
	return {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn(),
		getEditedRecord: jest.fn( async () => ( {
			id: 1,
			title: editedTitle,
		} ) ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};
}

function waitForDeferredUpdate() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

describe( 'same-user title reload loss', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'does not let a reloaded same-user session broadcast a stale persisted title over the active unsaved title', () => {
		const activeDoc = new Y.Doc();
		const reloadedDoc = new Y.Doc();

		try {
			applyPostChangesToCRDTDoc(
				activeDoc,
				{ title: INITIAL_TITLE },
				SYNCED_TITLE
			);
			applyPostChangesToCRDTDoc(
				activeDoc,
				{ title: CUSTOMER_TITLE },
				SYNCED_TITLE
			);

			syncDocs( activeDoc, reloadedDoc );

			applyPostChangesToCRDTDoc(
				reloadedDoc,
				{ title: INITIAL_TITLE },
				SYNCED_TITLE
			);
			syncDocs( reloadedDoc, activeDoc );

			const changes = getPostChangesFromCRDTDoc(
				activeDoc,
				{
					title: CUSTOMER_TITLE,
				} as unknown as Post,
				SYNCED_TITLE
			);

			expect( changes.title ).toBeUndefined();
		} finally {
			activeDoc.destroy();
			reloadedDoc.destroy();
		}
	} );

	it( 'does not let SyncManager hydration replay a stale persisted title after a same-user reload joins a live room', async () => {
		let activeDoc: CRDTDoc | undefined;
		let reloadedDoc: CRDTDoc | undefined;
		let disconnectDocs: ( () => void ) | undefined;
		const activeManager = createSyncManager();
		const reloadedManager = createSyncManager();
		const activeHandlers = createHandlers( CUSTOMER_TITLE );

		try {
			await activeManager.load(
				createTitleSyncConfig( ( ydoc ) => {
					activeDoc = ydoc;
				} ),
				OBJECT_TYPE,
				OBJECT_ID,
				{ id: 1, title: INITIAL_TITLE },
				activeHandlers
			);

			activeManager.update(
				OBJECT_TYPE,
				OBJECT_ID,
				{ title: CUSTOMER_TITLE },
				'LOCAL_EDITOR_ORIGIN'
			);
			await waitForDeferredUpdate();

			expect( activeDoc ).toBeDefined();
			mockGetProviderCreators.mockReturnValueOnce( [
				jest.fn( async ( { ydoc } ) => {
					disconnectDocs = connectDocs( activeDoc as Y.Doc, ydoc );

					return {
						destroy: jest.fn(),
						on: jest.fn(),
					};
				} ),
			] );

			await reloadedManager.load(
				createTitleSyncConfig( ( ydoc ) => {
					reloadedDoc = ydoc;
				} ),
				OBJECT_TYPE,
				OBJECT_ID,
				{ id: 1, title: INITIAL_TITLE },
				createHandlers( CUSTOMER_TITLE )
			);

			expect( reloadedDoc ).toBeDefined();
			await waitForDeferredUpdate();

			expect( activeHandlers.editRecord ).not.toHaveBeenCalledWith(
				expect.objectContaining( {
					title: INITIAL_TITLE,
				} )
			);
		} finally {
			disconnectDocs?.();
		}
	} );
} );
