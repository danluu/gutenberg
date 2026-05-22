/**
 * External dependencies
 */
import { v4 as uuidv4 } from 'uuid';
import fastDeepEqual from 'fast-deep-equal/es6/index.js';

/**
 * WordPress dependencies
 */
import { getBlockTypes } from '@wordpress/blocks';
import { RichTextData } from '@wordpress/rich-text';
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import {
	asRichTextOffset,
	createYMap,
	richTextOffsetToHtmlIndex,
	type HtmlStringIndex,
	type YMapRecord,
	type YMapWrap,
} from './crdt-utils';
import { getCachedRichTextData } from './crdt-text';
import { Delta } from '../sync';
import { type WPBlockSelection } from '../types';

interface BlockAttributes {
	[ key: string ]: unknown;
}

interface BlockAttributeSchema {
	__unstablePreserveWhiteSpace?: boolean;
	role?: string;
	type?: string;
	query?: Record< string, BlockAttributeSchema >;
}

interface BlockType {
	attributes?: Record< string, BlockAttributeSchema >;
	name: string;
}

// A block as represented in Gutenberg's data store.
export interface Block {
	attributes: BlockAttributes;
	clientId?: string;
	innerBlocks: Block[];
	isValid?: boolean;
	name: string;
	originalContent?: string;
	validationIssues?: string[]; // unserializable
}

// A block as represented in the CRDT document (Y.Map).
export interface YBlockRecord extends YMapRecord {
	attributes: YBlockAttributes;
	clientId: string;
	innerBlocks: YBlocks;
	isValid?: boolean;
	originalContent?: string;
	name: string;
}

export type YBlock = YMapWrap< YBlockRecord >;
export type YBlocks = Y.Array< YBlock >;

// Block attribute schema cannot be known at compile time, so we use Y.Map.
// Attribute values will be typed as the union of `Y.Text` and `unknown`.
export type YBlockAttributes = Y.Map< Y.Text | unknown >;

/**
 * Optional description of where a cursor falls.
 *
 * Used to coordinate shifting of cursor when applying changes
 * to a Y.Doc with RichText instances.
 */
export type MergeCursorPosition = WPBlockSelection | null;

const ARRAY_ELEMENT_ID_KEY = '__unstableSyncId';
const ARRAY_ELEMENT_ID_SYMBOL = Symbol( 'wpSyncArrayElementId' );
const VOID_HTML_TAGS = new Set( [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
] );

const serializableBlocksCache = new WeakMap< WeakKey, Block[] >();
const previousLocalBlocksCache = new WeakMap< YBlocks, Block[] >();
const observedTopLevelClientIdsCache = new WeakMap< YBlocks, Set< string > >();
const stalePostDeleteClientIdsCache = new WeakMap< YBlocks, Set< string > >();

type HTMLFragmentStructureNode =
	| [ 'comment' ]
	| [ 'element', string, HTMLFragmentStructureNode[] ]
	| [ 'other', number ]
	| [ 'text' ];

/**
 * Recursively walk an attribute value and convert any RichTextData instances
 * to their string (HTML) representation. This is necessary for array-type and
 * object-type attributes, which can contain nested RichTextData.
 *
 * @param value The attribute value to serialize.
 * @return The value with all RichTextData instances replaced by strings.
 */
function serializeAttributeValue( value: unknown ): unknown {
	if ( value instanceof RichTextData ) {
		return value.valueOf();
	}

	// e.g. core/table `body`: [ { cells: [ { content: RichTextData } ] } ]
	if ( Array.isArray( value ) ) {
		return value.map( serializeAttributeValue );
	}

	// e.g. a single row inside core/table `body`: { cells: [ ... ] }
	if ( value && typeof value === 'object' ) {
		const result: Record< string, unknown > = {};
		const arrayElementId = getArrayElementId( value );

		for ( const [ k, v ] of Object.entries( value ) ) {
			if ( k === ARRAY_ELEMENT_ID_KEY ) {
				continue;
			}

			result[ k ] = serializeAttributeValue( v );
		}

		if ( arrayElementId ) {
			result[ ARRAY_ELEMENT_ID_KEY ] = arrayElementId;
		}

		return result;
	}

	return value;
}

function makeBlockAttributesSerializable(
	blockName: string,
	attributes: BlockAttributes
): BlockAttributes {
	const newAttributes = { ...attributes };
	for ( const [ key, value ] of Object.entries( attributes ) ) {
		if ( isLocalAttribute( blockName, key ) ) {
			delete newAttributes[ key ];
			continue;
		}

		newAttributes[ key ] = serializeAttributeValue( value );
	}
	return newAttributes;
}

/**
 * Recursively removes properties which cannot be serialized from a list of block objects.
 *
 * @param blocks Eemove unserializable properties from each block object in this set.
 * @return Copies of the provided blocks without the unserializable properties.
 */
function makeBlocksSerializable( blocks: Block[] ): Block[] {
	return blocks.map( ( block: Block ) => {
		const {
			name,
			innerBlocks,
			attributes,
			/*
			 * Any validation issues discovered when loading a block are appended
			 * to the block node with a logging function, which cannot be serialized.
			 *
			 * @see import("@wordpress/blocks/src/api/parser").parseRawBlock()
			 */
			validationIssues,
			...rest
		} = block;

		return {
			...rest,
			name,
			attributes: makeBlockAttributesSerializable( name, attributes ),
			innerBlocks: makeBlocksSerializable( innerBlocks ),
		};
	} );
}

function makeSerializableBlocksFromYBlocks( yblocks: YBlocks ): Block[] {
	return makeBlocksSerializable( yblocks.toJSON() as unknown as Block[] );
}

/**
 * Recursively walk an attribute value and convert any strings that correspond
 * to rich-text schema nodes into RichTextData instances. This is the inverse
 * of serializeAttributeValue and handles nested structures like table cells.
 *
 * @param schema The attribute type definition for this value.
 * @param value  The attribute value from CRDT (toJSON).
 * @return The value with rich-text strings replaced by RichTextData.
 */
function deserializeAttributeValue(
	schema: BlockAttributeSchema | undefined,
	value: unknown
): unknown {
	if ( schema?.type === 'rich-text' && typeof value === 'string' ) {
		return getCachedRichTextData( value );
	}

	// e.g. core/table `body`: [ { cells: [ { content: RichTextData } ] } ]
	if ( Array.isArray( value ) ) {
		return value.map( ( item ) =>
			deserializeAttributeValue( schema, item )
		);
	}

	// e.g. a single row inside core/table `body`: { cells: [ ... ] }
	if ( value && typeof value === 'object' ) {
		const result: Record< string, unknown > = {};
		const arrayElementId = getArrayElementId( value );

		for ( const [ key, innerValue ] of Object.entries(
			value as Record< string, unknown >
		) ) {
			if ( key === ARRAY_ELEMENT_ID_KEY ) {
				continue;
			}

			result[ key ] = deserializeAttributeValue(
				schema?.query?.[ key ],
				innerValue
			);
		}

		if ( arrayElementId ) {
			defineArrayElementId( result, arrayElementId );
		}

		return result;
	}

	return value;
}

/**
 * Convert blocks from their CRDT-serialized form back to the runtime form
 * expected by the block editor. Rich-text attributes are stored as Y.Text in
 * the CRDT document, which serializes to plain strings via toJSON(). This
 * function restores them to RichTextData instances so that block edit
 * components that rely on RichTextData methods (e.g. `.text`) work correctly.
 *
 * @param blocks Blocks as extracted from the CRDT document via toJSON().
 * @return Blocks with rich-text attributes restored to RichTextData.
 */
export function deserializeBlockAttributes( blocks: Block[] ): Block[] {
	return blocks.map( ( block: Block ) => {
		const { name, innerBlocks, attributes, ...rest } = block;

		const newAttributes = { ...attributes };

		for ( const [ key, value ] of Object.entries( attributes ) ) {
			const schema = getBlockAttributeSchema( name, key );

			if ( schema ) {
				newAttributes[ key ] = deserializeAttributeValue(
					schema,
					value
				);
			}
		}

		return {
			...rest,
			name,
			attributes: newAttributes,
			innerBlocks: deserializeBlockAttributes( innerBlocks ?? [] ),
		};
	} );
}

function findHTMLTagEnd( html: string, tagStart: number ): number {
	let quote: string | null = null;

	for ( let index = tagStart + 1; index < html.length; index++ ) {
		const char = html[ index ];

		if ( quote ) {
			if ( char === quote ) {
				quote = null;
			}
			continue;
		}

		if ( char === '"' || char === "'" ) {
			quote = char;
			continue;
		}

		if ( char === '>' ) {
			return index;
		}
	}

	return -1;
}

