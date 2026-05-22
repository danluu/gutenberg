#!/usr/bin/env Rscript

suppressPackageStartupMessages({
	library(ggplot2)
	library(dplyr)
	library(tidyr)
	library(readr)
	library(stringr)
	library(lubridate)
	library(jsonlite)
	library(RColorBrewer)
	library(scales)
	library(tibble)
	library(purrr)
	library(grid)
})

root <- getwd()
artifact_dir <- file.path(
	root,
	"docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515"
)
data_dir <- file.path( artifact_dir, "data" )
plot_dir <- file.path( artifact_dir, "plots" )
dir.create( data_dir, recursive = TRUE, showWarnings = FALSE )
dir.create( plot_dir, recursive = TRUE, showWarnings = FALSE )

raw_dir <- Sys.getenv( "RTC_TREND_RAW_DIR", unset = file.path( artifact_dir, "raw" ) )
pr_focus_raw_dir <- file.path( raw_dir, "pr-focused" )
monitor_path <- file.path( raw_dir, "monitor.log" )
loop_path <- file.path( raw_dir, "pr-split-loop.log" )
state_path <- file.path( raw_dir, "novelty-state.json" )
novelty_status_path <- file.path( raw_dir, "novelty-status.md" )
cpu_path <- file.path( data_dir, "cpu_utilization.csv" )
load_path <- file.path( data_dir, "load_average.csv" )
disk_path <- file.path( data_dir, "disk_free_space.csv" )
coverage_root_loss_path <- file.path( data_dir, "coverage_root_loss_events.csv" )
activity_path <- file.path( data_dir, "project_activity.csv" )
fuzz_level_mix_path <- file.path( data_dir, "fuzz_level_mix.csv" )
fuzz_level_executions_path <- file.path( data_dir, "fuzz_level_executions.csv" )
current_run_accounting_path <- file.path( data_dir, "current_run_accounting.csv" )
bug_findings_path <- file.path( data_dir, "bug_findings.csv" )
bug_outputs_path <- file.path( data_dir, "bug_outputs.csv" )
combined_ingredient_progress_path <- file.path( data_dir, "combined_ingredient_fuzzing_progress.csv" )
combined_ingredient_goal_progress_path <- file.path( data_dir, "combined_ingredient_fuzzing_goal_progress.csv" )
combined_ingredient_requirements_path <- file.path( data_dir, "combined_ingredient_fuzzing_requirements.csv" )
many_user_active_editing_progress_path <- file.path( data_dir, "many_user_active_editing_progress.csv" )
many_user_active_editing_goal_progress_path <- file.path( data_dir, "many_user_active_editing_goal_progress.csv" )
many_user_active_editing_requirements_path <- file.path( data_dir, "many_user_active_editing_requirements.csv" )
combined_ingredient_profile <- "large-post-three-user-http-lifecycle"
combined_ingredient_group <- "novelty-http-large-post-lifecycle"
combined_ingredient_feature <- "cross-product:large-post-three-user-http-lifecycle"
combined_ingredient_related_goal_ids <- c(
	combined_ingredient_feature,
	"success-profile-users:large-post-three-user-http-lifecycle:3",
	"success-user-blocks:3:50",
	"success-profile:large-post-three-user-http-lifecycle",
	"transport-profile:http:large-post-three-user-http-lifecycle"
)
combined_ingredient_target_default <- 25
many_user_active_editing_profile <- "many-user-active-editing"
many_user_active_editing_groups <- c(
	"novelty-ws-many-user-active-editing",
	"novelty-ws-twelve-user-active-rich-text",
	"novelty-ws-thirty-user-active-editing",
	"novelty-http-many-user-active-editing",
	"novelty-ws-same-user-active-editing",
	"novelty-ws-revision-active-editing",
	"novelty-ws-publish-active-editing"
)
many_user_active_editing_thresholds <- c( 6, 10, 12, 30 )
many_user_active_editing_note_thresholds <- c( 6, 12 )
many_user_active_editing_goal_ids <- c(
	paste0( "success-action-users:", many_user_active_editing_thresholds ),
	paste0( "success-profile-users:many-user-active-editing:", c( 6, 12, 30 ) ),
	paste0( "cross-product:active-editors-lifecycle:users-", many_user_active_editing_thresholds ),
	paste0( "cross-product:active-editors-rich-list-lifecycle:users-", many_user_active_editing_thresholds ),
	paste0( "cross-product:active-editors-ui-signals:users-", many_user_active_editing_thresholds ),
	paste0( "cross-product:active-editors-large-doc:users-", many_user_active_editing_thresholds ),
	paste0( "cross-product:active-editors-notes-lifecycle:users-", many_user_active_editing_note_thresholds ),
	"cross-product:active-editors-http-lifecycle:users-6",
	"http-max-clients-override:true",
	"cross-product:active-editors-same-user-lifecycle:users-6",
	"cross-product:active-editors-revision-restore:users-6",
	"cross-product:active-editors-publish-lifecycle:users-6",
	"success-user-blocks:6:50",
	"success-user-blocks:12:50",
	"success-user-blocks:30:50",
	"success-profile:many-user-active-editing"
)
status_report_rel <- "docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md"
status_report_path <- file.path( root, status_report_rel )
pr_progress_current_path <- file.path( pr_focus_raw_dir, "pr-progress/current-pr-progress.tsv" )
pr_progress_push_manifest_path <- file.path( pr_focus_raw_dir, "pr-progress/current-push-manifest.tsv" )
pr_progress_control_decisions_path <- file.path( pr_focus_raw_dir, "pr-progress/current-control-decisions.tsv" )
pr_progress_controller_log_path <- file.path( pr_focus_raw_dir, "pr-progress/controller.log" )
pr_progress_events_path <- file.path( pr_focus_raw_dir, "pr-progress/events.ndjson" )
artifact_index_artifacts_path <- file.path( pr_focus_raw_dir, "artifact-index/current-artifacts.tsv" )
artifact_index_log_path <- file.path( pr_focus_raw_dir, "artifact-index/artifact-index.log" )
critical_blockers_path <- file.path( pr_focus_raw_dir, "critical-path/blockers.tsv" )
critical_queue_path <- file.path( pr_focus_raw_dir, "critical-path/queue.tsv" )
critical_active_jobs_path <- file.path( pr_focus_raw_dir, "critical-path/active-jobs.tsv" )
critical_lanes_path <- file.path( pr_focus_raw_dir, "critical-path/lanes.tsv" )
critical_no_progress_path <- file.path( pr_focus_raw_dir, "critical-path/no-progress.tsv" )
critical_terminal_ledger_path <- file.path( pr_focus_raw_dir, "critical-path/terminal-ledger.tsv" )
critical_branch_audit_path <- file.path( pr_focus_raw_dir, "critical-path/current-branch-audit.tsv" )
critical_events_path <- file.path( pr_focus_raw_dir, "critical-path/events.ndjson" )
local_publisher_state_path <- file.path( pr_focus_raw_dir, "local-publisher-state.tsv" )

stopifnot( file.exists( monitor_path ) )
stopifnot( file.exists( loop_path ) )
stopifnot( file.exists( state_path ) )

sync_pr_status_links_script <- file.path(
	artifact_dir,
	"scripts/sync-pr-status-links.mjs"
)
if (
	Sys.getenv( "RTC_SYNC_PR_STATUS_LINKS", unset = "1" ) != "0" &&
	file.exists( sync_pr_status_links_script )
) {
	sync_status <- system2(
		"node",
		c(
			sync_pr_status_links_script,
			"--root",
			root,
			"--status-report",
			status_report_rel,
			"--progress-csv",
			pr_progress_current_path
		),
		stdout = TRUE,
		stderr = TRUE
	)
	if ( ! is.null( attr( sync_status, "status" ) ) && attr( sync_status, "status" ) != 0 ) {
		warning( paste( sync_status, collapse = "\n" ) )
	}
}

theme_rtc <- function() {
	theme_minimal( base_size = 11 ) +
		theme(
			panel.grid.minor = element_blank(),
			plot.title.position = "plot",
			plot.caption.position = "plot",
			legend.position = "bottom",
			strip.text = element_text( face = "bold" ),
			axis.text.x = element_text( size = 8 ),
			axis.title.x = element_text( margin = margin( t = 8 ) )
		)
}

scale_time_axis <- function(
	date_breaks = "4 hours",
	date_labels = "%m-%d\n%H:%M"
) {
	scale_x_datetime(
		date_labels = date_labels,
		date_breaks = date_breaks,
		guide = guide_axis( check.overlap = TRUE )
	)
}

scale_y_log2_powers <- function() {
	scale_y_continuous(
		trans = scales::log_trans( base = 2 ),
		breaks = function( limits ) {
			positive_limits <- limits[ is.finite( limits ) & limits > 0 ]
			if ( length( positive_limits ) == 0 ) {
				return( numeric() )
			}
			lower <- max( min( positive_limits, na.rm = TRUE ), 1 )
			upper <- max( positive_limits, na.rm = TRUE )
			powers <- 2 ^ seq(
				floor( log2( lower ) ),
				ceiling( log2( upper ) ),
				by = 1
			)
			powers[ powers >= lower & powers <= upper ]
		},
		minor_breaks = NULL,
		labels = comma
	)
}

write_plot <- function( name, plot, width = 9, height = 6 ) {
	ggsave(
		filename = file.path( plot_dir, name ),
		plot = plot,
		width = width,
		height = height,
		dpi = 160,
		bg = "white"
	)
}

extract_num <- function( lines, pattern ) {
	match <- str_match( lines, pattern )[ , 2 ]
	as.numeric( match )
}

extract_chr <- function( lines, pattern ) {
	str_match( lines, pattern )[ , 2 ]
}

parse_utc_timestamp <- function( timestamp ) {
	if ( inherits( timestamp, "POSIXt" ) ) {
		return( with_tz( timestamp, "UTC" ) )
	}
	ymd_hms( timestamp, tz = "UTC" )
}

first_status_match <- function( lines, pattern ) {
	matches <- str_match( lines, pattern )[ , 2 ]
	matches <- matches[ ! is.na( matches ) ]
	if ( length( matches ) == 0 ) {
		return( NA_character_ )
	}
	matches[ 1 ]
}

first_status_number <- function( lines, pattern ) {
	value <- first_status_match( lines, pattern )
	if ( is.na( value ) ) {
		return( NA_real_ )
	}
	as.numeric( value )
}

state_timestamp <- function( state, name ) {
	value <- state[[ name ]]
	if ( is.null( value ) || length( value ) == 0 || is.na( value ) ) {
		return( as.POSIXct( NA_real_, origin = "1970-01-01", tz = "UTC" ) )
	}
	ymd_hms( as.character( value ), tz = "UTC", quiet = TRUE )
}

parse_status_snapshot_time <- function( lines, fallback ) {
	snapshot <- str_match( lines, "^Snapshot time: `([^`]+)`" )[ , 2 ]
	snapshot <- snapshot[ ! is.na( snapshot ) ][ 1 ]
	if ( is.na( snapshot ) || length( snapshot ) == 0 ) {
		return( fallback )
	}
	parsed <- ymd_hms( snapshot, tz = "UTC", quiet = TRUE )
	if ( is.na( parsed ) ) {
		return( fallback )
	}
	parsed
}

extract_markdown_section <- function( lines, heading ) {
	start <- which( lines == heading )[ 1 ]
	if ( is.na( start ) ) {
		return( character() )
	}
	next_heading <- which( seq_along( lines ) > start & str_detect( lines, "^## " ) )[ 1 ]
	end <- if ( is.na( next_heading ) ) length( lines ) else next_heading - 1
	lines[ start:end ]
}

parse_pr_split_table <- function( lines, commit, commit_time ) {
	section <- extract_markdown_section( lines, "## Proposed PR Split" )
	if ( length( section ) == 0 ) {
		return( tibble() )
	}

	table_lines <- section[ str_detect( section, "^\\| PR" ) ]
	if ( length( table_lines ) < 2 ) {
		return( tibble() )
	}

	header <- table_lines[ 1 ] %>%
		str_remove_all( "^\\||\\|$" ) %>%
		str_split( "\\|", simplify = TRUE ) %>%
		as.character() %>%
		str_trim()

	rows <- table_lines[ -1 ]
	rows <- rows[ ! str_detect( rows, "^\\|\\s*---" ) ]
	if ( length( rows ) == 0 ) {
		return( tibble() )
	}

	diff_idx <- match( "Diff", header )
	pr_idx <- match( "PR", header )
	scope_idx <- match( "Scope", header )
	files_idx <- match( "Files", header )
	status_idx <- match( "Current status", header )
	if ( any( is.na( c( diff_idx, pr_idx ) ) ) ) {
		return( tibble() )
	}

	snapshot_time <- parse_status_snapshot_time( lines, commit_time )

	map_dfr( rows, function( row ) {
		cells <- row %>%
			str_remove_all( "^\\||\\|$" ) %>%
			str_split( "\\|", simplify = TRUE ) %>%
			as.character() %>%
			str_trim()
		if ( length( cells ) < max( diff_idx, pr_idx ) ) {
			return( tibble() )
		}
		diff <- cells[ diff_idx ]
		diff_match <- str_match( diff, "\\+([0-9,]+)\\s*/\\s*-([0-9,]+)" )
		if ( any( is.na( diff_match[ 1, 2:3 ] ) ) ) {
			return( tibble() )
		}
		additions <- as.numeric( str_remove_all( diff_match[ 1, 2 ], "," ) )
		deletions <- as.numeric( str_remove_all( diff_match[ 1, 3 ], "," ) )
		files <- if ( ! is.na( files_idx ) && length( cells ) >= files_idx ) {
			as.numeric( str_remove_all( cells[ files_idx ], "[^0-9]" ) )
		} else {
			NA_real_
		}
		tibble(
			timestamp = snapshot_time,
			commit = commit,
			pr = cells[ pr_idx ],
			scope = if ( ! is.na( scope_idx ) && length( cells ) >= scope_idx ) cells[ scope_idx ] else NA_character_,
			files = files,
			additions = additions,
			deletions = deletions,
			net_loc = additions - deletions,
			status = if ( ! is.na( status_idx ) && length( cells ) >= status_idx ) cells[ status_idx ] else NA_character_
		)
	} )
}

pr_number_levels <- function( pr_values ) {
	pr_values <- unique( pr_values[ ! is.na( pr_values ) ] )
	if ( length( pr_values ) == 0 ) {
		return( character() )
	}

	tibble( pr = pr_values ) %>%
		mutate(
			pr_text = str_to_upper( str_remove_all( pr, "[`*]" ) ),
			pr_number = as.integer(
				str_match( pr_text, "PR\\s*0*([0-9]+)\\s*([A-Z]*)" )[ , 2 ]
			),
			pr_suffix = coalesce(
				str_match( pr_text, "PR\\s*0*([0-9]+)\\s*([A-Z]*)" )[ , 3 ],
				""
			)
		) %>%
		arrange(
			is.na( pr_number ),
			pr_number,
			pr_suffix,
			str_to_upper( pr )
		) %>%
		pull( pr )
}

status_report_history <- function() {
	if ( ! file.exists( status_report_path ) ) {
		return( tibble() )
	}

	log_output <- tryCatch(
		system2(
			"git",
			c( "log", "--follow", "--format=%H%x09%cI", "--", status_report_rel ),
			stdout = TRUE,
			stderr = FALSE
		),
		error = function( e ) character()
	)
	if ( length( log_output ) == 0 ) {
		return( parse_pr_split_table( read_lines( status_report_path, progress = FALSE ), "working-tree", now( tzone = "UTC" ) ) )
	}

	entries <- tibble( raw = rev( log_output ) ) %>%
		separate( raw, into = c( "commit", "commit_time_raw" ), sep = "\t", extra = "merge", fill = "right" ) %>%
		mutate( commit_time = ymd_hms( commit_time_raw, tz = "UTC", quiet = TRUE ) ) %>%
		filter( ! is.na( commit ), commit != "" )

	history <- map_dfr( seq_len( nrow( entries ) ), function( index ) {
		commit <- entries$commit[ index ]
		content <- tryCatch(
			system2( "git", c( "show", paste0( commit, ":", status_report_rel ) ), stdout = TRUE, stderr = FALSE ),
			error = function( e ) character()
		)
		if ( length( content ) == 0 ) {
			return( tibble() )
		}
		parse_pr_split_table( content, commit, entries$commit_time[ index ] )
	} )

	current <- parse_pr_split_table( read_lines( status_report_path, progress = FALSE ), "working-tree", now( tzone = "UTC" ) )
	if ( nrow( current ) > 0 ) {
		latest_commit <- tail( unique( history$commit ), 1 )
		latest_snapshot <- if ( nrow( history ) > 0 ) max( history$timestamp, na.rm = TRUE ) else as.POSIXct( NA )
		if ( is.na( latest_snapshot ) || max( current$timestamp, na.rm = TRUE ) > latest_snapshot || latest_commit != "working-tree" ) {
			history <- bind_rows( history, current )
		}
	}

	history %>%
		filter( ! is.na( timestamp ), ! is.na( net_loc ) ) %>%
		distinct( timestamp, pr, additions, deletions, net_loc, .keep_all = TRUE ) %>%
		arrange( timestamp, pr )
}

named_number_frame <- function( values, name_col, value_col ) {
	if ( is.null( values ) || length( values ) == 0 ) {
		return( tibble( !!name_col := character(), !!value_col := numeric() ) )
	}

	flat <- unlist( values, recursive = TRUE, use.names = TRUE )
	tibble(
		!!name_col := names( flat ),
		!!value_col := as.numeric( flat )
	)
}

read_tsv_optional <- function( path, col_names = TRUE ) {
	if ( ! file.exists( path ) || file.size( path ) == 0 ) {
		return( tibble() )
	}

	tryCatch(
		read_tsv(
			path,
			col_names = col_names,
			col_types = cols( .default = col_character() ),
			show_col_types = FALSE,
			progress = FALSE
		),
		error = function( e ) tibble()
	)
}

read_ndjson_optional <- function( path ) {
	if ( ! file.exists( path ) || file.size( path ) == 0 ) {
		return( tibble() )
	}

	lines <- read_lines( path, progress = FALSE )
	lines <- lines[ lines != "" ]
	if ( length( lines ) == 0 ) {
		return( tibble() )
	}

	tryCatch(
		map_dfr( lines, function( line ) {
			as_tibble( as.list( fromJSON( line, flatten = TRUE ) ) )
		} ),
		error = function( e ) tibble()
	)
}

ensure_columns <- function( data, columns ) {
	for ( column in columns ) {
		if ( ! column %in% names( data ) ) {
			data[[ column ]] <- NA_character_
		}
	}
	data
}

timestamp_from_brackets <- function( lines ) {
	ymd_hms( str_match( lines, "^\\[([^\\]]+)\\]" )[ , 2 ], tz = "UTC" )
}

monitor_lines <- read_lines( monitor_path, progress = FALSE )
pass_lines <- monitor_lines[ str_detect( monitor_lines, "\\] pass:" ) ]

monitor <- tibble(
	timestamp = timestamp_from_brackets( pass_lines ),
	processed = extract_num( pass_lines, "processed=([0-9]+)" ),
	coverage_files = extract_num( pass_lines, "files=([0-9]+)" ),
	records_seen_logged = extract_num( pass_lines, "recordsSeen=([0-9]+)" ),
	new_features = extract_num( pass_lines, "newFeatures=([0-9]+)" ),
	new_cdp = extract_num( pass_lines, "newCdp=([0-9]+)" ),
	unmet_coverage = extract_num( pass_lines, "unmetCoverage=([0-9]+)" ),
	no_progress = extract_num( pass_lines, "noProgress=([0-9]+)" ),
	quality_issues = extract_num( pass_lines, "qualityIssues=([0-9]+)" ),
	summary_startup_failures = extract_num( pass_lines, "summaryStartupFailures=([0-9]+)" ),
	warnings = extract_num( pass_lines, "warnings=([0-9]+)" ),
	headroom = extract_chr( pass_lines, "headroom=([^ ]+)" ),
	likely_real = extract_num( pass_lines, "likelyReal=([0-9]+)" ),
	duplicate_share_current = coalesce(
		extract_num( pass_lines, "actionableDuplicateShareCurrent=([0-9.]+)" ),
		extract_num( pass_lines, "duplicateShareCurrent=([0-9.]+)" ),
		extract_num( pass_lines, "rawDuplicateShareCurrent=([0-9.]+)" )
	),
	duplicate_share_historical = coalesce(
		extract_num( pass_lines, "actionableDuplicateShareHistorical=([0-9.]+)" ),
		extract_num( pass_lines, "duplicateShareHistorical=([0-9.]+)" ),
		extract_num( pass_lines, "rawDuplicateShareHistorical=([0-9.]+)" )
	),
	memory_free_gb = extract_num( pass_lines, "memory=([0-9.]+)G" )
) %>%
	filter( ! is.na( timestamp ) ) %>%
	arrange( timestamp ) %>%
	mutate(
		records_seen_fallback = cumsum( coalesce( processed, 0 ) ),
		records_seen = pmax(
			records_seen_fallback,
			coalesce( records_seen_logged, 0 )
		),
		pass_index = row_number(),
		minutes_since_first = as.numeric( difftime( timestamp, min( timestamp ), units = "mins" ) )
	)

write_csv( monitor, file.path( data_dir, "monitor_passes.csv" ) )

