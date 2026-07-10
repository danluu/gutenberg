#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'net';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const OUTPUT_DIR =
	process.env.RTC_FUZZ_SUPERVISOR_OUTPUT_DIR ??
	path.join(
		REPO_ROOT,
		'artifacts/rtc-browser-fuzz',
		`supervised-${ createTimestamp() }`
	);
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_SUPERVISOR_CURRENT_OUTPUT_POINTER ?? null;
const DURATION_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_SUPERVISOR_DURATION_HOURS',
	getPositiveNumberEnv( 'RTC_FUZZ_DURATION_HOURS', 14 )
);
const POLL_MS = getPositiveIntegerEnv( 'RTC_FUZZ_SUPERVISOR_POLL_MS', 60000 );
const REMOVED_GROUP_CLEANUP_RETRY_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_REMOVED_GROUP_CLEANUP_RETRY_MS',
	15 * 60 * 1000
);
const REPLACEMENT_SEED_SEARCH_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_REPLACEMENT_SEED_SEARCH_LIMIT',
	10000
);
const STATE_HEARTBEAT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_STATE_HEARTBEAT_MS',
	60000
);
const WS_RELAY_PORT_SEARCH_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_WS_RELAY_PORT_SEARCH_LIMIT',
	200
);
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const STATE_PATH = path.join( OUTPUT_DIR, 'supervisor-state.json' );
const LOG_PATH = path.join( OUTPUT_DIR, 'supervisor.log' );
const EVENTS_PATH = path.join( OUTPUT_DIR, 'events.ndjson' );
const NETWORK_TOPOLOGY_LOCK_FILE =
	process.env.RTC_FUZZ_NETWORK_TOPOLOGY_LOCK_FILE ??
	( process.platform === 'linux'
		? path.join( OUTPUT_DIR, '.network-topology.lock' )
		: null );
const NETWORK_TOPOLOGY_LOCK_WAIT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NETWORK_TOPOLOGY_LOCK_WAIT_MS',
	20 * 60 * 1000
);
const ACTIVE_GROUP_STATUSES = new Set( [
	'starting',
	'launching',
	'recovering',
	'running',
] );
const INCLUDE_EXTERNAL_IMPORTS =
	process.env.RTC_FUZZ_SUPERVISOR_INCLUDE_EXTERNAL_IMPORTS === '1';
const SUMMARY_SCAN_IGNORED_DIRS = new Set( [
	'.git',
	'.triage-watcher',
	'blob-report',
	'codex-analysis',
	'node_modules',
	'playwright-report',
	'test-results',
	'vendor',
] );
const NO_ANALYSIS_SENTINEL_RELATIVE_PATH = path.join(
	'.triage-watcher',
	'no-analysis.json'
);
const AUTO_REPAIR_WP_ENV =
	process.env.RTC_FUZZ_SUPERVISOR_AUTO_REPAIR_WP_ENV !== '0';
const AUTO_REPAIR_ORBSTACK_DOCKER =
	process.env.RTC_FUZZ_SUPERVISOR_AUTO_REPAIR_ORBSTACK_DOCKER !== '0';
const ORBSTACK_DOCKER_RESTART_COOLDOWN_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_ORBSTACK_DOCKER_RESTART_COOLDOWN_MS',
	10 * 60 * 1000
);
const WP_ENV_MARIADB_HEALTHCHECK_SOURCE =
	"test: [ 'CMD', 'healthcheck.sh', '--connect', '--innodb_initialized' ]";
const WP_ENV_MARIADB_HEALTHCHECK_TARGET =
	"test: [ 'CMD', 'healthcheck.sh', '--no-defaults', '--connect' ]";
const COMPOSE_MARIADB_HEALTHCHECK_SOURCE = [
	'        - CMD',
	'        - healthcheck.sh',
	"        - '--connect'",
	"        - '--innodb_initialized'",
].join( '\n' );
const COMPOSE_MARIADB_HEALTHCHECK_TARGET = [
	'        - CMD',
	'        - healthcheck.sh',
	"        - '--no-defaults'",
	"        - '--connect'",
].join( '\n' );
const REQUIRED_GUTENBERG_BLOCK_MANIFESTS = [
	{
		input: 'build/scripts/block-library',
		output: 'build/scripts/block-library/blocks-manifest.php',
	},
	{
		input: 'build/scripts/edit-widgets/blocks',
		output: 'build/scripts/edit-widgets/blocks/blocks-manifest.php',
	},
	{
		input: 'build/scripts/widgets/blocks',
		output: 'build/scripts/widgets/blocks/blocks-manifest.php',
	},
];
const REQUIRED_GUTENBERG_VENDOR_SCRIPTS = [
	'build/scripts/vendors/react.min.js',
	'build/scripts/vendors/react-dom.min.js',
	'build/scripts/vendors/react-jsx-runtime.min.js',
];
const REQUIRED_GUTENBERG_STYLE_ARTIFACTS = [
	{
		source: 'packages/theme/src/prebuilt/css/design-tokens.css',
		targets: [
			'build/styles/theme/design-tokens.css',
			'build/styles/theme/design-tokens.min.css',
		],
	},
];
const REQUIRED_PACKAGE_CJS_ENTRYPOINTS = [
	{
		packageName: '@wordpress/e2e-test-utils-playwright',
		source: 'packages/e2e-test-utils-playwright/build/index.js',
		target: 'packages/e2e-test-utils-playwright/build/index.cjs',
	},
];
const WP_ENV_DATABASE_FAILURE_RETRY_DELAYS_MS = [ 30000, 60000, 90000 ];
const WP_ENV_REPAIR_REPROBE_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_WP_ENV_REPAIR_REPROBE_TIMEOUT_MS',
	30000
);
const STARTUP_DISCOVERY_PHASES = new Set( [
	'seed',
	'bootstrap',
	'open',
	'join',
	'startup',
	'setup',
	'discovery',
	'ready',
] );
const STARTUP_DISCOVERY_FAILURE_PATTERN =
	/waitForMutualDiscovery|waitForTestWebSocketAwarenessPeerCount|waitForCollaborationReady|setPreferences|_wpCollaborationEnabled|collaboration (?:session )?to become ready|page\.waitForFunction|waitForSyncCycle|Target page, context or browser has been closed|Test timeout|Failed to discover REST API endpoint|RequestUtils\.setupRest|request-utils\/rest\.ts|Link header:\s*undefined|globalSetup|api\.w\.org|GET .*\/wp-json\/|ERR_CONNECTION_RESET|ERR_SOCKET_NOT_CONNECTED|endpoint mismatch|runtime[- ]config port bleed/i;
const STARTUP_STALL_GUARD_ENABLED =
	process.env.RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD !== '0';
const STARTUP_STALL_GUARD_MIN_FAILURES = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES',
	2
);
const STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES',
	1
);
const STARTUP_STALL_GUARD_DOMINANCE_MIN_FAILURES = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_DOMINANCE_MIN_FAILURES',
	2
);
const STARTUP_STALL_GUARD_DOMINANCE_MIN_RATE = getRateEnv(
	'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_DOMINANCE_MIN_RATE',
	0.5
);
const STARTUP_STALL_GUARD_COOLDOWN_MS =
	getPositiveNumberEnv(
		'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_COOLDOWN_HOURS',
		0.25
	) *
	60 *
	60 *
	1000;
const INFRA_STARTUP_FAILURE_BACKOFF_MS =
	getPositiveNumberEnv(
		'RTC_FUZZ_SUPERVISOR_INFRA_STARTUP_FAILURE_BACKOFF_MINUTES',
		10
	) *
	60 *
	1000;
const SYSTEM_PATH_ENTRIES = [
	'/usr/local/sbin',
	'/usr/local/bin',
	'/usr/sbin',
	'/usr/bin',
	'/sbin',
	'/bin',
];
const DEFAULT_GROUPS = [
	{
		name: 'default-http',
		repoRoot: REPO_ROOT,
		transport: 'http',
		lanes: 1,
		startSeed: 1007,
		stepCount: 12,
		env: {},
	},
];

let lastOrbStackDockerRestartAt = 0;
let groupConfigs = parseGroups();
const patchedWpEnvHealthcheckFiles = new Set();
let stateWritePromise = Promise.resolve();
await fs.mkdir( OUTPUT_DIR, { recursive: true } );
const state = await loadInitialState();
await writeState();
startStateHeartbeat();

function getPositiveIntegerEnv( name, fallback ) {
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

function getPositiveIntegerConfigValue( value, name, fallback ) {
	if ( ! value ) {
		return fallback;
	}
	const parsedValue = Number.parseInt( value, 10 );
	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive integer.` );
	}
	return parsedValue;
}

function getPositiveNumberEnv( name, fallback ) {
	const rawValue = process.env[ name ];
	if ( ! rawValue ) {
		return fallback;
	}
	const parsedValue = Number.parseFloat( rawValue );
	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive number.` );
	}
	return parsedValue;
}

function getRateEnv( name, fallback ) {
	const value = getPositiveNumberEnv( name, fallback );
	if ( value > 1 ) {
		throw new Error( `Expected ${ name } to be at most 1.` );
	}
	return value;
}

function createTimestamp() {
	return new Date()
		.toISOString()
		.replaceAll( '-', '' )
		.replaceAll( ':', '' )
		.replace( /\.\d+Z$/, 'Z' )
		.replace( 'T', 'T' );
}

function parseGroups() {
	const groupsPath = process.env.RTC_FUZZ_SUPERVISOR_GROUPS_PATH;
	const rawGroups =
		process.env.RTC_FUZZ_SUPERVISOR_GROUPS_JSON ??
		( groupsPath ? readFileSync( groupsPath, 'utf8' ) : null );
	const groups = rawGroups ? JSON.parse( rawGroups ) : DEFAULT_GROUPS;
	if ( ! Array.isArray( groups ) ) {
		throw new Error( 'RTC_FUZZ_SUPERVISOR_GROUPS_JSON must be an array.' );
	}

	return groups.map( ( group ) => {
		const name = String( group.name ?? '' ).trim();
		if ( ! name ) {
			throw new Error( 'Every supervisor group needs a name.' );
		}

		const repoRoot = path.resolve( group.repoRoot ?? REPO_ROOT );
		return {
			...group,
			name,
			repoRoot,
			transport: group.transport ?? 'http',
			lanes: Number.parseInt( group.lanes ?? 1, 10 ),
			startSeed: Number.parseInt( group.startSeed ?? 1007, 10 ),
			stepCount: Number.parseInt( group.stepCount ?? 12, 10 ),
			env: group.env ?? {},
		};
	} );
}

async function loadInitialState() {
	const existingState = await readJsonFile( STATE_PATH );
	if ( existingState?.groups ) {
		for ( const group of groupConfigs ) {
			if (
				! existingState.groups.some(
					( groupState ) => groupState.name === group.name
				)
			) {
				existingState.groups.push( createInitialGroupState( group ) );
			}
		}
		existingState.groups = existingState.groups.map( ( groupState ) => {
			const group = groupConfigs.find(
				( candidate ) => candidate.name === groupState.name
			);
			if ( ! group ) {
				return {
					...groupState,
					status: 'disabled',
					lastReason: 'removed-from-groups-policy',
					activeRunDirs: getActiveRunDirs( groupState ),
				};
			}
			return {
				...createInitialGroupState( group ),
				...groupState,
				activeRunDirs: getActiveRunDirs( groupState ),
			};
		} );
		existingState.groups = orderGroupStatesByConfig( existingState.groups );
		existingState.outputDir = OUTPUT_DIR;
		existingState.durationHours = DURATION_HOURS;
		existingState.endsAt = new Date( END_AT ).toISOString();
		return existingState;
	}

	return {
		startedAt: new Date().toISOString(),
		outputDir: OUTPUT_DIR,
		durationHours: DURATION_HOURS,
		endsAt: new Date( END_AT ).toISOString(),
		lastUpdatedAt: new Date().toISOString(),
		groups: groupConfigs.map( createInitialGroupState ),
	};
}

function createInitialGroupState( group ) {
	return {
		name: group.name,
		repoRoot: group.repoRoot,
		transport: group.transport ?? 'http',
		lanes: group.lanes,
		startSeed: group.startSeed,
		nextStartSeed: group.startSeed,
		stepCount: group.stepCount ?? 12,
		generation: 0,
		currentRunDir: null,
		activeRunDirs: [],
		currentBaseUrl: null,
		status: 'starting',
		lastReason: 'initial-start',
		lastRecoveryAt: null,
		lastPartialRecoveryAt: null,
		lastLaunchAt: null,
		lastHealthyAt: null,
		consecutiveFastFailures: 0,
		launches: [],
	};
}

function orderGroupStatesByConfig( groupStates ) {
	const groupOrder = new Map(
		groupConfigs.map( ( group, index ) => [ group.name, index ] )
	);
	return [ ...groupStates ].sort( ( left, right ) => {
		const leftIndex =
			groupOrder.get( left.name ) ?? Number.MAX_SAFE_INTEGER;
		const rightIndex =
			groupOrder.get( right.name ) ?? Number.MAX_SAFE_INTEGER;
		if ( leftIndex !== rightIndex ) {
			return leftIndex - rightIndex;
		}
		return left.name.localeCompare( right.name );
	} );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( LOG_PATH, line );
}

async function event( record ) {
	await fs.appendFile(
		EVENTS_PATH,
		JSON.stringify( {
			at: new Date().toISOString(),
			...record,
		} ) + '\n'
	);
}

async function writeState() {
	stateWritePromise = stateWritePromise
		.catch( () => {} )
		.then( async () => {
			state.lastUpdatedAt = new Date().toISOString();
			await fs.writeFile(
				STATE_PATH,
				JSON.stringify( state, null, 2 ) + '\n'
			);
		} );
	return stateWritePromise;
}

