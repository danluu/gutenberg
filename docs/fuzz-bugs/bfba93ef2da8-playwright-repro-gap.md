# BFBA natural Playwright repro gap

Bug signature: `bfba93ef2da8`

The distinct manifest records a generated natural-user Playwright repro at:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/http-gen-10-20260504T165844Z/.triage-watcher/signatures/bfba93ef2da8/repros/bfba93ef2da8-realistic-repro.mjs
```

That file and its neighboring `STATUS.md` / `result.json` artifacts were absent during pass 177 and pass 178. I did not create a fresh browser timing search in this branch because the archived repro was missing and the unit-level integration repro already isolates the product path:

```text
core-data editEntityRecord
sync manager update with baseRecord
applyPostChangesToCRDTDoc
mergeCrdtBlocks with explicit baseRecord.blocks
```

Shortest remaining browser follow-up:

```bash
export WP_ENV_PORT=10125
export WP_BASE_URL=http://localhost:10125
export RTC_MANIFEST_WS_START_PORT=22200
export RTC_MANIFEST_WS_FIXED_PORT=1
npm run wp-env status
npm run wp-env start
npm run test:e2e -- test/e2e/specs/editor/collaboration/bfba93ef2da8-natural-paragraph-insert-move.spec.ts --headed=false
```

The spec should use two editor sessions on one post, have peer A insert a paragraph after a visible checkpoint paragraph, and have peer B immediately move a neighboring existing paragraph with the block mover before its entity base record has incorporated peer A's insert. Assertions should compare both peers' block order and saved/reloaded post content.
