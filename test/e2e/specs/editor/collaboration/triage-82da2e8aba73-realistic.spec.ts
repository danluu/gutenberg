import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import { expect, test as base } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type ResponseCounts = {
	failures: number;
	ok: number;
	total: number;
};

type OomResponse = {
	file: string | null;
	line: number | null;
	message: string | null;
	page: string;
	rawBody: string;
	status: number;
	url: string;
};

type ReproResult = {
	collaboratorLabels: string[];
	connectionLostVisible: boolean[];
	error?: string;
	oomResponses: OomResponse[];
	phase: string;
	postId: number;
	responseCounts: Record< string, ResponseCounts >;
};

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const INSERTED_MARKER = 'RTC 82da realistic probe';

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, requestUtils, page },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
		} );

		await setCollaboration( requestUtils, true );
		await use( utils );
		await utils.teardown();
	},
	collaboratorUser: async (
		{ collaborationUtils, requestUtils },
		use,
		testInfo
	) => {
		const uniqueSuffix = [
			process.pid.toString( 36 ),
			testInfo.workerIndex.toString( 36 ),
			Date.now().toString( 36 ),
		]
			.join( '' )
			.replaceAll( /[^a-z0-9]/gi, '' )
			.toLowerCase()
			.slice( -20 );
		const collaboratorUser = {
			username: `rtc82da${ uniqueSuffix }`,
			email: `rtc82da+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'OOM Probe',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

test.use( { trace: 'on' } );

function writeResult( result: ReproResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, 'realistic-playwright-result.json' ),
		JSON.stringify( result, null, 2 )
	);
}

function attachWpSyncCollector(
	page: Page,
	label: string,
	oomResponses: OomResponse[],
	responseCounts: Record< string, ResponseCounts >,
	pendingTasks: Promise< void >[]
) {
	responseCounts[ label ] = { failures: 0, ok: 0, total: 0 };

	page.on( 'response', ( response ) => {
		if ( ! response.url().includes( 'wp-sync' ) ) {
			return;
		}

		responseCounts[ label ].total += 1;
		if ( response.status() === 200 ) {
			responseCounts[ label ].ok += 1;
		} else {
			responseCounts[ label ].failures += 1;
		}

		if ( response.status() !== 500 ) {
			return;
		}

		pendingTasks.push(
			( async () => {
				const rawBody = await response.text().catch( () => '' );
				let parsedBody: {
					data?: {
						error?: {
							file?: string;
							line?: number;
							message?: string;
						};
					};
				} | null = null;

				try {
					parsedBody = JSON.parse( rawBody );
				} catch {}

				oomResponses.push( {
					file: parsedBody?.data?.error?.file ?? null,
					line: parsedBody?.data?.error?.line ?? null,
					message: parsedBody?.data?.error?.message ?? null,
					page: label,
					rawBody,
					status: response.status(),
					url: response.url(),
				} );
			} )()
		);
	} );
}

async function captureUiState(
	collaborationUtils: CollaborationUtilsClass
): Promise< Pick< ReproResult, 'collaboratorLabels' | 'connectionLostVisible' > > {
	const collaboratorLabels = await Promise.all(
		collaborationUtils.allPages.map( async ( currentPage ) => {
			return (
				( await currentPage
					.getByRole( 'button', { name: /Collaborators list/ } )
					.getAttribute( 'aria-label' )
					.catch( () => '' ) ) ?? ''
			);
		} )
	);

	const connectionLostVisible = await Promise.all(
		collaborationUtils.allPages.map( async ( currentPage ) => {
			return currentPage
				.getByRole( 'dialog', { name: 'Connection lost' } )
				.isVisible()
				.catch( () => false );
		} )
	);

	return {
		collaboratorLabels,
		connectionLostVisible,
	};
}

async function triggerNaturalEditorActivity(
	collaborationUtils: CollaborationUtilsClass
) {
	const primaryPage = collaborationUtils.allPages[ 0 ];
	const primaryEditor = collaborationUtils.allEditors[ 0 ];

	await primaryPage.bringToFront();
	await primaryEditor.canvas
		.getByRole( 'document', { name: 'Block: Paragraph' } )
		.last()
		.click();
	await primaryPage.keyboard.press( 'End' );
	await primaryPage.keyboard.press( 'Enter' );
	await primaryPage.keyboard.type(
		`${ INSERTED_MARKER } ${ Date.now().toString( 36 ) }`
	);
	await primaryEditor.saveDraft();

	await collaborationUtils.page2.reload( { waitUntil: 'domcontentloaded' } );
	await collaborationUtils.waitForEntityReadyAndSaveSettled(
		collaborationUtils.page2,
		{
			timeout: 30000,
		}
	);
}

async function waitForOomResponses(
	oomResponses: OomResponse[],
	timeout: number
) {
	try {
		await expect
			.poll( () => oomResponses.length, {
				timeout,
			} )
			.toBeGreaterThan( 0 );
		return true;
	} catch {
		return false;
	}
}

test( '82da2e8aba73 realistic shared-env OOM probe', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const post = await requestUtils.createPost( {
		title: `RTC 82da shared probe ${ Date.now().toString( 36 ) }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content:
			'<!-- wp:paragraph --><p>Initial probe paragraph.</p><!-- /wp:paragraph -->',
	} );

	const oomResponses: OomResponse[] = [];
	const responseCounts: Record< string, ResponseCounts > = {};
	const pendingTasks: Promise< void >[] = [];
	let phase = 'before-open';

	attachWpSyncCollector(
		page,
		'primary',
		oomResponses,
		responseCounts,
		pendingTasks
	);

	try {
		phase = 'open-post';
		await collaborationUtils.openPost( post.id );

		phase = 'join-collaborator';
		const { page: collaboratorPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);

		attachWpSyncCollector(
			collaboratorPage,
			'collaborator',
			oomResponses,
			responseCounts,
			pendingTasks
		);

		phase = 'initial-session';
		if ( !( await waitForOomResponses( oomResponses, 25000 ) ) ) {
			phase = 'edit-and-reload';
			await triggerNaturalEditorActivity( collaborationUtils );
			expect( await waitForOomResponses( oomResponses, 25000 ) ).toBe(
				true
			);
		}

		await Promise.allSettled( pendingTasks );
		const matchingResponses = oomResponses.filter(
			( response ) =>
				response.message?.includes( 'Allowed memory size' ) &&
				response.file?.includes( '/wp-includes/functions.php' ) &&
				response.line === 4399
		);

		const result: ReproResult = {
			...( await captureUiState( collaborationUtils ) ),
			oomResponses,
			phase,
			postId: post.id,
			responseCounts,
		};
		writeResult( result );

		expect( matchingResponses.length ).toBeGreaterThan( 0 );
	} catch ( error ) {
		await Promise.allSettled( pendingTasks );
		const result: ReproResult = {
			...( await captureUiState( collaborationUtils ) ),
			error:
				error instanceof Error ? error.stack ?? error.message : String( error ),
			oomResponses,
			phase,
			postId: post.id,
			responseCounts,
		};
		writeResult( result );
		throw error;
	}
} );
