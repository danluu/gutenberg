import fs from 'fs';
import path from 'path';
import process from 'process';

import {
	CRDT_RECORD_MAP_KEY,
	CRDT_STATE_MAP_KEY,
} from '../../../packages/sync/src/config.ts';
import { deserializeCrdtDoc } from '../../../packages/sync/src/utils.ts';

type FailureState = {
	title: string;
	blocks: unknown;
	crdtDocument: string | null;
};

function usage(): never {
	console.error(
		'usage: npm exec tsx -- artifacts/rtc-browser-fuzz/tools/inspect-crdt-failure.ts <command.log>'
	);
	process.exit( 2 );
}

function normalizeMeta(
	meta: Record< string, unknown >
): Record< string, unknown > {
	const copy = { ...meta };
	delete copy.savedAt;
	delete copy.savedBy;
	return copy;
}

function extractFailureJson( text: string ): string {
	const marker = 'Collaborative state did not converge within ';
	const markerIndex = text.indexOf( marker );
	if ( markerIndex === -1 ) {
		throw new Error( 'Could not find convergence marker in log.' );
	}

	const arrayStart = text.indexOf( '[', markerIndex );
	if ( arrayStart === -1 ) {
		throw new Error( 'Could not find JSON array start in log.' );
	}

	let depth = 0;
	let inString = false;
	let escaped = false;
	for ( let index = arrayStart; index < text.length; index++ ) {
		const char = text[ index ];
		if ( inString ) {
			if ( escaped ) {
				escaped = false;
				continue;
			}
			if ( char === '\\' ) {
				escaped = true;
				continue;
			}
			if ( char === '"' ) {
				inString = false;
			}
			continue;
		}

		if ( char === '"' ) {
			inString = true;
			continue;
		}
		if ( char === '[' ) {
			depth++;
			continue;
		}
		if ( char === ']' ) {
			depth--;
			if ( depth === 0 ) {
				return text.slice( arrayStart, index + 1 );
			}
		}
	}

	throw new Error( 'Could not find JSON array end in log.' );
}

function main() {
	const logPath = process.argv[ 2 ];
	if ( ! logPath ) {
		usage();
	}

	const resolvedPath = path.resolve( logPath );
	const text = fs.readFileSync( resolvedPath, 'utf8' );
	const states = JSON.parse( extractFailureJson( text ) ) as FailureState[];
	const decoded = states.map( ( state, index ) => {
		if ( ! state.crdtDocument ) {
			return {
				index,
				title: state.title,
				blocks: state.blocks,
				record: null,
				meta: null,
				normalizedMeta: null,
			};
		}

		const ydoc = deserializeCrdtDoc( state.crdtDocument );
		if ( ! ydoc ) {
			throw new Error(
				`Failed to deserialize state ${ index } in ${ resolvedPath }`
			);
		}

		try {
			const record = ydoc.getMap( CRDT_RECORD_MAP_KEY ).toJSON();
			const meta = ydoc.getMap( CRDT_STATE_MAP_KEY ).toJSON() as Record<
				string,
				unknown
			>;

			return {
				index,
				title: state.title,
				blocks: state.blocks,
				record,
				meta,
				normalizedMeta: normalizeMeta( meta ),
			};
		} finally {
			ydoc.destroy();
		}
	} );

	for ( const entry of decoded ) {
		console.log( `== state ${ entry.index } ==` );
		console.log( JSON.stringify( entry, null, 2 ) );
	}

	if ( decoded.length >= 2 ) {
		const [ first, ...rest ] = decoded;
		const summary = rest.map( ( entry ) => ( {
			index: entry.index,
			sameTitle:
				JSON.stringify( entry.title ) === JSON.stringify( first.title ),
			sameBlocks:
				JSON.stringify( entry.blocks ) ===
				JSON.stringify( first.blocks ),
			sameRecord:
				JSON.stringify( entry.record ) ===
				JSON.stringify( first.record ),
			sameMeta:
				JSON.stringify( entry.meta ) === JSON.stringify( first.meta ),
			sameNormalizedMeta:
				JSON.stringify( entry.normalizedMeta ) ===
				JSON.stringify( first.normalizedMeta ),
		} ) );
		console.log( '== comparisons ==' );
		console.log( JSON.stringify( summary, null, 2 ) );
	}
}

main();
