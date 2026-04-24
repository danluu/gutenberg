#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..',
	'..',
	'..'
);

const DEFAULT_ROOTS = [
	'artifacts/rtc-browser-fuzz/allcore-no-reload-nofaults-8899-pty-20260423T073135Z',
	'artifacts/rtc-browser-fuzz/allcore-no-reload-nofaults-8889-pty-20260423T073135Z',
];

const MANUAL_TRIAGED = [
	{
		id: 'php-oom-root-comment',
		status: 'triaged-real',
		summary:
			'root/comment room growth can OOM PHP and surface Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md',
	},
	{
		id: 'browser-offline-disconnect',
		status: 'triaged-real',
		summary:
			'Browser or OS offline state yields wp-sync failures and Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/browser-offline-connection-lost-20260423/summary.md',
	},
	{
		id: 'too-many-rooms-per-request',
		status: 'triaged-real',
		summary:
			'More than 50 rooms in one poll request yields repeated 400s and Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/too-many-rooms-connection-lost-20260423/summary.md',
	},
	{
		id: 'oversized-compaction-update',
		status: 'triaged-real',
		summary:
			'Compaction update over 1 MiB triggers server validation failure and Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/oversized-compaction-connection-lost-20260423/summary.md',
	},
	{
		id: 'auth-loss-invalid-nonce',
		status: 'triaged-real',
		summary:
			'Mid-session auth loss yields repeated rest_cookie_invalid_nonce 403s and Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/auth-loss-connection-lost-20260423/summary.md',
	},
	{
		id: 'request-body-too-large',
		status: 'triaged-real',
		summary:
			'Large multi-room poll body exceeds 16 MiB cap, returns 413, then Connection lost.',
		notePath:
			'artifacts/rtc-browser-fuzz/sync-body-size-connection-lost-20260423/summary.md',
	},
	{
		id: 'reload-title-known',
		status: 'triaged-known-excluded',
		summary:
			'Known reload-title family; excluded from current bug search.',
		notePath:
			'test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts',
	},
];

