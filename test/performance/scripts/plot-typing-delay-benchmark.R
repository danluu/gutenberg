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
	"cliff_actions", "Cliff action trace", "artifacts/typing-delay-benchmark-cliff-actions-970/typing-delay-benchmark-1777778178028.json", "large post", "action instrumentation from 970 to 1300ms",
	"timeout_230_rewrite", "1000ms timers rewritten to 230ms", "artifacts/typing-delay-benchmark-timeout-230-dense/typing-delay-benchmark-1777780999061.json", "large post", "timer intervention: 1000ms setTimeout calls rewritten to 230ms, dense transition scan",
	"timeout_500_rewrite", "1000ms timers rewritten to 500ms", "artifacts/typing-delay-benchmark-timeout-500/typing-delay-benchmark-1777757430029.json", "large post", "timer intervention: 1000ms setTimeout calls rewritten to 500ms",
	"timeout_710_rewrite", "1000ms timers rewritten to 710ms", "artifacts/typing-delay-benchmark-timeout-710/typing-delay-benchmark-1777780840129.json", "large post", "timer intervention: 1000ms setTimeout calls rewritten to 710ms",
	"after_persistence_scan", "Wait for persistence, then wait", "artifacts/typing-delay-benchmark-after-persistence-scan/typing-delay-benchmark-1777758189761.json", "large post", "delay after isLastBlockChangePersistent()",
	"keyhold_schedulers", "Key-hold scheduler trace", "artifacts/typing-delay-benchmark-keyhold-schedulers/typing-delay-benchmark-1777758386189.json", "large post", "normal Playwright delay with action/timer/scheduler tracing",
	"between_keys", "Complete keypress, then wait", "artifacts/typing-delay-benchmark-between-keys/typing-delay-benchmark-1777758545134.json", "large post", "delay after full keydown/keypress/input/keyup sequence",
	"between_keys_0_1100_dense", "Complete keypress, then wait: 0-1100ms, 10ms step", "artifacts/typing-delay-benchmark-between-keys-0-1100-dense/typing-delay-benchmark-1777764334188.json", "large post", "delay after full keydown/keypress/input/keyup sequence, dense 0-1100ms scan",
	"between_keys_1110_2000_dense", "Complete keypress, then wait: 1110-2000ms, 10ms step", "artifacts/typing-delay-benchmark-between-keys-1110-2000-dense/typing-delay-benchmark-1777764764748.json", "large post", "delay after full keydown/keypress/input/keyup sequence, dense 1110-2000ms extension",
	"container_keyhold_0_2000_dense", "Container block: key held during delay", "artifacts/typing-delay-benchmark-container-keyhold-0-2000-dense/typing-delay-benchmark-1777781875940.json", "small post with containers", "typing inside the Columns container fixture, normal Playwright delay, dense 0-2000ms scan",
	"container_between_keys_0_2000_dense", "Container block: complete keypress, then wait", "artifacts/typing-delay-benchmark-container-between-keys-0-2000-dense/typing-delay-benchmark-1777783331811.json", "small post with containers", "typing inside the Columns container fixture, delay after full keydown/keypress/input/keyup sequence, dense 0-2000ms scan",
	"firefox_boundary_listeners", "Firefox input listener boundary", "artifacts/typing-delay-benchmark-firefox-boundary-listeners-confirm/typing-delay-benchmark-1777785299877.json", "large post, Firefox", "Firefox listener-timing check around 1000ms, two orderings",
	"firefox_1000_narrow_listeners", "Firefox input listener narrow boundary", "artifacts/typing-delay-benchmark-firefox-1000-narrow-listeners/typing-delay-benchmark-1777785514268.json", "large post, Firefox", "Firefox listener-timing check from 995ms to 1010ms",
	"webkit_boundary_listeners", "WebKit input listener boundary", "artifacts/typing-delay-benchmark-webkit-boundary-listeners-confirm/typing-delay-benchmark-1777786069947.json", "large post, WebKit", "Playwright WebKit listener-timing check around 1000ms, two orderings",
	"webkit_1000_narrow_listeners", "WebKit input listener narrow boundary", "artifacts/typing-delay-benchmark-webkit-1000-narrow-listeners/typing-delay-benchmark-1777786265704.json", "large post, WebKit", "Playwright WebKit listener-timing check from 995ms to 1010ms",
	"chrome_browser_timeline", "Chrome browser timer timeline", "artifacts/typing-delay-benchmark-chrome-browser-timeline/typing-delay-benchmark-1777786848045.json", "large post, Chrome", "fresh-editor per-delay browser/listener/timer trace at 990ms, 1000ms, and 1010ms",
	"firefox_browser_timeline", "Firefox browser timer timeline", "artifacts/typing-delay-benchmark-firefox-browser-timeline/typing-delay-benchmark-1777786896917.json", "large post, Firefox", "fresh-editor per-delay browser/listener/timer trace at 990ms, 1000ms, and 1010ms",
	"webkit_browser_timeline", "WebKit browser timer timeline", "artifacts/typing-delay-benchmark-webkit-browser-timeline/typing-delay-benchmark-1777786897327.json", "large post, WebKit", "fresh-editor per-delay browser/listener/timer trace at 990ms, 1000ms, and 1010ms",
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
	"rich_text_spans_empty_between_keys", "RichText span trace: empty post, wait after keyup", "artifacts/typing-delay-benchmark-rich-text-spans-batch-empty-between-keys/typing-delay-benchmark-1777762283041.json", "empty post", "source-level RichText span trace for delay after full keypress",
	"data_spans_large_keyhold", "Data span trace: large post, key held", "test/performance/artifacts/typing-delay-benchmark-data-spans-large-keyhold/typing-delay-benchmark-1777763210695.json", "large post", "source-level data registry/useSelect span trace for normal Playwright delay",
	"data_spans_large_between_keys", "Data span trace: large post, wait after keyup", "test/performance/artifacts/typing-delay-benchmark-data-spans-large-between-keys/typing-delay-benchmark-1777763295424.json", "large post", "source-level data registry/useSelect span trace for delay after full keypress",
	"data_spans_empty_keyhold", "Data span trace: empty post, key held", "test/performance/artifacts/typing-delay-benchmark-data-spans-empty-keyhold/typing-delay-benchmark-1777763369906.json", "empty post", "source-level data registry/useSelect span trace for normal Playwright delay",
	"data_spans_empty_between_keys", "Data span trace: empty post, wait after keyup", "test/performance/artifacts/typing-delay-benchmark-data-spans-empty-between-keys/typing-delay-benchmark-1777763429072.json", "empty post", "source-level data registry/useSelect span trace for delay after full keypress"
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
	data_span_events <- list()

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

		if ("dataSpanEvents" %in% names(run_summaries)) {
			data_span_events[[spec$run_id]] <- map_dfr(
				seq_len(nrow(run_summaries)),
				function(row_index) {
					events <- run_summaries$dataSpanEvents[[row_index]]
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
		rich_text_span_events = bind_rows(rich_text_span_events),
		data_span_events = bind_rows(data_span_events)
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
		replace_run_ids <- list(
			records,
			by_delay,
			runs,
			data$persistence_events,
			data$browser_events,
			data$action_events,
			data$timer_events,
			data$scheduler_events,
			data$event_listener_events,
			data$rich_text_span_events,
			data$data_span_events
		) %>%
			map(~ if ("run_id" %in% names(.x)) .x$run_id else character()) %>%
			unlist(use.names = FALSE) %>%
			unique()
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
		rich_text_span_events = data$rich_text_span_events,
		data_span_events = data$data_span_events
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
		},
		data_span_events = tibble()
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

brewer_color <- function(palette, index, type = "qual", n = 8) {
	brewer_pal(type = type, palette = palette)(n)[[index]]
}

records <- derived$records
by_delay <- derived$by_delay
runs <- derived$runs

full_curve <- by_delay %>%
	filter(run_id == "full_0_1100")

save_plot(
	ggplot(full_curve, aes(delay_ms, median_ms)) +
		geom_ribbon(aes(ymin = p10_ms, ymax = p90_ms), fill = brewer_color("Blues", 3, type = "seq", n = 9), alpha = 0.25) +
		geom_point(color = brewer_color("Dark2", 1), size = 1.2) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Set1", 1)) +
		annotate("label", x = 1000, y = max(full_curve$p90_ms), label = "1000ms rich-text persistence timer", hjust = 1.05, size = 3) +
		scale_x_continuous(breaks = seq(0, 1100, 100)) +
		labs(
			title = "Typing latency is not monotonic in key delay",
			subtitle = "0-1100ms scan, 10ms steps; points are p50 and band is p10-p90",
			x = "Configured Playwright delay between key events",
			y = "Latency, keydown + keypress + keyup (ms)"
		),
	"01-delay-curve-0-1100.png"
)

extended_curve <- by_delay %>%
	filter(run_id %in% c("dense_1110_2000", "landmarks_0_2000"))

save_plot(
	ggplot(extended_curve, aes(delay_ms, median_ms, color = run_label)) +
		geom_point(size = 2) +
		geom_vline(xintercept = c(1000, 1200, 1580), linetype = "dotted", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
		scale_color_brewer(type = "qual", palette = "Dark2") +
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
		geom_boxplot(outlier.shape = NA, fill = brewer_color("Blues", 2, type = "seq", n = 9), color = brewer_color("Blues", 8, type = "seq", n = 9)) +
		geom_point(
			position = position_jitter(width = 0.15, height = 0, seed = 51383),
			alpha = 0.45,
			size = 1,
			color = brewer_color("Dark2", 1)
		) +
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
		geom_point(size = 1.1) +
		scale_color_brewer(type = "qual", palette = "Dark2") +
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

container_variance_curve <- by_delay %>%
	filter(run_id %in% c("container_keyhold_0_2000_dense", "container_between_keys_0_2000_dense")) %>%
	filter(!is.na(cv), is.finite(cv)) %>%
	mutate(
		mode_label = case_when(
			run_id == "container_keyhold_0_2000_dense" ~ "Playwright delay: key held down",
			run_id == "container_between_keys_0_2000_dense" ~ "Complete keypress, then wait",
			TRUE ~ run_label
		),
		mode_label = factor(
			mode_label,
			levels = c(
				"Playwright delay: key held down",
				"Complete keypress, then wait"
			)
		)
	)

save_plot(
	ggplot(container_variance_curve, aes(delay_ms, cv, color = mode_label)) +
		geom_point(size = 1.1, alpha = 0.85) +
		scale_color_brewer(type = "qual", palette = "Dark2") +
		scale_y_continuous(labels = percent_format(accuracy = 1)) +
		labs(
			title = "Container-block volatility also depends on delay and mode",
			subtitle = "Typing inside the Columns fixture; six retained samples per delay",
			x = "Delay",
			y = "Coefficient of variation",
			color = NULL
		),
	"04b-container-coefficient-of-variation-by-delay.png"
)

time_order <- records %>%
	filter(run_id %in% c("full_0_1100", "landmarks_0_2000"), !is_throwaway) %>%
	filter(!is.na(global_retained_sample_index))

save_plot(
	ggplot(time_order, aes(global_retained_sample_index, latency_ms)) +
		geom_point(aes(color = delay_ms), alpha = 0.18, size = 0.7) +
		geom_smooth(color = brewer_color("Greys", 9, type = "seq", n = 9), se = FALSE, method = "loess", formula = y ~ x, span = 0.35, linewidth = 0.8) +
		facet_wrap(~run_label, scales = "free_x", ncol = 1) +
		scale_color_distiller(type = "seq", palette = "YlGnBu", direction = 1) +
		labs(
			title = "No simple warmup story explains the results",
			subtitle = "Latency over retained-sample order; dark line is a loess trend",
			x = "Retained sample order within run",
			y = "Latency (ms)",
			color = "Delay"
		),
	"05-latency-over-time.png",
	width = 9,
	height = 7
)

cliff_delay_levels <- derived$runs %>%
	filter(run_id == "cliff_actions") %>%
	pull(delay_ms) %>%
	unique() %>%
	sort()

cliff_keydowns <- derived$browser_events %>%
	filter(
		run_id == "cliff_actions",
		documentName == "editor-canvas",
		type == "keydown"
	) %>%
	arrange(delayMs, eventMs) %>%
	group_by(delayMs) %>%
	mutate(key_index = row_number()) %>%
	ungroup() %>%
	transmute(
		delayMs,
		key_index,
		keydown_ms = eventMs,
		next_keydown_ms = lead(eventMs),
		delay_label = factor(paste0(delayMs, "ms"), levels = paste0(cliff_delay_levels, "ms"))
	)

cliff_keyups <- derived$browser_events %>%
	filter(
		run_id == "cliff_actions",
		documentName == "editor-canvas",
		type == "keyup"
	) %>%
	arrange(delayMs, eventMs) %>%
	group_by(delayMs) %>%
	mutate(key_index = row_number()) %>%
	ungroup() %>%
	transmute(delayMs, key_index, keyup_ms = eventMs)

cliff_key_cycles <- cliff_keydowns %>%
	left_join(cliff_keyups, by = c("delayMs", "key_index")) %>%
	filter(!is.na(next_keydown_ms), key_index > 1) %>%
	mutate(
		keyup_after_keydown_ms = keyup_ms - keydown_ms,
		next_keydown_after_keydown_ms = next_keydown_ms - keydown_ms
	)

cliff_cycle_summary <- cliff_key_cycles %>%
	group_by(delayMs, delay_label) %>%
	summarise(
		keyup_p50_ms = median(keyup_after_keydown_ms, na.rm = TRUE),
		next_keydown_p50_ms = median(next_keydown_after_keydown_ms, na.rm = TRUE),
		.groups = "drop"
	)

cliff_cycle_action_events <- map_dfr(seq_len(nrow(cliff_key_cycles)), function(row_index) {
	cycle <- cliff_key_cycles[row_index, ]
	derived$action_events %>%
		filter(
			run_id == "cliff_actions",
			delayMs == cycle$delayMs,
			storeName == "core/block-editor",
			actionName %in% c("updateBlockAttributes", "__unstableMarkLastChangeAsPersistent"),
			eventMs >= cycle$keydown_ms,
			eventMs < cycle$next_keydown_ms
		) %>%
		mutate(
			key_index = cycle$key_index,
			ms_after_keydown = eventMs - cycle$keydown_ms,
			delay_label = cycle$delay_label
		)
})

cliff_action_summary <- cliff_cycle_action_events %>%
	mutate(
		event_label = case_when(
			actionName == "__unstableMarkLastChangeAsPersistent" ~ "1s timer marks persistent",
			actionName == "updateBlockAttributes" & `after.isPersistent` == FALSE ~ "text update leaves transient",
			actionName == "updateBlockAttributes" ~ "text update after timer"
		)
	) %>%
	group_by(delayMs, delay_label, event_label) %>%
	summarise(
		ms_after_keydown = median(ms_after_keydown, na.rm = TRUE),
		duration_p50_ms = median(durationMs, na.rm = TRUE),
		.groups = "drop"
	)

cliff_latency_labels <- by_delay %>%
	filter(run_id == "cliff_actions") %>%
	mutate(
		delay_label = factor(paste0(delay_ms, "ms"), levels = paste0(cliff_delay_levels, "ms")),
		label = paste0("event p50 ", number(median_ms, accuracy = 0.1), "ms")
	)

save_plot(
	ggplot() +
		geom_segment(
			data = cliff_cycle_summary,
			aes(x = 0, xend = keyup_p50_ms, y = delay_label, yend = delay_label),
			color = brewer_color("Greys", 6, type = "seq", n = 9),
			linewidth = 4,
			alpha = 0.28
		) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
		geom_point(
			data = cliff_cycle_summary,
			aes(next_keydown_p50_ms, delay_label, shape = "next keydown"),
			color = brewer_color("Dark2", 3),
			size = 2.8
		) +
		geom_point(
			data = cliff_action_summary,
			aes(ms_after_keydown, delay_label, color = event_label, shape = event_label),
			size = 3.1,
			alpha = 0.95
		) +
		geom_text(
			data = cliff_latency_labels,
			aes(1375, delay_label, label = label),
			color = brewer_color("Greys", 8, type = "seq", n = 9),
			size = 3.1,
			hjust = 0
		) +
		annotate(
			"text",
			x = 1000,
			y = length(cliff_delay_levels) + 0.55,
			label = "RichText 1000ms timer",
			size = 3.2,
			vjust = 0,
			color = brewer_color("Greys", 8, type = "seq", n = 9)
		) +
		annotate(
			"text",
			x = 520,
			y = 0.5,
			label = "gray bar: previous synthetic key is still held down",
			size = 3.1,
			color = brewer_color("Greys", 7, type = "seq", n = 9)
		) +
		annotate(
			"label",
			x = 690,
			y = 2.6,
			label = "970-990ms: the old timer is cleared\nbefore it can run between keys",
			size = 3,
			alpha = 0.85,
			color = brewer_color("Set1", 1)
		) +
		annotate(
			"label",
			x = 1165,
			y = 8.2,
			label = "1000ms+: the timer callback runs\nwhile the synthetic key is still down",
			size = 3,
			alpha = 0.85,
			color = brewer_color("Set1", 2)
		) +
		annotate(
			"text",
			x = 35,
			y = 12.55,
			label = "triangle: text update\nred=transient, orange=after timer",
			size = 3,
			hjust = 0,
			color = brewer_color("Dark2", 2)
		) +
		annotate(
			"text",
			x = 1065,
			y = 11.55,
			label = "circle: persistence timer",
			size = 3,
			hjust = 0,
			color = brewer_color("Set1", 2)
		) +
		annotate(
			"text",
			x = 1085,
			y = 0.45,
			label = "diamond: next keydown, where the measured keypress starts",
			size = 3,
			hjust = 0,
			color = brewer_color("Dark2", 3)
		) +
		scale_x_continuous(
			limits = c(-15, 1500),
			breaks = c(0, 500, 1000, 1100, 1300),
			labels = label_number(suffix = "ms")
		) +
		scale_color_manual(values = c(
			`text update leaves transient` = brewer_color("Set1", 1),
			`text update after timer` = brewer_color("Dark2", 2),
			`1s timer marks persistent` = brewer_color("Set1", 2)
		)) +
		scale_shape_manual(values = c(
			`text update leaves transient` = 17,
			`text update after timer` = 17,
			`1s timer marks persistent` = 16,
			`next keydown` = 23
		)) +
		coord_cartesian(clip = "off") +
		labs(
			title = "At 1000ms, the timer fits inside the synthetic key hold",
			subtitle = "Gray bar is the artificial key hold; complete-keypress-then-wait mode does not have this long held-key interval",
			x = "Milliseconds after previous keydown",
			y = "Configured Playwright key-hold delay",
			color = NULL,
			shape = NULL
		) +
		theme(
			legend.position = "none",
			plot.margin = margin(5.5, 90, 5.5, 5.5)
		),
	"06-persistence-action-timeline.png",
	width = 12,
	height = 7
)

regime_specs <- tribble(
	~delayMs, ~regime_label, ~regime_order,
	990, "Below 1s: timer keeps getting cleared", 1,
	1000, "At 1s drop: timer work is outside the measured key event", 2,
	1300, "Above the drop: timer still fires, but the key event is slow again", 3
)

regime_levels <- regime_specs$regime_label[order(regime_specs$regime_order)]

regime_action_metrics <- cliff_cycle_action_events %>%
	mutate(
		event_label = case_when(
			actionName == "__unstableMarkLastChangeAsPersistent" ~ "timer",
			actionName == "updateBlockAttributes" & `after.isPersistent` == FALSE ~ "text update leaves transient",
			actionName == "updateBlockAttributes" ~ "text update after timer"
		)
	) %>%
	group_by(delayMs, event_label) %>%
	summarise(
		offset_p50_ms = median(ms_after_keydown, na.rm = TRUE),
		duration_p50_ms = median(durationMs, na.rm = TRUE),
		.groups = "drop"
	)

regime_metrics <- regime_specs %>%
	left_join(
		cliff_cycle_summary %>%
			transmute(
				delayMs,
				keyup_p50_ms,
				period_p50_ms = next_keydown_p50_ms
			),
		by = "delayMs"
	) %>%
	left_join(
		by_delay %>%
			filter(run_id == "cliff_actions") %>%
			transmute(delayMs = delay_ms, event_p50_ms = median_ms),
		by = "delayMs"
	) %>%
	left_join(
		regime_action_metrics %>%
			filter(event_label %in% c("text update leaves transient", "text update after timer")) %>%
			group_by(delayMs) %>%
			summarise(
				update_p50_ms = first(offset_p50_ms),
				update_label = first(event_label),
				update_duration_p50_ms = first(duration_p50_ms),
				.groups = "drop"
			),
		by = "delayMs"
	) %>%
	left_join(
		regime_action_metrics %>%
			filter(event_label == "timer") %>%
			transmute(
				delayMs,
				timer_p50_ms = offset_p50_ms,
				timer_duration_p50_ms = duration_p50_ms
			),
		by = "delayMs"
	) %>%
	mutate(
		regime_label = factor(regime_label, levels = regime_levels),
		timer_text = if_else(
			is.na(timer_duration_p50_ms),
			"no timer task between measured keys",
			paste0("+ timer task p50 ", number(timer_duration_p50_ms, accuracy = 0.1), "ms outside event metric")
		),
		measurement_label = paste0(
			"event-only p50 ", number(event_p50_ms, accuracy = 0.1), "ms\n",
			timer_text
		)
	)

regime_cycles <- regime_metrics %>%
	slice(rep(row_number(), each = 3)) %>%
	group_by(delayMs) %>%
	mutate(
		cycle_index = row_number() - 1,
		cycle_label = paste0("cycle ", cycle_index + 1),
		cycle_y = 3 - cycle_index,
		cycle_start_ms = cycle_index * period_p50_ms,
		keyup_ms = cycle_start_ms + keyup_p50_ms,
		next_keydown_ms = cycle_start_ms + period_p50_ms,
		timer_deadline_ms = cycle_start_ms + 1000,
		update_ms = cycle_start_ms + update_p50_ms,
		timer_ms = cycle_start_ms + timer_p50_ms
	) %>%
	ungroup()

regime_events <- bind_rows(
	regime_cycles %>%
		transmute(regime_label, cycle_y, event_ms = cycle_start_ms, event_label = "keydown / measured event starts"),
	regime_cycles %>%
		transmute(regime_label, cycle_y, event_ms = update_ms, event_label = update_label),
	regime_cycles %>%
		filter(!is.na(timer_p50_ms)) %>%
		transmute(regime_label, cycle_y, event_ms = timer_ms, event_label = "timer marks previous input persistent"),
	regime_cycles %>%
		transmute(regime_label, cycle_y, event_ms = keyup_ms, event_label = "keyup"),
	regime_cycles %>%
		transmute(regime_label, cycle_y, event_ms = next_keydown_ms, event_label = "next keydown")
) %>%
	mutate(
		event_label = factor(
			event_label,
			levels = c(
				"keydown / measured event starts",
				"text update leaves transient",
				"text update after timer",
				"timer marks previous input persistent",
				"keyup",
				"next keydown"
			)
		)
	)

regime_labels <- regime_metrics %>%
	mutate(
		label_x = case_when(
			delayMs == 990 ~ period_p50_ms * 1.2,
			delayMs == 1000 ~ period_p50_ms * 1.05,
			TRUE ~ period_p50_ms * 1.02
		),
		label_y = 2.55
	)

regime_notes <- regime_specs %>%
	mutate(
		regime_label = factor(regime_label, levels = regime_levels),
		note_x = 35,
		note_y = 0.52,
		note = "gray bar: synthetic key held down; dashed ticks: 1000ms timer deadlines"
	)

save_plot(
	ggplot() +
		geom_segment(
			data = regime_cycles,
			aes(cycle_start_ms, cycle_y, xend = keyup_ms, yend = cycle_y),
			color = brewer_color("Greys", 6, type = "seq", n = 9),
			linewidth = 5,
			alpha = 0.24
		) +
		geom_segment(
			data = regime_cycles,
			aes(timer_deadline_ms, cycle_y - 0.28, xend = timer_deadline_ms, yend = cycle_y + 0.28),
			color = brewer_color("Greys", 7, type = "seq", n = 9),
			linetype = "dashed",
			linewidth = 0.45
		) +
		geom_point(
			data = regime_events,
			aes(event_ms, cycle_y, color = event_label, shape = event_label),
			size = 2.7,
			alpha = 0.95
		) +
		geom_label(
			data = regime_labels,
			aes(label_x, label_y, label = measurement_label),
			hjust = 0,
			size = 3,
			linewidth = 0.18,
			fill = "white",
			alpha = 0.9
		) +
		geom_text(
			data = regime_notes,
			aes(note_x, note_y, label = note),
			hjust = 0,
			size = 2.9,
			color = brewer_color("Greys", 7, type = "seq", n = 9)
		) +
		facet_wrap(~regime_label, ncol = 1) +
		scale_y_continuous(
			breaks = c(1, 2, 3),
			labels = c("cycle 3", "cycle 2", "cycle 1"),
			limits = c(0.35, 3.45)
		) +
		scale_x_continuous(
			breaks = seq(0, 4200, by = 500),
			labels = label_number(suffix = "ms"),
			expand = expansion(mult = c(0.01, 0.16))
		) +
		scale_color_manual(values = c(
			`keydown / measured event starts` = brewer_color("Dark2", 3),
			`text update leaves transient` = brewer_color("Set1", 1),
			`text update after timer` = brewer_color("Dark2", 2),
			`timer marks previous input persistent` = brewer_color("Set1", 2),
			`keyup` = brewer_color("Set2", 8),
			`next keydown` = brewer_color("Dark2", 3)
		)) +
		scale_shape_manual(values = c(
			`keydown / measured event starts` = 23,
			`text update leaves transient` = 17,
			`text update after timer` = 17,
			`timer marks previous input persistent` = 16,
			`keyup` = 15,
			`next keydown` = 23
		)) +
		labs(
			title = "The 1000ms cliff is task accounting, not a wrong timestamp",
			subtitle = "Each panel repeats the p50 timing pattern for three synthetic key cycles",
			x = "Milliseconds from the first shown keydown",
			y = NULL,
			color = NULL,
			shape = NULL
		) +
		theme(legend.position = "bottom"),
	"06b-persistence-regime-timelines.png",
	width = 12,
	height = 10
)

timer_rewrite_run_ids <- c("timeout_230_rewrite", "timeout_500_rewrite", "timeout_710_rewrite")

timer_rewrite <- by_delay %>%
	filter(run_id %in% timer_rewrite_run_ids) %>%
	mutate(
		rewrite_ms = case_when(
			run_id == "timeout_230_rewrite" ~ 230,
			run_id == "timeout_500_rewrite" ~ 500,
			run_id == "timeout_710_rewrite" ~ 710
		),
		rewrite_label = factor(
			paste0(rewrite_ms, "ms timer rewrite"),
			levels = c("230ms timer rewrite", "500ms timer rewrite", "710ms timer rewrite")
		)
	)

timer_events <- derived$timer_events %>%
	filter(run_id %in% timer_rewrite_run_ids, requestedTimeoutMs == 1000, rewritten)

save_plot(
	ggplot(timer_rewrite, aes(delay_ms, median_ms, color = rewrite_label)) +
		geom_vline(
			data = timer_rewrite %>% distinct(rewrite_ms, rewrite_label),
			aes(xintercept = rewrite_ms, color = rewrite_label),
			linetype = "dashed",
			linewidth = 0.45,
			show.legend = FALSE
		) +
		geom_point(size = 2.3, alpha = 0.9) +
		facet_wrap(~rewrite_label, ncol = 1) +
		scale_color_brewer(type = "qual", palette = "Dark2") +
		labs(
			title = "Moving the rich-text timer moves the low-latency window",
			subtitle = paste0(nrow(timer_events), " rich-text 1000ms timers were rewritten across three intervention runs"),
			x = "Configured Playwright key-hold delay",
			y = "p50 event-only latency (ms)",
			color = NULL
		) +
		theme(legend.position = "none"),
	"07-timeout-rewrite-interventions.png",
	width = 9,
	height = 8.5
)

save_plot(
	ggplot(timer_rewrite, aes(delay_ms - rewrite_ms, median_ms, color = rewrite_label)) +
		annotate("rect", xmin = 0, xmax = 120, ymin = -Inf, ymax = Inf, fill = brewer_color("Greys", 2, type = "seq", n = 9), alpha = 0.35) +
		geom_vline(xintercept = 0, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9), linewidth = 0.45) +
		geom_point(size = 2.3, alpha = 0.9) +
		scale_color_brewer(type = "qual", palette = "Dark2") +
		labs(
			title = "The low-latency window aligns relative to the rewritten timer",
			subtitle = "X=0 is the rewritten timeout; the first low points occur shortly after that callback can fire while the key is still held",
			x = "Configured key-hold delay minus rewritten timer (ms)",
			y = "p50 event-only latency (ms)",
			color = NULL
		) +
		theme(legend.position = "bottom"),
	"07b-timeout-rewrite-relative.png"
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
		geom_point(size = 2.2) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
		scale_color_brewer(type = "qual", palette = "Set2") +
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
		scale_fill_brewer(type = "qual", palette = "Set2") +
		labs(
			title = "Chromium emitted two keydown EventDispatch entries per typed character",
			subtitle = "This is why the benchmark groups keydown/keypress/keyup by sequence instead of assuming one keydown",
			x = "keydown EventDispatch entries per key group",
			y = "Retained samples",
			fill = NULL
		),
	"09-keydown-event-count-audit.png"
)

dense_mode_comparison <- by_delay %>%
	filter(
		run_id %in% c(
			"full_0_1100",
			"dense_1110_2000",
			"between_keys_0_1100_dense",
			"between_keys_1110_2000_dense"
		)
	) %>%
	mutate(
		mode_label = case_when(
			run_id %in% c("full_0_1100", "dense_1110_2000") ~ "Playwright delay: key held down",
			run_id %in% c("between_keys_0_1100_dense", "between_keys_1110_2000_dense") ~ "Complete keypress, then wait",
			TRUE ~ run_label
		),
		mode_label = factor(
			mode_label,
			levels = c(
				"Playwright delay: key held down",
				"Complete keypress, then wait"
			)
		)
	)

save_plot(
	ggplot(dense_mode_comparison, aes(delay_ms, median_ms, color = mode_label)) +
		geom_point(size = 1.45, alpha = 0.88) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
		scale_color_brewer(type = "qual", palette = "Set1") +
		scale_x_continuous(breaks = c(seq(0, 2000, 250), 1000)) +
		labs(
			title = "Dense delay-mode comparison: key-hold vs wait-after-keyup",
			subtitle = "The modes already differ below 1000ms; the 1200-2000ms slow plateau is specific to key-hold",
			x = "Configured delay",
			y = "p50 latency (ms)",
			color = NULL
		),
	"10-delay-mode-comparison.png"
)

container_dense_mode_comparison <- by_delay %>%
	filter(run_id %in% c("container_keyhold_0_2000_dense", "container_between_keys_0_2000_dense")) %>%
	mutate(
		mode_label = case_when(
			run_id == "container_keyhold_0_2000_dense" ~ "Playwright delay: key held down",
			run_id == "container_between_keys_0_2000_dense" ~ "Complete keypress, then wait",
			TRUE ~ run_label
		),
		mode_label = factor(
			mode_label,
			levels = c(
				"Playwright delay: key held down",
				"Complete keypress, then wait"
			)
		)
	)

save_plot(
	ggplot(container_dense_mode_comparison, aes(delay_ms, median_ms, color = mode_label)) +
		geom_point(size = 1.45, alpha = 0.88) +
		geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
		scale_color_brewer(type = "qual", palette = "Set1") +
		scale_x_continuous(breaks = c(seq(0, 2000, 250), 1000)) +
		labs(
			title = "Container-block delay-mode comparison",
			subtitle = "Typing inside the Columns fixture; both modes use the same 0-2000ms, 10ms-step sweep",
			x = "Configured delay",
			y = "p50 latency (ms)",
			color = NULL
		),
	"10b-container-delay-mode-comparison.png"
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
			geom_smooth(method = "loess", formula = y ~ x, se = FALSE, color = brewer_color("Greys", 9, type = "seq", n = 9), linewidth = 0.75) +
			scale_color_distiller(type = "seq", palette = "YlOrRd", direction = 1) +
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
			scale_fill_brewer(type = "qual", palette = "Set2") +
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
			geom_vline(xintercept = 0, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			geom_point(size = 2.5, alpha = 0.82) +
			scale_color_brewer(type = "qual", palette = "Set1") +
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
		ggplot(native_comparison, aes(delay_ms, duration_ms, color = mode_label)) +
			geom_point(size = 2.1) +
			facet_wrap(~ metric, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Set1") +
			labs(
				title = "The native contenteditable baseline does not reproduce Gutenberg's key-hold plateau",
				subtitle = "Both native modes include a 1000ms clear-and-reschedule input timer; the Gutenberg key-hold mode remains the outlier",
				x = "Configured delay",
				y = "Median EventDispatch duration (ms)",
				color = NULL
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

summarize_input_dispatches <- function(input_events, run_ids) {
	input_events %>%
		filter(run_id %in% run_ids, type == "input", (data == "x") | (inputType == "insertText")) %>%
		group_by(run_id, run_label, round, delayMs) %>%
		arrange(eventMs, .by_group = TRUE) %>%
		mutate(
			stopMs = eventMs + replace_na(durationMs, 0),
			previousStopMs = lag(cummax(stopMs), default = -Inf),
			dispatchIndex = cumsum(row_number() == 1 | eventMs > previousStopMs + 2)
		) %>%
		group_by(run_id, run_label, round, delayMs, dispatchIndex) %>%
		summarise(
			startMs = min(eventMs, na.rm = TRUE),
			stopMs = max(stopMs, na.rm = TRUE),
			duration_ms = stopMs - startMs,
			listener_count = n(),
			.groups = "drop_last"
		) %>%
		arrange(startMs, .by_group = TRUE) %>%
		mutate(sample_index = row_number(), is_throwaway = sample_index == 1) %>%
		ungroup()
}

summarize_dispatch_by_delay <- function(dispatches) {
	dispatches %>%
		filter(!is_throwaway) %>%
		group_by(delayMs) %>%
		summarise(
			n = n(),
			mean_ms = mean(duration_ms, na.rm = TRUE),
			median_ms = median(duration_ms, na.rm = TRUE),
			p10_ms = quant(duration_ms, 0.1),
			p90_ms = quant(duration_ms, 0.9),
			.groups = "drop"
		)
}

firefox_listener_run_ids <- c("firefox_boundary_listeners", "firefox_1000_narrow_listeners")

firefox_input_dispatches <- summarize_input_dispatches(listener_events, firefox_listener_run_ids)
firefox_input_by_delay <- summarize_dispatch_by_delay(firefox_input_dispatches)

firefox_input_by_delay_path <- file.path(data_dir, "typing-delay-firefox-input-by-delay.csv")
firefox_input_dispatches_path <- file.path(data_dir, "typing-delay-firefox-input-dispatches.csv")

if (nrow(firefox_input_dispatches) > 0) {
	write_csv(firefox_input_dispatches, firefox_input_dispatches_path)
}

if (nrow(firefox_input_by_delay) == 0 && file.exists(firefox_input_by_delay_path)) {
	firefox_input_by_delay <- read_csv(firefox_input_by_delay_path, show_col_types = FALSE)
}

if (nrow(firefox_input_by_delay) > 0) {
	write_csv(firefox_input_by_delay, firefox_input_by_delay_path)

	save_plot(
		ggplot(firefox_input_by_delay, aes(delayMs, median_ms)) +
			geom_linerange(aes(ymin = p10_ms, ymax = p90_ms), color = brewer_color("Blues", 5, type = "seq", n = 9), alpha = 0.75) +
			geom_point(color = brewer_color("Dark2", 1), size = 2.4) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			scale_x_continuous(breaks = sort(unique(firefox_input_by_delay$delayMs))) +
			labs(
				title = "Firefox also drops after the one-second boundary",
				subtitle = "Firefox cannot use Chromium EventDispatch tracing here, so this uses input-event listener dispatch spans; bars show p10-p90",
				x = "Configured Playwright key-hold delay",
				y = "Input-event listener dispatch span (ms)"
			),
		"17-firefox-input-listener-boundary.png",
		width = 10,
		height = 5.5
	)
}

webkit_listener_run_ids <- c("webkit_boundary_listeners", "webkit_1000_narrow_listeners")

webkit_input_dispatches <- summarize_input_dispatches(listener_events, webkit_listener_run_ids)
webkit_input_by_delay <- summarize_dispatch_by_delay(webkit_input_dispatches)
webkit_input_by_delay_path <- file.path(data_dir, "typing-delay-webkit-input-by-delay.csv")
webkit_input_dispatches_path <- file.path(data_dir, "typing-delay-webkit-input-dispatches.csv")

if (nrow(webkit_input_dispatches) > 0) {
	write_csv(webkit_input_dispatches, webkit_input_dispatches_path)
}

if (nrow(webkit_input_by_delay) == 0 && file.exists(webkit_input_by_delay_path)) {
	webkit_input_by_delay <- read_csv(webkit_input_by_delay_path, show_col_types = FALSE)
}

if (nrow(webkit_input_by_delay) > 0) {
	write_csv(webkit_input_by_delay, webkit_input_by_delay_path)

	save_plot(
		ggplot(webkit_input_by_delay, aes(delayMs, median_ms)) +
			geom_linerange(aes(ymin = p10_ms, ymax = p90_ms), color = brewer_color("Greens", 5, type = "seq", n = 9), alpha = 0.75) +
			geom_point(color = brewer_color("Dark2", 4), size = 2.4) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			scale_x_continuous(breaks = sort(unique(webkit_input_by_delay$delayMs))) +
			labs(
				title = "WebKit shows a smaller one-second boundary drop",
				subtitle = "Playwright WebKit/Safari-profile run; metric is input-event listener dispatch span\nBars show p10-p90",
				x = "Configured Playwright key-hold delay",
				y = "Input-event listener dispatch span (ms)"
			),
		"18-webkit-input-listener-boundary.png",
		width = 10,
		height = 5.5
	)
}

browser_timeline_run_ids <- c("chrome_browser_timeline", "firefox_browser_timeline", "webkit_browser_timeline")
browser_timeline_labels <- tribble(
	~run_id, ~browser_label, ~browser_order,
	"chrome_browser_timeline", "Chrome/Chromium", 1,
	"firefox_browser_timeline", "Firefox", 2,
	"webkit_browser_timeline", "WebKit/Safari profile", 3
)

browser_timeline_input_points <- derived$browser_events %>%
	filter(
		run_id %in% browser_timeline_run_ids,
		documentName == "editor-canvas",
		type == "input",
		(data == "x") | (inputType == "insertText")
	) %>%
	arrange(run_id, round, delayMs, eventMs) %>%
	group_by(run_id, round, delayMs) %>%
	mutate(
		input_index = row_number(),
		previous_input_ms = lag(eventMs),
		next_input_ms = lead(eventMs)
	) %>%
	ungroup() %>%
	transmute(
		run_id,
		round,
		delayMs,
		input_index,
		input_ms = eventMs,
		previous_input_ms,
		next_input_ms
	)

browser_timeline_keyups <- derived$browser_events %>%
	filter(
		run_id %in% browser_timeline_run_ids,
		documentName == "editor-canvas",
		type == "keyup",
		key == "x"
	) %>%
	transmute(run_id, round, delayMs, keyup_ms = eventMs)

browser_timeline_timers <- derived$timer_events %>%
	filter(
		run_id %in% browser_timeline_run_ids,
		requestedTimeoutMs == 1000,
		str_detect(stack, "block-editor")
	) %>%
	mutate(
		run_start_ms = scheduledAtMs - scheduledEventMs,
		clearedEventMs = clearedAtMs - run_start_ms,
		finishedEventMs = finishedAtMs - run_start_ms
	)

empty_browser_timeline_input_spans <- tibble(
	run_id = character(),
	round = integer(),
	delayMs = numeric(),
	input_index = integer(),
	input_span_ms = numeric()
)

browser_timeline_input_spans <- if (nrow(browser_timeline_input_points) == 0) {
	empty_browser_timeline_input_spans
} else {
	map_dfr(seq_len(nrow(browser_timeline_input_points)), function(row_index) {
		point <- browser_timeline_input_points[row_index, ]
		stop_ms <- if (is.na(point$next_input_ms)) Inf else point$next_input_ms - 5
		events <- derived$event_listener_events %>%
			filter(
				run_id == point$run_id,
				round == point$round,
				delayMs == point$delayMs,
				windowName == "editor-canvas",
				type == "input",
				(data == "x") | (inputType == "insertText"),
				eventMs >= point$input_ms - 5,
				eventMs < stop_ms
			)

		if (nrow(events) == 0) {
			return(tibble())
		}

		tibble(
			run_id = point$run_id,
			round = point$round,
			delayMs = point$delayMs,
			input_index = point$input_index,
			input_span_ms = max(events$eventMs + replace_na(events$durationMs, 0), na.rm = TRUE) -
				min(events$eventMs, na.rm = TRUE)
		)
	})
}

empty_browser_timeline_cycles <- tibble(
	run_id = character(),
	round = integer(),
	delayMs = numeric(),
	input_index = integer(),
	period_ms = numeric(),
	keyup_ms = numeric(),
	timer_scheduled_ms = numeric(),
	timer_eligible_ms = numeric(),
	timer_fired_ms = numeric(),
	timer_cleared_ms = numeric(),
	timer_finished_ms = numeric(),
	timer_fired_before_input = logical(),
	input_span_ms = numeric(),
	browser_label = character(),
	browser_order = numeric(),
	delay_label = factor(levels = c("1010ms", "1000ms", "990ms"))
)

browser_timeline_cycles <- if (nrow(browser_timeline_input_points) == 0) {
	empty_browser_timeline_cycles
} else {
	map_dfr(seq_len(nrow(browser_timeline_input_points)), function(row_index) {
		point <- browser_timeline_input_points[row_index, ]
		if (is.na(point$previous_input_ms) || point$input_index <= 2) {
			return(tibble())
		}

		timer <- browser_timeline_timers %>%
			filter(
				run_id == point$run_id,
				round == point$round,
				delayMs == point$delayMs,
				scheduledEventMs >= point$previous_input_ms - 5,
				scheduledEventMs < point$input_ms + 5
			) %>%
			arrange(scheduledEventMs) %>%
			slice(1)

		if (nrow(timer) == 0) {
			return(tibble())
		}

		keyup <- browser_timeline_keyups %>%
			filter(
				run_id == point$run_id,
				round == point$round,
				delayMs == point$delayMs,
				keyup_ms > point$previous_input_ms,
				keyup_ms < point$input_ms + 75
			) %>%
			arrange(desc(keyup_ms)) %>%
			slice(1)

		input_span <- browser_timeline_input_spans %>%
			filter(
				run_id == point$run_id,
				round == point$round,
				delayMs == point$delayMs,
				input_index == point$input_index
			) %>%
			slice(1)

		tibble(
			run_id = point$run_id,
			round = point$round,
			delayMs = point$delayMs,
			input_index = point$input_index,
			period_ms = point$input_ms - point$previous_input_ms,
			keyup_ms = if (nrow(keyup) == 0) NA_real_ else keyup$keyup_ms - point$previous_input_ms,
			timer_scheduled_ms = timer$scheduledEventMs - point$previous_input_ms,
			timer_eligible_ms = timer$scheduledEventMs - point$previous_input_ms + 1000,
			timer_fired_ms = timer$firedEventMs - point$previous_input_ms,
			timer_cleared_ms = timer$clearedEventMs - point$previous_input_ms,
			timer_finished_ms = timer$finishedEventMs - point$previous_input_ms,
			timer_fired_before_input = !is.na(timer$firedEventMs) && timer$firedEventMs < point$input_ms,
			input_span_ms = if (nrow(input_span) == 0) NA_real_ else input_span$input_span_ms
		)
	}) %>%
		left_join(browser_timeline_labels, by = "run_id") %>%
		mutate(delay_label = factor(paste0(delayMs, "ms"), levels = c("1010ms", "1000ms", "990ms")))
}

browser_timeline_cycles_path <- file.path(data_dir, "typing-delay-browser-timeline-cycles.csv")
browser_timeline_summary_path <- file.path(data_dir, "typing-delay-browser-timeline-summary.csv")

if (nrow(browser_timeline_cycles) > 0) {
	write_csv(browser_timeline_cycles, browser_timeline_cycles_path)
}

browser_timeline_summary <- browser_timeline_cycles %>%
	group_by(run_id, browser_label, browser_order, delayMs, delay_label) %>%
	summarise(
		n = n(),
		timer_fired_before_input_n = sum(timer_fired_before_input, na.rm = TRUE),
		period_p50_ms = median(period_ms, na.rm = TRUE),
		keyup_p50_ms = median(keyup_ms, na.rm = TRUE),
		timer_scheduled_p50_ms = median(timer_scheduled_ms, na.rm = TRUE),
		timer_eligible_p50_ms = median(timer_eligible_ms, na.rm = TRUE),
		timer_fired_p50_ms = if_else(
			timer_fired_before_input_n > n / 2,
			median(timer_fired_ms[timer_fired_before_input], na.rm = TRUE),
			NA_real_
		),
		timer_cleared_p50_ms = median(timer_cleared_ms, na.rm = TRUE),
		input_span_p50_ms = median(input_span_ms, na.rm = TRUE),
		.groups = "drop"
	) %>%
	mutate(
		timer_result = if_else(
			timer_fired_before_input_n > n / 2,
			"timer callback ran before measured input",
			"timer was cleared by measured input"
		),
		timer_result_x_ms = if_else(
			timer_result == "timer callback ran before measured input",
			timer_fired_p50_ms,
			timer_cleared_p50_ms
		),
		input_span_label = paste0(
			"span p50 ",
			number(input_span_p50_ms, accuracy = 0.1),
			"ms; fired ",
			timer_fired_before_input_n,
			"/",
			n
		)
	)

if (nrow(browser_timeline_summary) == 0 && file.exists(browser_timeline_summary_path)) {
	browser_timeline_summary <- read_csv(browser_timeline_summary_path, show_col_types = FALSE) %>%
		mutate(
			delay_label = factor(delay_label, levels = c("1010ms", "1000ms", "990ms")),
			browser_label = factor(browser_label, levels = browser_timeline_labels$browser_label)
		)
}

if (nrow(browser_timeline_summary) > 0) {
	write_csv(browser_timeline_summary, browser_timeline_summary_path)

	browser_timeline_plot_data <- browser_timeline_summary %>%
		mutate(browser_label = factor(browser_label, levels = browser_timeline_labels$browser_label))

	save_plot(
		ggplot(browser_timeline_plot_data, aes(y = delay_label)) +
			geom_segment(
				aes(x = 0, xend = keyup_p50_ms, yend = delay_label),
				color = brewer_color("Greys", 5, type = "seq", n = 9),
				linewidth = 5,
				alpha = 0.35
			) +
			geom_segment(
				aes(x = timer_scheduled_p50_ms, xend = timer_eligible_p50_ms, yend = delay_label),
				color = brewer_color("Blues", 6, type = "seq", n = 9),
				linewidth = 1.3,
				alpha = 0.8
			) +
			geom_point(aes(x = timer_scheduled_p50_ms, shape = "timer scheduled"), color = brewer_color("Blues", 7, type = "seq", n = 9), size = 2.6) +
			geom_point(aes(x = timer_eligible_p50_ms, shape = "timer reaches 1000ms"), color = brewer_color("Blues", 9, type = "seq", n = 9), size = 4) +
			geom_point(aes(x = timer_result_x_ms, shape = timer_result, color = timer_result), size = 3.1) +
			geom_point(aes(x = period_p50_ms, shape = "next measured input starts"), color = brewer_color("Dark2", 4), size = 3) +
			geom_segment(
				aes(x = period_p50_ms, xend = period_p50_ms + input_span_p50_ms, yend = delay_label),
				color = brewer_color("Dark2", 4),
				linewidth = 4,
				alpha = 0.65
			) +
			geom_text(
				aes(x = 1135, label = input_span_label),
				hjust = 0,
				size = 2.8,
				color = brewer_color("Greys", 8, type = "seq", n = 9)
			) +
			facet_wrap(vars(browser_label), ncol = 1) +
			scale_x_continuous(
				limits = c(0, 1340),
				breaks = c(0, 500, 1000, 1100, 1200, 1300),
				labels = label_number(suffix = "ms")
			) +
			scale_color_manual(values = c(
				`timer callback ran before measured input` = brewer_color("Greens", 6, type = "seq", n = 9),
				`timer was cleared by measured input` = brewer_color("Set1", 1)
			)) +
			scale_shape_manual(values = c(
				`timer scheduled` = 22,
				`timer reaches 1000ms` = 124,
				`timer callback ran before measured input` = 16,
				`timer was cleared by measured input` = 4,
				`next measured input starts` = 23
			)) +
			labs(
				title = "The same 1000ms timer ordering shows up in each browser engine",
				subtitle = "Square: timer scheduled; blue tick: timer eligible; green dot: timer fired; red x: timer cleared; diamond and purple bar: next measured input",
				x = "Milliseconds after previous input starts",
				y = "Configured key-hold delay",
				color = NULL,
				shape = NULL
			) +
			theme(
				legend.position = "none",
				strip.text = element_text(face = "bold"),
				plot.margin = margin(5.5, 140, 5.5, 5.5)
			) +
			coord_cartesian(clip = "off"),
		"19-browser-timer-event-ordering.png",
		width = 12,
		height = 8.2
	)
}

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
			geom_point(size = 2.2) +
			facet_wrap(~ mode_label, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Set1") +
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
			geom_point(size = 2.2) +
			facet_wrap(~ mode_label, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Set1") +
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
			geom_point(size = 1.9) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_brewer(type = "qual", palette = "Set1") +
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
			scale_fill_brewer(type = "qual", palette = "Set2") +
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

data_span_run_ids <- c(
	"data_spans_large_keyhold",
	"data_spans_large_between_keys",
	"data_spans_empty_keyhold",
	"data_spans_empty_between_keys"
)

assign_input_batches <- function(events, roots) {
	if (nrow(events) == 0 || nrow(roots) == 0) {
		return(tibble())
	}

	keys <- events %>% distinct(run_id, round, delayMs)
	map_dfr(
		seq_len(nrow(keys)),
		function(key_index) {
			key <- keys[key_index, ]
			group_events <- events %>%
				filter(
					run_id == key$run_id,
					round == key$round,
					delayMs == key$delayMs
				) %>%
				arrange(startedAtMs)
			group_roots <- roots %>%
				filter(
					run_id == key$run_id,
					round == key$round,
					delayMs == key$delayMs
				) %>%
				arrange(batch_start)

			if (nrow(group_events) == 0 || nrow(group_roots) == 0) {
				return(tibble())
			}

			root_index <- findInterval(group_events$startedAtMs, group_roots$batch_start)
			matched <- root_index > 0 &
				group_events$startedAtMs <= group_roots$batch_end[root_index] + 0.001

			if (!any(matched)) {
				return(tibble())
			}

			group_events[matched, ] %>%
				mutate(
					input_batch_index = group_roots$input_batch_index[root_index[matched]],
					batch_start = group_roots$batch_start[root_index[matched]],
					batch_end = group_roots$batch_end[root_index[matched]]
				)
		}
	)
}

data_spans <- if (nrow(derived$data_span_events) > 0) {
	derived$data_span_events %>%
		filter(run_id %in% data_span_run_ids) %>%
		mutate(
			mode_label = recode(
				run_id,
				data_spans_large_keyhold = "Playwright delay: key held down",
				data_spans_large_between_keys = "Complete keypress, then wait",
				data_spans_empty_keyhold = "Playwright delay: key held down",
				data_spans_empty_between_keys = "Complete keypress, then wait",
				.default = run_label
			),
			span_scenario_label = recode(
				run_id,
				data_spans_large_keyhold = "large post",
				data_spans_large_between_keys = "large post",
				data_spans_empty_keyhold = "empty post",
				data_spans_empty_between_keys = "empty post",
				.default = NA_character_
			)
		)
} else {
	tibble()
}

if (nrow(data_spans) > 0) {
	data_span_summary <- data_spans %>%
		mutate(
			emitter_kind = `metadata.emitterKind` %||% NA_character_,
			store_name = `metadata.storeName` %||% NA_character_,
			listener_type = `metadata.listenerType` %||% NA_character_
		) %>%
		group_by(
			run_id, mode_label, span_scenario_label, delayMs,
			name, emitter_kind, store_name, listener_type
		) %>%
		summarise(
			n = n(),
			total_ms = sum(durationMs, na.rm = TRUE),
			median_ms = median(durationMs, na.rm = TRUE),
			p90_ms = quant(durationMs, 0.9),
			.groups = "drop"
		)
	write_csv(data_span_summary, file.path(data_dir, "typing-delay-data-span-summary.csv"))

	data_rich_batches <- derived$rich_text_span_events %>%
		filter(
			run_id %in% data_span_run_ids,
			name == "rich-text.handleChange.registryBatch"
		) %>%
		group_by(run_id, round, delayMs) %>%
		arrange(startedAtMs, .by_group = TRUE) %>%
		mutate(
			input_batch_index = row_number(),
			rich_batch_start = startedAtMs,
			rich_batch_end = startedAtMs + durationMs
		) %>%
		ungroup() %>%
		select(run_id, round, delayMs, input_batch_index, rich_batch_start, rich_batch_end)

	data_batch_roots <- data_spans %>%
		filter(name == "data.registry.batch.total") %>%
		transmute(
			run_id, mode_label, span_scenario_label, round, delayMs,
			data_batch_start = startedAtMs,
			data_batch_end = startedAtMs + durationMs,
			data_batch_duration_ms = durationMs
		)

	input_data_batch_roots <- data_batch_roots %>%
		inner_join(
			data_rich_batches,
			by = c("run_id", "round", "delayMs"),
			relationship = "many-to-many"
		) %>%
		filter(
			data_batch_start >= rich_batch_start - 0.05,
			data_batch_start <= rich_batch_end + 0.05
		) %>%
		mutate(start_delta_ms = abs(data_batch_start - rich_batch_start)) %>%
		group_by(run_id, round, delayMs, input_batch_index) %>%
		slice_min(start_delta_ms, n = 1, with_ties = FALSE) %>%
		ungroup() %>%
		transmute(
			run_id, mode_label, span_scenario_label, round, delayMs, input_batch_index,
			batch_start = data_batch_start,
			batch_end = data_batch_end
		)

	input_data_spans <- assign_input_batches(data_spans, input_data_batch_roots)

	data_batch_parts <- input_data_spans %>%
		mutate(
			store_name = `metadata.storeName` %||% NA_character_,
			emitter_kind = `metadata.emitterKind` %||% NA_character_,
			listener_type = `metadata.listenerType` %||% NA_character_,
			component = case_when(
				name == "data.registry.batch.total" ~ "registry.batch total",
				name == "data.registry.batch.callback" ~ "batch callback",
				name == "data.registry.batch.resumeStore" & store_name == "core/block-editor" ~ "resume core/block-editor",
				name == "data.emitter.notifyListeners" & emitter_kind == "store" & store_name == "core/block-editor" ~ "notify core/block-editor",
				name == "data.emitter.listener" & emitter_kind == "store" & store_name == "core/block-editor" & listener_type == "store subscriber" ~ "core/block-editor subscribers",
				name == "data.useSelect.onChange" ~ "useSelect onChange",
				name == "data.useSelect.renderQueueAdd" ~ "renderQueue.add",
				name == "data.useSelect.onStoreChange" ~ "useSelect onStoreChange",
				name == "data.useSelect.reactListener" ~ "React external-store listener",
				name == "data.useSelect.updateValue" ~ "useSelect updateValue",
				name == "data.useSelect.mapSelect" ~ "useSelect mapSelect",
				TRUE ~ NA_character_
			)
		) %>%
		filter(!is.na(component)) %>%
		group_by(
			run_id, mode_label, span_scenario_label, round, delayMs,
			input_batch_index, component
		) %>%
		summarise(duration_ms = sum(durationMs, na.rm = TRUE), .groups = "drop")

	data_batch_summary <- data_batch_parts %>%
		group_by(run_id, mode_label, span_scenario_label, delayMs, component) %>%
		summarise(
			n = n(),
			median_ms = median(duration_ms, na.rm = TRUE),
			p90_ms = quant(duration_ms, 0.9),
			.groups = "drop"
		)

	data_store_resume_summary <- input_data_spans %>%
		filter(name == "data.registry.batch.resumeStore") %>%
		mutate(store_name = `metadata.storeName` %||% NA_character_) %>%
		group_by(run_id, mode_label, span_scenario_label, delayMs, store_name) %>%
		summarise(
			n = n(),
			median_ms = median(durationMs, na.rm = TRUE),
			p90_ms = quant(durationMs, 0.9),
			.groups = "drop"
		)

	write_csv(data_batch_parts, file.path(data_dir, "typing-delay-data-batch-parts.csv"))
	write_csv(data_batch_summary, file.path(data_dir, "typing-delay-data-batch-summary.csv"))
	write_csv(data_store_resume_summary, file.path(data_dir, "typing-delay-data-store-resume-summary.csv"))

	data_batch_plot <- data_batch_summary %>%
		filter(
			component %in% c(
				"registry.batch total",
				"batch callback",
				"resume core/block-editor",
				"core/block-editor subscribers",
				"useSelect onChange",
				"useSelect mapSelect"
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
			component = factor(
				component,
				levels = c(
					"registry.batch total",
					"batch callback",
					"resume core/block-editor",
					"core/block-editor subscribers",
					"useSelect onChange",
					"useSelect mapSelect"
				)
			)
		)

	save_plot(
		ggplot(data_batch_plot, aes(delayMs, median_ms, color = component)) +
			geom_point(size = 1.9) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "Data spans put the batch remainder in core/block-editor subscriber fanout",
				subtitle = "Input-matched registry.batch calls; nested points are attribution aids, not additive totals",
				x = "Configured delay",
				y = "Median duration per input batch (ms)",
				color = "Span"
			),
		"19-data-batch-use-select-breakdown.png",
		width = 12,
		height = 8
	)

	top_resume_stores <- data_store_resume_summary %>%
		group_by(store_name) %>%
		summarise(max_median_ms = max(median_ms, na.rm = TRUE), .groups = "drop") %>%
		slice_max(max_median_ms, n = 6, with_ties = FALSE) %>%
		pull(store_name)

	store_resume_plot <- data_store_resume_summary %>%
		filter(store_name %in% top_resume_stores) %>%
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
		)

	save_plot(
		ggplot(store_resume_plot, aes(delayMs, median_ms, color = store_name)) +
			geom_point(size = 1.8) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "core/block-editor is the expensive store resume",
				subtitle = "Other store emitter resumes are small in the input-matched data spans",
				x = "Configured delay",
				y = "Median store resume duration per input batch (ms)",
				color = "Store"
			),
		"20-data-store-resume-breakdown.png",
		width = 12,
		height = 8
	)
}

if (
	nrow(data_spans) == 0 &&
	file.exists(file.path(data_dir, "typing-delay-data-batch-summary.csv")) &&
	file.exists(file.path(data_dir, "typing-delay-data-store-resume-summary.csv"))
) {
	data_batch_summary <- read_csv(
		file.path(data_dir, "typing-delay-data-batch-summary.csv"),
		show_col_types = FALSE
	)
	data_store_resume_summary <- read_csv(
		file.path(data_dir, "typing-delay-data-store-resume-summary.csv"),
		show_col_types = FALSE
	)

	data_batch_plot <- data_batch_summary %>%
		filter(
			component %in% c(
				"registry.batch total",
				"batch callback",
				"resume core/block-editor",
				"core/block-editor subscribers",
				"useSelect onChange",
				"useSelect mapSelect"
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
			component = factor(
				component,
				levels = c(
					"registry.batch total",
					"batch callback",
					"resume core/block-editor",
					"core/block-editor subscribers",
					"useSelect onChange",
					"useSelect mapSelect"
				)
			)
		)

	save_plot(
		ggplot(data_batch_plot, aes(delayMs, median_ms, color = component)) +
			geom_point(size = 1.9) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "Data spans put the batch remainder in core/block-editor subscriber fanout",
				subtitle = "Input-matched registry.batch calls; nested points are attribution aids, not additive totals",
				x = "Configured delay",
				y = "Median duration per input batch (ms)",
				color = "Span"
			),
		"19-data-batch-use-select-breakdown.png",
		width = 12,
		height = 8
	)

	top_resume_stores <- data_store_resume_summary %>%
		group_by(store_name) %>%
		summarise(max_median_ms = max(median_ms, na.rm = TRUE), .groups = "drop") %>%
		slice_max(max_median_ms, n = 6, with_ties = FALSE) %>%
		pull(store_name)

	store_resume_plot <- data_store_resume_summary %>%
		filter(store_name %in% top_resume_stores) %>%
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
		)

	save_plot(
		ggplot(store_resume_plot, aes(delayMs, median_ms, color = store_name)) +
			geom_point(size = 1.8) +
			facet_grid(span_scenario_label ~ mode_label) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "core/block-editor is the expensive store resume",
				subtitle = "Other store emitter resumes are small in the input-matched data spans",
				x = "Configured delay",
				y = "Median store resume duration per input batch (ms)",
				color = "Store"
			),
		"20-data-store-resume-breakdown.png",
		width = 12,
		height = 8
	)
}

use_select_owner_summary_path <- file.path(data_dir, "typing-delay-use-select-owner-summary.csv")
if (file.exists(use_select_owner_summary_path)) {
	use_select_owner_summary <- read_csv(use_select_owner_summary_path, show_col_types = FALSE) %>%
		mutate(
			owner_label = if_else(
				!is.na(source_path) & source_path != "",
				paste0(str_remove(source_path, "^packages/"), ":", source_line),
				owner_frame
			)
		)

	owner_1300 <- use_select_owner_summary %>%
		filter(span_name == "data.useSelect.onChange", delay_ms == 1300) %>%
		group_by(owner_label) %>%
		mutate(owner_peak_ms_per_key = max(ms_per_key, na.rm = TRUE)) %>%
		ungroup()

	top_owner_levels <- owner_1300 %>%
		distinct(owner_label, owner_peak_ms_per_key) %>%
		slice_max(owner_peak_ms_per_key, n = 10, with_ties = FALSE) %>%
		arrange(owner_peak_ms_per_key) %>%
		pull(owner_label)

	save_plot(
		ggplot(
			owner_1300 %>%
				filter(owner_label %in% top_owner_levels) %>%
				mutate(owner_label = factor(owner_label, levels = top_owner_levels)),
			aes(ms_per_key, owner_label, fill = mode_label)
		) +
			geom_col(position = position_dodge(width = 0.72), width = 0.65) +
			scale_fill_brewer(type = "qual", palette = "Set1") +
			labs(
				title = "useSelect fanout is concentrated in repeated block editor subscriptions",
				subtitle = "Source-mapped owner groups for data.useSelect.onChange at 1300ms; values are total traced time per key",
				x = "Total traced time per typed key (ms)",
				y = NULL,
				fill = NULL
			),
		"21-use-select-owner-fanout-1300.png",
		width = 12,
		height = 7
	)

	top_profile_levels <- use_select_owner_summary %>%
		filter(span_name == "data.useSelect.onChange") %>%
		group_by(owner_label) %>%
		summarise(max_ms_per_key = max(ms_per_key, na.rm = TRUE), .groups = "drop") %>%
		slice_max(max_ms_per_key, n = 6, with_ties = FALSE) %>%
		arrange(max_ms_per_key) %>%
		pull(owner_label)

	save_plot(
		ggplot(
			use_select_owner_summary %>%
				filter(
					span_name == "data.useSelect.onChange",
					owner_label %in% top_profile_levels
				) %>%
				mutate(owner_label = factor(owner_label, levels = top_profile_levels)),
			aes(delay_ms, ms_per_key, color = owner_label)
		) +
			geom_point(size = 2.1, alpha = 0.88) +
			facet_wrap(~mode_label, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_x_continuous(
				breaks = sort(unique(use_select_owner_summary$delay_ms)),
				guide = guide_axis(angle = 45)
			) +
			labs(
				title = "The same high-fanout useSelect owners dominate across diagnostic delays",
				subtitle = "No single owner uniquely explains the key-hold plateau; the cost is broad subscriber fanout",
				x = "Configured delay",
				y = "Total traced time per typed key (ms)",
				color = "Owner"
			),
		"22-use-select-owner-delay-profile.png",
		width = 12,
		height = 8
	)
}

causality_samples_path <- file.path(data_dir, "typing-delay-causality-samples.csv")
causality_span_summary_path <- file.path(data_dir, "typing-delay-causality-span-summary.csv")
if (file.exists(causality_samples_path) && file.exists(causality_span_summary_path)) {
	causality_case_levels <- c(
		"Playwright key-hold burst",
		"Held 1300ms, natural keyup gap",
		"Held 1300ms, 1000ms keyup gap",
		"Held 990ms, 310ms keyup gap",
		"Complete keypress, then wait"
	)
	causality_case_short_levels <- c(
		"key-hold burst",
		"held 1300 + 40ms keyup gap",
		"held 1300 + 1000ms keyup gap",
		"held 990 + 310ms keyup gap",
		"complete keypress + wait"
	)

	causality_samples <- read_csv(causality_samples_path, show_col_types = FALSE) %>%
		filter(!is.na(mark_during_previous_key_hold)) %>%
		mutate(
			case_label = factor(case_label, levels = causality_case_levels),
			case_short = factor(
				recode(
					as.character(case_label),
					`Playwright key-hold burst` = "key-hold burst",
					`Held 1300ms, natural keyup gap` = "held 1300 + 40ms keyup gap",
					`Held 1300ms, 1000ms keyup gap` = "held 1300 + 1000ms keyup gap",
					`Held 990ms, 310ms keyup gap` = "held 990 + 310ms keyup gap",
					`Complete keypress, then wait` = "complete keypress + wait"
				),
				levels = causality_case_short_levels
			),
			mark_state = if_else(
				mark_during_previous_key_hold,
				"Persistence fired before previous keyup",
				"Persistence fired after previous keyup"
			)
		)

	save_plot(
		ggplot(
			causality_samples,
			aes(
				previous_keyup_to_current_keydown_ms,
				keypress_ms,
				color = case_short,
				shape = mark_state
			)
		) +
			geom_point(size = 2.7, alpha = 0.86) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_shape_manual(values = c(16, 17)) +
			scale_x_continuous(breaks = c(0, 40, 300, 1000, 1400)) +
			labs(
				title = "The slow burst needs the next key almost immediately after keyup",
				subtitle = "Diagnostic 1300ms-ish traces; natural manual Playwright calls add about 40ms after keyup and lose the slow path",
				x = "Previous keyup to current keydown (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = "Case",
				shape = NULL
			) +
			theme(legend.position = "right"),
		"23-keyup-gap-causality.png",
		width = 13,
		height = 7
	)

	causality_span_summary <- read_csv(causality_span_summary_path, show_col_types = FALSE) %>%
		mutate(
			case_label = factor(case_label, levels = causality_case_levels),
			case_short = factor(
				recode(
					as.character(case_label),
					`Playwright key-hold burst` = "key-hold burst",
					`Held 1300ms, natural keyup gap` = "held 1300 + 40ms keyup gap",
					`Held 1300ms, 1000ms keyup gap` = "held 1300 + 1000ms keyup gap",
					`Held 990ms, 310ms keyup gap` = "held 990 + 310ms keyup gap",
					`Complete keypress, then wait` = "complete keypress + wait"
				),
				levels = causality_case_short_levels
			),
			component_label = recode(
				component,
				`rich-text.handleChange.registryBatch` = "RichText registry.batch",
				`data.registry.batch.total` = "Data registry.batch total",
				`data.registry.batch.resumeStore core/block-editor` = "Resume core/block-editor",
				`data.useSelect.onChange` = "useSelect onChange",
				.default = component
			),
			component_label = factor(
				component_label,
				levels = c(
					"RichText registry.batch",
					"Data registry.batch total",
					"Resume core/block-editor",
					"useSelect onChange"
				)
			)
		) %>%
		filter(!is.na(component_label))

	save_plot(
		ggplot(
			causality_span_summary,
			aes(component_label, median_ms, fill = case_short)
		) +
			geom_col(position = position_dodge(width = 0.76), width = 0.68) +
			scale_fill_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "The extra burst cost is the same RichText/data fanout path",
				subtitle = "Trace-heavy medians; data spans are nested attribution aids and are not additive",
				x = NULL,
				y = "Median duration (ms)",
				fill = "Case"
			),
		"24-keyup-gap-data-path.png",
		width = 12,
		height = 7
	)
}

input_path_summary_path <- file.path(data_dir, "typing-delay-input-path-summary.csv")
if (file.exists(input_path_summary_path)) {
	input_path_summary <- read_csv(input_path_summary_path, show_col_types = FALSE) %>%
		mutate(
			input_path = factor(
				input_path,
				levels = c(
					"Playwright keyboard.type key-hold burst",
					"Playwright keyboard.press per key",
					"Playwright keyboard.type one char per call",
					"Playwright keyboard.down/up per key",
					"Raw CDP plus page.evaluate per key",
					"Raw CDP plus Runtime.evaluate per key",
					"Raw CDP Input.dispatchKeyEvent"
				)
			),
			point_label = if_else(
				input_path == "Raw CDP Input.dispatchKeyEvent",
				paste0("CDP +", requested_post_keyup_gap_ms, "ms"),
				recode(
					as.character(input_path),
					`Playwright keyboard.type key-hold burst` = "keyboard.type",
					`Playwright keyboard.press per key` = "keyboard.press",
					`Playwright keyboard.type one char per call` = "type one char",
					`Playwright keyboard.down/up per key` = "down/up",
					`Raw CDP plus page.evaluate per key` = "CDP + page.evaluate",
					`Raw CDP plus Runtime.evaluate per key` = "CDP + Runtime.evaluate"
				)
			),
			label_x = case_when(
				point_label == "CDP + page.evaluate" ~ actual_post_keyup_gap_p50_ms * 0.72,
				point_label == "type one char" ~ actual_post_keyup_gap_p50_ms * 1.22,
				point_label == "down/up" ~ actual_post_keyup_gap_p50_ms * 0.82,
				point_label == "CDP +10ms" ~ actual_post_keyup_gap_p50_ms * 0.9,
				point_label == "CDP +16ms" ~ actual_post_keyup_gap_p50_ms * 1.12,
				TRUE ~ actual_post_keyup_gap_p50_ms
			),
			label_y = case_when(
				point_label == "CDP + page.evaluate" ~ keypress_p50_ms + 1.35,
				point_label == "type one char" ~ keypress_p50_ms + 0.95,
				point_label == "down/up" ~ keypress_p50_ms + 0.55,
				TRUE ~ keypress_p50_ms + 0.8
			)
		)

	save_plot(
		ggplot(
			input_path_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = input_path,
				shape = input_path
			)
		) +
			geom_point(size = 3.1, alpha = 0.9) +
			geom_text(
				aes(label_x, label_y, label = point_label),
				check_overlap = FALSE,
				size = 3.2,
				show.legend = FALSE
			) +
			scale_x_log10(breaks = c(2, 3, 10, 30, 100, 300, 1000)) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_shape_manual(values = c(
				`Playwright keyboard.type key-hold burst` = 16,
				`Playwright keyboard.press per key` = 17,
				`Playwright keyboard.type one char per call` = 15,
				`Playwright keyboard.down/up per key` = 3,
				`Raw CDP plus page.evaluate per key` = 8,
				`Raw CDP plus Runtime.evaluate per key` = 4,
				`Raw CDP Input.dispatchKeyEvent` = 7
			)) +
			labs(
				title = "Per-key Playwright calls avoid the slow hold path",
				subtitle = "1300ms key hold traces; DOM event payload and elapsed post-keyup gap do not explain the split",
				x = "Observed previous keyup to next keydown, p50 (ms, log scale)",
				y = "keypress EventDispatch duration, p50 (ms)",
				color = "Input path",
				shape = "Input path"
			) +
			theme(legend.position = "none"),
		"25-input-path-post-keyup-gap.png",
		width = 12,
		height = 7
	)
}

marker_summary_path <- file.path(data_dir, "typing-delay-marker-intervention-summary.csv")
marker_samples_path <- file.path(data_dir, "typing-delay-marker-intervention-samples.csv")
marker_paired_summary_path <- file.path(data_dir, "typing-delay-marker-paired-summary.csv")
marker_intervention_levels <- c(
	"normal marker",
	"marker no-op",
	"mark next not persistent",
	"mark last, then force next transient",
	"busy wait 20ms",
	"busy wait 40ms",
	"toggle selection",
	"toggle template validity",
	"toggle block highlight",
	"stop typing",
	"start typing",
	"stop/start typing"
)
if (file.exists(marker_summary_path) && file.exists(marker_samples_path)) {
	marker_summary <- read_csv(marker_summary_path, show_col_types = FALSE) %>%
		filter(trace_type == "targeted") %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_intervention_levels
			)
		)
	marker_samples <- read_csv(marker_samples_path, show_col_types = FALSE) %>%
		filter(trace_type == "targeted") %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_intervention_levels
			)
		)

	save_plot(
		ggplot(marker_summary, aes(delay_ms, latency_p50_ms, color = intervention)) +
			geom_point(
				data = marker_samples,
				aes(delay_ms, latency_ms, color = intervention),
				position = position_jitter(width = 2.2, height = 0, seed = 51383),
				alpha = 0.22,
				size = 1.7,
				inherit.aes = FALSE
			) +
			geom_pointrange(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				position = position_dodge(width = 3.5),
				size = 0.8
			) +
			scale_color_brewer(type = "qual", palette = "Paired") +
			scale_x_continuous(breaks = c(990, 1000, 1010, 1300)) +
			labs(
				title = "Timer-side subscriber work reproduces the 1000ms low band",
				subtitle = "Points are retained samples; ranges are p10-p90 with p50 markers",
				x = "Playwright key-hold delay (ms)",
				y = "keydown + keypress + keyup EventDispatch duration (ms)",
				color = "Timer callback"
			),
		"26-marker-noop-intervention.png",
		width = 11,
		height = 7
	)

	marker_component_interventions <- c(
		"normal marker",
		"marker no-op",
		"mark next not persistent",
		"busy wait 40ms",
		"toggle selection",
		"start typing",
		"stop typing",
		"stop/start typing"
	)
	marker_event_components <- marker_samples %>%
		filter(delay_ms == 1000, intervention %in% marker_component_interventions) %>%
		group_by(intervention) %>%
		summarise(
			n = n(),
			latency_p50_ms = median(latency_ms, na.rm = TRUE),
			keydown_p50_ms = median(keydown_ms, na.rm = TRUE),
			keypress_p50_ms = median(keypress_ms, na.rm = TRUE),
			keyup_p50_ms = median(keyup_ms, na.rm = TRUE),
			.groups = "drop"
		) %>%
		mutate(intervention = factor(intervention, levels = marker_component_interventions))

	write_csv(
		marker_event_components,
		file.path(data_dir, "typing-delay-marker-event-component-summary.csv")
	)

	marker_event_components_plot <- marker_event_components %>%
		select(intervention, keydown_p50_ms, keypress_p50_ms, keyup_p50_ms) %>%
		pivot_longer(
			cols = -intervention,
			names_to = "component",
			values_to = "duration_ms"
		) %>%
		mutate(
			component = recode(
				component,
				keydown_p50_ms = "keydown",
				keypress_p50_ms = "keypress",
				keyup_p50_ms = "keyup"
			),
			component = factor(component, levels = c("keydown", "keypress", "keyup"))
		)

	save_plot(
		ggplot(marker_event_components_plot, aes(component, duration_ms, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15,
				`busy wait 40ms` = 3,
				`toggle selection` = 8,
				`start typing` = 4,
				`stop typing` = 18,
				`stop/start typing` = 7
			), drop = FALSE) +
			labs(
				title = "The marker-intervention gap is keypress listener time",
				subtitle = "Targeted 1000ms runs; points are p50 EventDispatch components across retained samples",
				x = "Measured key event",
				y = "Duration, p50 (ms)",
				color = "Timer callback",
				shape = "Timer callback"
			),
		"26b-marker-event-component-split.png",
		width = 11,
		height = 7
	)

	if (file.exists(marker_paired_summary_path)) {
		marker_cost <- read_csv(marker_paired_summary_path, show_col_types = FALSE) %>%
			filter(trace_type == "targeted") %>%
			mutate(
				intervention = factor(
					intervention,
					levels = marker_intervention_levels
				)
			) %>%
			select(intervention, delay_ms, latency_p50_ms, marker_action_duration_p50_ms, marker_inclusive_latency_p50_ms) %>%
			pivot_longer(
				cols = c(latency_p50_ms, marker_action_duration_p50_ms, marker_inclusive_latency_p50_ms),
				names_to = "metric",
				values_to = "duration_ms"
			) %>%
			mutate(
				metric = recode(
					metric,
					latency_p50_ms = "measured next input",
					marker_action_duration_p50_ms = "paired timer callback",
					marker_inclusive_latency_p50_ms = "timer-inclusive input"
				),
				metric = factor(
					metric,
					levels = c("measured next input", "paired timer callback", "timer-inclusive input")
				)
			)

		save_plot(
			ggplot(marker_cost, aes(delay_ms, duration_ms, color = intervention, shape = metric)) +
				geom_point(
					position = position_dodge(width = 3.5),
					size = 3.2,
					alpha = 0.9
				) +
				scale_color_brewer(type = "qual", palette = "Paired") +
				scale_shape_manual(values = c(
					`measured next input` = 16,
					`paired timer callback` = 17,
					`timer-inclusive input` = 15
				)) +
				scale_x_continuous(breaks = c(990, 1000, 1010, 1300)) +
				labs(
					title = "The low band omits timer-side callback work",
					subtitle = "Paired per-sample metric: next EventDispatch plus timer callback work before that keydown",
					x = "Playwright key-hold delay (ms)",
					y = "Duration (ms)",
					color = "Timer callback",
					shape = "Metric"
				),
			"28-marker-action-cost.png",
			width = 11,
			height = 7
		)
	}
}

