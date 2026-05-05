#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const HANDOFF_DIR = path.join(
	REPO_ROOT,
	'fuzz-handoff/distinct-manifest-20260505'
);
const MANIFEST_PATH = path.join( HANDOFF_DIR, 'distinct-bug-manifest.json' );
const STATUS_DOC_PATH = path.join( HANDOFF_DIR, 'RERUN_STATUS.md' );
const FULL_RESULTS_DIR = path.join( HANDOFF_DIR, 'results-full-all' );
const FULL_STATUS_PATH = path.join( FULL_RESULTS_DIR, 'status.json' );
const FULL_RESULTS_PATH = path.join( FULL_RESULTS_DIR, 'results.jsonl' );
const HTTP_SMOKE_STATUS_PATH = path.join( HANDOFF_DIR, 'results-http-smoke/status.json' );
const HTTP_SMOKE_RESULTS_PATH = path.join(
	HANDOFF_DIR,
	'results-http-smoke/results.jsonl'
);
const WS_SMOKE_STATUS_PATH = path.join( HANDOFF_DIR, 'results-ws-smoke/status.json' );
const WS_SMOKE_RESULTS_PATH = path.join( HANDOFF_DIR, 'results-ws-smoke/results.jsonl' );

function runGit( args, { check = true } = {} ) {
	const result = spawnSync( 'git', args, {
		cwd: REPO_ROOT,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} );

	if ( check && result.status !== 0 ) {
		throw new Error(
			`git ${ args.join( ' ' ) } failed:\n${ result.stdout }${ result.stderr }`
		);
	}

	return result;
}

