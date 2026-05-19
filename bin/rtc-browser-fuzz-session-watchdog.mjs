#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_REPO_ROOT ??
	path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const SESSION = requireEnv( 'RTC_FUZZ_SESSION_WATCHDOG_SESSION' );
const START_COMMAND = requireEnv( 'RTC_FUZZ_SESSION_WATCHDOG_START_COMMAND' );
const BASE_DIR = requireEnv( 'RTC_FUZZ_SESSION_WATCHDOG_BASE_DIR' );
const CURRENT_OUTPUT_FILE =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_CURRENT_OUTPUT_FILE ??
	path.join( BASE_DIR, 'current-output-dir.txt' );
const STATE_RELATIVE_PATH =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_STATE_RELATIVE_PATH ??
	'novelty-state.json';
const STATUS_RELATIVE_PATH =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_STATUS_RELATIVE_PATH ??
	'novelty-status.md';
const CLEANUP_COMMAND =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_CLEANUP_COMMAND ?? '';
const IS_COVERAGE_GUIDED_NOVELTY_WATCHDOG =
	SESSION === 'rtc-coverage-guided-novelty';
const POLL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_POLL_MS',
	60000
);
const REQUESTED_STALE_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_STALE_MS',
	Math.max( POLL_MS * 5, 5 * 60 * 1000 )
);
const COVERAGE_GUIDED_MIN_STALE_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_COVERAGE_GUIDED_MIN_STALE_MS',
	15 * 60 * 1000
);
const STALE_MS = Math.max(
	REQUESTED_STALE_MS,
	IS_COVERAGE_GUIDED_NOVELTY_WATCHDOG ? COVERAGE_GUIDED_MIN_STALE_MS : 0
);
const MIN_RESTART_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_MIN_RESTART_INTERVAL_MS',
	5 * 60 * 1000
);
const REQUESTED_START_GRACE_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_START_GRACE_MS',
	2 * 60 * 1000
);
const COVERAGE_GUIDED_MIN_START_GRACE_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_SESSION_WATCHDOG_COVERAGE_GUIDED_MIN_START_GRACE_MS',
	10 * 60 * 1000
);
const START_GRACE_MS = Math.max(
	REQUESTED_START_GRACE_MS,
	IS_COVERAGE_GUIDED_NOVELTY_WATCHDOG
		? COVERAGE_GUIDED_MIN_START_GRACE_MS
		: 0
);
const RUN_ONCE = process.env.RTC_FUZZ_SESSION_WATCHDOG_RUN_ONCE === '1';
const LOG_PATH =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_LOG_PATH ??
	path.join( BASE_DIR, 'logs/session-watchdog.log' );
const EVENTS_PATH =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_EVENTS_PATH ??
	path.join( BASE_DIR, 'logs/session-watchdog-events.ndjson' );
const WATCHDOG_STATE_PATH =
	process.env.RTC_FUZZ_SESSION_WATCHDOG_STATE_PATH ??
	path.join( BASE_DIR, 'logs/session-watchdog-state.json' );

let lastRestartAt = 0;

function requireEnv( name ) {
	const value = process.env[ name ];
	if ( ! value ) {
		throw new Error( `${ name } is required.` );
	}
	return value;
}

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

