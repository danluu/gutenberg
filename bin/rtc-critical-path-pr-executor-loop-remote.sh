#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
LOCAL_PUBLISH_MANIFEST=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515

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
EVENTS=$BASE/events.ndjson
TERMINAL_LEDGER=$BASE/terminal-ledger.tsv
ACTIVE_SPLIT_FILE=$PR_SPLIT_BASE/current-pr-split.md
LAUNCHES=$BASE/logs/launches.tsv
LOG=$BASE/logs/critical-path-pr-executor.log
LOCK_FILE=$BASE/critical-path-pr-executor.lock
PID_FILE=$BASE/critical-path-pr-executor.pid

CYCLE_SLEEP_SECONDS=${RTC_CRITICAL_PR_EXECUTOR_CYCLE_SLEEP_SECONDS:-60}
MAX_ACTIVE_CONTINUATIONS=${RTC_CRITICAL_PR_EXECUTOR_MAX_ACTIVE_CONTINUATIONS:-2}
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

mkdir -p "$BASE/logs" "$BASE/runs" "$BASE/worktrees" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"
touch "$EVENTS" "$LAUNCHES"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
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
	find "$root" -type f -name "$pattern" -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

resource_reason() {
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local reason
	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	printf '%s' "${reason:-unknown}"
}

allow_heavy_work() {
	case "$(resource_reason)" in
		severe_pressure|high_pressure|pressure|unknown)
			return 1
			;;
		*)
			return 0
			;;
	esac
}

allow_critical_browser_preflight() {
	[ "$ENABLE_BROWSER_PREFLIGHT" = 1 ] || return 1
	case "$(resource_reason)" in
		severe_pressure|unknown)
			return 1
			;;
		*)
			return 0
			;;
	esac
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
	find "$BASE/runs" -path '*/continuations/pr17-1020002/classification.tsv' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

pr17_terminal_downscoped() {
	local classification class
	classification=$(latest_pr17_classification || true)
	[ -n "$classification" ] || return 1
	class=$(awk -F '\t' 'NR > 1 && $1 == "pr17-1020002" { print $2; exit }' "$classification" 2>/dev/null)
	[ "$class" = "reclassify_downscope_not_product_owned" ]
}

fresh_pr17_product_evidence_after_terminal() {
	local classification file
	classification=$(latest_pr17_classification || true)
	[ -n "$classification" ] || return 1
	timeout --kill-after=5s "$FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS" \
		find "$BASE/runs" "$PR_SPLIT_BASE/runs" -maxdepth 6 -type f \
			\( -name 'classification.tsv' -o -name 'report.md' -o -name 'validation-head.tsv' -o -name 'validation-checks.tsv' \) \
			-size +0c -newer "$classification" -print 2>/dev/null |
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
	find "$BASE/runs" -path "*/continuations/${lane}/classification.tsv" -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
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

active_session_matching() {
	local pattern=$1
	tmux_sessions | rg -i "$pattern" | sed -n '1p'
}

active_count_matching() {
	local pattern=$1
	tmux_sessions | awk -v pat="$pattern" 'tolower($0) ~ tolower(pat) { count++ } END { print count + 0 }'
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
	local tmp=$INPUTS.tmp
	local latest_finalization latest_progress_unblock latest_deferred_report latest_coverage
	latest_finalization=$(latest_nonempty_file "$FINALIZATION_BASE/cycles" 'finalization.report.md' || true)
	latest_progress_unblock=$(find "$PR_SPLIT_BASE/runs" -type f -path '*/jobs/*progress-unblock*/*' -size +0c -printf '%T@\t%p\n' 2>/dev/null | sort -n | tail -1 | cut -f2- || true)
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
coverage_pointer	status	$COVERAGE_BASE/current-output-dir.txt
resource_status	status	$RESOURCE_BASE/resource-autoscaler-status.md
guard_log	log	$GUARD_BASE/logs/guard.log
latest_finalization	report	${latest_finalization:-missing}
latest_progress_unblock	artifact	${latest_progress_unblock:-missing}
latest_deferred_report	report	${latest_deferred_report:-missing}
latest_coverage_status	status	${latest_coverage:-missing}/novelty-status.md
latest_local_publish_manifest	publication	$LOCAL_PUBLISH_MANIFEST
EOF
	} > "$tmp"
	atomic_move "$tmp" "$INPUTS"
}

