import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __filename = fileURLToPath( import.meta.url );
const outDir = path.dirname( __filename );
const toolWorktree = path.resolve( outDir, '../../..' );
const testedWorktree =
	process.env.GUTENBERG_WORKTREE ??
	'/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-current-trunk-20260506';
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8891';
const wpEnvConfig =
	process.env.WP_ENV_CONFIG ?? '.wp-env.stale-save-current-trunk.json';
const framesDir =
	process.env.FRAMES_DIR ??
	path.join( outDir, 'frames-live-bad-autosave-visible-close-reopen-e2e' );
const videoPath =
	process.env.VIDEO_PATH ??
	path.join(
		outDir,
		'current-trunk-rtc-live-bad-autosave-visible-close-reopen-e2e.mp4'
	);
const evidencePath =
	process.env.EVIDENCE_PATH ??
	path.join(
		outDir,
		'current-trunk-rtc-live-bad-autosave-visible-close-reopen-e2e.evidence.json'
	);
const adminUser = process.env.WP_USERNAME ?? 'admin';
const adminPassword = process.env.WP_PASSWORD ?? 'password';
const autosaveWaitMs = Number( process.env.AUTOSAVE_WAIT_MS ?? 95000 );
const frameSeconds = Number( process.env.FRAME_SECONDS ?? 7 );
const maxAttempts = Number( process.env.MAX_ATTEMPTS ?? 4 );
const viewport = { width: 960, height: 720 };
const topHeight = 112;
const labelHeight = 48;
const logHeight = 420;
const frameHeight = topHeight + labelHeight + viewport.height + logHeight;
const totalSteps = 10;

const env = {
	...process.env,
	PATH: `${ path.join( toolWorktree, 'node_modules/.bin' ) }:${
		process.env.PATH
	}`,
};

function runGit( args ) {
	return execFileSync( 'git', args, {
		cwd: testedWorktree,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} ).trim();
}

function runWpCli( args ) {
	try {
		return execFileSync(
			'wp-env',
			[ '--config', wpEnvConfig, 'run', 'cli', 'wp', ...args ],
			{
				cwd: testedWorktree,
				encoding: 'utf8',
				env,
				stdio: [ 'ignore', 'pipe', 'pipe' ],
			}
		).trim();
	} catch ( error ) {
		const stderr = String( error.stderr ?? '' );
		if ( ! stderr.includes( 'Environment not initialized' ) ) {
			throw error;
		}
		return execFileSync(
			'docker',
			[
				'exec',
				process.env.WP_ENV_CLI_CONTAINER ??
					'a7ee34b0383f6b22a430a77219940001-cli-1',
				'wp',
				'--path=/var/www/html',
				...args,
			],
			{
				cwd: testedWorktree,
				encoding: 'utf8',
				env,
				stdio: [ 'ignore', 'pipe', 'pipe' ],
			}
		).trim();
	}
}

