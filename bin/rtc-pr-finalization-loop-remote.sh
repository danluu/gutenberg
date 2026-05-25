#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
OPERATOR_DIRECTIVE=${RTC_OPERATOR_DIRECTIVE:-/media/volume/danluu-fuzz-data/rtc-operator-directives/current.md}

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-pr-finalization-loop 2>/dev/null || true

cat > "$BASE/pr-finalization-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
OPERATOR_DIRECTIVE=${RTC_OPERATOR_DIRECTIVE:-/media/volume/danluu-fuzz-data/rtc-operator-directives/current.md}
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
BENCHMARK_FEEDBACK_BASE=/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
STACK_WORKTREE_BASE=${RTC_PR_FINALIZATION_STACK_WORKTREE_BASE:-$BASE/exact-stack-worktrees}
STACK_FETCH_REMOTE=${RTC_PR_FINALIZATION_STACK_FETCH_REMOTE:-https://github.com/danluu/gutenberg.git}
BENCHMARK_HARNESS_SRC=${RTC_PR_FINALIZATION_BENCHMARK_HARNESS_SRC:-$BASE/benchmark-harness-source}
LOG="$BASE/logs/pr-finalization-loop.log"
STATE="$BASE/logs/finalization-launches.tsv"
STATUS="$BASE/current-finalization-status.md"
MAX_ACTIVE_JOBS=${RTC_PR_FINALIZATION_MAX_ACTIVE_JOBS:-1}
CYCLE_SLEEP_SECONDS=${RTC_PR_FINALIZATION_CYCLE_SLEEP_SECONDS:-300}
MIN_INTERVAL_SECONDS=${RTC_PR_FINALIZATION_MIN_INTERVAL_SECONDS:-1800}
MAX_LOAD_MULTIPLIER=${RTC_PR_FINALIZATION_MAX_LOAD_MULTIPLIER:-1.30}
CODEX_MODEL=${RTC_PR_FINALIZATION_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_PR_FINALIZATION_CODEX_REASONING_EFFORT:-xhigh}
BENCHMARK_UNBLOCK_BASE="$BASE/benchmark-minimum-unblock"
BENCHMARK_UNBLOCK_OVERRIDES="$BASE/benchmark-minimum-overrides.tsv"
BENCHMARK_UNBLOCK_STATE="$BASE/logs/benchmark-minimum-unblock-launches.tsv"
BENCHMARK_UNBLOCK_MAX_ACTIVE=${RTC_PR_FINALIZATION_BENCHMARK_UNBLOCK_MAX_ACTIVE:-2}
BENCHMARK_UNBLOCK_TIMEOUT_SECONDS=${RTC_PR_FINALIZATION_BENCHMARK_UNBLOCK_TIMEOUT_SECONDS:-14400}
BENCHMARK_UNBLOCK_MIN_INTERVAL_SECONDS=${RTC_PR_FINALIZATION_BENCHMARK_UNBLOCK_MIN_INTERVAL_SECONDS:-1800}
BENCHMARK_REPAIR_BASE="$BASE/benchmark-minimum-repair"
BENCHMARK_STACK_REPLACEMENTS="$BASE/benchmark-minimum-stack-replacements.tsv"
BENCHMARK_HARNESS_BUILDER_BASE="$BASE/benchmark-harness-builder"
BENCHMARK_HARNESS_BUILDER_STATE="$BASE/logs/benchmark-harness-builder-launches.tsv"
BENCHMARK_HARNESS_BUILDER_MIN_INTERVAL_SECONDS=${RTC_PR_FINALIZATION_BENCHMARK_HARNESS_BUILDER_MIN_INTERVAL_SECONDS:-3600}

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees" "$BENCHMARK_UNBLOCK_BASE" "$BENCHMARK_REPAIR_BASE" "$BENCHMARK_HARNESS_BUILDER_BASE"
touch "$STATE" "$BENCHMARK_UNBLOCK_STATE" "$BENCHMARK_HARNESS_BUILDER_STATE"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

active_finalization_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-pr-finalize-job-/ { count++ } END { print count + 0 }'
}

load_too_high() {
	local load cores
	load=$(awk '{ print $1 }' /proc/loadavg 2>/dev/null || printf '0')
	cores=$(nproc 2>/dev/null || printf '1')
	awk -v load="$load" -v cores="$cores" -v multiplier="$MAX_LOAD_MULTIPLIER" 'BEGIN { exit !(load > cores * multiplier) }'
}

recently_launched() {
	local now
	now=$(date -u +%s)
	awk -F '\t' -v now="$now" -v interval="$MIN_INTERVAL_SECONDS" '
		{ last = $1 }
		END { exit !(last != "" && now - last < interval) }
	' "$STATE" 2>/dev/null
}

ensure_benchmark_unblock_override_header() {
	if [ ! -s "$BENCHMARK_UNBLOCK_OVERRIDES" ]; then
		printf 'branch\tcommit\trow\tresult\tevidence\tupdated_at\n' > "$BENCHMARK_UNBLOCK_OVERRIDES"
	fi
	if [ ! -s "$BENCHMARK_STACK_REPLACEMENTS" ]; then
		printf 'old_branch\told_commit\tnew_branch\tnew_commit\tevidence\tupdated_at\n' > "$BENCHMARK_STACK_REPLACEMENTS"
	fi
}

