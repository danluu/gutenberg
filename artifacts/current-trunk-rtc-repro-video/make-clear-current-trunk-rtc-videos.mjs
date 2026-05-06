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
const framesRoot = path.join( outDir, 'frames-clear-current-trunk' );
const adminUser = process.env.WP_USERNAME ?? 'admin';
const adminPassword = process.env.WP_PASSWORD ?? 'password';
const viewport = { width: 960, height: 720 };
const topHeight = 112;
const labelHeight = 48;
const logHeight = 420;
const frameHeight = topHeight + labelHeight + viewport.height + logHeight;

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
		.last()
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

async function waitForEditorText( page, marker, timeout = 20000 ) {
	const started = Date.now();
	while ( Date.now() - started < timeout ) {
		if ( await editorHasText( page, marker ) ) {
			return true;
		}
		await sleep( 250 );
	}
	return false;
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
		framesDir,
		index,
		step,
		totalSteps,
		title,
		tone,
		status,
		action,
		evidence,
		check,
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
			<text x="24" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">Window A: same admin account, saves first</text>
			<text x="984" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">Window B: same admin account, may be stale</text>
		</svg>`;
	const logSvg = `
		<svg width="1920" height="${ logHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="1920" height="${ logHeight }" fill="#e2e8f0"/>
			${ panelText( 'Action', action, 24, 36, 600, '#0f172a' ) }
			${ panelText( 'Evidence', evidence, 660, 36, 600, '#0f766e' ) }
			${ panelText( 'Bug Check', check, 1296, 36, 600, toneColor ) }
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

function summaryBox( title, lines, left, top, width, height, titleColor ) {
	const wrapped = lines.flatMap( ( line ) => wrapText( line, 54 ) ).slice( 0, 11 );
	return `
		<rect x="${ left }" y="${ top }" width="${ width }" height="${ height }" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
		<text x="${ left + 24 }" y="${
		top + 42
	}" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${ titleColor }">${ escapeXml(
		title
	) }</text>
		${ wrapped
			.map(
				( line, index ) =>
					`<text x="${ left + 24 }" y="${
						top + 88 + index * 34
					}" font-family="Menlo, Consolas, monospace" font-size="23" fill="#111827">${ escapeXml(
						line
					) }</text>`
			)
			.join( '' ) }`;
}

async function captureSummaryFrame( options ) {
	const {
		framesDir,
		index,
		totalSteps,
		title,
		tone,
		status,
		timeline,
		saveRequests,
		serverState,
		conclusion,
	} = options;
	const toneColor = tone === 'bug' ? '#b91c1c' : '#047857';
	const toneFill = tone === 'bug' ? '#fee2e2' : '#dcfce7';
	const conclusionFill = tone === 'bug' ? '#fee2e2' : '#dcfce7';
	const summarySvg = `
		<svg width="1920" height="${ frameHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="1920" height="${ frameHeight }" fill="#e2e8f0"/>
			<rect width="1920" height="${ topHeight }" fill="#0f172a"/>
			<rect x="24" y="20" width="182" height="44" rx="6" fill="${ toneFill }"/>
			<text x="44" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${ toneColor }">STEP ${ index }/${ totalSteps }</text>
			<text x="232" y="50" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#f8fafc">${ escapeXml(
		title
	) }</text>
			<text x="232" y="86" font-family="Arial, sans-serif" font-size="22" fill="#cbd5e1">${ escapeXml(
		status
	) }</text>

			<text x="48" y="178" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0f172a">Authoritative persisted result after Window B saves</text>
			<text x="48" y="222" font-family="Arial, sans-serif" font-size="26" fill="#334155">This final frame intentionally uses REST/WP-CLI facts, not the editor DOM, because the browser can resync visually after the save.</text>

			${ summaryBox( 'Timeline', timeline, 48, 276, 560, 472, '#0f172a' ) }
			${ summaryBox(
				'REST Save Payloads',
				saveRequests,
				680,
				276,
				560,
				472,
				toneColor
			) }
			${ summaryBox(
				'Final Server Read',
				serverState,
				1312,
				276,
				560,
				472,
				toneColor
			) }

			<rect x="48" y="804" width="1824" height="308" rx="12" fill="${ conclusionFill }" stroke="${ toneColor }" stroke-width="3"/>
			<text x="84" y="860" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${ toneColor }">${ escapeXml(
		tone === 'bug' ? 'BUG' : 'CONTROL'
	) }</text>
			${ conclusion
				.flatMap( ( line ) => wrapText( line, 118 ) )
				.slice( 0, 6 )
				.map(
					( line, lineIndex ) =>
						`<text x="84" y="${
							914 + lineIndex * 38
						}" font-family="Menlo, Consolas, monospace" font-size="26" fill="#111827">${ escapeXml(
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
		.composite( [ { input: Buffer.from( summarySvg ), left: 0, top: 0 } ] )
		.png()
		.toFile( path.join( framesDir, `frame-${ String( index ).padStart( 3, '0' ) }.png` ) );
}

