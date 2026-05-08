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
export type MergeCursorPosition = WPBlockSelection | null;

const ARRAY_ELEMENT_ID_KEY = '__unstableSyncId';
const ARRAY_ELEMENT_ID_SYMBOL = Symbol( 'wpSyncArrayElementId' );
const serializableBlocksCache = new WeakMap< WeakKey, Block[] >();
const previousLocalBlocksCache = new WeakMap< YBlocks, Block[] >();

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

function getBlockClientId( block: Block ): string | undefined {
	return 'string' === typeof block.clientId && block.clientId
		? block.clientId
		: undefined;
}

function getClientIdsIfEveryBlockHasUniqueId(
	blocks: Block[]
): string[] | null {
	const ids: string[] = [];
	const seenIds = new Set< string >();

	for ( const block of blocks ) {
		const clientId = getBlockClientId( block );

		if ( ! clientId || seenIds.has( clientId ) ) {
			return null;
		}

		ids.push( clientId );
		seenIds.add( clientId );
	}

	return ids;
}

function getBlocksByClientIdIfEveryBlockHasUniqueId(
	blocks: Block[]
): Map< string, Block > | null {
	const clientIds = getClientIdsIfEveryBlockHasUniqueId( blocks );

	if ( ! clientIds ) {
		return null;
	}

	return new Map(
		clientIds.map( ( clientId, index ) => [ clientId, blocks[ index ] ] )
	);
}

function findBlockIndexByClientId( blocks: Block[], clientId: string ): number {
	return blocks.findIndex(
		( block ) => getBlockClientId( block ) === clientId
	);
}

function getRemoteBlockInsertIndex(
	currentBlocks: Block[],
	currentIndex: number,
	blocksToSync: Block[],
	blockIdsToSync: Set< string >
): number {
	for ( let index = currentIndex - 1; index >= 0; index-- ) {
		const previousClientId = getBlockClientId( currentBlocks[ index ] );

		if ( previousClientId && blockIdsToSync.has( previousClientId ) ) {
			const previousIndex = findBlockIndexByClientId(
				blocksToSync,
				previousClientId
			);

			return -1 === previousIndex
				? blocksToSync.length
				: previousIndex + 1;
		}
	}

	for (
		let index = currentIndex + 1;
		index < currentBlocks.length;
		index++
	) {
		const nextClientId = getBlockClientId( currentBlocks[ index ] );

		if ( nextClientId && blockIdsToSync.has( nextClientId ) ) {
			const nextIndex = findBlockIndexByClientId(
				blocksToSync,
				nextClientId
			);

			return -1 === nextIndex ? blocksToSync.length : nextIndex;
		}
	}

	return blocksToSync.length;
}

function reconcileStaleLocalBlockAttributes(
	localAttributes: BlockAttributes,
	previousAttributes: BlockAttributes,
	currentAttributes: BlockAttributes
): BlockAttributes {
	let reconciledAttributes: BlockAttributes | undefined;
	const attributeNames = new Set( [
		...Object.keys( localAttributes ),
		...Object.keys( previousAttributes ),
		...Object.keys( currentAttributes ),
	] );

	attributeNames.forEach( ( attributeName ) => {
		const hasLocalAttribute = Object.hasOwn(
			localAttributes,
			attributeName
		);
		const hadPreviousAttribute = Object.hasOwn(
			previousAttributes,
			attributeName
		);
		const localAttribute = localAttributes[ attributeName ];
		const previousAttribute = previousAttributes[ attributeName ];
		const localAttributeIsUnchanged =
			hasLocalAttribute === hadPreviousAttribute &&
			( ! hasLocalAttribute ||
				fastDeepEqual( localAttribute, previousAttribute ) );

		if ( ! localAttributeIsUnchanged ) {
			return;
		}

		if ( ! reconciledAttributes ) {
			reconciledAttributes = { ...localAttributes };
		}

		const hasCurrentAttribute = Object.hasOwn(
			currentAttributes,
			attributeName
		);
		const currentAttribute = currentAttributes[ attributeName ];

		if ( hasCurrentAttribute ) {
			reconciledAttributes[ attributeName ] = currentAttribute;
		} else {
			delete reconciledAttributes[ attributeName ];
		}
	} );

	return reconciledAttributes ?? localAttributes;
}

