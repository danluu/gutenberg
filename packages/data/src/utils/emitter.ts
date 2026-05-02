/**
 * Internal dependencies
 */
import { traceDataSpan } from '../benchmark-tracing';

interface EmitterMetadata {
	emitterKind?: string;
	storeName?: string;
}

interface ListenerMetadata {
	listenerType?: string;
}

export interface DataEmitter {
	emit: VoidFunction;
	subscribe: (
		listener: VoidFunction,
		metadata?: ListenerMetadata
	) => VoidFunction;
	pause: VoidFunction;
	resume: VoidFunction;
	isPaused: boolean;
}

/**
 * Create an event emitter.
 *
 * @param metadata Optional benchmark metadata.
 *
 * @return The event emitter.
 */
export function createEmitter( metadata: EmitterMetadata = {} ): DataEmitter {
	let isPaused = false;
	let isPending = false;
	const listeners = new Set< VoidFunction >();
	const listenerMetadata = new WeakMap< VoidFunction, ListenerMetadata >();
	const notifyListeners = () => {
		// We use Array.from to clone the listeners Set
		// This ensures that we don't run a listener
		// that was added as a response to another listener.
		const currentListeners = Array.from( listeners );
		return traceDataSpan(
			'data.emitter.notifyListeners',
			() =>
				currentListeners.forEach( ( listener, listenerIndex ) =>
					traceDataSpan( 'data.emitter.listener', listener, {
						...metadata,
						...listenerMetadata.get( listener ),
						listenerIndex,
						listenerCount: currentListeners.length,
					} )
				),
			{
				...metadata,
				listenerCount: currentListeners.length,
			}
		);
	};

	return {
		get isPaused() {
			return isPaused;
		},

		subscribe( listener, subscriberMetadata = {} ) {
			listeners.add( listener );
			listenerMetadata.set( listener, subscriberMetadata );
			return () => {
				listeners.delete( listener );
				listenerMetadata.delete( listener );
			};
		},

		pause() {
			isPaused = true;
		},

		resume() {
			traceDataSpan(
				'data.emitter.resume',
				() => {
					isPaused = false;
					if ( isPending ) {
						isPending = false;
						notifyListeners();
					}
				},
				{
					...metadata,
					isPending,
					listenerCount: listeners.size,
				}
			);
		},

		emit() {
			traceDataSpan(
				'data.emitter.emit',
				() => {
					if ( isPaused ) {
						isPending = true;
						return;
					}
					notifyListeners();
				},
				{
					...metadata,
					isPaused,
					listenerCount: listeners.size,
				}
			);
		},
	};
}