async function collectSummaryFiles( root ) {
	const rootPath = path.resolve( REPO_ROOT, root );
	const results = [];

	async function walk( currentPath ) {
		let entries;
		try {
			entries = await fs.readdir( currentPath, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( currentPath, entry.name );
			if ( entry.isDirectory() ) {
				await walk( entryPath );
				continue;
			}
			if ( entry.isFile() && entry.name === 'summary.ndjson' ) {
				results.push( entryPath );
			}
		}
	}

	await walk( rootPath );
	return results;
}

function identifySignature( record ) {
	const snippet = record.failureSnippet || '';
	const classification = record.classification || 'unknown';

	if ( classification === 'reload-title-known' ) {
		return {
			id: 'reload-title-known',
			status: 'triaged-known-excluded',
			summary:
				'Known reload-title family; already excluded from this search.',
		};
	}

	if ( /The theme "twentytwentyone" is not installed/.test( snippet ) ) {
		return {
			id: 'global-setup-theme-missing',
			status: 'triaged-infra',
			summary:
				'Global setup activateTheme() fails because twentytwentyone is missing.',
		};
	}

	if ( /rest_post_invalid_id/.test( snippet ) ) {
		return {
			id: 'global-setup-invalid-post-id',
			status: 'triaged-infra',
			summary:
				'Setup or editor open fails with rest_post_invalid_id against a dirty or inconsistent test env.',
		};
	}

	if ( /rest_cannot_delete/.test( snippet ) ) {
		return {
			id: 'global-setup-delete-post-500',
			status: 'triaged-infra',
			summary:
				'Global setup deleteAllPosts() fails with 500 rest_cannot_delete.',
		};
	}

	if (
		/page\.waitForURL: Test ended\./.test( snippet ) &&
		/waiting for navigation to "\*\*\/wp-admin\/\*\*" until "load"/.test(
			snippet
		)
	) {
		return {
			id: 'startup-login-navigation-timeout',
			status: 'triaged-infra',
			summary:
				'Login or post-editor navigation never finishes before startup timeout.',
		};
	}

	if (
		/page\.waitForResponse: Timeout 10000ms exceeded/.test( snippet ) ||
		/waitForSyncCycle/.test( snippet )
	) {
		return {
			id: 'startup-no-sync-response',
			status: 'open-untriaged',
			summary: 'No successful wp-sync response arrives during discovery.',
		};
	}

	if (
		/getByRole\('button', \{ name: \/Collaborators list\/ \}\)/.test(
			snippet
		) ||
		/waitForMutualDiscovery/.test( snippet )
	) {
		return {
			id: 'startup-collaborators-list-never-visible',
			status: 'open-untriaged',
			summary:
				'Collaborators list button never becomes visible during discovery.',
		};
	}

	if (
		/page\.waitForFunction: Timeout 30000ms exceeded/.test( snippet ) &&
		/window\?\.wp\?\.data && window\?\.wp\?\.blocks/.test( snippet )
	) {
		return {
			id: 'startup-editor-runtime-never-ready',
			status: 'open-untriaged',
			summary:
				'Editor runtime never reaches window.wp.data/window.wp.blocks readiness.',
		};
	}

	if ( classification === 'startup-timeout' ) {
		return {
			id: 'startup-timeout-other',
			status: 'open-untriaged',
			summary: 'Other startup-timeout signature not yet bucketed.',
		};
	}

	return {
		id: `other-${ classification }`,
		status: 'open-untriaged',
		summary: `Other ${ classification } signature.`,
	};
}

function createAggregateEntry( signature ) {
	return {
		id: signature.id,
		status: signature.status,
		summary: signature.summary,
		count: 0,
		seeds: new Set(),
		examples: [],
	};
}

function statusSortKey( status ) {
	switch ( status ) {
		case 'triaged-real':
			return 0;
		case 'triaged-known-excluded':
			return 1;
		case 'triaged-infra':
			return 2;
		case 'open-untriaged':
			return 3;
		default:
			return 4;
	}
}

function formatLink( relativePath ) {
	const absolutePath = path.resolve( REPO_ROOT, relativePath );
	return `[${ path.basename( relativePath ) }](${ absolutePath })`;
}

async function main() {
	const roots = process.argv.slice( 2 );
	const selectedRoots = roots.length > 0 ? roots : DEFAULT_ROOTS;
	const summaryFiles = [];
	for ( const root of selectedRoots ) {
		summaryFiles.push( ...( await collectSummaryFiles( root ) ) );
	}

	const bySignature = new Map();

	for ( const triaged of MANUAL_TRIAGED ) {
		bySignature.set( triaged.id, {
			...createAggregateEntry( triaged ),
			notePath: triaged.notePath,
		} );
	}

	for ( const summaryFile of summaryFiles ) {
		const raw = await fs.readFile( summaryFile, 'utf8' );
		for ( const line of raw.split( '\n' ) ) {
			if ( ! line.trim() ) {
				continue;
			}

			let record;
			try {
				record = JSON.parse( line );
			} catch {
				continue;
			}

			if ( record.kind !== 'failure' ) {
				continue;
			}

			const signature = identifySignature( record );
			if ( ! bySignature.has( signature.id ) ) {
				bySignature.set(
					signature.id,
					createAggregateEntry( signature )
				);
			}

			const aggregate = bySignature.get( signature.id );
			aggregate.count++;
			aggregate.seeds.add( record.seed );
			if ( aggregate.examples.length < 5 ) {
				aggregate.examples.push( {
					seed: record.seed,
					classification: record.classification,
					snippet: ( record.failureSnippet || '' )
						.replaceAll( '\n', ' ' )
						.slice( 0, 180 ),
				} );
			}
		}
	}

	const entries = [ ...bySignature.values() ].sort( ( left, right ) => {
		const statusDelta =
			statusSortKey( left.status ) - statusSortKey( right.status );
		if ( statusDelta !== 0 ) {
			return statusDelta;
		}

		return right.count - left.count || left.id.localeCompare( right.id );
	} );

	const sections = [
		{
			title: 'Triaged Real',
			status: 'triaged-real',
		},
		{
			title: 'Known Excluded',
			status: 'triaged-known-excluded',
		},
		{
			title: 'Triaged Infra / Env',
			status: 'triaged-infra',
		},
		{
			title: 'Open Untriaged',
			status: 'open-untriaged',
		},
	];

	const lines = [];
	lines.push( '# Distinct Failure Tracker' );
	lines.push( '' );
	lines.push( `- Snapshot time: ${ new Date().toISOString() }` );
	lines.push(
		`- Roots scanned: ${ selectedRoots.map( ( root ) => `\`${ root }\`` ).join( ', ' ) }`
	);
	lines.push( `- Summary files scanned: ${ summaryFiles.length }` );
	lines.push( '' );

	for ( const section of sections ) {
		const sectionEntries = entries.filter(
			( entry ) => entry.status === section.status
		);
		if ( sectionEntries.length === 0 ) {
			continue;
		}

		lines.push( `## ${ section.title }` );
		lines.push( '' );

		for ( const entry of sectionEntries ) {
			const seedText =
				entry.seeds.size > 0
					? `Seeds: ${ [ ...entry.seeds ].slice( 0, 10 ).join( ', ' ) }`
					: 'Seeds: n/a';
			const noteText = entry.notePath
				? ` Note: ${ formatLink( entry.notePath ) }.`
				: '';
			lines.push(
				`- \`${ entry.id }\`: ${ entry.summary } Count: ${ entry.count }. ${ seedText }.${ noteText }`
			);
			for ( const example of entry.examples ) {
				lines.push(
					`  Example seed ${ example.seed } (${ example.classification }): ${ example.snippet }`
				);
			}
		}

		lines.push( '' );
	}

	process.stdout.write( lines.join( '\n' ) + '\n' );
}

await main();
