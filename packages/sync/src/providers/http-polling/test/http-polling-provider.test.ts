/**
 * External dependencies
 */
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';

// Mock network transport while keeping the real update queue and encoding helpers.
jest.mock( '../utils', () => ( {
	...( jest.requireActual( '../utils' ) as object ),
	postSyncUpdate: jest.fn(),
	postSyncUpdateNonBlocking: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createHttpPollingProvider } from '../http-polling-provider';
import { postSyncUpdate } from '../utils';
import {
	SyncUpdateType,
	type SyncPayload,
	type SyncResponse,
} from '../types';
import type { ProviderCreatorResult } from '../../../types';

const PRIMARY_ROOM = 'postType/post:1';
const SECONDARY_ROOM = 'root/comment';

const soloAwareness = {
	1: { collaboratorInfo: { id: 100 } },
};

const collaboratorAwareness = {
	1: { collaboratorInfo: { id: 100 } },
	2: { collaboratorInfo: { id: 200 } },
};

function syncResponse(
	room: string,
	endCursor: number,
	awareness = soloAwareness
): SyncResponse {
	return {
		rooms: [
			{
				room,
				end_cursor: endCursor,
				awareness,
				updates: [],
			},
		],
	};
}

function getRoomPayload( payload: SyncPayload, room: string ) {
	return payload.rooms.find( ( item ) => item.room === room );
}

describe( 'http-polling-provider', () => {
	const mockPostSyncUpdate = jest.mocked( postSyncUpdate );
	let docs: Y.Doc[] = [];
	let providers: ProviderCreatorResult[] = [];

	async function advanceUntilPostSyncCalls( expectedCalls: number ) {
		for (
			let i = 0;
			i < 10 && mockPostSyncUpdate.mock.calls.length < expectedCalls;
			i++
		) {
			await jest.advanceTimersByTimeAsync( 1000 );
		}

		expect( mockPostSyncUpdate ).toHaveBeenCalledTimes( expectedCalls );
	}

	beforeEach( () => {
		jest.useFakeTimers();
		mockPostSyncUpdate.mockReset();
		docs = [];
		providers = [];
	} );

	afterEach( () => {
		providers.forEach( ( provider ) => provider.destroy() );
		docs.forEach( ( doc ) => doc.destroy() );
		jest.clearAllTimers();
		jest.useRealTimers();
	} );

	it( 'sends queued secondary room updates after the primary provider disconnects', async () => {
		mockPostSyncUpdate
			.mockResolvedValueOnce( syncResponse( PRIMARY_ROOM, 1 ) )
			.mockResolvedValueOnce(
				syncResponse( SECONDARY_ROOM, 2, collaboratorAwareness )
			)
			.mockResolvedValue(
				syncResponse( SECONDARY_ROOM, 3, collaboratorAwareness )
			);

		const createProvider = createHttpPollingProvider();
		const primaryDoc = new Y.Doc();
		const secondaryDoc = new Y.Doc();
		docs.push( primaryDoc, secondaryDoc );

		const primaryAwareness = new Awareness( primaryDoc );
		const secondaryAwareness = new Awareness( secondaryDoc );
		primaryAwareness.setLocalState( soloAwareness[ 1 ] );
		secondaryAwareness.setLocalState( soloAwareness[ 1 ] );

		const primaryProvider = await createProvider( {
			objectType: 'postType/post',
			objectId: '1',
			ydoc: primaryDoc,
			awareness: primaryAwareness,
		} );
		providers.push( primaryProvider );

		const secondaryProvider = await createProvider( {
			objectType: 'root/comment',
			objectId: null,
			ydoc: secondaryDoc,
			awareness: secondaryAwareness,
		} );
		providers.push( secondaryProvider );

		await jest.advanceTimersByTimeAsync( 0 );
		expect( mockPostSyncUpdate ).toHaveBeenCalledTimes( 1 );

		primaryProvider.destroy();
		providers = providers.filter(
			( provider ) => provider !== primaryProvider
		);

		secondaryDoc.transact( () => {
			secondaryDoc.getMap( 'record' ).set( 'note', 'queued update' );
		}, 'local-editor' );

		await advanceUntilPostSyncCalls( 2 );
		const collaboratorDiscoveryPayload = mockPostSyncUpdate.mock
			.calls[ 1 ][ 0 ] as SyncPayload;
		expect(
			getRoomPayload( collaboratorDiscoveryPayload, SECONDARY_ROOM )
				?.updates
		).toEqual( [] );

		await advanceUntilPostSyncCalls( 3 );
		const payloadAfterDiscovery = mockPostSyncUpdate.mock
			.calls[ 2 ][ 0 ] as SyncPayload;
		expect(
			getRoomPayload( payloadAfterDiscovery, SECONDARY_ROOM )?.updates
		).toEqual(
			expect.arrayContaining( [
				expect.objectContaining( {
					type: SyncUpdateType.UPDATE,
				} ),
			] )
		);
	} );
} );