write_no_progress() {
	local tmp=$NO_PROGRESS.tmp
	local rejected_at file
	rejected_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	{
		printf 'artifact_path\treason\tsize\tmtime\tassociated_job\trejected_at\n'
		awk -F '\t' 'NR > 1 && $8 == "zero" { print $3 "\tzero_current_input\t" $5 "\t" $6 "\t" $1 }' "$INPUTS" 2>/dev/null |
			while IFS=$'\t' read -r file reason size mtime job; do
				printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$file" "$reason" "$size" "$mtime" "$job" "$rejected_at"
			done
		find "$BASE/runs" -maxdepth 7 \
			-type f \( -name '*.md' -o -name '*.tsv' -o -name '*.tmp' \) -size 0c -print 2>/dev/null |
			head -100 |
			while IFS= read -r file; do
				printf '%s\tzero_executor_artifact\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
			done
			find "$BASE/runs" -maxdepth 7 -type f -name '*.tmp' -print 2>/dev/null |
				head -100 |
				while IFS= read -r file; do
					printf '%s\ttmp_executor_artifact\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
				done
			find "$BASE/runs" -maxdepth 7 -type f -name 'report.md' -size +0c -print 2>/dev/null |
				while IFS= read -r file; do
					if rg -qi 'disk[- ]preflight[- ]only|pre[- ]oracle|before oracle|runtime.*failed before|report\.tmp|header[- ]only' "$file" 2>/dev/null; then
						printf '%s\tpre_oracle_or_preflight_only\t%s\t%s\tunknown\t%s\n' "$file" "$(file_size "$file")" "$(file_mtime "$file")" "$rejected_at"
					fi
				done
	} > "$tmp"
	atomic_move "$tmp" "$NO_PROGRESS"
}

write_terminal_ledger() {
	local tmp=$TERMINAL_LEDGER.tmp lane classification class
	{
		printf 'lane_id\tclassification\tevidence_path\tevidence_mtime\tqueue_state\treopen_condition\n'
		for lane in pr17-1020002 seed-5200005-reducer seed-1060015-reducer; do
			classification=$(latest_lane_classification "$lane" || true)
			[ -n "$classification" ] || continue
			class=$(lane_classification_value "$lane" || true)
			case "$lane:$class" in
				pr17-1020002:reclassify_downscope_not_product_owned)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh rebuilt product evidence for seed 1020002 newer than terminal classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				seed-5200005-reducer:resolved_by_active_artifacts)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh source/replay evidence newer than active artifact resolution\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
				seed-1060015-reducer:resolved_by_active_artifact_downscoped)
					printf '%s\t%s\t%s\t%s\tterminal\tfresh browser/source red evidence newer than downscope classification\n' "$lane" "$class" "$classification" "$(file_mtime "$classification")"
					;;
			esac
		done
	} > "$tmp"
	atomic_move "$tmp" "$TERMINAL_LEDGER"
}

