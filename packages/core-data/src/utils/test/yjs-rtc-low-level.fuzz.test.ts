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
	localUpdateCount: number;
}

interface PendingUpdate {
	from: string;
	step: number;
	update: Uint8Array;
}

interface OperationResult {
	label: string;
	shouldCheckCompaction?: boolean;
}

const RECORD_MAP_KEY = 'document';
const STATE_MAP_KEY = 'state';
const VERSION_KEY = 'version';
const SAVED_AT_KEY = 'savedAt';
const SAVED_BY_KEY = 'savedBy';

const LOCAL_ORIGIN = 'gutenberg-yjs-low-level-fuzz';
const REMOTE_ORIGIN = 'gutenberg-yjs-low-level-fuzz-remote';

// Keep these in sync with packages/sync/src/providers/http-polling/config.ts
// and lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php.
const CLIENT_MAX_UPDATE_BYTES = 1 * 1024 * 1024;
const SERVER_MAX_UPDATE_DATA_CHARS = 1 * 1024 * 1024;
const SERVER_MAX_RAW_UPDATE_BYTES = Math.floor(
	( SERVER_MAX_UPDATE_DATA_CHARS * 3 ) / 4
);

const TEXT_FIELDS = [ 'title', 'content', 'excerpt' ] as const;
const SEEDS = seededRangeFromEnv( 6, 2101 );
const STEP_COUNT = intFromEnv( 'GUTENBERG_YJS_FUZZ_STEPS', 80, {
	min: 1,
} );
const MAX_UPDATE_BYTES = intFromEnv(
	'GUTENBERG_YJS_FUZZ_MAX_UPDATE_BYTES',
	CLIENT_MAX_UPDATE_BYTES,
	{ min: 1 }
);

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
		if ( maxExclusive <= 0 ) {
			return 0;
		}

		return Math.floor( next() * maxExclusive );
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

