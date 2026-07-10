#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE =
	process.env.RTC_DOCKER_NETWORK_REAPER_BASE ??
	'/media/volume/danluu-fuzz-data/rtc-docker-network-reaper-20260710';
const TRIGGER_COUNT = positiveInteger(
	process.env.RTC_DOCKER_NETWORK_REAPER_TRIGGER_COUNT,
	24
);
const TARGET_COUNT = positiveInteger(
	process.env.RTC_DOCKER_NETWORK_REAPER_TARGET_COUNT,
	20
);
const RETENTION_SECONDS = positiveInteger(
	process.env.RTC_DOCKER_NETWORK_REAPER_RETENTION_SECONDS,
	30 * 60
);
const EMPTY_NETWORK_RETENTION_SECONDS = positiveInteger(
	process.env.RTC_DOCKER_NETWORK_REAPER_EMPTY_RETENTION_SECONDS,
	5 * 60
);
const MAX_PROJECTS = positiveInteger(
	process.env.RTC_DOCKER_NETWORK_REAPER_MAX_PROJECTS,
	4
);
const DRY_RUN = process.env.RTC_DOCKER_NETWORK_REAPER_DRY_RUN === '1';
const STATUS_PATH = path.join( BASE, 'current-status.json' );
const LOG_PATH = path.join( BASE, 'events.ndjson' );
const LOCK_PATH = path.join( BASE, 'reaper.lock' );

fs.mkdirSync( BASE, { recursive: true } );
const lock = acquireLock();
if ( ! lock ) {
	process.exit( 0 );
}

try {
	main();
} finally {
	try {
		fs.closeSync( lock.fd );
		fs.unlinkSync( LOCK_PATH );
	} catch {}
}

function main() {
	const networkIds = lines(
		run( 'docker', [ 'network', 'ls', '-q' ] ).stdout
	);
	const networks = networkIds.length
		? dockerJson( [ 'network', 'inspect', ...networkIds ] )
		: [];
	const initialCount = networks.length;
	const status = {
		updatedAt: new Date().toISOString(),
		dryRun: DRY_RUN,
		triggerCount: TRIGGER_COUNT,
		targetCount: TARGET_COUNT,
		retentionSeconds: RETENTION_SECONDS,
		emptyNetworkRetentionSeconds: EMPTY_NETWORK_RETENTION_SECONDS,
		initialNetworkCount: initialCount,
		finalNetworkCount: initialCount,
		removedProjects: [],
		protectedProjects: [],
		errors: [],
	};

	if ( initialCount < TRIGGER_COUNT ) {
		writeStatus( status );
		return;
	}

	const containerIds = [
		...new Set(
			networks.flatMap( ( network ) =>
				Object.keys( network.Containers ?? {} )
			)
		),
	];
	const containers = containerIds.length
		? dockerJson( [ 'inspect', ...containerIds ] )
		: [];
	const containerById = new Map(
		containers.map( ( container ) => [ container.Id, container ] )
	);
	const active = getActiveOwners();
	const candidates = networks
		.map( ( network ) => buildCandidate( network, containerById, active ) )
		.filter( Boolean )
		.sort( ( left, right ) => left.createdAtMs - right.createdAtMs );

	let removed = 0;
	for ( const candidate of candidates ) {
		if (
			initialCount - removed <= TARGET_COUNT ||
			removed >= MAX_PROJECTS
		) {
			break;
		}
		if ( candidate.protectedReason ) {
			status.protectedProjects.push( {
				project: candidate.project,
				network: candidate.networkName,
				reason: candidate.protectedReason,
				ageSeconds: candidate.ageSeconds,
				retentionSeconds: candidate.retentionSeconds,
			} );
			continue;
		}
		if ( DRY_RUN ) {
			status.removedProjects.push( {
				project: candidate.project,
				network: candidate.networkName,
				ageSeconds: candidate.ageSeconds,
				retentionSeconds: candidate.retentionSeconds,
				action: 'would-remove',
			} );
			removed += 1;
			continue;
		}

		const result = removeCandidate( candidate );
		if ( result.ok ) {
			removed += 1;
			status.removedProjects.push( {
				project: candidate.project,
				network: candidate.networkName,
				ageSeconds: candidate.ageSeconds,
				retentionSeconds: candidate.retentionSeconds,
				action: result.action,
			} );
			appendLog( {
				at: new Date().toISOString(),
				action: 'remove-stale-compose-project',
				...status.removedProjects.at( -1 ),
			} );
		} else {
			status.errors.push( {
				project: candidate.project,
				network: candidate.networkName,
				error: result.error,
			} );
		}
		status.finalNetworkCount = lines(
			run( 'docker', [ 'network', 'ls', '-q' ] ).stdout
		).length;
		writeStatus( status );
	}

	status.finalNetworkCount = lines(
		run( 'docker', [ 'network', 'ls', '-q' ] ).stdout
	).length;
	writeStatus( status );
}