function renderVideo( framesDir, videoPath ) {
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

async function discardFrames( framesDir ) {
	await fs.rm( framesDir, { force: true, recursive: true } );
	await fs.mkdir( framesDir, { recursive: true } );
}

async function runScenario( browser, options ) {
	const {
		delayBeforeBMs,
		expectBug,
		label,
		outputFile,
		scenarioTitle,
		attempt,
	} = options;
	const framesDir = path.join( framesRoot, label );
	await discardFrames( framesDir );

	const runId = `${ Date.now() }-${ attempt }`;
	const markerA = `A-SAVED-SHOULD-STAY-${ runId }`;
	const markerB = `B-STALENESS-TEST-${ runId }`;
	const postId = createPost( `Clear RTC ${ label }` );
	const room = `postType/post:${ postId }`;
	const contextA = await browser.newContext( { baseURL } );
	const contextB = await browser.newContext( { baseURL } );
	const pageA = await login( contextA );
	const pageB = await login( contextB );
	const syncA = syncObserver( pageA );
	const syncB = syncObserver( pageB );
	const saveTraceA = attachSaveTrace( pageA, 'A', postId );
	const saveTraceB = attachSaveTrace( pageB, 'B', postId );
	const headSummary = runGit( [ 'log', '-1', '--format=%h %cI %s', 'HEAD' ] );
	let frame = 1;
	const totalSteps = expectBug ? 5 : 6;

	try {
		await Promise.all( [ openEditor( pageA, postId ), openEditor( pageB, postId ) ] );
		await waitForMutualDiscovery( pageA, pageB );
		await Promise.all( [
			waitForSyncRoom( syncA, room, 'Window A' ),
			waitForSyncRoom( syncB, room, 'Window B' ),
		] );
		const assets = await collectAssetEvidence( pageA );
		await captureFrame( {
			pageA,
			pageB,
			framesDir,
			index: frame++,
			totalSteps,
			title: scenarioTitle,
			tone: expectBug ? 'bug' : 'control',
			status: 'Precondition: two same-account windows edit one draft while RTC is enabled.',
			action: [
				`Created draft post ${ postId }.`,
				`Opened it in Window A and Window B as ${ adminUser }.`,
				'Both windows show collaborator UI before any edit.',
			],
			evidence: [
				`Current trunk: ${ headSummary }`,
				`_wpCollaborationEnabled=${ assets.collaborationEnabled }`,
				`/wp-sync room observed in both windows: ${ room }`,
				`Sync response counts: A=${ syncA.count }, B=${ syncB.count }`,
			],
			check: [
				'This frame proves the repro is not two isolated editors.',
				'The bug later is not missing RTC setup.',
			],
		} );

		await appendParagraphWithKeyboard( pageA, markerA );
		await captureFrame( {
			pageA,
			pageB,
			framesDir,
			index: frame++,
			totalSteps,
			title: scenarioTitle,
			tone: expectBug ? 'bug' : 'control',
			status: 'Window A makes the content that must not be lost.',
			action: [
				'Window A typed a new paragraph.',
				`A marker: ${ markerA }`,
				'Expected invariant: once saved, this paragraph must remain in the post.',
			],
			evidence: [
				'The marker is visible in Window A.',
				'Window B has not typed yet.',
			],
			check: [
				'This is the saved content that the later stale save can overwrite.',
			],
		} );

		await saveDraftWithToolbar( pageA );
		await waitForServerText( pageA, postId, markerA );
		let bHasA = await editorHasText( pageB, markerA );
		await captureFrame( {
			pageA,
			pageB,
			framesDir,
			index: frame++,
			totalSteps,
			title: scenarioTitle,
			tone: expectBug ? 'bug' : 'control',
			status: 'Window A saved. The server now has A, but Window B may still be stale.',
			action: [
				'Window A clicked toolbar Save draft.',
				'The REST/server copy now contains A.',
			],
			evidence: [
				`Server contains A marker: true`,
				`Immediately after A save, Window B contains A: ${ bHasA }`,
			],
			check: expectBug
				? [
						'Bug timing requires Window B to still miss A here.',
						`For this attempt, B has A=${ bHasA}.`,
				  ]
				: [
						'The control waits for polling/refetch before B saves.',
						`At this instant, B has A=${ bHasA}.`,
				  ],
		} );

		if ( delayBeforeBMs > 0 ) {
			await sleep( delayBeforeBMs );
			const sawA = await waitForEditorText( pageB, markerA, 20000 );
			bHasA = sawA || ( await editorHasText( pageB, markerA ) );
			await captureFrame( {
				pageA,
				pageB,
				framesDir,
				index: frame++,
				totalSteps,
				title: scenarioTitle,
				tone: 'control',
				status: 'Control path: polling/refetch catches Window B up before B saves.',
				action: [
					`Waited ${ delayBeforeBMs }ms before Window B edits.`,
					'This is the path where the colleague saw both edits preserved.',
				],
				evidence: [
					`After the wait, Window B contains A: ${ bHasA }`,
					`/wp-sync counts now: A=${ syncA.count }, B=${ syncB.count }`,
				],
				check: [
					'Because B has A before saving, B should send A+B.',
					'This is not the bug path.',
				],
			} );
		}

		if ( expectBug && bHasA ) {
			throw new Error( 'Window B already had A before stale save; retry needed.' );
		}
		if ( ! expectBug && ! bHasA ) {
			throw new Error( 'Control did not catch Window B up before save.' );
		}

		await appendParagraphWithKeyboard( pageB, markerB );
		const bEditedHasA = await editorHasText( pageB, markerA );
		await captureFrame( {
			pageA,
			pageB,
			framesDir,
			index: frame++,
			totalSteps,
			title: scenarioTitle,
			tone: expectBug ? 'bug' : 'control',
			status: expectBug
				? 'Bug moment: Window B edits while its local editor is missing A.'
				: 'Control moment: Window B edits after it already has A.',
			action: [
				'Window B typed its own paragraph.',
				`B marker: ${ markerB }`,
				'Next action is the toolbar Save draft from Window B.',
			],
			evidence: [
				`Before B save, Window B contains A: ${ bEditedHasA }`,
				`Before B save, Window B contains B: true`,
			],
			check: expectBug
				? [
						'This is where the bad save payload is created.',
						'B is about to save full content with B but without A.',
				  ]
				: [
						'B is up to date before saving.',
						'The save payload should include both A and B.',
				  ],
		} );

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
		await captureSummaryFrame( {
			framesDir,
			index: frame++,
			totalSteps,
			title: scenarioTitle,
			tone: expectBug ? 'bug' : 'control',
			status: expectBug
				? 'Final server state: A was previously saved, but B overwrote it.'
				: 'Final server state: both saved edits are preserved.',
			timeline: [
				'1. Window A typed A.',
				'2. Window A saved; server had A.',
				expectBug
					? '3. Window B saved before receiving A.'
					: '3. Window B waited until it received A.',
				'4. Window B typed B and saved.',
				'5. Script read persisted post.',
			],
			saveRequests: [
				`A save request: A=${ aSave?.requestHasA }, B=${ aSave?.requestHasB }`,
				`A save response: A=${ aSave?.responseHasA }, B=${ aSave?.responseHasB }`,
				`B save request: A=${ bSave?.requestHasA }, B=${ bSave?.requestHasB }`,
				`B save response: A=${ bSave?.responseHasA }, B=${ bSave?.responseHasB }`,
			],
			serverState: [
				`Final REST read: A=${ finalHasA }, B=${ finalHasB }`,
				`Final WP-CLI read: A=${ cliContent.includes(
					markerA
				) }, B=${ cliContent.includes( markerB ) }`,
				expectBug
					? 'Meaning: saved A paragraph is missing.'
					: 'Meaning: saved A paragraph remains.',
				'Meaning: B paragraph is present.',
			],
			conclusion: expectBug
				? [
						'Window B sent a stale full-content REST save: B=true and A=false.',
						'The server accepted that stale body, so the previously saved A paragraph disappeared from persisted post content.',
						'The bug is the missing save-time freshness/conflict guard before accepting B full content.',
				  ]
				: [
						'Window B had already received A before saving, so its full-content REST save had A=true and B=true.',
						'The server persisted both edits. This is the safe timing path, not the bug.',
				  ],
		} );

		if ( expectBug && ( ! finalHasB || finalHasA ) ) {
			throw new Error(
				`Expected stale overwrite; finalHasA=${ finalHasA }, finalHasB=${ finalHasB }`
			);
		}
		if ( ! expectBug && ( ! finalHasA || ! finalHasB ) ) {
			throw new Error(
				`Expected control to preserve both; finalHasA=${ finalHasA }, finalHasB=${ finalHasB }`
			);
		}

		const videoPath = path.join( outDir, outputFile );
		renderVideo( framesDir, videoPath );
		return {
			label,
			videoPath,
			postId,
			markerA,
			markerB,
			finalHasA,
			finalHasB,
			bSaveRequestHasA: bSave?.requestHasA,
			bSaveRequestHasB: bSave?.requestHasB,
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
		try {
			return await runScenario( browser, { ...options, attempt } );
		} catch ( error ) {
			lastError = error;
			console.error( `${ options.label } attempt ${ attempt } failed:` );
			console.error( error );
		}
	}
	throw lastError ?? new Error( `${ options.label } did not run.` );
}

async function main() {
	await fs.rm( framesRoot, { force: true, recursive: true } );
	await fs.mkdir( framesRoot, { recursive: true } );
	runWpCli( [ 'option', 'update', 'wp_collaboration_enabled', '1' ] );

	const browser = await chromium.launch();
	try {
		const bug = await runWithRetries(
			browser,
			{
				label: 'immediate-save-bug',
				outputFile: 'current-trunk-rtc-stale-save-bug-clear-annotated.mp4',
				scenarioTitle: 'RTC Stale Save Bug: B Overwrites A',
				delayBeforeBMs: 0,
				expectBug: true,
			},
			6
		);
		const control = await runWithRetries(
			browser,
			{
				label: 'delayed-polling-control',
				outputFile:
					'current-trunk-rtc-delayed-polling-control-clear-annotated.mp4',
				scenarioTitle: 'Control: Polling Catches B Up Before Save',
				delayBeforeBMs: 12000,
				expectBug: false,
			},
			3
		);
		console.log(
			JSON.stringify(
				{
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