enable_lines <- monitor_lines[ str_detect( monitor_lines, "\\] Enabled .+ group\\." ) ]
enabled_groups <- tibble(
	timestamp = timestamp_from_brackets( enable_lines ),
	group = extract_chr( enable_lines, "Enabled ([^ ]+) group\\." )
) %>%
	filter( ! is.na( timestamp ), ! is.na( group ) ) %>%
	distinct() %>%
	mutate(
		group_family = case_when(
			str_detect( group, "real-user" ) ~ "real-user",
			str_detect( group, "media|async" ) ~ "async/media",
			str_detect( group, "parser" ) ~ "parser",
			str_detect( group, "revision|autosave|persistence" ) ~ "persistence",
			str_detect( group, "permission|auth|lock" ) ~ "auth/locks",
			str_detect( group, "reload|lifecycle|long-session|same-user|three-user" ) ~ "lifecycle",
			str_detect( group, "block|common|structure" ) ~ "block-structure",
			str_detect( group, "http" ) ~ "http",
			TRUE ~ "other"
		)
	)

write_csv( enabled_groups, file.path( data_dir, "enabled_groups.csv" ) )

state <- fromJSON( state_path, flatten = TRUE )

novelty_status_lines <- if ( file.exists( novelty_status_path ) ) {
	read_lines( novelty_status_path, progress = FALSE )
} else {
	character()
}
status_updated <- ymd_hms(
	first_status_match( novelty_status_lines, "^Updated: ([^ ]+)" ),
	tz = "UTC",
	quiet = TRUE
)
if ( is.na( status_updated ) ) {
	status_updated <- if ( nrow( monitor ) > 0 ) max( monitor$timestamp ) else with_tz( now(), "UTC" )
}
current_output_dir <- first_status_match( novelty_status_lines, "^Output dir: (.+)$" )
startup_status <- first_status_match( novelty_status_lines, "^- status: (.+)$" )
status_available <- length( novelty_status_lines ) > 0
full_pass_pending <- any( str_detect( novelty_status_lines, "full coverage pass pending" ) )
pending_until_first_pass <- any( str_detect( novelty_status_lines, "pending until first pass" ) )
last_completed_full_pass_at <- state_timestamp( state, "lastCompletedFullPassAt" )
last_state_update_at <- state_timestamp( state, "lastUpdatedAt" )
last_current_run_triage_completed_at <- state_timestamp( state, "lastCurrentRunTriageCompletedAt" )
latest_completed_monitor_pass_at <- if ( nrow( monitor ) > 0 ) max( monitor$timestamp ) else as.POSIXct( NA_real_, origin = "1970-01-01", tz = "UTC" )
current_run_metrics_trusted <- status_available &&
	! full_pass_pending &&
	! pending_until_first_pass &&
	! is.na( last_completed_full_pass_at )

current_run_accounting_snapshot <- tibble(
	timestamp = floor_date( status_updated, "second" ),
	output_dir = current_output_dir,
	run_id = basename( current_output_dir ),
	status_available = status_available,
	startup_status = startup_status,
	full_pass_pending = full_pass_pending,
	pending_until_first_pass = pending_until_first_pass,
	current_run_metrics_trusted = current_run_metrics_trusted,
	active_run_dirs = first_status_number( novelty_status_lines, "^- active run dirs: ([0-9]+)" ),
	supervisor_groups_file = first_status_number( novelty_status_lines, "^- supervisor groups file: ([0-9]+)" ),
	observed_roots = first_status_number( novelty_status_lines, "^- observed roots: ([0-9]+)" ),
	current_run_signatures = first_status_number( novelty_status_lines, "^- signatures: ([0-9]+)" ),
	current_run_actionable_signatures = first_status_number( novelty_status_lines, "^- actionable signatures: ([0-9]+)" ),
	current_run_product_evidence_signatures = first_status_number( novelty_status_lines, "^- product-evidence signatures: ([0-9]+)" ),
	current_run_top_duplicate_share = first_status_number( novelty_status_lines, "^- top duplicate family share: ([0-9.]+)" ),
	last_completed_full_pass_at = last_completed_full_pass_at,
	last_state_update_at = last_state_update_at,
	last_current_run_triage_completed_at = last_current_run_triage_completed_at,
	latest_completed_monitor_pass_at = latest_completed_monitor_pass_at,
	minutes_since_completed_full_pass = as.numeric(
		difftime( status_updated, last_completed_full_pass_at, units = "mins" )
	),
	minutes_since_state_update = as.numeric(
		difftime( status_updated, last_state_update_at, units = "mins" )
	),
	latest_completed_duplicate_share_current = if ( nrow( monitor ) > 0 ) last( monitor$duplicate_share_current ) else NA_real_,
	latest_completed_summary_startup_failures = if ( nrow( monitor ) > 0 ) last( monitor$summary_startup_failures ) else NA_real_
)

