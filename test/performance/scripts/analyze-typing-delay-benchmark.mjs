#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'../../..'
);
const defaultOutputDir = path.join(
	repoRoot,
	'artifacts',
	'typing-delay-benchmark'
);

function latestBenchmarkFile() {
	if ( ! fs.existsSync( defaultOutputDir ) ) {
		throw new Error(
			`No benchmark output directory: ${ defaultOutputDir }`
		);
	}

	const files = fs
		.readdirSync( defaultOutputDir )
		.filter(
			( file ) =>
				file.startsWith( 'typing-delay-benchmark-' ) &&
				file.endsWith( '.json' ) &&
				! file.endsWith( '-analysis.json' )
		)
		.sort();

	if ( files.length === 0 ) {
		throw new Error( `No benchmark JSON files in ${ defaultOutputDir }` );
	}

	return path.join( defaultOutputDir, files[ files.length - 1 ] );
}

const inputPath = process.argv[ 2 ]
	? path.resolve( process.argv[ 2 ] )
	: latestBenchmarkFile();
const input = JSON.parse( fs.readFileSync( inputPath, 'utf8' ) );
const retained = input.records.filter( ( record ) => ! record.isThrowaway );
const metricName = process.env.BENCHMARK_ANALYSIS_METRIC || 'latencyMs';
const outputPrefix = inputPath.replace(
	/\.json$/,
	metricName === 'latencyMs' ? '' : `-${ metricName }`
);

if (
	retained.some( ( record ) => ! Number.isFinite( record[ metricName ] ) )
) {
	throw new Error( `Metric not found or non-finite: ${ metricName }` );
}

function metricValue( record ) {
	return record[ metricName ];
}

function percentile( sortedValues, p ) {
	if ( sortedValues.length === 0 ) {
		return null;
	}

	const index = ( sortedValues.length - 1 ) * p;
	const lower = Math.floor( index );
	const upper = Math.ceil( index );

	if ( lower === upper ) {
		return sortedValues[ lower ];
	}

	const weight = index - lower;
	return (
		sortedValues[ lower ] * ( 1 - weight ) + sortedValues[ upper ] * weight
	);
}

function stats( values ) {
	const sorted = values
		.filter( ( value ) => Number.isFinite( value ) )
		.sort( ( a, b ) => a - b );
	const count = sorted.length;

	if ( count === 0 ) {
		return {
			count: 0,
		};
	}

	const mean = sorted.reduce( ( sum, value ) => sum + value, 0 ) / count;
	const variance =
		count > 1
			? sorted.reduce(
					( sum, value ) => sum + ( value - mean ) ** 2,
					0
			  ) /
			  ( count - 1 )
			: 0;
	const sd = Math.sqrt( variance );
	const p25 = percentile( sorted, 0.25 );
	const p50 = percentile( sorted, 0.5 );
	const p75 = percentile( sorted, 0.75 );

	return {
		count,
		min: sorted[ 0 ],
		p10: percentile( sorted, 0.1 ),
		p25,
		p50,
		p75,
		p90: percentile( sorted, 0.9 ),
		p95: percentile( sorted, 0.95 ),
		max: sorted[ count - 1 ],
		mean,
		sd,
		cv: mean === 0 ? null : sd / mean,
		iqr: p75 - p25,
		iqrOverMedian: p50 === 0 ? null : ( p75 - p25 ) / p50,
	};
}

function groupBy( values, keyFn ) {
	const groups = new Map();

	for ( const value of values ) {
		const key = keyFn( value );
		const group = groups.get( key ) || [];
		group.push( value );
		groups.set( key, group );
	}

	return groups;
}

function slope( points ) {
	const finitePoints = points.filter(
		( point ) => Number.isFinite( point.x ) && Number.isFinite( point.y )
	);

	if ( finitePoints.length < 2 ) {
		return null;
	}

	const xMean =
		finitePoints.reduce( ( sum, point ) => sum + point.x, 0 ) /
		finitePoints.length;
	const yMean =
		finitePoints.reduce( ( sum, point ) => sum + point.y, 0 ) /
		finitePoints.length;
	const numerator = finitePoints.reduce(
		( sum, point ) => sum + ( point.x - xMean ) * ( point.y - yMean ),
		0
	);
	const denominator = finitePoints.reduce(
		( sum, point ) => sum + ( point.x - xMean ) ** 2,
		0
	);

	return denominator === 0 ? null : numerator / denominator;
}

function round( value, digits = 4 ) {
	if ( value === null || value === undefined || ! Number.isFinite( value ) ) {
		return '';
	}

	return Number.parseFloat( value.toFixed( digits ) );
}

