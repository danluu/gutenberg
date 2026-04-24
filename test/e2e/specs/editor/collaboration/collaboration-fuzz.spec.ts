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
		const laneLabel = process.env.GUTENBERG_RTC_LANE_LABEL ?? 'lane0';
		const uniqueSuffix = [
			laneLabel,
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtcfz${ uniqueSuffix }`,
			email: `rtcfz+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Fuzz',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

type Random = () => number;

type PageRef = {
	page: Page;
	userIndex: number;
};

type PageAction = {
	label: string;
	run: (
		page: Page,
		seed: number,
		step: number,
		userIndex: number,
		rng: Random,
		pages: PageRef[]
	) => Promise< void >;
};

const SEED_START = getEnvInt( 'GUTENBERG_RTC_BROWSER_SEED_START', 701 );
const SEED_COUNT = getEnvInt( 'GUTENBERG_RTC_BROWSER_SEED_COUNT', 3 );
const STEP_COUNT = getEnvInt( 'GUTENBERG_RTC_BROWSER_STEPS', 10 );
const CONVERGENCE_TIMEOUT_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS',
	15000
);
const DISCOVERY_TIMEOUT_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS',
	15000
);
const DISABLE_SYNC_FAULTS =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS === '1';
const DISABLE_RELOAD = process.env.GUTENBERG_RTC_BROWSER_DISABLE_RELOAD === '1';
const RETRIABLE_SYNC_FAILURE_STATUSES = [ 429, 500, 503 ];

