# RTC Jetstream2 Resource Control Runbook

This runbook covers the Jetstream2 resource guard and autoscaler used by the RTC
fuzzing project.

## Scripts

- `bin/rtc-jetstream-guard-remote.sh`: keeps required tmux sessions alive.
- `bin/rtc-resource-autoscaler-remote.sh`: samples CPU, load average, memory,
  and coverage materialization state, then adjusts the coverage-guided browser
  budget.

Deploy from the script branch to Jetstream2:

```bash
cd /media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
git fetch danluu try/jetstream-fuzz
git checkout try/jetstream-fuzz -- bin/rtc-jetstream-guard-remote.sh bin/rtc-resource-autoscaler-remote.sh
cp bin/rtc-jetstream-guard-remote.sh /tmp/start_rtc_jetstream_guard.sh
cp bin/rtc-resource-autoscaler-remote.sh /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-resource-autoscaler.sh
bash -n /tmp/start_rtc_jetstream_guard.sh
bash -n /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-resource-autoscaler.sh
/tmp/start_rtc_jetstream_guard.sh restart
```

If only the autoscaler needs a restart:

```bash
TMUX=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux
$TMUX kill-session -t rtc-resource-autoscaler 2>/dev/null || true
$TMUX new-session -d -s rtc-resource-autoscaler \
  "bash -lc 'RTC_RESOURCE_AUTOSCALER_POLL_SECONDS=30 RTC_RESOURCE_AUTOSCALER_MIN_SCALE_UP_SECONDS=1800 RTC_RESOURCE_AUTOSCALER_E2E_MIN_LIVE_LANES=8 RTC_RESOURCE_AUTOSCALER_ALLOW_OPTIONAL_BROWSER_SHED=1 /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-resource-autoscaler.sh >> /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-start.log 2>&1'"
```

## Control Model

The autoscaler uses a small predictive controller, not just instantaneous load.
Each cycle reads `load1`, `load5`, and `load15`, then computes a projected load:

- start from the maximum of `load1`, `load5`, and `load15`;
- add part of the positive `load1 - load5` trend;
- add part of the positive `load5 - load15` trend.

This makes scale-down react quickly to pressure while scale-up waits until the
short and medium backlog have actually cleared. Scale-up also requires repeated
headroom observations and respects `RTC_RESOURCE_AUTOSCALER_MIN_SCALE_UP_SECONDS`
so the budget does not bounce after one low sample.

Coverage breadth is also controlled by pressure. The coverage breadth floor can
widen fuzzing when the machine has headroom, but it must not override
`pressure`, `high_pressure`, or `severe_pressure`. Under pressure, the controller
keeps the smaller budget and waits for backlog to drain before restoring breadth.

## Guard Interaction

The guard checks resource pressure before it restarts or reattaches optional
browser pools:

- strict expansion;
- focused shards;
- gap booster.

This prevents the guard from undoing autoscaler shedding during overload. The
coverage-guided supervisor, watchdog, analysis sidecars, lower-level lanes, and
resource autoscaler are still kept alive.

The autoscaler control path must stay nonblocking. It counts live browser runner
processes with `pgrep` instead of walking historical run directories, because
large artifact trees can otherwise block the control loop. Optional browser pool
cleanup is session-level in the autoscaler; deeper orphan cleanup should run as
a separate bounded janitor, not in the pressure-control path.

## Health Checks

Current status:

```bash
sed -n '1,140p' /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-status.md
tail -40 /media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515/logs/guard.log
/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux ls | grep -E 'rtc-(coverage-guided|resource-autoscaler|focused-shards|gap-booster|fuzz-strict)'
```

Healthy overload behavior:

- `reason` is `pressure`, `high_pressure`, or `severe_pressure`;
- `desired_budget` is reduced;
- optional browser pool sessions are absent or being skipped by the guard;
- the autoscaler session remains alive;
- `load1` starts falling before coverage breadth is restored.

Healthy recovery behavior:

- `load1`, `load5`, and `load15` all fall below the relevant thresholds;
- scale-up is blocked until backlog clears and the scale-up timer expires;
- coverage breadth is restored before optional browser pools are reattached.
