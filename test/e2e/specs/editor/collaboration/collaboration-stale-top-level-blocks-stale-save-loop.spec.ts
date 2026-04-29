/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const SELECT_ALL_KEY = 'ControlOrMeta+a';
const LINE_END_KEY = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';

function paragraphMarkup( content: string ) {
	return `<!-- wp:paragraph --><p>${ content }</p><!-- /wp:paragraph -->`;
}

function postContent( contents: string[] ) {
	return contents.map( paragraphMarkup ).join( '\n\n' );
}

async function paragraphContents( editor: {
	getBlocks: () => Promise<
		{ name: string; attributes: { content?: string } }[]
	>;
} ) {
	return ( await editor.getBlocks() )
		.filter( ( block ) => block.name === 'core/paragraph' )
		.map( ( block ) => block.attributes.content );
}

async function replaceParagraphText(
	editor: { canvas: { locator: ( selector: string ) => any } },
	page: {
		keyboard: {
			press: ( key: string ) => Promise< void >;
			type: ( text: string ) => Promise< void >;
		};
	},
	index: number,
	text: string
) {
	await editor.canvas
		.locator( '[data-type="core/paragraph"]' )
		.nth( index )
		.click();
	await page.keyboard.press( SELECT_ALL_KEY );
	await page.keyboard.type( text );
}

async function clickSaveDraft( page: {
	getByRole: ( role: string, options: { name: string | RegExp } ) => any;
} ) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Save draft' } )
		.click();
	await page
		.getByRole( 'button', { name: 'Dismiss this notice' } )
		.filter( { hasText: 'Draft saved' } )
		.waitFor( { timeout: 15000 } );
}

test.use( { video: 'on' } );

test.describe( 'Collaboration - stale top-level block save repro', () => {
	test( 'reproduces verified append loss with overlapping draft saves', async ( {
		admin,
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		test.setTimeout( 8 * 60 * 1000 );

		const firstPost = await requestUtils.createPost( {
			title: 'RTC stale save loop bootstrap',
			status: 'draft',
			content: postContent( [ 'Alpha', 'Beta' ] ),
			date_gmt: new Date().toISOString(),
		} );
		await collaborationUtils.openCollaborativeSession( firstPost.id );
		await editor.setIsFixedToolbar( true );

		const { page2 } = collaborationUtils;
		const editor2 = collaborationUtils.editor2;

		async function openPostForBoth( postId: number ) {
			await admin.visitAdminPage(
				'post.php',
				`post=${ postId }&action=edit`
			);
			await page2.goto(
				`/wp-admin/post.php?post=${ postId }&action=edit`
			);
			await collaborationUtils.waitForCollaborationReady( page );
			await collaborationUtils.waitForCollaborationReady( page2 );
			await collaborationUtils.waitForMutualDiscovery();
			await editor.setIsFixedToolbar( true );
		}

		for ( let repeat = 0; repeat < 24; repeat++ ) {
			const localText = `Alpha local stale save loop ${ repeat }`;
			const remoteText = `Gamma remote stale save loop ${ repeat }`;
			const post = await requestUtils.createPost( {
				title: `RTC stale save loop ${ repeat }`,
				status: 'draft',
				content: postContent( [ 'Alpha', 'Beta' ] ),
				date_gmt: new Date().toISOString(),
			} );
			await openPostForBoth( post.id );

			await expect
				.poll( () => paragraphContents( editor ) )
				.toEqual( [ 'Alpha', 'Beta' ] );
			await expect
				.poll( () => paragraphContents( editor2 ) )
				.toEqual( [ 'Alpha', 'Beta' ] );

			await page2.bringToFront();
			await replaceParagraphText( editor2, page2, 1, 'Beta' );
			await page2.keyboard.press( LINE_END_KEY );
			await page2.keyboard.press( 'Enter' );
			await page2.keyboard.type( remoteText );
			await expect
				.poll( () => paragraphContents( editor2 ), {
					timeout: 10000,
				} )
				.toContain( remoteText );

			const collaboratorSave = clickSaveDraft( page2 );
			await page.bringToFront();
			await replaceParagraphText( editor, page, 0, localText );
			await clickSaveDraft( page );
			await collaboratorSave;

			await page.reload();
			await collaborationUtils.waitForEntityReadyAndSaveSettled( page );
			const primary = await paragraphContents( editor );
			// eslint-disable-next-line no-console
			console.log( `stale-save-loop-${ repeat }`, { primary } );

			if (
				primary.includes( localText ) &&
				! primary.includes( remoteText )
			) {
				throw new Error(
					`Found verified stale save repro ${ repeat }: ${ JSON.stringify(
						{
							primary,
						}
					) }`
				);
			}
		}

		throw new Error( 'No verified stale save repro found.' );
	} );
} );
