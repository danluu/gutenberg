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
	'bin/rtc-browser-deep-analysis-tier.schema.json'
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
			'Usage: node bin/rtc-browser-fuzz-deep-analysis-tier.mjs <run-output-dir> [--once]',
			'',
			'Consumes first-level RTC fuzz analysis-tier results and launches',
			'a second, deeper Codex-only analysis pass for likely-real candidates.',
			'',
			'Environment:',
			'  RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS=45000',
			'  RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=4',
			'  RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS=5400000',
			'  RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR=<run>/.triage-watcher/deep-analysis-tier',
			'  RTC_FUZZ_DEEP_ANALYSIS_MODEL=gpt-5.4',
			'  RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT=xhigh',
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
const ANALYSIS_STATE_DIR = path.join( TRIAGE_STATE_DIR, 'analysis-tier' );
const ANALYSIS_STATE_PATH = path.join( ANALYSIS_STATE_DIR, 'state.json' );
const STATE_DIR =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR ??
	path.join( TRIAGE_STATE_DIR, 'deep-analysis-tier' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS',
	45000
);
const MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL',
	4
);
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS',
	90 * 60 * 1000
);
const MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_ATTEMPTS',
	2
);
const TRANSIENT_CODEX_STARTUP_BACKOFF_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_TRANSIENT_CODEX_STARTUP_BACKOFF_MS',
	5 * 60 * 1000
);
const CODEX_MODEL = process.env.RTC_FUZZ_DEEP_ANALYSIS_MODEL ?? 'gpt-5.4';
const REASONING_EFFORT =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT ?? 'xhigh';

const activeJobs = new Map();
let shuttingDown = false;

const TRANSIENT_CODEX_STARTUP_PATTERNS = [
	'Failed to load cloud requirements',
	'workspace-managed policies',
	'failed to refresh available models',
	'error sending request for url (https://chatgpt.com/backend-api/codex/models',
	'http/request failed: error sending request for url',
	'failed to connect to websocket',
	'failed to lookup address information',
	'stream disconnected before completion',
	'wss://chatgpt.com/backend-api/codex/responses',
];

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

async function readJsonIfPresent( filePath ) {
	return readJson( filePath, null );
}

