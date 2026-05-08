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
const INCLUDE_RECHECK_COVERAGE =
	process.env.RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE === '1';
const ENABLE_HTTP_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE === '1';
const MAX_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS',
	7
);
const PAUSE_ON_STARTUP_FAILURE =
	process.env.RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE !== '0';
const STARTUP_FAILURE_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_LIMIT',
	2
);

const PROFILE_GROUPS = [
	{
		name: 'novelty-ws-structure',
		actionProfile: 'structure',
		startSeed: 960001,
		stepCount: 14,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
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
		},
	},
	{
		name: 'novelty-ws-persistence-no-title',
		actionProfile: 'persistence-no-title',
		startSeed: 980001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
		},
	},
	{
		name: 'novelty-ws-revision-persistence',
		actionProfile: 'revision-persistence',
		startSeed: 990001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '0',
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_DISABLE_REVISION_RESTORE: '0',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
		},
	},
	{
		name: 'novelty-ws-three-user-late-join',
		actionProfile: 'three-user-late-join',
		startSeed: 1000001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
		},
	},
	{
		name: 'novelty-ws-parser-serialization',
		actionProfile: 'parser-serialization',
		startSeed: 1010001,
		stepCount: 9,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
	{
		name: 'novelty-ws-multi-reload-lifecycle',
		actionProfile: 'multi-reload-lifecycle',
		startSeed: 1020001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
		},
	},
	{
		name: 'novelty-http-persistence-probe',
		actionProfile: 'persistence-no-title',
		transport: 'http',
		startSeed: 1030001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
];

await fs.mkdir( OUTPUT_DIR, { recursive: true } );
const state = ( await readJsonFile( STATE_PATH ) ) ?? {
	startedAt: new Date().toISOString(),
	enabledGroups: [ 'novelty-ws-structure' ],
	featureCounts: {},
	coverageHashes: {},
	fileOffsets: {},
	recordCountsByProfile: {},
	recordCountsByTransport: {},
	startupFailureCountsByProfile: {},
	pausedGroups: {},
	recordsSeen: 0,
	healthWarnings: [],
	lastUpdatedAt: null,
	changes: [],
};
state.fileOffsets ??= {};
state.recordCountsByProfile ??= {};
state.recordCountsByTransport ??= {};
state.startupFailureCountsByProfile ??= {};
state.pausedGroups ??= {};
state.healthWarnings ??= [];

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
						'.triage-watcher',
						'node_modules',
						'.git',
						'vendor',
						'test-results',
						'playwright-report',
						'blob-report',
						'codex-analysis',
					].includes( entry.name )
				) {
					continue;
				}
				if (
					! INCLUDE_RECHECK_COVERAGE &&
					( entry.name.startsWith( 'analysis-' ) ||
						entry.name.startsWith( 'recheck-' ) )
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
	const nextOffsets = {};
	const stats = {
		filesRead: 0,
		linesSeen: 0,
		linesProcessed: 0,
		parseErrors: 0,
	};

	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		const lines = text.split( '\n' );
		const previousOffset = state.fileOffsets?.[ filePath ]?.lineCount ?? 0;
		const nextOffset = Math.min( previousOffset, lines.length );
		stats.filesRead += 1;
		stats.linesSeen += lines.filter( ( line ) => line.trim() ).length;
		for ( const line of lines.slice( nextOffset ) ) {
			if ( ! line.trim() ) {
				continue;
			}
			try {
				records.push( {
					...JSON.parse( line ),
					coverageFile: filePath,
				} );
				stats.linesProcessed += 1;
			} catch {}
		}
		stats.parseErrors += Math.max(
			0,
			lines.slice( nextOffset ).filter( ( line ) => line.trim() ).length -
				records.filter( ( record ) => record.coverageFile === filePath )
					.length
		);
		nextOffsets[ filePath ] = {
			lineCount: lines.length,
			lastSeenAt: new Date().toISOString(),
		};
	}

	state.fileOffsets = nextOffsets;
	return { records, stats };
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
	const byTransport = {};

	for ( const record of records ) {
		const profile = record.actionProfile ?? 'unknown';
		const transport = record.transport ?? 'unknown';
		byProfile[ profile ] ??= {
			records: 0,
			newFeatures: 0,
			failures: 0,
			cdpRecords: 0,
		};
		byProfile[ profile ].records += 1;
		byTransport[ transport ] = ( byTransport[ transport ] ?? 0 ) + 1;
		state.recordCountsByProfile[ profile ] =
			( state.recordCountsByProfile[ profile ] ?? 0 ) + 1;
		state.recordCountsByTransport[ transport ] =
			( state.recordCountsByTransport[ transport ] ?? 0 ) + 1;
		if ( record.status === 'failed' ) {
			byProfile[ profile ].failures += 1;
		}
		if ( isStartupDiscoveryFailure( record ) ) {
			state.startupFailureCountsByProfile[ profile ] =
				( state.startupFailureCountsByProfile[ profile ] ?? 0 ) + 1;
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
			byProfile[ profile ].cdpRecords += 1;
			state.coverageHashes[ coverageHash ] =
				( state.coverageHashes[ coverageHash ] ?? 0 ) + 1;
		}
	}

	const processed = records.length;
	state.recordsSeen = ( state.recordsSeen ?? 0 ) + processed;
	return {
		byProfile,
		byTransport,
		newCoverageHashes,
		newFeatureKeys,
		processed,
	};
}

