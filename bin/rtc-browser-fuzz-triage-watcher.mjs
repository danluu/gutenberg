#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-deep-triage.schema.json'
);
const LOCAL_NODE_BIN = path.join(
	REPO_ROOT,
	'.tooling/node-v20.19.0-darwin-arm64/bin'
);
const SHARED_PATH = [
	LOCAL_NODE_BIN,
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH ?? '',
].join( path.delimiter );

const args = process.argv.slice( 2 );
const DAEMON = args.includes( '--daemon' );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-triage-watcher.mjs <run-output-dir> [--once] [--daemon]',
			'',
			'Scans RTC browser fuzz artifacts, dedupes failures, and launches',
			'independent Codex deep-triage jobs for distinct failure signatures.',
			'',
			'Environment:',
			'  RTC_FUZZ_TRIAGE_INTERVAL_MS=30000',
			'  RTC_FUZZ_TRIAGE_MAX_PARALLEL=2',
			'  RTC_FUZZ_TRIAGE_REPRO_HOURS=3',
			'  RTC_FUZZ_TRIAGE_CODEX_TIMEOUT_MS=<derived from repro hours>',
			'  RTC_FUZZ_TRIAGE_STATE_DIR=<run-output-dir>/.triage-watcher',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

const ONCE = args.includes( '--once' );
const positionalArgs = args.filter( ( arg ) => ! arg.startsWith( '--' ) );
const RUN_DIR = path.resolve(
	positionalArgs[ 0 ] ?? process.env.RTC_FUZZ_TRIAGE_RUN_DIR ?? ''
);

if ( ! RUN_DIR ) {
	throw new Error(
		'Expected a run output directory argument or RTC_FUZZ_TRIAGE_RUN_DIR.'
	);
}

const STATE_DIR =
	process.env.RTC_FUZZ_TRIAGE_STATE_DIR ??
	path.join( RUN_DIR, '.triage-watcher' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_TRIAGE_INTERVAL_MS',
	30000
);
const MAX_PARALLEL = getPositiveIntegerEnv( 'RTC_FUZZ_TRIAGE_MAX_PARALLEL', 2 );
const REPRO_HOURS = getPositiveNumberEnv( 'RTC_FUZZ_TRIAGE_REPRO_HOURS', 3 );
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_TRIAGE_CODEX_TIMEOUT_MS',
	Math.ceil( REPRO_HOURS * 60 * 60 * 1000 + 20 * 60 * 1000 )
);

const activeJobs = new Map();
let shuttingDown = false;

async function launchDaemon() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

	const logPath = path.join( STATE_DIR, 'watcher.log' );
	const logHandle = await fs.open( logPath, 'a' );
	const child = spawn(
		process.execPath,
		[
			fileURLToPath( import.meta.url ),
			...args.filter( ( arg ) => arg !== '--daemon' ),
		],
		{
			cwd: REPO_ROOT,
			detached: true,
			env: {
				...process.env,
				PATH: SHARED_PATH,
			},
			stdio: [ 'ignore', logHandle.fd, logHandle.fd ],
		}
	);
	child.unref();
	await logHandle.close();

	process.stdout.write(
		JSON.stringify(
			{
				pid: child.pid,
				runDir: RUN_DIR,
				statePath: STATE_PATH,
				logPath,
			},
			null,
			2
		) + '\n'
	);
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

function createInitialState() {
	return {
		version: 1,
		runDir: RUN_DIR,
		stateDir: STATE_DIR,
		startedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		signatures: {},
	};
}

async function readState() {
	try {
		return JSON.parse( await fs.readFile( STATE_PATH, 'utf8' ) );
	} catch {
		return createInitialState();
	}
}

async function writeState( state ) {
	state.updatedAt = new Date().toISOString();
	await fs.mkdir( STATE_DIR, { recursive: true } );
	await fs.writeFile( STATE_PATH, JSON.stringify( state, null, 2 ) + '\n' );
}

async function findSummaryFiles( directory ) {
	let entries;
	try {
		entries = await fs.readdir( directory, { withFileTypes: true } );
	} catch ( error ) {
		if ( [ 'ENOENT', 'ENOTDIR' ].includes( error.code ) ) {
			return [];
		}
		throw error;
	}
	const files = [];

	for ( const entry of entries ) {
		const entryPath = path.join( directory, entry.name );

		if ( entry.isDirectory() ) {
			if ( entry.name === '.triage-watcher' ) {
				continue;
			}
			files.push( ...( await findSummaryFiles( entryPath ) ) );
			continue;
		}

		if ( entry.isFile() && entry.name === 'summary.ndjson' ) {
			files.push( entryPath );
		}
	}

	return files;
}

