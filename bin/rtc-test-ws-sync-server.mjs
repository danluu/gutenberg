#!/usr/bin/env node

/**
 * Compatibility entrypoint for fuzz supervisors that launch the RTC test
 * WebSocket relay from the repository-level bin directory.
 */
import '../test/e2e/bin/rtc-test-ws-sync-server.mjs';