write_lanes() {
	local tmp=$LANES.tmp branch base_ref base_sha head_sha lane_id pr_id publication_class state output_dir
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
		base_ref=$(resolve_base_ref)
		base_sha=$(git -C "$SRC" rev-parse --short=12 "$base_ref" 2>/dev/null || true)
		if ! lane_terminal_suppressed pr17-1020002; then
			printf 'pr17-1020002\tPR17\tproof-reclassification\tvalidation-only\t%s\t1020002\t%s\t%s\t\tcodex-analysis\tnone\tqueued\t%s/runs/pr17-1020002\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		printf 'pr07c-browser-env\tPR07C\tbrowser-env-repair\tvalidation-only\t%s\tPR07C\t%s\t%s\t\tbrowser-e2e\tresource-and-env\tgated\t%s/runs/pr07c-browser-env\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		if ! lane_terminal_suppressed seed-5200005-reducer; then
			printf 'seed-5200005-reducer\tPR05?\treducer\tvalidation-only\t%s\t5200005\t%s\t%s\t\tcodex-analysis\tnone\tadopt-or-queue\t%s/runs/5200005-reducer\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
		if ! lane_terminal_suppressed seed-1060015-reducer; then
			printf 'seed-1060015-reducer\tPR05?\treducer\tvalidation-only\t%s\t1060015\t%s\t%s\t\tcodex-analysis\tnone\tadopt-or-queue\t%s/runs/1060015-reducer\n' "$SRC" "$base_ref" "$base_sha" "$BASE"
		fi
	} > "$tmp"
	atomic_move "$tmp" "$LANES"
}

write_blockers_and_queue() {
	local blockers_tmp=$BLOCKERS.tmp queue_tmp=$QUEUE.tmp now pr17_active s5200005 s1060015 reload_active reason
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	pr17_active=$(active_session_matching '1020002|pr17' || true)
	s5200005=$(active_session_matching '5200005' || true)
	s1060015=$(active_session_matching '1060015' || true)
	reload_active=$(active_session_matching 'reload|hydration' || true)
	reason=$(resource_reason)
	{
		printf 'blocker_id\tkind\tpriority\tstate\tsource_input\tblocks\tblocked_by\trequired_artifacts\tactive_session\tnext_action\tupdated_at\n'
		if pr17_suppressed_terminal; then
			printf 'pr17-1020002\tfinal-stack-join\thigh\tterminal\tpr_split/finalization\tfinal-stack-validation,filing\tterminal-ledger\tclassification.tsv\t\tterminal downscope; reopen only with fresh product evidence newer than classification.tsv\t%s\n' "$now"
		else
			printf 'pr17-1020002\tfinal-stack-join\thigh\t%s\tpr_split/finalization\tfinal-stack-validation,filing\t%s\tclassification.tsv,report.md\t%s\tproof-or-reclassify PR17 seed 1020002\t%s\n' \
				"$([ -n "$pr17_active" ] && printf active || printf runnable)" \
				"$([ -n "$pr17_active" ] && printf active-job || printf none)" \
				"${pr17_active:-}" "$now"
		fi
		printf 'pr07c-browser-env\tbrowser-environment\thigh\t%s\tpr_split/finalization\tPR07C replay,7510029\t%s\tvalidation.tsv,report.md,classification.tsv,repair-branch.txt\t\trepair collaboration readiness so PR07C replay reaches seeded action/reload/checkpoint phase; runtime-readiness-blocked is not terminal\t%s\n' \
			"$(allow_critical_browser_preflight && printf runnable || printf gated)" \
			"$(allow_critical_browser_preflight && printf none || printf "resource_or_env:$reason")" "$now"
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
		printf 'reload-hydration\tdeferred-family\thigh\t%s\tdeferred_status\tdeferred PR candidate\t%s\tclassification.tsv,report.md\t%s\tadopt deferred promotion; do not relaunch by interval alone\t%s\n' \
			"$([ -n "$reload_active" ] && printf active || printf queued)" \
			"$([ -n "$reload_active" ] && printf active-job || printf deferred-loop)" \
			"${reload_active:-}" "$now"
	} > "$blockers_tmp"
	{
		printf 'job_id\tlane_id\tblocker_id\taction_kind\tdedupe_key\tresource_class\tpriority\tstate\tattempt\tsession\tworktree\toutput_dir\tcreated_at\tstarted_at\tupdated_at\texit_code\tresult\n'
		if ! lane_terminal_suppressed pr17-1020002; then
			printf 'job-pr17-1020002\tpr17-1020002\tpr17-1020002\tproof-reclassify\tpr17-1020002-proof\tcodex-analysis\thigh\t%s\t0\t%s\t\t%s/runs/pr17-1020002\t%s\t\t%s\t\t%s\n' \
				"$([ -n "$pr17_active" ] && printf active || printf runnable)" "${pr17_active:-}" "$BASE" "$now" "$now" "$([ -n "$pr17_active" ] && printf adopted || printf pending)"
		fi
		printf 'job-pr07c-browser-env\tpr07c-browser-env\tpr07c-browser-env\tbrowser-env-repair\tpr07c-browser-env\tbrowser-e2e\thigh\t%s\t0\t\t\t%s/runs/pr07c-browser-env\t%s\t\t%s\t\t%s\n' \
			"$(allow_critical_browser_preflight && printf runnable || printf gated)" "$BASE" "$now" "$now" "$(allow_critical_browser_preflight && printf repair_pending || printf resource_or_env_gated)"
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
	local tmp=$ACTIVE_JOBS.tmp
	{
		printf 'session\tclass\tstarted_hint\n'
		tmux_sessions |
			rg '^(rtc-critical-|rtc-pr-finalize-job-|rtc-deferred-job-|rtc-cycle|rtc-analysis-live-|rtc-prsplit-progress-unblock|rtc-fuzz-level-mix|rtc-coverage-guidance)' |
			while IFS= read -r session; do
				case "$session" in
					rtc-critical-validate-*) printf '%s\tcritical-validation\t\n' "$session" ;;
					rtc-critical-continuation-*) printf '%s\tcritical-continuation\t\n' "$session" ;;
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
	dedupe="validate-$lane_id-$head_sha-$(slugify "$base_ref" | cut -c1-32)"
	if task_recently_launched "$dedupe" "$MIN_TASK_INTERVAL_SECONDS"; then
		return
	fi
	session="rtc-critical-validate-$(slugify "$lane_id" | cut -c1-48)-$(date -u +%Y%m%dT%H%M%SZ)"
	if has_session "$session"; then
		return
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
	tmux new-session -d -s "$session" "bash '$runner' 2> '$log_file'"
}

