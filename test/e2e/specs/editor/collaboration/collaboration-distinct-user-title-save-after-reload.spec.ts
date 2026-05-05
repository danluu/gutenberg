/**
 * External dependencies
 */
import type { Page } from '@playwright/test';

/**
 * WordPress dependencies
 */
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';

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

type RestPost = {
	content: {
		raw: string;
	};
	title:
		| string
		| {
				raw?: string;
				rendered?: string;
		  };
};

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
			username: `rtctitle${ uniqueSuffix }`,
			email: `rtctitle+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Title',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

async function getEditedTitle( page: Page ): Promise< string > {
	return page.evaluate( () =>
		( window as any ).wp.data
			.select( 'core/editor' )
			.getEditedPostAttribute( 'title' )
	);
}

async function getPersistedPost(
	requestUtils: {
		rest: < T >( options: { path: string } ) => Promise< T >;
	},
	postId: number
): Promise< RestPost > {
	return requestUtils.rest< RestPost >( {
		path: `/wp/v2/posts/${ postId }?context=edit`,
	} );
}

function getRawTitle( post: RestPost ): string {
	return typeof post.title === 'string'
		? post.title
		: post.title.raw ?? post.title.rendered ?? '';
}

test.describe( 'Collaboration - distinct user title reload persistence', () => {
	test( 'saves the synced title after a collaborator reloads', async ( {
		collaborationUtils,
		collaboratorUser,
		editor,
		page,
		requestUtils,
	} ) => {
		test.setTimeout( 150_000 );

		const scenarioId = Date.now().toString( 36 );
		const initialTitle = `RTC distinct title initial ${ scenarioId }`;
		const expectedTitle = `RTC distinct title updated ${ scenarioId }`;
		const bodyMarker = `RTC distinct title body ${ scenarioId }`;

		const post = await requestUtils.createPost( {
			title: initialTitle,
			status: 'draft',
			date_gmt: new Date().toISOString(),
			content:
				'<!-- wp:paragraph --><p>Initial body paragraph.</p><!-- /wp:paragraph -->',
		} );

		await collaborationUtils.openPost( post.id );
		const { editor: collaboratorEditor, page: collaboratorPage } =
			await collaborationUtils.joinUser( post.id, collaboratorUser );
		await collaborationUtils.waitForMutualDiscovery( { timeout: 30_000 } );
		await collaborationUtils.waitForConvergence( {
			timeout: 30_000,
			includeCrdtDocument: true,
		} );

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( expectedTitle );
		await expect
			.poll( () => getEditedTitle( collaboratorPage ), {
				timeout: 30_000,
			} )
			.toBe( expectedTitle );

		await collaboratorEditor.canvas
			.getByRole( 'document', { name: 'Block: Paragraph' } )
			.first()
			.click();
		await collaboratorPage.keyboard.press( 'End' );
		await collaboratorPage.keyboard.press( 'Enter' );
		await collaboratorPage.keyboard.type( bodyMarker );
		await expect( editor.canvas.getByText( bodyMarker ) ).toBeVisible( {
			timeout: 30_000,
		} );
		await collaborationUtils.waitForConvergence( {
			timeout: 30_000,
			includeCrdtDocument: true,
		} );

		await collaboratorPage.reload( { waitUntil: 'domcontentloaded' } );
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 30_000,
			}
		);
		await collaborationUtils.waitForMutualDiscovery( { timeout: 30_000 } );
		const state = await collaborationUtils.waitForConvergence( {
			timeout: 30_000,
		} );

		expect( state.title ).toBe( expectedTitle );
		await expect
			.poll( () => getEditedTitle( page ), { timeout: 20_000 } )
			.toBe( expectedTitle );
		await expect
			.poll( () => getEditedTitle( collaboratorPage ), {
				timeout: 20_000,
			} )
			.toBe( expectedTitle );

		await collaboratorEditor.saveDraft();
		await collaborationUtils.waitForEntityReadyAndSaveSettled(
			collaboratorPage,
			{
				timeout: 30_000,
			}
		);

		const persistedPost = await getPersistedPost( requestUtils, post.id );
		expect( getRawTitle( persistedPost ) ).toBe( expectedTitle );
		expect( persistedPost.content.raw ).toContain( bodyMarker );
	} );
} );
