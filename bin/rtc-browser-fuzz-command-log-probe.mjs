#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice( 2 );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-command-log-probe.mjs <command.log> --pattern <regex> [--max-matches <n>] [--context <n>] [--tail-bytes <n>]',
			'',
			'Searches only a bounded tail of a current RTC analysis command.log.',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

const logPath = args.find( ( arg ) => ! arg.startsWith( '--' ) );
const pattern = getOptionString( '--pattern' );
const maxMatches = getOptionInteger( '--max-matches', 40 );
const contextLines = getOptionInteger( '--context', 0 );
const tailBytes = getOptionInteger( '--tail-bytes', 256 * 1024 );

if ( ! logPath ) {
	throw new Error( 'Expected a command.log path.' );
}
if ( ! pattern ) {
	throw new Error( 'Expected --pattern <regex>.' );
}
if ( path.basename( logPath ) !== 'command.log' ) {
	throw new Error( `Expected command.log, got ${ logPath }.` );
}

const resolvedLogPath = path.resolve( logPath );
const allowedRoots = [
	process.env.RTC_FUZZ_ANALYSIS_RUN_DIR,
	process.env.RTC_FUZZ_ANALYSIS_JOB_DIR,
	process.env.RTC_FUZZ_DEEP_ANALYSIS_RUN_DIR,
	process.env.RTC_FUZZ_DEEP_ANALYSIS_JOB_DIR,
]
	.filter( Boolean )
	.map( ( root ) => path.resolve( root ) + path.sep );

if (
	allowedRoots.length > 0 &&
	! allowedRoots.some( ( root ) => resolvedLogPath.startsWith( root ) )
) {
	throw new Error(
		`Refusing command.log outside current analysis roots: ${ resolvedLogPath }`
	);
}

const regex = new RegExp( pattern, 'i' );
const stat = await fs.stat( resolvedLogPath );
const start = Math.max( 0, stat.size - tailBytes );
const handle = await fs.open( resolvedLogPath, 'r' );
try {
	const buffer = Buffer.alloc( stat.size - start );
	await handle.read( buffer, 0, buffer.length, start );
	const text = buffer.toString( 'utf8' );
	const lines = text.split( /\r?\n/ );
	const matches = [];

	for ( let index = 0; index < lines.length; index++ ) {
		if ( ! regex.test( lines[ index ] ) ) {
			continue;
		}
		const from = Math.max( 0, index - contextLines );
		const to = Math.min( lines.length, index + contextLines + 1 );
		matches.push( {
			line: lineNumberForOffset( text, lines, index, start ),
			text: lines.slice( from, to ),
		} );
		if ( matches.length >= maxMatches ) {
			break;
		}
	}

	process.stdout.write(
		JSON.stringify(
			{
				path: resolvedLogPath,
				fileBytes: stat.size,
				scannedTailBytes: stat.size - start,
				pattern,
				maxMatches,
				contextLines,
				matches,
			},
			null,
			2
		) + '\n'
	);
} finally {
	await handle.close();
}

function getOptionString( name ) {
	const index = args.indexOf( name );
	if ( index === -1 ) {
		return null;
	}
	return args[ index + 1 ] ?? null;
}

function getOptionInteger( name, fallback ) {
	const value = getOptionString( name );
	if ( value === null ) {
		return fallback;
	}
	const parsed = Number.parseInt( value, 10 );
	if ( ! Number.isInteger( parsed ) || parsed <= 0 ) {
		throw new Error( `Expected positive integer after ${ name }.` );
	}
	return parsed;
}

function lineNumberForOffset( text, lines, lineIndex, startOffset ) {
	if ( startOffset === 0 ) {
		return lineIndex + 1;
	}
	const prefix = lines.slice( 0, lineIndex ).join( '\n' );
	const byteOffset = startOffset + Buffer.byteLength( prefix, 'utf8' );
	return `tail+${ lineIndex + 1 }@byte${ byteOffset }`;
}
