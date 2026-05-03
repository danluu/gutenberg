#!/usr/bin/env node

/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { SourceMapConsumer } = require( 'source-map' );

const repoRoot = path.resolve( __dirname, '../../..' );
const reportDataDir = path.join(
	repoRoot,
	'test/performance/reports/typing-delay-benchmark/data'
);

const ownerRuns = [
	{
		runId: 'use_select_owners_large_keyhold',
		modeLabel: 'Playwright delay: key held down',
		dir: 'artifacts/typing-delay-benchmark-use-select-owners-large-keyhold',
	},
	{
		runId: 'use_select_owners_large_between_keys',
		modeLabel: 'Complete keypress, then wait',
		dir: 'artifacts/typing-delay-benchmark-use-select-owners-large-between-keys',
	},
];

const sourceMapConsumers = new Map();

function newestJson( dir ) {
	const absDir = path.join( repoRoot, dir );
	if ( ! fs.existsSync( absDir ) ) {
		return null;
	}

	const files = fs
		.readdirSync( absDir )
		.filter( ( file ) => /^typing-delay-benchmark-\d+\.json$/.test( file ) )
		.map( ( file ) => path.join( absDir, file ) )
		.sort(
			( left, right ) =>
				fs.statSync( right ).mtimeMs - fs.statSync( left ).mtimeMs
		);

	return files[ 0 ] || null;
}

