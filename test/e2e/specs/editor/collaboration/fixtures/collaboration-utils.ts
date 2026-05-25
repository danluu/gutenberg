/**
 * External dependencies
 */
import type { Page, BrowserContext, Route } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	Editor,
	type Admin,
	type RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';

export interface UserCredentials {
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	password: string;
	roles: string[];
}

interface UserSession {
	user: UserCredentials;
	context: BrowserContext;
	page: Page;
	editor: Editor;
}

interface NormalizedBlock {
	attributes: Record< string, unknown >;
	innerBlocks: NormalizedBlock[];
	name: string;
}

interface NormalizedCollaborativeState {
	blocks: NormalizedBlock[];
	crdtDocument: string | null;
	title: string;
}

type BlockTopologyEntry = {
	childCount: number;
	name: string;
	path: string;
};

type CleanupUsersMode = 'all' | 'tracked' | 'none';
type CrdtDocumentComparisonMode = 'exact' | 'presence';
type RichTextComparisonMode = 'exact' | 'dom-equivalent';

type FuzzWebSocketEndpoint = {
	host: string;
	port: string;
	url: string;
};

export const SECOND_USER: UserCredentials = {
	username: 'collaborator',
	email: 'collaborator@example.com',
	firstName: 'Test',
	lastName: 'Collaborator',
	password: 'password',
	roles: [ 'editor' ],
};

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const SYNC_REQUEST_ROUTE = /wp-sync/;
const USE_TEST_WS_PROVIDER = process.env.GUTENBERG_RTC_TEST_WS_PROVIDER === '1';
const TEST_WS_PROVIDER_URL =
	process.env.GUTENBERG_RTC_TEST_WS_URL ||
	`ws://127.0.0.1:${ process.env.GUTENBERG_RTC_TEST_WS_PORT || '18991' }`;
const DEFAULT_CONVERGENCE_STABLE_SAMPLES = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_CONVERGENCE_STABLE_SAMPLES',
	1
);
const DEFAULT_CONVERGENCE_STABLE_INTERVAL_MS = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_CONVERGENCE_STABLE_INTERVAL_MS',
	250
);
const DEFAULT_RICH_TEXT_COMPARISON = getRichTextComparisonModeEnv(
	'GUTENBERG_RTC_BROWSER_RICH_TEXT_COMPARISON',
	'exact'
);
const DEFAULT_COLLABORATION_READY_TIMEOUT_MS = getPositiveIntegerEnv(
	'GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS',
	15000
);
const DEFAULT_EDITOR_BOOT_TIMEOUT_MS = Math.max(
	30000,
	DEFAULT_COLLABORATION_READY_TIMEOUT_MS
);
const FUZZ_ONLY_ASSERTIONS_ENABLED =
	process.env.GUTENBERG_RTC_BROWSER_FUZZ_ONLY_ASSERTIONS === '1' ||
	process.env.GUTENBERG_RTC_BROWSER_FUZZ_ASSERTIONS === '1' ||
	process.env.RTC_FUZZ_ONLY_ASSERTIONS === '1' ||
	process.env.RTC_FUZZ_ASSERTIONS === '1' ||
	!! process.env.RTC_FUZZ_BASE_URL ||
	!! process.env.RTC_FUZZ_RUN_TIMEOUT_MS ||
	!! process.env.RTC_FUZZ_ACTION_PROFILE;
const USE_FUZZ_CONTEXT_REQUEST_LOGIN =
	!! process.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ||
	!! process.env.RTC_FUZZ_BASE_URL ||
	!! process.env.RTC_FUZZ_RUN_TIMEOUT_MS ||
	!! process.env.RTC_FUZZ_ACTION_PROFILE;
const FUZZ_MARKER_PATTERN =
	/\b(?:rtcw|rtcsel|rtc-save-[a-z0-9-]+-marker|common-(?:block|edit)|gauntlet(?:-edit)?|async-server|media-entity)-[a-z0-9-]+/gi;

function getTestWebSocketServerUrl( pathname: string ) {
	try {
		const url = new URL(
			process.env.GUTENBERG_RTC_TEST_WS_URL ||
				`ws://127.0.0.1:${
					process.env.GUTENBERG_RTC_TEST_WS_PORT || '18991'
				}`
		);
		url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
		url.pathname = pathname;
		url.search = '';
		url.hash = '';
		return url.toString();
	} catch {
		return null;
	}
}

async function loginBrowserContext(
	context: BrowserContext,
	user: UserCredentials
) {
	const loginResponse = await context.request.post(
		new URL( '/wp-login.php', BASE_URL ).toString(),
		{
			failOnStatusCode: true,
			form: {
				log: user.username,
				pwd: user.password,
			},
		}
	);
	await loginResponse.dispose();

	const nonceResponse = await context.request.get(
		new URL(
			'/wp-admin/admin-ajax.php?action=rest-nonce',
			BASE_URL
		).toString(),
		{
			failOnStatusCode: true,
		}
	);
	await nonceResponse.dispose();
}

function getDefaultPortForProtocol( protocol: string ) {
	if ( protocol === 'wss:' || protocol === 'https:' ) {
		return '443';
	}
	return '80';
}

function normalizeFuzzWebSocketHost( host: string ) {
	const normalized = host.replaceAll( /^\[|\]$/g, '' ).toLowerCase();
	return [ 'localhost', '127.0.0.1', '::1' ].includes( normalized )
		? 'loopback'
		: normalized;
}

function getFuzzWebSocketEndpoint(
	rawUrl: unknown,
	fallbackPort?: unknown
): FuzzWebSocketEndpoint | null {
	if ( typeof rawUrl !== 'string' || rawUrl.length === 0 ) {
		return null;
	}

	try {
		const url = new URL( rawUrl );
		let numericFallbackPort: number | null = null;
		if ( typeof fallbackPort === 'number' ) {
			numericFallbackPort = fallbackPort;
		} else if ( typeof fallbackPort === 'string' ) {
			numericFallbackPort = Number.parseInt( fallbackPort, 10 );
		}
		const port =
			Number.isInteger( numericFallbackPort ) &&
			( numericFallbackPort as number ) > 0
				? String( numericFallbackPort )
				: url.port || getDefaultPortForProtocol( url.protocol );

		return {
			host: normalizeFuzzWebSocketHost( url.hostname ),
			port,
			url: rawUrl,
		};
	} catch {
		return null;
	}
}

function fuzzWebSocketEndpointsMatch(
	first: FuzzWebSocketEndpoint,
	second: FuzzWebSocketEndpoint
) {
	return first.host === second.host && first.port === second.port;
}