write_benchmark_minimum_block() {
	local output=$1
	local tmp=$output.tmp
	local raw=$output.raw.tmp
	ensure_benchmark_unblock_override_header
	{
		printf 'run_id\tbranch\tcommit\trow\texit_code\tresult\tnext_command\tfeedback_path\tlog_path\n'
		if [ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ]; then
			awk -F '\t' -v OFS='\t' \
				-v feedback="$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" \
				-v source_repo="$SRC" \
				-v stack_base="$STACK_WORKTREE_BASE" \
				-v stack_fetch_remote="$STACK_FETCH_REMOTE" \
				-v benchmark_harness_src="$BENCHMARK_HARNESS_SRC" \
				-v focused_launcher="$SRC/bin/rtc-focused-shards-start-remote.sh" '
				FNR == NR {
					if ( FNR > 1 && $1 != "" && $2 != "" && $3 != "" && $4 != "" ) {
						replacement_branch[ $1 FS $2 ] = $3
						replacement_commit[ $1 FS $2 ] = $4
						replacement_evidence[ $1 FS $2 ] = $5
					}
					next
				}
				FNR == 1 {
					for ( i = 1; i <= NF; i++ ) {
						h[ $i ] = i
					}
					next
				}
				function value( name ) {
					return ( name in h ) ? $( h[ name ] ) : ""
				}
				function source_branch_name() {
					branch = value( "branch" )
					if ( branch != "" ) {
						return branch
					}
					return value( "failing_branch" )
				}
				function source_commit_sha() {
					commit = value( "current_ref_commit" )
					if ( commit != "" ) {
						return commit
					}
					commit = value( "branch_commit" )
					if ( commit != "" ) {
						return commit
					}
					commit = value( "commit" )
					if ( commit != "" ) {
						return commit
					}
					commit = value( "active_failure_commit" )
					if ( commit != "" ) {
						return commit
					}
					commit = value( "failing_commit" )
					if ( commit != "" ) {
						return commit
					}
					return value( "branch_head" )
				}
				function replacement_key() {
					return source_branch_name() FS source_commit_sha()
				}
				function run_identifier() {
					id = value( "run_id" )
					if ( id != "" ) {
						if ( replacement_key() in replacement_commit ) {
							return id "-replacement-" substr( replacement_commit[ replacement_key() ], 1, 12 )
						}
						return id
					}
					id = value( "benchmark_run_id" )
					if ( id != "" ) {
						if ( replacement_key() in replacement_commit ) {
							return id "-replacement-" substr( replacement_commit[ replacement_key() ], 1, 12 )
						}
						return id
					}
					id = value( "cycle" )
					if ( id != "" ) {
						if ( replacement_key() in replacement_commit ) {
							return id "-replacement-" substr( replacement_commit[ replacement_key() ], 1, 12 )
						}
						return id
					}
					id = value( "gate_cycle" )
					if ( id != "" ) {
						if ( replacement_key() in replacement_commit ) {
							return id "-replacement-" substr( replacement_commit[ replacement_key() ], 1, 12 )
						}
						return id
					}
					return branch_name()
				}
				function branch_name() {
					key = replacement_key()
					if ( key in replacement_branch ) {
						return replacement_branch[ key ]
					}
					return source_branch_name()
				}
				function commit_sha() {
					key = replacement_key()
					if ( key in replacement_commit ) {
						return replacement_commit[ key ]
					}
					return source_commit_sha()
				}
				function exact_stack_worktree( branch, commit, slug ) {
					slug = branch
					gsub( /[^A-Za-z0-9_.-]/, "-", slug )
					if ( commit != "" ) {
						return stack_base "/" slug "-" substr( commit, 1, 12 )
					}
					return stack_base "/" slug
				}
				function exact_stack_prep_command( branch, commit, worktree ) {
					if ( branch == "" || commit == "" ) {
						return "missing-exact-stack-branch-or-commit"
					}
					worktree = exact_stack_worktree( branch, commit )
					return "mkdir -p " stack_base " && ( git -C " source_repo " rev-parse --verify " commit "^{commit} >/dev/null 2>&1 || git -C " source_repo " fetch " stack_fetch_remote " refs/heads/" branch ":refs/remotes/danluu/" branch " ) && { if git -C " worktree " rev-parse --git-dir >/dev/null 2>&1; then git -C " worktree " checkout --detach " commit "; else git -C " source_repo " worktree add --detach " worktree " " commit "; fi; }"
				}
				function exact_stack_build_command( worktree ) {
					return "( cd " worktree " && npm run build )"
				}
					function exact_stack_localdeps_command( worktree ) {
						return "{ [ -e " worktree "/node_modules ] || cp -al " source_repo "/node_modules " worktree "/node_modules || ( cd " worktree " && npm install ); } && { for pkg_modules in " source_repo "/packages/*/node_modules; do [ -e \"$pkg_modules\" ] || continue; pkg=${pkg_modules%/node_modules}; pkg=${pkg##*/}; mkdir -p " worktree "/packages/$pkg; [ -e " worktree "/packages/$pkg/node_modules ] || cp -al \"$pkg_modules\" " worktree "/packages/$pkg/node_modules || true; done; } && { [ -e " worktree "/test/e2e/node_modules ] || { mkdir -p " worktree "/test/e2e && ln -s ../../node_modules/@wordpress/e2e-tests-playwright/node_modules " worktree "/test/e2e/node_modules; } || { rm -rf " worktree "/test/e2e/node_modules && cp -al " source_repo "/node_modules/@wordpress/e2e-tests-playwright/node_modules " worktree "/test/e2e/node_modules; } || ( cd " worktree "/test/e2e && npm install --no-audit --no-fund ); } && { [ -e " worktree "/vendor ] || [ ! -e " source_repo "/vendor ] || cp -al " source_repo "/vendor " worktree "/vendor || ( cd " worktree " && composer install ); }"
					}
					function path_dirname( file, dir ) {
						dir = file
						sub( /\/[^\/]+$/, "", dir )
						return dir
					}
					function exact_stack_harness_command( worktree, test_path, dest, src ) {
						dest = worktree "/" test_path
						if ( benchmark_harness_src != "" ) {
							src = benchmark_harness_src "/" test_path
							return "{ [ -f " dest " ] || { [ -f " src " ] && mkdir -p " worktree "/" path_dirname( test_path ) " && cp " src " " dest "; }; [ -f " dest " ] || { echo missing benchmark harness file in exact stack and harness source: " test_path " >&2; echo set RTC_PR_FINALIZATION_BENCHMARK_HARNESS_SRC to a versioned harness worktree containing the benchmark-minimum files >&2; exit 2; }; }"
						}
						return "{ [ -f " dest " ] || { echo missing benchmark harness file in exact stack: " test_path " >&2; echo set RTC_PR_FINALIZATION_BENCHMARK_HARNESS_SRC to a versioned harness worktree or commit the file to the exact stack before treating this row as runnable >&2; exit 2; }; }"
					}
				function row_has_case( row, name ) {
					return row == name || row ~ ( "(^|[/:#])" name "([/:#]|$)" )
				}
				function failed_reps_count( value ) {
					gsub( /^[[:space:]]+|[[:space:]]+$/, "", value )
					return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
				}
				function focused_profile( row ) {
					if ( row_has_case( row, "setup/build" ) ) {
						return ""
					}
					if ( row_has_case( row, "e2e/collaboration-code-editor-performance-ws" ) ||
						row_has_case( row, "collaboration-code-editor-performance-ws" ) ||
						row_has_case( row, "code-editor-performance-ws" ) ||
						row_has_case( row, "ws-code-editor-smoke" ) ) {
						return "ws-code-editor-smoke"
					}
					if ( row_has_case( row, "e2e/collaboration-sync-body-size-http" ) ||
						row_has_case( row, "collaboration-sync-body-size-http" ) ||
						row_has_case( row, "sync-body-size-http" ) ||
						row_has_case( row, "body-size-http" ) ) {
						return "large-http-lifecycle"
					}
					if ( row_has_case( row, "focused/title-reload-http" ) || row_has_case( row, "title-reload-http" ) ) {
						return "title-reload-http"
					}
					if ( row_has_case( row, "focused/persistence-reload-http" ) || row_has_case( row, "persistence-reload-http" ) ) {
						return "existing-post-crdt-http"
					}
					if ( row_has_case( row, "realistic-e2e/large-post-three-user-http" ) || row_has_case( row, "large-post-three-user-http" ) || row_has_case( row, "large-document-http-convergence" ) ) {
						return "large-http-lifecycle"
					}
					if ( row_has_case( row, "realistic-e2e/list-item-move-refresh-http" ) || row_has_case( row, "list-item-move-refresh-http" ) ) {
						return "large-http-lifecycle"
					}
					if ( row_has_case( row, "realistic-e2e/table-stale-snapshot-http" ) ||
						row_has_case( row, "table-stale-snapshot-http" ) ||
						row_has_case( row, "focused/revision-table-body-http" ) ||
						row_has_case( row, "revision-table-body-http" ) ) {
						return "large-http-lifecycle"
					}
					if ( row_has_case( row, "focused/autosave-retention-http" ) ||
						row_has_case( row, "autosave-retention-http" ) ||
						row_has_case( row, "focused/collaborator-autosave-http" ) ||
						row_has_case( row, "collaborator-autosave-http" ) ) {
						return "existing-post-crdt-http"
					}
					if ( row_has_case( row, "focused/same-user-stale-content-http" ) ||
						row_has_case( row, "same-user-stale-content-http" ) ) {
						return "same-user-stale-tabs-http"
					}
					if ( row_has_case( row, "focused/self-presence-ui-signal-http" ) ||
						row_has_case( row, "self-presence-ui-signal-http" ) ||
						row_has_case( row, "ui-signal" ) ||
						row_has_case( row, "self-presence" ) ) {
						return "ui-signals"
					}
					if ( row_has_case( row, "focused/same-user-title-reload-ws" ) ||
						row_has_case( row, "same-user-title-reload-ws" ) ||
						row_has_case( row, "title-reload-ws" ) ) {
						return "same-user-stale-tabs"
					}
					return ""
				}
				function focused_port_base( profile ) {
					if ( profile == "title-reload-http" ) {
						return "61200"
					}
					if ( profile == "existing-post-crdt-http" ) {
						return "61220"
					}
					if ( profile == "large-http-lifecycle" ) {
						return "61240"
					}
					if ( profile == "ws-code-editor-smoke" ) {
						return "61260"
					}
					return "61280"
				}
				function focused_ws_port_base( profile ) {
					if ( profile == "title-reload-http" ) {
						return "34600"
					}
					if ( profile == "existing-post-crdt-http" ) {
						return "34620"
					}
					if ( profile == "large-http-lifecycle" ) {
						return "34640"
					}
					if ( profile == "ws-code-editor-smoke" ) {
						return "34660"
					}
					return "34680"
				}
				function benchmark_minimum_unit_test_path( row ) {
					if ( row_has_case( row, "lower/micro-crdt" ) ) {
						return "packages/core-data/src/utils/test/rtc-merge-benchmark.test.ts"
					}
					if ( row_has_case( row, "lower/micro-html" ) ) {
						return "packages/blocks/src/api/test/rtc-html-equivalence-benchmark.js"
					}
					if ( row_has_case( row, "lower/micro-sync" ) ) {
						return "packages/sync/src/providers/http-polling/test/rtc-sync-benchmark.test.ts"
					}
					if ( row_has_case( row, "multi-user/many-users-sync" ) ) {
						return "packages/sync/src/providers/http-polling/test/rtc-many-user-sync-benchmark.test.ts"
					}
					return ""
				}
				function exact_stack_unit_command( row, branch, commit, worktree, test_path ) {
					test_path = benchmark_minimum_unit_test_path( row )
					if ( test_path == "" ) {
						return ""
					}
					branch = branch_name()
					commit = commit_sha()
					worktree = exact_stack_worktree( branch, commit )
					return exact_stack_prep_command( branch, commit ) " && " exact_stack_localdeps_command( worktree ) " && " exact_stack_harness_command( worktree, test_path ) " && " exact_stack_build_command( worktree ) " && ( cd " worktree " && npm run test:unit -- " test_path " --runInBand )"
				}
				function next_command( row, branch, commit, profile, worktree ) {
					if ( row == "unit-suite/crdt-stale-top-level" ) {
						return "npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts --runInBand"
					}
					if ( row == "setup/build" ) {
						branch = branch_name()
						commit = commit_sha()
						worktree = exact_stack_worktree( branch, commit )
						return exact_stack_prep_command( branch, commit ) " && " exact_stack_localdeps_command( worktree ) " && " exact_stack_build_command( worktree )
					}
					if ( benchmark_minimum_unit_test_path( row ) != "" ) {
						return exact_stack_unit_command( row )
					}
					profile = focused_profile( row )
					if ( profile == "" ) {
						return ""
					}
					branch = branch_name()
					commit = commit_sha()
					worktree = exact_stack_worktree( branch, commit )
					return exact_stack_prep_command( branch, commit ) " && " exact_stack_localdeps_command( worktree ) " && " exact_stack_build_command( worktree ) " && RTC_FOCUSED_SHARDS_SRC=" worktree " RTC_FOCUSED_SHARDS_HARNESS_SRC=" source_repo " RTC_FOCUSED_SHARDS_ENABLED_NAMES=" profile " RTC_FOCUSED_SHARDS_APPEND_CURRENT=1 RTC_FOCUSED_SHARDS_DURATION_HOURS=2 RTC_FOCUSED_SHARDS_PORT_BASE=" focused_port_base( profile ) " RTC_FOCUSED_SHARDS_WS_PORT_BASE=" focused_ws_port_base( profile ) " " focused_launcher
				}
					function log_path() {
						p = value( "log_path" )
						if ( p != "" ) {
							return p
						}
						return value( "log" )
					}
				function normalized_row() {
					row = value( "row" )
					if ( row != "" ) {
						return row
					}
					row = value( "failure_row" )
					if ( row != "" ) {
						return row
					}
					row = value( "failing_row" )
					if ( row != "" ) {
						return row
					}
					row = value( "equivalent_lane" )
					if ( row != "" ) {
						return row
					}
					row = value( "case" )
					if ( row != "" && value( "kind" ) != "" ) {
						return value( "kind" ) "/" row
					}
					return row
				}
				function blocks_promotion( row ) {
					return row_has_case( row, "unit-suite/crdt-stale-top-level" ) ||
						row_has_case( row, "lower/micro-crdt" ) ||
						row_has_case( row, "lower/micro-html" ) ||
						row_has_case( row, "lower/micro-sync" ) ||
						row_has_case( row, "multi-user/many-users-sync" ) ||
						row_has_case( row, "setup/build" ) ||
							row_has_case( row, "focused/title-reload-http" ) ||
							row_has_case( row, "title-reload-http" ) ||
							row_has_case( row, "focused/persistence-reload-http" ) ||
							row_has_case( row, "persistence-reload-http" ) ||
							row_has_case( row, "e2e/collaboration-code-editor-performance-ws" ) ||
							row_has_case( row, "collaboration-code-editor-performance-ws" ) ||
							row_has_case( row, "code-editor-performance-ws" ) ||
							row_has_case( row, "ws-code-editor-smoke" ) ||
							row_has_case( row, "e2e/collaboration-sync-body-size-http" ) ||
							row_has_case( row, "collaboration-sync-body-size-http" ) ||
							row_has_case( row, "sync-body-size-http" ) ||
							row_has_case( row, "body-size-http" ) ||
							row_has_case( row, "realistic-e2e/large-post-three-user-http" ) ||
							row_has_case( row, "large-post-three-user-http" ) ||
							row_has_case( row, "large-document-http-convergence" ) ||
							row_has_case( row, "realistic-e2e/list-item-move-refresh-http" ) ||
							row_has_case( row, "list-item-move-refresh-http" ) ||
							row_has_case( row, "realistic-e2e/table-stale-snapshot-http" ) ||
							row_has_case( row, "table-stale-snapshot-http" ) ||
							row_has_case( row, "focused/autosave-retention-http" ) ||
							row_has_case( row, "autosave-retention-http" ) ||
							row_has_case( row, "focused/collaborator-autosave-http" ) ||
							row_has_case( row, "collaborator-autosave-http" ) ||
							row_has_case( row, "focused/same-user-stale-content-http" ) ||
							row_has_case( row, "same-user-stale-content-http" ) ||
							row_has_case( row, "focused/revision-table-body-http" ) ||
							row_has_case( row, "revision-table-body-http" ) ||
							row_has_case( row, "focused/self-presence-ui-signal-http" ) ||
							row_has_case( row, "self-presence-ui-signal-http" ) ||
							row_has_case( row, "focused/same-user-title-reload-ws" ) ||
							row_has_case( row, "same-user-title-reload-ws" )
					}
					function is_scoped_repair_feedback( row, branch, consumer, text ) {
						branch = tolower( branch_name() )
						consumer = tolower( value( "consumer_loop" ) )
						text = tolower( $0 )
						if ( blocks_promotion( row ) && consumer ~ /finalization|promoter|snapshot|all-merged|maintainer/ ) {
							return 0
						}
						return text ~ /blocks pr17 only|red for pr17|pr17 exact-stack repair/
					}
					{
						row = normalized_row()
						exit_code = value( "exit_code" )
						status = tolower( value( "status" ) )
						failure_type = tolower( value( "failure_type" ) )
						reps_failed = value( "reps_failed" )
						if ( reps_failed == "" ) {
							reps_failed = value( "failed_reps" )
						}
						repair_or_priority = tolower( value( "repair_or_priority" ) )
						line = tolower( $0 )
						failure = exit_code
						if ( failure == "" ) {
							failure = value( "result" )
						}
						if ( failure == "" ) {
							failure = reps_failed
						}
						if ( is_scoped_repair_feedback( row ) ) {
							next
						}
						if ( ( blocks_promotion( row ) || status ~ /promotion_blocked|known_bad_canary/ || line ~ /(^|\t)(promotion_blocked|known_bad_canary)(\t|$)/ ) &&
							( ( exit_code != "" && exit_code != "0" ) || status ~ /promotion_blocked|known_bad_canary/ || line ~ /(^|\t)(promotion_blocked|known_bad_canary)(\t|$)/ ) ) {
							print run_identifier(), branch_name(), commit_sha(), row, failure, "promotion_blocked", next_command( row ), feedback, log_path()
						} else if ( failed_reps_count( reps_failed ) &&
							( ( blocks_promotion( row ) && failure_type ~ /promotion-preflight|benchmark-row/ ) ||
								repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/ ) ) {
							print run_identifier(), branch_name(), commit_sha(), row, failure, "promotion_blocked", next_command( row ), feedback, log_path()
						}
					}
				' "$BENCHMARK_STACK_REPLACEMENTS" "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
		fi
	} > "$raw"
	awk -F '\t' -v OFS='\t' '
		FNR == NR {
			if ( FNR > 1 && ( $4 == "passed" || $4 == "downscoped" ) ) {
				cleared[ $1 FS $2 FS $3 ] = 1
			}
			next
		}
		FNR == 1 {
			print
			next
		}
		!( ( $2 FS $3 FS $4 ) in cleared ) {
			print
		}
	' "$BENCHMARK_UNBLOCK_OVERRIDES" "$raw" > "$tmp"
	rm -f "$raw"
	mv "$tmp" "$output"
	if [ "$output" != "$BASE/current-benchmark-minimum-block.tsv" ]; then
		cp "$output" "$BASE/current-benchmark-minimum-block.tsv"
	fi
}