async function writeJsonFileAtomic( filePath, value ) {
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	const tmpPath = `${ filePath }.tmp-${ process.pid }-${ Date.now() }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

function startStateHeartbeat() {
	const heartbeat = setInterval( () => {
		void writeState().catch( async ( error ) => {
			const line = `[${ new Date().toISOString() }] supervisor state heartbeat failed: ${
				error.message
			}\n`;
			process.stderr.write( line );
			await fs.appendFile( LOG_PATH, line ).catch( () => {} );
		} );
	}, STATE_HEARTBEAT_MS );
	heartbeat.unref();
}

function getGroupConfig( name ) {
	const group = groupConfigs.find( ( candidate ) => candidate.name === name );
	if ( ! group ) {
		throw new Error( `Unknown supervisor group ${ name }.` );
	}
	return group;
}

async function waitForGroupRepoPreparation( groupState ) {
	const group = getGroupConfig( groupState.name );
	if ( group.repoRoot === REPO_ROOT ) {
		return false;
	}
	const packageReady = await fileExists(
		path.join( group.repoRoot, 'package.json' )
	);
	const harnessManifest = group.harnessOverlaySignature
		? await readJsonFile(
				path.join(
					group.repoRoot,
					'.js2-harness-overlay-manifest.json'
				)
		  )
		: null;
	const harnessDestinationSignature =
		group.harnessOverlaySignature &&
		harnessManifest?.signature === group.harnessOverlaySignature
			? await getHarnessOverlaySignatureForRoot(
					group.repoRoot,
					harnessManifest.files
			  )
			: null;
	const harnessReady =
		! group.harnessOverlaySignature ||
		( harnessManifest?.signature === group.harnessOverlaySignature &&
			harnessDestinationSignature === group.harnessOverlaySignature );
	if ( packageReady && harnessReady ) {
		if ( groupState.status === 'waiting-repo-prep' ) {
			groupState.status = 'recovering';
			groupState.lastReason = 'isolated repo preparation completed';
			await event( {
				group: groupState.name,
				kind: 'policy',
				action: 'repo-prep-ready',
				repoRoot: group.repoRoot,
			} );
			await writeState();
		}
		return false;
	}

	if ( groupState.status !== 'waiting-repo-prep' ) {
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'wait-for-repo-prep',
			repoRoot: group.repoRoot,
			reason: 'group was published before its isolated repo copy finished; retry on the next supervisor poll instead of treating this as a fuzz startup failure',
		} );
	}
	groupState.status = 'waiting-repo-prep';
	groupState.lastReason = packageReady
		? 'waiting for isolated repo harness content synchronization before launch'
		: 'waiting for isolated repo preparation before launch';
	groupState.activeRunDirs = [];
	groupState.currentRunDir = null;
	await writeState();
	return true;
}

async function syncGroupConfigs() {
	const nextGroupConfigs = parseGroups();
	const nextGroupNames = new Set(
		nextGroupConfigs.map( ( group ) => group.name )
	);
	groupConfigs = nextGroupConfigs;

	for ( const group of groupConfigs ) {
		const existingGroupState = state.groups.find(
			( candidate ) => candidate.name === group.name
		);

		if ( ! existingGroupState ) {
			state.groups.push( createInitialGroupState( group ) );
			await event( {
				group: group.name,
				kind: 'policy',
				action: 'add-group',
				lanes: group.lanes,
				transport: group.transport,
			} );
			continue;
		}

		// A group that returns to policy needs a fresh cleanup decision the next
		// time it is removed. Clear the prior removal's durable memo now.
		delete existingGroupState.removedResourcesCleanupAt;
		delete existingGroupState.removedResourcesCleanupOk;

		if ( existingGroupState.status === 'disabled' ) {
			if ( existingGroupState.productFailureAt ) {
				existingGroupState.status = 'paused-product-failure';
				await event( {
					group: group.name,
					kind: 'policy',
					action: 'retain-product-failure-quarantine',
					reason: existingGroupState.lastReason,
					productFailureAt: existingGroupState.productFailureAt,
				} );
			} else {
				const startupStallHoldUntilMs =
					getStartupStallHoldUntilMs( existingGroupState );
				if (
					startupStallHoldUntilMs > Date.now() &&
					shouldBypassStartupStallCooldown(
						group,
						existingGroupState
					)
				) {
					await event( {
						group: group.name,
						kind: 'policy',
						action: 'bypass-disabled-startup-stall-cooldown',
						reason: 'group policy requires continued coverage despite no-product startup-stall seed drain',
						previousReason: existingGroupState.lastReason,
						pauseUntil: existingGroupState.startupStallPausedUntil,
						drainRecordedUntil:
							existingGroupState.startupStallDrainRecordedUntil,
					} );
					existingGroupState.status = 'recovering';
					existingGroupState.lastReason =
						'startup-stall cooldown bypassed by group policy';
					existingGroupState.startupStallRecoveryMode = 'recover';
					existingGroupState.activeRunDirs = [];
					existingGroupState.currentRunDir = null;
					existingGroupState.startupStallRunDirs = [];
					existingGroupState.noAnalysisRunDirs = [];
					delete existingGroupState.noAnalysisReasonKind;
					delete existingGroupState.noAnalysisFamily;
					delete existingGroupState.noAnalysisSource;
					delete existingGroupState.startupStallPausedAt;
					delete existingGroupState.startupStallPausedUntil;
					delete existingGroupState.startupStallDrainRecordedAt;
					delete existingGroupState.startupStallDrainRecordedUntil;
				} else if ( startupStallHoldUntilMs > Date.now() ) {
					await event( {
						group: group.name,
						kind: 'policy',
						action: 'keep-disabled-startup-stall-cooldown',
						reason: existingGroupState.lastReason,
						pauseUntil: existingGroupState.startupStallPausedUntil,
						drainRecordedUntil:
							existingGroupState.startupStallDrainRecordedUntil,
					} );
				} else {
					await event( {
						group: group.name,
						kind: 'policy',
						action: 're-enable-group',
						reason: 'present-in-groups-policy',
					} );
					existingGroupState.status = 'recovering';
					existingGroupState.lastReason = 're-added-to-groups-policy';
				}
			}
		}

		for ( const key of [ 'repoRoot', 'transport', 'lanes', 'stepCount' ] ) {
			if ( existingGroupState[ key ] !== group[ key ] ) {
				await event( {
					group: group.name,
					kind: 'policy',
					action: 'update-group',
					field: key,
					from: existingGroupState[ key ],
					to: group[ key ],
				} );
				existingGroupState[ key ] = group[ key ];
			}
		}
	}

	for ( const groupState of state.groups ) {
		if ( ! nextGroupNames.has( groupState.name ) ) {
			await disableRemovedGroupState( groupState );
		}
	}

	state.groups = orderGroupStatesByConfig( state.groups );
	await writeState();
}

function shouldBypassStartupStallCooldown( group, groupState = null ) {
	if (
		group?.env?.RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN !== '1'
	) {
		return false;
	}
	const bypassSeedDrain =
		group?.env?.RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_SEED_DRAIN === '1';
	const bypassNoProductGuard =
		group?.env
			?.RTC_FUZZ_SUPERVISOR_BYPASS_NO_PRODUCT_STARTUP_STALL_GUARD === '1';
	if (
		groupState &&
		( hasNoProductStartupStallDrainCooldown( groupState ) ||
			isNoProductStartupStallNoiseState( groupState ) )
	) {
		if ( bypassNoProductGuard ) {
			return true;
		}
		if (
			bypassSeedDrain &&
			isBypassableStartupStallSeedDrain( groupState )
		) {
			return true;
		}
		return false;
	}
	return true;
}

async function disableRemovedGroupState( groupState ) {
	const reason = 'removed-from-groups-policy';
	const wasDisabled = groupState.status === 'disabled';
	const preserveStartupStallPause =
		getStartupStallPauseUntilMs( groupState ) > Date.now();
	const preserveStartupStallDrain =
		getStartupStallDrainRecordedUntilMs( groupState ) > Date.now();
	const preserveStartupStallState =
		preserveStartupStallPause || preserveStartupStallDrain;
	const preservedLastReason = groupState.lastReason;
	const activeRunDirs = getActiveRunDirs( groupState );
	if ( activeRunDirs.length ) {
		const snapshots = await Promise.all(
			activeRunDirs.map( async ( runDir ) => ( {
				runDir,
				...( await readRunSnapshot( runDir ) ),
			} ) )
		);
		await stopSnapshotLanes(
			snapshots,
			reason,
			'terminate-removed-group-lane'
		);
	}
	if ( ! wasDisabled ) {
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'disable-group',
			reason,
			activeRunDirs,
		} );
	}
	const priorCleanupAtMs = Date.parse(
		groupState.removedResourcesCleanupAt ?? ''
	);
	const cleanupRetryDue =
		groupState.removedResourcesCleanupOk === false &&
		( ! Number.isFinite( priorCleanupAtMs ) ||
			Date.now() - priorCleanupAtMs >= REMOVED_GROUP_CLEANUP_RETRY_MS );
	if (
		activeRunDirs.length > 0 ||
		! wasDisabled ||
		! Number.isFinite( priorCleanupAtMs ) ||
		cleanupRetryDue
	) {
		groupState.removedResourcesCleanupOk =
			await cleanupRemovedGroupWpEnvResources( groupState, reason );
		groupState.removedResourcesCleanupAt = new Date().toISOString();
	}
	groupState.status = 'disabled';
	groupState.lastReason =
		preserveStartupStallState || groupState.productFailureAt
			? preservedLastReason
			: reason;
	groupState.activeRunDirs = [];
	groupState.currentRunDir = null;
	if ( ! preserveStartupStallState ) {
		groupState.noAnalysisRunDirs = [];
		groupState.startupStallRunDirs = [];
		delete groupState.noAnalysisReasonKind;
		delete groupState.noAnalysisFamily;
		delete groupState.noAnalysisSource;
		delete groupState.startupStallPausedAt;
		delete groupState.startupStallPausedUntil;
	}
}

function withSystemPath( value ) {
	const entries = String( value ?? '' )
		.split( path.delimiter )
		.filter( Boolean );
	for ( const entry of SYSTEM_PATH_ENTRIES ) {
		if ( ! entries.includes( entry ) ) {
			entries.push( entry );
		}
	}
	return entries.join( path.delimiter );
}

function buildEnv( group, overrides = {} ) {
	const env = {
		...process.env,
		...( group.env ?? {} ),
		...overrides,
	};
	env.PATH = withSystemPath( env.PATH );

	if ( env.WP_ENV_PORT && ! env.WP_ENV_TESTS_PORT ) {
		const port = Number.parseInt( env.WP_ENV_PORT, 10 );
		if ( ! Number.isNaN( port ) ) {
			env.WP_ENV_TESTS_PORT = String( port + 1 );
		}
	}

	return env;
}

function escapeRegExp( value ) {
	return String( value ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

async function cleanupRemovedGroupWpEnvResources( groupState, reason ) {
	const escapedName = escapeRegExp( groupState.name );
	const resourceNamePattern = new RegExp( `^wp-env-${ escapedName }(?:-|$)` );
	const commandOptions = {
		cwd: groupState.repoRoot ?? REPO_ROOT,
		env: buildEnv( groupState ),
	};
	const containerList = await runCommand( {
		command: 'docker',
		args: [ 'ps', '-a', '--format', '{{.ID}} {{.Names}}' ],
		...commandOptions,
		timeoutMs: 60000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ groupState.name }-removed-wp-env-container-scan.log`
		),
	} );
	let cleanupOk = containerList.ok;
	if ( containerList.ok ) {
		const containerIds = containerList.output
			.split( '\n' )
			.map( ( line ) => line.trim() )
			.filter( Boolean )
			.map( ( line ) => {
				const [ id, name ] = line.split( /\s+/, 2 );
				return { id, name };
			} )
			.filter( ( container ) =>
				resourceNamePattern.test( container.name ?? '' )
			)
			.map( ( container ) => container.id )
			.filter( Boolean );
		if ( containerIds.length > 0 ) {
			const removeContainers = await runCommand( {
				command: 'docker',
				args: [ 'rm', '-f', ...containerIds ],
				...commandOptions,
				timeoutMs: 3 * 60 * 1000,
				logPath: path.join(
					OUTPUT_DIR,
					`${ groupState.name }-removed-wp-env-containers-rm.log`
				),
			} );
			await event( {
				group: groupState.name,
				kind: 'repair',
				action: 'removed-group-wp-env-container-cleanup',
				reason,
				containerCount: containerIds.length,
				ok: removeContainers.ok,
				code: removeContainers.code,
				output: getOutputSnippet( removeContainers.output ),
			} );
			cleanupOk = cleanupOk && removeContainers.ok;
		}
	} else {
		await event( {
			group: groupState.name,
			kind: 'repair',
			action: 'removed-group-wp-env-container-scan-failed',
			reason,
			ok: false,
			code: containerList.code,
			output: getOutputSnippet( containerList.output ),
		} );
	}

	const networkList = await runCommand( {
		command: 'docker',
		args: [ 'network', 'ls', '--format', '{{.Name}}' ],
		...commandOptions,
		timeoutMs: 60000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ groupState.name }-removed-wp-env-network-scan.log`
		),
	} );
	if ( ! networkList.ok ) {
		await event( {
			group: groupState.name,
			kind: 'repair',
			action: 'removed-group-wp-env-network-scan-failed',
			reason,
			ok: false,
			code: networkList.code,
			output: getOutputSnippet( networkList.output ),
		} );
		return false;
	}

	const networkNames = networkList.output
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( ( name ) => resourceNamePattern.test( name ) );
	if ( networkNames.length === 0 ) {
		return cleanupOk;
	}
	const removeNetworks = await runCommand( {
		command: 'docker',
		args: [ 'network', 'rm', ...networkNames ],
		...commandOptions,
		timeoutMs: 3 * 60 * 1000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ groupState.name }-removed-wp-env-networks-rm.log`
		),
	} );
	await event( {
		group: groupState.name,
		kind: 'repair',
		action: 'removed-group-wp-env-network-cleanup',
		reason,
		networkNames,
		ok: removeNetworks.ok,
		code: removeNetworks.code,
		output: getOutputSnippet( removeNetworks.output ),
	} );
	return cleanupOk && removeNetworks.ok;
}

async function runCommandUnlocked( {
	command,
	args,
	cwd,
	env = {},
	timeoutMs = 120000,
	logPath = null,
	networkTopologyLock = false,
} ) {
	const useNetworkTopologyLock =
		networkTopologyLock && NETWORK_TOPOLOGY_LOCK_FILE;
	const spawnCommand = useNetworkTopologyLock ? '/usr/bin/flock' : command;
	const spawnArgs = useNetworkTopologyLock
		? [
				'--wait',
				String( Math.ceil( NETWORK_TOPOLOGY_LOCK_WAIT_MS / 1000 ) ),
				'--no-fork',
				NETWORK_TOPOLOGY_LOCK_FILE,
				command,
				...args,
		  ]
		: args;
	const child = spawn( spawnCommand, spawnArgs, {
		cwd,
		env,
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );
	const chunks = [];
	let timedOut = false;
	const timeout = setTimeout( () => {
		timedOut = true;
		child.kill( 'SIGTERM' );
		setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
	}, timeoutMs );
	timeout.unref();

	child.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	child.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	const result = await new Promise( ( resolve ) => {
		child.on( 'error', ( error ) => {
			clearTimeout( timeout );
			resolve( {
				code: 1,
				signal: null,
				output: error.stack ?? error.message,
				timedOut,
			} );
		} );
		child.on( 'close', ( code, signal ) => {
			clearTimeout( timeout );
			resolve( {
				code,
				signal,
				output: chunks.join( '' ),
				timedOut,
			} );
		} );
	} );

	if ( logPath ) {
		await fs.mkdir( path.dirname( logPath ), { recursive: true } );
		await fs.writeFile( logPath, result.output );
	}

	return {
		...result,
		ok: result.code === 0 && ! result.timedOut,
	};
}

async function runCommand( options ) {
	return runCommandUnlocked( {
		...options,
		networkTopologyLock: options.command === 'docker',
	} );
}

const LOCAL_WP_ENV_THEME_MAPPINGS = {
	'wp-content/themes/gutenberg-test-themes/twentytwentyone':
		'./test/gutenberg-test-themes/twentytwentyone',
	'wp-content/themes/gutenberg-test-themes/twentytwentythree':
		'./test/gutenberg-test-themes/twentytwentythree',
	'wp-content/themes/gutenberg-test-themes/twentytwentyfour':
		'./test/gutenberg-test-themes/twentytwentyfour',
};

async function normalizeWpEnvLocalThemeMappings( group ) {
	const configPath = path.join( group.repoRoot, '.wp-env.test.json' );
	let config;
	try {
		config = JSON.parse( await fs.readFile( configPath, 'utf8' ) );
	} catch {
		return;
	}

	if ( ! config.mappings || typeof config.mappings !== 'object' ) {
		return;
	}

	const changedMappings = [];
	for ( const [ mappingKey, localPath ] of Object.entries(
		LOCAL_WP_ENV_THEME_MAPPINGS
	) ) {
		const current = config.mappings[ mappingKey ];
		if (
			typeof current !== 'string' ||
			! current.startsWith( 'https://downloads.wordpress.org/theme/' )
		) {
			continue;
		}
		if (
			! ( await fileExists( path.join( group.repoRoot, localPath ) ) )
		) {
			continue;
		}
		config.mappings[ mappingKey ] = localPath;
		changedMappings.push( mappingKey );
	}

	if ( ! changedMappings.length ) {
		return;
	}

	await fs.writeFile(
		configPath,
		`${ JSON.stringify( config, null, '\t' ) }\n`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'wp-env-local-theme-mappings',
		mappings: changedMappings,
	} );
}

async function runWpEnv( group, args, options = {} ) {
	await normalizeWpEnvLocalThemeMappings( group );
	const commandOptions = {
		command: 'npm',
		args: [ 'run', 'wp-env-test', '--', ...args ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: options.timeoutMs ?? 180000,
		logPath: options.logPath ?? null,
	};
	if ( [ 'start', 'stop', 'destroy', 'clean' ].includes( args[ 0 ] ) ) {
		return runCommandUnlocked( {
			...commandOptions,
			networkTopologyLock: true,
		} );
	}
	return runCommand( commandOptions );
}

function summarizeWpEnvStartFailure( group, result, logFileName ) {
	const output = String( result?.output ?? '' );
	const reasons = [];
	const bindMatch = output.match(
		/Bind for [^\n\r]+ failed: port is already allocated/i
	);
	const addressMatch = output.match(
		/(?:EADDRINUSE|address already in use)[^\n\r]*/i
	);
	if ( bindMatch || addressMatch ) {
		reasons.push(
			`port-collision: ${ (
				bindMatch?.[ 0 ] ?? addressMatch?.[ 0 ]
			).trim() }`
		);
	}
	if ( result?.timedOut ) {
		reasons.push( 'timed-out' );
	}
	if ( result?.signal ) {
		reasons.push( `signal=${ result.signal }` );
	}
	if ( Number.isInteger( result?.code ) ) {
		reasons.push( `exit=${ result.code }` );
	}
	const ports = [
		group.env?.WP_ENV_PORT
			? `WP_ENV_PORT=${ group.env.WP_ENV_PORT }`
			: null,
		group.env?.WP_ENV_TESTS_PORT
			? `WP_ENV_TESTS_PORT=${ group.env.WP_ENV_TESTS_PORT }`
			: null,
		group.env?.WP_ENV_PHPMYADMIN_PORT
			? `WP_ENV_PHPMYADMIN_PORT=${ group.env.WP_ENV_PHPMYADMIN_PORT }`
			: null,
		group.env?.GUTENBERG_RTC_TEST_WS_PORT
			? `GUTENBERG_RTC_TEST_WS_PORT=${ group.env.GUTENBERG_RTC_TEST_WS_PORT }`
			: null,
	].filter( Boolean );
	if ( ports.length ) {
		reasons.push( ports.join( ',' ) );
	}
	const reasonText = reasons.length ? ` (${ reasons.join( '; ' ) })` : '';
	return `${ group.name }: wp-env start failed${ reasonText }; see ${ logFileName }`;
}

async function fileExists( filePath ) {
	try {
		await fs.access( filePath );
		return true;
	} catch {
		return false;
	}
}

function isGutenbergBuildArtifactsMissingBackoff( groupState ) {
	const errorText = [
		groupState.lastInfraStartupError,
		groupState.lastReason,
	]
		.filter( Boolean )
		.join( '\n' );
	return /Gutenberg build artifacts are missing/i.test( errorText );
}

async function getMissingGutenbergBuildArtifactInputs( group ) {
	const missingInputs = [];
	for ( const manifest of REQUIRED_GUTENBERG_BLOCK_MANIFESTS ) {
		const inputPath = path.join( group.repoRoot, manifest.input );
		if ( ! ( await fileExists( inputPath ) ) ) {
			missingInputs.push( manifest.input );
		}
	}
	return missingInputs;
}

async function maybeClearGutenbergBuildArtifactsBackoff( groupState ) {
	if ( ! isGutenbergBuildArtifactsMissingBackoff( groupState ) ) {
		return false;
	}

	const group = getGroupConfig( groupState.name );
	const missingInputs = await getMissingGutenbergBuildArtifactInputs( group );
	if ( missingInputs.length ) {
		const previousMissing = (
			groupState.infraStartupMissingBuildArtifacts ?? []
		).join( ',' );
		const nextMissing = missingInputs.join( ',' );
		groupState.infraStartupMissingBuildArtifacts = missingInputs;
		groupState.lastReason = `infra startup backoff waiting for Gutenberg build artifacts: ${ missingInputs.join(
			', '
		) }`;
		if ( previousMissing !== nextMissing ) {
			await event( {
				group: groupState.name,
				kind: 'policy',
				action: 'keep-infra-startup-backoff-missing-gutenberg-artifacts',
				missingInputs,
				pauseUntil: groupState.infraStartupBackoffUntil ?? null,
			} );
		}
		return false;
	}

	delete groupState.infraStartupBackoffUntil;
	delete groupState.infraStartupMissingBuildArtifacts;
	delete groupState.lastInfraStartupError;
	groupState.status = 'recovering';
	groupState.activeRunDirs = [];
	groupState.currentRunDir = null;
	groupState.lastReason =
		'infra startup backoff cleared: Gutenberg build artifacts are now present';
	await event( {
		group: groupState.name,
		kind: 'policy',
		action: 'clear-infra-startup-backoff-gutenberg-artifacts-present',
	} );
	await writeState();
	return true;
}

async function ensureGutenbergVendorScripts( group ) {
	const missingVendorScripts = [];

	for ( const vendorScript of REQUIRED_GUTENBERG_VENDOR_SCRIPTS ) {
		const vendorScriptPath = path.join( group.repoRoot, vendorScript );

		if ( ! ( await fileExists( vendorScriptPath ) ) ) {
			missingVendorScripts.push( vendorScript );
		}
	}

	if ( ! missingVendorScripts.length ) {
		return;
	}

	const missingVendorScriptList = missingVendorScripts.join( ', ' );
	await log(
		`${ group.name }: generating missing Gutenberg vendor script(s): ${ missingVendorScriptList }.`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'gutenberg-vendor-scripts-generate',
		vendorScripts: missingVendorScripts,
	} );

	const result = await runCommand( {
		command: process.execPath,
		args: [ 'tools/build-scripts/packages/build-vendors.mjs' ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: 120000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-gutenberg-vendor-scripts.log`
		),
	} );
	const stillMissingVendorScripts = [];

	for ( const vendorScript of REQUIRED_GUTENBERG_VENDOR_SCRIPTS ) {
		const vendorScriptPath = path.join( group.repoRoot, vendorScript );

		if ( ! ( await fileExists( vendorScriptPath ) ) ) {
			stillMissingVendorScripts.push( vendorScript );
		}
	}

	if ( ! result.ok || stillMissingVendorScripts.length ) {
		const outputSnippet = getOutputSnippet( result.output );
		const missingList =
			stillMissingVendorScripts.join( ', ' ) || 'command exited non-zero';
		throw new Error(
			`${ group.name }: failed to generate Gutenberg vendor scripts: ${ missingList }; ${ outputSnippet }`
		);
	}
}

async function ensurePackageCjsEntrypoints( group ) {
	for ( const entrypoint of REQUIRED_PACKAGE_CJS_ENTRYPOINTS ) {
		const sourcePath = path.join( group.repoRoot, entrypoint.source );
		const targetPath = path.join( group.repoRoot, entrypoint.target );

		if ( await fileExists( targetPath ) ) {
			continue;
		}

		if ( ! ( await fileExists( sourcePath ) ) ) {
			throw new Error(
				`${ group.name }: Gutenberg build artifacts are missing for ${ entrypoint.packageName }: ${ entrypoint.source }`
			);
		}

		await fs.writeFile(
			targetPath,
			[
				"'use strict';",
				"module.exports = require( './index.js' );",
				'',
			].join( '\n' )
		);
		await log(
			`${ group.name }: generated missing CommonJS entrypoint ${ entrypoint.target } for ${ entrypoint.packageName }.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'package-cjs-entrypoint-generate',
			packageName: entrypoint.packageName,
			source: entrypoint.source,
			target: entrypoint.target,
		} );
	}
}