function runCommand( command, args, options = {} ) {
	return new Promise( ( resolve ) => {
		execFile(
			command,
			args,
			{
				cwd: REPO_ROOT,
				encoding: 'utf8',
				timeout: options.timeout ?? 60000,
				maxBuffer: options.maxBuffer ?? 2 * 1024 * 1024,
			},
			( error, stdout, stderr ) => {
				resolve( {
					ok: ! error,
					code: error?.code ?? 0,
					signal: error?.signal ?? null,
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

async function readTextFile( filePath ) {
	try {
		return await fs.readFile( filePath, 'utf8' );
	} catch {
		return null;
	}
}

async function readJsonFile( filePath ) {
	const text = await readTextFile( filePath );
	if ( ! text ) {
		return null;
	}
	try {
		return JSON.parse( text );
	} catch {
		return null;
	}
}

async function fileMtimeMs( filePath ) {
	try {
		return ( await fs.stat( filePath ) ).mtimeMs;
	} catch {
		return null;
	}
}

async function currentOutputDir() {
	const text = await readTextFile( CURRENT_OUTPUT_FILE );
	return text?.trim() || null;
}

async function hasSession() {
	const result = await runCommand( 'tmux', [ 'has-session', '-t', SESSION ], {
		timeout: 10000,
	} );
	return result.ok;
}

async function sessionBinding( outputDir ) {
	if ( ! outputDir || ! IS_COVERAGE_GUIDED_NOVELTY_WATCHDOG ) {
		return {
			ok: true,
			checked: false,
			reason: 'not-required',
		};
	}

	const result = await runCommand(
		'tmux',
		[
			'list-panes',
			'-t',
			SESSION,
			'-F',
			'#{pane_pid}\t#{pane_start_command}',
		],
		{
			timeout: 10000,
			maxBuffer: 1024 * 1024,
		}
	);
	if ( ! result.ok ) {
		return {
			ok: false,
			checked: true,
			reason: 'list-panes-failed',
			stdout: truncateOutput( result.stdout ),
			stderr: truncateOutput( result.stderr ),
		};
	}

	const panes = result.stdout
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
	const matchingPane = panes.find( ( line ) => line.includes( outputDir ) );
	if ( matchingPane ) {
		return {
			ok: true,
			checked: true,
			reason: 'matched-current-output-dir',
			panes: panes.map( truncateOutput ),
		};
	}

	return {
		ok: false,
		checked: true,
		reason: 'session-bound-to-different-output-dir',
		expectedOutputDir: outputDir,
		panes: panes.map( truncateOutput ),
	};
}

async function stateFreshness( outputDir ) {
	if ( ! outputDir ) {
		return {
			outputDir,
			statePath: null,
			statusPath: null,
			lastUpdatedAt: null,
			ageMs: Infinity,
			source: 'missing-output-dir',
		};
	}

	const statePath = path.join( outputDir, STATE_RELATIVE_PATH );
	const statusPath = path.join( outputDir, STATUS_RELATIVE_PATH );
	const state = await readJsonFile( statePath );
	if ( IS_COVERAGE_GUIDED_NOVELTY_WATCHDOG ) {
		const fullPassTimestamp = Date.parse(
			state?.lastCompletedFullPassAt ?? ''
		);
		if ( Number.isFinite( fullPassTimestamp ) ) {
			return {
				outputDir,
				statePath,
				statusPath,
				lastUpdatedAt: new Date( fullPassTimestamp ).toISOString(),
				ageMs: Date.now() - fullPassTimestamp,
				source: 'state-lastCompletedFullPassAt',
				lastUpdatedHeartbeatAt: state?.lastUpdatedAt ?? null,
				lastCurrentRunTriageCompletedAt:
					state?.lastCurrentRunTriageCompletedAt ?? null,
			};
		}

		return {
			outputDir,
			statePath,
			statusPath,
			lastUpdatedAt: null,
			ageMs: Infinity,
			source: 'missing-novelty-full-pass-timestamp',
			lastUpdatedHeartbeatAt: state?.lastUpdatedAt ?? null,
			lastCurrentRunTriageCompletedAt:
				state?.lastCurrentRunTriageCompletedAt ?? null,
		};
	}

	const stateTimestamp = Date.parse( state?.lastUpdatedAt ?? '' );
	if ( Number.isFinite( stateTimestamp ) ) {
		return {
			outputDir,
			statePath,
			statusPath,
			lastUpdatedAt: state.lastUpdatedAt,
			ageMs: Date.now() - stateTimestamp,
			source: 'state-lastUpdatedAt',
		};
	}

	const statusMtimeMs = await fileMtimeMs( statusPath );
	if ( statusMtimeMs !== null ) {
		return {
			outputDir,
			statePath,
			statusPath,
			lastUpdatedAt: new Date( statusMtimeMs ).toISOString(),
			ageMs: Date.now() - statusMtimeMs,
			source: 'status-mtime',
		};
	}

	return {
		outputDir,
		statePath,
		statusPath,
		lastUpdatedAt: null,
		ageMs: Infinity,
		source: 'missing-state-and-status',
	};
}

async function writeWatchdogState( fields ) {
	await fs.writeFile(
		WATCHDOG_STATE_PATH,
		JSON.stringify(
			{
				updatedAt: new Date().toISOString(),
				session: SESSION,
				baseDir: BASE_DIR,
				currentOutputFile: CURRENT_OUTPUT_FILE,
					stateRelativePath: STATE_RELATIVE_PATH,
					statusRelativePath: STATUS_RELATIVE_PATH,
					staleMs: STALE_MS,
					requestedStaleMs: REQUESTED_STALE_MS,
					startGraceMs: START_GRACE_MS,
					requestedStartGraceMs: REQUESTED_START_GRACE_MS,
					...fields,
				},
				null,
			2
		) + '\n'
	);
}

function truncateOutput( value ) {
	const trimmed = String( value ?? '' ).trim();
	if ( trimmed.length <= 4000 ) {
		return trimmed;
	}
	return `${ trimmed.slice( 0, 4000 ) }\n...<truncated>`;
}

async function runShellCommand( label, command ) {
	const result = await runCommand( 'bash', [ '-lc', command ], {
		timeout: 10 * 60 * 1000,
		maxBuffer: 8 * 1024 * 1024,
	} );
	await log(
		`${ label } exited ok=${ result.ok } code=${ result.code } signal=${
			result.signal ?? 'none'
		}${
			result.stdout ? ` stdout=${ truncateOutput( result.stdout ) }` : ''
		}${
			result.stderr ? ` stderr=${ truncateOutput( result.stderr ) }` : ''
		}`
	);
	await event( {
		kind: label,
		ok: result.ok,
		code: result.code,
		signal: result.signal,
		stdout: truncateOutput( result.stdout ),
		stderr: truncateOutput( result.stderr ),
	} );
	return result.ok;
}

function shouldThrottleRestart() {
	return Date.now() - lastRestartAt < MIN_RESTART_INTERVAL_MS;
}

async function restart( reason, freshness ) {
	if ( shouldThrottleRestart() ) {
		await log(
			`restart requested for ${ reason }, but last restart was ${ Math.round(
				( Date.now() - lastRestartAt ) / 1000
			) }s ago; waiting.`
		);
		await event( {
			kind: 'restart-throttled',
			reason,
			freshness,
			minRestartIntervalMs: MIN_RESTART_INTERVAL_MS,
		} );
		await writeWatchdogState( {
			status: 'restart-throttled',
			reason,
			freshness,
			lastRestartAt: new Date( lastRestartAt ).toISOString(),
		} );
		return;
	}

	lastRestartAt = Date.now();
	await log( `restarting watched session ${ SESSION }: ${ reason }` );
	await event( { kind: 'restart', reason, freshness } );
	if ( CLEANUP_COMMAND ) {
		await runShellCommand( 'cleanup-command', CLEANUP_COMMAND );
	}
	const ok = await runShellCommand( 'start-command', START_COMMAND );
	await writeWatchdogState( {
		status: ok ? 'restarted' : 'restart-failed',
		reason,
		freshness,
		lastRestartAt: new Date( lastRestartAt ).toISOString(),
	} );
}

async function monitorOnce() {
	const outputDir = await currentOutputDir();
	const freshness = await stateFreshness( outputDir );
	const sessionExists = await hasSession();
	const ageMs = freshness.ageMs;

	if ( ! sessionExists ) {
		await restart( 'missing-session', freshness );
		return;
	}

	const binding = await sessionBinding( outputDir );
	if ( ! binding.ok ) {
		await restart( 'stale-session-binding', {
			...freshness,
			binding,
		} );
		return;
	}

	if ( ageMs > STALE_MS ) {
		const outputAgeMs = outputDir
			? Date.now() - ( ( await fileMtimeMs( outputDir ) ) ?? Date.now() )
			: Infinity;
		if ( outputAgeMs < START_GRACE_MS ) {
			await writeWatchdogState( {
				status: 'starting',
				sessionExists,
				freshness,
				outputAgeMs,
			} );
			return;
		}
		await restart( 'stale-state', freshness );
		return;
	}

	await writeWatchdogState( {
		status: 'healthy',
		sessionExists,
		freshness,
		binding,
	} );
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

await fs.mkdir( path.dirname( LOG_PATH ), { recursive: true } );
await fs.mkdir( path.dirname( WATCHDOG_STATE_PATH ), { recursive: true } );
await log(
	`RTC session watchdog started for session=${ SESSION }, baseDir=${ BASE_DIR }.`
);
await event( {
	kind: 'watchdog-start',
	session: SESSION,
	baseDir: BASE_DIR,
	currentOutputFile: CURRENT_OUTPUT_FILE,
	staleMs: STALE_MS,
	requestedStaleMs: REQUESTED_STALE_MS,
	startGraceMs: START_GRACE_MS,
	requestedStartGraceMs: REQUESTED_START_GRACE_MS,
	pollMs: POLL_MS,
	minRestartIntervalMs: MIN_RESTART_INTERVAL_MS,
} );

while ( true ) {
	try {
		await monitorOnce();
	} catch ( error ) {
		await log( `watchdog pass failed: ${ error.stack ?? error.message }` );
		await event( {
			kind: 'watchdog-error',
			error: error.stack ?? error.message,
		} );
	}
	if ( RUN_ONCE ) {
		break;
	}
	await sleep( POLL_MS );
}
