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
	collaboratorUser: FuzzUserCredentials;
};

type FuzzUserCredentials = UserCredentials & {
	id?: number;
};

const ADMIN_USER: FuzzUserCredentials = {
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
		await use( { ...collaboratorUser, id: createdUser.id } );
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
	status?: string;
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

type OperationWitnessInput = {
	marker: string;
	scope: 'content' | 'title';
	source?: string;
};

type OperationLedgerMode = 'fail' | 'off' | 'shadow';
type FinalPersistenceOracleMode = 'fail' | 'off' | 'shadow';

type OperationLedgerEntry = OperationWitnessInput & {
	actionLabel: string;
	markerHash: string;
	phase: string;
	status: 'invalidated' | 'live' | 'missing' | 'retired';
	step?: number;
	userIndex?: number;
};

type OperationLedgerState = {
	entries: OperationLedgerEntry[];
	invalidatedByAction: Record< string, number >;
	maxLive: number;
	missingExamples: OperationLedgerSummary[ 'missingExamples' ];
	mode: OperationLedgerMode;
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
	) => Promise< PageActionResult | void >;
};

type BehaviorActionTrace = {
	label: string;
	step: number;
	userIndex: number;
};

type PageActionResult =
	| OperationWitnessInput[]
	| {
			historyEvents?: Array< Omit< BehaviorHistoryEvent, 'at' > >;
			witnesses?: OperationWitnessInput[];
	  };

type BehaviorFaultTrace = {
	delayMs?: number;
	status?: number;
	step: number;
	type: 'delay' | 'fail';
	userIndex: number;
};

type BehaviorHistoryEvent = {
	at: string;
	details?: Record< string, unknown >;
	error?: string;
	label?: string;
	phase: string;
	status: 'invoke' | 'ok' | 'fail';
	step?: number;
	userIndex?: number;
};

type BehaviorInvariantEvent = {
	at: string;
	details?: Record< string, unknown >;
	name: string;
	phase: string;
	status: 'ok' | 'fail' | 'observed';
	step?: number;
};

type BehaviorInvariantSnapshot = {
	blockTypes: string[];
	canonicalEditedContentHash?: string;
	canonicalRoundTripStable?: boolean;
	canonicalSerializedContentHash?: string;
	duplicateClientIds: string[];
	editedContentHash?: string;
	editedContentLength?: number;
	editedMatchesSerializedCanonical?: boolean;
	invalidBlockCount: number;
	malformedInnerBlockCount: number;
	maxDepth: number;
	maxDepthByType: Record< string, number >;
	missingClientIdCount: number;
	objectObjectStringCount: number;
	pageIndex: number;
	phase: string;
	rootBlockCount: number;
	serializationError?: string;
	serializedContentHash?: string;
	serializedContentLength?: number;
	step?: number;
	totalBlockCount: number;
	userIndex: number;
};

type BehaviorOperationEvent = {
	actionLabel?: string;
	at: string;
	details?: Record< string, unknown >;
	markerHash?: string;
	phase: string;
	scope?: OperationWitnessInput[ 'scope' ];
	status: 'witnessed' | 'missing' | 'retired' | 'invalidated' | 'assert-ok';
	step?: number;
	userIndex?: number;
};

type OperationLedgerSummary = {
	byScope: Record< OperationWitnessInput[ 'scope' ], number >;
	created: number;
	invalidated: number;
	invalidatedByAction: Record< string, number >;
	live: number;
	maxLive: number;
	missing: number;
	missingExamples: Array< {
		actionLabel: string;
		markerHash: string;
		phase: string;
		scope: OperationWitnessInput[ 'scope' ];
		step?: number;
		userIndex?: number;
	} >;
	mode: OperationLedgerMode;
	retired: number;
	witnessed: number;
};

type RawEditorInvariantSnapshot = {
	blockTypes: string[];
	canonicalEditedContent?: string;
	canonicalSerializedContent?: string;
	duplicateClientIds: string[];
	editedContent?: string;
	invalidBlocks: Array< {
		clientId?: string;
		name?: string;
	} >;
	malformedInnerBlockCount: number;
	maxDepth: number;
	maxDepthByType: Record< string, number >;
	missingClientIdCount: number;
	objectObjectStringCount: number;
	rootBlockCount: number;
	serializationError?: string;
	serializedContent?: string;
	totalBlockCount: number;
};

type BehaviorCoverage = {
	actionProfile: string;
	actions: BehaviorActionTrace[];
	autosaveSteps: Array< {
		local: boolean;
		step: number;
		userIndex: number;
	} >;
	authSessionExpiryProbe: boolean;
	blockStats?: ReturnType< typeof getBlockStats >;
	cdpCoverage?: CdpCoverageSummary;
	collaboratorMode: string;
	collaboratorRoles: string[];
	disableParserStress: boolean;
	disableReload: boolean;
	disableRevisionRestore: boolean;
	disableSyncFaults: boolean;
	error?: string;
	extraCollaborators: number;
	faults: BehaviorFaultTrace[];
	historyEvents: BehaviorHistoryEvent[];
	initialContentProfile: string;
	invariantEvents: BehaviorInvariantEvent[];
	invariantSnapshots: BehaviorInvariantSnapshot[];
	laneLabel: string;
	largeDocumentBlocks: number;
	lifecycleEvents: Array< {
		step: number;
		type: string;
		userCount: number;
	} >;
	operationEvents: BehaviorOperationEvent[];
	operationLedger: OperationLedgerSummary;
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
	softDiscoveryBootstrap: boolean;
	status: 'passed' | 'failed';
	stepCount: number;
	transport: 'http' | 'ws';
	userCount: number;
	postId?: number;
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

type CollaborativeState = {
	blocks: Array< any >;
	crdtDocument?: string | null;
	title: string;
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
const DISABLE_RANDOM_RELOAD =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_RANDOM_RELOAD === '1';
const DISABLE_REVISION_RESTORE =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE === '1';
const ENABLE_REVISION_RESTORE_PROBE =
	! DISABLE_REVISION_RESTORE &&
	( process.env.GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE ??
		process.env.GUTENBERG_RTC_BROWSER_ENABLE_REST_REVISION_RESTORE_PROBE ??
		'1' ) === '1';
const ACTION_PROFILE =
	process.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ?? 'full';
const OPERATION_LEDGER_MODE =
	process.env.GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE ?? 'auto';
const FINAL_PERSISTENCE_ORACLE_MODE = getFinalPersistenceOracleMode();
const ENABLE_FINAL_UI_WITNESS_SWEEP =
	process.env.GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP === '1' ||
	ACTION_PROFILE === 'large-post-three-user-http-lifecycle';
const ENABLE_FINAL_PUBLISH_ORACLE =
	process.env.GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH === '1' ||
	ACTION_PROFILE === 'large-post-three-user-http-lifecycle';
const DISABLE_PARSER_STRESS =
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS === '1';
const SOFT_DISCOVERY_BOOTSTRAP =
	process.env.GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP === '1';
const EXTRA_COLLABORATOR_COUNT = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS',
	[
		'large-post-three-user-http-lifecycle',
		'session-lifecycle',
		'three-user-late-join',
	].includes( ACTION_PROFILE )
		? 1
		: 0
);
const ENABLE_LIFECYCLE_EVENTS =
	process.env.GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS === '1' ||
	[
		'session-lifecycle',
		'three-user-late-join',
		'multi-reload-lifecycle',
		'large-post-three-user-http-lifecycle',
	].includes( ACTION_PROFILE );
const LIFECYCLE_RELOAD_COUNT = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT',
	ACTION_PROFILE === 'multi-reload-lifecycle' ? 2 : 1
);
const SAVE_CHECKPOINT_COUNT = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT',
	2
);
const AUTOSAVE_CHECKPOINT_COUNT = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT',
	ACTION_PROFILE === 'revision-persistence' ? 1 : 0
);
const FORCE_SAVE_STEPS = getEnvIntList(
	'GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS'
);
const FORCE_AUTOSAVE_STEPS = getEnvIntList(
	'GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS'
);
const FORCE_LATE_JOIN_STEP = getEnvOptionalNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP'
);
const LATE_JOIN_POST_ACTION =
	process.env.GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION === '1';
const RELOAD_POST_ACTION =
	process.env.GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION === '1';
const RELOAD_POST_ACTION_KIND =
	process.env.GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND ?? 'paragraph';
const FORCE_RELOAD_STEPS = getEnvIntList(
	'GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS'
);
function getDefaultLargeDocumentBlocks() {
	if ( ACTION_PROFILE === 'large-post-three-user-http-lifecycle' ) {
		return 160;
	}
	if ( ACTION_PROFILE === 'long-session-large-doc' ) {
		return 80;
	}
	return 0;
}
const LARGE_DOCUMENT_BLOCKS = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS',
	getDefaultLargeDocumentBlocks()
);
const INCLUDE_AUTH_SYNC_FAILURES =
	process.env.GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES === '1' ||
	ACTION_PROFILE === 'permissions-auth-locks';
const REAL_USER_EDITING_SEQUENCE = getEnvStringList(
	'GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE'
);
const REAL_USER_EDITING_ACTION_LABELS = getEnvStringList(
	'GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS'
) ?? [
	'ui-type-paragraph',
	'ui-format-paragraph',
	'ui-heading-shortcut',
	'ui-type-title',
	'ui-paste-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-cut-copy-paragraph',
	'ui-composition-paragraph',
	'ui-toolbar-format-paragraph',
];
const REAL_USER_TYPING_DELAY_MS = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_REAL_USER_TYPING_DELAY_MS',
	0
);
const PERSISTED_POST_MARKER_POLL_INTERVAL_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_PERSISTED_POST_MARKER_POLL_INTERVAL_MS',
	50
);
const TEST_TIMEOUT_MS = getEnvInt(
	'GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS',
	Math.max(
		300000,
		120000 +
			STEP_COUNT * 15000 +
			( 1 + EXTRA_COLLABORATOR_COUNT ) * 45000 +
			( ENABLE_LIFECYCLE_EVENTS ? 60000 : 0 )
	)
);
const COLLECT_CDP_COVERAGE =
	process.env.GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE === '1';
const BEHAVIORAL_COVERAGE_FILENAME = 'rtc-behavioral-coverage.ndjson';
const MAX_OPERATION_LEDGER_LIVE = getEnvNonNegativeInt(
	'GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE',
	128
);
const RETRIABLE_SYNC_FAILURE_STATUSES = [ 429, 500, 503 ];
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const ACCESS_MODIFIER_KEY =
	process.platform === 'darwin' ? 'Control+Alt' : 'Shift+Alt';
const AUTH_SYNC_FAILURE_STATUSES = [ 401, 403 ];

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

function getEnvOptionalNonNegativeInt( name: string ): number | null {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return null;
	}

	const parsedValue = Number.parseInt( rawValue, 10 );

	if ( Number.isNaN( parsedValue ) || parsedValue < 0 ) {
		throw new Error(
			`Expected ${ name } to be a non-negative integer when set.`
		);
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

function getEnvStringList( name: string ): string[] | null {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return null;
	}

	const values = rawValue
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean );

	if ( values.length === 0 ) {
		throw new Error(
			`${ name } must be a comma-separated list of non-empty strings.`
		);
	}

	return values;
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
	if ( LARGE_DOCUMENT_BLOCKS > 0 ) {
		return `large-document-${ Math.min(
			Math.ceil( LARGE_DOCUMENT_BLOCKS / 25 ) * 25,
			200
		) }`;
	}

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

function isLowNoiseOperationLedgerProfile() {
	return [
		'multi-reload-lifecycle',
		'persistence',
		'persistence-no-title',
		'revision-persistence',
		'real-user-editing',
		'session-lifecycle',
		'structure',
		'three-user-late-join',
		'async-server-blocks',
		'permissions-auth-locks',
		'long-session-large-doc',
		'large-post-three-user-http-lifecycle',
	].includes( ACTION_PROFILE );
}

function getOperationLedgerMode(): OperationLedgerMode {
	if (
		OPERATION_LEDGER_MODE === 'fail' ||
		OPERATION_LEDGER_MODE === 'off' ||
		OPERATION_LEDGER_MODE === 'shadow'
	) {
		return OPERATION_LEDGER_MODE;
	}

	if ( OPERATION_LEDGER_MODE !== 'auto' ) {
		throw new Error(
			`Unknown GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE "${ OPERATION_LEDGER_MODE }".`
		);
	}

	return isLowNoiseOperationLedgerProfile() &&
		( DISABLE_PARSER_STRESS ||
			ACTION_PROFILE === 'persistence' ||
			ACTION_PROFILE === 'persistence-no-title' ||
			ACTION_PROFILE === 'large-post-three-user-http-lifecycle' )
		? 'fail'
		: 'shadow';
}

function getFinalPersistenceOracleMode(): FinalPersistenceOracleMode {
	const mode =
		process.env.GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE ?? 'off';

	if ( mode === 'fail' || mode === 'off' || mode === 'shadow' ) {
		return mode;
	}

	throw new Error(
		`Unknown GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE "${ mode }".`
	);
}

function createOperationLedgerSummary(
	mode: OperationLedgerMode
): OperationLedgerSummary {
	return {
		byScope: {
			content: 0,
			title: 0,
		},
		created: 0,
		invalidated: 0,
		invalidatedByAction: {},
		live: 0,
		maxLive: 0,
		missing: 0,
		missingExamples: [],
		mode,
		retired: 0,
		witnessed: 0,
	};
}

function createBehaviorCoverage( seed: number ): BehaviorCoverage {
	const operationLedgerMode = getOperationLedgerMode();

	return {
		actionProfile: ACTION_PROFILE,
		actions: [],
		autosaveSteps: [],
		authSessionExpiryProbe: INCLUDE_AUTH_SYNC_FAILURES,
		collaboratorMode: COLLABORATOR_MODE,
		collaboratorRoles: COLLABORATOR_ROLES,
		disableParserStress: DISABLE_PARSER_STRESS,
		disableReload: DISABLE_RELOAD,
		disableRevisionRestore: DISABLE_REVISION_RESTORE,
		disableSyncFaults: DISABLE_SYNC_FAULTS,
		extraCollaborators: EXTRA_COLLABORATOR_COUNT,
		faults: [],
		historyEvents: [],
		initialContentProfile: getInitialContentProfile( seed ),
		invariantEvents: [],
		invariantSnapshots: [],
		laneLabel: process.env.GUTENBERG_RTC_LANE_LABEL ?? 'unknown',
		lifecycleEvents: [],
		operationEvents: [],
		operationLedger: createOperationLedgerSummary( operationLedgerMode ),
		reloadStep: -1,
		reloads: [],
		revisionRestore: {
			eligible: false,
			enabled: ENABLE_REVISION_RESTORE_PROBE,
		},
		saveCheckpointSteps: [],
		seed,
		softDiscoveryBootstrap: SOFT_DISCOVERY_BOOTSTRAP,
		status: 'failed',
		stepCount: STEP_COUNT,
		transport: getTransport(),
		userCount: 0,
		largeDocumentBlocks: LARGE_DOCUMENT_BLOCKS,
	};
}

function recordHistory(
	coverage: BehaviorCoverage,
	event: Omit< BehaviorHistoryEvent, 'at' >
) {
	coverage.historyEvents.push( {
		at: new Date().toISOString(),
		...event,
	} );
}

function normalizePageActionResult( result?: PageActionResult | void ): {
	historyEvents: Array< Omit< BehaviorHistoryEvent, 'at' > >;
	witnesses: OperationWitnessInput[];
} {
	if ( ! result ) {
		return {
			historyEvents: [],
			witnesses: [],
		};
	}

	if ( Array.isArray( result ) ) {
		return {
			historyEvents: [],
			witnesses: result,
		};
	}

	return {
		historyEvents: result.historyEvents ?? [],
		witnesses: result.witnesses ?? [],
	};
}

function recordInvariantEvent(
	coverage: BehaviorCoverage,
	event: Omit< BehaviorInvariantEvent, 'at' >
) {
	coverage.invariantEvents.push( {
		at: new Date().toISOString(),
		...event,
	} );
}

function recordOperationEvent(
	coverage: BehaviorCoverage,
	event: Omit< BehaviorOperationEvent, 'at' >
) {
	coverage.operationEvents.push( {
		at: new Date().toISOString(),
		...event,
	} );
}

function errorToString( error: unknown ): string {
	return error instanceof Error
		? error.stack ?? error.message
		: String( error );
}

function hashString( value: string ): string {
	return crypto.createHash( 'sha256' ).update( value ).digest( 'hex' );
}

