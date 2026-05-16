/**
 * External dependencies
 */
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Mock block schemas.
 */
jest.mock( '@wordpress/blocks', () => {
	const actual = jest.requireActual( '@wordpress/blocks' );

	return {
		...actual,
		getBlockTypes: () => [
			{
				name: 'core/paragraph',
				attributes: {
					content: { type: 'rich-text' },
				},
			},
			{
				name: 'core/image',
				attributes: {
					url: { type: 'string' },
					blob: { type: 'string', role: 'local' },
				},
			},
		],
	};
} );

jest.mock( '../../../../sync/src/providers', () => ( {
	getProviderCreators: jest.fn(),
} ) );

/**
 * Internal dependencies
 */
import { CRDT_RECORD_MAP_KEY, Delta } from '../../sync';
import { applyPostChangesToCRDTDoc, getPostChangesFromCRDTDoc } from '../crdt';
import { mergeCrdtBlocks, mergeRichTextUpdate } from '../crdt-blocks';
import { getRootMap, richTextOffsetToHtmlIndex } from '../crdt-utils';

const DEFAULT_INPUTS = [
	'AAECAwQFBgcICQoLDA0ODw==',
	'Zm9ybWF0dGVkLWN1cnNvci1wYXRo',
	'cmljaC10ZXh0LWNyZHQtbWVyZ2U=',
	'b2xkLWh0bWwtdXBkYXRlLW5ldy1odG1s',
];
const TEXT_CHARS = [ 'a', 'b', 'c', 'x', 'y', 'z', ' ', '&' ];
const ENTITY_FRAGMENTS = [
	'&copy',
	'&copy;',
	'&#169',
	'&#xA9;',
	'&nbsp',
	'&nbsp;',
	'&notin',
	'&notin;',
	'&amp',
	'&amp;',
	'&lt',
	'&gt',
	'&quot;',
];
const WRAPPERS = [
	( text ) => text,
	( text ) => `<em>${ text }</em>`,
	( text ) => `<strong>${ text }</strong>`,
	( text ) => `<strong><em>${ text }</em></strong>`,
	( text ) => `<a href="https://example.com">${ text }</a>`,
	( text ) =>
		`<a href="https://example.com/entity?copy=&copy&semi=&copy;&hex=&#xA9" title="copy &copy reg &reg nbsp &nbsp">${ text }</a>`,
	( text ) => `<code>${ text }</code>`,
];
const SYNCED_PROPERTIES = new Set( [ 'blocks' ] );
const SEMANTIC_FEATURES = new Set();

jest.setTimeout( 120000 );

afterAll( () => {
	const featurePath = process.env.GUTENBERG_RTC_CG_FEATURE_FILE;

	if ( ! featurePath ) {
		return;
	}

	fs.writeFileSync(
		featurePath,
		`${ JSON.stringify( [ ...SEMANTIC_FEATURES ].sort(), null, 2 ) }\n`
	);
} );

function readInputCases() {
	const inputPath = process.env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE;
	const inputValue = process.env.GUTENBERG_RTC_CG_RICH_TEXT_INPUT_B64;
	let encodedInputs = DEFAULT_INPUTS;

	if ( inputPath ) {
		encodedInputs = JSON.parse( fs.readFileSync( inputPath, 'utf8' ) );
	} else if ( inputValue ) {
		encodedInputs = [ inputValue ];
	}

	return encodedInputs.map( ( encoded ) =>
		Array.from( Buffer.from( encoded, 'base64' ) )
	);
}

function addFeature( feature ) {
	SEMANTIC_FEATURES.add( feature );
}

function addBucketedFeature( prefix, value ) {
	const numericValue = Number.isFinite( value ) ? Math.max( 0, value ) : 0;
	const bounds = [ 0, 1, 2, 4, 8, 16, 32, 64, 128, 256 ];
	const bound = bounds.find( ( candidate ) => numericValue <= candidate );

	addFeature(
		`${ prefix }:${ bound === undefined ? 'gt-256' : `le-${ bound }` }`
	);
}