function seededRangeFromEnv(
	defaultCount: number,
	defaultStart = 1
): number[] {
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
	options: {
		min?: number;
	} = {}
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

function getBlockText(
	block: Y.Map< unknown >,
	attribute = 'content'
): Y.Text | null {
	const attributes = block.get( 'attributes' );

	if ( ! ( attributes instanceof Y.Map ) ) {
		return null;
	}

	const text = attributes.get( attribute );

	return text instanceof Y.Text ? text : null;
}

function textPayload(
	seed: number,
	step: number,
	rng: SeededRandom,
	minLength: number,
	maxLength: number
): string {
	const token = `seed-${ seed }-step-${ step }-${ rng.intBetween(
		1000,
		9999
	) }`;
	const length = rng.intBetween( minLength, maxLength );
	const chunk = `${ token } alpha beta <strong>bold</strong> &amp; entity. `;
	let value = '';

	while ( value.length < length ) {
		value += chunk;
	}

	return value.slice( 0, length );
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

function createQuoteBlock(
	clientId: string,
	value: string,
	citation: string
): Y.Map< unknown > {
	const block = new Y.Map< unknown >();
	const attributes = new Y.Map< unknown >();

	attributes.set( 'value', new Y.Text( value ) );
	attributes.set( 'citation', new Y.Text( citation ) );
	block.set( 'clientId', clientId );
	block.set( 'name', 'core/quote' );
	block.set( 'attributes', attributes );
	block.set( 'innerBlocks', new Y.Array< Y.Map< unknown > >() );

	return block;
}

function createTableBlock(
	clientId: string,
	rows: number,
	columns: number,
	seed: number,
	step: number
): Y.Map< unknown > {
	const block = new Y.Map< unknown >();
	const attributes = new Y.Map< unknown >();
	const body = new Y.Array< Y.Map< unknown > >();
	const rowMaps: Y.Map< unknown >[] = [];

	for ( let rowIndex = 0; rowIndex < rows; rowIndex++ ) {
		const row = new Y.Map< unknown >();
		const cells = new Y.Array< Y.Map< unknown > >();
		const cellMaps: Y.Map< unknown >[] = [];

		for ( let columnIndex = 0; columnIndex < columns; columnIndex++ ) {
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
		rowMaps.push( row );
	}

	body.insert( 0, rowMaps );
	attributes.set( 'body', body );
	block.set( 'clientId', clientId );
	block.set( 'name', 'core/table' );
	block.set( 'attributes', attributes );
	block.set( 'innerBlocks', new Y.Array< Y.Map< unknown > >() );

	return block;
}

function initializeDoc( doc: Y.Doc, seed: number ): void {
	const state = doc.getMap( STATE_MAP_KEY );
	const record = getRecordMap( doc );
	const blocks = new Y.Array< Y.Map< unknown > >();

	state.set( VERSION_KEY, 1 );
	record.set( 'title', new Y.Text( `RTC fuzz seed ${ seed }` ) );
	record.set( 'content', new Y.Text( `Initial content ${ seed }` ) );
	record.set( 'excerpt', new Y.Text( `Initial excerpt ${ seed }` ) );
	record.set( 'blocks', blocks );
	record.set( 'status', 'draft' );
	record.set( 'author', 1 );
	record.set( 'meta', new Y.Map< unknown >() );

	blocks.insert( 0, [
		createParagraphBlock(
			`block-${ seed }-0`,
			`Initial paragraph ${ seed }`
		),
	] );
}

function mutateText(
	text: Y.Text,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const before = text.toString();
	const insert = textPayload( seed, step, rng, 8, 80 );
	const index = rng.intBetween( 0, before.length );

	if ( before.length > 0 && rng.bool( 0.3 ) ) {
		const deleteLength = rng.intBetween(
			1,
			Math.min( before.length - index, 40 )
		);
		text.delete( index, deleteLength );
		text.insert( index, insert );
		return `replace text at ${ index } len ${ deleteLength }`;
	}

	text.insert( index, insert );
	return `insert text at ${ index } len ${ insert.length }`;
}

function pickExistingBlock(
	blocks: Y.Array< Y.Map< unknown > >,
	rng: SeededRandom
): Y.Map< unknown > | null {
	if ( blocks.length === 0 ) {
		return null;
	}

	return blocks.get( rng.int( blocks.length ) );
}

function mutateBlockText(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): string {
	const blocks = getBlocks( doc );
	const block = pickExistingBlock( blocks, rng );
	const attributes = block?.get( 'attributes' );

	if ( ! ( attributes instanceof Y.Map ) ) {
		return appendParagraph( doc, seed, step, rng ).label;
	}

	const textAttributes = Array.from( attributes.entries() )
		.filter(
			( entry ): entry is [ string, Y.Text ] =>
				entry[ 1 ] instanceof Y.Text
		)
		.map( ( [ key ] ) => key );

	if ( textAttributes.length === 0 ) {
		return appendParagraph( doc, seed, step, rng ).label;
	}

	const attribute = rng.pick( textAttributes );
	const text = getBlockText( block as Y.Map< unknown >, attribute );

	if ( ! text ) {
		return appendParagraph( doc, seed, step, rng ).label;
	}

	return `${ block?.get( 'name' ) }.${ attribute }: ${ mutateText(
		text,
		seed,
		step,
		rng
	) }`;
}

function appendParagraph(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): OperationResult {
	const blocks = getBlocks( doc );
	const content = textPayload( seed, step, rng, 12, 160 );
	const block = createParagraphBlock(
		`block-${ seed }-${ step }-${ rng.intBetween( 1, 1_000_000 ) }`,
		content
	);
	const index = rng.intBetween( 0, blocks.length );

	blocks.insert( index, [ block ] );
	return { label: `insert paragraph at ${ index } len ${ content.length }` };
}

function appendRichBlock(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): OperationResult {
	const blocks = getBlocks( doc );
	const index = rng.intBetween( 0, blocks.length );

	if ( rng.bool() ) {
		blocks.insert( index, [
			createQuoteBlock(
				`quote-${ seed }-${ step }-${ rng.intBetween( 1, 1_000_000 ) }`,
				textPayload( seed, step, rng, 20, 220 ),
				textPayload( seed, step, rng, 6, 80 )
			),
		] );
		return { label: `insert quote at ${ index }` };
	}

	blocks.insert( index, [
		createTableBlock(
			`table-${ seed }-${ step }-${ rng.intBetween( 1, 1_000_000 ) }`,
			rng.intBetween( 1, 4 ),
			rng.intBetween( 1, 4 ),
			seed,
			step
		),
	] );
	return { label: `insert table at ${ index }` };
}

function pasteLargeParagraph(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): OperationResult {
	const blocks = getBlocks( doc );
	const content = textPayload(
		seed,
		step,
		rng,
		SERVER_MAX_RAW_UPDATE_BYTES - 16 * 1024,
		SERVER_MAX_RAW_UPDATE_BYTES + 192 * 1024
	);
	const index = rng.intBetween( 0, blocks.length );

	blocks.insert( index, [
		createParagraphBlock(
			`large-${ seed }-${ step }-${ rng.intBetween( 1, 1_000_000 ) }`,
			content
		),
	] );

	return {
		label: `paste large paragraph at ${ index } len ${ content.length }`,
		shouldCheckCompaction: true,
	};
}

function deleteBlock( doc: Y.Doc, rng: SeededRandom ): OperationResult {
	const blocks = getBlocks( doc );

	if ( blocks.length === 0 ) {
		return { label: 'delete skipped empty blocks' };
	}

	const index = rng.int( blocks.length );
	blocks.delete( index, 1 );
	return { label: `delete block at ${ index }` };
}

function markSaved( doc: Y.Doc, step: number ): OperationResult {
	const state = doc.getMap( STATE_MAP_KEY );
	state.set( SAVED_AT_KEY, Date.now() + step );
	state.set( SAVED_BY_KEY, doc.clientID );
	return { label: 'mark saved' };
}

function runOperation(
	doc: Y.Doc,
	seed: number,
	step: number,
	rng: SeededRandom
): OperationResult {
	const roll = rng.int( 100 );

	if ( roll < 18 ) {
		const field = rng.pick( TEXT_FIELDS );
		return {
			label: `${ field }: ${ mutateText(
				getTextField( doc, field ),
				seed,
				step,
				rng
			) }`,
		};
	}

	if ( roll < 45 ) {
		return { label: mutateBlockText( doc, seed, step, rng ) };
	}

	if ( roll < 63 ) {
		return appendParagraph( doc, seed, step, rng );
	}

	if ( roll < 75 ) {
		return appendRichBlock( doc, seed, step, rng );
	}

	if ( roll < 84 ) {
		return deleteBlock( doc, rng );
	}

	if ( roll < 90 ) {
		return markSaved( doc, step );
	}

	return pasteLargeParagraph( doc, seed, step, rng );
}

function visibleDocumentBytes( doc: Y.Doc ): number {
	return JSON.stringify( {
		record: getRecordMap( doc ).toJSON(),
		state: doc.getMap( STATE_MAP_KEY ).toJSON(),
	} ).length;
}

function base64EncodedLength( byteLength: number ): number {
	return Math.ceil( byteLength / 3 ) * 4;
}

function assertUpdateFitsServerLimit(
	update: Uint8Array,
	description: string,
	doc: Y.Doc,
	trace: string[]
): void {
	const encodedDataLength = base64EncodedLength( update.byteLength );

	if ( encodedDataLength > SERVER_MAX_UPDATE_DATA_CHARS ) {
		throw new Error(
			`${ description } exceeded the RTC server per-update data limit after base64 encoding.\n` +
				`Raw update bytes: ${ update.byteLength }\n` +
				`Base64 data chars: ${ encodedDataLength }\n` +
				`Server data limit chars: ${ SERVER_MAX_UPDATE_DATA_CHARS }\n` +
				`Client raw-update limit bytes: ${ MAX_UPDATE_BYTES }\n` +
				`Largest raw update that can fit server data limit: ${ SERVER_MAX_RAW_UPDATE_BYTES }\n` +
				`Visible document JSON bytes: ${ visibleDocumentBytes(
					doc
				) }\n` +
				`Trace:\n${ trace.join( '\n' ) }`
		);
	}

	if ( update.byteLength <= MAX_UPDATE_BYTES ) {
		return;
	}

	throw new Error(
		`${ description } exceeded the RTC client raw per-update limit.\n` +
			`Update bytes: ${ update.byteLength }\n` +
			`Limit bytes: ${ MAX_UPDATE_BYTES }\n` +
			`Visible document JSON bytes: ${ visibleDocumentBytes( doc ) }\n` +
			`Trace:\n${ trace.join( '\n' ) }`
	);
}

function createPeer(
	id: string,
	network: PendingUpdate[],
	trace: string[]
): Peer {
	const doc = new Y.Doc();
	const peer: Peer = {
		doc,
		id,
		localUpdateCount: 0,
	};

	doc.on( 'updateV2', ( update: Uint8Array, origin: unknown ) => {
		if ( origin !== LOCAL_ORIGIN ) {
			return;
		}

		peer.localUpdateCount++;
		assertUpdateFitsServerLimit(
			update,
			`${ id } local Yjs update ${ peer.localUpdateCount }`,
			doc,
			trace
		);
		network.push( {
			from: id,
			step: peer.localUpdateCount,
			update,
		} );
	} );

	return peer;
}

function applyUpdateToPeer( peer: Peer, packet: PendingUpdate ): void {
	Y.applyUpdateV2( peer.doc, packet.update, REMOTE_ORIGIN );
}

function deliverRandomUpdates(
	peers: Peer[],
	network: PendingUpdate[],
	rng: SeededRandom,
	trace: string[]
): void {
	const deliveries = rng.intBetween( 0, Math.min( network.length, 5 ) );

	for ( let index = 0; index < deliveries; index++ ) {
		if ( network.length === 0 ) {
			return;
		}

		const packetIndex = rng.int( network.length );
		const packet = network.splice( packetIndex, 1 )[ 0 ];

		for ( const peer of peers ) {
			if ( peer.id === packet.from && rng.bool( 0.9 ) ) {
				continue;
			}

			applyUpdateToPeer( peer, packet );

			if ( rng.bool( 0.08 ) ) {
				applyUpdateToPeer( peer, packet );
				trace.push(
					`duplicate delivery ${ packet.from }#${ packet.step } to ${ peer.id }`
				);
			}
		}
	}
}

function compactFromPeer( peer: Peer, peers: Peer[], trace: string[] ): void {
	const compactionUpdate = Y.encodeStateAsUpdateV2( peer.doc );
	assertUpdateFitsServerLimit(
		compactionUpdate,
		`${ peer.id } full-state compaction update`,
		peer.doc,
		trace
	);

	for ( const target of peers ) {
		if ( target.id !== peer.id ) {
			Y.applyUpdateV2( target.doc, compactionUpdate, REMOTE_ORIGIN );
		}
	}
}

function flushAllUpdates( peers: Peer[] ): void {
	for ( const source of peers ) {
		for ( const target of peers ) {
			if ( source.id === target.id ) {
				continue;
			}

			const update = Y.encodeStateAsUpdateV2(
				source.doc,
				Y.encodeStateVector( target.doc )
			);
			Y.applyUpdateV2( target.doc, update, REMOTE_ORIGIN );
		}
	}
}

function canonicalSnapshot( doc: Y.Doc ): string {
	return JSON.stringify( {
		record: getRecordMap( doc ).toJSON(),
		state: doc.getMap( STATE_MAP_KEY ).toJSON(),
	} );
}

function assertPeersConverged( peers: Peer[], trace: string[] ): void {
	flushAllUpdates( peers );

	const snapshots = peers.map( ( peer ) => ( {
		id: peer.id,
		snapshot: canonicalSnapshot( peer.doc ),
	} ) );
	const expected = snapshots[ 0 ].snapshot;
	const divergent = snapshots.filter(
		( { snapshot } ) => snapshot !== expected
	);

	if ( divergent.length === 0 ) {
		return;
	}

	throw new Error(
		`Yjs peers failed to converge.\n` +
			`Snapshots: ${ JSON.stringify( snapshots, null, 2 ) }\n` +
			`Trace:\n${ trace.join( '\n' ) }`
	);
}

function runScenario( seed: number ): void {
	const rng = createSeededRandom( seed );
	const trace: string[] = [];
	const network: PendingUpdate[] = [];
	const peers = [ 'peer-a', 'peer-b', 'peer-c' ].map( ( id ) =>
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
			let result: OperationResult;

			peer.doc.transact( () => {
				result = runOperation( peer.doc, seed, step, rng );
				trace.push( `${ step }: ${ peer.id } ${ result.label }` );
			}, LOCAL_ORIGIN );

			if ( result!.shouldCheckCompaction || rng.bool( 0.12 ) ) {
				compactFromPeer( peer, peers, trace );
			}

			deliverRandomUpdates( peers, network, rng, trace );
		}

		assertPeersConverged( peers, trace );
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
		'keeps Gutenberg-shaped Yjs updates convergent and server-sized (seed %i)',
		( seed ) => {
			expect( () => runScenario( seed ) ).not.toThrow();
		}
	);
} );
