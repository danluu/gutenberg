#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin

SRC=${RTC_PR_PROGRESS_SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
BASE=${RTC_PR_PROGRESS_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518}
CRITICAL_BASE=${RTC_PR_PROGRESS_CRITICAL_BASE:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517}
PR_SPLIT_BASE=${RTC_PR_PROGRESS_PR_SPLIT_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}
DEFERRED_BASE=${RTC_PR_PROGRESS_DEFERRED_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}
CANONICAL_DEFERRED_BASE=${RTC_PR_PROGRESS_CANONICAL_DEFERRED_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}
FINALIZATION_BASE=${RTC_PR_PROGRESS_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}
COVERAGE_BASE=${RTC_PR_PROGRESS_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
BENCHMARK_FEEDBACK_BASE=${RTC_PR_PROGRESS_BENCHMARK_FEEDBACK_BASE:-/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520}
PRODUCTIVE_ANALYSIS_BASE=${RTC_PR_PROGRESS_PRODUCTIVE_ANALYSIS_BASE:-/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521}
RESOURCE_BASE=${RTC_PR_PROGRESS_RESOURCE_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
ARTIFACT_INDEX_BASE=${RTC_PR_PROGRESS_ARTIFACT_INDEX_BASE:-/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518}
ARTIFACT_INDEX_ARTIFACTS=$ARTIFACT_INDEX_BASE/current-artifacts.tsv
LOCAL_PUBLISH_MANIFEST=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION=${RTC_PR_PROGRESS_RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/reload-hydration/seed-7800014-repair-or-downscope/classification.tsv}
RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION=${RTC_PR_PROGRESS_RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260528T201206Z/continuations/reload-hydration-reproducer-reacquire/classification.tsv}
RELOAD_HYDRATION_REPLAY_DOWNSCOPE_ARTIFACT=${RTC_PR_PROGRESS_RELOAD_HYDRATION_REPLAY_DOWNSCOPE_ARTIFACT:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260528T201206Z/continuations/reload-hydration-reproducer-reacquire/artifacts/exact-current-head-2/rtc-behavioral-coverage-7800014.json}
PR07C_REPAIRED_HEAD_MANIFEST=${RTC_PR_PROGRESS_PR07C_REPAIRED_HEAD_MANIFEST:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/jobs/pr07c-owner-matrix-20260528T041939Z/push-manifest.tsv}

SESSION=rtc-pr-progress-controller-loop
STATUS=$BASE/current-pr-progress-controller-status.md
PROGRESS=$BASE/current-pr-progress.tsv
CONTEXT=$BASE/current-context.md
PUSH_MANIFEST=$BASE/current-push-manifest.tsv
DECISIONS=$BASE/current-control-decisions.tsv
LOG=$BASE/logs/controller.log
EVENTS=$BASE/events.ndjson
LOCK=$BASE/controller.lock
PID_FILE=$BASE/controller.pid

CYCLE_SLEEP_SECONDS=${RTC_PR_PROGRESS_CYCLE_SLEEP_SECONDS:-120}
PERSONA_EVERY_CYCLES=${RTC_PR_PROGRESS_PERSONA_EVERY_CYCLES:-2}
MAX_ACTIVE_PR_JOBS=${RTC_PR_PROGRESS_MAX_ACTIVE_PR_JOBS:-2}
MIN_DISCOVERY_SESSIONS=${RTC_PR_PROGRESS_MIN_DISCOVERY_SESSIONS:-3}
PR07C_OWNER_CONSUMED_TTL_SECONDS=${RTC_PR_PROGRESS_PR07C_OWNER_CONSUMED_TTL_SECONDS:-0}
CODEX_MODEL=${RTC_PR_PROGRESS_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_PR_PROGRESS_CODEX_REASONING_EFFORT:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_PR_PROGRESS_CODEX_TIMEOUT_SECONDS:-5400}
PERSONA_TIMEOUT_SECONDS=${RTC_PR_PROGRESS_PERSONA_TIMEOUT_SECONDS:-3600}
JOB_SCAN_LIMIT=${RTC_PR_PROGRESS_JOB_SCAN_LIMIT:-120}
PR_SPLIT_RUN_SCAN_LIMIT=${RTC_PR_PROGRESS_PR_SPLIT_RUN_SCAN_LIMIT:-80}
CRITICAL_RUN_SCAN_LIMIT=${RTC_PR_PROGRESS_CRITICAL_RUN_SCAN_LIMIT:-3000}
ARTIFACT_INDEX_MAX_AGE_SECONDS=${RTC_PR_PROGRESS_ARTIFACT_INDEX_MAX_AGE_SECONDS:-3600}

PERSONAS=(
	"linus torvalds"
	"kyle kingsbury"
	"marc brooker"
	"dan luu"
	"tptacek"
	"contrarian"
)

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/jobs" "$BASE/persona-runs" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"
touch "$LOG" "$EVENTS"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

json_event() {
	local type=$1 message=$2
	printf '{"ts":"%s","type":"%s","message":"%s"}\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		"$(printf '%s' "$type" | sed 's/"/\\"/g')" \
		"$(printf '%s' "$message" | sed 's/"/\\"/g')" >> "$EVENTS"
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] /_:' '[:lower:]----' | tr -cd 'a-z0-9-' | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

tmux_sessions() {
	tmux ls 2>/dev/null || true
}

active_count_matching() {
	local pattern=$1
	tmux_sessions | awk -F: -v pattern="$pattern" '$1 ~ pattern { count++ } END { print count + 0 }'
}

active_session_matching() {
	local pattern=$1
	tmux_sessions | awk -F: -v pattern="$pattern" '$1 ~ pattern { print $1; found = 1; exit } END { exit found ? 0 : 1 }'
}

resource_reason() {
	sed -n 's/^- reason: //p' "$RESOURCE_BASE/resource-autoscaler-status.md" 2>/dev/null | tail -1 | awk 'NF { print; found = 1 } END { if (!found) print "unknown" }'
}

discovery_active_sessions() {
	tmux_sessions |
		awk -F: '
			$1 ~ /coverage-guided|focused-shards|strict-expansion|browser-fuzz|protocol-server-fuzz|lower-level-fuzz|native-harness|fuzz-only-asserts|fuzz-level-mix/ {
				count++
			}
			END { print count + 0 }
		'
}

discovery_protected() {
	local active reason
	active=$(discovery_active_sessions)
	reason=$(resource_reason)
	case "$reason" in
		severe_pressure|high_pressure)
			return 0
			;;
	esac
	[ "$active" -lt "$MIN_DISCOVERY_SESSIONS" ]
}

normalize_reserve_decision_file() {
	local file=$1 tmp active reason protected reserve_reason
	[ -s "$file" ] || return 0
	normalize_decision_file "$file"
	active=$(discovery_active_sessions)
	reason=$(resource_reason)
	if discovery_protected; then
		protected=yes
	else
		protected=no
	fi
	if [ "$active" -lt "$MIN_DISCOVERY_SESSIONS" ]; then
		reserve_reason="active_discovery=$active below min=$MIN_DISCOVERY_SESSIONS; discovery_protected=$protected, resource_reason=$reason; preserve reserve before heavy PR jobs"
	elif [ "$protected" = yes ]; then
		reserve_reason="active_discovery=$active meets min=$MIN_DISCOVERY_SESSIONS; discovery_protected=yes, resource_reason=$reason; preserve reserve before heavy PR jobs"
	else
		reserve_reason="active_discovery=$active meets min=$MIN_DISCOVERY_SESSIONS; discovery_protected=no, resource_reason=$reason; discovery reserve healthy; preserve reserve while allowing cheap PR progress"
	fi
	tmp="$file.$$.reserve.tmp"
	awk -F '\t' -v OFS='\t' -v reason="$reserve_reason" '
		NR == 1 { print; next }
		$1 == "reserve-discovery" && !done {
			$2 = "coverage-guided+focused+strict+protocol+lower-level+browser+existing-code+existing-pr"
			$3 = "P0"
			$4 = "yes"
			$5 = reason
			done = 1
			print
			next
		}
		{ print }
		END {
			if (!done) {
				print "reserve-discovery", "coverage-guided+focused+strict+protocol+lower-level+browser+existing-code+existing-pr", "P0", "yes", reason
			}
		}
	' "$file" > "$tmp" && mv "$tmp" "$file"
}

normalize_decision_file() {
	local file=$1 tmp
	[ -s "$file" ] || return 0
	tmp="$file.$$.normalize.tmp"
	awk -F '\t' -v OFS='\t' '
		function emit() {
			if (!have) {
				return
			}
			gsub(/[ \t\r\n]+/, " ", reason)
			sub(/^ /, "", reason)
			sub(/ $/, "", reason)
			print action, target, priority, allowed, reason
		}
		NR == 1 {
			print "action", "target", "priority", "allowed", "reason"
			next
		}
		NF >= 5 {
			emit()
			action = $1
			target = $2
			priority = $3
			allowed = $4
			reason = $5
			for (i = 6; i <= NF; i++) {
				reason = reason " " $i
			}
			have = 1
			next
		}
		NF == 1 && $1 != "" && have {
			reason = reason " " $1
			next
		}
		END { emit() }
	' "$file" > "$tmp" && mv "$tmp" "$file"
}

active_pr_jobs() {
	active_count_matching '^rtc-pr-progress-job-'
}

persona_round_active() {
	tmux_sessions | awk -F: '/^rtc-pr-progress-persona-|^rtc-pr-progress-synthesis-/ { found = 1 } END { exit found ? 0 : 1 }'
}

job_active() {
	local slug=$1
	active_session_matching "^rtc-pr-progress-job-$slug-" >/dev/null
}

recent_child_dirs() {
	local root=$1 limit=$2
	[ -d "$root" ] || return 0
	find "$root" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' 2>/dev/null |
		sort -nr |
		awk -v limit="$limit" 'limit > 0 && count++ < limit' |
		cut -f2-
}

recent_job_dirs() {
	recent_child_dirs "$BASE/jobs" "$JOB_SCAN_LIMIT"
}

recent_branch_repair_manifests() {
	recent_job_dirs |
		while IFS= read -r job_dir; do
			find "$job_dir" -maxdepth 4 -path '*/branch-repair-*/push-manifest.tsv' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -80 |
		cut -f2-
}

recent_job_push_manifests() {
	recent_job_dirs |
		while IFS= read -r job_dir; do
			find "$job_dir" -maxdepth 5 -name push-manifest.tsv -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -80 |
		cut -f2-
}

latest_file() {
	local root=$1 pattern=$2
	[ -d "$root" ] || return 0
	if [ "$root" = "$BASE/jobs" ]; then
		recent_job_dirs |
			while IFS= read -r job_dir; do
				find "$job_dir" -maxdepth 5 -path "$pattern" -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
			done |
			sort -n |
			tail -1 |
			cut -f2-
		return 0
	fi
	find "$root" -maxdepth 6 -path "$pattern" -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

file_mtime() {
	stat -c %Y "$1" 2>/dev/null || printf '0'
}

deferred_file() {
	local name=$1 candidate
	for candidate in "$DEFERRED_BASE/$name" "$CANONICAL_DEFERRED_BASE/$name"; do
		if [ -s "$candidate" ]; then
			printf '%s\n' "$candidate"
			return 0
		fi
	done
	printf '%s/%s\n' "$DEFERRED_BASE" "$name"
}

latest_reload_hydration_push_manifest() {
	local manifest latest='' latest_cycle='' rel cycle
	for manifest in \
		"$DEFERRED_BASE"/cycles/*/reload-hydration/push-manifest.tsv \
		"$CANONICAL_DEFERRED_BASE"/cycles/*/reload-hydration/push-manifest.tsv; do
		[ -s "$manifest" ] || continue
		rel=${manifest#*/cycles/}
		cycle=${rel%%/*}
		[[ "$cycle" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
		if [ -z "$latest_cycle" ] || [[ "$cycle" > "$latest_cycle" ]]; then
			latest=$manifest
			latest_cycle=$cycle
		fi
	done
	[ -n "$latest" ] && printf '%s\n' "$latest"
}

reload_hydration_manifest_row() {
	local manifest
	manifest=$(latest_reload_hydration_push_manifest || true)
	[ -s "$manifest" ] || return 1
	awk -F '\t' '
		NR > 1 &&
			NF >= 9 &&
			$1 ~ /^deferred\/rtc-reload-hydration-/ &&
			$2 ~ /^[0-9a-f]{40}$/ &&
			$3 ~ /^danluu\/rtc-reload-hydration-/ {
				print
				found = 1
				exit
			}
		END { exit found ? 0 : 1 }
	' "$manifest"
}

reload_hydration_manifest_adopted() {
	local row branch head
	row=$(reload_hydration_manifest_row 2>/dev/null || true)
	[ -n "$row" ] || return 1
	branch=$(printf '%s' "$row" | cut -f1)
	head=$(printf '%s' "$row" | cut -f2)
	[ -n "$branch" ] && [ -n "$head" ] || return 1
	[ -s "$LOCAL_PUBLISH_MANIFEST" ] || return 1
	awk -F '\t' -v branch="$branch" -v head="$head" '
		NR > 1 &&
			$5 == head &&
			($6 == branch || $6 == "refs/heads/" branch) {
				found = 1
				exit
			}
		END { exit found ? 0 : 1 }
	' "$LOCAL_PUBLISH_MANIFEST" || return 1
	deferred_downscope_reason reload-hydration >/dev/null 2>&1 && return 1
	reload_hydration_replay_downscope_active >/dev/null 2>&1 && return 1
	return 0
}

print_reload_hydration_manifest_if_adopted() {
	local row branch head
	reload_hydration_manifest_adopted || return 0
	row=$(reload_hydration_manifest_row || true)
	[ -n "$row" ] || return 0
	branch=$(printf '%s' "$row" | cut -f1)
	head=$(printf '%s' "$row" | cut -f2)
	[ -n "$branch" ] && [ -n "$head" ] || return 0
	if [ -s "$DECISIONS" ]; then
		decision_blocks publish-ready reload-hydration && return 0
		decision_blocks_ref publish-ready "$branch" "$head" && return 0
		decision_blocks_ref publish-manifest "$branch" "$head" && return 0
	fi
	printf '%s\n' "$row"
}

deferred_downscope_reason() {
	local family=$1 file
	file=$(deferred_file current-deferred-control.tsv)
	[ -s "$file" ] || return 1
	awk -F '\t' -v family="$family" '
		NR > 1 && $2 == family && $3 == "downscoped" {
			print $4
			found = 1
			exit
		}
		END { exit found ? 0 : 1 }
	' "$file"
}

reload_hydration_replay_downscope_active() {
	local deferred_control deferred_queue
	deferred_control=$(deferred_file current-deferred-control.tsv)
	deferred_queue=$(deferred_file current-deferred-queue.tsv)
	if deferred_downscope_reason reload-hydration >/dev/null; then
		return 0
	fi
	if [ -s "$deferred_queue" ] &&
		awk -F '\t' 'NR > 1 && $2 == "reload-hydration" && $3 == "downscoped" { found = 1 } END { exit found ? 0 : 1 }' "$deferred_queue"; then
		return 0
	fi
	if [ -s "$CRITICAL_BASE/blockers.tsv" ] &&
		awk -F '\t' 'NR > 1 && $1 == "reload-hydration" && $4 == "terminal" && tolower($10) ~ /downscop/ { found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/blockers.tsv"; then
		return 0
	fi
	[ "${RTC_PR_PROGRESS_RELOAD_HYDRATION_GENERIC_OK:-0}" = "1" ] && return 1
	[ -s "$RELOAD_HYDRATION_REPLAY_DOWNSCOPE_ARTIFACT" ] || return 1
	if [ -s "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION" ] &&
		grep -Eq '^reload-hydration-seed7800014[[:space:]]+replay_backed_downscope[[:space:]]' "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION"; then
		return 0
	fi
	[ -s "$RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION" ] || return 1
	grep -Eq '^reload-hydration-reproducer-reacquire[[:space:]]+replay_backed_downscope[[:space:]]' "$RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION" || return 1
	if [ -s "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION" ]; then
		[ "$RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION" -nt "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION" ] || return 1
	fi
}

branch_current_head() {
	local branch=$1
	git -C "$SRC" rev-parse --verify --quiet "$branch^{commit}" 2>/dev/null || true
}

same_commit_prefix() {
	local left=$1 right=$2
	[ -n "$left" ] && [ -n "$right" ] || return 1
	case "$left:$right" in
		"$right":*|*:"$left") return 0 ;;
	esac
	case "$left" in
		"$right"*) return 0 ;;
	esac
	case "$right" in
		"$left"*) return 0 ;;
	esac
	return 1
}

branch_published() {
	local branch=$1 head=${2:-}
	local manifest=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
	[ -s "$manifest" ] || return 1
	awk -F '\t' -v branch="$branch" -v head="$head" '
		NR == 1 { next }
		$6 == branch && (head == "" || $5 == head || index($5, head) == 1 || index(head, $5) == 1) {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$manifest"
}

branch_repair_manifest_exists() {
	local branch=$1 head=${2:-}
	local manifest
	while IFS= read -r manifest; do
		awk -F '\t' -v branch="$branch" -v head="$head" '
			NR == 1 { next }
			$1 == branch && (head == "" || $2 == head || index($2, head) == 1 || index(head, $2) == 1) {
				found = 1
			}
			END { exit found ? 0 : 1 }
		' "$manifest" && return 0
	done < <(recent_branch_repair_manifests)
	return 1
}

latest_pr07c_controller_classification() {
	latest_file "$BASE/jobs" '*/pr07c-owner-matrix-*/classification.tsv'
}

pr07c_owner_matrix_consumed() {
	local classification latest_report owner_matrix class_mtime report_mtime matrix_mtime now expected_head
	classification=$(latest_pr07c_controller_classification || true)
	[ -n "$classification" ] || return 1
	if grep -q $'\tpromote_product_pr\t' "$classification" 2>/dev/null; then
		return 1
	fi
	latest_report=$(latest_pr07c_owner_report || true)
	owner_matrix=$(latest_owner_matrix || true)
	expected_head=$(latest_pr07c_exact_green_head || true)
	if [ -n "${expected_head:-}" ]; then
		if ! artifact_mentions_sha "$classification" "$expected_head" &&
			! artifact_mentions_sha "$latest_report" "$expected_head" &&
			! artifact_mentions_sha "$owner_matrix" "$expected_head"; then
			log "not consuming PR07C owner matrix: latest classification does not mention repaired exact-stack head $expected_head"
			return 1
		fi
	fi
	class_mtime=$(file_mtime "$classification")
	report_mtime=0
	matrix_mtime=0
	[ -n "${latest_report:-}" ] && report_mtime=$(file_mtime "$latest_report")
	[ -n "${owner_matrix:-}" ] && matrix_mtime=$(file_mtime "$owner_matrix")
	now=$(date -u +%s)
	if [ "$PR07C_OWNER_CONSUMED_TTL_SECONDS" -gt 0 ] && [ $(( now - class_mtime )) -gt "$PR07C_OWNER_CONSUMED_TTL_SECONDS" ]; then
		return 1
	fi
	if [ "$class_mtime" -ge "$report_mtime" ] && [ "$class_mtime" -ge "$matrix_mtime" ]; then
		return 0
	fi
	return 1
}

inferred_repair_base() {
	local branch=$1
	case "$branch" in
		ready/rtc-pr02a-http-room-isolation-regression) printf '%s\n' 'ready/rtc-pr02-http-storage-read-window' ;;
		ready/rtc-pr03b-browser-revision-restore-crdt-invalidation) printf '%s\n' 'ready/rtc-pr03-revision-restore-crdt-reset' ;;
		ready/rtc-pr07b-save-response-manager-base-record) printf '%s\n' 'ready/rtc-pr07a-save-response-actions-guard' ;;
		ready/rtc-pr09-store-lock-fairness) printf '%s\n' 'ready/rtc-pr06a-persisted-empty-content-guard' ;;
		ready/rtc-pr10-crdt-block-rebase) printf '%s\n' 'ready/rtc-pr09-store-lock-fairness' ;;
		ready/rtc-pr11a-stale-base-record-block-append) printf '%s\n' 'ready/rtc-pr10-crdt-block-rebase' ;;
		ready/rtc-pr11b-stale-base-block-delete) printf '%s\n' 'ready/rtc-pr11a-stale-base-record-block-append' ;;
		ready/rtc-pr14-table-body-array-green) printf '%s\n' 'ready/rtc-pr13b3-explicit-base-source-retirement-green' ;;
		*) return 1 ;;
	esac
}

