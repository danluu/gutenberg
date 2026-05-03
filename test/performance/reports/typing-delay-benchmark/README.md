# Typing Delay Benchmark Investigation

This report documents a local investigation of the typing-delay behavior discussed in
[WordPress/gutenberg#51383](https://github.com/WordPress/gutenberg/issues/51383)
and the related Playwright performance-test migration in
[WordPress/gutenberg#52022](https://github.com/WordPress/gutenberg/pull/52022).

The short version:

-   The `~1000ms` latency cliff is real.
-   It comes from the rich-text persistence timer in
    `packages/block-editor/src/components/rich-text/use-mark-persistent.js`.
-   The original benchmark's `1000ms` data point is not just a different delay; it
    crosses a different editor-state boundary.
-   The `2000ms` point is slower than the `1000-1110ms` fast band, but it is not
    uniquely slow. It is part of a later high-latency plateau.
-   The later high-latency plateau is mostly an artifact of how Playwright applies
    `keyboard.type(..., { delay })`: for US-keyboard characters it holds the key
    down for the delay, then sends `keyup`.
-   In paired traces, the extra measured latency is almost entirely `keypress`
    dispatch time. The distinguishing condition is not just "persistence already
    fired"; it is that persistence fired while the previous synthetic key was
    still held down.
-   The short-delay region is not irrelevant. A dense wait-after-keyup scan over
    `0..2000ms` shows that key-hold and wait-after-keyup are already different
    well before `990ms`; the `1000ms+` targeted traces explain the largest cliff,
    but they do not cover the whole delay-mode effect.
-   A native `contenteditable` baseline with the same one-second input timer does
    not reproduce Gutenberg's key-hold plateau. That means "timer fired while key
    was held" is not sufficient by itself; Gutenberg editor work is required.
-   The large difference between a multi-character key-hold burst and per-key
    calls is not explained by DOM key event payloads, key repeat/composition,
    exact raw-CDP packet shape, or elapsed post-keyup time. Raw CDP stays slow
    even with long post-keyup gaps, while raw CDP plus a no-op `page.evaluate()`
    between keys flips to the fast path.
-   Event-listener timing narrows the visible Gutenberg work to editor-canvas
    input handling. The dominant measured callback is registered from
    `rich-text`; source-map lookup identifies it as the `onInput` path in
    `packages/rich-text/src/hook/event-listeners/input-and-selection.js`.
-   Source-level RichText spans put nearly all of that `onInput` time inside
    `registry.batch()`, not DOM parsing, format updating, DOM apply,
    serialization, or the direct `onSelectionChange` / `onChange` callbacks.
-   Source-level `@wordpress/data` spans put that batch remainder mostly in
    `core/block-editor` store-emitter resume and `useSelect` subscriber fanout.
    The expensive path is selector/subscriber invalidation, not the two direct
    RichText callbacks.
-   A deeper owner-attribution trace shows that the `useSelect` cost is broad
    fanout, not one pathological selector. The largest source-mapped group is
    `packages/block-editor/src/components/block-list/index.js:196`, with hundreds
    of active hook instances in the large-post fixture.
-   A single average per delay is not enough for this benchmark. The latency curve
    has discrete regimes, and variance changes by delay.

The data and plots in this directory were generated with:

```sh
Rscript test/performance/scripts/plot-typing-delay-benchmark.R
```

The script uses `tidyverse`, `ggplot2`, `jsonlite`, and `scales`. It reads raw
benchmark JSON from `artifacts/` when present, merges available raw runs into the
derived CSVs in `data/`, and renders plots to `figures/`. If raw JSON is absent,
it can regenerate the plots from the committed CSVs.

## Source Context

Issue #51383 started from an inconsistency: the Site Editor performance test typed
many characters continuously, while the Post Editor tests waited before each
character. The historical Post Editor values included a `2000ms` delay for the
large-post typing test and `500ms` for typing in containers. The issue discussion
then explored whether arbitrary waits should be replaced by a more meaningful
condition.

The original exploratory benchmark used coarse delays:

```js
[ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 5000 ];
```

with `10` retained samples plus one throwaway sample per delay. It reported
average input latency, using keyboard trace events. The resulting graphs showed a
surprisingly low `1000ms` sample and higher `2000ms` / `5000ms` samples.

That was a useful exploratory graph, but it had several design problems:

-   The delay grid was too sparse to reveal boundaries.
-   Ten samples per delay was too little to estimate variance.
-   Averages hid multimodal behavior and outliers.
-   The plot did not preserve time order, so it could not answer warmup or drift
    questions.
-   The metric was called "typing" even when one character was typed every second
    or every two seconds.
-   The selected delay may have changed editor behavior, not just measurement
    stability.

## Benchmark Changes

This branch adds `test/performance/specs/typing-delay-benchmark.spec.js`, a
dedicated benchmark for varying Playwright's `page.keyboard.type()` delay. It can
run:

-   dense delay sweeps, such as `0..1100ms` in `10ms` steps;
-   explicit delay sets, such as landmark points through `2000ms`;
-   more rounds and more retained samples per delay;
-   mixed, ascending, descending, or shuffled delay order;
-   fresh editor setup per delay;
-   persistence-state tracing;
-   data-action tracing;
-   timer tracing and timer intervention.
-   event-listener invocation tracing;
-   source-level RichText span tracing;
-   source-level data registry / `useSelect` span tracing;
-   alternate delay modes:
    -   `keyboard`: the original Playwright `keyboard.type(..., { delay })` mode;
    -   `between-keys`: type a complete keypress, then wait;
    -   `after-persistence`: wait for `isLastBlockChangePersistent()`, then wait;
    -   `hold-then-keyup-gap`: hold a key, release it, then optionally wait;
    -   `type-one-char-hold`: run one Playwright `keyboard.type( 'x' )` action
        per character;
    -   `down-up-key-hold`: run explicit Playwright `keyboard.down()` /
        `keyboard.up()` calls per character;
    -   `cdp-key-hold`: send raw Chromium `Input.dispatchKeyEvent` events;
    -   `cdp-key-hold-page-evaluate`: send raw CDP key events plus a no-op
        `page.evaluate()` between characters;
    -   `cdp-key-hold-runtime-evaluate`: send raw CDP key events plus a direct
        CDP `Runtime.evaluate` between characters.
-   a native `contenteditable` scenario with a minimal one-second input timer.

The benchmark records every retained sample rather than only aggregate values.
The R script derives:

-   `data/typing-delay-records.csv`: one row per typed character;
-   `data/typing-delay-by-delay.csv`: per-delay summary stats;
-   `data/typing-delay-runs.csv`: one row per delay run;
-   `data/typing-delay-persistence-events.csv`: persistence-state transitions;
-   `data/typing-delay-action-events.csv`: instrumented data actions;
-   `data/typing-delay-timer-events.csv`: instrumented timers;
-   `data/typing-delay-browser-events.csv`: instrumented browser events.
-   `data/typing-delay-scheduler-events.csv`: instrumented timer/RAF/idle
    scheduler events;
-   `data/typing-delay-keyhold-mark-gap.csv`: derived timing from rich-text
    persistence marker to the next keydown in the key-hold trace.
-   `data/typing-delay-key-event-timing.csv`: paired trace timing for previous
    keyup, persistence marker, and next keydown.
-   `data/typing-delay-native-key-event-timing.csv`: the same timing for the
    native `contenteditable` comparison.
-   `data/typing-delay-event-listener-events.csv`: per-listener invocation timing;
-   `data/typing-delay-listener-input-summary.csv`: input-listener summaries by
    delay and registration script.
-   `data/typing-delay-listener-input-scenario-summary.csv`: RichText
    input-listener comparison between the large-post and empty-post scenarios.
-   `data/typing-delay-listener-action-summary.csv`: data-action summaries from
    the listener-traced runs.
-   `data/typing-delay-listener-source-map.csv`: source-map lookup for the
    minified RichText listener registration stack.
-   `data/typing-delay-rich-text-span-events.csv`: source-level RichText timing
    spans from targeted instrumented runs.
-   `data/typing-delay-rich-text-span-summary.csv`: per-delay summary of those
    spans.
-   `data/typing-delay-rich-text-batch-parts.csv`: per-input split of
    `registry.batch()` into direct callbacks and remaining synchronous work.
-   `data/typing-delay-rich-text-batch-summary.csv`: per-delay summary of the
    batch split.
-   `data/typing-delay-data-span-summary.csv`: source-level data registry and
    `useSelect` span summaries from targeted instrumented runs.
-   `data/typing-delay-data-batch-parts.csv`: per-input, RichText-matched
    breakdown of the `@wordpress/data` spans inside `registry.batch()`.
-   `data/typing-delay-data-batch-summary.csv`: per-delay summary of that data
    batch breakdown.
-   `data/typing-delay-data-store-resume-summary.csv`: per-store resume timing
    for input-matched data batches.
-   `data/typing-delay-use-select-owner-summary.csv`: source-mapped owner
    summary for the targeted `useSelect` attribution traces.
-   `data/typing-delay-causality-*.csv`: targeted traces that separate
    key-hold duration, persistence-marker timing, and the post-keyup gap before
    the next key.
-   `data/typing-delay-post-keyup-gap-*.csv`: follow-up traces checking whether
    timers, RAF, idle callbacks, data actions, raw DevTools timeline slices, or
    DOM key flags explain the post-keyup gap effect.
-   `data/typing-delay-input-path-*.csv`: raw-CDP follow-up traces separating the
    observed post-keyup gap from Playwright's higher-level keyboard helpers.

One subtle benchmark bug was fixed during the investigation: an earlier version
re-clicked the paragraph via an "Empty block" accessible name before each delay.
That locator is invalid after the paragraph has content. The benchmark now clicks
the paragraph once during setup and keeps focus across delay runs.

## Main Delay Curve

![0-1100ms delay curve](figures/01-delay-curve-0-1100.png)

The dense `0..1100ms` run used `10ms` steps, 3 rounds, and 10 retained samples
per delay. The curve is not monotonic.

Approximate p50 regimes from the dense run:

|   Delay range | p50 regime |
| ------------: | ---------: |
|      `0-90ms` |   `~6.0ms` |
|   `100-150ms` |   `~8.9ms` |
|   `160-500ms` |  `~18.3ms` |
|   `510-560ms` |  `~11.9ms` |
|   `570-990ms` |  `~18.1ms` |
| `1000-1100ms` |   `~7.8ms` |

This alone makes the original coarse delay list risky. Sampling every `100ms`
misses most of the regime changes and makes `1000ms` look like a magic value.

## Extension To 2000ms

![Extended 2000ms delay curve](figures/02-delay-curve-extended-to-2000.png)

The `1000-1110ms` region is fast, but the fast behavior does not continue through
`2000ms`. A repeated landmark run gave:

|    Delay |   n |        p50 |       mean |      CV |
| -------: | --: | ---------: | ---------: | ------: |
|  `900ms` |  30 | `18.423ms` | `18.249ms` | `0.098` |
|  `990ms` |  30 | `17.972ms` | `17.555ms` | `0.129` |
| `1000ms` |  30 |  `9.871ms` | `10.222ms` | `0.111` |
| `1010ms` |  30 |  `9.854ms` | `10.020ms` | `0.161` |
| `1100ms` |  30 | `10.604ms` | `10.581ms` | `0.033` |
| `1110ms` |  30 | `10.767ms` | `10.254ms` | `0.135` |
| `1200ms` |  30 | `17.682ms` | `17.306ms` | `0.081` |
| `1300ms` |  30 | `18.338ms` | `18.114ms` | `0.072` |
| `1500ms` |  30 | `17.744ms` | `17.175ms` | `0.148` |
| `1600ms` |  30 | `18.404ms` | `18.329ms` | `0.057` |
| `1800ms` |  30 | `18.183ms` | `17.963ms` | `0.093` |
| `2000ms` |  30 | `18.248ms` | `18.068ms` | `0.114` |

So `2000ms` is slower than the `1000ms` fast band, but it is not slower than
`1200ms`, `1300ms`, `1600ms`, or `1800ms`. The original `2000ms` bump should be
read as "the benchmark left the fast band", not "longer idle time causes a
monotonic slowdown".

The dense `1110..2000ms` scan found another dip around `1510-1570ms`, then a
return to the same `~18ms` high plateau.

## Distributions, Not Just Averages

![Landmark distributions](figures/03-landmark-distributions.png)

The landmark run shows why p50, p10/p90, and raw samples are more useful than a
single average. `1000ms` and `1010ms` are visibly in a different distribution
from `990ms` and `1200ms`. Some delays have low medians but high volatility.

![Coefficient of variation by delay](figures/04-coefficient-of-variation-by-delay.png)

![Container-block coefficient of variation by delay](figures/04b-container-coefficient-of-variation-by-delay.png)

The "stable between 500 and 900ms" interpretation from the original exploration
does not survive a dense scan. Some delay values inside large ranges are stable,
but the adjacent values can be in different regimes.

The container-block rerun above measures typing into the first paragraph inside
the Columns fixture used by the original "Typing within containers" test. This
is not a Docker-vs-host comparison; the WordPress test environment was already
wp-env/Docker-backed. The container-block volatility curve is still delay- and
mode-dependent, so the variance problem is not an artifact of the large-post
non-container fixture.

## Time Order And Warmup

![Latency over time](figures/05-latency-over-time.png)

The Tratt VM-warmup articles linked in the original request are relevant because
they argue against assuming a benchmark reaches a simple, stable plateau. This
benchmark does not show a clean "warms up, then stays fast" story. Delay choice
explains much more than sample order.

The full run and the landmark run both preserve per-sample order. After accounting
for delay regimes, there was no convincing monotonic slowdown over time in these
runs. That is not proof that long editing sessions are safe; it only says these
short local runs did not reproduce a simple time-based degradation.

## Where The 1000ms Cliff Comes From

The cliff comes from this code:

```js
// packages/block-editor/src/components/rich-text/use-mark-persistent.js
if ( previousTextRef.current !== value.text ) {
	const timeout = window.setTimeout( () => {
		__unstableMarkLastChangeAsPersistent();
	}, 1000 );
	previousTextRef.current = value.text;
	return () => {
		window.clearTimeout( timeout );
	};
}
```

That hook is used by RichText. For text input, it delays creating a persistent
undo level until there has been one second without input. The relevant state then
flows through:

-   `MARK_LAST_CHANGE_AS_PERSISTENT` in
    `packages/block-editor/src/store/actions.js`;
-   `withPersistentBlockChange()` in
    `packages/block-editor/src/store/reducer.js`;
-   `isLastBlockChangePersistent()` in
    `packages/block-editor/src/store/selectors.js`;
-   `useBlockSync()` in
    `packages/block-editor/src/components/provider/use-block-sync.js`, which sends
    persistent changes through `onChange` and non-persistent changes through
    `onInput`.

The `1000ms` point drops because the timer changes when expensive work falls
relative to the benchmark's measured keypress window. Below the boundary, for
example at `990ms`, each next character arrives before the persistence timeout
fires. The RichText effect cleanup cancels the old timeout, so the next measured
keypress still runs as another continuous, non-persistent text input update.

At `1000ms`, Playwright's normal `keyboard.type( ..., { delay } )` has held the
previous key down for roughly one second before sending `keyup`, and the next
`keydown` follows almost immediately. That gives the RichText timeout just enough
room to fire between synthetic characters. The timeout dispatches
`MARK_LAST_CHANGE_AS_PERSISTENT`, `useBlockSync()` can push the previous text
update through the persistent `onChange` path, and part of the block-editor/data
subscriber work for the previous character has already happened before the next
keypress starts being measured.

So the drop is not evidence that the persistence timer makes Gutenberg
intrinsically faster. It is an accounting effect in an event-only metric. The
benchmark's latency value is the sum of Chromium `EventDispatch` durations for
the key's `keydown`, `keypress`, and `keyup` events. A timer callback is a
different browser task, so timer work is not included in that key-event number
even if the timer was scheduled by the previous character.

That means the trace timestamps are not wrong. The measured key event really is
shorter at `1000ms`; the problem is interpreting that event-only slice as the
whole cost of the character cycle. In the focused action trace, the `1000ms`
row has an event-only p50 of `10.374ms`, but the persistence action that fired
inside the preceding key hold had median duration around `15.8ms`. Adding those
two pieces gives about `26.2ms`, which is essentially the same scale as the
event-only p50s at `970ms` (`26.252ms`) and `990ms` (`25.829ms`).

The timer callback does real work because it dispatches
`MARK_LAST_CHANGE_AS_PERSISTENT`. That wakes the block-editor data store and
subscribers. In particular, `useBlockSync()` observes the persistent-state
transition and can commit the previous block change through the persistent
`onChange` path. Since that happens before the next `keydown`, it is outside the
next key's `EventDispatch` slices. The later source-level traces are consistent
with this state split: in the large-post key-held run, RichText
`registry.batch()` median time drops from about `10.5ms` at `990ms` to `6.5ms`
at `1000ms`, and the input-matched data batch drops from about `23.4ms` to
`14.2ms`.

The action trace shows the boundary directly. This version of the graph is a
per-delay timing diagram, not an absolute wall-clock timeline:

-   the gray bar is the artificial Playwright key hold, from the previous
    `keydown` to its `keyup`;
-   the dashed vertical line is the `1000ms` RichText persistence timer;
-   the diamond is the next `keydown`, where the benchmark's next measured
    keypress dispatch begins;
-   the circle is the persistence timer callback;
-   the triangle is the text update action for the next input.

![Persistence action timeline](figures/06-persistence-action-timeline.png)

In the focused action run:

|    Delay |        p50 | What happened                                                          |
| -------: | ---------: | ---------------------------------------------------------------------- |
|  `970ms` | `26.252ms` | no between-key persistence marker; the next input clears the old timer |
|  `980ms` | `25.068ms` | no between-key persistence marker; the next input clears the old timer |
|  `990ms` | `25.829ms` | no between-key persistence marker; the next input clears the old timer |
| `1000ms` | `10.374ms` | the persistent marker fires during the held-key interval               |
| `1010ms` | `12.019ms` | the persistent marker fires during the held-key interval               |
| `1100ms` | `12.667ms` | persistent between keys                                                |
| `1110ms` | `12.660ms` | persistent between keys                                                |
| `1150ms` | `14.172ms` | persistent between keys, but latency begins climbing                   |
| `1180ms` | `19.570ms` | persistent between keys, high/transition                               |
| `1190ms` | `21.147ms` | persistent between keys, near high plateau                             |
| `1200ms` | `20.959ms` | persistent between keys, high/transition                               |
| `1300ms` | `22.628ms` | persistent between keys, high plateau                                  |

The important visual comparison is `990ms` versus `1000ms`. At `970-990ms`, the
next keydown arrives at about the timer boundary, but the next input clears the
previous timer before the callback has run between keys. The triangle is red:
the text update makes the last change transient again. The expensive block
editor synchronization for that input is still part of the measured next
keypress dispatch.

At `1000ms` and `1010ms`, the circle appears before the diamond. That means the
timer callback ran while Playwright was still holding the previous synthetic key,
before the next measured keypress began. The previous input has already been
marked persistent, and the `core/block-editor` / `@wordpress/data` subscriber
work associated with that timer-side transition has happened outside the next
keypress `EventDispatch` slices. The next triangle is orange: the following text
update starts from the post-timer persistent state. That is why the measured
event-only latency drops even though total editor work has not disappeared.

This only happens in the key-held benchmark because the gray bar is long. In the
complete-keypress-then-wait mode, `keyup` happens immediately and the wait occurs
after the key is no longer down. The same one-second timer can still fire, but it
fires after a completed keypress and ordinary idle wait, not inside a long
synthetic key hold immediately before the next keydown. That different event
ordering does not move the same work out of the next keypress dispatch slice.

The same data can be reduced to three repeated p50 timelines:

![Persistence regime timelines](figures/06b-persistence-regime-timelines.png)

These timelines show three synthetic key cycles for each regime. They use p50
offsets, so each row is a typical repeated cycle rather than one noisy sample.
The gray bar is the wall-clock interval where Playwright is holding the key down,
but the reported benchmark value is not the length of that bar. The reported
value is the event-only p50: the sum of `keydown`, `keypress`, and `keyup`
`EventDispatch` durations for the key.

The three regimes are:

-   **Below 1s (`990ms`).** Each new input arrives before the RichText timer has
    run between measured keys. The text update leaves the change transient, and
    the benchmark reports the full slow event path: `25.8ms` p50.
-   **At the drop (`1000ms`).** The timer runs while the synthetic key is still
    held and before the next measured keydown. The key-event p50 is only
    `10.4ms`, but the timer task immediately before it is another `15.9ms` p50
    outside the event metric. The work moved tasks; it did not vanish.
-   **Above the drop (`1300ms`).** The timer still runs outside the measured key
    event, but the later key-held path is slow again: `22.6ms` event-only p50,
    plus a `15.7ms` timer task outside the metric. This is why the later plateau
    is a separate phenomenon from the first `990 -> 1000ms` accounting drop.

This establishes two separate facts:

1. The sharp `990 -> 1000ms` drop is caused by the one-second rich-text
   persistence timer.
2. The later return to the high plateau is not caused by that same state
   transition, because the editor is already on the persistent path at `1150ms`,
   `1180ms`, `1190ms`, `1200ms`, and `1300ms`.

## Timer Intervention

To test causality, the benchmark added a timer tracer/intervention mode. The
mode rewrites `setTimeout(..., 1000)` calls and records which callbacks were
rewritten. Source-map lookup for the repeated timer stack mapped the minified
frame back to
`packages/block-editor/src/components/rich-text/use-mark-persistent.js:29`.

I first rewrote the timer to `500ms`, then repeated the check at `230ms` and
`710ms`. The three runs rewrote 359 rich-text `1000ms` timers in total: 235 in
the dense `230ms` transition scan, 62 in the `500ms` run, and 62 in the `710ms`
run.

![Timer rewrite interventions](figures/07-timeout-rewrite-interventions.png)

![Timer rewrite relative alignment](figures/07b-timeout-rewrite-relative.png)

The low-latency band moved with the timer, and the original `1000ms` boundary
stopped being special in the intervention runs:

| Timer rewrite |    Delay |   n |        p50 |       mean |
| ------------: | -------: | --: | ---------: | ---------: |
|       `230ms` |  `220ms` |   8 | `36.268ms` | `34.812ms` |
|       `230ms` |  `230ms` |   8 | `24.091ms` | `23.876ms` |
|       `230ms` |  `260ms` |   8 | `10.902ms` | `11.188ms` |
|       `230ms` |  `280ms` |   8 | `10.821ms` | `10.820ms` |
|       `230ms` |  `330ms` |   8 | `14.110ms` | `14.209ms` |
|       `230ms` |  `430ms` |   8 | `37.959ms` | `37.294ms` |
|       `230ms` |  `990ms` |   8 | `35.248ms` | `33.889ms` |
|       `230ms` | `1000ms` |   8 | `34.287ms` | `31.301ms` |
|       `500ms` |  `490ms` |   8 | `19.939ms` | `19.323ms` |
|       `500ms` |  `500ms` |   8 | `12.077ms` | `12.105ms` |
|       `500ms` |  `510ms` |   8 | `11.686ms` | `11.904ms` |
|       `500ms` |  `600ms` |   8 | `11.345ms` | `11.292ms` |
|       `500ms` |  `700ms` |   8 | `18.052ms` | `18.022ms` |
|       `710ms` |  `700ms` |   8 | `36.629ms` | `36.090ms` |
|       `710ms` |  `710ms` |   8 | `18.005ms` | `18.323ms` |
|       `710ms` |  `720ms` |   8 | `11.096ms` | `11.266ms` |
|       `710ms` |  `810ms` |   8 | `14.397ms` | `13.966ms` |
|       `710ms` |  `910ms` |   8 | `35.809ms` | `34.766ms` |

This is the strongest evidence that the `~1000ms` cliff is not VM warmup or a
random browser scheduling artifact. Moving the timer moves the low-latency
window.

The exact transition is not a step function at the rewritten millisecond. The
timer callback has to fire, run the rich-text persistence work, and yield back
to the browser before the next measured keydown can benefit from that work
having already happened. That is why the `230ms` rewrite has mixed/partial
points at `230..250ms` and its cleanest low points at `260..330ms`, and why the
`710ms` rewrite has a mixed point at `710ms` followed by a clear low point at
`720ms`.

The intervention runs should not be treated as production benchmarks. Wrapping
`setTimeout` can perturb scheduling. Their purpose is causal attribution.

## Firefox Check

Firefox cannot use the Chromium `EventDispatch` trace metric used for the main
Chrome plots. To check whether the same boundary exists there, I added a Firefox
project path and ran the benchmark with in-page event-listener timing. The graph
below measures the dispatch span of the editable element's `input` event
listeners, not Chromium trace slices.

![Firefox input listener boundary](figures/17-firefox-input-listener-boundary.png)

Firefox shows the same qualitative transition, but the exact `1000ms` point is
mixed. The high regime is clear through `990ms`; `1000ms` contains both high and
low samples; `1005ms` is mostly low; `1010ms` and later are consistently low in
these runs.

|    Delay |   n |      p50 |      p10 |      p90 |     mean |
| -------: | --: | -------: | -------: | -------: | -------: |
|  `950ms` |  14 | `51.0ms` | `46.3ms` | `54.4ms` | `49.9ms` |
|  `970ms` |  14 | `53.5ms` | `51.0ms` | `56.7ms` | `52.9ms` |
|  `980ms` |  14 | `53.0ms` | `51.0ms` | `54.4ms` | `52.6ms` |
|  `990ms` |  14 | `52.5ms` | `50.3ms` | `55.7ms` | `52.7ms` |
|  `995ms` |  19 | `52.0ms` | `29.0ms` | `55.0ms` | `45.8ms` |
| `1000ms` |  33 | `48.0ms` | `20.2ms` | `54.8ms` | `39.9ms` |
| `1005ms` |  19 | `29.0ms` | `20.8ms` | `47.4ms` | `30.5ms` |
| `1010ms` |  33 | `21.0ms` | `20.0ms` | `28.0ms` | `22.7ms` |
| `1020ms` |  14 | `20.0ms` | `19.3ms` | `26.7ms` | `21.8ms` |
| `1030ms` |  14 | `22.0ms` | `20.0ms` | `30.4ms` | `24.2ms` |
| `1050ms` |  14 | `21.0ms` | `20.0ms` | `24.1ms` | `21.6ms` |

So the answer is "yes, with a caveat": Firefox has the same one-second boundary
effect, but with this listener-based metric the clean low band starts just after
the one-second mark rather than being cleanly centered on the exact `1000ms`
sample.

## Safari/WebKit Check

This uses Playwright WebKit with the Desktop Safari device profile and Safari
user agent. It is a Safari-engine check, not a manually-driven run in the
system Safari.app. Like Firefox, it cannot use Chromium `EventDispatch` trace
slices, so the metric below is the same input-event listener dispatch span used
for the Firefox check.

![WebKit input listener boundary](figures/18-webkit-input-listener-boundary.png)

WebKit does show a drop at the one-second boundary, but it is much smaller than
Chrome's cliff and smaller than Firefox's transition. In these runs, the median
listener dispatch span is mostly `18..24ms` below `1000ms`, then mostly
`14..16ms` at and above `1000ms`. The WebKit listener timestamps also have more
near-zero dispatch spans than the Firefox run, so the p10 band is less
informative than the median.

|    Delay |   n |      p50 |     p10 |      p90 |     mean |
| -------: | --: | -------: | ------: | -------: | -------: |
|  `950ms` |  22 | `24.0ms` | `0.0ms` | `31.9ms` | `17.5ms` |
|  `970ms` |  25 | `20.0ms` | `0.0ms` | `30.0ms` | `14.8ms` |
|  `980ms` |  23 | `18.0ms` | `0.0ms` | `28.8ms` | `13.9ms` |
|  `990ms` |  21 | `18.0ms` | `0.0ms` | `28.0ms` | `15.4ms` |
|  `995ms` |  28 | `17.5ms` | `0.0ms` | `28.3ms` | `15.4ms` |
| `1000ms` |  47 | `14.0ms` | `0.0ms` | `18.4ms` | `11.3ms` |
| `1005ms` |  24 | `15.0ms` | `1.0ms` | `17.7ms` | `13.0ms` |
| `1010ms` |  39 | `16.0ms` | `0.0ms` | `19.0ms` | `13.7ms` |
| `1020ms` |  19 | `14.0ms` | `0.0ms` | `18.4ms` | `11.4ms` |
| `1030ms` |  17 | `15.0ms` | `0.0ms` | `16.0ms` | `12.2ms` |
| `1050ms` |  21 | `15.0ms` | `0.0ms` | `16.0ms` | `10.6ms` |

So the answer is "yes, but weakly": the one-second persistence boundary is
visible in WebKit/Safari-engine timing, but this run does not reproduce the
large Chrome drop. The likely interpretation is that the same Gutenberg
one-second timer boundary exists, while WebKit's dispatch/listener profile is
already relatively low before the boundary and therefore has less room to drop.

## Deeper Pass: The Delay Is A Key Hold

The first report explained the `~1000ms` cliff but left the later `1200-2000ms`
plateau partly open. The deeper pass found a more fundamental benchmark issue:
Playwright's `keyboard.type( text, { delay } )` is not equivalent to "type a
complete character, wait, type the next complete character."

In the installed Playwright implementation, `keyboard.type()` loops over
characters and calls `press( char, { delay } )`. `press()` sends `keydown`, waits
for `delay`, then sends `keyup`. The browser event traces confirm this:
`keydown` / `keypress` / `input` happen near the start of each sample, then
`keyup` happens roughly `delay` milliseconds later, and the next `keydown`
follows almost immediately.

That means the original delay sweep is mostly a synthetic key-hold-duration
sweep. A person who types once every second is not normally holding each key down
for one second.

![Delay mode comparison](figures/10-delay-mode-comparison.png)

![Container-block delay mode comparison](figures/10b-container-delay-mode-comparison.png)

The first version of this comparison used landmark delays, mostly near and above
the `1000ms` timer boundary. I added dense complete-keypress-then-wait runs for
the full `0..2000ms` range, in `10ms` steps, and compare them with the existing
dense key-hold scan.

The container-block rerun repeats the full `0..2000ms`, `10ms`-step sweep in the
Columns fixture. Absolute latencies are lower because the fixture is smaller
than the large-post case, but the qualitative conclusion is stronger rather than
weaker: holding the key down is much slower than completing the keypress and then
waiting. The wait-after-keyup container run is mostly around `5..7ms`; the
key-hold container run is mostly around `14..16ms`, with a later high band near
`1800..2000ms`.

Two modes are compared:

1. Playwright's normal `keyboard.type(..., { delay })`: keydown/keypress/input
   happen, the key remains held for roughly `delay`, then keyup happens.
2. Complete keypress, then wait: keydown/keypress/input/keyup happen first, then
   the benchmark waits for `delay`.

Shorter delays are not irrelevant. The one-second rich-text persistence timer
cannot explain differences below `1000ms`, but the dense scan shows the two modes
are already different there. The key-hold run has a broad slower region before
the `1000ms` fast band; the wait-after-keyup run is flatter and does not
reproduce the high `1200..2000ms` plateau.

Selected p50s:

|    Delay | Key held | Wait after keyup |
| -------: | -------: | ---------------: |
|    `0ms` |  `5.4ms` |          `8.0ms` |
|  `100ms` |  `7.9ms` |         `10.2ms` |
|  `500ms` | `16.7ms` |         `11.4ms` |
|  `900ms` | `18.9ms` |         `11.3ms` |
|  `990ms` | `17.9ms` |         `10.2ms` |
| `1000ms` |  `7.8ms` |         `10.1ms` |
| `1100ms` |  `8.9ms` |         `14.1ms` |
| `1200ms` | `17.4ms` |         `11.9ms` |
| `1300ms` | `18.9ms` |         `11.4ms` |
| `1550ms` | `12.8ms` |         `11.3ms` |
| `2000ms` | `18.2ms` |         `12.2ms` |

Selected container-block p50s:

|    Delay | Key held | Wait after keyup |
| -------: | -------: | ---------------: |
|    `0ms` |  `2.5ms` |          `3.3ms` |
|  `100ms` | `12.6ms` |          `6.6ms` |
|  `500ms` | `13.6ms` |          `7.1ms` |
|  `900ms` | `13.4ms` |          `6.2ms` |
| `1000ms` | `13.5ms` |          `5.2ms` |
| `1030ms` |  `9.1ms` |          `5.3ms` |
| `1200ms` | `14.9ms` |          `6.7ms` |
| `1600ms` | `15.0ms` |          `3.8ms` |
| `1800ms` | `18.0ms` |          `6.5ms` |
| `2000ms` | `17.3ms` |          `5.3ms` |

This falsifies the simple "more idle time after persistence makes typing slow"
explanation. Waiting after the key has completed does not reproduce the slow
plateau. Earlier `after-persistence` landmark runs also showed that waiting
after the rich-text persistence marker does not reproduce it either.

The slow plateau appears when the rich-text persistence timer fires while the
previous synthetic key is still held down, and then the next key arrives after
some additional key-hold slack.

![Key hold mark gap vs latency](figures/11-keyhold-mark-gap-vs-latency.png)

In the scheduler/action trace:

|    Delay | Median time from previous persistence marker to next keydown | Median latency |
| -------: | -----------------------------------------------------------: | -------------: |
| `1100ms` |                                                     `~101ms` |       `11.7ms` |
| `1150ms` |                                                     `~151ms` |       `12.7ms` |
| `1180ms` |                                                     `~182ms` |       `15.7ms` |
| `1200ms` |                                                     `~203ms` |       `18.4ms` |
| `1300ms` |                                                     `~304ms` |       `19.1ms` |
| `1510ms` |                                                     `~512ms` |       `14.3ms` |
| `1550ms` |                                                     `~551ms` |       `12.6ms` |
| `1580ms` |                                                     `~584ms` |       `16.5ms` |

The relationship is not perfectly monotonic; the `1510-1550ms` dip remains a
browser/event-loop phase effect rather than a clean editor-state transition. But
the comparison with `between-keys` and `after-persistence` is enough to say that
the `1200-2000ms` plateau is not a normal "pause between characters" effect. It
is tied to holding a synthetic key down while Gutenberg's one-second rich-text
timer fires.

### Paired Trace: Previous Key State

The next trace repeated the same delay list in two modes with browser, action,
timer, and scheduler tracing enabled:

1. Playwright key-hold delay.
2. Complete keypress, then explicit wait after `keyup`.

The component split shows that the extra measured latency is not primarily
`keydown` or `keyup`; it is almost all `keypress` `EventDispatch` duration.

![Event component breakdown](figures/12-event-component-breakdown.png)

Selected p50s from the paired trace:

| Mode                         |    Delay | Latency p50 | `keypress` p50 |
| ---------------------------- | -------: | ----------: | -------------: |
| Key held during delay        | `1200ms` |    `17.4ms` |       `16.4ms` |
| Complete keypress, then wait | `1200ms` |    `11.1ms` |       `10.9ms` |
| Key held during delay        | `1300ms` |    `18.2ms` |       `17.2ms` |
| Complete keypress, then wait | `1300ms` |    `10.8ms` |       `10.6ms` |
| Key held during delay        | `2000ms` |    `16.9ms` |       `15.8ms` |
| Complete keypress, then wait | `2000ms` |    `10.6ms` |       `10.3ms` |

This paired trace also separates two timing variables that looked confounded in
the earlier scheduler trace:

-   time from the persistence marker to the next keydown;
-   whether that marker fired before the previous keyup.

![Persistence marker vs previous keyup](figures/13-persistence-marker-vs-previous-keyup.png)

At `1200ms`, both modes have the persistence marker a few hundred milliseconds
before the next keydown. But only the key-hold mode has the marker before the
previous `keyup`.

| Mode                         |    Delay | Previous keyup to marker | Marker to next keydown | `keypress` p50 |
| ---------------------------- | -------: | -----------------------: | ---------------------: | -------------: |
| Key held during delay        | `1200ms` |                 `-201ms` |                `203ms` |       `16.4ms` |
| Complete keypress, then wait | `1200ms` |                 `1000ms` |                `263ms` |       `10.9ms` |
| Key held during delay        | `1300ms` |                 `-302ms` |                `303ms` |       `17.2ms` |
| Complete keypress, then wait | `1300ms` |                 `1000ms` |                `357ms` |       `10.6ms` |
| Key held during delay        | `2000ms` |                `-1001ms` |               `1004ms` |       `15.8ms` |
| Complete keypress, then wait | `2000ms` |                  `999ms` |               `1064ms` |       `10.3ms` |

Negative "previous keyup to marker" means the persistence marker fired while the
previous synthetic key was still down. That is the best current explanation for
why a `1200ms` Playwright delay is slow while a complete keypress followed by a
`1200ms` wait is not.

This still does not fully explain the `1510-1550ms` dip. It says what condition
is necessary for the slow plateau in these runs, and it narrows the visible cost
to `keypress` dispatch, but there is still browser/editor phase behavior inside
the key-hold condition.

### Causality Check: Keyup Gap

The paired trace still left two theories entangled:

1. the persistence timer fired while the previous synthetic key was held; and
2. the next synthetic key arrived almost immediately after the previous `keyup`.

I added a diagnostic delay mode, `hold-then-keyup-gap`, which performs one
`keyboard.press( 'x', { delay } )` per character and can add an explicit wait
after `keyup`. This is not a normal score mode. It is a causality probe for the
event ordering.

The useful surprise is that even with no explicit post-keyup gap, separate
manual `keyboard.press()` calls naturally leave about `40ms` between one `keyup`
and the next `keydown`. Normal Playwright `keyboard.type( 'xxxxx', { delay } )`
leaves only about `2.5ms` in the same trace-heavy setup.

![Keyup gap causality](figures/23-keyup-gap-causality.png)

Selected medians from the large-post diagnostic runs:

| Case                                     | Previous keyup to marker | Marker to next keydown | Previous keyup to next keydown | `keypress` p50 |
| ---------------------------------------- | -----------------------: | ---------------------: | -----------------------------: | -------------: |
| Playwright key-hold burst, `1300ms`      |                 `-302ms` |                `304ms` |                        `2.5ms` |       `34.6ms` |
| Manual hold `1300ms`, natural keyup gap  |                 `-302ms` |                `344ms` |                         `41ms` |       `12.8ms` |
| Manual hold `1300ms`, `1000ms` keyup gap |                 `-301ms` |               `1359ms` |                       `1057ms` |       `12.0ms` |
| Manual hold `990ms`, `310ms` keyup gap   |                   `19ms` |                `355ms` |                        `373ms` |       `14.8ms` |
| Complete keypress, then wait `1300ms`    |                  `999ms` |                `372ms` |                       `1373ms` |       `14.1ms` |

This disconfirms the strongest version of the earlier theory. "Persistence fired
while the previous key was held" is not sufficient by itself. Both manual
`1300ms` hold cases have the marker before the previous `keyup`, but neither
reproduces the slow burst once there is even a modest post-keyup gap before the
next key.

It also disconfirms "time from marker to next keydown" as the sole explanation.
The manual `990ms + 310ms` case and complete-keypress `1300ms` case have
marker-to-next-keydown gaps similar to the normal key-hold burst, but they are
not in the same slow distribution. In all five diagnostic cases, the current
`keydown` sees the block editor in the same broad state: persistent and typing.
The discriminating variable in these runs is the previous `keyup` to current
`keydown` gap.

The refined statement is:

-   the normal slow burst needs the persistence marker to fire before the
    previous `keyup`;
-   it also needs the next key to arrive almost immediately after that `keyup`,
    as happens inside one Playwright `keyboard.type()` burst;
-   giving the browser/editor even about `40ms` after `keyup` moves the measured
    keypress back near the complete-keypress-then-wait cases.

![Keyup gap data path](figures/24-keyup-gap-data-path.png)

The cost path is the same as in the broader data-span investigation, only larger
in the normal burst:

| Case                                     | RichText `registry.batch` | Data batch | Resume `core/block-editor` | `useSelect.onChange` |
| ---------------------------------------- | ------------------------: | ---------: | -------------------------: | -------------------: |
| Playwright key-hold burst, `1300ms`      |                  `34.1ms` |   `36.8ms` |                   `25.7ms` |             `13.0ms` |
| Manual hold `1300ms`, natural keyup gap  |                  `16.5ms` |   `17.5ms` |                   `12.6ms` |              `6.8ms` |
| Manual hold `1300ms`, `1000ms` keyup gap |                  `17.8ms` |   `18.9ms` |                   `13.3ms` |              `7.4ms` |
| Manual hold `990ms`, `310ms` keyup gap   |                  `17.2ms` |   `18.4ms` |                   `12.9ms` |              `7.1ms` |
| Complete keypress, then wait `1300ms`    |                  `17.5ms` |   `18.7ms` |                   `12.9ms` |              `7.3ms` |

That confirms the attribution but narrows the cause. The extra latency is still
inside the RichText `registry.batch()` -> `core/block-editor` resume ->
`useSelect` fanout path. What changed is the trigger condition: the large burst
does not follow merely from persistent state, typing state, or a timer firing
while the key is held. It follows from the timer/key-hold condition combined
with an almost immediate next key after `keyup`.

The remaining unproven piece is the lower-level scheduling reason that a `2-3ms`
post-keyup gap is bad while a roughly `30-40ms` gap is enough to lose the slow
path.

### Post-Keyup Gap Follow-Up

I then tested the strongest concrete versions of "the gap lets queued work
drain." I reran the normal Playwright burst and the manual `1300ms` hold with:

-   browser/data event tracing;
-   timer, `requestAnimationFrame`, and `requestIdleCallback` tracing;
-   a raw DevTools-timeline gap extractor that records only trace slices between
    the end of the previous `keyup` dispatch and the next `keydown`;
-   DOM key flags: `repeat` and `isComposing`.

The result mostly disconfirms the "queued JS/rendering drains in the gap"
version of the theory.

| Case                                    | Previous keyup to next keydown | `keypress` p50 | Scheduler callbacks in gap | Data actions in gap | Non-key DevTools gap slices | Repeat/composing keys |
| --------------------------------------- | -----------------------------: | -------------: | -------------------------: | ------------------: | --------------------------: | --------------------: |
| Playwright key-hold burst, `1300ms`     |                        `1.7ms` |       `23.1ms` |                        `0` |                 `0` |               `1`, `0.06ms` |               `0 / 8` |
| Manual hold `1300ms`, natural keyup gap |                       `29.3ms` |       `11.7ms` |                        `0` |                 `0` |               `1`, `0.06ms` |               `0 / 8` |

The single median non-key DevTools slice is a tiny
`Responsiveness.Renderer.UserInteraction` bookkeeping event, not layout, paint,
script execution, a timer callback, a RAF callback, or an idle callback. The
manual-gap run had a few samples with small `TimerFire` / `FunctionCall` slices
in the gap, but the median case did not, and those slices are not present in the
normal burst. They do not explain why the manual-gap run is faster.

The DOM event flags also do not explain the difference. In both modes, retained
samples had:

-   `keydown.repeat === false`, `keypress.repeat === false`, and
    `keyup.repeat === false`;
-   `isComposing === false` on keydown, keypress, beforeinput, and input;
-   the same coarse block-editor state at keydown, keypress, beforeinput, and
    input: `isLastBlockChangePersistent() === true` and `isTyping() === true`.

This narrows the theory again. The visible extra cost still appears in the next
`keypress` / RichText / data fanout path, but it is not explained by observable
work draining during the post-keyup gap.

### Input-Path and Raw-CDP Gap Sweep

The next concrete theories were that either the elapsed post-keyup gap, the DOM
keyboard-event payload, or the Playwright `keyboard.press()` wrapper was
decisive. I tested these by adding raw-CDP input modes and by recording fuller
DOM event signatures:

-   `BENCHMARK_DELAY_MODE=cdp-key-hold`, which bypasses Playwright's high-level
    keyboard helpers and dispatches Chromium `Input.dispatchKeyEvent` calls
    directly.
-   `BENCHMARK_DELAY_MODE=type-one-char-hold`, which calls
    `page.keyboard.type( 'x', { delay: 1300 } )` once per character instead of
    one multi-character `keyboard.type()` call.
-   `BENCHMARK_DELAY_MODE=down-up-key-hold`, which calls
    `page.keyboard.down( 'x' )`, waits `1300ms`, then calls
    `page.keyboard.up( 'x' )` once per character.
-   `BENCHMARK_DELAY_MODE=cdp-key-hold-page-evaluate`, which uses raw CDP key
    events but runs a no-op `page.evaluate()` between characters.
-   `BENCHMARK_DELAY_MODE=cdp-key-hold-runtime-evaluate`, which uses raw CDP key
    events but runs a no-op `Runtime.evaluate` through the same CDP session
    between characters.

![Input path post-keyup gap check](figures/25-input-path-post-keyup-gap.png)

This disconfirms the simple versions of the gap, wrapper, and event-payload
theories. With 20 retained samples in the main comparison cases:

| Input path                                    | Retained samples | Requested post-keyup gap | Observed post-keyup gap p50 | `keypress` p50 |
| --------------------------------------------- | ---------------: | -----------------------: | --------------------------: | -------------: |
| Playwright `keyboard.type( 'x'.repeat( n ) )` |             `20` |                    `0ms` |                     `2.2ms` |       `23.6ms` |
| Playwright `keyboard.press( 'x' )` per key    |             `20` |                    `0ms` |                    `31.7ms` |       `16.1ms` |
| Playwright `keyboard.type( 'x' )` per key     |             `20` |                    `0ms` |                    `30.2ms` |       `11.3ms` |
| Playwright `keyboard.down/up( 'x' )` per key  |             `20` |                    `0ms` |                    `16.3ms` |       `10.8ms` |
| Raw CDP `Input.dispatchKeyEvent`              |             `20` |                    `0ms` |                     `3.9ms` |       `21.4ms` |
| Raw CDP `Input.dispatchKeyEvent`              |             `20` |                   `16ms` |                    `21.6ms` |       `23.1ms` |
| Raw CDP `Input.dispatchKeyEvent`              |             `20` |                 `1000ms` |                  `1007.8ms` |       `23.9ms` |
| Raw CDP plus `page.evaluate()`                |             `20` |                    `0ms` |                    `29.2ms` |       `11.1ms` |
| Raw CDP plus CDP `Runtime.evaluate`           |             `20` |                    `0ms` |                     `6.2ms` |       `18.8ms` |

The raw-CDP `keyUp` payload initially differed slightly from Playwright's
Chromium keyboard path. I checked the Playwright protocol log and then changed
the raw-CDP helper so `keyDown` carries `text`, `unmodifiedText`, `commands`,
`autoRepeat`, and `isKeypad`, while `keyUp` carries only the fields Playwright
sends for keyup. Raw CDP remained slow after that change, so the CDP packet shape
is not the explanation.

The browser events also match at the DOM level. In the fresh slow and fast runs,
the full event signatures were identical for `keydown`, `keypress`,
`beforeinput`, `input`, and `keyup`: trusted events, the same key/code/location,
the same keyCode/charCode/which values, no modifiers, no repeat, no composition,
and the same cancelable/default-prevented flags. The coarse editor state was
also the same at the key events: `isLastBlockChangePersistent() === true` and
`isTyping() === true`.

The matched-gap comparisons disconfirm elapsed post-keyup time as the primary
cause. Playwright `down/up` is fast at an observed `16.3ms` gap, while raw CDP
is slow at an observed `21.6ms` gap. Raw CDP is still slow after a `1007.8ms`
gap, so merely waiting longer after `keyup` does not produce the fast path.

The no-op evaluation probes add one more boundary:

-   Raw CDP plus `page.evaluate( () => undefined )` between keys becomes as fast
    as the per-key Playwright paths.
-   Raw CDP plus direct CDP `Runtime.evaluate` through the same session improves
    partway, but does not fully reach the `page.evaluate()` / Playwright
    per-key-call path.

That refines the previous "per-character Playwright action boundary" theory.
The boundary is real, but it is not specific to `keyboard.press()` and not
explained by a different DOM event sequence. A page-evaluation/action boundary
between raw CDP keys is also sufficient to flip the next Gutenberg input to the
fast distribution. A bare runtime evaluation on the same CDP session only
partially reproduces it.

The current model is therefore:

1. The slow path does not require the multi-character Playwright
   `keyboard.type()` helper. Raw CDP long-held key events reproduce most of it.
2. The fast path does not require the `keyboard.press()` wrapper specifically.
   One-character `keyboard.type()` calls, explicit `keyboard.down()` /
   `keyboard.up()` calls, and raw CDP plus `page.evaluate()` are all faster.
3. The fast path is not caused by the elapsed post-keyup gap, by DOM event
   payload differences, by key repeat/composition state, or by the exact CDP
   keyup packet shape.
4. The remaining boundary is below the ordinary JS scheduler/data-action traces:
   crossing a Playwright/page-evaluation boundary between keys appears to force a
   renderer or editor checkpoint that changes the next RichText/data fanout path.

That means the safe benchmark fix is unchanged: do not use a synthetic key-hold
delay as a proxy for typing pauses. Use a complete keypress and then wait, or
replay recorded human typing. For root cause, the next useful probe is below the
DOM event layer: compare the browser/renderer work and execution contexts used
by `page.evaluate()`, Playwright per-key actions, direct CDP `Runtime.evaluate`,
and raw `Input.dispatchKeyEvent`.

### Native Contenteditable Baseline

The key-state traces show conditions that separate slow and fast Gutenberg
traces, but they do not prove that the condition is a browser/Playwright effect
by itself. To test that, the benchmark now has `native-contenteditable-timer`: a
plain `contenteditable` node with an input listener that clears and reschedules a
`1000ms` timer. The timer records the same kind of marker, but it does not touch
Gutenberg, React, `@wordpress/data`, rich text, undo persistence, block
selection, or the iframe editor.

![Native contenteditable comparison](figures/14-native-contenteditable-comparison.png)

The native baseline does not reproduce the Gutenberg key-hold plateau:

| Scenario                 | Mode             |    Delay | Latency p50 | `keypress` p50 |
| ------------------------ | ---------------- | -------: | ----------: | -------------: |
| Gutenberg                | key held         | `1200ms` |    `17.4ms` |       `16.4ms` |
| Gutenberg                | wait after keyup | `1200ms` |    `11.1ms` |       `10.9ms` |
| Native `contenteditable` | key held         | `1200ms` |     `1.2ms` |        `1.0ms` |
| Native `contenteditable` | wait after keyup | `1200ms` |     `0.8ms` |        `0.7ms` |
| Gutenberg                | key held         | `2000ms` |    `16.9ms` |       `15.8ms` |
| Gutenberg                | wait after keyup | `2000ms` |    `10.6ms` |       `10.3ms` |
| Native `contenteditable` | key held         | `2000ms` |     `1.1ms` |        `0.9ms` |
| Native `contenteditable` | wait after keyup | `2000ms` |     `1.0ms` |        `0.9ms` |

The native timing data still has the marker before `keyup` in key-hold mode. For
example, at `1200ms`, the marker fired about `201ms` before the previous `keyup`;
at `2000ms`, it fired about `1001ms` before the previous `keyup`. Even so,
`keypress` dispatch stayed around `1ms`.

That rules out a pure Chromium/Playwright explanation for the Gutenberg plateau.
The current best model is:

1. Playwright's delay creates an unrealistic long-held key.
2. Gutenberg's rich-text persistence timer fires while that key is still held.
3. The next synthetic keypress then runs a slower Gutenberg editor path, visible
   mostly as `keypress` `EventDispatch` duration.

This is narrower than the previous conclusion. The timer/key-hold timing is a
necessary diagnostic signal in the Gutenberg traces, but not sufficient without
Gutenberg's editor stack.

### Listener Trace: RichText Input

The next pass patched `EventTarget.prototype.addEventListener` before the editor
loaded and injected the same tracer into the editor canvas iframe. This is
diagnostic instrumentation, not a score run: wrapping listeners adds overhead and
the listener durations do not need to sum exactly to Chromium's `EventDispatch`
trace duration. It is still useful because it localizes where the measured
JavaScript callback time is going.

![RichText listener duration](figures/15-rich-text-listener-duration.png)

In the targeted listener trace, the dominant measured callback was an
editor-canvas `input` listener registered from `build/scripts/rich-text/`. Parent
frame keydown listeners, React delegation wrappers, keyboard-shortcut listeners,
and `block-editor` input listeners were small by comparison.

Selected values:

| Mode             |    Delay | Latency p50 | RichText input median | RichText input p90 |
| ---------------- | -------: | ----------: | --------------------: | -----------------: |
| key held         | `1200ms` |    `17.5ms` |               `4.1ms` |           `10.0ms` |
| wait after keyup | `1200ms` |    `11.0ms` |               `3.4ms` |            `7.0ms` |
| key held         | `1300ms` |    `18.7ms` |               `4.1ms` |           `10.5ms` |
| wait after keyup | `1300ms` |    `11.4ms` |               `3.5ms` |            `7.2ms` |
| key held         | `1550ms` |    `12.6ms` |               `3.7ms` |            `7.7ms` |
| wait after keyup | `1550ms` |    `10.5ms` |               `3.1ms` |            `6.5ms` |

This explains why the browser trace reports the cost as `keypress`
`EventDispatch` even though the largest explicit listener callback is on `input`:
for text entry, the key event causes the input path, and Chromium's dispatch
slice covers that induced work. The listener trace also sharpens the open
question about the `1510-1550ms` dip. The dip is visible inside the same
RichText-input path, not in parent-frame keyboard shortcuts or generic React
delegation.

Source-map lookup of the hot registration stack maps
`build/scripts/rich-text/index.min.js:4:19679` to
`packages/rich-text/src/hook/event-listeners/input-and-selection.js:255`, the
`element.addEventListener( 'input', onInput )` registration. That `onInput`
callback calls:

-   `createRecord()` in `packages/rich-text/src/hook/index.js`, which reads the
    selection/range and parses the editable DOM through
    `packages/rich-text/src/create.js`;
-   `updateFormats()` in `packages/rich-text/src/update-formats.js`;
-   `handleChange()` in `packages/rich-text/src/hook/index.js`, which applies the
    record, serializes it, batches `onSelectionChange` and `onChange`, then forces
    a render.

The listener wrapper measures the whole callback, so it does not prove which
sub-step dominates. It does rule out the parent frame, keyboard shortcuts, and
generic React delegation as the main visible callback cost.

![RichText listener scenario control](figures/16-rich-text-listener-scenario-control.png)

I also ran an empty-post listener trace at `1200ms`, `1300ms`, `1550ms`, and
`2000ms`. The same RichText input listener remains visible, but it is cheaper
than in the large-post fixture. That means the active RichText input path has a
baseline cost, while the larger editor/post state makes the path substantially
more expensive.

Selected values from the listener traces:

| Scenario   | Mode             |    Delay | Latency p50 | RichText input median | RichText input p90 |
| ---------- | ---------------- | -------: | ----------: | --------------------: | -----------------: |
| large post | key held         | `1200ms` |    `17.5ms` |               `4.1ms` |           `10.0ms` |
| empty post | key held         | `1200ms` |    `11.8ms` |               `2.2ms` |            `5.6ms` |
| large post | wait after keyup | `1200ms` |    `11.0ms` |               `3.4ms` |            `7.0ms` |
| empty post | wait after keyup | `1200ms` |     `7.1ms` |               `1.5ms` |            `3.2ms` |
| large post | key held         | `2000ms` |    `15.2ms` |               `3.7ms` |            `8.3ms` |
| empty post | key held         | `2000ms` |     `9.6ms` |               `1.6ms` |            `5.4ms` |

The data-action trace from the same runs is consistent with this. Ordinary input
actions such as `selectionChange` and `updateBlockAttributes` have sub-millisecond
median dispatch times in these traces. The heavier
`__unstableMarkLastChangeAsPersistent` action is a timer-side event, and its
median is much larger in the large-post listener run (`~12ms`) than in the
empty-post control (`~3ms`).

### Source-Level RichText Spans

The listener trace still treated `onInput` as one callback. I added opt-in
benchmark spans inside `@wordpress/rich-text` and reran targeted traces for the
large-post and empty-post scenarios, in both key-held and wait-after-keyup modes.
These runs used the same delay set: `990ms`, `1000ms`, `1200ms`, `1300ms`,
`1550ms`, and `2000ms`.

![RichText source span breakdown](figures/17-rich-text-source-span-breakdown.png)

The split is sharp: `createRecord()`, `updateFormats()`, `applyRecord()`,
serialization, and `forceRender()` are all small at this timer resolution. The
dominant span is `registry.batch()` inside `handleChange()`.

Selected medians:

| Scenario   | Mode             |    Delay | `onInput` | `registry.batch` | Create DOM record | Apply record | Serialize |
| ---------- | ---------------- | -------: | --------: | ---------------: | ----------------: | -----------: | --------: |
| large post | key held         |  `990ms` |  `10.9ms` |         `10.5ms` |           `0.0ms` |      `0.1ms` |   `0.0ms` |
| large post | key held         | `1000ms` |   `6.6ms` |          `6.5ms` |           `0.0ms` |      `0.1ms` |   `0.0ms` |
| large post | key held         | `1300ms` |  `10.2ms` |          `9.6ms` |           `0.1ms` |      `0.2ms` |   `0.0ms` |
| large post | wait after keyup | `1300ms` |   `7.1ms` |          `7.1ms` |           `0.0ms` |      `0.0ms` |   `0.0ms` |
| empty post | key held         | `1300ms` |   `5.6ms` |          `5.3ms` |           `0.1ms` |      `0.1ms` |   `0.0ms` |
| empty post | wait after keyup | `1300ms` |   `2.8ms` |          `2.7ms` |           `0.0ms` |      `0.1ms` |   `0.0ms` |

That changes the next hypothesis. The expensive part is not DOM-to-RichText
record creation or HTML serialization. It is synchronous work hidden behind
`registry.batch()` after RichText calls into the block editor.

I then split the batch itself into direct `onSelectionChange`, direct `onChange`,
and the remaining time.

![RichText registry batch breakdown](figures/18-rich-text-registry-batch-breakdown.png)

The direct callbacks are small. The large-post key-held `1300ms` case had median
`registry.batch()` time of `9.6ms`, but direct `onSelectionChange` was `0.5ms`
and direct `onChange` was `1.2ms`. The remaining `~7.9ms` is synchronous work
around the batch, most likely data-store notification/subscriber/render work
triggered when the batch completes. This is an inference from the span nesting,
not yet a direct subscriber-level attribution.

Selected batch split:

| Scenario   | Mode             |    Delay | `registry.batch` | Direct selection | Direct change | Batch remainder |
| ---------- | ---------------- | -------: | ---------------: | ---------------: | ------------: | --------------: |
| large post | key held         |  `990ms` |         `10.5ms` |          `0.5ms` |       `1.4ms` |         `8.5ms` |
| large post | key held         | `1000ms` |          `6.5ms` |          `0.2ms` |       `0.5ms` |         `5.8ms` |
| large post | key held         | `1300ms` |          `9.6ms` |          `0.5ms` |       `1.2ms` |         `7.9ms` |
| large post | wait after keyup | `1300ms` |          `7.1ms` |          `0.3ms` |       `0.4ms` |         `6.3ms` |
| empty post | key held         | `1300ms` |          `5.3ms` |          `0.2ms` |       `0.1ms` |         `5.0ms` |
| empty post | wait after keyup | `1300ms` |          `2.7ms` |          `0.1ms` |       `0.1ms` |         `2.5ms` |

This also explains why the large-post fixture matters. The same path exists in
the empty post, but the post/editor state makes the synchronous batch remainder
larger. The key-held mode makes it larger again, especially outside the `1000ms`
fast band.

### Data Registry And useSelect Spans

The RichText spans still could not say what happened inside `registry.batch()`.
I added opt-in source spans in `@wordpress/data` around registry batching,
emitter resume/notification, Redux-store subscriber loops, and `useSelect`
subscriber callbacks. To keep the diagnostic data tractable, the default data
span mode records only spans nested under an input-matched `registry.batch()`.

The four data-span runs used the same six delays as the RichText runs:
`990ms`, `1000ms`, `1200ms`, `1300ms`, `1550ms`, and `2000ms`, with large-post
and empty-post fixtures in key-held and wait-after-keyup modes.

![Data batch useSelect breakdown](figures/19-data-batch-use-select-breakdown.png)

The next split is also sharp. For the large-post fixture, most of the batch time
is `core/block-editor` store-emitter resume. Inside that, the largest measured
piece is store-subscriber fanout, especially `useSelect` subscription callbacks.
`useSelect` then spends a material fraction of that time recomputing selector
results (`mapSelect`) before React's external-store listener returns.

Selected input-matched medians:

| Scenario   | Mode             |    Delay | Data batch | Callback | Resume `core/block-editor` | Block-editor subscribers | `useSelect` onChange | `mapSelect` |
| ---------- | ---------------- | -------: | ---------: | -------: | -------------------------: | -----------------------: | -------------------: | ----------: |
| large post | key held         |  `990ms` |   `23.4ms` |  `6.5ms` |                   `15.4ms` |                 `12.7ms` |              `7.8ms` |     `3.6ms` |
| large post | key held         | `1000ms` |   `14.2ms` |  `3.5ms` |                   `10.0ms` |                  `8.5ms` |              `5.8ms` |     `2.8ms` |
| large post | key held         | `1300ms` |   `23.7ms` |  `6.7ms` |                   `15.5ms` |                 `12.7ms` |              `7.9ms` |     `3.2ms` |
| large post | wait after keyup | `1300ms` |   `15.3ms` |  `3.7ms` |                   `10.9ms` |                  `8.8ms` |              `5.8ms` |     `2.6ms` |
| empty post | key held         | `1300ms` |    `8.1ms` |  `0.7ms` |                    `5.0ms` |                  `4.5ms` |              `4.1ms` |     `3.3ms` |
| empty post | wait after keyup | `1300ms` |    `5.1ms` |  `0.5ms` |                    `3.1ms` |                  `2.8ms` |              `2.2ms` |     `1.6ms` |

These spans are nested, so the columns should not be added together. For example,
`core/block-editor` subscribers are inside `core/block-editor` resume, and
`useSelect` work is inside the subscriber fanout.

![Data store resume breakdown](figures/20-data-store-resume-breakdown.png)

The store-resume plot shows why the earlier "data-store notification" inference
was too broad. The expensive store is not an even spread across the registry:
`core/block-editor` is the dominant resume in the input-matched batches. Other
stores are small in this workload.

### useSelect Owner Attribution

The previous data-span pass stopped at "subscriber fanout." I added one more
diagnostic layer: when data-span tracing is active, each `useSelect` hook instance
gets a stable ID, and the benchmark records the hook's call stack and
`mapSelect` source once. A compact extractor then joins those IDs back to the hot
`useSelect` spans and source-map-resolves the first non-`@wordpress/data`,
non-React frame.

This trace is intentionally small: large-post fixture only, key-held and
wait-after-keyup modes, delays `990ms`, `1000ms`, `1300ms`, `1550ms`, and
`2000ms`, one round, and four retained samples per delay. The raw JSON is large
because it carries per-subscriber span events; the committed CSV is the compact
derived form.

![useSelect owner fanout](figures/21-use-select-owner-fanout-1300.png)

At `1300ms`, the dominant `useSelect` owner group is
`packages/block-editor/src/components/block-list/index.js:196`. In this large
fixture it had `580` active hook instances and `2900` `onChange` span events in
one delay run. That single source-mapped group accounts for about `2.7ms` of
traced `useSelect.onChange` time per key in the key-held trace and `2.3ms` per
key in the wait-after-keyup trace.

The next high-fanout groups are also block-tree/editor-wide subscriptions, not a
single isolated callback:

| Source                                                           | Instances | Events | Key-held `onChange` ms/key | Wait-after-keyup `onChange` ms/key |
| ---------------------------------------------------------------- | --------: | -----: | -------------------------: | ---------------------------------: |
| `packages/block-editor/src/components/block-list/index.js:196`   |     `580` | `2900` |                     `2.68` |                             `2.30` |
| `packages/block-editor/src/components/block-list/block.js:563`   |    `1437` | `7185` |                     `1.22` |                             `1.00` |
| `packages/editor/src/hooks/pattern-overrides.js:40`              |    `1437` | `7185` |                     `0.74` |                             `0.98` |
| `packages/block-editor/src/components/inner-blocks/index.js:195` |     `580` | `2900` |                     `0.40` |                             `0.24` |

The same ranking appears if we look specifically at `mapSelect` time, though
the per-instance medians are mostly below the timer resolution. The meaningful
signal is aggregate fanout: many cheap selectors running thousands of times per
delay run. At `1300ms`, the `block-list/index.js:196` group alone contributed
about `1.4ms` of traced `mapSelect` time per key in key-held mode and `1.2ms`
per key in wait-after-keyup mode.

![useSelect owner delay profile](figures/22-use-select-owner-delay-profile.png)

This does not overturn the earlier key-hold conclusion. The owner trace does not
find one selector that appears only in the slow key-held plateau. Instead, the
same high-fanout owners dominate both modes and all diagnostic delays. Key-held
mode is usually somewhat higher for the top block-list owners, but the delta is
spread across many subscriber callbacks. The mechanism is better described as
"large block editor subscriber fanout on the input path" than as "one bad
selector."

The remaining open question moved one level lower again: which of these
block-list subscriptions are necessary on every typed character, and which can be
made less sensitive to ordinary RichText text updates.

## Scenario Sensitivity

![Scenario boundary checks](figures/08-scenario-boundary-checks.png)

The boundary appears in multiple scenarios, but absolute latency changes with
post size and fixture shape. The large mixed post is slower than an empty post
near the boundary. A synthetic thousand-paragraph post does not reproduce all of
the large mixed fixture's cost, which suggests that block type mix and editor
state matter, not just block count.

Selected p50s:

| Scenario                 |    Delay |        p50 |
| ------------------------ | -------: | ---------: |
| large post, fresh editor |  `990ms` | `19.441ms` |
| large post, fresh editor | `1000ms` |  `7.710ms` |
| empty post               |  `990ms` | `11.761ms` |
| empty post               | `1010ms` |  `7.012ms` |
| thousand paragraphs      |  `990ms` | `13.798ms` |
| thousand paragraphs      | `1010ms` |  `5.551ms` |

## Trace Grouping Bug Avoided

![Keydown event count audit](figures/09-keydown-event-count-audit.png)

In the Gutenberg editor traces in this local Chromium environment, every retained
sample had two `keydown` `EventDispatch` entries. Across 7640 retained Gutenberg
samples in the committed derived data, zero had a `keydown` count other than two.
The native `contenteditable` baseline had one `keydown` per retained sample.

That means any parser that assumes exactly one `keydown` trace event per typed
character is fragile. This benchmark groups trace events into key sequences and
uses the final keydown event for `latency_ms`, while also preserving
`latency_all_keydowns_ms`.

## Issues In The Original Benchmark

The original exploration was valuable because it found the weird `1000ms` point,
but it should not be used as a tuning basis without caveats.

Problems:

-   **Sparse delay grid.** The important features are narrower than the original
    `100ms` spacing.
-   **Too few samples.** Ten retained samples per delay is not enough to estimate
    variance or detect mixed distributions.
-   **Averages hide structure.** p50/p10/p90 and raw distributions show regime
    changes that averages flatten.
-   **No time-order analysis.** Without per-sample order, warmup, drift, GC,
    scheduled work, and long-session degradation are mostly invisible.
-   **One scalar conflates workloads.** Continuous typing, idle-then-key latency,
    and persistent-undo-path latency are different workloads.
-   **Delay changes editor semantics.** At `1000ms`, the rich-text persistence
    timer fires between keys, so the benchmark changes the state path it measures.
-   **Playwright's delay is a key-hold delay.** For US-keyboard characters, the
    delay is applied between `keydown` and `keyup`, so large values do not model a
    user pausing between completed keystrokes.
-   **`1000ms` was selected because it looked stable.** It is stable partly because
    it enters a special path. That makes it a poor representative of normal typing.
-   **Long delays are unrealistic as typing.** A one-second or two-second gap may be
    a useful idle-input latency test, but it should not be called typing throughput.

## Issues In The New Benchmark

The new benchmark fixes several measurement problems, but it is not a final CI
metric.

Known problems:

-   **It still measures trace-event handler duration, not input-to-paint.** The
    user-visible latency question needs a DOM/layout/paint or screen-observation
    endpoint.
-   **Synthetic keyboard input is not real keyboard input.** Playwright's
    `page.keyboard.type()` is useful, but it is not a hardware-to-screen pipeline.
-   **There are now multiple delay modes.** This is useful for diagnosis, but any
    CI metric has to choose one deliberately and name it according to what it
    actually measures.
-   **The local machine is uncontrolled.** CPU governor, thermal state, background
    processes, browser version, and OS scheduling were not isolated in a Krun-like
    environment.
-   **Dense long-delay scans are expensive.** The `1110..2000ms` dense extension
    used one round, so it is a shape-finding run, not a high-confidence estimate.
-   **Instrumentation perturbs behavior.** Action tracing and timer rewriting add
    overhead; they should be used to explain behavior, not to report benchmark
    scores.
-   **Listener tracing perturbs behavior even more.** It monkey-patches
    `addEventListener`, so use it only to localize costs, not to report latency
    scores.
-   **Source-level RichText span tracing also perturbs behavior.** It adds timing
    calls inside hot input code and requires rebuilding the package scripts. It is
    diagnostic attribution, not a benchmark score.
-   **Source-level data span tracing is heavier still.** Even after filtering to
    input-matched batch spans, it instruments hot emitter and `useSelect` paths.
    Treat it as attribution, not latency scoring.
-   **`useSelect` owner attribution is heavier again.** It records source stacks
    once per hook instance and joins hundreds of thousands of subscriber-span
    events. It is useful for ranking owners, not for reporting latency scores.
-   **The paired trace is diagnostic, not a score run.** It uses only 8 retained
    samples per delay and heavy instrumentation. Its value is in comparing modes
    under similar tracing overhead.
-   **The keyup-gap causality traces are also diagnostic.** The manual
    `hold-then-keyup-gap` mode uses separate Playwright `keyboard.press()` calls,
    which naturally add about `40ms` between `keyup` and the next `keydown` even
    when no explicit gap is requested. That is useful for causality, but it is not
    a replacement score mode.
-   **The raw-CDP input-path traces are diagnostic.** They bypass Playwright's
    public keyboard API and then add artificial page/runtime evaluation
    boundaries. They are useful for falsifying gap and event-payload theories,
    not for defining a user-facing benchmark.
-   **The native baseline is intentionally too small.** It is useful as a browser
    and Playwright control, not as a model of real editor work.
-   **Single browser.** These results are from Chromium. They do not prove that
    Safari or Firefox will have the same timer/event behavior.
-   **Single local setup.** More process executions and fresh browser contexts are
    needed before treating absolute numbers as portable.
-   **No real typing distribution.** Real users type with bursts, corrections,
    pauses, navigation, composition, and selection changes. Fixed-delay `x`
    insertion is an artificial stressor.
-   **No plugin/theme cofactor coverage.** The issue discussion mentioned lag that
    appeared outside vanilla Core. This benchmark does not cover plugin-heavy or
    P2-like editor setups.

## Audit Lenses

These are not endorsements or actual reviews by these people. They are different
failure-oriented ways to read the data.

### Linus Torvalds-style audit

-   Do not name the metric "typing performance" if it types one character every
    `1000ms` or `2000ms`.
-   Do not tune CI around a magic constant that is also a code path boundary.
-   Assert invariants in the benchmark. The duplicate-keydown finding is exactly
    the kind of trace-parser assumption that should fail loudly.
-   Keep the benchmark small enough to understand. A single scalar from a
    complicated browser/editor trace is not self-explanatory.
-   Separate product behavior from measurement behavior. `1000ms` is not just a
    wait; it causes `MARK_LAST_CHANGE_AS_PERSISTENT`.

### Kyle Kingsbury-style audit

-   Preserve histories. The derived CSVs keep per-sample order, delay, round,
    editor setup, and state transitions.
-   Prefer distributions over means. The benchmark has partitions: `990ms` and
    `1000ms` are different histories, not nearby samples from one population.
-   Do interventions when possible. Rewriting the `1000ms` timer to `500ms` is a
    causal test, and the cliff moved with it.
-   Randomize and repeat. Mixed order and fresh-editor checks are necessary because
    deterministic order can alias with periodic work.
-   State the model being tested. This test is not a linear latency function of
    delay; it is a state machine plus browser scheduling plus editor work.

### Dan Luu-style audit

-   The strange data point is the result, not noise. The `1000ms` dip identified a
    real editor timer.
-   Look at time. The time-order plot does not support a simple warmup story, but
    the runs are still too short to clear long-session concerns.
-   Make the benchmark adversarial. Try alternate delays, longer wall-clock runs,
    fresh editors, randomized order, and timer interventions.
-   Measure the thing users see. Trace-event latency is useful for diagnosis, but
    input-to-paint or high-speed-camera calibration would answer a different and
    more user-facing question.
-   Do not assume representativeness. Vanilla Core, a large fixture, a synthetic
    thousand-paragraph post, and plugin-heavy editors can all expose different
    behavior.

## Recommendations

For CI:

-   Keep separate metrics for continuous typing and idle-input latency.
-   Rename the long-wait metric to something like `inputLatencyAfterIdle`, not
    "typing".
-   Do not choose `1000ms` as a generic stable delay. It crosses the rich-text
    persistence boundary.
-   Do not use `keyboard.type(..., { delay: 1000 })` or `2000` to mean "wait
    after typing a character." It holds the key down. Use an explicit wait after a
    complete keypress if that is the intended workload.
-   If the goal is "after rich text has persisted", wait on
    `isLastBlockChangePersistent()` explicitly and name the metric that way.
-   Store per-sample results and at least p50/p90/CV, not only averages.
-   Keep trace-parser invariants: expected key groups, keydown count distribution,
    and event ordering.

For investigation:

-   Run wall-clock-equalized benchmarks, e.g. 60 seconds per delay, instead of a
    fixed number of samples per delay.
-   Run fresh browser contexts and fresh posts for each delay when comparing delay
    values.
-   Split the RichText `onInput` callback into source-level timing spans for
    `createRecord`, `applyRecord`, serialization, data dispatch, and render.
-   Extend the `useSelect` owner traces from source-mapped hook callbacks to
    React render ownership, so the components woken by the `core/block-editor`
    fanout are identifiable.
-   For the block-list owner groups identified here, separate necessary
    text-input invalidations from broad block-tree invalidations.
-   Keep instrumenting around the post-keyup interval, but focus below ordinary
    JS callbacks. Timer, RAF, idle, data-action, key-flag, and DevTools timeline
    checks did not explain why a roughly `30-40ms` gap changes the next input
    path.
-   Compare the browser/renderer boundary crossed by Playwright per-key actions
    and `page.evaluate()` against direct `Input.dispatchKeyEvent`. Raw CDP stays
    slow even with long post-keyup gaps and DOM-equivalent events, while raw CDP
    plus `page.evaluate()` is fast. The remaining difference is below the DOM
    event sequence and ordinary JS callback traces.
-   Replay recorded human typing sessions, including pauses, selection, deletion,
    undo, and block insertion.
-   Add a textarea/native baseline to estimate browser/editor overhead.
-   Add input-to-paint instrumentation, or calibrate with high-speed camera data
    for bench runs.
-   Repeat on Safari and Firefox.
-   Repeat with plugin-heavy editor setups if long-session lag is suspected there.

## Reproduction Notes

The key runs used in this report were:

-   `full_0_1100`: dense `0..1100ms`, `10ms` step, 3 rounds, 10 retained samples
    per delay.
-   `targeted_randomized`: targeted randomized confirmation around suspicious
    ranges.
-   `fresh_boundary`: fresh editor per delay around `980..1020ms`.
-   `state_actions`: action/browser tracing around the persistence boundary.
-   `state_wait`: explicit wait for `isLastBlockChangePersistent()`.
-   `empty_boundary`: empty-post scenario around the boundary.
-   `thousand_boundary`: synthetic 1000-paragraph scenario around the boundary.
-   `dense_1110_2000`: dense extension to `2000ms`.
-   `landmarks_0_2000`: repeated landmark run through `2000ms`.
-   `cliff_actions`: action trace from `970ms` through `1300ms`.
-   `timeout_230_rewrite`: timer intervention rewriting `1000ms` timers to
    `230ms`, with dense `220..430ms` transition coverage.
-   `timeout_500_rewrite`: timer intervention rewriting `1000ms` timers to
    `500ms`.
-   `timeout_710_rewrite`: timer intervention rewriting `1000ms` timers to
    `710ms`.
-   `after_persistence_scan`: wait for persistence, then wait `0..400ms`.
-   `keyhold_schedulers`: normal Playwright key-hold delay with scheduler/action
    tracing.
-   `between_keys`: complete keypress, then wait through `2000ms`.
-   `between_keys_0_1100_dense`: complete keypress, then wait `0..1100ms` with a
    `10ms` step.
-   `between_keys_1110_2000_dense`: complete keypress, then wait `1110..2000ms`
    with a `10ms` step.
-   `container_keyhold_0_2000_dense`: typing inside the Columns container
    fixture, normal Playwright key-hold delay, `0..2000ms` with a `10ms` step.
-   `container_between_keys_0_2000_dense`: typing inside the Columns container
    fixture, complete keypress then wait, `0..2000ms` with a `10ms` step.
-   `firefox_boundary_listeners`: Firefox listener-timing check around
    `1000ms`, with ascending and descending orderings.
-   `firefox_1000_narrow_listeners`: Firefox listener-timing check at
    `995ms`, `1000ms`, `1005ms`, and `1010ms`.
-   `webkit_boundary_listeners`: Playwright WebKit/Safari-profile
    listener-timing check around `1000ms`, with ascending and descending
    orderings.
-   `webkit_1000_narrow_listeners`: Playwright WebKit/Safari-profile
    listener-timing check at `995ms`, `1000ms`, `1005ms`, and `1010ms`.
-   `mode_trace_keyhold`: paired trace for normal Playwright key-hold delay.
-   `mode_trace_between_keys`: paired trace for complete keypress, then wait.
-   `native_keyhold_timer`: native `contenteditable` with a `1000ms` input timer
    and normal Playwright key-hold delay.
-   `native_between_keys_timer`: native `contenteditable` with a `1000ms` input
    timer and delay after a complete keypress.
-   `listener_keyhold`: Gutenberg key-hold trace with event-listener timing.
-   `listener_between_keys`: Gutenberg complete-keypress-then-wait trace with
    event-listener timing.
-   `listener_empty_keyhold`: empty-post key-hold trace with event-listener
    timing.
-   `listener_empty_between_keys`: empty-post complete-keypress-then-wait trace
    with event-listener timing.
-   `rich_text_spans_large_keyhold`: large-post key-hold trace with source-level
    RichText spans.
-   `rich_text_spans_large_between_keys`: large-post complete-keypress-then-wait
    trace with source-level RichText spans.
-   `rich_text_spans_empty_keyhold`: empty-post key-hold trace with source-level
    RichText spans.
-   `rich_text_spans_empty_between_keys`: empty-post complete-keypress-then-wait
    trace with source-level RichText spans.
-   `data_spans_large_keyhold`: large-post key-hold trace with source-level data
    registry and `useSelect` spans.
-   `data_spans_large_between_keys`: large-post complete-keypress-then-wait trace
    with source-level data registry and `useSelect` spans.
-   `data_spans_empty_keyhold`: empty-post key-hold trace with source-level data
    registry and `useSelect` spans.
-   `data_spans_empty_between_keys`: empty-post complete-keypress-then-wait trace
    with source-level data registry and `useSelect` spans.
-   `use_select_owners_large_keyhold`: large-post key-hold trace with
    `useSelect` owner metadata.
-   `use_select_owners_large_between_keys`: large-post complete-keypress-then-wait
    trace with `useSelect` owner metadata.
-   `causality_keyboard_1300`: large-post normal Playwright key-hold burst at
    `1300ms`, with timeline and span traces.
-   `causality_between_1300`: large-post complete-keypress-then-wait at
    `1300ms`, with timeline and span traces.
-   `causality_hold_1300_gap_0`: large-post manual hold for `1300ms`, with no
    explicit post-keyup gap.
-   `causality_hold_990_gap_310`: large-post manual hold for `990ms`, then
    `310ms` after keyup.
-   `causality_hold_1300_gap_1000`: large-post manual hold for `1300ms`, then
    `1000ms` after keyup.
-   `post_keyup_keyboard_1300`: normal Playwright key-hold burst at `1300ms`,
    with scheduler, raw-gap, and DOM key-flag follow-up traces.
-   `post_keyup_hold_1300_gap_0`: manual hold for `1300ms`, with no explicit
    post-keyup gap, with scheduler, raw-gap, and DOM key-flag follow-up traces.
-   `current_keyboard_1300`: same-session normal Playwright key-hold burst at
    `1300ms`, with raw-gap and DOM key-flag traces.
-   `current_hold_press_1300_gap_0`: same-session Playwright
    `keyboard.press()` key hold at `1300ms`, with raw-gap and DOM key-flag
    traces.
-   `current_type_one_char_1300`: same-session Playwright
    `keyboard.type( 'x' )` per character, with raw-gap and DOM key-flag traces.
-   `current_down_up_1300`: same-session Playwright `keyboard.down()` /
    `keyboard.up()` per character, with raw-gap and DOM key-flag traces.
-   `cdp_gap_0`, `cdp_gap_5`, `cdp_gap_10`, `cdp_gap_16`, `cdp_gap_33`,
    `cdp_gap_100`, `cdp_gap_310`, `cdp_gap_1000`: direct
    `Input.dispatchKeyEvent` key-hold traces at `1300ms` with controlled
    post-keyup gaps.
-   `cdp_page_evaluate_gap_0`: direct `Input.dispatchKeyEvent` key-hold trace at
    `1300ms` with a no-op Playwright `page.evaluate()` between characters.
-   `cdp_runtime_evaluate_gap_0`: direct `Input.dispatchKeyEvent` key-hold trace
    at `1300ms` with a no-op CDP `Runtime.evaluate` between characters.

The local environment used `nvm` default Node `v20.20.2`.

The source-level RichText and data span runs require rebuilding the browser
scripts after the probe changes:

```sh
npm run build -- --skip-types
```

The compact `useSelect` owner CSV was extracted from the raw owner-trace JSON
with:

```sh
node test/performance/scripts/extract-typing-delay-use-select-owners.js
```

The compact keyup-gap causality CSVs were extracted with:

```sh
node test/performance/scripts/extract-typing-delay-causality.js
```

The compact post-keyup follow-up CSVs were extracted with:

```sh
node test/performance/scripts/extract-typing-delay-post-keyup-gap.js
```

The compact input-path CSVs were extracted with:

```sh
node test/performance/scripts/extract-typing-delay-input-path.js
```

## References

-   [Issue #51383: Perf Testing: Inconsistent methodology for testing typing performance](https://github.com/WordPress/gutenberg/issues/51383)
-   [PR #52022: Switch performance tests to Playwright](https://github.com/WordPress/gutenberg/pull/52022)
-   [Laurence Tratt, Why Aren't More Users More Happy With Our VMs? Part 1](https://tratt.net/laurie/blog/2018/why_arent_more_users_more_happy_with_our_vms_part_1.html)
-   [Laurence Tratt, Why Aren't More Users More Happy With Our VMs? Part 2](https://tratt.net/laurie/blog/2018/why_arent_more_users_more_happy_with_our_vms_part_2.html)
-   [Laurence Tratt, More Evidence for Problems in VM Warmup](https://tratt.net/laurie/blog/2022/more_evidence_for_problems_in_vm_warmup.html)
