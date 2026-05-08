/**
 * External dependencies
 */
import type { BrowserContext, Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { Editor } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';
import {
	SECOND_USER,
	type UserCredentials,
} from './fixtures/collaboration-utils';

const BASE_URL = process.env.WP_BASE_URL || 'http://localhost:8889';
const RESPONSE_BUDGET_BYTES = 8 * 1024 * 1024;
const HISTORY_EDIT_COUNT = 24;
const REVISION_TEXT_BYTES = 384 * 1024;
const FINAL_MARKER = 'catch-up final marker';

const THIRD_USER: UserCredentials = {
	username: 'catchup_editor',
	email: 'catchup_editor@example.com',
	firstName: 'Catchup',
	lastName: 'Editor',
	password: 'password',
	roles: [ 'editor' ],
};

function revisionText( index: number ): string {
	const prefix = `catch-up revision ${ index } `;
	return prefix + 'x'.repeat( REVISION_TEXT_BYTES - prefix.length );
}

async function clearCurrentParagraph(
	editor: Editor,
	page: Page
): Promise< void > {
	await editor.canvas
		.getByRole( 'document', { name: /Block: Paragraph/ } )
		.last()
		.click();
	await page.keyboard.press( 'ControlOrMeta+A' );
	await page.keyboard.press( 'Backspace' );
}

test.describe( 'Collaboration - response budget', () => {
	test( 'opens a late user through bounded natural edit history responses', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 180_000 );
		test.slow();

		await requestUtils.createUser( THIRD_USER );

		const post = await requestUtils.createPost( {
			title: 'RTC response budget',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );
		const postRoom = `postType/post:${ post.id }`;

		await collaborationUtils.openPost( post.id );
		await collaborationUtils.joinUser( post.id, SECOND_USER );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 20_000 } );

		await editor.canvas
			.getByRole( 'button', { name: 'Add default block' } )
			.click();

		for ( let i = 0; i < HISTORY_EDIT_COUNT; i++ ) {
			await page.keyboard.insertText( revisionText( i ) );
			await collaborationUtils.waitForSyncCycle( page, 1, {
				timeout: 15_000,
			} );
			await clearCurrentParagraph( editor, page );
			await collaborationUtils.waitForSyncCycle( page, 1, {
				timeout: 15_000,
			} );
		}

		await page.keyboard.insertText( FINAL_MARKER );
		await collaborationUtils.waitForSyncCycle( page, 2, {
			timeout: 15_000,
		} );

		let thirdContext: BrowserContext | undefined;
		try {
			thirdContext = await page.context().browser()!.newContext( {
				baseURL: BASE_URL,
			} );
			const page3 = await thirdContext.newPage();
			const catchupResponses: Array< {
				bytes: number;
				updates: number;
			} > = [];

			page3.on( 'response', ( response ) => {
				if (
					! response.url().includes( 'wp-sync' ) ||
					response.status() !== 200
				) {
					return;
				}

				void response
					.text()
					.then( ( body ) => {
						const data = JSON.parse( body );
						const room = data.rooms?.find(
							( item: { room: string } ) => item.room === postRoom
						);
						if ( room ) {
							catchupResponses.push( {
								bytes: body.length,
								updates: room.updates.length,
							} );
						}
					} )
					.catch( () => {} );
			} );

			await page3.goto( '/wp-login.php' );
			await page3.locator( '#user_login' ).fill( THIRD_USER.username );
			await page3.locator( '#user_pass' ).fill( THIRD_USER.password );
			await page3.getByRole( 'button', { name: 'Log In' } ).click();
			await page3.waitForURL( '**/wp-admin/**' );

			await page3.goto(
				`/wp-admin/post.php?post=${ post.id }&action=edit`
			);
			await page3.waitForFunction(
				() => window?.wp?.data && window?.wp?.blocks
			);
			await page3.evaluate( () => {
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'welcomeGuide', false );
				window.wp.data
					.dispatch( 'core/preferences' )
					.set( 'core/edit-post', 'fullscreenMode', false );
			} );
			await collaborationUtils.waitForCollaborationReady( page3, {
				timeout: 30_000,
			} );

			await expect
				.poll( () => catchupResponses.length, { timeout: 10_000 } )
				.toBeGreaterThan( 0 );

			expect(
				Math.max( ...catchupResponses.map( ( item ) => item.bytes ) )
			).toBeLessThanOrEqual( RESPONSE_BUDGET_BYTES );
			expect(
				catchupResponses.reduce(
					( sum, item ) => sum + item.updates,
					0
				)
			).toBeGreaterThan( 0 );
		} finally {
			await thirdContext?.close();
		}
	} );
} );
