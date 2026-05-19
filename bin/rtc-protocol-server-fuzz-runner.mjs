#!/usr/bin/env node
// @ts-nocheck
/**
 * Protocol/server fuzz runner for the Gutenberg HTTP polling sync endpoint.
 *
 * Runs the seeded PHPUnit harness one seed at a time and writes collector-style
 * lane artifacts without touching browser fuzzing sessions.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const TARGET = 'wp-sync/v1/updates';
const TRANSPORT = 'http-polling-rest';
const PROFILE = 'wp-http-polling-protocol-state-machine';
const FUZZ_LEVEL = 'protocol-server';
const DEFAULT_MAX_CONSECUTIVE_INFRA_FAILURES = 3;
const DEFAULT_OUTPUT_DIR =
	'/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516/protocol';

function parseArgs( argv ) {
	const options = {};
	for ( let index = 0; index < argv.length; index++ ) {
		const arg = argv[ index ];
		if ( ! arg.startsWith( '--' ) ) {
			continue;
		}

		const [ rawName, inlineValue ] = arg.slice( 2 ).split( '=', 2 );
		const name = rawName.replace( /-([a-z])/g, ( _, letter ) =>
			letter.toUpperCase()
		);

		if ( inlineValue !== undefined ) {
			options[ name ] = inlineValue;
		} else if (
			argv[ index + 1 ] &&
			! argv[ index + 1 ].startsWith( '--' )
		) {
			options[ name ] = argv[ ++index ];
		} else {
			options[ name ] = true;
		}
	}
	return options;
}

function envInt( name, fallback, minimum = 0 ) {
	const value = process.env[ name ];
	if ( value === undefined || value === '' ) {
		return fallback;
	}
	const parsed = Number.parseInt( value, 10 );
	if ( Number.isNaN( parsed ) ) {
		return fallback;
	}
	return Math.max( minimum, parsed );
}

function optionInt( options, name, envName, fallback, minimum = 0 ) {
	if ( options[ name ] !== undefined ) {
		const parsed = Number.parseInt( options[ name ], 10 );
		if ( ! Number.isNaN( parsed ) ) {
			return Math.max( minimum, parsed );
		}
	}
	return envInt( envName, fallback, minimum );
}

function utcStamp() {
	return new Date()
		.toISOString()
		.replace( /[-:]/g, '' )
		.replace( /\.\d{3}Z$/, 'Z' );
}

function mkdirp( dir ) {
	fs.mkdirSync( dir, { recursive: true } );
}

function copyDirContents( from, to ) {
	if ( ! fs.existsSync( from ) ) {
		return;
	}
	mkdirp( to );
	for ( const entry of fs.readdirSync( from, { withFileTypes: true } ) ) {
		const source = path.join( from, entry.name );
		const target = path.join( to, entry.name );
		if ( entry.isDirectory() ) {
			copyDirContents( source, target );
		} else {
			fs.copyFileSync( source, target );
		}
	}
}

function isInsideRepo( hostPath ) {
	const relative = path.relative( process.cwd(), path.resolve( hostPath ) );
	return (
		relative === '' ||
		( ! relative.startsWith( '..' ) && ! path.isAbsolute( relative ) )
	);
}

function assertPhpArtifactRootVisible( phpArtifactRoot ) {
	if ( isInsideRepo( phpArtifactRoot ) ) {
		return;
	}

	const message = `RTC_PROTOCOL_SERVER_FUZZ_PHP_ARTIFACT_ROOT must be inside the repository checkout so wp-env can write seed summaries through its Gutenberg bind mount. Got: ${ phpArtifactRoot }`;
	if (
		String(
			process.env
				.RTC_PROTOCOL_SERVER_FUZZ_ALLOW_UNMOUNTED_PHP_ARTIFACT_ROOT ??
				''
		) === '1'
	) {
		process.stderr.write( `warning: ${ message }\n` );
		return;
	}

	throw new Error( message );
}

function toContainerRepoPath( hostPath ) {
	const resolved = path.resolve( hostPath );
	const relative = path.relative( process.cwd(), resolved );
	if ( ! isInsideRepo( resolved ) ) {
		return hostPath;
	}

	const containerRepo =
		process.env.RTC_PROTOCOL_SERVER_FUZZ_CONTAINER_REPO_DIR ??
		'/var/www/html/wp-content/plugins/gutenberg';
	return path.posix.join( containerRepo, ...relative.split( path.sep ) );
}

function appendJsonLine( file, record ) {
	fs.appendFileSync( file, `${ JSON.stringify( record ) }\n` );
}

function appendEvent( config, record ) {
	const line = `${ JSON.stringify( record ) }\n`;
	fs.appendFileSync( config.eventsPath, line );
	fs.appendFileSync( config.rootEventsPath, line );
}

function appendStatus( config, record ) {
	const fields = [
		record.at,
		`level=${ FUZZ_LEVEL }`,
		`group=${ config.groupName }`,
		`lane=${ config.lane }`,
		`seed=${ record.seed }`,
		`exit=${ record.exitCode ?? '' }`,
		`classification=${ record.classification ?? '' }`,
		`failureKind=${ record.failureKind ?? '' }`,
		`testExecutionCount=${ record.testExecutionCount ?? '' }`,
		`log=${ record.logPath ?? '' }`,
		`summary=${ record.summaryPath ?? '' }`,
	];
	const line = `${ fields.join( '\t' ) }\n`;

	fs.appendFileSync( config.statusPath, line );
	fs.appendFileSync( config.rootStatusPath, line );
}

function readJsonIfExists( file ) {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
}

function repoCommit() {
	const result = spawnSync( 'git', [ 'rev-parse', '--short=12', 'HEAD' ], {
		encoding: 'utf8',
	} );
	if ( result.status === 0 ) {
		return result.stdout.trim();
	}
	return 'unknown';
}

function hashText( text ) {
	return crypto
		.createHash( 'sha256' )
		.update( text )
		.digest( 'hex' )
		.slice( 0, 16 );
}

function looksLikeEnvironmentFailure( text ) {
	return /wp-env|docker|container|Cannot connect|ECONNREFUSED|Environment not initialized|vendor\/autoload|No such file|not found/i.test(
		text
	);
}

function looksLikeFatalEnvironmentOutput( text ) {
	return /WordPress database error|wp_die\(\) called|One or more database tables are unavailable|No space left on device|Disk got full|Can't create table|Error writing file|Base table or view not found|doesn'?t exist/i.test(
		text
	);
}

function classifyAttempt( result, summary, output ) {
	if ( result.error ) {
		const timedOut = result.error.code === 'ETIMEDOUT';
		return {
			classification: 'infra-failure',
			failureKind: timedOut ? 'timeout' : 'spawn-error',
			ok: false,
		};
	}

	if ( result.signal ) {
		return {
			classification: 'infra-failure',
			failureKind: `signal-${ result.signal }`,
			ok: false,
		};
	}

	if ( looksLikeFatalEnvironmentOutput( output ) ) {
		return {
			classification: 'infra-failure',
			failureKind: 'environment-output',
			ok: false,
		};
	}

	if ( ! summary ) {
		if ( result.status !== 0 && looksLikeEnvironmentFailure( output ) ) {
			return {
				classification: 'infra-failure',
				failureKind: 'environment',
				ok: false,
			};
		}

		return {
			classification: 'infra-failure',
			failureKind: 'missing-summary',
			ok: false,
		};
	}

	if ( summary.ok === false ) {
		const summaryFailure = [
			summary.failure?.class,
			summary.failure?.message,
		]
			.filter( Boolean )
			.join( '\n' );
		const looksInfra =
			/WP_Error|factory|wptests_|database table|bootstrap/i.test(
				summaryFailure
			) || looksLikeEnvironmentFailure( summaryFailure );

		return {
			classification: looksInfra ? 'infra-failure' : 'oracle-failure',
			failureKind: looksInfra ? 'environment' : 'oracle',
			ok: false,
		};
	}

	if ( result.status !== 0 ) {
		const looksInfra = looksLikeEnvironmentFailure( output );
		return {
			classification: looksInfra ? 'infra-failure' : 'oracle-failure',
			failureKind: looksInfra ? 'environment' : 'phpunit-nonzero',
			ok: false,
		};
	}

	return {
		classification: 'pass',
		failureKind: null,
		ok: true,
	};
}

function writeSupervisorGroups(
	runRoot,
	groupName,
	generationName,
	laneCount,
	repoSha
) {
	const groups = [
		{
			fuzzLevel: FUZZ_LEVEL,
			generatedAt: new Date().toISOString(),
			generationName,
			lanes: laneCount,
			name: groupName,
			profile: PROFILE,
			repoCommit: repoSha,
			target: TARGET,
			transport: TRANSPORT,
			version: 1,
		},
	];
	fs.writeFileSync(
		path.join( runRoot, 'supervisor-groups.json' ),
		`${ JSON.stringify( groups, null, 2 ) }\n`
	);
}

function buildCommand( seed, caseCount, seedDir, tablePrefix ) {
	const phpunitBin =
		process.env.RTC_PROTOCOL_SERVER_FUZZ_PHPUNIT_BIN ??
		( fs.existsSync( 'vendor/bin/phpunit' )
			? 'vendor/bin/phpunit'
			: 'phpunit' );
	const wpEnvBin =
		process.env.RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN ??
		'./node_modules/.bin/wp-env';
	const wpEnvConfig =
		process.env.RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG ??
		'.wp-env.test.json';
	const phpEnv = [
		`RTC_PROTOCOL_SERVER_FUZZ_SEED_START=${ seed }`,
		'RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT=1',
		`RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT=${ caseCount }`,
		`RTC_PROTOCOL_SERVER_FUZZ_TRACE_DIR=${ seedDir }`,
		`RTC_PROTOCOL_SERVER_FUZZ_SUMMARY_DIR=${ seedDir }`,
	];
	if ( tablePrefix ) {
		phpEnv.push( `WORDPRESS_TABLE_PREFIX=${ tablePrefix }` );
	}

	return {
		args: [
			'--config',
			wpEnvConfig,
			'run',
			'--env-cwd=wp-content/plugins/gutenberg',
			'wordpress',
			'env',
			...phpEnv,
			phpunitBin,
			'-c',
			'phpunit.xml.dist',
			'--filter',
			'Tests_Collaboration_WpHttpPollingSyncServerProtocolFuzz::test_seeded_protocol_server_state_machine',
			'phpunit/tests/collaboration/wpHttpPollingSyncServerProtocolFuzz.php',
		],
		command: wpEnvBin,
	};
}

function runSeed( config, seed ) {
	const seedDir = path.join( config.laneDir, `seed-${ seed }` );
	const phpSeedDir = path.join( config.phpArtifactRoot, `seed-${ seed }` );
	const logPath = path.join( seedDir, 'phpunit.log' );
	mkdirp( seedDir );
	mkdirp( phpSeedDir );

	const command = buildCommand(
		seed,
		config.caseCount,
		toContainerRepoPath( phpSeedDir ),
		config.tablePrefix
	);
	appendEvent(
		config,
		baseEvent( config, 'seed-attempt-start', {
			caseCount: config.caseCount,
			individualTestExecutionCount: config.caseCount,
			command: command.command,
			args: command.args,
			containerArtifactDir: toContainerRepoPath( phpSeedDir ),
			label: 'primary',
			phpArtifactDir: phpSeedDir,
			seed,
			seedDir,
			testExecutionCount: config.caseCount,
		} )
	);
	const startedAt = Date.now();
	const result = spawnSync( command.command, command.args, {
		encoding: 'utf8',
		env: {
			...process.env,
			...( config.wpEnvPort ? { WP_ENV_PORT: config.wpEnvPort } : {} ),
		},
		maxBuffer: 50 * 1024 * 1024,
		timeout: config.seedTimeoutMs,
	} );
	const durationMs = Date.now() - startedAt;
	const output = `${ result.stdout ?? '' }${ result.stderr ?? '' }`;
	fs.writeFileSync( logPath, output );
	copyDirContents( phpSeedDir, seedDir );

	const summaryPath = path.join( seedDir, `seed-${ seed }-summary.json` );
	const replayPath = path.join( seedDir, `seed-${ seed }-replay.json` );
	const tracePath = path.join( seedDir, `seed-${ seed }-trace.ndjson` );
	let summary = readJsonIfExists( summaryPath );
	if ( summary ) {
		summary = {
			...summary,
			replayPath: fs.existsSync( replayPath )
				? replayPath
				: summary.replayPath,
			tracePath: fs.existsSync( tracePath )
				? tracePath
				: summary.tracePath,
		};
		fs.writeFileSync(
			summaryPath,
			`${ JSON.stringify( summary, null, 2 ) }\n`
		);
	}
	const classification = classifyAttempt( result, summary, output );
	const failureText =
		summary?.failure?.message ??
		result.error?.message ??
		output.split( '\n' ).filter( Boolean ).slice( -12 ).join( '\n' );

	return {
		classification: classification.classification,
		command,
		durationMs,
		exitCode: result.status,
		failureHash: classification.ok
			? null
			: hashText( failureText || output || `seed-${ seed }` ),
		failureKind: classification.failureKind,
		failureText,
		logPath,
		ok: classification.ok,
		replayPath: fs.existsSync( replayPath )
			? replayPath
			: summary?.replayPath ?? replayPath,
		seedDir,
		summary,
		summaryPath,
		tracePath: fs.existsSync( tracePath )
			? tracePath
			: summary?.tracePath ?? tracePath,
	};
}

function baseEvent( config, kind, extra = {} ) {
	return {
		at: new Date().toISOString(),
		fuzzLevel: FUZZ_LEVEL,
		generationName: config.generationName,
		group: config.groupName,
		groupName: config.groupName,
		kind,
		laneIndex: config.lane,
		laneLabel: config.laneLabel,
		profile: PROFILE,
		repoCommit: config.repoSha,
		runId: config.runId,
		schemaVersion: 1,
		target: TARGET,
		transport: TRANSPORT,
		version: 1,
		...extra,
	};
}

function attemptExecutionCount( attempt, caseCount ) {
	if (
		! attempt.ok &&
		attempt.classification === 'infra-failure' &&
		! attempt.summary
	) {
		return 0;
	}

	const caseIndex = attempt.summary?.caseIndex;
	if (
		! attempt.ok &&
		Number.isInteger( caseIndex ) &&
		caseIndex >= 0 &&
		caseIndex < caseCount
	) {
		return caseIndex + 1;
	}

	return caseCount;
}

function writeState( config, state ) {
	fs.writeFileSync(
		path.join( config.laneDir, 'state.json' ),
		`${ JSON.stringify(
			{
				...state,
				fuzzLevel: FUZZ_LEVEL,
				generationName: config.generationName,
				groupName: config.groupName,
				laneIndex: config.lane,
				laneLabel: config.laneLabel,
				profile: PROFILE,
				target: TARGET,
				transport: TRANSPORT,
				updatedAt: new Date().toISOString(),
			},
			null,
			2
		) }\n`
	);
}

function main() {
	const options = parseArgs( process.argv.slice( 2 ) );
	const runId = String(
		options.runId ??
			process.env.RTC_PROTOCOL_SERVER_FUZZ_RUN_ID ??
			utcStamp()
	);
	const outputDir = path.resolve(
		String(
			options.outputDir ??
				process.env.RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR ??
				DEFAULT_OUTPUT_DIR
		)
	);
	const seedStart = optionInt(
		options,
		'seedStart',
		'RTC_PROTOCOL_SERVER_FUZZ_START_SEED',
		optionInt(
			options,
			'startSeed',
			'RTC_PROTOCOL_SERVER_FUZZ_SEED_START',
			1,
			0
		),
		0
	);
	const seedCount = optionInt(
		options,
		'seedCount',
		'RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT',
		8,
		1
	);
	const updateCurrentRunRoot =
		String(
			options.updateCurrentRunRoot ??
				process.env.RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT ??
				( seedCount > 1000 ? '1' : '0' )
		) !== '0';
	const caseCount = optionInt(
		options,
		'caseCount',
		'RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT',
		160,
		1
	);
	const lane = optionInt(
		options,
		'lane',
		'RTC_PROTOCOL_SERVER_FUZZ_LANE',
		0,
		0
	);
	const laneCount = optionInt(
		options,
		'laneCount',
		'RTC_PROTOCOL_SERVER_FUZZ_LANE_COUNT',
		1,
		1
	);
	const durationMs = optionInt(
		options,
		'durationMs',
		'RTC_PROTOCOL_SERVER_FUZZ_DURATION_MS',
		0,
		0
	);
	const seedTimeoutMs = optionInt(
		options,
		'seedTimeoutMs',
		'RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS',
		120000,
		1000
	);
	const maxConsecutiveInfraFailures = optionInt(
		options,
		'maxConsecutiveInfraFailures',
		'RTC_PROTOCOL_SERVER_FUZZ_MAX_CONSECUTIVE_INFRA_FAILURES',
		DEFAULT_MAX_CONSECUTIVE_INFRA_FAILURES,
		1
	);
	const wpEnvPort =
		options.wpEnvPort ??
		process.env.RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT ??
		process.env.WP_ENV_PORT ??
		'';
	const explicitTablePrefix =
		options.tablePrefix ??
		process.env.RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX ??
		process.env.WORDPRESS_TABLE_PREFIX ??
		'';
	const tablePrefix =
		explicitTablePrefix === '' ? '' : String( explicitTablePrefix );

	const repoSha = repoCommit();
	const groupName = 'protocol-server-http-polling';
	const generationName = `${ groupName }-gen-0-${ runId }`;
	const runRoot = path.join( outputDir, 'runs', runId );
	const groupDir = path.join( runRoot, generationName );
	const laneLabel = `lane-${ lane }`;
	const laneDir = path.join( groupDir, laneLabel );
	const phpArtifactRoot = path.resolve(
		String(
			options.phpArtifactRoot ??
				process.env.RTC_PROTOCOL_SERVER_FUZZ_PHP_ARTIFACT_ROOT ??
				path.join(
					process.cwd(),
					'artifacts',
					'.rtc-protocol-server-fuzz-php',
					runId,
					laneLabel
				)
		)
	);
	assertPhpArtifactRootVisible( phpArtifactRoot );
	mkdirp( laneDir );
	if ( updateCurrentRunRoot ) {
		fs.writeFileSync(
			path.join( outputDir, 'current-run-root.txt' ),
			`${ runRoot }\n`
		);
	}
	if (
		laneCount > 1 &&
		String(
			process.env.RTC_PROTOCOL_SERVER_FUZZ_ALLOW_SHARED_WP_ENV_LANES ?? ''
		) !== '1'
	) {
		throw new Error(
			'Refusing laneCount > 1 against one wp-env test database. Use isolated checkouts/ports per lane or set RTC_PROTOCOL_SERVER_FUZZ_ALLOW_SHARED_WP_ENV_LANES=1 for an intentional shared-DB experiment.'
		);
	}
	writeSupervisorGroups(
		runRoot,
		groupName,
		generationName,
		laneCount,
		repoSha
	);

	const config = {
		caseCount,
		eventsPath: path.join( laneDir, 'events.ndjson' ),
		generationName,
		groupName,
		lane,
		laneCount,
		laneDir,
		laneLabel,
		phpArtifactRoot,
		repoSha,
		rootEventsPath: path.join( runRoot, 'events.ndjson' ),
		rootStatusPath: path.join( runRoot, 'status.tsv' ),
		runId,
		runRoot,
		seedCount,
		seedStart,
		seedTimeoutMs,
		statusPath: path.join( laneDir, 'status.tsv' ),
		summaryPath: path.join( laneDir, 'summary.ndjson' ),
		tablePrefix,
		wpEnvPort: String( wpEnvPort ),
	};

	appendEvent(
		config,
		baseEvent( config, 'runner-start', {
			caseCount,
			durationMs,
			generationName,
			groupName,
			outputDir,
			phpArtifactRoot,
			runRoot,
			seedCount,
			seedStart,
			seedTimeoutMs,
			tablePrefix,
			maxConsecutiveInfraFailures,
			wpEnvPort: config.wpEnvPort || null,
		} )
	);

	const startedAt = Date.now();
	let attempts = 0;
	let consecutiveInfraFailures = 0;
	let failures = 0;
	let lastSeed = null;
	let stopReason = null;

	try {
		for ( let offset = 0; offset < seedCount; offset++ ) {
			if ( durationMs > 0 && Date.now() - startedAt >= durationMs ) {
				break;
			}

			const seed = seedStart + lane + offset * laneCount;
			lastSeed = seed;
			appendEvent(
				config,
				baseEvent( config, 'seed-start', {
					caseCount,
					seed,
				} )
			);

			const attempt = runSeed( config, seed );
			attempts++;
			if ( ! attempt.ok ) {
				failures++;
			}
			if ( attempt.classification === 'infra-failure' ) {
				consecutiveInfraFailures++;
			} else {
				consecutiveInfraFailures = 0;
			}

			const executionCount = attemptExecutionCount( attempt, caseCount );
			const completeEvent = baseEvent( config, 'seed-attempt-complete', {
				caseCount,
				classification: attempt.classification,
				durationMs: attempt.durationMs,
				executionDurationMs: attempt.durationMs,
				exitCode: attempt.exitCode,
				failureHash: attempt.failureHash,
				failureKind: attempt.failureKind,
				individualTestExecutionCount: executionCount,
				label: 'primary',
				logPath: attempt.logPath,
				ok: attempt.ok,
				oracleCounts: attempt.summary?.oracleCounts ?? {},
				replayPath: attempt.replayPath,
				seed,
				seedDir: attempt.seedDir,
				summaryPath: attempt.summaryPath,
				testExecutionCount: executionCount,
				tracePath: attempt.tracePath,
			} );
			appendEvent( config, completeEvent );
			appendJsonLine( config.summaryPath, completeEvent );
			appendStatus( config, completeEvent );

			if ( ! attempt.ok ) {
				appendEvent(
					config,
					baseEvent( config, attempt.classification, {
						caseIndex: attempt.summary?.caseIndex ?? null,
						failureHash: attempt.failureHash,
						failureKind: attempt.failureKind,
						failureMessage: attempt.failureText,
						logPath: attempt.logPath,
						replayPath: attempt.replayPath,
						seed,
						tracePath: attempt.tracePath,
					} )
				);
			}

			appendEvent(
				config,
				baseEvent( config, 'seed-classified', {
					classification: attempt.classification,
					failureHash: attempt.failureHash,
					failureKind: attempt.failureKind,
					seed,
				} )
			);
			appendEvent(
				config,
				baseEvent( config, 'seed-complete', {
					ok: attempt.ok,
					seed,
				} )
			);
			writeState( config, {
				attempts,
				consecutiveInfraFailures,
				failures,
				lastSeed,
				status: 'running',
			} );

			if ( consecutiveInfraFailures >= maxConsecutiveInfraFailures ) {
				stopReason = `stopping after ${ consecutiveInfraFailures } consecutive infra failures`;
				appendEvent(
					config,
					baseEvent( config, 'runner-error', {
						error: stopReason,
						failureKind: attempt.failureKind,
						lastSeed,
					} )
				);
				break;
			}
		}

		appendEvent(
			config,
			baseEvent( config, 'runner-stop', {
				attempts,
				durationMs: Date.now() - startedAt,
				failures,
				lastSeed,
				stopReason,
			} )
		);
		writeState( config, {
			attempts,
			consecutiveInfraFailures,
			failures,
			lastSeed,
			stopReason,
			status: 'stopped',
		} );
	} catch ( error ) {
		appendEvent(
			config,
			baseEvent( config, 'runner-error', {
				error: error.stack ?? error.message,
			} )
		);
		writeState( config, {
			attempts,
			consecutiveInfraFailures,
			failures,
			lastSeed,
			status: 'error',
		} );
		process.exitCode = 1;
	}
}

main();
