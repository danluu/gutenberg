#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const args = process.argv.slice( 2 );
const DRY_RUN = args.includes( '--dry-run' );
const FORCE = args.includes( '--force' );
const positionalArgs = args.filter( ( arg ) => ! arg.startsWith( '--' ) );
const RUN_ROOT = path.resolve( positionalArgs[ 0 ] ?? '' );

if ( ! RUN_ROOT ) {
	throw new Error(
		'Usage: node bin/rtc-fuzz-backfill-user-hit-likelihood.mjs <run-root> [--dry-run] [--force]'
	);
}

const SKIP_DIR_NAMES = new Set( [
	'.git',
	'node_modules',
	'test-results',
	'blob-report',
	'artifacts',
	'primary',
	'analysis-1-isolated-recheck',
	'analysis-2-deeper-recheck',
] );

const watcherDirs = await findTriageWatcherDirs( RUN_ROOT );
const resultEntries = [];
const resultByPath = new Map();
let updatedResults = 0;
let updatedStatuses = 0;
let updatedStates = 0;

for ( const watcherDir of watcherDirs ) {
	for ( const entry of await findResultEntries( watcherDir ) ) {
		const result = await readJson( entry.resultPath, null );
		if ( ! result ) {
			continue;
		}

		const likelihood = inferUserHitLikelihood( result );
		const shouldUpdate =
			FORCE ||
			! Number.isInteger( result.userHitLikelihoodScore ) ||
			typeof result.userHitLikelihoodRationale !== 'string';

		if ( shouldUpdate ) {
			result.userHitLikelihoodScore = likelihood.score;
			result.userHitLikelihoodRationale = likelihood.rationale;
			if ( ! DRY_RUN ) {
				await writeJson( entry.resultPath, result );
			}
			updatedResults += 1;
		}

		entry.result = result;
		entry.likelihood = {
			score: normalizeScore( result.userHitLikelihoodScore ),
			rationale:
				result.userHitLikelihoodRationale || likelihood.rationale,
		};
		entry.likelyReal = isLikelyRealResult( result );
		resultEntries.push( entry );
		resultByPath.set( path.resolve( entry.resultPath ), entry );
	}
}

for ( const entry of resultEntries ) {
	for ( const statusTarget of getStatusTargetsForResult( entry ) ) {
		if (
			await updateStatusFile(
				statusTarget.statusPath,
				entry.likelihood,
				statusTarget.expectedAnalysisResultPath
			)
		) {
			updatedStatuses += 1;
		}
	}
}

for ( const watcherDir of watcherDirs ) {
	if ( await updateWatcherState( watcherDir, resultByPath ) ) {
		updatedStates += 1;
	}
}

const distinctLikelyReal = summarizeDistinctLikelyReal( resultEntries );
const manifest = {
	schemaVersion: 1,
	createdAt: new Date().toISOString(),
	runRoot: RUN_ROOT,
	dryRun: DRY_RUN,
	force: FORCE,
	watcherCount: watcherDirs.length,
	resultCount: resultEntries.length,
	updatedResults,
	updatedStatuses,
	updatedStates,
	likelyRealResultCount: resultEntries.filter( ( entry ) => entry.likelyReal )
		.length,
	distinctLikelyRealCount: distinctLikelyReal.length,
	distinctLikelyReal,
};

const manifestPath = path.join(
	RUN_ROOT,
	'user-hit-likelihood-backfill.json'
);
if ( ! DRY_RUN ) {
	await writeJson( manifestPath, manifest );
}

process.stdout.write( JSON.stringify( { ...manifest, manifestPath }, null, 2 ) );
process.stdout.write( '\n' );

