/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import type CollaborationUtils from './fixtures/collaboration-utils';
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtils;
	collaboratorUser: UserCredentials;
};

type DetailedTitleState = {
	crdtDocument: string | null;
	currentPostTitle: string | null;
	editedTitle: string;
	entityEditsTitle: string | null;
	entityRecordTitle: string | null;
	isDirty: boolean | null;
	isSaving: boolean | null;
	postEditsTitle: string | null;
};

function normalizeTitleValue( value: unknown ): string | null {
	if ( typeof value === 'string' ) {
		return value;
	}

	if ( value && typeof value === 'object' ) {
		const titleObject = value as { raw?: unknown; rendered?: unknown };
		if ( typeof titleObject.raw === 'string' ) {
			return titleObject.raw;
		}
		if ( typeof titleObject.rendered === 'string' ) {
			return titleObject.rendered;
		}
	}

	return null;
}

async function getDetailedTitleState( page: Page ): Promise< DetailedTitleState > {
	return page.evaluate( () => {
		const editorSelect = ( window as any ).wp.data.select( 'core/editor' );
		const coreSelect = ( window as any ).wp.data.select( 'core' );
		const postId = editorSelect.getCurrentPostId();
		const record = coreSelect.getEntityRecord( 'postType', 'post', postId );
		const entityEdits = coreSelect.getEntityRecordEdits(
			'postType',
			'post',
			postId
		);
		const currentPost = editorSelect.getCurrentPost();
		const postEdits = editorSelect.getPostEdits?.() ?? null;

		const normalize = ( value: unknown ) => {
			if ( typeof value === 'string' ) {
				return value;
			}
			if ( value && typeof value === 'object' ) {
				if ( typeof ( value as any ).raw === 'string' ) {
					return ( value as any ).raw;
				}
				if ( typeof ( value as any ).rendered === 'string' ) {
					return ( value as any ).rendered;
				}
			}
			return null;
		};

		return {
			editedTitle: editorSelect.getEditedPostAttribute( 'title' ) ?? '',
			currentPostTitle: normalize( currentPost?.title ),
			entityRecordTitle: normalize( record?.title ),
			entityEditsTitle: normalize( entityEdits?.title ),
			postEditsTitle: normalize( postEdits?.title ),
			isDirty: editorSelect.isEditedPostDirty?.() ?? null,
			isSaving: editorSelect.isSavingPost?.() ?? null,
			crdtDocument: record?.meta?._crdt_document ?? null,
		};
	} );
}

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
		} );

		await setCollaboration( requestUtils, true );
		await use( utils );
		await utils.teardown();
	},
	collaboratorUser: async (
		{ collaborationUtils, requestUtils },
		use,
		testInfo
	) => {
		const uniqueSuffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.toLowerCase()
			.slice( -16 );
		const collaboratorUser = {
			username: `rtcrepro${ uniqueSuffix }`,
			email: `rtcrepro+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Repro',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

test( 'reloading after a synced title edit keeps both users on the same title', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 90000 );

	const post = await requestUtils.createPost( {
		title: 'RTC reload repro initial title',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Paragraph one.</p><!-- /wp:paragraph -->',
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	const expectedTitle = 'RTC reload repro synced title';

	await page.evaluate( ( title ) => {
		( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
			title,
		} );
	}, expectedTitle );

	await expect
		.poll(
			() =>
				collaborationUtils.page2.evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{ timeout: 30000 }
		)
		.toBe( expectedTitle );

	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );

	const state = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 30000,
	} );

	expect( state.title ).toBe( expectedTitle );
} );

test( 'reload divergence persists beyond the original timeout and only resolves after save', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 240000 );

	const post = await requestUtils.createPost( {
		title: 'RTC reload repro initial title',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Paragraph one.</p><!-- /wp:paragraph -->',
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	const expectedTitle = 'RTC reload repro synced title';

	await page.evaluate( ( title ) => {
		( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
			title,
		} );
	}, expectedTitle );

	await expect
		.poll(
			() =>
				collaborationUtils.page2.evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{ timeout: 30000 }
		)
		.toBe( expectedTitle );

	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );

	const statesSoonAfterReload = await Promise.all( [
		getDetailedTitleState( page ),
		getDetailedTitleState( collaborationUtils.page2 ),
	] );

	const convergedWithoutSave = await collaborationUtils
		.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 90000,
		} )
		.then(
			() => true,
			() => false
		);

	const statesBeforeSave = await Promise.all( [
		getDetailedTitleState( page ),
		getDetailedTitleState( collaborationUtils.page2 ),
	] );

	const persistedPostBeforeSave = await requestUtils.rest( {
		method: 'GET',
		path: `/wp/v2/posts/${ post.id }`,
		params: { context: 'edit' },
	} );

	const pages = [ page, collaborationUtils.page2 ];
	const pageIndexHoldingDirtySyncedTitle = statesBeforeSave.findIndex(
		( state ) =>
			state.editedTitle === expectedTitle && state.isDirty === true
	);

	expect( pageIndexHoldingDirtySyncedTitle ).toBeGreaterThanOrEqual( 0 );

	await pages[ pageIndexHoldingDirtySyncedTitle ].evaluate( async () => {
		await ( window as any ).wp.data.dispatch( 'core/editor' ).savePost();
	} );

	await collaborationUtils.waitForEntityReadyAndSaveSettled( pages[ 0 ], {
		timeout: 30000,
	} );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( pages[ 1 ], {
		timeout: 30000,
	} );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );

	const convergedAfterSave = await collaborationUtils
		.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 60000,
		} )
		.then(
			() => true,
			() => false
		);

	const statesAfterSave = await Promise.all( [
		getDetailedTitleState( page ),
		getDetailedTitleState( collaborationUtils.page2 ),
	] );

	const persistedPostAfterSave = await requestUtils.rest( {
		method: 'GET',
		path: `/wp/v2/posts/${ post.id }`,
		params: { context: 'edit' },
	} );

	console.log(
		JSON.stringify(
			{
				statesSoonAfterReload,
				convergedWithoutSave,
				pageIndexHoldingDirtySyncedTitle,
				convergedAfterSave,
				statesBeforeSave,
				statesAfterSave,
				persistedPostBeforeSave: {
					title: normalizeTitleValue( persistedPostBeforeSave.title ),
					crdtDocument:
						persistedPostBeforeSave.meta?._crdt_document ?? null,
				},
				persistedPostAfterSave: {
					title: normalizeTitleValue( persistedPostAfterSave.title ),
					crdtDocument:
						persistedPostAfterSave.meta?._crdt_document ?? null,
				},
			},
			null,
			2
		)
	);

	expect( convergedWithoutSave ).toBe( false );
	expect(
		statesBeforeSave.some(
			( state ) =>
				state.editedTitle === expectedTitle && state.isDirty === true
		)
	).toBe( true );
	expect( normalizeTitleValue( persistedPostBeforeSave.title ) ).toBe(
		'RTC reload repro initial title'
	);
	expect( convergedAfterSave ).toBe( true );
	expect( statesAfterSave[ 0 ].editedTitle ).toBe( expectedTitle );
	expect( statesAfterSave[ 1 ].editedTitle ).toBe( expectedTitle );
	expect( normalizeTitleValue( persistedPostAfterSave.title ) ).toBe(
		expectedTitle
	);
} );

test( 'after the reload split, block sync and fresh title sync remain live', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const post = await requestUtils.createPost( {
		title: 'RTC reload repro initial title',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Paragraph one.</p><!-- /wp:paragraph -->',
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	const initialSyncedTitle = 'RTC reload repro synced title';

	await page.evaluate( ( title ) => {
		( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
			title,
		} );
	}, initialSyncedTitle );

	await expect
		.poll(
			() =>
				collaborationUtils.page2.evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{ timeout: 30000 }
		)
		.toBe( initialSyncedTitle );

	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );

	await collaborationUtils
		.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: 45000,
		} )
		.then(
			() => {
				throw new Error(
					'Expected title split after reload, but pages converged.'
				);
			},
			() => {}
		);

	const pages = [ page, collaborationUtils.page2 ];
	const statesAfterSplit = await Promise.all( pages.map( getDetailedTitleState ) );
	const dirtyTitleIndex = statesAfterSplit.findIndex(
		( state ) =>
			state.editedTitle === initialSyncedTitle && state.isDirty === true
	);

	expect( dirtyTitleIndex ).toBeGreaterThanOrEqual( 0 );

	const cleanIndex = dirtyTitleIndex === 0 ? 1 : 0;
	const blockContent = 'RTC reload repro block after split';

	await pages[ cleanIndex ].evaluate( ( content ) => {
		const block = ( window as any ).wp.blocks.createBlock( 'core/paragraph', {
			content,
		} );
		( window as any ).wp.data
			.dispatch( 'core/block-editor' )
			.insertBlock( block );
	}, blockContent );

	await expect
		.poll(
			() =>
				pages[ dirtyTitleIndex ].evaluate( () =>
					( window as any ).wp.data
						.select( 'core/block-editor' )
						.getBlocks()
						.map(
							( block: {
								attributes?: Record< string, unknown >;
							} ) => block.attributes?.content ?? null
						)
				),
			{ timeout: 30000 }
		)
		.toContain( blockContent );

	const secondTitle = 'RTC reload repro post reload title';

	await pages[ cleanIndex ].evaluate( ( title ) => {
		( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
			title,
		} );
	}, secondTitle );

	const dirtyPageSawSecondTitle = await expect
		.poll(
			() =>
				pages[ dirtyTitleIndex ].evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{
				timeout: 20000,
				intervals: [ 1000, 2000, 5000 ],
			}
		)
		.toBe( secondTitle )
		.then(
			() => true,
			() => false
		);

	const finalStates = await Promise.all( pages.map( getDetailedTitleState ) );

	console.log(
		JSON.stringify(
			{
				dirtyTitleIndex,
				cleanIndex,
				statesAfterSplit,
				dirtyPageSawSecondTitle,
				finalStates,
			},
			null,
			2
		)
	);

	expect( dirtyPageSawSecondTitle ).toBe( true );
	expect( finalStates[ dirtyTitleIndex ].editedTitle ).toBe( secondTitle );
	expect( finalStates[ cleanIndex ].editedTitle ).toBe( secondTitle );
} );

test( 'reloading one collaborator regresses the other collaborator from the synced unsaved title', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const initialTitle = 'RTC reload repro initial title';
	const syncedTitle = 'RTC reload repro synced title';

	const post = await requestUtils.createPost( {
		title: initialTitle,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Paragraph one.</p><!-- /wp:paragraph -->',
	} );

	await collaborationUtils.openPost( post.id );
	await collaborationUtils.joinUser( post.id, collaboratorUser );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	await page.evaluate( ( title ) => {
		( window as any ).wp.data.dispatch( 'core/editor' ).editPost( {
			title,
		} );
	}, syncedTitle );

	await expect
		.poll(
			() =>
				collaborationUtils.page2.evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{ timeout: 30000 }
		)
		.toBe( syncedTitle );

	const beforeReload = await Promise.all( [
		getDetailedTitleState( page ),
		getDetailedTitleState( collaborationUtils.page2 ),
	] );

	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: 30000,
	} );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );

	await expect
		.poll(
			() =>
				collaborationUtils.page2.evaluate( () =>
					( window as any ).wp.data
						.select( 'core/editor' )
						.getEditedPostAttribute( 'title' )
				),
			{
				timeout: 30000,
				intervals: [ 250, 500, 1000, 2000 ],
			}
		)
		.toBe( initialTitle );

	const afterRegression = await Promise.all( [
		getDetailedTitleState( page ),
		getDetailedTitleState( collaborationUtils.page2 ),
	] );

	console.log(
		JSON.stringify(
			{
				beforeReload,
				afterRegression,
			},
			null,
			2
		)
	);

	expect( beforeReload[ 1 ].editedTitle ).toBe( syncedTitle );
	expect( afterRegression[ 0 ].editedTitle ).toBe( syncedTitle );
	expect( afterRegression[ 1 ].editedTitle ).toBe( initialTitle );
} );
