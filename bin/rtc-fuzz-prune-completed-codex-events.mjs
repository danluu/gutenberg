#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const args = process.argv.slice( 2 );
const APPLY = args.includes( '--apply' );
const JSON_OUTPUT = args.includes( '--json' );
const MIN_AGE_MINUTES = getNumberOption( 'min-age-minutes', 30 );
const RUN_ROOT = path.resolve(
	args.find( ( arg ) => ! arg.startsWith( '--' ) ) ??
		process.env.RTC_FUZZ_PRUNE_CODEX_EVENTS_RUN_ROOT ??
		''
);
const CUTOFF_MS = MIN_AGE_MINUTES * 60 * 1000;

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-fuzz-prune-completed-codex-events.mjs <run-root> [--apply] [--json] [--min-age-minutes=30]',
			'',
			'Prunes raw Codex event streams that are safe to regenerate/lose:',
			'- periodic-codex-monitor/*/events.jsonl and stderr.log when final.md and exit-code.txt exist',
			'- .triage-watcher/analysis-tier/signatures/*/events.jsonl when result.json, analysis.md, and handoff.md exist',
			'- .triage-watcher/deep-analysis-tier/signatures/*/events.jsonl when result.json, deep-analysis.md, and repro-handoff.md exist',
			'',
			'By default this is a dry run. With --apply it removes only completed job raw event files older than the age threshold.',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

if ( ! RUN_ROOT || ! fs.existsSync( RUN_ROOT ) ) {
	throw new Error(
		'Expected an existing run root argument or RTC_FUZZ_PRUNE_CODEX_EVENTS_RUN_ROOT.'
	);
}

function getNumberOption( name, fallback ) {
	const prefix = `--${ name }=`;
	const raw = args
		.find( ( arg ) => arg.startsWith( prefix ) )
		?.slice( prefix.length );
	if ( raw === undefined || raw === '' ) {
		return fallback;
	}
	const parsed = Number.parseFloat( raw );
	if ( ! Number.isFinite( parsed ) || parsed < 0 ) {
		throw new Error( `Expected --${ name } to be a non-negative number.` );
	}
	return parsed;
}

function fileExists( filePath ) {
	return fs.existsSync( filePath );
}

function isOldEnough( filePath ) {
	const stats = fs.statSync( filePath );
	return Date.now() - stats.mtimeMs >= CUTOFF_MS;
}

function removeOrCount( filePath, reason, summary ) {
	if ( ! fileExists( filePath ) || ! isOldEnough( filePath ) ) {
		if ( fileExists( filePath ) ) {
			summary.skippedRecent++;
		}
		return;
	}

	const stats = fs.statSync( filePath );
	summary.candidates++;
	summary.bytes += stats.size;
	summary.byReason[ reason ] = ( summary.byReason[ reason ] ?? 0 ) + 1;

	if ( APPLY ) {
		fs.rmSync( filePath );
		summary.removed++;
	}
}

function writeMarker( dir, message ) {
	if ( ! APPLY ) {
		return;
	}
	const markerPath = path.join( dir, 'raw-events-pruned.txt' );
	if ( fileExists( markerPath ) ) {
		return;
	}
	fs.writeFileSync(
		markerPath,
		`${ message }\nPruned at ${ new Date().toISOString() }\n`
	);
}

function prunePeriodicMonitor( summary ) {
	const root = path.join( RUN_ROOT, 'periodic-codex-monitor' );
	if ( ! fileExists( root ) ) {
		return;
	}
	for ( const entry of fs.readdirSync( root, { withFileTypes: true } ) ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const dir = path.join( root, entry.name );
		if (
			! fileExists( path.join( dir, 'final.md' ) ) ||
			! fileExists( path.join( dir, 'exit-code.txt' ) )
		) {
			summary.skippedIncomplete++;
			continue;
		}
		removeOrCount(
			path.join( dir, 'events.jsonl' ),
			'periodic-monitor-events',
			summary
		);
		removeOrCount(
			path.join( dir, 'stderr.log' ),
			'periodic-monitor-stderr',
			summary
		);
		writeMarker(
			dir,
			'Pruned raw Codex monitor events/stderr to save disk. final.md and exit-code.txt are retained.'
		);
	}
}

function isCompleteAnalysisJob( dir, tier ) {
	if ( ! fileExists( path.join( dir, 'result.json' ) ) ) {
		return false;
	}
	if ( tier === 'analysis-tier' ) {
		return (
			fileExists( path.join( dir, 'analysis.md' ) ) &&
			fileExists( path.join( dir, 'handoff.md' ) )
		);
	}
	if ( tier === 'deep-analysis-tier' ) {
		return (
			fileExists( path.join( dir, 'deep-analysis.md' ) ) &&
			fileExists( path.join( dir, 'repro-handoff.md' ) )
		);
	}
	return false;
}

function maybePruneTriageEvents( filePath, summary ) {
	summary.scannedTriageEvents++;
	const parts = filePath.split( path.sep );
	const signatureIndex = parts.lastIndexOf( 'signatures' );
	const tier = signatureIndex >= 1 ? parts[ signatureIndex - 1 ] : '';
	if (
		! [ 'analysis-tier', 'deep-analysis-tier' ].includes( tier ) ||
		! isCompleteAnalysisJob( path.dirname( filePath ), tier )
	) {
		summary.skippedIncomplete++;
		return;
	}

	removeOrCount( filePath, `${ tier }-events`, summary );
	writeMarker(
		path.dirname( filePath ),
		`Pruned completed Codex ${ tier } raw events to save disk. Durable result/markdown outputs are retained.`
	);
}

function walk( dir, summary ) {
	let entries;
	try {
		entries = fs.readdirSync( dir, { withFileTypes: true } );
	} catch {
		return;
	}
	for ( const entry of entries ) {
		const entryPath = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			walk( entryPath, summary );
		} else if (
			entry.isFile() &&
			entry.name === 'events.jsonl' &&
			entryPath.includes( `${ path.sep }.triage-watcher${ path.sep }` )
		) {
			maybePruneTriageEvents( entryPath, summary );
		}
	}
}

const summary = {
	ok: true,
	dryRun: ! APPLY,
	runRoot: RUN_ROOT,
	minAgeMinutes: MIN_AGE_MINUTES,
	candidates: 0,
	removed: 0,
	bytes: 0,
	miB: 0,
	byReason: {},
	scannedTriageEvents: 0,
	skippedRecent: 0,
	skippedIncomplete: 0,
};

prunePeriodicMonitor( summary );
walk( RUN_ROOT, summary );
summary.miB = Number( ( summary.bytes / 1024 / 1024 ).toFixed( 1 ) );

if ( JSON_OUTPUT ) {
	process.stdout.write( JSON.stringify( summary, null, 2 ) + '\n' );
} else {
	process.stdout.write(
		[
			`RTC Codex event prune ${ APPLY ? 'apply' : 'dry run' }`,
			`run root: ${ RUN_ROOT }`,
			`min age: ${ MIN_AGE_MINUTES } minutes`,
			`candidate files: ${ summary.candidates }`,
			`candidate size: ${ summary.miB } MiB`,
			`removed files: ${ summary.removed }`,
			`skipped recent: ${ summary.skippedRecent }`,
			`skipped incomplete: ${ summary.skippedIncomplete }`,
		].join( '\n' ) + '\n'
	);
}
