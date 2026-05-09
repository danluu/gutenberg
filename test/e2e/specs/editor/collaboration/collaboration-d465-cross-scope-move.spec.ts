/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import {
	test as base,
	expect,
	type Editor,
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type NormalizedBlock = {
	attributes?: Record< string, unknown >;
	innerBlocks?: NormalizedBlock[];
	name: string;
};

type NormalizedState = {
	blocks: NormalizedBlock[];
	title: string;
};

const MOVED_PARAGRAPH = 'Seed d465 paragraph to move into group.';
const TAIL_PARAGRAPH = 'Seed d465 collaborator tail paragraph.';
const TAIL_EDIT = ' edited while stale';

const BASE_CONTENT = [
	'<!-- wp:paragraph -->',
	`<p>${ MOVED_PARAGRAPH }</p>`,
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	`<p>${ TAIL_PARAGRAPH }</p>`,
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
		await setCollaboration( requestUtils, false );
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
			.toLowerCase()
			.slice( -16 );
		const collaboratorUser = {
			username: `rtcd465${ uniqueSuffix }`,
			email: `rtcd465+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'D465',
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
	await page.bringToFront();
	await clearTransientUi( page, editor );
	const target = editor.canvas.getByText( text, { exact: true } ).first();
	await expect( target ).toBeVisible();
	await target.click();
}

function countMovedParagraphs( state: NormalizedState ) {
	const visit = ( blocks: NormalizedBlock[] ): number =>
		blocks.reduce( ( count, block ) => {
			const ownCount =
				block.attributes?.content === MOVED_PARAGRAPH ? 1 : 0;
			return count + ownCount + visit( block.innerBlocks ?? [] );
		}, 0 );

	return visit( state.blocks );
}

function hasTopLevelMovedParagraph( state: NormalizedState ) {
	return state.blocks.some(
		( block ) =>
			block.name === 'core/paragraph' &&
			block.attributes?.content === MOVED_PARAGRAPH
	);
}

function hasNestedMovedParagraph( state: NormalizedState ) {
	return state.blocks.some(
		( block ) =>
			block.name === 'core/group' &&
			( block.innerBlocks ?? [] ).some(
				( inner ) =>
					inner.name === 'core/paragraph' &&
					inner.attributes?.content === MOVED_PARAGRAPH
			)
	);
}

async function groupParagraph(
	page: Page,
	editor: Editor,
	paragraphText: string
) {
	await clickBlockByText( editor, page, paragraphText );
	await editor.clickBlockOptionsMenuItem( 'Group' );

	await expect.poll( editor.getBlocks ).toMatchObject( [
		{
			name: 'core/group',
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: MOVED_PARAGRAPH },
				},
			],
		},
		{
			name: 'core/paragraph',
			attributes: { content: TAIL_PARAGRAPH },
		},
	] );
}

test( 'stale collaborator edit does not duplicate a paragraph grouped into a Group', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const post = await requestUtils.createPost( {
		title: 'RTC d465 cross-scope move',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: BASE_CONTENT,
	} );

	await collaborationUtils.openPost( post.id );
	const { page: collaboratorPage, editor: collaboratorEditor } =
		await collaborationUtils.joinUser( post.id, collaboratorUser );
	await collaborationUtils.waitForMutualDiscovery( { timeout: 30000 } );
	await collaborationUtils.waitForConvergence( { timeout: 30000 } );

	await collaboratorPage.context().setOffline( true );

	await groupParagraph( page, editor, MOVED_PARAGRAPH );
	await collaborationUtils.waitForSyncCycle( page, 1, { timeout: 30000 } );

	await clickBlockByText(
		collaboratorEditor,
		collaboratorPage,
		TAIL_PARAGRAPH
	);
	await collaboratorPage.keyboard.press( 'End' );
	await collaboratorPage.keyboard.type( TAIL_EDIT, { delay: 20 } );
	await collaboratorPage.waitForTimeout( 500 );

	await collaboratorPage.context().setOffline( false );
	await collaborationUtils.waitForConvergence( { timeout: 45000 } );

	const states = await Promise.all(
		collaborationUtils.allPages.map( ( activePage ) =>
			collaborationUtils.getNormalizedPostState( activePage )
		)
	);

	for ( const state of states ) {
		expect( countMovedParagraphs( state ) ).toBe( 1 );
		expect( hasTopLevelMovedParagraph( state ) ).toBe( false );
		expect( hasNestedMovedParagraph( state ) ).toBe( true );
		expect( JSON.stringify( state.blocks ) ).toContain( TAIL_EDIT );
	}
} );
