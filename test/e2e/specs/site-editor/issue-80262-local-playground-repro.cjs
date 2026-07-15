#!/usr/bin/env node

/**
 * Local-only natural reproduction for Gutenberg issue #80262.
 *
 * Required environment variables:
 *   LOCAL_PLAYGROUND_DIST  Extracted browser Playground distribution.
 *   LOCAL_GUTENBERG_ZIP   Locally built/downloaded Gutenberg plugin ZIP.
 *
 * Alternatively, LOCAL_PLAYGROUND_URL may point to an already configured
 * loopback-only Playground. The URL and any blueprint URL must use loopback.
 *
 * Optional environment variables:
 *   LOCAL_WORDPRESS_VERSION  Bundled Playground WordPress build (default beta).
 *   CHROME_PATH               Chrome executable (default Playwright Chromium).
 *   IDLE_MS                   Disconnected idle duration (default 45000).
 *   RUN_TIMEOUT_MS            Overall watchdog (default 360000).
 *   ARTIFACT_DIR              Parent for an issue-owned run directory.
 *   KEEP_ARTIFACTS            Keep the run directory when set to 1.
 *
 * The parent launches raw headless Chrome. Each automation phase is a separate
 * short-lived Node process using Playwright's CDP connection. Consequently no
 * Playwright driver or CDP socket exists during the idle interval. The only
 * post-idle trigger is trusted clicks in the Site Editor UI.
 */

const fs = require( 'node:fs' );
const http = require( 'node:http' );
const os = require( 'node:os' );
const path = require( 'node:path' );
const { fork, spawn } = require( 'node:child_process' );

const PROFILE_PREFIX = 'gutenberg-issue-80262-local-profile-';
const ARTIFACT_PREFIX = 'gutenberg-issue-80262-local-run-';
const EXPECTED_EXCEPTION =
	"TypeError: Cannot destructure property 'documentElement' of 'N' as it is null.";
const LOOPBACK_HOSTS = new Set( [ '127.0.0.1', 'localhost', '[::1]' ] );
const NETWORK_PROTOCOLS = new Set( [ 'http:', 'https:', 'ws:', 'wss:' ] );
const OPTIONAL_BLOCKED_HOSTS = new Set( [
	'fonts.googleapis.com',
	'fonts.gstatic.com',
	'secure.gravatar.com',
	'www.google-analytics.com',
	'www.googletagmanager.com',
] );
const MIME_TYPES = {
	'.css': 'text/css; charset=utf-8',
	'.dat': 'application/octet-stream',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.wasm': 'application/wasm',
	'.zip': 'application/zip',
	'.zst': 'application/octet-stream',
};
const activePhaseChildren = new Set();

const sleep = ( milliseconds ) =>
	new Promise( ( resolve ) => setTimeout( resolve, milliseconds ) );

function isLoopbackUrl( value ) {
	let url;
	try {
		url = new URL( value );
	} catch {
		return false;
	}
	return (
		[ 'http:', 'https:' ].includes( url.protocol ) &&
		LOOPBACK_HOSTS.has( url.hostname ) &&
		! url.username &&
		! url.password
	);
}

function assertLoopbackPlaygroundUrl( value ) {
	if ( ! isLoopbackUrl( value ) ) {
		throw new Error(
			`LOCAL_PLAYGROUND_URL must be an HTTP(S) loopback URL; received ${ value }`
		);
	}
	const url = new URL( value );
	const blueprintUrl = url.searchParams.get( 'blueprint-url' );
	if ( blueprintUrl && ! isLoopbackUrl( blueprintUrl ) ) {
		throw new Error(
			`The Playground blueprint URL must be loopback-only; received ${ blueprintUrl }`
		);
	}
	return url.toString();
}

function isExternalNetworkUrl( value ) {
	try {
		const url = new URL( value );
		return (
			NETWORK_PROTOCOLS.has( url.protocol ) &&
			! LOOPBACK_HOSTS.has( url.hostname )
		);
	} catch {
		return false;
	}
}

function parsePositiveInteger( name, fallback, { allowZero = false } = {} ) {
	const value = Number.parseInt( process.env[ name ] || fallback, 10 );
	if (
		! Number.isFinite( value ) ||
		( allowZero ? value < 0 : value <= 0 )
	) {
		throw new Error( `Invalid ${ name }: ${ process.env[ name ] }` );
	}
	return value;
}

function validateFile( value, name ) {
	const resolved = path.resolve( value );
	let stats;
	try {
		stats = fs.statSync( resolved );
	} catch {
		throw new Error( `${ name } does not exist: ${ resolved }` );
	}
	if ( ! stats.isFile() ) {
		throw new Error( `${ name } is not a file: ${ resolved }` );
	}
	return resolved;
}

function validateDistribution( value ) {
	const resolved = path.resolve( value );
	let stats;
	try {
		stats = fs.statSync( resolved );
	} catch {
		throw new Error(
			`LOCAL_PLAYGROUND_DIST does not exist: ${ resolved }`
		);
	}
	if ( ! stats.isDirectory() ) {
		throw new Error(
			`LOCAL_PLAYGROUND_DIST is not a directory: ${ resolved }`
		);
	}
	for ( const requiredFile of [ 'index.html', 'sw.js' ] ) {
		validateFile(
			path.join( resolved, requiredFile ),
			`Playground ${ requiredFile }`
		);
	}
	return resolved;
}