function hashOperationMarker( marker: string ): string {
	return hashString( marker ).slice( 0, 16 );
}

function createOperationLedger(
	coverage: BehaviorCoverage
): OperationLedgerState {
	return {
		entries: [],
		invalidatedByAction: {},
		maxLive: 0,
		missingExamples: [],
		mode: coverage.operationLedger.mode,
	};
}

function getLiveOperationLedgerEntries(
	ledger: OperationLedgerState,
	scope?: OperationWitnessInput[ 'scope' ]
) {
	return ledger.entries.filter(
		( entry ) =>
			entry.status === 'live' &&
			( scope === undefined || entry.scope === scope )
	);
}

function updateOperationLedgerSummary(
	coverage: BehaviorCoverage,
	ledger: OperationLedgerState
) {
	const summary = createOperationLedgerSummary( ledger.mode );

	for ( const entry of ledger.entries ) {
		summary.created += 1;
		summary.byScope[ entry.scope ] += 1;

		switch ( entry.status ) {
			case 'invalidated':
				summary.invalidated += 1;
				summary.witnessed += 1;
				break;
			case 'live':
				summary.live += 1;
				summary.witnessed += 1;
				break;
			case 'missing':
				summary.missing += 1;
				break;
			case 'retired':
				summary.retired += 1;
				summary.witnessed += 1;
				break;
		}
	}

	summary.invalidatedByAction = { ...ledger.invalidatedByAction };
	summary.maxLive = ledger.maxLive;
	summary.missingExamples = [ ...ledger.missingExamples ];
	coverage.operationLedger = summary;
}

function sanitizeOperationMarkerKind( kind: string ): string {
	return (
		kind
			.toLowerCase()
			.replaceAll( /[^a-z0-9]+/g, '-' )
			.replaceAll( /^-|-$/g, '' ) || 'op'
	);
}

function createOperationMarker( {
	kind,
	seed,
	step,
	suffix,
	userIndex,
}: {
	kind: string;
	seed: number;
	step: number;
	suffix: number;
	userIndex: number;
} ) {
	return `rtcw-${ seed }-${ step }-u${ userIndex }-${ sanitizeOperationMarkerKind(
		kind
	) }-${ suffix.toString( 36 ) }`;
}

function createContentWitness(
	marker: string,
	source?: string
): OperationWitnessInput {
	return {
		marker,
		scope: 'content',
		source,
	};
}

function createTitleWitness(
	marker: string,
	source?: string
): OperationWitnessInput {
	return {
		marker,
		scope: 'title',
		source,
	};
}

function getCheckpointOperationWitnesses(
	checkpoint: SaveCheckpoint
): OperationWitnessInput[] {
	return [
		createContentWitness( checkpoint.marker, 'save-checkpoint-paragraph' ),
		createContentWitness(
			checkpoint.optionMarker,
			'save-checkpoint-search'
		),
		createTitleWitness( checkpoint.titleMarker, 'save-checkpoint-title' ),
	];
}

function hasOperationWitness(
	state: CollaborativeState,
	witness: OperationWitnessInput
): boolean {
	if ( witness.scope === 'title' ) {
		return state.title.includes( witness.marker );
	}

	return hasMarker( state.blocks, witness.marker );
}

function hasPersistedOperationWitness(
	post: RestPost,
	witness: OperationWitnessInput
): boolean {
	if ( witness.scope === 'title' ) {
		return getRawFieldValue( post.title ).includes( witness.marker );
	}

	return getRawFieldValue( post.content ).includes( witness.marker );
}

function recordOperationMissingExample(
	ledger: OperationLedgerState,
	entry: OperationLedgerEntry,
	phase: string
) {
	if ( ledger.missingExamples.length >= 20 ) {
		return;
	}

	ledger.missingExamples.push( {
		actionLabel: entry.actionLabel,
		markerHash: entry.markerHash,
		phase,
		scope: entry.scope,
		step: entry.step,
		userIndex: entry.userIndex,
	} );
}

function createOperationLedgerFailureMessage(
	phase: string,
	missingEntries: OperationLedgerEntry[]
) {
	return `RTC operation witness missing during ${ phase }: ${ JSON.stringify(
		missingEntries.map( ( entry ) => ( {
			actionLabel: entry.actionLabel,
			markerHash: entry.markerHash,
			scope: entry.scope,
			source: entry.source,
			step: entry.step,
			userIndex: entry.userIndex,
		} ) )
	) }`;
}

function refreshOperationLedgerMaxLive( ledger: OperationLedgerState ) {
	ledger.maxLive = Math.max(
		ledger.maxLive,
		getLiveOperationLedgerEntries( ledger ).length
	);
}

function invalidateOperationLedgerScope( {
	actionLabel,
	coverage,
	ledger,
	phase,
	reason,
	scope,
	step,
	userIndex,
}: {
	actionLabel: string;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	reason: string;
	scope: OperationWitnessInput[ 'scope' ];
	step?: number;
	userIndex?: number;
} ) {
	if ( ledger.mode === 'off' ) {
		return;
	}

	const liveEntries = getLiveOperationLedgerEntries( ledger, scope );

	if ( liveEntries.length === 0 ) {
		return;
	}

	ledger.invalidatedByAction[ actionLabel ] =
		( ledger.invalidatedByAction[ actionLabel ] ?? 0 ) + liveEntries.length;

	for ( const entry of liveEntries ) {
		entry.status = 'invalidated';
		recordOperationEvent( coverage, {
			actionLabel,
			details: { reason },
			markerHash: entry.markerHash,
			phase,
			scope: entry.scope,
			status: 'invalidated',
			step,
			userIndex,
		} );
	}
}

function retireTitleOperationLedgerEntries( {
	actionLabel,
	coverage,
	ledger,
	phase,
	step,
	userIndex,
}: {
	actionLabel: string;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	step?: number;
	userIndex?: number;
} ) {
	for ( const entry of getLiveOperationLedgerEntries( ledger, 'title' ) ) {
		entry.status = 'retired';
		recordOperationEvent( coverage, {
			actionLabel,
			details: { reason: 'title-overwrite' },
			markerHash: entry.markerHash,
			phase,
			scope: entry.scope,
			status: 'retired',
			step,
			userIndex,
		} );
	}
}

function enforceOperationLedgerLiveCap( {
	coverage,
	ledger,
	phase,
	step,
	userIndex,
}: {
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	step?: number;
	userIndex?: number;
} ) {
	if ( MAX_OPERATION_LEDGER_LIVE === 0 ) {
		invalidateOperationLedgerScope( {
			actionLabel: 'ledger-live-cap',
			coverage,
			ledger,
			phase,
			reason: 'ledger-live-cap',
			scope: 'content',
			step,
			userIndex,
		} );
		invalidateOperationLedgerScope( {
			actionLabel: 'ledger-live-cap',
			coverage,
			ledger,
			phase,
			reason: 'ledger-live-cap',
			scope: 'title',
			step,
			userIndex,
		} );
		return;
	}

	while (
		getLiveOperationLedgerEntries( ledger ).length >
		MAX_OPERATION_LEDGER_LIVE
	) {
		const oldestEntry = getLiveOperationLedgerEntries( ledger )[ 0 ];
		if ( ! oldestEntry ) {
			return;
		}

		oldestEntry.status = 'invalidated';
		ledger.invalidatedByAction[ 'ledger-live-cap' ] =
			( ledger.invalidatedByAction[ 'ledger-live-cap' ] ?? 0 ) + 1;
		recordOperationEvent( coverage, {
			actionLabel: 'ledger-live-cap',
			details: { reason: 'ledger-live-cap' },
			markerHash: oldestEntry.markerHash,
			phase,
			scope: oldestEntry.scope,
			status: 'invalidated',
			step,
			userIndex,
		} );
	}
}

function acknowledgeOperationWitnesses( {
	actionLabel,
	coverage,
	ledger,
	phase,
	state,
	step,
	userIndex,
	witnesses,
}: {
	actionLabel: string;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	state: CollaborativeState;
	step?: number;
	userIndex?: number;
	witnesses: OperationWitnessInput[];
} ) {
	if ( ledger.mode === 'off' || witnesses.length === 0 ) {
		return;
	}

	const missingEntries: OperationLedgerEntry[] = [];

	for ( const witness of witnesses ) {
		const entry: OperationLedgerEntry = {
			...witness,
			actionLabel,
			markerHash: hashOperationMarker( witness.marker ),
			phase,
			status: 'live',
			step,
			userIndex,
		};

		if ( ! hasOperationWitness( state, witness ) ) {
			entry.status = 'missing';
			ledger.entries.push( entry );
			missingEntries.push( entry );
			recordOperationMissingExample( ledger, entry, phase );
			recordOperationEvent( coverage, {
				actionLabel,
				markerHash: entry.markerHash,
				phase,
				scope: entry.scope,
				status: 'missing',
				step,
				userIndex,
			} );
			continue;
		}

		if ( witness.scope === 'title' ) {
			retireTitleOperationLedgerEntries( {
				actionLabel,
				coverage,
				ledger,
				phase,
				step,
				userIndex,
			} );
		}

		ledger.entries.push( entry );
		recordOperationEvent( coverage, {
			actionLabel,
			markerHash: entry.markerHash,
			phase,
			scope: entry.scope,
			status: 'witnessed',
			step,
			userIndex,
		} );
	}

	enforceOperationLedgerLiveCap( {
		coverage,
		ledger,
		phase,
		step,
		userIndex,
	} );
	refreshOperationLedgerMaxLive( ledger );

	if ( missingEntries.length > 0 && ledger.mode === 'fail' ) {
		throw new Error(
			createOperationLedgerFailureMessage( phase, missingEntries )
		);
	}
}

function assertOperationLedgerPreserved( {
	coverage,
	ledger,
	phase,
	state,
	step,
}: {
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	state: CollaborativeState;
	step?: number;
} ) {
	if ( ledger.mode === 'off' ) {
		return;
	}

	const missingEntries: OperationLedgerEntry[] = [];

	for ( const entry of getLiveOperationLedgerEntries( ledger ) ) {
		if ( hasOperationWitness( state, entry ) ) {
			continue;
		}

		entry.status = 'missing';
		missingEntries.push( entry );
		recordOperationMissingExample( ledger, entry, phase );
		recordOperationEvent( coverage, {
			actionLabel: entry.actionLabel,
			markerHash: entry.markerHash,
			phase,
			scope: entry.scope,
			status: 'missing',
			step,
			userIndex: entry.userIndex,
		} );
	}

	if ( missingEntries.length === 0 ) {
		recordOperationEvent( coverage, {
			details: {
				live: getLiveOperationLedgerEntries( ledger ).length,
			},
			phase,
			status: 'assert-ok',
			step,
		} );
		return;
	}

	if ( ledger.mode === 'fail' ) {
		throw new Error(
			createOperationLedgerFailureMessage( phase, missingEntries )
		);
	}
}

async function assertOperationLedgerPersisted( {
	coverage,
	ledger,
	phase,
	postId,
	requestUtils,
	step,
}: {
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	phase: string;
	postId: number;
	requestUtils: RestRequestUtils;
	step?: number;
} ) {
	if ( ledger.mode === 'off' ) {
		return;
	}

	const post = await getPersistedPost( requestUtils, postId );
	const missingEntries: OperationLedgerEntry[] = [];

	for ( const entry of getLiveOperationLedgerEntries( ledger ) ) {
		if ( hasPersistedOperationWitness( post, entry ) ) {
			continue;
		}

		entry.status = 'missing';
		missingEntries.push( entry );
		recordOperationMissingExample( ledger, entry, phase );
		recordOperationEvent( coverage, {
			actionLabel: entry.actionLabel,
			markerHash: entry.markerHash,
			phase,
			scope: entry.scope,
			status: 'missing',
			step,
			userIndex: entry.userIndex,
		} );
	}

	if ( missingEntries.length === 0 ) {
		recordOperationEvent( coverage, {
			details: {
				live: getLiveOperationLedgerEntries( ledger ).length,
			},
			phase,
			status: 'assert-ok',
			step,
		} );
		return;
	}

	if ( ledger.mode === 'fail' ) {
		throw new Error(
			createOperationLedgerFailureMessage( phase, missingEntries )
		);
	}
}

const CONTENT_OPERATION_LEDGER_INVALIDATING_ACTIONS = new Set( [
	'append-parser-stress-content',
	'delete-block',
	'delete-nested-block',
	'edit-block-gauntlet-attributes',
	'edit-common-block-attributes',
	'edit-formatted-paragraph-at-cursor',
	'edit-nested-paragraph',
	'edit-paragraph',
	'edit-rich-text-pair-block',
	'edit-table-array-attributes',
	'reparse-edited-content',
] );

function invalidateOperationLedgerAfterAction( {
	actionLabel,
	coverage,
	ledger,
	step,
	userIndex,
}: {
	actionLabel: string;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	step: number;
	userIndex: number;
} ) {
	if ( ! CONTENT_OPERATION_LEDGER_INVALIDATING_ACTIONS.has( actionLabel ) ) {
		return;
	}

	invalidateOperationLedgerScope( {
		actionLabel,
		coverage,
		ledger,
		phase: 'post-action-invalidate',
		reason: 'ambiguous-content-target',
		scope: 'content',
		step,
		userIndex,
	} );
}

function getBlockStats( blocks: Array< any > ) {
	const counts: Record< string, number > = {};
	const maxDepthByType: Record< string, number > = {};
	let totalBlocks = 0;
	let maxDepth = 0;

	const visit = ( currentBlocks: Array< any >, depth: number ) => {
		maxDepth = Math.max( maxDepth, depth );

		for ( const block of currentBlocks ) {
			totalBlocks += 1;
			counts[ block.name ] = ( counts[ block.name ] ?? 0 ) + 1;
			maxDepthByType[ block.name ] = Math.max(
				maxDepthByType[ block.name ] ?? 0,
				depth
			);
			visit( block.innerBlocks ?? [], depth + 1 );
		}
	};

	visit( blocks, 0 );

	return {
		counts,
		maxDepth,
		maxDepthByType,
		totalBlocks,
		types: Object.keys( counts ).sort(),
	};
}

function allowsParserTransformContent( coverage: BehaviorCoverage ): boolean {
	return (
		! coverage.disableParserStress &&
		( coverage.actionProfile === 'parser-transform' ||
			coverage.actionProfile === 'parser-serialization' ||
			! coverage.initialContentProfile.startsWith( 'base-' ) ||
			coverage.actions.some(
				( action ) =>
					action.label === 'append-parser-stress-content' ||
					action.label === 'reparse-edited-content'
			) )
	);
}

