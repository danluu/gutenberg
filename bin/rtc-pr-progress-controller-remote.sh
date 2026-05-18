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
FINALIZATION_BASE=${RTC_PR_PROGRESS_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}
COVERAGE_BASE=${RTC_PR_PROGRESS_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
RESOURCE_BASE=${RTC_PR_PROGRESS_RESOURCE_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
ARTIFACT_INDEX_BASE=${RTC_PR_PROGRESS_ARTIFACT_INDEX_BASE:-/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518}
ARTIFACT_INDEX_ARTIFACTS=$ARTIFACT_INDEX_BASE/current-artifacts.tsv

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
CODEX_MODEL=${RTC_PR_PROGRESS_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_PR_PROGRESS_CODEX_REASONING_EFFORT:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_PR_PROGRESS_CODEX_TIMEOUT_SECONDS:-5400}
PERSONA_TIMEOUT_SECONDS=${RTC_PR_PROGRESS_PERSONA_TIMEOUT_SECONDS:-3600}

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

latest_file() {
	local root=$1 pattern=$2
	find "$root" -path "$pattern" -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

file_mtime() {
	stat -c %Y "$1" 2>/dev/null || printf '0'
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
	done < <(find "$BASE/jobs" -path '*/branch-repair-*/push-manifest.tsv' -type f -size +0c -print 2>/dev/null)
	return 1
}

latest_pr07c_controller_classification() {
	latest_file "$BASE/jobs" '*/pr07c-owner-matrix-*/classification.tsv'
}

pr07c_owner_matrix_consumed() {
	local classification latest_report owner_matrix class_mtime report_mtime matrix_mtime
	classification=$(latest_pr07c_controller_classification || true)
	[ -n "$classification" ] || return 1
	if grep -q $'\tpromote_product_pr\t' "$classification" 2>/dev/null; then
		return 1
	fi
	latest_report=$(latest_pr07c_owner_report || true)
	owner_matrix=$(latest_owner_matrix || true)
	class_mtime=$(file_mtime "$classification")
	report_mtime=0
	matrix_mtime=0
	[ -n "${latest_report:-}" ] && report_mtime=$(file_mtime "$latest_report")
	[ -n "${owner_matrix:-}" ] && matrix_mtime=$(file_mtime "$owner_matrix")
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

decision_allows() {
	local action=$1 target=${2:-}
	[ -s "$DECISIONS" ] || return 0
	awk -F '\t' -v action="$action" -v target="$target" '
		NR == 1 { next }
		$1 == action && ( target == "" || $2 == target || $2 == "*" ) {
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
	local action=$1 target=${2:-}
	[ -s "$DECISIONS" ] || return 1
	awk -F '\t' -v action="$action" -v target="$target" '
		NR == 1 { next }
		$1 == action && ( target == "" || $2 == target || $2 == "*" ) && tolower($4) ~ /^(no|false|block|blocked|0)$/ {
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
	local branch=$1
	[ -s "$DECISIONS" ] || return 0
	case "$branch" in
		ready/rtc-pr15*)
			pr15_next_child_allowed_by_controller "$branch" && return 0
			return 1
			;;
	esac
	decision_explicitly_allows publish-ready "$branch" && return 0
	pr15_next_child_allowed_by_controller "$branch" && return 0
	return 1
}

publish_blocked_by_controller() {
	local branch=$1
	decision_blocks publish-ready "$branch" && return 0
	decision_blocks hold-publication "$branch" && return 0
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
	find "$PR_SPLIT_BASE/runs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null |
		sort |
		tail -30 |
		while IFS= read -r run_dir; do
			find "$run_dir/jobs/outputs" -maxdepth 3 -path '*pr07c*owner*replay*/report.md' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null || true
		done |
		sort -n |
		tail -1 |
		cut -f2-
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

latest_owner_matrix() {
	local indexed
	if artifact_index_fresh; then
		indexed=$(latest_indexed_artifact owner_matrix 'owner-matrix[.]tsv$' || true)
		if [ -n "$indexed" ]; then
			printf '%s\n' "$indexed"
			return 0
		fi
	fi
	find "$PR_SPLIT_BASE/runs" -path '*/owner-matrix.tsv' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

pr07c_owner_matrix_needed() {
	grep -q $'^pr07c-owner-matrix\t' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null
}

write_progress_table() {
	local tmp=$PROGRESS.$$.tmp now source class branch base head allowed reason report pr07c_report
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
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
				case "$class:$allowed:$reason" in
					product-candidate:1:*)
						if branch_published "$branch" "$head"; then
							printf '%s\t%s\tready-product-pr\thigh\tpublished\t%s\t%s\talready published by local machine; keep validating against fuzz\t%s\n' "$now" "$source" "$branch" "$head" "$report"
						elif publish_blocked_by_controller "$branch" || ! publish_allowed_by_controller "$branch"; then
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
				printf '%s\tpr07c-owner-matrix\truntime-gated-pr\thigh\truntime-held-consumed\tPR07C/HOLD-07C\t\tdo not relaunch owner matrix until newer owner evidence appears; repair setup or run exact replay instead\t%s\n' "$now" "${pr07c_report:-missing}"
			else
				printf '%s\tpr07c-owner-matrix\truntime-gated-pr\thigh\towner-evidence-needed\tPR07C/HOLD-07C\t\tconsume owner matrix; promote only with product ownership proof\t%s\n' "$now" "${pr07c_report:-missing}"
			fi
		fi
		if [ -s "$DEFERRED_BASE/current-deferred-status.md" ]; then
			awk -v now="$now" '
				/^reload-hydration[[:space:]]/ { print now "\treload-hydration\tdeferred-family\thigh\tneeds-product-decision\treload-hydration\t\tpromote product fix, produce owner evidence, or downscope\t" $0 }
				/^rich-text-suffix-corruption[[:space:]].*duplicate_head=cooldown/ { print now "\trich-text-suffix-corruption\tdeferred-family\tlow\tcooldown\trich-text-suffix-corruption\t\trequire fresh evidence before relaunch\t" $0 }
				/^pre-save-search-live-collapse[[:space:]]/ { print now "\tpre-save-search-live-collapse\tdeferred-family\tmedium\tdiagnostic\ttsearch-live-collapse\t\tpromote only with owner evidence\t" $0 }
			' "$DEFERRED_BASE/current-deferred-status.md" 2>/dev/null || true
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
				publish_blocked_by_controller "$branch" && continue
				publish_allowed_by_controller "$branch" || continue
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
		find "$BASE/jobs" -path '*/branch-repair-*/push-manifest.tsv' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
			sort -n |
			tail -40 |
			cut -f2- |
			while IFS= read -r manifest; do
				awk -F '\t' 'NR > 1 && NF >= 9 { print }' "$manifest"
			done |
			awk -F '\t' '!seen[$1 "\t" $2]++' |
			while IFS= read -r row; do
				branch=$(printf '%s' "$row" | cut -f1)
				head=$(printf '%s' "$row" | cut -f2)
				branch_published "$branch" "$head" && continue
				printf '%s\n' "$row"
			done
	} > "$tmp"
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
		sed -n '1,180p' "$DEFERRED_BASE/current-deferred-status.md" 2>/dev/null || true
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
PR07C owner matrix now that readiness is resolved, repair concrete failed PR
branches, cool down duplicate diagnostics, or downscope low-value families.
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
	printf 'publish-ready\\t*\\thigh\\tyes\\tfallback: keep ready product PRs moving\\n' >> "$run_dir/control-decisions.tsv"
	printf 'launch-owner-matrix\\tpr07c-owner-matrix\\thigh\\tyes\\tfallback: readiness is resolved; need owner evidence\\n' >> "$run_dir/control-decisions.tsv"
	printf 'reserve-discovery\\t*\\thigh\\tyes\\tfallback: preserve active fuzzing reserve\\n' >> "$run_dir/control-decisions.tsv"
fi
cp "$run_dir/control-decisions.tsv" "$DECISIONS"
ln -sfn "$run_dir" "$BASE/latest-persona-run"
EOF
	chmod +x "$synthesis_runner"
	tmux new-session -d -s "rtc-pr-progress-synthesis-$ts" "bash '$synthesis_runner'"
	log "launched persona controller round $ts"
	json_event persona "launched persona controller round $ts"
}

launch_pr07c_owner_matrix_job() {
	local ts run_dir prompt report stderr classification runner latest_report owner_matrix active_jobs
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
not run broad fuzzing and do not stop discovery fuzzers. If a branch should be
published, write $run_dir/push-manifest.tsv with columns:
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
	if [ "$PERSONA_EVERY_CYCLES" -gt 0 ] && [ $(( cycle % PERSONA_EVERY_CYCLES )) -eq 0 ]; then
		launch_persona_round
	fi
	launch_branch_repair_job
	if pr07c_owner_matrix_needed; then
		launch_pr07c_owner_matrix_job
	fi
	write_controller_push_manifest
	collect_context
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
	run-once)
		run_once
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		[ -f "$PID_FILE" ] && kill "$(cat "$PID_FILE")" 2>/dev/null || true
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
