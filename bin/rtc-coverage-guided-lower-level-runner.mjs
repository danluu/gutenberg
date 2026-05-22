#!/usr/bin/env node
// @ts-nocheck
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.env.RTC_CG_LOWER_LEVEL_REPO || process.cwd();
const runRoot = process.env.RTC_CG_LOWER_LEVEL_RUN_ROOT;
const groupName =
	process.env.RTC_CG_LOWER_LEVEL_GROUP ||
	'coverage-guided-lower-level-block-parser-serialization';
const builtinTargets = new Map( [
	[
		'coverage-guided-lower-level-block-parser-serialization',
		{
			profile: 'rtc-block-parser-serialization',
			testPath:
				'packages/blocks/src/api/parser/test/rtc-block-parser-serialization.coverage-fuzz.test.js',
			maxInputBytes: 192,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 32,
			maxFailureIsolationsPerRun: 4,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-rich-text-crdt',
		{
			profile: 'rtc-rich-text-crdt',
			testPath:
				'packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js',
			maxInputBytes: 64,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 16,
			maxFailureIsolationsPerRun: Number.MAX_SAFE_INTEGER,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-rich-text-multiblock',
		{
			profile: 'rtc-rich-text-crdt-multiblock',
			testPath:
				'packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js',
			maxInputBytes: 160,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 16,
			maxFailureIsolationsPerRun: Number.MAX_SAFE_INTEGER,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-table-query-array-crdt',
		{
			profile: 'rtc-table-query-array-crdt',
			testPath:
				'packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js',
			maxInputBytes: 64,
			maxCorpusFiles: 10000,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 128,
		},
	],
	[
		'coverage-guided-lower-level-http-polling-manager',
		{
			profile: 'rtc-http-polling-manager',
			testPath:
				'packages/sync/src/providers/http-polling/test/polling-manager.coverage-fuzz.test.ts',
			maxInputBytes: 320,
			maxCorpusFiles: 8000,
			maxMinimizeInputs: 24,
			maxFailureIsolationsPerRun: 4,
			repeatFailureIsolationEvery: 32,
		},
	],
] );
const builtinTarget = builtinTargets.get( groupName );
const testPath =
	process.env.RTC_CG_LOWER_LEVEL_TEST_PATH ||
	builtinTarget?.testPath ||
	'packages/blocks/src/api/parser/test/rtc-block-parser-serialization.coverage-fuzz.test.js';
const fuzzLevel = 'coverage-guided-lower-level';
const profile =
	process.env.RTC_CG_LOWER_LEVEL_PROFILE ||
	builtinTarget?.profile ||
	'rtc-block-parser-serialization';
const transport = 'in-process';
const coverageEngine = 'v8-node-coverage';
const engine = 'v8-node-coverage-guided-mutator';
const nativeIntegration =
	'closest-isolated-coverage-guided-alternative; JS/TS target uses V8 coverage feedback instead of C/C++ AFL/libFuzzer';
const runStarted = process.env.RTC_CG_LOWER_LEVEL_RUN_STARTED || 'manual';
const runId =
	process.env.RTC_CG_LOWER_LEVEL_RUN_ID ||
	path.basename( runRoot || 'manual' );
const sessionName =
	process.env.RTC_CG_LOWER_LEVEL_SESSION || `rtc-${ groupName }`;
const globalCpuAdmissionPath =
	process.env.RTC_GLOBAL_CPU_ADMISSION ||
	'/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-global-cpu-admission.sh';
const batchSize = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_BATCH_SIZE', 'RTC_CG_LOWER_LEVEL_RUNS' ],
	32,
	1,
	1000
);
const maxInputBytes = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES' ],
	builtinTarget?.maxInputBytes ?? 192,
	1,
	4096
);
const maxCorpusFiles = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES' ],
	builtinTarget?.maxCorpusFiles ?? 5000,
	1,
	1000000
);
const sleepSeconds = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_SLEEP_SECONDS' ],
	0,
	0,
	3600
);
const timeoutSeconds = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS' ],
	1200,
	1,
	86400
);
const keepSuccessCoverage =
	process.env.RTC_CG_LOWER_LEVEL_KEEP_SUCCESS_COVERAGE === '1';
const niceLevel = readIntegerEnv( [ 'RTC_CG_LOWER_LEVEL_NICE' ], 19, 0, 19 );
const maxAttempts = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS' ],
	0,
	0,
	Number.MAX_SAFE_INTEGER
);
const minimizeFailures =
	process.env.RTC_CG_LOWER_LEVEL_MINIMIZE_FAILURES !== '0';
const maxMinimizeInputs = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS' ],
	builtinTarget?.maxMinimizeInputs ?? batchSize,
	1,
	1000
);
const maxFailureIsolationsPerRun = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN' ],
	builtinTarget?.maxFailureIsolationsPerRun ?? Number.MAX_SAFE_INTEGER,
	0,
	Number.MAX_SAFE_INTEGER
);
const repeatFailureIsolationEvery = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY' ],
	builtinTarget?.repeatFailureIsolationEvery ?? 0,
	0,
	Number.MAX_SAFE_INTEGER
);
const coverageTargets = coverageTargetsForProfile( profile, testPath );
const executionStrategy = 'direct-node-jest-per-batch';
const mutationEngine = getMutationEngine();

if ( ! runRoot ) {
	console.error( 'RTC_CG_LOWER_LEVEL_RUN_ROOT is required' );
	process.exit( 2 );
}
enforceBuiltinGroupTarget();

const tmpDir =
	process.env.RTC_CG_LOWER_LEVEL_TMPDIR ||
	path.join( runRoot, 'tmp', 'node' );
const npmCacheDir =
	process.env.RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR ||
	process.env.npm_config_cache ||
	path.join( runRoot, 'tmp', 'npm-cache' );
const jestCacheDir =
	process.env.RTC_CG_LOWER_LEVEL_JEST_CACHE_DIR ||
	path.join( runRoot, 'tmp', 'jest-cache' );
const jestConfigPath =
	process.env.RTC_CG_LOWER_LEVEL_JEST_CONFIG || 'test/unit/jest.config.js';
const jestRunnerPath =
	process.env.RTC_CG_LOWER_LEVEL_JEST_RUNNER ||
	'packages/scripts/scripts/test-unit-jest.js';
const runnerArgs = [
	jestRunnerPath,
	'--config',
	jestConfigPath,
	testPath,
	'--runInBand',
	'--ci',
	`--cacheDirectory=${ jestCacheDir }`,
];
const runnerCommand = `nice -n ${ niceLevel } timeout ${ timeoutSeconds }s node ${ runnerArgs.join(
	' '
) }`;
const targetPreflight = verifyTargetPreflight();

const dirs = {
	corpus: path.join( runRoot, 'corpus' ),
	queue: path.join( runRoot, 'corpus', 'queue' ),
	crashes: path.join( runRoot, 'corpus', 'crashes' ),
	harnessFailures: path.join( runRoot, 'harness-failures' ),
	coverage: path.join( runRoot, 'coverage' ),
	logs: path.join( runRoot, 'logs' ),
	work: path.join( runRoot, 'work' ),
	tmp: path.join( runRoot, 'tmp' ),
	nodeTmp: tmpDir,
	npmCache: npmCacheDir,
	jestCache: jestCacheDir,
	lane: path.join(
		runRoot,
		`${ groupName }-gen-0-${ runStarted }`,
		'lane-0'
	),
};
const statusPath = path.join( runRoot, 'status.tsv' );
const eventsPath = path.join( dirs.lane, 'events.ndjson' );
const rootEventsPath = path.join( runRoot, 'events.ndjson' );
const statePath = path.join( dirs.coverage, 'coverage-state.json' );
const supervisorGroupsPath = path.join( runRoot, 'supervisor-groups.json' );