function paragraphMarkup( content ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function escapeXml( value ) {
	return String( value )
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' );
}

function wrapText( text, columns ) {
	const words = String( text ).split( /\s+/ );
	const lines = [];
	let line = '';

	for ( const word of words ) {
		const next = `${ line } ${ word }`.trim();
		if ( next.length > columns && line ) {
			lines.push( line );
			line = word;
		} else {
			line = next;
		}
	}

	if ( line ) {
		lines.push( line );
	}

	return lines;
}

function syncObserver( page ) {
	const state = { count: 0, rooms: new Set() };
	page.on( 'response', async ( response ) => {
		if ( ! response.url().includes( 'wp-sync' ) || response.status() !== 200 ) {
			return;
		}
		state.count += 1;
		try {
			const payload = await response.json();
			for ( const room of payload?.rooms ?? [] ) {
				if ( room?.room ) {
					state.rooms.add( room.room );
				}
			}
		} catch {}
	} );
	return state;
}

function requestUrlMatchesPost( request, postId ) {
	const url = request.url();
	return (
		url.includes( `/wp/v2/posts/${ postId }` ) ||
		url.includes( `rest_route=%2Fwp%2Fv2%2Fposts%2F${ postId }` )
	);
}

function requestUrlMatchesAutosave( request, postId ) {
	return decodeURIComponent( request.url() ).includes(
		`/wp/v2/posts/${ postId }/autosaves`
	);
}

function isPostSaveRequest( request, postId ) {
	const method = request.method();
	return (
		( method === 'POST' || method === 'PUT' ) &&
		requestUrlMatchesPost( request, postId ) &&
		! requestUrlMatchesAutosave( request, postId )
	);
}

function isAutosaveRequest( request, postId ) {
	return request.method() === 'POST' && requestUrlMatchesAutosave( request, postId );
}

function attachSaveTrace( page, label, postId ) {
	const entries = [];
	page.on( 'request', ( request ) => {
		if ( ! isPostSaveRequest( request, postId ) ) {
			return;
		}
		entries.push( {
			label,
			method: request.method(),
			url: request.url(),
			requestPostData: request.postData() ?? '',
			requestAt: Date.now(),
		} );
	} );
	page.on( 'response', async ( response ) => {
		const request = response.request();
		if ( ! isPostSaveRequest( request, postId ) ) {
			return;
		}
		const entry = entries
			.slice()
			.reverse()
			.find(
				( item ) =>
					item.url === request.url() &&
					item.method === request.method() &&
					item.responseStatus === undefined
			);
		if ( ! entry ) {
			return;
		}
		entry.responseStatus = response.status();
		try {
			const body = await response.json();
			entry.responseContentRaw = body?.content?.raw ?? '';
		} catch {
			entry.responseContentRaw = '';
		}
	} );
	return entries;
}

function attachAutosaveTrace( page, label, postId ) {
	const entries = [];
	page.on( 'response', async ( response ) => {
		const request = response.request();
		if ( ! isAutosaveRequest( request, postId ) ) {
			return;
		}
		const entry = {
			label,
			method: request.method(),
			url: request.url(),
			responseStatus: response.status(),
			respondedAt: Date.now(),
			contentRaw: '',
		};
		try {
			const body = await response.json();
			entry.id = body?.id;
			entry.parent = body?.parent;
			entry.contentRaw = body?.content?.raw ?? '';
		} catch {}
		entries.push( entry );
	} );
	return entries;
}

function requestContent( entry ) {
	try {
		return JSON.parse( entry.requestPostData )?.content ?? '';
	} catch {}
	return new URLSearchParams( entry.requestPostData ).get( 'content' ) ?? '';
}

function summarizeTrace( entries, markerA, markerB, label ) {
	const candidates = entries
		.filter( ( entry ) => entry.label === label )
		.map( ( entry ) => {
			const request = String( requestContent( entry ) );
			const response = String( entry.responseContentRaw ?? '' );
			return {
				...entry,
				requestHasA: request.includes( markerA ),
				requestHasB: request.includes( markerB ),
				responseHasA: response.includes( markerA ),
				responseHasB: response.includes( markerB ),
			};
		} );
	return (
		candidates
			.slice()
			.reverse()
			.find( ( item ) => item.requestHasA || item.requestHasB ) ??
		candidates.at( -1 )
	);
}

async function waitForSyncRoom( state, room, label, timeout = 35000 ) {
	const started = Date.now();
	while ( Date.now() - started < timeout ) {
		if ( state.count >= 2 && state.rooms.has( room ) ) {
			return;
		}
		await sleep( 150 );
	}
	throw new Error(
		`${ label } did not observe ${ room }; count=${ state.count }, rooms=${ Array.from(
			state.rooms
		).join( ', ' ) }`
	);
}

async function login( context ) {
	const page = await context.newPage();
	await page.setViewportSize( viewport );
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( adminUser );
	await page.locator( '#user_pass' ).fill( adminPassword );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( /wp-admin/ );
	return page;
}

async function openEditor( page, postId ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.waitForFunction(
		() =>
			window._wpCollaborationEnabled === true &&
			window.wp?.data &&
			window.wp?.blocks,
		undefined,
		{ timeout: 45000 }
	);
	await page.evaluate( () => {
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await page.waitForFunction(
		( id ) => {
			const select = window.wp.data.select;
			return (
				select( 'core/editor' ).getCurrentPostId() === Number( id ) &&
				select( 'core' ).hasFinishedResolution( 'getEntityRecord', [
					'postType',
					'post',
					Number( id ),
				] ) &&
				! select( 'core/editor' ).isSavingPost()
			);
		},
		postId,
		{ timeout: 45000 }
	);
	await page.waitForFunction(
		() => document.querySelector( 'iframe[name="editor-canvas"]' ),
		undefined,
		{ timeout: 45000 }
	);
}

async function waitForMutualDiscovery( pageA, pageB ) {
	await Promise.all(
		[ pageA, pageB ].map( ( page ) =>
			page
				.getByRole( 'button', { name: /Collaborators list/ } )
				.waitFor( { timeout: 30000 } )
		)
	);
}

function editorFrame( page ) {
	const frame = page.frame( { name: 'editor-canvas' } );
	if ( ! frame ) {
		throw new Error( 'Editor iframe is not available.' );
	}
	return frame;
}

async function appendParagraphWithKeyboard( page, marker ) {
	await page.bringToFront().catch( () => {} );
	const frame = editorFrame( page );
	const editable = frame
		.locator( '[data-type="core/paragraph"][contenteditable="true"]' )
		.first();
	await editable.waitFor( { state: 'visible', timeout: 30000 } );
	await editable.click( { force: true } );
	await editable.press( 'End' );
	await editable.press( 'Enter' );
	await page.keyboard.type( marker, { delay: 4 } );
	await page.waitForFunction(
		( expected ) =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some( ( block ) =>
					String( block.attributes?.content ?? '' ).includes( expected )
				),
		marker,
		{ timeout: 20000 }
	);
}

async function saveDraftWithToolbar( page ) {
	const button = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: /^(Save draft|Save|Update|Publish)$/ } )
		.last();
	await button.waitFor( { state: 'visible', timeout: 30000 } );
	await page.waitForFunction(
		() => window.wp.data.select( 'core/editor' ).isEditedPostDirty(),
		undefined,
		{ timeout: 30000 }
	);
	await button.click();
	await page.waitForFunction(
		() => {
			const editor = window.wp.data.select( 'core/editor' );
			return (
				! editor.isSavingPost() &&
				! editor.isAutosavingPost() &&
				! editor.isEditedPostDirty()
			);
		},
		undefined,
		{ timeout: 30000 }
	);
	await page.waitForTimeout( 300 );
}

async function editorHasText( page, marker ) {
	return page.evaluate(
		( expected ) =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some( ( block ) =>
					String( block.attributes?.content ?? '' ).includes( expected )
				),
		marker
	);
}

async function readEditorState( pageA, pageB, markerA, markerB ) {
	return {
		aHasA: await editorHasText( pageA, markerA ),
		aHasB: await editorHasText( pageA, markerB ),
		bHasA: await editorHasText( pageB, markerA ),
		bHasB: await editorHasText( pageB, markerB ),
	};
}

function hasBothMarkers( state ) {
	return state.aHasA && state.aHasB && state.bHasA && state.bHasB;
}

async function waitForBothEditorsToHaveBoth(
	pageA,
	pageB,
	markerA,
	markerB,
	timeout = 90000
) {
	const started = Date.now();
	while ( Date.now() - started < timeout ) {
		const state = await readEditorState( pageA, pageB, markerA, markerB );
		if ( hasBothMarkers( state ) ) {
			return state;
		}
		await sleep( 500 );
	}
	return readEditorState( pageA, pageB, markerA, markerB );
}

async function waitForEditorText( page, marker, timeout = 45000 ) {
	const started = Date.now();
	while ( Date.now() - started < timeout ) {
		if ( await editorHasText( page, marker ) ) {
			return true;
		}
		await sleep( 500 );
	}
	return false;
}

async function restApiFetch( page, apiPath ) {
	return page.evaluate( async ( path ) => {
		if ( window.wp?.apiFetch ) {
			return window.wp.apiFetch( { path } );
		}
		const nonce = window.wpApiSettings?.nonce;
		const response = await fetch( `/wp-json${ path }`, {
			credentials: 'include',
			headers: nonce ? { 'X-WP-Nonce': nonce } : {},
		} );
		if ( ! response.ok ) {
			throw new Error( `REST read failed for ${ path }: ${ response.status }` );
		}
		return response.json();
	}, apiPath );
}

async function restPostContent( page, postId ) {
	const record = await restApiFetch(
		page,
		`/wp/v2/posts/${ postId }?context=edit`
	);
	return record?.content?.raw ?? record?.content?.rendered ?? '';
}

function wpCliPostContent( postId ) {
	return runWpCli( [ 'post', 'get', String( postId ), '--field=post_content' ] );
}

function dbPostContent( postId ) {
	const prefix = runWpCli( [ 'db', 'prefix' ] );
	return runWpCli( [
		'db',
		'query',
		`SELECT post_content FROM ${ prefix }posts WHERE ID = ${ Number(
			postId
		) };`,
		'--skip-column-names',
	] );
}

function markerStatus( content, markerA, markerB ) {
	return {
		hasA: String( content ).includes( markerA ),
		hasB: String( content ).includes( markerB ),
		length: String( content ).length,
	};
}

function markerStatus3( content, markerA, markerB, markerC ) {
	return {
		hasA: String( content ).includes( markerA ),
		hasB: String( content ).includes( markerB ),
		hasC: String( content ).includes( markerC ),
		length: String( content ).length,
	};
}

async function persistedStatus( page, postId, markerA, markerB ) {
	const [ rest, cli, db ] = await Promise.all( [
		restPostContent( page, postId ),
		Promise.resolve( wpCliPostContent( postId ) ),
		Promise.resolve( dbPostContent( postId ) ),
	] );
	return {
		rest: markerStatus( rest, markerA, markerB ),
		wpCli: markerStatus( cli, markerA, markerB ),
		db: markerStatus( db, markerA, markerB ),
	};
}

function assertPersistedLoss( status, label ) {
	for ( const channel of [ 'rest', 'wpCli', 'db' ] ) {
		if ( status[ channel ].hasA || ! status[ channel ].hasB ) {
			throw new Error(
				`${ label } persisted content mismatch for ${ channel }: ${ JSON.stringify(
					status[ channel ]
				) }`
			);
		}
	}
}

async function restAutosaves( page, postId ) {
	return restApiFetch( page, `/wp/v2/posts/${ postId }/autosaves?context=edit` );
}

function rawContentFromRestRecord( record ) {
	return record?.content?.raw ?? record?.content?.rendered ?? record?.content ?? '';
}

function summarizeAutosaves( records, markerA, markerB, markerC = undefined ) {
	return records.map( ( record ) => {
		const content = String( rawContentFromRestRecord( record ) );
		return {
			id: record.id,
			parent: record.parent,
			slug: record.slug,
			type: record.type,
			status: record.status,
			modified: record.modified,
			hasA: content.includes( markerA ),
			hasB: content.includes( markerB ),
			hasC: markerC === undefined ? undefined : content.includes( markerC ),
			contentLength: content.length,
			editLink: record?._links?.[ 'wp:action-edit' ]?.[ 0 ]?.href,
		};
	} );
}

async function waitForAutosaveWithBoth( page, postId, markerA, markerB ) {
	const started = Date.now();
	let latest = [];
	while ( Date.now() - started < autosaveWaitMs ) {
		latest = summarizeAutosaves(
			await restAutosaves( page, postId ),
			markerA,
			markerB
		);
		if ( latest.some( ( autosave ) => autosave.hasA && autosave.hasB ) ) {
			return latest;
		}
		await sleep( 1500 );
	}
	throw new Error(
		`No autosave contained both markers after ${ autosaveWaitMs }ms: ${ JSON.stringify(
			latest
		) }`
	);
}

async function waitForBadAutosave( page, postId, markerA, markerB, markerC ) {
	const started = Date.now();
	let latest = [];
	while ( Date.now() - started < autosaveWaitMs ) {
		latest = summarizeAutosaves(
			await restAutosaves( page, postId ),
			markerA,
			markerB,
			markerC
		);
		if (
			latest.some(
				( autosave ) =>
					! autosave.hasA && autosave.hasB && autosave.hasC
			)
		) {
			return latest;
		}
		await sleep( 1500 );
	}
	throw new Error(
		`No stale autosave with B+C and no A after ${ autosaveWaitMs }ms: ${ JSON.stringify(
			latest
		) }`
	);
}

function autosaveNotice( page ) {
	return page
		.locator( '.components-notice' )
		.filter( {
			hasText:
				'There is an autosave of this post that is more recent than the version below.',
		} )
		.first();
}

async function waitForRemoteAutosaveNotice( page ) {
	const notice = autosaveNotice( page );
	await notice.waitFor( { state: 'visible', timeout: 30000 } );
	const viewLink = notice.getByRole( 'link', { name: 'View the autosave' } );
	await viewLink.waitFor( { state: 'visible', timeout: 10000 } );
	return {
		text: ( await notice.textContent() )?.replace( /\s+/g, ' ' ).trim() ?? '',
		href: await viewLink.getAttribute( 'href' ),
	};
}

async function clickRemoteAutosaveNotice( page ) {
	const notice = autosaveNotice( page );
	const link = notice.getByRole( 'link', { name: 'View the autosave' } );
	const href = await link.getAttribute( 'href' );
	const beforeUrl = page.url();
	await link.click();
	await page
		.waitForFunction( ( oldUrl ) => window.location.href !== oldUrl, beforeUrl, {
			timeout: 30000,
		} )
		.catch( () => {} );
	await page.waitForLoadState( 'domcontentloaded' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' ).catch( () => {} );
	await page.getByText( /Restore This Autosave|Compare Revisions|Autosave/i )
		.first()
		.waitFor( { timeout: 30000 } )
		.catch( () => {} );
	return {
		href,
		urlAfterClick: page.url(),
	};
}

async function pageTextHas( page, marker ) {
	return page.locator( 'body' ).evaluate(
		( body, expected ) => body.innerText.includes( expected ),
		marker
	);
}

async function pageBodyExcerpt( page ) {
	return page.locator( 'body' ).evaluate( ( body ) =>
		body.innerText.replace( /\s+/g, ' ' ).trim().slice( 0, 500 )
	);
}

async function waitForServerText( page, postId, marker ) {
	await page.waitForFunction(
		async ( { id, expected } ) => {
			const record = await window.wp.apiFetch( {
				path: `/wp/v2/posts/${ id }?context=edit`,
			} );
			return String( record?.content?.raw ?? '' ).includes( expected );
		},
		{ id: postId, expected: marker },
		{ timeout: 30000 }
	);
}

function createPost( scenarioName ) {
	const postCreateOutput = runWpCli( [
		'post',
		'create',
		'--post_type=post',
		'--post_status=publish',
		`--post_title=${ scenarioName } ${ Date.now() }`,
		`--post_content=${ paragraphMarkup( 'Initial body.' ) }`,
		'--porcelain',
	] );
	const postId = Number( postCreateOutput.match( /^\d+$/m )?.[ 0 ] );
	if ( ! postId ) {
		throw new Error( `Could not parse created post ID: ${ postCreateOutput }` );
	}
	return postId;
}

async function setEvidencePage( page, title, lines ) {
	await page.setViewportSize( viewport );
	const htmlLines = lines
		.flatMap( ( line ) => wrapText( line, 58 ) )
		.map( ( line ) => `<p>${ escapeXml( line ) }</p>` )
		.join( '' );
	await page.setContent( `<!doctype html>
		<html>
			<head>
				<style>
					body {
						margin: 0;
						font-family: Arial, sans-serif;
						color: #111827;
						background: #f8fafc;
					}
					main {
						padding: 42px;
					}
					h1 {
						margin: 0 0 28px;
						font-size: 38px;
						line-height: 1.12;
					}
					p {
						margin: 0 0 16px;
						font-family: Menlo, Consolas, monospace;
						font-size: 22px;
						line-height: 1.38;
					}
				</style>
			</head>
			<body>
				<main>
					<h1>${ escapeXml( title ) }</h1>
					${ htmlLines }
				</main>
			</body>
		</html>` );
}

function panelText( title, lines, left, top, width, titleColor ) {
	const wrapped = lines.flatMap( ( line ) => wrapText( line, 48 ) ).slice( 0, 9 );
	return `
		<rect x="${ left }" y="${ top }" width="${ width }" height="328" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
		<text x="${ left + 20 }" y="${
		top + 36
	}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${ titleColor }">${ escapeXml(
		title
	) }</text>
		${ wrapped
			.map(
				( line, index ) =>
					`<text x="${ left + 20 }" y="${
						top + 76 + index * 28
					}" font-family="Menlo, Consolas, monospace" font-size="19" fill="#111827">${ escapeXml(
						line
					) }</text>`
			)
			.join( '' ) }`;
}

