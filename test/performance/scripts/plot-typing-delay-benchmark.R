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
	"timeout_500_rewrite", "1000ms timers rewritten to 500ms", "artifacts/typing-delay-benchmark-timeout-500/typing-delay-benchmark-1777757430029.json", "large post", "timer intervention: 1000ms setTimeout calls rewritten to 500ms",
	"after_persistence_scan", "Wait for persistence, then wait", "artifacts/typing-delay-benchmark-after-persistence-scan/typing-delay-benchmark-1777758189761.json", "large post", "delay after isLastBlockChangePersistent()",
	"keyhold_schedulers", "Key-hold scheduler trace", "artifacts/typing-delay-benchmark-keyhold-schedulers/typing-delay-benchmark-1777758386189.json", "large post", "normal Playwright delay with action/timer/scheduler tracing",
	"between_keys", "Complete keypress, then wait", "artifacts/typing-delay-benchmark-between-keys/typing-delay-benchmark-1777758545134.json", "large post", "delay after full keydown/keypress/input/keyup sequence",
	"mode_trace_keyhold", "Paired trace: key held during delay", "artifacts/typing-delay-benchmark-mode-trace-keyhold/typing-delay-benchmark-1777759091224.json", "large post", "paired browser/action/timer trace for normal Playwright delay",
	"mode_trace_between_keys", "Paired trace: wait after keyup", "artifacts/typing-delay-benchmark-mode-trace-between-keys/typing-delay-benchmark-1777759237728.json", "large post", "paired browser/action/timer trace for delay after full keypress",
	"native_keyhold_timer", "Native contenteditable: key held during delay", "artifacts/typing-delay-benchmark-native-keyhold-timer/typing-delay-benchmark-1777759696881.json", "native contenteditable", "minimal contenteditable with a 1000ms input timer and normal Playwright delay",
	"native_between_keys_timer", "Native contenteditable: wait after keyup", "artifacts/typing-delay-benchmark-native-between-keys-timer/typing-delay-benchmark-1777759836791.json", "native contenteditable", "minimal contenteditable with a 1000ms input timer and delay after full keypress",
	"listener_keyhold", "Listener trace: key held during delay", "artifacts/typing-delay-benchmark-listener-keyhold/typing-delay-benchmark-1777760461776.json", "large post", "event-listener timing trace for normal Playwright delay",
	"listener_between_keys", "Listener trace: wait after keyup", "artifacts/typing-delay-benchmark-listener-between-keys/typing-delay-benchmark-1777760561998.json", "large post", "event-listener timing trace for delay after full keypress",
	"listener_empty_keyhold", "Empty listener trace: key held during delay", "test/performance/artifacts/typing-delay-benchmark-listener-empty-keyhold/typing-delay-benchmark-1777761105618.json", "empty post", "empty-post event-listener timing trace for normal Playwright delay",
	"listener_empty_between_keys", "Empty listener trace: wait after keyup", "test/performance/artifacts/typing-delay-benchmark-listener-empty-between-keys/typing-delay-benchmark-1777761157309.json", "empty post", "empty-post event-listener timing trace for delay after full keypress",
	"rich_text_spans_large_keyhold", "RichText span trace: large post, key held", "artifacts/typing-delay-benchmark-rich-text-spans-batch-large-keyhold/typing-delay-benchmark-1777762086721.json", "large post", "source-level RichText span trace for normal Playwright delay",
	"rich_text_spans_large_between_keys", "RichText span trace: large post, wait after keyup", "artifacts/typing-delay-benchmark-rich-text-spans-batch-large-between-keys/typing-delay-benchmark-1777762154516.json", "large post", "source-level RichText span trace for delay after full keypress",
	"rich_text_spans_empty_keyhold", "RichText span trace: empty post, key held", "artifacts/typing-delay-benchmark-rich-text-spans-batch-empty-keyhold/typing-delay-benchmark-1777762215740.json", "empty post", "source-level RichText span trace for normal Playwright delay",
	"rich_text_spans_empty_between_keys", "RichText span trace: empty post, wait after keyup", "artifacts/typing-delay-benchmark-rich-text-spans-batch-empty-between-keys/typing-delay-benchmark-1777762283041.json", "empty post", "source-level RichText span trace for delay after full keypress"
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

