#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
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
const DEFAULT_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_MANIFEST_REPRO_TIMEOUT_MS',
	6 * 60 * 1000
);
const DEFAULT_WS_PORT = getPositiveIntegerEnv(
	'RTC_MANIFEST_WS_START_PORT',
	19391
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

function parseArgs() {
	const options = {
		manifestPath: '',
		resultsDir: '',
		transport: 'all',
		limit: Infinity,
		shardCount: 1,
		shardIndex: 0,
	};

	for ( let index = 2; index < process.argv.length; index++ ) {
		const arg = process.argv[ index ];
		const nextValue = () => {
			const value = process.argv[ ++index ];
			if ( ! value ) {
				throw new Error( `Missing value for ${ arg }.` );
			}
			return value;
		};

		if ( arg === '--manifest' ) {
			options.manifestPath = path.resolve( nextValue() );
		} else if ( arg === '--results-dir' ) {
			options.resultsDir = path.resolve( nextValue() );
		} else if ( arg === '--transport' ) {
			options.transport = nextValue();
			if ( ! [ 'all', 'http', 'websocket' ].includes( options.transport ) ) {
				throw new Error( 'Expected --transport to be all, http, or websocket.' );
			}
		} else if ( arg === '--limit' ) {
			options.limit = Number.parseInt( nextValue(), 10 );
			if ( Number.isNaN( options.limit ) || options.limit <= 0 ) {
				throw new Error( 'Expected --limit to be a positive integer.' );
			}
		} else if ( arg === '--shard-count' ) {
			options.shardCount = Number.parseInt( nextValue(), 10 );
			if ( Number.isNaN( options.shardCount ) || options.shardCount <= 0 ) {
				throw new Error( 'Expected --shard-count to be a positive integer.' );
			}
		} else if ( arg === '--shard-index' ) {
			options.shardIndex = Number.parseInt( nextValue(), 10 );
			if ( Number.isNaN( options.shardIndex ) || options.shardIndex < 0 ) {
				throw new Error( 'Expected --shard-index to be a non-negative integer.' );
			}
		} else if ( arg === '--help' || arg === '-h' ) {
			printUsage();
			process.exit( 0 );
		} else {
			throw new Error( `Unknown argument: ${ arg }.` );
		}
	}

	if ( ! options.manifestPath ) {
		throw new Error( 'Missing --manifest.' );
	}

	if ( ! options.resultsDir ) {
		options.resultsDir = path.join(
			path.dirname( options.manifestPath ),
			'rerun-results'
		);
	}

	if ( options.shardIndex >= options.shardCount ) {
		throw new Error( '--shard-index must be smaller than --shard-count.' );
	}

	return options;
}

function printUsage() {
	process.stdout.write( `Usage:
  node bin/rtc-browser-fuzz-rerun-manifest.mjs \\
    --manifest fuzz-handoff/distinct-manifest/distinct-bug-manifest.json \\
    --results-dir fuzz-handoff/distinct-manifest/rerun-results \\
    --transport http|websocket|all \\
    --limit 20 \\
    --shard-count 4 --shard-index 0

Results are appended to results.jsonl after each canonical repro, so the run
can be stopped and resumed without losing completed entries.
` );
}

async function pathExists( filePath ) {
	try {
		await fs.access( filePath );
		return true;
	} catch {
		return false;
	}
}

async function loadCompletedKeys( resultsPath ) {
	if ( ! ( await pathExists( resultsPath ) ) ) {
		return new Set();
	}

	const content = await fs.readFile( resultsPath, 'utf8' );
	const keys = new Set();

	for ( const line of content.split( '\n' ) ) {
		if ( ! line.trim() ) {
			continue;
		}

		try {
			const record = JSON.parse( line );
			keys.add( record.key );
		} catch {}
	}

	return keys;
}

function getRunnableGroups( manifest, transport, shardCount, shardIndex ) {
	return manifest.groups.filter( ( group, index ) => {
		if ( ! group.canonical.materializedSpecRelative ) {
			return false;
		}

		if ( transport !== 'all' && group.transport !== transport ) {
			return false;
		}

		return index % shardCount === shardIndex;
	} );
}

function safeFileName( value ) {
	return value
		.toLowerCase()
		.replaceAll( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' )
		.slice( 0, 120 );
}

async function appendJsonLine( filePath, record ) {
	await fs.appendFile( filePath, JSON.stringify( record ) + '\n' );
}

async function writeStatus( filePath, patch ) {
	let existing = {};
	if ( await pathExists( filePath ) ) {
		try {
			existing = JSON.parse( await fs.readFile( filePath, 'utf8' ) );
		} catch {}
	}

	await fs.writeFile(
		filePath,
		JSON.stringify(
			{
				...existing,
				...patch,
				updatedAt: new Date().toISOString(),
			},
			null,
			2
		) + '\n'
	);
}

async function waitForHttpOk( url, timeoutMs ) {
	const startTime = Date.now();
	let lastError;

	while ( Date.now() - startTime < timeoutMs ) {
		try {
			const response = await fetch( url );
			if ( response.ok ) {
				return;
			}
			lastError = new Error( `HTTP ${ response.status }` );
		} catch ( error ) {
			lastError = error;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}

	throw lastError ?? new Error( `Timed out waiting for ${ url }.` );
}

async function withWebsocketServer( port, callback ) {
	const child = spawn(
		process.execPath,
		[ 'bin/rtc-test-ws-sync-server.mjs', '--port', String( port ) ],
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
	child.stdout.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );
	child.stderr.on( 'data', ( chunk ) => chunks.push( chunk.toString() ) );

	try {
		await waitForHttpOk( `http://127.0.0.1:${ port }/health`, 10000 );
		return await callback();
	} finally {
		child.kill( 'SIGTERM' );
		await new Promise( ( resolve ) => {
			const timer = setTimeout( resolve, 2000 );
			child.on( 'close', () => {
				clearTimeout( timer );
				resolve();
			} );
		} );
		if ( child.exitCode && child.exitCode !== 0 ) {
			process.stderr.write( chunks.join( '' ) );
		}
	}
}

async function runCommand( {
	args,
	env,
	logPath,
	timeoutMs,
} ) {
	await fs.mkdir( path.dirname( logPath ), { recursive: true } );
	const logHandle = await fs.open( logPath, 'a' );
	const startedAt = new Date().toISOString();
	const startTime = Date.now();

	await logHandle.write(
		`[${ startedAt }] ${ args.map( quoteForLog ).join( ' ' ) }\n`
	);

	const child = spawn( 'npm', args, {
		cwd: REPO_ROOT,
		env: {
			...process.env,
			PATH: SHARED_PATH,
			...env,
		},
		stdio: [ 'ignore', logHandle.fd, logHandle.fd ],
	} );
	let timedOut = false;
	const timer = setTimeout( () => {
		timedOut = true;
		child.kill( 'SIGTERM' );
		setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
	}, timeoutMs );

	const exitCode = await new Promise( ( resolve, reject ) => {
		child.on( 'error', reject );
		child.on( 'close', ( code ) => resolve( code ) );
	} );
	clearTimeout( timer );

	await logHandle.write(
		`[${ new Date().toISOString() }] exitCode=${ exitCode } timedOut=${ timedOut }\n`
	);
	await logHandle.close();

	return {
		exitCode,
		timedOut,
		durationMs: Date.now() - startTime,
		startedAt,
		completedAt: new Date().toISOString(),
	};
}

function quoteForLog( value ) {
	return /[\s"'$]/.test( value ) ? JSON.stringify( value ) : value;
}

async function runGroup( group, index, resultsDir ) {
	const specPath = group.canonical.manifestRunPath;
	const logPath = path.join(
		resultsDir,
		'logs',
		`${ String( index ).padStart( 4, '0' ) }-${ group.canonical.signature }-${ safeFileName( group.bugType ) }.log`
	);
	const outputDir = path.join(
		resultsDir,
		'outputs',
		`${ String( index ).padStart( 4, '0' ) }-${ group.canonical.signature }`
	);
	const args = [
		'run',
		'test:e2e',
		'--',
		specPath,
		'--project=chromium',
		'--workers=1',
	];
	const env = {
		GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING: '1',
		GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP: '1',
		WP_ARTIFACTS_PATH: path.join( outputDir, 'playwright-artifacts' ),
		RTC_MANIFEST_REPRO_OUTPUT_DIR: outputDir,
		RTC_TITLE_REPRO_DIR: path.join( outputDir, 'title-repro' ),
		RTC_A2E6705_REPRO_DIR: path.join( outputDir, 'a2e6705-repro' ),
	};

	if ( group.transport === 'websocket' ) {
		const port = DEFAULT_WS_PORT + index;
		env.GUTENBERG_RTC_TEST_WS_PROVIDER = '1';
		env.GUTENBERG_RTC_TEST_WS_PORT = String( port );
		env.GUTENBERG_RTC_TEST_WS_URL = `ws://127.0.0.1:${ port }`;

		return await withWebsocketServer( port, () =>
			runCommand( {
				args,
				env,
				logPath,
				timeoutMs: DEFAULT_TIMEOUT_MS,
			} )
		);
	}

	return await runCommand( {
		args,
		env,
		logPath,
		timeoutMs: DEFAULT_TIMEOUT_MS,
	} );
}

async function main() {
	const options = parseArgs();
	const manifest = JSON.parse( await fs.readFile( options.manifestPath, 'utf8' ) );
	await fs.mkdir( options.resultsDir, { recursive: true } );

	const resultsPath = path.join( options.resultsDir, 'results.jsonl' );
	const statusPath = path.join( options.resultsDir, 'status.json' );
	const completedKeys = await loadCompletedKeys( resultsPath );
	const groups = getRunnableGroups(
		manifest,
		options.transport,
		options.shardCount,
		options.shardIndex
	);
	let attempted = 0;
	let passed = 0;
	let failed = 0;
	let skipped = 0;

	await writeStatus( statusPath, {
		startedAt: new Date().toISOString(),
		manifestPath: options.manifestPath,
		transport: options.transport,
		shardCount: options.shardCount,
		shardIndex: options.shardIndex,
		totalRunnable: groups.length,
		limit: Number.isFinite( options.limit ) ? options.limit : null,
		completedAt: null,
		stopReason: null,
	} );

	for ( let index = 0; index < groups.length; index++ ) {
		if ( attempted >= options.limit ) {
			break;
		}

		const group = groups[ index ];
		const key = `${ group.bugType }::${ group.canonical.signature }::${ group.canonical.manifestRunPath }`;
		if ( completedKeys.has( key ) ) {
			skipped++;
			continue;
		}

		const specExists = await pathExists(
			path.join( REPO_ROOT, group.canonical.manifestRunPath )
		);
		if ( ! specExists ) {
			const record = {
				key,
				bugType: group.bugType,
				signature: group.canonical.signature,
				specPath: group.canonical.manifestRunPath,
				transport: group.transport,
				result: 'missing-spec',
				completedAt: new Date().toISOString(),
			};
			await appendJsonLine( resultsPath, record );
			completedKeys.add( key );
			failed++;
			continue;
		}

		attempted++;
		await writeStatus( statusPath, {
			current: {
				index,
				bugType: group.bugType,
				signature: group.canonical.signature,
				specPath: group.canonical.manifestRunPath,
				transport: group.transport,
			},
			attempted,
			passed,
			failed,
			skipped,
		} );

		const runResult = await runGroup( group, index, options.resultsDir );
		const result = runResult.exitCode === 0 && ! runResult.timedOut ? 'passed' : 'failed';
		if ( result === 'passed' ) {
			passed++;
		} else {
			failed++;
		}

		const record = {
			key,
			bugType: group.bugType,
			signature: group.canonical.signature,
			specPath: group.canonical.manifestRunPath,
			transport: group.transport,
			result,
			...runResult,
		};
		await appendJsonLine( resultsPath, record );
		completedKeys.add( key );
	}

	await writeStatus( statusPath, {
		completedAt: new Date().toISOString(),
		current: null,
		attempted,
		passed,
		failed,
		skipped,
		stopReason: attempted >= options.limit ? 'limit' : 'complete',
	} );

	process.stdout.write(
		JSON.stringify(
			{
				resultsPath,
				statusPath,
				attempted,
				passed,
				failed,
				skipped,
			},
			null,
			2
		) + '\n'
	);
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
