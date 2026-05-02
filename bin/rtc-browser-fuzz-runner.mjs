#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const SPEC_PATH =
	'test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts';
const BEHAVIORAL_COVERAGE_FILENAME = 'rtc-behavioral-coverage.ndjson';
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-failure-analysis.schema.json'
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
const OUTPUT_DIR =
	process.env.RTC_FUZZ_OUTPUT_DIR ??
	path.join( REPO_ROOT, 'artifacts/rtc-browser-fuzz', createTimestamp() );
const DURATION_HOURS = getPositiveNumberEnv( 'RTC_FUZZ_DURATION_HOURS', 12 );
const START_SEED = getPositiveIntegerEnv( 'RTC_FUZZ_START_SEED', 1004 );
const SEED_STRIDE = getPositiveIntegerEnv( 'RTC_FUZZ_SEED_STRIDE', 1 );
const STEP_COUNT = getPositiveIntegerEnv( 'RTC_FUZZ_STEP_COUNT', 12 );
const CONVERGENCE_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_CONVERGENCE_TIMEOUT_MS',
	15000
);
const DISCOVERY_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DISCOVERY_TIMEOUT_MS',
	30000
);
const BOOT_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_BOOT_TIMEOUT_MS',
	30000
);
const RUN_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_RUN_TIMEOUT_MS',
	8 * 60 * 1000
);
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_CODEX_TIMEOUT_MS',
	20 * 60 * 1000
);
const ANALYSIS_RECHECKS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_RECHECKS',
	2
);
const FULL_PREFLIGHT_INTERVAL_SEEDS = getPositiveIntegerEnv(
	'RTC_FUZZ_FULL_PREFLIGHT_INTERVAL_SEEDS',
	25
);
const HEALTH_CHECK_INTERVAL_SEEDS = getPositiveIntegerEnv(
	'RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS',
	1
);
const HTTP_HEALTH_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_HTTP_HEALTH_TIMEOUT_MS',
	10000
);
const BASE_URL = process.env.RTC_FUZZ_BASE_URL ?? process.env.WP_BASE_URL ?? '';
const DISABLE_SYNC_FAULTS =
	process.env.RTC_FUZZ_DISABLE_SYNC_FAULTS ??
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS ??
	'0';
const DISABLE_RELOAD =
	process.env.RTC_FUZZ_DISABLE_RELOAD ??
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_RELOAD ??
	'0';
const DISABLE_REVISION_RESTORE =
	process.env.RTC_FUZZ_DISABLE_REVISION_RESTORE ??
	process.env.GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE ??
	'0';
const ENABLE_REVISION_RESTORE_PROBE =
	process.env.RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE ??
	process.env.GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE ??
	process.env.RTC_FUZZ_ENABLE_REST_REVISION_RESTORE_PROBE ??
	process.env.GUTENBERG_RTC_BROWSER_ENABLE_REST_REVISION_RESTORE_PROBE ??
	'1';
const ACTION_PROFILE =
	process.env.RTC_FUZZ_ACTION_PROFILE ??
	process.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ??
	'';
const COLLABORATOR_MODE =
	process.env.RTC_FUZZ_COLLABORATOR_MODE ??
	process.env.GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE ??
	'';
const LANE_LABEL = process.env.RTC_FUZZ_LANE_LABEL ?? `seed-${ START_SEED }`;
const ASSUME_WP_ENV_RUNNING =
	process.env.RTC_FUZZ_ASSUME_WP_ENV_RUNNING === '1';
const INLINE_CODEX = ( process.env.RTC_FUZZ_INLINE_CODEX ?? '1' ) !== '0';
const SKIP_GLOBAL_POST_CLEANUP =
	process.env.RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP ??
	process.env.GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP ??
	'0';
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;

const state = {
	startedAt: new Date().toISOString(),
	laneLabel: LANE_LABEL,
	outputDir: OUTPUT_DIR,
	actionProfile: ACTION_PROFILE || 'full',
	seedStride: SEED_STRIDE,
	nextSeed: START_SEED,
	currentSeed: null,
	successes: 0,
	realBugs: 0,
	notRealFailures: 0,
	uncertainFailures: 0,
	infraFailures: 0,
	lastUpdatedAt: new Date().toISOString(),
	stopReason: null,
};

