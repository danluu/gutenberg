/**
 * External dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import { mergeCrdtBlocks, type Block, type YBlock } from '../crdt-blocks';
import {
	createSeededRandom,
	intFromEnv,
	seededRangeFromEnv,
} from './seeded-rng';

let mockDedupedClientId = 0;

jest.mock( 'uuid', () => ( {
	v4: () => `deduped-client-id-${ mockDedupedClientId++ }`,
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockTypes: () => [
		{
			name: 'core/paragraph',
			attributes: { content: { type: 'rich-text' } },
		},
		{
			name: 'test/rich-text-pair',
			attributes: {
				first: { type: 'rich-text' },
				second: { type: 'rich-text' },
			},
		},
		{
			name: 'test/nested-rich-text',
			attributes: {
				hero: {
					type: 'object',
					query: {
						headline: { type: 'rich-text' },
						caption: { type: 'rich-text' },
					},
				},
				cards: {
					type: 'array',
					query: {
						title: { type: 'rich-text' },
						body: { type: 'rich-text' },
						meta: {
							type: 'object',
							query: {
								caption: { type: 'rich-text' },
								tone: { type: 'string' },
							},
						},
					},
				},
			},
		},
		{
			name: 'core/image',
			attributes: {
				blob: { type: 'string', role: 'local' },
				url: { type: 'string' },
			},
		},
		{
			name: 'core/group',
			attributes: {},
		},
	],
} ) );

type PendingUpdate = {
	source: 'a' | 'b';
	update: Uint8Array;
};

const INITIAL_SYNC_ORIGIN = 'initial-sync';
const REMOTE_SYNC_ORIGIN = 'remote-sync';
const SEEDS = seededRangeFromEnv( 10, 301 );
const STALE_SNAPSHOT_SEEDS = seededRangeFromEnv( 10, 901 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_RTC_CRDT_BLOCK_STEPS', 14, {
	min: 1,
} );
const INITIAL_SCOPE_SECOND = '<em>b</em><em>i</em>';
const HIDDEN_SCOPE_SECOND = 'ab<em>b</em><strong>it</strong>';
const STEP_TWO_SCOPE_SECOND = 'a<strong>it</strong>';
const FINAL_SCOPE_SECOND = 'ab<em>b</em><strong>i</strong>t';
const RICH_TEXT_TRANSITIONS = [
	{
		cursor: 1,
		from: INITIAL_SCOPE_SECOND,
		to: HIDDEN_SCOPE_SECOND,
	},
	{
		cursor: 2,
		from: HIDDEN_SCOPE_SECOND,
		to: STEP_TWO_SCOPE_SECOND,
	},
	{
		cursor: 3,
		from: STEP_TWO_SCOPE_SECOND,
		to: FINAL_SCOPE_SECOND,
	},
	{
		cursor: 5,
		from: '<em>alpha</em><em>beta</em>',
		to: '<em>alpha</em><strong>beta</strong>',
	},
	{
		cursor: 4,
		from: 'plain <strong>text</strong>',
		to: 'plain <em>changed</em>',
	},
] as const;
const RICH_TEXT_SAMPLES = [
	'',
	'plain text',
	INITIAL_SCOPE_SECOND,
	HIDDEN_SCOPE_SECOND,
	STEP_TWO_SCOPE_SECOND,
	FINAL_SCOPE_SECOND,
	'<em>alpha</em><em>beta</em>',
	'plain <strong>text</strong>',
] as const;

type MutationResult = {
	action: string;
	cursorPosition: number | null;
};

type StaleSnapshotScenario = {
	applyLocal: ( blocks: Block[] ) => void;
	applyRemote: ( blocks: Block[] ) => void;
	initialBlocks: Block[];
	label: string;
	localMarker: string;
	remoteMarker: string;
	remoteShouldExist: boolean;
};

type NestedRichTextAttributes = {
	cards: Array< {
		body: string;
		meta: {
			caption?: string;
			tone?: string;
		};
		title: string;
	} >;
	hero: {
		caption?: string;
		headline?: string;
	};
};

function cloneBlocks( blocks: Block[] ): Block[] {
	return JSON.parse( JSON.stringify( blocks ) ) as Block[];
}

function normalizeBlocksForComparison( blocks: Block[] ): Block[] {
	return JSON.parse(
		JSON.stringify( blocks, ( key, value ) =>
			key === 'clientId' || key === 'blob' ? undefined : value
		)
	) as Block[];
}

function captureLocalUpdates(
	doc: Y.Doc,
	source: PendingUpdate[ 'source' ],
	pendingUpdates: PendingUpdate[]
) {
	doc.on( 'updateV2', ( update: Uint8Array, origin: unknown ) => {
		if ( origin === INITIAL_SYNC_ORIGIN || origin === REMOTE_SYNC_ORIGIN ) {
			return;
		}

		pendingUpdates.push( { source, update } );
	} );
}

function getBlocks( yblocks: Y.Array< YBlock > ): Block[] {
	return cloneBlocks( yblocks.toJSON() as Block[] );
}

function createParagraph(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'core/paragraph',
		clientId,
		attributes: {
			content: `${ rng.pick( [
				'alpha',
				'beta',
				'gamma',
			] ) }-${ rng.intBetween( 0, 999 ) }`,
		},
		innerBlocks: [],
	};
}

function createImage(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'core/image',
		clientId,
		attributes: {
			url: `https://example.com/${ rng.string( 'image' ) }.png`,
			blob: `blob:${ rng.string( 'local-only' ) }`,
		},
		innerBlocks: [],
	};
}

function createGroup(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string,
	innerClientId: string
): Block {
	return {
		name: 'core/group',
		clientId,
		attributes: {},
		innerBlocks: [ createParagraph( rng, innerClientId ) ],
	};
}

function createRichTextPair(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'test/rich-text-pair',
		clientId,
		attributes: {
			first: rng.pick( RICH_TEXT_SAMPLES ),
			second: rng.pick( RICH_TEXT_SAMPLES ),
		},
		innerBlocks: [],
	};
}

function createNestedRichTextBlock(
	rng: ReturnType< typeof createSeededRandom >,
	clientId: string
): Block {
	return {
		name: 'test/nested-rich-text',
		clientId,
		attributes: {
			hero: {
				headline: rng.pick( RICH_TEXT_SAMPLES ),
				caption: rng.pick( RICH_TEXT_SAMPLES ),
			},
			cards: Array.from(
				{ length: rng.intBetween( 1, 3 ) },
				( _value, index ) => ( {
					title: rng.pick( RICH_TEXT_SAMPLES ),
					body: rng.pick( RICH_TEXT_SAMPLES ),
					meta: {
						caption: rng.pick( RICH_TEXT_SAMPLES ),
						tone: `${ rng.pick( [
							'neutral',
							'urgent',
							'quiet',
						] as const ) }-${ index }`,
					},
				} )
			),
		},
		innerBlocks: [],
	};
}

function createBaselineRichTextPairBlock( seed: number ): Block {
	return {
		name: 'test/rich-text-pair',
		clientId: `pair-${ seed }`,
		attributes: {
			first: `pair-${ seed }-first`,
			second: `pair-${ seed }-second`,
		},
		innerBlocks: [],
	};
}

function createBaselineNestedRichTextBlock(
	seed: number,
	options: { heroCaption?: string } = {}
): Block {
	const hero: NestedRichTextAttributes[ 'hero' ] = {
		headline: `hero-${ seed }-headline`,
	};

	if ( options.heroCaption !== undefined ) {
		hero.caption = options.heroCaption;
	}

	return {
		name: 'test/nested-rich-text',
		clientId: `nested-${ seed }`,
		attributes: {
			hero,
			cards: [
				{
					title: `card-${ seed }-0-title`,
					body: `card-${ seed }-0-body`,
					meta: {
						caption: `card-${ seed }-0-caption`,
						tone: 'tone-0',
					},
				},
				{
					title: `card-${ seed }-1-title`,
					body: `card-${ seed }-1-body`,
					meta: {
						caption: `card-${ seed }-1-caption`,
						tone: 'tone-1',
					},
				},
				{
					title: `card-${ seed }-2-title`,
					body: `card-${ seed }-2-body`,
					meta: {
						caption: `card-${ seed }-2-caption`,
						tone: 'tone-2',
					},
				},
			],
		},
		innerBlocks: [],
	};
}

function createMarkedParagraphBlock( seed: number, marker: string ): Block {
	return {
		name: 'core/paragraph',
		clientId: `paragraph-${ seed }-${ marker }`,
		attributes: {
			content: marker,
		},
		innerBlocks: [],
	};
}

function getNestedRichTextAttributes(
	blocks: Block[]
): NestedRichTextAttributes {
	return blocks[ 0 ].attributes as NestedRichTextAttributes;
}

function createRemoteCard( seed: number, marker: string ) {
	return {
		title: marker,
		body: `remote-card-${ seed }-body`,
		meta: {
			caption: `remote-card-${ seed }-caption`,
			tone: 'remote',
		},
	};
}

function walkBlocks( blocks: Block[], callback: ( block: Block ) => void ) {
	for ( const block of blocks ) {
		callback( block );
		walkBlocks( block.innerBlocks ?? [], callback );
	}
}

type RichTextTarget = {
	label: string;
	value: unknown;
	setValue: ( value: unknown ) => void;
};

function getNestedRichTextTargets( block: Block ): RichTextTarget[] {
	if ( block.name !== 'test/nested-rich-text' ) {
		return [];
	}

	const targets: RichTextTarget[] = [];
	const hero = block.attributes.hero as
		| { headline?: unknown; caption?: unknown }
		| undefined;

	if ( hero && typeof hero === 'object' ) {
		for ( const key of [ 'headline', 'caption' ] as const ) {
			targets.push( {
				label: `hero.${ key }`,
				value: hero[ key ],
				setValue: ( value ) => {
					hero[ key ] = value;
				},
			} );
		}
	}

	const cards = block.attributes.cards as
		| Array< {
				title?: unknown;
				body?: unknown;
				meta?: { caption?: unknown };
		  } >
		| undefined;

	if ( Array.isArray( cards ) ) {
		cards.forEach( ( card, index ) => {
			for ( const key of [ 'title', 'body' ] as const ) {
				targets.push( {
					label: `cards.${ index }.${ key }`,
					value: card[ key ],
					setValue: ( value ) => {
						card[ key ] = value;
					},
				} );
			}

			if ( card.meta && typeof card.meta === 'object' ) {
				targets.push( {
					label: `cards.${ index }.meta.caption`,
					value: card.meta.caption,
					setValue: ( value ) => {
						if ( card.meta ) {
							card.meta.caption = value;
						}
					},
				} );
			}
		} );
	}

	return targets;
}

function shuffle< T >(
	values: T[],
	rng: ReturnType< typeof createSeededRandom >
): T[] {
	const result = [ ...values ];

	for ( let i = result.length - 1; i > 0; i-- ) {
		const j = rng.intBetween( 0, i );
		[ result[ i ], result[ j ] ] = [ result[ j ], result[ i ] ];
	}

	return result;
}

function validateStructure( blocks: Block[] ) {
	walkBlocks( blocks, ( block ) => {
		expect( typeof block.name ).toBe( 'string' );
		expect( Array.isArray( block.innerBlocks ) ).toBe( true );

		if ( block.name === 'core/image' ) {
			expect( block.attributes ).not.toHaveProperty( 'blob' );
		}
	} );
}

function assertLocalMergeMatches( actual: Block[], expected: Block[] ) {
	expect( normalizeBlocksForComparison( actual ) ).toEqual(
		normalizeBlocksForComparison( expected )
	);
}

function assertMarkerState(
	blocks: Block[],
	marker: string,
	shouldExist: boolean,
	trace: string[]
) {
	const serializedBlocks = JSON.stringify(
		normalizeBlocksForComparison( blocks )
	);
	const hasMarker = serializedBlocks.includes( marker );

	if ( hasMarker !== shouldExist ) {
		throw new Error(
			`Expected marker "${ marker }" to ${
				shouldExist ? 'exist' : 'be absent'
			}\nTrace:\n${ trace.join( '\n' ) }\nBlocks:\n${ JSON.stringify(
				normalizeBlocksForComparison( blocks ),
				null,
				2
			) }`
		);
	}
}

function mutateRichTextValue(
	value: unknown,
	rng: ReturnType< typeof createSeededRandom >
) {
	const current = String( value ?? '' );
	const matchingTransitions = RICH_TEXT_TRANSITIONS.filter(
		( transition ) => transition.from === current
	);

	if ( matchingTransitions.length > 0 && rng.bool( 0.75 ) ) {
		const transition = rng.pick( matchingTransitions );
		return {
			cursorPosition: transition.cursor,
			value: transition.to,
		};
	}

	if ( rng.bool( 0.5 ) ) {
		const suffix = rng.pick( [ 'x', 'y', 'z', ' edit' ] as const );

		return {
			cursorPosition: Math.min( current.length + suffix.length, 8 ),
			value: `${ current }${ suffix }`,
		};
	}

	const nextValue = rng.pick( RICH_TEXT_SAMPLES );

	return {
		cursorPosition: Math.min( String( nextValue ).length, 8 ),
		value: nextValue,
	};
}

function flushPendingUpdates(
	docA: Y.Doc,
	docB: Y.Doc,
	pendingUpdates: PendingUpdate[],
	rng: ReturnType< typeof createSeededRandom >,
	trace: string[]
) {
	while ( pendingUpdates.length > 0 ) {
		const updateIndex = rng.int( pendingUpdates.length );
		const [ entry ] = pendingUpdates.splice( updateIndex, 1 );
		const targetDoc = entry.source === 'a' ? docB : docA;

		trace.push( `deliver ${ entry.source } blocks` );
		Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );

		if ( rng.bool( 0.2 ) ) {
			trace.push( `replay ${ entry.source } blocks` );
			Y.applyUpdateV2( targetDoc, entry.update, REMOTE_SYNC_ORIGIN );
		}
	}
}

function mutateBlocks(
	blocks: Block[],
	rng: ReturnType< typeof createSeededRandom >,
	nextClientId: () => string
): MutationResult {
	const action = rng.pick( [
		'insert-paragraph',
		'insert-image',
		'insert-group',
		'insert-rich-text-pair',
		'insert-nested-rich-text',
		'edit-text',
		'edit-rich-text-pair',
		'edit-nested-rich-text',
		'move-top-level',
		'delete-top-level',
	] as const );

	switch ( action ) {
		case 'insert-paragraph': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createParagraph( rng, nextClientId() )
			);
			return { action, cursorPosition: null };
		}

		case 'insert-image': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createImage( rng, nextClientId() )
			);
			return { action, cursorPosition: null };
		}

		case 'insert-group': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createGroup( rng, nextClientId(), nextClientId() )
			);
			return { action, cursorPosition: null };
		}

		case 'insert-rich-text-pair': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createRichTextPair( rng, nextClientId() )
			);
			return { action, cursorPosition: null };
		}

		case 'insert-nested-rich-text': {
			blocks.splice(
				rng.intBetween( 0, blocks.length ),
				0,
				createNestedRichTextBlock( rng, nextClientId() )
			);
			return { action, cursorPosition: null };
		}

		case 'edit-text': {
			const editableBlocks: Block[] = [];
			walkBlocks( blocks, ( block ) => {
				if (
					block.name === 'core/paragraph' &&
					typeof block.attributes.content === 'string'
				) {
					editableBlocks.push( block );
				}
			} );

			if ( editableBlocks.length === 0 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return {
					action: `${ action }-fallback-insert`,
					cursorPosition: null,
				};
			}

			const selected = rng.pick( editableBlocks );
			selected.attributes.content = `${
				selected.attributes.content
			} ${ rng.string( 'edit' ) }`;
			return {
				action,
				cursorPosition:
					typeof selected.attributes.content === 'string'
						? selected.attributes.content.length
						: null,
			};
		}

		case 'edit-rich-text-pair': {
			const editableBlocks: Block[] = [];
			walkBlocks( blocks, ( block ) => {
				if ( block.name === 'test/rich-text-pair' ) {
					editableBlocks.push( block );
				}
			} );

			if ( editableBlocks.length === 0 ) {
				blocks.push( createRichTextPair( rng, nextClientId() ) );
				return {
					action: `${ action }-fallback-insert`,
					cursorPosition: null,
				};
			}

			const selected = rng.pick( editableBlocks );
			const attributesToEdit = rng.bool( 0.8 )
				? ( [ 'first', 'second' ] as const )
				: [ rng.pick( [ 'first', 'second' ] as const ) ];
			const selectedCursorAttribute = rng.pick( attributesToEdit );
			let cursorPosition: number | null = null;

			for ( const attributeName of attributesToEdit ) {
				const mutation = mutateRichTextValue(
					selected.attributes[ attributeName ],
					rng
				);

				selected.attributes[ attributeName ] = mutation.value;

				if ( attributeName === selectedCursorAttribute ) {
					cursorPosition = mutation.cursorPosition;
				}
			}

			return {
				action: `${ action }-${ attributesToEdit.join(
					'+'
				) }-cursor-${ selectedCursorAttribute }`,
				cursorPosition,
			};
		}

		case 'edit-nested-rich-text': {
			const editableBlocks: Block[] = [];
			walkBlocks( blocks, ( block ) => {
				if ( getNestedRichTextTargets( block ).length > 0 ) {
					editableBlocks.push( block );
				}
			} );

			if ( editableBlocks.length === 0 ) {
				blocks.push( createNestedRichTextBlock( rng, nextClientId() ) );
				return {
					action: `${ action }-fallback-insert`,
					cursorPosition: null,
				};
			}

			const selected = rng.pick( editableBlocks );
			const targets = getNestedRichTextTargets( selected );
			const shuffledTargets = shuffle( targets, rng );
			const targetsToEdit = shuffledTargets.slice(
				0,
				rng.intBetween( 1, Math.min( 3, shuffledTargets.length ) )
			);
			const cursorTarget = rng.pick( targetsToEdit );
			let cursorPosition: number | null = null;

			for ( const target of targetsToEdit ) {
				const mutation = mutateRichTextValue( target.value, rng );
				target.setValue( mutation.value );

				if ( target === cursorTarget ) {
					cursorPosition = mutation.cursorPosition;
				}
			}

			return {
				action: `${ action }-${ targetsToEdit
					.map( ( target ) => target.label )
					.join( '+' ) }-cursor-${ cursorTarget.label }`,
				cursorPosition,
			};
		}

		case 'move-top-level': {
			if ( blocks.length < 2 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return {
					action: `${ action }-fallback-insert`,
					cursorPosition: null,
				};
			}

			const fromIndex = rng.int( blocks.length );
			const toIndex = rng.int( blocks.length );
			const [ block ] = blocks.splice( fromIndex, 1 );
			blocks.splice( toIndex, 0, block );
			return {
				action: `${ action }-${ fromIndex }-${ toIndex }`,
				cursorPosition: null,
			};
		}

		case 'delete-top-level': {
			if ( blocks.length <= 1 ) {
				blocks.push( createParagraph( rng, nextClientId() ) );
				return {
					action: `${ action }-fallback-insert`,
					cursorPosition: null,
				};
			}

			blocks.splice( rng.int( blocks.length ), 1 );
			return { action, cursorPosition: null };
		}
	}

	return { action, cursorPosition: null };
}

function createStaleSnapshotScenario(
	seed: number,
	rng: ReturnType< typeof createSeededRandom >
): StaleSnapshotScenario {
	const scenario = rng.pick( [
		'rich-text-sibling-update',
		'rich-text-sibling-delete',
		'object-query-add',
		'object-query-update',
		'object-query-delete',
		'array-query-cell-update',
		'array-query-nested-object-update',
		'array-query-append',
		'array-query-prepend',
		'array-query-delete',
		'top-level-append',
		'top-level-delete',
	] as const );
	const remoteMarker = `remote-${ seed }-${ scenario }-${ rng.string(
		'value'
	) }`;
	const localMarker = `local-${ seed }-${ scenario }-${ rng.string(
		'value'
	) }`;

	switch ( scenario ) {
		case 'rich-text-sibling-update':
			return {
				label: scenario,
				initialBlocks: [ createBaselineRichTextPairBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					blocks[ 0 ].attributes.second = remoteMarker;
				},
				applyLocal( blocks ) {
					blocks[ 0 ].attributes.first = localMarker;
				},
			};

		case 'rich-text-sibling-delete':
			return {
				label: scenario,
				initialBlocks: [
					{
						...createBaselineRichTextPairBlock( seed ),
						attributes: {
							first: `pair-${ seed }-first`,
							second: remoteMarker,
						},
					},
				],
				localMarker,
				remoteMarker,
				remoteShouldExist: false,
				applyRemote( blocks ) {
					delete blocks[ 0 ].attributes.second;
				},
				applyLocal( blocks ) {
					blocks[ 0 ].attributes.first = localMarker;
				},
			};

		case 'object-query-add':
			return {
				label: scenario,
				initialBlocks: [ createBaselineNestedRichTextBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.caption =
						remoteMarker;
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};

		case 'object-query-update':
			return {
				label: scenario,
				initialBlocks: [
					createBaselineNestedRichTextBlock( seed, {
						heroCaption: `hero-${ seed }-caption`,
					} ),
				],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.caption =
						remoteMarker;
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};

		case 'object-query-delete':
			return {
				label: scenario,
				initialBlocks: [
					createBaselineNestedRichTextBlock( seed, {
						heroCaption: remoteMarker,
					} ),
				],
				localMarker,
				remoteMarker,
				remoteShouldExist: false,
				applyRemote( blocks ) {
					delete getNestedRichTextAttributes( blocks ).hero.caption;
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};

		case 'array-query-cell-update':
			return {
				label: scenario,
				initialBlocks: [ createBaselineNestedRichTextBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).cards[ 1 ].body =
						remoteMarker;
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).cards[ 0 ].title =
						localMarker;
				},
			};

		case 'array-query-nested-object-update':
			return {
				label: scenario,
				initialBlocks: [ createBaselineNestedRichTextBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes(
						blocks
					).cards[ 1 ].meta.caption = remoteMarker;
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).cards[ 0 ].title =
						localMarker;
				},
			};

		case 'array-query-append':
			return {
				label: scenario,
				initialBlocks: [ createBaselineNestedRichTextBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).cards.push(
						createRemoteCard( seed, remoteMarker )
					);
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};

		case 'array-query-prepend':
			return {
				label: scenario,
				initialBlocks: [ createBaselineNestedRichTextBlock( seed ) ],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).cards.unshift(
						createRemoteCard( seed, remoteMarker )
					);
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};

		case 'array-query-delete': {
			const initialBlock = createBaselineNestedRichTextBlock( seed );
			( initialBlock.attributes as NestedRichTextAttributes ).cards = [
				{
					title: `card-${ seed }-0-title`,
					body: `card-${ seed }-0-body`,
					meta: {
						caption: `card-${ seed }-0-caption`,
					},
				},
				createRemoteCard( seed, remoteMarker ),
				{
					title: `card-${ seed }-2-title`,
					body: `card-${ seed }-2-body`,
					meta: {
						caption: `card-${ seed }-2-caption`,
					},
				},
			];

			return {
				label: scenario,
				initialBlocks: [ initialBlock ],
				localMarker,
				remoteMarker,
				remoteShouldExist: false,
				applyRemote( blocks ) {
					getNestedRichTextAttributes( blocks ).cards.splice( 1, 1 );
				},
				applyLocal( blocks ) {
					getNestedRichTextAttributes( blocks ).hero.headline =
						localMarker;
				},
			};
		}

		case 'top-level-append':
			return {
				label: scenario,
				initialBlocks: [
					createMarkedParagraphBlock(
						seed,
						`paragraph-${ seed }-initial`
					),
				],
				localMarker,
				remoteMarker,
				remoteShouldExist: true,
				applyRemote( blocks ) {
					blocks.push(
						createMarkedParagraphBlock( seed, remoteMarker )
					);
				},
				applyLocal( blocks ) {
					blocks[ 0 ].attributes.content = localMarker;
				},
			};

		case 'top-level-delete':
			return {
				label: scenario,
				initialBlocks: [
					createMarkedParagraphBlock(
						seed,
						`paragraph-${ seed }-initial`
					),
					createMarkedParagraphBlock( seed, remoteMarker ),
				],
				localMarker,
				remoteMarker,
				remoteShouldExist: false,
				applyRemote( blocks ) {
					blocks.splice( 1, 1 );
				},
				applyLocal( blocks ) {
					blocks[ 0 ].attributes.content = localMarker;
				},
			};
	}
}

// This models the UI interleaving that convergence-only tests miss: A receives a
// remote Yjs update, then emits an older full block snapshot containing a distinct
// local edit. The remote operation is acknowledged and must not be reverted.
function runStaleSnapshotScenario( seed: number ) {
	const rng = createSeededRandom( seed );
	const scenario = createStaleSnapshotScenario( seed, rng );
	const trace: string[] = [ `scenario ${ scenario.label }` ];
	const docA = new Y.Doc();
	const docB = new Y.Doc();
	const yblocksA = docA.getArray< YBlock >( 'blocks' );
	const yblocksB = docB.getArray< YBlock >( 'blocks' );

	try {
		const staleLocalBlocks = cloneBlocks( scenario.initialBlocks );

		mergeCrdtBlocks( yblocksA, scenario.initialBlocks, null );
		Y.applyUpdateV2(
			docB,
			Y.encodeStateAsUpdateV2( docA ),
			INITIAL_SYNC_ORIGIN
		);

		const remoteBlocks = getBlocks( yblocksB );
		scenario.applyRemote( remoteBlocks );
		trace.push( `remote ${ scenario.remoteMarker }` );
		mergeCrdtBlocks( yblocksB, remoteBlocks, null );
		Y.applyUpdateV2(
			docA,
			Y.encodeStateAsUpdateV2( docB ),
			REMOTE_SYNC_ORIGIN
		);

		assertMarkerState(
			getBlocks( yblocksA ),
			scenario.remoteMarker,
			scenario.remoteShouldExist,
			trace
		);

		scenario.applyLocal( staleLocalBlocks );
		trace.push( `stale local ${ scenario.localMarker }` );
		mergeCrdtBlocks( yblocksA, staleLocalBlocks, null );

		const blocksAfterStaleMerge = getBlocks( yblocksA );
		assertMarkerState(
			blocksAfterStaleMerge,
			scenario.remoteMarker,
			scenario.remoteShouldExist,
			trace
		);
		assertMarkerState(
			blocksAfterStaleMerge,
			scenario.localMarker,
			true,
			trace
		);
	} catch ( error ) {
		throw new Error(
			`Stale snapshot fuzz failed for seed ${ seed }\n${ trace.join(
				'\n'
			) }\n${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

function runScenario( seed: number ) {
	const rng = createSeededRandom( seed );
	const pendingUpdates: PendingUpdate[] = [];
	const trace: string[] = [];
	const docA = new Y.Doc();
	const docB = new Y.Doc();
	const yblocksA = docA.getArray< YBlock >( 'blocks' );
	const yblocksB = docB.getArray< YBlock >( 'blocks' );
	let clientIdCounter = 0;

	function nextClientId(): string {
		clientIdCounter++;
		return `fuzz-client-${ seed }-${ clientIdCounter }`;
	}

	try {
		mockDedupedClientId = 0;
		captureLocalUpdates( docA, 'a', pendingUpdates );
		captureLocalUpdates( docB, 'b', pendingUpdates );

		mergeCrdtBlocks(
			yblocksA,
			[
				createParagraph( rng, nextClientId() ),
				createGroup( rng, nextClientId(), nextClientId() ),
			],
			null
		);
		Y.applyUpdateV2(
			docB,
			Y.encodeStateAsUpdateV2( docA ),
			INITIAL_SYNC_ORIGIN
		);
		pendingUpdates.length = 0;

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			const source = rng.pick( [ 'a', 'b' ] as const );
			const sourceYBlocks = source === 'a' ? yblocksA : yblocksB;
			const nextBlocks = getBlocks( sourceYBlocks );
			const { action, cursorPosition } = mutateBlocks(
				nextBlocks,
				rng,
				nextClientId
			);

			trace.push( `${ step }: ${ source } ${ action }` );
			mergeCrdtBlocks( sourceYBlocks, nextBlocks, cursorPosition );
			assertLocalMergeMatches( getBlocks( sourceYBlocks ), nextBlocks );

			if ( rng.bool( 0.5 ) ) {
				flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );
			}
		}

		flushPendingUpdates( docA, docB, pendingUpdates, rng, trace );

		const blocksA = getBlocks( yblocksA );
		const blocksB = getBlocks( yblocksB );

		validateStructure( blocksA );
		validateStructure( blocksB );
		expect( normalizeBlocksForComparison( blocksA ) ).toEqual(
			normalizeBlocksForComparison( blocksB )
		);
	} catch ( error ) {
		throw new Error(
			`RTC block fuzz failed for seed ${ seed }\n${ trace.join(
				'\n'
			) }\n${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		docA.destroy();
		docB.destroy();
	}
}

describe( 'crdt-blocks fuzzing', () => {
	it.each( SEEDS )(
		'concurrent-block-tree-edits-preserve-structure (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);

	it.each( STALE_SNAPSHOT_SEEDS )(
		'stale-local-snapshots-preserve-acknowledged-remote-operations (seed %i)',
		( seed ) => {
			expect( () => runStaleSnapshotScenario( seed ) ).not.toThrow();
		}
	);
} );