async function ensureGutenbergStyleArtifacts( group ) {
	for ( const artifact of REQUIRED_GUTENBERG_STYLE_ARTIFACTS ) {
		const sourcePath = path.join( group.repoRoot, artifact.source );
		if ( ! ( await fileExists( sourcePath ) ) ) {
			continue;
		}

		for ( const target of artifact.targets ) {
			const targetPath = path.join( group.repoRoot, target );
			if ( await fileExists( targetPath ) ) {
				continue;
			}

			await fs.mkdir( path.dirname( targetPath ), { recursive: true } );
			await fs.copyFile( sourcePath, targetPath );
			await log(
				`${ group.name }: materialized missing Gutenberg style artifact ${ target } from ${ artifact.source }.`
			);
			await event( {
				group: group.name,
				kind: 'repair',
				action: 'gutenberg-style-artifact-materialize',
				source: artifact.source,
				target,
			} );
		}
	}

	await ensureMinifiedCssAliases(
		group,
		path.join( group.repoRoot, 'build/styles' )
	);
}

async function ensureMinifiedCssAliases( group, dir ) {
	let entries;
	try {
		entries = await fs.readdir( dir, { withFileTypes: true } );
	} catch {
		return;
	}

	for ( const entry of entries ) {
		const entryPath = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			await ensureMinifiedCssAliases( group, entryPath );
			continue;
		}
		if (
			! entry.isFile() ||
			! entry.name.endsWith( '.css' ) ||
			entry.name.endsWith( '.min.css' )
		) {
			continue;
		}

		const minifiedPath = entryPath.replace( /\.css$/, '.min.css' );
		if ( await fileExists( minifiedPath ) ) {
			continue;
		}

		await fs.copyFile( entryPath, minifiedPath );
		await log(
			`${
				group.name
			}: materialized missing Gutenberg minified style alias ${ path.relative(
				group.repoRoot,
				minifiedPath
			) }.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'gutenberg-minified-style-alias-materialize',
			target: path.relative( group.repoRoot, minifiedPath ),
		} );
	}
}

async function ensureGutenbergBlockManifests( group ) {
	const missingManifests = [];
	const missingInputs = [];

	for ( const manifest of REQUIRED_GUTENBERG_BLOCK_MANIFESTS ) {
		const inputPath = path.join( group.repoRoot, manifest.input );
		const outputPath = path.join( group.repoRoot, manifest.output );

		if ( await fileExists( outputPath ) ) {
			continue;
		}
		if ( ! ( await fileExists( inputPath ) ) ) {
			missingInputs.push( manifest.input );
			continue;
		}
		missingManifests.push( manifest );
	}

	if ( missingInputs.length ) {
		const missingInputsList = missingInputs.join( ', ' );
		throw new Error(
			`${ group.name }: Gutenberg build artifacts are missing: ${ missingInputsList }. Run npm run build -- --skip-types before browser fuzzing.`
		);
	}

	if ( ! missingManifests.length ) {
		return;
	}

	const missingManifestList = missingManifests
		.map( ( manifest ) => manifest.output )
		.join( ', ' );
	await log(
		`${ group.name }: generating missing Gutenberg block manifest(s): ${ missingManifestList }.`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'gutenberg-block-manifest-generate',
		manifests: missingManifests.map( ( manifest ) => manifest.output ),
	} );

	for ( const manifest of missingManifests ) {
		const manifestLogName = manifest.output.replace( /[^\w.-]+/g, '-' );
		const result = await runCommand( {
			command: 'npx',
			args: [
				'--no-install',
				'wp-scripts',
				'build-blocks-manifest',
				`--input=${ manifest.input }`,
				`--output=${ manifest.output }`,
			],
			cwd: group.repoRoot,
			env: buildEnv( group ),
			timeoutMs: 120000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-${ manifestLogName }.log`
			),
		} );
		if ( ! result.ok ) {
			const outputSnippet = getOutputSnippet( result.output );
			throw new Error(
				`${ group.name }: failed to generate ${ manifest.output }; ${ outputSnippet }`
			);
		}
	}
}

function parseHttpPort( statusOutput ) {
	const match = statusOutput.match( /http port:\s+(\d+)/i );
	return match ? Number.parseInt( match[ 1 ], 10 ) : null;
}

function isWpEnvRunningStatus( result ) {
	return result.ok && /\bstatus:\s+running\b/i.test( result.output );
}

function isWpEnvUninitializedStatus( result ) {
	return /status:\s+uninitialized|Environment not initialized/i.test(
		result.output
	);
}

function parseWpEnvInstallPath( output ) {
	const match = String( output ?? '' ).match( /install path:\s+(.+)/i );
	return match ? match[ 1 ].trim() : null;
}

function getComposeProjectName( installPath ) {
	return path.basename( path.resolve( installPath ) );
}

function getComposePath( installPath ) {
	return path.join( installPath, 'docker-compose.yml' );
}

async function findGeneratedWpEnvInstallPath( group ) {
	const wpEnvHome = buildEnv( group ).WP_ENV_HOME;
	if ( ! wpEnvHome ) {
		return null;
	}

	let entries;
	try {
		entries = await fs.readdir( wpEnvHome, { withFileTypes: true } );
	} catch {
		return null;
	}

	const candidates = [];
	for ( const entry of entries ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const installPath = path.join( wpEnvHome, entry.name );
		const composePath = getComposePath( installPath );
		try {
			const stats = await fs.stat( composePath );
			candidates.push( { installPath, mtimeMs: stats.mtimeMs } );
		} catch {}
	}

	candidates.sort( ( left, right ) => right.mtimeMs - left.mtimeMs );
	return candidates[ 0 ]?.installPath ?? null;
}

function getOutputSnippet( output, maxLength = 1200 ) {
	const normalized = String( output ?? '' )
		.replaceAll( '\r', '' )
		.replace( /\s+/g, ' ' )
		.trim();
	if ( normalized.length <= maxLength ) {
		return normalized;
	}
	return `${ normalized.slice( 0, maxLength ) }...`;
}

function getAttemptLogPath( logPath, attempt ) {
	if ( ! logPath || attempt === 1 ) {
		return logPath;
	}
	const extension = path.extname( logPath );
	const basename = extension
		? logPath.slice( 0, -extension.length )
		: logPath;
	return `${ basename }-attempt-${ attempt }${ extension }`;
}

function looksLikeStaleDockerEndpoint( output ) {
	return /endpoint with name .* already exists|active endpoints|failed to set up container networking|network .* has active endpoints|invalid IP|container is marked for removal/i.test(
		String( output ?? '' )
	);
}

function looksLikePortCollision( output ) {
	return /Bind for [^\n\r]+ failed: port is already allocated|EADDRINUSE|address already in use/i.test(
		String( output ?? '' )
	);
}

function looksLikeDockerDiskPressure( output ) {
	return /no space left on device|disk got full|failed to (?:extract|register) layer|layerdb\/tmp\/write-set.*file exists/i.test(
		String( output ?? '' )
	);
}

function looksLikeDockerNetworkPoolExhaustion( output ) {
	return /all predefined address pools have been fully subnetted|could not find an available, non-overlapping IPv4 address pool/i.test(
		String( output ?? '' )
	);
}

function looksLikeWordPressDbFailure( output ) {
	return /Error establishing a database connection|database connection/i.test(
		String( output ?? '' )
	);
}

function getWpEnvCloneDestinationConflictPath( output ) {
	const match = String( output ?? '' ).match(
		/destination path '([^']+)' already exists and is not an empty directory/i
	);
	return match?.[ 1 ] ?? null;
}

function looksLikeWpEnvCloneDestinationConflict( output ) {
	const text = String( output ?? '' );
	return (
		getWpEnvCloneDestinationConflictPath( text ) !== null ||
		/untracked working tree files would be overwritten by checkout/i.test(
			text
		)
	);
}

function isPathInsideDirectory( parentPath, candidatePath ) {
	const relative = path.relative(
		path.resolve( parentPath ),
		path.resolve( candidatePath )
	);
	return (
		relative !== '' &&
		! relative.startsWith( '..' ) &&
		! path.isAbsolute( relative )
	);
}

async function retryWpEnvStartAfterDatabaseFailure(
	group,
	startResult,
	{ action, logPath }
) {
	let result = startResult;
	for (
		let index = 0;
		index < WP_ENV_DATABASE_FAILURE_RETRY_DELAYS_MS.length;
		index++
	) {
		if ( result.ok || ! looksLikeWordPressDbFailure( result.output ) ) {
			return result;
		}

		const attempt = index + 1;
		const delayMs = WP_ENV_DATABASE_FAILURE_RETRY_DELAYS_MS[ index ];
		await log(
			`${ group.name }: wp-env start reported database connection failure; waiting ${ delayMs }ms before retry ${ attempt }/${ WP_ENV_DATABASE_FAILURE_RETRY_DELAYS_MS.length }.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action,
			reason: 'database-connection-failure',
			attempt,
			delayMs,
		} );
		await sleep( delayMs );
		result = await runWpEnv( group, [ 'start' ], {
			timeoutMs: 10 * 60 * 1000,
			logPath: getAttemptLogPath( logPath, attempt ),
		} );
	}

	return result;
}

function getGroupAllocatedPorts( group ) {
	return [
		group.env?.WP_ENV_PORT,
		group.env?.WP_ENV_TESTS_PORT,
		group.env?.WP_ENV_PHPMYADMIN_PORT,
		group.env?.GUTENBERG_RTC_TEST_WS_PORT,
	]
		.map( ( value ) => String( value ?? '' ).trim() )
		.filter( ( value ) => /^\d+$/.test( value ) );
}

async function cleanupDockerPortCollisions( group, reason ) {
	const ports = getGroupAllocatedPorts( group );
	if ( ports.length === 0 ) {
		return false;
	}
	const result = await runCommand( {
		command: 'docker',
		args: [ 'ps', '--format', '{{.ID}} {{.Names}} {{.Ports}}' ],
		timeoutMs: 60000,
	} );
	if ( ! result.ok ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-port-collision-docker-scan-failed',
			reason,
			output: getOutputSnippet( result.output ),
		} );
		return false;
	}
	const staleContainerIds = [];
	for ( const line of result.output.split( '\n' ) ) {
		if (
			ports.some(
				( port ) =>
					line.includes( `0.0.0.0:${ port }->` ) ||
					line.includes( `[::]:${ port }->` )
			)
		) {
			const id = line.trim().split( /\s+/ )[ 0 ];
			if ( id ) {
				staleContainerIds.push( id );
			}
		}
	}
	if ( staleContainerIds.length === 0 ) {
		return false;
	}

	const removeResult = await runCommand( {
		command: 'docker',
		args: [ 'rm', '-f', ...staleContainerIds ],
		timeoutMs: 120000,
	} );
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'wp-env-port-collision-cleanup',
		reason,
		ports,
		staleContainerIds,
		ok: removeResult.ok,
		code: removeResult.code,
		output: getOutputSnippet( removeResult.output ),
	} );
	return removeResult.ok;
}

async function retryWpEnvStartAfterPortCollision(
	group,
	startResult,
	{ action, logPath }
) {
	if ( startResult.ok || ! looksLikePortCollision( startResult.output ) ) {
		return startResult;
	}
	await log(
		`${ group.name }: wp-env start hit a port collision; removing stale containers for allocated ports before retry.`
	);
	await cleanupDockerPortCollisions( group, action );
	await cleanPartialWpEnvCheckoutsBeforeStartRetry( group, action );
	await event( {
		group: group.name,
		kind: 'repair',
		action,
		reason: 'port-collision',
		ports: getGroupAllocatedPorts( group ),
	} );
	return runWpEnv( group, [ 'start' ], {
		timeoutMs: 10 * 60 * 1000,
		logPath: getAttemptLogPath( logPath, 'port-retry' ),
	} );
}

async function retryWpEnvStartAfterNetworkPoolExhaustion(
	group,
	startResult,
	{ action, logPath }
) {
	if (
		startResult.ok ||
		! looksLikeDockerNetworkPoolExhaustion( startResult.output )
	) {
		return startResult;
	}
	await log(
		`${ group.name }: wp-env start exhausted Docker address pools; pruning unused Docker networks before retry.`
	);
	const pruned = await pruneDockerNetworksForWpEnvStartup(
		group,
		action,
		startResult.output
	);
	if ( ! pruned ) {
		return startResult;
	}
	await cleanPartialWpEnvCheckoutsBeforeStartRetry(
		group,
		`${ action }-partial-checkout-cleanup`,
		startResult.output
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action,
		reason: 'docker-network-pool-exhaustion',
	} );
	return runWpEnv( group, [ 'start' ], {
		timeoutMs: 10 * 60 * 1000,
		logPath: getAttemptLogPath( logPath, 'network-prune-retry' ),
	} );
}

function normalizeBaseUrl( value ) {
	if ( ! value ) {
		return null;
	}
	try {
		const url = new URL( value.trim() );
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.toString().replace( /\/$/, '' );
	} catch {
		return null;
	}
}

function getUrlOrigin( value ) {
	if ( ! value ) {
		return null;
	}
	try {
		return new URL( value ).origin;
	} catch {
		return null;
	}
}

async function probeRestEndpoint( baseUrl ) {
	const expectedOrigin = getUrlOrigin( baseUrl );
	const endpoints = [
		new URL( '/wp-json/', baseUrl ).toString(),
		new URL( '/index.php?rest_route=/', baseUrl ).toString(),
	];
	const failures = [];

	for ( const endpoint of endpoints ) {
		const controller = new AbortController();
		const timeout = setTimeout( () => controller.abort(), 10000 );
		timeout.unref();
		try {
			const response = await fetch( endpoint, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'rtc-browser-fuzz-supervisor',
				},
				signal: controller.signal,
			} );
			const body = await response.text();
			const responseOrigin = getUrlOrigin( response.url );
			if (
				expectedOrigin &&
				responseOrigin &&
				responseOrigin !== expectedOrigin
			) {
				failures.push(
					`${ endpoint } redirected to wrong origin ${ responseOrigin }; expected ${ expectedOrigin }`
				);
				continue;
			}

			let parsed = null;
			try {
				parsed = JSON.parse( body );
			} catch {}
			const restOrigins = [
				getUrlOrigin( parsed?.url ),
				getUrlOrigin( parsed?.home ),
				getUrlOrigin(
					parsed?.routes?.[ '/' ]?._links?.self?.[ 0 ]?.href
				),
			].filter( Boolean );
			const wrongOrigins = expectedOrigin
				? restOrigins.filter( ( origin ) => origin !== expectedOrigin )
				: [];
			const ok =
				response.ok &&
				parsed &&
				Array.isArray( parsed.namespaces ) &&
				wrongOrigins.length === 0;
			if ( ok ) {
				return {
					ok: true,
					baseUrl,
					endpoint,
					status: response.status,
				};
			}
			if ( wrongOrigins.length ) {
				failures.push(
					`${ endpoint } REST discovery reported wrong origin(s) ${ [
						...new Set( wrongOrigins ),
					].join( ', ' ) }; expected ${ expectedOrigin }`
				);
				continue;
			}
			failures.push(
				`${ endpoint } status=${
					response.status
				} body=${ getOutputSnippet( body, 240 ) }`
			);
		} catch ( error ) {
			failures.push( `${ endpoint } ${ error.message }` );
		} finally {
			clearTimeout( timeout );
		}
	}

	return {
		ok: false,
		baseUrl,
		failures,
	};
}

async function findHealthyRestEndpoint( candidates ) {
	for ( const candidate of candidates ) {
		const probe = await probeRestEndpoint( candidate );
		if ( probe.ok ) {
			return probe;
		}
	}
	return null;
}

function getExplicitBaseUrl( group ) {
	return (
		normalizeBaseUrl( group.env?.RTC_FUZZ_BASE_URL ) ??
		normalizeBaseUrl( group.env?.WP_BASE_URL )
	);
}

function makeBaseUrlCandidates( group, statusOutput, siteUrl ) {
	const httpPort = parseHttpPort( statusOutput );
	return [
		getExplicitBaseUrl( group ),
		siteUrl,
		httpPort ? `http://localhost:${ httpPort }` : null,
	]
		.filter( Boolean )
		.filter(
			( value, index, values ) => values.indexOf( value ) === index
		);
}

async function getWpEnvComposeServices( group, installPath ) {
	const composePath = getComposePath( installPath );
	const projectName = getComposeProjectName( installPath );
	const result = await runCommand( {
		command: 'docker',
		args: [
			'compose',
			'-f',
			composePath,
			'-p',
			projectName,
			'config',
			'--services',
		],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: 60000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-wp-env-compose-services.log`
		),
	} );

	if ( ! result.ok ) {
		return [ 'mysql', 'wordpress', 'cli' ];
	}

	const services = result.output
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
	const preferredOrder = [
		'mysql',
		'tests-mysql',
		'wordpress',
		'tests-wordpress',
		'cli',
		'tests-cli',
	];
	const selected = preferredOrder.filter( ( service ) =>
		services.includes( service )
	);
	return selected.length
		? selected
		: services.filter( ( service ) => ! service.includes( 'phpmyadmin' ) );
}

async function patchWpEnvMariaDbHealthcheck( group ) {
	const sourcePath = path.join(
		group.repoRoot,
		'node_modules',
		'@wordpress',
		'env',
		'lib',
		'runtime',
		'docker',
		'build-docker-compose-config.js'
	);
	if ( patchedWpEnvHealthcheckFiles.has( sourcePath ) ) {
		return;
	}
	patchedWpEnvHealthcheckFiles.add( sourcePath );

	try {
		const source = await fs.readFile( sourcePath, 'utf8' );
		if ( ! source.includes( WP_ENV_MARIADB_HEALTHCHECK_SOURCE ) ) {
			return;
		}
		await fs.writeFile(
			sourcePath,
			source.replace(
				WP_ENV_MARIADB_HEALTHCHECK_SOURCE,
				WP_ENV_MARIADB_HEALTHCHECK_TARGET
			)
		);
		await log(
			`${ group.name }: patched wp-env MariaDB healthcheck for stale healthcheck credentials.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-mariadb-healthcheck-template-patch',
			sourcePath,
		} );
	} catch ( error ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-mariadb-healthcheck-template-patch-failed',
			error: error.message,
			sourcePath,
		} );
	}
}

