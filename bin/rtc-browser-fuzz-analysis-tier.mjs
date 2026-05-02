#!/usr/bin/env node
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname( fileURLToPath( import.meta.url ) );
const REPO_ROOT = path.resolve( SCRIPT_DIR, '..' );
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-analysis-tier.schema.json'
);
const SHARED_PATH = [
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH,
]
	.filter( Boolean )
	.join( path.delimiter );

const args = process.argv.slice( 2 );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-analysis-tier.mjs <run-output-dir> [--once]',
			'',
			'Scans an RTC browser fuzz triage watcher state file and launches',
			'high-parallel Codex analysis-only jobs for queued signatures.',
			'',
			'Environment:',
			'  RTC_FUZZ_ANALYSIS_INTERVAL_MS=30000',
			'  RTC_FUZZ_ANALYSIS_MAX_PARALLEL=12',
			'  RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS=2700000',
			'  RTC_FUZZ_ANALYSIS_STATE_DIR=<run>/.triage-watcher/analysis-tier',
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

const TRIAGE_STATE_DIR = path.join( RUN_DIR, '.triage-watcher' );
const TRIAGE_STATE_PATH = path.join( TRIAGE_STATE_DIR, 'state.json' );
const STATE_DIR =
	process.env.RTC_FUZZ_ANALYSIS_STATE_DIR ??
	path.join( TRIAGE_STATE_DIR, 'analysis-tier' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_INTERVAL_MS',
	30000
);
const MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_PARALLEL',
	12
);
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS',
	45 * 60 * 1000
);
const MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_ATTEMPTS',
	2
);

const activeJobs = new Map();
let shuttingDown = false;

function getPositiveIntegerEnv( name, defaultValue ) {
	const raw = process.env[ name ];
	if ( raw === undefined || raw === '' ) {
		return defaultValue;
	}

	const parsed = Number.parseInt( raw, 10 );
	if ( ! Number.isFinite( parsed ) || parsed <= 0 ) {
		throw new Error( `${ name } must be a positive integer.` );
	}

	return parsed;
}

async function readJson( filePath, fallback ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch ( error ) {
		if ( error.code === 'ENOENT' ) {
			return fallback;
		}

		throw error;
	}
}

