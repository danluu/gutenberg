import type { Page } from '@playwright/test';
import {
	expect,
	test as base,
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

const HEADING_TEXT = 'Seed 954733 multibyte heading';
const EMOJI_PARAGRAPH =
	'Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.';
const OTHER_PARAGRAPH =
	'Another paragraph exists so the top-level list is not degenerate.';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	`<h2 class="wp-block-heading">${ HEADING_TEXT }</h2>`,
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	`<p>${ EMOJI_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ OTHER_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
].join( '\n' );

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
			username: `rtcc1c8base${ uniqueSuffix }`,
			email: `rtcc1c8base+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'BaseRecord',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await clearTransientUi( page, editor );
	const locator = editor.canvas.getByText( text, { exact: false } ).first();
	await expect( locator ).toBeVisible();
	await locator.click();
}

async function prepareMoveEmojiDown( editor: Editor, page: Page ) {
	await clickBlockByText( editor, page, EMOJI_PARAGRAPH );
	await editor.showBlockToolbar();
	const button = page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } );
	await expect( button ).toBeEnabled();
	return button;
}

async function insertHeadingBeforeHeading(
	editor: Editor,
	page: Page,
	headingText: string,
	delayNextMessageMs: number
) {
	await clickBlockByText( editor, page, HEADING_TEXT );
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	const addBefore = page.getByRole( 'menuitem', { name: 'Add before' } );
	if ( await addBefore.isVisible().catch( () => false ) ) {
		await addBefore.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert before' } ).click();
	}
	await page.evaluate( ( delayMs ) => {
		( window as any ).__gutenbergTestWebSocketSync?.delayNextMessage(
			delayMs
		);
	}, delayNextMessageMs );
	await page.keyboard.type( '/heading', { delay: 5 } );
	await expect( page.locator( '[role="listbox"]' ) ).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( headingText, { delay: 5 } );
	await expect(
		editor.canvas
			.locator( '[data-type="core/heading"]' )
			.filter( { hasText: headingText } )
	).toBeVisible();
}

function summarizeBlocks( state: any ): string[] {
	return ( state?.blocks ?? [] ).map( ( block: any ) => {
		if ( block?.name === 'core/heading' ) {
			return `heading:${ block?.attributes?.content ?? '' }`;
		}
		return `${ block?.name ?? 'unknown' }:${ block?.attributes?.content ?? '' }`;
	} );
}

test.describe( 'c1c8ee8f4449 base-record stale move', () => {
	test.describe.configure( { mode: 'serial' } );

	for ( const [ delayMs, clickOffsetMs ] of [
		[ 30, 35 ],
		[ 50, 55 ],
		[ 75, 80 ],
	] ) {
		test( `remote heading insert then prepared local move, delay ${ delayMs } offset ${ clickOffsetMs }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			await requestUtils.deleteAllPosts();
			const post = await requestUtils.createPost( {
				content: INITIAL_CONTENT,
				date_gmt: new Date().toISOString(),
				status: 'draft',
				title: `RTC c1c8 base-record ${ delayMs } ${ clickOffsetMs }`,
			} );

			await collaborationUtils.openPost( post.id );
			await expect(
				editor.canvas.getByText( EMOJI_PARAGRAPH, { exact: false } )
			).toBeVisible();
			const {
				editor: collaboratorEditor,
				page: collaboratorPage,
			} = await collaborationUtils.joinUser( post.id, collaboratorUser );
			await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );

			const moveDownButton = await prepareMoveEmojiDown( editor, page );
			const headingText = `RTC c1c8 inserted ${ delayMs } ${ clickOffsetMs }`;
			const insertPromise = insertHeadingBeforeHeading(
				collaboratorEditor,
				collaboratorPage,
				headingText,
				delayMs
			);

			await page.waitForTimeout( clickOffsetMs );
			await moveDownButton.click();
			await insertPromise;
			await collaborationUtils.waitForConvergence( { timeout: 20000 } );

			const states = await Promise.all( [
				collaborationUtils.getNormalizedPostState( page ),
				collaborationUtils.getNormalizedPostState(
					collaborationUtils.getPage( 0 )
				),
			] );
			const expected = [
				`heading:${ headingText }`,
				`heading:${ HEADING_TEXT }`,
				`core/paragraph:${ OTHER_PARAGRAPH }`,
				`core/paragraph:${ EMOJI_PARAGRAPH }`,
			];

			expect( states.map( summarizeBlocks ) ).toEqual( [
				expected,
				expected,
			] );
		} );
	}
} );