async function patchGeneratedComposeMariaDbHealthcheck( group, composePath ) {
	try {
		const source = await fs.readFile( composePath, 'utf8' );
		if ( ! source.includes( COMPOSE_MARIADB_HEALTHCHECK_SOURCE ) ) {
			return;
		}
		await fs.writeFile(
			composePath,
			source.replace(
				COMPOSE_MARIADB_HEALTHCHECK_SOURCE,
				COMPOSE_MARIADB_HEALTHCHECK_TARGET
			)
		);
		await log(
			`${ group.name }: patched generated-compose MariaDB healthcheck for stale healthcheck credentials.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-generated-compose-mariadb-healthcheck-patch',
			composePath,
		} );
	} catch ( error ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-generated-compose-mariadb-healthcheck-patch-failed',
			error: error.message,
			composePath,
		} );
	}
}

async function runWpEnvCompose( group, installPath, args, label, timeoutMs ) {
	const composePath = getComposePath( installPath );
	const projectName = getComposeProjectName( installPath );
	return runCommand( {
		command: 'docker',
		args: [ 'compose', '-f', composePath, '-p', projectName, ...args ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs,
		logPath: path.join( OUTPUT_DIR, `${ group.name }-${ label }.log` ),
	} );
}

async function maybeRunSafeDockerPrune( group, reason, diagnosticOutput ) {
	const shouldPruneStorage =
		looksLikeDockerDiskPressure( diagnosticOutput ) ||
		looksLikeWordPressDbFailure( diagnosticOutput );
	const shouldPruneNetworks =
		looksLikeDockerNetworkPoolExhaustion( diagnosticOutput );
	if ( ! shouldPruneStorage && ! shouldPruneNetworks ) {
		return false;
	}

	const commands = [
		...( shouldPruneStorage
			? [
					[ 'container', [ 'container', 'prune', '-f' ] ],
					[ 'image', [ 'image', 'prune', '-af' ] ],
					[ 'builder', [ 'builder', 'prune', '-af' ] ],
					[ 'volume', [ 'volume', 'prune', '-f' ] ],
			  ]
			: [] ),
		...( shouldPruneNetworks
			? [ [ 'network', [ 'network', 'prune', '-f' ] ] ]
			: [] ),
	];
	for ( const [ label, args ] of commands ) {
		const result = await runCommand( {
			command: 'docker',
			args,
			cwd: group.repoRoot,
			env: buildEnv( group ),
			timeoutMs: label === 'builder' ? 10 * 60 * 1000 : 3 * 60 * 1000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-docker-${ label }-prune.log`
			),
		} );
		await event( {
			group: group.name,
			kind: 'repair',
			action: `docker-${ label }-prune`,
			reason,
			ok: result.ok,
			code: result.code,
			output: getOutputSnippet( result.output ),
		} );
	}

	return true;
}

async function pruneDockerNetworksForWpEnvStartup( group, reason, output ) {
	if ( ! looksLikeDockerNetworkPoolExhaustion( output ) ) {
		return false;
	}

	await log(
		`${ group.name }: wp-env start exhausted Docker address pools; pruning stopped containers and unused Docker networks before retry.`
	);
	const containerPrune = await runCommand( {
		command: 'docker',
		args: [ 'container', 'prune', '-f' ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: 3 * 60 * 1000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-docker-stopped-container-prune.log`
		),
	} );
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'docker-stopped-container-prune',
		reason,
		ok: containerPrune.ok,
		code: containerPrune.code,
		output: getOutputSnippet( containerPrune.output ),
	} );
	if ( ! containerPrune.ok ) {
		await log(
			`${ group.name }: stopped-container prune failed while repairing Docker address pool exhaustion; attempting network prune anyway.`
		);
	}

	await log(
		`${ group.name }: pruning unused Docker networks after stopped-container cleanup.`
	);
	const result = await runCommand( {
		command: 'docker',
		args: [ 'network', 'prune', '-f' ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: 3 * 60 * 1000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-docker-network-prune.log`
		),
	} );
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'docker-network-prune',
		reason,
		ok: result.ok,
		code: result.code,
		output: getOutputSnippet( result.output ),
	} );
	return result.ok;
}

async function restartOrbStackDockerIfNeeded( group, reason, output ) {
	if ( ! AUTO_REPAIR_ORBSTACK_DOCKER ) {
		return false;
	}
	if ( ! looksLikeStaleDockerEndpoint( output ) ) {
		return false;
	}
	if (
		Date.now() - lastOrbStackDockerRestartAt <
		ORBSTACK_DOCKER_RESTART_COOLDOWN_MS
	) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'orbstack-docker-restart-skipped',
			reason,
			cooldownMs: ORBSTACK_DOCKER_RESTART_COOLDOWN_MS,
			output: getOutputSnippet( output ),
		} );
		return false;
	}

	await log(
		`${ group.name }: restarting OrbStack Docker to clear stale Docker network endpoint state.`
	);
	const result = await runCommand( {
		command: 'orb',
		args: [ 'restart', 'docker' ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: 3 * 60 * 1000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-orbstack-docker-restart.log`
		),
	} );
	lastOrbStackDockerRestartAt = Date.now();
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'orbstack-docker-restart',
		reason,
		ok: result.ok,
		code: result.code,
		output: getOutputSnippet( result.output ),
	} );
	return result.ok;
}

async function waitForHealthyRestEndpoint( candidates, timeoutMs = 45000 ) {
	const deadline = Date.now() + timeoutMs;
	let lastProbe = null;
	while ( Date.now() < deadline ) {
		for ( const candidate of candidates ) {
			const probe = await probeRestEndpoint( candidate );
			lastProbe = probe;
			if ( probe.ok ) {
				return probe;
			}
		}
		await sleep( 1000 );
	}
	return lastProbe;
}

async function findHealthyWpEnvAfterFailedStart( group ) {
	const statusResult = await runWpEnv( group, [ 'status' ], {
		timeoutMs: 120000,
		logPath: path.join(
			OUTPUT_DIR,
			`${ group.name }-wp-env-status-after-failed-start.log`
		),
	} );
	if ( ! isWpEnvRunningStatus( statusResult ) ) {
		return null;
	}

	const siteUrl = await getWpSiteUrl( group );
	const candidates = makeBaseUrlCandidates(
		group,
		statusResult.output,
		siteUrl
	);
	const probe = await waitForHealthyRestEndpoint(
		candidates,
		WP_ENV_REPAIR_REPROBE_TIMEOUT_MS
	);
	if ( ! probe?.ok ) {
		return null;
	}

	return {
		candidates,
		probe,
		siteUrl,
		statusResult,
	};
}

async function maybeUseBorrowedWpEnv( group, groupState ) {
	const borrowedFrom = String(
		group.env?.RTC_FUZZ_WP_ENV_BORROWED_FROM ?? ''
	).trim();
	if ( ! borrowedFrom ) {
		return null;
	}

	const baseUrl = getExplicitBaseUrl( group );
	if ( ! baseUrl ) {
		throw new Error(
			`${ group.name }: borrowed wp-env from ${ borrowedFrom } without an explicit base URL.`
		);
	}

	const probe =
		( await findHealthyRestEndpoint( [ baseUrl ] ) ) ??
		( await waitForHealthyRestEndpoint(
			[ baseUrl ],
			WP_ENV_REPAIR_REPROBE_TIMEOUT_MS
		) );
	if ( ! probe?.ok ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'borrowed-wp-env-unhealthy',
			borrowedFrom,
			baseUrl,
			failures: probe?.failures ?? [],
		} );
		throw new Error(
			`${ group.name }: borrowed wp-env from ${ borrowedFrom } is not healthy at ${ baseUrl }.`
		);
	}

	groupState.currentBaseUrl = probe.baseUrl;
	groupState.lastHealthyAt = new Date().toISOString();
	await log(
		`${ group.name }: using healthy borrowed wp-env from ${ borrowedFrom } at ${ probe.baseUrl }.`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'borrowed-wp-env-healthy',
		borrowedFrom,
		baseUrl: probe.baseUrl,
	} );
	return probe.baseUrl;
}

async function repairWpEnvWithGeneratedCompose( {
	group,
	reason,
	statusOutput,
	diagnosticOutput = '',
	candidates = [],
	restRepair = false,
} ) {
	if ( ! AUTO_REPAIR_WP_ENV ) {
		return false;
	}

	const prunedDockerResources = await maybeRunSafeDockerPrune(
		group,
		reason,
		diagnosticOutput
	);
	let installPath = parseWpEnvInstallPath( statusOutput );
	if ( ! installPath ) {
		installPath = await findGeneratedWpEnvInstallPath( group );
		if ( installPath ) {
			await event( {
				group: group.name,
				kind: 'repair',
				action: 'wp-env-generated-compose-install-path-fallback',
				reason,
				installPath,
			} );
		}
	}
	if ( ! installPath ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-generated-compose-skipped',
			reason,
			why: prunedDockerResources
				? 'missing-install-path-after-docker-prune'
				: 'missing-install-path',
		} );
		return prunedDockerResources;
	}

	const composePath = getComposePath( installPath );
	if ( ! ( await fileExists( composePath ) ) ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-generated-compose-skipped',
			reason,
			why: 'missing-compose-file',
			composePath,
		} );
		return false;
	}

	await patchGeneratedComposeMariaDbHealthcheck( group, composePath );

	const services = await getWpEnvComposeServices( group, installPath );
	const steps = restRepair
		? [
				{
					label: 'wp-env-compose-restart',
					args: [ 'restart', ...services ],
					timeoutMs: 3 * 60 * 1000,
				},
				{
					label: 'wp-env-compose-force-recreate',
					args: [
						'up',
						'-d',
						'--force-recreate',
						'--remove-orphans',
						...services,
					],
					timeoutMs: 10 * 60 * 1000,
				},
		  ]
		: [
				{
					label: 'wp-env-compose-up',
					args: [ 'up', '-d', '--remove-orphans', ...services ],
					timeoutMs: 10 * 60 * 1000,
				},
				{
					label: 'wp-env-compose-restart',
					args: [ 'restart', ...services ],
					timeoutMs: 3 * 60 * 1000,
				},
		  ];

	await log(
		`${
			group.name
		}: attempting generated-compose wp-env repair (${ reason }); services=${ services.join(
			','
		) }.`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'wp-env-generated-compose-start',
		reason,
		installPath,
		services,
		restRepair,
	} );

	for ( const step of steps ) {
		const result = await runWpEnvCompose(
			group,
			installPath,
			step.args,
			step.label,
			step.timeoutMs
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: step.label,
			reason,
			ok: result.ok,
			code: result.code,
			output: getOutputSnippet( result.output ),
		} );

		if ( result.ok ) {
			if ( candidates.length === 0 ) {
				return true;
			}
			const probe = await waitForHealthyRestEndpoint( candidates );
			if ( probe?.ok ) {
				return true;
			}
		}

		if ( looksLikeStaleDockerEndpoint( result.output ) ) {
			await runWpEnvCompose(
				group,
				installPath,
				[ 'down', '--remove-orphans' ],
				'wp-env-compose-down-stale-endpoint',
				3 * 60 * 1000
			);
			if (
				await restartOrbStackDockerIfNeeded(
					group,
					reason,
					result.output
				)
			) {
				const retry = await runWpEnvCompose(
					group,
					installPath,
					[ 'up', '-d', '--remove-orphans', ...services ],
					'wp-env-compose-up-after-orbstack-restart',
					10 * 60 * 1000
				);
				await event( {
					group: group.name,
					kind: 'repair',
					action: 'wp-env-compose-up-after-orbstack-restart',
					reason,
					ok: retry.ok,
					code: retry.code,
					output: getOutputSnippet( retry.output ),
				} );
				if ( retry.ok ) {
					if ( candidates.length === 0 ) {
						return true;
					}
					const probe =
						await waitForHealthyRestEndpoint( candidates );
					if ( probe?.ok ) {
						return true;
					}
				}
			}
		}

		if (
			await pruneDockerNetworksForWpEnvStartup(
				group,
				reason,
				result.output
			)
		) {
			const retry = await runWpEnvCompose(
				group,
				installPath,
				step.args,
				`${ step.label }-after-network-prune`,
				step.timeoutMs
			);
			await event( {
				group: group.name,
				kind: 'repair',
				action: `${ step.label }-after-network-prune`,
				reason,
				ok: retry.ok,
				code: retry.code,
				output: getOutputSnippet( retry.output ),
			} );
			if ( retry.ok ) {
				if ( candidates.length === 0 ) {
					return true;
				}
				const probe = await waitForHealthyRestEndpoint( candidates );
				if ( probe?.ok ) {
					return true;
				}
			}
		}
	}

	return false;
}

async function cleanPartialWpEnvCheckoutsBeforeStartRetry(
	group,
	reason,
	diagnosticOutput = ''
) {
	const installPath = await findGeneratedWpEnvInstallPath( group );
	if ( ! installPath ) {
		return false;
	}
	const candidates = [ path.join( installPath, 'WordPress' ) ];
	const conflictPath =
		getWpEnvCloneDestinationConflictPath( diagnosticOutput );
	if ( conflictPath && isPathInsideDirectory( installPath, conflictPath ) ) {
		candidates.push( conflictPath );
	}

	const checkoutPaths = [];
	for ( const candidate of [
		...new Set(
			candidates.map( ( candidatePath ) => path.resolve( candidatePath ) )
		),
	] ) {
		if ( await fileExists( candidate ) ) {
			checkoutPaths.push( candidate );
		}
	}
	if ( checkoutPaths.length === 0 ) {
		return false;
	}

	await runWpEnvCompose(
		group,
		installPath,
		[ 'down', '--remove-orphans' ],
		'wp-env-compose-down-before-start-retry',
		3 * 60 * 1000
	);
	for ( const checkoutPath of checkoutPaths ) {
		await fs.rm( checkoutPath, { recursive: true, force: true } );
	}
	await log(
		`${
			group.name
		}: removed partial generated-compose checkout(s) before wp-env start retry (${ reason }): ${ checkoutPaths.join(
			', '
		) }.`
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'wp-env-remove-partial-generated-checkouts',
		reason,
		installPath,
		checkoutPaths,
		conflictPath,
	} );
	return true;
}

async function retryWpEnvStartAfterCloneDestinationConflict(
	group,
	startResult,
	{ action, reason, logPath }
) {
	if (
		startResult.ok ||
		! looksLikeWpEnvCloneDestinationConflict( startResult.output )
	) {
		return startResult;
	}
	const repaired = await cleanPartialWpEnvCheckoutsBeforeStartRetry(
		group,
		reason,
		startResult.output
	);
	if ( ! repaired ) {
		await event( {
			group: group.name,
			kind: 'repair',
			action: `${ action }-skipped`,
			reason,
			output: getOutputSnippet( startResult.output ),
		} );
		return startResult;
	}
	await event( {
		group: group.name,
		kind: 'repair',
		action,
		reason,
		output: getOutputSnippet( startResult.output ),
	} );
	return runWpEnv( group, [ 'start' ], {
		timeoutMs: 10 * 60 * 1000,
		logPath,
	} );
}

async function getWpSiteUrl( group ) {
	const result = await runWpEnv(
		group,
		[ 'run', 'cli', 'wp', 'option', 'get', 'siteurl' ],
		{
			timeoutMs: 60000,
		}
	);
	if ( ! result.ok ) {
		return null;
	}
	return normalizeBaseUrl(
		result.output
			.split( '\n' )
			.map( ( line ) => line.trim() )
			.find(
				( line ) =>
					line.startsWith( 'http://' ) ||
					line.startsWith( 'https://' )
			)
	);
}

function getBaseUrlHost( baseUrl ) {
	try {
		return new URL( baseUrl ).host;
	} catch {
		return null;
	}
}

async function setWpBaseUrl( group, baseUrl ) {
	const configUpdates = [
		[ 'WP_SITEURL', baseUrl ],
		[ 'WP_HOME', baseUrl ],
		[ 'WP_TESTS_DOMAIN', getBaseUrlHost( baseUrl ) ],
	].filter( ( [ , value ] ) => Boolean( value ) );

	for ( const [ constantName, value ] of configUpdates ) {
		const result = await runWpEnv(
			group,
			[
				'run',
				'cli',
				'wp',
				'config',
				'set',
				constantName,
				value,
				'--type=constant',
			],
			{ timeoutMs: 60000 }
		);
		if ( ! result.ok ) {
			throw new Error(
				`${ group.name }: failed to update wp-config constant ${ constantName } to ${ value }.\n${ result.output }`
			);
		}
	}

	for ( const optionName of [ 'siteurl', 'home' ] ) {
		const result = await runWpEnv(
			group,
			[ 'run', 'cli', 'wp', 'option', 'update', optionName, baseUrl ],
			{ timeoutMs: 60000 }
		);
		if ( ! result.ok ) {
			throw new Error(
				`${ group.name }: failed to update WordPress option ${ optionName } to ${ baseUrl }.\n${ result.output }`
			);
		}
	}
}

async function ensureWordPressInstalledAfterRepair( group, baseUrl ) {
	const isInstalled = await runWpEnv(
		group,
		[ 'run', 'cli', 'wp', 'core', 'is-installed' ],
		{
			timeoutMs: 60000,
		}
	);
	if ( isInstalled.ok ) {
		return;
	}

	const installResult = await runWpEnv(
		group,
		[
			'run',
			'cli',
			'wp',
			'core',
			'install',
			`--url=${ baseUrl }`,
			'--title=RTC',
			'--admin_user=admin',
			'--admin_password=password',
			'--admin_email=admin@example.com',
			'--skip-email',
		],
		{
			timeoutMs: 120000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-core-install-after-rest-repair.log`
			),
		}
	);
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'wp-core-install-after-rest-repair',
		ok: installResult.ok,
		code: installResult.code,
		output: getOutputSnippet( installResult.output ),
	} );
	if ( ! installResult.ok ) {
		throw new Error(
			`${ group.name }: wp core install failed after REST repair; see ${ group.name }-wp-core-install-after-rest-repair.log`
		);
	}
}

