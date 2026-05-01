/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

interface SeededRandom {
	bool: ( probability?: number ) => boolean;
	int: ( maxExclusive: number ) => number;
	intBetween: ( minInclusive: number, maxInclusive: number ) => number;
	pick: < T >( values: readonly T[] ) => T;
}

interface Peer {
	doc: Y.Doc;
	id: string;
}

interface PendingUpdate {
	from: string;
	update: Uint8Array;
}

const RECORD_MAP_KEY = 'document';
const STATE_MAP_KEY = 'state';
const TEXT_FIELDS = [ 'title', 'content', 'excerpt' ] as const;
const LOCAL_ORIGIN = 'gutenberg-yjs-low-level-fuzz';
const REMOTE_ORIGIN = 'gutenberg-yjs-low-level-fuzz-remote';

const SEEDS = seededRangeFromEnv( 8, 3101 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_YJS_FUZZ_STEPS', 120, {
	min: 1,
} );

/* eslint-disable no-bitwise */
function createSeededRandom( seed: number ): SeededRandom {
	let state = seed >>> 0;
	if ( state === 0 ) {
		state = 0x9e3779b9;
	}

	function nextUint32(): number {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
		value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
		return ( value ^ ( value >>> 14 ) ) >>> 0;
	}

	function next(): number {
		return nextUint32() / 0x100000000;
	}

	function int( maxExclusive: number ): number {
		return maxExclusive <= 0 ? 0 : Math.floor( next() * maxExclusive );
	}

	return {
		bool( probability = 0.5 ) {
			return next() < probability;
		},
		int,
		intBetween( minInclusive, maxInclusive ) {
			return minInclusive + int( maxInclusive - minInclusive + 1 );
		},
		pick< T >( values: readonly T[] ): T {
			if ( values.length === 0 ) {
				throw new Error( 'Cannot pick from an empty array.' );
			}
			return values[ int( values.length ) ];
		},
	};
}
/* eslint-enable no-bitwise */

function readIntFromEnv( name: string ): number | undefined {
	const value = process.env[ name ];
	if ( value === undefined || value === '' ) {
		return undefined;
	}

	const parsed = Number.parseInt( value, 10 );
	if ( Number.isNaN( parsed ) ) {
		throw new Error(
			`Expected ${ name } to be an integer, got "${ value }".`
		);
	}
	return parsed;
}

function seededRangeFromEnv( defaultCount: number, defaultStart: number ) {
	const count = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_COUNT' ) ?? defaultCount;
	const start = readIntFromEnv( 'GUTENBERG_FUZZ_SEED_START' ) ?? defaultStart;
	if ( count < 0 ) {
		throw new Error(
			`Expected GUTENBERG_FUZZ_SEED_COUNT to be non-negative, got "${ count }".`
		);
	}
	return Array.from( { length: count }, ( _value, index ) => start + index );
}

function intFromEnv(
	name: string,
	defaultValue: number,
	options: { min?: number } = {}
): number {
	const value = readIntFromEnv( name ) ?? defaultValue;
	if ( options.min !== undefined && value < options.min ) {
		throw new Error(
			`Expected ${ name } to be >= ${ options.min }, got "${ value }".`
		);
	}
	return value;
}

function getRecordMap( doc: Y.Doc ): Y.Map< unknown > {
	return doc.getMap( RECORD_MAP_KEY );
}

function getStateMap( doc: Y.Doc ): Y.Map< unknown > {
	return doc.getMap( STATE_MAP_KEY );
}

function getBlocks( doc: Y.Doc ): Y.Array< Y.Map< unknown > > {
	const record = getRecordMap( doc );
	let blocks = record.get( 'blocks' );
	if ( ! ( blocks instanceof Y.Array ) ) {
		blocks = new Y.Array< Y.Map< unknown > >();
		record.set( 'blocks', blocks );
	}
	return blocks as Y.Array< Y.Map< unknown > >;
}

function getTextField(
	doc: Y.Doc,
	field: ( typeof TEXT_FIELDS )[ number ]
): Y.Text {
	const record = getRecordMap( doc );
	let text = record.get( field );
	if ( ! ( text instanceof Y.Text ) ) {
		text = new Y.Text();
		record.set( field, text );
	}
	return text;
}

function textPayload(
	seed: number,
	step: number,
	rng: SeededRandom,
	minLength = 4,
	maxLength = 48
): string {
	const token = `s${ seed }-${ step }-${ rng.intBetween( 100, 999 ) } `;
	let value = '';
	while ( value.length < maxLength ) {
		value += rng.pick( [
			token,
			'<strong>bold</strong> ',
			'&amp; entity ',
			'emoji-like text ',
			'plain words ',
		] );
	}
	return value.slice( 0, rng.intBetween( minLength, maxLength ) );
}

function createParagraphBlock(
	clientId: string,
	content: string
): Y.Map< unknown > {
	const block = new Y.Map< unknown >();
	const attributes = new Y.Map< unknown >();
	attributes.set( 'content', new Y.Text( content ) );
	block.set( 'clientId', clientId );
	block.set( 'name', 'core/paragraph' );
	block.set( 'attributes', attributes );
	block.set( 'innerBlocks', new Y.Array< Y.Map< unknown > >() );
	return block;
}

