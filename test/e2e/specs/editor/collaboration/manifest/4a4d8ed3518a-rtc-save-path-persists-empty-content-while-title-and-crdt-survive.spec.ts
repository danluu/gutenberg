import fs from 'fs';
import path from 'path';

import type { Page } from '@playwright/test';
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type PersistedPost = {
	content: {
		raw: string;
	};
	meta?: {
		_crdt_document?: string | null;
	};
	title: {
		raw: string;
	};
};

type Snapshot = {
	label: string;
	persistedContentLength: number;
	persistedHasCrdt: boolean;
	persistedTitle: string;
	primaryBlockCount: number;
	secondaryBlockCount: number;
};

type ProbeResult = {
	error?: string;
	postId?: number;
	reproduced: boolean;
	reproducedAt?: string;
	snapshots: Snapshot[];
};

const OUTPUT_PATH = process.env.RTC_08C123_OUTPUT_PATH;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Seed 953317 multibyte heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Another paragraph exists so the top-level list is not degenerate.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

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
			username: `rtc08c123${ uniqueSuffix }`,
			email: `rtc08c123+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: ProbeResult ) {
	if ( ! OUTPUT_PATH ) {
		return;
	}

	fs.mkdirSync( path.dirname( OUTPUT_PATH ), { recursive: true } );
	fs.writeFileSync( OUTPUT_PATH, JSON.stringify( result, null, 2 ) );
}

async function waitForSessionReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function getPersistedPost(
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number
): Promise< PersistedPost > {
	return requestUtils.rest< PersistedPost >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'title.raw,content.raw,meta._crdt_document',
		},
	} );
}

async function captureSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	label: string
): Promise< Snapshot > {
	const [ primaryState, secondaryState, persisted ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState( collaborationUtils.getPage( 0 ) ),
		getPersistedPost( requestUtils, postId ),
	] );

	return {
		label,
		persistedContentLength: persisted.content.raw.length,
		persistedHasCrdt: Boolean( persisted.meta?._crdt_document ),
		persistedTitle: persisted.title.raw,
		primaryBlockCount: primaryState.blocks.length,
		secondaryBlockCount: secondaryState.blocks.length,
	};
}

async function typeTitle( editor: Editor, page: Page, title: string ) {
	const titleBox = editor.canvas.getByRole( 'textbox', {
		name: 'Add title',
	} );
	await expect( titleBox ).toBeVisible();
	await titleBox.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.press( 'Backspace' );
	await page.keyboard.type( title, { delay: 15 } );
	await expect( titleBox ).toContainText( title );
}

async function saveWithShortcut( page: Page ) {
	await page.keyboard.press( `${ MODIFIER_KEY }+s` );
	await page.waitForFunction(
		() =>
			! ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
		undefined,
		{ timeout: 20000 }
	);
}

async function appendParagraphAtEnd(
	editor: Editor,
	page: Page,
	text: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 10 } );
}

async function pollForEmptyPersistedContent(
	collaborationUtils: CollaborationUtilsClass,
	requestUtils: {
		rest: < T >( options: {
			path: string;
			params?: Record< string, string >;
		} ) => Promise< T >;
	},
	postId: number,
	roundLabel: string,
	result: ProbeResult
) {
	for ( let attempt = 0; attempt < 20; attempt++ ) {
		const snapshot = await captureSnapshot(
			collaborationUtils,
			requestUtils,
			postId,
			`${ roundLabel }-poll-${ attempt }`
		);
		result.snapshots.push( snapshot );

		if (
			snapshot.persistedContentLength === 0 &&
			snapshot.persistedHasCrdt &&
			snapshot.persistedTitle.length > 0
		) {
			result.reproduced = true;
			result.reproducedAt = snapshot.label;
			return;
		}

		await new Promise( ( resolve ) => setTimeout( resolve, 250 ) );
	}
}

test( 'probes the empty-content save family with real editor actions', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	const probe: ProbeResult = {
		reproduced: false,
		snapshots: [],
	};

	try {
		const prefix = Date.now().toString( 36 );
		const post = await requestUtils.createPost( {
			title: `RTC 08c123 initial ${ prefix }`,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: INITIAL_CONTENT,
		} );
		probe.postId = post.id;

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		probe.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-open'
			)
		);

		const checkpointParagraph = `checkpoint paragraph ${ prefix }`;
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			checkpointParagraph
		);
		await appendParagraphAtEnd(
			collaboratorEditor,
			collaboratorPage,
			`checkpoint companion ${ prefix }`
		);
		await typeTitle(
			collaboratorEditor,
			collaboratorPage,
			`RTC 08c123 checkpoint ${ prefix }`
		);
		await saveWithShortcut( collaboratorPage );
		await waitForSessionReady( collaborationUtils );
		probe.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-checkpoint-save'
			)
		);

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );
		probe.snapshots.push(
			await captureSnapshot(
				collaborationUtils,
				requestUtils,
				post.id,
				'after-primary-reload'
			)
		);

		for ( let round = 0; round < 3 && ! probe.reproduced; round++ ) {
			await appendParagraphAtEnd(
				editor,
				page,
				`primary paragraph ${ prefix } ${ round }`
			);
			await appendParagraphAtEnd(
				collaboratorEditor,
				collaboratorPage,
				`collaborator paragraph ${ prefix } ${ round }`
			);
			await waitForSessionReady( collaborationUtils );
			probe.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					`round-${ round }-after-concurrent-paragraphs`
				)
			);

			await typeTitle(
				collaboratorEditor,
				collaboratorPage,
				`RTC 08c123 title ${ prefix } ${ round }`
			);
			await saveWithShortcut( collaboratorPage );
			await waitForSessionReady( collaborationUtils );
			probe.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					`round-${ round }-after-collaborator-save`
				)
			);

			await saveWithShortcut( page );
			await waitForSessionReady( collaborationUtils );
			probe.snapshots.push(
				await captureSnapshot(
					collaborationUtils,
					requestUtils,
					post.id,
					`round-${ round }-after-primary-save`
				)
			);

			await pollForEmptyPersistedContent(
				collaborationUtils,
				requestUtils,
				post.id,
				`round-${ round }`,
				probe
			);
		}
	} catch ( error ) {
		probe.error = error instanceof Error ? error.stack ?? error.message : String( error );
		throw error;
	} finally {
		writeResult( probe );
	}
} );
