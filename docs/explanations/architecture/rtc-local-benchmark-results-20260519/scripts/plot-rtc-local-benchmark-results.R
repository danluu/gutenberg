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

ratio_label <- function( x ) {
	sprintf( "%.3fx", x )
}

command_ratios <- read.csv(
	file.path( data_dir, "command-ratios.csv" ),
	stringsAsFactors = FALSE
)
crdt_p50 <- read.csv(
	file.path( data_dir, "crdt-microbench-p50.csv" ),
	stringsAsFactors = FALSE
)
many_user_p50 <- read.csv(
	file.path( data_dir, "many-user-sync-p50.csv" ),
	stringsAsFactors = FALSE
)
realistic_e2e <- read.csv(
	file.path( data_dir, "realistic-e2e-results.csv" ),
	stringsAsFactors = FALSE
)

command_ratios <- subset( command_ratios, usable == "yes" )

command_ratios$kind_label <- factor(
	command_ratios$kind_label,
	levels = c(
		"Lower microbench",
		"Targeted unit suite",
		"E2E smoke/perf",
		"Multi-user synthetic",
		"Realistic e2e"
	)
)
command_ratios$case_label <- factor(
	command_ratios$case_label,
	levels = rev( unique( command_ratios$case_label ) )
)

crdt_p50$scenario_label <- factor(
	crdt_p50$scenario_label,
	levels = rev( unique( crdt_p50$scenario_label ) )
)
crdt_p50$host <- factor( crdt_p50$host, levels = c( "Local" ) )

many_user_p50$scenario_label <- factor(
	many_user_p50$scenario_label,
	levels = rev( unique( many_user_p50$scenario_label ) )
)
many_user_p50$host <- factor( many_user_p50$host, levels = c( "Local" ) )

realistic_e2e$case_label <- factor(
	realistic_e2e$case_label,
	levels = rev( unique( realistic_e2e$case_label ) )
)
realistic_e2e$outcome <- factor(
	realistic_e2e$outcome,
	levels = c( "Passed", "Fixed failed" )
)

command_ratios_plot <- ggplot(
	command_ratios,
	aes( x = fixed_base_ratio, y = case_label, color = kind_label )
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = fixed_base_ratio, yend = case_label ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 2.7 ) +
	geom_text(
		aes(
			label = ratio_label( fixed_base_ratio ),
			hjust = ifelse( fixed_base_ratio >= 1, -0.12, 1.12 )
		),
		size = 2.7,
		show.legend = FALSE
	) +
	scale_x_continuous(
		trans = "log2",
		breaks = c( 0.25, 0.5, 1, 2 ),
		labels = c( "0.25x", "0.5x", "1x", "2x" ),
		limits = c( 0.25, 2 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	coord_cartesian( clip = "off" ) +
	labs(
		title = "Local fixed/base elapsed-time ratios",
		subtitle = "Values right of 1x are slower in the fixed branch; rows with fixed e2e failures are excluded",
		x = "Fixed / base median elapsed time",
		y = NULL,
		color = NULL,
		caption = "Source: fixed-abba-20260520T055855Z and fixed-e2e-local-20260520T061252Z."
	) +
	theme_rtc()
write_plot( "local-command-ratios.png", command_ratios_plot, width = 9.5, height = 6.1 )

crdt_ratio_plot <- ggplot(
	crdt_p50,
	aes( x = fixed_base_ratio, y = scenario_label, color = host, shape = host )
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = fixed_base_ratio, yend = scenario_label, color = host ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 2.8 ) +
	geom_text(
		aes(
			label = ratio_label( fixed_base_ratio ),
			hjust = ifelse( fixed_base_ratio >= 1, -0.12, 1.12 )
		),
		size = 2.7,
		show.legend = FALSE
	) +
	scale_x_continuous(
		trans = "log2",
		breaks = c( 0.75, 1, 2, 4 ),
		labels = c( "0.75x", "1x", "2x", "4x" ),
		limits = c( 0.75, 4 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	coord_cartesian( clip = "off" ) +
	labs(
		title = "CRDT microbench p50 ratios",
		subtitle = "The fixed branch still leaves stale top-level delete slower than base",
		x = "Fixed / base p50 operation time",
		y = NULL,
		color = NULL,
		shape = NULL,
		caption = "Synthetic RTC-shaped operations. These isolate merge-kernel behavior and do not include browser, wp-env, or Jest startup."
	) +
	theme_rtc()
write_plot( "crdt-microbench-p50-ratios.png", crdt_ratio_plot, width = 9.5, height = 5.2 )

many_user_ratio_plot <- ggplot(
	many_user_p50,
	aes( x = fixed_base_ratio, y = scenario_label, color = host, shape = host )
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = fixed_base_ratio, yend = scenario_label, color = host ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 2.8 ) +
	geom_text(
		aes(
			label = ratio_label( fixed_base_ratio ),
			hjust = ifelse( fixed_base_ratio >= 1, -0.12, 1.12 )
		),
		size = 2.7,
		show.legend = FALSE
	) +
	scale_x_continuous(
		trans = "log2",
		breaks = c( 0.9, 1, 1.1 ),
		labels = c( "0.9x", "1x", "1.1x" ),
		limits = c( 0.85, 1.15 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	coord_cartesian( clip = "off" ) +
	labs(
		title = "Many-user sync microbench p50 ratios",
		subtitle = "Synthetic 100-user and 1000-room cases were close to base locally",
		x = "Fixed / base p50 operation time",
		y = NULL,
		color = NULL,
		shape = NULL,
		caption = "Source: fixed-abba-20260520T055855Z. The benchmark isolates sync serialization, awareness, queues, and room rotation."
	) +
	theme_rtc()
write_plot( "many-user-sync-p50-ratios.png", many_user_ratio_plot, width = 9.5, height = 5.2 )

realistic_e2e_plot <- ggplot(
	realistic_e2e,
	aes(
		x = fixed_base_elapsed_ratio,
		y = case_label,
		color = outcome,
		shape = outcome
	)
) +
	geom_vline( xintercept = 1, linetype = "dashed", color = "grey55" ) +
	geom_segment(
		aes( x = 1, xend = fixed_base_elapsed_ratio, yend = case_label ),
		linewidth = 0.6,
		alpha = 0.72
	) +
	geom_point( size = 3 ) +
	geom_text(
		aes(
			label = ifelse(
				outcome == "Passed",
				ratio_label( fixed_base_elapsed_ratio ),
				sprintf( "%s; %d/%d failed", ratio_label( fixed_base_elapsed_ratio ), fixed_failures, reps )
			)
		),
		hjust = -0.12,
		size = 2.7,
		show.legend = FALSE
	) +
	scale_x_continuous(
		trans = "log2",
		breaks = c( 1, 2, 4 ),
		labels = c( "1x", "2x", "4x" ),
		limits = c( 0.9, 4 )
	) +
	scale_color_brewer( palette = "Dark2" ) +
	scale_shape_manual( values = c( 16, 4 ) ) +
	coord_cartesian( clip = "off" ) +
	labs(
		title = "Realistic e2e fixed/base status",
		subtitle = "Failed fixed rows are correctness failures, not clean timing ratios",
		x = "Fixed / base median elapsed time",
		y = NULL,
		color = NULL,
		shape = NULL,
		caption = "Source: fixed-e2e-local-20260520T061252Z. HTTP polling provider; isolated wp-env startup excluded."
	) +
	theme_rtc()
write_plot( "realistic-e2e-status-ratios.png", realistic_e2e_plot, width = 9.5, height = 4.7 )
