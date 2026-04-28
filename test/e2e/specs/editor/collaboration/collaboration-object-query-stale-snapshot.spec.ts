/**
 * External dependencies
 */
import type { Locator, Page } from '@playwright/test';

/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

const BLOCK_TITLE = 'RTC Object Query Card';
const BLOCK_NAME = 'test/object-query-card';
const SELECT_ALL_KEY = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

async function registerObjectQueryBlock( page: Page ) {
	await page.waitForFunction(
		() =>
			( window as any ).wp?.blocks &&
			( window as any ).wp?.blockEditor &&
			( window as any ).wp?.element
	);

	await page.evaluate(
		( { blockName, blockTitle } ) => {
			const wp = ( window as any ).wp;

			if ( wp.blocks.getBlockType( blockName ) ) {
				return;
			}

			const { createElement: el, useEffect, useState } = wp.element;
			const { PlainText, useBlockProps } = wp.blockEditor;

			wp.blocks.registerBlockType( blockName, {
				apiVersion: 3,
				title: blockTitle,
				category: 'text',
				attributes: {
					hero: {
						type: 'object',
						query: {
							headline: { type: 'string' },
							caption: { type: 'string' },
						},
						default: {
							headline: '',
							caption: '',
						},
					},
				},
				edit( { attributes, setAttributes } ) {
					const hero = attributes.hero ?? {};
					const heroHeadline = hero.headline;
					const heroCaption = hero.caption;
					const [ draftHero, setDraftHero ] = useState( hero );
					const [ hasLocalDraft, setHasLocalDraft ] =
						useState( false );

					useEffect( () => {
						if ( ! hasLocalDraft ) {
							setDraftHero( {
								headline: heroHeadline,
								caption: heroCaption,
							} );
						}
					}, [ heroHeadline, heroCaption, hasLocalDraft ] );

					function updateHero( nextHero ) {
						setHasLocalDraft( true );
						setDraftHero( nextHero );
						setAttributes( {
							hero: nextHero,
						} );
					}

					return el(
						'section',
						{
							...useBlockProps( {
								className: 'rtc-object-query-card',
							} ),
							'data-testid': 'rtc-object-query-card',
						},
						el(
							'label',
							{},
							'Headline',
							el( PlainText, {
								'aria-label': 'Object query headline',
								value: draftHero.headline ?? '',
								onChange( headline: string ) {
									updateHero( {
										...draftHero,
										headline,
									} );
								},
							} )
						),
						el(
							'label',
							{},
							'Caption',
							el( PlainText, {
								'aria-label': 'Object query caption',
								value: draftHero.caption ?? '',
								onChange( caption: string ) {
									updateHero( {
										...draftHero,
										caption,
									} );
								},
							} )
						)
					);
				},
				save( { attributes } ) {
					const hero = attributes.hero ?? {};

					return el(
						'section',
						useBlockProps.save(),
						el( 'h2', {}, hero.headline ?? '' ),
						el( 'p', {}, hero.caption ?? '' )
					);
				},
			} );
		},
		{ blockName: BLOCK_NAME, blockTitle: BLOCK_TITLE }
	);
}

async function insertObjectQueryBlockFromInserter( page: Page ) {
	await page
		.getByRole( 'button', {
			name: 'Block Inserter',
			exact: true,
		} )
		.click();

	const inserterPanel = page.getByRole( 'region', {
		name: 'Block Library',
	} );

	await inserterPanel
		.getByRole( 'searchbox', {
			name: 'Search',
		} )
		.fill( BLOCK_TITLE );

	await inserterPanel
		.getByRole( 'tabpanel', { name: 'Blocks' } )
		.getByRole( 'option', { name: BLOCK_TITLE, exact: true } )
		.click();
}

async function replaceText( page: Page, textbox: Locator, value: string ) {
	await textbox.click();
	await page.keyboard.press( SELECT_ALL_KEY );
	await page.keyboard.type( value );
}

async function getHero( page: Page ) {
	return page.evaluate( ( blockName ) => {
		const block = ( window as any ).wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.find(
				( candidate: { name: string } ) => candidate.name === blockName
			);

		return block?.attributes?.hero ?? null;
	}, BLOCK_NAME );
}

test.describe( 'Collaboration - object+query stale snapshot', () => {
	test( 'normal sequential field edits preserve object+query sibling values', async ( {
		collaborationUtils,
		requestUtils,
		editor,
		page,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Object Query Stale Snapshot',
			status: 'draft',
			date_gmt: new Date().toISOString(),
		} );

		await collaborationUtils.openPost( post.id );
		await registerObjectQueryBlock( page );

		await collaborationUtils.joinUser( post.id, {
			username: 'collaborator',
			email: 'collaborator@example.com',
			firstName: 'Test',
			lastName: 'Collaborator',
			password: 'password',
			roles: [ 'editor' ],
		} );

		const { page2, editor2 } = collaborationUtils;
		await registerObjectQueryBlock( page2 );
		await collaborationUtils.waitForMutualDiscovery();

		await insertObjectQueryBlockFromInserter( page );

		const headlineA = editor.canvas.getByRole( 'textbox', {
			name: 'Object query headline',
		} );
		const captionA = editor.canvas.getByRole( 'textbox', {
			name: 'Object query caption',
		} );
		const captionB = editor2.canvas.getByRole( 'textbox', {
			name: 'Object query caption',
		} );

		await replaceText( page, headlineA, 'headline before' );
		await replaceText( page, captionA, 'caption before' );

		await expect
			.poll( () => getHero( page2 ), { timeout: 10_000 } )
			.toEqual( {
				headline: 'headline before',
				caption: 'caption before',
			} );
		await expect(
			editor2.canvas.getByTestId( 'rtc-object-query-card' )
		).toBeVisible();

		await replaceText( page2, captionB, 'caption from user B' );
		await expect
			.poll( () => getHero( page ), { timeout: 10_000 } )
			.toEqual( {
				headline: 'headline before',
				caption: 'caption from user B',
			} );

		await replaceText( page, headlineA, 'headline from user A' );

		const expectedHero = {
			headline: 'headline from user A',
			caption: 'caption from user B',
		};

		await expect
			.poll( () => getHero( page ), { timeout: 10_000 } )
			.toEqual( expectedHero );
		await expect
			.poll( () => getHero( page2 ), { timeout: 10_000 } )
			.toEqual( expectedHero );
	} );
} );
