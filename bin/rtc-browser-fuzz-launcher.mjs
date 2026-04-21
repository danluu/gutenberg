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
const SHARED_PATH = [
	path.join( REPO_ROOT, '.tooling/node-v20.19.0-darwin-arm64/bin' ),
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH ?? '',
].join( path.delimiter );
const START_SEED = getPositiveIntegerEnv( 'RTC_FUZZ_START_SEED', 1007 );
const STEP_COUNT = getPositiveIntegerEnv( 'RTC_FUZZ_STEP_COUNT', 12 );
const DURATION_HOURS = getPositiveNumberEnv( 'RTC_FUZZ_DURATION_HOURS', 12 );
const LANE_COUNT = getPositiveIntegerEnv(
	'RTC_FUZZ_PARALLEL_LANES',
	getPerformanceCoreCount()
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

async function ensureLocalNodeToolchain() {
	await fs.access( NODE_BIN );
	await fs.access( NPM_BIN );
}

async function runWpEnvStatusCheck() {
	const result = spawn( NPM_BIN, [ 'run', 'wp-env-test', '--', 'status' ], {
		cwd: REPO_ROOT,
		env: {
			...process.env,
			PATH: SHARED_PATH,
		},
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );
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

async function main() {
	await ensureLocalNodeToolchain();
	await runWpEnvStatusCheck();
	await fs.mkdir( OUTPUT_DIR, { recursive: true } );

	const lanes = [];
	for ( let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex++ ) {
		const laneLabel = `lane-${ laneIndex }`;
		const laneOutputDir = path.join( OUTPUT_DIR, laneLabel );
		await fs.mkdir( laneOutputDir, { recursive: true } );
		const launcherLogPath = path.join( laneOutputDir, 'launcher.log' );
		const launcherLog = await fs.open( launcherLogPath, 'a' );
		const laneSeed = START_SEED + laneIndex;
		const child = spawn( NODE_BIN, [ 'bin/rtc-browser-fuzz-runner.mjs' ], {
			cwd: REPO_ROOT,
			detached: true,
			stdio: [ 'ignore', launcherLog.fd, launcherLog.fd ],
			env: {
				...process.env,
				PATH: SHARED_PATH,
				RTC_FUZZ_DURATION_HOURS: String( DURATION_HOURS ),
				RTC_FUZZ_OUTPUT_DIR: laneOutputDir,
				RTC_FUZZ_SEED_STRIDE: String( LANE_COUNT ),
				RTC_FUZZ_START_SEED: String( laneSeed ),
				RTC_FUZZ_STEP_COUNT: String( STEP_COUNT ),
				RTC_FUZZ_LANE_LABEL: laneLabel,
			},
		} );
		child.unref();
		await launcherLog.close();

		lanes.push( {
			laneIndex,
			laneLabel,
			outputDir: laneOutputDir,
			pid: child.pid,
			startSeed: laneSeed,
			seedStride: LANE_COUNT,
		} );
	}

	const manifest = {
		createdAt: new Date().toISOString(),
		durationHours: DURATION_HOURS,
		laneCount: LANE_COUNT,
		outputDir: OUTPUT_DIR,
		pCoreCount: getPerformanceCoreCount(),
		startSeed: START_SEED,
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
