/**
 * External dependencies
 */
import type { Page, Request } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from '../fixtures';
import { SECOND_USER } from '../fixtures/collaboration-utils';

type RestRequestSnapshot = {
	method: string;
	page: string;
	postData: string | null;
	postDataJSON: unknown;
	url: string;
};

type PhaseSnapshot = {
	pageSnapshots: unknown[];
	serverSnapshot: unknown;
};

type RtcSearchDiagnostics = {
	afterInsert?: PhaseSnapshot;
	afterInsertImmediate?: PhaseSnapshot;
	afterSave?: PhaseSnapshot;
	beforeInsert?: PhaseSnapshot;
	beforeSave?: PhaseSnapshot;
	duringSave?: PhaseSnapshot;
	error?: string;
	failure?: PhaseSnapshot;
	outgoingRestRequests: RestRequestSnapshot[];
	persistedPost?: unknown;
};

const CONVERGENCE_TIMEOUT = 15_000;

function isTargetPostSaveRequest( request: Request, postId: number ) {
	if ( ! [ 'POST', 'PUT', 'PATCH' ].includes( request.method() ) ) {
		return false;
	}

	const url = request.url();
	return (
		url.includes( `/wp/v2/posts/${ postId }` ) ||
		url.includes( `rest_route=%2Fwp%2Fv2%2Fposts%2F${ postId }` )
	);
}

function trackPostSaveRequests(
	page: Page,
	pageLabel: string,
	postId: number,
	requests: RestRequestSnapshot[]
) {
	page.on( 'request', ( request ) => {
		if ( ! isTargetPostSaveRequest( request, postId ) ) {
			return;
		}

		const postData = request.postData();
		let postDataJSON: unknown = null;
		try {
			postDataJSON = postData ? JSON.parse( postData ) : null;
		} catch {
			postDataJSON = null;
		}

		requests.push( {
			method: request.method(),
			page: pageLabel,
			postData,
			postDataJSON,
			url: request.url(),
		} );
	} );
}

async function collectWebSocketServerSnapshot( page: Page ) {
	const port = process.env.GUTENBERG_RTC_TEST_WS_PORT || '18991';
	const response = await page
		.context()
		.request.get( `http://127.0.0.1:${ port }/snapshot`, {
			timeout: 5_000,
		} );
	const body = await response.text();
	try {
		return JSON.parse( body );
	} catch {
		return {
			body,
			ok: response.ok(),
			status: response.status(),
		};
	}
}

async function collectRtcSearchSnapshot( page: Page, label: string ) {
	return page.evaluate( ( snapshotLabel ) => {
		const wp = ( window as any ).wp;
		const core = wp.data.select( 'core' );
		const editor = wp.data.select( 'core/editor' );
		const blockEditor = wp.data.select( 'core/block-editor' );
		const postId = editor.getCurrentPostId();
		const blocks = blockEditor.getBlocks();
		const clone = ( value: unknown ) => {
			try {
				return JSON.parse( JSON.stringify( value ) );
			} catch ( error ) {
				return {
					serializationError:
						error instanceof Error
							? error.message
							: String( error ),
				};
			}
		};

		const call = (
			source: Record< string, unknown >,
			method: string,
			...args: unknown[]
		) =>
			typeof source?.[ method ] === 'function'
				? ( source[ method ] as ( ...callArgs: unknown[] ) => unknown )(
						...args
				  )
				: undefined;

		const editedRecord = call(
			core,
			'getEditedEntityRecord',
			'postType',
			'post',
			postId
		);
		const editedRecordEdits = call(
			core,
			'getEntityRecordEdits',
			'postType',
			'post',
			postId
		);
		const entityRecord = core.getEntityRecord( 'postType', 'post', postId );
		const crdtDocument = entityRecord?.meta?._crdt_document ?? null;
		const serializedContent = wp.blocks.serialize( blocks );
		const editedContent = editor.getEditedPostContent();

		return {
			label: snapshotLabel,
			blockCount: blocks.length,
			blocks: clone( blocks ),
			collaborationEnabled: ( window as any )._wpCollaborationEnabled,
			crdtDocument,
			crdtDocumentLength:
				typeof crdtDocument === 'string' ? crdtDocument.length : 0,
			editedContent,
			editedRecord: clone( editedRecord ),
			editedRecordEdits: clone( editedRecordEdits ),
			editorState: {
				activePostLock: clone( call( editor, 'getActivePostLock' ) ),
				currentPost: clone( call( editor, 'getCurrentPost' ) ),
				currentUser: clone( call( core, 'getCurrentUser' ) ),
				isAutosavingPost: call( editor, 'isAutosavingPost' ),
				isEditedPostDirty: call( editor, 'isEditedPostDirty' ),
				isPostLocked: call( editor, 'isPostLocked' ),
				isPostLockTakeover: call( editor, 'isPostLockTakeover' ),
				isSavingPost: call( editor, 'isSavingPost' ),
				postLockUser: clone( call( editor, 'getPostLockUser' ) ),
			},
			postId,
			providerState: clone(
				( window as any ).__gutenbergTestWebSocketSync ?? null
			),
			serializedContent,
			title: editor.getEditedPostAttribute( 'title' ),
		};
	}, label );
}

