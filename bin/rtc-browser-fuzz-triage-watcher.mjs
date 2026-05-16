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
const GATE_ONLY = args.includes( '--gate-only' );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-triage-watcher.mjs <run-output-dir> [--once] [--daemon] [--gate-only]',
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
			'  RTC_FUZZ_ANALYSIS_STATE_DIR=<run-output-dir>/.triage-watcher/analysis-tier',
			'  RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR=<run-output-dir>/.triage-watcher/deep-analysis-tier',
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
const ANALYSIS_STATE_DIR =
	process.env.RTC_FUZZ_ANALYSIS_STATE_DIR ??
	path.join( STATE_DIR, 'analysis-tier' );
const DEEP_ANALYSIS_STATE_DIR =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR ??
	path.join( STATE_DIR, 'deep-analysis-tier' );
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
	state.metrics = summarizeStateMetrics( state );
	await fs.mkdir( STATE_DIR, { recursive: true } );
	await fs.writeFile( STATE_PATH, JSON.stringify( state, null, 2 ) + '\n' );
}

function summarizeStateMetrics( state ) {
	const signatures = Object.values( state.signatures ?? {} );
	const suppressedStrictStartup =
		state.suppressedKnownNoise?.strictPreActionStartup ?? {};
	const statusCounts = {};
	const classificationCounts = {};
	const recommendedActionCounts = {};
	const equivalenceClassCounts = {};
	const preDecisionFamilyCounts = {};
	const semanticFamilyCounts = {};
	let likelyRealVisible = 0;
	let likelyRealMerged = 0;
	let likelyRealOracleQuestion = 0;
	let bootstrapStalls = 0;
	let normalizationNoiseCandidates = 0;

	for ( const signature of signatures ) {
		const status = signature.status ?? 'unknown';
		statusCounts[ status ] = ( statusCounts[ status ] ?? 0 ) + 1;

		const equivalenceClass = signature.equivalenceClass ?? 'unknown';
		equivalenceClassCounts[ equivalenceClass ] =
			( equivalenceClassCounts[ equivalenceClass ] ?? 0 ) + 1;

		const preDecisionFamily = getPreDecisionFamilyLabel( signature );
		preDecisionFamilyCounts[ preDecisionFamily ] =
			( preDecisionFamilyCounts[ preDecisionFamily ] ?? 0 ) + 1;

		if (
			equivalenceClass === 'pre-action-bootstrap-stall' ||
			status === 'bootstrap-stall'
		) {
			bootstrapStalls += 1;
		}

		if (
			equivalenceClass === 'linebreak-representation-drift' ||
			isLikelyNormalizationNoise( signature )
		) {
			normalizationNoiseCandidates += 1;
		}

		const decision = getSignatureDecision( signature );
		if ( ! decision ) {
			continue;
		}

		const classification = decision.classification ?? 'unknown';
		classificationCounts[ classification ] =
			( classificationCounts[ classification ] ?? 0 ) + 1;

		const action =
			decision.recommendedTriageAction ??
			decision.candidateStatus ??
			'unknown';
		recommendedActionCounts[ action ] =
			( recommendedActionCounts[ action ] ?? 0 ) + 1;

		const semanticFamily = getSemanticFamilyLabel( signature );
		semanticFamilyCounts[ semanticFamily ] =
			( semanticFamilyCounts[ semanticFamily ] ?? 0 ) + 1;

		if ( classification === 'likely_real' ) {
			if (
				action === 'merge_with_duplicate' ||
				decision.isDuplicateOf ||
				decision.duplicateOf
			) {
				likelyRealMerged += 1;
			} else if (
				signature.equivalenceClass ===
					'linebreak-representation-drift' ||
				isLikelyNormalizationNoise( signature )
			) {
				likelyRealOracleQuestion += 1;
			} else {
				likelyRealVisible += 1;
			}
		}
	}

	const topPreDecisionFamilies = Object.entries( preDecisionFamilyCounts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
	const topSemanticFamilies = Object.entries( semanticFamilyCounts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
	const topPreDecisionFamilyShare =
		signatures.length === 0 || topPreDecisionFamilies.length === 0
			? 0
			: Number(
					(
						topPreDecisionFamilies[ 0 ].count / signatures.length
					).toFixed( 4 )
			  );
	const topDuplicateFamilyShare =
		signatures.length === 0 || topSemanticFamilies.length === 0
			? 0
			: Number(
					(
						topSemanticFamilies[ 0 ].count / signatures.length
					).toFixed( 4 )
			  );

	return {
		updatedAt: new Date().toISOString(),
		signatureCount: signatures.length,
		statusCounts,
		classificationCounts,
		recommendedActionCounts,
		equivalenceClassCounts,
		likelyRealVisible,
		likelyRealMerged,
		likelyRealOracleQuestion,
		bootstrapStalls,
		normalizationNoiseCandidates,
		topPreDecisionFamilyShare,
		topPreDecisionFamilies,
		topDuplicateFamilyShare,
		topSemanticFamilies,
		suppressedKnownNoise: {
			strictPreActionStartup: suppressedStrictStartup,
		},
	};
}

function getSignatureDecision( signature ) {
	return signature.analysisGate ?? signature.result ?? null;
}

function getSemanticFamilyLabel( signature ) {
	const decision = getSignatureDecision( signature );
	return canonicalizeSemanticLabel(
		normalizeSemanticLabel(
			decision?.distinctBugType ??
				signature.equivalenceClass ??
				signature.familyKey ??
				signature.hash
		)
	);
}

function getPreDecisionFamilyLabel( signature ) {
	return canonicalizeSemanticLabel(
		normalizeSemanticLabel(
			signature.equivalenceClass ?? signature.familyKey ?? signature.hash
		)
	);
}

function normalizeSemanticLabel( value ) {
	return String( value ?? 'unknown' )
		.toLowerCase()
		.replaceAll( '`', '' )
		.replaceAll( "'", '' )
		.replaceAll( '"', '' )
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /_+/g, '_' )
		.replace( /^_|_$/g, '' );
}

function isLikelyNormalizationNoise( signature ) {
	const semanticFamily = getSemanticFamilyLabel( signature );
	if (
		[
			'linebreak_representation_drift',
			'cover_overlay_attribute_canonicalization',
		].includes( semanticFamily )
	) {
		return true;
	}

	const normalized = signature.normalized ?? '';
	return (
		/(core\/code|core\/preformatted|core\/verse)/.test( normalized ) &&
		/(<br\s*\/?>|\\n|linebreak|newline)/i.test( normalized )
	);
}

function canonicalizeSemanticLabel( normalized ) {
	if (
		/linebreak|newline|br.*serialization|codeblock|preformatted|verse/.test(
			normalized
		)
	) {
		return 'linebreak_representation_drift';
	}
	if ( /isuseroverlaycolor|cover.*overlay/.test( normalized ) ) {
		return 'cover_overlay_attribute_canonicalization';
	}
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			normalized
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if (
		/awareness.*reload|reload.*awareness|reload_rejoin/.test( normalized )
	) {
		return 'reload_rejoin_awareness_stall';
	}
	if ( /late.*join|late_join/.test( normalized ) ) {
		return 'late_join_lifecycle';
	}
	if (
		/blank.*content|empty.*content|content.*collapse|collapses_to_empty/.test(
			normalized
		)
	) {
		return 'persisted_content_collapse_or_empty_save';
	}
	if (
		/hydration.*drop|drops_blocks|reload.*drops.*block/.test( normalized )
	) {
		return 'reload_hydration_drops_blocks';
	}
	if (
		/stale.*save|overwrite|title.*revert|stale.*entity/.test( normalized )
	) {
		return 'stale_save_or_entity_overwrite';
	}
	if (
		/move|delete|reorder|table|structural|block_order/.test( normalized )
	) {
		return 'structural_move_delete_or_table_divergence';
	}

	return normalized;
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
	const strictPreActionStartup = createStrictStartupNoiseSummary();

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

			const candidate = {
				record,
				summaryPath,
				lineIndex: lineIndex + 1,
				signature: getFailureSignature( record ),
			};

			if ( isStrictPreActionStartupSignature( candidate.signature ) ) {
				recordSuppressedStrictStartupNoise(
					strictPreActionStartup,
					candidate
				);
				continue;
			}

			candidates.push( candidate );
		}
	}

	return {
		candidates,
		suppressedKnownNoise: {
			strictPreActionStartup:
				finalizeStrictStartupNoiseSummary(
					strictPreActionStartup
				),
		},
	};
}