async function ensureWpEnv( groupState ) {
	const group = getGroupConfig( groupState.name );
	await ensureGutenbergVendorScripts( group );
	await ensureGutenbergBlockManifests( group );
	await ensurePackageCjsEntrypoints( group );
	await ensureGutenbergStyleArtifacts( group );
	await patchWpEnvMariaDbHealthcheck( group );
	const borrowedBaseUrl = await maybeUseBorrowedWpEnv( group, groupState );
	if ( borrowedBaseUrl ) {
		return borrowedBaseUrl;
	}
	let statusResult = await runWpEnv( group, [ 'status' ], {
		timeoutMs: 120000,
		logPath: path.join( OUTPUT_DIR, `${ group.name }-wp-env-status.log` ),
	} );

	if ( ! isWpEnvRunningStatus( statusResult ) ) {
		await log( `${ group.name }: wp-env is not running; starting it.` );
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-start',
		} );
		const wpEnvStartLog = `${ group.name }-wp-env-start.log`;
		let startResult = await runWpEnv( group, [ 'start' ], {
			timeoutMs: 10 * 60 * 1000,
			logPath: path.join( OUTPUT_DIR, wpEnvStartLog ),
		} );
		startResult = await retryWpEnvStartAfterDatabaseFailure(
			group,
			startResult,
			{
				action: 'wp-env-start-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-retry.log`
				),
			}
		);
		startResult = await retryWpEnvStartAfterPortCollision(
			group,
			startResult,
			{
				action: 'wp-env-start-port-collision-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-port-collision-retry.log`
				),
			}
		);
		startResult = await retryWpEnvStartAfterNetworkPoolExhaustion(
			group,
			startResult,
			{
				action: 'wp-env-start-network-prune-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-network-prune-retry.log`
				),
			}
		);
		startResult = await retryWpEnvStartAfterDatabaseFailure(
			group,
			startResult,
			{
				action: 'wp-env-start-after-port-collision-db-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-port-collision-db-retry.log`
				),
			}
		);
		startResult = await retryWpEnvStartAfterCloneDestinationConflict(
			group,
			startResult,
			{
				action: 'wp-env-start-after-clone-conflict-retry',
				reason: 'wp-env-start-clone-destination-conflict',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-clone-conflict-retry.log`
				),
			}
		);
		startResult = await retryWpEnvStartAfterDatabaseFailure(
			group,
			startResult,
			{
				action: 'wp-env-start-after-clone-conflict-db-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-clone-conflict-db-retry.log`
				),
			}
		);
		if ( ! startResult.ok ) {
			const recovered = await findHealthyWpEnvAfterFailedStart( group );
			if ( recovered ) {
				statusResult = recovered.statusResult;
				await log(
					`${ group.name }: wp-env reported healthy after failed start; skipping generated-compose repair.`
				);
				await event( {
					group: group.name,
					kind: 'repair',
					action: 'wp-env-start-failed-but-rest-healthy',
					baseUrl: recovered.probe.baseUrl,
				} );
			} else {
				const repaired = await repairWpEnvWithGeneratedCompose( {
					group,
					reason: 'wp-env-start-failed',
					statusOutput: statusResult.output,
					diagnosticOutput: startResult.output,
				} );
				if ( ! repaired ) {
					throw new Error(
						summarizeWpEnvStartFailure(
							group,
							startResult,
							wpEnvStartLog
						)
					);
				}
				await log(
					`${ group.name }: retrying wp-env start after generated-compose repair.`
				);
				await event( {
					group: group.name,
					kind: 'repair',
					action: 'wp-env-start-after-compose-repair',
				} );
				const wpEnvStartAfterComposeRepairLog = `${ group.name }-wp-env-start-after-compose-repair.log`;
				await cleanPartialWpEnvCheckoutsBeforeStartRetry(
					group,
					'wp-env-start-after-compose-repair',
					startResult.output
				);
				startResult = await runWpEnv( group, [ 'start' ], {
					timeoutMs: 10 * 60 * 1000,
					logPath: path.join(
						OUTPUT_DIR,
						wpEnvStartAfterComposeRepairLog
					),
				} );
				startResult = await retryWpEnvStartAfterDatabaseFailure(
					group,
					startResult,
					{
						action: 'wp-env-start-after-compose-repair-db-retry',
						logPath: path.join(
							OUTPUT_DIR,
							`${ group.name }-wp-env-start-after-compose-repair-db-retry.log`
						),
					}
				);
				startResult = await retryWpEnvStartAfterPortCollision(
					group,
					startResult,
					{
						action: 'wp-env-start-after-compose-repair-port-retry',
						logPath: path.join(
							OUTPUT_DIR,
							`${ group.name }-wp-env-start-after-compose-repair-port-retry.log`
						),
					}
				);
				startResult = await retryWpEnvStartAfterDatabaseFailure(
					group,
					startResult,
					{
						action: 'wp-env-start-after-compose-repair-port-db-retry',
						logPath: path.join(
							OUTPUT_DIR,
							`${ group.name }-wp-env-start-after-compose-repair-port-db-retry.log`
						),
					}
				);
				startResult = await retryWpEnvStartAfterNetworkPoolExhaustion(
					group,
					startResult,
					{
						action: 'wp-env-start-after-compose-repair-network-prune-retry',
						logPath: path.join(
							OUTPUT_DIR,
							`${ group.name }-wp-env-start-after-compose-repair-network-prune-retry.log`
						),
					}
				);
				startResult =
					await retryWpEnvStartAfterCloneDestinationConflict(
						group,
						startResult,
						{
							action: 'wp-env-start-after-compose-repair-clone-conflict-retry',
							reason: 'wp-env-start-after-compose-repair-clone-destination-conflict',
							logPath: path.join(
								OUTPUT_DIR,
								`${ group.name }-wp-env-start-after-compose-repair-clone-conflict-retry.log`
							),
						}
					);
				startResult = await retryWpEnvStartAfterDatabaseFailure(
					group,
					startResult,
					{
						action: 'wp-env-start-after-compose-repair-clone-conflict-db-retry',
						logPath: path.join(
							OUTPUT_DIR,
							`${ group.name }-wp-env-start-after-compose-repair-clone-conflict-db-retry.log`
						),
					}
				);
				if ( ! startResult.ok ) {
					throw new Error(
						summarizeWpEnvStartFailure(
							group,
							startResult,
							wpEnvStartAfterComposeRepairLog
						)
					);
				}
			}
		}
		statusResult = await runWpEnv( group, [ 'status' ], {
			timeoutMs: 120000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-env-status.log`
			),
		} );
		if ( ! isWpEnvRunningStatus( statusResult ) ) {
			if ( isWpEnvUninitializedStatus( statusResult ) ) {
				await log(
					`${ group.name }: wp-env still reports uninitialized after start; retrying start once.`
				);
				await event( {
					group: group.name,
					kind: 'repair',
					action: 'wp-env-start-after-uninitialized-status',
				} );
				await runWpEnv( group, [ 'start' ], {
					timeoutMs: 10 * 60 * 1000,
					logPath: path.join(
						OUTPUT_DIR,
						`${ group.name }-wp-env-start-after-uninitialized-status.log`
					),
				} );
				statusResult = await runWpEnv( group, [ 'status' ], {
					timeoutMs: 120000,
					logPath: path.join(
						OUTPUT_DIR,
						`${ group.name }-wp-env-status.log`
					),
				} );
			}
		}
		if ( ! isWpEnvRunningStatus( statusResult ) ) {
			throw new Error(
				`${ group.name }: wp-env repair did not restore running status.`
			);
		}
	}

	let siteUrl = await getWpSiteUrl( group );
	const explicitBaseUrl = getExplicitBaseUrl( group );
	if ( explicitBaseUrl && siteUrl && siteUrl !== explicitBaseUrl ) {
		await log(
			`${ group.name }: repairing WordPress base URL ${ siteUrl } -> ${ explicitBaseUrl } before REST probe.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-option-explicit-base-url',
			from: siteUrl,
			to: explicitBaseUrl,
		} );
		await setWpBaseUrl( group, explicitBaseUrl );
		siteUrl = explicitBaseUrl;
	}
	const candidates = makeBaseUrlCandidates(
		group,
		statusResult.output,
		siteUrl
	);

	let probe = await findHealthyRestEndpoint( candidates );
	if ( ! probe ) {
		const delayedProbe = await waitForHealthyRestEndpoint(
			candidates,
			WP_ENV_REPAIR_REPROBE_TIMEOUT_MS
		);
		if ( delayedProbe?.ok ) {
			probe = delayedProbe;
		}
	}
	if ( ! probe ) {
		const diagnosticOutput = candidates.length
			? (
					await Promise.all(
						candidates.map( async ( candidate ) =>
							probeRestEndpoint( candidate )
						)
					)
			  )
					.flatMap( ( candidateProbe ) => candidateProbe.failures )
					.join( '\n' )
			: 'no candidate REST endpoint';
		await repairWpEnvWithGeneratedCompose( {
			group,
			reason: 'rest-endpoint-unhealthy',
			statusOutput: statusResult.output,
			diagnosticOutput,
			candidates,
			restRepair: true,
		} );
		await cleanPartialWpEnvCheckoutsBeforeStartRetry(
			group,
			'wp-env-start-after-rest-repair'
		);
		let repairStartResult = await runWpEnv( group, [ 'start' ], {
			timeoutMs: 10 * 60 * 1000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-env-start-after-rest-repair.log`
			),
		} );
		repairStartResult = await retryWpEnvStartAfterDatabaseFailure(
			group,
			repairStartResult,
			{
				action: 'wp-env-start-after-rest-repair-db-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-rest-repair-db-retry.log`
				),
			}
		);
		repairStartResult = await retryWpEnvStartAfterPortCollision(
			group,
			repairStartResult,
			{
				action: 'wp-env-start-after-rest-repair-port-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-rest-repair-port-retry.log`
				),
			}
		);
		repairStartResult = await retryWpEnvStartAfterDatabaseFailure(
			group,
			repairStartResult,
			{
				action: 'wp-env-start-after-rest-repair-port-db-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-rest-repair-port-db-retry.log`
				),
			}
		);
		repairStartResult = await retryWpEnvStartAfterNetworkPoolExhaustion(
			group,
			repairStartResult,
			{
				action: 'wp-env-start-after-rest-repair-network-prune-retry',
				logPath: path.join(
					OUTPUT_DIR,
					`${ group.name }-wp-env-start-after-rest-repair-network-prune-retry.log`
				),
			}
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-start-after-rest-repair',
			ok: repairStartResult.ok,
			code: repairStartResult.code,
			output: getOutputSnippet( repairStartResult.output ),
		} );
		if ( ! repairStartResult.ok ) {
			throw new Error(
				`${ group.name }: wp-env start failed after REST repair; see ${ group.name }-wp-env-start-after-rest-repair.log`
			);
		}
		const installBaseUrl =
			normalizeBaseUrl( group.env?.RTC_FUZZ_BASE_URL ) ??
			normalizeBaseUrl( group.env?.WP_BASE_URL ) ??
			candidates[ 0 ];
		if ( installBaseUrl ) {
			await ensureWordPressInstalledAfterRepair( group, installBaseUrl );
		}
		statusResult = await runWpEnv( group, [ 'status' ], {
			timeoutMs: 120000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-env-status.log`
			),
		} );
		const repairedSiteUrl = await getWpSiteUrl( group );
		const repairedCandidates = makeBaseUrlCandidates(
			group,
			statusResult.output,
			repairedSiteUrl
		);
		probe = await findHealthyRestEndpoint( repairedCandidates );
		if ( probe ) {
			siteUrl = repairedSiteUrl;
			candidates.splice( 0, candidates.length, ...repairedCandidates );
		}
	}

	if ( probe ) {
		if ( siteUrl && siteUrl !== probe.baseUrl ) {
			await log(
				`${ group.name }: repairing WordPress base URL ${ siteUrl } -> ${ probe.baseUrl }.`
			);
			await event( {
				group: group.name,
				kind: 'repair',
				action: 'wp-option-base-url',
				from: siteUrl,
				to: probe.baseUrl,
			} );
			await setWpBaseUrl( group, probe.baseUrl );
		}
		groupState.currentBaseUrl = probe.baseUrl;
		groupState.lastHealthyAt = new Date().toISOString();
		return probe.baseUrl;
	}

	throw new Error(
		`${
			group.name
		}: no healthy REST endpoint after repair. candidates=${ candidates.join(
			', '
		) }`
	);
}

async function ensureWsRelay( group ) {
	let port = String(
		group.wsPort ?? group.env?.GUTENBERG_RTC_TEST_WS_PORT ?? '18991'
	);
	const probe = await probeWsRelay( port );
	if ( probe.healthy ) {
		return;
	}
	if ( ! probe.free ) {
		const nextPort = await findAvailableWsRelayPort( port );
		await log(
			`${ group.name }: WebSocket relay port ${ port } is occupied by non-relay service (${ probe.detail }); using ${ nextPort } instead.`
		);
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'ws-relay-port-collision',
			from: port,
			to: nextPort,
			detail: probe.detail,
		} );
		port = nextPort;
		setGroupWsRelayPort( group, port );
	}

	const logPath = path.join( OUTPUT_DIR, `${ group.name }-ws-relay.log` );
	const logFd = await fs.open( logPath, 'a' );
	const child = spawn(
		process.execPath,
		[ 'bin/rtc-test-ws-sync-server.mjs', '--port', port ],
		{
			cwd: path.resolve( group.wsServerRepoRoot ?? group.repoRoot ),
			detached: true,
			stdio: [ 'ignore', logFd.fd, logFd.fd ],
			env: buildEnv( group, {
				GUTENBERG_RTC_TEST_WS_PORT: port,
			} ),
		}
	);
	child.unref();
	await logFd.close();
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'start-ws-relay',
		port,
		pid: child.pid,
	} );

	for ( let attempt = 0; attempt < 50; attempt++ ) {
		const retry = await probeWsRelay( port );
		if ( retry.healthy ) {
			return;
		}
		await sleep( 200 );
	}

	throw new Error(
		`${ group.name }: WebSocket relay did not become healthy on ${ port }.`
	);
}

async function probeWsRelay( port ) {
	const healthUrl = `http://127.0.0.1:${ port }/health`;
	const response = await fetch( healthUrl, {
		signal: AbortSignal.timeout( 1000 ),
	} ).catch( () => null );
	if ( response ) {
		const contentType = response.headers.get( 'content-type' ) ?? '';
		const body = await response.text().catch( () => '' );
		let payload = null;
		try {
			payload = JSON.parse( body );
		} catch {}
		const healthy =
			response.ok &&
			payload?.name === 'gutenberg-rtc-test-ws-sync-server' &&
			payload?.ok === true;
		return {
			healthy,
			free: false,
			detail: `http ${ response.status } ${ contentType } ${
				typeof payload?.name === 'string'
					? payload.name
					: body.slice( 0, 80 ).replace( /\s+/g, ' ' )
			}`.trim(),
		};
	}
	return {
		healthy: false,
		free: await isLocalTcpPortFree( port ),
		detail: 'no HTTP health response',
	};
}

function isLocalTcpPortFree( port ) {
	return new Promise( ( resolve ) => {
		const server = createServer();
		let settled = false;
		const done = ( value ) => {
			if ( settled ) {
				return;
			}
			settled = true;
			resolve( value );
		};
		server.once( 'error', () => done( false ) );
		server.listen( Number( port ), '127.0.0.1', () => {
			server.close( () => done( true ) );
		} );
	} );
}

async function findAvailableWsRelayPort( requestedPort ) {
	const base = Number( requestedPort );
	if ( ! Number.isFinite( base ) ) {
		throw new Error(
			`Cannot find alternate WebSocket relay port for invalid port ${ requestedPort }.`
		);
	}
	for (
		let offset = 1000;
		offset < 1000 + WS_RELAY_PORT_SEARCH_LIMIT;
		offset++
	) {
		const candidate = String( base + offset );
		if ( await isLocalTcpPortFree( candidate ) ) {
			return candidate;
		}
	}
	throw new Error(
		`No free alternate WebSocket relay port found near ${ requestedPort }.`
	);
}

function setGroupWsRelayPort( group, port ) {
	group.wsPort = Number( port );
	group.wsUrl = `ws://127.0.0.1:${ port }`;
	group.env = {
		...( group.env ?? {} ),
		GUTENBERG_RTC_TEST_WS_PORT: String( port ),
		GUTENBERG_RTC_TEST_WS_URL: group.wsUrl,
	};
}

async function ensureTransport( groupState ) {
	const group = getGroupConfig( groupState.name );
	if ( group.transport === 'ws' ) {
		await ensureWsRelay( group );
		await runWpEnv(
			group,
			[
				'run',
				'cli',
				'wp',
				'plugin',
				'activate',
				'gutenberg-test-plugins/rtc-websocket-provider',
			],
			{ timeoutMs: 60000 }
		);
		return;
	}

	await runWpEnv(
		group,
		[
			'run',
			'cli',
			'wp',
			'plugin',
			'deactivate',
			'gutenberg-test-plugins/rtc-websocket-provider',
		],
		{ timeoutMs: 60000 }
	);
}

function groupEnvForLaunch(
	group,
	groupState,
	baseUrl,
	runDir,
	{
		laneCount = groupState.lanes,
		seedStride = groupState.lanes,
		startSeeds = null,
	} = {}
) {
	const transportEnv =
		group.transport === 'ws'
			? {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
					GUTENBERG_RTC_TEST_WS_PORT: String(
						group.wsPort ??
							group.env?.GUTENBERG_RTC_TEST_WS_PORT ??
							'18991'
					),
					GUTENBERG_RTC_TEST_WS_URL:
						group.wsUrl ??
						group.env?.GUTENBERG_RTC_TEST_WS_URL ??
						`ws://127.0.0.1:${
							group.wsPort ??
							group.env?.GUTENBERG_RTC_TEST_WS_PORT ??
							'18991'
						}`,
					GUTENBERG_RTC_TEST_WS_SKIP_RESET: '1',
			  }
			: {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '0',
			  };

	return buildEnv( group, {
		...transportEnv,
		...( NETWORK_TOPOLOGY_LOCK_FILE
			? {
					RTC_FUZZ_NETWORK_TOPOLOGY_LOCK_FILE:
						NETWORK_TOPOLOGY_LOCK_FILE,
			  }
			: {} ),
		RTC_FUZZ_BASE_URL: baseUrl,
		WP_BASE_URL: baseUrl,
		RTC_FUZZ_OUTPUT_DIR: runDir,
		RTC_FUZZ_PARALLEL_LANES: String( laneCount ),
		RTC_FUZZ_START_SEED: String(
			startSeeds?.[ 0 ] ?? groupState.nextStartSeed
		),
		...( startSeeds?.length
			? { RTC_FUZZ_START_SEEDS: startSeeds.join( ',' ) }
			: {} ),
		RTC_FUZZ_TOTAL_SEED_STRIDE: String( seedStride ),
		RTC_FUZZ_STEP_COUNT: String( groupState.stepCount ),
		RTC_FUZZ_DURATION_HOURS: String(
			Math.max( 0.1, ( END_AT - Date.now() ) / ( 60 * 60 * 1000 ) )
		),
		RTC_FUZZ_INLINE_CODEX: group.inlineCodex ?? '0',
		RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP: group.skipGlobalPostCleanup ?? '1',
		RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS:
			group.healthCheckIntervalSeeds ?? '1',
		RTC_FUZZ_HTTP_HEALTH_TIMEOUT_MS: group.httpHealthTimeoutMs ?? '10000',
	} );
}

async function launchGroup(
	groupState,
	reason,
	laneCount = groupState.lanes,
	{ seedStride = groupState.lanes, startSeeds = null } = {}
) {
	const group = getGroupConfig( groupState.name );
	const baseUrl = await ensureWpEnv( groupState );
	await ensureTransport( groupState );

	groupState.generation += 1;
	groupState.lastReason = reason;
	groupState.lastRecoveryAt = new Date().toISOString();
	groupState.status = 'launching';

	const runDir = path.join(
		OUTPUT_DIR,
		`${ group.name }-gen-${ groupState.generation }-${ createTimestamp() }`
	);
	await fs.mkdir( runDir, { recursive: true } );
	const launchLogPath = path.join( runDir, 'supervisor-launcher.log' );
	await log(
		`${ group.name }: launching ${ laneCount } ${
			group.transport
		} lane(s) from seed(s) ${
			startSeeds?.length
				? startSeeds.join( ',' )
				: groupState.nextStartSeed
		} stride ${ seedStride } at ${ baseUrl } (${ reason }).`
	);
	await event( {
		group: group.name,
		kind: 'launch',
		reason,
		runDir,
		baseUrl,
		lanes: laneCount,
		startSeed: startSeeds?.[ 0 ] ?? groupState.nextStartSeed,
		startSeeds,
		seedStride,
		transport: group.transport,
	} );

	const launchResult = await runCommand( {
		command: process.execPath,
		args: [ 'bin/rtc-browser-fuzz-launcher.mjs' ],
		cwd: group.repoRoot,
		env: {
			...groupEnvForLaunch( group, groupState, baseUrl, runDir, {
				laneCount,
				seedStride,
				startSeeds,
			} ),
			RTC_FUZZ_PARALLEL_LANES: String( laneCount ),
		},
		timeoutMs: 180000,
		logPath: launchLogPath,
	} );

	if ( ! launchResult.ok ) {
		groupState.status = 'launch-failed';
		groupState.launches.push( {
			runDir,
			at: new Date().toISOString(),
			ok: false,
			reason,
			logPath: launchLogPath,
		} );
		await writeState();
		throw new Error(
			`${ group.name }: launcher failed with code=${ launchResult.code }; see ${ launchLogPath }`
		);
	}

	groupState.currentRunDir = runDir;
	groupState.activeRunDirs = [
		...( groupState.activeRunDirs ?? [] ),
		runDir,
	].filter( ( value, index, values ) => values.indexOf( value ) === index );
	groupState.currentBaseUrl = baseUrl;
	groupState.status = 'running';
	groupState.lastLaunchAt = new Date().toISOString();
	groupState.launches.push( {
		runDir,
		at: groupState.lastLaunchAt,
		ok: true,
		reason,
		baseUrl,
		lanes: laneCount,
		startSeed: startSeeds?.[ 0 ] ?? groupState.nextStartSeed,
		startSeeds,
		seedStride,
	} );
	await writeState();
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function getHarnessOverlaySignatureForRoot( root, files ) {
	if ( ! Array.isArray( files ) ) {
		return null;
	}
	const hash = crypto.createHash( 'sha256' );
	for ( const relativePath of files ) {
		const filePath = path.join( root, relativePath );
		let stat;
		try {
			stat = await fs.lstat( filePath );
			hash.update( relativePath );
			hash.update( '\0' );
			hash.update( String( stat.mode & 0o777 ) );
			hash.update( '\0' );
			if ( stat.isSymbolicLink() ) {
				hash.update( await fs.readlink( filePath ) );
			} else {
				hash.update( await fs.readFile( filePath ) );
			}
			hash.update( '\0' );
		} catch {
			return null;
		}
	}
	return hash.digest( 'hex' );
}

async function findSummaryFiles( runDir ) {
	const files = [];

	async function walk( dir, depth ) {
		if ( depth > 6 ) {
			return;
		}

		let entries;
		try {
			entries = await fs.readdir( dir, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				if (
					SUMMARY_SCAN_IGNORED_DIRS.has( entry.name ) ||
					( entry.name === 'external-imports' &&
						! INCLUDE_EXTERNAL_IMPORTS )
				) {
					continue;
				}
				await walk( entryPath, depth + 1 );
			} else if ( entry.name === 'summary.ndjson' ) {
				files.push( entryPath );
			}
		}
	}

	await walk( runDir, 0 );
	return files.sort();
}

function hasActionableBehavioralCoverageSummary( summary ) {
	if ( ! summary || typeof summary !== 'object' ) {
		return false;
	}
	if (
		Object.entries( summary.userCounts ?? {} ).some(
			( [ userCount, count ] ) =>
				Number( userCount ) > 0 && Number( count ) > 0
		)
	) {
		return true;
	}
	if (
		( summary.actionCount ?? 0 ) > 0 ||
		( summary.reloadCount ?? 0 ) > 0 ||
		( summary.saveCheckpointCount ?? 0 ) > 0 ||
		( summary.autosaveCount ?? 0 ) > 0 ||
		( summary.revisionEligibleCount ?? 0 ) > 0
	) {
		return true;
	}
	return false;
}

function hasActionableCoverageRecord( record ) {
	if ( ! record || typeof record !== 'object' ) {
		return false;
	}
	if ( ( record.userCount ?? 0 ) > 0 ) {
		return true;
	}
	if ( hasOracleCoverageEvidence( record ) ) {
		return true;
	}
	return (
		( record.actions?.length ?? 0 ) > 0 ||
		( record.reloads?.length ?? 0 ) > 0 ||
		( record.saveCheckpointSteps?.length ?? 0 ) > 0 ||
		( record.autosaveSteps?.length ?? 0 ) > 0 ||
		record.revisionRestore?.eligible === true ||
		( record.operationEvents?.length ?? 0 ) > 0
	);
}

function hasOracleCoverageEvidence( record ) {
	const oraclePattern =
		/(?:oracle|ui-baseline|post-new-ui|rendered-editor|persisted-post|save-clean)/i;
	return [
		...( record?.historyEvents ?? [] ).map(
			( historyEvent ) => historyEvent.phase
		),
		...( record?.invariantEvents ?? [] ).flatMap( ( invariantEvent ) => [
			invariantEvent.phase,
			invariantEvent.name,
		] ),
	]
		.filter( Boolean )
		.some( ( value ) => oraclePattern.test( String( value ) ) );
}

function getCoverageFailureText( record ) {
	return [
		record?.error,
		...( record?.historyEvents ?? [] ).map(
			( historyEvent ) => historyEvent.error
		),
	]
		.filter( Boolean )
		.join( '\n' );
}

function getSummaryFailureText( record ) {
	return [
		record?.error,
		record?.message,
		record?.failureSnippet,
		record?.output,
		...( Array.isArray( record?.attempts ) ? record.attempts : [] ).map(
			getSummaryFailureText
		),
	]
		.filter( Boolean )
		.join( '\n' );
}

function isStrictPreActionStartupCoverageRecord( record ) {
	if ( record?.status !== 'failed' ) {
		return false;
	}
	if ( hasActionableCoverageRecord( record ) ) {
		return false;
	}

	const failedHistoryPhases = ( record.historyEvents ?? [] )
		.filter( ( historyEvent ) => historyEvent.status === 'fail' )
		.map( ( historyEvent ) => historyEvent.phase )
		.filter( Boolean );
	if (
		failedHistoryPhases.length > 0 &&
		! failedHistoryPhases.some( ( phase ) =>
			STARTUP_DISCOVERY_PHASES.has( phase )
		)
	) {
		return false;
	}

	return STARTUP_DISCOVERY_FAILURE_PATTERN.test(
		getCoverageFailureText( record )
	);
}

function isNoProductStartupSetupSummaryRecord( record ) {
	if ( ! record || typeof record !== 'object' ) {
		return false;
	}
	if ( hasSummaryProductEvidence( record ) ) {
		return false;
	}
	return STARTUP_DISCOVERY_FAILURE_PATTERN.test(
		getSummaryFailureText( record )
	);
}

function hasSummaryProductEvidence( record ) {
	if (
		hasActionableBehavioralCoverageSummary(
			record?.behavioralCoverageSummary
		)
	) {
		return true;
	}
	if (
		( Array.isArray( record?.behavioralCoverage )
			? record.behavioralCoverage
			: []
		).some( hasActionableCoverageRecord )
	) {
		return true;
	}
	return ( Array.isArray( record?.attempts ) ? record.attempts : [] ).some(
		hasSummaryProductEvidence
	);
}

function hasFailedSummaryProductEvidence( record ) {
	if ( ! hasSummaryProductEvidence( record ) ) {
		return false;
	}

	if ( record?.ok === false || record?.status === 'failed' ) {
		return true;
	}
	if ( ( record?.behavioralCoverageSummary?.statuses?.failed ?? 0 ) > 0 ) {
		return true;
	}
	if (
		( Array.isArray( record?.behavioralCoverage )
			? record.behavioralCoverage
			: []
		).some( ( coverageRecord ) => coverageRecord?.status === 'failed' )
	) {
		return true;
	}
	return ( Array.isArray( record?.attempts ) ? record.attempts : [] ).some(
		hasFailedSummaryProductEvidence
	);
}

function isStrictPreActionStartupGateBucket( bucket ) {
	return [
		'pre-action-bootstrap-stall',
		'pre-action-http-polling-sync-cycle-timeout',
	].includes( bucket );
}

function isStrictPreActionStartupGateAttempt( attempt ) {
	if ( ! isStrictPreActionStartupGateBucket( attempt?.bucket ) ) {
		return false;
	}
	if (
		attempt.lastAction ||
		( attempt.reloadCount ?? 0 ) > 0 ||
		( attempt.saveCheckpointCount ?? 0 ) > 0 ||
		( attempt.autosaveCount ?? 0 ) > 0 ||
		attempt.revisionEligible === true ||
		( attempt.operationWitnessActions?.length ?? 0 ) > 0 ||
		( attempt.operationWitnessScopes?.length ?? 0 ) > 0 ||
		!! attempt.operationWitnessPhase
	) {
		return false;
	}
	return (
		! attempt.lastHistoryPhase ||
		STARTUP_DISCOVERY_PHASES.has( attempt.lastHistoryPhase )
	);
}

function isStrictPreActionStartupAttemptSummaryRecord( record ) {
	if ( record?.kind !== 'attempt' || record.ok === true ) {
		return false;
	}
	if ( hasSummaryProductEvidence( record ) ) {
		return false;
	}

	const coverageRecords = Array.isArray( record.behavioralCoverage )
		? record.behavioralCoverage
		: [];
	return (
		( coverageRecords.length > 0 &&
			coverageRecords.every( isStrictPreActionStartupCoverageRecord ) ) ||
		isNoProductStartupSetupSummaryRecord( record )
	);
}

function isStrictPreActionStartupSummaryRecord( record ) {
	if ( isStrictPreActionStartupAttemptSummaryRecord( record ) ) {
		return true;
	}
	if ( isNoProductStartupSetupSummaryRecord( record ) ) {
		return true;
	}
	if (
		! isStrictPreActionStartupGateBucket( record?.preAnalysisGate?.bucket )
	) {
		return false;
	}
	if ( hasSummaryProductEvidence( record ) ) {
		return false;
	}

	const gateAttempts = Array.isArray( record.preAnalysisGate.attempts )
		? record.preAnalysisGate.attempts
		: [];
	return (
		gateAttempts.length > 0 &&
		gateAttempts.every( isStrictPreActionStartupGateAttempt )
	);
}

async function summarizeStartupStallNoise( runDirs ) {
	const summary = {
		runDirs: runDirs.length,
		files: 0,
		lines: 0,
		parseErrors: 0,
		strictStartupRecords: 0,
		strictStartupFailures: 0,
		productEvidenceRecords: 0,
		productFailureRecords: 0,
		otherRecords: 0,
		strictStartupRecordShare: 0,
	};
	const strictFailureKeys = new Set();

	for ( const runDir of runDirs ) {
		const files = await findSummaryFiles( runDir );
		summary.files += files.length;
		for ( const filePath of files ) {
			const text = await fs
				.readFile( filePath, 'utf8' )
				.catch( () => '' );
			for ( const line of text.split( '\n' ) ) {
				if ( ! line.trim() ) {
					continue;
				}
				summary.lines += 1;
				let record;
				try {
					record = JSON.parse( line );
				} catch {
					summary.parseErrors += 1;
					continue;
				}
				if ( hasSummaryProductEvidence( record ) ) {
					summary.productEvidenceRecords += 1;
					if ( hasFailedSummaryProductEvidence( record ) ) {
						summary.productFailureRecords += 1;
					}
					continue;
				}
				if ( isStrictPreActionStartupSummaryRecord( record ) ) {
					summary.strictStartupRecords += 1;
					strictFailureKeys.add(
						`${ record.seed ?? 'unknown' }:${ filePath }`
					);
				} else {
					summary.otherRecords += 1;
				}
			}
		}
	}

	summary.strictStartupFailures = strictFailureKeys.size;
	const classifiedRecords =
		summary.strictStartupRecords +
		summary.productEvidenceRecords +
		summary.otherRecords;
	summary.strictStartupRecordShare =
		classifiedRecords > 0
			? Number(
					(
						summary.strictStartupRecords / classifiedRecords
					).toFixed( 4 )
			  )
			: 0;
	return summary;
}

function getStartupStallPauseUntilMs( groupState ) {
	const timestamp = Date.parse( groupState.startupStallPausedUntil ?? '' );
	return Number.isFinite( timestamp ) ? timestamp : 0;
}

function getStartupStallDrainRecordedUntilMs( groupState ) {
	const timestamp = Date.parse(
		groupState.startupStallDrainRecordedUntil ?? ''
	);
	return Number.isFinite( timestamp ) ? timestamp : 0;
}

function getStartupStallHoldUntilMs( groupState ) {
	return Math.max(
		getStartupStallPauseUntilMs( groupState ),
		getStartupStallDrainRecordedUntilMs( groupState )
	);
}

function getStartupStallProductEvidenceCount( groupState ) {
	const summaryCount = Number(
		groupState.startupStallNoiseSummary?.productEvidenceRecords
	);
	if ( Number.isFinite( summaryCount ) && summaryCount > 0 ) {
		return summaryCount;
	}

	const reason = groupState.lastReason ?? '';
	const productEvidenceMatch = reason.match(
		/(\d+)\s+product-evidence record\(s\)/i
	);
	if ( productEvidenceMatch ) {
		const parsed = Number.parseInt( productEvidenceMatch[ 1 ], 10 );
		return Number.isFinite( parsed ) ? parsed : 0;
	}
	return 0;
}

function getStartupStallRecordShare( groupState ) {
	const summaryShare = Number(
		groupState.startupStallNoiseSummary?.strictStartupRecordShare
	);
	if ( Number.isFinite( summaryShare ) && summaryShare >= 0 ) {
		return summaryShare;
	}

	const reason = groupState.lastReason ?? '';
	const shareMatch = reason.match( /startup share\s+([0-9.]+)%/i );
	if ( shareMatch ) {
		const parsed = Number.parseFloat( shareMatch[ 1 ] );
		return Number.isFinite( parsed ) ? parsed / 100 : null;
	}
	return null;
}

function shouldRecoverProductEvidenceStartupStall( groupState ) {
	if ( getStartupStallProductEvidenceCount( groupState ) <= 0 ) {
		return false;
	}
	const reason = groupState.lastReason ?? '';
	if ( ! /strict pre-action bootstrap noise guard/i.test( reason ) ) {
		return false;
	}
	const startupShare = getStartupStallRecordShare( groupState );
	return (
		startupShare !== null &&
		startupShare < STARTUP_STALL_GUARD_DOMINANCE_MIN_RATE
	);
}

function hasNoProductStartupStallDrainCooldown( groupState ) {
	const drainRecordedUntilMs =
		getStartupStallDrainRecordedUntilMs( groupState );
	if ( drainRecordedUntilMs <= Date.now() ) {
		return false;
	}
	if ( getStartupStallProductEvidenceCount( groupState ) > 0 ) {
		return false;
	}

	const reason = groupState.lastReason ?? '';
	return (
		groupState.noAnalysisFamily === 'pre_action_bootstrap_stall' ||
		groupState.noAnalysisReasonKind === 'startup-noise' ||
		/startup-stall|startup noise|bootstrap noise|seed drain/i.test( reason )
	);
}

function isBypassableStartupStallSeedDrain( groupState ) {
	if ( ! hasNoProductStartupStallDrainCooldown( groupState ) ) {
		return false;
	}
	if ( getStartupStallProductEvidenceCount( groupState ) > 0 ) {
		return false;
	}
	const seedDrainCount = Number( groupState.startupStallSeedDrainCount );
	if ( Number.isFinite( seedDrainCount ) && seedDrainCount > 0 ) {
		return true;
	}
	const reason = groupState.lastReason ?? '';
	if ( ! /seed drain/i.test( reason ) ) {
		return false;
	}
	const cumulativeMatch = reason.match(
		/cumulative startup-noise seed\(s\)\s+(\d+)\/(\d+)/i
	);
	if ( cumulativeMatch ) {
		const current = Number.parseInt( cumulativeMatch[ 1 ], 10 );
		const threshold = Number.parseInt( cumulativeMatch[ 2 ], 10 );
		return (
			Number.isFinite( current ) &&
			Number.isFinite( threshold ) &&
			current < threshold
		);
	}
	return false;
}

function isNoProductStartupStallNoiseState( groupState ) {
	if ( getStartupStallProductEvidenceCount( groupState ) > 0 ) {
		return false;
	}

	const reason = groupState.lastReason ?? '';
	const summary = groupState.startupStallNoiseSummary ?? {};
	const hasStrictStartupEvidence =
		( summary.strictStartupFailures ?? 0 ) > 0 ||
		groupState.noAnalysisFamily === 'pre_action_bootstrap_stall' ||
		groupState.noAnalysisReasonKind === 'startup-noise' ||
		/startup failure seed|strict pre-action bootstrap noise|pre_action_bootstrap_stall|startup-stall|seed drain/i.test(
			reason
		);
	if ( ! hasStrictStartupEvidence ) {
		return false;
	}

	return (
		groupState.noAnalysisFamily === 'pre_action_bootstrap_stall' ||
		groupState.noAnalysisReasonKind === 'startup-noise' ||
		/startup-stall|startup noise|bootstrap noise|seed drain/i.test( reason )
	);
}

function shouldRecoverStartupStallInsteadOfPause( groupState ) {
	const reason = groupState.lastReason ?? '';
	if ( getStartupStallProductEvidenceCount( groupState ) > 0 ) {
		return shouldRecoverProductEvidenceStartupStall( groupState );
	}
	if ( hasNoProductStartupStallDrainCooldown( groupState ) ) {
		return shouldBypassStartupStallCooldown(
			getGroupConfig( groupState.name ),
			groupState
		);
	}
	if ( isNoProductStartupStallNoiseState( groupState ) ) {
		return false;
	}
	if ( groupState.startupStallRecoveryMode === 'recover' ) {
		return true;
	}
	if ( /seed drain|startup-stall-noise-seed-drain/i.test( reason ) ) {
		return true;
	}

	const startupFailureMatch = reason.match(
		/(\d+)\s+startup failure seed\(s\)/i
	);
	const productEvidenceMatch = reason.match(
		/(\d+)\s+product-evidence record\(s\)/i
	);
	const hasProductEvidence = productEvidenceMatch
		? Number.parseInt( productEvidenceMatch[ 1 ], 10 ) > 0
		: false;
	const summaryHasProductEvidence =
		( groupState.startupStallNoiseSummary?.productEvidenceRecords ?? 0 ) >
		0;
	const startupFailures = startupFailureMatch
		? Number.parseInt( startupFailureMatch[ 1 ], 10 )
		: 0;
	if (
		! hasProductEvidence &&
		! summaryHasProductEvidence &&
		startupFailures > 0
	) {
		return false;
	}

	if ( ! hasProductEvidence && ! summaryHasProductEvidence ) {
		return false;
	}
	return false;
}

function hasStartupStallNoAnalysisRoutingState( groupState ) {
	return (
		groupState?.noAnalysisReasonKind === 'startup-noise' ||
		groupState?.noAnalysisFamily === 'pre_action_bootstrap_stall' ||
		( groupState?.noAnalysisRunDirs?.length ?? 0 ) > 0 ||
		( groupState?.startupStallRunDirs?.length ?? 0 ) > 0
	);
}

async function clearStaleStartupStallNoAnalysisRoutingState( groupState ) {
	if (
		! hasStartupStallNoAnalysisRoutingState( groupState ) ||
		getStartupStallHoldUntilMs( groupState ) > Date.now() ||
		! [ 'running', 'recovering' ].includes( groupState.status )
	) {
		return false;
	}

	if ( isNoProductStartupStallNoiseState( groupState ) ) {
		const pauseAt = new Date().toISOString();
		const pauseUntil = new Date(
			Date.now() + STARTUP_STALL_GUARD_COOLDOWN_MS
		).toISOString();
		groupState.status = 'paused-startup-stall';
		groupState.startupStallPausedAt ??= pauseAt;
		groupState.startupStallPausedUntil = pauseUntil;
		groupState.startupStallDrainRecordedAt ??= pauseAt;
		groupState.startupStallDrainRecordedUntil = pauseUntil;
		groupState.noAnalysisReasonKind = 'startup-noise';
		groupState.noAnalysisFamily = 'pre_action_bootstrap_stall';
		groupState.noAnalysisSource ??= 'supervisor-startup-stall-guard';
		delete groupState.startupStallRecoveryMode;
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'restore-stale-startup-stall-no-analysis-cooldown',
			reason: 'legacy no-product startup-stall routing state had no active TTL; restoring cooldown instead of relaunching the same producer',
			drainRecordedUntil: pauseUntil,
			noAnalysisRunDirs: groupState.noAnalysisRunDirs ?? [],
			startupStallRunDirs: groupState.startupStallRunDirs ?? [],
			nextStatus: groupState.status,
		} );
		await writeState();
		return true;
	}

	const staleNoAnalysisRunDirs = groupState.noAnalysisRunDirs ?? [];
	const staleStartupStallRunDirs = groupState.startupStallRunDirs ?? [];
	groupState.noAnalysisRunDirs = [];
	groupState.startupStallRunDirs = [];
	delete groupState.noAnalysisReasonKind;
	delete groupState.noAnalysisFamily;
	delete groupState.noAnalysisSource;
	delete groupState.startupStallRecoveryMode;
	await event( {
		group: groupState.name,
		kind: 'policy',
		action: 'clear-stale-startup-stall-no-analysis-routing',
		reason: 'running/recovering group had startup-stall no-analysis routing state without an active pause or drain TTL; per-run sentinels remain authoritative',
		noAnalysisRunDirs: staleNoAnalysisRunDirs,
		startupStallRunDirs: staleStartupStallRunDirs,
		nextStatus: groupState.status,
	} );
	await writeState();
	return true;
}