benchmark_minimum_block_has_rows() {
	local block_file=${1:-$BASE/current-benchmark-minimum-block.tsv}
	[ -s "$block_file" ] && [ "$(wc -l < "$block_file")" -gt 1 ]
}

required_benchmark_harness_files() {
	cat <<'EOF'
packages/core-data/src/utils/test/rtc-merge-benchmark.test.ts
packages/blocks/src/api/test/rtc-html-equivalence-benchmark.js
packages/sync/src/providers/http-polling/test/rtc-sync-benchmark.test.ts
packages/sync/src/providers/http-polling/test/rtc-many-user-sync-benchmark.test.ts
EOF
}

missing_benchmark_harness_files() {
	local path
	required_benchmark_harness_files |
		while IFS= read -r path; do
			[ -n "$path" ] || continue
			[ -f "$BENCHMARK_HARNESS_SRC/$path" ] || printf '%s\n' "$path"
		done
}

active_benchmark_unblock_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-pr-benchmark-minimum-unblock-/ { count++ } END { print count + 0 }'
}

active_benchmark_harness_builder_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-pr-benchmark-harness-builder-/ { count++ } END { print count + 0 }'
}

benchmark_harness_builder_recently_launched() {
	local now
	now=$(date -u +%s)
	awk -F '\t' -v now="$now" -v interval="$BENCHMARK_HARNESS_BUILDER_MIN_INTERVAL_SECONDS" '
		NR > 1 { last = $1 }
		END { exit !( last != "" && now - last < interval ) }
	' "$BENCHMARK_HARNESS_BUILDER_STATE" 2>/dev/null
}

