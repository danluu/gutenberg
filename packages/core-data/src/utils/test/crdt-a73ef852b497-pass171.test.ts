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
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'core/list-item',
			attributes: { content: { type: 'rich-text' } },
		},
		{ name: 'core/list', attributes: {} },
		{
			name: 'core/pullquote',
			attributes: {
				value: { type: 'rich-text' },
				citation: { type: 'rich-text' },
			},
		},
	],
} ) );

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';

type Operation = {
	description: string;
	blocks: Block[];
};

const paragraph = ( clientId: string, content: string ): Block => ( {
	name: 'core/paragraph',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const listItem = ( clientId: string, content: string ): Block => ( {
	name: 'core/list-item',
	clientId,
	attributes: { content },
	innerBlocks: [],
} );

const list = (): Block => ( {
	name: 'core/list',
	clientId: 'list',
	attributes: {},
	innerBlocks: [
		listItem( 'list-item-one', 'Alpha list item' ),
		listItem( 'list-item-two', 'Beta list item' ),
	],
} );

const pullquote = (): Block => ( {
	name: 'core/pullquote',
	clientId: 'pullquote',
	attributes: {
		value: '<p>Pullquote value</p>',
		citation: 'Pullquote citation',
	},
	innerBlocks: [],
} );

const initialBlocks = (): Block[] => [
	paragraph( 'intro', 'Intro paragraph' ),
	list(),
	pullquote(),
	paragraph( 'tail', 'Tail paragraph' ),
];

const cloneBlocks = ( blocks: Block[] ): Block[] =>
	JSON.parse( JSON.stringify( blocks ) ) as Block[];

const moveBlock = (
	blocks: Block[],
	clientId: string,
	targetIndex: number
): Block[] => {
	const moved = cloneBlocks( blocks );
	const sourceIndex = moved.findIndex( ( block ) => block.clientId === clientId );

	if ( sourceIndex === -1 ) {
		return moved;
	}

	const [ block ] = moved.splice( sourceIndex, 1 );
	moved.splice( targetIndex, 0, block );
	return moved;
};

const remoteMoveOperations = (): Operation[] => {
	const initial = initialBlocks();
	const operations: Operation[] = [];

	for ( const clientId of [ 'list', 'pullquote' ] ) {
		const sourceIndex = initial.findIndex(
			( block ) => block.clientId === clientId
		);

		for ( let targetIndex = 0; targetIndex < initial.length; targetIndex++ ) {
			if ( targetIndex === sourceIndex ) {
				continue;
			}

			operations.push( {
				description: `remote move ${ clientId } to ${ targetIndex }`,
				blocks: moveBlock( initial, clientId, targetIndex ),
			} );
		}
	}

	return operations;
};

const staleDeleteAndMoveOperations = (): Operation[] => {
	const operations: Operation[] = [];

	for ( const deletedClientId of [
		'intro',
		'list',
		'pullquote',
		'tail',
	] ) {
		const afterDelete = initialBlocks().filter(
			( block ) => block.clientId !== deletedClientId
		);

		operations.push( {
			description: `stale delete ${ deletedClientId }`,
			blocks: cloneBlocks( afterDelete ),
		} );

		for ( const movedClientId of [ 'list', 'pullquote' ] ) {
			const sourceIndex = afterDelete.findIndex(
				( block ) => block.clientId === movedClientId
			);

			if ( sourceIndex === -1 ) {
				continue;
			}

			for (
				let targetIndex = 0;
				targetIndex < afterDelete.length;
				targetIndex++
			) {
				if ( targetIndex === sourceIndex ) {
					continue;
				}

				operations.push( {
					description: `stale delete ${ deletedClientId }, move ${ movedClientId } to ${ targetIndex }`,
					blocks: moveBlock( afterDelete, movedClientId, targetIndex ),
				} );
			}
		}
	}

	return operations;
};

const containsListDescendant = ( block: Block ): boolean =>
	( block.innerBlocks ?? [] ).some(
		( innerBlock ) =>
			innerBlock.name === 'core/list' ||
			innerBlock.name === 'core/list-item' ||
			containsListDescendant( innerBlock )
	);

const hasArchivedSmearShape = ( blocks: Block[] ): boolean =>
	blocks.some(
		( block ) =>
			block.name === 'core/pullquote' && containsListDescendant( block )
	) ||
	blocks.some(
		( block ) =>
			block.name === 'core/paragraph' &&
			( Object.prototype.hasOwnProperty.call(
				block.attributes,
				'value'
			) ||
				Object.prototype.hasOwnProperty.call(
					block.attributes,
					'citation'
				) )
	);

describe( 'a73ef852b497 List/Pullquote stale snapshot shape', () => {
	it( 'does not produce the archived cross-type smear on the current known-fixes base', () => {
		const smearCases: string[] = [];
		let checkedCases = 0;

		for ( const remoteOperation of remoteMoveOperations() ) {
			for ( const staleOperation of staleDeleteAndMoveOperations() ) {
				const primaryDoc = new Y.Doc();
				const secondaryDoc = new Y.Doc();
				const primaryBlocks = primaryDoc.getArray< YBlock >();
				const secondaryBlocks = secondaryDoc.getArray< YBlock >();

				try {
					mergeCrdtBlocks( primaryBlocks, initialBlocks(), null );
					Y.applyUpdate(
						secondaryDoc,
						Y.encodeStateAsUpdate( primaryDoc )
					);
					mergeCrdtBlocks( secondaryBlocks, initialBlocks(), null );

					mergeCrdtBlocks(
						primaryBlocks,
						remoteOperation.blocks,
						null
					);
					Y.applyUpdate(
						secondaryDoc,
						Y.encodeStateAsUpdate( primaryDoc )
					);

					mergeCrdtBlocks(
						secondaryBlocks,
						staleOperation.blocks,
						null
					);
					Y.applyUpdate(
						primaryDoc,
						Y.encodeStateAsUpdate( secondaryDoc )
					);

					for ( const [ peer, blocks ] of [
						[ 'primary', primaryBlocks.toJSON() as Block[] ],
						[ 'secondary', secondaryBlocks.toJSON() as Block[] ],
					] as const ) {
						if ( hasArchivedSmearShape( blocks ) ) {
							smearCases.push(
								`${ remoteOperation.description } / ${ staleOperation.description } / ${ peer }: ${ JSON.stringify(
									blocks
								) }`
							);
						}
					}
				} finally {
					primaryDoc.destroy();
					secondaryDoc.destroy();
				}

				checkedCases++;
			}
		}

		expect( checkedCases ).toBe( 96 );
		expect( smearCases ).toEqual( [] );
	} );
} );
