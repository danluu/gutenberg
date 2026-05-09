/**
 * External dependencies
 */
import * as Y from 'yjs';
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
		__unstableSerializeAndClean: (
			blocks: { name: string; attributes: { content?: string } }[]
		) =>
			blocks
				.map( ( block ) =>
					block.name === 'core/heading'
						? `<h2>${ block.attributes.content }</h2>`
						: `<p>${ block.attributes.content }</p>`
				)
				.join( '\n\n' ),
		getBlockTypes: () => [
			{
				name: 'core/heading',
				attributes: { content: { type: 'rich-text' } },
			},
			{
				name: 'core/paragraph',
				attributes: { content: { type: 'rich-text' } },
			},
		],
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	store: { name: 'core/block-editor' },
} ) );

jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import {
	applyPostChangesToCRDTDoc,
	getPostChangesFromCRDTDoc,
	type YPostRecord,
} from '../crdt';
import { type Block, type YBlocks } from '../crdt-blocks';
import { getRootMap } from '../crdt-utils';

const mockGetProviderCreators = jest.mocked( getProviderCreators );
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks', 'content' ] );

function makeBlock(
	name: 'core/heading' | 'core/paragraph',
	clientId: string,
	content: string
): Block {
	return {
		name,
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function serializeBlocks( blocks: Block[] ): string {
	return blocks
		.map( ( candidate ) =>
			candidate.name === 'core/heading'
				? `<h2>${ candidate.attributes.content }</h2>`
				: `<p>${ candidate.attributes.content }</p>`
		)
		.join( '\n\n' );
}

function postBlocks( doc: Y.Doc ): Block[] {
	return (
		getRootMap< YPostRecord >( doc, CRDT_RECORD_MAP_KEY ).get(
			'blocks'
		) as YBlocks
	 ).toJSON() as Block[];
}

function contentsOf( blocks: Block[] ): string[] {
	return blocks.map(
		( candidate ) => candidate.attributes.content as string
	);
}

function postRecord( id: number, blocks: Block[] ) {
	return {
		id,
		blocks,
		content: serializeBlocks( blocks ),
	};
}

async function nextTick() {
	await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

describe( '62db5968059e sync-manager stale base delete reconstruction', () => {
	let capturedDoc: Y.Doc | null;
	let manager: ReturnType< typeof createSyncManager >;

	beforeEach( () => {
		capturedDoc = null;
		manager = createSyncManager();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async ( { ydoc } ) => {
				capturedDoc = ydoc as Y.Doc;
				return {
					destroy: jest.fn(),
					on: jest.fn(),
				};
			} ),
		] );
	} );

	afterEach( () => {
		manager.unload( 'postType/post', '1' );
		jest.restoreAllMocks();
	} );

	it( 'does not replay a recently deleted remote heading through an allowed stale baseRecord update', async () => {
		const initialBlocks = [
			makeBlock( 'core/paragraph', 'alpha', 'Alpha' ),
			makeBlock( 'core/paragraph', 'beta', 'Beta' ),
			makeBlock( 'core/paragraph', 'tail', 'Tail' ),
		];
		const withRemoteHeading = [
			initialBlocks[ 0 ],
			makeBlock( 'core/heading', 'remote-heading', 'Remote Heading' ),
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
		];
		const afterRemoteDelete = initialBlocks;
		const stalePeerEditWithDeletedHeading = [
			makeBlock(
				'core/paragraph',
				'alpha',
				'Alpha collaborator stale edit'
			),
			withRemoteHeading[ 1 ],
			initialBlocks[ 1 ],
			initialBlocks[ 2 ],
		];

		const handlers = {
			addUndoMeta: jest.fn(),
			editRecord: jest.fn(),
			getEditedRecord: jest.fn( async () =>
				postRecord( 1, withRemoteHeading )
			),
			onStatusChange: jest.fn(),
			persistCRDTDoc: jest.fn(),
			refetchRecord: jest.fn( async () => {} ),
			restoreUndoMeta: jest.fn(),
		};
		const syncConfig = {
			applyChangesToCRDTDoc: (
				ydoc: Y.Doc,
				changes: Record< string, unknown >,
				options?: { baseRecord?: Record< string, unknown > }
			) => {
				applyPostChangesToCRDTDoc(
					ydoc,
					changes,
					SYNCED_POST_PROPERTIES,
					options
				);
			},
			createAwareness: jest.fn(),
			getChangesFromCRDTDoc: ( ydoc: Y.Doc, editedRecord: unknown ) =>
				getPostChangesFromCRDTDoc(
					ydoc,
					editedRecord as Record< string, unknown >,
					SYNCED_POST_PROPERTIES
				),
			getPersistedCRDTDoc: jest.fn( () => null ),
		};

		await manager.load(
			syncConfig,
			'postType/post',
			'1',
			postRecord( 1, withRemoteHeading ),
			handlers
		);

		let resolveEditedRecord!: ( record: Record< string, unknown > ) => void;
		const pendingEditedRecord = new Promise< Record< string, unknown > >(
			( resolve ) => {
				resolveEditedRecord = resolve;
			}
		);
		handlers.getEditedRecord.mockImplementationOnce(
			() => pendingEditedRecord
		);

		const remoteDoc = new Y.Doc();
		Y.applyUpdateV2(
			remoteDoc,
			Y.encodeStateAsUpdateV2( capturedDoc as Y.Doc )
		);
		const remoteStateVector = Y.encodeStateVector( remoteDoc );
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: afterRemoteDelete },
			SYNCED_POST_PROPERTIES
		);
		Y.applyUpdateV2(
			capturedDoc as Y.Doc,
			Y.encodeStateAsUpdateV2( remoteDoc, remoteStateVector )
		);
		remoteDoc.destroy();

		manager.update(
			'postType/post',
			'1',
			postRecord( 1, stalePeerEditWithDeletedHeading ),
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: postRecord( 1, withRemoteHeading ) }
		);
		await nextTick();

		expect( contentsOf( postBlocks( capturedDoc as Y.Doc ) ) ).toEqual( [
			'Alpha collaborator stale edit',
			'Beta',
			'Tail',
		] );

		resolveEditedRecord( postRecord( 1, afterRemoteDelete ) );
		await nextTick();
	} );
} );