function reconcileStaleLocalBlock(
	localBlock: Block,
	previousBlock: Block,
	currentBlock: Block
): Block {
	if ( fastDeepEqual( localBlock, previousBlock ) ) {
		return currentBlock;
	}

	let reconciledBlock: Block | undefined;
	const getReconciledBlock = () => {
		if ( ! reconciledBlock ) {
			reconciledBlock = { ...localBlock };
		}
		return reconciledBlock;
	};

	if (
		localBlock.name === previousBlock.name &&
		localBlock.name === currentBlock.name
	) {
		const reconciledAttributes = reconcileStaleLocalBlockAttributes(
			localBlock.attributes,
			previousBlock.attributes,
			currentBlock.attributes
		);

		if ( reconciledAttributes !== localBlock.attributes ) {
			getReconciledBlock().attributes = reconciledAttributes;
		}
	}

	const reconciledInnerBlocks = reconcileStaleLocalBlockValues(
		localBlock.innerBlocks ?? [],
		previousBlock.innerBlocks ?? [],
		currentBlock.innerBlocks ?? []
	);

	if ( reconciledInnerBlocks !== localBlock.innerBlocks ) {
		getReconciledBlock().innerBlocks = reconciledInnerBlocks;
	}

	return reconciledBlock ?? localBlock;
}

function reconcileStaleLocalBlockValues(
	localBlocks: Block[],
	previousBlocks: Block[],
	currentBlocks: Block[]
): Block[] {
	const previousBlocksByClientId =
		getBlocksByClientIdIfEveryBlockHasUniqueId( previousBlocks );
	const currentBlocksByClientId =
		getBlocksByClientIdIfEveryBlockHasUniqueId( currentBlocks );

	if ( ! previousBlocksByClientId || ! currentBlocksByClientId ) {
		return localBlocks;
	}

	let reconciledBlocks: Block[] | undefined;

	localBlocks.forEach( ( localBlock, index ) => {
		const clientId = getBlockClientId( localBlock );

		if ( ! clientId ) {
			return;
		}

		const previousBlock = previousBlocksByClientId.get( clientId );
		const currentBlock = currentBlocksByClientId.get( clientId );

		if ( ! previousBlock || ! currentBlock ) {
			return;
		}

		const reconciledBlock = reconcileStaleLocalBlock(
			localBlock,
			previousBlock,
			currentBlock
		);

		if ( reconciledBlock === localBlock ) {
			return;
		}

		if ( ! reconciledBlocks ) {
			reconciledBlocks = [ ...localBlocks ];
		}

		reconciledBlocks[ index ] = reconciledBlock;
	} );

	return reconciledBlocks ?? localBlocks;
}