benchmark_unblock_recently_launched() {
	local branch=$1 commit=$2 row=$3 now
	now=$(date -u +%s)
	awk -F '\t' -v now="$now" -v interval="$BENCHMARK_UNBLOCK_MIN_INTERVAL_SECONDS" \
		-v branch="$branch" -v commit="$commit" -v row="$row" '
		NR > 1 && $2 == branch && $3 == commit && $4 == row {
			last = $1
		}
		END { exit !( last != "" && now - last < interval ) }
	' "$BENCHMARK_UNBLOCK_STATE" 2>/dev/null
}

slugify() {
	printf '%s' "$*" | tr '/[:space:]' '--' | tr -cd 'A-Za-z0-9._-' | cut -c1-70
}

launch_benchmark_minimum_unblock_job() {
	local block_file=$BASE/current-benchmark-minimum-block.tsv
	local row_line run_id branch commit row exit_code result next_command feedback_path log_path
	local ts slug run_dir command_file runner session
	benchmark_minimum_block_has_rows "$block_file" || return 0
	[ "$(active_benchmark_unblock_sessions)" -lt "$BENCHMARK_UNBLOCK_MAX_ACTIVE" ] || return 0
	row_line=$(awk -F '\t' 'NR == 2 { print; exit }' "$block_file")
	[ -n "$row_line" ] || return 0
	IFS=$'\t' read -r run_id branch commit row exit_code result next_command feedback_path log_path <<EOF_ROW
$row_line
EOF_ROW
	[ -n "${branch:-}" ] && [ -n "${commit:-}" ] && [ -n "${row:-}" ] && [ -n "${next_command:-}" ] || return 0
	if benchmark_unblock_recently_launched "$branch" "$commit" "$row"; then
		return 0
	fi
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	slug=$(slugify "$row-$commit")
	run_dir="$BENCHMARK_UNBLOCK_BASE/$ts-$slug"
	command_file="$run_dir/command.sh"
	runner="$run_dir/run.sh"
	session="rtc-pr-benchmark-minimum-unblock-$ts"
	mkdir -p "$run_dir"
	{
		echo "#!/usr/bin/env bash"
		echo "set -euo pipefail"
		echo "$next_command"
	} > "$command_file"
	chmod +x "$command_file"
	cat > "$runner" <<EOF_RUNNER
#!/usr/bin/env bash
set -euo pipefail
{
	printf '# Benchmark Minimum Unblock\n\n'
	printf -- '- started_at: %s\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	printf -- '- run_id: %s\n' "$run_id"
	printf -- '- branch: %s\n' "$branch"
	printf -- '- commit: %s\n' "$commit"
	printf -- '- row: %s\n' "$row"
	printf -- '- command: %s\n' "$command_file"
	printf '\n'
} > "$run_dir/report.md"
set +e
timeout "$BENCHMARK_UNBLOCK_TIMEOUT_SECONDS" bash "$command_file" > "$run_dir/command.log" 2>&1
rc=\$?
set -e
printf '%s\n' "\$rc" > "$run_dir/exit-code"
if [ "\$rc" -eq 0 ]; then
	{
		flock 8
		if [ ! -s "$BENCHMARK_UNBLOCK_OVERRIDES" ]; then
			printf 'branch\tcommit\trow\tresult\tevidence\tupdated_at\n' > "$BENCHMARK_UNBLOCK_OVERRIDES"
		fi
		printf '%s\t%s\t%s\tpassed\t%s\t%s\n' "$branch" "$commit" "$row" "$run_dir/command.log" "\$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$BENCHMARK_UNBLOCK_OVERRIDES"
	} 8>"$BASE/benchmark-minimum-overrides.lock"
	printf -- '- result: passed\n' >> "$run_dir/report.md"
else
	printf -- '- result: failed\n- exit_code: %s\n' "\$rc" >> "$run_dir/report.md"
	repair_ts=\$(date -u +%Y%m%dT%H%M%SZ)
	repair_slug=\$(printf '%s-%s' "$row" "$commit" | tr '/[:space:]' '--' | tr -cd 'A-Za-z0-9._-' | cut -c1-80)
	repair_dir="$BENCHMARK_REPAIR_BASE/\$repair_ts-\$repair_slug"
	mkdir -p "\$repair_dir"
	branch_slug=\$(printf '%s' "$branch" | sed 's/[^A-Za-z0-9_.-]/-/g')
	exact_worktree="$STACK_WORKTREE_BASE/\$branch_slug-${commit:0:12}"
	repair_branch="repair/benchmark-minimum-\$repair_ts-\$repair_slug"
	cat > "\$repair_dir/prompt.md" <<EOF_REPAIR_PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents.

The PR finalization loop ran a benchmark-minimum promotion command and it failed.

Branch under validation: $branch
Commit under validation: $commit
Benchmark row: $row
Exact worktree: \$exact_worktree
Failing command file: $command_file
Failing command log: $run_dir/command.log
Repair branch to create: \$repair_branch
Report path: \$repair_dir/report.md

Task:
1. Inspect the failing command log and the exact worktree.
2. Make the smallest type-safe repair needed for this benchmark-minimum row. Prefer fixing the proposed PR stack over weakening the benchmark. Do not disable tests or hide product behavior.
3. Work in the exact worktree or a sibling worktree, and create the non-destructive local branch named above.
4. Run the narrowest useful validation first, then rerun the failing command if feasible.
5. Write \$repair_dir/report.md with Summary, Changes, Validation, Remaining blockers, and Local branch.
6. Write \$repair_dir/repair-branch.txt containing only the local branch name.
7. Write \$repair_dir/validation.tsv with columns command,exit_code,log_path.
8. Do not push to GitHub from Jetstream.
EOF_REPAIR_PROMPT
	{
		printf '#!/usr/bin/env bash\n'
		printf 'set -euo pipefail\n'
		printf 'cd %q\n' "\$exact_worktree"
		printf 'export PATH=%q:%q:%q:$PATH\n' "$CODEX_BIN_DIR" "$TMUX_WRAP" "$NODE_BIN"
		printf '%q -a never exec --skip-git-repo-check -m %q -c model_reasoning_effort=%q -s danger-full-access < %q > %q 2> %q\n' "$CODEX_BIN_DIR/codex" "$CODEX_MODEL" "$CODEX_REASONING_EFFORT" "\$repair_dir/prompt.md" "\$repair_dir/stdout.log" "\$repair_dir/stderr.log"
	} > "\$repair_dir/run.sh"
	chmod +x "\$repair_dir/run.sh"
	printf -- '- repair_job: %s\n' "\$repair_dir" >> "$run_dir/report.md"
	set +e
	bash "\$repair_dir/run.sh"
	repair_rc=\$?
	set -e
	printf '%s\n' "\$repair_rc" > "\$repair_dir/exit-code"
	printf -- '- repair_exit_code: %s\n' "\$repair_rc" >> "$run_dir/report.md"
fi
printf '\n## Command Tail\n\n```text\n' >> "$run_dir/report.md"
tail -200 "$run_dir/command.log" >> "$run_dir/report.md" 2>/dev/null || true
printf '\n```\n' >> "$run_dir/report.md"
EOF_RUNNER
	chmod +x "$runner"
	if [ ! -s "$BENCHMARK_UNBLOCK_STATE" ]; then
		printf 'epoch\tbranch\tcommit\trow\tsession\trun_dir\n' > "$BENCHMARK_UNBLOCK_STATE"
	fi
	printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$branch" "$commit" "$row" "$session" "$run_dir" >> "$BENCHMARK_UNBLOCK_STATE"
	log "launching benchmark minimum unblock row=$row branch=$branch commit=$commit session=$session"
	tmux new-session -d -s "$session" "bash '$runner'"
	}

