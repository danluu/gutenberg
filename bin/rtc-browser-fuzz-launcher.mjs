#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const NODE_BIN = path.join(
	REPO_ROOT,
	'.tooling/node-v20.19.0-darwin-arm64/bin/node'
);
const NPM_BIN = path.join(
	REPO_ROOT,
	'.tooling/node-v20.19.0-darwin-arm64/bin/npm'
);
const RESOLVED_NODE_BIN = await resolveExecutable( NODE_BIN, 'node' );
const RESOLVED_NPM_BIN = await resolveExecutable( NPM_BIN, 'npm' );
const SHARED_PATH = [
	path.join( REPO_ROOT, '.tooling/node-v20.19.0-darwin-arm64/bin' ),
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH ?? '',
].join( path.delimiter );
const START_SEED = getPositiveIntegerEnv( 'RTC_FUZZ_START_SEED', 1007 );
const START_SEEDS = getOptionalPositiveIntegerListEnv( 'RTC_FUZZ_START_SEEDS' );
const STEP_COUNT = getPositiveIntegerEnv( 'RTC_FUZZ_STEP_COUNT', 12 );
const DURATION_HOURS = getPositiveNumberEnv( 'RTC_FUZZ_DURATION_HOURS', 12 );
const LANE_COUNT = getPositiveIntegerEnv(
	'RTC_FUZZ_PARALLEL_LANES',
	getPerformanceCoreCount()
);
const TOTAL_SEED_STRIDE = getPositiveIntegerEnv(
	'RTC_FUZZ_TOTAL_SEED_STRIDE',
	LANE_COUNT
);
const OUTPUT_DIR =
	process.env.RTC_FUZZ_OUTPUT_DIR ??
	path.join(
		REPO_ROOT,
		'artifacts/rtc-browser-fuzz',
		`background-${ createTimestamp() }`
	);

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

function getOptionalPositiveIntegerListEnv( name ) {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return null;
	}

	const values = rawValue
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean )
		.map( ( value ) => Number.parseInt( value, 10 ) );

	if (
		values.length === 0 ||
		values.some( ( value ) => ! Number.isInteger( value ) || value <= 0 )
	) {
		throw new Error(
			`Expected ${ name } to be a comma-separated list of positive integers.`
		);
	}

	return values;
}

async function resolveExecutable( preferredPath, executableName ) {
	try {
		await fs.access( preferredPath );
		return preferredPath;
	} catch {}

	if ( executableName === 'node' ) {
		return process.execPath;
	}

	try {
		return execFileSync( 'which', [ executableName ], {
			encoding: 'utf8',
		} ).trim();
	} catch {
		throw new Error(
			`Could not find ${ executableName }. Checked ${ preferredPath } and PATH.`
		);
	}
}

function createTimestamp() {
	return new Date()
		.toISOString()
		.replaceAll( '-', '' )
		.replaceAll( ':', '' )
		.replace( /\.\d+Z$/, 'Z' )
		.replace( 'T', 'T' );
}

function getPerformanceCoreCount() {
	try {
		const output = execFileSync(
			'sysctl',
			[ '-n', 'hw.perflevel0.physicalcpu_max' ],
			{
				encoding: 'utf8',
			}
		).trim();
		const parsedValue = Number.parseInt( output, 10 );

		if ( ! Number.isNaN( parsedValue ) && parsedValue > 0 ) {
			return parsedValue;
		}
	} catch {}

	const fallback = os.cpus().length;
	return Math.max( 1, fallback );
}

function getGitValue( args, fallback ) {
	try {
		return execFileSync( 'git', args, {
			cwd: REPO_ROOT,
			encoding: 'utf8',
		} ).trim();
	} catch {
		return fallback;
	}
}

async function ensureLocalNodeToolchain() {
	await fs.access( RESOLVED_NODE_BIN );
	await fs.access( RESOLVED_NPM_BIN );
}