async function releaseStartupStallHoldForRecovery(
	groupState,
	action,
	holdUntil
) {
	let changed = false;
	const wasPaused = groupState.status === 'paused-startup-stall';

	if ( groupState.startupStallPausedAt ) {
		delete groupState.startupStallPausedAt;
		changed = true;
	}
	if ( groupState.startupStallPausedUntil ) {
		delete groupState.startupStallPausedUntil;
		changed = true;
	}
	if ( groupState.startupStallDrainRecordedAt ) {
		delete groupState.startupStallDrainRecordedAt;
		changed = true;
	}
	if ( groupState.startupStallDrainRecordedUntil ) {
		delete groupState.startupStallDrainRecordedUntil;
		changed = true;
	}
	if ( groupState.startupStallRecoveryMode !== 'recover' ) {
		groupState.startupStallRecoveryMode = 'recover';
		changed = true;
	}
	if ( wasPaused ) {
		groupState.status = getActiveRunDirs( groupState ).length
			? 'running'
			: 'recovering';
		changed = true;
	}

	if ( ! changed ) {
		return;
	}

	await event( {
		group: groupState.name,
		kind: 'policy',
		action,
		reason: groupState.lastReason,
		holdUntil,
		nextStatus: groupState.status,
		noAnalysisRunDirs: groupState.noAnalysisRunDirs ?? [],
	} );
	await writeState();
}

