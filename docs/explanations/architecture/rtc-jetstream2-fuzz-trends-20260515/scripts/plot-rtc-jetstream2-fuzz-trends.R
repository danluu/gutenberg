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
monitor_path <- file.path( raw_dir, "monitor.log" )
loop_path <- file.path( raw_dir, "pr-split-loop.log" )
state_path <- file.path( raw_dir, "novelty-state.json" )
cpu_path <- file.path( data_dir, "cpu_utilization.csv" )
load_path <- file.path( data_dir, "load_average.csv" )
activity_path <- file.path( data_dir, "project_activity.csv" )
fuzz_level_mix_path <- file.path( data_dir, "fuzz_level_mix.csv" )
status_report_rel <- "docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md"
status_report_path <- file.path( root, status_report_rel )

stopifnot( file.exists( monitor_path ) )
stopifnot( file.exists( loop_path ) )
stopifnot( file.exists( state_path ) )

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

timestamp_from_brackets <- function( lines ) {
	ymd_hms( str_match( lines, "^\\[([^\\]]+)\\]" )[ , 2 ], tz = "UTC" )
}

monitor_lines <- read_lines( monitor_path, progress = FALSE )
pass_lines <- monitor_lines[ str_detect( monitor_lines, "\\] pass:" ) ]

monitor <- tibble(
	timestamp = timestamp_from_brackets( pass_lines ),
	processed = extract_num( pass_lines, "processed=([0-9]+)" ),
	coverage_files = extract_num( pass_lines, "files=([0-9]+)" ),
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
		extract_num( pass_lines, "rawDuplicateShareCurrent=([0-9.]+)" ),
		extract_num( pass_lines, "duplicateShare=([0-9.]+)" )
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
			is_latest = case_when(
				is.logical( is_latest ) ~ is_latest,
				str_to_lower( as.character( is_latest ) ) == "true" ~ TRUE,
				TRUE ~ FALSE
			),
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
			str_detect( id, "reload|lifecycle|same-user|late-join|step-count|large-document" ) ~ "lifecycle/scale",
			str_detect( id, "revision|autosave|save-count|local-autosave" ) ~ "persistence/revision",
			str_detect( id, "auth|collaborator-role" ) ~ "auth/locks",
			str_detect( id, "cdp" ) ~ "code coverage",
			TRUE ~ "other"
		)
	) %>%
	arrange( met, progress )

write_csv( coverage_goals, file.path( data_dir, "coverage_goals.csv" ) )

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
	pivot_wider( names_from = event_type, values_from = timestamp ) %>%
	filter( ! is.na( `review start` ), ! is.na( `review finish` ) ) %>%
	mutate( duration_minutes = as.numeric( difftime( `review finish`, `review start`, units = "mins" ) ) )

feedback_durations <- pr_events %>%
	filter( event_type %in% c( "feedback start", "feedback finish" ) ) %>%
	select( timestamp, event_type, cycle ) %>%
	pivot_wider( names_from = event_type, values_from = timestamp ) %>%
	filter( ! is.na( `feedback start` ), ! is.na( `feedback finish` ) ) %>%
	mutate( duration_minutes = as.numeric( difftime( `feedback finish`, `feedback start`, units = "mins" ) ) )

write_csv( pr_events, file.path( data_dir, "pr_review_events.csv" ) )
write_csv( review_durations, file.path( data_dir, "pr_review_durations.csv" ) )
write_csv( feedback_durations, file.path( data_dir, "pr_feedback_durations.csv" ) )

pr_suggested_loc <- status_report_history()
write_csv( pr_suggested_loc, file.path( data_dir, "pr_suggested_net_loc.csv" ) )

coverage_long <- monitor %>%
	select( timestamp, coverage_files, unmet_coverage ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			coverage_files = "coverage files",
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
			scale_y_continuous( labels = comma ) +
			scale_time_axis( date_breaks = "4 hours" ) +
			labs(
				title = "Load average over time",
				x = "UTC time",
				y = "load average",
				color = NULL,
				caption = "Each point is one sysstat sample. The dashed line is the logical CPU count."
			) +
			theme_rtc(),
		width = 9,
		height = 5.4
	)
}

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

