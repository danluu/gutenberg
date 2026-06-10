/**
 * External dependencies
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test,
	expect,
	type RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import {
	setAtomicSiteShimCookie,
	setCollaboration,
	USE_ATOMIC_SITE_SHIM,
	waitForAtomicSiteShimReady,
} from './fixtures/collaboration-utils';

type RestRenderedField = {
	raw?: string;
	rendered?: string;
};

type RestRevision = {
	id: number;
	title?: RestRenderedField | string;
	content?: RestRenderedField | string;
};

type RestPost = {
	id: number;
	title?: RestRenderedField | string;
	content?: RestRenderedField | string;
};

type MarkerGroup = {
	group: string;
	markers: string[];
};

const SEED_START = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_SEED_START',
	2600
);
const SEED_COUNT = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_SEED_COUNT',
	1
);
const CONVERGENCE_TIMEOUT_MS = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS',
	20000
);
const DISCOVERY_TIMEOUT_MS = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS',
	30000
);
const BEHAVIORAL_COVERAGE_FILENAME = 'rtc-behavioral-coverage.ndjson';
const GROUP_NAMES = [ 'first', 'second', 'third' ];

test.describe( 'Collaboration - list revision restore oracle fuzzing', () => {
	test.setTimeout(
		Math.max( 180000, CONVERGENCE_TIMEOUT_MS * 8 + DISCOVERY_TIMEOUT_MS )
	);

	for ( let index = 0; index < SEED_COUNT; index++ ) {
		const seed = SEED_START + index;

		test( `seed ${ seed } restores the saved list revision under RTC`, async ( {
			page,
			requestUtils,
		} ) => {
			const coverage = createCoverageRecord( seed );
			await setCollaboration( requestUtils, true );
			coverage.phases.push( 'rtc-enabled' );

			const post = await requestUtils.createPost( {
				title: `RTC list revision oracle seed ${ seed }`,
				content: getInitialContent( seed ),
				status: 'draft',
			} );
			coverage.postId = post.id;

			await setAtomicSiteShimCookie( page );
			await openPostEditor( page, post.id );
			await waitForEditorReady( page, { rtcEnabled: true } );
			await assertListSentinels( page, seed, 'initial-editor' );

			const oldCheckpoint = getCheckpointMarkers( seed, 'old' );
			await appendCheckpointBlocks( page, oldCheckpoint );
			await saveDraft( page );
			const oldRevision = await findRevisionContainingMarker(
				requestUtils,
				post.id,
				oldCheckpoint.paragraph
			);
			const expectedTitle = getRawFieldValue( oldRevision.title );
			const expectedContent = getRawFieldValue( oldRevision.content );
			const expectedCanonicalContent = await getCanonicalPostContent(
				page,
				expectedContent
			);
			coverage.oldRevisionId = oldRevision.id;
			coverage.phases.push( 'old-revision-saved' );

			const laterCheckpoint = getCheckpointMarkers( seed, 'later' );
			const replacement = await replaceSentinelListItem( page, seed );
			await appendListIndentBlocks( page, seed );
			await appendCheckpointBlocks( page, laterCheckpoint );
			await saveDraft( page );
			const laterRevision = await findRevisionContainingMarker(
				requestUtils,
				post.id,
				laterCheckpoint.paragraph
			);
			coverage.laterRevisionId = laterRevision.id;
			coverage.replacement = replacement;
			coverage.phases.push( 'later-list-replacement-saved' );

			await restorePostToRevision( requestUtils, post.id, oldRevision );
			const persistedAfterRestore = await getPersistedPost(
				requestUtils,
				post.id
			);
			expect(
				await getCanonicalPostContent(
					page,
					getRawFieldValue( persistedAfterRestore.content )
				),
				'REST restore should make the old revision the persisted baseline before the RTC editor reloads.'
			).toBe( expectedCanonicalContent );
			coverage.phases.push( 'rest-restore-persisted' );

			await page.reload( { waitUntil: 'domcontentloaded' } );
			await waitForEditorReady( page, { rtcEnabled: true } );
			await waitForEditedContentMarker( page, oldCheckpoint.paragraph );

			const editedCanonicalContent =
				await getCanonicalEditedPostContent( page );
			const editedTitle = await getEditedPostTitle( page );
			assertMatchesExpectedRevision( {
				actualContent: editedCanonicalContent,
				actualTitle: editedTitle,
				expectedContent: expectedCanonicalContent,
				expectedTitle,
				markers: [
					oldCheckpoint.paragraph,
					oldCheckpoint.search,
					laterCheckpoint.paragraph,
					laterCheckpoint.search,
					replacement.targetMarker,
					replacement.sourceMarker,
					replacement.laterMarker,
				],
				phase: 'rtc-editor-after-restore-reload',
			} );
			await assertListSentinels( page, seed, 'rtc-editor-after-restore' );
			coverage.phases.push( 'rtc-editor-matched-restored-revision' );

			await saveDraft( page );
			const persistedAfterRtcSave = await getPersistedPost(
				requestUtils,
				post.id
			);
			const persistedCanonicalContent = await getCanonicalPostContent(
				page,
				getRawFieldValue( persistedAfterRtcSave.content )
			);
			assertMatchesExpectedRevision( {
				actualContent: persistedCanonicalContent,
				actualTitle: getRawFieldValue( persistedAfterRtcSave.title ),
				expectedContent: expectedCanonicalContent,
				expectedTitle,
				markers: [
					oldCheckpoint.paragraph,
					oldCheckpoint.search,
					laterCheckpoint.paragraph,
					laterCheckpoint.search,
					replacement.targetMarker,
					replacement.sourceMarker,
					replacement.laterMarker,
				],
				phase: 'persisted-after-rtc-save',
			} );
			coverage.phases.push( 'persisted-matched-restored-revision' );

			await writeCoverageRecord( coverage );
		} );
	}
} );

function getPositiveIntegerEnv( name: string, fallback: number ): number {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return fallback;
	}

	const parsedValue = Number.parseInt( rawValue, 10 );

	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive integer.` );
	}

	return parsedValue;
}

function createCoverageRecord( seed: number ) {
	return {
		actionProfile: 'list-revision-restore-oracle',
		atomicSiteShim: USE_ATOMIC_SITE_SHIM,
		oracle: 'restored-revision-vs-rtc-editor',
		seed,
		phases: [] as string[],
		postId: undefined as number | undefined,
		oldRevisionId: undefined as number | undefined,
		laterRevisionId: undefined as number | undefined,
		replacement: undefined as
			| Awaited< ReturnType< typeof replaceSentinelListItem > >
			| undefined,
	};
}

function escapeHtml( value: string ): string {
	return value
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' );
}

function heading( content: string, level = 2 ): string {
	return `<!-- wp:heading {"level":${ level }} -->\n<h${ level } class="wp-block-heading">${ escapeHtml(
		content
	) }</h${ level }>\n<!-- /wp:heading -->`;
}

function paragraph( content: string ): string {
	return `<!-- wp:paragraph -->\n<p>${ escapeHtml(
		content
	) }</p>\n<!-- /wp:paragraph -->`;
}

function list( items: string[] ): string {
	const inner = items
		.map(
			( item ) =>
				`<!-- wp:list-item -->\n<li>${ escapeHtml(
					item
				) }</li>\n<!-- /wp:list-item -->`
		)
		.join( '\n' );

	return `<!-- wp:list -->\n<ul class="wp-block-list">${ inner }</ul>\n<!-- /wp:list -->`;
}

function getMarkerGroups( seed: number ): MarkerGroup[] {
	return GROUP_NAMES.map( ( markerGroup ) => ( {
		group: markerGroup,
		markers: [ 1, 2, 3 ].map(
			( itemIndex ) =>
				`rtc-list-${ seed }-${ markerGroup }-${ itemIndex }`
		),
	} ) );
}

function getInitialContent( seed: number ): string {
	const groups = getMarkerGroups( seed );

	return [
		heading( `RTC list revision oracle seed ${ seed }`, 3 ),
		paragraph(
			`The next three lists are independent sentinels for seed ${ seed }.`
		),
		...groups.flatMap( ( markerGroup, groupIndex ) => [
			paragraph(
				`Before ${ markerGroup.group } sentinel list ${ seed }.`
			),
			list(
				markerGroup.markers.map(
					( marker, itemIndex ) =>
						`${ marker } ${ markerGroup.group } item ${
							itemIndex + 1
						}`
				)
			),
			groupIndex === groups.length - 1
				? paragraph(
						`After ${ markerGroup.group } sentinel list ${ seed }.`
				  )
				: paragraph(
						`Between ${ markerGroup.group } and ${
							groups[ groupIndex + 1 ].group
						} sentinel lists ${ seed }.`
				  ),
		] ),
	].join( '\n' );
}

function getCheckpointMarkers( seed: number, label: 'old' | 'later' ) {
	return {
		paragraph: `rtc-oracle-${ label }-paragraph-${ seed }`,
		search: `rtc-oracle-${ label }-search-${ seed }`,
	};
}

async function openPostEditor( page: Page, postId: number ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit`, {
		waitUntil: 'domcontentloaded',
	} );
}

async function waitForEditorReady(
	page: Page,
	{ rtcEnabled }: { rtcEnabled: boolean }
) {
	await page.waitForFunction(
		() => {
			const wp = ( window as any ).wp;
			const editor = wp?.data?.select?.( 'core/editor' );
			return Boolean(
				wp?.blocks &&
					editor?.getCurrentPostId?.() &&
					wp?.data?.select?.( 'core/block-editor' )?.getBlocks
			);
		},
		undefined,
		{ timeout: DISCOVERY_TIMEOUT_MS }
	);

	if ( rtcEnabled ) {
		await page.waitForFunction(
			() => ( window as any )._wpCollaborationEnabled === true,
			undefined,
			{ timeout: DISCOVERY_TIMEOUT_MS }
		);
	}

	await waitForAtomicSiteShimReady( page );
}

async function appendCheckpointBlocks(
	page: Page,
	markers: ReturnType< typeof getCheckpointMarkers >
) {
	await appendBlocks( page, [
		{
			name: 'core/paragraph',
			attributes: { content: markers.paragraph },
		},
		{
			name: 'core/search',
			attributes: {
				buttonPosition: 'button-inside',
				buttonText: `Find ${ markers.search }`,
				label: `Search label ${ markers.search }`,
				placeholder: `Search placeholder ${ markers.search }`,
			},
		},
	] );
	await waitForEditedContentMarker( page, markers.paragraph );
	await waitForEditedContentMarker( page, markers.search );
}

async function appendListIndentBlocks( page: Page, seed: number ) {
	const marker = `rtc-oracle-later-list-indent-${ seed }`;
	await appendBlocks( page, [
		{
			name: 'core/list',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/list-item',
					attributes: { content: `${ marker } parent` },
					innerBlocks: [
						{
							name: 'core/list',
							attributes: {},
							innerBlocks: [
								{
									name: 'core/list-item',
									attributes: {
										content: `${ marker } child`,
									},
								},
							],
						},
					],
				},
			],
		},
	] );
	await waitForEditedContentMarker( page, marker );
}

async function appendBlocks( page: Page, blockSpecs: Record< string, any >[] ) {
	await page.evaluate( ( specs ) => {
		const wp = ( window as any ).wp;
		const toBlock = ( spec: Record< string, any > ) =>
			wp.blocks.createBlock(
				spec.name,
				spec.attributes ?? {},
				( spec.innerBlocks ?? [] ).map( toBlock )
			);
		const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
		const newBlocks = specs.map( toBlock );
		wp.data
			.dispatch( 'core/block-editor' )
			.resetBlocks( [ ...blocks, ...newBlocks ] );
	}, blockSpecs );
}

async function replaceSentinelListItem( page: Page, seed: number ) {
	const targetGroupIndex = seed % GROUP_NAMES.length;
	const sourceGroupIndex = ( targetGroupIndex + 1 ) % GROUP_NAMES.length;
	const targetItemIndex = ( seed % 3 ) + 1;
	const sourceItemIndex = ( ( seed + 1 ) % 3 ) + 1;
	const targetGroup = GROUP_NAMES[ targetGroupIndex ];
	const sourceGroup = GROUP_NAMES[ sourceGroupIndex ];
	const targetMarker = `rtc-list-${ seed }-${ targetGroup }-${ targetItemIndex }`;
	const sourceMarker = `rtc-list-${ seed }-${ sourceGroup }-${ sourceItemIndex }`;
	const laterMarker = `rtc-oracle-later-replacement-${ seed }`;
	const replacementContent = `${ sourceMarker } ${ laterMarker } copied over ${ targetMarker }`;

	await page.evaluate(
		( { content, target }: { content: string; target: string } ) => {
			const wp = ( window as any ).wp;
			const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
			const stack = [ ...blocks ];

			while ( stack.length ) {
				const block = stack.shift();
				if (
					block?.name === 'core/list-item' &&
					String( block.attributes?.content ?? '' ).includes( target )
				) {
					wp.data
						.dispatch( 'core/block-editor' )
						.updateBlockAttributes( block.clientId, { content } );
					return;
				}
				stack.push( ...( block?.innerBlocks ?? [] ) );
			}

			throw new Error( `Could not find sentinel list item ${ target }.` );
		},
		{ content: replacementContent, target: targetMarker }
	);
	await waitForEditedContentMarker( page, laterMarker );

	return {
		targetMarker,
		sourceMarker,
		laterMarker,
		replacementContent,
	};
}

async function waitForEditedContentMarker( page: Page, marker: string ) {
	await expect
		.poll( () => getEditedPostContent( page ), {
			message: `expected edited post content to contain ${ marker }`,
			timeout: CONVERGENCE_TIMEOUT_MS,
		} )
		.toContain( marker );
}

async function saveDraft( page: Page ) {
	await page.evaluate( () => {
		( window as any ).wp.data.dispatch( 'core/editor' ).savePost();
	} );

	await page.waitForFunction(
		() => {
			const editor = ( window as any ).wp.data.select( 'core/editor' );
			return ! (
				editor.isSavingPost?.() || editor.isEditedPostSaving?.()
			);
		},
		undefined,
		{ timeout: CONVERGENCE_TIMEOUT_MS }
	);
}

async function getEditedPostContent( page: Page ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data.select( 'core/editor' ).getEditedPostContent()
	);
}

async function getEditedPostTitle( page: Page ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' )
	);
}

async function getCanonicalPostContent(
	page: Page,
	content: string
): Promise< string > {
	return page.evaluate( ( postContent ) => {
		const wp = ( window as any ).wp;
		return wp.blocks.serialize( wp.blocks.parse( postContent ?? '' ) );
	}, content );
}

async function getCanonicalEditedPostContent( page: Page ): Promise< string > {
	return getCanonicalPostContent( page, await getEditedPostContent( page ) );
}

async function getPersistedPost(
	requestUtils: RequestUtils,
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'id,title.raw,content.raw',
		},
	} );
}

async function getPostRevisions(
	requestUtils: RequestUtils,
	postId: number
): Promise< RestRevision[] > {
	return requestUtils.rest< RestRevision[] >( {
		path: `/wp/v2/posts/${ postId }/revisions`,
		params: {
			context: 'edit',
			per_page: 100,
			_fields: 'id,date,title.raw,content.raw',
		},
	} );
}

async function findRevisionContainingMarker(
	requestUtils: RequestUtils,
	postId: number,
	marker: string
): Promise< RestRevision > {
	for ( let attempt = 0; attempt < 10; attempt++ ) {
		const revision = (
			await getPostRevisions( requestUtils, postId )
		).find( ( candidate ) =>
			getRawFieldValue( candidate.content ).includes( marker )
		);

		if ( revision ) {
			return revision;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 500 ) );
	}

	throw new Error(
		`Could not find a revision containing ${ marker } for post ${ postId }.`
	);
}

async function restorePostToRevision(
	requestUtils: RequestUtils,
	postId: number,
	revision: RestRevision
) {
	await requestUtils.rest( {
		method: 'POST',
		path: `/wp/v2/posts/${ postId }`,
		data: {
			content: getRawFieldValue( revision.content ),
			status: 'draft',
			title: getRawFieldValue( revision.title ),
		},
	} );
}

function getRawFieldValue( field?: RestRenderedField | string ): string {
	if ( typeof field === 'string' ) {
		return field;
	}

	return field?.raw ?? field?.rendered ?? '';
}

async function assertListSentinels( page: Page, seed: number, phase: string ) {
	const snapshot = await page.evaluate( ( markerSeed ) => {
		const wp = ( window as any ).wp;
		const content = wp.data.select( 'core/editor' ).getEditedPostContent();
		const groups = [ 'first', 'second', 'third' ].map(
			( markerGroup ) => ( {
				group: markerGroup,
				markers: [ 1, 2, 3 ].map(
					( itemIndex ) =>
						`rtc-list-${ markerSeed }-${ markerGroup }-${ itemIndex }`
				),
			} )
		);
		const markerCounts = Object.fromEntries(
			groups.flatMap( ( markerGroup ) =>
				markerGroup.markers.map( ( marker ) => [
					marker,
					content.split( marker ).length - 1,
				] )
			)
		);
		const listBlocks: string[][] = [];
		const visit = ( blocks: any[] ) => {
			for ( const block of blocks ) {
				if ( block.name === 'core/list' ) {
					const serialized = wp.blocks.serialize( [ block ] );
					listBlocks.push(
						groups
							.filter( ( markerGroup ) =>
								markerGroup.markers.some( ( marker ) =>
									serialized.includes( marker )
								)
							)
							.map( ( markerGroup ) => markerGroup.group )
					);
				}
				visit( block.innerBlocks ?? [] );
			}
		};
		visit( wp.data.select( 'core/block-editor' ).getBlocks() );
		return { listBlocks, markerCounts };
	}, seed );
	const countFailures = Object.entries( snapshot.markerCounts )
		.filter( ( [ , count ] ) => count !== 1 )
		.map( ( [ marker, count ] ) => `${ marker }:${ count }` );
	const mixedListFailures = snapshot.listBlocks
		.filter( ( groups ) => new Set( groups ).size > 1 )
		.map( ( groups ) => groups.join( '+' ) );

	expect(
		[ ...countFailures, ...mixedListFailures ],
		`${ phase } list sentinel invariant failed: ${ JSON.stringify(
			snapshot
		) }`
	).toEqual( [] );
}

function assertMatchesExpectedRevision( {
	actualContent,
	actualTitle,
	expectedContent,
	expectedTitle,
	markers,
	phase,
}: {
	actualContent: string;
	actualTitle: string;
	expectedContent: string;
	expectedTitle: string;
	markers: string[];
	phase: string;
} ) {
	expect(
		actualTitle,
		`${ phase } title should match restored revision.`
	).toBe( expectedTitle );
	expect(
		actualContent,
		`${ phase } content should match restored revision.\n${ summarizeMismatch(
			expectedContent,
			actualContent,
			markers
		) }`
	).toBe( expectedContent );
}

function summarizeMismatch(
	expectedContent: string,
	actualContent: string,
	markers: string[]
) {
	const firstDiffIndex = findFirstDiffIndex( expectedContent, actualContent );
	const start = Math.max( 0, firstDiffIndex - 180 );
	const end = firstDiffIndex + 180;

	return JSON.stringify(
		{
			expectedHash: hashContent( expectedContent ),
			actualHash: hashContent( actualContent ),
			firstDiffIndex,
			expectedSnippet: expectedContent.slice( start, end ),
			actualSnippet: actualContent.slice( start, end ),
			markerCounts: Object.fromEntries(
				markers.map( ( marker ) => [
					marker,
					{
						expected: countOccurrences( expectedContent, marker ),
						actual: countOccurrences( actualContent, marker ),
					},
				] )
			),
		},
		null,
		2
	);
}

function findFirstDiffIndex( expectedContent: string, actualContent: string ) {
	const maxLength = Math.max( expectedContent.length, actualContent.length );

	for ( let index = 0; index < maxLength; index++ ) {
		if ( expectedContent[ index ] !== actualContent[ index ] ) {
			return index;
		}
	}

	return -1;
}

function countOccurrences( value: string, marker: string ) {
	return value.split( marker ).length - 1;
}

function hashContent( value: string ) {
	return crypto.createHash( 'sha256' ).update( value ).digest( 'hex' );
}

async function writeCoverageRecord(
	record: ReturnType< typeof createCoverageRecord >
) {
	const artifactsPath = process.env.WP_ARTIFACTS_PATH;

	if ( ! artifactsPath ) {
		return;
	}

	await fs.mkdir( artifactsPath, { recursive: true } );
	await fs.appendFile(
		path.join( artifactsPath, BEHAVIORAL_COVERAGE_FILENAME ),
		`${ JSON.stringify( record ) }\n`
	);
}