marker_listener_probe_summary_path <- file.path(data_dir, "typing-delay-marker-listener-probe-summary.csv")
marker_input_listener_summary_path <- file.path(data_dir, "typing-delay-marker-input-listener-summary.csv")
if (file.exists(marker_listener_probe_summary_path)) {
	marker_listener_probe_levels <- c(
		"normal marker",
		"marker no-op",
		"toggle selection",
		"stop/start typing"
	)
	marker_listener_probe <- read_csv(marker_listener_probe_summary_path, show_col_types = FALSE) %>%
		mutate(
			intervention = factor(intervention, levels = marker_listener_probe_levels),
			event_type = factor(event_type, levels = c("keydown", "keypress", "beforeinput", "input", "keyup"))
		)

	save_plot(
		ggplot(marker_listener_probe, aes(event_type, listener_duration_p50_ms, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`toggle selection` = 8,
				`stop/start typing` = 7
			), drop = FALSE) +
			labs(
				title = "The keypress-latency gap is input listener work",
				subtitle = "Same-configuration 1000ms listener probe; points are p50 callback duration by actual DOM event type",
				x = "Actual DOM event listener",
				y = "Listener callback duration, p50 (ms)",
				color = "Timer callback",
				shape = "Timer callback"
			),
		"26c-marker-listener-event-type-probe.png",
		width = 11,
		height = 7
	)

	if (file.exists(marker_input_listener_summary_path)) {
		marker_input_listener <- read_csv(marker_input_listener_summary_path, show_col_types = FALSE) %>%
			filter(intervention %in% marker_listener_probe_levels) %>%
			group_by(listener_label) %>%
			filter(max(duration_p50_ms, na.rm = TRUE) > 0.05) %>%
			ungroup() %>%
			mutate(
				intervention = factor(intervention, levels = marker_listener_probe_levels),
				listener_label = fct_reorder(listener_label, duration_p50_ms, .fun = max)
			)

		save_plot(
			ggplot(marker_input_listener, aes(duration_p50_ms, listener_label, color = intervention, shape = intervention)) +
				geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.45)) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`normal marker` = 16,
					`marker no-op` = 17,
					`toggle selection` = 8,
					`stop/start typing` = 7
				), drop = FALSE) +
				labs(
					title = "One RichText input listener dominates the listener probe",
					subtitle = "Same-configuration 1000ms listener probe; p50 input listener duration by source label",
					x = "Input listener duration, p50 (ms)",
					y = NULL,
					color = "Timer callback",
					shape = "Timer callback"
				),
			"26d-marker-input-listener-probe.png",
			width = 11,
			height = 6.5
		)
	}
}