function areHTMLAttributesWellFormed( attributeText: string ): boolean {
	const seenAttributes = new Set< string >();
	let index = 0;

	while ( index < attributeText.length ) {
		while ( /\s/.test( attributeText[ index ] ?? '' ) ) {
			index++;
		}

		if ( index >= attributeText.length ) {
			return true;
		}

		const nameMatch = /^[^\s"'<>/=]+/.exec( attributeText.slice( index ) );

		if ( ! nameMatch ) {
			return false;
		}

		const attributeName = nameMatch[ 0 ].toLowerCase();
		if ( seenAttributes.has( attributeName ) ) {
			return false;
		}
		seenAttributes.add( attributeName );
		index += nameMatch[ 0 ].length;

		while ( /\s/.test( attributeText[ index ] ?? '' ) ) {
			index++;
		}

		if ( attributeText[ index ] !== '=' ) {
			continue;
		}

		index++;
		while ( /\s/.test( attributeText[ index ] ?? '' ) ) {
			index++;
		}

		const quote = attributeText[ index ];
		if ( quote === '"' || quote === "'" ) {
			const endQuote = attributeText.indexOf( quote, index + 1 );
			if ( endQuote === -1 ) {
				return false;
			}
			index = endQuote + 1;
			continue;
		}

		const valueMatch = /^[^\s"'=<>`]+/.exec( attributeText.slice( index ) );
		if ( ! valueMatch ) {
			return false;
		}
		index += valueMatch[ 0 ].length;
	}

	return true;
}

function appendHTMLSourceTextStructure(
	nodes: HTMLFragmentStructureNode[],
	text: string
): void {
	if ( text ) {
		nodes.push( [ 'text' ] );
	}
}

function getHTMLFragmentSourceStructure(
	html: string
): HTMLFragmentStructureNode[] | null {
	const rootNodes: HTMLFragmentStructureNode[] = [];
	const nodeStack = [ rootNodes ];
	const openTags: string[] = [];
	let index = 0;

	while ( index < html.length ) {
		const tagStart = html.indexOf( '<', index );
		if ( tagStart === -1 ) {
			appendHTMLSourceTextStructure(
				nodeStack[ nodeStack.length - 1 ],
				html.slice( index )
			);
			return openTags.length === 0 ? rootNodes : null;
		}

		appendHTMLSourceTextStructure(
			nodeStack[ nodeStack.length - 1 ],
			html.slice( index, tagStart )
		);

		if ( html.startsWith( '<!--', tagStart ) ) {
			const commentEnd = html.indexOf( '-->', tagStart + 4 );
			if ( commentEnd === -1 ) {
				return null;
			}
			nodeStack[ nodeStack.length - 1 ].push( [ 'comment' ] );
			index = commentEnd + 3;
			continue;
		}

		const tagEnd = findHTMLTagEnd( html, tagStart );
		if ( tagEnd === -1 ) {
			return null;
		}

		const tagText = html.slice( tagStart + 1, tagEnd ).trim();
		if (
			! tagText ||
			tagText.startsWith( '!' ) ||
			tagText.startsWith( '?' )
		) {
			return null;
		}

		if ( tagText.startsWith( '/' ) ) {
			const closeMatch = /^\/([A-Za-z][A-Za-z0-9:-]*)\s*$/.exec(
				tagText
			);
			if ( ! closeMatch ) {
				return null;
			}

			const tagName = closeMatch[ 1 ].toLowerCase();
			if ( VOID_HTML_TAGS.has( tagName ) || openTags.pop() !== tagName ) {
				return null;
			}

			nodeStack.pop();
			index = tagEnd + 1;
			continue;
		}

		const openMatch = /^([A-Za-z][A-Za-z0-9:-]*)([\s\S]*)$/.exec( tagText );
		if ( ! openMatch ) {
			return null;
		}

		const tagName = openMatch[ 1 ].toLowerCase();
		const rawAttributeText = openMatch[ 2 ];
		const isSelfClosing = /\/\s*$/.test( rawAttributeText );
		const attributeText = isSelfClosing
			? rawAttributeText.replace( /\/\s*$/, '' )
			: rawAttributeText;

		if (
			( isSelfClosing && ! VOID_HTML_TAGS.has( tagName ) ) ||
			! areHTMLAttributesWellFormed( attributeText )
		) {
			return null;
		}

		const childNodes: HTMLFragmentStructureNode[] = [];
		nodeStack[ nodeStack.length - 1 ].push( [
			'element',
			tagName,
			childNodes,
		] );
		if ( ! VOID_HTML_TAGS.has( tagName ) ) {
			openTags.push( tagName );
			nodeStack.push( childNodes );
		}

		index = tagEnd + 1;
	}

	return openTags.length === 0 ? rootNodes : null;
}

function getHTMLFragmentDOMStructure(
	nodes: Node[]
): HTMLFragmentStructureNode[] {
	return nodes.flatMap( ( node ): HTMLFragmentStructureNode[] => {
		if ( node.nodeType === Node.TEXT_NODE ) {
			return node.textContent ? [ [ 'text' ] ] : [];
		}

		if ( node.nodeType === Node.COMMENT_NODE ) {
			return [ [ 'comment' ] ];
		}

		if ( node.nodeType === Node.ELEMENT_NODE ) {
			const element = node as Element;
			return [
				[
					'element',
					element.tagName.toLowerCase(),
					getHTMLFragmentDOMStructure(
						Array.from( element.childNodes )
					),
				],
			];
		}

		return [ [ 'other', node.nodeType ] ];
	} );
}

function appendHTMLTextNode( nodes: unknown[], text: string ): void {
	const lastNode = nodes[ nodes.length - 1 ];
	if ( Array.isArray( lastNode ) && lastNode[ 0 ] === 'text' ) {
		lastNode[ 1 ] = `${ lastNode[ 1 ] }${ text }`;
		return;
	}

	nodes.push( [ 'text', text ] );
}

function getHTMLFragmentComparisonTree(
	html: string,
	preserveWhiteSpace = false
): unknown {
	if ( typeof document === 'undefined' ) {
		return null;
	}

	const sourceStructure = getHTMLFragmentSourceStructure( html );
	if ( ! sourceStructure ) {
		return null;
	}

	const template = document.createElement( 'template' );
	template.innerHTML = html;

	if (
		! fastDeepEqual(
			sourceStructure,
			getHTMLFragmentDOMStructure(
				Array.from( template.content.childNodes )
			)
		)
	) {
		return null;
	}

	const normalizeNodes = ( nodes: Node[] ): unknown[] => {
		const normalizedNodes: unknown[] = [];
		nodes.forEach( ( node ) => {
			const normalizedNode = normalizeNode( node );
			if (
				Array.isArray( normalizedNode ) &&
				normalizedNode[ 0 ] === 'text'
			) {
				appendHTMLTextNode(
					normalizedNodes,
					normalizedNode[ 1 ] as string
				);
				return;
			}

			normalizedNodes.push( normalizedNode );
		} );

		return normalizedNodes;
	};

	const normalizeNode = ( node: Node ): unknown => {
		if ( node.nodeType === Node.TEXT_NODE ) {
			return [ 'text', node.textContent ?? '' ];
		}

		if ( node.nodeType === Node.ELEMENT_NODE ) {
			const element = node as Element;
			const tagName = element.tagName.toLowerCase();
			if (
				preserveWhiteSpace &&
				tagName === 'br' &&
				element.attributes.length === 0
			) {
				return [ 'text', '\n' ];
			}

			return [
				'element',
				tagName,
				Array.from( element.attributes )
					.map( ( attr ) => [ attr.name, attr.value ] )
					.sort( ( [ a ], [ b ] ) => a.localeCompare( b ) ),
				normalizeNodes( Array.from( element.childNodes ) ),
			];
		}

		return [ node.nodeType, node.nodeName, node.textContent ?? '' ];
	};

	return normalizeNodes( Array.from( template.content.childNodes ) );
}

function getComparableRichTextValue(
	value: string,
	preserveWhiteSpace = false
): unknown {
	return getHTMLFragmentComparisonTree( value, preserveWhiteSpace ) ?? value;
}

function areRichTextValuesEquivalent(
	currentValue: string,
	incomingValue: string,
	preserveWhiteSpace = false
): boolean {
	if ( currentValue === incomingValue ) {
		return true;
	}

	const currentComparisonTree = getHTMLFragmentComparisonTree(
		currentValue,
		preserveWhiteSpace
	);
	const incomingComparisonTree = getHTMLFragmentComparisonTree(
		incomingValue,
		preserveWhiteSpace
	);

	return (
		currentComparisonTree !== null &&
		incomingComparisonTree !== null &&
		fastDeepEqual( currentComparisonTree, incomingComparisonTree )
	);
}

/**
 * @param {any}   gblock
 * @param {Y.Map} yblock
 */
function areBlocksEqual( gblock: Block, yblock: YBlock ): boolean {
	return areBlockRecordsEquivalent(
		gblock,
		yblock.toJSON() as unknown as Block
	);
}

function createNewYAttributeMap(
	blockName: string,
	attributes: BlockAttributes
): YBlockAttributes {
	return new Y.Map(
		Object.entries( attributes ).map(
			( [ attributeName, attributeValue ] ) => {
				return [
					attributeName,
					createNewYAttributeValue(
						blockName,
						attributeName,
						attributeValue
					),
				];
			}
		)
	);
}

function createNewYAttributeValue(
	blockName: string,
	attributeName: string,
	attributeValue: unknown
): Y.Text | Y.Array< unknown > | Y.Map< unknown > | unknown {
	const schema = getBlockAttributeSchema( blockName, attributeName );
	return createYValueFromSchema( schema, attributeValue, attributeName );
}

/**
 * Recursively create the appropriate Y.js type for a value based on its
 * block-attribute schema.
 *
 * - `rich-text`          -> Y.Text
 * - `array`  with query  -> Y.Array of Y.Maps
 * - `object` with query  -> Y.Map
 * - anything else        -> plain value (unchanged)
 *
 * @param schema    The attribute type definition.
 * @param value     The plain JS value to convert.
 * @param valuePath Path used to identify nested values in array/query attributes.
 * @return A Y.js type or the original value.
 */
function createYValueFromSchema(
	schema: BlockAttributeSchema | undefined,
	value: unknown,
	valuePath?: string
): Y.Text | Y.Array< unknown > | Y.Map< unknown > | unknown {
	if ( ! schema ) {
		return value;
	}

	if ( schema.type === 'rich-text' ) {
		return new Y.Text( value?.toString() ?? '' );
	}

	if ( schema.type === 'array' && schema.query && Array.isArray( value ) ) {
		const query = schema.query;
		const yArray = new Y.Array< Y.Map< unknown > >();

		yArray.insert(
			0,
			value.map( ( item, index ) =>
				createYMapFromQuery(
					query,
					item,
					valuePath ? `${ valuePath }/${ index }` : true
				)
			)
		);

		return yArray;
	}

	if ( schema.type === 'object' && schema.query && isRecord( value ) ) {
		return createYMapFromQuery( schema.query, value, undefined, valuePath );
	}

	return value;
}

/**
 * Type guard that narrows `unknown` to `Record< string, unknown >`.
 *
 * @param value Value to check.
 * @return True if `value` is a non-null, non-array object.
 */
function isRecord( value: unknown ): value is Record< string, unknown > {
	return !! value && typeof value === 'object' && ! Array.isArray( value );
}

/**
 * Create a Y.Map from a plain object, using a query schema to decide which
 * properties should become nested Y.js types (Y.Text, Y.Array, Y.Map).
 *
 * @param query          The query schema defining the properties.
 * @param obj            The plain object to convert.
 * @param arrayElementId Existing or requested stable array element identifier.
 * @param valuePath      Path used to identify nested values in array/query attributes.
 * @return A Y.Map with typed values.
 */
function createYMapFromQuery(
	query: Record< string, BlockAttributeSchema >,
	obj: unknown,
	arrayElementId?: string | true,
	valuePath?: string
): Y.Map< unknown > {
	if ( ! isRecord( obj ) ) {
		return new Y.Map();
	}

	const nestedValuePath =
		valuePath ??
		( typeof arrayElementId === 'string' ? arrayElementId : undefined );
	const entries: [ string, unknown ][] = Object.entries( obj )
		.filter( ( [ key ] ) => key !== ARRAY_ELEMENT_ID_KEY )
		.map( ( [ key, val ] ): [ string, unknown ] => {
			const subSchema = query[ key ];
			return [
				key,
				createYValueFromSchema(
					subSchema,
					val,
					nestedValuePath ? `${ nestedValuePath }/${ key }` : key
				),
			];
		} );

	const resolvedArrayElementId =
		getArrayElementId( obj ) ??
		( arrayElementId === true ? uuidv4() : arrayElementId );

	if ( resolvedArrayElementId ) {
		entries.push( [ ARRAY_ELEMENT_ID_KEY, resolvedArrayElementId ] );
	}

	return new Y.Map( entries );
}

function createNewYBlock( block: Block ): YBlock {
	return createYMap< YBlockRecord >(
		Object.fromEntries(
			Object.entries( block ).map( ( [ key, value ] ) => {
				switch ( key ) {
					case 'attributes': {
						return [
							key,
							createNewYAttributeMap( block.name, value ),
						];
					}

					case 'innerBlocks': {
						const innerBlocks = new Y.Array();

						// If not an array, set to empty Y.Array.
						if ( ! Array.isArray( value ) ) {
							return [ key, innerBlocks ];
						}

						innerBlocks.insert(
							0,
							value.map( ( innerBlock: Block ) =>
								createNewYBlock( innerBlock )
							)
						);

						return [ key, innerBlocks ];
					}

					default:
						return [ key, value ];
				}
			} )
		)
	);
}

function getBlockClientId( block: Block ): string | null {
	return block.clientId || null;
}

function getYBlockClientId( yblock: YBlock ): string | null {
	const clientId = yblock.get( 'clientId' );
	return typeof clientId === 'string' && clientId ? clientId : null;
}

function hasDifferentIdentifiedBlockName(
	yblock: YBlock,
	baseBlock?: Block,
	block?: Block
): boolean {
	const blockClientId = baseBlock ? getBlockClientId( baseBlock ) : null;
	const yblockClientId = getYBlockClientId( yblock );
	const yblockName = yblock.get( 'name' );
	const blockNames = [ baseBlock?.name, block?.name ].filter(
		( name ): name is string => !! name
	);

	return !! (
		typeof yblockName === 'string' &&
		blockClientId &&
		yblockClientId &&
		blockClientId !== yblockClientId &&
		blockNames.some( ( blockName ) => blockName !== yblockName )
	);
}

function normalizeBlockAttributeForComparison(
	value: unknown,
	schema: BlockAttributeSchema | undefined
): unknown {
	if ( schema?.type === 'rich-text' && typeof value === 'string' ) {
		return getComparableRichTextValue(
			value,
			schema.__unstablePreserveWhiteSpace
		);
	}

	if ( schema?.type === 'array' && schema.query && Array.isArray( value ) ) {
		return value.map( ( item ) =>
			normalizeQueryObjectForComparison( item, schema.query )
		);
	}

	if ( schema?.type === 'object' && schema.query ) {
		return normalizeQueryObjectForComparison( value, schema.query );
	}

	return normalizeBlockForComparison( value );
}

function normalizeQueryObjectForComparison(
	value: unknown,
	query: Record< string, BlockAttributeSchema >
): unknown {
	if ( Array.isArray( value ) ) {
		return value.map( ( item ) =>
			normalizeQueryObjectForComparison( item, query )
		);
	}

	if ( isRecord( value ) ) {
		return Object.fromEntries(
			Object.entries( value )
				.sort( ( [ a ], [ b ] ) => a.localeCompare( b ) )
				.map( ( [ key, innerValue ] ) => [
					key,
					normalizeBlockAttributeForComparison(
						innerValue,
						query[ key ]
					),
				] )
		);
	}

	return value;
}

function normalizeBlockAttributesForComparison(
	blockName: string,
	attributes: BlockAttributes
): unknown {
	return Object.fromEntries(
		Object.entries( attributes )
			.sort( ( [ a ], [ b ] ) => a.localeCompare( b ) )
			.map( ( [ key, value ] ) => [
				key,
				normalizeBlockAttributeForComparison(
					value,
					getBlockAttributeSchema( blockName, key )
				),
			] )
	);
}

function haveSameKeys(
	left: Record< string, unknown >,
	right: Record< string, unknown >
): boolean {
	const leftKeys = Object.keys( left ).sort();
	const rightKeys = Object.keys( right ).sort();

	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every( ( key, index ) => key === rightKeys[ index ] )
	);
}

function areQueryValuesEquivalent(
	left: unknown,
	right: unknown,
	query: Record< string, BlockAttributeSchema >
): boolean {
	if ( fastDeepEqual( left, right ) ) {
		return true;
	}

	if ( Array.isArray( left ) && Array.isArray( right ) ) {
		return (
			left.length === right.length &&
			left.every( ( value, index ) =>
				areQueryValuesEquivalent( value, right[ index ], query )
			)
		);
	}

	if ( isRecord( left ) && isRecord( right ) ) {
		return (
			haveSameKeys( left, right ) &&
			Object.keys( left ).every( ( key ) =>
				areBlockAttributeValuesEquivalent(
					left[ key ],
					right[ key ],
					query[ key ]
				)
			)
		);
	}

	return false;
}

function areBlockAttributeValuesEquivalent(
	left: unknown,
	right: unknown,
	schema: BlockAttributeSchema | undefined
): boolean {
	if ( fastDeepEqual( left, right ) ) {
		return true;
	}

	if (
		schema?.type === 'rich-text' &&
		typeof left === 'string' &&
		typeof right === 'string'
	) {
		return areRichTextValuesEquivalent(
			left,
			right,
			schema.__unstablePreserveWhiteSpace
		);
	}

	if (
		schema?.type === 'array' &&
		schema.query &&
		Array.isArray( left ) &&
		Array.isArray( right )
	) {
		const query = schema.query;
		return (
			left.length === right.length &&
			left.every( ( value, index ) =>
				areQueryValuesEquivalent( value, right[ index ], query )
			)
		);
	}

	if ( schema?.type === 'object' && schema.query ) {
		return areQueryValuesEquivalent( left, right, schema.query );
	}

	return false;
}

function areBlockAttributesEquivalent(
	blockName: string,
	left: BlockAttributes,
	right: BlockAttributes
): boolean {
	if ( fastDeepEqual( left, right ) ) {
		return true;
	}

	return (
		haveSameKeys( left, right ) &&
		Object.keys( left ).every( ( key ) =>
			areBlockAttributeValuesEquivalent(
				left[ key ],
				right[ key ],
				getBlockAttributeSchema( blockName, key )
			)
		)
	);
}

function getBlockFieldsForComparison(
	block: Block
): Record< string, unknown > {
	return Object.fromEntries(
		Object.entries( block ).filter(
			( [ key ] ) =>
				key !== 'attributes' &&
				key !== 'clientId' &&
				key !== 'innerBlocks'
		)
	);
}

function areBlockRecordsEquivalent( left: Block, right: Block ): boolean {
	const leftInnerBlocks = left.innerBlocks ?? [];
	const rightInnerBlocks = right.innerBlocks ?? [];

	return (
		fastDeepEqual(
			getBlockFieldsForComparison( left ),
			getBlockFieldsForComparison( right )
		) &&
		areBlockAttributesEquivalent(
			left.name,
			left.attributes ?? {},
			right.attributes ?? {}
		) &&
		leftInnerBlocks.length === rightInnerBlocks.length &&
		leftInnerBlocks.every( ( block, index ) =>
			areBlockRecordsEquivalent( block, rightInnerBlocks[ index ] )
		)
	);
}

function normalizeBlockForComparison( value: unknown ): unknown {
	if ( Array.isArray( value ) ) {
		return value.map( normalizeBlockForComparison );
	}

	if ( isRecord( value ) ) {
		const blockName = typeof value.name === 'string' ? value.name : '';

		return Object.fromEntries(
			Object.entries( value )
				.filter( ( [ key ] ) => key !== 'clientId' )
				.sort( ( [ a ], [ b ] ) => a.localeCompare( b ) )
				.map( ( [ key, innerValue ] ) => {
					if ( key === 'attributes' && isRecord( innerValue ) ) {
						return [
							key,
							normalizeBlockAttributesForComparison(
								blockName,
								innerValue
							),
						];
					}

					return [ key, normalizeBlockForComparison( innerValue ) ];
				} )
		);
	}

	return value;
}

function getComparableBlockValue( block: Block ): unknown {
	return normalizeBlockForComparison( block );
}

function getBlockSemanticKey( block: Block ): string {
	return JSON.stringify( getComparableBlockValue( block ) );
}

function isSameBlockIdentity( firstBlock: Block, secondBlock: Block ): boolean {
	const firstClientId = getBlockClientId( firstBlock );
	const secondClientId = getBlockClientId( secondBlock );

	if ( firstClientId || secondClientId ) {
		return firstClientId === secondClientId;
	}

	return (
		getBlockSemanticKey( firstBlock ) === getBlockSemanticKey( secondBlock )
	);
}

function getYBlockSemanticKey( yblock: YBlock ): string {
	return getBlockSemanticKey( yblock.toJSON() as unknown as Block );
}

function findEquivalentYBlockIndex( yblocks: YBlocks, block: Block ): number {
	const clientId = getBlockClientId( block );

	if ( clientId ) {
		for ( let index = 0; index < yblocks.length; index++ ) {
			if ( getYBlockClientId( yblocks.get( index ) ) === clientId ) {
				return index;
			}
		}

		return -1;
	}

	const semanticKey = getBlockSemanticKey( block );

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );

		if ( getYBlockSemanticKey( yblock ) === semanticKey ) {
			return index;
		}

		if ( areBlocksEqual( block, yblock ) ) {
			return index;
		}
	}

	return -1;
}

function getUniqueKeys< T >(
	items: T[],
	getKey: ( item: T ) => string | null
): string[] | null {
	const keys: string[] = [];
	const seenKeys = new Set< string >();

	for ( const item of items ) {
		const key = getKey( item );

		if ( ! key || seenKeys.has( key ) ) {
			return null;
		}

		keys.push( key );
		seenKeys.add( key );
	}

	return keys;
}

function cacheObservedTopLevelClientIds( yblocks: YBlocks ): void {
	const observedClientIds =
		observedTopLevelClientIdsCache.get( yblocks ) ?? new Set< string >();

	yblocks.toArray().forEach( ( yblock ) => {
		const clientId = getYBlockClientId( yblock );
		if ( clientId ) {
			observedClientIds.add( clientId );
		}
	} );

	observedTopLevelClientIdsCache.set( yblocks, observedClientIds );
}

function getBlockTreeClientIdSet( blocks: Block[] ): Set< string > | null {
	const clientIds = new Set< string >();
	const visitBlock = ( block: Block ): boolean => {
		const clientId = getBlockClientId( block );
		if ( clientId ) {
			if ( clientIds.has( clientId ) ) {
				return false;
			}
			clientIds.add( clientId );
		}

		return ( block.innerBlocks ?? [] ).every( visitBlock );
	};

	return blocks.every( visitBlock ) ? clientIds : null;
}

function getBlockIdentityKeys(
	yblocks: YBlocks,
	baseBlocks: Block[],
	blocksToSync: Block[]
): {
	currentKeys: string[];
	baseKeys: string[];
	incomingKeys: string[];
} | null {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( currentClientIds && baseClientIds && incomingClientIds ) {
		const currentSet = new Set( currentClientIds );
		const baseSet = new Set( baseClientIds );

		if (
			currentSet.size === baseSet.size &&
			incomingClientIds.length === baseClientIds.length &&
			baseClientIds.every( ( key ) => currentSet.has( key ) ) &&
			incomingClientIds.every( ( key ) => baseSet.has( key ) )
		) {
			return {
				currentKeys: currentClientIds,
				baseKeys: baseClientIds,
				incomingKeys: incomingClientIds,
			};
		}
	}

	const currentBlocks = yblocks.toArray().map( ( yblock ) => {
		return yblock.toJSON() as unknown as Block;
	} );
	const currentSemanticKeys = getUniqueKeys(
		currentBlocks,
		getBlockSemanticKey
	);
	const baseSemanticKeys = getUniqueKeys( baseBlocks, getBlockSemanticKey );
	const incomingSemanticKeys = getUniqueKeys(
		blocksToSync,
		getBlockSemanticKey
	);

	if (
		! currentSemanticKeys ||
		! baseSemanticKeys ||
		! incomingSemanticKeys
	) {
		return null;
	}

	const currentSet = new Set( currentSemanticKeys );
	const baseSet = new Set( baseSemanticKeys );

	if (
		currentSet.size !== baseSet.size ||
		incomingSemanticKeys.length !== baseSemanticKeys.length ||
		! baseSemanticKeys.every( ( key ) => currentSet.has( key ) ) ||
		! incomingSemanticKeys.every( ( key ) => baseSet.has( key ) )
	) {
		return null;
	}

	return {
		currentKeys: currentSemanticKeys,
		baseKeys: baseSemanticKeys,
		incomingKeys: incomingSemanticKeys,
	};
}

