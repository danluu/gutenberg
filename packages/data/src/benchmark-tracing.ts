type DataBenchmarkTracer = < T >(
	name: string,
	callback: () => T,
	metadata?: Record< string, unknown >
) => T;

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