current_run_accounting_existing <- if ( file.exists( current_run_accounting_path ) ) {
	read_csv( current_run_accounting_path, show_col_types = FALSE ) %>%
		mutate(
			timestamp = floor_date( parse_utc_timestamp( timestamp ), "second" ),
			status_available = case_when(
				is.logical( status_available ) ~ status_available,
				str_to_lower( as.character( status_available ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			full_pass_pending = case_when(
				is.logical( full_pass_pending ) ~ full_pass_pending,
				str_to_lower( as.character( full_pass_pending ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			pending_until_first_pass = case_when(
				is.logical( pending_until_first_pass ) ~ pending_until_first_pass,
				str_to_lower( as.character( pending_until_first_pass ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			current_run_metrics_trusted = case_when(
				is.logical( current_run_metrics_trusted ) ~ current_run_metrics_trusted,
				str_to_lower( as.character( current_run_metrics_trusted ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			last_completed_full_pass_at = parse_utc_timestamp( last_completed_full_pass_at ),
			last_state_update_at = parse_utc_timestamp( last_state_update_at ),
			last_current_run_triage_completed_at = parse_utc_timestamp( last_current_run_triage_completed_at ),
			latest_completed_monitor_pass_at = parse_utc_timestamp( latest_completed_monitor_pass_at )
		)
} else {
	tibble()
}

current_run_accounting <- bind_rows(
	current_run_accounting_existing,
	current_run_accounting_snapshot
) %>%
	filter( ! is.na( timestamp ) ) %>%
	arrange( timestamp ) %>%
	distinct( timestamp, output_dir, .keep_all = TRUE )

write_csv( current_run_accounting, current_run_accounting_path )

fuzz_level_mix <- tibble()
if ( file.exists( fuzz_level_mix_path ) ) {
	fuzz_level_mix <- read_csv( fuzz_level_mix_path, show_col_types = FALSE )
	if ( ! "is_latest" %in% names( fuzz_level_mix ) ) {
		fuzz_level_mix$is_latest <- FALSE
	}
	fuzz_level_mix <- fuzz_level_mix %>%
		mutate(
			timestamp = parse_utc_timestamp( timestamp ),
			lanes = replace_na( as.numeric( lanes ), 1 ),
			step_count = replace_na( as.numeric( step_count ), 0 ),
			is_latest = str_to_lower( as.character( is_latest ) ) == "true",
			fuzz_level = replace_na( fuzz_level, "other" ),
			fuzz_level = factor(
				fuzz_level,
				levels = c(
					"browser-e2e",
					"transport-integration",
					"unit-property",
					"coverage-guided-lower-level",
					"backend-api",
					"protocol-server",
					"fuzz-assertion",
					"other"
				)
			)
		) %>%
		filter( ! is.na( timestamp ) )
	write_csv( fuzz_level_mix, fuzz_level_mix_path )
}

fuzz_level_executions <- tibble()
if ( file.exists( fuzz_level_executions_path ) ) {
	fuzz_level_executions <- read_csv( fuzz_level_executions_path, show_col_types = FALSE )
	if ( ! "executions" %in% names( fuzz_level_executions ) ) {
		fuzz_level_executions <- fuzz_level_executions %>%
			mutate(
				is_primary = str_to_lower( as.character( is_primary ) ) == "true",
				ok = str_to_lower( as.character( ok ) ) == "true",
				executions = 1,
				primary_executions = if_else( is_primary, 1, 0 ),
				successful_executions = if_else( ok, 1, 0 )
			)
	}
	if ( ! "approximate" %in% names( fuzz_level_executions ) ) {
		fuzz_level_executions <- fuzz_level_executions %>%
			mutate( approximate = FALSE )
	}
	if ( ! "attempts" %in% names( fuzz_level_executions ) ) {
		fuzz_level_executions <- fuzz_level_executions %>%
			mutate( attempts = 1 )
	}
	if ( ! "failed_attempts" %in% names( fuzz_level_executions ) ) {
		fuzz_level_executions <- fuzz_level_executions %>%
			mutate( failed_attempts = pmax( attempts - if_else( successful_executions > 0, attempts, 0 ), 0 ) )
	}
	if ( ! "duration_ms" %in% names( fuzz_level_executions ) ) {
		fuzz_level_executions <- fuzz_level_executions %>%
			mutate( duration_ms = 0 )
	}
	fuzz_level_executions <- fuzz_level_executions %>%
		mutate(
			timestamp = parse_utc_timestamp( timestamp ),
			across( c( executions, primary_executions, successful_executions, attempts, failed_attempts, duration_ms ), ~ replace_na( as.numeric( .x ), 0 ) ),
			approximate = str_to_lower( as.character( approximate ) ) == "true",
			fuzz_level = replace_na( fuzz_level, "other" ),
			fuzz_level = factor(
				fuzz_level,
				levels = c(
					"browser-e2e",
					"transport-integration",
					"unit-property",
					"coverage-guided-lower-level",
					"backend-api",
					"protocol-server",
					"fuzz-assertion",
					"other"
				)
			)
		) %>%
		filter( ! is.na( timestamp ) )
	write_csv( fuzz_level_executions, fuzz_level_executions_path )
}

bug_findings <- tibble()
if ( file.exists( bug_findings_path ) ) {
	bug_findings <- read_csv( bug_findings_path, show_col_types = FALSE )
	if ( nrow( bug_findings ) > 0 ) {
		if ( ! "is_duplicate" %in% names( bug_findings ) ) {
			bug_findings$is_duplicate <- FALSE
		}
		if ( ! "duplicate_of" %in% names( bug_findings ) ) {
			bug_findings$duplicate_of <- NA_character_
		}
		if ( ! "canonical_bug_key" %in% names( bug_findings ) ) {
			bug_findings$canonical_bug_key <- bug_findings$signature_hash
		}
		bug_findings <- bug_findings %>%
			mutate(
				timestamp = parse_utc_timestamp( timestamp ),
				triaged_at = parse_utc_timestamp( triaged_at ),
				is_duplicate = case_when(
					is.logical( is_duplicate ) ~ is_duplicate,
					str_to_lower( as.character( is_duplicate ) ) == "true" ~ TRUE,
					! is.na( duplicate_of ) & duplicate_of != "" ~ TRUE,
					str_detect( str_to_lower( coalesce( recommended_action, "" ) ), "duplicate|merge_with_duplicate" ) ~ TRUE,
					TRUE ~ FALSE
				),
				classification = replace_na( classification, "unknown" ),
				candidate_status = replace_na( candidate_status, "" ),
				recommended_action = replace_na( recommended_action, "" ),
				profile = replace_na( profile, "unknown" ),
				fuzz_level = replace_na( fuzz_level, "other" ),
				fuzz_level = factor(
					fuzz_level,
					levels = c(
						"browser-e2e",
						"transport-integration",
						"unit-property",
						"coverage-guided-lower-level",
						"backend-api",
						"protocol-server",
						"fuzz-assertion",
						"other"
					)
				),
				is_likely_real = classification == "likely_real",
				is_candidate_signal = classification %in% c( "likely_real", "uncertain" ) |
					str_detect( str_to_lower( candidate_status ), "^needs_" )
			) %>%
			filter( ! is.na( timestamp ) )
	}
	write_csv( bug_findings, bug_findings_path )
}

bug_outputs <- tibble()
if ( file.exists( bug_outputs_path ) ) {
	bug_outputs <- read_csv( bug_outputs_path, show_col_types = FALSE )
} else if ( nrow( bug_findings ) > 0 ) {
	bug_outputs <- bug_findings %>%
		transmute(
			timestamp,
			campaign,
			run,
			group,
			fuzz_level,
			transport,
			profile,
			output_type = "triage-result",
			signal_kind = classification,
			classification,
			is_confirmed_likely_real = is_likely_real & ! is_duplicate,
			is_duplicate,
			canonical_output_key = canonical_bug_key,
			source_key = signature_hash,
			failure_class,
			last_action,
			lifecycle_context,
			source_path,
			log_path = "",
			detail = distinct_bug_type
		)
}
if ( nrow( bug_outputs ) > 0 ) {
	required_bug_output_columns <- c(
		"timestamp",
		"campaign",
		"run",
		"group",
		"fuzz_level",
		"transport",
		"profile",
		"output_type",
		"signal_kind",
		"classification",
		"is_confirmed_likely_real",
		"is_duplicate",
		"canonical_output_key",
		"source_key",
		"failure_class",
		"last_action",
		"lifecycle_context",
		"source_path",
		"log_path",
		"detail"
	)
	for ( column in required_bug_output_columns ) {
		if ( ! column %in% names( bug_outputs ) ) {
			bug_outputs[[ column ]] <- ""
		}
	}
	bug_outputs <- bug_outputs %>%
		mutate(
			timestamp = parse_utc_timestamp( timestamp ),
			is_confirmed_likely_real = case_when(
				is.logical( is_confirmed_likely_real ) ~ is_confirmed_likely_real,
				str_to_lower( as.character( is_confirmed_likely_real ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			is_duplicate = case_when(
				is.logical( is_duplicate ) ~ is_duplicate,
				str_to_lower( as.character( is_duplicate ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
			across(
				c(
					campaign,
					run,
					group,
					transport,
					profile,
					output_type,
					signal_kind,
					classification,
					canonical_output_key,
					source_key,
					failure_class,
					last_action,
					lifecycle_context,
					source_path,
					log_path,
					detail
				),
				~ replace_na( as.character( .x ), "" )
			),
			profile = if_else( profile == "", "unknown", profile ),
			fuzz_level = replace_na( as.character( fuzz_level ), "other" ),
			canonical_output_key = if_else(
				canonical_output_key == "",
				paste( output_type, campaign, group, source_key, detail, sep = ":" ),
				canonical_output_key
			),
			is_unique_bug_output_candidate = ! is_duplicate &
				! signal_kind %in% c(
					"likely_not_real",
					"likely_infra",
					"infra-enospc",
					"harness-no-tests",
					"harness-import"
				) &
				(
					is_confirmed_likely_real |
						signal_kind %in% c(
							"likely_real",
							"uncertain",
							"raw-failure-signature",
							"lower-level-assertion",
							"failed-run"
						)
				),
			fuzz_level = factor(
				fuzz_level,
				levels = c(
					"browser-e2e",
					"transport-integration",
					"unit-property",
					"coverage-guided-lower-level",
					"backend-api",
					"protocol-server",
					"fuzz-assertion",
					"other"
				)
			)
		) %>%
		filter( ! is.na( timestamp ) )
	write_csv( bug_outputs, bug_outputs_path )
}

profile_counts <- named_number_frame( state$recordCountsByProfile, "profile", "records_seen" ) %>%
	full_join(
		named_number_frame( state$successfulRecordCountsByProfile, "profile", "successful_records" ),
		by = "profile"
	) %>%
	full_join(
		named_number_frame( state$startupFailureCountsByProfile, "profile", "startup_failures" ),
		by = "profile"
	) %>%
	mutate(
		across( c( records_seen, successful_records, startup_failures ), ~ replace_na( as.numeric( .x ), 0 ) ),
		success_rate = if_else( records_seen > 0, successful_records / records_seen, NA_real_ ),
		profile_family = case_when(
			str_detect( profile, "real-user" ) ~ "real-user",
			str_detect( profile, "media|async" ) ~ "async/media",
			str_detect( profile, "parser" ) ~ "parser",
			str_detect( profile, "reload|lifecycle|session|long|same-user|three-user" ) ~ "lifecycle",
			str_detect( profile, "revision|persistence" ) ~ "persistence",
			str_detect( profile, "block|common|structure|full" ) ~ "block-structure",
			str_detect( profile, "permission|auth|lock" ) ~ "auth/locks",
			TRUE ~ "other"
		)
	) %>%
	arrange( desc( records_seen ) )

write_csv( profile_counts, file.path( data_dir, "profile_counts.csv" ) )

transport_counts <- named_number_frame( state$recordCountsByTransport, "transport", "records_seen" )
write_csv( transport_counts, file.path( data_dir, "transport_counts.csv" ) )

feature_counts <- named_number_frame( state$featureCounts, "feature", "count" ) %>%
	mutate(
		feature_category = case_when(
			str_starts( feature, "profile:" ) ~ "profile",
			str_starts( feature, "transport" ) ~ "transport",
			str_starts( feature, "block:" ) ~ "block",
			str_starts( feature, "block-depth:" ) ~ "block-depth",
			str_starts( feature, "action:" ) ~ "action",
			str_starts( feature, "action-pair:" ) ~ "action-pair",
			str_starts( feature, "fault:" ) ~ "fault",
			str_starts( feature, "initial:" ) ~ "initial-content",
			str_starts( feature, "history" ) ~ "history",
			str_starts( feature, "invariant" ) ~ "invariant",
			str_starts( feature, "operation" ) ~ "operation-ledger",
			str_starts( feature, "real-user" ) ~ "real-user",
			str_starts( feature, "collaborator" ) ~ "collaborator",
			str_starts( feature, "revision" ) ~ "revision",
			str_starts( feature, "save-count" ) ~ "save",
			str_starts( feature, "reload-count" ) ~ "reload",
			str_starts( feature, "autosave-count" ) ~ "autosave",
			str_starts( feature, "large-document" ) ~ "large-document",
			str_starts( feature, "step-count" ) ~ "step-count",
			str_starts( feature, "payload-size" ) ~ "payload-size",
			str_starts( feature, "serialized-size" ) ~ "serialized-size",
			str_starts( feature, "users:" ) ~ "users",
			str_starts( feature, "lifecycle:" ) ~ "lifecycle",
			str_starts( feature, "auth-session-expiry-probe" ) ~ "auth",
			str_starts( feature, "local-autosave" ) ~ "autosave",
			str_starts( feature, "media-cross-entity" ) ~ "media/cross-entity",
			str_starts( feature, "cross-product:" ) ~ "cross-product",
			str_starts( feature, "cdp" ) ~ "code coverage",
			TRUE ~ "other"
		)
	)

feature_categories <- feature_counts %>%
	group_by( feature_category ) %>%
	summarise(
		keys = n(),
		total_count = sum( count ),
		max_count = max( count ),
		.groups = "drop"
	) %>%
	arrange( desc( total_count ) )

write_csv( feature_counts, file.path( data_dir, "feature_counts.csv" ) )
write_csv( feature_categories, file.path( data_dir, "feature_categories.csv" ) )

coverage_goals <- as_tibble( state$coverageGuidance$goals ) %>%
	mutate(
		count = as.numeric( count ),
		target = as.numeric( target ),
		progress = if_else( target > 0, count / target, NA_real_ ),
		groups = map_chr( groups, ~ paste( .x, collapse = "," ) ),
		goal_family = case_when(
			str_starts( id, "success-profile:" ) ~ "successful profiles",
			str_starts( id, "media-cross-entity" ) ~ "media/cross-entity",
			str_starts( id, "real-user" ) ~ "real-user UI",
			str_starts( id, "initial:" ) ~ "parser seeds",
			str_starts( id, "block:" ) ~ "block coverage",
			str_starts( id, "action:" ) ~ "action coverage",
			str_starts( id, "fault:" ) ~ "fault coverage",
			str_starts( id, "cross-product:" ) ~ "cross-product",
			str_detect( id, "reload|lifecycle|same-user|late-join|step-count|large-document" ) ~ "lifecycle/scale",
			str_detect( id, "revision|autosave|save-count|local-autosave" ) ~ "persistence/revision",
			str_detect( id, "auth|collaborator-role" ) ~ "auth/locks",
			str_detect( id, "cdp" ) ~ "code coverage",
			TRUE ~ "other"
		)
	) %>%
	arrange( met, progress )

write_csv( coverage_goals, file.path( data_dir, "coverage_goals.csv" ) )

combined_ingredient_goal <- coverage_goals %>%
	filter( id == combined_ingredient_feature ) %>%
	slice_head( n = 1 )

combined_ingredient_feature_count <- feature_counts %>%
	filter( feature == combined_ingredient_feature ) %>%
	pull( count )

combined_ingredient_profile_count <- profile_counts %>%
	filter( profile == combined_ingredient_profile ) %>%
	slice_head( n = 1 )

combined_ingredient_completed <- if ( nrow( combined_ingredient_goal ) > 0 ) {
	combined_ingredient_goal$count[[ 1 ]]
} else if ( length( combined_ingredient_feature_count ) > 0 ) {
	combined_ingredient_feature_count[[ 1 ]]
} else {
	0
}

combined_ingredient_target <- if ( nrow( combined_ingredient_goal ) > 0 ) {
	combined_ingredient_goal$target[[ 1 ]]
} else {
	combined_ingredient_target_default
}

combined_ingredient_progress <- tibble(
	generated_at = with_tz( now(), "UTC" ),
	profile = combined_ingredient_profile,
	group = combined_ingredient_group,
	feature = combined_ingredient_feature,
	completed_cross_product_records = combined_ingredient_completed,
	target_records = combined_ingredient_target,
	remaining_records = pmax( combined_ingredient_target - combined_ingredient_completed, 0 ),
	progress = if_else( combined_ingredient_target > 0, combined_ingredient_completed / combined_ingredient_target, NA_real_ ),
	group_enabled = combined_ingredient_group %in% state$enabledGroups,
	profile_records_seen = if ( nrow( combined_ingredient_profile_count ) > 0 ) combined_ingredient_profile_count$records_seen[[ 1 ]] else 0,
	profile_successful_records = if ( nrow( combined_ingredient_profile_count ) > 0 ) combined_ingredient_profile_count$successful_records[[ 1 ]] else 0,
	profile_success_rate = if ( nrow( combined_ingredient_profile_count ) > 0 ) combined_ingredient_profile_count$success_rate[[ 1 ]] else NA_real_
)

combined_ingredient_goal_progress <- bind_rows(
	coverage_goals %>%
		filter( id %in% combined_ingredient_related_goal_ids ) %>%
		select( id, label, count, target, met, progress, goal_family ),
	if ( ! ( combined_ingredient_feature %in% coverage_goals$id ) ) {
		tibble(
			id = combined_ingredient_feature,
			label = "strict combined HTTP large-post three-user lifecycle records",
			count = combined_ingredient_completed,
			target = combined_ingredient_target,
			met = combined_ingredient_completed >= combined_ingredient_target,
			progress = if_else( combined_ingredient_target > 0, combined_ingredient_completed / combined_ingredient_target, NA_real_ ),
			goal_family = "cross-product"
		)
	} else {
		tibble()
	}
) %>%
	mutate(
		count = as.numeric( count ),
		target = as.numeric( target ),
		remaining = pmax( target - count, 0 ),
		progress_capped = pmin( progress, 1 ),
		count_target = paste0( comma( count ), " / ", comma( target ) ),
		label = str_wrap( label, width = 44 )
	) %>%
	arrange( progress_capped, desc( remaining ), label )

combined_ingredient_requirements <- tibble(
	ingredient = c(
		"HTTP polling",
		"large initial post",
		"at least three browser users",
		"at least two lifecycle reloads",
		"save checkpoints",
		"autosave checkpoint",
		"strict persistence oracles",
		"passed run"
	),
	record_check = c(
		"transport == http",
		"initialContentProfile starts with large-document-",
		"userCount >= 3",
		"reload count >= 2",
		"save count >= 2",
		"autosave count >= 1",
		"operation ledger and final persistence are strict",
		"status == passed"
	),
	requirement_family = c(
		"transport",
		"scale",
		"collaboration",
		"lifecycle",
		"persistence",
		"persistence",
		"oracle",
		"completion"
	),
	required_for_cross_product_count = TRUE
)

write_csv( combined_ingredient_progress, combined_ingredient_progress_path )
write_csv( combined_ingredient_goal_progress, combined_ingredient_goal_progress_path )
write_csv( combined_ingredient_requirements, combined_ingredient_requirements_path )

get_goal_numeric <- function( goal_id, field, default = 0 ) {
	row <- coverage_goals %>%
		filter( id == goal_id ) %>%
		slice_head( n = 1 )
	if ( nrow( row ) == 0 || ! field %in% names( row ) ) {
		return( default )
	}
	value <- suppressWarnings( as.numeric( row[[ field ]][[ 1 ]] ) )
	ifelse( is.na( value ), default, value )
}

get_feature_numeric <- function( feature_id, default = 0 ) {
	row <- feature_counts %>%
		filter( feature == feature_id ) %>%
		slice_head( n = 1 )
	if ( nrow( row ) == 0 ) {
		return( default )
	}
	value <- suppressWarnings( as.numeric( row$count[[ 1 ]] ) )
	ifelse( is.na( value ), default, value )
}

many_user_active_editing_profile_count <- profile_counts %>%
	filter( profile == many_user_active_editing_profile ) %>%
	slice_head( n = 1 )

many_user_active_editing_progress <- tibble(
	generated_at = with_tz( now(), "UTC" ),
	threshold = many_user_active_editing_thresholds
) %>%
	rowwise() %>%
	mutate(
		success_action_goal = paste0( "success-action-users:", threshold ),
		lifecycle_feature = paste0( "cross-product:active-editors-lifecycle:users-", threshold ),
		rich_list_feature = paste0( "cross-product:active-editors-rich-list-lifecycle:users-", threshold ),
		ui_signal_feature = paste0( "cross-product:active-editors-ui-signals:users-", threshold ),
		large_doc_feature = paste0( "cross-product:active-editors-large-doc:users-", threshold ),
		notes_lifecycle_feature = paste0( "cross-product:active-editors-notes-lifecycle:users-", threshold ),
		http_lifecycle_feature = "cross-product:active-editors-http-lifecycle:users-6",
		same_user_lifecycle_feature = "cross-product:active-editors-same-user-lifecycle:users-6",
		revision_restore_feature = "cross-product:active-editors-revision-restore:users-6",
		publish_lifecycle_feature = "cross-product:active-editors-publish-lifecycle:users-6",
		successful_active_editor_records = get_goal_numeric( success_action_goal, "count", 0 ),
		successful_active_editor_target = get_goal_numeric( success_action_goal, "target", if_else( threshold >= 30, 3, if_else( threshold >= 10, 10, 25 ) ) ),
		lifecycle_records = get_feature_numeric( lifecycle_feature, get_goal_numeric( lifecycle_feature, "count", 0 ) ),
		rich_list_lifecycle_records = get_feature_numeric( rich_list_feature, get_goal_numeric( rich_list_feature, "count", 0 ) ),
		ui_signal_records = get_feature_numeric( ui_signal_feature, get_goal_numeric( ui_signal_feature, "count", 0 ) ),
		large_doc_records = get_feature_numeric( large_doc_feature, get_goal_numeric( large_doc_feature, "count", 0 ) ),
		notes_lifecycle_records = if_else(
			threshold %in% many_user_active_editing_note_thresholds,
			get_feature_numeric( notes_lifecycle_feature, get_goal_numeric( notes_lifecycle_feature, "count", 0 ) ),
			NA_real_
		),
		http_lifecycle_records = if_else(
			threshold == 6,
			get_feature_numeric( http_lifecycle_feature, get_goal_numeric( http_lifecycle_feature, "count", 0 ) ),
			NA_real_
		),
		same_user_lifecycle_records = if_else(
			threshold == 6,
			get_feature_numeric( same_user_lifecycle_feature, get_goal_numeric( same_user_lifecycle_feature, "count", 0 ) ),
			NA_real_
		),
		revision_restore_records = if_else(
			threshold == 6,
			get_feature_numeric( revision_restore_feature, get_goal_numeric( revision_restore_feature, "count", 0 ) ),
			NA_real_
		),
		publish_lifecycle_records = if_else(
			threshold == 6,
			get_feature_numeric( publish_lifecycle_feature, get_goal_numeric( publish_lifecycle_feature, "count", 0 ) ),
			NA_real_
		),
		progress = if_else( successful_active_editor_target > 0, successful_active_editor_records / successful_active_editor_target, NA_real_ ),
		remaining_records = pmax( successful_active_editor_target - successful_active_editor_records, 0 )
	) %>%
	ungroup() %>%
	mutate(
		group_enabled = map_lgl( threshold, ~ any( many_user_active_editing_groups %in% state$enabledGroups ) ),
		profile_records_seen = if ( nrow( many_user_active_editing_profile_count ) > 0 ) many_user_active_editing_profile_count$records_seen[[ 1 ]] else 0,
		profile_successful_records = if ( nrow( many_user_active_editing_profile_count ) > 0 ) many_user_active_editing_profile_count$successful_records[[ 1 ]] else 0,
		profile_success_rate = if ( nrow( many_user_active_editing_profile_count ) > 0 ) many_user_active_editing_profile_count$success_rate[[ 1 ]] else NA_real_
	)

many_user_active_existing_goals <- coverage_goals %>%
	filter( id %in% many_user_active_editing_goal_ids ) %>%
	select( id, label, count, target, met, progress, goal_family )

many_user_active_missing_goals <- tibble( id = many_user_active_editing_goal_ids ) %>%
	anti_join( many_user_active_existing_goals, by = "id" ) %>%
	mutate(
		label = str_replace_all( id, "[-:]", " " ),
		count = map_dbl( id, get_feature_numeric ),
		target = case_when(
			str_detect( id, "active-editors-notes-lifecycle:users-12" ) ~ 5,
			str_detect( id, "active-editors-notes-lifecycle:users-6" ) ~ 10,
			str_detect( id, "active-editors-http-lifecycle:users-6" ) ~ 10,
			str_detect( id, "http-max-clients-override:true" ) ~ 10,
			str_detect( id, "active-editors-same-user-lifecycle:users-6" ) ~ 10,
			str_detect( id, "active-editors-revision-restore:users-6" ) ~ 10,
			str_detect( id, "active-editors-publish-lifecycle:users-6" ) ~ 10,
			str_detect( id, "30" ) ~ 3,
			str_detect( id, "10|12" ) ~ 10,
			TRUE ~ 25
		),
		met = count >= target,
		progress = if_else( target > 0, count / target, NA_real_ ),
		goal_family = case_when(
			str_starts( id, "cross-product:" ) ~ "cross-product",
			str_detect( id, "blocks" ) ~ "lifecycle/scale",
			TRUE ~ "user-document-concurrency"
		)
	)

many_user_active_editing_goal_progress <- bind_rows(
	many_user_active_existing_goals,
	many_user_active_missing_goals
) %>%
	mutate(
		count = as.numeric( count ),
		target = as.numeric( target ),
		remaining = pmax( target - count, 0 ),
		progress_capped = pmin( progress, 1 ),
		count_target = paste0( comma( count ), " / ", comma( target ) ),
		label = str_wrap( label, width = 46 )
	) %>%
	arrange( progress_capped, desc( remaining ), label )

many_user_active_editing_requirements <- tibble(
	ingredient = c(
		"passed run",
		"at least N browser users",
		"at least N active editors",
		"late join",
		"save and reload",
		"autosave checkpoint",
		"rich text and list actions",
		"synced collaboration note",
		"presence and cursor signals",
		"large document edge",
		"HTTP polling transport",
		"HTTP client-limit override",
		"same-user tabs",
		"revision restore",
		"publish transition"
	),
	record_check = c(
		"status == passed",
		"userCount >= N",
		"distinct editing action/operation userIndex count >= N, excluding final UI witness-sweep-only edits",
		"late-join lifecycle event is present",
		"save count >= 1 and reload count >= 1",
		"autosave count >= 1 for rich/list lifecycle",
		"paste + link + list indent in one record",
		"ui-add-note action + remote note visibility",
		"presence-list ok + remote-selection-cursor ok",
		"block count or initial large-document profile >= 50",
		"transport == http for the HTTP active-editor cross-product",
		"http-max-clients-override:true feature reaches target",
		"collaboratorMode == same-user for the same-user active-editor cross-product",
		"eligible revision restore completes with status ok",
		"final-persistence-publish completes with status ok"
	),
	requirement_family = c(
		"completion",
		"scale",
		"active editing",
		"lifecycle",
		"persistence",
		"persistence",
		"real-user UI",
		"collaboration UI",
		"collaboration UI",
		"scale",
		"transport",
		"transport",
		"identity",
		"persistence",
		"persistence"
	),
	required_for_cross_product_count = TRUE
)

write_csv( many_user_active_editing_progress, many_user_active_editing_progress_path )
write_csv( many_user_active_editing_goal_progress, many_user_active_editing_goal_progress_path )
write_csv( many_user_active_editing_requirements, many_user_active_editing_requirements_path )

action_counts <- imap_dfr(
	state$successfulActionCountsByProfile,
	~ named_number_frame( .x, "action", "count" ) %>% mutate( profile = .y )
) %>%
	arrange( desc( count ) )

write_csv( action_counts, file.path( data_dir, "successful_action_counts.csv" ) )

loop_lines <- read_lines( loop_path, progress = FALSE )
pr_events <- tibble(
	timestamp = ymd_hms( str_sub( loop_lines, 1, 20 ), tz = "UTC" ),
	message = str_trim( str_sub( loop_lines, 22 ) )
) %>%
	filter( ! is.na( timestamp ) ) %>%
	mutate(
		event_type = case_when(
			str_detect( message, "^loop started" ) ~ "loop start",
			str_detect( message, "^starting PR split review cycle" ) ~ "review start",
			str_detect( message, "^finished PR split review cycle" ) ~ "review finish",
			str_detect( message, "^running feedback action" ) ~ "feedback start",
			str_detect( message, "^finished feedback action" ) ~ "feedback finish",
			TRUE ~ "other"
		),
		cycle = coalesce(
			str_match( message, "cycle ([0-9]{8}T[0-9]{6}Z)" )[ , 2 ],
			str_match( message, "after cycle ([0-9]+)" )[ , 2 ]
		),
		max_parallel = extract_num( message, "max_parallel=([0-9]+)" ),
		interval_s = extract_num( message, "interval=([0-9]+)s" )
	)

review_durations <- pr_events %>%
	filter( event_type %in% c( "review start", "review finish" ) ) %>%
	select( timestamp, event_type, cycle ) %>%
	group_by( cycle, event_type ) %>%
	summarise(
		timestamp = if ( first( event_type ) == "review finish" ) {
			max( timestamp )
		} else {
			min( timestamp )
		},
		.groups = "drop"
	) %>%
	pivot_wider( names_from = event_type, values_from = timestamp ) %>%
	filter( ! is.na( `review start` ), ! is.na( `review finish` ) ) %>%
	mutate( duration_minutes = as.numeric( difftime( `review finish`, `review start`, units = "mins" ) ) )

feedback_durations <- pr_events %>%
	filter( event_type %in% c( "feedback start", "feedback finish" ) ) %>%
	select( timestamp, event_type, cycle ) %>%
	group_by( cycle, event_type ) %>%
	summarise(
		timestamp = if ( first( event_type ) == "feedback finish" ) {
			max( timestamp )
		} else {
			min( timestamp )
		},
		.groups = "drop"
	) %>%
	pivot_wider( names_from = event_type, values_from = timestamp ) %>%
	filter( ! is.na( `feedback start` ), ! is.na( `feedback finish` ) ) %>%
	mutate( duration_minutes = as.numeric( difftime( `feedback finish`, `feedback start`, units = "mins" ) ) )

write_csv( pr_events, file.path( data_dir, "pr_review_events.csv" ) )
write_csv( review_durations, file.path( data_dir, "pr_review_durations.csv" ) )
write_csv( feedback_durations, file.path( data_dir, "pr_feedback_durations.csv" ) )

pr_suggested_loc <- status_report_history()
write_csv( pr_suggested_loc, file.path( data_dir, "pr_suggested_net_loc.csv" ) )

pr_progress_current <- read_tsv_optional( pr_progress_current_path )
if ( nrow( pr_progress_current ) > 0 ) {
	pr_progress_current <- pr_progress_current %>%
		mutate(
			timestamp = parse_utc_timestamp( generated_at ),
			across( c( item_id, kind, priority, status, branch_or_target, next_action, evidence ), ~ replace_na( as.character( .x ), "" ) ),
			priority = if_else( priority == "", "unknown", priority ),
			status = if_else( status == "", "unknown", status ),
			kind = if_else( kind == "", "unknown", kind )
		) %>%
		filter( ! is.na( timestamp ) )
}

pr_progress_state_counts <- if ( nrow( pr_progress_current ) > 0 ) {
	pr_progress_current %>%
		distinct( item_id, kind, priority, status ) %>%
		count( kind, priority, status, name = "items" ) %>%
		arrange( kind, priority, status )
} else {
	tibble( kind = character(), priority = character(), status = character(), items = numeric() )
}
write_csv( pr_progress_state_counts, file.path( data_dir, "pr_progress_state_counts.csv" ) )
write_csv( pr_progress_current, file.path( data_dir, "pr_progress_current.csv" ) )

pr_progress_push_manifest <- read_tsv_optional( pr_progress_push_manifest_path )
if ( nrow( pr_progress_push_manifest ) > 0 ) {
	for ( column in c( "files_changed", "insertions", "deletions" ) ) {
		if ( ! column %in% names( pr_progress_push_manifest ) ) {
			pr_progress_push_manifest[[ column ]] <- NA_character_
		}
	}
	pr_progress_push_manifest <- pr_progress_push_manifest %>%
		mutate(
			across( c( source_branch, source_commit, intended_danluu_branch, base_ref, validation_summary, reason ), ~ replace_na( as.character( .x ), "" ) ),
			across( c( files_changed, insertions, deletions ), ~ as.numeric( str_remove_all( as.character( .x ), "," ) ) ),
			net_loc = replace_na( insertions, 0 ) - replace_na( deletions, 0 ),
			branch_short = source_branch %>%
				str_remove( "^ready/rtc-" ) %>%
				str_remove( "^ready/" ) %>%
				str_replace_all( "-", " " ) %>%
				str_wrap( width = 34 )
		)
}
write_csv( pr_progress_push_manifest, file.path( data_dir, "pr_progress_push_manifest.csv" ) )

pr_progress_control_decisions <- read_tsv_optional( pr_progress_control_decisions_path )
if ( nrow( pr_progress_control_decisions ) > 0 ) {
	pr_progress_control_decisions <- pr_progress_control_decisions %>%
		ensure_columns( c( "action", "target", "priority", "allowed", "reason" ) ) %>%
		mutate(
			across( c( action, target, priority, allowed, reason ), ~ replace_na( as.character( .x ), "" ) ),
			allowed = str_to_lower( allowed )
		)
}
write_csv( pr_progress_control_decisions, file.path( data_dir, "pr_progress_control_decisions.csv" ) )

pr_controller_events <- tibble()
if ( file.exists( pr_progress_controller_log_path ) ) {
	controller_lines <- read_lines( pr_progress_controller_log_path, progress = FALSE )
	pr_controller_events <- tibble(
		timestamp = timestamp_from_brackets( controller_lines ),
		message = str_trim( str_remove( controller_lines, "^\\[[^\\]]+\\]\\s*" ) )
	) %>%
		filter( ! is.na( timestamp ), message != "" ) %>%
		mutate(
			event_type = case_when(
				str_detect( message, "^PR progress controller started" ) ~ "controller start",
				str_detect( message, "^launched persona controller round" ) ~ "persona round launched",
				str_detect( message, "^launched PR07C owner matrix job" ) ~ "PR07C owner job launched",
				str_detect( message, "discovery reserve protected" ) ~ "heavy PR job deferred: discovery reserve",
				str_detect( message, "persona decisions blocked" ) ~ "heavy PR job blocked by persona",
				str_detect( message, "active PR jobs" ) ~ "heavy PR job deferred: PR concurrency",
				str_detect( message, "job already active" ) ~ "heavy PR job already active",
				TRUE ~ "other"
			)
		)
}

pr_progress_events <- read_ndjson_optional( pr_progress_events_path )
if ( nrow( pr_progress_events ) > 0 ) {
	pr_progress_events <- pr_progress_events %>%
		ensure_columns( c( "ts", "type", "message" ) ) %>%
		transmute(
			timestamp = parse_utc_timestamp( ts ),
			message = replace_na( as.character( message ), "" ),
			event_type = case_when(
				type == "persona" ~ "persona round launched",
				type == "job" & str_detect( message, "owner" ) ~ "PR owner job event",
				type == "decision" ~ "control decision",
				TRUE ~ replace_na( as.character( type ), "other" )
			)
		) %>%
		filter( ! is.na( timestamp ), message != "" )
	pr_controller_events <- bind_rows( pr_controller_events, pr_progress_events ) %>%
		distinct( timestamp, message, event_type, .keep_all = TRUE ) %>%
		arrange( timestamp )
}
write_csv( pr_controller_events, file.path( data_dir, "pr_progress_controller_events.csv" ) )

critical_path_events <- read_ndjson_optional( critical_events_path )
if ( nrow( critical_path_events ) > 0 ) {
	critical_path_events <- critical_path_events %>%
		ensure_columns( c( "ts", "type", "message" ) ) %>%
		transmute(
			timestamp = parse_utc_timestamp( ts ),
			event_type = replace_na( as.character( type ), "unknown" ),
			message = replace_na( as.character( message ), "" )
		) %>%
		filter( ! is.na( timestamp ), message != "" ) %>%
		mutate(
			target = case_when(
				str_detect( message, "^continuation " ) ~ str_match( message, "^continuation ([^ ]+)" )[ , 2 ],
				str_detect( message, "^validation branch-" ) ~ str_match( message, "^validation branch-([^ ]+)" )[ , 2 ],
				TRUE ~ "unknown"
			),
			blocker_class = case_when(
				str_detect( target, "benchmark-canary" ) ~ "benchmark canary/exact-stack",
				str_detect( target, "reload-hydration|deferred" ) ~ "deferred-family validation",
				str_detect( target, "pr07c|PR07C" ) ~ "PR07C owner evidence",
				str_detect( target, "seed-|pr17" ) ~ "seed reducer/final-stack",
				TRUE ~ "critical-path launch"
			)
		)
} else {
	critical_path_events <- tibble(
		timestamp = as.POSIXct( numeric(), origin = "1970-01-01", tz = "UTC" ),
		event_type = character(),
		message = character(),
		target = character(),
		blocker_class = character()
	)
}
write_csv( critical_path_events, file.path( data_dir, "critical_path_events.csv" ) )

controller_stall_events <- if ( nrow( pr_controller_events ) > 0 ) {
	pr_controller_events %>%
		filter(
			str_detect( event_type, "deferred|blocked|already active" ) |
				str_detect( message, "not launching|blocked|deferred|gate|exact-stack|cooldown" )
		) %>%
		transmute(
			timestamp,
			source = "PR controller",
			blocker_class = case_when(
				str_detect( event_type, "discovery reserve" ) ~ "resource/discovery reserve",
				str_detect( event_type, "concurrency|already active" ) ~ "single-flight/concurrency",
				str_detect( event_type, "persona" ) ~ "persona/control block",
				str_detect( message, "latest no-promote" ) ~ "consumed owner evidence",
				TRUE ~ event_type
			),
			target = case_when(
				str_detect( message, "PR07C" ) ~ "PR07C/HOLD-07C",
				TRUE ~ ""
			),
			event_type,
			message
		)
} else {
	tibble()
}

critical_launch_events <- if ( nrow( critical_path_events ) > 0 ) {
	critical_path_events %>%
		filter( event_type == "launch" ) %>%
		transmute(
			timestamp,
			source = "critical-path launches",
			blocker_class,
			target,
			event_type,
			message
		)
} else {
	tibble()
}

pr_blocker_stall_events <- bind_rows( controller_stall_events, critical_launch_events ) %>%
	ensure_columns( c( "timestamp", "source", "blocker_class", "target", "event_type", "message" ) ) %>%
	filter( ! is.na( timestamp ), blocker_class != "" ) %>%
	mutate(
		bucket = floor_date( timestamp, unit = "30 minutes" ),
		target = replace_na( as.character( target ), "" )
	) %>%
	group_by( bucket, source, blocker_class ) %>%
	summarise(
		events = n(),
		targets = paste( head( unique( target[ target != "" ] ), 5 ), collapse = "; " ),
		.groups = "drop"
	) %>%
	arrange( bucket, source, blocker_class )
write_csv( pr_blocker_stall_events, file.path( data_dir, "pr_blocker_stall_events.csv" ) )

artifact_index_artifacts <- read_tsv_optional( artifact_index_artifacts_path )
if ( nrow( artifact_index_artifacts ) > 0 ) {
	artifact_index_artifacts <- artifact_index_artifacts %>%
		mutate(
			mtime_utc = parse_utc_timestamp( mtime_utc ),
			across( c( root, kind, run_id, path, tags ), ~ replace_na( as.character( .x ), "" ) )
		) %>%
		filter( ! is.na( mtime_utc ) )
}

artifact_index_scope <- if ( nrow( artifact_index_artifacts ) > 0 ) {
	artifact_index_artifacts %>%
		count( root, kind, name = "artifacts" ) %>%
		arrange( root, desc( artifacts ) )
} else {
	tibble( root = character(), kind = character(), artifacts = numeric() )
}
write_csv( artifact_index_scope, file.path( data_dir, "artifact_index_scope.csv" ) )

artifact_index_events <- tibble()
if ( file.exists( artifact_index_log_path ) ) {
	index_log_lines <- read_lines( artifact_index_log_path, progress = FALSE )
	artifact_index_events <- tibble(
		timestamp = timestamp_from_brackets( index_log_lines ),
		message = str_trim( str_remove( index_log_lines, "^\\[[^\\]]+\\]\\s*" ) ),
		artifacts = extract_num( index_log_lines, "indexed artifacts=([0-9]+)" ),
		branches = extract_num( index_log_lines, "branches=([0-9]+)" )
	) %>%
		filter( ! is.na( timestamp ) )
}
write_csv( artifact_index_events, file.path( data_dir, "artifact_index_events.csv" ) )

critical_blockers <- read_tsv_optional( critical_blockers_path )
if ( nrow( critical_blockers ) > 0 ) {
	critical_blockers <- critical_blockers %>%
		ensure_columns( c( "blocker_id", "kind", "priority", "state", "source_input", "blocks", "blocked_by", "required_artifacts", "active_session", "next_action", "updated_at" ) ) %>%
		mutate(
			updated_at = parse_utc_timestamp( updated_at ),
			across( c( blocker_id, kind, priority, state, source_input, blocks, blocked_by, required_artifacts, active_session, next_action ), ~ replace_na( as.character( .x ), "" ) )
		)
}
write_csv( critical_blockers, file.path( data_dir, "critical_path_blockers.csv" ) )

critical_queue <- read_tsv_optional( critical_queue_path )
if ( nrow( critical_queue ) > 0 ) {
	critical_queue <- critical_queue %>%
		ensure_columns( c( "job_id", "lane_id", "blocker_id", "action_kind", "dedupe_key", "resource_class", "priority", "state", "attempt", "session", "created_at", "started_at", "updated_at", "exit_code", "result" ) ) %>%
		mutate(
			across( c( job_id, lane_id, blocker_id, action_kind, dedupe_key, resource_class, priority, state, session, exit_code, result ), ~ replace_na( as.character( .x ), "" ) ),
			attempt = as.numeric( attempt ),
			created_at = parse_utc_timestamp( created_at ),
			started_at = parse_utc_timestamp( started_at ),
			updated_at = parse_utc_timestamp( updated_at )
		)
}
write_csv( critical_queue, file.path( data_dir, "critical_path_queue.csv" ) )

critical_active_jobs <- read_tsv_optional( critical_active_jobs_path )
if ( nrow( critical_active_jobs ) > 0 ) {
	critical_active_jobs <- critical_active_jobs %>%
		ensure_columns( c( "session", "class", "started_hint" ) ) %>%
		mutate( across( c( session, class, started_hint ), ~ replace_na( as.character( .x ), "" ) ) )
}
write_csv( critical_active_jobs, file.path( data_dir, "critical_path_active_jobs.csv" ) )

critical_lanes <- read_tsv_optional( critical_lanes_path )
if ( nrow( critical_lanes ) > 0 ) {
	critical_lanes <- critical_lanes %>%
		ensure_columns( c( "lane_id", "pr_id", "lane_kind", "publication_class", "resource_class", "dependencies", "state" ) ) %>%
		mutate( across( c( lane_id, pr_id, lane_kind, publication_class, resource_class, dependencies, state ), ~ replace_na( as.character( .x ), "" ) ) )
}
write_csv( critical_lanes, file.path( data_dir, "critical_path_lanes.csv" ) )

critical_no_progress <- read_tsv_optional( critical_no_progress_path )
if ( nrow( critical_no_progress ) > 0 ) {
	continuation_item <- str_match( critical_no_progress$artifact_path, "/continuations/([^/]+)/" )[ , 2 ]
	validation_item <- str_match( critical_no_progress$artifact_path, "/validations/([^/]+)/" )[ , 2 ]
	critical_no_progress <- critical_no_progress %>%
		ensure_columns( c( "artifact_path", "reason", "size", "mtime", "associated_job", "rejected_at" ) ) %>%
		mutate(
			across( c( artifact_path, reason, associated_job ), ~ replace_na( as.character( .x ), "" ) ),
			size = as.numeric( size ),
			mtime = as.numeric( mtime ),
			rejected_at = parse_utc_timestamp( rejected_at ),
			item_id = coalesce( continuation_item, validation_item, na_if( associated_job, "" ), "unknown" )
		)
}
write_csv( critical_no_progress, file.path( data_dir, "critical_path_no_progress.csv" ) )

critical_no_progress_summary <- if ( nrow( critical_no_progress ) > 0 ) {
	critical_no_progress %>%
		count( item_id, reason, name = "rejections" ) %>%
		arrange( desc( rejections ), item_id ) %>%
		slice_head( n = 25 )
} else {
	tibble( item_id = character(), reason = character(), rejections = numeric() )
}
write_csv( critical_no_progress_summary, file.path( data_dir, "critical_path_no_progress_summary.csv" ) )

critical_terminal_ledger <- read_tsv_optional( critical_terminal_ledger_path )
if ( nrow( critical_terminal_ledger ) > 0 ) {
	critical_terminal_ledger <- critical_terminal_ledger %>%
		ensure_columns( c( "lane_id", "classification", "evidence_path", "evidence_mtime", "queue_state", "reopen_condition" ) ) %>%
		mutate(
			across( c( lane_id, classification, evidence_path, queue_state, reopen_condition ), ~ replace_na( as.character( .x ), "" ) ),
			evidence_mtime = as.numeric( evidence_mtime )
		)
}
write_csv( critical_terminal_ledger, file.path( data_dir, "critical_path_terminal_ledger.csv" ) )

critical_branch_audit <- read_tsv_optional( critical_branch_audit_path )
if ( nrow( critical_branch_audit ) > 0 ) {
	critical_branch_audit <- critical_branch_audit %>%
		ensure_columns( c( "lane_id", "branch", "base_ref", "base_sha", "head_sha", "file_count", "net_loc", "diff_check_rc", "state", "report_path" ) ) %>%
		mutate(
			across( c( lane_id, branch, base_ref, base_sha, head_sha, state, report_path ), ~ replace_na( as.character( .x ), "" ) ),
			file_count = as.numeric( file_count ),
			net_loc = as.numeric( net_loc ),
			diff_check_rc = as.numeric( diff_check_rc ),
			result = if_else( diff_check_rc == 0, "pass", "fail" )
		)
}
write_csv( critical_branch_audit, file.path( data_dir, "critical_path_branch_audit.csv" ) )

critical_branch_validation_summary <- if ( nrow( critical_branch_audit ) > 0 ) {
	critical_branch_audit %>%
		count( branch, result, name = "attempts" ) %>%
		pivot_wider( names_from = result, values_from = attempts, values_fill = 0 ) %>%
		mutate(
			pass = if ( "pass" %in% names( . ) ) pass else 0,
			fail = if ( "fail" %in% names( . ) ) fail else 0,
			total = pass + fail,
			branch_short = branch %>%
				str_remove( "^ready/rtc-" ) %>%
				str_remove( "^deferred/rtc-" ) %>%
				str_replace_all( "-", " " ) %>%
				str_wrap( width = 34 )
		) %>%
		arrange( desc( fail ), desc( total ), branch )
} else {
	tibble( branch = character(), pass = numeric(), fail = numeric(), total = numeric(), branch_short = character() )
}
write_csv( critical_branch_validation_summary, file.path( data_dir, "critical_branch_validation_summary.csv" ) )

pr_loop_queue_depth <- bind_rows(
	if ( nrow( pr_progress_state_counts ) > 0 ) {
		pr_progress_state_counts %>%
			transmute(
				queue = "PR progress items",
				state = status,
				class = kind,
				priority = priority,
				depth = items
			)
	} else {
		tibble()
	},
	if ( nrow( pr_progress_control_decisions ) > 0 ) {
		pr_progress_control_decisions %>%
			mutate( state = if_else( allowed == "yes", "allowed", "blocked" ) ) %>%
			count( priority, state, name = "depth" ) %>%
			transmute(
				queue = "controller decisions",
				state = state,
				class = "control decision",
				priority = priority,
				depth = depth
			)
	} else {
		tibble()
	},
	if ( nrow( critical_blockers ) > 0 ) {
		critical_blockers %>%
			count( kind, priority, state, name = "depth" ) %>%
			transmute(
				queue = "critical blockers",
				state = state,
				class = kind,
				priority = priority,
				depth = depth
			)
	} else {
		tibble()
	},
	if ( nrow( critical_queue ) > 0 ) {
		critical_queue %>%
			count( resource_class, priority, state, name = "depth" ) %>%
			transmute(
				queue = "critical job queue",
				state = state,
				class = resource_class,
				priority = priority,
				depth = depth
			)
	} else {
		tibble()
	},
	if ( nrow( critical_lanes ) > 0 ) {
		critical_lanes %>%
			count( resource_class, state, name = "depth" ) %>%
			transmute(
				queue = "critical lanes",
				state = state,
				class = resource_class,
				priority = "lane",
				depth = depth
			)
	} else {
		tibble()
	},
	if ( nrow( critical_active_jobs ) > 0 ) {
		critical_active_jobs %>%
			count( class, name = "depth" ) %>%
			transmute(
				queue = "active sessions",
				state = "active",
				class = class,
				priority = class,
				depth = depth
			)
	} else {
		tibble()
	}
) %>%
	ensure_columns( c( "queue", "state", "class", "priority", "depth" ) ) %>%
	mutate( depth = as.numeric( depth ) ) %>%
	filter( ! is.na( depth ), depth > 0 )
write_csv( pr_loop_queue_depth, file.path( data_dir, "pr_loop_queue_depth.csv" ) )

pr_loop_blocked_decisions <- if ( nrow( pr_progress_control_decisions ) > 0 ) {
	pr_progress_control_decisions %>%
		filter( allowed != "yes" ) %>%
		mutate(
			target_label = str_wrap( target, width = 36 ),
			reason_label = str_wrap( reason, width = 80 )
		)
} else {
	tibble()
}
write_csv( pr_loop_blocked_decisions, file.path( data_dir, "pr_loop_blocked_decisions.csv" ) )

local_publisher_events <- tibble()
if ( file.exists( local_publisher_state_path ) ) {
	publisher_state_lines <- read_lines( local_publisher_state_path, progress = FALSE )
	local_publisher_events <- tibble( raw = publisher_state_lines ) %>%
		filter( raw != "" ) %>%
		separate( raw, into = c( "field1", "field2", "field3", "field4", "field5", "field6" ), sep = "\t", fill = "right", extra = "merge" ) %>%
		mutate(
			event_type = case_when(
				field1 == "last_hash" ~ "manifest snapshot",
				str_detect( field1, "^[0-9]{4}-[0-9]{2}-[0-9]{2}T" ) & field6 == "pushed" ~ "branch pushed",
				str_detect( field1, "^[0-9]{4}-[0-9]{2}-[0-9]{2}T" ) & field6 == "push_failed" ~ "push failed",
				TRUE ~ "other"
			),
			timestamp = case_when(
				field1 == "last_hash" ~ ymd_hms( field3, tz = "UTC", quiet = TRUE ),
				str_detect( field1, "^[0-9]{4}-[0-9]{2}-[0-9]{2}T" ) ~ ymd_hms( field1, tz = "UTC", quiet = TRUE ),
				TRUE ~ as.POSIXct( NA_real_, origin = "1970-01-01", tz = "UTC" )
			),
			source = if_else( field1 == "last_hash", "snapshot", field2 )
		) %>%
		filter( ! is.na( timestamp ), event_type != "other" )
}
write_csv( local_publisher_events, file.path( data_dir, "local_publisher_events.csv" ) )

coverage_long <- monitor %>%
	select( timestamp, records_seen, unmet_coverage ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			records_seen = "coverage record observations",
			unmet_coverage = "unmet coverage goals"
		)
	)

write_plot(
	"monitor-coverage-intake.png",
	ggplot( coverage_long, aes( x = timestamp, y = value, color = metric ) ) +
		geom_point( alpha = 0.5, size = 0.75 ) +
		facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_time_axis( date_breaks = "4 hours" ) +
		labs(
			title = "Coverage-guided fuzz intake over time",
			x = "UTC time",
			y = NULL,
			color = NULL,
			caption = "Each point is one novelty monitor pass. Points are shown without connecting lines."
		) +
		theme_rtc(),
	width = 9,
	height = 8
)

yield_long <- monitor %>%
	mutate( coverage_delta = coverage_files - lag( coverage_files ) ) %>%
	select( timestamp, processed, new_features, new_cdp, coverage_delta ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		reset_artifact = metric == "coverage_delta" & value < 0,
		plot_value = log1p( pmax( value, 0 ) ),
		metric = recode(
			metric,
			processed = "records processed this pass",
			new_features = "new behavioral features",
			new_cdp = "new CDP hashes",
			coverage_delta = "coverage file delta"
		),
		pass_kind = if_else( reset_artifact, "negative reset artifact", "normal pass" )
	)

write_plot(
	"monitor-per-pass-yield.png",
	ggplot( yield_long, aes( x = timestamp, y = plot_value, color = metric, shape = pass_kind ) ) +
		geom_point( alpha = 0.35, size = 0.75 ) +
		facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_shape_manual( values = c( "normal pass" = 16, "negative reset artifact" = 4 ) ) +
		scale_time_axis( date_breaks = "4 hours" ) +
		labs(
			title = "Per-pass fuzz yield over time",
			x = "UTC time",
			y = "log1p(value)",
			color = NULL,
			shape = NULL,
			caption = "Negative coverage-file deltas are reset/restart artifacts and are plotted at zero on the log1p scale."
		) +
		theme_rtc(),
	width = 9,
	height = 7
)

health_long <- monitor %>%
	select(
		timestamp,
		warnings,
		duplicate_share_current,
		summary_startup_failures,
		memory_free_gb,
		no_progress
	) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			warnings = "monitor warnings",
			duplicate_share_current = "current-run duplicate/noise share",
			summary_startup_failures = "summary startup failures this pass",
			memory_free_gb = "free memory (GiB)",
			no_progress = "no-progress passes"
		)
	)

write_plot(
	"monitor-health-yield.png",
	ggplot( health_long, aes( x = timestamp, y = value, color = metric ) ) +
		geom_point( alpha = 0.5, size = 0.75 ) +
		facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
		scale_color_brewer( palette = "Set2" ) +
		scale_time_axis( date_breaks = "4 hours" ) +
		labs(
			title = "Fuzz yield and resource health over time",
			x = "UTC time",
			y = NULL,
			color = NULL,
			caption = "Duplicate/noise share is scoped to the current output directory; historical aggregate duplicate/noise is intentionally not plotted here."
		) +
		theme_rtc(),
	width = 9,
	height = 9
)

if ( nrow( current_run_accounting ) > 0 ) {
	accounting_plot <- current_run_accounting %>%
		mutate(
			metric_trusted_value = if_else( current_run_metrics_trusted, 1, 0 ),
			pending_value = if_else( full_pass_pending | pending_until_first_pass, 1, 0 ),
			minutes_since_completed_full_pass = if_else(
				is.na( minutes_since_completed_full_pass ),
				NA_real_,
				pmax( minutes_since_completed_full_pass, 0 )
			)
		) %>%
		select(
			timestamp,
			run_id,
			metric_trusted_value,
			pending_value,
			minutes_since_completed_full_pass,
			active_run_dirs,
			supervisor_groups_file,
			current_run_signatures,
			current_run_actionable_signatures,
			current_run_product_evidence_signatures,
			current_run_top_duplicate_share
		) %>%
		pivot_longer(
			cols = -c( timestamp, run_id ),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = recode(
				metric,
				metric_trusted_value = "current-run dup/noise metric trusted",
				pending_value = "full-pass accounting pending",
				minutes_since_completed_full_pass = "minutes since completed full pass",
				active_run_dirs = "active run directories",
				supervisor_groups_file = "supervisor groups published",
				current_run_signatures = "current-run signatures",
				current_run_actionable_signatures = "current-run actionable signatures",
				current_run_product_evidence_signatures = "current-run product-evidence signatures",
				current_run_top_duplicate_share = "current-run top duplicate share"
			)
		)

	write_plot(
		"current-run-accounting-completeness.png",
		ggplot( accounting_plot, aes( x = timestamp, y = value, color = metric ) ) +
			geom_point( alpha = 0.65, size = 0.9 ) +
			facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Current-run accounting completeness over time",
				x = "UTC time",
				y = NULL,
				color = NULL,
				caption = "The duplicate/noise metric is trusted only after the active novelty run has completed a full pass. Pending states are control-plane health signals, not product bug-rate measurements."
			) +
			theme_rtc(),
		width = 9,
		height = 9
	)
}

if ( file.exists( cpu_path ) ) {
	cpu_utilization <- read_csv( cpu_path, show_col_types = FALSE ) %>%
		mutate( timestamp = parse_utc_timestamp( timestamp ) ) %>%
		filter( timestamp >= floor_date( min( monitor$timestamp ), "day" ) )

	write_plot(
		"cpu-utilization-over-time.png",
		ggplot( cpu_utilization, aes( x = timestamp, y = cpu_utilization ) ) +
			geom_point( aes( color = iowait_pct ), alpha = 0.72, size = 1.6 ) +
			scale_color_distiller( palette = "YlOrRd", direction = 1, labels = label_percent( scale = 1 ) ) +
			scale_y_continuous( labels = label_percent( scale = 1 ), limits = c( 0, 100 ) ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "CPU utilization over time",
				x = "UTC time",
				y = "CPU utilization",
				color = "I/O wait",
				caption = "Each point is one sysstat sample for all CPUs. Color indicates the I/O-wait share."
			) +
			theme_rtc(),
		width = 9,
		height = 5.4
	)
}

if ( file.exists( load_path ) ) {
	load_average <- read_csv( load_path, show_col_types = FALSE ) %>%
		mutate( timestamp = parse_utc_timestamp( timestamp ) ) %>%
		filter( timestamp >= floor_date( min( monitor$timestamp ), "day" ) )

	load_average_long <- load_average %>%
		select( timestamp, core_count, load_1, load_5, load_15 ) %>%
		pivot_longer( starts_with( "load_" ), names_to = "metric", values_to = "load_average" ) %>%
		filter( load_average > 0 ) %>%
		mutate(
			metric = recode(
				metric,
				load_1 = "1-minute",
				load_5 = "5-minute",
				load_15 = "15-minute"
			)
		)

	write_plot(
		"load-average-over-time.png",
		ggplot( load_average_long, aes( x = timestamp, y = load_average, color = metric ) ) +
			geom_point( alpha = 0.68, size = 1.5 ) +
			geom_hline(
				data = load_average %>% distinct( core_count ),
				aes( yintercept = core_count ),
				linetype = "dashed",
				color = "grey45",
				inherit.aes = FALSE
			) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_y_log2_powers() +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Load average over time",
				x = "UTC time",
				y = "load average",
				color = NULL,
				caption = "Each point is one sysstat sample. The y-axis uses a base-2 log scale; the dashed line is the logical CPU count."
			) +
			theme_rtc(),
		width = 9,
		height = 5.4
	)
}

if ( file.exists( disk_path ) ) {
	disk_free_space <- read_csv( disk_path, show_col_types = FALSE ) %>%
		mutate(
			timestamp = parse_utc_timestamp( timestamp ),
			root_free_gib = as.numeric( root_free_gib ),
			root_used_percent = as.numeric( root_used_percent ),
			data_free_gib = as.numeric( data_free_gib ),
			data_used_percent = as.numeric( data_used_percent )
		) %>%
		filter( ! is.na( timestamp ) ) %>%
		filter( timestamp >= floor_date( min( monitor$timestamp ), "day" ) )

	disk_free_long <- disk_free_space %>%
		select( timestamp, root_free_gib, data_free_gib ) %>%
		pivot_longer( ends_with( "_free_gib" ), names_to = "volume", values_to = "free_gib" ) %>%
		filter( ! is.na( free_gib ) ) %>%
		mutate(
			volume = recode(
				volume,
				root_free_gib = "root (/)",
				data_free_gib = "data (/media/volume/danluu-fuzz-data)"
			)
		)

	disk_thresholds <- tibble(
		volume = c( "root (/)", "data (/media/volume/danluu-fuzz-data)" ),
		pressure_free_gib = c( 25, 160 )
	)

	write_plot(
		"disk-free-space-over-time.png",
		ggplot( disk_free_long, aes( x = timestamp, y = free_gib ) ) +
			geom_point( color = "#2c7fb8", alpha = 0.76, size = 1.7 ) +
			geom_hline(
				data = disk_thresholds,
				aes( yintercept = pressure_free_gib ),
				linetype = "dashed",
				color = "grey35",
				inherit.aes = FALSE
			) +
			facet_wrap( vars( volume ), ncol = 1, scales = "free_y" ) +
			scale_y_continuous( labels = comma ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Free disk space over time",
				x = "UTC time",
				y = "free GiB",
				caption = "Each point is an autoscaler or graph-refresh sample. Dashed lines show the default pressure thresholds used by the disk-aware controller."
			) +
			theme_rtc(),
		width = 9,
		height = 7.2
	)
}

coverage_root_loss <- if ( file.exists( coverage_root_loss_path ) ) {
	read_csv( coverage_root_loss_path, show_col_types = FALSE ) %>%
		mutate(
			timestamp = parse_utc_timestamp( timestamp ),
			root_age_seconds = as.numeric( root_age_seconds ),
			records_seen = as.numeric( records_seen ),
			current_run_records = as.numeric( current_run_records ),
			estimated_lost_seconds = as.numeric( estimated_lost_seconds ),
			estimated_lost_records = as.numeric( estimated_lost_records ),
			desired_target = as.numeric( desired_target ),
			desired_max = as.numeric( desired_max ),
			event_type = replace_na( event_type, "unknown" ),
			reason = replace_na( reason, "unknown" )
		) %>%
		filter( ! is.na( timestamp ) ) %>%
		arrange( timestamp )
} else {
	tibble(
		timestamp = as.POSIXct( character(), tz = "UTC" ),
		event_type = character(),
		reason = character(),
		coverage_root = character(),
		root_age_seconds = numeric(),
		full_pass_completed = numeric(),
		seconds_since_completed_full_pass = numeric(),
		records_seen = numeric(),
		current_run_records = numeric(),
		coverage_files = numeric(),
		materialized_active_run_dirs = numeric(),
		materialized_running_groups = numeric(),
		supervisor_status_counts = character(),
		desired_target = numeric(),
		desired_max = numeric(),
		estimated_lost_seconds = numeric(),
		estimated_lost_records = numeric()
	)
}

if ( nrow( coverage_root_loss ) > 0 ) {
	coverage_root_loss <- coverage_root_loss %>%
		mutate(
			cumulative_lost_hours = cumsum( coalesce( estimated_lost_seconds, 0 ) ) / 3600,
			cumulative_lost_records = cumsum( coalesce( estimated_lost_records, 0 ) ),
			lost_minutes = coalesce( estimated_lost_seconds, 0 ) / 60,
			loss_event_label = case_when(
				event_type == "restart" ~ "root reset restart",
				event_type == "in_place_budget" ~ "in-place budget change",
				TRUE ~ event_type
			),
			reason = str_replace_all( reason, "_", " " )
		)
} else {
	coverage_root_loss <- coverage_root_loss %>%
		mutate(
			cumulative_lost_hours = numeric(),
			cumulative_lost_records = numeric(),
			lost_minutes = numeric(),
			loss_event_label = character()
		)
}

coverage_loss_plot_base <- ggplot( coverage_root_loss, aes( x = timestamp ) ) +
	scale_time_axis( date_breaks = "4 hours" ) +
	theme_rtc()

write_plot(
	"coverage-root-lost-time-over-time.png",
	coverage_loss_plot_base +
		geom_point(
			aes( y = cumulative_lost_hours, color = loss_event_label, size = lost_minutes ),
			alpha = 0.74
		) +
		scale_color_brewer( palette = "Dark2", na.translate = FALSE ) +
		scale_size_continuous( range = c( 1.2, 4.5 ), labels = comma ) +
		labs(
			title = "Coverage-root restart lost time over time",
			x = "UTC time",
			y = "cumulative estimated lost hours",
			color = NULL,
			size = "lost minutes",
			caption = "Root-reset restarts count the active-root age before the first full pass, or time since the last completed full pass. In-place budget changes are recorded but add zero lost continuity."
		),
	width = 9,
	height = 5.4
)

write_plot(
	"coverage-root-lost-records-over-time.png",
	coverage_loss_plot_base +
		geom_point(
			aes( y = cumulative_lost_records, color = loss_event_label, size = pmax( estimated_lost_records, 1 ) ),
			alpha = 0.74
		) +
		scale_color_brewer( palette = "Dark2", na.translate = FALSE ) +
		scale_size_continuous( range = c( 1.2, 4.5 ), labels = comma ) +
		scale_y_continuous( labels = comma ) +
		labs(
			title = "Coverage-root restart lost progress over time",
			x = "UTC time",
			y = "cumulative estimated lost current-run records",
			color = NULL,
			size = "records lost",
			caption = "This tracks current-root continuity loss from controller-driven root resets. It is an estimate from novelty-state counters, not a count of discarded files."
		),
	width = 9,
	height = 5.4
)

if ( file.exists( activity_path ) ) {
	activity <- read_csv( activity_path, show_col_types = FALSE ) %>%
		mutate( timestamp = parse_utc_timestamp( timestamp ) )
	billions_label <- label_number( scale = 1e-9, accuracy = 0.1, trim = TRUE )

	write_plot(
		"project-activity-cumulative.png",
		ggplot( activity, aes( x = timestamp, y = cumulative ) ) +
			geom_point( aes( size = samples ), alpha = 0.68, color = brewer.pal( 8, "Dark2" )[ 3 ] ) +
			scale_size_continuous( range = c( 1.2, 4.2 ), guide = "none" ) +
			scale_y_continuous( labels = billions_label ) +
			scale_time_axis( date_breaks = "8 hours" ) +
			labs(
				x = "UTC time",
				y = NULL
			) +
			theme_rtc(),
		width = 9,
		height = 4.8
	)

	write_plot(
		"project-activity-rate.png",
		ggplot( activity, aes( x = timestamp, y = rate ) ) +
			geom_point( aes( size = samples ), alpha = 0.68, color = brewer.pal( 8, "Dark2" )[ 5 ] ) +
			scale_size_continuous( range = c( 1.2, 4.2 ), guide = "none" ) +
			scale_y_continuous( labels = billions_label ) +
			scale_time_axis( date_breaks = "8 hours" ) +
			labs(
				x = "UTC time",
				y = NULL
			) +
			theme_rtc(),
		width = 9,
		height = 4.8
	)
}

if ( nrow( enabled_groups ) > 0 ) {
	enabled_group_summary <- enabled_groups %>%
		group_by( group, group_family ) %>%
		summarise(
			first_enabled = min( timestamp ),
			last_seen = max( timestamp ),
			enable_events = n(),
			.groups = "drop"
		) %>%
		mutate(
			current_state = if_else( group %in% state$enabledGroups, "current", "historical" ),
			group_label = str_remove( group, "^novelty-(ws|http)-" )
		)

	write_plot(
		"enabled-groups-over-time.png",
		ggplot( enabled_group_summary, aes( x = first_enabled, y = reorder( group_label, first_enabled ), color = group_family, size = enable_events, shape = current_state ) ) +
			geom_point( alpha = 0.82 ) +
			scale_color_brewer( palette = "Set2" ) +
			scale_size_continuous( range = c( 2, 7 ), breaks = pretty_breaks( n = 4 ) ) +
			scale_shape_manual( values = c( "current" = 16, "historical" = 1 ) ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Coverage-guided groups by first enable time",
				x = "UTC time",
				y = NULL,
				color = "surface",
				size = "events",
				shape = NULL,
				caption = "Point size counts enable log events. Repeated events are restart/re-enable noise, not new surface coverage."
			) +
			theme_rtc(),
		width = 10,
		height = 6
	)
}

if ( nrow( fuzz_level_mix ) > 0 ) {
	fuzz_level_summary <- fuzz_level_mix %>%
		group_by( timestamp, campaign, fuzz_level ) %>%
		summarise(
			lanes = sum( lanes, na.rm = TRUE ),
			groups = n(),
			is_latest = any( is_latest ),
			.groups = "drop"
		) %>%
		mutate(
			latest_state = if_else( is_latest, "latest campaign snapshot", "historical snapshot" )
		)

	write_plot(
		"fuzz-level-mix-over-time.png",
		ggplot( fuzz_level_summary, aes( x = timestamp, y = fuzz_level, color = campaign, size = lanes, shape = latest_state ) ) +
			geom_point( alpha = 0.78 ) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_size_continuous( range = c( 1.4, 6.2 ), breaks = pretty_breaks( n = 4 ) ) +
			scale_shape_manual( values = c( "latest campaign snapshot" = 16, "historical snapshot" = 1 ) ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Fuzzing level mix over time",
				x = "UTC time",
				y = "fuzzing level",
				color = "campaign",
				size = "lanes",
				shape = NULL,
				caption = "Each point aggregates one campaign snapshot at one fuzzing level. Size is active lanes in that snapshot."
			) +
			theme_rtc(),
		width = 10,
		height = 5.8
	)
}

fuzz_execution_counts <- tibble()
if ( nrow( fuzz_level_executions ) > 0 ) {
	fuzz_execution_counts <- fuzz_level_executions %>%
		mutate( bucket = floor_date( timestamp, "15 minutes" ) ) %>%
		group_by( bucket, fuzz_level ) %>%
		summarise(
			executions = sum( executions, na.rm = TRUE ),
			primary_executions = sum( primary_executions, na.rm = TRUE ),
			successful_executions = sum( successful_executions, na.rm = TRUE ),
			attempts = sum( attempts, na.rm = TRUE ),
			failed_attempts = sum( failed_attempts, na.rm = TRUE ),
			duration_ms = sum( duration_ms, na.rm = TRUE ),
			approximate = any( approximate, na.rm = TRUE ),
			campaigns = n_distinct( campaign ),
			.groups = "drop"
		) %>%
		complete(
			bucket = seq( min( bucket ), max( bucket ), by = "15 min" ),
			fuzz_level = unique( fuzz_level_executions$fuzz_level ),
			fill = list(
				executions = 0,
				primary_executions = 0,
				successful_executions = 0,
				attempts = 0,
				failed_attempts = 0,
				duration_ms = 0,
				approximate = FALSE,
				campaigns = 0
			)
		) %>%
		arrange( fuzz_level, bucket ) %>%
		group_by( fuzz_level ) %>%
		mutate(
			cumulative_executions = cumsum( executions ),
			cumulative_attempts = cumsum( attempts ),
			cumulative_failed_attempts = cumsum( failed_attempts ),
			runner_hours = duration_ms / 3600000,
			cumulative_runner_hours = cumsum( runner_hours ),
			executions_per_hour = executions * 4
		) %>%
		ungroup()

	write_csv( fuzz_execution_counts, file.path( data_dir, "fuzz_level_execution_counts.csv" ) )

	write_plot(
		"fuzz-level-executions-cumulative.png",
		ggplot( fuzz_execution_counts, aes( x = bucket, y = cumulative_executions ) ) +
			geom_line( alpha = 0.35 ) +
			geom_point( alpha = 0.74, size = 1.4, color = "grey25" ) +
			facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
			scale_y_continuous( labels = comma ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Cumulative fuzz executions by level",
				x = "UTC time",
				y = "completed test executions",
				caption = "Counts are estimated individual test/case executions from lane events.ndjson. Browser/e2e counts seed attempts; unit/property counts fixed tests plus generated cases; coverage-guided lower-level counts tested inputs. Historical lower-level rows reconstructed from batch metadata or legacy batch-count fields are approximate."
			) +
			theme_rtc(),
		width = 10,
		height = 8.2
	)

	write_plot(
		"fuzz-level-execution-rate.png",
		ggplot( fuzz_execution_counts, aes( x = bucket, y = executions_per_hour ) ) +
			geom_point( alpha = 0.72, size = 1.5, color = "grey25" ) +
			facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
			scale_y_continuous( labels = comma ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Fuzz execution rate by level",
				x = "UTC time",
				y = "test executions per hour",
				caption = "Rates are bucketed in 15-minute windows and scaled to estimated individual test/case executions per hour."
			) +
			theme_rtc(),
		width = 10,
		height = 8.2
	)
}

bug_findings_unique <- if ( nrow( bug_findings ) > 0 ) {
	bug_findings %>%
		filter( is_likely_real, ! is_duplicate ) %>%
		arrange( timestamp, desc( source_tier == "deep-analysis-tier" ), canonical_bug_key ) %>%
		distinct( canonical_bug_key, .keep_all = TRUE )
} else {
	tibble()
}

bug_candidate_unique <- if ( nrow( bug_findings ) > 0 ) {
	bug_findings %>%
		filter( is_candidate_signal, ! is_duplicate ) %>%
		arrange( timestamp, desc( source_tier == "deep-analysis-tier" ), canonical_bug_key ) %>%
		distinct( canonical_bug_key, .keep_all = TRUE )
} else {
	tibble()
}

bug_effectiveness_by_level <- tibble()
bug_effectiveness_by_profile <- tibble()
if ( nrow( fuzz_execution_counts ) > 0 ) {
	likely_real_by_level <- if ( nrow( bug_findings_unique ) > 0 ) {
		bug_findings_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level )
			) %>%
			count( bucket, fuzz_level, name = "likely_real_findings" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), likely_real_findings = numeric() )
	}

	candidate_by_level <- if ( nrow( bug_candidate_unique ) > 0 ) {
		bug_candidate_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level )
			) %>%
			count( bucket, fuzz_level, name = "candidate_findings" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), candidate_findings = numeric() )
	}

	bug_effectiveness_by_level <- fuzz_execution_counts %>%
		mutate( fuzz_level = as.character( fuzz_level ) ) %>%
		left_join( likely_real_by_level, by = c( "bucket", "fuzz_level" ) ) %>%
		left_join( candidate_by_level, by = c( "bucket", "fuzz_level" ) ) %>%
		mutate(
			likely_real_findings = replace_na( likely_real_findings, 0 ),
			candidate_findings = replace_na( candidate_findings, 0 )
		) %>%
		arrange( fuzz_level, bucket ) %>%
		group_by( fuzz_level ) %>%
		mutate(
			cumulative_likely_real_findings = cumsum( likely_real_findings ),
			cumulative_candidate_findings = cumsum( candidate_findings ),
			likely_real_findings_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_likely_real_findings / cumulative_runner_hours,
				0
			),
			candidate_findings_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_candidate_findings / cumulative_runner_hours,
				0
			),
			failed_attempts_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_failed_attempts / cumulative_runner_hours,
				0
			)
		) %>%
		ungroup()

	write_csv( bug_effectiveness_by_level, file.path( data_dir, "bug_effectiveness_by_level.csv" ) )

	level_plot_data <- bug_effectiveness_by_level %>%
		filter( cumulative_runner_hours > 0 )

	if ( nrow( level_plot_data ) > 0 ) {
		write_plot(
			"bug-effectiveness-likely-real-by-level.png",
			ggplot( level_plot_data, aes( x = bucket, y = likely_real_findings_per_100_runner_hours ) ) +
				geom_point( aes( size = cumulative_runner_hours ), alpha = 0.72, color = "grey25" ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_y_continuous( labels = number_format( accuracy = 0.01 ) ) +
				scale_size_continuous( labels = comma, range = c( 1.2, 4.8 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Triaged likely-real output rate by fuzzing level",
					x = "UTC time",
					y = "unique triaged likely-real outputs per 100 runner-hours",
					size = "cumulative runner-hours",
					caption = "This plot only counts non-duplicate .triage-watcher result.json rows classified likely_real. It is a triage-output metric, not all bugs found by fuzzing. Runner-hours sum durationMs from lane events."
				) +
				theme_rtc(),
			width = 10,
			height = 8.2
		)

		write_plot(
			"failure-candidate-effectiveness-by-level.png",
			ggplot( level_plot_data, aes( x = bucket, y = failed_attempts_per_100_runner_hours ) ) +
				geom_point( aes( size = cumulative_runner_hours ), alpha = 0.72, color = "grey25" ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_y_continuous( labels = number_format( accuracy = 0.1 ) ) +
				scale_size_continuous( labels = comma, range = c( 1.2, 4.8 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Failure-candidate rate by fuzzing level",
					x = "UTC time",
					y = "failed attempts per 100 runner-hours",
					size = "cumulative runner-hours",
					caption = "Failure candidates are failed seed or batch attempts before duplicate/noise triage. This is a lead indicator, not a confirmed-bug count."
				) +
				theme_rtc(),
			width = 10,
			height = 8.2
		)
	}

	profile_compute <- fuzz_level_executions %>%
		mutate(
			bucket = floor_date( timestamp, "15 minutes" ),
			fuzz_level = as.character( fuzz_level ),
			profile = replace_na( profile, "unknown" )
		) %>%
		group_by( bucket, fuzz_level, profile ) %>%
		summarise(
			executions = sum( executions, na.rm = TRUE ),
			attempts = sum( attempts, na.rm = TRUE ),
			failed_attempts = sum( failed_attempts, na.rm = TRUE ),
			duration_ms = sum( duration_ms, na.rm = TRUE ),
			.groups = "drop"
		) %>%
		arrange( fuzz_level, profile, bucket ) %>%
		group_by( fuzz_level, profile ) %>%
		mutate(
			runner_hours = duration_ms / 3600000,
			cumulative_runner_hours = cumsum( runner_hours ),
			cumulative_failed_attempts = cumsum( failed_attempts )
		) %>%
		ungroup()

	likely_real_by_profile <- if ( nrow( bug_findings_unique ) > 0 ) {
		bug_findings_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level ),
				profile = replace_na( profile, "unknown" )
			) %>%
			count( bucket, fuzz_level, profile, name = "likely_real_findings" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), profile = character(), likely_real_findings = numeric() )
	}

	candidate_by_profile <- if ( nrow( bug_candidate_unique ) > 0 ) {
		bug_candidate_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level ),
				profile = replace_na( profile, "unknown" )
			) %>%
			count( bucket, fuzz_level, profile, name = "candidate_findings" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), profile = character(), candidate_findings = numeric() )
	}

	bug_effectiveness_by_profile <- profile_compute %>%
		left_join( likely_real_by_profile, by = c( "bucket", "fuzz_level", "profile" ) ) %>%
		left_join( candidate_by_profile, by = c( "bucket", "fuzz_level", "profile" ) ) %>%
		mutate(
			likely_real_findings = replace_na( likely_real_findings, 0 ),
			candidate_findings = replace_na( candidate_findings, 0 )
		) %>%
		arrange( fuzz_level, profile, bucket ) %>%
		group_by( fuzz_level, profile ) %>%
		mutate(
			cumulative_likely_real_findings = cumsum( likely_real_findings ),
			cumulative_candidate_findings = cumsum( candidate_findings ),
			likely_real_findings_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_likely_real_findings / cumulative_runner_hours,
				0
			),
			candidate_findings_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_candidate_findings / cumulative_runner_hours,
				0
			),
			failed_attempts_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_failed_attempts / cumulative_runner_hours,
				0
			)
		) %>%
		ungroup()

	write_csv( bug_effectiveness_by_profile, file.path( data_dir, "bug_effectiveness_by_profile.csv" ) )

	profile_selection <- bug_effectiveness_by_profile %>%
		group_by( fuzz_level, profile ) %>%
		summarise(
			total_likely_real_findings = max( cumulative_likely_real_findings, na.rm = TRUE ),
			total_failed_attempts = max( cumulative_failed_attempts, na.rm = TRUE ),
			total_runner_hours = max( cumulative_runner_hours, na.rm = TRUE ),
			.groups = "drop"
		) %>%
		group_by( fuzz_level ) %>%
		arrange( desc( total_likely_real_findings ), desc( total_failed_attempts ), desc( total_runner_hours ), profile, .by_group = TRUE ) %>%
		slice_head( n = 8 ) %>%
		ungroup()

	profile_plot_data <- bug_effectiveness_by_profile %>%
		semi_join( profile_selection, by = c( "fuzz_level", "profile" ) ) %>%
		filter( cumulative_runner_hours > 0 )

	if ( nrow( profile_plot_data ) > 0 ) {
		profile_palette_levels <- sort( unique( profile_plot_data$profile ) )
		profile_palette <- setNames(
			colorRampPalette( brewer.pal( 8, "Set2" ) )( length( profile_palette_levels ) ),
			profile_palette_levels
		)

		write_plot(
			"bug-effectiveness-by-profile-within-level.png",
			ggplot( profile_plot_data, aes( x = bucket, y = likely_real_findings_per_100_runner_hours, color = profile ) ) +
				geom_point( alpha = 0.74, size = 1.55 ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_color_manual( values = profile_palette ) +
				scale_y_continuous( labels = number_format( accuracy = 0.01 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Triaged likely-real output rate within fuzzing levels",
					x = "UTC time",
					y = "unique triaged likely-real outputs per 100 runner-hours",
					color = "test type",
					caption = "This only counts non-duplicate .triage-watcher likely_real rows. Within-level test type is the action profile or lower-level harness profile."
				) +
				theme_rtc() +
				guides( color = guide_legend( nrow = 3, byrow = TRUE ) ),
			width = 11,
			height = 8.5
		)

		write_plot(
			"failure-candidate-effectiveness-by-profile-within-level.png",
			ggplot( profile_plot_data, aes( x = bucket, y = failed_attempts_per_100_runner_hours, color = profile ) ) +
				geom_point( alpha = 0.74, size = 1.55 ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_color_manual( values = profile_palette ) +
				scale_y_continuous( labels = number_format( accuracy = 0.1 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Failure-candidate effectiveness within fuzzing levels",
					x = "UTC time",
					y = "failed attempts per 100 runner-hours",
					color = "test type",
					caption = "Failure candidates are pre-triage failed attempts. They help expose lower-level signal before likely-real triage exists."
				) +
				theme_rtc() +
				guides( color = guide_legend( nrow = 3, byrow = TRUE ) ),
			width = 11,
			height = 8.5
		)
	}
}

bug_outputs_unique <- if ( nrow( bug_outputs ) > 0 ) {
	bug_outputs %>%
		filter( is_unique_bug_output_candidate ) %>%
		arrange(
			timestamp,
			desc( is_confirmed_likely_real ),
			output_type,
			signal_kind,
			canonical_output_key
		) %>%
		distinct( canonical_output_key, .keep_all = TRUE )
} else {
	tibble()
}

bug_output_effectiveness_by_level <- tibble()
bug_output_effectiveness_by_profile <- tibble()
if ( nrow( fuzz_execution_counts ) > 0 ) {
	unique_outputs_by_level <- if ( nrow( bug_outputs_unique ) > 0 ) {
		bug_outputs_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level )
			) %>%
			count( bucket, fuzz_level, name = "unique_bug_outputs" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), unique_bug_outputs = numeric() )
	}

	confirmed_outputs_by_level <- if ( nrow( bug_outputs_unique ) > 0 ) {
		bug_outputs_unique %>%
			filter( is_confirmed_likely_real ) %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level )
			) %>%
			count( bucket, fuzz_level, name = "confirmed_likely_real_outputs" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), confirmed_likely_real_outputs = numeric() )
	}

	bug_output_effectiveness_by_level <- fuzz_execution_counts %>%
		mutate( fuzz_level = as.character( fuzz_level ) ) %>%
		left_join( unique_outputs_by_level, by = c( "bucket", "fuzz_level" ) ) %>%
		left_join( confirmed_outputs_by_level, by = c( "bucket", "fuzz_level" ) ) %>%
		mutate(
			unique_bug_outputs = replace_na( unique_bug_outputs, 0 ),
			confirmed_likely_real_outputs = replace_na( confirmed_likely_real_outputs, 0 )
		) %>%
		arrange( fuzz_level, bucket ) %>%
		group_by( fuzz_level ) %>%
		mutate(
			cumulative_unique_bug_outputs = cumsum( unique_bug_outputs ),
			cumulative_confirmed_likely_real_outputs = cumsum( confirmed_likely_real_outputs ),
			unique_bug_outputs_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_unique_bug_outputs / cumulative_runner_hours,
				0
			),
			confirmed_likely_real_outputs_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_confirmed_likely_real_outputs / cumulative_runner_hours,
				0
			)
		) %>%
		ungroup()

	write_csv( bug_output_effectiveness_by_level, file.path( data_dir, "bug_output_effectiveness_by_level.csv" ) )

	bug_output_level_plot_data <- bug_output_effectiveness_by_level %>%
		filter( cumulative_runner_hours > 0 )

	if ( nrow( bug_output_level_plot_data ) > 0 ) {
		write_plot(
			"unique-bug-output-cumulative-by-level.png",
			ggplot( bug_output_level_plot_data, aes( x = bucket, y = cumulative_unique_bug_outputs ) ) +
				geom_point( alpha = 0.76, size = 1.45, color = "grey25" ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_y_continuous( labels = comma ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Unique bug-output candidates by fuzzing level",
					x = "UTC time",
					y = "cumulative unique bug-output candidates",
					caption = "Counts dedupe by canonical output key. Inputs include non-infra .triage-watcher likely_real/uncertain rows, untriaged raw browser failure signatures, and lower-level assertion failures. This is broader than confirmed bugs and narrower than raw failed attempts."
				) +
				theme_rtc(),
			width = 10,
			height = 8.2
		)

		write_plot(
			"unique-bug-output-rate-by-level.png",
			ggplot( bug_output_level_plot_data, aes( x = bucket, y = unique_bug_outputs_per_100_runner_hours ) ) +
				geom_point( aes( size = cumulative_runner_hours ), alpha = 0.72, color = "grey25" ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_y_continuous( labels = number_format( accuracy = 0.01 ) ) +
				scale_size_continuous( labels = comma, range = c( 1.2, 4.8 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Unique bug-output candidate rate by fuzzing level",
					x = "UTC time",
					y = "unique bug-output candidates per 100 runner-hours",
					size = "cumulative runner-hours",
					caption = "Runner-hours are lane wall-clock durationMs. Candidate outputs are deduped and exclude obvious infra/harness/no-product classifications, but untriaged candidates are not equivalent to confirmed maintainer-ready bugs."
				) +
				theme_rtc(),
			width = 10,
			height = 8.2
		)
	}

	bug_output_profile_compute <- fuzz_level_executions %>%
		mutate(
			bucket = floor_date( timestamp, "15 minutes" ),
			fuzz_level = as.character( fuzz_level ),
			profile = replace_na( profile, "unknown" )
		) %>%
		group_by( bucket, fuzz_level, profile ) %>%
		summarise(
			duration_ms = sum( duration_ms, na.rm = TRUE ),
			.groups = "drop"
		) %>%
		arrange( fuzz_level, profile, bucket ) %>%
		group_by( fuzz_level, profile ) %>%
		mutate(
			runner_hours = duration_ms / 3600000,
			cumulative_runner_hours = cumsum( runner_hours )
		) %>%
		ungroup()

	unique_outputs_by_profile <- if ( nrow( bug_outputs_unique ) > 0 ) {
		bug_outputs_unique %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level ),
				profile = replace_na( profile, "unknown" )
			) %>%
			count( bucket, fuzz_level, profile, name = "unique_bug_outputs" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), profile = character(), unique_bug_outputs = numeric() )
	}

	confirmed_outputs_by_profile <- if ( nrow( bug_outputs_unique ) > 0 ) {
		bug_outputs_unique %>%
			filter( is_confirmed_likely_real ) %>%
			mutate(
				bucket = floor_date( timestamp, "15 minutes" ),
				fuzz_level = as.character( fuzz_level ),
				profile = replace_na( profile, "unknown" )
			) %>%
			count( bucket, fuzz_level, profile, name = "confirmed_likely_real_outputs" )
	} else {
		tibble( bucket = as.POSIXct( character() ), fuzz_level = character(), profile = character(), confirmed_likely_real_outputs = numeric() )
	}

	bug_output_effectiveness_by_profile <- bug_output_profile_compute %>%
		left_join( unique_outputs_by_profile, by = c( "bucket", "fuzz_level", "profile" ) ) %>%
		left_join( confirmed_outputs_by_profile, by = c( "bucket", "fuzz_level", "profile" ) ) %>%
		mutate(
			unique_bug_outputs = replace_na( unique_bug_outputs, 0 ),
			confirmed_likely_real_outputs = replace_na( confirmed_likely_real_outputs, 0 )
		) %>%
		arrange( fuzz_level, profile, bucket ) %>%
		group_by( fuzz_level, profile ) %>%
		mutate(
			cumulative_unique_bug_outputs = cumsum( unique_bug_outputs ),
			cumulative_confirmed_likely_real_outputs = cumsum( confirmed_likely_real_outputs ),
			unique_bug_outputs_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_unique_bug_outputs / cumulative_runner_hours,
				0
			),
			confirmed_likely_real_outputs_per_100_runner_hours = if_else(
				cumulative_runner_hours > 0,
				100 * cumulative_confirmed_likely_real_outputs / cumulative_runner_hours,
				0
			)
		) %>%
		ungroup()

	write_csv( bug_output_effectiveness_by_profile, file.path( data_dir, "bug_output_effectiveness_by_profile.csv" ) )

	bug_output_profile_selection <- bug_output_effectiveness_by_profile %>%
		group_by( fuzz_level, profile ) %>%
		summarise(
			total_unique_bug_outputs = max( cumulative_unique_bug_outputs, na.rm = TRUE ),
			total_runner_hours = max( cumulative_runner_hours, na.rm = TRUE ),
			.groups = "drop"
		) %>%
		group_by( fuzz_level ) %>%
		arrange( desc( total_unique_bug_outputs ), desc( total_runner_hours ), profile, .by_group = TRUE ) %>%
		slice_head( n = 8 ) %>%
		ungroup()

	bug_output_profile_plot_data <- bug_output_effectiveness_by_profile %>%
		semi_join( bug_output_profile_selection, by = c( "fuzz_level", "profile" ) ) %>%
		filter( cumulative_runner_hours > 0 )

	if ( nrow( bug_output_profile_plot_data ) > 0 ) {
		bug_output_profile_palette_levels <- sort( unique( bug_output_profile_plot_data$profile ) )
		bug_output_profile_palette <- setNames(
			colorRampPalette( brewer.pal( 8, "Set2" ) )( length( bug_output_profile_palette_levels ) ),
			bug_output_profile_palette_levels
		)

		write_plot(
			"unique-bug-output-cumulative-by-profile-within-level.png",
			ggplot( bug_output_profile_plot_data, aes( x = bucket, y = cumulative_unique_bug_outputs, color = profile ) ) +
				geom_point( alpha = 0.74, size = 1.55 ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_color_manual( values = bug_output_profile_palette ) +
				scale_y_continuous( labels = comma ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Unique bug-output candidates within fuzzing levels",
					x = "UTC time",
					y = "cumulative unique bug-output candidates",
					color = "test type",
					caption = "Within-level test type is the browser action profile or lower-level harness profile. Each facet keeps top profiles by unique candidate outputs."
				) +
				theme_rtc() +
				guides( color = guide_legend( nrow = 3, byrow = TRUE ) ),
			width = 11,
			height = 8.5
		)

		write_plot(
			"unique-bug-output-rate-by-profile-within-level.png",
			ggplot( bug_output_profile_plot_data, aes( x = bucket, y = unique_bug_outputs_per_100_runner_hours, color = profile ) ) +
				geom_point( alpha = 0.74, size = 1.55 ) +
				facet_wrap( vars( fuzz_level ), scales = "free_y", ncol = 2 ) +
				scale_color_manual( values = bug_output_profile_palette ) +
				scale_y_continuous( labels = number_format( accuracy = 0.01 ) ) +
				scale_time_axis( date_breaks = "4 hours" ) +
				labs(
					title = "Unique bug-output candidate rate within fuzzing levels",
					x = "UTC time",
					y = "unique bug-output candidates per 100 runner-hours",
					color = "test type",
					caption = "Rates use deduped candidate outputs and lane wall-clock runner-hours. Untriaged candidates are not the same as confirmed bugs."
				) +
				theme_rtc() +
				guides( color = guide_legend( nrow = 3, byrow = TRUE ) ),
			width = 11,
			height = 8.5
		)
	}
}