function resolveUniqueRunDirs( runDirs ) {
	return [
		...new Set(
			runDirs
				.filter( Boolean )
				.map( ( runDir ) => path.resolve( runDir ) )
		),
	];
}

function signalLaneProcess( pid, signal ) {
	try {
		process.kill( -pid, signal );
		return 'process-group';
	} catch {}

	try {
		process.kill( pid, signal );
		return 'pid';
	} catch {}

	return null;
}

async function stopSnapshotLanes(
	snapshots,
	reason,
	action = 'terminate-startup-stall-lane'
) {
	for ( const snapshot of snapshots ) {
		for ( const lane of snapshot.laneStates ) {
			if ( ! lane.pidAlive || lane.state?.stopReason ) {
				continue;
			}
			const target = signalLaneProcess( lane.pid, 'SIGTERM' );
			if ( target ) {
				setTimeout(
					() => signalLaneProcess( lane.pid, 'SIGKILL' ),
					5000
				).unref();
				await event( {
					group: lane.group ?? null,
					kind: 'policy',
					action,
					pid: lane.pid,
					target,
					laneLabel: lane.laneLabel,
					runDir: snapshot.runDir,
					reason,
				} );
			}
		}
	}
}

async function writeStartupStallNoAnalysisSentinels(
	groupState,
	runDirs,
	reason,
	noise,
	pauseUntil,
	{
		producerPauseRestorable = true,
		startupFailureThreshold = null,
		startupSeedDrainCount = null,
	} = {}
) {
	const written = [];
	const uniqueRunDirs = [ ...new Set( runDirs.filter( Boolean ) ) ];
	const productEvidenceRecords = noise.productEvidenceRecords ?? 0;
	const hasProductEvidence = productEvidenceRecords > 0;

	for ( const runDir of uniqueRunDirs ) {
		const sentinelPath = path.join(
			runDir,
			NO_ANALYSIS_SENTINEL_RELATIVE_PATH
		);
		await writeJsonFileAtomic( sentinelPath, {
			version: 1,
			createdAt: new Date().toISOString(),
			outputDir: OUTPUT_DIR,
			group: groupState.name,
			reason,
			reasonKind: 'startup-noise',
			family: 'pre_action_bootstrap_stall',
			source: 'supervisor-startup-stall-guard',
			pauseUntil,
			expiresAt: pauseUntil,
			noProductOnly: ! hasProductEvidence,
			productEvidenceRecords,
			hasProductEvidence,
			producerPauseRestorable,
			...( startupFailureThreshold !== null
				? { startupFailureThreshold }
				: {} ),
			...( startupSeedDrainCount !== null
				? { startupSeedDrainCount }
				: {} ),
			noise,
			preserveProductEvidence: true,
			note: 'Producer marked by supervisor strict startup-stall noise guard. Consumers must not spend analysis on signatures without product evidence from this run.',
		} );
		written.push( runDir );
	}

	if ( written.length ) {
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'write-no-analysis-sentinel',
			reason,
			reasonKind: 'startup-noise',
			family: 'pre_action_bootstrap_stall',
			source: 'supervisor-startup-stall-guard',
			pauseUntil,
			producerPauseRestorable,
			...( startupFailureThreshold !== null
				? { startupFailureThreshold }
				: {} ),
			...( startupSeedDrainCount !== null
				? { startupSeedDrainCount }
				: {} ),
			count: written.length,
			runDirs: written,
		} );
	}

	return written;
}

async function maybePauseGroupForStartupStallNoise( groupState, snapshots ) {
	if ( ! STARTUP_STALL_GUARD_ENABLED ) {
		return false;
	}

	const activeRunDirs = snapshots.map( ( snapshot ) => snapshot.runDir );
	const noise = await summarizeStartupStallNoise( activeRunDirs );
	groupState.startupStallNoiseSummary = noise;

	const hasZeroProductEvidence = ( noise.productEvidenceRecords ?? 0 ) === 0;
	const strictStartupDominatesMixedRun =
		noise.strictStartupFailures >=
			STARTUP_STALL_GUARD_DOMINANCE_MIN_FAILURES &&
		noise.strictStartupRecordShare >=
			STARTUP_STALL_GUARD_DOMINANCE_MIN_RATE;
	// A single transient editor boot miss should not pause a whole coverage
	// group. Pause decisions use unique failed seeds; repeated summary
	// records for one seed are drained while still getting durable no-analysis
	// state for downstream consumers.
	const strictStartupEvidenceCount = noise.strictStartupFailures;
	const groupEnv = getGroupConfig( groupState.name ).env ?? {};
	const minStrictStartupFailures = hasZeroProductEvidence
		? getPositiveIntegerConfigValue(
				groupEnv.RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES,
				'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES',
				STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES
		  )
		: getPositiveIntegerConfigValue(
				groupEnv.RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES,
				'RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES',
				STARTUP_STALL_GUARD_MIN_FAILURES
		  );

	if ( ! hasZeroProductEvidence ) {
		delete groupState.startupStallSeedDrainCount;
		delete groupState.startupStallLastSeedDrainAt;
	} else if ( strictStartupEvidenceCount === 0 ) {
		const lastSeedDrainAtMs = Date.parse(
			groupState.startupStallLastSeedDrainAt ?? ''
		);
		if (
			! Number.isFinite( lastSeedDrainAtMs ) ||
			Date.now() - lastSeedDrainAtMs > STARTUP_STALL_GUARD_COOLDOWN_MS
		) {
			delete groupState.startupStallSeedDrainCount;
			delete groupState.startupStallLastSeedDrainAt;
		}
	}

	const priorStartupSeedDrainCount =
		groupState.startupStallSeedDrainCount ?? 0;
	const cumulativeStrictStartupEvidenceCount = hasZeroProductEvidence
		? priorStartupSeedDrainCount + strictStartupEvidenceCount
		: strictStartupEvidenceCount;

	if ( cumulativeStrictStartupEvidenceCount < minStrictStartupFailures ) {
		if ( hasZeroProductEvidence && strictStartupEvidenceCount > 0 ) {
			const seedDrainCount = cumulativeStrictStartupEvidenceCount;
			const reason = `strict pre-action bootstrap noise seed drain: ${ noise.strictStartupFailures } current startup failure seed(s), ${ noise.strictStartupRecords } startup record(s), cumulative startup-noise seed(s) ${ seedDrainCount }/${ minStrictStartupFailures }`;
			const skippedStartupSeeds = advanceNextStartSeedPastStartupNoise(
				groupState,
				snapshots
			);
			groupState.startupStallSeedDrainCount = seedDrainCount;
			groupState.startupStallLastSeedDrainAt = new Date().toISOString();
			const drainRecordedUntil = new Date(
				Date.now() + STARTUP_STALL_GUARD_COOLDOWN_MS
			).toISOString();
			const noAnalysisRunDirs =
				await writeStartupStallNoAnalysisSentinels(
					groupState,
					activeRunDirs,
					reason,
					noise,
					drainRecordedUntil,
					{
						producerPauseRestorable: true,
						startupFailureThreshold: minStrictStartupFailures,
						startupSeedDrainCount: seedDrainCount,
					}
				);
			await stopSnapshotLanes(
				snapshots,
				reason,
				'terminate-startup-stall-seed-drain'
			);
			const pausedNoAnalysisRunDirs = resolveUniqueRunDirs(
				noAnalysisRunDirs.length ? noAnalysisRunDirs : activeRunDirs
			);
			const recordedAt = new Date().toISOString();
			groupState.status = 'paused-startup-stall';
			groupState.lastReason = reason;
			groupState.startupStallPausedAt = recordedAt;
			groupState.startupStallPausedUntil = drainRecordedUntil;
			groupState.startupStallDrainRecordedAt = recordedAt;
			groupState.startupStallDrainRecordedUntil = drainRecordedUntil;
			delete groupState.startupStallRecoveryMode;
			groupState.startupStallRunDirs = pausedNoAnalysisRunDirs;
			groupState.noAnalysisRunDirs = pausedNoAnalysisRunDirs;
			groupState.noAnalysisReasonKind = 'startup-noise';
			groupState.noAnalysisFamily = 'pre_action_bootstrap_stall';
			groupState.noAnalysisSource = 'supervisor-startup-stall-guard';
			groupState.activeRunDirs = [];
			groupState.currentRunDir = null;
			await event( {
				group: groupState.name,
				kind: 'policy',
				action: 'drain-startup-stall-seed-cooldown',
				reason,
				noise,
				skippedStartupSeeds,
				seedDrainCount,
				noAnalysisRunDirs: pausedNoAnalysisRunDirs,
				noAnalysisExpiresAt: drainRecordedUntil,
				drainRecordedUntil,
				nextStatus: groupState.status,
			} );
			await writeState();
			return true;
		}
		return false;
	}

	if ( ! hasZeroProductEvidence && ! strictStartupDominatesMixedRun ) {
		return false;
	}

	const reason = `strict pre-action bootstrap noise guard: ${
		noise.strictStartupFailures
	} startup failure seed(s), ${
		noise.strictStartupRecords
	} startup record(s), ${
		noise.productEvidenceRecords
	} product-evidence record(s), ${
		noise.otherRecords
	} other record(s), startup share ${ (
		noise.strictStartupRecordShare * 100
	).toFixed( 1 ) }%, ${ noise.files } summary file(s)`;
	const pauseUntil = new Date(
		Date.now() + STARTUP_STALL_GUARD_COOLDOWN_MS
	).toISOString();
	const noAnalysisRunDirs = await writeStartupStallNoAnalysisSentinels(
		groupState,
		activeRunDirs,
		reason,
		noise,
		pauseUntil,
		{
			producerPauseRestorable: true,
			startupFailureThreshold: minStrictStartupFailures,
		}
	);
	const pausedNoAnalysisRunDirs = resolveUniqueRunDirs(
		noAnalysisRunDirs.length ? noAnalysisRunDirs : activeRunDirs
	);
	const skippedStartupSeeds = advanceNextStartSeedPastStartupNoise(
		groupState,
		snapshots
	);
	await stopSnapshotLanes( snapshots, reason );
	if ( ! hasZeroProductEvidence ) {
		groupState.status = 'paused-startup-stall';
		groupState.lastReason = reason;
		groupState.startupStallPausedAt = new Date().toISOString();
		groupState.startupStallPausedUntil = pauseUntil;
		groupState.startupStallDrainRecordedAt =
			groupState.startupStallPausedAt;
		groupState.startupStallDrainRecordedUntil = pauseUntil;
		delete groupState.startupStallRecoveryMode;
		groupState.startupStallRunDirs = pausedNoAnalysisRunDirs;
		groupState.noAnalysisRunDirs = pausedNoAnalysisRunDirs;
		groupState.noAnalysisReasonKind = 'startup-noise';
		groupState.noAnalysisFamily = 'pre_action_bootstrap_stall';
		groupState.noAnalysisSource = 'supervisor-startup-stall-guard';
		groupState.activeRunDirs = [];
		groupState.currentRunDir = null;
		await log(
			`${ groupState.name }: paused after ${ reason }; product-evidence run dirs preserved for triage.`
		);
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'pause-startup-stall-noise-mixed-product-evidence',
			reason,
			pauseUntil,
			drainRecordedUntil: pauseUntil,
			noise,
			skippedStartupSeeds,
			noAnalysisRunDirs: pausedNoAnalysisRunDirs,
			nextStatus: groupState.status,
		} );
		await writeState();
		return true;
	}
	groupState.status = 'paused-startup-stall';
	groupState.lastReason = reason;
	groupState.startupStallPausedAt = new Date().toISOString();
	groupState.startupStallPausedUntil = pauseUntil;
	groupState.startupStallDrainRecordedAt = groupState.startupStallPausedAt;
	groupState.startupStallDrainRecordedUntil = pauseUntil;
	delete groupState.startupStallRecoveryMode;
	groupState.startupStallRunDirs = pausedNoAnalysisRunDirs;
	groupState.noAnalysisRunDirs = pausedNoAnalysisRunDirs;
	groupState.noAnalysisReasonKind = 'startup-noise';
	groupState.noAnalysisFamily = 'pre_action_bootstrap_stall';
	groupState.noAnalysisSource = 'supervisor-startup-stall-guard';
	groupState.activeRunDirs = [];
	groupState.currentRunDir = null;
	await log(
		`${ groupState.name }: paused after ${ reason }; no-product startup-noise run dirs preserved for triage.`
	);
	await event( {
		group: groupState.name,
		kind: 'policy',
		action: 'pause-startup-stall-noise',
		reason,
		pauseUntil,
		drainRecordedUntil: pauseUntil,
		noise,
		skippedStartupSeeds,
		noAnalysisRunDirs: pausedNoAnalysisRunDirs,
		nextStatus: groupState.status,
	} );
	await writeState();
	return true;
}

function isPidAlive( pid ) {
	if ( ! pid ) {
		return false;
	}
	try {
		process.kill( pid, 0 );
		return true;
	} catch {
		return false;
	}
}

function getActiveRunDirs( groupState ) {
	return [ ...( groupState.activeRunDirs ?? [] ), groupState.currentRunDir ]
		.filter( Boolean )
		.filter(
			( value, index, values ) => values.indexOf( value ) === index
		);
}

function getResumeSeed( laneStates ) {
	const seeds = getResumeSeeds( laneStates );
	return seeds.length ? Math.min( ...seeds ) : null;
}

function getResumeSeeds( laneStates ) {
	return [
		...new Set(
			laneStates
				.map( getLaneResumeSeed )
				.filter( ( value ) => Number.isInteger( value ) )
		),
	].sort( ( a, b ) => a - b );
}

function advanceNextStartSeedPastStartupNoise( groupState, snapshots ) {
	const attemptedSeeds = getResumeSeeds(
		snapshots.flatMap( ( snapshot ) => snapshot.laneStates )
	);
	if ( attemptedSeeds.length === 0 ) {
		return [];
	}

	const maxAttemptedSeed = Math.max( ...attemptedSeeds );
	const seedStride =
		Number.isInteger( groupState.lanes ) && groupState.lanes > 0
			? groupState.lanes
			: 1;
	groupState.nextStartSeed = Math.max(
		Number.isInteger( groupState.nextStartSeed )
			? groupState.nextStartSeed
			: 0,
		maxAttemptedSeed + seedStride
	);
	groupState.startupStallSkippedSeeds = attemptedSeeds;
	return attemptedSeeds;
}

function getLaneResumeSeed( lane ) {
	if ( Number.isInteger( lane.state?.restartSeed ) ) {
		return lane.state.restartSeed;
	}

	if ( Number.isInteger( lane.state?.nextSeed ) ) {
		return lane.state.nextSeed;
	}

	if ( Number.isInteger( lane.startSeed ) ) {
		return lane.startSeed;
	}

	return null;
}

function getLaneSeedStride( lane ) {
	return lane.seedStride ?? lane.state?.seedStride;
}

function getReplacementStartSeeds(
	laneStates,
	laneCount,
	fallbackSeed,
	seedStride,
	activeLaneStates = []
) {
	const activeSequences = activeLaneStates
		.map( ( lane ) => ( {
			nextSeed: getLaneResumeSeed( lane ),
			seedStride: getLaneSeedStride( lane ),
		} ) )
		.filter(
			( lane ) =>
				Number.isInteger( lane.nextSeed ) &&
				Number.isInteger( lane.seedStride ) &&
				lane.seedStride > 0
		);
	const seeds = [];
	const seedAlreadyCovered = ( seed ) =>
		activeSequences.some( ( activeSequence ) =>
			seedSequencesOverlap(
				{ nextSeed: seed, seedStride },
				activeSequence
			)
		) ||
		seeds.some( ( existingSeed ) =>
			seedSequencesOverlap(
				{ nextSeed: seed, seedStride },
				{ nextSeed: existingSeed, seedStride }
			)
		);

	for ( const seed of getResumeSeeds( laneStates ) ) {
		if ( seeds.length >= laneCount ) {
			break;
		}
		if ( ! seedAlreadyCovered( seed ) ) {
			seeds.push( seed );
		}
	}

	let nextSeed = Number.isInteger( fallbackSeed ) ? fallbackSeed : 1007;

	while ( seeds.length < laneCount ) {
		let searchAttempts = 0;
		while (
			seedAlreadyCovered( nextSeed ) &&
			searchAttempts < REPLACEMENT_SEED_SEARCH_LIMIT
		) {
			nextSeed += 1;
			searchAttempts += 1;
		}
		seeds.push( nextSeed );
		nextSeed += 1;
	}

	return seeds;
}