function createTableBlock(
	clientId: string,
	seed: number,
	step: number,
	rng: SeededRandom
): Y.Map< unknown > {
	const block = new Y.Map< unknown >();
	const attributes = new Y.Map< unknown >();
	const body = new Y.Array< Y.Map< unknown > >();
	const rows: Y.Map< unknown >[] = [];

	for ( let rowIndex = 0; rowIndex < rng.intBetween( 1, 3 ); rowIndex++ ) {
		const row = new Y.Map< unknown >();
		const cells = new Y.Array< Y.Map< unknown > >();
		const cellMaps: Y.Map< unknown >[] = [];
		for (
			let columnIndex = 0;
			columnIndex < rng.intBetween( 1, 3 );
			columnIndex++
		) {
			const cell = new Y.Map< unknown >();
			cell.set(
				'content',
				new Y.Text(
					`cell ${ seed } ${ step } ${ rowIndex } ${ columnIndex }`
				)
			);
			cellMaps.push( cell );
		}
		cells.insert( 0, cellMaps );
		row.set( 'cells', cells );
		rows.push( row );
	}

	body.insert( 0, rows );
	attributes.set( 'body', body );
	block.set( 'clientId', clientId );
	block.set( 'name', 'core/table' );
	block.set( 'attributes', attributes );
	block.set( 'innerBlocks', new Y.Array< Y.Map< unknown > >() );
	return block;
}

function initializeDoc( doc: Y.Doc, seed: number ): void {
	const record = getRecordMap( doc );
	record.set( 'title', new Y.Text( `Seed ${ seed } title` ) );
	record.set( 'content', new Y.Text( `Seed ${ seed } content` ) );
	record.set( 'excerpt', new Y.Text( `Seed ${ seed } excerpt` ) );
	record.set( 'status', 'draft' );
	record.set( 'author', 1 );
	record.set( 'meta', new Y.Map< unknown >() );
	getBlocks( doc ).insert( 0, [
		createParagraphBlock( `initial-${ seed }`, `Initial ${ seed }` ),
	] );
	getStateMap( doc ).set( 'version', 1 );
}

function mutateText(
	text: Y.Text,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const before = text.toString();
	const index = rng.intBetween( 0, before.length );

	if ( before.length > 0 && rng.bool( 0.35 ) ) {
		const deleteLength = rng.intBetween(
			1,
			Math.min( before.length - index, 16 )
		);
		text.delete( index, deleteLength );
		return `delete ${ deleteLength } at ${ index }`;
	}

	const value = textPayload( seed, step, rng );
	text.insert( index, value );
	if ( rng.bool( 0.15 ) ) {
		text.format( index, value.length, { bold: true } );
	}
	return `insert ${ value.length } at ${ index }`;
}

function collectTextsFromValue( value: unknown, texts: Y.Text[] ): void {
	if ( value instanceof Y.Text ) {
		texts.push( value );
		return;
	}
	if ( value instanceof Y.Map ) {
		for ( const child of value.values() ) {
			collectTextsFromValue( child, texts );
		}
		return;
	}
	if ( value instanceof Y.Array ) {
		for ( let index = 0; index < value.length; index++ ) {
			collectTextsFromValue( value.get( index ), texts );
		}
	}
}

function mutateBlockText(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const texts: Y.Text[] = [];
	collectTextsFromValue( getBlocks( doc ), texts );
	if ( texts.length === 0 ) {
		return appendBlock( doc, seed, step, rng );
	}
	return `block text ${ mutateText( rng.pick( texts ), seed, step, rng ) }`;
}

function appendBlock(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const blocks = getBlocks( doc );
	const index = rng.intBetween( 0, blocks.length );
	const clientId = `block-${ seed }-${ step }-${ rng.intBetween(
		1,
		1_000_000
	) }`;
	const block = rng.bool( 0.75 )
		? createParagraphBlock( clientId, textPayload( seed, step, rng ) )
		: createTableBlock( clientId, seed, step, rng );
	blocks.insert( index, [ block ] );
	return `insert ${ block.get( 'name' ) } at ${ index }`;
}

function deleteBlock( doc: Y.Doc, rng: SeededRandom ): string {
	const blocks = getBlocks( doc );
	if ( blocks.length === 0 ) {
		return 'skip delete empty blocks';
	}
	const index = rng.int( blocks.length );
	blocks.delete( index, 1 );
	return `delete block at ${ index }`;
}

function runOperation(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const roll = rng.int( 100 );
	if ( roll < 25 ) {
		return `${ rng.pick( TEXT_FIELDS ) } ${ mutateText(
			getTextField( doc, rng.pick( TEXT_FIELDS ) ),
			seed,
			step,
			rng
		) }`;
	}
	if ( roll < 58 ) {
		return mutateBlockText( doc, seed, step, rng );
	}
	if ( roll < 78 ) {
		return appendBlock( doc, seed, step, rng );
	}
	if ( roll < 92 ) {
		return deleteBlock( doc, rng );
	}
	getStateMap( doc ).set( 'savedAt', step );
	return 'mark saved';
}