function isStartupDiscoveryFailure( record ) {
	if ( record.status !== 'failed' ) {
		return false;
	}
	if ( ( record.actions?.length ?? 0 ) > 0 ) {
		return false;
	}
	if ( ( record.userCount ?? 0 ) > 0 ) {
		return false;
	}

	const errorText = [
		record.error,
		...( record.historyEvents ?? [] ).map( ( event ) => event.error ),
	]
		.filter( Boolean )
		.join( '\n' );

	return /waitForMutualDiscovery|waitForTestWebSocketAwarenessPeerCount|Target page, context or browser has been closed|Test timeout/i.test(
		errorText
	);
}

function sampleResources() {
	const load1 = os.loadavg()[ 0 ];
	const cores = os.cpus().length;
	const freeMemoryGb = os.freemem() / 1024 ** 3;
	const totalMemoryGb = os.totalmem() / 1024 ** 3;
	const memoryPressureFreePercent = sampleMacMemoryPressureFreePercent();
	const memoryHasHeadroom =
		memoryPressureFreePercent === null
			? freeMemoryGb > 3
			: memoryPressureFreePercent >= 20;
	return {
		cores,
		freeMemoryGb,
		load1,
		memoryHasHeadroom,
		memoryPressureFreePercent,
		totalMemoryGb,
		hasHeadroom: load1 < cores * 1.25 && memoryHasHeadroom,
	};
}

function sampleMacMemoryPressureFreePercent() {
	if ( process.platform !== 'darwin' ) {
		return null;
	}

	try {
		const output = execFileSync( 'memory_pressure', {
			encoding: 'utf8',
			timeout: 10000,
		} );
		const match = output.match(
			/System-wide memory free percentage:\s*(\d+)%/
		);
		return match ? Number.parseInt( match[ 1 ], 10 ) : null;
	} catch {
		return null;
	}
}

