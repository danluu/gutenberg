import fs from 'fs';
import path from 'path';

import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type AttemptResult = {
	attempt: number;
	collaboratorState: unknown;
	error?: string;
	finalPersistedContent: string;
	postId: number;
	primaryState: unknown;
	reproduced: boolean;
};

const test = base.extend< Fixtures >( {
	collaborationUtils: async (
		{ admin, editor, page, requestUtils },
		use
	) => {
		const utils = new CollaborationUtilsClass( {
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			page,
			requestUtils,
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
			username: `rtc1b8${ uniqueSuffix }`,
			email: `rtc1b8+${ uniqueSuffix }@example.com`,
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

const OUTPUT_DIR = process.env.RTC_1B8_OUTPUT_DIR;
const MAX_ATTEMPTS = Number.parseInt(
	process.env.RTC_1B8_MAX_ATTEMPTS ?? '2',
	10
);
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

function writeResult( attemptResult: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}
	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join(
			OUTPUT_DIR,
			`move-reload-concurrent-edit-attempt-${ attemptResult.attempt }.json`
		),
		JSON.stringify( attemptResult, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass,
	timeout = 20000
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout } );
	await collaborationUtils.waitForConvergence( { timeout } );
}

async function appendParagraphFromLastBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/paragraph', { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function insertHeadingFromLastBlock(
	editor: Editor,
	page: Page,
	text: string
) {
	const lastDocument = editor.canvas.getByRole( 'document' ).last();
	await expect( lastDocument ).toBeVisible();
	await lastDocument.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/heading', { delay: 20 } );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( text, { delay: 20 } );
	await expect(
		editor.canvas.getByText( text, { exact: false } )
	).toBeVisible();
}

async function moveBlockUp(
	editor: Editor,
	page: Page,
	blockText: string,
	times = 1
) {
	const block = editor.canvas.getByText( blockText, { exact: false } ).first();
	await expect( block ).toBeVisible();
	await block.click();
	for ( let index = 0; index < times; index++ ) {
		await page.keyboard.press( 'Alt+Shift+ArrowUp' );
	}
}

async function replaceParagraphText(
	editor: Editor,
	page: Page,
	existingText: string,
	nextText: string
) {
	const paragraph = editor.canvas
		.getByText( existingText, { exact: false } )
		.first();
	await expect( paragraph ).toBeVisible();
	await paragraph.click();
	await page.keyboard.press( `${ MODIFIER_KEY }+A` );
	await page.keyboard.type( nextText, { delay: 20 } );
	await expect(
		editor.canvas.getByText( nextText, { exact: false } )
	).toBeVisible();
}

async function fetchPersistedContent(
	requestUtils: {
		rest: < T >( input: Record< string, unknown > ) => Promise< T >;
	},
	postId: number
) {
	const response = await requestUtils.rest< {
		content: {
			raw: string;
		};
	} >( {
		path: `/wp/v2/posts/${ postId }`,
		params: {
			context: 'edit',
			_fields: 'content.raw',
		},
	} );
	return response.content.raw;
}

test( 'reload-following paragraph edit propagates after real structural edits', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 180000 );

	for ( let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++ ) {
		const prefix = `${ Date.now().toString( 36 ) }-${ attempt }`;
		const collaboratorInserted = `realistic collaborator inserted ${ prefix }`;
		const collaboratorConcurrent = `realistic collaborator concurrent ${ prefix }`;
		const primaryConcurrent = `realistic primary concurrent ${ prefix }`;
		const updatedPrimaryConcurrent = `realistic primary updated ${ prefix }`;
		const lateHeading = `realistic late heading ${ prefix }`;

		const post = await requestUtils.createPost( {
			title: `Realistic 1b8 ${ prefix }`,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content: INITIAL_CONTENT,
		} );

		await collaborationUtils.openPost( post.id );
		const {
			editor: collaboratorEditor,
			page: collaboratorPage,
		} = await collaborationUtils.joinUser( post.id, collaboratorUser );
		await waitForSessionReady( collaborationUtils );

		await moveBlockUp(
			collaboratorEditor,
			collaboratorPage,
			'Tail paragraph kept for save and reload stability checks.'
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await appendParagraphFromLastBlock(
			collaboratorEditor,
			collaboratorPage,
			collaboratorInserted
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await appendParagraphFromLastBlock(
			editor,
			page,
			primaryConcurrent
		);
		await appendParagraphFromLastBlock(
			collaboratorEditor,
			collaboratorPage,
			collaboratorConcurrent
		);
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await insertHeadingFromLastBlock( editor, page, lateHeading );
		await collaborationUtils.waitForConvergence( { timeout: 20000 } );

		await page.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled( page, {
			timeout: 20000,
		} );
		await waitForSessionReady( collaborationUtils );

		await replaceParagraphText(
			editor,
			page,
			primaryConcurrent,
			updatedPrimaryConcurrent
		);

		let error: string | undefined;
		try {
			await collaborationUtils.waitForConvergence( { timeout: 15000 } );
		} catch ( caught ) {
			error = caught instanceof Error ? caught.message : String( caught );
		}

		const [ primaryState, collaboratorState ] = await Promise.all( [
			collaborationUtils.getNormalizedPostState( page ),
			collaborationUtils.getNormalizedPostState( collaboratorPage ),
		] );
		const finalPersistedContent = await fetchPersistedContent(
			requestUtils,
			post.id
		);

		const primaryText = JSON.stringify( primaryState );
		const collaboratorText = JSON.stringify( collaboratorState );
		const reproduced =
			primaryText.includes( updatedPrimaryConcurrent ) &&
			collaboratorText.includes( primaryConcurrent ) &&
			! collaboratorText.includes( updatedPrimaryConcurrent ) &&
			finalPersistedContent.includes( updatedPrimaryConcurrent );

		const attemptResult = {
			attempt,
			collaboratorState,
			error,
			finalPersistedContent,
			postId: post.id,
			primaryState,
			reproduced,
		};
		writeResult( attemptResult );

		if ( reproduced ) {
			expect( reproduced ).toBe( true );
			return;
		}
	}
} );