async function assertEditorInvariants( {
	coverage,
	pages,
	phase,
	requireCrossPageMatch = true,
	step,
}: {
	coverage: BehaviorCoverage;
	pages: PageRef[];
	phase: string;
	requireCrossPageMatch?: boolean;
	step?: number;
} ) {
	const rawSnapshots = await Promise.all(
		pages.map( async ( { page, userIndex }, pageIndex ) => ( {
			pageIndex,
			raw: await page.evaluate( () => {
				const wp = ( window as any ).wp;
				const blocks = wp.data
					.select( 'core/block-editor' )
					.getBlocks();
				const editor = wp.data.select( 'core/editor' );
				const seenClientIds = new Set< string >();
				const duplicateClientIds = new Set< string >();
				const blockTypes = new Set< string >();
				const invalidBlocks: Array< {
					clientId?: string;
					name?: string;
				} > = [];
				let malformedInnerBlockCount = 0;
				let maxDepth = 0;
				const maxDepthByType: Record< string, number > = {};
				let missingClientIdCount = 0;
				let objectObjectStringCount = 0;
				let totalBlockCount = 0;

				const countObjectObjectStrings = ( value: unknown ) => {
					if ( typeof value === 'string' ) {
						if ( value.includes( '[object Object]' ) ) {
							objectObjectStringCount += 1;
						}
						return;
					}

					if ( Array.isArray( value ) ) {
						for ( const item of value ) {
							countObjectObjectStrings( item );
						}
						return;
					}

					if ( value && typeof value === 'object' ) {
						for ( const item of Object.values(
							value as Record< string, unknown >
						) ) {
							countObjectObjectStrings( item );
						}
					}
				};

				const visit = (
					currentBlocks: Array< any >,
					depth: number
				) => {
					maxDepth = Math.max( maxDepth, depth );

					for ( const block of currentBlocks ) {
						totalBlockCount += 1;
						blockTypes.add( block.name );
						maxDepthByType[ block.name ] = Math.max(
							maxDepthByType[ block.name ] ?? 0,
							depth
						);

						if ( block.clientId ) {
							if ( seenClientIds.has( block.clientId ) ) {
								duplicateClientIds.add( block.clientId );
							}
							seenClientIds.add( block.clientId );
						} else {
							missingClientIdCount += 1;
						}

						if ( block.isValid === false ) {
							invalidBlocks.push( {
								clientId: block.clientId,
								name: block.name,
							} );
						}

						countObjectObjectStrings( block.attributes ?? {} );
						if (
							block.innerBlocks !== undefined &&
							! Array.isArray( block.innerBlocks )
						) {
							malformedInnerBlockCount += 1;
						}
						visit(
							Array.isArray( block.innerBlocks )
								? block.innerBlocks
								: [],
							depth + 1
						);
					}
				};

				visit( blocks, 0 );

				const snapshot: RawEditorInvariantSnapshot = {
					blockTypes: [ ...blockTypes ].sort(),
					duplicateClientIds: [ ...duplicateClientIds ].sort(),
					invalidBlocks,
					malformedInnerBlockCount,
					maxDepth,
					maxDepthByType,
					missingClientIdCount,
					objectObjectStringCount,
					rootBlockCount: blocks.length,
					totalBlockCount,
				};

				try {
					snapshot.serializedContent = wp.blocks.serialize( blocks );
					snapshot.editedContent =
						editor.getEditedPostContent() ?? '';
					snapshot.canonicalSerializedContent = wp.blocks.serialize(
						wp.blocks.parse( snapshot.serializedContent )
					);
					snapshot.canonicalEditedContent = wp.blocks.serialize(
						wp.blocks.parse( snapshot.editedContent )
					);
				} catch ( error ) {
					snapshot.serializationError =
						error instanceof Error
							? error.stack ?? error.message
							: String( error );
				}

				return snapshot;
			} ),
			userIndex,
		} ) )
	);
	const snapshots: BehaviorInvariantSnapshot[] = rawSnapshots.map(
		( { pageIndex, raw, userIndex } ) => ( {
			blockTypes: raw.blockTypes,
			canonicalEditedContentHash: raw.canonicalEditedContent
				? hashString( raw.canonicalEditedContent )
				: undefined,
			canonicalRoundTripStable:
				raw.serializedContent !== undefined &&
				raw.canonicalSerializedContent !== undefined
					? raw.serializedContent === raw.canonicalSerializedContent
					: undefined,
			canonicalSerializedContentHash: raw.canonicalSerializedContent
				? hashString( raw.canonicalSerializedContent )
				: undefined,
			duplicateClientIds: raw.duplicateClientIds,
			editedContentHash: raw.editedContent
				? hashString( raw.editedContent )
				: undefined,
			editedContentLength: raw.editedContent?.length,
			editedMatchesSerializedCanonical:
				raw.canonicalEditedContent !== undefined &&
				raw.canonicalSerializedContent !== undefined
					? raw.canonicalEditedContent ===
					  raw.canonicalSerializedContent
					: undefined,
			invalidBlockCount: raw.invalidBlocks.length,
			malformedInnerBlockCount: raw.malformedInnerBlockCount,
			maxDepth: raw.maxDepth,
			maxDepthByType: raw.maxDepthByType,
			missingClientIdCount: raw.missingClientIdCount,
			objectObjectStringCount: raw.objectObjectStringCount,
			pageIndex,
			phase,
			rootBlockCount: raw.rootBlockCount,
			serializationError: raw.serializationError,
			serializedContentHash: raw.serializedContent
				? hashString( raw.serializedContent )
				: undefined,
			serializedContentLength: raw.serializedContent?.length,
			step,
			totalBlockCount: raw.totalBlockCount,
			userIndex,
		} )
	);
	coverage.invariantSnapshots.push( ...snapshots );

	const strictParserContent = ! allowsParserTransformContent( coverage );
	const failures: Array< {
		details?: Record< string, unknown >;
		name: string;
	} > = [];
	const serializationErrors = snapshots.filter(
		( snapshot ) => snapshot.serializationError
	);
	const duplicateClientIds = snapshots.filter(
		( snapshot ) => snapshot.duplicateClientIds.length > 0
	);
	const missingClientIds = snapshots.filter(
		( snapshot ) => snapshot.missingClientIdCount > 0
	);
	const malformedInnerBlocks = snapshots.filter(
		( snapshot ) => snapshot.malformedInnerBlockCount > 0
	);
	const objectObjectStrings = snapshots.filter(
		( snapshot ) => snapshot.objectObjectStringCount > 0
	);
	const invalidBlocks = snapshots.filter(
		( snapshot ) => snapshot.invalidBlockCount > 0
	);
	const roundTripChanges = snapshots.filter(
		( snapshot ) => snapshot.canonicalRoundTripStable === false
	);
	const editedStoreMismatches = snapshots.filter(
		( snapshot ) => snapshot.editedMatchesSerializedCanonical === false
	);
	let exactSerializedDivergences: BehaviorInvariantSnapshot[] = [];
	let canonicalSerializedDivergences: BehaviorInvariantSnapshot[] = [];
	let canonicalEditedDivergences: BehaviorInvariantSnapshot[] = [];
	let exactEditedDivergences: BehaviorInvariantSnapshot[] = [];

	if ( serializationErrors.length > 0 ) {
		failures.push( {
			details: { pages: serializationErrors },
			name: 'serialize-parse-current-blocks',
		} );
	}

	if ( duplicateClientIds.length > 0 ) {
		failures.push( {
			details: { pages: duplicateClientIds },
			name: 'unique-client-ids',
		} );
	}

	if ( missingClientIds.length > 0 ) {
		failures.push( {
			details: { pages: missingClientIds },
			name: 'non-empty-client-ids',
		} );
	}

	if ( malformedInnerBlocks.length > 0 ) {
		failures.push( {
			details: { pages: malformedInnerBlocks },
			name: 'inner-blocks-are-arrays',
		} );
	}

	if ( strictParserContent && objectObjectStrings.length > 0 ) {
		failures.push( {
			details: { pages: objectObjectStrings },
			name: 'no-object-object-strings',
		} );
	}

	if ( strictParserContent && invalidBlocks.length > 0 ) {
		failures.push( {
			details: { pages: invalidBlocks },
			name: 'unexpected-invalid-blocks',
		} );
	}

	if ( strictParserContent && roundTripChanges.length > 0 ) {
		failures.push( {
			details: { pages: roundTripChanges },
			name: 'serialize-parse-roundtrip-stable',
		} );
	}

	if ( strictParserContent && editedStoreMismatches.length > 0 ) {
		failures.push( {
			details: { pages: editedStoreMismatches },
			name: 'edited-content-matches-block-store',
		} );
	}

	if ( requireCrossPageMatch && serializationErrors.length === 0 ) {
		const firstSerialized = rawSnapshots[ 0 ]?.raw.serializedContent;
		const firstCanonicalSerialized =
			rawSnapshots[ 0 ]?.raw.canonicalSerializedContent;
		const firstCanonicalEdited =
			rawSnapshots[ 0 ]?.raw.canonicalEditedContent;
		const firstEdited = rawSnapshots[ 0 ]?.raw.editedContent;
		exactSerializedDivergences = snapshots.filter(
			( snapshot, index ) =>
				rawSnapshots[ index ].raw.serializedContent !== firstSerialized
		);
		canonicalSerializedDivergences = snapshots.filter(
			( snapshot, index ) =>
				rawSnapshots[ index ].raw.canonicalSerializedContent !==
				firstCanonicalSerialized
		);
		canonicalEditedDivergences = snapshots.filter(
			( snapshot, index ) =>
				rawSnapshots[ index ].raw.canonicalEditedContent !==
				firstCanonicalEdited
		);
		exactEditedDivergences = snapshots.filter(
			( snapshot, index ) =>
				rawSnapshots[ index ].raw.editedContent !== firstEdited
		);

		if ( canonicalSerializedDivergences.length > 0 ) {
			failures.push( {
				details: { pages: canonicalSerializedDivergences },
				name: 'cross-page-canonical-serialized-content',
			} );
		}

		if ( canonicalEditedDivergences.length > 0 ) {
			failures.push( {
				details: { pages: canonicalEditedDivergences },
				name: 'cross-page-canonical-edited-content',
			} );
		}

		if ( strictParserContent && exactEditedDivergences.length > 0 ) {
			failures.push( {
				details: { pages: exactEditedDivergences },
				name: 'cross-page-exact-edited-content',
			} );
		}
	}

	const recordCheck = (
		name: string,
		status: BehaviorInvariantEvent[ 'status' ],
		details?: Record< string, unknown >
	) => {
		recordInvariantEvent( coverage, {
			details,
			name,
			phase,
			status,
			step,
		} );
	};
	const parserStressStatus = ( hasSignal: boolean ) => {
		if ( ! hasSignal ) {
			return 'ok';
		}

		return strictParserContent ? 'fail' : 'observed';
	};

	recordCheck(
		'serialize-parse-current-blocks',
		serializationErrors.length > 0 ? 'fail' : 'ok'
	);
	recordCheck(
		'unique-client-ids',
		duplicateClientIds.length > 0 ? 'fail' : 'ok'
	);
	recordCheck(
		'non-empty-client-ids',
		missingClientIds.length > 0 ? 'fail' : 'ok'
	);
	recordCheck(
		'inner-blocks-are-arrays',
		malformedInnerBlocks.length > 0 ? 'fail' : 'ok'
	);
	recordCheck(
		'no-object-object-strings',
		parserStressStatus( objectObjectStrings.length > 0 )
	);
	recordCheck(
		'unexpected-invalid-blocks',
		parserStressStatus( invalidBlocks.length > 0 ),
		invalidBlocks.length > 0
			? { invalidBlockCount: invalidBlocks.length }
			: undefined
	);
	recordCheck(
		'serialize-parse-roundtrip-stable',
		parserStressStatus( roundTripChanges.length > 0 )
	);
	recordCheck(
		'edited-content-matches-block-store',
		parserStressStatus( editedStoreMismatches.length > 0 )
	);
	if ( requireCrossPageMatch ) {
		recordCheck(
			'cross-page-exact-serialized-content',
			exactSerializedDivergences.length > 0 ? 'observed' : 'ok'
		);
		recordCheck(
			'cross-page-canonical-serialized-content',
			canonicalSerializedDivergences.length > 0 ? 'fail' : 'ok'
		);
		recordCheck(
			'cross-page-canonical-edited-content',
			canonicalEditedDivergences.length > 0 ? 'fail' : 'ok'
		);
		recordCheck(
			'cross-page-exact-edited-content',
			parserStressStatus( exactEditedDivergences.length > 0 )
		);
	}

	if ( failures.length > 0 ) {
		throw new Error(
			`RTC editor invariant failure during ${ phase }${
				step === undefined ? '' : ` step ${ step }`
			}: ${ JSON.stringify( failures ) }`
		);
	}
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

function reserveMilestoneStep(
	step: number | null,
	stepCount: number,
	usedSteps: Set< number >
): number {
	if ( step === null ) {
		return -1;
	}

	if ( stepCount <= 1 ) {
		usedSteps.add( 0 );
		return 0;
	}

	const normalizedStep = Math.max( 1, Math.min( stepCount - 1, step ) );
	usedSteps.add( normalizedStep );
	return normalizedStep;
}

function reserveMilestoneSteps(
	steps: number[] | null,
	stepCount: number,
	usedSteps: Set< number >
): Set< number > | null {
	if ( steps === null ) {
		return null;
	}

	return new Set(
		steps.map( ( step ) =>
			reserveMilestoneStep( step, stepCount, usedSteps )
		)
	);
}

function chooseLateJoinStep(
	rng: Random,
	stepCount: number,
	usedSteps: Set< number >,
	forcedLateJoinStep: number,
	hasAdditionalCollaborators: boolean
): number {
	if ( ! ENABLE_LIFECYCLE_EVENTS || ! hasAdditionalCollaborators ) {
		return -1;
	}

	return forcedLateJoinStep === -1
		? chooseMilestoneStep( rng, stepCount, usedSteps )
		: forcedLateJoinStep;
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
	const rng = createRng( seed + 11 );
	const textVariants = [
		`Seed ${ seed } refs: AT&amp T, AT&amp;T, copy &copy 2026, reg &reg , decimal &#38 , hex &#x26 and escaped tags &lt;em&gt;text&lt;/em&gt;.`,
		`Seed ${ seed } ambiguous refs: &notin; / &notin text, nbsp &nbsp gap, quote &quot;value&quot;, apos &apos;value&apos;, lt &lt and gt &gt.`,
		`Seed ${ seed } legacy named refs: cent &cent price, pound &pound value, yen &yen value, current &curren value, acute &acute accent.`,
		`Seed ${ seed } boundary refs: &copycat should stay text, &reg-test, &nbspx, ampersand &amp=value, decimal &#169 text, hex &#x000A9 text.`,
		`Seed ${ seed } mixed case refs: &AMP no semicolon, &LT;tag&GT;, &QUOT;quoted&QUOT;, invalid-ish &madeup; stays visible.`,
	];
	const linkVariants = [
		`<a href="https://example.test/search?q=alpha&amp;beta=2&amp-gamma=3&#38-delta=4&#x26-epsilon=5" title="A&amp B &copy 2026 &#34 quoted&#34;">attribute refs</a>`,
		`<a href="https://example.test/path?name=Tom&amp;mode=rich&#x26-debug=1" aria-label="Tom &amp Jerry &copy 2026">aria refs</a>`,
		`<a href="https://example.test/entity?copy=&copy&semi=&copy;&hex=&#xA9&dec=&#169" title="copy &copy reg &reg nbsp &nbsp done">entity attr refs</a>`,
		`<span data-title="AT&amp T &copy 2026" aria-label="optional &notin text &amp attr">span attr refs</span>`,
		`<abbr title="fish &amp chips &copycat &copy 2026">abbr refs</abbr>`,
	];

	return [
		rawParagraph(
			`${ pick( rng, textVariants ) } ${ pick( rng, linkVariants ) }`
		),
		rawHeading(
			`Heading refs &amp optional &copy ${ seed } with &#x26; hex and &nbsp gap`,
			3
		),
		rawParagraph(
			`Textarea-like refs ${ seed }: <code title="code &amp attr &copy">AT&amp T &amp;amp; &lt;script&gt;</code>`
		),
	].join( '\n' );
}

function deprecatedBlockContent( seed: number ): string {
	const imageUrl =
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2260%22 viewBox=%220 0 120 60%22%3E%3Crect width=%22120%22 height=%2260%22 fill=%22%23553377%22/%3E%3Ctext x=%2210%22 y=%2235%22 font-size=%2216%22 fill=%22white%22%3EOLD%3C/text%3E%3C/svg%3E';

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
		`${ blockDelimiter( 'spacer', {
			height: 72 + ( seed % 30 ),
			width: 120 + ( seed % 40 ),
		} ) }\n<div class="wp-block-spacer" style="height:${
			72 + ( seed % 30 )
		}px;width:${
			120 + ( seed % 40 )
		}px" aria-hidden="true"></div>\n<!-- /wp:spacer -->`,
		`${ blockDelimiter( 'verse', {
			textAlign: 'center',
		} ) }\n<pre style="text-align:center">Deprecated verse ${ seed }\nsecond line with &amp; refs</pre>\n<!-- /wp:verse -->`,
		`${ blockDelimiter( 'image', {
			alt: `Deprecated image ${ seed }`,
			height: 60,
			id: seed % 100000,
			url: imageUrl,
			width: 120,
		} ) }\n<figure><img src="${ imageUrl }" alt="Deprecated image ${ seed }" class="wp-image-${
			seed % 100000
		}" width="120" height="60" /><figcaption>Deprecated image caption ${ seed }</figcaption></figure>\n<!-- /wp:image -->`,
		`${ blockDelimiter( 'buttons', {
			contentJustification: 'center',
			orientation: 'vertical',
		} ) }\n<div class="wp-block-buttons is-content-justification-center is-vertical"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link">Deprecated button ${ seed }</a></div><!-- /wp:button --></div>\n<!-- /wp:buttons -->`,
	].join( '\n' );
}

