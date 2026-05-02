#!/usr/bin/env Rscript

suppressPackageStartupMessages({
	library(tidyverse)
	library(jsonlite)
	library(scales)
})

args <- commandArgs(trailingOnly = FALSE)
file_arg <- "--file="
script_path <- sub(file_arg, "", args[grepl(file_arg, args)][1])
repo_root <- if (!is.na(script_path)) {
	normalizePath(file.path(dirname(script_path), "../../.."))
} else {
	normalizePath(".")
}

report_dir <- file.path(repo_root, "test/performance/reports/typing-delay-benchmark")
data_dir <- file.path(report_dir, "data")
figure_dir <- file.path(report_dir, "figures")
dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(figure_dir, recursive = TRUE, showWarnings = FALSE)

run_specs <- tribble(
	~run_id, ~run_label, ~json_path, ~scenario_label, ~notes,
	"full_0_1100", "0-1100ms, 10ms step", "artifacts/typing-delay-benchmark-grouped/typing-delay-benchmark-1777749286874.json", "large post", "3 rounds, 10 retained samples per delay",
	"targeted_randomized", "Targeted randomized confirmation", "artifacts/typing-delay-benchmark-targeted/typing-delay-benchmark-1777751630254.json", "large post", "targeted delays, randomized order",
	"fresh_boundary", "Fresh editor boundary", "artifacts/typing-delay-benchmark-fresh-boundary/typing-delay-benchmark-1777753661930.json", "large post, fresh editor", "fresh editor per delay near 1000ms",
	"state_actions", "Action trace near 1000ms", "artifacts/typing-delay-benchmark-state-actions/typing-delay-benchmark-1777754411550.json", "large post", "browser and data action instrumentation",
	"state_wait", "Explicit wait for persistence", "artifacts/typing-delay-benchmark-state-wait/typing-delay-benchmark-1777754631044.json", "large post", "waits for isLastBlockChangePersistent before each key",
	"empty_boundary", "Empty post boundary", "artifacts/typing-delay-benchmark-empty-boundary/typing-delay-benchmark-1777754773102.json", "empty post", "scenario sensitivity near 1000ms",
	"thousand_boundary", "1000 paragraphs boundary", "artifacts/typing-delay-benchmark-thousand-boundary/typing-delay-benchmark-1777754996281.json", "1000 paragraph post", "scenario sensitivity near 1000ms",
	"dense_1110_2000", "1110-2000ms, 10ms step", "artifacts/typing-delay-benchmark-1110-2000-dense/typing-delay-benchmark-1777755635782.json", "large post", "1 round, dense extension",
	"landmarks_0_2000", "0-2000ms landmarks", "artifacts/typing-delay-benchmark-0-2000-landmarks/typing-delay-benchmark-1777756530004.json", "large post", "3 rounds, selected delays",
	"cliff_actions", "Cliff action trace", "artifacts/typing-delay-benchmark-cliff-actions/typing-delay-benchmark-1777757272784.json", "large post", "action instrumentation from 990 to 1300ms",
	"timeout_500_rewrite", "1000ms timers rewritten to 500ms", "artifacts/typing-delay-benchmark-timeout-500/typing-delay-benchmark-1777757430029.json", "large post", "timer intervention: 1000ms setTimeout calls rewritten to 500ms"
) %>%
	mutate(json_abs_path = file.path(repo_root, json_path))

`%||%` <- function(left, right) {
	if (is.null(left)) {
		right
	} else {
		left
	}
}

quant <- function(x, p) {
	as.numeric(quantile(x, p, na.rm = TRUE, names = FALSE, type = 7))
}