async function writeJson( filePath, value ) {
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	const tmpPath = `${ filePath }.tmp-${ process.pid }-${ Date.now() }-${ Math.random()
		.toString( 36 )
		.slice( 2 ) }`;
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
		if (
			job.status === 'failed' &&
			( await isTransientCodexStartupFailure( job ) )
		) {
			markTransientCodexStartupRetry( job );
			continue;
		}

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

async function isTransientCodexStartupFailure( job ) {
	if ( ! job?.stderrPath ) {
		return false;
	}

	let stderr;
	try {
		stderr = await fs.readFile( job.stderrPath, 'utf8' );
	} catch {
		return false;
	}

	return (
		TRANSIENT_CODEX_STARTUP_PATTERNS.some( ( pattern ) =>
			stderr.includes( pattern )
		)
	);
}

function markTransientCodexStartupRetry( job ) {
	job.pid = null;
	job.status = 'retry';
	job.transientFailureCount = ( job.transientFailureCount ?? 0 ) + 1;
	job.transientFailureReason = 'codex-startup-connectivity';
	job.nextAttemptAt = new Date(
		Date.now() + TRANSIENT_CODEX_STARTUP_BACKOFF_MS
	).toISOString();
	job.attempts = Math.max( 0, ( job.attempts ?? 1 ) - 1 );
	job.completedAt = new Date().toISOString();
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

async function collectCandidates( sourceState, analysisState ) {
	const candidates = [];
	const relatedSummaries = [];

	for ( const firstJob of Object.values( analysisState.jobs ?? {} ) ) {
		if (
			firstJob.status !== 'completed' ||
			! firstJob.hash ||
			! firstJob.resultPath ||
			! fsSync.existsSync( firstJob.resultPath )
		) {
			continue;
		}

		const firstResult = await readJsonIfPresent( firstJob.resultPath );
		if ( ! firstResult ) {
			continue;
		}

		if ( isLikelyRealCandidate( firstResult ) ) {
			candidates.push( {
				hash: firstJob.hash,
				firstJob,
				firstResult,
				signature: sourceState.signatures?.[ firstJob.hash ] ?? null,
			} );
		}

		if (
			[ 'likely_real', 'uncertain' ].includes(
				firstResult.classification
			)
		) {
			relatedSummaries.push( {
				hash: firstJob.hash,
				classification: firstResult.classification,
				confidence: firstResult.confidence,
				action: firstResult.recommendedTriageAction,
				distinctBugType: firstResult.distinctBugType,
				duplicateOf: firstResult.isDuplicateOf,
				summary: firstResult.summary,
			} );
		}
	}

	return {
		candidates: candidates.sort( sortCandidates ),
		relatedSummaries,
	};
}

function isLikelyRealCandidate( firstResult ) {
	if ( ! firstResult?.shouldDeepTriage ) {
		return false;
	}

	return [ 'likely_real', 'uncertain' ].includes(
		firstResult.classification
	);
}

function sortCandidates( a, b ) {
	const actionPriority = {
		prioritize_deep_triage: 0,
		normal_deep_triage: 1,
		merge_with_duplicate: 2,
		keep_collecting: 3,
		suppress_as_infra: 4,
	};
	const confidencePriority = {
		high: 0,
		medium: 1,
		low: 2,
	};
	const aAction =
		actionPriority[ a.firstResult.recommendedTriageAction ] ?? 5;
	const bAction =
		actionPriority[ b.firstResult.recommendedTriageAction ] ?? 5;
	if ( aAction !== bAction ) {
		return aAction - bAction;
	}

	const aConfidence =
		confidencePriority[ a.firstResult.confidence ] ?? 3;
	const bConfidence =
		confidencePriority[ b.firstResult.confidence ] ?? 3;
	if ( aConfidence !== bConfidence ) {
		return aConfidence - bConfidence;
	}

	return ( b.signature?.count ?? 0 ) - ( a.signature?.count ?? 0 );
}

function shouldDeepAnalyzeCandidate( candidate, job ) {
	if ( ! candidate?.hash ) {
		return false;
	}

	if ( ! job ) {
		return true;
	}

	if ( job.status === 'completed' || job.status === 'running' ) {
		return false;
	}

	if (
		job.status === 'retry' &&
		job.nextAttemptAt &&
		Date.parse( job.nextAttemptAt ) > Date.now()
	) {
		return false;
	}

	if ( job.status === 'failed' && job.attempts >= MAX_ATTEMPTS ) {
		return false;
	}

	return job.status === 'queued' || job.status === 'retry' || job.status === 'failed';
}

async function launchQueuedDeepAnalysisJobs(
	sourceState,
	state,
	candidates,
	relatedSummaries
) {
	const activeHashes = getActiveJobHashes( state );

	for ( const candidate of candidates ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			return;
		}

		if ( activeHashes.has( candidate.hash ) ) {
			continue;
		}

		if ( ! shouldDeepAnalyzeCandidate( candidate, state.jobs[ candidate.hash ] ) ) {
			continue;
		}

		await launchCodexDeepAnalysisJob(
			sourceState,
			state,
			candidate,
			relatedSummaries
		);
		activeHashes.add( candidate.hash );
	}
}

async function launchCodexDeepAnalysisJob(
	sourceState,
	state,
	candidate,
	relatedSummaries
) {
	const jobDir = path.join( STATE_DIR, 'signatures', candidate.hash );
	const resultPath = path.join( jobDir, 'result.json' );
	const promptPath = path.join( jobDir, 'prompt.txt' );
	const stdoutPath = path.join( jobDir, 'events.jsonl' );
	const stderrPath = path.join( jobDir, 'stderr.log' );
	const deepAnalysisPath = path.join( jobDir, 'deep-analysis.md' );
	const reproHandoffPath = path.join( jobDir, 'repro-handoff.md' );

	await fs.mkdir( jobDir, { recursive: true } );
	await fs.writeFile(
		path.join( jobDir, 'candidate.json' ),
		JSON.stringify(
			{
				signature: candidate.signature,
				firstLevelJob: candidate.firstJob,
				firstLevelResult: candidate.firstResult,
			},
			null,
			2
		) + '\n'
	);
	await fs.writeFile(
		promptPath,
		buildCodexPrompt( sourceState, candidate, relatedSummaries, {
			jobDir,
			deepAnalysisPath,
			reproHandoffPath,
		} )
	);

	const previousJob = state.jobs[ candidate.hash ];
	const job = {
		hash: candidate.hash,
		status: 'running',
		attempts: ( previousJob?.attempts ?? 0 ) + 1,
		pid: null,
		sourceStatus: candidate.signature?.status ?? null,
		sourceCount: candidate.signature?.count ?? 0,
		firstLevelClassification: candidate.firstResult.classification,
		firstLevelConfidence: candidate.firstResult.confidence,
		firstLevelAction: candidate.firstResult.recommendedTriageAction,
		firstLevelResultPath: candidate.firstJob.resultPath,
		startedAt: new Date().toISOString(),
		completedAt: null,
		jobDir,
		resultPath,
		stdoutPath,
		stderrPath,
		deepAnalysisPath,
		reproHandoffPath,
		nextAttemptAt: null,
	};
	state.jobs[ candidate.hash ] = job;
	await writeState( state );

	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			CODEX_MODEL,
			'-c',
			`model_reasoning_effort="${ REASONING_EFFORT }"`,
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
				RTC_FUZZ_DEEP_ANALYSIS_JOB_DIR: jobDir,
			},
			stdio: [
				'ignore',
				fsSync.openSync( stdoutPath, 'w' ),
				fsSync.openSync( stderrPath, 'w' ),
			],
		}
	);

	job.pid = child.pid;
	activeJobs.set( candidate.hash, child );
	await writeState( state );

	const timeout = setTimeout( () => {
		if ( ! child.killed ) {
			child.kill( 'SIGTERM' );
		}
	}, CODEX_TIMEOUT_MS );

	child.on( 'exit', async ( code, signal ) => {
		clearTimeout( timeout );
		activeJobs.delete( candidate.hash );

		const latest = await readState();
		const latestJob = latest.jobs[ candidate.hash ];
		if ( ! latestJob ) {
			return;
		}

		latestJob.pid = null;
		latestJob.exitCode = code;
		latestJob.signal = signal;
		latestJob.completedAt = new Date().toISOString();
		if ( code === 0 && fsSync.existsSync( resultPath ) ) {
			latestJob.status = 'completed';
			latestJob.nextAttemptAt = null;
		} else if ( await isTransientCodexStartupFailure( latestJob ) ) {
			markTransientCodexStartupRetry( latestJob );
		} else {
			latestJob.status =
				latestJob.attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
			latestJob.nextAttemptAt = null;
		}
		await writeState( latest );
	} );
}