write_continuation_prompt() {
	local prompt=$1 report=$2 classification=$3 lane=$4 goal=$5
	if [ "$lane" = "pr07c-browser-env" ]; then
		cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

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
6. If a fix is needed, create only a new non-destructive local branch in this worktree, for example repair/rtc-pr07c-collaboration-readiness-<timestamp>. Do not rewrite active fuzzing refs and do not push to GitHub from Jetstream.
7. Produce durable artifacts:
   - Write a concise report to $report.
   - Write ${report%/*}/validation.tsv with header: check, result, detail.
   - Write $classification with header: lane_id,classification,evidence,next_action,artifact_path.
   - Write ${report%/*}/repair-branch.txt containing the local branch name or NONE.
8. Classification rules:
   - Use repaired_ready only if a focused replay reaches the seeded action/reload/checkpoint phase, or if a minimal readiness probe proves window._wpCollaborationEnabled true and the remaining command to run owner replay is exact.
   - Use repair_branch_created if you created a local branch and validation proves the readiness injection issue is fixed.
   - Use repair_blocked only with a specific failing check and an exact next command/artifact path.
   - Do not use resolved_by_active_artifact_runtime_readiness_not_product for this lane; that is the old structural failure.

This job exists to make PR07C evidence runnable. Passive classification without repair evidence is a failure.
EOF
		return
	fi
	cat > "$prompt" <<EOF
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

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

launch_continuation_job() {
	local lane=$1 dedupe=$2 active_pattern=$3 goal=$4
	local active session ts run_dir worktree prompt report classification stderr rc runner slug
	active=$(active_session_matching "$active_pattern" || true)
	[ -z "$active" ] || return
	if task_recently_launched "$dedupe" "$MIN_TASK_INTERVAL_SECONDS"; then
		return
	fi
	if [ "$(active_count_matching '^rtc-critical-continuation-')" -ge "$MAX_ACTIVE_CONTINUATIONS" ]; then
		return
	fi
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	slug=$(slugify "$lane" | cut -c1-48)
	session="rtc-critical-continuation-$slug-$ts"
	run_dir="$BASE/runs/$ts/continuations/$slug"
	worktree="$BASE/worktrees/continuation-$slug-$ts"
	mkdir -p "$run_dir"
	if ! git -C "$SRC" worktree add --detach "$worktree" HEAD > "$run_dir/worktree.log" 2>&1; then
		log "failed to create continuation worktree for $lane; see $run_dir/worktree.log"
		return
	fi
	prompt="$run_dir/prompt.md"
	report="$run_dir/report.md"
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
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
code=\$?
set -e
if [ ! -s "$classification" ]; then
	printf 'lane_id\\tclassification\\tevidence\\tnext_action\\tartifact_path\\n' > "$classification"
	printf '%s\\tno_progress\\tmissing classification artifact\\treview stderr/report and rerun bounded continuation\\t%s\\n' "$lane" "$report" >> "$classification"
fi
printf '%s\\n' "\$code" > "$rc"
exit 0
EOF
	chmod +x "$runner"
	append_launch continuation "$session" "$dedupe" "$run_dir"
	json_event launch "continuation $lane session=$session"
	tmux new-session -d -s "$session" "bash '$runner'"
}

launch_continuation_jobs() {
	if ! lane_terminal_suppressed pr17-1020002; then
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
	if allow_critical_browser_preflight; then
		launch_continuation_job \
			"pr07c-browser-env" \
			"pr07c-browser-env-repair-v2" \
			"pr07c-browser-env|pr07c|browser-env" \
			"PR07C browser-environment repair: debug and fix collaboration readiness null so owner-proof replay can reach seeded action/reload/checkpoint phase. Reserve unique WP_ENV_PORT, WP_ENV_TESTS_PORT, and WP_ENV_PHPMYADMIN_PORT if running browser checks; write validation.tsv/report.md/classification.tsv and repair-branch.txt."
	fi
}

launch_validation_jobs() {
	local active branch lane_id base_ref publication_class head_sha
	active=$(active_count_matching '^rtc-critical-validate-')
	[ "$active" -lt "$MAX_ACTIVE_VALIDATIONS" ] || return
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

write_status() {
	local tmp=$STATUS.tmp
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
		echo
		echo "## Active Critical Jobs"
		tmux_sessions | rg '^rtc-critical-(validate|continuation)-' || true
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
		echo "## No-Progress Artifacts"
		sed -n '1,80p' "$NO_PROGRESS" 2>/dev/null || true
		echo
		echo "## Recent Launches"
		tail -80 "$LAUNCHES" 2>/dev/null || true
	} > "$tmp"
	atomic_move "$tmp" "$STATUS"
}

reconcile_once() {
	write_branch_export_headers
	write_inputs
	write_no_progress
	write_terminal_ledger
	write_lanes
	write_blockers_and_queue
	write_active_jobs
	write_status
	launch_validation_jobs
	launch_continuation_jobs
	write_status
}

run_loop() {
	local rc
	exec 9>"$LOCK_FILE"
	if ! flock -n 9; then
		log "another critical-path PR executor already holds $LOCK_FILE"
		exit 0
	fi
	printf '%s\n' "$$" > "$PID_FILE"
	trap 'rm -f "$PID_FILE"' EXIT
	log "critical-path PR executor loop started pid=$$"
	while true; do
		set +e
		timeout --kill-after=15s "$RECONCILE_TIMEOUT_SECONDS" "$0" reconcile-once >> "$LOG" 2>&1
		rc=$?
		set -e
		if [ "$rc" -ne 0 ]; then
			log "reconcile failed or timed out rc=$rc timeout=${RECONCILE_TIMEOUT_SECONDS}s"
		fi
		sleep "$CYCLE_SLEEP_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if has_session "$SESSION"; then
			echo "$SESSION already running"
		else
			tmux new-session -d -s "$SESSION" "$0 run"
			echo "$SESSION started"
		fi
		;;
	run)
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