branch_repair_active() {
	active_session_matching '^rtc-pr-progress-job-branch-repair-' >/dev/null
}

stale_resource_decision_filter_enabled() {
	case "$(resource_reason)" in
		disk_pressure|high_pressure|severe_pressure)
			return 1
			;;
	esac
	return 0
}

decision_allows() {
	local action=$1 target=${2:-} skip_stale_resource=0
	[ -s "$DECISIONS" ] || return 0
	stale_resource_decision_filter_enabled && skip_stale_resource=1
	awk -F '\t' -v action="$action" -v target="$target" -v skip_stale_resource="$skip_stale_resource" '
		NR == 1 { next }
		$1 == action && ( target == "" || $2 == target || $2 == "*" ) {
			reason = tolower($5)
			if ( skip_stale_resource && reason ~ /(disk[_ -]?pressure|discovery reserve|discovery protection|discovery is unprotected|discovery.*protected)/ ) next
			if ( tolower($4) ~ /^(no|false|block|blocked|0)$/ ) blocked = 1
			if ( tolower($4) ~ /^(yes|true|allow|allowed|1)$/ ) allowed = 1
		}
		END {
			if (blocked) exit 1
			exit 0
		}
	' "$DECISIONS"
}

decision_blocks() {
	local action=$1 target=${2:-} skip_stale_resource=0
	[ -s "$DECISIONS" ] || return 1
	stale_resource_decision_filter_enabled && skip_stale_resource=1
	awk -F '\t' -v action="$action" -v target="$target" -v skip_stale_resource="$skip_stale_resource" '
		NR == 1 { next }
		$1 == action && ( target == "" || $2 == target || $2 == "*" ) && tolower($4) ~ /^(no|false|block|blocked|0)$/ {
			reason = tolower($5)
			if ( skip_stale_resource && reason ~ /(disk[_ -]?pressure|discovery reserve|discovery protection|discovery is unprotected|discovery.*protected)/ ) next
			blocked = 1
		}
		END { exit blocked ? 0 : 1 }
	' "$DECISIONS"
}

decision_explicitly_allows() {
	local action=$1 target=${2:-}
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' -v action="$action" -v target="$target" '
		NR == 1 { next }
		$1 == action && $2 == target && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ {
			allowed = 1
		}
		END { exit allowed ? 0 : 1 }
	' "$DECISIONS"
}

decision_explicitly_allows_ref() {
	local action=$1 branch=$2 head=${3:-}
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' -v action="$action" -v branch="$branch" -v head="$head" '
		NR == 1 { next }
		$1 != action { next }
		{
			target = $2
			target_branch = target
			target_head = ""
			if (index(target, "@") > 0) {
				target_branch = substr(target, 1, index(target, "@") - 1)
				target_head = substr(target, index(target, "@") + 1)
			}
			if (target == branch || (head != "" && target_branch == branch && target_head != "" && (target_head == head || index(head, target_head) == 1 || index(target_head, head) == 1))) {
				if (tolower($4) ~ /^(yes|true|allow|allowed|1)$/) allowed = 1
			}
		}
		END { exit allowed ? 0 : 1 }
	' "$DECISIONS"
}

