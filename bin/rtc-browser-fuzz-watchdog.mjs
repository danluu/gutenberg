#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT =
	process.env.RTC_FUZZ_WATCHDOG_REPO_ROOT ??
	path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const SESSION = process.env.RTC_FUZZ_WATCHDOG_SESSION ?? 'rtc-fuzz-supervisor';
const OUTPUT_DIR = process.env.RTC_FUZZ_WATCHDOG_OUTPUT_DIR;
const GROUPS_PATH = process.env.RTC_FUZZ_WATCHDOG_GROUPS_PATH;
const SUPERVISOR_DURATION_HOURS =
	process.env.RTC_FUZZ_SUPERVISOR_DURATION_HOURS ??
	process.env.RTC_FUZZ_WATCHDOG_DURATION_HOURS ??
	'14';
const SUPERVISOR_POLL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SUPERVISOR_POLL_MS',
	60000
);
const WATCHDOG_POLL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_WATCHDOG_POLL_MS',
	60000
);
const STALE_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_WATCHDOG_STALE_MS',
	Math.max( SUPERVISOR_POLL_MS * 6, 8 * 60 * 1000 )
);
const CLEANUP_STALE_WP_ENV =
	process.env.RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV !== '0';
const CLEANUP_STALE_WP_ENV_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_INTERVAL_MS',
	30 * 60 * 1000
);
const CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS = getPositiveIntegerEnv(
	'RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS',
	24
);
const CLEANUP_STALE_WP_ENV_VOLUMES =
	process.env.RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_VOLUMES === '1';
const CLEANUP_STALE_WP_ENV_DIRECTORIES =
	process.env.RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_DIRECTORIES === '1';

if ( ! OUTPUT_DIR ) {
	throw new Error( 'RTC_FUZZ_WATCHDOG_OUTPUT_DIR is required.' );
}
if ( ! GROUPS_PATH ) {
	throw new Error( 'RTC_FUZZ_WATCHDOG_GROUPS_PATH is required.' );
}

const WATCHDOG_STATE_PATH = path.join( OUTPUT_DIR, 'watchdog-state.json' );
const WATCHDOG_LOG_PATH = path.join( OUTPUT_DIR, 'watchdog.log' );
const WATCHDOG_EVENTS_PATH = path.join( OUTPUT_DIR, 'watchdog-events.ndjson' );
const SUPERVISOR_STATE_PATH = path.join( OUTPUT_DIR, 'supervisor-state.json' );
const CLEANUP_SCRIPT_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-fuzz-cleanup-stale-wp-env.mjs'
);
const OPTIONAL_BROWSER_ADMISSION_SCRIPT_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-optional-browser-admission-remote.sh'
);
let lastCleanupAt = 0;

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

function shellQuote( value ) {
	return `'${ String( value ).replaceAll( "'", "'\\''" ) }'`;
}

function runCommand( command, args ) {
	return new Promise( ( resolve ) => {
		execFile(
			command,
			args,
			{ encoding: 'utf8' },
			( error, stdout, stderr ) => {
				resolve( {
					ok: ! error,
					code: error?.code ?? 0,
					stdout,
					stderr,
				} );
			}
		);
	} );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( WATCHDOG_LOG_PATH, line );
}

