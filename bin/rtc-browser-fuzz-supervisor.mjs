#!/usr/bin/env node

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const OUTPUT_DIR =
	process.env.RTC_FUZZ_SUPERVISOR_OUTPUT_DIR ??
	path.join(
		REPO_ROOT,
		'artifacts/rtc-browser-fuzz',
		`supervised-${ createTimestamp() }`
	);
const DURATION_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_SUPERVISOR_DURATION_HOURS',
	getPositiveNumberEnv( 'RTC_FUZZ_DURATION_HOURS', 14 )
);
const POLL_MS = getPositiveIntegerEnv( 'RTC_FUZZ_SUPERVISOR_POLL_MS', 60000 );
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const STATE_PATH = path.join( OUTPUT_DIR, 'supervisor-state.json' );
const LOG_PATH = path.join( OUTPUT_DIR, 'supervisor.log' );
const EVENTS_PATH = path.join( OUTPUT_DIR, 'events.ndjson' );
const DEFAULT_GROUPS = [
	{
		name: 'default-http',
		repoRoot: REPO_ROOT,
		transport: 'http',
		lanes: 1,
		startSeed: 1007,
		stepCount: 12,
		env: {},
	},
];

let groupConfigs = parseGroups();
await fs.mkdir( OUTPUT_DIR, { recursive: true } );
let state = await loadInitialState();
await writeState();

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

function parseGroups() {
	const groupsPath = process.env.RTC_FUZZ_SUPERVISOR_GROUPS_PATH;
	const rawGroups =
		process.env.RTC_FUZZ_SUPERVISOR_GROUPS_JSON ??
		( groupsPath ? readFileSync( groupsPath, 'utf8' ) : null );
	const groups = rawGroups ? JSON.parse( rawGroups ) : DEFAULT_GROUPS;
	if ( ! Array.isArray( groups ) || groups.length === 0 ) {
		throw new Error(
			'RTC_FUZZ_SUPERVISOR_GROUPS_JSON must be a non-empty array.'
		);
	}

	return groups.map( ( group ) => {
		const name = String( group.name ?? '' ).trim();
		if ( ! name ) {
			throw new Error( 'Every supervisor group needs a name.' );
		}

		const repoRoot = path.resolve( group.repoRoot ?? REPO_ROOT );
		return {
			...group,
			name,
			repoRoot,
			transport: group.transport ?? 'http',
			lanes: Number.parseInt( group.lanes ?? 1, 10 ),
			startSeed: Number.parseInt( group.startSeed ?? 1007, 10 ),
			stepCount: Number.parseInt( group.stepCount ?? 12, 10 ),
			env: group.env ?? {},
		};
	} );
}

async function loadInitialState() {
	const existingState = await readJsonFile( STATE_PATH );
	if ( existingState?.groups ) {
		for ( const group of groupConfigs ) {
			if (
				! existingState.groups.some(
					( groupState ) => groupState.name === group.name
				)
			) {
				existingState.groups.push( createInitialGroupState( group ) );
			}
		}
		existingState.groups = existingState.groups.map( ( groupState ) => {
			const group = getGroupConfig( groupState.name );
			return {
				...createInitialGroupState( group ),
				...groupState,
				activeRunDirs: getActiveRunDirs( groupState ),
			};
		} );
		existingState.outputDir = OUTPUT_DIR;
		existingState.durationHours = DURATION_HOURS;
		existingState.endsAt = new Date( END_AT ).toISOString();
		return existingState;
	}

	return {
		startedAt: new Date().toISOString(),
		outputDir: OUTPUT_DIR,
		durationHours: DURATION_HOURS,
		endsAt: new Date( END_AT ).toISOString(),
		lastUpdatedAt: new Date().toISOString(),
		groups: groupConfigs.map( createInitialGroupState ),
	};
}

function createInitialGroupState( group ) {
	return {
		name: group.name,
		repoRoot: group.repoRoot,
		transport: group.transport ?? 'http',
		lanes: group.lanes,
		startSeed: group.startSeed,
		nextStartSeed: group.startSeed,
		stepCount: group.stepCount ?? 12,
		generation: 0,
		currentRunDir: null,
		activeRunDirs: [],
		currentBaseUrl: null,
		status: 'starting',
		lastReason: 'initial-start',
		lastRecoveryAt: null,
		lastPartialRecoveryAt: null,
		lastLaunchAt: null,
		lastHealthyAt: null,
		consecutiveFastFailures: 0,
		launches: [],
	};
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( LOG_PATH, line );
}

