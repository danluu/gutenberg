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
const LANE_LABEL = process.env.RTC_FUZZ_LANE_LABEL ?? `seed-${ START_SEED }`;
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;

const state = {
	startedAt: new Date().toISOString(),
	laneLabel: LANE_LABEL,
	outputDir: OUTPUT_DIR,
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
		env: getSharedEnv( {
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
		} ),
		logPath: preflightLogPath,
		timeoutMs: 2 * 60 * 1000,
	} );
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
	return getSharedEnv( {
		WP_ARTIFACTS_PATH: artifactsDir,
		GUTENBERG_RTC_BROWSER_SEED_START: String( seed ),
		GUTENBERG_RTC_BROWSER_SEED_COUNT: '1',
		GUTENBERG_RTC_BROWSER_STEPS: String( STEP_COUNT ),
		GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS:
			String( convergenceTimeoutMs ),
		GUTENBERG_RTC_LANE_LABEL: LANE_LABEL,
	} );
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

	return {
		seed,
		label,
		code: commandResult.code,
		signal: commandResult.signal,
		ok: commandResult.ok,
		timedOut: commandResult.timedOut,
		durationMs: commandResult.durationMs,
		artifactsDir,
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
			'2. If it is not real, modify the fuzzing setup to reduce this false-positive class without suppressing legitimate editor/runtime failures.',
			'3. If you change the harness, validate the fix by rerunning the relevant preflight or the failing seed.',
			'4. Output only JSON that matches the provided schema.',
			'Rules:',
			'- Do not weaken coverage by broad string matching or skipping large classes of failures.',
			'- Prefer preflight validation and explicit infra classification over ignoring failing logs.',
			'- List every changed file relative to the repo root in changedFiles.',
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

	const startupPreflight = await runFullPreflight( 'startup' );
	if ( ! startupPreflight.ok ) {
		const failureSnippet = extractFailureSnippet( startupPreflight.output );
		await appendSummary( {
			kind: 'infra',
			discoveredAt: new Date().toISOString(),
			stage: 'startup-preflight',
			failureSnippet,
			logPath: startupPreflight.logPath,
		} );
		await updateState( {
			infraFailures: state.infraFailures + 1,
			stopReason: 'startup-preflight-failed',
		} );
		throw new Error(
			`Startup preflight failed. See ${ startupPreflight.logPath }.`
		);
	}

	let seed = START_SEED;
	let lastFullPreflightSeed = START_SEED;
	let forceFullPreflight = false;

	while ( Date.now() < END_AT ) {
		await updateState( {
			currentSeed: seed,
			nextSeed: seed,
		} );

		await ensureFileExists( path.join( REPO_ROOT, SPEC_PATH ) );

		if (
			forceFullPreflight ||
			seed === START_SEED ||
			seed - lastFullPreflightSeed >= FULL_PREFLIGHT_INTERVAL_SEEDS
		) {
			const preflight = await runFullPreflight( `seed-${ seed }` );
			if ( ! preflight.ok ) {
				const failureSnippet = extractFailureSnippet(
					preflight.output
				);
				await appendSummary( {
					kind: 'infra',
					discoveredAt: new Date().toISOString(),
					seed,
					stage: 'seed-preflight',
					failureSnippet,
					logPath: preflight.logPath,
				} );
				await updateState( {
					infraFailures: state.infraFailures + 1,
					stopReason: `seed-${ seed }-preflight-failed`,
				} );
				await log(
					`Stopping after preflight failure for seed ${ seed }. See ${ preflight.logPath }.`
				);
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