let runnerLogPath;
let summaryLogPath;
let statePath;

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

function createTimestamp() {
	return new Date()
		.toISOString()
		.replaceAll( '-', '' )
		.replaceAll( ':', '' )
		.replace( /\.\d+Z$/, 'Z' )
		.replace( 'T', 'T' );
}

function getSharedEnv( overrides = {} ) {
	return {
		...process.env,
		PATH: SHARED_PATH,
		...overrides,
	};
}

function getBrowserFuzzEnv( overrides = {} ) {
	return {
		...( BASE_URL ? { WP_BASE_URL: BASE_URL } : {} ),
		GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS:
			process.env.GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS ??
			String( DISCOVERY_TIMEOUT_MS ),
		GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS:
			process.env.GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS ??
			String( BOOT_TIMEOUT_MS ),
		GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING: ASSUME_WP_ENV_RUNNING
			? '1'
			: '0',
		GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: DISABLE_SYNC_FAULTS,
		GUTENBERG_RTC_BROWSER_DISABLE_RELOAD: DISABLE_RELOAD,
		GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE:
			DISABLE_REVISION_RESTORE,
		GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP:
			SKIP_GLOBAL_POST_CLEANUP,
		...( ENABLE_REVISION_RESTORE_PROBE
			? {
					GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE:
						ENABLE_REVISION_RESTORE_PROBE,
			  }
			: {} ),
		...( ACTION_PROFILE
			? { GUTENBERG_RTC_BROWSER_ACTION_PROFILE: ACTION_PROFILE }
			: {} ),
		...( COLLABORATOR_MODE
			? { GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: COLLABORATOR_MODE }
			: {} ),
		...overrides,
	};
}

async function ensureFileExists( filePath ) {
	await fs.access( filePath );
}

async function updateState( patch = {} ) {
	Object.assign( state, patch, {
		lastUpdatedAt: new Date().toISOString(),
	} );
	await fs.writeFile( statePath, JSON.stringify( state, null, 2 ) + '\n' );
}

async function appendSummary( record ) {
	await fs.appendFile( summaryLogPath, JSON.stringify( record ) + '\n' );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( runnerLogPath, line );
}

function withTrailingNewline( value ) {
	return value.endsWith( '\n' ) ? value : `${ value }\n`;
}