function createStrictStartupNoiseSummary() {
	return {
		recordCount: 0,
		identityCount: 0,
		recordsByProfile: {},
		knownNoiseByFamily: {},
		knownNoiseByProfile: {},
		knownStartupNoiseByProfile: {},
		samples: [],
		identityKeys: new Set(),
	};
}

function recordSuppressedStrictStartupNoise( summary, candidate ) {
	const { record, signature, summaryPath, lineIndex } = candidate;
	const family = getStrictStartupKnownNoiseFamily( signature );
	const profile = getSignatureMetricProfile( signature );
	const seed = record.seed ?? 'unknown-seed';
	const source =
		record.logPath ??
		record.artifactsDir ??
		record.attempts?.[ 0 ]?.logPath ??
		record.attempts?.[ 0 ]?.artifactsDir ??
		summaryPath;
	const identityKey =
		seed === 'unknown-seed'
			? [ family, profile, source, signature.hash ].join( '\0' )
			: [ family, profile, seed ].join( '\0' );

	summary.recordCount += 1;
	incrementCounter( summary.recordsByProfile, profile );

	if ( ! summary.identityKeys.has( identityKey ) ) {
		summary.identityKeys.add( identityKey );
		summary.identityCount += 1;
		incrementCounter( summary.knownNoiseByFamily, family );
		incrementCounter( summary.knownNoiseByProfile, profile );
		incrementCounter( summary.knownStartupNoiseByProfile, profile );
	}

	if ( summary.samples.length >= 10 ) {
		return;
	}

	summary.samples.push( {
		summaryPath,
		lineIndex,
		kind: record.kind,
		seed: record.seed ?? null,
		family,
		profile,
		transport: signature.facts?.transport ?? 'unknown',
		logPath:
			record.logPath ?? record.attempts?.[ 0 ]?.logPath ?? null,
		artifactsDir:
			record.artifactsDir ??
			record.attempts?.[ 0 ]?.artifactsDir ??
			null,
	} );
}

function finalizeStrictStartupNoiseSummary( summary ) {
	const { identityKeys, ...serializableSummary } = summary;
	return serializableSummary;
}

function getStrictStartupKnownNoiseFamily( signature ) {
	const family = getPreDecisionFamilyLabel( signature );
	return family === 'pre_action_awareness_stall'
		? 'pre_action_bootstrap_stall'
		: family;
}

function getSignatureMetricProfile( signature ) {
	return signature?.facts?.actionProfile ?? 'unknown';
}