function csvEscape( value ) {
	if ( value === null || value === undefined ) {
		return '';
	}

	const stringValue = String( value );
	if ( /[",\n]/.test( stringValue ) ) {
		return `"${ stringValue.replaceAll( '"', '""' ) }"`;
	}

	return stringValue;
}

function writeCsv( filePath, rows ) {
	if ( rows.length === 0 ) {
		fs.writeFileSync( filePath, '' );
		return;
	}

	const headers = Object.keys( rows[ 0 ] );
	const lines = [
		headers.join( ',' ),
		...rows.map( ( row ) =>
			headers.map( ( header ) => csvEscape( row[ header ] ) ).join( ',' )
		),
	];

	fs.writeFileSync( filePath, `${ lines.join( '\n' ) }\n` );
}

function statsRow( extra, values ) {
	const summary = stats( values );

	return {
		...extra,
		count: summary.count,
		min: round( summary.min ),
		p10: round( summary.p10 ),
		p25: round( summary.p25 ),
		p50: round( summary.p50 ),
		p75: round( summary.p75 ),
		p90: round( summary.p90 ),
		p95: round( summary.p95 ),
		max: round( summary.max ),
		mean: round( summary.mean ),
		sd: round( summary.sd ),
		cv: round( summary.cv, 6 ),
		iqr: round( summary.iqr ),
		iqrOverMedian: round( summary.iqrOverMedian, 6 ),
	};
}

const byDelayRows = [ ...groupBy( retained, ( record ) => record.delayMs ) ]
	.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
	.map( ( [ delayMs, records ] ) =>
		statsRow(
			{
				delayMs,
				firstGlobalSample: Math.min(
					...records.map(
						( record ) => record.globalRetainedSampleIndex
					)
				),
				lastGlobalSample: Math.max(
					...records.map(
						( record ) => record.globalRetainedSampleIndex
					)
				),
				slopeMsPerSample: round(
					slope(
						records.map( ( record ) => ( {
							x: record.delaySampleIndex,
							y: metricValue( record ),
						} ) )
					),
					6
				),
			},
			records.map( metricValue )
		)
	);

const byRoundRows = [
	...groupBy(
		retained,
		( record ) => `${ record.delayMs }\t${ record.round }`
	),
]
	.map( ( [ key, records ] ) => {
		const [ delayMs, roundIndex ] = key.split( '\t' );
		return statsRow(
			{
				delayMs,
				round: roundIndex,
				firstGlobalSample: Math.min(
					...records.map(
						( record ) => record.globalRetainedSampleIndex
					)
				),
				lastGlobalSample: Math.max(
					...records.map(
						( record ) => record.globalRetainedSampleIndex
					)
				),
			},
			records.map( metricValue )
		);
	} )
	.sort(
		( a, b ) =>
			Number( a.delayMs ) - Number( b.delayMs ) ||
			Number( a.round ) - Number( b.round )
	);

const windowSize = Number.parseInt(
	process.env.BENCHMARK_ANALYSIS_WINDOW_SIZE || '200',
	10
);
const orderedRetained = [ ...retained ].sort(
	( a, b ) => a.globalRetainedSampleIndex - b.globalRetainedSampleIndex
);
const windowRows = [];

for ( let start = 0; start < orderedRetained.length; start += windowSize ) {
	const windowRecords = orderedRetained.slice( start, start + windowSize );
	const values = windowRecords.map( metricValue );
	const delayValues = windowRecords.map( ( record ) => record.delayMs );
	const first = windowRecords[ 0 ];
	const last = windowRecords[ windowRecords.length - 1 ];

	windowRows.push(
		statsRow(
			{
				window: windowRows.length,
				firstGlobalSample: first.globalRetainedSampleIndex,
				lastGlobalSample: last.globalRetainedSampleIndex,
				firstElapsedMs: first.elapsedMsSinceBenchmarkStart,
				lastElapsedMs: last.elapsedMsSinceBenchmarkStart,
				minDelayMs: Math.min( ...delayValues ),
				maxDelayMs: Math.max( ...delayValues ),
				meanDelayMs: round(
					delayValues.reduce( ( sum, value ) => sum + value, 0 ) /
						delayValues.length
				),
			},
			values
		)
	);
}

const overallStats = stats( retained.map( metricValue ) );
const roundStats = [ ...groupBy( retained, ( record ) => record.round ) ]
	.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
	.map( ( [ roundIndex, records ] ) =>
		statsRow(
			{
				round: roundIndex,
			},
			records.map( metricValue )
		)
	);
const globalSlope = slope(
	retained.map( ( record ) => ( {
		x: record.globalRetainedSampleIndex,
		y: metricValue( record ),
	} ) )
);
const firstWindow = windowRows[ 0 ];
const lastWindow = windowRows[ windowRows.length - 1 ];
const roundZeroRows = byRoundRows.filter( ( row ) => row.round === '0' );
const lastRoundRows = byRoundRows.filter(
	( row ) => row.round === String( input.metadata.rounds - 1 )
);
const lastRoundByDelay = new Map(
	lastRoundRows.map( ( row ) => [ row.delayMs, row ] )
);
const perDelayRoundDeltaRows = roundZeroRows
	.map( ( firstRoundRow ) => {
		const lastRoundRow = lastRoundByDelay.get( firstRoundRow.delayMs );
		const deltaMean = lastRoundRow.mean - firstRoundRow.mean;
		const deltaP50 = lastRoundRow.p50 - firstRoundRow.p50;

		return {
			delayMs: firstRoundRow.delayMs,
			firstRoundMean: firstRoundRow.mean,
			lastRoundMean: lastRoundRow.mean,
			deltaMean: round( deltaMean ),
			deltaMeanPct: round( ( deltaMean / firstRoundRow.mean ) * 100 ),
			firstRoundP50: firstRoundRow.p50,
			lastRoundP50: lastRoundRow.p50,
			deltaP50: round( deltaP50 ),
			deltaP50Pct: round( ( deltaP50 / firstRoundRow.p50 ) * 100 ),
		};
	} )
	.sort( ( a, b ) => Number( a.delayMs ) - Number( b.delayMs ) );

const analysis = {
	inputPath,
	metricName,
	metadata: input.metadata,
	overall: {
		...overallStats,
		slopeMsPerGlobalSample: globalSlope,
		slopeMsPer1000GlobalSamples:
			globalSlope === null ? null : globalSlope * 1000,
		firstWindowP50: firstWindow?.p50,
		lastWindowP50: lastWindow?.p50,
		lastMinusFirstWindowP50:
			firstWindow && lastWindow ? lastWindow.p50 - firstWindow.p50 : null,
	},
	roundStats,
	mostStableDelaysByCv: [ ...byDelayRows ]
		.filter( ( row ) => row.count > 1 && row.cv !== '' )
		.sort( ( a, b ) => a.cv - b.cv )
		.slice( 0, 10 ),
	lowestMedianDelays: [ ...byDelayRows ]
		.sort( ( a, b ) => a.p50 - b.p50 )
		.slice( 0, 10 ),
	largestRoundSlowdowns: [ ...perDelayRoundDeltaRows ]
		.sort( ( a, b ) => b.deltaP50Pct - a.deltaP50Pct )
		.slice( 0, 10 ),
	largestRoundSpeedups: [ ...perDelayRoundDeltaRows ]
		.sort( ( a, b ) => a.deltaP50Pct - b.deltaP50Pct )
		.slice( 0, 10 ),
};

const byDelayPath = `${ outputPrefix }-by-delay.csv`;
const byRoundPath = `${ outputPrefix }-by-delay-round.csv`;
const windowsPath = `${ outputPrefix }-time-windows.csv`;
const roundDeltaPath = `${ outputPrefix }-round-deltas.csv`;
const analysisPath = `${ outputPrefix }-analysis.json`;

writeCsv( byDelayPath, byDelayRows );
writeCsv( byRoundPath, byRoundRows );
writeCsv( windowsPath, windowRows );
writeCsv( roundDeltaPath, perDelayRoundDeltaRows );
fs.writeFileSync( analysisPath, JSON.stringify( analysis, null, 2 ) );

console.log( `Input: ${ inputPath }` );
console.log( `Retained samples: ${ retained.length }` );
console.log(
	`Overall p50: ${ round( overallStats.p50 ) }ms, mean: ${ round(
		overallStats.mean
	) }ms, sd: ${ round( overallStats.sd ) }ms`
);
console.log(
	`Global slope: ${ round(
		analysis.overall.slopeMsPer1000GlobalSamples
	) }ms / 1000 retained samples`
);
console.log(
	`First window p50: ${ firstWindow?.p50 }ms; last window p50: ${ lastWindow?.p50 }ms`
);
console.log(
	`Most stable delays by CV: ${ analysis.mostStableDelaysByCv
		.slice( 0, 5 )
		.map( ( row ) => `${ row.delayMs }ms(cv=${ row.cv })` )
		.join( ', ' ) }`
);
console.log( `Wrote: ${ byDelayPath }` );
console.log( `Wrote: ${ byRoundPath }` );
console.log( `Wrote: ${ windowsPath }` );
console.log( `Wrote: ${ roundDeltaPath }` );
console.log( `Wrote: ${ analysisPath }` );

/* eslint-enable no-console */