function csvEscape( value ) {
	if ( value === undefined || value === null ) {
		return '';
	}

	const text = String( value );
	if ( /[",\n\r]/.test( text ) ) {
		return `"${ text.replace( /"/g, '""' ) }"`;
	}
	return text;
}

function writeCsv( file, rows, columns ) {
	const csv = [
		columns.join( ',' ),
		...rows.map( ( row ) =>
			columns.map( ( column ) => csvEscape( row[ column ] ) ).join( ',' )
		),
	].join( '\n' );
	fs.writeFileSync( file, `${ csv }\n` );
}

function quantile( values, p ) {
	if ( values.length === 0 ) {
		return null;
	}
	const sorted = [ ...values ].sort( ( left, right ) => left - right );
	const index = ( sorted.length - 1 ) * p;
	const lower = Math.floor( index );
	const upper = Math.ceil( index );
	if ( lower === upper ) {
		return sorted[ lower ];
	}
	return (
		sorted[ lower ] +
		( sorted[ upper ] - sorted[ lower ] ) * ( index - lower )
	);
}

function ownerFrame( stack = '' ) {
	for ( const line of stack.split( '\n' ).slice( 1 ) ) {
		if ( line.includes( '/build/scripts/data/' ) ) {
			continue;
		}
		if ( line.includes( '/build/scripts/vendors/' ) ) {
			continue;
		}

		const match = line.match(
			/build\/scripts\/([^/]+)\/index(?:\.min)?\.js[^:]*:(\d+):(\d+)/
		);
		if ( match ) {
			return {
				script: match[ 1 ],
				line: Number( match[ 2 ] ),
				column: Number( match[ 3 ] ),
				frame: `${ match[ 1 ] }:${ match[ 2 ] }:${ match[ 3 ] }`,
			};
		}
	}

	return {
		script: 'unknown',
		line: null,
		column: null,
		frame: 'unknown',
	};
}

function sourceMapConsumer( script ) {
	if ( sourceMapConsumers.has( script ) ) {
		return sourceMapConsumers.get( script );
	}

	const mapPath = path.join(
		repoRoot,
		'build/scripts',
		script,
		'index.min.js.map'
	);
	if ( ! fs.existsSync( mapPath ) ) {
		sourceMapConsumers.set( script, null );
		return null;
	}

	const consumer = new SourceMapConsumer(
		JSON.parse( fs.readFileSync( mapPath, 'utf8' ) )
	);
	sourceMapConsumers.set( script, consumer );
	return consumer;
}

function originalPosition( frame ) {
	const consumer = sourceMapConsumer( frame.script );
	if ( ! consumer || frame.line === null || frame.column === null ) {
		return {};
	}

	const position = consumer.originalPositionFor( {
		line: frame.line,
		column: frame.column,
	} );

	return {
		sourcePath: position.source
			? position.source.replace( /^\.\.\/\.\.\/\.\.\//, '' )
			: '',
		sourceLine: position.line || '',
		sourceColumn: position.column ?? '',
		sourceName: position.name || '',
	};
}

function sourceSnippet( source = '' ) {
	return source.replace( /\s+/g, ' ' ).slice( 0, 180 );
}

function summarizeRun( run ) {
	const jsonPath = newestJson( run.dir );
	if ( ! jsonPath ) {
		throw new Error( `Missing owner benchmark JSON in ${ run.dir }` );
	}

	// eslint-disable-next-line no-console
	console.log( `Reading ${ jsonPath }` );
	const data = JSON.parse( fs.readFileSync( jsonPath, 'utf8' ) );
	const metadataById = new Map();

	for ( const metadata of data.useSelectMetadata || [] ) {
		const frame = ownerFrame( metadata.useSelectStack );
		metadataById.set(
			`${ metadata.windowName }:${ metadata.useSelectId }`,
			{
				...metadata,
				...frame,
				...originalPosition( frame ),
				sourceSnippet: sourceSnippet( metadata.initialMapSelectSource ),
			}
		);
	}

	const groups = new Map();
	for ( const delayRun of data.delayRunSummaries || [] ) {
		for ( const event of delayRun.dataSpanEvents || [] ) {
			if (
				! [
					'data.useSelect.onChange',
					'data.useSelect.reactListener',
					'data.useSelect.updateValue',
					'data.useSelect.mapSelect',
				].includes( event.name )
			) {
				continue;
			}

			const useSelectId = event.metadata?.useSelectId;
			if ( ! useSelectId ) {
				continue;
			}

			const metadata =
				metadataById.get( `${ event.windowName }:${ useSelectId }` ) ||
				{};
			const ownerKey = [
				run.runId,
				delayRun.delayMs,
				event.name,
				event.windowName,
				metadata.frame,
				metadata.sourcePath,
				metadata.sourceLine,
				metadata.sourceSnippet,
			].join( '\t' );
			if ( ! groups.has( ownerKey ) ) {
				groups.set( ownerKey, {
					run_id: run.runId,
					mode_label: run.modeLabel,
					json_path: path.relative( repoRoot, jsonPath ),
					delay_ms: delayRun.delayMs,
					key_groups: delayRun.keyGroups,
					span_name: event.name,
					window_name: event.windowName,
					owner_script: metadata.script || 'unknown',
					owner_frame: metadata.frame || 'unknown',
					source_path: metadata.sourcePath || '',
					source_line: metadata.sourceLine || '',
					source_column: metadata.sourceColumn || '',
					source_name: metadata.sourceName || '',
					source_snippet: metadata.sourceSnippet || '',
					use_select_ids: new Set(),
					durations: [],
				} );
			}

			const group = groups.get( ownerKey );
			group.use_select_ids.add(
				`${ event.windowName }:${ useSelectId }`
			);
			group.durations.push( event.durationMs || 0 );
		}
	}

	return Array.from( groups.values() ).map( ( group ) => {
		const totalMs = group.durations.reduce(
			( sum, duration ) => sum + duration,
			0
		);
		return {
			...group,
			use_select_instances: group.use_select_ids.size,
			event_count: group.durations.length,
			total_ms: totalMs,
			ms_per_key: totalMs / group.key_groups,
			median_ms: quantile( group.durations, 0.5 ),
			p90_ms: quantile( group.durations, 0.9 ),
			use_select_ids: undefined,
			durations: undefined,
		};
	} );
}

fs.mkdirSync( reportDataDir, { recursive: true } );
const rows = ownerRuns.flatMap( summarizeRun );

writeCsv(
	path.join( reportDataDir, 'typing-delay-use-select-owner-summary.csv' ),
	rows,
	[
		'run_id',
		'mode_label',
		'json_path',
		'delay_ms',
		'key_groups',
		'span_name',
		'window_name',
		'owner_script',
		'owner_frame',
		'source_path',
		'source_line',
		'source_column',
		'source_name',
		'source_snippet',
		'use_select_instances',
		'event_count',
		'total_ms',
		'ms_per_key',
		'median_ms',
		'p90_ms',
	]
);

for ( const consumer of sourceMapConsumers.values() ) {
	consumer?.destroy?.();
}

// eslint-disable-next-line no-console
console.log(
	`Wrote ${ rows.length } useSelect owner rows to ${ path.relative(
		repoRoot,
		reportDataDir
	) }`
);