async function captureFrame( options ) {
	const {
		pageA,
		pageB,
		index,
		title,
		status,
		action,
		evidence,
		check,
		tone = 'bug',
		labelA = 'Window A: same admin account, saved A first',
		labelB = 'Window B: same admin account, saved stale B',
	} = options;
	const [ shotA, shotB ] = await Promise.all( [
		pageA.screenshot( { type: 'png' } ),
		pageB.screenshot( { type: 'png' } ),
	] );
	const toneColor = tone === 'bug' ? '#b91c1c' : '#047857';
	const toneFill = tone === 'bug' ? '#fee2e2' : '#dcfce7';
	const topSvg = `
		<svg width="1920" height="${ topHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="1920" height="${ topHeight }" fill="#0f172a"/>
			<rect x="24" y="20" width="182" height="44" rx="6" fill="${ toneFill }"/>
			<text x="44" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${ toneColor }">STEP ${ index }/${ totalSteps }</text>
			<text x="232" y="50" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#f8fafc">${ escapeXml(
		title
	) }</text>
			<text x="232" y="86" font-family="Arial, sans-serif" font-size="22" fill="#cbd5e1">${ escapeXml(
		status
	) }</text>
		</svg>`;
	const labelSvg = `
		<svg width="1920" height="${ labelHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="960" height="${ labelHeight }" fill="#064e3b"/>
			<rect x="960" width="960" height="${ labelHeight }" fill="#7c2d12"/>
			<text x="24" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">${ escapeXml(
				labelA
			) }</text>
			<text x="984" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">${ escapeXml(
				labelB
			) }</text>
		</svg>`;
	const logSvg = `
		<svg width="1920" height="${ logHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="1920" height="${ logHeight }" fill="#e2e8f0"/>
			${ panelText( 'Action', action, 24, 36, 600, '#0f172a' ) }
			${ panelText( 'Evidence', evidence, 660, 36, 600, '#0f766e' ) }
			${ panelText( 'Meaning', check, 1296, 36, 600, toneColor ) }
		</svg>`;

	await sharp( {
		create: {
			width: 1920,
			height: frameHeight,
			channels: 4,
			background: '#ffffff',
		},
	} )
		.composite( [
			{ input: Buffer.from( topSvg ), left: 0, top: 0 },
			{ input: Buffer.from( labelSvg ), left: 0, top: topHeight },
			{ input: shotA, left: 0, top: topHeight + labelHeight },
			{ input: shotB, left: 960, top: topHeight + labelHeight },
			{
				input: Buffer.from( logSvg ),
				left: 0,
				top: topHeight + labelHeight + viewport.height,
			},
		] )
		.png()
		.toFile( path.join( framesDir, `frame-${ String( index ).padStart( 3, '0' ) }.png` ) );
}

