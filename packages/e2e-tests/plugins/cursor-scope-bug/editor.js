( ( { wp: { blocks, blockEditor, element } } ) => {
	const { registerBlockType } = blocks;
	const { RichText } = blockEditor;
	const { createElement: el, Fragment } = element;

	const TARGET_SECOND = 'ab<em>b</em><strong>it</strong>';
	const STEP_TWO_SECOND = 'a<strong>it</strong>';
	const STEP_THREE_SECOND = 'ab<em>b</em><strong>i</strong>t';

	registerBlockType( 'test/cursor-scope-bug', {
		apiVersion: 3,
		edit( { attributes, setAttributes } ) {
			return el(
				Fragment,
				null,
				el( RichText, {
					tagName: 'p',
					className: 'first',
					identifier: 'first',
					value: attributes.first,
					onChange( value ) {
						const normalizedValue =
							typeof value === 'string' ? value : String( value );
						let nextSecond = attributes.second;

						if ( normalizedValue === 'xyq' ) {
							nextSecond = STEP_THREE_SECOND;
						} else if ( normalizedValue === 'xy' ) {
							nextSecond = STEP_TWO_SECOND;
						} else if ( normalizedValue ) {
							nextSecond = TARGET_SECOND;
						}

						setAttributes( {
							first: value,
							second: nextSecond,
						} );
					},
				} ),
				el( RichText, {
					tagName: 'p',
					className: 'second',
					identifier: 'second',
					value: attributes.second,
					onChange( value ) {
						setAttributes( { second: value } );
					},
				} )
			);
		},
		save( { attributes } ) {
			return el(
				Fragment,
				null,
				el( RichText.Content, {
					tagName: 'p',
					className: 'first',
					value: attributes.first,
				} ),
				el( RichText.Content, {
					tagName: 'p',
					className: 'second',
					value: attributes.second,
				} )
			);
		},
	} );
} )( window );