function getPositiveIntegerEnv( name: string, fallback: number ) {
	const rawValue = process.env[ name ];
	if ( ! rawValue ) {
		return fallback;
	}
	const parsedValue = Number.parseInt( rawValue, 10 );
	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive integer.` );
	}
	return parsedValue;
}

function getRichTextComparisonModeEnv(
	name: string,
	fallback: RichTextComparisonMode
): RichTextComparisonMode {
	const rawValue = process.env[ name ];
	if ( ! rawValue ) {
		return fallback;
	}
	if ( rawValue === 'exact' || rawValue === 'dom-equivalent' ) {
		return rawValue;
	}
	throw new Error(
		`Expected ${ name } to be "exact" or "dom-equivalent".`
	);
}

function isSyncRequestRoute( route: Route ) {
	const request = route.request();
	return request.method() === 'POST' && request.url().includes( 'wp-sync' );
}

function isRouteAlreadyHandledError( error: unknown ) {
	return (
		error instanceof Error &&
		error.message.includes( 'Route is already handled' )
	);
}

async function ignoreAlreadyHandledRoute( callback: () => Promise< void > ) {
	try {
		await callback();
	} catch ( error ) {
		if ( ! isRouteAlreadyHandledError( error ) ) {
			throw error;
		}
	}
}

export default class CollaborationUtils {
	private admin: Admin;
	private cleanupUsersMode: CleanupUsersMode;
	private fuzzOnlyAssertions: boolean;
	private editor: Editor;
	private requestUtils: RequestUtils;
	private primaryPage: Page;
	private pendingSyncRouteHandlers = new WeakMap<
		Page,
		( route: Route ) => Promise< void >
	>();
	private sessions: UserSession[] = [];
	private trackedUserIds: number[] = [];

	constructor( {
		admin,
		cleanupUsersMode = 'all',
		fuzzOnlyAssertions = FUZZ_ONLY_ASSERTIONS_ENABLED,
		editor,
		requestUtils,
		page,
	}: {
		admin: Admin;
		cleanupUsersMode?: CleanupUsersMode;
		fuzzOnlyAssertions?: boolean;
		editor: Editor;
		requestUtils: RequestUtils;
		page: Page;
	} ) {
		this.admin = admin;
		this.cleanupUsersMode = cleanupUsersMode;
		this.fuzzOnlyAssertions = fuzzOnlyAssertions;
		this.editor = editor;
		this.requestUtils = requestUtils;
		this.primaryPage = page;
	}

	/**
	 * Navigate the primary user (admin) to a post and wait for
	 * collaboration to be ready.
	 *
	 * @param postId The post ID to open.
	 */
	async openPost( postId: number ) {
		await this.installFuzzOnlyBrowserFlags( this.primaryPage );
		await this.admin.visitAdminPage(
			'post.php',
			`post=${ postId }&action=edit`
		);
		await this.primaryPage.waitForFunction(
			() => window?.wp?.data && window?.wp?.blocks,
			undefined,
			{ timeout: DEFAULT_EDITOR_BOOT_TIMEOUT_MS }
		);
		await this.editor.setPreferences( 'core/edit-post', {
			welcomeGuide: false,
			fullscreenMode: false,
		} );
		await this.waitForCollaborationReady( this.primaryPage );
	}

	/**
	 * Log in an additional user and open the same post in a new
	 * browser context. Returns the new user's page and editor.
	 *
	 * Can be called multiple times to add N users to a session.
	 *
	 * @param postId The post ID to open.
	 * @param user   Credentials for the user to join.
	 * @return The joined user's page and editor.
	 */
	async joinUser(
		postId: number,
		user: UserCredentials
	): Promise< { page: Page; editor: Editor } > {
		const context = await this.admin.browser.newContext( {
			baseURL: BASE_URL,
			storageState: { cookies: [], origins: [] },
		} );
		try {
			if ( USE_FUZZ_CONTEXT_REQUEST_LOGIN ) {
				await loginBrowserContext( context, user );
			}

			const newPage = await context.newPage();
			await this.installFuzzOnlyBrowserFlags( newPage );

			if ( ! USE_FUZZ_CONTEXT_REQUEST_LOGIN ) {
				// Log in via the WordPress login form.
				await newPage.goto( '/wp-login.php' );
				await newPage.locator( '#user_login' ).fill( user.username );
				await newPage.locator( '#user_pass' ).fill( user.password );
				await newPage.getByRole( 'button', { name: 'Log In' } ).click();
				await newPage.waitForURL( '**/wp-admin/**' );
			}

			// Navigate to the post editor.
			await newPage.goto(
				`/wp-admin/post.php?post=${ postId }&action=edit`
			);

			// Dismiss welcome guide.
			await newPage.waitForFunction(
				() => window?.wp?.data && window?.wp?.blocks,
				undefined,
				{ timeout: DEFAULT_EDITOR_BOOT_TIMEOUT_MS }
			);
			await newPage.evaluate( () => {
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'welcomeGuide', false );
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'fullscreenMode', false );
			} );

			const newEditor = new Editor( { page: newPage } );

			await this.waitForCollaborationReady( newPage );

			this.sessions.push( {
				user,
				context,
				page: newPage,
				editor: newEditor,
			} );

			return { page: newPage, editor: newEditor };
		} catch ( error ) {
			await context.close().catch( () => {} );
			throw error;
		}
	}

	/**
	 * Wait for all current participants (primary + joined users) to
	 * discover each other via the awareness protocol, then wait for
	 * sync cycles to complete.
	 *
	 * @param [options]         Optional settings.
	 * @param [options.timeout] Maximum wait time in ms. Defaults to a
	 *                          value that scales with the number of users.
	 */
	async waitForMutualDiscovery( { timeout }: { timeout?: number } = {} ) {
		const pages = this.allPages;
		const resolvedTimeout = timeout ?? 10000 + pages.length * 2500;
		const roomName = await this.getCurrentPostRoomName( this.primaryPage );

		await Promise.all(
			pages.map( ( pg ) =>
				this.waitForAwarenessPeerCount(
					pg,
					pages.length,
					resolvedTimeout,
					roomName
				)
			)
		);

		await Promise.all(
			pages.map( ( pg ) =>
				this.waitForSyncCycle( pg, 3, {
					timeout: resolvedTimeout,
					roomName,
					expectedPeerCount: pages.length,
				} )
			)
		);
	}

	/**
	 * Wait until the sync transport reports the expected number of clients in
	 * the requested room's awareness payload.
	 *
	 * Some repros exercise lower-level sync behavior before the rendered
	 * collaborator presence UI has enough display metadata to show the
	 * "Collaborators list" button. The transport-level awareness count is the
	 * synchronization gate these repros actually need.
	 *
	 * @param page              The Playwright page to wait on.
	 * @param expectedPeerCount Expected number of awareness clients.
	 * @param timeout           Maximum wait time in ms.
	 * @param roomName          Optional room name to require.
	 */
	async waitForAwarenessPeerCount(
		page: Page,
		expectedPeerCount: number,
		timeout: number,
		roomName?: string
	) {
		if ( USE_TEST_WS_PROVIDER ) {
			await this.waitForTestWebSocketAwarenessPeerCount(
				page,
				expectedPeerCount,
				timeout,
				roomName
			);
			return;
		}

		try {
			await page.waitForResponse(
				async ( response ) => {
					if (
						! response.url().includes( 'wp-sync' ) ||
						response.status() !== 200
					) {
						return false;
					}

					const body = await response.json().catch( () => null );
					return (
						body?.rooms?.some(
							( room: {
								room?: string;
								awareness?: Record< string, unknown >;
							} ) =>
								( ! roomName || room.room === roomName ) &&
								room.awareness &&
								Object.keys( room.awareness ).length >=
									expectedPeerCount
						) ?? false
					);
				},
				{ timeout }
			);
		} catch ( error ) {
			const providerDiagnostics =
				await this.drainFuzzHttpPollingProviderDiagnostics( [ page ] );
			if ( providerDiagnostics.length > 0 ) {
				throw new Error(
					`RTC fuzz-only HTTP polling provider diagnostics during awareness wait: ${ JSON.stringify(
						providerDiagnostics
					) }`
				);
			}

			throw error;
		}
	}

	async waitForTestWebSocketAwarenessPeerCount(
		page: Page,
		expectedPeerCount: number,
		timeout: number,
		roomName?: string
	) {
		await page.waitForFunction(
			( { expected, room }: { expected: number; room?: string } ) => {
				const state = ( window as any ).__gutenbergTestWebSocketSync;
				const rooms = state?.rooms ?? {};
				const matchingRoom = room
					? rooms[ room ]
					: Object.values( rooms ).find(
							( candidate: any ) =>
								candidate?.awarenessCount >= expected
					  );

				return (
					matchingRoom?.status === 'connected' &&
					matchingRoom?.awarenessCount >= expected
				);
			},
			{ expected: expectedPeerCount, room: roomName },
			{ timeout }
		);
	}

	/**
	 * Return the collaboration room name for the current post.
	 *
	 * @param page The Playwright page to read from.
	 */
	async getCurrentPostRoomName( page: Page ): Promise< string > {
		const postId = await page.evaluate(
			() =>
				( window as any ).wp?.data
					?.select( 'core/editor' )
					?.getCurrentPostId?.()
		);

		if ( ! postId ) {
			throw new Error( 'Current post ID is unavailable.' );
		}

		return `postType/post:${ postId }`;
	}

	/**
	 * Convenience method: open a two-user collaborative session.
	 *
	 * Equivalent to calling `openPost`, `joinUser` with SECOND_USER,
	 * and `waitForMutualDiscovery` in sequence.
	 *
	 * @param postId The post ID to collaboratively edit.
	 */
	async openCollaborativeSession( postId: number ) {
		await this.openPost( postId );
		await this.joinUser( postId, SECOND_USER );
		await this.waitForMutualDiscovery();
	}

	/**
	 * Wait for the editor to be fully ready: collaboration runtime enabled and
	 * the entity record resolver finished. Optionally skips the collaboration
	 * check (e.g. for the auto-draft test which checks collaboration separately).
	 *
	 * @param page                           The Playwright page to wait on.
	 * @param [options]                      Optional settings.
	 * @param [options.requireCollaboration] Whether to require _wpCollaborationEnabled (default true).
	 * @param [options.timeout]              Maximum wait time in ms (default 10000).
	 */
	async waitForEntityReady(
		page: Page,
		{
			requireCollaboration = true,
			timeout = 10000,
		}: { requireCollaboration?: boolean; timeout?: number } = {}
	) {
		await page.waitForFunction(
			( { requireCollab } ) => {
				const postId = ( window as any ).wp?.data
					?.select( 'core/editor' )
					?.getCurrentPostId();
				if ( ! postId ) {
					return false;
				}
				if (
					requireCollab &&
					( window as any )._wpCollaborationEnabled !== true
				) {
					return false;
				}
				return ( window as any ).wp.data
					.select( 'core' )
					.hasFinishedResolution( 'getEntityRecord', [
						'postType',
						'post',
						postId,
					] );
			},
			{ requireCollab: requireCollaboration },
			{ timeout }
		);
	}

	/**
	 * Wait for entity resolution AND for any triggered reconciliation save to
	 * settle. Use this after a page reload when a reconciliation save may be
	 * initiated synchronously upon entity resolution.
	 *
	 * @param page              The Playwright page to wait on.
	 * @param [options]         Optional settings.
	 * @param [options.timeout] Maximum wait time in ms.
	 */
	async waitForEntityReadyAndSaveSettled(
		page: Page,
		{ timeout = 15000 }: { timeout?: number } = {}
	) {
		await page.waitForFunction(
			() => {
				const postId = ( window as any ).wp?.data
					?.select( 'core/editor' )
					?.getCurrentPostId();
				if ( ! postId ) {
					return false;
				}
				if ( ( window as any )._wpCollaborationEnabled !== true ) {
					return false;
				}
				if (
					! ( window as any ).wp.data
						.select( 'core' )
						.hasFinishedResolution( 'getEntityRecord', [
							'postType',
							'post',
							postId,
						] )
				) {
					return false;
				}
				// Entity is resolved; wait for any triggered reconciliation
				// save to settle before we read store values.
				return ! ( window as any ).wp.data
					.select( 'core/editor' )
					.isSavingPost();
			},
			undefined,
			{ timeout }
		);
	}

	/**
	 * Read the _crdt_document meta value from the currently loaded entity record.
	 *
	 * @param page The Playwright page to evaluate on.
	 */
	async getCrdtDocument( page: Page ): Promise< string | null > {
		return page.evaluate( () => {
			const postId = ( window as any ).wp.data
				.select( 'core/editor' )
				.getCurrentPostId();
			return (
				( window as any ).wp.data
					.select( 'core' )
					.getEntityRecord( 'postType', 'post', postId )?.meta
					?._crdt_document ?? null
			);
		} );
	}

	/**
	 * Capture state useful for classifying collaboration startup stalls.
	 *
	 * @param page The Playwright page to inspect.
	 */
	async getCollaborationReadyDiagnostics( page: Page ) {
		try {
			return await page.evaluate( () => {
				const wp = ( window as any ).wp;
				let currentPostId = null;
				let editorHasResolvedPost = null;
				let syncStoreHasRecords = null;

				try {
					currentPostId =
						wp?.data
							?.select( 'core/editor' )
							?.getCurrentPostId?.() ?? null;
				} catch {}

				try {
					const record =
						currentPostId !== null
							? wp?.data
									?.select( 'core' )
									?.getEntityRecord?.(
										'postType',
										'post',
										currentPostId
									)
							: null;
					editorHasResolvedPost = !! record;
				} catch {}

				try {
					syncStoreHasRecords =
						typeof wp?.data?.select?.( 'core' )
							?.getEntityRecords === 'function';
				} catch {}

				return {
					url: window.location.href,
					readyState: document.readyState,
					collaborationEnabled:
						( window as any )._wpCollaborationEnabled ?? null,
					hasWpData: !! wp?.data,
					hasWpBlocks: !! wp?.blocks,
					currentPostId,
					editorHasResolvedPost,
					syncStoreHasRecords,
				};
			} );
		} catch ( error ) {
			return {
				diagnosticError:
					error instanceof Error ? error.message : String( error ),
			};
		}
	}

	/**
	 * Wait for the collaboration runtime to be ready on a page.
	 * Checks that `window._wpCollaborationEnabled` is true and wp.data is loaded.
	 *
	 * @param page              The Playwright page to wait on.
	 * @param [options]         Optional settings.
	 * @param [options.timeout] Maximum wait time in ms.
	 */
	async waitForCollaborationReady(
		page: Page,
		{
			timeout = DEFAULT_COLLABORATION_READY_TIMEOUT_MS,
		}: { timeout?: number } = {}
	) {
		try {
			await page.waitForFunction(
				() =>
					( window as any )._wpCollaborationEnabled === true &&
					window?.wp?.data &&
					window?.wp?.blocks,
				undefined,
				{ timeout }
			);
		} catch ( error ) {
			const diagnostics =
				await this.getCollaborationReadyDiagnostics( page );
			const message =
				error instanceof Error ? error.message : String( error );
			throw new Error(
				`Timed out waiting for collaboration to become ready. Diagnostics: ${ JSON.stringify(
					diagnostics
				) }\n${ message }`
			);
		}
	}

	async clearPendingSyncRequestRoute( page: Page ) {
		const existingHandler = this.pendingSyncRouteHandlers.get( page );

		if ( ! existingHandler ) {
			return;
		}

		this.pendingSyncRouteHandlers.delete( page );
		await page.unroute( SYNC_REQUEST_ROUTE, existingHandler );
	}

	async routeNextSyncRequest(
		page: Page,
		onMatch: ( route: Route ) => Promise< void >
	) {
		await this.clearPendingSyncRequestRoute( page );

		let handled = false;
		const handler = async ( route: Route ) => {
			if ( handled || ! isSyncRequestRoute( route ) ) {
				await ignoreAlreadyHandledRoute( () => route.continue() );
				return;
			}

			handled = true;
			await this.clearPendingSyncRequestRoute( page );
			await onMatch( route );
		};

		this.pendingSyncRouteHandlers.set( page, handler );
		await page.route( SYNC_REQUEST_ROUTE, handler );
	}

	async delayNextSyncRequest( page: Page, delayMs: number ) {
		if ( USE_TEST_WS_PROVIDER ) {
			await page.evaluate( ( delay ) => {
				const testWebSocketSync = ( window as any )
					.__gutenbergTestWebSocketSync;
				testWebSocketSync?.delayNextMessage?.( delay );
			}, delayMs );
			return;
		}

		await this.routeNextSyncRequest( page, async ( route ) => {
			await new Promise( ( resolve ) => setTimeout( resolve, delayMs ) );
			await ignoreAlreadyHandledRoute( () => route.continue() );
		} );
	}

	async failNextSyncRequest( page: Page, status: number ) {
		if ( USE_TEST_WS_PROVIDER ) {
			await page.evaluate( () => {
				const testWebSocketSync = ( window as any )
					.__gutenbergTestWebSocketSync;
				testWebSocketSync?.closeNextSocket?.();
			} );
			return;
		}

		await this.routeNextSyncRequest( page, async ( route ) => {
			await ignoreAlreadyHandledRoute( () =>
				route.fulfill( {
					status,
					contentType: 'application/json',
					body: JSON.stringify( {
						code: 'rtc_fuzz_injected_sync_failure',
						message:
							'Injected sync failure from RTC browser fuzzer.',
						data: { status },
					} ),
				} )
			);
		} );
	}

	/**
	 * Wait for sync polling cycles to complete on the given page.
	 *
	 * Note: The sync endpoint URL is URL-encoded in wp-env
	 * (rest_route=%2Fwp-sync%2Fv1%2Fupdates), so we match the
	 * encoded form.
	 *
	 * @param page                        The Playwright page to wait on.
	 * @param cycles                      Number of sync responses to wait for (default 3).
	 * @param [options]                   Optional settings.
	 * @param [options.expectedPeerCount] Expected awareness peers for the
	 *                                    in-memory WebSocket provider.
	 * @param [options.requireSynced]     Whether the in-memory WebSocket provider
	 *                                    must report initial sync completion.
	 * @param [options.roomName]          Room name for the in-memory WebSocket provider.
	 * @param [options.timeout]           Maximum wait time per cycle in ms (default 10000).
	 */
	async waitForSyncCycle(
		page: Page,
		cycles = 3,
		{
			timeout = 10000,
			roomName,
			expectedPeerCount,
			requireSynced = true,
		}: {
			timeout?: number;
			roomName?: string;
			expectedPeerCount?: number;
			requireSynced?: boolean;
		} = {}
	) {
		if ( USE_TEST_WS_PROVIDER ) {
			try {
				const expectedEndpoint = this.fuzzOnlyAssertions
					? getFuzzWebSocketEndpoint(
							getTestWebSocketServerUrl( '/snapshot' )
					  )
					: null;
				const syncWaitResult = await page.waitForFunction(
					( {
						expectedEndpoint: expectedWsEndpoint,
						room,
						expected,
						requireSynced: mustBeSynced,
					}: {
						expectedEndpoint?: FuzzWebSocketEndpoint | null;
						room?: string;
						expected?: number;
						requireSynced?: boolean;
					} ) => {
						const getDefaultPort = ( protocol: string ) =>
							protocol === 'wss:' || protocol === 'https:'
								? '443'
								: '80';
						const normalizeHost = ( host: string ) => {
							const normalized = host
								.replaceAll( /^\[|\]$/g, '' )
								.toLowerCase();
							return [ 'localhost', '127.0.0.1', '::1' ].includes(
								normalized
							)
								? 'loopback'
								: normalized;
						};
						const getEndpoint = ( rawUrl?: string ) => {
							if ( ! rawUrl ) {
								return null;
							}

							try {
								const parsedUrl = new URL( rawUrl );
								return {
									host: normalizeHost( parsedUrl.hostname ),
									port:
										parsedUrl.port ||
										getDefaultPort( parsedUrl.protocol ),
									url: rawUrl,
								};
							} catch {
								return null;
							}
						};
						const state = ( window as any )
							.__gutenbergTestWebSocketSync;
						const providerEndpoint = getEndpoint( state?.url );
						if (
							providerEndpoint &&
							expectedWsEndpoint &&
							( providerEndpoint.host !==
								expectedWsEndpoint.host ||
								providerEndpoint.port !==
									expectedWsEndpoint.port )
						) {
							return {
								expectedEndpoint: expectedWsEndpoint,
								kind: 'endpoint-mismatch',
								providerEndpoint,
							};
						}

						const rooms = state?.rooms ?? {};
						const isRoomReady = ( candidate: any ) =>
							candidate?.status === 'connected' &&
							( ! mustBeSynced || candidate?.synced === true ) &&
							( ! expected ||
								candidate?.awarenessCount >= expected );
						const matchingRoom = room
							? rooms[ room ]
							: Object.values( rooms ).find( isRoomReady );
						return isRoomReady( matchingRoom )
							? { kind: 'ready' }
							: false;
					},
					{
						expectedEndpoint,
						room: roomName,
						expected: expectedPeerCount,
						requireSynced,
					},
					{ timeout }
				);
				const syncWaitValue = ( await syncWaitResult.jsonValue() ) as {
					expectedEndpoint?: FuzzWebSocketEndpoint;
					kind?: string;
					providerEndpoint?: FuzzWebSocketEndpoint;
				} | null;
				if ( syncWaitValue?.kind === 'endpoint-mismatch' ) {
					throw new Error(
						`RTC fuzz-only WebSocket provider endpoint mismatch: ${ JSON.stringify(
							{
								expectedEndpoint:
									syncWaitValue.expectedEndpoint,
								providerEndpoint:
									syncWaitValue.providerEndpoint,
								roomName,
							}
						) }`
					);
				}
				const providerDiagnostics =
					await this.drainFuzzWebSocketProviderDiagnostics( [
						page,
					] );
				const hardProviderDiagnostics =
					this.getHardFuzzWebSocketProviderDiagnostics(
						providerDiagnostics
					);
				if ( hardProviderDiagnostics.length > 0 ) {
					throw new Error(
						`RTC fuzz-only WebSocket provider invariant failed: ${ JSON.stringify(
							hardProviderDiagnostics
						) }`
					);
				}
			} catch ( error ) {
				if (
					error instanceof Error &&
					( error.message.startsWith(
						'RTC fuzz-only WebSocket provider invariant failed'
					) ||
						error.message.startsWith(
							'RTC fuzz-only WebSocket provider endpoint mismatch'
						) )
				) {
					throw error;
				}
				if ( ! this.fuzzOnlyAssertions ) {
					throw error;
				}

				const [
					snapshot,
					allPageSnapshots,
					providerDiagnostics,
					serverSnapshot,
					syncManagerDiagnostics,
				] = await Promise.all( [
					this.getFuzzWebSocketProviderSnapshot( page, roomName ),
					Promise.all(
						this.allPages.map(
							async ( candidatePage, pageIndex ) => ( {
								pageIndex,
								snapshot:
									await this.getFuzzWebSocketProviderSnapshot(
										candidatePage,
										roomName
									),
							} )
						)
					),
					this.drainFuzzWebSocketProviderDiagnostics( [ page ] ),
					this.getFuzzWebSocketServerSnapshot(),
					this.drainFuzzSyncManagerDiagnostics( [ page ] ),
				] );
				const endpointMismatch =
					this.getFuzzWebSocketProviderEndpointMismatch( {
						allPageSnapshots,
						providerDiagnostics,
						roomName,
						serverSnapshot,
					} );
				if ( endpointMismatch ) {
					const message =
						error instanceof Error
							? error.message
							: String( error );
					throw new Error(
						`RTC fuzz-only WebSocket provider endpoint mismatch after ${ timeout }ms: ${ JSON.stringify(
							endpointMismatch
						) }\n${ message }`
					);
				}
				const message =
					error instanceof Error ? error.message : String( error );
				throw new Error(
					`RTC fuzz-only WebSocket sync cycle timeout after ${ timeout }ms: ${ JSON.stringify(
						{
							expectedPeerCount,
							allPageSnapshots,
							providerDiagnostics,
							requireSynced,
							roomName,
							serverSnapshot,
							snapshot,
							syncManagerDiagnostics,
						}
					) }\n${ message }`
				);
			}
			return;
		}

		try {
			for ( let i = 0; i < cycles; i++ ) {
				const beforeState =
					await this.getFuzzHttpPollingProviderState( page );
				const beforeSuccessfulPollCount = Number(
					beforeState?.successfulPollCount ?? 0
				);
				const beforeLastPollSucceededAt = Number(
					beforeState?.lastPollSucceededAt ?? 0
				);
				const responsePromise = page
					.waitForResponse(
						( response ) =>
							response.url().includes( 'wp-sync' ) &&
							response.status() === 200,
						{ timeout }
					)
					.then( () => ( {
						kind: 'response' as const,
						ok: true as const,
					} ) )
					.catch( ( error ) => ( {
						error,
						kind: 'response' as const,
						ok: false as const,
					} ) );
				const providerStatePromise = page
					.waitForFunction(
						( {
							lastPollSucceededAt,
							successfulPollCount,
						}: {
							lastPollSucceededAt: number;
							successfulPollCount: number;
						} ) => {
							const state = ( window as any )
								.__GUTENBERG_RTC_HTTP_POLLING_PROVIDER_STATE__;
							if ( ! state ) {
								return false;
							}

							return (
								Number( state.successfulPollCount ?? 0 ) >
									successfulPollCount ||
								Number( state.lastPollSucceededAt ?? 0 ) >
									lastPollSucceededAt
							);
						},
						{
							lastPollSucceededAt: beforeLastPollSucceededAt,
							successfulPollCount: beforeSuccessfulPollCount,
						},
						{ polling: 100, timeout }
					)
					.then( () => ( {
						kind: 'provider-state' as const,
						ok: true as const,
					} ) )
					.catch( ( error ) => ( {
						error,
						kind: 'provider-state' as const,
						ok: false as const,
					} ) );

				await page.evaluate( () => {
					(
						window as any
					 ).__GUTENBERG_RTC_HTTP_POLLING_RETRY_NOW__?.();
				} );
				const firstResult = await Promise.race( [
					responsePromise,
					providerStatePromise,
				] );
				if ( firstResult.ok ) {
					continue;
				}

				const secondResult =
					firstResult.kind === 'response'
						? await providerStatePromise
						: await responsePromise;
				if ( ! secondResult.ok ) {
					throw firstResult.error;
				}
			}
		} catch ( error ) {
			if ( ! this.fuzzOnlyAssertions ) {
				throw error;
			}

			const [ providerState, providerDiagnostics ] = await Promise.all( [
				this.getFuzzHttpPollingProviderState( page ),
				this.drainFuzzHttpPollingProviderDiagnostics( [ page ] ),
			] );
			const message =
				error instanceof Error ? error.message : String( error );
			throw new Error(
				`RTC fuzz-only HTTP polling sync cycle timeout after ${ timeout }ms: ${ JSON.stringify(
					{
						providerDiagnostics,
						providerState,
					}
				) }\n${ message }`
			);
		}
	}

	/**
	 * Returns a normalized view of the current collaborative editor state for
	 * equality checks across participants.
	 *
	 * @param page                          The page to inspect.
	 * @param [options]                     Optional settings.
	 * @param [options.includeCrdtDocument] Whether to include the persisted
	 *                                      _crdt_document in the returned state.
	 * @param [options.richTextComparison]  Whether rich-text attributes should
	 *                                      compare as exact strings or DOM-equivalent
	 *                                      fragments.
	 */
	async getNormalizedPostState(
		page: Page,
		{
			includeCrdtDocument = false,
			richTextComparison = DEFAULT_RICH_TEXT_COMPARISON,
		}: {
			includeCrdtDocument?: boolean;
			richTextComparison?: RichTextComparisonMode;
		} = {}
	): Promise< NormalizedCollaborativeState > {
		return page.evaluate(
			( { includePersistedDoc, richTextMode } ) => {
				const normalizeValue = ( value: unknown ): unknown => {
					if ( Array.isArray( value ) ) {
						return value.map( normalizeValue );
					}

					if (
						value &&
						typeof value === 'object' &&
						Object.getPrototypeOf( value ) === Object.prototype
					) {
						return Object.fromEntries(
							Object.entries( value as Record< string, unknown > )
								.sort( ( [ a ], [ b ] ) =>
									a.localeCompare( b )
								)
								.map( ( [ key, item ] ) => [
									key,
									normalizeValue( item ),
								] )
						);
					}

					return value;
				};
				const normalizeDomEquivalentRichTextValue = (
					value: unknown
				): unknown => {
					if ( typeof value !== 'string' ) {
						return value;
					}

					const template = document.createElement( 'template' );
					template.innerHTML = value;
					const normalizeNode = ( node: Node ): unknown => {
						if ( node.nodeType === Node.TEXT_NODE ) {
							return {
								type: 'text',
								value: node.textContent ?? '',
							};
						}

						if ( node.nodeType === Node.ELEMENT_NODE ) {
							const element = node as Element;
							return {
								type: 'element',
								name: element.tagName.toLowerCase(),
								attributes: Array.from( element.attributes )
									.map( ( attribute ) => [
										attribute.name,
										attribute.value,
									] )
									.sort( ( [ a ], [ b ] ) =>
										a.localeCompare( b )
									),
								children: Array.from( element.childNodes ).map(
									normalizeNode
								),
							};
						}

						return {
							type: node.nodeType,
							value: node.textContent ?? '',
						};
					};

					return Array.from( template.content.childNodes ).map(
						normalizeNode
					);
				};
				const normalizeAttributeValue = (
					schema: any,
					value: unknown
				): unknown => {
					if (
						richTextMode === 'dom-equivalent' &&
						schema?.type === 'rich-text'
					) {
						return normalizeDomEquivalentRichTextValue( value );
					}

					if ( Array.isArray( value ) ) {
						return value.map( ( item ) =>
							normalizeAttributeValue( schema, item )
						);
					}

					if (
						value &&
						typeof value === 'object' &&
						Object.getPrototypeOf( value ) === Object.prototype
					) {
						return Object.fromEntries(
							Object.entries( value as Record< string, unknown > )
								.sort( ( [ a ], [ b ] ) =>
									a.localeCompare( b )
								)
								.map( ( [ key, item ] ) => [
									key,
									normalizeAttributeValue(
										schema?.query?.[ key ],
										item
									),
								] )
						);
					}

					return value;
				};
				const valuesMatch = ( left: unknown, right: unknown ) =>
					JSON.stringify( normalizeValue( left ) ) ===
					JSON.stringify( normalizeValue( right ) );
				const normalizeLineBreakEquivalentRichTextValue = (
					value: unknown
				) => {
					if ( typeof value !== 'string' ) {
						return value;
					}

					return value
						.replace( /\r\n?/g, '\n' )
						.replace( /<br\s*\/?>/gi, '\n' );
				};
				const normalizeLineBreakEquivalentAttribute = (
					blockName: string,
					key: string,
					value: unknown
				) => {
					const lineBreakEquivalentContentBlocks = new Set( [
						'core/code',
						'core/preformatted',
						'core/verse',
					] );

					if (
						key === 'content' &&
						lineBreakEquivalentContentBlocks.has( blockName )
					) {
						return normalizeLineBreakEquivalentRichTextValue(
							value
						);
					}

					return value;
				};
				const shouldOmitEquivalentImageAttribute = (
					blockName: string,
					key: string,
					value: unknown,
					attributes: Record< string, unknown >
				) => {
					if ( blockName !== 'core/image' ) {
						return false;
					}

					// Uploaded images can retain uploader-local media entity
					// metadata that is absent after the block syncs elsewhere.
					if ( key === 'link' ) {
						return attributes.linkDestination === 'none';
					}

					return (
						( key === 'linkDestination' && value === 'none' ) ||
						( key === 'sizeSlug' && value === 'large' )
					);
				};
				const normalizeAttributes = (
					blockName: string,
					attributes: Record< string, unknown >
				) => {
					const blockType = ( window as any ).wp.blocks.getBlockType(
						blockName
					);
					const attributeSchema = blockType?.attributes ?? {};
					const normalizedEntries: Array< [ string, unknown ] > =
						Object.entries( attributes )
							.filter( ( [ key, value ] ) => {
								const schema = attributeSchema[ key ];
								const isSchemaDefault =
									schema &&
									Object.prototype.hasOwnProperty.call(
										schema,
										'default'
									) &&
									valuesMatch( value, schema.default );
								return (
									! isSchemaDefault &&
									! shouldOmitEquivalentImageAttribute(
										blockName,
										key,
										value,
										attributes
									)
								);
							} )
							.map( ( [ key, value ] ) => [
								key,
								normalizeAttributeValue(
									attributeSchema[ key ],
									normalizeLineBreakEquivalentAttribute(
										blockName,
										key,
										value
									)
								),
							] );

					return Object.fromEntries(
						normalizedEntries.sort( ( [ a ], [ b ] ) =>
							a.localeCompare( b )
						)
					);
				};
				const blockEditorSelect = ( window as any ).wp.data.select(
					'core/block-editor'
				);
				const getInnerBlocks = ( block: {
					clientId?: string;
					innerBlocks?: Array< unknown >;
					name: string;
				} ) => {
					if (
						block.name === 'core/post-content' &&
						block.clientId
					) {
						return blockEditorSelect.getBlocks( block.clientId );
					}

					if ( Array.isArray( block.innerBlocks ) ) {
						return block.innerBlocks;
					}

					return [];
				};

				const normalizeBlocks = (
					blockTree: Array< {
						attributes?: Record< string, unknown >;
						clientId?: string;
						innerBlocks?: Array< unknown >;
						name: string;
					} >
				): NormalizedBlock[] =>
					blockTree.map( ( block ) => ( {
						name: block.name,
						attributes: normalizeAttributes(
							block.name,
							JSON.parse(
								JSON.stringify( block.attributes ?? {} )
							)
						) as Record< string, unknown >,
						innerBlocks:
							block.name === 'core/block'
								? []
								: normalizeBlocks(
										getInnerBlocks( block ) as Array< {
											attributes?: Record<
												string,
												unknown
											>;
											clientId?: string;
											innerBlocks?: Array< unknown >;
											name: string;
										} >
								  ),
					} ) );

				const postId = ( window as any ).wp.data
					.select( 'core/editor' )
					.getCurrentPostId();
				const record = ( window as any ).wp.data
					.select( 'core' )
					.getEntityRecord( 'postType', 'post', postId );
				const blocks = blockEditorSelect.getBlocks();

				return {
					title:
						( window as any ).wp.data
							.select( 'core/editor' )
							.getEditedPostAttribute( 'title' ) ?? '',
					blocks: normalizeBlocks( blocks ),
					crdtDocument: includePersistedDoc
						? record?.meta?._crdt_document ?? null
						: null,
				};
			},
			{
				includePersistedDoc: includeCrdtDocument,
				richTextMode: richTextComparison,
			}
		);
	}

	/**
	 * Wait until all tracked pages converge on the same normalized editor state.
	 *
	 * @param [options]                        Optional settings.
	 * @param [options.crdtDocumentComparison] Whether the CRDT document must
	 *                                         match exactly, or only be present
	 *                                         on all compared pages. Defaults to
	 *                                         presence for fuzz-only runs.
	 * @param [options.includeCrdtDocument]    Whether convergence should also
	 *                                         include the persisted CRDT document.
	 * @param [options.pages]                  Specific pages to compare.
	 * @param [options.richTextComparison]     Whether rich-text attributes should
	 *                                         compare as exact strings or
	 *                                         DOM-equivalent fragments.
	 * @param [options.stableIntervalMs]       Delay between stable samples.
	 * @param [options.stableSamples]          Consecutive equal samples required.
	 * @param [options.timeout]                Maximum wait time in ms.
	 */
	async waitForConvergence( {
		includeCrdtDocument = false,
		crdtDocumentComparison,
		pages = this.allPages,
		richTextComparison = DEFAULT_RICH_TEXT_COMPARISON,
		stableIntervalMs = DEFAULT_CONVERGENCE_STABLE_INTERVAL_MS,
		stableSamples = DEFAULT_CONVERGENCE_STABLE_SAMPLES,
		timeout = 15000,
	}: {
		crdtDocumentComparison?: CrdtDocumentComparisonMode;
		includeCrdtDocument?: boolean;
		pages?: Page[];
		richTextComparison?: RichTextComparisonMode;
		stableIntervalMs?: number;
		stableSamples?: number;
		timeout?: number;
	} = {} ): Promise< NormalizedCollaborativeState > {
		const deadline = Date.now() + timeout;
		let lastStates: NormalizedCollaborativeState[] = [];
		let lastSettledState = '';
		const lastSerializedStateByPage = new Map< number, string >();
		const stableSampleCountByPage = new Map< number, number >();
		let stableSampleCount = 0;
		const effectiveCrdtDocumentComparison =
			crdtDocumentComparison ??
			( this.fuzzOnlyAssertions ? 'presence' : 'exact' );
		const getComparableCrdtDocument = (
			crdtDocument: NormalizedCollaborativeState[ 'crdtDocument' ]
		) => {
			if (
				! includeCrdtDocument ||
				effectiveCrdtDocumentComparison !== 'presence'
			) {
				return crdtDocument;
			}

			return crdtDocument ? '__present__' : null;
		};
		const comparableState = ( state: NormalizedCollaborativeState ) => ( {
			...state,
			crdtDocument: getComparableCrdtDocument( state.crdtDocument ),
		} );

		while ( Date.now() < deadline ) {
			lastStates = await Promise.all(
				pages.map( ( page ) =>
					this.getNormalizedPostState( page, {
						includeCrdtDocument,
						richTextComparison,
					} )
				)
			);

			const comparableStates = lastStates.map( comparableState );
			comparableStates.forEach( ( state, index ) => {
				const serializedState = JSON.stringify( state );
				const lastSerializedState =
					lastSerializedStateByPage.get( index );
				lastSerializedStateByPage.set( index, serializedState );
				stableSampleCountByPage.set(
					index,
					lastSerializedState === serializedState
						? ( stableSampleCountByPage.get( index ) ?? 0 ) + 1
						: 1
				);
			} );
			const serializedFirstState = JSON.stringify(
				comparableStates[ 0 ]
			);
			const isSettled = lastStates.every(
				( state, index ) =>
					JSON.stringify( comparableStates[ index ] ) ===
						serializedFirstState &&
					( ! includeCrdtDocument || !! state.crdtDocument )
			);

			if ( isSettled ) {
				if ( serializedFirstState === lastSettledState ) {
					stableSampleCount += 1;
				} else {
					lastSettledState = serializedFirstState;
					stableSampleCount = 1;
				}

				if ( stableSampleCount >= stableSamples ) {
					const [
						coreDataDiagnostics,
						syncManagerDiagnostics,
						providerDiagnostics,
						droppedHttpUpdates,
						cursorRegressions,
						webSocketProviderDiagnostics,
					] = await Promise.all( [
						this.drainFuzzCoreDataDiagnostics( pages ),
						this.drainFuzzSyncManagerDiagnostics( pages ),
						this.drainFuzzHttpPollingProviderDiagnostics( pages ),
						this.drainFuzzHttpPollingDroppedUpdates( pages ),
						this.drainFuzzHttpPollingCursorRegressions( pages ),
						this.drainFuzzWebSocketProviderDiagnostics( pages ),
					] );
					if ( coreDataDiagnostics.length > 0 ) {
						throw new Error(
							`RTC fuzz-only core-data diagnostics before convergence return: ${ JSON.stringify(
								coreDataDiagnostics
							) }`
						);
					}
					if ( syncManagerDiagnostics.length > 0 ) {
						throw new Error(
							`RTC fuzz-only sync-manager diagnostics before convergence return: ${ JSON.stringify(
								syncManagerDiagnostics
							) }`
						);
					}
					if ( providerDiagnostics.length > 0 ) {
						throw new Error(
							`RTC fuzz-only HTTP polling provider diagnostics before convergence return: ${ JSON.stringify(
								providerDiagnostics
							) }`
						);
					}
					if ( droppedHttpUpdates.length > 0 ) {
						throw new Error(
							`RTC fuzz-only HTTP polling dropped update before convergence return: ${ JSON.stringify(
								droppedHttpUpdates
							) }`
						);
					}
					if ( cursorRegressions.length > 0 ) {
						throw new Error(
							`RTC fuzz-only HTTP polling cursor regression before convergence return: ${ JSON.stringify(
								cursorRegressions
							) }`
						);
					}
					const hardWebSocketProviderDiagnostics =
						this.getHardFuzzWebSocketProviderDiagnostics(
							webSocketProviderDiagnostics
						);
					if ( hardWebSocketProviderDiagnostics.length > 0 ) {
						throw new Error(
							`RTC fuzz-only WebSocket provider invariant before convergence return: ${ JSON.stringify(
								hardWebSocketProviderDiagnostics
							) }`
						);
					}

					return lastStates[ 0 ];
				}
			} else {
				lastSettledState = '';
				stableSampleCount = 0;
			}

			await pages[ 0 ].waitForTimeout( stableIntervalMs );
		}

		const providerDiagnostics =
			await this.drainFuzzHttpPollingProviderDiagnostics( pages );
		if ( providerDiagnostics.length > 0 ) {
			throw new Error(
				`RTC fuzz-only HTTP polling provider diagnostics after ${ timeout }ms: ${ JSON.stringify(
					providerDiagnostics
				) }`
			);
		}

		const droppedHttpUpdates =
			await this.drainFuzzHttpPollingDroppedUpdates( pages );
		if ( droppedHttpUpdates.length > 0 ) {
			throw new Error(
				`RTC fuzz-only HTTP polling dropped update after ${ timeout }ms: ${ JSON.stringify(
					droppedHttpUpdates
				) }`
			);
		}

		const coreDataDiagnostics =
			await this.drainFuzzCoreDataDiagnostics( pages );
		if ( coreDataDiagnostics.length > 0 ) {
			throw new Error(
				`RTC fuzz-only core-data diagnostics after ${ timeout }ms: ${ JSON.stringify(
					coreDataDiagnostics
				) }`
			);
		}

		const syncManagerDiagnostics =
			await this.drainFuzzSyncManagerDiagnostics( pages );
		if ( syncManagerDiagnostics.length > 0 ) {
			throw new Error(
				`RTC fuzz-only sync-manager diagnostics after ${ timeout }ms: ${ JSON.stringify(
					syncManagerDiagnostics
				) }`
			);
		}

		const webSocketProviderDiagnostics =
			await this.drainFuzzWebSocketProviderDiagnostics( pages );
		const hardWebSocketProviderDiagnostics =
			this.getHardFuzzWebSocketProviderDiagnostics(
				webSocketProviderDiagnostics
			);
		if ( hardWebSocketProviderDiagnostics.length > 0 ) {
			throw new Error(
				`RTC fuzz-only WebSocket provider invariant after ${ timeout }ms: ${ JSON.stringify(
					hardWebSocketProviderDiagnostics
				) }`
			);
		}

		const markerSetDivergence = this.getStableFuzzMarkerSetDivergence(
			lastStates,
			Array.from( { length: pages.length }, ( _value, index ) => {
				return stableSampleCountByPage.get( index ) ?? 0;
			} ),
			Math.max( 2, stableSamples )
		);

		if ( markerSetDivergence ) {
			throw new Error(
				`RTC fuzz-only marker-set divergence after ${ timeout }ms: ${ JSON.stringify(
					markerSetDivergence
				) }`
			);
		}

		const structuralDivergence = this.getStableFuzzStructuralDivergence(
			lastStates,
			Array.from( { length: pages.length }, ( _value, index ) => {
				return stableSampleCountByPage.get( index ) ?? 0;
			} ),
			Math.max( 2, stableSamples )
		);

		if ( structuralDivergence ) {
			throw new Error(
				`RTC fuzz-only structural divergence after ${ timeout }ms: ${ JSON.stringify(
					structuralDivergence
				) }`
			);
		}

		const markerLocationDivergence =
			this.getStableFuzzMarkerLocationDivergence(
				lastStates,
				Array.from( { length: pages.length }, ( _value, index ) => {
					return stableSampleCountByPage.get( index ) ?? 0;
				} ),
				Math.max( 2, stableSamples )
			);

		if ( markerLocationDivergence ) {
			throw new Error(
				`RTC fuzz-only marker-location divergence after ${ timeout }ms: ${ JSON.stringify(
					markerLocationDivergence
				) }`
			);
		}

		const cursorRegressions =
			await this.drainFuzzHttpPollingCursorRegressions( pages );
		if ( cursorRegressions.length > 0 ) {
			throw new Error(
				`RTC fuzz-only HTTP polling cursor regression after ${ timeout }ms: ${ JSON.stringify(
					cursorRegressions
				) }`
			);
		}

		throw new Error(
			`Collaborative state did not converge within ${ timeout }ms: ${ JSON.stringify(
				lastStates.map( comparableState )
			) }`
		);
	}

	private async installFuzzOnlyBrowserFlags( page: Page ) {
		const shouldInstallProviderFlag =
			process.env.GUTENBERG_RTC_TEST_WS_PROVIDER !== undefined;

		if ( ! this.fuzzOnlyAssertions && ! shouldInstallProviderFlag ) {
			return;
		}

		await page.addInitScript(
			( {
				fuzzOnlyAssertions,
				testWebSocketProvider,
				testWebSocketUrl,
			} ) => {
				( window as any ).__GUTENBERG_RTC_TEST_WS_PROVIDER__ =
					testWebSocketProvider;
				if ( fuzzOnlyAssertions ) {
					( window as any ).__GUTENBERG_RTC_FUZZ_ONLY_ASSERTIONS__ =
						true;
					(
						window as any
					 ).__GUTENBERG_RTC_BROWSER_FUZZ_ONLY_ASSERTIONS__ = true;
				}
				if (
					testWebSocketProvider &&
					typeof testWebSocketUrl === 'string' &&
					testWebSocketUrl
				) {
					( window as any ).__GUTENBERG_RTC_TEST_WS_URL__ =
						testWebSocketUrl;
				}
			},
			{
				fuzzOnlyAssertions: this.fuzzOnlyAssertions,
				testWebSocketProvider: USE_TEST_WS_PROVIDER,
				testWebSocketUrl: USE_TEST_WS_PROVIDER
					? TEST_WS_PROVIDER_URL
					: null,
			}
		);
	}

	private async getFuzzWebSocketProviderSnapshot(
		page: Page,
		roomName?: string
	) {
		if ( ! this.fuzzOnlyAssertions || ! USE_TEST_WS_PROVIDER ) {
			return null;
		}

		return page
			.evaluate( ( room ) => {
				const state = ( window as any ).__gutenbergTestWebSocketSync;
				const rooms = state?.rooms ?? {};
				const sanitizeRoom = ( value: any ) =>
					value
						? {
								awarenessCount: value.awarenessCount ?? null,
								clientId: value.clientId ?? null,
								createdTick: value.createdTick ?? null,
								destroyed: value.destroyed === true,
								destroyedTick: value.destroyedTick ?? null,
								duplicateActiveProviderCount:
									value.duplicateActiveProviderCount ?? 0,
								duplicateActiveProviderEvents: (
									value.duplicateActiveProviderEvents ?? []
								).slice( -5 ),
								lastAwarenessTick:
									value.lastAwarenessTick ?? null,
								lastStatusTick: value.lastStatusTick ?? null,
								lastSyncTick: value.lastSyncTick ?? null,
								providerToken: value.providerToken ?? null,
								staleReadyEventCount:
									value.staleReadyEventCount ?? 0,
								staleReadyEvents: (
									value.staleReadyEvents ?? []
								).slice( -5 ),
								status: value.status ?? null,
								synced: value.synced === true,
						  }
						: null;
				const roomEntries = room
					? [ [ room, sanitizeRoom( rooms[ room ] ) ] ]
					: Object.entries( rooms )
							.slice( 0, 10 )
							.map( ( [ key, value ] ) => [
								key,
								sanitizeRoom( value ),
							] );

				return {
					providerDiagnostics: (
						state?.providerDiagnostics ?? []
					).slice( -10 ),
					roomCount: Object.keys( rooms ).length,
					rooms: Object.fromEntries( roomEntries ),
					tick: state?.tick ?? null,
					truncatedRooms: Object.keys( rooms ).length > 10 && ! room,
					url: typeof state?.url === 'string' ? state.url : null,
				};
			}, roomName )
			.catch( ( error ) => ( {
				diagnosticError:
					error instanceof Error ? error.message : String( error ),
			} ) );
	}

	private async getFuzzWebSocketServerSnapshot() {
		if ( ! this.fuzzOnlyAssertions || ! USE_TEST_WS_PROVIDER ) {
			return null;
		}

		const snapshotUrl = getTestWebSocketServerUrl( '/snapshot' );
		if ( ! snapshotUrl ) {
			return {
				diagnosticError: 'Could not resolve test WebSocket server URL.',
			};
		}

		try {
			const signal = (
				AbortSignal as typeof AbortSignal & {
					timeout?: ( milliseconds: number ) => AbortSignal;
				}
			 ).timeout?.( 1500 );
			const response = await fetch(
				snapshotUrl,
				signal ? { signal } : undefined
			);
			if ( ! response.ok ) {
				return {
					diagnosticError: `HTTP ${ response.status }`,
					url: snapshotUrl,
				};
			}
			return {
				...( await response.json() ),
				url: snapshotUrl,
			};
		} catch ( error ) {
			return {
				diagnosticError:
					error instanceof Error ? error.message : String( error ),
				url: snapshotUrl,
			};
		}
	}

	private async drainFuzzWebSocketProviderDiagnostics( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions || ! USE_TEST_WS_PROVIDER ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const diagnostics = await page
					.evaluate( () => {
						const state = ( window as any )
							.__gutenbergTestWebSocketSync;
						const providerDiagnostics = state?.providerDiagnostics;
						if (
							! Array.isArray( providerDiagnostics ) ||
							providerDiagnostics.length === 0
						) {
							return [];
						}

						return providerDiagnostics.splice(
							0,
							providerDiagnostics.length
						);
					} )
					.catch( () => [] );

				return diagnostics.length > 0
					? { diagnostics, pageIndex }
					: null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				diagnostics: unknown[];
				pageIndex: number;
			} => diagnostic !== null
		);
	}

	private getFuzzWebSocketProviderEndpointMismatch( {
		allPageSnapshots,
		providerDiagnostics,
		roomName,
		serverSnapshot,
	}: {
		allPageSnapshots: Array< { pageIndex: number; snapshot: any } >;
		providerDiagnostics: Array< {
			diagnostics: unknown[];
			pageIndex: number;
		} >;
		roomName?: string;
		serverSnapshot: any;
	} ) {
		const expectedEndpoint = getFuzzWebSocketEndpoint(
			serverSnapshot?.url ?? getTestWebSocketServerUrl( '/snapshot' ),
			serverSnapshot?.port
		);
		if ( ! expectedEndpoint ) {
			return null;
		}

		const pageDiagnosticsByIndex = new Map(
			providerDiagnostics.map( ( pageDiagnostic ) => [
				pageDiagnostic.pageIndex,
				pageDiagnostic.diagnostics,
			] )
		);
		const mismatches: Array< {
			pageIndex: number;
			providerEndpoint: FuzzWebSocketEndpoint;
			source: string;
		} > = [];

		for ( const { pageIndex, snapshot } of allPageSnapshots ) {
			const providerUrls = new Map< string, string >();
			if ( typeof snapshot?.url === 'string' ) {
				providerUrls.set( snapshot.url, 'snapshot' );
			}

			for ( const diagnostic of snapshot?.providerDiagnostics ?? [] ) {
				const url = ( diagnostic as { url?: unknown } )?.url;
				if ( typeof url === 'string' ) {
					providerUrls.set( url, 'snapshot-diagnostic' );
				}
			}

			for ( const diagnostic of pageDiagnosticsByIndex.get( pageIndex ) ??
				[] ) {
				const url = ( diagnostic as { url?: unknown } )?.url;
				if ( typeof url === 'string' ) {
					providerUrls.set( url, 'drained-diagnostic' );
				}
			}

			for ( const [ url, source ] of providerUrls ) {
				const providerEndpoint = getFuzzWebSocketEndpoint( url );
				if (
					providerEndpoint &&
					! fuzzWebSocketEndpointsMatch(
						providerEndpoint,
						expectedEndpoint
					)
				) {
					mismatches.push( {
						pageIndex,
						providerEndpoint,
						source,
					} );
				}
			}
		}

		if ( mismatches.length === 0 ) {
			return null;
		}

		return {
			expectedEndpoint,
			mismatches: mismatches.slice( 0, 10 ),
			roomName,
			serverSnapshot: {
				diagnosticError: serverSnapshot?.diagnosticError,
				port: serverSnapshot?.port,
				url:
					serverSnapshot?.url ??
					getTestWebSocketServerUrl( '/snapshot' ),
			},
			truncated: mismatches.length > 10,
		};
	}

	private getHardFuzzWebSocketProviderDiagnostics(
		pageDiagnostics: Array< { diagnostics: unknown[]; pageIndex: number } >
	) {
		return pageDiagnostics
			.map( ( pageDiagnostic ) => ( {
				...pageDiagnostic,
				diagnostics: pageDiagnostic.diagnostics.filter(
					( diagnostic ) =>
						[
							'duplicate-active-provider',
							'initial-sync-document-changed-with-same-state-vector',
						].includes(
							( diagnostic as { kind?: string } )?.kind ?? ''
						)
				),
			} ) )
			.filter( ( pageDiagnostic ) => pageDiagnostic.diagnostics.length );
	}

	private async drainFuzzCoreDataDiagnostics( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const diagnostics = await page
					.evaluate( () => {
						const globalDiagnostics = ( window as any )
							.__GUTENBERG_RTC_FUZZ_CORE_DATA_DIAGNOSTICS__;
						if (
							! Array.isArray( globalDiagnostics ) ||
							globalDiagnostics.length === 0
						) {
							return [];
						}

						return globalDiagnostics.splice(
							0,
							globalDiagnostics.length
						);
					} )
					.catch( () => [] );

				return diagnostics.length > 0
					? { diagnostics, pageIndex }
					: null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				diagnostics: unknown[];
				pageIndex: number;
			} => diagnostic !== null
		);
	}

	private async drainFuzzSyncManagerDiagnostics( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const diagnostics = await page
					.evaluate( () => {
						const globalDiagnostics = ( window as any )
							.__GUTENBERG_RTC_FUZZ_SYNC_MANAGER_DIAGNOSTICS__;
						if (
							! Array.isArray( globalDiagnostics ) ||
							globalDiagnostics.length === 0
						) {
							return [];
						}

						return globalDiagnostics.splice(
							0,
							globalDiagnostics.length
						);
					} )
					.catch( () => [] );

				return diagnostics.length > 0
					? { diagnostics, pageIndex }
					: null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				diagnostics: unknown[];
				pageIndex: number;
			} => diagnostic !== null
		);
	}

	private async drainFuzzHttpPollingProviderDiagnostics( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const diagnostics = await page
					.evaluate( () => {
						const globalDiagnostics = ( window as any )
							.__GUTENBERG_RTC_HTTP_POLLING_PROVIDER_DIAGNOSTICS__;
						if (
							! Array.isArray( globalDiagnostics ) ||
							globalDiagnostics.length === 0
						) {
							return [];
						}

						return globalDiagnostics.splice(
							0,
							globalDiagnostics.length
						);
					} )
					.catch( () => [] );

				return diagnostics.length > 0
					? { diagnostics, pageIndex }
					: null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				diagnostics: unknown[];
				pageIndex: number;
			} => diagnostic !== null
		);
	}

	private async getFuzzHttpPollingProviderState( page: Page ) {
		if ( ! this.fuzzOnlyAssertions || USE_TEST_WS_PROVIDER ) {
			return null;
		}

		return page
			.evaluate(
				() =>
					( window as any )
						.__GUTENBERG_RTC_HTTP_POLLING_PROVIDER_STATE__ ?? null
			)
			.catch( ( error ) => ( {
				diagnosticError:
					error instanceof Error ? error.message : String( error ),
			} ) );
	}

	private async drainFuzzHttpPollingDroppedUpdates( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const updates = await page
					.evaluate( () => {
						const globalDiagnostics = ( window as any )
							.__GUTENBERG_RTC_HTTP_POLLING_DROPPED_UPDATES__;
						if (
							! Array.isArray( globalDiagnostics ) ||
							globalDiagnostics.length === 0
						) {
							return [];
						}

						return globalDiagnostics.splice(
							0,
							globalDiagnostics.length
						);
					} )
					.catch( () => [] );

				return updates.length > 0 ? { pageIndex, updates } : null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				pageIndex: number;
				updates: unknown[];
			} => diagnostic !== null
		);
	}

	private async drainFuzzHttpPollingCursorRegressions( pages: Page[] ) {
		if ( ! this.fuzzOnlyAssertions ) {
			return [];
		}

		const pageDiagnostics = await Promise.all(
			pages.map( async ( page, pageIndex ) => {
				const regressions = await page
					.evaluate( () => {
						const globalDiagnostics = ( window as any )
							.__GUTENBERG_RTC_HTTP_POLLING_CURSOR_REGRESSIONS__;
						if (
							! Array.isArray( globalDiagnostics ) ||
							globalDiagnostics.length === 0
						) {
							return [];
						}

						return globalDiagnostics.splice(
							0,
							globalDiagnostics.length
						);
					} )
					.catch( () => [] );

				return regressions.length > 0
					? { pageIndex, regressions }
					: null;
			} )
		);

		return pageDiagnostics.filter(
			(
				diagnostic
			): diagnostic is {
				pageIndex: number;
				regressions: unknown[];
			} => diagnostic !== null
		);
	}

	private getStableFuzzStructuralDivergence(
		states: NormalizedCollaborativeState[],
		stableSamplesByPage: number[],
		requiredStableSamples: number
	) {
		if (
			! this.fuzzOnlyAssertions ||
			states.length < 2 ||
			stableSamplesByPage.some(
				( samples ) => samples < requiredStableSamples
			) ||
			states.some(
				( state ) => ! state.title && state.blocks.length === 0
			)
		) {
			return null;
		}

		const getBlockTopology = (
			blocks: NormalizedBlock[],
			parentPath = ''
		): BlockTopologyEntry[] =>
			blocks.flatMap( ( block, index ) => {
				const path = parentPath
					? `${ parentPath }.${ index }`
					: `${ index }`;

				return [
					{
						childCount: block.innerBlocks.length,
						name: block.name,
						path,
					},
					...getBlockTopology( block.innerBlocks, path ),
				];
			} );
		const getStringFingerprint = ( value: string ) => {
			let hash = 0;
			for ( let index = 0; index < value.length; index++ ) {
				hash = ( hash * 31 + value.charCodeAt( index ) ) % 4294967291;
			}

			return Math.trunc( hash ).toString( 16 );
		};
		const snapshots = states.map( ( state, pageIndex ) => {
			const topology = getBlockTopology( state.blocks );

			return {
				pageIndex,
				rootBlockCount: state.blocks.length,
				stableSamples: stableSamplesByPage[ pageIndex ] ?? 0,
				titleFingerprint: getStringFingerprint( state.title ),
				titleLength: state.title.length,
				topology,
				topologyPreview: topology.slice( 0, 30 ),
				totalBlockCount: topology.length,
				truncated: topology.length > 30,
			};
		} );
		const firstSnapshot = snapshots[ 0 ];
		const firstRootBlockCount = firstSnapshot.rootBlockCount;
		const firstTotalBlockCount = firstSnapshot.totalBlockCount;
		const firstTopology = JSON.stringify( firstSnapshot.topology );
		const firstTitleFingerprint = firstSnapshot.titleFingerprint;
		const firstTitleLength = firstSnapshot.titleLength;

		let kind:
			| 'stable-root-block-count-divergence'
			| 'stable-total-block-count-divergence'
			| 'stable-block-topology-divergence'
			| 'stable-title-divergence'
			| null = null;

		if (
			snapshots.some(
				( snapshot ) => snapshot.rootBlockCount !== firstRootBlockCount
			)
		) {
			kind = 'stable-root-block-count-divergence';
		} else if (
			snapshots.some(
				( snapshot ) =>
					snapshot.totalBlockCount !== firstTotalBlockCount
			)
		) {
			kind = 'stable-total-block-count-divergence';
		} else if (
			snapshots.some(
				( snapshot ) =>
					JSON.stringify( snapshot.topology ) !== firstTopology
			)
		) {
			kind = 'stable-block-topology-divergence';
		} else if (
			snapshots.some(
				( snapshot ) =>
					snapshot.titleFingerprint !== firstTitleFingerprint ||
					snapshot.titleLength !== firstTitleLength
			)
		) {
			kind = 'stable-title-divergence';
		}

		if ( ! kind ) {
			return null;
		}

		return {
			kind,
			requiredStableSamples,
			pages: snapshots.map( ( snapshot ) => ( {
				pageIndex: snapshot.pageIndex,
				rootBlockCount: snapshot.rootBlockCount,
				stableSamples: snapshot.stableSamples,
				titleFingerprint: snapshot.titleFingerprint,
				titleLength: snapshot.titleLength,
				topology: snapshot.topologyPreview,
				totalBlockCount: snapshot.totalBlockCount,
				truncated: snapshot.truncated,
			} ) ),
		};
	}

	private getStableFuzzMarkerLocationDivergence(
		states: NormalizedCollaborativeState[],
		stableSamplesByPage: number[],
		requiredStableSamples: number
	) {
		if (
			! this.fuzzOnlyAssertions ||
			states.length < 2 ||
			stableSamplesByPage.some(
				( samples ) => samples < requiredStableSamples
			) ||
			states.some(
				( state ) => ! state.title && state.blocks.length === 0
			)
		) {
			return null;
		}

		const getStringFingerprint = ( value: string ) => {
			let hash = 0;
			for ( let index = 0; index < value.length; index++ ) {
				hash = ( hash * 31 + value.charCodeAt( index ) ) % 4294967291;
			}

			return Math.trunc( hash ).toString( 16 );
		};
		const getMarkerKey = ( marker: string ) =>
			`${ getStringFingerprint( marker ) }:${ marker.length }`;
		const addMarkerLocations = (
			value: string,
			path: string,
			locationsByMarker: Map< string, string[] >
		) => {
			const seenAtPath = new Map< string, number >();
			for ( const match of value.matchAll( FUZZ_MARKER_PATTERN ) ) {
				const marker = match[ 0 ];
				const markerKey = getMarkerKey( marker );
				const occurrence = seenAtPath.get( markerKey ) ?? 0;
				seenAtPath.set( markerKey, occurrence + 1 );
				const locations = locationsByMarker.get( markerKey ) ?? [];
				locations.push( `${ path }#${ occurrence }` );
				locationsByMarker.set( markerKey, locations );
			}
		};
		const visitValue = (
			value: unknown,
			path: string,
			locationsByMarker: Map< string, string[] >
		) => {
			if ( typeof value === 'string' ) {
				addMarkerLocations( value, path, locationsByMarker );
				return;
			}

			if ( Array.isArray( value ) ) {
				value.forEach( ( item, index ) =>
					visitValue(
						item,
						`${ path }[${ index }]`,
						locationsByMarker
					)
				);
				return;
			}

			if ( value && typeof value === 'object' ) {
				Object.entries( value as Record< string, unknown > )
					.sort( ( [ left ], [ right ] ) =>
						left.localeCompare( right )
					)
					.forEach( ( [ key, item ] ) =>
						visitValue(
							item,
							`${ path }.${ key }`,
							locationsByMarker
						)
					);
			}
		};
		const visitBlocks = (
			blocks: NormalizedBlock[],
			path: string,
			locationsByMarker: Map< string, string[] >
		) => {
			blocks.forEach( ( block, index ) => {
				const blockPath = `${ path }[${ index }]:${ block.name }`;
				visitValue(
					block.attributes,
					`${ blockPath }.attributes`,
					locationsByMarker
				);
				visitBlocks(
					block.innerBlocks,
					`${ blockPath }.innerBlocks`,
					locationsByMarker
				);
			} );
		};
		const markerSnapshots = states.map( ( state, pageIndex ) => {
			const locationsByMarker = new Map< string, string[] >();
			addMarkerLocations( state.title, 'title', locationsByMarker );
			visitBlocks( state.blocks, 'blocks', locationsByMarker );

			const markerLocationEntries: Array< [ string, string[] ] > =
				Array.from( locationsByMarker.entries() )
					.map(
						( [ markerKey, locations ] ): [ string, string[] ] => [
							markerKey,
							[ ...locations ].sort(),
						]
					)
					.sort( ( [ left ], [ right ] ) =>
						left.localeCompare( right )
					);
			const markerLocations: Record< string, string[] > =
				Object.fromEntries( markerLocationEntries );
			const markerCounts = Object.fromEntries(
				Object.entries( markerLocations ).map(
					( [ markerKey, locations ] ) => [
						markerKey,
						locations.length,
					]
				)
			);

			return {
				markerCounts,
				markerLocations,
				pageIndex,
				stableSamples: stableSamplesByPage[ pageIndex ] ?? 0,
			};
		} );

		if (
			markerSnapshots.every(
				( snapshot ) =>
					Object.keys( snapshot.markerCounts ).length === 0
			)
		) {
			return null;
		}

		const firstMarkerCounts = JSON.stringify(
			markerSnapshots[ 0 ].markerCounts
		);
		if (
			markerSnapshots.some(
				( snapshot ) =>
					JSON.stringify( snapshot.markerCounts ) !==
					firstMarkerCounts
			)
		) {
			return null;
		}

		const firstMarkerLocations = JSON.stringify(
			markerSnapshots[ 0 ].markerLocations
		);
		if (
			markerSnapshots.every(
				( snapshot ) =>
					JSON.stringify( snapshot.markerLocations ) ===
					firstMarkerLocations
			)
		) {
			return null;
		}

		const divergentMarkers = Object.keys(
			markerSnapshots[ 0 ].markerLocations
		)
			.filter( ( markerKey ) =>
				markerSnapshots.some(
					( snapshot ) =>
						JSON.stringify(
							snapshot.markerLocations[ markerKey ] ?? []
						) !==
						JSON.stringify(
							markerSnapshots[ 0 ].markerLocations[ markerKey ] ??
								[]
						)
				)
			)
			.slice( 0, 10 );

		return {
			divergentMarkers,
			kind: 'stable-marker-location-divergence',
			requiredStableSamples,
			pages: markerSnapshots.map( ( snapshot ) => ( {
				locations: Object.fromEntries(
					divergentMarkers.map( ( markerKey ) => [
						markerKey,
						( snapshot.markerLocations[ markerKey ] ?? [] ).slice(
							0,
							20
						),
					] )
				),
				pageIndex: snapshot.pageIndex,
				stableSamples: snapshot.stableSamples,
			} ) ),
			truncated:
				Object.keys( markerSnapshots[ 0 ].markerLocations ).length >
				divergentMarkers.length,
		};
	}

	private getStableFuzzMarkerSetDivergence(
		states: NormalizedCollaborativeState[],
		stableSamplesByPage: number[],
		requiredStableSamples: number
	) {
		if (
			! this.fuzzOnlyAssertions ||
			states.length < 2 ||
			stableSamplesByPage.some(
				( samples ) => samples < requiredStableSamples
			) ||
			states.some(
				( state ) => ! state.title && state.blocks.length === 0
			)
		) {
			return null;
		}

		const markerSnapshots = states.map( ( state, pageIndex ) => {
			const serializedState = JSON.stringify( {
				blocks: state.blocks,
				title: state.title,
			} );
			const markerMatches =
				serializedState.match( FUZZ_MARKER_PATTERN ) ?? [];
			const markerCounts = Object.fromEntries(
				Array.from( new Set( markerMatches ) )
					.sort()
					.map( ( marker ) => [
						marker,
						markerMatches.filter( ( value ) => value === marker )
							.length,
					] )
			);
			const markers = Object.keys( markerCounts );

			return {
				markerCounts,
				markerCount: markers.length,
				markers,
				pageIndex,
				stableSamples: stableSamplesByPage[ pageIndex ] ?? 0,
			};
		} );

		if (
			markerSnapshots.every( ( snapshot ) => snapshot.markerCount === 0 )
		) {
			return null;
		}

		const firstMarkerSet = JSON.stringify( markerSnapshots[ 0 ].markers );
		if (
			markerSnapshots.every(
				( snapshot ) =>
					JSON.stringify( snapshot.markers ) === firstMarkerSet
			)
		) {
			const firstMarkerCounts = JSON.stringify(
				markerSnapshots[ 0 ].markerCounts
			);
			if (
				markerSnapshots.every(
					( snapshot ) =>
						JSON.stringify( snapshot.markerCounts ) ===
						firstMarkerCounts
				)
			) {
				return null;
			}

			return {
				kind: 'marker-count-divergence',
				requiredStableSamples,
				pages: markerSnapshots.map( ( snapshot ) => ( {
					markerCount: snapshot.markerCount,
					markerCounts: Object.fromEntries(
						Object.entries( snapshot.markerCounts ).slice( 0, 20 )
					),
					pageIndex: snapshot.pageIndex,
					stableSamples: snapshot.stableSamples,
					truncated: Object.keys( snapshot.markerCounts ).length > 20,
				} ) ),
			};
		}

		return {
			kind: 'marker-set-divergence',
			requiredStableSamples,
			pages: markerSnapshots.map( ( snapshot ) => ( {
				markerCount: snapshot.markerCount,
				markers: snapshot.markers.slice( 0, 20 ),
				pageIndex: snapshot.pageIndex,
				stableSamples: snapshot.stableSamples,
				truncated: snapshot.markers.length > 20,
			} ) ),
		};
	}

	/**
	 * All pages in the session: primary user followed by joined users
	 * in the order they joined.
	 */
	get allPages(): Page[] {
		return [ this.primaryPage, ...this.sessions.map( ( s ) => s.page ) ];
	}

	/**
	 * All editors in the session: primary user followed by joined users
	 * in the order they joined.
	 */
	get allEditors(): Editor[] {
		return [ this.editor, ...this.sessions.map( ( s ) => s.editor ) ];
	}

	/**
	 * Get a joined user's page by index (0-based, in join order).
	 *
	 * @param index Index of the joined user.
	 */
	getPage( index: number ): Page {
		if ( index < 0 || index >= this.sessions.length ) {
			throw new Error(
				`No session at index ${ index }. ${ this.sessions.length } user(s) have joined.`
			);
		}
		return this.sessions[ index ].page;
	}

	/**
	 * Get a joined user's editor by index (0-based, in join order).
	 *
	 * @param index Index of the joined user.
	 */
	getEditor( index: number ): Editor {
		if ( index < 0 || index >= this.sessions.length ) {
			throw new Error(
				`No session at index ${ index }. ${ this.sessions.length } user(s) have joined.`
			);
		}
		return this.sessions[ index ].editor;
	}

	/**
	 * Get the second user's Page instance.
	 * Backward-compatible accessor for two-user tests.
	 */
	get page2(): Page {
		if ( this.sessions.length === 0 ) {
			throw new Error(
				'Second page not available. Call openCollaborativeSession() or joinUser() first.'
			);
		}
		return this.sessions[ 0 ].page;
	}

	/**
	 * Get the second user's Editor instance.
	 * Backward-compatible accessor for two-user tests.
	 */
	get editor2(): Editor {
		if ( this.sessions.length === 0 ) {
			throw new Error(
				'Second editor not available. Call openCollaborativeSession() or joinUser() first.'
			);
		}
		return this.sessions[ 0 ].editor;
	}

	registerCleanupUser( userId: number ) {
		if ( ! this.trackedUserIds.includes( userId ) ) {
			this.trackedUserIds.push( userId );
		}
	}

	/**
	 * Clean up: close all secondary browser contexts and delete test users.
	 */
	async teardown() {
		for ( const session of this.sessions ) {
			await session.context.close();
		}
		this.sessions = [];

		if ( this.cleanupUsersMode === 'all' ) {
			await this.requestUtils.deleteAllUsers();
		} else if ( this.cleanupUsersMode === 'tracked' ) {
			for ( const userId of this.trackedUserIds ) {
				try {
					await this.requestUtils.rest( {
						method: 'DELETE',
						path: `/wp/v2/users/${ userId }`,
						params: {
							force: true,
							reassign: 1,
						},
					} );
				} catch {
					// Ignore cleanup failures so one stale user does not mask test results.
				}
			}
		}

		this.trackedUserIds = [];
	}
}