async function event( record ) {
	await fs.appendFile(
		EVENTS_PATH,
		JSON.stringify( {
			at: new Date().toISOString(),
			...record,
		} ) + '\n'
	);
}

async function writeState() {
	state.lastUpdatedAt = new Date().toISOString();
	await fs.writeFile( STATE_PATH, JSON.stringify( state, null, 2 ) + '\n' );
}

function getGroupConfig( name ) {
	const group = groupConfigs.find( ( candidate ) => candidate.name === name );
	if ( ! group ) {
		throw new Error( `Unknown supervisor group ${ name }.` );
	}
	return group;
}

async function syncGroupConfigs() {
	const nextGroupConfigs = parseGroups();
	const nextGroupNames = new Set(
		nextGroupConfigs.map( ( group ) => group.name )
	);
	groupConfigs = nextGroupConfigs;

	for ( const group of groupConfigs ) {
		const existingGroupState = state.groups.find(
			( candidate ) => candidate.name === group.name
		);

		if ( ! existingGroupState ) {
			state.groups.push( createInitialGroupState( group ) );
			await event( {
				group: group.name,
				kind: 'policy',
				action: 'add-group',
				lanes: group.lanes,
				transport: group.transport,
			} );
			continue;
		}

		for ( const key of [ 'repoRoot', 'transport', 'lanes', 'stepCount' ] ) {
			if ( existingGroupState[ key ] !== group[ key ] ) {
				await event( {
					group: group.name,
					kind: 'policy',
					action: 'update-group',
					field: key,
					from: existingGroupState[ key ],
					to: group[ key ],
				} );
				existingGroupState[ key ] = group[ key ];
			}
		}
	}

	for ( const groupState of state.groups ) {
		if ( ! nextGroupNames.has( groupState.name ) ) {
			groupState.status = 'disabled';
			groupState.lastReason = 'removed-from-groups-policy';
		}
	}

	await writeState();
}

function buildEnv( group, overrides = {} ) {
	const env = {
		...process.env,
		...( group.env ?? {} ),
		...overrides,
	};

	if ( env.WP_ENV_PORT && ! env.WP_ENV_TESTS_PORT ) {
		const port = Number.parseInt( env.WP_ENV_PORT, 10 );
		if ( ! Number.isNaN( port ) ) {
			env.WP_ENV_TESTS_PORT = String( port + 1 );
		}
	}

	return env;
}

async function runCommand( {
	command,
	args,
	cwd,
	env = {},
	timeoutMs = 120000,
	logPath = null,
} ) {
	const child = spawn( command, args, {
		cwd,
		env,
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );
	const chunks = [];
	let timedOut = false;
	const timeout = setTimeout( () => {
		timedOut = true;
		child.kill( 'SIGTERM' );
		setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
	}, timeoutMs );
	timeout.unref();

	child.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	child.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	const result = await new Promise( ( resolve ) => {
		child.on( 'error', ( error ) => {
			clearTimeout( timeout );
			resolve( {
				code: 1,
				signal: null,
				output: error.stack ?? error.message,
				timedOut,
			} );
		} );
		child.on( 'close', ( code, signal ) => {
			clearTimeout( timeout );
			resolve( {
				code,
				signal,
				output: chunks.join( '' ),
				timedOut,
			} );
		} );
	} );

	if ( logPath ) {
		await fs.mkdir( path.dirname( logPath ), { recursive: true } );
		await fs.writeFile( logPath, result.output );
	}

	return {
		...result,
		ok: result.code === 0 && ! result.timedOut,
	};
}

async function runWpEnv( group, args, options = {} ) {
	return runCommand( {
		command: 'npm',
		args: [ 'run', 'wp-env-test', '--', ...args ],
		cwd: group.repoRoot,
		env: buildEnv( group ),
		timeoutMs: options.timeoutMs ?? 180000,
		logPath: options.logPath ?? null,
	} );
}

function parseHttpPort( statusOutput ) {
	const match = statusOutput.match( /http port:\s+(\d+)/i );
	return match ? Number.parseInt( match[ 1 ], 10 ) : null;
}

function normalizeBaseUrl( value ) {
	if ( ! value ) {
		return null;
	}
	try {
		const url = new URL( value.trim() );
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.toString().replace( /\/$/, '' );
	} catch {
		return null;
	}
}

async function probeRestEndpoint( baseUrl ) {
	const endpoints = [
		new URL( '/wp-json/', baseUrl ).toString(),
		new URL( '/index.php?rest_route=/', baseUrl ).toString(),
	];
	const failures = [];

	for ( const endpoint of endpoints ) {
		const controller = new AbortController();
		const timeout = setTimeout( () => controller.abort(), 10000 );
		timeout.unref();
		try {
			const response = await fetch( endpoint, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'rtc-browser-fuzz-supervisor',
				},
				signal: controller.signal,
			} );
			const body = await response.text();
			const ok = response.ok && body.includes( '"namespaces"' );
			if ( ok ) {
				return {
					ok: true,
					baseUrl,
					endpoint,
					status: response.status,
				};
			}
			failures.push( `${ endpoint } status=${ response.status }` );
		} catch ( error ) {
			failures.push( `${ endpoint } ${ error.message }` );
		} finally {
			clearTimeout( timeout );
		}
	}

	return {
		ok: false,
		baseUrl,
		failures,
	};
}