function makeArtifactDirectory() {
	const parent = process.env.ARTIFACT_DIR
		? path.resolve( process.env.ARTIFACT_DIR )
		: os.tmpdir();
	fs.mkdirSync( parent, { recursive: true } );
	return fs.mkdtempSync( path.join( parent, ARTIFACT_PREFIX ) );
}

function removeOwnedDirectory( directory, prefix ) {
	const resolved = path.resolve( directory );
	const base = path.basename( resolved );
	if ( ! base.startsWith( prefix ) ) {
		throw new Error( `Refusing to remove unowned path: ${ resolved }` );
	}
	fs.rmSync( resolved, {
		recursive: true,
		force: true,
		maxRetries: 20,
		retryDelay: 100,
	} );
}

function contentRange( rangeHeader, size ) {
	const match = /^bytes=(\d*)-(\d*)$/.exec( rangeHeader || '' );
	if ( ! match ) {
		return null;
	}
	let start = match[ 1 ] ? Number.parseInt( match[ 1 ], 10 ) : null;
	let end = match[ 2 ] ? Number.parseInt( match[ 2 ], 10 ) : null;
	if ( start === null && end !== null ) {
		start = Math.max( size - end, 0 );
		end = size - 1;
	} else {
		start = start ?? 0;
		end = Math.min( end ?? size - 1, size - 1 );
	}
	if ( start < 0 || end < start || start >= size ) {
		return null;
	}
	return { start, end };
}

function serveFile( request, response, filePath ) {
	let stats;
	try {
		stats = fs.statSync( filePath );
	} catch {
		response.writeHead( 404 ).end( 'Not found' );
		return;
	}
	if ( ! stats.isFile() ) {
		response.writeHead( 404 ).end( 'Not found' );
		return;
	}
	const range = contentRange( request.headers.range, stats.size );
	const headers = {
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'no-store',
		'Content-Type':
			MIME_TYPES[ path.extname( filePath ).toLowerCase() ] ||
			'application/octet-stream',
		'Service-Worker-Allowed': '/',
	};
	if ( request.headers.range && ! range ) {
		response.writeHead( 416, {
			...headers,
			'Content-Range': `bytes */${ stats.size }`,
		} );
		response.end();
		return;
	}
	if ( range ) {
		headers[ 'Content-Length' ] = range.end - range.start + 1;
		headers[
			'Content-Range'
		] = `bytes ${ range.start }-${ range.end }/${ stats.size }`;
		response.writeHead( 206, headers );
	} else {
		headers[ 'Content-Length' ] = stats.size;
		response.writeHead( 200, headers );
	}
	if ( request.method === 'HEAD' ) {
		response.end();
		return;
	}
	fs.createReadStream( filePath, range || undefined ).pipe( response );
}

async function listen( server ) {
	await new Promise( ( resolve, reject ) => {
		server.once( 'error', reject );
		server.listen( 0, '127.0.0.1', () => {
			server.removeListener( 'error', reject );
			resolve();
		} );
	} );
	return server.address().port;
}

async function closeServer( server ) {
	if ( ! server?.listening ) {
		return;
	}
	await new Promise( ( resolve ) => server.close( resolve ) );
}

async function startStaticPlaygroundServer( distribution, gutenbergZip ) {
	const requests = [];
	let origin;
	const server = http.createServer( ( request, response ) => {
		const requestUrl = new URL( request.url, origin );
		requests.push( {
			method: request.method,
			pathname: requestUrl.pathname,
			at: Date.now(),
		} );
		if ( ! [ 'GET', 'HEAD' ].includes( request.method ) ) {
			response.writeHead( 405, { Allow: 'GET, HEAD' } ).end();
			return;
		}
		if ( requestUrl.pathname === '/local-assets/gutenberg.zip' ) {
			serveFile( request, response, gutenbergZip );
			return;
		}
		if ( requestUrl.pathname === '/local-assets/blueprint.json' ) {
			const blueprint = JSON.stringify( {
				$schema: `${ origin }/blueprint-schema.json`,
				landingPage: '/wp-admin/site-editor.php',
				preferredVersions: {
					php: '8.2',
					wp: process.env.LOCAL_WORDPRESS_VERSION || 'beta',
				},
				features: { networking: false },
				login: true,
				steps: [
					{
						step: 'activateTheme',
						themeFolderName: 'twentytwentyfive',
					},
					{
						step: 'installPlugin',
						pluginData: {
							resource: 'url',
							url: `${ origin }/local-assets/gutenberg.zip`,
						},
						options: { activate: true },
					},
				],
			} );
			response.writeHead( 200, {
				'Cache-Control': 'no-store',
				'Content-Length': Buffer.byteLength( blueprint ),
				'Content-Type': 'application/json; charset=utf-8',
			} );
			response.end( request.method === 'HEAD' ? undefined : blueprint );
			return;
		}
		let pathname;
		try {
			pathname = decodeURIComponent( requestUrl.pathname );
		} catch {
			response.writeHead( 400 ).end( 'Bad path' );
			return;
		}
		if ( pathname === '/' ) {
			pathname = '/index.html';
		}
		const relative = path.posix.normalize( pathname ).replace( /^\/+/, '' );
		const filePath = path.resolve( distribution, relative );
		if (
			filePath !== distribution &&
			! filePath.startsWith( `${ distribution }${ path.sep }` )
		) {
			response.writeHead( 403 ).end( 'Forbidden' );
			return;
		}
		serveFile( request, response, filePath );
	} );
	const port = await listen( server );
	origin = `http://127.0.0.1:${ port }`;
	const blueprintUrl = `${ origin }/local-assets/blueprint.json`;
	return {
		server,
		requests,
		origin,
		url: `${ origin }/?blueprint-url=${ encodeURIComponent(
			blueprintUrl
		) }&networking=no`,
	};
}

