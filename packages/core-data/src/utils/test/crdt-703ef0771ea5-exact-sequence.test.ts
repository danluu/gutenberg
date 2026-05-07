/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/table',
			attributes: {
				body: {
					type: 'array',
					query: {
						cells: {
							type: 'array',
							query: {
								content: { type: 'rich-text' },
								tag: { type: 'string' },
							},
						},
					},
				},
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import {
	deserializeBlockAttributes,
	mergeCrdtBlocks,
	type Block,
	type YBlock,
} from '../crdt-blocks';

type RuntimeRow = {
	cells: Array< {
		content: unknown;
		tag: string;
	} >;
};

function row( first: string, second: string ): RuntimeRow {
	return {
		cells: [
			{ content: first, tag: 'td' },
			{ content: second, tag: 'td' },
		],
	};
}

function tableBlock( rows: RuntimeRow[] ): Block {
	return {
		name: 'core/table',
		clientId: 'table-block',
		attributes: {
			body: rows,
		},
		innerBlocks: [],
	};
}

function getRuntimeBlocks( yblocks: Y.Array< YBlock > ): Block[] {
	return deserializeBlockAttributes( yblocks.toJSON() as Block[] );
}

function getRuntimeRows( yblocks: Y.Array< YBlock > ): RuntimeRow[] {
	return getRuntimeBlocks( yblocks )[ 0 ].attributes.body as RuntimeRow[];
}

function cellText( content: unknown ): string {
	return typeof content === 'object' && content && 'valueOf' in content
		? String( content.valueOf() )
		: String( content );
}

function getRowTexts( yblocks: Y.Array< YBlock > ): string[][] {
	return getRuntimeRows( yblocks ).map( ( currentRow ) =>
		currentRow.cells.map( ( cell ) => cellText( cell.content ) )
	);
}

function syncBoth( first: Y.Doc, second: Y.Doc ) {
	const firstUpdate = Y.encodeStateAsUpdate( first );
	const secondUpdate = Y.encodeStateAsUpdate( second );
	Y.applyUpdate( second, firstUpdate );
	Y.applyUpdate( first, secondUpdate );
}

describe( '703ef0771ea5 stale table body sequence', () => {
	it( 'keeps remote appended/prepended rows when the stale local peer edits the remote tail row', () => {
		const primaryDoc = new Y.Doc();
		const collaboratorDoc = new Y.Doc();
		const primaryBlocks = primaryDoc.getArray< YBlock >( 'blocks' );
		const collaboratorBlocks =
			collaboratorDoc.getArray< YBlock >( 'blocks' );

		try {
			const initialBlocks = [
				tableBlock( [
					row( 'initial row 1 A', 'initial row 1 B' ),
					row( 'initial row 2 A', 'initial row 2 B' ),
				] ),
			];

			mergeCrdtBlocks( primaryBlocks, initialBlocks, null );
			syncBoth( primaryDoc, collaboratorDoc );
			mergeCrdtBlocks(
				collaboratorBlocks,
				getRuntimeBlocks( collaboratorBlocks ),
				null
			);

			const primaryAfterAppend = getRuntimeBlocks( primaryBlocks );
			( primaryAfterAppend[ 0 ].attributes.body as RuntimeRow[] ).push(
				row( 'remote append A', 'remote append B' )
			);
			mergeCrdtBlocks( primaryBlocks, primaryAfterAppend, null );
			syncBoth( primaryDoc, collaboratorDoc );

			const collaboratorAfterDelete =
				getRuntimeBlocks( collaboratorBlocks );
			(
				collaboratorAfterDelete[ 0 ].attributes.body as RuntimeRow[]
			 ).splice( 1, 1 );
			mergeCrdtBlocks(
				collaboratorBlocks,
				collaboratorAfterDelete,
				null
			);
			syncBoth( primaryDoc, collaboratorDoc );

			const collaboratorAfterAppend =
				getRuntimeBlocks( collaboratorBlocks );
			(
				collaboratorAfterAppend[ 0 ].attributes.body as RuntimeRow[]
			 ).push( row( 'later remote append A', 'later remote append B' ) );
			mergeCrdtBlocks(
				collaboratorBlocks,
				collaboratorAfterAppend,
				null
			);
			syncBoth( primaryDoc, collaboratorDoc );

			const collaboratorAfterPrepend =
				getRuntimeBlocks( collaboratorBlocks );
			(
				collaboratorAfterPrepend[ 0 ].attributes.body as RuntimeRow[]
			 ).unshift( row( 'remote prepend A', 'remote prepend B' ) );
			mergeCrdtBlocks(
				collaboratorBlocks,
				collaboratorAfterPrepend,
				null
			);
			syncBoth( primaryDoc, collaboratorDoc );

			const primaryAfterTailEdit = getRuntimeBlocks( primaryBlocks );
			const primaryRows = primaryAfterTailEdit[ 0 ].attributes
				.body as RuntimeRow[];
			const tailRow = primaryRows.find(
				( currentRow ) =>
					cellText( currentRow.cells[ 0 ].content ) ===
					'later remote append A'
			);
			expect( tailRow ).toBeDefined();
			tailRow!.cells[ 1 ].content = 'tail cell edited by stale primary';
			mergeCrdtBlocks( primaryBlocks, primaryAfterTailEdit, null );
			syncBoth( primaryDoc, collaboratorDoc );

			const expectedRows = [
				[ 'remote prepend A', 'remote prepend B' ],
				[ 'initial row 1 A', 'initial row 1 B' ],
				[ 'remote append A', 'remote append B' ],
				[
					'later remote append A',
					'tail cell edited by stale primary',
				],
			];

			expect( getRowTexts( primaryBlocks ) ).toEqual( expectedRows );
			expect( getRowTexts( collaboratorBlocks ) ).toEqual( expectedRows );
		} finally {
			primaryDoc.destroy();
			collaboratorDoc.destroy();
		}
	} );
} );