async function getWpSiteUrl( group ) {
	const result = await runWpEnv(
		group,
		[ 'run', 'cli', 'wp', 'option', 'get', 'siteurl' ],
		{
			timeoutMs: 60000,
		}
	);
	if ( ! result.ok ) {
		return null;
	}
	return normalizeBaseUrl(
		result.output
			.split( '\n' )
			.map( ( line ) => line.trim() )
			.find(
				( line ) =>
					line.startsWith( 'http://' ) ||
					line.startsWith( 'https://' )
			)
	);
}

async function setWpBaseUrl( group, baseUrl ) {
	for ( const optionName of [ 'siteurl', 'home' ] ) {
		await runWpEnv(
			group,
			[ 'run', 'cli', 'wp', 'option', 'update', optionName, baseUrl ],
			{ timeoutMs: 60000 }
		);
	}
}

async function ensureWpEnv( groupState ) {
	const group = getGroupConfig( groupState.name );
	let statusResult = await runWpEnv( group, [ 'status' ], {
		timeoutMs: 120000,
		logPath: path.join( OUTPUT_DIR, `${ group.name }-wp-env-status.log` ),
	} );

	if (
		! statusResult.ok ||
		! statusResult.output.includes( 'status: running' )
	) {
		await log( `${ group.name }: wp-env is not running; starting it.` );
		await event( {
			group: group.name,
			kind: 'repair',
			action: 'wp-env-start',
		} );
		const startResult = await runWpEnv( group, [ 'start' ], {
			timeoutMs: 10 * 60 * 1000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-env-start.log`
			),
		} );
		if ( ! startResult.ok ) {
			throw new Error(
				`${ group.name }: wp-env start failed; see ${ group.name }-wp-env-start.log`
			);
		}
		statusResult = await runWpEnv( group, [ 'status' ], {
			timeoutMs: 120000,
			logPath: path.join(
				OUTPUT_DIR,
				`${ group.name }-wp-env-status.log`
			),
		} );
	}

	const siteUrl = await getWpSiteUrl( group );
	const httpPort = parseHttpPort( statusResult.output );
	const candidates = [
		normalizeBaseUrl( group.env?.RTC_FUZZ_BASE_URL ),
		normalizeBaseUrl( group.env?.WP_BASE_URL ),
		siteUrl,
		httpPort ? `http://localhost:${ httpPort }` : null,
	]
		.filter( Boolean )
		.filter(
			( value, index, values ) => values.indexOf( value ) === index
		);

	for ( const candidate of candidates ) {
		const probe = await probeRestEndpoint( candidate );
		if ( probe.ok ) {
			if ( siteUrl && siteUrl !== candidate ) {
				await log(
					`${ group.name }: repairing WordPress base URL ${ siteUrl } -> ${ candidate }.`
				);
				await event( {
					group: group.name,
					kind: 'repair',
					action: 'wp-option-base-url',
					from: siteUrl,
					to: candidate,
				} );
				await setWpBaseUrl( group, candidate );
			}
			groupState.currentBaseUrl = candidate;
			groupState.lastHealthyAt = new Date().toISOString();
			return candidate;
		}
	}

	throw new Error(
		`${
			group.name
		}: no healthy REST endpoint. candidates=${ candidates.join( ', ' ) }`
	);
}

async function ensureWsRelay( group ) {
	const port = String(
		group.wsPort ?? group.env?.GUTENBERG_RTC_TEST_WS_PORT ?? '18991'
	);
	const healthUrl = `http://127.0.0.1:${ port }/health`;
	const probe = await fetch( healthUrl ).catch( () => null );
	if ( probe?.ok ) {
		return;
	}

	const logPath = path.join( OUTPUT_DIR, `${ group.name }-ws-relay.log` );
	const logFd = await fs.open( logPath, 'a' );
	const child = spawn(
		process.execPath,
		[ 'bin/rtc-test-ws-sync-server.mjs', '--port', port ],
		{
			cwd: path.resolve( group.wsServerRepoRoot ?? group.repoRoot ),
			detached: true,
			stdio: [ 'ignore', logFd.fd, logFd.fd ],
			env: buildEnv( group, {
				GUTENBERG_RTC_TEST_WS_PORT: port,
			} ),
		}
	);
	child.unref();
	await logFd.close();
	await event( {
		group: group.name,
		kind: 'repair',
		action: 'start-ws-relay',
		port,
		pid: child.pid,
	} );

	for ( let attempt = 0; attempt < 50; attempt++ ) {
		const retry = await fetch( healthUrl ).catch( () => null );
		if ( retry?.ok ) {
			return;
		}
		await sleep( 200 );
	}

	throw new Error(
		`${ group.name }: WebSocket relay did not become healthy on ${ port }.`
	);
}

async function ensureTransport( groupState ) {
	const group = getGroupConfig( groupState.name );
	if ( group.transport === 'ws' ) {
		await ensureWsRelay( group );
		await runWpEnv(
			group,
			[
				'run',
				'cli',
				'wp',
				'plugin',
				'activate',
				'gutenberg-test-plugins/rtc-websocket-provider',
			],
			{ timeoutMs: 60000 }
		);
		return;
	}

	await runWpEnv(
		group,
		[
			'run',
			'cli',
			'wp',
			'plugin',
			'deactivate',
			'gutenberg-test-plugins/rtc-websocket-provider',
		],
		{ timeoutMs: 60000 }
	);
}

function groupEnvForLaunch( group, groupState, baseUrl, runDir ) {
	const transportEnv =
		group.transport === 'ws'
			? {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
					GUTENBERG_RTC_TEST_WS_PORT: String(
						group.wsPort ??
							group.env?.GUTENBERG_RTC_TEST_WS_PORT ??
							'18991'
					),
					GUTENBERG_RTC_TEST_WS_URL:
						group.wsUrl ??
						group.env?.GUTENBERG_RTC_TEST_WS_URL ??
						`ws://127.0.0.1:${
							group.wsPort ??
							group.env?.GUTENBERG_RTC_TEST_WS_PORT ??
							'18991'
						}`,
					GUTENBERG_RTC_TEST_WS_SKIP_RESET: '1',
			  }
			: {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '0',
			  };

	return buildEnv( group, {
		...transportEnv,
		RTC_FUZZ_BASE_URL: baseUrl,
		WP_BASE_URL: baseUrl,
		RTC_FUZZ_OUTPUT_DIR: runDir,
		RTC_FUZZ_PARALLEL_LANES: String( groupState.lanes ),
		RTC_FUZZ_START_SEED: String( groupState.nextStartSeed ),
		RTC_FUZZ_STEP_COUNT: String( groupState.stepCount ),
		RTC_FUZZ_DURATION_HOURS: String(
			Math.max( 0.1, ( END_AT - Date.now() ) / ( 60 * 60 * 1000 ) )
		),
		RTC_FUZZ_INLINE_CODEX: group.inlineCodex ?? '0',
		RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP: group.skipGlobalPostCleanup ?? '1',
		RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS:
			group.healthCheckIntervalSeeds ?? '1',
		RTC_FUZZ_HTTP_HEALTH_TIMEOUT_MS: group.httpHealthTimeoutMs ?? '10000',
	} );
}

async function launchGroup( groupState, reason, laneCount = groupState.lanes ) {
	const group = getGroupConfig( groupState.name );
	const baseUrl = await ensureWpEnv( groupState );
	await ensureTransport( groupState );

	groupState.generation += 1;
	groupState.lastReason = reason;
	groupState.lastRecoveryAt = new Date().toISOString();
	groupState.status = 'launching';

	const runDir = path.join(
		OUTPUT_DIR,
		`${ group.name }-gen-${ groupState.generation }-${ createTimestamp() }`
	);
	await fs.mkdir( runDir, { recursive: true } );
	const launchLogPath = path.join( runDir, 'supervisor-launcher.log' );
	await log(
		`${ group.name }: launching ${ laneCount } ${ group.transport } lane(s) from seed ${ groupState.nextStartSeed } at ${ baseUrl } (${ reason }).`
	);
	await event( {
		group: group.name,
		kind: 'launch',
		reason,
		runDir,
		baseUrl,
		lanes: laneCount,
		startSeed: groupState.nextStartSeed,
		transport: group.transport,
	} );

	const launchResult = await runCommand( {
		command: process.execPath,
		args: [ 'bin/rtc-browser-fuzz-launcher.mjs' ],
		cwd: group.repoRoot,
		env: {
			...groupEnvForLaunch( group, groupState, baseUrl, runDir ),
			RTC_FUZZ_PARALLEL_LANES: String( laneCount ),
		},
		timeoutMs: 180000,
		logPath: launchLogPath,
	} );

	if ( ! launchResult.ok ) {
		groupState.status = 'launch-failed';
		groupState.launches.push( {
			runDir,
			at: new Date().toISOString(),
			ok: false,
			reason,
			logPath: launchLogPath,
		} );
		await writeState();
		throw new Error(
			`${ group.name }: launcher failed with code=${ launchResult.code }; see ${ launchLogPath }`
		);
	}

	groupState.currentRunDir = runDir;
	groupState.activeRunDirs = [
		...( groupState.activeRunDirs ?? [] ),
		runDir,
	].filter( ( value, index, values ) => values.indexOf( value ) === index );
	groupState.currentBaseUrl = baseUrl;
	groupState.status = 'running';
	groupState.lastLaunchAt = new Date().toISOString();
	groupState.launches.push( {
		runDir,
		at: groupState.lastLaunchAt,
		ok: true,
		reason,
		baseUrl,
		lanes: laneCount,
		startSeed: groupState.nextStartSeed,
	} );
	await writeState();
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

function isPidAlive( pid ) {
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

function getActiveRunDirs( groupState ) {
	return [ ...( groupState.activeRunDirs ?? [] ), groupState.currentRunDir ]
		.filter( Boolean )
		.filter(
			( value, index, values ) => values.indexOf( value ) === index
		);
}

function getResumeSeed( laneStates ) {
	const seeds = laneStates
		.map( ( lane ) => lane.state?.nextSeed )
		.filter( ( value ) => Number.isInteger( value ) );
	return seeds.length ? Math.min( ...seeds ) : null;
}

async function readRunSnapshot( runDir ) {
	const manifest = await readJsonFile( path.join( runDir, 'lanes.json' ) );
	if ( ! manifest?.lanes ) {
		return {
			manifest: null,
			laneStates: [],
			liveLaneCount: 0,
			stopReasons: [ 'missing-manifest' ],
			resumeSeed: null,
		};
	}

	const laneStates = [];
	for ( const lane of manifest.lanes ) {
		const laneState = await readJsonFile(
			path.join( lane.outputDir, 'state.json' )
		);
		laneStates.push( {
			...lane,
			state: laneState,
			pidAlive: isPidAlive( lane.pid ),
		} );
	}

	return {
		manifest,
		laneStates,
		liveLaneCount: laneStates.filter(
			( lane ) => lane.pidAlive && ! lane.state?.stopReason
		).length,
		stopReasons: laneStates
			.map( ( lane ) => lane.state?.stopReason )
			.filter( Boolean ),
		resumeSeed: getResumeSeed( laneStates ),
	};
}

async function monitorGroup( groupState ) {
	const activeRunDirs = getActiveRunDirs( groupState );
	if ( ! activeRunDirs.length ) {
		await launchGroup( groupState, 'initial-start' );
		return;
	}

	const snapshots = await Promise.all(
		activeRunDirs.map( async ( runDir ) => ( {
			runDir,
			...( await readRunSnapshot( runDir ) ),
		} ) )
	);
	const liveLaneCount = snapshots.reduce(
		( count, snapshot ) => count + snapshot.liveLaneCount,
		0
	);
	const stopReasons = snapshots.flatMap(
		( snapshot ) => snapshot.stopReasons
	);
	const stoppedLaneStates = snapshots.flatMap( ( snapshot ) =>
		snapshot.laneStates.filter(
			( lane ) => ! lane.pidAlive || lane.state?.stopReason
		)
	);
	const stoppedResumeSeed = getResumeSeed( stoppedLaneStates );
	const anyResumeSeed = getResumeSeed(
		snapshots.flatMap( ( snapshot ) => snapshot.laneStates )
	);

	groupState.activeRunDirs = snapshots
		.filter( ( snapshot ) => snapshot.liveLaneCount > 0 )
		.map( ( snapshot ) => snapshot.runDir );

	if ( liveLaneCount > 0 ) {
		groupState.status = 'running';
		if ( Number.isFinite( stoppedResumeSeed ) ) {
			groupState.nextStartSeed = stoppedResumeSeed;
		} else if ( Number.isFinite( anyResumeSeed ) ) {
			groupState.nextStartSeed = anyResumeSeed;
		}

		const missingLaneCount = Math.max(
			0,
			groupState.lanes - liveLaneCount
		);
		const lastPartialRecoveryAt = groupState.lastPartialRecoveryAt
			? Date.parse( groupState.lastPartialRecoveryAt )
			: 0;
		if (
			missingLaneCount > 0 &&
			Date.now() - lastPartialRecoveryAt > 5 * 60 * 1000
		) {
			groupState.lastPartialRecoveryAt = new Date().toISOString();
			await writeState();
			await log(
				`${ groupState.name }: ${ liveLaneCount }/${ groupState.lanes } lane(s) still live; launching ${ missingLaneCount } replacement lane(s).`
			);
			await event( {
				group: groupState.name,
				kind: 'repair',
				action: 'partial-lane-replacement',
				liveLaneCount,
				missingLaneCount,
				startSeed: groupState.nextStartSeed,
				reasons: [ ...new Set( stopReasons ) ],
			} );
			await launchGroup(
				groupState,
				`partial:${ missingLaneCount }-lane-replacement`,
				missingLaneCount
			);
			return;
		}

		await writeState();
		return;
	}

	if ( Date.now() >= END_AT ) {
		groupState.status = 'complete';
		await writeState();
		return;
	}

	if ( Number.isFinite( anyResumeSeed ) ) {
		groupState.nextStartSeed = anyResumeSeed;
	}

	const reason = stopReasons.length
		? `stopped:${ [ ...new Set( stopReasons ) ].join( ',' ) }`
		: 'stopped:no-live-lanes';
	const lastLaunchAt = groupState.lastLaunchAt
		? Date.parse( groupState.lastLaunchAt )
		: 0;
	const fastFailure = Date.now() - lastLaunchAt < 2 * 60 * 1000;

	if ( fastFailure ) {
		groupState.consecutiveFastFailures += 1;
		if ( groupState.consecutiveFastFailures >= 2 && groupState.lanes > 1 ) {
			groupState.lanes -= 1;
			await log(
				`${ groupState.name }: repeated fast failure; reducing to ${ groupState.lanes } lane(s) before relaunch.`
			);
			await event( {
				group: groupState.name,
				kind: 'repair',
				action: 'reduce-lanes',
				lanes: groupState.lanes,
				reason,
			} );
		}
	} else {
		groupState.consecutiveFastFailures = 0;
	}

	groupState.status = 'recovering';
	groupState.activeRunDirs = [];
	await writeState();
	await launchGroup( groupState, reason );
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

async function main() {
	await log(
		`RTC browser fuzz supervisor started with ${ groupConfigs.length } group(s), outputDir=${ OUTPUT_DIR }, durationHours=${ DURATION_HOURS }.`
	);
	await event( {
		kind: 'supervisor-start',
		outputDir: OUTPUT_DIR,
		groups: groupConfigs.map( ( group ) => ( {
			name: group.name,
			repoRoot: group.repoRoot,
			transport: group.transport,
			lanes: group.lanes,
			startSeed: group.startSeed,
		} ) ),
	} );

	while ( Date.now() < END_AT ) {
		await syncGroupConfigs();
		for ( const groupState of state.groups ) {
			if ( groupState.status === 'disabled' ) {
				continue;
			}
			try {
				await monitorGroup( groupState );
			} catch ( error ) {
				groupState.status = 'error';
				groupState.lastReason = error.stack ?? error.message;
				await log(
					`${ groupState.name }: ${ error.stack ?? error.message }`
				);
				await event( {
					group: groupState.name,
					kind: 'error',
					error: error.stack ?? error.message,
				} );
				await writeState();
			}
		}
		await sleep( POLL_MS );
	}

	state.groups.forEach( ( group ) => {
		group.status =
			group.status === 'running' ? 'duration-elapsed' : group.status;
	} );
	await writeState();
	await event( { kind: 'supervisor-stop', reason: 'duration-elapsed' } );
	await log(
		'RTC browser fuzz supervisor exiting after requested duration.'
	);
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
