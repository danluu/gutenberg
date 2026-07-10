#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
SRC=${RTC_FOCUSED_SHARDS_SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
HARNESS_SRC=${RTC_FOCUSED_SHARDS_HARNESS_SRC:-$SRC}
mkdir -p "$BASE" "$BASE/repos" "$BASE/runs" "$BASE/logs" "$BASE/wp-env"

case "${RTC_FOCUSED_SHARDS_APPEND_CURRENT:-0}" in
	1|true|TRUE|yes|YES|on|ON)
		RTC_FOCUSED_SHARDS_APPEND_CURRENT=1
		;;
	*)
		RTC_FOCUSED_SHARDS_APPEND_CURRENT=0
		;;
esac

RUN_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RUN_TAG=${RTC_FOCUSED_SHARDS_RUN_TAG:-$RUN_STAMP-$$}
SESSION_SUFFIX=
if [ "$RTC_FOCUSED_SHARDS_APPEND_CURRENT" = 1 ]; then
	SESSION_SUFFIX="-append-$RUN_TAG"
fi
SUPERVISOR_SESSION="rtc-focused-shards$SESSION_SUFFIX"
WATCHDOG_SESSION="rtc-focused-shards-watchdog$SESSION_SUFFIX"
ANALYSIS_SESSION="rtc-focused-shards-analysis$SESSION_SUFFIX"
ANALYSIS_TMUX_PREFIX="rtc-focused-analysis$SESSION_SUFFIX"
SUPERVISOR_LOG="$BASE/logs/supervisor$SESSION_SUFFIX.log"
WATCHDOG_LOG="$BASE/logs/watchdog$SESSION_SUFFIX.log"
ANALYSIS_LOG="$BASE/logs/analysis$SESSION_SUFFIX.log"
DURATION_HOURS=${RTC_FOCUSED_SHARDS_DURATION_HOURS:-12}
export RTC_FOCUSED_SHARDS_WP_ENV_SUFFIX="$SESSION_SUFFIX"

if [ -f "$HARNESS_SRC/bin/rtc-optional-browser-admission-remote.sh" ]; then
	# shellcheck source=/dev/null
	source "$HARNESS_SRC/bin/rtc-optional-browser-admission-remote.sh"
	rtc_optional_browser_admission focused-shards || exit 0
fi


required_manifests=(
	build/scripts/block-library/blocks-manifest.php
	build/scripts/edit-widgets/blocks/blocks-manifest.php
	build/scripts/widgets/blocks/blocks-manifest.php
)

has_required_manifests() {
	local repo=$1
	local manifest
	for manifest in "${required_manifests[@]}"; do
		[ -f "$repo/$manifest" ] || return 1
	done
}

wait_for_required_manifests() {
	local repo=$1
	local label=$2
	local waited=0
	local interval=5
	local max_wait=180

	while ! has_required_manifests "$repo"; do
		if (( waited >= max_wait )); then
			return 1
		fi
		printf '[%s] waiting for generated block manifests label=%s repo=%s waited=%ss\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$repo" "$waited" >&2
		sleep "$interval"
		waited=$(( waited + interval ))
	done
}

if ! wait_for_required_manifests "$SRC" source; then
	printf 'source repo is missing generated block manifests; run npm run build first: %s\n' "$SRC" >&2
	exit 2
fi

exec 7>"$BASE/start.lock"
if ! flock -n 7; then
	printf '[%s] focused start skipped; focused start/cleanup lock is held\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$BASE/logs/cleanup.log"
	exit 0
fi
export RTC_FOCUSED_START_LOCK_HELD=1

if [ "$RTC_FOCUSED_SHARDS_APPEND_CURRENT" = 1 ]; then
	printf '[%s] focused append start skips cleanup run_tag=%s supervisor_session=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RUN_TAG" "$SUPERVISOR_SESSION" >> "$BASE/logs/cleanup.log"
elif [ "${RTC_FOCUSED_SHARDS_SKIP_CLEANUP:-0}" = 1 ]; then
	printf '[%s] focused exact start skips cleanup by RTC_FOCUSED_SHARDS_SKIP_CLEANUP run_tag=%s supervisor_session=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RUN_TAG" "$SUPERVISOR_SESSION" >> "$BASE/logs/cleanup.log"