marker_path_summary_path <- file.path(data_dir, "typing-delay-marker-input-path-summary.csv")
if (file.exists(marker_path_summary_path)) {
	marker_intervention_levels <- c(
		"normal marker",
		"marker no-op",
		"mark next not persistent",
		"mark last, then force next transient",
		"busy wait 20ms",
		"busy wait 40ms",
		"toggle selection",
		"toggle template validity",
		"toggle block highlight",
		"stop typing",
		"start typing",
		"stop/start typing"
	)
	marker_path_summary <- read_csv(marker_path_summary_path, show_col_types = FALSE) %>%
		filter(trace_type == "span trace") %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_intervention_levels
			),
			update_parent = factor(update_parent, levels = c("onInput", "onChange"))
		)

	save_plot(
		ggplot(
			marker_path_summary,
			aes(factor(delay_ms), n, fill = update_parent)
		) +
			geom_col(width = 0.72) +
			facet_wrap(~intervention, ncol = 1) +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "The following input path is not the whole explanation",
				subtitle = "Source-level trace of useBlockSync.updateParent inside the retained input batch only",
				x = "Playwright key-hold delay (ms)",
				y = "Observed updateParent calls",
				fill = "Parent path"
			),
		"27-marker-path-classification.png",
		width = 10,
		height = 8
	)
}

