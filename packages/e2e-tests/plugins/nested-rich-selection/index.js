( function () {
	const { registerBlockType } = wp.blocks;
	const { RichText, useBlockProps } = wp.blockEditor;
	const { createElement: el } = wp.element;

	const IDENTIFIER = 'body.content';
	const LABEL = 'Nested selection text';

	registerBlockType( 'e2e-tests/nested-rich-selection', {
		apiVersion: 3,
		title: 'Nested Rich Selection Repro',
		description: 'Test block with nested rich text for selection history.',
		category: 'text',
		attributes: {
			body: {
				type: 'object',
				default: {
					content: '',
				},
				query: {
					content: {
						type: 'rich-text',
					},
				},
			},
		},
		edit: function Edit( { attributes, setAttributes } ) {
			return el(
				'div',
				useBlockProps(),
				el( RichText, {
					'aria-label': LABEL,
					identifier: IDENTIFIER,
					placeholder: LABEL,
					tagName: 'p',
					value: attributes.body?.content || '',
					onChange( content ) {
						setAttributes( {
							body: {
								...( attributes.body || {} ),
								content,
							},
						} );
					},
				} )
			);
		},
		save( { attributes } ) {
			return el(
				'div',
				useBlockProps.save(),
				el( RichText.Content, {
					tagName: 'p',
					value: attributes.body?.content || '',
				} )
			);
		},
	} );
} )();