function buildCandidate( network, containerById, active ) {
	const project = network.Labels?.[ 'com.docker.compose.project' ] ?? '';
	if ( ! project.startsWith( 'wp-env-' ) ) {
		return null;
	}
	const attachedIds = Object.keys( network.Containers ?? {} );
	const containers = attachedIds
		.map( ( id ) => containerById.get( id ) )
		.filter( Boolean );
	const first = containers[ 0 ];
	const createdAtMs = Math.min(
		...[
			Date.parse( network.Created ?? '' ),
			...containers.map( ( container ) =>
				Date.parse( container.Created ?? '' )
			),
		].filter( Number.isFinite )
	);
	if ( ! Number.isFinite( createdAtMs ) ) {
		return null;
	}
	const ageSeconds = Math.floor( ( Date.now() - createdAtMs ) / 1000 );
	const labels = first?.Config?.Labels ?? {};
	const workingDir = labels[ 'com.docker.compose.project.working_dir' ] ?? '';
	const configPath =
		labels[ 'com.docker.compose.project.config_files' ] ?? '';
	let protectedReason = null;
	const retentionSeconds =
		attachedIds.length === 0
			? Math.min( RETENTION_SECONDS, EMPTY_NETWORK_RETENTION_SECONDS )
			: RETENTION_SECONDS;
	if ( ageSeconds < retentionSeconds ) {
		protectedReason = 'retention-window';
	} else if (
		active.envHomes.some( ( home ) => isPathInside( home, workingDir ) )
	) {
		protectedReason = 'active-wp-env-home';
	} else if (
		active.commands.some(
			( command ) =>
				command.includes( project ) ||
				( workingDir && command.includes( workingDir ) )
		)
	) {
		protectedReason = 'active-process-command';
	} else {
		const runRoot = getContinuationRunRoot( workingDir );
		if (
			runRoot &&
			active.cwds.some( ( cwd ) => isPathInside( runRoot, cwd ) )
		) {
			protectedReason = 'active-continuation-run';
		}
	}
	const stamp = project.match( /20\d{6}t\d{6}z/i )?.[ 0 ]?.toLowerCase();
	if (
		! protectedReason &&
		stamp &&
		active.sessions.some( ( session ) => session.includes( stamp ) )
	) {
		protectedReason = 'active-tmux-session';
	}

	return {
		project,
		networkId: network.Id,
		networkName: network.Name,
		attachedIds,
		createdAtMs,
		ageSeconds,
		retentionSeconds,
		workingDir,
		configPath,
		protectedReason,
	};
}

function removeCandidate( candidate ) {
	if ( candidate.configPath && fs.existsSync( candidate.configPath ) ) {
		const result = run(
			'timeout',
			[
				'20',
				'docker',
				'compose',
				'-p',
				candidate.project,
				'-f',
				candidate.configPath,
				'down',
				'--timeout',
				'1',
				'--volumes',
				'--remove-orphans',
			],
			{ cwd: path.dirname( candidate.configPath ) }
		);
		if (
			result.status === 0 &&
			! dockerNetworkExists( candidate.networkId )
		) {
			return { ok: true, action: 'compose-down' };
		}
	}

	if ( candidate.attachedIds.length > 0 ) {
		run( 'docker', [ 'rm', '-f', ...candidate.attachedIds ] );
	}
	const removeNetwork = run( 'docker', [
		'network',
		'rm',
		candidate.networkId,
	] );
	if (
		removeNetwork.status === 0 ||
		! dockerNetworkExists( candidate.networkId )
	) {
		return { ok: true, action: 'container-and-network-remove' };
	}
	return {
		ok: false,
		error: compact( `${ removeNetwork.stderr } ${ removeNetwork.stdout }` ),
	};
}