async function readFailureCandidates() {
	if ( ! fsSync.existsSync( RUN_DIR ) ) {
		throw new Error( `Run directory does not exist: ${ RUN_DIR }` );
	}

	const summaryFiles = await findSummaryFiles( RUN_DIR );
	const candidates = [];

	for ( const summaryPath of summaryFiles ) {
		const text = await fs.readFile( summaryPath, 'utf8' );
		const lines = text.split( '\n' ).filter( Boolean );

		for ( const [ lineIndex, line ] of lines.entries() ) {
			let record;
			try {
				record = JSON.parse( line );
			} catch {
				continue;
			}

			if ( ! isFailureRecord( record ) ) {
				continue;
			}

			candidates.push( {
				record,
				summaryPath,
				lineIndex: lineIndex + 1,
				signature: getFailureSignature( record ),
			} );
		}
	}

	return candidates;
}

function isFailureRecord( record ) {
	if ( record.kind === 'attempt' ) {
		return record.ok === false;
	}

	return [ 'real-bug', 'not-real', 'infra', 'uncertain' ].includes(
		record.kind
	);
}

function stripAnsi( value ) {
	return value.replace( /\u001b\[[0-9;]*m/g, '' );
}

function getFailureText( record ) {
	if ( record.failureSnippet ) {
		return record.failureSnippet;
	}

	if ( record.output ) {
		return record.output;
	}

	if ( record.codex?.result?.summary ) {
		return record.codex.result.summary;
	}

	return JSON.stringify( record );
}

function getFailureSignature( record ) {
	const text = stripAnsi( getFailureText( record ) );
	const normalized = normalizeFailureText( text );
	const hash = crypto
		.createHash( 'sha1' )
		.update( normalized )
		.digest( 'hex' )
		.slice( 0, 12 );

	return {
		hash,
		normalized,
	};
}

function normalizeFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest_meta_database_error wp_persisted_preferences';
	}

	const timeout = text.match( /TimeoutError: [^\n]+/ )?.[ 0 ];
	const assertion = text.match( /Error: expect\([^\n]+/ )?.[ 0 ];
	const restError = text.match( /code: '([^']+)'/ )?.[ 0 ];
	const stackLocation = text.match( /at [^(]+\(([^:()]+:\d+):\d+\)/ )?.[ 1 ];

	return [
		timeout,
		assertion,
		restError,
		stackLocation,
		text
			.split( '\n' )
			.map( ( line ) => line.trim() )
			.filter( Boolean )
			.slice( -12 )
			.join( '\n' ),
	]
		.filter( Boolean )
		.join( '\n' )
		.replaceAll( RUN_DIR, '<RUN_DIR>' )
		.replaceAll( REPO_ROOT, '<REPO_ROOT>' );
}

function groupCandidatesBySignature( candidates ) {
	const groups = new Map();

	for ( const candidate of candidates ) {
		const existing = groups.get( candidate.signature.hash ) ?? {
			hash: candidate.signature.hash,
			normalized: candidate.signature.normalized,
			candidates: [],
		};
		existing.candidates.push( candidate );
		groups.set( candidate.signature.hash, existing );
	}

	return [ ...groups.values() ];
}

async function updateDiscoveredSignatures( state, groups ) {
	for ( const group of groups ) {
		const existing = state.signatures[ group.hash ];
		const examples = group.candidates
			.slice( 0, 5 )
			.map( ( candidate ) => ( {
				summaryPath: candidate.summaryPath,
				lineIndex: candidate.lineIndex,
				kind: candidate.record.kind,
				seed: candidate.record.seed ?? null,
				logPath:
					candidate.record.logPath ??
					candidate.record.attempts?.[ 0 ]?.logPath ??
					null,
				artifactsDir:
					candidate.record.artifactsDir ??
					candidate.record.attempts?.[ 0 ]?.artifactsDir ??
					null,
			} ) );

		if ( existing ) {
			existing.lastSeenAt = new Date().toISOString();
			existing.count = group.candidates.length;
			existing.examples = mergeExamples( existing.examples, examples );
			continue;
		}

		const jobDir = path.join( STATE_DIR, 'signatures', group.hash );
		state.signatures[ group.hash ] = {
			hash: group.hash,
			status: 'queued',
			normalized: group.normalized,
			count: group.candidates.length,
			firstSeenAt: new Date().toISOString(),
			lastSeenAt: new Date().toISOString(),
			attempts: 0,
			jobDir,
			examples,
			resultPath: path.join( jobDir, 'result.json' ),
		};
		await fs.mkdir( jobDir, { recursive: true } );
		await fs.writeFile(
			path.join( jobDir, 'failure.json' ),
			JSON.stringify( state.signatures[ group.hash ], null, 2 ) + '\n'
		);
	}
}