feature_category_plot <- feature_categories %>%
	mutate(
		category_family = case_when(
			feature_category %in% c( "action", "action-pair" ) ~ "actions",
			feature_category %in% c( "block", "block-depth", "initial-content", "media/cross-entity" ) ~ "content",
			feature_category %in% c( "history", "operation-ledger", "invariant" ) ~ "state/invariants",
			feature_category %in% c( "real-user", "collaborator", "revision", "save", "reload", "autosave", "lifecycle", "users", "auth" ) ~ "user/lifecycle",
			feature_category %in% c( "large-document", "step-count", "payload-size", "serialized-size" ) ~ "scale",
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

summary_lines <- c(
	paste0( "generated_at_utc: ", format( with_tz( now(), "UTC" ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "monitor_passes: ", nrow( monitor ) ),
	paste0( "first_pass_utc: ", format( min( monitor$timestamp ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "last_pass_utc: ", format( max( monitor$timestamp ), "%Y-%m-%dT%H:%M:%SZ" ) ),
	paste0( "coverage_files_first: ", first( monitor$coverage_files ) ),
	paste0( "coverage_files_last: ", last( monitor$coverage_files ) ),
	paste0( "coverage_files_delta: ", last( monitor$coverage_files ) - first( monitor$coverage_files ) ),
	paste0( "unmet_coverage_first: ", first( monitor$unmet_coverage ) ),
	paste0( "unmet_coverage_last: ", last( monitor$unmet_coverage ) ),
	paste0( "likely_real_max: ", max( monitor$likely_real, na.rm = TRUE ) ),
	paste0( "duplicate_share_current_last: ", last( monitor$duplicate_share_current ) ),
	paste0( "duplicate_share_historical_last: ", last( monitor$duplicate_share_historical ) ),
	paste0( "summary_startup_failures_last: ", last( monitor$summary_startup_failures ) ),
	paste0( "quality_issues_last: ", last( monitor$quality_issues ) ),
	paste0( "memory_free_gb_last: ", last( monitor$memory_free_gb ) ),
	paste0( "load_1_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_1 ), NA ) ),
	paste0( "load_5_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_5 ), NA ) ),
	paste0( "load_15_last: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$load_15 ), NA ) ),
	paste0( "core_count: ", ifelse( exists( "load_average" ) && nrow( load_average ) > 0, last( load_average$core_count ), NA ) ),
	paste0( "enabled_group_events: ", nrow( enabled_groups ) ),
	paste0( "enabled_groups_current: ", paste( state$enabledGroups, collapse = "," ) ),
	paste0( "fuzz_level_mix_snapshots: ", n_distinct( fuzz_level_mix$timestamp ) ),
	paste0( "fuzz_level_mix_campaigns: ", fuzz_level_campaigns_text ),
	paste0( "fuzz_level_mix_latest: ", fuzz_level_latest_text ),
	paste0( "profiles_seen: ", nrow( profile_counts ) ),
	paste0( "goals_total: ", nrow( coverage_goals ) ),
	paste0( "goals_unmet: ", sum( ! coverage_goals$met ) ),
	paste0( "pr_review_events: ", nrow( pr_events ) ),
	paste0( "pr_suggested_net_loc_snapshots: ", n_distinct( pr_suggested_loc$timestamp ) ),
	paste0( "pr_suggested_net_loc_latest_total: ", ifelse( nrow( pr_suggested_loc ) > 0, pr_suggested_loc %>% filter( timestamp == max( timestamp, na.rm = TRUE ) ) %>% summarise( total = sum( net_loc, na.rm = TRUE ) ) %>% pull( total ), NA ) )
)

write_lines( summary_lines, file.path( data_dir, "summary.txt" ) )