is_empty_events <- function(events) {
	is.null(events) || length(events) == 0 || (is.data.frame(events) && nrow(events) == 0)
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
	scheduler_events <- list()
	event_listener_events <- list()
	rich_text_span_events <- list()

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
					if (is_empty_events(events)) {
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
					if (is_empty_events(events)) {
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
					if (is_empty_events(events)) {
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
					if (is_empty_events(events)) {
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

		if ("schedulerEvents" %in% names(run_summaries)) {
			scheduler_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$schedulerEvents[[row_index]]
					if (is_empty_events(events)) {
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

		if ("eventListenerEvents" %in% names(run_summaries)) {
			event_listener_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$eventListenerEvents[[row_index]]
					if (is_empty_events(events)) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							eventMs = startedAtMs -
								run_summaries$runStartedAtBrowserNowMs[[row_index]]
						)
				}
			)
		}

		if ("richTextSpanEvents" %in% names(run_summaries)) {
			rich_text_span_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$richTextSpanEvents[[row_index]]
					if (is_empty_events(events)) {
						return(tibble())
					}
					as_tibble(events) %>%
						mutate(
							run_id = spec$run_id,
							run_label = spec$run_label,
							round = run_summaries$round[[row_index]],
							delayMs = run_summaries$delayMs[[row_index]],
							eventMs = startedAtMs -
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
		timer_events = bind_rows(timer_events),
		scheduler_events = bind_rows(scheduler_events),
		event_listener_events = bind_rows(event_listener_events),
		rich_text_span_events = bind_rows(rich_text_span_events)
	)
}

write_derived_data <- function(data, existing = NULL) {
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

	if (!is.null(existing)) {
		replace_run_ids <- unique(records$run_id)
		replace_by_run <- function(old_table, new_table) {
			if (is.null(old_table) || nrow(old_table) == 0) {
				return(new_table)
			}
			bind_rows(
				old_table %>% filter(!run_id %in% replace_run_ids),
				new_table
			)
		}

		records <- replace_by_run(existing$records, records)
		by_delay <- replace_by_run(existing$by_delay, by_delay)
		runs <- replace_by_run(existing$runs, runs)
		data$persistence_events <- replace_by_run(existing$persistence_events, data$persistence_events)
		data$browser_events <- replace_by_run(existing$browser_events, data$browser_events)
		data$action_events <- replace_by_run(existing$action_events, data$action_events)
		data$timer_events <- replace_by_run(existing$timer_events, data$timer_events)
		data$scheduler_events <- replace_by_run(existing$scheduler_events, data$scheduler_events)
		data$event_listener_events <- replace_by_run(existing$event_listener_events, data$event_listener_events)
		data$rich_text_span_events <- replace_by_run(existing$rich_text_span_events, data$rich_text_span_events)
	}

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
	if (nrow(data$scheduler_events) > 0) {
		write_csv(data$scheduler_events, file.path(data_dir, "typing-delay-scheduler-events.csv"))
	}
	if (nrow(data$event_listener_events) > 0) {
		write_csv(data$event_listener_events, file.path(data_dir, "typing-delay-event-listener-events.csv"))
	}
	if (nrow(data$rich_text_span_events) > 0) {
		write_csv(data$rich_text_span_events, file.path(data_dir, "typing-delay-rich-text-span-events.csv"))
	}

	list(
		records = records,
		by_delay = by_delay,
		runs = runs,
		persistence_events = data$persistence_events,
		browser_events = data$browser_events,
		action_events = data$action_events,
		timer_events = data$timer_events,
		scheduler_events = data$scheduler_events,
		event_listener_events = data$event_listener_events,
		rich_text_span_events = data$rich_text_span_events
	)
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
		},
		scheduler_events = if (file.exists(file.path(data_dir, "typing-delay-scheduler-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-scheduler-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		},
		event_listener_events = if (file.exists(file.path(data_dir, "typing-delay-event-listener-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-event-listener-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		},
		rich_text_span_events = if (file.exists(file.path(data_dir, "typing-delay-rich-text-span-events.csv"))) {
			read_csv(file.path(data_dir, "typing-delay-rich-text-span-events.csv"), show_col_types = FALSE)
		} else {
			tibble()
		}
	)
}

raw_data <- read_raw_runs()
derived <- if (is.null(raw_data)) {
	read_derived_data()
} else {
	existing <- if (file.exists(file.path(data_dir, "typing-delay-records.csv"))) {
		read_derived_data()
	} else {
		NULL
	}
	write_derived_data(raw_data, existing = existing)
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

mode_comparison <- by_delay %>%
	filter(run_id %in% c("landmarks_0_2000", "between_keys", "after_persistence_scan")) %>%
	mutate(mode_label = recode(
		run_id,
		landmarks_0_2000 = "Playwright delay: hold key down",
		between_keys = "Complete keypress, then wait",
		after_persistence_scan = "Wait for persistence, then wait"
	))

save_plot(
	ggplot(mode_comparison, aes(delay_ms, median_ms, color = mode_label)) +
		geom_line(linewidth = 0.75) +
		geom_point(size = 2.1) +
		scale_x_continuous(breaks = c(0, 100, 500, 900, 1000, 1100, 1200, 1300, 2000)) +
		labs(
			title = "The slow plateau is mostly a long synthetic key-hold effect",
			subtitle = "Waiting after keyup, or after persistence, does not reproduce the 1200-2000ms plateau",
			x = "Configured delay",
			y = "p50 latency (ms)",
			color = NULL
		),
	"10-delay-mode-comparison.png"
)

build_key_groups <- function(events) {
	events <- events %>% arrange(eventMs)
	groups <- list()
	current <- list(keydowns = numeric(), keypress = NA_real_, input = NA_real_, keyup = NA_real_)
	for (row_index in seq_len(nrow(events))) {
		event <- events[row_index, ]
		if (event$type == "keydown" && (!is.na(current$keypress) || !is.na(current$keyup))) {
			current <- list(keydowns = numeric(), keypress = NA_real_, input = NA_real_, keyup = NA_real_)
		}
		if (event$type == "keydown") {
			current$keydowns <- c(current$keydowns, event$eventMs)
		} else if (event$type == "keypress") {
			current$keypress <- event$eventMs
		} else if (event$type == "input") {
			current$input <- event$eventMs
		} else if (event$type == "keyup") {
			current$keyup <- event$eventMs
			if (length(current$keydowns) > 0 && !is.na(current$keypress)) {
				groups[[length(groups) + 1]] <- tibble(
					key_index = length(groups),
					first_keydown_ms = current$keydowns[[1]],
					last_keydown_ms = current$keydowns[[length(current$keydowns)]],
					keypress_ms = current$keypress,
					input_ms = current$input,
					keyup_ms = current$keyup
				)
			}
			current <- list(keydowns = numeric(), keypress = NA_real_, input = NA_real_, keyup = NA_real_)
		}
	}
	bind_rows(groups)
}

mark_gap <- if (
	nrow(derived$browser_events) > 0 &&
	nrow(derived$action_events) > 0 &&
	"eventMs" %in% names(derived$browser_events)
) {
	derived$browser_events %>%
		filter(run_id == "keyhold_schedulers", type %in% c("keydown", "keypress", "input", "keyup")) %>%
		group_by(run_id, run_label, round, delayMs) %>%
		group_modify(~ build_key_groups(.x)) %>%
		ungroup() %>%
		group_by(run_id, run_label, round, delayMs) %>%
		mutate(previous_input_ms = lag(input_ms)) %>%
		ungroup() %>%
		rowwise() %>%
		mutate(
			mark_event_ms = {
				current_round <- round
				current_delay <- delayMs
				current_previous_input_ms <- previous_input_ms
				current_first_keydown_ms <- first_keydown_ms
				marks <- derived$action_events %>%
					filter(
						run_id == "keyhold_schedulers",
						round == .env$current_round,
						delayMs == .env$current_delay,
						storeName == "core/block-editor",
						actionName == "__unstableMarkLastChangeAsPersistent",
						eventMs > .env$current_previous_input_ms,
						eventMs < .env$current_first_keydown_ms
					) %>%
					arrange(desc(eventMs))
				if (nrow(marks) == 0) NA_real_ else marks$eventMs[[1]]
			},
			mark_to_keydown_ms = first_keydown_ms - mark_event_ms,
			mark_to_previous_keyup_ms = keyup_ms - mark_event_ms
		) %>%
		ungroup() %>%
		left_join(
			records %>%
				filter(run_id == "keyhold_schedulers") %>%
				transmute(
					run_id,
					round,
					delayMs = delay_ms,
					key_index = sample_index,
					is_throwaway,
					latency_ms
				),
			by = c("run_id", "round", "delayMs", "key_index")
		) %>%
		filter(!is_throwaway, !is.na(mark_to_keydown_ms))
} else {
	tibble()
}

if (nrow(mark_gap) > 0) {
	write_csv(mark_gap, file.path(data_dir, "typing-delay-keyhold-mark-gap.csv"))
	save_plot(
		ggplot(mark_gap, aes(mark_to_keydown_ms, latency_ms, color = delayMs)) +
			geom_point(size = 2.3, alpha = 0.85) +
			geom_smooth(method = "loess", formula = y ~ x, se = FALSE, color = "#111827", linewidth = 0.75) +
			scale_color_viridis_c(option = "C", end = 0.9) +
			labs(
				title = "Normal Playwright delay leaves the previous key held after persistence",
				subtitle = "Latency rises when the next key arrives ~180-300ms after the persistence timer fired",
				x = "Time from previous rich-text persistence marker to current keydown (ms)",
				y = "Current key latency (ms)",
				color = "Delay"
			),
		"11-keyhold-mark-gap-vs-latency.png"
	)
}

paired_trace_run_ids <- c("mode_trace_keyhold", "mode_trace_between_keys")

component_breakdown <- records %>%
	filter(run_id %in% paired_trace_run_ids, !is_throwaway) %>%
	group_by(run_id, run_label, delay_ms) %>%
	summarise(
		keydown_ms = median(keydown_ms),
		keypress_ms = median(keypress_ms),
		keyup_ms = median(keyup_ms),
		latency_ms = median(latency_ms),
		.groups = "drop"
	) %>%
	mutate(
		mode_label = recode(
			run_id,
			mode_trace_keyhold = "Playwright delay: key held down",
			mode_trace_between_keys = "Complete keypress, then wait"
		),
		mode_label = factor(
			mode_label,
			levels = c(
				"Playwright delay: key held down",
				"Complete keypress, then wait"
			)
		)
	) %>%
	pivot_longer(
		c(keydown_ms, keypress_ms, keyup_ms),
		names_to = "component",
		values_to = "component_ms"
	) %>%
	mutate(
		component = recode(
			component,
			keydown_ms = "keydown",
			keypress_ms = "keypress",
			keyup_ms = "keyup"
		),
		component = factor(component, levels = c("keydown", "keypress", "keyup"))
	)

if (nrow(component_breakdown) > 0) {
	save_plot(
		ggplot(component_breakdown, aes(factor(delay_ms), component_ms, fill = component)) +
			geom_col(width = 0.72) +
			facet_wrap(~ mode_label, ncol = 1) +
			scale_fill_manual(values = c(
				keydown = "#2563eb",
				keypress = "#f97316",
				keyup = "#16a34a"
			)) +
			labs(
				title = "The extra measured latency is almost entirely keypress dispatch",
				subtitle = "Paired trace-heavy runs using the same delay list; only the key-hold mode returns to the high plateau",
				x = "Configured delay",
				y = "Median EventDispatch duration (ms)",
				fill = "Component"
			),
		"12-event-component-breakdown.png",
		width = 11,
		height = 8
	)
}

key_event_timing <- if (
	nrow(derived$browser_events) > 0 &&
	nrow(derived$action_events) > 0 &&
	"eventMs" %in% names(derived$browser_events)
) {
	derived$browser_events %>%
		filter(run_id %in% paired_trace_run_ids, type %in% c("keydown", "keypress", "input", "keyup")) %>%
		group_by(run_id, run_label, round, delayMs) %>%
		group_modify(~ build_key_groups(.x)) %>%
		ungroup() %>%
		group_by(run_id, run_label, round, delayMs) %>%
		mutate(
			previous_input_ms = lag(input_ms),
			previous_keyup_ms = lag(keyup_ms)
		) %>%
		ungroup() %>%
		rowwise() %>%
		mutate(
			mark_event_ms = {
				current_run_id <- run_id
				current_round <- round
				current_delay <- delayMs
				current_previous_input_ms <- previous_input_ms
				current_first_keydown_ms <- first_keydown_ms
				marks <- derived$action_events %>%
					filter(
						run_id == .env$current_run_id,
						round == .env$current_round,
						delayMs == .env$current_delay,
						storeName == "core/block-editor",
						actionName == "__unstableMarkLastChangeAsPersistent",
						eventMs > .env$current_previous_input_ms,
						eventMs < .env$current_first_keydown_ms
					) %>%
					arrange(desc(eventMs))
				if (nrow(marks) == 0) NA_real_ else marks$eventMs[[1]]
			},
			mark_to_keydown_ms = first_keydown_ms - mark_event_ms,
			previous_keyup_to_mark_ms = mark_event_ms - previous_keyup_ms,
			previous_keyup_to_current_keydown_ms = first_keydown_ms - previous_keyup_ms,
			previous_input_to_previous_keyup_ms = previous_keyup_ms - previous_input_ms,
			mark_during_previous_key_hold = mark_event_ms < previous_keyup_ms
		) %>%
		ungroup() %>%
		left_join(
			records %>%
				filter(run_id %in% paired_trace_run_ids) %>%
				transmute(
					run_id,
					round,
					delayMs = delay_ms,
					key_index = sample_index,
					is_throwaway,
					latency_ms,
					keydown_duration_ms = keydown_ms,
					keypress_duration_ms = keypress_ms,
					keyup_duration_ms = keyup_ms
				),
			by = c("run_id", "round", "delayMs", "key_index")
		) %>%
		filter(!is_throwaway, !is.na(mark_event_ms))
} else {
	tibble()
}

if (nrow(key_event_timing) > 0) {
	write_csv(key_event_timing, file.path(data_dir, "typing-delay-key-event-timing.csv"))
	timing_plot <- key_event_timing %>%
		mutate(
			mode_label = recode(
				run_id,
				mode_trace_keyhold = "Playwright delay: key held down",
				mode_trace_between_keys = "Complete keypress, then wait"
			),
			mark_state = if_else(
				mark_during_previous_key_hold,
				"Persistence fired before previous keyup",
				"Persistence fired after previous keyup"
			)
		)

	save_plot(
		ggplot(timing_plot, aes(previous_keyup_to_mark_ms, keypress_duration_ms, color = mode_label, shape = mark_state)) +
			geom_vline(xintercept = 0, linetype = "dashed", color = "#475569") +
			geom_point(size = 2.5, alpha = 0.82) +
			scale_color_manual(values = c(
				"Playwright delay: key held down" = "#b91c1c",
				"Complete keypress, then wait" = "#0369a1"
			)) +
			labs(
				title = "The slow path appears when persistence fires while the previous key is still held",
				subtitle = "Negative x means the one-second persistence marker fired before keyup; the y-axis is the dominant latency component",
				x = "Previous keyup to persistence marker (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = NULL,
				shape = NULL
			),
		"13-persistence-marker-vs-previous-keyup.png"
	)
}

native_comparison_run_ids <- c(
	"mode_trace_keyhold",
	"mode_trace_between_keys",
	"native_keyhold_timer",
	"native_between_keys_timer"
)

native_comparison <- records %>%
	filter(run_id %in% native_comparison_run_ids, !is_throwaway) %>%
	group_by(run_id, run_label, scenario_label, delay_ms) %>%
	summarise(
		latency_ms = median(latency_ms),
		keypress_ms = median(keypress_ms),
		keydown_ms = median(keydown_ms),
		keyup_ms = median(keyup_ms),
		.groups = "drop"
	) %>%
	mutate(
		mode_label = recode(
			run_id,
			mode_trace_keyhold = "Gutenberg: key held down",
			mode_trace_between_keys = "Gutenberg: wait after keyup",
			native_keyhold_timer = "Native: key held down",
			native_between_keys_timer = "Native: wait after keyup"
		),
		mode_label = factor(
			mode_label,
			levels = c(
				"Gutenberg: key held down",
				"Gutenberg: wait after keyup",
				"Native: key held down",
				"Native: wait after keyup"
			)
		)
	) %>%
	pivot_longer(
		c(latency_ms, keypress_ms),
		names_to = "metric",
		values_to = "duration_ms"
	) %>%
	mutate(
		metric = recode(
			metric,
			latency_ms = "keydown + keypress + keyup",
			keypress_ms = "keypress only"
		),
		metric = factor(
			metric,
			levels = c("keydown + keypress + keyup", "keypress only")
		)
	)

if (nrow(native_comparison) > 0) {
	save_plot(
		ggplot(native_comparison, aes(delay_ms, duration_ms, color = mode_label, linetype = mode_label)) +
			geom_line(linewidth = 0.8) +
			geom_point(size = 2.1) +
			facet_wrap(~ metric, ncol = 1) +
			scale_color_manual(values = c(
				"Gutenberg: key held down" = "#b91c1c",
				"Gutenberg: wait after keyup" = "#0369a1",
				"Native: key held down" = "#f97316",
				"Native: wait after keyup" = "#16a34a"
			)) +
			scale_linetype_manual(values = c(
				"Gutenberg: key held down" = "solid",
				"Gutenberg: wait after keyup" = "solid",
				"Native: key held down" = "dashed",
				"Native: wait after keyup" = "dashed"
			)) +
			labs(
				title = "The native contenteditable baseline does not reproduce Gutenberg's key-hold plateau",
				subtitle = "Both native modes include a 1000ms clear-and-reschedule input timer; the Gutenberg key-hold mode remains the outlier",
				x = "Configured delay",
				y = "Median EventDispatch duration (ms)",
				color = NULL,
				linetype = NULL
			),
		"14-native-contenteditable-comparison.png",
		width = 11,
		height = 8
	)
}

native_key_event_timing <- if (
	nrow(derived$browser_events) > 0 &&
	nrow(derived$persistence_events) > 0 &&
	"eventMs" %in% names(derived$browser_events)
) {
	derived$browser_events %>%
		filter(run_id %in% c("native_keyhold_timer", "native_between_keys_timer"), type %in% c("keydown", "keypress", "input", "keyup")) %>%
		group_by(run_id, run_label, round, delayMs) %>%
		group_modify(~ build_key_groups(.x)) %>%
		ungroup() %>%
		group_by(run_id, run_label, round, delayMs) %>%
		mutate(
			previous_input_ms = lag(input_ms),
			previous_keyup_ms = lag(keyup_ms)
		) %>%
		ungroup() %>%
		rowwise() %>%
		mutate(
			mark_event_ms = {
				current_run_id <- run_id
				current_round <- round
				current_delay <- delayMs
				current_previous_input_ms <- previous_input_ms
				current_first_keydown_ms <- first_keydown_ms
				marks <- derived$persistence_events %>%
					filter(
						run_id == .env$current_run_id,
						round == .env$current_round,
						delayMs == .env$current_delay,
						isPersistent,
						eventMs > .env$current_previous_input_ms,
						eventMs < .env$current_first_keydown_ms
					) %>%
					arrange(desc(eventMs))
				if (nrow(marks) == 0) NA_real_ else marks$eventMs[[1]]
			},
			mark_to_keydown_ms = first_keydown_ms - mark_event_ms,
			previous_keyup_to_mark_ms = mark_event_ms - previous_keyup_ms,
			previous_keyup_to_current_keydown_ms = first_keydown_ms - previous_keyup_ms,
			previous_input_to_previous_keyup_ms = previous_keyup_ms - previous_input_ms,
			mark_during_previous_key_hold = mark_event_ms < previous_keyup_ms
		) %>%
		ungroup() %>%
		left_join(
			records %>%
				filter(run_id %in% c("native_keyhold_timer", "native_between_keys_timer")) %>%
				transmute(
					run_id,
					round,
					delayMs = delay_ms,
					key_index = sample_index,
					is_throwaway,
					latency_ms,
					keydown_duration_ms = keydown_ms,
					keypress_duration_ms = keypress_ms,
					keyup_duration_ms = keyup_ms
				),
			by = c("run_id", "round", "delayMs", "key_index")
		) %>%
		filter(!is_throwaway, !is.na(mark_event_ms))
} else {
	tibble()
}

if (nrow(native_key_event_timing) > 0) {
	write_csv(native_key_event_timing, file.path(data_dir, "typing-delay-native-key-event-timing.csv"))
}

listener_trace_run_ids <- c("listener_keyhold", "listener_between_keys")
listener_scenario_trace_run_ids <- c(
	listener_trace_run_ids,
	"listener_empty_keyhold",
	"listener_empty_between_keys"
)

listener_events <- derived$event_listener_events %>%
	mutate(
		script_label = case_when(
			str_detect(registrationStack %||% "", "build/scripts/rich-text/") ~ "rich-text",
			str_detect(registrationStack %||% "", "build/scripts/block-editor/") ~ "block-editor",
			str_detect(registrationStack %||% "", "build/scripts/vendors/react-dom") ~ "react-dom",
			str_detect(registrationStack %||% "", "build/scripts/components/") ~ "components",
			str_detect(registrationStack %||% "", "build/scripts/keyboard-shortcuts/") ~ "keyboard-shortcuts",
			str_detect(registrationStack %||% "", "build/scripts/compose/") ~ "compose",
			TRUE ~ "other"
		),
		listener_site = str_extract(
			registrationStack %||% "",
			"build/scripts/[^\\n]+"
		),
		mode_label = recode(
			run_id,
			listener_keyhold = "Playwright delay: key held down",
			listener_between_keys = "Complete keypress, then wait",
			listener_empty_keyhold = "Playwright delay: key held down",
			listener_empty_between_keys = "Complete keypress, then wait",
			.default = run_label
		),
		listener_scenario_label = recode(
			run_id,
			listener_keyhold = "large post",
			listener_between_keys = "large post",
			listener_empty_keyhold = "empty post",
			listener_empty_between_keys = "empty post",
			.default = NA_character_
		)
	)

listener_input_summary <- listener_events %>%
	filter(run_id %in% listener_trace_run_ids, type == "input") %>%
	group_by(run_id, mode_label, delayMs, script_label) %>%
	summarise(
		n = n(),
		total_ms = sum(durationMs, na.rm = TRUE),
		median_ms = median(durationMs, na.rm = TRUE),
		p90_ms = quant(durationMs, 0.9),
		.groups = "drop"
	)

if (nrow(listener_input_summary) > 0) {
	write_csv(listener_input_summary, file.path(data_dir, "typing-delay-listener-input-summary.csv"))
	listener_plot <- listener_input_summary %>%
		filter(script_label %in% c("rich-text", "block-editor", "react-dom")) %>%
		mutate(
			mode_label = factor(
				mode_label,
				levels = c(
					"Playwright delay: key held down",
					"Complete keypress, then wait"
				)
			),
			script_label = factor(
				script_label,
				levels = c("rich-text", "block-editor", "react-dom")
			)
		)

	save_plot(
		ggplot(listener_plot, aes(delayMs, median_ms, color = script_label)) +
			geom_line(linewidth = 0.8) +
			geom_point(size = 2.2) +
			facet_wrap(~ mode_label, ncol = 1) +
			scale_color_manual(values = c(
				"rich-text" = "#b91c1c",
				"block-editor" = "#0369a1",
				"react-dom" = "#7c3aed"
			)) +
			labs(
				title = "The dominant measured callback is RichText's input listener",
				subtitle = "Listener timing is diagnostic and adds overhead, but it localizes the key-hold cost inside editor-canvas input handling",
				x = "Configured delay",
				y = "Median listener duration per invocation (ms)",
				color = "Registered from"
			),
		"15-rich-text-listener-duration.png",
		width = 11,
		height = 8
	)
}

listener_input_scenario_summary <- listener_events %>%
	filter(run_id %in% listener_scenario_trace_run_ids, type == "input", script_label == "rich-text") %>%
	group_by(run_id, mode_label, listener_scenario_label, delayMs) %>%
	summarise(
		n = n(),
		total_ms = sum(durationMs, na.rm = TRUE),
		median_ms = median(durationMs, na.rm = TRUE),
		p90_ms = quant(durationMs, 0.9),
		.groups = "drop"
	)

if (nrow(listener_input_scenario_summary) > 0) {
	write_csv(listener_input_scenario_summary, file.path(data_dir, "typing-delay-listener-input-scenario-summary.csv"))
	listener_scenario_plot <- listener_input_scenario_summary %>%
		mutate(
			mode_label = factor(
				mode_label,
				levels = c(
					"Playwright delay: key held down",
					"Complete keypress, then wait"
				)
			),
			listener_scenario_label = factor(
				listener_scenario_label,
				levels = c("large post", "empty post")
			)
		)

	save_plot(
		ggplot(listener_scenario_plot, aes(delayMs, median_ms, color = listener_scenario_label)) +
			geom_line(linewidth = 0.8) +
			geom_point(size = 2.2) +
			facet_wrap(~ mode_label, ncol = 1) +
			scale_color_manual(values = c(
				"large post" = "#b91c1c",
				"empty post" = "#0369a1"
			)) +
			labs(
				title = "The RichText input listener is still visible in an empty post",
				subtitle = "The active editable element carries several milliseconds of callback work even without the large-post fixture",
				x = "Configured delay",
				y = "Median RichText input listener duration (ms)",
				color = "Scenario"
			),
		"16-rich-text-listener-scenario-control.png",
		width = 11,
		height = 8
	)
}

listener_action_summary <- derived$action_events %>%
	filter(run_id %in% listener_scenario_trace_run_ids) %>%
	mutate(
		mode_label = recode(
			run_id,
			listener_keyhold = "Playwright delay: key held down",
			listener_between_keys = "Complete keypress, then wait",
			listener_empty_keyhold = "Playwright delay: key held down",
			listener_empty_between_keys = "Complete keypress, then wait"
		),
		listener_scenario_label = recode(
			run_id,
			listener_keyhold = "large post",
			listener_between_keys = "large post",
			listener_empty_keyhold = "empty post",
			listener_empty_between_keys = "empty post"
		)
	) %>%
	group_by(run_id, mode_label, listener_scenario_label, delayMs, storeName, actionName) %>%
	summarise(
		n = n(),
		total_ms = sum(durationMs, na.rm = TRUE),
		median_ms = median(durationMs, na.rm = TRUE),
		p90_ms = quant(durationMs, 0.9),
		.groups = "drop"
	)

if (nrow(listener_action_summary) > 0) {
	write_csv(listener_action_summary, file.path(data_dir, "typing-delay-listener-action-summary.csv"))
}

rich_text_span_run_ids <- c(
	"rich_text_spans_large_keyhold",
	"rich_text_spans_large_between_keys",
	"rich_text_spans_empty_keyhold",
	"rich_text_spans_empty_between_keys"
)

rich_text_spans <- derived$rich_text_span_events %>%
	mutate(
		mode_label = recode(
			run_id,
			rich_text_spans_large_keyhold = "Playwright delay: key held down",
			rich_text_spans_large_between_keys = "Complete keypress, then wait",
			rich_text_spans_empty_keyhold = "Playwright delay: key held down",
			rich_text_spans_empty_between_keys = "Complete keypress, then wait",
			.default = run_label
		),
		span_scenario_label = recode(
			run_id,
			rich_text_spans_large_keyhold = "large post",
			rich_text_spans_large_between_keys = "large post",
			rich_text_spans_empty_keyhold = "empty post",
			rich_text_spans_empty_between_keys = "empty post",
			.default = NA_character_
		),
		span_label = recode(
			name,
			`rich-text.onInput.total` = "onInput total",
			`rich-text.createRecord.create` = "create DOM record",
			`rich-text.onInput.updateFormats` = "update formats",
			`rich-text.handleChange.applyRecord` = "apply record",
			`rich-text.handleChange.serialize` = "serialize",
			`rich-text.handleChange.registryBatch` = "registry.batch",
			`rich-text.handleChange.onSelectionChange` = "onSelectionChange",
			`rich-text.handleChange.onChange` = "onChange",
			`rich-text.handleChange.forceRender` = "forceRender",
			.default = name
		)
	)

rich_text_span_summary <- rich_text_spans %>%
	filter(run_id %in% rich_text_span_run_ids) %>%
	group_by(run_id, mode_label, span_scenario_label, delayMs, name, span_label) %>%
	summarise(
		n = n(),
		total_ms = sum(durationMs, na.rm = TRUE),
		median_ms = median(durationMs, na.rm = TRUE),
		p90_ms = quant(durationMs, 0.9),
		.groups = "drop"
	)

if (nrow(rich_text_span_summary) > 0) {
	write_csv(rich_text_span_summary, file.path(data_dir, "typing-delay-rich-text-span-summary.csv"))

	span_line_plot <- rich_text_span_summary %>%
		filter(
			name %in% c(
				"rich-text.onInput.total",
				"rich-text.handleChange.registryBatch",
				"rich-text.createRecord.create",
				"rich-text.handleChange.applyRecord",
				"rich-text.handleChange.serialize",
				"rich-text.handleChange.forceRender"
			)
		) %>%
		mutate(
			mode_label = factor(
				mode_label,
				levels = c(
					"Playwright delay: key held down",
					"Complete keypress, then wait"
				)
			),
			span_scenario_label = factor(
				span_scenario_label,
				levels = c("large post", "empty post")
			),
			span_label = factor(
				span_label,
				levels = c(
					"onInput total",
					"registry.batch",
					"create DOM record",
					"apply record",
					"serialize",
					"forceRender"
				)
			)
		)

	save_plot(
		ggplot(span_line_plot, aes(delayMs, median_ms, color = span_label)) +
			geom_line(linewidth = 0.75) +
			geom_point(size = 1.9) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_manual(values = c(
				"onInput total" = "#111827",
				"registry.batch" = "#b91c1c",
				"create DOM record" = "#0369a1",
				"apply record" = "#16a34a",
				"serialize" = "#7c3aed",
				"forceRender" = "#f97316"
			)) +
			labs(
				title = "Source-level RichText spans put the cost inside registry.batch",
				subtitle = "DOM parsing, apply, serialization, and forceRender are small in these targeted traces",
				x = "Configured delay",
				y = "Median span duration per invocation (ms)",
				color = "Span"
			),
		"17-rich-text-source-span-breakdown.png",
		width = 12,
		height = 8
	)
}

rich_text_batch_parts <- rich_text_spans %>%
	filter(
		run_id %in% rich_text_span_run_ids,
		name %in% c(
			"rich-text.handleChange.registryBatch",
			"rich-text.handleChange.onSelectionChange",
			"rich-text.handleChange.onChange"
		)
	) %>%
	group_by(run_id, mode_label, span_scenario_label, round, delayMs, name) %>%
	mutate(span_index = row_number()) %>%
	ungroup() %>%
	select(run_id, mode_label, span_scenario_label, round, delayMs, span_index, name, durationMs) %>%
	pivot_wider(names_from = name, values_from = durationMs) %>%
	mutate(
		registry_batch_ms = `rich-text.handleChange.registryBatch`,
		selection_change_ms = `rich-text.handleChange.onSelectionChange` %||% 0,
		on_change_ms = `rich-text.handleChange.onChange` %||% 0,
		batch_remainder_ms = pmax(registry_batch_ms - selection_change_ms - on_change_ms, 0)
	) %>%
	select(
		run_id, mode_label, span_scenario_label, round, delayMs, span_index,
		registry_batch_ms, selection_change_ms, on_change_ms, batch_remainder_ms
	)

rich_text_batch_summary <- rich_text_batch_parts %>%
	group_by(run_id, mode_label, span_scenario_label, delayMs) %>%
	summarise(
		n = n(),
		registry_batch_median_ms = median(registry_batch_ms, na.rm = TRUE),
		selection_change_median_ms = median(selection_change_ms, na.rm = TRUE),
		on_change_median_ms = median(on_change_ms, na.rm = TRUE),
		batch_remainder_median_ms = median(batch_remainder_ms, na.rm = TRUE),
		.groups = "drop"
	)

if (nrow(rich_text_batch_summary) > 0) {
	write_csv(rich_text_batch_parts, file.path(data_dir, "typing-delay-rich-text-batch-parts.csv"))
	write_csv(rich_text_batch_summary, file.path(data_dir, "typing-delay-rich-text-batch-summary.csv"))

	batch_plot <- rich_text_batch_summary %>%
		mutate(
			mode_label = factor(
				mode_label,
				levels = c(
					"Playwright delay: key held down",
					"Complete keypress, then wait"
				)
			),
			span_scenario_label = factor(
				span_scenario_label,
				levels = c("large post", "empty post")
			)
		) %>%
		pivot_longer(
			c(selection_change_median_ms, on_change_median_ms, batch_remainder_median_ms),
			names_to = "component",
			values_to = "median_ms"
		) %>%
		mutate(
			component = recode(
				component,
				selection_change_median_ms = "onSelectionChange",
				on_change_median_ms = "onChange",
				batch_remainder_median_ms = "registry.batch remainder"
			),
			component = factor(
				component,
				levels = c("onSelectionChange", "onChange", "registry.batch remainder")
			)
		)

	save_plot(
		ggplot(batch_plot, aes(factor(delayMs), median_ms, fill = component)) +
			geom_col(width = 0.72) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_fill_manual(values = c(
				"onSelectionChange" = "#0369a1",
				"onChange" = "#16a34a",
				"registry.batch remainder" = "#b91c1c"
			)) +
			labs(
				title = "Most registry.batch time is outside the two direct callbacks",
				subtitle = "The remainder is the synchronous data-store notification/render work hidden behind registry.batch",
				x = "Configured delay",
				y = "Median duration (ms)",
				fill = "Component"
			),
		"18-rich-text-registry-batch-breakdown.png",
		width = 12,
		height = 8
	)
}

message("Wrote plots to: ", figure_dir)
