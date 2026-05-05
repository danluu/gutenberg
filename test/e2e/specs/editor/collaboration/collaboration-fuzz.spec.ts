/**
 * External dependencies
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Locator, Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

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

const ADMIN_USER: UserCredentials = {
	username: process.env.WP_USERNAME ?? 'admin',
	email: 'wordpress@example.com',
	firstName: 'Admin',
	lastName: 'User',
	password: process.env.WP_PASSWORD ?? 'password',
	roles: [ 'administrator' ],
};

const COLLABORATOR_MODE =
	process.env.GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE ?? 'distinct-user';
const COLLABORATOR_ROLES = (
	process.env.GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES ?? 'editor'
)
	.split( ',' )
	.map( ( role ) => role.trim() )
	.filter( Boolean );

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
		if ( COLLABORATOR_MODE === 'same-user' ) {
			await use( ADMIN_USER );
			return;
		}

		if ( COLLABORATOR_MODE !== 'distinct-user' ) {
			throw new Error(
				`Unknown GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE "${ COLLABORATOR_MODE }".`
			);
		}

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
			roles: COLLABORATOR_ROLES,
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

type Random = () => number;

type PageRef = {
	editor: Editor;
	page: Page;
	userIndex: number;
};

type RestRequestUtils = {
	rest: < T = unknown >( options: {
		data?: Record< string, unknown >;
		method?: string;
		params?:
			| string
			| Record< string, string | number | boolean >
			| URLSearchParams;
		path: string;
	} ) => Promise< T >;
};

type RestRenderedField = {
	raw?: string;
	rendered?: string;
};

type RestPost = {
	content?: RestRenderedField | string;
	id: number;
	meta?: {
		_crdt_document?: string | null;
	};
	title?: RestRenderedField | string;
};

type RestRevision = {
	content?: RestRenderedField | string;
	date?: string;
	id: number;
	title?: RestRenderedField | string;
};

type CreatedUser = {
	id: number;
};

type UserCreatingRequestUtils = RestRequestUtils & {
	createUser: ( user: UserCredentials ) => Promise< CreatedUser >;
};

type SaveCheckpoint = {
	content: string;
	marker: string;
	optionMarker: string;
	revisionId: number;
	step: number;
	titleMarker: string;
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

type BehaviorActionTrace = {
	label: string;
	step: number;
	userIndex: number;
};

type BehaviorFaultTrace = {
	delayMs?: number;
	status?: number;
	step: number;
	type: 'delay' | 'fail';
	userIndex: number;
};

type BehaviorCoverage = {
	actionProfile: string;
	actions: BehaviorActionTrace[];
	blockStats?: ReturnType< typeof getBlockStats >;
	cdpCoverage?: CdpCoverageSummary;
	collaboratorMode: string;
	disableParserStress: boolean;
	disableReload: boolean;
	disableRevisionRestore: boolean;
	disableSyncFaults: boolean;
	error?: string;
	extraCollaborators: number;
	faults: BehaviorFaultTrace[];
	initialContentProfile: string;
	laneLabel: string;
	lifecycleEvents: Array< {
		step: number;
		type: string;
		userCount: number;
	} >;
	reloadStep: number;
	reloads: Array< {
		step: number;
		userIndex: number;
	} >;
	revisionRestore: {
		eligible: boolean;
		enabled: boolean;
	};
	saveCheckpointSteps: Array< {
		step: number;
		userIndex: number;
	} >;
	seed: number;
	status: 'passed' | 'failed';
	stepCount: number;
	transport: 'http' | 'ws';
	userCount: number;
};

type CdpSession = {
	detach: () => Promise< void >;
	send: (
		method: string,
		params?: Record< string, unknown >
	) => Promise< any >;
};

type CdpCoverageSummary = {
	coveredFunctionCount: number;
	coveredRangeCount: number;
	hash: string;
	scriptCount: number;
};

const SEED_START = getEnvInt( 'GUTENBERG_RTC_BROWSER_SEED_START', 701 );
const SEED_COUNT = getEnvInt( 'GUTENBERG_RTC_BROWSER_SEED_COUNT', 3 );
const SEEDS = getEnvIntList( 'GUTENBERG_RTC_BROWSER_SEEDS' );
const STEP_COUNT = getEnvInt( 'GUTENBERG_RTC_BROWSER_STEPS', 10 );
const CONVERGENCE_TIMEOUT_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS',
	15000
);
const DISCOVERY_TIMEOUT_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS',
	15000
);
const SESSION_SETTLE_TIMEOUT_MS = Math.max(
	CONVERGENCE_TIMEOUT_MS,
	DISCOVERY_TIMEOUT_MS
);
const DISABLE_SYNC_FAULTS =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS === '1';
const DISABLE_RELOAD = process.env.GUTENBERG_RTC_BROWSER_DISABLE_RELOAD === '1';
const DISABLE_REVISION_RESTORE =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE === '1';
const ENABLE_REVISION_RESTORE_PROBE =
	! DISABLE_REVISION_RESTORE &&
	( process.env.GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE ??
		process.env.GUTENBERG_RTC_BROWSER_ENABLE_REST_REVISION_RESTORE_PROBE ??
		'1' ) === '1';
const ACTION_PROFILE =
	process.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ?? 'full';
const DISABLE_PARSER_STRESS =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS === '1';
const EXTRA_COLLABORATOR_COUNT = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS',
	ACTION_PROFILE === 'session-lifecycle' ? 1 : 0
);
const ENABLE_LIFECYCLE_EVENTS =
	process.env.GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS === '1' ||
	ACTION_PROFILE === 'session-lifecycle';
const COLLECT_CDP_COVERAGE =
	process.env.GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE === '1';
const BEHAVIORAL_COVERAGE_FILENAME = 'rtc-behavioral-coverage.ndjson';
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

function getEnvNonNegativeInt( name: string, fallback: number ): number {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return fallback;
	}

	const parsedValue = Number.parseInt( rawValue, 10 );

	if ( Number.isNaN( parsedValue ) || parsedValue < 0 ) {
		throw new Error( `Expected ${ name } to be a non-negative integer.` );
	}

	return parsedValue;
}

function getEnvIntList( name: string ): number[] | null {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return null;
	}

	const values = rawValue
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean )
		.map( ( value ) => Number.parseInt( value, 10 ) );

	if (
		values.length === 0 ||
		values.some( ( value ) => ! Number.isFinite( value ) )
	) {
		throw new Error(
			`${ name } must be a comma-separated list of numbers.`
		);
	}

	return [ ...new Set( values ) ];
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

function getTransport(): 'http' | 'ws' {
	return process.env.GUTENBERG_RTC_TEST_WS_PROVIDER === '1' ? 'ws' : 'http';
}

function getInitialContentProfile( seed: number ): string {
	if (
		DISABLE_PARSER_STRESS ||
		ACTION_PROFILE === 'persistence' ||
		ACTION_PROFILE === 'persistence-no-title'
	) {
		return `base-${ seed % 4 }`;
	}

	switch ( seed % 6 ) {
		case 1:
			return 'html-entity-reference';
		case 2:
			return 'deprecated-block-content';
		case 3:
			return 'validation-fix-content';
		case 4:
			return 'equivalent-html-content';
		case 5:
			return 'freeform-parser-content';
		default:
			return `base-${ seed % 4 }`;
	}
}

function createBehaviorCoverage( seed: number ): BehaviorCoverage {
	return {
		actionProfile: ACTION_PROFILE,
		actions: [],
		collaboratorMode: COLLABORATOR_MODE,
		disableParserStress: DISABLE_PARSER_STRESS,
		disableReload: DISABLE_RELOAD,
		disableRevisionRestore: DISABLE_REVISION_RESTORE,
		disableSyncFaults: DISABLE_SYNC_FAULTS,
		extraCollaborators: EXTRA_COLLABORATOR_COUNT,
		faults: [],
		initialContentProfile: getInitialContentProfile( seed ),
		laneLabel: process.env.GUTENBERG_RTC_LANE_LABEL ?? 'unknown',
		lifecycleEvents: [],
		reloadStep: -1,
		reloads: [],
		revisionRestore: {
			eligible: false,
			enabled: ENABLE_REVISION_RESTORE_PROBE,
		},
		saveCheckpointSteps: [],
		seed,
		status: 'failed',
		stepCount: STEP_COUNT,
		transport: getTransport(),
		userCount: 0,
	};
}

function getBlockStats( blocks: Array< any > ) {
	const counts: Record< string, number > = {};
	let totalBlocks = 0;
	let maxDepth = 0;

	const visit = ( currentBlocks: Array< any >, depth: number ) => {
		maxDepth = Math.max( maxDepth, depth );

		for ( const block of currentBlocks ) {
			totalBlocks += 1;
			counts[ block.name ] = ( counts[ block.name ] ?? 0 ) + 1;
			visit( block.innerBlocks ?? [], depth + 1 );
		}
	};

	visit( blocks, 0 );

	return {
		counts,
		maxDepth,
		totalBlocks,
		types: Object.keys( counts ).sort(),
	};
}

async function writeBehaviorCoverage( coverage: BehaviorCoverage ) {
	const artifactsPath = process.env.WP_ARTIFACTS_PATH;

	if ( ! artifactsPath ) {
		return;
	}

	await fs.mkdir( artifactsPath, { recursive: true } );
	const record = {
		...coverage,
		recordedAt: new Date().toISOString(),
	};
	const line = JSON.stringify( record ) + '\n';
	await fs.appendFile(
		path.join( artifactsPath, BEHAVIORAL_COVERAGE_FILENAME ),
		line
	);
	await fs.writeFile(
		path.join(
			artifactsPath,
			`rtc-behavioral-coverage-${ coverage.seed }.json`
		),
		JSON.stringify( record, null, 2 ) + '\n'
	);
}

async function startCdpCoverage( pages: PageRef[] ): Promise< CdpSession[] > {
	if ( ! COLLECT_CDP_COVERAGE ) {
		return [];
	}

	const sessions: CdpSession[] = [];

	for ( const { page } of pages ) {
		const session = await page.context().newCDPSession( page );
		await session.send( 'Profiler.enable' );
		await session.send( 'Profiler.startPreciseCoverage', {
			callCount: false,
			detailed: false,
		} );
		sessions.push( session );
	}

	return sessions;
}

async function stopCdpCoverage(
	sessions: CdpSession[]
): Promise< CdpCoverageSummary | undefined > {
	if ( sessions.length === 0 ) {
		return undefined;
	}

	const keys: string[] = [];
	let scriptCount = 0;
	let coveredFunctionCount = 0;
	let coveredRangeCount = 0;

	for ( const session of sessions ) {
		try {
			const result = await session.send( 'Profiler.takePreciseCoverage' );

			for ( const script of result.result ?? [] ) {
				const url = script.url ?? '';

				if (
					! url.includes( '/wp-content/' ) &&
					! url.includes( '/wp-includes/' )
				) {
					continue;
				}

				let scriptCovered = false;
				for ( const fn of script.functions ?? [] ) {
					const coveredRanges = ( fn.ranges ?? [] ).filter(
						( range: { count?: number } ) =>
							( range.count ?? 0 ) > 0
					);

					if ( coveredRanges.length === 0 ) {
						continue;
					}

					scriptCovered = true;
					coveredFunctionCount += 1;
					coveredRangeCount += coveredRanges.length;
					keys.push(
						`${ url }#${ fn.functionName ?? '' }#${ coveredRanges
							.map(
								( range: {
									endOffset?: number;
									startOffset?: number;
								} ) =>
									`${ range.startOffset ?? 0 }-${
										range.endOffset ?? 0
									}`
							)
							.join( ',' ) }`
					);
				}

				if ( scriptCovered ) {
					scriptCount += 1;
				}
			}
		} finally {
			await session
				.send( 'Profiler.stopPreciseCoverage' )
				.catch( () => {} );
			await session.detach().catch( () => {} );
		}
	}

	const hash = crypto
		.createHash( 'sha256' )
		.update( keys.sort().join( '\n' ) )
		.digest( 'hex' )
		.slice( 0, 16 );

	return {
		coveredFunctionCount,
		coveredRangeCount,
		hash,
		scriptCount,
	};
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

function chooseMilestoneSteps(
	rng: Random,
	stepCount: number,
	usedSteps: Set< number >,
	count: number
): Set< number > {
	const steps = new Set< number >();

	for ( let index = 0; index < count; index++ ) {
		steps.add( chooseMilestoneStep( rng, stepCount, usedSteps ) );
	}

	return steps;
}

function escapeHtml( value: string ): string {
	return value
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' );
}

function blockDelimiter(
	name: string,
	attributes: Record< string, unknown > = {}
): string {
	const serializedAttributes = Object.keys( attributes ).length
		? ` ${ JSON.stringify( attributes ) }`
		: '';

	return `<!-- wp:${ name }${ serializedAttributes } -->`;
}

function paragraph( content: string ): string {
	return `<!-- wp:paragraph -->\n<p>${ escapeHtml(
		content
	) }</p>\n<!-- /wp:paragraph -->`;
}

function rawParagraph(
	innerHTML: string,
	attributes: Record< string, unknown > = {}
): string {
	return `${ blockDelimiter(
		'paragraph',
		attributes
	) }\n<p>${ innerHTML }</p>\n<!-- /wp:paragraph -->`;
}

function heading( content: string, level = 2 ): string {
	const attributes = level === 2 ? '' : ` {"level":${ level }}`;
	return `<!-- wp:heading${ attributes } -->\n<h${ level } class="wp-block-heading">${ escapeHtml(
		content
	) }</h${ level }>\n<!-- /wp:heading -->`;
}

function rawHeading(
	innerHTML: string,
	level = 2,
	attributes: Record< string, unknown > = {}
): string {
	const headingAttributes =
		level === 2 ? attributes : { ...attributes, level };

	return `${ blockDelimiter(
		'heading',
		headingAttributes
	) }\n<h${ level } class="wp-block-heading">${ innerHTML }</h${ level }>\n<!-- /wp:heading -->`;
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

function htmlEntityReferenceContent( seed: number ): string {
	const textVariants = [
		`Seed ${ seed } refs: AT&amp T, AT&amp;T, copy &copy 2026, reg &reg , decimal &#38 , hex &#x26 and escaped tags &lt;em&gt;text&lt;/em&gt;.`,
		`Seed ${ seed } ambiguous refs: &notin; / &notin text, nbsp &nbsp gap, quote &quot;value&quot;, apos &apos;value&apos;, lt &lt and gt &gt.`,
	];
	const linkVariants = [
		`<a href="https://example.test/search?q=alpha&amp;beta=2&amp-gamma=3&#38-delta=4&#x26-epsilon=5" title="A&amp B &copy 2026 &#34 quoted&#34;">attribute refs</a>`,
		`<a href="https://example.test/path?name=Tom&amp;mode=rich&#x26-debug=1" aria-label="Tom &amp Jerry &copy 2026">aria refs</a>`,
	];

	return [
		rawParagraph(
			`${ pick( createRng( seed + 11 ), textVariants ) } ${ pick(
				createRng( seed + 17 ),
				linkVariants
			) }`
		),
		rawHeading(
			`Heading refs &amp optional &copy ${ seed } with &#x26; hex`,
			3
		),
	].join( '\n' );
}

function deprecatedBlockContent( seed: number ): string {
	return [
		`${ blockDelimiter( 'paragraph', {
			align: 'center',
		} ) }\n<p class="has-text-align-center">Deprecated centered paragraph ${ seed } with &amp; entity.</p>\n<!-- /wp:paragraph -->`,
		`${ blockDelimiter( 'heading', {
			align: 'right',
			level: 3,
		} ) }\n<h3 class="has-text-align-right">Deprecated heading ${ seed }</h3>\n<!-- /wp:heading -->`,
		`${ blockDelimiter(
			'list'
		) }\n<ul class="wp-block-list"><li>Deprecated list ${ seed } alpha</li><li>Deprecated list beta &amp; item</li></ul>\n<!-- /wp:list -->`,
		`${ blockDelimiter( 'quote', {
			align: 'center',
		} ) }\n<blockquote class="wp-block-quote has-text-align-center"><p>Deprecated quote ${ seed }</p><cite>Older save</cite></blockquote>\n<!-- /wp:quote -->`,
		`${ blockDelimiter( 'separator', {
			customColor: '#335577',
		} ) }\n<hr class="wp-block-separator has-text-color has-background" style="background-color:#335577;color:#335577" />\n<!-- /wp:separator -->`,
	].join( '\n' );
}

function validationFixContent( seed: number ): string {
	return [
		'<!-- wp:heading -->',
		`<h2 id="fuzz-heading-anchor-${ seed }" class="wp-block-heading fuzz-heading-class-${ seed }">Heading needing root fixes ${ seed }</h2>`,
		'<!-- /wp:heading -->',
		'<!-- wp:paragraph -->',
		`<p id="fuzz-paragraph-anchor-${ seed }">Paragraph needing anchor fix ${ seed } &amp; refs.</p>`,
		'<!-- /wp:paragraph -->',
		'<!-- wp:group {"layout":{"type":"constrained"}} -->',
		`<div id="fuzz-group-anchor-${ seed }" aria-label="Group &amp; label ${ seed }" class="wp-block-group fuzz-group-class-${ seed }">`,
		paragraph( `Nested paragraph in fixable group ${ seed }.` ),
		'</div>',
		'<!-- /wp:group -->',
	].join( '\n' );
}

function equivalentHtmlContent( seed: number ): string {
	return [
		'<!-- wp:separator {"opacity":"css"} -->',
		'<hr class="wp-block-separator has-css-opacity"></hr>',
		'<!-- /wp:separator -->',
		'<!-- wp:separator -->',
		'<hr class="wp-block-separator has-alpha-channel-opacity"></hr>',
		'<!-- /wp:separator -->',
		rawParagraph(
			`Equivalent entity paragraph ${ seed }: &copy and &copy; plus decimal &#169 and hex &#xA9;.`
		),
	].join( '\n' );
}

function freeformParserContent( seed: number ): string {
	return [
		`<p>Freeform load paragraph ${ seed } with &amp optional refs and <strong>inline formatting</strong>.</p>`,
		`<h3>Freeform heading ${ seed } after code editor style parse</h3>`,
	].join( '\n' );
}

function getParserStressContent(
	seed: number,
	step = 0,
	userIndex = 0
): string {
	const variantSeed = seed * 101 + step * 17 + userIndex;
	const rng = createRng( variantSeed );
	const variants = [
		htmlEntityReferenceContent,
		deprecatedBlockContent,
		validationFixContent,
		equivalentHtmlContent,
		freeformParserContent,
	];

	return pick( rng, variants )( variantSeed );
}

function getBaseInitialContent( seed: number ): string {
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

function getInitialContent( seed: number ): string {
	const baseContent = getBaseInitialContent( seed );

	if (
		DISABLE_PARSER_STRESS ||
		ACTION_PROFILE === 'persistence' ||
		ACTION_PROFILE === 'persistence-no-title'
	) {
		return baseContent;
	}

	switch ( seed % 6 ) {
		case 1:
			return [ baseContent, htmlEntityReferenceContent( seed ) ].join(
				'\n'
			);
		case 2:
			return [ baseContent, deprecatedBlockContent( seed ) ].join( '\n' );
		case 3:
			return [ baseContent, validationFixContent( seed ) ].join( '\n' );
		case 4:
			return [ baseContent, equivalentHtmlContent( seed ) ].join( '\n' );
		case 5:
			return [ baseContent, freeformParserContent( seed ) ].join( '\n' );
		default:
			return baseContent;
	}
}

function getRawFieldValue( field?: RestRenderedField | string ): string {
	if ( typeof field === 'string' ) {
		return field;
	}

	return field?.raw ?? field?.rendered ?? '';
}

function hasMarker( value: unknown, marker: string ): boolean {
	return JSON.stringify( value )?.includes( marker ) ?? false;
}

function getCheckpointMarker( seed: number, step: number, userIndex: number ) {
	return `rtc-save-paragraph-marker-${ seed }-${ step }-${ userIndex }-end`;
}

function getRelatedCheckpointMarker( marker: string, kind: string ) {
	return marker.replace(
		'rtc-save-paragraph-marker-',
		`rtc-save-${ kind }-marker-`
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

async function getPersistedPost(
	requestUtils: RestRequestUtils,
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'id,title.raw,content.raw,meta',
		},
	} );
}

async function getPersistedPostContent(
	requestUtils: RestRequestUtils,
	postId: number
): Promise< string > {
	const post = await getPersistedPost( requestUtils, postId );
	return getRawFieldValue( post.content );
}

async function getPersistedPostTitle(
	requestUtils: RestRequestUtils,
	postId: number
): Promise< string > {
	const post = await getPersistedPost( requestUtils, postId );
	return getRawFieldValue( post.title );
}

async function getPostRevisions(
	requestUtils: RestRequestUtils,
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

async function getPostRevision(
	requestUtils: RestRequestUtils,
	postId: number,
	revisionId: number
): Promise< RestRevision > {
	return requestUtils.rest< RestRevision >( {
		path: `/wp/v2/posts/${ postId }/revisions/${ revisionId }`,
		params: {
			context: 'edit',
			_fields: 'id,date,title.raw,content.raw',
		},
	} );
}

async function waitForPersistedPostContentMarker(
	requestUtils: RestRequestUtils,
	postId: number,
	marker: string
): Promise< string > {
	const deadline = Date.now() + CONVERGENCE_TIMEOUT_MS;
	let lastContent = '';

	while ( Date.now() < deadline ) {
		lastContent = await getPersistedPostContent( requestUtils, postId );

		if ( lastContent.includes( marker ) ) {
			return lastContent;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw new Error(
		`Persisted post content did not include marker "${ marker }". Last content: ${ lastContent }`
	);
}

async function waitForPersistedPostTitleMarker(
	requestUtils: RestRequestUtils,
	postId: number,
	marker: string
): Promise< string > {
	const deadline = Date.now() + CONVERGENCE_TIMEOUT_MS;
	let lastTitle = '';

	while ( Date.now() < deadline ) {
		lastTitle = await getPersistedPostTitle( requestUtils, postId );

		if ( lastTitle.includes( marker ) ) {
			return lastTitle;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw new Error(
		`Persisted post title did not include marker "${ marker }". Last title: ${ lastTitle }`
	);
}

async function waitForRevisionContainingMarkers(
	requestUtils: RestRequestUtils,
	postId: number,
	markers: string[]
): Promise< RestRevision > {
	const deadline = Date.now() + CONVERGENCE_TIMEOUT_MS;
	let lastRevisions: RestRevision[] = [];

	while ( Date.now() < deadline ) {
		lastRevisions = await getPostRevisions( requestUtils, postId );

		const revision = lastRevisions.find( ( candidate ) => {
			const revisionContent = getRawFieldValue( candidate.content );
			return markers.every( ( marker ) =>
				revisionContent.includes( marker )
			);
		} );

		if ( revision ) {
			return revision;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw new Error(
		`No post revision included markers "${ markers.join(
			', '
		) }". Last revisions: ${ JSON.stringify(
			lastRevisions.map( ( revision ) => ( {
				id: revision.id,
				content: getRawFieldValue( revision.content ),
			} ) )
		) }`
	);
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

async function insertCheckpointMarker( page: Page, marker: string ) {
	await page.evaluate( ( blockContent ) => {
		const block = ( window as any ).wp.blocks.createBlock(
			'core/paragraph',
			{
				content: blockContent,
			}
		);
		( window as any ).wp.data
			.dispatch( 'core/block-editor' )
			.insertBlock( block );
	}, marker );
}

async function insertCheckpointOptionBlock( page: Page, marker: string ) {
	await page.evaluate( ( optionMarker ) => {
		const block = ( window as any ).wp.blocks.createBlock( 'core/search', {
			buttonPosition: 'button-inside',
			buttonText: `Find ${ optionMarker }`,
			label: `Search label ${ optionMarker }`,
			placeholder: `Search placeholder ${ optionMarker }`,
		} );
		( window as any ).wp.data
			.dispatch( 'core/block-editor' )
			.insertBlock( block );
	}, marker );
}

async function setCheckpointTitle( page: Page, marker: string ) {
	await page.evaluate( ( titleMarker ) => {
		( window as any ).wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: titleMarker } );
	}, marker );
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

async function insertNestedGroup(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );

	await page.evaluate(
		( { blockIndex, marker } ) => {
			const paragraphBlock = ( window as any ).wp.blocks.createBlock(
				'core/paragraph',
				{
					content: `${ marker } nested paragraph`,
				}
			);
			const headingBlock = ( window as any ).wp.blocks.createBlock(
				'core/heading',
				{
					content: `${ marker } nested heading`,
					level: 3,
				}
			);
			const groupBlock = ( window as any ).wp.blocks.createBlock(
				'core/group',
				{
					layout: { type: 'constrained' },
				},
				[ paragraphBlock, headingBlock ]
			);

			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( groupBlock, blockIndex );
		},
		{
			blockIndex: index,
			marker: `Seed ${ seed } step ${ step } user ${ userIndex }`,
		}
	);
}

async function editNestedParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const targetIndex = Math.floor( rng() * 1000000 );
	const updated = await page.evaluate(
		( { content, nestedTargetIndex } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const nestedParagraphs: Array< { clientId: string } > = [];
			const visit = ( currentBlocks: Array< any >, depth: number ) => {
				for ( const block of currentBlocks ) {
					if ( depth > 0 && block.name === 'core/paragraph' ) {
						nestedParagraphs.push( block );
					}
					visit( block.innerBlocks ?? [], depth + 1 );
				}
			};

			visit( blocks, 0 );

			if ( nestedParagraphs.length === 0 ) {
				return false;
			}

			const target =
				nestedParagraphs[ nestedTargetIndex % nestedParagraphs.length ];
			blockEditor.updateBlockAttributes( target.clientId, {
				content,
			} );
			return true;
		},
		{
			content: `Nested update seed ${ seed } step ${ step } user ${ userIndex } ${ Math.floor(
				rng() * 1000000
			) }`,
			nestedTargetIndex: targetIndex,
		}
	);

	if ( ! updated ) {
		await insertNestedGroup( page, seed, step, userIndex, rng );
	}
}

async function moveBlockIntoGroup(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const sourceIndex = Math.floor( rng() * 1000000 );
	const targetIndex = Math.floor( rng() * 1000000 );
	const moved = await page.evaluate(
		( { moveSourceIndex, moveTargetIndex } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const groups = blocks.filter(
				( block: { name: string } ) => block.name === 'core/group'
			);
			const movable = blocks.filter(
				( block: { name: string } ) => block.name !== 'core/group'
			);

			if ( groups.length === 0 || movable.length === 0 ) {
				return false;
			}

			const source = movable[ moveSourceIndex % movable.length ];
			const target = groups[ moveTargetIndex % groups.length ];
			blockEditor.moveBlockToPosition(
				source.clientId,
				'',
				target.clientId,
				0
			);
			return true;
		},
		{
			moveSourceIndex: sourceIndex,
			moveTargetIndex: targetIndex,
		}
	);

	if ( ! moved ) {
		await insertNestedGroup( page, seed, step, userIndex, rng );
	}
}

async function deleteNestedBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const targetIndex = Math.floor( rng() * 1000000 );
	const deleted = await page.evaluate(
		( { nestedTargetIndex } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const nestedBlocks: Array< { clientId: string } > = [];
			const visit = ( currentBlocks: Array< any >, depth: number ) => {
				for ( const block of currentBlocks ) {
					if ( depth > 0 ) {
						nestedBlocks.push( block );
					}
					visit( block.innerBlocks ?? [], depth + 1 );
				}
			};

			visit( blocks, 0 );

			if ( nestedBlocks.length === 0 ) {
				return false;
			}

			const target =
				nestedBlocks[ nestedTargetIndex % nestedBlocks.length ];
			blockEditor.removeBlocks( [ target.clientId ], false );
			return true;
		},
		{ nestedTargetIndex: targetIndex }
	);

	if ( ! deleted ) {
		await insertNestedGroup( page, seed, step, userIndex, rng );
	}
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

async function editRichTextPairBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number
) {
	await page.evaluate(
		( { fuzzSeed, fuzzStep, fuzzUserIndex } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			let block = blocks.find(
				( candidate: { name: string } ) =>
					candidate.name === 'core/pullquote'
			);

			const valueVariants = [
				'',
				'x',
				'xy',
				'<em>alpha</em><strong>beta</strong>',
				'plain <em>changed</em>',
			];
			const citationVariants = [
				'<em>b</em><em>i</em>',
				'ab<em>b</em><strong>it</strong>',
				'a<strong>it</strong>',
				'ab<em>b</em><strong>i</strong>t',
				'<em>alpha</em><strong>beta</strong>',
				'plain <strong>text</strong>',
			];
			const textLength = ( html: string ) => {
				const template = document.createElement( 'template' );
				template.innerHTML = html;
				return template.content.textContent?.length ?? html.length;
			};

			if ( ! block ) {
				block = ( window as any ).wp.blocks.createBlock(
					'core/pullquote',
					{
						value: valueVariants[
							( fuzzSeed + fuzzUserIndex ) % valueVariants.length
						],
						citation:
							citationVariants[
								( fuzzSeed + fuzzStep ) %
									citationVariants.length
							],
					}
				);
				blockEditor.insertBlock( block );
			}

			const variantOffset =
				fuzzSeed +
				fuzzStep * 3 +
				fuzzUserIndex +
				String( block.attributes.citation ?? '' ).length;
			const selectedAttribute =
				variantOffset % 2 === 0 ? 'value' : 'citation';
			const nextValue =
				valueVariants[ variantOffset % valueVariants.length ];
			const nextCitation =
				citationVariants[
					( variantOffset + fuzzStep + 1 ) % citationVariants.length
				];
			const selectedHtml =
				selectedAttribute === 'value' ? nextValue : nextCitation;
			const cursorOffset = Math.min(
				textLength( selectedHtml ),
				1 + ( variantOffset % 6 )
			);

			blockEditor.selectionChange(
				block.clientId,
				selectedAttribute,
				cursorOffset,
				cursorOffset
			);
			blockEditor.updateBlockAttributes( block.clientId, {
				value: nextValue,
				citation: nextCitation,
			} );
		},
		{ fuzzSeed: seed, fuzzStep: step, fuzzUserIndex: userIndex }
	);
}

async function editFormattedParagraphAtCursor(
	page: Page,
	seed: number,
	step: number,
	userIndex: number
) {
	const variants = [
		'<em>italic</em><em>italic</em>',
		'<em>italic</em>beta',
		'<em>italic</em><strong>beta</strong>',
		'plain <em>changed</em>',
		'<strong>alpha</strong> beta',
	];
	const selectedVariant =
		variants[ ( seed + step * 3 + userIndex ) % variants.length ];

	await page.evaluate(
		( { content, cursorOffset } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			let block = blocks.find(
				( candidate: {
					name: string;
					attributes: { content?: string };
				} ) =>
					candidate.name === 'core/paragraph' &&
					typeof candidate.attributes.content === 'string' &&
					candidate.attributes.content.includes( '<em>italic</em>' )
			);

			if ( ! block ) {
				block = ( window as any ).wp.blocks.createBlock(
					'core/paragraph',
					{
						content: '<em>italic</em><em>italic</em>',
					}
				);
				blockEditor.insertBlock( block );
			}

			blockEditor.selectionChange(
				block.clientId,
				'content',
				cursorOffset,
				cursorOffset
			);
			blockEditor.updateBlockAttributes( block.clientId, {
				content,
			} );
		},
		{
			content:
				step % 4 === 0
					? `<em>italic</em>${ escapeHtml(
							`beta ${ seed } ${ userIndex }`
					  ) }`
					: selectedVariant,
			cursorOffset: Math.min( 10, selectedVariant.length ),
		}
	);
}

async function editTableArrayAttributes(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const variant = Math.floor( rng() * 5 );

	await page.evaluate(
		( { fuzzSeed, fuzzStep, fuzzUserIndex, tableVariant } ) => {
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			let block = blocks.find(
				( candidate: { name: string } ) =>
					candidate.name === 'core/table'
			);
			const createCell = ( content: string ) => ( {
				content,
				tag: 'td',
			} );
			const createRow = ( rowLabel: string ) => ( {
				cells: [
					createCell(
						`${ rowLabel } A seed ${ fuzzSeed } step ${ fuzzStep } user ${ fuzzUserIndex }`
					),
					createCell(
						`${ rowLabel } B seed ${ fuzzSeed } step ${ fuzzStep } user ${ fuzzUserIndex }`
					),
				],
			} );

			if ( ! block ) {
				block = ( window as any ).wp.blocks.createBlock( 'core/table', {
					body: [
						createRow( 'initial row 1' ),
						createRow( 'initial row 2' ),
					],
				} );
				blockEditor.insertBlock( block );
				return;
			}

			const body = JSON.parse(
				JSON.stringify( block.attributes.body ?? [] )
			);

			if ( body.length === 0 ) {
				body.push( createRow( 'recreated row' ) );
			}

			const marker = `table-option-${ fuzzSeed }-${ fuzzStep }-${ fuzzUserIndex }-${ tableVariant }`;

			switch ( tableVariant ) {
				case 0:
					body[ 0 ].cells[ 0 ].content = marker;
					break;
				case 1:
					body[ body.length - 1 ].cells[ 1 ].content = marker;
					break;
				case 2:
					body.push( {
						cells: [
							createCell( marker ),
							createCell( `${ marker } sibling` ),
						],
					} );
					break;
				case 3:
					body.unshift( {
						cells: [
							createCell( marker ),
							createCell( `${ marker } sibling` ),
						],
					} );
					break;
				default:
					if ( body.length > 1 ) {
						body.splice( 1, 1 );
					} else {
						body.push( createRow( marker ) );
					}
					break;
			}

			blockEditor.updateBlockAttributes( block.clientId, { body } );
		},
		{
			fuzzSeed: seed,
			fuzzStep: step,
			fuzzUserIndex: userIndex,
			tableVariant: variant,
		}
	);
}

async function reparseEditedContent(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	{ appendStressBlock = false }: { appendStressBlock?: boolean } = {}
) {
	const currentContent = await page.evaluate( () =>
		( window as any ).wp.data.select( 'core/editor' ).getEditedPostContent()
	);
	const nextContent = appendStressBlock
		? [
				currentContent,
				getParserStressContent( seed, step, userIndex ),
		  ].join( '\n' )
		: currentContent;

	await page.evaluate( ( content ) => {
		const blocks = ( window as any ).wp.blocks.parse( content );
		( window as any ).wp.data
			.dispatch( 'core/block-editor' )
			.resetBlocks( blocks );
	}, nextContent );
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
	await waitForCollaborationSessionSettled( collaborationUtils, {
		timeout: SESSION_SETTLE_TIMEOUT_MS,
	} );
}

async function waitForCollaborationSessionSettled(
	collaborationUtils: CollaborationUtils,
	{ timeout = DISCOVERY_TIMEOUT_MS }: { timeout?: number } = {}
) {
	if ( COLLABORATOR_MODE !== 'same-user' ) {
		await collaborationUtils.waitForMutualDiscovery( { timeout } );
		return;
	}

	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
				timeout,
			} )
		)
	);
	await Promise.all(
		collaborationUtils.allPages.map( ( page ) =>
			collaborationUtils.waitForSyncCycle( page, 2, { timeout } )
		)
	);
}

async function saveCheckpointAndVerify( {
	collaborationUtils,
	marker,
	postId,
	requestUtils,
	saver,
	step,
	viewer,
}: {
	collaborationUtils: CollaborationUtils;
	marker: string;
	postId: number;
	requestUtils: RestRequestUtils;
	saver: PageRef;
	step: number;
	viewer: PageRef;
} ): Promise< SaveCheckpoint > {
	const optionMarker = getRelatedCheckpointMarker( marker, 'search-option' );
	const titleMarker = getRelatedCheckpointMarker( marker, 'title' );

	await insertCheckpointMarker( saver.page, marker );
	await insertCheckpointOptionBlock( saver.page, optionMarker );
	await setCheckpointTitle( saver.page, titleMarker );
	const convergedWithMarker = await collaborationUtils.waitForConvergence( {
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );
	expect( hasMarker( convergedWithMarker.blocks, marker ) ).toBe( true );
	expect( hasMarker( convergedWithMarker.blocks, optionMarker ) ).toBe(
		true
	);
	expect( convergedWithMarker.title ).toContain( titleMarker );

	const contentBeforeSave = await getEditedPostContent( saver.page );
	const titleBeforeSave = await getEditedPostTitle( saver.page );
	expect( contentBeforeSave ).toContain( marker );
	expect( contentBeforeSave ).toContain( optionMarker );
	expect( titleBeforeSave ).toContain( titleMarker );

	await saveDraft( saver.page );

	const stateAfterSave = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );
	expect( stateAfterSave.crdtDocument ).not.toBeNull();
	expect( hasMarker( stateAfterSave.blocks, marker ) ).toBe( true );
	expect( hasMarker( stateAfterSave.blocks, optionMarker ) ).toBe( true );
	expect( stateAfterSave.title ).toContain( titleMarker );

	await waitForPersistedPostContentMarker( requestUtils, postId, marker );
	await waitForPersistedPostContentMarker(
		requestUtils,
		postId,
		optionMarker
	);
	await waitForPersistedPostTitleMarker( requestUtils, postId, titleMarker );
	const revision = await waitForRevisionContainingMarkers(
		requestUtils,
		postId,
		[ marker, optionMarker ]
	);
	expect( getRawFieldValue( revision.title ) ).toContain( titleMarker );

	if ( ! DISABLE_RELOAD ) {
		await reloadAndWait( viewer.page, collaborationUtils );
		const stateAfterViewerReload =
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: CONVERGENCE_TIMEOUT_MS,
			} );

		expect( hasMarker( stateAfterViewerReload.blocks, marker ) ).toBe(
			true
		);
		expect( hasMarker( stateAfterViewerReload.blocks, optionMarker ) ).toBe(
			true
		);
		expect( stateAfterViewerReload.title ).toContain( titleMarker );
		await waitForPersistedPostContentMarker( requestUtils, postId, marker );
		await waitForPersistedPostContentMarker(
			requestUtils,
			postId,
			optionMarker
		);
		await waitForPersistedPostTitleMarker(
			requestUtils,
			postId,
			titleMarker
		);
	}

	return {
		content: contentBeforeSave,
		marker,
		optionMarker,
		revisionId: revision.id,
		step,
		titleMarker,
	};
}

async function chooseOldRevisionInBrowser( {
	editor,
	newerCheckpoint,
	oldCheckpoint,
	page,
}: {
	editor: Editor;
	newerCheckpoint: SaveCheckpoint;
	oldCheckpoint: SaveCheckpoint;
	page: Page;
} ) {
	const slider = page.getByRole( 'slider', { name: 'Revision' } );
	await slider.focus();

	for ( const key of [ 'ArrowLeft', 'ArrowRight' ] as const ) {
		for ( let attempt = 0; attempt < 50; attempt++ ) {
			if (
				await isTargetRevisionSelected( {
					editor,
					newerCheckpoint,
					oldCheckpoint,
					page,
				} )
			) {
				return;
			}

			const changed = await pressRevisionSlider( page, slider, key );
			if ( ! changed ) {
				break;
			}
		}
	}

	throw new Error(
		`Could not select old revision containing ${ oldCheckpoint.marker } without ${ newerCheckpoint.marker } through the revision UI.`
	);
}

async function isTargetRevisionSelected( {
	editor,
	newerCheckpoint,
	oldCheckpoint,
	page,
}: {
	editor: Editor;
	newerCheckpoint: SaveCheckpoint;
	oldCheckpoint: SaveCheckpoint;
	page: Page;
} ) {
	const oldTitleVisible = await page
		.getByText( oldCheckpoint.titleMarker )
		.first()
		.isVisible()
		.catch( () => false );
	const newerTitleVisible = await page
		.getByText( newerCheckpoint.titleMarker )
		.first()
		.isVisible()
		.catch( () => false );

	if ( oldTitleVisible && ! newerTitleVisible ) {
		return true;
	}

	const oldContentVisible = await editor.canvas
		.getByText( oldCheckpoint.marker )
		.first()
		.isVisible()
		.catch( () => false );
	const oldOptionVisible = await editor.canvas
		.getByText( oldCheckpoint.optionMarker )
		.first()
		.isVisible()
		.catch( () => false );
	const newerContentVisible = await editor.canvas
		.getByText( newerCheckpoint.marker )
		.first()
		.isVisible()
		.catch( () => false );
	const newerOptionVisible = await editor.canvas
		.getByText( newerCheckpoint.optionMarker )
		.first()
		.isVisible()
		.catch( () => false );

	return (
		oldContentVisible &&
		oldOptionVisible &&
		! newerContentVisible &&
		! newerOptionVisible
	);
}

async function pressRevisionSlider(
	page: Page,
	slider: Locator,
	key: 'ArrowLeft' | 'ArrowRight'
) {
	const previousSliderValue = await getRevisionSliderValue( slider );
	await page.keyboard.press( key );

	if ( previousSliderValue === null ) {
		return true;
	}

	try {
		await expect
			.poll( () => getRevisionSliderValue( slider ), {
				timeout: 1000,
			} )
			.not.toBe( previousSliderValue );
		return true;
	} catch {
		return false;
	}
}

async function getRevisionSliderValue( slider: Locator ) {
	return slider.evaluate( ( element ) => {
		if ( element instanceof HTMLInputElement ) {
			return element.value;
		}

		return (
			element.getAttribute( 'aria-valuenow' ) ??
			element.getAttribute( 'aria-valuetext' ) ??
			element.getAttribute( 'value' )
		);
	} );
}

async function restoreRevisionViaBrowserAndVerify( {
	checkpoints,
	collaborationUtils,
	postId,
	requestUtils,
	restorer,
}: {
	checkpoints: SaveCheckpoint[];
	collaborationUtils: CollaborationUtils;
	postId: number;
	requestUtils: RestRequestUtils;
	restorer: PageRef;
} ) {
	if ( ! ENABLE_REVISION_RESTORE_PROBE || checkpoints.length < 2 ) {
		return;
	}

	const oldCheckpoint = checkpoints[ 0 ];
	const newerCheckpoint = checkpoints[ checkpoints.length - 1 ];
	const revision = await getPostRevision(
		requestUtils,
		postId,
		oldCheckpoint.revisionId
	);
	const restoredContent = getRawFieldValue( revision.content );
	const restoredTitle = getRawFieldValue( revision.title );

	expect( restoredContent ).toContain( oldCheckpoint.marker );
	expect( restoredContent ).toContain( oldCheckpoint.optionMarker );
	expect( restoredTitle ).toContain( oldCheckpoint.titleMarker );
	expect( restoredContent ).not.toContain( newerCheckpoint.marker );
	expect( restoredContent ).not.toContain( newerCheckpoint.optionMarker );
	expect( restoredTitle ).not.toContain( newerCheckpoint.titleMarker );

	await restorer.page.bringToFront();
	await restorer.editor.openDocumentSettingsSidebar();
	const settingsSidebar = restorer.page.getByRole( 'region', {
		name: 'Editor settings',
	} );
	await settingsSidebar.getByRole( 'tab', { name: 'Post' } ).click();
	await settingsSidebar
		.locator( '.editor-private-post-last-revision__button' )
		.click();

	const restoreButton = restorer.page.getByRole( 'button', {
		name: 'Restore',
	} );
	await expect( restoreButton ).toBeVisible();
	await chooseOldRevisionInBrowser( {
		editor: restorer.editor,
		newerCheckpoint,
		oldCheckpoint,
		page: restorer.page,
	} );
	await restoreButton.click();

	await expect(
		restorer.page
			.getByTestId( 'snackbar' )
			.filter( { hasText: 'Restored to revision' } )
			.first()
	).toBeVisible( { timeout: CONVERGENCE_TIMEOUT_MS } );

	await reloadAndWait( restorer.page, collaborationUtils );

	const stateAfterRestore = await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );

	expect( hasMarker( stateAfterRestore.blocks, oldCheckpoint.marker ) ).toBe(
		true
	);
	expect(
		hasMarker( stateAfterRestore.blocks, oldCheckpoint.optionMarker )
	).toBe( true );
	expect( stateAfterRestore.title ).toContain( oldCheckpoint.titleMarker );
	expect(
		hasMarker( stateAfterRestore.blocks, newerCheckpoint.marker )
	).toBe( false );
	expect(
		hasMarker( stateAfterRestore.blocks, newerCheckpoint.optionMarker )
	).toBe( false );
	expect( stateAfterRestore.title ).not.toContain(
		newerCheckpoint.titleMarker
	);

	const persistedContent = await waitForPersistedPostContentMarker(
		requestUtils,
		postId,
		oldCheckpoint.marker
	);
	const persistedTitle = await waitForPersistedPostTitleMarker(
		requestUtils,
		postId,
		oldCheckpoint.titleMarker
	);
	expect( persistedContent ).toContain( oldCheckpoint.optionMarker );
	expect( persistedContent ).not.toContain( newerCheckpoint.marker );
	expect( persistedContent ).not.toContain( newerCheckpoint.optionMarker );
	expect( persistedTitle ).not.toContain( newerCheckpoint.titleMarker );
}

function getPageRefs( collaborationUtils: CollaborationUtils ): PageRef[] {
	return collaborationUtils.allPages.map( ( page, userIndex ) => ( {
		editor: collaborationUtils.allEditors[ userIndex ],
		page,
		userIndex,
	} ) );
}

async function createAdditionalCollaborator(
	requestUtils: UserCreatingRequestUtils,
	collaborationUtils: CollaborationUtils,
	testInfo: { parallelIndex: number; workerIndex: number },
	index: number
): Promise< UserCredentials > {
	if ( COLLABORATOR_MODE === 'same-user' ) {
		return ADMIN_USER;
	}

	const laneLabel = process.env.GUTENBERG_RTC_LANE_LABEL ?? 'lane0';
	const uniqueSuffix = [
		laneLabel,
		process.pid.toString( 36 ),
		testInfo.workerIndex.toString( 36 ),
		testInfo.parallelIndex.toString( 36 ),
		index.toString( 36 ),
		Date.now().toString( 36 ),
	]
		.join( '' )
		.replaceAll( /[^a-z0-9]/gi, '' )
		.toLowerCase()
		.slice( -20 );
	const user = {
		username: `rtcfzx${ uniqueSuffix }`,
		email: `rtcfzx+${ uniqueSuffix }@example.com`,
		firstName: 'RTC',
		lastName: 'Novelty',
		password: 'password',
		roles: COLLABORATOR_ROLES,
	};
	const createdUser = await requestUtils.createUser( user );
	collaborationUtils.registerCleanupUser( createdUser.id );
	return user;
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
	{
		label: 'edit-formatted-paragraph-at-cursor',
		run: async ( page, seed, step, userIndex ) =>
			editFormattedParagraphAtCursor( page, seed, step, userIndex ),
	},
	{
		label: 'edit-rich-text-pair-block',
		run: async ( page, seed, step, userIndex ) =>
			editRichTextPairBlock( page, seed, step, userIndex ),
	},
	{
		label: 'edit-table-array-attributes',
		run: async ( page, seed, step, userIndex, rng ) =>
			editTableArrayAttributes( page, seed, step, userIndex, rng ),
	},
	{
		label: 'insert-nested-group',
		run: async ( page, seed, step, userIndex, rng ) =>
			insertNestedGroup( page, seed, step, userIndex, rng ),
	},
	{
		label: 'edit-nested-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			editNestedParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'move-block-into-group',
		run: async ( page, seed, step, userIndex, rng ) =>
			moveBlockIntoGroup( page, seed, step, userIndex, rng ),
	},
	{
		label: 'delete-nested-block',
		run: async ( page, seed, step, userIndex, rng ) =>
			deleteNestedBlock( page, seed, step, userIndex, rng ),
	},
	{
		label: 'reparse-edited-content',
		run: async ( page, seed, step, userIndex ) =>
			reparseEditedContent( page, seed, step, userIndex ),
	},
	{
		label: 'append-parser-stress-content',
		run: async ( page, seed, step, userIndex ) =>
			reparseEditedContent( page, seed, step, userIndex, {
				appendStressBlock: true,
			} ),
	},
];

function getActiveActions(): PageAction[] {
	if ( ACTION_PROFILE === 'full' ) {
		if ( ! DISABLE_PARSER_STRESS ) {
			return ACTIONS;
		}

		const parserStressActionLabels = new Set( [
			'reparse-edited-content',
			'append-parser-stress-content',
		] );
		return ACTIONS.filter(
			( action ) => ! parserStressActionLabels.has( action.label )
		);
	}

	if (
		ACTION_PROFILE === 'persistence' ||
		ACTION_PROFILE === 'persistence-no-title'
	) {
		const persistenceActionLabels = new Set( [
			'insert-paragraph',
			'append-paragraph',
			'edit-paragraph',
			'delete-block',
			'move-block',
			'edit-title',
			'concurrent-paragraphs',
			'insert-heading',
			'edit-table-array-attributes',
		] );

		return ACTIONS.filter(
			( action ) =>
				persistenceActionLabels.has( action.label ) &&
				( ACTION_PROFILE !== 'persistence-no-title' ||
					action.label !== 'edit-title' )
		);
	}

	if ( ACTION_PROFILE === 'structure' ) {
		const structureActionLabels = new Set( [
			'insert-paragraph',
			'append-paragraph',
			'edit-paragraph',
			'delete-block',
			'move-block',
			'concurrent-paragraphs',
			'insert-heading',
			'edit-table-array-attributes',
			'insert-nested-group',
			'edit-nested-paragraph',
			'move-block-into-group',
			'delete-nested-block',
		] );

		return ACTIONS.filter( ( action ) =>
			structureActionLabels.has( action.label )
		);
	}

	if ( ACTION_PROFILE === 'session-lifecycle' ) {
		const lifecycleActionLabels = new Set( [
			'insert-paragraph',
			'append-paragraph',
			'edit-paragraph',
			'delete-block',
			'move-block',
			'edit-title',
			'concurrent-paragraphs',
			'insert-heading',
			'edit-table-array-attributes',
			'insert-nested-group',
			'edit-nested-paragraph',
		] );

		return ACTIONS.filter( ( action ) =>
			lifecycleActionLabels.has( action.label )
		);
	}

	throw new Error(
		`Unknown GUTENBERG_RTC_BROWSER_ACTION_PROFILE "${ ACTION_PROFILE }".`
	);
}

const ACTIVE_ACTIONS = getActiveActions();

test.describe( 'Collaboration - Seeded Fuzzing', () => {
	test.describe.configure( { mode: 'parallel' } );

	const seeds =
		SEEDS ??
		Array.from( { length: SEED_COUNT }, ( _value, offset ) => {
			return SEED_START + offset;
		} );

	for ( const seed of seeds ) {
		test( `seed ${ seed } converges under save, refresh, and sync faults`, async ( {
			collaboratorUser,
			collaborationUtils,
			requestUtils,
		}, testInfo ) => {
			test.setTimeout( Math.max( 90000, STEP_COUNT * 15000 ) );

			const rng = createRng( seed );
			const behavior = createBehaviorCoverage( seed );
			let pages: PageRef[] = [];
			let cdpSessions: CdpSession[] = [];
			let lastState: { blocks?: Array< any > } | null = null;

			try {
				const post = await requestUtils.createPost( {
					title: `RTC seed ${ seed } initial title`,
					status: 'draft',
					date_gmt: new Date().toISOString(),
					content: getInitialContent( seed ),
				} );

				await collaborationUtils.openPost( post.id );
				await collaborationUtils.joinUser( post.id, collaboratorUser );

				const additionalCollaborators: UserCredentials[] = [];
				for (
					let index = 0;
					index < EXTRA_COLLABORATOR_COUNT;
					index++
				) {
					additionalCollaborators.push(
						await createAdditionalCollaborator(
							requestUtils as UserCreatingRequestUtils,
							collaborationUtils,
							testInfo,
							index
						)
					);
				}

				if ( ! ENABLE_LIFECYCLE_EVENTS ) {
					for ( const user of additionalCollaborators ) {
						await collaborationUtils.joinUser( post.id, user );
					}
				}

				await waitForCollaborationSessionSettled( collaborationUtils, {
					timeout: DISCOVERY_TIMEOUT_MS,
				} );
				lastState = await collaborationUtils.waitForConvergence( {
					timeout: CONVERGENCE_TIMEOUT_MS,
				} );

				pages = getPageRefs( collaborationUtils );
				behavior.userCount = pages.length;
				cdpSessions = await startCdpCoverage( pages );

				const usedMilestones = new Set< number >();
				const saveSteps = chooseMilestoneSteps(
					rng,
					STEP_COUNT,
					usedMilestones,
					STEP_COUNT >= 3 ? 2 : 1
				);
				const reloadStep = DISABLE_RELOAD
					? -1
					: chooseMilestoneStep( rng, STEP_COUNT, usedMilestones );
				const lateJoinStep =
					ENABLE_LIFECYCLE_EVENTS &&
					additionalCollaborators.length > 0
						? chooseMilestoneStep( rng, STEP_COUNT, usedMilestones )
						: -1;
				const lifecycleReloadSteps =
					ENABLE_LIFECYCLE_EVENTS && ! DISABLE_RELOAD
						? chooseMilestoneSteps(
								rng,
								STEP_COUNT,
								usedMilestones,
								1
						  )
						: new Set< number >();
				const saveCheckpoints: SaveCheckpoint[] = [];
				behavior.reloadStep = reloadStep;

				for ( let step = 0; step < STEP_COUNT; step++ ) {
					if ( step === lateJoinStep ) {
						const previousPageCount = pages.length;
						for ( const user of additionalCollaborators ) {
							await collaborationUtils.joinUser( post.id, user );
						}
						await waitForCollaborationSessionSettled(
							collaborationUtils,
							{
								timeout: DISCOVERY_TIMEOUT_MS,
							}
						);
						pages = getPageRefs( collaborationUtils );
						behavior.userCount = pages.length;
						behavior.lifecycleEvents.push( {
							step,
							type: 'late-join',
							userCount: pages.length,
						} );
						cdpSessions.push(
							...( await startCdpCoverage(
								pages.slice( previousPageCount )
							) )
						);
					}

					const actor = pick( rng, pages );
					const faultRoll = rng();

					if ( ! DISABLE_SYNC_FAULTS && faultRoll < 0.15 ) {
						const delayMs = 250 + Math.floor( rng() * 1250 );
						behavior.faults.push( {
							delayMs,
							step,
							type: 'delay',
							userIndex: actor.userIndex,
						} );
						await collaborationUtils.delayNextSyncRequest(
							actor.page,
							delayMs
						);
					} else if ( ! DISABLE_SYNC_FAULTS && faultRoll < 0.25 ) {
						// 403 is a semantic permission failure, not a transient sync
						// fault. The runtime correctly unregisters the room on 403,
						// so injecting it here only produces harness-level false
						// positives.
						const status = pick(
							rng,
							RETRIABLE_SYNC_FAILURE_STATUSES
						);
						behavior.faults.push( {
							status,
							step,
							type: 'fail',
							userIndex: actor.userIndex,
						} );
						await collaborationUtils.failNextSyncRequest(
							actor.page,
							status
						);
					}

					const action = pick( rng, ACTIVE_ACTIONS );
					behavior.actions.push( {
						label: action.label,
						step,
						userIndex: actor.userIndex,
					} );

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
					lastState = state;
					expect( state.blocks.length ).toBeGreaterThan( 0 );

					if ( saveSteps.has( step ) ) {
						const saver = pick( rng, pages );
						const viewer =
							pages.find(
								( candidate ) =>
									candidate.userIndex !== saver.userIndex
							) ?? saver;
						const marker = getCheckpointMarker(
							seed,
							step,
							saver.userIndex
						);
						behavior.saveCheckpointSteps.push( {
							step,
							userIndex: saver.userIndex,
						} );

						const checkpoint = await saveCheckpointAndVerify( {
							collaborationUtils,
							marker,
							postId: post.id,
							requestUtils,
							saver,
							step,
							viewer,
						} );

						saveCheckpoints.push( checkpoint );
					}

					let reloadedState = null;
					if (
						step === reloadStep ||
						lifecycleReloadSteps.has( step )
					) {
						const reloader = pick( rng, pages );
						await reloadAndWait(
							reloader.page,
							collaborationUtils
						);
						reloadedState =
							await collaborationUtils.waitForConvergence( {
								includeCrdtDocument: true,
								timeout: CONVERGENCE_TIMEOUT_MS,
							} );
						lastState = reloadedState;
						behavior.reloads.push( {
							step,
							userIndex: reloader.userIndex,
						} );
						if ( lifecycleReloadSteps.has( step ) ) {
							behavior.lifecycleEvents.push( {
								step,
								type: 'lifecycle-reload',
								userCount: pages.length,
							} );
						}
					}
					expect(
						step === reloadStep || lifecycleReloadSteps.has( step )
							? reloadedState?.blocks.length
							: 1
					).toBeGreaterThan( 0 );
				}

				const finalState = await collaborationUtils.waitForConvergence(
					{
						includeCrdtDocument: true,
						timeout: CONVERGENCE_TIMEOUT_MS,
					}
				);
				lastState = finalState;
				behavior.blockStats = getBlockStats( finalState.blocks );

				expect( finalState.title ).not.toBe( '' );
				expect( finalState.blocks.length ).toBeGreaterThan( 0 );
				expect( finalState.crdtDocument ).not.toBeNull();

				behavior.revisionRestore.eligible =
					ENABLE_REVISION_RESTORE_PROBE &&
					saveCheckpoints.length >= 2;
				await restoreRevisionViaBrowserAndVerify( {
					checkpoints: saveCheckpoints,
					collaborationUtils,
					postId: post.id,
					requestUtils,
					restorer: pick( rng, pages ),
				} );
				behavior.status = 'passed';
			} catch ( error ) {
				behavior.error =
					error instanceof Error
						? error.stack ?? error.message
						: String( error );
				throw error;
			} finally {
				behavior.userCount = Math.max(
					behavior.userCount,
					pages.length
				);
				if ( ! behavior.blockStats && lastState?.blocks ) {
					behavior.blockStats = getBlockStats( lastState.blocks );
				}
				behavior.cdpCoverage = await stopCdpCoverage( cdpSessions );
				await writeBehaviorCoverage( behavior ).catch( () => {} );
			}
		} );
	}
} );
