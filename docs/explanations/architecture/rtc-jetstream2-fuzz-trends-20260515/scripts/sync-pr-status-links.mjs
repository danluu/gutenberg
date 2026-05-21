#!/usr/bin/env node

/**
 * Keep the proposed PR status table linked to current public progress refs.
 *
 * The PR split report is intentionally stricter than the progress controller:
 * aggregate or prior-art branches must not be linked to active micro-split rows.
 * This script only overlays exact row-specific `danluu/rtc-pr-progress-*` refs
 * that the controller currently reports.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATUS_REPORT =
	'docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md';
const DEFAULT_PROGRESS_CSV =
	'docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515/data/pr_progress_current.csv';

const EXACT_PROGRESS_BRANCH_BY_PR = new Map( [
	[ 'PR 2A', 'rtc-pr02a-http-room-isolation-regression' ],
	[ 'PR 9', 'rtc-pr09-store-lock-fairness' ],
	[ 'PR 10', 'rtc-pr10-crdt-block-rebase' ],
	[ 'PR 11A', 'rtc-pr11a-stale-base-record-block-append' ],
	[ 'PR 11B', 'rtc-pr11b-stale-base-block-delete' ],
	[ 'PR 14', 'rtc-pr14-table-body-array-green' ],
	[ 'PR 14B', 'rtc-pr14b-table-query-array-local-suffix-append' ],
	[ 'PR 15A', 'rtc-pr15a-fallback-group-move-green-on-pr14b' ],
	[ 'PR 15B', 'rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b' ],
	[ 'PR 15C', 'rtc-pr15c-fallback-group-delete-green-on-pr14b' ],
] );

function parseArgs() {
	const args = process.argv.slice( 2 );
	const options = {
		root: process.cwd(),
		statusReport: DEFAULT_STATUS_REPORT,
		progressCsv: DEFAULT_PROGRESS_CSV,
	};

	for ( let index = 0; index < args.length; index++ ) {
		const arg = args[ index ];
		if ( arg === '--root' ) {
			options.root = args[ ++index ];
		} else if ( arg === '--status-report' ) {
			options.statusReport = args[ ++index ];
		} else if ( arg === '--progress-csv' ) {
			options.progressCsv = args[ ++index ];
		} else {
			throw new Error( `Unknown argument: ${ arg }` );
		}
	}

	return options;
}

function parseDelimitedLine( line, delimiter ) {
	const cells = [];
	let value = '';
	let inQuotes = false;

	for ( let index = 0; index < line.length; index++ ) {
		const char = line[ index ];
		const next = line[ index + 1 ];

		if ( char === '"' ) {
			if ( inQuotes && next === '"' ) {
				value += '"';
				index++;
			} else {
				inQuotes = ! inQuotes;
			}
		} else if ( char === delimiter && ! inQuotes ) {
			cells.push( value );
			value = '';
		} else {
			value += char;
		}
	}

	cells.push( value );
	return cells;
}

function parseDelimited( content ) {
	const lines = content.split( /\r?\n/ ).filter( Boolean );
	if ( lines.length === 0 ) {
		return [];
	}

	const delimiter = lines[ 0 ].includes( '\t' ) ? '\t' : ',';
	const header = parseDelimitedLine( lines[ 0 ], delimiter );
	return lines.slice( 1 ).map( ( line ) => {
		const cells = parseDelimitedLine( line, delimiter );
		return Object.fromEntries(
			header.map( ( name, index ) => [ name, cells[ index ] ?? '' ] )
		);
	} );
}

function readProgressBySlug( progressCsvPath ) {
	if ( ! fs.existsSync( progressCsvPath ) ) {
		return new Map();
	}

	const rows = parseDelimited( fs.readFileSync( progressCsvPath, 'utf8' ) );
	const bySlug = new Map();
	for ( const row of rows ) {
		const branch = row.branch_or_target || '';
		const slug = branch.replace( /^ready\//, '' );
		if ( slug ) {
			bySlug.set( slug, row );
		}
	}
	return bySlug;
}

function splitMarkdownRow( line ) {
	return line
		.replace( /^\|/, '' )
		.replace( /\|$/, '' )
		.split( '|' )
		.map( ( cell ) => cell.trim() );
}

function renderMarkdownRow( cells ) {
	return `| ${ cells.join( ' | ' ) } |`;
}

function stripPreviousProgressStatus( status ) {
	return status
		.replace( /\s*; current progress: [^|]+$/, '' )
		.replace( /\s*; current progress: .*$/, '' )
		.trim();
}

function progressStatusText( progress ) {
	const status = progress.status || 'unknown';
	const sha = progress.head_sha ? ` at \`${ progress.head_sha }\`` : '';
	const action = progress.next_action ? `; ${ progress.next_action }` : '';
	return `current progress: ${ status }${ sha }${ action }`;
}

function syncLinks( markdown, progressBySlug ) {
	const lines = markdown.split( /\r?\n/ );
	let inProposedSplit = false;
	let inPriorArt = false;
	let changed = false;

	const out = lines.map( ( line ) => {
		if ( line === '## Proposed PR Split' ) {
			inProposedSplit = true;
			inPriorArt = false;
			return line;
		}
		if ( inProposedSplit && line.startsWith( '## ' ) && line !== '## Proposed PR Split' ) {
			inProposedSplit = false;
			inPriorArt = false;
			return line;
		}
		if ( inProposedSplit && line.startsWith( '### Verified Prior Art' ) ) {
			inPriorArt = true;
			return line;
		}
		if (
			! inProposedSplit ||
			inPriorArt ||
			! line.startsWith( '| PR ' ) ||
			line.includes( '| --- ' )
		) {
			return line;
		}

		const cells = splitMarkdownRow( line );
		if ( cells.length < 5 ) {
			return line;
		}

		const pr = cells[ 0 ];
		const slug = EXACT_PROGRESS_BRANCH_BY_PR.get( pr );
		if ( ! slug ) {
			return line;
		}

		const progress = progressBySlug.get( slug );
		if ( ! progress ) {
			return line;
		}

		const branch = `danluu/rtc-pr-progress-${ slug }`;
		cells[ 2 ] = `[\`${ branch }\`](https://github.com/danluu/gutenberg/tree/${ branch })`;
		cells[ 4 ] = `${ stripPreviousProgressStatus( cells[ 4 ] ) }; ${ progressStatusText( progress ) }`;
		changed = true;
		return renderMarkdownRow( cells );
	} );

	const marker =
		'The refresh also overlays exact public progress branches from `pr_progress_current.csv` when the controller has a row-specific `danluu/rtc-pr-progress-*` ref. These progress links show current publication/evidence refs; they do not override owner, benchmark, branch-link-audit, or fuzz gates in the status cell.';

	if ( changed && ! out.includes( marker ) ) {
		const insertAfter = out.findIndex( ( line ) =>
			line.includes( 'no verified branch link are not file-ready.' )
		);
		if ( insertAfter !== -1 ) {
			out.splice( insertAfter + 1, 0, '', marker, '' );
		}
	}

	return { content: out.join( '\n' ), changed };
}

const options = parseArgs();
const statusReportPath = path.resolve( options.root, options.statusReport );
const progressCsvPath = path.resolve( options.root, options.progressCsv );

if ( ! fs.existsSync( statusReportPath ) ) {
	throw new Error( `Status report not found: ${ statusReportPath }` );
}

const progressBySlug = readProgressBySlug( progressCsvPath );
const original = fs.readFileSync( statusReportPath, 'utf8' );
const result = syncLinks( original, progressBySlug );

if ( result.changed && result.content !== original ) {
	fs.writeFileSync( statusReportPath, result.content );
	console.log( `Updated PR status links in ${ options.statusReport }` );
} else {
	console.log( 'No PR status link updates needed.' );
}