async function event( record ) {
	await fs.appendFile(
		WATCHDOG_EVENTS_PATH,
		JSON.stringify( {
			at: new Date().toISOString(),
			...record,
		} ) + '\n'
	);
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function writeWatchdogState( fields ) {
	await fs.writeFile(
		WATCHDOG_STATE_PATH,
		JSON.stringify(
			{
				updatedAt: new Date().toISOString(),
				session: SESSION,
				outputDir: OUTPUT_DIR,
				groupsPath: GROUPS_PATH,
				supervisorStatePath: SUPERVISOR_STATE_PATH,
				...fields,
			},
			null,
			2
		) + '\n'
	);
}

async function hasSupervisorSession() {
	const result = await runCommand( 'tmux', [ 'has-session', '-t', SESSION ] );
	return result.ok;
}

function optionalBrowserPoolForSession() {
	if ( SESSION === 'rtc-fuzz-strict-expansion' ) {
		return 'strict-expansion';
	}
	if ( SESSION === 'rtc-focused-shards' ) {
		return 'focused-shards';
	}
	if ( SESSION === 'rtc-gap-booster' ) {
		return 'gap-booster';
	}
	return null;
}

async function optionalBrowserAdmissionAllowsStart( reason ) {
	const pool = optionalBrowserPoolForSession();
	if ( ! pool ) {
		return true;
	}
	try {
		await fs.access( OPTIONAL_BROWSER_ADMISSION_SCRIPT_PATH );
	} catch {
		return true;
	}
	const result = await runCommand( 'bash', [
		OPTIONAL_BROWSER_ADMISSION_SCRIPT_PATH,
		pool,
	] );
	if ( result.ok ) {
		return true;
	}
	const output = ( result.stderr || result.stdout || '' ).trim();
	await log(
		`optional browser admission blocked supervisor start (${ reason }) pool=${ pool }${
			output ? `: ${ output }` : ''
		}`
	);
	await event( {
		kind: 'optional-browser-admission-blocked',
		reason,
		pool,
		output,
	} );
	return false;
}

function buildSupervisorCommand() {
	return [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`export RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=${ shellQuote( OUTPUT_DIR ) }`,
		`export RTC_FUZZ_SUPERVISOR_GROUPS_PATH=${ shellQuote( GROUPS_PATH ) }`,
		`export RTC_FUZZ_SUPERVISOR_DURATION_HOURS=${ shellQuote(
			SUPERVISOR_DURATION_HOURS
		) }`,
		`export RTC_FUZZ_SUPERVISOR_POLL_MS=${ shellQuote(
			SUPERVISOR_POLL_MS
		) }`,
		'while true; do node bin/rtc-browser-fuzz-supervisor.mjs; code=$?; echo "SUPERVISOR_EXIT:$code $(date -u +%Y-%m-%dT%H:%M:%SZ)"; sleep 30; done',
	].join( '; ' );
}

async function startSupervisor( reason ) {
	if ( ! ( await optionalBrowserAdmissionAllowsStart( reason ) ) ) {
		return false;
	}
	const command = buildSupervisorCommand();
	const result = await runCommand( 'tmux', [
		'new-session',
		'-d',
		'-s',
		SESSION,
		command,
	] );
	if ( ! result.ok ) {
		await log(
			`failed to start supervisor tmux session (${ reason }): ${
				result.stderr || result.stdout
			}`
		);
		await event( {
			kind: 'start-failed',
			reason,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
		return false;
	}

	await log( `started supervisor tmux session (${ reason }).` );
	await event( { kind: 'started-supervisor', reason } );
	return true;
}

async function restartSupervisor( reason ) {
	await runCommand( 'tmux', [ 'kill-session', '-t', SESSION ] );
	await startSupervisor( reason );
}

function getStateAgeMs( supervisorState ) {
	if ( ! supervisorState?.lastUpdatedAt ) {
		return Infinity;
	}
	return Date.now() - Date.parse( supervisorState.lastUpdatedAt );
}

function summarizeCleanupReport( report ) {
	return {
		dryRun: report.dryRun,
		minAgeHours: report.minAgeHours,
		activeProjects: report.activeProjects?.length ?? 0,
		containerCandidates: report.containers?.removeCandidates?.length ?? 0,
		containersRemoved: report.containers?.removed?.length ?? 0,
		networkCandidates: report.networks?.removeCandidates?.length ?? 0,
		networksRemoved: report.networks?.removed?.length ?? 0,
		volumeCandidates: report.volumes?.removeCandidates?.length ?? 0,
		volumesRemoved: report.volumes?.removed?.length ?? 0,
		staleWpEnvDirectoryCount: report.staleWpEnvDirectories?.count ?? 0,
		staleWpEnvDirectoryCandidates:
			report.staleWpEnvDirectories?.removeCandidates?.length ?? 0,
		staleWpEnvDirectoriesRemoved:
			report.staleWpEnvDirectories?.removed?.length ?? 0,
		containerErrors: report.containers?.errors?.length ?? 0,
		networkErrors: report.networks?.errors?.length ?? 0,
		volumeErrors: report.volumes?.errors?.length ?? 0,
		directoryErrors: report.staleWpEnvDirectories?.errors?.length ?? 0,
	};
}

async function maybeCleanupStaleWpEnv() {
	if ( ! CLEANUP_STALE_WP_ENV ) {
		return;
	}
	if ( Date.now() - lastCleanupAt < CLEANUP_STALE_WP_ENV_INTERVAL_MS ) {
		return;
	}
	lastCleanupAt = Date.now();

	const result = await runCommand( process.execPath, [
		CLEANUP_SCRIPT_PATH,
		'--apply',
		'--json',
		...( CLEANUP_STALE_WP_ENV_VOLUMES ? [ '--prune-volumes' ] : [] ),
		...( CLEANUP_STALE_WP_ENV_DIRECTORIES
			? [ '--prune-directories' ]
			: [] ),
		`--min-age-hours=${ CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS }`,
	] );

	if ( ! result.ok ) {
		const output =
			result.stderr || result.stdout || `code=${ result.code }`;
		await log( `stale wp-env cleanup failed: ${ output.trim() }` );
		await event( {
			kind: 'wp-env-cleanup-failed',
			output,
			code: result.code,
		} );
		return;
	}

	let report;
	try {
		report = JSON.parse( result.stdout );
	} catch {
		await log(
			`stale wp-env cleanup returned non-JSON output: ${ result.stdout.trim() }`
		);
		await event( {
			kind: 'wp-env-cleanup-failed',
			output: result.stdout,
		} );
		return;
	}

	const summary = summarizeCleanupReport( report );
	await log(
		`stale wp-env cleanup: removed ${ summary.containersRemoved } container(s), ${ summary.networksRemoved } network(s), ${ summary.volumesRemoved } volume(s), ${ summary.staleWpEnvDirectoriesRemoved } directories; candidates ${ summary.containerCandidates } container(s), ${ summary.networkCandidates } network(s), ${ summary.volumeCandidates } volume(s), ${ summary.staleWpEnvDirectoryCandidates } orphaned directories; stale dirs reported ${ summary.staleWpEnvDirectoryCount }.`
	);
	await event( {
		kind: 'wp-env-cleanup',
		...summary,
	} );
}

async function monitorOnce() {
	const hasSession = await hasSupervisorSession();
	const supervisorState = await readJsonFile( SUPERVISOR_STATE_PATH );
	const stateAgeMs = getStateAgeMs( supervisorState );

	if ( ! hasSession ) {
		await startSupervisor( 'missing-session' );
		await writeWatchdogState( {
			status: 'started-missing-session',
			stateAgeMs,
		} );
		return;
	}

	if ( stateAgeMs > STALE_MS ) {
		await log(
			`supervisor state is stale (${ Math.round(
				stateAgeMs / 1000
			) }s); restarting supervisor session.`
		);
		await event( {
			kind: 'stale-supervisor',
			stateAgeMs,
			staleMs: STALE_MS,
			lastUpdatedAt: supervisorState?.lastUpdatedAt ?? null,
		} );
		await restartSupervisor( 'stale-state' );
		await writeWatchdogState( {
			status: 'restarted-stale-state',
			stateAgeMs,
		} );
		return;
	}

	await writeWatchdogState( {
		status: 'healthy',
		stateAgeMs,
		supervisorLastUpdatedAt: supervisorState.lastUpdatedAt,
	} );
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

await fs.mkdir( OUTPUT_DIR, { recursive: true } );
await log(
	`RTC browser fuzz watchdog started for session=${ SESSION }, outputDir=${ OUTPUT_DIR }.`
);
await event( {
	kind: 'watchdog-start',
	session: SESSION,
	outputDir: OUTPUT_DIR,
	groupsPath: GROUPS_PATH,
	staleMs: STALE_MS,
	cleanupStaleWpEnv: CLEANUP_STALE_WP_ENV,
	cleanupStaleWpEnvIntervalMs: CLEANUP_STALE_WP_ENV_INTERVAL_MS,
	cleanupStaleWpEnvMinAgeHours: CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS,
	cleanupStaleWpEnvVolumes: CLEANUP_STALE_WP_ENV_VOLUMES,
	cleanupStaleWpEnvDirectories: CLEANUP_STALE_WP_ENV_DIRECTORIES,
} );

while ( true ) {
	try {
		await monitorOnce();
		await maybeCleanupStaleWpEnv();
	} catch ( error ) {
		await log( error.stack ?? error.message );
		await event( { kind: 'error', error: error.stack ?? error.message } );
	}
	await sleep( WATCHDOG_POLL_MS );
}