for ( const dir of Object.values( dirs ) ) {
	fs.mkdirSync( dir, { recursive: true } );
}
touch( statusPath );
touch( eventsPath );
touch( rootEventsPath );
seedCorpus();
writeSupervisorGroups();
appendEvent( {
	kind: 'run-start',
	label: 'primary',
	runRoot,
	corpusDir: dirs.queue,
	crashDir: dirs.crashes,
	harnessFailureDir: dirs.harnessFailures,
	coverageDir: dirs.coverage,
	logDir: dirs.logs,
	batchSize,
	maxInputBytes,
	maxCorpusFiles,
	timeoutSeconds,
	sleepSeconds,
	nice: niceLevel,
	globalCpuAdmissionClass: 'lower-level',
	globalCpuAdmissionLabel: sessionName,
	globalCpuAdmissionPath,
	tmpDir,
	npmCacheDir,
	jestCacheDir,
	jestConfigPath,
	runnerCommand,
	executionStrategy,
	targetPreflight,
	startupAmortizationInputs: batchSize,
	semanticFeatureFeedback: true,
	failureIsolation: minimizeFailures,
	maxMinimizeInputs,
	maxFailureIsolationsPerRun,
	repeatFailureIsolationEvery,
	mutationEngine,
} );

let coverageState = readCoverageState();
const failureIsolationHistory = readFailureIsolationHistory();
let attempt = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_ATTEMPT_START', 'RTC_CG_LOWER_LEVEL_SEED_START' ],
	0,
	0,
	Number.MAX_SAFE_INTEGER
);
let attemptsRun = 0;
let cumulativeTestExecutionCount = 0;
let priorityCorpusSignature = '';
let priorityCorpusFiles = null;

while ( true ) {
	waitForGlobalCpuBudget();

	const started = Date.now();
	const stamp = new Date().toISOString().replace( /[-:.]/g, '' );
	const batch = makeBatch( attempt );
	const inputPath = path.join(
		dirs.work,
		`input-${ stamp }-${ attempt }.json`
	);
	const featurePath = path.join(
		dirs.work,
		`features-${ stamp }-${ attempt }.json`
	);
	const coverageDir = path.join(
		dirs.work,
		`v8-coverage-${ stamp }-${ attempt }`
	);
	const logPath = path.join(
		dirs.logs,
		`${ groupName }-${ stamp }-attempt-${ attempt }.log`
	);

	fs.mkdirSync( coverageDir, { recursive: true } );
	fs.writeFileSync(
		inputPath,
		`${ JSON.stringify(
			batch.map( ( input ) => input.toString( 'base64' ) )
		) }\n`
	);

	appendEvent( {
		kind: 'seed-attempt-start',
		label: 'primary',
		attempt,
		inputCount: batch.length,
		inputPath,
		featurePath,
		coverageDir,
		logPath,
	} );

	const result = spawnSync(
		'nice',
		[
			'-n',
			String( niceLevel ),
			'timeout',
			`${ timeoutSeconds }s`,
			'node',
			...runnerArgs,
		],
		{
			cwd: repo,
			env: {
				...process.env,
				CI: '1',
				TMPDIR: tmpDir,
				npm_config_cache: npmCacheDir,
				RTC_CG_LOWER_LEVEL_TMPDIR: tmpDir,
				RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR: npmCacheDir,
				RTC_CG_LOWER_LEVEL_JEST_CACHE_DIR: jestCacheDir,
				RTC_FUZZ_ONLY_ASSERTIONS: '1',
				RTC_FUZZ_ASSERTIONS: '1',
				NODE_V8_COVERAGE: coverageDir,
				GUTENBERG_RTC_CG_INPUT_FILE: inputPath,
				GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE: inputPath,
				GUTENBERG_RTC_CG_FEATURE_FILE: featurePath,
			},
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
		}
	);
	const executionDurationMs = Date.now() - started;
	const exitCode = getSpawnExitCode( result );

	fs.writeFileSync(
		logPath,
		[
			`command=${ runnerCommand }`,
			`input=${ inputPath }`,
			`features=${ featurePath }`,
			`coverage=${ coverageDir }`,
			`exit=${ exitCode }`,
			'',
			'--- stdout ---',
			result.stdout || '',
			'--- stderr ---',
			result.stderr || '',
		].join( '\n' )
	);

	const coverageKeys = collectCoverageKeys( coverageDir );
	const newCoverageKeys = coverageKeys.filter(
		( key ) => ! coverageState.keys.includes( key )
	);
	const featureKeys = readFeatureKeys( featurePath );
	const newFeatureKeys = featureKeys.filter(
		( key ) => ! coverageState.featureKeys.includes( key )
	);
	const canaryRelevantNewFeatureKeys = isHttpPollingTarget()
		? newFeatureKeys.filter( isHttpPollingCanaryRelevantFeature )
		: newFeatureKeys;
	const admittedNewFeatureKeys = isHttpPollingTarget()
		? canaryRelevantNewFeatureKeys
		: newFeatureKeys;
	const featureCorpusAdmission =
		admittedNewFeatureKeys.length > 0;
	const coverageCanaryFailure =
		exitCode === 0 && coverageKeys.length === 0
			? {
					kind: 'harness-bootstrap',
					summary:
						'RTC_CG_LOWER_LEVEL_ZERO_COVERAGE_CANARY: no target V8 coverage keys collected',
			  }
			: null;
	const effectiveExitCode = coverageCanaryFailure ? 66 : exitCode;
	const failure =
		coverageCanaryFailure ||
		classifyFailure( exitCode, result.stdout || '', result.stderr || '' );
	const failureCanonicalKey = canonicalFailureKey( failure );
	const newFailureKey =
		failure?.kind === 'oracle-failure' &&
		failureCanonicalKey &&
		! coverageState.failureKeys.includes( failureCanonicalKey );

	if (
		newCoverageKeys.length > 0 ||
		admittedNewFeatureKeys.length > 0 ||
		newFailureKey
	) {
		coverageState = {
			keys: [
				...new Set( [ ...coverageState.keys, ...coverageKeys ] ),
			].sort(),
			featureKeys: [
				...new Set( [
					...coverageState.featureKeys,
					...admittedNewFeatureKeys,
				] ),
			].sort(),
			failureKeys: [
				...new Set( [
					...coverageState.failureKeys,
					...( newFailureKey ? [ failureCanonicalKey ] : [] ),
				] ),
			].sort(),
			updatedAt: new Date().toISOString(),
		};
		writeCoverageState( coverageState );
		if (
			newCoverageKeys.length > 0 ||
			featureCorpusAdmission ||
			newFailureKey
		) {
			saveCorpusInputs(
				batch,
				getCorpusSavePrefix(
					attempt,
					newCoverageKeys.length,
					featureCorpusAdmission
						? canaryRelevantNewFeatureKeys.length
						: 0
				)
			);
		}
	}

	const minimization =
		effectiveExitCode !== 0
			? isolateFailureInputs( batch, attempt, failure )
			: null;
	const failureDetails =
		effectiveExitCode !== 0
			? saveFailureInputs(
					batch,
					attempt,
					logPath,
					failure,
					minimization
			  )
			: null;
	const failureArtifactDir = failureDetails?.dir ?? null;
	const crashDir = dirs.crashes;
	const harnessFailureDir = dirs.harnessFailures;
	const coverageRetained =
		effectiveExitCode !== 0 ||
		keepSuccessCoverage ||
		! removeCoverageDir( coverageDir );
	const durationMs = Date.now() - started;
	cumulativeTestExecutionCount += batch.length;

	const event = {
		kind: 'seed-attempt-complete',
		label: 'primary',
		ok: effectiveExitCode === 0,
		exitCode: effectiveExitCode,
		rawExitCode: exitCode,
		attempt,
		inputCount: batch.length,
		testExecutionCount: batch.length,
		cumulativeTestExecutionCount,
		runnerCommand,
		executionStrategy,
		startupAmortizationInputs: batch.length,
		inputPath,
		featurePath,
		logPath,
		coverageDir,
		coverageRetained,
		crashDir,
		harnessFailureDir,
		failureArtifactDir,
		failureKind: failure?.kind ?? null,
		failureSummary: failure?.summary ?? null,
		failureCanonicalKey,
		newFailureKey: Boolean( newFailureKey ),
		minimizeFailures,
		maxMinimizeInputs,
		minimizedFailureInputCount:
			failureDetails?.minimizedFailureInputCount ?? null,
		minimizedFailureIndexes: failureDetails?.minimizedFailureIndexes ?? [],
		failureIsolationCheckedInputCount:
			failureDetails?.failureIsolationCheckedInputCount ?? null,
		failureIsolationReason: minimization?.reason ?? null,
		failureIsolationTruncated:
			failureDetails?.failureIsolationTruncated ?? false,
		failureIsolationAttempted:
			failureDetails?.failureIsolationAttempted ?? false,
		coverageKeys: coverageKeys.length,
		coverageCanaryOk: coverageKeys.length > 0,
		newCoverageKeys: newCoverageKeys.length,
		featureKeys: featureKeys.length,
		newFeatureKeys: newFeatureKeys.length,
		admittedNewFeatureKeys: admittedNewFeatureKeys.length,
		canaryRelevantNewFeatureKeys: canaryRelevantNewFeatureKeys.length,
		featureCorpusAdmission,
		productYield:
			newCoverageKeys.length > 0 ||
			admittedNewFeatureKeys.length > 0 ||
			Boolean( newFailureKey ),
		corpusSize: corpusFiles().length,
		executionDurationMs,
		durationMs,
		actionProfile: profile,
	};
	appendEvent( event );
	fs.appendFileSync(
		statusPath,
		[
			new Date().toISOString().replace( '.000', '' ),
			`attempt=${ attempt }`,
			`inputs=${ batch.length }`,
			`coverage_keys=${ coverageKeys.length }`,
			`new_coverage_keys=${ newCoverageKeys.length }`,
			`feature_keys=${ featureKeys.length }`,
			`new_feature_keys=${ newFeatureKeys.length }`,
			`admitted_new_feature_keys=${ admittedNewFeatureKeys.length }`,
			`corpus=${ event.corpusSize }`,
			`exit=${ effectiveExitCode }`,
			`raw_exit=${ exitCode }`,
			`log=${ logPath }`,
		].join( '\t' ) + '\n'
	);

	attempt++;
	attemptsRun++;

	if ( maxAttempts > 0 && attemptsRun >= maxAttempts ) {
		break;
	}

	if ( sleepSeconds > 0 ) {
		spawnSync( 'sleep', [ String( sleepSeconds ) ] );
	}
}