decision_blocks_ref() {
	local action=$1 branch=$2 head=${3:-}
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' -v action="$action" -v branch="$branch" -v head="$head" '
		NR == 1 { next }
		$1 != action { next }
		{
			target = $2
			target_branch = target
			target_head = ""
			if (index(target, "@") > 0) {
				target_branch = substr(target, 1, index(target, "@") - 1)
				target_head = substr(target, index(target, "@") + 1)
			}
			if (target == branch || (head != "" && target_branch == branch && target_head != "" && (target_head == head || index(head, target_head) == 1 || index(target_head, head) == 1))) {
				if (tolower($4) ~ /^(no|false|block|blocked|0)$/) blocked = 1
			}
		}
		END { exit blocked ? 0 : 1 }
	' "$DECISIONS"
}

current_benchmark_canary_status_file() {
	local coverage
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$coverage" ] || return 1
	[ -s "$coverage/benchmark-canary-coverage-status.tsv" ] || return 1
	printf '%s\n' "$coverage/benchmark-canary-coverage-status.tsv"
}

current_benchmark_canary_open_publish_gate_count() {
	local status_file=${1:-}
	if [ -z "$status_file" ]; then
		status_file=$(current_benchmark_canary_status_file) || return 1
	fi
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) col[$i] = i
			required = col["promotion_blocked"] && col["current_run_green"] && col["explicit_downscope"]
			next
		}
		!required { next }
		tolower($(col["promotion_blocked"])) ~ /^(yes|true|1)$/ &&
			tolower($(col["current_run_green"])) !~ /^(yes|true|1)$/ &&
			tolower($(col["explicit_downscope"])) !~ /^(yes|true|1)$/ {
			blocked++
		}
		END {
			print blocked + 0
		}
	' "$status_file"
}

current_benchmark_canary_open_publish_gate() {
	local status_file=${1:-} count
	count=$(current_benchmark_canary_open_publish_gate_count "$status_file" 2>/dev/null) || return 1
	[ "${count:-0}" -gt 0 ]
}


refresh_benchmark_canary_decisions() {
	local status_file count summary rows_with_records rows_with_product_evidence product_evidence_records retained_rows current_activity_rows green_rows total_rows discovery_active discovery_ok tmp
	status_file=$(current_benchmark_canary_status_file || true)
	[ -n "${status_file:-}" ] || return 0
	[ -s "$DECISIONS" ] || return 0
	count=$(current_benchmark_canary_open_publish_gate_count "$status_file" 2>/dev/null || true)
	count=${count:-0}
	summary=$(awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) col[$i] = i
			next
		}
		{
			rows++
			if (col["current_run_group_records"] && ($(col["current_run_group_records"]) + 0) > 0) records++
			if (col["current_run_successful_group_records"] && ($(col["current_run_successful_group_records"]) + 0) > 0) activity++
			if (col["active"] && tolower($(col["active"])) ~ /^(yes|true|1)$/) activity++
			if (col["current_run_green"] && tolower($(col["current_run_green"])) ~ /^(yes|true|1)$/) green++
			if (col["retained_product_evidence"] && tolower($(col["retained_product_evidence"])) ~ /^(yes|true|1)$/) retained++
			if (col["product_evidence_records"] && ($(col["product_evidence_records"]) + 0) > 0 &&
				col["retained_product_evidence"] && tolower($(col["retained_product_evidence"])) ~ /^(yes|true|1)$/) {
				product_rows++
				product_records += $(col["product_evidence_records"]) + 0
			}
		}
		END {
			printf "%d\t%d\t%d\t%d\t%d\t%d\t%d\n", records + 0, product_rows + 0, product_records + 0, retained + 0, activity + 0, green + 0, rows + 0
		}
	' "$status_file" 2>/dev/null || printf '0\t0\t0\t0\t0\t0\t0')
	IFS=$'\t' read -r rows_with_records rows_with_product_evidence product_evidence_records retained_rows current_activity_rows green_rows total_rows <<< "$summary"
	discovery_active=$(discovery_active_sessions 2>/dev/null || printf '0')
	case "$discovery_active" in
		''|*[!0-9]*) discovery_active=0 ;;
	esac
	discovery_ok=no
	if [ "$discovery_active" -ge "$MIN_DISCOVERY_SESSIONS" ]; then
		discovery_ok=yes
	fi
	tmp="$DECISIONS.$$.canary-refresh"
	awk -F '\t' -v OFS='\t' \
		-v count="$count" \
		-v status="$status_file" \
		-v rows_with_records="$rows_with_records" \
		-v rows_with_product_evidence="$rows_with_product_evidence" \
		-v product_evidence_records="$product_evidence_records" \
		-v current_activity_rows="$current_activity_rows" \
		-v discovery_active="$discovery_active" \
		-v min_discovery="$MIN_DISCOVERY_SESSIONS" \
		-v discovery_ok="$discovery_ok" '
		function promotion_reason() {
			return "current benchmark-canary status has " count " promotion-blocked rows lacking current_run_green=yes or explicit_downscope=yes: " status
		}
		function product_reason() {
			return "current benchmark-canary status has " product_evidence_records " retained product-evidence records across " rows_with_product_evidence " row(s); repair or explicit downscope required before publication: " status
		}
		function clear_reason() {
			return "current benchmark-canary promotion gate is clear and no retained product-evidence rows remain: " status
		}
		function canary_publish_target(target) {
			return target ~ /^(PR07C($|[@\/])|PR07C-publication-credit$|repair\/pr07c-exact-stack-build-[^@]+@|candidate\/rtc-risk-reducing-pr07c-all-merged-[^@]+@)/ ||
				target == "final-rtc-stack/benchmark-canary-gate" ||
				target == "PR07C/final-rtc-stack"
		}
		NR == 1 { print; next }
		$1 == "publish-ready" && canary_publish_target($2) {
			if ((count + 0) > 0) {
				$4 = "no"
				$5 = promotion_reason()
			} else if ((product_evidence_records + 0) > 0) {
				$4 = "no"
				$5 = product_reason()
			} else {
				$4 = "yes"
				$5 = clear_reason()
			}
		}
		$1 == "hold-publication" && $2 == "PR07C" {
			if ((count + 0) > 0) {
				$4 = "no"
				$5 = promotion_reason()
			} else if ((product_evidence_records + 0) > 0) {
				$4 = "no"
				$5 = product_reason()
			} else {
				$4 = "yes"
				$5 = clear_reason()
			}
			hold = 1
		}
		$1 == "repair-branch" && $2 == "benchmark-canary-product-failure" {
			if ((product_evidence_records + 0) > 0 && (current_activity_rows + 0) > 0 && discovery_ok == "yes") {
				$4 = "yes"
				$5 = "materialized retained benchmark-canary product evidence exists (" product_evidence_records " records across " rows_with_product_evidence " row(s)); discovery reserve active=" discovery_active " min=" min_discovery "; launch aggregate repair/downscope owner: " status
			} else if ((product_evidence_records + 0) > 0) {
				$4 = "no"
				$5 = "retained product evidence exists but repair waits for materialized current activity and discovery reserve; activity_rows=" current_activity_rows " discovery_active=" discovery_active " min=" min_discovery ": " status
			}
		}
		$1 == "repair-branch" && $2 == "benchmark-canary/focused-child-after-materialized-reread" {
			if ((product_evidence_records + 0) > 0 && (current_activity_rows + 0) > 0 && discovery_ok == "yes") {
				$4 = "yes"
				$5 = "allow one live-reread-selected focused benchmark-canary child under the aggregate repair owner; retained product evidence=" product_evidence_records " records, discovery_active=" discovery_active " min=" min_discovery ": " status
			}
		}
		rows_with_records == 0 && $1 == "cooldown-diagnostic" && $2 == "benchmark-canary-product-failure/stale-product-repair-owners" {
			$4 = "no"
			$5 = "bootstrap guard: current benchmark-canary status has zero current_run_group_records; do not cool retained product repair owners until materialized current records, green proof, or explicit downscope exist: " status
		}
		rows_with_records == 0 && $1 == "launch-branch-repair" && $2 == "benchmark-canary-product-failure" {
			$4 = "no"
			$5 = "bootstrap guard: zero current_run_group_records is not evidence that product blockers disappeared; keep active aggregate/exact owners and coverage materialization instead of launching duplicate heavy repair: " status
		}
		{ print }
		END {
			if (!hold) {
				if ((count + 0) > 0) {
					print "hold-publication", "PR07C", "P0", "no", promotion_reason()
				} else if ((product_evidence_records + 0) > 0) {
					print "hold-publication", "PR07C", "P0", "no", product_reason()
				}
			}
		}
	' "$DECISIONS" > "$tmp"
	mv "$tmp" "$DECISIONS"
}

progress_branch_published() {
	local branch=$1 head=${2:-} dest manifest=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
	[ -s "$manifest" ] || return 1
	dest="refs/heads/$(safe_destination_for_branch "$branch")"
	awk -F '\t' -v branch="$branch" -v head="$head" -v dest="$dest" '
		NR == 1 { next }
		$4 == dest && $6 == branch && (head == "" || $5 == head || index($5, head) == 1 || index(head, $5) == 1) {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$manifest"
}

pr15_next_child_allowed_by_controller() {
	local branch=$1
	decision_explicitly_allows recompute-held-children PR15-after-PR14B || return 1
	progress_branch_published ready/rtc-pr14b-table-query-array-local-suffix-append || return 1
	case "$branch" in
		ready/rtc-pr15a-fallback-group-move-green-on-pr14b)
			progress_branch_published "$branch" && return 1
			return 0
			;;
		ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b)
			progress_branch_published ready/rtc-pr15a-fallback-group-move-green-on-pr14b || return 1
			progress_branch_published "$branch" && return 1
			return 0
			;;
		ready/rtc-pr15c-fallback-group-delete-green-on-pr14b)
			progress_branch_published ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b || return 1
			progress_branch_published "$branch" && return 1
			return 0
			;;
	esac
	return 1
}

publish_allowed_by_controller() {
	local branch=$1 head=${2:-}
	[ -s "$DECISIONS" ] || return 0
	case "$branch" in
		repair/pr07c-exact-stack-build-*|candidate/rtc-risk-reducing-pr07c-all-merged-*|finalized/*/product/rtc-pr07c-reload-record-snapshots-build-clean)
			current_benchmark_canary_open_publish_gate && return 1
			;;
	esac
	case "$branch" in
		ready/rtc-pr15*)
			pr15_next_child_allowed_by_controller "$branch" && return 0
			return 1
			;;
	esac
	decision_explicitly_allows_ref publish-ready "$branch" "$head" && return 0
	decision_explicitly_allows_ref publish-manifest "$branch" "$head" && return 0
	case "$branch" in
		repair/pr07c-exact-stack-build-*|candidate/rtc-risk-reducing-pr07c-all-merged-*|finalized/*/product/rtc-pr07c-reload-record-snapshots-build-clean)
			decision_explicitly_allows_ref publish-ready PR07C "$head" && return 0
			decision_explicitly_allows_ref publish-manifest PR07C "$head" && return 0
			;;
	esac
	pr15_next_child_allowed_by_controller "$branch" && return 0
	return 1
}

publish_blocked_by_controller() {
	local branch=$1 head=${2:-}
	case "$branch" in
		repair/pr07c-exact-stack-build-*|candidate/rtc-risk-reducing-pr07c-all-merged-*|finalized/*/product/rtc-pr07c-reload-record-snapshots-build-clean)
			current_benchmark_canary_open_publish_gate && return 0
			;;
	esac
	decision_blocks_ref publish-ready "$branch" "$head" && return 0
	decision_blocks_ref publish-manifest "$branch" "$head" && return 0
	decision_blocks_ref hold-publication "$branch" "$head" && return 0
	case "$branch" in
		repair/pr07c-exact-stack-build-*|candidate/rtc-risk-reducing-pr07c-all-merged-*|finalized/*/product/rtc-pr07c-reload-record-snapshots-build-clean)
			decision_blocks_ref publish-ready PR07C "$head" && return 0
			decision_blocks_ref publish-manifest PR07C "$head" && return 0
			decision_blocks_ref hold-publication PR07C "$head" && return 0
			;;
	esac
	case "$branch" in
		ready/rtc-pr06b-malformed-save-request-payload)
			decision_explicitly_allows maintain-downscope malformed-save-payload && return 0
			decision_explicitly_allows downscope-family malformed-save-payload && return 0
			;;
	esac
	case "$branch" in
		ready/rtc-pr15*)
			decision_blocks publish-ready ready/rtc-pr15-fallback-group-chain && return 0
			decision_blocks publish-ready ready/rtc-pr15-fallback-group-variants && return 0
			;;
	esac
	return 1
}