timeout_970_marker_summary_path <- file.path(data_dir, "typing-delay-timeout-970-marker-paired-summary.csv")
if (file.exists(timeout_970_marker_summary_path)) {
	timeout_970_marker_summary <- read_csv(timeout_970_marker_summary_path, show_col_types = FALSE) %>%
		pivot_longer(
			cols = c(latency_p50_ms, marker_inclusive_latency_p50_ms),
			names_to = "metric",
			values_to = "duration_ms"
		) %>%
		mutate(
			metric = recode(
				metric,
				latency_p50_ms = "next EventDispatch only",
				marker_inclusive_latency_p50_ms = "EventDispatch + paired marker"
			),
			metric = factor(
				metric,
				levels = c("next EventDispatch only", "EventDispatch + paired marker")
			)
		)

	save_plot(
		ggplot(timeout_970_marker_summary, aes(delay_ms, duration_ms, color = metric, shape = metric)) +
			geom_vline(xintercept = 970, color = "grey55", linewidth = 0.5, linetype = "dashed") +
			geom_point(size = 3.4, alpha = 0.9, position = position_dodge(width = 2.5)) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_shape_manual(values = c(
				`next EventDispatch only` = 16,
				`EventDispatch + paired marker` = 15
			)) +
			scale_x_continuous(breaks = c(960, 970, 980, 990, 1000)) +
			labs(
				title = "Rewriting the timer to 970ms moves the event-only low band",
				subtitle = "The marker fires before every retained key at 970ms and above; marker-inclusive cost stays high",
				x = "Playwright key-hold delay (ms)",
				y = "Duration p50 (ms)",
				color = "Metric",
				shape = "Metric"
			),
		"29-timeout-970-marker-boundary.png",
		width = 11,
		height = 7
	)
}