function createPeer(
	id: string,
	network: PendingUpdate[],
	trace: string[]
): Peer {
	const doc = new Y.Doc();
	doc.on( 'updateV2', ( update: Uint8Array, origin: unknown ) => {
		if ( origin === LOCAL_ORIGIN ) {
			network.push( { from: id, update } );
			trace.push( `${ id } emitted ${ update.byteLength } bytes` );
		}
	} );
	return { doc, id };
}

function applyUpdate( peer: Peer, update: Uint8Array ): void {
	Y.applyUpdateV2( peer.doc, update, REMOTE_ORIGIN );
}

function deliverSomeUpdates(
	peers: Peer[],
	network: PendingUpdate[],
	rng: SeededRandom,
	trace: string[]
): void {
	const count = rng.intBetween( 0, Math.min( network.length, 6 ) );
	for ( let delivered = 0; delivered < count; delivered++ ) {
		const packet = network.splice( rng.int( network.length ), 1 )[ 0 ];
		for ( const peer of peers ) {
			if ( peer.id === packet.from && rng.bool( 0.9 ) ) {
				continue;
			}
			applyUpdate( peer, packet.update );
			if ( rng.bool( 0.1 ) ) {
				applyUpdate( peer, packet.update );
				trace.push(
					`duplicate ${ packet.from } update to ${ peer.id }`
				);
			}
		}
	}
}

function compactFromPeer( peer: Peer, peers: Peer[], trace: string[] ): void {
	const update = Y.encodeStateAsUpdateV2( peer.doc );
	trace.push( `${ peer.id } compaction ${ update.byteLength } bytes` );
	for ( const target of peers ) {
		if ( target.id !== peer.id ) {
			applyUpdate( target, update );
		}
	}
}

function syncOneWay( source: Peer, target: Peer, trace: string[] ): void {
	const update = Y.encodeStateAsUpdateV2(
		source.doc,
		Y.encodeStateVector( target.doc )
	);
	trace.push(
		`${ source.id } -> ${ target.id } sync ${ update.byteLength } bytes`
	);
	applyUpdate( target, update );
}

function flushAll( peers: Peer[], trace: string[] ): void {
	for ( const source of peers ) {
		for ( const target of peers ) {
			if ( source.id !== target.id ) {
				syncOneWay( source, target, trace );
			}
		}
	}
}

function canonicalSnapshot( doc: Y.Doc ): string {
	return JSON.stringify( {
		record: getRecordMap( doc ).toJSON(),
		state: getStateMap( doc ).toJSON(),
	} );
}

function assertConverged( peers: Peer[], trace: string[] ): void {
	flushAll( peers, trace );
	const snapshots = peers.map( ( peer ) => ( {
		id: peer.id,
		snapshot: canonicalSnapshot( peer.doc ),
	} ) );
	const expected = snapshots[ 0 ].snapshot;
	const divergent = snapshots.filter(
		( { snapshot } ) => snapshot !== expected
	);
	if ( divergent.length > 0 ) {
		throw new Error(
			`Yjs peers failed to converge.\nSnapshots: ${ JSON.stringify(
				snapshots,
				null,
				2
			) }\nTrace:\n${ trace.join( '\n' ) }`
		);
	}
}

function runScenario( seed: number ): void {
	const rng = createSeededRandom( seed );
	const network: PendingUpdate[] = [];
	const trace: string[] = [];
	const peers = [ 'a', 'b', 'c' ].map( ( id ) =>
		createPeer( id, network, trace )
	);

	try {
		peers[ 0 ].doc.transact(
			() => initializeDoc( peers[ 0 ].doc, seed ),
			LOCAL_ORIGIN
		);
		compactFromPeer( peers[ 0 ], peers, trace );

		for ( let step = 0; step < STEP_COUNT; step++ ) {
			const peer = rng.pick( peers );
			peer.doc.transact( () => {
				trace.push(
					`${ step }: ${ peer.id } ${ runOperation(
						peer.doc,
						seed,
						step,
						rng
					) }`
				);
			}, LOCAL_ORIGIN );

			if ( rng.bool( 0.16 ) ) {
				compactFromPeer( peer, peers, trace );
			}
			if ( rng.bool( 0.2 ) ) {
				syncOneWay( rng.pick( peers ), rng.pick( peers ), trace );
			}
			deliverSomeUpdates( peers, network, rng, trace );
		}

		assertConverged( peers, trace );
	} catch ( error ) {
		throw new Error(
			`Yjs RTC low-level fuzz failed for seed ${ seed }\n` +
				`${ error instanceof Error ? error.message : String( error ) }`
		);
	} finally {
		for ( const peer of peers ) {
			peer.doc.destroy();
		}
	}
}

describe( 'Yjs RTC low-level fuzzing', () => {
	it.each( SEEDS )(
		'keeps Gutenberg-shaped Yjs documents convergent (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);
} );