function getUniqueBlockMapBySemanticKey(
	blocks: Block[]
): Map< string, Block > | null {
	const blockMap = new Map< string, Block >();

	for ( const block of blocks ) {
		const key = getBlockSemanticKey( block );

		if ( blockMap.has( key ) ) {
			return null;
		}

		blockMap.set( key, block );
	}

	return blockMap;
}

function canReorderYBlocksByClientId(
	yblocks: YBlocks,
	blocksToSync: Block[]
): boolean {
	if ( yblocks.length !== blocksToSync.length || yblocks.length < 2 ) {
		return false;
	}

	const incomingClientIds = blocksToSync.map( getBlockClientId );
	const currentClientIds = yblocks.toArray().map( getYBlockClientId );

	if (
		incomingClientIds.some( ( clientId ) => ! clientId ) ||
		currentClientIds.some( ( clientId ) => ! clientId )
	) {
		return false;
	}

	const incomingSet = new Set( incomingClientIds );

	if ( incomingSet.size !== incomingClientIds.length ) {
		return false;
	}

	const currentSet = new Set( currentClientIds );

	return (
		currentSet.size === currentClientIds.length &&
		currentSet.size === incomingSet.size &&
		currentClientIds.every( ( clientId ) => incomingSet.has( clientId ) )
	);
}

function reorderYBlocksByClientId(
	yblocks: YBlocks,
	blocksToSync: Block[]
): void {
	if ( ! canReorderYBlocksByClientId( yblocks, blocksToSync ) ) {
		return;
	}

	for (
		let targetIndex = 0;
		targetIndex < blocksToSync.length;
		targetIndex++
	) {
		const targetClientId = getBlockClientId( blocksToSync[ targetIndex ] );

		if (
			getYBlockClientId( yblocks.get( targetIndex ) ) === targetClientId
		) {
			continue;
		}

		const currentIndex = yblocks
			.toArray()
			.findIndex(
				( yblock ) => getYBlockClientId( yblock ) === targetClientId
			);

		if ( currentIndex === -1 ) {
			return;
		}

		const reorderedBlock = createNewYBlock( blocksToSync[ targetIndex ] );
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );
	}
}

function rebaseYBlocksByClientId(
	yblocks: YBlocks,
	baseBlocks: Block[] | undefined,
	blocksToSync: Block[]
): boolean {
	if ( ! baseBlocks || yblocks.length !== blocksToSync.length ) {
		return false;
	}

	const identityKeys = getBlockIdentityKeys(
		yblocks,
		baseBlocks,
		blocksToSync
	);

	if ( ! identityKeys || identityKeys.baseKeys.length < 2 ) {
		return false;
	}

	const rebasedKeys = [ ...identityKeys.baseKeys ];

	for (
		let targetIndex = 0;
		targetIndex < blocksToSync.length;
		targetIndex++
	) {
		const targetKey = identityKeys.incomingKeys[ targetIndex ];

		if ( rebasedKeys[ targetIndex ] === targetKey ) {
			continue;
		}

		const baseIndex = rebasedKeys.indexOf( targetKey );
		const currentIndex = identityKeys.currentKeys.indexOf( targetKey );

		if ( baseIndex === -1 || currentIndex === -1 ) {
			return false;
		}

		const reorderedBlock = createNewYBlock(
			yblocks.get( currentIndex ).toJSON() as unknown as Block
		);
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );

		identityKeys.currentKeys.splice( currentIndex, 1 );
		identityKeys.currentKeys.splice( targetIndex, 0, targetKey );
		rebasedKeys.splice( baseIndex, 1 );
		rebasedKeys.splice( targetIndex, 0, targetKey );
	}

	return true;
}

function mergeYBlocksExplicitBaseReorder(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if (
		yblocks.length < 2 ||
		yblocks.length !== blocksToSync.length ||
		! baseBlocks.length ||
		baseBlocks.length >= blocksToSync.length
	) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentSet = new Set( currentClientIds );
	const incomingSet = new Set( incomingClientIds );

	if (
		currentSet.size !== incomingSet.size ||
		! currentClientIds.every( ( clientId ) => incomingSet.has( clientId ) )
	) {
		return false;
	}

	const baseSet = new Set( baseClientIds );

	if (
		! baseClientIds.every(
			( clientId ) =>
				currentSet.has( clientId ) && incomingSet.has( clientId )
		) ||
		currentClientIds.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	for ( const yblock of yblocks.toArray() ) {
		const clientId = getYBlockClientId( yblock );

		if ( ! clientId || baseSet.has( clientId ) ) {
			continue;
		}

		const block = incomingBlocksByClientId.get( clientId );

		if ( ! block || ! areBlocksEqual( block, yblock ) ) {
			return false;
		}
	}

	for (
		let targetIndex = 0;
		targetIndex < incomingClientIds.length;
		targetIndex++
	) {
		const targetClientId = incomingClientIds[ targetIndex ];

		if ( currentClientIds[ targetIndex ] === targetClientId ) {
			continue;
		}

		const currentIndex = currentClientIds.indexOf( targetClientId );

		if ( currentIndex === -1 ) {
			return false;
		}

		const reorderedBlock = createNewYBlock(
			yblocks.get( currentIndex ).toJSON() as unknown as Block
		);
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );

		currentClientIds.splice( currentIndex, 1 );
		currentClientIds.splice( targetIndex, 0, targetClientId );
	}

	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );

		if ( ! clientId || ! baseSet.has( clientId ) ) {
			continue;
		}

		const block = incomingBlocksByClientId.get( clientId );
		const baseBlock = baseBlocksByClientId.get( clientId );

		if ( block && baseBlock ) {
			mergeBlockIntoYBlock( yblock, block, attributeCursor, baseBlock );
		}
	}

	return true;
}

function mergeYBlocksExplicitBaseDeleteWithInsert(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentSet = new Set( currentClientIds );
	const baseSet = new Set( baseClientIds );
	const incomingSet = new Set( incomingClientIds );
	const deletedBaseClientIds = baseClientIds.filter(
		( clientId ) => ! currentSet.has( clientId )
	);
	const insertedIncomingClientIds = incomingClientIds.filter(
		( clientId ) => ! baseSet.has( clientId )
	);

	if (
		deletedBaseClientIds.length === 0 ||
		insertedIncomingClientIds.length === 0 ||
		! currentClientIds.every( ( clientId ) => baseSet.has( clientId ) ) ||
		! currentClientIds.every( ( clientId ) =>
			incomingSet.has( clientId )
		) ||
		! deletedBaseClientIds.every(
			( clientId ) => ! incomingSet.has( clientId )
		) ||
		! incomingClientIds.every(
			( clientId ) =>
				currentSet.has( clientId ) || ! baseSet.has( clientId )
		)
	) {
		return false;
	}

	const baseRetainedClientIds = baseClientIds.filter( ( clientId ) =>
		currentSet.has( clientId )
	);
	const incomingRetainedClientIds = incomingClientIds.filter( ( clientId ) =>
		currentSet.has( clientId )
	);

	if (
		! fastDeepEqual( currentClientIds, baseRetainedClientIds ) ||
		! fastDeepEqual( currentClientIds, incomingRetainedClientIds )
	) {
		return false;
	}

	const baseBlocksByClientId = new Map< string, Block >();
	baseBlocks.forEach( ( block ) => {
		const clientId = getBlockClientId( block );

		if ( clientId ) {
			baseBlocksByClientId.set( clientId, block );
		}
	} );

	for (
		let targetIndex = 0;
		targetIndex < blocksToSync.length;
		targetIndex++
	) {
		const block = blocksToSync[ targetIndex ];
		const clientId = getBlockClientId( block );

		if ( ! clientId ) {
			return false;
		}

		if ( ! currentSet.has( clientId ) ) {
			yblocks.insert( targetIndex, [ createNewYBlock( block ) ] );
			continue;
		}

		const currentIndex = yblocks
			.toArray()
			.findIndex(
				( yblock ) => getYBlockClientId( yblock ) === clientId
			);

		if ( currentIndex === -1 ) {
			return false;
		}

		mergeBlockIntoYBlock(
			yblocks.get( currentIndex ),
			block,
			attributeCursor,
			baseBlocksByClientId.get( clientId )
		);
	}

	return true;
}

function mergeBlockIntoYBlock(
	yblock: YBlock,
	block: Block,
	attributeCursor: MergeCursorPosition,
	baseBlock?: Block
): void {
	const baseAttributes = baseBlock?.attributes ?? {};

	Object.entries( block ).forEach( ( [ key, value ] ) => {
		switch ( key ) {
			case 'attributes': {
				const currentAttributes = yblock.get( key );

				// If attributes are not set on the yblock, use the new values.
				if ( ! currentAttributes ) {
					yblock.set(
						key,
						createNewYAttributeMap( block.name, value )
					);
					break;
				}

				Object.entries( value ).forEach(
					( [ attributeName, attributeValue ] ) => {
						const currentAttribute =
							currentAttributes?.get( attributeName );
						const schema = getBlockAttributeSchema(
							block.name,
							attributeName
						);

						const isExpectedType = isExpectedAttributeType(
							block.name,
							attributeName,
							currentAttribute
						);

						if (
							baseBlock &&
							isExpectedType &&
							areBlockAttributeValuesEquivalent(
								baseAttributes[ attributeName ],
								attributeValue,
								schema
							)
						) {
							return;
						}

						// Y types (Y.Text, Y.Array, Y.Map) cannot be compared
						// with fastDeepEqual against plain values. Delegate to
						// mergeYValue which handles no-op detection at the edges.
						const isYType =
							currentAttribute instanceof Y.AbstractType;

						const isAttributeChanged =
							! isExpectedType ||
							isYType ||
							! fastDeepEqual( currentAttribute, attributeValue );

						if ( isAttributeChanged ) {
							updateYBlockAttribute(
								block.name,
								block.clientId,
								attributeName,
								attributeValue,
								currentAttributes,
								attributeCursor,
								baseAttributes[ attributeName ]
							);
						}
					}
				);

				// Delete any attributes that are no longer present.
				currentAttributes.forEach(
					( _attrValue: unknown, attrName: string ) => {
						if ( ! value.hasOwnProperty( attrName ) ) {
							if (
								baseBlock &&
								! Object.prototype.hasOwnProperty.call(
									baseAttributes,
									attrName
								)
							) {
								return;
							}
							currentAttributes.delete( attrName );
						}
					}
				);

				break;
			}

			case 'innerBlocks': {
				if (
					baseBlock &&
					fastDeepEqual( baseBlock.innerBlocks, value ?? [] )
				) {
					break;
				}

				// Recursively merge innerBlocks.
				let yInnerBlocks = yblock.get( key );

				if ( ! ( yInnerBlocks instanceof Y.Array ) ) {
					yInnerBlocks = new Y.Array< YBlock >();
					yblock.set( key, yInnerBlocks );
				}

				mergeCrdtBlocks(
					yInnerBlocks,
					value ?? [],
					attributeCursor,
					baseBlock?.innerBlocks,
					false
				);
				break;
			}

			default: {
				const blockKey = key as keyof Block;

				if (
					baseBlock &&
					fastDeepEqual( baseBlock[ blockKey ], value )
				) {
					break;
				}

				if ( ! fastDeepEqual( value, yblock.get( key ) ) ) {
					yblock.set( key, value );
				}
			}
		}
	} );
	yblock.forEach( ( _v, k ) => {
		if ( ! Object.hasOwn( block, k ) ) {
			if (
				baseBlock &&
				! Object.prototype.hasOwnProperty.call( baseBlock, k )
			) {
				return;
			}
			yblock.delete( k );
		}
	} );
}

function mergeYBlocksByClientId(
	yblocks: YBlocks,
	blocksToSync: Block[],
	attributeCursor: MergeCursorPosition,
	baseBlocks?: Block[]
): void {
	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [ getBlockClientId( block ), block ] )
	);
	const baseBlocksByClientId = new Map(
		( baseBlocks ?? [] ).map( ( block ) => [
			getBlockClientId( block ),
			block,
		] )
	);
	let incomingBlocksBySemanticKey: Map< string, Block > | null | undefined;
	let baseBlocksBySemanticKey: Map< string, Block > | null | undefined;

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		let block = incomingBlocksByClientId.get( clientId );
		let baseBlock = baseBlocksByClientId.get( clientId );

		if ( ! block ) {
			if ( incomingBlocksBySemanticKey === undefined ) {
				incomingBlocksBySemanticKey =
					getUniqueBlockMapBySemanticKey( blocksToSync );
				baseBlocksBySemanticKey = baseBlocks
					? getUniqueBlockMapBySemanticKey( baseBlocks )
					: null;
			}

			if ( incomingBlocksBySemanticKey ) {
				const semanticKey = getBlockSemanticKey(
					yblock.toJSON() as unknown as Block
				);
				block = incomingBlocksBySemanticKey.get( semanticKey );
				baseBlock = baseBlocksBySemanticKey?.get( semanticKey );
			}
		}

		if ( block ) {
			mergeBlockIntoYBlock( yblock, block, attributeCursor, baseBlock );
		}
	}
}

function isOrderedSubsequence(
	candidateKeys: string[],
	baseKeys: string[]
): boolean {
	let baseIndex = 0;

	for ( const candidateKey of candidateKeys ) {
		while (
			baseIndex < baseKeys.length &&
			baseKeys[ baseIndex ] !== candidateKey
		) {
			baseIndex++;
		}

		if ( baseIndex >= baseKeys.length ) {
			return false;
		}

		baseIndex++;
	}

	return true;
}

type BlockClientIdOccurrence = {
	block: Block;
	clientId: string;
	depth: number;
	parentClientId: string | null;
};

function getBlockTreeClientIdOccurrences(
	blocks: Block[],
	parentClientId: string | null = null,
	depth = 0
): BlockClientIdOccurrence[] | null {
	const occurrences: BlockClientIdOccurrence[] = [];

	for ( const block of blocks ) {
		const clientId = getBlockClientId( block );

		if ( ! clientId ) {
			return null;
		}

		occurrences.push( {
			block,
			clientId,
			depth,
			parentClientId,
		} );

		const innerOccurrences = getBlockTreeClientIdOccurrences(
			block.innerBlocks ?? [],
			clientId,
			depth + 1
		);

		if ( ! innerOccurrences ) {
			return null;
		}

		occurrences.push( ...innerOccurrences );
	}

	return occurrences;
}

function getKnownBlockTreeClientIdOccurrences(
	blocks: Block[],
	parentClientId: string | null = null,
	depth = 0
): BlockClientIdOccurrence[] {
	return blocks.flatMap( ( block ) => {
		const clientId = getBlockClientId( block );
		const occurrence = clientId
			? [
					{
						block,
						clientId,
						depth,
						parentClientId,
					},
			  ]
			: [];

		return [
			...occurrence,
			...getKnownBlockTreeClientIdOccurrences(
				block.innerBlocks ?? [],
				clientId ?? parentClientId,
				depth + 1
			),
		];
	} );
}

function getUniqueBlockTreeClientIdOccurrences(
	blocks: Block[]
): BlockClientIdOccurrence[] | null {
	const occurrences = getBlockTreeClientIdOccurrences( blocks );

	if ( ! occurrences ) {
		return null;
	}

	const knownClientIds = new Set< string >();

	for ( const occurrence of occurrences ) {
		if ( knownClientIds.has( occurrence.clientId ) ) {
			return null;
		}

		knownClientIds.add( occurrence.clientId );
	}

	return occurrences;
}

function removeBlockFromTreeByClientId(
	blocks: Block[],
	clientIdToRemove: string
): Block[] {
	return blocks.flatMap( ( block ) => {
		if ( getBlockClientId( block ) === clientIdToRemove ) {
			return [];
		}

		return [
			{
				...block,
				innerBlocks: removeBlockFromTreeByClientId(
					block.innerBlocks ?? [],
					clientIdToRemove
				),
			},
		];
	} );
}

function replaceBlockInTreeByClientId(
	blocks: Block[],
	clientIdToReplace: string,
	replacementBlock: Block
): Block[] {
	return blocks.map( ( block ) => {
		if ( getBlockClientId( block ) === clientIdToReplace ) {
			return replacementBlock;
		}

		return {
			...block,
			innerBlocks: replaceBlockInTreeByClientId(
				block.innerBlocks ?? [],
				clientIdToReplace,
				replacementBlock
			),
		};
	} );
}

