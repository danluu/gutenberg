import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __filename = fileURLToPath( import.meta.url );
const outDir = path.dirname( __filename );
const toolWorktree = path.resolve( outDir, '../..' );
const testedWorktree =
	process.env.GUTENBERG_WORKTREE ??
	'/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-current-trunk-20260506';
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8891';
const wpEnvConfig =
	process.env.WP_ENV_CONFIG ?? '.wp-env.stale-save-current-trunk.json';
const framesDir = path.join( outDir, 'frames-current-trunk' );
const videoPath = path.join(
	outDir,
	'current-trunk-rtc-stale-save-repro.mp4'
);
const adminUser = process.env.WP_USERNAME ?? 'admin';
const adminPassword = process.env.WP_PASSWORD ?? 'password';
const viewport = { width: 960, height: 720 };
const logHeight = 380;
const frameHeight = 54 + viewport.height + logHeight;
let frameIndex = 1;

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

function wrapText( text, columns = 150 ) {
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

function isPostSaveRequest( request, postId ) {
	const url = request.url();
	const method = request.method();
	return (
		( method === 'POST' || method === 'PUT' ) &&
		( url.includes( `/wp/v2/posts/${ postId }` ) ||
			url.includes( `rest_route=%2Fwp%2Fv2%2Fposts%2F${ postId }` ) )
	);
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
			requestAt: new Date().toISOString(),
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
		entry.responseAt = new Date().toISOString();
		try {
			const body = await response.json();
			entry.responseContentRaw = body?.content?.raw ?? '';
		} catch {
			entry.responseContentRaw = '';
		}
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
			const req = String( requestContent( entry ) );
			const res = String( entry.responseContentRaw ?? '' );
			return {
				...entry,
				requestHasA: req.includes( markerA ),
				requestHasB: req.includes( markerB ),
				responseHasA: res.includes( markerA ),
				responseHasB: res.includes( markerB ),
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
		{ timeout: 30000 }
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
		{ timeout: 30000 }
	);
	await page.waitForFunction(
		() => document.querySelector( 'iframe[name="editor-canvas"]' ),
		undefined,
		{ timeout: 30000 }
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

async function collectAssetEvidence( page ) {
	return page.evaluate( () => ( {
		collaborationEnabled: window._wpCollaborationEnabled === true,
		scripts: Array.from( document.scripts )
			.map( ( script ) => script.src )
			.filter(
				( src ) =>
					src.includes( '/build/scripts/sync/' ) ||
					src.includes( '/build/scripts/core-data/' ) ||
					src.includes( '/build/scripts/editor/' ) ||
					src.includes( '/build/scripts/edit-post/' )
			),
	} ) );
}

function editorFrame( page ) {
	const frame = page.frame( { name: 'editor-canvas' } );
	if ( ! frame ) {
		throw new Error( 'Editor iframe is not available.' );
	}
	return frame;
}

async function appendParagraphWithKeyboard( page, marker ) {
	const frame = editorFrame( page );
	const editable = frame
		.locator( '[data-type="core/paragraph"][contenteditable="true"]' )
		.first();
	await editable.waitFor( { state: 'visible', timeout: 30000 } );

	for ( let attempt = 1; attempt <= 3; attempt++ ) {
		await editable.click( { force: true } );
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( marker, { delay: 4 } );
		try {
			await page.waitForFunction(
				( expected ) =>
					window.wp.data
						.select( 'core/block-editor' )
						.getBlocks()
						.some( ( block ) =>
							String( block.attributes?.content ?? '' ).includes(
								expected
							)
						),
				marker,
				{ timeout: 7000 }
			);
			return;
		} catch ( error ) {
			if ( attempt === 3 ) {
				throw error;
			}
		}
	}
}

async function saveDraftWithToolbar( page ) {
	const button = page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Save draft' } );
	await button.waitFor( { state: 'visible', timeout: 30000 } );
	await page.waitForFunction(
		() => window.wp.data.select( 'core/editor' ).isEditedPostDirty(),
		undefined,
		{ timeout: 30000 }
	);
	await button.click();
	await page
		.getByRole( 'button', { name: 'Dismiss this notice' } )
		.filter( { hasText: 'Draft saved' } )
		.waitFor( { timeout: 30000 } );
	await page.waitForTimeout( 300 );
}

async function editorHasText( page, marker ) {
	return page.evaluate(
		( expected ) =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.some( ( block ) =>
					String( block.attributes?.content ?? '' ).includes(
						expected
					)
				),
		marker
	);
}

async function persistedContent( page, postId ) {
	return page.evaluate(
		async ( id ) => {
			const record = await window.wp.apiFetch( {
				path: `/wp/v2/posts/${ id }?context=edit`,
			} );
			return record.content.raw;
		},
		postId
	);
}

async function waitForServerText( page, postId, marker ) {
	await page.waitForFunction(
		async ( { id, expected } ) => {
			const record = await window.wp.apiFetch( {
				path: `/wp/v2/posts/${ id }?context=edit`,
			} );
			return record.content.raw.includes( expected );
		},
		{ id: postId, expected: marker },
		{ timeout: 30000 }
	);
}

async function capture( pageA, pageB, heading, logLines ) {
	const [ shotA, shotB ] = await Promise.all( [
		pageA.screenshot( { type: 'png' } ),
		pageB.screenshot( { type: 'png' } ),
	] );
	const visibleLines = logLines.flatMap( ( line ) => wrapText( line ) ).slice( -12 );
	const labelSvg = `
		<svg width="1920" height="54" xmlns="http://www.w3.org/2000/svg">
			<rect width="960" height="54" fill="#12302a"/>
			<rect x="960" width="960" height="54" fill="#422006"/>
			<text x="24" y="35" font-family="Arial, sans-serif" font-size="24" fill="white">Window A: same admin account, saved first</text>
			<text x="984" y="35" font-family="Arial, sans-serif" font-size="24" fill="white">Window B: same admin account, stale candidate</text>
		</svg>`;
	const logSvg = `
		<svg width="1920" height="${ logHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="1920" height="${ logHeight }" fill="#111827"/>
			<text x="24" y="40" font-family="Arial, sans-serif" font-size="25" fill="#f9fafb">${ escapeXml(
				heading
			) }</text>
			${ visibleLines
				.map(
					( line, index ) =>
						`<text x="24" y="${ 82 + index * 24 }" font-family="Menlo, Consolas, monospace" font-size="18" fill="#d1d5db">${ escapeXml(
							line
						) }</text>`
				)
				.join( '' ) }
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
			{ input: Buffer.from( labelSvg ), left: 0, top: 0 },
			{ input: shotA, left: 0, top: 54 },
			{ input: shotB, left: 960, top: 54 },
			{ input: Buffer.from( logSvg ), left: 0, top: 54 + viewport.height },
		] )
		.png()
		.toFile(
			path.join(
				framesDir,
				`frame-${ String( frameIndex++ ).padStart( 3, '0' ) }.png`
			)
		);
}

async function discardFramesFrom( startIndex ) {
	const files = await fs.readdir( framesDir ).catch( () => [] );
	await Promise.all(
		files.map( async ( file ) => {
			const match = file.match( /^frame-(\d+)\.png$/ );
			if ( match && Number( match[ 1 ] ) >= startIndex ) {
				await fs.unlink( path.join( framesDir, file ) );
			}
		} )
	);
	frameIndex = startIndex;
}

function renderVideo() {
	execFileSync(
		'ffmpeg',
		[
			'-y',
			'-framerate',
			'1/4',
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

function createPost( scenarioName ) {
	const postCreateOutput = runWpCli( [
		'post',
		'create',
		'--post_type=post',
		'--post_status=draft',
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

async function runScenario( browser, options ) {
	const { delayBeforeBMs, expectBug, label, attempt } = options;
	const markerA = `video-a-${ Date.now() }-${ attempt }-${ label }`;
	const markerB = `video-b-${ Date.now() }-${ attempt }-${ label }`;
	const postId = createPost( `Current trunk RTC ${ label }` );
	const room = `postType/post:${ postId }`;
	const contextA = await browser.newContext( { baseURL } );
	const contextB = await browser.newContext( { baseURL } );
	const pageA = await login( contextA );
	const pageB = await login( contextB );
	const syncA = syncObserver( pageA );
	const syncB = syncObserver( pageB );
	const saveTraceA = attachSaveTrace( pageA, 'A', postId );
	const saveTraceB = attachSaveTrace( pageB, 'B', postId );
	const headSummary = runGit( [ 'log', '-1', '--format=%H %cI %s', 'HEAD' ] );
	const logLines = [
		`Current trunk: ${ headSummary }`,
		`Scenario ${ label}: post ${ postId}; separate browser contexts; same admin user; delay before B save=${ delayBeforeBMs }ms.`,
	];

	try {
		await Promise.all( [ openEditor( pageA, postId ), openEditor( pageB, postId ) ] );
		await waitForMutualDiscovery( pageA, pageB );
		await Promise.all( [
			waitForSyncRoom( syncA, room, 'Window A' ),
			waitForSyncRoom( syncB, room, 'Window B' ),
		] );
		const assets = await collectAssetEvidence( pageA );
		logLines.push(
			`RTC proved: _wpCollaborationEnabled=${ assets.collaborationEnabled }; collaborator UI visible; /wp-sync counts A=${ syncA.count }, B=${ syncB.count }; both saw ${ room }.`
		);
		logLines.push(
			`Loaded current-trunk assets: ${ assets.scripts
				.map( ( src ) => src.match( /build\/scripts\/([^?]+)/ )?.[ 1 ] )
				.filter( Boolean )
				.join( ', ' ) }.`
		);
		await capture( pageA, pageB, `${ label }: RTC preconditions`, logLines );

		await appendParagraphWithKeyboard( pageA, markerA );
		logLines.push(
			`Natural action: A clicked the editor and typed paragraph ${ markerA }.`
		);
		if ( ! expectBug ) {
			await capture( pageA, pageB, `${ label }: A typed`, logLines );
		}

		await saveDraftWithToolbar( pageA );
		await waitForServerText( pageA, postId, markerA );
		let bHasA = await editorHasText( pageB, markerA );
		logLines.push(
			`A clicked toolbar Save draft. Server now has A. Immediately after A save, B has A=${ bHasA }.`
		);
		if ( ! expectBug ) {
			await capture( pageA, pageB, `${ label }: after A save`, logLines );
		}

		if ( delayBeforeBMs > 0 ) {
			await sleep( delayBeforeBMs );
			bHasA = await editorHasText( pageB, markerA );
			logLines.push(
				`Control wait: after ${ delayBeforeBMs }ms, polling/refetch state in B has A=${ bHasA }.`
			);
			await capture( pageA, pageB, `${ label }: after polling wait`, logLines );
		}

		if ( expectBug && bHasA ) {
			throw new Error( 'B already had A before stale save; retry needed.' );
		}

		await appendParagraphWithKeyboard( pageB, markerB );
		const bEditedHasA = await editorHasText( pageB, markerA );
		logLines.push(
			`Natural action: B clicked the editor and typed ${ markerB }. Before B save, B editor has A=${ bEditedHasA }.`
		);
		if ( ! expectBug ) {
			await capture( pageA, pageB, `${ label }: B typed`, logLines );
		}

		await saveDraftWithToolbar( pageB );
		const finalContent = await persistedContent( pageB, postId );
		const cliContent = runWpCli( [
			'post',
			'get',
			String( postId ),
			'--field=post_content',
		] );
		const combinedTrace = [ ...saveTraceA, ...saveTraceB ];
		const aSave = summarizeTrace( combinedTrace, markerA, markerB, 'A' );
		const bSave = summarizeTrace( combinedTrace, markerA, markerB, 'B' );
		const finalHasA = finalContent.includes( markerA );
		const finalHasB = finalContent.includes( markerB );
		logLines.push(
			`A REST save: request A=${ aSave?.requestHasA }, B=${ aSave?.requestHasB }; response A=${ aSave?.responseHasA }, B=${ aSave?.responseHasB }.`
		);
		logLines.push(
			`B REST save: request A=${ bSave?.requestHasA }, B=${ bSave?.requestHasB }; response A=${ bSave?.responseHasA }, B=${ bSave?.responseHasB }.`
		);
		logLines.push(
			`Final direct WP-CLI read: A=${ cliContent.includes(
				markerA
			) }, B=${ cliContent.includes( markerB ) }. Browser REST final: A=${ finalHasA }, B=${ finalHasB }.`
		);
		logLines.push(
			finalHasB && ! finalHasA
				? 'BUG: B saved stale full content and overwrote A.'
				: 'CONTROL: B had received A first, so final content preserved both edits.'
		);
		await capture( pageA, pageB, `${ label }: final server state`, logLines );

		if ( expectBug && ( ! finalHasB || finalHasA ) ) {
			throw new Error(
				`Expected stale overwrite; finalHasA=${ finalHasA }, finalHasB=${ finalHasB }`
			);
		}
		if ( ! expectBug && ( ! finalHasA || ! finalHasB ) ) {
			throw new Error(
				`Expected delayed control to preserve both; finalHasA=${ finalHasA }, finalHasB=${ finalHasB }`
			);
		}

		return {
			label,
			postId,
			markerA,
			markerB,
			finalHasA,
			finalHasB,
			syncA: syncA.count,
			syncB: syncB.count,
		};
	} finally {
		await Promise.all( [ contextA.close(), contextB.close() ] );
	}
}

async function runWithRetries( browser, options, maxAttempts ) {
	let lastError;
	for ( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
		const firstAttemptFrame = frameIndex;
		try {
			return await runScenario( browser, { ...options, attempt } );
		} catch ( error ) {
			await discardFramesFrom( firstAttemptFrame );
			lastError = error;
			console.error( `${ options.label } attempt ${ attempt } failed:` );
			console.error( error );
		}
	}
	throw lastError ?? new Error( `${ options.label } did not run.` );
}

async function main() {
	await fs.rm( framesDir, { force: true, recursive: true } );
	await fs.mkdir( framesDir, { recursive: true } );
	runWpCli( [ 'option', 'update', 'wp_collaboration_enabled', '1' ] );

	const browser = await chromium.launch();
	try {
		const bug = await runWithRetries(
			browser,
			{
				label: 'immediate-save-bug',
				delayBeforeBMs: 0,
				expectBug: true,
			},
			6
		);
		const control = await runWithRetries(
			browser,
			{
				label: 'delayed-polling-control',
				delayBeforeBMs: 12000,
				expectBug: false,
			},
			3
		);
		renderVideo();
		console.log(
			JSON.stringify(
				{
					videoPath,
					testedWorktree,
					baseURL,
					head: runGit( [ 'rev-parse', 'HEAD' ] ),
					bug,
					control,
				},
				null,
				2
			)
		);
	} finally {
		await browser.close();
	}
}

main().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
} );
