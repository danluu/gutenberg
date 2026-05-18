#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin

SRC=${RTC_ARTIFACT_INDEX_SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
BASE=${RTC_ARTIFACT_INDEX_BASE:-/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518}
CRITICAL_BASE=${RTC_ARTIFACT_INDEX_CRITICAL_BASE:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517}
PR_SPLIT_BASE=${RTC_ARTIFACT_INDEX_PR_SPLIT_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}
DEFERRED_BASE=${RTC_ARTIFACT_INDEX_DEFERRED_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}
FINALIZATION_BASE=${RTC_ARTIFACT_INDEX_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}
FRESH_BASE=${RTC_ARTIFACT_INDEX_FRESH_BASE:-/media/volume/danluu-fuzz-data/rtc-fresh-pr-split-from-scratch-20260517}
PROGRESS_BASE=${RTC_ARTIFACT_INDEX_PROGRESS_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518}

SESSION=rtc-artifact-index-loop
STATUS=$BASE/current-artifact-index-status.md
ARTIFACTS=$BASE/current-artifacts.tsv
PUSH_ROWS=$BASE/current-push-manifest-rows.tsv
CLASSIFICATIONS=$BASE/current-classifications.tsv
BRANCHES=$BASE/current-branches.tsv
RUNS=$BASE/current-runs.tsv
MANIFEST_PATHS=$BASE/current-manifest-paths.tsv
LOG=$BASE/logs/artifact-index.log
LOCK=$BASE/artifact-index.lock
PID_FILE=$BASE/artifact-index.pid

INDEX_INTERVAL_SECONDS=${RTC_ARTIFACT_INDEX_INTERVAL_SECONDS:-180}

mkdir -p "$BASE/logs" "$BASE/tmp" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"
touch "$LOG"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

artifact_roots() {
	printf 'critical\t%s\n' "$CRITICAL_BASE"
	printf 'pr_split\t%s\n' "$PR_SPLIT_BASE"
	printf 'deferred\t%s\n' "$DEFERRED_BASE"
	printf 'finalization\t%s\n' "$FINALIZATION_BASE"
	printf 'fresh_pr_split\t%s\n' "$FRESH_BASE"
	printf 'pr_progress\t%s\n' "$PROGRESS_BASE"
}

special_context_files() {
	printf 'critical\t%s/current-push-manifest.tsv\n' "$CRITICAL_BASE"
	printf 'critical\t%s/current-critical-path-status.md\n' "$CRITICAL_BASE"
	printf 'pr_progress\t%s/current-push-manifest.tsv\n' "$PROGRESS_BASE"
	printf 'pr_progress\t%s/current-pr-progress-controller-status.md\n' "$PROGRESS_BASE"
	printf 'pr_split\t%s/current-pr-split.md\n' "$PR_SPLIT_BASE"
	printf 'pr_split\t%s/latest-synthesis.md\n' "$PR_SPLIT_BASE"
	printf 'fresh_pr_split\t%s/latest-fresh-pr-set.md\n' "$FRESH_BASE"
	printf 'fresh_pr_split\t%s/latest-comparison.md\n' "$FRESH_BASE"
}

scan_key_artifacts() {
	local root_name root epoch path
	artifact_roots |
	while IFS=$'\t' read -r root_name root; do
		[ -d "$root" ] || continue
		find "$root" \
			\( -path '*/.git' -o -path '*/node_modules' -o -path '*/vendor' -o -path '*/worktrees' \) -prune -o \
			-type f -size +0c \
			\( -name 'current-push-manifest.tsv' \
				-o -name 'push-manifest.tsv' \
				-o -name 'classification.tsv' \
				-o -name 'replay-classification.tsv' \
				-o -name 'validation.tsv' \
				-o -name 'validation-head.tsv' \
				-o -name 'validation-checks.tsv' \
				-o -name 'owner-matrix.tsv' \
				-o -name 'branch-audit.tsv' \
				-o -name 'finalization.report.md' \
				-o -name 'report.md' \
				-o -name '*.report.md' \) \
			-printf "%T@\t$root_name\t%p\n" 2>/dev/null || true
	done
	special_context_files |
	while IFS=$'\t' read -r root_name path; do
		[ -s "$path" ] || continue
		epoch=$(stat -c %Y "$path" 2>/dev/null || printf '0')
		printf '%s\t%s\t%s\n' "$epoch" "$root_name" "$path"
	done
}

write_artifacts() {
	local tmp=$1
	{
		printf 'mtime_epoch\tmtime_utc\troot\tkind\trun_id\tpath\ttags\n'
		scan_key_artifacts |
			sort -n |
			awk -F '\t' '
				BEGIN { OFS = "\t" }
				function kind_for_path(path, base) {
					base = path
					sub(/^.*\//, "", base)
					if (base == "current-push-manifest.tsv" || base == "push-manifest.tsv") return "push_manifest"
					if (base == "classification.tsv" || base == "replay-classification.tsv") return "classification"
					if (base == "validation.tsv" || base == "validation-head.tsv" || base == "validation-checks.tsv") return "validation"
					if (base == "owner-matrix.tsv") return "owner_matrix"
					if (base == "branch-audit.tsv") return "branch_audit"
					if (base == "finalization.report.md") return "finalization_report"
					if (base == "report.md" || base ~ /\.report\.md$/) return "report"
					return "context"
				}
				function run_id_for_path(path, parts, count, i) {
					count = split(path, parts, "/")
					for (i = 1; i <= count; i++) {
						if ((parts[i] == "runs" || parts[i] == "cycles") && i < count) return parts[i + 1]
					}
					return ""
				}
				function tags_for_path(path, lower, tags) {
					lower = tolower(path)
					tags = ""
					if (lower ~ /pr07c/) tags = tags "pr07c,"
					if (lower ~ /owner/) tags = tags "owner,"
					if (lower ~ /reload|hydration/) tags = tags "reload,"
					if (lower ~ /duplicate|noise/) tags = tags "dup_noise,"
					if (lower ~ /rich-text|rich_text/) tags = tags "rich_text,"
					if (lower ~ /critical|finalization/) tags = tags "critical,"
					if (lower ~ /push-manifest/) tags = tags "publish,"
					sub(/,$/, "", tags)
					return tags
				}
				NF >= 3 {
					epoch = int($1)
					root = $2
					path = $3
					print epoch, strftime("%Y-%m-%dT%H:%M:%SZ", epoch, 1), root, kind_for_path(path), run_id_for_path(path), path, tags_for_path(path)
				}
			'
	} > "$tmp"
}

field_clean() {
	tr '\t\r\n' '   ' | sed 's/  */ /g'
}

write_push_rows() {
	local artifacts=$1 tmp=$2 epoch iso path
	printf 'mtime_epoch\tmtime_utc\tmanifest_path\tsource_branch\tsource_commit\tintended_danluu_branch\tbase_ref\tclass\tallowed\tvalidation_summary\treason\n' > "$tmp"
	awk -F '\t' 'NR > 1 && $4 == "push_manifest" { print $1 "\t" $2 "\t" $6 }' "$artifacts" |
	while IFS=$'\t' read -r epoch iso path; do
		[ -s "$path" ] || continue
		awk -F '\t' -v OFS='\t' -v epoch="$epoch" -v iso="$iso" -v manifest="$path" '
			function val(name, fallback_idx, idx) {
				idx = h[name]
				if (idx && idx <= NF) return $idx
				if (fallback_idx && fallback_idx <= NF) return $fallback_idx
				return ""
			}
			function clean(s) {
				gsub(/\t|\r|\n/, " ", s)
				return s
			}
			NR == 1 {
				for (i = 1; i <= NF; i++) h[$i] = i
				next
			}
			NF >= 1 && $0 !~ /^[[:space:]]*#/ {
				source = clean(val("source_branch", 1))
				if (source == "") next
				print epoch, iso, manifest, source, clean(val("source_commit", 2)), clean(val("intended_danluu_branch", 3)), clean(val("base_ref", 4)), clean(val("class", 2)), clean(val("allowed", 6)), clean(val("validation_summary", 8)), clean(val("reason", 9))
			}
		' "$path" 2>/dev/null || true
	done >> "$tmp"
}

write_classifications() {
	local artifacts=$1 tmp=$2 epoch iso path
	printf 'mtime_epoch\tmtime_utc\tclassification_path\titem_id\tclassification\tevidence\tnext_action\tartifact_path\n' > "$tmp"
	awk -F '\t' 'NR > 1 && $4 == "classification" { print $1 "\t" $2 "\t" $6 }' "$artifacts" |
	while IFS=$'\t' read -r epoch iso path; do
		[ -s "$path" ] || continue
		awk -F '\t' -v OFS='\t' -v epoch="$epoch" -v iso="$iso" -v file="$path" '
			function val(name, fallback_idx, idx) {
				idx = h[name]
				if (idx && idx <= NF) return $idx
				if (fallback_idx && fallback_idx <= NF) return $fallback_idx
				return ""
			}
			function clean(s) {
				gsub(/\t|\r|\n/, " ", s)
				return s
			}
			NR == 1 {
				for (i = 1; i <= NF; i++) h[$i] = i
				next
			}
			NF >= 1 && $0 !~ /^[[:space:]]*#/ {
				item = clean(val("item_id", 1))
				if (item == "") next
				print epoch, iso, file, item, clean(val("classification", 2)), clean(val("evidence", 3)), clean(val("next_action", 4)), clean(val("artifact_path", 5))
			}
		' "$path" 2>/dev/null || true
	done >> "$tmp"
}