function incrementCounter( counter, key ) {
	counter[ key ] = ( counter[ key ] ?? 0 ) + 1;
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
	const facts = getFailureFacts( record, text );
	const family = getFailureFamily( facts, normalized );
	const hash = crypto
		.createHash( 'sha1' )
		.update( JSON.stringify( getSignatureHashFacts( facts, family ) ) )
		.update( '\n' )
		.update( normalized )
		.digest( 'hex' )
		.slice( 0, 12 );

	return {
		equivalenceClass: family.equivalenceClass,
		facts,
		familyKey: family.key,
		hash,
		normalized,
	};
}

function getSignatureHashFacts( facts, family ) {
	if ( family.equivalenceClass === 'operation-witness-missing' ) {
		return {
			actionProfile: facts.actionProfile,
			equivalenceClass: family.equivalenceClass,
			failureClass: facts.failureClass,
			lifecycleContext: facts.lifecycleContext,
			operationWitnessActions: facts.operationWitnessActions,
			operationWitnessPhase: facts.operationWitnessPhase,
			operationWitnessScopes: facts.operationWitnessScopes,
			transport: facts.transport,
			userCount: facts.userCount,
		};
	}

	return facts;
}

function getPrimaryCoverageRecord( record ) {
	const direct = record.behavioralCoverage?.find(
		( candidate ) => ! candidate.parseError
	);
	if ( direct ) {
		return direct;
	}

	for ( const attempt of record.attempts ?? [] ) {
		const coverage = attempt.behavioralCoverage?.find(
			( candidate ) => ! candidate.parseError
		);
		if ( coverage ) {
			return coverage;
		}
	}

	return null;
}

function classifyFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest-meta-database-error';
	}
	if ( /RTC operation witness missing/i.test( text ) ) {
		return 'operation-witness-missing';
	}
	if ( /Collaborative state did not converge/i.test( text ) ) {
		return 'collaboration-non-convergence';
	}
	if (
		/Saving failed|editor never left saving|save.*timed out/i.test( text )
	) {
		return 'save-stuck-or-failed';
	}
	if ( /persisted title|title marker/i.test( text ) ) {
		return 'persisted-title-mismatch';
	}
	if ( /persisted content|content marker/i.test( text ) ) {
		return 'persisted-content-mismatch';
	}
	if (
		/Target page, context or browser has been closed|browser has been closed/i.test(
			text
		)
	) {
		return 'browser-closed';
	}
	if ( /TimeoutError:/i.test( text ) ) {
		return 'timeout';
	}
	if ( /Error: expect\(/i.test( text ) ) {
		return 'assertion';
	}
	return 'unknown';
}

function parseOperationWitnessMissing( text ) {
	const match = text.match(
		/RTC operation witness missing during ([^:]+):\s*(\[[^\n]*\])/i
	);
	if ( ! match ) {
		return null;
	}

	const phase = match[ 1 ].trim();
	let entries = [];
	try {
		entries = JSON.parse( match[ 2 ] );
	} catch {
		entries = [];
	}

	const actionLabels = [
		...new Set(
			entries
				.map( ( entry ) => entry?.actionLabel )
				.filter( Boolean )
				.map( String )
		),
	].sort();
	const scopes = [
		...new Set(
			entries
				.map( ( entry ) => entry?.scope )
				.filter( Boolean )
				.map( String )
		),
	].sort();

	return {
		actionLabels,
		phase,
		scopes,
	};
}

function getLifecycleContext( coverage, witness, lastHistoryEvent ) {
	const phase = `${ witness?.phase ?? '' } ${
		lastHistoryEvent?.phase ?? ''
	}`.toLowerCase();

	if ( /revision/.test( phase ) || coverage?.revisionRestore?.eligible ) {
		return 'revision-restore';
	}
	if ( /late-join/.test( phase ) ) {
		return 'late-join';
	}
	if ( /same-user|rejoin/.test( phase ) ) {
		return 'same-user-rejoin';
	}
	if ( /reload/.test( phase ) || ( coverage?.reloads?.length ?? 0 ) > 0 ) {
		return 'reload';
	}
	if (
		/save|persisted/.test( phase ) ||
		( coverage?.saveCheckpointSteps?.length ?? 0 ) > 0
	) {
		return 'save';
	}
	return 'editing';
}

function getFailureFacts( record, text ) {
	const coverage = getPrimaryCoverageRecord( record );
	const actions = coverage?.actions ?? [];
	const historyEvents = coverage?.historyEvents ?? [];
	const lastHistoryEvent = historyEvents.at( -1 );
	const lastAction = actions.at( -1 );
	const operationWitness = parseOperationWitnessMissing( text );

	return {
		failureClass: classifyFailureText( text ),
		transport: coverage?.transport ?? 'unknown',
		actionProfile: coverage?.actionProfile ?? 'unknown',
		initialContentProfile: coverage?.initialContentProfile ?? 'unknown',
		coverageStatus: coverage?.status ?? 'unknown',
		lastAction: lastAction?.label ?? null,
		lastHistoryPhase: lastHistoryEvent?.phase ?? null,
		lastHistoryStatus: lastHistoryEvent?.status ?? null,
		reloadCount: coverage?.reloads?.length ?? 0,
		saveCheckpointCount: coverage?.saveCheckpointSteps?.length ?? 0,
		faultTypes: [
			...new Set(
				( coverage?.faults ?? [] ).map(
					( fault ) => `${ fault.type }:${ fault.status ?? 'delay' }`
				)
			),
		].sort(),
		revisionEligible: coverage?.revisionRestore?.eligible === true,
		blockTypes: coverage?.blockStats?.types ?? [],
		lifecycleContext: getLifecycleContext(
			coverage,
			operationWitness,
			lastHistoryEvent
		),
		operationWitnessActions: operationWitness?.actionLabels ?? [],
		operationWitnessPhase: operationWitness?.phase ?? null,
		operationWitnessScopes: operationWitness?.scopes ?? [],
		userCount: coverage?.userCount ?? 0,
	};
}

function normalizeFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest_meta_database_error wp_persisted_preferences';
	}

	const operationWitness = parseOperationWitnessMissing( text );
	if ( operationWitness ) {
		return [
			'RTC operation witness missing',
			`actions=${
				operationWitness.actionLabels.join( ',' ) || 'unknown'
			}`,
			`scopes=${ operationWitness.scopes.join( ',' ) || 'unknown' }`,
			`phase=${ operationWitness.phase || 'unknown' }`,
		].join( ' ' );
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
		.replaceAll( REPO_ROOT, '<REPO_ROOT>' )
		.replace( /seed-\d+/g, 'seed-<n>' )
		.replace( /test-failed-\d+\.(png|webm|zip)/g, 'test-failed-<n>.$1' )
		.replace( /trace\.zip/g, 'trace.zip' )
		.replace( /markerHash":"[^"]+"/g, 'markerHash":"<hash>"' )
		.replace( /markerHash: [a-f0-9]{8,}/gi, 'markerHash: <hash>' );
}

function getFailureEquivalenceClass( facts, normalized ) {
	if ( facts.failureClass === 'operation-witness-missing' ) {
		return 'operation-witness-missing';
	}

	if (
		/(core\/code|core\/preformatted|core\/verse)/.test( normalized ) &&
		/(<br\s*\/?>|\\n)/i.test( normalized ) &&
		facts.failureClass === 'collaboration-non-convergence'
	) {
		return 'linebreak-representation-drift';
	}

	if (
		facts.userCount === 0 &&
		facts.lastHistoryStatus === 'fail' &&
		/(waitForCollaborationReady|setPreferences|_wpCollaborationEnabled|collaboration to become ready|page\.waitForFunction)/i.test(
			normalized
		)
	) {
		return 'pre-action-bootstrap-stall';
	}

	if (
		/waitForMutualDiscovery|mutual discovery|awareness/i.test( normalized )
	) {
		return facts.userCount === 0
			? 'pre-action-awareness-stall'
			: 'late-session-awareness-stall';
	}

	return facts.failureClass;
}

function getBlockFamily( blockTypes = [] ) {
	if ( ! blockTypes.length ) {
		return 'none';
	}

	const structuralTypes = blockTypes.filter( ( blockType ) =>
		[
			'core/group',
			'core/columns',
			'core/column',
			'core/list',
			'core/list-item',
			'core/table',
			'core/table-row',
		].includes( blockType )
	);

	return ( structuralTypes.length ? structuralTypes : blockTypes )
		.slice()
		.sort()
		.join( ',' );
}

function getFailureFamily( facts, normalized ) {
	const equivalenceClass = getFailureEquivalenceClass( facts, normalized );
	if ( equivalenceClass === 'operation-witness-missing' ) {
		const family = {
			actionProfile: facts.actionProfile,
			equivalenceClass,
			failureClass: facts.failureClass,
			lifecycleContext: facts.lifecycleContext,
			operationWitnessActions:
				facts.operationWitnessActions?.join( ',' ) || 'unknown',
			operationWitnessPhase: facts.operationWitnessPhase ?? 'unknown',
			operationWitnessScopes:
				facts.operationWitnessScopes?.join( ',' ) || 'unknown',
			saveCheckpointCount:
				facts.saveCheckpointCount > 0 ? 'has-save-checkpoint' : 'none',
			transport: facts.transport,
			userCount: facts.userCount,
		};

		return {
			key: crypto
				.createHash( 'sha1' )
				.update( JSON.stringify( family ) )
				.digest( 'hex' )
				.slice( 0, 12 ),
			...family,
		};
	}

	const family = {
		actionProfile: facts.actionProfile,
		blockFamily: getBlockFamily( facts.blockTypes ),
		equivalenceClass,
		failureClass: facts.failureClass,
		initialContentProfile: facts.initialContentProfile,
		lastAction: facts.lastAction,
		lastHistoryPhase: facts.lastHistoryPhase,
		revisionEligible: facts.revisionEligible,
		saveCheckpointCount:
			facts.saveCheckpointCount > 0 ? 'has-save-checkpoint' : 'none',
		transport: facts.transport,
		userCount: facts.userCount,
	};

	return {
		key: crypto
			.createHash( 'sha1' )
			.update( JSON.stringify( family ) )
			.digest( 'hex' )
			.slice( 0, 12 ),
		...family,
	};
}

function groupCandidatesBySignature( candidates ) {
	const groups = new Map();

	for ( const candidate of candidates ) {
		const existing = groups.get( candidate.signature.hash ) ?? {
			equivalenceClass: candidate.signature.equivalenceClass,
			familyKey: candidate.signature.familyKey,
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
	pruneStrictPreActionStartupSignatures( state );

	for ( const group of groups ) {
		const existing = state.signatures[ group.hash ];
		const suppressedStatus = getSuppressedSignatureStatus(
			group.candidates[ 0 ]?.signature
		);
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
			existing.facts =
				existing.facts ??
				group.candidates[ 0 ]?.signature.facts ??
				null;
			existing.familyKey =
				existing.familyKey ??
				group.familyKey ??
				group.candidates[ 0 ]?.signature.familyKey ??
				null;
			existing.equivalenceClass =
				existing.equivalenceClass ??
				group.equivalenceClass ??
				group.candidates[ 0 ]?.signature.equivalenceClass ??
				null;
			if (
				suppressedStatus &&
				[ 'queued', 'retry', 'analysis-gated' ].includes(
					existing.status
				)
			) {
				existing.status = suppressedStatus;
				existing.suppressedByWatcher =
					getSuppressionReason( suppressedStatus );
			}
			existing.examples = mergeExamples( existing.examples, examples );
			continue;
		}

		const jobDir = path.join( STATE_DIR, 'signatures', group.hash );
		state.signatures[ group.hash ] = {
			equivalenceClass: group.equivalenceClass,
			familyKey: group.familyKey,
			hash: group.hash,
			status: suppressedStatus ?? 'queued',
			facts: group.candidates[ 0 ]?.signature.facts ?? null,
			normalized: group.normalized,
			count: group.candidates.length,
			firstSeenAt: new Date().toISOString(),
			lastSeenAt: new Date().toISOString(),
			attempts: 0,
			jobDir,
			examples,
			resultPath: path.join( jobDir, 'result.json' ),
		};
		if ( suppressedStatus ) {
			state.signatures[ group.hash ].suppressedByWatcher =
				getSuppressionReason( suppressedStatus );
		}
		await fs.mkdir( jobDir, { recursive: true } );
		await fs.writeFile(
			path.join( jobDir, 'failure.json' ),
			JSON.stringify( state.signatures[ group.hash ], null, 2 ) + '\n'
		);
	}
}

function pruneStrictPreActionStartupSignatures( state ) {
	let pruned = 0;

	for ( const [ hash, signature ] of Object.entries(
		state.signatures ?? {}
	) ) {
		if ( ! isStrictPreActionStartupSignature( signature ) ) {
			continue;
		}

		if ( signature.pid && isProcessAlive( signature.pid ) ) {
			try {
				process.kill( signature.pid, 'SIGTERM' );
			} catch {}
		}
		delete state.signatures[ hash ];
		pruned += 1;
	}

	if ( pruned > 0 ) {
		state.lastStrictPreActionStartupPrune = {
			at: new Date().toISOString(),
			count: pruned,
			reason:
				'strict pre-action startup/discovery records are aggregated as known-noise metrics instead of triage signatures',
		};
	}
}

function getSuppressedSignatureStatus( signature ) {
	const facts = signature?.facts;
	if ( ! facts ) {
		return null;
	}

	if (
		facts.failureClass === 'rest-meta-database-error' &&
		/wp_persisted_preferences/.test( signature.normalized ?? '' )
	) {
		return 'known-infra';
	}

	if ( isStrictPreActionStartupSignature( signature ) ) {
		return 'bootstrap-stall';
	}

	return null;
}

function isStrictPreActionStartupSignature( signature ) {
	const facts = signature?.facts;
	if ( ! facts ) {
		return false;
	}

	const normalized = signature.normalized ?? '';
	const equivalenceClass = signature.equivalenceClass ?? '';
	const isStartupFamily = [
		'pre-action-bootstrap-stall',
		'pre-action-awareness-stall',
	].includes( equivalenceClass );
	const hasStartupText =
		/waitForCollaborationReady|collaboration to become ready|setPreferences|_wpCollaborationEnabled|page\.waitForFunction|waitForMutualDiscovery|mutual discovery|awareness/i.test(
			normalized
		);

	if ( ! isStartupFamily && ! hasStartupText ) {
		return false;
	}

	const lastHistoryPhase = String( facts.lastHistoryPhase ?? '' );
	const hasStartupPhase =
		lastHistoryPhase === '' ||
		/seed|bootstrap|open|join|startup|setup|discovery|ready/i.test(
			lastHistoryPhase
		);

	if (
		facts.userCount === 0 &&
		! facts.lastAction &&
		hasStartupPhase &&
		( ! facts.lastHistoryStatus || facts.lastHistoryStatus === 'fail' ) &&
		( facts.reloadCount ?? 0 ) === 0 &&
		( facts.saveCheckpointCount ?? 0 ) === 0 &&
		facts.revisionEligible !== true &&
		( facts.faultTypes?.length ?? 0 ) === 0 &&
		( facts.operationWitnessActions?.length ?? 0 ) === 0 &&
		( facts.operationWitnessScopes?.length ?? 0 ) === 0 &&
		! facts.operationWitnessPhase &&
		[
			'timeout',
			'browser-closed',
			'unknown',
			'collaboration-non-convergence',
		].includes( facts.failureClass )
	) {
		return true;
	}

	return false;
}

function getSuppressionReason( status ) {
	if ( status === 'known-infra' ) {
		return 'known wp_persisted_preferences REST meta infra failure';
	}
	return 'pre-action startup/discovery failure';
}

function mergeExamples( currentExamples = [], newExamples = [] ) {
	const byKey = new Map();

	for ( const example of [ ...currentExamples, ...newExamples ] ) {
		byKey.set( `${ example.summaryPath }:${ example.lineIndex }`, example );
	}

	return [ ...byKey.values() ].slice( 0, 10 );
}

async function launchQueuedJobs( state ) {
	const analysisDecisions = await readAnalysisDecisions();
	const deepAnalysisDecisions = await readDeepAnalysisDecisions();
	const sortedSignatures = sortSignaturesForLaunch(
		Object.values( state.signatures ),
		analysisDecisions,
		deepAnalysisDecisions
	);
	const analysisGated = await applyAnalysisGates(
		sortedSignatures,
		analysisDecisions,
		deepAnalysisDecisions
	);
	if ( GATE_ONLY ) {
		state.lastAnalysisGatedCount = analysisGated;
		return;
	}

	const activeHashes = getActiveJobHashes( state );
	for ( const signature of sortedSignatures ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			state.lastAnalysisGatedCount = analysisGated;
			return;
		}

		if ( activeHashes.has( signature.hash ) ) {
			continue;
		}

		if ( ! shouldLaunch( signature ) ) {
			continue;
		}

		await launchCodexJob( state, signature );
		activeHashes.add( signature.hash );
	}

	state.lastAnalysisGatedCount = analysisGated;
}

async function applyAnalysisGates(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	let analysisGated = 0;

	for ( const signature of signatures ) {
		const gate = getAnalysisGate(
			analysisDecisions.get( signature.hash ),
			deepAnalysisDecisions.get( signature.hash )
		);
		if ( ! gate ) {
			continue;
		}

		if (
			signature.status === 'queued' ||
			signature.status === 'retry' ||
			signature.status === 'analysis-gated'
		) {
			signature.status = 'analysis-gated';
			signature.analysisGate = {
				gatedAt: new Date().toISOString(),
				sourceTier: gate.sourceTier,
				classification: gate.classification,
				confidence: gate.confidence,
				userHitLikelihoodScore: gate.userHitLikelihoodScore,
				userHitLikelihoodRationale: gate.userHitLikelihoodRationale,
				distinctBugType: gate.distinctBugType,
				isDuplicateOf: gate.isDuplicateOf,
				candidateStatus: gate.candidateStatus,
				recommendedTriageAction: gate.recommendedTriageAction,
				summary: gate.summary,
				resultPath: gate.resultPath,
			};
			await writeStatusMarkdown(
				path.join( signature.jobDir, 'STATUS.md' ),
				signature
			);
		}

		analysisGated += 1;
	}

	return analysisGated;
}

function getAnalysisGate( analysisDecision, deepAnalysisDecision ) {
	if ( shouldGateByDeepAnalysis( deepAnalysisDecision ) ) {
		return {
			sourceTier: 'deep-analysis-tier',
			classification: deepAnalysisDecision.classification,
			confidence: deepAnalysisDecision.confidence,
			userHitLikelihoodScore: normalizeUserHitLikelihoodScore(
				deepAnalysisDecision.userHitLikelihoodScore
			),
			userHitLikelihoodRationale:
				deepAnalysisDecision.userHitLikelihoodRationale ?? '',
			distinctBugType: deepAnalysisDecision.distinctBugType,
			isDuplicateOf: deepAnalysisDecision.duplicateOf,
			candidateStatus: deepAnalysisDecision.candidateStatus,
			recommendedTriageAction: deepAnalysisDecision.candidateStatus,
			summary: deepAnalysisDecision.summary,
			resultPath: deepAnalysisDecision.resultPath,
		};
	}

	if ( shouldGateByAnalysis( analysisDecision ) ) {
		return {
			sourceTier: 'analysis-tier',
			classification: analysisDecision.classification,
			confidence: analysisDecision.confidence,
			userHitLikelihoodScore: normalizeUserHitLikelihoodScore(
				analysisDecision.userHitLikelihoodScore
			),
			userHitLikelihoodRationale:
				analysisDecision.userHitLikelihoodRationale ?? '',
			distinctBugType: analysisDecision.distinctBugType,
			isDuplicateOf: analysisDecision.isDuplicateOf,
			candidateStatus: null,
			recommendedTriageAction: analysisDecision.recommendedTriageAction,
			summary: analysisDecision.summary,
			resultPath: analysisDecision.resultPath,
		};
	}

	return null;
}

function normalizeUserHitLikelihoodScore( value ) {
	const parsed =
		typeof value === 'number' ? value : Number.parseInt( value, 10 );
	if ( ! Number.isInteger( parsed ) ) {
		return 0;
	}

	return Math.max( 0, Math.min( 5, parsed ) );
}

async function readAnalysisDecisions() {
	const analysisStatePath = path.join( ANALYSIS_STATE_DIR, 'state.json' );
	let analysisState = null;

	try {
		analysisState = JSON.parse(
			await fs.readFile( analysisStatePath, 'utf8' )
		);
	} catch {
		return new Map();
	}

	const decisions = new Map();
	for ( const job of Object.values( analysisState.jobs ?? {} ) ) {
		if ( job.status !== 'completed' || ! job.resultPath ) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse( await fs.readFile( job.resultPath, 'utf8' ) );
		} catch {
			continue;
		}

		decisions.set( job.hash, {
			...result,
			resultPath: job.resultPath,
		} );
	}

	return decisions;
}

