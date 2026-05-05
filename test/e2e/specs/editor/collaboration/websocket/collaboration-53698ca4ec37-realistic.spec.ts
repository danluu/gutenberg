import fs from 'fs';
import path from 'path';

import { test as base, expect, type Page } from '@wordpress/e2e-test-utils-playwright';
import type { Editor } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type Snapshot = {
	relativeOrder: string[];
	title: string;
};

type Result = {
	afterMoveActor: Snapshot;
	afterMovePeer: Snapshot;
	error?: string;
	postId?: number;
	reproduced: boolean;
};

const OUTPUT_DIR = process.env.RTC_TRIAGE_OUTPUT_DIR;
const MODIFIER_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

const PREMOVE_CONTENT = `
<!-- wp:heading {"level":2} -->
<h2>Seed 954433 multibyte heading</h2>
<!-- /wp:heading -->
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph -->
<p>Seed 954433 step 1 user 1 nested paragraph</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":3} -->
<h3>Seed 954433 step 1 user 1 nested heading</h3>
<!-- /wp:heading -->
</div>
<!-- /wp:group -->
<!-- wp:heading {"level":2} -->
<h2>Seed 954433 step 4 user 0 heading</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Another paragraph exists so the top-level list is not degenerate.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p><em>italic</em>beta 954433 0</p>
<!-- /wp:paragraph -->
<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite>a<strong>it</strong></cite></blockquote></figure>
<!-- /wp:pullquote -->
`.trim();

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
			username: `rtc53698ui${ uniqueSuffix }`,
			email: `rtc53698ui+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Triage UI',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );
		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( fileName: string, result: Result ) {
	if ( ! OUTPUT_DIR ) {
		return;
	}

	fs.mkdirSync( OUTPUT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( OUTPUT_DIR, fileName ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForReady( collaborationUtils: CollaborationUtilsClass ) {
	await collaborationUtils.waitForMutualDiscovery( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( { timeout: 20000 } );
}

async function clickBlockByText( editor: Editor, page: Page, text: string ) {
	await page.keyboard.press( 'Escape' ).catch( () => {} );
	await editor.canvas.getByText( text, { exact: false } ).first().click();
	await page.keyboard.press( 'Escape' ).catch( () => {} );
}

async function moveSelectedBlockDown( page: Page, editor: Editor ) {
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Move down' } )
		.click();
}

async function getSnapshot(
	collaborationUtils: CollaborationUtilsClass,
	page: Page
): Promise< Snapshot > {
	const state = await collaborationUtils.getNormalizedPostState( page );
	return {
		relativeOrder: state.blocks.map( ( block ) => {
			const content =
				( block.attributes?.content as string | undefined ) ??
				( block.attributes?.value as string | undefined ) ??
				( block.attributes?.citation as string | undefined ) ??
				'';
			return `${ block.name }::${ content }`;
		} ),
		title: state.title,
	};
}

test( 'realistic mover controls do not reproduce duplicate heading on premove content', async ( {
	collaborationUtils,
	collaboratorUser,
	editor,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 120000 );

	const result: Result = {
		afterMoveActor: { relativeOrder: [], title: '' },
		afterMovePeer: { relativeOrder: [], title: '' },
		reproduced: false,
	};

	const post = await requestUtils.createPost( {
		title: `RTC 53698ca4ec37 realistic ${ Date.now() }`,
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: PREMOVE_CONTENT,
	} );
	result.postId = post.id;

	try {
		await collaborationUtils.openPost( post.id );
		const { page: peerPage } = await collaborationUtils.joinUser(
			post.id,
			collaboratorUser
		);
		await waitForReady( collaborationUtils );

		await clickBlockByText( editor, page, 'Seed 954433 step 4 user 0 heading' );
		await moveSelectedBlockDown( page, editor );
		await collaborationUtils.waitForConvergence( { timeout: 10000 } );
		await clickBlockByText( editor, page, 'Seed 954433 step 4 user 0 heading' );
		await moveSelectedBlockDown( page, editor );

		try {
			await collaborationUtils.waitForConvergence( { timeout: 10000 } );
		} catch ( error ) {
			result.error =
				error instanceof Error ? error.stack ?? error.message : String( error );
		}

		result.afterMoveActor = await getSnapshot( collaborationUtils, page );
		result.afterMovePeer = await getSnapshot( collaborationUtils, peerPage );

		const actorHeadingCount = result.afterMoveActor.relativeOrder.filter( ( item ) =>
			item.includes( 'core/heading::Seed 954433 step 4 user 0 heading' )
		).length;
		const peerHeadingCount = result.afterMovePeer.relativeOrder.filter( ( item ) =>
			item.includes( 'core/heading::Seed 954433 step 4 user 0 heading' )
		).length;
		const actorTailPresent = result.afterMoveActor.relativeOrder.some( ( item ) =>
			item.includes(
				'core/paragraph::Another paragraph exists so the top-level list is not degenerate.'
			)
		);
		const peerTailPresent = result.afterMovePeer.relativeOrder.some( ( item ) =>
			item.includes(
				'core/paragraph::Another paragraph exists so the top-level list is not degenerate.'
			)
		);

		result.reproduced =
			( actorHeadingCount >= 2 && ! actorTailPresent ) ||
			( peerHeadingCount >= 2 && ! peerTailPresent );
	} finally {
		writeResult( 'realistic-move-repro-result.json', result );
	}

	await page.keyboard.press( `${ MODIFIER_KEY }+s` ).catch( () => {} );
	expect( result.reproduced ).toBe( false );
} );
