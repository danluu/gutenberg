#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT ??
	path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const args = process.argv.slice( 2 );
const ONCE = args.includes( '--once' );
const positionalArgs = args.filter( ( arg ) => ! arg.startsWith( '--' ) );
const RUN_ROOT = path.resolve(
	positionalArgs[ 0 ] ?? process.env.RTC_FUZZ_LIVE_ANALYSIS_RUN_ROOT ?? ''
);

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-live-analysis-monitor.mjs <supervised-run-root> [--once]',
			'',
			'Reads supervisor-state.json, discovers active generation directories,',
			'runs gate-only signature discovery, and keeps one Codex-only',
			'analysis-tier tmux session attached to each active generation.',
			'',
			'Environment:',
			'  RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000',
			'  RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=2',
			'  RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4',
			'  RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000',
			'  RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-analysis-live',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

if ( ! RUN_ROOT ) {
	throw new Error(
		'Expected a supervised run root argument or RTC_FUZZ_LIVE_ANALYSIS_RUN_ROOT.'
	);
}

const SUPERVISOR_STATE_PATH = path.join( RUN_ROOT, 'supervisor-state.json' );
const LOG_PATH = path.join( RUN_ROOT, 'live-analysis-monitor.log' );
const STATE_PATH = path.join( RUN_ROOT, 'live-analysis-monitor-state.json' );
const EVENTS_PATH = path.join(
	RUN_ROOT,
	'live-analysis-monitor-events.ndjson'
);
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS',
	120000
);
const ANALYSIS_MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL',
	2
);
const ANALYSIS_MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS',
	4
);
const ANALYSIS_CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS',
	45 * 60 * 1000
);
const ANALYSIS_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_TIER_INTERVAL_MS',
	30000
);
const TMUX_PREFIX =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX ?? 'rtc-analysis-live';

let shuttingDown = false;

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

function sanitizeTmuxName( name ) {
	return name.replace( /[^A-Za-z0-9_-]/g, '-' ).slice( 0, 160 );
}

function sessionNameForRunDir( runDir ) {
	const baseName = path.basename( runDir );
	const rawName = `${ TMUX_PREFIX }-${ baseName }`;
	if ( rawName.length <= 180 ) {
		return sanitizeTmuxName( rawName );
	}

	const hash = crypto
		.createHash( 'sha1' )
		.update( runDir )
		.digest( 'hex' )
		.slice( 0, 8 );
	return sanitizeTmuxName( `${ rawName.slice( 0, 160 ) }-${ hash }` );
}

