#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
CONTINUATION_SRC=${RTC_CRITICAL_PR_EXECUTOR_CONTINUATION_SRC:-/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo}
SOURCE_SCRIPT=$SRC/bin/rtc-critical-path-pr-executor-loop-remote.sh
BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-core-wrapper/bin
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
LOCAL_PUBLISH_MANIFEST=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
PR_PROGRESS_BASE=/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
BENCHMARK_FEEDBACK_BASE=${RTC_CRITICAL_PR_EXECUTOR_BENCHMARK_FEEDBACK_BASE:-/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520}
PRODUCTIVE_ANALYSIS_BASE=${RTC_CRITICAL_PR_EXECUTOR_PRODUCTIVE_ANALYSIS_BASE:-/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521}
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GLOBAL_ADMISSION=$RESOURCE_BASE/rtc-global-cpu-admission.sh
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
ARTIFACT_INDEX_BASE=/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518
ARTIFACT_INDEX_ARTIFACTS=$ARTIFACT_INDEX_BASE/current-artifacts.tsv

SESSION=rtc-critical-path-pr-executor-loop
STATUS=$BASE/current-critical-path-status.md
INPUTS=$BASE/inputs.tsv
BLOCKERS=$BASE/blockers.tsv
LANES=$BASE/lanes.tsv
QUEUE=$BASE/queue.tsv
ACTIVE_JOBS=$BASE/active-jobs.tsv
NO_PROGRESS=$BASE/no-progress.tsv
BRANCH_AUDIT=$BASE/current-branch-audit.tsv
PUSH_MANIFEST=$BASE/current-push-manifest.tsv
VALIDATION_MATRIX=$BASE/current-validation-matrix.tsv
REPAIR_ADOPTIONS=$BASE/current-repair-branch-adoptions.tsv
CONTINUATION_CLASSIFICATIONS=$BASE/current-continuation-classifications.tsv
EVENTS=$BASE/events.ndjson
TERMINAL_LEDGER=$BASE/terminal-ledger.tsv
ACTIVE_SPLIT_FILE=$PR_SPLIT_BASE/current-pr-split.md
LAUNCHES=$BASE/logs/launches.tsv
LOG=$BASE/logs/critical-path-pr-executor.log
LOCK_FILE=$BASE/critical-path-pr-executor.lock
RECONCILE_LOCK_FILE=$BASE/critical-path-pr-executor-reconcile.v2.lock
PID_FILE=$BASE/critical-path-pr-executor.pid
RUNTIME_SCRIPT=$BASE/rtc-critical-path-pr-executor-loop.sh
WORKTREE_PRUNE_PID_FILE=$BASE/worktree-prune.pid
WORKTREE_PRUNE_STATUS=$BASE/worktree-prune-status.tsv

CYCLE_SLEEP_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_CYCLE_SLEEP_SECONDS:-60}
MAX_ACTIVE_CONTINUATIONS=${RTC_CRITICAL_PR_EXECUTOR_MAX_ACTIVE_CONTINUATIONS:-3}
MAX_ACTIVE_VALIDATIONS=${RTC_CRITICAL_PR_EXECUTOR_MAX_ACTIVE_VALIDATIONS:-6}
MAX_VALIDATION_BRANCHES_PER_CYCLE=${RTC_CRITICAL_PR_EXECUTOR_MAX_VALIDATION_BRANCHES_PER_CYCLE:-18}
MIN_TASK_INTERVAL_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_MIN_TASK_INTERVAL_SECONDS:-900}
BASE_REF=${RTC_CRITICAL_PR_EXECUTOR_BASE_REF:-trunk}
CODEX_MODEL=${RTC_CRITICAL_PR_EXECUTOR_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_CRITICAL_PR_EXECUTOR_CODEX_REASONING_EFFORT:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_CODEX_TIMEOUT_SECONDS:-5400}
ENABLE_BROWSER_PREFLIGHT=${RTC_CRITICAL_PR_EXECUTOR_ENABLE_BROWSER_PREFLIGHT:-1}
RECONCILE_TIMEOUT_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_RECONCILE_TIMEOUT_SECONDS:-300}
FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS:-12}
RECENT_EXECUTOR_RUN_SCAN_LIMIT=${RTC_CRITICAL_PR_EXECUTOR_RECENT_RUN_SCAN_LIMIT:-40}
ENABLE_CLASSIFICATION_FALLBACK_SCAN=${RTC_CRITICAL_PR_EXECUTOR_ENABLE_CLASSIFICATION_FALLBACK_SCAN:-0}
RECENT_LAUNCH_SCAN_LINES=${RTC_CRITICAL_PR_EXECUTOR_RECENT_LAUNCH_SCAN_LINES:-2000}
COVERAGE_STARTUP_PENDING_MAX_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_COVERAGE_STARTUP_PENDING_MAX_SECONDS:-900}
COVERAGE_NOVELTY_STATE_MAX_BYTES=${RTC_CRITICAL_PR_EXECUTOR_COVERAGE_NOVELTY_STATE_MAX_BYTES:-268435456}
COVERAGE_MONITOR_FAILURE_SCAN_LINES=${RTC_CRITICAL_PR_EXECUTOR_COVERAGE_MONITOR_FAILURE_SCAN_LINES:-400}
WORKTREE_PRUNE_RETENTION_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_RETENTION_SECONDS:-172800}
WORKTREE_PRUNE_PRESSURE_RETENTION_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_PRESSURE_RETENTION_SECONDS:-21600}
WORKTREE_PRUNE_MAX_DELETE_PER_PASS=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_MAX_DELETE_PER_PASS:-250}
WORKTREE_PRUNE_PRESSURE_MAX_DELETE_PER_PASS=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_PRESSURE_MAX_DELETE_PER_PASS:-1000}
WORKTREE_PRUNE_EMERGENCY_FREE_GIB=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_EMERGENCY_FREE_GIB:-160}
WORKTREE_PRUNE_EMERGENCY_MAX_DELETE_PER_PASS=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_EMERGENCY_MAX_DELETE_PER_PASS:-2000}
WORKTREE_PRUNE_PARALLEL=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_PARALLEL:-1}
WORKTREE_PRUNE_PRESSURE_PARALLEL=${RTC_CRITICAL_PR_EXECUTOR_WORKTREE_PRUNE_PRESSURE_PARALLEL:-3}
ORPHANED_CONTINUATION_GRACE_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_ORPHANED_CONTINUATION_GRACE_SECONDS:-180}
RELEASE_CANDIDATE_BRANCH=${RTC_CRITICAL_PR_EXECUTOR_RELEASE_CANDIDATE_BRANCH:-js2/all-merged-rebased-20260701}

mkdir -p "$BASE/logs" "$BASE/runs" "$BASE/worktrees" "$TMUX_WRAP"
install_tmux_wrapper() {
	local wrapper=$TMUX_WRAP/tmux tmp
	if [ -f "$wrapper" ] && cmp -s "$wrapper" - <<'SH'
#!/usr/bin/env bash
set -euo pipefail
socket=${RTC_TMUX_SOCKET:-rtc-fuzz}
case "${1:-}" in
	capture-pane)
		if [ "$socket" = rtc-fuzz ]; then
			printf 'capture-pane is disabled on the RTC core tmux socket\n' >&2
			exit 1
		fi
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
	display-message|has-session|list-*|show-*)
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
esac
exec /usr/bin/tmux -L "$socket" "$@"
SH
	then
		chmod +x "$wrapper"
		return 0
	fi
	tmp=$(mktemp "$TMUX_WRAP/tmux.XXXXXX.tmp")
	cat > "$tmp" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
socket=${RTC_TMUX_SOCKET:-rtc-fuzz}
case "${1:-}" in
	capture-pane)
		if [ "$socket" = rtc-fuzz ]; then
			printf 'capture-pane is disabled on the RTC core tmux socket\n' >&2
			exit 1
		fi
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
	display-message|has-session|list-*|show-*)
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
esac
exec /usr/bin/tmux -L "$socket" "$@"
SH
	chmod +x "$tmp"
	mv -f "$tmp" "$wrapper"
}
install_tmux_wrapper
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"
touch "$EVENTS" "$LAUNCHES"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

script_realpath() {
	readlink -f "$1" 2>/dev/null || printf '%s\n' "$1"
}

self_script_path() {
	script_realpath "${BASH_SOURCE[0]}"
}

runtime_script_path() {
	script_realpath "$RUNTIME_SCRIPT"
}

script_is_valid() {
	local script=$1
	[ -s "$script" ] || return 1
	bash -n "$script" >/dev/null 2>&1
}

preferred_script_source() {
	local source self
	source=$(script_realpath "$SOURCE_SCRIPT")
	self=$(self_script_path)
	if script_is_valid "$source"; then
		printf '%s\n' "$source"
		return 0
	fi
	if script_is_valid "$self"; then
		printf '%s\n' "$self"
		return 0
	fi
	return 1
}

ensure_runtime_script() {
	local source runtime tmp
	runtime=$(runtime_script_path)
	source=$(preferred_script_source)
	if [ "$source" = "$runtime" ]; then
		return 0
	fi
	if [ -f "$runtime" ] && cmp -s "$source" "$runtime" && script_is_valid "$runtime"; then
		return 0
	fi

	tmp=$(mktemp "$RUNTIME_SCRIPT.XXXXXX.tmp")
	cp "$source" "$tmp"
	chmod +x "$tmp"
	if ! bash -n "$tmp"; then
		rm -f "$tmp"
		return 1
	fi
	mv -f "$tmp" "$RUNTIME_SCRIPT"
}

snapshot_executor_script() {
	local self tmp snapshot
	self=$(self_script_path)
	snapshot=$BASE/runs/executor-runtime-$$.sh
	tmp=$(mktemp "$BASE/runs/executor-runtime-$$.XXXXXX.tmp")
	cp "$self" "$tmp"
	chmod +x "$tmp"
	if ! bash -n "$tmp"; then
		rm -f "$tmp"
		return 1
	fi
	mv -f "$tmp" "$snapshot"
	printf '%s\n' "$snapshot"
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] /_:' '[:lower:]----' | tr -cd 'a-z0-9-' | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

hash_key() {
	if command -v sha1sum >/dev/null 2>&1; then
		printf '%s' "$1" | sha1sum | awk '{ print substr($1, 1, 12) }'
	else
		printf '%s' "$1" | cksum | awk '{ print $1 }'
	fi
}

json_event() {
	local type=$1 message=$2
	printf '{"ts":"%s","type":"%s","message":"%s"}\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		"$(printf '%s' "$type" | sed 's/"/\\"/g')" \
		"$(printf '%s' "$message" | sed 's/"/\\"/g')" >> "$EVENTS"
}

atomic_move() {
	local tmp=$1 dest=$2
	mv "$tmp" "$dest"
}

file_hash() {
	local file=$1
	[ -f "$file" ] || return 0
	sha256sum "$file" 2>/dev/null | awk '{ print $1 }'
}

productive_analysis_feedback_present() {
	awk -F '\t' 'NR > 1 && NF >= 9 && $2 != "" { found = 1 } END { exit found ? 0 : 1 }' "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" 2>/dev/null
}

productive_analysis_requires_critical_path_action() {
	[ -s "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				column[$i] = i
			}
			next
		}
		$(column["target_loop"]) == "critical-path" {
			action = $(column["action_kind"])
			if (action == "close-consumed-pr-publication-blocker" ||
				action == "close-consumed-control-feedback-blocker") {
				next
			}
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" 2>/dev/null
}

latest_productive_analysis_classification() {
	latest_continuation_classification productive-analysis-action
}

productive_analysis_resolved_by_active_artifacts() {
	local classification class classification_mtime feedback_mtime actions_hash
	classification=$(latest_productive_analysis_classification || true)
	[ -n "$classification" ] && [ -s "$classification" ] || return 1
	class=$(awk -F '\t' 'NR > 1 && $1 == "productive-analysis-action" { print $2; exit }' "$classification" 2>/dev/null)
	case "$class" in
		already_resolved_by_active_artifact|already_resolved_by_active_artifacts|active_artifacts_adopted|adopted_active_artifacts|controller_generator_repair|downscoped_to_coverage_materialization)
			;;
		*)
			return 1
			;;
	esac
	if ! productive_analysis_requires_critical_path_action; then
		return 0
	fi
	case "$class" in
		already_resolved_by_active_artifact|already_resolved_by_active_artifacts|active_artifacts_adopted|adopted_active_artifacts)
			if ! benchmark_effective_promotion_blocked && ! benchmark_product_failures_open && ! productive_analysis_exact_blocker_open; then
				return 0
			fi
			;;
	esac
	if [ "$class" = "downscoped_to_coverage_materialization" ] && ! benchmark_effective_promotion_blocked && ! benchmark_product_failures_open; then
		return 0
	fi
	actions_hash=$(file_hash "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv" || true)
	if [ -n "$actions_hash" ] && grep -Fq "$actions_hash" "$classification"; then
		return 0
	fi
	if [ -s "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" ]; then
		classification_mtime=$(file_mtime "$classification")
		feedback_mtime=$(file_mtime "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv")
		[ "$classification_mtime" -ge "$feedback_mtime" ] || return 1
	fi
	return 0
}

productive_analysis_exact_blocker_rows() {
	[ -s "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" ] || return 0
	awk -F '\t' '
		function slugify(value) {
			value = tolower(value)
			gsub(/[ \/_:]/, "-", value)
			gsub(/[^a-z0-9-]/, "", value)
			gsub(/-+/, "-", value)
			sub(/^-/, "", value)
			sub(/-$/, "", value)
			return value
		}
			function reload_hydration_seed(value, seed) {
				seed = value
				if (seed ~ /seed[- ]?[0-9]+/) {
					sub(/^.*seed[- ]?/, "", seed)
					sub(/[^0-9].*$/, "", seed)
					return seed
				}
				return ""
			}
			function repair_sha(value, parts, count, i, token) {
				count = split(value, parts, /[^0-9A-Fa-f]+/)
				for (i = 1; i <= count; i++) {
					token = tolower(parts[i])
					if (length(token) >= 40 && token ~ /^[0-9a-f]+$/) {
						return substr(token, 1, 12)
					}
				}
				return ""
			}
			function exact_blocker_id(family, action_id, next_action, evidence_path, clean, seed, sha) {
				if (family == "focused-large-http-lifecycle-no-reload" || family ~ /^focused-large-http-lifecycle-no-reload\/seed[- ]?7800014$/) {
					return "pa-exact-focused-large-http-lifecycle-no-reload"
				}
				if (family == "reload-hydration" || family ~ /^reload-hydration\//) {
					seed = reload_hydration_seed(family)
					if (seed == "") {
						seed = reload_hydration_seed(action_id)
					}
					if (seed == "") {
						seed = reload_hydration_seed(next_action)
					}
					if (seed == "") {
						seed = reload_hydration_seed(evidence_path)
					}
					if (seed != "") {
						return "pa-exact-reload-hydration-seed-" seed "-final-ui-witness"
					}
				}
				if (family ~ /^(benchmark-canary\/)?novelty-http-self-presence-ui-signals\/seed[- ]?[0-9]+/) {
					seed = reload_hydration_seed(family)
					if (seed == "") {
						seed = reload_hydration_seed(action_id)
					}
					if (seed == "") {
						seed = reload_hydration_seed(next_action)
					}
					if (seed == "") {
						seed = reload_hydration_seed(evidence_path)
					}
					sha = repair_sha(family)
					if (sha == "") {
						sha = repair_sha(next_action)
					}
					if (sha == "") {
						sha = repair_sha(evidence_path)
					}
					if (seed != "") {
						return "pa-exact-novelty-http-self-presence-ui-signals-seed-" seed (sha != "" ? "-" sha : "")
					}
				}
				if (family ~ /^pa-exact-/) {
					clean = family
					gsub(/[^a-zA-Z0-9._\/-]/, "", clean)
					return substr(clean, 1, 120)
				}
				if (family ~ /^benchmark-canary\/novelty-http-large-post-lifecycle\/seed-1140001-(a0314e1bdc16|final-persistence)$/) {
					return "pa-exact-benchmark-canary-novelty-http-large-post-lifecycle-seed-1140001-final-persistence"
				}
			return "pa-exact-" substr(slugify(family), 1, 96)
		}
		function sortable_time(value) {
			gsub(/[^0-9]/, "", value)
			return value
		}
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				column[$i] = i
			}
			next
		}
		{
			action = $(column["action_kind"])
			family = $(column["family_or_pr"])
			is_exact = (action ~ /^exact-blocker/ || action == "create-exact-blocker" || action == "promote-exact-blocker" || action == "route-exact-blocker" || action == "convert-to-exact-blocker") ? 1 : 0
			if (action ~ /dedupe/) {
				is_exact = 0
			}
			is_singleton_repair = (action == "repair-or-downscope" || action == "focused-owner-replay" || action == "focused-exact-or-downscope") ? 1 : 0
			is_benchmark_repair = 0
			if ((action == "repair-ready" || action == "retarget-blocker" || action == "product-repair" || action == "repair-product-failure") &&
				(family ~ /^benchmark-canary\// || family ~ /^pa-exact-benchmark-canary-.*seed-[0-9]+$/ || family == "benchmark-canary-product-failure")) {
				is_benchmark_repair = 1
			}
		}
		$(column["target_loop"]) == "critical-path" && (is_exact || is_singleton_repair || is_benchmark_repair) {
				key = exact_blocker_id(family, $(column["action_id"]), $(column["next_action"]), $(column["evidence_path"]))
			if (key == "") {
				key = $(column["action_id"])
			}
			sort_key = sortable_time($(column["generated_at"]))
			if (!(key in generated_at) || sort_key >= generated_at[key]) {
				generated_at[key] = sort_key
				row[key] = $0
			}
		}
		END {
			for (key in row) {
				print row[key]
			}
		}
	' "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.tsv" 2>/dev/null
}

productive_analysis_exact_blocker_id() {
	local family=${1:-} action_id=${2:-} next_action=${3:-} evidence_path=${4:-}
	local slug seed sha
	case "$family" in
		focused-large-http-lifecycle-no-reload|focused-large-http-lifecycle-no-reload/seed-7800014)
			printf 'pa-exact-focused-large-http-lifecycle-no-reload'
			return 0
			;;
	esac
	case "$family" in
		reload-hydration|reload-hydration/*)
			seed=$(productive_analysis_reload_hydration_seed "$family")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$action_id")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$next_action")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$evidence_path")
			if [ -n "$seed" ]; then
				printf 'pa-exact-reload-hydration-seed-%s-final-ui-witness' "$seed"
				return 0
			fi
			;;
	esac
	case "$family" in
		novelty-http-self-presence-ui-signals/seed*|benchmark-canary/novelty-http-self-presence-ui-signals/seed*)
			seed=$(productive_analysis_reload_hydration_seed "$family")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$action_id")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$next_action")
			[ -n "$seed" ] || seed=$(productive_analysis_reload_hydration_seed "$evidence_path")
			sha=$(productive_analysis_repair_sha "$family")
			[ -n "$sha" ] || sha=$(productive_analysis_repair_sha "$next_action")
			[ -n "$sha" ] || sha=$(productive_analysis_repair_sha "$evidence_path")
			if [ -n "$seed" ]; then
				printf 'pa-exact-novelty-http-self-presence-ui-signals-seed-%s' "$seed"
				[ -n "$sha" ] && printf -- '-%s' "$sha"
				return 0
			fi
			;;
	esac
	case "$family" in
		benchmark-canary/novelty-http-large-post-lifecycle/seed-1140001-a0314e1bdc16|benchmark-canary/novelty-http-large-post-lifecycle/seed-1140001-final-persistence)
			printf 'pa-exact-benchmark-canary-novelty-http-large-post-lifecycle-seed-1140001-final-persistence'
			return 0
			;;
	esac
	case "$family" in
		pa-exact-*)
			printf '%s' "$family" | tr -cd 'a-zA-Z0-9._/-' | cut -c1-120
			return 0
			;;
	esac
	slug=$(slugify "$family" | cut -c1-96 | sed -e 's/-$//')
	printf 'pa-exact-%s' "$slug"
}

productive_analysis_reload_hydration_seed() {
	printf '%s' "$1" | sed -n 's/^.*seed[- ]*\([0-9][0-9]*\).*$/\1/p' | head -n 1
}

productive_analysis_repair_sha() {
	printf '%s' "$1" | tr -cs '0-9A-Fa-f' '\n' | awk 'length($0) >= 40 && $0 ~ /^[0-9A-Fa-f]+$/ { value = tolower($0); print substr(value, 1, 12); exit }'
}

productive_analysis_priority() {
	case "$1" in
		P0|high) printf 'high' ;;
		P1|medium) printf 'medium' ;;
		*) printf 'low' ;;
	esac
}

latest_exact_blocker_classification() {
	local blocker_id=$1 slug direct slugged
	slug=$(slugify "$blocker_id" | cut -c1-48)
	{
		direct=$(latest_continuation_classification "$blocker_id" || true)
		if [ -n "$direct" ] && [ -s "$direct" ]; then
			printf '%s\t%s\n' "$(file_mtime "$direct")" "$direct"
		fi
		if [ "$slug" != "$blocker_id" ]; then
			slugged=$(latest_continuation_classification "$slug" || true)
			if [ -n "$slugged" ] && [ -s "$slugged" ]; then
				printf '%s\t%s\n' "$(file_mtime "$slugged")" "$slugged"
			fi
		fi
	} |
		sort -n |
		tail -1 |
		cut -f2- |
		sed -n '1p'
}

productive_analysis_exact_blocker_consumed() {
	local blocker_id=$1 generated_at=${2:-}
	local classification class_mtime generated_epoch
	classification=$(latest_exact_blocker_classification "$blocker_id" || true)
	[ -s "$classification" ] || return 1
	class_mtime=$(file_mtime "$classification")
	generated_epoch=$(iso_epoch "$generated_at")
	if [ "$generated_epoch" -gt 0 ] && [ "$class_mtime" -lt "$generated_epoch" ]; then
		return 1
	fi
	awk -F '\t' '
		# product_bug_reduced and repair_branch_created are intentionally not
		# terminal here: neither proves the exact blocker is fixed.
		NR > 1 && $2 ~ /^(exact_replay_green|exact_replay_downscoped|adopted_active_artifact)$/ {
			found = 1
			exit
		}
		END { exit found ? 0 : 1 }
	' "$classification" 2>/dev/null
}

productive_analysis_exact_blocker_open() {
	local generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path
	local blocker_id
	while IFS=$'\t' read -r generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path; do
		[ -n "$family_or_pr" ] || continue
		blocker_id=$(productive_analysis_exact_blocker_id "$family_or_pr" "$action_id" "$next_action" "$evidence_path")
		if ! productive_analysis_exact_blocker_suppressed "$blocker_id" "$action_kind" "$evidence_path" "$next_action" "$generated_at"; then
			return 0
		fi
	done < <(productive_analysis_exact_blocker_rows || true)
	return 1
}

pr_progress_decision_allows() {
	local action=$1 target=$2 decisions=$PR_PROGRESS_BASE/current-control-decisions.tsv
	[ -s "$decisions" ] || return 1
	awk -F '\t' -v action="$action" -v target="$target" '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				cols[$i] = i
			}
			action_col = cols["action"]
			target_col = cols["target"]
			allowed_col = cols["allowed"]
			next
		}
		action_col && target_col && allowed_col &&
		$(action_col) == action && $(target_col) == target {
			allowed = tolower($(allowed_col))
			found = 1
		}
		END {
			exit(found && (allowed == "yes" || allowed == "true" || allowed == "allow" || allowed == "allowed" || allowed == "1") ? 0 : 1)
		}
	' "$decisions" 2>/dev/null
}

pr_progress_decision_blocks() {
	local action=$1 target=$2 decisions=$PR_PROGRESS_BASE/current-control-decisions.tsv
	[ -s "$decisions" ] || return 1
	awk -F '\t' -v action="$action" -v target="$target" '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				cols[$i] = i
			}
			action_col = cols["action"]
			target_col = cols["target"]
			allowed_col = cols["allowed"]
			next
		}
		action_col && target_col && allowed_col &&
		$(action_col) == action && $(target_col) == target {
			allowed = tolower($(allowed_col))
			found = 1
		}
		END {
			exit(found && (allowed == "no" || allowed == "false" || allowed == "block" || allowed == "blocked" || allowed == "0") ? 0 : 1)
		}
	' "$decisions" 2>/dev/null
}

benchmark_product_repair_allowed_by_controller() {
	pr_progress_decision_allows launch-branch-repair benchmark-canary-product-failure ||
		pr_progress_decision_allows repair-branch benchmark-canary-product-failure ||
		pr_progress_decision_allows repair-ready benchmark-canary-product-failure ||
		pr_progress_decision_allows product-repair benchmark-canary-product-failure
}

benchmark_canary_focus_target_for_blocker() {
	local blocker_id=$1 group
	case "$blocker_id" in
		pa-exact-benchmark-canary-*)
			group=${blocker_id#pa-exact-benchmark-canary-}
			;;
		*)
			return 1
			;;
	esac
	case "$group" in
		novelty-http-large-post-lifecycle-completion*)
			printf 'benchmark-canary/novelty-http-large-post-lifecycle-completion'
			;;
		novelty-http-large-post-lifecycle*)
			printf 'benchmark-canary/novelty-http-large-post-lifecycle'
			;;
		novelty-http-title-reload-convergence*)
			printf 'benchmark-canary/novelty-http-title-reload-convergence'
			;;
		novelty-http-same-user-stale-draft*)
			printf 'benchmark-canary/novelty-http-same-user-stale-draft'
			;;
		novelty-http-persistence-probe*)
			printf 'benchmark-canary/novelty-http-persistence-probe'
			;;
		novelty-http-rtc-reference-oracle*)
			printf 'benchmark-canary/novelty-http-rtc-reference-oracle'
			;;
		novelty-ws-multi-reload-lifecycle*)
			printf 'benchmark-canary/novelty-ws-multi-reload-lifecycle'
			;;
		novelty-ws-parser-serialization*)
			printf 'benchmark-canary/novelty-ws-parser-serialization'
			;;
		*)
			return 1
			;;
	esac
}

benchmark_canary_focused_blocker_suppresses() {
	local blocker_id=$1 target
	target=$(benchmark_canary_focus_target_for_blocker "$blocker_id" || true)
	[ -n "$target" ] || return 0
	if pr_progress_decision_blocks repair-ready "$target" ||
		pr_progress_decision_blocks launch-branch-repair "$target" ||
		pr_progress_decision_blocks repair-branch "$target"; then
		return 1
	fi
	if pr_progress_decision_allows repair-ready "$target" ||
		pr_progress_decision_allows launch-branch-repair "$target" ||
		pr_progress_decision_allows repair-branch "$target"; then
		return 0
	fi
	return 0
}

focused_benchmark_canary_blocker_open() {
	local blocker_id
	[ -s "$BLOCKERS" ] || return 1
	while IFS=$'\t' read -r blocker_id; do
		[ -n "$blocker_id" ] || continue
		if benchmark_canary_focused_blocker_suppresses "$blocker_id"; then
			return 0
		fi
	done < <(
		awk -F '\t' '
		NR > 1 &&
		$1 ~ /^pa-exact-benchmark-canary-/ &&
		$1 != "pa-exact-benchmark-canary-product-failure" &&
		$4 != "terminal" &&
		$4 != "held" {
			print $1
		}
		' "$BLOCKERS"
	)
	return 1
}

productive_analysis_exact_blocker_suppressed() {
	local blocker_id=${1:-} action_kind=${2:-} evidence_path=${3:-} next_action=${4:-} generated_at=${5:-}
	local status benchmark_group
	if productive_analysis_exact_blocker_consumed "$blocker_id" "$generated_at"; then
		return 0
	fi
	case "$blocker_id" in
		pa-exact-benchmark-canary-product-failure)
			if ! benchmark_product_failures_open; then
				return 0
			fi
			return 1
			;;
		pa-exact-benchmark-canary-*)
			benchmark_group=${blocker_id#pa-exact-benchmark-canary-}
			if ! benchmark_canary_group_product_failure_open "$benchmark_group"; then
				return 0
			fi
			return 1
			;;
		pa-exact-reload-hydration-seed-*-final-ui-witness)
			;;
		*)
			return 1
			;;
	esac
	status=$(reload_hydration_reacquire_status || true)
	case "$status" in
		replay_backed_downscope|exact_reproducer_not_reproduced)
			;;
		*)
			return 1
			;;
	esac
	case "$action_kind:$next_action" in
		*replay_backed_downscope*|*exact_reproducer_not_reproduced*|*terminalize*|*"terminal cooldown"*|*suppress*|*downscope*)
			return 0
			;;
	esac
	if [ -s "$evidence_path" ]; then
		awk -F '\t' '
			NR > 1 && $2 ~ /^(replay_backed_downscope|exact_reproducer_not_reproduced)$/ {
				found = 1
				exit
			}
			END { exit found ? 0 : 1 }
		' "$evidence_path" 2>/dev/null && return 0
	fi
	return 1
}

write_productive_analysis_exact_blockers() {
	local now=$1
	local generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path
	local blocker_id blocker_priority active_pattern active state blocked_by
	while IFS=$'\t' read -r generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path; do
		[ -n "$family_or_pr" ] || continue
		blocker_id=$(productive_analysis_exact_blocker_id "$family_or_pr" "$action_id" "$next_action" "$evidence_path")
		if productive_analysis_exact_blocker_suppressed "$blocker_id" "$action_kind" "$evidence_path" "$next_action" "$generated_at"; then
			continue
		fi
		blocker_priority=$(productive_analysis_priority "$priority")
		active_pattern=$(slugify "$blocker_id" | cut -c1-48)
		active=$(active_work_matching "$active_pattern" || true)
		state=$([ -n "$active" ] && printf active || printf runnable)
		blocked_by=$([ -n "$active" ] && printf active-job || printf productive-analysis)
		printf '%s\tproductive-exact-blocker\t%s\t%s\tproductive-analysis:%s\tcritical-path,exact-replay,repair-or-downscope\t%s\tclassification.tsv,report.md\t%s\t%s\t%s\n' \
			"$blocker_id" "$blocker_priority" "$state" "$action_id" "$blocked_by" "${active:-}" "$next_action" "$now"
	done < <(productive_analysis_exact_blocker_rows || true)
	return 0
}

write_productive_analysis_exact_blocker_queue_rows() {
	local now=$1
	local generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path
	local blocker_id blocker_priority active state result active_pattern
	while IFS=$'\t' read -r generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path; do
		[ -n "$family_or_pr" ] || continue
		blocker_id=$(productive_analysis_exact_blocker_id "$family_or_pr" "$action_id" "$next_action" "$evidence_path")
		if productive_analysis_exact_blocker_suppressed "$blocker_id" "$action_kind" "$evidence_path" "$next_action" "$generated_at"; then
			continue
		fi
		blocker_priority=$(productive_analysis_priority "$priority")
		active_pattern=$(slugify "$blocker_id" | cut -c1-48)
		active=$(active_work_matching "$active_pattern" || true)
		state=$([ -n "$active" ] && printf active || printf runnable)
		result=$([ -n "$active" ] && printf adopted || printf pending)
		printf 'job-%s\t%s\t%s\trepair-or-downscope\t%s\tcodex-analysis\t%s\t%s\t0\t%s\t\t%s/runs/%s\t%s\t\t%s\t\t%s\n' \
			"$blocker_id" "$blocker_id" "$blocker_id" "$blocker_id" "$blocker_priority" "$state" "${active:-}" "$BASE" "$blocker_id" "$now" "$now" "$result"
	done < <(productive_analysis_exact_blocker_rows || true)
	return 0
}

file_size() {
	local file=$1
	[ -e "$file" ] || {
		printf '0'
		return
	}
	stat -c %s "$file" 2>/dev/null || printf '0'
}

file_mtime() {
	local file=$1
	[ -e "$file" ] || {
		printf '0'
		return
	}
	stat -c %Y "$file" 2>/dev/null || printf '0'
}

iso_epoch() {
	local value=${1:-}
	[ -n "$value" ] || {
		printf '0'
		return
	}
	date -u -d "$value" +%s 2>/dev/null || printf '0'
}

artifact_index_fresh() {
	local now mtime age
	[ -s "$ARTIFACT_INDEX_ARTIFACTS" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null || printf '0')
	age=$(( now - mtime ))
	[ "$age" -le 600 ]
}

latest_indexed_artifact() {
	local kind=$1 pattern=$2
	awk -F '\t' -v kind="$kind" -v pattern="$pattern" '
		NR > 1 && $4 == kind {
			path = tolower($6)
			if (path ~ pattern) print $1 "\t" $6
		}
	' "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_launched_continuation_classification() {
	local lane=$1 suffix
	[ -s "$LAUNCHES" ] || return 1
	suffix="/continuations/$lane"
	tail -n "$RECENT_LAUNCH_SCAN_LINES" "$LAUNCHES" 2>/dev/null |
	awk -F '\t' -v suffix="$suffix" '
		$2 == "continuation" && length($5) >= length(suffix) &&
			substr($5, length($5) - length(suffix) + 1) == suffix {
			print $5 "/classification.tsv"
		}
	' |
		while IFS= read -r classification; do
			[ -s "$classification" ] || continue
			printf '%s\t%s\n' "$(file_mtime "$classification")" "$classification"
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_plain_editor_repair_classification() {
	local suffix=/continuations/plain-editor-product-smoke
	[ -s "$LAUNCHES" ] || return 1
	tail -n "$RECENT_LAUNCH_SCAN_LINES" "$LAUNCHES" 2>/dev/null |
		awk -F '\t' -v suffix="$suffix" '
			$2 == "continuation" && length($5) >= length(suffix) &&
				substr($5, length($5) - length(suffix) + 1) == suffix {
					print $5 "/classification.tsv"
				}
		' |
		while IFS= read -r classification; do
			[ -s "$classification" ] || continue
			if awk -F '\t' 'NR > 1 && $1 == "plain-editor-product-smoke" && $2 ~ /^(blocked_specific|product_bug_reduced)$/ { found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null; then
				printf '%s\t%s\n' "$(file_mtime "$classification")" "$classification"
			fi
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

write_continuation_classification_cache() {
	local tmp=$CONTINUATION_CLASSIFICATIONS.$$.tmp
	{
		printf 'mtime\tlane_id\tclassification_path\tsource\n'
		if artifact_index_fresh; then
			awk -F '\t' '
				NR > 1 && $4 == "classification" && $6 ~ /\/continuations\/[^/]+\/classification[.]tsv$/ {
					path = $6
					lane = path
					sub(/^.*\/continuations\//, "", lane)
					sub(/\/classification[.]tsv$/, "", lane)
					print $1 "\t" lane "\t" path "\tartifact-index"
				}
			' "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null || true
		fi
		if [ -s "$LAUNCHES" ]; then
			tail -n "$RECENT_LAUNCH_SCAN_LINES" "$LAUNCHES" 2>/dev/null |
				awk -F '\t' '
					$2 == "continuation" && $5 ~ /\/continuations\/[^/]+$/ {
						path = $5 "/classification.tsv"
						lane = $5
						sub(/^.*\/continuations\//, "", lane)
						print lane "\t" path
					}
				' |
				while IFS=$'\t' read -r lane path; do
					[ -s "$path" ] || continue
					printf '%s\t%s\t%s\tlaunch-ledger\n' "$(file_mtime "$path")" "$lane" "$path"
				done
		fi
	} |
		awk -F '\t' '
			NR == 1 { next }
			NF >= 4 && $1 ~ /^[0-9]+([.][0-9]+)?$/ {
				key = $2
				if (!(key in best) || $1 + 0 > best[key] + 0) {
					best[key] = $1
					row[key] = $0
				}
			}
			END {
				print "mtime\tlane_id\tclassification_path\tsource"
				for (key in row) print row[key]
			}
		' > "$tmp"
	atomic_move "$tmp" "$CONTINUATION_CLASSIFICATIONS"
}

input_status() {
	local file=$1 size
	if [ ! -e "$file" ]; then
		printf 'missing'
		return
	fi
	size=$(file_size "$file")
	if [ "$size" = 0 ]; then
		printf 'zero'
	else
		printf 'present'
	fi
}

latest_nonempty_file() {
	local root=$1 pattern=$2
	local status_candidate index_candidate
	if [ "$root" = "$FINALIZATION_BASE/cycles" ] && [ "$pattern" = "finalization.report.md" ]; then
		status_candidate=$(latest_status_report_path "$FINALIZATION_BASE/current-finalization-status.md" "$root" 'finalization[.]report[.]md$' || true)
		if [ -n "$status_candidate" ]; then
			printf '%s\n' "$status_candidate"
			return 0
		fi
		index_candidate=$(latest_indexed_artifact_for_root "$root" finalization_report 'finalization[.]report[.]md$' || true)
		if [ -n "$index_candidate" ]; then
			printf '%s\n' "$index_candidate"
			return 0
		fi
	fi
	if [ "$root" = "$DEFERRED_BASE/cycles" ] && [ "$pattern" = "report.md" ]; then
		status_candidate=$(latest_status_report_path "$DEFERRED_BASE/current-deferred-status.md" "$root" '([.]report[.]md|/report[.]md|/push-manifest[.]tsv)$' || true)
		if [ -n "$status_candidate" ]; then
			printf '%s\n' "$status_candidate"
			return 0
		fi
		index_candidate=$(latest_indexed_artifact_for_root "$root" report '([.]report[.]md|/report[.]md)$' || true)
		if [ -n "$index_candidate" ]; then
			printf '%s\n' "$index_candidate"
			return 0
		fi
	fi
	[ -d "$root" ] || return 0
	find "$root" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null |
		awk -F '\t' '$1 ~ /^[0-9]{8}T[0-9]{6}Z$/ { print }' |
		sort |
		tail -120 |
		cut -f2- |
		while IFS= read -r run_dir; do
			find "$run_dir" -maxdepth 5 -type f -name "$pattern" -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_status_report_path() {
	local status_file=$1 root=$2 suffix_re=$3
	[ -s "$status_file" ] || return 1
	awk -v root="$root" -v suffix_re="$suffix_re" '
		function maybe_emit(value) {
			sub(/^path=/, "", value)
			gsub(/[),;]+$/, "", value)
			if (index(value, root "/") == 1 && value ~ suffix_re) print value
		}
		/^###[[:space:]]+/ {
			path = $0
			sub(/^###[[:space:]]+/, "", path)
			sub(/[[:space:]].*/, "", path)
			maybe_emit(path)
		}
		{
			for (i = 1; i <= NF; i++) maybe_emit($i)
		}
	' "$status_file" 2>/dev/null |
		awk '!seen[$0]++' |
		while IFS= read -r file; do
			if [[ "$file" == */push-manifest.tsv ]]; then
				find "${file%/*}" -maxdepth 1 -type f -name '*.report.md' -size +0c -printf '%T@\t%p\n' 2>/dev/null
				continue
			fi
			[ -s "$file" ] || continue
			printf '%s\t%s\n' "$(file_mtime "$file")" "$file"
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_indexed_artifact_for_root() {
	local root=$1 kind=$2 suffix_re=$3
	local candidate
	artifact_index_fresh || return 1
	candidate=$(
		awk -F '\t' -v root="$root" -v kind="$kind" -v suffix_re="$suffix_re" '
			NR > 1 && $4 == kind && index($6, root "/") == 1 && $6 ~ suffix_re {
				print $1 "\t" $6
			}
		' "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null |
			sort -n |
			tail -1 |
			cut -f2-
	)
	[ -s "$candidate" ] || return 1
	printf '%s\n' "$candidate"
}