function validationFixContent( seed: number ): string {
	const imageUrl =
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2260%22 viewBox=%220 0 120 60%22%3E%3Crect width=%22120%22 height=%2260%22 fill=%22%23775522%22/%3E%3Ctext x=%2210%22 y=%2235%22 font-size=%2216%22 fill=%22white%22%3EFIX%3C/text%3E%3C/svg%3E';

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
		'<!-- wp:quote -->',
		`<blockquote id="fuzz-quote-anchor-${ seed }" class="wp-block-quote fuzz-quote-class-${ seed }"><p>Quote needing class and anchor fixes ${ seed }</p><cite>Fix pass</cite></blockquote>`,
		'<!-- /wp:quote -->',
		'<!-- wp:image -->',
		`<figure id="fuzz-image-anchor-${ seed }" class="wp-block-image fuzz-image-class-${ seed }"><img src="${ imageUrl }" alt="Validation fix image ${ seed }"/><figcaption>Validation fix caption ${ seed }</figcaption></figure>`,
		'<!-- /wp:image -->',
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
		rawParagraph(
			`Equivalent class/style ${ seed }: <span class="beta alpha" style="margin:0px  1em; color: red;">styled</span> and <button disabled="">disabled</button>.`
		),
		`${ blockDelimiter( 'image', {
			alt: `Equivalent image ${ seed }`,
			url: `https://example.test/image-${ seed }.png`,
		} ) }\n<figure class="wp-block-image extra-one extra-two"><img alt="Equivalent image ${ seed }" src="https://example.test/image-${ seed }.png"/></figure>\n<!-- /wp:image -->`,
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

function getLargeDocumentContent( seed: number, blockCount: number ): string {
	const blocks: string[] = [];

	for ( let index = 0; index < blockCount; index++ ) {
		if ( index % 17 === 0 ) {
			blocks.push(
				heading( `Large document section ${ seed } ${ index }`, 3 )
			);
		} else if ( index % 11 === 0 ) {
			blocks.push(
				list( [
					`Large list ${ seed } ${ index } alpha`,
					`Large list ${ seed } ${ index } beta`,
					`Large list ${ seed } ${ index } gamma`,
				] )
			);
		} else if ( index % 7 === 0 ) {
			blocks.push(
				group( [
					paragraph( `Large nested ${ seed } ${ index } one` ),
					paragraph( `Large nested ${ seed } ${ index } two` ),
				] )
			);
		} else {
			blocks.push(
				paragraph(
					`Large document paragraph ${ seed } ${ index } keeps undo, sync, and persistence state non-trivial.`
				)
			);
		}
	}

	return blocks.join( '\n' );
}

function getInitialContent( seed: number ): string {
	const baseContent = getBaseInitialContent( seed );

	if ( LARGE_DOCUMENT_BLOCKS > 0 ) {
		return [
			baseContent,
			getLargeDocumentContent( seed, LARGE_DOCUMENT_BLOCKS ),
		].join( '\n' );
	}

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
	requestUtils: RestRequestUtils,
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'id,status,title.raw,content.raw,meta',
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

		await new Promise( ( resolve ) =>
			setTimeout( resolve, PERSISTED_POST_MARKER_POLL_INTERVAL_MS )
		);
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

		await new Promise( ( resolve ) =>
			setTimeout( resolve, PERSISTED_POST_MARKER_POLL_INTERVAL_MS )
		);
	}

	throw new Error(
		`Persisted post title did not include marker "${ marker }". Last title: ${ lastTitle }`
	);
}

async function waitForPersistedPostStatus(
	requestUtils: RestRequestUtils,
	postId: number,
	status: string
): Promise< RestPost > {
	const deadline = Date.now() + CONVERGENCE_TIMEOUT_MS;
	let lastStatus = '';

	while ( Date.now() < deadline ) {
		const post = await getPersistedPost( requestUtils, postId );
		lastStatus = post.status ?? '';

		if ( lastStatus === status ) {
			return post;
		}

		await new Promise( ( resolve ) =>
			setTimeout( resolve, PERSISTED_POST_MARKER_POLL_INTERVAL_MS )
		);
	}

	throw new Error(
		`Persisted post status did not become "${ status }". Last status: ${ lastStatus }`
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

		await new Promise( ( resolve ) =>
			setTimeout( resolve, PERSISTED_POST_MARKER_POLL_INTERVAL_MS )
		);
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
	const marker = createOperationMarker( {
		kind: append ? 'append-paragraph' : 'insert-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } paragraph`;

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

	return [
		createContentWitness(
			marker,
			append ? 'append-paragraph' : 'insert-paragraph'
		),
	];
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
	const marker = createOperationMarker( {
		kind: 'insert-heading',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } heading`;

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

	return [ createContentWitness( marker, 'insert-heading' ) ];
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
		return insertParagraph( page, seed, step, userIndex, rng );
	}

	const targetBlock = pick( rng, paragraphBlocks );
	const marker = createOperationMarker( {
		kind: 'edit-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const nextContent = `${ marker } updated paragraph`;

	await page.evaluate(
		( { clientId, blockContent } ) => {
			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					content: blockContent,
				} );
		},
		{
			clientId: targetBlock.clientId,
			blockContent: nextContent,
		}
	);

	return [ createContentWitness( marker, 'edit-paragraph' ) ];
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
	const marker = createOperationMarker( {
		kind: 'insert-nested-group',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await page.evaluate(
		( { blockIndex, groupMarker } ) => {
			const paragraphBlock = ( window as any ).wp.blocks.createBlock(
				'core/paragraph',
				{
					content: `${ groupMarker } nested paragraph`,
				}
			);
			const headingBlock = ( window as any ).wp.blocks.createBlock(
				'core/heading',
				{
					content: `${ groupMarker } nested heading`,
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
			groupMarker: marker,
		}
	);

	return [ createContentWitness( marker, 'insert-nested-group' ) ];
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
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
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
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
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
			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
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
	const marker = createOperationMarker( {
		kind: 'edit-title',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await page.evaluate(
		( { title } ) => {
			( window as any ).wp.data
				.dispatch( 'core/editor' )
				.editPost( { title } );
		},
		{
			title: `${ marker } title`,
		}
	);

	return [ createTitleWitness( marker, 'edit-title' ) ];
}

async function insertConcurrentParagraphs(
	pages: PageRef[],
	seed: number,
	step: number,
	rng: Random
) {
	const payloads = pages.map( ( { page, userIndex } ) => {
		const marker = createOperationMarker( {
			kind: 'concurrent-paragraphs',
			seed,
			step,
			suffix: Math.floor( rng() * 1000000 ),
			userIndex,
		} );

		return {
			marker,
			page,
			content: `${ marker } concurrent paragraph`,
		};
	} );

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

	return payloads.map( ( { marker } ) =>
		createContentWitness( marker, 'concurrent-paragraphs' )
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

async function focusRealUserTypingSurface( page: Page ) {
	await dismissBlockingEditorGuide( page );
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const documents = canvas.getByRole( 'document' );
	const documentCount = await documents.count();

	if ( documentCount > 0 ) {
		await documents.nth( documentCount - 1 ).click( { timeout: 10000 } );
		return;
	}

	await canvas.locator( 'body' ).click( { timeout: 10000 } );
}

async function dismissBlockingEditorGuide( page: Page ) {
	const closeButton = page
		.getByRole( 'dialog' )
		.getByRole( 'button', { name: /close/i } )
		.first();

	if (
		await closeButton.isVisible( { timeout: 500 } ).catch( () => false )
	) {
		await closeButton.click( { timeout: 2000 } ).catch( async () => {
			await page.keyboard.press( 'Escape' );
		} );
	}

	await page
		.locator( '.components-modal__screen-overlay' )
		.waitFor( { state: 'hidden', timeout: 2000 } )
		.catch( () => undefined );
}

async function waitForEditedContentMarker(
	page: Page,
	marker: string,
	timeout = 10000
) {
	await page.waitForFunction(
		( expectedMarker ) =>
			( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostContent()
				.includes( expectedMarker ),
		marker,
		{ timeout }
	);
}

async function waitForEditedTitleMarker( page: Page, marker: string ) {
	await page.waitForFunction(
		( expectedMarker ) =>
			( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostAttribute( 'title' )
				.includes( expectedMarker ),
		marker,
		{ timeout: 10000 }
	);
}

async function waitForEditedContentWithoutMarker(
	page: Page,
	marker: string,
	timeout = 10000
) {
	await page.waitForFunction(
		( expectedMarker ) =>
			! ( window as any ).wp.data
				.select( 'core/editor' )
				.getEditedPostContent()
				.includes( expectedMarker ),
		marker,
		{ timeout }
	);
}

async function waitForEditedContentMarkerOrFalse(
	page: Page,
	marker: string,
	timeout = 3000
) {
	try {
		await waitForEditedContentMarker( page, marker, timeout );
		return true;
	} catch {
		return false;
	}
}

async function waitForParagraphMarkerInInlineElement(
	page: Page,
	marker: string,
	selector: string
) {
	await page.waitForFunction(
		( { expectedMarker, inlineSelector } ) => {
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const block = blocks.find(
				( candidate: {
					name: string;
					attributes: { content?: string };
				} ) =>
					candidate.name === 'core/paragraph' &&
					typeof candidate.attributes.content === 'string' &&
					candidate.attributes.content.includes( expectedMarker )
			);

			if ( ! block ) {
				return false;
			}

			const template = document.createElement( 'template' );
			template.innerHTML = block.attributes.content;
			return Array.from(
				template.content.querySelectorAll( inlineSelector )
			).some(
				( element ) => element.textContent?.includes( expectedMarker )
			);
		},
		{ expectedMarker: marker, inlineSelector: selector },
		{ timeout: 10000 }
	);
}

async function waitForBlockMarker(
	page: Page,
	marker: string,
	blockName: string
) {
	await page.waitForFunction(
		( { expectedMarker, expectedBlockName } ) =>
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some(
					( block: {
						name: string;
						attributes: Record< string, unknown >;
					} ) =>
						block.name === expectedBlockName &&
						Object.values( block.attributes ?? {} ).some(
							( value ) =>
								typeof value === 'string' &&
								value.includes( expectedMarker )
						)
				),
		{ expectedMarker: marker, expectedBlockName: blockName },
		{ timeout: 10000 }
	);
}

async function typeRealUserParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random,
	{ kind = 'ui-type-paragraph' }: { kind?: string } = {}
) {
	const marker = createOperationMarker( {
		kind,
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } typed paragraph`;

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( content, { delay: REAL_USER_TYPING_DELAY_MS } );
	await waitForEditedContentMarker( page, marker );

	return [ createContentWitness( marker, kind ) ];
}

async function typeRealUserFormattedParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-format-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( `formatted ${ seed } `, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	await page.keyboard.type( marker, { delay: REAL_USER_TYPING_DELAY_MS } );
	for ( let index = 0; index < marker.length; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+I` );
	await page.keyboard.press( 'ArrowRight' );
	await page.keyboard.type( ' tail', { delay: REAL_USER_TYPING_DELAY_MS } );
	await waitForEditedContentMarker( page, marker );
	await waitForParagraphMarkerInInlineElement( page, marker, 'em,i' ).catch(
		() => undefined
	);

	return [ createContentWitness( marker, 'ui-format-paragraph' ) ];
}

async function typeRealUserTitle(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random,
	{ kind = 'ui-type-title' }: { kind?: string } = {}
) {
	const marker = createOperationMarker( {
		kind,
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const titleBox = canvas
		.getByRole( 'textbox', { name: /add title/i } )
		.first();

	await titleBox.click( { timeout: 10000 } );
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( `${ marker } title`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	await waitForEditedTitleMarker( page, marker );

	return [ createTitleWitness( marker, kind ) ];
}

async function typeRealUserUndoRedoParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-undo-redo-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } undo redo paragraph`;

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( content, { delay: REAL_USER_TYPING_DELAY_MS } );
	await page.keyboard.press( `${ MODIFIER_KEY }+Z` );
	await waitForEditedContentWithoutMarker( page, marker );

	await page.keyboard.press( `${ MODIFIER_KEY }+Shift+Z` );
	let restored = await waitForEditedContentMarkerOrFalse( page, marker );
	if ( ! restored ) {
		await page.keyboard.press( `${ MODIFIER_KEY }+Y` );
		restored = await waitForEditedContentMarkerOrFalse( page, marker );
	}
	expect( restored ).toBe( true );
	await waitForEditedContentMarker( page, marker );

	return [ createContentWitness( marker, 'ui-undo-redo-paragraph' ) ];
}

async function typeRealUserHeadingShortcut(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-heading-shortcut',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press(
		`${ ACCESS_MODIFIER_KEY }+${ 2 + ( ( seed + step ) % 3 ) }`
	);
	await page.keyboard.type( `${ marker } heading`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	await waitForEditedContentMarker( page, marker );
	await waitForBlockMarker( page, marker, 'core/heading' ).catch(
		() => undefined
	);

	return [ createContentWitness( marker, 'ui-heading-shortcut' ) ];
}

async function typeRealUserPastedParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-paste-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } pasted paragraph`;

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page
		.context()
		.grantPermissions( [ 'clipboard-read', 'clipboard-write' ] )
		.catch( () => undefined );
	await page
		.evaluate(
			( value ) => navigator.clipboard.writeText( value ),
			content
		)
		.catch( () => undefined );
	await page.keyboard.press( `${ MODIFIER_KEY }+V` );
	if ( ! ( await waitForEditedContentMarkerOrFalse( page, marker ) ) ) {
		await page.keyboard.type( content, {
			delay: REAL_USER_TYPING_DELAY_MS,
		} );
	}
	await waitForEditedContentMarker( page, marker );

	return [ createContentWitness( marker, 'ui-paste-paragraph' ) ];
}

async function typeRealUserCutCopyParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-cut-copy-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );
	const content = `${ marker } cut copy paragraph`;

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( content, { delay: REAL_USER_TYPING_DELAY_MS } );
	for ( let index = 0; index < content.length; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+C` );
	await page.keyboard.press( `${ MODIFIER_KEY }+X` );
	await waitForEditedContentWithoutMarker( page, marker );
	await page.keyboard.press( `${ MODIFIER_KEY }+V` );
	if ( ! ( await waitForEditedContentMarkerOrFalse( page, marker ) ) ) {
		await page.keyboard.type( content, {
			delay: REAL_USER_TYPING_DELAY_MS,
		} );
	}
	await waitForEditedContentMarker( page, marker );

	return [ createContentWitness( marker, 'ui-cut-copy-paragraph' ) ];
}

