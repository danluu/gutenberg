/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

jest.mock( '@wordpress/blocks', () => ( {
	__unstableSerializeAndClean: ( blocks ) =>
		blocks
			.map( ( block ) => {
				if ( block.name === 'core/heading' ) {
					return `<h2>${ block.attributes.content }</h2>`;
				}
				if ( block.name === 'core/group' ) {
					return '<div class="wp-block-group"></div>';
				}
				if ( block.name === 'core/pullquote' ) {
					return `<figure class="wp-block-pullquote"><blockquote><p>${ block.attributes.value }</p><cite>${ block.attributes.citation }</cite></blockquote></figure>`;
				}
				return `<p>${ block.attributes.content }</p>`;
			} )
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
		{
			name: 'core/pullquote',
			attributes: {
				citation: { type: 'rich-text' },
				value: { type: 'rich-text' },
			},
		},
	],
} ) );

jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

jest.mock( '../crdt-selection', () => ( {
	getSelectionHistory: jest.fn( () => [] ),
	getShiftedSelection: jest.fn( ( selection ) => selection ),
	updateSelectionHistory: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { createSyncManager } from '../../../../sync/src/manager';
import { getProviderCreators } from '../../../../sync/src/providers';
import { CRDT_RECORD_MAP_KEY } from '../../sync';
import { applyPostChangesToCRDTDoc } from '../crdt';
import { getRootMap } from '../crdt-utils';

const mockGetProviderCreators = jest.mocked( getProviderCreators );
const SYNCED_POST_PROPERTIES = new Set( [ 'blocks' ] );
const OBJECT_TYPE = 'postType/post';
const OBJECT_ID = '1';

function cloneBlocks( blocks ) {
	return JSON.parse( JSON.stringify( blocks ) );
}

function makeBlock( name, clientId, attributes, innerBlocks = [] ) {
	return {
		attributes,
		clientId,
		innerBlocks,
		name,
	};
}

function paragraph( clientId, content ) {
	return makeBlock( 'core/paragraph', clientId, { content } );
}

function heading( clientId, content ) {
	return makeBlock( 'core/heading', clientId, { content } );
}

function group( clientId ) {
	return makeBlock( 'core/group', clientId, {}, [
		paragraph( 'group-paragraph', 'Seed 953941 nested paragraph' ),
		heading( 'group-heading', 'Seed 953941 nested heading' ),
	] );
}

function pullquote( clientId ) {
	return makeBlock( 'core/pullquote', clientId, {
		citation: 'a<strong>it</strong>',
		value: 'x',
	} );
}

function createSeedBlocks() {
	return [
		paragraph( 'emoji', 'Emoji and multibyte paragraph' ),
		paragraph( 'another', 'Another paragraph exists' ),
		heading( 'heading', 'Seed 953941 heading' ),
		group( 'group' ),
	];
}

function getPostBlocks( ydoc ) {
	return getRootMap( ydoc, CRDT_RECORD_MAP_KEY )
		.get( 'blocks' )
		.toJSON();
}

function summarizeBlocks( blocks ) {
	return blocks.map( ( block ) => {
		const text =
			block.name === 'core/pullquote'
				? block.attributes.value
				: block.attributes.content;
		return `${ block.clientId }:${ block.name }:${ text ?? '' }`;
	} );
}

function waitForDeferredUpdate() {
	return new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
}

function applyProviderUpdate( targetDoc, sourceDoc ) {
	Y.applyUpdateV2(
		targetDoc,
		Y.encodeStateAsUpdateV2( sourceDoc, Y.encodeStateVector( targetDoc ) )
	);
}

function createRemoteDocFrom( sourceDoc ) {
	const remoteDoc = new Y.Doc();
	Y.applyUpdateV2( remoteDoc, Y.encodeStateAsUpdateV2( sourceDoc ) );
	return remoteDoc;
}

function createHandlers( initialBlocks ) {
	let editedBlocks = cloneBlocks( initialBlocks );

	return {
		addUndoMeta: jest.fn(),
		editRecord: jest.fn( ( changes ) => {
			if ( changes.blocks ) {
				editedBlocks = cloneBlocks( changes.blocks );
			}
		} ),
		getEditedRecord: jest.fn( async () => ( {
			blocks: cloneBlocks( editedBlocks ),
			id: 1,
		} ) ),
		onStatusChange: jest.fn(),
		persistCRDTDoc: jest.fn(),
		refetchRecord: jest.fn( async () => {} ),
		restoreUndoMeta: jest.fn(),
	};
}

function createBlocksSyncConfig( onApply ) {
	return {
		applyChangesToCRDTDoc: ( ydoc, changes, options ) => {
			onApply?.( ydoc );
			applyPostChangesToCRDTDoc(
				ydoc,
				changes,
				SYNCED_POST_PROPERTIES,
				options
			);
		},
		getChangesFromCRDTDoc: ( ydoc, editedRecord ) => {
			const blocks = getPostBlocks( ydoc );
			return JSON.stringify( blocks ) ===
				JSON.stringify( editedRecord.blocks )
				? {}
				: { blocks };
		},
		getPersistedCRDTDoc: () => null,
	};
}

describe( 'ed4e7b0d24e7 SyncManager base-record race', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetProviderCreators.mockReturnValue( [
			jest.fn( async () => ( {
				destroy: jest.fn(),
				on: jest.fn(),
			} ) ),
		] );
	} );

	it( 'keeps a remote top-level Pullquote when a stale paragraph move is scheduled before store reconciliation', async () => {
		let managerDoc;
		const manager = createSyncManager();
		const initialBlocks = createSeedBlocks();
		const handlers = createHandlers( initialBlocks );

		await manager.load(
			createBlocksSyncConfig( ( ydoc ) => {
				managerDoc = ydoc;
			} ),
			OBJECT_TYPE,
			OBJECT_ID,
			{ blocks: cloneBlocks( initialBlocks ), id: 1 },
			handlers
		);
		await waitForDeferredUpdate();

		const remoteDoc = createRemoteDocFrom( managerDoc );
		const withRemotePullquote = [
			...cloneBlocks( initialBlocks ),
			pullquote( 'remote-pullquote' ),
		];
		applyPostChangesToCRDTDoc(
			remoteDoc,
			{ blocks: withRemotePullquote },
			SYNCED_POST_PROPERTIES,
			{ baseRecord: { blocks: cloneBlocks( initialBlocks ) } }
		);

		applyProviderUpdate( managerDoc, remoteDoc );

		const staleAdjacentMove = [
			initialBlocks[ 1 ],
			initialBlocks[ 0 ],
			initialBlocks[ 2 ],
			initialBlocks[ 3 ],
		];
		manager.update(
			OBJECT_TYPE,
			OBJECT_ID,
			{ blocks: cloneBlocks( staleAdjacentMove ) },
			'local-editor',
			{ baseRecord: { blocks: cloneBlocks( initialBlocks ) } }
		);

		await waitForDeferredUpdate();

		expect( summarizeBlocks( getPostBlocks( managerDoc ) ) ).toEqual( [
			'another:core/paragraph:Another paragraph exists',
			'emoji:core/paragraph:Emoji and multibyte paragraph',
			'heading:core/heading:Seed 953941 heading',
			'group:core/group:',
			'remote-pullquote:core/pullquote:x',
		] );

		remoteDoc.destroy();
		manager.unload( OBJECT_TYPE, OBJECT_ID );
	} );
} );
