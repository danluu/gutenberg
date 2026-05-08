#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';

const args = process.argv.slice( 2 );
const APPLY = args.includes( '--apply' );
const JSON_OUTPUT = args.includes( '--json' );
const PRUNE_VOLUMES = args.includes( '--prune-volumes' );
const PRUNE_DIRECTORIES = args.includes( '--prune-directories' );
const MIN_AGE_HOURS = getNumberOption( 'min-age-hours', 24 );
const WP_ENV_HOME =
	process.env.RTC_FUZZ_WP_ENV_HOME ?? path.join( os.homedir(), '.wp-env' );
const MIN_AGE_MS = MIN_AGE_HOURS * 60 * 60 * 1000;

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-fuzz-cleanup-stale-wp-env.mjs [--apply] [--json] [--min-age-hours=24]',
			'',
			'Safely cleans stale Docker resources created by wp-env.',
			'By default this is a dry run. With --apply it removes only:',
			'- stopped Docker Compose containers whose compose working_dir is under ~/.wp-env',
			'- unused Docker Compose networks whose compose project is a wp-env project',
			'With --apply --prune-volumes it also removes only unused wp-env Docker volumes',
			'from inactive compose projects older than the age threshold.',
			'With --apply --prune-directories it also removes orphaned ~/.wp-env',
			'directories older than the age threshold that have no Docker resources attached.',
			'',
			'It never stops or removes running containers. It never removes active-project volumes.',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
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