function buildGroup( profile ) {
	const transport = profile.transport ?? 'ws';
	const transportEnv =
		transport === 'ws'
			? {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
					GUTENBERG_RTC_TEST_WS_PORT: WS_PORT,
					GUTENBERG_RTC_TEST_WS_URL: `ws://127.0.0.1:${ WS_PORT }`,
			  }
			: {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '0',
			  };

	return {
		name: profile.name,
		repoRoot: REPO_ROOT,
		transport,
		lanes: 1,
		startSeed: profile.startSeed,
		stepCount: profile.stepCount,
		...( transport === 'ws'
			? { wsPort: Number.parseInt( WS_PORT, 10 ) }
			: {} ),
		env: {
			WP_ENV_PORT,
			WP_BASE_URL: BASE_URL,
			RTC_FUZZ_BASE_URL: BASE_URL,
			...transportEnv,
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
	const persistenceNoTitleEnabled = enabled.has(
		'novelty-ws-persistence-no-title'
	);
	const revisionPersistenceEnabled = enabled.has(
		'novelty-ws-revision-persistence'
	);
	const threeUserLateJoinEnabled = enabled.has(
		'novelty-ws-three-user-late-join'
	);
	const parserSerializationEnabled = enabled.has(
		'novelty-ws-parser-serialization'
	);
	const multiReloadLifecycleEnabled = enabled.has(
		'novelty-ws-multi-reload-lifecycle'
	);
	const httpProbeEnabled = enabled.has( 'novelty-http-persistence-probe' );
	const structureRecords =
		state.recordCountsByProfile?.structure ??
		novelty.byProfile.structure?.records ??
		0;
	const lifecycleRecords =
		state.recordCountsByProfile?.[ 'session-lifecycle' ] ??
		novelty.byProfile[ 'session-lifecycle' ]?.records ??
		0;
	const persistenceNoTitleRecords =
		state.recordCountsByProfile?.[ 'persistence-no-title' ] ??
		novelty.byProfile[ 'persistence-no-title' ]?.records ??
		0;
	const parserRecords =
		state.recordCountsByProfile?.[ 'parser-serialization' ] ??
		novelty.byProfile[ 'parser-serialization' ]?.records ??
		0;
	const users3Records = state.featureCounts?.[ 'users:3' ] ?? 0;
	const reload2Records = state.featureCounts?.[ 'reload-count:2' ] ?? 0;
	const revisionEligibleRecords =
		state.featureCounts?.[ 'revision-eligible:true' ] ?? 0;

	async function enableGroup( group, reason ) {
		if (
			enabled.has( group ) ||
			enabled.size >= MAX_ENABLED_GROUPS ||
			state.pausedGroups?.[ group ]
		) {
			return false;
		}

		enabled.add( group );
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'enable-group',
			group,
			reason,
		} );
		await log( `Enabled ${ group } group.` );
		return true;
	}

	async function pauseGroup( group, reason ) {
		if ( ! enabled.has( group ) ) {
			return false;
		}

		enabled.delete( group );
		state.pausedGroups[ group ] = {
			at: new Date().toISOString(),
			reason,
		};
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'pause-group',
			group,
			reason,
		} );
		await log( `Paused ${ group } group: ${ reason }` );
		await terminateGroupLanes( group, reason );
		return true;
	}

	if (
		! lifecycleEnabled &&
		resources.hasHeadroom &&
		state.recordsSeen > 0 &&
		structureRecords >= 10
	) {
		await enableGroup(
			'novelty-ws-lifecycle',
			'structure profile has enough coverage or low novelty; add late-join/reload lifecycle coverage'
		);
	}

	if (
		! persistenceNoTitleEnabled &&
		resources.hasHeadroom &&
		lifecycleEnabled &&
		lifecycleRecords >= 50
	) {
		await enableGroup(
			'novelty-ws-persistence-no-title',
			'structure and lifecycle profiles have plateaued with headroom; add websocket persistence-no-title coverage'
		);
	}

	if (
		! revisionPersistenceEnabled &&
		resources.hasHeadroom &&
		persistenceNoTitleRecords >= 1 &&
		revisionEligibleRecords < 500
	) {
		await enableGroup(
			'novelty-ws-revision-persistence',
			'revision-restore coverage is low; add focused save/reload/browser revision restore coverage'
		);
	}

	if (
		! threeUserLateJoinEnabled &&
		resources.hasHeadroom &&
		lifecycleEnabled &&
		users3Records < 100
	) {
		await enableGroup(
			'novelty-ws-three-user-late-join',
			'three-user late-join coverage is low; force a real late join early in the seed'
		);
	}

	if (
		! parserSerializationEnabled &&
		resources.hasHeadroom &&
		structureRecords >= 50 &&
		parserRecords < 50
	) {
		await enableGroup(
			'novelty-ws-parser-serialization',
			'parser and block-serialization stress coverage is low; enable parser-stress actions without injected faults'
		);
	}

	if (
		! multiReloadLifecycleEnabled &&
		resources.hasHeadroom &&
		lifecycleRecords >= 50 &&
		reload2Records < 100
	) {
		await enableGroup(
			'novelty-ws-multi-reload-lifecycle',
			'multi-reload lifecycle coverage is low; add two reload checkpoints in one seed'
		);
	}

	if (
		! httpProbeEnabled &&
		ENABLE_HTTP_PROBE &&
		resources.hasHeadroom &&
		enabled.size < MAX_ENABLED_GROUPS
	) {
		await enableGroup(
			'novelty-http-persistence-probe',
			'HTTP probe explicitly enabled; run a low-fault persistence lane after quarantine'
		);
	}

	if ( PAUSE_ON_STARTUP_FAILURE ) {
		const pauseOrder = [
			[ 'novelty-ws-parser-serialization', 'parser-serialization' ],
			[ 'novelty-ws-multi-reload-lifecycle', 'multi-reload-lifecycle' ],
			[ 'novelty-ws-three-user-late-join', 'three-user-late-join' ],
			[ 'novelty-ws-revision-persistence', 'revision-persistence' ],
		];

		for ( const [ group, profile ] of pauseOrder ) {
			const startupFailures =
				state.startupFailureCountsByProfile?.[ profile ] ?? 0;
			if ( startupFailures >= STARTUP_FAILURE_LIMIT ) {
				await pauseGroup(
					group,
					`profile ${ profile } produced ${ startupFailures } pre-action WS discovery/startup failures`
				);
			}
		}

		if ( ! resources.hasHeadroom && enabled.size > 5 ) {
			for ( const [ group, profile ] of pauseOrder.slice( 0, 2 ) ) {
				if (
					enabled.size <= 5 ||
					( state.startupFailureCountsByProfile?.[ profile ] ??
						0 ) === 0
				) {
					continue;
				}
				await pauseGroup(
					group,
					`temporary resource guard: no headroom and profile ${ profile } already hit a pre-action startup failure`
				);
			}
		}
	}

	state.enabledGroups = [ ...enabled ];
	const groups = PROFILE_GROUPS.filter( ( profile ) =>
		enabled.has( profile.name )
	).map( buildGroup );
	await writeJsonFileAtomic( GROUPS_PATH, groups );
}