marker_allspan_action_path <- file.path(data_dir, "typing-delay-marker-allspan-action-summary.csv")
marker_allspan_core_interventions <- c(
	"normal marker",
	"marker no-op",
	"mark next not persistent"
)
marker_allspan_extended_interventions <- c(
	"normal marker",
	"marker no-op",
	"mark next not persistent",
	"stop/start typing",
	"toggle selection"
)
if (file.exists(marker_allspan_action_path)) {
	marker_allspan_action <- read_csv(marker_allspan_action_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		filter(action_name %in% c(
			"__unstableMarkLastChangeAsPersistent",
			"__unstableMarkNextChangeAsNotPersistent",
			"updateBlockAttributes"
		)) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			),
			action_label = recode(
				action_name,
				`__unstableMarkLastChangeAsPersistent` = "mark last persistent",
				`__unstableMarkNextChangeAsNotPersistent` = "mark next not persistent",
				updateBlockAttributes = "update block attributes"
			),
			action_label = factor(
				action_label,
				levels = c("mark last persistent", "mark next not persistent", "update block attributes")
			)
		)

	save_plot(
		ggplot(marker_allspan_action, aes(intervention, action_duration_p50_ms, color = action_label, shape = action_label)) +
			geom_point(size = 3.4, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`mark last persistent` = 16,
				`mark next not persistent` = 17,
				`update block attributes` = 15
			), drop = FALSE) +
			labs(
				title = "The real marker task is not a cheap flag flip",
				subtitle = "Trace-all-data-spans run at 1000ms; absolute durations include instrumentation overhead",
				x = "Timer callback intervention",
				y = "Action duration, p50 (ms)",
				color = "Action",
				shape = "Action"
			),
		"30-marker-allspan-action-duration.png",
		width = 11,
		height = 7
	)
}