async function readDeepAnalysisDecisions() {
	const analysisStatePath = path.join(
		DEEP_ANALYSIS_STATE_DIR,
		'state.json'
	);
	let analysisState = null;

	try {
		analysisState = JSON.parse(
			await fs.readFile( analysisStatePath, 'utf8' )
		);
	} catch {
		return new Map();
	}

	const decisions = new Map();
	for ( const job of Object.values( analysisState.jobs ?? {} ) ) {
		if ( job.status !== 'completed' || ! job.resultPath ) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse( await fs.readFile( job.resultPath, 'utf8' ) );
		} catch {
			continue;
		}

		decisions.set( job.hash, {
			...result,
			resultPath: job.resultPath,
		} );
	}

	return decisions;
}

function shouldGateByAnalysis( analysisDecision ) {
	if ( ! analysisDecision ) {
		return false;
	}

	const gateAction = [
		'merge_with_duplicate',
		'suppress_as_infra',
		'keep_collecting',
	].includes( analysisDecision.recommendedTriageAction );

	return gateAction || analysisDecision.shouldDeepTriage === false;
}

function shouldGateByDeepAnalysis( deepAnalysisDecision ) {
	if ( ! deepAnalysisDecision ) {
		return false;
	}

	if (
		[
			'confirmed_likely_real',
			'needs_realistic_repro_search',
			'needs_more_evidence',
		].includes( deepAnalysisDecision.candidateStatus )
	) {
		return false;
	}

	return [ 'likely_duplicate', 'likely_false_positive' ].includes(
		deepAnalysisDecision.candidateStatus
	);
}