function mergeYBlocksPreviousLocalDelete(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if (
		! blocksToSync.length ||
		! baseBlocks.length ||
		blocksToSync.length >= baseBlocks.length
	) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const baseSet = new Set( baseClientIds );

	if (
		! incomingClientIds.every( ( clientId ) => baseSet.has( clientId ) ) ||
		! isOrderedSubsequence( incomingClientIds, baseClientIds )
	) {
		return false;
	}

	const currentSet = new Set( currentClientIds );

	if (
		! incomingClientIds.every( ( clientId ) => currentSet.has( clientId ) )
	) {
		return false;
	}

	const incomingSet = new Set( incomingClientIds );
	const deletedClientIds = baseClientIds.filter(
		( clientId ) => ! incomingSet.has( clientId )
	);
	const deletedSet = new Set( deletedClientIds );

	if (
		! deletedClientIds.length ||
		! deletedClientIds.some( ( clientId ) => currentSet.has( clientId ) )
	) {
		return false;
	}

	const currentRetainedClientIds = currentClientIds.filter( ( clientId ) =>
		incomingSet.has( clientId )
	);

	if (
		currentRetainedClientIds.length !== incomingClientIds.length ||
		! currentRetainedClientIds.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	for ( let index = yblocks.length - 1; index >= 0; index-- ) {
		const clientId = getYBlockClientId( yblocks.get( index ) );

		if ( clientId && deletedSet.has( clientId ) ) {
			yblocks.delete( index, 1 );
		}
	}

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		const block = clientId
			? incomingBlocksByClientId.get( clientId )
			: undefined;

		if ( block ) {
			mergeBlockIntoYBlock(
				yblock,
				block,
				attributeCursor,
				baseBlocksByClientId.get( clientId as string )
			);
		}
	}

	return true;
}

function mergeYBlocksPreviousLocalDeleteReorder(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if (
		! blocksToSync.length ||
		! baseBlocks.length ||
		blocksToSync.length >= baseBlocks.length
	) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const baseSet = new Set( baseClientIds );

	if (
		! incomingClientIds.every( ( clientId ) => baseSet.has( clientId ) )
	) {
		return false;
	}

	const incomingSet = new Set( incomingClientIds );
	const deletedClientIds = baseClientIds.filter(
		( clientId ) => ! incomingSet.has( clientId )
	);

	if ( ! deletedClientIds.length ) {
		return false;
	}

	const deletedSet = new Set( deletedClientIds );
	const incomingTreeOccurrences =
		getUniqueBlockTreeClientIdOccurrences( blocksToSync );

	if (
		! incomingTreeOccurrences ||
		incomingTreeOccurrences.some( ( occurrence ) =>
			deletedSet.has( occurrence.clientId )
		)
	) {
		return false;
	}

	const currentRetainedClientIds = currentClientIds.filter(
		( clientId ) => ! deletedSet.has( clientId )
	);

	if (
		currentRetainedClientIds.length !== incomingClientIds.length ||
		! currentRetainedClientIds.every( ( clientId ) =>
			incomingSet.has( clientId )
		) ||
		currentRetainedClientIds.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	for ( let index = yblocks.length - 1; index >= 0; index-- ) {
		const clientId = getYBlockClientId( yblocks.get( index ) );

		if ( clientId && deletedSet.has( clientId ) ) {
			yblocks.delete( index, 1 );
		}
	}

	const rebasedCurrentClientIds = yblocks
		.toArray()
		.map( getYBlockClientId ) as string[];

	for (
		let targetIndex = 0;
		targetIndex < incomingClientIds.length;
		targetIndex++
	) {
		const targetClientId = incomingClientIds[ targetIndex ];

		if ( rebasedCurrentClientIds[ targetIndex ] === targetClientId ) {
			continue;
		}

		const currentIndex = rebasedCurrentClientIds.indexOf( targetClientId );

		if ( currentIndex === -1 ) {
			return false;
		}

		const reorderedBlock = createNewYBlock(
			yblocks.get( currentIndex ).toJSON() as unknown as Block
		);
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );

		rebasedCurrentClientIds.splice( currentIndex, 1 );
		rebasedCurrentClientIds.splice( targetIndex, 0, targetClientId );
	}

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		const block = clientId
			? incomingBlocksByClientId.get( clientId )
			: undefined;
		const baseBlock = clientId
			? baseBlocksByClientId.get( clientId )
			: undefined;

		if ( block ) {
			mergeBlockIntoYBlock( yblock, block, attributeCursor, baseBlock );
		}
	}

	return true;
}

function mergeYBlocksPreviousLocalCrossParentMove(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentSet = new Set( currentClientIds );
	const baseSet = new Set( baseClientIds );
	const incomingSet = new Set( incomingClientIds );
	const sourceClientIds = baseClientIds.filter(
		( clientId ) =>
			currentSet.has( clientId ) && ! incomingSet.has( clientId )
	);

	if ( sourceClientIds.length !== 1 ) {
		return false;
	}

	const sourceClientId = sourceClientIds[ 0 ];
	const currentClientIdsWithoutSource = currentClientIds.filter(
		( clientId ) => clientId !== sourceClientId
	);

	if (
		currentClientIdsWithoutSource.length !== incomingClientIds.length ||
		! currentClientIdsWithoutSource.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const currentBlocks = yblocks
		.toArray()
		.map( ( yblock ) => yblock.toJSON() as unknown as Block );
	const currentOccurrences =
		getUniqueBlockTreeClientIdOccurrences( currentBlocks );
	const incomingOccurrences =
		getUniqueBlockTreeClientIdOccurrences( blocksToSync );

	if ( ! currentOccurrences || ! incomingOccurrences ) {
		return false;
	}

	const incomingSourceOccurrences = incomingOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);

	if (
		incomingSourceOccurrences.length !== 1 ||
		incomingSourceOccurrences[ 0 ].depth === 0 ||
		! incomingSourceOccurrences[ 0 ].parentClientId
	) {
		return false;
	}

	const destinationClientId = incomingSourceOccurrences[ 0 ].parentClientId;

	if (
		! incomingSet.has( destinationClientId ) ||
		! currentSet.has( destinationClientId )
	) {
		return false;
	}

	const incomingDestinationBlock = blocksToSync.find(
		( block ) => getBlockClientId( block ) === destinationClientId
	);
	const currentDestinationIndex =
		currentClientIds.indexOf( destinationClientId );

	if ( ! incomingDestinationBlock || currentDestinationIndex === -1 ) {
		return false;
	}

	const incomingDestinationWithoutSource = {
		...incomingDestinationBlock,
		innerBlocks: removeBlockFromTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId
		),
	};

	if (
		! areBlocksEqual(
			incomingDestinationWithoutSource,
			yblocks.get( currentDestinationIndex )
		)
	) {
		return false;
	}

	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const sourceIndex = currentClientIds.indexOf( sourceClientId );

	if ( sourceIndex === -1 ) {
		return false;
	}

	const sourceYBlock = yblocks.get( sourceIndex );
	mergeBlockIntoYBlock(
		sourceYBlock,
		incomingSourceOccurrences[ 0 ].block,
		attributeCursor,
		baseBlocksByClientId.get( sourceClientId )
	);
	const mergedSourceBlock = sourceYBlock.toJSON() as unknown as Block;
	const incomingDestinationWithMergedSource = {
		...incomingDestinationBlock,
		innerBlocks: replaceBlockInTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId,
			mergedSourceBlock
		),
	};
	const currentOnlyRetainedSet = new Set(
		currentClientIdsWithoutSource.filter(
			( clientId ) =>
				! baseSet.has( clientId ) && clientId !== destinationClientId
		)
	);

	yblocks.delete( sourceIndex, 1 );

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		let block: Block | undefined;

		if ( clientId === destinationClientId ) {
			block = incomingDestinationWithMergedSource;
		} else if ( clientId ) {
			block = incomingBlocksByClientId.get( clientId );
		}

		if ( block && clientId && ! currentOnlyRetainedSet.has( clientId ) ) {
			mergeBlockIntoYBlock(
				yblock,
				block,
				attributeCursor,
				baseBlocksByClientId.get( clientId )
			);
		}
	}

	return true;
}

type MergeYBlocksExplicitBaseCrossParentMoveResult =
	| 'merged'
	| 'guarded-skip'
	| 'unhandled';

function mergeYBlocksExplicitBaseCrossParentMove(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): MergeYBlocksExplicitBaseCrossParentMoveResult {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds ) {
		return 'unhandled';
	}

	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );
	const currentSet = new Set( currentClientIds );
	const incomingOccurrencesWithKnownClientIds =
		getKnownBlockTreeClientIdOccurrences( blocksToSync );
	const currentBaseClientIdsNestedInIncoming = baseClientIds.filter(
		( clientId ) =>
			currentSet.has( clientId ) &&
			incomingOccurrencesWithKnownClientIds.some(
				( occurrence ) =>
					occurrence.clientId === clientId && occurrence.depth > 0
			)
	);

	if ( ! incomingClientIds ) {
		return currentBaseClientIdsNestedInIncoming.length > 0
			? 'guarded-skip'
			: 'unhandled';
	}

	const baseSet = new Set( baseClientIds );
	const incomingSet = new Set( incomingClientIds );
	const sourceClientIds = baseClientIds.filter(
		( clientId ) =>
			currentSet.has( clientId ) && ! incomingSet.has( clientId )
	);

	if ( sourceClientIds.length === 0 ) {
		return currentBaseClientIdsNestedInIncoming.length > 0
			? 'guarded-skip'
			: 'unhandled';
	}

	const incomingOccurrences =
		getUniqueBlockTreeClientIdOccurrences( blocksToSync );

	const sourceAppearsNestedInIncoming = sourceClientIds.some( ( clientId ) =>
		incomingOccurrencesWithKnownClientIds.some(
			( occurrence ) =>
				occurrence.clientId === clientId && occurrence.depth > 0
		)
	);

	if ( ! incomingOccurrences ) {
		return sourceAppearsNestedInIncoming ? 'guarded-skip' : 'unhandled';
	}

	if ( sourceClientIds.length !== 1 ) {
		return sourceAppearsNestedInIncoming ? 'guarded-skip' : 'unhandled';
	}

	const sourceClientId = sourceClientIds[ 0 ];
	const currentClientIdsWithoutSource = currentClientIds.filter(
		( clientId ) => clientId !== sourceClientId
	);
	const incomingSourceOccurrences = incomingOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);

	if (
		currentClientIdsWithoutSource.length !== incomingClientIds.length ||
		! currentClientIdsWithoutSource.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return incomingSourceOccurrences.some(
			( occurrence ) => occurrence.depth > 0
		)
			? 'guarded-skip'
			: 'unhandled';
	}

	const currentBlocks = yblocks
		.toArray()
		.map( ( yblock ) => yblock.toJSON() as unknown as Block );
	const currentOccurrences =
		getUniqueBlockTreeClientIdOccurrences( currentBlocks );
	const baseOccurrences = getUniqueBlockTreeClientIdOccurrences( baseBlocks );

	if ( ! currentOccurrences || ! baseOccurrences ) {
		return 'guarded-skip';
	}

	const currentSourceOccurrences = currentOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);
	const baseSourceOccurrences = baseOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);

	if (
		currentSourceOccurrences.length !== 1 ||
		currentSourceOccurrences[ 0 ].depth !== 0 ||
		baseSourceOccurrences.length !== 1 ||
		baseSourceOccurrences[ 0 ].depth !== 0
	) {
		return 'guarded-skip';
	}

	if ( incomingSourceOccurrences.length === 0 ) {
		return 'unhandled';
	}

	if (
		incomingSourceOccurrences.length !== 1 ||
		incomingSourceOccurrences[ 0 ].depth !== 1 ||
		! incomingSourceOccurrences[ 0 ].parentClientId
	) {
		return 'guarded-skip';
	}

	const destinationClientId = incomingSourceOccurrences[ 0 ].parentClientId;

	if (
		! incomingSet.has( destinationClientId ) ||
		! currentSet.has( destinationClientId )
	) {
		return 'guarded-skip';
	}

	const currentOnlyRetainedClientIds = currentClientIdsWithoutSource.filter(
		( clientId ) =>
			! baseSet.has( clientId ) && clientId !== destinationClientId
	);
	const currentOnlyRetainedSet = new Set( currentOnlyRetainedClientIds );

	const incomingDestinationBlock = blocksToSync.find(
		( block ) => getBlockClientId( block ) === destinationClientId
	);
	const currentDestinationIndex =
		currentClientIds.indexOf( destinationClientId );

	if ( ! incomingDestinationBlock || currentDestinationIndex === -1 ) {
		return 'guarded-skip';
	}

	const incomingDestinationWithoutSource = {
		...incomingDestinationBlock,
		innerBlocks: removeBlockFromTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId
		),
	};

	if (
		! areBlocksEqual(
			incomingDestinationWithoutSource,
			yblocks.get( currentDestinationIndex )
		)
	) {
		return 'guarded-skip';
	}

	const sourceIndex = currentClientIds.indexOf( sourceClientId );

	if ( sourceIndex === -1 ) {
		return 'guarded-skip';
	}

	const sourceYBlock = yblocks.get( sourceIndex );
	const currentSourceBlock = sourceYBlock.toJSON() as unknown as Block;
	const baseSourceBlock = baseSourceOccurrences[ 0 ].block;
	const incomingSourceBlock = incomingSourceOccurrences[ 0 ].block;

	if (
		currentSourceBlock.name !== baseSourceBlock.name ||
		currentSourceBlock.name !== incomingSourceBlock.name
	) {
		return 'guarded-skip';
	}

	mergeBlockIntoYBlock(
		sourceYBlock,
		incomingSourceBlock,
		attributeCursor,
		baseSourceBlock
	);
	const mergedSourceBlock = sourceYBlock.toJSON() as unknown as Block;
	const incomingDestinationWithMergedSource = {
		...incomingDestinationBlock,
		innerBlocks: replaceBlockInTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId,
			mergedSourceBlock
		),
	};
	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	yblocks.delete( sourceIndex, 1 );

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		let block: Block | undefined;

		if ( clientId === destinationClientId ) {
			block = incomingDestinationWithMergedSource;
		} else if ( clientId ) {
			block = incomingBlocksByClientId.get( clientId );
		}

		if ( block && clientId && ! currentOnlyRetainedSet.has( clientId ) ) {
			mergeBlockIntoYBlock(
				yblock,
				block,
				attributeCursor,
				baseBlocksByClientId.get( clientId )
			);
		}
	}

	return 'merged';
}

function mergeYBlocksPreviousLocalCurrentOnlyCrossParentMove(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	if (
		baseClientIds.length !== incomingClientIds.length ||
		! baseClientIds.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const currentSet = new Set( currentClientIds );
	const incomingSet = new Set( incomingClientIds );
	const currentClientIdsWithoutSourceCandidates = currentClientIds.filter(
		( clientId ) => ! incomingSet.has( clientId )
	);

	if ( currentClientIdsWithoutSourceCandidates.length !== 1 ) {
		return false;
	}

	const currentBlocks = yblocks
		.toArray()
		.map( ( yblock ) => yblock.toJSON() as unknown as Block );
	const currentOccurrences =
		getUniqueBlockTreeClientIdOccurrences( currentBlocks );
	const baseOccurrences = getUniqueBlockTreeClientIdOccurrences( baseBlocks );
	const incomingOccurrences =
		getUniqueBlockTreeClientIdOccurrences( blocksToSync );

	if ( ! currentOccurrences || ! baseOccurrences || ! incomingOccurrences ) {
		return false;
	}

	const baseTreeSet = new Set(
		baseOccurrences.map( ( occurrence ) => occurrence.clientId )
	);
	const sourceClientIds = currentClientIdsWithoutSourceCandidates.filter(
		( clientId ) => ! baseTreeSet.has( clientId )
	);

	if ( sourceClientIds.length !== 1 ) {
		return false;
	}

	const sourceClientId = sourceClientIds[ 0 ];
	const currentClientIdsWithoutSource = currentClientIds.filter(
		( clientId ) => clientId !== sourceClientId
	);

	if (
		currentClientIdsWithoutSource.length !== incomingClientIds.length ||
		! currentClientIdsWithoutSource.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	const currentSourceOccurrences = currentOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);

	if (
		currentSourceOccurrences.length !== 1 ||
		currentSourceOccurrences[ 0 ].depth !== 0
	) {
		return false;
	}

	const incomingSourceOccurrences = incomingOccurrences.filter(
		( occurrence ) => occurrence.clientId === sourceClientId
	);

	if (
		incomingSourceOccurrences.length !== 1 ||
		incomingSourceOccurrences[ 0 ].depth !== 1 ||
		! incomingSourceOccurrences[ 0 ].parentClientId
	) {
		return false;
	}

	const destinationClientId = incomingSourceOccurrences[ 0 ].parentClientId;

	if (
		! incomingSet.has( destinationClientId ) ||
		! currentSet.has( destinationClientId )
	) {
		return false;
	}

	const incomingDestinationBlock = blocksToSync.find(
		( block ) => getBlockClientId( block ) === destinationClientId
	);
	const baseDestinationBlock = baseBlocks.find(
		( block ) => getBlockClientId( block ) === destinationClientId
	);
	const currentDestinationIndex =
		currentClientIds.indexOf( destinationClientId );

	if (
		! incomingDestinationBlock ||
		! baseDestinationBlock ||
		currentDestinationIndex === -1
	) {
		return false;
	}

	const incomingDestinationWithoutSource = {
		...incomingDestinationBlock,
		innerBlocks: removeBlockFromTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId
		),
	};

	if (
		! arePlainValuesEqual(
			incomingDestinationWithoutSource,
			baseDestinationBlock
		)
	) {
		return false;
	}

	if (
		! areBlocksEqual(
			incomingDestinationWithoutSource,
			yblocks.get( currentDestinationIndex )
		)
	) {
		return false;
	}

	const sourceIndex = currentClientIds.indexOf( sourceClientId );

	if ( sourceIndex === -1 ) {
		return false;
	}

	const sourceYBlock = yblocks.get( sourceIndex );

	if (
		! arePlainValuesEqual(
			incomingSourceOccurrences[ 0 ].block,
			sourceYBlock.toJSON()
		)
	) {
		return false;
	}

	const currentSourceBlock = sourceYBlock.toJSON() as unknown as Block;
	const incomingDestinationWithCurrentSource = {
		...incomingDestinationBlock,
		innerBlocks: replaceBlockInTreeByClientId(
			incomingDestinationBlock.innerBlocks ?? [],
			sourceClientId,
			currentSourceBlock
		),
	};
	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	yblocks.delete( sourceIndex, 1 );

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		let block: Block | undefined;

		if ( clientId === destinationClientId ) {
			block = incomingDestinationWithCurrentSource;
		} else if ( clientId ) {
			block = incomingBlocksByClientId.get( clientId );
		}

		if ( block && clientId ) {
			mergeBlockIntoYBlock(
				yblock,
				block,
				attributeCursor,
				baseBlocksByClientId.get( clientId )
			);
		}
	}

	return true;
}