read_raw_runs <- function() {
	available <- run_specs %>% filter(file.exists(json_abs_path))
	if (nrow(available) == 0) {
		return(NULL)
	}

	records <- list()
	runs <- list()
	persistence_events <- list()
	browser_events <- list()
	action_events <- list()
	timer_events <- list()

	for (i in seq_len(nrow(available))) {
		spec <- available[i, ]
		raw <- fromJSON(spec$json_abs_path, flatten = TRUE)

		run_records <- as_tibble(raw$records) %>%
			mutate(
				run_id = spec$run_id,
				run_label = spec$run_label,
				scenario_label = spec$scenario_label
			)
		records[[spec$run_id]] <- run_records

		run_summaries <- as_tibble(raw$delayRunSummaries) %>%
			mutate(
				run_id = spec$run_id,
				run_label = spec$run_label,
				scenario_label = spec$scenario_label
			)

		non_list_columns <- names(run_summaries)[
			!map_lgl(run_summaries, is.list)
		]
		runs[[spec$run_id]] <- run_summaries %>% select(all_of(non_list_columns))

		if ("persistenceEvents" %in% names(run_summaries)) {
			persistence_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$persistenceEvents[[row_index]]
					if (is.null(events) || nrow(events) == 0) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							eventMs = nowMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]]
						)
				}
			)
		}

		if ("browserEvents" %in% names(run_summaries)) {
			browser_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$browserEvents[[row_index]]
					if (is.null(events) || nrow(events) == 0) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							eventMs = nowMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]]
						)
				}
			)
		}

		if ("dataEvents" %in% names(run_summaries)) {
			action_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$dataEvents[[row_index]]
					if (is.null(events) || nrow(events) == 0) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							eventMs = nowMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]]
						)
				}
			)
		}

		if ("timerEvents" %in% names(run_summaries)) {
			timer_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$timerEvents[[row_index]]
					if (is.null(events) || nrow(events) == 0) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							scheduledEventMs = scheduledAtMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]],
							firedEventMs = firedAtMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]]
						)
				}
			)
		}
	}

	list(
		records = bind_rows(records),
		runs = bind_rows(runs),
		persistence_events = bind_rows(persistence_events),
		browser_events = bind_rows(browser_events),
		action_events = bind_rows(action_events),
		timer_events = bind_rows(timer_events)
	)
}

write_derived_data <- function(data) {
	records <- data$records %>%
		transmute(
			run_id, run_label, scenario_label,
			scenario = scenario %||% NA_character_,
			round, delay_ms = delayMs, sample_index = sampleIndex,
			is_throwaway = isThrowaway,
			delay_sample_index = delaySampleIndex,
			global_typed_character_index = globalTypedCharacterIndex,
			global_retained_sample_index = globalRetainedSampleIndex,
			elapsed_ms_since_benchmark_start = elapsedMsSinceBenchmarkStart,
			latency_ms = latencyMs,
			latency_all_keydowns_ms = latencyAllKeydownsMs,
			keydown_event_count = keydownEventCount,
			keydown_ms = keydownMs,
			keydown_all_ms = keydownAllMs,
			keypress_ms = keypressMs,
			keyup_ms = keyupMs
		)

	by_delay <- records %>%
		filter(!is_throwaway) %>%
		group_by(run_id, run_label, scenario_label, delay_ms) %>%
		summarise(
			n = n(),
			mean_ms = mean(latency_ms, na.rm = TRUE),
			median_ms = median(latency_ms, na.rm = TRUE),
			p10_ms = quant(latency_ms, 0.1),
			p90_ms = quant(latency_ms, 0.9),
			min_ms = min(latency_ms, na.rm = TRUE),
			max_ms = max(latency_ms, na.rm = TRUE),
			sd_ms = sd(latency_ms, na.rm = TRUE),
			cv = sd_ms / mean_ms,
			median_all_keydowns_ms = median(latency_all_keydowns_ms, na.rm = TRUE),
			.groups = "drop"
		)

	runs <- data$runs %>%
		transmute(
			run_id, run_label, scenario_label,
			round, delay_ms = delayMs,
			editor_setup_index = editorSetupIndex %||% NA_integer_,
			editor_setup_block_count = editorSetupBlockCount %||% NA_integer_,
			expected_key_groups = expectedKeyGroups,
			key_groups = keyGroups,
			key_down_events = keyDownEvents,
			key_press_events = keyPressEvents,
			key_up_events = keyUpEvents,
			run_started_epoch_ms = runStartedAtEpochMs,
			run_stopped_epoch_ms = runStoppedAtEpochMs,
			run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
		)

	write_csv(records, file.path(data_dir, "typing-delay-records.csv"))
	write_csv(by_delay, file.path(data_dir, "typing-delay-by-delay.csv"))
	write_csv(runs, file.path(data_dir, "typing-delay-runs.csv"))

	if (nrow(data$persistence_events) > 0) {
		write_csv(data$persistence_events, file.path(data_dir, "typing-delay-persistence-events.csv"))
	}
	if (nrow(data$browser_events) > 0) {
		write_csv(data$browser_events, file.path(data_dir, "typing-delay-browser-events.csv"))
	}
	if (nrow(data$action_events) > 0) {
		write_csv(data$action_events, file.path(data_dir, "typing-delay-action-events.csv"))
	}
	if (nrow(data$timer_events) > 0) {
		write_csv(data$timer_events, file.path(data_dir, "typing-delay-timer-events.csv"))
	}

	list(records = records, by_delay = by_delay, runs = runs)
}