elif [ -x /tmp/cleanup_rtc_focused_shards.sh ]; then
	RTC_FOCUSED_START_LOCK_HELD=1 /tmp/cleanup_rtc_focused_shards.sh || true
elif [ -x "$HARNESS_SRC/bin/rtc-focused-shards-cleanup-remote.sh" ]; then
	RTC_FOCUSED_START_LOCK_HELD=1 "$HARNESS_SRC/bin/rtc-focused-shards-cleanup-remote.sh" || true
fi

REPOS_BASE="$BASE/repos-$RUN_STAMP-$$"
mkdir -p "$REPOS_BASE"

copy_repo_tree() (
	local src=$1
	local dest=$2
	local item name

	shopt -s dotglob nullglob
	for item in "$src"/*; do
		name=${item##*/}
		case "$name" in
			artifacts)
				continue
				;;
		esac
		cp -al "$item" "$dest/"
	done
)

copy_repo_with_retry() {
	local src=$1
	local dest=$2
	local label=$3
	local attempt

	for attempt in 1 2 3; do
		rm -rf "$dest"
		mkdir -p "$dest"
		if copy_repo_tree "$src" "$dest"; then
			return 0
		fi
		printf '[%s] focused shard repo copy failed profile=%s attempt=%s; retrying\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$attempt" >&2
		sleep $(( attempt * 2 ))
	done

	printf 'focused shard repo copy failed after retries profile=%s source=%s dest=%s\n' "$label" "$src" "$dest" >&2
	return 1
}

copy_path_with_retry() {
	local src=$1
	local dest=$2
	local label=$3
	local attempt

	for attempt in 1 2 3; do
		rm -rf "$dest"
		if cp -al "$src" "$dest"; then
			return 0
		fi
		printf '[%s] focused shard path copy failed label=%s attempt=%s; retrying\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$attempt" >&2
		sleep $(( attempt * 2 ))
	done

	printf 'focused shard path copy failed after retries label=%s source=%s dest=%s\n' "$label" "$src" "$dest" >&2
	return 1
}

overlay_harness_fuzz_bin() {
	local dest=$1
	local label=$2
	local name src target

	[ "$HARNESS_SRC" != "$SRC" ] || return 0
	[ -d "$HARNESS_SRC/bin" ] || return 0
	mkdir -p "$dest/bin"
	for name in \
		rtc-browser-fuzz-launcher.mjs \
		rtc-browser-fuzz-runner.mjs \
		rtc-browser-failure-analysis.schema.json \
		rtc-test-ws-sync-server.mjs
	do
		src="$HARNESS_SRC/bin/$name"
		target="$dest/bin/$name"
		[ -f "$src" ] || continue
		[ ! -e "$target" ] || continue
		if ! cp -al "$src" "$target"; then
			printf 'failed to overlay focused shard harness file profile=%s source=%s dest=%s\n' "$label" "$src" "$target" >&2
			return 1
		fi
	done
}