async function runCombinedCommand( {
	command,
	args,
	env,
	logPath,
	timeoutMs,
	cwd = REPO_ROOT,
} ) {
	await fs.mkdir( path.dirname( logPath ), { recursive: true } );
	const start = Date.now();
	const child = spawn( command, args, {
		cwd,
		env,
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );
	const chunks = [];
	const logHandle = await fs.open( logPath, 'w' );

	const writeChunk = async ( chunk ) => {
		chunks.push( chunk.toString() );
		await logHandle.write( chunk );
	};

	child.stdout.on( 'data', ( chunk ) => {
		void writeChunk( chunk );
	} );
	child.stderr.on( 'data', ( chunk ) => {
		void writeChunk( chunk );
	} );

	let timedOut = false;
	const timeout = setTimeout( () => {
		timedOut = true;
		child.kill( 'SIGTERM' );
		setTimeout( () => {
			child.kill( 'SIGKILL' );
		}, 5000 ).unref();
	}, timeoutMs );

	const result = await new Promise( ( resolve, reject ) => {
		child.on( 'error', reject );
		child.on( 'close', ( code, signal ) => {
			clearTimeout( timeout );
			resolve( {
				code,
				signal,
			} );
		} );
	} );

	await logHandle.close();

	return {
		...result,
		ok: result.code === 0 && ! timedOut,
		timedOut,
		durationMs: Date.now() - start,
		output: chunks.join( '' ),
		logPath,
	};
}

async function runCodexCommand( {
	command,
	args,
	env,
	stdoutPath,
	stderrPath,
	timeoutMs,
	cwd = REPO_ROOT,
} ) {
	await fs.mkdir( path.dirname( stdoutPath ), { recursive: true } );
	await fs.mkdir( path.dirname( stderrPath ), { recursive: true } );
	const start = Date.now();
	const child = spawn( command, args, {
		cwd,
		env,
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );
	const stdoutHandle = await fs.open( stdoutPath, 'w' );
	const stderrHandle = await fs.open( stderrPath, 'w' );

	child.stdout.on( 'data', ( chunk ) => {
		void stdoutHandle.write( chunk );
	} );
	child.stderr.on( 'data', ( chunk ) => {
		void stderrHandle.write( chunk );
	} );

	let timedOut = false;
	const timeout = setTimeout( () => {
		timedOut = true;
		child.kill( 'SIGTERM' );
		setTimeout( () => {
			child.kill( 'SIGKILL' );
		}, 5000 ).unref();
	}, timeoutMs );

	const result = await new Promise( ( resolve, reject ) => {
		child.on( 'error', reject );
		child.on( 'close', ( code, signal ) => {
			clearTimeout( timeout );
			resolve( {
				code,
				signal,
			} );
		} );
	} );

	await stdoutHandle.close();
	await stderrHandle.close();

	return {
		...result,
		ok: result.code === 0 && ! timedOut,
		timedOut,
		durationMs: Date.now() - start,
		stdoutPath,
		stderrPath,
	};
}

async function ensureWpEnvRunning() {
	if ( ASSUME_WP_ENV_RUNNING ) {
		await log(
			'Assuming wp-env-test is running because the launcher already checked it.'
		);
		return;
	}

	const statusLogPath = path.join( OUTPUT_DIR, 'wp-env-status.log' );
	const statusResult = await runCombinedCommand( {
		command: 'npm',
		args: [ 'run', 'wp-env-test', '--', 'status' ],
		env: getSharedEnv(),
		logPath: statusLogPath,
		timeoutMs: 120000,
	} );

	if (
		statusResult.ok &&
		statusResult.output.includes( 'status: running' )
	) {
		await log( 'wp-env-test is already running.' );
		return;
	}

	await log( 'wp-env-test is not running; starting it now.' );
	const startLogPath = path.join( OUTPUT_DIR, 'wp-env-start.log' );
	const startResult = await runCombinedCommand( {
		command: 'npm',
		args: [ 'run', 'wp-env-test', '--', 'start' ],
		env: getSharedEnv(),
		logPath: startLogPath,
		timeoutMs: 10 * 60 * 1000,
	} );

	if ( ! startResult.ok ) {
		throw new Error(
			`Failed to start wp-env-test. See ${ startResult.logPath }.`
		);
	}
}

async function runFullPreflight( label ) {
	await ensureFileExists( path.join( REPO_ROOT, SPEC_PATH ) );
	await ensureFileExists( SCHEMA_PATH );

	const preflightLogPath = path.join(
		OUTPUT_DIR,
		`${ label }-preflight.log`
	);
	return runCombinedCommand( {
		command: 'npm',
		args: [
			'run',
			'test:e2e',
			'--',
			'--list',
			SPEC_PATH,
			'--project=chromium',
		],
		env: getSharedEnv(
			getBrowserFuzzEnv( {
				WP_ARTIFACTS_PATH: path.join(
					OUTPUT_DIR,
					`${ label }-preflight-artifacts`
				),
				GUTENBERG_RTC_BROWSER_SEED_START: String( START_SEED ),
				GUTENBERG_RTC_BROWSER_SEED_COUNT: '1',
				GUTENBERG_RTC_BROWSER_STEPS: '1',
				GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS: String(
					CONVERGENCE_TIMEOUT_MS
				),
				GUTENBERG_RTC_LANE_LABEL: LANE_LABEL,
			} )
		),
		logPath: preflightLogPath,
		timeoutMs: 2 * 60 * 1000,
	} );
}

async function runEnvironmentHealthCheck( label ) {
	const healthLogPath = path.join( OUTPUT_DIR, `${ label }-health.log` );
	const start = Date.now();
	const output = [];
	const record = ( line ) => {
		output.push( `[${ new Date().toISOString() }] ${ line }` );
	};

	if ( ! BASE_URL ) {
		record( 'RTC_FUZZ_BASE_URL or WP_BASE_URL is required.' );
		const text = output.join( '\n' ) + '\n';
		await fs.writeFile( healthLogPath, text );
		return {
			code: 1,
			signal: null,
			ok: false,
			timedOut: false,
			durationMs: Date.now() - start,
			output: text,
			logPath: healthLogPath,
		};
	}

	let endpoints;
	try {
		endpoints = [
			new URL( '/wp-json/', BASE_URL ).toString(),
			new URL( '/index.php?rest_route=/', BASE_URL ).toString(),
		];
	} catch ( error ) {
		record( `Invalid base URL "${ BASE_URL }": ${ error.message }` );
		const text = output.join( '\n' ) + '\n';
		await fs.writeFile( healthLogPath, text );
		return {
			code: 1,
			signal: null,
			ok: false,
			timedOut: false,
			durationMs: Date.now() - start,
			output: text,
			logPath: healthLogPath,
		};
	}

	let timedOut = false;
	let lastResult = null;

	for ( const endpoint of endpoints ) {
		const controller = new AbortController();
		const timeout = setTimeout( () => {
			timedOut = true;
			controller.abort();
		}, HTTP_HEALTH_TIMEOUT_MS );
		timeout.unref();

		try {
			record( `GET ${ endpoint }` );
			const response = await fetch( endpoint, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'rtc-browser-fuzz-health',
				},
				signal: controller.signal,
			} );
			const body = await response.text();
			const bodySnippet = body.slice( 0, 1000 );
			const ok = response.ok && body.includes( '"namespaces"' );
			record( `status=${ response.status } ok=${ ok }` );
			record( `body-snippet=${ JSON.stringify( bodySnippet ) }` );
			lastResult = {
				code: ok ? 0 : 1,
				signal: null,
				ok,
				timedOut,
				durationMs: Date.now() - start,
				logPath: healthLogPath,
			};

			if ( ok ) {
				const text = output.join( '\n' ) + '\n';
				await fs.writeFile( healthLogPath, text );
				return {
					...lastResult,
					output: text,
				};
			}
		} catch ( error ) {
			record( `request failed: ${ error.stack ?? error.message }` );
			lastResult = {
				code: 1,
				signal: null,
				ok: false,
				timedOut,
				durationMs: Date.now() - start,
				logPath: healthLogPath,
			};
		} finally {
			clearTimeout( timeout );
		}
	}

	const text = output.join( '\n' ) + '\n';
	await fs.writeFile( healthLogPath, text );
	return {
		...( lastResult ?? {
			code: 1,
			signal: null,
			ok: false,
			timedOut,
			durationMs: Date.now() - start,
			logPath: healthLogPath,
		} ),
		output: text,
	};
}

