#!/usr/bin/env node
/**
 * Audited backend/API fuzz runner for RTC autosave and CRDT meta oracles.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

const repoDir = process.env.RTC_BACKEND_API_FUZZ_REPO_DIR || process.cwd();
const runRoot =
	process.env.RTC_BACKEND_API_FUZZ_RUN_ROOT ||
	path.join(
		process.env.RTC_BACKEND_API_FUZZ_OUTPUT_DIR ||
			'/media/volume/danluu-fuzz-data/rtc-backend-api-fuzz-20260518',
		'runs',
		process.env.RTC_BACKEND_API_FUZZ_RUN_ID || new Date().toISOString().replace( /[-:.]/g, '' )
	);
const runId =
	process.env.RTC_BACKEND_API_FUZZ_RUN_ID || path.basename( runRoot ).replace( /^backend-api-/, '' );
const lane = Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_LANE || '0', 10 );
const laneCount = Math.max( 1, Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_LANE_COUNT || '1', 10 ) );
const seedStart = Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_START_SEED || `${ Math.floor( Date.now() / 1000 ) }`, 10 );
const seedCount = Math.max( 1, Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_SEED_COUNT || '1000000', 10 ) );
const caseCount = Math.max( 1, Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_CASE_COUNT || '40', 10 ) );
const seedTimeoutMs = Math.max(
	1000,
	Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_SEED_TIMEOUT_MS || '120000', 10 )
);
const wpEnvPort = process.env.RTC_BACKEND_API_FUZZ_WP_ENV_PORT || process.env.WP_ENV_PORT || '9540';
const wpEnvBin = process.env.RTC_BACKEND_API_FUZZ_WP_ENV_BIN || './node_modules/.bin/wp-env';
const wpEnvConfig = process.env.RTC_BACKEND_API_FUZZ_WP_ENV_CONFIG || '.wp-env.test.json';
const tablePrefix =
	process.env.RTC_BACKEND_API_FUZZ_TABLE_PREFIX ||
	`rtcbapi_${ runId.replace( /[^A-Za-z0-9_]/g, '_' ).slice( 0, 24 ) }_${ lane }_`;
const buildArtifactWaitMs = Math.max(
	0,
	Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_BUILD_ARTIFACT_WAIT_MS || '180000', 10 )
);
const buildArtifactPollMs = Math.max(
	1000,
	Number.parseInt( process.env.RTC_BACKEND_API_FUZZ_BUILD_ARTIFACT_POLL_MS || '5000', 10 )
);
const requiredBuildArtifacts = [
	'build/build.php',
	'build/styles.php',
	'build/scripts/block-library/blocks-manifest.php',
	'build/scripts/edit-widgets/blocks/blocks-manifest.php',
	'build/scripts/widgets/blocks/blocks-manifest.php',
];

const group = 'backend-api-autosave-meta';
const generationName = `${ group }-gen-${ lane }-${ runId }`;
const generationDir = path.join( runRoot, generationName );
const laneDir = path.join( generationDir, `lane-${ lane }` );
const statusPath = path.join( runRoot, 'status.tsv' );
const eventsPath = path.join( runRoot, 'events.ndjson' );

function mkdirp( filePath ) {
	fs.mkdirSync( filePath, { recursive: true } );
}

function nowIso() {
	return new Date().toISOString();
}

function appendLine( filePath, line ) {
	fs.appendFileSync( filePath, `${ line }\n` );
}

function writeJson( filePath, value ) {
	mkdirp( path.dirname( filePath ) );
	fs.writeFileSync( filePath, `${ JSON.stringify( value, null, 2 ) }\n` );
}

function appendEvent( event ) {
	appendLine(
		eventsPath,
		JSON.stringify( {
			at: nowIso(),
			fuzzLevel: 'backend-api',
			generationName,
			group,
			groupName: group,
			laneIndex: lane,
			laneLabel: `lane-${ lane }`,
			profile: 'rtc-backend-api-autosave-meta',
			runId,
			schemaVersion: 1,
			target: 'wp/v2/posts/autosaves+_crdt_document',
			transport: 'phpunit-rest-api',
			version: 1,
			...event,
		} )
	);
}

function classifyFailure( output ) {
	const lower = output.toLowerCase();
	if (
		lower.includes( 'failed to open stream' ) ||
		lower.includes( 'environment not initialized' ) ||
		lower.includes( 'no such file or directory' ) ||
		lower.includes( 'run `wp-env start` first' ) ||
		lower.includes( 'base table or view not found' ) ||
		lower.includes( 'wordpress database error' ) ||
		lower.includes( 'one or more database tables are unavailable' ) ||
		lower.includes( 'wp_die() called' ) ||
		lower.includes( 'service "wordpress" is not running' ) ||
		lower.includes( 'container' ) ||
		lower.includes( 'command failed with exit code 125' )
	) {
		return {
			classification: 'infra-failure',
			failureKind: 'environment',
		};
	}
	return {
		classification: 'assertion-failure',
		failureKind: 'backend-api-oracle',
	};
}

function failureMessage( output ) {
	return output
		.split( /\r?\n/ )
		.filter( Boolean )
		.slice( -24 )
		.join( '\n' )
		.slice( 0, 4000 );
}

function hashText( text ) {
	return crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ).slice( 0, 16 );
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function missingBuildArtifacts() {
	return requiredBuildArtifacts.filter(
		( relativePath ) => ! fs.existsSync( path.join( repoDir, relativePath ) )
	);
}

async function waitForBuildArtifacts( seed ) {
	const started = Date.now();
	let missing = missingBuildArtifacts();
	if ( missing.length === 0 ) {
		return;
	}

	appendEvent( {
		kind: 'build-artifacts-wait-start',
		missing,
		seed,
		waitMs: buildArtifactWaitMs,
	} );

	while ( missing.length > 0 && Date.now() - started < buildArtifactWaitMs ) {
		await sleep( buildArtifactPollMs );
		missing = missingBuildArtifacts();
	}

	appendEvent( {
		kind: 'build-artifacts-wait-complete',
		durationMs: Date.now() - started,
		missing,
		ok: missing.length === 0,
		seed,
	} );

	if ( missing.length > 0 ) {
		throw new Error(
			`Required backend/API build artifacts were still missing after ${ buildArtifactWaitMs }ms: ${ missing.join(
				', '
			) }`
		);
	}
}

function runCommand( command, args, options ) {
	return new Promise( ( resolve ) => {
		const child = spawn( command, args, {
			cwd: repoDir,
			env: {
				...process.env,
				WP_ENV_PORT: wpEnvPort,
			},
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		} );
		let output = '';
		let timedOut = false;
		const timer = setTimeout( () => {
			timedOut = true;
			child.kill( 'SIGTERM' );
			setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
		}, options.timeoutMs );

		child.stdout.on( 'data', ( chunk ) => {
			output += chunk.toString();
		} );
		child.stderr.on( 'data', ( chunk ) => {
			output += chunk.toString();
		} );
		child.on( 'close', ( code, signal ) => {
			clearTimeout( timer );
			resolve( {
				code: timedOut ? 124 : code ?? 1,
				signal,
				output,
				timedOut,
			} );
		} );
	} );
}

function seedCommand( seed, seedDir ) {
	const containerArtifactDir = `/var/www/html/wp-content/plugins/gutenberg/artifacts/.rtc-backend-api-fuzz/${ runId }/lane-${ lane }/seed-${ seed }`;
	const args = [
		'--config',
		wpEnvConfig,
		'run',
		'--env-cwd=wp-content/plugins/gutenberg',
		'wordpress',
		'env',
		`RTC_BACKEND_API_FUZZ_SEED_START=${ seed }`,
		'RTC_BACKEND_API_FUZZ_SEED_COUNT=1',
		`RTC_BACKEND_API_FUZZ_CASE_COUNT=${ caseCount }`,
		`RTC_BACKEND_API_FUZZ_TRACE_DIR=${ containerArtifactDir }`,
		`RTC_BACKEND_API_FUZZ_SUMMARY_DIR=${ containerArtifactDir }`,
		`WORDPRESS_TABLE_PREFIX=${ tablePrefix }`,
		'vendor/bin/phpunit',
		'-c',
		'phpunit.xml.dist',
		'--filter',
		'Tests_Collaboration_BackendApiAutosaveMetaFuzz::test_seeded_autosave_revision_and_crdt_meta_state_machine',
		'phpunit/tests/collaboration/backendApiAutosaveMetaFuzz.php',
	];
	return {
		command: wpEnvBin,
		args,
		containerArtifactDir,
		phpArtifactDir: path.join(
			repoDir,
			'artifacts/.rtc-backend-api-fuzz',
			runId,
			`lane-${ lane }`,
			`seed-${ seed }`
		),
		seedDir,
	};
}

function readSummary( seed, phpArtifactDir ) {
	const summaryPath = path.join( phpArtifactDir, `seed-${ seed }-summary.json` );
	try {
		return {
			summaryPath,
			summary: JSON.parse( fs.readFileSync( summaryPath, 'utf8' ) ),
		};
	} catch {
		return {
			summaryPath,
			summary: null,
		};
	}
}

async function runSeed( seed ) {
	const seedDir = path.join( laneDir, `seed-${ seed }` );
	mkdirp( seedDir );
	await waitForBuildArtifacts( seed );
	const spec = seedCommand( seed, seedDir );
	const logPath = path.join( seedDir, 'phpunit.log' );
	const replayPath = path.join( seedDir, `seed-${ seed }-replay.json` );
	const started = Date.now();

	writeJson( replayPath, {
		caseCount,
		command: spec.command,
		args: spec.args,
		seed,
		tablePrefix,
	} );
	appendEvent( {
		kind: 'seed-start',
		caseCount,
		seed,
	} );
	appendEvent( {
		kind: 'seed-attempt-start',
		args: spec.args,
		caseCount,
		command: spec.command,
		individualTestExecutionCount: caseCount,
		label: 'primary',
		phpArtifactDir: spec.phpArtifactDir,
		seed,
		seedDir,
		testExecutionCount: caseCount,
	} );

	const result = await runCommand( spec.command, spec.args, {
		timeoutMs: seedTimeoutMs,
	} );
	fs.writeFileSync( logPath, result.output );
	const durationMs = Date.now() - started;
	const { summaryPath, summary } = readSummary( seed, spec.phpArtifactDir );
	const ok = result.code === 0 && summary?.ok === true;
	const classification = ok ? 'pass' : classifyFailure( result.output ).classification;
	const failureKind = ok ? null : classifyFailure( result.output ).failureKind;
	const message = ok ? '' : failureMessage( result.output );
	const failureHash = ok ? null : hashText( message );
	const tracePath = path.join( spec.phpArtifactDir, `seed-${ seed }-trace.ndjson` );

	appendEvent( {
		kind: 'seed-attempt-complete',
		caseCount,
		classification,
		durationMs,
		exitCode: result.code,
		failureHash,
		failureKind,
		failureMessage: message || undefined,
		individualTestExecutionCount: caseCount,
		label: 'primary',
		logPath,
		ok,
		oracleCounts: summary?.counts || {},
		replayPath,
		seed,
		seedDir,
		summaryPath,
		testExecutionCount: caseCount,
		tracePath,
	} );
	appendEvent( {
		kind: 'seed-classified',
		classification,
		failureHash,
		failureKind,
		seed,
	} );
	appendEvent( {
		kind: 'seed-complete',
		ok,
		seed,
	} );
	appendLine(
		statusPath,
		[
			nowIso(),
			'level=backend-api',
			`group=${ group }`,
			`lane=${ lane }`,
			`seed=${ seed }`,
			`exit=${ result.code }`,
			`classification=${ classification }`,
			`failureKind=${ failureKind || '' }`,
			`testExecutionCount=${ caseCount }`,
			`log=${ logPath }`,
			`summary=${ summaryPath }`,
		].join( '\t' )
	);

	return {
		ok,
		classification,
		failureKind,
		seed,
	};
}

async function main() {
	mkdirp( runRoot );
	mkdirp( laneDir );
	writeJson( path.join( runRoot, 'supervisor-groups.json' ), [
		{
			name: group,
			fuzzLevel: 'backend-api',
			lanes: laneCount,
			transport: 'phpunit-rest-api',
			profile: 'rtc-backend-api-autosave-meta',
			runnerCommand: `${ wpEnvBin } phpunit backend API fuzz`,
			executionStrategy: 'wp-env-phpunit-per-seed',
			batchSize: caseCount,
		},
	] );

	appendEvent( {
		kind: 'runner-start',
		caseCount,
		laneCount,
		seedCount,
		seedStart,
		tablePrefix,
	} );

	let infraFailures = 0;
	for ( let offset = lane; offset < seedCount; offset += laneCount ) {
		const seed = seedStart + offset;
		const result = await runSeed( seed );
		if ( result.classification === 'infra-failure' ) {
			infraFailures += 1;
		} else {
			infraFailures = 0;
		}
		if ( infraFailures >= 3 ) {
			appendEvent( {
				kind: 'runner-error',
				error: 'stopping after 3 consecutive infra failures',
				failureKind: result.failureKind,
				lastSeed: result.seed,
			} );
			break;
		}
	}

	appendEvent( {
		kind: 'runner-stop',
		stopReason: 'seed budget exhausted or runner stopped',
	} );
}

main().catch( ( error ) => {
	appendEvent( {
		kind: 'runner-error',
		error: error?.stack || String( error ),
	} );
	process.exitCode = 1;
} );