function signalProcessTree( child, signal ) {
	if ( ! child?.pid ) {
		return;
	}
	try {
		if ( process.platform === 'win32' ) {
			child.kill( signal );
		} else {
			process.kill( -child.pid, signal );
		}
	} catch ( error ) {
		if ( error.code !== 'ESRCH' ) {
			throw error;
		}
	}
}

function installEmergencyCleanup( {
	getChromeProcess,
	profileDir,
	artifactDir,
	keepArtifacts,
} ) {
	let cleanupStarted = false;
	const cleanup = () => {
		if ( cleanupStarted ) {
			return;
		}
		cleanupStarted = true;
		for ( const child of activePhaseChildren ) {
			try {
				signalProcessTree( child, 'SIGKILL' );
			} catch {}
		}
		try {
			signalProcessTree( getChromeProcess(), 'SIGKILL' );
		} catch {}
		try {
			removeOwnedDirectory( profileDir, PROFILE_PREFIX );
		} catch {}
		if ( ! keepArtifacts ) {
			try {
				removeOwnedDirectory( artifactDir, ARTIFACT_PREFIX );
			} catch {}
		}
	};
	const signalHandlers = new Map();
	for ( const signal of [ 'SIGINT', 'SIGTERM' ] ) {
		const handler = () => {
			cleanup();
			remove();
			process.kill( process.pid, signal );
		};
		signalHandlers.set( signal, handler );
		process.on( signal, handler );
	}
	const exitHandler = () => cleanup();
	process.on( 'exit', exitHandler );
	function remove() {
		for ( const [ signal, handler ] of signalHandlers ) {
			process.removeListener( signal, handler );
		}
		process.removeListener( 'exit', exitHandler );
	}
	return { cleanup, remove };
}

async function waitForDevToolsPort(
	chromeProcess,
	profileDir,
	timeout = 30_000
) {
	const portFile = path.join( profileDir, 'DevToolsActivePort' );
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		if ( chromeProcess.exitCode !== null ) {
			throw new Error(
				`Chrome exited with ${ chromeProcess.exitCode }.`
			);
		}
		try {
			const [ port ] = fs
				.readFileSync( portFile, 'utf8' )
				.trim()
				.split( /\r?\n/ );
			if ( port ) {
				return Number.parseInt( port, 10 );
			}
		} catch ( error ) {
			if ( error.code !== 'ENOENT' ) {
				throw error;
			}
		}
		await sleep( 50 );
	}
	throw new Error( 'Timed out waiting for Chrome DevTools.' );
}

async function stopChild( child ) {
	if ( ! child || child.exitCode !== null || child.signalCode !== null ) {
		return;
	}
	signalProcessTree( child, 'SIGTERM' );
	await Promise.race( [
		new Promise( ( resolve ) => child.once( 'exit', resolve ) ),
		sleep( 2_000 ),
	] );
	if ( child.exitCode === null && child.signalCode === null ) {
		signalProcessTree( child, 'SIGKILL' );
	}
}

async function runPhase( name, config, timeout ) {
	return new Promise( ( resolve, reject ) => {
		const child = fork( __filename, [ '--phase-child', name ], {
			detached: process.platform !== 'win32',
			env: {
				...process.env,
				ISSUE_80262_PHASE_CONFIG: Buffer.from(
					JSON.stringify( config )
				).toString( 'base64url' ),
			},
			stdio: [ 'ignore', 'pipe', 'pipe', 'ipc' ],
		} );
		activePhaseChildren.add( child );
		let stdout = '';
		let stderr = '';
		let result;
		const progress = [];
		const timer = setTimeout( () => {
			stopChild( child ).finally( () =>
				reject(
					new Error(
						`${ name } phase exceeded ${ timeout }ms.\n${ stderr }`
					)
				)
			);
		}, timeout );
		child.stdout.on( 'data', ( chunk ) => {
			stdout = `${ stdout }${ chunk }`.slice( -50_000 );
		} );
		child.stderr.on( 'data', ( chunk ) => {
			stderr = `${ stderr }${ chunk }`.slice( -50_000 );
		} );
		child.on( 'message', ( message ) => {
			if ( message?.type === 'phase-result' ) {
				result = message.result;
			} else if ( message?.type === 'phase-progress' ) {
				progress.push( message );
				// eslint-disable-next-line no-console
				console.log(
					`[issue-80262:${ name }] ${ message.stage }${
						message.detail
							? ` ${ JSON.stringify( message.detail ) }`
							: ''
					}`
				);
			}
		} );
		child.once( 'error', ( error ) => {
			clearTimeout( timer );
			activePhaseChildren.delete( child );
			reject( error );
		} );
		child.once( 'exit', ( code, signal ) => {
			clearTimeout( timer );
			activePhaseChildren.delete( child );
			if ( code === 0 && result ) {
				resolve( result );
				return;
			}
			reject(
				new Error(
					`${ name } phase exited ${
						code === null ? `from ${ signal }` : `with ${ code }`
					}. progress=${ JSON.stringify( progress ) }\n${
						stderr || stdout
					}`
				)
			);
		} );
	} );
}

