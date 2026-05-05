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

type Scenario = {
	insertParagraphFirst: boolean;
	name: string;
};

type ScenarioResult = {
	collaboratorBlockNames: string[];
	convergenceError: string | null;
	name: string;
	primaryBlockNames: string[];
};

const RESULT_DIR = process.env.RTC_98E7_REALISTIC_REPRO_DIR;

const INITIAL_CONTENT = [
	'<!-- wp:paragraph -->',
	'<p>Seed 956712 baseline paragraph.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Seed 956712 keeps a second paragraph for deletes and moves.</p>',
	'<!-- /wp:paragraph -->',
	'<!-- wp:paragraph -->',
	'<p>Shared editing target paragraph.</p>',
	'<!-- /wp:paragraph -->',
].join( '\n' );

const SCENARIOS: Scenario[] = [
	{
		insertParagraphFirst: false,
		name: 'remote-table-insert-then-delete',
	},
	{
		insertParagraphFirst: true,
		name: 'remote-paragraph-then-table-insert-then-delete',
	},
];

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
			username: `rtctable98e7${ uniqueSuffix }`,
			email: `rtctable98e7+${ uniqueSuffix }@example.com`,
			firstName: 'RTC',
			lastName: 'Table Delete',
			password: 'password',
			roles: [ 'editor' ],
		};
		const createdUser = await requestUtils.createUser( collaboratorUser );

		collaborationUtils.registerCleanupUser( createdUser.id );
		await use( collaboratorUser );
	},
} );

function writeResult( result: ScenarioResult ) {
	if ( ! RESULT_DIR ) {
		return;
	}

	fs.mkdirSync( RESULT_DIR, { recursive: true } );
	fs.writeFileSync(
		path.join( RESULT_DIR, `${ result.name }.json` ),
		JSON.stringify( result, null, 2 )
	);
}

async function waitForSessionReady(
	collaborationUtils: CollaborationUtilsClass
) {
	await expect(
		collaborationUtils.allPages[ 0 ].getByRole( 'button', {
			name: /Collaborators list, 2 online/,
		} )
	).toBeVisible( { timeout: 20000 } );
	await expect(
		collaborationUtils.getPage( 0 ).getByRole( 'button', {
			name: /Collaborators list, 2 online/,
		} )
	).toBeVisible( { timeout: 20000 } );
	await collaborationUtils.waitForConvergence( {
		timeout: 20000,
	} );
}

async function insertParagraphAfterFirstBlock(
	editor: Editor,
	page: Page,
	content: string
) {
	await editor.canvas
		.getByText( 'Seed 956712 baseline paragraph.', { exact: false } )
		.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( content, { delay: 20 } );
}

async function insertTableAtEnd( editor: Editor, page: Page, marker: string ) {
	await editor.canvas
		.getByText( 'Shared editing target paragraph.', { exact: false } )
		.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.press( 'Enter' );
	await page.keyboard.type( '/table' );
	await expect(
		page.getByRole( 'option', { name: 'Table', selected: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );
	await editor.canvas
		.getByRole( 'button', { name: 'Create Table' } )
		.click();

	const cells = editor.canvas.locator( 'td' );
	await expect( cells ).toHaveCount( 4 );

	const values = [
		`${ marker } row 1 A`,
		`${ marker } row 1 B`,
		`${ marker } row 2 A`,
		`${ marker } row 2 B`,
	];

	for ( const [ index, value ] of values.entries() ) {
		await cells.nth( index ).click();
		await page.keyboard.type( value, { delay: 20 } );
	}
}

async function deleteSelectedTable( editor: Editor, page: Page ) {
	const firstCell = editor.canvas.locator( 'td' ).first();
	await expect( firstCell ).toBeVisible();
	await firstCell.click();
	await editor.showBlockToolbar();
	await page
		.getByRole( 'toolbar', { name: 'Block tools' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page
		.locator( '.components-popover' )
		.getByRole( 'menuitem', { name: /^Delete/ } )
		.click();
}

async function getStateSummary(
	collaborationUtils: CollaborationUtilsClass
): Promise< ScenarioResult > {
	const [ primaryState, collaboratorState ] = await Promise.all( [
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.allPages[ 0 ]
		),
		collaborationUtils.getNormalizedPostState(
			collaborationUtils.getPage( 0 )
		),
	] );

	return {
		collaboratorBlockNames: collaboratorState.blocks.map(
			( block ) => block.name
		),
		convergenceError: null,
		name: '',
		primaryBlockNames: primaryState.blocks.map( ( block ) => block.name ),
	};
}

test.describe( 'RTC triage 98e7f896ffb0 realistic table delete after remote insert', () => {
	for ( const scenario of SCENARIOS ) {
		test( scenario.name, async ( {
			collaborationUtils,
			collaboratorUser,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: `RTC triage 98e7 ${ scenario.name }`,
				status: 'draft',
				content: INITIAL_CONTENT,
			} );

			await collaborationUtils.openPost( post.id );
			await collaborationUtils.joinUser( post.id, collaboratorUser );
			await waitForSessionReady( collaborationUtils );

			const collaboratorPage = collaborationUtils.getPage( 0 );
			const collaboratorEditor = collaborationUtils.allEditors[ 1 ];

			if ( scenario.insertParagraphFirst ) {
				await insertParagraphAfterFirstBlock(
					collaboratorEditor,
					collaboratorPage,
					'Seed 956712 step 0 user 1 paragraph realistic'
				);
				await collaborationUtils.waitForConvergence( {
					timeout: 20000,
				} );
			}

			await insertTableAtEnd(
				editor,
				page,
				`table-option-98e7-${ scenario.name }`
			);
			await collaborationUtils.waitForConvergence( {
				timeout: 20000,
			} );

			await deleteSelectedTable( collaboratorEditor, collaboratorPage );

			let convergenceError: string | null = null;
			try {
				await collaborationUtils.waitForConvergence( {
					timeout: 15000,
				} );
			} catch ( error ) {
				convergenceError =
					error instanceof Error ? error.message : String( error );
			}

			const summary = await getStateSummary( collaborationUtils );
			const result = {
				...summary,
				convergenceError,
				name: scenario.name,
			};
			writeResult( result );

			expect( result.primaryBlockNames ).toEqual(
				result.collaboratorBlockNames
			);
			expect( result.primaryBlockNames ).not.toContain( 'core/table' );
		} );
	}
} );