appendEvent( {
	kind: 'runner-stop',
	label: 'primary',
	stopReason:
		maxAttempts > 0 && attemptsRun >= maxAttempts
			? 'max-attempts'
			: 'loop-exit',
	maxAttempts,
	attemptsRun,
	nextAttempt: attempt,
	cumulativeTestExecutionCount,
	corpusSize: corpusFiles().length,
	statusPath,
	coverageStatePath: statePath,
} );

function readIntegerEnv( names, defaultValue, minimum, maximum ) {
	for ( const name of names ) {
		const rawValue = process.env[ name ];

		if ( rawValue === undefined || rawValue === '' ) {
			continue;
		}

		const value = Number.parseInt( rawValue, 10 );

		if ( Number.isInteger( value ) ) {
			return Math.max( minimum, Math.min( maximum, value ) );
		}
	}

	return defaultValue;
}

function touch( filePath ) {
	fs.closeSync( fs.openSync( filePath, 'a' ) );
}

function waitForGlobalCpuBudget() {
	if ( process.env.RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION === '1' ) {
		return;
	}
	if (
		! globalCpuAdmissionPath ||
		! fs.existsSync( globalCpuAdmissionPath )
	) {
		return;
	}

	const result = spawnSync(
		globalCpuAdmissionPath,
		[ 'wait', 'lower-level', sessionName ],
		{
			cwd: repo,
			env: process.env,
			stdio: 'inherit',
		}
	);

	if ( result.error || result.status !== 0 ) {
		appendEvent( {
			kind: 'global-cpu-admission-error',
			label: 'primary',
			admissionPath: globalCpuAdmissionPath,
			admissionClass: 'lower-level',
			admissionLabel: sessionName,
			error: result.error?.message ?? null,
			status: result.status ?? null,
			signal: result.signal ?? null,
		} );
	}
}

function enforceBuiltinGroupTarget() {
	const customTargetAllowed =
		process.env.RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET === '1';

	if ( ! builtinTarget ) {
		if (
			! customTargetAllowed &&
			groupName.startsWith( 'coverage-guided-lower-level-' )
		) {
			console.error(
				`unsupported built-in coverage-guided lower-level group: ${ groupName }; promoted built-ins: ${ [
					...builtinTargets.keys(),
				].join(
					', '
				) }; set RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET=1 with explicit profile/test path to override`
			);
			process.exit( 2 );
		}

		return;
	}

	if ( customTargetAllowed ) {
		return;
	}

	if ( profile !== builtinTarget.profile ) {
		console.error(
			`refusing mismatched profile for ${ groupName }: got ${ profile }, expected ${ builtinTarget.profile }; set RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET=1 to override`
		);
		process.exit( 2 );
	}

	if ( testPath !== builtinTarget.testPath ) {
		console.error(
			`refusing mismatched test path for ${ groupName }: got ${ testPath }, expected ${ builtinTarget.testPath }; set RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET=1 to override`
		);
		process.exit( 2 );
	}
}

function verifyTargetPreflight() {
	const checks = [];
	const requiredPaths = [ testPath, jestConfigPath, jestRunnerPath ];

	if ( isParserTarget() ) {
		requiredPaths.push(
			'packages/block-serialization-default-parser/src/index.ts',
			'packages/block-serialization-spec-parser/parser.js'
		);
	}

	for ( const relativePath of requiredPaths ) {
		const absolutePath = path.resolve( repo, relativePath );

		if ( ! isInsideRepo( absolutePath ) ) {
			failPreflight(
				`target preflight path escapes repo: ${ relativePath } -> ${ absolutePath }`
			);
		}

		if ( ! fs.existsSync( absolutePath ) ) {
			if (
				relativePath ===
				'packages/block-serialization-spec-parser/parser.js'
			) {
				failPreflight(
					`target preflight file is missing: ${ relativePath }; generate it with npm run --workspace @wordpress/block-serialization-spec-parser build:js`
				);
			}

			failPreflight(
				`target preflight file is missing: ${ relativePath }`
			);
		}

		checks.push( {
			path: relativePath,
			absolutePath,
			exists: true,
		} );
	}

	if ( isParserTarget() ) {
		const testSource = fs.readFileSync(
			path.resolve( repo, testPath ),
			'utf8'
		);

		if (
			testSource.includes( '@wordpress/block-serialization-spec-parser' )
		) {
			failPreflight(
				`${ testPath } must import packages/block-serialization-spec-parser/parser.js directly; @wordpress/block-serialization-spec-parser resolves through shared node_modules in this checkout`
			);
		}

		checks.push( {
			check: 'parser-spec-import',
			source: testPath,
			localPath: 'packages/block-serialization-spec-parser/parser.js',
			ok: true,
		} );
	}

	return {
		ok: true,
		repo,
		checks,
	};
}

function isInsideRepo( absolutePath ) {
	const repoPath = path.resolve( repo );
	const relativePath = path.relative( repoPath, absolutePath );

	return relativePath === '' || ! relativePath.startsWith( '..' );
}

function failPreflight( message ) {
	console.error(
		`coverage-guided lower-level preflight failed: ${ message }`
	);
	process.exit( 2 );
}