launch_benchmark_harness_builder_job() {
	local missing ts run_dir prompt report stderr runner session exact_branch exact_commit exact_worktree
	missing=$(missing_benchmark_harness_files || true)
	[ -n "$missing" ] || return 0
	[ "$(active_benchmark_harness_builder_sessions)" -eq 0 ] || return 0
	benchmark_harness_builder_recently_launched && return 0
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run_dir="$BENCHMARK_HARNESS_BUILDER_BASE/$ts"
	mkdir -p "$run_dir"
	prompt="$run_dir/prompt.md"
	report="$run_dir/report.md"
	stderr="$run_dir/stderr.log"
	runner="$run_dir/run.sh"
	session="rtc-pr-benchmark-harness-builder-$ts"
	exact_branch=$(git -C "$SRC" for-each-ref --sort=-committerdate --format='%(refname:short)' 'refs/heads/blocked/rtc-pr-stack-*-all-merged-build-repaired' 2>/dev/null | head -1 || true)
	if [ -z "$exact_branch" ]; then
		exact_branch=$(git -C "$SRC" for-each-ref --sort=-committerdate --format='%(refname:short)' 'refs/heads/repair/pr07c-exact-stack-build-*' 2>/dev/null | head -1 || true)
	fi
	exact_commit=$(git -C "$SRC" rev-parse --verify "${exact_branch:-HEAD}" 2>/dev/null || git -C "$SRC" rev-parse HEAD)
	exact_worktree="$STACK_WORKTREE_BASE/harness-builder-${ts}-${exact_commit:0:12}"
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC PR finalization loop.
Do not use API subagents.

The finalizer requires lower benchmark-minimum rows, but the harness files are
missing from both the exact stack and the versioned harness source directory.

Missing files:
$missing

Harness source directory to populate:
$BENCHMARK_HARNESS_SRC

Validation branch/commit:
${exact_branch:-HEAD}
$exact_commit

Validation worktree:
$exact_worktree

Task:
1. Inspect the existing tests and RTC/sync/block APIs in $SRC.
2. Create the missing benchmark harness files under $BENCHMARK_HARNESS_SRC.
   Keep them deterministic, fast, and meaningful: exercise CRDT block merge,
   parser/serializer/HTML equivalence, HTTP polling update queue/body-size
   behavior, and many-user Yjs sync convergence respectively.
3. Copy or link them into the validation worktree, then run the narrow
   npm run test:unit commands for each file if feasible.
4. Write $report with Summary, Files created, Validation, Remaining blockers.
5. Write $run_dir/validation.tsv with columns test_path,exit_code,log_path.
Do not weaken product code or mark rows passed unless tests actually run.
PROMPT
	cat > "$runner" <<EOF_RUNNER
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$STACK_WORKTREE_BASE" "$BENCHMARK_HARNESS_SRC"
if git -C "$exact_worktree" rev-parse --git-dir >/dev/null 2>&1; then
	git -C "$exact_worktree" checkout --detach "$exact_commit"
else
	git -C "$SRC" worktree add --detach "$exact_worktree" "$exact_commit"
fi
cd "$SRC"
timeout "$BENCHMARK_UNBLOCK_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr" || true
EOF_RUNNER
	chmod +x "$runner"
	if [ ! -s "$BENCHMARK_HARNESS_BUILDER_STATE" ]; then
		printf 'epoch\tsession\trun_dir\tmissing\n' > "$BENCHMARK_HARNESS_BUILDER_STATE"
	fi
	printf '%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$session" "$run_dir" "$(printf '%s' "$missing" | tr '\n' ',')" >> "$BENCHMARK_HARNESS_BUILDER_STATE"
	log "launching benchmark harness builder missing=$(printf '%s' "$missing" | tr '\n' ',') session=$session"
	tmux new-session -d -s "$session" "bash '$runner'"
}