profile_success_goals <- coverage_goals %>%
	filter( str_starts( id, "success-profile:" ) ) %>%
	transmute(
		profile = str_remove( id, "^success-profile:" ),
		success_goal_state = if_else( met, "success goal met", "success goal unmet" )
	)

profile_plot_data <- profile_counts %>%
	left_join( profile_success_goals, by = "profile" ) %>%
	mutate(
		startup_rate = if_else( records_seen > 0, startup_failures / records_seen, NA_real_ ),
		success_goal_state = replace_na( success_goal_state, "no success goal" ),
		label_profile = success_goal_state == "success goal unmet",
		label_y = case_when(
			profile == "parser-serialization" ~ success_rate + 0.04,
			profile == "real-user-editing" ~ success_rate + 0.04,
			profile == "multi-reload-lifecycle" ~ pmax( success_rate - 0.012, 0.005 ),
			TRUE ~ success_rate
		),
		label_hjust = if_else( profile == "multi-reload-lifecycle", 1.05, -0.05 )
	)

write_plot(
	"profile-success-scatter.png",
	ggplot( profile_plot_data, aes( x = records_seen, y = success_rate, color = profile_family, size = startup_rate, shape = success_goal_state ) ) +
		geom_point( alpha = 0.82 ) +
		geom_text(
			data = profile_plot_data %>% filter( label_profile ),
			aes( y = label_y, label = profile, hjust = label_hjust ),
			vjust = 0.5,
			size = 2.7,
			check_overlap = TRUE,
			show.legend = FALSE
		) +
		scale_x_log10( labels = comma ) +
		scale_y_continuous( labels = percent_format( accuracy = 1 ), limits = c( 0, 1 ) ) +
		scale_color_brewer( palette = "Set2" ) +
		scale_size_continuous( labels = percent_format( accuracy = 1 ), range = c( 2, 7 ) ) +
		scale_shape_manual( values = c( "success goal unmet" = 17, "success goal met" = 16, "no success goal" = 1 ) ) +
		coord_cartesian( clip = "off" ) +
		labs(
			title = "Profile completion bottlenecks",
			x = "records seen, log scale",
			y = "successful records / records seen",
			color = "profile family",
			size = "startup failure rate",
			shape = NULL,
			caption = "Labels emphasize unmet success-goal profiles. Startup rate is a diagnostic, not the only cause of low completion."
		) +
		guides(
			color = guide_legend( nrow = 2, byrow = TRUE ),
			size = guide_legend( nrow = 1 ),
			shape = guide_legend( nrow = 1 )
		) +
		theme_rtc() +
		theme(
			legend.box = "vertical",
			plot.margin = margin( 5.5, 95, 5.5, 5.5 )
		),
	width = 10.5,
	height = 7.2
)

