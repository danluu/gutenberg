#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify( execFile );

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const DEFAULT_SOURCE_REPO = REPO_ROOT;
const DEFAULT_OUTPUT_DIR = path.join(
	REPO_ROOT,
	'artifacts/rtc-browser-fuzz',
	`distinct-bug-manifest-${ createTimestamp() }`
);
const SPEC_PATH_PATTERN =
	/(?:^|\s|["'])(?:(?:test\/e2e\/)?specs\/editor\/collaboration\/[^\s"']+\.spec\.(?:ts|js)|test\/e2e\/specs\/editor\/collaboration\/[^\s"']+\.spec\.(?:ts|js))/g;
const SINGLE_SPEC_IMPORT_PATTERN =
	/^import\s+['"]([^'"]+\.spec(?:\.(?:ts|js))?)['"];\s*$/s;
const PLAYWRIGHT_SPEC_PATTERN = /\.spec\.(?:ts|js)$/;

function createTimestamp() {
	return new Date()
		.toISOString()
		.replaceAll( '-', '' )
		.replaceAll( ':', '' )
		.replace( /\.\d+Z$/, 'Z' )
		.replace( 'T', 'T' );
}

function parseArgs() {
	const options = {
		sourceRepo: DEFAULT_SOURCE_REPO,
		targetRepo: REPO_ROOT,
		statusRoot: null,
		outputDir: DEFAULT_OUTPUT_DIR,
		materializeSpecs: false,
	};

	for ( let index = 2; index < process.argv.length; index++ ) {
		const arg = process.argv[ index ];
		const nextValue = () => {
			const value = process.argv[ ++index ];
			if ( ! value ) {
				throw new Error( `Missing value for ${ arg }.` );
			}
			return value;
		};

		if ( arg === '--source-repo' ) {
			options.sourceRepo = path.resolve( nextValue() );
		} else if ( arg === '--target-repo' ) {
			options.targetRepo = path.resolve( nextValue() );
		} else if ( arg === '--status-root' ) {
			options.statusRoot = nextValue();
		} else if ( arg === '--output-dir' ) {
			options.outputDir = path.resolve( nextValue() );
		} else if ( arg === '--materialize-specs' ) {
			options.materializeSpecs = true;
		} else if ( arg === '--help' || arg === '-h' ) {
			printUsage();
			process.exit( 0 );
		} else {
			throw new Error( `Unknown argument: ${ arg }.` );
		}
	}

	options.statusRoot = path.resolve(
		options.sourceRepo,
		options.statusRoot ?? 'artifacts/rtc-browser-fuzz'
	);

	return options;
}

function printUsage() {
	process.stdout.write( `Usage:
  node bin/rtc-browser-fuzz-distinct-manifest.mjs \\
    --source-repo /path/to/source-worktree-with-artifacts \\
    --target-repo /path/to/refreshed-base-worktree \\
    --status-root artifacts/rtc-browser-fuzz \\
    --output-dir fuzz-handoff/distinct-manifest-YYYYMMDD \\
    --materialize-specs

The script groups Classification: real STATUS.md files by Distinct bug type,
selects one canonical repro per group, writes JSON/Markdown manifests, and
optionally materializes the selected specs into the target repo.
` );
}

async function findStatusFiles( statusRoot ) {
	const { stdout } = await execFileAsync(
		'find',
		[ statusRoot, '-name', 'STATUS.md' ],
		{
			maxBuffer: 128 * 1024 * 1024,
		}
	);

	return stdout
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
}

function readField( text, fieldName ) {
	const escapedField = fieldName.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const match = text.match( new RegExp( `^${ escapedField }:\\s*(.+)$`, 'm' ) );
	return match?.[ 1 ]?.trim() ?? '';
}

