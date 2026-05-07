import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __filename = fileURLToPath( import.meta.url );
const outDir = path.dirname( __filename );
const testedWorktree =
	process.env.GUTENBERG_WORKTREE ??
	'/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-current-trunk-20260506';
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8891';
const wpEnvConfig =
	process.env.WP_ENV_CONFIG ?? '.wp-env.stale-save-current-trunk.json';
const adminUser = process.env.WP_USERNAME ?? 'admin';
const adminPassword = process.env.WP_PASSWORD ?? 'password';
const experimentName =
	process.env.EXPERIMENT_NAME ?? `autosave-outcome-${ Date.now() }`;
const startDelayMs = Number( process.env.START_DELAY_MS ?? 0 );
const waitBeforeBSaveMs = Number( process.env.WAIT_BEFORE_B_SAVE_MS ?? 0 );
const waitAfterBSaveBeforeReleaseMs = Number(
	process.env.WAIT_AFTER_B_SAVE_BEFORE_RELEASE_MS ?? 0
);
const waitAfterHealBeforeCloseMs = Number(
	process.env.WAIT_AFTER_HEAL_BEFORE_CLOSE_MS ?? 0
);
const waitAfterReopenMs = Number( process.env.WAIT_AFTER_REOPEN_MS ?? 3000 );
const waitForHealTimeoutMs = Number(
	process.env.WAIT_FOR_HEAL_TIMEOUT_MS ?? 90000
);
const closeBeforePostHealInspection =
	process.env.CLOSE_BEFORE_POST_HEAL_INSPECTION === '1';
const skipPreSaveInspection = process.env.SKIP_PRE_SAVE_INSPECTION === '1';
const skipPreReleaseInspection =
	process.env.SKIP_PRE_RELEASE_INSPECTION === '1';
const editorLoadTimeoutMs = Number(
	process.env.EDITOR_LOAD_TIMEOUT_MS ?? 120000
);
const wpCliContainer =
	process.env.WP_CLI_CONTAINER ?? 'a7ee34b0383f6b22a430a77219940001-cli-1';
const outRoot =
	process.env.OUT_ROOT ??
	path.join( outDir, 'autosave-outcome-experiments' );
const outputPath =
	process.env.OUTPUT_PATH ??
	path.join( outRoot, `${ experimentName }.json` );
const viewport = { width: 960, height: 720 };

const env = {
	...process.env,
	PATH: `${ path.join( testedWorktree, 'node_modules/.bin' ) }:${
		process.env.PATH
	}`,
};

function runWpCli( args ) {
	if ( wpCliContainer && process.env.FORCE_WP_ENV !== '1' ) {
		let lastError;
		for ( let attempt = 0; attempt < 5; attempt++ ) {
			try {
				return execFileSync(
					'docker',
					[ 'exec', wpCliContainer, 'wp', ...args ],
					{
						encoding: 'utf8',
						stdio: [ 'ignore', 'pipe', 'pipe' ],
					}
				).trim();
			} catch ( error ) {
				lastError = error;
				const message = `${ error.message }\n${ error.stderr ?? '' }`;
				if (
					!/No such container|is restarting|container .* not running/i.test(
						message
					)
				) {
					throw error;
				}
				Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 ) ), 0, 0, 1000 );
			}
		}
		throw lastError;
	}
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
		if (
			! wpCliContainer ||
			! /Environment not initialized|Cannot connect|not running/i.test(
				stderr
			)
		) {
			throw error;
		}
		return execFileSync( 'docker', [ 'exec', wpCliContainer, 'wp', ...args ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		} ).trim();
	}
}

function runWpCliJson( args ) {
	const output = runWpCli( args );
	return output ? JSON.parse( output ) : null;
}

function runGit( args ) {
	return execFileSync( 'git', args, {
		cwd: testedWorktree,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} ).trim();
}

