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
const OUTPUT_DIR =
	process.env.RTC_FUZZ_NOVELTY_OUTPUT_DIR ??
	path.join(
		REPO_ROOT,
		'artifacts/rtc-browser-fuzz',
		`novelty-${ createTimestamp() }`
	);
const GROUPS_PATH =
	process.env.RTC_FUZZ_NOVELTY_GROUPS_PATH ??
	path.join( OUTPUT_DIR, 'supervisor-groups.json' );
const STATE_PATH = path.join( OUTPUT_DIR, 'novelty-state.json' );
const STATUS_PATH = path.join( OUTPUT_DIR, 'novelty-status.md' );
const LOG_PATH = path.join( OUTPUT_DIR, 'novelty-monitor.log' );
const SUPERVISOR_SESSION =
	process.env.RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION ??
	'rtc-fuzz-novelty-supervisor-20260502';
const INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_INTERVAL_MS',
	5 * 60 * 1000
);
const DURATION_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_DURATION_HOURS',
	14
);
const BASE_URL =
	process.env.RTC_FUZZ_NOVELTY_BASE_URL ??
	process.env.WP_BASE_URL ??
	'http://localhost:8889';
const WP_ENV_PORT = process.env.RTC_FUZZ_NOVELTY_WP_ENV_PORT ?? '8889';
const WS_PORT = process.env.RTC_FUZZ_NOVELTY_WS_PORT ?? '18991';
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const OBSERVED_RUN_DIRS = parsePathList(
	process.env.RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS
).concat( OUTPUT_DIR );
const FORCE_START = process.env.RTC_FUZZ_NOVELTY_FORCE_START === '1';