function mergeYBlocksPreviousLocalReorder(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if (
		yblocks.length < 2 ||
		yblocks.length !== blocksToSync.length ||
		! baseBlocks.length ||
		baseBlocks.length >= blocksToSync.length
	) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentSet = new Set( currentClientIds );
	const incomingSet = new Set( incomingClientIds );
	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	if (
		currentSet.size !== incomingSet.size ||
		! currentClientIds.every( ( clientId ) => incomingSet.has( clientId ) )
	) {
		return false;
	}

	const baseSet = new Set( baseClientIds );

	if (
		! baseClientIds.every(
			( clientId ) =>
				currentSet.has( clientId ) && incomingSet.has( clientId )
		) ||
		currentClientIds.every(
			( clientId, index ) => clientId === incomingClientIds[ index ]
		)
	) {
		return false;
	}

	for ( const yblock of yblocks.toArray() ) {
		const clientId = getYBlockClientId( yblock );

		if ( ! clientId || baseSet.has( clientId ) ) {
			continue;
		}

		const block = incomingBlocksByClientId.get( clientId );

		if ( ! block || ! areBlocksEqual( block, yblock ) ) {
			return false;
		}
	}

	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [
			getBlockClientId( block ) as string,
			block,
		] )
	);

	for (
		let targetIndex = 0;
		targetIndex < incomingClientIds.length;
		targetIndex++
	) {
		const targetClientId = incomingClientIds[ targetIndex ];

		if ( currentClientIds[ targetIndex ] === targetClientId ) {
			continue;
		}

		const currentIndex = currentClientIds.indexOf( targetClientId );

		if ( currentIndex === -1 ) {
			return false;
		}

		const reorderedBlock = createNewYBlock(
			yblocks.get( currentIndex ).toJSON() as unknown as Block
		);
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );

		currentClientIds.splice( currentIndex, 1 );
		currentClientIds.splice( targetIndex, 0, targetClientId );
	}

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );

		if ( ! clientId || ! baseSet.has( clientId ) ) {
			continue;
		}

		const block = incomingBlocksByClientId.get( clientId );
		const baseBlock = baseBlocksByClientId.get( clientId );

		if ( block && baseBlock ) {
			mergeBlockIntoYBlock( yblock, block, attributeCursor, baseBlock );
		}
	}

	return true;
}

function areYBlocksEqualToPlainBlocks(
	yblocks: YBlocks,
	blocks: Block[]
): boolean {
	return (
		yblocks.length === blocks.length &&
		blocks.every( ( block, index ) =>
			areBlocksEqual( block, yblocks.get( index ) )
		)
	);
}

function findYBlockIndex(
	yblocks: YBlocks,
	baseBlock: Block,
	block: Block,
	preferredIndex: number
): { index: number; guardedSkip: boolean } {
	const clientId = getBlockClientId( baseBlock );

	if ( clientId ) {
		for ( let index = 0; index < yblocks.length; index++ ) {
			if ( getYBlockClientId( yblocks.get( index ) ) === clientId ) {
				return { index, guardedSkip: false };
			}
		}
	}

	let guardedSkip = false;

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );

		if ( areBlocksEqual( baseBlock, yblock ) ) {
			if ( hasDifferentIdentifiedBlockName( yblock, baseBlock, block ) ) {
				guardedSkip = true;
				continue;
			}

			return { index, guardedSkip: false };
		}
	}

	if ( preferredIndex < yblocks.length ) {
		const preferredBlock = yblocks.get( preferredIndex );

		if (
			hasDifferentIdentifiedBlockName( preferredBlock, baseBlock, block )
		) {
			return { index: -1, guardedSkip: true };
		}

		return { index: preferredIndex, guardedSkip: false };
	}

	return { index: -1, guardedSkip };
}

type StalePostDeleteFilterResult = {
	blocks: Block[];
	clientIds: Set< string >;
	filteredClientIds: Set< string >;
};

function addStalePostDeleteClientIds(
	yblocks: YBlocks,
	clientIds: Set< string >
): void {
	if ( ! clientIds.size ) {
		return;
	}

	const staleClientIds =
		stalePostDeleteClientIdsCache.get( yblocks ) ?? new Set< string >();
	clientIds.forEach( ( clientId ) => staleClientIds.add( clientId ) );
	stalePostDeleteClientIdsCache.set( yblocks, staleClientIds );
}

// If a delete already reached the Y.Doc, an older local editor snapshot can
// still try to re-send the deleted block. Use cached observed/corroborated
// delete provenance; never treat current Y absence alone as proof that an
// incoming block should be suppressed.
function filterStalePostDeleteResurrections(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	previousBlocks: Block[] | undefined
): StalePostDeleteFilterResult | null {
	if ( ! previousBlocks ) {
		return null;
	}

	const currentBlocks = yblocks.toArray().map( ( yblock ) => {
		return yblock.toJSON() as unknown as Block;
	} );
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );
	const previousClientIds = getUniqueKeys( previousBlocks, getBlockClientId );
	const currentTreeClientIds = getBlockTreeClientIdSet( currentBlocks );
	const baseTreeClientIds = getBlockTreeClientIdSet( baseBlocks );
	const incomingTreeClientIds = getBlockTreeClientIdSet( blocksToSync );

	if (
		! currentClientIds ||
		! baseClientIds ||
		! incomingClientIds ||
		! previousClientIds ||
		! currentTreeClientIds ||
		! baseTreeClientIds ||
		! incomingTreeClientIds
	) {
		return null;
	}

	const currentClientIdSet = new Set( currentClientIds );
	if (
		! baseClientIds.every( ( clientId ) =>
			currentClientIdSet.has( clientId )
		)
	) {
		return null;
	}

	const deleteReferenceClientIds = new Set( [
		...previousClientIds.filter(
			( clientId ) =>
				observedTopLevelClientIdsCache.get( yblocks )?.has( clientId )
		),
		...( stalePostDeleteClientIdsCache.get( yblocks ) ?? [] ),
	] );
	const remotelyDeletedClientIds = new Set(
		Array.from( deleteReferenceClientIds ).filter(
			( clientId ) =>
				! baseTreeClientIds.has( clientId ) &&
				! currentTreeClientIds.has( clientId )
		)
	);
	if ( ! remotelyDeletedClientIds.size ) {
		return null;
	}

	const filteredClientIds = new Set< string >();
	const filteredBlocks = blocksToSync.filter( ( block, index ) => {
		const clientId = incomingClientIds[ index ];
		if ( remotelyDeletedClientIds.has( clientId ) ) {
			filteredClientIds.add( clientId );
			return false;
		}

		return true;
	} );

	return {
		blocks: filteredBlocks,
		clientIds: remotelyDeletedClientIds,
		filteredClientIds,
	};
}

function cacheExplicitlyDeletedTopLevelClientIds(
	yblocks: YBlocks,
	baseBlocks: Block[],
	blocksToSync: Block[],
	preMergeClientIds: string[]
): void {
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingTreeClientIds = getBlockTreeClientIdSet( blocksToSync );
	const currentBlocks = yblocks.toArray().map( ( yblock ) => {
		return yblock.toJSON() as unknown as Block;
	} );
	const currentTreeClientIds = getBlockTreeClientIdSet( currentBlocks );

	if (
		! baseClientIds ||
		! incomingTreeClientIds ||
		! currentTreeClientIds
	) {
		return;
	}

	const preMergeClientIdSet = new Set( preMergeClientIds );
	if (
		! baseClientIds.every( ( clientId ) =>
			preMergeClientIdSet.has( clientId )
		)
	) {
		return;
	}

	const deletedClientIds = new Set(
		baseClientIds.filter(
			( clientId ) =>
				! incomingTreeClientIds.has( clientId ) &&
				! currentTreeClientIds.has( clientId )
		)
	);

	addStalePostDeleteClientIds( yblocks, deletedClientIds );
}

function mergeFilteredStalePostDeleteBlocks(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentClientIdSet = new Set( currentClientIds );
	if (
		! baseClientIds.every( ( clientId ) =>
			currentClientIdSet.has( clientId )
		)
	) {
		return false;
	}

	const baseClientIdSet = new Set( baseClientIds );
	const incomingClientIdSet = new Set( incomingClientIds );
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [ getBlockClientId( block ), block ] )
	);

	for ( let index = yblocks.length - 1; index >= 0; index-- ) {
		const clientId = getYBlockClientId( yblocks.get( index ) );
		if (
			clientId &&
			baseClientIdSet.has( clientId ) &&
			! incomingClientIdSet.has( clientId )
		) {
			yblocks.delete( index, 1 );
		}
	}

	blocksToSync.forEach( ( block, targetIndex ) => {
		const clientId = incomingClientIds[ targetIndex ];
		const currentIndex = yblocks
			.toArray()
			.findIndex(
				( yblock ) => getYBlockClientId( yblock ) === clientId
			);

		if ( currentIndex === -1 ) {
			yblocks.insert( Math.min( targetIndex, yblocks.length ), [
				createNewYBlock( block ),
			] );
			return;
		}

		const baseBlock = baseBlocksByClientId.get( clientId );
		if ( ! baseBlock ) {
			return;
		}

		let mergeIndex = currentIndex;
		if ( currentIndex !== targetIndex ) {
			const reorderedBlock = createNewYBlock(
				yblocks.get( currentIndex ).toJSON() as unknown as Block
			);
			yblocks.delete( currentIndex, 1 );
			mergeIndex = Math.min( targetIndex, yblocks.length );
			yblocks.insert( mergeIndex, [ reorderedBlock ] );
		}

		mergeBlockIntoYBlock(
			yblocks.get( mergeIndex ),
			block,
			attributeCursor,
			baseBlock
		);
	} );

	return true;
}

function findStrictYBlockIndex( yblocks: YBlocks, block: Block ): number {
	const clientId = getBlockClientId( block );

	if ( clientId ) {
		for ( let index = 0; index < yblocks.length; index++ ) {
			if ( getYBlockClientId( yblocks.get( index ) ) === clientId ) {
				return index;
			}
		}

		return -1;
	}

	for ( let index = 0; index < yblocks.length; index++ ) {
		if ( areBlocksEqual( block, yblocks.get( index ) ) ) {
			return index;
		}
	}

	return -1;
}

function findYBlockIndexByClientId(
	yblocks: YBlocks,
	clientId: string
): number {
	for ( let index = 0; index < yblocks.length; index++ ) {
		if ( getYBlockClientId( yblocks.get( index ) ) === clientId ) {
			return index;
		}
	}

	return -1;
}

function hasCurrentOnlyTopLevelBlocksOutsidePreviousLocal(
	yblocks: YBlocks,
	baseBlocks: Block[],
	previousBlocks?: Block[]
): boolean {
	if ( ! previousBlocks ) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const previousClientIds = getUniqueKeys( previousBlocks, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! previousClientIds ) {
		return false;
	}

	const knownClientIds = new Set( [
		...baseClientIds,
		...previousClientIds,
	] );

	return currentClientIds.some(
		( clientId ) => ! knownClientIds.has( clientId )
	);
}

function mergeYBlocksLocalSuffixAppend(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	previousBlocks?: Block[]
): void {
	if ( blocksToSync.length <= baseBlocks.length || baseBlocks.length === 0 ) {
		return;
	}

	if (
		! fastDeepEqual(
			blocksToSync.slice( 0, baseBlocks.length ),
			baseBlocks
		)
	) {
		return;
	}

	if (
		hasCurrentOnlyTopLevelBlocksOutsidePreviousLocal(
			yblocks,
			baseBlocks,
			previousBlocks
		)
	) {
		return;
	}

	const anchorIndex = findStrictYBlockIndex(
		yblocks,
		baseBlocks[ baseBlocks.length - 1 ]
	);

	if ( anchorIndex === -1 ) {
		return;
	}

	let insertIndex = anchorIndex + 1;

	for ( const block of blocksToSync.slice( baseBlocks.length ) ) {
		const existingIndex = findEquivalentYBlockIndex( yblocks, block );

		if ( existingIndex !== -1 ) {
			insertIndex = Math.max( insertIndex, existingIndex + 1 );
			continue;
		}

		yblocks.insert( insertIndex, [ createNewYBlock( block ) ] );
		insertIndex++;
	}
}

function mergeYBlocksStaleBaseDelete(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if (
		blocksToSync.length === 0 ||
		blocksToSync.length >= baseBlocks.length
	) {
		return false;
	}

	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	let baseIndex = 0;
	const incomingMatches: Array< { block: Block; baseBlock: Block } > = [];

	for (
		let incomingIndex = 0;
		incomingIndex < blocksToSync.length;
		incomingIndex++
	) {
		const incomingClientId = incomingClientIds[ incomingIndex ];
		const matchedBaseIndex = baseClientIds.indexOf(
			incomingClientId,
			baseIndex
		);

		if ( matchedBaseIndex === -1 ) {
			return false;
		}

		incomingMatches.push( {
			block: blocksToSync[ incomingIndex ],
			baseBlock: baseBlocks[ matchedBaseIndex ],
		} );
		baseIndex = matchedBaseIndex + 1;
	}

	const incomingClientIdSet = new Set( incomingClientIds );
	if (
		incomingClientIds.some(
			( clientId ) =>
				findYBlockIndexByClientId( yblocks, clientId ) === -1
		)
	) {
		return false;
	}

	const deleteIndexes = baseClientIds
		.filter( ( clientId ) => ! incomingClientIdSet.has( clientId ) )
		.map( ( clientId ) => findYBlockIndexByClientId( yblocks, clientId ) )
		.filter( ( index ) => index !== -1 )
		.sort( ( a, b ) => b - a );

	for ( const deleteIndex of deleteIndexes ) {
		yblocks.delete( deleteIndex, 1 );
	}

	for ( const { block, baseBlock } of incomingMatches ) {
		const currentIndex = findYBlockIndexByClientId(
			yblocks,
			getBlockClientId( baseBlock )!
		);

		if ( currentIndex === -1 ) {
			return false;
		}

		mergeBlockIntoYBlock(
			yblocks.get( currentIndex ),
			block,
			attributeCursor,
			baseBlock
		);
	}

	return true;
}

function mergeYBlocksStaleBaseInsert(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition
): boolean {
	if ( blocksToSync.length <= baseBlocks.length ) {
		return false;
	}

	const currentClientIds = getUniqueKeys(
		yblocks.toArray(),
		getYBlockClientId
	);
	const baseClientIds = getUniqueKeys( baseBlocks, getBlockClientId );
	const incomingClientIds = getUniqueKeys( blocksToSync, getBlockClientId );

	if ( ! currentClientIds || ! baseClientIds || ! incomingClientIds ) {
		return false;
	}

	const currentClientIdSet = new Set( currentClientIds );
	const baseClientIdSet = new Set( baseClientIds );
	const insertedClientIdSet = new Set< string >();
	const insertions: Array< { beforeClientId: string; blocks: Block[] } > = [];
	const incomingMatches: Array< { block: Block; baseBlock: Block } > = [];
	let baseIndex = 0;
	let pendingInsertedBlocks: Block[] = [];

	for (
		let incomingIndex = 0;
		incomingIndex < blocksToSync.length;
		incomingIndex++
	) {
		const incomingClientId = incomingClientIds[ incomingIndex ];

		if (
			baseIndex < baseClientIds.length &&
			incomingClientId === baseClientIds[ baseIndex ]
		) {
			if ( pendingInsertedBlocks.length ) {
				insertions.push( {
					beforeClientId: incomingClientId,
					blocks: pendingInsertedBlocks,
				} );
				pendingInsertedBlocks = [];
			}

			incomingMatches.push( {
				block: blocksToSync[ incomingIndex ],
				baseBlock: baseBlocks[ baseIndex ],
			} );
			baseIndex++;
			continue;
		}

		if ( baseClientIdSet.has( incomingClientId ) ) {
			return false;
		}

		insertedClientIdSet.add( incomingClientId );
		pendingInsertedBlocks.push( blocksToSync[ incomingIndex ] );
	}

	if (
		baseIndex !== baseClientIds.length ||
		pendingInsertedBlocks.length ||
		! insertions.length ||
		! baseClientIds.every( ( clientId ) =>
			currentClientIdSet.has( clientId )
		) ||
		Array.from( insertedClientIdSet ).some( ( clientId ) =>
			currentClientIdSet.has( clientId )
		)
	) {
		return false;
	}

	for ( const { beforeClientId, blocks } of insertions ) {
		const insertIndex = findYBlockIndexByClientId(
			yblocks,
			beforeClientId
		);

		if ( insertIndex === -1 ) {
			return false;
		}

		yblocks.insert( insertIndex, blocks.map( createNewYBlock ) );
	}

	for ( const { block, baseBlock } of incomingMatches ) {
		const currentIndex = findYBlockIndexByClientId(
			yblocks,
			getBlockClientId( baseBlock )!
		);

		if ( currentIndex === -1 ) {
			return false;
		}

		mergeBlockIntoYBlock(
			yblocks.get( currentIndex ),
			block,
			attributeCursor,
			baseBlock
		);
	}

	return true;
}