async function findTriageWatcherDirs( root ) {
	const found = [];

	async function visit( dir, depth ) {
		if ( path.basename( dir ) === '.triage-watcher' ) {
			found.push( dir );
			return;
		}

		if ( depth > 7 ) {
			return;
		}

		let entries;
		try {
			entries = await fs.readdir( dir, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			if ( ! entry.isDirectory() ) {
				continue;
			}

			if ( shouldSkipDirectory( entry.name ) ) {
				continue;
			}

			await visit( path.join( dir, entry.name ), depth + 1 );
		}
	}

	await visit( root, 0 );
	return found.sort();
}

function shouldSkipDirectory( name ) {
	return (
		SKIP_DIR_NAMES.has( name ) ||
		name.startsWith( 'lane-' ) ||
		name.startsWith( 'seed-' ) ||
		name.endsWith( '.zip' )
	);
}

async function findResultEntries( watcherDir ) {
	const tiers = [
		{ tier: 'browser-triage', dir: path.join( watcherDir, 'signatures' ) },
		{
			tier: 'analysis-tier',
			dir: path.join( watcherDir, 'analysis-tier', 'signatures' ),
		},
		{
			tier: 'deep-analysis-tier',
			dir: path.join( watcherDir, 'deep-analysis-tier', 'signatures' ),
		},
	];
	const entries = [];

	for ( const tier of tiers ) {
		let signatureDirs;
		try {
			signatureDirs = await fs.readdir( tier.dir, {
				withFileTypes: true,
			} );
		} catch {
			continue;
		}

		for ( const signatureDir of signatureDirs ) {
			if ( ! signatureDir.isDirectory() ) {
				continue;
			}

			const resultPath = path.join(
				tier.dir,
				signatureDir.name,
				'result.json'
			);
			if ( ! fsSync.existsSync( resultPath ) ) {
				continue;
			}

			entries.push( {
				hash: signatureDir.name,
				tier: tier.tier,
				watcherDir,
				resultPath,
			} );
		}
	}

	return entries;
}

function inferUserHitLikelihood( result ) {
	if ( ! isLikelyRealResult( result ) ) {
		return {
			score: 0,
			rationale: `Classified as ${
				result.classification ?? result.candidateStatus ?? 'unknown'
			}; not considered a likely real user-facing bug.`,
		};
	}

	const text = flattenStrings( result ).join( '\n' ).toLowerCase();
	let score = 2;
	const reasons = [];

	if (
		hasAny( text, [
			'common',
			'default workflow',
			'widespread',
			'frequent',
			'commonly encountered',
		] )
	) {
		score = Math.max( score, 5 );
		reasons.push( 'existing analysis describes a common/default workflow' );
	}

	if (
		hasAny( text, [
			'data loss',
			'lost content',
			'content lost',
			'corruption',
			'corrupt',
			'overwrite',
			'blank post',
			'dropped',
			'missing block',
		] )
	) {
		score = Math.max( score, 4 );
		reasons.push( 'content loss/corruption is user-visible' );
	}

	if (
		hasAny( text, [
			'save',
			'persist',
			'persistence',
			'reload',
			'reconnect',
			'title',
			'paragraph',
			'typing',
			'edit paragraph',
			'insert paragraph',
		] )
	) {
		score = Math.max( score, 3 );
		reasons.push( 'trigger uses normal editing/save/reload behavior' );
	}

	if (
		hasAny( text, [
			'two user',
			'two-user',
			'2 users',
			'collaborative editing',
			'normal collaboration',
		] )
	) {
		score = Math.max( score, 3 );
		reasons.push( 'normal two-user collaboration can hit it' );
	}

	if (
		hasAny( text, [
			'third user',
			'3 users',
			'three-user',
			'late join',
			'late-join',
			'multi-user',
		] )
	) {
		score = Math.max( score, 2 );
		reasons.push( 'requires a less common multi-user or late-join path' );
	}

	if (
		hasAny( text, [
			'revision',
			'restore revision',
			'revision restore',
			'version history',
		] )
	) {
		score = Math.min( Math.max( score, 2 ), 3 );
		reasons.push( 'revision restore is real but less common than basic editing' );
	}

	if (
		hasAny( text, [
			'table',
			'quote',
			'list',
			'nested',
			'freeform',
			'deprecated block',
			'html entity',
			'parser',
			'serialization',
		] )
	) {
		score = Math.min( Math.max( score, 2 ), 3 );
		reasons.push( 'specific block/parser content narrows exposure' );
	}

	if (
		hasAny( text, [
			'fault injection',
			'artificial fault',
			'route blocking',
			'test-only',
			'429',
			'500',
			'503',
			'delaynext',
		] )
	) {
		score = Math.min( score, 2 );
		reasons.push( 'trigger appears to depend on injected or transient fault timing' );
	}

	if (
		hasAny( text, [
			'harness',
			'infra',
			'playwright timeout',
			'bootstrap timeout',
			'mutual discovery',
		] ) &&
		result.classification !== 'likely_real' &&
		result.classification !== 'real' &&
		! hasAny( text, [ 'real user action', 'normal user action' ] )
	) {
		score = Math.min( score, 1 );
		reasons.push( 'analysis still contains harness/infra caveats' );
	}

	return {
		score: normalizeScore( score ),
		rationale:
			reasons.length > 0
				? [ ...new Set( reasons ) ].join( '; ' )
				: 'Likely real, but existing artifacts do not identify a broad normal-user trigger.',
	};
}

function isLikelyRealResult( result ) {
	return (
		result?.classification === 'real' ||
		result?.classification === 'likely_real' ||
		result?.candidateStatus === 'confirmed_likely_real' ||
		result?.candidateStatus === 'needs_realistic_repro_search'
	);
}

function flattenStrings( value ) {
	const strings = [];

	function visit( current ) {
		if ( typeof current === 'string' ) {
			strings.push( current );
			return;
		}

		if ( Array.isArray( current ) ) {
			for ( const item of current ) {
				visit( item );
			}
			return;
		}

		if ( current && typeof current === 'object' ) {
			for ( const item of Object.values( current ) ) {
				visit( item );
			}
		}
	}

	visit( value );
	return strings;
}

function hasAny( text, needles ) {
	return needles.some( ( needle ) => text.includes( needle ) );
}

function normalizeScore( value ) {
	const parsed =
		typeof value === 'number' ? value : Number.parseInt( value, 10 );
	if ( ! Number.isInteger( parsed ) ) {
		return 0;
	}

	return Math.max( 0, Math.min( 5, parsed ) );
}

async function readJson( filePath, fallback ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch ( error ) {
		if ( error.code === 'ENOENT' ) {
			return fallback;
		}

		throw error;
	}
}

async function writeJson( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${
		process.pid
	}-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 ) }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