function getActiveSeedOverlapWarnings( snapshots ) {
	const lanes = snapshots.flatMap( ( snapshot ) =>
		snapshot.laneStates
			.filter( ( lane ) => lane.pidAlive && ! lane.state?.stopReason )
			.map( ( lane ) => ( {
				nextSeed: getLaneResumeSeed( lane ),
				runDir: snapshot.runDir,
				seedStride: getLaneSeedStride( lane ),
				laneLabel: lane.laneLabel,
			} ) )
	);
	const warnings = [];

	for ( let index = 0; index < lanes.length; index++ ) {
		for (
			let otherIndex = index + 1;
			otherIndex < lanes.length;
			otherIndex++
		) {
			const first = lanes[ index ];
			const second = lanes[ otherIndex ];
			if ( ! seedSequencesOverlap( first, second ) ) {
				continue;
			}
			warnings.push( {
				first,
				second,
			} );
		}
	}

	return warnings;
}

function getSeedOverlapWarningKey( warnings ) {
	return warnings
		.map(
			( warning ) =>
				`${ warning.first.runDir }:${ warning.first.laneLabel }:${ warning.first.nextSeed }:${ warning.first.seedStride }|${ warning.second.runDir }:${ warning.second.laneLabel }:${ warning.second.nextSeed }:${ warning.second.seedStride }`
		)
		.sort()
		.join( '\n' );
}

function formatSeedOverlapWarnings( warnings ) {
	return warnings
		.map(
			( warning ) =>
				`${ warning.first.laneLabel } next=${ warning.first.nextSeed } stride=${ warning.first.seedStride } run=${ warning.first.runDir } overlaps ${ warning.second.laneLabel } next=${ warning.second.nextSeed } stride=${ warning.second.seedStride } run=${ warning.second.runDir }`
		)
		.join( '; ' );
}

function seedSequencesOverlap( first, second ) {
	if (
		! Number.isInteger( first.nextSeed ) ||
		! Number.isInteger( second.nextSeed ) ||
		! Number.isInteger( first.seedStride ) ||
		! Number.isInteger( second.seedStride ) ||
		first.seedStride <= 0 ||
		second.seedStride <= 0
	) {
		return false;
	}

	const strideGcd = greatestCommonDivisor(
		first.seedStride,
		second.seedStride
	);
	return Math.abs( first.nextSeed - second.nextSeed ) % strideGcd === 0;
}

function greatestCommonDivisor( left, right ) {
	let a = Math.abs( left );
	let b = Math.abs( right );

	while ( b !== 0 ) {
		const next = a % b;
		a = b;
		b = next;
	}

	return a;
}

async function readRunSnapshot( runDir ) {
	const manifest = await readJsonFile( path.join( runDir, 'lanes.json' ) );
	if ( ! manifest?.lanes ) {
		return {
			manifest: null,
			laneStates: [],
			liveLaneCount: 0,
			stopReasons: [ 'missing-manifest' ],
			resumeSeed: null,
		};
	}

	const laneStates = [];
	for ( const lane of manifest.lanes ) {
		const laneState = await readJsonFile(
			path.join( lane.outputDir, 'state.json' )
		);
		laneStates.push( {
			...lane,
			state: laneState,
			pidAlive: isPidAlive( lane.pid ),
		} );
	}

	return {
		manifest,
		laneStates,
		liveLaneCount: laneStates.filter(
			( lane ) => lane.pidAlive && ! lane.state?.stopReason
		).length,
		stopReasons: laneStates
			.map( ( lane ) => lane.state?.stopReason )
			.filter( Boolean ),
		resumeSeed: getResumeSeed( laneStates ),
	};
}

async function pauseGroupForProductFailure( groupState, snapshots ) {
	const productFailureRecords = Number(
		groupState.startupStallNoiseSummary?.productFailureRecords ?? 0
	);
	if (
		! Number.isFinite( productFailureRecords ) ||
		productFailureRecords <= 0
	) {
		return false;
	}

	const runDirs = snapshots.map( ( snapshot ) => snapshot.runDir );
	const reason = `${ productFailureRecords } actionable product-failure record(s); quarantined until the candidate changes`;
	groupState.status = 'paused-product-failure';
	groupState.lastReason = reason;
	groupState.activeRunDirs = [];
	groupState.productFailureAt = new Date().toISOString();
	groupState.productFailureRecords = productFailureRecords;
	groupState.productFailureRunDirs = runDirs;
	await event( {
		group: groupState.name,
		kind: 'policy',
		action: 'quarantine-actionable-product-failure',
		reason,
		productFailureRecords,
		runDirs,
	} );
	await writeState();
	await log( `${ groupState.name }: ${ reason }.` );
	return true;
}

async function monitorGroup( groupState ) {
	if ( groupState.status === 'paused-product-failure' ) {
		return;
	}

	const infraBackoffUntilMs = Date.parse(
		groupState.infraStartupBackoffUntil ?? ''
	);
	if (
		Number.isFinite( infraBackoffUntilMs ) &&
		infraBackoffUntilMs > Date.now()
	) {
		const backoffCleared =
			await maybeClearGutenbergBuildArtifactsBackoff( groupState );
		if ( ! backoffCleared ) {
			groupState.status = 'paused-infra-startup';
			await writeState();
			return;
		}
	}
	if (
		groupState.status === 'paused-infra-startup' &&
		Number.isFinite( infraBackoffUntilMs )
	) {
		delete groupState.infraStartupBackoffUntil;
		groupState.status = 'recovering';
		groupState.activeRunDirs = [];
		groupState.currentRunDir = null;
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'infra-startup-backoff-expired',
		} );
		await writeState();
	}

	if ( await waitForGroupRepoPreparation( groupState ) ) {
		return;
	}

	const pauseUntilMs = getStartupStallPauseUntilMs( groupState );
	if ( pauseUntilMs > Date.now() ) {
		if ( shouldRecoverStartupStallInsteadOfPause( groupState ) ) {
			await releaseStartupStallHoldForRecovery(
				groupState,
				'release-startup-stall-pause-for-recovery',
				groupState.startupStallPausedUntil
			);
		} else {
			groupState.status = 'paused-startup-stall';
			await writeState();
			return;
		}
	}
	if ( groupState.status === 'paused-startup-stall' && pauseUntilMs > 0 ) {
		delete groupState.startupStallPausedUntil;
		delete groupState.startupStallPausedAt;
		groupState.noAnalysisRunDirs = [];
		groupState.startupStallRunDirs = [];
		delete groupState.startupStallDrainRecordedAt;
		delete groupState.startupStallDrainRecordedUntil;
		delete groupState.noAnalysisReasonKind;
		delete groupState.noAnalysisFamily;
		delete groupState.noAnalysisSource;
		delete groupState.startupStallRecoveryMode;
		groupState.status = 'recovering';
		groupState.activeRunDirs = [];
		groupState.currentRunDir = null;
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'startup-stall-pause-expired',
		} );
		await writeState();
	}

	const drainRecordedUntilMs =
		getStartupStallDrainRecordedUntilMs( groupState );
	if ( drainRecordedUntilMs > Date.now() ) {
		if ( shouldRecoverStartupStallInsteadOfPause( groupState ) ) {
			await releaseStartupStallHoldForRecovery(
				groupState,
				'release-startup-stall-drain-for-recovery',
				groupState.startupStallDrainRecordedUntil
			);
		} else {
			groupState.status = 'paused-startup-stall';
			groupState.startupStallPausedAt ??= new Date().toISOString();
			groupState.startupStallPausedUntil ??=
				groupState.startupStallDrainRecordedUntil;
			groupState.activeRunDirs = [];
			groupState.currentRunDir = null;
			await event( {
				group: groupState.name,
				kind: 'policy',
				action: 'hold-startup-stall-drain-cooldown',
				reason: groupState.lastReason,
				drainRecordedUntil: groupState.startupStallDrainRecordedUntil,
			} );
			await writeState();
			return;
		}
	}
	if (
		groupState.status !== 'paused-startup-stall' &&
		drainRecordedUntilMs > 0 &&
		drainRecordedUntilMs <= Date.now()
	) {
		groupState.noAnalysisRunDirs = [];
		groupState.startupStallRunDirs = [];
		delete groupState.startupStallDrainRecordedAt;
		delete groupState.startupStallDrainRecordedUntil;
		delete groupState.noAnalysisReasonKind;
		delete groupState.noAnalysisFamily;
		delete groupState.noAnalysisSource;
		delete groupState.startupStallRecoveryMode;
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'startup-stall-drain-record-expired',
		} );
		await writeState();
	}

	await clearStaleStartupStallNoAnalysisRoutingState( groupState );

	const activeRunDirs = getActiveRunDirs( groupState );
	if ( ! activeRunDirs.length ) {
		await launchGroup( groupState, 'initial-start' );
		return;
	}

	const snapshots = await Promise.all(
		activeRunDirs.map( async ( runDir ) => ( {
			runDir,
			...( await readRunSnapshot( runDir ) ),
		} ) )
	);
	if ( await maybePauseGroupForStartupStallNoise( groupState, snapshots ) ) {
		return;
	}
	const liveLaneCount = snapshots.reduce(
		( count, snapshot ) => count + snapshot.liveLaneCount,
		0
	);
	if (
		liveLaneCount === 0 &&
		( await pauseGroupForProductFailure( groupState, snapshots ) )
	) {
		return;
	}
	const stopReasons = snapshots.flatMap(
		( snapshot ) => snapshot.stopReasons
	);
	const stoppedLaneStates = snapshots.flatMap( ( snapshot ) =>
		snapshot.laneStates.filter(
			( lane ) => ! lane.pidAlive || lane.state?.stopReason
		)
	);
	const activeLaneStates = snapshots.flatMap( ( snapshot ) =>
		snapshot.laneStates.filter(
			( lane ) => lane.pidAlive && ! lane.state?.stopReason
		)
	);
	const stoppedResumeSeed = getResumeSeed( stoppedLaneStates );
	const anyResumeSeed = getResumeSeed(
		snapshots.flatMap( ( snapshot ) => snapshot.laneStates )
	);
	groupState.seedOverlapWarnings = getActiveSeedOverlapWarnings( snapshots );
	const seedOverlapWarningKey = getSeedOverlapWarningKey(
		groupState.seedOverlapWarnings
	);
	if (
		seedOverlapWarningKey &&
		seedOverlapWarningKey !== groupState.lastSeedOverlapWarningKey
	) {
		groupState.lastSeedOverlapWarningKey = seedOverlapWarningKey;
		await log(
			`${
				groupState.name
			}: active seed overlap warning: ${ formatSeedOverlapWarnings(
				groupState.seedOverlapWarnings
			) }`
		);
		await event( {
			group: groupState.name,
			kind: 'warning',
			warning: 'active-seed-overlap',
			details: groupState.seedOverlapWarnings,
		} );
	} else if ( ! seedOverlapWarningKey ) {
		delete groupState.lastSeedOverlapWarningKey;
	}

	groupState.activeRunDirs = snapshots
		.filter( ( snapshot ) => snapshot.liveLaneCount > 0 )
		.map( ( snapshot ) => snapshot.runDir );

	if ( liveLaneCount > 0 ) {
		groupState.status = 'running';
		if ( Number.isFinite( stoppedResumeSeed ) ) {
			groupState.nextStartSeed = stoppedResumeSeed;
		} else if ( Number.isFinite( anyResumeSeed ) ) {
			groupState.nextStartSeed = anyResumeSeed;
		}

		const missingLaneCount = Math.max(
			0,
			groupState.lanes - liveLaneCount
		);
		const lastPartialRecoveryAt = groupState.lastPartialRecoveryAt
			? Date.parse( groupState.lastPartialRecoveryAt )
			: 0;
		if (
			missingLaneCount > 0 &&
			Date.now() - lastPartialRecoveryAt > 5 * 60 * 1000
		) {
			groupState.lastPartialRecoveryAt = new Date().toISOString();
			await writeState();
			await log(
				`${ groupState.name }: ${ liveLaneCount }/${ groupState.lanes } lane(s) still live; launching ${ missingLaneCount } replacement lane(s).`
			);
			await event( {
				group: groupState.name,
				kind: 'repair',
				action: 'partial-lane-replacement',
				liveLaneCount,
				missingLaneCount,
				startSeed: groupState.nextStartSeed,
				reasons: [ ...new Set( stopReasons ) ],
			} );
			const startSeeds = getReplacementStartSeeds(
				stoppedLaneStates,
				missingLaneCount,
				groupState.nextStartSeed,
				groupState.lanes,
				activeLaneStates
			);
			await launchGroup(
				groupState,
				`partial:${ missingLaneCount }-lane-replacement`,
				missingLaneCount,
				{
					seedStride: groupState.lanes,
					startSeeds,
				}
			);
			return;
		}

		await writeState();
		return;
	}

	if ( Date.now() >= END_AT ) {
		groupState.status = 'complete';
		await writeState();
		return;
	}

	if ( Number.isFinite( anyResumeSeed ) ) {
		groupState.nextStartSeed = anyResumeSeed;
	}

	const reason = stopReasons.length
		? `stopped:${ [ ...new Set( stopReasons ) ].join( ',' ) }`
		: 'stopped:no-live-lanes';
	const lastLaunchAt = groupState.lastLaunchAt
		? Date.parse( groupState.lastLaunchAt )
		: 0;
	const fastFailure = Date.now() - lastLaunchAt < 2 * 60 * 1000;

	if ( fastFailure ) {
		groupState.consecutiveFastFailures += 1;
		if ( groupState.consecutiveFastFailures >= 2 && groupState.lanes > 1 ) {
			groupState.lanes -= 1;
			await log(
				`${ groupState.name }: repeated fast failure; reducing to ${ groupState.lanes } lane(s) before relaunch.`
			);
			await event( {
				group: groupState.name,
				kind: 'repair',
				action: 'reduce-lanes',
				lanes: groupState.lanes,
				reason,
			} );
		}
	} else {
		groupState.consecutiveFastFailures = 0;
	}

	groupState.status = 'recovering';
	groupState.activeRunDirs = [];
	await writeState();
	const allLaneStates = snapshots.flatMap(
		( snapshot ) => snapshot.laneStates
	);
	const startSeeds = getReplacementStartSeeds(
		allLaneStates,
		groupState.lanes,
		groupState.nextStartSeed,
		groupState.lanes
	);
	await launchGroup( groupState, reason, groupState.lanes, {
		seedStride: groupState.lanes,
		startSeeds,
	} );
}

function isInfraStartupFailureError( error ) {
	return /wp-env start failed|Environment not initialized|dependency failed|mysql.*(?:exited|failed)|docker compose.*failed|all predefined address pools have been fully subnetted|untracked working tree files would be overwritten by checkout|missing-install-path|Gutenberg build artifacts are missing|failed to generate build\/scripts\/.*blocks-manifest\.php|failed to generate Gutenberg vendor scripts/i.test(
		error?.stack ?? error?.message ?? String( error ?? '' )
	);
}

async function pauseGroupForInfraStartupFailure( groupState, error ) {
	const pauseUntil = new Date(
		Date.now() + INFRA_STARTUP_FAILURE_BACKOFF_MS
	).toISOString();
	groupState.status = 'paused-infra-startup';
	groupState.activeRunDirs = [];
	groupState.currentRunDir = null;
	groupState.infraStartupBackoffUntil = pauseUntil;
	groupState.lastInfraStartupError = error.stack ?? error.message;
	groupState.lastReason = `infra startup backoff until ${ pauseUntil }: ${
		error.message ?? error
	}`;
	await event( {
		group: groupState.name,
		kind: 'policy',
		action: 'infra-startup-backoff',
		pauseUntil,
		backoffMs: INFRA_STARTUP_FAILURE_BACKOFF_MS,
		reason: error.message ?? String( error ),
	} );
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

async function getStaleCurrentOutputReason() {
	if ( ! CURRENT_OUTPUT_POINTER_PATH ) {
		return null;
	}

	let pointerValue = '';
	try {
		pointerValue = (
			await fs.readFile( CURRENT_OUTPUT_POINTER_PATH, 'utf8' )
		).trim();
	} catch {
		return null;
	}

	if ( ! pointerValue ) {
		return null;
	}

	if ( path.resolve( pointerValue ) === path.resolve( OUTPUT_DIR ) ) {
		return null;
	}

	return `supervisor output dir ${ OUTPUT_DIR } is stale; current-output pointer ${ CURRENT_OUTPUT_POINTER_PATH } now points to ${ pointerValue }`;
}

async function stopAllActiveLanesForStaleOutput( reason ) {
	for ( const groupState of state.groups ) {
		const activeRunDirs = getActiveRunDirs( groupState );
		if ( activeRunDirs.length ) {
			const snapshots = await Promise.all(
				activeRunDirs.map( async ( runDir ) => ( {
					runDir,
					...( await readRunSnapshot( runDir ) ),
				} ) )
			);
			await stopSnapshotLanes(
				snapshots,
				reason,
				'terminate-stale-output-lane'
			);
		}
		if ( ACTIVE_GROUP_STATUSES.has( groupState.status ) ) {
			groupState.status = 'stale-output';
		}
		groupState.activeRunDirs = [];
		groupState.currentRunDir = null;
		groupState.lastReason = reason;
	}
	await writeState();
}

async function main() {
	await log(
		`RTC browser fuzz supervisor started with ${ groupConfigs.length } group(s), outputDir=${ OUTPUT_DIR }, durationHours=${ DURATION_HOURS }.`
	);
	await event( {
		kind: 'supervisor-start',
		outputDir: OUTPUT_DIR,
		groups: groupConfigs.map( ( group ) => ( {
			name: group.name,
			repoRoot: group.repoRoot,
			transport: group.transport,
			lanes: group.lanes,
			startSeed: group.startSeed,
		} ) ),
	} );

	while ( Date.now() < END_AT ) {
		const staleOutputReason = await getStaleCurrentOutputReason();
		if ( staleOutputReason ) {
			await log( staleOutputReason );
			await event( {
				kind: 'supervisor-stop',
				reason: 'stale-current-output',
				detail: staleOutputReason,
			} );
			await stopAllActiveLanesForStaleOutput( staleOutputReason );
			return;
		}
		await syncGroupConfigs();
		const processedGroupNames = new Set();
		while ( true ) {
			// Group policy can shrink while this pass is launching expensive browser
			// lanes. Re-sync before each group so removed groups are terminated before
			// they materialize more stale run directories. Select by unprocessed name
			// so policy reordering cannot skip or repeat a group in this pass.
			await syncGroupConfigs();
			const groupState = state.groups.find(
				( candidate ) => ! processedGroupNames.has( candidate.name )
			);
			if ( ! groupState ) {
				break;
			}
			processedGroupNames.add( groupState.name );
			if ( groupState.status === 'disabled' ) {
				continue;
			}
			try {
				await monitorGroup( groupState );
			} catch ( error ) {
				if ( isInfraStartupFailureError( error ) ) {
					await pauseGroupForInfraStartupFailure( groupState, error );
				} else {
					groupState.status = 'error';
					groupState.lastReason = error.stack ?? error.message;
				}
				await log(
					`${ groupState.name }: ${ error.stack ?? error.message }`
				);
				await event( {
					group: groupState.name,
					kind: 'error',
					error: error.stack ?? error.message,
				} );
				await writeState();
			}
		}
		await sleep( POLL_MS );
	}

	state.groups.forEach( ( group ) => {
		group.status =
			group.status === 'running' ? 'duration-elapsed' : group.status;
	} );
	await writeState();
	await event( { kind: 'supervisor-stop', reason: 'duration-elapsed' } );
	await log(
		'RTC browser fuzz supervisor exiting after requested duration.'
	);
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