function reportPhaseProgress( stage, detail ) {
	process.send?.( { type: 'phase-progress', stage, detail } );
}

async function waitForWordPressFrame( page, timeout = 180_000 ) {
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		for ( const candidate of page.frames() ) {
			if (
				candidate.name() === 'wp' &&
				candidate.url().includes( '/scope:' )
			) {
				return candidate;
			}
			// The self-hosted beta build leaves the nested WordPress iframe
			// unnamed and Playwright may report an empty Frame.url() across its
			// document-isolated boundary. Reading its own location identifies it.
			const href = await candidate
				.evaluate( () => location.href )
				.catch( () => '' );
			if ( href.includes( '/scope:' ) ) {
				return candidate;
			}
		}
		await page.waitForTimeout( 100 );
	}
	throw new Error( 'Timed out waiting for the local WordPress frame.' );
}

async function firstVisible( locators ) {
	for ( const locator of locators ) {
		if ( await locator.isVisible().catch( () => false ) ) {
			return locator;
		}
	}
	return null;
}

async function waitForFirstVisible( locators, timeout = 60_000 ) {
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		const locator = await firstVisible( locators );
		if ( locator ) {
			return locator;
		}
		await sleep( 100 );
	}
	return null;
}

async function canvasState( wordpressFrame ) {
	return wordpressFrame.evaluate( () => {
		const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
		if ( ! frame ) {
			return { exists: false };
		}
		let contentDocument = null;
		let accessError = null;
		try {
			contentDocument = frame.contentDocument;
		} catch ( error ) {
			accessError = error.message;
		}
		return {
			exists: true,
			connected: frame.isConnected,
			hasDocument: Boolean( contentDocument ),
			accessError,
			readyState: contentDocument?.readyState || null,
			bodyChildren: contentDocument?.body?.childElementCount ?? null,
			bodyText: contentDocument?.body?.innerText?.slice( 0, 500 ) || null,
		};
	} );
}

async function dismissOnboarding( wordpressFrame ) {
	const getStarted = wordpressFrame.getByRole( 'button', {
		name: 'Get started',
		exact: true,
	} );
	if ( await getStarted.isVisible().catch( () => false ) ) {
		await getStarted.click();
		const noThanks = wordpressFrame.getByRole( 'button', {
			name: 'No, thanks',
			exact: true,
		} );
		if ( await noThanks.isVisible().catch( () => false ) ) {
			await noThanks.click();
		}
	}
}

async function navigateToDesignRoot( wordpressFrame, page ) {
	const identity = wordpressFrame.getByRole( 'button', {
		name: 'Identity',
		exact: true,
	} );
	const openNavigation = wordpressFrame.getByRole( 'button', {
		name: 'Open Navigation',
		exact: true,
	} );
	const getStarted = wordpressFrame.getByRole( 'button', {
		name: 'Get started',
		exact: true,
	} );
	let entryControl;
	const entryDeadline = Date.now() + 120_000;
	while ( Date.now() < entryDeadline ) {
		entryControl = await waitForFirstVisible(
			[ identity, openNavigation, getStarted ],
			Math.min( entryDeadline - Date.now(), 30_000 )
		);
		if ( entryControl === getStarted ) {
			await dismissOnboarding( wordpressFrame );
			continue;
		}
		break;
	}
	if ( entryControl === identity ) {
		return { backClicks: 0, intermediateClicks: [] };
	}
	if ( entryControl !== openNavigation ) {
		throw new Error(
			'Neither root Design nor Open Navigation appeared before idle.'
		);
	}
	await openNavigation.click();
	reportPhaseProgress( 'clicked-open-navigation-before-idle' );
	let backClicks = 0;
	const intermediateClicks = [];
	while ( intermediateClicks.length < 3 ) {
		const back = wordpressFrame.getByRole( 'button', {
			name: 'Back',
			exact: true,
		} );
		const goToSiteEditor = wordpressFrame.getByRole( 'button', {
			name: 'Go to Site Editor',
			exact: true,
		} );
		const control = await waitForFirstVisible(
			[ identity, back, goToSiteEditor ],
			30_000
		);
		if ( control === identity ) {
			return { backClicks, intermediateClicks };
		}
		if ( control !== back && control !== goToSiteEditor ) {
			throw new Error(
				'Could not reach the root Design navigation before idle.'
			);
		}
		await control.click();
		intermediateClicks.push(
			control === back ? 'Back' : 'Go to Site Editor'
		);
		backClicks = intermediateClicks.filter(
			( name ) => name === 'Back'
		).length;
		reportPhaseProgress( 'clicked-intermediate-before-idle', {
			control: intermediateClicks.at( -1 ),
		} );
		await page.waitForTimeout( 250 );
	}
	throw new Error(
		'Too many intermediate controls while reaching Design before idle.'
	);
}

function uniqueExternalRequests( requests ) {
	return [
		...new Set(
			requests
				.filter( isExternalNetworkUrl )
				.map( ( value ) => value.slice( 0, 500 ) )
		),
	];
}

