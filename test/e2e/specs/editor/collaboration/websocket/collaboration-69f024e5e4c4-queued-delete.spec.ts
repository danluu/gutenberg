import fs from 'fs';
import path from 'path';

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

type Presence = {
	primaryHasCollaboratorText: boolean;
	primaryHasPrimaryText: boolean;
	secondaryHasCollaboratorText: boolean;
	secondaryHasPrimaryText: boolean;
};

type AttemptResult = {
	afterDeletePresence?: Presence;
	afterInsertPresence?: Presence;
	attempt: number;
	deleteConvergenceError: string | null;
	insertConvergenceError: string | null;
	postId: number;
	preconditionMet: boolean;
	primaryStateAfterDelete?: unknown;
	primaryStateAfterInsert?: unknown;
	readdedDeletedParagraph: boolean;
	secondaryStateAfterDelete?: unknown;
	secondaryStateAfterInsert?: unknown;
	statesEqualAfterDelete: boolean;
	statesEqualAfterInsert: boolean;
};

const OUTPUT_DIR = process.env.RTC_69F_QUEUED_DELETE_OUTPUT_DIR;
const ANCHOR_TEXT = 'Anchor paragraph for queued stale edit.';
const INITIAL_CONTENT = [
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">RTC 69f queued delete</h2>',
	'<!-- /wp:heading -->',
	'<!-- wp:paragraph -->',
	'<p>Intro paragraph to avoid a degenerate top-level block list.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ ANCHOR_TEXT }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph to keep a stable block after the edit area.</p>',
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
			username: `rtc69f${ uniqueSuffix }`,
			email: `rtc69f+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'QueuedDelete',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: AttemptResult ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, `attempt-${ result.attempt }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		includeCrdtDocument: true,
		timeout: 20000,
	} );
}

async function clearTransientUi( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas
		.getByRole( 'document' )
		.first()
		.press( 'Escape' )
		.catch( () => {} );
}

async function openBlockOptions( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
}

async function clickAnchorParagraph( page: Page, editor: Editor ) {
	await clearTransientUi( page, editor );
	const anchor = editor.canvas.getByText( ANCHOR_TEXT, { exact: true } );
	await expect( anchor ).toBeVisible();
	await anchor.click();
}

async function addAfterAnchorAndInsertText(
	page: Page,
	editor: Editor,
	text: string
) {
	await clickAnchorParagraph( page, editor );
	await openBlockOptions( page, editor );
	const addAfterItem = page.getByRole( 'menuitem', { name: 'Add after' } );
	if ( await addAfterItem.isVisible().catch( () => false ) ) {
		await addAfterItem.click();
	} else {
		await page.getByRole( 'menuitem', { name: 'Insert after' } ).click();
	}
	await page.keyboard.insertText( text );
}

async function selectBlockByText( page: Page, text: string ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	const clientId = await page.evaluate( ( expectedContent ) => {
		const findClientId = ( blocks: any[] ): string | null => {
			for ( const block of blocks ) {
				const serializedAttributes = JSON.stringify(
					block?.attributes ?? {}
				);
				if ( serializedAttributes.includes( expectedContent ) ) {
					return block.clientId;
				}
				const innerMatch = findClientId( block?.innerBlocks ?? [] );
				if ( innerMatch ) {
					return innerMatch;
				}
			}
			return null;
		};

		return findClientId(
			( window as any ).wp.data.select( 'core/block-editor' ).getBlocks()
		);
	}, text );

	if ( ! clientId ) {
		throw new Error( `Unable to find clientId for paragraph: ${ text }` );
	}

	const overviewButton = page.getByRole( 'button', {
		name: 'Document Overview',
	} );
	await overviewButton.click();
	const overview = page.getByRole( 'region', {
		name: 'Document Overview',
	} );
	await expect( overview ).toBeVisible();
	const blockLink = overview.locator( `a[href="#block-${ clientId }"]` );
	await expect( blockLink ).toBeVisible();
	await blockLink.click();
	await page.waitForFunction(
		( expectedClientId ) =>
			( window as any ).wp.data
				.select( 'core/block-editor' )
				.getSelectedBlockClientId() === expectedClientId,
		clientId,
		{ timeout: 5000 }
	);
	await overviewButton.click();
	await expect( overview ).toBeHidden();
}

async function deleteSelectedBlock( page: Page, editor: Editor ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await openBlockOptions( page, editor );
	await page
		.getByRole( 'menu', { name: 'Options' } )
		.last()
		.getByRole( 'menuitem', { name: 'Delete' } )
		.click();
}

async function typeQueuedAnchorEdit(
	page: Page,
	editor: Editor,
	text: string
) {
	await clickAnchorParagraph( page, editor );
	await page.keyboard.press( 'End' );
	await page.keyboard.type( text, { delay: 5 } );
}

async function capturePair(
	collaborationUtils: CollaborationUtilsClass,
	primaryPage: Page,
	secondaryPage: Page
) {
	const [ primaryState, secondaryState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState( primaryPage, {
			includeCrdtDocument: true,
		} ),
		collaborationUtils.getNormalizedPostState( secondaryPage, {
			includeCrdtDocument: true,
		} ),
	] );

	return {
		primaryState,
		primaryJson: JSON.stringify( primaryState ),
		secondaryState,
		secondaryJson: JSON.stringify( secondaryState ),
	};
}

