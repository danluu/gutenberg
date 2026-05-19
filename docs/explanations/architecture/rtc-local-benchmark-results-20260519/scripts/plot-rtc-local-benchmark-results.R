#!/usr/bin/env Rscript

suppressPackageStartupMessages({
	library(ggplot2)
	library(RColorBrewer)
})

root <- getwd()
artifact_dir <- file.path(
	root,
	"docs/explanations/architecture/rtc-local-benchmark-results-20260519"
)
data_dir <- file.path( artifact_dir, "data" )
plot_dir <- file.path( artifact_dir, "plots" )
dir.create( plot_dir, recursive = TRUE, showWarnings = FALSE )

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

ratio_breaks <- c( 0.25, 0.5, 1, 2, 4 )
ratio_labels <- c( "0.25x", "0.5x", "1x", "2x", "4x" )

local_commands <- read.csv(
	file.path( data_dir, "local-command-medians.csv" ),
	stringsAsFactors = FALSE
)
command_ratios <- read.csv(
	file.path( data_dir, "command-ratios.csv" ),
	stringsAsFactors = FALSE
)
crdt_p50 <- read.csv(
	file.path( data_dir, "crdt-microbench-p50.csv" ),
	stringsAsFactors = FALSE
)

local_commands$kind_label <- factor(
	local_commands$kind_label,
	levels = c( "Lower microbench", "Targeted unit suite", "E2E smoke/perf" )
)
local_commands$branch_label <- factor(
	local_commands$branch_label,
	levels = c( "Base", "Merged" )
)
local_commands$case_label <- factor(
	local_commands$case_label,
	levels = rev( unique( local_commands$case_label ) )
)

command_ratios$kind_label <- factor(
	command_ratios$kind_label,
	levels = c( "Lower microbench", "Targeted unit suite", "E2E smoke/perf" )
)
command_ratios$case_label <- factor(
	command_ratios$case_label,
	levels = rev( unique( command_ratios$case_label ) )
)
command_ratios$host <- factor(
	command_ratios$host,
	levels = c( "Local", "Jetstream2" )
)

crdt_p50$scenario_label <- factor(
	crdt_p50$scenario_label,
	levels = rev( unique( crdt_p50$scenario_label ) )
)
crdt_p50$host <- factor( crdt_p50$host, levels = c( "Local", "Jetstream2" ) )

command_medians_plot <- ggplot(
	local_commands,
	aes( x = median_s, y = case_label, fill = branch_label )
) +
	geom_col( position = position_dodge2( width = 0.76, preserve = "single" ), width = 0.64 ) +
	geom_text(
		aes( label = sprintf( "%.2fs", median_s ) ),
		position = position_dodge2( width = 0.76, preserve = "single" ),
		hjust = -0.08,
		size = 2.7
	) +
	facet_grid( kind_label ~ ., scales = "free_y", space = "free_y" ) +
	coord_cartesian( xlim = c( 0, max( local_commands$median_s ) * 1.20 ), clip = "off" ) +
	scale_fill_brewer( palette = "Set2" ) +
	labs(
		title = "Local RTC benchmark medians",
		subtitle = "Balanced ABBA run; all timed rows passed; setup and wp-env startup excluded",
		x = "Median elapsed time, seconds",
		y = NULL,
		fill = NULL,
		caption = "Source: local-abba-20260519T193459Z. Host load average stayed high, so use ratios more than absolute seconds."
	) +
	theme_rtc()
write_plot( "local-command-medians.png", command_medians_plot, width = 9.5, height = 6.4 )

command_ratios_plot <- ggplot(
	command_ratios,
	aes( x = merged_base_ratio, y = case_label, color = host, shape = host )
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = merged_base_ratio, yend = case_label, color = host ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 2.7 ) +
	facet_grid( kind_label ~ ., scales = "free_y", space = "free_y" ) +
	scale_x_continuous(
		trans = "log2",
		breaks = ratio_breaks,
		labels = ratio_labels,
		limits = c( 0.25, 2 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	labs(
		title = "Merged/base elapsed-time ratios",
		subtitle = "Values right of 1x are slower in the merged snapshot; Jetstream2 e2e rows are excluded as infra failures",
		x = "Merged / base median elapsed time",
		y = NULL,
		color = NULL,
		shape = NULL,
		caption = "Local uses ABBA order. Jetstream2 lower-level rows used the older base-then-merged order under active fuzzing load."
	) +
	theme_rtc()
write_plot( "merged-base-ratios.png", command_ratios_plot, width = 9.5, height = 6.4 )

crdt_ratio_plot <- ggplot(
	crdt_p50,
	aes( x = merged_base_ratio, y = scenario_label, color = host, shape = host )
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = merged_base_ratio, yend = scenario_label, color = host ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 2.8 ) +
	scale_x_continuous(
		trans = "log2",
		breaks = ratio_breaks,
		labels = ratio_labels,
		limits = c( 0.75, 4 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	labs(
		title = "CRDT microbench p50 ratios",
		subtitle = "Stale suffix and top-level delete scenarios are the consistent merged-snapshot slowdown",
		x = "Merged / base p50 operation time",
		y = NULL,
		color = NULL,
		shape = NULL,
		caption = "Synthetic RTC-shaped operations. These isolate merge-kernel behavior and do not include browser, wp-env, or Jest startup."
	) +
	theme_rtc()
write_plot( "crdt-microbench-p50-ratios.png", crdt_ratio_plot, width = 9.5, height = 5.2 )