goal_plot_data <- coverage_goals %>%
	filter( ! met ) %>%
	mutate(
		remaining = pmax( target - count, 0 ),
		count_target = paste0( comma( count ), " / ", comma( target ) ),
		label = str_wrap( label, width = 42 )
	) %>%
	filter( ! is.na( remaining ) ) %>%
	arrange( desc( remaining ) )

write_plot(
	"coverage-goal-progress.png",
	ggplot( goal_plot_data, aes( x = remaining, y = reorder( label, remaining ), color = goal_family, size = target ) ) +
		geom_point( alpha = 0.78 ) +
		geom_text(
			aes( label = count_target ),
			hjust = -0.15,
			vjust = 0.5,
			size = 2.8,
			show.legend = FALSE
		) +
		scale_x_continuous( labels = comma, expand = expansion( mult = c( 0.02, 0.26 ) ) ) +
		scale_color_brewer( palette = "Set2" ) +
		scale_size_continuous( labels = comma, range = c( 2, 6 ) ) +
		labs(
			title = "Remaining unmet coverage goals",
			x = "additional observations needed to meet target",
			y = NULL,
			color = "surface",
			size = "target",
			caption = "Only unmet goals are shown. Point labels are current count / target; full goal table is data/coverage_goals.csv."
		) +
		theme_rtc(),
	width = 12,
	height = 6.2
)

