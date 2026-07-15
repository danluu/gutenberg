#!/usr/bin/env node

/**
 * Natural hosted-Playground reproduction for Gutenberg issue #80262.
 *
 * This intentionally launches Chrome as a separate process. Leaving a normal
 * Playwright/Puppeteer connection open keeps Playground's service worker alive,
 * hiding the lifecycle bug. No worker, DOM, or network state is modified here.
 *
 * A reproduction exits 1 so this is a failing trunk repro. No reproduction
 * exits 0. A setup/precondition failure exits 2.
 *
 * Optional environment variables:
 *   CHROME_PATH     Chrome executable (defaults to Playwright's bundled build)
 *   ARTIFACT_DIR    Output directory (defaults to a fresh temporary directory)
 *   PLAYGROUND_URL  Hosted Playground URL
 *   IDLE_MS         Fully disconnected idle duration (defaults to 45000)
 *   RUN_TIMEOUT_MS  Overall watchdog duration (defaults to 360000)
 */

const fs = require( 'node:fs' );
const os = require( 'node:os' );
const path = require( 'node:path' );
const { spawn } = require( 'node:child_process' );
// This standalone helper is not matched by the repository's spec-file glob,
// but puppeteer-core is a root development dependency used only by this E2E.
// eslint-disable-next-line import/no-extraneous-dependencies
const puppeteer = require( 'puppeteer-core' );
const { chromium } = require( '@playwright/test' );

const PROFILE_PREFIX = 'gutenberg-issue-80262-profile-';
const REPORTER_ASSET_VERSION = 'ae8f14e90632f9e1151b';
const EXPECTED_EXCEPTION_MESSAGE =
	"TypeError: Cannot destructure property 'documentElement' of 'N' as it is null.";
let activeRun;

const sleep = ( milliseconds ) =>
	new Promise( ( resolve ) => setTimeout( resolve, milliseconds ) );

function throwIfWatchdogExpired() {
	if ( activeRun?.watchdogError ) {
		throw activeRun.watchdogError;
	}
}

function createRunState() {
	if ( activeRun ) {
		throw new Error( 'A reproduction is already running.' );
	}
	const playgroundUrl =
		process.env.PLAYGROUND_URL ||
		'https://playground.wordpress.net/?wp=trunk&gutenberg-branch=trunk';
	const idleMs = Number.parseInt( process.env.IDLE_MS || '45000', 10 );
	const runTimeoutMs = Number.parseInt(
		process.env.RUN_TIMEOUT_MS || '360000',
		10
	);
	if ( ! Number.isFinite( idleMs ) || idleMs < 0 ) {
		throw new Error( `Invalid IDLE_MS: ${ process.env.IDLE_MS }` );
	}
	if ( ! Number.isFinite( runTimeoutMs ) || runTimeoutMs <= 0 ) {
		throw new Error(
			`Invalid RUN_TIMEOUT_MS: ${ process.env.RUN_TIMEOUT_MS }`
		);
	}
	const serviceWorkerUrl = `${ new URL( playgroundUrl ).origin }/sw.js`;
	const chromePath = process.env.CHROME_PATH || chromium.executablePath();
	const artifactDir = process.env.ARTIFACT_DIR
		? path.resolve( process.env.ARTIFACT_DIR )
		: fs.mkdtempSync(
				path.join( os.tmpdir(), 'gutenberg-issue-80262-artifacts-' )
		  );
	const logPath = path.join( artifactDir, 'repro.log' );
	const resultPath = path.join( artifactDir, 'result.json' );
	const screenshotPath = path.join(
		artifactDir,
		'blank-after-five-seconds.png'
	);
	// Validate writable artifact output before allocating the large profile.
	fs.mkdirSync( artifactDir, { recursive: true } );
	fs.writeFileSync( logPath, '' );
	const profileDir = fs.mkdtempSync(
		path.join( os.tmpdir(), PROFILE_PREFIX )
	);
	const runState = {
		startedAt: Date.now(),
		playgroundUrl,
		serviceWorkerUrl,
		chromePath,
		idleMs,
		runTimeoutMs,
		profileDir,
		artifactDir,
		logPath,
		resultPath,
		screenshotPath,
	};
	activeRun = runState;
	return runState;
}