function buildCodexPrompt( sourceState, candidate, relatedSummaries, paths ) {
	const signature = candidate.signature ?? {};
	const firstJob = candidate.firstJob;
	const firstResult = candidate.firstResult;
	const firstAnalysisPath =
		firstJob.analysisPath ??
		path.join(
			ANALYSIS_STATE_DIR,
			'signatures',
			candidate.hash,
			'analysis.md'
		);
	const firstHandoffPath =
		firstJob.handoffPath ??
		path.join(
			ANALYSIS_STATE_DIR,
			'signatures',
			candidate.hash,
			'handoff.md'
		);
	const examples = ( signature.examples ?? [] )
		.slice( 0, 8 )
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );
	const related = relatedSummaries
		.filter( ( summary ) => summary.hash !== candidate.hash )
		.filter(
			( summary ) =>
				summary.distinctBugType === firstResult.distinctBugType ||
				summary.duplicateOf === candidate.hash ||
				firstResult.isDuplicateOf === summary.hash
		)
		.slice( 0, 20 )
		.map(
			( summary ) =>
				`- ${ summary.hash }: ${ summary.classification }/${ summary.confidence } action=${ summary.action } type=${ summary.distinctBugType } duplicateOf=${ summary.duplicateOf ?? 'none' } summary=${ summary.summary }`
		)
		.join( '\n' );
	const statusCounts = {};
	for ( const sourceSignature of Object.values( sourceState.signatures ?? {} ) ) {
		statusCounts[ sourceSignature.status ] =
			( statusCounts[ sourceSignature.status ] ?? 0 ) + 1;
	}

	return [
		'You are a second-level, analysis-only Codex worker for a Gutenberg RTC browser fuzz run.',
		'This job is intentionally deeper than the first analysis tier. Challenge the first-tier conclusion instead of restating it.',
		`Repository: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage watcher state: ${ TRIAGE_STATE_PATH }`,
		`First-level analysis state: ${ ANALYSIS_STATE_PATH }`,
		`Deep analysis job directory: ${ paths.jobDir }`,
		`Failure signature: ${ candidate.hash }`,
		`Current watcher status counts: ${ JSON.stringify( statusCounts ) }`,
		'',
		'Hard constraints:',
		'- Do not run Playwright, Chrome, npm test, npm run test:e2e, wp-env, docker, or any browser/repro command.',
		'- Do not edit production/source files. Write only the durable artifacts requested under the deep analysis job directory.',
		'- Keep filesystem searches scoped to the run directory, the first-level job directory, and relevant source files. Do not scan historical artifact trees under test/e2e/artifacts or unrelated old fuzz runs.',
		'- Do not run broad `find` or `rg` scans rooted at the repository root, `artifacts/rtc-browser-fuzz`, `test/e2e/artifacts`, or parent directories. Search exact example paths, this run directory, this job directory, the first-level job directory, and specific source files discovered with `git ls-files` or direct paths.',
		'',
		'Allowed work:',
		'- Inspect text logs, summary.ndjson lines, error-context markdown, trace zip metadata/files, first-level analysis artifacts, and relevant source code.',
		'- Use read-only shell commands such as rg, sed, find scoped to this run, unzip/list trace files, jq/node snippets that only read files, and read-only git commands.',
		'',
		'First-level result JSON:',
		JSON.stringify( firstResult, null, 2 ),
		'',
		'First-level artifacts to inspect:',
		`- result: ${ firstJob.resultPath }`,
		`- analysis: ${ firstAnalysisPath }`,
		`- handoff: ${ firstHandoffPath }`,
		'',
		'Failure signature text:',
		signature.normalized ?? '(missing from watcher state)',
		'',
		'Examples:',
		examples || '(none)',
		'',
		'Related first-level likely-real/uncertain signatures:',
		related || '(none found by exact distinctBugType/duplicate links)',
		'',
		'Write these durable artifacts before returning:',
		`- ${ paths.deepAnalysisPath }: detailed mechanism analysis, evidence, false-positive challenges, distinctness/duplicate analysis, likely affected code, severity/user impact, and confidence.`,
		`- ${ paths.reproHandoffPath }: concrete next steps for realistic reproduction at unit/API, manual browser, and Playwright levels using real user actions only; include what evidence would disprove the bug.`,
		'',
		'Depth requirements:',
		'1. Identify the smallest plausible failure mechanism and which layer owns it: Yjs/CRDT sync, provider transport, REST/persistence, editor data store, block serialization, rich text, or test harness.',
		'2. Compare against related signatures and decide whether this is distinct, a duplicate family member, or a symptom of a broader root cause.',
		'3. Actively look for false-positive explanations: timeout pressure, missing awareness, login/setup failure, helper direct state mutation, invalid fuzz operation, or expected conflict behavior.',
		'4. If still plausibly real, describe realistic repros at every useful level. The Playwright plan must use real editor UI/user actions and real sync behavior, not route blocking, artificial fault injection, direct store mutation, or test-only state mutation.',
		'5. If a realistic repro is not currently credible, say what additional loop/search should be delegated and exactly what would count as success.',
		'Output only JSON matching the schema.',
	].join( '\n' );
}