write_branches() {
	local tmp=$1
	printf 'indexed_at\tbranch\tsha\tcommitter_epoch\tcommitter_date\tcategory\n' > "$tmp"
	if [ -d "$SRC/.git" ]; then
		git -C "$SRC" for-each-ref --format='%(refname:short)%09%(objectname)%09%(committerdate:unix)%09%(committerdate:iso8601)' refs/heads 2>/dev/null |
			awk -F '\t' -v now="$(date -u +%Y-%m-%dT%H:%M:%SZ)" 'BEGIN { OFS = "\t" }
				{
					category = "other"
					if ($1 ~ /^ready\//) category = "ready"
					else if ($1 ~ /^finalized\//) category = "finalized"
					else if ($1 ~ /^fresh-prset\//) category = "fresh_prset"
					else if ($1 ~ /^review\//) category = "review"
					else if ($1 ~ /^try\//) category = "try"
					print now, $1, $2, $3, $4, category
				}' >> "$tmp"
	fi
}

write_runs() {
	local tmp=$1 root_name root epoch path id kind
	printf 'mtime_epoch\tmtime_utc\troot\tkind\trun_id\tpath\n' > "$tmp"
	artifact_roots |
	while IFS=$'\t' read -r root_name root; do
		[ -d "$root" ] || continue
		if [ -d "$root/runs" ]; then
			find "$root/runs" -mindepth 1 -maxdepth 1 -type d -printf "%T@\t$root_name\trun\t%f\t%p\n" 2>/dev/null || true
		fi
		if [ -d "$root/cycles" ]; then
			find "$root/cycles" -mindepth 1 -maxdepth 2 -type d -printf "%T@\t$root_name\tcycle\t%f\t%p\n" 2>/dev/null || true
		fi
	done |
	sort -n |
	awk -F '\t' 'BEGIN { OFS = "\t" } NF >= 5 { epoch = int($1); print epoch, strftime("%Y-%m-%dT%H:%M:%SZ", epoch, 1), $2, $3, $4, $5 }' >> "$tmp"
}

write_manifest_paths() {
	local artifacts=$1 tmp=$2
	{
		printf 'mtime_epoch\tmtime_utc\tkind\tpath\n'
		awk -F '\t' 'BEGIN { OFS = "\t" }
			NR > 1 && $4 == "context" {
				print $1, $2, $4, $6
			}
		' "$artifacts"
		awk -F '\t' 'BEGIN { OFS = "\t" }
			NR > 1 && ($4 == "push_manifest" || $4 == "branch_audit" || $4 == "finalization_report") {
				print $1, $2, $4, $6
			}
		' "$artifacts" | sort -n | tail -450
	} |
	awk -F '\t' '!seen[$4]++' > "$tmp"
}

write_status() {
	local tmp=$1
	{
		echo "# RTC Artifact Index"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- interval seconds: $INDEX_INTERVAL_SECONDS"
		echo "- artifacts: $ARTIFACTS"
		echo "- push rows: $PUSH_ROWS"
		echo "- classifications: $CLASSIFICATIONS"
		echo "- branches: $BRANCHES"
		echo "- runs: $RUNS"
		echo "- manifest paths: $MANIFEST_PATHS"
		echo
		echo "## Counts"
		printf -- "- artifacts: %s\n" "$(awk 'NR > 1 { count++ } END { print count + 0 }' "$ARTIFACTS" 2>/dev/null || printf 0)"
		printf -- "- push rows: %s\n" "$(awk 'NR > 1 { count++ } END { print count + 0 }' "$PUSH_ROWS" 2>/dev/null || printf 0)"
		printf -- "- classifications: %s\n" "$(awk 'NR > 1 { count++ } END { print count + 0 }' "$CLASSIFICATIONS" 2>/dev/null || printf 0)"
		printf -- "- branches: %s\n" "$(awk 'NR > 1 { count++ } END { print count + 0 }' "$BRANCHES" 2>/dev/null || printf 0)"
		printf -- "- runs: %s\n" "$(awk 'NR > 1 { count++ } END { print count + 0 }' "$RUNS" 2>/dev/null || printf 0)"
		echo
		echo "## Recent Artifacts"
		tail -30 "$ARTIFACTS" 2>/dev/null || true
		echo
		echo "## Recent Log"
		tail -80 "$LOG" 2>/dev/null || true
	} > "$tmp"
}

run_once() {
	local tmpdir
	tmpdir=$(mktemp -d "$BASE/tmp/index.XXXXXX")
	trap 'rm -rf "$tmpdir"' RETURN
	write_artifacts "$tmpdir/artifacts.tsv"
	write_push_rows "$tmpdir/artifacts.tsv" "$tmpdir/push-rows.tsv"
	write_classifications "$tmpdir/artifacts.tsv" "$tmpdir/classifications.tsv"
	write_branches "$tmpdir/branches.tsv"
	write_runs "$tmpdir/runs.tsv"
	write_manifest_paths "$tmpdir/artifacts.tsv" "$tmpdir/manifest-paths.tsv"
	mv "$tmpdir/artifacts.tsv" "$ARTIFACTS"
	mv "$tmpdir/push-rows.tsv" "$PUSH_ROWS"
	mv "$tmpdir/classifications.tsv" "$CLASSIFICATIONS"
	mv "$tmpdir/branches.tsv" "$BRANCHES"
	mv "$tmpdir/runs.tsv" "$RUNS"
	mv "$tmpdir/manifest-paths.tsv" "$MANIFEST_PATHS"
	write_status "$tmpdir/status.md"
	mv "$tmpdir/status.md" "$STATUS"
	log "indexed artifacts=$(awk 'NR > 1 { count++ } END { print count + 0 }' "$ARTIFACTS") branches=$(awk 'NR > 1 { count++ } END { print count + 0 }' "$BRANCHES")"
}

run_loop() {
	exec 9>"$LOCK"
	if ! flock -n 9; then
		log "another artifact index loop already holds $LOCK"
		exit 0
	fi
	printf '%s\n' "$$" > "$PID_FILE"
	trap 'rm -f "$PID_FILE"' EXIT
	log "artifact index loop started pid=$$"
	while true; do
		run_once || log "artifact index cycle failed rc=$?"
		sleep "$INDEX_INTERVAL_SECONDS"
	done
}

start_tmux() {
	tmux kill-session -t "$SESSION" 2>/dev/null || true
	tmux new-session -d -s "$SESSION" "bash '$0' run"
}

case "${1:-run}" in
	once|run-once)
		run_once
		;;
	run|loop)
		run_loop
		;;
	start)
		start_tmux
		;;
	status)
		sed -n '1,220p' "$STATUS" 2>/dev/null || true
		;;
	*)
		echo "usage: $0 [once|run|start|status]" >&2
		exit 2
		;;
esac
