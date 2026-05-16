#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.env.RTC_CG_LOWER_LEVEL_REPO || process.cwd();
const runRoot = process.env.RTC_CG_LOWER_LEVEL_RUN_ROOT;
const groupName =
	process.env.RTC_CG_LOWER_LEVEL_GROUP ||
	'coverage-guided-lower-level-rich-text-crdt';
const testPath =
	process.env.RTC_CG_LOWER_LEVEL_TEST_PATH ||
	'packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js';
const fuzzLevel = 'coverage-guided-lower-level';
const profile = 'rtc-rich-text-crdt-merge';
const transport = 'in-process';
const coverageEngine = 'v8-node-coverage';
const engine = 'v8-node-coverage-guided-mutator';
const runStarted = process.env.RTC_CG_LOWER_LEVEL_RUN_STARTED || 'manual';
const batchSize = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_BATCH_SIZE', 'RTC_CG_LOWER_LEVEL_RUNS' ],
	32,
	1,
	1000
);
const maxInputBytes = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES' ],
	64,
	1,
	4096
);
const sleepSeconds = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_SLEEP_SECONDS' ],
	30,
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
const niceLevel = readIntegerEnv( [ 'RTC_CG_LOWER_LEVEL_NICE' ], 19, 0, 19 );
const maxAttempts = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS' ],
	0,
	0,
	Number.MAX_SAFE_INTEGER
);
const coverageTargets = [
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
	'rtc-rich-text-crdt-merge.coverage-fuzz.test',
];

if ( ! runRoot ) {
	console.error( 'RTC_CG_LOWER_LEVEL_RUN_ROOT is required' );
	process.exit( 2 );
}

const dirs = {
	corpus: path.join( runRoot, 'corpus' ),
	queue: path.join( runRoot, 'corpus', 'queue' ),
	crashes: path.join( runRoot, 'corpus', 'crashes' ),
	coverage: path.join( runRoot, 'coverage' ),
	logs: path.join( runRoot, 'logs' ),
	work: path.join( runRoot, 'work' ),
	lane: path.join(
		runRoot,
		`${ groupName }-gen-0-${ runStarted }`,
		'lane-0'
	),
};
const statusPath = path.join( runRoot, 'status.tsv' );
const eventsPath = path.join( dirs.lane, 'events.ndjson' );
const statePath = path.join( dirs.coverage, 'coverage-state.json' );
const supervisorGroupsPath = path.join( runRoot, 'supervisor-groups.json' );

for ( const dir of Object.values( dirs ) ) {
	fs.mkdirSync( dir, { recursive: true } );
}
touch( statusPath );
touch( eventsPath );
seedCorpus();
writeSupervisorGroups();
appendEvent( {
	kind: 'run-start',
	label: 'primary',
	runRoot,
	corpusDir: dirs.queue,
	crashDir: dirs.crashes,
	coverageDir: dirs.coverage,
	logDir: dirs.logs,
	batchSize,
	maxInputBytes,
	timeoutSeconds,
	nice: niceLevel,
	semanticFeatureFeedback: true,
} );

let coverageState = readCoverageState();
let attempt = readIntegerEnv(
	[ 'RTC_CG_LOWER_LEVEL_ATTEMPT_START', 'RTC_CG_LOWER_LEVEL_SEED_START' ],
	0,
	0,
	Number.MAX_SAFE_INTEGER
);
let attemptsRun = 0;