function getStatusTargetsForResult( entry ) {
	const targets = [];
	const ownStatusPath = path.join( path.dirname( entry.resultPath ), 'STATUS.md' );
	if ( fsSync.existsSync( ownStatusPath ) ) {
		targets.push( { statusPath: ownStatusPath } );
	}

	const visibleStatusPath = path.join(
		entry.watcherDir,
		'signatures',
		entry.hash,
		'STATUS.md'
	);
	if ( ! fsSync.existsSync( visibleStatusPath ) ) {
		return targets;
	}

	if ( entry.tier === 'browser-triage' ) {
		targets.push( { statusPath: visibleStatusPath } );
	} else {
		targets.push( {
			statusPath: visibleStatusPath,
			expectedAnalysisResultPath: entry.resultPath,
		} );
	}

	return targets;
}

async function updateStatusFile(
	statusPath,
	likelihood,
	expectedAnalysisResultPath
) {
	let text;
	try {
		text = await fs.readFile( statusPath, 'utf8' );
	} catch {
		return false;
	}

	if (
		expectedAnalysisResultPath &&
		! text.includes( `Analysis result: ${ expectedAnalysisResultPath }` )
	) {
		return false;
	}

	const nextText = upsertLikelihoodLines( text, likelihood );
	if ( nextText === text ) {
		return false;
	}

	if ( ! DRY_RUN ) {
		await fs.writeFile( statusPath, nextText );
	}
	return true;
}

function upsertLikelihoodLines( text, likelihood ) {
	const lines = text
		.split( '\n' )
		.filter(
			( line ) =>
				! line.startsWith( 'User hit likelihood:' ) &&
				! line.startsWith( 'User hit likelihood rationale:' )
		);
	const insertAfter = findLikelihoodInsertIndex( lines );
	const likelihoodLines = [
		`User hit likelihood: ${ likelihood.score }/5`,
		`User hit likelihood rationale: ${ likelihood.rationale }`,
	];

	lines.splice( insertAfter + 1, 0, ...likelihoodLines );
	return lines.join( '\n' ).replace( /\n*$/, '\n' );
}