async function collectPhaseSnapshot(
	pages: Page[],
	phase: string
): Promise< PhaseSnapshot > {
	return {
		pageSnapshots: await Promise.all(
			pages.map( ( page, index ) =>
				collectRtcSearchSnapshot( page, `${ phase }:user-${ index }` )
			)
		),
		serverSnapshot: await collectWebSocketServerSnapshot( pages[ 0 ] ),
	};
}

async function insertSearchSaveCheckpoint(
	page: Page,
	{
		optionMarker,
		paragraphMarker,
		titleMarker,
	}: {
		optionMarker: string;
		paragraphMarker: string;
		titleMarker: string;
	}
) {
	await page.evaluate(
		( { option, paragraph, title } ) => {
			const wp = ( window as any ).wp;
			const paragraphBlock = wp.blocks.createBlock( 'core/paragraph', {
				content: paragraph,
			} );
			const searchBlock = wp.blocks.createBlock( 'core/search', {
				buttonPosition: 'button-inside',
				buttonText: `Find ${ option }`,
				label: `Search label ${ option }`,
				placeholder: `Search placeholder ${ option }`,
			} );

			wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( paragraphBlock );
			wp.data.dispatch( 'core/block-editor' ).insertBlock( searchBlock );
			wp.data.dispatch( 'core/editor' ).editPost( { title } );
		},
		{
			option: optionMarker,
			paragraph: paragraphMarker,
			title: titleMarker,
		}
	);
}

async function beginSavePost( page: Page ) {
	await page.evaluate( () => {
		( window as any ).wp.data.dispatch( 'core/editor' ).savePost();
	} );
}

async function waitForSaveToFinish( page: Page ) {
	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: CONVERGENCE_TIMEOUT }
	);
}

function hasSearchMarker(
	blocks: Array< { attributes?: Record< string, unknown >; name: string } >,
	marker: string
) {
	return blocks.some(
		( block ) =>
			block.name === 'core/search' &&
			Object.values( block.attributes ?? {} ).some( ( value ) =>
				String( value ).includes( marker )
			)
	);
}

