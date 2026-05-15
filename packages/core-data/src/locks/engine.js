/**
 * Internal dependencies
 */
import reducer from './reducer';
import { isLockAvailable, getPendingLockRequests } from './selectors';

function toPropertyKey( part ) {
	return typeof part === 'symbol' ? part : String( part );
}

function isSamePathPart( a, b ) {
	return toPropertyKey( a ) === toPropertyKey( b );
}

function isPrefix( prefix, path ) {
	return prefix.every( ( part, index ) =>
		isSamePathPart( part, path[ index ] )
	);
}

function doPathsOverlap( a, b ) {
	return isPrefix( a, b ) || isPrefix( b, a );
}

function doRequestsConflict( a, b ) {
	return (
		a.store === b.store &&
		( a.exclusive || b.exclusive ) &&
		doPathsOverlap( a.path, b.path )
	);
}

function hasOlderConflictingRequest( requests, requestIndex ) {
	const request = requests[ requestIndex ];
	for ( let i = requestIndex + 1; i < requests.length; i++ ) {
		if ( doRequestsConflict( request, requests[ i ] ) ) {
			return true;
		}
	}

	return false;
}

export default function createLocks() {
	let state = reducer( undefined, { type: '@@INIT' } );

	function processPendingLockRequests() {
		const pendingRequests = getPendingLockRequests( state );
		for ( const [ index, request ] of pendingRequests.entries() ) {
			const { store, path, exclusive, notifyAcquired } = request;
			if (
				! hasOlderConflictingRequest( pendingRequests, index ) &&
				isLockAvailable( state, store, path, { exclusive } )
			) {
				const lock = { store, path, exclusive };
				state = reducer( state, {
					type: 'GRANT_LOCK_REQUEST',
					lock,
					request,
				} );
				notifyAcquired( lock );
			}
		}
	}

	function acquire( store, path, exclusive ) {
		return new Promise( ( resolve ) => {
			state = reducer( state, {
				type: 'ENQUEUE_LOCK_REQUEST',
				request: { store, path, exclusive, notifyAcquired: resolve },
			} );
			processPendingLockRequests();
		} );
	}
	function release( lock ) {
		state = reducer( state, {
			type: 'RELEASE_LOCK',
			lock,
		} );
		processPendingLockRequests();
	}

	return { acquire, release };
}