policy_superseded_by_controller() {
	local branch=$1 target target_alt target_branch
	target=$branch
	target_alt=
	target_branch=$branch
	case "$branch" in
		ready/rtc-pr15a-fallback-group-move-green|ready/rtc-pr15b-fallback-group-insert-anchor-green|ready/rtc-pr15c-fallback-group-delete-green)
			target=ready/rtc-pr15a-pr15b-pr15c-base-heads
			target_alt=ready/rtc-pr15a+ready/rtc-pr15b+ready/rtc-pr15c-base-variants
			;;
	esac
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' -v target="$target" -v target_alt="$target_alt" -v target_branch="$target_branch" '
		NR == 1 { next }
		$1 == "publish-ready" && ($2 == target || $2 == target_branch || (target_alt != "" && $2 == target_alt)) && tolower($4) ~ /^(no|false|block|blocked|0)$/ && tolower($5) ~ /superseded/ {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$DECISIONS"
}

pr07c_direct_ready_superseded_by_repair() {
	local branch=$1
	[ "$branch" = "ready/rtc-pr07c-reload-record-snapshots" ] || return 1
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' '
		NR == 1 { next }
		($1 == "publish-ready" || $1 == "repair-branch" || $1 == "run-exact-validation") &&
			$2 ~ /^ready\/rtc-pr07c-reload-record-snapshots(@|$)/ &&
			tolower($4) ~ /^(no|false|block|blocked|0)$/ &&
			tolower($5) ~ /(stale|repair|repaired|superseded|build)/ {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$DECISIONS"
}

branch_repair_blocked_by_controller() {
	local branch=$1
	decision_blocks launch-branch-repair "$branch" && return 0
	decision_blocks repair-branch "$branch" && return 0
	decision_blocks repair-ready "$branch" && return 0
	return 1
}

read_cycle_count() {
	cat "$BASE/cycle-count.txt" 2>/dev/null || printf '0'
}

increment_cycle_count() {
	local count
	count=$(read_cycle_count)
	case "$count" in
		''|*[!0-9]*) count=0 ;;
	esac
	count=$(( count + 1 ))
	printf '%s\n' "$count" > "$BASE/cycle-count.txt"
	printf '%s\n' "$count"
}

latest_pr07c_owner_report() {
	local indexed
	if artifact_index_fresh; then
		indexed=$(latest_indexed_artifact report 'pr07c.*owner.*replay.*/report[.]md' || true)
		if [ -n "$indexed" ]; then
			printf '%s\n' "$indexed"
			return 0
		fi
	fi
	recent_child_dirs "$PR_SPLIT_BASE/runs" "$PR_SPLIT_RUN_SCAN_LIMIT" |
		while IFS= read -r run_dir; do
			find "$run_dir/jobs/outputs" -maxdepth 3 -path '*pr07c*owner*replay*/report.md' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_pr07c_exact_green_head() {
	local status_file sha
	[ -d "$CRITICAL_BASE/runs" ] || return 1
	while IFS= read -r status_file; do
		sha=$(awk -F '\t' '
			NR == 1 { next }
			$4 ~ /^(exact_stack_green|downscoped_replacement_green)$/ &&
				$2 ~ /^repair\/(rtc-pr07c-|pr07c-exact-stack-build-)/ &&
				length($3) >= 12 {
				print $3
				exit
			}
		' "$status_file" 2>/dev/null || true)
		if [ -n "$sha" ]; then
			printf '%s\n' "$sha"
			return 0
		fi
	done < <(
		recent_child_dirs "$CRITICAL_BASE/runs" "${CRITICAL_RUN_SCAN_LIMIT:-40}" |
			while IFS= read -r run_dir; do
				status_file="$run_dir/continuations/benchmark-canary-fuzzer-gap/exact-stack-status.tsv"
				[ -s "$status_file" ] && printf '%s\n' "$status_file"
			done |
			head -20
	)
	return 1
}

artifact_mentions_sha() {
	local file=${1:-} sha=${2:-}
	[ -n "$file" ] || return 1
	[ -n "$sha" ] || return 1
	[ -s "$file" ] || return 1
	grep -q "$sha" "$file" 2>/dev/null
}

artifact_index_fresh() {
	local now mtime age
	[ -s "$ARTIFACT_INDEX_ARTIFACTS" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$ARTIFACT_INDEX_ARTIFACTS" 2>/dev/null || printf '0')
	age=$(( now - mtime ))
	[ "$age" -le "$ARTIFACT_INDEX_MAX_AGE_SECONDS" ]
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

latest_owner_matrix() {
	local indexed
	if artifact_index_fresh; then
		indexed=$(latest_indexed_artifact owner_matrix 'owner-matrix[.]tsv$' || true)
		if [ -n "$indexed" ]; then
			printf '%s\n' "$indexed"
			return 0
		fi
	fi
	recent_child_dirs "$PR_SPLIT_BASE/runs" "$PR_SPLIT_RUN_SCAN_LIMIT" |
		while IFS= read -r run_dir; do
			find "$run_dir" -maxdepth 5 -name owner-matrix.tsv -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

pr07c_owner_matrix_needed() {
	grep -q $'^pr07c-owner-matrix\t' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null
}

write_progress_table() {
	local tmp=$PROGRESS.$$.tmp now source class branch base head current_head allowed reason report pr07c_report reload_status reload_next reload_evidence reload_downscope_reason deferred_control deferred_status
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	deferred_control=$(deferred_file current-deferred-control.tsv)
	deferred_status=$(deferred_file current-deferred-status.md)
	reload_downscope_reason=$(deferred_downscope_reason reload-hydration 2>/dev/null || true)
	reload_status=needs-product-decision
	reload_next='promote product fix, produce owner evidence, or downscope'
	reload_evidence=reload-hydration
	if [ -n "$reload_downscope_reason" ]; then
		reload_status=terminal/downscoped
		reload_next='deferred controller downscope consumed; suppress generic reload-hydration relaunch unless newer same-head final-ui product evidence appears'
		reload_evidence=$reload_downscope_reason
	elif reload_hydration_replay_downscope_active; then
		reload_status=terminal/downscoped
		reload_next='replay-backed downscope consumed; suppress generic reload-hydration relaunch unless newer same-head final-ui product evidence appears'
		if [ -s "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION" ] &&
			grep -Eq '^reload-hydration-seed7800014[[:space:]]+replay_backed_downscope[[:space:]]' "$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION"; then
			reload_evidence=$RELOAD_HYDRATION_EXACT_BLOCKER_CLASSIFICATION
		else
			reload_evidence=$RELOAD_HYDRATION_REPLAY_DOWNSCOPE_CLASSIFICATION
		fi
	elif reload_hydration_manifest_adopted; then
		reload_status=manifest-adopted
		reload_next='validated reload-hydration manifest is adopted/published; continue same-head exact-stack and benchmark proof instead of relaunching product-decision work'
		reload_evidence=$(latest_reload_hydration_push_manifest)
	elif awk -F '\t' 'NR > 1 && $1 == "reload-hydration" && $4 == "active" && $7 == "active-exact-replay" { found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null; then
		reload_status=exact-replay-active
		reload_next='consume active exact same-head replay; do not relaunch generic deferred family'
		reload_evidence=$(awk -F '\t' 'NR > 1 && $1 == "reload-hydration" { print $9; exit }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || printf 'active-exact-replay')
	fi
	{
		printf 'generated_at\titem_id\tkind\tpriority\tstatus\tbranch_or_target\thead_sha\tnext_action\tevidence\n'
		if [ -s "$CRITICAL_BASE/current-push-manifest.tsv" ]; then
			awk -F '\t' '
				NR == 1 { next }
				$2 == "product-candidate" {
					key = $3 "\t" $5
					row[key] = $0
				}
				END {
					for (key in row) print row[key]
				}
			' "$CRITICAL_BASE/current-push-manifest.tsv" |
			sort |
			while IFS=$'\t' read -r source class branch base head allowed reason report; do
				[ -n "${source:-}" ] || continue
				current_head=$(branch_current_head "$branch")
				if [ -n "$current_head" ] && ! same_commit_prefix "$current_head" "$head"; then
					if pr07c_direct_ready_superseded_by_repair "$branch"; then
						printf '%s\t%s\tready-product-pr\tlow\tsuperseded-by-repair\t%s\t%s\tstale direct PR07C head is superseded by the repaired build-clean PR07C branch\t%s\n' "$now" "$source" "$branch" "$current_head" "$report"
						continue
					fi
					printf '%s\t%s\tready-product-pr\thigh\tstale-validation\t%s\t%s\tbranch head moved after validation; validated head was %s, rerun exact validation before publication\t%s\n' "$now" "$source" "$branch" "$current_head" "$head" "$report"
					continue
				fi
				case "$class:$allowed:$reason" in
					product-candidate:1:*)
						if branch_published "$branch" "$head"; then
							printf '%s\t%s\tready-product-pr\thigh\tpublished\t%s\t%s\talready published by local machine; keep validating against fuzz\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						elif policy_superseded_by_controller "$branch"; then
							printf '%s\t%s\tready-product-pr\tlow\tsuperseded\t%s\t%s\tcontroller policy says this candidate is superseded by an already-published canonical branch\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						elif publish_blocked_by_controller "$branch" "$head" || ! publish_allowed_by_controller "$branch" "$head"; then
							printf '%s\t%s\tready-product-pr\thigh\theld-by-controller\t%s\t%s\tcontroller decision currently blocks publication\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						else
							printf '%s\t%s\tready-product-pr\thigh\tpublishable\t%s\t%s\tpublish from local machine and keep validating against fuzz\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						fi
						;;
					product-candidate:0:*)
						if branch_published "$branch" "$head"; then
							printf '%s\t%s\tready-product-pr\thigh\tpublished\t%s\t%s\talready published by local machine after branch repair; keep validating against fuzz\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						elif branch_repair_manifest_exists "$branch" "$head"; then
							printf '%s\t%s\tready-product-pr\thigh\tmanifest-repaired\t%s\t%s\tbranch repair manifest exists; wait for local publication\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						else
							printf '%s\t%s\tready-product-pr\tmedium\tneeds-repair\t%s\t%s\trepair manifest/diff/base before publication reason=%s\t%s\n' "$now" "$source" "$branch" "$head" "$reason" "$report"
						fi
						;;
				esac
			done
		fi
		if pr07c_owner_matrix_needed; then
			pr07c_report=$(latest_pr07c_owner_report || true)
			if pr07c_owner_matrix_consumed; then
				if [ "$PR07C_OWNER_CONSUMED_TTL_SECONDS" -gt 0 ]; then
					printf '%s\tpr07c-owner-matrix\truntime-gated-pr\thigh\truntime-held-consumed\tPR07C/HOLD-07C\t\tdo not relaunch owner matrix until newer owner evidence appears or the %ss consumed-evidence TTL expires; repair setup or run exact replay instead\t%s\n' "$now" "$PR07C_OWNER_CONSUMED_TTL_SECONDS" "${pr07c_report:-missing}"
				else
					printf '%s\tpr07c-owner-matrix\truntime-gated-pr\thigh\truntime-held-consumed\tPR07C/HOLD-07C\t\tdo not relaunch owner matrix until newer owner evidence appears; repair setup or run exact replay instead\t%s\n' "$now" "${pr07c_report:-missing}"
				fi
			else
				printf '%s\tpr07c-owner-matrix\truntime-gated-pr\thigh\towner-evidence-needed\tPR07C/HOLD-07C\t\tconsume owner matrix; promote only with product ownership proof\t%s\n' "$now" "${pr07c_report:-missing}"
			fi
		fi
		if [ -s "$deferred_status" ]; then
			awk -v now="$now" -v reload_status="$reload_status" -v reload_next="$reload_next" -v reload_evidence="$reload_evidence" -v deferred_control="$deferred_control" '
				BEGIN {
					while ((getline line < deferred_control) > 0) {
						split(line, fields, "\t")
						if (fields[2] != "" && fields[3] == "downscoped") {
							downscoped[fields[2]] = fields[4]
						}
					}
					close(deferred_control)
				}
				function deferred_family() {
					if ($1 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/ &&
						($2 == "reload-hydration" || $2 == "rich-text-suffix-corruption" || $2 == "pre-save-search-live-collapse") &&
						$3 ~ /^(downscoped|eligible|diagnostic|held|active|terminal)$/) {
						return $2
					}
					return ""
				}
				function clean(value) {
					gsub(/\t/, " ", value)
					gsub(/\r|\n/, " ", value)
					return value
				}
				function progress_row(item_id, priority, status, branch_or_target, next_action, evidence) {
					print now "\t" item_id "\tdeferred-family\t" priority "\t" status "\t" branch_or_target "\t\t" clean(next_action) "\t" clean(evidence)
				}
				{
					family = deferred_family()
					if (family == "" || seen[family]++) {
						next
					}
					if (family == "reload-hydration") {
					if (downscoped["reload-hydration"] != "") {
						progress_row("reload-hydration", "high", "downscoped", "reload-hydration", "replay-backed downscope consumed; suppress generic reload-hydration relaunch unless newer same-head final-ui product evidence appears", $0 " deferred_control=" downscoped["reload-hydration"])
					} else {
						progress_row("reload-hydration", "high", reload_status, "reload-hydration", reload_next, $0 " active_replay=" reload_evidence)
					}
						next
					}
					if (family == "rich-text-suffix-corruption") {
					if (downscoped["rich-text-suffix-corruption"] != "") {
						progress_row("rich-text-suffix-corruption", "medium", "downscoped", "rich-text-suffix-corruption", "deferred-control downscope consumed; reopen only with deterministic suffix/content first-loss evidence", $0 " deferred_control=" downscoped["rich-text-suffix-corruption"])
					} else {
						progress_row("rich-text-suffix-corruption", "medium", "diagnostic", "rich-text-suffix-corruption", "promote only with owner evidence or explicit product downscope", $0)
					}
						next
					}
					if (family == "pre-save-search-live-collapse") {
					if (downscoped["pre-save-search-live-collapse"] != "") {
						progress_row("pre-save-search-live-collapse", "medium", "downscoped", "pre-save-search-live-collapse", "deferred-control downscope consumed; reopen only with repeatable core/search first-loss evidence", $0 " deferred_control=" downscoped["pre-save-search-live-collapse"])
					} else {
						progress_row("pre-save-search-live-collapse", "medium", "diagnostic", "pre-save-search-live-collapse", "promote only with owner evidence", $0)
					}
						next
					}
				}
			' "$deferred_status" 2>/dev/null || true
		fi
	} > "$tmp"
	mv "$tmp" "$PROGRESS"
}

safe_destination_for_branch() {
	local branch=$1 suffix
	suffix=$(printf '%s' "$branch" |
		sed -e 's#^refs/heads/##' -e 's#^ready/##' -e 's#^finalized/##' -e 's#^fresh-prset/##' |
		tr '/_' '--' |
		tr -cd 'A-Za-z0-9.-')
	printf 'danluu/rtc-pr-progress-%s' "$suffix"
}

append_requested_pr07c_repaired_manifest_row() {
	local output_file=$1 policy_ref branch expected_head head base files insertions deletions dest
	[ -s "$DECISIONS" ] || return 0
	policy_ref=$(awk -F '\t' '$1 == "candidate_pr07c_branch" { print $2; exit }' "$BASE/current-promotion-policy.tsv" 2>/dev/null || true)
	case "$policy_ref" in
		repair/pr07c-exact-stack-build-*@*) ;;
		*) return 0 ;;
	esac
	branch=${policy_ref%@*}
	expected_head=${policy_ref#*@}
	head=$(branch_current_head "$branch")
	[ -n "$head" ] || return 0
	same_commit_prefix "$head" "$expected_head" || return 0
		awk -F '\t' -v head="$head" '
			NR == 1 { next }
			($1 == "include-candidate" || $1 == "publish-manifest" || $1 == "repair-ready" || $1 == "update-controller-rule" || $1 == "refresh-status") && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ {
				target = $2
				if (target ~ /^[^ \t:]+:PR07C\/repaired-head-/) {
					sub(/^[^ \t:]+:/, "", target)
				}
				if (target ~ /^PR07C@[^/]+\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/) {
					sub(/^PR07C@/, "", target)
					sub(/\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/, "", target)
				} else if ($1 == "repair-ready" && target ~ /^repair\/pr07c-exact-stack-build-[^@]+@[0-9a-f]+$/) {
					sub(/^repair\/pr07c-exact-stack-build-[^@]+@/, "", target)
				} else if (target ~ /^PR07C\/repaired-head-[0-9a-f]+(\/(current-push-manifest(-materializer)?|live-manifest-materialization))?$/) {
					sub(/^PR07C\/repaired-head-/, "", target)
					sub(/\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/, "", target)
				} else if (target ~ /^current-push-manifest\/pr07c-repaired-head-[0-9a-f]+$/) {
					sub(/^current-push-manifest\/pr07c-repaired-head-/, "", target)
				} else {
					next
			}
			if (target != "" && (head == target || index(head, target) == 1 || index(target, head) == 1)) {
				found = 1
			}
		}
		END { exit found ? 0 : 1 }
	' "$DECISIONS" || return 0
		if [ -s "$PR07C_REPAIRED_HEAD_MANIFEST" ]; then
			awk -F '\t' -v head="$head" '
				NR > 1 && NF >= 9 && ($2 == head || index($2, head) == 1 || index(head, $2) == 1) {
					print
				}
			' "$PR07C_REPAIRED_HEAD_MANIFEST" |
				while IFS= read -r row; do
					row_branch=$(printf '%s' "$row" | cut -f1)
					row_head=$(printf '%s' "$row" | cut -f2)
					awk -F '\t' -v branch="$row_branch" -v head="$row_head" '
						NR == 1 { print; next }
						$1 == branch && ($2 == head || index($2, head) == 1 || index(head, $2) == 1) { next }
						{ print }
					' "$output_file" > "$output_file.pr07c-source"
					mv "$output_file.pr07c-source" "$output_file"
					printf '%s\n' "$row" >> "$output_file"
				done
			awk -F '\t' -v head="$head" 'NR > 1 && ($2 == head || index($2, head) == 1 || index(head, $2) == 1) { found = 1 } END { exit found ? 0 : 1 }' "$output_file" && return 0
		fi
	base=ready/rtc-pr07b-save-response-manager-base-record
	files=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | wc -l | tr -d ' ' || printf '0')
	insertions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }' || printf '0')
	deletions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $2 } END { print s + 0 }' || printf '0')
	dest=$(safe_destination_for_branch "$branch")
	printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$branch" "$head" "$dest" "$base" "$files" "$insertions" "$deletions" \
		"repair-ready decision materialized build-clean PR07C manifest row; exact validation and forced coverage gates still apply" \
		"current-push-manifest repair requested by controller" >> "$output_file"
}