async function runScanCycle() {
	const sourceState = await readJson( TRIAGE_STATE_PATH, null );
	if ( ! sourceState ) {
		throw new Error( `Missing triage watcher state at ${ TRIAGE_STATE_PATH }` );
	}

	const analysisState = await readJson( ANALYSIS_STATE_PATH, null );
	if ( ! analysisState ) {
		throw new Error(
			`Missing first-level analysis state at ${ ANALYSIS_STATE_PATH }`
		);
	}

	const state = await readState();
	await reconcileJobs( state );
	const { candidates, relatedSummaries } = await collectCandidates(
		sourceState,
		analysisState
	);
	await launchQueuedDeepAnalysisJobs(
		sourceState,
		state,
		candidates,
		relatedSummaries
	);
	await writeState( state );

	const counts = {};
	for ( const job of Object.values( state.jobs ) ) {
		counts[ job.status ] = ( counts[ job.status ] ?? 0 ) + 1;
	}

	process.stdout.write(
		`[${ new Date().toISOString() }] sourceSignatures=${
			Object.keys( sourceState.signatures ?? {} ).length
		} firstLevelJobs=${ Object.keys( analysisState.jobs ?? {} ).length } candidates=${
			candidates.length
		} deepJobs=${ Object.keys( state.jobs ).length } active=${
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