function headerValue( headers, wantedName ) {
	const entry = Object.entries( headers || {} ).find(
		( [ name ] ) => name.toLowerCase() === wantedName
	);
	return entry?.[ 1 ] ?? null;
}

function externalAttemptHost( value ) {
	const target = value.replace( /^[A-Z]+\s+/, '' );
	try {
		return new URL(
			target.includes( '://' ) ? target : `https://${ target }`
		).hostname;
	} catch {
		return null;
	}
}

function isKnownOptionalBlockedAttempt( value ) {
	const host = externalAttemptHost( value );
	return Boolean(
		host &&
			( OPTIONAL_BLOCKED_HOSTS.has( host ) ||
				host.endsWith( '.gravatar.com' ) )
	);
}

async function connectToRawChrome( endpoint ) {
	const { chromium } = require( '@playwright/test' );
	const browser = await chromium.connectOverCDP( endpoint, {
		timeout: 30_000,
	} );
	const [ context ] = browser.contexts();
	if ( ! context ) {
		throw new Error( 'Raw Chrome had no persistent browser context.' );
	}
	let [ page ] = context.pages();
	if ( ! page ) {
		page = await context.newPage();
	}
	await page.setViewportSize( { width: 1440, height: 1000 } );
	return { browser, context, page };
}

async function setupPhase( config ) {
	const { context, page } = await connectToRawChrome( config.endpoint );
	reportPhaseProgress( 'cdp-connected' );
	const requestUrls = [];
	const externalRequestFailures = [];
	const externalSuccessfulResponses = [];
	page.on( 'request', ( request ) => requestUrls.push( request.url() ) );
	page.on( 'requestfailed', ( request ) => {
		if ( isExternalNetworkUrl( request.url() ) ) {
			externalRequestFailures.push( {
				url: request.url(),
				error: request.failure()?.errorText || null,
			} );
		}
	} );
	page.on( 'response', ( response ) => {
		if (
			isExternalNetworkUrl( response.url() ) &&
			response.status() < 400
		) {
			externalSuccessfulResponses.push( {
				url: response.url(),
				status: response.status(),
			} );
		}
	} );
	await page.goto( config.playgroundUrl, {
		waitUntil: 'domcontentloaded',
		timeout: 180_000,
	} );
	reportPhaseProgress( 'outer-dom-ready', { url: page.url() } );
	const wordpressFrame = await waitForWordPressFrame( page );
	reportPhaseProgress( 'wordpress-frame-ready', {
		url: wordpressFrame.url(),
	} );
	await dismissOnboarding( wordpressFrame );
	const siteEditorLink = wordpressFrame.locator(
		'#wp-admin-bar-site-editor a, #wp-admin-bar-edit-site a'
	);
	if (
		! ( await wordpressFrame
			.getByRole( 'button', {
				name: /^(Open Navigation|Identity)$/,
			} )
			.first()
			.isVisible()
			.catch( () => false ) ) &&
		( await siteEditorLink
			.first()
			.isVisible()
			.catch( () => false ) )
	) {
		reportPhaseProgress( 'click-site-editor-admin-bar' );
		await siteEditorLink.first().click();
	}
	await dismissOnboarding( wordpressFrame );
	const designNavigation = await navigateToDesignRoot( wordpressFrame, page );
	reportPhaseProgress( 'design-root-ready', designNavigation );
	const designCanvasDeadline = Date.now() + 90_000;
	let designCanvas;
	do {
		designCanvas = await canvasState( wordpressFrame );
		if (
			designCanvas.exists &&
			designCanvas.hasDocument &&
			designCanvas.bodyChildren > 0
		) {
			break;
		}
		await page.waitForTimeout( 100 );
	} while ( Date.now() < designCanvasDeadline );
	if (
		! designCanvas?.exists ||
		! designCanvas.hasDocument ||
		designCanvas.bodyChildren <= 0
	) {
		throw new Error(
			`Design-root canvas was not healthy before idle: ${ JSON.stringify(
				designCanvas
			) }`
		);
	}
	reportPhaseProgress( 'design-root-canvas-healthy', designCanvas );
	await wordpressFrame.evaluate( () => {
		const records = [];
		Object.defineProperty( window, '__issue80262ErrorRecords', {
			value: records,
			configurable: true,
		} );
		const append = ( record ) => {
			records.push( { at: Date.now(), ...record } );
			if ( records.length > 100 ) {
				records.shift();
			}
		};
		window.addEventListener(
			'error',
			( event ) =>
				append( {
					type: 'error',
					message: event.message || null,
					text: event.error
						? `${ event.error.name }: ${ event.error.message }`
						: event.message || null,
					stack: event.error?.stack || null,
					filename: event.filename || null,
					line: event.lineno || null,
					column: event.colno || null,
				} ),
			true
		);
		window.addEventListener( 'unhandledrejection', ( event ) => {
			const reason = event.reason;
			append( {
				type: 'unhandledrejection',
				message: reason?.message || String( reason ),
				text: reason?.name
					? `${ reason.name }: ${ reason.message }`
					: String( reason ),
				stack: reason?.stack || null,
			} );
		} );
	} );
	reportPhaseProgress( 'passive-error-buffer-installed' );
	const workers = context.serviceWorkers().map( ( worker ) => worker.url() );
	const externalAttempts = uniqueExternalRequests( requestUrls );
	if ( ! workers.includes( config.serviceWorkerUrl ) ) {
		throw new Error(
			`Local Playground service worker was absent before idle: ${ JSON.stringify(
				workers
			) }`
		);
	}
	return {
		designCanvas,
		designNavigation,
		serviceWorkers: workers,
		requestCount: requestUrls.length,
		externalAttempts,
		externalRequestFailures,
		externalSuccessfulResponses,
	};
}