overlay_harness_fuzz_specs() {
	local dest=$1
	local label=$2
	local name src target target_dir

	[ "$HARNESS_SRC" != "$SRC" ] || return 0
	for name in \
		test/e2e/specs/editor/collaboration/fixtures
	do
		src="$HARNESS_SRC/$name"
		target="$dest/$name"
		[ -d "$src" ] || continue
		copy_path_with_retry "$src" "$target" "$label/$name"
	done
	for name in \
		test/e2e/bin/rtc-test-ws-sync-server.mjs
	do
		src="$HARNESS_SRC/$name"
		target="$dest/$name"
		target_dir=${target%/*}
		[ -f "$src" ] || continue
		mkdir -p "$target_dir"
		rm -f "$target"
		if ! cp -al "$src" "$target"; then
			printf 'failed to overlay focused shard harness helper profile=%s source=%s dest=%s\n' "$label" "$src" "$target" >&2
			return 1
		fi
	done
	for name in \
		test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts
	do
		src="$HARNESS_SRC/$name"
		target="$dest/$name"
		target_dir=${target%/*}
		[ -f "$src" ] || continue
		[ ! -e "$target" ] || continue
		mkdir -p "$target_dir"
		if ! cp -al "$src" "$target"; then
			printf 'failed to overlay focused shard harness spec profile=%s source=%s dest=%s\n' "$label" "$src" "$target" >&2
			return 1
		fi
	done
}

link_e2e_node_modules() {
	local dest=$1
	local label=$2
	local target=$dest/test/e2e/node_modules

	if node - "$dest" <<'NODE' >/dev/null 2>&1
const path = require( 'path' );
const root = process.argv[ 2 ];
const e2ePath = path.join( root, 'test/e2e' );
const wsPath = require.resolve( 'ws', { paths: [ e2ePath ] } );
const wsPackagePath = require.resolve( 'ws/package.json', { paths: [ e2ePath ] } );
const ws = require( wsPath );
const wsPackage = require( wsPackagePath );
const major = Number.parseInt( String( wsPackage.version || '' ).split( '.' )[ 0 ], 10 );
process.exit( major === 8 && !! ws.WebSocketServer ? 0 : 1 );
NODE
	then
		return 0
	fi

	if [ "$HARNESS_SRC" != "$SRC" ] && [ -d "$HARNESS_SRC/test/e2e/node_modules" ]; then
		mkdir -p "$dest/test/e2e"
		rm -rf "$target"
		if ln -s "$HARNESS_SRC/test/e2e/node_modules" "$target" || cp -al "$HARNESS_SRC/test/e2e/node_modules" "$target"; then
			if node - "$dest" <<'NODE' >/dev/null 2>&1
const path = require( 'path' );
const root = process.argv[ 2 ];
const e2ePath = path.join( root, 'test/e2e' );
const wsPath = require.resolve( 'ws', { paths: [ e2ePath ] } );
const wsPackagePath = require.resolve( 'ws/package.json', { paths: [ e2ePath ] } );
const ws = require( wsPath );
const wsPackage = require( wsPackagePath );
const major = Number.parseInt( String( wsPackage.version || '' ).split( '.' )[ 0 ], 10 );
process.exit( major === 8 && !! ws.WebSocketServer ? 0 : 1 );
NODE
			then
				return 0
			fi
		fi
		rm -rf "$target"
	fi

	[ -d "$dest/node_modules/@wordpress/e2e-tests-playwright/node_modules" ] || return 0
	mkdir -p "$dest/test/e2e"
	rm -rf "$target"
	if ! ln -s ../../node_modules/@wordpress/e2e-tests-playwright/node_modules "$target"; then
		printf 'failed to link focused shard e2e dependencies profile=%s dest=%s\n' "$label" "$dest" >&2
		return 1
	fi
}

profiles=(
	late-join-a
	late-join-b
	rich-text-b
	async-server-a
	async-server-b
	auth-locks-a
	auth-locks-b
		long-doc-b
		same-user-stale-tabs
		same-user-stale-tabs-http
		title-reload-http
		existing-post-crdt-http
		ws-code-editor-smoke
		many-user-scale
		ui-signals
		large-http-lifecycle
		large-http-readiness
	)

focused_profile_enabled() {
	local profile="$1"
	local enabled_names="${RTC_FOCUSED_SHARDS_ENABLED_NAMES:-}"
	[ -n "$enabled_names" ] || return 0
	case ",$enabled_names," in
		*,"$profile",*)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

for p in "${profiles[@]}"; do
	focused_profile_enabled "$p" || continue
	d="$REPOS_BASE/$p"
	copy_repo_with_retry "$SRC" "$d" "$p"
	overlay_harness_fuzz_bin "$d" "$p"
	overlay_harness_fuzz_specs "$d" "$p"
	link_e2e_node_modules "$d" "$p"
	if ! has_required_manifests "$d"; then
		copy_path_with_retry "$SRC/build" "$d/build" "$p/build"
	fi
	if ! has_required_manifests "$d"; then
		printf 'focused shard repo is missing generated block manifests after copy: %s\n' "$d" >&2
		exit 2
	fi
done

RUN="$BASE/runs/focused-shards-$RUN_STAMP"
if [ -e "$RUN" ]; then
	RUN="$BASE/runs/focused-shards-$RUN_TAG"
fi
mkdir -p "$RUN"
printf '%s\n' "$RUN" > "$RUN/current-run-root.txt"

node - "$RUN/supervisor-groups.json" "$BASE" "$REPOS_BASE" <<'NODE'
const fs = require('fs');
const out = process.argv[2];
const base = process.argv[3];
const reposBase = process.argv[4] || `${ base }/repos`;
const richSequence = [
	'ui-paste-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-composition-paragraph',
	'ui-toolbar-format-paragraph',
	'ui-cut-copy-paragraph',
	'ui-table-cell-edit',
	'ui-undo-redo-paragraph',
].join(',');
const specs = [
	[
		'late-join-a',
		'three-user-late-join',
		7100001,
		16,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'late-join-b',
		'three-user-late-join',
		7110001,
		18,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '2',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,10',
		},
	],
	[
		'late-join-c',
		'three-user-late-join',
		7120001,
		20,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '3',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,14',
		},
	],
	[
		'revision-recovery-a',
		'revision-persistence',
		7200001,
		18,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '4,12',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3,8,13',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'revision-recovery-b',
		'revision-persistence',
		7210001,
		22,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '2,6,10,14',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,15,20',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,16',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'rich-text-a',
		'real-user-editing',
		7300001,
		18,
		{
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: richSequence,
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '8,16',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'rich-text-b',
		'real-user-editing',
		7310001,
		18,
		{
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: richSequence,
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'format',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '9',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'async-server-a',
		'async-server-blocks',
		7400001,
		24,
		{
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,12,18',
			GUTENBERG_RTC_BROWSER_ASYNC_SERVER_BLOCK_VARIANTS: '6',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'async-server-b',
		'async-server-blocks',
		7410001,
		28,
		{
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '10,20',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'auth-locks-a',
		'permissions-auth-locks',
		7500001,
		16,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'auth-locks-b',
		'permissions-auth-locks',
		7510001,
		18,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5,12',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '9',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'long-doc-a',
		'long-session-large-doc',
		7600001,
		48,
		{
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '96',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1200000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
		},
	],
	[
		'long-doc-b',
		'long-session-large-doc',
		7610001,
		64,
		{
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '128',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '4',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '320',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1500000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1500000',
		},
	],
	[
		'same-user-stale-tabs',
		'session-lifecycle',
		7700001,
		24,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14,20',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'same-user-stale-tabs-http',
		'session-lifecycle',
		7720001,
		24,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14,20',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	],
	[
		'title-reload-http',
		'session-lifecycle',
		7730001,
		10,
		{
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'edit-title,append-paragraph,edit-title,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3,6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
			RTC_FUZZ_SUPERVISOR_BYPASS_PRODUCT_EVIDENCE_NO_ANALYSIS: '1',
		},
	],
	[
		'existing-post-crdt-http',
		'persistence-no-title',
		7735001,
		10,
		{
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,insert-heading,concurrent-paragraphs,edit-paragraph',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3,6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
			RTC_FUZZ_SUPERVISOR_BYPASS_PRODUCT_EVIDENCE_NO_ANALYSIS: '1',
		},
	],
	[
		'ws-code-editor-smoke',
		'parser-transform',
		7737001,
		8,
		{
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-parser-stress-content,reparse-edited-content',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,5',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_RICH_TEXT_COMPARISON: 'dom-equivalent',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
			RTC_FUZZ_SUPERVISOR_BYPASS_PRODUCT_EVIDENCE_NO_ANALYSIS: '1',
		},
	],
		[
			'many-user-scale',
			'many-user-lifecycle',
			7740001,
			14,
			{
				GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_SIZE: '3',
				GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '10',
				GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
				GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
				GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
				GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,13',
				GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
				GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
				GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '24',
				GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
				GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
				GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
				GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '512',
				GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1200000',
				RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
				RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '240000',
				RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			},
		],
		[
			'ui-signals',
			'collaboration-ui-signals',
			7760001,
			10,
			{
				GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
				GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
				GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
				GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
				GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
				GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '6',
				GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'shadow',
				GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
				RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
				RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '45000',
			},
		],
		[
		'large-http-lifecycle',
		'large-post-three-user-http-lifecycle',
		7800001,
		12,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,10',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '64',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'ui-type-paragraph,ui-type-title,append-paragraph,insert-heading,move-block,concurrent-paragraphs,move-block',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
		},
	],
	[
		'large-http-readiness',
		'large-post-three-user-http-lifecycle',
		7810001,
		8,
		{
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,insert-heading,concurrent-paragraphs,move-block',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '75',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'large-document-75',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '0',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
			RTC_FUZZ_SUPERVISOR_BYPASS_PRODUCT_EVIDENCE_NO_ANALYSIS: '1',
		},
	],
];
const defaultEnabledNames = [
	'late-join-b',
	'rich-text-b',
	'async-server-a',
	'async-server-b',
	'auth-locks-a',
	'auth-locks-b',
	'long-doc-b',
	'same-user-stale-tabs',
	'same-user-stale-tabs-http',
	'title-reload-http',
	'existing-post-crdt-http',
	'many-user-scale',
	'ui-signals',
	'large-http-lifecycle',
];
const enabledNames = new Set(
	( process.env.RTC_FOCUSED_SHARDS_ENABLED_NAMES
		? process.env.RTC_FOCUSED_SHARDS_ENABLED_NAMES.split( ',' )
		: defaultEnabledNames
	).map( ( name ) => name.trim() ).filter( Boolean )
);
const portBase = Number.parseInt(
	process.env.RTC_FOCUSED_SHARDS_PORT_BASE || '9700',
	10
);
const wsPortBase = Number.parseInt(
	process.env.RTC_FOCUSED_SHARDS_WS_PORT_BASE || '19400',
	10
);
const seedOffset = Number.parseInt(
	process.env.RTC_FOCUSED_SHARDS_SEED_OFFSET || '0',
	10
);
if ( ! Number.isFinite( seedOffset ) ) {
	throw new Error( 'RTC_FOCUSED_SHARDS_SEED_OFFSET must be an integer.' );
}
const wpEnvSuffix = process.env.RTC_FOCUSED_SHARDS_WP_ENV_SUFFIX || '';
const groups = specs.map( ( spec, index ) => ( { spec, index } ) ).filter(
	( { spec: [ name ] } ) => enabledNames.has( name )
).map(
	( { spec: [ name, actionProfile, startSeed, stepCount, extraEnv ], index: i } ) => {
		const port = portBase + i * 4;
		const wsPort = wsPortBase + i;
		const transport =
			name === 'large-http-lifecycle' ||
			name === 'large-http-readiness' ||
			name === 'same-user-stale-tabs-http' ||
			name === 'title-reload-http' ||
			name === 'existing-post-crdt-http'
				? 'http'
				: 'ws';
		return {
			name: `focused-${ name }`,
			repoRoot: `${ reposBase }/${ name }`,
			transport,
			fuzzLevel: 'browser-e2e',
			lanes: name === 'rich-text-b' ? 4 : 1,
			startSeed: startSeed + seedOffset,
			stepCount,
			...( transport === 'ws' ? { wsPort } : {} ),
			env: {
				WP_ENV_HOME: `${ base }/wp-env/${ name }${ wpEnvSuffix }`,
				WP_ENV_PORT: String( port ),
				WP_ENV_TESTS_PORT: String( port + 1 ),
				RTC_FUZZ_BASE_URL: `http://localhost:${ port }`,
				RTC_FUZZ_ACTION_PROFILE: actionProfile,
				RTC_FUZZ_LOW_DISK_MODE: '1',
				RTC_FUZZ_PLAYWRIGHT_VIDEO: 'off',
				RTC_FUZZ_ANALYSIS_RECHECKS: '1',
				RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
				RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
				GUTENBERG_RTC_BROWSER_ACTION_PROFILE: actionProfile,
				GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS: '120000',
				GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
				GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS:
					extraEnv.GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS ?? '900000',
				RTC_FUZZ_RUN_TIMEOUT_MS:
					extraEnv.RTC_FUZZ_RUN_TIMEOUT_MS ?? '900000',
				...extraEnv,
			},
		};
	}
);
fs.writeFileSync( out, JSON.stringify( groups, null, 2 ) + '\n' );
NODE

cd "$HARNESS_SRC"
node --check bin/rtc-browser-fuzz-supervisor.mjs
node --check bin/rtc-browser-fuzz-watchdog.mjs
node --check bin/rtc-browser-fuzz-live-analysis-monitor.mjs

if jq -e '.[].env | keys[] | select(test("DISABLE_(SYNC_FAULTS|PARSER_STRESS|REVISION_RESTORE|RELOAD|RANDOM_RELOAD)"))' "$RUN/supervisor-groups.json" >/tmp/focused-disable-found.txt; then
	echo "Unexpected disable flags in focused shards:" >&2
	cat /tmp/focused-disable-found.txt >&2
	exit 2
fi

{
	echo "# Focused RTC Shards"
	echo
	echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo "Run root: $RUN"
	echo "Source repo: $SRC"
	echo "Harness repo: $HARNESS_SRC"
	echo
	echo "Purpose: spend spare Jetstream2 CPU/RAM on isolated high-value coverage gaps without sharing the coverage-guided WordPress instance."
	echo "Append mode: $RTC_FOCUSED_SHARDS_APPEND_CURRENT"
	echo "Duration hours: $DURATION_HOURS"
	echo "Supervisor session: $SUPERVISOR_SESSION"
	echo
	jq -r '.[] | "- \(.name): profile=\(.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE), wp=\(.env.RTC_FUZZ_BASE_URL), ws=\(.wsPort), seed=\(.startSeed), steps=\(.stepCount)"' "$RUN/supervisor-groups.json"
	echo
	echo "Disable-flag audit: none of DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, DISABLE_RANDOM_RELOAD present."
} > "$RUN/focused-shards.md"

tmux new-session -d -s "$SUPERVISOR_SESSION" "bash -lc 'cd \"$HARNESS_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=\"$DURATION_HOURS\" RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_TRIAGE_MAX_PARALLEL=1 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=off; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$SUPERVISOR_LOG\" 2>&1'"
tmux new-session -d -s "$WATCHDOG_SESSION" "bash -lc 'cd \"$HARNESS_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$HARNESS_SRC\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=\"$SUPERVISOR_SESSION\" RTC_FUZZ_WATCHDOG_DURATION_HOURS=\"$DURATION_HOURS\" RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$WATCHDOG_LOG\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$WATCHDOG_LOG\"; sleep 30; done'"
tmux new-session -d -s "$ANALYSIS_SESSION" "bash -lc 'cd \"$HARNESS_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$HARNESS_SRC\" RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER=\"$RUN/current-run-root.txt\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=1 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=\"$ANALYSIS_TMUX_PREFIX\" RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP=0 RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL=1 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN\" >> \"$ANALYSIS_LOG\" 2>&1'"
if [ "$RTC_FOCUSED_SHARDS_APPEND_CURRENT" = 1 ]; then
	tmp_roots="$BASE/current-run-roots.txt.tmp.$$"
	{
		sed -n '/./p' "$BASE/current-run-root.txt" 2>/dev/null || true
		sed -n '/./p' "$BASE/current-run-roots.txt" 2>/dev/null || true
		printf '%s\n' "$RUN"
	} | awk '!seen[$0]++' > "$tmp_roots"
	mv "$tmp_roots" "$BASE/current-run-roots.txt"
	if [ ! -s "$BASE/current-run-root.txt" ]; then
		printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"
	fi
else
	printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"
	printf '%s\n' "$RUN" > "$BASE/current-run-roots.txt"
fi

if [ "$RTC_FOCUSED_SHARDS_APPEND_CURRENT" != 1 ]; then
	/tmp/start_rtc_focused_gap_codex_loop.sh 2>/dev/null || true
fi

echo "RUN=$RUN"
tmux ls | grep -E 'rtc-focused|rtc-coverage-guided|rtc-fuzz-strict|strict-expansion-watchdog' || true