async function stopForInfraFailure( { seed = null, stage, result } ) {
	const failureSnippet = extractFailureSnippet( result.output );
	await appendSummary( {
		kind: 'infra',
		discoveredAt: new Date().toISOString(),
		...( seed === null ? {} : { seed } ),
		stage,
		failureSnippet,
		logPath: result.logPath,
	} );
	await updateState( {
		infraFailures: state.infraFailures + 1,
		stopReason:
			seed === null
				? `${ stage }-failed`
				: `seed-${ seed }-${ stage }-failed`,
	} );
	await log(
		`Stopping after ${ stage } failure${
			seed === null ? '' : ` for seed ${ seed }`
		}. See ${ result.logPath }.`
	);
}

function extractFailureSnippet( output ) {
	const trimmed = output.trim();

	if ( ! trimmed ) {
		return 'No command output was captured.';
	}

	const lines = trimmed.split( '\n' );
	return lines.slice( -40 ).join( '\n' );
}

function classifyLocalFailure( failureSnippet ) {
	if (
		/No tests found|Cannot find module|ENOENT|playwright\.config|ERR_MODULE_NOT_FOUND|Missing script|Cannot find file/i.test(
			failureSnippet
		)
	) {
		return 'harness';
	}

	if (
		/ECONNREFUSED|docker|wp-env|timed out waiting|browser has been closed|Target page, context or browser has been closed/i.test(
			failureSnippet
		)
	) {
		return 'environment';
	}

	return 'product-or-test';
}