combined_progress_segments <- tibble(
	segment = factor( c( "completed", "remaining" ), levels = c( "completed", "remaining" ) ),
	records = c(
		combined_ingredient_progress$completed_cross_product_records[[ 1 ]],
		combined_ingredient_progress$remaining_records[[ 1 ]]
	)
) %>%
	mutate(
		label = paste0( comma( records ), " ", segment ),
		records = pmax( records, 0 )
	)

write_plot(
	"combined-ingredient-fuzz-progress.png",
	ggplot( combined_progress_segments, aes( x = "combined cross-product target", y = records, fill = segment ) ) +
		geom_col( width = 0.42 ) +
		geom_text(
			aes( label = label ),
			position = position_stack( vjust = 0.5 ),
			size = 3.4,
			color = "white"
		) +
		coord_flip() +
		scale_y_continuous(
			labels = comma,
			limits = c( 0, max( combined_ingredient_progress$target_records[[ 1 ]], 1 ) ),
			expand = expansion( mult = c( 0, 0.04 ) )
		) +
		scale_fill_brewer( palette = "Set2" ) +
		labs(
			title = "Combined-ingredient fuzzing progress",
			subtitle = paste0(
				combined_ingredient_feature,
				"; group enabled=",
				combined_ingredient_progress$group_enabled[[ 1 ]]
			),
			x = NULL,
			y = "completed records toward coverage floor",
			fill = NULL,
			caption = "A completed count requires HTTP polling, a large initial post, at least three browser users, reloads, save/autosave checkpoints, strict oracles, and a passed run."
		) +
		theme_rtc(),
	width = 10,
	height = 4.2
)