collect_context() {
	local cycle_dir=$1
	local branch=$2
	local worktree=$3
	local context=$cycle_dir/context.md
	local coverage
	local benchmark_block=$cycle_dir/benchmark-minimum-block.tsv
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	write_benchmark_minimum_block "$benchmark_block"
	{
		echo "# RTC PR finalization context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- live repo: $SRC"
		echo "- finalization worktree: $worktree"
		echo "- finalization branch: $branch"
		echo "- coverage-guided output: ${coverage:-missing}"
		echo
		echo "## Machine"
		date -u
		hostname || true
		uptime || true
		free -h || true
		echo
		echo "## Tmux Sessions"
		tmux ls 2>/dev/null || true
		echo
		echo "## Live Repo Status"
		git -C "$SRC" status --short --branch || true
		git -C "$SRC" log -1 --oneline || true
		echo
		echo "## Worktree Status"
		git -C "$worktree" status --short --branch || true
		git -C "$worktree" log -1 --oneline || true
		echo
		echo "## Local Candidate Branches"
		git -C "$SRC" for-each-ref --sort=refname --format='%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)%09%(subject)' \
			'refs/heads/deferred/rtc-*' 'refs/heads/try/rtc-*' 'refs/heads/fix/rtc-*' 'refs/heads/pr/rtc-*' 'refs/heads/finalize/rtc-*' 2>/dev/null || true
		echo
		echo "## Worktrees"
		git -C "$SRC" worktree list --porcelain 2>/dev/null || true
		echo
		echo "## Current PR Split Review"
		if [ -f "$PR_SPLIT_BASE/current-pr-split.md" ]; then
			sed -n '1,320p' "$PR_SPLIT_BASE/current-pr-split.md"
		else
			echo "missing $PR_SPLIT_BASE/current-pr-split.md"
		fi
		echo
		echo "## Deferred Work Status"
		if [ -f "$DEFERRED_BASE/current-deferred-status.md" ]; then
			sed -n '1,320p' "$DEFERRED_BASE/current-deferred-status.md"
		else
			echo "missing $DEFERRED_BASE/current-deferred-status.md"
		fi
		echo
		echo "## Coverage-Guided Status"
		if [ -n "$coverage" ] && [ -f "$coverage/novelty-status.md" ]; then
			sed -n '1,240p' "$coverage/novelty-status.md"
		else
			echo "missing"
		fi
		echo
		echo "## Benchmark Canary Feedback"
		if [ -f "$BENCHMARK_FEEDBACK_BASE/current-feedback.md" ]; then
			sed -n '1,260p' "$BENCHMARK_FEEDBACK_BASE/current-feedback.md"
		else
			echo "missing $BENCHMARK_FEEDBACK_BASE/current-feedback.md"
		fi
		echo
		if [ -f "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ]; then
			sed -n '1,120p' "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
		else
			echo "missing $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
		fi
		echo
			echo "## Benchmark Minimum Promotion Block"
			if [ -s "$benchmark_block" ] && [ "$(wc -l < "$benchmark_block")" -gt 1 ]; then
			sed -n '1,80p' "$benchmark_block"
			echo
				echo "Promotion hard-block: do not mark a reload-hydration, large-document collaboration, WebSocket code-editor smoke, or all-merged stack maintainer-ready until every row above has fresh passing evidence on the exact stack."
			else
				echo "none"
			fi
			echo
			echo "## Required Lower Benchmark Harness Files"
			missing_benchmark_harness_files |
				awk '{ print "- missing: " $0 }'
			if [ -z "$(missing_benchmark_harness_files || true)" ]; then
				echo "all present"
			fi
			echo
			echo "## Recent Finalization Reports"
		find "$BASE/cycles" -maxdepth 2 -type f -name 'finalization.report.md' -print 2>/dev/null |
			sort |
			tail -6 |
			while read -r report; do
				echo "### $report"
				sed -n '1,220p' "$report" || true
				echo
			done
	} > "$context"
}


operator_directive_prompt_block() {
	if [ -s "$OPERATOR_DIRECTIVE" ]; then
		printf 'Operator directive (binding):\n'
		sed -n '1,240p' "$OPERATOR_DIRECTIVE" 2>/dev/null || true
		printf '\n'
	fi
}

write_prompt() {
	local prompt=$1
	local branch=$2
	local worktree=$3
	local context=$4
	local report=$5
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

$(operator_directive_prompt_block)
Finalization branch: $branch
Finalization worktree: $worktree
Context: $context
Final report path: $report

Task:
1. Read the context, current PR split review, deferred-work status, and local candidate branches.
2. Improve the PR readiness of the RTC fix project. The useful outputs are branch hygiene, branch split corrections, small final validation patches, and exact instructions for the local host to push branch refs to the danluu remote.
3. Detect proposed PR branches that accidentally contain the same full stack or unrelated commits. If it is safe, create or update local split branches so each branch contains only its intended PR content. Use non-destructive branches/worktrees; do not rewrite active fuzzing refs unless you are certain they are finalization-only refs.
4. For each proposed PR, record base ref, head branch, file count, diffstat, commit list, remaining validation, and whether it is ready, blocked, or deferred.
5. Pull completed deferred-family branches into the PR split only when their report contains concrete evidence and a reviewable diff. Otherwise leave them as deferred and state the next experiment needed.
	6. Treat benchmark canary feedback as upstream fuzz/promotion evidence, not as a downstream quality gate. A reload-hydration, large-document collaboration, WebSocket code-editor smoke, or all-merged stack is not maintainer-ready unless the exact stack has local evidence for the full benchmark-minimum set: \`unit-suite/crdt-stale-top-level\`, \`lower/micro-crdt\`, \`lower/micro-html\`, \`lower/micro-sync\`, \`multi-user/many-users-sync\`, full \`npm run build\`, and any active benchmark-canary large-post/title-reload/persistence HTTP or WebSocket code-editor rows. If the context's Benchmark Minimum Promotion Block has rows, do not create or update finalized ready refs or push commands; write a blocked report with the exact command/artifact needed.
7. Do not push to GitHub from Jetstream. The remote machine is not expected to have GitHub write access.
8. Avoid broad refactors and behavior-disable flags. Do not stop active fuzzing sessions.
9. Run focused syntax or diff checks for branches you create or modify.
10. Write a concise report to $report with headings: Summary, Proposed PR Branches, Branch Corrections, Deferred Work, Validation, Push Commands For Local Host, Risks.
PROMPT
}

launch_finalization_job() {
	local ts cycle_dir branch worktree prompt report codex_log session
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	cycle_dir="$BASE/cycles/$ts"
	branch="finalize/rtc-pr-stack-$ts"
	worktree="$BASE/worktrees/pr-stack-$ts"
	mkdir -p "$cycle_dir"
	if ! git -C "$SRC" worktree add -b "$branch" "$worktree" HEAD > "$cycle_dir/worktree.log" 2>&1; then
		branch="finalize/rtc-pr-stack-$ts-detached"
		git -C "$SRC" worktree add --detach "$worktree" HEAD >> "$cycle_dir/worktree.log" 2>&1 || {
			log "failed to create finalization worktree; see $cycle_dir/worktree.log"
			return 1
		}
		git -C "$worktree" switch -c "$branch" >> "$cycle_dir/worktree.log" 2>&1 || true
	fi
	collect_context "$cycle_dir" "$branch" "$worktree"
	prompt="$cycle_dir/finalization.prompt.md"
	report="$cycle_dir/finalization.report.md"
	codex_log="$cycle_dir/finalization.stderr.log"
	write_prompt "$prompt" "$branch" "$worktree" "$cycle_dir/context.md" "$report"
	session="rtc-pr-finalize-job-$ts"
	printf '%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$session" "$branch" "$worktree" >> "$STATE"
	log "launching $session branch=$branch worktree=$worktree"
	tmux new-session -d -s "$session" \
		"bash -lc 'cd \"$worktree\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m \"$CODEX_MODEL\" -c model_reasoning_effort=\"$CODEX_REASONING_EFFORT\" -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

write_status() {
	local benchmark_block
	benchmark_block="$BASE/current-benchmark-minimum-block.tsv"
	write_benchmark_minimum_block "$benchmark_block"
	{
		echo "# RTC PR Finalization Status"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- max active jobs: $MAX_ACTIVE_JOBS"
			echo "- active finalization jobs: $(active_finalization_sessions)"
			echo "- active benchmark-minimum unblock jobs: $(active_benchmark_unblock_sessions)"
			echo "- active benchmark-harness builder jobs: $(active_benchmark_harness_builder_sessions)"
			echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo
		echo "## Active Sessions"
			tmux ls 2>/dev/null | rg '^rtc-pr-finalize-job-' || true
			tmux ls 2>/dev/null | rg '^rtc-pr-benchmark-minimum-unblock-' || true
			tmux ls 2>/dev/null | rg '^rtc-pr-benchmark-harness-builder-' || true
		echo
		echo "## Launch History"
		tail -30 "$STATE" 2>/dev/null || true
		echo
		echo "## Candidate Branches"
		git -C "$SRC" for-each-ref --sort=-creatordate --format='%(creatordate:iso8601)%09%(refname:short)%09%(objectname:short)' \
			'refs/heads/deferred/rtc-*' 'refs/heads/finalize/rtc-*' 'refs/heads/pr/rtc-*' 'refs/heads/fix/rtc-*' 2>/dev/null |
			head -100 || true
		echo
		echo "## Benchmark Minimum Promotion Block"
		if benchmark_minimum_block_has_rows "$benchmark_block"; then
			sed -n '1,80p' "$benchmark_block"
			echo
				echo "Finalization launch hard-blocked: the benchmark canary exposed missing exact-stack build or benchmark-minimum evidence. Do not mark reload-hydration, large-document collaboration, WebSocket smoke, focused HTTP/WS canary rows, or all-merged stacks maintainer-ready until every row above passes on the exact stack or is explicitly downscoped with replacement evidence."
			echo
			echo "Benchmark-minimum unblock jobs consume one row at a time and record passes in $BENCHMARK_UNBLOCK_OVERRIDES."
			else
				echo "none"
			fi
			echo
			echo "## Required Lower Benchmark Harness Files"
			missing_benchmark_harness_files |
				awk '{ print "- missing: " $0 }'
			if [ -z "$(missing_benchmark_harness_files || true)" ]; then
				echo "all present"
			fi
			echo
			echo "## Recent Reports"
		find "$BASE/cycles" -maxdepth 2 -type f -name 'finalization.report.md' -print 2>/dev/null |
			sort |
			tail -8 |
			while read -r report; do
				echo "### $report"
				sed -n '1,220p' "$report" || true
				echo
			done
	} > "$STATUS.tmp"
	mv "$STATUS.tmp" "$STATUS"
}

log "PR finalization loop started pid=$$"
while true; do
	write_status
	launch_benchmark_harness_builder_job || true
	if benchmark_minimum_block_has_rows "$BASE/current-benchmark-minimum-block.tsv"; then
		launch_benchmark_minimum_unblock_job || true
		log "finalization launch skipped benchmark_minimum_block=$BASE/current-benchmark-minimum-block.tsv"
	elif [ "$(active_finalization_sessions)" -lt "$MAX_ACTIVE_JOBS" ] && ! recently_launched; then
		launch_finalization_job || true
	else
		log "finalization launch skipped active=$(active_finalization_sessions)"
	fi
	write_status
	sleep "$CYCLE_SLEEP_SECONDS"
done
LOOP

chmod +x "$BASE/pr-finalization-loop.sh"
tmux new-session -d -s rtc-pr-finalization-loop "$BASE/pr-finalization-loop.sh"
tmux ls | grep -E 'rtc-pr-finalization|rtc-pr-finalize' || true