function classifyReproducibility( attempts ) {
	const failingAttempts = attempts.filter( ( attempt ) => ! attempt.ok );

	if ( failingAttempts.length === attempts.length ) {
		return 'confirmed-reproducible';
	}

	if ( failingAttempts.length > 1 ) {
		return 'likely-real-intermittent';
	}

	return 'unconfirmed';
}

async function readNdjsonFile( filePath ) {
	let text;
	try {
		text = await fs.readFile( filePath, 'utf8' );
	} catch {
		return [];
	}

	return text
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean )
		.map( ( line ) => {
			try {
				return JSON.parse( line );
			} catch ( error ) {
				return {
					parseError: error.message,
					raw: line.slice( 0, 1000 ),
				};
			}
		} );
}

function mapAnalysisKind( analysis, localClassification ) {
	if ( ! analysis ) {
		return localClassification === 'harness' ||
			localClassification === 'environment'
			? 'infra'
			: 'uncertain';
	}

	if ( analysis.classification === 'real' ) {
		return 'real-bug';
	}

	if ( analysis.classification === 'uncertain' ) {
		return 'uncertain';
	}

	return localClassification === 'harness' ||
		localClassification === 'environment'
		? 'infra'
		: 'not-real';
}

function buildAttemptEnv( seed, convergenceTimeoutMs, artifactsDir ) {
	return getSharedEnv(
		getBrowserFuzzEnv( {
			WP_ARTIFACTS_PATH: artifactsDir,
			GUTENBERG_RTC_BROWSER_SEED_START: String( seed ),
			GUTENBERG_RTC_BROWSER_SEED_COUNT: '1',
			GUTENBERG_RTC_BROWSER_STEPS: String( STEP_COUNT ),
			GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS:
				String( convergenceTimeoutMs ),
			GUTENBERG_RTC_LANE_LABEL: LANE_LABEL,
		} )
	);
}

async function runSeedAttempt( seed, label, convergenceTimeoutMs ) {
	const attemptDir = path.join( OUTPUT_DIR, `seed-${ seed }`, label );
	const artifactsDir = path.join( attemptDir, 'artifacts' );
	const commandResult = await runCombinedCommand( {
		command: 'npm',
		args: [ 'run', 'test:e2e', '--', SPEC_PATH, '--project=chromium' ],
		env: buildAttemptEnv( seed, convergenceTimeoutMs, artifactsDir ),
		logPath: path.join( attemptDir, 'command.log' ),
		timeoutMs: RUN_TIMEOUT_MS,
	} );
	const behavioralCoveragePath = path.join(
		artifactsDir,
		BEHAVIORAL_COVERAGE_FILENAME
	);
	const behavioralCoverage = await readNdjsonFile( behavioralCoveragePath );

	return {
		seed,
		label,
		code: commandResult.code,
		signal: commandResult.signal,
		ok: commandResult.ok,
		timedOut: commandResult.timedOut,
		durationMs: commandResult.durationMs,
		artifactsDir,
		behavioralCoverage,
		behavioralCoveragePath,
		logPath: commandResult.logPath,
		output: commandResult.output,
	};
}

