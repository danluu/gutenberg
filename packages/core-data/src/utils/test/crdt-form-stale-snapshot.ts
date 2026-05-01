/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/button',
			attributes: {
				text: { type: 'rich-text' },
				tagName: { type: 'string' },
				type: { type: 'string' },
			},
		},
		{
			name: 'core/buttons',
			attributes: {},
		},
		{
			name: 'core/form',
			attributes: {
				method: { type: 'string' },
				submissionMethod: { type: 'string' },
			},
		},
		{
			name: 'core/form-input',
			attributes: {
				type: { type: 'string' },
				name: { type: 'string' },
				label: { type: 'rich-text' },
				placeholder: { type: 'string' },
				required: { type: 'boolean' },
				visibilityPermissions: { type: 'string' },
			},
		},
		{
			name: 'core/form-submit-button',
			attributes: {},
		},
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function paragraphBlock( clientId: string, content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function formInputBlock(
	clientId: string,
	type: string,
	name: string,
	label: string,
	placeholder?: string
): Block {
	return {
		name: 'core/form-input',
		clientId,
		attributes: {
			type,
			name,
			label,
			placeholder,
			required: type !== 'url',
			visibilityPermissions: 'all',
		},
		innerBlocks: [],
	};
}

function formBlock(
	clientId: string,
	marker: string,
	fieldMarkers: string[]
): Block {
	return {
		name: 'core/form',
		clientId,
		attributes: {
			method: 'post',
			submissionMethod: 'email',
		},
		innerBlocks: [
			formInputBlock(
				`${ clientId }-name`,
				'text',
				`traveler-${ marker }`,
				`Traveler ${ fieldMarkers[ 0 ] }`
			),
			formInputBlock(
				`${ clientId }-email`,
				'email',
				`email-${ marker }`,
				`Email ${ fieldMarkers[ 1 ] }`
			),
			formInputBlock(
				`${ clientId }-story`,
				'textarea',
				`story-${ marker }`,
				`Story ${ fieldMarkers[ 2 ] }`,
				`Tell us ${ marker }`
			),
			{
				name: 'core/form-submit-button',
				clientId: `${ clientId }-submit`,
				attributes: {},
				innerBlocks: [
					{
						name: 'core/buttons',
						clientId: `${ clientId }-buttons`,
						attributes: {},
						innerBlocks: [
							{
								name: 'core/button',
								clientId: `${ clientId }-button`,
								attributes: {
									tagName: 'button',
									text: `Submit ${ marker }`,
									type: 'submit',
								},
								innerBlocks: [],
							},
						],
					},
				],
			},
		],
	};
}

function getSerializedBlocksText( yblocks: Y.Array< YBlock > ): string {
	return JSON.stringify( yblocks.toJSON() );
}

describe( 'stale same-account form snapshots', () => {
	it( 'preserves customer form content when a stale same-account session saves a form', () => {
		const customerDoc = new Y.Doc();
		const staleDoc = new Y.Doc();
		const customerBlocks = customerDoc.getArray< YBlock >();
		const staleBlocks = staleDoc.getArray< YBlock >();
		const initialBlocks = [
			paragraphBlock( 'initial-body', 'Initial form page body' ),
		];
		const customerMarkers = [
			'form-overwrite-customer-name',
			'form-overwrite-customer-email',
			'form-overwrite-customer-story',
		];
		const staleMarkers = [
			'form-overwrite-stale-name',
			'form-overwrite-stale-email',
			'form-overwrite-stale-story',
		];

		try {
			mergeCrdtBlocks( customerBlocks, initialBlocks, null );
			Y.applyUpdate( staleDoc, Y.encodeStateAsUpdate( customerDoc ) );
			mergeCrdtBlocks(
				staleBlocks,
				cloneBlocks( initialBlocks ),
				null
			);

			mergeCrdtBlocks(
				customerBlocks,
				[
					...cloneBlocks( initialBlocks ),
					paragraphBlock(
						'customer-body',
						'form-overwrite-customer-body'
					),
					formBlock(
						'customer-form',
						'form-overwrite-customer-form',
						customerMarkers
					),
				],
				null
			);
			Y.applyUpdate( staleDoc, Y.encodeStateAsUpdate( customerDoc ) );
			expect( getSerializedBlocksText( staleBlocks ) ).toContain(
				'form-overwrite-customer-story'
			);

			mergeCrdtBlocks(
				staleBlocks,
				[
					...cloneBlocks( initialBlocks ),
					paragraphBlock(
						'stale-body',
						'form-overwrite-stale-body'
					),
					formBlock(
						'stale-form',
						'form-overwrite-stale-form',
						staleMarkers
					),
				],
				null
			);

			const serializedBlocks = getSerializedBlocksText( staleBlocks );

			for ( const marker of [
				'form-overwrite-customer-body',
				'form-overwrite-customer-form',
				...customerMarkers,
				'form-overwrite-stale-body',
				'form-overwrite-stale-form',
				...staleMarkers,
			] ) {
				expect( serializedBlocks ).toContain( marker );
			}
		} finally {
			customerDoc.destroy();
			staleDoc.destroy();
		}
	} );
} );