marker_richtext_summary_path <- file.path(data_dir, "typing-delay-marker-richtext-summary.csv")
if (file.exists(marker_richtext_summary_path)) {
	richtext_selected_names <- c(
		"rich-text.onInput.total",
		"rich-text.handleChange.registryBatch",
		"rich-text.handleChange.onChange",
		"rich-text.handleChange.onSelectionChange",
		"rich-text.handleChange.applyRecord",
		"rich-text.handleChange.serialize"
	)
	marker_richtext_summary <- read_csv(marker_richtext_summary_path, show_col_types = FALSE) %>%
		filter(
			delay_ms == 1000,
			name %in% richtext_selected_names
		) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_intervention_levels
			),
			span_label = recode(
				name,
				`rich-text.onInput.total` = "RichText input total",
				`rich-text.handleChange.registryBatch` = "registry.batch",
				`rich-text.handleChange.onChange` = "parent onChange/onInput",
				`rich-text.handleChange.onSelectionChange` = "selection callback",
				`rich-text.handleChange.applyRecord` = "apply record",
				`rich-text.handleChange.serialize` = "serialize"
			),
			span_label = factor(
				span_label,
				levels = c(
					"RichText input total",
					"registry.batch",
					"parent onChange/onInput",
					"selection callback",
					"apply record",
					"serialize"
				)
			)
		)

	save_plot(
		ggplot(marker_richtext_summary, aes(intervention, duration_p50_ms, color = span_label, shape = span_label)) +
			geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.65)) +
			scale_color_brewer(type = "qual", palette = "Set1", drop = FALSE) +
			scale_shape_manual(values = c(
				`RichText input total` = 16,
				`registry.batch` = 15,
				`parent onChange/onInput` = 17,
				`selection callback` = 3,
				`apply record` = 8,
				serialize = 4
			), drop = FALSE) +
			labs(
				title = "The remaining input cost is inside registry.batch",
				subtitle = "Source-level RichText spans from the trace-heavy 1000ms marker-intervention runs",
				x = "Timer callback intervention",
				y = "Span duration, p50 (ms)",
				color = "RichText span",
				shape = "RichText span"
			),
		"31-marker-richtext-batch-breakdown.png",
		width = 12,
		height = 7
	)
}

marker_allspan_input_batch_path <- file.path(data_dir, "typing-delay-marker-allspan-input-batch-summary.csv")
if (file.exists(marker_allspan_input_batch_path)) {
	marker_allspan_input_batch <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			)
		) %>%
		select(
			intervention,
			`EventDispatch latency` = latency_p50_ms,
			`RichText registry.batch` = batch_duration_p50_ms,
			`batch callback` = batch_callback_duration_p50_ms,
			`block-editor rootSubscribe` = root_subscribe_duration_p50_ms,
			`block-editor resume` = resume_block_editor_duration_p50_ms,
			`useSelect.onChange` = use_select_on_change_duration_p50_ms,
			`direct updateParent` = direct_update_parent_duration_p50_ms
		) %>%
		pivot_longer(
			cols = -intervention,
			names_to = "component",
			values_to = "duration_ms"
		) %>%
		mutate(
			component = factor(
				component,
				levels = c(
					"EventDispatch latency",
					"RichText registry.batch",
					"batch callback",
					"block-editor rootSubscribe",
					"block-editor resume",
					"useSelect.onChange",
					"direct updateParent"
				)
			)
		)

	save_plot(
		ggplot(marker_allspan_input_batch, aes(component, duration_ms, color = intervention, shape = intervention)) +
			geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The input-side difference is fanout timing, not the direct callback",
				subtitle = "Trace-all-data-spans run at 1000ms; retained inputs only",
				x = "Measured component",
				y = "Duration, p50 (ms)",
				color = "Timer intervention",
				shape = "Timer intervention"
			) +
			theme(axis.text.x = element_text(angle = 30, hjust = 1)),
		"32-marker-input-batch-components.png",
		width = 12,
		height = 7
	)

	marker_input_action_phases <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			)
		) %>%
		select(
			intervention,
			`EventDispatch latency` = latency_p50_ms,
			`RichText registry.batch` = batch_duration_p50_ms,
			`batch callback` = batch_callback_duration_p50_ms,
			`selectionChange rootSubscribe` = selection_change_root_subscribe_duration_p50_ms,
			`updateBlockAttributes rootSubscribe` = update_block_attributes_root_subscribe_duration_p50_ms,
			`block-editor resume` = resume_block_editor_duration_p50_ms,
			`useBlockSync registry.batch` = use_block_sync_registry_batch_duration_p50_ms,
			`direct updateParent` = direct_update_parent_duration_p50_ms,
			`core-data onInput` = on_input_duration_p50_ms,
			`core-data onChange` = on_change_duration_p50_ms
		) %>%
		pivot_longer(
			cols = -intervention,
			names_to = "component",
			values_to = "duration_ms"
		) %>%
		mutate(
			component = factor(
				component,
				levels = rev(c(
					"EventDispatch latency",
					"RichText registry.batch",
					"batch callback",
					"selectionChange rootSubscribe",
					"updateBlockAttributes rootSubscribe",
					"block-editor resume",
					"useBlockSync registry.batch",
					"direct updateParent",
					"core-data onInput",
					"core-data onChange"
				))
			)
		)

	save_plot(
		ggplot(marker_input_action_phases, aes(duration_ms, component, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The input gap is mostly callback-side subscriber fanout",
				subtitle = "Trace-all-data-spans run at 1000ms; retained-input p50s split by input-batch phase",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"36-marker-input-action-phase-split.png",
		width = 12,
		height = 8
	)

	marker_redux_listener_shape <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			)
		)

	marker_redux_listener_shape <- bind_rows(
		marker_redux_listener_shape %>%
			transmute(
				intervention,
				action = "selectionChange",
				`top 1 listener` = selection_change_redux_listener_top1_duration_p50_ms,
				`top 10 listeners` = selection_change_redux_listener_top10_duration_p50_ms,
				`all listener spans` = selection_change_redux_listener_duration_p50_ms,
				`rootSubscribe total` = selection_change_root_subscribe_duration_p50_ms
			),
		marker_redux_listener_shape %>%
			transmute(
				intervention,
				action = "updateBlockAttributes",
				`top 1 listener` = update_block_attributes_redux_listener_top1_duration_p50_ms,
				`top 10 listeners` = update_block_attributes_redux_listener_top10_duration_p50_ms,
				`all listener spans` = update_block_attributes_redux_listener_duration_p50_ms,
				`rootSubscribe total` = update_block_attributes_root_subscribe_duration_p50_ms
			)
	) %>%
		pivot_longer(
			cols = -c(intervention, action),
			names_to = "aggregation",
			values_to = "duration_ms"
		) %>%
		mutate(
			action = factor(action, levels = c("selectionChange", "updateBlockAttributes")),
			aggregation = factor(
				aggregation,
				levels = rev(c(
					"top 1 listener",
					"top 10 listeners",
					"all listener spans",
					"rootSubscribe total"
				))
			)
		)

	save_plot(
		ggplot(marker_redux_listener_shape, aes(duration_ms, aggregation, color = intervention, shape = intervention)) +
			geom_point(size = 3, alpha = 0.9, position = position_dodge(width = 0.55)) +
			facet_wrap(vars(action), ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The callback-side gap is not one heavy Redux listener",
				subtitle = "Per-action listener aggregation at 1000ms; top listeners stay tiny while the all-listener total moves",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"37-marker-redux-listener-fanout-shape.png",
		width = 11,
		height = 7
	)

	marker_cycle_cost <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			)
		)

	marker_cycle_cost <- bind_rows(
		marker_cycle_cost %>%
			transmute(
				intervention,
				metric = "Event/accounting window",
				`next input only` = latency_p50_ms,
				`timer marker before input` = marker_before_input_duration_p50_ms,
				`timer + next input` = cycle_latency_p50_ms
			),
		marker_cycle_cost %>%
			transmute(
				intervention,
				metric = "block-editor rootSubscribe",
				`next input only` = root_subscribe_duration_p50_ms,
				`timer marker before input` = marker_root_subscribe_duration_p50_ms,
				`timer + next input` = cycle_root_subscribe_duration_p50_ms
			),
		marker_cycle_cost %>%
			transmute(
				intervention,
				metric = "useSelect.onChange",
				`next input only` = use_select_on_change_duration_p50_ms,
				`timer marker before input` = marker_use_select_on_change_duration_p50_ms,
				`timer + next input` = cycle_use_select_on_change_duration_p50_ms
			)
	) %>%
		pivot_longer(
			cols = -c(intervention, metric),
			names_to = "window",
			values_to = "duration_ms"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c("Event/accounting window", "block-editor rootSubscribe", "useSelect.onChange")
			),
			window = factor(
				window,
				levels = rev(c("next input only", "timer marker before input", "timer + next input"))
			)
		)

	save_plot(
		ggplot(marker_cycle_cost, aes(duration_ms, window, color = intervention, shape = intervention)) +
			geom_point(size = 3, alpha = 0.9, position = position_dodge(width = 0.55)) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_x") +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The normal marker lowers the next input slice, not the whole cycle",
				subtitle = "Trace-all-data-spans run at 1000ms; per-input p50s include the marker action before the same retained input",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"38-marker-cycle-vs-input-only.png",
		width = 11,
		height = 8
	)

	marker_cycle_cost_extended <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_extended_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_extended_interventions
			)
		) %>%
		transmute(
			intervention,
			`next input only` = latency_p50_ms,
			`timer callback before input` = marker_before_input_duration_p50_ms,
			`timer + next input` = cycle_latency_p50_ms
		) %>%
		pivot_longer(
			cols = -intervention,
			names_to = "window",
			values_to = "duration_ms"
		) %>%
		mutate(
			window = factor(
				window,
				levels = rev(c("next input only", "timer callback before input", "timer + next input"))
			)
		)

	save_plot(
		ggplot(marker_cycle_cost_extended, aes(duration_ms, window, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Set1", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15,
				`stop/start typing` = 18,
				`toggle selection` = 8
			), drop = FALSE) +
			labs(
				title = "Restored state fanout reduces the next input slice, not total cycle cost",
				subtitle = "Trace-all-data-spans runs at 1000ms; timer and input p50s are paired by retained input",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer callback",
				shape = "Timer callback"
			),
		"38b-marker-cycle-vs-input-extended.png",
		width = 11,
		height = 7
	)

	marker_use_select_extended <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_extended_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_extended_interventions
			)
		) %>%
		select(
			intervention,
			`rootSubscribe total` = root_subscribe_duration_p50_ms,
			`Redux listener wrappers` = redux_listener_duration_p50_ms,
			`useSelect.onChange` = use_select_on_change_duration_p50_ms,
			`useSelect.onStoreChange` = use_select_on_store_change_duration_p50_ms,
			`useSelect.reactListener` = use_select_react_listener_duration_p50_ms,
			`useSelect.mapSelect` = use_select_map_select_duration_p50_ms,
			`useSelect.updateValue` = use_select_update_value_duration_p50_ms,
			`renderQueue.add` = use_select_render_queue_add_duration_p50_ms
		) %>%
		pivot_longer(
			cols = -intervention,
			names_to = "component",
			values_to = "duration_ms"
		) %>%
		mutate(
			component = factor(
				component,
				levels = rev(c(
					"rootSubscribe total",
					"Redux listener wrappers",
					"useSelect.onChange",
					"useSelect.onStoreChange",
					"useSelect.reactListener",
					"useSelect.mapSelect",
					"useSelect.updateValue",
					"renderQueue.add"
				))
			)
		)

	save_plot(
		ggplot(marker_use_select_extended, aes(duration_ms, component, color = intervention, shape = intervention)) +
			geom_point(size = 3, alpha = 0.9, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Set1", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15,
				`stop/start typing` = 18,
				`toggle selection` = 8
			), drop = FALSE) +
			labs(
				title = "The input-side gap is wrapper and useSelect fanout timing",
				subtitle = "Trace-all-data-spans runs at 1000ms; counts are effectively unchanged across interventions",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer callback",
				shape = "Timer callback"
			),
		"38c-marker-use-select-subphase-extended.png",
		width = 11,
		height = 7.5
	)
}

