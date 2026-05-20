#!/usr/bin/env node

/**
 * Compatibility entrypoint for fuzz supervisors that launch the RTC test
 * WebSocket relay from the repository-level bin directory.
 */
import { EventEmitter } from 'node:events';

const rawMaxListeners =
	process.env.GUTENBERG_RTC_TEST_WS_MAX_LISTENERS ??
	process.env.RTC_FUZZ_TEST_WS_MAX_LISTENERS;
const maxListeners =
	rawMaxListeners === undefined ? null : Number.parseInt( rawMaxListeners, 10 );
if ( Number.isInteger( maxListeners ) && maxListeners >= 0 ) {
	EventEmitter.defaultMaxListeners = maxListeners;
}

await import( '../test/e2e/bin/rtc-test-ws-sync-server.mjs' );
