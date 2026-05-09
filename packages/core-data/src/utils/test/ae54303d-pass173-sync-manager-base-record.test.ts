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
		{
			name: 'core/pullquote',
			attributes: {
				value: { type: 'rich-text' },
				citation: { type: 'rich-text' },
			},
		},
		{
			name: 'core/search',
			attributes: {
				label: { type: 'string' },
				placeholder: { type: 'string' },
				buttonText: { type: 'string' },
			},
		},
		{
			name: 'core/table',
			attributes: {
				caption: { type: 'rich-text' },
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
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { CRDT_RECORD_MAP_KEY } from '../../../../sync/src/config';
import { getProviderCreators } from '../../../../sync/src/providers';
import {
	mergeCrdtBlocks,
	type Block,
	type YBlocks,
} from '../crdt-blocks';

const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';
const mockGetProviderCreators = jest.mocked( getProviderCreators );

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function paragraph( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function pullquote( value: string, citation: string ): Block {
	return {
		name: 'core/pullquote',
		clientId: 'pullquote',
		attributes: { value, citation },
		innerBlocks: [],
	};
}

function search( label: string, placeholder: string ): Block {
	return {
		name: 'core/search',
		clientId: 'search',
		attributes: {
			label,
			placeholder,
			buttonText: 'Search',
		},
		innerBlocks: [],
	};
}

function table( caption: string, cellContent: string ): Block {
	return {
		name: 'core/table',
		clientId: 'table',
		attributes: {
			caption,
			body: [
				{
					cells: [
						{
							content: cellContent,
							tag: 'td',
						},
					],
				},
			],
		},
		innerBlocks: [],
	};
}

function createInitialBlocks(): Block[] {
	return [
		paragraph( 'lead', 'Lead paragraph' ),
		pullquote( 'Original quote', 'Original citation' ),
		search( 'Original search label', 'Original placeholder' ),
		table( 'Original caption', 'Original cell' ),
		paragraph( 'tail', 'Tail paragraph' ),
	];
}

function createRemoteBlocks( initialBlocks: Block[] ): Block[] {
	return [
		initialBlocks[ 0 ],
		pullquote( 'Remote quote edit', 'Remote citation edit' ),
		search( 'Remote search label', 'Remote placeholder' ),
		paragraph( 'remote-insert', 'Remote inserted paragraph' ),
		table( 'Remote table caption', 'Remote table cell' ),
		initialBlocks[ 4 ],
	];
}

function createStaleMoveBlocks( initialBlocks: Block[] ): Block[] {
	return [
		initialBlocks[ 1 ],
		initialBlocks[ 2 ],
		initialBlocks[ 3 ],
		initialBlocks[ 4 ],
		initialBlocks[ 0 ],
	];
}

function postBlocks( ydoc: CRDTDoc ): Block[] {
	return getBlocksArray( ydoc ).toJSON() as Block[];
}

function getBlocksArray( ydoc: CRDTDoc ): YBlocks {
	const recordMap = ydoc.getMap( CRDT_RECORD_MAP_KEY );
	let blocks = recordMap.get( 'blocks' );

	if ( ! ( blocks instanceof Y.Array ) ) {
		blocks = new Y.Array();
		recordMap.set( 'blocks', blocks );
	}

	return blocks as YBlocks;
}

function createHandlers( blocks: Block[] ) {
	let editedBlocks = cloneBlocks( blocks );

	return {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn( ( changes: { blocks?: Block[] } ) => {
			if ( changes.blocks ) {
				editedBlocks = cloneBlocks( changes.blocks );
			}
		} ),
		getEditedRecord: jest.fn( async () => ( {
			id: 1,
			blocks: cloneBlocks( editedBlocks ),
		} ) ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};
}

function createPostSyncConfig( onApply: ( ydoc: CRDTDoc ) => void ): SyncConfig {
	return {
		applyChangesToCRDTDoc: (
			ydoc: CRDTDoc,
			changes: ObjectData,
			options = {}
		) => {
			onApply( ydoc );
			if ( Array.isArray( changes.blocks ) ) {
				mergeCrdtBlocks(
					getBlocksArray( ydoc ),
					changes.blocks as Block[],
					null,
					(
						options.baseRecord as
							| { blocks?: Block[] }
							| undefined
					)?.blocks
				);
			}
		},
		getChangesFromCRDTDoc: ( ydoc: CRDTDoc, editedRecord: ObjectData ) => {
			const blocks = postBlocks( ydoc );

			return JSON.stringify( blocks ) ===
				JSON.stringify( editedRecord.blocks )
				? {}
				: { blocks };
		},
		getPersistedCRDTDoc: () => null,
	};
}

function applyBlockSnapshot(
	ydoc: CRDTDoc,
	blocks: Block[],
	baseBlocks?: Block[]
) {
	mergeCrdtBlocks(
		getBlocksArray( ydoc ),
		blocks,
		null,
		baseBlocks ? cloneBlocks( baseBlocks ) : undefined
	);
}

function waitForDeferredUpdate() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

describe( 'ae54303d SyncManager stale baseRecord move', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'preserves a remote mixed-block insert when a local move applies with a stale baseRecord', async () => {
		const initialBlocks = createInitialBlocks();
		const manager = createSyncManager();
		let localDoc: CRDTDoc | undefined;

		await manager.load(
			createPostSyncConfig( ( ydoc ) => {
				localDoc = ydoc;
			} ),
			OBJECT_TYPE,
			OBJECT_ID,
			{ id: 1, blocks: cloneBlocks( initialBlocks ) },
			createHandlers( initialBlocks )
		);

		expect( localDoc ).toBeDefined();

		const remoteDoc = new Y.Doc();
		Y.applyUpdateV2(
			remoteDoc,
			Y.encodeStateAsUpdateV2( localDoc as CRDTDoc )
		);
		applyBlockSnapshot(
			remoteDoc,
			createRemoteBlocks( initialBlocks ),
			initialBlocks
		);
		Y.applyUpdateV2(
			localDoc as CRDTDoc,
			Y.encodeStateAsUpdateV2( remoteDoc ),
			'remote-provider'
		);

		manager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			{
				blocks: createStaleMoveBlocks( initialBlocks ),
			},
			'LOCAL_EDITOR_ORIGIN',
			{ baseRecord: { id: 1, blocks: cloneBlocks( initialBlocks ) } }
		);

		await waitForDeferredUpdate();
		await waitForDeferredUpdate();

		const blocks = postBlocks( localDoc as CRDTDoc );
		expect( blocks.map( ( block ) => block.clientId ) ).toEqual( [
			'pullquote',
			'search',
			'remote-insert',
			'table',
			'tail',
			'lead',
		] );
		expect( blocks[ 0 ].attributes.value ).toBe( 'Remote quote edit' );
		expect( blocks[ 1 ].attributes.label ).toBe( 'Remote search label' );
		expect( blocks[ 3 ].attributes.caption ).toBe(
			'Remote table caption'
		);

		remoteDoc.destroy();
	} );
} );