marker_allspan_input_batch_samples_path <- file.path(data_dir, "typing-delay-marker-allspan-input-batch-samples.csv")
if (file.exists(marker_allspan_input_batch_samples_path)) {
	marker_state_path_cases <- read_csv(marker_allspan_input_batch_samples_path, show_col_types = FALSE) %>%
		filter(!is_throwaway, intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			),
			marker_case = case_when(
				marker_before_input_actions == "__unstableMarkLastChangeAsPersistent" ~ "marker before input",
				marker_before_input_actions == "__unstableMarkNextChangeAsNotPersistent; __unstableMarkLastChangeAsPersistent" ~ "mark-next before input",
				is.na(marker_before_input_actions) | marker_before_input_actions == "" ~ "no marker before input",
				TRUE ~ marker_before_input_actions
			),
			state_path = paste0(
				if_else(content_update_before_persistent, "persistent", "transient"),
				" -> ",
				if_else(content_update_after_persistent, "persistent", "transient"),
				"; ",
				update_parent
			),
			case_label = paste(marker_case, state_path, sep = "\n")
		) %>%
		group_by(intervention, case_label) %>%
		summarise(
			n = n(),
			latency_p50_ms = median(latency_ms, na.rm = TRUE),
			batch_p50_ms = median(batch_duration_ms, na.rm = TRUE),
			root_subscribe_p50_ms = median(root_subscribe_duration_ms, na.rm = TRUE),
			.groups = "drop"
		) %>%
		pivot_longer(
			cols = c(latency_p50_ms, batch_p50_ms, root_subscribe_p50_ms),
			names_to = "metric",
			values_to = "duration_ms"
		) %>%
		mutate(
			metric = recode(
				metric,
				latency_p50_ms = "EventDispatch latency",
				batch_p50_ms = "RichText registry.batch",
				root_subscribe_p50_ms = "block-editor rootSubscribe"
			),
			case_label = fct_reorder(case_label, duration_ms, .fun = max)
		)

	save_plot(
		ggplot(marker_state_path_cases, aes(duration_ms, case_label, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.45)) +
			facet_wrap(vars(metric), ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "State transitions explain the path split, not the full cost",
				subtitle = "Retained inputs from the trace-all-data-spans run at 1000ms; points are p50 within each observed state path",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"35-marker-state-path-cases.png",
		width = 12,
		height = 9
	)
}

marker_allspan_owner_path <- file.path(data_dir, "typing-delay-marker-allspan-owner-summary.csv")
if (file.exists(marker_allspan_owner_path)) {
	marker_allspan_owner <- read_csv(marker_allspan_owner_path, show_col_types = FALSE) %>%
		filter(
			intervention %in% marker_allspan_core_interventions,
			window_kind %in% c("marker action", "next input registry.batch"),
			!is.na(source_path),
			source_path != ""
		) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			),
			window_label = recode(
				window_kind,
				`marker action` = "Timer marker action",
				`next input registry.batch` = "Following input batch"
			),
			owner_label = paste0(source_path, ":", source_line),
			owner_label = str_trunc(owner_label, width = 72, side = "left")
		)

	marker_owner_top <- marker_allspan_owner %>%
		filter(window_kind == "next input registry.batch" | intervention == "normal marker") %>%
		group_by(window_label, owner_label) %>%
		summarise(max_p50 = max(on_change_duration_p50_ms, na.rm = TRUE), .groups = "drop") %>%
		group_by(window_label) %>%
		slice_max(max_p50, n = 8, with_ties = FALSE) %>%
		ungroup()

	marker_owner_plot <- marker_allspan_owner %>%
		semi_join(marker_owner_top, by = c("window_label", "owner_label")) %>%
		filter(window_kind == "next input registry.batch" | intervention == "normal marker") %>%
		mutate(
			owner_label = fct_reorder(owner_label, on_change_duration_p50_ms, .fun = max)
		)

	save_plot(
		ggplot(marker_owner_plot, aes(on_change_duration_p50_ms, owner_label, color = intervention, shape = intervention)) +
			geom_point(size = 2.9, alpha = 0.9, position = position_dodge(width = 0.45)) +
			facet_wrap(vars(window_label), scales = "free_y", ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "No single useSelect owner explains the input-side delta",
				subtitle = "Top owner groups by p50 useSelect.onChange duration in trace-all-data-spans runs",
				x = "useSelect.onChange duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"33-marker-owner-fanout.png",
		width = 13,
		height = 10
	)

	if ("outer_listener_duration_p50_ms" %in% names(marker_allspan_owner)) {
		marker_outer_top <- marker_allspan_owner %>%
			filter(
				window_kind == "next input registry.batch" | intervention == "normal marker",
				outer_listener_duration_p50_ms > 0
			) %>%
			group_by(window_label, owner_label) %>%
			summarise(max_p50 = max(outer_listener_duration_p50_ms, na.rm = TRUE), .groups = "drop") %>%
			group_by(window_label) %>%
			slice_max(max_p50, n = 8, with_ties = FALSE) %>%
			ungroup()

		marker_outer_plot <- marker_allspan_owner %>%
			semi_join(marker_outer_top, by = c("window_label", "owner_label")) %>%
			filter(window_kind == "next input registry.batch" | intervention == "normal marker") %>%
			mutate(
				owner_label = fct_reorder(owner_label, outer_listener_duration_p50_ms, .fun = max)
			)

		save_plot(
			ggplot(marker_outer_plot, aes(outer_listener_duration_p50_ms, owner_label, color = intervention, shape = intervention)) +
				geom_point(size = 2.9, alpha = 0.9, position = position_dodge(width = 0.45)) +
				facet_wrap(vars(window_label), scales = "free_y", ncol = 1) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`normal marker` = 16,
					`marker no-op` = 17,
					`mark next not persistent` = 15
				), drop = FALSE) +
				labs(
					title = "Outer listener attribution also shows distributed fanout",
					subtitle = "Listener spans attributed to the first nested useSelect.onChange owner in trace-all-data-spans runs",
					x = "Outer listener duration, p50 (ms)",
					y = NULL,
					color = "Timer intervention",
					shape = "Timer intervention"
				),
			"34-marker-outer-listener-owner-fanout.png",
			width = 13,
			height = 10
		)
	}
}

redux_listener_owner_summary_path <- file.path(data_dir, "typing-delay-redux-listener-owner-summary.csv")
redux_listener_owner_diff_path <- file.path(data_dir, "typing-delay-redux-listener-owner-diff.csv")
redux_listener_owner_samples_path <- file.path(data_dir, "typing-delay-redux-listener-owner-samples.csv")

if (file.exists(redux_listener_owner_summary_path)) {
	redux_listener_owner_summary <- read_csv(redux_listener_owner_summary_path, show_col_types = FALSE) %>%
		filter(!is.na(source_path), source_path != "") %>%
		mutate(
			intervention = factor(
				intervention,
				levels = c("normal marker", "marker no-op", "mark next not persistent")
			),
			owner_label = paste0(source_path, ":", source_line),
			owner_label = str_trunc(owner_label, width = 78, side = "left")
		)

	redux_marker_owner_top <- redux_listener_owner_summary %>%
		filter(window_kind == "marker before input", intervention == "normal marker") %>%
		slice_max(listener_duration_p50_ms, n = 10, with_ties = FALSE) %>%
		mutate(owner_label = fct_reorder(owner_label, listener_duration_p50_ms))

	if (nrow(redux_marker_owner_top) > 0) {
		save_plot(
			ggplot(redux_marker_owner_top, aes(listener_duration_p50_ms, owner_label, color = owner_script, size = listener_count_p50)) +
				geom_point(alpha = 0.9) +
				scale_color_brewer(type = "qual", palette = "Set2") +
				scale_size_area(max_size = 5, labels = label_number()) +
				labs(
					title = "The timer marker's low-level Redux listener cost is broad fanout",
					subtitle = "Normal 1000ms marker action; points are source-mapped useSelect owners, p50 over retained windows",
					x = "Redux listener duration, p50 (ms)",
					y = NULL,
					color = "Bundle",
					size = "p50 listener calls"
				),
			"39-redux-listener-marker-owner-fanout.png",
			width = 12,
			height = 7
		)
	}
}

if (file.exists(redux_listener_owner_diff_path)) {
	redux_listener_owner_diff <- read_csv(redux_listener_owner_diff_path, show_col_types = FALSE) %>%
		filter(
			window_kind %in% c("next input selectionChange", "next input updateBlockAttributes"),
			diff_listener_duration_p50_ms > 0,
			!is.na(source_path),
			source_path != ""
		) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = c("marker no-op", "mark next not persistent")
			),
			window_label = recode(
				window_kind,
				`next input selectionChange` = "Next input: selectionChange",
				`next input updateBlockAttributes` = "Next input: updateBlockAttributes"
			),
			owner_label = paste0(source_path, ":", source_line),
			owner_label = str_trunc(owner_label, width = 78, side = "left")
		) %>%
		group_by(window_label) %>%
		slice_max(diff_listener_duration_p50_ms, n = 8, with_ties = FALSE) %>%
		ungroup() %>%
		mutate(owner_label = fct_reorder(owner_label, diff_listener_duration_p50_ms, .fun = max))

	if (nrow(redux_listener_owner_diff) > 0) {
		save_plot(
			ggplot(redux_listener_owner_diff, aes(diff_listener_duration_p50_ms, owner_label, color = intervention, shape = intervention)) +
				geom_point(size = 3, alpha = 0.9, position = position_dodge(width = 0.45)) +
				facet_wrap(vars(window_label), scales = "free_y", ncol = 1) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`marker no-op` = 17,
					`mark next not persistent` = 15
				), drop = FALSE) +
				labs(
					title = "The remaining input-side delta is spread across high-fanout owners",
					subtitle = "Positive p50 Redux listener-duration deltas versus the normal marker run; no source site moves by even 1ms",
					x = "p50 duration delta versus normal marker (ms)",
					y = NULL,
					color = "Timer intervention",
					shape = "Timer intervention"
				),
			"40-redux-listener-next-input-deltas.png",
			width = 12,
			height = 8
		)
	}
}

if (file.exists(redux_listener_owner_samples_path)) {
	redux_listener_owner_samples <- read_csv(redux_listener_owner_samples_path, show_col_types = FALSE)

	redux_listener_owner_accounting <- redux_listener_owner_samples %>%
		group_by(intervention, window_kind, sample_id) %>%
		summarise(
			total_duration_ms = sum(listener_duration_ms, na.rm = TRUE),
			total_count = sum(listener_count, na.rm = TRUE),
			owner_count = n(),
			.groups = "drop"
		) %>%
		group_by(intervention, window_kind) %>%
		summarise(
			n = n(),
			total_duration_p50_ms = median(total_duration_ms, na.rm = TRUE),
			total_duration_min_ms = min(total_duration_ms, na.rm = TRUE),
			total_duration_max_ms = max(total_duration_ms, na.rm = TRUE),
			total_count_p50 = median(total_count, na.rm = TRUE),
			owner_count_p50 = median(owner_count, na.rm = TRUE),
			.groups = "drop"
		)

	write_csv(redux_listener_owner_accounting, file.path(data_dir, "typing-delay-redux-listener-owner-accounting.csv"))

	redux_listener_owner_concentration <- redux_listener_owner_samples %>%
		filter(has_use_select_owner) %>%
		arrange(intervention, window_kind, sample_id, desc(listener_duration_ms)) %>%
		group_by(intervention, window_kind, sample_id) %>%
		mutate(
			rank = row_number(),
			total_duration_ms = sum(listener_duration_ms, na.rm = TRUE),
			share = if_else(total_duration_ms > 0, listener_duration_ms / total_duration_ms, NA_real_)
		) %>%
		summarise(
			top1_share = sum(share[rank <= 1], na.rm = TRUE),
			top3_share = sum(share[rank <= 3], na.rm = TRUE),
			top5_share = sum(share[rank <= 5], na.rm = TRUE),
			top10_share = sum(share[rank <= 10], na.rm = TRUE),
			.groups = "drop"
		) %>%
		group_by(intervention, window_kind) %>%
		summarise(
			n = n(),
			top1_share_p50 = median(top1_share, na.rm = TRUE),
			top3_share_p50 = median(top3_share, na.rm = TRUE),
			top5_share_p50 = median(top5_share, na.rm = TRUE),
			top10_share_p50 = median(top10_share, na.rm = TRUE),
			.groups = "drop"
		)

	write_csv(redux_listener_owner_concentration, file.path(data_dir, "typing-delay-redux-listener-owner-concentration.csv"))

	redux_listener_owner_concentration_plot <- redux_listener_owner_concentration %>%
		mutate(
			intervention = factor(
				intervention,
				levels = c("normal marker", "marker no-op", "mark next not persistent")
			),
			window_label = recode(
				window_kind,
				`marker before input` = "Timer marker before input",
				`next input selectionChange` = "Next input: selectionChange",
				`next input updateBlockAttributes` = "Next input: updateBlockAttributes"
			)
		) %>%
		pivot_longer(
			cols = ends_with("_share_p50"),
			names_to = "top_group",
			values_to = "duration_share"
		) %>%
		mutate(
			top_group = recode(
				top_group,
				top1_share_p50 = "top 1 owner",
				top3_share_p50 = "top 3 owners",
				top5_share_p50 = "top 5 owners",
				top10_share_p50 = "top 10 owners"
			),
			top_group = factor(top_group, levels = rev(c("top 1 owner", "top 3 owners", "top 5 owners", "top 10 owners")))
		)

	save_plot(
		ggplot(redux_listener_owner_concentration_plot, aes(duration_share, top_group, color = intervention, shape = intervention)) +
			geom_point(size = 3, alpha = 0.9, position = position_dodge(width = 0.5)) +
			facet_wrap(vars(window_label), ncol = 1) +
			scale_x_continuous(labels = percent_format(accuracy = 1), limits = c(0, 1)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "Listener cost is concentrated in a few owner families, not one owner",
				subtitle = "Cumulative share of low-level Redux listener duration by top source-mapped useSelect owners",
				x = "Share of p50 listener-wrapper duration",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"41-redux-listener-owner-concentration.png",
		width = 11,
		height = 8
	)
}

if (file.exists(redux_listener_owner_summary_path)) {
	redux_listener_owner_count_duration <- read_csv(redux_listener_owner_summary_path, show_col_types = FALSE) %>%
		filter(
			!is.na(source_path),
			source_path != "",
			source_path != "(non-useSelect)",
			listener_duration_p50_ms > 0,
			listener_count_p50 > 0,
			window_kind %in% c("marker before input", "next input selectionChange", "next input updateBlockAttributes")
		) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = c("normal marker", "marker no-op", "mark next not persistent")
			),
			window_label = recode(
				window_kind,
				`marker before input` = "Timer marker before input",
				`next input selectionChange` = "Next input: selectionChange",
				`next input updateBlockAttributes` = "Next input: updateBlockAttributes"
			),
			owner_family = case_when(
				str_detect(source_path, "block-list/block.js|block-list/index.js") ~ "block-list",
				str_detect(source_path, "pattern-overrides") ~ "pattern-overrides",
				str_detect(source_path, "inner-blocks") ~ "inner-blocks",
				str_detect(source_path, "heading/edit") ~ "heading",
				TRUE ~ "other"
			),
			per_listener_us = 1000 * listener_duration_p50_ms / listener_count_p50
		) %>%
		group_by(window_kind, intervention) %>%
		slice_max(listener_duration_p50_ms, n = 10, with_ties = FALSE) %>%
		ungroup()

	write_csv(redux_listener_owner_count_duration, file.path(data_dir, "typing-delay-redux-listener-owner-count-duration.csv"))

	save_plot(
		ggplot(redux_listener_owner_count_duration, aes(listener_count_p50, listener_duration_p50_ms, color = owner_family, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.88) +
			facet_wrap(vars(window_label), scales = "free", ncol = 1) +
			scale_x_log10(labels = label_number()) +
			scale_color_brewer(type = "qual", palette = "Set2") +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The largest owner costs come from high invocation counts",
				subtitle = "Top source-mapped owners by p50 duration; the dominant groups have hundreds to thousands of listener calls",
				x = "p50 listener calls in owner group (log scale)",
				y = "Redux listener duration, p50 (ms)",
				color = "Owner family",
				shape = "Timer intervention"
			),
		"42-redux-listener-count-vs-duration.png",
		width = 11,
		height = 8
	)
}