function paragraphMarkup( content ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function createPost() {
	const postCreateOutput = runWpCli( [
		'post',
		'create',
		'--post_type=post',
		'--post_status=draft',
		`--post_title=RTC autosave outcome ${ experimentName } ${ Date.now() }`,
		`--post_content=${ paragraphMarkup( 'Initial body.' ) }`,
		'--porcelain',
	] );
	const postId = Number( postCreateOutput.match( /^\d+$/m )?.[ 0 ] );
	if ( ! postId ) {
		throw new Error( `Could not parse created post ID: ${ postCreateOutput }` );
	}
	return postId;
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
		{ timeout: editorLoadTimeoutMs }
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
		{ timeout: editorLoadTimeoutMs }
	);
	await page.waitForFunction(
		() => document.querySelector( 'iframe[name="editor-canvas"]' ),
		undefined,
		{ timeout: editorLoadTimeoutMs }
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
	timeout = waitForHealTimeoutMs
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

function contentFlags( content, markerA, markerB ) {
	return {
		hasA: String( content ).includes( markerA ),
		hasB: String( content ).includes( markerB ),
		hasBoth:
			String( content ).includes( markerA ) &&
			String( content ).includes( markerB ),
		length: String( content ).length,
		content,
	};
}

function listRevisionRecords( postId, markerA, markerB ) {
	const records = runWpCliJson( [
		'post',
		'list',
		`--post_parent=${ postId }`,
		'--post_type=revision',
		'--fields=ID,post_name,post_type,post_status,post_modified_gmt',
		'--format=json',
	] );
	return records.map( ( record ) => {
		let content = '';
		let readError = null;
		try {
			content = runWpCli( [
				'post',
				'get',
				String( record.ID ),
				'--field=post_content',
			] );
		} catch ( error ) {
			readError = error.message;
		}
		return {
			id: Number( record.ID ),
			postName: record.post_name,
			postType: record.post_type,
			postStatus: record.post_status,
			postModifiedGmt: record.post_modified_gmt,
			isAutosave: /autosave/i.test( record.post_name ?? '' ),
			readError,
			...contentFlags( content, markerA, markerB ),
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
			requestLength: request.length,
			responseLength: response.length,
		};
	} );
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

async function main() {
	await fs.mkdir( path.dirname( outputPath ), { recursive: true } );
	const browser = await chromium.launch( { headless: true } );
	const result = {
		experimentName,
		outputPath,
		startedAt: new Date().toISOString(),
		trunk: runGit( [ 'rev-parse', 'HEAD' ] ),
		config: {
			startDelayMs,
			waitBeforeBSaveMs,
			waitAfterBSaveBeforeReleaseMs,
			waitAfterHealBeforeCloseMs,
			waitAfterReopenMs,
			waitForHealTimeoutMs,
			closeBeforePostHealInspection,
			skipPreSaveInspection,
			skipPreReleaseInspection,
		},
	};
	if ( startDelayMs > 0 ) {
		await sleep( startDelayMs );
	}
	runWpCli( [ 'option', 'update', 'wp_collaboration_enabled', '1' ] );

	let contextA;
	let contextB;
	let reopenContext;
	try {
		const runId = `${ Date.now() }-${ process.pid }`;
		const markerA = `A-SAVED-THEN-LOST-${ runId }`;
		const markerB = `B-STAYS-SAVED-${ runId }`;
		const postId = createPost();
		const room = `postType/post:${ postId }`;
		Object.assign( result, { postId, markerA, markerB, room } );

		contextA = await browser.newContext( { baseURL } );
		contextB = await browser.newContext( { baseURL } );
		const pageA = await login( contextA );
		const pageB = await login( contextB );
		const syncA = syncObserver( pageA );
		const syncB = syncObserver( pageB );
		const traceA = attachRequestTrace( pageA, 'A', postId );
		const traceB = attachRequestTrace( pageB, 'B', postId );
		let blockBsync = false;
		await pageB.route( /wp-sync/, async ( route ) => {
			while ( blockBsync ) {
				await sleep( 250 );
			}
			return route.continue();
		} );

		await Promise.all( [
			openEditor( pageA, postId ),
			openEditor( pageB, postId ),
		] );
		await Promise.all( [
			waitForSyncRoom( syncA, room, 'Window A' ),
			waitForSyncRoom( syncB, room, 'Window B' ),
		] );

		blockBsync = true;
		await appendParagraphWithKeyboard( pageA, markerA );
		await saveDraftWithToolbar( pageA );
		await waitForServerText( pageA, postId, markerA );
		result.bHasABeforeBEdit = await editorHasText( pageB, markerA );
		if ( result.bHasABeforeBEdit ) {
			throw new Error( 'B already had A before stale edit.' );
		}

		await appendParagraphWithKeyboard( pageB, markerB );
		result.bStateAfterTypingB = {
			hasA: await editorHasText( pageB, markerA ),
			hasB: await editorHasText( pageB, markerB ),
		};
		if ( waitBeforeBSaveMs > 0 ) {
			await sleep( waitBeforeBSaveMs );
		}
		if ( ! skipPreSaveInspection ) {
			result.revisionsBeforeBSave = listRevisionRecords(
				postId,
				markerA,
				markerB
			);
		}

		await saveDraftWithToolbar( pageB );
		const contentAfterBSave = await persistedContent( pageB, postId );
		result.canonicalAfterBSave = contentFlags(
			contentAfterBSave,
			markerA,
			markerB
		);
		if ( waitAfterBSaveBeforeReleaseMs > 0 ) {
			await sleep( waitAfterBSaveBeforeReleaseMs );
		}
		if ( ! skipPreReleaseInspection ) {
			result.revisionsBeforeRelease = listRevisionRecords(
				postId,
				markerA,
				markerB
			);
		}

		blockBsync = false;
		result.heal = await waitForBothEditorsToHaveBoth(
			pageA,
			pageB,
			markerA,
			markerB
		);
		result.syncCountsAfterHeal = { A: syncA.count, B: syncB.count };
		result.requestsBeforeClose = summarizeRequests(
			[ ...traceA, ...traceB ],
			markerA,
			markerB
		);

		if ( closeBeforePostHealInspection ) {
			await Promise.all( [
				contextA.close().catch( () => {} ),
				contextB.close().catch( () => {} ),
			] );
			contextA = null;
			contextB = null;
		} else {
			result.canonicalAfterHeal = contentFlags(
				await persistedContent( pageB, postId ),
				markerA,
				markerB
			);
			result.revisionsAfterHeal = listRevisionRecords(
				postId,
				markerA,
				markerB
			);

			if ( waitAfterHealBeforeCloseMs > 0 ) {
				await sleep( waitAfterHealBeforeCloseMs );
			}
			result.canonicalBeforeClose = contentFlags(
				await persistedContent( pageB, postId ),
				markerA,
				markerB
			);
			result.revisionsBeforeClose = listRevisionRecords(
				postId,
				markerA,
				markerB
			);
			result.noticesBeforeClose = {
				A: await visibleAutosaveNotices( pageA ),
				B: await visibleAutosaveNotices( pageB ),
			};
		}

		await Promise.all( [
			contextA?.close().catch( () => {} ),
			contextB?.close().catch( () => {} ),
		] );
		contextA = null;
		contextB = null;
		result.revisionsAfterClose = listRevisionRecords(
			postId,
			markerA,
			markerB
		);
		result.canonicalAfterClose = contentFlags(
			runWpCli( [ 'post', 'get', String( postId ), '--field=post_content' ] ),
			markerA,
			markerB
		);

		reopenContext = await browser.newContext( { baseURL } );
		const reopenPage = await login( reopenContext );
		await openEditor( reopenPage, postId );
		if ( waitAfterReopenMs > 0 ) {
			await sleep( waitAfterReopenMs );
		}
		result.reopenEditorState = {
			hasA: await editorHasText( reopenPage, markerA ),
			hasB: await editorHasText( reopenPage, markerB ),
		};
		result.noticesAfterReopen = await visibleAutosaveNotices( reopenPage );
		result.canonicalAfterReopen = contentFlags(
			await persistedContent( reopenPage, postId ),
			markerA,
			markerB
		);
		result.revisionsAfterReopen = listRevisionRecords(
			postId,
			markerA,
			markerB
		);
		result.status = 'completed';
	} catch ( error ) {
		result.status = 'failed';
		result.error = {
			message: error.message,
			stack: error.stack,
		};
		process.exitCode = 1;
	} finally {
		result.finishedAt = new Date().toISOString();
		await fs.writeFile( outputPath, JSON.stringify( result, null, 2 ) );
		await Promise.all( [
			contextA?.close().catch( () => {} ),
			contextB?.close().catch( () => {} ),
			reopenContext?.close().catch( () => {} ),
		] );
		await browser.close().catch( () => {} );
		console.log( JSON.stringify( result, null, 2 ) );
	}
}

main();