function renderVideo() {
	execFileSync(
		'ffmpeg',
		[
			'-n',
			'-framerate',
			`1/${ frameSeconds }`,
			'-i',
			path.join( framesDir, 'frame-%03d.png' ),
			'-vf',
			'fps=30',
			'-c:v',
			'libx264',
			'-pix_fmt',
			'yuv420p',
			videoPath,
		],
		{ stdio: 'inherit' }
	);
}

function ffprobeVideo() {
	return JSON.parse(
		execFileSync(
			'ffprobe',
			[
				'-v',
				'error',
				'-show_entries',
				'stream=codec_name,width,height,avg_frame_rate,nb_frames:format=duration,size,bit_rate',
				'-of',
				'json',
				videoPath,
			],
			{ encoding: 'utf8' }
		)
	);
}

async function frameFiles() {
	return ( await fs.readdir( framesDir ) )
		.filter( ( file ) => /^frame-\d+\.png$/.test( file ) )
		.sort()
		.map( ( file ) => path.join( framesDir, file ) );
}

async function validateScreenshots() {
	const files = await frameFiles();
	const spotChecks = [];
	for ( const file of files ) {
		const metadata = await sharp( file ).metadata();
		spotChecks.push( {
			file: path.basename( file ),
			width: metadata.width,
			height: metadata.height,
			sizeBytes: ( await fs.stat( file ) ).size,
		} );
	}
	return {
		checkedFrameCount: files.length,
		expectedFrameCount: totalSteps,
		expectedFrameWidth: 1920,
		expectedFrameHeight: frameHeight,
		allFramesHaveExpectedSize: spotChecks.every(
			( check ) =>
				check.width === 1920 && check.height === frameHeight && check.sizeBytes > 0
		),
		spotChecks,
	};
}

async function ensureOutputsDoNotExist() {
	for ( const target of [ framesDir, videoPath, evidencePath ] ) {
		try {
			await fs.lstat( target );
		} catch ( error ) {
			if ( error.code === 'ENOENT' ) {
				continue;
			}
			throw error;
		}
		throw new Error(
			`Refusing to overwrite existing artifact: ${ target }. Pick a new output path.`
		);
	}
}

async function writeEvidence( result ) {
	const evidence = {
		...result,
		generatedAt: new Date().toISOString(),
		scriptPath: __filename,
		framesDir,
		videoPath,
		evidencePath,
		screenshotValidation: await validateScreenshots(),
		ffprobe: ffprobeVideo(),
	};
	await fs.writeFile( evidencePath, JSON.stringify( evidence, null, 2 ), {
		flag: 'wx',
	} );
	return evidence;
}

