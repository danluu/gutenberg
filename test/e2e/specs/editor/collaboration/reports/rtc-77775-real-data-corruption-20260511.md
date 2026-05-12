# RTC 77775 Real Data Corruption Repro

Date: 2026-05-11

## Verdict

This artifact demonstrates persisted data corruption in a pre-fix Gutenberg browser run. It is not just a UI-only divergence: both editors converge to the same wrong table contents, then saving and reloading preserves the loss.

## Scenario

Initial table body cells on both editors:

```text
anchor | same | same
```

Actions:

1. A edits the later duplicate row, cell index 2, to `edited-second-duplicate`.
2. Before B intentionally refreshes, B deletes the earlier duplicate row, cell index 1, via the normal table UI.
3. Both editors sync.

Correct final table:

```text
anchor | edited-second-duplicate
```

Observed final table on both A and B:

```text
anchor | same
```

## Evidence

Local combined annotated video:

```text
/tmp/rtc-video-regeneration/77775/corruption-search-20260511-162821/attempts/prefix-clean-060-duplicate-row-a-then-b-video-persistence/rtc-77775-real-data-corruption-combined-annotated.mp4
```

Run JSON:

```text
/tmp/rtc-video-regeneration/77775/corruption-search-20260511-162821/attempts/prefix-clean-060-duplicate-row-a-then-b-video-persistence/run-data-visible-core-text.json
```

Important JSON fields:

```json
{
  "scenario": "table-duplicate-row-a-edit-later-b-delete-earlier",
  "duplicateActionOrder": "a-then-b",
  "initialACellTexts": [ "anchor", "same", "same" ],
  "initialBCellTexts": [ "anchor", "same", "same" ],
  "aCellTextsBeforeBDelete": [ "anchor", "same", "edited-second-duplicate" ],
  "aEditVisibleBeforeBDelete": true,
  "bCellsAfterLocalDelete": [ "anchor", "same" ],
  "finalACellTexts": [ "anchor", "same" ],
  "finalBCellTexts": [ "anchor", "same" ],
  "expectedFinalCellTexts": [ "anchor", "edited-second-duplicate" ],
  "finalExpectedEverywhere": false,
  "finalConverged": true,
  "dataCorruptionDetected": true,
  "persistenceCheck": true,
  "persistedContentIncludesRemote": false,
  "reloadAStoreIncludes": false,
  "rtcA": true,
  "rtcB": true,
  "awarenessReachedTwo": true
}
```

Hashes:

```text
e1428163be6dc2e497fa7b97ac8646746120c6dac494ee482c372c6257597373  rtc-77775-real-data-corruption-combined-annotated.mp4
9ad4b9cd13b91df798b990b86ef1086b920c7ca23e59ceaff821f2824fa251cf  run-data-visible-core-text.json
```

Video metadata:

```text
1920x1080, 25 fps, 57.0 seconds, 785 KiB
```

## Validity Notes

The duplicate `same` rows make screenshots alone insufficient to prove which duplicate row was edited or deleted. The test run records the index-level actions: A edits cell index 2 and B deletes row/cell index 1. The video includes proof frames for the user-visible state, while the JSON proves the indexed operation sequence.

A skeptical reviewer may object that B acts from a stale view. That is the intended RTC conflict case: A edits one logical row while B deletes a different logical row. The expected merge preserves A's later-row edit after B's earlier-row delete.

The persistence check is the strongest evidence that this is data corruption rather than UI-only loss: saved raw content and the reloaded editor store both lack `edited-second-duplicate`.

## Negative Control

I also tried the less-contestable unique-row version on the same pre-fix environment:

```text
Initial:  anchor | delete-this-row | edit-this-row
A edit:   edit-this-row -> edited-unique-row
B delete: delete-this-row
Expected: anchor | edited-unique-row
Actual:   anchor | edited-unique-row
```

Run JSON:

```text
/tmp/rtc-video-regeneration/77775/corruption-search-20260511-162821/attempts/prefix-clean-070-unique-row-a-then-b-novideo/run-data-visible-core-text.json
```

That variant converged correctly and did not produce data corruption. This makes the duplicate-row artifact narrower, but also supports the root-cause interpretation: the bad behavior is the query-array identity case where two table rows have equal serialized content and concurrent edit/delete operations need stable row identity to merge correctly.