async function terminateGroupLanes( groupName, reason ) {
	const supervisorState = await readJsonFile(
		path.join( OUTPUT_DIR, 'supervisor-state.json' )
	);
	const groupState = ( supervisorState?.groups ?? [] ).find(
		( group ) => group.name === groupName
	);
	const runDirs = [
		...( groupState?.activeRunDirs ?? [] ),
		groupState?.currentRunDir,
	].filter( Boolean );
	const terminated = [];

	for ( const runDir of new Set( runDirs ) ) {
		const manifest = await readJsonFile(
			path.join( runDir, 'lanes.json' )
		);
		for ( const lane of manifest?.lanes ?? [] ) {
			if ( ! lane.pid ) {
				continue;
			}
			const killedPids = terminatePidTree( lane.pid );
			if ( killedPids.length ) {
				terminated.push( {
					pid: lane.pid,
					runDir,
					lane: lane.laneLabel,
					killedPids,
				} );
			}
		}
	}

	if ( terminated.length ) {
		const killedCount = terminated.reduce(
			( count, item ) => count + item.killedPids.length,
			0
		);
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'terminate-paused-group-lanes',
			group: groupName,
			reason,
			count: killedCount,
		} );
		await log(
			`Terminated ${ killedCount } process(es) for paused group ${ groupName }.`
		);
	}
}

function terminatePidTree( rootPid ) {
	const pids = [ ...collectDescendantPids( rootPid ).reverse(), rootPid ];
	const killed = [];

	for ( const pid of pids ) {
		try {
			process.kill( pid, 'SIGTERM' );
			killed.push( pid );
		} catch {}
	}

	setTimeout( () => {
		for ( const pid of pids ) {
			try {
				process.kill( pid, 'SIGKILL' );
			} catch {}
		}
	}, 5000 ).unref();

	return killed;
}

function collectDescendantPids( pid, seen = new Set() ) {
	if ( seen.has( pid ) ) {
		return [];
	}
	seen.add( pid );

	let childPids = [];
	try {
		childPids = execFileSync( 'pgrep', [ '-P', String( pid ) ], {
			encoding: 'utf8',
			timeout: 5000,
		} )
			.split( '\n' )
			.map( ( value ) => Number.parseInt( value, 10 ) )
			.filter( Number.isFinite );
	} catch {
		return [];
	}

	return childPids.flatMap( ( childPid ) => [
		childPid,
		...collectDescendantPids( childPid, seen ),
	] );
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
		`export RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=${ shellQuote( OUTPUT_DIR ) }`,
		`export RTC_FUZZ_SUPERVISOR_GROUPS_PATH=${ shellQuote( GROUPS_PATH ) }`,
		`export RTC_FUZZ_SUPERVISOR_DURATION_HOURS=${ shellQuote(
			String( Math.max( 0.1, ( END_AT - Date.now() ) / 3600000 ) )
		) }`,
		'export RTC_FUZZ_SUPERVISOR_POLL_MS=60000',
		`${ shellQuote(
			process.execPath
		) } bin/rtc-browser-fuzz-supervisor.mjs`,
	].join( '; ' );

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