async function runAttempt( browser, attempt ) {
	await fs.rm( framesDir, { force: true, recursive: true } );
	await fs.mkdir( framesDir, { recursive: true } );

	const runId = `${ Date.now() }-${ process.pid }-${ attempt }`;
	const markerA = `A-SAVED-THEN-LOST-${ runId }`;
	const markerB = `B-STAYS-SAVED-${ runId }`;
	const markerC = `C-AUTOSAVED-WHILE-STALE-${ runId }`;
	const postId = createPost( 'RTC live bad autosave e2e' );
	const room = `postType/post:${ postId }`;
	let contextA = await browser.newContext( { baseURL } );
	let contextB = await browser.newContext( { baseURL } );
	const pageA = await login( contextA );
	const pageB = await login( contextB );
	const evidencePage = await contextB.newPage();
	const syncA = syncObserver( pageA );
	const syncB = syncObserver( pageB );
	const saveTraceA = attachSaveTrace( pageA, 'A', postId );
	const saveTraceB = attachSaveTrace( pageB, 'B', postId );
	const autosaveTraceA = attachAutosaveTrace( pageA, 'A', postId );
	const autosaveTraceB = attachAutosaveTrace( pageB, 'B', postId );
	let blockAsync = false;
	let blockBsync = false;
	let step = 1;

	await pageA.route( /wp-sync/, async ( route ) => {
		while ( blockAsync ) {
			await sleep( 250 );
		}
		return route.continue();
	} );
	await pageB.route( /wp-sync/, async ( route ) => {
		while ( blockBsync ) {
			await sleep( 250 );
		}
		return route.continue();
	} );

	try {
		await Promise.all( [ openEditor( pageA, postId ), openEditor( pageB, postId ) ] );
		await waitForMutualDiscovery( pageA, pageB );
		await Promise.all( [
			waitForSyncRoom( syncA, room, 'Window A' ),
			waitForSyncRoom( syncB, room, 'Window B' ),
		] );
		await captureFrame( {
			pageA,
			pageB,
			index: step++,
			title: 'RTC Stale Save Setup',
			status: 'Both same-account editor windows are in the active RTC room.',
			action: [
				`Created published post ${ postId }.`,
				'Opened it in two editor windows.',
				'Confirmed collaborator UI and /wp-sync room traffic.',
			],
			evidence: [
				`Current trunk: ${ runGit( [ 'rev-parse', '--short', 'HEAD' ] ) }`,
				`Room: ${ room }`,
				`/wp-sync counts: A=${ syncA.count }, B=${ syncB.count }`,
			],
			check: [
				'Autosave remains enabled.',
				'No notices are hidden or suppressed.',
				'Next, B polling is delayed to create a stale save.',
			],
		} );

		blockBsync = true;
		await appendParagraphWithKeyboard( pageA, markerA );
		await saveDraftWithToolbar( pageA );
		await waitForServerText( pageA, postId, markerA );
		const bHasABeforeSave = await editorHasText( pageB, markerA );
		await captureFrame( {
			pageA,
			pageB,
			index: step++,
			title: 'A Saves While B Is Stale',
			status: 'A is saved in canonical post_content; B has not received A.',
			action: [
				'Held B /wp-sync polling responses.',
				'Window A typed marker A.',
				'Window A clicked the normal toolbar save button.',
			],
			evidence: [
				'REST confirms the server contains A.',
				`Window B contains A before B save: ${ bHasABeforeSave }`,
				`A marker begins: ${ markerA.slice( 0, 24 ) }...`,
			],
			check: [
				'This creates the stale editor state.',
				'B can now save without A in its local block tree.',
			],
		} );
		if ( bHasABeforeSave ) {
			throw new Error( 'B already had A before stale save.' );
		}

		blockAsync = true;
		await appendParagraphWithKeyboard( pageB, markerB );
		const bEditedHasA = await editorHasText( pageB, markerA );
		await saveDraftWithToolbar( pageB );
		const afterBSaveStatus = await persistedStatus(
			pageB,
			postId,
			markerA,
			markerB
		);
		assertPersistedLoss( afterBSaveStatus, 'after B save' );
		const saveCountAfterBSave = saveTraceA.length + saveTraceB.length;
		const aSave = summarizeTrace(
			[ ...saveTraceA, ...saveTraceB ],
			markerA,
			markerB,
			'A'
		);
		const bSave = summarizeTrace(
			[ ...saveTraceA, ...saveTraceB ],
			markerA,
			markerB,
			'B'
		);
		await captureFrame( {
			pageA,
			pageB,
			index: step++,
			title: 'B Save Overwrites Canonical Content',
			status: 'Immediately after B saves, post_content has B but no A.',
			action: [
				'Window B typed marker B while still missing A.',
				'Window B clicked the normal toolbar save button.',
				'The script re-read canonical content three ways.',
			],
			evidence: [
				`B editor had A before save: ${ bEditedHasA }`,
				`A save request: A=${ aSave?.requestHasA }, B=${ aSave?.requestHasB }`,
				`B save request: A=${ bSave?.requestHasA }, B=${ bSave?.requestHasB }`,
			],
			check: [
				`REST post_content: A=${ afterBSaveStatus.rest.hasA }, B=${ afterBSaveStatus.rest.hasB }`,
				`WP-CLI post_content: A=${ afterBSaveStatus.wpCli.hasA }, B=${ afterBSaveStatus.wpCli.hasB }`,
				`DB post_content: A=${ afterBSaveStatus.db.hasA }, B=${ afterBSaveStatus.db.hasB }`,
			],
		} );

		blockAsync = true;
		await appendParagraphWithKeyboard( pageB, markerC );
		const bStateBeforeAutosave = {
			hasA: await editorHasText( pageB, markerA ),
			hasB: await editorHasText( pageB, markerB ),
			hasC: await editorHasText( pageB, markerC ),
		};
		const autosavesBeforeBadWait = summarizeAutosaves(
			await restAutosaves( pageB, postId ),
			markerA,
			markerB,
			markerC
		);
		await setEvidencePage( evidencePage, 'Waiting For Real Autosave', [
			'Window A remains visible but its /wp-sync poll is also held.',
			'Window B is still missing A because its /wp-sync poll is held.',
			'Window B typed C as a normal unsaved edit.',
			'No script calls the autosave action directly.',
			`B editor: A=${ bStateBeforeAutosave.hasA }, B=${ bStateBeforeAutosave.hasB }, C=${ bStateBeforeAutosave.hasC }`,
		] );
		await captureFrame( {
			pageA: pageB,
			pageB: evidencePage,
			index: step++,
			title: 'B Makes One More Normal Edit',
			status: 'B is dirty and still stale; the next save is the real autosave timer.',
			action: [
				'Kept Window A visible but held its /wp-sync poll.',
				'Kept Window B /wp-sync delayed.',
				'Window B typed marker C and did not click Save.',
			],
			evidence: [
				`B editor before autosave: A=${ bStateBeforeAutosave.hasA }, B=${ bStateBeforeAutosave.hasB }, C=${ bStateBeforeAutosave.hasC }`,
				`Autosave rows before wait: ${ autosavesBeforeBadWait.length }`,
				`Main post saves so far: ${ saveTraceA.length + saveTraceB.length }`,
			],
			check: [
				'This is still normal editor usage.',
				'The only artificial part is the slow B sync poll.',
				'Holding A sync prevents A from writing a good autosave.',
				'If autosave fires now, it can only capture B+C, not A.',
			],
			labelA: 'Window B: stale editor with unsaved C',
			labelB: 'Evidence panel',
		} );
		if (
			bStateBeforeAutosave.hasA ||
			! bStateBeforeAutosave.hasB ||
			! bStateBeforeAutosave.hasC
		) {
			throw new Error(
				`Unexpected B state before autosave: ${ JSON.stringify(
					bStateBeforeAutosave
				) }`
			);
		}

		const badAutosaves = await waitForBadAutosave(
			pageB,
			postId,
			markerA,
			markerB,
			markerC
		);
		const afterBadAutosaveStatus = await persistedStatus(
			pageB,
			postId,
			markerA,
			markerB
		);
		assertPersistedLoss( afterBadAutosaveStatus, 'after bad autosave wait' );
		const canonicalAfterBadAutosave = await restPostContent( pageB, postId );
		const canonicalAfterBadAutosave3 = markerStatus3(
			canonicalAfterBadAutosave,
			markerA,
			markerB,
			markerC
		);
		const laterPostSaveRequests =
			saveTraceA.length + saveTraceB.length - saveCountAfterBSave;
		if ( laterPostSaveRequests !== 0 ) {
			throw new Error(
				`Unexpected later main post save requests: ${ laterPostSaveRequests }`
			);
		}
		const badAutosaveMatches = badAutosaves.filter(
			( item ) => ! item.hasA && item.hasB && item.hasC
		);
		await setEvidencePage( evidencePage, 'Bad Autosave Exists', [
			`Bad autosave rows: ${ badAutosaveMatches.length }`,
			`Canonical post: A=${ canonicalAfterBadAutosave3.hasA }, B=${ canonicalAfterBadAutosave3.hasB }, C=${ canonicalAfterBadAutosave3.hasC }`,
			`Autosave row: A=${ badAutosaveMatches[ 0 ]?.hasA }, B=${ badAutosaveMatches[ 0 ]?.hasB }, C=${ badAutosaveMatches[ 0 ]?.hasC }`,
			`Later main post saves: ${ laterPostSaveRequests }`,
			`Autosave POSTs seen from B: ${ autosaveTraceB.length }`,
		] );
		await captureFrame( {
			pageA: pageB,
			pageB: evidencePage,
			index: step++,
			title: 'Autosave Captures The Stale Editor',
			status: 'The automatic autosave is newer than the post and is also missing A.',
			action: [
				'Waited for the built-in autosave timer.',
				'B /wp-sync was still delayed during the wait.',
				'No user clicked Save after marker C.',
				'Re-read autosaves and canonical post_content.',
			],
			evidence: [
				`Bad autosave rows: ${ badAutosaveMatches.length }`,
				`Autosave: A=${ badAutosaveMatches[ 0 ]?.hasA }, B=${ badAutosaveMatches[ 0 ]?.hasB }, C=${ badAutosaveMatches[ 0 ]?.hasC }`,
				`B autosave POSTs: ${ autosaveTraceB.length }`,
				`Later main post saves: ${ laterPostSaveRequests }`,
			],
			check: [
				`REST post_content: A=${ afterBadAutosaveStatus.rest.hasA }, B=${ afterBadAutosaveStatus.rest.hasB }`,
				`Canonical has C=${ canonicalAfterBadAutosave3.hasC }`,
				'Autosave has B+C but still lacks lost A.',
			],
			labelA: 'Window B: real autosave just ran',
			labelB: 'Evidence panel',
		} );
		if (
			canonicalAfterBadAutosave3.hasA ||
			! canonicalAfterBadAutosave3.hasB ||
			canonicalAfterBadAutosave3.hasC
		) {
			throw new Error(
				`Canonical changed unexpectedly after autosave: ${ JSON.stringify(
					canonicalAfterBadAutosave3
				) }`
			);
		}

		const originalBeforeCloseState = await readEditorState(
			pageA,
			pageB,
			markerA,
			markerB
		);
		const originalBeforeCloseHasC = {
			aHasC: await editorHasText( pageA, markerC ),
			bHasC: await editorHasText( pageB, markerC ),
		};
		await captureFrame( {
			pageA,
			pageB,
			index: step++,
			title: 'Both Original Windows Are Still Visible',
			status: 'The next action closes both original editor windows.',
			action: [
				'Window A was kept open and visible through the bad autosave.',
				'Window B produced the bad autosave while still stale.',
				'Now both original editor windows are closed.',
			],
			evidence: [
				`Window A: A=${ originalBeforeCloseState.aHasA }, B=${ originalBeforeCloseState.aHasB }, C=${ originalBeforeCloseHasC.aHasC }`,
				`Window B: A=${ originalBeforeCloseState.bHasA }, B=${ originalBeforeCloseState.bHasB }, C=${ originalBeforeCloseHasC.bHasC }`,
				`Bad autosave id: ${ badAutosaveMatches[ 0 ]?.id ?? 'n/a' }`,
			],
			check: [
				'Both original windows are visible before close.',
				'Window A cannot have created a good autosave: its sync was held.',
				'The following frame marks both windows closed.',
			],
			labelA: 'Original Window A: visible before close',
			labelB: 'Original Window B: visible before close',
		} );

		blockAsync = false;
		blockBsync = false;
		await Promise.all( [ contextA.close(), contextB.close() ] );
		contextA = null;
		contextB = null;

		const closedContext = await browser.newContext( { baseURL } );
		const closedPageA = await closedContext.newPage();
		const closedPageB = await closedContext.newPage();
		await Promise.all( [
			setEvidencePage( closedPageA, 'Original Window A Closed', [
				'The original Window A page/context has been closed.',
				'This frame is an explicit transition marker because a closed browser page cannot be screenshotted.',
				'The next frame opens a fresh Window A on the same post.',
			] ),
			setEvidencePage( closedPageB, 'Original Window B Closed', [
				'The original Window B page/context has been closed.',
				'The bad autosave already exists before this close.',
				'The next frame opens a fresh Window B on the same post.',
			] ),
		] );
		await captureFrame( {
			pageA: closedPageA,
			pageB: closedPageB,
			index: step++,
			title: 'Both Original Windows Are Closed',
			status: 'Both original editor contexts are gone before the reopen.',
			action: [
				'Closed original Window A.',
				'Closed original Window B.',
				'No original editor window remains open.',
			],
			evidence: [
				`Bad autosave persisted: A=${ badAutosaveMatches[ 0 ]?.hasA }, B=${ badAutosaveMatches[ 0 ]?.hasB }, C=${ badAutosaveMatches[ 0 ]?.hasC }`,
				`Canonical persisted: A=${ canonicalAfterBadAutosave3.hasA }, B=${ canonicalAfterBadAutosave3.hasB }, C=${ canonicalAfterBadAutosave3.hasC }`,
				`Later main post saves: ${ laterPostSaveRequests }`,
			],
			check: [
				'The reopen starts from saved post_content plus the bad autosave row.',
				'No hidden original window can heal the autosave after this point.',
			],
			labelA: 'Original Window A closed',
			labelB: 'Original Window B closed',
		} );
		await closedContext.close();

		const freshContextA = await browser.newContext( { baseURL } );
		const freshContextB = await browser.newContext( { baseURL } );
		const freshPageA = await login( freshContextA );
		const freshPageB = await login( freshContextB );
		const freshSyncA = syncObserver( freshPageA );
		const freshSyncB = syncObserver( freshPageB );
		const freshSaveTraceA = attachSaveTrace( freshPageA, 'freshA', postId );
			const freshSaveTraceB = attachSaveTrace( freshPageB, 'freshB', postId );
			const freshAutosaveTraceA = attachAutosaveTrace( freshPageA, 'freshA', postId );
			const freshAutosaveTraceB = attachAutosaveTrace( freshPageB, 'freshB', postId );
			let holdFreshSync = true;
			let freshNotice;
			let reopenedState;
			let freshReopenStatus;
		let clickResult;
		let autosavePageHasA;
		let autosavePageHasB;
		let autosavePageExcerpt;
		let afterClickStatus;
		let editorBAfterClick;
			let finalReloadState;
			let finalReloadStatus;
			let reopenedHasC;
			let autosavePageHasC;
			let finalReloadHasC;

			try {
				await Promise.all(
					[ freshPageA, freshPageB ].map( ( page ) =>
						page.route( /wp-sync/, async ( route ) => {
							while ( holdFreshSync ) {
								await sleep( 250 );
							}
							return route.continue();
						} )
					)
				);
				await Promise.all( [
					openEditor( freshPageA, postId ),
					openEditor( freshPageB, postId ),
			] );
			await Promise.all( [
				waitForEditorText( freshPageA, markerB, 10000 ),
				waitForEditorText( freshPageB, markerB, 10000 ),
			] );
			freshNotice = await waitForRemoteAutosaveNotice( freshPageA );
			reopenedState = await readEditorState(
				freshPageA,
				freshPageB,
				markerA,
				markerB
				);
				reopenedHasC = {
					aHasC: await editorHasText( freshPageA, markerC ),
					bHasC: await editorHasText( freshPageB, markerC ),
				};
				freshReopenStatus = await persistedStatus(
					freshPageA,
				postId,
				markerA,
				markerB
				);
				assertPersistedLoss( freshReopenStatus, 'fresh reopen' );
				if ( reopenedState.aHasA || reopenedState.bHasA ) {
				throw new Error(
					`Fresh reopen unexpectedly had A in editor state: ${ JSON.stringify(
						reopenedState
					) }`
				);
			}
				await captureFrame( {
					pageA: freshPageA,
					pageB: freshPageB,
					index: step++,
					title: 'Fresh Reopen Shows The Autosave Notice',
					status: 'All original tabs were closed; fresh /wp-sync is held so it cannot mask the saved load.',
					action: [
						'Closed both original editor contexts.',
						'Opened the same post in two fresh windows.',
						'Held fresh /wp-sync responses during this evidence window.',
						'Waited for the built-in autosave notice.',
						'No CSS, notice hiding, or autosave disabling is used.',
					],
				evidence: [
					`Notice href: ${ freshNotice.href ?? '(missing)' }`,
					`Fresh editor A: A=${ reopenedState.aHasA }, B=${ reopenedState.aHasB }`,
					`Fresh editor B: A=${ reopenedState.bHasA }, B=${ reopenedState.bHasB }`,
					`Fresh editors have C: A=${ reopenedHasC.aHasC }, B=${ reopenedHasC.bHasC }`,
					`Fresh /wp-sync counts: A=${ freshSyncA.count }, B=${ freshSyncB.count }`,
				],
					check: [
						`Fresh REST: A=${ freshReopenStatus.rest.hasA }, B=${ freshReopenStatus.rest.hasB }`,
						`Fresh WP-CLI: A=${ freshReopenStatus.wpCli.hasA }, B=${ freshReopenStatus.wpCli.hasB }`,
						`Fresh DB: A=${ freshReopenStatus.db.hasA }, B=${ freshReopenStatus.db.hasB }`,
						'The notice is real and visible; only RTC masking is paused.',
					],
				labelA: 'Fresh Window A: autosave notice visible',
				labelB: 'Fresh Window B: same post after all tabs closed',
			} );

			clickResult = await clickRemoteAutosaveNotice( freshPageA );
			await freshPageA
				.getByText( markerC, { exact: false } )
				.first()
				.scrollIntoViewIfNeeded( { timeout: 3000 } )
				.catch( () => {} );
			autosavePageHasA = await pageTextHas( freshPageA, markerA );
			autosavePageHasB = await pageTextHas( freshPageA, markerB );
			autosavePageHasC = await pageTextHas( freshPageA, markerC );
			autosavePageExcerpt = await pageBodyExcerpt( freshPageA );
			afterClickStatus = await persistedStatus(
				freshPageA,
				postId,
				markerA,
				markerB
			);
			assertPersistedLoss( afterClickStatus, 'after autosave notice click' );
			editorBAfterClick = {
				hasA: await editorHasText( freshPageB, markerA ),
				hasB: await editorHasText( freshPageB, markerB ),
			};
			await captureFrame( {
				pageA: freshPageA,
				pageB: freshPageB,
				index: step++,
				title: 'Clicked The Notice Action',
				status: 'The real View the autosave link opened; no restore or save action was clicked.',
				action: [
					'Clicked the notice link: View the autosave.',
					'Captured the resulting autosave/revision screen.',
					'Left the second fresh editor open as a control.',
				],
				evidence: [
					`Clicked href: ${ clickResult.href ?? '(missing)' }`,
					`URL after click: ${ clickResult.urlAfterClick }`,
					`Autosave page: A=${ autosavePageHasA }, B=${ autosavePageHasB }, C=${ autosavePageHasC }`,
					`Fresh editor B still has A=${ editorBAfterClick.hasA}, B=${ editorBAfterClick.hasB }`,
				],
				check: [
					`REST post_content: A=${ afterClickStatus.rest.hasA }, B=${ afterClickStatus.rest.hasB }`,
					`WP-CLI post_content: A=${ afterClickStatus.wpCli.hasA }, B=${ afterClickStatus.wpCli.hasB }`,
					`DB post_content: A=${ afterClickStatus.db.hasA }, B=${ afterClickStatus.db.hasB }`,
					`Fresh main post saves: ${
						freshSaveTraceA.length + freshSaveTraceB.length
					}`,
				],
				labelA: 'Fresh Window A: after clicking View the autosave',
				labelB: 'Fresh Window B: editor still loaded from post_content',
			} );

			await freshPageA.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
			await openEditor( freshPageA, postId );
			await waitForEditorText( freshPageA, markerB, 10000 );
			finalReloadState = await readEditorState(
				freshPageA,
				freshPageB,
				markerA,
				markerB
			);
			finalReloadHasC = {
				aHasC: await editorHasText( freshPageA, markerC ),
				bHasC: await editorHasText( freshPageB, markerC ),
			};
			finalReloadStatus = await persistedStatus(
				freshPageB,
				postId,
				markerA,
				markerB
			);
			assertPersistedLoss( finalReloadStatus, 'final reload after notice click' );
			await captureFrame( {
				pageA: freshPageA,
				pageB: freshPageB,
				index: step++,
				title: 'Autosave Click Did Not Heal The Post',
				status: 'Returning to the editor still loads the stale canonical content.',
				action: [
					'Returned from the autosave view to the editor.',
					'Re-read the saved post through REST, WP-CLI, and SQL.',
					'Checked that no fresh main post save occurred.',
				],
				evidence: [
					`Editor A after return: A=${ finalReloadState.aHasA }, B=${ finalReloadState.aHasB }`,
					`Editor B after click: A=${ finalReloadState.bHasA }, B=${ finalReloadState.bHasB }`,
					`Editors after return have C: A=${ finalReloadHasC.aHasC }, B=${ finalReloadHasC.bHasC }`,
					`Fresh autosave POSTs seen: ${
						freshAutosaveTraceA.length + freshAutosaveTraceB.length
					}`,
					`Fresh main post saves: ${
						freshSaveTraceA.length + freshSaveTraceB.length
					}`,
				],
				check: [
					`Final REST: A=${ finalReloadStatus.rest.hasA }, B=${ finalReloadStatus.rest.hasB }`,
					`Final WP-CLI: A=${ finalReloadStatus.wpCli.hasA }, B=${ finalReloadStatus.wpCli.hasB }`,
					`Final DB: A=${ finalReloadStatus.db.hasA }, B=${ finalReloadStatus.db.hasB }`,
					'Viewing the autosave did not write healed content to post_content.',
				],
				labelA: 'Fresh Window A: editor after autosave view',
				labelB: 'Fresh Window B: editor control',
			} );

			if (
				finalReloadState.aHasA ||
				finalReloadState.bHasA ||
				finalReloadHasC.aHasC ||
				finalReloadHasC.bHasC ||
				autosavePageHasA ||
				! autosavePageHasB ||
				! autosavePageHasC ||
				freshSaveTraceA.length + freshSaveTraceB.length !== 0
			) {
				throw new Error(
					`Autosave click unexpectedly healed or saved; state=${ JSON.stringify(
						finalReloadState
					) }, fresh main saves=${
						freshSaveTraceA.length + freshSaveTraceB.length
					}`
				);
			}
			} finally {
				holdFreshSync = false;
				await Promise.all( [ freshContextA.close(), freshContextB.close() ] );
			}

		renderVideo();
		return {
			videoPath,
			postId,
			markerA,
			markerB,
			markerC,
			aSave: {
				requestHasA: aSave?.requestHasA,
				requestHasB: aSave?.requestHasB,
				responseHasA: aSave?.responseHasA,
				responseHasB: aSave?.responseHasB,
			},
			bSave: {
				requestHasA: bSave?.requestHasA,
				requestHasB: bSave?.requestHasB,
				responseHasA: bSave?.responseHasA,
				responseHasB: bSave?.responseHasB,
			},
			afterBSaveStatus,
			bStateBeforeAutosave,
			badAutosaves,
			badAutosaveMatches,
			autosaveTrace: [ ...autosaveTraceA, ...autosaveTraceB ].map( ( entry ) => ( {
				label: entry.label,
				responseStatus: entry.responseStatus,
				hasA: entry.contentRaw.includes( markerA ),
				hasB: entry.contentRaw.includes( markerB ),
				hasC: entry.contentRaw.includes( markerC ),
				contentLength: entry.contentRaw.length,
			} ) ),
			afterBadAutosaveStatus,
			canonicalAfterBadAutosave3,
			originalBeforeCloseState,
			originalBeforeCloseHasC,
			syncCounts: { A: syncA.count, B: syncB.count },
			laterPostSaveRequests,
			freshNotice,
			reopenedState,
			reopenedHasC,
			freshReopenStatus,
			clickResult,
			autosavePageHasA,
			autosavePageHasB,
			autosavePageHasC,
			autosavePageExcerpt,
			afterClickStatus,
			editorBAfterClick,
			finalReloadState,
			finalReloadHasC,
			finalReloadStatus,
			freshMainPostSaveRequests: freshSaveTraceA.length + freshSaveTraceB.length,
			freshAutosaveRequests:
				freshAutosaveTraceA.length + freshAutosaveTraceB.length,
		};
	} finally {
		await Promise.all(
			[ contextA, contextB ]
				.filter( Boolean )
				.map( ( context ) => context.close() )
		);
	}
}

async function main() {
	await ensureOutputsDoNotExist();
	runWpCli( [ 'option', 'update', 'wp_collaboration_enabled', '1' ] );
	const browser = await chromium.launch();
	try {
		let lastError;
		for ( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
			try {
				const result = await runAttempt( browser, attempt );
				const evidence = await writeEvidence( result );
				console.log( JSON.stringify( evidence, null, 2 ) );
				return;
			} catch ( error ) {
				lastError = error;
				console.error( `Attempt ${ attempt } failed:` );
				console.error( error );
			}
		}
		throw lastError ?? new Error( 'No attempts ran.' );
	} finally {
		await browser.close();
	}
}

main().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
} );