type MergeYBlocksLocalChangesResult = {
	handled: boolean;
	guardedSkip: boolean;
};

function mergeYBlocksLocalChanges(
	yblocks: YBlocks,
	blocksToSync: Block[],
	baseBlocks: Block[],
	attributeCursor: MergeCursorPosition,
	hasExplicitBaseBlocks: boolean,
	previousLocalBlocks?: Block[]
): MergeYBlocksLocalChangesResult {
	if ( fastDeepEqual( blocksToSync, baseBlocks ) ) {
		return { handled: true, guardedSkip: false };
	}

	if ( areYBlocksEqualToPlainBlocks( yblocks, baseBlocks ) ) {
		return { handled: false, guardedSkip: false };
	}

	if (
		yblocks.length === baseBlocks.length &&
		blocksToSync.length === baseBlocks.length
	) {
		return { handled: false, guardedSkip: false };
	}

	mergeYBlocksLocalSuffixAppend(
		yblocks,
		blocksToSync,
		baseBlocks,
		previousLocalBlocks
	);

	if (
		hasExplicitBaseBlocks &&
		mergeYBlocksStaleBaseDelete(
			yblocks,
			blocksToSync,
			baseBlocks,
			attributeCursor
		)
	) {
		return { handled: true, guardedSkip: false };
	}

	if (
		hasExplicitBaseBlocks &&
		mergeYBlocksStaleBaseInsert(
			yblocks,
			blocksToSync,
			baseBlocks,
			attributeCursor
		)
	) {
		return { handled: true, guardedSkip: false };
	}

	const sharedLength = Math.min( baseBlocks.length, blocksToSync.length );
	let guardedSkip = false;

	for ( let index = 0; index < sharedLength; index++ ) {
		const baseBlock = baseBlocks[ index ];
		const block = blocksToSync[ index ];

		if ( ! isSameBlockIdentity( baseBlock, block ) ) {
			return { handled: false, guardedSkip };
		}

		if ( fastDeepEqual( baseBlock, block ) ) {
			continue;
		}

		const result = findYBlockIndex( yblocks, baseBlock, block, index );

		if ( result.index === -1 ) {
			guardedSkip = guardedSkip || result.guardedSkip;
			continue;
		}

		mergeBlockIntoYBlock(
			yblocks.get( result.index ),
			block,
			attributeCursor,
			baseBlock
		);
	}

	return { handled: true, guardedSkip };
}

/**
 * Merge incoming block data into the local Y.Doc.
 * This function is called to sync local block changes to a shared Y.Doc.
 *
 * @param yblocks                    The blocks in the local Y.Doc.
 * @param incomingBlocks             Gutenberg blocks being synced.
 * @param attributeCursor            When provided, describes a selection cursor falling within a
 *                                   RichText field associated with a specific block and attribute.
 *                                   Derived from the changes that produced the blocks.
 * @param baseBlocks                 Optional pre-change block snapshot used for rebasing.
 * @param allowStalePostDeleteFilter Whether to filter observed stale top-level
 *                                   delete resurrections.
 */
