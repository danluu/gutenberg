#!/usr/bin/env node

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

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
const REPLACEMENT_SEED_SEARCH_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_REPLACEMENT_SEED_SEARCH_LIMIT',
	10000
);
const STATE_HEARTBEAT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_STATE_HEARTBEAT_MS',
	60000
);
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const STATE_PATH = path.join( OUTPUT_DIR, 'supervisor-state.json' );
const LOG_PATH = path.join( OUTPUT_DIR, 'supervisor.log' );
const EVENTS_PATH = path.join( OUTPUT_DIR, 'events.ndjson' );
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

			if ( existingGroupState.status === 'disabled' ) {
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
	if (
		groupState &&
		( hasNoProductStartupStallDrainCooldown( groupState ) ||
			isNoProductStartupStallNoiseState( groupState ) )
	) {
		return false;
	}
	return true;
}

async function disableRemovedGroupState( groupState ) {
	const reason = 'removed-from-groups-policy';
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
	if (
		groupState.status !== 'disabled' ||
		groupState.lastReason !== reason
	) {
		await event( {
			group: groupState.name,
			kind: 'policy',
			action: 'disable-group',
			reason,
			activeRunDirs,
		} );
	}
	groupState.status = 'disabled';
	groupState.lastReason = preserveStartupStallState
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

async function runCommand( {
	command,
	args,
	cwd,
	env = {},
	timeoutMs = 120000,
	logPath = null,
} ) {
	const child = spawn( command, args, {
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

async function runWpEnv( group, args, options = {} ) {
	return runCommand( {
		command: 'npm',
		args: [ 'run', 'wp-env-test', '--', ...args ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: options.timeoutMs ?? 180000,
		logPath: options.logPath ?? null,
	} );
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
			`port-collision: ${ ( bindMatch?.[ 0 ] ?? addressMatch?.[ 0 ] ).trim() }`
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
		command: 'node',
		args: [ 'bin/packages/build-vendors.mjs' ],
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
	return /endpoint with name .* already exists|active endpoints|failed to set up container networking|network .* has active endpoints|invalid IP/i.test(
		String( output ?? '' )
	);
}

function looksLikeDockerDiskPressure( output ) {
	return /no space left on device|disk got full|failed to (?:extract|register) layer|layerdb\/tmp\/write-set.*file exists/i.test(
		String( output ?? '' )
	);
}

function looksLikeWordPressDbFailure( output ) {
	return /Error establishing a database connection|database connection/i.test(
		String( output ?? '' )
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

function makeBaseUrlCandidates( group, statusOutput, siteUrl ) {
	const httpPort = parseHttpPort( statusOutput );
	return [
		normalizeBaseUrl( group.env?.RTC_FUZZ_BASE_URL ),
		normalizeBaseUrl( group.env?.WP_BASE_URL ),
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
	if (
		! looksLikeDockerDiskPressure( diagnosticOutput ) &&
		! looksLikeWordPressDbFailure( diagnosticOutput )
	) {
		return false;
	}

	const commands = [
		[ 'container', [ 'container', 'prune', '-f' ] ],
		[ 'image', [ 'image', 'prune', '-af' ] ],
		[ 'builder', [ 'builder', 'prune', '-af' ] ],
		[ 'volume', [ 'volume', 'prune', '-f' ] ],
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
	}

	return false;
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
	await patchWpEnvMariaDbHealthcheck( group );
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
	const explicitBaseUrl =
		normalizeBaseUrl( group.env?.RTC_FUZZ_BASE_URL ) ??
		normalizeBaseUrl( group.env?.WP_BASE_URL );
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
	const port = String(
		group.wsPort ?? group.env?.GUTENBERG_RTC_TEST_WS_PORT ?? '18991'
	);
	const healthUrl = `http://127.0.0.1:${ port }/health`;
	const probe = await fetch( healthUrl ).catch( () => null );
	if ( probe?.ok ) {
		return;
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
		const retry = await fetch( healthUrl ).catch( () => null );
		if ( retry?.ok ) {
			return;
		}
		await sleep( 200 );
	}

	throw new Error(
		`${ group.name }: WebSocket relay did not become healthy on ${ port }.`
	);
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
	return (
		( record.actions?.length ?? 0 ) > 0 ||
		( record.reloads?.length ?? 0 ) > 0 ||
		( record.saveCheckpointSteps?.length ?? 0 ) > 0 ||
		( record.autosaveSteps?.length ?? 0 ) > 0 ||
		record.revisionRestore?.eligible === true ||
		( record.operationEvents?.length ?? 0 ) > 0
	);
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
		! isStrictPreActionStartupGateBucket(
			record?.preAnalysisGate?.bucket
		)
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

function isNoProductStartupStallNoiseState( groupState ) {
	if ( getStartupStallProductEvidenceCount( groupState ) > 0 ) {
		return false;
	}

	const reason = groupState.lastReason ?? '';
	const summary = groupState.startupStallNoiseSummary ?? {};
	const hasStrictStartupEvidence =
		( summary.strictStartupFailures ?? 0 ) > 0 ||
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
		return false;
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

async function monitorGroup( groupState ) {
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
	const allResumeSeeds = getResumeSeeds(
		snapshots.flatMap( ( snapshot ) => snapshot.laneStates )
	);
	await launchGroup( groupState, reason, groupState.lanes, {
		seedStride: groupState.lanes,
		startSeeds:
			allResumeSeeds.length >= groupState.lanes
				? allResumeSeeds.slice( 0, groupState.lanes )
				: null,
	} );
}

function isInfraStartupFailureError( error ) {
	return /wp-env start failed|Environment not initialized|dependency failed|mysql.*(?:exited|failed)|docker compose.*failed|missing-install-path|Gutenberg build artifacts are missing|failed to generate build\/scripts\/.*blocks-manifest\.php|failed to generate Gutenberg vendor scripts/i.test(
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
		for ( const groupState of state.groups ) {
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