function sortSignaturesForLaunch(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	const sorted = [ ...signatures ].sort( ( left, right ) => {
		const leftPriority = getAnalysisLaunchPriority(
			analysisDecisions.get( left.hash ),
			deepAnalysisDecisions.get( left.hash )
		);
		const rightPriority = getAnalysisLaunchPriority(
			analysisDecisions.get( right.hash ),
			deepAnalysisDecisions.get( right.hash )
		);

		if ( leftPriority !== rightPriority ) {
			return leftPriority - rightPriority;
		}

		return ( right.count ?? 0 ) - ( left.count ?? 0 );
	} );
	const seenFamilies = new Set();
	const firstInFamily = [];
	const duplicateFamilyRest = [];

	for ( const signature of sorted ) {
		const familyKey = signature.familyKey ?? signature.hash;
		if ( seenFamilies.has( familyKey ) ) {
			duplicateFamilyRest.push( signature );
			continue;
		}

		seenFamilies.add( familyKey );
		firstInFamily.push( signature );
	}

	return [ ...firstInFamily, ...duplicateFamilyRest ];
}

function getAnalysisLaunchPriority( analysisDecision, deepAnalysisDecision ) {
	if (
		shouldGateByAnalysis( analysisDecision ) ||
		shouldGateByDeepAnalysis( deepAnalysisDecision )
	) {
		return 3;
	}

	if ( deepAnalysisDecision?.candidateStatus === 'confirmed_likely_real' ) {
		return 0;
	}

	if (
		deepAnalysisDecision?.candidateStatus === 'needs_realistic_repro_search'
	) {
		return 0;
	}

	if (
		analysisDecision?.shouldDeepTriage === true &&
		analysisDecision?.recommendedTriageAction === 'prioritize_deep_triage'
	) {
		return 0;
	}

	if ( analysisDecision?.shouldDeepTriage === true ) {
		return 1;
	}

	return 2;
}