write_plot(
	"combined-ingredient-fuzz-goal-progress.png",
	ggplot( combined_ingredient_goal_progress, aes( x = progress_capped, y = reorder( label, progress_capped ), color = goal_family ) ) +
		geom_segment( aes( x = 0, xend = progress_capped, yend = reorder( label, progress_capped ) ), linewidth = 1.2, alpha = 0.72 ) +
		geom_point( aes( shape = met, size = target ), alpha = 0.85 ) +
		geom_text(
			aes( label = count_target ),
			hjust = -0.1,
			vjust = 0.5,
			size = 2.9,
			show.legend = FALSE
		) +
		scale_x_continuous( labels = percent_format( accuracy = 1 ), limits = c( 0, 1 ), expand = expansion( mult = c( 0.01, 0.22 ) ) ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_shape_manual( values = c( "FALSE" = 17, "TRUE" = 16 ) ) +
		scale_size_continuous( labels = comma, range = c( 2.4, 5.8 ) ) +
		labs(
			title = "Combined-ingredient fuzzing goal progress",
			x = "progress toward target",
			y = NULL,
			color = "goal family",
			shape = "met",
			size = "target",
			caption = "Includes the strict cross-product key plus adjacent large-post/three-user/HTTP goals so separate ingredient progress remains visible."
		) +
		theme_rtc(),
	width = 12,
	height = 5.8
)

combined_requirement_plot <- combined_ingredient_requirements %>%
	mutate(
		ingredient = factor( ingredient, levels = rev( ingredient ) ),
		record_check = str_wrap( record_check, width = 38 )
	)

write_plot(
	"combined-ingredient-fuzz-requirements.png",
	ggplot( combined_requirement_plot, aes( x = "required for one count", y = ingredient, fill = requirement_family ) ) +
		geom_tile( color = "white", linewidth = 0.7, width = 0.9, height = 0.78 ) +
		geom_text( aes( label = record_check ), size = 3.1, color = "gray15" ) +
		scale_fill_brewer( palette = "Set3" ) +
		labs(
			title = "Combined-ingredient fuzzing count criteria",
			x = NULL,
			y = NULL,
			fill = "ingredient family",
			caption = "These checks are conjunctive: separate ingredient-lane hits do not increment the combined cross-product key."
		) +
		theme_rtc() +
		theme(
			axis.text.x = element_blank(),
			panel.grid.major = element_blank()
		),
	width = 10,
	height = 5.7
)

many_user_active_progress_long <- many_user_active_editing_progress %>%
	select(
		threshold,
		successful_active_editor_records,
		lifecycle_records,
		rich_list_lifecycle_records,
		notes_lifecycle_records,
		http_lifecycle_records,
		same_user_lifecycle_records,
		revision_restore_records,
		publish_lifecycle_records,
		ui_signal_records,
		large_doc_records,
		successful_active_editor_target
	) %>%
	pivot_longer(
		cols = c(
			successful_active_editor_records,
			lifecycle_records,
			rich_list_lifecycle_records,
			notes_lifecycle_records,
			http_lifecycle_records,
			same_user_lifecycle_records,
			revision_restore_records,
			publish_lifecycle_records,
			ui_signal_records,
			large_doc_records
		),
		names_to = "metric",
		values_to = "records"
	) %>%
	filter( ! is.na( records ) ) %>%
	mutate(
		metric = recode(
			metric,
			successful_active_editor_records = "successful active-editor records",
			lifecycle_records = "active editors + lifecycle",
			rich_list_lifecycle_records = "rich/list lifecycle",
			notes_lifecycle_records = "notes lifecycle",
			http_lifecycle_records = "HTTP lifecycle",
			same_user_lifecycle_records = "same-user lifecycle",
			revision_restore_records = "revision restore",
			publish_lifecycle_records = "publish lifecycle",
			ui_signal_records = "presence/cursor signals",
			large_doc_records = "large-document edge"
		),
		threshold_label = paste0( threshold, "+ active editors" ),
		progress = if_else( successful_active_editor_target > 0, records / successful_active_editor_target, NA_real_ ),
		progress_capped = pmin( progress, 1 ),
		count_target = paste0( comma( records ), " / ", comma( successful_active_editor_target ) )
	)

write_plot(
	"many-user-active-editing-progress.png",
	ggplot( many_user_active_progress_long, aes( x = progress_capped, y = reorder( metric, progress_capped ), color = threshold_label ) ) +
		geom_segment( aes( x = 0, xend = progress_capped, yend = reorder( metric, progress_capped ) ), linewidth = 1.1, alpha = 0.66 ) +
		geom_point( size = 3, alpha = 0.86 ) +
		geom_text(
			aes( label = count_target ),
			hjust = -0.1,
			vjust = 0.5,
			size = 2.8,
			show.legend = FALSE
		) +
		facet_wrap( vars( threshold_label ), ncol = 2 ) +
		scale_x_continuous( labels = percent_format( accuracy = 1 ), limits = c( 0, 1 ), expand = expansion( mult = c( 0.01, 0.28 ) ) ) +
		scale_color_brewer( palette = "Dark2" ) +
		labs(
			title = "Many-user active-editing progress",
			subtitle = "Counts require distinct editing users, not only users present in the room.",
			x = "progress toward active-editor target",
			y = NULL,
			color = "threshold",
			caption = "The rich/list, UI-signal, and large-document rows are strict cross-products; separate rich-text or many-user lane hits do not increment them."
		) +
		theme_rtc() +
		theme( legend.position = "none" ),
	width = 12,
	height = 7
)

many_user_active_cross_product_plot <- many_user_active_editing_goal_progress %>%
	filter( str_starts( id, "cross-product:active-editors" ) ) %>%
	mutate( label = str_wrap( label, width = 44 ) )

write_plot(
	"many-user-active-editing-cross-products.png",
	ggplot( many_user_active_cross_product_plot, aes( x = progress_capped, y = reorder( label, progress_capped ), color = goal_family ) ) +
		geom_segment( aes( x = 0, xend = progress_capped, yend = reorder( label, progress_capped ) ), linewidth = 1.1, alpha = 0.7 ) +
		geom_point( aes( shape = met, size = target ), alpha = 0.86 ) +
		geom_text(
			aes( label = count_target ),
			hjust = -0.1,
			vjust = 0.5,
			size = 2.75,
			show.legend = FALSE
		) +
		scale_x_continuous( labels = percent_format( accuracy = 1 ), limits = c( 0, 1 ), expand = expansion( mult = c( 0.01, 0.24 ) ) ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_shape_manual( values = c( "FALSE" = 17, "TRUE" = 16 ) ) +
		scale_size_continuous( labels = comma, range = c( 2.3, 5.4 ) ) +
		labs(
			title = "Many-user active-editing cross-product goals",
			x = "progress toward target",
			y = NULL,
			color = "goal family",
			shape = "met",
			size = "target",
			caption = "These goals track users who actually edited plus lifecycle, rich/list, collaboration UI, and large-document requirements in the same successful record."
		) +
		theme_rtc(),
	width = 12,
	height = 7.2
)

many_user_active_requirement_plot <- many_user_active_editing_requirements %>%
	mutate(
		ingredient = factor( ingredient, levels = rev( ingredient ) ),
		record_check = str_wrap( record_check, width = 40 )
	)

write_plot(
	"many-user-active-editing-requirements.png",
	ggplot( many_user_active_requirement_plot, aes( x = "required for one count", y = ingredient, fill = requirement_family ) ) +
		geom_tile( color = "white", linewidth = 0.7, width = 0.9, height = 0.78 ) +
		geom_text( aes( label = record_check ), size = 3, color = "gray15" ) +
		scale_fill_brewer( palette = "Set3" ) +
		labs(
			title = "Many-user active-editing count criteria",
			x = NULL,
			y = NULL,
			fill = "ingredient family",
			caption = "N is the threshold shown in the progress graphs: 6, 10, 12, or 30 active editors."
		) +
		theme_rtc() +
		theme(
			axis.text.x = element_blank(),
			panel.grid.major = element_blank()
		),
	width = 10.5,
	height = 6
)

feature_category_plot <- feature_categories %>%
	mutate(
		category_family = case_when(
			feature_category %in% c( "action", "action-pair" ) ~ "actions",
			feature_category %in% c( "block", "block-depth", "initial-content", "media/cross-entity" ) ~ "content",
			feature_category %in% c( "history", "operation-ledger", "invariant" ) ~ "state/invariants",
			feature_category %in% c( "real-user", "collaborator", "revision", "save", "reload", "autosave", "lifecycle", "users", "auth" ) ~ "user/lifecycle",
			feature_category %in% c( "large-document", "step-count", "payload-size", "serialized-size" ) ~ "scale",
			feature_category == "cross-product" ~ "cross-product",
			feature_category %in% c( "fault", "transport", "profile", "code coverage" ) ~ "harness",
			TRUE ~ "other"
		),
		label_category = total_count >= quantile( total_count, 0.7 ) | keys >= quantile( keys, 0.7 )
	)

write_plot(
	"feature-category-coverage.png",
	ggplot( feature_category_plot, aes( x = keys, y = total_count, color = category_family, size = max_count ) ) +
		geom_point( alpha = 0.78 ) +
		geom_text(
			data = feature_category_plot %>% filter( label_category ),
			aes( label = feature_category ),
			hjust = -0.05,
			vjust = 0.5,
			size = 2.7,
			check_overlap = TRUE,
			show.legend = FALSE
		) +
		scale_x_log10( labels = comma ) +
		scale_y_log10( labels = comma ) +
		scale_color_brewer( palette = "Set2" ) +
		scale_size_continuous( labels = comma, range = c( 2, 7 ) ) +
		coord_cartesian( clip = "off" ) +
		labs(
			title = "Feature coverage breadth vs. repetition",
			x = "distinct feature keys, log scale",
			y = "total feature observations, log scale",
			color = "category family",
			size = "max key count"
		) +
		theme_rtc() +
		theme( plot.margin = margin( 5.5, 70, 5.5, 5.5 ) ),
	width = 10,
	height = 6.5
)

weak_profiles <- profile_plot_data %>%
	filter( success_rate < 0.1 | success_goal_state == "success goal unmet" ) %>%
	pull( profile )

top_actions <- action_counts %>%
	inner_join( profile_counts %>% select( profile, profile_family ), by = "profile" ) %>%
	filter( profile %in% weak_profiles ) %>%
	group_by( profile ) %>%
	slice_max( count, n = 8, with_ties = FALSE ) %>%
	arrange( count, .by_group = TRUE ) %>%
	mutate(
		action_display = str_wrap( action, width = 28 ),
		action_key = paste( profile, action_display, sep = "___" )
	) %>%
	ungroup() %>%
	mutate( action_key = factor( action_key, levels = unique( action_key ) ) )

write_plot(
	"successful-actions-by-profile.png",
	ggplot( top_actions, aes( x = count, y = action_key, color = profile_family ) ) +
		geom_point( alpha = 0.78, size = 2.4 ) +
		facet_wrap( vars( profile ), scales = "free_y", ncol = 2 ) +
		scale_x_continuous( labels = comma ) +
		scale_y_discrete( labels = function( x ) str_remove( x, "^.*___" ) ) +
		scale_color_brewer( palette = "Set2" ) +
		labs(
			title = "Successful actions within weak-completion profiles",
			x = "successful action count",
			y = NULL,
			color = "profile family",
			caption = "Profiles with zero successful action records do not appear in this chart."
		) +
		theme_rtc(),
	width = 10,
	height = 8
)

write_plot(
	"pr-review-loop-events.png",
	ggplot( pr_events, aes( x = timestamp, y = event_type, color = event_type ) ) +
		geom_point( alpha = 0.82, size = 2.6 ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_time_axis( date_breaks = "30 mins", date_labels = "%H:%M" ) +
		labs(
			title = "PR split review loop events",
			x = "UTC time",
			y = NULL,
			color = NULL
		) +
		theme_rtc(),
	width = 9,
	height = 4.8
)

duration_plot <- bind_rows(
	review_durations %>%
		transmute( timestamp = `review start`, cycle, duration_minutes, phase = "review cycle" ),
	feedback_durations %>%
		transmute( timestamp = `feedback start`, cycle, duration_minutes, phase = "feedback action" )
)

if ( nrow( duration_plot ) > 0 ) {
	write_plot(
		"pr-review-loop-durations.png",
		ggplot( duration_plot, aes( x = timestamp, y = duration_minutes, color = phase ) ) +
			geom_point( alpha = 0.82, size = 3 ) +
			scale_color_brewer( palette = "Set1" ) +
			scale_time_axis( date_breaks = "30 mins", date_labels = "%H:%M" ) +
			labs(
				title = "PR split loop duration by phase",
				x = "UTC start time",
				y = "duration in minutes",
				color = NULL
			) +
			theme_rtc(),
		width = 8,
		height = 4.8
	)
}

if ( nrow( pr_suggested_loc ) > 0 ) {
	pr_suggested_total <- pr_suggested_loc %>%
		group_by( timestamp, commit ) %>%
		summarise(
			files = sum( files, na.rm = TRUE ),
			additions = sum( additions, na.rm = TRUE ),
			deletions = sum( deletions, na.rm = TRUE ),
			net_loc = sum( net_loc, na.rm = TRUE ),
			.groups = "drop"
		)

	write_plot(
		"pr-suggested-total-net-loc-over-time.png",
		ggplot( pr_suggested_total, aes( x = timestamp, y = net_loc ) ) +
			geom_point( aes( size = files ), alpha = 0.78, color = "grey25" ) +
			scale_y_continuous( labels = comma ) +
			scale_size_continuous( labels = comma, range = c( 2.4, 6.8 ) ) +
			scale_time_axis( date_breaks = "30 mins", date_labels = "%H:%M\n%m-%d" ) +
			labs(
				title = "Suggested PR set net LOC over time",
				x = "UTC snapshot time",
				y = "net LOC",
				size = "files",
				caption = "Each point sums additions minus deletions across all rows in the Proposed PR Split table for one status-report snapshot."
			) +
			theme_rtc(),
		width = 9,
		height = 5
	)

	pr_suggested_plot <- pr_suggested_loc %>%
		mutate(
			pr = factor( pr, levels = pr_number_levels( pr ) )
		)

	write_plot(
		"pr-suggested-net-loc-by-pr-over-time.png",
		ggplot( pr_suggested_plot, aes( x = timestamp, y = net_loc, size = files ) ) +
			geom_point( alpha = 0.76, color = "grey25" ) +
			facet_wrap( vars( pr ), ncol = 4, scales = "free_y" ) +
			scale_size_continuous( labels = comma, range = c( 1.6, 4.8 ) ) +
			scale_y_continuous( labels = comma, limits = c( 0, NA ) ) +
			scale_time_axis( date_breaks = "1 hour", date_labels = "%H:%M" ) +
			labs(
				title = "Suggested PR net LOC by PR over time",
				x = "UTC snapshot time",
				y = "net LOC",
				size = "files",
				caption = "Each facet is one suggested PR row from the Proposed PR Split table. Net LOC is additions minus deletions."
			) +
			theme_rtc() +
			guides(
				size = guide_legend( title.position = "top", nrow = 1 )
			) +
			theme(
				legend.box = "vertical",
				strip.placement = "outside"
			),
		width = 12,
		height = 9.5
	)
}

if ( nrow( pr_progress_state_counts ) > 0 ) {
	pr_state_plot <- pr_progress_state_counts %>%
		mutate(
			status_label = str_wrap( status, width = 24 ),
			kind_label = str_wrap( kind, width = 22 ),
			priority = factor( priority, levels = c( "high", "medium", "low", "unknown" ) )
		)

	write_plot(
		"pr-progress-current-state.png",
		ggplot( pr_state_plot, aes( x = items, y = status_label, color = priority, size = items ) ) +
			geom_point( alpha = 0.82 ) +
			facet_wrap( vars( kind_label ), scales = "free_y", ncol = 1 ) +
			scale_x_continuous( labels = comma, breaks = pretty_breaks() ) +
			scale_size_continuous( range = c( 2.2, 7 ), breaks = pretty_breaks() ) +
			scale_color_brewer( palette = "Set1", na.translate = FALSE ) +
			labs(
				title = "PR-focused controller current work state",
				x = "distinct work items",
				y = NULL,
				color = "priority",
				size = "items",
				caption = "Rows are distinct controller work items from current-pr-progress.tsv. Duplicate evidence rows for the same item/status are counted once."
			) +
			theme_rtc(),
		width = 9,
		height = 6.5
	)
}

if ( nrow( pr_controller_events ) > 0 ) {
	write_plot(
		"pr-progress-controller-events.png",
		ggplot( pr_controller_events, aes( x = timestamp, y = event_type, color = event_type ) ) +
			geom_point( alpha = 0.82, size = 2.6 ) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_time_axis( date_breaks = "5 mins", date_labels = "%H:%M" ) +
			labs(
				title = "PR-focused controller events",
				x = "UTC time",
				y = NULL,
				color = NULL,
				caption = "Controller events include persona control rounds and heavy PR-job deferrals caused by discovery/resource protection."
			) +
			theme_rtc(),
		width = 9,
		height = 4.8
	)
}

if ( nrow( pr_blocker_stall_events ) > 0 ) {
	blocker_stall_plot <- pr_blocker_stall_events %>%
		mutate(
			blocker_class = str_wrap( blocker_class, width = 26 ),
			source = factor( source, levels = c( "PR controller", "critical-path launches" ) )
		)

	write_plot(
		"pr-blocker-stall-events-over-time.png",
		ggplot( blocker_stall_plot, aes( x = bucket, y = events, fill = blocker_class ) ) +
			geom_col( alpha = 0.86, width = 30 * 60 ) +
			facet_wrap( vars( source ), ncol = 1, scales = "free_y" ) +
			scale_fill_brewer( palette = "Dark2" ) +
			scale_y_continuous( labels = comma, breaks = pretty_breaks() ) +
			scale_time_axis( date_breaks = "6 hours" ) +
			labs(
				title = "PR blocker and stall events over time",
				x = "UTC time",
				y = "events per 30-minute bucket",
				fill = "blocker/stall class",
				caption = "Controller stalls include resource reserve, single-flight/concurrency, consumed owner evidence, and persona blocks. Critical-path launches show repeated blocker continuation or validation churn."
			) +
			theme_rtc(),
		width = 11,
		height = 6.8
	)
}

if ( nrow( pr_progress_push_manifest ) > 0 ) {
	push_plot <- pr_progress_push_manifest %>%
		mutate(
			branch_short = factor( branch_short, levels = branch_short[ order( net_loc ) ] )
		)

	write_plot(
		"pr-progress-publishable-diff-size.png",
		ggplot( push_plot, aes( x = net_loc, y = branch_short, size = files_changed ) ) +
			geom_point( alpha = 0.78, color = "grey25" ) +
			scale_x_continuous( labels = comma ) +
			scale_size_continuous( range = c( 2, 6 ), breaks = pretty_breaks() ) +
			labs(
				title = "Controller-publishable PR branch diff sizes",
				x = "net LOC",
				y = NULL,
				size = "files",
				caption = "Rows are branches the PR progress controller marked publishable for local GitHub publication."
			) +
			theme_rtc(),
		width = 10,
		height = 6.2
	)
}

if ( nrow( artifact_index_scope ) > 0 ) {
	artifact_scope_plot <- artifact_index_scope %>%
		mutate(
			root = factor( root, levels = unique( root[ order( root ) ] ) ),
			kind = str_wrap( kind, width = 22 )
		)

	write_plot(
		"pr-artifact-index-scope.png",
		ggplot( artifact_scope_plot, aes( x = artifacts, y = kind, color = root, size = artifacts ) ) +
			geom_point( alpha = 0.78 ) +
			facet_wrap( vars( root ), scales = "free_x", ncol = 2 ) +
			scale_x_continuous( labels = comma ) +
			scale_size_continuous( range = c( 1.8, 6.5 ), labels = comma ) +
			scale_color_brewer( palette = "Set2", guide = "none" ) +
			labs(
				title = "PR artifact index scope by source tree",
				x = "indexed artifacts",
				y = NULL,
				size = "artifacts",
				caption = "The shared artifact index replaces repeated historical scans for PR progress, publication, and blocker classification."
			) +
			theme_rtc(),
		width = 10,
		height = 7
	)
}

if ( nrow( artifact_index_events ) > 0 && any( ! is.na( artifact_index_events$artifacts ) | ! is.na( artifact_index_events$branches ) ) ) {
	artifact_index_growth <- artifact_index_events %>%
		select( timestamp, artifacts, branches ) %>%
		pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
		filter( ! is.na( value ) )

	write_plot(
		"pr-artifact-index-growth.png",
		ggplot( artifact_index_growth, aes( x = timestamp, y = value, color = metric ) ) +
			geom_point( alpha = 0.82, size = 2.4 ) +
			scale_y_continuous( labels = comma ) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_time_axis( date_breaks = "5 mins", date_labels = "%H:%M" ) +
			labs(
				title = "PR artifact index refresh size",
				x = "UTC time",
				y = "indexed rows",
				color = NULL
			) +
			theme_rtc(),
		width = 8.5,
		height = 4.6
	)
}

if ( nrow( critical_blockers ) > 0 ) {
	blocker_plot <- critical_blockers %>%
		mutate(
			blocker_label = str_wrap( blocker_id, width = 28 ),
			state = factor( state, levels = c( "active", "queued", "terminal", "blocked", "" ) )
		)

	write_plot(
		"pr-critical-blocker-state.png",
		ggplot( blocker_plot, aes( x = state, y = blocker_label, color = kind, shape = priority ) ) +
			geom_point( alpha = 0.85, size = 3.2 ) +
			scale_color_brewer( palette = "Dark2" ) +
			labs(
				title = "Critical PR blocker state",
				x = "state",
				y = NULL,
				color = "kind",
				shape = "priority",
				caption = "Current blockers from the critical-path PR executor; terminal rows reopen only with fresh product-owned evidence."
			) +
			theme_rtc(),
		width = 8.5,
		height = 4.8
	)
}

if ( nrow( local_publisher_events ) > 0 ) {
	write_plot(
		"pr-local-publisher-activity.png",
		ggplot( local_publisher_events, aes( x = timestamp, y = event_type, color = event_type ) ) +
			geom_point( alpha = 0.76, size = 2.1 ) +
			scale_color_brewer( palette = "Dark2" ) +
			scale_time_axis( date_breaks = "30 mins", date_labels = "%H:%M" ) +
			labs(
				title = "Local PR branch publisher activity",
				x = "UTC time",
				y = NULL,
				color = NULL,
				caption = "The local publisher consumes Jetstream manifests and pushes safe branches to the danluu remote."
			) +
			theme_rtc(),
		width = 9,
		height = 4.6
	)
}

if ( nrow( pr_loop_queue_depth ) > 0 ) {
	queue_depth_plot <- pr_loop_queue_depth %>%
		mutate(
			queue = factor(
				queue,
				levels = c(
					"PR progress items",
					"controller decisions",
					"critical blockers",
					"critical job queue",
					"critical lanes",
					"active sessions"
				)
			),
			state_label = str_wrap( state, width = 36 ),
			priority = str_replace_na( priority, "unknown" )
		)

	write_plot(
		"pr-loop-queue-depth-current.png",
		ggplot( queue_depth_plot, aes( x = depth, y = state_label, color = priority, size = depth ) ) +
			geom_point( alpha = 0.82 ) +
			facet_wrap( vars( queue ), scales = "free_y", ncol = 1 ) +
			scale_x_continuous( labels = comma, breaks = pretty_breaks() ) +
			scale_size_continuous( range = c( 2, 7 ), labels = comma ) +
			scale_color_brewer( palette = "Dark2", na.translate = FALSE ) +
			labs(
				title = "PR loop current queue depth",
				x = "items waiting or active",
				y = NULL,
				color = "priority/class",
				size = "items",
				caption = "Combines PR progress items, controller decisions, critical blockers, queued critical jobs, critical lanes, and active PR-related sessions."
			) +
			theme_rtc(),
		width = 10,
		height = 9
	)
}

if ( nrow( pr_loop_blocked_decisions ) > 0 ) {
	blocked_decisions_plot <- pr_loop_blocked_decisions %>%
		mutate(
			action = str_wrap( action, width = 22 ),
			target_label = factor( target_label, levels = rev( unique( target_label ) ) ),
			priority = factor( priority, levels = c( "high", "medium", "low", "unknown", "" ) )
		)

	write_plot(
		"pr-loop-blocked-control-decisions.png",
		ggplot( blocked_decisions_plot, aes( x = action, y = target_label, color = priority ) ) +
			geom_point( alpha = 0.84, size = 3 ) +
			scale_color_brewer( palette = "Set1", na.translate = FALSE ) +
			labs(
				title = "PR loop blocked control decisions",
				x = "blocked action",
				y = NULL,
				color = "priority",
				caption = "Rows are current controller decisions with allowed=no; this is the live list of product, diagnostic, and sweep work the controller is intentionally blocking."
			) +
			theme_rtc(),
		width = 10,
		height = 6.8
	)
}

if ( nrow( critical_branch_validation_summary ) > 0 && any( critical_branch_validation_summary$fail > 0, na.rm = TRUE ) ) {
	validation_repeats <- critical_branch_validation_summary %>%
		filter( fail > 0 ) %>%
		slice_head( n = 20 ) %>%
		mutate( branch_short = factor( branch_short, levels = branch_short[ order( fail, total ) ] ) ) %>%
		select( branch_short, pass, fail, total ) %>%
		pivot_longer( c( pass, fail ), names_to = "result", values_to = "attempts" ) %>%
		filter( attempts > 0 )

	write_plot(
		"pr-loop-repeated-validation-results.png",
		ggplot( validation_repeats, aes( x = attempts, y = branch_short, color = result, size = attempts ) ) +
			geom_point( alpha = 0.82 ) +
			scale_x_continuous( labels = comma, breaks = pretty_breaks() ) +
			scale_size_continuous( range = c( 2, 7 ), labels = comma ) +
			scale_color_brewer( palette = "Dark2" ) +
			labs(
				title = "Repeated critical-path branch validation results",
				x = "validation attempts",
				y = NULL,
				color = "result",
				size = "attempts",
				caption = "Top branches by repeated diff-check failures in current-branch-audit.tsv. Pass points on the same row show whether a branch also has successful validations."
			) +
			theme_rtc(),
		width = 10,
		height = 7.5
	)
}

if ( nrow( critical_no_progress_summary ) > 0 ) {
	no_progress_plot <- critical_no_progress_summary %>%
		mutate(
			item_label = str_wrap( item_id, width = 34 ),
			reason = str_wrap( reason, width = 32 ),
			item_label = factor( item_label, levels = unique( item_label[ order( rejections ) ] ) )
		)

	write_plot(
		"pr-loop-no-progress-artifacts.png",
		ggplot( no_progress_plot, aes( x = rejections, y = item_label, color = reason, size = rejections ) ) +
			geom_point( alpha = 0.82 ) +
			scale_x_continuous( labels = comma, breaks = pretty_breaks() ) +
			scale_size_continuous( range = c( 2, 7 ), labels = comma ) +
			scale_color_brewer( palette = "Dark2" ) +
			labs(
				title = "Repeated critical-path no-progress artifacts",
				x = "rejected artifacts",
				y = NULL,
				color = "reason",
				size = "artifacts",
				caption = "Grouped no-progress ledger rows. These are artifacts the critical-path loop rejected as not advancing a blocker."
			) +
			theme_rtc(),
		width = 10,
		height = 6.5
	)
}

fuzz_level_latest <- if ( nrow( fuzz_level_mix ) > 0 ) {
	fuzz_level_mix %>%
		filter( is_latest ) %>%
		group_by( fuzz_level ) %>%
		summarise( lanes = sum( lanes, na.rm = TRUE ), groups = n(), .groups = "drop" )
} else {
	tibble()
}

fuzz_level_latest_text <- if ( nrow( fuzz_level_latest ) > 0 ) {
	paste0( fuzz_level_latest$fuzz_level, "=", fuzz_level_latest$lanes, " lanes/", fuzz_level_latest$groups, " groups", collapse = "; " )
} else {
	NA_character_
}

fuzz_level_campaigns_text <- if ( nrow( fuzz_level_mix ) > 0 ) {
	paste( sort( unique( fuzz_level_mix$campaign ) ), collapse = "," )
} else {
	NA_character_
}

fuzz_execution_latest <- if ( nrow( fuzz_execution_counts ) > 0 ) {
	fuzz_execution_counts %>%
		filter( bucket == max( bucket, na.rm = TRUE ) ) %>%
		arrange( fuzz_level )
} else {
	tibble()
}

fuzz_execution_latest_text <- if ( nrow( fuzz_execution_latest ) > 0 ) {
	paste0(
		fuzz_execution_latest$fuzz_level,
		"=",
		fuzz_execution_latest$cumulative_executions,
		" cumulative/",
		fuzz_execution_latest$executions_per_hour,
		" per-hour",
		collapse = "; "
	)
} else {
	NA_character_
}

bug_effectiveness_latest <- if ( nrow( bug_effectiveness_by_level ) > 0 ) {
	bug_effectiveness_by_level %>%
		filter( bucket == max( bucket, na.rm = TRUE ) ) %>%
		arrange( fuzz_level )
} else {
	tibble()
}

bug_effectiveness_latest_text <- if ( nrow( bug_effectiveness_latest ) > 0 ) {
	paste0(
		bug_effectiveness_latest$fuzz_level,
		"=",
		number( bug_effectiveness_latest$cumulative_likely_real_findings, accuracy = 1 ),
		" likely-real/",
		number( bug_effectiveness_latest$cumulative_runner_hours, accuracy = 0.1 ),
		" runner-hours/",
		number( bug_effectiveness_latest$likely_real_findings_per_100_runner_hours, accuracy = 0.01 ),
		" per-100-runner-hours",
		collapse = "; "
	)
} else {
	NA_character_
}

failure_candidate_latest_text <- if ( nrow( bug_effectiveness_latest ) > 0 ) {
	paste0(
		bug_effectiveness_latest$fuzz_level,
		"=",
		number( bug_effectiveness_latest$cumulative_failed_attempts, accuracy = 1 ),
		" failed-attempts/",
		number( bug_effectiveness_latest$failed_attempts_per_100_runner_hours, accuracy = 0.1 ),
		" per-100-runner-hours",
		collapse = "; "
	)
} else {
	NA_character_
}

bug_output_effectiveness_latest <- if ( nrow( bug_output_effectiveness_by_level ) > 0 ) {
	bug_output_effectiveness_by_level %>%
		filter( bucket == max( bucket, na.rm = TRUE ) ) %>%
		arrange( fuzz_level )
} else {
	tibble()
}

bug_output_effectiveness_latest_text <- if ( nrow( bug_output_effectiveness_latest ) > 0 ) {
	paste0(
		bug_output_effectiveness_latest$fuzz_level,
		"=",
		number( bug_output_effectiveness_latest$cumulative_unique_bug_outputs, accuracy = 1 ),
		" unique-candidates/",
		number( bug_output_effectiveness_latest$cumulative_runner_hours, accuracy = 0.1 ),
		" runner-hours/",
		number( bug_output_effectiveness_latest$unique_bug_outputs_per_100_runner_hours, accuracy = 0.01 ),
		" per-100-runner-hours",
		collapse = "; "
	)
} else {
	NA_character_
}

pr_progress_state_text <- if ( nrow( pr_progress_state_counts ) > 0 ) {
	paste0(
		pr_progress_state_counts$kind,
		"/",
		pr_progress_state_counts$status,
		"/",
		pr_progress_state_counts$priority,
		"=",
		pr_progress_state_counts$items,
		collapse = "; "
	)
} else {
	NA_character_
}

pr_controller_event_text <- if ( nrow( pr_controller_events ) > 0 ) {
	pr_controller_events %>%
		count( event_type ) %>%
		mutate( text = paste0( event_type, "=", n ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

critical_blocker_state_text <- if ( nrow( critical_blockers ) > 0 ) {
	critical_blockers %>%
		count( state ) %>%
		mutate( text = paste0( state, "=", n ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

pr_queue_depth_text <- if ( nrow( pr_loop_queue_depth ) > 0 ) {
	pr_loop_queue_depth %>%
		mutate( text = paste0( queue, "/", state, "=", depth ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

blocked_decision_text <- if ( nrow( pr_loop_blocked_decisions ) > 0 ) {
	pr_loop_blocked_decisions %>%
		count( action, priority, name = "items" ) %>%
		mutate( text = paste0( action, "/", priority, "=", items ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

blocker_stall_event_text <- if ( nrow( pr_blocker_stall_events ) > 0 ) {
	pr_blocker_stall_events %>%
		count( source, blocker_class, wt = events, name = "events" ) %>%
		mutate( text = paste0( source, "/", blocker_class, "=", events ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

repeated_validation_text <- if ( nrow( critical_branch_validation_summary ) > 0 && any( critical_branch_validation_summary$fail > 0, na.rm = TRUE ) ) {
	critical_branch_validation_summary %>%
		filter( fail > 0 ) %>%
		slice_head( n = 8 ) %>%
		mutate( text = paste0( branch, " fail=", fail, " pass=", pass ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

no_progress_text <- if ( nrow( critical_no_progress_summary ) > 0 ) {
	critical_no_progress_summary %>%
		slice_head( n = 8 ) %>%
		mutate( text = paste0( item_id, "/", reason, "=", rejections ) ) %>%
		pull( text ) %>%
		paste( collapse = "; " )
} else {
	NA_character_
}

summary_lines <- c(
	paste0( "generated_at_utc: ", format( with_tz( now(), "UTC" ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "monitor_passes: ", nrow( monitor ) ),
	paste0( "first_pass_utc: ", format( min( monitor$timestamp ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "last_pass_utc: ", format( max( monitor$timestamp ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "coverage_records_seen_first: ", first( monitor$records_seen ) ),
	paste0( "coverage_records_seen_last: ", last( monitor$records_seen ) ),
	paste0( "coverage_records_seen_delta: ", last( monitor$records_seen ) - first( monitor$records_seen ) ),
	paste0( "coverage_files_first: ", first( monitor$coverage_files ) ),
	paste0( "coverage_files_last: ", last( monitor$coverage_files ) ),
	paste0( "coverage_files_delta: ", last( monitor$coverage_files ) - first( monitor$coverage_files ) ),
	paste0( "unmet_coverage_first: ", first( monitor$unmet_coverage ) ),
	paste0( "unmet_coverage_last: ", last( monitor$unmet_coverage ) ),
	paste0( "likely_real_max: ", max( monitor$likely_real, na.rm = TRUE ) ),
	paste0( "duplicate_share_current_last: ", last( monitor$duplicate_share_current ) ),
	paste0( "duplicate_share_historical_last: ", last( monitor$duplicate_share_historical ) ),
	paste0( "summary_startup_failures_last: ", last( monitor$summary_startup_failures ) ),
	paste0( "current_run_accounting_snapshots: ", nrow( current_run_accounting ) ),
	paste0( "current_run_metrics_trusted_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$current_run_metrics_trusted ), NA ) ),
	paste0( "current_run_full_pass_pending_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$full_pass_pending | current_run_accounting$pending_until_first_pass ), NA ) ),
	paste0( "current_run_minutes_since_completed_full_pass_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$minutes_since_completed_full_pass ), NA ) ),
	paste0( "current_run_signatures_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$current_run_signatures ), NA ) ),
	paste0( "current_run_actionable_signatures_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$current_run_actionable_signatures ), NA ) ),
	paste0( "current_run_top_duplicate_share_last: ", ifelse( nrow( current_run_accounting ) > 0, last( current_run_accounting$current_run_top_duplicate_share ), NA ) ),
	paste0( "quality_issues_last: ", last( monitor$quality_issues ) ),
	paste0( "memory_free_gb_last: ", last( monitor$memory_free_gb ) ),
	paste0( "root_disk_free_gib_last: ", ifelse( exists( "disk_free_space" ) && nrow( disk_free_space ) > 0, last( disk_free_space$root_free_gib ), NA ) ),
	paste0( "root_disk_used_percent_last: ", ifelse( exists( "disk_free_space" ) && nrow( disk_free_space ) > 0, last( disk_free_space$root_used_percent ), NA ) ),
	paste0( "data_disk_free_gib_last: ", ifelse( exists( "disk_free_space" ) && nrow( disk_free_space ) > 0, last( disk_free_space$data_free_gib ), NA ) ),
	paste0( "data_disk_used_percent_last: ", ifelse( exists( "disk_free_space" ) && nrow( disk_free_space ) > 0, last( disk_free_space$data_used_percent ), NA ) ),
	paste0( "coverage_root_loss_events: ", ifelse( exists( "coverage_root_loss" ) && nrow( coverage_root_loss ) > 0, nrow( coverage_root_loss ), 0 ) ),
	paste0( "coverage_root_loss_restarts: ", ifelse( exists( "coverage_root_loss" ) && nrow( coverage_root_loss ) > 0, sum( coverage_root_loss$event_type == "restart", na.rm = TRUE ), 0 ) ),
	paste0( "coverage_root_budget_in_place_events: ", ifelse( exists( "coverage_root_loss" ) && nrow( coverage_root_loss ) > 0, sum( coverage_root_loss$event_type == "in_place_budget", na.rm = TRUE ), 0 ) ),
	paste0( "coverage_root_estimated_lost_hours: ", ifelse( exists( "coverage_root_loss" ) && nrow( coverage_root_loss ) > 0, round( sum( coverage_root_loss$estimated_lost_seconds, na.rm = TRUE ) / 3600, 3 ), 0 ) ),
	paste0( "coverage_root_estimated_lost_records: ", ifelse( exists( "coverage_root_loss" ) && nrow( coverage_root_loss ) > 0, sum( coverage_root_loss$estimated_lost_records, na.rm = TRUE ), 0 ) ),
	paste0( "load_1_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_1 ), NA ) ),
	paste0( "load_5_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_5 ), NA ) ),
	paste0( "load_15_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_15 ), NA ) ),
	paste0( "core_count: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$core_count ), NA ) ),
	paste0( "enabled_group_events: ", nrow( enabled_groups ) ),
	paste0( "enabled_groups_current: ", paste( state$enabledGroups, collapse = "," ) ),
	paste0( "fuzz_level_mix_snapshots: ", n_distinct( fuzz_level_mix$timestamp ) ),
	paste0( "fuzz_level_mix_campaigns: ", fuzz_level_campaigns_text ),
	paste0( "fuzz_level_mix_latest: ", fuzz_level_latest_text ),
	paste0( "fuzz_level_test_executions: ", ifelse( nrow( fuzz_level_executions ) > 0, sum( fuzz_level_executions$executions, na.rm = TRUE ), 0 ) ),
	paste0( "fuzz_level_test_executions_has_approximate_rows: ", ifelse( nrow( fuzz_level_executions ) > 0, any( fuzz_level_executions$approximate, na.rm = TRUE ), FALSE ) ),
	paste0( "fuzz_level_execution_latest: ", fuzz_execution_latest_text ),
	paste0( "bug_findings_rows: ", nrow( bug_findings ) ),
	paste0( "bug_findings_unique_likely_real: ", nrow( bug_findings_unique ) ),
	paste0( "bug_findings_unique_candidate_signals: ", nrow( bug_candidate_unique ) ),
	paste0( "bug_outputs_rows: ", nrow( bug_outputs ) ),
	paste0( "bug_outputs_unique_candidates: ", nrow( bug_outputs_unique ) ),
	paste0( "bug_effectiveness_latest: ", bug_effectiveness_latest_text ),
	paste0( "failure_candidate_effectiveness_latest: ", failure_candidate_latest_text ),
	paste0( "bug_output_effectiveness_latest: ", bug_output_effectiveness_latest_text ),
	paste0( "profiles_seen: ", nrow( profile_counts ) ),
	paste0( "goals_total: ", nrow( coverage_goals ) ),
	paste0( "goals_unmet: ", sum( ! coverage_goals$met ) ),
	paste0( "combined_ingredient_feature: ", combined_ingredient_feature ),
	paste0( "combined_ingredient_completed: ", combined_ingredient_progress$completed_cross_product_records[[ 1 ]] ),
	paste0( "combined_ingredient_target: ", combined_ingredient_progress$target_records[[ 1 ]] ),
	paste0( "combined_ingredient_remaining: ", combined_ingredient_progress$remaining_records[[ 1 ]] ),
	paste0( "combined_ingredient_group_enabled: ", combined_ingredient_progress$group_enabled[[ 1 ]] ),
	paste0( "combined_ingredient_profile_successful_records: ", combined_ingredient_progress$profile_successful_records[[ 1 ]] ),
	paste0( "many_user_active_editing_profile_successful_records: ", many_user_active_editing_progress$profile_successful_records[[ 1 ]] ),
	paste0( "many_user_active_editing_success_action_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( successful_active_editor_records ) ),
	paste0( "many_user_active_editing_success_action_users_12: ", many_user_active_editing_progress %>% filter( threshold == 12 ) %>% pull( successful_active_editor_records ) ),
	paste0( "many_user_active_editing_success_action_users_30: ", many_user_active_editing_progress %>% filter( threshold == 30 ) %>% pull( successful_active_editor_records ) ),
	paste0( "many_user_active_editing_rich_list_users_12: ", many_user_active_editing_progress %>% filter( threshold == 12 ) %>% pull( rich_list_lifecycle_records ) ),
	paste0( "many_user_active_editing_notes_lifecycle_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( notes_lifecycle_records ) ),
	paste0( "many_user_active_editing_notes_lifecycle_users_12: ", many_user_active_editing_progress %>% filter( threshold == 12 ) %>% pull( notes_lifecycle_records ) ),
	paste0( "many_user_active_editing_http_lifecycle_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( http_lifecycle_records ) ),
	paste0( "many_user_active_editing_http_max_clients_override: ", get_feature_numeric( "http-max-clients-override:true", get_goal_numeric( "http-max-clients-override:true", "count", 0 ) ) ),
	paste0( "many_user_active_editing_same_user_lifecycle_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( same_user_lifecycle_records ) ),
	paste0( "many_user_active_editing_revision_restore_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( revision_restore_records ) ),
	paste0( "many_user_active_editing_publish_lifecycle_users_6: ", many_user_active_editing_progress %>% filter( threshold == 6 ) %>% pull( publish_lifecycle_records ) ),
	paste0( "many_user_active_editing_large_doc_users_30: ", many_user_active_editing_progress %>% filter( threshold == 30 ) %>% pull( large_doc_records ) ),
	paste0( "pr_review_events: ", nrow( pr_events ) ),
	paste0( "pr_suggested_net_loc_snapshots: ", n_distinct( pr_suggested_loc$timestamp ) ),
	paste0( "pr_suggested_net_loc_latest_total: ", ifelse( nrow( pr_suggested_loc ) > 0, pr_suggested_loc %>% filter( timestamp == max( timestamp, na.rm = TRUE ) ) %>% summarise( total = sum( net_loc, na.rm = TRUE ) ) %>% pull( total ), NA ) ),
	paste0( "pr_progress_controller_items: ", ifelse( nrow( pr_progress_current ) > 0, n_distinct( pr_progress_current$item_id ), 0 ) ),
	paste0( "pr_progress_state_counts: ", pr_progress_state_text ),
	paste0( "pr_progress_publishable_branches: ", ifelse( nrow( pr_progress_push_manifest ) > 0, nrow( pr_progress_push_manifest ), 0 ) ),
	paste0( "pr_progress_publishable_net_loc: ", ifelse( nrow( pr_progress_push_manifest ) > 0, sum( pr_progress_push_manifest$net_loc, na.rm = TRUE ), 0 ) ),
	paste0( "pr_progress_controller_events: ", pr_controller_event_text ),
	paste0( "artifact_index_rows: ", ifelse( nrow( artifact_index_artifacts ) > 0, nrow( artifact_index_artifacts ), 0 ) ),
	paste0( "artifact_index_scope_rows: ", nrow( artifact_index_scope ) ),
	paste0( "critical_blockers: ", ifelse( nrow( critical_blockers ) > 0, nrow( critical_blockers ), 0 ) ),
	paste0( "critical_blocker_states: ", critical_blocker_state_text ),
	paste0( "pr_loop_queue_depth: ", pr_queue_depth_text ),
	paste0( "pr_loop_blocked_decisions: ", ifelse( nrow( pr_loop_blocked_decisions ) > 0, nrow( pr_loop_blocked_decisions ), 0 ) ),
	paste0( "pr_loop_blocked_decision_types: ", blocked_decision_text ),
	paste0( "pr_blocker_stall_event_buckets: ", ifelse( nrow( pr_blocker_stall_events ) > 0, nrow( pr_blocker_stall_events ), 0 ) ),
	paste0( "pr_blocker_stall_event_types: ", blocker_stall_event_text ),
	paste0( "critical_repeated_validation_failures: ", repeated_validation_text ),
	paste0( "critical_no_progress_artifacts: ", ifelse( nrow( critical_no_progress ) > 0, nrow( critical_no_progress ), 0 ) ),
	paste0( "critical_no_progress_top: ", no_progress_text ),
	paste0( "critical_terminal_ledger_rows: ", ifelse( nrow( critical_terminal_ledger ) > 0, nrow( critical_terminal_ledger ), 0 ) ),
	paste0( "local_publisher_events: ", ifelse( nrow( local_publisher_events ) > 0, nrow( local_publisher_events ), 0 ) )
)

write_lines( summary_lines, file.path( data_dir, "summary.txt" ) )