test.describe( 'Collaboration - WebSocket search pre-save checkpoint', () => {
	test( 'keeps a just-inserted search block live and persisted across save', async ( {
		collaborationUtils,
		page,
		requestUtils,
	}, testInfo ) => {
		test.setTimeout( 90_000 );

		const post = await requestUtils.createPost( {
			title: 'RTC search pre-save checkpoint',
			content:
				'<!-- wp:paragraph -->\n<p>Initial search checkpoint content.</p>\n<!-- /wp:paragraph -->',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const outgoingRestRequests: RestRequestSnapshot[] = [];
		const diagnostics: RtcSearchDiagnostics = { outgoingRestRequests };

		try {
			await collaborationUtils.openPost( post.id );
			const { page: page2 } = await collaborationUtils.joinUser(
				post.id,
				SECOND_USER
			);
			trackPostSaveRequests(
				page,
				'user-0',
				post.id,
				outgoingRestRequests
			);
			trackPostSaveRequests(
				page2,
				'user-1',
				post.id,
				outgoingRestRequests
			);

			await collaborationUtils.waitForMutualDiscovery( {
				timeout: 30_000,
			} );

			const paragraphMarker = `rtc-save-paragraph-marker-search-${ post.id }`;
			const optionMarker = `rtc-save-search-option-marker-${ post.id }`;
			const titleMarker = `rtc-save-title-marker-search-${ post.id }`;

			diagnostics.beforeInsert = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'before-insert'
			);

			await insertSearchSaveCheckpoint( page, {
				optionMarker,
				paragraphMarker,
				titleMarker,
			} );
			diagnostics.afterInsertImmediate = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'after-insert-immediate'
			);

			const stateAfterInsert =
				await collaborationUtils.waitForConvergence( {
					timeout: CONVERGENCE_TIMEOUT,
				} );
			diagnostics.afterInsert = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'after-insert'
			);

			expect( JSON.stringify( stateAfterInsert.blocks ) ).toContain(
				paragraphMarker
			);
			expect(
				hasSearchMarker( stateAfterInsert.blocks, optionMarker )
			).toBe( true );
			expect( stateAfterInsert.title ).toContain( titleMarker );

			diagnostics.beforeSave = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'before-save'
			);

			await beginSavePost( page );
			diagnostics.duringSave = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'during-save'
			);
			await waitForSaveToFinish( page );

			const stateAfterSave = await collaborationUtils.waitForConvergence(
				{
					includeCrdtDocument: true,
					timeout: CONVERGENCE_TIMEOUT,
				}
			);
			diagnostics.afterSave = await collectPhaseSnapshot(
				collaborationUtils.allPages,
				'after-save'
			);

			expect( stateAfterSave.crdtDocument ).toBeTruthy();
			expect( JSON.stringify( stateAfterSave.blocks ) ).toContain(
				paragraphMarker
			);
			expect(
				hasSearchMarker( stateAfterSave.blocks, optionMarker )
			).toBe( true );
			expect( stateAfterSave.title ).toContain( titleMarker );

			const persistedPost = await requestUtils.rest< {
				content: { raw: string };
				meta: { _crdt_document?: string };
				title: { raw: string };
			} >( {
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );
			diagnostics.persistedPost = persistedPost;

			const outgoingPayloads = JSON.stringify( outgoingRestRequests );
			expect( outgoingPayloads ).toContain( paragraphMarker );
			expect( outgoingPayloads ).toContain( optionMarker );
			expect( outgoingPayloads ).toContain( titleMarker );
			expect( persistedPost.content.raw ).toContain( paragraphMarker );
			expect( persistedPost.content.raw ).toContain( optionMarker );
			expect( persistedPost.title.raw ).toContain( titleMarker );
			expect( persistedPost.meta._crdt_document ).toBeTruthy();
		} catch ( error ) {
			diagnostics.error =
				error instanceof Error
					? error.stack ?? error.message
					: String( error );
			try {
				diagnostics.failure = await collectPhaseSnapshot(
					collaborationUtils.allPages,
					'failure'
				);
			} catch ( snapshotError ) {
				diagnostics.failure = {
					pageSnapshots: [
						{
							snapshotError:
								snapshotError instanceof Error
									? snapshotError.stack ??
									  snapshotError.message
									: String( snapshotError ),
						},
					],
					serverSnapshot: null,
				};
			}
			throw error;
		} finally {
			await testInfo.attach( 'rtc-search-pre-save-diagnostics', {
				body: JSON.stringify( diagnostics, null, 2 ),
				contentType: 'application/json',
			} );
		}
	} );
} );