async function runWpEnvStatusCheck() {
	const result = spawn(
		RESOLVED_NPM_BIN,
		[ 'run', 'wp-env-test', '--', 'status' ],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
			},
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		}
	);
	const chunks = [];

	result.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	result.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	const { code } = await new Promise( ( resolve, reject ) => {
		result.on( 'error', reject );
		result.on( 'close', ( exitCode ) => resolve( { code: exitCode } ) );
	} );

	if ( code !== 0 || ! chunks.join( '' ).includes( 'status: running' ) ) {
		throw new Error(
			'wp-env-test is not running. Start it before launching parallel fuzz lanes.'
		);
	}
}

async function runWpInstallHealthCheck() {
	const requiredPluginPath = 'gutenberg-test-plugins/disable-animations.php';
	const requiredTheme = 'twentytwentyone';
	const php = [
		`$plugin = WP_PLUGIN_DIR . '/${ requiredPluginPath }';`,
		`if ( ! file_exists( $plugin ) ) { fwrite( STDERR, "missing plugin ${ requiredPluginPath }\\n" ); exit( 2 ); }`,
		`if ( ! wp_get_theme( '${ requiredTheme }' )->exists() ) { fwrite( STDERR, "missing theme ${ requiredTheme }\\n" ); exit( 3 ); }`,
		`echo "rtc-fuzz-health-ok\\n";`,
	].join( ' ' );
	const result = spawn(
		RESOLVED_NPM_BIN,
		[ 'run', 'wp-env-test', '--', 'run', 'cli', 'wp', 'eval', php ],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
			},
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		}
	);
	const chunks = [];
	const timeout = setTimeout( () => {
		result.kill( 'SIGTERM' );
		setTimeout( () => result.kill( 'SIGKILL' ), 5000 ).unref();
	}, 120000 );

	result.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	result.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	const { code } = await new Promise( ( resolve, reject ) => {
		result.on( 'error', reject );
		result.on( 'close', ( exitCode ) => {
			clearTimeout( timeout );
			resolve( { code: exitCode } );
		} );
	} );
	const output = chunks.join( '' );

	if ( code !== 0 || ! output.includes( 'rtc-fuzz-health-ok' ) ) {
		throw new Error(
			`wp-env-test install health check failed before launch.\n${ output }`
		);
	}
}

async function runWpEnvLifecycleCommand( action, timeoutMs ) {
	const result = spawn(
		RESOLVED_NPM_BIN,
		[ 'run', 'wp-env-test', '--', action ],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
			},
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		}
	);
	const chunks = [];
	const timeout = setTimeout( () => {
		result.kill( 'SIGTERM' );
		setTimeout( () => result.kill( 'SIGKILL' ), 5000 ).unref();
	}, timeoutMs );

	result.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	result.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	const { code } = await new Promise( ( resolve, reject ) => {
		result.on( 'error', reject );
		result.on( 'close', ( exitCode ) => {
			clearTimeout( timeout );
			resolve( { code: exitCode } );
		} );
	} );

	return {
		code,
		output: chunks.join( '' ),
	};
}

function truncateOutput( output ) {
	const trimmed = String( output ?? '' ).trim();
	if ( trimmed.length <= 4000 ) {
		return trimmed;
	}
	return `${ trimmed.slice( 0, 4000 ) }\n...<truncated>`;
}

async function refreshWpEnvAfterFailedHealthCheck( error ) {
	process.stderr.write(
		`wp-env-test install health check failed; restarting wp-env-test once before launching lanes.\n${ truncateOutput(
			error.stack ?? error.message
		) }\n`
	);

	const stopResult = await runWpEnvLifecycleCommand( 'stop', 120000 );
	if ( stopResult.code !== 0 ) {
		process.stderr.write(
			`wp-env-test stop exited with code=${ stopResult.code } during health recovery.\n${ truncateOutput(
				stopResult.output
			) }\n`
		);
	}

	const startResult = await runWpEnvLifecycleCommand(
		'start',
		10 * 60 * 1000
	);
	if ( startResult.code !== 0 ) {
		throw new Error(
			`wp-env-test restart failed during health recovery.\n${ startResult.output }`
		);
	}
}