function getMutationEngine() {
	if ( isParserTarget() ) {
		return 'parser-dictionary-byte-mutator';
	}

	if ( isRichTextCrdtTarget() ) {
		return 'rich-text-crdt-dictionary-byte-mutator';
	}

	if ( isHttpPollingTarget() ) {
		return 'http-polling-state-machine-byte-mutator';
	}

	return 'byte-mutator';
}

function getCorpusSavePrefix(
	attemptIndex,
	newCoverageKeyCount,
	newFeatureKeyCount
) {
	if ( newCoverageKeyCount > 0 ) {
		return `cov-${ attemptIndex }`;
	}

	if ( newFeatureKeyCount > 0 ) {
		return `feature-${ attemptIndex }`;
	}

	return `failure-key-${ attemptIndex }`;
}

function getSpawnExitCode( result ) {
	if ( typeof result.status === 'number' ) {
		return result.status;
	}

	if ( result.signal ) {
		return 128;
	}

	return 1;
}

function writeSupervisorGroups() {
	const groups = [
		{
			schemaVersion: 1,
			version: 1,
			name: groupName,
			runId,
			fuzzLevel,
			transport,
			engine,
			coverageEngine,
			profile,
			target: testPath,
			testPath,
			lanes: 1,
			stepCount: batchSize,
			batchSize,
			maxInputBytes,
			maxCorpusFiles,
			timeoutSeconds,
			sleepSeconds,
			nice: niceLevel,
			globalCpuAdmissionClass: 'lower-level',
			globalCpuAdmissionLabel: sessionName,
			globalCpuAdmissionPath,
			tmpDir,
			npmCacheDir,
			jestCacheDir,
			jestConfigPath,
			runnerCommand,
			executionStrategy,
			targetPreflight,
			corpusFeedback: true,
			semanticFeatureFeedback: true,
			repoRoot: repo,
			runRoot,
			corpusDir: dirs.queue,
			crashDir: dirs.crashes,
			harnessFailureDir: dirs.harnessFailures,
			coverageDir: dirs.coverage,
			logDir: dirs.logs,
			artifactDir: dirs.crashes,
			coverageTargets,
			failureIsolation: minimizeFailures,
			maxMinimizeInputs,
			maxFailureIsolationsPerRun,
			repeatFailureIsolationEvery,
			mutationEngine,
			nativeIntegration,
		},
	];

	fs.writeFileSync(
		supervisorGroupsPath,
		`${ JSON.stringify( groups, null, 2 ) }\n`
	);
}

function appendEvent( event ) {
	const serializedEvent = `${ JSON.stringify( {
		schemaVersion: 1,
		version: 1,
		kind: event.kind,
		at: event.at || new Date().toISOString(),
		group: groupName,
		groupName,
		runId,
		fuzzLevel,
		transport,
		engine,
		coverageEngine,
		nativeIntegration,
		target: testPath,
		profile,
		actionProfile: profile,
		...event,
	} ) }\n`;

	fs.mkdirSync( path.dirname( eventsPath ), { recursive: true } );
	fs.mkdirSync( path.dirname( rootEventsPath ), { recursive: true } );
	fs.appendFileSync( eventsPath, serializedEvent );
	fs.appendFileSync( rootEventsPath, serializedEvent );
}

function seedCorpus() {
	const existingInputHashes = new Set(
		corpusFiles().map( ( filePath ) =>
			hashInput( fs.readFileSync( filePath ) )
		)
	);

	for ( const [ index, seed ] of initialCorpusSeeds().entries() ) {
		const hash = hashInput( seed );

		if ( existingInputHashes.has( hash ) ) {
			continue;
		}
		if ( corpusFiles().length >= maxCorpusFiles ) {
			return;
		}

		fs.writeFileSync(
			path.join(
				dirs.queue,
				`seed-${ String( index ).padStart( 3, '0' ) }-${ hash.slice(
					0,
					16
				) }.bin`
			),
			seed
		);
		existingInputHashes.add( hash );
	}
}

