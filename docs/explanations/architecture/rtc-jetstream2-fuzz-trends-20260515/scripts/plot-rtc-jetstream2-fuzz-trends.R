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
			strip.text = element_text( face = "bold" )
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
	warnings = extract_num( pass_lines, "warnings=([0-9]+)" ),
	headroom = extract_chr( pass_lines, "headroom=([^ ]+)" ),
	likely_real = extract_num( pass_lines, "likelyReal=([0-9]+)" ),
	duplicate_share = extract_num( pass_lines, "duplicateShare=([0-9.]+)" ),
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
			str_detect( group, "reload|lifecycle|long-session" ) ~ "lifecycle",
			str_detect( group, "block|common|structure" ) ~ "block-structure",
			str_detect( group, "http" ) ~ "http",
			TRUE ~ "other"
		)
	)

write_csv( enabled_groups, file.path( data_dir, "enabled_groups.csv" ) )

state <- fromJSON( state_path, flatten = TRUE )

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
			str_detect( profile, "reload|lifecycle|session|long" ) ~ "lifecycle",
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

coverage_long <- monitor %>%
	select( timestamp, coverage_files, processed, new_features, new_cdp, unmet_coverage ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			coverage_files = "coverage files",
			processed = "records processed this pass",
			new_features = "new behavioral features",
			new_cdp = "new CDP hashes",
			unmet_coverage = "unmet coverage goals"
		)
	)

write_plot(
	"monitor-coverage-intake.png",
	ggplot( coverage_long, aes( x = timestamp, y = value, color = metric ) ) +
		geom_point( alpha = 0.72, size = 1.9 ) +
		facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_x_datetime( date_labels = "%H:%M", date_breaks = "2 hours" ) +
		labs(
			title = "Coverage-guided fuzz intake over time",
			x = "UTC time on 2026-05-15",
			y = NULL,
			color = NULL,
			caption = "Each point is one novelty monitor pass. Points are shown without connecting lines."
		) +
		theme_rtc(),
	width = 9,
	height = 8
)

health_long <- monitor %>%
	select( timestamp, likely_real, warnings, duplicate_share, memory_free_gb, no_progress ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			likely_real = "visible likely-real failures",
			warnings = "monitor warnings",
			duplicate_share = "top duplicate/noise share",
			memory_free_gb = "free memory (GiB)",
			no_progress = "no-progress passes"
		)
	)

write_plot(
	"monitor-health-yield.png",
	ggplot( health_long, aes( x = timestamp, y = value, color = metric ) ) +
		geom_point( alpha = 0.72, size = 1.9 ) +
		facet_wrap( vars( metric ), scales = "free_y", ncol = 1 ) +
		scale_color_brewer( palette = "Set2" ) +
		scale_x_datetime( date_labels = "%H:%M", date_breaks = "2 hours" ) +
		labs(
			title = "Fuzz yield and resource health over time",
			x = "UTC time on 2026-05-15",
			y = NULL,
			color = NULL,
			caption = "Likely-real stayed at zero in the monitor log; duplicate/noise share remained high."
		) +
		theme_rtc(),
	width = 9,
	height = 8
)

if ( nrow( enabled_groups ) > 0 ) {
	write_plot(
		"enabled-groups-over-time.png",
		ggplot( enabled_groups, aes( x = timestamp, y = reorder( group, timestamp ), color = group_family ) ) +
			geom_point( alpha = 0.82, size = 2.6 ) +
			scale_color_brewer( palette = "Set2" ) +
			scale_x_datetime( date_labels = "%H:%M", date_breaks = "1 hour" ) +
			labs(
				title = "Coverage-guided group enable events",
				x = "UTC time on 2026-05-15",
				y = NULL,
				color = "surface"
			) +
			theme_rtc(),
		width = 9,
		height = 6
	)
}

write_plot(
	"profile-success-scatter.png",
	ggplot( profile_counts, aes( x = records_seen + 1, y = successful_records + 1, color = profile_family ) ) +
		geom_point( alpha = 0.82, size = 3 ) +
		geom_text(
			aes( label = profile ),
			hjust = -0.05,
			vjust = 0.5,
			size = 2.7,
			check_overlap = TRUE
		) +
		scale_x_log10( labels = comma ) +
		scale_y_log10( labels = comma ) +
		scale_color_brewer( palette = "Set2" ) +
		coord_cartesian( clip = "off" ) +
		labs(
			title = "Records seen vs. successful records by profile",
			x = "records seen + 1, log scale",
			y = "successful records + 1, log scale",
			color = "profile family",
			caption = "The +1 offset keeps zero-success profiles visible on the log scale."
		) +
		theme_rtc() +
		theme( plot.margin = margin( 5.5, 42, 5.5, 5.5 ) ),
	width = 9.5,
	height = 6.5
)

