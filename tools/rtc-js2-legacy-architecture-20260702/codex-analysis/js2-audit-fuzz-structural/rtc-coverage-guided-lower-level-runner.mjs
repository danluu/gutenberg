#!/usr/bin/env node
// @ts-nocheck
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const repo = process.env.RTC_CG_LOWER_LEVEL_REPO || process.cwd();
const requireFromRunner = createRequire( import.meta.url );
const runRoot = process.env.RTC_CG_LOWER_LEVEL_RUN_ROOT;
const groupName =
	process.env.RTC_CG_LOWER_LEVEL_GROUP ||
	'coverage-guided-lower-level-rich-text-crdt';
const builtinTargets = new Map( [
	[
		'coverage-guided-lower-level-block-parser-serialization',
		{
			profile: 'rtc-block-parser-serialization',
			testPath:
				'packages/blocks/src/api/parser/test/rtc-block-parser-serialization.coverage-fuzz.test.js',
			maxInputBytes: 192,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 8,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-rich-text-crdt',
		{
			profile: 'rtc-rich-text-crdt',
			testPath:
				'packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js',
			maxInputBytes: 192,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-table-query-array-crdt',
		{
			profile: 'rtc-table-query-array-crdt',
			testPath:
				'packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js',
			maxInputBytes: 256,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-http-awareness-selection-propagation',
		{
			profile: 'rtc-http-awareness-selection-propagation',
			testPath:
				'packages/sync/src/providers/http-polling/test/polling-manager.coverage-fuzz.test.ts',
			maxInputBytes: 256,
			maxCorpusFiles: 512,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-rendered-overlay-dom',
		{
			profile: 'rtc-rendered-overlay-dom',
			testPath:
				'packages/editor/src/components/collaborators-overlay/test/rendered-overlay-dom.coverage-fuzz.test.tsx',
			maxInputBytes: 4096,
			maxCorpusFiles: 512,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
	[
		'coverage-guided-lower-level-post-crdt-save-dirty',
		{
			profile: 'rtc-post-crdt-save-dirty',
			testPath:
				'packages/core-data/src/test/rtc-post-crdt-save-dirty.coverage-fuzz.test.js',
			maxInputBytes: 256,
			maxCorpusFiles: 5000,
			maxMinimizeInputs: 4,
			maxFailureIsolationsPerRun: 1,
			repeatFailureIsolationEvery: 0,
		},
	],
] );
const builtinTarget = builtinTargets.get( groupName );
const testPath =
	process.env.RTC_CG_LOWER_LEVEL_TEST_PATH ||
	builtinTarget?.testPath ||
	'packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js';
const fuzzLevel = 'coverage-guided-lower-level';
const profile =
	process.env.RTC_CG_LOWER_LEVEL_PROFILE ||
	builtinTarget?.profile ||
	'rtc-rich-text-crdt';
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
const featureOnlyCorpusAdmission =
	process.env.RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION === '1' ||
	( process.env.RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION ===
		undefined &&
		! isParserTarget() &&
		! isRichTextCrdtTarget() &&
		! isTableQueryArrayCrdtTarget() &&
		! isHttpPollingTarget() );
const disableMutation = process.env.RTC_CG_LOWER_LEVEL_DISABLE_MUTATION === '1';
const suppressDuplicateFailureArtifacts =
	process.env.RTC_CG_LOWER_LEVEL_SUPPRESS_DUPLICATE_FAILURE_ARTIFACTS !== '0';
const auditRegressionMode =
	process.env.RTC_CG_LOWER_LEVEL_AUDIT_REGRESSION_MODE === '1';
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
	0,
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
const tableQueryArrayDirectOnly = tableQueryArrayDirectOnlyEnvValue();
const tableQueryArrayRunnerMode =
	process.env.RTC_CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_RUNNER ||
	( isTableQueryArrayCrdtTarget() ? 'direct-in-process' : 'jest' );
const useTableQueryArrayDirectRunner =
	isTableQueryArrayCrdtTarget() &&
	tableQueryArrayRunnerMode !== 'jest' &&
	tableQueryArrayRunnerMode !== 'direct-node-jest-per-batch';
const executionStrategy = isTableQueryArrayCrdtTarget()
	? useTableQueryArrayDirectRunner
		? tableQueryArrayDirectOnly === '0'
			? 'persistent-direct-vs-adapter-mergeCrdtBlocks-in-process'
			: 'persistent-direct-mergeCrdtBlocks-in-process'
		: tableQueryArrayDirectOnly === '0'
		? 'direct-vs-adapter-mergeCrdtBlocks-jest-batch-isolation'
		: 'direct-mergeCrdtBlocks-jest-batch-isolation'
	: 'direct-node-jest-per-batch';
const mutationEngine = getMutationEngine();
const httpPollingFocus = normalizeHttpPollingFocus(
	process.env.RTC_CG_LOWER_LEVEL_HTTP_POLLING_FOCUS ||
		defaultHttpPollingFocus()
);

if ( ! runRoot ) {
	console.error( 'RTC_CG_LOWER_LEVEL_RUN_ROOT is required' );
	process.exit( 2 );
}
enforceLowerLevelHold();
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
const effectiveRunnerCommand = useTableQueryArrayDirectRunner
	? `in-process ${ executionStrategy }`
	: runnerCommand;
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
let priorityCorpusSignature = '';
let priorityCorpusFiles = null;

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
	maxAttempts,
	globalCpuAdmissionClass: 'lower-level',
	globalCpuAdmissionLabel: sessionName,
	globalCpuAdmissionPath,
	tmpDir,
	npmCacheDir,
	jestCacheDir,
	jestConfigPath,
	runnerCommand: effectiveRunnerCommand,
	executionStrategy,
	targetPreflight,
	startupAmortizationInputs: batchSize,
	semanticFeatureFeedback: true,
	tableQueryArrayDirectOnly,
	featureOnlyCorpusAdmission,
	disableMutation,
	suppressDuplicateFailureArtifacts,
	httpPollingFocus,
	failureIsolation: minimizeFailures,
	maxMinimizeInputs,
	maxFailureIsolationsPerRun,
	repeatFailureIsolationEvery,
	mutationEngine,
} );

let coverageState = readCoverageState();
const failureIsolationHistory = readFailureIsolationHistory();
let tableQueryArrayRuntime = null;
class TableQueryArrayOracleError extends Error {
	constructor( failureKey, context ) {
		super(
			[
				`RTC fuzz-only query-array identity postcondition failed: ${ failureKey }`,
				`Context: ${ JSON.stringify( context ) }`,
			].join( '\n' )
		);
		this.failureKey = failureKey;
		this.context = context;
	}
}
const TABLE_QUERY_ARRAY_TEXT_FRAGMENTS = [
	'A',
	'B',
	'C',
	'cell',
	'remote',
	'local',
	'&copy;',
	'<strong>x</strong>',
	'<em>y</em>',
	'',
];
const TABLE_QUERY_ARRAY_SCENARIOS = [
	'remote-cell-edit',
	'remote-append-row',
	'remote-prepend-row',
	'remote-delete-row',
	'remote-insert-cell',
	'remote-delete-cell',
	'remote-reorder-row',
	'remote-reorder-cell',
	'local-delete-row-remote-append',
];
const TABLE_QUERY_ARRAY_SYNCED_PROPERTIES = new Set( [ 'blocks' ] );
let attempt = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_ATTEMPT_START', 'RTC_CG_LOWER_LEVEL_SEED_START' ],
	0,
	0,
	Number.MAX_SAFE_INTEGER
);
let attemptsRun = 0;
let cumulativeTestExecutionCount = 0;

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
	const oracleArtifactDir = path.join(
		dirs.work,
		`oracle-artifacts-${ stamp }-${ attempt }`
	);
	const logPath = path.join(
		dirs.logs,
		`${ groupName }-${ stamp }-attempt-${ attempt }.log`
	);

	fs.mkdirSync( coverageDir, { recursive: true } );
	fs.mkdirSync( oracleArtifactDir, { recursive: true } );
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
		oracleArtifactDir,
		logPath,
	} );

	const result = runCoverageGuidedBatch( {
		batch,
		attempt,
		inputPath,
		featurePath,
		coverageDir,
		oracleArtifactDir,
	} );
	const executionDurationMs = Date.now() - started;
	const exitCode = getSpawnExitCode( result );

	fs.writeFileSync(
		logPath,
		[
			`command=${ effectiveRunnerCommand }`,
			`input=${ inputPath }`,
			`features=${ featurePath }`,
			`coverage=${ coverageDir }`,
			`oracle_artifacts=${ oracleArtifactDir }`,
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
		classifyFailure(
			exitCode,
			result.stdout || '',
			result.stderr || '',
			oracleArtifactDir
		);
	const batchFailureCanonicalKeys = canonicalFailureKeys( failure );
	const batchFailureCanonicalKey = preferredCanonicalFailureKey(
		failure,
		coverageState.failureKeys
	);
	const knownBatchFailureKeyBeforeAttempt = Boolean(
		batchFailureCanonicalKey &&
			failure?.kind === 'oracle-failure' &&
			batchFailureCanonicalKeys.length > 0 &&
			batchFailureCanonicalKeys.every( ( key ) =>
				coverageState.failureKeys.includes( key )
			)
	);
	let minimization = null;
	if ( effectiveExitCode !== 0 ) {
		minimization = knownBatchFailureKeyBeforeAttempt
			? skippedKnownFailureMinimization( batch, batchFailureCanonicalKey )
			: isolateFailureInputs( batch, attempt, failure );
	}
	const isolatedFailure = isolatedFailureFromMinimization( minimization );
	const isolatedFailureCanonicalKeys = canonicalFailureKeys(
		isolatedFailure
	);
	const isolatedFailureCanonicalKey = preferredCanonicalFailureKey(
		isolatedFailure,
		coverageState.failureKeys
	);
	const effectiveFailure = isolatedFailure || failure;
	const failureCanonicalKeys = canonicalFailureKeys( effectiveFailure );
	const failureCanonicalKey = preferredCanonicalFailureKey(
		effectiveFailure,
		coverageState.failureKeys
	);
	const knownFailureKeyBeforeAttempt = Boolean(
		failureCanonicalKey &&
			failureCanonicalKeys.length > 0 &&
			failureCanonicalKeys.every( ( key ) =>
				coverageState.failureKeys.includes( key )
			)
	);
	const newFailureCanonicalKeys =
		effectiveFailure?.kind === 'oracle-failure'
			? failureCanonicalKeys.filter(
					( key ) => ! coverageState.failureKeys.includes( key )
			  )
			: [];
	const newFailureKey =
		effectiveFailure?.kind === 'oracle-failure' &&
		newFailureCanonicalKeys.length > 0;
	const isolatedExecutableFailureKey =
		isolatedFailure && isolatedFailureCanonicalKey
			? isolatedFailureCanonicalKey
			: null;
	const isolatedExitOneFailureKey = isolatedExitOneFailureFromMinimization(
		minimization,
		failureCanonicalKey
	);
	const newProductFailureKey =
		newFailureKey &&
		effectiveExitCode === 1 &&
		effectiveFailure?.kind === 'oracle-failure' &&
		isCanonicalRtcOracleFailureKey( failureCanonicalKey ) &&
		Boolean( isolatedExecutableFailureKey ) &&
		isolatedExecutableFailureKey === failureCanonicalKey &&
		Boolean( isolatedExitOneFailureKey ) &&
		isolatedExitOneFailureKey === failureCanonicalKey;
	const diagnosticFailureClassification =
		lowerLevelDiagnosticFailureClassification( {
			batchFailureCanonicalKey,
			failureCanonicalKey,
			isolatedFailureCanonicalKey,
			isolatedExitOneFailureKey,
			minimization,
		} );
	const featureCorpusAdmission =
		admittedNewFeatureKeys.length > 0 &&
		( featureOnlyCorpusAdmission ||
			newCoverageKeys.length > 0 ||
			Boolean( newFailureKey ) );
	const featureOnlyCorpusRejected =
		admittedNewFeatureKeys.length > 0 && ! featureCorpusAdmission;
	const productYield = Boolean( newProductFailureKey );
	const auditRegressionFailureKeys = failureCanonicalKeys.filter(
		isAuditRegressionFailureKey
	);
	const auditRegressionRepro = Boolean(
		auditRegressionFailureKeys.length > 0 &&
			effectiveExitCode === 1 &&
			effectiveFailure?.kind === 'oracle-failure'
	);
	const auditRegressionKnownRepro = Boolean(
		auditRegressionRepro &&
			auditRegressionFailureKeys.every( ( key ) =>
				coverageState.failureKeys.includes( key )
			)
	);

	if (
		newCoverageKeys.length > 0 ||
		featureCorpusAdmission ||
		newFailureKey
	) {
		coverageState = {
			keys: [
				...new Set( [ ...coverageState.keys, ...coverageKeys ] ),
			].sort(),
			featureKeys: [
				...new Set( [
					...coverageState.featureKeys,
					...( featureCorpusAdmission ? admittedNewFeatureKeys : [] ),
				] ),
			].sort(),
			failureKeys: [
				...new Set( [
					...coverageState.failureKeys,
					...newFailureCanonicalKeys,
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

	const failureArtifactSuppressionReason = duplicateFailureArtifactReason(
		effectiveFailure,
		failureCanonicalKey,
		knownFailureKeyBeforeAttempt
	);
	const failureDetails =
		effectiveExitCode !== 0 && ! failureArtifactSuppressionReason
			? saveFailureInputs(
					batch,
					attempt,
					logPath,
					failure,
					effectiveFailure,
					batchFailureCanonicalKey,
					isolatedFailureCanonicalKey,
					minimization,
					oracleArtifactDir,
					diagnosticFailureClassification
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
		runnerCommand: effectiveRunnerCommand,
		executionStrategy,
		startupAmortizationInputs: batch.length,
		inputPath,
		featurePath,
		logPath,
		coverageDir,
		oracleArtifactDir,
		coverageRetained,
		crashDir,
		harnessFailureDir,
		failureArtifactDir,
		failureArtifactSuppressed: Boolean( failureArtifactSuppressionReason ),
		failureArtifactSuppressionReason,
		failureOracleArtifactDir:
			failureDetails?.failureOracleArtifactDir ?? null,
		failureKind: effectiveFailure?.kind ?? null,
		failureSummary: effectiveFailure?.summary ?? null,
		failureCanonicalKey,
		failureCanonicalKeys,
		knownFailureKeyBeforeAttempt,
		knownBatchFailureKeyBeforeAttempt,
		batchFailureSummary: failure?.summary ?? null,
		batchFailureCanonicalKey,
		batchFailureCanonicalKeys,
		batchOracleFailureKeys: failure?.oracleFailureKeys ?? [],
		isolatedFailureSummary: isolatedFailure?.summary ?? null,
		isolatedFailureCanonicalKey,
		isolatedFailureCanonicalKeys,
		isolatedExitOneFailureKey,
		isolatedOracleFailureKeys: isolatedFailure?.oracleFailureKeys ?? [],
		oracleFailureKeys:
			effectiveFailure?.oracleFailureKeys ??
			failure?.oracleFailureKeys ??
			[],
		newFailureKey: Boolean( newFailureKey ),
		newFailureCanonicalKeys,
		newProductFailureKey: Boolean( newProductFailureKey ),
		productFailureKey: newProductFailureKey ? failureCanonicalKey : null,
		auditRegressionMode,
		auditRegressionRepro,
		auditRegressionKnownRepro,
		auditRegressionFailureKeys,
		diagnosticFailureClassification,
		diagnosticFailureKey: diagnosticFailureClassification?.key ?? null,
		diagnosticFailureReason:
			diagnosticFailureClassification?.reason ?? null,
		diagnosticFailureAction:
			diagnosticFailureClassification?.nextAction ?? null,
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
		featureOnlyCorpusAdmission,
		featureOnlyCorpusRejected,
		disableMutation,
		productYield,
		productYieldReason: productYield
			? 'new-exit-1-isolated-canonical-rtc-oracle-failure'
			: auditRegressionRepro
			? 'audit-regression-repro-existing-or-batch-canonical-rtc-oracle-failure'
			: diagnosticFailureClassification?.reason ??
			  'no-new-exit-1-isolated-canonical-rtc-oracle-failure',
		productYieldCreditPolicy:
			'exit=1 retained isolated/minimized reproducer with canonical RTC oracle key',
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
			`feature_corpus_admission=${ featureCorpusAdmission ? 1 : 0 }`,
			`feature_only_corpus_rejected=${
				featureOnlyCorpusRejected ? 1 : 0
			}`,
			`product_yield=${ productYield ? 1 : 0 }`,
			`product_failure_key=${
				newProductFailureKey ? failureCanonicalKey : ''
			}`,
			`canonical_failure_key=${ failureCanonicalKey ?? '' }`,
			`canonical_failure_keys=${ failureCanonicalKeys.join( ',' ) }`,
			`new_failure_keys=${ newFailureCanonicalKeys.join( ',' ) }`,
			`audit_repro=${ auditRegressionRepro ? 1 : 0 }`,
			`audit_known_repro=${ auditRegressionKnownRepro ? 1 : 0 }`,
			`audit_failure_keys=${ auditRegressionFailureKeys.join( ',' ) }`,
			`diagnostic_failure=${ diagnosticFailureClassification ? 1 : 0 }`,
			`diagnostic_failure_key=${
				diagnosticFailureClassification?.key ?? ''
			}`,
			`diagnostic_failure_reason=${
				diagnosticFailureClassification?.reason ?? ''
			}`,
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

function runCoverageGuidedBatch( {
	batch,
	attempt,
	inputPath,
	featurePath,
	coverageDir,
	oracleArtifactDir,
} ) {
	if ( useTableQueryArrayDirectRunner ) {
		return runTableQueryArrayDirectBatch( {
			batch,
			attempt,
			featurePath,
			coverageDir,
			oracleArtifactDir,
		} );
	}

	return spawnSync(
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
				GUTENBERG_RTC_CG_ORACLE_ARTIFACT_DIR: oracleArtifactDir,
				GUTENBERG_RTC_CG_SPEC_PARSER_PATH: isParserTarget()
					? parserSpecParserPath()
					: process.env.GUTENBERG_RTC_CG_SPEC_PARSER_PATH,
				GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY:
					tableQueryArrayDirectOnly,
			},
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
		}
	);
}

function runTableQueryArrayDirectBatch( {
	batch,
	attempt,
	featurePath,
	coverageDir,
	oracleArtifactDir,
} ) {
	const runtime = loadTableQueryArrayRuntime();
	const state = {
		features: new Set(),
		coverageKeys: new Set(),
		failures: [],
	};

	for ( const [ index, input ] of batch.entries() ) {
		try {
			checkTableQueryArrayDirectScenario(
				runtime,
				Array.from( input ),
				index,
				state
			);
		} catch ( error ) {
			const failureKey =
				error.failureKey ||
				canonicalizeExplicitFailureKey(
					summarizeFailure( error.stack || error.message ) ||
						'RTC_TABLE_QUERY_ARRAY_CRDT_UNKNOWN'
				);
			const context = error.context || {
				message: error.message,
				stack: error.stack,
			};
			const artifactPath = path.join(
				oracleArtifactDir,
				`table-query-array-${ String( index ).padStart(
					4,
					'0'
				) }-${ hashInput( input ).slice( 0, 12 ) }.json`
			);
			const failure = {
				failureKey,
				attempt,
				inputIndex: index,
				inputSha256: hashInput( input ),
				context,
			};

			fs.mkdirSync( oracleArtifactDir, { recursive: true } );
			fs.writeFileSync(
				artifactPath,
				`${ JSON.stringify( failure, null, 2 ) }\n`
			);
			state.failures.push( { ...failure, artifactPath } );
			addTableQueryArrayFeature(
				state,
				`failure:${ failureKey.split( ':' )[ 0 ] }`
			);
		}
	}

	writeDirectFeatureFile( featurePath, state.features );
	writeDirectCoverageFile( coverageDir, state.coverageKeys );

	return {
		status: state.failures.length > 0 ? 1 : 0,
		stdout: [
			`table-query-array-direct-runner inputs=${ batch.length } failures=${ state.failures.length } features=${ state.features.size } coverage_keys=${ state.coverageKeys.size }`,
			...state.failures.map( ( failure ) => failure.failureKey ),
		].join( '\n' ),
		stderr: '',
	};
}

function loadTableQueryArrayRuntime() {
	if ( tableQueryArrayRuntime ) {
		return tableQueryArrayRuntime;
	}

	const Module = requireFromRunner( 'node:module' );
	const originalLoad = Module._load;
	let deltaModule = null;

	function syncConstants() {
		if ( ! deltaModule ) {
			deltaModule = requireFromRunner(
				path.join( repo, 'packages/sync/src/quill-delta/Delta.ts' )
			);
		}

		return {
			CRDT_DOC_META_PERSISTENCE_KEY: 'fromPersistence',
			CRDT_RECORD_MAP_KEY: 'document',
			Delta: deltaModule.default || deltaModule,
		};
	}

	Module._load = function loadRtcDirectOracleDependency(
		request,
		parent,
		isMain
	) {
		if (
			( request === '../sync' || request === '../sync.ts' ) &&
			parent?.filename?.includes(
				`${ path.sep }packages${ path.sep }core-data${ path.sep }src${ path.sep }utils${ path.sep }`
			)
		) {
			return syncConstants();
		}

		if ( request === '@wordpress/sync' ) {
			return {
				Y: requireFromRunner( 'yjs' ),
				Awareness: requireFromRunner( 'y-protocols/awareness' )
					.Awareness,
				privateApis: {},
			};
		}

		if ( request === '@wordpress/blocks' ) {
			return {
				__unstableSerializeAndClean: ( blocks ) =>
					JSON.stringify( blocks ),
				getBlockTypes: () => [
					{
						name: 'core/table',
						attributes: {
							body: {
								type: 'array',
								query: {
									cells: {
										type: 'array',
										query: {
											content: { type: 'rich-text' },
											tag: { type: 'string' },
										},
									},
								},
							},
						},
					},
				],
				isUnmodifiedBlock: () => false,
			};
		}

		if ( request === '@wordpress/rich-text' ) {
			class RichTextData {
				constructor( value ) {
					this.html = String( value || '' );
					this.text = this.html.replace( /<[^>]*>/g, '' );
				}

				valueOf() {
					return this.html;
				}

				static fromHTMLString( value ) {
					return new RichTextData( value );
				}
			}

			return {
				RichTextData,
				create: ( { text = '' } = {} ) => ( {
					text,
					replacements: [],
				} ),
				insert: ( value, text, start = 0 ) => {
					const current = String(
						value?.text ?? value?.html ?? value ?? ''
					);

					return {
						text: `${ current.slice(
							0,
							start
						) }${ text }${ current.slice( start ) }`,
						replacements: [],
					};
				},
				toHTMLString: ( { value } ) =>
					String( value?.html ?? value?.text ?? value ?? '' ),
			};
		}

		if ( request === '@wordpress/data' ) {
			return {
				dispatch: () => ( {} ),
				resolveSelect: () => ( {} ),
				select: () => ( {} ),
				subscribe: () => () => {},
			};
		}

		if ( request === '@wordpress/block-editor' ) {
			return { store: {} };
		}

		return originalLoad.apply( this, arguments );
	};

	requireFromRunner( '@babel/register' )( {
		extensions: [ '.js', '.ts', '.tsx' ],
		ignore: [ /node_modules/ ],
		root: repo,
		plugins: [
			requireFromRunner.resolve(
				'@babel/plugin-transform-modules-commonjs'
			),
		],
	} );

	const crdtBlocks = requireFromRunner(
		path.join( repo, 'packages/core-data/src/utils/crdt-blocks.ts' )
	);
	let crdt = null;
	if ( tableQueryArrayDirectOnly === '0' ) {
		crdt = requireFromRunner(
			path.join( repo, 'packages/core-data/src/utils/crdt.ts' )
		);
	}

	tableQueryArrayRuntime = {
		Y: requireFromRunner( 'yjs' ),
		mergeCrdtBlocks: crdtBlocks.mergeCrdtBlocks,
		applyPostChangesToCRDTDoc: crdt?.applyPostChangesToCRDTDoc,
		getPostChangesFromCRDTDoc: crdt?.getPostChangesFromCRDTDoc,
	};
	return tableQueryArrayRuntime;
}

function checkTableQueryArrayDirectScenario(
	runtime,
	inputBytes,
	caseIndex,
	state
) {
	const scenarioData = buildTableQueryArrayScenario(
		inputBytes,
		caseIndex,
		state
	);
	const directBody = checkTableQueryArrayDirectMergePath(
		runtime,
		scenarioData,
		state
	);

	if ( tableQueryArrayDirectOnly !== '0' ) {
		return;
	}

	const adapterBody = checkTableQueryArrayPostChangesPath(
		runtime,
		scenarioData,
		state
	);

	assertTableQueryArrayEquivalentPathBodies(
		directBody,
		adapterBody,
		scenarioData,
		state
	);
}

function buildTableQueryArrayScenario( inputBytes, caseIndex, state ) {
	const byteState = { offset: caseIndex % Math.max( inputBytes.length, 1 ) };
	const initialRows = makeTableQueryArrayRows( inputBytes, byteState, state );
	const scenario = tableQueryArrayScenarioFromInputBytes(
		inputBytes,
		byteState,
		state
	);
	const localMarker = `local-${ caseIndex }-${ readTableQueryArrayByte(
		inputBytes,
		byteState
	) }`;
	const remoteMarker = `remote-${ caseIndex }-${ readTableQueryArrayByte(
		inputBytes,
		byteState
	) }`;
	const staleLocalRows = cloneTableQueryArrayRows( initialRows );
	const remoteRows = cloneTableQueryArrayRows( initialRows );
	const targetRow =
		readTableQueryArrayByte( inputBytes, byteState ) % remoteRows.length;
	const targetCell =
		readTableQueryArrayByte( inputBytes, byteState ) %
		remoteRows[ targetRow ].length;
	const insertCellIndex =
		readTableQueryArrayByte( inputBytes, byteState ) %
		( remoteRows[ targetRow ].length + 1 );
	const reorderRowIndex =
		readTableQueryArrayByte( inputBytes, byteState ) % remoteRows.length;
	const reorderCellIndex =
		readTableQueryArrayByte( inputBytes, byteState ) %
		remoteRows[ targetRow ].length;
	const targetKey = [
		`row-${ tableQueryArrayPositionRole( targetRow, initialRows.length ) }`,
		`cell-${ tableQueryArrayPositionRole(
			targetCell,
			initialRows[ targetRow ].length
		) }`,
		`insert-${ tableQueryArrayPositionRole(
			insertCellIndex,
			initialRows[ targetRow ].length + 1
		) }`,
		`move-row-${ tableQueryArrayPositionRole(
			reorderRowIndex,
			initialRows.length
		) }`,
		`move-cell-${ tableQueryArrayPositionRole(
			reorderCellIndex,
			initialRows[ targetRow ].length
		) }`,
	].join( '_' );
	let deletedMarker = null;

	if ( scenario === 'local-delete-row-remote-append' ) {
		const localDeleteRow = initialRows.length - 1;
		deletedMarker = staleLocalRows[ localDeleteRow ][ 0 ];
		staleLocalRows.splice( localDeleteRow, 1 );
		remoteRows.push(
			Array.from(
				{ length: remoteRows[ 0 ].length },
				( _value, cellIndex ) =>
					cellIndex === 0
						? remoteMarker
						: `remote-tail-${ cellIndex }`
			)
		);
	} else {
		staleLocalRows[ 0 ][ 0 ] = localMarker;

		if ( scenario === 'remote-cell-edit' ) {
			remoteRows[ targetRow ][ targetCell ] = remoteMarker;
		} else if ( scenario === 'remote-append-row' ) {
			remoteRows.push(
				Array.from(
					{ length: remoteRows[ 0 ].length },
					( _value, cellIndex ) =>
						cellIndex === 0
							? remoteMarker
							: `remote-tail-${ cellIndex }`
				)
			);
		} else if ( scenario === 'remote-prepend-row' ) {
			remoteRows.unshift(
				Array.from(
					{ length: remoteRows[ 0 ].length },
					( _value, cellIndex ) =>
						cellIndex === 0
							? remoteMarker
							: `remote-head-${ cellIndex }`
				)
			);
		} else if ( scenario === 'remote-delete-row' ) {
			deletedMarker = remoteRows[ targetRow ][ 0 ];
			remoteRows.splice( targetRow, 1 );
		} else if ( scenario === 'remote-insert-cell' ) {
			remoteRows[ targetRow ].splice( insertCellIndex, 0, remoteMarker );
		} else if ( scenario === 'remote-delete-cell' ) {
			deletedMarker = remoteRows[ targetRow ][ targetCell ];
			remoteRows[ targetRow ].splice( targetCell, 1 );
		} else if ( scenario === 'remote-reorder-row' ) {
			remoteRows[ targetRow ][ 0 ] = remoteMarker;
			moveTableQueryArrayItem( remoteRows, targetRow, reorderRowIndex );
		} else {
			remoteRows[ targetRow ][ targetCell ] = remoteMarker;
			moveTableQueryArrayItem(
				remoteRows[ targetRow ],
				targetCell,
				reorderCellIndex
			);
		}
	}

	const rowDelta = remoteRows.length - initialRows.length;
	const cellDelta =
		remoteRows.reduce( ( total, row ) => total + row.length, 0 ) -
		initialRows.length * initialRows[ 0 ].length;

	addTableQueryArrayFeature( state, `scenario:${ scenario }` );
	addTableQueryArrayFeature(
		state,
		`scenario:row-delta:${ Math.sign( rowDelta ) }`
	);
	addTableQueryArrayFeature(
		state,
		`scenario:cell-delta:${ Math.sign( cellDelta ) }`
	);
	addTableQueryArrayFeature(
		state,
		`scenario-shape:${ scenario }:${ initialRows.length }x${ initialRows[ 0 ].length }`
	);
	addTableQueryArrayFeature(
		state,
		`scenario-target:${ scenario }:${ targetKey }`
	);
	addTableQueryArrayFeature( state, 'query-array-kind:table-body-cells' );
	addTableQueryArrayFeature( state, 'revision-path:remote-then-stale-local' );
	addTableQueryArrayBucketedFeature(
		state,
		'initial:total-cells',
		initialRows.length * initialRows[ 0 ].length
	);
	addTableQueryArrayBucketedFeature(
		state,
		'input:bytes',
		inputBytes.length
	);
	addTableQueryArrayInputChecksumFeatures( state, inputBytes );

	return {
		scenario,
		initialRows,
		remoteRows,
		staleLocalRows,
		localMarker,
		remoteMarker,
		deletedMarker,
		targetKey,
	};
}

function checkTableQueryArrayDirectMergePath( runtime, scenarioData, state ) {
	addTableQueryArrayFeature( state, 'oracle:direct-mergeCrdtBlocks' );
	const docA = new runtime.Y.Doc();
	const docB = new runtime.Y.Doc();
	const yblocksA = docA.getArray( 'blocks' );
	const yblocksB = docB.getArray( 'blocks' );

	try {
		runtime.mergeCrdtBlocks(
			yblocksA,
			[ tableQueryArrayBlock( scenarioData.initialRows ) ],
			null
		);
		tableQueryArraySyncDocs( runtime, docA, docB );
		runtime.mergeCrdtBlocks(
			yblocksB,
			[ tableQueryArrayBlock( scenarioData.remoteRows ) ],
			null
		);
		tableQueryArraySyncDocs( runtime, docB, docA );
		runtime.mergeCrdtBlocks(
			yblocksA,
			[ tableQueryArrayBlock( scenarioData.staleLocalRows ) ],
			makeTableQueryArrayCursor( scenarioData.localMarker )
		);

		const body = tableQueryArrayBodyFromBlock( yblocksA.toJSON()[ 0 ] );

		assertTableQueryArrayScenarioResult(
			body,
			scenarioData,
			'direct-mergeCrdtBlocks',
			state
		);
		return body;
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

function checkTableQueryArrayPostChangesPath( runtime, scenarioData, state ) {
	if (
		! runtime.applyPostChangesToCRDTDoc ||
		! runtime.getPostChangesFromCRDTDoc
	) {
		throw new TableQueryArrayOracleError(
			'RTC_TABLE_QUERY_ARRAY_CRDT_PATH_MISMATCH:adapter-unavailable',
			{ scenario: scenarioData.scenario }
		);
	}

	addTableQueryArrayFeature( state, 'oracle:post-changes-adapter' );
	const docA = new runtime.Y.Doc();
	const docB = new runtime.Y.Doc();

	try {
		applyTableQueryArrayBlocks( runtime, docA, scenarioData.initialRows );
		tableQueryArraySyncDocs( runtime, docA, docB );
		applyTableQueryArrayBlocks( runtime, docB, scenarioData.remoteRows );
		tableQueryArraySyncDocs( runtime, docB, docA );
		applyTableQueryArrayBlocks(
			runtime,
			docA,
			scenarioData.staleLocalRows
		);

		const changes = runtime.getPostChangesFromCRDTDoc(
			docA,
			{ blocks: [] },
			TABLE_QUERY_ARRAY_SYNCED_PROPERTIES
		);
		const body = tableQueryArrayBodyFromBlock( changes.blocks?.[ 0 ] );

		assertTableQueryArrayScenarioResult(
			body,
			scenarioData,
			'post-changes-adapter',
			state
		);
		return body;
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

function applyTableQueryArrayBlocks( runtime, doc, rows ) {
	runtime.applyPostChangesToCRDTDoc(
		doc,
		{ blocks: [ tableQueryArrayBlock( rows ) ] },
		TABLE_QUERY_ARRAY_SYNCED_PROPERTIES
	);
}

function assertTableQueryArrayScenarioResult(
	body,
	scenarioData,
	pathLabel,
	state
) {
	const oracle = addTableQueryArrayOracleOutcomeFeatures(
		body,
		scenarioData,
		pathLabel,
		state
	);
	const context = {
		pathLabel,
		scenario: scenarioData.scenario,
		localMarker: scenarioData.localMarker,
		remoteMarker: scenarioData.remoteMarker,
		deletedMarker: scenarioData.deletedMarker,
		initialRows: scenarioData.initialRows,
		body,
		oracle,
	};
	const divergenceKey = ( oracleName ) =>
		[
			'RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE',
			`scenario-${ scenarioData.scenario }`,
			`path-${ pathLabel }`,
			`oracle-${ oracleName }`,
			`target-${ scenarioData.targetKey }`,
		].join( ':' );

	assertTableQueryArrayBodyInvariants( body, context );
	if ( scenarioData.scenario === 'local-delete-row-remote-append' ) {
		assertTableQueryArrayCondition(
			! tableQueryArrayRowsContain( body, scenarioData.deletedMarker ),
			divergenceKey( 'local-deleted-row' ),
			context
		);
		assertTableQueryArrayCondition(
			tableQueryArrayRowsContain( body, scenarioData.remoteMarker ),
			divergenceKey( 'remote-marker' ),
			context
		);
		return;
	}
	assertTableQueryArrayCondition(
		tableQueryArrayRowsContain( body, scenarioData.localMarker ),
		divergenceKey( 'local-marker' ),
		context
	);

	if ( scenarioData.scenario.startsWith( 'remote-delete-' ) ) {
		assertTableQueryArrayCondition(
			! tableQueryArrayRowsContain( body, scenarioData.deletedMarker ),
			divergenceKey( 'deleted-item' ),
			context
		);
	} else {
		assertTableQueryArrayCondition(
			tableQueryArrayRowsContain( body, scenarioData.remoteMarker ),
			divergenceKey( 'remote-marker' ),
			context
		);
	}
}

function assertTableQueryArrayEquivalentPathBodies(
	directBody,
	adapterBody,
	scenarioData,
	state
) {
	const directCanonical = tableQueryArrayCanonicalBody( directBody );
	const adapterCanonical = tableQueryArrayCanonicalBody( adapterBody );
	const directSerialized = JSON.stringify( directCanonical );
	const adapterSerialized = JSON.stringify( adapterCanonical );
	const directHash = tableQueryArrayBodyHashKey( directCanonical );
	const adapterHash = tableQueryArrayBodyHashKey( adapterCanonical );

	addTableQueryArrayFeature(
		state,
		'oracle:direct-vs-adapter-body-equivalence'
	);
	addTableQueryArrayFeature(
		state,
		`oracle:path-shapes:${ tableQueryArrayBodyShapeKey(
			directCanonical
		) }:${ tableQueryArrayBodyShapeKey( adapterCanonical ) }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:path-hashes:${ directHash }:${ adapterHash }`
	);
	assertTableQueryArrayCondition(
		directSerialized === adapterSerialized,
		[
			'RTC_TABLE_QUERY_ARRAY_CRDT_PATH_MISMATCH',
			`scenario-${ scenarioData.scenario }`,
			`target-${ scenarioData.targetKey }`,
		].join( ':' ),
		{
			scenario: scenarioData.scenario,
			initialRows: scenarioData.initialRows,
			remoteRows: scenarioData.remoteRows,
			staleLocalRows: scenarioData.staleLocalRows,
			directShape: tableQueryArrayBodyShapeKey( directCanonical ),
			adapterShape: tableQueryArrayBodyShapeKey( adapterCanonical ),
			directHash,
			adapterHash,
			mismatchHash: tableQueryArrayStableHash( {
				direct: directCanonical,
				adapter: adapterCanonical,
			} ),
			directBody: directCanonical,
			adapterBody: adapterCanonical,
		}
	);
}

function assertTableQueryArrayBodyInvariants( body, context ) {
	assertTableQueryArrayCondition(
		Array.isArray( body ) && body.length > 0,
		'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:body-missing',
		context
	);

	for ( const [ rowIndex, row ] of body.entries() ) {
		assertTableQueryArrayCondition(
			Array.isArray( row ) && row.length > 0,
			'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:row-missing',
			{ ...context, rowIndex, row }
		);

		for ( const [ cellIndex, value ] of row.entries() ) {
			assertTableQueryArrayCondition(
				typeof value === 'string',
				'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:cell-not-string',
				{ ...context, rowIndex, cellIndex, value }
			);
			assertTableQueryArrayCondition(
				! value.includes( '[object Object]' ),
				'RTC_TABLE_QUERY_ARRAY_CRDT_SHAPE:object-stringification',
				{ ...context, rowIndex, cellIndex, value }
			);
		}
	}
}

function assertTableQueryArrayCondition( condition, failureKey, context ) {
	if ( condition ) {
		return;
	}

	throw new TableQueryArrayOracleError( failureKey, context );
}

function addTableQueryArrayOracleOutcomeFeatures(
	body,
	scenarioData,
	pathLabel,
	state
) {
	const presence = tableQueryArrayMarkerPresence( body, scenarioData );
	const shape = tableQueryArrayBodyShapeKey( body );
	const markerShape = tableQueryArrayMarkerShapeKey( body, scenarioData );
	const hash = tableQueryArrayBodyHashKey( body );

	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:scenario:${ scenarioData.scenario }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:shape:${ shape }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:markers:${ markerShape }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:body-hash:${ hash }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:target:${ scenarioData.targetKey }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:local:${ presence.local }`
	);
	addTableQueryArrayFeature(
		state,
		`oracle:${ pathLabel }:remote:${ presence.remote }`
	);
	addTableQueryArrayMarkerCoordinateFeatures(
		body,
		scenarioData,
		pathLabel,
		'local',
		state
	);
	addTableQueryArrayMarkerCoordinateFeatures(
		body,
		scenarioData,
		pathLabel,
		'remote',
		state
	);

	if ( scenarioData.deletedMarker ) {
		addTableQueryArrayFeature(
			state,
			`oracle:${ pathLabel }:deleted:${ presence.deleted }`
		);
		addTableQueryArrayMarkerCoordinateFeatures(
			body,
			scenarioData,
			pathLabel,
			'deleted',
			state
		);
	}

	return { presence, shape, markerShape, hash };
}

function addTableQueryArrayMarkerCoordinateFeatures(
	body,
	scenarioData,
	pathLabel,
	markerName,
	state
) {
	const marker = scenarioData[ `${ markerName }Marker` ];
	const coordinate = tableQueryArrayMarkerCoordinate( body, marker );
	const prefix = `oracle:${ pathLabel }:${ markerName }-coordinate`;

	if ( ! coordinate ) {
		addTableQueryArrayFeature( state, `${ prefix }:missing` );
		return;
	}

	addTableQueryArrayFeature(
		state,
		`${ prefix }:row-${ tableQueryArrayPositionRole(
			coordinate.rowIndex,
			body.length
		) }`
	);
	addTableQueryArrayFeature(
		state,
		`${ prefix }:cell-${ tableQueryArrayPositionRole(
			coordinate.cellIndex,
			coordinate.rowWidth
		) }`
	);
	addTableQueryArrayBucketedFeature(
		state,
		`${ prefix }:linear-index`,
		coordinate.rowIndex * 8 + coordinate.cellIndex
	);
	addTableQueryArrayBucketedFeature(
		state,
		`${ prefix }:row-width`,
		coordinate.rowWidth
	);
}

function tableQueryArrayScenarioFromInputBytes( inputBytes, byteState, state ) {
	const text = Buffer.from( inputBytes ).toString( 'utf8' ).toLowerCase();
	const tokenScenarios = [
		[
			'local-delete-row-remote-append',
			'local-delete-row-remote-append',
		],
		[
			'delete-local-row-remote-append',
			'local-delete-row-remote-append',
		],
		[ 'remote-cell-edit', 'remote-cell-edit' ],
		[ 'cell-edit', 'remote-cell-edit' ],
		[ 'append-row', 'remote-append-row' ],
		[ 'prepend-row', 'remote-prepend-row' ],
		[ 'delete-row', 'remote-delete-row' ],
		[ 'insert-cell', 'remote-insert-cell' ],
		[ 'delete-cell', 'remote-delete-cell' ],
		[ 'reorder-row', 'remote-reorder-row' ],
		[ 'reorder-cell', 'remote-reorder-cell' ],
	];

	if (
		text.includes( 'local' ) &&
		text.includes( 'remote' ) &&
		text.includes( 'append' ) &&
		text.includes( 'del' )
	) {
		addTableQueryArrayFeature(
			state,
			'scenario-source:semantic-token:local-delete-row-remote-append'
		);
		return 'local-delete-row-remote-append';
	}

	for ( const [ token, scenario ] of tokenScenarios ) {
		if ( text.includes( token ) ) {
			addTableQueryArrayFeature(
				state,
				`scenario-source:token:${ scenario }`
			);
			return scenario;
		}
	}

	addTableQueryArrayFeature( state, 'scenario-source:byte' );
	return TABLE_QUERY_ARRAY_SCENARIOS[
		readTableQueryArrayByte( inputBytes, byteState ) %
			TABLE_QUERY_ARRAY_SCENARIOS.length
	];
}

function makeTableQueryArrayRows( inputBytes, byteState, state ) {
	const rowCount =
		2 + ( readTableQueryArrayByte( inputBytes, byteState ) % 3 );
	const cellCount =
		2 + ( readTableQueryArrayByte( inputBytes, byteState ) % 3 );
	const rows = [];

	for ( let rowIndex = 0; rowIndex < rowCount; rowIndex++ ) {
		const row = [];

		for ( let cellIndex = 0; cellIndex < cellCount; cellIndex++ ) {
			row.push(
				makeTableQueryArrayText(
					inputBytes,
					byteState,
					rowIndex,
					cellIndex,
					state
				)
			);
		}

		rows.push( row );
	}

	return rows;
}

function makeTableQueryArrayText(
	inputBytes,
	byteState,
	rowIndex,
	cellIndex,
	state
) {
	const fragment = pickTableQueryArrayValue(
		TABLE_QUERY_ARRAY_TEXT_FRAGMENTS,
		inputBytes,
		byteState
	);
	const suffix =
		readTableQueryArrayByte( inputBytes, byteState ) % 3 === 0
			? `-${ readTableQueryArrayByte( inputBytes, byteState ) % 17 }`
			: '';

	addTableQueryArrayFeature(
		state,
		`text-fragment:${ classifyTableQueryArrayTextFragment( fragment ) }`
	);
	addTableQueryArrayFeature(
		state,
		suffix ? 'text-suffix:present' : 'text-suffix:absent'
	);
	addTableQueryArrayFeature(
		state,
		`text-cell-position:${
			rowIndex === cellIndex ? 'diagonal' : 'off-diagonal'
		}`
	);

	return `r${ rowIndex }c${ cellIndex }-${ fragment }${ suffix }`;
}

function tableQueryArrayBlock( rows ) {
	return {
		name: 'core/table',
		clientId: 'table-1',
		attributes: {
			body: rows.map( ( cells ) => ( {
				cells: cells.map( ( content ) => ( { content, tag: 'td' } ) ),
			} ) ),
		},
		innerBlocks: [],
	};
}

function makeTableQueryArrayCursor( localMarker ) {
	return {
		attributeKey: 'body.0.cells.0.content',
		clientId: 'table-1',
		offset: localMarker.length,
	};
}

function tableQueryArrayBodyFromBlock( block ) {
	const body = block?.attributes?.body;

	if ( ! Array.isArray( body ) ) {
		return [];
	}

	return body.map( ( row ) =>
		( row.cells || [] ).map( ( cell ) =>
			tableQueryArrayTextValue( cell.content )
		)
	);
}

function tableQueryArrayTextValue( value ) {
	if ( value && typeof value.text === 'string' ) {
		return value.text;
	}

	return String( value ?? '' );
}

function tableQueryArrayCanonicalCellContent( value ) {
	return String( value ?? '' )
		.replace( /<[^>]*>/g, '' )
		.replace( /&copy;/g, '(c)' )
		.replace( /\u00a9/g, '(c)' )
		.replace( /&nbsp;/g, ' ' )
		.replace( /&amp;/g, '&' )
		.replace( /&lt;/g, '<' )
		.replace( /&gt;/g, '>' );
}

function tableQueryArrayCanonicalBody( body ) {
	return body.map( ( row ) =>
		row.map( tableQueryArrayCanonicalCellContent )
	);
}

function tableQueryArrayBodyShapeKey( body ) {
	return tableQueryArrayCanonicalBody( body )
		.map( ( row ) => row.length )
		.join( 'x' );
}

function tableQueryArrayBodyHashKey( body ) {
	return tableQueryArrayStableHash(
		tableQueryArrayCanonicalBody( body )
	).slice( 0, 8 );
}

function tableQueryArrayMarkerPresence( body, scenarioData ) {
	return {
		local: tableQueryArrayRowsContain( body, scenarioData.localMarker )
			? 'present'
			: 'missing',
		remote: tableQueryArrayRowsContain( body, scenarioData.remoteMarker )
			? 'present'
			: 'missing',
		deleted:
			scenarioData.deletedMarker &&
			tableQueryArrayRowsContain( body, scenarioData.deletedMarker )
				? 'present'
				: 'missing',
	};
}

function tableQueryArrayRowsContain( rows, marker ) {
	return rows.some( ( row ) => row.includes( marker ) );
}

function tableQueryArrayMarkerCoordinate( body, marker ) {
	if ( ! marker ) {
		return null;
	}

	for ( const [ rowIndex, row ] of tableQueryArrayCanonicalBody(
		body
	).entries() ) {
		const cellIndex = row.indexOf( marker );

		if ( cellIndex !== -1 ) {
			return { rowIndex, cellIndex, rowWidth: row.length };
		}
	}

	return null;
}

function tableQueryArrayMarkerShapeKey( body, scenarioData ) {
	return tableQueryArrayCanonicalBody( body )
		.map( ( row ) =>
			row
				.map( ( cell ) => {
					if ( cell === scenarioData.localMarker ) {
						return 'L';
					}
					if ( cell === scenarioData.remoteMarker ) {
						return 'R';
					}
					if ( cell === scenarioData.deletedMarker ) {
						return 'D';
					}
					return '.';
				} )
				.join( '' )
		)
		.join( 'x' );
}

function tableQueryArraySyncDocs( runtime, from, to ) {
	runtime.Y.applyUpdate( to, runtime.Y.encodeStateAsUpdate( from ) );
}

function cloneTableQueryArrayRows( rows ) {
	return rows.map( ( cells ) => [ ...cells ] );
}

function moveTableQueryArrayItem( values, fromIndex, toIndex ) {
	const [ value ] = values.splice( fromIndex, 1 );

	values.splice( Math.min( toIndex, values.length ), 0, value );
}

function tableQueryArrayPositionRole( index, length ) {
	if ( index === 0 ) {
		return 'first';
	}

	if ( index === length - 1 ) {
		return 'last';
	}

	return 'middle';
}

function readTableQueryArrayByte( inputBytes, byteState ) {
	const value = inputBytes[ byteState.offset % inputBytes.length ] ?? 0;
	byteState.offset++;
	return value;
}

function pickTableQueryArrayValue( values, inputBytes, byteState ) {
	return values[
		readTableQueryArrayByte( inputBytes, byteState ) % values.length
	];
}

function classifyTableQueryArrayTextFragment( fragment ) {
	if ( fragment === '' ) {
		return 'empty';
	}

	if ( fragment.includes( '<strong>' ) ) {
		return 'html-strong';
	}

	if ( fragment.includes( '<em>' ) ) {
		return 'html-em';
	}

	if ( fragment.startsWith( '&' ) ) {
		return 'entity';
	}

	if ( fragment.length === 1 ) {
		return 'single-character';
	}

	return 'word';
}

function addTableQueryArrayInputChecksumFeatures( state, inputBytes ) {
	const checksum = inputBytes.reduce(
		( total, value, index ) => total + value * ( index + 1 ),
		0
	);
	const byteSpread = Math.max( ...inputBytes ) - Math.min( ...inputBytes );

	addTableQueryArrayFeature(
		state,
		`input:checksum-mod-32:${ checksum % 32 }`
	);
	addTableQueryArrayBucketedFeature( state, 'input:byte-spread', byteSpread );
	addTableQueryArrayFeature(
		state,
		`input:first-last-mod-16:${
			( ( inputBytes[ 0 ] ?? 0 ) +
				( inputBytes[ inputBytes.length - 1 ] ?? 0 ) ) %
			16
		}`
	);
}

function addTableQueryArrayBucketedFeature( state, prefix, value ) {
	const numericValue = Number.isFinite( value ) ? Math.max( 0, value ) : 0;
	const bounds = [ 0, 1, 2, 3, 4, 8, 16, 32, 64 ];
	const bound = bounds.find( ( candidate ) => numericValue <= candidate );

	addTableQueryArrayFeature(
		state,
		`${ prefix }:${ bound === undefined ? 'gt-64' : `le-${ bound }` }`
	);
}

function addTableQueryArrayFeature( state, feature ) {
	state.features.add( feature );
	state.coverageKeys.add(
		`packages/core-data/src/utils/crdt-blocks.ts:direct-table-query-array:${ feature
			.replace( /[^A-Za-z0-9_.:-]+/g, '_' )
			.slice( 0, 180 ) }`
	);
}

function writeDirectFeatureFile( featurePath, features ) {
	fs.mkdirSync( path.dirname( featurePath ), { recursive: true } );
	fs.writeFileSync(
		featurePath,
		`${ JSON.stringify( [ ...features ].sort(), null, 2 ) }\n`
	);
}

function writeDirectCoverageFile( coverageDir, coverageKeys ) {
	fs.mkdirSync( coverageDir, { recursive: true } );
	fs.writeFileSync(
		path.join( coverageDir, 'direct-coverage-keys.json' ),
		`${ JSON.stringify(
			{
				schemaVersion: 1,
				coverageEngine: 'direct-semantic-table-query-array',
				keys: [ ...coverageKeys ].sort(),
			},
			null,
			2
		) }\n`
	);
}

function tableQueryArrayStableHash( value ) {
	let hash = 2166136261;
	const text = JSON.stringify( value );

	for ( let index = 0; index < text.length; index++ ) {
		hash = ( hash * 16777619 + text.charCodeAt( index ) ) % 4294967296;
	}

	return hash.toString( 16 ).padStart( 8, '0' );
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

function enforceLowerLevelHold() {
	if ( process.env.RTC_CG_LOWER_LEVEL_IGNORE_HOLD === '1' ) {
		return;
	}

	const holdFile =
		process.env.RTC_CG_LOWER_LEVEL_HOLD_FILE || inferredHoldFile();

	if ( ! holdFile || ! fs.existsSync( holdFile ) ) {
		return;
	}

	const holdReason = fs.readFileSync( holdFile, 'utf8' ).trim();
	const heldPath = path.join( runRoot, 'held.txt' );
	fs.mkdirSync( path.dirname( heldPath ), { recursive: true } );
	fs.writeFileSync(
		heldPath,
		[
			`group=${ groupName }`,
			`hold=${ holdFile }`,
			`reason=${ holdReason }`,
			'override=RTC_CG_LOWER_LEVEL_IGNORE_HOLD=1',
			'',
		].join( '\n' )
	);
	console.error(
		`held coverage-guided lower-level group ${ groupName }; hold=${ holdFile }; set RTC_CG_LOWER_LEVEL_IGNORE_HOLD=1 for an explicit override`
	);
	process.exit( 0 );
}

function inferredHoldFile() {
	const runsMarker = `${ path.sep }runs${ path.sep }`;
	const runsIndex = runRoot.indexOf( runsMarker );

	if ( runsIndex === -1 ) {
		return null;
	}

	return path.join(
		runRoot.slice( 0, runsIndex ),
		'holds',
		`${ groupName }.hold`
	);
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
			'packages/block-serialization-default-parser/src/index.ts'
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
		const configuredSpecParserPath =
			process.env.GUTENBERG_RTC_CG_SPEC_PARSER_PATH ||
			process.env.RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH;
		if ( ! configuredSpecParserPath ) {
			failPreflight(
				`parser target requires GUTENBERG_RTC_CG_SPEC_PARSER_PATH or RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH pointing at the temp-built spec parser; run bin/rtc-coverage-guided-lower-level-start-remote.sh validate`
			);
		}
		const specParserPath = parserSpecParserPath();
		if ( ! fs.existsSync( specParserPath ) ) {
			failPreflight(
				`parser spec preflight file is missing: ${ specParserPath }; run bin/rtc-coverage-guided-lower-level-start-remote.sh validate to build the temp parser`
			);
		}
		const testSource = fs.readFileSync(
			path.resolve( repo, testPath ),
			'utf8'
		);

		if (
			testSource.includes( '@wordpress/block-serialization-spec-parser' )
		) {
			failPreflight(
				`${ testPath } must load the temp-built spec parser from GUTENBERG_RTC_CG_SPEC_PARSER_PATH; @wordpress/block-serialization-spec-parser resolves through shared node_modules in this checkout`
			);
		}

		checks.push( {
			check: 'parser-spec-import',
			source: testPath,
			specParserPath,
			specParserPathSource: 'env',
			ok: true,
		} );
	}

	return {
		ok: true,
		repo,
		checks,
	};
}

function parserSpecParserPath() {
	const configuredPath =
		process.env.GUTENBERG_RTC_CG_SPEC_PARSER_PATH ||
		process.env.RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH;

	if ( ! configuredPath ) {
		return path.resolve(
			repo,
			'packages/block-serialization-spec-parser/parser.js'
		);
	}

	return path.isAbsolute( configuredPath )
		? configuredPath
		: path.resolve( repo, configuredPath );
}

function parserSpecCoverageTarget() {
	const specParserPath = parserSpecParserPath();
	const relativePath = path.relative( path.resolve( repo ), specParserPath );

	if ( relativePath && ! relativePath.startsWith( '..' ) ) {
		return relativePath;
	}

	return specParserPath;
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
	if ( isTableQueryArrayCrdtTarget() ) {
		return 'table-query-array-crdt-dictionary-byte-mutator';
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
			maxAttempts,
			globalCpuAdmissionClass: 'lower-level',
			globalCpuAdmissionLabel: sessionName,
			globalCpuAdmissionPath,
			tmpDir,
			npmCacheDir,
			jestCacheDir,
			jestConfigPath,
			runnerCommand: effectiveRunnerCommand,
			executionStrategy,
			targetPreflight,
			corpusFeedback: true,
			semanticFeatureFeedback: true,
			tableQueryArrayDirectOnly,
			featureOnlyCorpusAdmission,
			disableMutation,
			suppressDuplicateFailureArtifacts,
			auditRegressionMode,
			httpPollingFocus,
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
			Buffer.from(
				'freeform <!-- not-a-block <!-- wp:test-block {"fruit":"Banana"} /-->--><  &am'
			),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
	}

	if (
		profile.includes( 'post-crdt-save-dirty' ) ||
		testPath.includes( 'post-crdt-save-dirty' )
	) {
		return [
			Buffer.from( 'post-crdt-save-base-metadata' ),
			Buffer.from( 'post-crdt-save-stale-trailing-delete' ),
			Buffer.from( 'post-crdt-save-remote-append-local-delete' ),
			Buffer.from( 'post-crdt-save-clear-stale-content' ),
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
			Buffer.from( 'table-query-array-local-delete-row-remote-append' ),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
	}

	if ( isHttpPollingTarget() ) {
		const seeds = [
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
				'http-polling-canary-provider-persisted-crdt-large-post-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-restore-state-storage-http-stale-since-token-replay-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-large-http-lifecycle-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-polling-canary-large-http-readiness-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect'
			),
			Buffer.from(
				'http-awareness-selection-propagation-canary-self-presence-ui-signals-rooms-3-updates-1-peers-4-steps-6-retry-now'
			),
			Buffer.from(
				'http-polling-stale-since-token-replay-rooms-12-updates-6-peers-16-steps-14-disconnect-reconnect'
			),
			Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
			Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
		];
		return filterHttpPollingSeedBuffersForFocus( seeds );
	}

	if ( isClientOverlayProjectionTarget() ) {
		return [
			Buffer.from( 'client-overlay-self-presence-cursor-paragraph' ),
			Buffer.from( 'client-overlay-self-presence-table-cell' ),
			Buffer.from( 'client-overlay-self-presence-selection-range' ),
			Buffer.from( 'client-overlay-self-presence-backward-selection' ),
			Buffer.from( 'client-overlay-self-presence-missing-target' ),
			Buffer.from( 'client-overlay-self-presence-own-hidden' ),
			Buffer.from(
				'client-overlay-self-presence-own-visible-with-remote'
			),
			Buffer.from( 'client-overlay-self-presence-stale-resolution' ),
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
		actionProfile.includes( 'client-overlay' ) ||
		actionProfile.includes( 'collaborator-cursor' ) ||
		targetPath.includes( 'collaborators-overlay' ) ||
		targetPath.includes( 'selection-overlay-projection' )
	) {
		return [
			'packages/editor/src/components/collaborators-overlay/overlay.tsx',
			'packages/editor/src/components/collaborators-overlay/compute-selection.ts',
			'packages/editor/src/components/collaborators-overlay/use-render-cursors.ts',
			'packages/editor/src/components/collaborators-overlay/cursor-dom-utils.ts',
			'packages/editor/src/components/collaborators-overlay/cursor-registry.ts',
			'packages/editor/src/components/collaborators-overlay/use-block-highlighting.ts',
			'packages/editor/src/components/collaborators-overlay/get-avatar-url.ts',
			'packages/editor/src/components/collaborators-overlay/use-debounced-recompute.ts',
			'packages/editor/src/components/collaborators-overlay/timing-utils.ts',
		];
	}

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
			parserSpecCoverageTarget(),
			'packages/html-entities/src/index.ts',
		];
	}


	if (
		actionProfile.includes( 'post-crdt-save-dirty' ) ||
		targetPath.includes( 'post-crdt-save-dirty' )
	) {
		return [
			'packages/core-data/src/entities.js',
			'packages/core-data/src/resolvers.js',
			'packages/core-data/src/sync.js',
			'packages/core-data/src/utils/crdt.ts',
			'packages/core-data/src/utils/crdt-blocks.ts',
			'packages/core-data/src/utils/crdt-text.ts',
			'packages/core-data/src/utils/crdt-utils.ts',
			'packages/rich-text/src/create.js',
			'packages/rich-text/src/to-html-string.js',
			'packages/sync/src/store/persistence.ts',
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

	for ( const key of coverageState.failureKeys ?? [] ) {
		if ( history.has( key ) ) {
			continue;
		}
		history.set( String( key ), {
			seen: 1,
			isolated: 0,
			source: 'coverage-state',
		} );
	}

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
	if ( isPostCrdtSaveDirtyTarget() && files.length > 0 ) {
		const priority = [];
		const rest = [];
		for ( const filePath of files ) {
			if ( isPostCrdtSaveDirtySeedFile( filePath ) ) {
				priority.push( filePath );
			} else {
				rest.push( filePath );
			}
		}
		return [ ...priority, ...rest ];
	}
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
				isHttpPollingFocusRelevantText( text ) &&
				( text.includes( 'canary-title-reload-http' ) ||
					text.includes( 'canary-existing-post-crdt-http' ) ||
					text.includes(
						'canary-provider-persisted-crdt-large-post'
					) ||
					text.includes( 'canary-restore-state-storage-http' ) ||
					text.includes( 'canary-large-http-lifecycle' ) ||
					text.includes( 'canary-large-http-readiness' ) );
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

function isPostCrdtSaveDirtySeedFile( filePath ) {
	try {
		return fs
			.readFileSync( filePath, 'utf8' )
			.includes( 'post-crdt-save-' );
	} catch {
		return false;
	}
}

function isAuditRegressionSeedFile( filePath ) {
	try {
		return isAuditRegressionSeedText(
			fs.readFileSync( filePath, 'utf8' )
		);
	} catch {
		return false;
	}
}

function isAuditRegressionSeedText( text ) {
	const lower = String( text || '' ).toLowerCase();
	if ( isPostCrdtSaveDirtyTarget() ) {
		return [
			'post-crdt-save-stale-trailing-delete',
			'post-crdt-save-remote-append-local-delete',
			'post-crdt-save-clear-stale-content',
		].some( ( fragment ) => lower.includes( fragment ) );
	}
	if ( isTableQueryArrayCrdtTarget() ) {
		return [
			'table-query-array-local-delete-row-remote-append',
			'table-query-array-reorder-row',
			'stale-local-table-snapshot',
		].some( ( fragment ) => lower.includes( fragment ) );
	}
	return false;
}

function makeBatch( attemptIndex ) {
	const files = prioritizedCorpusFiles( corpusFiles() );

	if ( isHttpPollingTarget() ) {
		return makeHttpPollingBatch( files, attemptIndex );
	}

	if ( auditRegressionMode ) {
		return makeAuditRegressionBatch( files, attemptIndex );
	}

	const batch = [];

	for ( let index = 0; index < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];
		const input = fs.readFileSync( filePath );
		batch.push(
			disableMutation ? input : mutateInput( input, attemptIndex, index )
		);
	}

	return batch;
}

function makeAuditRegressionBatch( files, attemptIndex ) {
	const auditFiles = files.filter( isAuditRegressionSeedFile );
	if ( auditFiles.length === 0 ) {
		return makeDefaultBatch( files, attemptIndex );
	}

	const batch = [];
	const usedFiles = new Set();

	for (
		let index = 0;
		index < auditFiles.length && batch.length < batchSize;
		index++
	) {
		const filePath = auditFiles[ index ];
		usedFiles.add( filePath );
		batch.push( fs.readFileSync( filePath ) );
	}

	for ( let index = 0; batch.length < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];
		if ( usedFiles.has( filePath ) && files.length > batch.length ) {
			continue;
		}
		const input = fs.readFileSync( filePath );
		batch.push(
			disableMutation ? input : mutateInput( input, attemptIndex, index )
		);
	}

	return batch;
}

function makeDefaultBatch( files, attemptIndex ) {
	const batch = [];

	for ( let index = 0; index < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];
		const input = fs.readFileSync( filePath );
		batch.push(
			disableMutation ? input : mutateInput( input, attemptIndex, index )
		);
	}

	return batch;
}

function makeHttpPollingBatch( files, attemptIndex ) {
	const focusFiles =
		httpPollingFocus === 'all'
			? files
			: files.filter( isHttpPollingSeedFileRelevantToFocus );
	const candidateFiles = focusFiles.length > 0 ? focusFiles : files;
	const canaryFiles = candidateFiles.filter( isHttpPollingCanarySeedFile );
	const batch = [];
	const usedFiles = new Set();

	for (
		let index = 0;
		index < canaryFiles.length && batch.length < batchSize;
		index++
	) {
		const filePath = canaryFiles[ index ];
		usedFiles.add( filePath );
		batch.push( fs.readFileSync( filePath ) );
	}

	for ( let index = 0; batch.length < batchSize; index++ ) {
		const filePath =
			candidateFiles[ ( attemptIndex + index ) % candidateFiles.length ];

		if (
			usedFiles.has( filePath ) &&
			candidateFiles.length > batch.length
		) {
			continue;
		}

		const input = fs.readFileSync( filePath );
		batch.push(
			disableMutation
				? input
				: mutateInput( input, attemptIndex, batch.length )
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

	if (
		isPostCrdtSaveDirtyTarget() &&
		input.toString( 'utf8' ).includes( 'post-crdt-save-' )
	) {
		// Keep semantic canary seeds stable so product regressions are retained.
		return input;
	}
	if (
		auditRegressionMode &&
		isAuditRegressionSeedText( input.toString( 'utf8' ) )
	) {
		return input;
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

function isTableQueryArrayCrdtTarget() {
	return (
		profile.includes( 'table-query-array' ) ||
		profile.includes( 'query-array-crdt' ) ||
		testPath.includes( 'table-query-array' ) ||
		testPath.includes( 'query-array-crdt' )
	);
}

function tableQueryArrayDirectOnlyEnvValue() {
	if ( ! isTableQueryArrayCrdtTarget() ) {
		return process.env.GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY;
	}

	return process.env.GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY === '1'
		? '1'
		: '0';
}


function isPostCrdtSaveDirtyTarget() {
	return (
		profile.includes( 'post-crdt-save-dirty' ) ||
		testPath.includes( 'post-crdt-save-dirty' )
	);
}

function isHttpPollingTarget() {
	return (
		profile.includes( 'http-polling' ) ||
		profile.includes( 'http-awareness' ) ||
		testPath.includes( 'http-polling' ) ||
		testPath.includes( 'polling-manager' )
	);
}

function isClientOverlayProjectionTarget() {
	return (
		profile.includes( 'client-overlay' ) ||
		profile.includes( 'collaborator-cursor' ) ||
		testPath.includes( 'collaborators-overlay' ) ||
		testPath.includes( 'selection-overlay-projection' )
	);
}

function defaultHttpPollingFocus() {
	if ( isHttpAwarenessSelectionTarget() ) {
		return 'self-presence';
	}
	if ( isHttpPollingTarget() ) {
		return 'large-http-readiness';
	}
	return 'all';
}

function isHttpAwarenessSelectionTarget() {
	return (
		profile.includes( 'http-awareness-selection' ) ||
		groupName.includes( 'http-awareness-selection' ) ||
		groupName.includes( 'self-presence' )
	);
}

function normalizeHttpPollingFocus( value ) {
	const normalized = String( value || 'all' )
		.trim()
		.toLowerCase();
	if ( normalized === 'all' || normalized === 'any' || normalized === '*' ) {
		return 'all';
	}
	if (
		normalized === 'same-user-stale-content' ||
		normalized === 'stale-content' ||
		normalized === 'stale-since-token' ||
		normalized === 'restore-state-storage' ||
		normalized === 'restore-state-storage-http'
	) {
		return 'same-user-stale-content';
	}

	const canaryFocuses = new Set( [
		'title-reload',
		'title-reload-http',
		'existing-post-crdt',
		'existing-post-crdt-http',
		'provider-persisted-crdt-large-post',
		'large-http-lifecycle',
		'large-http-readiness',
		'self-presence',
		'self-presence-ui-signals',
		'http-awareness-selection-propagation',
	] );
	if ( canaryFocuses.has( normalized ) ) {
		return normalized === 'self-presence-ui-signals' ||
			normalized === 'http-awareness-selection-propagation'
			? 'self-presence'
			: normalized;
	}

	return 'all';
}

function isHttpPollingFocusRelevantText( value ) {
	if ( httpPollingFocus === 'all' ) {
		return true;
	}

	const text = String( value || '' ).toLowerCase();
	const focusNeedles = {
		'same-user-stale-content': [
			'restore-state-storage',
			'stale-since-token',
			'stale-content',
			'server-update-union',
			'target-restore-state-storage-http',
		],
		'title-reload': [
			'canary-title-reload-http',
			'title-reload-http',
			'target-title-reload-http',
		],
		'title-reload-http': [
			'canary-title-reload-http',
			'title-reload-http',
			'target-title-reload-http',
		],
		'existing-post-crdt': [
			'canary-existing-post-crdt-http',
			'existing-post-crdt-http',
			'target-existing-post-crdt-http',
		],
		'existing-post-crdt-http': [
			'canary-existing-post-crdt-http',
			'existing-post-crdt-http',
			'target-existing-post-crdt-http',
		],
		'provider-persisted-crdt-large-post': [
			'canary-provider-persisted-crdt-large-post',
			'provider-persisted-crdt-large-post',
			'target-provider-persisted-crdt-large-post',
		],
		'large-http-lifecycle': [
			'canary-large-http-lifecycle',
			'large-http-lifecycle',
			'target-large-http-lifecycle',
		],
		'large-http-readiness': [
			'canary-large-http-readiness',
			'large-http-readiness',
			'target-large-http-readiness',
		],
		'self-presence': [
			'canary-self-presence-ui-signals',
			'self-presence-ui-signals',
			'target-self-presence-ui-signals',
			'http-awareness-selection-propagation',
			'awareness-selection',
			'selection-propagation',
			'overlay-candidates',
			'remote-cursor-overlay',
		],
	};
	return ( focusNeedles[ httpPollingFocus ] || [] ).some( ( needle ) =>
		text.includes( needle )
	);
}

function filterHttpPollingSeedBuffersForFocus( seeds ) {
	if ( httpPollingFocus === 'all' ) {
		return seeds;
	}
	const filtered = seeds.filter( ( seed ) =>
		isHttpPollingFocusRelevantText( seed.toString( 'utf8' ) )
	);
	return filtered.length > 0 ? filtered : seeds;
}

function filterHttpPollingFragmentsForFocus( fragments ) {
	if ( httpPollingFocus === 'all' ) {
		return fragments;
	}
	const filtered = fragments.filter( isHttpPollingFocusRelevantText );
	return filtered.length > 0 ? filtered : fragments;
}

function isHttpPollingSeedFileRelevantToFocus( filePath ) {
	try {
		return isHttpPollingFocusRelevantText(
			fs.readFileSync( filePath, 'utf8' )
		);
	} catch {
		return false;
	}
}

function isHttpPollingCanaryRelevantFeature( feature ) {
	if ( ! isHttpPollingFocusRelevantText( feature ) ) {
		return false;
	}

	return (
		feature.includes( 'canary-bridge' ) ||
		feature.includes( 'canary-persisted' ) ||
		feature.includes( 'canary-reload-convergence' ) ||
		feature.includes( 'restore-state-storage-canary' ) ||
		feature.includes( 'target-title-reload-http' ) ||
		feature.includes( 'target-existing-post-crdt-http' ) ||
		feature.includes( 'target-provider-persisted-crdt-large-post' ) ||
		feature.includes( 'target-restore-state-storage-http' ) ||
		feature.includes( 'target-large-http-lifecycle' ) ||
		feature.includes( 'target-large-http-readiness' ) ||
		feature.includes( 'target-self-presence-ui-signals' ) ||
		feature.includes( 'awareness-selection' )
	);
}

function isHttpPollingCanarySeedFile( filePath ) {
	try {
		const text = fs.readFileSync( filePath, 'utf8' ).toLowerCase();
		if ( ! isHttpPollingFocusRelevantText( text ) ) {
			return false;
		}
		return (
			text.includes( 'canary-title-reload-http' ) ||
			text.includes( 'canary-existing-post-crdt-http' ) ||
			text.includes( 'canary-provider-persisted-crdt-large-post' ) ||
			text.includes( 'canary-restore-state-storage-http' ) ||
			text.includes( 'canary-large-http-lifecycle' ) ||
			text.includes( 'canary-large-http-readiness' ) ||
			text.includes( 'canary-self-presence-ui-signals' ) ||
			text.includes( 'http-awareness-selection-propagation' )
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
		'http-polling-canary-provider-persisted-crdt-large-post-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-restore-state-storage-http-stale-since-token-replay-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-large-http-lifecycle-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect',
		'http-polling-canary-large-http-readiness-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect',
		'http-awareness-selection-propagation-canary-self-presence-ui-signals-rooms-3-updates-1-peers-4-steps-6-retry-now',
		'remote-cursor-overlay-selection-propagation-target-self-presence-ui-signals',
		'http-polling-stale-since-token-replay-rooms-12-updates-6-peers-16-steps-14-disconnect-reconnect',
		'visibility-retry-churn',
		'rooms-16-updates-5-peers-8',
		'rooms-18-updates-6-peers-16-steps-14',
		'disconnect-reconnect-retry-now-visibility',
	];
	const focusFragments = filterHttpPollingFragmentsForFocus( fragments );
	let text = input.toString( 'utf8' ).replace( /\0/g, '' );

	if ( ! text.trim() ) {
		text = focusFragments[ Math.floor( random() * focusFragments.length ) ];
	}

	const op = Math.floor( random() * 7 );
	const fragment =
		focusFragments[ Math.floor( random() * focusFragments.length ) ];
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

		if ( Array.isArray( parsed.keys ) ) {
			for ( const key of parsed.keys ) {
				if ( typeof key === 'string' && key ) {
					keys.add( key );
				}
			}
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

function classifyFailure( exitCode, stdout, stderr, oracleArtifactDir = null ) {
	if ( exitCode === 0 ) {
		return null;
	}

	const oracleFailureKeys = readOracleFailureKeys( oracleArtifactDir );

	if ( oracleFailureKeys.length > 0 ) {
		return {
			kind: 'oracle-failure',
			summary: oracleFailureKeys[ 0 ],
			oracleFailureKeys,
		};
	}

	const output = stripDiagnosticControls( `${ stderr }\n${ stdout }` );

	if (
		/Unexpected coverage-guided rich-text CRDT|RTC fuzz-only rich text merge postcondition failed|RTC fuzz-only query-array identity postcondition failed|RTC_BLOCK_PARSER_|RTC_HTTP_POLLING_|RTC_POST_CRDT_SAVE_DIRTY_|Local-only block attribute leaked|Object stringification leaked/.test(
			output
		)
	) {
		return {
			kind: 'oracle-failure',
			summary: summarizeFailure( output ),
			oracleFailureKeys,
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
			oracleFailureKeys,
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

	if ( failure.oracleFailureKeys?.length > 0 ) {
		return canonicalizeExplicitFailureKey( failure.oracleFailureKeys[ 0 ] );
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

function canonicalFailureKeys( failure ) {
	if ( ! failure ) {
		return [];
	}

	if ( failure.oracleFailureKeys?.length > 0 ) {
		return [
			...new Set(
				failure.oracleFailureKeys
					.map( ( key ) =>
						canonicalizeExplicitFailureKey(
							String( key ).replace( /:+$/, '' )
						)
					)
					.filter( Boolean )
			),
		].sort();
	}

	const key = canonicalFailureKey( failure );
	return key ? [ key ] : [];
}

function preferredCanonicalFailureKey( failure, knownFailureKeys = [] ) {
	const keys = canonicalFailureKeys( failure );
	if ( keys.length === 0 ) {
		return null;
	}

	const known = new Set( knownFailureKeys );
	return keys.find( ( key ) => ! known.has( key ) ) ?? keys[ 0 ];
}

function isCanonicalRtcOracleFailureKey( key ) {
	return /^RTC_[A-Z0-9_]+(?::|$)/u.test( String( key || '' ) );
}

function isAuditRegressionFailureKey( key ) {
	const text = String( key || '' );
	if ( ! text ) {
		return false;
	}

	const configured = String(
		process.env.RTC_CG_LOWER_LEVEL_AUDIT_FAILURE_KEYS || ''
	)
		.split( /[,\n]/u )
		.map( ( item ) => item.trim() )
		.filter( Boolean );
	for ( const item of configured ) {
		if ( item.endsWith( '*' ) && text.startsWith( item.slice( 0, -1 ) ) ) {
			return true;
		}
		if ( text === item ) {
			return true;
		}
	}

	return defaultAuditRegressionFailurePrefixes().some( ( prefix ) =>
		text.startsWith( prefix )
	);
}

function defaultAuditRegressionFailurePrefixes() {
	if ( isPostCrdtSaveDirtyTarget() ) {
		return [ 'RTC_POST_CRDT_SAVE_DIRTY_' ];
	}
	if ( isTableQueryArrayCrdtTarget() ) {
		return [ 'RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:' ];
	}
	if ( isParserTarget() ) {
		return [ 'RTC_BLOCK_PARSER_' ];
	}
	if ( isHttpPollingTarget() ) {
		return [ 'RTC_HTTP_POLLING_' ];
	}
	return [];
}

function readOracleFailureKeys( oracleArtifactDir ) {
	if ( ! oracleArtifactDir || ! fs.existsSync( oracleArtifactDir ) ) {
		return [];
	}

	let artifactPaths;
	try {
		artifactPaths = listJsonFiles( oracleArtifactDir );
	} catch {
		return [];
	}

	const keys = [];
	for ( const artifactPath of artifactPaths ) {
		let parsed;
		try {
			parsed = JSON.parse( fs.readFileSync( artifactPath, 'utf8' ) );
		} catch {
			continue;
		}

		if (
			typeof parsed.failureKey === 'string' &&
			/\bRTC_[A-Z0-9_]+(?::[A-Za-z0-9_.-]+)*/u.test( parsed.failureKey )
		) {
			keys.push( parsed.failureKey.replace( /:+$/, '' ) );
		}
	}

	return [ ...new Set( keys ) ].sort();
}

function canonicalizeExplicitFailureKey( key ) {
	const parts = key.split( ':' );
	const prefix = parts[ 0 ];

	return parts
		.filter( ( part, index ) => {
			if ( index === 0 ) {
				return true;
			}
			if (
				/^(?:shape|markers|hash|direct-hash|adapter-hash|mismatch-hash)-/u.test(
					part
				)
			) {
				return false;
			}
			if (
				( prefix === 'RTC_BLOCK_PARSER_ROUNDTRIP_DRIFT' ||
					prefix === 'RTC_BLOCK_PARSER_SPEC_DIVERGENCE' ) &&
				/^len-\d+$/u.test( part )
			) {
				return false;
			}
			return true;
		} )
		.join( ':' );
}

function isolatedFailureFromMinimization( minimization ) {
	const reproducer = minimization?.reproducers?.find(
		( candidate ) => candidate.failureKind
	);

	if ( ! reproducer ) {
		return null;
	}

	return {
		kind: reproducer.failureKind,
		summary: reproducer.failureSummary ?? null,
		oracleFailureKeys: reproducer.oracleFailureKeys ?? [],
	};
}

function isolatedExitOneFailureFromMinimization(
	minimization,
	expectedFailureKey
) {
	const reproducer = minimization?.reproducers?.find( ( candidate ) => {
		if (
			candidate.exitCode !== 1 ||
			candidate.failureKind !== 'oracle-failure'
		) {
			return false;
		}

		if ( ! expectedFailureKey ) {
			return true;
		}

		return (
			canonicalFailureKey( {
				kind: candidate.failureKind,
				summary: candidate.failureSummary ?? null,
				oracleFailureKeys: candidate.oracleFailureKeys ?? [],
			} ) === expectedFailureKey
		);
	} );

	if ( ! reproducer ) {
		return null;
	}

	return canonicalFailureKey( {
		kind: reproducer.failureKind,
		summary: reproducer.failureSummary ?? null,
		oracleFailureKeys: reproducer.oracleFailureKeys ?? [],
	} );
}

function duplicateFailureArtifactReason(
	failure,
	failureKey,
	knownFailureKeyBeforeAttempt
) {
	if ( ! suppressDuplicateFailureArtifacts ) {
		return null;
	}

	if ( failure?.kind !== 'oracle-failure' || ! failureKey ) {
		return null;
	}

	if ( ! knownFailureKeyBeforeAttempt ) {
		return null;
	}

	return `duplicate-canonical-failure-artifacts:${ failureKey }`;
}

function lowerLevelDiagnosticFailureClassification( {
	batchFailureCanonicalKey,
	failureCanonicalKey,
	isolatedFailureCanonicalKey,
	isolatedExitOneFailureKey,
	minimization,
} ) {
	if ( ! isTableQueryArrayCrdtTarget() ) {
		return null;
	}

	const sourceFailureKey = String(
		batchFailureCanonicalKey || failureCanonicalKey || ''
	);
	if (
		! sourceFailureKey.startsWith(
			'RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:'
		) ||
		! sourceFailureKey.includes( ':oracle-remote-marker:' )
	) {
		return null;
	}

	if ( isolatedFailureCanonicalKey || isolatedExitOneFailureKey ) {
		return null;
	}

	if ( ! minimization?.attempted ) {
		return null;
	}

	const checkedInputCount = Number( minimization.checkedInputCount ?? 0 );
	const inputCount = Number( minimization.inputCount ?? 0 );
	const truncated = Boolean( minimization.truncated );
	const reason = truncated
		? 'diagnostic-downscope-batch-only-remote-marker-isolation-truncated'
		: 'diagnostic-downscope-batch-only-remote-marker-no-isolated-reproducer';

	return {
		kind: 'diagnostic-downscope',
		key: `RTC_TABLE_QUERY_ARRAY_CRDT_BATCH_ONLY_REMOTE_MARKER_DIAGNOSTIC:${ stableHash(
			sourceFailureKey
		).slice( 0, 12 ) }`,
		reason,
		sourceFailureKey,
		checkedInputCount,
		inputCount,
		truncated,
		productYieldEligible: false,
		nextAction:
			'keep broad table/query-array mutation held; retarget the oracle/classifier before granting product-yield credit',
	};
}

function stableHash( value ) {
	return crypto.createHash( 'sha256' ).update( value ).digest( 'hex' );
}

function summarizeFailure( output ) {
	const lines = stripDiagnosticControls( output )
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	return (
		lines.find( ( line ) =>
			/\bRTC_[A-Z0-9_]+(?::[A-Za-z0-9_.-]+)*/u.test( line )
		) ||
		lines.find( ( line ) =>
			/Unexpected coverage-guided rich-text CRDT|RTC fuzz-only rich text merge postcondition failed|RTC fuzz-only query-array identity postcondition failed|Local-only block attribute leaked|Object stringification leaked|Cannot find module|Test suite failed to run|Timed out|ENOSPC|no space left on device|Error:|FAIL /i.test(
				line
			)
		) ||
		lines[ 0 ] ||
		null
	);
}

function stripDiagnosticControls( output ) {
	return String( output || '' )
		.replace(
			/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/gu,
			''
		)
		.replace(
			/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu,
			''
		);
}

function skippedKnownFailureMinimization( inputs, failureKey ) {
	return {
		attempted: false,
		reason: `known-canonical-failure:${ failureKey }`,
		failureCanonicalKey: failureKey,
		inputCount: inputs.length,
		checkedInputCount: 0,
		truncated: inputs.length > 0,
		runs: [],
		reproducers: [],
	};
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
	const oracleArtifactDir = path.join(
		dirs.work,
		`isolate-oracle-artifacts-${ stamp }-${ attemptIndex }-${ inputIndex }`
	);
	const isolateLogPath = path.join(
		dirs.logs,
		`${ groupName }-${ stamp }-attempt-${ attemptIndex }-input-${ inputIndex }-isolate.log`
	);
	fs.mkdirSync( oracleArtifactDir, { recursive: true } );
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
		GUTENBERG_RTC_CG_ORACLE_ARTIFACT_DIR: oracleArtifactDir,
		GUTENBERG_RTC_CG_SPEC_PARSER_PATH: isParserTarget()
			? parserSpecParserPath()
			: process.env.GUTENBERG_RTC_CG_SPEC_PARSER_PATH,
	};
	delete env.NODE_V8_COVERAGE;
	delete env.GUTENBERG_RTC_CG_INPUT_FILE;
	delete env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE;

	const started = Date.now();
	const result = useTableQueryArrayDirectRunner
		? runTableQueryArrayDirectBatch( {
				batch: [ input ],
				attempt: attemptIndex,
				featurePath,
				coverageDir: path.join(
					dirs.work,
					`isolate-coverage-${ stamp }-${ attemptIndex }-${ inputIndex }`
				),
				oracleArtifactDir,
		  } )
		: spawnSync(
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
		result.stderr || '',
		oracleArtifactDir
	);

	fs.writeFileSync(
		isolateLogPath,
		[
			`command=${ effectiveRunnerCommand }`,
			`attempt=${ attemptIndex }`,
			`input_index=${ inputIndex }`,
			`feature=${ featurePath }`,
			`oracle_artifacts=${ oracleArtifactDir }`,
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
		oracleArtifactDir,
		failureKind: singleFailure?.kind ?? null,
		failureSummary: singleFailure?.summary ?? null,
		oracleFailureKeys: singleFailure?.oracleFailureKeys ?? [],
	};
}

function saveFailureInputs(
	inputs,
	attemptIndex,
	logPath,
	failure,
	effectiveFailure,
	batchFailureCanonicalKey,
	isolatedFailureCanonicalKey,
	minimization,
	oracleArtifactDir,
	diagnosticFailureClassification = null
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
	const failureOracleArtifactDir = copyOracleArtifacts(
		oracleArtifactDir,
		path.join( failureDir, 'oracle-artifacts' )
	);

	fs.writeFileSync(
		path.join( failureDir, 'metadata.json' ),
		`${ JSON.stringify(
			{
				attempt: attemptIndex,
				logPath,
				failureKind:
					effectiveFailure?.kind ??
					failure?.kind ??
					'unknown-failure',
				failureSummary:
					effectiveFailure?.summary ?? failure?.summary ?? null,
				oracleFailureKeys:
					effectiveFailure?.oracleFailureKeys ??
					failure?.oracleFailureKeys ??
					[],
				failureCanonicalKey: canonicalFailureKey(
					effectiveFailure || failure
				),
				batchFailureSummary: failure?.summary ?? null,
				batchOracleFailureKeys: failure?.oracleFailureKeys ?? [],
				batchFailureCanonicalKey,
				isolatedFailureSummary:
					minimization?.reproducers?.[ 0 ]?.failureSummary ?? null,
				isolatedOracleFailureKeys:
					minimization?.reproducers?.[ 0 ]?.oracleFailureKeys ?? [],
				isolatedFailureCanonicalKey,
				diagnosticFailureClassification,
				oracleArtifactDir,
				failureOracleArtifactDir,
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
		copyOracleArtifacts(
			reproducer.oracleArtifactDir,
			path.join(
				failureDir,
				'reproducer-oracle-artifacts',
				`input-${ String( reproducer.index ).padStart( 4, '0' ) }`
			)
		);
	}

	return {
		dir: failureDir,
		failureOracleArtifactDir,
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

function copyOracleArtifacts( sourceDir, destinationDir ) {
	if ( ! sourceDir || ! fs.existsSync( sourceDir ) ) {
		return null;
	}

	let entries;
	try {
		entries = fs.readdirSync( sourceDir );
	} catch {
		return null;
	}

	if ( entries.length === 0 ) {
		return null;
	}

	try {
		fs.rmSync( destinationDir, { recursive: true, force: true } );
		fs.mkdirSync( path.dirname( destinationDir ), { recursive: true } );
		fs.cpSync( sourceDir, destinationDir, { recursive: true } );
		return destinationDir;
	} catch {
		return null;
	}
}

function hashInput( input ) {
	return crypto.createHash( 'sha256' ).update( input ).digest( 'hex' );
}
