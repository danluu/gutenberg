import { execFileSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __filename = fileURLToPath( import.meta.url );
const outDir = path.dirname( __filename );
const testedWorktree =
	process.env.GUTENBERG_WORKTREE ??
	'/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-current-trunk-20260506';
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8891';
const wpCliContainer =
	process.env.WP_CLI_CONTAINER ?? 'a7ee34b0383f6b22a430a77219940001-cli-1';
const scenario = process.env.SCENARIO ?? process.argv[ 2 ] ?? 'no-autosave';
const adminUser = process.env.WP_USERNAME ?? 'admin';
const adminPassword = process.env.WP_PASSWORD ?? 'password';
const frameSeconds = Number( process.env.FRAME_SECONDS ?? 7 );
const maxAttempts = Number( process.env.MAX_ATTEMPTS ?? 3 );
const allowOverwriteVideo = process.env.ALLOW_OVERWRITE_VIDEO === '1';
const viewport = { width: 1280, height: 720 };
const topHeight = 116;
const labelHeight = 48;
const logHeight = 396;
const frameWidth = viewport.width * 2;
const frameHeight = topHeight + labelHeight + viewport.height + logHeight;
const totalSteps = scenario === 'bad-autosave' ? 7 : 4;
const outputStem =
	scenario === 'bad-autosave'
		? 'current-trunk-rtc-browser-window-bad-autosave'
		: 'current-trunk-rtc-browser-window-no-autosave';
const framesDir =
	process.env.FRAMES_DIR ??
	path.join( outDir, `frames-${ outputStem }` );
const videoPath =
	process.env.VIDEO_PATH ?? path.join( outDir, `${ outputStem }.mp4` );
const evidencePath =
	process.env.EVIDENCE_PATH ??
	path.join( outDir, `${ outputStem}.evidence.json` );

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function runGit( args ) {
	return execFileSync( 'git', args, {
		cwd: testedWorktree,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} ).trim();
}

function runWpCli( args ) {
	return execFileSync( 'docker', [ 'exec', wpCliContainer, 'wp', ...args ], {
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} ).trim();
}

function runWpCliJson( args ) {
	const output = runWpCli( args );
	return output ? JSON.parse( output ) : null;
}

function paragraphMarkup( content ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function createPost( title ) {
	const postCreateOutput = runWpCli( [
		'post',
		'create',
		'--post_type=post',
		'--post_status=draft',
		`--post_title=${ title } ${ Date.now() }`,
		`--post_content=${ paragraphMarkup( 'Initial body.' ) }`,
		'--porcelain',
	] );
	const postId = Number( postCreateOutput.match( /^\d+$/m )?.[ 0 ] );
	if ( ! postId ) {
		throw new Error( `Could not parse created post ID: ${ postCreateOutput }` );
	}
	return postId;
}

function escapeXml( value ) {
	return String( value ?? '' )
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' );
}

function wrapWords( text, columns ) {
	const words = String( text ?? '' ).split( /\s+/ ).filter( Boolean );
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
	return lines.length ? lines : [ '' ];
}

function panelText( title, lines, left, top, width, titleColor ) {
	let y = top + 76;
	const rendered = [];
	for ( const line of lines ) {
		for ( const wrapped of wrapWords( line, 54 ) ) {
			if ( rendered.length >= 9 ) {
				break;
			}
			rendered.push(
				`<text x="${ left + 20 }" y="${ y }" font-family="Menlo, Consolas, monospace" font-size="19" fill="#111827">${ escapeXml(
					wrapped
				) }</text>`
			);
			y += 28;
		}
	}
	return `
		<rect x="${ left }" y="${ top }" width="${ width }" height="304" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
		<text x="${ left + 20 }" y="${ top + 36 }" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${ titleColor }">${ escapeXml(
			title
		) }</text>
		${ rendered.join( '' ) }`;
}

function markerSummary( value ) {
	return `A=${ Boolean( value?.hasA ) }, B=${ Boolean( value?.hasB ) }`;
}

function contentFlags( content, markerA, markerB ) {
	return {
		hasA: String( content ).includes( markerA ),
		hasB: String( content ).includes( markerB ),
		hasBoth:
			String( content ).includes( markerA ) &&
			String( content ).includes( markerB ),
		content,
	};
}

function isAutosave( record ) {
	return /autosave/i.test( record.postName ?? record.post_name ?? '' );
}

function autosaveRecords( records ) {
	return ( records ?? [] ).filter( isAutosave );
}

function summarizeRevisions( records ) {
	const autosaves = autosaveRecords( records );
	if ( autosaves.length === 0 ) {
		return 'autosaves=0';
	}
	return autosaves
		.map(
			( row ) =>
				`autosave ${ row.id }: A=${ row.hasA }, B=${ row.hasB }`
		)
		.join( '; ' );
}

function listRevisionRecords( postId, markerA, markerB ) {
	const rows = runWpCliJson( [
		'post',
		'list',
		`--post_parent=${ postId }`,
		'--post_type=revision',
		'--fields=ID,post_name,post_type,post_status,post_modified_gmt',
		'--format=json',
	] );
	return rows.map( ( row ) => {
		const content = runWpCli( [
			'post',
			'get',
			String( row.ID ),
			'--field=post_content',
		] );
		const flags = contentFlags( content, markerA, markerB );
		return {
			id: Number( row.ID ),
			postName: row.post_name,
			postType: row.post_type,
			postStatus: row.post_status,
			postModifiedGmt: row.post_modified_gmt,
			isAutosave: /autosave/i.test( row.post_name ?? '' ),
			...flags,
		};
	} );
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
		{ timeout: 180000 }
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
		{ timeout: 180000 }
	);
	await page.waitForFunction(
		() => document.querySelector( 'iframe[name="editor-canvas"]' ),
		undefined,
		{ timeout: 180000 }
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
	const frame = editorFrame( page );
	const editable = frame
		.locator( '[data-type="core/paragraph"][contenteditable="true"]' )
		.first();
	await editable.waitFor( { state: 'visible', timeout: 30000 } );
	await editable.click( { force: true } );
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( marker, { delay: 4 } );
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
		{ timeout: 10000 }
	);
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

async function editorState( page, markerA, markerB ) {
	return {
		hasA: await editorHasText( page, markerA ),
		hasB: await editorHasText( page, markerB ),
	};
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
	timeout
) {
	const started = Date.now();
	while ( Date.now() - started < timeout ) {
		const state = await readEditorState( pageA, pageB, markerA, markerB );
		if ( hasBothMarkers( state ) ) {
			return { state, healed: true, waitedMs: Date.now() - started };
		}
		await sleep( 500 );
	}
	return {
		state: await readEditorState( pageA, pageB, markerA, markerB ),
		healed: false,
		waitedMs: Date.now() - started,
	};
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

async function waitForSyncRoom( state, room, label, timeout = 45000 ) {
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

function isPostSaveRequest( request, postId ) {
	const url = request.url();
	const decodedUrl = decodeURIComponent( url );
	const method = request.method();
	if ( decodedUrl.includes( `/wp/v2/posts/${ postId }/autosaves` ) ) {
		return false;
	}
	return (
		( method === 'POST' || method === 'PUT' ) &&
		( url.includes( `/wp/v2/posts/${ postId }` ) ||
			url.includes( `rest_route=%2Fwp%2Fv2%2Fposts%2F${ postId }` ) )
	);
}

function isAutosaveRequest( request, postId ) {
	const decodedUrl = decodeURIComponent( request.url() );
	return (
		request.method() === 'POST' &&
		decodedUrl.includes( `/wp/v2/posts/${ postId }/autosaves` )
	);
}

function attachRequestTrace( page, label, postId ) {
	const entries = [];
	page.on( 'request', ( request ) => {
		if ( ! isPostSaveRequest( request, postId ) && ! isAutosaveRequest( request, postId ) ) {
			return;
		}
		entries.push( {
			label,
			kind: isAutosaveRequest( request, postId ) ? 'autosave' : 'post-save',
			method: request.method(),
			url: request.url(),
			requestPostData: request.postData() ?? '',
			startedAt: new Date().toISOString(),
		} );
	} );
	page.on( 'response', async ( response ) => {
		const request = response.request();
		if ( ! isPostSaveRequest( request, postId ) && ! isAutosaveRequest( request, postId ) ) {
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
		entry.finishedAt = new Date().toISOString();
		try {
			const body = await response.json();
			entry.responseContentRaw = body?.content?.raw ?? '';
			entry.responseId = body?.id;
			entry.responseSlug = body?.slug;
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

function summarizeRequests( entries, markerA, markerB ) {
	return entries.map( ( entry ) => {
		const request = String( requestContent( entry ) );
		const response = String( entry.responseContentRaw ?? '' );
		return {
			label: entry.label,
			kind: entry.kind,
			status: entry.responseStatus,
			startedAt: entry.startedAt,
			finishedAt: entry.finishedAt,
			responseId: entry.responseId,
			responseSlug: entry.responseSlug,
			requestHasA: request.includes( markerA ),
			requestHasB: request.includes( markerB ),
			responseHasA: response.includes( markerA ),
			responseHasB: response.includes( markerB ),
		};
	} );
}

async function visibleAutosaveNotices( page ) {
	return page.evaluate( () => {
		const pattern = /auto-?save|autosave/i;
		const selector = [
			'.components-snackbar',
			'.components-notice',
			'.notice',
			'.edit-post-layout__metaboxes-notices',
			'.editor-post-autosave',
			'[role="alert"]',
			'[role="status"]',
		].join( ',' );
		return Array.from( document.querySelectorAll( selector ) )
			.filter( ( element ) => pattern.test( element.textContent || '' ) )
			.map( ( element ) => {
				const style = window.getComputedStyle( element );
				const rect = element.getBoundingClientRect();
				const visible =
					style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					Number( style.opacity ) !== 0 &&
					rect.width > 0 &&
					rect.height > 0;
				return {
					visible,
					text: String( element.textContent || '' )
						.replace( /\s+/g, ' ' )
						.trim(),
				};
			} )
			.filter( ( notice ) => notice.visible );
	} );
}

async function autosaveNoticeHref( page ) {
	const notice = page
		.locator( '.components-notice' )
		.filter( {
			hasText:
				'There is an autosave of this post that is more recent than the version below.',
		} )
		.first();
	if ( ! ( await notice.isVisible().catch( () => false ) ) ) {
		return null;
	}
	return notice
		.getByRole( 'link', { name: 'View the autosave' } )
		.getAttribute( 'href' )
		.catch( () => null );
}

function topSvg( index, title, status, tone = 'bug' ) {
	const toneColor = tone === 'ok' ? '#047857' : '#b91c1c';
	const toneFill = tone === 'ok' ? '#dcfce7' : '#fee2e2';
	return `
		<svg width="${ frameWidth }" height="${ topHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="${ frameWidth }" height="${ topHeight }" fill="#0f172a"/>
			<rect x="24" y="22" width="190" height="44" rx="6" fill="${ toneFill }"/>
			<text x="44" y="52" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${ toneColor }">STEP ${ index }/${ totalSteps }</text>
			<text x="236" y="52" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="#f8fafc">${ escapeXml(
				title
			) }</text>
			<text x="236" y="88" font-family="Arial, sans-serif" font-size="22" fill="#cbd5e1">${ escapeXml(
				status
			) }</text>
		</svg>`;
}

function labelSvg( labelA, labelB ) {
	return `
		<svg width="${ frameWidth }" height="${ labelHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="${ viewport.width }" height="${ labelHeight }" fill="#064e3b"/>
			<rect x="${ viewport.width }" width="${ viewport.width }" height="${ labelHeight }" fill="#7c2d12"/>
			<text x="24" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">${ escapeXml(
				labelA
			) }</text>
			<text x="${ viewport.width + 24 }" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">${ escapeXml(
				labelB
			) }</text>
		</svg>`;
}

function logSvg( action, evidence, meaning ) {
	const panelWidth = Math.floor( ( frameWidth - 96 ) / 3 );
	return `
		<svg width="${ frameWidth }" height="${ logHeight }" xmlns="http://www.w3.org/2000/svg">
			<rect width="${ frameWidth }" height="${ logHeight }" fill="#e2e8f0"/>
			${ panelText( 'Action', action, 24, 36, panelWidth, '#0f172a' ) }
			${ panelText( 'Evidence', evidence, 48 + panelWidth, 36, panelWidth, '#0f766e' ) }
			${ panelText( 'Meaning', meaning, 72 + panelWidth * 2, 36, panelWidth, '#b91c1c' ) }
		</svg>`;
}

async function captureDualFrame( {
	pageA,
	pageB,
	index,
	title,
	status,
	action,
	evidence,
	meaning,
	labelA = 'Window A',
	labelB = 'Window B',
	tone = 'bug',
} ) {
	const [ shotA, shotB ] = await Promise.all( [
		pageA.screenshot( { type: 'png' } ),
		pageB.screenshot( { type: 'png' } ),
	] );
	await sharp( {
		create: {
			width: frameWidth,
			height: frameHeight,
			channels: 4,
			background: '#ffffff',
		},
	} )
		.composite( [
			{ input: Buffer.from( topSvg( index, title, status, tone ) ), left: 0, top: 0 },
			{ input: Buffer.from( labelSvg( labelA, labelB ) ), left: 0, top: topHeight },
			{ input: shotA, left: 0, top: topHeight + labelHeight },
			{ input: shotB, left: viewport.width, top: topHeight + labelHeight },
			{
				input: Buffer.from( logSvg( action, evidence, meaning ) ),
				left: 0,
				top: topHeight + labelHeight + viewport.height,
			},
		] )
		.png()
		.toFile( path.join( framesDir, `frame-${ String( index ).padStart( 3, '0' ) }.png` ) );
}

async function captureSingleFrame( {
	page,
	index,
	title,
	status,
	action,
	evidence,
	meaning,
	label = 'Fresh browser window',
	tone = 'bug',
} ) {
	const shot = await page.screenshot( { type: 'png' } );
	const sideSvg = `
		<svg width="${ viewport.width }" height="${
		viewport.height + labelHeight
	}" xmlns="http://www.w3.org/2000/svg">
			<rect width="${ viewport.width }" height="${ labelHeight }" fill="#334155"/>
			<text x="24" y="31" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">Evidence summary</text>
			<rect y="${ labelHeight }" width="${ viewport.width }" height="${ viewport.height }" fill="#f8fafc" stroke="#94a3b8"/>
			${ panelText( 'Observed State', evidence, 36, 92, viewport.width - 72, '#0f766e' ) }
			${ panelText( 'Meaning', meaning, 36, 430, viewport.width - 72, '#b91c1c' ) }
		</svg>`;
	await sharp( {
		create: {
			width: frameWidth,
			height: frameHeight,
			channels: 4,
			background: '#ffffff',
		},
	} )
		.composite( [
			{ input: Buffer.from( topSvg( index, title, status, tone ) ), left: 0, top: 0 },
			{ input: Buffer.from( labelSvg( label, 'Evidence summary' ) ), left: 0, top: topHeight },
			{ input: shot, left: 0, top: topHeight + labelHeight },
			{
				input: Buffer.from( sideSvg ),
				left: viewport.width,
				top: topHeight,
			},
			{
				input: Buffer.from( logSvg( action, [], [] ) ),
				left: 0,
				top: topHeight + labelHeight + viewport.height,
			},
		] )
		.png()
		.toFile( path.join( framesDir, `frame-${ String( index ).padStart( 3, '0' ) }.png` ) );
}

function renderVideo() {
	if ( fsSync.existsSync( videoPath ) && ! allowOverwriteVideo ) {
		throw new Error(
			`Refusing to overwrite existing video: ${ videoPath }. Set ALLOW_OVERWRITE_VIDEO=1 to replace it.`
		);
	}
	execFileSync(
		'ffmpeg',
		[
			allowOverwriteVideo ? '-y' : '-n',
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

async function validateFrames() {
	const files = ( await fs.readdir( framesDir ) )
		.filter( ( file ) => /^frame-\d+\.png$/.test( file ) )
		.sort();
	const spotChecks = [];
	for ( const file of files ) {
		const fullPath = path.join( framesDir, file );
		const metadata = await sharp( fullPath ).metadata();
		spotChecks.push( {
			file,
			width: metadata.width,
			height: metadata.height,
			sizeBytes: ( await fs.stat( fullPath ) ).size,
		} );
	}
	return {
		checkedFrameCount: files.length,
		expectedFrameWidth: frameWidth,
		expectedFrameHeight: frameHeight,
		allFramesHaveExpectedSize: spotChecks.every(
			( check ) =>
				check.width === frameWidth &&
				check.height === frameHeight &&
				check.sizeBytes > 0
		),
		spotChecks,
	};
}

async function runAttempt( browser, attempt ) {
	await fs.rm( framesDir, { force: true, recursive: true } );
	await fs.mkdir( framesDir, { recursive: true } );
	runWpCli( [ 'option', 'update', 'wp_collaboration_enabled', '1' ] );

	const runId = `${ Date.now() }-${ process.pid }-${ attempt }`;
	const markerA = `A-SAVED-THEN-LOST-${ runId }`;
	const markerB = `B-STAYS-SAVED-${ runId }`;
	const postId = createPost( `RTC browser window ${ scenario }` );
	const room = `postType/post:${ postId }`;
	const evidence = {
		scenario,
		postId,
		markerA,
		markerB,
		room,
		attempt,
		trunk: runGit( [ 'rev-parse', 'HEAD' ] ),
	};

	let contextA;
	let contextB;
	let freshContext;
	let blockFreshSync = false;
	try {
		contextA = await browser.newContext( { baseURL } );
		contextB = await browser.newContext( { baseURL } );
		const pageA = await login( contextA );
		const pageB = await login( contextB );
		const syncA = syncObserver( pageA );
		const syncB = syncObserver( pageB );
		const traceA = attachRequestTrace( pageA, 'A', postId );
		const traceB = attachRequestTrace( pageB, 'B', postId );
		let blockBsync = false;
		let abortBsync = false;
		await pageB.route( /wp-sync/, async ( route ) => {
			while ( blockBsync && ! abortBsync ) {
				await sleep( 250 );
			}
			if ( abortBsync ) {
				try {
					await route.abort( 'aborted' );
				} catch {}
				return;
			}
			try {
				await route.continue();
			} catch {}
		} );

		await Promise.all( [
			openEditor( pageA, postId ),
			openEditor( pageB, postId ),
		] );
		await Promise.all( [
			waitForSyncRoom( syncA, room, 'Window A' ),
			waitForSyncRoom( syncB, room, 'Window B' ),
		] );
		await captureDualFrame( {
			pageA,
			pageB,
			index: 1,
			title: scenario === 'bad-autosave' ? 'Bad Autosave Browser Repro' : 'No Autosave Browser Repro',
			status: 'Both complete editor browser windows are open in an RTC-enabled session.',
			labelA: 'Window A: same admin account',
			labelB: 'Window B: same admin account',
			action: [
				`Created draft post ${ postId}.`,
				'Opened it in two editor browser windows.',
				'Confirmed /wp-sync room traffic in both windows.',
			],
			evidence: [
				`Current trunk: ${ evidence.trunk.slice( 0, 12 ) }`,
				`Room: ${ room }`,
				`/wp-sync counts: A=${ syncA.count }, B=${ syncB.count }`,
			],
			meaning: [
				'This is the RTC-enabled environment.',
				'Next, B polling is delayed to model a slow poll.',
			],
		} );

		blockBsync = true;
		await appendParagraphWithKeyboard( pageA, markerA );
		await saveDraftWithToolbar( pageA );
		await waitForServerText( pageA, postId, markerA );
		evidence.bHasABeforeBEdit = await editorHasText( pageB, markerA );
		await captureDualFrame( {
			pageA,
			pageB,
			index: 2,
			title: 'A Saves While B Is Still Stale',
			status: 'A saved A to the server; B has not received A.',
			labelA: 'Window A: typed and saved A',
			labelB: 'Window B: held /wp-sync, still stale',
			action: [
				'Held B /wp-sync responses.',
				'Window A typed A using the editor.',
				'Window A clicked the normal Save draft button.',
			],
			evidence: [
				`B editor has A before B edit: ${ evidence.bHasABeforeBEdit }`,
				'Server contains A after A save: true',
				`A marker starts ${ markerA.slice( 0, 26 ) }...`,
			],
			meaning: [
				'B can now perform a stale full-content save.',
				'No browser viewport is cropped in this frame.',
			],
		} );
		if ( evidence.bHasABeforeBEdit ) {
			throw new Error( 'B already had A before stale save.' );
		}

		await appendParagraphWithKeyboard( pageB, markerB );
		const bStateAfterTyping = await editorState( pageB, markerA, markerB );
		await captureDualFrame( {
			pageA,
			pageB,
			index: 3,
			title: 'B Edits While Missing A',
			status: 'B types B in the complete browser window while still missing A.',
			labelA: 'Window A: saved A',
			labelB: 'Window B: typed B while stale',
			action: [
				'Window B typed B using the editor.',
				'B still did not have A locally.',
				'Next, B clicks Save draft normally.',
			],
			evidence: [
				`B local state after typing: ${ markerSummary( bStateAfterTyping ) }`,
				`/wp-sync still held for B: true`,
			],
			meaning: [
				'This is the stale save setup.',
				'The next save can overwrite A in post_content.',
			],
		} );

		await saveDraftWithToolbar( pageB );
		const afterBSave = contentFlags(
			await persistedContent( pageB, postId ),
			markerA,
			markerB
		);
		evidence.canonicalAfterBSave = afterBSave;
		if ( afterBSave.hasA || ! afterBSave.hasB ) {
			throw new Error(
				`Stale overwrite not triggered; canonical ${ markerSummary( afterBSave ) }`
			);
		}

		if ( scenario === 'bad-autosave' ) {
			await captureDualFrame( {
				pageA,
				pageB,
				index: 4,
				title: 'B Save Persists B-Only Content',
				status: 'Immediately after B saves, canonical post_content has B but not A.',
				labelA: 'Window A',
				labelB: 'Window B: clicked Save draft',
				action: [
					'Window B clicked the toolbar Save draft button.',
					'The server accepted B full content.',
					'No user performed a restore action.',
				],
				evidence: [
					`Canonical after B save: ${ markerSummary( afterBSave ) }`,
					`Request trace count: ${ traceA.length + traceB.length }`,
				],
				meaning: [
					'The saved post has already lost A.',
					'The remaining question is whether autosave can rescue it.',
				],
			} );
			blockBsync = false;
			evidence.heal = await waitForBothEditorsToHaveBoth(
				pageA,
				pageB,
				markerA,
				markerB,
				90000
			);
			evidence.syncCountsAfterRelease = { A: syncA.count, B: syncB.count };
			await sleep( 8000 );
			evidence.canonicalBeforeClose = contentFlags(
				await persistedContent( pageB, postId ),
				markerA,
				markerB
			);
			evidence.revisionsBeforeClose = listRevisionRecords(
				postId,
				markerA,
				markerB
			);
			await captureDualFrame( {
				pageA,
				pageB,
				index: 5,
				title: 'Later State Creates A Bad Autosave',
				status: 'After waiting, an autosave exists but it is not A+B.',
				labelA: 'Window A before close',
				labelB: 'Window B before close',
				action: [
					'Released B /wp-sync polling.',
					`Waited ${ evidence.heal.waitedMs }ms for editor convergence.`,
					'Waited 8s more before closing tabs.',
				],
				evidence: [
					`Editor convergence: ${ evidence.heal.healed }`,
					`Canonical before close: ${ markerSummary( evidence.canonicalBeforeClose ) }`,
					summarizeRevisions( evidence.revisionsBeforeClose ),
				],
				meaning: [
					'The autosave rescue path is not corrected.',
					'It is missing one user edit.',
				],
			} );
		} else {
			const startedCloseWait = Date.now();
			evidence.heal = {
				state: null,
				healed: false,
				waitedMs: Date.now() - startedCloseWait,
			};
			evidence.syncCountsAtClose = { A: syncA.count, B: syncB.count };
			abortBsync = true;
			blockBsync = false;
		}

		evidence.requestsBeforeClose = summarizeRequests(
			[ ...traceA, ...traceB ],
			markerA,
			markerB
		);
		await Promise.all( [
			contextA.close().catch( () => {} ),
			contextB.close().catch( () => {} ),
		] );
		contextA = null;
		contextB = null;
		evidence.revisionsAfterClose = listRevisionRecords(
			postId,
			markerA,
			markerB
		);
		evidence.canonicalAfterClose = contentFlags(
			runWpCli( [ 'post', 'get', String( postId ), '--field=post_content' ] ),
			markerA,
			markerB
		);

		const afterCloseAutosaves = autosaveRecords(
			evidence.revisionsAfterClose
		);
		if ( scenario === 'no-autosave' && afterCloseAutosaves.length !== 0 ) {
			throw new Error(
				`Expected no autosave after close, saw ${ summarizeRevisions(
					evidence.revisionsAfterClose
				) }`
			);
		}
		if (
			scenario === 'bad-autosave' &&
			( afterCloseAutosaves.length === 0 ||
				afterCloseAutosaves.every( ( record ) => record.hasBoth ) )
		) {
			throw new Error(
				`Expected a bad autosave after close, saw ${ summarizeRevisions(
					evidence.revisionsAfterClose
				) }`
			);
		}

		freshContext = await browser.newContext( { baseURL } );
		const freshPage = await login( freshContext );
		blockFreshSync = true;
		await freshPage.route( /wp-sync/, async ( route ) => {
			while ( blockFreshSync ) {
				await sleep( 250 );
			}
			try {
				await route.continue();
			} catch {}
		} );
		await openEditor( freshPage, postId );
		await sleep( 3000 );
		if ( scenario === 'bad-autosave' ) {
			await freshPage
				.locator( '.components-notice' )
				.filter( {
					hasText:
						'There is an autosave of this post that is more recent than the version below.',
				} )
				.first()
				.waitFor( { state: 'visible', timeout: 15000 } )
				.catch( () => {} );
		}
		evidence.reopenEditorState = await editorState(
			freshPage,
			markerA,
			markerB
		);
		evidence.noticesAfterReopen = await visibleAutosaveNotices( freshPage );
		evidence.canonicalAfterReopen = contentFlags(
			await persistedContent( freshPage, postId ),
			markerA,
			markerB
		);
		evidence.revisionsAfterReopen = listRevisionRecords(
			postId,
			markerA,
			markerB
		);
		const href = await autosaveNoticeHref( freshPage );
		evidence.autosaveNoticeHref = href;
		if ( scenario === 'bad-autosave' && ! href ) {
			throw new Error(
				`Bad-autosave reopened without a visible autosave notice; afterClose=${ summarizeRevisions(
					evidence.revisionsAfterClose
				) }`
			);
		}
		await captureSingleFrame( {
			page: freshPage,
			index: scenario === 'bad-autosave' ? 6 : 4,
			title: 'Fresh Browser Window After Reopen',
			status: 'All original editor tabs were closed; /wp-sync is held for this screenshot.',
			label: 'Fresh reopened editor browser window',
			action: [
				'Closed both original browser windows.',
				'Opened the same post in a fresh browser window.',
				'Held fresh /wp-sync until this screenshot.',
				'Captured the whole editor viewport.',
			],
			evidence: [
				`Reopened editor: ${ markerSummary( evidence.reopenEditorState ) }`,
				`Canonical after reopen: ${ markerSummary( evidence.canonicalAfterReopen ) }`,
				`Autosave notices: ${ evidence.noticesAfterReopen.length }`,
				`After original close: ${ summarizeRevisions(
					evidence.revisionsAfterClose
				) }`,
			],
			meaning:
				scenario === 'bad-autosave'
					? [
							'The visible autosave notice is for an autosave that is not A+B.',
							'Canonical post_content is still B-only.',
					  ]
					: [
							'There is no autosave notice or autosave row.',
							'Canonical post_content is still B-only.',
					  ],
		} );
		blockFreshSync = false;

		if ( scenario === 'bad-autosave' && href ) {
			const autosavePage = await freshContext.newPage();
			await autosavePage.setViewportSize( viewport );
			await autosavePage.goto( href );
			await autosavePage.waitForLoadState( 'domcontentloaded' ).catch( () => {} );
			await autosavePage.waitForLoadState( 'networkidle' ).catch( () => {} );
			await captureSingleFrame( {
				page: autosavePage,
				index: 7,
				title: 'View The Autosave Browser Window',
				status: 'The autosave page is shown as a complete browser viewport.',
				label: 'Autosave/revision browser window',
				action: [
					'Opened the View the autosave link.',
					'Captured the autosave/revision page viewport.',
					'Compared it with raw revision content.',
				],
				evidence: [
					`Autosave href: ${ href }`,
					summarizeRevisions( evidence.revisionsAfterClose ),
					`Canonical after reopen: ${ markerSummary( evidence.canonicalAfterReopen ) }`,
				],
				meaning: [
					'The autosave is A-only, not A+B.',
					'Restoring it would not restore both users edits.',
				],
			} );
			await autosavePage.close().catch( () => {} );
		}

		if (
			scenario === 'no-autosave' &&
			( evidence.noticesAfterReopen.length ||
				autosaveRecords( evidence.revisionsAfterReopen ).length ||
				evidence.canonicalAfterReopen.hasA ||
				! evidence.canonicalAfterReopen.hasB )
		) {
			throw new Error(
				`No-autosave final state failed: notices=${ evidence.noticesAfterReopen.length }, afterReopenAutosaves=${ summarizeRevisions(
					evidence.revisionsAfterReopen
				) }, canonical=${ markerSummary( evidence.canonicalAfterReopen ) }`
			);
		}
		if (
			scenario === 'bad-autosave' &&
			( evidence.canonicalAfterReopen.hasA ||
				! evidence.canonicalAfterReopen.hasB ||
				autosaveRecords( evidence.revisionsAfterClose ).every(
					( record ) => record.hasBoth
				) )
		) {
			throw new Error(
				`Bad-autosave final state failed: canonical=${ markerSummary(
					evidence.canonicalAfterReopen
				) }, autosaves=${ summarizeRevisions( evidence.revisionsAfterClose ) }`
			);
		}

		evidence.status = 'completed';
		evidence.framesDir = framesDir;
		evidence.videoPath = videoPath;
		evidence.evidencePath = evidencePath;
		return evidence;
	} finally {
		blockFreshSync = false;
		await Promise.all( [
			contextA?.close().catch( () => {} ),
			contextB?.close().catch( () => {} ),
			freshContext?.close().catch( () => {} ),
		] );
	}
}

async function main() {
	const browser = await chromium.launch( { headless: true } );
	let lastError;
	try {
		for ( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
			try {
				const evidence = await runAttempt( browser, attempt );
				renderVideo();
				evidence.screenshotValidation = await validateFrames();
				evidence.ffprobe = ffprobeVideo();
				evidence.generatedAt = new Date().toISOString();
				evidence.scriptPath = __filename;
				await fs.writeFile( evidencePath, JSON.stringify( evidence, null, 2 ) );
				console.log( JSON.stringify( evidence, null, 2 ) );
				return;
			} catch ( error ) {
				lastError = error;
				console.error( `Attempt ${ attempt } failed: ${ error.message }` );
			}
		}
		throw lastError;
	} finally {
		await browser.close().catch( () => {} );
	}
}

main().catch( ( error ) => {
	console.error( error );
	process.exit( 1 );
} );