function runCommand( command, commandArgs ) {
	return new Promise( ( resolve ) => {
		execFile(
			command,
			commandArgs,
			{ encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
			( error, stdout, stderr ) => {
				resolve( {
					ok: ! error,
					code: error?.code ?? 0,
					stdout,
					stderr,
					error: error?.message ?? null,
				} );
			}
		);
	} );
}

function ageMs( createdAt ) {
	const created = Date.parse( createdAt );
	if ( Number.isNaN( created ) ) {
		return 0;
	}
	return Date.now() - created;
}

function isUnderDirectory( child, parent ) {
	if ( ! child ) {
		return false;
	}
	const relative = path.relative(
		path.resolve( parent ),
		path.resolve( child )
	);
	return relative === '' || ( relative && ! relative.startsWith( '..' ) );
}

function getLabels( resource ) {
	return resource.Config?.Labels ?? resource.Labels ?? {};
}

function couldBeWpEnvComposeProjectName( project ) {
	return /^(wp-env-|[a-f0-9]{32}$)/.test( project );
}

function hasWpEnvComposePathLabels( resource ) {
	const labels = getLabels( resource );
	const workingDir = labels[ 'com.docker.compose.project.working_dir' ] ?? '';
	const configFiles =
		labels[ 'com.docker.compose.project.config_files' ] ?? '';

	if ( workingDir && isUnderDirectory( workingDir, WP_ENV_HOME ) ) {
		return true;
	}

	if (
		configFiles
			.split( ',' )
			.some( ( filePath ) => isUnderDirectory( filePath, WP_ENV_HOME ) )
	) {
		return true;
	}

	return false;
}

async function wpEnvProjectDirectoryExists( project ) {
	if ( ! project || ! couldBeWpEnvComposeProjectName( project ) ) {
		return false;
	}
	const stats = await fs
		.stat( path.join( WP_ENV_HOME, project ) )
		.catch( () => null );
	return stats?.isDirectory() === true;
}

async function isWpEnvComposeResource( resource, knownWpEnvProjects ) {
	const labels = getLabels( resource );
	const project = labels[ 'com.docker.compose.project' ] ?? '';

	if ( hasWpEnvComposePathLabels( resource ) ) {
		return true;
	}
	if ( project && knownWpEnvProjects.has( project ) ) {
		return true;
	}
	return wpEnvProjectDirectoryExists( project );
}

async function listInspect( resource, argsForList ) {
	const list = await runCommand( 'docker', [
		resource,
		'ls',
		...argsForList,
	] );
	if ( ! list.ok ) {
		return {
			ok: false,
			error: list.stderr || list.stdout || list.error,
			items: [],
		};
	}

	const ids = list.stdout
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	if ( ids.length === 0 ) {
		return {
			ok: true,
			items: [],
		};
	}

	const inspect = await runCommand( 'docker', [
		resource,
		'inspect',
		...ids,
	] );
	if ( ! inspect.ok ) {
		return {
			ok: false,
			error: inspect.stderr || inspect.stdout || inspect.error,
			items: [],
		};
	}

	return {
		ok: true,
		items: JSON.parse( inspect.stdout ),
	};
}

function summarizeContainer( container ) {
	const labels = getLabels( container );
	return {
		id: container.Id.slice( 0, 12 ),
		name:
			container.Name?.replace( /^\//, '' ) ?? container.Id.slice( 0, 12 ),
		project: labels[ 'com.docker.compose.project' ] ?? null,
		service: labels[ 'com.docker.compose.service' ] ?? null,
		workingDir: labels[ 'com.docker.compose.project.working_dir' ] ?? null,
		state: container.State?.Status ?? 'unknown',
		running: container.State?.Running === true,
		createdAt: container.Created,
		ageHours: Number(
			( ageMs( container.Created ) / 3600000 ).toFixed( 2 )
		),
	};
}

function summarizeNetwork( network ) {
	const labels = getLabels( network );
	return {
		id: network.Id.slice( 0, 12 ),
		name: network.Name,
		project: labels[ 'com.docker.compose.project' ] ?? null,
		createdAt: network.Created,
		ageHours: Number( ( ageMs( network.Created ) / 3600000 ).toFixed( 2 ) ),
		attachedContainers: Object.keys( network.Containers ?? {} ).length,
	};
}

function summarizeVolume( volume ) {
	const labels = getLabels( volume );
	return {
		name: volume.Name,
		project: labels[ 'com.docker.compose.project' ] ?? null,
		volume: labels[ 'com.docker.compose.volume' ] ?? null,
		createdAt: volume.CreatedAt ?? null,
		ageHours: Number(
			(
				ageMs( volume.CreatedAt ?? new Date().toISOString() ) / 3600000
			).toFixed( 2 )
		),
	};
}

function summarizeDirectory( directory ) {
	return {
		path: directory.path,
		mtime: directory.mtime,
		ageHours: directory.ageHours,
	};
}

function getUsedVolumeNames( containers ) {
	const used = new Set();
	for ( const container of containers ) {
		for ( const mount of container.Mounts ?? [] ) {
			if ( mount.Type === 'volume' && mount.Name ) {
				used.add( mount.Name );
			}
		}
	}
	return used;
}

async function removeResources( resource, ids ) {
	if ( ids.length === 0 ) {
		return {
			removed: [],
			errors: [],
		};
	}

	const result = await runCommand( 'docker', [ resource, 'rm', ...ids ] );
	if ( result.ok ) {
		return {
			removed: ids,
			errors: [],
			output: result.stdout.trim(),
		};
	}

	return {
		removed: [],
		errors: [
			{
				resource,
				ids,
				output: result.stderr || result.stdout || result.error,
			},
		],
	};
}

function isSafeWpEnvDirectoryPath( dirPath ) {
	return (
		isUnderDirectory( dirPath, WP_ENV_HOME ) &&
		path.resolve( dirPath ) !== path.resolve( WP_ENV_HOME )
	);
}

async function removeDirectories( directories ) {
	const removed = [];
	const errors = [];
	for ( const directory of directories ) {
		if ( ! isSafeWpEnvDirectoryPath( directory.path ) ) {
			errors.push( {
				path: directory.path,
				output: 'refusing to remove path outside wp-env home',
			} );
			continue;
		}
		try {
			await fs.rm( directory.path, { recursive: true, force: true } );
			removed.push( directory.path );
		} catch ( error ) {
			errors.push( {
				path: directory.path,
				output: error.message,
			} );
		}
	}
	return { removed, errors };
}

async function listStaleWpEnvDirectories( activeWorkingDirs ) {
	let entries;
	try {
		entries = await fs.readdir( WP_ENV_HOME, { withFileTypes: true } );
	} catch {
		return [];
	}

	const staleDirs = [];
	for ( const entry of entries ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const dirPath = path.join( WP_ENV_HOME, entry.name );
		if ( activeWorkingDirs.has( dirPath ) ) {
			continue;
		}
		const stats = await fs.stat( dirPath ).catch( () => null );
		if ( ! stats || Date.now() - stats.mtimeMs < MIN_AGE_MS ) {
			continue;
		}
		staleDirs.push( {
			path: dirPath,
			mtime: stats.mtime.toISOString(),
			ageHours: Number(
				( ( Date.now() - stats.mtimeMs ) / 3600000 ).toFixed( 2 )
			),
		} );
	}

	return staleDirs.sort( ( a, b ) => b.ageHours - a.ageHours );
}

async function main() {
	const containerInspect = await listInspect( 'container', [
		'-a',
		'--filter',
		'label=com.docker.compose.project',
		'-q',
	] );
	const networkInspect = await listInspect( 'network', [
		'--filter',
		'label=com.docker.compose.project',
		'-q',
	] );
	const volumeInspect = await listInspect( 'volume', [
		'--filter',
		'label=com.docker.compose.project',
		'-q',
	] );

	if ( ! containerInspect.ok || ! networkInspect.ok || ! volumeInspect.ok ) {
		const failure = {
			ok: false,
			dryRun: ! APPLY,
			error:
				containerInspect.error ??
				networkInspect.error ??
				volumeInspect.error,
		};
		process.stdout.write( JSON.stringify( failure, null, 2 ) + '\n' );
		process.exitCode = 1;
		return;
	}

	const knownWpEnvProjects = new Set();
	for ( const container of containerInspect.items ) {
		const labels = getLabels( container );
		const project = labels[ 'com.docker.compose.project' ];
		if (
			project &&
			( hasWpEnvComposePathLabels( container ) ||
				( await wpEnvProjectDirectoryExists( project ) ) )
		) {
			knownWpEnvProjects.add( project );
		}
	}
	for ( const volume of volumeInspect.items ) {
		const labels = getLabels( volume );
		const project = labels[ 'com.docker.compose.project' ];
		if (
			project &&
			( hasWpEnvComposePathLabels( volume ) ||
				( await wpEnvProjectDirectoryExists( project ) ) )
		) {
			knownWpEnvProjects.add( project );
		}
	}

	const wpEnvContainers = [];
	for ( const container of containerInspect.items ) {
		if ( await isWpEnvComposeResource( container, knownWpEnvProjects ) ) {
			wpEnvContainers.push( container );
		}
	}
	const activeProjects = new Set();
	const activeWorkingDirs = new Set();

	for ( const container of wpEnvContainers ) {
		const labels = getLabels( container );
		const project = labels[ 'com.docker.compose.project' ];
		const workingDir = labels[ 'com.docker.compose.project.working_dir' ];
		if ( container.State?.Running === true && project ) {
			activeProjects.add( project );
		}
		if ( container.State?.Running === true && workingDir ) {
			activeWorkingDirs.add( workingDir );
		}
	}

	const removeContainerCandidates = wpEnvContainers.filter( ( container ) => {
		const labels = getLabels( container );
		const project = labels[ 'com.docker.compose.project' ];
		if ( container.State?.Running === true ) {
			return false;
		}
		if ( project && activeProjects.has( project ) ) {
			return false;
		}
		return ageMs( container.Created ) >= MIN_AGE_MS;
	} );

	let containerRemoval = {
		removed: [],
		errors: [],
	};
	if ( APPLY ) {
		containerRemoval = await removeResources(
			'container',
			removeContainerCandidates.map( ( container ) => container.Id )
		);
	}

	const networkInspectAfterContainers = APPLY
		? await listInspect( 'network', [
				'--filter',
				'label=com.docker.compose.project',
				'-q',
		  ] )
		: networkInspect;
	const wpEnvNetworks = [];
	for ( const network of networkInspectAfterContainers.items ) {
		if ( await isWpEnvComposeResource( network, knownWpEnvProjects ) ) {
			wpEnvNetworks.push( network );
		}
	}
	const removeNetworkCandidates = wpEnvNetworks.filter( ( network ) => {
		const labels = getLabels( network );
		const project = labels[ 'com.docker.compose.project' ];
		if ( project && activeProjects.has( project ) ) {
			return false;
		}
		if ( Object.keys( network.Containers ?? {} ).length > 0 ) {
			return false;
		}
		return ageMs( network.Created ) >= MIN_AGE_MS;
	} );

	let networkRemoval = {
		removed: [],
		errors: [],
	};
	if ( APPLY ) {
		networkRemoval = await removeResources(
			'network',
			removeNetworkCandidates.map( ( network ) => network.Id )
		);
	}

	const containerInspectAfterContainers = APPLY
		? await listInspect( 'container', [
				'-a',
				'--filter',
				'label=com.docker.compose.project',
				'-q',
		  ] )
		: containerInspect;
	const usedVolumeNames = getUsedVolumeNames(
		containerInspectAfterContainers.items
	);
	const wpEnvVolumes = [];
	for ( const volume of volumeInspect.items ) {
		if ( await isWpEnvComposeResource( volume, knownWpEnvProjects ) ) {
			wpEnvVolumes.push( volume );
		}
	}
	const removeVolumeCandidates = wpEnvVolumes.filter( ( volume ) => {
		const labels = getLabels( volume );
		const project = labels[ 'com.docker.compose.project' ];
		if ( project && activeProjects.has( project ) ) {
			return false;
		}
		if ( usedVolumeNames.has( volume.Name ) ) {
			return false;
		}
		return ageMs( volume.CreatedAt ) >= MIN_AGE_MS;
	} );

	let volumeRemoval = {
		removed: [],
		errors: [],
	};
	if ( APPLY && PRUNE_VOLUMES ) {
		volumeRemoval = await removeResources(
			'volume',
			removeVolumeCandidates.map( ( volume ) => volume.Name )
		);
	}

	const staleDirectories =
		await listStaleWpEnvDirectories( activeWorkingDirs );
	const allWorkingDirs = new Set();
	const resourceProjects = new Set();
	for ( const resource of [
		...wpEnvContainers,
		...wpEnvNetworks,
		...wpEnvVolumes,
	] ) {
		const labels = getLabels( resource );
		const project = labels[ 'com.docker.compose.project' ];
		const workingDir = labels[ 'com.docker.compose.project.working_dir' ];
		if ( project ) {
			resourceProjects.add( project );
		}
		if ( workingDir ) {
			allWorkingDirs.add( workingDir );
		}
	}
	const removeDirectoryCandidates = staleDirectories.filter(
		( directory ) => {
			const name = path.basename( directory.path );
			if ( activeWorkingDirs.has( directory.path ) ) {
				return false;
			}
			if ( allWorkingDirs.has( directory.path ) ) {
				return false;
			}
			if ( resourceProjects.has( name ) ) {
				return false;
			}
			return true;
		}
	);

	let directoryRemoval = {
		removed: [],
		errors: [],
	};
	if ( APPLY && PRUNE_DIRECTORIES ) {
		directoryRemoval = await removeDirectories( removeDirectoryCandidates );
	}

	const report = {
		ok:
			containerRemoval.errors.length === 0 &&
			networkRemoval.errors.length === 0 &&
			volumeRemoval.errors.length === 0 &&
			directoryRemoval.errors.length === 0,
		dryRun: ! APPLY,
		pruneVolumes: PRUNE_VOLUMES,
		pruneDirectories: PRUNE_DIRECTORIES,
		minAgeHours: MIN_AGE_HOURS,
		wpEnvHome: WP_ENV_HOME,
		activeProjects: [ ...activeProjects ].sort(),
		containers: {
			wpEnvComposeTotal: wpEnvContainers.length,
			removeCandidates:
				removeContainerCandidates.map( summarizeContainer ),
			removed: containerRemoval.removed.map( ( id ) =>
				id.slice( 0, 12 )
			),
			errors: containerRemoval.errors,
		},
		networks: {
			wpEnvComposeTotal: wpEnvNetworks.length,
			removeCandidates: removeNetworkCandidates.map( summarizeNetwork ),
			removed: networkRemoval.removed.map( ( id ) => id.slice( 0, 12 ) ),
			errors: networkRemoval.errors,
		},
		volumes: {
			wpEnvComposeTotal: wpEnvVolumes.length,
			removeCandidates: removeVolumeCandidates.map( summarizeVolume ),
			removed: volumeRemoval.removed,
			errors: volumeRemoval.errors,
			note: PRUNE_VOLUMES
				? 'Only unused volumes from inactive wp-env compose projects are removed.'
				: 'Volume removal is opt-in. Rerun with --apply --prune-volumes to remove candidates.',
		},
		staleWpEnvDirectories: {
			count: staleDirectories.length,
			examples: staleDirectories.slice( 0, 20 ),
			removeCandidates:
				removeDirectoryCandidates.map( summarizeDirectory ),
			removed: directoryRemoval.removed,
			errors: directoryRemoval.errors,
			note: PRUNE_DIRECTORIES
				? 'Only orphaned stale directories with no Docker resources attached are removed.'
				: 'Directory removal is opt-in. Rerun with --apply --prune-directories to remove orphaned stale directories.',
		},
	};

	if ( JSON_OUTPUT ) {
		process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
		return;
	}

	process.stdout.write(
		[
			`RTC wp-env cleanup ${ APPLY ? 'apply' : 'dry run' }`,
			`min age: ${ MIN_AGE_HOURS }h`,
			`active projects: ${ report.activeProjects.length }`,
			`stopped container candidates: ${ report.containers.removeCandidates.length }`,
			`unused network candidates: ${ report.networks.removeCandidates.length }`,
			`unused volume candidates: ${ report.volumes.removeCandidates.length }`,
			`stale ~/.wp-env dirs reported: ${ report.staleWpEnvDirectories.count }`,
			`orphaned stale ~/.wp-env dir candidates: ${ report.staleWpEnvDirectories.removeCandidates.length }`,
			...( APPLY
				? [
						`containers removed: ${ report.containers.removed.length }`,
						`networks removed: ${ report.networks.removed.length }`,
						`volumes removed: ${ report.volumes.removed.length }`,
						`directories removed: ${ report.staleWpEnvDirectories.removed.length }`,
				  ]
				: [
						PRUNE_VOLUMES || PRUNE_DIRECTORIES
							? 'rerun with --apply and the same prune flags to remove candidates'
							: 'rerun with --apply to remove container/network candidates; add --prune-volumes and/or --prune-directories for unused wp-env storage',
				  ] ),
		].join( '\n' ) + '\n'
	);
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