function log( kind, detail = {} ) {
	const line = JSON.stringify( {
		t: Date.now() - activeRun.startedAt,
		kind,
		...detail,
	} );
	// eslint-disable-next-line no-console
	console.log( line );
	fs.appendFileSync( activeRun.logPath, `${ line }\n` );
}

function selectHeader( headers, wantedName ) {
	const entry = Object.entries( headers || {} ).find(
		( [ name ] ) => name.toLowerCase() === wantedName
	);
	return entry?.[ 1 ] ?? null;
}

function extractBlockEditorAssetVersion( url ) {
	return (
		url?.match(
			/block-editor\/index\.min\.js\?ver=([a-f0-9]+)(?:$|[&#])/
		)?.[ 1 ] || null
	);
}

function targetSummary( targetInfo ) {
	return {
		type: targetInfo.type,
		targetId: targetInfo.targetId,
		url: targetInfo.url.slice( 0, 500 ),
		attached: targetInfo.attached,
		parentFrameId: targetInfo.parentFrameId || null,
	};
}

function isPlaygroundServiceWorker( targetInfo, expectedUrl ) {
	return (
		targetInfo.type === 'service_worker' && targetInfo.url === expectedUrl
	);
}

async function waitForDevToolsPort(
	chromeProcess,
	getLaunchError,
	timeout = 30_000
) {
	const activePortPath = path.join(
		activeRun.profileDir,
		'DevToolsActivePort'
	);
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		const launchError = getLaunchError();
		if ( launchError ) {
			throw launchError;
		}
		if ( chromeProcess.exitCode !== null ) {
			throw new Error(
				`Chrome exited with ${ chromeProcess.exitCode }.`
			);
		}
		try {
			const [ port ] = fs
				.readFileSync( activePortPath, 'utf8' )
				.trim()
				.split( /\r?\n/ );
			if ( port ) {
				return port;
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

async function connectBrowser( endpoint ) {
	return puppeteer.connect( {
		browserURL: endpoint,
		protocolTimeout: 30_000,
		// Chrome 149 requires its internal tab target during CDP discovery.
		// Observe that bookkeeping target, pages, and scoped WordPress iframes,
		// but never attach to the service worker whose retirement is under test.
		targetFilter: ( target ) =>
			[ 'page', 'tab' ].includes( target.type() ) ||
			target.url().includes( '/scope:' ),
	} );
}

async function rawTargets( browser ) {
	const session = await browser.target().createCDPSession();
	try {
		const { targetInfos } = await session.send( 'Target.getTargets' );
		return targetInfos;
	} finally {
		await session.detach();
	}
}

async function findWordPressFrame( browser, timeout = 300_000 ) {
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		for ( const page of await browser.pages() ) {
			const frame = page
				.frames()
				.find(
					( candidate ) =>
						candidate.name() === 'wp' &&
						candidate.url().includes( '/scope:' )
				);
			if ( frame ) {
				return { page, frame };
			}
		}
		await sleep( 100 );
	}
	throw new Error( 'Timed out waiting for the WordPress frame.' );
}

async function waitForSiteEditorTarget( browser, timeout = 180_000 ) {
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		const target = browser
			.targets()
			.find( ( candidate ) =>
				candidate.url().includes( '/wp-admin/site-editor.php' )
			);
		if ( target ) {
			return target;
		}
		await sleep( 100 );
	}
	throw new Error( 'Timed out waiting for the Site Editor target.' );
}

async function evaluate( session, expression ) {
	const result = await session.send( 'Runtime.evaluate', {
		expression,
		returnByValue: true,
		awaitPromise: true,
		userGesture: false,
	} );
	if ( result.exceptionDetails ) {
		throw new Error(
			result.exceptionDetails.exception?.description ||
				result.exceptionDetails.text
		);
	}
	return result.result.value;
}

async function waitForValue( session, expression, timeout = 60_000 ) {
	const deadline = Date.now() + timeout;
	let lastValue;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		try {
			lastValue = await evaluate( session, expression );
			if ( lastValue ) {
				return lastValue;
			}
		} catch ( error ) {
			lastValue = error.message;
		}
		await sleep( 100 );
	}
	throw new Error(
		`Timed out waiting for page state; last=${ JSON.stringify(
			lastValue
		) }`
	);
}

function buttonCenterExpression( name, requireText = false ) {
	return `(() => {
		const wanted = ${ JSON.stringify( name ) };
		const requireText = ${ JSON.stringify( requireText ) };
		const visible = ( node ) => {
			const rect = node.getBoundingClientRect();
			const style = getComputedStyle( node );
			return node.isConnected && rect.width > 0 && rect.height > 0 &&
				style.visibility !== 'hidden' && style.display !== 'none';
		};
		const candidates = [ ...document.querySelectorAll( 'button, a, [role="button"]' ) ];
		const node = candidates.find( ( candidate ) => {
			const text = ( candidate.innerText || candidate.textContent || '' ).trim();
			const label = ( candidate.getAttribute( 'aria-label' ) || text || candidate.title || '' ).trim();
			return visible( candidate ) && label === wanted && ( ! requireText || text === wanted );
		} );
		if ( ! node || node.disabled ) return null;
		const rect = node.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	})()`;
}

async function waitForFirstControl( session, controls, timeout = 30_000 ) {
	const deadline = Date.now() + timeout;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		for ( const control of controls ) {
			const center = await evaluate(
				session,
				buttonCenterExpression( control.name, control.requireText )
			);
			if ( center ) {
				return { ...control, center };
			}
		}
		await sleep( 100 );
	}
	return null;
}

async function trustedClickAt( session, name, center ) {
	await session.send( 'Input.dispatchMouseEvent', {
		type: 'mouseMoved',
		x: center.x,
		y: center.y,
	} );
	await session.send( 'Input.dispatchMouseEvent', {
		type: 'mousePressed',
		x: center.x,
		y: center.y,
		button: 'left',
		clickCount: 1,
	} );
	await session.send( 'Input.dispatchMouseEvent', {
		type: 'mouseReleased',
		x: center.x,
		y: center.y,
		button: 'left',
		clickCount: 1,
	} );
	log( 'trusted-click', { name, center } );
}

async function trustedClick(
	session,
	name,
	{ requireText = false, optional = false, timeout = 30_000 } = {}
) {
	const deadline = Date.now() + timeout;
	let center;
	while ( Date.now() < deadline ) {
		throwIfWatchdogExpired();
		center = await evaluate(
			session,
			buttonCenterExpression( name, requireText )
		);
		if ( center ) {
			break;
		}
		await sleep( 100 );
	}
	if ( ! center ) {
		if ( optional ) {
			return false;
		}
		throw new Error( `Timed out waiting for the ${ name } control.` );
	}
	await trustedClickAt( session, name, center );
	return true;
}

async function canvasState( session ) {
	return evaluate(
		session,
		`(() => {
			const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
			if ( ! frame ) return { exists: false };
			let documentValue = null;
			let accessError = null;
			try { documentValue = frame.contentDocument; }
			catch ( error ) { accessError = error.message; }
			return {
				exists: true,
				connected: frame.isConnected,
				srcLength: ( frame.getAttribute( 'src' ) || '' ).length,
				hasDocument: !! documentValue,
				accessError,
				documentURLPrefix: documentValue?.URL?.slice( 0, 180 ) || null,
				documentURLLength: documentValue?.URL?.length ?? null,
				readyState: documentValue?.readyState || null,
				bodyChildren: documentValue?.body?.childElementCount ?? null,
				bodyText: documentValue?.body?.innerText?.slice( 0, 500 ) || null,
			};
		})()`
	);
}

function attachObservation( session, records ) {
	session.on( 'Runtime.exceptionThrown', ( { exceptionDetails: detail } ) => {
		const item = {
			kind: 'exception',
			text: detail.text || null,
			description: detail.exception?.description || null,
			url: detail.url || null,
			lineNumber: detail.lineNumber + 1,
			columnNumber: detail.columnNumber + 1,
			stackFrames: ( detail.stackTrace?.callFrames || [] ).map(
				( frame ) => ( {
					functionName: frame.functionName,
					url: frame.url,
					lineNumber: frame.lineNumber + 1,
					columnNumber: frame.columnNumber + 1,
				} )
			),
		};
		records.push( item );
		log( 'exception', item );
	} );
	session.on( 'Network.responseReceived', ( event ) => {
		if ( ! event.response.url.includes( '/wp-includes/empty.html' ) ) {
			return;
		}
		const item = {
			kind: 'empty-html-response',
			status: event.response.status,
			fromServiceWorker: event.response.fromServiceWorker,
			documentIsolationPolicy: selectHeader(
				event.response.headers,
				'document-isolation-policy'
			),
		};
		records.push( item );
		log( 'empty-html-response', item );
	} );
}

function signalChromeTree( chromeProcess, signal ) {
	if ( ! chromeProcess?.pid ) {
		return;
	}
	try {
		if ( process.platform === 'win32' ) {
			chromeProcess.kill( signal );
		} else {
			// Chrome is launched as its own process group, so this cannot signal
			// the runner or any unrelated browser process.
			process.kill( -chromeProcess.pid, signal );
		}
	} catch ( error ) {
		if ( error.code !== 'ESRCH' ) {
			throw error;
		}
	}
}

function removeOwnedProfile( profileDir ) {
	const resolvedProfile = path.resolve( profileDir );
	if (
		path.dirname( resolvedProfile ) !== path.resolve( os.tmpdir() ) ||
		! path.basename( resolvedProfile ).startsWith( PROFILE_PREFIX )
	) {
		throw new Error( `Refusing to remove unowned path: ${ profileDir }` );
	}
	fs.rmSync( resolvedProfile, {
		recursive: true,
		force: true,
		maxRetries: 20,
		retryDelay: 100,
	} );
}

function installSignalCleanup( runState, getChromeProcess ) {
	const handlers = new Map();
	for ( const signal of [ 'SIGINT', 'SIGTERM' ] ) {
		const handler = () => {
			try {
				signalChromeTree( getChromeProcess(), 'SIGKILL' );
				removeOwnedProfile( runState.profileDir );
			} finally {
				for ( const [
					installedSignal,
					installedHandler,
				] of handlers ) {
					process.removeListener( installedSignal, installedHandler );
				}
				// Preserve normal shell/test-runner signal semantics after cleanup.
				process.kill( process.pid, signal );
			}
		};
		handlers.set( signal, handler );
		process.on( signal, handler );
	}
	return () => {
		for ( const [ signal, handler ] of handlers ) {
			process.removeListener( signal, handler );
		}
	};
}

async function waitForProcessExit( chromeProcess, timeout ) {
	if (
		chromeProcess.exitCode !== null ||
		chromeProcess.signalCode !== null
	) {
		return;
	}
	await Promise.race( [
		new Promise( ( resolve ) => chromeProcess.once( 'exit', resolve ) ),
		sleep( timeout ),
	] );
}

async function closeChrome( browser, chromeProcess ) {
	if ( browser?.connected ) {
		await browser.close().catch( () => {} );
	}
	if ( ! chromeProcess ) {
		return;
	}
	// Always signal the owned process group, even if its leader already exited,
	// because a helper process could otherwise retain and rewrite the profile.
	signalChromeTree( chromeProcess, 'SIGTERM' );
	await waitForProcessExit( chromeProcess, 5_000 );
	signalChromeTree( chromeProcess, 'SIGKILL' );
	await waitForProcessExit( chromeProcess, 2_000 );
	await sleep( 250 );
}

async function runRepro() {
	const runState = createRunState();
	let chromeProcess;
	let chromeLaunchError;
	let chromeStderr = '';
	let browser;
	let siteEditorSession;
	runState.removeSignalHandlers = installSignalCleanup(
		runState,
		() => chromeProcess
	);
	runState.watchdog = setTimeout( () => {
		runState.watchdogError = new Error(
			`Reproduction exceeded ${ runState.runTimeoutMs }ms watchdog.`
		);
		log( 'watchdog-timeout', { timeoutMs: runState.runTimeoutMs } );
		signalChromeTree( chromeProcess, 'SIGTERM' );
	}, runState.runTimeoutMs );
	try {
		chromeProcess = spawn(
			runState.chromePath,
			[
				'--headless=new',
				'--remote-debugging-port=0',
				`--user-data-dir=${ runState.profileDir }`,
				'--no-first-run',
				'--no-default-browser-check',
				'--password-store=basic',
				'--use-mock-keychain',
				'about:blank',
			],
			{
				stdio: [ 'ignore', 'ignore', 'pipe' ],
				detached: process.platform !== 'win32',
			}
		);
		chromeProcess.once( 'error', ( error ) => {
			chromeLaunchError = error;
			chromeStderr = `${ chromeStderr }${ error.stack || error.message }`;
		} );
		chromeProcess.stderr?.on( 'data', ( chunk ) => {
			chromeStderr = `${ chromeStderr }${ chunk }`.slice( -20_000 );
		} );
		const port = await waitForDevToolsPort(
			chromeProcess,
			() => chromeLaunchError
		);
		const endpoint = `http://127.0.0.1:${ port }`;
		browser = await connectBrowser( endpoint );
		const version = await browser.version();
		log( 'started', {
			version,
			chromePath: runState.chromePath,
			playgroundUrl: runState.playgroundUrl,
			serviceWorkerUrl: runState.serviceWorkerUrl,
			idleMs: runState.idleMs,
			runTimeoutMs: runState.runTimeoutMs,
			artifactDir: runState.artifactDir,
		} );

		const pages = await browser.pages();
		const outerPage = pages[ 0 ] || ( await browser.newPage() );
		await outerPage.setViewport( { width: 1440, height: 1000 } );
		await outerPage.goto( runState.playgroundUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 180_000,
		} );
		log( 'setup-stage', { stage: 'outer-dom-ready' } );
		const { frame: wordpressFrame } = await findWordPressFrame( browser );
		log( 'setup-stage', {
			stage: 'wordpress-frame-found',
			url: wordpressFrame.url(),
		} );
		await wordpressFrame.waitForSelector( '#wpadminbar', {
			timeout: 90_000,
		} );
		log( 'setup-stage', { stage: 'admin-bar-ready' } );
		const siteEditorLink = await wordpressFrame.waitForSelector(
			'#wp-admin-bar-site-editor a',
			{ timeout: 30_000 }
		);
		try {
			const box = await siteEditorLink.boundingBox();
			if ( ! box ) {
				throw new Error( 'Site Editor link is not visibly clickable.' );
			}
			const center = {
				x: box.x + box.width / 2,
				y: box.y + box.height / 2,
			};
			await outerPage.mouse.move( center.x, center.y );
			await outerPage.mouse.down( { button: 'left' } );
			await outerPage.mouse.up( { button: 'left' } );
			log( 'trusted-click', {
				name: 'Site Editor admin-bar link',
				center,
			} );
		} finally {
			await siteEditorLink.dispose();
		}

		let siteEditorTarget = await waitForSiteEditorTarget( browser );
		log( 'setup-stage', { stage: 'site-editor-target-ready' } );
		siteEditorSession = await siteEditorTarget.createCDPSession();
		await Promise.all( [
			siteEditorSession.send( 'Runtime.enable' ),
			siteEditorSession.send( 'Log.enable' ),
		] );
		const entryControl = await waitForFirstControl(
			siteEditorSession,
			[
				{ name: 'Get started', requireText: true },
				{ name: 'Close dialog', requireText: true },
				{ name: 'Open Navigation', requireText: false },
			],
			180_000
		);
		if ( ! entryControl ) {
			throw new Error(
				'Timed out waiting for onboarding or the Editor top bar.'
			);
		}
		if ( entryControl.name === 'Close dialog' ) {
			throw new Error(
				'WordPress requested reauthentication before Gutenberg mounted.'
			);
		}
		if ( entryControl.name === 'Get started' ) {
			await trustedClickAt(
				siteEditorSession,
				entryControl.name,
				entryControl.center
			);
			await trustedClick( siteEditorSession, 'No, thanks', {
				requireText: true,
				optional: true,
				timeout: 10_000,
			} );
			log( 'setup-stage', { stage: 'onboarding-dismissed' } );
		}
		await waitForValue(
			siteEditorSession,
			`document.querySelector( 'button[aria-label="Open Navigation"]' ) !== null`,
			180_000
		);
		log( 'setup-stage', { stage: 'editor-top-bar-ready' } );
		await waitForValue(
			siteEditorSession,
			`(() => {
				const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
				return !! frame?.contentDocument?.body?.innerText;
			})()`,
			90_000
		);
		await sleep( 2_000 );

		const targetsBeforeIdle = await rawTargets( browser );
		if (
			! targetsBeforeIdle.some( ( target ) =>
				isPlaygroundServiceWorker( target, runState.serviceWorkerUrl )
			)
		) {
			throw new Error(
				'Playground service worker was absent before idle.'
			);
		}
		log( 'before-idle', {
			canvas: await canvasState( siteEditorSession ),
			targets: targetsBeforeIdle.map( targetSummary ),
		} );

		// This complete disconnect is the essential natural trigger: an attached
		// debugger keeps the service worker alive and prevents its in-memory DIP
		// scope registry from being lost.
		await siteEditorSession.detach();
		siteEditorSession = null;
		browser.disconnect();
		browser = null;
		log( 'automation-disconnected', { idleMs: runState.idleMs } );
		await sleep( runState.idleMs );

		browser = await connectBrowser( endpoint );
		const targetsAfterIdle = await rawTargets( browser );
		if (
			targetsAfterIdle.some( ( target ) =>
				isPlaygroundServiceWorker( target, runState.serviceWorkerUrl )
			)
		) {
			throw new Error(
				'Playground service worker did not naturally retire during idle.'
			);
		}
		log( 'after-idle', {
			targets: targetsAfterIdle.map( targetSummary ),
		} );

		siteEditorTarget = await waitForSiteEditorTarget( browser, 30_000 );
		siteEditorSession = await siteEditorTarget.createCDPSession();
		await Promise.all( [
			siteEditorSession.send( 'Runtime.enable' ),
			siteEditorSession.send( 'Log.enable' ),
			siteEditorSession.send( 'Network.enable' ),
		] );
		const records = [];
		attachObservation( siteEditorSession, records );
		log( 'observer-ready', { targetUrl: siteEditorTarget.url() } );

		await trustedClick( siteEditorSession, 'Open Navigation' );
		const routeDeadline = Date.now() + 60_000;
		let stylesClicked = false;
		let backClicks = 0;
		while ( ! stylesClicked && Date.now() < routeDeadline ) {
			const controls = [ { name: 'Styles', requireText: true } ];
			if ( backClicks < 2 ) {
				controls.push( { name: 'Back', requireText: false } );
			}
			const control = await waitForFirstControl(
				siteEditorSession,
				controls,
				routeDeadline - Date.now()
			);
			if ( ! control ) {
				break;
			}
			await trustedClickAt(
				siteEditorSession,
				control.name,
				control.center
			);
			if ( control.name === 'Styles' ) {
				stylesClicked = true;
			} else {
				backClicks++;
				await sleep( 1_000 );
			}
		}
		if ( ! stylesClicked ) {
			// Open Navigation itself can remount the previews and trigger the bug.
			// Record that separately; the qualifying Open Navigation -> Styles
			// reproduction below still requires the visible Styles click.
			log( 'styles-control-unavailable-after-navigation', {
				backClicks,
			} );
			throw new Error(
				'Could not reach the visible Styles route after Open Navigation.'
			);
		}
		await sleep( 5_000 );

		const finalCanvas = await canvasState( siteEditorSession );
		const emptyResponses = records.filter(
			( record ) => record.kind === 'empty-html-response'
		);
		const matchingException = records.find( ( record ) => {
			const message = record.description?.split( '\n', 1 )[ 0 ];
			return (
				record.kind === 'exception' &&
				!! extractBlockEditorAssetVersion( record.url ) &&
				record.lineNumber === 122 &&
				record.columnNumber === 927 &&
				message === EXPECTED_EXCEPTION_MESSAGE
			);
		} );
		const assetVersion = extractBlockEditorAssetVersion(
			matchingException?.url
		);
		const matchesReporterAssetVersion =
			assetVersion === REPORTER_ASSET_VERSION;
		const missingDip = emptyResponses.some(
			( response ) =>
				response.status === 200 &&
				response.fromServiceWorker &&
				! response.documentIsolationPolicy
		);
		const persistentBlank =
			finalCanvas.exists &&
			finalCanvas.connected &&
			! finalCanvas.hasDocument &&
			! finalCanvas.bodyText;
		const healthyCanvas =
			finalCanvas.exists &&
			finalCanvas.connected &&
			finalCanvas.hasDocument &&
			finalCanvas.readyState === 'complete' &&
			finalCanvas.bodyChildren > 0;
		const reproduced =
			stylesClicked &&
			!! matchingException &&
			missingDip &&
			persistentBlank;
		const inconclusive = ! reproduced && ! healthyCanvas;
		let exitCode;
		let summary;
		if ( reproduced ) {
			exitCode = 1;
			summary = `REPRODUCED issue #80262; artifacts: ${ runState.artifactDir }`;
		} else if ( inconclusive ) {
			exitCode = 2;
			summary = `INCONCLUSIVE final canvas; artifacts: ${ runState.artifactDir }`;
		} else {
			exitCode = 0;
			summary = `NOT REPRODUCED; healthy canvas; artifacts: ${ runState.artifactDir }`;
		}
		const result = {
			reproduced,
			inconclusive,
			assetVersion,
			matchesReporterAssetVersion,
			inconclusiveReason: inconclusive
				? 'Final canvas was neither the exact reproduction nor explicitly healthy.'
				: null,
			artifactDir: runState.artifactDir,
			environment: {
				version,
				chromePath: runState.chromePath,
				playgroundUrl: runState.playgroundUrl,
				serviceWorkerUrl: runState.serviceWorkerUrl,
				idleMs: runState.idleMs,
				runTimeoutMs: runState.runTimeoutMs,
			},
			checks: {
				serviceWorkerPresentBeforeIdle: true,
				serviceWorkerAbsentAfterIdle: true,
				backClicks,
				stylesClicked,
				missingDip,
				persistentBlank,
				healthyCanvas,
			},
			matchingException: matchingException || null,
			emptyResponses,
			finalCanvas,
		};
		fs.writeFileSync(
			runState.resultPath,
			`${ JSON.stringify( result, null, 2 ) }\n`
		);
		const [ screenshotPage ] = await browser.pages();
		if ( screenshotPage && reproduced ) {
			await screenshotPage.screenshot( {
				path: runState.screenshotPath,
				fullPage: true,
			} );
		}
		log( 'result', result );
		// eslint-disable-next-line no-console
		console.log( summary );
		return { ...result, exitCode };
	} catch ( error ) {
		const effectiveError = runState.watchdogError || error;
		const failure = {
			reproduced: false,
			inconclusive: true,
			artifactDir: runState.artifactDir,
			error: effectiveError.stack || effectiveError.message,
			exitCode: 2,
		};
		fs.writeFileSync(
			runState.resultPath,
			`${ JSON.stringify( failure, null, 2 ) }\n`
		);
		log( 'fatal', { error: failure.error, chromeStderr } );
		// eslint-disable-next-line no-console
		console.error( `INCONCLUSIVE: ${ effectiveError.message }` );
		return failure;
	} finally {
		clearTimeout( runState.watchdog );
		try {
			if ( siteEditorSession ) {
				await siteEditorSession.detach().catch( () => {} );
			}
			await closeChrome( browser, chromeProcess );
		} finally {
			try {
				removeOwnedProfile( runState.profileDir );
				log( 'profile-cleaned', {
					profileDir: runState.profileDir,
					removed: ! fs.existsSync( runState.profileDir ),
				} );
			} finally {
				runState.removeSignalHandlers();
				activeRun = null;
			}
		}
	}
}

module.exports = { runRepro };

if ( require.main === module ) {
	runRepro()
		.then( ( result ) => {
			process.exitCode = result.exitCode;
		} )
		.catch( ( error ) => {
			// eslint-disable-next-line no-console
			console.error( `INCONCLUSIVE: ${ error.message }` );
			process.exitCode = 2;
		} );
}