async function triggerPhase( config ) {
	const { context, page } = await connectToRawChrome( config.endpoint );
	reportPhaseProgress( 'cdp-reconnected' );
	const workersBeforeTrigger = context
		.serviceWorkers()
		.map( ( worker ) => worker.url() );
	if ( workersBeforeTrigger.includes( config.serviceWorkerUrl ) ) {
		throw new Error(
			'Local Playground service worker did not naturally retire while every Playwright/CDP process was disconnected.'
		);
	}
	const requestUrls = [];
	const externalRequestFailures = [];
	const externalSuccessfulResponses = [];
	const exceptions = [];
	const emptyResponses = [];
	page.on( 'request', ( request ) => requestUrls.push( request.url() ) );
	page.on( 'requestfailed', ( request ) => {
		if ( isExternalNetworkUrl( request.url() ) ) {
			externalRequestFailures.push( {
				url: request.url(),
				error: request.failure()?.errorText || null,
			} );
		}
	} );
	page.on( 'pageerror', ( error ) => {
		exceptions.push( {
			name: error.name,
			message: error.message,
			text: `${ error.name }: ${ error.message }`,
			stack: error.stack || null,
		} );
	} );
	page.on( 'response', async ( response ) => {
		if (
			isExternalNetworkUrl( response.url() ) &&
			response.status() < 400
		) {
			externalSuccessfulResponses.push( {
				url: response.url(),
				status: response.status(),
			} );
		}
		let responseUrl;
		try {
			responseUrl = new URL( response.url() );
		} catch {
			return;
		}
		if ( ! responseUrl.pathname.endsWith( '/wp-includes/empty.html' ) ) {
			return;
		}
		const headers = await response.allHeaders().catch( () => ( {} ) );
		emptyResponses.push( {
			url: response.url(),
			status: response.status(),
			fromServiceWorker: response.fromServiceWorker(),
			documentIsolationPolicy:
				headers[ 'document-isolation-policy' ] || null,
		} );
	} );
	const wordpressFrame = await waitForWordPressFrame( page, 30_000 );
	const wordpressSession = await context.newCDPSession( wordpressFrame );
	await Promise.all( [
		wordpressSession.send( 'Runtime.enable' ),
		wordpressSession.send( 'Network.enable' ),
	] );
	wordpressSession.on( 'Runtime.exceptionThrown', ( event ) => {
		const detail = event.exceptionDetails;
		const description = detail.exception?.description || detail.text || '';
		exceptions.push( {
			name: detail.exception?.className || 'Error',
			message: description.split( '\n', 1 )[ 0 ].replace( /^\w+: /, '' ),
			text: description.split( '\n', 1 )[ 0 ],
			stack: description,
			source: 'cdp-runtime',
		} );
	} );
	wordpressSession.on( 'Network.responseReceived', ( event ) => {
		let responseUrl;
		try {
			responseUrl = new URL( event.response.url );
		} catch {
			return;
		}
		if ( ! responseUrl.pathname.endsWith( '/wp-includes/empty.html' ) ) {
			return;
		}
		emptyResponses.push( {
			url: event.response.url,
			status: event.response.status,
			fromServiceWorker: event.response.fromServiceWorker,
			documentIsolationPolicy: headerValue(
				event.response.headers,
				'document-isolation-policy'
			),
			source: 'cdp-network',
		} );
	} );
	const canvasBeforeIdentity = await canvasState( wordpressFrame );
	const bufferedErrorsBeforeIdentity = await wordpressFrame.evaluate(
		() => window.__issue80262ErrorRecords || []
	);
	reportPhaseProgress( 'before-identity', {
		canvas: canvasBeforeIdentity,
		bufferedErrors: bufferedErrorsBeforeIdentity,
	} );
	const route = 'Identity';
	const target = wordpressFrame.getByRole( 'button', {
		name: 'Identity',
		exact: true,
	} );
	await target.waitFor( { state: 'visible', timeout: 30_000 } );
	await target.click();
	reportPhaseProgress( 'clicked-identity' );
	await page.waitForTimeout( 5_000 );
	const identityHeadingVisible = await wordpressFrame
		.getByRole( 'heading', { name: 'Identity', exact: true } )
		.isVisible()
		.catch( () => false );
	const finalCanvas = await canvasState( wordpressFrame );
	const bufferedErrors = await wordpressFrame.evaluate(
		() => window.__issue80262ErrorRecords || []
	);
	for ( const record of bufferedErrors ) {
		exceptions.push( { ...record, source: 'passive-page-buffer' } );
	}
	const externalAttempts = uniqueExternalRequests( requestUrls );
	const matchingException = exceptions.find(
		( exception ) => exception.text === EXPECTED_EXCEPTION
	);
	const missingDipResponse = emptyResponses.find(
		( response ) =>
			response.status === 200 &&
			response.fromServiceWorker &&
			! response.documentIsolationPolicy
	);
	const persistentNullDocument = Boolean(
		finalCanvas.exists &&
			finalCanvas.connected &&
			! finalCanvas.hasDocument &&
			! finalCanvas.bodyText
	);
	const blankBeforeIdentity = Boolean(
		! canvasBeforeIdentity.exists ||
			( canvasBeforeIdentity.connected &&
				! canvasBeforeIdentity.hasDocument )
	);
	const persistentBlankAfterIdentity = Boolean(
		! finalCanvas.exists ||
			( finalCanvas.connected && ! finalCanvas.hasDocument )
	);
	if ( persistentBlankAfterIdentity && config.screenshotPath ) {
		await page.screenshot( {
			path: config.screenshotPath,
			fullPage: true,
		} );
	}
	return {
		workersBeforeTrigger,
		route,
		identityClicked: true,
		identityHeadingVisible,
		exceptions,
		bufferedErrorsBeforeIdentity,
		bufferedErrors,
		emptyResponses,
		matchingException: matchingException || null,
		missingDipResponse: missingDipResponse || null,
		persistentNullDocument,
		blankBeforeIdentity,
		persistentBlankAfterIdentity,
		canvasBeforeIdentity,
		finalCanvas,
		externalAttempts,
		externalRequestFailures,
		externalSuccessfulResponses,
	};
}