async function writeJson( filePath, value ) {
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	const tmpPath = `${ filePath }.tmp-${ process.pid }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

async function readState() {
	return readJson( STATE_PATH, {
		version: 1,
		runDir: RUN_DIR,
		stateDir: STATE_DIR,
		startedAt: new Date().toISOString(),
		updatedAt: null,
		jobs: {},
	} );
}

async function writeState( state ) {
	state.updatedAt = new Date().toISOString();
	await writeJson( STATE_PATH, state );
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

async function reconcileJobs( state ) {
	for ( const job of Object.values( state.jobs ) ) {
		if ( job.status !== 'running' ) {
			continue;
		}

		if ( fsSync.existsSync( job.resultPath ) ) {
			job.status = 'completed';
			job.pid = null;
			job.completedAt = job.completedAt ?? new Date().toISOString();
			continue;
		}

		if ( isProcessAlive( job.pid ) ) {
			continue;
		}

		job.pid = null;
		job.status = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
		job.completedAt = new Date().toISOString();
	}
}

function getActiveJobHashes( state ) {
	const hashes = new Set( activeJobs.keys() );

	for ( const job of Object.values( state.jobs ) ) {
		if ( job.status === 'running' && isProcessAlive( job.pid ) ) {
			hashes.add( job.hash );
		}
	}

	return hashes;
}

function shouldAnalyzeSignature( signature, job ) {
	if ( ! signature?.hash ) {
		return false;
	}

	if ( [ 'completed', 'not-real', 'infra', 'no-realistic-repro' ].includes( signature.status ) ) {
		return false;
	}

	if ( ! job ) {
		return true;
	}

	if ( job.status === 'completed' || job.status === 'running' ) {
		return false;
	}

	if ( job.status === 'failed' && job.attempts >= MAX_ATTEMPTS ) {
		return false;
	}

	return job.status === 'queued' || job.status === 'retry' || job.status === 'failed';
}

function sortSignaturesForAnalysis( a, b ) {
	const statusPriority = {
		queued: 0,
		retry: 1,
		running: 2,
	};
	const aPriority = statusPriority[ a.status ] ?? 3;
	const bPriority = statusPriority[ b.status ] ?? 3;

	if ( aPriority !== bPriority ) {
		return aPriority - bPriority;
	}

	return ( b.count ?? 0 ) - ( a.count ?? 0 );
}

async function launchQueuedAnalysisJobs( sourceState, state ) {
	const activeHashes = getActiveJobHashes( state );
	const signatures = Object.values( sourceState.signatures ?? {} )
		.filter( ( signature ) =>
			shouldAnalyzeSignature( signature, state.jobs[ signature.hash ] )
		)
		.sort( sortSignaturesForAnalysis );

	for ( const signature of signatures ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			return;
		}

		if ( activeHashes.has( signature.hash ) ) {
			continue;
		}

		await launchCodexAnalysisJob( sourceState, state, signature );
		activeHashes.add( signature.hash );
	}
}

async function launchCodexAnalysisJob( sourceState, state, signature ) {
	const jobDir = path.join( STATE_DIR, 'signatures', signature.hash );
	const resultPath = path.join( jobDir, 'result.json' );
	const promptPath = path.join( jobDir, 'prompt.txt' );
	const stdoutPath = path.join( jobDir, 'events.jsonl' );
	const stderrPath = path.join( jobDir, 'stderr.log' );
	const analysisPath = path.join( jobDir, 'analysis.md' );
	const handoffPath = path.join( jobDir, 'handoff.md' );

	await fs.mkdir( jobDir, { recursive: true } );
	await fs.writeFile(
		path.join( jobDir, 'failure.json' ),
		JSON.stringify( signature, null, 2 ) + '\n'
	);
	await fs.writeFile(
		promptPath,
		buildCodexPrompt( sourceState, signature, {
			jobDir,
			analysisPath,
			handoffPath,
		} )
	);

	const previousJob = state.jobs[ signature.hash ];
	const job = {
		hash: signature.hash,
		status: 'running',
		attempts: ( previousJob?.attempts ?? 0 ) + 1,
		pid: null,
		sourceStatus: signature.status,
		sourceCount: signature.count ?? 0,
		startedAt: new Date().toISOString(),
		completedAt: null,
		jobDir,
		resultPath,
		stdoutPath,
		stderrPath,
		analysisPath,
		handoffPath,
	};
	state.jobs[ signature.hash ] = job;
	await writeState( state );

	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			'gpt-5.4',
			'-c',
			'model_reasoning_effort="high"',
			'--dangerously-bypass-approvals-and-sandbox',
			'--output-schema',
			SCHEMA_PATH,
			'--output-last-message',
			resultPath,
			'--json',
			await fs.readFile( promptPath, 'utf8' ),
		],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
				RTC_FUZZ_ANALYSIS_JOB_DIR: jobDir,
			},
			stdio: [
				'ignore',
				fsSync.openSync( stdoutPath, 'w' ),
				fsSync.openSync( stderrPath, 'w' ),
			],
		}
	);

	job.pid = child.pid;
	activeJobs.set( signature.hash, child );
	await writeState( state );

	const timeout = setTimeout( () => {
		if ( ! child.killed ) {
			child.kill( 'SIGTERM' );
		}
	}, CODEX_TIMEOUT_MS );

	child.on( 'exit', async ( code, signal ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const latest = await readState();
		const latestJob = latest.jobs[ signature.hash ];
		if ( ! latestJob ) {
			return;
		}

		latestJob.pid = null;
		latestJob.exitCode = code;
		latestJob.signal = signal;
		latestJob.completedAt = new Date().toISOString();
		latestJob.status =
			code === 0 && fsSync.existsSync( resultPath )
				? 'completed'
				: latestJob.attempts >= MAX_ATTEMPTS
					? 'failed'
					: 'retry';
		await writeState( latest );
	} );
}

function buildCodexPrompt( sourceState, signature, paths ) {
	const examples = ( signature.examples ?? [] )
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );
	const currentCounts = {};
	for ( const sourceSignature of Object.values( sourceState.signatures ?? {} ) ) {
		currentCounts[ sourceSignature.status ] =
			( currentCounts[ sourceSignature.status ] ?? 0 ) + 1;
	}

	return [
		'You are a high-parallel, analysis-only Codex worker for a Gutenberg RTC browser fuzz run.',
		`Repository: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage watcher state: ${ TRIAGE_STATE_PATH }`,
		`Analysis job directory: ${ paths.jobDir }`,
		`Failure signature: ${ signature.hash }`,
		`Current watcher status counts: ${ JSON.stringify( currentCounts ) }`,
		'',
		'Hard constraint: do not run Playwright, Chrome, npm test, npm run test:e2e, wp-env, docker, or any browser/repro command. This tier is for Codex-heavy thinking only.',
		'Allowed work: inspect text logs, error-context markdown, trace zip metadata/files, source code, existing artifacts, and other analysis-tier outputs. You may use shell commands such as rg, sed, find, unzip, node scripts that only read files, and git commands that only read history.',
		'',
		'Failure signature text:',
		signature.normalized,
		'',
		'Examples:',
		examples || '(none)',
		'',
		'Write these durable artifacts before returning:',
		`- ${ paths.analysisPath }: concise analysis, evidence, likely classification, duplicate candidates, and why.`,
		`- ${ paths.handoffPath }: a concrete handoff plan for the lower-parallel deep-triage/repro tier, including what browser repro to attempt if needed.`,
		'',
		'Classify whether this looks like a real correctness bug, infra/harness issue, duplicate of another signature, or uncertain. Prefer specific evidence over generic guesses.',
		'If this needs browser reproduction, provide a realistic Playwright/manual repro plan, but do not run it.',
		'Output only JSON matching the schema.',
	].join( '\n' );
}

async function runScanCycle() {
	const sourceState = await readJson( TRIAGE_STATE_PATH, null );
	if ( ! sourceState ) {
		throw new Error( `Missing triage watcher state at ${ TRIAGE_STATE_PATH }` );
	}

	const state = await readState();
	await reconcileJobs( state );
	await launchQueuedAnalysisJobs( sourceState, state );
	await writeState( state );

	const counts = {};
	for ( const job of Object.values( state.jobs ) ) {
		counts[ job.status ] = ( counts[ job.status ] ?? 0 ) + 1;
	}

	process.stdout.write(
		`[${ new Date().toISOString() }] sourceSignatures=${
			Object.keys( sourceState.signatures ?? {} ).length
		} analysisJobs=${ Object.keys( state.jobs ).length } active=${
			getActiveJobHashes( state ).size
		} counts=${ JSON.stringify( counts ) }\n`
	);
}

async function main() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

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