function buildCodexPrompt( {
	seed,
	attempts,
	localClassification,
	failureSnippet,
} ) {
	const attemptList = attempts
		.map(
			( attempt ) =>
				`- ${ attempt.label }: ${ attempt.logPath } (ok=${ attempt.ok }, code=${ attempt.code }, durationMs=${ attempt.durationMs })`
		)
		.join( '\n' );

	return withTrailingNewline(
		[
			'Analyze a failing Gutenberg real-browser collaboration fuzz seed.',
			`Seed: ${ seed }`,
			`Working directory: ${ REPO_ROOT }`,
			`Primary spec: ${ path.join( REPO_ROOT, SPEC_PATH ) }`,
			`Failure-analysis schema: ${ SCHEMA_PATH }`,
			'Use this PATH for repo commands:',
			`PATH="${ LOCAL_NODE_BIN }:${ path.join(
				REPO_ROOT,
				'node_modules/.bin'
			) }:$PATH"`,
			'wp-env test environment should be checked with:',
			'npm run wp-env-test -- status',
			`Local classification: ${ localClassification }`,
			'Attempt logs:',
			attemptList,
			'Failure snippet:',
			failureSnippet,
			'Important:',
			'- This is not an Antithesis run.',
			'- Do not use Antithesis skills, Antithesis tooling, or any Antithesis-specific workflow.',
			'- Only inspect local repository files and the listed command logs.',
			'Tasks:',
			'1. Determine whether this is a real collaboration bug, a test bug, or a harness/environment issue.',
			'2. Do not edit shared source, tests, package files, or run configuration.',
			'3. If this looks like a false positive, describe the smallest harness change that should be made later.',
			'4. Output only JSON that matches the provided schema.',
			'Rules:',
			'- Do not weaken coverage by broad string matching or skipping large classes of failures.',
			'- Prefer preflight validation and explicit infra classification over ignoring failing logs.',
			'- changedFiles must be an empty array because this analysis is read-only.',
		].join( '\n' )
	);
}

async function runCodexFailureAnalysis( {
	seed,
	attempts,
	localClassification,
	failureSnippet,
} ) {
	const analysisDir = path.join(
		OUTPUT_DIR,
		`seed-${ seed }`,
		'codex-analysis'
	);
	const promptPath = path.join( analysisDir, 'prompt.txt' );
	const resultPath = path.join( analysisDir, 'result.json' );
	const stdoutPath = path.join( analysisDir, 'events.jsonl' );
	const stderrPath = path.join( analysisDir, 'stderr.log' );
	await fs.mkdir( analysisDir, { recursive: true } );

	const prompt = buildCodexPrompt( {
		seed,
		attempts,
		localClassification,
		failureSnippet,
	} );
	await fs.writeFile( promptPath, prompt );

	if ( ! INLINE_CODEX ) {
		const result = {
			classification:
				localClassification === 'harness' ||
				localClassification === 'environment'
					? 'not_real'
					: 'uncertain',
			confidence: 'low',
			summary:
				'Inline Codex analysis is disabled for this long-running fuzz run; the asynchronous deep-triage watcher owns detailed analysis.',
			evidence: attempts.map(
				( attempt ) =>
					`${ attempt.label }: ${ attempt.logPath } (ok=${ attempt.ok }, code=${ attempt.code })`
			),
			recommendedRunnerAction: 'keep-running',
			harnessChangesApplied: false,
			changedFiles: [],
			validationSummary:
				'No inline validation was run; seed attempts and logs were persisted for deep triage.',
		};
		await fs.writeFile(
			resultPath,
			JSON.stringify( result, null, 2 ) + '\n'
		);
		await fs.writeFile( stdoutPath, '' );
		await fs.writeFile( stderrPath, '' );
		return {
			ok: true,
			durationMs: 0,
			stdoutPath,
			stderrPath,
			resultPath,
			result,
		};
	}

	const codexResult = await runCodexCommand( {
		command: 'codex',
		args: [
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
			resultPath,
			'--json',
			prompt,
		],
		env: getSharedEnv(),
		stdoutPath,
		stderrPath,
		timeoutMs: CODEX_TIMEOUT_MS,
	} );

	let result = null;

	if ( codexResult.ok ) {
		try {
			result = JSON.parse( await fs.readFile( resultPath, 'utf8' ) );
		} catch ( error ) {
			result = {
				classification: 'uncertain',
				confidence: 'low',
				summary: `Codex completed but produced unreadable JSON: ${ error.message }`,
				evidence: [ `See ${ resultPath } and ${ stderrPath }.` ],
				recommendedRunnerAction: 'stop-for-manual-triage',
				harnessChangesApplied: false,
				changedFiles: [],
				validationSummary:
					'No validation because the analysis result could not be parsed.',
			};
		}
	} else {
		result = {
			classification: 'uncertain',
			confidence: 'low',
			summary: 'Codex analysis failed to complete.',
			evidence: [ `See ${ stdoutPath } and ${ stderrPath }.` ],
			recommendedRunnerAction: 'stop-for-manual-triage',
			harnessChangesApplied: false,
			changedFiles: [],
			validationSummary:
				'No validation because Codex did not finish successfully.',
		};
	}

	return {
		ok: codexResult.ok,
		durationMs: codexResult.durationMs,
		stdoutPath,
		stderrPath,
		resultPath,
		result,
	};
}

