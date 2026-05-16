#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
CHECKOUT="${RTC_TREND_CHECKOUT:-/private/tmp/gutenberg-fuzz-progress-explain}"
BRANCH="${RTC_TREND_BRANCH:-explain/rtc-jetstream2-fuzz-progress-20260515}"
REMOTE="${RTC_TREND_REMOTE:-danluu}"
CODEX_BIN="${CODEX_BIN:-$(command -v codex)}"
EVENT_ID="${1:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"

safe_event="$(printf '%s' "$EVENT_ID" | tr -c 'A-Za-z0-9_.:-' '_')"
RUN_DIR="$OPS_DIR/runs/$safe_event"
mkdir -p "$RUN_DIR"

prompt="$RUN_DIR/prompt.md"
stdout="$RUN_DIR/codex.stdout.log"
stderr="$RUN_DIR/codex.stderr.log"
last_message="$RUN_DIR/codex.final.md"

cat > "$prompt" <<EOF
You are the autonomous Jetstream2 graph-refresh and interpretation job.

Trigger event: $EVENT_ID

Hard constraints:
- Do not use subagents.
- Do not use web search.
- Work in $CHECKOUT and $OPS_DIR only.
- Use Jetstream only through the scripts in $OPS_DIR.
- Keep the graph report's activity plots unlabeled. Do not add text to committed files that reveals what those two unlabeled activity plots measure.
- Treat persona-loop outputs as evidence to evaluate. They are allowed to contradict the graph interpretation.
- Keep the load-average graph immediately below the CPU utilization graph.
- In the health graph and interpretation, use current-output-dir duplicate/noise metrics, especially duplicateShareCurrent and summary startup failures, for live status. Do not use historical aggregate duplicate/noise as the plotted live health signal.

Required work:
1. In $CHECKOUT, make sure branch $BRANCH is based on $REMOTE/$BRANCH unless there are uncommitted changes that you must preserve.
2. Run:
   $OPS_DIR/collect-graph-inputs.sh $RUN_DIR
3. Run:
   Rscript docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R
4. Read the latest persona-loop syntheses and feedback files from:
   $RUN_DIR/inputs/persona-inputs
5. Update docs/explanations/architecture/rtc-jetstream2-fuzz-trend-analysis-20260515.md so the status and interpretation reflect the refreshed graph data and the standard persona-loop feedback. Keep it concise and concrete. If the feedback rejects a graph interpretation, say that in the report.
   Preserve the suggested-PR net LOC graph section when data/pr_suggested_net_loc.csv, plots/pr-suggested-total-net-loc-over-time.png, and plots/pr-suggested-net-loc-by-pr-over-time.png are present; update its latest total and largest rows from the refreshed CSV.
   Preserve the load-average graph section when data/load_average.csv and plots/load-average-over-time.png are present.
   Preserve the fuzzing-level mix section when data/fuzz_level_mix.csv and plots/fuzz-level-mix-over-time.png are present. Explicitly note whether live fuzzing is concentrated in browser/e2e lanes or whether lower-level targets such as transport-integration, unit-property, backend-api, protocol-server, or fuzz-only assertion work are active.
6. Run:
   $OPS_DIR/generate-trend-evidence.sh
   $OPS_DIR/publish-trend-evidence.sh
7. Run git diff --check.
8. If tracked files changed, commit them and push with:
   git push $REMOTE HEAD:refs/heads/$BRANCH
   If the push fails because the branch moved, fetch $REMOTE/$BRANCH, rebase or replay this report update on top of the new branch tip, and retry once.
   Use a short commit message like "Refresh Jetstream fuzz trend report".
9. If nothing changed, leave a no-change note in your final message.

Return only a short final status with the commit SHA if pushed, or the reason no push occurred.
EOF

{
	echo "event=$EVENT_ID"
	echo "run_dir=$RUN_DIR"
	echo "started_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$RUN_DIR/metadata.env"

(
	cd "$CHECKOUT"
	"$CODEX_BIN" -a never exec \
		--skip-git-repo-check \
		-m gpt-5.5 \
		-c model_reasoning_effort=xhigh \
		-s danger-full-access \
		-C "$CHECKOUT" \
		--add-dir "$OPS_DIR" \
		--output-last-message "$last_message" \
		< "$prompt" > "$stdout" 2> "$stderr"
)

status=$?
{
	echo "finished_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo "exit_status=$status"
} >> "$RUN_DIR/metadata.env"

exit "$status"