function initialCorpusSeeds() {
	if (
		profile.includes( 'parser' ) ||
		testPath.includes( 'parser' ) ||
		testPath.includes( 'serialization' )
	) {
		return [
			Buffer.from(
				'<!-- wp:paragraph --><p>A</p><!-- /wp:paragraph -->'
			),
			Buffer.from( '<!-- wp:html -->&copy;&nbsp;<br><!-- /wp:html -->' ),
			Buffer.from(
				'<!-- wp:paragraph {"content":"copy &copy reg &reg nbsp &nbsp done"} --><p>&copy &#xA9 &#169 &notin &nbsp</p><!-- /wp:paragraph -->'
			),
			Buffer.from(
				'<!-- wp:test-block {"href":"https://example.test/entity?copy=&copy&semi=&copy;&hex=&#xA9&dec=&#169","title":"copy &copy reg &reg nbsp &nbsp done"} /-->'
			),
			Buffer.from(
				'<!-- wp:group --><!-- wp:paragraph /--><!-- /wp:group -->'
			),
			Buffer.from( '<!-- wp:test-block {"fruit":"Banana"} /-->' ),
			Buffer.from( 'freeform <!-- not-a-block --> &amp; text' ),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
	}

	if (
		profile.includes( 'query-array' ) ||
		profile.includes( 'table' ) ||
		testPath.includes( 'query-array' ) ||
		testPath.includes( 'table' )
	) {
		return [
			Buffer.from( 'table-query-array-remote-cell-edit' ),
			Buffer.from( 'table-query-array-append-row' ),
			Buffer.from( 'table-query-array-prepend-row' ),
			Buffer.from( 'table-query-array-delete-row' ),
			Buffer.from( 'table-query-array-insert-cell' ),
			Buffer.from( 'table-query-array-delete-cell' ),
			Buffer.from( 'table-query-array-reorder-row' ),
			Buffer.from( 'table-query-array-reorder-cell' ),
			Buffer.from( 'stale-local-table-snapshot' ),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
	}

	if ( isHttpPollingTarget() ) {
		return [
			Buffer.from( 'http-polling-normal-overflow-rotation' ),
			Buffer.from( 'http-polling-transient-preserve-updates' ),
			Buffer.from( 'http-polling-forbidden-specific-room' ),
			Buffer.from( 'http-polling-body-too-large-retry' ),
			Buffer.from( 'http-polling-cursor-regression-diagnostic' ),
			Buffer.from( 'http-polling-nonadvancing-cursor-diagnostic' ),
			Buffer.from( 'http-polling-missing-update-room-diagnostic' ),
			Buffer.from( 'http-polling-duplicate-response-room-diagnostic' ),
			Buffer.from( 'http-polling-duplicate-update-delivery-diagnostic' ),
			Buffer.from( 'http-polling-incoming-apply-failure-diagnostic' ),
			Buffer.from( 'http-polling-duplicate-active-room-diagnostic' ),
			Buffer.from( 'http-polling-invalid-compaction-update-diagnostic' ),
			Buffer.from( 'http-polling-pagehide-disconnect-diagnostic' ),
			Buffer.from( 'http-polling-stale-since-token-replay-diagnostic' ),
			Buffer.from( 'http-polling-server-update-union-diagnostic' ),
			Buffer.from(
				'http-polling-pagehide-disconnect-rooms-18-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-server-update-union-rooms-10-updates-6-peers-12-steps-14-visibility-retry-now'
			),
			Buffer.from(
				'http-polling-canary-title-reload-http-server-update-union-rooms-6-updates-4-peers-6-steps-12-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-existing-post-crdt-http-server-update-union-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-restore-state-storage-http-stale-since-token-replay-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-large-http-lifecycle-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-stale-since-token-replay-rooms-12-updates-6-peers-16-steps-14-disconnect-reconnect'
			),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
	}

	return [
		Buffer.from( 'rich-text-crdt-merge' ),
		Buffer.from( 'formatted-cursor-path' ),
		Buffer.from( 'old-html-update-new-html' ),
		Buffer.from( 'entity-&-cursor-delta' ),
		Buffer.from( '<strong>a</strong>&nbsp;b' ),
		Buffer.from( '<a href=x>a&amp;b</a>' ),
		Buffer.from( '<code>&copy</code><em>z</em>' ),
		Buffer.from( 'cursor<em>&notin;</em>end' ),
		Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
		Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
	];
}

function coverageTargetsForProfile( actionProfile, targetPath ) {
	if (
		actionProfile.includes( 'http-polling' ) ||
		targetPath.includes( 'http-polling' ) ||
		targetPath.includes( 'polling-manager' )
	) {
		return [
			'packages/sync/src/providers/http-polling/polling-manager.ts',
			'packages/sync/src/providers/http-polling/config.ts',
			'packages/sync/src/providers/http-polling/types.ts',
			'packages/sync/src/providers/http-polling/utils.ts',
		];
	}

	if (
		actionProfile.includes( 'parser' ) ||
		targetPath.includes( 'parser' ) ||
		targetPath.includes( 'serialization' )
	) {
		return [
			'packages/blocks/src/api/parser/index.ts',
			'packages/blocks/src/api/parser/serialize-raw-block.ts',
			'packages/blocks/src/api/serializer.tsx',
			'packages/blocks/src/api/validation/index.ts',
			'packages/block-serialization-default-parser/src/index.ts',
			'packages/block-serialization-spec-parser/parser.js',
			'packages/html-entities/src/index.ts',
		];
	}

	return [
		'packages/core-data/src/utils/crdt.ts',
		'packages/core-data/src/utils/crdt-blocks.ts',
		'packages/core-data/src/utils/crdt-text.ts',
		'packages/core-data/src/utils/crdt-utils.ts',
		'packages/rich-text/src/create.js',
		'packages/rich-text/src/get-text-content.js',
		'packages/rich-text/src/special-characters.js',
		'packages/rich-text/src/to-html-string.js',
		'packages/rich-text/src/to-tree.js',
		'packages/sync/src/quill-delta/Delta.ts',
	];
}

function readCoverageState() {
	try {
		const parsed = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
		return {
			keys: Array.isArray( parsed.keys ) ? parsed.keys : [],
			featureKeys: Array.isArray( parsed.featureKeys )
				? parsed.featureKeys
				: [],
			failureKeys: Array.isArray( parsed.failureKeys )
				? parsed.failureKeys
				: [],
			updatedAt: parsed.updatedAt || null,
		};
	} catch {
		return { keys: [], featureKeys: [], failureKeys: [], updatedAt: null };
	}
}

function readFailureIsolationHistory() {
	const history = new Map();

	try {
		const lines = fs
			.readFileSync( rootEventsPath, 'utf8' )
			.split( /\r?\n/ );

		for ( const line of lines ) {
			if ( ! line.trim() ) {
				continue;
			}

			let event;
			try {
				event = JSON.parse( line );
			} catch {
				continue;
			}

			if (
				event.kind !== 'seed-attempt-complete' ||
				! event.failureCanonicalKey
			) {
				continue;
			}

			const key = String( event.failureCanonicalKey );
			const record = history.get( key ) || { seen: 0, isolated: 0 };
			record.seen++;
			if ( event.failureIsolationAttempted ) {
				record.isolated++;
			}
			history.set( key, record );
		}
	} catch {}

	return history;
}

function writeCoverageState( state ) {
	fs.writeFileSync( statePath, `${ JSON.stringify( state, null, 2 ) }\n` );
}

function corpusFiles() {
	try {
		return fs
			.readdirSync( dirs.queue )
			.filter( ( name ) => name.endsWith( '.bin' ) )
			.map( ( name ) => path.join( dirs.queue, name ) )
			.sort();
	} catch {
		return [];
	}
}

function prioritizedCorpusFiles( files ) {
	if ( ! isHttpPollingTarget() || files.length === 0 ) {
		return files;
	}

	const signature = `${ files.length }:${ files[ 0 ] }:${
		files[ files.length - 1 ]
	}`;
	if ( priorityCorpusFiles && priorityCorpusSignature === signature ) {
		return priorityCorpusFiles;
	}

	const priority = [];
	const rest = [];
	for ( const filePath of files ) {
		let isCanaryBridgeSeed = false;
		try {
			const text = fs.readFileSync( filePath, 'utf8' ).toLowerCase();
			isCanaryBridgeSeed =
				text.includes( 'canary-title-reload-http' ) ||
				text.includes( 'canary-existing-post-crdt-http' ) ||
				text.includes( 'canary-restore-state-storage-http' ) ||
				text.includes( 'canary-large-http-lifecycle' );
		} catch {}

		if ( isCanaryBridgeSeed ) {
			priority.push( filePath );
		} else {
			rest.push( filePath );
		}
	}

	priorityCorpusSignature = signature;
	priorityCorpusFiles = [ ...priority, ...rest ];
	return priorityCorpusFiles;
}

function makeBatch( attemptIndex ) {
	const files = prioritizedCorpusFiles( corpusFiles() );

	if ( isHttpPollingTarget() ) {
		return makeHttpPollingBatch( files, attemptIndex );
	}

	const batch = [];

	for ( let index = 0; index < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];
		const input = fs.readFileSync( filePath );
		batch.push( mutateInput( input, attemptIndex, index ) );
	}

	return batch;
}

function makeHttpPollingBatch( files, attemptIndex ) {
	const canaryFiles = files.filter( isHttpPollingCanarySeedFile );
	const batch = [];
	const usedFiles = new Set();

	for (
		let index = 0;
		index < canaryFiles.length && batch.length < batchSize;
		index++
	) {
		const filePath = canaryFiles[ index ];
		usedFiles.add( filePath );
		batch.push(
			mutateInput( fs.readFileSync( filePath ), attemptIndex, index )
		);
	}

	for ( let index = 0; batch.length < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];

		if ( usedFiles.has( filePath ) && files.length > batch.length ) {
			continue;
		}

		batch.push(
			mutateInput(
				fs.readFileSync( filePath ),
				attemptIndex,
				batch.length
			)
		);
	}

	return batch;
}

function mutateInput( input, attemptIndex, caseIndex ) {
	if ( isParserTarget() ) {
		return mutateParserInput( input, attemptIndex, caseIndex );
	}
	if ( isRichTextCrdtTarget() ) {
		return mutateRichTextCrdtInput( input, attemptIndex, caseIndex );
	}
	if ( isHttpPollingTarget() ) {
		return mutateHttpPollingInput( input, attemptIndex, caseIndex );
	}

	const random = createRandom(
		attemptIndex * 1000003 + caseIndex * 9176 + 17
	);
	let bytes = Buffer.from( input );
	const mutationCount = 1 + Math.floor( random() * 4 );

	for ( let mutation = 0; mutation < mutationCount; mutation++ ) {
		const op = Math.floor( random() * 4 );

		if ( op === 0 && bytes.length > 0 ) {
			const offset = Math.floor( random() * bytes.length );
			bytes[ offset ] = Math.floor( random() * 256 );
		} else if ( op === 1 && bytes.length < maxInputBytes ) {
			const offset = Math.floor( random() * ( bytes.length + 1 ) );
			bytes = Buffer.concat( [
				bytes.slice( 0, offset ),
				Buffer.from( [ Math.floor( random() * 256 ) ] ),
				bytes.slice( offset ),
			] );
		} else if ( op === 2 && bytes.length > 1 ) {
			const offset = Math.floor( random() * bytes.length );
			bytes = Buffer.concat( [
				bytes.slice( 0, offset ),
				bytes.slice( offset + 1 ),
			] );
		} else if ( bytes.length > 0 ) {
			bytes = Buffer.concat( [
				bytes,
				bytes.slice( 0, Math.min( 4, bytes.length ) ),
			] );
		}
	}

	if ( bytes.length === 0 ) {
		bytes = Buffer.from( [ 0 ] );
	}

	return bytes.slice( 0, maxInputBytes );
}

function isParserTarget() {
	return (
		profile.includes( 'parser' ) ||
		testPath.includes( 'parser' ) ||
		testPath.includes( 'serialization' )
	);
}

function isRichTextCrdtTarget() {
	return (
		profile.includes( 'rich-text-crdt' ) ||
		testPath.includes( 'rich-text-crdt' )
	);
}

function isHttpPollingTarget() {
	return (
		profile.includes( 'http-polling' ) ||
		testPath.includes( 'http-polling' ) ||
		testPath.includes( 'polling-manager' )
	);
}

function isHttpPollingCanaryRelevantFeature( feature ) {
	return (
		feature.includes( 'canary-bridge' ) ||
		feature.includes( 'restore-state-storage-canary' ) ||
		feature.includes( 'target-title-reload-http' ) ||
		feature.includes( 'target-existing-post-crdt-http' ) ||
		feature.includes( 'target-restore-state-storage-http' ) ||
		feature.includes( 'target-large-http-lifecycle' )
	);
}

function isHttpPollingCanarySeedFile( filePath ) {
	try {
		const text = fs.readFileSync( filePath, 'utf8' ).toLowerCase();
		return (
			text.includes( 'canary-title-reload-http' ) ||
			text.includes( 'canary-existing-post-crdt-http' ) ||
			text.includes( 'canary-restore-state-storage-http' ) ||
			text.includes( 'canary-large-http-lifecycle' )
		);
	} catch {
		return false;
	}
}

function mutateHttpPollingInput( input, attemptIndex, caseIndex ) {
	const random = createRandom(
		attemptIndex * 1000003 + caseIndex * 9176 + 211
	);
	const fragments = [
		'http-polling-normal-overflow-rotation',
		'http-polling-transient-preserve-updates',
		'http-polling-forbidden-specific-room',
		'http-polling-body-too-large-retry',
		'http-polling-cursor-regression-diagnostic',
		'http-polling-nonadvancing-cursor-diagnostic',
		'http-polling-missing-update-room-diagnostic',
		'http-polling-duplicate-response-room-diagnostic',
		'http-polling-duplicate-update-delivery-diagnostic',
		'http-polling-incoming-apply-failure-diagnostic',
		'http-polling-duplicate-active-room-diagnostic',
		'http-polling-invalid-compaction-update-diagnostic',
		'http-polling-pagehide-disconnect-diagnostic',
		'http-polling-stale-since-token-replay-diagnostic',
		'http-polling-server-update-union-diagnostic',
		'http-polling-unregister-rejoin-churn',
		'http-polling-pagehide-disconnect-rooms-18-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect',
		'http-polling-server-update-union-rooms-10-updates-6-peers-12-steps-14-visibility-retry-now',
		'http-polling-canary-title-reload-http-server-update-union-rooms-6-updates-4-peers-6-steps-12-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-existing-post-crdt-http-server-update-union-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-restore-state-storage-http-stale-since-token-replay-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-large-http-lifecycle-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect',
		'http-polling-stale-since-token-replay-rooms-12-updates-6-peers-16-steps-14-disconnect-reconnect',
		'visibility-retry-churn',
		'rooms-16-updates-5-peers-8',
		'rooms-18-updates-6-peers-16-steps-14',
		'disconnect-reconnect-retry-now-visibility',
	];
	let text = input.toString( 'utf8' ).replace( /\0/g, '' );

	if ( ! text.trim() ) {
		text = fragments[ Math.floor( random() * fragments.length ) ];
	}

	const op = Math.floor( random() * 7 );
	const fragment = fragments[ Math.floor( random() * fragments.length ) ];
	const offset = Math.floor( random() * ( text.length + 1 ) );

	if ( op === 0 ) {
		text = `${ text.slice( 0, offset ) }-${ fragment }${ text.slice(
			offset
		) }`;
	} else if ( op === 1 && text.length > 1 ) {
		const length = 1 + Math.floor( random() * Math.min( 20, text.length ) );
		text = `${ text.slice( 0, offset ) }${ text.slice( offset + length ) }`;
	} else if ( op === 2 ) {
		text = text.replace(
			/(normal|transient|forbidden|cursor|missing|duplicate|incoming|stale|server-update)/g,
			fragment
		);
	} else if ( op === 3 ) {
		text = `${ text } rooms-${ 3 + Math.floor( random() * 18 ) }`;
	} else if ( op === 4 ) {
		text = `${ text } updates-${ 1 + Math.floor( random() * 6 ) }`;
	} else if ( op === 5 ) {
		text = `${ text } peers-${ 1 + Math.floor( random() * 16 ) }`;
	} else if ( text.length > 0 ) {
		const bytes = Buffer.from( text );
		const byteOffset = Math.floor( random() * bytes.length );
		bytes[ byteOffset ] = Math.floor( random() * 256 );
		text = bytes.toString( 'latin1' );
	}

	if ( ! text.length ) {
		text = fragment;
	}
	if ( text.length > maxInputBytes ) {
		const start = Math.floor(
			random() * ( text.length - maxInputBytes + 1 )
		);
		text = text.slice( start, start + maxInputBytes );
	}

	return Buffer.from( text );
}

function mutateRichTextCrdtInput( input, attemptIndex, caseIndex ) {
	const random = createRandom(
		attemptIndex * 1000003 + caseIndex * 9176 + 53
	);
	const fragments = [
		'&copy',
		'&copy;',
		'&nbsp',
		'&nbsp;',
		'<em>a</em>',
		'<strong>b</strong>',
		'<code>x</code>',
		'<a href="https://example.com">y</a>',
		'abc xyz',
	];
	let text = input.toString( 'utf8' ).replace( /\0/g, '' );

	if ( ! text.trim() ) {
		text = fragments[ Math.floor( random() * fragments.length ) ];
	}

	const op = Math.floor( random() * 8 );
	const fragment = fragments[ Math.floor( random() * fragments.length ) ];
	const offset = Math.floor( random() * ( text.length + 1 ) );

	if ( op === 0 ) {
		text = `${ text.slice( 0, offset ) }${ fragment }${ text.slice(
			offset
		) }`;
	} else if ( op === 1 && text.length > 1 ) {
		const length = 1 + Math.floor( random() * Math.min( 16, text.length ) );
		text = `${ text.slice( 0, offset ) }${ text.slice( offset + length ) }`;
	} else if ( op === 2 ) {
		text = `<strong>${ text }</strong>`;
	} else if ( op === 3 ) {
		text = `<em>${ text }</em>`;
	} else if ( op === 4 ) {
		text = text.replace( /&amp;|&copy;?|&nbsp;?/g, fragment );
	} else if ( op === 5 && text.length > 0 ) {
		const bytes = Buffer.from( text );
		const byteOffset = Math.floor( random() * bytes.length );
		bytes[ byteOffset ] = Math.floor( random() * 256 );
		text = bytes.toString( 'latin1' );
	} else if ( op === 6 ) {
		text = `${ text }${ text.slice( 0, Math.min( 24, text.length ) ) }`;
	} else {
		text = `${ text.slice( 0, offset ) }${ String.fromCharCode(
			32 + Math.floor( random() * 95 )
		) }${ text.slice( offset ) }`;
	}

	if ( ! text.length ) {
		text = fragment;
	}
	if ( text.length > maxInputBytes ) {
		const start = Math.floor(
			random() * ( text.length - maxInputBytes + 1 )
		);
		text = text.slice( start, start + maxInputBytes );
	}

	return Buffer.from( text );
}

function mutateParserInput( input, attemptIndex, caseIndex ) {
	const random = createRandom(
		attemptIndex * 1000003 + caseIndex * 9176 + 101
	);
	const fragments = [
		'<!-- wp:paragraph --><p>Alpha</p><!-- /wp:paragraph -->',
		'<!-- wp:html -->&copy;&nbsp;<br><!-- /wp:html -->',
		'<!-- wp:paragraph {"content":"copy &copy reg &reg nbsp &nbsp done"} --><p>&copy &#xA9 &#169 &notin &nbsp</p><!-- /wp:paragraph -->',
		'<!-- wp:test-block {"href":"https://example.test/entity?copy=&copy&semi=&copy;&hex=&#xA9&dec=&#169","title":"copy &copy reg &reg nbsp &nbsp done"} /-->',
		'<!-- wp:group --><!-- wp:paragraph --><p>Nested</p><!-- /wp:paragraph --><!-- /wp:group -->',
		'<!-- wp:test-block {"fruit":"Banana"} /-->',
		'<!-- wp:test-block {"bad": --><p>bad attrs</p><!-- /wp:test-block -->',
		'freeform <!-- not-a-block --> &amp; text',
		'<!-- wp:my/block {"nested":{"value":true}} --><div>Body</div><!-- /wp:my/block -->',
	];
	let text = input.toString( 'utf8' ).replace( /\0/g, '' );

	if ( ! text.trim() ) {
		text = fragments[ Math.floor( random() * fragments.length ) ];
	}

	const op = Math.floor( random() * 7 );
	const fragment = fragments[ Math.floor( random() * fragments.length ) ];
	const offset = Math.floor( random() * ( text.length + 1 ) );

	if ( op === 0 ) {
		text = `${ text.slice( 0, offset ) }${ fragment }${ text.slice(
			offset
		) }`;
	} else if ( op === 1 && text.length > 1 ) {
		const length = 1 + Math.floor( random() * Math.min( 24, text.length ) );
		text = `${ text.slice( 0, offset ) }${ text.slice( offset + length ) }`;
	} else if ( op === 2 ) {
		text = text.replace( /wp:/g, random() < 0.5 ? 'wp:' : 'wp:core/' );
	} else if ( op === 3 ) {
		text = text.replace( /-->/g, random() < 0.5 ? '/-->' : '--><' );
	} else if ( op === 4 ) {
		text = `<!-- wp:group -->${ text }<!-- /wp:group -->`;
	} else if ( op === 5 ) {
		text = `${ text }${ text.slice( 0, Math.min( 32, text.length ) ) }`;
	} else {
		text = `${ text.slice( 0, offset ) }${ String.fromCharCode(
			32 + Math.floor( random() * 95 )
		) }${ text.slice( offset ) }`;
	}

	if ( text.length === 0 ) {
		text = fragment;
	}
	if ( text.length > maxInputBytes ) {
		const start = Math.floor(
			random() * ( text.length - maxInputBytes + 1 )
		);
		text = text.slice( start, start + maxInputBytes );
	}

	return Buffer.from( text );
}

function createRandom( seed ) {
	const modulus = 2147483647;
	const multiplier = 48271;
	let state = seed % modulus;

	if ( state <= 0 ) {
		state += modulus - 1;
	}

	return () => {
		state = ( state * multiplier ) % modulus;
		return state / modulus;
	};
}

function collectCoverageKeys( coverageDir ) {
	const keys = new Set();

	for ( const filePath of listJsonFiles( coverageDir ) ) {
		let parsed;

		try {
			parsed = JSON.parse( fs.readFileSync( filePath, 'utf8' ) );
		} catch {
			continue;
		}

		const result = Array.isArray( parsed.result ) ? parsed.result : [];

		for ( const script of result ) {
			const url = normalizeCoverageUrl( script.url || '' );

			if (
				! coverageTargets.some( ( target ) => url.includes( target ) )
			) {
				continue;
			}

			for ( const fn of script.functions || [] ) {
				for ( const range of fn.ranges || [] ) {
					if ( range.count > 0 ) {
						keys.add(
							`${ url }:${ range.startOffset }:${ range.endOffset }`
						);
					}
				}
			}
		}
	}

	return [ ...keys ].sort();
}

function readFeatureKeys( featurePath ) {
	try {
		const parsed = JSON.parse( fs.readFileSync( featurePath, 'utf8' ) );

		if ( ! Array.isArray( parsed ) ) {
			return [];
		}

		return [
			...new Set(
				parsed.filter( ( feature ) => typeof feature === 'string' )
			),
		].sort();
	} catch {
		return [];
	}
}

function normalizeCoverageUrl( url ) {
	if ( url.startsWith( 'file://' ) ) {
		url = new URL( url ).pathname;
	}

	const repoWithSlash = `${ repo.replace( /\/$/, '' ) }/`;
	if ( url.startsWith( repoWithSlash ) ) {
		return url.slice( repoWithSlash.length );
	}

	return url;
}

function listJsonFiles( dir ) {
	const out = [];

	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const filePath = path.join( dir, entry.name );

		if ( entry.isDirectory() ) {
			out.push( ...listJsonFiles( filePath ) );
		} else if ( entry.name.endsWith( '.json' ) ) {
			out.push( filePath );
		}
	}

	return out;
}