function runCommand( command, commandArgs, options = {} ) {
	return new Promise( ( resolve ) => {
		execFile(
			command,
			commandArgs,
			{
				cwd: REPO_ROOT,
				encoding: 'utf8',
				...options,
			},
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

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function writeJsonFile( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${ process.pid }-${ Date.now() }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

function getActiveRunDirs( supervisorState ) {
	const dirs = [];
	const seen = new Set();

	for ( const group of supervisorState?.groups ?? [] ) {
		if ( group.status === 'disabled' ) {
			continue;
		}

		const groupDirs =
			group.activeRunDirs?.length > 0
				? group.activeRunDirs
				: [ group.currentRunDir ];

		for ( const dir of groupDirs ) {
			if ( ! dir || seen.has( dir ) ) {
				continue;
			}
			seen.add( dir );
			dirs.push( {
				group: group.name ?? null,
				runDir: dir,
			} );
		}
	}

	return dirs;
}

async function hasTmuxSession( sessionName ) {
	const result = await runCommand( 'tmux', [
		'has-session',
		'-t',
		sessionName,
	] );
	return result.ok;
}

function buildAnalysisCommand( runDir ) {
	return [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		'while true; do',
		`export RTC_FUZZ_ANALYSIS_MAX_PARALLEL=${ shellQuote(
			ANALYSIS_MAX_PARALLEL
		) }`,
		`export RTC_FUZZ_ANALYSIS_MAX_ATTEMPTS=${ shellQuote(
			ANALYSIS_MAX_ATTEMPTS
		) }`,
		`export RTC_FUZZ_ANALYSIS_INTERVAL_MS=${ shellQuote(
			ANALYSIS_INTERVAL_MS
		) }`,
		`export RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS=${ shellQuote(
			ANALYSIS_CODEX_TIMEOUT_MS
		) }`,
		`node bin/rtc-browser-fuzz-analysis-tier.mjs ${ shellQuote( runDir ) }`,
		'code=$?',
		'echo ANALYSIS_EXIT:$code $(date -u +%Y-%m-%dT%H:%M:%SZ)',
		'sleep 30',
		'done',
	].join( '; ' );
}

async function ensureAnalysisSession( runDir ) {
	const sessionName = sessionNameForRunDir( runDir );
	if ( await hasTmuxSession( sessionName ) ) {
		return {
			sessionName,
			started: false,
		};
	}

	const result = await runCommand( 'tmux', [
		'new-session',
		'-d',
		'-s',
		sessionName,
		buildAnalysisCommand( runDir ),
	] );

	if ( ! result.ok ) {
		await event( {
			kind: 'analysis-session-start-failed',
			runDir,
			sessionName,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
		throw new Error(
			`failed to start analysis tmux session ${ sessionName }: ${
				result.stderr || result.stdout
			}`
		);
	}

	await event( {
		kind: 'analysis-session-started',
		runDir,
		sessionName,
	} );
	return {
		sessionName,
		started: true,
	};
}

async function runGateOnlyWatcher( runDir ) {
	const result = await runCommand(
		process.execPath,
		[
			path.join( REPO_ROOT, 'bin/rtc-browser-fuzz-triage-watcher.mjs' ),
			runDir,
			'--once',
			'--gate-only',
		],
		{
			env: {
				...process.env,
				RTC_FUZZ_TRIAGE_MAX_PARALLEL: '1',
			},
		}
	);

	if ( ! result.ok ) {
		await event( {
			kind: 'gate-only-failed',
			runDir,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
		throw new Error(
			`gate-only watcher failed for ${ runDir }: ${
				result.stderr || result.stdout
			}`
		);
	}

	return result.stdout.trim();
}

function countStatuses( values ) {
	const counts = {};
	for ( const value of values ) {
		const status = value?.status ?? 'unknown';
		counts[ status ] = ( counts[ status ] ?? 0 ) + 1;
	}
	return counts;
}

async function summarizeRunDir( runDir ) {
	const triageState = await readJsonFile(
		path.join( runDir, '.triage-watcher/state.json' )
	);
	const analysisState = await readJsonFile(
		path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
	);

	return {
		runDir,
		triageUpdatedAt: triageState?.updatedAt ?? null,
		triageCounts: countStatuses(
			Object.values( triageState?.signatures ?? {} )
		),
		analysisUpdatedAt: analysisState?.updatedAt ?? null,
		analysisCounts: countStatuses(
			Object.values( analysisState?.jobs ?? {} )
		),
	};
}

async function monitorOnce() {
	const supervisorState = await readJsonFile( SUPERVISOR_STATE_PATH );
	if ( ! supervisorState ) {
		throw new Error(
			`Missing or invalid supervisor state: ${ SUPERVISOR_STATE_PATH }`
		);
	}

	const activeRunDirs = getActiveRunDirs( supervisorState );
	const summaries = [];
	const actions = [];

	for ( const { group, runDir } of activeRunDirs ) {
		if ( ! fsSync.existsSync( runDir ) ) {
			actions.push( {
				group,
				runDir,
				action: 'skip-missing-run-dir',
			} );
			continue;
		}

		const gateOutput = await runGateOnlyWatcher( runDir );
		const analysisSession = await ensureAnalysisSession( runDir );
		const secondGateOutput = await runGateOnlyWatcher( runDir );
		const summary = await summarizeRunDir( runDir );

		summaries.push( {
			group,
			...summary,
			analysisSession: analysisSession.sessionName,
		} );
		actions.push( {
			group,
			runDir,
			action: analysisSession.started
				? 'started-analysis-session'
				: 'analysis-session-already-running',
			sessionName: analysisSession.sessionName,
			gateOutput,
			secondGateOutput,
		} );
	}

	await writeJsonFile( STATE_PATH, {
		updatedAt: new Date().toISOString(),
		runRoot: RUN_ROOT,
		supervisorStatePath: SUPERVISOR_STATE_PATH,
		supervisorLastUpdatedAt: supervisorState.lastUpdatedAt ?? null,
		intervalMs: WATCH_INTERVAL_MS,
		analysisMaxParallel: ANALYSIS_MAX_PARALLEL,
		analysisMaxAttempts: ANALYSIS_MAX_ATTEMPTS,
		analysisCodexTimeoutMs: ANALYSIS_CODEX_TIMEOUT_MS,
		activeRunDirs: summaries,
		actions,
	} );

	await event( {
		kind: 'monitor-pass',
		activeRunDirs: summaries,
		actions: actions.map( ( action ) => ( {
			group: action.group,
			runDir: action.runDir,
			action: action.action,
			sessionName: action.sessionName,
		} ) ),
	} );

	await log(
		`pass active=${ summaries.length } actions=${ actions
			.map(
				( action ) =>
					`${ action.group ?? 'unknown' }:${ action.action }`
			)
			.join( ',' ) }`
	);
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

process.on( 'SIGINT', () => {
	shuttingDown = true;
} );
process.on( 'SIGTERM', () => {
	shuttingDown = true;
} );

await fs.mkdir( RUN_ROOT, { recursive: true } );
await log(
	`RTC browser fuzz live analysis monitor started for runRoot=${ RUN_ROOT }.`
);
await event( {
	kind: 'live-analysis-monitor-start',
	runRoot: RUN_ROOT,
	supervisorStatePath: SUPERVISOR_STATE_PATH,
	intervalMs: WATCH_INTERVAL_MS,
	analysisMaxParallel: ANALYSIS_MAX_PARALLEL,
	analysisMaxAttempts: ANALYSIS_MAX_ATTEMPTS,
	analysisCodexTimeoutMs: ANALYSIS_CODEX_TIMEOUT_MS,
} );

do {
	try {
		await monitorOnce();
	} catch ( error ) {
		await log( error.stack ?? error.message );
		await event( {
			kind: 'error',
			error: error.stack ?? error.message,
		} );
	}

	if ( ONCE ) {
		break;
	}

	await sleep( WATCH_INTERVAL_MS );
} while ( ! shuttingDown );

await log( 'RTC browser fuzz live analysis monitor exiting.' );