if (file.exists(redux_listener_owner_summary_path)) {
	redux_listener_owner_family <- read_csv(redux_listener_owner_summary_path, show_col_types = FALSE) %>%
		filter(
			!is.na(source_path),
			source_path != "",
			source_path != "(non-useSelect)",
			window_kind %in% c("marker before input", "next input selectionChange", "next input updateBlockAttributes")
		) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = c("normal marker", "marker no-op", "mark next not persistent")
			),
			window_label = recode(
				window_kind,
				`marker before input` = "Timer marker before input",
				`next input selectionChange` = "Next input: selectionChange",
				`next input updateBlockAttributes` = "Next input: updateBlockAttributes"
			),
			owner_family = case_when(
				str_detect(source_path, "block-list/block.js|block-list/index.js") ~ "block-list",
				str_detect(source_path, "pattern-overrides") ~ "pattern-overrides",
				str_detect(source_path, "inner-blocks") ~ "inner-blocks",
				str_detect(source_path, "heading/edit") ~ "heading",
				str_detect(source_path, "layout.js") ~ "layout",
				str_detect(source_path, "use-settings") ~ "use-settings",
				TRUE ~ "other"
			)
		) %>%
		group_by(window_kind, window_label, intervention, owner_family) %>%
		summarise(
			listener_duration_p50_sum_ms = sum(listener_duration_p50_ms, na.rm = TRUE),
			listener_count_p50_sum = sum(listener_count_p50, na.rm = TRUE),
			owner_groups = n(),
			.groups = "drop"
		)

	write_csv(redux_listener_owner_family, file.path(data_dir, "typing-delay-redux-listener-owner-family-summary.csv"))

	redux_listener_owner_family_plot <- redux_listener_owner_family %>%
		mutate(
			owner_family = fct_reorder(owner_family, listener_duration_p50_sum_ms, .fun = sum),
			intervention = fct_drop(intervention)
		)

	save_plot(
		ggplot(redux_listener_owner_family_plot, aes(listener_duration_p50_sum_ms, owner_family, fill = owner_family)) +
			geom_col(width = 0.72, alpha = 0.9) +
			facet_grid(window_label ~ intervention, scales = "free_x") +
			scale_fill_brewer(type = "qual", palette = "Set2") +
			labs(
				title = "Block-list and pattern families explain most measured listener time",
				subtitle = "Family sums of owner p50 Redux listener-wrapper duration; reduced 1000ms attribution traces",
				x = "Sum of owner p50 listener duration (ms)",
				y = NULL,
				fill = "Owner family"
			) +
			theme(legend.position = "bottom"),
		"43-redux-listener-owner-family-breakdown.png",
		width = 12,
		height = 8
	)
}

if (exists("marker_allspan_input_batch_path") && file.exists(marker_allspan_input_batch_path)) {
	use_select_phase_accounting <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% marker_allspan_core_interventions) %>%
		mutate(
			intervention = factor(
				intervention,
				levels = marker_allspan_core_interventions
			)
		)

	use_select_phase_accounting <- bind_rows(
		use_select_phase_accounting %>%
			transmute(
				intervention,
				accounting_window = "next input only",
				`rootSubscribe total` = root_subscribe_duration_p50_ms,
				`Redux listener wrappers` = redux_listener_duration_p50_ms,
				`useSelect.onChange` = use_select_on_change_duration_p50_ms,
				`useSelect.mapSelect` = use_select_map_select_duration_p50_ms
			),
		use_select_phase_accounting %>%
			transmute(
				intervention,
				accounting_window = "timer marker before input",
				`rootSubscribe total` = marker_root_subscribe_duration_p50_ms,
				`Redux listener wrappers` = marker_redux_listener_duration_p50_ms,
				`useSelect.onChange` = marker_use_select_on_change_duration_p50_ms,
				`useSelect.mapSelect` = marker_use_select_map_select_duration_p50_ms
			),
		use_select_phase_accounting %>%
			transmute(
				intervention,
				accounting_window = "timer + next input",
				`rootSubscribe total` = cycle_root_subscribe_duration_p50_ms,
				`Redux listener wrappers` = cycle_redux_listener_duration_p50_ms,
				`useSelect.onChange` = cycle_use_select_on_change_duration_p50_ms,
				`useSelect.mapSelect` = cycle_use_select_map_select_duration_p50_ms
			)
	) %>%
		pivot_longer(
			cols = -c(intervention, accounting_window),
			names_to = "metric",
			values_to = "duration_p50_ms"
		) %>%
		mutate(
			accounting_window = factor(
				accounting_window,
				levels = c("next input only", "timer marker before input", "timer + next input")
			),
			metric = factor(
				metric,
				levels = rev(c("rootSubscribe total", "Redux listener wrappers", "useSelect.onChange", "useSelect.mapSelect"))
			)
		)

	write_csv(use_select_phase_accounting, file.path(data_dir, "typing-delay-use-select-phase-accounting.csv"))

	save_plot(
		ggplot(use_select_phase_accounting, aes(duration_p50_ms, metric, color = intervention, shape = intervention)) +
			geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.5)) +
			facet_wrap(vars(accounting_window), ncol = 1, scales = "free_x") +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`normal marker` = 16,
				`marker no-op` = 17,
				`mark next not persistent` = 15
			), drop = FALSE) +
			labs(
				title = "The input-side gap is not mostly selector recomputation",
				subtitle = "Trace-all-data-spans run at 1000ms; mapSelect moves little while listener/rootSubscribe accounting moves more",
				x = "Duration, p50 (ms)",
				y = NULL,
				color = "Timer intervention",
				shape = "Timer intervention"
			),
		"44-use-select-phase-accounting.png",
		width = 11,
		height = 8
	)

	if (all(c(
		"use_select_on_store_change_duration_p50_ms",
		"use_select_react_listener_duration_p50_ms",
		"use_select_update_value_duration_p50_ms",
		"use_select_render_queue_add_duration_p50_ms",
		"cycle_use_select_on_store_change_duration_p50_ms",
		"cycle_use_select_react_listener_duration_p50_ms",
		"cycle_use_select_update_value_duration_p50_ms",
		"cycle_use_select_render_queue_add_duration_p50_ms",
		"marker_use_select_on_store_change_duration_p50_ms",
		"marker_use_select_react_listener_duration_p50_ms",
		"marker_use_select_update_value_duration_p50_ms",
		"marker_use_select_render_queue_add_duration_p50_ms"
	) %in% names(read_csv(marker_allspan_input_batch_path, show_col_types = FALSE)))) {
		use_select_subphase_source <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
			filter(intervention %in% marker_allspan_core_interventions) %>%
			mutate(
				intervention = factor(
					intervention,
					levels = marker_allspan_core_interventions
				)
			)

		use_select_subphase_accounting <- bind_rows(
			use_select_subphase_source %>%
				transmute(
					intervention,
					accounting_window = "next input only",
					`rootSubscribe total` = root_subscribe_duration_p50_ms,
					`Redux listener wrappers` = redux_listener_duration_p50_ms,
					`useSelect.onChange` = use_select_on_change_duration_p50_ms,
					`renderQueue.add` = use_select_render_queue_add_duration_p50_ms,
					`useSelect.onStoreChange` = use_select_on_store_change_duration_p50_ms,
					`useSelect.reactListener` = use_select_react_listener_duration_p50_ms,
					`useSelect.updateValue` = use_select_update_value_duration_p50_ms,
					`useSelect.mapSelect` = use_select_map_select_duration_p50_ms
				),
			use_select_subphase_source %>%
				transmute(
					intervention,
					accounting_window = "timer marker before input",
					`rootSubscribe total` = marker_root_subscribe_duration_p50_ms,
					`Redux listener wrappers` = marker_redux_listener_duration_p50_ms,
					`useSelect.onChange` = marker_use_select_on_change_duration_p50_ms,
					`renderQueue.add` = marker_use_select_render_queue_add_duration_p50_ms,
					`useSelect.onStoreChange` = marker_use_select_on_store_change_duration_p50_ms,
					`useSelect.reactListener` = marker_use_select_react_listener_duration_p50_ms,
					`useSelect.updateValue` = marker_use_select_update_value_duration_p50_ms,
					`useSelect.mapSelect` = marker_use_select_map_select_duration_p50_ms
				),
			use_select_subphase_source %>%
				transmute(
					intervention,
					accounting_window = "timer + next input",
					`rootSubscribe total` = cycle_root_subscribe_duration_p50_ms,
					`Redux listener wrappers` = cycle_redux_listener_duration_p50_ms,
					`useSelect.onChange` = cycle_use_select_on_change_duration_p50_ms,
					`renderQueue.add` = cycle_use_select_render_queue_add_duration_p50_ms,
					`useSelect.onStoreChange` = cycle_use_select_on_store_change_duration_p50_ms,
					`useSelect.reactListener` = cycle_use_select_react_listener_duration_p50_ms,
					`useSelect.updateValue` = cycle_use_select_update_value_duration_p50_ms,
					`useSelect.mapSelect` = cycle_use_select_map_select_duration_p50_ms
				)
		) %>%
			pivot_longer(
				cols = -c(intervention, accounting_window),
				names_to = "metric",
				values_to = "duration_p50_ms"
			) %>%
			mutate(
				accounting_window = factor(
					accounting_window,
					levels = c("next input only", "timer marker before input", "timer + next input")
				),
				metric = factor(
					metric,
					levels = rev(c(
						"rootSubscribe total",
						"Redux listener wrappers",
						"useSelect.onChange",
						"renderQueue.add",
						"useSelect.onStoreChange",
						"useSelect.reactListener",
						"useSelect.updateValue",
						"useSelect.mapSelect"
					))
				)
			)

		write_csv(use_select_subphase_accounting, file.path(data_dir, "typing-delay-use-select-subphase-accounting.csv"))

		use_select_subphase_deltas <- use_select_subphase_accounting %>%
			filter(accounting_window == "next input only") %>%
			select(intervention, metric, duration_p50_ms) %>%
			pivot_wider(names_from = intervention, values_from = duration_p50_ms) %>%
			pivot_longer(
				cols = c(`marker no-op`, `mark next not persistent`),
				names_to = "intervention",
				values_to = "duration_p50_ms"
			) %>%
			mutate(
				delta_vs_normal_ms = duration_p50_ms - `normal marker`,
				intervention = factor(
					intervention,
					levels = c("marker no-op", "mark next not persistent")
				)
			)

		write_csv(use_select_subphase_deltas, file.path(data_dir, "typing-delay-use-select-subphase-deltas.csv"))

		save_plot(
			ggplot(use_select_subphase_deltas, aes(delta_vs_normal_ms, metric, color = intervention, shape = intervention)) +
				geom_vline(xintercept = 0, linewidth = 0.4, linetype = "dashed", color = "grey50") +
				geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.45)) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`marker no-op` = 17,
					`mark next not persistent` = 15
				), drop = FALSE) +
				labs(
					title = "The remaining input-side gap is above useSelect inner work",
					subtitle = "Next-input p50 deltas versus the normal marker run; inner React listener and selector spans do not grow with the slow paths",
					x = "Delta versus normal marker, p50 (ms)",
					y = NULL,
					color = "Timer intervention",
					shape = "Timer intervention"
				),
			"45-use-select-subphase-deltas.png",
			width = 11,
			height = 6.5
		)

		if (all(c(
			"root_subscribe_outside_redux_listener_duration_p50_ms",
			"redux_listener_outside_emitter_emit_duration_p50_ms",
			"paused_emitter_emit_block_editor_duration_p50_ms",
			"emitter_notify_block_editor_duration_p50_ms",
			"emitter_listener_block_editor_duration_p50_ms"
		) %in% names(use_select_subphase_source))) {
			listener_wrapper_accounting <- use_select_subphase_source %>%
				transmute(
					intervention,
					`rootSubscribe total` = root_subscribe_duration_p50_ms,
					`rootSubscribe outside listener wrappers` = root_subscribe_outside_redux_listener_duration_p50_ms,
					`Redux listener wrappers` = redux_listener_duration_p50_ms,
					`Redux wrapper outside emitter.emit` = redux_listener_outside_emitter_emit_duration_p50_ms,
					`paused emitter.emit` = paused_emitter_emit_block_editor_duration_p50_ms,
					`emitter.notifyListeners` = emitter_notify_block_editor_duration_p50_ms,
					`emitter.listener callbacks` = emitter_listener_block_editor_duration_p50_ms,
					`useSelect.reactListener` = use_select_react_listener_duration_p50_ms,
					`useSelect.mapSelect` = use_select_map_select_duration_p50_ms
				) %>%
				pivot_longer(
					cols = -intervention,
					names_to = "metric",
					values_to = "duration_p50_ms"
				) %>%
				mutate(
					metric = factor(
						metric,
						levels = rev(c(
							"rootSubscribe total",
							"rootSubscribe outside listener wrappers",
							"Redux listener wrappers",
							"Redux wrapper outside emitter.emit",
							"paused emitter.emit",
							"emitter.notifyListeners",
							"emitter.listener callbacks",
							"useSelect.reactListener",
							"useSelect.mapSelect"
						))
					)
				)

			listener_wrapper_deltas <- listener_wrapper_accounting %>%
				pivot_wider(names_from = intervention, values_from = duration_p50_ms) %>%
				pivot_longer(
					cols = c(`marker no-op`, `mark next not persistent`),
					names_to = "intervention",
					values_to = "duration_p50_ms"
				) %>%
				mutate(
					delta_vs_normal_ms = duration_p50_ms - `normal marker`,
					intervention = factor(
						intervention,
						levels = c("marker no-op", "mark next not persistent")
					)
				)

			write_csv(listener_wrapper_accounting, file.path(data_dir, "typing-delay-listener-wrapper-accounting.csv"))
			write_csv(listener_wrapper_deltas, file.path(data_dir, "typing-delay-listener-wrapper-deltas.csv"))

			save_plot(
				ggplot(listener_wrapper_deltas, aes(delta_vs_normal_ms, metric, color = intervention, shape = intervention)) +
					geom_vline(xintercept = 0, linewidth = 0.4, linetype = "dashed", color = "grey50") +
					geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.45)) +
					scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
					scale_shape_manual(values = c(
						`marker no-op` = 17,
						`mark next not persistent` = 15
					), drop = FALSE) +
					labs(
						title = "The shared slow-path movement is in paused listener wrappers",
						subtitle = "Next-input p50 deltas versus normal marker; counts are unchanged, so this is per-wrapper timing, not more listeners",
						x = "Delta versus normal marker, p50 (ms)",
						y = NULL,
						color = "Timer intervention",
						shape = "Timer intervention"
					),
				"46-listener-wrapper-deltas.png",
				width = 11,
				height = 7
			)
		}

		paused_wrapper_bins_path <- file.path(data_dir, "typing-delay-paused-wrapper-duration-bins.csv")
		if (file.exists(paused_wrapper_bins_path)) {
			paused_wrapper_bins <- read_csv(paused_wrapper_bins_path, show_col_types = FALSE) %>%
				filter(count_p50 > 0, intervention %in% marker_allspan_core_interventions) %>%
				mutate(
					intervention = factor(
						intervention,
						levels = marker_allspan_core_interventions
					),
					component = factor(
						component,
						levels = rev(c(
							"Redux listener wrapper",
							"paused emitter.emit child",
							"wrapper outside emitter.emit"
						))
					)
				)

			save_plot(
				ggplot(paused_wrapper_bins, aes(duration_bin_ms, count_p50, color = intervention, shape = intervention)) +
					geom_point(size = 3.1, alpha = 0.9, position = position_dodge(width = 0.015)) +
					facet_wrap(vars(component), ncol = 1) +
					scale_y_log10(labels = label_number()) +
					scale_x_continuous(breaks = c(0, 0.1, 0.2), labels = number_format(accuracy = 0.1)) +
					scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
					scale_shape_manual(values = c(
						`normal marker` = 16,
						`marker no-op` = 17,
						`mark next not persistent` = 15
					), drop = FALSE) +
					labs(
						title = "Paused wrapper timing is mostly zero with small 0.1ms quanta",
						subtitle = "P50 count of spans per rounded duration bin; every Redux listener wrapper contains a paused emitter.emit child",
						x = "Rounded span duration (ms)",
						y = "p50 span count (log scale)",
						color = "Timer intervention",
						shape = "Timer intervention"
					),
				"47-paused-wrapper-duration-bins.png",
				width = 11,
				height = 8
			)
		}
	}
}

message("Wrote plots to: ", figure_dir)