function removeCoverageDir( coverageDir ) {
	try {
		fs.rmSync( coverageDir, { recursive: true, force: true } );
		return true;
	} catch {
		return false;
	}
}

function saveCorpusInputs( inputs, prefix ) {
	for ( const input of inputs ) {
		if ( corpusFiles().length >= maxCorpusFiles ) {
			return;
		}

		const hash = crypto
			.createHash( 'sha256' )
			.update( input )
			.digest( 'hex' );
		const outPath = path.join(
			dirs.queue,
			`${ prefix }-${ hash.slice( 0, 16 ) }.bin`
		);

		if ( ! fs.existsSync( outPath ) ) {
			fs.writeFileSync( outPath, input );
		}
	}
}

function classifyFailure( exitCode, stdout, stderr ) {
	if ( exitCode === 0 ) {
		return null;
	}

	const output = `${ stderr }\n${ stdout }`;

	if (
		/Unexpected coverage-guided rich-text CRDT|RTC fuzz-only rich text merge postcondition failed|RTC fuzz-only query-array identity postcondition failed|RTC_HTTP_POLLING_|Local-only block attribute leaked|Object stringification leaked/.test(
			output
		)
	) {
		return {
			kind: 'oracle-failure',
			summary: summarizeFailure( output ),
		};
	}

	if ( exitCode === 124 ) {
		return {
			kind: 'harness-timeout',
			summary: summarizeFailure( output ) || 'timeout expired',
		};
	}

	if (
		/Test suite failed to run|Cannot find module|Jest encountered an unexpected token|Validation Error|SyntaxError|ReferenceError|ENOSPC|no space left on device/i.test(
			output
		)
	) {
		return {
			kind: 'harness-bootstrap',
			summary: summarizeFailure( output ),
		};
	}

	if (
		profile.includes( 'parser' ) ||
		testPath.includes( 'parser' ) ||
		testPath.includes( 'serialization' )
	) {
		return {
			kind: 'oracle-failure',
			summary: summarizeFailure( output ),
		};
	}

	return {
		kind: 'unknown-failure',
		summary: summarizeFailure( output ),
	};
}