recent_executor_run_dirs() {
	find "$BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null |
		awk -F '\t' '$1 ~ /^[0-9]{8}T[0-9]{6}Z$/ { print }' |
		sort |
		tail -"$RECENT_EXECUTOR_RUN_SCAN_LIMIT" |
		cut -f2-
}

all_executor_run_dirs() {
	find "$BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null |
		awk -F '\t' '$1 ~ /^[0-9]{8}T[0-9]{6}Z$/ { print }' |
		sort |
		cut -f2-
}

latest_progress_unblock_artifact() {
	local indexed
	if artifact_index_fresh; then
		indexed=$(latest_indexed_artifact report 'progress-unblock.*/report[.]md|progress-unblock.*/classification[.]tsv' || true)
		if [ -n "$indexed" ]; then
			printf '%s\n' "$indexed"
			return 0
		fi
	fi
	find "$PR_SPLIT_BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -80 |
		cut -f2- |
		while IFS= read -r run_dir; do
			find "$run_dir/jobs" -maxdepth 4 -type f -path '*/progress-unblock*/*' -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_continuation_classification() {
	local lane=$1 indexed launched cached
	if [ -s "$CONTINUATION_CLASSIFICATIONS" ]; then
		cached=$(awk -F '\t' -v lane="$lane" 'NR > 1 && $2 == lane { print $3; exit }' "$CONTINUATION_CLASSIFICATIONS" 2>/dev/null || true)
		if [ -n "$cached" ] && [ -s "$cached" ]; then
			printf '%s\n' "$cached"
			return 0
		fi
		return 1
	fi
	{
		indexed=$(latest_indexed_artifact classification "continuations/${lane}/classification[.]tsv$" || true)
		if [ -n "$indexed" ] && [ -s "$indexed" ]; then
			printf '%s\t%s\n' "$(file_mtime "$indexed")" "$indexed"
		fi
		launched=$(latest_launched_continuation_classification "$lane" || true)
		if [ -n "$launched" ] && [ -s "$launched" ]; then
			printf '%s\t%s\n' "$(file_mtime "$launched")" "$launched"
		fi
		if [ "$ENABLE_CLASSIFICATION_FALLBACK_SCAN" = 1 ]; then
			find "$BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null |
				awk -F '\t' '$1 ~ /^[0-9]{8}T[0-9]{6}Z$/ { print }' |
				sort |
				tail -"$RECENT_EXECUTOR_RUN_SCAN_LIMIT" |
				cut -f2- |
				while IFS= read -r run_dir; do
					find "$run_dir/continuations/$lane" -maxdepth 1 -type f -name 'classification.tsv' -size +0c -printf '%T@\t%p\n' 2>/dev/null
				done
		fi
	} |
		sort -n |
		tail -1 |
		cut -f2- |
		sed -n '1p'
}

latest_continuation_class() {
	local lane=$1 classification
	classification=$(latest_continuation_classification "$lane" || true)
	[ -s "$classification" ] || return 1
	awk -F '\t' -v lane="$lane" 'NR > 1 && $1 == lane { print $2; exit }' "$classification" 2>/dev/null
}

latest_continuation_was_stale_orphan_killed() {
	local lane=$1 class
	class=$(latest_continuation_class "$lane" || true)
	[ "$class" = "stale_orphan_killed" ]
}

continuation_source_repo() {
	local continuation_dir=$1 source_log source
	source_log=$continuation_dir/source-repo.log
	source=$(sed -n 's/^continuation_src=//p' "$source_log" 2>/dev/null | tail -1)
	if [ -n "$source" ]; then
		printf '%s\n' "$source"
	else
		printf '%s\n' "$CONTINUATION_SRC"
	fi
}

continuation_start_head() {
	local continuation_dir=$1 source_repo=$2 source_log worktree_log start abbrev
	source_log=$continuation_dir/source-repo.log
	worktree_log=$continuation_dir/worktree.log
	start=$(sed -n 's/^continuation_start_head=//p' "$source_log" 2>/dev/null | tail -1)
	if [ -n "$start" ]; then
		git -C "$source_repo" rev-parse --verify --quiet "$start^{commit}" 2>/dev/null && return 0
	fi
	abbrev=$(sed -n 's/^Preparing worktree (detached HEAD \([0-9a-f]\{7,\}\)).*/\1/p' "$worktree_log" 2>/dev/null | tail -1)
	if [ -z "$abbrev" ]; then
		abbrev=$(sed -n 's/^HEAD is now at \([0-9a-f]\{7,\}\) .*/\1/p' "$worktree_log" 2>/dev/null | tail -1)
	fi
	if [ -n "$abbrev" ]; then
		git -C "$source_repo" rev-parse --verify --quiet "$abbrev^{commit}" 2>/dev/null && return 0
	fi
	return 1
}

repair_branch_created_records() {
	recent_executor_run_dirs |
		while IFS= read -r run_dir; do
			find "$run_dir/continuations" -mindepth 2 -maxdepth 2 -name repair-branch.txt -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -80 |
		while IFS=$'\t' read -r mtime repair_file; do
			local dir lane classification branch source_repo source_head source_start_head report
			dir=${repair_file%/*}
			lane=${dir##*/}
			classification=$dir/classification.tsv
			report=$dir/report.md
			[ -s "$classification" ] || continue
			awk -F '\t' 'NR > 1 && $2 ~ /^(repair_branch_created|fix_branch_created)$/ { found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null || continue
			branch=$(sed -n '1p' "$repair_file" 2>/dev/null | tr -d '\r')
			[ -n "$branch" ] || continue
			[ "$branch" != "NONE" ] || continue
			git check-ref-format --branch "$branch" >/dev/null 2>&1 || continue
			source_repo=$(continuation_source_repo "$dir")
			source_head=$(git -C "$source_repo" rev-parse --verify --quiet "$branch^{commit}" 2>/dev/null || true)
			source_start_head=$(continuation_start_head "$dir" "$source_repo" || true)
			printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
				"$mtime" "$lane" "$branch" "$source_repo" "$source_head" "$source_start_head" "$dir" "$classification" "$report"
		done
}

latest_repair_branch_created_record() {
	repair_branch_created_records |
		sort -n |
		tail -1
}

latest_repair_branch_adoption_classification() {
	latest_continuation_classification benchmark-canary-repair-branch-adoption
}

repair_branch_adoption_consumed() {
	local record_mtime=$1 classification class class_mtime
	classification=$(latest_repair_branch_adoption_classification || true)
	[ -s "$classification" ] || return 1
	class_mtime=$(file_mtime "$classification")
	awk_mtime=${record_mtime%.*}
	[ "$class_mtime" -ge "${awk_mtime:-0}" ] || return 1
	class=$(awk -F '\t' 'NR > 1 && $1 == "benchmark-canary-repair-branch-adoption" { print $2; exit }' "$classification" 2>/dev/null)
	case "$class" in
		repair_branch_adopted|repair_branch_rejected|repair_branch_invalid|no_pending_repair_branch)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

repair_branch_adoption_open() {
	local state
	[ -s "$REPAIR_ADOPTIONS" ] || return 1
	repair_branch_adopted_to_release_candidate && return 1
	state=$(awk -F '\t' 'NR > 1 { state = $8 } END { print state }' "$REPAIR_ADOPTIONS" 2>/dev/null)
	case "$state" in
		central_present|central_present_alias|imported|fetch_failed|name_conflict)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

repair_branch_adopted_to_release_candidate() {
	local rc_branch=$RELEASE_CANDIDATE_BRANCH row repair_branch adopted_branch source_repo source_head central_head state head rc_head
	[ -s "$REPAIR_ADOPTIONS" ] || return 1
	row=$(
		awk -F '\t' '
			NR > 1 && $8 ~ /^(central_present|central_present_alias|imported)$/ {
				row = $0
			}
			END {
				if (row != "") print row
			}
		' "$REPAIR_ADOPTIONS" 2>/dev/null
	)
	[ -n "$row" ] || return 1
	IFS=$'\t' read -r _generated_at _lane repair_branch adopted_branch source_repo source_head central_head state _next_action _classification _report <<< "$row"
	head=${central_head:-$source_head}
	[ -n "$head" ] || return 1
	if [ -s "$LOCAL_PUBLISH_MANIFEST" ] &&
		awk -F '\t' -v head="$head" -v repair_branch="$repair_branch" -v adopted_branch="$adopted_branch" '
			NR > 1 && $4 == "refs/heads/js2/all-merged-rebased-20260701" &&
				($5 == head || index($5, head) == 1 || index(head, $5) == 1) &&
				($6 == repair_branch || (adopted_branch != "" && $6 == adopted_branch)) &&
				$9 ~ /^(pushed|already_present|exact-local-confirmed)$/ {
				found = 1
			}
			END { exit found ? 0 : 1 }
		' "$LOCAL_PUBLISH_MANIFEST"; then
		return 0
	fi
	for repo in "$SRC" "$CONTINUATION_SRC" "$source_repo"; do
		[ -n "$repo" ] || continue
		git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || continue
		rc_head=$(git -C "$repo" rev-parse --verify --quiet "$rc_branch^{commit}" 2>/dev/null || true)
		if [ -n "$rc_head" ] && git -C "$repo" merge-base --is-ancestor "$head" "$rc_head" 2>/dev/null; then
			return 0
		fi
	done
	return 1
}

repair_branch_base_ref() {
	local branch=$1 base
	base=$(git -C "$CONTINUATION_SRC" merge-base "$RELEASE_CANDIDATE_BRANCH" "$branch" 2>/dev/null || true)
	if [ -z "$base" ]; then
		base=$(git -C "$SRC" rev-parse --verify --quiet "$branch^" 2>/dev/null || true)
	fi
	printf '%s' "$base"
}

repair_branch_adoption_summary() {
	[ -s "$REPAIR_ADOPTIONS" ] || return 1
	awk -F '\t' '
		NR > 1 {
			lane = $2
			branch = $3
			adopted = $4
			source = $5
			source_head = $6
			central_head = $7
			state = $8
			classification = $10
			report = $11
		}
		END {
			if (branch != "") {
				printf "lane=%s branch=%s adopted_branch=%s state=%s source=%s source_head=%s central_head=%s classification=%s report=%s",
					lane, branch, adopted ? adopted : "none", state, source, source_head ? source_head : "missing", central_head ? central_head : "missing", classification, report
			}
		}
	' "$REPAIR_ADOPTIONS" 2>/dev/null
}

latest_pr07c_owner_replay_ready_report() {
	local indexed
	if artifact_index_fresh; then
		indexed=$(latest_indexed_artifact report 'pr07c.*owner.*replay.*/report[.]md' || true)
		if [ -n "$indexed" ]; then
			printf '%s\n' "$indexed"
			return 0
		fi
	fi
	find "$PR_SPLIT_BASE/runs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null |
		sort |
		tail -20 |
		while IFS= read -r run_dir; do
			find "$run_dir/jobs/outputs" -maxdepth 3 -path '*pr07c*owner*replay*/report.md' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

pr07c_readiness_resolved() {
	local class direct_path report
	direct_path=$(latest_continuation_classification pr07c-browser-env || true)
	if [ -n "$direct_path" ]; then
		class=$(awk -F '\t' 'NR > 1 && $1 == "pr07c-browser-env" { print $2; exit }' "$direct_path" 2>/dev/null || true)
		if [ "$class" = "repaired_ready" ]; then
			return 0
		fi
	fi
	class=$(lane_classification_value pr07c-browser-env || true)
	if [ "$class" = "repaired_ready" ]; then
		return 0
	fi
	report=$(latest_pr07c_owner_replay_ready_report || true)
	[ -n "$report" ] || return 1
	rg -qi 'status:[[:space:]]*`?PASS`?' "$report" 2>/dev/null || return 1
	rg -qi 'readiness_failure_matches:[[:space:]]*`?0`?' "$report" 2>/dev/null || return 1
	return 0
}

pr07c_owner_matrix_consumed_by_progress() {
	local progress=$PR_PROGRESS_BASE/current-pr-progress.tsv
	[ -s "$progress" ] || return 1
	awk -F '\t' '
		NR > 1 && $2 == "pr07c-owner-matrix" &&
			$5 == "runtime-held-consumed" {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$progress" 2>/dev/null
}

resource_reason() {
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local reason
	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	printf '%s' "${reason:-unknown}"
}

allow_heavy_work() {
	[ -x "$GLOBAL_ADMISSION" ] || {
		case "$(resource_reason)" in
			severe_pressure|high_pressure|pressure|unknown)
				return 1
				;;
			*)
				return 0
				;;
		esac
	}
	"$GLOBAL_ADMISSION" allow pr-validation critical-path-pr-executor >/dev/null 2>&1
}

allow_critical_browser_preflight() {
	[ "$ENABLE_BROWSER_PREFLIGHT" = 1 ] || return 1
	allow_heavy_work
}

latest_local_publish_summary() {
	if [ ! -s "$LOCAL_PUBLISH_MANIFEST" ]; then
		printf 'missing'
		return
	fi
	awk -F '\t' '
		NR > 1 && NF >= 5 { rows++; last = $1 }
		END {
			if (rows > 0) {
				printf "rows=%d latest=%s", rows, last
			} else {
				printf "empty"
			}
		}
	' "$LOCAL_PUBLISH_MANIFEST"
}

latest_pr17_classification() {
	latest_continuation_classification pr17-1020002
}

pr17_terminal_downscoped() {
	local classification class
	classification=$(latest_pr17_classification || true)
	[ -n "$classification" ] || return 1
	class=$(awk -F '\t' 'NR > 1 && $1 == "pr17-1020002" { print $2; exit }' "$classification" 2>/dev/null)
	[ "$class" = "reclassify_downscope_not_product_owned" ]
}

fresh_pr17_product_evidence_after_terminal() {
	local classification file class_mtime
	classification=$(latest_pr17_classification || true)
	[ -n "$classification" ] || return 1
	if artifact_index_fresh; then
		class_mtime=$(file_mtime "$classification")
		awk -F '\t' -v class_mtime="$class_mtime" '
			NR > 1 && $1 > class_mtime && ($4 == "classification" || $4 == "report" || $4 == "validation") {
				print $6
			}
		' "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null |
		while IFS= read -r file; do
			case "$file" in
				*/continuations/pr17-1020002/classification.tsv|*/continuations/pr17-1020002/report.md)
					continue
					;;
			esac
			if rg -qi '1020002.*(fresh product evidence|product-owned|product owned|product branch|head_sha|owning head)|fresh.*1020002.*product' "$file" 2>/dev/null; then
				printf '%s\n' "$file"
				return 0
			fi
		done |
		sed -n '1p'
		return 0
	fi
	{
		recent_executor_run_dirs
		find "$PR_SPLIT_BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' 2>/dev/null |
			sort -n |
			tail -40 |
			cut -f2-
	} |
	while IFS= read -r scan_dir; do
		[ -n "$scan_dir" ] || continue
		timeout --kill-after=2s "$FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS" \
			find "$scan_dir" -maxdepth 6 -type f \
				\( -name 'classification.tsv' -o -name 'report.md' -o -name 'validation-head.tsv' -o -name 'validation-checks.tsv' \) \
				-size +0c -newer "$classification" -print 2>/dev/null || true
	done |
		while IFS= read -r file; do
			case "$file" in
				*/continuations/pr17-1020002/classification.tsv|*/continuations/pr17-1020002/report.md)
					continue
					;;
			esac
			if rg -qi '1020002.*(fresh product evidence|product-owned|product owned|product branch|head_sha|owning head)|fresh.*1020002.*product' "$file" 2>/dev/null; then
				printf '%s\n' "$file"
				return 0
			fi
		done |
		sed -n '1p'
}

pr17_suppressed_terminal() {
	pr17_terminal_downscoped || return 1
	[ -z "$(fresh_pr17_product_evidence_after_terminal || true)" ]
}

latest_lane_classification() {
	local lane=$1
	latest_continuation_classification "$lane"
}

lane_classification_value() {
	local lane=$1 path class
	path=$(latest_lane_classification "$lane" || true)
	[ -n "$path" ] || return 1
	class=$(awk -F '\t' -v lane="$lane" 'NR > 1 && $1 == lane { print $2; exit }' "$path" 2>/dev/null)
	[ -n "$class" ] || return 1
	printf '%s' "$class"
}

lane_terminal_suppressed() {
	local lane=$1 class
	class=$(lane_classification_value "$lane" || true)
	case "$lane:$class" in
		pr17-1020002:reclassify_downscope_not_product_owned|\
		pr07c-browser-env:repaired_ready|\
		seed-5200005-reducer:resolved_by_active_artifacts|\
		seed-1060015-reducer:resolved_by_active_artifact_downscoped)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

canonical_manifest_path() {
	if [ -s "$PUSH_MANIFEST" ]; then
		printf '%s' "$PUSH_MANIFEST"
	elif [ -s "$PR_SPLIT_BASE/runs/20260517T142930Z/jobs/outputs/rtc-cycle276-critical-executor-consume-cycle274-manifest-and-queue-proof/push-manifest.tsv" ]; then
		printf '%s' "$PR_SPLIT_BASE/runs/20260517T142930Z/jobs/outputs/rtc-cycle276-critical-executor-consume-cycle274-manifest-and-queue-proof/push-manifest.tsv"
	fi
}

canonical_manifest_branches() {
	local manifest
	manifest=$(canonical_manifest_path || true)
	[ -n "$manifest" ] || return 1
	awk -F '\t' '
		NR == 1 { next }
		{
			branch = $2
			publication = $9
			cycle_status = $11
			if (branch == "") {
				next
			}
			if (cycle_status == "accept" || publication ~ /^publishable-/ || publication == "publishable-main-spine-or-pr05c-adjacent") {
				print branch
			}
		}
	' "$manifest" | awk '!seen[$0]++'
}


active_split_text() {
	[ -s "$ACTIVE_SPLIT_FILE" ] || return 0
	awk '
		/^## Cycle [0-9]+ Review Update/ { start = NR }
		{ lines[NR] = $0 }
		END {
			if (!start) {
				exit
			}
			for (i = start; i <= NR; i++) {
				if (i > start && lines[i] ~ /^## Cycle [0-9]+ Review Update/) {
					exit
				}
				print lines[i]
			}
		}
	' "$ACTIVE_SPLIT_FILE"
}

active_branch_allowed() {
	local branch=$1
	case "$branch" in
		cycle264/pr05d-clean-base/semicolonless-entity-validation|\
		finalized/cycle268/no-pr03b/rtc-*|\
		finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b|\
		finalized/cycle268/sidecar/rtc-pr07c-reload-record-snapshots|\
		ready-pr03b/rtc-pr01-*|\
		ready-pr03b/rtc-pr02-*|\
		ready-pr03b/rtc-pr03-*)
			return 0
			;;
		ready/rtc-pr06b-*|ready/rtc-pr07c-*|ready/rtc-pr15a-fallback-group-move-green|\
		ready/rtc-pr15b-fallback-group-insert-anchor-green|ready/rtc-pr15c-fallback-group-delete-green|\
		deferred/rtc-*|fix/rtc-*|try/rtc-*|validation/rtc-*)
			return 1
			;;
		ready/rtc-*|review/rtc-*|pr/rtc-*)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

tmux_sessions() {
	tmux list-sessions -F '#S' 2>/dev/null || true
}

has_session() {
	tmux_sessions | grep -Fxq "$1"
}

tmux_new_session_detached() {
	local session=$1 command=$2
	# Reconcile runs hold fd 8 and the main loop holds fd 9. Detached tmux
	# sessions are long-lived, so close both fds before execing tmux.
	tmux new-session -d -s "$session" "$command" 8>&- 9>&-
}

critical_executor_lock_holders() {
	fuser "$LOCK_FILE" 2>/dev/null | tr -s ' ' ' ' | sed 's/^ //; s/ $//' || true
}

is_critical_executor_process() {
	local pid=$1 args
	args=$(ps -o args= -p "$pid" 2>/dev/null || true)
	case "$args" in
		*"rtc-critical-path-pr-executor-loop.sh"*|*"rtc-critical-path-pr-executor-loop-remote.sh"*|*"/tmp/start_rtc_critical_path_pr_executor_loop.sh"*)
			return 0
			;;
		sleep\ *|*/sleep\ *)
			return 0
			;;
	esac
	return 1
}