goal_plot_data <- coverage_goals %>%
	arrange( progress ) %>%
	slice_head( n = 45 ) %>%
	mutate(
		progress_capped = pmin( progress, 4 ),
		label = str_wrap( label, width = 42 ),
		met_label = if_else( met, "met", "unmet" )
	) %>%
	filter( ! is.na( progress_capped ) )

write_plot(
	"coverage-goal-progress.png",
	ggplot( goal_plot_data, aes( x = progress_capped, y = reorder( label, progress ), color = goal_family, shape = met_label ) ) +
		geom_vline( xintercept = 1, linetype = "dashed", color = "grey35", linewidth = 0.4 ) +
		geom_point( alpha = 0.78, size = 2.4 ) +
		scale_x_continuous(
			labels = function( x ) ifelse( x >= 4, "4x+", paste0( x, "x" ) ),
			breaks = c( 0, 0.5, 1, 2, 3, 4 )
		) +
		scale_color_brewer( palette = "Set3" ) +
		labs(
			title = "Lowest-progress coverage goals by surface",
			x = "observed count / target, capped at 4x",
			y = NULL,
			color = "surface",
			shape = "goal state",
			caption = "Dashed line marks the target. Full goal table is committed as data/coverage_goals.csv."
		) +
		guides(
			color = guide_legend( nrow = 2, byrow = TRUE ),
			shape = guide_legend( nrow = 1 )
		) +
		theme_rtc(),
	width = 12,
	height = 9
)

feature_category_palette <- colorRampPalette( brewer.pal( 12, "Paired" ) )(
	n_distinct( feature_categories$feature_category )
)
names( feature_category_palette ) <- sort( unique( feature_categories$feature_category ) )

write_plot(
	"feature-category-coverage.png",
	ggplot( feature_categories, aes( x = total_count, y = reorder( feature_category, total_count ), color = feature_category, size = keys ) ) +
		geom_point( alpha = 0.78 ) +
		scale_x_log10( labels = comma ) +
		scale_color_manual( values = feature_category_palette ) +
		scale_size_continuous( range = c( 2, 8 ) ) +
		labs(
			title = "Feature-key coverage by category",
			x = "total feature observations, log scale",
			y = NULL,
			color = NULL,
			size = "distinct keys"
		) +
		theme_rtc(),
	width = 9,
	height = 6.5
)

top_actions <- action_counts %>%
	slice_max( count, n = 30, with_ties = FALSE )

write_plot(
	"successful-actions-by-profile.png",
	ggplot( top_actions, aes( x = count, y = reorder( paste( profile, action, sep = " / " ), count ), color = profile ) ) +
		geom_point( alpha = 0.78, size = 2.4 ) +
		scale_x_continuous( labels = comma ) +
		scale_color_brewer( palette = "Set3" ) +
		labs(
			title = "Most common successful fuzz actions",
			x = "successful action count",
			y = NULL,
			color = "profile"
		) +
		theme_rtc(),
	width = 10,
	height = 7
)

write_plot(
	"pr-review-loop-events.png",
	ggplot( pr_events, aes( x = timestamp, y = event_type, color = event_type ) ) +
		geom_point( alpha = 0.82, size = 2.6 ) +
		scale_color_brewer( palette = "Dark2" ) +
		scale_x_datetime( date_labels = "%H:%M", date_breaks = "10 mins" ) +
		labs(
			title = "PR split review loop events",
			x = "UTC time on 2026-05-15",
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
			scale_x_datetime( date_labels = "%H:%M", date_breaks = "10 mins" ) +
			labs(
				title = "PR split loop duration by phase",
				x = "UTC start time on 2026-05-15",
				y = "duration in minutes",
				color = NULL
			) +
			theme_rtc(),
		width = 8,
		height = 4.8
	)
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
	paste0( "duplicate_share_last: ", last( monitor$duplicate_share ) ),
	paste0( "memory_free_gb_last: ", last( monitor$memory_free_gb ) ),
	paste0( "enabled_group_events: ", nrow( enabled_groups ) ),
	paste0( "enabled_groups_current: ", paste( state$enabledGroups, collapse = "," ) ),
	paste0( "profiles_seen: ", nrow( profile_counts ) ),
	paste0( "goals_total: ", nrow( coverage_goals ) ),
	paste0( "goals_unmet: ", sum( ! coverage_goals$met ) ),
	paste0( "pr_review_events: ", nrow( pr_events ) )
)

write_lines( summary_lines, file.path( data_dir, "summary.txt" ) )
