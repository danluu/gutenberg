/**
 * External dependencies
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

function paragraphBlock( content: string, clientId: string ): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: { content },
		innerBlocks: [],
	};
}

function readContents( yblocks: Y.Array< YBlock > ): string[] {
	return yblocks
		.toJSON()
		.map( ( block: Block ) => block.attributes.content as string );
}

describe( 'CRDT block snapshot replacement', () => {
	const docs: Y.Doc[] = [];

	afterEach( () => {
		for ( const doc of docs ) {
			doc.destroy();
		}
		docs.length = 0;
	} );

	function createBlocks() {
		return {
			old: paragraphBlock( 'old checkpoint', 'old' ),
			middle: paragraphBlock( 'middle checkpoint', 'middle' ),
			newer: paragraphBlock( 'newer checkpoint', 'newer' ),
			remote: paragraphBlock( 'remote append', 'remote' ),
		};
	}

	it( 'keeps stale local snapshots non-destructive by default', () => {
		const doc = new Y.Doc();
		docs.push( doc );
		const yblocks = doc.getArray< YBlock >();
		const { old, middle, newer, remote } = createBlocks();

		mergeCrdtBlocks( yblocks, [ old, middle, newer, remote ], null );
		mergeCrdtBlocks( yblocks, [ old ], null, [ old, middle, newer ] );

		expect( readContents( yblocks ) ).toEqual( [
			'old checkpoint',
			'middle checkpoint',
			'newer checkpoint',
			'remote append',
		] );
	} );

	it( 'replaces blocks when applying an authoritative restored snapshot', () => {
		const doc = new Y.Doc();
		docs.push( doc );
		const yblocks = doc.getArray< YBlock >();
		const { old, middle, newer, remote } = createBlocks();

		mergeCrdtBlocks( yblocks, [ old, middle, newer, remote ], null );
		mergeCrdtBlocks( yblocks, [ old ], null, [ old, middle, newer ], true );

		expect( readContents( yblocks ) ).toEqual( [ 'old checkpoint' ] );
	} );
} );