read_derived_data <- function() {
	list(
		records = read_csv(file.path(data_dir, "typing-delay-records.csv"), show_col_types = FALSE),
		by_delay = read_csv(file.path(data_dir, "typing-delay-by-delay.csv"), show_col_types = FALSE),
		runs = read_csv(file.path(data_dir, "typing-delay-runs.csv"), show_col_types = FALSE),
		persistence_events = if (file.exists(file.path(data_dir, "typing-delay-persistence-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-persistence-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		},
		browser_events = if (file.exists(file.path(data_dir, "typing-delay-browser-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-browser-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		},
		action_events = if (file.exists(file.path(data_dir, "typing-delay-action-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-action-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		},
		timer_events = if (file.exists(file.path(data_dir, "typing-delay-timer-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-timer-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		}
	)
}

raw_data <- read_raw_runs()
derived <- if (is.null(raw_data)) {
	read_derived_data()
} else {
	written <- write_derived_data(raw_data)
	c(written, raw_data[c("persistence_events", "browser_events", "action_events", "timer_events")])
}

theme_set(theme_minimal(base_size = 12))
theme_update(
	panel.grid.minor = element_blank(),
	plot.title.position = "plot",
	plot.caption.position = "plot",
	legend.position = "bottom"
)

save_plot <- function(plot, filename, width = 9, height = 5.5) {
	ggsave(
		file.path(figure_dir, filename),
		plot,
		width = width,
		height = height,
		dpi = 180,
		bg = "white"
	)
}

records <- derived$records
by_delay <- derived$by_delay
runs <- derived$runs

full_curve <- by_delay %>%
	filter(run_id == "full_0_1100")

save_plot(
	ggplot(full_curve, aes(delay_ms, median_ms)) +
		geom_ribbon(aes(ymin = p10_ms, ymax = p90_ms), fill = "#94a3b8", alpha = 0.25) +
		geom_line(color = "#0f766e", linewidth = 0.7) +
		geom_point(color = "#0f766e", size = 1.2) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = "#b91c1c") +
		annotate("label", x = 1000, y = max(full_curve$p90_ms), label = "1000ms rich-text persistence timer", hjust = 1.05, size = 3) +
		scale_x_continuous(breaks = seq(0, 1100, 100)) +
		labs(
			title = "Typing latency is not monotonic in key delay",
			subtitle = "0-1100ms scan, 10ms steps; line is p50 and band is p10-p90",
			x = "Configured Playwright delay between key events",
			y = "Latency, keydown + keypress + keyup (ms)"
		),
	"01-delay-curve-0-1100.png"
)

extended_curve <- by_delay %>%
	filter(run_id %in% c("dense_1110_2000", "landmarks_0_2000"))

save_plot(
	ggplot(extended_curve, aes(delay_ms, median_ms, color = run_label)) +
		geom_line(data = filter(extended_curve, run_id == "dense_1110_2000"), linewidth = 0.7) +
		geom_point(size = 2) +
		geom_vline(xintercept = c(1000, 1200, 1580), linetype = "dotted", color = "#475569") +
		scale_color_manual(values = c(
			"1110-2000ms, 10ms step" = "#2563eb",
			"0-2000ms landmarks" = "#b45309"
		)) +
		scale_x_continuous(breaks = seq(900, 2000, 100)) +
		labs(
			title = "The 1000ms fast band ends; 2000ms is not uniquely slow",
			subtitle = "Dense extension and repeated landmark run",
			x = "Configured Playwright delay between key events",
			y = "p50 latency (ms)",
			color = NULL
		),
	"02-delay-curve-extended-to-2000.png"
)

selected_distribution <- records %>%
	filter(
		run_id == "landmarks_0_2000",
		!is_throwaway,
		delay_ms %in% c(900, 990, 1000, 1010, 1100, 1110, 1200, 1300, 1600, 1800, 2000)
	) %>%
	mutate(delay_label = factor(paste0(delay_ms, "ms"), levels = paste0(sort(unique(delay_ms)), "ms")))

save_plot(
	ggplot(selected_distribution, aes(delay_label, latency_ms)) +
		geom_boxplot(outlier.shape = NA, fill = "#e2e8f0", color = "#334155") +
		geom_jitter(width = 0.15, height = 0, alpha = 0.45, size = 1, color = "#0f766e") +
		labs(
			title = "Landmark delays: the 1000-1110ms band is a separate regime",
			subtitle = "Each dot is one retained key sample",
			x = "Delay",
			y = "Latency (ms)"
		),
	"03-landmark-distributions.png"
)

variance_curve <- by_delay %>%
	filter(run_id %in% c("full_0_1100", "landmarks_0_2000", "dense_1110_2000")) %>%
	filter(!is.na(cv), is.finite(cv))

save_plot(
	ggplot(variance_curve, aes(delay_ms, cv, color = run_label)) +
		geom_line(linewidth = 0.65) +
		geom_point(size = 1.1) +
		scale_y_continuous(labels = percent_format(accuracy = 1)) +
		labs(
			title = "Volatility depends on delay and regime",
			subtitle = "Coefficient of variation by delay; low p50 does not automatically mean low volatility",
			x = "Delay",
			y = "Coefficient of variation",
			color = NULL
		),
	"04-coefficient-of-variation-by-delay.png"
)

time_order <- records %>%
	filter(run_id %in% c("full_0_1100", "landmarks_0_2000"), !is_throwaway) %>%
	filter(!is.na(global_retained_sample_index))

save_plot(
	ggplot(time_order, aes(global_retained_sample_index, latency_ms)) +
		geom_point(aes(color = delay_ms), alpha = 0.18, size = 0.7) +
		geom_smooth(color = "#111827", se = FALSE, method = "loess", formula = y ~ x, span = 0.35, linewidth = 0.8) +
		facet_wrap(~run_label, scales = "free_x", ncol = 1) +
		scale_color_viridis_c(option = "C", end = 0.9) +
		labs(
			title = "No simple warmup story explains the results",
			subtitle = "Latency over retained-sample order; black line is a loess trend",
			x = "Retained sample order within run",
			y = "Latency (ms)",
			color = "Delay"
		),
	"05-latency-over-time.png",
	width = 9,
	height = 7
)

action_events <- derived$action_events %>%
	filter(
		run_id == "cliff_actions",
		storeName == "core/block-editor",
		actionName %in% c("updateBlockAttributes", "__unstableMarkLastChangeAsPersistent")
	) %>%
	mutate(
		action_label = recode(
			actionName,
			updateBlockAttributes = "updateBlockAttributes",
			`__unstableMarkLastChangeAsPersistent` = "mark persistent"
		),
		persistent_after = factor(`after.isPersistent`, levels = c(FALSE, TRUE), labels = c("transient after", "persistent after")),
		delay_label = factor(paste0(delayMs, "ms"), levels = paste0(sort(unique(delayMs)), "ms"))
	)

save_plot(
	ggplot(action_events, aes(eventMs / 1000, delay_label)) +
		geom_point(aes(shape = action_label, color = persistent_after), size = 2.6, alpha = 0.9) +
		scale_color_manual(values = c("transient after" = "#b91c1c", "persistent after" = "#047857"), na.value = "#334155") +
		labs(
			title = "At 1000ms and above, the persistent marker fires between keys",
			subtitle = "Data-action instrumentation around the cliff",
			x = "Seconds since trace start",
			y = "Delay",
			shape = NULL,
			color = NULL
		),
	"06-persistence-action-timeline.png",
	width = 9,
	height = 6
)

timer_rewrite <- by_delay %>%
	filter(run_id == "timeout_500_rewrite")

timer_events <- derived$timer_events %>%
	filter(run_id == "timeout_500_rewrite", requestedTimeoutMs == 1000, rewritten)

save_plot(
	ggplot(timer_rewrite, aes(delay_ms, median_ms)) +
		geom_line(color = "#7c3aed", linewidth = 0.75) +
		geom_point(color = "#7c3aed", size = 2.3) +
		geom_text(aes(label = round(median_ms, 1)), nudge_y = 0.65, size = 3) +
		geom_vline(xintercept = 500, linetype = "dashed", color = "#b91c1c") +
		annotate("label", x = 500, y = max(timer_rewrite$median_ms), label = "1000ms timers rewritten to 500ms", hjust = 0, size = 3) +
		labs(
			title = "Moving the timer moves the cliff",
			subtitle = paste0(nrow(timer_events), " rich-text 1000ms timers were rewritten in this run"),
			x = "Configured Playwright delay between key events",
			y = "p50 latency (ms)"
		),
	"07-timeout-rewrite-500ms.png"
)

scenario_boundary <- by_delay %>%
	filter(run_id %in% c("fresh_boundary", "empty_boundary", "thousand_boundary")) %>%
	mutate(run_label = factor(run_label, levels = c(
		"Fresh editor boundary",
		"Empty post boundary",
		"1000 paragraphs boundary"
	)))

save_plot(
	ggplot(scenario_boundary, aes(delay_ms, median_ms, color = run_label)) +
		geom_line(linewidth = 0.75) +
		geom_point(size = 2.2) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = "#475569") +
		labs(
			title = "The boundary is real, but scenario size changes the absolute latency",
			subtitle = "Fresh editor and alternate post-size checks around 1000ms",
			x = "Delay",
			y = "p50 latency (ms)",
			color = NULL
		),
	"08-scenario-boundary-checks.png"
)

keydown_counts <- records %>%
	filter(run_id %in% c("full_0_1100", "landmarks_0_2000", "cliff_actions"), !is_throwaway) %>%
	count(run_label, keydown_event_count)

save_plot(
	ggplot(keydown_counts, aes(factor(keydown_event_count), n, fill = run_label)) +
		geom_col(position = "dodge") +
		labs(
			title = "Chromium emitted two keydown EventDispatch entries per typed character",
			subtitle = "This is why the benchmark groups keydown/keypress/keyup by sequence instead of assuming one keydown",
			x = "keydown EventDispatch entries per key group",
			y = "Retained samples",
			fill = NULL
		),
	"09-keydown-event-count-audit.png"
)

message("Wrote plots to: ", figure_dir)