async function typeRealUserLinkParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-link-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( `${ marker } link target`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	for ( let index = 0; index < marker.length; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	await page.keyboard.press( `${ MODIFIER_KEY }+K` );
	await page.keyboard.type(
		`https://example.test/rtc/${ encodeURIComponent( marker ) }`
	);
	await page.keyboard.press( 'Enter' );
	await waitForEditedContentMarker( page, marker );
	await waitForParagraphMarkerInInlineElement( page, marker, 'a' ).catch(
		() => undefined
	);

	return [ createContentWitness( marker, 'ui-link-paragraph' ) ];
}

async function typeRealUserListIndent(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-list-indent',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( `- ${ marker } parent`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.press( 'Tab' );
	await page.keyboard.type( `${ marker } child`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	await waitForEditedContentMarker( page, marker );
	await waitForBlockMarker( page, marker, 'core/list' ).catch(
		() => undefined
	);

	return [ createContentWitness( marker, 'ui-list-indent' ) ];
}

async function typeRealUserCompositionParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-composition-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.insertText(
		`${ marker } composition cafe naive こんにちは مرحبا 👋🏼`
	);
	await waitForEditedContentMarker( page, marker );

	return [ createContentWitness( marker, 'ui-composition-paragraph' ) ];
}

async function typeRealUserToolbarFormattedParagraph(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const marker = createOperationMarker( {
		kind: 'ui-toolbar-format-paragraph',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await focusRealUserTypingSurface( page );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( `${ marker } toolbar format`, {
		delay: REAL_USER_TYPING_DELAY_MS,
	} );
	for ( let index = 0; index < marker.length; index++ ) {
		await page.keyboard.press( 'Shift+ArrowLeft' );
	}
	const boldButton = page.getByRole( 'button', { name: /^bold$/i } ).first();
	if (
		await boldButton.isVisible( { timeout: 1000 } ).catch( () => false )
	) {
		await boldButton.click();
	} else {
		await page.keyboard.press( `${ MODIFIER_KEY }+B` );
	}
	await waitForEditedContentMarker( page, marker );
	await waitForParagraphMarkerInInlineElement(
		page,
		marker,
		'strong,b'
	).catch( () => undefined );

	return [ createContentWitness( marker, 'ui-toolbar-format-paragraph' ) ];
}

async function editTableArrayAttributes(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const variant = Math.floor( rng() * 5 );
	const marker = createOperationMarker( {
		kind: 'edit-table-array-attributes',
		seed,
		step,
		suffix: Math.floor( rng() * 1000000 ),
		userIndex,
	} );

	await page.evaluate(
		( {
			fuzzSeed,
			fuzzStep,
			fuzzUserIndex,
			tableMarker,
			tableVariant,
		} ) => {
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
						{
							cells: [
								createCell( tableMarker ),
								createCell( `${ tableMarker } sibling` ),
							],
						},
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
			switch ( tableVariant ) {
				case 0:
					body[ 0 ].cells[ 0 ].content = tableMarker;
					break;
				case 1:
					body[ body.length - 1 ].cells[ 1 ].content = tableMarker;
					break;
				case 2:
					body.push( {
						cells: [
							createCell( tableMarker ),
							createCell( `${ tableMarker } sibling` ),
						],
					} );
					break;
				case 3:
					body.unshift( {
						cells: [
							createCell( tableMarker ),
							createCell( `${ tableMarker } sibling` ),
						],
					} );
					break;
				default:
					if ( body.length > 1 ) {
						body.splice( 1, 1 );
						body[ 0 ].cells[ 0 ].content = tableMarker;
					} else {
						body.push( createRow( tableMarker ) );
					}
					break;
			}

			blockEditor.updateBlockAttributes( block.clientId, { body } );
		},
		{
			fuzzSeed: seed,
			fuzzStep: step,
			fuzzUserIndex: userIndex,
			tableMarker: marker,
			tableVariant: variant,
		}
	);

	return [ createContentWitness( marker, 'edit-table-array-attributes' ) ];
}

async function insertCommonBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );
	const variant = Math.floor( rng() * 5 );
	const marker = `common-block-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;
	const imageUrl =
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2260%22 viewBox=%220 0 120 60%22%3E%3Crect width=%22120%22 height=%2260%22 fill=%22%232267aa%22/%3E%3Ctext x=%2210%22 y=%2235%22 font-size=%2216%22 fill=%22white%22%3ERTC%3C/text%3E%3C/svg%3E';

	await page.evaluate(
		( { blockIndex, blockMarker, blockVariant, blockImageUrl } ) => {
			const createBlock = ( window as any ).wp.blocks.createBlock;
			let block;

			switch ( blockVariant ) {
				case 0: {
					const button = createBlock( 'core/button', {
						text: `Open ${ blockMarker }`,
						url: `https://example.test/${ encodeURIComponent(
							blockMarker
						) }`,
					} );
					block = createBlock( 'core/buttons', {}, [ button ] );
					break;
				}
				case 1:
					block = createBlock( 'core/image', {
						alt: `Image alt ${ blockMarker }`,
						caption: `Image caption ${ blockMarker }`,
						url: blockImageUrl,
					} );
					break;
				case 2:
					block = createBlock( 'core/code', {
						content: `const marker = ${ JSON.stringify(
							blockMarker
						) };\nconsole.log( marker );`,
					} );
					break;
				case 3: {
					const left = createBlock( 'core/column', {}, [
						createBlock( 'core/paragraph', {
							content: `${ blockMarker } left column`,
						} ),
					] );
					const right = createBlock( 'core/column', {}, [
						createBlock( 'core/paragraph', {
							content: `${ blockMarker } right column`,
						} ),
					] );
					block = createBlock( 'core/columns', {}, [ left, right ] );
					break;
				}
				default:
					block = createBlock( 'core/preformatted', {
						content: `${ blockMarker }\npreformatted line`,
					} );
					break;
			}

			( window as any ).wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );
		},
		{
			blockImageUrl: imageUrl,
			blockIndex: index,
			blockMarker: marker,
			blockVariant: variant,
		}
	);
}

async function editCommonBlockAttributes(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const targetIndex = Math.floor( rng() * 1000000 );
	const marker = `common-edit-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;
	const updated = await page.evaluate(
		( { blockMarker, commonTargetIndex } ) => {
			const blocks = ( window as any ).wp.data
				.select( 'core/block-editor' )
				.getBlocks();
			const candidates: Array< {
				attributes: Record< string, unknown >;
				clientId: string;
				name: string;
			} > = [];
			const visit = ( currentBlocks: Array< any > ) => {
				for ( const block of currentBlocks ) {
					if (
						[
							'core/button',
							'core/buttons',
							'core/code',
							'core/column',
							'core/columns',
							'core/image',
							'core/preformatted',
						].includes( block.name )
					) {
						candidates.push( block );
					}
					visit( block.innerBlocks ?? [] );
				}
			};

			visit( blocks );

			if ( candidates.length === 0 ) {
				return false;
			}

			const blockEditor = ( window as any ).wp.data.dispatch(
				'core/block-editor'
			);
			const target = candidates[ commonTargetIndex % candidates.length ];

			switch ( target.name ) {
				case 'core/button':
					blockEditor.updateBlockAttributes( target.clientId, {
						text: `Button ${ blockMarker }`,
						url: `https://example.test/updated/${ encodeURIComponent(
							blockMarker
						) }`,
					} );
					break;
				case 'core/buttons':
					blockEditor.updateBlockAttributes( target.clientId, {
						layout: {
							justifyContent:
								commonTargetIndex % 2 === 0
									? 'center'
									: 'right',
							type: 'flex',
						},
					} );
					break;
				case 'core/image':
					blockEditor.updateBlockAttributes( target.clientId, {
						alt: `Updated image alt ${ blockMarker }`,
						caption: `Updated image caption ${ blockMarker }`,
					} );
					break;
				case 'core/code':
				case 'core/preformatted':
					blockEditor.updateBlockAttributes( target.clientId, {
						content: `${ blockMarker }\nupdated formatted content`,
					} );
					break;
				case 'core/column':
				case 'core/columns':
					blockEditor.updateBlockAttributes( target.clientId, {
						verticalAlignment:
							commonTargetIndex % 2 === 0 ? 'center' : 'bottom',
					} );
					break;
			}

			return true;
		},
		{
			blockMarker: marker,
			commonTargetIndex: targetIndex,
		}
	);

	if ( ! updated ) {
		await insertCommonBlock( page, seed, step, userIndex, rng );
	}
}

async function insertBlockGauntletBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );
	const variant = Math.floor( rng() * 13 );
	const marker = `gauntlet-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;
	const imageUrl =
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2260%22 viewBox=%220 0 120 60%22%3E%3Crect width=%22120%22 height=%2260%22 fill=%22%23267745%22/%3E%3Ctext x=%2210%22 y=%2235%22 font-size=%2216%22 fill=%22white%22%3ERTC%3C/text%3E%3C/svg%3E';

	await page.evaluate(
		( { blockImageUrl, blockIndex, blockMarker, blockVariant } ) => {
			const wp = ( window as any ).wp;
			const createBlock = wp.blocks.createBlock;
			const hasBlockType = ( name: string ) =>
				Boolean( wp.blocks.getBlockType( name ) );
			const paragraphBlock = ( content: string ) =>
				createBlock( 'core/paragraph', { content } );
			const safeBlock = (
				name: string,
				attributes: Record< string, unknown > = {},
				innerBlocks: Array< any > = []
			) =>
				hasBlockType( name )
					? createBlock( name, attributes, innerBlocks )
					: paragraphBlock(
							`${ blockMarker } fallback for ${ name }`
					  );
			let block;

			switch ( blockVariant ) {
				case 0:
					block = safeBlock(
						'core/details',
						{ summary: `Details ${ blockMarker }` },
						[ paragraphBlock( `${ blockMarker } details body` ) ]
					);
					break;
				case 1:
					block = safeBlock(
						'core/cover',
						{
							dimRatio: 40,
							isDark: true,
							overlayColor: 'black',
						},
						[ paragraphBlock( `${ blockMarker } cover text` ) ]
					);
					break;
				case 2:
					block = safeBlock(
						'core/media-text',
						{
							mediaPosition: 'left',
							mediaType: 'image',
							mediaUrl: blockImageUrl,
						},
						[ paragraphBlock( `${ blockMarker } media text` ) ]
					);
					break;
				case 3:
					block = safeBlock(
						'core/gallery',
						{
							caption: `Gallery ${ blockMarker }`,
						},
						[
							safeBlock( 'core/image', {
								alt: `Gallery image ${ blockMarker }`,
								caption: `Gallery image caption ${ blockMarker }`,
								url: blockImageUrl,
							} ),
						]
					);
					break;
				case 4:
					block = safeBlock( 'core/file', {
						fileName: `File ${ blockMarker }`,
						href: blockImageUrl,
						textLinkHref: blockImageUrl,
					} );
					break;
				case 5:
					block = safeBlock( 'core/social-links', {}, [
						safeBlock( 'core/social-link', {
							service: 'wordpress',
							url: `https://example.test/${ encodeURIComponent(
								blockMarker
							) }`,
						} ),
					] );
					break;
				case 6:
					block = safeBlock( 'core/spacer', {
						height: `${ 48 + blockMarker.length }px`,
					} );
					break;
				case 7:
					block = safeBlock( 'core/separator', {
						opacity: 'css',
					} );
					break;
				case 8:
					block = safeBlock( 'core/verse', {
						content: `${ blockMarker }\nverse line two`,
					} );
					break;
				case 9:
					block = safeBlock( 'core/html', {
						content: `<p>${ blockMarker } html</p>`,
					} );
					break;
				case 10:
					block = safeBlock( 'core/shortcode', {
						text: `[gallery ids="${ blockMarker }"]`,
					} );
					break;
				case 11:
					block = safeBlock( 'core/more', {
						customText: `Read more ${ blockMarker }`,
					} );
					break;
				default:
					block = safeBlock(
						'core/quote',
						{
							citation: `Citation ${ blockMarker }`,
						},
						[ paragraphBlock( `${ blockMarker } quote text` ) ]
					);
					break;
			}

			wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );
		},
		{
			blockImageUrl: imageUrl,
			blockIndex: index,
			blockMarker: marker,
			blockVariant: variant,
		}
	);
}

async function editBlockGauntletAttributes(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const targetIndex = Math.floor( rng() * 1000000 );
	const marker = `gauntlet-edit-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;
	const updated = await page.evaluate(
		( { blockMarker, gauntletTargetIndex } ) => {
			const wp = ( window as any ).wp;
			const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
			const candidates: Array< {
				attributes: Record< string, unknown >;
				clientId: string;
				innerBlocks?: Array< any >;
				name: string;
			} > = [];
			const visit = ( currentBlocks: Array< any > ) => {
				for ( const block of currentBlocks ) {
					if (
						[
							'core/audio',
							'core/cover',
							'core/details',
							'core/file',
							'core/gallery',
							'core/html',
							'core/image',
							'core/list-item',
							'core/media-text',
							'core/more',
							'core/quote',
							'core/separator',
							'core/shortcode',
							'core/social-link',
							'core/social-links',
							'core/spacer',
							'core/verse',
							'core/video',
						].includes( block.name )
					) {
						candidates.push( block );
					}
					visit( block.innerBlocks ?? [] );
				}
			};

			visit( blocks );

			if ( candidates.length === 0 ) {
				return false;
			}

			const target =
				candidates[ gauntletTargetIndex % candidates.length ];
			const blockEditor = wp.data.dispatch( 'core/block-editor' );

			switch ( target.name ) {
				case 'core/audio':
				case 'core/video':
				case 'core/gallery':
				case 'core/image':
				case 'core/embed':
					blockEditor.updateBlockAttributes( target.clientId, {
						alt: `Alt ${ blockMarker }`,
						caption: `Caption ${ blockMarker }`,
					} );
					break;
				case 'core/cover':
					blockEditor.updateBlockAttributes( target.clientId, {
						dimRatio: 20 + ( gauntletTargetIndex % 70 ),
						overlayColor:
							gauntletTargetIndex % 2 === 0
								? 'black'
								: 'vivid-red',
					} );
					break;
				case 'core/details':
					blockEditor.updateBlockAttributes( target.clientId, {
						summary: `Summary ${ blockMarker }`,
					} );
					break;
				case 'core/file':
					blockEditor.updateBlockAttributes( target.clientId, {
						fileName: `File ${ blockMarker }`,
						textLinkHref: `https://example.test/file/${ encodeURIComponent(
							blockMarker
						) }`,
					} );
					break;
				case 'core/html':
					blockEditor.updateBlockAttributes( target.clientId, {
						content: `<div>${ blockMarker } html updated</div>`,
					} );
					break;
				case 'core/list-item':
					blockEditor.updateBlockAttributes( target.clientId, {
						content: `List item ${ blockMarker }`,
					} );
					break;
				case 'core/media-text':
					blockEditor.updateBlockAttributes( target.clientId, {
						mediaPosition:
							gauntletTargetIndex % 2 === 0 ? 'left' : 'right',
					} );
					break;
				case 'core/more':
					blockEditor.updateBlockAttributes( target.clientId, {
						customText: `More ${ blockMarker }`,
					} );
					break;
				case 'core/quote':
					blockEditor.updateBlockAttributes( target.clientId, {
						citation: `Citation ${ blockMarker }`,
					} );
					break;
				case 'core/separator':
					blockEditor.updateBlockAttributes( target.clientId, {
						opacity:
							gauntletTargetIndex % 2 === 0
								? 'css'
								: 'alpha-channel',
					} );
					break;
				case 'core/shortcode':
					blockEditor.updateBlockAttributes( target.clientId, {
						text: `[caption id="${ blockMarker }"]`,
					} );
					break;
				case 'core/social-link':
					blockEditor.updateBlockAttributes( target.clientId, {
						url: `https://example.test/social/${ encodeURIComponent(
							blockMarker
						) }`,
					} );
					break;
				case 'core/social-links':
					blockEditor.updateBlockAttributes( target.clientId, {
						iconColor: 'white',
						iconColorValue: '#ffffff',
						size:
							gauntletTargetIndex % 2 === 0
								? 'has-small-icon-size'
								: 'has-normal-icon-size',
					} );
					break;
				case 'core/spacer':
					blockEditor.updateBlockAttributes( target.clientId, {
						height: `${ 40 + ( gauntletTargetIndex % 160 ) }px`,
					} );
					break;
				case 'core/verse':
					blockEditor.updateBlockAttributes( target.clientId, {
						content: `${ blockMarker }\nupdated verse`,
					} );
					break;
			}

			return true;
		},
		{
			blockMarker: marker,
			gauntletTargetIndex: targetIndex,
		}
	);

	if ( ! updated ) {
		await insertBlockGauntletBlock( page, seed, step, userIndex, rng );
	}
}