while ( true ) {
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
	const logPath = path.join(
		dirs.logs,
		`${ groupName }-${ stamp }-attempt-${ attempt }.log`
	);

	fs.mkdirSync( coverageDir, { recursive: true } );
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
		logPath,
	} );

	const result = spawnSync(
		'nice',
		[
			'-n',
			String( niceLevel ),
			'timeout',
			`${ timeoutSeconds }s`,
			'npm',
			'run',
			'test:unit',
			'--',
			testPath,
			'--runInBand',
			'--ci',
		],
		{
			cwd: repo,
			env: {
				...process.env,
				CI: '1',
				NODE_V8_COVERAGE: coverageDir,
				GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE: inputPath,
				GUTENBERG_RTC_CG_FEATURE_FILE: featurePath,
			},
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
		}
	);
	const durationMs = Date.now() - started;
	const exitCode =
		typeof result.status === 'number'
			? result.status
			: result.signal
			? 128
			: 1;

	fs.writeFileSync(
		logPath,
		[
			`command=nice -n ${ niceLevel } timeout ${ timeoutSeconds }s npm run test:unit -- ${ testPath } --runInBand --ci`,
			`input=${ inputPath }`,
			`features=${ featurePath }`,
			`coverage=${ coverageDir }`,
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

	if ( newCoverageKeys.length > 0 || newFeatureKeys.length > 0 ) {
		coverageState = {
			keys: [
				...new Set( [ ...coverageState.keys, ...coverageKeys ] ),
			].sort(),
			featureKeys: [
				...new Set( [
					...coverageState.featureKeys,
					...featureKeys,
				] ),
			].sort(),
			updatedAt: new Date().toISOString(),
		};
		writeCoverageState( coverageState );
		saveCorpusInputs(
			batch,
			newCoverageKeys.length > 0
				? `cov-${ attempt }`
				: `feature-${ attempt }`
		);
	}

	const crashDir =
		exitCode !== 0 ? saveCrashInputs( batch, attempt, logPath ) : null;
	const coverageRetained =
		exitCode !== 0 ||
		keepSuccessCoverage ||
		! removeCoverageDir( coverageDir );

	const event = {
		kind: 'seed-attempt-complete',
		label: 'primary',
		ok: exitCode === 0,
		exitCode,
		attempt,
		inputCount: batch.length,
		inputPath,
		featurePath,
		logPath,
		coverageDir,
		coverageRetained,
		crashDir,
		coverageKeys: coverageKeys.length,
		newCoverageKeys: newCoverageKeys.length,
		featureKeys: featureKeys.length,
		newFeatureKeys: newFeatureKeys.length,
		corpusSize: corpusFiles().length,
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
			`corpus=${ event.corpusSize }`,
			`exit=${ exitCode }`,
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

function writeSupervisorGroups() {
	const groups = [
		{
			name: groupName,
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
			timeoutSeconds,
			nice: niceLevel,
			corpusFeedback: true,
			semanticFeatureFeedback: true,
			repoRoot: repo,
			runRoot,
			corpusDir: dirs.queue,
			crashDir: dirs.crashes,
			coverageDir: dirs.coverage,
			logDir: dirs.logs,
			artifactDir: dirs.crashes,
			coverageTargets,
			nativeIntegration:
				'closest-isolated-coverage-guided-alternative; JS/TS target uses V8 coverage feedback instead of C/C++ AFL/libFuzzer',
		},
	];

	fs.writeFileSync(
		supervisorGroupsPath,
		`${ JSON.stringify( groups, null, 2 ) }\n`
	);
}

function appendEvent( event ) {
	fs.appendFileSync(
		eventsPath,
		`${ JSON.stringify( {
			kind: event.kind,
			at: event.at || new Date().toISOString(),
			group: groupName,
			fuzzLevel,
			transport,
			engine,
			coverageEngine,
			target: testPath,
			actionProfile: profile,
			...event,
		} ) }\n`
	);
}

function seedCorpus() {
	if ( corpusFiles().length > 0 ) {
		return;
	}

	const seeds = [
		Buffer.from( 'rich-text-crdt-merge' ),
		Buffer.from( 'formatted-cursor-path' ),
		Buffer.from( 'old-html-update-new-html' ),
		Buffer.from( 'entity-&-cursor-delta' ),
		Buffer.from( [ 0, 1, 2, 3, 5, 8, 13, 21 ] ),
		Buffer.from( [ 255, 128, 64, 32, 16, 8, 4, 2 ] ),
	];

	for ( const [ index, seed ] of seeds.entries() ) {
		fs.writeFileSync(
			path.join(
				dirs.queue,
				`seed-${ String( index ).padStart( 3, '0' ) }.bin`
			),
			seed
		);
	}
}

function readCoverageState() {
	try {
		const parsed = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
		return {
			keys: Array.isArray( parsed.keys ) ? parsed.keys : [],
			featureKeys: Array.isArray( parsed.featureKeys )
				? parsed.featureKeys
				: [],
			updatedAt: parsed.updatedAt || null,
		};
	} catch {
		return { keys: [], featureKeys: [], updatedAt: null };
	}
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

function makeBatch( attemptIndex ) {
	const files = corpusFiles();
	const batch = [];

	for ( let index = 0; index < batchSize; index++ ) {
		const filePath = files[ ( attemptIndex + index ) % files.length ];
		const input = fs.readFileSync( filePath );
		batch.push( mutateInput( input, attemptIndex, index ) );
	}

	return batch;
}

function mutateInput( input, attemptIndex, caseIndex ) {
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

function saveCrashInputs( inputs, attemptIndex, logPath ) {
	const crashDir = path.join( dirs.crashes, `attempt-${ attemptIndex }` );
	fs.mkdirSync( crashDir, { recursive: true } );
	fs.writeFileSync(
		path.join( crashDir, 'metadata.json' ),
		`${ JSON.stringify( { attempt: attemptIndex, logPath }, null, 2 ) }\n`
	);

	for ( const [ index, input ] of inputs.entries() ) {
		fs.writeFileSync(
			path.join(
				crashDir,
				`input-${ String( index ).padStart( 4, '0' ) }.bin`
			),
			input
		);
	}

	return crashDir;
}
