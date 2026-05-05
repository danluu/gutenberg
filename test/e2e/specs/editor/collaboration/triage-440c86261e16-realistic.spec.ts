import fs from 'fs';
import path from 'path';

import {
	test as base,
	type Page,
} from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtilsClass, {
	setCollaboration,
	type UserCredentials,
} from './fixtures/collaboration-utils';

type Fixtures = {
	collaborationUtils: CollaborationUtilsClass;
	collaboratorUser: UserCredentials;
};

type SnapshotState = {
	blocks: Array< {
		attributes: Record< string, unknown >;
		innerBlocks: SnapshotState['blocks'];
		name: string;
	} >;
	isSaving: boolean;
	title: string;
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
			username: `rtc440c${ uniqueSuffix }`,
			email: `rtc440c+${ uniqueSuffix }@example.com`,
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

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Long shared paragraph used as the initial collaborative editing surface.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading -->',
	'<h2 class="wp-block-heading">Follow-up heading</h2>',
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Tail paragraph kept for save and reload stability checks.</p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:paragraph -->',
	'<p>Seed 950287 ambiguous refs: &notin; / &notin text, nbsp &nbsp gap, quote &quot;value&quot;, apos &apos;value&apos;, lt &lt and gt &gt. <a href="https://example.test/search?q=alpha&amp;beta=2&amp-gamma=3&#38-delta=4&#x26-epsilon=5" title="A&amp B &copy 2026 &#34 quoted&#34;">attribute refs</a></p>',
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:heading {"level":3} -->',
	'<h3 class="wp-block-heading">Heading refs &amp optional &copy 950287 with &#x26; hex</h3>',
	'<!-- /wp:heading -->',
].join( '\n' );

function writeFailureState(
	payload: Record< string, unknown >,
	fileName = 'realistic-convergence-failure.json'
) {
	const outputDir = process.env.RTC_440C_OUTPUT_DIR;
	if ( ! outputDir ) {
		return;
	}

	fs.mkdirSync( outputDir, { recursive: true } );
	fs.writeFileSync(
		path.join( outputDir, fileName ),
		JSON.stringify( payload, null, 2 )
	);
}

async function getSnapshotState( page: Page ): Promise< SnapshotState > {
	return page.evaluate( () => {
		const normalizeValue = ( value: unknown ): unknown => {
			if ( Array.isArray( value ) ) {
				return value.map( normalizeValue );
			}
			if (
				value &&
				typeof value === 'object' &&
				Object.getPrototypeOf( value ) === Object.prototype
			) {
				return Object.fromEntries(
					Object.entries( value as Record< string, unknown > )
						.sort( ( [ keyA ], [ keyB ] ) =>
							keyA.localeCompare( keyB )
						)
						.map( ( [ key, item ] ) => [ key, normalizeValue( item ) ] )
				);
			}
			return value;
		};
		const normalizeBlocks = (
			blockTree: Array< {
				attributes?: Record< string, unknown >;
				innerBlocks?: Array< unknown >;
				name: string;
			} >
		): SnapshotState['blocks'] =>
			blockTree.map( ( block ) => ( {
				name: block.name,
				attributes: normalizeValue(
					JSON.parse( JSON.stringify( block.attributes ?? {} ) )
				) as Record< string, unknown >,
				innerBlocks: normalizeBlocks( block.innerBlocks ?? [] ),
			} ) );

		return {
			title:
				( window as any ).wp.data
					.select( 'core/editor' )
					.getEditedPostAttribute( 'title' ) ?? '',
			isSaving: ( window as any ).wp.data.select( 'core/editor' ).isSavingPost(),
			blocks: normalizeBlocks(
				( window as any ).wp.data.select( 'core/block-editor' ).getBlocks()
			),
		};
	} );
}

test( 'realistic entity-normalization RTC convergence on open', async ( {
	collaborationUtils,
	collaboratorUser,
	page,
	requestUtils,
} ) => {
	test.setTimeout( 90000 );

	const post = await requestUtils.createPost( {
		title: 'RTC seed 950287 initial title',
		status: 'draft',
		date_gmt: new Date().toISOString(),
		content: INITIAL_CONTENT,
	} );

	await collaborationUtils.openPost( post.id );
	const { page: collaboratorPage } = await collaborationUtils.joinUser(
		post.id,
		collaboratorUser
	);

	try {
		await collaborationUtils.waitForMutualDiscovery( { timeout: 15000 } );
		await collaborationUtils.waitForConvergence( {
			timeout: 15000,
		} );
	} catch ( error ) {
		const [ primaryState, secondaryState ] = await Promise.all( [
			getSnapshotState( page ),
			getSnapshotState( collaboratorPage ),
		] );
		writeFailureState( {
			error: error instanceof Error ? error.message : String( error ),
			postId: post.id,
			primaryState,
			secondaryState,
		} );
		throw error;
	}
} );