export function mergeCrdtBlocks(
	yblocks: YBlocks,
	incomingBlocks: Block[],
	attributeCursor: MergeCursorPosition,
	baseBlocks?: Block[],
	allowStalePostDeleteFilter = true
): void {
	// Ensure we are working with serializable block data.
	if ( ! serializableBlocksCache.has( incomingBlocks ) ) {
		serializableBlocksCache.set(
			incomingBlocks,
			makeBlocksSerializable( incomingBlocks )
		);
	}

	let blocksToSync = serializableBlocksCache.get( incomingBlocks ) ?? [];
	const explicitBaseBlocksToSync = baseBlocks
		? makeBlocksSerializable( baseBlocks )
		: undefined;
	const hasExplicitBaseBlocks = !! explicitBaseBlocksToSync;
	const previousLocalBlocksToSync = previousLocalBlocksCache.get( yblocks );
	const preMergeTopLevelClientIds =
		explicitBaseBlocksToSync && allowStalePostDeleteFilter
			? getUniqueKeys( yblocks.toArray(), getYBlockClientId )
			: null;
	let hasFilteredStalePostDeleteBlocks = false;

	const finishMerge = (
		previousLocalBlocks = makeSerializableBlocksFromYBlocks( yblocks )
	) => {
		removeDuplicateClientIds( yblocks );
		if (
			explicitBaseBlocksToSync &&
			allowStalePostDeleteFilter &&
			preMergeTopLevelClientIds
		) {
			cacheExplicitlyDeletedTopLevelClientIds(
				yblocks,
				explicitBaseBlocksToSync,
				blocksToSync,
				preMergeTopLevelClientIds
			);
		}
		cacheObservedTopLevelClientIds( yblocks );
		previousLocalBlocksCache.set( yblocks, previousLocalBlocks );
	};

	if ( explicitBaseBlocksToSync && allowStalePostDeleteFilter ) {
		const stalePostDeleteFilterResult = filterStalePostDeleteResurrections(
			yblocks,
			blocksToSync,
			explicitBaseBlocksToSync,
			previousLocalBlocksToSync
		);

		if ( stalePostDeleteFilterResult ) {
			blocksToSync = stalePostDeleteFilterResult.blocks;
			hasFilteredStalePostDeleteBlocks =
				stalePostDeleteFilterResult.filteredClientIds.size > 0;
			addStalePostDeleteClientIds(
				yblocks,
				stalePostDeleteFilterResult.clientIds
			);
		}
	}

	const baseBlocksToSync =
		explicitBaseBlocksToSync ?? previousLocalBlocksToSync;

	const explicitBaseCrossParentMoveResult = explicitBaseBlocksToSync
		? mergeYBlocksExplicitBaseCrossParentMove(
				yblocks,
				blocksToSync,
				explicitBaseBlocksToSync,
				attributeCursor
		  )
		: 'unhandled';

	if ( explicitBaseCrossParentMoveResult === 'merged' ) {
		removeDuplicateClientIds( yblocks );
		previousLocalBlocksCache.set(
			yblocks,
			makeSerializableBlocksFromYBlocks( yblocks )
		);
		return;
	}

	if ( explicitBaseCrossParentMoveResult === 'guarded-skip' ) {
		previousLocalBlocksCache.set(
			yblocks,
			makeSerializableBlocksFromYBlocks( yblocks )
		);
		return;
	}

	if (
		explicitBaseBlocksToSync &&
		hasFilteredStalePostDeleteBlocks &&
		mergeFilteredStalePostDeleteBlocks(
			yblocks,
			blocksToSync,
			explicitBaseBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		! explicitBaseBlocksToSync &&
		previousLocalBlocksToSync &&
		mergeYBlocksPreviousLocalDelete(
			yblocks,
			blocksToSync,
			previousLocalBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		! explicitBaseBlocksToSync &&
		previousLocalBlocksToSync &&
		mergeYBlocksPreviousLocalDeleteReorder(
			yblocks,
			blocksToSync,
			previousLocalBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		! explicitBaseBlocksToSync &&
		previousLocalBlocksToSync &&
		mergeYBlocksPreviousLocalReorder(
			yblocks,
			blocksToSync,
			previousLocalBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		explicitBaseBlocksToSync &&
		mergeYBlocksExplicitBaseDeleteWithInsert(
			yblocks,
			blocksToSync,
			explicitBaseBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		explicitBaseBlocksToSync &&
		mergeYBlocksExplicitBaseReorder(
			yblocks,
			blocksToSync,
			explicitBaseBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge();
		return;
	}

	if (
		! explicitBaseBlocksToSync &&
		previousLocalBlocksToSync &&
		mergeYBlocksPreviousLocalCrossParentMove(
			yblocks,
			blocksToSync,
			previousLocalBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge( makeSerializableBlocksFromYBlocks( yblocks ) );
		return;
	}

	if (
		! explicitBaseBlocksToSync &&
		previousLocalBlocksToSync &&
		mergeYBlocksPreviousLocalCurrentOnlyCrossParentMove(
			yblocks,
			blocksToSync,
			previousLocalBlocksToSync,
			attributeCursor
		)
	) {
		finishMerge( makeSerializableBlocksFromYBlocks( yblocks ) );
		return;
	}

	const localChangesResult = baseBlocksToSync
		? mergeYBlocksLocalChanges(
				yblocks,
				blocksToSync,
				baseBlocksToSync,
				attributeCursor,
				hasExplicitBaseBlocks,
				previousLocalBlocksToSync
		  )
		: { handled: false, guardedSkip: false };

	if ( localChangesResult.handled ) {
		finishMerge();
		return;
	}

	if ( rebaseYBlocksByClientId( yblocks, baseBlocksToSync, blocksToSync ) ) {
		mergeYBlocksByClientId(
			yblocks,
			blocksToSync,
			attributeCursor,
			baseBlocksToSync
		);
		finishMerge();
		return;
	}

	if ( ! baseBlocksToSync ) {
		reorderYBlocksByClientId( yblocks, blocksToSync );
	}

	// This is a rudimentary diff implementation similar to the y-prosemirror diffing
	// approach.
	// A better implementation would also diff the textual content and represent it
	// using a Y.Text type.
	// However, at this time it makes more sense to keep this algorithm generic to
	// support all kinds of block types.
	// Ideally, we ensure that block data structure have a consistent data format.
	// E.g.:
	//   - textual content (using rich-text formatting?) may always be stored under `block.text`
	//   - local information that shouldn't be shared (e.g. clientId or isDragging) is stored under `block.private`
	//
	// @credit Kevin Jahns (dmonad)
	// @link https://github.com/WordPress/gutenberg/pull/68483
	const numOfCommonEntries = Math.min(
		blocksToSync.length ?? 0,
		yblocks.length
	);

	let left = 0;
	let right = 0;

	// skip equal blocks from left
	for (
		;
		left < numOfCommonEntries &&
		areBlocksEqual( blocksToSync[ left ], yblocks.get( left ) );
		left++
	) {
		/* nop */
	}

	// skip equal blocks from right
	for (
		;
		right < numOfCommonEntries - left &&
		areBlocksEqual(
			blocksToSync[ blocksToSync.length - right - 1 ],
			yblocks.get( yblocks.length - right - 1 )
		);
		right++
	) {
		/* nop */
	}

	const numOfUpdatesNeeded = numOfCommonEntries - left - right;
	const numOfInsertionsNeeded = Math.max(
		0,
		blocksToSync.length - yblocks.length
	);
	const numOfDeletionsNeeded = Math.max(
		0,
		yblocks.length - blocksToSync.length
	);

	// updates
	let hasGuardedSkips = false;

	for ( let i = 0; i < numOfUpdatesNeeded; i++, left++ ) {
		const block = blocksToSync[ left ];
		const yblock = yblocks.get( left );
		const baseBlock = baseBlocksToSync?.[ left ];

		if ( hasDifferentIdentifiedBlockName( yblock, baseBlock, block ) ) {
			hasGuardedSkips = true;
			continue;
		}

		mergeBlockIntoYBlock( yblock, block, attributeCursor, baseBlock );
	}

	// deletes
	yblocks.delete( left, numOfDeletionsNeeded );

	// inserts
	for ( let i = 0; i < numOfInsertionsNeeded; i++, left++ ) {
		const newBlock = [ createNewYBlock( blocksToSync[ left ] ) ];

		yblocks.insert( left, newBlock );
	}

	finishMerge();
}

function removeDuplicateClientIds( yblocks: YBlocks ): void {
	const knownClientIds = new Set< string >();
	for ( let j = 0; j < yblocks.length; j++ ) {
		const yblock: YBlock = yblocks.get( j );

		let clientId = yblock.get( 'clientId' );

		if ( ! clientId ) {
			continue;
		}

		if ( knownClientIds.has( clientId ) ) {
			clientId = uuidv4();
			yblock.set( 'clientId', clientId );
		}
		knownClientIds.add( clientId );
	}
}

/**
 * Compare a plain array element against a Y.Map element for equality.
 * Used by the left-right sweep diff in mergeYArray.
 *
 * @param newElement The plain object from the incoming array.
 * @param yElement   The Y.Map element from the existing Y.Array.
 * @return True if the elements are deeply equal.
 */
function areArrayElementsEqual(
	newElement: unknown,
	yElement: unknown
): boolean {
	if ( yElement instanceof Y.Map && isRecord( newElement ) ) {
		return fastDeepEqual(
			stripArrayElementIds( newElement ),
			stripArrayElementIds( yElement.toJSON() )
		);
	}

	return fastDeepEqual(
		stripArrayElementIds( newElement ),
		stripArrayElementIds( yElement )
	);
}

function getArrayElementId( value: unknown ): string | undefined {
	if ( value instanceof Y.Map ) {
		const id = value.get( ARRAY_ELEMENT_ID_KEY );
		return typeof id === 'string' ? id : undefined;
	}

	if ( isRecord( value ) ) {
		const id = value[ ARRAY_ELEMENT_ID_KEY ];
		if ( typeof id === 'string' ) {
			return id;
		}

		const symbolId = ( value as Record< symbol, unknown > )[
			ARRAY_ELEMENT_ID_SYMBOL
		];
		return typeof symbolId === 'string' ? symbolId : undefined;
	}

	return undefined;
}

function defineArrayElementId(
	value: Record< string, unknown >,
	id: string
): void {
	Object.defineProperty( value, ARRAY_ELEMENT_ID_SYMBOL, {
		configurable: true,
		enumerable: true,
		value: id,
	} );
}

function stripArrayElementIds( value: unknown ): unknown {
	if ( Array.isArray( value ) ) {
		return value.map( stripArrayElementIds );
	}

	if ( isRecord( value ) ) {
		return Object.fromEntries(
			Object.entries( value )
				.filter( ( [ key ] ) => key !== ARRAY_ELEMENT_ID_KEY )
				.map( ( [ key, innerValue ] ) => [
					key,
					stripArrayElementIds( innerValue ),
				] )
		);
	}

	return value;
}

function arePlainValuesEqual( a: unknown, b: unknown ): boolean {
	return fastDeepEqual(
		stripArrayElementIds( a ),
		stripArrayElementIds( b )
	);
}

function isYArrayEqualToPlainArray(
	yArray: Y.Array< unknown >,
	value: unknown[]
): boolean {
	return (
		yArray.length === value.length &&
		value.every( ( element, index ) =>
			areArrayElementsEqual( element, yArray.get( index ) )
		)
	);
}

function findYArrayElementIndex(
	yArray: Y.Array< unknown >,
	previousElement: unknown,
	preferredIndex: number,
	previousLength: number,
	usedIndices: Set< number >
): number {
	const previousElementId = getArrayElementId( previousElement );

	if ( previousElementId ) {
		for ( let i = 0; i < yArray.length; i++ ) {
			if (
				! usedIndices.has( i ) &&
				getArrayElementId( yArray.get( i ) ) === previousElementId
			) {
				return i;
			}
		}

		return -1;
	}

	for ( let i = 0; i < yArray.length; i++ ) {
		if (
			! usedIndices.has( i ) &&
			areArrayElementsEqual( previousElement, yArray.get( i ) )
		) {
			return i;
		}
	}

	if (
		yArray.length === previousLength &&
		preferredIndex < yArray.length &&
		! usedIndices.has( preferredIndex )
	) {
		return preferredIndex;
	}

	return preferredIndex < yArray.length && ! usedIndices.has( preferredIndex )
		? preferredIndex
		: -1;
}

function getYArrayElementIndexSnapshot(
	yArray: Y.Array< unknown >,
	previousValue: unknown[]
): number[] {
	const usedIndices = new Set< number >();

	return previousValue.map( ( previousElement, index ) => {
		const currentIndex = findYArrayElementIndex(
			yArray,
			previousElement,
			index,
			previousValue.length,
			usedIndices
		);

		if ( currentIndex !== -1 ) {
			usedIndices.add( currentIndex );
		}

		return currentIndex;
	} );
}

function findYArrayLocalChangeInsertIndex(
	yArray: Y.Array< unknown >,
	previousValue: unknown[],
	left: number,
	previousMiddleEnd: number,
	pairedCount: number,
	currentIndicesByPreviousIndex: number[]
): number {
	for ( let index = left + pairedCount - 1; index >= 0; index-- ) {
		const currentIndex = currentIndicesByPreviousIndex[ index ];

		if ( currentIndex !== -1 ) {
			return Math.min( currentIndex + 1, yArray.length );
		}
	}

	for (
		let index = previousMiddleEnd;
		index < previousValue.length;
		index++
	) {
		const currentIndex = currentIndicesByPreviousIndex[ index ];

		if ( currentIndex !== -1 ) {
			return Math.min( currentIndex, yArray.length );
		}
	}

	return Math.min( left, yArray.length );
}

function getExistingYArrayInsertionPrefixLength(
	yArray: Y.Array< unknown >,
	insertIndex: number,
	insertedElements: unknown[]
): number {
	let prefixLength = 0;

	while (
		prefixLength < insertedElements.length &&
		insertIndex + prefixLength < yArray.length &&
		areArrayElementsEqual(
			insertedElements[ prefixLength ],
			yArray.get( insertIndex + prefixLength )
		)
	) {
		prefixLength++;
	}

	return prefixLength;
}

function mergeYArrayLocalChanges(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	previousValue: unknown[],
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope
): boolean {
	if ( arePlainValuesEqual( newValue, previousValue ) ) {
		return true;
	}

	// If the current CRDT value still equals the previous local value, use the
	// normal merge path so local inserts/deletes/reorders are applied.
	if ( isYArrayEqualToPlainArray( yArray, previousValue ) ) {
		return false;
	}

	if (
		yArray.length === previousValue.length &&
		! previousValue.some( getArrayElementId )
	) {
		return false;
	}

	const sharedLength = Math.min( previousValue.length, newValue.length );
	let left = 0;
	let right = 0;

	for (
		;
		left < sharedLength &&
		arePlainValuesEqual( previousValue[ left ], newValue[ left ] );
		left++
	) {
		/* nop */
	}

	for (
		;
		right < sharedLength - left &&
		arePlainValuesEqual(
			previousValue[ previousValue.length - right - 1 ],
			newValue[ newValue.length - right - 1 ]
		);
		right++
	) {
		/* nop */
	}

	const previousMiddleEnd = previousValue.length - right;
	const newMiddleEnd = newValue.length - right;
	const pairedCount = Math.min(
		previousMiddleEnd - left,
		newMiddleEnd - left
	);
	const currentIndicesByPreviousIndex = getYArrayElementIndexSnapshot(
		yArray,
		previousValue
	);

	for ( let offset = 0; offset < pairedCount; offset++ ) {
		const i = left + offset;
		const previousElement = previousValue[ i ];
		const newElement = newValue[ i ];

		if ( arePlainValuesEqual( previousElement, newElement ) ) {
			continue;
		}

		const currentIndex = currentIndicesByPreviousIndex[ i ];

		if ( currentIndex === -1 ) {
			continue;
		}

		const currentElement = yArray.get( currentIndex );

		if ( currentElement instanceof Y.Map && isRecord( newElement ) ) {
			mergeYMapValues(
				currentElement,
				newElement,
				query,
				cursorPosition,
				appendCursorScopeKey( cursorScope, currentIndex.toString() ),
				isRecord( previousElement ) ? previousElement : undefined
			);
		}
	}

	const rawInsertIndex =
		newMiddleEnd > left + pairedCount
			? findYArrayLocalChangeInsertIndex(
					yArray,
					previousValue,
					left,
					previousMiddleEnd,
					pairedCount,
					currentIndicesByPreviousIndex
			  )
			: 0;
	const deleteIndices = currentIndicesByPreviousIndex
		.slice( left + pairedCount, previousMiddleEnd )
		.filter( ( index ) => index !== -1 )
		.sort( ( a, b ) => b - a );

	for ( const currentIndex of deleteIndices ) {
		if ( currentIndex < yArray.length ) {
			yArray.delete( currentIndex, 1 );
		}
	}

	if ( newMiddleEnd > left + pairedCount ) {
		const deletedBeforeInsert = deleteIndices.filter(
			( currentIndex ) => currentIndex < rawInsertIndex
		).length;
		const insertIndex = Math.max(
			0,
			Math.min( rawInsertIndex - deletedBeforeInsert, yArray.length )
		);
		const insertedElements = newValue.slice(
			left + pairedCount,
			newMiddleEnd
		);
		const existingPrefixLength = getExistingYArrayInsertionPrefixLength(
			yArray,
			insertIndex,
			insertedElements
		);
		const itemsToInsert = insertedElements
			.slice( existingPrefixLength )
			.map( ( item ) => createYMapFromQuery( query, item, true ) );

		if ( itemsToInsert.length > 0 ) {
			yArray.insert( insertIndex + existingPrefixLength, itemsToInsert );
		}
	}

	return true;
}

function mergeYArrayByElementIds(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope
): boolean {
	if ( ! newValue.some( getArrayElementId ) ) {
		return false;
	}

	let index = 0;

	for ( const newElement of newValue ) {
		const newId = getArrayElementId( newElement );
		let currentIndex = -1;

		if ( newId ) {
			for ( let i = index; i < yArray.length; i++ ) {
				if ( getArrayElementId( yArray.get( i ) ) === newId ) {
					currentIndex = i;
					break;
				}
			}
		}

		if ( currentIndex > index ) {
			yArray.delete( index, currentIndex - index );
		}

		if ( currentIndex >= index ) {
			const currentElement = yArray.get( index );
			if ( currentElement instanceof Y.Map && isRecord( newElement ) ) {
				mergeYMapValues(
					currentElement,
					newElement,
					query,
					cursorPosition,
					cursorScope
				);
			}
		} else {
			yArray.insert( index, [
				createYMapFromQuery( query, newElement, true ),
			] );
		}

		index++;
	}

	if ( yArray.length > index ) {
		yArray.delete( index, yArray.length - index );
	}

	return true;
}

function getBaseIndexesByNewValue(
	baseValue: unknown[],
	newValue: unknown[]
): number[] | null {
	if (
		baseValue.length !== newValue.length ||
		! baseValue.every( getArrayElementId )
	) {
		return null;
	}

	const baseIndexesByNewIndex = new Array< number >( newValue.length ).fill(
		-1
	);
	const usedBaseIndexes = new Set< number >();

	for ( let newIndex = 0; newIndex < newValue.length; newIndex++ ) {
		const matchingBaseIndex = baseValue.findIndex(
			( baseElement, baseIndex ) =>
				! usedBaseIndexes.has( baseIndex ) &&
				arePlainValuesEqual( baseElement, newValue[ newIndex ] )
		);

		if ( matchingBaseIndex === -1 ) {
			continue;
		}

		baseIndexesByNewIndex[ newIndex ] = matchingBaseIndex;
		usedBaseIndexes.add( matchingBaseIndex );
	}

	const unmatchedNewIndexes = baseIndexesByNewIndex
		.map( ( baseIndex, newIndex ) =>
			baseIndex === -1 ? newIndex : undefined
		)
		.filter( ( index ): index is number => index !== undefined );
	const unmatchedBaseIndexes = baseValue
		.map( ( _baseElement, baseIndex ) =>
			usedBaseIndexes.has( baseIndex ) ? undefined : baseIndex
		)
		.filter( ( index ): index is number => index !== undefined );

	if ( unmatchedNewIndexes.length !== unmatchedBaseIndexes.length ) {
		return null;
	}

	if ( unmatchedNewIndexes.length > 1 ) {
		return null;
	}

	if ( unmatchedNewIndexes.length === 1 ) {
		baseIndexesByNewIndex[ unmatchedNewIndexes[ 0 ] ] =
			unmatchedBaseIndexes[ 0 ];
	}

	return baseIndexesByNewIndex;
}

function findYArrayElementIndexById(
	yArray: Y.Array< unknown >,
	id: string
): number {
	for ( let index = 0; index < yArray.length; index++ ) {
		if ( getArrayElementId( yArray.get( index ) ) === id ) {
			return index;
		}
	}

	return -1;
}

function cloneYMapElementFromQuery(
	query: Record< string, BlockAttributeSchema >,
	element: Y.Map< unknown >
): Y.Map< unknown > {
	return createYMapFromQuery(
		query,
		element.toJSON(),
		getArrayElementId( element ) ?? true
	);
}

function mergeYArrayWithBaseElementIds(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	baseValue: unknown[]
): boolean {
	const baseIndexesByNewIndex = getBaseIndexesByNewValue(
		baseValue,
		newValue
	);

	if ( ! baseIndexesByNewIndex ) {
		return false;
	}

	for ( let targetIndex = 0; targetIndex < newValue.length; targetIndex++ ) {
		const baseIndex = baseIndexesByNewIndex[ targetIndex ];
		const baseElement = baseValue[ baseIndex ];
		const baseElementId = getArrayElementId( baseElement );

		if ( ! baseElementId ) {
			return false;
		}

		const currentIndex = findYArrayElementIndexById(
			yArray,
			baseElementId
		);

		if ( currentIndex === -1 ) {
			return false;
		}

		if ( currentIndex !== targetIndex ) {
			const currentElement = yArray.get( currentIndex );

			if ( ! ( currentElement instanceof Y.Map ) ) {
				return false;
			}

			const reorderedElement = cloneYMapElementFromQuery(
				query,
				currentElement
			);

			yArray.delete( currentIndex, 1 );
			yArray.insert( targetIndex, [ reorderedElement ] );
		}

		const currentElement = yArray.get( targetIndex );
		const newElement = newValue[ targetIndex ];

		if ( currentElement instanceof Y.Map && isRecord( newElement ) ) {
			mergeYMapValues(
				currentElement,
				newElement,
				query,
				cursorPosition,
				appendCursorScopeKey( cursorScope, targetIndex.toString() ),
				isRecord( baseElement ) ? baseElement : undefined
			);
			continue;
		}

		return false;
	}

	return true;
}

/**
 * Merge an incoming plain array into an existing Y.Array in-place.
 *
 * Uses the same left-right sweep diff approach as mergeCrdtBlocks:
 * equal elements are skipped from both ends, then the middle section
 * is updated, deleted, or inserted as needed. This preserves existing
 * Y.Map/Y.Text objects for unchanged elements, so concurrent edits
 * to those elements are not lost.
 *
 * @param yArray         The existing Y.Array to update.
 * @param newValue       The new plain array to merge into the Y.Array.
 * @param schema         The attribute schema (must have `query`).
 * @param cursorPosition The local cursor position for rich-text delta merges.
 * @param cursorScope    The selected block attribute scope for rich-text cursor hints.
 * @param baseValue      Optional pre-change array snapshot used for rebasing.
 */
function mergeYArray(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	schema: BlockAttributeSchema,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	baseValue?: unknown
): void {
	if ( ! schema.query ) {
		return;
	}

	const query = schema.query;

	if (
		Array.isArray( baseValue ) &&
		mergeYArrayLocalChanges(
			yArray,
			newValue,
			baseValue,
			query,
			cursorPosition,
			cursorScope
		)
	) {
		return;
	}

	if (
		Array.isArray( baseValue ) &&
		mergeYArrayWithBaseElementIds(
			yArray,
			newValue,
			query,
			cursorPosition,
			cursorScope,
			baseValue
		)
	) {
		return;
	}

	if (
		Array.isArray( baseValue ) &&
		mergeYArrayWithBase(
			yArray,
			newValue,
			schema,
			cursorPosition,
			cursorScope,
			baseValue
		)
	) {
		return;
	}

	if (
		! Array.isArray( baseValue ) &&
		mergeYArrayWithBaseElementIds(
			yArray,
			newValue,
			query,
			cursorPosition,
			cursorScope,
			yArray.toJSON() as unknown[]
		)
	) {
		return;
	}

	if (
		mergeYArrayByElementIds(
			yArray,
			newValue,
			query,
			cursorPosition,
			cursorScope
		)
	) {
		return;
	}

	const numOfCommonEntries = Math.min( newValue.length, yArray.length );

	let left = 0;
	let right = 0;

	// Skip equal elements from left.
	for (
		;
		left < numOfCommonEntries &&
		areArrayElementsEqual( newValue[ left ], yArray.get( left ) );
		left++
	) {
		/* nop */
	}

	// Skip equal elements from right.
	for (
		;
		right < numOfCommonEntries - left &&
		areArrayElementsEqual(
			newValue[ newValue.length - right - 1 ],
			yArray.get( yArray.length - right - 1 )
		);
		right++
	) {
		/* nop */
	}

	// Updates: merge changed elements in-place.
	const numOfUpdatesNeeded = numOfCommonEntries - left - right;

	for ( let i = 0; i < numOfUpdatesNeeded; i++ ) {
		const currentElement = yArray.get( left + i );
		const newElement = newValue[ left + i ];

		if ( currentElement instanceof Y.Map && isRecord( newElement ) ) {
			mergeYMapValues(
				currentElement,
				newElement,
				query,
				cursorPosition,
				appendCursorScopeKey( cursorScope, ( left + i ).toString() )
			);
		} else {
			// Element is the wrong type (e.g. partial migration) or the
			// incoming value is not an object. Rebuild the entire array.
			yArray.delete( 0, yArray.length );
			yArray.insert(
				0,
				newValue.map( ( item ) =>
					createYMapFromQuery( query, item, true )
				)
			);
			return;
		}
	}

	// Deletes.
	const numOfDeletionsNeeded = Math.max( 0, yArray.length - newValue.length );

	if ( numOfDeletionsNeeded > 0 ) {
		yArray.delete( left + numOfUpdatesNeeded, numOfDeletionsNeeded );
	}

	// Inserts.
	const numOfInsertionsNeeded = Math.max(
		0,
		newValue.length - yArray.length
	);

	if ( numOfInsertionsNeeded > 0 ) {
		const insertAt = left + numOfUpdatesNeeded;
		const itemsToInsert: Y.Map< unknown >[] = new Array(
			numOfInsertionsNeeded
		);

		for ( let i = 0; i < numOfInsertionsNeeded; i++ ) {
			itemsToInsert[ i ] = createYMapFromQuery(
				query,
				newValue[ insertAt + i ],
				true
			);
		}

		yArray.insert( insertAt, itemsToInsert );
	}
}

function mergeYArrayWithBase(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	schema: BlockAttributeSchema,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	baseValue: unknown[]
): boolean {
	if ( ! schema.query || yArray.length !== baseValue.length ) {
		return false;
	}

	const query = schema.query;
	const numOfCommonEntries = Math.min( baseValue.length, newValue.length );

	let left = 0;
	let right = 0;

	for (
		;
		left < numOfCommonEntries &&
		arePlainValuesEqual( baseValue[ left ], newValue[ left ] );
		left++
	) {
		/* nop */
	}

	for (
		;
		right < numOfCommonEntries - left &&
		arePlainValuesEqual(
			baseValue[ baseValue.length - right - 1 ],
			newValue[ newValue.length - right - 1 ]
		);
		right++
	) {
		/* nop */
	}

	if ( baseValue.length === newValue.length + 1 ) {
		const preferredDeleteIndex = getPreferredSingleDeleteIndex(
			yArray,
			baseValue,
			newValue
		);

		if ( preferredDeleteIndex !== undefined ) {
			left = preferredDeleteIndex;
			right = baseValue.length - preferredDeleteIndex - 1;
		}
	}

	const deleteCount =
		baseValue.length === newValue.length
			? 0
			: baseValue.length - left - right;
	const insertCount =
		baseValue.length === newValue.length
			? 0
			: newValue.length - left - right;

	if ( deleteCount > 0 ) {
		yArray.delete( left, deleteCount );
	}

	if ( insertCount > 0 ) {
		yArray.insert(
			left,
			newValue
				.slice( left, left + insertCount )
				.map( ( item ) => createYMapFromQuery( query, item, true ) )
		);
	}

	for ( let index = 0; index < newValue.length; index++ ) {
		const isInserted = index >= left && index < left + insertCount;
		let baseIndex: number | undefined;
		if ( ! isInserted ) {
			baseIndex =
				index < left ? index : index - insertCount + deleteCount;
		}
		const newElement = newValue[ index ];

		if (
			baseIndex !== undefined &&
			arePlainValuesEqual( baseValue[ baseIndex ], newElement )
		) {
			continue;
		}

		const currentElement = yArray.get( index );
		if ( currentElement instanceof Y.Map && isRecord( newElement ) ) {
			mergeYMapValues(
				currentElement,
				newElement,
				query,
				cursorPosition,
				cursorScope,
				baseIndex === undefined ? undefined : baseValue[ baseIndex ]
			);
			continue;
		}

		yArray.delete( 0, yArray.length );
		yArray.insert(
			0,
			newValue.map( ( item ) => createYMapFromQuery( query, item, true ) )
		);
		break;
	}

	return true;
}

function getPreferredSingleDeleteIndex(
	yArray: Y.Array< unknown >,
	baseValue: unknown[],
	newValue: unknown[]
): number | undefined {
	let firstCandidate: number | undefined;

	for ( let index = 0; index < baseValue.length; index++ ) {
		const candidateValue = [
			...baseValue.slice( 0, index ),
			...baseValue.slice( index + 1 ),
		];

		if ( ! arePlainValuesEqual( candidateValue, newValue ) ) {
			continue;
		}

		firstCandidate ??= index;

		if (
			areArrayElementsEqual( baseValue[ index ], yArray.get( index ) )
		) {
			return index;
		}
	}

	return firstCandidate;
}

/**
 * Merge a single value into a Y.Map entry, using the attribute schema to
 * decide how to merge.
 *
 * If the current value is already a matching Y.js type (Y.Text, Y.Array,
 * Y.Map), the update is merged in-place so concurrent edits are preserved.
 * Otherwise the value is replaced wholesale.
 *
 * @param schema         The attribute type definition for this value.
 * @param newVal         The new value to merge into the Y.Map entry.
 * @param yMap           The Y.Map that owns this entry.
 * @param key            The key of this entry in the Y.Map.
 * @param cursorPosition The cursor position for rich-text delta merges from the updated value.
 * @param cursorScope    Indicates a specific block and attribute associated with the editor;
 *                       determines whether the cursor should be updated based on the change.
 * @param baseVal        Optional pre-change value used for rebasing.
 */
function mergeYValue(
	schema: BlockAttributeSchema | undefined,
	newVal: unknown,
	yMap: Y.Map< unknown >,
	key: string,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	baseVal?: unknown
): void {
	const currentVal = yMap.get( key );
	if (
		schema?.type === 'rich-text' &&
		typeof newVal === 'string' &&
		currentVal instanceof Y.Text
	) {
		if (
			areRichTextValuesEquivalent(
				currentVal.toString(),
				newVal,
				schema.__unstablePreserveWhiteSpace
			)
		) {
			return;
		}

		mergeRichTextUpdate(
			currentVal,
			newVal,
			resolveRichTextCursorPosition(
				cursorPosition,
				cursorScope,
				newVal
			),
			typeof baseVal === 'string' ? baseVal : undefined
		);
	} else if (
		schema?.type === 'array' &&
		schema.query &&
		Array.isArray( newVal ) &&
		currentVal instanceof Y.Array
	) {
		mergeYArray(
			currentVal,
			newVal,
			schema,
			cursorPosition,
			cursorScope,
			baseVal
		);
	} else if (
		schema?.type === 'object' &&
		schema.query &&
		isRecord( newVal ) &&
		currentVal instanceof Y.Map
	) {
		mergeYMapValues(
			currentVal,
			newVal,
			schema.query,
			cursorPosition,
			cursorScope,
			baseVal
		);
	} else {
		const newYValue = createYValueFromSchema( schema, newVal );

		// If createYValueFromSchema wrapped the value into a Y type, the
		// current value is the wrong type and needs upgrading. Otherwise,
		// only replace if the raw value actually changed.
		if ( newYValue !== newVal || ! fastDeepEqual( currentVal, newVal ) ) {
			yMap.set( key, newYValue );
		}
	}
}

/**
 * Merge an incoming plain object into an existing Y.Map in-place, using
 * the query schema to decide how each property should be merged.
 *
 * Properties present in the Y.Map but absent from `newObj` are deleted.
 *
 * @param yMap           The existing Y.Map to update.
 * @param newObj         The new plain object to merge into the Y.Map.
 * @param query          The query schema defining property types.
 * @param cursorPosition The local cursor position for rich-text delta merges.
 * @param cursorScope    The selected block attribute scope for rich-text cursor hints.
 * @param baseObj        Optional pre-change object used for rebasing.
 */
function mergeYMapValues(
	yMap: Y.Map< unknown >,
	newObj: Record< string, unknown >,
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	baseObj?: unknown
): void {
	const baseRecord = isRecord( baseObj ) ? baseObj : undefined;

	for ( const [ key, newVal ] of Object.entries( newObj ) ) {
		if (
			baseRecord &&
			Object.hasOwn( baseRecord, key ) &&
			fastDeepEqual( baseRecord[ key ], newVal )
		) {
			continue;
		}

		mergeYValue(
			query[ key ],
			newVal,
			yMap,
			key,
			cursorPosition,
			appendCursorScopeKey( cursorScope, key ),
			baseRecord?.[ key ]
		);
	}

	// Delete properties absent from the incoming object.
	for ( const key of yMap.keys() ) {
		if ( key === ARRAY_ELEMENT_ID_KEY || Object.hasOwn( newObj, key ) ) {
			continue;
		}
		if ( baseRecord && ! Object.hasOwn( baseRecord, key ) ) {
			continue;
		}
		yMap.delete( key );
	}
}

/**
 * Update a single attribute on a Yjs block attributes map (currentAttributes).
 *
 * @param blockName          The block type name, e.g. 'core/paragraph'.
 * @param clientId           The local clientId for the block being merged.
 * @param attributeName      The name of the attribute to update, e.g. 'content'.
 * @param attributeValue     The new value for the attribute.
 * @param currentAttributes  The Y.Map holding the block's current attributes.
 * @param newCursorPosition  The cursor position for rich-text delta merges from the updated value.
 *                           Notably, this may not correspond to the attribute being edited and is
 *                           used to determine if any cursors need shifting in response to the change.
 * @param baseAttributeValue Optional pre-change attribute value used for rebasing.
 */
function updateYBlockAttribute(
	blockName: string,
	clientId: string | undefined,
	attributeName: string,
	attributeValue: unknown,
	currentAttributes: YBlockAttributes,
	newCursorPosition: MergeCursorPosition,
	baseAttributeValue?: unknown
): void {
	const schema = getBlockAttributeSchema( blockName, attributeName );

	/*
	 * @todo There is a slight discrepancy between the attribute name and key, which might
	 *       show up when working with multiline RichText instances (of which there are no
	 *       more within Core). For those instances, a cursor might never be updated in
	 *       response to changes because its `attributeKey` won’t match any of the block’s
	 *       attribute names, and since updating this attribute is based on the block names,
	 *       no suitable key for the cursor scope will be created. To fix, the updating code
	 *       would need to parse multiline attributes and infer the `attributeKey` being updated.
	 */
	mergeYValue(
		schema,
		attributeValue,
		currentAttributes,
		attributeName,
		newCursorPosition,
		{ attributeKey: attributeName, clientId },
		baseAttributeValue
	);
}

/**
 * References the specific block and attribute associated with a RichText component.
 *
 * This is used to associate a cursor with the attribute it’s editing.
 *
 * @see WPBlockSelection
 */
interface RichTextCursorScope {
	attributeKey: string;
	clientId: string | undefined;
}

function appendCursorScopeKey(
	cursorScope: RichTextCursorScope,
	key: string
): RichTextCursorScope {
	return {
		...cursorScope,
		attributeKey: `${ cursorScope.attributeKey }.${ key }`,
	};
}

interface DeltaWithOps {
	ops: Parameters< Y.Text[ 'applyDelta' ] >[ 0 ];
}

/**
 * When the provided cursor falls within the given block and attribute’s scope,
 * returns an index into the RichText’s serialized HTML where the cursor falls.
 *
 * The cursor scope constrains resolution to ensure that indices are only reported
 * when a cursor falls within the block and attribute being updated, since the
 * attributes being updated may not always be the ones where a cursor presently falls.
 *
 * Returned index measures JS string lengths, thus is counted in UTF-16 code units
 * and contains the syntax characters making up HTML tags, comments, character
 * references, and other non-plaintext content.
 *
 * @param cursorPosition Description of the cursor in the new value.
 * @param cursorScope    Cursors should only be updated if they fall within this
 *                       specific block and attribute.
 * @param updatedValue   New RichText value potentially containing cursor.
 * @return String length into serialized HTML for RichText instance where cursor falls.
 */
function resolveRichTextCursorPosition(
	cursorPosition: MergeCursorPosition,
	cursorScope: RichTextCursorScope,
	updatedValue: string
): HtmlStringIndex | null {
	return cursorPosition &&
		cursorPosition.clientId === cursorScope.clientId &&
		cursorPosition.attributeKey === cursorScope.attributeKey &&
		'number' === typeof cursorPosition.offset &&
		Number.isInteger( cursorPosition.offset )
		? richTextOffsetToHtmlIndex(
				updatedValue,
				asRichTextOffset( cursorPosition.offset )
		  )
		: null;
}

// Cached block attribute types, populated once from getBlockTypes().
let cachedBlockAttributeSchemas: Map<
	string,
	Map< string, BlockAttributeSchema >
>;

/**
 * Get the attribute type definition for a block attribute.
 *
 * @param blockName     The name of the block, e.g. 'core/paragraph'.
 * @param attributeName The name of the attribute, e.g. 'content'.
 * @return The type definition of the attribute.
 */
function getBlockAttributeSchema(
	blockName: string,
	attributeName: string
): BlockAttributeSchema | undefined {
	if ( ! cachedBlockAttributeSchemas ) {
		// Parse the attributes for all blocks once.
		cachedBlockAttributeSchemas = new Map();

		for ( const blockType of getBlockTypes() as BlockType[] ) {
			cachedBlockAttributeSchemas.set(
				blockType.name,
				new Map< string, BlockAttributeSchema >(
					Object.entries( blockType.attributes ?? {} ).map(
						( [ name, definition ] ) => {
							const {
								__unstablePreserveWhiteSpace,
								role,
								type,
								query,
							} = definition;
							return [
								name,
								{
									__unstablePreserveWhiteSpace,
									role,
									type,
									query,
								},
							];
						}
					)
				)
			);
		}
	}

	return cachedBlockAttributeSchemas.get( blockName )?.get( attributeName );
}

/**
 * Check if an attribute value is the expected type.
 *
 * @param blockName      The name of the block, e.g. 'core/paragraph'.
 * @param attributeName  The name of the attribute, e.g. 'content'.
 * @param attributeValue The current attribute value.
 * @return True if the attribute type is expected, false otherwise.
 */
function isExpectedAttributeType(
	blockName: string,
	attributeName: string,
	attributeValue: unknown
): boolean {
	const schema = getBlockAttributeSchema( blockName, attributeName );

	if ( schema?.type === 'rich-text' ) {
		return attributeValue instanceof Y.Text;
	}

	if ( schema?.type === 'string' ) {
		return typeof attributeValue === 'string';
	}

	if ( schema?.type === 'array' && schema.query ) {
		return attributeValue instanceof Y.Array;
	}

	if ( schema?.type === 'object' && schema.query ) {
		return attributeValue instanceof Y.Map;
	}

	return true;
}

/**
 * Given a block name and attribute key, return true if the attribute is local
 * and should not be synced.
 *
 * @param blockName     The name of the block, e.g. 'core/image'.
 * @param attributeName The name of the attribute to check, e.g. 'blob'.
 * @return True if the attribute is local, false otherwise.
 */
function isLocalAttribute( blockName: string, attributeName: string ): boolean {
	return (
		'local' === getBlockAttributeSchema( blockName, attributeName )?.role
	);
}

let localDoc: Y.Doc;

/**
 * Given a Y.Text object and an updated string value, diff the new value and
 * apply the delta to the Y.Text.
 *
 * @param blockYText      The Y.Text to update.
 * @param updatedValue    The updated value.
 * @param htmlCursorIndex The cursor index in the updated HTML string.
 */
export function mergeRichTextUpdate(
	blockYText: Y.Text,
	updatedValue: string,
	htmlCursorIndex: HtmlStringIndex | null = null,
	baseValue?: string
): void {
	// Gutenberg does not use Yjs shared types natively, so we can only subscribe
	// to changes from store and apply them to Yjs types that we create and
	// manage. Crucially, for rich-text attributes, we do not receive granular
	// string updates; we get the new full string value on each change, even when
	// only a single character changed.
	//
	// The code below allows us to compute a delta between the current and new
	// value, then apply it to the Y.Text.

	if (
		baseValue !== undefined &&
		blockYText.toString() !== baseValue &&
		updatedValue !== baseValue
	) {
		mergeRebasedRichTextUpdate( blockYText, updatedValue, baseValue );
		return;
	}

	const currentValueAsDelta = new Delta( blockYText.toDelta() );
	const updatedValueAsDelta = new Delta( [ { insert: updatedValue } ] );
	const deltaDiff = currentValueAsDelta.diffWithCursor(
		updatedValueAsDelta,
		htmlCursorIndex
	);

	/**
	 * When there is no cursor involved, or when the diff is able to shuffle properly
	 * around the cursor then apply that already-computed diff.
	 *
	 * However, `diffWithCursor()` currently fails in certain cases, producing corrupted
	 * output. In these cases, fall back to the raw diff as that will apply cleanly,
	 * even if it provides a less meaningful diff.
	 *
	 * @see Delta.diffWithCursor()
	 */
	const safeDiff =
		htmlCursorIndex === null ||
		isDeltaVerificationMatch( blockYText, deltaDiff, updatedValue )
			? deltaDiff
			: currentValueAsDelta.diff( updatedValueAsDelta );

	blockYText.applyDelta( safeDiff.ops );
}

function getCommonPrefixLength( a: string, b: string ): number {
	let length = 0;

	while (
		length < a.length &&
		length < b.length &&
		a[ length ] === b[ length ]
	) {
		length++;
	}

	return length;
}

function getCommonSuffixLength(
	a: string,
	b: string,
	prefixLength: number
): number {
	let length = 0;

	while (
		length + prefixLength < a.length &&
		length + prefixLength < b.length &&
		a[ a.length - length - 1 ] === b[ b.length - length - 1 ]
	) {
		length++;
	}

	return length;
}

function getCurrentIndexForBaseOffset(
	currentValue: string,
	baseValue: string,
	baseOffset: number
): number {
	const basePrefix = baseValue.slice( 0, baseOffset );

	if ( currentValue.startsWith( basePrefix ) ) {
		return basePrefix.length;
	}

	const baseSuffix = baseValue.slice( baseOffset );

	if ( baseSuffix && currentValue.endsWith( baseSuffix ) ) {
		return currentValue.length - baseSuffix.length;
	}

	return Math.min( baseOffset, currentValue.length );
}

function mergeRebasedRichTextUpdate(
	blockYText: Y.Text,
	updatedValue: string,
	baseValue: string
): void {
	// The incoming value was edited from an older base. Apply only its changed
	// slice so a current remote replacement of the same base text is retained.
	const currentValue = blockYText.toString();
	const prefixLength = getCommonPrefixLength( baseValue, updatedValue );
	const suffixLength = getCommonSuffixLength(
		baseValue,
		updatedValue,
		prefixLength
	);
	const deleteLength = baseValue.length - prefixLength - suffixLength;
	const insertedValue = updatedValue.slice(
		prefixLength,
		updatedValue.length - suffixLength
	);
	const currentIndex = getCurrentIndexForBaseOffset(
		currentValue,
		baseValue,
		prefixLength
	);

	if (
		deleteLength > 0 &&
		currentValue.slice( currentIndex, currentIndex + deleteLength ) ===
			baseValue.slice( prefixLength, prefixLength + deleteLength )
	) {
		blockYText.delete( currentIndex, deleteLength );
	}

	if (
		insertedValue &&
		blockYText
			.toString()
			.slice( currentIndex, currentIndex + insertedValue.length ) !==
			insertedValue
	) {
		blockYText.insert( currentIndex, insertedValue );
	}
}

/**
 * Verify that applying a delta to an existing Y.Text object produces the expected
 * output string.
 *
 * A stale, mis-scoped, or corrupted Delta will mutate a text value to the wrong
 * output string. This function applies the given Delta and indicates whether it
 * produces the given expected output string value.
 *
 * @param blockYText    The current Y.Text before applying the candidate delta.
 * @param delta         The candidate delta.
 * @param expectedValue The exact string expected after applying the delta.
 * @return Whether the candidate delta produces the expected value.
 */
function isDeltaVerificationMatch(
	blockYText: Y.Text,
	delta: DeltaWithOps,
	expectedValue: string
): boolean {
	if ( ! localDoc ) {
		// Y.Text must be attached to a Y.Doc to be able to do operations on it.
		// Create a temporary Y.Text attached to a local Y.Doc for delta computation.
		// This is an optimization to avoid creating a new Y.Doc on every update.
		localDoc = new Y.Doc();
	}

	const verificationYText = localDoc.getText( 'verification-text' );

	// Because this is global, it must be cleared before using.
	verificationYText.delete( 0, verificationYText.length );
	verificationYText.insert( 0, blockYText.toString() );
	verificationYText.applyDelta( delta.ops );

	return verificationYText.toString() === expectedValue;
}