function canonicalFailureKey( failure ) {
	if ( ! failure ) {
		return null;
	}

	const summary = failure.summary || failure.kind || 'unknown-failure';
	const explicit = summary.match( /\bRTC_[A-Z0-9_]+(?::[A-Za-z0-9_.-]+)*/u );
	if ( explicit ) {
		return canonicalizeExplicitFailureKey(
			explicit[ 0 ].replace( /:+$/, '' )
		);
	}

	const normalized = summary
		.replace( /\s+/g, '_' )
		.replace( /[^A-Za-z0-9_./:-]+/g, '_' )
		.replace( /^_+|_+$/g, '' )
		.slice( 0, 160 );
	return `${ failure.kind || 'failure' }:${
		normalized || stableHash( summary )
	}`;
}

function canonicalizeExplicitFailureKey( key ) {
	return key
		.split( ':' )
		.filter(
			( part ) =>
				! /^(?:shape|markers|hash|direct-hash|adapter-hash|mismatch-hash)-/u.test(
					part
				)
		)
		.join( ':' );
}

function stableHash( value ) {
	return crypto.createHash( 'sha256' ).update( value ).digest( 'hex' );
}

function summarizeFailure( output ) {
	const lines = output
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	return (
		lines.find( ( line ) => /RTC_[A-Z0-9_]+:/.test( line ) ) ||
		lines.find( ( line ) =>
			/Unexpected coverage-guided rich-text CRDT|RTC fuzz-only rich text merge postcondition failed|RTC fuzz-only query-array identity postcondition failed|Local-only block attribute leaked|Object stringification leaked|Cannot find module|Test suite failed to run|Timed out|ENOSPC|no space left on device|Error:|FAIL /i.test(
				line
			)
		) ||
		lines[ 0 ] ||
		null
	);
}