function evaluateHealth( groups, coverageFiles ) {
	const warnings = [];
	const enabledProfiles = new Set(
		( groups ?? [] )
			.map(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ??
					group.actionProfile
			)
			.filter( Boolean )
	);
	const cdpProfiles = new Set(
		( groups ?? [] )
			.filter(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE ===
					'1'
			)
			.map(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ??
					group.actionProfile
			)
			.filter( Boolean )
	);
	const outputDirCoverageFiles = coverageFiles.filter( ( filePath ) =>
		filePath.startsWith( OUTPUT_DIR + path.sep )
	);

	if ( outputDirCoverageFiles.length === 0 ) {
		warnings.push(
			`no behavioral coverage files found under novelty output dir ${ OUTPUT_DIR }`
		);
	}

	for ( const profile of enabledProfiles ) {
		const seen = state.recordCountsByProfile?.[ profile ] ?? 0;
		if ( state.recordsSeen > 0 && seen === 0 ) {
			warnings.push(
				`enabled profile "${ profile }" has produced 0 ingested behavioral records`
			);
		}
	}

	for ( const profile of cdpProfiles ) {
		const seen = state.recordCountsByProfile?.[ profile ] ?? 0;
		const cdpTotal = Object.values( state.coverageHashes ?? {} ).reduce(
			( total, count ) => total + count,
			0
		);
		if ( seen >= 10 && cdpTotal === 0 ) {
			warnings.push(
				`profile "${ profile }" requested CDP coverage but no CDP hashes have been ingested`
			);
		}
	}

	state.healthWarnings = warnings;
	return warnings;
}

async function writeStatus( novelty, resources, coverageFiles, coverageStats ) {
	const groups = await readJsonFile( GROUPS_PATH );
	const healthWarnings = state.healthWarnings ?? [];
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
		`- memory pressure free: ${
			resources.memoryPressureFreePercent === null
				? 'n/a'
				: `${ resources.memoryPressureFreePercent }%`
		}`,
		`- headroom for adding groups: ${
			resources.hasHeadroom ? 'yes' : 'no'
		}`,
		'',
		'## Coverage Intake',
		`- coverage files: ${ coverageFiles.length }`,
		`- total records seen: ${ state.recordsSeen }`,
		`- records processed this pass: ${ novelty.processed }`,
		`- files read this pass: ${ coverageStats.filesRead }`,
		`- coverage lines seen this pass: ${ coverageStats.linesSeen }`,
		`- new behavioral feature keys this pass: ${ novelty.newFeatureKeys }`,
		`- new CDP coverage hashes this pass: ${ novelty.newCoverageHashes }`,
		`- all-time records by profile: ${ JSON.stringify(
			state.recordCountsByProfile ?? {}
		) }`,
		`- all-time records by transport: ${ JSON.stringify(
			state.recordCountsByTransport ?? {}
		) }`,
		`- pre-action startup failures by profile: ${ JSON.stringify(
			state.startupFailureCountsByProfile ?? {}
		) }`,
		'',
		'## Health',
		...( healthWarnings.length
			? healthWarnings.map( ( warning ) => `- warning: ${ warning }` )
			: [ '- ok' ] ),
		'',
		'## Enabled Groups',
		...( groups ?? [] ).map(
			( group ) =>
				`- ${ group.name }: ${ group.transport }, profile=${ group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE }, lanes=${ group.lanes }, seed=${ group.startSeed }`
		),
		'',
		'## Paused Groups',
		...Object.entries( state.pausedGroups ?? {} ).map(
			( [ group, value ] ) =>
				`- ${ group }: ${ value.at } ${ value.reason }`
		),
		...( Object.keys( state.pausedGroups ?? {} ).length
			? []
			: [ '- none' ] ),
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
	const { records, stats } = await readCoverageRecords( coverageFiles );
	const novelty = summarizeNovelty( records );
	const resources = sampleResources();
	await applyPolicy( novelty, resources );
	evaluateHealth( await readJsonFile( GROUPS_PATH ), coverageFiles );
	await ensureSupervisor( resources );
	state.lastUpdatedAt = new Date().toISOString();
	await writeJsonFileAtomic( STATE_PATH, state );
	await writeStatus( novelty, resources, coverageFiles, stats );
	await log(
		`pass: processed=${ novelty.processed } files=${ coverageFiles.length } newFeatures=${ novelty.newFeatureKeys } newCdp=${ novelty.newCoverageHashes } warnings=${ state.healthWarnings.length } headroom=${ resources.hasHeadroom }`
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