function reconcileStaleLocalBlocks(
	yblocks: YBlocks,
	localBlocksToSync: Block[]
): Block[] {
	const previousBlocks = previousLocalBlocksCache.get( yblocks );

	if ( ! previousBlocks ) {
		return localBlocksToSync;
	}

	const localClientIds =
		getClientIdsIfEveryBlockHasUniqueId( localBlocksToSync );
	const previousClientIds =
		getClientIdsIfEveryBlockHasUniqueId( previousBlocks );
	const currentBlocks = yblocks.toJSON() as Block[];
	const currentClientIds =
		getClientIdsIfEveryBlockHasUniqueId( currentBlocks );

	if ( ! localClientIds || ! previousClientIds || ! currentClientIds ) {
		return localBlocksToSync;
	}

	const reconciledLocalBlocks = reconcileStaleLocalBlockValues(
		localBlocksToSync,
		previousBlocks,
		currentBlocks
	);
	const localClientIdSet = new Set( localClientIds );
	const previousClientIdSet = new Set( previousClientIds );
	const currentClientIdSet = new Set( currentClientIds );
	// The local editor sends full block snapshots. Reconcile those snapshots
	// against the last local base before running the full-array merge so remote
	// top-level inserts/deletes are not inferred as local structural edits.
	const remotelyDeletedClientIds = new Set(
		previousClientIds.filter(
			( clientId ) =>
				localClientIdSet.has( clientId ) &&
				! currentClientIdSet.has( clientId )
		)
	);
	const blocksToSync = reconciledLocalBlocks.filter( ( block ) => {
		const clientId = getBlockClientId( block );
		return ! clientId || ! remotelyDeletedClientIds.has( clientId );
	} );
	const blockIdsToSync = new Set(
		blocksToSync.map( ( block ) => getBlockClientId( block ) as string )
	);

	currentBlocks.forEach( ( currentBlock, currentIndex ) => {
		const clientId = getBlockClientId( currentBlock );

		if (
			! clientId ||
			localClientIdSet.has( clientId ) ||
			previousClientIdSet.has( clientId ) ||
			blockIdsToSync.has( clientId )
		) {
			return;
		}

		const insertIndex = getRemoteBlockInsertIndex(
			currentBlocks,
			currentIndex,
			blocksToSync,
			blockIdsToSync
		);
		blocksToSync.splice( insertIndex, 0, currentBlock );
		blockIdsToSync.add( clientId );
	} );

	return blocksToSync;
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

/**
 * @param {any}   gblock
 * @param {Y.Map} yblock
 */
function areBlocksEqual( gblock: Block, yblock: YBlock ): boolean {
	const yblockAsJson = yblock.toJSON();

	// we must not sync clientId, as this can't be generated consistently and
	// hence will lead to merge conflicts.
	const overwrites = {
		innerBlocks: null,
		clientId: null,
	};
	const res = fastDeepEqual(
		Object.assign( {}, gblock, overwrites ),
		Object.assign( {}, yblockAsJson, overwrites )
	);
	const inners = gblock.innerBlocks || [];
	const yinners = yblock.get( 'innerBlocks' );
	return (
		res &&
		inners.length === yinners?.length &&
		inners.every( ( block: Block, i: number ) =>
			areBlocksEqual( block, yinners.get( i ) )
		)
	);
}

function createNewYAttributeMap(
	blockName: string,
	attributes: BlockAttributes,
	blockPath?: string
): YBlockAttributes {
	return new Y.Map(
		Object.entries( attributes ).map(
			( [ attributeName, attributeValue ] ) => {
				return [
					attributeName,
					createNewYAttributeValue(
						blockName,
						attributeName,
						attributeValue,
						blockPath
							? `${ blockPath }/attributes/${ attributeName }`
							: undefined
					),
				];
			}
		)
	);
}

function createNewYAttributeValue(
	blockName: string,
	attributeName: string,
	attributeValue: unknown,
	attributePath?: string
): Y.Text | Y.Array< unknown > | Y.Map< unknown > | unknown {
	const schema = getBlockAttributeSchema( blockName, attributeName );
	return createYValueFromSchema( schema, attributeValue, attributePath );
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
 * @param schema           The attribute type definition.
 * @param value            The plain JS value to convert.
 * @param arrayElementPath Optional stable path used to seed array element IDs.
 * @return A Y.js type or the original value.
 */
function createYValueFromSchema(
	schema: BlockAttributeSchema | undefined,
	value: unknown,
	arrayElementPath?: string
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
					arrayElementPath
						? `${ arrayElementPath }/${ index }`
						: undefined
				)
			)
		);

		return yArray;
	}

	if ( schema.type === 'object' && schema.query && isRecord( value ) ) {
		return createYMapFromQuery( schema.query, value, undefined, false );
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
 * @param query              The query schema defining the properties.
 * @param obj                The plain object to convert.
 * @param arrayElementId     Optional stable ID for this array element.
 * @param withArrayElementId Whether to persist the stable array element ID.
 * @return A Y.Map with typed values.
 */
function createYMapFromQuery(
	query: Record< string, BlockAttributeSchema >,
	obj: unknown,
	arrayElementId?: string,
	withArrayElementId = true
): Y.Map< unknown > {
	if ( ! isRecord( obj ) ) {
		return new Y.Map();
	}

	const resolvedArrayElementId = withArrayElementId
		? getArrayElementId( obj ) ?? arrayElementId ?? uuidv4()
		: undefined;
	const entries: [ string, unknown ][] = Object.entries( obj )
		.filter( ( [ key ] ) => key !== ARRAY_ELEMENT_ID_KEY )
		.map( ( [ key, val ] ): [ string, unknown ] => {
			const subSchema = query[ key ];
			return [
				key,
				createYValueFromSchema(
					subSchema,
					val,
					resolvedArrayElementId
						? `${ resolvedArrayElementId }/${ key }`
						: undefined
				),
			];
		} );

	if ( resolvedArrayElementId ) {
		entries.push( [ ARRAY_ELEMENT_ID_KEY, resolvedArrayElementId ] );
	}

	return new Y.Map( entries );
}

function createNewYBlock( block: Block, blockPath?: string ): YBlock {
	return createYMap< YBlockRecord >(
		Object.fromEntries(
			Object.entries( block ).map( ( [ key, value ] ) => {
				switch ( key ) {
					case 'attributes': {
						return [
							key,
							createNewYAttributeMap(
								block.name,
								value,
								blockPath
							),
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
							value.map( ( innerBlock: Block, index: number ) =>
								createNewYBlock(
									innerBlock,
									blockPath
										? `${ blockPath }/innerBlocks/${ index }`
										: undefined
								)
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

function getYBlockClientId( yblock: YBlock ): string | undefined {
	const clientId = yblock.get( 'clientId' );
	return typeof clientId === 'string' && clientId ? clientId : undefined;
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

function canReorderBlocksByClientId(
	baseBlocks: Block[],
	blocksToSync: Block[]
): boolean {
	if ( baseBlocks.length !== blocksToSync.length || baseBlocks.length < 2 ) {
		return false;
	}

	const baseClientIds = baseBlocks.map( getBlockClientId );
	const incomingClientIds = blocksToSync.map( getBlockClientId );

	if (
		baseClientIds.some( ( clientId ) => ! clientId ) ||
		incomingClientIds.some( ( clientId ) => ! clientId )
	) {
		return false;
	}

	const baseSet = new Set( baseClientIds );

	return (
		baseSet.size === baseClientIds.length &&
		baseSet.size === incomingClientIds.length &&
		incomingClientIds.every( ( clientId ) => baseSet.has( clientId ) )
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
	if (
		! baseBlocks ||
		! canReorderYBlocksByClientId( yblocks, baseBlocks ) ||
		! canReorderBlocksByClientId( baseBlocks, blocksToSync )
	) {
		return false;
	}

	const rebasedClientIds = baseBlocks.map( getBlockClientId );

	for (
		let targetIndex = 0;
		targetIndex < blocksToSync.length;
		targetIndex++
	) {
		const targetClientId = getBlockClientId( blocksToSync[ targetIndex ] );

		if ( rebasedClientIds[ targetIndex ] === targetClientId ) {
			continue;
		}

		const baseIndex = rebasedClientIds.indexOf( targetClientId );
		const currentIndex = yblocks
			.toArray()
			.findIndex(
				( yblock ) => getYBlockClientId( yblock ) === targetClientId
			);

		if ( baseIndex === -1 || currentIndex === -1 ) {
			return false;
		}

		const reorderedBlock = createNewYBlock(
			yblocks.get( currentIndex ).toJSON() as unknown as Block
		);
		yblocks.delete( currentIndex, 1 );
		yblocks.insert( targetIndex, [ reorderedBlock ] );

		rebasedClientIds.splice( baseIndex, 1 );
		rebasedClientIds.splice( targetIndex, 0, targetClientId );
	}

	return true;
}

function areClientIdsEqual( a: string[], b: string[] ): boolean {
	return (
		a.length === b.length &&
		a.every( ( value, index ) => value === b[ index ] )
	);
}

function reconcileUnchangedBaseSnapshot(
	yblocks: YBlocks,
	baseBlocks: Block[] | undefined,
	blocksToSync: Block[]
): { baseBlocks: Block[]; blocksToSync: Block[] } | undefined {
	if ( ! baseBlocks ) {
		return;
	}

	const baseClientIds = getClientIdsIfEveryBlockHasUniqueId( baseBlocks );
	const incomingClientIds =
		getClientIdsIfEveryBlockHasUniqueId( blocksToSync );
	const currentBlocks = yblocks.toJSON() as Block[];
	const currentClientIds =
		getClientIdsIfEveryBlockHasUniqueId( currentBlocks );

	if (
		! baseClientIds ||
		! incomingClientIds ||
		! currentClientIds ||
		! areClientIdsEqual( baseClientIds, incomingClientIds )
	) {
		return;
	}

	const incomingBlocksByClientId = new Map(
		blocksToSync.map( ( block ) => [ getBlockClientId( block ), block ] )
	);
	const baseBlocksByClientId = new Map(
		baseBlocks.map( ( block ) => [ getBlockClientId( block ), block ] )
	);
	const reconciledBlocks: Block[] = [];
	const reconciledBaseBlocks: Block[] = [];

	currentBlocks.forEach( ( currentBlock ) => {
		const clientId = getBlockClientId( currentBlock );

		if ( ! clientId ) {
			return;
		}

		const incomingBlock = incomingBlocksByClientId.get( clientId );

		if ( incomingBlock ) {
			reconciledBlocks.push( incomingBlock );
			reconciledBaseBlocks.push(
				baseBlocksByClientId.get( clientId ) ?? currentBlock
			);
			return;
		}

		if ( ! baseBlocksByClientId.has( clientId ) ) {
			reconciledBlocks.push( currentBlock );
			reconciledBaseBlocks.push( currentBlock );
		}
	} );

	return {
		baseBlocks: reconciledBaseBlocks,
		blocksToSync: reconciledBlocks,
	};
}

function mergeBlockIntoYBlock(
	yblock: YBlock,
	block: Block,
	cursorPosition: MergeCursorPosition,
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
						const isExpectedType = isExpectedAttributeType(
							block.name,
							attributeName,
							currentAttribute
						);

						if (
							baseBlock &&
							isExpectedType &&
							fastDeepEqual(
								baseAttributes[ attributeName ],
								attributeValue
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
								getBlockClientId( block ),
								attributeName,
								attributeValue,
								currentAttributes,
								cursorPosition,
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

				// Recursively merge innerBlocks
				let yInnerBlocks = yblock.get( key );

				if ( ! ( yInnerBlocks instanceof Y.Array ) ) {
					yInnerBlocks = new Y.Array< YBlock >();
					yblock.set( key, yInnerBlocks );
				}

				mergeCrdtBlocks(
					yInnerBlocks,
					value ?? [],
					cursorPosition,
					baseBlock?.innerBlocks
				);
				break;
			}

			default:
				if ( baseBlock && fastDeepEqual( baseBlock[ key ], value ) ) {
					break;
				}

				if ( ! fastDeepEqual( block[ key ], yblock.get( key ) ) ) {
					yblock.set( key, value );
				}
		}
	} );
	yblock.forEach( ( _v, k ) => {
		if ( ! block.hasOwnProperty( k ) ) {
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
	cursorPosition: MergeCursorPosition,
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

	for ( let index = 0; index < yblocks.length; index++ ) {
		const yblock = yblocks.get( index );
		const clientId = getYBlockClientId( yblock );
		const block = incomingBlocksByClientId.get( clientId );

		if ( block ) {
			mergeBlockIntoYBlock(
				yblock,
				block,
				cursorPosition,
				baseBlocksByClientId.get( clientId )
			);
		}
	}
}

/**
 * Merge incoming block data into the local Y.Doc.
 * This function is called to sync local block changes to a shared Y.Doc.
 *
 * @param yblocks        The blocks in the local Y.Doc.
 * @param incomingBlocks Gutenberg blocks being synced.
 * @param cursorPosition The position of the cursor after the change occurs.
 * @param baseBlocks     Optional pre-change block snapshot used for rebasing.
 */
export function mergeCrdtBlocks(
	yblocks: YBlocks,
	incomingBlocks: Block[],
	cursorPosition: MergeCursorPosition,
	baseBlocks?: Block[]
): void {
	// Ensure we are working with serializable block data.
	if ( ! serializableBlocksCache.has( incomingBlocks ) ) {
		serializableBlocksCache.set(
			incomingBlocks,
			makeBlocksSerializable( incomingBlocks )
		);
	}
	const localBlocksToSync =
		serializableBlocksCache.get( incomingBlocks ) ?? [];
	const baseBlocksToSync = baseBlocks
		? makeBlocksSerializable( baseBlocks )
		: undefined;
	const reconciledSnapshot = reconcileUnchangedBaseSnapshot(
		yblocks,
		baseBlocksToSync,
		localBlocksToSync
	);
	const previousBlocks =
		reconciledSnapshot?.baseBlocks ??
		baseBlocksToSync ??
		previousLocalBlocksCache.get( yblocks );
	const blocksToSync = reconciledSnapshot?.blocksToSync ?? ( baseBlocksToSync
		? localBlocksToSync
		: reconcileStaleLocalBlocks( yblocks, localBlocksToSync ) );

	if ( rebaseYBlocksByClientId( yblocks, previousBlocks, blocksToSync ) ) {
		mergeYBlocksByClientId(
			yblocks,
			blocksToSync,
			cursorPosition,
			previousBlocks
		);
		removeDuplicateClientIds( yblocks );
		previousLocalBlocksCache.set( yblocks, localBlocksToSync );
		return;
	}

	reorderYBlocksByClientId( yblocks, blocksToSync );

	mergeCrdtBlocksIntoYBlocks(
		yblocks,
		blocksToSync,
		cursorPosition,
		previousBlocks
	);
	previousLocalBlocksCache.set( yblocks, localBlocksToSync );
}

function mergeCrdtBlocksIntoYBlocks(
	yblocks: YBlocks,
	blocksToSync: Block[],
	cursorPosition: MergeCursorPosition,
	previousBlocks?: Block[]
): void {
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
	for ( let i = 0; i < numOfUpdatesNeeded; i++, left++ ) {
		const block = blocksToSync[ left ];
		const yblock = yblocks.get( left );
		const previousBlock = previousBlocks?.[ left ];

		mergeBlockIntoYBlock( yblock, block, cursorPosition, previousBlock );
	}

	// deletes
	yblocks.delete( left, numOfDeletionsNeeded );

	// inserts
	for ( let i = 0; i < numOfInsertionsNeeded; i++, left++ ) {
		const newBlock = [
			createNewYBlock( blocksToSync[ left ], String( left ) ),
		];

		yblocks.insert( left, newBlock );
	}

	removeDuplicateClientIds( yblocks );
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
		enumerable: false,
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

function mergeYArrayByElementIds(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope?: RichTextCursorScope
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
					undefined,
					cursorScope
				);
			}
		} else {
			yArray.insert( index, [
				createYMapFromQuery( query, newElement ),
			] );
		}

		index++;
	}

	if ( yArray.length > index ) {
		yArray.delete( index, yArray.length - index );
	}

	return true;
}

function arePlainValuesEqual( a: unknown, b: unknown ): boolean {
	return fastDeepEqual( a, b );
}

function isExpectedYValueTypeForSchema(
	schema: BlockAttributeSchema | undefined,
	newVal: unknown,
	currentVal: unknown
): boolean {
	if ( schema?.type === 'rich-text' ) {
		return currentVal instanceof Y.Text;
	}

	if ( schema?.type === 'array' && schema.query && Array.isArray( newVal ) ) {
		return currentVal instanceof Y.Array;
	}

	if ( schema?.type === 'object' && schema.query && isRecord( newVal ) ) {
		return currentVal instanceof Y.Map;
	}

	return true;
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
	previousLength: number
): number {
	const previousId = getArrayElementId( previousElement );

	if ( previousId ) {
		for ( let i = 0; i < yArray.length; i++ ) {
			if ( getArrayElementId( yArray.get( i ) ) === previousId ) {
				return i;
			}
		}
	}

	for ( let i = 0; i < yArray.length; i++ ) {
		if ( areArrayElementsEqual( previousElement, yArray.get( i ) ) ) {
			return i;
		}
	}

	if ( yArray.length === previousLength && preferredIndex < yArray.length ) {
		return preferredIndex;
	}

	return preferredIndex < yArray.length ? preferredIndex : -1;
}

function mergeYArrayLocalChanges(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	previousValue: unknown[],
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	cursorScope?: RichTextCursorScope
): boolean {
	if ( arePlainValuesEqual( newValue, previousValue ) ) {
		return true;
	}

	if ( newValue.length !== previousValue.length ) {
		return false;
	}

	// No remote divergence: preserve existing behavior for ordinary local
	// inserts/deletes/reorders.
	if ( isYArrayEqualToPlainArray( yArray, previousValue ) ) {
		return false;
	}

	const sharedLength = Math.min( previousValue.length, newValue.length );

	for ( let i = 0; i < sharedLength; i++ ) {
		const previousElement = previousValue[ i ];
		const newElement = newValue[ i ];

		if ( arePlainValuesEqual( previousElement, newElement ) ) {
			continue;
		}

		const currentIndex = findYArrayElementIndex(
			yArray,
			previousElement,
			i,
			previousValue.length
		);

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
				isRecord( previousElement ) ? previousElement : undefined,
				cursorScope
			);
		}
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
 * @param baseValue      Optional pre-change array snapshot used for rebasing.
 * @param cursorScope    The selected block attribute scope for rich-text cursor hints.
 */
function mergeYArray(
	yArray: Y.Array< unknown >,
	newValue: unknown[],
	schema: BlockAttributeSchema,
	cursorPosition: MergeCursorPosition,
	baseValue?: unknown,
	cursorScope?: RichTextCursorScope
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
		mergeYArrayWithBase(
			yArray,
			newValue,
			schema,
			cursorPosition,
			baseValue,
			cursorScope
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
				undefined,
				cursorScope
			);
		} else {
			// Element is the wrong type (e.g. partial migration) or the
			// incoming value is not an object. Rebuild the entire array.
			yArray.delete( 0, yArray.length );
			yArray.insert(
				0,
				newValue.map( ( item ) => createYMapFromQuery( query, item ) )
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
				newValue[ insertAt + i ]
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
	baseValue: unknown[],
	cursorScope?: RichTextCursorScope
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
		fastDeepEqual( baseValue[ left ], newValue[ left ] );
		left++
	) {
		/* nop */
	}

	for (
		;
		right < numOfCommonEntries - left &&
		fastDeepEqual(
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
				.map( ( item ) => createYMapFromQuery( query, item ) )
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
			fastDeepEqual( baseValue[ baseIndex ], newElement )
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
				baseIndex === undefined ? undefined : baseValue[ baseIndex ],
				cursorScope
			);
			continue;
		}

		yArray.delete( 0, yArray.length );
		yArray.insert(
			0,
			newValue.map( ( item ) => createYMapFromQuery( query, item ) )
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

		if ( ! fastDeepEqual( candidateValue, newValue ) ) {
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
 * @param cursorPosition The local cursor position for rich-text delta merges.
 * @param baseVal        Optional pre-change value used for rebasing.
 * @param cursorScope    The selected block attribute scope for rich-text cursor hints.
 */
function mergeYValue(
	schema: BlockAttributeSchema | undefined,
	newVal: unknown,
	yMap: Y.Map< unknown >,
	key: string,
	cursorPosition: MergeCursorPosition,
	baseVal?: unknown,
	cursorScope?: RichTextCursorScope
): void {
	const currentVal = yMap.get( key );

	if (
		baseVal !== undefined &&
		arePlainValuesEqual( baseVal, newVal ) &&
		isExpectedYValueTypeForSchema( schema, newVal, currentVal )
	) {
		return;
	}

	if (
		schema?.type === 'rich-text' &&
		typeof newVal === 'string' &&
		currentVal instanceof Y.Text
	) {
		mergeRichTextUpdate(
			currentVal,
			newVal,
			resolveRichTextCursorPosition( cursorPosition, cursorScope, newVal )
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
			baseVal,
			cursorScope
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
			baseVal,
			cursorScope
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
 * @param baseObj        Optional pre-change object used for rebasing.
 * @param cursorScope    The selected block attribute scope for rich-text cursor hints.
 */
function mergeYMapValues(
	yMap: Y.Map< unknown >,
	newObj: Record< string, unknown >,
	query: Record< string, BlockAttributeSchema >,
	cursorPosition: MergeCursorPosition,
	baseObj?: unknown,
	cursorScope?: RichTextCursorScope
): void {
	const baseRecord = isRecord( baseObj ) ? baseObj : undefined;

	for ( const [ key, newVal ] of Object.entries( newObj ) ) {
		if (
			baseRecord &&
			Object.hasOwn( baseRecord, key ) &&
			fastDeepEqual( baseRecord[ key ], newVal ) &&
			isExpectedYValueTypeForSchema(
				query[ key ],
				newVal,
				yMap.get( key )
			)
		) {
			continue;
		}

		mergeYValue(
			query[ key ],
			newVal,
			yMap,
			key,
			cursorPosition,
			baseRecord?.[ key ],
			cursorScope
		);
	}

	// Delete properties absent from the incoming object.
	for ( const key of yMap.keys() ) {
		if ( key !== ARRAY_ELEMENT_ID_KEY && ! Object.hasOwn( newObj, key ) ) {
			if ( baseRecord && ! Object.hasOwn( baseRecord, key ) ) {
				continue;
			}
			yMap.delete( key );
		}
	}
}

/**
 * Update a single attribute on a Yjs block attributes map (currentAttributes).
 *
 * @param blockName          The block type name, e.g. 'core/paragraph'.
 * @param clientId           The clientId for the block being updated.
 * @param attributeName      The name of the attribute to update, e.g. 'content'.
 * @param attributeValue     The new value for the attribute.
 * @param currentAttributes  The Y.Map holding the block's current attributes.
 * @param cursorPosition     The local cursor position, used when merging rich-text deltas.
 * @param baseAttributeValue Optional pre-change attribute value used for rebasing.
 */
function updateYBlockAttribute(
	blockName: string,
	clientId: string | undefined,
	attributeName: string,
	attributeValue: unknown,
	currentAttributes: YBlockAttributes,
	cursorPosition: MergeCursorPosition,
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
		cursorPosition,
		baseAttributeValue,
		{ attributeKey: attributeName, clientId }
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
	cursorScope: RichTextCursorScope | undefined,
	updatedValue: string
): HtmlStringIndex | null {
	return cursorPosition &&
		cursorScope &&
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
							const { role, type, query } = definition;
							return [ name, { role, type, query } ];
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
	htmlCursorIndex: HtmlStringIndex | null = null
): void {
	// Gutenberg does not use Yjs shared types natively, so we can only subscribe
	// to changes from store and apply them to Yjs types that we create and
	// manage. Crucially, for rich-text attributes, we do not receive granular
	// string updates; we get the new full string value on each change, even when
	// only a single character changed.
	//
	// The code below allows us to compute a delta between the current and new
	// value, then apply it to the Y.Text.

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
