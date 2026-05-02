/**
 * Runs a callback inside an optional benchmark timing span.
 *
 * The benchmark installs `globalThis.__typingBenchmarkTraceRichTextSpan`.
 * Outside that benchmark this is a near no-op.
 *
 * @param {string}   name     Span name.
 * @param {Function} callback Callback to run.
 * @param {Object}   metadata Optional metadata.
 *
 * @return {*} Callback return value.
 */
export function traceRichTextSpan( name, callback, metadata = {} ) {
	const tracer = globalThis.__typingBenchmarkTraceRichTextSpan;

	if ( typeof tracer !== 'function' ) {
		return callback();
	}

	return tracer( name, callback, metadata );
}