async function main() {
	await ensureLocalNodeToolchain();
	await runWpEnvStatusCheck();
	try {
		await runWpInstallHealthCheck();
	} catch ( error ) {
		await refreshWpEnvAfterFailedHealthCheck( error );
		await runWpEnvStatusCheck();
		await runWpInstallHealthCheck();
	}
	await fs.mkdir( OUTPUT_DIR, { recursive: true } );

	if ( START_SEEDS && START_SEEDS.length !== LANE_COUNT ) {
		throw new Error(
			`RTC_FUZZ_START_SEEDS has ${ START_SEEDS.length } entries, but RTC_FUZZ_PARALLEL_LANES is ${ LANE_COUNT }.`
		);
	}

	const lanes = [];
	for ( let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex++ ) {
		const laneLabel = `lane-${ laneIndex }`;
		const laneOutputDir = path.join( OUTPUT_DIR, laneLabel );
		await fs.mkdir( laneOutputDir, { recursive: true } );
		const launcherLogPath = path.join( laneOutputDir, 'launcher.log' );
		const launcherLog = await fs.open( launcherLogPath, 'a' );
		const laneSeed = START_SEEDS?.[ laneIndex ] ?? START_SEED + laneIndex;
		const child = spawn(
			RESOLVED_NODE_BIN,
			[ 'bin/rtc-browser-fuzz-runner.mjs' ],
			{
				cwd: REPO_ROOT,
				detached: true,
				stdio: [ 'ignore', launcherLog.fd, launcherLog.fd ],
				env: {
					...process.env,
					PATH: SHARED_PATH,
					RTC_FUZZ_DURATION_HOURS: String( DURATION_HOURS ),
					RTC_FUZZ_OUTPUT_DIR: laneOutputDir,
					RTC_FUZZ_SEED_STRIDE: String( TOTAL_SEED_STRIDE ),
					RTC_FUZZ_START_SEED: String( laneSeed ),
					RTC_FUZZ_STEP_COUNT: String( STEP_COUNT ),
					RTC_FUZZ_LANE_LABEL: laneLabel,
					RTC_FUZZ_ASSUME_WP_ENV_RUNNING: '1',
					RTC_FUZZ_INLINE_CODEX:
						process.env.RTC_FUZZ_INLINE_CODEX ?? '0',
					RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP:
						process.env.RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP ?? '1',
				},
			}
		);
		child.unref();
		await launcherLog.close();

		lanes.push( {
			laneIndex,
			laneLabel,
			outputDir: laneOutputDir,
			pid: child.pid,
			startSeed: laneSeed,
			seedStride: TOTAL_SEED_STRIDE,
		} );
	}

	const manifest = {
		branch: getGitValue( [ 'branch', '--show-current' ], null ),
		commit: getGitValue( [ 'rev-parse', 'HEAD' ], null ),
		createdAt: new Date().toISOString(),
		durationHours: DURATION_HOURS,
		laneCount: LANE_COUNT,
		outputDir: OUTPUT_DIR,
		pCoreCount: getPerformanceCoreCount(),
		lanesAssumeWpEnvRunning: true,
		inlineCodex: ( process.env.RTC_FUZZ_INLINE_CODEX ?? '0' ) !== '0',
		skipGlobalPostCleanup:
			( process.env.RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP ?? '1' ) === '1',
		healthProbe: 'launcher-wp-cli-install-check-runner-http-liveness',
		healthCheckIntervalSeeds:
			process.env.RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS ?? '1',
		httpHealthTimeoutMs:
			process.env.RTC_FUZZ_HTTP_HEALTH_TIMEOUT_MS ?? '10000',
		startSeed: START_SEED,
		startSeeds: START_SEEDS,
		totalSeedStride: TOTAL_SEED_STRIDE,
		stepCount: STEP_COUNT,
		lanes,
	};

	await fs.writeFile(
		path.join( OUTPUT_DIR, 'lanes.json' ),
		JSON.stringify( manifest, null, 2 ) + '\n'
	);

	process.stdout.write( JSON.stringify( manifest, null, 2 ) + '\n' );
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
