#!/usr/bin/env node

/**
 * Standalone Yjs repro for the nested awareness parent-walk bug.
 *
 * This intentionally does not import Gutenberg. It builds the two Yjs shapes
 * relevant to PostEditorAwareness.convertSelectionStateToAbsolute():
 *
 *   top-level: Y.Text -> attributes Y.Map -> block Y.Map
 *   nested:    Y.Text -> cell Y.Map -> cells Y.Array -> row Y.Map
 *              -> body Y.Array -> attributes Y.Map -> block Y.Map
 *
 * The old lookup used `absolutePosition.type.parent?.parent`, which finds the
 * block only in the top-level case.
 */

const assert = require( 'node:assert/strict' );
const Y = require( 'yjs' );

function createDocument() {
	const doc = new Y.Doc();

	const topLevelText = new Y.Text( 'Top level text' );
	const nestedCellText = new Y.Text( 'Alpha' );

	const body = new Y.Array();
	const cells = new Y.Array();
	const cell = new Y.Map( [ [ 'content', nestedCellText ] ] );
	const row = new Y.Map( [ [ 'cells', cells ] ] );
	cells.insert( 0, [ cell ] );
	body.insert( 0, [ row ] );

	const attributes = new Y.Map( [
		[ 'content', topLevelText ],
		[ 'body', body ],
	] );

	const block = new Y.Map( [
		[ 'clientId', 'local-table-block' ],
		[ 'name', 'core/table' ],
		[ 'attributes', attributes ],
		[ 'innerBlocks', new Y.Array() ],
	] );

	const blocks = new Y.Array();
	blocks.insert( 0, [ block ] );
	doc.getMap( 'record' ).set( 'blocks', blocks );

	return { doc, block, topLevelText, nestedCellText };
}

function oldFixedDepthLookup( relativePosition, doc ) {
	const absolutePosition = Y.createAbsolutePositionFromRelativePosition(
		relativePosition,
		doc
	);

	const yType = absolutePosition?.type.parent?.parent;
	return yType instanceof Y.Map && isBlockMap( yType ) ? yType : null;
}

function ancestorWalkLookup( relativePosition, doc ) {
	const absolutePosition = Y.createAbsolutePositionFromRelativePosition(
		relativePosition,
		doc
	);

	let yType = absolutePosition?.type;
	while ( yType ) {
		if ( yType instanceof Y.Map && isBlockMap( yType ) ) {
			return yType;
		}
		yType = yType.parent;
	}

	return null;
}

function isBlockMap( yMap ) {
	return (
		typeof yMap.get( 'clientId' ) === 'string' &&
		typeof yMap.get( 'name' ) === 'string' &&
		yMap.get( 'attributes' ) instanceof Y.Map &&
		yMap.get( 'innerBlocks' ) instanceof Y.Array
	);
}

function parentChain( yType ) {
	const names = [];
	let current = yType;
	while ( current ) {
		names.push( current.constructor.name );
		current = current.parent;
	}
	return names.join( ' -> ' );
}

const { doc, block, topLevelText, nestedCellText } = createDocument();

const topLevelRelativePosition = Y.createRelativePositionFromTypeIndex(
	topLevelText,
	1
);
const nestedRelativePosition = Y.createRelativePositionFromTypeIndex(
	nestedCellText,
	1
);

const topLevelOldResult = oldFixedDepthLookup(
	topLevelRelativePosition,
	doc
);
const nestedOldResult = oldFixedDepthLookup( nestedRelativePosition, doc );
const nestedAncestorResult = ancestorWalkLookup( nestedRelativePosition, doc );

assert.equal( topLevelOldResult, block );
assert.equal( nestedOldResult, null );
assert.equal( nestedAncestorResult, block );

console.log( 'Top-level parent chain:' );
console.log( `  ${ parentChain( topLevelText ) }` );
console.log( '  old parent.parent lookup: found block' );
console.log();
console.log( 'Nested table-cell parent chain:' );
console.log( `  ${ parentChain( nestedCellText ) }` );
console.log( '  old parent.parent lookup: null' );
console.log( '  ancestor-walk lookup: found block' );
console.log();
console.log( 'Bug reproduced: fixed-depth lookup cannot resolve nested Y.Text.' );