async function runPhaseChild() {
	const phase = process.argv[ 3 ];
	const encoded = process.env.ISSUE_80262_PHASE_CONFIG;
	if ( ! encoded ) {
		throw new Error( 'Missing child phase configuration.' );
	}
	const config = JSON.parse(
		Buffer.from( encoded, 'base64url' ).toString( 'utf8' )
	);
	const result =
		phase === 'setup'
			? await setupPhase( config )
			: await triggerPhase( config );
	if ( process.send ) {
		await new Promise( ( resolve, reject ) => {
			process.send( { type: 'phase-result', result }, ( error ) =>
				error ? reject( error ) : resolve()
			);
		} );
	}
	// Do not call browser.close(): terminating this short-lived process is the
	// deliberate, complete disconnect while raw Chrome continues running.
	process.disconnect?.();
	process.exit( 0 );
}

async function runLocalPlaygroundRepro() {
	const idleMs = parsePositiveInteger( 'IDLE_MS', '45000', {
		allowZero: true,
	} );
	const runTimeoutMs = parsePositiveInteger( 'RUN_TIMEOUT_MS', '360000' );
	const artifactDir = makeArtifactDirectory();
	const profileDir = fs.mkdtempSync(
		path.join( os.tmpdir(), PROFILE_PREFIX )
	);
	let staticServer;
	let chromeProcess;
	let watchdog;
	let result;
	let emergencyCleanup;
	const startedAt = Date.now();
	try {
		emergencyCleanup = installEmergencyCleanup( {
			getChromeProcess: () => chromeProcess,
			profileDir,
			artifactDir,
			keepArtifacts: process.env.KEEP_ARTIFACTS === '1',
		} );
		let playgroundUrl;
		let origin;
		if ( process.env.LOCAL_PLAYGROUND_URL ) {
			playgroundUrl = assertLoopbackPlaygroundUrl(
				process.env.LOCAL_PLAYGROUND_URL
			);
			origin = new URL( playgroundUrl ).origin;
		} else {
			if (
				! process.env.LOCAL_PLAYGROUND_DIST ||
				! process.env.LOCAL_GUTENBERG_ZIP
			) {
				throw new Error(
					'Set LOCAL_PLAYGROUND_DIST and LOCAL_GUTENBERG_ZIP (or a preconfigured loopback LOCAL_PLAYGROUND_URL).'
				);
			}
			const distribution = validateDistribution(
				process.env.LOCAL_PLAYGROUND_DIST
			);
			const gutenbergZip = validateFile(
				process.env.LOCAL_GUTENBERG_ZIP,
				'LOCAL_GUTENBERG_ZIP'
			);
			staticServer = await startStaticPlaygroundServer(
				distribution,
				gutenbergZip
			);
			playgroundUrl = staticServer.url;
			origin = staticServer.origin;
		}
		const { chromium } = require( '@playwright/test' );
		const chromePath = process.env.CHROME_PATH || chromium.executablePath();
		const chromeStderr = [];
		chromeProcess = spawn(
			chromePath,
			[
				'--headless=new',
				'--remote-debugging-port=0',
				`--user-data-dir=${ profileDir }`,
				'--disable-background-networking',
				'--disable-component-update',
				'--disable-default-apps',
				'--disable-domain-reliability',
				'--disable-features=OptimizationHints,MediaRouter',
				'--disable-quic',
				'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
				'--metrics-recording-only',
				'--no-default-browser-check',
				'--no-first-run',
				'--password-store=basic',
				'--use-mock-keychain',
				'about:blank',
			],
			{
				detached: process.platform !== 'win32',
				stdio: [ 'ignore', 'ignore', 'pipe' ],
			}
		);
		chromeProcess.stderr.on( 'data', ( chunk ) => {
			chromeStderr.push( String( chunk ) );
			if ( chromeStderr.length > 100 ) {
				chromeStderr.shift();
			}
		} );
		watchdog = setTimeout( () => {
			signalProcessTree( chromeProcess, 'SIGTERM' );
		}, runTimeoutMs );
		const port = await waitForDevToolsPort( chromeProcess, profileDir );
		const config = {
			endpoint: `http://127.0.0.1:${ port }`,
			playgroundUrl,
			serviceWorkerUrl: `${ origin }/sw.js`,
			screenshotPath: path.join( artifactDir, 'blank.png' ),
		};
		const setup = await runPhase( 'setup', config, 240_000 );
		await sleep( idleMs );
		const trigger = await runPhase( 'trigger', config, 90_000 );
		const blockedExternalAttempts = [
			...new Set( [
				...setup.externalAttempts,
				...trigger.externalAttempts,
			] ),
		];
		const unexpectedBlockedExternalAttempts =
			blockedExternalAttempts.filter(
				( attempt ) => ! isKnownOptionalBlockedAttempt( attempt )
			);
		const externalSuccessfulResponses = [
			...setup.externalSuccessfulResponses,
			...trigger.externalSuccessfulResponses,
		];
		const checks = {
			rootDesignCanvasHealthyBeforeIdle: Boolean(
				setup.designCanvas.exists &&
					setup.designCanvas.hasDocument &&
					setup.designCanvas.bodyChildren > 0
			),
			serviceWorkerPresentBeforeIdle: setup.serviceWorkers.includes(
				config.serviceWorkerUrl
			),
			serviceWorkerAbsentAfterIdle:
				! trigger.workersBeforeTrigger.includes(
					config.serviceWorkerUrl
				),
			exactException: Boolean( trigger.matchingException ),
			missingDipEmptyHtml: Boolean( trigger.missingDipResponse ),
			persistentNullDocumentAtFiveSeconds: trigger.persistentNullDocument,
			failureObservedDuringDisconnectedIdle: trigger.blankBeforeIdentity,
			blankFiveSecondsAfterIdentity: trigger.persistentBlankAfterIdentity,
			identityRouteUsed: trigger.route === 'Identity',
			identityHeadingVisible: trigger.identityHeadingVisible,
			loopbackOnlyRuntime:
				externalSuccessfulResponses.length === 0 &&
				unexpectedBlockedExternalAttempts.length === 0,
		};
		const reproduced = [
			checks.rootDesignCanvasHealthyBeforeIdle,
			checks.serviceWorkerPresentBeforeIdle,
			checks.serviceWorkerAbsentAfterIdle,
			checks.blankFiveSecondsAfterIdentity,
			checks.identityRouteUsed,
			checks.identityHeadingVisible,
			checks.loopbackOnlyRuntime,
		].every( Boolean );
		const healthyCanvas = Boolean(
			trigger.finalCanvas.exists &&
				trigger.finalCanvas.hasDocument &&
				trigger.finalCanvas.bodyChildren > 0
		);
		const inconclusive = ! reproduced && ! healthyCanvas;
		result = {
			reproduced,
			inconclusive,
			exitCode: reproduced ? 1 : inconclusive ? 2 : 0,
			playgroundUrl,
			idleMs,
			elapsedMs: Date.now() - startedAt,
			checks,
			setup,
			trigger,
			blockedExternalAttempts,
			unexpectedBlockedExternalAttempts,
			externalSuccessfulResponses,
			staticRequestCount: staticServer?.requests.length ?? null,
			artifactDir,
		};
		fs.writeFileSync(
			path.join( artifactDir, 'result.json' ),
			`${ JSON.stringify( result, null, 2 ) }\n`
		);
		return result;
	} catch ( error ) {
		result = {
			reproduced: false,
			inconclusive: true,
			exitCode: 2,
			error: error.stack || error.message,
			artifactDir,
		};
		fs.writeFileSync(
			path.join( artifactDir, 'result.json' ),
			`${ JSON.stringify( result, null, 2 ) }\n`
		);
		return result;
	} finally {
		clearTimeout( watchdog );
		for ( const child of [ ...activePhaseChildren ] ) {
			await stopChild( child );
		}
		if ( chromeProcess ) {
			signalProcessTree( chromeProcess, 'SIGTERM' );
			await sleep( 500 );
			signalProcessTree( chromeProcess, 'SIGKILL' );
		}
		await closeServer( staticServer?.server );
		removeOwnedDirectory( profileDir, PROFILE_PREFIX );
		if ( process.env.KEEP_ARTIFACTS !== '1' ) {
			removeOwnedDirectory( artifactDir, ARTIFACT_PREFIX );
			if ( result ) {
				result.artifactDir = null;
				result.artifactsCleaned = true;
			}
		}
		emergencyCleanup?.remove();
	}
}

module.exports = { runLocalPlaygroundRepro };

if ( process.argv[ 2 ] === '--phase-child' ) {
	runPhaseChild().catch( ( error ) => {
		// eslint-disable-next-line no-console
		console.error( error.stack || error.message );
		process.exitCode = 2;
	} );
} else if ( require.main === module ) {
	runLocalPlaygroundRepro()
		.then( ( reproResult ) => {
			// eslint-disable-next-line no-console
			console.log( JSON.stringify( reproResult, null, 2 ) );
			process.exitCode = reproResult.exitCode;
		} )
		.catch( ( error ) => {
			// eslint-disable-next-line no-console
			console.error( error.stack || error.message );
			process.exitCode = 2;
		} );
}
