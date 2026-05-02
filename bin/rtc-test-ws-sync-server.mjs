#!/usr/bin/env node

import http from 'node:http';
import process from 'node:process';
// eslint-disable-next-line import/no-extraneous-dependencies
import ws from 'ws';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Y from 'yjs';

const WebSocketServer = ws.WebSocketServer || ws.Server;

const DEFAULT_PORT = 18991;
const PORT = parsePortArg();
const rooms = new Map();
const emptyYjsUpdateV2Base64 = createEmptyYjsUpdateV2Base64();

function parsePortArg() {
	const portIndex = process.argv.indexOf( '--port' );
	const rawPort =
		portIndex === -1
			? process.env.GUTENBERG_RTC_TEST_WS_PORT
			: process.argv[ portIndex + 1 ];

	if ( ! rawPort ) {
		return DEFAULT_PORT;
	}

	const port = Number.parseInt( rawPort, 10 );
	if ( ! Number.isInteger( port ) || port <= 0 ) {
		throw new Error( `Invalid port: ${ rawPort }` );
	}
	return port;
}

function getRoom( roomName ) {
	let room = rooms.get( roomName );
	if ( ! room ) {
		room = {
			awareness: new Map(),
			clients: new Set(),
			doc: new Y.Doc(),
			updates: [],
		};
		rooms.set( roomName, room );
	}
	return room;
}

function fromBase64( value ) {
	return new Uint8Array( Buffer.from( value, 'base64' ) );
}

function createEmptyYjsUpdateV2Base64() {
	const emptyDoc = new Y.Doc();
	const encoded = Buffer.from(
		Y.encodeStateAsUpdateV2( emptyDoc, Y.encodeStateVector( emptyDoc ) )
	).toString( 'base64' );
	emptyDoc.destroy();
	return encoded;
}

function sendJson( socket, payload ) {
	if ( socket.readyState !== socket.OPEN ) {
		return;
	}
	socket.send( JSON.stringify( payload ) );
}

function broadcastJson( room, payload, exceptSocket = null ) {
	for ( const client of room.clients ) {
		if ( client !== exceptSocket ) {
			sendJson( client, payload );
		}
	}
}

function removeSocketFromRooms( socket ) {
	for ( const [ roomName, room ] of rooms ) {
		if ( ! room.clients.delete( socket ) ) {
			continue;
		}

		if ( socket.clientId ) {
			room.awareness.delete( String( socket.clientId ) );
			broadcastJson( room, {
				type: 'remove-awareness',
				room: roomName,
				clientIds: [ socket.clientId ],
			} );
		}
	}
}

function roomAwarenessObject( room ) {
	return Object.fromEntries( room.awareness.entries() );
}

function handleJoin( socket, message ) {
	if ( ! message.room || ! message.clientId ) {
		return;
	}

	const room = getRoom( message.room );
	socket.roomName = message.room;
	socket.clientId = message.clientId;
	room.clients.add( socket );

	if ( Object.prototype.hasOwnProperty.call( message, 'awareness' ) ) {
		room.awareness.set( String( message.clientId ), message.awareness );
	}

	sendJson( socket, {
		type: 'snapshot',
		room: message.room,
		updates: room.updates,
		awareness: roomAwarenessObject( room ),
		peerCount: room.clients.size,
	} );

	broadcastJson(
		room,
		{
			type: 'sync-request',
			room: message.room,
			clientId: message.clientId,
			stateVector: message.stateVector,
		},
		socket
	);

	broadcastJson(
		room,
		{
			type: 'awareness',
			room: message.room,
			awareness: {
				[ message.clientId ]: message.awareness ?? {},
			},
		},
		socket
	);
}

function handleUpdate( socket, message ) {
	if ( ! socket.roomName || ! message.update ) {
		return;
	}

	if ( message.update === emptyYjsUpdateV2Base64 ) {
		return;
	}

	const room = getRoom( socket.roomName );
	try {
		Y.applyUpdateV2( room.doc, fromBase64( message.update ) );
	} catch {
		return;
	}
	room.updates.push( message.update );
	broadcastJson(
		room,
		{
			type: 'update',
			room: socket.roomName,
			clientId: socket.clientId,
			update: message.update,
		},
		socket
	);
}

function handleAwareness( socket, message ) {
	if ( ! socket.roomName ) {
		return;
	}

	const room = getRoom( socket.roomName );
	if ( message.awareness === null ) {
		room.awareness.delete( String( socket.clientId ) );
		broadcastJson( room, {
			type: 'remove-awareness',
			room: socket.roomName,
			clientIds: [ socket.clientId ],
		} );
		return;
	}

	room.awareness.set( String( socket.clientId ), message.awareness ?? {} );
	broadcastJson( room, {
		type: 'awareness',
		room: socket.roomName,
		awareness: {
			[ socket.clientId ]: message.awareness ?? {},
		},
	} );
}

function handleMessage( socket, rawMessage ) {
	let message;
	try {
		message = JSON.parse( rawMessage.toString() );
	} catch {
		return;
	}

	switch ( message.type ) {
		case 'join':
			handleJoin( socket, message );
			break;
		case 'update':
			handleUpdate( socket, message );
			break;
		case 'awareness':
			handleAwareness( socket, message );
			break;
		case 'leave':
			removeSocketFromRooms( socket );
			break;
	}
}

function reset() {
	for ( const room of rooms.values() ) {
		for ( const client of room.clients ) {
			client.close( 1001, 'reset' );
		}
		room.doc.destroy();
	}
	rooms.clear();
}

const server = http.createServer( ( request, response ) => {
	if ( request.url === '/health' ) {
		response.writeHead( 200, { 'content-type': 'application/json' } );
		response.end(
			JSON.stringify( {
				name: 'gutenberg-rtc-test-ws-sync-server',
				ok: true,
				port: PORT,
				rooms: rooms.size,
			} )
		);
		return;
	}

	if ( request.method === 'POST' && request.url === '/reset' ) {
		reset();
		response.writeHead( 204 );
		response.end();
		return;
	}

	response.writeHead( 404, { 'content-type': 'application/json' } );
	response.end( JSON.stringify( { ok: false } ) );
} );

const wss = new WebSocketServer( { server } );
wss.on( 'connection', ( socket ) => {
	socket.on( 'message', ( message ) => handleMessage( socket, message ) );
	socket.on( 'close', () => removeSocketFromRooms( socket ) );
	socket.on( 'error', () => removeSocketFromRooms( socket ) );
} );

server.listen( PORT, '127.0.0.1', () => {
	process.stdout.write(
		`gutenberg-rtc-test-ws-sync-server listening on 127.0.0.1:${ PORT }\n`
	);
} );

function shutdown() {
	reset();
	wss.close();
	server.close( () => process.exit( 0 ) );
	setTimeout( () => process.exit( 0 ), 500 ).unref();
}

process.on( 'SIGINT', shutdown );
process.on( 'SIGTERM', shutdown );