const PROFILE_GROUPS = [
	{
		name: 'novelty-ws-structure',
		actionProfile: 'structure',
		startSeed: 960001,
		stepCount: 14,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			RTC_FUZZ_DISABLE_REVISION_RESTORE: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
	{
		name: 'novelty-ws-lifecycle',
		actionProfile: 'session-lifecycle',
		startSeed: 970001,
		stepCount: 12,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			RTC_FUZZ_DISABLE_REVISION_RESTORE: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
];

await fs.mkdir( OUTPUT_DIR, { recursive: true } );
let state = ( await readJsonFile( STATE_PATH ) ) ?? {
	startedAt: new Date().toISOString(),
	enabledGroups: [ 'novelty-ws-structure' ],
	featureCounts: {},
	coverageHashes: {},
	recordsSeen: 0,
	lastUpdatedAt: null,
	changes: [],
};

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

function parsePathList( value ) {
	if ( ! value ) {
		return [];
	}
	return value
		.split( path.delimiter )
		.flatMap( ( item ) => item.split( ',' ) )
		.map( ( item ) => item.trim() )
		.filter( Boolean );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( LOG_PATH, line );
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function writeJsonFileAtomic( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${ process.pid }`;
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

async function fileExists( filePath ) {
	try {
		await fs.access( filePath );
		return true;
	} catch {
		return false;
	}
}

async function findCoverageFiles( roots ) {
	const files = [];
	const seen = new Set();

	async function walk( dir, depth ) {
		if ( depth > 7 || seen.has( dir ) ) {
			return;
		}
		seen.add( dir );

		let entries;
		try {
			entries = await fs.readdir( dir, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				if (
					[
						'node_modules',
						'.git',
						'vendor',
						'test-results',
						'playwright-report',
					].includes( entry.name )
				) {
					continue;
				}
				await walk( entryPath, depth + 1 );
			} else if ( entry.name === 'rtc-behavioral-coverage.ndjson' ) {
				files.push( entryPath );
			}
		}
	}

	for ( const root of roots ) {
		await walk( root, 0 );
	}

	return files.sort();
}

async function readCoverageRecords( files ) {
	const records = [];

	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		for ( const line of text.split( '\n' ) ) {
			if ( ! line.trim() ) {
				continue;
			}
			try {
				records.push( {
					...JSON.parse( line ),
					coverageFile: filePath,
				} );
			} catch {}
		}
	}

	return records;
}

function featureKeysForRecord( record ) {
	const keys = new Set();
	const blockStats = record.blockStats ?? {};
	const saveCount = record.saveCheckpointSteps?.length ?? 0;
	const reloadCount = record.reloads?.length ?? 0;

	keys.add( `profile:${ record.actionProfile ?? 'unknown' }` );
	keys.add( `transport:${ record.transport ?? 'unknown' }` );
	keys.add( `users:${ record.userCount ?? 0 }` );
	keys.add( `initial:${ record.initialContentProfile ?? 'unknown' }` );
	keys.add( `depth:${ Math.min( blockStats.maxDepth ?? 0, 4 ) }` );
	keys.add( `save-count:${ Math.min( saveCount, 3 ) }` );
	keys.add( `reload-count:${ Math.min( reloadCount, 3 ) }` );
	keys.add(
		`revision-eligible:${ record.revisionRestore?.eligible === true }`
	);

	for ( const type of blockStats.types ?? [] ) {
		keys.add( `block:${ type }` );
	}
	for ( const action of record.actions ?? [] ) {
		keys.add( `action:${ action.label }` );
	}
	for ( let index = 1; index < ( record.actions ?? [] ).length; index++ ) {
		keys.add(
			`action-pair:${ record.actions[ index - 1 ].label }->${
				record.actions[ index ].label
			}`
		);
	}
	for ( const fault of record.faults ?? [] ) {
		keys.add( `fault:${ fault.type }:${ fault.status ?? 'delay' }` );
	}
	for ( const event of record.lifecycleEvents ?? [] ) {
		keys.add( `lifecycle:${ event.type }:users-${ event.userCount }` );
	}
	if ( record.cdpCoverage?.hash ) {
		keys.add( `cdp:${ record.cdpCoverage.hash }` );
	}

	return keys;
}

function summarizeNovelty( records ) {
	let newFeatureKeys = 0;
	let newCoverageHashes = 0;
	const byProfile = {};

	for ( const record of records.slice( state.recordsSeen ) ) {
		const profile = record.actionProfile ?? 'unknown';
		byProfile[ profile ] ??= {
			records: 0,
			newFeatures: 0,
			failures: 0,
		};
		byProfile[ profile ].records += 1;
		if ( record.status === 'failed' ) {
			byProfile[ profile ].failures += 1;
		}

		for ( const key of featureKeysForRecord( record ) ) {
			if ( ! state.featureCounts[ key ] ) {
				newFeatureKeys += 1;
				byProfile[ profile ].newFeatures += 1;
			}
			state.featureCounts[ key ] =
				( state.featureCounts[ key ] ?? 0 ) + 1;
		}

		const coverageHash = record.cdpCoverage?.hash;
		if ( coverageHash && ! state.coverageHashes[ coverageHash ] ) {
			newCoverageHashes += 1;
		}
		if ( coverageHash ) {
			state.coverageHashes[ coverageHash ] =
				( state.coverageHashes[ coverageHash ] ?? 0 ) + 1;
		}
	}

	const processed = Math.max( 0, records.length - state.recordsSeen );
	state.recordsSeen = records.length;
	return {
		byProfile,
		newCoverageHashes,
		newFeatureKeys,
		processed,
	};
}

function sampleResources() {
	const load1 = os.loadavg()[ 0 ];
	const cores = os.cpus().length;
	const freeMemoryGb = os.freemem() / 1024 ** 3;
	const totalMemoryGb = os.totalmem() / 1024 ** 3;
	return {
		cores,
		freeMemoryGb,
		load1,
		totalMemoryGb,
		hasHeadroom: load1 < cores * 1.25 && freeMemoryGb > 3,
	};
}

function buildGroup( profile ) {
	return {
		name: profile.name,
		repoRoot: REPO_ROOT,
		transport: 'ws',
		lanes: 1,
		startSeed: profile.startSeed,
		stepCount: profile.stepCount,
		wsPort: Number.parseInt( WS_PORT, 10 ),
		env: {
			WP_ENV_PORT,
			WP_BASE_URL: BASE_URL,
			RTC_FUZZ_BASE_URL: BASE_URL,
			GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
			GUTENBERG_RTC_TEST_WS_PORT: WS_PORT,
			GUTENBERG_RTC_TEST_WS_URL: `ws://127.0.0.1:${ WS_PORT }`,
			GUTENBERG_RTC_BROWSER_ACTION_PROFILE: profile.actionProfile,
			GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE:
				profile.collectCdpCoverage ? '1' : '0',
			...profile.env,
		},
	};
}

async function applyPolicy( novelty, resources ) {
	const enabled = new Set( state.enabledGroups );
	const lifecycleEnabled = enabled.has( 'novelty-ws-lifecycle' );
	const structureRecords =
		novelty.byProfile.structure?.records ??
		Object.values( state.featureCounts ).filter( Boolean ).length;

	if (
		! lifecycleEnabled &&
		resources.hasHeadroom &&
		state.recordsSeen > 0 &&
		( structureRecords >= 10 || novelty.newFeatureKeys === 0 )
	) {
		enabled.add( 'novelty-ws-lifecycle' );
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'enable-group',
			group: 'novelty-ws-lifecycle',
			reason: 'structure profile has enough coverage or low novelty; add late-join/reload lifecycle coverage',
		} );
		await log( 'Enabled novelty-ws-lifecycle group.' );
	}

	state.enabledGroups = [ ...enabled ];
	const groups = PROFILE_GROUPS.filter( ( profile ) =>
		enabled.has( profile.name )
	).map( buildGroup );
	await writeJsonFileAtomic( GROUPS_PATH, groups );
}