function getActiveJobHashes( state ) {
	const hashes = new Set( activeJobs.keys() );

	for ( const signature of Object.values( state.signatures ) ) {
		if (
			signature.status === 'running' &&
			! fsSync.existsSync( signature.resultPath ) &&
			isProcessAlive( signature.pid )
		) {
			hashes.add( signature.hash );
		}
	}

	return hashes;
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
		signature.status = getStatusFromResult(
			result,
			result ? 0 : 1,
			signature
		);
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
	}
}

function shouldLaunch( signature ) {
	if (
		[
			'completed',
			'not-real',
			'infra',
			'bootstrap-stall',
			'known-infra',
			'no-realistic-repro',
			'analysis-gated',
		].includes( signature.status )
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
		nextSignature.status = getStatusFromResult(
			result,
			code,
			nextSignature
		);
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
}

function getStatusFromResult( result, code, signature = null ) {
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

	if (
		result.realisticPlaywrightRepro?.status === 'produced' &&
		! hasValidProducedPlaywrightRepro( result, signature )
	) {
		return 'retry';
	}

	return 'completed';
}

function hasValidProducedPlaywrightRepro( result, signature ) {
	const repro = result.realisticPlaywrightRepro;
	const reproPath = repro?.path;
	const command = repro?.command;
	const candidates = [];

	if ( ! reproPath || typeof reproPath !== 'string' ) {
		appendReproValidationNote(
			repro,
			'produced Playwright repro did not include a path'
		);
		return false;
	}

	if ( ! command || typeof command !== 'string' || ! command.trim() ) {
		appendReproValidationNote(
			repro,
			'produced Playwright repro did not include a command'
		);
		return false;
	}

	if ( path.isAbsolute( reproPath ) ) {
		candidates.push( reproPath );
	} else {
		candidates.push(
			path.resolve( signature?.jobDir ?? REPO_ROOT, reproPath ),
			path.resolve( REPO_ROOT, reproPath )
		);
	}

	if ( candidates.some( ( candidate ) => fsSync.existsSync( candidate ) ) ) {
		return true;
	}

	appendReproValidationNote(
		repro,
		`produced Playwright repro path was not found; checked ${ candidates.join(
			', '
		) }`
	);
	return false;
}

function appendReproValidationNote( repro, note ) {
	if ( ! repro ) {
		return;
	}

	repro.status = 'needs_more_time';
	repro.notes = [ repro.notes, `Watcher validation: ${ note }.` ]
		.filter( Boolean )
		.join( '\n' );
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
		`Semantic family key: ${ signature.familyKey ?? 'unknown' }`,
		`Equivalence class: ${ signature.equivalenceClass ?? 'unknown' }`,
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
		'2. Score user-hit likelihood as userHitLikelihoodScore from 0 to 5, where 0 means harness-only/not user-visible, 1 means very rare or developer-only, 2 means uncommon edge workflow, 3 means plausible normal collaborative editing workflow, 4 means common workflow or common content shape, and 5 means very likely in default/common use. Explain the score in userHitLikelihoodRationale.',
		'3. Compare the examples and decide whether they are one distinct bug type or duplicates of another signature in the same run.',
		'4. If it may be real, try to reproduce at every useful level: unit, REST/API, browser/manual, and Playwright.',
		'5. A Playwright repro must use real user actions and real editor/browser behavior. Do not use fault injection, artificial route blocking, artificial sleeps as a cause, or direct state mutation as the repro mechanism.',
		'6. If a realistic Playwright repro is not obvious, keep trying in a bounded loop until the repro-hours budget is spent or a realistic repro is found.',
		'7. Write durable artifacts in the triage job directory: analysis.md, bug-report.md for real bugs, false-positive.md for not-real/infra, and any repro files or commands you create.',
		'8. If after the bounded search the issue is not real or cannot be reproduced realistically, document why and recommend keep_fuzzing, suppress_as_infra, or manual_triage as appropriate.',
		'9. Do not revert user changes. If you edit repository files, keep changes narrowly scoped and list them in changedFiles.',
		'10. Keep filesystem searches narrow. Do not run broad `find`/`rg` scans rooted at the repository root, `artifacts/rtc-browser-fuzz`, `test/e2e/artifacts`, or parent directories. Search only the triage job directory, the current fuzz run directory, the listed example artifact directories, and specific source files discovered with `git ls-files` or direct paths.',
		"11. Do not search historical fuzz generations unless an exact related signature path is already listed in this prompt. If you need duplicate context, read this run's watcher/analysis state files instead of walking the artifact tree.",
		'12. The active fuzz environment is the wp-env test environment on port 8950. Check it with: WP_ENV_PORT=8950 WP_BASE_URL=http://localhost:8950 npm run wp-env-test -- status. Do not use npm run wp-env status for this run; that checks a different development environment and may be stopped.',
		'13. Do not stop, start, clean, or reset the shared fuzz environment while fuzz lanes are running. If a reproduction needs a separate environment, create a separate worktree or terminal with a different port and document it.',
		'14. Never run a Playwright repro command against the shared port 8950 environment unless the command sets GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1, GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1, WP_ENV_PORT=8950, WP_BASE_URL=http://localhost:8950, and WP_ARTIFACTS_PATH under the triage job directory. The default Playwright global setup deletes all posts and can invalidate active fuzz lanes.',
		'15. Do not run tests or fixtures that call deleteAllPosts(), deleteAllUsers(), wp-env clean, wp-env start, or other destructive shared-environment cleanup against port 8950 while fuzz lanes are active. Use a separate worktree/port for destructive reproduction attempts.',
		'16. You may launch additional codex exec processes or terminal subprocesses for independent repro searches when helpful. Keep every artifact and status file under the triage job directory.',
		'17. Prefer Codex-heavy trace, screenshot, log, and code analysis before starting browser work. Only launch Playwright once you have a concrete hypothesis, and do not run multiple long browser loops concurrently from this job.',
		'18. Do not run `npm run wp-env-test start`, `npm run wp-env start`, or default `.wp-env.test.json` startup from `/Users/danluu/dev/fuzz/gutenberg` or `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz`; those are shared fuzz environments. If browser repro work needs a WordPress environment, create a job-local wp-env config under the triage job directory with a unique non-shared port and run `npm exec wp-env --config <that-config> start` only for that isolated environment.',
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
		`Family key: ${ signature.familyKey ?? 'unknown' }`,
		`Equivalence class: ${ signature.equivalenceClass ?? 'unknown' }`,
		`Attempts: ${ signature.attempts }`,
		`Completed: ${ signature.lastCompletedAt ?? 'not completed' }`,
		'',
	];

	if ( result ) {
		lines.push(
			`Classification: ${ result.classification }`,
			`Confidence: ${ result.confidence }`,
			`User hit likelihood: ${ normalizeUserHitLikelihoodScore(
				result.userHitLikelihoodScore
			) }/5`,
			`User hit likelihood rationale: ${
				result.userHitLikelihoodRationale ?? ''
			}`,
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
	} else if ( signature.analysisGate ) {
		lines.push(
			'Deep triage launch was gated by the high-parallel analysis tier.',
			'',
			`Analysis tier: ${
				signature.analysisGate.sourceTier ?? 'analysis-tier'
			}`,
			`Analysis classification: ${ signature.analysisGate.classification }`,
			`Analysis confidence: ${ signature.analysisGate.confidence }`,
			`User hit likelihood: ${ normalizeUserHitLikelihoodScore(
				signature.analysisGate.userHitLikelihoodScore
			) }/5`,
			`User hit likelihood rationale: ${
				signature.analysisGate.userHitLikelihoodRationale ?? ''
			}`,
			`Distinct bug type: ${ signature.analysisGate.distinctBugType }`,
			`Duplicate of: ${ signature.analysisGate.isDuplicateOf ?? 'none' }`,
			`Candidate status: ${
				signature.analysisGate.candidateStatus ?? 'none'
			}`,
			`Recommended triage action: ${ signature.analysisGate.recommendedTriageAction }`,
			`Analysis result: ${ signature.analysisGate.resultPath }`,
			'',
			signature.analysisGate.summary
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
	const { candidates, suppressedKnownNoise } =
		await readFailureCandidates();
	state.suppressedKnownNoise = suppressedKnownNoise;
	const groups = groupCandidatesBySignature( candidates );
	await updateDiscoveredSignatures( state, groups );
	await reconcileExternallyCompletedJobs( state );
	await launchQueuedJobs( state );
	await writeState( state );
	process.stdout.write(
		`[${ new Date().toISOString() }] candidates=${
			candidates.length
		} suppressedStartup=${
			suppressedKnownNoise.strictPreActionStartup.recordCount
		} signatures=${ groups.length } active=${
			getActiveJobHashes( state ).size
		} analysisGated=${ state.lastAnalysisGatedCount ?? 0 }\n`
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