async function main() {
	await fs.mkdir( OUTPUT_DIR, { recursive: true } );
	runnerLogPath = path.join( OUTPUT_DIR, 'runner.log' );
	summaryLogPath = path.join( OUTPUT_DIR, 'summary.ndjson' );
	statePath = path.join( OUTPUT_DIR, 'state.json' );
	await updateState();

	await log(
		`RTC browser fuzz runner started with lane=${ LANE_LABEL }, outputDir=${ OUTPUT_DIR }, startSeed=${ START_SEED }, seedStride=${ SEED_STRIDE }, durationHours=${ DURATION_HOURS }.`
	);

	await ensureFileExists( path.join( REPO_ROOT, 'package.json' ) );
	await ensureWpEnvRunning();

	const startupHealth = await runEnvironmentHealthCheck( 'startup' );
	if ( ! startupHealth.ok ) {
		await stopForInfraFailure( {
			stage: 'startup-health',
			result: startupHealth,
		} );
		throw new Error(
			`Startup health check failed. See ${ startupHealth.logPath }.`
		);
	}

	const startupPreflight = await runFullPreflight( 'startup' );
	if ( ! startupPreflight.ok ) {
		await stopForInfraFailure( {
			stage: 'startup-preflight',
			result: startupPreflight,
		} );
		throw new Error(
			`Startup preflight failed. See ${ startupPreflight.logPath }.`
		);
	}

	let seed = START_SEED;
	let lastFullPreflightSeed = START_SEED;
	let lastHealthCheckSeed = START_SEED - HEALTH_CHECK_INTERVAL_SEEDS;
	let forceFullPreflight = false;

	while ( Date.now() < END_AT ) {
		await updateState( {
			currentSeed: seed,
			nextSeed: seed,
		} );

		await ensureFileExists( path.join( REPO_ROOT, SPEC_PATH ) );

		if (
			seed === START_SEED ||
			seed - lastHealthCheckSeed >= HEALTH_CHECK_INTERVAL_SEEDS
		) {
			const health = await runEnvironmentHealthCheck( `seed-${ seed }` );
			if ( ! health.ok ) {
				await stopForInfraFailure( {
					seed,
					stage: 'health',
					result: health,
				} );
				break;
			}

			lastHealthCheckSeed = seed;
		}

		if (
			forceFullPreflight ||
			seed === START_SEED ||
			seed - lastFullPreflightSeed >= FULL_PREFLIGHT_INTERVAL_SEEDS
		) {
			const preflight = await runFullPreflight( `seed-${ seed }` );
			if ( ! preflight.ok ) {
				await stopForInfraFailure( {
					seed,
					stage: 'preflight',
					result: preflight,
				} );
				break;
			}

			lastFullPreflightSeed = seed;
			forceFullPreflight = false;
		}

		await log( `Running browser fuzz seed ${ seed }.` );
		const attempts = [
			await runSeedAttempt( seed, 'primary', CONVERGENCE_TIMEOUT_MS ),
		];
		await appendSummary( {
			kind: 'attempt',
			...attempts[ 0 ],
		} );

		if ( attempts[ 0 ].ok ) {
			seed += SEED_STRIDE;
			await updateState( {
				successes: state.successes + 1,
				nextSeed: seed,
			} );
			continue;
		}

		await log(
			`Seed ${ seed } failed; starting deeper analysis. Log: ${ attempts[ 0 ].logPath }`
		);

		for ( let index = 0; index < ANALYSIS_RECHECKS; index++ ) {
			const label =
				index === 0
					? 'analysis-1-isolated-recheck'
					: `analysis-${ index + 1 }-deeper-recheck`;
			const timeoutFactor = index === ANALYSIS_RECHECKS - 1 ? 2 : 1;
			await log( `Rechecking failing seed ${ seed } (${ label }).` );
			attempts.push(
				await runSeedAttempt(
					seed,
					label,
					CONVERGENCE_TIMEOUT_MS * timeoutFactor
				)
			);
		}

		const failureSnippet = extractFailureSnippet( attempts[ 0 ].output );
		const localClassification = classifyLocalFailure( failureSnippet );
		const reproducibility = classifyReproducibility( attempts );
		const codexAnalysis = await runCodexFailureAnalysis( {
			seed,
			attempts,
			localClassification,
			failureSnippet,
		} );

		let postAnalysisPreflight = null;
		if ( codexAnalysis.result.harnessChangesApplied ) {
			postAnalysisPreflight = await runFullPreflight(
				`seed-${ seed }-post-codex`
			);
			forceFullPreflight = true;
		}

		const kind = mapAnalysisKind(
			codexAnalysis.result,
			localClassification
		);
		const summaryRecord = {
			kind,
			seed,
			discoveredAt: new Date().toISOString(),
			reproducibility,
			localClassification,
			failureSnippet,
			attempts: attempts.map( ( { output, ...attempt } ) => attempt ),
			codex: {
				ok: codexAnalysis.ok,
				durationMs: codexAnalysis.durationMs,
				resultPath: codexAnalysis.resultPath,
				stdoutPath: codexAnalysis.stdoutPath,
				stderrPath: codexAnalysis.stderrPath,
				result: codexAnalysis.result,
			},
			postAnalysisPreflight: postAnalysisPreflight
				? {
						ok: postAnalysisPreflight.ok,
						logPath: postAnalysisPreflight.logPath,
				  }
				: null,
		};
		await appendSummary( summaryRecord );

		if ( kind === 'real-bug' ) {
			await updateState( {
				realBugs: state.realBugs + 1,
			} );
		} else if ( kind === 'not-real' ) {
			await updateState( {
				notRealFailures: state.notRealFailures + 1,
			} );
		} else if ( kind === 'infra' ) {
			await updateState( {
				infraFailures: state.infraFailures + 1,
			} );
		} else {
			await updateState( {
				uncertainFailures: state.uncertainFailures + 1,
			} );
		}

		await log(
			`Seed ${ seed } classified as ${ kind } (${ codexAnalysis.result.classification }) on ${ LANE_LABEL }.`
		);

		if (
			codexAnalysis.result.recommendedRunnerAction ===
			'stop-for-manual-triage'
		) {
			await updateState( {
				stopReason: `seed-${ seed }-codex-requested-stop`,
			} );
			break;
		}

		if ( postAnalysisPreflight && ! postAnalysisPreflight.ok ) {
			await updateState( {
				stopReason: `seed-${ seed }-post-codex-preflight-failed`,
			} );
			await log(
				`Stopping after Codex-applied harness changes failed preflight for seed ${ seed }.`
			);
			break;
		}

		seed += SEED_STRIDE;
		await updateState( {
			nextSeed: seed,
		} );
	}

	await updateState( {
		currentSeed: null,
		nextSeed: seed,
		stopReason: state.stopReason ?? 'duration-elapsed',
	} );
	await log(
		`RTC browser fuzz runner exiting. stopReason=${ state.stopReason }.`
	);
}

main().catch( async ( error ) => {
	if ( statePath ) {
		try {
			await updateState( {
				currentSeed: null,
				stopReason: `runner-error: ${ error.message }`,
			} );
		} catch {}
	}

	if ( runnerLogPath ) {
		try {
			await log( `Runner failed: ${ error.stack ?? error.message }` );
		} catch {}
	}

	process.exitCode = 1;
} );