/**
 * Set the real-time collaboration WordPress setting.
 *
 * Uses the form-based approach (similar to setGutenbergExperiments)
 * because this setting is registered on admin_init in the "writing"
 * group and is not exposed via /wp/v2/settings.
 *
 * @param requestUtils An instance of RequestUtils for making HTTP requests.
 * @param enabled      Whether to enable or disable collaboration.
 */
export async function setCollaboration(
	requestUtils: RequestUtils,
	enabled: boolean
): Promise< void > {
	const response = await requestUtils.request.get(
		'/wp-admin/options-writing.php'
	);
	const html = await response.text();
	const nonce = html.match( /name="_wpnonce" value="([^"]+)"/ )![ 1 ];

	const optionName = 'wp_collaboration_enabled';
	const optionValue = enabled ? 1 : 0;

	const formData: Record< string, string | number > = {
		option_page: 'writing',
		action: 'update',
		_wpnonce: nonce,
		_wp_http_referer: '/wp-admin/options-writing.php',
		submit: 'Save Changes',
		default_category: 1,
		default_post_format: 0,
	};

	formData[ optionName ] = optionValue;

	await requestUtils.request.post( '/wp-admin/options.php', {
		form: formData,
		failOnStatusCode: true,
	} );
}

async function hasCollaborationRestNamespace( requestUtils: RequestUtils ) {
	try {
		const response = await requestUtils.request.get( '/wp-json/', {
			failOnStatusCode: false,
		} );
		const payload = await response.json().catch( () => null );
		return (
			response.ok() &&
			Array.isArray( payload?.namespaces ) &&
			payload.namespaces.includes( 'wp-sync/v1' )
		);
	} catch {
		return false;
	}
}

export async function ensureCollaborationEnabled(
	requestUtils: RequestUtils
): Promise< void > {
	const delays = [ 250, 500, 1000 ];

	for ( const delay of delays ) {
		if ( await hasCollaborationRestNamespace( requestUtils ) ) {
			return;
		}
		await setCollaboration( requestUtils, true );
		await new Promise( ( resolve ) => setTimeout( resolve, delay ) );
	}

	if ( await hasCollaborationRestNamespace( requestUtils ) ) {
		return;
	}

	throw new Error(
		'Timed out enabling real-time collaboration; /wp-json/ did not expose wp-sync/v1.'
	);
}
