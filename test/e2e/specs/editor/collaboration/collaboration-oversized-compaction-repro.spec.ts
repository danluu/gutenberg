/**
 * External dependencies
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const IS_MAC = process.platform === 'darwin';
const PASTE_SHORTCUT = IS_MAC ? 'Meta+V' : 'Control+V';
const PARAGRAPH_COUNT = 62;
const PARAGRAPH_CHARS = 20000;
const LOG_PATH =
	process.env.GUTENBERG_RTC_OVERSIZED_COMPACTION_LOG ||
	'.context/rtc-issue-05-oversized-compaction-browser-log.json';

test.use( { video: 'on' } );

type SyncRequestLog = {
	label: string;
	maxUpdateDataLength: number;
	compactionUpdateDataLengths: number[];
	status?: number;
};

function paragraphPayload( index: number ): string {
	return `RTC oversized compaction paragraph ${ index }. ${ 'x'.repeat(
		PARAGRAPH_CHARS
	) }`;
}

async function pasteParagraph(
	page: import('@playwright/test').Page,
	text: string
) {
	await page.evaluate( async ( value ) => {
		await navigator.clipboard.writeText( value );
	}, text );
	await page.keyboard.press( PASTE_SHORTCUT );
	await page.keyboard.press( 'Enter' );
}

function watchSyncTraffic(
	page: import('@playwright/test').Page,
	label: string,
	syncTraffic: SyncRequestLog[]
) {
	page.on( 'request', ( request ) => {
		if ( ! request.url().includes( 'wp-sync' ) ) {
			return;
		}

		const postData = request.postData();
		if ( ! postData ) {
			return;
		}

		try {
			const payload = JSON.parse( postData );
			const updates = payload.rooms.flatMap(
				( room: {
					updates: Array< { data: string; type: string } >;
				} ) => room.updates
			);
			syncTraffic.push( {
				label,
				maxUpdateDataLength: Math.max(
					0,
					...updates.map(
						( update: { data: string } ) => update.data.length
					)
				),
				compactionUpdateDataLengths: updates
					.filter(
						( update: { type: string } ) =>
							update.type === 'compaction'
					)
					.map( ( update: { data: string } ) => update.data.length ),
			} );
		} catch {
			// Some requests may not be JSON. They are not relevant here.
		}
	} );

	page.on( 'response', ( response ) => {
		if ( ! response.url().includes( 'wp-sync' ) ) {
			return;
		}

		syncTraffic.push( {
			label,
			maxUpdateDataLength: 0,
			compactionUpdateDataLengths: [],
			status: response.status(),
		} );
	} );
}

async function waitForConnectionLost(
	page: import('@playwright/test').Page,
	label: string
) {
	await page
		.getByRole( 'dialog', { name: 'Connection lost' } )
		.waitFor( { timeout: 90000 } );
	return label;
}

test.describe( 'Collaboration - Oversized Compaction Repro', () => {
	test( 'realistic paragraph edits can trigger an oversized compaction 400', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	}, testInfo ) => {
		test.slow();

		const syncTraffic: SyncRequestLog[] = [];
		watchSyncTraffic( page, 'A', syncTraffic );

		await page
			.context()
			.grantPermissions( [ 'clipboard-read', 'clipboard-write' ], {
				origin: BASE_URL,
			} );

		const post = await requestUtils.createPost( {
			title: 'Oversized Compaction Repro',
			content:
				'<!-- wp:paragraph --><p>Initial collaborative paragraph.</p><!-- /wp:paragraph -->',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openCollaborativeSession( post.id );
		const page2 = collaborationUtils.page2;
		watchSyncTraffic( page2, 'B', syncTraffic );

		await page.bringToFront();
		await editor.canvas
			.getByText( 'Initial collaborative paragraph.' )
			.click();
		await page.keyboard.press( 'End' );

		for ( let index = 0; index < PARAGRAPH_COUNT; index++ ) {
			await pasteParagraph( page, paragraphPayload( index ) );
		}

		const modalPage = await Promise.race( [
			waitForConnectionLost( page, 'A' ),
			waitForConnectionLost( page2, 'B' ),
		] );

		const compactionLengths = syncTraffic.flatMap(
			( entry ) => entry.compactionUpdateDataLengths
		);
		const statuses = syncTraffic
			.map( ( entry ) => entry.status )
			.filter( ( status ): status is number => status !== undefined );

		mkdirSync( dirname( LOG_PATH ), { recursive: true } );
		writeFileSync(
			LOG_PATH,
			JSON.stringify(
				{
					modalPage,
					maxCompactionUpdateDataLength: Math.max(
						0,
						...compactionLengths
					),
					statuses,
					syncTraffic,
				},
				null,
				2
			)
		);
		await testInfo.attach( 'sync-traffic', { path: LOG_PATH } );

		expect(
			compactionLengths.some( ( length ) => length > 1024 * 1024 )
		).toBe( true );
		expect( statuses ).toContain( 400 );
	} );
} );