async function readJson( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function readJsonLines( filePath ) {
	try {
		const content = await fs.readFile( filePath, 'utf8' );
		return content
			.split( '\n' )
			.filter( Boolean )
			.map( ( line ) => {
				try {
					return JSON.parse( line );
				} catch {
					return null;
				}
			} )
			.filter( Boolean );
	} catch {
		return [];
	}
}

function summarizeRecords( records ) {
	const summary = {
		total: records.length,
		passed: 0,
		failed: 0,
		missingSpec: 0,
		timedOut: 0,
		http: 0,
		websocket: 0,
	};

	for ( const record of records ) {
		if ( record.result === 'passed' ) {
			summary.passed++;
		} else if ( record.result === 'failed' ) {
			summary.failed++;
		} else if ( record.result === 'missing-spec' ) {
			summary.missingSpec++;
		}

		if ( record.timedOut ) {
			summary.timedOut++;
		}

		if ( record.transport === 'http' ) {
			summary.http++;
		} else if ( record.transport === 'websocket' ) {
			summary.websocket++;
		}
	}

	return summary;
}

function formatCurrent( status ) {
	if ( ! status?.current ) {
		return '- Current repro: none';
	}

	return [
		`- Current index: ${ status.current.index }`,
		`- Current bug type: \`${ status.current.bugType }\``,
		`- Current signature: \`${ status.current.signature }\``,
		`- Current transport: \`${ status.current.transport }\``,
		`- Current spec: \`${ status.current.specPath }\``,
	].join( '\n' );
}

function formatFailureList( records, limit = 12 ) {
	const failures = records
		.filter( ( record ) => record.result && record.result !== 'passed' )
		.slice( -limit );

	if ( failures.length === 0 ) {
		return '- none recorded';
	}

	return failures
		.map(
			( record ) =>
				`- \`${ record.bugType }\` (` +
				`\`${ record.signature }\`, ${ record.transport }, ` +
				`${ record.result }${ record.timedOut ? ', timed out' : '' })`
		)
		.join( '\n' );
}

function formatRecentResults( records, limit = 10 ) {
	const recent = records.slice( -limit );
	if ( recent.length === 0 ) {
		return '- none recorded';
	}

	return recent
		.map(
			( record ) =>
				`- ${ record.result }: \`${ record.bugType }\` ` +
				`(\`${ record.signature }\`, ${ record.transport })`
		)
		.join( '\n' );
}

function formatSmoke( label, status, records ) {
	const failed = records.filter( ( record ) => record.result !== 'passed' );
	return [
		`${ label } smoke:`,
		'',
		`- Attempted: ${ status?.attempted ?? records.length }`,
		`- Passed: ${ status?.passed ?? records.filter( ( r ) => r.result === 'passed' ).length }`,
		`- Failed: ${ status?.failed ?? failed.length }`,
		`- Skipped: ${ status?.skipped ?? 0 }`,
		`- Stop reason: \`${ status?.stopReason ?? 'unknown' }\``,
		'- Failed canonical repros:',
		failed.length
			? failed
					.map(
						( record ) =>
							`  - \`${ record.bugType }\` (` +
							`\`${ record.signature }\`)`
					)
					.join( '\n' )
			: '  - none',
	].join( '\n' );
}

function buildMarkdown( {
	updatedAt,
	manifest,
	fullStatus,
	fullRecords,
	httpSmokeStatus,
	httpSmokeRecords,
	wsSmokeStatus,
	wsSmokeRecords,
} ) {
	const fullSummary = summarizeRecords( fullRecords );
	const manifestSummary = manifest?.summary ?? {};
	const totalRunnable = fullStatus?.totalRunnable ?? manifestSummary.runnableCanonicalRepros ?? 0;
	const attempted = fullStatus?.attempted ?? fullSummary.total;
	const remaining =
		typeof totalRunnable === 'number' && typeof attempted === 'number'
			? Math.max( totalRunnable - attempted, 0 )
			: 'unknown';

	return `# Distinct Manifest Rerun Status

Updated: ${ updatedAt }

This is the local rerun status for the distinct-bug manifest on refreshed base
\`try/fuzz-fixed-base-20260505\`.

## Manifest

- Manifest: \`fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json\`
- STATUS files scanned: ${ manifestSummary.statusFilesScanned ?? 'unknown' }
- \`Classification: real\` files: ${ manifestSummary.realStatusFiles ?? 'unknown' }
- Distinct bug types: ${ manifestSummary.distinctBugTypes ?? 'unknown' }
- Runnable canonical repros: ${ manifestSummary.runnableCanonicalRepros ?? 'unknown' }
- Runnable HTTP repros: ${ manifestSummary.runnableHttpRepros ?? 'unknown' }
- Runnable WebSocket repros: ${ manifestSummary.runnableWebsocketRepros ?? 'unknown' }
- Groups without an existing spec: ${ manifestSummary.groupsWithoutExistingSpec ?? 'unknown' }

## Smoke Results

${ formatSmoke( 'HTTP', httpSmokeStatus, httpSmokeRecords ) }

${ formatSmoke( 'WebSocket', wsSmokeStatus, wsSmokeRecords ) }

## Full Rerun

Started at 2026-05-05T09:00:05Z in tmux session
\`rtc-manifest-rerun-20260505\`.

Command:

\`\`\`bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=420000 \\
RTC_MANIFEST_WS_START_PORT=19491 \\
WP_ENV_PORT=9492 \\
WP_BASE_URL=http://localhost:9492 \\
node bin/rtc-browser-fuzz-rerun-manifest.mjs \\
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \\
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-full-all \\
  --transport all
\`\`\`

Live state:

- Status: \`fuzz-handoff/distinct-manifest-20260505/results-full-all/status.json\`
- Results: \`fuzz-handoff/distinct-manifest-20260505/results-full-all/results.jsonl\`
- Logs: \`fuzz-handoff/distinct-manifest-20260505/results-full-all/logs/\`
- Playwright artifacts: \`fuzz-handoff/distinct-manifest-20260505/results-full-all/outputs/\`

Current progress:

- Attempted: ${ attempted } of ${ totalRunnable }
- Remaining: ${ remaining }
- Passed: ${ fullStatus?.passed ?? fullSummary.passed }
- Failed: ${ fullStatus?.failed ?? fullSummary.failed }
- Missing spec: ${ fullSummary.missingSpec }
- Timed out: ${ fullSummary.timedOut }
- Skipped: ${ fullStatus?.skipped ?? 0 }
- HTTP records completed: ${ fullSummary.http }
- WebSocket records completed: ${ fullSummary.websocket }
- Runner status updated at: \`${ fullStatus?.updatedAt ?? 'unknown' }\`
- Completed at: \`${ fullStatus?.completedAt ?? 'not complete' }\`
- Stop reason: \`${ fullStatus?.stopReason ?? 'running' }\`
${ formatCurrent( fullStatus ) }

Recent full-run results:

${ formatRecentResults( fullRecords ) }

Recent full-run failures:

${ formatFailureList( fullRecords ) }

Resume by rerunning the command above with the same \`--results-dir\`.
Completed keys already present in \`results.jsonl\` are skipped.
`;
}

async function updateStatusDocument() {
	const [ manifest, fullStatus, fullRecords, httpSmokeStatus, httpSmokeRecords, wsSmokeStatus, wsSmokeRecords ] =
		await Promise.all( [
			readJson( MANIFEST_PATH ),
			readJson( FULL_STATUS_PATH ),
			readJsonLines( FULL_RESULTS_PATH ),
			readJson( HTTP_SMOKE_STATUS_PATH ),
			readJsonLines( HTTP_SMOKE_RESULTS_PATH ),
			readJson( WS_SMOKE_STATUS_PATH ),
			readJsonLines( WS_SMOKE_RESULTS_PATH ),
		] );

	const markdown = buildMarkdown( {
		updatedAt: new Date().toISOString(),
		manifest,
		fullStatus,
		fullRecords,
		httpSmokeStatus,
		httpSmokeRecords,
		wsSmokeStatus,
		wsSmokeRecords,
	} );

	await fs.writeFile( STATUS_DOC_PATH, markdown );
}

async function main() {
	await updateStatusDocument();

	runGit( [ 'add', 'fuzz-handoff/distinct-manifest-20260505/RERUN_STATUS.md' ] );
	const diff = runGit(
		[ 'diff', '--cached', '--quiet', '--', 'fuzz-handoff/distinct-manifest-20260505/RERUN_STATUS.md' ],
		{ check: false }
	);

	if ( diff.status === 0 ) {
		process.stdout.write( 'No status update to push.\n' );
		return;
	}

	const message = `Update RTC manifest rerun status (${ new Date()
		.toISOString()
		.replace( /\.\d{3}Z$/, 'Z' ) })`;
	runGit( [ 'commit', '--no-verify', '-m', message ] );
	runGit( [ 'push', 'danluu', 'HEAD:try/fuzz-fixed-base-20260505' ] );
	process.stdout.write( `${ message }\n` );
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