function getActiveOwners() {
	const envHomes = new Set();
	const cwds = new Set();
	const commands = new Set();
	for ( const entry of fs.readdirSync( '/proc' ) ) {
		if ( ! /^\d+$/.test( entry ) ) {
			continue;
		}
		const root = path.join( '/proc', entry );
		try {
			const command = fs
				.readFileSync( path.join( root, 'cmdline' ), 'utf8' )
				.replaceAll( '\0', ' ' )
				.trim();
			if ( command ) {
				commands.add( command );
			}
			const cwd = fs.readlinkSync( path.join( root, 'cwd' ) );
			if ( cwd ) {
				cwds.add( path.resolve( cwd ) );
			}
			for ( const value of fs
				.readFileSync( path.join( root, 'environ' ), 'utf8' )
				.split( '\0' ) ) {
				if ( value.startsWith( 'WP_ENV_HOME=' ) ) {
					envHomes.add(
						path.resolve( value.slice( 'WP_ENV_HOME='.length ) )
					);
				}
			}
		} catch {}
	}
	const tmux = run( '/usr/bin/tmux', [
		'-L',
		'rtc-fuzz',
		'list-sessions',
		'-F',
		'#{session_name}',
	] );
	return {
		envHomes: [ ...envHomes ],
		cwds: [ ...cwds ],
		commands: [ ...commands ],
		sessions: lines( tmux.stdout.toLowerCase() ),
	};
}

function getContinuationRunRoot( workingDir ) {
	return (
		workingDir.match( /^(.*\/runs\/\d{8}T\d{6}Z)(?:\/|$)/ )?.[ 1 ] ?? null
	);
}

function isPathInside( parent, candidate ) {
	if ( ! parent || ! candidate ) {
		return false;
	}
	const relative = path.relative(
		path.resolve( parent ),
		path.resolve( candidate )
	);
	return (
		relative === '' ||
		( ! relative.startsWith( '..' ) && ! path.isAbsolute( relative ) )
	);
}

function dockerNetworkExists( id ) {
	return run( 'docker', [ 'network', 'inspect', id ] ).status === 0;
}

function dockerJson( args ) {
	const result = run( 'docker', args );
	if ( result.status !== 0 ) {
		throw new Error( compact( `${ result.stderr } ${ result.stdout }` ) );
	}
	return JSON.parse( result.stdout || '[]' );
}

function run( command, args, options = {} ) {
	return spawnSync( command, args, {
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
		...options,
	} );
}

function acquireLock() {
	for ( let attempt = 0; attempt < 2; attempt++ ) {
		try {
			const fd = fs.openSync( LOCK_PATH, 'wx' );
			fs.writeFileSync( fd, `${ process.pid }\n` );
			return { fd };
		} catch ( error ) {
			if ( error.code !== 'EEXIST' ) {
				throw error;
			}
			const pid = Number.parseInt(
				fs.readFileSync( LOCK_PATH, 'utf8' ).trim(),
				10
			);
			if ( ! Number.isInteger( pid ) || pid <= 0 ) {
				fs.unlinkSync( LOCK_PATH );
				continue;
			}
			try {
				process.kill( pid, 0 );
				return null;
			} catch ( processError ) {
				if ( processError.code !== 'ESRCH' ) {
					return null;
				}
				fs.unlinkSync( LOCK_PATH );
			}
		}
	}
	return null;
}

function writeStatus( status ) {
	const tmp = `${ STATUS_PATH }.${ process.pid }.tmp`;
	fs.writeFileSync( tmp, `${ JSON.stringify( status, null, 2 ) }\n` );
	fs.renameSync( tmp, STATUS_PATH );
}

function appendLog( record ) {
	fs.appendFileSync( LOG_PATH, `${ JSON.stringify( record ) }\n` );
}

function lines( value ) {
	return String( value ?? '' )
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
}

function compact( value ) {
	return String( value ?? '' )
		.replace( /\s+/g, ' ' )
		.trim()
		.slice( 0, 1000 );
}

function positiveInteger( value, fallback ) {
	const parsed = Number.parseInt( value ?? '', 10 );
	return Number.isInteger( parsed ) && parsed > 0 ? parsed : fallback;
}