function extractSummary( text ) {
	const match = text.match( /## Summary\s+([\s\S]*?)(?:\n## |\s*$)/ );
	if ( ! match ) {
		return '';
	}

	return match[ 1 ]
		.trim()
		.replaceAll( /\s+/g, ' ' )
		.slice( 0, 800 );
}

function extractSignature( statusPath ) {
	const parts = statusPath.split( path.sep );
	const signaturesIndex = parts.lastIndexOf( 'signatures' );
	if ( signaturesIndex >= 0 && parts[ signaturesIndex + 1 ] ) {
		return parts[ signaturesIndex + 1 ];
	}

	return path.basename( path.dirname( statusPath ) );
}

function extractSpecRelativeFromCommand( command ) {
	const matches = [ ...command.matchAll( SPEC_PATH_PATTERN ) ];
	if ( matches.length === 0 ) {
		return '';
	}

	const rawValue = matches[ matches.length - 1 ][ 0 ]
		.trim()
		.replace( /^["']|["']$/g, '' );

	return rawValue.replace( /^test\/e2e\//, '' );
}

function inferSpecSource( {
	command,
	playwrightPath,
	sourceRepo,
} ) {
	const specRelative = extractSpecRelativeFromCommand( command );
	const sourceTestRoot = path.join( sourceRepo, 'test/e2e' );

	if ( specRelative ) {
		const sourceSpecPath = path.join( sourceTestRoot, specRelative );
		return {
			specRelative,
			sourceSpecPath,
		};
	}

	if ( playwrightPath ) {
		const normalizedPath = playwrightPath.trim();
		if ( ! PLAYWRIGHT_SPEC_PATTERN.test( normalizedPath ) ) {
			return {
				specRelative: '',
				sourceSpecPath: '',
			};
		}

		const marker = `${ path.sep }test${ path.sep }e2e${ path.sep }`;
		const markerIndex = normalizedPath.indexOf( marker );
		if ( markerIndex >= 0 ) {
			const specRelativeFromPath = normalizedPath.slice(
				markerIndex + marker.length
			);
			return {
				specRelative: specRelativeFromPath,
				sourceSpecPath: path.join( sourceTestRoot, specRelativeFromPath ),
			};
		}

		return {
			specRelative: '',
			sourceSpecPath: normalizedPath,
		};
	}

	return {
		specRelative: '',
		sourceSpecPath: '',
	};
}

function inferTransport( record ) {
	const haystack = [
		record.bugType,
		record.statusPath,
		record.playwrightCommand,
		record.playwrightPath,
		record.specRelative,
	]
		.join( '\n' )
		.toLowerCase();

	if (
		haystack.includes( 'websocket' ) ||
		haystack.includes( '_ws_' ) ||
		haystack.includes( 'rtc-ws' ) ||
		haystack.includes( 'rtc_ws' ) ||
		haystack.includes( 'gutenberg_rtc_test_ws' ) ||
		haystack.includes( 'playwright.rtc-websocket.config' )
	) {
		return 'websocket';
	}

	return 'http';
}

function confidenceScore( confidence ) {
	if ( confidence === 'high' ) {
		return 12;
	}
	if ( confidence === 'medium' ) {
		return 6;
	}
	if ( confidence === 'low' ) {
		return 1;
	}

	return 0;
}

function recencyScore( completedAt ) {
	const timestamp = Date.parse( completedAt );
	if ( Number.isNaN( timestamp ) ) {
		return 0;
	}

	return Math.min( 8, Math.max( 0, ( timestamp - Date.UTC( 2026, 4, 1 ) ) / 86400000 ) );
}

function scoreRecord( record ) {
	const combinedPath = [
		record.playwrightPath,
		record.specRelative,
		record.sourceSpecPath,
	].join( '\n' );
	const combinedLower = combinedPath.toLowerCase();
	let score = 0;

	if ( record.sourceSpecExists ) {
		score += 100;
	}
	if ( record.playwrightStatus === 'produced' ) {
		score += 30;
	}
	if ( combinedLower.includes( 'realistic' ) ) {
		score += 24;
	}
	if ( combinedLower.includes( 'shared' ) ) {
		score += 4;
	}
	if ( record.recommendedAction === 'file_bug' ) {
		score += 8;
	}

	score += confidenceScore( record.confidence );
	score += recencyScore( record.completedAt );

	if (
		combinedLower.includes( 'internal' ) ||
		combinedLower.includes( 'programmatic' ) ||
		combinedLower.includes( 'synthetic' ) ||
		combinedLower.includes( 'helper-timeout' )
	) {
		score -= 18;
	}

	if ( record.status !== 'completed' && record.status !== 'no-realistic-repro' ) {
		score -= 10;
	}

	return score;
}

async function pathExists( filePath ) {
	if ( ! filePath ) {
		return false;
	}

	try {
		await fs.access( filePath );
		return true;
	} catch {
		return false;
	}
}

async function resolveSpecPath( specPath ) {
	if ( await pathExists( specPath ) ) {
		return specPath;
	}

	if ( specPath.endsWith( '.spec' ) ) {
		for ( const extension of [ '.ts', '.js' ] ) {
			const candidatePath = `${ specPath }${ extension }`;
			if ( await pathExists( candidatePath ) ) {
				return candidatePath;
			}
		}
	}

	return '';
}

function slugify( value ) {
	return value
		.toLowerCase()
		.replaceAll( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' )
		.slice( 0, 80 );
}

async function normalizeSpecContent( {
	sourceSpecPath,
	sourceRepo,
	targetRepo,
	targetSpecPath,
} ) {
	const content = await loadDereferencedSpecContent( sourceSpecPath );
	return normalizeCollaborationFixtureImports(
		content.replaceAll( sourceRepo, targetRepo ),
		targetSpecPath,
		targetRepo
	);
}

async function loadDereferencedSpecContent( sourceSpecPath ) {
	let currentSpecPath = sourceSpecPath;

	for ( let depth = 0; depth < 8; depth++ ) {
		const content = await fs.readFile( currentSpecPath, 'utf8' );
		const importMatch = content.trim().match( SINGLE_SPEC_IMPORT_PATTERN );

		if ( ! importMatch ) {
			return content;
		}

		const importedPath = path.isAbsolute( importMatch[ 1 ] )
			? importMatch[ 1 ]
			: path.resolve( path.dirname( currentSpecPath ), importMatch[ 1 ] );
		const resolvedImportedPath = await resolveSpecPath( importedPath );

		if ( ! resolvedImportedPath || resolvedImportedPath === currentSpecPath ) {
			return content;
		}

		currentSpecPath = resolvedImportedPath;
	}

	return fs.readFile( currentSpecPath, 'utf8' );
}

function normalizeCollaborationFixtureImports( content, targetSpecPath, targetRepo ) {
	const fixtureImportPattern =
		/(from\s+['"])([^'"]*test\/e2e\/specs\/editor\/collaboration\/fixtures\/([^'"]+?))(?:\.ts)?(['"])/g;

	return content.replace(
		fixtureImportPattern,
		( _match, prefix, _importPath, fixtureName, suffix ) => {
			const targetFixturePath = path.join(
				targetRepo,
				'test/e2e/specs/editor/collaboration/fixtures',
				fixtureName.replace( /\.ts$/, '' )
			);
			let relativeImportPath = path.relative(
				path.dirname( targetSpecPath ),
				targetFixturePath
			);
			relativeImportPath = relativeImportPath.replaceAll( path.sep, '/' );
			if ( ! relativeImportPath.startsWith( '.' ) ) {
				relativeImportPath = `./${ relativeImportPath }`;
			}

			return `${ prefix }${ relativeImportPath }${ suffix }`;
		}
	);
}

async function materializeSpec( {
	record,
	outputDir,
	sourceRepo,
	targetRepo,
} ) {
	if (
		! record.sourceSpecExists ||
		! PLAYWRIGHT_SPEC_PATTERN.test( record.sourceSpecPath )
	) {
		return null;
	}

	const extension = path.extname( record.sourceSpecPath );
	const fallbackRelative = path.join(
		'specs/editor/collaboration/manifest',
		`${ record.signature }-${ slugify( record.bugType ) }.spec${ extension }`
	);
	const specRelative = record.specRelative || fallbackRelative;
	const targetSpecPath = path.join( targetRepo, 'test/e2e', specRelative );
	const content = await normalizeSpecContent( {
		sourceSpecPath: record.sourceSpecPath,
		sourceRepo,
		targetRepo,
		targetSpecPath,
	} );

	await fs.mkdir( path.dirname( targetSpecPath ), { recursive: true } );
	await fs.writeFile( targetSpecPath, content );

	return {
		materializedSpecPath: targetSpecPath,
		materializedSpecRelative: specRelative,
		manifestRunPath: `test/e2e/${ specRelative }`,
		outputDir,
	};
}

async function parseStatusFile( statusPath, options ) {
	const text = await fs.readFile( statusPath, 'utf8' );
	const classification = readField( text, 'Classification' );

	if ( classification !== 'real' ) {
		return null;
	}

	const playwrightCommand = readField( text, 'Playwright command' );
	const playwrightPath = readField( text, 'Playwright path' );
	const { specRelative, sourceSpecPath } = inferSpecSource( {
		command: playwrightCommand,
		playwrightPath,
		sourceRepo: options.sourceRepo,
	} );
	const record = {
		statusPath,
		statusPathRelative: path.relative( options.sourceRepo, statusPath ),
		signature: extractSignature( statusPath ),
		status: readField( text, 'Status' ),
		attempts: readField( text, 'Attempts' ),
		completedAt: readField( text, 'Completed' ),
		classification,
		confidence: readField( text, 'Confidence' ),
		bugType: readField( text, 'Distinct bug type' ) || '(missing)',
		recommendedAction: readField( text, 'Recommended action' ),
		playwrightStatus: readField( text, 'Playwright status' ),
		playwrightPath,
		playwrightCommand,
		specRelative,
		sourceSpecPath,
		sourceSpecExists: await pathExists( sourceSpecPath ),
		summary: extractSummary( text ),
	};

	record.transport = inferTransport( record );
	record.score = scoreRecord( record );

	return record;
}

function chooseCanonical( records ) {
	return [ ...records ].sort( ( left, right ) => {
		if ( right.score !== left.score ) {
			return right.score - left.score;
		}

		return (
			Date.parse( right.completedAt || '' ) -
			Date.parse( left.completedAt || '' )
		);
	} )[ 0 ];
}

function createMarkdown( manifest ) {
	const lines = [
		'# RTC distinct real-bug manifest',
		'',
		`Generated: ${ manifest.generatedAt }`,
		`Source repo: \`${ manifest.sourceRepo }\``,
		`Status root: \`${ manifest.statusRoot }\``,
		`Target repo: \`${ manifest.targetRepo }\``,
		'',
		'## Summary',
		'',
		`- STATUS files scanned: ${ manifest.summary.statusFilesScanned }`,
		`- Classification: real files: ${ manifest.summary.realStatusFiles }`,
		`- Distinct bug types: ${ manifest.summary.distinctBugTypes }`,
		`- Runnable canonical repros materialized: ${ manifest.summary.runnableCanonicalRepros }`,
		`- HTTP runnable repros: ${ manifest.summary.runnableHttpRepros }`,
		`- WebSocket runnable repros: ${ manifest.summary.runnableWebsocketRepros }`,
		`- Groups without an existing canonical spec: ${ manifest.summary.groupsWithoutExistingSpec }`,
		'',
		'## Runnable Canonical Repros',
		'',
		'| Transport | Bug type | Signature | Confidence | Spec |',
		'| --- | --- | --- | --- | --- |',
	];

	for ( const group of manifest.groups.filter(
		( item ) => item.canonical.materializedSpecRelative
	) ) {
		lines.push(
			`| ${ group.transport } | \`${ group.bugType }\` | \`${ group.canonical.signature }\` | ${ group.canonical.confidence || '' } | \`${ group.canonical.manifestRunPath }\` |`
		);
	}

	lines.push(
		'',
		'## Non-Runnable Canonical Entries',
		'',
		'These groups had Classification: real STATUS files but no existing canonical spec path on the source machine.',
		'',
		'| Bug type | Signatures | Best status | Reason |',
		'| --- | ---: | --- | --- |'
	);

	for ( const group of manifest.groups.filter(
		( item ) => ! item.canonical.materializedSpecRelative
	) ) {
		lines.push(
			`| \`${ group.bugType }\` | ${ group.signatures.length } | \`${ group.canonical.statusPathRelative }\` | no existing spec path |`
		);
	}

	return `${ lines.join( '\n' ) }\n`;
}

async function writeLineList( filePath, lines ) {
	await fs.writeFile( filePath, `${ lines.join( '\n' ) }\n` );
}

async function main() {
	const options = parseArgs();
	const statusFiles = await findStatusFiles( options.statusRoot );
	const records = [];

	for ( const statusPath of statusFiles ) {
		const record = await parseStatusFile( statusPath, options );
		if ( record ) {
			records.push( record );
		}
	}

	const groupsByType = new Map();
	for ( const record of records ) {
		if ( ! groupsByType.has( record.bugType ) ) {
			groupsByType.set( record.bugType, [] );
		}
		groupsByType.get( record.bugType ).push( record );
	}

	const groups = [];
	await fs.mkdir( options.outputDir, { recursive: true } );

	for ( const [ bugType, groupRecords ] of groupsByType ) {
		const canonical = chooseCanonical( groupRecords );
		const materialized = options.materializeSpecs
			? await materializeSpec( {
					record: canonical,
					outputDir: options.outputDir,
					sourceRepo: options.sourceRepo,
					targetRepo: options.targetRepo,
			  } )
			: null;

		const canonicalRecord = {
			...canonical,
			...( materialized ?? {} ),
		};

		groups.push( {
			bugType,
			transport: canonical.transport,
			signatures: [ ...new Set( groupRecords.map( ( item ) => item.signature ) ) ].sort(),
			statusCount: groupRecords.length,
			runnableCount: groupRecords.filter( ( item ) => item.sourceSpecExists )
				.length,
			canonical: canonicalRecord,
		} );
	}

	groups.sort( ( left, right ) => {
		const leftRunnable = left.canonical.materializedSpecRelative ? 1 : 0;
		const rightRunnable = right.canonical.materializedSpecRelative ? 1 : 0;
		if ( rightRunnable !== leftRunnable ) {
			return rightRunnable - leftRunnable;
		}

		if ( right.statusCount !== left.statusCount ) {
			return right.statusCount - left.statusCount;
		}

		return left.bugType.localeCompare( right.bugType );
	} );

	const runnableGroups = groups.filter(
		( group ) => group.canonical.materializedSpecRelative
	);
	const manifest = {
		generatedAt: new Date().toISOString(),
		sourceRepo: options.sourceRepo,
		targetRepo: options.targetRepo,
		statusRoot: options.statusRoot,
		outputDir: options.outputDir,
		materializedSpecs: options.materializeSpecs,
		summary: {
			statusFilesScanned: statusFiles.length,
			realStatusFiles: records.length,
			distinctBugTypes: groups.length,
			runnableCanonicalRepros: runnableGroups.length,
			runnableHttpRepros: runnableGroups.filter(
				( group ) => group.transport === 'http'
			).length,
			runnableWebsocketRepros: runnableGroups.filter(
				( group ) => group.transport === 'websocket'
			).length,
			groupsWithoutExistingSpec: groups.length - runnableGroups.length,
		},
		groups,
	};

	const manifestPath = path.join( options.outputDir, 'distinct-bug-manifest.json' );
	const markdownPath = path.join( options.outputDir, 'distinct-bug-manifest.md' );
	await fs.writeFile( manifestPath, JSON.stringify( manifest, null, 2 ) + '\n' );
	await fs.writeFile( markdownPath, createMarkdown( manifest ) );
	await writeLineList(
		path.join( options.outputDir, 'runnable-http.txt' ),
		runnableGroups
			.filter( ( group ) => group.transport === 'http' )
			.map( ( group ) => group.canonical.manifestRunPath )
	);
	await writeLineList(
		path.join( options.outputDir, 'runnable-websocket.txt' ),
		runnableGroups
			.filter( ( group ) => group.transport === 'websocket' )
			.map( ( group ) => group.canonical.manifestRunPath )
	);
	await writeLineList(
		path.join( options.outputDir, 'unrunnable-bug-types.txt' ),
		groups
			.filter( ( group ) => ! group.canonical.materializedSpecRelative )
			.map( ( group ) => group.bugType )
	);

	process.stdout.write(
		JSON.stringify(
			{
				manifestPath,
				markdownPath,
				...manifest.summary,
			},
			null,
			2
		) + '\n'
	);
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
