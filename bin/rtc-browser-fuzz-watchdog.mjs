#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT =
	process.env.RTC_FUZZ_WATCHDOG_REPO_ROOT ??
	path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const SESSION =
	process.env.RTC_FUZZ_WATCHDOG_SESSION ?? 'rtc-fuzz-supervisor';
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
		execFile( command, args, { encoding: 'utf8' }, ( error, stdout, stderr ) => {
			resolve( {
				ok: ! error,
				code: error?.code ?? 0,
				stdout,
				stderr,
			} );
		} );
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

function buildSupervisorCommand() {
	return [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`export RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=${ shellQuote( OUTPUT_DIR ) }`,
		`export RTC_FUZZ_SUPERVISOR_GROUPS_PATH=${ shellQuote( GROUPS_PATH ) }`,
		`export RTC_FUZZ_SUPERVISOR_DURATION_HOURS=${ shellQuote(
			SUPERVISOR_DURATION_HOURS
		) }`,
		`export RTC_FUZZ_SUPERVISOR_POLL_MS=${ shellQuote( SUPERVISOR_POLL_MS ) }`,
		'while true; do node bin/rtc-browser-fuzz-supervisor.mjs; code=$?; echo "SUPERVISOR_EXIT:$code $(date -u +%Y-%m-%dT%H:%M:%SZ)"; sleep 30; done',
	].join( '; ' );
}

async function startSupervisor( reason ) {
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
} );

while ( true ) {
	try {
		await monitorOnce();
	} catch ( error ) {
		await log( error.stack ?? error.message );
		await event( { kind: 'error', error: error.stack ?? error.message } );
	}
	await sleep( WATCHDOG_POLL_MS );
}