function mergeExamples( currentExamples = [], newExamples = [] ) {
	const byKey = new Map();

	for ( const example of [ ...currentExamples, ...newExamples ] ) {
		byKey.set( `${ example.summaryPath }:${ example.lineIndex }`, example );
	}

	return [ ...byKey.values() ].slice( 0, 10 );
}

async function launchQueuedJobs( state ) {
	for ( const signature of Object.values( state.signatures ) ) {
		if ( activeJobs.size >= MAX_PARALLEL ) {
			return;
		}

		if ( activeJobs.has( signature.hash ) ) {
			continue;
		}

		if ( ! shouldLaunch( signature ) ) {
			continue;
		}

		await launchCodexJob( state, signature );
	}
}

async function reconcileExternallyCompletedJobs( state ) {
	for ( const signature of Object.values( state.signatures ) ) {
		if (
			signature.status !== 'running' ||
			! fsSync.existsSync( signature.resultPath ) ||
			activeJobs.has( signature.hash )
		) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse(
				await fs.readFile( signature.resultPath, 'utf8' )
			);
		} catch {}

		signature.result = result;
		signature.pid = null;
		signature.lastCompletedAt =
			signature.lastCompletedAt ?? new Date().toISOString();
		signature.status = getStatusFromResult( result, result ? 0 : 1 );
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
	}
}

function shouldLaunch( signature ) {
	if (
		[ 'completed', 'not-real', 'infra', 'no-realistic-repro' ].includes(
			signature.status
		)
	) {
		return false;
	}

	if ( signature.status === 'running' ) {
		if ( fsSync.existsSync( signature.resultPath ) ) {
			return false;
		}

		return ! isProcessAlive( signature.pid );
	}

	return signature.status === 'queued' || signature.status === 'retry';
}