function getEnvInt( name: string, fallback: number ): number {
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

function createRng( seed: number ): Random {
	/* eslint-disable no-bitwise */
	let state = seed >>> 0;

	return () => {
		state += 0x6d2b79f5;
		let next = state;
		next = Math.imul( next ^ ( next >>> 15 ), next | 1 );
		next ^= next + Math.imul( next ^ ( next >>> 7 ), next | 61 );
		return ( ( next ^ ( next >>> 14 ) ) >>> 0 ) / 4294967296;
	};
	/* eslint-enable no-bitwise */
}

function pick< T >( rng: Random, values: T[] ): T {
	return values[ Math.floor( rng() * values.length ) ];
}

function chooseMilestoneStep(
	rng: Random,
	stepCount: number,
	usedSteps: Set< number >
): number {
	const availableSteps = Array.from(
		{ length: stepCount },
		( _, index ) => index
	).filter( ( index ) => index > 0 && ! usedSteps.has( index ) );

	if ( availableSteps.length === 0 ) {
		return Math.max( 0, stepCount - 1 );
	}

	const step = pick( rng, availableSteps );
	usedSteps.add( step );
	return step;
}

function escapeHtml( value: string ): string {
	return value
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' );
}

function paragraph( content: string ): string {
	return `<!-- wp:paragraph -->\n<p>${ escapeHtml(
		content
	) }</p>\n<!-- /wp:paragraph -->`;
}

function heading( content: string, level = 2 ): string {
	const attributes = level === 2 ? '' : ` {"level":${ level }}`;
	return `<!-- wp:heading${ attributes } -->\n<h${ level } class="wp-block-heading">${ escapeHtml(
		content
	) }</h${ level }>\n<!-- /wp:heading -->`;
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

function quote( content: string, citation: string ): string {
	return `<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>${ escapeHtml(
		content
	) }</p><cite>${ escapeHtml(
		citation
	) }</cite></blockquote>\n<!-- /wp:quote -->`;
}

function group( blocks: string[] ): string {
	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">${ blocks.join(
		'\n'
	) }</div>\n<!-- /wp:group -->`;
}

function getInitialContent( seed: number ): string {
	switch ( seed % 4 ) {
		case 0:
			return [
				paragraph( `Seed ${ seed } baseline paragraph.` ),
				paragraph(
					`Seed ${ seed } keeps a second paragraph for deletes and moves.`
				),
				paragraph( 'Shared editing target paragraph.' ),
			].join( '\n' );
		case 1:
			return [
				heading( `Seed ${ seed } multibyte heading` ),
				paragraph(
					'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.'
				),
				paragraph(
					'Another paragraph exists so the top-level list is not degenerate.'
				),
			].join( '\n' );
		case 2:
			return [
				heading( `Seed ${ seed } structured content`, 3 ),
				group( [
					paragraph( 'Nested group paragraph alpha.' ),
					paragraph( 'Nested group paragraph beta.' ),
				] ),
				list( [
					'List item one for block movement.',
					'List item two for delete coverage.',
					'List item three for sync coverage.',
				] ),
				quote(
					'Quoted content for merge and persistence checks.',
					'RTC Fuzzer'
				),
			].join( '\n' );
		default:
			return [
				paragraph(
					'Long shared paragraph used as the initial collaborative editing surface.'
				),
				heading( 'Follow-up heading' ),
				paragraph(
					'Tail paragraph kept for save and reload stability checks.'
				),
			].join( '\n' );
	}
}

async function getTopLevelBlocks(
	page: Page
): Promise< Array< { clientId: string; name: string } > > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block: { clientId: string; name: string } ) => ( {
				clientId: block.clientId,
				name: block.name,
			} ) )
	);
}

async function insertParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random,
	{ append = false }: { append?: boolean } = {}
) {
	const blocks = await getTopLevelBlocks( page );
	const index = append
		? blocks.length
		: Math.floor( rng() * ( blocks.length + 1 ) );
	const content = `Seed ${ seed } step ${ step } user ${ userIndex } paragraph ${ Math.floor(
		rng() * 1000000
	) }`;

	await page.evaluate(
		( { blockIndex, blockContent } ) => {
			const block = ( window as any ).wp.blocks.createBlock(
				'core/paragraph',
				{
					content: blockContent,
				}
			);
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );
		},
		{ blockIndex: index, blockContent: content }
	);
}

async function insertHeading(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const level = pick( rng, [ 2, 3, 4 ] );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );
	const content = `Seed ${ seed } step ${ step } user ${ userIndex } heading`;

	await page.evaluate(
		( { blockContent, blockIndex, headingLevel } ) => {
			const block = ( window as any ).wp.blocks.createBlock(
				'core/heading',
				{
					content: blockContent,
					level: headingLevel,
				}
			);
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );
		},
		{
			blockContent: content,
			blockIndex: index,
			headingLevel: level,
		}
	);
}

async function editExistingParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const paragraphBlocks = blocks.filter(
		( block ) => block.name === 'core/paragraph'
	);

	if ( paragraphBlocks.length === 0 ) {
		await insertParagraph( page, seed, step, userIndex, rng );
		return;
	}

	const targetBlock = pick( rng, paragraphBlocks );

	await page.evaluate(
		( { clientId, content } ) => {
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					content,
				} );
		},
		{
			clientId: targetBlock.clientId,
			content: `Seed ${ seed } step ${ step } user ${ userIndex } updated paragraph ${ Math.floor(
				rng() * 1000000
			) }`,
		}
	);
}

async function deleteTopLevelBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );

	if ( blocks.length <= 1 ) {
		await insertParagraph( page, seed, step, userIndex, rng );
		return;
	}

	const targetBlock = pick( rng, blocks );

	await page.evaluate( ( { clientId } ) => {
		( window as any ).wp.data
			.dispatch( 'core/block-editor' )
			.removeBlocks( [ clientId ], false );
	}, targetBlock );
}

async function moveTopLevelBlock( page: Page, rng: Random ) {
	const blocks = await getTopLevelBlocks( page );

	if ( blocks.length < 2 ) {
		return;
	}

	const fromIndex = Math.floor( rng() * blocks.length );
	let toIndex = Math.floor( rng() * blocks.length );

	if ( toIndex === fromIndex ) {
		toIndex = ( toIndex + 1 ) % blocks.length;
	}

	await page.evaluate(
		( { clientId, blockIndex } ) => {
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.moveBlockToPosition( clientId, '', '', blockIndex );
		},
		{
			clientId: blocks[ fromIndex ].clientId,
			blockIndex: toIndex,
		}
	);
}

async function editTitle(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	await page.evaluate(
		( { title } ) => {
			( window as any ).wp.data
				.dispatch( 'core/editor' )
				.editPost( { title } );
		},
		{
			title: `RTC seed ${ seed } step ${ step } user ${ userIndex } title ${ Math.floor(
				rng() * 1000000
			) }`,
		}
	);
}

async function insertConcurrentParagraphs(
	pages: PageRef[],
	seed: number,
	step: number,
	rng: Random
) {
	const payloads = pages.map( ( { page, userIndex } ) => ( {
		page,
		content: `Seed ${ seed } step ${ step } user ${ userIndex } concurrent paragraph ${ Math.floor(
			rng() * 1000000
		) }`,
	} ) );

	await Promise.all(
		payloads.map( async ( { page, content } ) => {
			await page.evaluate(
				( { blockContent } ) => {
					const block = ( window as any ).wp.blocks.createBlock(
						'core/paragraph',
						{
							content: blockContent,
						}
					);
					( window as any ).wp.data
						.dispatch( 'core/block-editor' )
						.insertBlock( block );
				},
				{ blockContent: content }
			);
		} )
	);
}

async function saveDraft( page: Page ) {
	await page.evaluate( () => {
		( window as any ).wp.data.dispatch( 'core/editor' ).savePost();
	} );

	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: CONVERGENCE_TIMEOUT_MS }
	);
}

async function reloadAndWait(
	page: Page,
	collaborationUtils: CollaborationUtils
) {
	await page.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );
	await collaborationUtils.waitForMutualDiscovery( {
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );
}

const ACTIONS: PageAction[] = [
	{
		label: 'insert-paragraph',
		run: ( page, seed, step, userIndex, rng ) =>
			insertParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'append-paragraph',
		run: ( page, seed, step, userIndex, rng ) =>
			insertParagraph( page, seed, step, userIndex, rng, {
				append: true,
			} ),
	},
	{
		label: 'edit-paragraph',
		run: ( page, seed, step, userIndex, rng ) =>
			editExistingParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'delete-block',
		run: ( page, seed, step, userIndex, rng ) =>
			deleteTopLevelBlock( page, seed, step, userIndex, rng ),
	},
	{
		label: 'edit-title',
		run: ( page, seed, step, userIndex, rng ) =>
			editTitle( page, seed, step, userIndex, rng ),
	},
	{
		label: 'insert-heading',
		run: ( page, seed, step, userIndex, rng ) =>
			insertHeading( page, seed, step, userIndex, rng ),
	},
	{
		label: 'move-block',
		run: async ( page, _seed, _step, _userIndex, rng ) =>
			moveTopLevelBlock( page, rng ),
	},
	{
		label: 'concurrent-paragraphs',
		run: async ( _page, seed, step, _userIndex, rng, pages ) =>
			insertConcurrentParagraphs( pages, seed, step, rng ),
	},
];

test.describe( 'Collaboration - Seeded Fuzzing', () => {
	for ( let offset = 0; offset < SEED_COUNT; offset++ ) {
		const seed = SEED_START + offset;

		test( `seed ${ seed } converges under save, refresh, and sync faults`, async ( {
			collaboratorUser,
			collaborationUtils,
			requestUtils,
		} ) => {
			test.setTimeout( Math.max( 90000, STEP_COUNT * 15000 ) );

			const rng = createRng( seed );
			const post = await requestUtils.createPost( {
				title: `RTC seed ${ seed } initial title`,
				status: 'draft',
				date_gmt: new Date().toISOString(),
				content: getInitialContent( seed ),
			} );

			await collaborationUtils.openPost( post.id );
			await collaborationUtils.joinUser( post.id, collaboratorUser );
			await collaborationUtils.waitForMutualDiscovery( {
				timeout: DISCOVERY_TIMEOUT_MS,
			} );
			await collaborationUtils.waitForConvergence( {
				timeout: CONVERGENCE_TIMEOUT_MS,
			} );

			const pages = collaborationUtils.allPages.map(
				( page, userIndex ) => ( {
					page,
					userIndex,
				} )
			);
			const usedMilestones = new Set< number >();
			const saveStep = chooseMilestoneStep(
				rng,
				STEP_COUNT,
				usedMilestones
			);
			const reloadStep = DISABLE_RELOAD
				? -1
				: chooseMilestoneStep( rng, STEP_COUNT, usedMilestones );

			for ( let step = 0; step < STEP_COUNT; step++ ) {
				const actor = pick( rng, pages );
				const faultRoll = rng();

				if ( ! DISABLE_SYNC_FAULTS && faultRoll < 0.15 ) {
					await collaborationUtils.delayNextSyncRequest(
						actor.page,
						250 + Math.floor( rng() * 1250 )
					);
				} else if ( ! DISABLE_SYNC_FAULTS && faultRoll < 0.25 ) {
					// 403 is a semantic permission failure, not a transient sync
					// fault. The runtime correctly unregisters the room on 403,
					// so injecting it here only produces harness-level false
					// positives.
					await collaborationUtils.failNextSyncRequest(
						actor.page,
						pick( rng, RETRIABLE_SYNC_FAILURE_STATUSES )
					);
				}

				const action = pick( rng, ACTIONS );

				await test.step( `seed ${ seed } step ${ step } ${ action.label } user ${ actor.userIndex }`, async () => {
					await action.run(
						actor.page,
						seed,
						step,
						actor.userIndex,
						rng,
						pages
					);
				} );

				const state = await collaborationUtils.waitForConvergence( {
					timeout: CONVERGENCE_TIMEOUT_MS,
				} );
				expect( state.blocks.length ).toBeGreaterThan( 0 );

				let savedState = null;
				if ( step === saveStep ) {
					await saveDraft( pick( rng, pages ).page );
					savedState = await collaborationUtils.waitForConvergence( {
						includeCrdtDocument: true,
						timeout: CONVERGENCE_TIMEOUT_MS,
					} );
				}
				expect(
					step === saveStep ? savedState?.crdtDocument : true
				).not.toBeNull();

				let reloadedState = null;
				if ( step === reloadStep ) {
					await reloadAndWait(
						pick( rng, pages ).page,
						collaborationUtils
					);
					reloadedState = await collaborationUtils.waitForConvergence(
						{
							includeCrdtDocument: true,
							timeout: CONVERGENCE_TIMEOUT_MS,
						}
					);
				}
				expect(
					step === reloadStep ? reloadedState?.blocks.length : 1
				).toBeGreaterThan( 0 );
			}

			const finalState = await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: CONVERGENCE_TIMEOUT_MS,
			} );

			expect( finalState.title ).not.toBe( '' );
			expect( finalState.blocks.length ).toBeGreaterThan( 0 );
			expect( finalState.crdtDocument ).not.toBeNull();
		} );
	}
} );