function getPresence(
	primaryJson: string,
	secondaryJson: string,
	primaryText: string,
	collaboratorText: string
): Presence {
	return {
		primaryHasCollaboratorText: primaryJson.includes( collaboratorText ),
		primaryHasPrimaryText: primaryJson.includes( primaryText ),
		secondaryHasCollaboratorText:
			secondaryJson.includes( collaboratorText ),
		secondaryHasPrimaryText: secondaryJson.includes( primaryText ),
	};
}

function hasBothTextsEverywhere( presence: Presence ) {
	return (
		presence.primaryHasPrimaryText &&
		presence.primaryHasCollaboratorText &&
		presence.secondaryHasPrimaryText &&
		presence.secondaryHasCollaboratorText
	);
}

test.describe( 'RTC 69f queued stale edit after remote delete', () => {
	for ( const attempt of [ 0, 1, 2, 3, 4, 5 ] ) {
		test( `keeps collaborator delete while primary types attempt ${ attempt }`, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			test.setTimeout( 120000 );

			const post = await requestUtils.createPost( {
				title: `RTC 69f queued delete ${ attempt }`,
				content: INITIAL_CONTENT,
				status: 'draft',
			} );

			await collaborationUtils.openPost( post.id );
			const { editor: collaboratorEditor, page: collaboratorPage } =
				await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			const primaryText = `69f primary paragraph to delete ${ attempt }`;
			const collaboratorText = `69f collaborator paragraph to keep ${ attempt }`;

			await Promise.all( [
				addAfterAnchorAndInsertText( page, editor, primaryText ),
				addAfterAnchorAndInsertText(
					collaboratorPage,
					collaboratorEditor,
					collaboratorText
				),
			] );

			let insertConvergenceError: string | null = null;
			try {
				await collaborationUtils.waitForConvergence( {
					includeCrdtDocument: true,
					timeout: 20000,
				} );
			} catch ( error ) {
				insertConvergenceError =
					error instanceof Error ? error.message : String( error );
			}

			const afterInsert = await capturePair(
				collaborationUtils,
				page,
				collaboratorPage
			);
			const statesEqualAfterInsert =
				afterInsert.primaryJson === afterInsert.secondaryJson;
			const afterInsertPresence = getPresence(
				afterInsert.primaryJson,
				afterInsert.secondaryJson,
				primaryText,
				collaboratorText
			);
			const preconditionMet =
				insertConvergenceError === null &&
				statesEqualAfterInsert &&
				hasBothTextsEverywhere( afterInsertPresence );

			let afterDelete = afterInsert;
			let afterDeletePresence = afterInsertPresence;
			let statesEqualAfterDelete = statesEqualAfterInsert;
			let deleteConvergenceError: string | null = null;
			let readdedDeletedParagraph = false;

			if ( preconditionMet ) {
				await selectBlockByText( collaboratorPage, primaryText );

				await Promise.all( [
					typeQueuedAnchorEdit(
						page,
						editor,
						` primary edit racing delete ${ attempt }`
					),
					deleteSelectedBlock( collaboratorPage, collaboratorEditor ),
				] );

				try {
					await collaborationUtils.waitForConvergence( {
						includeCrdtDocument: true,
						timeout: 20000,
					} );
				} catch ( error ) {
					deleteConvergenceError =
						error instanceof Error
							? error.message
							: String( error );
				}

				afterDelete = await capturePair(
					collaborationUtils,
					page,
					collaboratorPage
				);
				statesEqualAfterDelete =
					afterDelete.primaryJson === afterDelete.secondaryJson;
				afterDeletePresence = getPresence(
					afterDelete.primaryJson,
					afterDelete.secondaryJson,
					primaryText,
					collaboratorText
				);
				readdedDeletedParagraph =
					afterDeletePresence.primaryHasPrimaryText ||
					afterDeletePresence.secondaryHasPrimaryText;
			}

			writeResult( {
				afterDeletePresence,
				afterInsertPresence,
				attempt,
				deleteConvergenceError,
				insertConvergenceError,
				postId: post.id,
				preconditionMet,
				primaryStateAfterDelete: afterDelete.primaryState,
				primaryStateAfterInsert: afterInsert.primaryState,
				readdedDeletedParagraph,
				secondaryStateAfterDelete: afterDelete.secondaryState,
				secondaryStateAfterInsert: afterInsert.secondaryState,
				statesEqualAfterDelete,
				statesEqualAfterInsert,
			} );

			if ( ! preconditionMet ) {
				return;
			}

			expect( deleteConvergenceError ).toBeNull();
			expect( statesEqualAfterDelete ).toBe( true );
			expect( readdedDeletedParagraph ).toBe( false );
			expect( afterDeletePresence.primaryHasCollaboratorText ).toBe(
				true
			);
			expect( afterDeletePresence.secondaryHasCollaboratorText ).toBe(
				true
			);
		} );
	}
} );