clear_stale_executor_lock_holders() {
	local holders pid waited remaining
	has_session "$SESSION" && return 0
	holders=$(critical_executor_lock_holders)
	[ -n "$holders" ] || return 0

	log "clearing stale critical-path executor lock holders without tmux session holders=$holders"
	for pid in $holders; do
		[ "$pid" != "$$" ] || continue
		if is_critical_executor_process "$pid"; then
			kill "$pid" 2>/dev/null || true
		else
			log "leaving non-executor lock holder pid=$pid args=$(ps -o args= -p "$pid" 2>/dev/null || true)"
		fi
	done

	waited=0
	while [ "$waited" -lt 10 ]; do
		remaining=$(critical_executor_lock_holders)
		[ -z "$remaining" ] && return 0
		sleep 1
		waited=$(( waited + 1 ))
	done

	for pid in $remaining; do
		[ "$pid" != "$$" ] || continue
		if is_critical_executor_process "$pid"; then
			log "force-clearing stale critical-path executor lock holder pid=$pid"
			kill -KILL "$pid" 2>/dev/null || true
		fi
	done
}

active_session_matching() {
	local pattern=$1
	tmux_sessions | rg -i "$pattern" | sed -n '1p'
}

continuation_worktree_parts() {
	local cwd=$1 name slug ts
	name=${cwd##*/}
	case "$name" in
		continuation-*) ;;
		*) return 1 ;;
	esac
	ts=$(printf '%s\n' "$name" | sed -n 's/^continuation-\(.*\)-\(20[0-9]\{6\}T[0-9]\{6\}Z\)$/\2/p')
	[ -n "$ts" ] || return 1
	slug=$(printf '%s\n' "$name" | sed -n 's/^continuation-\(.*\)-20[0-9]\{6\}T[0-9]\{6\}Z$/\1/p' | sed 's/-$//')
	[ -n "$slug" ] || return 1
	printf '%s\t%s\t%s\t%s\n' "$name" "$slug" "$ts" "$BASE/runs/$ts/continuations/$slug"
}

process_elapsed_seconds() {
	local pid=$1 elapsed
	elapsed=$(ps -o etimes= -p "$pid" 2>/dev/null | awk '{ print $1 + 0 }')
	printf '%s\n' "${elapsed:-0}"
}

continuation_process_is_stale_orphan() {
	local pid=$1 cwd=$2 parts _name slug ts _run_dir ppid elapsed session
	parts=$(continuation_worktree_parts "$cwd" 2>/dev/null || true)
	[ -n "$parts" ] || return 1
	IFS=$'\t' read -r _name slug ts _run_dir <<EOF
$parts
EOF
	session="rtc-critical-continuation-$slug-$ts"
	has_session "$session" && return 1
	ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | awk '{ print $1 + 0 }')
	[ "${ppid:-0}" -eq 1 ] || return 1
	elapsed=$(process_elapsed_seconds "$pid")
	[ "${elapsed:-0}" -ge "$ORPHANED_CONTINUATION_GRACE_SECONDS" ]
}

write_stale_orphan_continuation_artifacts() {
	local pid=$1 cwd=$2 parts name slug ts run_dir classification report validation repair rc now args elapsed
	parts=$(continuation_worktree_parts "$cwd" 2>/dev/null || true)
	[ -n "$parts" ] || return 0
	IFS=$'\t' read -r name slug ts run_dir <<EOF
$parts
EOF
	mkdir -p "$run_dir"
	classification=$run_dir/classification.tsv
	report=$run_dir/report.md
	validation=$run_dir/validation.tsv
	repair=$run_dir/repair-branch.txt
	rc=$run_dir/rc
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	args=$(ps -o args= -p "$pid" 2>/dev/null | tr '\t\r\n' '   ' || true)
	elapsed=$(process_elapsed_seconds "$pid")
	if [ ! -s "$report" ]; then
		{
			echo "# Stale Orphan Continuation Killed"
			echo
			echo "- lane: $slug"
			echo "- timestamp: $now"
			echo "- pid: $pid"
			echo "- elapsed_seconds: ${elapsed:-0}"
			echo "- worktree: $cwd"
			echo "- reason: tmux session was gone, process was orphaned under PID 1, and no durable classification had been produced."
			echo "- args: ${args:-unknown}"
		} > "$report"
	fi
	if [ ! -s "$validation" ]; then
		printf 'check\tresult\tdetail\tartifact_path\n' > "$validation"
		printf 'tmux_session\tFAIL\tNo rtc-critical-continuation tmux session remained for %s.\t%s\n' "$name" "$report" >> "$validation"
		printf 'orphaned_process\tFAIL\tpid=%s elapsed_seconds=%s parent=1 args=%s\t%s\n' "$pid" "${elapsed:-0}" "${args:-unknown}" "$report" >> "$validation"
	fi
	if [ ! -s "$classification" ]; then
		printf 'lane_id\tclassification\tevidence\tnext_action\tartifact_path\n' > "$classification"
		printf '%s\tstale_orphan_killed\torphaned continuation pid=%s had no tmux session after %ss and produced no durable classification\trelaunch this lane with the current bounded prompt if the blocker is still open\t%s\n' "$slug" "$pid" "${elapsed:-0}" "$report" >> "$classification"
	fi
	[ -s "$repair" ] || printf 'NONE\n' > "$repair"
	[ -s "$rc" ] || printf '124\n' > "$rc"
}

cleanup_stale_continuation_processes() {
	local pid cwd elapsed
	command -v pgrep >/dev/null 2>&1 || return 0
	while IFS= read -r pid; do
		[ -n "$pid" ] || continue
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$BASE"/worktrees/continuation-*) ;;
			*) continue ;;
		esac
		continuation_process_is_stale_orphan "$pid" "$cwd" || continue
		elapsed=$(process_elapsed_seconds "$pid")
		log "killing stale orphaned continuation pid=$pid elapsed=${elapsed:-0}s cwd=$cwd"
		write_stale_orphan_continuation_artifacts "$pid" "$cwd"
		pkill -TERM -P "$pid" 2>/dev/null || true
		kill "$pid" 2>/dev/null || true
		sleep 1
		if kill -0 "$pid" 2>/dev/null; then
			pkill -KILL -P "$pid" 2>/dev/null || true
			kill -KILL "$pid" 2>/dev/null || true
		fi
	done < <(pgrep -f 'codex .*exec --skip-git-repo-check' 2>/dev/null || true)
}