async function insertAsyncServerBackedBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );
	const variant = Math.floor( rng() * 8 );
	const marker = `async-server-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;

	await page.evaluate(
		( { blockIndex, blockMarker, blockVariant } ) => {
			const wp = ( window as any ).wp;
			const createBlock = wp.blocks.createBlock;
			const hasBlockType = ( name: string ) =>
				Boolean( wp.blocks.getBlockType( name ) );
			const paragraphBlock = ( content: string ) =>
				createBlock( 'core/paragraph', { content } );
			const safeBlock = (
				name: string,
				attributes: Record< string, unknown > = {},
				innerBlocks: Array< any > = []
			) =>
				hasBlockType( name )
					? createBlock(
							name,
							{
								className: `rtc-${ blockMarker }`,
								...attributes,
							},
							innerBlocks
					  )
					: paragraphBlock(
							`${ blockMarker } fallback for ${ name }`
					  );
			let block;

			switch ( blockVariant ) {
				case 0:
					block = safeBlock( 'core/embed', {
						caption: `Embed ${ blockMarker }`,
						providerNameSlug: 'youtube',
						responsive: true,
						type: 'video',
						url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					} );
					break;
				case 1:
					block = safeBlock( 'core/latest-posts', {
						displayPostContent: true,
						postsToShow: 3,
					} );
					break;
				case 2:
					block = safeBlock( 'core/query', {
						query: {
							inherit: false,
							offset: 0,
							order: 'desc',
							orderBy: 'date',
							perPage: 3,
							postType: 'post',
						},
					} );
					break;
				case 3:
					block = safeBlock( 'core/search', {
						buttonText: `Search ${ blockMarker }`,
						label: `Search label ${ blockMarker }`,
					} );
					break;
				case 4:
					block = safeBlock( 'core/calendar', {} );
					break;
				case 5:
					block = safeBlock( 'core/categories', {
						displayAsDropdown: blockMarker.length % 2 === 0,
					} );
					break;
				case 6:
					block = safeBlock( 'core/template-part', {
						area: 'uncategorized',
						slug: `rtc-template-${ blockMarker.slice( -8 ) }`,
						theme: 'tt1-blocks',
					} );
					break;
				default:
					block = safeBlock( 'core/block', {
						ref: Math.abs(
							Array.from( blockMarker ).reduce(
								( total, char ) => total + char.charCodeAt( 0 ),
								0
							)
						),
					} );
					break;
			}

			wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );
		},
		{
			blockIndex: index,
			blockMarker: marker,
			blockVariant: variant,
		}
	);

	return [ createContentWitness( marker, 'insert-async-server-block' ) ];
}

async function insertMediaCrossEntityBlock(
	page: Page,
	seed: number,
	step: number,
	userIndex: number,
	rng: Random
) {
	const blocks = await getTopLevelBlocks( page );
	const index = Math.floor( rng() * ( blocks.length + 1 ) );
	const variant = Math.floor( rng() * 5 );
	const marker = `media-entity-${ seed }-${ step }-${ userIndex }-${ Math.floor(
		rng() * 1000000
	) }`;

	const result = await page.evaluate(
		async ( { blockIndex, blockMarker, blockVariant } ) => {
			const wp = ( window as any ).wp;
			const apiSettings = ( window as any ).wpApiSettings ?? {};
			const apiRoot = apiSettings.root ?? '/wp-json/';
			const nonce = apiSettings.nonce ?? '';
			const createBlock = wp.blocks.createBlock;
			const hasBlockType = ( name: string ) =>
				Boolean( wp.blocks.getBlockType( name ) );
			const safeBlock = (
				name: string,
				attributes: Record< string, unknown > = {},
				innerBlocks: Array< any > = []
			) =>
				hasBlockType( name )
					? createBlock(
							name,
							{
								className: `rtc-${ blockMarker }`,
								...attributes,
							},
							innerBlocks
					  )
					: createBlock( 'core/paragraph', {
							content: `${ blockMarker } fallback for ${ name }`,
					  } );
			const restUrl = ( restPath: string ) =>
				new URL( restPath.replace( /^\//, '' ), apiRoot ).toString();
			const jsonHeaders: Record< string, string > = {
				'Content-Type': 'application/json',
			};
			const uploadHeaders: Record< string, string > = {};
			if ( nonce ) {
				jsonHeaders[ 'X-WP-Nonce' ] = nonce;
				uploadHeaders[ 'X-WP-Nonce' ] = nonce;
			}
			const decodeBase64 = ( value: string ) =>
				Uint8Array.from( window.atob( value ), ( char ) =>
					char.charCodeAt( 0 )
				);
			const pngBytes = decodeBase64(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
			);
			const file = new File( [ pngBytes ], `${ blockMarker }.png`, {
				type: 'image/png',
			} );
			const formData = new FormData();
			formData.append( 'file', file );
			formData.append( 'title', `RTC media ${ blockMarker }` );
			formData.append( 'alt_text', `RTC media ${ blockMarker }` );
			formData.append( 'caption', blockMarker );
			const mediaResponse = await window.fetch(
				restUrl( 'wp/v2/media' ),
				{
					body: formData,
					credentials: 'same-origin',
					headers: uploadHeaders,
					method: 'POST',
				}
			);
			if ( ! mediaResponse.ok ) {
				throw new Error(
					`media upload failed ${
						mediaResponse.status
					}: ${ await mediaResponse.text() }`
				);
			}
			const media = await mediaResponse.json();
			const mediaId = Number( media.id ) || 0;
			const mediaUrl =
				media.source_url ??
				media.guid?.rendered ??
				media.media_details?.file;
			if ( ! mediaId || ! mediaUrl ) {
				throw new Error(
					`media upload returned incomplete response for ${ blockMarker }`
				);
			}

			let reusableId = 0;
			let reusableError = '';
			const reusableContent = `<!-- wp:paragraph --><p>${ blockMarker } reusable block entity</p><!-- /wp:paragraph -->`;
			const reusableResponse = await window.fetch(
				restUrl( 'wp/v2/blocks' ),
				{
					body: JSON.stringify( {
						content: reusableContent,
						status: 'publish',
						title: `RTC reusable ${ blockMarker }`,
					} ),
					credentials: 'same-origin',
					headers: jsonHeaders,
					method: 'POST',
				}
			);
			if ( reusableResponse.ok ) {
				const reusable = await reusableResponse.json();
				reusableId = Number( reusable.id ) || 0;
			} else {
				reusableError = `wp/v2/blocks ${
					reusableResponse.status
				}: ${ await reusableResponse.text() }`;
			}

			let block;
			switch ( blockVariant ) {
				case 0:
					block = safeBlock( 'core/image', {
						alt: `Uploaded image ${ blockMarker }`,
						caption: blockMarker,
						id: mediaId,
						url: mediaUrl,
					} );
					break;
				case 1:
					block = safeBlock(
						'core/gallery',
						{
							caption: `Uploaded gallery ${ blockMarker }`,
							ids: [ mediaId ],
						},
						[
							safeBlock( 'core/image', {
								alt: `Uploaded gallery image ${ blockMarker }`,
								caption: blockMarker,
								id: mediaId,
								url: mediaUrl,
							} ),
						]
					);
					break;
				case 2:
					block = safeBlock( 'core/file', {
						fileName: `Uploaded file ${ blockMarker }`,
						href: mediaUrl,
						id: mediaId,
						textLinkHref: mediaUrl,
					} );
					break;
				case 3:
					block = safeBlock(
						'core/media-text',
						{
							mediaAlt: `Uploaded media-text ${ blockMarker }`,
							mediaId,
							mediaType: 'image',
							mediaUrl,
						},
						[
							createBlock( 'core/paragraph', {
								content: `${ blockMarker } media-text body`,
							} ),
						]
					);
					break;
				default:
					block = reusableId
						? safeBlock( 'core/block', { ref: reusableId } )
						: createBlock( 'core/paragraph', {
								content: `${ blockMarker } reusable fallback ${ reusableError }`,
						  } );
					break;
			}

			wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock( block, blockIndex );

			const blockNames: string[] = [];
			const visit = ( currentBlock: any ) => {
				blockNames.push( currentBlock.name );
				for ( const innerBlock of currentBlock.innerBlocks ?? [] ) {
					visit( innerBlock );
				}
			};
			visit( block );

			return {
				blockNames,
				mediaId,
				mediaUrl,
				reusableCreated: reusableId > 0,
				reusableError,
				reusableId,
			};
		},
		{
			blockIndex: index,
			blockMarker: marker,
			blockVariant: variant,
		}
	);

	const historyEvents: Array< Omit< BehaviorHistoryEvent, 'at' > > = [
		{
			details: {
				mediaId: result.mediaId,
				mediaUrl: result.mediaUrl,
			},
			label: 'media-upload',
			phase: 'media-cross-entity',
			status: 'ok',
			step,
			userIndex,
		},
		{
			details: {
				blockNames: result.blockNames,
				variant,
			},
			label: 'insert-blocks',
			phase: 'media-cross-entity',
			status: 'ok',
			step,
			userIndex,
		},
	];

	historyEvents.push(
		result.reusableCreated
			? {
					details: { reusableId: result.reusableId },
					label: 'reusable-block',
					phase: 'media-cross-entity',
					status: 'ok',
					step,
					userIndex,
			  }
			: {
					details: { error: result.reusableError },
					error: result.reusableError,
					label: 'reusable-block',
					phase: 'media-cross-entity',
					status: 'fail',
					step,
					userIndex,
			  }
	);

	return {
		historyEvents,
		witnesses: [ createContentWitness( marker, 'media-cross-entity' ) ],
	};
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

async function autosaveDraft( page: Page, { local }: { local: boolean } ) {
	await page.evaluate(
		( options ) => {
			( window as any ).wp.data
				.dispatch( 'core/editor' )
				.autosave( options );
		},
		{ local }
	);

	await page.waitForFunction(
		() => {
			const editor = ( window as any ).wp.data.select( 'core/editor' );
			return ! ( editor.isAutosavingPost?.() || editor.isSavingPost?.() );
		},
		undefined,
		{ timeout: CONVERGENCE_TIMEOUT_MS }
	);
}

async function waitForLocalAutosaveMarker(
	page: Page,
	postId: number,
	marker: string
) {
	await page.waitForFunction(
		( { expectedMarker, expectedPostId } ) =>
			window.sessionStorage
				.getItem( `wp-autosave-block-editor-post-${ expectedPostId }` )
				?.includes( expectedMarker ),
		{ expectedMarker: marker, expectedPostId: postId },
		{ timeout: CONVERGENCE_TIMEOUT_MS }
	);
}

async function autosaveCheckpointAndVerify( {
	collaborationUtils,
	marker,
	postId,
	saver,
}: {
	collaborationUtils: CollaborationUtils;
	marker: string;
	postId: number;
	saver: PageRef;
} ) {
	await insertCheckpointMarker( saver.page, marker );
	await collaborationUtils.waitForConvergence( {
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );
	await autosaveDraft( saver.page, { local: false } );
	await autosaveDraft( saver.page, { local: true } );
	await waitForLocalAutosaveMarker( saver.page, postId, marker );
}

async function maybeRunFinalUiWitnessSweep( {
	collaborationUtils,
	coverage,
	ledger,
	pages,
	rng,
	seed,
}: {
	collaborationUtils: CollaborationUtils;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	pages: PageRef[];
	rng: Random;
	seed: number;
} ) {
	if ( ! ENABLE_FINAL_UI_WITNESS_SWEEP || pages.length === 0 ) {
		return;
	}

	const phase = 'final-ui-witness-sweep';
	const step = STEP_COUNT;
	recordHistory( coverage, {
		phase,
		status: 'invoke',
		step,
	} );

	try {
		const witnessSets = await Promise.all(
			pages.map( ( { page, userIndex } ) =>
				typeRealUserParagraph( page, seed, step, userIndex, rng, {
					kind: 'final-ui-witness',
				} )
			)
		);
		const state = await collaborationUtils.waitForConvergence( {
			includeCrdtDocument: true,
			timeout: CONVERGENCE_TIMEOUT_MS,
		} );

		for ( const [ index, pageRef ] of pages.entries() ) {
			acknowledgeOperationWitnesses( {
				actionLabel: 'final-ui-witness-sweep',
				coverage,
				ledger,
				phase,
				state,
				step,
				userIndex: pageRef.userIndex,
				witnesses: witnessSets[ index ] ?? [],
			} );
		}

		assertOperationLedgerPreserved( {
			coverage,
			ledger,
			phase: 'final-ui-witness-sweep-convergence',
			state,
			step,
		} );
		await assertEditorInvariants( {
			coverage,
			pages,
			phase: 'final-ui-witness-sweep-convergence',
			step,
		} );
		recordHistory( coverage, {
			details: { userCount: pages.length },
			phase,
			status: 'ok',
			step,
		} );
	} catch ( error ) {
		recordHistory( coverage, {
			details: { error: String( error ) },
			phase,
			status: 'fail',
			step,
		} );
		throw error;
	}
}

async function maybeRunFinalPersistenceOracle( {
	collaborationUtils,
	coverage,
	ledger,
	pages,
	postId,
	requestUtils,
	saver,
}: {
	collaborationUtils: CollaborationUtils;
	coverage: BehaviorCoverage;
	ledger: OperationLedgerState;
	pages: PageRef[];
	postId: number;
	requestUtils: RestRequestUtils;
	saver: PageRef;
} ) {
	if ( FINAL_PERSISTENCE_ORACLE_MODE === 'off' ) {
		return;
	}

	const phase = 'final-persistence-oracle';
	recordHistory( coverage, {
		phase,
		status: 'invoke',
		userIndex: saver.userIndex,
	} );

	const recordCheck = (
		name: string,
		status: BehaviorInvariantEvent[ 'status' ],
		details?: Record< string, unknown >
	) => {
		recordInvariantEvent( coverage, {
			details,
			name,
			phase,
			status,
		} );
	};
	const signalStatus = ( hasSignal: boolean ) => {
		if ( ! hasSignal ) {
			return 'ok';
		}

		return FINAL_PERSISTENCE_ORACLE_MODE === 'fail' ? 'fail' : 'observed';
	};
	const failures: Array< {
		details?: Record< string, unknown >;
		name: string;
	} > = [];

	await saveDraft( saver.page );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: CONVERGENCE_TIMEOUT_MS,
	} );

	const finalCanonicalEditedContentByPage = await Promise.all(
		pages.map( ( { page } ) => getCanonicalEditedPostContent( page ) )
	);
	const firstCanonicalEdited = finalCanonicalEditedContentByPage[ 0 ];
	const canonicalEditedDivergences = finalCanonicalEditedContentByPage
		.map( ( canonicalContent, pageIndex ) => ( {
			canonicalContentHash: hashString( canonicalContent ),
			pageIndex,
		} ) )
		.filter(
			( snapshot, pageIndex ) =>
				finalCanonicalEditedContentByPage[ pageIndex ] !==
				firstCanonicalEdited
		);

	if ( canonicalEditedDivergences.length > 0 ) {
		failures.push( {
			details: { pages: canonicalEditedDivergences },
			name: 'final-persistence-live-canonical-convergence',
		} );
	}
	recordCheck(
		'final-persistence-live-canonical-convergence',
		signalStatus( canonicalEditedDivergences.length > 0 ),
		canonicalEditedDivergences.length > 0
			? { pages: canonicalEditedDivergences }
			: undefined
	);

	const persistedPost = await getPersistedPost( requestUtils, postId );
	const persistedContent = getRawFieldValue( persistedPost.content );
	const persistedTitle = getRawFieldValue( persistedPost.title );
	const canonicalPersistedContent = await getCanonicalPostContent(
		saver.page,
		persistedContent
	);
	const canonicalEditedContent = await getCanonicalEditedPostContent(
		saver.page
	);
	const editedTitle = await getEditedPostTitle( saver.page );
	const contentMatches = canonicalPersistedContent === canonicalEditedContent;
	const titleMatches = persistedTitle === editedTitle;
	const hasCrdtDocument = Boolean( persistedPost.meta?._crdt_document );

	if ( ! contentMatches ) {
		failures.push( {
			details: {
				editedHash: hashString( canonicalEditedContent ),
				persistedHash: hashString( canonicalPersistedContent ),
			},
			name: 'final-persistence-canonical-content',
		} );
	}
	recordCheck(
		'final-persistence-canonical-content',
		signalStatus( ! contentMatches ),
		contentMatches
			? undefined
			: {
					editedHash: hashString( canonicalEditedContent ),
					persistedHash: hashString( canonicalPersistedContent ),
			  }
	);

	if ( ! titleMatches ) {
		failures.push( {
			details: {
				editedHash: hashString( editedTitle ),
				persistedHash: hashString( persistedTitle ),
			},
			name: 'final-persistence-title',
		} );
	}
	recordCheck(
		'final-persistence-title',
		signalStatus( ! titleMatches ),
		titleMatches
			? undefined
			: {
					editedHash: hashString( editedTitle ),
					persistedHash: hashString( persistedTitle ),
			  }
	);

	if ( ! hasCrdtDocument ) {
		failures.push( {
			name: 'final-persistence-crdt-document-present',
		} );
	}
	recordCheck(
		'final-persistence-crdt-document-present',
		signalStatus( ! hasCrdtDocument )
	);

	if ( FINAL_PERSISTENCE_ORACLE_MODE === 'fail' ) {
		await assertOperationLedgerPersisted( {
			coverage,
			ledger,
			phase,
			postId,
			requestUtils,
		} );
	}

	let publishedStatus: string | undefined;
	if ( ENABLE_FINAL_PUBLISH_ORACLE ) {
		recordHistory( coverage, {
			phase: 'final-persistence-publish',
			status: 'invoke',
			userIndex: saver.userIndex,
		} );
		await saver.editor.publishPost();
		const publishedPost = await waitForPersistedPostStatus(
			requestUtils,
			postId,
			'publish'
		);
		publishedStatus = publishedPost.status;

		if ( FINAL_PERSISTENCE_ORACLE_MODE === 'fail' ) {
			await assertOperationLedgerPersisted( {
				coverage,
				ledger,
				phase: 'final-persistence-published-rest',
				postId,
				requestUtils,
			} );
		}

		for ( const { page } of pages ) {
			await reloadAndWait( page, collaborationUtils );
		}

		const postPublishReloadState =
			await collaborationUtils.waitForConvergence( {
				includeCrdtDocument: true,
				timeout: CONVERGENCE_TIMEOUT_MS,
			} );
		assertOperationLedgerPreserved( {
			coverage,
			ledger,
			phase: 'final-persistence-post-publish-reload',
			state: postPublishReloadState,
		} );
		await assertEditorInvariants( {
			coverage,
			pages,
			phase: 'final-persistence-post-publish-reload',
		} );
		recordHistory( coverage, {
			details: { status: publishedStatus },
			phase: 'final-persistence-publish',
			status: 'ok',
			userIndex: saver.userIndex,
		} );
	}

	recordHistory( coverage, {
		details: {
			mode: FINAL_PERSISTENCE_ORACLE_MODE,
			persistedContentHash: hashString( canonicalPersistedContent ),
			publishedStatus,
		},
		phase,
		status: failures.length > 0 ? 'fail' : 'ok',
		userIndex: saver.userIndex,
	} );

	if ( FINAL_PERSISTENCE_ORACLE_MODE === 'fail' && failures.length > 0 ) {
		throw new Error(
			`RTC final persistence oracle failure: ${ JSON.stringify(
				failures
			) }`
		);
	}
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
	if ( COLLABORATOR_MODE !== 'same-user' && ! SOFT_DISCOVERY_BOOTSTRAP ) {
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
		label: 'insert-common-block',
		run: async ( page, seed, step, userIndex, rng ) =>
			insertCommonBlock( page, seed, step, userIndex, rng ),
	},
	{
		label: 'edit-common-block-attributes',
		run: async ( page, seed, step, userIndex, rng ) =>
			editCommonBlockAttributes( page, seed, step, userIndex, rng ),
	},
	{
		label: 'insert-block-gauntlet-block',
		run: async ( page, seed, step, userIndex, rng ) =>
			insertBlockGauntletBlock( page, seed, step, userIndex, rng ),
	},
	{
		label: 'edit-block-gauntlet-attributes',
		run: async ( page, seed, step, userIndex, rng ) =>
			editBlockGauntletAttributes( page, seed, step, userIndex, rng ),
	},
	{
		label: 'insert-async-server-block',
		run: async ( page, seed, step, userIndex, rng ) =>
			insertAsyncServerBackedBlock( page, seed, step, userIndex, rng ),
	},
	{
		label: 'insert-media-cross-entity-block',
		run: async ( page, seed, step, userIndex, rng ) =>
			insertMediaCrossEntityBlock( page, seed, step, userIndex, rng ),
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
	{
		label: 'ui-type-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-format-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserFormattedParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-type-title',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserTitle( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-undo-redo-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserUndoRedoParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-heading-shortcut',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserHeadingShortcut( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-paste-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserPastedParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-cut-copy-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserCutCopyParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-link-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserLinkParagraph( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-list-indent',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserListIndent( page, seed, step, userIndex, rng ),
	},
	{
		label: 'ui-composition-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserCompositionParagraph(
				page,
				seed,
				step,
				userIndex,
				rng
			),
	},
	{
		label: 'ui-toolbar-format-paragraph',
		run: async ( page, seed, step, userIndex, rng ) =>
			typeRealUserToolbarFormattedParagraph(
				page,
				seed,
				step,
				userIndex,
				rng
			),
	},
	{
		label: 'ui-table-cell-edit',
		run: async ( page, seed, step, userIndex, rng ) =>
			editTableArrayAttributes( page, seed, step, userIndex, rng ),
	},
];

function getActionsByWeightedLabels( labels: string[] ): PageAction[] {
	const actionsByLabel = new Map(
		ACTIONS.map( ( action ) => [ action.label, action ] )
	);

	return labels.map( ( label ) => {
		const action = actionsByLabel.get( label );

		if ( ! action ) {
			throw new Error( `Unknown fuzz action label "${ label }".` );
		}

		return action;
	} );
}

function getActiveActions(): PageAction[] {
	if (
		ACTION_PROFILE === 'full' ||
		ACTION_PROFILE === 'parser-serialization'
	) {
		const profileExcludedActionLabels = new Set( [
			'ui-type-paragraph',
			'ui-format-paragraph',
			'ui-type-title',
			'ui-undo-redo-paragraph',
			'ui-heading-shortcut',
			'ui-paste-paragraph',
			'ui-cut-copy-paragraph',
			'ui-link-paragraph',
			'ui-list-indent',
			'ui-composition-paragraph',
			'ui-toolbar-format-paragraph',
			'ui-table-cell-edit',
		] );

		if ( ! DISABLE_PARSER_STRESS ) {
			return ACTIONS.filter(
				( action ) => ! profileExcludedActionLabels.has( action.label )
			);
		}

		for ( const label of [
			'reparse-edited-content',
			'append-parser-stress-content',
		] ) {
			profileExcludedActionLabels.add( label );
		}

		return ACTIONS.filter(
			( action ) => ! profileExcludedActionLabels.has( action.label )
		);
	}

	if ( ACTION_PROFILE === 'parser-transform' ) {
		return getActionsByWeightedLabels( [
			'append-parser-stress-content',
			'append-parser-stress-content',
			'append-parser-stress-content',
			'reparse-edited-content',
			'reparse-edited-content',
			'insert-paragraph',
			'edit-paragraph',
			'insert-heading',
			'delete-block',
			'move-block',
		] );
	}

	if ( ACTION_PROFILE === 'real-user-editing' ) {
		return getActionsByWeightedLabels(
			REAL_USER_EDITING_SEQUENCE ?? REAL_USER_EDITING_ACTION_LABELS
		);
	}

	if ( ACTION_PROFILE === 'async-server-blocks' ) {
		return getActionsByWeightedLabels( [
			'insert-async-server-block',
			'insert-async-server-block',
			'insert-async-server-block',
			'edit-block-gauntlet-attributes',
			'insert-common-block',
			'move-block',
		] );
	}

	if ( ACTION_PROFILE === 'media-cross-entity' ) {
		return getActionsByWeightedLabels( [
			'insert-media-cross-entity-block',
			'insert-media-cross-entity-block',
			'insert-media-cross-entity-block',
			'insert-media-cross-entity-block',
			'edit-block-gauntlet-attributes',
			'move-block',
		] );
	}

	if ( ACTION_PROFILE === 'common-blocks' ) {
		const commonBlockActionLabels = new Set( [
			'insert-common-block',
			'edit-common-block-attributes',
			'insert-block-gauntlet-block',
			'edit-block-gauntlet-attributes',
			'insert-paragraph',
			'append-paragraph',
			'move-block',
			'delete-block',
			'move-block-into-group',
			'edit-nested-paragraph',
		] );

		return ACTIONS.filter( ( action ) =>
			commonBlockActionLabels.has( action.label )
		);
	}

	if ( ACTION_PROFILE === 'block-gauntlet' ) {
		return getActionsByWeightedLabels( [
			'insert-block-gauntlet-block',
			'insert-block-gauntlet-block',
			'insert-block-gauntlet-block',
			'edit-block-gauntlet-attributes',
			'edit-block-gauntlet-attributes',
			'edit-block-gauntlet-attributes',
			'insert-block-gauntlet-block',
			'edit-block-gauntlet-attributes',
			'insert-common-block',
			'edit-common-block-attributes',
			'insert-nested-group',
			'edit-nested-paragraph',
			'move-block',
			'move-block-into-group',
			'delete-block',
			'delete-nested-block',
			'reparse-edited-content',
		] );
	}

	if (
		ACTION_PROFILE === 'persistence' ||
		ACTION_PROFILE === 'persistence-no-title' ||
		ACTION_PROFILE === 'revision-persistence'
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

	if ( ACTION_PROFILE === 'large-post-three-user-http-lifecycle' ) {
		return getActionsByWeightedLabels( [
			'ui-type-paragraph',
			'ui-type-paragraph',
			'ui-type-title',
			'ui-undo-redo-paragraph',
			'ui-paste-paragraph',
			'ui-link-paragraph',
			'ui-list-indent',
			'ui-toolbar-format-paragraph',
			'ui-table-cell-edit',
			'concurrent-paragraphs',
			'move-block',
			'move-block',
			'edit-table-array-attributes',
			'insert-nested-group',
			'move-block-into-group',
			'append-paragraph',
			'insert-heading',
			'insert-async-server-block',
		] );
	}

	if (
		ACTION_PROFILE === 'structure' ||
		ACTION_PROFILE === 'three-user-late-join' ||
		ACTION_PROFILE === 'multi-reload-lifecycle' ||
		ACTION_PROFILE === 'permissions-auth-locks' ||
		ACTION_PROFILE === 'long-session-large-doc'
	) {
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
			'insert-async-server-block',
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

function pickActiveAction(
	rng: Random,
	actions: PageAction[],
	previousActionLabel?: string,
	step = 0
) {
	if (
		ACTION_PROFILE === 'real-user-editing' &&
		REAL_USER_EDITING_SEQUENCE
	) {
		const expectedLabel =
			REAL_USER_EDITING_SEQUENCE[
				step % REAL_USER_EDITING_SEQUENCE.length
			];
		const expectedAction = actions.find(
			( action ) => action.label === expectedLabel
		);
		if ( expectedAction ) {
			return expectedAction;
		}
	}

	if (
		ACTION_PROFILE === 'real-user-editing' &&
		previousActionLabel === 'ui-type-paragraph'
	) {
		const alternatives = actions.filter(
			( action ) => action.label !== previousActionLabel
		);
		if ( alternatives.length > 0 ) {
			return pick( rng, alternatives );
		}
	}

	return pick( rng, actions );
}

const ACTIVE_ACTIONS = getActiveActions();

test.describe( 'Collaboration - Seeded Fuzzing', () => {
	test.describe.configure( {
		mode: 'parallel',
		timeout: TEST_TIMEOUT_MS,
	} );

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
			test.setTimeout( TEST_TIMEOUT_MS );

			const rng = createRng( seed );
			const behavior = createBehaviorCoverage( seed );
			const operationLedger = createOperationLedger( behavior );
			let pages: PageRef[] = [];
			let cdpSessions: CdpSession[] = [];
			let lastState: CollaborativeState | null = null;

			try {
				recordHistory( behavior, {
					phase: 'seed',
					status: 'invoke',
				} );
				const collaboratorAuthorId =
					collaboratorUser.id &&
					COLLABORATOR_ROLES.includes( 'contributor' )
						? collaboratorUser.id
						: undefined;
				const post = await requestUtils.createPost( {
					...( collaboratorAuthorId
						? { author: collaboratorAuthorId }
						: {} ),
					title: `RTC seed ${ seed } initial title`,
					status: 'draft',
					date_gmt: new Date().toISOString(),
					content: getInitialContent( seed ),
				} );
				behavior.postId = post.id;
				recordHistory( behavior, {
					details: {
						author: collaboratorAuthorId,
						postId: post.id,
					},
					phase: 'create-post',
					status: 'ok',
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
				await assertEditorInvariants( {
					coverage: behavior,
					pages,
					phase: 'initial-convergence',
				} );
				cdpSessions = await startCdpCoverage( pages );

				const usedMilestones = new Set< number >();
				const forcedLateJoinStep =
					ENABLE_LIFECYCLE_EVENTS &&
					additionalCollaborators.length > 0
						? reserveMilestoneStep(
								FORCE_LATE_JOIN_STEP,
								STEP_COUNT,
								usedMilestones
						  )
						: -1;
				const forcedLifecycleReloadSteps =
					ENABLE_LIFECYCLE_EVENTS && ! DISABLE_RELOAD
						? reserveMilestoneSteps(
								FORCE_RELOAD_STEPS,
								STEP_COUNT,
								usedMilestones
						  )
						: null;
				const forcedSaveSteps = reserveMilestoneSteps(
					FORCE_SAVE_STEPS,
					STEP_COUNT,
					usedMilestones
				);
				const forcedAutosaveSteps = reserveMilestoneSteps(
					FORCE_AUTOSAVE_STEPS,
					STEP_COUNT,
					usedMilestones
				);
				const saveSteps =
					forcedSaveSteps ??
					chooseMilestoneSteps(
						rng,
						STEP_COUNT,
						usedMilestones,
						STEP_COUNT >= 3 ? SAVE_CHECKPOINT_COUNT : 1
					);
				const autosaveSteps =
					AUTOSAVE_CHECKPOINT_COUNT > 0
						? forcedAutosaveSteps ??
						  chooseMilestoneSteps(
								rng,
								STEP_COUNT,
								usedMilestones,
								AUTOSAVE_CHECKPOINT_COUNT
						  )
						: new Set< number >();
				const reloadStep =
					DISABLE_RELOAD || DISABLE_RANDOM_RELOAD
						? -1
						: chooseMilestoneStep(
								rng,
								STEP_COUNT,
								usedMilestones
						  );
				const lateJoinStep = chooseLateJoinStep(
					rng,
					STEP_COUNT,
					usedMilestones,
					forcedLateJoinStep,
					additionalCollaborators.length > 0
				);
				const lifecycleReloadSteps =
					ENABLE_LIFECYCLE_EVENTS && ! DISABLE_RELOAD
						? forcedLifecycleReloadSteps ??
						  chooseMilestoneSteps(
								rng,
								STEP_COUNT,
								usedMilestones,
								LIFECYCLE_RELOAD_COUNT
						  )
						: new Set< number >();
				const saveCheckpoints: SaveCheckpoint[] = [];
				let finalPersistenceSaver = pages[ 0 ];
				behavior.reloadStep = reloadStep;

				for ( let step = 0; step < STEP_COUNT; step++ ) {
					if ( step === lateJoinStep ) {
						const previousPageCount = pages.length;
						recordHistory( behavior, {
							phase: 'late-join',
							status: 'invoke',
							step,
						} );
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
						recordHistory( behavior, {
							details: { userCount: pages.length },
							phase: 'late-join',
							status: 'ok',
							step,
						} );
						const lateJoinState =
							await collaborationUtils.waitForConvergence( {
								timeout: CONVERGENCE_TIMEOUT_MS,
							} );
						lastState = lateJoinState;
						assertOperationLedgerPreserved( {
							coverage: behavior,
							ledger: operationLedger,
							phase: 'late-join-convergence',
							state: lateJoinState,
							step,
						} );
						cdpSessions.push(
							...( await startCdpCoverage(
								pages.slice( previousPageCount )
							) )
						);

						if (
							LATE_JOIN_POST_ACTION &&
							pages.length > previousPageCount
						) {
							const lateActor = pages[ previousPageCount ];
							const actionLabel = 'late-join-post-action';
							behavior.actions.push( {
								label: actionLabel,
								step,
								userIndex: lateActor.userIndex,
							} );
							behavior.lifecycleEvents.push( {
								step,
								type: actionLabel,
								userCount: pages.length,
							} );
							recordHistory( behavior, {
								label: actionLabel,
								phase: 'action',
								status: 'invoke',
								step,
								userIndex: lateActor.userIndex,
							} );

							const lateJoinWitnesses = await insertParagraph(
								lateActor.page,
								seed,
								step,
								lateActor.userIndex,
								rng,
								{ append: true }
							);
							recordHistory( behavior, {
								label: actionLabel,
								phase: 'action',
								status: 'ok',
								step,
								userIndex: lateActor.userIndex,
							} );
							const lateJoinActionState =
								await collaborationUtils.waitForConvergence( {
									timeout: CONVERGENCE_TIMEOUT_MS,
								} );
							lastState = lateJoinActionState;
							acknowledgeOperationWitnesses( {
								actionLabel,
								coverage: behavior,
								ledger: operationLedger,
								phase: 'late-join-post-action-convergence',
								state: lateJoinActionState,
								step,
								userIndex: lateActor.userIndex,
								witnesses: lateJoinWitnesses,
							} );
							assertOperationLedgerPreserved( {
								coverage: behavior,
								ledger: operationLedger,
								phase: 'late-join-post-action-convergence',
								state: lateJoinActionState,
								step,
							} );
							await assertEditorInvariants( {
								coverage: behavior,
								pages,
								phase: 'late-join-post-action-convergence',
								step,
							} );
						}
					}

					const actor = pick( rng, pages );
					const faultRoll = rng();

					if (
						INCLUDE_AUTH_SYNC_FAILURES &&
						! DISABLE_SYNC_FAULTS &&
						step > 0 &&
						faultRoll < 0.08
					) {
						const status = pick( rng, AUTH_SYNC_FAILURE_STATUSES );
						behavior.faults.push( {
							status,
							step,
							type: 'fail',
							userIndex: actor.userIndex,
						} );
						recordHistory( behavior, {
							details: { status },
							phase: 'fault',
							status: 'invoke',
							step,
							userIndex: actor.userIndex,
						} );
						await collaborationUtils.failNextSyncRequest(
							actor.page,
							status
						);
					} else if ( ! DISABLE_SYNC_FAULTS && faultRoll < 0.15 ) {
						const delayMs = 250 + Math.floor( rng() * 1250 );
						behavior.faults.push( {
							delayMs,
							step,
							type: 'delay',
							userIndex: actor.userIndex,
						} );
						recordHistory( behavior, {
							details: { delayMs },
							phase: 'fault',
							status: 'invoke',
							step,
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
						recordHistory( behavior, {
							details: { status },
							phase: 'fault',
							status: 'invoke',
							step,
							userIndex: actor.userIndex,
						} );
						await collaborationUtils.failNextSyncRequest(
							actor.page,
							status
						);
					}

					const action = pickActiveAction(
						rng,
						ACTIVE_ACTIONS,
						behavior.actions.at( -1 )?.label,
						step
					);
					behavior.actions.push( {
						label: action.label,
						step,
						userIndex: actor.userIndex,
					} );
					recordHistory( behavior, {
						label: action.label,
						phase: 'action',
						status: 'invoke',
						step,
						userIndex: actor.userIndex,
					} );

					let operationWitnesses: OperationWitnessInput[] = [];
					let actionResult: PageActionResult | void;
					try {
						await test.step( `seed ${ seed } step ${ step } ${ action.label } user ${ actor.userIndex }`, async () => {
							actionResult = await action.run(
								actor.page,
								seed,
								step,
								actor.userIndex,
								rng,
								pages
							);
						} );

						const normalizedActionResult =
							normalizePageActionResult( actionResult );
						operationWitnesses = normalizedActionResult.witnesses;
						for ( const event of normalizedActionResult.historyEvents ) {
							recordHistory( behavior, event );
						}

						recordHistory( behavior, {
							label: action.label,
							phase: 'action',
							status: 'ok',
							step,
							userIndex: actor.userIndex,
						} );
					} catch ( error ) {
						recordHistory( behavior, {
							error: errorToString( error ),
							label: action.label,
							phase: 'action',
							status: 'fail',
							step,
							userIndex: actor.userIndex,
						} );
						throw error;
					}

					let state;
					try {
						state = await collaborationUtils.waitForConvergence( {
							timeout: CONVERGENCE_TIMEOUT_MS,
						} );
						recordHistory( behavior, {
							details: { blockCount: state.blocks.length },
							phase: 'convergence',
							status: 'ok',
							step,
						} );
					} catch ( error ) {
						recordHistory( behavior, {
							error: errorToString( error ),
							phase: 'convergence',
							status: 'fail',
							step,
						} );
						throw error;
					}
					lastState = state;
					expect( state.blocks.length ).toBeGreaterThan( 0 );
					invalidateOperationLedgerAfterAction( {
						actionLabel: action.label,
						coverage: behavior,
						ledger: operationLedger,
						step,
						userIndex: actor.userIndex,
					} );
					acknowledgeOperationWitnesses( {
						actionLabel: action.label,
						coverage: behavior,
						ledger: operationLedger,
						phase: 'post-action-convergence',
						state,
						step,
						userIndex: actor.userIndex,
						witnesses: operationWitnesses,
					} );
					assertOperationLedgerPreserved( {
						coverage: behavior,
						ledger: operationLedger,
						phase: 'post-action-convergence',
						state,
						step,
					} );
					await assertEditorInvariants( {
						coverage: behavior,
						pages,
						phase: 'post-action-convergence',
						step,
					} );

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
						recordHistory( behavior, {
							details: { marker },
							phase: 'save-checkpoint',
							status: 'invoke',
							step,
							userIndex: saver.userIndex,
						} );

						let checkpoint;
						try {
							checkpoint = await saveCheckpointAndVerify( {
								collaborationUtils,
								marker,
								postId: post.id,
								requestUtils,
								saver,
								step,
								viewer,
							} );
							recordHistory( behavior, {
								details: { marker },
								phase: 'save-checkpoint',
								status: 'ok',
								step,
								userIndex: saver.userIndex,
							} );
							await assertEditorInvariants( {
								coverage: behavior,
								pages,
								phase: 'save-checkpoint-convergence',
								step,
							} );
							const checkpointState =
								await collaborationUtils.waitForConvergence( {
									includeCrdtDocument: true,
									timeout: CONVERGENCE_TIMEOUT_MS,
								} );
							lastState = checkpointState;
							acknowledgeOperationWitnesses( {
								actionLabel: 'save-checkpoint',
								coverage: behavior,
								ledger: operationLedger,
								phase: 'save-checkpoint-convergence',
								state: checkpointState,
								step,
								userIndex: saver.userIndex,
								witnesses:
									getCheckpointOperationWitnesses(
										checkpoint
									),
							} );
							assertOperationLedgerPreserved( {
								coverage: behavior,
								ledger: operationLedger,
								phase: 'save-checkpoint-convergence',
								state: checkpointState,
								step,
							} );
							await assertOperationLedgerPersisted( {
								coverage: behavior,
								ledger: operationLedger,
								phase: 'save-checkpoint-persisted',
								postId: post.id,
								requestUtils,
								step,
							} );
						} catch ( error ) {
							recordHistory( behavior, {
								error: errorToString( error ),
								phase: 'save-checkpoint',
								status: 'fail',
								step,
								userIndex: saver.userIndex,
							} );
							throw error;
						}

						saveCheckpoints.push( checkpoint );
					}

					if ( autosaveSteps.has( step ) ) {
						const saver = pick( rng, pages );
						const marker = getRelatedCheckpointMarker(
							getCheckpointMarker( seed, step, saver.userIndex ),
							'autosave'
						);
						for ( const local of [ false, true ] ) {
							behavior.autosaveSteps.push( {
								local,
								step,
								userIndex: saver.userIndex,
							} );
						}
						recordHistory( behavior, {
							details: { marker },
							phase: 'autosave-checkpoint',
							status: 'invoke',
							step,
							userIndex: saver.userIndex,
						} );
						try {
							await autosaveCheckpointAndVerify( {
								collaborationUtils,
								marker,
								postId: post.id,
								saver,
							} );
							const autosaveState =
								await collaborationUtils.waitForConvergence( {
									includeCrdtDocument: true,
									timeout: CONVERGENCE_TIMEOUT_MS,
								} );
							lastState = autosaveState;
							acknowledgeOperationWitnesses( {
								actionLabel: 'autosave-checkpoint',
								coverage: behavior,
								ledger: operationLedger,
								phase: 'autosave-checkpoint-convergence',
								state: autosaveState,
								step,
								userIndex: saver.userIndex,
								witnesses: [
									createContentWitness(
										marker,
										'autosave-checkpoint'
									),
								],
							} );
							assertOperationLedgerPreserved( {
								coverage: behavior,
								ledger: operationLedger,
								phase: 'autosave-checkpoint-convergence',
								state: autosaveState,
								step,
							} );
							recordHistory( behavior, {
								details: { marker },
								phase: 'autosave-checkpoint',
								status: 'ok',
								step,
								userIndex: saver.userIndex,
							} );
						} catch ( error ) {
							recordHistory( behavior, {
								error: errorToString( error ),
								phase: 'autosave-checkpoint',
								status: 'fail',
								step,
								userIndex: saver.userIndex,
							} );
							throw error;
						}
					}

					let reloadedState = null;
					if (
						step === reloadStep ||
						lifecycleReloadSteps.has( step )
					) {
						const reloader = pick( rng, pages );
						recordHistory( behavior, {
							phase: 'reload',
							status: 'invoke',
							step,
							userIndex: reloader.userIndex,
						} );
						try {
							await reloadAndWait(
								reloader.page,
								collaborationUtils
							);
							reloadedState =
								await collaborationUtils.waitForConvergence( {
									includeCrdtDocument: true,
									timeout: CONVERGENCE_TIMEOUT_MS,
								} );
							recordHistory( behavior, {
								details: {
									blockCount: reloadedState.blocks.length,
								},
								phase: 'reload',
								status: 'ok',
								step,
								userIndex: reloader.userIndex,
							} );
							await assertEditorInvariants( {
								coverage: behavior,
								pages,
								phase: 'reload-convergence',
								step,
							} );
							assertOperationLedgerPreserved( {
								coverage: behavior,
								ledger: operationLedger,
								phase: 'reload-convergence',
								state: reloadedState,
								step,
							} );
						} catch ( error ) {
							recordHistory( behavior, {
								error: errorToString( error ),
								phase: 'reload',
								status: 'fail',
								step,
								userIndex: reloader.userIndex,
							} );
							throw error;
						}
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

						if ( RELOAD_POST_ACTION ) {
							const actionLabel = 'reload-post-action';
							let reloadPostWitnesses: OperationWitnessInput[] =
								[];
							behavior.actions.push( {
								label: actionLabel,
								step,
								userIndex: reloader.userIndex,
							} );
							behavior.lifecycleEvents.push( {
								step,
								type: actionLabel,
								userCount: pages.length,
							} );
							recordHistory( behavior, {
								label: actionLabel,
								phase: 'action',
								status: 'invoke',
								step,
								userIndex: reloader.userIndex,
							} );

							try {
								await test.step( `seed ${ seed } step ${ step } ${ actionLabel } user ${ reloader.userIndex }`, async () => {
									if (
										ACTION_PROFILE ===
											'real-user-editing' &&
										RELOAD_POST_ACTION_KIND === 'title'
									) {
										reloadPostWitnesses =
											( await typeRealUserTitle(
												reloader.page,
												seed,
												step,
												reloader.userIndex,
												rng,
												{ kind: actionLabel }
											) ) ?? [];
									} else if (
										ACTION_PROFILE ===
											'real-user-editing' &&
										RELOAD_POST_ACTION_KIND === 'format'
									) {
										reloadPostWitnesses =
											( await typeRealUserFormattedParagraph(
												reloader.page,
												seed,
												step,
												reloader.userIndex,
												rng
											) ) ?? [];
									} else if (
										ACTION_PROFILE ===
											'real-user-editing' &&
										RELOAD_POST_ACTION_KIND === 'heading'
									) {
										reloadPostWitnesses =
											( await typeRealUserHeadingShortcut(
												reloader.page,
												seed,
												step,
												reloader.userIndex,
												rng
											) ) ?? [];
									} else {
										reloadPostWitnesses =
											( await typeRealUserParagraph(
												reloader.page,
												seed,
												step,
												reloader.userIndex,
												rng,
												{ kind: actionLabel }
											) ) ?? [];
									}
								} );

								recordHistory( behavior, {
									label: actionLabel,
									phase: 'action',
									status: 'ok',
									step,
									userIndex: reloader.userIndex,
								} );

								const reloadPostState =
									await collaborationUtils.waitForConvergence(
										{
											includeCrdtDocument: true,
											timeout: CONVERGENCE_TIMEOUT_MS,
										}
									);
								lastState = reloadPostState;
								acknowledgeOperationWitnesses( {
									actionLabel,
									coverage: behavior,
									ledger: operationLedger,
									phase: 'reload-post-action-convergence',
									state: reloadPostState,
									step,
									userIndex: reloader.userIndex,
									witnesses: reloadPostWitnesses,
								} );
								assertOperationLedgerPreserved( {
									coverage: behavior,
									ledger: operationLedger,
									phase: 'reload-post-action-convergence',
									state: reloadPostState,
									step,
								} );
								await assertEditorInvariants( {
									coverage: behavior,
									pages,
									phase: 'reload-post-action-convergence',
									step,
								} );
								recordHistory( behavior, {
									phase: 'reload-post-action-save',
									status: 'invoke',
									step,
									userIndex: reloader.userIndex,
								} );
								await saveDraft( reloader.page );
								await assertOperationLedgerPersisted( {
									coverage: behavior,
									ledger: operationLedger,
									phase: 'reload-post-action-persisted',
									postId: post.id,
									requestUtils,
									step,
								} );
								recordHistory( behavior, {
									phase: 'reload-post-action-save',
									status: 'ok',
									step,
									userIndex: reloader.userIndex,
								} );
								finalPersistenceSaver = reloader;
							} catch ( error ) {
								recordHistory( behavior, {
									error: errorToString( error ),
									label: actionLabel,
									phase: 'reload-post-action',
									status: 'fail',
									step,
									userIndex: reloader.userIndex,
								} );
								throw error;
							}
						}
					}
					expect(
						step === reloadStep || lifecycleReloadSteps.has( step )
							? reloadedState?.blocks.length
							: 1
					).toBeGreaterThan( 0 );
				}

				await maybeRunFinalUiWitnessSweep( {
					collaborationUtils,
					coverage: behavior,
					ledger: operationLedger,
					pages,
					rng,
					seed,
				} );

				let finalState;
				try {
					finalState = await collaborationUtils.waitForConvergence( {
						includeCrdtDocument: true,
						timeout: CONVERGENCE_TIMEOUT_MS,
					} );
					recordHistory( behavior, {
						details: { blockCount: finalState.blocks.length },
						phase: 'final-convergence',
						status: 'ok',
					} );
				} catch ( error ) {
					recordHistory( behavior, {
						error: errorToString( error ),
						phase: 'final-convergence',
						status: 'fail',
					} );
					throw error;
				}
				lastState = finalState;
				behavior.blockStats = getBlockStats( finalState.blocks );
				await assertEditorInvariants( {
					coverage: behavior,
					pages,
					phase: 'final-convergence',
				} );
				assertOperationLedgerPreserved( {
					coverage: behavior,
					ledger: operationLedger,
					phase: 'final-convergence',
					state: finalState,
				} );

				expect( finalState.title ).not.toBe( '' );
				expect( finalState.blocks.length ).toBeGreaterThan( 0 );
				expect( finalState.crdtDocument ).not.toBeNull();

				await maybeRunFinalPersistenceOracle( {
					collaborationUtils,
					coverage: behavior,
					ledger: operationLedger,
					pages,
					postId: post.id,
					requestUtils,
					saver: finalPersistenceSaver,
				} );

				behavior.revisionRestore.eligible =
					ENABLE_REVISION_RESTORE_PROBE &&
					saveCheckpoints.length >= 2;
				recordHistory( behavior, {
					details: {
						checkpointCount: saveCheckpoints.length,
						eligible: behavior.revisionRestore.eligible,
					},
					phase: 'revision-restore',
					status: 'invoke',
				} );
				try {
					await restoreRevisionViaBrowserAndVerify( {
						checkpoints: saveCheckpoints,
						collaborationUtils,
						postId: post.id,
						requestUtils,
						restorer: pick( rng, pages ),
					} );
					await assertEditorInvariants( {
						coverage: behavior,
						pages,
						phase: 'revision-restore-convergence',
					} );
					if ( behavior.revisionRestore.eligible ) {
						const restoredState =
							await collaborationUtils.waitForConvergence( {
								includeCrdtDocument: true,
								timeout: CONVERGENCE_TIMEOUT_MS,
							} );
						lastState = restoredState;
						invalidateOperationLedgerScope( {
							actionLabel: 'revision-restore',
							coverage: behavior,
							ledger: operationLedger,
							phase: 'revision-restore-convergence',
							reason: 'document-restored-to-earlier-revision',
							scope: 'content',
						} );
						invalidateOperationLedgerScope( {
							actionLabel: 'revision-restore',
							coverage: behavior,
							ledger: operationLedger,
							phase: 'revision-restore-convergence',
							reason: 'document-restored-to-earlier-revision',
							scope: 'title',
						} );
						acknowledgeOperationWitnesses( {
							actionLabel: 'revision-restore',
							coverage: behavior,
							ledger: operationLedger,
							phase: 'revision-restore-convergence',
							state: restoredState,
							witnesses: getCheckpointOperationWitnesses(
								saveCheckpoints[ 0 ]
							),
						} );
						assertOperationLedgerPreserved( {
							coverage: behavior,
							ledger: operationLedger,
							phase: 'revision-restore-convergence',
							state: restoredState,
						} );
					}
					recordHistory( behavior, {
						details: {
							eligible: behavior.revisionRestore.eligible,
						},
						phase: 'revision-restore',
						status: 'ok',
					} );
				} catch ( error ) {
					recordHistory( behavior, {
						error: errorToString( error ),
						phase: 'revision-restore',
						status: 'fail',
					} );
					throw error;
				}
				behavior.status = 'passed';
				recordHistory( behavior, {
					phase: 'seed',
					status: 'ok',
				} );
			} catch ( error ) {
				behavior.error = errorToString( error );
				recordHistory( behavior, {
					error: behavior.error,
					phase: 'seed',
					status: 'fail',
				} );
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
				updateOperationLedgerSummary( behavior, operationLedger );
				await writeBehaviorCoverage( behavior ).catch( () => {} );
			}
		} );
	}
} );