function tmuxHasSession( sessionName ) {
	try {
		execFileSync( 'tmux', [ 'has-session', '-t', sessionName ], {
			stdio: 'ignore',
		} );
		return true;
	} catch {
		return false;
	}
}

async function ensureSupervisor( resources ) {
	if ( tmuxHasSession( SUPERVISOR_SESSION ) ) {
		return;
	}
	if ( ! FORCE_START && ! resources.hasHeadroom ) {
		await log(
			`holding supervisor start until resources recover: load1=${ resources.load1.toFixed(
				2
			) }, cores=${
				resources.cores
			}, free=${ resources.freeMemoryGb.toFixed( 1 ) }G`
		);
		return;
	}

	const command = [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=${ shellQuote( OUTPUT_DIR ) }`,
		`RTC_FUZZ_SUPERVISOR_GROUPS_PATH=${ shellQuote( GROUPS_PATH ) }`,
		`RTC_FUZZ_SUPERVISOR_DURATION_HOURS=${ shellQuote(
			String( Math.max( 0.1, ( END_AT - Date.now() ) / 3600000 ) )
		) }`,
		'RTC_FUZZ_SUPERVISOR_POLL_MS=60000',
		`${ shellQuote(
			process.execPath
		) } bin/rtc-browser-fuzz-supervisor.mjs`,
	].join( ' ' );

	spawn( 'tmux', [ 'new-session', '-d', '-s', SUPERVISOR_SESSION, command ], {
		cwd: REPO_ROOT,
		stdio: 'ignore',
	} ).unref();
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'start-supervisor',
		session: SUPERVISOR_SESSION,
	} );
	await log( `Started supervisor tmux session ${ SUPERVISOR_SESSION }.` );
}

function shellQuote( value ) {
	return `'${ String( value ).replaceAll( "'", `'\\''` ) }'`;
}

async function writeStatus( novelty, resources, coverageFiles ) {
	const groups = await readJsonFile( GROUPS_PATH );
	const lines = [
		'# RTC Novelty Monitor',
		'',
		`Updated: ${ new Date().toISOString() }`,
		`Output dir: ${ OUTPUT_DIR }`,
		`Supervisor session: ${ SUPERVISOR_SESSION }`,
		`Groups path: ${ GROUPS_PATH }`,
		'',
		'## Resource Snapshot',
		`- load1: ${ resources.load1.toFixed( 2 ) } / cores: ${
			resources.cores
		}`,
		`- memory: ${ resources.freeMemoryGb.toFixed(
			1
		) }G free / ${ resources.totalMemoryGb.toFixed( 1 ) }G total`,
		`- headroom for adding groups: ${
			resources.hasHeadroom ? 'yes' : 'no'
		}`,
		'',
		'## Coverage Intake',
		`- coverage files: ${ coverageFiles.length }`,
		`- total records seen: ${ state.recordsSeen }`,
		`- records processed this pass: ${ novelty.processed }`,
		`- new behavioral feature keys this pass: ${ novelty.newFeatureKeys }`,
		`- new CDP coverage hashes this pass: ${ novelty.newCoverageHashes }`,
		'',
		'## Enabled Groups',
		...( groups ?? [] ).map(
			( group ) =>
				`- ${ group.name }: ${ group.transport }, profile=${ group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE }, lanes=${ group.lanes }, seed=${ group.startSeed }`
		),
		'',
		'## Recent Changes',
		...( state.changes ?? [] )
			.slice( -12 )
			.map(
				( change ) =>
					`- ${ change.at }: ${ change.action } ${
						change.group ?? change.session ?? ''
					} ${ change.reason ?? '' }`
			),
		'',
	];
	await fs.writeFile( STATUS_PATH, lines.join( '\n' ) );
}

async function runPass() {
	const coverageFiles = await findCoverageFiles( OBSERVED_RUN_DIRS );
	const records = await readCoverageRecords( coverageFiles );
	const novelty = summarizeNovelty( records );
	const resources = sampleResources();
	await applyPolicy( novelty, resources );
	await ensureSupervisor( resources );
	state.lastUpdatedAt = new Date().toISOString();
	await writeJsonFileAtomic( STATE_PATH, state );
	await writeStatus( novelty, resources, coverageFiles );
	await log(
		`pass: records=${ records.length } processed=${ novelty.processed } newFeatures=${ novelty.newFeatureKeys } newCdp=${ novelty.newCoverageHashes } headroom=${ resources.hasHeadroom }`
	);
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

async function main() {
	await log(
		`RTC novelty monitor started, outputDir=${ OUTPUT_DIR }, observed=${ OBSERVED_RUN_DIRS.join(
			','
		) }`
	);
	while ( Date.now() < END_AT ) {
		try {
			await runPass();
		} catch ( error ) {
			await log( `pass failed: ${ error.stack ?? error.message }` );
		}
		await sleep( INTERVAL_MS );
	}
	await log( 'RTC novelty monitor exiting after requested duration.' );
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
