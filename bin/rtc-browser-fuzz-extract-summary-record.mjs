#!/usr/bin/env node
import fs from 'fs';
import readline from 'readline';

const args = process.argv.slice( 2 );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-extract-summary-record.mjs <summary.ndjson> [--seed <n>] [--line-index <n>]',
			'',
			'Prints compact, analysis-safe records from RTC fuzz summary.ndjson.',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

const summaryPath = args.find( ( arg ) => ! arg.startsWith( '--' ) );
const seed = getOptionInteger( '--seed' );
const lineIndex = getOptionInteger( '--line-index' );

if ( ! summaryPath ) {
	throw new Error( 'Expected a summary.ndjson path.' );
}

if ( seed === null && lineIndex === null ) {
	throw new Error( 'Expected --seed <n> or --line-index <n>.' );
}

const matches = [];
let currentLineIndex = 0;

const input = readline.createInterface( {
	crlfDelay: Infinity,
	input: fs.createReadStream( summaryPath, 'utf8' ),
} );

for await ( const line of input ) {
	if ( ! line.trim() ) {
		currentLineIndex++;
		continue;
	}

	let record;
	try {
		record = JSON.parse( line );
	} catch ( error ) {
		throw new Error(
			`Failed to parse ${ summaryPath }:${ currentLineIndex + 1 }: ${
				error.message
			}`
		);
	}

	const lineMatches =
		lineIndex === null ||
		currentLineIndex === lineIndex ||
		currentLineIndex + 1 === lineIndex;
	const seedMatches = seed === null || record.seed === seed;

	if ( lineMatches && seedMatches ) {
		matches.push( compactRecord( record, currentLineIndex ) );
		if ( matches.length >= 4 ) {
			break;
		}
	}

	currentLineIndex++;
}

process.stdout.write( JSON.stringify( matches, null, 2 ) + '\n' );

function getOptionInteger( name ) {
	const index = args.indexOf( name );
	if ( index === -1 ) {
		return null;
	}
	const value = Number.parseInt( args[ index + 1 ], 10 );
	if ( ! Number.isInteger( value ) ) {
		throw new Error( `Expected integer value after ${ name }.` );
	}
	return value;
}

function compactRecord( record, lineIndexValue ) {
	const coverage = record.behavioralCoverage?.[ 0 ] ?? {};
	const historyEvents = coverage.historyEvents ?? [];
	const invariantEvents = coverage.invariantEvents ?? [];
	const operationEvents = coverage.operationEvents ?? [];
	const failedHistory = historyEvents
		.filter( ( event ) => event.status === 'fail' )
		.slice( -6 );
	const failedInvariants = invariantEvents
		.filter( ( event ) => event.status && event.status !== 'ok' )
		.slice( -12 );
	const notableOperationEvents = operationEvents
		.filter( ( event ) =>
			[ 'missing', 'fail', 'invalidated', 'retired' ].includes(
				event.status
			)
		)
		.slice( -16 );

	return {
		lineIndex: lineIndexValue,
		kind: record.kind,
		seed: record.seed,
		label: record.label,
		code: record.code,
		signal: record.signal,
		ok: record.ok,
		timedOut: record.timedOut,
		durationMs: record.durationMs,
		classification: record.classification,
		logPath: record.logPath,
		replayPath: record.replayPath,
		artifactsDir: record.artifactsDir,
		outputExcerpt: excerptFailureOutput( record.output ),
		behavioralCoverageSummary: record.behavioralCoverageSummary,
		coverage: {
			actionProfile: coverage.actionProfile,
			actions: coverage.actions,
			blockStats: record.blockStats,
			cdpCoverage: coverage.cdpCoverage ?? record.cdpCoverage,
			collaboratorMode: coverage.collaboratorMode,
			disableParserStress: coverage.disableParserStress,
			disableReload: coverage.disableReload,
			disableRevisionRestore: coverage.disableRevisionRestore,
			disableSyncFaults: coverage.disableSyncFaults,
			faults: coverage.faults,
			initialContentProfile: coverage.initialContentProfile,
			lifecycleEvents: coverage.lifecycleEvents,
			operationLedger: coverage.operationLedger,
			reloadStep: coverage.reloadStep,
			reloads: coverage.reloads,
			revisionRestore: coverage.revisionRestore,
			saveCheckpointSteps: coverage.saveCheckpointSteps,
			status: coverage.status,
			transport: coverage.transport,
			userCount: coverage.userCount,
		},
		historyTail: historyEvents.slice( -12 ),
		failedHistory,
		failedInvariants,
		notableOperationEvents,
	};
}

function excerptFailureOutput( output ) {
	if ( ! output ) {
		return null;
	}

	const text = String( output );
	const failureStart = text.search( /\n\s*1\)|Error:|TimeoutError:/ );
	const start =
		failureStart === -1 ? Math.max( 0, text.length - 2400 ) : failureStart;
	return text.slice( start, start + 4000 ).replace( /\u001b\[[0-9;]*m/g, '' );
}
