type DataBenchmarkTracer = < T >(
	name: string,
	callback: () => T,
	metadata?: Record< string, unknown >
) => T;

interface DataBenchmarkListener extends VoidFunction {
	__typingBenchmarkDataListenerMetadata?: Record< string, unknown >;
}

/**
 * Runs a callback inside an optional benchmark timing span.
 *
 * The typing benchmark installs `globalThis.__typingBenchmarkTraceDataSpan`.
 * Outside that benchmark this is a near no-op.
 *
 * @param name     Span name.
 * @param callback Callback to run.
 * @param metadata Optional metadata.
 *
 * @return Callback return value.
 */
export function traceDataSpan< T >(
	name: string,
	callback: () => T,
	metadata: Record< string, unknown > = {}
): T {
	const tracer = (
		globalThis as typeof globalThis & {
			__typingBenchmarkTraceDataSpan?: DataBenchmarkTracer;
		}
	 ).__typingBenchmarkTraceDataSpan;

	if ( typeof tracer !== 'function' ) {
		return callback();
	}

	return tracer( name, callback, metadata );
}

/**
 * Checks whether the optional typing benchmark data tracer is installed.
 *
 * This keeps expensive diagnostic metadata, such as stack capture, out of normal
 * execution and out of non-data-span benchmark runs.
 *
 * @return Whether data span tracing is active.
 */
export function isDataSpanTracingEnabled(): boolean {
	return (
		typeof (
			globalThis as typeof globalThis & {
				__typingBenchmarkTraceDataSpan?: DataBenchmarkTracer;
			}
		 ).__typingBenchmarkTraceDataSpan === 'function'
	);
}

/**
 * Stores optional benchmark metadata on a listener function so lower-level
 * subscription wrappers can preserve subscriber identity in diagnostic traces.
 *
 * @param listener Listener function.
 * @param metadata Benchmark metadata.
 */
export function setDataListenerBenchmarkMetadata(
	listener: VoidFunction,
	metadata: Record< string, unknown >
): void {
	(
		listener as DataBenchmarkListener
	 ).__typingBenchmarkDataListenerMetadata = metadata;
}

/**
 * Reads optional benchmark metadata from a listener function.
 *
 * @param listener Listener function.
 *
 * @return Benchmark metadata.
 */
export function getDataListenerBenchmarkMetadata(
	listener: VoidFunction
): Record< string, unknown > {
	return (
		( listener as DataBenchmarkListener )
			.__typingBenchmarkDataListenerMetadata || {}
	);
}
