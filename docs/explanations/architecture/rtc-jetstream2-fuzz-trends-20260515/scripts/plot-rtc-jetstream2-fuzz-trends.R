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
		scale_x_datetime( date_labels = "%H:%M", date_breaks = "2 hours" ) +
		labs(
			title = "Per-pass fuzz yield over time",
			x = "UTC time on 2026-05-15",
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
	select( timestamp, warnings, duplicate_share, memory_free_gb, no_progress ) %>%
	pivot_longer( -timestamp, names_to = "metric", values_to = "value" ) %>%
	mutate(
		metric = recode(
			metric,
			warnings = "monitor warnings",
			duplicate_share = "top duplicate/noise share",
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
			scale_x_datetime( date_labels = "%H:%M", date_breaks = "1 hour" ) +
			labs(
				title = "Coverage-guided groups by first enable time",
				x = "UTC time on 2026-05-15",
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