write_controller_push_manifest() {
	local tmp=$PUSH_MANIFEST.$$.tmp source class branch base head allowed reason report files insertions deletions dest
	{
		printf 'source_branch\tsource_commit\tintended_danluu_branch\tbase_ref\tfiles_changed\tinsertions\tdeletions\tvalidation_summary\treason\n'
		if [ -s "$CRITICAL_BASE/current-push-manifest.tsv" ]; then
			awk -F '\t' '
				NR == 1 { next }
				$2 == "product-candidate" {
					key = $3 "\t" $5
					row[key] = $0
				}
				END {
					for (key in row) print row[key]
				}
			' "$CRITICAL_BASE/current-push-manifest.tsv" |
			sort |
			while IFS=$'\t' read -r source class branch base head allowed reason report; do
				[ "$class" = "product-candidate" ] || continue
				[ "$allowed" = "1" ] || continue
				branch_published "$branch" "$head" && continue
				publish_blocked_by_controller "$branch" "$head" && continue
				publish_allowed_by_controller "$branch" "$head" || continue
				case "$branch" in
					ready/*|finalized/*|fresh-prset/*|cycle*|ready-pr03b/*) ;;
					*) continue ;;
				esac
				files=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | wc -l | tr -d ' ' || printf '0')
				insertions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }' || printf '0')
				deletions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $2 } END { print s + 0 }' || printf '0')
				dest=$(safe_destination_for_branch "$branch")
				printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
					"$branch" "$head" "$dest" "$base" "$files" "$insertions" "$deletions" "critical-path diff check passed; controller prioritized product PR publication" "$report"
			done
		fi
		recent_job_push_manifests |
			tail -40 |
			while IFS= read -r manifest; do
				awk -F '\t' 'NR > 1 && NF >= 9 { print }' "$manifest"
			done |
			awk -F '\t' '!seen[$1 "\t" $2]++' |
			while IFS= read -r row; do
				branch=$(printf '%s' "$row" | cut -f1)
				head=$(printf '%s' "$row" | cut -f2)
				branch_published "$branch" "$head" && continue
				publish_blocked_by_controller "$branch" "$head" && continue
				publish_allowed_by_controller "$branch" "$head" || continue
				printf '%s\n' "$row"
			done
		print_reload_hydration_manifest_if_adopted
		if [ -s "$DECISIONS" ]; then
				awk -F '\t' '
					NR == 1 { next }
					($1 == "publish-manifest" || $1 == "repair-ready" || $1 == "refresh-status" || $1 == "update-controller-rule") && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ {
						target = $2
						if (target ~ /^[^ \t:]+:PR07C\/repaired-head-/) {
							sub(/^[^ \t:]+:/, "", target)
						}
						if (target ~ /^PR07C@[^/]+\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/) {
								sub(/^PR07C@/, "", target)
								sub(/\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/, "", target)
								print target
							} else if ($1 == "repair-ready" && target ~ /^repair\/pr07c-exact-stack-build-[^@]+@[0-9a-f]+$/) {
								sub(/^repair\/pr07c-exact-stack-build-[^@]+@/, "", target)
								print target
							} else if (target ~ /^PR07C\/repaired-head-[0-9a-f]+(\/(current-push-manifest(-materializer)?|live-manifest-materialization))?$/) {
								sub(/^PR07C\/repaired-head-/, "", target)
								sub(/\/(current-push-manifest(-materializer)?|live-manifest-materialization)$/, "", target)
							print target
						} else if (target ~ /^current-push-manifest\/pr07c-repaired-head-[0-9a-f]+$/) {
							sub(/^current-push-manifest\/pr07c-repaired-head-/, "", target)
						print target
					}
				}
			' "$DECISIONS" |
				sort -u |
				while IFS= read -r head; do
					[ -n "$head" ] || continue
					resolved=$(
						git -C "$SRC" for-each-ref 'refs/heads/repair/pr07c-exact-stack-build-*' --format='%(refname:short)	%(objectname)' 2>/dev/null |
							awk -v head="$head" '$2 == head || index($2, head) == 1 || index(head, $2) == 1 { print $1 "\t" $2; found = 1; exit } END { exit found ? 0 : 1 }'
					) || continue
					branch=${resolved%%$'\t'*}
					head=${resolved#*$'\t'}
					[ -n "$branch" ] && [ -n "$head" ] || continue
					# This controller decision materializes same-head evidence for gating; publication checks happen later.
					base=ready/rtc-pr07b-save-response-manager-base-record
					files=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | wc -l | tr -d ' ' || printf '0')
					insertions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }' || printf '0')
					deletions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $2 } END { print s + 0 }' || printf '0')
					dest=$(safe_destination_for_branch "$branch")
					printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
						"$branch" "$head" "$dest" "$base" "$files" "$insertions" "$deletions" "repair-ready decision materialized build-clean PR07C manifest row; exact validation and forced coverage gates still apply" "current-push-manifest repair requested by controller"
				done |
				awk -F '\t' '!seen[$1 "\t" $2]++'
		fi
		if [ -s "$DECISIONS" ]; then
			{
				awk -F '\t' '
					NR == 1 { next }
					$1 == "include-candidate" && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ {
						target = $2
						sub(/@.*/, "", target)
						if (target ~ /^(repair|candidate)\//) print target
						if (target ~ /^repair\/pr07c-exact-stack-build/) print "__latest_pr07c_candidate__"
					}
				' "$DECISIONS"
				if decision_explicitly_allows include-candidate PR07C || decision_explicitly_allows include-candidate-stack PR07C; then
					printf '__latest_pr07c_candidate__\n'
				fi
			} |
				while IFS= read -r branch; do
					[ -n "$branch" ] || continue
					if [ "$branch" = "__latest_pr07c_candidate__" ]; then
						branch=$(git -C "$SRC" for-each-ref 'refs/heads/candidate/rtc-risk-reducing-pr07c-all-merged-*' --sort=-committerdate --format='%(refname:short)' 2>/dev/null | head -1)
					fi
					case "$branch" in
						repair/*|candidate/*) ;;
						*) continue ;;
					esac
					head=$(branch_current_head "$branch")
					[ -n "$head" ] || continue
					if branch_published "$branch" "$head"; then
						case "$branch" in
							repair/pr07c-exact-stack-build-*)
								;;
							*)
								continue
								;;
						esac
					fi
					case "$branch" in
						repair/pr07c-exact-stack-build-*) base=ready/rtc-pr07b-save-response-manager-base-record ;;
						*) base=origin/trunk ;;
					esac
					files=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | wc -l | tr -d ' ' || printf '0')
					insertions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }' || printf '0')
					deletions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $2 } END { print s + 0 }' || printf '0')
					dest=$(safe_destination_for_branch "$branch")
					printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
						"$branch" "$head" "$dest" "$base" "$files" "$insertions" "$deletions" "controller decision selected this repaired/candidate branch; exact validation and forced coverage gates still apply" "include-candidate decision materialized a concrete branch row"
				done |
				awk -F '\t' '!seen[$1 "\t" $2]++'
		fi
		if [ -s "$DECISIONS" ]; then
			awk -F '\t' '
				NR == 1 { next }
				$1 == "include-candidate-stack" && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ {
					if ($2 == "PR07C") include_pr07c = 1
					if ($2 ~ /^candidate\//) candidate[$2] = 1
				}
				$1 == "credit-final-stack" && $2 ~ /^candidate\// {
					final_candidate[$2] = 1
				}
				END {
					for (branch in candidate) print branch
					if (include_pr07c) {
						for (branch in final_candidate) print branch
					}
				}
			' "$DECISIONS" |
				sort -u |
				while IFS= read -r branch; do
					case "$branch" in
						candidate/*) ;;
						*) continue ;;
					esac
					head=$(branch_current_head "$branch")
					[ -n "$head" ] || continue
					branch_published "$branch" "$head" && continue
					publish_blocked_by_controller "$branch" "$head" && continue
					if ! decision_explicitly_allows_ref include-candidate-stack "$branch" "$head"; then
						decision_explicitly_allows include-candidate-stack PR07C || continue
					fi
					row=$(
						{
							recent_job_push_manifests |
								tail -40 |
								while IFS= read -r manifest; do
									awk -F '\t' -v head="$head" 'NR > 1 && NF >= 9 && $2 == head { print; found = 1; exit }' "$manifest"
								done |
								awk 'NF { print; exit }'
						} || true
					)
					if [ -n "$row" ]; then
						base=$(printf '%s' "$row" | cut -f4)
						files=$(printf '%s' "$row" | cut -f5)
						insertions=$(printf '%s' "$row" | cut -f6)
						deletions=$(printf '%s' "$row" | cut -f7)
						report=$(printf '%s' "$row" | cut -f8)
					else
						base=origin/trunk
						files=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | wc -l | tr -d ' ' || printf '0')
						insertions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }' || printf '0')
						deletions=$(git -C "$SRC" diff --numstat "$base" "$branch" 2>/dev/null | awk '{ s += $2 } END { print s + 0 }' || printf '0')
						report='candidate stack included by controller decision; exact validation and coverage gates still required'
					fi
					dest=$(safe_destination_for_branch "$branch")
					printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
						"$branch" "$head" "$dest" "$base" "$files" "$insertions" "$deletions" "$report" "include-candidate-stack decision allows a validation/publication alias; final credit remains gated"
				done
		fi
	} > "$tmp"
	append_requested_pr07c_repaired_manifest_row "$tmp"
	awk -F '\t' '
		NR == 1 { print; next }
		NF >= 9 && !seen[$1 "\t" $2]++ { print }
	' "$tmp" > "$tmp.dedup"
	mv "$tmp.dedup" "$tmp"
	mv "$tmp" "$PUSH_MANIFEST"
}

collect_context() {
	{
		echo "# RTC PR Progress Controller Context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- resource reason: $(resource_reason)"
		echo "- active discovery sessions: $(discovery_active_sessions)"
		echo "- min discovery sessions: $MIN_DISCOVERY_SESSIONS"
		echo "- discovery protected: $(discovery_protected && printf yes || printf no)"
		echo "- active PR jobs: $(active_pr_jobs)"
		echo "- max active PR jobs: $MAX_ACTIVE_PR_JOBS"
		echo
		echo "## Operator Directive"
		if [ -f "/media/volume/danluu-fuzz-data/rtc-operator-directives/current.md" ]; then
			sed -n '1,320p' "/media/volume/danluu-fuzz-data/rtc-operator-directives/current.md"
		else
			echo "missing operator directive"
		fi
		echo
		echo "## Current Promotion Policy"
		sed -n '1,160p' "/current-promotion-policy.tsv" 2>/dev/null || sed -n '1,160p' "/current-promotion-policy.tsv" 2>/dev/null || true
		echo
		echo "## Current PR Progress"
		column -t -s $'\t' "$PROGRESS" 2>/dev/null || sed -n '1,220p' "$PROGRESS" 2>/dev/null || true
		echo
		echo "## Controller Push Manifest"
		sed -n '1,220p' "$PUSH_MANIFEST" 2>/dev/null || true
		echo
		echo "## Critical Status"
		sed -n '1,160p' "$CRITICAL_BASE/current-critical-path-status.md" 2>/dev/null || true
		echo
		echo "## Deferred Status"
		sed -n '1,180p' "$(deferred_file current-deferred-status.md)" 2>/dev/null || true
		echo
		echo "## PR Split Feedback"
		sed -n '1,160p' "$PR_SPLIT_BASE/latest-feedback-action.md" 2>/dev/null || true
		echo
		echo "## Coverage Status"
		coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
		if [ -n "${coverage:-}" ] && [ -f "$coverage/novelty-status.md" ]; then
			sed -n '1,160p' "$coverage/novelty-status.md"
		else
			echo "missing current novelty status"
		fi
		echo
		echo "## Benchmark Canary Materialization Summary"
		if [ -n "${coverage:-}" ] && [ -f "$coverage/benchmark-canary-coverage-status.tsv" ]; then
			status_file="$coverage/benchmark-canary-coverage-status.tsv"
			now_epoch=$(date -u +%s)
			status_mtime=$(stat -c %Y "$status_file" 2>/dev/null || printf '0')
			root_mtime=$(stat -c %Y "$coverage" 2>/dev/null || printf '0')
			printf -- '- coverage root: %s\n' "$coverage"
			printf -- '- status file: %s\n' "$status_file"
			printf -- '- status age seconds: %s\n' "$(( now_epoch - status_mtime ))"
			printf -- '- root age seconds: %s\n' "$(( now_epoch - root_mtime ))"
			awk -F '\t' '
				NR == 1 {
					for (i = 1; i <= NF; i++) col[$i] = i
					next
				}
				{
					rows++
					if (tolower(val("active")) ~ /^(yes|true|1)$/) active++
					if (tolower(val("current_run_green")) ~ /^(yes|true|1)$/) green++
					if (tolower(val("promotion_blocked")) ~ /^(yes|true|1)$/) blocked++
					if (tolower(val("explicit_downscope")) ~ /^(yes|true|1)$/) downscoped++
					if ((val("current_run_group_records") + 0) > 0) rows_with_current_records++
					if ((val("product_evidence_records") + 0) > 0) rows_with_product_evidence++
					if (tolower(val("retained_product_evidence")) ~ /^(yes|true|1)$/) retained++
					if (tolower(val("status_only")) ~ /^(yes|true|1)$/) status_only++
				}
				END {
					printf "- rows: %d\n", rows + 0
					printf "- active rows: %d\n", active + 0
					printf "- green rows: %d\n", green + 0
					printf "- blocked rows: %d\n", blocked + 0
					printf "- explicit downscope rows: %d\n", downscoped + 0
					printf "- rows with current records: %d\n", rows_with_current_records + 0
					printf "- rows with product evidence: %d\n", rows_with_product_evidence + 0
					printf "- retained-product rows: %d\n", retained + 0
					printf "- status-only rows: %d\n", status_only + 0
				}
				function val(name) { return col[name] ? $(col[name]) : "" }
			' "$status_file"
			echo
			echo "### Benchmark Canary Rows"
			awk -F '\t' '
				NR == 1 { for (i = 1; i <= NF; i++) col[$i] = i; print "group\tactive\tsupervisor\trecords\tgreen\tblocked\tdownscope\tretained\tproduct_records\treason"; next }
				{ print val("group") "\t" val("active") "\t" val("supervisor_status") "\t" val("current_run_group_records") "\t" val("current_run_green") "\t" val("promotion_blocked") "\t" val("explicit_downscope") "\t" val("retained_product_evidence") "\t" val("product_evidence_records") "\t" val("reason") }
				function val(name) { return col[name] ? $(col[name]) : "" }
			' "$status_file" | sed -n '1,80p'
		else
			echo "missing benchmark canary coverage status"
		fi
		echo
		echo "## Benchmark Canary Feedback"
		if [ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.md" ]; then
			sed -n '1,220p' "$BENCHMARK_FEEDBACK_BASE/current-feedback.md"
		else
			echo "missing current benchmark canary feedback"
		fi
		if [ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ]; then
			echo
			echo "### Feedback TSV"
			sed -n '1,80p' "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
		fi
		echo
		echo "## Productive Analysis Control Feed"
		echo "Rows here are controller inputs, not passive notes. If a row targets pr-progress, critical-path, coverage, level-mix, or deferred work, either act on it in the next decision set or explain the rejection."
		if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-report.md" ]; then
			sed -n '1,220p' "$PRODUCTIVE_ANALYSIS_BASE/current-report.md"
		else
			echo "missing current productive analysis report"
		fi
		if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv" ]; then
			echo
			echo "### Productive Action TSV"
			sed -n '1,120p' "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv"
		fi
		echo
		echo "## Tmux Sessions"
		tmux_sessions | sed -n '1,220p'
	} > "$CONTEXT.tmp"
	mv "$CONTEXT.tmp" "$CONTEXT"
}

write_persona_prompt() {
	local prompt=$1 persona=$2 run_dir=$3
	cat > "$prompt" <<PROMPT
Reviewer: $persona

Task: control the RTC PR progress controller for the next cycles.

Read:
- $CONTEXT
- $PROGRESS
- $PUSH_MANIFEST
- $DECISIONS if present

Treat the Productive Analysis Control Feed in $CONTEXT as binding controller
input: act on rows that target PR progress or explain why the action is rejected
in the returned TSV. Do not let a high-priority action row disappear as prose.

Benchmark canary bootstrap rule: a new coverage root initially writes forced
canary rows before isolated repos, current records, and product evidence are
materialized. If the Benchmark Canary Materialization Summary has active rows =
0, rows with current records = 0, or all rows are status-only, treat zero
product_evidence_records as not-yet-materialized, not as evidence that retained
product blockers disappeared. Do not cool or suppress aggregate product repair
owners solely from that bootstrap state; preserve discovery and keep blockers
open until there is green proof, explicit downscope, or materialized current-run
records.

The controller goal is faster progress on productive PRs that fix real bugs.
Productive progress means one of: a real-fix branch head changes, a blocker is
removed, owner evidence becomes conclusive, a branch becomes publishable, a
branch is published by the local machine, or a low-value family is explicitly
downscoped with evidence.

Do not starve bug discovery. Existing-code and existing-PR fuzzing must retain a
resource reserve. Do not recommend stopping coverage-guided, focused, strict,
protocol, lower-level, or browser fuzzing merely to create more PR analysis.

Return:
1. Which PR/family should get the next product-progress slot.
2. Which work should be cooled down because it is diagnostic churn.
3. Whether discovery reserve is healthy or PR jobs should wait.
4. Any controller rule change needed.
5. One TSV block with header:
   action	target	priority	allowed	reason

Valid actions include:
- publish-ready
- launch-owner-matrix
- launch-branch-repair
- repair-branch
- repair-ready
- cooldown-diagnostic
- reserve-discovery
- update-controller-rule

Do not edit files.
PROMPT
}

launch_persona_round() {
	local ts run_dir persona slug prompt report stderr runner synthesis_prompt synthesis_report synthesis_stderr synthesis_runner
	persona_round_active && return 0
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run_dir="$BASE/persona-runs/$ts"
	mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
	cp "$CONTEXT" "$run_dir/context.md" 2>/dev/null || true
	cp "$PROGRESS" "$run_dir/progress.tsv" 2>/dev/null || true
	for persona in "${PERSONAS[@]}"; do
		slug=$(slugify "$persona")
		prompt="$run_dir/prompts/$slug.md"
		report="$run_dir/reports/$slug.md"
		stderr="$run_dir/logs/$slug.stderr.log"
		runner="$run_dir/logs/$slug.run.sh"
		write_persona_prompt "$prompt" "$persona" "$run_dir"
		cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$SRC"
timeout "$PERSONA_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr" || true
EOF
		chmod +x "$runner"
		tmux new-session -d -s "rtc-pr-progress-persona-$slug-$ts" "bash '$runner'"
	done

	synthesis_prompt="$run_dir/prompts/synthesis.md"
	synthesis_report="$run_dir/synthesis.md"
	synthesis_stderr="$run_dir/logs/synthesis.stderr.log"
	synthesis_runner="$run_dir/logs/synthesis.run.sh"
	cat > "$synthesis_prompt" <<PROMPT
Task: synthesize the RTC PR progress controller persona reports.

Read all reports in:
$run_dir/reports

Also read:
- $run_dir/context.md
- $run_dir/progress.tsv

Write:
- concise synthesis to $synthesis_report
- controller decisions TSV to $run_dir/control-decisions.tsv

The TSV header must be:
action	target	priority	allowed	reason

Allowed must be yes or no. Preserve a discovery reserve: do not allow heavy PR
jobs if discovery sessions are unhealthy unless the action is cheap publication
manifest generation or analysis-only.

Prefer decisions that move product PRs: publish ready real-fix branches, run
include PR07C in the candidate stack when current promotion policy says it is net-risk-reducing, run exact validation/repair for PR07C, repair concrete failed PR
branches, cool down duplicate diagnostics, or downscope low-value families.

Apply the benchmark canary bootstrap rule from context: do not synthesize
cooldown-diagnostic rows that declare product evidence stale just because the
current coverage root has zero current records or zero active canary rows.
PROMPT
	cat > "$synthesis_runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
deadline=\$(( \$(date -u +%s) + $PERSONA_TIMEOUT_SECONDS ))
while [ "\$(find "$run_dir/reports" -type f -name '*.md' -size +0c 2>/dev/null | wc -l | tr -d ' ')" -lt "${#PERSONAS[@]}" ] && [ "\$(date -u +%s)" -lt "\$deadline" ]; do
	sleep 10
done
cd "$SRC"
timeout "$PERSONA_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$synthesis_prompt" > "$synthesis_report" 2> "$synthesis_stderr" || true
if [ ! -s "$run_dir/control-decisions.tsv" ]; then
	printf 'action\\ttarget\\tpriority\\tallowed\\treason\\n' > "$run_dir/control-decisions.tsv"
	canary_status=\$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	canary_status=\${canary_status:+\$canary_status/benchmark-canary-coverage-status.tsv}
	canary_blocked=0
	if [ -s "\${canary_status:-}" ]; then
		canary_blocked=\$(awk -F '\\t' '
			NR == 1 {
				for (i = 1; i <= NF; i++) col[\$i] = i
				required = col["promotion_blocked"] && col["current_run_green"] && col["explicit_downscope"]
				next
			}
			required && tolower(\$(col["promotion_blocked"])) ~ /^(yes|true|1)$/ &&
				tolower(\$(col["current_run_green"])) !~ /^(yes|true|1)$/ &&
				tolower(\$(col["explicit_downscope"])) !~ /^(yes|true|1)$/ {
				blocked++
			}
			END { print blocked + 0 }
		' "\$canary_status" 2>/dev/null || printf '0')
	fi
	if [ "\$canary_blocked" -gt 0 ]; then
		printf 'publish-ready\\tPR07C\\tP0\\tno\\tcurrent benchmark-canary status has %s promotion-blocked rows lacking current_run_green=yes or explicit_downscope=yes: %s\\n' "\$canary_blocked" "\$canary_status" >> "$run_dir/control-decisions.tsv"
	else
		printf 'publish-ready\\t*\\tP0\\tno\\tfallback: persona synthesis did not produce explicit decisions; fail closed until specific controller rows are generated\\n' >> "$run_dir/control-decisions.tsv"
	fi
	printf 'launch-owner-matrix\\tpr07c-owner-matrix\\thigh\\tno\\tfallback: owner matrix is runtime-held/consumed; do not relaunch from fallback\\n' >> "$run_dir/control-decisions.tsv"
	printf 'reserve-discovery\\t*\\thigh\\tyes\\tfallback: preserve active fuzzing reserve\\n' >> "$run_dir/control-decisions.tsv"
fi
canary_status=\$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
canary_status=\${canary_status:+\$canary_status/benchmark-canary-coverage-status.tsv}
canary_blocked=0
if [ -s "\${canary_status:-}" ]; then
	canary_blocked=\$(awk -F '\\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) col[\$i] = i
			required = col["promotion_blocked"] && col["current_run_green"] && col["explicit_downscope"]
			next
		}
		required && tolower(\$(col["promotion_blocked"])) ~ /^(yes|true|1)$/ &&
			tolower(\$(col["current_run_green"])) !~ /^(yes|true|1)$/ &&
			tolower(\$(col["explicit_downscope"])) !~ /^(yes|true|1)$/ {
			blocked++
		}
		END { print blocked + 0 }
	' "\$canary_status" 2>/dev/null || printf '0')
fi
if [ "\$canary_blocked" -gt 0 ]; then
	awk -F '\\t' -v OFS='\\t' -v count="\$canary_blocked" -v status="\$canary_status" '
		NR == 1 { print; next }
		\$1 == "publish-ready" &&
			\$2 ~ /^(PR07C($|[@/])|PR07C-publication-credit$|repair\\/pr07c-exact-stack-build-[^@]+@|candidate\\/rtc-risk-reducing-pr07c-all-merged-[^@]+@)/ {
			\$4 = "no"
			\$5 = "current benchmark-canary status has " count " promotion-blocked rows lacking current_run_green=yes or explicit_downscope=yes: " status
		}
		{ print }
	' "$run_dir/control-decisions.tsv" > "$run_dir/control-decisions.tsv.canary-gate"
	mv "$run_dir/control-decisions.tsv.canary-gate" "$run_dir/control-decisions.tsv"
	if ! awk -F '\\t' 'NR > 1 && \$1 == "hold-publication" && \$2 == "PR07C" { found = 1 } END { exit found ? 0 : 1 }' "$run_dir/control-decisions.tsv"; then
		printf 'hold-publication\\tPR07C\\tP0\\tno\\tcurrent benchmark-canary status has %s promotion-blocked rows lacking current_run_green=yes or explicit_downscope=yes: %s\\n' "\$canary_blocked" "\$canary_status" >> "$run_dir/control-decisions.tsv"
	fi
fi
awk -F '\\t' -v OFS='\\t' '
	function emit() {
		if (!have) {
			return
		}
		gsub(/[ \\t\\r\\n]+/, " ", reason)
		sub(/^ /, "", reason)
		sub(/ $/, "", reason)
		print action, target, priority, allowed, reason
	}
	NR == 1 {
		print "action", "target", "priority", "allowed", "reason"
		next
	}
	NF >= 5 {
		emit()
		action = \$1
		target = \$2
		priority = \$3
		allowed = \$4
		reason = \$5
		for (i = 6; i <= NF; i++) {
			reason = reason " " \$i
		}
		have = 1
		next
	}
	NF == 1 && \$1 != "" && have {
		reason = reason " " \$1
		next
	}
	END { emit() }
' "$run_dir/control-decisions.tsv" > "$run_dir/control-decisions.tsv.normalized"
mv "$run_dir/control-decisions.tsv.normalized" "$run_dir/control-decisions.tsv"
cp "$run_dir/control-decisions.tsv" "$DECISIONS"
ln -sfn "$run_dir" "$BASE/latest-persona-run"
EOF
	chmod +x "$synthesis_runner"
	tmux new-session -d -s "rtc-pr-progress-synthesis-$ts" "bash '$synthesis_runner'"
	log "launched persona controller round $ts"
	json_event persona "launched persona controller round $ts"
}

launch_pr07c_owner_matrix_job() {
	local ts run_dir prompt report stderr classification runner latest_report owner_matrix active_jobs target_head
	if pr07c_owner_matrix_consumed; then
		log "not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence"
		return 0
	fi
	if job_active pr07c-owner-matrix; then
		log "not launching PR07C owner matrix: job already active"
		return 0
	fi
	active_jobs=$(active_pr_jobs)
	if [ "$active_jobs" -ge "$MAX_ACTIVE_PR_JOBS" ]; then
		log "not launching PR07C owner matrix: active PR jobs $active_jobs >= max $MAX_ACTIVE_PR_JOBS"
		return 0
	fi
	discovery_protected && {
		log "not launching PR07C owner matrix: discovery reserve protected"
		return 0
	}
	decision_allows launch-owner-matrix pr07c-owner-matrix || {
		log "not launching PR07C owner matrix: persona decisions blocked it"
		return 0
	}
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run_dir="$BASE/jobs/pr07c-owner-matrix-$ts"
	mkdir -p "$run_dir"
	prompt="$run_dir/prompt.md"
	report="$run_dir/report.md"
	classification="$run_dir/classification.tsv"
	stderr="$run_dir/stderr.log"
	runner="$run_dir/run.sh"
	latest_report=$(latest_pr07c_owner_report || true)
	owner_matrix=$(latest_owner_matrix || true)
	target_head=$(latest_pr07c_exact_green_head || true)
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC PR progress controller.
Do not use API subagents. Work in this one Codex process.

Goal: turn PR07C/HOLD-07C from runtime-gated evidence into a product-PR
decision. Read:
- $CONTEXT
- $CRITICAL_BASE/current-critical-path-status.md
- $PR_SPLIT_BASE/current-pr-split.md
- latest PR07C owner replay report: ${latest_report:-missing}
- latest owner matrix: ${owner_matrix:-missing}
- required repaired exact-stack head: ${target_head:-unknown}

Required outputs:
- report: $report
- classification TSV: $classification

classification.tsv header:
item_id	classification	evidence	next_action	artifact_path

Allowed classifications:
- promote_product_pr: only if distinct product ownership is proven and a branch
  should be promoted/published.
- keep_runtime_held: if evidence is real but not enough to make a maintainer PR.
- downscope_or_merge: if PR07B/PR07C already covers it or it is not distinct.
- needs_exact_replay: if a concrete bounded replay command is still needed.

You may run focused commands and bounded replay/classification checks, but do
not run broad fuzzing and do not stop discovery fuzzers. If the current
evidence would otherwise classify as needs_exact_replay and the replay is
bounded to a small seed list or exact branch/head, run that replay inside this
job and classify the replay result. Do not hand back needs_exact_replay
unless the exact replay cannot be started because of a concrete environment
failure that is recorded in the report. If required repaired exact-stack head
is not unknown, stale owner evidence that does not mention that head cannot
clear PR07C; run or request evidence for that exact head instead. If a branch
should be published, write
$run_dir/push-manifest.tsv with columns:
source_branch	source_commit	intended_danluu_branch	base_ref	files_changed	insertions	deletions	validation_summary	reason
PROMPT
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$SRC"
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr" || true
if [ ! -s "$classification" ]; then
	printf 'item_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
	printf 'pr07c-owner-matrix\\tneeds_exact_replay\\tmissing classification from controller job\\treview report/stderr and rerun bounded owner matrix\\t%s\\n' "$report" >> "$classification"
fi
EOF
	chmod +x "$runner"
	tmux new-session -d -s "rtc-pr-progress-job-pr07c-owner-matrix-$ts" "bash '$runner'"
	log "launched PR07C owner matrix job $ts"
	json_event launch "pr07c owner matrix $ts"
}

next_allowed_branch_repair() {
	local target
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' 'NR > 1 && ($1 == "launch-branch-repair" || $1 == "repair-branch" || $1 == "repair-ready") && tolower($4) ~ /^(yes|true|allow|allowed|1)$/ { print $2 }' "$DECISIONS" |
	while IFS= read -r target; do
		[ -n "$target" ] || continue
		awk -F '\t' -v target="$target" '
			NR > 1 && $5 == "needs-repair" && $6 == target {
				print $6 "\t" $7 "\t" $9
				found = 1
				exit
			}
			END { exit found ? 0 : 1 }
		' "$PROGRESS" && return 0
	done
	return 1
}

write_manifest_only_branch_repair() {
	local branch=$1 head=$2 evidence=$3 run_dir=$4 base files insertions deletions dest report classification manifest
	base=$(inferred_repair_base "$branch" || true)
	[ -n "${base:-}" ] || return 1
	git -C "$SRC" rev-parse --verify --quiet "$branch" >/dev/null || return 1
	git -C "$SRC" rev-parse --verify --quiet "$base" >/dev/null || return 1
	git -C "$SRC" merge-base --is-ancestor "$base" "$branch" || return 1
	files=$(git -C "$SRC" diff --name-only "$base..$branch" | wc -l | tr -d ' ')
	insertions=$(git -C "$SRC" diff --numstat "$base..$branch" | awk '{ s += $1 } END { print s + 0 }')
	deletions=$(git -C "$SRC" diff --numstat "$base..$branch" | awk '{ s += $2 } END { print s + 0 }')
	[ "$files" -gt 0 ] || return 1
	[ "$files" -le 20 ] || return 1
	[ $(( insertions + deletions )) -le 3000 ] || return 1
	dest=$(safe_destination_for_branch "$branch")
	report="$run_dir/report.md"
	classification="$run_dir/classification.tsv"
	manifest="$run_dir/push-manifest.tsv"
	{
		echo "# Branch Repair"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- branch: $branch"
		echo "- head: $(git -C "$SRC" rev-parse --short=12 "$branch")"
		echo "- repaired_base: $base"
		echo "- files: $files"
		echo "- insertions: $insertions"
		echo "- deletions: $deletions"
		echo "- mode: manifest-only base repair"
		echo
		echo "The earlier product-candidate diff check failed because the validation"
		echo "used an over-broad base. The inferred dependency base is an ancestor and"
		echo "the repaired diff is narrow, so this job emits a push manifest without"
		echo "rewriting the branch."
		echo
		echo "## Evidence"
		echo
		echo "- original validation report: $evidence"
		echo
		echo "## Diffstat"
		git -C "$SRC" diff --stat "$base..$branch" | sed -n '1,80p'
	} > "$report"
	{
		printf 'item_id\tclassification\tevidence\tnext_action\tartifact_path\n'
		printf '%s\tmanifest_repaired\t%s\tpublish from local machine and continue fuzz validation\t%s\n' "$branch" "$evidence" "$manifest"
	} > "$classification"
	{
		printf 'source_branch\tsource_commit\tintended_danluu_branch\tbase_ref\tfiles_changed\tinsertions\tdeletions\tvalidation_summary\treason\n'
		printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
			"$branch" "$(git -C "$SRC" rev-parse --short=12 "$branch")" "$dest" "$base" "$files" "$insertions" "$deletions" \
			"controller branch-repair base check passed" "$report"
	} > "$manifest"
	return 0
}

launch_branch_repair_job() {
	local row branch head evidence ts slug run_dir prompt report stderr classification runner active_jobs
	branch_repair_active && {
		log "not launching branch repair: branch repair job already active"
		return 0
	}
	row=$(next_allowed_branch_repair || true)
	[ -n "$row" ] || return 0
	branch=$(printf '%s' "$row" | cut -f1)
	head=$(printf '%s' "$row" | cut -f2)
	evidence=$(printf '%s' "$row" | cut -f3-)
	[ -n "$branch" ] || return 0
	if branch_published "$branch" "$head"; then
		log "not launching branch repair for $branch: already published"
		return 0
	fi
	if branch_repair_manifest_exists "$branch" "$head"; then
		log "not launching branch repair for $branch: repair manifest already exists"
		return 0
	fi
	active_jobs=$(active_pr_jobs)
	if [ "$active_jobs" -ge "$MAX_ACTIVE_PR_JOBS" ]; then
		log "not launching branch repair for $branch: active PR jobs $active_jobs >= max $MAX_ACTIVE_PR_JOBS"
		return 0
	fi
	if branch_repair_blocked_by_controller "$branch"; then
		log "not launching branch repair for $branch: persona decisions blocked it"
		return 0
	fi
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	slug=$(slugify "$branch")
	run_dir="$BASE/jobs/branch-repair-$slug-$ts"
	mkdir -p "$run_dir"
	if write_manifest_only_branch_repair "$branch" "$head" "$evidence" "$run_dir"; then
		log "wrote manifest-only branch repair for $branch at $run_dir"
		json_event launch "branch repair manifest-only $branch $ts"
		return 0
	fi
	prompt="$run_dir/prompt.md"
	report="$run_dir/report.md"
	classification="$run_dir/classification.tsv"
	stderr="$run_dir/stderr.log"
	runner="$run_dir/run.sh"
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC PR progress controller.
Do not use API subagents. Work in this one Codex process.

Goal: repair a product PR branch that failed critical-path diff/base validation.

Branch: $branch
Head: $head
Original validation report: $evidence
Repo: $SRC

Required outputs:
- report: $report
- classification TSV: $classification

classification.tsv header:
item_id	classification	evidence	next_action	artifact_path

Allowed classifications:
- manifest_repaired: if the branch is already correct but needs a narrower
  dependency base in a push manifest.
- branch_repaired: if you create a new non-destructive ready/* branch that is
  smaller and cleaner.
- still_blocked: if more work is required.

If a branch should be published, write $run_dir/push-manifest.tsv with columns:
source_branch	source_commit	intended_danluu_branch	base_ref	files_changed	insertions	deletions	validation_summary	reason

Keep this bounded. Prefer git ancestry/range-diff/diffstat checks and small
manifest/base repairs. Do not run broad fuzzing. Do not stop discovery fuzzers.
PROMPT
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$SRC"
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr" || true
if [ ! -s "$classification" ]; then
	printf 'item_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
	printf '%s\\tstill_blocked\\tmissing classification from branch repair job\\treview report/stderr\\t%s\\n' "$branch" "$report" >> "$classification"
fi
EOF
	chmod +x "$runner"
	tmux new-session -d -s "rtc-pr-progress-job-branch-repair-$slug-$ts" "bash '$runner'"
	log "launched branch repair job for $branch at $ts"
	json_event launch "branch repair $branch $ts"
}

write_status() {
	local tmp=$STATUS.$$.tmp
	normalize_reserve_decision_file "$DECISIONS"
	{
		echo "# RTC PR Progress Controller"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- max active PR jobs: $MAX_ACTIVE_PR_JOBS"
		echo "- active PR jobs: $(active_pr_jobs)"
		echo "- active discovery sessions: $(discovery_active_sessions)"
		echo "- min discovery sessions: $MIN_DISCOVERY_SESSIONS"
		echo "- discovery protected: $(discovery_protected && printf yes || printf no)"
		echo "- resource reason: $(resource_reason)"
		echo "- latest persona run: $(readlink -f "$BASE/latest-persona-run" 2>/dev/null || true)"
		echo
		echo "## Current Decisions"
		column -t -s $'\t' "$DECISIONS" 2>/dev/null || sed -n '1,120p' "$DECISIONS" 2>/dev/null || true
		echo
			echo "## Progress Table"
			{ column -t -s $'\t' "$PROGRESS" 2>/dev/null || cat "$PROGRESS" 2>/dev/null || true; } | sed -n '1,140p'
			echo
			echo "## Branch Links"
			awk -F '\t' '
				NR > 1 && $6 ~ /^(ready|finalized|fresh-prset|cycle|ready-pr03b)\// {
					printf "- %s: [%s](https://github.com/danluu/gutenberg/tree/%s) status=%s head=%s\n", $2, $6, $6, $5, $7
				}
			' "$PROGRESS" 2>/dev/null | sed -n '1,120p'
			echo
			echo "## Controller Push Manifest"
			sed -n '1,160p' "$PUSH_MANIFEST" 2>/dev/null || true
		echo
		echo "## Active Sessions"
		tmux_sessions | rg 'pr-progress|pr-split|critical-path|deferred|coverage|focused|strict|fuzz|protocol|lower-level|native' || true
		echo
		echo "## Recent Log"
		tail -100 "$LOG" 2>/dev/null || true
	} > "$tmp"
	mv "$tmp" "$STATUS"
}

run_once() {
	local cycle
	cycle=$(increment_cycle_count)
	write_progress_table
	write_controller_push_manifest
	collect_context
	refresh_benchmark_canary_decisions
	if [ "$PERSONA_EVERY_CYCLES" -gt 0 ] && [ $(( cycle % PERSONA_EVERY_CYCLES )) -eq 0 ]; then
		launch_persona_round
	fi
	launch_branch_repair_job
	if pr07c_owner_matrix_needed; then
		launch_pr07c_owner_matrix_job
	fi
	write_controller_push_manifest
	collect_context
	refresh_benchmark_canary_decisions
	write_status
}

run_loop() {
	exec 9>"$LOCK"
	if ! flock -n 9; then
		log "another PR progress controller already holds $LOCK"
		exit 0
	fi
	printf '%s\n' "$$" > "$PID_FILE"
	trap 'rm -f "$PID_FILE"' EXIT
	log "PR progress controller started pid=$$"
	while true; do
		run_once || log "controller run_once failed rc=$?"
		sleep "$CYCLE_SLEEP_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			echo "$SESSION already running"
		else
			tmux new-session -d -s "$SESSION" "$0 run"
			echo "$SESSION started"
		fi
		;;
	run)
		run_loop
		;;
	manifest-once)
		write_controller_push_manifest
		;;
	progress-once)
		write_progress_table
		write_status
		;;
	run-once)
		run_once
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		if [ -f "$PID_FILE" ]; then
			pid=$(cat "$PID_FILE" 2>/dev/null || true)
			if [ -n "$pid" ]; then
				pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)
				if [ -n "$pgid" ]; then
					kill -TERM -- "-$pgid" 2>/dev/null || true
					sleep 1
					kill -KILL -- "-$pgid" 2>/dev/null || true
				else
					kill "$pid" 2>/dev/null || true
				fi
			fi
		fi
		if command -v fuser >/dev/null 2>&1; then
			fuser -k "$LOCK" >/dev/null 2>&1 || true
		fi
		rm -f "$PID_FILE"
		echo "$SESSION stopped"
		;;
	status)
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			echo "$SESSION running"
		else
			echo "$SESSION not running"
		fi
		sed -n '1,220p' "$STATUS" 2>/dev/null || true
		;;
	*)
		echo "usage: $0 {start|run|run-once|stop|status}" >&2
		exit 2
		;;
esac
