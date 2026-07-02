#!/usr/bin/env node
/**
 * Scheduler ledger for the JS2 RTC product-candidate merge train.
 *
 * This is intentionally a small single-writer control plane. Existing shell,
 * tmux, Playwright, fuzz, replay, exact-stack, and deploy scripts should call
 * this script to acquire leases and record evidence; they should not move
 * maintainer refs or decide readiness directly.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const SCHEMA_VERSION = '2026-07-02.1';
const DEFAULT_DB = process.env.RTC_SCHEDULER_DB || path.join( process.cwd(), '.rtc-product-candidate-ledger.sqlite' );
const REQUIRED_PRODUCT_GATES = [ 'preflight', 'P0_smoke', 'product_acceptance', 'rtc_conformance' ];
const HAS_SQLITE3_CLI = spawnSync( 'sqlite3', [ '-version' ], { encoding: 'utf8' } ).status === 0;
const ACTIVE_BLOCKER_STATES = new Set( [
	'observed',
	'fingerprinted',
	'reproduced',
	'minimized',
	'classified',
	'assigned',
	'fix_candidate',
	'narrow_repro_green',
	'adjacent_gates_green',
] );
const BLOCKING_SEVERITY_PREFIXES = [ 'P0_', 'P1_' ];

function usage() {
	console.log( `Usage:
  rtc-product-candidate-scheduler.mjs init [--db path]
  rtc-product-candidate-scheduler.mjs admit-candidate --sha SHA --trunk-sha SHA [options]
  rtc-product-candidate-scheduler.mjs record-gate --candidate ID --gate GATE --profile PROFILE --result pass|fail|skip [options]
  rtc-product-candidate-scheduler.mjs open-blocker --candidate ID --severity CLASS --symptom TEXT --scope TEXT --next-command CMD [options]
  rtc-product-candidate-scheduler.mjs transition-blocker --blocker ID --lifecycle STATE [--fix-branch BRANCH] [--next-command CMD]
  rtc-product-candidate-scheduler.mjs lease-start --worker NAME --kind KIND [options]
  rtc-product-candidate-scheduler.mjs lease-heartbeat --lease ID
  rtc-product-candidate-scheduler.mjs lease-finish --lease ID --result pass|fail|superseded|stale
  rtc-product-candidate-scheduler.mjs expire-leases [--kill]
  rtc-product-candidate-scheduler.mjs ready --candidate ID
  rtc-product-candidate-scheduler.mjs promote-ref --candidate ID --ref refs/heads/rtc-product-candidate --allow-ref-update
  rtc-product-candidate-scheduler.mjs status

Common options:
  --db PATH                         Ledger path. Defaults to RTC_SCHEDULER_DB or ./.rtc-product-candidate-ledger.sqlite.
  --manifest PATH                   Immutable job/candidate manifest.
  --profiles a,b                    Candidate profiles.
  --risk-tags a,b                   Candidate risk tags.
  --gate-policy-version VERSION     Version of checked-in gate policy.
  --oracle-version VERSION          Version of comparator/oracle contract.
` );
}

function parseArgs( argv ) {
	const options = {};
	const positionals = [];
	for ( let index = 0; index < argv.length; index++ ) {
		const token = argv[ index ];
		if ( token.startsWith( '--' ) ) {
			const key = token.slice( 2 );
			const next = argv[ index + 1 ];
			if ( next === undefined || next.startsWith( '--' ) ) {
				options[ key ] = true;
			} else {
				options[ key ] = next;
				index++;
			}
		} else {
			positionals.push( token );
		}
	}
	return { command: positionals[ 0 ], options };
}

function fail( message, code = 1 ) {
	console.error( `error: ${ message }` );
	process.exit( code );
}

function requireOption( options, name ) {
	if ( ! options[ name ] ) {
		fail( `missing --${ name }` );
	}
	return String( options[ name ] );
}

function csv( value ) {
	if ( ! value ) {
		return [];
	}
	return String( value )
		.split( ',' )
		.map( ( item ) => item.trim() )
		.filter( Boolean );
}

function nowIso() {
	return new Date().toISOString().replace( /\.\d{3}Z$/, 'Z' );
}

function plusSecondsIso( seconds ) {
	return new Date( Date.now() + Number( seconds ) * 1000 ).toISOString().replace( /\.\d{3}Z$/, 'Z' );
}

function sha256Text( text ) {
	return crypto.createHash( 'sha256' ).update( text ).digest( 'hex' );
}

function sha256File( filePath ) {
	return crypto.createHash( 'sha256' ).update( fs.readFileSync( filePath ) ).digest( 'hex' );
}

function manifestHash( manifestPath, fallback ) {
	if ( manifestPath ) {
		return sha256File( manifestPath );
	}
	return sha256Text( JSON.stringify( fallback ) );
}

function sqlString( value ) {
	if ( value === undefined || value === null ) {
		return 'NULL';
	}
	return `'${ String( value ).replaceAll( "'", "''" ) }'`;
}

function sqlNumber( value ) {
	if ( value === undefined || value === null || value === '' ) {
		return 'NULL';
	}
	const number = Number( value );
	if ( ! Number.isFinite( number ) ) {
		fail( `expected numeric value, got ${ value }` );
	}
	return String( number );
}

function sqlite( db, sql ) {
	fs.mkdirSync( path.dirname( db ), { recursive: true } );
	if ( ! HAS_SQLITE3_CLI ) {
		return pythonSqlite( db, sql, 'exec' );
	}
	const result = spawnSync( 'sqlite3', [ '-batch', db ], {
		input: `PRAGMA busy_timeout = 30000;\nPRAGMA foreign_keys = ON;\n${ sql }\n`,
		encoding: 'utf8',
		maxBuffer: 50 * 1024 * 1024,
	} );
	if ( result.error ) {
		throw new Error( `sqlite3 failed: ${ result.error.message }` );
	}
	if ( result.status !== 0 ) {
		throw new Error( `sqlite3 failed: ${ result.stderr || result.stdout }` );
	}
	return result.stdout;
}

function query( db, sql ) {
	if ( ! HAS_SQLITE3_CLI ) {
		const output = pythonSqlite( db, sql, 'query' ).trim();
		return output ? JSON.parse( output ) : [];
	}
	const result = spawnSync( 'sqlite3', [ '-json', db, sql ], {
		encoding: 'utf8',
		maxBuffer: 50 * 1024 * 1024,
	} );
	if ( result.error ) {
		throw new Error( `sqlite3 query failed: ${ result.error.message }` );
	}
	if ( result.status !== 0 ) {
		throw new Error( `sqlite3 query failed: ${ result.stderr || result.stdout }` );
	}
	const output = result.stdout.trim();
	return output ? JSON.parse( output ) : [];
}

function pythonSqlite( db, sql, mode ) {
	const script = `
import json
import sqlite3
import sys

db_path = sys.argv[1]
mode = sys.argv[2]
sql = sys.stdin.read()

conn = sqlite3.connect(db_path, timeout=30)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")

if mode == "exec":
    conn.executescript(sql)
    conn.commit()
elif mode == "query":
    cursor = conn.execute(sql)
    print(json.dumps([dict(row) for row in cursor.fetchall()]))
else:
    raise SystemExit(f"unknown mode {mode}")
`;
	const result = spawnSync( 'python3', [ '-c', script, db, mode ], {
		input: sql,
		encoding: 'utf8',
		maxBuffer: 50 * 1024 * 1024,
	} );
	if ( result.error ) {
		throw new Error( `python3 sqlite fallback failed: ${ result.error.message }` );
	}
	if ( result.status !== 0 ) {
		throw new Error( `python3 sqlite fallback failed: ${ result.stderr || result.stdout }` );
	}
	return result.stdout;
}

function withLock( db, fn ) {
	const lockPath = `${ db }.lock`;
	fs.mkdirSync( path.dirname( db ), { recursive: true } );
	let fd;
	try {
		fd = fs.openSync( lockPath, 'wx' );
		fs.writeFileSync( fd, `${ process.pid }\n${ nowIso() }\n${ os.hostname() }\n` );
		return fn();
	} catch ( error ) {
		if ( error.code === 'EEXIST' ) {
			fail( `scheduler lock exists at ${ lockPath }; another writer may be active` );
		}
		throw error;
	} finally {
		if ( fd !== undefined ) {
			fs.closeSync( fd );
			fs.rmSync( lockPath, { force: true } );
		}
	}
}

function initDb( db ) {
	sqlite( db, `
CREATE TABLE IF NOT EXISTS meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate (
	id TEXT PRIMARY KEY,
	sha TEXT NOT NULL,
	trunk_sha TEXT NOT NULL,
	manifest_hash TEXT NOT NULL,
	manifest_path TEXT,
	branch TEXT,
	state TEXT NOT NULL DEFAULT 'proposed',
	included_prs TEXT NOT NULL DEFAULT '[]',
	excluded_prs TEXT NOT NULL DEFAULT '[]',
	quarantined_prs TEXT NOT NULL DEFAULT '[]',
	risk_tags TEXT NOT NULL DEFAULT '[]',
	profiles TEXT NOT NULL DEFAULT '[]',
	fixture_set TEXT NOT NULL DEFAULT '',
	lock_hash TEXT NOT NULL DEFAULT '',
	build_hash TEXT NOT NULL DEFAULT '',
	env_versions TEXT NOT NULL DEFAULT '{}',
	oracle_version TEXT NOT NULL DEFAULT '',
	gate_policy_version TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_exact_evidence ON candidate(sha, trunk_sha, manifest_hash, profiles, fixture_set, lock_hash, build_hash, oracle_version, gate_policy_version);

CREATE TABLE IF NOT EXISTS gate_run (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	candidate_id TEXT NOT NULL REFERENCES candidate(id),
	gate TEXT NOT NULL,
	profile TEXT NOT NULL,
	command TEXT NOT NULL DEFAULT '',
	timeout_seconds INTEGER,
	baseline_result TEXT NOT NULL DEFAULT 'not-run',
	result TEXT NOT NULL,
	duration_seconds REAL,
	artifacts TEXT NOT NULL DEFAULT '',
	fingerprint TEXT NOT NULL DEFAULT '',
	stale_reason TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gate_run_candidate_gate ON gate_run(candidate_id, gate, profile, created_at);

CREATE TABLE IF NOT EXISTS blocker (
	id TEXT PRIMARY KEY,
	candidate_id TEXT NOT NULL REFERENCES candidate(id),
	severity TEXT NOT NULL,
	symptom TEXT NOT NULL,
	scope TEXT NOT NULL,
	repro_state TEXT NOT NULL DEFAULT 'repro_missing',
	fixture TEXT NOT NULL DEFAULT '',
	first_sha TEXT NOT NULL,
	latest_sha TEXT NOT NULL,
	artifacts TEXT NOT NULL DEFAULT '',
	owner TEXT NOT NULL DEFAULT '',
	escalation TEXT NOT NULL DEFAULT '',
	fix_branch TEXT NOT NULL DEFAULT '',
	lifecycle TEXT NOT NULL DEFAULT 'observed',
	ttl_at TEXT NOT NULL DEFAULT '',
	next_command TEXT NOT NULL,
	fingerprint TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS blocker_candidate_lifecycle ON blocker(candidate_id, lifecycle, severity);

CREATE TABLE IF NOT EXISTS lease (
	id TEXT PRIMARY KEY,
	worker TEXT NOT NULL,
	kind TEXT NOT NULL,
	candidate_id TEXT REFERENCES candidate(id),
	manifest_path TEXT NOT NULL DEFAULT '',
	process_group TEXT NOT NULL DEFAULT '',
	pid TEXT NOT NULL DEFAULT '',
	worktree TEXT NOT NULL DEFAULT '',
	docker_namespace TEXT NOT NULL DEFAULT '',
	ports TEXT NOT NULL DEFAULT '',
	artifact_dir TEXT NOT NULL DEFAULT '',
	result TEXT NOT NULL DEFAULT 'running',
	heartbeat_at TEXT NOT NULL,
	ttl_at TEXT NOT NULL,
	cleanup_state TEXT NOT NULL DEFAULT 'owned',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lease_result_ttl ON lease(result, ttl_at);

CREATE TABLE IF NOT EXISTS promotion (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	candidate_id TEXT NOT NULL REFERENCES candidate(id),
	action TEXT NOT NULL,
	reason TEXT NOT NULL DEFAULT '',
	artifacts TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_update (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	candidate_id TEXT NOT NULL REFERENCES candidate(id),
	ref TEXT NOT NULL,
	old_sha TEXT NOT NULL DEFAULT '',
	new_sha TEXT NOT NULL,
	mode TEXT NOT NULL,
	result TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifact (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	candidate_id TEXT REFERENCES candidate(id),
	blocker_id TEXT REFERENCES blocker(id),
	kind TEXT NOT NULL,
	path TEXT NOT NULL,
	sha256 TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capacity_budget (
	name TEXT PRIMARY KEY,
	capacity INTEGER NOT NULL,
	in_use INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT NOT NULL
);

INSERT INTO meta(key, value) VALUES ('schema_version', ${ sqlString( SCHEMA_VERSION ) })
	ON CONFLICT(key) DO UPDATE SET value = excluded.value;
` );
}

function ensureDb( db ) {
	if ( ! fs.existsSync( db ) ) {
		fail( `ledger does not exist at ${ db }; run init first` );
	}
}

function getCandidate( db, id ) {
	const rows = query( db, `SELECT * FROM candidate WHERE id = ${ sqlString( id ) } LIMIT 1;` );
	if ( rows.length === 0 ) {
		fail( `unknown candidate ${ id }` );
	}
	return rows[ 0 ];
}

function latestGateRows( db, candidateId ) {
	const rows = query( db, `
SELECT g.*
FROM gate_run g
JOIN (
	SELECT gate, profile, MAX(created_at) AS max_created
	FROM gate_run
	WHERE candidate_id = ${ sqlString( candidateId ) }
	GROUP BY gate, profile
) latest
ON g.gate = latest.gate AND g.profile = latest.profile AND g.created_at = latest.max_created
WHERE g.candidate_id = ${ sqlString( candidateId ) }
ORDER BY g.gate, g.profile;
` );
	return rows;
}

function readiness( db, candidateId ) {
	getCandidate( db, candidateId );
	const rows = latestGateRows( db, candidateId );
	const reasons = [];
	for ( const gate of REQUIRED_PRODUCT_GATES ) {
		const gateRows = rows.filter( ( row ) => row.gate === gate );
		if ( gateRows.length === 0 ) {
			reasons.push( `missing gate ${ gate }` );
			continue;
		}
		for ( const row of gateRows ) {
			if ( row.baseline_result === 'fail' ) {
				reasons.push( `${ gate}/${ row.profile } has failing trunk baseline` );
			}
			if ( row.result !== 'pass' ) {
				reasons.push( `${ gate }/${ row.profile } result is ${ row.result }` );
			}
			if ( row.stale_reason ) {
				reasons.push( `${ gate }/${ row.profile } is stale: ${ row.stale_reason }` );
			}
		}
	}
	const blockers = query( db, `
SELECT id, severity, lifecycle, symptom
FROM blocker
WHERE candidate_id = ${ sqlString( candidateId ) }
ORDER BY severity, created_at;
` );
	for ( const blocker of blockers ) {
		const severity = blocker.severity || '';
		if (
			ACTIVE_BLOCKER_STATES.has( blocker.lifecycle ) &&
			BLOCKING_SEVERITY_PREFIXES.some( ( prefix ) => severity.startsWith( prefix ) )
		) {
			reasons.push( `${ blocker.id } ${ blocker.severity } ${ blocker.lifecycle }: ${ blocker.symptom }` );
		}
	}
	return { ready: reasons.length === 0, reasons };
}

function commandInit( db ) {
	withLock( db, () => initDb( db ) );
	console.log( `initialized ${ db }` );
}

function commandAdmitCandidate( db, options ) {
	ensureDb( db );
	const sha = requireOption( options, 'sha' );
	const trunkSha = requireOption( options, 'trunk-sha' );
	const fallbackManifest = {
		sha,
		trunkSha,
		branch: options.branch || '',
		profiles: csv( options.profiles ),
		riskTags: csv( options[ 'risk-tags' ] ),
		fixtureSet: options[ 'fixture-set' ] || '',
	};
	const hash = manifestHash( options.manifest, fallbackManifest );
	const id = options.id || `cand-${ sha.slice( 0, 12 ) }-${ hash.slice( 0, 12 ) }`;
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
INSERT INTO candidate(
	id, sha, trunk_sha, manifest_hash, manifest_path, branch, included_prs, excluded_prs,
	quarantined_prs, risk_tags, profiles, fixture_set, lock_hash, build_hash, env_versions,
	oracle_version, gate_policy_version, created_at, updated_at
) VALUES (
	${ sqlString( id ) },
	${ sqlString( sha ) },
	${ sqlString( trunkSha ) },
	${ sqlString( hash ) },
	${ sqlString( options.manifest || '' ) },
	${ sqlString( options.branch || '' ) },
	${ sqlString( options[ 'included-prs' ] || '[]' ) },
	${ sqlString( options[ 'excluded-prs' ] || '[]' ) },
	${ sqlString( options[ 'quarantined-prs' ] || '[]' ) },
	${ sqlString( JSON.stringify( csv( options[ 'risk-tags' ] ) ) ) },
	${ sqlString( JSON.stringify( csv( options.profiles ) ) ) },
	${ sqlString( options[ 'fixture-set' ] || '' ) },
	${ sqlString( options[ 'lock-hash' ] || '' ) },
	${ sqlString( options[ 'build-hash' ] || '' ) },
	${ sqlString( options[ 'env-versions' ] || '{}' ) },
	${ sqlString( options[ 'oracle-version' ] || '' ) },
	${ sqlString( options[ 'gate-policy-version' ] || '' ) },
	${ sqlString( timestamp ) },
	${ sqlString( timestamp ) }
)
ON CONFLICT(id) DO UPDATE SET
	updated_at = excluded.updated_at,
	branch = excluded.branch;
INSERT INTO promotion(candidate_id, action, reason, created_at)
VALUES (${ sqlString( id ) }, 'proposed', 'candidate admitted to scheduler ledger', ${ sqlString( timestamp ) });
` );
	} );
	console.log( id );
}

function commandRecordGate( db, options ) {
	ensureDb( db );
	const candidateId = requireOption( options, 'candidate' );
	getCandidate( db, candidateId );
	const gate = requireOption( options, 'gate' );
	const profile = requireOption( options, 'profile' );
	const result = requireOption( options, 'result' );
	if ( ! [ 'pass', 'fail', 'skip' ].includes( result ) ) {
		fail( '--result must be pass, fail, or skip' );
	}
	const baselineResult = options[ 'baseline-result' ] || 'not-run';
	if ( ! [ 'pass', 'fail', 'not-run', 'skip' ].includes( baselineResult ) ) {
		fail( '--baseline-result must be pass, fail, not-run, or skip' );
	}
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
INSERT INTO gate_run(candidate_id, gate, profile, command, timeout_seconds, baseline_result, result, duration_seconds, artifacts, fingerprint, stale_reason, created_at)
VALUES (
	${ sqlString( candidateId ) },
	${ sqlString( gate ) },
	${ sqlString( profile ) },
	${ sqlString( options.command || '' ) },
	${ sqlNumber( options[ 'timeout-seconds' ] ) },
	${ sqlString( baselineResult ) },
	${ sqlString( result ) },
	${ sqlNumber( options[ 'duration-seconds' ] ) },
	${ sqlString( options.artifacts || '' ) },
	${ sqlString( options.fingerprint || '' ) },
	${ sqlString( options[ 'stale-reason' ] || '' ) },
	${ sqlString( timestamp ) }
);
` );
	} );
	console.log( `recorded ${ gate }/${ profile }=${ result } for ${ candidateId }` );
}

function commandOpenBlocker( db, options ) {
	ensureDb( db );
	const candidateId = requireOption( options, 'candidate' );
	const candidate = getCandidate( db, candidateId );
	const severity = requireOption( options, 'severity' );
	const symptom = requireOption( options, 'symptom' );
	const scope = requireOption( options, 'scope' );
	const nextCommand = requireOption( options, 'next-command' );
	const fingerprint = options.fingerprint || sha256Text( [ severity, symptom, scope, options.fixture || '' ].join( '\n' ) ).slice( 0, 24 );
	const id = options.id || `B-${ fingerprint.slice( 0, 12 ) }`;
	const timestamp = nowIso();
	const ttlAt = options[ 'ttl-at' ] || ( options[ 'ttl-hours' ] ? plusSecondsIso( Number( options[ 'ttl-hours' ] ) * 3600 ) : '' );
	withLock( db, () => {
		sqlite( db, `
INSERT INTO blocker(
	id, candidate_id, severity, symptom, scope, repro_state, fixture, first_sha, latest_sha,
	artifacts, owner, escalation, fix_branch, lifecycle, ttl_at, next_command, fingerprint, created_at, updated_at
) VALUES (
	${ sqlString( id ) },
	${ sqlString( candidateId ) },
	${ sqlString( severity ) },
	${ sqlString( symptom ) },
	${ sqlString( scope ) },
	${ sqlString( options[ 'repro-state' ] || 'repro_missing' ) },
	${ sqlString( options.fixture || '' ) },
	${ sqlString( candidate.sha ) },
	${ sqlString( candidate.sha ) },
	${ sqlString( options.artifacts || '' ) },
	${ sqlString( options.owner || '' ) },
	${ sqlString( options.escalation || '' ) },
	${ sqlString( options[ 'fix-branch' ] || '' ) },
	${ sqlString( options.lifecycle || 'observed' ) },
	${ sqlString( ttlAt ) },
	${ sqlString( nextCommand ) },
	${ sqlString( fingerprint ) },
	${ sqlString( timestamp ) },
	${ sqlString( timestamp ) }
)
ON CONFLICT(id) DO UPDATE SET
	latest_sha = excluded.latest_sha,
	artifacts = CASE WHEN excluded.artifacts != '' THEN excluded.artifacts ELSE blocker.artifacts END,
	next_command = excluded.next_command,
	updated_at = excluded.updated_at;
INSERT INTO promotion(candidate_id, action, reason, artifacts, created_at)
VALUES (${ sqlString( candidateId ) }, 'blocked', ${ sqlString( `${ id } ${ severity } ${ symptom }` ) }, ${ sqlString( options.artifacts || '' ) }, ${ sqlString( timestamp ) });
` );
	} );
	console.log( id );
}

function commandTransitionBlocker( db, options ) {
	ensureDb( db );
	const blocker = requireOption( options, 'blocker' );
	const lifecycle = requireOption( options, 'lifecycle' );
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
UPDATE blocker
SET lifecycle = ${ sqlString( lifecycle ) },
	fix_branch = CASE WHEN ${ sqlString( options[ 'fix-branch' ] || '' ) } != '' THEN ${ sqlString( options[ 'fix-branch' ] || '' ) } ELSE fix_branch END,
	next_command = CASE WHEN ${ sqlString( options[ 'next-command' ] || '' ) } != '' THEN ${ sqlString( options[ 'next-command' ] || '' ) } ELSE next_command END,
	updated_at = ${ sqlString( timestamp ) }
WHERE id = ${ sqlString( blocker ) };
` );
	} );
	console.log( `updated ${ blocker } -> ${ lifecycle }` );
}

function commandLeaseStart( db, options ) {
	ensureDb( db );
	const worker = requireOption( options, 'worker' );
	const kind = requireOption( options, 'kind' );
	const timestamp = nowIso();
	const ttlAt = plusSecondsIso( options[ 'ttl-seconds' ] || 3600 );
	const leaseId = options.id || `L-${ sha256Text( `${ worker }\n${ kind }\n${ timestamp }\n${ process.pid }` ).slice( 0, 16 ) }`;
	withLock( db, () => {
		sqlite( db, `
INSERT INTO lease(id, worker, kind, candidate_id, manifest_path, process_group, pid, worktree, docker_namespace, ports, artifact_dir, heartbeat_at, ttl_at, created_at, updated_at)
VALUES (
	${ sqlString( leaseId ) },
	${ sqlString( worker ) },
	${ sqlString( kind ) },
	${ sqlString( options.candidate || null ) },
	${ sqlString( options.manifest || '' ) },
	${ sqlString( options[ 'process-group' ] || '' ) },
	${ sqlString( options.pid || '' ) },
	${ sqlString( options.worktree || '' ) },
	${ sqlString( options.namespace || options[ 'docker-namespace' ] || '' ) },
	${ sqlString( options.ports || '' ) },
	${ sqlString( options[ 'artifact-dir' ] || '' ) },
	${ sqlString( timestamp ) },
	${ sqlString( ttlAt ) },
	${ sqlString( timestamp ) },
	${ sqlString( timestamp ) }
);
` );
	} );
	console.log( leaseId );
}

function commandLeaseHeartbeat( db, options ) {
	ensureDb( db );
	const lease = requireOption( options, 'lease' );
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
UPDATE lease
SET heartbeat_at = ${ sqlString( timestamp ) }, updated_at = ${ sqlString( timestamp ) }
WHERE id = ${ sqlString( lease ) } AND result = 'running';
` );
	} );
	console.log( `heartbeat ${ lease }` );
}

function commandLeaseFinish( db, options ) {
	ensureDb( db );
	const lease = requireOption( options, 'lease' );
	const result = requireOption( options, 'result' );
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
UPDATE lease
SET result = ${ sqlString( result ) }, cleanup_state = ${ sqlString( options[ 'cleanup-state' ] || 'released' ) }, updated_at = ${ sqlString( timestamp ) }
WHERE id = ${ sqlString( lease ) };
` );
	} );
	console.log( `finished ${ lease }=${ result }` );
}

function commandExpireLeases( db, options ) {
	ensureDb( db );
	const timestamp = nowIso();
	const stale = query( db, `
SELECT id, pid, process_group
FROM lease
WHERE result = 'running' AND ttl_at < ${ sqlString( timestamp ) };
` );
	withLock( db, () => {
		sqlite( db, `
UPDATE lease
SET result = 'stale', cleanup_state = 'needs-cleanup', updated_at = ${ sqlString( timestamp ) }
WHERE result = 'running' AND ttl_at < ${ sqlString( timestamp ) };
` );
	} );
	if ( options.kill ) {
		for ( const lease of stale ) {
			const pgid = Number( lease.process_group || lease.pid );
			if ( Number.isFinite( pgid ) && pgid > 1 ) {
				try {
					process.kill( -pgid, 'SIGTERM' );
					console.log( `sent SIGTERM to process group ${ pgid } for ${ lease.id }` );
				} catch ( error ) {
					console.log( `could not kill ${ lease.id }: ${ error.message }` );
				}
			}
		}
	}
	console.log( `expired ${ stale.length } lease(s)` );
}

function commandReady( db, options ) {
	ensureDb( db );
	const candidateId = requireOption( options, 'candidate' );
	const result = readiness( db, candidateId );
	if ( result.ready ) {
		console.log( `${ candidateId } ready` );
		return;
	}
	console.log( `${ candidateId } not ready:` );
	for ( const reason of result.reasons ) {
		console.log( `- ${ reason }` );
	}
	process.exit( 2 );
}

function commandPromoteRef( db, options ) {
	ensureDb( db );
	const candidateId = requireOption( options, 'candidate' );
	const ref = requireOption( options, 'ref' );
	const candidate = getCandidate( db, candidateId );
	const result = readiness( db, candidateId );
	if ( ! result.ready ) {
		console.log( `${ candidateId } not ready:` );
		for ( const reason of result.reasons ) {
			console.log( `- ${ reason }` );
		}
		process.exit( 2 );
	}
	if ( ! options[ 'allow-ref-update' ] ) {
		fail( 'ref promotion requires --allow-ref-update' );
	}
	const current = spawnSync( 'git', [ 'rev-parse', '--verify', '--quiet', ref ], { encoding: 'utf8' } );
	const oldSha = current.status === 0 ? current.stdout.trim() : '';
	const update = spawnSync( 'git', [ 'update-ref', ref, candidate.sha ], { encoding: 'utf8' } );
	if ( update.status !== 0 ) {
		fail( `git update-ref failed: ${ update.stderr || update.stdout }` );
	}
	const timestamp = nowIso();
	withLock( db, () => {
		sqlite( db, `
UPDATE candidate SET state = 'product_promoted', updated_at = ${ sqlString( timestamp ) }
WHERE id = ${ sqlString( candidateId ) };
INSERT INTO ref_update(candidate_id, ref, old_sha, new_sha, mode, result, created_at)
VALUES (${ sqlString( candidateId ) }, ${ sqlString( ref ) }, ${ sqlString( oldSha ) }, ${ sqlString( candidate.sha ) }, 'CAS', 'updated', ${ sqlString( timestamp ) });
INSERT INTO promotion(candidate_id, action, reason, created_at)
VALUES (${ sqlString( candidateId ) }, 'product-promoted', ${ sqlString( ref ) }, ${ sqlString( timestamp ) });
` );
	} );
	console.log( `${ ref } -> ${ candidate.sha }` );
}

function commandStatus( db ) {
	ensureDb( db );
	const candidates = query( db, `
SELECT id, sha, trunk_sha, branch, state, profiles, risk_tags, created_at, updated_at
FROM candidate
ORDER BY created_at DESC
LIMIT 8;
` );
	const blockers = query( db, `
SELECT id, severity, lifecycle, symptom, scope, candidate_id, next_command, updated_at
FROM blocker
WHERE lifecycle NOT IN ('published', 'closed', 'obsolete')
ORDER BY created_at DESC
LIMIT 20;
` );
	const leases = query( db, `
SELECT id, worker, kind, candidate_id, result, heartbeat_at, ttl_at, cleanup_state
FROM lease
WHERE result = 'running' OR cleanup_state = 'needs-cleanup'
ORDER BY updated_at DESC
LIMIT 20;
` );
	console.log( `# RTC Product Candidate Scheduler\n` );
	if ( candidates.length === 0 ) {
		console.log( 'No candidates admitted.' );
	} else {
		const top = candidates[ 0 ];
		const readyResult = readiness( db, top.id );
		console.log( `Top candidate: ${ top.id } ${ top.sha }` );
		console.log( `Human-testable: ${ readyResult.ready ? 'yes' : 'no' }` );
		if ( ! readyResult.ready ) {
			console.log( `First blocker/gate: ${ readyResult.reasons[ 0 ] }` );
		}
		console.log( '' );
		console.log( '## Recent Candidates' );
		for ( const candidate of candidates ) {
			console.log( `- ${ candidate.id } ${ candidate.state } sha=${ candidate.sha } trunk=${ candidate.trunk_sha } branch=${ candidate.branch || '-' }` );
		}
	}
	console.log( '\n## Open Blockers' );
	if ( blockers.length === 0 ) {
		console.log( '- none' );
	} else {
		for ( const blocker of blockers ) {
			console.log( `- ${ blocker.id } ${ blocker.severity } ${ blocker.lifecycle } candidate=${ blocker.candidate_id } ${ blocker.symptom }` );
			console.log( `  next: ${ blocker.next_command }` );
		}
	}
	console.log( '\n## Active/Stale Leases' );
	if ( leases.length === 0 ) {
		console.log( '- none' );
	} else {
		for ( const lease of leases ) {
			console.log( `- ${ lease.id } ${ lease.result } ${ lease.kind } worker=${ lease.worker } candidate=${ lease.candidate_id || '-' } heartbeat=${ lease.heartbeat_at } ttl=${ lease.ttl_at } cleanup=${ lease.cleanup_state }` );
		}
	}
}

const { command, options } = parseArgs( process.argv.slice( 2 ) );
const db = String( options.db || DEFAULT_DB );

if ( ! command || command === 'help' || command === '--help' ) {
	usage();
	process.exit( command ? 0 : 1 );
}

try {
	switch ( command ) {
		case 'init':
			commandInit( db );
			break;
		case 'admit-candidate':
			commandAdmitCandidate( db, options );
			break;
		case 'record-gate':
			commandRecordGate( db, options );
			break;
		case 'open-blocker':
			commandOpenBlocker( db, options );
			break;
		case 'transition-blocker':
			commandTransitionBlocker( db, options );
			break;
		case 'lease-start':
			commandLeaseStart( db, options );
			break;
		case 'lease-heartbeat':
			commandLeaseHeartbeat( db, options );
			break;
		case 'lease-finish':
			commandLeaseFinish( db, options );
			break;
		case 'expire-leases':
			commandExpireLeases( db, options );
			break;
		case 'ready':
			commandReady( db, options );
			break;
		case 'promote-ref':
			commandPromoteRef( db, options );
			break;
		case 'status':
			commandStatus( db );
			break;
		default:
			usage();
			fail( `unknown command ${ command }` );
	}
} catch ( error ) {
	fail( error.message || String( error ) );
}
