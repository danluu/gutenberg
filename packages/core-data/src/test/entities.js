/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { registerBlockType, unregisterBlockType } from '@wordpress/blocks';

jest.mock( '@wordpress/api-fetch' );
jest.mock( '../sync', () => ( {
	...jest.requireActual( '../sync' ),
	getSyncManager: jest.fn(),
} ) );
jest.mock( '../utils/crdt', () => ( {
	...jest.requireActual( '../utils/crdt' ),
	applyPostChangesToCRDTDoc: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import {
	getMethodName,
	rootEntitiesConfig,
	prePersistPostType,
	additionalEntityConfigLoaders,
} from '../entities';
import { getSyncManager } from '../sync';
import {
	applyPostChangesToCRDTDoc,
	POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE,
} from '../utils/crdt';

const TEST_BLOCK_NAME = 'test/stale-content-block';

function paragraphMarkup( content ) {
	return `<!-- wp:${ TEST_BLOCK_NAME } ${ JSON.stringify( {
		content,
	} ) } /-->`;
}

function pageContent( contents ) {
	return contents.map( paragraphMarkup ).join( '\n\n' );
}

describe( 'getMethodName', () => {
	it( 'should return the right method name for an entity with the root kind', () => {
		const methodName = getMethodName( 'root', 'postType' );

		expect( methodName ).toEqual( 'getPostType' );
	} );

	it( 'should use a different suffix', () => {
		const methodName = getMethodName( 'root', 'postType', 'set' );

		expect( methodName ).toEqual( 'setPostType' );
	} );

	it( 'should use the given plural form', () => {
		const methodName = getMethodName( 'root', 'taxonomies', 'get' );

		expect( methodName ).toEqual( 'getTaxonomies' );
	} );

	it( 'should include the kind in the method name', () => {
		const id = rootEntitiesConfig.length;
		rootEntitiesConfig[ id ] = { name: 'book', kind: 'postType' };
		const methodName = getMethodName( 'postType', 'book' );
		delete rootEntitiesConfig[ id ];

		expect( methodName ).toEqual( 'getPostTypeBook' );
	} );
} );

describe( 'prePersistPostType', () => {
	let originalCollaborationEnabled;

	beforeAll( () => {
		registerBlockType( TEST_BLOCK_NAME, {
			apiVersion: 3,
			title: 'Stale content test block',
			category: 'text',
			attributes: {
				content: {
					type: 'string',
				},
			},
			save: () => null,
		} );
	} );

	afterAll( () => {
		unregisterBlockType( TEST_BLOCK_NAME );
	} );

	beforeEach( () => {
		apiFetch.mockReset();
		getSyncManager.mockReset();
		originalCollaborationEnabled = window._wpCollaborationEnabled;
	} );

	afterEach( () => {
		window._wpCollaborationEnabled = originalCollaborationEnabled;
	} );

	it( 'set the status to draft and empty the title when saving auto-draft posts', async () => {
		let record = {
			status: 'auto-draft',
		};
		const edits = {};
		expect(
			await prePersistPostType( record, edits, 'post', false )
		).toEqual( {
			status: 'draft',
			title: '',
		} );

		record = {
			status: 'publish',
		};
		expect(
			await prePersistPostType( record, edits, 'post', false )
		).toEqual( {} );

		record = {
			status: 'auto-draft',
			title: 'Auto Draft',
		};
		expect(
			await prePersistPostType( record, edits, 'post', false )
		).toEqual( {
			status: 'draft',
			title: '',
		} );

		record = {
			status: 'publish',
			title: 'My Title',
		};
		expect(
			await prePersistPostType( record, edits, 'post', false )
		).toEqual( {} );
	} );

	it( 'does not set the status to draft and empty the title when saving templates', async () => {
		const record = {
			status: 'auto-draft',
			title: 'Auto Draft',
		};
		const edits = {};
		expect(
			await prePersistPostType( record, edits, 'post', true )
		).toEqual( {} );
	} );

	it( 'adds meta with serialized CRDT doc when createPersistedCRDTDoc returns a value', async () => {
		const mockSerializedDoc = 'serialized-crdt-doc-data';
		getSyncManager.mockReturnValue( {
			createPersistedCRDTDoc: jest
				.fn()
				.mockReturnValue( mockSerializedDoc ),
		} );

		const record = { id: 123, status: 'publish' };
		const edits = {};
		const result = await prePersistPostType( record, edits, 'post', false );

		expect( result.meta ).toEqual( {
			[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: mockSerializedDoc,
		} );

		expect( getSyncManager ).toHaveBeenCalled();
		expect( getSyncManager().createPersistedCRDTDoc ).toHaveBeenCalledWith(
			'postType/post',
			123
		);

		getSyncManager.mockReset();
	} );

	it( 'merges the latest persisted CRDT record before saving stale post content', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: 'current content' },
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'latest-doc',
			},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn(),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'merged-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: 'merged content',
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: 'base content' },
			},
			{ content: 'stale local content' },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( apiFetch ).toHaveBeenCalledWith( {
			path: '/wp/v2/pages/123?context=edit',
		} );
		expect( syncManager.applyPersistedCRDTDoc ).toHaveBeenCalledWith(
			'postType/page',
			123,
			latestRecord
		);
		expect( syncManager.getCRDTRecordData ).toHaveBeenCalledWith(
			'postType/page',
			123
		);
		expect( result ).toEqual( {
			content: 'merged content',
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'merged-doc',
			},
		} );
	} );

	it( 'uses the CRDT record when applying the latest persisted document changes local state', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: 'current content' },
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'latest-doc',
			},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( true ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'merged-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: 'merged content',
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: 'current content' },
			},
			{ content: 'stale local content' },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( syncManager.applyPersistedCRDTDoc ).toHaveBeenCalledWith(
			'postType/page',
			123,
			latestRecord
		);
		expect( syncManager.getCRDTRecordData ).toHaveBeenCalledWith(
			'postType/page',
			123
		);
		expect( result ).toEqual( {
			content: 'merged content',
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'merged-doc',
			},
		} );
	} );

	it( 'merges non-conflicting stale serialized content edits with the latest saved content', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: pageContent( [ 'Alpha', 'current content' ] ) },
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'latest-doc',
			},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( false ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'merged-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: latestRecord.content.raw,
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: pageContent( [ 'Alpha', 'Beta' ] ) },
			},
			{ content: pageContent( [ 'stale local content', 'Beta' ] ) },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( result.content ).toContain( 'stale local content' );
		expect( result.content ).toContain( 'current content' );
		expect( result.meta ).toEqual( {
			[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'merged-doc',
		} );
	} );

	it( 'preserves latest trailing serialized blocks when a stale content edit submits an older shorter body', async () => {
		const latestContent = pageContent( [
			'Alpha',
			'Beta',
			'current content',
		] );
		const latestRecord = {
			id: 123,
			content: { raw: latestContent },
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'latest-doc',
			},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( false ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'merged-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: latestContent,
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: latestContent },
			},
			{ content: pageContent( [ 'stale local content', 'Beta' ] ) },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( result.content ).toContain( 'stale local content' );
		expect( result.content ).toContain( 'current content' );
		expect( result.meta ).toEqual( {
			[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'merged-doc',
		} );
	} );

	it( 'does not merge stale serialized content edits when the same block changed locally and remotely', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: pageContent( [ 'current content', 'Beta' ] ) },
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'latest-doc',
			},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( false ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'merged-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: latestRecord.content.raw,
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: pageContent( [ 'Alpha', 'Beta' ] ) },
			},
			{ content: pageContent( [ 'stale local content', 'Beta' ] ) },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( result ).toEqual( {
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'merged-doc',
			},
		} );
	} );

	it( 'does not replace edited content from CRDT when the latest record has no persisted CRDT document', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: 'base content' },
			meta: {},
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( true ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'local-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: 'partially flushed local crdt content',
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: 'base content' },
			},
			{ content: 'new local content' },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( syncManager.applyPersistedCRDTDoc ).toHaveBeenCalledWith(
			'postType/page',
			123,
			latestRecord
		);
		expect( syncManager.getCRDTRecordData ).not.toHaveBeenCalled();
		expect( result ).toEqual( {
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'local-doc',
			},
		} );
	} );

	it( 'does not replace edited content when the latest saved post has not changed', async () => {
		const latestRecord = {
			id: 123,
			content: { raw: 'base content' },
		};
		const syncManager = {
			applyPersistedCRDTDoc: jest.fn().mockResolvedValue( false ),
			createPersistedCRDTDoc: jest.fn().mockResolvedValue( 'local-doc' ),
			getCRDTRecordData: jest.fn( () => ( {
				content: 'older local crdt content',
			} ) ),
		};
		apiFetch.mockResolvedValue( latestRecord );
		getSyncManager.mockReturnValue( syncManager );
		window._wpCollaborationEnabled = true;

		const result = await prePersistPostType(
			{
				id: 123,
				status: 'publish',
				content: { raw: 'base content' },
			},
			{ content: 'new local content' },
			'page',
			false,
			'/wp/v2/pages'
		);

		expect( syncManager.applyPersistedCRDTDoc ).toHaveBeenCalledWith(
			'postType/page',
			123,
			latestRecord
		);
		expect( syncManager.getCRDTRecordData ).not.toHaveBeenCalled();
		expect( result ).toEqual( {
			meta: {
				[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ]: 'local-doc',
			},
		} );
	} );
} );