function isolateFailureInputs( inputs, attemptIndex, failure ) {
	const failureKey = canonicalFailureKey( failure );
	const isolationSkipReason = reserveFailureIsolation( failure, failureKey );

	if ( isolationSkipReason ) {
		return {
			attempted: false,
			reason: isolationSkipReason,
			failureCanonicalKey: failureKey,
			inputCount: inputs.length,
			checkedInputCount: 0,
			truncated: inputs.length > 0,
			runs: [],
			reproducers: [],
		};
	}

	const boundedInputs = inputs.slice( 0, maxMinimizeInputs );
	const runs = [];
	const reproducers = [];

	for ( const [ index, input ] of boundedInputs.entries() ) {
		const result = runSingleInputForFailureIsolation(
			input,
			attemptIndex,
			index
		);
		runs.push( result );

		if ( result.failureKind === 'oracle-failure' ) {
			reproducers.push( { ...result, input } );
		}
	}

	return {
		attempted: true,
		inputCount: inputs.length,
		checkedInputCount: boundedInputs.length,
		truncated: inputs.length > boundedInputs.length,
		runs,
		reproducers,
	};
}

function reserveFailureIsolation( failure, failureKey ) {
	if ( ! minimizeFailures ) {
		return 'disabled';
	}

	if ( failure?.kind !== 'oracle-failure' ) {
		return `skipped-${ failure?.kind ?? 'unknown' }`;
	}

	if ( ! failureKey ) {
		return null;
	}

	const record = failureIsolationHistory.get( failureKey ) || {
		seen: 0,
		isolated: 0,
	};
	record.seen++;

	const repeatDue =
		repeatFailureIsolationEvery > 0 &&
		record.seen % repeatFailureIsolationEvery === 0;
	if ( record.isolated > 0 && ! repeatDue ) {
		failureIsolationHistory.set( failureKey, record );
		return `duplicate-canonical-failure:${ failureKey }`;
	}

	if ( totalFailureIsolations() >= maxFailureIsolationsPerRun ) {
		failureIsolationHistory.set( failureKey, record );
		return `run-isolation-cap:${ maxFailureIsolationsPerRun }`;
	}

	record.isolated++;
	failureIsolationHistory.set( failureKey, record );
	return null;
}

function totalFailureIsolations() {
	let total = 0;
	for ( const record of failureIsolationHistory.values() ) {
		total += record.isolated || 0;
	}
	return total;
}

function runSingleInputForFailureIsolation( input, attemptIndex, inputIndex ) {
	const stamp = new Date().toISOString().replace( /[-:.]/g, '' );
	const featurePath = path.join(
		dirs.work,
		`isolate-features-${ stamp }-${ attemptIndex }-${ inputIndex }.json`
	);
	const isolateLogPath = path.join(
		dirs.logs,
		`${ groupName }-${ stamp }-attempt-${ attemptIndex }-input-${ inputIndex }-isolate.log`
	);
	const env = {
		...process.env,
		CI: '1',
		TMPDIR: tmpDir,
		npm_config_cache: npmCacheDir,
		RTC_CG_LOWER_LEVEL_TMPDIR: tmpDir,
		RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR: npmCacheDir,
		RTC_CG_LOWER_LEVEL_JEST_CACHE_DIR: jestCacheDir,
		RTC_FUZZ_ONLY_ASSERTIONS: '1',
		RTC_FUZZ_ASSERTIONS: '1',
		GUTENBERG_RTC_CG_INPUT_B64: input.toString( 'base64' ),
		GUTENBERG_RTC_CG_RICH_TEXT_INPUT_B64: input.toString( 'base64' ),
		GUTENBERG_RTC_CG_FEATURE_FILE: featurePath,
	};
	delete env.NODE_V8_COVERAGE;
	delete env.GUTENBERG_RTC_CG_INPUT_FILE;
	delete env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE;

	const started = Date.now();
	const result = spawnSync(
		'nice',
		[
			'-n',
			String( niceLevel ),
			'timeout',
			`${ timeoutSeconds }s`,
			'node',
			...runnerArgs,
		],
		{
			cwd: repo,
			env,
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
		}
	);
	const durationMs = Date.now() - started;
	const exitCode = getSpawnExitCode( result );
	const singleFailure = classifyFailure(
		exitCode,
		result.stdout || '',
		result.stderr || ''
	);

	fs.writeFileSync(
		isolateLogPath,
		[
			`command=${ runnerCommand }`,
			`attempt=${ attemptIndex }`,
			`input_index=${ inputIndex }`,
			`feature=${ featurePath }`,
			`exit=${ exitCode }`,
			'',
			'--- stdout ---',
			result.stdout || '',
			'--- stderr ---',
			result.stderr || '',
		].join( '\n' )
	);

	return {
		index: inputIndex,
		sha256: hashInput( input ),
		exitCode,
		durationMs,
		logPath: isolateLogPath,
		featurePath,
		failureKind: singleFailure?.kind ?? null,
		failureSummary: singleFailure?.summary ?? null,
	};
}

function saveFailureInputs(
	inputs,
	attemptIndex,
	logPath,
	failure,
	minimization
) {
	const baseDir =
		failure?.kind === 'oracle-failure'
			? dirs.crashes
			: dirs.harnessFailures;
	const failureDir = path.join( baseDir, `attempt-${ attemptIndex }` );
	fs.mkdirSync( failureDir, { recursive: true } );
	const minimizationMetadata = minimization
		? {
				...minimization,
				reproducers: minimization.reproducers.map(
					( { input, ...reproducer } ) => reproducer
				),
		  }
		: null;

	fs.writeFileSync(
		path.join( failureDir, 'metadata.json' ),
		`${ JSON.stringify(
			{
				attempt: attemptIndex,
				logPath,
				failureKind: failure?.kind ?? 'unknown-failure',
				failureSummary: failure?.summary ?? null,
				failureCanonicalKey: canonicalFailureKey( failure ),
				minimization: minimizationMetadata,
			},
			null,
			2
		) }\n`
	);

	for ( const [ index, input ] of inputs.entries() ) {
		fs.writeFileSync(
			path.join(
				failureDir,
				`input-${ String( index ).padStart( 4, '0' ) }.bin`
			),
			input
		);
	}

	for ( const reproducer of minimization?.reproducers ?? [] ) {
		fs.writeFileSync(
			path.join(
				failureDir,
				`reproducer-input-${ String( reproducer.index ).padStart(
					4,
					'0'
				) }.bin`
			),
			reproducer.input
		);
	}

	return {
		dir: failureDir,
		failureIsolationAttempted: minimization?.attempted ?? false,
		failureIsolationCheckedInputCount:
			minimization?.checkedInputCount ?? null,
		failureIsolationTruncated: minimization?.truncated ?? false,
		minimizedFailureInputCount: minimization?.reproducers.length ?? null,
		minimizedFailureIndexes:
			minimization?.reproducers.map(
				( reproducer ) => reproducer.index
			) ?? [],
	};
}

function hashInput( input ) {
	return crypto.createHash( 'sha256' ).update( input ).digest( 'hex' );
}