function hasMissingSemicolonEntity( html ) {
	return /&(copy|nbsp|notin|amp|lt|gt|quot)(?![a-zA-Z0-9#]*;)/.test(
		html
	);
}

function recordHtmlFeatures( prefix, html ) {
	addBucketedFeature( `${ prefix }:html-length`, html.length );

	if (
		/&(#\d+|#x[0-9a-f]+|copy|nbsp|notin|amp|lt|gt|quot);?/i.test(
			html
		)
	) {
		addFeature( `${ prefix }:entity-fragment` );
	}

	if ( hasMissingSemicolonEntity( html ) ) {
		addFeature( `${ prefix }:entity-missing-semicolon` );
	}

	if ( /&#(?:\d+|x[0-9a-f]+);?/i.test( html ) ) {
		addFeature( `${ prefix }:numeric-entity` );
	}

	for ( const tag of [ 'a', 'code', 'em', 'strong' ] ) {
		if ( html.includes( `<${ tag }` ) ) {
			addFeature( `${ prefix }:tag:${ tag }` );
		}
	}

	if ( /<strong><em>|<em><strong>/.test( html ) ) {
		addFeature( `${ prefix }:nested-formatting` );
	}
}

function recordCaseFeatures( inputBytes, caseData, htmlCursorIndex ) {
	const { oldText, newText, oldHtml, newHtml, cursorOffset } = caseData;

	addBucketedFeature( 'input-bytes', inputBytes.length );
	addBucketedFeature( 'old-text-length', oldText.length );
	addBucketedFeature( 'new-text-length', newText.length );
	addBucketedFeature( 'html-cursor-index', htmlCursorIndex );
	recordHtmlFeatures( 'old-html', oldHtml );
	recordHtmlFeatures( 'new-html', newHtml );

	if ( newText.length > oldText.length ) {
		addFeature( 'text-delta:grow' );
	} else if ( newText.length < oldText.length ) {
		addFeature( 'text-delta:shrink' );
	} else {
		addFeature( 'text-delta:same-length' );
	}

	if ( cursorOffset === 0 ) {
		addFeature( 'cursor:start' );
	} else if ( cursorOffset >= newText.length ) {
		addFeature( 'cursor:end' );
	} else {
		addFeature( 'cursor:middle' );
	}
}

function readByte( bytes, state ) {
	const value = bytes[ state.offset % bytes.length ] ?? 0;
	state.offset++;
	return value;
}

function escapeHtml( text ) {
	return text
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' );
}

function readText( bytes, state, minLength = 1, maxLength = 12 ) {
	const length =
		minLength +
		( readByte( bytes, state ) % ( maxLength - minLength + 1 ) );
	let text = '';

	for ( let index = 0; index < length; index++ ) {
		text += TEXT_CHARS[ readByte( bytes, state ) % TEXT_CHARS.length ];
	}

	return text.trim() || 'a';
}

function mutateText( bytes, state, oldText ) {
	const op = readByte( bytes, state ) % 4;
	const offset = readByte( bytes, state ) % ( oldText.length + 1 );
	const insertText = readText( bytes, state, 1, 4 );

	if ( op === 0 ) {
		return (
			oldText.slice( 0, offset ) + insertText + oldText.slice( offset )
		);
	}

	if ( op === 1 && oldText.length > 1 ) {
		return oldText.slice( 0, offset ) + oldText.slice( offset + 1 );
	}

	if ( op === 2 && oldText.length > 0 ) {
		return (
			oldText.slice( 0, offset ) +
			insertText[ 0 ] +
			oldText.slice( offset + 1 )
		);
	}

	return readText( bytes, state, 1, 12 );
}

function makeRichTextHtml( bytes, state, text ) {
	let html = '';
	let offset = 0;

	while ( offset < text.length ) {
		const remaining = text.length - offset;
		const chunkLength =
			1 + ( readByte( bytes, state ) % Math.min( 3, remaining ) );
		const chunk =
			readByte( bytes, state ) % 9 === 0
				? ENTITY_FRAGMENTS[
						readByte( bytes, state ) % ENTITY_FRAGMENTS.length
				  ]
				: escapeHtml( text.slice( offset, offset + chunkLength ) );
		const wrapper = WRAPPERS[ readByte( bytes, state ) % WRAPPERS.length ];

		html += wrapper( chunk );
		offset += chunkLength;
	}

	return html;
}

function makeCase( bytes, caseIndex ) {
	const state = { offset: caseIndex % Math.max( bytes.length, 1 ) };
	const oldText = readText( bytes, state );
	const newText = mutateText( bytes, state, oldText ) || 'a';
	const oldHtml = makeRichTextHtml( bytes, state, oldText );
	const newHtml = makeRichTextHtml( bytes, state, newText );
	const cursorOffset = readByte( bytes, state ) % ( newText.length + 1 );

	return { oldText, newText, oldHtml, newHtml, cursorOffset };
}

function makeParagraphBlock( content ) {
	return {
		clientId: 'block-1',
		name: 'core/paragraph',
		attributes: { content },
		innerBlocks: [],
	};
}

function makeImageBlock() {
	return {
		clientId: 'image-1',
		name: 'core/image',
		attributes: {
			url: 'https://example.com/image.jpg',
			blob: 'blob:local-only',
		},
		innerBlocks: [],
	};
}

function makeCursor( offset ) {
	return {
		attributeKey: 'content',
		clientId: 'block-1',
		offset,
	};
}

function getFirstBlockContentYText( yblocks ) {
	return yblocks.get( 0 ).get( 'attributes' ).get( 'content' );
}

function readFirstBlockContentFromDoc( ydoc ) {
	const recordMap = getRootMap( ydoc, CRDT_RECORD_MAP_KEY );
	const yblocks = recordMap.get( 'blocks' );

	return getFirstBlockContentYText( yblocks ).toString();
}

function applyDeltaOpsToString( value, deltaOps ) {
	return new Delta( [ { insert: value } ] )
		.compose( new Delta( deltaOps ) )
		.ops.map( ( op ) => ( typeof op.insert === 'string' ? op.insert : '' ) )
		.join( '' );
}

function assertDeepEqualWithContext( actual, expected, context ) {
	if ( JSON.stringify( actual ) === JSON.stringify( expected ) ) {
		return;
	}

	throw new Error(
		[
			'Unexpected coverage-guided rich-text CRDT structure.',
			`Expected: ${ JSON.stringify( expected ) }`,
			`Actual: ${ JSON.stringify( actual ) }`,
			`Context: ${ JSON.stringify( context ) }`,
		].join( '\n' )
	);
}

function assertEqualWithContext( actual, expected, context ) {
	if ( actual === expected ) {
		return;
	}

	throw new Error(
		[
			'Unexpected coverage-guided rich-text CRDT result.',
			`Expected: ${ JSON.stringify( expected ) }`,
			`Actual: ${ JSON.stringify( actual ) }`,
			`Context: ${ JSON.stringify( context ) }`,
		].join( '\n' )
	);
}

function normalizeHtmlFragment( value ) {
	const template = document.createElement( 'template' );
	template.innerHTML = String( value );

	return template.innerHTML;
}

function collectClientIds( blocks, ids = [] ) {
	for ( const block of blocks ) {
		if ( block?.clientId ) {
			ids.push( block.clientId );
		}

		if ( Array.isArray( block?.innerBlocks ) ) {
			collectClientIds( block.innerBlocks, ids );
		}
	}

	return ids;
}

function assertSerializableBlockTree( blocks, context ) {
	const ids = collectClientIds( blocks );
	const uniqueIds = new Set( ids );

	assertEqualWithContext( uniqueIds.size, ids.length, {
		...context,
		ids,
		target: 'unique-client-id',
	} );

	for ( const block of blocks ) {
		if ( ! Array.isArray( block.innerBlocks ) ) {
			throw new Error(
				[
					'Unexpected coverage-guided rich-text CRDT block shape.',
					`Context: ${ JSON.stringify( context ) }`,
					`Block: ${ JSON.stringify( block ) }`,
				].join( '\n' )
			);
		}

		if ( block.attributes?.blob !== undefined ) {
			throw new Error(
				[
					'Local-only block attribute leaked into shared CRDT state.',
					`Context: ${ JSON.stringify( context ) }`,
					`Block: ${ JSON.stringify( block ) }`,
				].join( '\n' )
			);
		}

		assertSerializableBlockTree( block.innerBlocks, context );
	}

	if ( JSON.stringify( blocks ).includes( '[object Object]' ) ) {
		throw new Error(
			[
				'Object stringification leaked into shared CRDT state.',
				`Context: ${ JSON.stringify( context ) }`,
				`Blocks: ${ JSON.stringify( blocks ) }`,
			].join( '\n' )
		);
	}
}

function assertLocalAttributesAreStripped( caseIndex ) {
	addFeature( 'oracle:local-attribute-strip' );
	const doc = new Y.Doc();
	const yblocks = doc.getArray( 'blocks' );

	mergeCrdtBlocks( yblocks, [ makeImageBlock() ], null );
	assertSerializableBlockTree( yblocks.toJSON(), {
		caseIndex,
		target: 'local-attribute-strip',
	} );
	doc.destroy();
}

function checkApplyPostChangesPath( oldHtml, newHtml, caseIndex ) {
	addFeature( 'oracle:applyPostChangesToCRDTDoc' );
	const doc = new Y.Doc();

	applyPostChangesToCRDTDoc(
		doc,
		{ blocks: [ makeParagraphBlock( oldHtml ) ] },
		SYNCED_PROPERTIES
	);
	applyPostChangesToCRDTDoc(
		doc,
		{ blocks: [ makeParagraphBlock( newHtml ) ] },
		SYNCED_PROPERTIES
	);
	assertEqualWithContext( readFirstBlockContentFromDoc( doc ), newHtml, {
		caseIndex,
		oldHtml,
		newHtml,
		target: 'applyPostChangesToCRDTDoc',
	} );
	const projectedChanges = getPostChangesFromCRDTDoc(
		doc,
		{ blocks: [ makeParagraphBlock( oldHtml ) ] },
		SYNCED_PROPERTIES
	);
	addFeature( 'oracle:getPostChangesFromCRDTDoc-projection' );
	const projectedContent =
		projectedChanges.blocks?.[ 0 ]?.attributes?.content;
	const projectedContentValue =
		projectedContent === undefined
			? projectedContent
			: String( projectedContent );
	assertEqualWithContext(
		normalizeHtmlFragment( projectedContentValue ),
		normalizeHtmlFragment( newHtml ),
		{
			caseIndex,
			oldHtml,
			newHtml,
			projectedContent: projectedContentValue,
			target: 'getPostChangesFromCRDTDoc-projection',
		}
	);
	assertSerializableBlockTree( projectedChanges.blocks ?? [], {
		caseIndex,
		target: 'getPostChangesFromCRDTDoc-structure',
	} );
	addFeature( 'oracle:getPostChangesFromCRDTDoc-structure' );
	doc.destroy();
}

function checkYjsReplicaConvergence(
	oldHtml,
	newHtml,
	cursorOffset,
	caseIndex
) {
	addFeature( 'oracle:replica-convergence' );
	const docA = new Y.Doc();
	const docB = new Y.Doc();
	const updatesA = [];
	const updatesB = [];
	const yblocksA = docA.getArray( 'blocks' );
	const yblocksB = docB.getArray( 'blocks' );

	docA.on( 'update', ( update ) => {
		updatesA.push( update );
	} );
	docB.on( 'update', ( update ) => {
		updatesB.push( update );
	} );

	mergeCrdtBlocks( yblocksA, [ makeParagraphBlock( oldHtml ) ], null );
	for ( const update of updatesA ) {
		Y.applyUpdate( docB, update );
	}

	mergeCrdtBlocks(
		yblocksB,
		[ makeParagraphBlock( newHtml ) ],
		makeCursor( cursorOffset )
	);

	const updatesFromB = [ ...updatesB ];
	addBucketedFeature( 'replica-updates-from-b', updatesFromB.length );
	for ( const update of updatesFromB ) {
		Y.applyUpdate( docA, update );
		Y.applyUpdate( docA, update );
		Y.applyUpdate( docB, update );
	}

	assertDeepEqualWithContext( yblocksA.toJSON(), yblocksB.toJSON(), {
		caseIndex,
		oldHtml,
		newHtml,
		cursorOffset,
		target: 'replica-convergence',
	} );
	assertEqualWithContext(
		getFirstBlockContentYText( yblocksA ).toString(),
		newHtml,
		{
			caseIndex,
			newHtml,
			cursorOffset,
			target: 'replica-a-content',
		}
	);
	assertSerializableBlockTree( yblocksA.toJSON(), {
		caseIndex,
		target: 'replica-a-structure',
	} );
	assertSerializableBlockTree( yblocksB.toJSON(), {
		caseIndex,
		target: 'replica-b-structure',
	} );

	docA.destroy();
	docB.destroy();
}

function checkRichTextMerge( inputBytes, caseIndex ) {
	const caseData = makeCase( inputBytes, caseIndex );
	const { oldHtml, newHtml, cursorOffset } = caseData;
	const htmlCursorIndex = richTextOffsetToHtmlIndex( newHtml, cursorOffset );
	recordCaseFeatures( inputBytes, caseData, htmlCursorIndex );

	const richTextDoc = new Y.Doc();
	const richText = richTextDoc.getText( 'content' );
	richText.insert( 0, oldHtml );
	addFeature( 'oracle:mergeRichTextUpdate' );
	mergeRichTextUpdate( richText, newHtml, htmlCursorIndex );
	assertEqualWithContext( richText.toString(), newHtml, {
		caseIndex,
		oldHtml,
		newHtml,
		cursorOffset,
		htmlCursorIndex,
		target: 'mergeRichTextUpdate',
	} );
	richTextDoc.destroy();

	const blocksDoc = new Y.Doc();
	const yblocks = blocksDoc.getArray( 'blocks' );
	mergeCrdtBlocks( yblocks, [ makeParagraphBlock( oldHtml ) ], null );

	const content = getFirstBlockContentYText( yblocks );
	const observedDeltas = [];
	content.observe( ( event ) => {
		observedDeltas.push( event.delta );
	} );

	addFeature( 'oracle:mergeCrdtBlocks' );
	mergeCrdtBlocks(
		yblocks,
		[ makeParagraphBlock( newHtml ) ],
		makeCursor( cursorOffset )
	);

	assertEqualWithContext( content.toString(), newHtml, {
		caseIndex,
		oldHtml,
		newHtml,
		cursorOffset,
		htmlCursorIndex,
		target: 'mergeCrdtBlocks',
	} );

	let replayed = oldHtml;
	for ( const deltaOps of observedDeltas ) {
		replayed = applyDeltaOpsToString( replayed, deltaOps );
	}
	addFeature( 'oracle:emitted-delta-replay' );
	addBucketedFeature( 'observed-delta-count', observedDeltas.length );
	assertEqualWithContext( replayed, newHtml, {
		caseIndex,
		oldHtml,
		newHtml,
		cursorOffset,
		htmlCursorIndex,
		observedDeltas,
		target: 'emitted-delta-replay',
	} );

	addFeature( 'oracle:idempotent-merge' );
	mergeCrdtBlocks(
		yblocks,
		[ makeParagraphBlock( newHtml ) ],
		makeCursor( cursorOffset )
	);
	assertEqualWithContext( content.toString(), newHtml, {
		caseIndex,
		newHtml,
		cursorOffset,
		target: 'idempotent-merge',
	} );
	assertSerializableBlockTree( yblocks.toJSON(), {
		caseIndex,
		target: 'mergeCrdtBlocks-structure',
	} );

	blocksDoc.destroy();

	checkApplyPostChangesPath( oldHtml, newHtml, caseIndex );
	checkYjsReplicaConvergence( oldHtml, newHtml, cursorOffset, caseIndex );
	assertLocalAttributesAreStripped( caseIndex );
}

describe( 'RTC rich-text CRDT coverage-guided merge target', () => {
	it( 'preserves deterministic merge invariants for fuzzed inputs', () => {
		const inputCases = readInputCases();

		expect( inputCases.length ).toBeGreaterThan( 0 );

		inputCases.forEach( ( inputBytes, caseIndex ) => {
			expect( inputBytes.length ).toBeGreaterThan( 0 );
			checkRichTextMerge( inputBytes, caseIndex );
		} );
	} );
} );