describe( 'loadPostTypeEntities', () => {
	let originalCollaborationEnabled;
	const safePostSyncProperties = [ 'blocks', 'content', 'excerpt', 'title' ];

	const expectSafePostSyncProperties = ( syncedProperties ) => {
		expect( [ ...syncedProperties ].sort() ).toEqual(
			safePostSyncProperties
		);
	};

	beforeEach( () => {
		apiFetch.mockReset();
		applyPostChangesToCRDTDoc.mockReset();
		originalCollaborationEnabled = window._wpCollaborationEnabled;
	} );

	afterEach( () => {
		window._wpCollaborationEnabled = originalCollaborationEnabled;
	} );

	it( 'should not include custom taxonomy rest_bases in synced properties', async () => {
		window._wpCollaborationEnabled = true;

		const mockPostTypes = {
			book: {
				name: 'Books',
				rest_base: 'books',
				rest_namespace: 'wp/v2',
				taxonomies: [ 'genre', 'audience' ],
			},
		};

		apiFetch.mockResolvedValueOnce( mockPostTypes );

		const postTypeLoader = additionalEntityConfigLoaders.find(
			( loader ) => loader.kind === 'postType'
		);
		const entities = await postTypeLoader.loadEntities();
		const bookEntity = entities.find( ( e ) => e.name === 'book' );

		bookEntity.syncConfig.applyChangesToCRDTDoc( {}, {} );

		expect( applyPostChangesToCRDTDoc ).toHaveBeenCalledWith(
			{},
			{},
			expect.any( Set )
		);

		const syncedProperties = applyPostChangesToCRDTDoc.mock.calls[ 0 ][ 2 ];
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
		expectSafePostSyncProperties( syncedProperties );
		expect( syncedProperties ).not.toContain( 'genres' );
		expect( syncedProperties ).not.toContain( 'audiences' );
	} );

	it( 'should not fetch taxonomies when collaboration is disabled', async () => {
		window._wpCollaborationEnabled = false;

		const mockPostTypes = {
			post: {
				name: 'Posts',
				rest_base: 'posts',
				rest_namespace: 'wp/v2',
				taxonomies: [ 'category', 'post_tag' ],
			},
		};

		apiFetch.mockResolvedValueOnce( mockPostTypes );

		const postTypeLoader = additionalEntityConfigLoaders.find(
			( loader ) => loader.kind === 'postType'
		);
		const entities = await postTypeLoader.loadEntities();
		const postEntity = entities.find( ( e ) => e.name === 'post' );

		postEntity.syncConfig.applyChangesToCRDTDoc( {}, {} );

		// Only one apiFetch call (post types), no taxonomy fetch.
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );

		const syncedProperties = applyPostChangesToCRDTDoc.mock.calls[ 0 ][ 2 ];
		expectSafePostSyncProperties( syncedProperties );
		expect( syncedProperties ).not.toContain( 'categories' );
		expect( syncedProperties ).not.toContain( 'tags' );
	} );

	it( 'should not fetch taxonomies or add taxonomy rest_base values', async () => {
		window._wpCollaborationEnabled = true;

		const mockPostTypes = {
			book: {
				name: 'Books',
				rest_base: 'books',
				rest_namespace: 'wp/v2',
				taxonomies: [ 'genre', 'missing_taxonomy' ],
			},
		};

		apiFetch.mockResolvedValueOnce( mockPostTypes );

		const postTypeLoader = additionalEntityConfigLoaders.find(
			( loader ) => loader.kind === 'postType'
		);
		const entities = await postTypeLoader.loadEntities();
		const bookEntity = entities.find( ( e ) => e.name === 'book' );

		bookEntity.syncConfig.applyChangesToCRDTDoc( {}, {} );

		const syncedProperties = applyPostChangesToCRDTDoc.mock.calls[ 0 ][ 2 ];
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
		expectSafePostSyncProperties( syncedProperties );
		expect( syncedProperties ).not.toContain( 'genres' );
		expect( syncedProperties ).not.toContain( 'missing_taxonomy' );
	} );

	it( 'should include only fail-closed safe synced properties regardless of taxonomies', async () => {
		window._wpCollaborationEnabled = true;

		const mockPostTypes = {
			page: {
				name: 'Pages',
				rest_base: 'pages',
				rest_namespace: 'wp/v2',
				taxonomies: [],
			},
		};

		apiFetch.mockResolvedValueOnce( mockPostTypes );

		const postTypeLoader = additionalEntityConfigLoaders.find(
			( loader ) => loader.kind === 'postType'
		);
		const entities = await postTypeLoader.loadEntities();
		const pageEntity = entities.find( ( e ) => e.name === 'page' );

		pageEntity.syncConfig.applyChangesToCRDTDoc( {}, {} );

		const syncedProperties = applyPostChangesToCRDTDoc.mock.calls[ 0 ][ 2 ];
		const unsafeProperties = [
			'author',
			'comment_status',
			'date',
			'featured_media',
			'format',
			'meta',
			'ping_status',
			'slug',
			'status',
			'sticky',
			'template',
		];
		for ( const prop of unsafeProperties ) {
			expect( syncedProperties ).not.toContain( prop );
		}
		expectSafePostSyncProperties( syncedProperties );
	} );
} );

describe( 'loadTaxonomyEntities', () => {
	beforeEach( () => {
		apiFetch.mockReset();
	} );

	it( 'should add supportsPagination: true to taxonomy entities', async () => {
		const mockTaxonomies = {
			category: {
				name: 'Categories',
				rest_base: 'categories',
			},
		};

		apiFetch.mockResolvedValueOnce( mockTaxonomies );

		const taxonomyLoader = additionalEntityConfigLoaders.find(
			( loader ) => loader.kind === 'taxonomy'
		);
		const entities = await taxonomyLoader.loadEntities();

		expect( entities[ 0 ].supportsPagination ).toBe( true );
	} );
} );