function findLikelihoodInsertIndex( lines ) {
	for ( const prefix of [ 'Confidence:', 'Analysis confidence:' ] ) {
		const index = lines.findIndex( ( line ) => line.startsWith( prefix ) );
		if ( index !== -1 ) {
			return index;
		}
	}

	const distinctIndex = lines.findIndex( ( line ) =>
		line.startsWith( 'Distinct bug type:' )
	);
	return distinctIndex === -1 ? Math.min( lines.length - 1, 4 ) : distinctIndex;
}

async function updateWatcherState( watcherDir, resultByPath ) {
	const statePath = path.join( watcherDir, 'state.json' );
	const state = await readJson( statePath, null );
	if ( ! state?.signatures ) {
		return false;
	}

	let changed = false;
	for ( const signature of Object.values( state.signatures ) ) {
		if ( signature.resultPath && signature.result ) {
			const entry = resultByPath.get( path.resolve( signature.resultPath ) );
			if ( entry ) {
				changed =
					applyLikelihoodToObject( signature.result, entry.likelihood ) ||
					changed;
			}
		}

		if ( signature.analysisGate?.resultPath ) {
			const entry = resultByPath.get(
				path.resolve( signature.analysisGate.resultPath )
			);
			if ( entry ) {
				changed =
					applyLikelihoodToObject(
						signature.analysisGate,
						entry.likelihood
					) || changed;
			}
		}
	}

	if ( changed && ! DRY_RUN ) {
		state.updatedAt = new Date().toISOString();
		await writeJson( statePath, state );
	}

	return changed;
}

function applyLikelihoodToObject( target, likelihood ) {
	const changed =
		FORCE ||
		target.userHitLikelihoodScore !== likelihood.score ||
		target.userHitLikelihoodRationale !== likelihood.rationale;
	if ( changed ) {
		target.userHitLikelihoodScore = likelihood.score;
		target.userHitLikelihoodRationale = likelihood.rationale;
	}
	return changed;
}

function summarizeDistinctLikelyReal( entries ) {
	const byType = new Map();

	for ( const entry of entries ) {
		if ( ! entry.likelyReal ) {
			continue;
		}

		const duplicateOf =
			entry.result.isDuplicateOf ?? entry.result.duplicateOf ?? null;
		const groupKey = duplicateOf
			? `duplicate-of:${ duplicateOf }`
			: `type:${ entry.result.distinctBugType || entry.hash }`;
		const distinctBugType = entry.result.distinctBugType || entry.hash;
		const existing = byType.get( groupKey );
		const candidate = {
			groupKey,
			distinctBugType,
			userHitLikelihoodScore: entry.likelihood.score,
			userHitLikelihoodRationale: entry.likelihood.rationale,
			hash: entry.hash,
			tier: entry.tier,
			classification: entry.result.classification,
			candidateStatus: entry.result.candidateStatus ?? null,
			duplicateOf,
			resultPath: entry.resultPath,
			summary: entry.result.summary ?? '',
		};

		if (
			! existing ||
			candidate.userHitLikelihoodScore >
				existing.userHitLikelihoodScore ||
			( candidate.userHitLikelihoodScore ===
				existing.userHitLikelihoodScore &&
				tierRank( candidate.tier ) < tierRank( existing.tier ) )
		) {
			byType.set( groupKey, candidate );
		}
	}

	return [ ...byType.values() ].sort( ( left, right ) => {
		if (
			left.userHitLikelihoodScore !== right.userHitLikelihoodScore
		) {
			return (
				right.userHitLikelihoodScore - left.userHitLikelihoodScore
			);
		}

		return left.groupKey.localeCompare( right.groupKey );
	} );
}

function tierRank( tier ) {
	return (
		{
			'deep-analysis-tier': 0,
			'browser-triage': 1,
			'analysis-tier': 2,
		}[ tier ] ?? 3
	);
}