active_continuation_process_matching() {
	local pattern=$1
	local pid cwd name
	command -v pgrep >/dev/null 2>&1 || return 1
	while IFS= read -r pid; do
		[ -n "$pid" ] || continue
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$BASE"/worktrees/continuation-*)
				if continuation_process_is_stale_orphan "$pid" "$cwd"; then
					continue
				fi
				name=${cwd##*/}
				if printf '%s\n%s\n' "$name" "$cwd" | grep -Eiq -- "$pattern"; then
					printf 'process:%s:%s\n' "$pid" "$name"
					return 0
				fi
				;;
		esac
	done < <(pgrep -f 'codex .*exec --skip-git-repo-check' 2>/dev/null || true)
	return 1
}

active_work_matching() {
	local pattern=$1
	local active
	active=$(active_session_matching "$pattern" || true)
	if [ -n "$active" ]; then
		printf '%s\n' "$active"
		return 0
	fi
	active=$(active_continuation_process_matching "$pattern" || true)
	if [ -n "$active" ]; then
		printf '%s\n' "$active"
		return 0
	fi
	return 1
}

active_reload_hydration_exact_session() {
	local hit root
	hit=$(active_work_matching '^rtc-focused-shards-append-reload-hydration.*exact' || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	hit=$(active_work_matching '^rtc-critical-continuation-reload-hydration.*exact|^rtc-deferred-job-reload-hydration.*exact|reload-hydration.*exact' || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	while IFS= read -r root; do
		[ -n "$root" ] || continue
		[ -f "$root/focused-shards.md" ] || continue
		grep -Eiq 'reload-hydration.*exact|exact.*reload-hydration' "$root/focused-shards.md" || continue
		if pgrep -af "$root" >/dev/null 2>&1; then
			printf 'focused-shards-process:%s\n' "$(basename "$root")"
			return 0
		fi
	done < <(
		{
			tac /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-roots.txt 2>/dev/null || true
			ls -td /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/runs/focused-shards-* 2>/dev/null || true
		} | awk 'NF && !seen[$0]++' | sed -n '1,40p'
	)
	return 1
}

reload_hydration_exact_root_matches() {
	local root=$1
	[ -d "$root" ] || return 1
	if [ -f "$root/focused-shards.md" ] && grep -Eiq 'reload-hydration.*exact|exact.*reload-hydration' "$root/focused-shards.md"; then
		return 0
	fi
	compgen -G "$root/focused-title-reload-http-gen-1-*" >/dev/null || return 1
	compgen -G "$root/focused-existing-post-crdt-http-gen-1-*" >/dev/null || return 1
	compgen -G "$root/focused-large-http-lifecycle-gen-1-*" >/dev/null || return 1
}

latest_reload_hydration_exact_replay_root() {
	local root
	while IFS= read -r root; do
		[ -n "$root" ] || continue
		reload_hydration_exact_root_matches "$root" || continue
		printf '%s\n' "$root"
		return 0
	done < <(
		{
			tac /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-roots.txt 2>/dev/null || true
			ls -td /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/runs/focused-shards-* 2>/dev/null || true
		} | awk 'NF && !seen[$0]++' | sed -n '1,40p'
	)
	return 1
}

reload_hydration_exact_replay_completed_root() {
	local root
	root=$(latest_reload_hydration_exact_replay_root || true)
	[ -n "$root" ] || return 1
	node - "$root" <<'NODE' || return 1
const fs = require( 'fs' );
const cp = require( 'child_process' );
const root = process.argv[ 2 ];
let files = [];
try {
	files = cp.execFileSync( 'find', [ root, '-name', 'state.json', '-print' ], { encoding: 'utf8' } )
		.trim()
		.split( /\n/ )
		.filter( Boolean );
} catch ( error ) {
	process.exit( 1 );
}
if ( files.length < 3 ) {
	process.exit( 1 );
}
const now = Date.now();
let allDone = true;
let anyRecent = false;
for ( const file of files ) {
	let state;
	try {
		state = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch ( error ) {
		process.exit( 1 );
	}
	const stopReason = String( state.stopReason || '' );
	const doneReason = stopReason === 'duration-elapsed' || stopReason === 'completed' || stopReason === 'budget-exhausted' || stopReason === 'manual-stop';
	const seedDone = state.currentSeed === null || state.currentSeed === undefined;
	allDone = allDone && doneReason && seedDone;
	const updated = Date.parse( state.lastUpdatedAt || state.updatedAt || '' );
	if ( Number.isFinite( updated ) && now - updated < 12 * 60 * 60 * 1000 ) {
		anyRecent = true;
	}
}
if ( ! allDone || ! anyRecent ) {
	process.exit( 1 );
}
console.log( root );
NODE
}

reload_hydration_exact_replay_mtime() {
	local root=$1
	find "$root" -name state.json -printf '%T@\n' 2>/dev/null |
		sort -n |
		tail -1 |
		awk '{ printf "%d", $1 }'
}

reload_hydration_completed_exact_replay_triaged() {
	local root classification class_mtime replay_mtime
	root=$(reload_hydration_exact_replay_completed_root || true)
	[ -n "$root" ] || return 1
	classification=$(latest_lane_classification reload-hydration || true)
	[ -s "$classification" ] || return 1
	class_mtime=$(file_mtime "$classification")
	replay_mtime=$(reload_hydration_exact_replay_mtime "$root")
	[ -n "$replay_mtime" ] || return 1
	[ "$class_mtime" -ge "$replay_mtime" ] || return 1
	grep -Fq "$root" "$classification" 2>/dev/null
}

reload_hydration_needs_followup() {
	local classification
	classification=$(latest_lane_classification reload-hydration || true)
	[ -s "$classification" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-overall" && $2 == "exact_replay_needs_more_evidence" {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$classification" 2>/dev/null
}

reload_hydration_followup_artifact_current() {
	local classification class_mtime followup
	classification=$(latest_lane_classification reload-hydration || true)
	[ -s "$classification" ] || return 1
	class_mtime=$(file_mtime "$classification")
	followup=$(latest_continuation_classification reload-hydration-followup || true)
	[ -s "$followup" ] || return 1
	[ "$(file_mtime "$followup")" -ge "$class_mtime" ] || return 1
}

latest_reload_hydration_followup_classification() {
	latest_continuation_classification reload-hydration-followup
}

latest_reload_hydration_repair_classification() {
	latest_continuation_classification reload-hydration-repair
}

latest_reload_hydration_reacquire_classification() {
	latest_continuation_classification reload-hydration-reproducer-reacquire
}

reload_hydration_followup_product_bug() {
	local followup
	reload_hydration_followup_artifact_current || return 1
	followup=$(latest_reload_hydration_followup_classification || true)
	[ -s "$followup" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-followup" && $2 == "followup_product_bug" {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$followup" 2>/dev/null
}

reload_hydration_followup_product_bug_artifact() {
	local followup
	followup=$(latest_reload_hydration_followup_classification || true)
	[ -s "$followup" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-followup" && $2 == "followup_product_bug" {
			print $5
			found = 1
			exit
		}
		END { exit found ? 0 : 1 }
	' "$followup" 2>/dev/null
}

reload_hydration_repair_artifact_current() {
	local followup repair
	followup=$(latest_reload_hydration_followup_classification || true)
	[ -s "$followup" ] || return 1
	repair=$(latest_continuation_classification reload-hydration-repair || true)
	[ -s "$repair" ] || return 1
	[ "$(file_mtime "$repair")" -ge "$(file_mtime "$followup")" ] || return 1
}

reload_hydration_repair_blocked_specific_current() {
	local repair
	reload_hydration_repair_artifact_current || return 1
	repair=$(latest_reload_hydration_repair_classification || true)
	[ -s "$repair" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-repair" && $2 == "blocked_specific" {
			found = 1
		}
		END { exit found ? 0 : 1 }
		' "$repair" 2>/dev/null
}

reload_hydration_reacquire_artifact_current() {
	local repair reacquire
	repair=$(latest_reload_hydration_repair_classification || true)
	[ -s "$repair" ] || return 1
	reacquire=$(latest_reload_hydration_reacquire_classification || true)
	[ -s "$reacquire" ] || return 1
	[ "$(file_mtime "$reacquire")" -ge "$(file_mtime "$repair")" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-reproducer-reacquire" &&
			$2 ~ /^(exact_reproducer_reacquired|replay_backed_downscope|exact_reproducer_not_reproduced|product_bug_reduced|blocked_specific)$/ {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$reacquire" 2>/dev/null
}

reload_hydration_reacquire_status() {
	local reacquire
	reacquire=$(latest_reload_hydration_reacquire_classification || true)
	[ -s "$reacquire" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-reproducer-reacquire" {
			print $2
			found = 1
			exit
		}
		END { exit found ? 0 : 1 }
	' "$reacquire" 2>/dev/null
}

reload_hydration_reacquire_artifact_path() {
	local reacquire
	reacquire=$(latest_reload_hydration_reacquire_classification || true)
	[ -s "$reacquire" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "reload-hydration-reproducer-reacquire" {
			print $5
			found = 1
			exit
		}
		END { exit found ? 0 : 1 }
	' "$reacquire" 2>/dev/null
}

reload_hydration_reacquired_repair_needed() {
	local repair reacquire status
	reload_hydration_reacquire_artifact_current || return 1
	status=$(reload_hydration_reacquire_status || true)
	[ "$status" = "exact_reproducer_reacquired" ] || return 1
	repair=$(latest_reload_hydration_repair_classification || true)
	reacquire=$(latest_reload_hydration_reacquire_classification || true)
	[ -s "$reacquire" ] || return 1
	[ -s "$repair" ] || return 0
	[ "$(file_mtime "$repair")" -lt "$(file_mtime "$reacquire")" ]
}

active_count_matching() {
	local pattern=$1
	tmux_sessions | awk -v pat="$pattern" 'tolower($0) ~ tolower(pat) { count++ } END { print count + 0 }'
}

active_continuation_identity_count() {
	local pid cwd name
	{
		tmux list-sessions -F '#S' 2>/dev/null |
			sed -n 's/^rtc-critical-continuation-//p'
		if command -v pgrep >/dev/null 2>&1; then
			while IFS= read -r pid; do
				[ -n "$pid" ] || continue
				cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
				case "$cwd" in
					"$BASE"/worktrees/continuation-*)
						continuation_process_is_stale_orphan "$pid" "$cwd" && continue
						name=${cwd##*/continuation-}
						printf '%s\n' "$name"
						;;
				esac
			done < <(pgrep -f 'codex .*exec --skip-git-repo-check' 2>/dev/null || true)
		fi
	} | awk 'NF && !seen[$0]++ { count++ } END { print count + 0 }'
}

task_recently_launched() {
	local dedupe=$1 interval=${2:-$MIN_TASK_INTERVAL_SECONDS} now
	now=$(date -u +%s)
	awk -F '\t' -v key="$dedupe" -v now="$now" -v interval="$interval" '
		$4 == key { last = $1 }
		END { exit !(last != "" && now - last < interval) }
	' "$LAUNCHES" 2>/dev/null
}

append_launch() {
	local kind=$1 session=$2 dedupe=$3 run_dir=$4
	printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$kind" "$session" "$dedupe" "$run_dir" >> "$LAUNCHES"
}

active_continuation_artifact_pending() {
	local file=$1 sessions_tmp rc
	[ -s "$LAUNCHES" ] || return 1
	sessions_tmp=$(mktemp "$BASE/active-sessions.XXXXXX")
	tmux_sessions | awk -F: '{ print $1 }' > "$sessions_tmp"
	set +e
	awk -F '\t' -v file="$file" '
		NR == FNR {
			active[$1] = 1
			next
		}
		$2 == "continuation" && active[$3] && $5 != "" {
			prefix = $5 "/"
			if (index(file, prefix) == 1) found = 1
		}
		END { exit found ? 0 : 1 }
	' "$sessions_tmp" "$LAUNCHES" 2>/dev/null
	rc=$?
	set -e
	rm -f "$sessions_tmp"
	return "$rc"
}

benchmark_feedback_present() {
	[ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.md" ] || [ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ]
}

benchmark_promotion_blocked() {
	[ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				cols[tolower($i)] = i
			}
			next
		}
		function value(name) {
			return (name in cols) ? $(cols[name]) : ""
		}
		function failed_reps_count(value) {
			gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
			return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
		}
		NR > 1 {
			status = tolower(value("status") " " value("result"))
			failure_type = tolower(value("failure_type"))
			reps_failed = value("reps_failed")
			if (reps_failed == "") {
				reps_failed = value("failed_reps")
			}
			repair_or_priority = tolower(value("repair_or_priority") " " value("priority"))
			line = tolower($0)
			if (status ~ /promotion_blocked|known_bad_canary/ || line ~ /(^|\t)(promotion_blocked|known_bad_canary)(\t|$)/) {
				found = 1
			}
			if (failed_reps_count(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) {
				found = 1
			}
			if (failed_reps_count(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/) {
				found = 1
			}
		}
		END { exit found ? 0 : 1 }
	' "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
}

benchmark_exact_stack_status_all_green() {
	local status_file=$1
	[ -s "$status_file" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) cols[tolower($i)] = i
			next
		}
		NR > 1 {
			rows++
			status = cols["status"] ? $(cols["status"]) : $4
			if (status != "exact_stack_green" && status != "downscoped_replacement_green") bad++
		}
		END { exit (rows > 0 && bad == 0) ? 0 : 1 }
	' "$status_file"
}

benchmark_exact_stack_status_covers_blocked_feedback() {
	local status_file=$1 feedback_file=${2:-$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv}
	[ -s "$status_file" ] && [ -s "$feedback_file" ] || return 1
	awk -F '\t' '
		function trim(value) {
			gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
			return value
		}
		function normalize_row(value) {
			value = trim(value)
			sub(/\/rep[0-9]+$/, "", value)
			return value
		}
		function failed_reps_count(value) {
			value = trim(value)
			return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
		}
		function status_value(name, fallback) {
			return (name in status_cols) ? $(status_cols[name]) : fallback
		}
		function feedback_value(name) {
			return (name in feedback_cols) ? $(feedback_cols[name]) : ""
		}
		function has_downscope_evidence(value, lower) {
			lower = tolower(value)
			return lower ~ /downscope|replacement|narrower|smaller|exact[-_ ]?stack|green/
		}
		FNR == NR {
			if (FNR == 1) {
				for (i = 1; i <= NF; i++) status_cols[tolower($i)] = i
				next
			}
			status = status_value("status", $4)
			if (status != "exact_stack_green" && status != "downscoped_replacement_green") next
			row = normalize_row(status_value("row", $1))
			branch = trim(status_value("branch", $2))
			commit = trim(status_value("commit", $3))
			evidence = status_value("evidence", "") " " status_value("next_action", "")
			if (row == "") next
			if (status == "exact_stack_green" && branch != "" && commit != "") {
				exact[branch "\034" commit "\034" row] = 1
			}
			if (status == "downscoped_replacement_green" && has_downscope_evidence(evidence)) {
				downscoped[row] = 1
			}
			next
		}
		FNR == 1 {
			for (i = 1; i <= NF; i++) feedback_cols[tolower($i)] = i
			next
		}
		FNR > 1 {
			line = tolower($0)
			status_text = tolower(feedback_value("status") " " feedback_value("result") " " feedback_value("benchmark_status") " " feedback_value("required_controller_effect"))
			failure_type = tolower(feedback_value("failure_type"))
			reps_failed = feedback_value("reps_failed")
			if (reps_failed == "") reps_failed = feedback_value("failed_reps")
			repair_or_priority = tolower(feedback_value("repair_or_priority") " " feedback_value("priority"))
			blocked = 0
			if (status_text ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
				line ~ /(^|\t)(promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable)(\t|$)/) {
				blocked = 1
			}
			if (failed_reps_count(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) blocked = 1
			if (failed_reps_count(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/) blocked = 1
			if (! blocked) next

			row = normalize_row(feedback_value("row"))
			if (row == "") row = normalize_row(feedback_value("failing_row"))
			if (row == "") row = normalize_row(feedback_value("failure_row"))
			if (row == "") row = normalize_row(feedback_value("equivalent_lane"))
			if (row == "") row = normalize_row(feedback_value("test"))
			branch = trim(feedback_value("branch"))
			if (branch == "") branch = trim(feedback_value("failure_branch"))
			if (branch == "") branch = trim(feedback_value("failing_branch"))
			commit = trim(feedback_value("current_ref_commit"))
			if (commit == "") commit = trim(feedback_value("branch_commit"))
			if (commit == "") commit = trim(feedback_value("commit"))
			if (commit == "") commit = trim(feedback_value("active_failure_commit"))
			if (commit == "") commit = trim(feedback_value("failing_commit"))
			blocked_rows++
			if (row == "" || branch == "" || commit == "") {
				missing++
				next
			}
			if (exact[branch "\034" commit "\034" row] || downscoped[row]) next
			uncovered++
		}
		END { exit (blocked_rows > 0 && missing == 0 && uncovered == 0) ? 0 : 1 }
	' "$status_file" "$feedback_file"
}

benchmark_exact_stack_green_current() {
	local classification exact_status feedback
	feedback="$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
	[ -s "$feedback" ] || return 1
	classification=$(latest_benchmark_classification || true)
	[ -n "$classification" ] && [ -s "$classification" ] || return 1
	[ "$classification" -nt "$feedback" ] || return 1
	exact_status="${classification%/*}/exact-stack-status.tsv"
	[ -s "$exact_status" ] || return 1
	[ "$exact_status" -nt "$feedback" ] || return 1
	awk -F '\t' '
		NR > 1 && $1 == "benchmark-canary-fuzzer-gap" && $2 == "exact_stack_green" {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$classification" || return 1
	benchmark_exact_stack_status_all_green "$exact_status" || return 1
	benchmark_exact_stack_status_covers_blocked_feedback "$exact_status" "$feedback"
}

latest_benchmark_coverage_status() {
	local output_dir status
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		output_dir=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
		status="${output_dir%/}/benchmark-canary-coverage-status.tsv"
		if [ -s "$status" ]; then
			printf '%s\n' "$status"
			return 0
		fi
	fi
	find "$COVERAGE_BASE" -maxdepth 2 -type f -name 'benchmark-canary-coverage-status.tsv' -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_coverage_output_dir() {
	local output_dir
	[ -s "$COVERAGE_BASE/current-output-dir.txt" ] || return 1
	output_dir=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "${output_dir:-}" ] && [ -d "$output_dir" ] || return 1
	printf '%s\n' "$output_dir"
}

latest_coverage_novelty_status() {
	local output_dir status
	output_dir=$(latest_coverage_output_dir || true)
	[ -n "$output_dir" ] || return 1
	status="${output_dir%/}/novelty-status.md"
	[ -s "$status" ] || return 1
	printf '%s\n' "$status"
}

latest_coverage_novelty_log() {
	local output_dir log_file
	output_dir=$(latest_coverage_output_dir || true)
	[ -n "$output_dir" ] || return 1
	log_file="${output_dir%/}/novelty-monitor.log"
	[ -s "$log_file" ] || return 1
	printf '%s\n' "$log_file"
}

latest_coverage_state_file() {
	local output_dir state_file
	output_dir=$(latest_coverage_output_dir || true)
	[ -n "$output_dir" ] || return 1
	state_file="${output_dir%/}/novelty-state.json"
	[ -s "$state_file" ] || return 1
	printf '%s\n' "$state_file"
}

latest_coverage_supervisor_state_file() {
	local output_dir state_file
	output_dir=$(latest_coverage_output_dir || true)
	[ -n "$output_dir" ] || return 1
	state_file="${output_dir%/}/supervisor-state.json"
	[ -s "$state_file" ] || return 1
	printf '%s\n' "$state_file"
}

coverage_run_age_seconds() {
	local output_dir base stamp epoch now
	output_dir=$(latest_coverage_output_dir || true)
	[ -n "$output_dir" ] || {
		printf '0'
		return
	}
	base=${output_dir##*/}
	stamp=${base#run-}
	if [[ "$stamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
		epoch=$(date -u -d "${stamp:0:4}-${stamp:4:2}-${stamp:6:2} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2}" +%s 2>/dev/null || printf '0')
	else
		epoch=$(file_mtime "$output_dir")
	fi
	now=$(date -u +%s)
	if [ "${epoch:-0}" -gt 0 ] && [ "$now" -ge "$epoch" ]; then
		printf '%s' "$(( now - epoch ))"
	else
		printf '0'
	fi
}

coverage_startup_pending_stale_open() {
	local status age
	status=$(latest_coverage_novelty_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	grep -q 'pending until first pass' "$status" || return 1
	age=$(coverage_run_age_seconds)
	[ "${age:-0}" -ge "$COVERAGE_STARTUP_PENDING_MAX_SECONDS" ] || return 1
	return 0
}

coverage_monitor_pass_failure_open() {
	local log_file
	log_file=$(latest_coverage_novelty_log || true)
	[ -n "$log_file" ] && [ -s "$log_file" ] || return 1
	tail -n "$COVERAGE_MONITOR_FAILURE_SCAN_LINES" "$log_file" 2>/dev/null |
		grep -Eiq 'pass failed:|RangeError: Invalid string length|JavaScript heap out of memory|Cannot create a string longer than'
}

coverage_state_oversized_open() {
	local state_file size
	state_file=$(latest_coverage_state_file || true)
	[ -n "$state_file" ] && [ -s "$state_file" ] || return 1
	size=$(file_size "$state_file")
	[ "${size:-0}" -gt "$COVERAGE_NOVELTY_STATE_MAX_BYTES" ]
}

coverage_supervisor_state_missing_open() {
	coverage_startup_pending_stale_open || return 1
	latest_coverage_supervisor_state_file >/dev/null 2>&1 && return 1
	return 0
}

coverage_materialization_liveness_open() {
	local status
	status=$(latest_coverage_novelty_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	if coverage_monitor_pass_failure_open ||
		coverage_startup_pending_stale_open ||
		coverage_state_oversized_open ||
		coverage_supervisor_state_missing_open; then
		return 0
	fi
	awk '
		/- unmet goals:/ { unmet = $4 + 0 }
		/- current-run active dirs:/ { active_dirs = $5 + 0 }
		/- current-run records by profile: \{\}/ { empty_records = 1 }
		/- current-run successful records by profile: \{\}/ { empty_success = 1 }
		/- quality issue passes:/ {
			split($0, parts, ": ")
			split(parts[2], values, " / ")
			quality_passes = values[1] + 0
			quality_threshold = values[2] + 0
		}
		/enabled profile "block-gauntlet" has produced 0 ingested behavioral records/ { zero_enabled_profile = 1 }
		END {
			if (unmet > 0 &&
				active_dirs == 0 &&
				empty_records &&
				empty_success &&
				((quality_threshold > 0 && quality_passes > quality_threshold) || zero_enabled_profile)) {
				exit 0
			}
			exit 1
		}
	' "$status"
}

coverage_materialization_liveness_summary() {
	local status log_file state_file state_size supervisor_state run_age failure_summary startup_pending
	status=$(latest_coverage_novelty_status || true)
	[ -n "$status" ] && [ -s "$status" ] || {
		printf 'novelty-status.md missing under %s' "$(latest_coverage_output_dir 2>/dev/null || printf "$COVERAGE_BASE/current-output-dir.txt")"
		return 0
	}
	log_file=$(latest_coverage_novelty_log || true)
	state_file=$(latest_coverage_state_file || true)
	supervisor_state=$(latest_coverage_supervisor_state_file || true)
	state_size=0
	[ -n "$state_file" ] && state_size=$(file_size "$state_file")
	run_age=$(coverage_run_age_seconds)
	startup_pending=$(grep -q 'pending until first pass' "$status" && printf yes || printf no)
	failure_summary=""
	if [ -n "$log_file" ] && [ -s "$log_file" ]; then
		failure_summary=$(tail -n "$COVERAGE_MONITOR_FAILURE_SCAN_LINES" "$log_file" 2>/dev/null |
			grep -E 'pass failed:|RangeError: Invalid string length|JavaScript heap out of memory|Cannot create a string longer than' |
			tail -1 |
			tr '\t\r\n' '   ' || true)
	fi
	awk -v run_age="$run_age" -v startup_pending="$startup_pending" -v state_size="$state_size" -v state_max="$COVERAGE_NOVELTY_STATE_MAX_BYTES" -v supervisor_state="${supervisor_state:-missing}" -v failure_summary="${failure_summary:-none}" '
		/- unmet goals:/ { unmet = $4 + 0 }
		/- current-run active dirs:/ { active_dirs = $5 + 0 }
		/- current-run records by profile:/ { records = $0; sub(/^.*: /, "", records) }
		/- current-run successful records by profile:/ { success = $0; sub(/^.*: /, "", success) }
		/- quality issue passes:/ { quality = $0; sub(/^.*: /, "", quality) }
		/enabled profile "block-gauntlet" has produced 0 ingested behavioral records/ { block_gauntlet_zero = "yes" }
		END {
			printf "run_age_seconds=%s startup_pending=%s state_bytes=%s state_max_bytes=%s supervisor_state=%s monitor_failure=%s unmet_goals=%s active_dirs=%s records=%s successful_records=%s quality_issue_passes=%s block_gauntlet_zero=%s status=%s",
				run_age,
				startup_pending,
				state_size,
				state_max,
				supervisor_state,
				failure_summary,
				unmet + 0,
				active_dirs + 0,
				(records == "" ? "unknown" : records),
				(success == "" ? "unknown" : success),
				(quality == "" ? "unknown" : quality),
				(block_gauntlet_zero == "" ? "no" : block_gauntlet_zero),
				FILENAME
		}
	' "$status"
}

plain_editor_product_smoke_resolved_by_continuation() {
	local status=${1:-} classification class class_mtime status_mtime
	classification=$(latest_continuation_classification plain-editor-product-smoke || true)
	[ -s "$classification" ] || return 1
	class=$(awk -F '\t' 'NR > 1 && $1 == "plain-editor-product-smoke" { print $2; exit }' "$classification" 2>/dev/null)
	case "$class" in
		smoke_green|harness_or_scheduler_repaired)
			;;
		*)
			return 1
			;;
	esac
	class_mtime=$(file_mtime "$classification")
	if [ -n "$status" ] && [ -s "$status" ]; then
		status_mtime=$(file_mtime "$status")
		[ "${class_mtime:-0}" -ge "${status_mtime:-0}" ] || return 1
	fi
	return 0
}

plain_editor_product_smoke_open() {
	local status
	status=$(latest_coverage_novelty_status || true)
	plain_editor_product_smoke_resolved_by_continuation "$status" && return 1
	[ -n "$status" ] && [ -s "$status" ] || return 0
	awk '
		/- current-run successful records by profile:/ {
			if ($0 ~ /"plain-editor-product-smoke":[1-9][0-9]*/) success = 1
		}
		/novelty-http-plain-editor-product-smoke:/ {
			if ($0 ~ /(product-evidence|collaboration_non_convergence|raw-family|assertion|untriaged|failure|error|timeout)/) red = 1
		}
		END {
			if (!success || red) exit 0
			exit 1
		}
	' "$status"
}

plain_editor_product_smoke_summary() {
	local status
	status=$(latest_coverage_novelty_status || true)
	[ -n "$status" ] && [ -s "$status" ] || {
		printf 'novelty-status.md missing under %s' "$(latest_coverage_output_dir 2>/dev/null || printf "$COVERAGE_BASE/current-output-dir.txt")"
		return 0
	}
	awk '
		/- current-run successful records by profile:/ {
			if (match($0, /"plain-editor-product-smoke":[0-9]+/)) {
				success = substr($0, RSTART, RLENGTH)
			}
		}
		/novelty-http-plain-editor-product-smoke:/ {
			line = $0
			sub(/^- /, "", line)
			if (length(line) > 420) line = substr(line, 1, 420) "..."
			latest = line
		}
		END {
			if (latest != "") {
				printf "%s; %s", success ? success : "plain-editor-product-smoke success missing", latest
			} else {
				printf "%s; no current plain-editor-product-smoke gate line", success ? success : "plain-editor-product-smoke success missing"
			}
		}
	' "$status"
}

benchmark_forced_coverage_open() {
	local status
	status=$(latest_benchmark_coverage_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) idx[$i] = i
			if (!idx["promotion_blocked"] || !idx["current_run_green"]) missing = 1
			next
		}
		NR > 1 {
			forced = idx["forced"] ? $(idx["forced"]) : ""
			primary = idx["primary"] ? $(idx["primary"]) : ""
			promotion_blocked = $(idx["promotion_blocked"])
			current_run_green = $(idx["current_run_green"])
			current_run_green_source = idx["current_run_green_source"] ? $(idx["current_run_green_source"]) : ""
			non_sticky_current_run_green = (current_run_green == "yes" && current_run_green_source != "sticky-deadline-current-run-green")
			current_run_group_records = idx["current_run_group_records"] ? $(idx["current_run_group_records"]) + 0 : 0
			current_run_successful_group_records = idx["current_run_successful_group_records"] ? $(idx["current_run_successful_group_records"]) + 0 : 0
			retained_product_evidence = idx["retained_product_evidence"] ? $(idx["retained_product_evidence"]) : ""
			product_evidence_records = idx["product_evidence_records"] ? $(idx["product_evidence_records"]) + 0 : 0
			explicit_downscope = idx["explicit_downscope"] ? $(idx["explicit_downscope"]) : ""
			status_only = idx["status_only"] ? $(idx["status_only"]) : ""
			coverage_state = idx["coverage_state"] ? $(idx["coverage_state"]) : ""
			has_direct_success = (current_run_successful_group_records > 0 || retained_product_evidence == "yes" || product_evidence_records > 0)
			status_only_primary = (forced == "yes" && primary == "yes" &&
				(status_only == "yes" || current_run_green_source == "sticky-deadline-current-run-green") &&
				current_run_group_records == 0)
			if (promotion_blocked == "yes" || status_only_primary) {
				rows++
				if (explicit_downscope != "yes" && coverage_state !~ /downscope/ &&
					((promotion_blocked == "yes" && current_run_green != "yes") ||
					(status_only_primary && !non_sticky_current_run_green && !has_direct_success))) open++
			}
		}
		END {
			if (missing) exit 1
			exit (rows > 0 && open > 0) ? 0 : 1
		}
	' "$status"
}

benchmark_product_failures_open() {
	local status
	status=$(latest_benchmark_coverage_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	awk -F '\t' '
		function is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope) {
			return explicit_downscope != "yes" &&
				coverage_state !~ /downscope/ &&
				(product_records > 0 ||
					retained_product_evidence == "yes" ||
					coverage_state ~ /product-failure/)
		}
		NR == 1 {
			for (i = 1; i <= NF; i++) idx[$i] = i
			next
		}
		NR > 1 {
			product_records = idx["product_evidence_records"] ? $(idx["product_evidence_records"]) + 0 : 0
			retained_product_evidence = idx["retained_product_evidence"] ? $(idx["retained_product_evidence"]) : ""
			coverage_state = idx["coverage_state"] ? $(idx["coverage_state"]) : ""
			explicit_downscope = idx["explicit_downscope"] ? $(idx["explicit_downscope"]) : ""
			promotion_blocked = idx["promotion_blocked"] ? $(idx["promotion_blocked"]) : ""
			current_run_green = idx["current_run_green"] ? $(idx["current_run_green"]) : ""
			if (is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope)) {
				found = 1
			}
		}
		END { exit found ? 0 : 1 }
	' "$status"
}

benchmark_canary_group_product_failure_open() {
	local group=${1:-} status
	[ -n "$group" ] || return 1
	status=$(latest_benchmark_coverage_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	awk -F '\t' -v target_group="$group" '
		function is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope) {
			return explicit_downscope != "yes" &&
				coverage_state !~ /downscope/ &&
				(product_records > 0 ||
					retained_product_evidence == "yes" ||
					coverage_state ~ /product-failure/)
		}
		NR == 1 {
			for (i = 1; i <= NF; i++) idx[$i] = i
			next
		}
		NR > 1 {
			group_name = idx["group"] ? $(idx["group"]) : ""
			if (group_name != target_group) next
			seen = 1
			product_records = idx["product_evidence_records"] ? $(idx["product_evidence_records"]) + 0 : 0
			retained_product_evidence = idx["retained_product_evidence"] ? $(idx["retained_product_evidence"]) : ""
			coverage_state = idx["coverage_state"] ? $(idx["coverage_state"]) : ""
			explicit_downscope = idx["explicit_downscope"] ? $(idx["explicit_downscope"]) : ""
			promotion_blocked = idx["promotion_blocked"] ? $(idx["promotion_blocked"]) : ""
			current_run_green = idx["current_run_green"] ? $(idx["current_run_green"]) : ""
			if (is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope)) {
				found = 1
			}
		}
		END { exit (seen && found) ? 0 : 1 }
	' "$status"
}

benchmark_product_failure_signature() {
	local status
	status=$(latest_benchmark_coverage_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	awk -F '\t' '
		function is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope) {
			return explicit_downscope != "yes" &&
				coverage_state !~ /downscope/ &&
				(product_records > 0 ||
					retained_product_evidence == "yes" ||
					coverage_state ~ /product-failure/)
		}
		NR == 1 {
			for (i = 1; i <= NF; i++) idx[$i] = i
			next
		}
		NR > 1 {
			group_name = idx["group"] ? $(idx["group"]) : $1
			cases = idx["cases"] ? $(idx["cases"]) : ""
			product_records = idx["product_evidence_records"] ? $(idx["product_evidence_records"]) + 0 : 0
			retained_product_evidence = idx["retained_product_evidence"] ? $(idx["retained_product_evidence"]) : ""
			coverage_state = idx["coverage_state"] ? $(idx["coverage_state"]) : ""
			explicit_downscope = idx["explicit_downscope"] ? $(idx["explicit_downscope"]) : ""
			promotion_blocked = idx["promotion_blocked"] ? $(idx["promotion_blocked"]) : ""
			current_run_green = idx["current_run_green"] ? $(idx["current_run_green"]) : ""
			if (is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope)) {
				print group_name "\t" cases "\t" coverage_state
			}
		}
	' "$status" | sort
}

benchmark_product_failure_summary() {
	local status
	status=$(latest_benchmark_coverage_status || true)
	[ -n "$status" ] && [ -s "$status" ] || return 1
	awk -F '\t' -v status="$status" '
		function is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope) {
			return explicit_downscope != "yes" &&
				coverage_state !~ /downscope/ &&
				(product_records > 0 ||
					retained_product_evidence == "yes" ||
					coverage_state ~ /product-failure/)
		}
		NR == 1 {
			for (i = 1; i <= NF; i++) idx[$i] = i
			next
		}
		NR > 1 {
			group_name = idx["group"] ? $(idx["group"]) : $1
			product_records = idx["product_evidence_records"] ? $(idx["product_evidence_records"]) + 0 : 0
			retained_product_evidence = idx["retained_product_evidence"] ? $(idx["retained_product_evidence"]) : ""
			coverage_state = idx["coverage_state"] ? $(idx["coverage_state"]) : ""
			explicit_downscope = idx["explicit_downscope"] ? $(idx["explicit_downscope"]) : ""
			promotion_blocked = idx["promotion_blocked"] ? $(idx["promotion_blocked"]) : ""
			current_run_green = idx["current_run_green"] ? $(idx["current_run_green"]) : ""
			if (is_product_failure(product_records, retained_product_evidence, coverage_state, explicit_downscope)) {
				rows++
				total += product_records
				if (!seen[group_name]++) {
					groups = groups (groups == "" ? "" : ",") group_name
				}
			}
		}
		END {
			if (rows > 0) {
				printf "status=%s rows=%d product_evidence_records=%d groups=%s", status, rows, total, groups
			}
		}
	' "$status"
}

benchmark_effective_promotion_blocked() {
	benchmark_promotion_blocked || return 1
	! benchmark_exact_stack_green_current
}

benchmark_feedback_refresh_active() {
	local hit
	hit=$(active_session_matching '^rtc-benchmark-canary-feedback-refresh-' || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	pgrep -af '[b]ash .*/(refresh-current-feedback-command|run-exact-refresh[^[:space:]]*)[.]sh|rtc-benchmark-canary-feedback-20260520/cycles/refresh-[^[:space:]]+' 2>/dev/null | sed -n '1p'
}

benchmark_exact_stack_active() {
	local hit
	hit=$(benchmark_feedback_refresh_active || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	hit=$(active_work_matching '^rtc-critical-continuation-benchmark-canary-fuzzer-gap|benchmark-canary-fuzzer-gap' || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	pgrep -af '[e]xact-stack-worktrees.*(title-reload-http|existing-post-crdt|large-http|ws-code-editor|code-editor)' 2>/dev/null | sed -n '1p'
}

latest_benchmark_classification() {
	local candidate
	candidate=$(
		recent_executor_run_dirs |
			while IFS= read -r run_dir; do
				find "$run_dir/continuations/benchmark-canary-fuzzer-gap" -maxdepth 1 -type f -name 'classification.tsv' -size +0c -printf '%T@\t%p\n' 2>/dev/null
			done |
			sort -n |
			tail -1 |
			cut -f2-
	)
	if [ -n "$candidate" ]; then
		printf '%s\n' "$candidate"
		return 0
	fi
	all_executor_run_dirs |
		while IFS= read -r run_dir; do
			find "$run_dir/continuations/benchmark-canary-fuzzer-gap" -maxdepth 1 -type f -name 'classification.tsv' -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_benchmark_refresh_command() {
	recent_executor_run_dirs |
		while IFS= read -r run_dir; do
			find "$run_dir/continuations/benchmark-canary-fuzzer-gap" -maxdepth 1 -type f \( -name 'refresh-current-feedback-command.sh' -o -name 'run-exact-refresh*.sh' \) -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

launch_benchmark_feedback_refresh() {
	local command active dedupe session ts run_dir runner stdout stderr rc status_file
	benchmark_effective_promotion_blocked || return 1
	command=$(latest_benchmark_refresh_command || true)
	[ -n "$command" ] && [ -s "$command" ] || return 1
	bash -n "$command" >/dev/null 2>&1 || {
		log "benchmark feedback refresh command has syntax errors: $command"
		return 1
	}
	active=$(benchmark_feedback_refresh_active || true)
	[ -z "$active" ] || return 0
	dedupe="benchmark-feedback-refresh-$(file_hash "$command" | cut -c1-12)-$(file_hash "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" | cut -c1-12)"
	if task_recently_launched "$dedupe" 3600; then
		return 0
	fi
	allow_heavy_work || {
		log "benchmark feedback refresh queued but global admission denied command=$command reason=$(resource_reason)"
		return 0
	}
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	session="rtc-benchmark-canary-feedback-refresh-$ts"
	run_dir="$BASE/runs/$ts/feedback-refresh/benchmark-canary-fuzzer-gap"
	mkdir -p "$run_dir"
	runner="$run_dir/run.sh"
	stdout="$run_dir/stdout.log"
	stderr="$run_dir/stderr.log"
	rc="$run_dir/rc"
	status_file="$run_dir/refresh-status.tsv"
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
command="$command"
status_file="$status_file"
stdout="$stdout"
stderr="$stderr"
rc_file="$rc"
mkdir -p "\$(dirname "\$status_file")"
printf 'started_at_utc\tcommand\tstatus\texit_code\tstdout\tstderr\n' > "\$status_file"
started=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
set +e
bash "\$command" > "\$stdout" 2> "\$stderr"
code=\$?
set -e
printf '%s\n' "\$code" > "\$rc_file"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "\$started" "\$command" "\$([ "\$code" -eq 0 ] && printf refreshed || printf failed)" "\$code" "\$stdout" "\$stderr" >> "\$status_file"
exit 0
EOF
	chmod +x "$runner"
	append_launch feedback-refresh "$session" "$dedupe" "$run_dir"
	json_event launch "benchmark feedback refresh command=$command session=$session"
	tmux_new_session_detached "$session" "bash '$runner'"
}

benchmark_classification_only_coverage_repaired() {
	local classification=$1
	[ -n "$classification" ] && [ -s "$classification" ] || return 1
	awk -F '\t' '
		NR > 1 {
			rows++
			if ($2 != "coverage_repaired") other++
		}
		END { exit (rows > 0 && other == 0) ? 0 : 1 }
	' "$classification"
}

resolve_base_ref() {
	if git -C "$SRC" rev-parse --verify -q "$BASE_REF^{commit}" >/dev/null; then
		printf '%s' "$BASE_REF"
	elif git -C "$SRC" rev-parse --verify -q "origin/$BASE_REF^{commit}" >/dev/null; then
		printf '%s' "origin/$BASE_REF"
	elif git -C "$SRC" rev-parse --verify -q "origin/trunk^{commit}" >/dev/null; then
		printf '%s' "origin/trunk"
	else
		printf '%s' "HEAD~1"
	fi
}

resolve_existing_ref() {
	local fallback=$1
	shift || true
	local ref
	for ref in "$@"; do
		[ -n "$ref" ] || continue
		if git -C "$SRC" rev-parse --verify -q "$ref^{commit}" >/dev/null; then
			printf '%s' "$ref"
			return
		fi
	done
	printf '%s' "$fallback"
}

branch_base_ref() {
	local branch=$1 default_base
	default_base=$(resolve_base_ref)
	case "$branch" in
		ready/rtc-pr06b-*|review/rtc-pr06b-*|pr/rtc-pr06b-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr06a-persisted-empty-content-guard" "review/rtc-pr06a-persisted-empty-content-guard" "pr/rtc-pr06a-persisted-empty-content-guard"
			;;
		ready/rtc-pr07c-*|review/rtc-pr07c-*|pr/rtc-pr07c-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr07b-save-response-manager-base-record" "review/rtc-pr07b-save-response-manager-base-record" "pr/rtc-pr07b-save-response-manager-base-record"
			;;
		ready/rtc-pr14b-*|review/rtc-pr14b-*|pr/rtc-pr14b-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr14-table-body-array-green" "review/rtc-pr14-table-body-array-green" "pr/rtc-pr14-table-body-array-green"
			;;
		ready/rtc-pr15a-*|review/rtc-pr15a-*|pr/rtc-pr15a-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr14b-table-query-array-local-suffix-append" "review/rtc-pr14b-table-query-array-local-suffix-append" "pr/rtc-pr14b-table-query-array-local-suffix-append"
			;;
		ready/rtc-pr15b-*|review/rtc-pr15b-*|pr/rtc-pr15b-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr15a-fallback-group-move-green-on-pr14b" "review/rtc-pr15a-fallback-group-move-green-on-pr14b" "pr/rtc-pr15a-fallback-group-move-green-on-pr14b"
			;;
		ready/rtc-pr15c-*|review/rtc-pr15c-*|pr/rtc-pr15c-*)
			resolve_existing_ref "$default_base" "ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b" "review/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b" "pr/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b"
			;;
		*)
			printf '%s' "$default_base"
			;;
	esac
}

candidate_branches() {
	if canonical_manifest_branches >/dev/null 2>&1; then
		canonical_manifest_branches |
			while IFS= read -r branch; do
				[ -n "$branch" ] || continue
				active_branch_allowed "$branch" || continue
				git -C "$SRC" rev-parse --verify -q "$branch^{commit}" >/dev/null || continue
				printf '%s\n' "$branch"
			done |
			head -n "$MAX_VALIDATION_BRANCHES_PER_CYCLE"
		return
	fi
	git -C "$SRC" for-each-ref --sort=-committerdate --format='%(refname:short)' \
		'refs/heads/finalized/cycle268/no-pr03b/rtc-*' \
		'refs/heads/finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b' \
		'refs/heads/finalized/cycle268/sidecar/rtc-pr07c-reload-record-snapshots' \
		'refs/heads/ready-pr03b/rtc-pr0*' \
		'refs/heads/cycle264/pr05d-clean-base/semicolonless-entity-validation' 2>/dev/null |
		awk '!seen[$0]++' |
		while IFS= read -r branch; do
			active_branch_allowed "$branch" || continue
			printf '%s\n' "$branch"
		done |
		head -n "$MAX_VALIDATION_BRANCHES_PER_CYCLE"
}

pr_id_for_branch() {
	local branch=$1 lower
	lower=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]')
	if [[ "$lower" =~ pr([0-9]+[a-z0-9]*) ]]; then
		printf 'PR%s' "${BASH_REMATCH[1]}"
	else
		slugify "$branch" | cut -c1-32
	fi
}

publication_class_for_branch() {
	local branch=$1
	case "$branch" in
		ready/rtc-*|review/rtc-*|pr/rtc-*)
			printf 'product-candidate'
			;;
		rtc/*|rtc-*|repair/*|rtc-benchmark-*)
			printf 'needs-classification'
			;;
		finalize/rtc-*|validation/rtc-*)
			printf 'validation-only'
			;;
		deferred/rtc-*|fix/rtc-*|try/rtc-*)
			printf 'needs-classification'
			;;
		*)
			printf 'unknown'
			;;
	esac
}

write_inputs() {
	local tmp=$INPUTS.$$.tmp
	local latest_finalization latest_progress_unblock latest_deferred_report latest_coverage
	latest_finalization=$(latest_nonempty_file "$FINALIZATION_BASE/cycles" 'finalization.report.md' || true)
	latest_progress_unblock=$(latest_progress_unblock_artifact || true)
	latest_deferred_report=$(latest_nonempty_file "$DEFERRED_BASE/cycles" 'report.md' || true)
	latest_coverage=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	{
		printf 'input_id\trole\tpath\texists\tsize\tmtime\tsha256\tstatus\n'
		while IFS=$'\t' read -r id role path; do
			local exists
			[ -n "$id" ] || continue
			[ -e "$path" ] && exists=1 || exists=0
			printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
				"$id" "$role" "$path" "$exists" "$(file_size "$path")" "$(file_mtime "$path")" "$(file_hash "$path")" "$(input_status "$path")"
		done <<EOF
pr_split_status	status	$PR_SPLIT_BASE/current-pr-split.md
finalization_status	status	$FINALIZATION_BASE/current-finalization-status.md
deferred_status	status	$DEFERRED_BASE/current-deferred-status.md
deferred_queue	queue	$DEFERRED_BASE/current-deferred-queue.tsv
deferred_control	control	$DEFERRED_BASE/current-deferred-control.tsv
coverage_pointer	status	$COVERAGE_BASE/current-output-dir.txt
benchmark_canary_feedback	feedback	$BENCHMARK_FEEDBACK_BASE/current-feedback.md
benchmark_canary_feedback_tsv	feedback	$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
productive_analysis_feedback	feedback	$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.md
productive_analysis_actions	feedback	$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv
productive_analysis_report	report	$PRODUCTIVE_ANALYSIS_BASE/current-report.md
resource_status	status	$RESOURCE_BASE/resource-autoscaler-status.md
guard_log	log	$GUARD_BASE/logs/guard.log
latest_finalization	report	${latest_finalization:-missing}
latest_progress_unblock	artifact	${latest_progress_unblock:-missing}
latest_deferred_report	report	${latest_deferred_report:-missing}
latest_coverage_status	status	${latest_coverage:-missing}/novelty-status.md
latest_local_publish_manifest	publication	$LOCAL_PUBLISH_MANIFEST
repair_branch_adoptions	status	$REPAIR_ADOPTIONS
EOF
	} > "$tmp"
	atomic_move "$tmp" "$INPUTS"
}

write_no_progress() {
	local tmp=$NO_PROGRESS.$$.tmp
	local rejected_at file benchmark_classification
	rejected_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	{
		printf 'artifact_path\treason\tsize\tmtime\tassociated_job\trejected_at\n'
		awk -F '\t' 'NR > 1 && $8 == "zero" { print $3 "\tzero_current_input\t" $5 "\t" $6 "\t" $1 }' "$INPUTS" 2>/dev/null |
			while IFS=$'\t' read -r file reason size mtime job; do
				printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$file" "$reason" "$size" "$mtime" "$job" "$rejected_at"
			done
		recent_executor_run_dirs |
			while IFS= read -r run_dir; do
				find "$run_dir" -maxdepth 6 \
					-type f \( -name '*.md' -o -name '*.tsv' -o -name '*.tmp' \) -size 0c -print 2>/dev/null
			done |
			head -100 |
			while IFS= read -r file; do
				if active_continuation_artifact_pending "$file"; then
					continue
				fi
				printf '%s\tzero_executor_artifact\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
			done
		if benchmark_effective_promotion_blocked; then
			if ! benchmark_exact_stack_active >/dev/null; then
				printf '%s\texact_stack_promotion_blocked_without_active_repair\t%s\t%s\tbenchmark-canary-fuzzer-gap\t%s\n' \
					"$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" "$(file_size "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv")" "$(file_mtime "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv")" "$rejected_at"
			fi
			benchmark_classification=$(latest_benchmark_classification || true)
			if benchmark_classification_only_coverage_repaired "$benchmark_classification"; then
				printf '%s\tcoverage_repaired_without_exact_stack_green\t%s\t%s\tbenchmark-canary-fuzzer-gap\t%s\n' \
					"$benchmark_classification" "$(file_size "$benchmark_classification")" "$(file_mtime "$benchmark_classification")" "$rejected_at"
			fi
		fi
		recent_executor_run_dirs |
			while IFS= read -r run_dir; do
				find "$run_dir" -maxdepth 6 -type f -name '*.tmp' -print 2>/dev/null
			done |
			head -100 |
			while IFS= read -r file; do
				printf '%s\ttmp_executor_artifact\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
			done
		recent_executor_run_dirs |
			while IFS= read -r run_dir; do
				find "$run_dir" -maxdepth 6 -type f -name 'report.md' -size +0c -print 2>/dev/null
			done |
			head -200 |
			while IFS= read -r file; do
				if rg -qi 'disk[- ]preflight[- ]only|pre[- ]oracle|before oracle|runtime.*failed before|report\.tmp|header[- ]only' "$file" 2>/dev/null; then
					printf '%s\tpre_oracle_or_preflight_only\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
				fi
			done
	} > "$tmp"
	atomic_move "$tmp" "$NO_PROGRESS"
}

write_terminal_ledger() {
	local tmp=$TERMINAL_LEDGER.$$.tmp lane classification class
	{
		printf 'lane_id\tclassification\tevidence_path\tevidence_mtime\tqueue_state\treopen_condition\n'
		for lane in pr17-1020002 pr07c-browser-env seed-5200005-reducer seed-1060015-reducer productive-analysis-action; do
			classification=$(latest_lane_classification "$lane" || true)
			[ -n "$classification" ] || continue
			class=$(lane_classification_value "$lane" || true)
			case "$lane:$class" in
				pr17-1020002:reclassify_downscope_not_product_owned)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh rebuilt product evidence for seed 1020002 newer than terminal classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				pr07c-browser-env:repaired_ready)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh PR07C readiness regression or owner replay evidence newer than repaired_ready classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				seed-5200005-reducer:resolved_by_active_artifacts)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh source/replay evidence newer than active artifact resolution\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				seed-1060015-reducer:resolved_by_active_artifact_downscoped)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh browser/source red evidence newer than downscope classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				productive-analysis-action:already_resolved_by_active_artifact|productive-analysis-action:already_resolved_by_active_artifacts|productive-analysis-action:active_artifacts_adopted)
					printf '%s\t%s\t%s\t%s\tterminal\tproductive-analysis feedback newer than terminal classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				productive-analysis-action:controller_generator_repair|productive-analysis-action:downscoped_to_coverage_materialization)
					printf '%s\t%s\t%s\t%s\tterminal\tproductive-analysis feedback newer than terminal controller repair\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
			esac
		done
	} > "$tmp"
	atomic_move "$tmp" "$TERMINAL_LEDGER"
}

adopt_repair_branch_to_src() {
	local branch=$1 source_repo=$2 source_head=$3 dest_branch=$branch central_head fetch_log
	[ -n "$branch" ] || return 1
	[ -n "$source_repo" ] || return 1
	[ -n "$source_head" ] || return 1
	git check-ref-format --branch "$branch" >/dev/null 2>&1 || return 1
	central_head=$(git -C "$SRC" rev-parse --verify --quiet "$branch^{commit}" 2>/dev/null || true)
	if [ -n "$central_head" ]; then
		if [ "$central_head" = "$source_head" ]; then
			printf '%s\tcentral_present\tcentral branch already points at source repair head\n' "$branch"
			return 0
		fi
		dest_branch="repair/adopted-$(slugify "$branch" | cut -c1-44)-$(printf '%s' "$source_head" | cut -c1-12)"
		central_head=$(git -C "$SRC" rev-parse --verify --quiet "$dest_branch^{commit}" 2>/dev/null || true)
		if [ -n "$central_head" ]; then
			if [ "$central_head" = "$source_head" ]; then
				printf '%s\tcentral_present_alias\tcentral alias already points at source repair head\n' "$dest_branch"
				return 0
			fi
			printf '%s\tname_conflict\tbranch and alias exist with different heads\n' "$dest_branch"
			return 1
		fi
	fi
	fetch_log=$BASE/logs/repair-branch-adoptions.log
	if git -C "$SRC" fetch "$source_repo" "refs/heads/$branch:refs/heads/$dest_branch" >> "$fetch_log" 2>&1; then
		printf '%s\timported\timported from %s\n' "$dest_branch" "$source_repo"
		return 0
	fi
	printf '%s\tfetch_failed\tsee %s\n' "$dest_branch" "$fetch_log"
	return 1
}

write_repair_branch_adoptions() {
	local tmp=$REPAIR_ADOPTIONS.$$.tmp now current_candidate_head
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	current_candidate_head=$(git -C "$CONTINUATION_SRC" rev-parse --verify --quiet "$RELEASE_CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	{
		printf 'generated_at\tlane_id\trepair_branch\tadopted_branch\tsource_repo\tsource_head\tcentral_head\tstate\tnext_action\tclassification_path\treport_path\n'
		repair_branch_created_records |
			while IFS=$'\t' read -r mtime lane branch source_repo source_head source_start_head dir classification report; do
				local adopted_branch adoption_state adoption_detail central_head next_action adoption
				if [ -z "$source_head" ]; then
					printf '%s\t%s\t%s\t\t%s\t\t\tmissing-source-branch\trepair_branch_created is invalid: repair branch does not resolve in source repo\t%s\t%s\n' \
						"$now" "$lane" "$branch" "$source_repo" "$classification" "$report"
					continue
				fi
				if [ -n "$source_start_head" ] && [ "$source_head" = "$source_start_head" ]; then
					printf '%s\t%s\t%s\t\t%s\t%s\t\tinvalid-no-committed-delta\trepair_branch_created is invalid: branch points at the continuation source HEAD and has no committed repair delta\t%s\t%s\n' \
						"$now" "$lane" "$branch" "$source_repo" "$source_head" "$classification" "$report"
					continue
				fi
				if [ -n "$current_candidate_head" ] &&
					git -C "$source_repo" cat-file -e "$current_candidate_head^{commit}" 2>/dev/null &&
					git -C "$source_repo" merge-base --is-ancestor "$source_head" "$current_candidate_head" 2>/dev/null; then
					printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\talready-in-release-candidate\trepair head is already an ancestor of the current release candidate; require fresh same-head product proof before reopening\t%s\t%s\n' \
						"$now" "$lane" "$branch" "$branch" "$source_repo" "$source_head" "$source_head" "$classification" "$report"
					continue
				fi
				if [ -n "$current_candidate_head" ] &&
					git -C "$source_repo" cat-file -e "$current_candidate_head^{commit}" 2>/dev/null &&
					! git -C "$source_repo" merge-base --is-ancestor "$current_candidate_head" "$source_head" 2>/dev/null; then
					printf '%s\t%s\t%s\t\t%s\t%s\t\tstale-candidate-base\trepair is not based on current candidate %s; reproduce on the current candidate and create a descendant repair instead of adopting a sibling commit\t%s\t%s\n' \
						"$now" "$lane" "$branch" "$source_repo" "$source_head" "$current_candidate_head" "$classification" "$report"
					continue
				fi
				adoption=$(adopt_repair_branch_to_src "$branch" "$source_repo" "$source_head" || true)
				adopted_branch=$(printf '%s' "$adoption" | cut -f1)
				adoption_state=$(printf '%s' "$adoption" | cut -f2)
				adoption_detail=$(printf '%s' "$adoption" | cut -f3-)
				central_head=$(git -C "$SRC" rev-parse --verify --quiet "$adopted_branch^{commit}" 2>/dev/null || true)
				case "$adoption_state" in
					central_present|central_present_alias|imported)
						next_action='validate adopted branch and either merge into the current all-merge candidate, write a push manifest, or reject with exact evidence'
						;;
					*)
						next_action="adoption failed: $adoption_detail"
						;;
				esac
				printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
					"$now" "$lane" "$branch" "$adopted_branch" "$source_repo" "$source_head" "${central_head:-}" \
					"$adoption_state" "$next_action" "$classification" "$report"
			done
	} > "$tmp"
	atomic_move "$tmp" "$REPAIR_ADOPTIONS"
}

adopted_repair_branches() {
	[ -s "$REPAIR_ADOPTIONS" ] || return 0
	repair_branch_adopted_to_release_candidate && return 0
	awk -F '\t' '
		NR > 1 && $8 ~ /^(central_present|central_present_alias|imported)$/ && $4 != "" {
			key = $4 "\t" $7
			row[key] = $4
		}
		END {
			for (key in row) print row[key]
		}
	' "$REPAIR_ADOPTIONS" | sort
}

write_lanes() {
	local tmp=$LANES.$$.tmp branch base_ref base_sha head_sha lane_id pr_id publication_class state output_dir
	{
		printf 'lane_id\tpr_id\tlane_kind\tpublication_class\tsource_repo\tsource_ref\tbase_ref\tbase_sha\thead_sha\tresource_class\tdependencies\tstate\toutput_dir\n'
		for branch in $(candidate_branches); do
			head_sha=$(git -C "$SRC" rev-parse --short=12 "$branch" 2>/dev/null || true)
			[ -n "$head_sha" ] || continue
			base_ref=$(branch_base_ref "$branch")
			base_sha=$(git -C "$SRC" rev-parse --short=12 "$base_ref" 2>/dev/null || true)
			lane_id="branch-$(slugify "$branch" | cut -c1-64)"
			pr_id=$(pr_id_for_branch "$branch")
			publication_class=$(publication_class_for_branch "$branch")
			output_dir="$BASE/runs/branch-validation/$lane_id"
			printf '%s\t%s\tbranch-validation\t%s\t%s\t%s\t%s\t%s\t%s\tgit-export\tnone\tqueued\t%s\n' \
				"$lane_id" "$pr_id" "$publication_class" "$SRC" "$branch" "$base_ref" "$base_sha" "$head_sha" "$output_dir"
		done
		for branch in $(adopted_repair_branches); do
			head_sha=$(git -C "$SRC" rev-parse --short=12 "$branch" 2>/dev/null || true)
			[ -n "$head_sha" ] || continue
			base_ref=$(repair_branch_base_ref "$branch")
			[ -n "$base_ref" ] || continue
			base_sha=$(git -C "$SRC" rev-parse --short=12 "$base_ref" 2>/dev/null || true)
			lane_id="repair-branch-$(slugify "$branch" | cut -c1-56)"
			pr_id=$(pr_id_for_branch "$branch")
			publication_class=$(publication_class_for_branch "$branch")
			output_dir="$BASE/runs/branch-validation/$lane_id"
			printf '%s\t%s\tbranch-validation\t%s\t%s\t%s\t%s\t%s\t%s\tgit-export\trepair-branch-adoption\tqueued\t%s\n' \
				"$lane_id" "$pr_id" "$publication_class" "$SRC" "$branch" "$base_ref" "$base_sha" "$head_sha" "$output_dir"
		done
		base_ref=$(resolve_base_ref)
		base_sha=$(git -C "$SRC" rev-parse --short=12 "$base_ref" 2>/dev/null || true)
		if ! lane_terminal_suppressed pr17-1020002; then
			printf 'pr17-1020002\tPR17\tproof-reclassification\tvalidation-only\t%s\t1020002\t%s\t%s\t\tcodex-analysis\tnone\tqueued\t%s/runs/pr17-1020002\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		if pr07c_owner_matrix_consumed_by_progress; then
			:
		elif pr07c_readiness_resolved; then
			printf 'pr07c-owner-matrix\tPR07C\towner-evidence-matrix\tvalidation-only\t%s\tPR07C\t%s\t%s\t\tbrowser-e2e\tpr-split-owner-matrix\tqueued\t%s/runs/pr07c-owner-matrix\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		else
			printf 'pr07c-browser-env\tPR07C\tbrowser-env-repair\tvalidation-only\t%s\tPR07C\t%s\t%s\t\tbrowser-e2e\tresource-and-env\tgated\t%s/runs/pr07c-browser-env\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		if ! lane_terminal_suppressed seed-5200005-reducer; then
			printf 'seed-5200005-reducer\tPR05?\treducer\tvalidation-only\t%s\t5200005\t%s\t%s\t\tcodex-analysis\tnone\tadopt-or-queue\t%s/runs/5200005-reducer\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		if ! lane_terminal_suppressed seed-1060015-reducer; then
			printf 'seed-1060015-reducer\tPR05?\treducer\tvalidation-only\t%s\t1060015\t%s\t%s\t\tcodex-analysis\tnone\tadopt-or-queue\t%s/runs/1060015-reducer\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		if benchmark_feedback_present; then
			if benchmark_exact_stack_green_current && benchmark_forced_coverage_open; then
				printf 'benchmark-canary-fuzzer-gap\tPROCESS\tcoverage-confidence\tvalidation-only\t%s\tbenchmark-canary-feedback\t%s\t%s\t\tcodex-analysis\tfeedback,forced-coverage\tactive\t%s/runs/benchmark-canary-fuzzer-gap\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			elif benchmark_exact_stack_green_current; then
				printf 'benchmark-canary-fuzzer-gap\tPROCESS\texact-stack-promotion-repair\tvalidation-only\t%s\tbenchmark-canary-feedback\t%s\t%s\t\tcodex-analysis\tfeedback,exact-stack\tterminal\t%s/runs/benchmark-canary-fuzzer-gap\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			elif benchmark_effective_promotion_blocked; then
				printf 'benchmark-canary-fuzzer-gap\tPROCESS\texact-stack-promotion-repair\tvalidation-only\t%s\tbenchmark-canary-feedback\t%s\t%s\t\tcodex-analysis\tfeedback,exact-stack\tqueued\t%s/runs/benchmark-canary-fuzzer-gap\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			else
				printf 'benchmark-canary-fuzzer-gap\tPROCESS\tcoverage-gap-repair\tvalidation-only\t%s\tbenchmark-canary-feedback\t%s\t%s\t\tcodex-analysis\tfeedback\tqueued\t%s/runs/benchmark-canary-fuzzer-gap\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			fi
			if benchmark_product_failures_open; then
				printf 'benchmark-canary-product-failure\tPROCESS\tproduct-failure-repair\tvalidation-only\t%s\tbenchmark-canary-product-evidence\t%s\t%s\t\tcodex-analysis\tproduct-evidence,exact-stack\tqueued\t%s/runs/benchmark-canary-product-failure\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			fi
		fi
		if productive_analysis_feedback_present; then
			if productive_analysis_resolved_by_active_artifacts; then
				printf 'productive-analysis-action\tPROCESS\tcontrol-feedback\tvalidation-only\t%s\tproductive-analysis-feedback\t%s\t%s\t\tcodex-analysis\tfeedback\tterminal\t%s/runs/productive-analysis-action\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			else
				printf 'productive-analysis-action\tPROCESS\tcontrol-feedback\tvalidation-only\t%s\tproductive-analysis-feedback\t%s\t%s\t\tcodex-analysis\tfeedback\tqueued\t%s/runs/productive-analysis-action\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
			fi
		fi
	} > "$tmp"
	atomic_move "$tmp" "$LANES"
}

deferred_family_control_field() {
	local family=$1 field=$2
	[ -s "$DEFERRED_BASE/current-deferred-control.tsv" ] || return 1
	awk -F '\t' -v family="$family" -v field="$field" '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				if ($i == field) {
					column = i
				}
			}
			next
		}
		$2 == family && column > 0 {
			print $column
			exit
		}
	' "$DEFERRED_BASE/current-deferred-control.tsv" 2>/dev/null
}

write_blockers_and_queue() {
	local blockers_tmp=$BLOCKERS.$$.tmp queue_tmp=$QUEUE.$$.tmp now pr17_active pr17_queue_state pr17_queue_result s5200005 s1060015 reload_active reload_followup_active reload_repair_active reload_reacquire_active reason pr07c_active pr07c_report benchmark_active benchmark_state benchmark_kind benchmark_action benchmark_result benchmark_artifacts benchmark_next productive_active reload_control_state reload_hold_reason reload_blocker_state reload_blocked_by reload_next reload_queue_state reload_queue_result reload_queue_action reload_completed_root reload_followup_needed reload_product_bug reload_product_artifact reload_repair_blocked reload_repair_artifact reload_reacquire_needed reload_reacquire_status reload_reacquire_artifact reload_reacquire_downscoped coverage_liveness_active coverage_liveness_state coverage_liveness_summary coverage_liveness_result coverage_liveness_artifacts coverage_liveness_status
	local benchmark_product_active benchmark_product_state benchmark_product_summary benchmark_product_result benchmark_product_artifacts repair_adoption_active repair_adoption_state repair_adoption_result repair_adoption_summary plain_smoke_active plain_smoke_state plain_smoke_summary
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	pr17_active=$(active_work_matching '1020002|pr17' || true)
	s5200005=$(active_work_matching '5200005' || true)
	s1060015=$(active_work_matching '1060015' || true)
	reload_active=$(active_reload_hydration_exact_session || true)
	reload_followup_active=$(active_work_matching 'critical-continuation-reload-hydration-followup' || true)
	reload_repair_active=$(active_work_matching 'critical-continuation-reload-hydration-repair|reload-hydration-product-repair' || true)
	reload_reacquire_active=$(active_work_matching 'critical-continuation-reload-hydration-reproducer-reacquire|reload-hydration-reproducer-reacquire' || true)
	if [ -z "$reload_active" ] && [ -n "$reload_followup_active" ]; then
		reload_active=$reload_followup_active
	fi
	if [ -z "$reload_active" ] && [ -n "$reload_repair_active" ]; then
		reload_active=$reload_repair_active
	fi
	if [ -z "$reload_active" ] && [ -n "$reload_reacquire_active" ]; then
		reload_active=$reload_reacquire_active
	fi
	reload_completed_root=""
	if [ -z "$reload_active" ] && ! reload_hydration_completed_exact_replay_triaged; then
		reload_completed_root=$(reload_hydration_exact_replay_completed_root || true)
	fi
	reload_followup_needed=0
	if [ -z "$reload_active" ] && reload_hydration_needs_followup && ! reload_hydration_followup_artifact_current; then
		reload_followup_needed=1
	fi
	reload_product_bug=0
	reload_product_artifact=""
	reload_repair_blocked=0
	reload_repair_artifact=""
	if reload_hydration_repair_blocked_specific_current; then
		reload_repair_blocked=1
		reload_repair_artifact=$(latest_reload_hydration_repair_classification || true)
	fi
	reload_reacquire_needed=0
	reload_reacquire_status=""
	reload_reacquire_artifact=""
	reload_reacquire_downscoped=0
	if [ "$reload_repair_blocked" = 1 ]; then
		if reload_hydration_reacquire_artifact_current; then
			reload_reacquire_status=$(reload_hydration_reacquire_status || true)
			reload_reacquire_artifact=$(reload_hydration_reacquire_artifact_path || true)
			case "$reload_reacquire_status" in
				replay_backed_downscope|exact_reproducer_not_reproduced)
					reload_reacquire_downscoped=1
					;;
			esac
		elif [ -z "$reload_reacquire_active" ]; then
			reload_reacquire_needed=1
		fi
	fi
	if [ "$reload_repair_blocked" != 1 ] && [ "$reload_reacquire_downscoped" != 1 ] && reload_hydration_followup_product_bug; then
		reload_product_bug=1
		reload_product_artifact=$(reload_hydration_followup_product_bug_artifact || true)
	fi
	reload_control_state=$(deferred_family_control_field reload-hydration state || true)
	reload_hold_reason=$(deferred_family_control_field reload-hydration hold_reason || true)
	if [ "$reload_reacquire_downscoped" = 1 ]; then
		if [ "$reload_control_state" != "downscoped" ]; then
			reload_hold_reason="reacquire-downscope:${reload_reacquire_status} artifact=${reload_reacquire_artifact:-unknown}"
		fi
		reload_control_state=downscoped
	elif [ "$reload_repair_blocked" = 1 ]; then
		reload_control_state=exact-blocker-held
		reload_hold_reason="repair-current:seed-7800014-final-ui-reproducer-missing artifact=${reload_repair_artifact:-unknown}"
	fi
	reload_blocker_state=$([ -n "$reload_active" ] && printf active || { [ "$reload_product_bug" = 1 ] && printf runnable || { [ "$reload_followup_needed" = 1 ] && printf runnable || { [ -n "$reload_completed_root" ] && printf runnable || printf queued; }; }; })
	reload_blocked_by=$([ -n "$reload_active" ] && printf active-job || { [ "$reload_product_bug" = 1 ] && printf followup-product-bug || { [ "$reload_followup_needed" = 1 ] && printf bounded-followup || { [ -n "$reload_completed_root" ] && printf completed-exact-replay || printf deferred-loop; }; }; })
	reload_next='adopt deferred promotion; do not relaunch by interval alone'
	if [ "$reload_product_bug" = 1 ]; then
		reload_next="bounded follow-up confirmed large-lifecycle seed 7800014 product divergence; reduce or repair before reload-hydration can be published (${reload_product_artifact:-no-artifact})"
	fi
	reload_queue_state=$([ -n "$reload_active" ] && printf active || { [ "$reload_product_bug" = 1 ] && printf runnable || { [ "$reload_followup_needed" = 1 ] && printf runnable || { [ -n "$reload_completed_root" ] && printf runnable || printf queued; }; }; })
	reload_queue_result=$([ -n "$reload_active" ] && printf adopted || { [ "$reload_product_bug" = 1 ] && printf product_bug_repair_pending || { [ "$reload_followup_needed" = 1 ] && printf bounded_followup_pending || { [ -n "$reload_completed_root" ] && printf exact_replay_triage_pending || printf queued_for_deferred_loop; }; }; })
	reload_queue_action=$([ "$reload_product_bug" = 1 ] && printf product-repair || printf deferred-single-flight)
	case "$reload_control_state" in
		manifest-adopted)
			if [ -n "$reload_active" ]; then
				reload_blocker_state=active
				reload_blocked_by=active-job
				reload_next="deferred manifest is adopted ($reload_hold_reason), but reload-hydration proof/follow-up work is active in $reload_active; consume that evidence before closing the lane"
				reload_queue_state=active
				reload_queue_result=manifest_adopted_active
				reload_queue_action=exact-stack-proof
			elif [ "$reload_product_bug" = 1 ]; then
				reload_blocker_state=runnable
				reload_blocked_by=followup-product-bug
				reload_next="fresh bounded follow-up product evidence supersedes manifest adoption; reduce or repair large-lifecycle seed 7800014 (${reload_product_artifact:-no-artifact})"
				reload_queue_state=runnable
				reload_queue_result=product_bug_repair_pending
				reload_queue_action=product-repair
			elif [ -n "$reload_completed_root" ]; then
				reload_blocker_state=runnable
				reload_blocked_by=completed-exact-replay
				reload_next="completed exact replay at $reload_completed_root has not been consumed; classify title/existing/large lane failures against the adopted manifest"
				reload_queue_state=runnable
				reload_queue_result=exact_replay_triage_pending
				reload_queue_action=exact-replay
			elif [ "$reload_followup_needed" = 1 ]; then
				reload_blocker_state=runnable
				reload_blocked_by=bounded-followup
				reload_next="latest reload-hydration classification requires bounded product-vs-harness follow-up even though the manifest is adopted; run the exact commands from the latest report"
				reload_queue_state=runnable
				reload_queue_result=bounded_followup_pending
				reload_queue_action=bounded-followup
			else
				reload_blocker_state=terminal
				reload_blocked_by=manifest-adopted
				reload_next="validated reload-hydration manifest is adopted ($reload_hold_reason); continue exact-stack/benchmark proof and reopen only with newer product evidence"
				reload_queue_state=terminal
				reload_queue_result=manifest_adopted
				reload_queue_action=exact-stack-proof
			fi
			;;
		single-flight-held|cooldown-held|exact-blocker-held|exact-blocker|exact-blocker-hold)
			if [ -n "$reload_active" ]; then
				reload_blocker_state=active
					if [ -n "$reload_reacquire_active" ]; then
						reload_blocked_by=active-reproducer-reacquire
						reload_next="current reload-hydration repair could not reproduce the final-ui failure; bounded reproducer reacquire is active in $reload_active"
						reload_queue_action=exact-reproducer-reacquire
					elif [ -n "$reload_repair_active" ]; then
						reload_blocked_by=active-product-repair
						reload_next="bounded follow-up confirmed product divergence; repair/reduction is active in $reload_active"
						reload_queue_action=product-repair
					elif [ -n "$reload_followup_active" ]; then
						reload_blocked_by=active-bounded-followup
						reload_next="deferred family is $reload_control_state, but bounded follow-up is active in $reload_active; consume product-vs-harness evidence before manifest adoption/downscope"
						reload_queue_action=bounded-followup
					else
						reload_blocked_by=active-exact-replay
						reload_next="deferred family is $reload_control_state, but exact same-head replay is active in $reload_active; consume replay evidence before manifest adoption/downscope"
						reload_queue_action=exact-replay
					fi
					reload_queue_state=active
					reload_queue_result=$([ -n "$reload_reacquire_active" ] && printf reproducer_reacquire_active || { [ -n "$reload_repair_active" ] && printf product_repair_active || { [ -n "$reload_followup_active" ] && printf bounded_followup_active || printf exact_replay_active; }; })
				elif [ "$reload_product_bug" = 1 ]; then
					reload_blocker_state=runnable
					reload_blocked_by=followup-product-bug
				reload_next="bounded follow-up confirmed large-lifecycle seed 7800014 product divergence; reduce or repair before reload-hydration can be published (${reload_product_artifact:-no-artifact})"
				reload_queue_state=runnable
				reload_queue_result=product_bug_repair_pending
			elif [ -n "$reload_completed_root" ]; then
				reload_blocker_state=runnable
				reload_blocked_by=completed-exact-replay
				reload_next="completed exact replay at $reload_completed_root has not been consumed; classify title/existing/large lane failures and adopt, repair, or explicitly downscope the deferred manifest"
				reload_queue_state=runnable
				reload_queue_result=exact_replay_triage_pending
			elif [ "$reload_followup_needed" = 1 ]; then
				reload_blocker_state=runnable
					reload_blocked_by=bounded-followup
					reload_next="latest reload-hydration classification requires bounded product-vs-harness follow-up; run the exact commands from the latest report instead of waiting for deferred cooldown"
					reload_queue_state=runnable
					reload_queue_result=bounded_followup_pending
				elif [ "$reload_reacquire_needed" = 1 ]; then
					reload_blocker_state=runnable
					reload_blocked_by=exact-reproducer-reacquire
					reload_next="current reload-hydration repair could not reproduce the final-ui failure; run a bounded isolated same-head seed 7800014 reacquire/downscope job before holding indefinitely (${reload_repair_artifact:-no-artifact})"
					reload_queue_state=runnable
					reload_queue_result=exact_reproducer_reacquire_pending
					reload_queue_action=exact-reproducer-reacquire
				elif [ "$reload_reacquire_status" = "exact_reproducer_reacquired" ]; then
					reload_blocker_state=runnable
					reload_blocked_by=exact-reproducer-reacquired
					reload_next="bounded reacquire produced a current stable final-ui reproducer; product repair/reduction can proceed from ${reload_reacquire_artifact:-no-artifact}"
					reload_queue_state=runnable
					reload_queue_result=product_bug_repair_pending
					reload_queue_action=product-repair
				elif [ "$reload_reacquire_status" = "replay_backed_downscope" ] || [ "$reload_reacquire_status" = "exact_reproducer_not_reproduced" ]; then
					reload_blocker_state=held
					reload_blocked_by=replay-backed-downscope
					reload_next="bounded reacquire did not reproduce the final-ui blocker and wrote replay-backed evidence; deferred/finalization should consume ${reload_reacquire_artifact:-no-artifact}"
					reload_queue_state=gated
					reload_queue_result=replay_backed_downscope_ready
					reload_queue_action=exact-blocker-hold
				elif [ "$reload_reacquire_status" = "product_bug_reduced" ]; then
					reload_blocker_state=held
					reload_blocked_by=separate-product-family
					reload_next="bounded reacquire found a different product family; keep reload-hydration final-ui repair blocked until a stable final-ui reproducer appears and route ${reload_reacquire_artifact:-no-artifact} separately"
					reload_queue_state=gated
					reload_queue_result=separate_product_family
					reload_queue_action=exact-blocker-hold
				elif [ "$reload_reacquire_status" = "blocked_specific" ]; then
					reload_blocker_state=held
					reload_blocked_by=exact-reproducer-reacquire-blocked
					reload_next="bounded reacquire attempted and is specifically blocked; fix the exact missing prerequisite before relaunching (${reload_reacquire_artifact:-no-artifact})"
					reload_queue_state=gated
					reload_queue_result=exact_reproducer_reacquire_blocked
					reload_queue_action=exact-blocker-hold
				else
					reload_blocker_state=held
					reload_blocked_by=deferred-single-flight
				reload_next="deferred family is $reload_control_state ($reload_hold_reason); progress only by manifest adoption, exact-stack replay, owner evidence, green stack adoption, or explicit downscope"
				reload_queue_state=gated
				reload_queue_result=deferred_single_flight_hold
				if [ "$reload_repair_blocked" = 1 ]; then
					reload_blocked_by=exact-reproducer-missing
					reload_next="current reload-hydration repair evidence supersedes generic product-repair; reacquire a stable same-head final-ui-witness failure, owner proof, or replay-backed downscope before product-code repair (${reload_repair_artifact:-no-artifact})"
					reload_queue_action=exact-blocker-hold
					reload_queue_result=exact_reproducer_missing
				fi
			fi
			;;
		downscoped)
			if [ "$reload_product_bug" = 1 ]; then
				reload_blocker_state=runnable
				reload_blocked_by=followup-product-bug
				reload_next="fresh bounded follow-up product evidence supersedes deferred downscope; reduce or repair large-lifecycle seed 7800014 (${reload_product_artifact:-no-artifact})"
				reload_queue_state=runnable
				reload_queue_result=product_bug_repair_pending
			else
				reload_blocker_state=terminal
				reload_blocked_by=deferred-downscope
				reload_next="deferred family is downscoped ($reload_hold_reason); reopen only with fresh product evidence"
				reload_queue_state=terminal
				reload_queue_result=deferred_downscoped
			fi
			;;
	esac
	pr07c_active=$(active_work_matching 'owner-matrix|pr07c-owner|HOLD-07C' || true)
	productive_active=$(active_work_matching 'critical-continuation-productive-analysis-action|productive-analysis-action' || true)
	benchmark_active=$(benchmark_exact_stack_active || true)
	benchmark_coverage_status=$(latest_benchmark_coverage_status || true)
	benchmark_product_active=$(active_work_matching 'critical-continuation-benchmark-canary-product-failure|benchmark-canary-product-failure' || true)
	benchmark_product_state=$([ -n "$benchmark_product_active" ] && printf active || printf runnable)
	benchmark_product_summary=$(benchmark_product_failure_summary || true)
	benchmark_product_result=$([ -n "$benchmark_product_active" ] && printf product_failure_repair_active || printf product_failure_repair_required)
	benchmark_product_artifacts=product-failure-triage.tsv,exact-blocker-status.tsv,classification.tsv,repair-branch.txt
	repair_adoption_active=$(active_work_matching 'benchmark-canary-repair-branch-adoption|repair-branch-adoption' || true)
	if repair_branch_adopted_to_release_candidate; then
		repair_adoption_active=""
	fi
	repair_adoption_state=$([ -n "$repair_adoption_active" ] && printf active || { repair_branch_adoption_open && printf runnable || printf terminal; })
	repair_adoption_result=$([ -n "$repair_adoption_active" ] && printf repair_branch_adoption_active || { repair_branch_adoption_open && printf repair_branch_adoption_required || printf no_pending_repair_branch; })
	repair_adoption_summary=$(repair_branch_adoption_summary || true)
	plain_smoke_active=$(active_work_matching '^rtc-critical-continuation-plain-editor-product-smoke-|^continuation-plain-editor-product-smoke-' || true)
	plain_smoke_state=$([ -n "$plain_smoke_active" ] && printf active || { plain_editor_product_smoke_open && printf runnable || printf terminal; })
	plain_smoke_summary=$(plain_editor_product_smoke_summary || true)
	coverage_liveness_active=$(active_work_matching 'coverage-materialization-liveness|materialization-liveness|coverage-liveness' || true)
	coverage_liveness_status=$(latest_coverage_novelty_status || true)
	coverage_liveness_state=$([ -n "$coverage_liveness_active" ] && printf active || printf runnable)
	coverage_liveness_summary=$(coverage_materialization_liveness_summary || true)
	coverage_liveness_result=$([ -n "$coverage_liveness_active" ] && printf coverage_liveness_repair_active || printf coverage_liveness_repair_required)
	coverage_liveness_artifacts=novelty-status.md,novelty-monitor.log,novelty-state.json,supervisor-state.json,supervisor-groups.json,coverage-change.tsv,classification.tsv
	benchmark_state=$([ -n "$benchmark_active" ] && printf active || printf runnable)
	benchmark_kind=coverage-promotion
	benchmark_action=coverage-gap-repair
	benchmark_result=pending
	benchmark_artifacts=fuzzer-feedback.md,fuzzer-feedback.tsv,coverage-change.tsv,classification.tsv
	benchmark_next='consume benchmark canary feedback; add or repair equivalent fuzz coverage and validate the fixed stack under that coverage before maintainer snapshot publication'
	if benchmark_exact_stack_green_current && benchmark_forced_coverage_open; then
		benchmark_state=active
		benchmark_kind=coverage-confidence
		benchmark_action=coverage-retarget
		benchmark_active=${benchmark_active:-coverage-controller}
		benchmark_artifacts=fuzzer-feedback.tsv,coverage-change.tsv,classification.tsv,exact-stack-status.tsv,benchmark-canary-coverage-status.tsv
		benchmark_next="exact-stack green is repair evidence only; consume ${benchmark_coverage_status:-$COVERAGE_BASE/current-output-dir.txt} until every promotion-blocked or status-only primary forced canary row has current-run success or explicit downscope"
		benchmark_result=forced_coverage_active
	elif benchmark_exact_stack_green_current; then
		benchmark_state=terminal
		benchmark_kind=exact-stack-promotion
		benchmark_action=exact-stack-repair
		benchmark_artifacts=fuzzer-feedback.tsv,coverage-change.tsv,classification.tsv,exact-stack-status.tsv,repair-branch.txt
		benchmark_next='current benchmark canary feedback has fresh exact-stack green evidence; reopen only when current-feedback.tsv changes or new promotion_blocked rows appear'
		benchmark_result=exact_stack_green
	elif benchmark_effective_promotion_blocked; then
		benchmark_kind=exact-stack-promotion
		benchmark_action=exact-stack-repair
		benchmark_artifacts=fuzzer-feedback.tsv,coverage-change.tsv,classification.tsv,exact-stack-status.tsv,repair-branch.txt
		benchmark_next='promotion is blocked on the exact all-merged stack; do not clear with coverage_repaired alone; create or advance a product fix branch and prove exact-stack green before maintainer snapshot publication'
		benchmark_result=$([ -n "$benchmark_active" ] && printf exact_stack_repair_active || printf exact_stack_repair_required)
	fi
	pr17_queue_state=runnable
	pr17_queue_result=pending
	if plain_editor_product_smoke_open; then
		pr17_queue_state=held
		pr17_queue_result=held_by_plain_editor_product_smoke
	elif benchmark_product_failures_open; then
		pr17_queue_state=held
		pr17_queue_result=held_by_benchmark_product_failure
	elif [ "$benchmark_result" = forced_coverage_active ]; then
		pr17_queue_state=held
		pr17_queue_result=held_by_benchmark_canary_fuzzer_gap
	elif [ -n "$pr17_active" ]; then
		pr17_queue_state=active
		pr17_queue_result=adopted
	fi
	pr07c_report=$(latest_pr07c_owner_replay_ready_report || true)
	if [ -z "$pr07c_report" ] && pr07c_readiness_resolved; then
		pr07c_report=$(latest_lane_classification pr07c-browser-env || true)
	fi
	reason=$(resource_reason)
	{
		printf 'blocker_id\tkind\tpriority\tstate\tsource_input\tblocks\tblocked_by\trequired_artifacts\tactive_session\tnext_action\tupdated_at\n'
		if benchmark_feedback_present; then
			printf 'benchmark-canary-fuzzer-gap\t%s\thigh\t%s\tbenchmark-canary\tcoverage-confidence,snapshot-publication,exact-stack-promotion\tfuzzer-feedback\t%s\t%s\t%s\t%s\n' \
				"$benchmark_kind" "$benchmark_state" "$benchmark_artifacts" "${benchmark_active:-}" "$benchmark_next" "$now"
			if repair_branch_adoption_open || [ -n "$repair_adoption_active" ]; then
				printf 'benchmark-canary-repair-branch-adoption\trepair-branch-adoption\thigh\t%s\tbenchmark-canary-continuation\tsnapshot-publication,exact-stack-promotion,maintainer-pr-set\t%s\trepair-branch.txt,classification.tsv,current-repair-branch-adoptions.tsv,validation.tsv,push-manifest.tsv\t%s\tadopt, validate, merge, or explicitly reject the latest committed benchmark-canary continuation repair branch; %s\t%s\n' \
					"$repair_adoption_state" \
					"$([ -n "$repair_adoption_active" ] && printf active-job || printf repair-branch-created)" \
					"${repair_adoption_active:-}" \
					"${repair_adoption_summary:-no pending repair branch}" \
					"$now"
			fi
			if benchmark_product_failures_open; then
				printf 'benchmark-canary-product-failure\tproduct-repair\thigh\t%s\tbenchmark-canary-product-evidence\tsnapshot-publication,exact-stack-promotion,maintainer-pr-set\tproduct-evidence\t%s\t%s\treduce or repair current-run benchmark canary product failures; %s\t%s\n' \
					"$benchmark_product_state" "$benchmark_product_artifacts" "${benchmark_product_active:-}" "${benchmark_product_summary:-no-summary}" "$now"
			fi
		fi
		if coverage_materialization_liveness_open; then
			printf 'coverage-materialization-liveness\tcoverage-liveness\thigh\t%s\tcoverage-guided\tcoverage-confidence,snapshot-publication,maintainer-pr-set\t%s\t%s\t%s\trepair current-run behavioral record materialization; %s\t%s\n' \
				"$coverage_liveness_state" \
				"$([ -n "$coverage_liveness_active" ] && printf active-job || printf coverage-guided-materialization)" \
				"$coverage_liveness_artifacts" \
				"${coverage_liveness_active:-}" \
				"${coverage_liveness_summary:-status=${coverage_liveness_status:-missing}}" \
				"$now"
		fi
		if plain_editor_product_smoke_open; then
			printf 'plain-editor-product-smoke\treal-editor-smoke\thigh\t%s\tcoverage-guided\tsnapshot-publication,exact-stack-promotion,maintainer-pr-set,PR17\tplain-editor-product-smoke\tcurrent novelty-status.md,successful edit/save/reload artifact,classification.tsv\t%s\tplain editor product smoke is not green enough for PR publication; %s\t%s\n' \
				"$plain_smoke_state" "${plain_smoke_active:-}" "${plain_smoke_summary:-missing smoke summary}" "$now"
		fi
		if productive_analysis_feedback_present; then
			if productive_analysis_resolved_by_active_artifacts; then
				printf 'productive-analysis-action\tcontrol-feedback\thigh\tterminal\tproductive-analysis\tcritical-path,pr-progress,deferred,coverage,level-mix\tactive-artifacts\tclassification.tsv,critical-path-feedback.tsv\t\tlatest productive-analysis feedback is already consumed by active controller/fuzzer artifacts; reopen only when productive-analysis feedback changes\t%s\n' "$now"
			elif [ -n "$productive_active" ]; then
				printf 'productive-analysis-action\tcontrol-feedback\thigh\tactive\tproductive-analysis\tcritical-path,pr-progress,deferred,coverage,level-mix\tactive-job\tcritical-path-feedback.md,critical-path-feedback.tsv,classification.tsv\t%s\tproductive-analysis action rows are being consumed by an active critical-path continuation\t%s\n' "$productive_active" "$now"
			else
				printf 'productive-analysis-action\tcontrol-feedback\thigh\trunnable\tproductive-analysis\tcritical-path,pr-progress,deferred,coverage,level-mix\tproductive-analysis\tcritical-path-feedback.md,critical-path-feedback.tsv\t\tconsume productive-analysis action rows; convert them into a controller rule, continuation, coverage adjustment, branch repair, or explicit downscope with evidence\t%s\n' "$now"
			fi
			write_productive_analysis_exact_blockers "$now"
		fi
		if pr17_suppressed_terminal; then
			printf 'pr17-1020002\tfinal-stack-join\thigh\tterminal\tpr_split/finalization\tfinal-stack-validation,filing\tterminal-ledger\tclassification.tsv\t\tterminal downscope; reopen only with fresh product evidence newer than classification.tsv\t%s\n' "$now"
		elif plain_editor_product_smoke_open; then
			printf 'pr17-1020002\tfinal-stack-join\thigh\theld\tpr_split/finalization\tfinal-stack-validation,filing\tplain-editor-product-smoke\tclassification.tsv,report.md\t\thold behind plain-editor-product-smoke until the real editor edit/save/reload smoke lane has current successful evidence and no preserved product-evidence/failure line; then proof-or-reclassify PR17 seed 1020002\t%s\n' \
				"$now"
		elif benchmark_product_failures_open; then
			printf 'pr17-1020002\tfinal-stack-join\thigh\theld\tpr_split/finalization\tfinal-stack-validation,filing\tbenchmark-canary-product-failure\tclassification.tsv,report.md\t\thold behind benchmark-canary-product-failure until %s has no retained_product_evidence=yes, product_evidence_records greater than 0, or coverage_state containing product-failure; then proof-or-reclassify PR17 seed 1020002\t%s\n' \
				"${benchmark_coverage_status:-$COVERAGE_BASE/current-output-dir.txt}" "$now"
		elif [ "$benchmark_result" = forced_coverage_active ]; then
			printf 'pr17-1020002\tfinal-stack-join\thigh\theld\tpr_split/finalization\tfinal-stack-validation,filing\tbenchmark-canary-fuzzer-gap\tclassification.tsv,report.md\t\thold behind benchmark-canary-fuzzer-gap until %s has no promotion_blocked=yes row lacking current_run_green=yes or explicit_downscope=yes; then proof-or-reclassify PR17 seed 1020002\t%s\n' \
				"${benchmark_coverage_status:-$COVERAGE_BASE/current-output-dir.txt}" "$now"
		else
			printf 'pr17-1020002\tfinal-stack-join\thigh\t%s\tpr_split/finalization\tfinal-stack-validation,filing\t%s\tclassification.tsv,report.md\t%s\tproof-or-reclassify PR17 seed 1020002\t%s\n' \
				"$([ -n "$pr17_active" ] && printf active || printf runnable)" \
				"$([ -n "$pr17_active" ] && printf active-job || printf none)" \
				"${pr17_active:-}" "$now"
		fi
		if pr07c_owner_matrix_consumed_by_progress; then
			printf 'pr07c-owner-matrix\towner-evidence\thigh\tterminal\tpr_split/finalization\tPR07C/HOLD-07C promotion decision\tpr-progress-controller\tclassification.tsv,report.md\t\truntime-held/downscoped by PR progress controller; reopen only when newer owner evidence appears\t%s\n' "$now"
		elif pr07c_readiness_resolved; then
			printf 'pr07c-owner-matrix\towner-evidence\thigh\t%s\tpr_split/finalization\tPR07C/HOLD-07C promotion decision\t%s\towner-matrix.tsv,report.md,classification.tsv\t%s\treadiness is resolved by %s; run/consume PR07C owner matrix and promote only if product ownership is proven\t%s\n' \
				"$([ -n "$pr07c_active" ] && printf active || printf queued)" \
				"$([ -n "$pr07c_active" ] && printf active-job || printf pr-split-review)" \
				"${pr07c_active:-}" "${pr07c_report:-unknown}" "$now"
		else
			printf 'pr07c-browser-env\tbrowser-environment\thigh\t%s\tpr_split/finalization\tPR07C replay,7510029\t%s\tvalidation.tsv,report.md,classification.tsv,repair-branch.txt\t\trepair collaboration readiness so PR07C replay reaches seeded action/reload/checkpoint phase; runtime-readiness-blocked is not terminal\t%s\n' \
				"$(allow_critical_browser_preflight && printf runnable || printf gated)" \
				"$(allow_critical_browser_preflight && printf none || printf "resource_or_env:$reason")" "$now"
		fi
		if lane_terminal_suppressed seed-5200005-reducer; then
			printf 'seed-5200005-reducer	reducer	high	terminal	pr_split/progress-unblock	PR05 residual decision	terminal-ledger	classification.tsv		resolved by active artifacts; reopen only with fresh newer product-owned evidence	%s
' "$now"
		else
			printf 'seed-5200005-reducer	reducer	high	%s	pr_split/progress-unblock	PR05 residual decision	%s	classification.tsv,report.md	%s	adopt active reducer or launch bounded continuation if missing	%s
' \
				"$([ -n "$s5200005" ] && printf active || printf runnable)" \
				"$([ -n "$s5200005" ] && printf active-job || printf none)" \
				"${s5200005:-}" "$now"
		fi
		if lane_terminal_suppressed seed-1060015-reducer; then
			printf 'seed-1060015-reducer	reducer	high	terminal	pr_split/progress-unblock	PR05 residual decision	terminal-ledger	classification.tsv		resolved/downscoped by active artifact; reopen only with fresh newer product-owned evidence	%s
' "$now"
		else
			printf 'seed-1060015-reducer	reducer	high	%s	pr_split/progress-unblock	PR05 residual decision	%s	classification.tsv,report.md	%s	adopt active reducer or launch bounded continuation if missing	%s
' \
				"$([ -n "$s1060015" ] && printf active || printf runnable)" \
				"$([ -n "$s1060015" ] && printf active-job || printf none)" \
				"${s1060015:-}" "$now"
		fi
		printf 'reload-hydration\tdeferred-family\thigh\t%s\tdeferred_status\tdeferred PR candidate\t%s\tclassification.tsv,report.md\t%s\t%s\t%s\n' \
			"$reload_blocker_state" "$reload_blocked_by" "${reload_active:-}" "$reload_next" "$now"
	} > "$blockers_tmp"
	{
		printf 'job_id\tlane_id\tblocker_id\taction_kind\tdedupe_key\tresource_class\tpriority\tstate\tattempt\tsession\tworktree\toutput_dir\tcreated_at\tstarted_at\tupdated_at\texit_code\tresult\n'
		if ! lane_terminal_suppressed pr17-1020002; then
			printf 'job-pr17-1020002\tpr17-1020002\tpr17-1020002\tproof-reclassify\tpr17-1020002-proof\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/pr17-1020002\t%s\t\t%s\t\t%s\n' \
				"$pr17_queue_state" "${pr17_active:-}" "$BASE" "$now" "$now" "$pr17_queue_result"
		fi
		if pr07c_owner_matrix_consumed_by_progress; then
			printf 'job-pr07c-owner-matrix\tpr07c-owner-matrix\tpr07c-owner-matrix\towner-matrix\tpr07c-owner-matrix\tbrowser-e2e\thigh\tterminal\t0\t\t\t%s/runs/pr07c-owner-matrix\t%s\t\t%s\t\tprogress_controller_runtime_held\n' "$BASE" "$now" "$now"
		elif pr07c_readiness_resolved; then
			printf 'job-pr07c-owner-matrix\tpr07c-owner-matrix\tpr07c-owner-matrix\towner-matrix\tpr07c-owner-matrix\tbrowser-e2e\thigh\t%s\t0\t%s\t\t%s/runs/pr07c-owner-matrix\t%s\t\t%s\t\t%s\n' \
				"$([ -n "$pr07c_active" ] && printf active || printf queued)" "${pr07c_active:-}" "$BASE" "$now" "$now" "$([ -n "$pr07c_active" ] && printf adopted || printf owned_by_pr_split_review)"
		else
			printf 'job-pr07c-browser-env\tpr07c-browser-env\tpr07c-browser-env\tbrowser-env-repair\tpr07c-browser-env\tbrowser-e2e\thigh\t%s\t0\t\t\t%s/runs/pr07c-browser-env\t%s\t\t%s\t\t%s\n' \
				"$(allow_critical_browser_preflight && printf runnable || printf gated)" "$BASE" "$now" "$now" "$(allow_critical_browser_preflight && printf repair_pending || printf resource_or_env_gated)"
		fi
		if ! lane_terminal_suppressed seed-5200005-reducer; then
			printf 'job-5200005-reducer	seed-5200005-reducer	seed-5200005-reducer	reducer	5200005-reducer	codex-analysis	high	%s	0	%s		%s/runs/5200005-reducer	%s		%s		%s
' \
				"$([ -n "$s5200005" ] && printf active || printf queued)" "${s5200005:-}" "$BASE" "$now" "$now" "$([ -n "$s5200005" ] && printf adopted || printf queued_for_later)"
		fi
		if ! lane_terminal_suppressed seed-1060015-reducer; then
			printf 'job-1060015-reducer	seed-1060015-reducer	seed-1060015-reducer	reducer	1060015-reducer	codex-analysis	high	%s	0	%s		%s/runs/1060015-reducer	%s		%s		%s
' \
				"$([ -n "$s1060015" ] && printf active || printf queued)" "${s1060015:-}" "$BASE" "$now" "$now" "$([ -n "$s1060015" ] && printf adopted || printf queued_for_later)"
		fi
		if benchmark_feedback_present; then
			printf 'job-benchmark-canary-fuzzer-gap\tbenchmark-canary-fuzzer-gap\tbenchmark-canary-fuzzer-gap\t%s\tbenchmark-canary-fuzzer-gap\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/benchmark-canary-fuzzer-gap\t%s\t\t%s\t\t%s\n' \
				"$benchmark_action" "$benchmark_state" "${benchmark_active:-}" "$BASE" "$now" "$now" "$benchmark_result"
			if repair_branch_adoption_open || [ -n "$repair_adoption_active" ]; then
				printf 'job-benchmark-canary-repair-branch-adoption\tbenchmark-canary-repair-branch-adoption\tbenchmark-canary-repair-branch-adoption\trepair-branch-adoption\tbenchmark-canary-repair-branch-adoption\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/benchmark-canary-repair-branch-adoption\t%s\t\t%s\t\t%s\n' \
					"$repair_adoption_state" "${repair_adoption_active:-}" "$BASE" "$now" "$now" "$repair_adoption_result"
			fi
			if benchmark_product_failures_open; then
				printf 'job-benchmark-canary-product-failure\tbenchmark-canary-product-failure\tbenchmark-canary-product-failure\tproduct-repair\tbenchmark-canary-product-failure\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/benchmark-canary-product-failure\t%s\t\t%s\t\t%s\n' \
					"$benchmark_product_state" "${benchmark_product_active:-}" "$BASE" "$now" "$now" "$benchmark_product_result"
			fi
		fi
		if coverage_materialization_liveness_open; then
			printf 'job-coverage-materialization-liveness\tcoverage-materialization-liveness\tcoverage-materialization-liveness\tcoverage-liveness-repair\tcoverage-materialization-liveness\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/coverage-materialization-liveness\t%s\t\t%s\t\t%s\n' \
				"$coverage_liveness_state" "${coverage_liveness_active:-}" "$BASE" "$now" "$now" "$coverage_liveness_result"
		fi
		if plain_editor_product_smoke_open; then
			printf 'job-plain-editor-product-smoke\tplain-editor-product-smoke\tplain-editor-product-smoke\treal-editor-smoke-gate\tplain-editor-product-smoke\tbrowser-e2e\thigh\t%s\t0\t%s\t\t%s/runs/plain-editor-product-smoke\t%s\t\t%s\t\tplain_editor_smoke_gate_open\n' \
				"$plain_smoke_state" "${plain_smoke_active:-}" "$BASE" "$now" "$now"
		fi
			if productive_analysis_feedback_present; then
				if productive_analysis_resolved_by_active_artifacts; then
					printf 'job-productive-analysis-action\tproductive-analysis-action\tproductive-analysis-action\tcontrol-feedback\tproductive-analysis-action\tcodex-analysis\thigh\tterminal\t0\t\t\t%s/runs/productive-analysis-action\t%s\t\t%s\t\talready_resolved_by_active_artifacts\n' "$BASE" "$now" "$now"
				elif [ -n "$productive_active" ]; then
					printf 'job-productive-analysis-action\tproductive-analysis-action\tproductive-analysis-action\tcontrol-feedback\tproductive-analysis-action\tcodex-analysis\thigh\tactive\t0\t%s\t\t%s/runs/productive-analysis-action\t%s\t\t%s\t\tadopted\n' "$productive_active" "$BASE" "$now" "$now"
				else
					printf 'job-productive-analysis-action\tproductive-analysis-action\tproductive-analysis-action\tcontrol-feedback\tproductive-analysis-action\tcodex-analysis\thigh\trunnable\t0\t\t\t%s/runs/productive-analysis-action\t%s\t\t%s\t\tpending\n' "$BASE" "$now" "$now"
				fi
				write_productive_analysis_exact_blocker_queue_rows "$now"
			fi
		printf 'job-reload-hydration\treload-hydration\treload-hydration\t%s\treload-hydration\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/reload-hydration\t%s\t\t%s\t\t%s\n' \
			"$reload_queue_action" "$reload_queue_state" "${reload_active:-}" "$BASE" "$now" "$now" "$reload_queue_result"
		while IFS=$'\t' read -r lane_id _pr_id lane_kind _publication_class _source_repo _source_ref _base_ref _base_sha _head_sha _resource_class _deps _state output_dir; do
			[ "$lane_kind" = "branch-validation" ] || continue
			printf 'validate-%s\t%s\tbranch-export-%s\tvalidate-export\tvalidate-%s\tgit-export\tmedium\tqueued\t0\t\t\t%s\t%s\t\t%s\t\tpending\n' \
				"$lane_id" "$lane_id" "$lane_id" "$lane_id" "$output_dir" "$now" "$now"
		done < "$LANES"
	} > "$queue_tmp"
	atomic_move "$blockers_tmp" "$BLOCKERS"
	atomic_move "$queue_tmp" "$QUEUE"
}

write_active_jobs() {
	local tmp=$ACTIVE_JOBS.$$.tmp
		{
			printf 'session\tclass\tstarted_hint\n'
			tmux_sessions |
				awk '/^(rtc-critical-|rtc-benchmark-canary-feedback-refresh-|rtc-pr-finalize-job-|rtc-deferred-job-|rtc-cycle|rtc-analysis-live-|rtc-prsplit-progress-unblock|rtc-fuzz-level-mix|rtc-coverage-guidance)/ { print }' |
				while IFS= read -r session; do
				case "$session" in
					rtc-critical-validate-*) printf '%s\tcritical-validation\t\n' "$session" ;;
					rtc-critical-continuation-*) printf '%s\tcritical-continuation\t\n' "$session" ;;
					rtc-benchmark-canary-feedback-refresh-*) printf '%s\tfeedback-refresh\t\n' "$session" ;;
					rtc-pr-finalize-job-*) printf '%s\tfinalization\t\n' "$session" ;;
					rtc-deferred-job-*) printf '%s\tdeferred\t\n' "$session" ;;
					rtc-cycle*) printf '%s\tprogress-unblock\t\n' "$session" ;;
					*) printf '%s\tanalysis\t\n' "$session" ;;
				esac
			done
	} > "$tmp"
	atomic_move "$tmp" "$ACTIVE_JOBS"
}

write_branch_export_headers() {
	if [ ! -f "$BRANCH_AUDIT" ]; then
		printf 'lane_id\tbranch\tbase_ref\tbase_sha\thead_sha\tfile_count\tnet_loc\tdiff_check_rc\tstate\treport_path\n' > "$BRANCH_AUDIT"
	fi
	if [ ! -f "$PUSH_MANIFEST" ]; then
		printf 'lane_id\tpublication_class\tbranch\tbase_ref\thead_sha\tallowed_for_product_push\treason\treport_path\n' > "$PUSH_MANIFEST"
	fi
	if [ ! -f "$VALIDATION_MATRIX" ]; then
		printf 'lane_id\tbranch\tcheck_name\tresult\tdetails\treport_path\n' > "$VALIDATION_MATRIX"
	fi
}

launch_validation_job() {
	local lane_id=$1 branch=$2 base_ref=$3 publication_class=$4 head_sha=$5
	local dedupe session run_dir worktree runner report rc log_file
	allow_heavy_work || return 0
	dedupe="validate-$lane_id-$head_sha-$(slugify "$base_ref" | cut -c1-32)"
	if task_recently_launched "$dedupe" "$MIN_TASK_INTERVAL_SECONDS"; then
		return 0
	fi
	session="rtc-critical-validate-$(slugify "$lane_id" | cut -c1-48)-$(date -u +%Y%m%dT%H%M%SZ)"
	if has_session "$session"; then
		return 0
	fi
	run_dir="$BASE/runs/$(date -u +%Y%m%dT%H%M%SZ)/validations/$lane_id"
	worktree="$BASE/worktrees/validation-$lane_id-$(date -u +%Y%m%dT%H%M%SZ)"
	runner="$run_dir/run.sh"
	report="$run_dir/report.md"
	rc="$run_dir/rc"
	log_file="$run_dir/stderr.log"
	mkdir -p "$run_dir"
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
SRC="$SRC"
BRANCH="$branch"
BASE_REF="$base_ref"
LANE_ID="$lane_id"
PUBLICATION_CLASS="$publication_class"
WORKTREE="$worktree"
REPORT="$report"
RC="$rc"
BRANCH_AUDIT="$BRANCH_AUDIT"
PUSH_MANIFEST="$PUSH_MANIFEST"
VALIDATION_MATRIX="$VALIDATION_MATRIX"
mkdir -p "\$(dirname "\$REPORT")"
set +e
git -C "\$SRC" worktree add --detach "\$WORKTREE" "\$BRANCH" > "\$(dirname "\$REPORT")/worktree.log" 2>&1
worktree_rc=\$?
set -e
if [ "\$worktree_rc" -eq 0 ]; then
	for dependency_dir in node_modules vendor; do
		[ -d "\$SRC/\$dependency_dir" ] || continue
		[ ! -L "\$WORKTREE/\$dependency_dir" ] || continue
		if [ -d "\$WORKTREE/\$dependency_dir" ]; then
			placeholder_entry=\$(find "\$WORKTREE/\$dependency_dir" -mindepth 1 -maxdepth 1 ! -name .gitignore -print -quit 2>/dev/null || true)
			[ -z "\$placeholder_entry" ] || continue
			rm -f "\$WORKTREE/\$dependency_dir/.gitignore"
			rmdir "\$WORKTREE/\$dependency_dir" 2>/dev/null || continue
		elif [ -e "\$WORKTREE/\$dependency_dir" ]; then
			continue
		fi
		ln -s "\$SRC/\$dependency_dir" "\$WORKTREE/\$dependency_dir" >> "\$(dirname "\$REPORT")/worktree.log" 2>&1 || true
	done
fi
if [ "\$worktree_rc" -ne 0 ]; then
	printf 'validation failed to create worktree for %s\\n' "\$BRANCH" > "\$REPORT"
	printf '%s\\n' "\$worktree_rc" > "\$RC"
	exit 0
fi
base_sha=\$(git -C "\$WORKTREE" rev-parse --short=12 "\$BASE_REF" 2>/dev/null || true)
head_sha=\$(git -C "\$WORKTREE" rev-parse --short=12 HEAD 2>/dev/null || true)
merge_base=\$(git -C "\$WORKTREE" merge-base "\$BASE_REF" HEAD 2>/dev/null || true)
range="\$BASE_REF..HEAD"
[ -n "\$merge_base" ] && range="\$merge_base..HEAD"
git -C "\$WORKTREE" diff --stat "\$range" > "\$(dirname "\$REPORT")/diffstat.txt" 2>&1 || true
git -C "\$WORKTREE" diff --numstat "\$range" > "\$(dirname "\$REPORT")/numstat.tsv" 2>&1 || true
git -C "\$WORKTREE" diff --name-only "\$range" > "\$(dirname "\$REPORT")/files.txt" 2>&1 || true
git -C "\$WORKTREE" log --oneline --decorate "\$range" > "\$(dirname "\$REPORT")/commits.txt" 2>&1 || true
set +e
git -C "\$WORKTREE" diff --check "\$range" > "\$(dirname "\$REPORT")/diff-check.log" 2>&1
diff_check_rc=\$?
set -e
file_count=\$(wc -l < "\$(dirname "\$REPORT")/files.txt" | tr -d ' ')
net_loc=\$(awk '{ add += \$1; del += \$2 } END { print add - del }' "\$(dirname "\$REPORT")/numstat.tsv" 2>/dev/null || printf '0')
allowed=0
reason="not_product_publication_class"
case "\$PUBLICATION_CLASS" in
	product-candidate)
		if [ "\$diff_check_rc" -eq 0 ]; then
			allowed=1
			reason="product_candidate_diff_check_passed"
		else
			reason="product_candidate_diff_check_failed"
		fi
		;;
	validation-only)
		reason="validation_only_ref_do_not_push_as_product"
		;;
	needs-classification)
		reason="needs_classification_before_product_push"
		;;
esac
{
	echo "# Critical PR Validation Export"
	echo
	echo "- lane: \$LANE_ID"
	echo "- branch: \$BRANCH"
	echo "- publication class: \$PUBLICATION_CLASS"
	echo "- base: \$BASE_REF \$base_sha"
	echo "- head: \$head_sha"
	echo "- files: \$file_count"
	echo "- net LOC: \$net_loc"
	echo "- diff-check rc: \$diff_check_rc"
	echo
	echo "## Commits"
	sed -n '1,80p' "\$(dirname "\$REPORT")/commits.txt"
	echo
	echo "## Diffstat"
	sed -n '1,120p' "\$(dirname "\$REPORT")/diffstat.txt"
} > "\$REPORT"
{
	flock 8
	printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "\$LANE_ID" "\$BRANCH" "\$BASE_REF" "\$base_sha" "\$head_sha" "\$file_count" "\$net_loc" "\$diff_check_rc" "done" "\$REPORT" >> "\$BRANCH_AUDIT"
	printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "\$LANE_ID" "\$PUBLICATION_CLASS" "\$BRANCH" "\$BASE_REF" "\$head_sha" "\$allowed" "\$reason" "\$REPORT" >> "\$PUSH_MANIFEST"
	printf '%s\\t%s\\tdiff-check\\t%s\\trc=%s\\t%s\\n' "\$LANE_ID" "\$BRANCH" "\$([ "\$diff_check_rc" -eq 0 ] && printf pass || printf fail)" "\$diff_check_rc" "\$REPORT" >> "\$VALIDATION_MATRIX"
} 8>> "$BASE/logs/export-artifacts.lock"
printf '%s\\n' '0' > "\$RC"
EOF
	chmod +x "$runner"
	append_launch validation "$session" "$dedupe" "$run_dir"
	json_event launch "validation $lane_id $branch session=$session"
	tmux_new_session_detached "$session" "bash '$runner' 2> '$log_file'"
}

write_continuation_prompt() {
	local prompt=$1 report=$2 classification=$3 lane=$4 goal=$5 prompt_search_limits
	local previous_classification previous_class previous_next_action previous_artifact plain_followup
	prompt_search_limits=$(cat <<'PROMPT_SEARCH_LIMITS'
Repository and artifact search limits:
- Do not run broad `find`, `rg`, `grep`, `ls -R`, or shell globs over the repository, current run root, historical artifact roots, test/e2e/artifacts, or parent directories.
- Do not dump `summary.ndjson`, `events.ndjson`, `events.jsonl`, `command.log`, Playwright traces, or large stderr/report files. Use exact seed/profile extractors or line-bounded commands against one known path.
- When you need current-run evidence, first read `current-output-dir.txt`, `novelty-status.md`, supervisor state, and exact `lanes.json` or `state.json` paths for the relevant group/profile. Inspect only the matching group, seed, lane, and artifact paths.
- If you must search source code, search specific files named by the lane or use `git ls-files <specific-pattern>` first, then inspect only the resulting small file list.
- Any broad scan that prints unrelated repo files or historical artifacts is an infrastructure failure; stop, write `blocked_specific` with the exact missing bounded artifact or command, and do not continue scanning.
PROMPT_SEARCH_LIMITS
)
	case "$lane" in
		pa-exact-*)
			cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required exact blocker TSV: ${report%/*}/exact-blocker-status.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Start with the exact evidence named in the Goal, not broad status:
   - From the pointed benchmark-canary-coverage-status.tsv, read the header and only the row(s) for this lane/family.
   - If the current coverage run has restarted and shows zero records, use retained_product_evidence/product_evidence_records and the closure_run_dir from the Goal as the repair input; do not wait for rediscovery before reducing or repairing.
   - If closure_run_dir is present, inspect only its lane state, summary records for the failing seed/family, replay.json, command.log tail, and behavioral coverage artifact. Do not walk the whole run directory.
2. Read bounded slices of the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
   For large Markdown/TSV state files, read the relevant header and matching lane/blocker rows first. Do not read pr_split/finalization/deferred reports from $INPUTS unless the exact benchmark evidence explicitly names them.
3. Read the exact blocker, benchmark/canary, and coverage evidence named in the Goal, plus any applicable:
   - $COVERAGE_BASE/current-output-dir.txt
   - the pointed benchmark-canary-coverage-status.tsv when present
   - $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
4. Treat this as a bounded same-head repair-or-downscope job. Do not run broad fuzzing and do not stop shared loops.
5. If the evidence already has an active equivalent exact replay, adopt it and write the session/artifact path. If not, run only the smallest replay, code inspection, or repair step needed for this exact seed/family.
6. If a browser/wp-env replay is needed, use a dependency-installed worktree or explicitly verify node_modules/.bin/wp-scripts exists before launching. Reserve a unique WP_ENV_HOME under $BASE/wp-env plus unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT; do not reuse localhost:8889. Run npm run wp-env status/start as needed and verify wp-login.php is not an Apache 404 before classifying a product failure.
7. If a concrete product fix is isolated, create only a new non-destructive local branch in this worktree, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
8. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/exact-blocker-status.tsv with header: blocker_id,result,evidence,next_action,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
9. Classification rules:
   - Use exact_replay_green only if the same-head bounded replay for this seed/family passes or the forced row has direct current-run green evidence.
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and validation points to that fix.
   - Use exact_replay_downscoped only with explicit evidence that the row should be removed/downscoped.
   - Use product_bug_reduced if a stable product reproducer exists but no safe fix was created.
   - Use adopted_active_artifact if a current active job is the exact equivalent.
   - Use blocked_specific only with the exact failed command or missing artifact needed next.

Passive prose without exact-blocker-status.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
			return
			;;
	esac
	if [ "$lane" = "benchmark-canary-repair-branch-adoption" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required validation TSV: ${report%/*}/validation.tsv
Required repair branch file: ${report%/*}/repair-branch.txt
Required push manifest, if adoption is accepted: ${report%/*}/push-manifest.tsv
Candidate source repo: $CONTINUATION_SRC
Validation/cache repo: $SRC

Dependency rule:
- Use the source_repo column from $REPAIR_ADOPTIONS as the primary git and dependency source for the adopted branch; if that is absent, use $CONTINUATION_SRC.
- If you create a detached validation worktree outside that source repo, symlink node_modules and vendor from the same source repo before running npm, Jest, Playwright, or wp-env commands.
- Do not symlink node_modules from $SRC unless the adopted branch source_repo is $SRC or you first prove the required module resolves from $SRC. A stale validation/cache dependency tree is an infrastructure problem, not a product failure or repair rejection.

Task:
1. Read the latest repair-branch adoption table first:
   - $REPAIR_ADOPTIONS
   Then read only the matching latest source artifacts named there:
   - repair-branch.txt
   - classification.tsv
   - report.md
   - product-failure-triage.tsv or exact-blocker-status.tsv if present in the same directory.
2. This lane exists because repair branches were being created without entering the validation/publication path. Do not do broad triage and do not launch broad fuzzing.
3. Validate that the adopted branch is a durable committed repair:
   - the branch resolves in the adoption row's source_repo, $CONTINUATION_SRC, or $SRC, in that order;
   - the branch head is not just the all-merge base head with no committed delta;
   - the relevant changed files match the reported product failure or exact blocker;
   - any focused validation in the source report is real, not only wp-env start/status.
4. If the branch is a real committed fix, run the smallest relevant validation you can afford: unit test, focused replay, or exact artifact check. If dependency resolution fails before the test starts, first repair the validation worktree dependency symlinks or install the missing dependency in the selected dependency source, then rerun the focused validation. If it needs to be merged into the current all-merge candidate, create a new non-destructive branch in the selected source repo with the repair applied; do not rewrite active fuzzing refs.
5. If the branch is only an alias for the current all-merge head, contains no committed delta, cannot be fetched, or only has uncommitted work, reject it explicitly and point back to the producer lane.
6. If accepted for local publication/validation, write ${report%/*}/push-manifest.tsv with header:
   source_branch	source_commit	intended_danluu_branch	base_ref	files_changed	insertions	deletions	validation_summary	reason
   Only include a manifest row when the committed diff is narrow and validation supports adoption. Otherwise omit the manifest and explain why.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/validation.tsv with header: check,result,detail,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the accepted/adopted branch name or NONE.
8. Classification rules:
   - Use repair_branch_adopted only if a committed branch in $SRC was validated or converted into a repaired candidate branch and the next publication/validation path is explicit.
   - Use repair_branch_rejected if the branch has no committed delta, is an alias-only label, or does not correspond to the failure it claims to fix.
   - Use repair_branch_invalid for missing source refs, bad branch names, uncommitted-only work, or branch/source mismatch.
   - Use blocked_specific only with an exact failed command or missing artifact needed next.

Passive prose without validation.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "benchmark-canary-product-failure" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required product failure triage TSV: ${report%/*}/product-failure-triage.tsv
Required exact blocker TSV: ${report%/*}/exact-blocker-status.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. Read current benchmark/product evidence:
   - $COVERAGE_BASE/current-output-dir.txt
   - the pointed benchmark-canary-coverage-status.tsv
   - the pointed novelty-status.md
   - $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
3. Treat rows with product_evidence_records > 0, retained_product_evidence=yes, or coverage_state containing product-failure as product repair/reduction blockers. They are not coverage success and not analysis-only.
4. Prioritize rtc-reference-oracle first, then other rows with the highest product_evidence_records. The RTC reference oracle means RTC-on converged to a result that disagrees with the RTC-off reference; that is a correctness oracle failure.
5. Run only bounded same-head replay, code inspection, or reducer work needed to produce a concrete next repair step. Do not launch broad fuzzing and do not stop shared loops.
6. If a browser/wp-env replay is needed, use a dependency-installed worktree or explicitly verify node_modules/.bin/wp-scripts exists before launching. Reserve a unique WP_ENV_HOME under $BASE/wp-env plus unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT; do not reuse localhost:8889. Run npm run wp-env status/start as needed and verify wp-login.php is not an Apache 404 before classifying a product failure.
7. If a concrete product fix is isolated, create only a new non-destructive local branch in this worktree, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
8. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/product-failure-triage.tsv with header: group,cases,transport,product_evidence_records,coverage_state,evidence,next_action,owner_result.
   - Write ${report%/*}/exact-blocker-status.tsv with header: blocker_id,result,evidence,next_action,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
9. Classification rules:
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and focused evidence points to it.
   - Use product_bug_reduced if a stable product reproducer or exact failing row is reduced but no safe fix was created.
   - Use exact_replay_green only if the same-head bounded replay or current forced row is green after the product failure disappeared.
   - Use exact_replay_downscoped only with explicit evidence that the row should be removed/downscoped.
   - Use adopted_active_artifact if a current active job is the exact equivalent.
   - Use blocked_specific only with the exact failed command or missing artifact needed next.

Passive prose without product-failure-triage.tsv, exact-blocker-status.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "plain-editor-product-smoke" ]; then
		plain_followup=""
		previous_classification=$(latest_plain_editor_repair_classification || true)
		if [ -s "$previous_classification" ]; then
			IFS=$'\t' read -r previous_class previous_next_action previous_artifact < <(
				awk -F '\t' 'NR > 1 && $1 == "plain-editor-product-smoke" { print $2 "\t" $4 "\t" $5; exit }' "$previous_classification"
			)
			case "$previous_class" in
				blocked_specific|product_bug_reduced)
					printf '%s\n' "$previous_classification" > "${report%/*}/require-server-error"
					plain_followup=$(cat <<EOF

This is a mandatory repair follow-up to a completed classification-only pass.
Previous classification: $previous_class
Previous artifact: ${previous_artifact:-$previous_classification}
Previous next action: ${previous_next_action:-missing}

Do not repeat the prior smoke-only reproduction or return the same missing-stack blocker. Before classifying:
1. Reproduce only the smallest failing edit/save workflow. Immediately write ${report%/*}/server-error.tsv with header: request,result,http_status,error_code,owning_callback,source_location,evidence_path.
2. If /wp-json/wp-sync/v1/save is reached, capture its response body plus the matching WordPress/PHP error and stack. Enable an isolated WP_DEBUG_LOG if the normal wp-env logs do not contain it, then locate the exact route callback and source line that throws or returns an error.
3. If save is not reached because editor startup/readiness fails first, write request=wp-sync-save, result=not_reached, http_status=not_observed, error_code=<earliest failure code>, owning_callback=not_reached, and the earliest failing source location/evidence. Reduce that earlier failure instead of waiting for a nonexistent save response.
4. Add the smallest focused regression check that fails for the observed mechanism. If the defect is in product code and the fix is safe, commit the fix on a local repair branch and rerun the focused check plus the one smoke test.
5. If no safe fix is possible after reducing the earliest failure, use product_bug_reduced with the callback/source location (or explicit not_reached evidence) and server-error.tsv. blocked_specific is allowed only for a new external prerequisite after executing its exact bounded collection command; it is not valid for a previously requested server stack that the workflow never reached.
EOF
					)
					;;
			esac
		fi
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: make the plain editor product smoke gate actionable and green, or produce an exact product/harness blocker with artifacts. This gate protects the human workflow: open post-new.php, edit title/body, save draft, reload/open the editor, and verify the editor remains usable and clean.
Report path: $report
Required classification TSV: $classification
Required validation TSV: ${report%/*}/validation.tsv
Required repair branch file: ${report%/*}/repair-branch.txt
$plain_followup

Task:
1. Read the bounded current state:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $COVERAGE_BASE/current-output-dir.txt
   - the current novelty-status.md and novelty-monitor.log under the current coverage output dir.
2. Inspect the plain editor smoke inputs only:
   - group: novelty-http-plain-editor-product-smoke
   - action profile: plain-editor-product-smoke
   - related harness code in $SRC/bin/rtc-browser-fuzz-novelty-monitor.mjs and the collaboration e2e smoke harness copied into the worktree when needed.
3. If current coverage is running this profile, wait only long enough to read its current artifact rows, then classify from evidence. Do not launch broad fuzzing.
4. If the profile is not being scheduled or no current gate line can be produced, repair the scheduler/profile wiring or run the smallest direct same-head smoke command needed to generate proof. Use unique WP_ENV_HOME, WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT if starting wp-env. Do not reuse localhost:8889.
5. A green result requires artifact-backed proof of successful post-new edit, Save draft, and reload/open verification with the editor not dirty and not read-only/sandboxed. Do not mark green on wp-env start/status alone.
6. If a product bug is reproduced, reduce it to the smallest stable smoke case. If a safe fix is isolated, create a new non-destructive local repair branch in this worktree, commit the fix, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/validation.tsv with header: check,result,detail,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
8. Classification rules:
   - Use smoke_green only with current same-head artifact proof of edit/save/reload usability.
   - Use repair_branch_created only if a committed local branch fixes a product or scheduler issue and validation points to it.
   - Use product_bug_reduced if the smoke workflow reliably reproduces a product bug but no safe fix was created.
   - Use harness_or_scheduler_repaired if the issue was only missing smoke scheduling and the gate now emits current proof.
   - Use blocked_specific only with a new exact failed command or missing external artifact needed next. It may not repeat a blocker already named by the previous completed classification.

Passive prose without validation.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "benchmark-canary-fuzzer-gap" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: treat benchmark canary failures as exact-stack promotion blockers, not as coverage-only bookkeeping. Repair the product/PR stack or promotion process until the same stack gets exact-stack green evidence.
Report path: $report
Required classification TSV: $classification
Required coverage-change TSV: ${report%/*}/coverage-change.tsv
Required repair branch file: ${report%/*}/repair-branch.txt
Required exact-stack status TSV: ${report%/*}/exact-stack-status.tsv

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
2. Read benchmark canary feedback:
   - $BENCHMARK_FEEDBACK_BASE/current-feedback.md
   - $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
3. Read current coverage/fuzzer state:
   - $COVERAGE_BASE/current-output-dir.txt
   - the pointed novelty-status.md
   - relevant scheduler/coverage scripts in $SRC/bin
4. Do not frame the benchmark as a downstream quality gate. A failure here means the fuzzer or promotion loop failed to exercise equivalent behavior early enough.
5. Separate two states explicitly:
   - coverage_present: equivalent fuzzing is scheduled/running;
   - exact_stack_green: the exact branch/commit rows from current-feedback.tsv pass or are replaced by a narrower fixed stack with evidence.
   Coverage alone must not clear a promotion_blocked row.
6. Make a concrete repair when possible:
   - add or prioritize an equivalent fuzz lane/coverage goal;
   - fix stale accounting or scheduling that prevents the equivalent lane from running;
   - or create/advance a local product-fix branch if the product bug is already isolated.
   The current failure mode is the exact all-merged stack returning an empty CRDT document on reload. Prefer focused debugging/fix work over declaring coverage repaired.
7. Do not stop shared fuzzing loops. If you start focused checks, use bounded runs and unique ports. Do not push to GitHub from Jetstream.
8. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/coverage-change.tsv with header: change_id,kind,result,detail,artifact_path.
   - Write ${report%/*}/exact-stack-status.tsv with header: row,branch,commit,status,evidence,next_action.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
9. Classification rules:
   - Use exact_stack_green only if exact-stack-status.tsv proves every promotion_blocked row is green or explicitly downscoped with a smaller replacement stack.
   - Use fix_branch_created only if a local branch exists and focused evidence points to it.
   - Use coverage_present_exact_stack_red if equivalent fuzz coverage exists but current-feedback.tsv still has promotion_blocked rows.
   - Use exact_stack_blocked if exact replay/fix work cannot proceed; next_action must be an exact command or artifact path.
   - Do not use coverage_repaired for this lane while current-feedback.tsv has promotion_blocked rows.
   - Use blocked_specific only with an exact next command or exact missing artifact.
   - Use no_active_feedback only if both feedback files are absent or empty.

Passive prose without coverage-change.tsv, exact-stack-status.tsv, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "reload-hydration" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required evidence TSV: ${report%/*}/reload-hydration-evidence.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. Read the deferred reload-hydration manifest and control state:
   - $DEFERRED_BASE/current-deferred-control.tsv
   - the manifest path named in the reload-hydration blocker row
3. Read the completed exact replay root named in the goal. At minimum inspect:
   - focused-shards.md
   - every state.json under the root
   - each lane's failure summaries, recheck logs, and reduced artifacts when present
4. Do not let the deferred single-flight hold hide completed evidence. If the exact replay completed, classify the evidence now:
   - title reload lane;
   - existing-post CRDT reload lane;
   - large HTTP lifecycle lane.
5. If failures are persistent product bugs in the candidate, create or advance a new non-destructive local repair branch in this worktree, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
6. If failures are fuzzer noise or already-invalid seeds, write the downscope/rejection reason with exact artifact paths. Do not call it green without evidence.
7. If more replay is needed, provide the exact bounded command and why the completed run was insufficient.
8. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/reload-hydration-evidence.tsv with header: lane,result,successes,real_bugs,uncertain_failures,infra_failures,evidence,next_action.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
9. Classification rules:
   - Use exact_replay_green only if all three exact replay lanes have no product or unexplained uncertain failures.
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and focused evidence points to a product fix.
   - Use exact_replay_downscoped only if remaining failures are explicitly non-product or invalid-seed noise with artifact paths.
   - Use exact_replay_needs_more_evidence only with an exact bounded replay command and the artifact that made the current evidence insufficient.
   - Use blocked_specific only with an exact missing artifact or command, not "wait for cooldown".

Passive prose without reload-hydration-evidence.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "reload-hydration-followup" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required validation TSV: ${report%/*}/validation.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the latest reload-hydration triage artifacts:
   - latest classification from $BASE/runs/*/continuations/reload-hydration/classification.tsv
   - latest report from $BASE/runs/*/continuations/reload-hydration/report.md
   - latest evidence TSV from $BASE/runs/*/continuations/reload-hydration/reload-hydration-evidence.tsv
2. Run the exact bounded follow-up commands from the latest report, or a strictly smaller equivalent that checks the same two confirmed seeds:
   - existing-post CRDT seed 7735007;
   - large HTTP lifecycle seed 7800014.
3. Do not run broad fuzzing. Do not stop shared loops. Reuse the exact candidate worktrees and ports if alive; if a port is dead, record that and run the narrowest equivalent with unique ports.
4. Decide whether the failures are product bugs in the reload-hydration candidate, test/harness diagnostics, invalid seeds, or still unresolved. If a concrete product fix is isolated, create only a new non-destructive local repair branch in this worktree, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
5. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/validation.tsv with header: check,result,detail,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
6. Classification rules:
   - Use followup_product_bug if the bounded replay confirms a candidate product bug and no repair branch was created.
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and validation points to that fix.
   - Use followup_downscoped only if the bounded replay proves the failures are non-product, invalid-seed, or harness-only, with artifact paths.
   - Use followup_green only if the bounded replay passes both confirmed seeds and explains why the prior uncertain failures no longer block.
   - Use blocked_specific only with an exact failing command or missing artifact.

Passive prose without validation.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "reload-hydration-repair" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required validation TSV: ${report%/*}/validation.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the latest reload-hydration follow-up artifacts:
   - latest classification from $BASE/runs/*/continuations/reload-hydration-followup/classification.tsv
   - latest report from $BASE/runs/*/continuations/reload-hydration-followup/report.md
   - artifacts under the same reload-hydration-followup directory.
2. Focus on the confirmed remaining product signal: large HTTP lifecycle seed 7800014 fails exact replay with RTC fuzz-only marker-set divergence during final-ui-witness-sweep; the same seed passes when only GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP=0 is set.
3. Do not run broad fuzzing and do not stop shared loops. Run only bounded reproductions, reductions, code inspection, or targeted tests needed to isolate whether this is a product bug in reload hydration, a stale witness oracle, or a smaller existing bug family.
4. If a concrete low-risk product fix is isolated, create a new non-destructive local branch in this worktree, commit the fix on that branch, verify the branch head differs from the continuation start head, and validate it against the reduced reproducer. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
5. Produce durable artifacts:
   - Write a concise issue/fix report to $report.
   - Write ${report%/*}/validation.tsv with header: check,result,detail,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
6. Classification rules:
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and validation points to that fix.
   - Use product_bug_reduced if a smaller stable product reproducer exists but no safe fix was created.
   - Use oracle_downscoped only if the final witness check is proven wrong without hiding real marker divergence.
   - Use blocked_specific only with the exact command, log, and missing prerequisite.

Passive prose without validation.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "reload-hydration-reproducer-reacquire" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required reacquire evidence TSV: ${report%/*}/reacquire-evidence.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. Read the latest reload-hydration repair artifacts:
   - latest classification from $BASE/runs/*/continuations/reload-hydration-repair/classification.tsv
   - latest report from $BASE/runs/*/continuations/reload-hydration-repair/report.md
   - artifacts under the same reload-hydration-repair directory.
3. Reacquire, downscope, or keep blocked for the same-head seed 7800014 final-ui-witness divergence. Prefer the current reload-hydration candidate worktree at $DEFERRED_BASE/worktrees/reload-hydration-20260526T024231Z if it is clean; otherwise create only a new non-destructive worktree/branch.
4. Do not run broad fuzzing and do not stop shared loops. Use bounded isolated reproductions only. If a browser/wp-env replay is needed, use a dependency-installed worktree or verify node_modules/.bin/wp-scripts exists first. Reserve a unique WP_ENV_HOME under $BASE/wp-env plus unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT; do not reuse localhost:8889. Run npm run wp-env status/start as needed and verify wp-login.php is not an Apache 404 before interpreting product behavior.
5. If the final-ui-witness divergence reproduces stably, preserve exact commands/logs and classify exact_reproducer_reacquired. If the same-head isolated replay passes enough to invalidate the old final-ui failure, classify replay_backed_downscope or exact_reproducer_not_reproduced with exact evidence. If only a different product family reproduces, classify product_bug_reduced and route it separately.
6. Do not create a product-code repair branch unless a stable same-head final-ui-witness failure is reacquired and a concrete low-risk fix is isolated. If you create one, commit the fix and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/reacquire-evidence.tsv with header: check,result,detail,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
8. Classification rules:
   - Use exact_reproducer_reacquired only with a current stable same-head final-ui-witness failure and exact artifact paths.
   - Use replay_backed_downscope only if current bounded same-head replay evidence makes the old final-ui failure non-blocking.
   - Use exact_reproducer_not_reproduced only if current bounded same-head replays pass and there is no product failure to route.
   - Use product_bug_reduced only for a different stable product family, not for the missing final-ui reproducer itself.
   - Use blocked_specific only with the exact failed command, log, and missing prerequisite.

Passive prose without reacquire-evidence.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	if [ "$lane" = "pr07c-browser-env" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: repair the PR07C browser/runtime environment so owner-proof replay can run. The known failure is "Timed out waiting for collaboration to become ready" with window._wpCollaborationEnabled null while wp.data/wp.blocks/editor state are loaded.
Report path: $report
Required classification TSV: $classification
Required validation TSV: ${report%/*}/validation.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. Read the latest runtime-readiness blocker artifact if present:
   - /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T191553Z/jobs/outputs/rtc-cycle296-pr07-runtime-readiness-after-root-recovery/report.md
   - /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T191553Z/jobs/outputs/rtc-cycle296-pr07-runtime-readiness-after-root-recovery/replay-classification.tsv
   - /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T191553Z/jobs/outputs/rtc-cycle296-pr07-runtime-readiness-after-root-recovery/live-replay/PR07C/same-user-primary/replay.log
3. Do not treat an existing runtime-readiness-blocked artifact as success. That artifact is the problem to repair.
4. Debug why wp option update wp_collaboration_enabled succeeds but window._wpCollaborationEnabled remains null on the post editor page. Check, at minimum:
   - whether the Gutenberg plugin and e2e plugin mappings are active in the replay wp-env;
   - whether lib/compat/wordpress-7.0/collaboration.php is loaded;
   - whether wp_is_collaboration_enabled() and wp_is_collaboration_allowed() return true inside wp-env;
   - whether wp-core-data is enqueued and whether the inline script attached by gutenberg_inject_real_time_collaboration_setting is present in the rendered editor HTML;
   - whether the replay clone's .wp-env.json, plugin activation, or checkout shape prevents the injection.
5. You may run focused environment probes, wp-env commands, and a bounded PR07C readiness replay when resources permit. Do not run broad fuzzing. Reserve unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT if starting wp-env. Do not stop shared fuzzing loops.
6. If a fix is needed, create only a new non-destructive local branch in this worktree, for example repair/rtc-pr07c-collaboration-readiness-<timestamp>, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/validation.tsv with header: check, result, detail.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
8. Classification rules:
   - Use repaired_ready only if a focused replay reaches the seeded action/reload/checkpoint phase, or if a minimal readiness probe proves window._wpCollaborationEnabled true and the remaining command to run owner replay is exact.
   - Use repair_branch_created if you created a local branch, committed the fix on that branch, verified the branch head differs from the continuation start head, and validation proves the readiness injection issue is fixed.
   - Use repair_blocked only with a specific failing check and an exact next command/artifact path.
   - Do not use resolved_by_active_artifact_runtime_readiness_not_product for this lane; that is the old structural failure.

This job exists to make PR07C evidence runnable. Passive classification without repair evidence is a failure.
	EOF
		return
	fi
	if [[ "$lane" == pa-exact-benchmark-canary-* || "$lane" == pa-exact-novelty-http-self-presence-ui-signals-* ]]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification
Required exact blocker TSV: ${report%/*}/exact-blocker-status.tsv
Required repair branch file: ${report%/*}/repair-branch.txt

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. Read the exact blocker, benchmark/canary, and coverage evidence named in the Goal, plus any applicable:
   - $COVERAGE_BASE/current-output-dir.txt
   - the pointed benchmark-canary-coverage-status.tsv when present
   - $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
3. Treat this as a bounded same-head repair-or-downscope job. Do not run broad fuzzing and do not stop shared loops.
4. If the evidence already has an active equivalent exact replay, adopt it and write the session/artifact path. If not, run only the smallest replay, code inspection, or repair step needed for this exact seed/family.
5. If a browser/wp-env replay is needed, use a dependency-installed worktree or explicitly verify node_modules/.bin/wp-scripts exists before launching. Reserve a unique WP_ENV_HOME under $BASE/wp-env plus unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT; do not reuse localhost:8889. Run npm run wp-env status/start as needed and verify wp-login.php is not an Apache 404 before classifying a product failure.
6. If a concrete product fix is isolated, create only a new non-destructive local branch in this worktree, commit the fix on that branch, and verify the branch head differs from the continuation start head. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/exact-blocker-status.tsv with header: blocker_id,result,evidence,next_action,artifact_path.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
8. Classification rules:
   - Use exact_replay_green only if the same-head bounded replay for this seed/family passes or the forced row has direct current-run green evidence.
   - Use repair_branch_created only if a local branch exists, the fix is committed on that branch, the branch head differs from the continuation start head, and validation points to that fix.
   - Use exact_replay_downscoped only with explicit evidence that the row should be removed/downscoped.
   - Use product_bug_reduced if a stable product reproducer exists but no safe fix was created.
   - Use adopted_active_artifact if a current active job is the exact equivalent.
   - Use blocked_specific only with the exact failed command or missing artifact needed next.

Passive prose without exact-blocker-status.tsv, repair-branch.txt, and classification.tsv is a failure.
EOF
		return
	fi
	cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

$prompt_search_limits

Lane: $lane
Goal: $goal
Report path: $report
Required classification TSV: $classification

Task:
1. Read the critical-path executor state files:
   - $STATUS
   - $BLOCKERS
   - $QUEUE
   - $LANES
   - $INPUTS
   - $NO_PROGRESS
2. For lane "$lane", determine whether the blocker described by the goal is
   truly a product blocker, already resolved by an active artifact, or should be
   reclassified/downscoped.
3. Adopt existing active work if it is equivalent. Do not launch more fuzzing. Do not stop loops. Do not push to GitHub.
4. If a small local branch/worktree correction is clearly needed, create it only as a new non-destructive local branch in this worktree. Do not rewrite active fuzzing refs.
5. Produce durable artifacts:
   - Write a concise report to $report.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path
6. If blocked, the next_action must be an exact command or exact artifact path needed next, not "wait and see".

This job exists to unblock PR execution. Passive prose without classification.tsv is a failure.
EOF
}


copy_generated_rtc_fuzz_harness() {
	local source_repo=$1 worktree=$2 run_dir=$3 rel log_file
	log_file="$run_dir/generated-harness-copy.log"
	: > "$log_file"
	printf 'source_repo\t%s\n' "$source_repo" >> "$log_file"
	for rel in \
		test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts \
		test/e2e/specs/editor/collaboration/collaboration-human-smoke.spec.ts \
		test/e2e/specs/editor/collaboration/collaboration-rtc-reference.spec.ts \
		test/e2e/specs/editor/collaboration/websocket \
		test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts
	do
		if [ -d "$source_repo/$rel" ]; then
			mkdir -p "$worktree/$rel"
			cp -a "$source_repo/$rel"/. "$worktree/$rel"/
			printf 'copied\tdir\t%s\n' "$rel" >> "$log_file"
		elif [ -f "$source_repo/$rel" ]; then
			mkdir -p "$worktree/$(dirname "$rel")"
			cp -a "$source_repo/$rel" "$worktree/$rel"
			printf 'copied\tfile\t%s\n' "$rel" >> "$log_file"
		else
			printf 'missing\t%s\n' "$rel" >> "$log_file"
		fi
	done
}

launch_continuation_job() {
	local lane=$1 dedupe=$2 active_pattern=$3 goal=$4
	local force=${5:-0}
	local active active_continuations session ts run_dir worktree prompt report classification stderr rc runner slug codex_output base_head placeholder_entry
	active=$(active_work_matching "$active_pattern" || true)
	if [ "$lane" = "benchmark-canary-fuzzer-gap" ] && [ -z "$active" ]; then
		active=$(benchmark_exact_stack_active || true)
	fi
	[ -z "$active" ] || return 0
	if task_recently_launched "$dedupe" "$MIN_TASK_INTERVAL_SECONDS" && ! latest_continuation_was_stale_orphan_killed "$lane"; then
		return 0
	fi
	active_continuations=$(active_continuation_identity_count)
	if [ "$active_continuations" -ge "$MAX_ACTIVE_CONTINUATIONS" ] && [ "$force" != 1 ]; then
		return 0
	fi
	if [ "$active_continuations" -ge "$(( MAX_ACTIVE_CONTINUATIONS + 1 ))" ]; then
		return 0
	fi
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	slug=$(slugify "$lane" | cut -c1-48)
	session="rtc-critical-continuation-$slug-$ts"
	run_dir="$BASE/runs/$ts/continuations/$slug"
	worktree="$BASE/worktrees/continuation-$slug-$ts"
	local continuation_src="$CONTINUATION_SRC"
	if [ ! -d "$continuation_src/.git" ]; then
		continuation_src="$SRC"
	fi
	mkdir -p "$run_dir"
	base_head=$(git -C "$continuation_src" rev-parse HEAD 2>/dev/null || true)
	{
		printf 'continuation_src=%s\n' "$continuation_src"
		printf 'continuation_start_head=%s\n' "$base_head"
	} > "$run_dir/source-repo.log"
	if ! git -C "$continuation_src" worktree add --detach "$worktree" HEAD > "$run_dir/worktree.log" 2>&1; then
		log "failed to create continuation worktree for $lane from $continuation_src; see $run_dir/worktree.log"
		return 0
	fi
	base_head=${base_head:-$(git -C "$worktree" rev-parse HEAD 2>/dev/null || true)}
	for dependency_dir in node_modules vendor; do
		[ -d "$continuation_src/$dependency_dir" ] || continue
		[ ! -L "$worktree/$dependency_dir" ] || continue
		if [ -d "$worktree/$dependency_dir" ]; then
			placeholder_entry=$(find "$worktree/$dependency_dir" -mindepth 1 -maxdepth 1 ! -name .gitignore -print -quit 2>/dev/null || true)
			[ -z "$placeholder_entry" ] || continue
			rm -f "$worktree/$dependency_dir/.gitignore"
			rmdir "$worktree/$dependency_dir" 2>/dev/null || continue
		elif [ -e "$worktree/$dependency_dir" ]; then
			continue
		fi
		ln -s "$continuation_src/$dependency_dir" "$worktree/$dependency_dir" >> "$run_dir/worktree.log" 2>&1 || true
	done
	copy_generated_rtc_fuzz_harness "$continuation_src" "$worktree" "$run_dir"
	prompt="$run_dir/prompt.md"
	report="$run_dir/report.md"
	codex_output="$run_dir/codex-output.log"
	classification="$run_dir/classification.tsv"
	stderr="$run_dir/stderr.log"
	rc="$run_dir/rc"
	runner="$run_dir/run.sh"
	write_continuation_prompt "$prompt" "$report" "$classification" "$lane" "$goal"
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$worktree"
set +e
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$codex_output" 2> "$stderr"
code=\$?
set -e
if [ -s "$codex_output" ]; then
	mv "$codex_output" "$report"
elif [ -s "$stderr" ]; then
	{
		echo "# Critical Continuation Stderr Transcript"
		echo
		echo "- lane: $lane"
		echo "- exit_code: \$code"
		echo "- reason: Codex produced no stdout report, but stderr contains a transcript. Preserving it so progress is inspectable instead of creating a zero-output artifact."
		echo "- stderr: $stderr"
		echo "- prompt: $prompt"
		echo
			echo '\`\`\`text'
			sed -n '1,2400p' "$stderr"
			echo '\`\`\`'
	} > "$report"
else
	cat > "$report" <<REPORT
# Critical Continuation No Progress

- lane: $lane
- exit_code: \$code
- reason: Codex produced no report output before exit or timeout.
- stderr: $stderr
- prompt: $prompt

This artifact is intentionally non-empty so the executor can treat the run as a
stale execution failure instead of an in-progress zero-byte report.
REPORT
fi
if [ ! -s "$classification" ]; then
	printf 'lane_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
	printf '%s\\tno_progress\\tmissing classification artifact or empty Codex output; review stderr/report and rerun bounded continuation only if no newer evidence exists\\t%s\\n' "$lane" "$report" >> "$classification"
fi
if [ -f "${report%/*}/require-server-error" ] && [ ! -s "${report%/*}/server-error.tsv" ]; then
	cp "$classification" "$classification.before-server-error-guard" 2>/dev/null || true
	printf 'lane_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
	printf '%s\\tfollowup_incomplete\\trepeated repair pass omitted required server-error.tsv; previous classification saved at %s.before-server-error-guard\\tcapture the wp-sync save response body and matching PHP stack/callback before another classification\\t%s\\n' "$lane" "$classification" "${report%/*}/require-server-error" >> "$classification"
fi
if awk -F '\t' 'NR > 1 && \$2 ~ /^(repair_branch_created|fix_branch_created)$/ { found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null; then
	repair_file="${report%/*}/repair-branch.txt"
	branch=\$(sed -n '1p' "\$repair_file" 2>/dev/null | tr -d '\r')
	branch_head=""
	invalid_reason=""
	if [ -z "\$branch" ] || [ "\$branch" = "NONE" ]; then
		invalid_reason="repair_branch_created_without_branch_name"
	elif ! git check-ref-format --branch "\$branch" >/dev/null 2>&1; then
		invalid_reason="repair_branch_created_bad_branch_name"
	else
		branch_head=\$(git -C "$worktree" rev-parse --verify --quiet "\$branch^{commit}" 2>/dev/null || true)
		if [ -z "\$branch_head" ]; then
			invalid_reason="repair_branch_created_branch_does_not_resolve"
		elif [ -n "$base_head" ] && [ "\$branch_head" = "$base_head" ]; then
			invalid_reason="repair_branch_created_no_committed_delta_from_start_head"
		fi
	fi
	{
		printf 'lane_id\\trepair_branch\\tstart_head\\tbranch_head\\tresult\\tdetail\\n'
		if [ -n "\$invalid_reason" ]; then
			printf '%s\\t%s\\t%s\\t%s\\tinvalid\\t%s\\n' "$lane" "\${branch:-}" "$base_head" "\${branch_head:-}" "\$invalid_reason"
		else
			printf '%s\\t%s\\t%s\\t%s\\tvalid\\tcommitted repair branch differs from start head\\n' "$lane" "\$branch" "$base_head" "\$branch_head"
		fi
	} > "${report%/*}/repair-branch-head.tsv"
	if [ -n "\$invalid_reason" ]; then
		cp "$classification" "$classification.before-repair-branch-guard" 2>/dev/null || true
		printf 'lane_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
		printf '%s\\trepair_branch_invalid\\t%s; previous classification saved at %s.before-repair-branch-guard\\tcreate a committed repair branch whose head differs from the continuation start head, or classify product_bug_reduced/blocked_specific without claiming a branch\\t%s\\n' "$lane" "\$invalid_reason" "$classification" "${report%/*}/repair-branch-head.tsv" >> "$classification"
		printf 'NONE\\n' > "\$repair_file"
	fi
fi
printf '%s\\n' "\$code" > "$rc"
exit 0
EOF
	chmod +x "$runner"
	append_launch continuation "$session" "$dedupe" "$run_dir"
	json_event launch "continuation $lane session=$session"
	tmux_new_session_detached "$session" "bash '$runner'"
}

launch_continuation_jobs() {
	local reload_completed_root reload_completed_mtime
	local generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path blocker_id active_pattern
	local benchmark_product_status benchmark_product_summary benchmark_product_signature
	local plain_smoke_summary plain_smoke_class plain_smoke_classification
	local focused_exact_open=0 aggregate_benchmark_repair_allowed=0
	if benchmark_product_repair_allowed_by_controller; then
		aggregate_benchmark_repair_allowed=1
	fi
	if productive_analysis_exact_blocker_open || focused_benchmark_canary_blocker_open; then
		focused_exact_open=1
	fi
	while IFS=$'\t' read -r generated_at action_id target_loop priority action_kind family_or_pr evidence_path next_action control_path; do
		[ -n "$family_or_pr" ] || continue
		blocker_id=$(productive_analysis_exact_blocker_id "$family_or_pr" "$action_id" "$next_action" "$evidence_path")
		if productive_analysis_exact_blocker_suppressed "$blocker_id" "$action_kind" "$evidence_path" "$next_action" "$generated_at"; then
			continue
		fi
		case "$blocker_id" in
			pa-exact-benchmark-canary-product-failure)
				if focused_benchmark_canary_blocker_open && [ "$aggregate_benchmark_repair_allowed" -ne 1 ]; then
					log "pa-exact benchmark-canary-product-failure suppressed while focused benchmark canary blockers are open"
					continue
				fi
				active_pattern=$(slugify "$blocker_id" | cut -c1-48)
				launch_continuation_job \
					"$blocker_id" \
					"productive-exact-v3-$blocker_id" \
					"$active_pattern" \
					"productive-analysis exact blocker $action_id for $family_or_pr. Evidence: $evidence_path. Required action: $next_action" \
					1
				;;
			pa-exact-*)
				active_pattern=$(slugify "$blocker_id" | cut -c1-48)
				launch_continuation_job \
					"$blocker_id" \
					"productive-exact-v3-$blocker_id" \
					"$active_pattern" \
					"productive-analysis exact blocker $action_id for $family_or_pr. Evidence: $evidence_path. Required action: $next_action" \
					1
				;;
		esac
	done < <(productive_analysis_exact_blocker_rows || true)
	if benchmark_feedback_present && benchmark_effective_promotion_blocked; then
		launch_benchmark_feedback_refresh || true
		launch_continuation_job \
			"benchmark-canary-fuzzer-gap" \
			"benchmark-canary-exact-stack-$(file_hash "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" | cut -c1-12)" \
			"benchmark-canary-fuzzer-gap|benchmark-canary" \
			"exact-stack promotion repair: current benchmark canary has promotion_blocked rows; do not clear this blocker with coverage_repaired alone. Create/advance a product fix branch or exact-stack replay evidence and write exact-stack-status.tsv/classification.tsv." \
			1
	fi
	if repair_branch_adoption_open; then
		benchmark_product_summary=$(repair_branch_adoption_summary || true)
		launch_continuation_job \
			"benchmark-canary-repair-branch-adoption" \
			"benchmark-canary-repair-branch-adoption-$(hash_key "$benchmark_product_summary")" \
			"benchmark-canary-repair-branch-adoption|repair-branch-adoption" \
			"adopt or reject the latest benchmark-canary continuation repair branch before launching more generic product reduction. Evidence: ${benchmark_product_summary:-missing repair branch adoption summary}. Read $REPAIR_ADOPTIONS and write validation.tsv, repair-branch.txt, classification.tsv, and push-manifest.tsv only if the branch is a durable committed fix." \
			1
	fi
	if benchmark_product_failures_open; then
		if [ "$focused_exact_open" -eq 1 ] && [ "$aggregate_benchmark_repair_allowed" -ne 1 ]; then
			log "benchmark-canary-product-failure aggregate repair suppressed while focused productive exact blockers are open"
		else
			benchmark_product_status=$(latest_benchmark_coverage_status || true)
			benchmark_product_summary=$(benchmark_product_failure_summary || true)
			benchmark_product_signature=$(benchmark_product_failure_signature || true)
			launch_continuation_job \
				"benchmark-canary-product-failure" \
				"benchmark-canary-product-failure-$(hash_key "$benchmark_product_signature")" \
				"benchmark-canary-product-failure" \
				"benchmark canary product-failure repair: ${benchmark_product_summary:-no-summary}. Evidence: ${benchmark_product_status:-missing}. Reduce or repair the current product-failure rows; start with rtc-reference-oracle if present; write product-failure-triage.tsv, exact-blocker-status.tsv, repair-branch.txt, and classification.tsv." \
				1
		fi
	fi
	if coverage_materialization_liveness_open; then
		launch_continuation_job \
			"coverage-materialization-liveness" \
			"coverage-materialization-liveness-$(file_hash "$(latest_coverage_novelty_status)" | cut -c1-12)" \
			"coverage-materialization-liveness|materialization-liveness|coverage-liveness" \
			"coverage-guided materialization liveness repair: current novelty status, monitor log, supervisor state, or state-file size indicates unhealthy materialization. This includes stale startup first-pass pending, repeated novelty monitor pass failures such as RangeError/heap/string serialization failures, missing supervisor-state.json, oversized novelty-state.json, or zero current-run active dirs/records after a pass. Inspect the bounded current output root, novelty-monitor.log, novelty-state.json, supervisor-state.json, supervisor-groups.json, coverage-change.tsv, and classification.tsv; fix the scheduler/materializer/controller path so enabled profiles produce ingested behavioral records or write an explicit downscope with evidence." \
			1
	fi
	if plain_editor_product_smoke_open && allow_critical_browser_preflight; then
		plain_smoke_summary=$(plain_editor_product_smoke_summary || true)
		plain_smoke_classification=$(latest_plain_editor_repair_classification || true)
		plain_smoke_class=$(awk -F '\t' 'NR > 1 && $1 == "plain-editor-product-smoke" { print $2; exit }' "$plain_smoke_classification" 2>/dev/null || true)
		case "$plain_smoke_class" in
			blocked_specific|product_bug_reduced)
				launch_continuation_job \
					"plain-editor-product-smoke" \
					"plain-editor-product-smoke-server-error-v1-$(file_hash "$plain_smoke_classification" | cut -c1-12)" \
					"^rtc-critical-continuation-plain-editor-product-smoke-|^continuation-plain-editor-product-smoke-" \
					"plain editor product smoke repair follow-up: collect the wp-sync save response and PHP stack/callback requested by ${plain_smoke_classification:-the previous classification}, then create a focused fix branch or a source-backed product_bug_reduced artifact. Do not repeat the same blocked_specific result." \
					1
				;;
			*)
				launch_continuation_job \
					"plain-editor-product-smoke" \
					"plain-editor-product-smoke-$(hash_key "$plain_smoke_summary")" \
					"^rtc-critical-continuation-plain-editor-product-smoke-|^continuation-plain-editor-product-smoke-" \
					"plain editor product smoke gate is open: ${plain_smoke_summary:-missing smoke summary}. Produce current same-head edit/save/reload proof, repair smoke scheduling, or reduce/create a product fix branch. This gate must not remain a passive runnable status row." \
					1
				;;
		esac
	fi
	if ! lane_terminal_suppressed pr17-1020002 &&
		awk -F '\t' '$1 == "pr17-1020002" && $4 == "runnable" { found = 1 } END { exit(found ? 0 : 1) }' "$BLOCKERS"; then
		launch_continuation_job \
			"pr17-1020002" \
			"pr17-1020002-proof" \
			"1020002|pr17|critical-continuation-pr17" \
			"PR17 / seed 1020002 proof-or-reclassification for final-stack validation and filing"
	fi
	if ! lane_terminal_suppressed seed-5200005-reducer; then
		launch_continuation_job \
			"seed-5200005-reducer" \
			"5200005-reducer" \
			"5200005|critical-continuation-seed-5200005" \
			"bounded reducer/classification for seed 5200005 without launching broad fuzzing"
	fi
	if ! lane_terminal_suppressed seed-1060015-reducer; then
		launch_continuation_job \
			"seed-1060015-reducer" \
			"1060015-reducer" \
			"1060015|critical-continuation-seed-1060015" \
			"bounded reducer/classification for seed 1060015 without launching broad fuzzing"
	fi
	if ! pr07c_readiness_resolved && allow_critical_browser_preflight; then
		launch_continuation_job \
			"pr07c-browser-env" \
			"pr07c-browser-env-repair-v2" \
			"pr07c-browser-env|pr07c|browser-env" \
			"PR07C browser-environment repair: debug and fix collaboration readiness null so owner-proof replay can reach seeded action/reload/checkpoint phase. Reserve unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT if running browser checks; write validation.tsv/report.md/classification.tsv and repair-branch.txt."
	fi
	reload_completed_root=$(reload_hydration_exact_replay_completed_root || true)
	if [ -n "$reload_completed_root" ] && ! reload_hydration_completed_exact_replay_triaged; then
		reload_completed_mtime=$(reload_hydration_exact_replay_mtime "$reload_completed_root")
		launch_continuation_job \
			"reload-hydration" \
			"reload-hydration-exact-triage-$(basename "$reload_completed_root")-$reload_completed_mtime" \
			"critical-continuation-reload-hydration" \
			"consume completed reload-hydration exact replay root $reload_completed_root; classify title/existing/large lane evidence, then adopt, repair, or explicitly downscope the deferred manifest without waiting for the deferred single-flight cooldown." \
			1
	fi
	if reload_hydration_needs_followup && ! reload_hydration_followup_artifact_current; then
		launch_continuation_job \
			"reload-hydration-followup" \
			"reload-hydration-followup-$(file_hash "$(latest_lane_classification reload-hydration)" | cut -c1-12)" \
			"critical-continuation-reload-hydration-followup" \
			"run the bounded reload-hydration follow-up from the latest triage report; separate product bug from harness/test diagnostics for confirmed existing-post seed 7735007 and large-lifecycle seed 7800014, then repair, downscope, or keep blocked with exact evidence." \
			1
	fi
	if reload_hydration_followup_product_bug && ! reload_hydration_repair_artifact_current; then
		launch_continuation_job \
			"reload-hydration-repair" \
			"reload-hydration-product-repair-$(file_hash "$(latest_reload_hydration_followup_classification)" | cut -c1-12)" \
			"critical-continuation-reload-hydration-repair|reload-hydration-product-repair" \
			"repair or reduce the reload-hydration large-lifecycle seed 7800014 final UI witness marker divergence confirmed by bounded follow-up; create a local repair branch only if a safe product fix is isolated." \
			1
	fi
	if reload_hydration_repair_blocked_specific_current && ! reload_hydration_reacquire_artifact_current; then
		launch_continuation_job \
			"reload-hydration-reproducer-reacquire" \
			"reload-hydration-reproducer-reacquire-$(file_hash "$(latest_reload_hydration_repair_classification)" | cut -c1-12)" \
			"critical-continuation-reload-hydration-reproducer-reacquire|reload-hydration-reproducer-reacquire" \
			"reacquire or downscope reload-hydration seed 7800014 final-ui-witness divergence after the latest repair pass could not reproduce it. Use a dependency-installed same-head candidate worktree, unique wp-env home and ports, and do not reuse localhost:8889." \
			1
	fi
	if reload_hydration_reacquired_repair_needed; then
		launch_continuation_job \
			"reload-hydration-repair" \
			"reload-hydration-product-repair-reacquired-$(file_hash "$(latest_reload_hydration_reacquire_classification)" | cut -c1-12)" \
			"critical-continuation-reload-hydration-repair|reload-hydration-product-repair" \
			"repair or reduce the current stable reload-hydration seed 7800014 final-ui-witness reproducer reacquired by $(latest_reload_hydration_reacquire_classification)." \
			1
	fi
	if benchmark_feedback_present && ! benchmark_effective_promotion_blocked && ! benchmark_exact_stack_green_current; then
		launch_continuation_job \
			"benchmark-canary-fuzzer-gap" \
			"benchmark-canary-fuzzer-gap-$(file_hash "$BENCHMARK_FEEDBACK_BASE/current-feedback.md" | cut -c1-12)" \
			"benchmark-canary-fuzzer-gap|benchmark-canary" \
			"consume benchmark canary feedback as a fuzzer/promotion-process gap; add or repair equivalent fuzz coverage or create a local fix branch, with durable coverage-change and classification artifacts"
	fi
	if productive_analysis_feedback_present && ! productive_analysis_resolved_by_active_artifacts; then
		launch_continuation_job \
			"productive-analysis-action" \
			"productive-analysis-action-$(file_hash "$PRODUCTIVE_ANALYSIS_BASE/critical-path-feedback.md" | cut -c1-12)" \
			"critical-continuation-productive-analysis-action" \
			"consume productive-analysis feedback rows from $PRODUCTIVE_ANALYSIS_BASE; implement the smallest safe controller, coverage, branch-repair, or downscope action that moves the RTC fix project forward, and write durable classification/evidence artifacts"
	fi
}

launch_validation_jobs() {
	local active branch lane_id base_ref publication_class head_sha
	active=$(active_count_matching '^rtc-critical-validate-')
	[ "$active" -lt "$MAX_ACTIVE_VALIDATIONS" ] || return 0
	while IFS= read -r branch; do
		[ -n "$branch" ] || continue
		active=$(active_count_matching '^rtc-critical-validate-')
		[ "$active" -lt "$MAX_ACTIVE_VALIDATIONS" ] || break
		head_sha=$(git -C "$SRC" rev-parse --short=12 "$branch" 2>/dev/null || true)
		[ -n "$head_sha" ] || continue
		base_ref=$(repair_branch_base_ref "$branch")
		[ -n "$base_ref" ] || continue
		lane_id="repair-branch-$(slugify "$branch" | cut -c1-56)"
		publication_class=$(publication_class_for_branch "$branch")
		launch_validation_job "$lane_id" "$branch" "$base_ref" "$publication_class" "$head_sha" || true
	done < <(adopted_repair_branches)
	while IFS= read -r branch; do
		[ -n "$branch" ] || continue
		active=$(active_count_matching '^rtc-critical-validate-')
		[ "$active" -lt "$MAX_ACTIVE_VALIDATIONS" ] || break
		head_sha=$(git -C "$SRC" rev-parse --short=12 "$branch" 2>/dev/null || true)
		[ -n "$head_sha" ] || continue
		base_ref=$(branch_base_ref "$branch")
		lane_id="branch-$(slugify "$branch" | cut -c1-64)"
		publication_class=$(publication_class_for_branch "$branch")
		launch_validation_job "$lane_id" "$branch" "$base_ref" "$publication_class" "$head_sha" || true
	done < <(candidate_branches)
}


data_disk_available_gib() {
	local value
	value=$(df -Pk "$BASE" 2>/dev/null | awk 'NR == 2 { printf "%d", $4 / 1024 / 1024 }')
	printf '%s' "${value:-0}"
}

worktree_prune_running() {
	local pid
	[ -s "$WORKTREE_PRUNE_PID_FILE" ] || return 1
	pid=$(cat "$WORKTREE_PRUNE_PID_FILE" 2>/dev/null || true)
	[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

prune_stale_worktrees_if_needed() {
	local reason free retention_minutes max_delete parallel list count
	[ -d "$BASE/worktrees" ] || return 0
	if worktree_prune_running; then
		return 0
	fi
	reason=$(resource_reason)
	free=$(data_disk_available_gib)
	retention_minutes=$(( WORKTREE_PRUNE_RETENTION_SECONDS / 60 ))
	max_delete=$WORKTREE_PRUNE_MAX_DELETE_PER_PASS
	parallel=$WORKTREE_PRUNE_PARALLEL
	case "$reason" in
		disk_pressure|disk_high_pressure|disk_severe_pressure|severe_pressure)
			retention_minutes=$(( WORKTREE_PRUNE_PRESSURE_RETENTION_SECONDS / 60 ))
			max_delete=$WORKTREE_PRUNE_PRESSURE_MAX_DELETE_PER_PASS
			parallel=$WORKTREE_PRUNE_PRESSURE_PARALLEL
			;;
	esac
	if [ "${free:-0}" -gt 0 ] && [ "$free" -lt "$WORKTREE_PRUNE_EMERGENCY_FREE_GIB" ]; then
		retention_minutes=60
		max_delete=$WORKTREE_PRUNE_EMERGENCY_MAX_DELETE_PER_PASS
		parallel=$WORKTREE_PRUNE_PRESSURE_PARALLEL
	fi
	[ "$retention_minutes" -gt 0 ] || retention_minutes=60
	[ "$max_delete" -gt 0 ] || max_delete=1
	[ "$parallel" -gt 0 ] || parallel=1
	list=$(mktemp "$BASE/worktree-prune.XXXXXX.list")
	find "$BASE/worktrees" -mindepth 1 -maxdepth 1 -type d ! -name runs -mmin +"$retention_minutes" -printf '%T@ %p\n' 2>/dev/null |
		sort -n |
		awk -v max="$max_delete" 'NR <= max { sub(/^[^ ]+ /, ""); print }' > "$list"
	count=$(wc -l < "$list" | tr -d ' ')
	if [ "${count:-0}" -eq 0 ]; then
		rm -f "$list"
		return 0
	fi
	log "starting async critical worktree prune reason=$reason free=${free}GiB retention_minutes=$retention_minutes count=$count parallel=$parallel"
	(
		set +e
		active=$(mktemp "$BASE/worktree-prune-active.XXXXXX.list")
		delete_list=$(mktemp "$BASE/worktree-prune-delete.XXXXXX.list")
		for proc in /proc/[0-9]*; do
			cwd=$(readlink "$proc/cwd" 2>/dev/null || true)
			case "$cwd" in
				"$BASE"/worktrees/*)
					rest=${cwd#"$BASE/worktrees/"}
					name=${rest%%/*}
					[ -n "$name" ] && printf '%s/worktrees/%s\n' "$BASE" "$name"
					;;
			esac
		done | sort -u > "$active"
		awk 'NR == FNR { active[$0] = 1; next } ! active[$0]' "$active" "$list" > "$delete_list"
		attempted=$(wc -l < "$delete_list" | tr -d ' ')
		if [ "${attempted:-0}" -gt 0 ]; then
			xargs -r -n 1 -P "$parallel" sh -c '
				base=$1
				shift
				for dir do
					case "$dir" in "$base"/worktrees/*) ;; *) continue ;; esac
					[ -d "$dir" ] || continue
					rm -rf --one-file-system -- "$dir" 2>/dev/null || sudo -n rm -rf --one-file-system -- "$dir" 2>/dev/null || true
				done
			' sh "$BASE" < "$delete_list"
		fi
		git -C "$SRC" worktree prune >/dev/null 2>&1 || true
		if [ ! -s "$WORKTREE_PRUNE_STATUS" ]; then
			printf 'timestamp\treason\tfree_gib\tretention_minutes\tcandidates\tattempted\tskipped_active\tparallel\n' > "$WORKTREE_PRUNE_STATUS"
		fi
		skipped=$(( count - attempted ))
		printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$reason" "$free" "$retention_minutes" "$count" "${attempted:-0}" "$skipped" "$parallel" >> "$WORKTREE_PRUNE_STATUS"
		log "finished async critical worktree prune reason=$reason candidates=$count attempted=${attempted:-0} skipped_active=$skipped parallel=$parallel free_after=$(data_disk_available_gib)GiB"
		rm -f "$list" "$active" "$delete_list" "$WORKTREE_PRUNE_PID_FILE"
	) &
	printf '%s\n' "$!" > "$WORKTREE_PRUNE_PID_FILE"
}

write_status() {
	local tmp=$STATUS.$$.tmp
	{
		echo "# Critical-Path PR Executor Status"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- session: $SESSION"
		echo "- resource reason: $(resource_reason)"
		echo "- critical browser preflight: $(allow_critical_browser_preflight && printf enabled || printf gated)"
		echo "- latest local publish manifest: $(latest_local_publish_summary)"
		echo "- max active continuations: $MAX_ACTIVE_CONTINUATIONS"
		echo "- max active validations: $MAX_ACTIVE_VALIDATIONS"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- reconcile timeout seconds: $RECONCILE_TIMEOUT_SECONDS"
		echo "- fresh evidence scan timeout seconds: $FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS"
		echo "- worktree prune: $(tail -1 "$WORKTREE_PRUNE_STATUS" 2>/dev/null || printf none)"
		echo
		echo "## Active Critical Jobs"
		tmux_sessions | rg '^rtc-critical-(validate|continuation)-|^rtc-benchmark-canary-feedback-refresh-' || true
		echo
		echo "## Current Blockers"
		column -t -s $'\t' "$BLOCKERS" 2>/dev/null | sed -n '1,80p' || sed -n '1,80p' "$BLOCKERS" 2>/dev/null || true
		echo
		echo "## Current Queue"
		column -t -s $'\t' "$QUEUE" 2>/dev/null | sed -n '1,100p' || sed -n '1,100p' "$QUEUE" 2>/dev/null || true
		echo
		echo "## Branch Audit Tail"
		tail -40 "$BRANCH_AUDIT" 2>/dev/null || true
		echo
		echo "## Push Manifest Tail"
		tail -40 "$PUSH_MANIFEST" 2>/dev/null || true
		echo
		echo "## Repair Branch Adoptions"
		column -t -s $'\t' "$REPAIR_ADOPTIONS" 2>/dev/null | sed -n '1,80p' || sed -n '1,80p' "$REPAIR_ADOPTIONS" 2>/dev/null || true
		echo
		echo "## Continuation Classification Cache"
		column -t -s $'\t' "$CONTINUATION_CLASSIFICATIONS" 2>/dev/null | sed -n '1,80p' || sed -n '1,80p' "$CONTINUATION_CLASSIFICATIONS" 2>/dev/null || true
		echo
		echo "## No-Progress Artifacts"
		sed -n '1,80p' "$NO_PROGRESS" 2>/dev/null || true
		echo
		echo "## Recent Launches"
		tail -80 "$LAUNCHES" 2>/dev/null || true
	} > "$tmp"
	atomic_move "$tmp" "$STATUS"
}

reconcile_once() {
	exec 8>"$RECONCILE_LOCK_FILE"
	if ! flock -n 8; then
		log "reconcile skipped because another reconcile pass is active"
		return 0
	fi
	prune_stale_worktrees_if_needed || true
	cleanup_stale_continuation_processes || true
	write_branch_export_headers
	write_continuation_classification_cache
	write_inputs
	write_no_progress
	write_terminal_ledger
	write_repair_branch_adoptions
	write_lanes
	write_blockers_and_queue
	write_active_jobs
	write_status
	launch_validation_jobs
	launch_continuation_jobs
	write_status
	flock -u 8 || true
	exec 8>&-
}

run_loop() {
	local rc executor_script active_reconcile_pid
	ensure_runtime_script
	executor_script=$(runtime_script_path)
	exec 9>"$LOCK_FILE"
	if ! flock -n 9; then
		log "another critical-path PR executor already holds $LOCK_FILE"
		exit 0
	fi
	printf '%s\n' "$$" > "$PID_FILE"
	cleanup_loop() {
		local exit_rc=$?
		if [ -n "${active_reconcile_pid:-}" ] && kill -0 "$active_reconcile_pid" 2>/dev/null; then
			kill "$active_reconcile_pid" 2>/dev/null || true
			sleep 1 9>&-
			pkill -TERM -P "$active_reconcile_pid" 2>/dev/null || true
		fi
		log "critical-path PR executor loop exiting rc=$exit_rc pid=$$"
		rm -f "$PID_FILE"
	}
	trap cleanup_loop EXIT
	trap 'exit 143' HUP TERM
	trap 'exit 130' INT
	log "critical-path PR executor loop started pid=$$ executor_script=$executor_script"
	while true; do
		if ! ensure_runtime_script; then
			log "runtime script refresh failed; skipping reconcile"
			sleep "$CYCLE_SLEEP_SECONDS" 9>&-
			continue
		fi
		set +e
		timeout --kill-after=15s "$RECONCILE_TIMEOUT_SECONDS" "$executor_script" reconcile-once 9>&- >> "$LOG" 2>&1 &
		active_reconcile_pid=$!
		wait "$active_reconcile_pid"
		rc=$?
		active_reconcile_pid=
		set -e
		if [ "$rc" -ne 0 ]; then
			log "reconcile failed or timed out rc=$rc timeout=${RECONCILE_TIMEOUT_SECONDS}s"
		fi
		set +e
		sleep "$CYCLE_SLEEP_SECONDS" 9>&-
		rc=$?
		set -e
		if [ "$rc" -ne 0 ]; then
			log "cycle sleep interrupted rc=$rc"
		fi
	done
}

case "${1:-start}" in
	start)
		ensure_runtime_script
		if has_session "$SESSION"; then
			echo "$SESSION already running"
		else
			clear_stale_executor_lock_holders
			tmux_new_session_detached "$SESSION" "$RUNTIME_SCRIPT run"
			echo "$SESSION started"
		fi
		;;
	run)
		if [ "$(self_script_path)" != "$(runtime_script_path)" ]; then
			ensure_runtime_script
			exec "$RUNTIME_SCRIPT" run
		fi
		run_loop
		;;
	reconcile-once)
		reconcile_once
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		if [ -f "$PID_FILE" ]; then
			kill "$(cat "$PID_FILE")" 2>/dev/null || true
			rm -f "$PID_FILE"
		fi
		echo "$SESSION stopped"
		;;
	status)
		if has_session "$SESSION"; then
			echo "$SESSION running"
		else
			echo "$SESSION not running"
		fi
		[ -f "$STATUS" ] && sed -n '1,120p' "$STATUS"
		;;
	*)
		echo "usage: $0 [start|run|stop|status]" >&2
		exit 2
		;;
esac
