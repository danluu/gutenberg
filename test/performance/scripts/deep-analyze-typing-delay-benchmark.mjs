#!/usr/bin/env node
/* eslint-disable no-bitwise, no-console */

import fs from 'fs';
import path from 'path';

const inputPath = process.argv[ 2 ];

if ( ! inputPath ) {
	throw new Error(
		'Usage: node test/performance/scripts/deep-analyze-typing-delay-benchmark.mjs <benchmark.json>'
	);
}

const input = JSON.parse( fs.readFileSync( inputPath, 'utf8' ) );
const retained = input.records.filter( ( record ) => ! record.isThrowaway );
const outputPrefix = inputPath.replace( /\.json$/, '' );
const metrics = [ 'latencyMs', 'latencyAllKeydownsMs' ].filter( ( metric ) =>
	retained.every( ( record ) => Number.isFinite( record[ metric ] ) )
);

function percentile( sortedValues, p ) {
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
		return { count };
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
	const p25 = percentile( sorted, 0.25 );
	const p50 = percentile( sorted, 0.5 );
	const p75 = percentile( sorted, 0.75 );
	const sd = Math.sqrt( variance );

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

function seededRandom( initialSeed ) {
	let state = initialSeed >>> 0;

	return () => {
		state += 0x6d2b79f5;
		let t = state;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

function bootstrapMedianCi( values, iterations = 1000 ) {
	const sortedValues = values
		.filter( ( value ) => Number.isFinite( value ) )
		.sort( ( a, b ) => a - b );

	if ( sortedValues.length === 0 ) {
		return null;
	}

	const random = seededRandom( 0x51383 );
	const medians = [];
	for ( let i = 0; i < iterations; i++ ) {
		const sample = [];
		for ( let j = 0; j < sortedValues.length; j++ ) {
			sample.push(
				sortedValues[ Math.floor( random() * sortedValues.length ) ]
			);
		}
		sample.sort( ( a, b ) => a - b );
		medians.push( percentile( sample, 0.5 ) );
	}
	medians.sort( ( a, b ) => a - b );

	return {
		low: percentile( medians, 0.025 ),
		high: percentile( medians, 0.975 ),
	};
}

function piecewiseConstantSegments( points, maxSegments = 8, minLength = 4 ) {
	const n = points.length;
	const prefix = [ 0 ];
	const prefixSquares = [ 0 ];

	for ( const point of points ) {
		prefix.push( prefix.at( -1 ) + point.y );
		prefixSquares.push( prefixSquares.at( -1 ) + point.y ** 2 );
	}

	function segmentCost( start, end ) {
		const length = end - start;
		const sum = prefix[ end ] - prefix[ start ];
		const sumSquares = prefixSquares[ end ] - prefixSquares[ start ];
		return sumSquares - sum ** 2 / length;
	}

	const dp = Array.from( { length: maxSegments + 1 }, () =>
		Array( n + 1 ).fill( Infinity )
	);
	const back = Array.from( { length: maxSegments + 1 }, () =>
		Array( n + 1 ).fill( null )
	);

	dp[ 0 ][ 0 ] = 0;

	for ( let k = 1; k <= maxSegments; k++ ) {
		for ( let end = k * minLength; end <= n; end++ ) {
			for (
				let start = ( k - 1 ) * minLength;
				start <= end - minLength;
				start++
			) {
				const cost = dp[ k - 1 ][ start ] + segmentCost( start, end );
				if ( cost < dp[ k ][ end ] ) {
					dp[ k ][ end ] = cost;
					back[ k ][ end ] = start;
				}
			}
		}
	}

	const penalty =
		Math.log( n ) * stats( points.map( ( point ) => point.y ) ).sd;
	let bestK = 1;
	let bestScore = dp[ 1 ][ n ] + penalty;
	for ( let k = 2; k <= maxSegments; k++ ) {
		const score = dp[ k ][ n ] + k * penalty;
		if ( score < bestScore ) {
			bestK = k;
			bestScore = score;
		}
	}

	const segments = [];
	let end = n;
	for ( let k = bestK; k > 0; k-- ) {
		const start = back[ k ][ end ];
		const segmentPoints = points.slice( start, end );
		segments.push( {
			startDelayMs: segmentPoints[ 0 ].delayMs,
			endDelayMs: segmentPoints.at( -1 ).delayMs,
			delayCount: segmentPoints.length,
			medianStats: stats( segmentPoints.map( ( point ) => point.y ) ),
		} );
		end = start;
	}

	return segments.reverse();
}

function round( value, digits = 4 ) {
	if ( value === null || value === undefined || ! Number.isFinite( value ) ) {
		return value;
	}

	return Number.parseFloat( value.toFixed( digits ) );
}

function roundedStats( value ) {
	if ( ! value || value.count === 0 ) {
		return value;
	}

	return Object.fromEntries(
		Object.entries( value ).map( ( [ key, item ] ) => [
			key,
			typeof item === 'number'
				? round( item, key === 'cv' ? 6 : 4 )
				: item,
		] )
	);
}

function persistenceAnalysis() {
	const runs = input.delayRunSummaries.filter( ( summary ) =>
		Array.isArray( summary.persistenceEvents )
	);

	if ( runs.length === 0 ) {
		return null;
	}

	const runRows = runs.map( ( summary ) => {
		const events = summary.persistenceEvents.map( ( event ) => ( {
			relativeMs: round( event.nowMs - summary.runStartedAtBrowserNowMs ),
			isPersistent: event.isPersistent,
			isTyping: event.isTyping,
		} ) );
		const firstNotPersistent = events.find(
			( event ) => ! event.isPersistent
		);
		const firstPersistentAfterNotPersistent = events.find(
			( event, index ) =>
				event.isPersistent &&
				events
					.slice( 0, index )
					.some( ( previous ) => ! previous.isPersistent )
		);

		return {
			round: summary.round,
			delayMs: summary.delayMs,
			editorSetupIndex: summary.editorSetupIndex,
			eventCount: events.length,
			firstNotPersistentMs: firstNotPersistent?.relativeMs ?? null,
			firstPersistentAfterNotPersistentMs:
				firstPersistentAfterNotPersistent?.relativeMs ?? null,
			pattern: events
				.map(
					( event ) =>
						`${ event.isPersistent ? 'P' : 'p' }${
							event.isTyping ? 'T' : 't'
						}`
				)
				.join( '>' ),
			events,
		};
	} );

	const byDelay = [ ...groupBy( runRows, ( row ) => row.delayMs ) ]
		.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
		.map( ( [ delayMs, rows ] ) => ( {
			delayMs,
			runCount: rows.length,
			eventCount: roundedStats(
				stats( rows.map( ( row ) => row.eventCount ) )
			),
			firstNotPersistentMs: roundedStats(
				stats( rows.map( ( row ) => row.firstNotPersistentMs ) )
			),
			firstPersistentAfterNotPersistentMs: roundedStats(
				stats(
					rows.map(
						( row ) => row.firstPersistentAfterNotPersistentMs
					)
				)
			),
			patterns: Object.fromEntries(
				[ ...groupBy( rows, ( row ) => row.pattern ) ].map(
					( [ pattern, patternRows ] ) => [
						pattern,
						patternRows.length,
					]
				)
			),
		} ) );

	return {
		runCount: runs.length,
		byDelay,
		runs: runRows,
	};
}

function countsBy( values, keyFn ) {
	const counts = {};
	for ( const value of values ) {
		const key = keyFn( value );
		counts[ key ] = ( counts[ key ] || 0 ) + 1;
	}
	return counts;
}

function mergeCounts( rows, key ) {
	const merged = {};
	for ( const row of rows ) {
		for ( const [ name, count ] of Object.entries( row[ key ] ) ) {
			merged[ name ] = ( merged[ name ] || 0 ) + count;
		}
	}
	return Object.fromEntries(
		Object.entries( merged ).sort( ( [ a ], [ b ] ) =>
			a.localeCompare( b )
		)
	);
}

function dataTraceAnalysis() {
	const runs = input.delayRunSummaries.filter(
		( summary ) =>
			Array.isArray( summary.browserEvents ) ||
			Array.isArray( summary.dataEvents )
	);

	if ( runs.length === 0 ) {
		return null;
	}

	function actionKey( event ) {
		return `${ event.storeName }:${ event.actionName || event.actionType }`;
	}

	const runRows = runs.map( ( summary ) => {
		const browserEvents = summary.browserEvents || [];
		const dataEvents = summary.dataEvents || [];
		const markPersistentActions = dataEvents.filter(
			( event ) =>
				event.storeName === 'core/block-editor' &&
				event.actionName === '__unstableMarkLastChangeAsPersistent'
		);
		const firstMarkPersistentAction = markPersistentActions[ 0 ];

		return {
			round: summary.round,
			delayMs: summary.delayMs,
			editorSetupIndex: summary.editorSetupIndex,
			browserEventCount: browserEvents.length,
			dataEventCount: dataEvents.length,
			firstMarkPersistentActionMs: firstMarkPersistentAction
				? round(
						firstMarkPersistentAction.nowMs -
							summary.runStartedAtBrowserNowMs
				  )
				: null,
			markPersistentActionCount: markPersistentActions.length,
			actionCounts: countsBy( dataEvents, actionKey ),
			browserEventCounts: countsBy(
				browserEvents,
				( event ) =>
					`${ event.documentName || 'unknown' }:${ event.type }`
			),
		};
	} );

	const byDelay = [ ...groupBy( runRows, ( row ) => row.delayMs ) ]
		.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
		.map( ( [ delayMs, rows ] ) => ( {
			delayMs,
			runCount: rows.length,
			browserEventCount: roundedStats(
				stats( rows.map( ( row ) => row.browserEventCount ) )
			),
			dataEventCount: roundedStats(
				stats( rows.map( ( row ) => row.dataEventCount ) )
			),
			firstMarkPersistentActionMs: roundedStats(
				stats( rows.map( ( row ) => row.firstMarkPersistentActionMs ) )
			),
			markPersistentActionCount: roundedStats(
				stats( rows.map( ( row ) => row.markPersistentActionCount ) )
			),
			actionCounts: mergeCounts( rows, 'actionCounts' ),
			browserEventCounts: mergeCounts( rows, 'browserEventCounts' ),
		} ) );

	return {
		runCount: runs.length,
		byDelay,
		runs: runRows,
	};
}

function persistenceStateAtKeydownAnalysis() {
	const runsWithPersistence = input.delayRunSummaries.filter( ( summary ) =>
		Array.isArray( summary.persistenceEvents )
	);

	if ( runsWithPersistence.length === 0 ) {
		return null;
	}

	const runKeyToSummary = new Map(
		runsWithPersistence.map( ( summary ) => [
			[
				summary.round,
				summary.delayMs,
				summary.editorSetupIndex ?? '',
				summary.runStartedAtBrowserNowMs,
			].join( '\t' ),
			summary,
		] )
	);
	const rows = [];

	for ( const record of retained ) {
		const run = runKeyToSummary.get(
			[
				record.round,
				record.delayMs,
				record.editorSetupIndex ?? '',
				record.runStartedAtBrowserNowMs,
			].join( '\t' )
		);

		if ( ! run ) {
			continue;
		}

		let isPersistent = true;
		let isTyping = false;
		const keydownRelativeMs =
			record.firstKeydownTimestampMs - run.runStartedAtBrowserNowMs;
		for ( const event of run.persistenceEvents ) {
			if ( event.nowMs > record.firstKeydownTimestampMs ) {
				break;
			}
			isPersistent = event.isPersistent;
			isTyping = event.isTyping;
		}

		rows.push( {
			round: record.round,
			delayMs: record.delayMs,
			sampleIndex: record.sampleIndex,
			delaySampleIndex: record.delaySampleIndex,
			keydownRelativeMs: round( keydownRelativeMs ),
			isPersistent,
			isTyping,
			latencyMs: record.latencyMs,
			latencyAllKeydownsMs: record.latencyAllKeydownsMs,
		} );
	}

	const byDelayAndState = [
		...groupBy(
			rows,
			( row ) =>
				`${ row.delayMs }\t${
					row.isPersistent ? 'persistent' : 'transient'
				}\t${ row.isTyping ? 'typing' : 'notTyping' }`
		),
	]
		.sort( ( [ a ], [ b ] ) => {
			const [ delayA, stateA, typingA ] = a.split( '\t' );
			const [ delayB, stateB, typingB ] = b.split( '\t' );
			return (
				Number( delayA ) - Number( delayB ) ||
				stateA.localeCompare( stateB ) ||
				typingA.localeCompare( typingB )
			);
		} )
		.map( ( [ key, group ] ) => {
			const [ delayMs, persistenceState, typingState ] =
				key.split( '\t' );
			return {
				delayMs: Number( delayMs ),
				persistenceState,
				typingState,
				latencyMs: roundedStats(
					stats( group.map( ( row ) => row.latencyMs ) )
				),
				latencyAllKeydownsMs: roundedStats(
					stats( group.map( ( row ) => row.latencyAllKeydownsMs ) )
				),
			};
		} );

	const byState = [ ...groupBy( rows, ( row ) => row.isPersistent ) ]
		.sort( ( [ a ], [ b ] ) => Number( b ) - Number( a ) )
		.map( ( [ isPersistent, group ] ) => ( {
			persistenceState:
				isPersistent === true ? 'persistent' : 'transient',
			latencyMs: roundedStats(
				stats( group.map( ( row ) => row.latencyMs ) )
			),
			latencyAllKeydownsMs: roundedStats(
				stats( group.map( ( row ) => row.latencyAllKeydownsMs ) )
			),
		} ) );

	return {
		sampleCount: rows.length,
		byState,
		byDelayAndState,
		samples: rows,
	};
}

function metricAnalysis( metricName ) {
	const byDelay = [ ...groupBy( retained, ( record ) => record.delayMs ) ]
		.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
		.map( ( [ delayMs, records ] ) => {
			const metricStats = stats(
				records.map( ( record ) => record[ metricName ] )
			);
			const ci = bootstrapMedianCi(
				records.map( ( record ) => record[ metricName ] )
			);

			return {
				delayMs,
				...roundedStats( metricStats ),
				medianCiLow: round( ci.low ),
				medianCiHigh: round( ci.high ),
				slopeMsPerSample: round(
					slope(
						records.map( ( record ) => ( {
							x: record.delaySampleIndex,
							y: record[ metricName ],
						} ) )
					),
					6
				),
			};
		} );
	const delayMedian = new Map(
		byDelay.map( ( row ) => [ Number( row.delayMs ), row.p50 ] )
	);
	const residuals = retained
		.map( ( record ) => ( {
			...record,
			residual: record[ metricName ] - delayMedian.get( record.delayMs ),
		} ) )
		.sort(
			( a, b ) =>
				a.globalRetainedSampleIndex - b.globalRetainedSampleIndex
		);
	const windowSize = Number.parseInt(
		process.env.BENCHMARK_DEEP_ANALYSIS_WINDOW_SIZE || '200',
		10
	);
	const residualWindows = [];

	for ( let start = 0; start < residuals.length; start += windowSize ) {
		const windowRecords = residuals.slice( start, start + windowSize );
		const first = windowRecords[ 0 ];
		const last = windowRecords.at( -1 );
		residualWindows.push( {
			window: residualWindows.length,
			firstGlobalSample: first.globalRetainedSampleIndex,
			lastGlobalSample: last.globalRetainedSampleIndex,
			firstElapsedMs: first.elapsedMsSinceBenchmarkStart,
			lastElapsedMs: last.elapsedMsSinceBenchmarkStart,
			...roundedStats(
				stats( windowRecords.map( ( record ) => record.residual ) )
			),
		} );
	}

	const byRound = [ ...groupBy( retained, ( record ) => record.round ) ]
		.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
		.map( ( [ roundIndex, records ] ) => ( {
			round: roundIndex,
			...roundedStats(
				stats( records.map( ( record ) => record[ metricName ] ) )
			),
			residual: roundedStats(
				stats(
					records.map(
						( record ) =>
							record[ metricName ] -
							delayMedian.get( record.delayMs )
					)
				)
			),
		} ) );

	const componentStats = Object.fromEntries(
		[
			'keydownMs',
			'keydownAllMs',
			'keypressMs',
			'keyupMs',
			'latencyMs',
			'latencyAllKeydownsMs',
		]
			.filter( ( component ) =>
				retained.every( ( record ) =>
					Number.isFinite( record[ component ] )
				)
			)
			.map( ( component ) => [
				component,
				roundedStats(
					stats( retained.map( ( record ) => record[ component ] ) )
				),
			] )
	);

	return {
		overall: roundedStats(
			stats( retained.map( ( record ) => record[ metricName ] ) )
		),
		rawSlopeMsPer1000Samples: round(
			slope(
				retained.map( ( record ) => ( {
					x: record.globalRetainedSampleIndex,
					y: record[ metricName ],
				} ) )
			) * 1000,
			6
		),
		residualSlopeMsPer1000Samples: round(
			slope(
				residuals.map( ( record ) => ( {
					x: record.globalRetainedSampleIndex,
					y: record.residual,
				} ) )
			) * 1000,
			6
		),
		mostStableByCv: [ ...byDelay ]
			.sort( ( a, b ) => a.cv - b.cv )
			.slice( 0, 12 ),
		mostStableByIqrOverMedian: [ ...byDelay ]
			.sort( ( a, b ) => a.iqrOverMedian - b.iqrOverMedian )
			.slice( 0, 12 ),
		worstByCv: [ ...byDelay ]
			.sort( ( a, b ) => b.cv - a.cv )
			.slice( 0, 12 ),
		delayCurveSegments: piecewiseConstantSegments(
			byDelay.map( ( row ) => ( {
				delayMs: Number( row.delayMs ),
				y: row.p50,
			} ) )
		).map( ( segment ) => ( {
			...segment,
			medianStats: roundedStats( segment.medianStats ),
		} ) ),
		rounds: byRound,
		residualWindows,
		componentStats,
		selectedDelays: Object.fromEntries(
			[
				0, 20, 100, 130, 150, 180, 200, 330, 490, 500, 510, 520, 530,
				580, 590, 600, 900, 910, 980, 990, 1000, 1010, 1020, 1040, 1070,
				1100,
			]
				.map( ( delay ) =>
					byDelay.find( ( row ) => row.delayMs === delay )
				)
				.filter( Boolean )
				.map( ( row ) => [ row.delayMs, row ] )
		),
	};
}

const report = {
	inputPath: path.resolve( inputPath ),
	metadata: input.metadata,
	keydownEventCounts: Object.fromEntries(
		[ ...groupBy( input.records, ( record ) => record.keydownEventCount ) ]
			.sort( ( [ a ], [ b ] ) => Number( a ) - Number( b ) )
			.map( ( [ count, records ] ) => [ count, records.length ] )
	),
	runCount: input.delayRunSummaries.length,
	keyGroupMismatches: input.delayRunSummaries.filter(
		( summary ) => summary.keyGroups !== summary.expectedKeyGroups
	).length,
	persistence: persistenceAnalysis(),
	dataTrace: dataTraceAnalysis(),
	persistenceAtKeydown: persistenceStateAtKeydownAnalysis(),
	metrics: Object.fromEntries(
		metrics.map( ( metricName ) => [
			metricName,
			metricAnalysis( metricName ),
		] )
	),
};

const outputPath = `${ outputPrefix }-deep-analysis.json`;
fs.writeFileSync( outputPath, JSON.stringify( report, null, 2 ) );

console.log( `Input: ${ inputPath }` );
console.log( `Wrote: ${ outputPath }` );
for ( const metricName of metrics ) {
	const metric = report.metrics[ metricName ];
	console.log(
		`${ metricName }: p50=${ metric.overall.p50 }ms, residual slope=${ metric.residualSlopeMsPer1000Samples }ms/1000 samples`
	);
	console.log(
		`  stable by CV: ${ metric.mostStableByCv
			.slice( 0, 5 )
			.map( ( row ) => `${ row.delayMs }ms(cv=${ row.cv })` )
			.join( ', ' ) }`
	);
	console.log(
		`  segments: ${ metric.delayCurveSegments
			.map(
				( segment ) =>
					`${ segment.startDelayMs }-${ segment.endDelayMs }ms(p50~${ segment.medianStats.p50 })`
			)
			.join( ', ' ) }`
	);
}

/* eslint-enable no-bitwise, no-console */