function isProcessAlive( pid ) {
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

async function launchCodexJob( state, signature ) {
	signature.status = 'running';
	signature.attempts += 1;
	signature.lastStartedAt = new Date().toISOString();

	await fs.mkdir( signature.jobDir, { recursive: true } );
	await fs.writeFile(
		path.join( signature.jobDir, 'prompt.txt' ),
		buildCodexPrompt( signature )
	);
	await writeState( state );

	const stdoutPath = path.join( signature.jobDir, 'events.jsonl' );
	const stderrPath = path.join( signature.jobDir, 'stderr.log' );
	const statusPath = path.join( signature.jobDir, 'STATUS.md' );
	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			'gpt-5.4',
			'-c',
			'model_reasoning_effort="xhigh"',
			'--dangerously-bypass-approvals-and-sandbox',
			'--output-schema',
			SCHEMA_PATH,
			'--output-last-message',
			signature.resultPath,
			'--json',
			await fs.readFile(
				path.join( signature.jobDir, 'prompt.txt' ),
				'utf8'
			),
		],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
				RTC_FUZZ_TRIAGE_JOB_DIR: signature.jobDir,
				RTC_FUZZ_TRIAGE_REPRO_HOURS: String( REPRO_HOURS ),
			},
			stdio: [
				'ignore',
				fsSync.openSync( stdoutPath, 'w' ),
				fsSync.openSync( stderrPath, 'w' ),
			],
		}
	);

	signature.pid = child.pid ?? null;
	await writeState( state );

	const timeout = setTimeout( () => {
		child.kill( 'SIGTERM' );
		setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
	}, CODEX_TIMEOUT_MS );
	const startedAt = Date.now();

	activeJobs.set( signature.hash, child );
	child.on( 'error', async ( error ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const nextState = await readState();
		const nextSignature = nextState.signatures[ signature.hash ];
		if ( ! nextSignature ) {
			return;
		}

		nextSignature.status = 'retry';
		nextSignature.lastError = error.message;
		nextSignature.lastCompletedAt = new Date().toISOString();
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
	child.on( 'close', async ( code, signal ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const nextState = await readState();
		const nextSignature = nextState.signatures[ signature.hash ];
		if ( ! nextSignature ) {
			return;
		}

		nextSignature.lastCompletedAt = new Date().toISOString();
		nextSignature.durationMs = Date.now() - startedAt;
		nextSignature.exitCode = code;
		nextSignature.signal = signal;
		nextSignature.pid = null;

		let result = null;
		try {
			result = JSON.parse(
				await fs.readFile( nextSignature.resultPath, 'utf8' )
			);
		} catch {}

		nextSignature.result = result;
		nextSignature.status = getStatusFromResult( result, code );
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
}

function getStatusFromResult( result, code ) {
	if ( code !== 0 || ! result ) {
		return 'retry';
	}

	if ( result.classification === 'infra' ) {
		return 'infra';
	}

	if ( result.classification === 'not_real' ) {
		return 'not-real';
	}

	if ( result.realisticPlaywrightRepro?.status === 'not_found' ) {
		return 'no-realistic-repro';
	}

	return 'completed';
}

function buildCodexPrompt( signature ) {
	const examples = signature.examples
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );

	return [
		'You are an independent deep triage agent for a Gutenberg RTC browser fuzz run.',
		`Working directory: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage job directory: ${ signature.jobDir }`,
		`Failure signature: ${ signature.hash }`,
		`Maximum realistic-repro search time: ${ REPRO_HOURS } hours`,
		'',
		'Failure signature text:',
		signature.normalized,
		'',
		'Examples:',
		examples,
		'',
		'Required work:',
		'1. Decide whether this is a real Gutenberg/RTC correctness bug, an infra/harness issue, or not real.',
		'2. Compare the examples and decide whether they are one distinct bug type or duplicates of another signature in the same run.',
		'3. If it may be real, try to reproduce at every useful level: unit, REST/API, browser/manual, and Playwright.',
		'4. A Playwright repro must use real user actions and real editor/browser behavior. Do not use fault injection, artificial route blocking, artificial sleeps as a cause, or direct state mutation as the repro mechanism.',
		'5. If a realistic Playwright repro is not obvious, keep trying in a bounded loop until the repro-hours budget is spent or a realistic repro is found.',
		'6. Write durable artifacts in the triage job directory: analysis.md, bug-report.md for real bugs, false-positive.md for not-real/infra, and any repro files or commands you create.',
		'7. If after the bounded search the issue is not real or cannot be reproduced realistically, document why and recommend keep_fuzzing, suppress_as_infra, or manual_triage as appropriate.',
		'8. Do not revert user changes. If you edit repository files, keep changes narrowly scoped and list them in changedFiles.',
		'9. The active fuzz environment is the wp-env test environment on port 8950. Check it with: WP_ENV_PORT=8950 WP_BASE_URL=http://localhost:8950 npm run wp-env-test -- status. Do not use npm run wp-env status for this run; that checks a different development environment and may be stopped.',
		'10. Do not stop, start, clean, or reset the shared fuzz environment while fuzz lanes are running. If a reproduction needs a separate environment, create a separate worktree or terminal with a different port and document it.',
		'11. You may launch additional codex exec processes or terminal subprocesses for independent repro searches when helpful. Keep every artifact and status file under the triage job directory.',
		'',
		'Output only JSON matching the schema. The JSON should point at the artifacts you wrote.',
	].join( '\n' );
}

async function writeStatusMarkdown( statusPath, signature ) {
	const result = signature.result;
	const lines = [
		`# Deep triage ${ signature.hash }`,
		'',
		`Status: ${ signature.status }`,
		`Attempts: ${ signature.attempts }`,
		`Completed: ${ signature.lastCompletedAt ?? 'not completed' }`,
		'',
	];

	if ( result ) {
		lines.push(
			`Classification: ${ result.classification }`,
			`Confidence: ${ result.confidence }`,
			`Distinct bug type: ${ result.distinctBugType }`,
			`Recommended action: ${ result.recommendedAction }`,
			'',
			'## Summary',
			'',
			result.summary,
			'',
			'## Repro',
			'',
			`Playwright status: ${ result.realisticPlaywrightRepro.status }`,
			`Playwright path: ${
				result.realisticPlaywrightRepro.path ?? 'none'
			}`,
			`Playwright command: ${
				result.realisticPlaywrightRepro.command ?? 'none'
			}`,
			'',
			result.realisticPlaywrightRepro.notes
		);
	} else {
		lines.push(
			'Codex did not produce a parseable result. The watcher will retry this signature.'
		);
	}

	await fs.writeFile( statusPath, lines.join( '\n' ) + '\n' );
}

async function runScanCycle() {
	const state = await readState();
	const candidates = await readFailureCandidates();
	const groups = groupCandidatesBySignature( candidates );
	await updateDiscoveredSignatures( state, groups );
	await reconcileExternallyCompletedJobs( state );
	await launchQueuedJobs( state );
	await writeState( state );
	process.stdout.write(
		`[${ new Date().toISOString() }] candidates=${
			candidates.length
		} signatures=${ groups.length } active=${ activeJobs.size }\n`
	);
}

async function main() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

	if ( DAEMON ) {
		await launchDaemon();
		return;
	}

	process.on( 'SIGINT', () => {
		shuttingDown = true;
	} );
	process.on( 'SIGTERM', () => {
		shuttingDown = true;
	} );

	do {
		await runScanCycle();

		if ( ONCE ) {
			break;
		}

		await new Promise( ( resolve ) =>
			setTimeout( resolve, WATCH_INTERVAL_MS )
		);
	} while ( ! shuttingDown );
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
