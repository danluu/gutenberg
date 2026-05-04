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

wall_clock_fixed_sample_audit <- runs %>%
	filter(run_id == "full_0_1100", !is.na(run_duration_ms)) %>%
	group_by(run_id, run_label, delay_ms) %>%
	summarise(
		round_count = n(),
		total_wall_clock_s = sum(run_duration_ms, na.rm = TRUE) / 1000,
		run_duration_min_s = min(run_duration_ms, na.rm = TRUE) / 1000,
		run_duration_max_s = max(run_duration_ms, na.rm = TRUE) / 1000,
		.groups = "drop"
	) %>%
	left_join(
		records %>%
			filter(run_id == "full_0_1100", !is_throwaway) %>%
			group_by(delay_ms) %>%
			summarise(
				retained_samples = n(),
				latency_p50_ms = median(latency_ms, na.rm = TRUE),
				latency_p10_ms = quant(latency_ms, 0.1),
				latency_p90_ms = quant(latency_ms, 0.9),
				latency_sd_ms = sd(latency_ms, na.rm = TRUE),
				.groups = "drop"
			),
		by = "delay_ms"
	)

if (nrow(wall_clock_fixed_sample_audit) > 0) {
	wall_clock_total_s <- sum(wall_clock_fixed_sample_audit$total_wall_clock_s)
	wall_clock_equalized_same_total_s <- wall_clock_total_s / nrow(wall_clock_fixed_sample_audit)

	wall_clock_fixed_sample_audit <- wall_clock_fixed_sample_audit %>%
		mutate(
			retained_samples_per_s = retained_samples / total_wall_clock_s,
			fixed_sample_wall_clock_share = total_wall_clock_s / wall_clock_total_s,
			fixed_sample_retained_sample_share = retained_samples / sum(retained_samples),
			equalized_same_total_target_s = wall_clock_equalized_same_total_s,
			projected_retained_same_total = retained_samples_per_s * equalized_same_total_target_s,
			projected_retained_60s = retained_samples_per_s * 60
		)

	wall_clock_fixed_sample_summary <- wall_clock_fixed_sample_audit %>%
		summarise(
			delay_count = n(),
			current_total_wall_clock_s = sum(total_wall_clock_s),
			current_total_wall_clock_min = current_total_wall_clock_s / 60,
			current_min_delay_wall_clock_s = min(total_wall_clock_s),
			current_max_delay_wall_clock_s = max(total_wall_clock_s),
			current_median_delay_wall_clock_s = median(total_wall_clock_s),
			retained_samples_per_delay = median(retained_samples),
			equalized_same_total_target_s = median(equalized_same_total_target_s),
			equalized_60s_total_wall_clock_min = n() * 60 / 60,
			projected_same_total_min_retained = min(projected_retained_same_total),
			projected_same_total_max_retained = max(projected_retained_same_total),
			projected_60s_min_retained = min(projected_retained_60s),
			projected_60s_max_retained = max(projected_retained_60s)
		)

	write_csv(
		wall_clock_fixed_sample_audit,
		file.path(data_dir, "typing-delay-wall-clock-fixed-sample-audit.csv")
	)
	write_csv(
		wall_clock_fixed_sample_summary,
		file.path(data_dir, "typing-delay-wall-clock-fixed-sample-summary.csv")
	)

	save_plot(
		ggplot(wall_clock_fixed_sample_audit, aes(delay_ms, total_wall_clock_s)) +
			geom_point(size = 1.7, alpha = 0.9, color = brewer_color("Dark2", 2)) +
			geom_hline(
				yintercept = wall_clock_equalized_same_total_s,
				linetype = "dashed",
				color = brewer_color("Set1", 1),
				linewidth = 0.45
			) +
			scale_x_continuous(breaks = seq(0, 1100, 100)) +
			labs(
				title = "Fixed samples per delay do not mean equal wall-clock exposure",
				subtitle = sprintf(
					"Full 0-1100ms sweep; dashed line is same-total equalized time: %.1fs per delay",
					wall_clock_equalized_same_total_s
				),
				x = "Configured Playwright delay",
				y = "Wall-clock seconds spent at delay"
			),
		"130-fixed-sample-wall-clock-audit.png",
		width = 9,
		height = 5.6
	)

	wall_clock_sample_budget <- wall_clock_fixed_sample_audit %>%
		select(
			delay_ms,
			`current fixed sample count` = retained_samples,
			`same total wall-clock, equalized` = projected_retained_same_total,
			`60s per delay, equalized` = projected_retained_60s
		) %>%
		pivot_longer(
			cols = -delay_ms,
			names_to = "budget",
			values_to = "projected_retained_samples"
		) %>%
		mutate(
			budget = factor(
				budget,
				levels = c(
					"current fixed sample count",
					"same total wall-clock, equalized",
					"60s per delay, equalized"
				)
			)
		)

	save_plot(
		ggplot(
			wall_clock_sample_budget,
			aes(delay_ms, projected_retained_samples, color = budget, shape = budget)
		) +
			geom_point(size = 1.8, alpha = 0.86) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c(
				`current fixed sample count` = 16,
				`same total wall-clock, equalized` = 17,
				`60s per delay, equalized` = 15
			), drop = FALSE) +
			scale_y_log10(
				breaks = c(10, 30, 50, 100, 300, 1000, 3000),
				labels = comma
			) +
			scale_x_continuous(breaks = seq(0, 1100, 100)) +
			labs(
				title = "Equal wall-clock budgets mostly buy short-delay samples",
				subtitle = "Projected retained samples from observed sample rates in the full 0-1100ms sweep",
				x = "Configured Playwright delay",
				y = "Projected retained samples, log scale",
				color = "Budget",
				shape = "Budget"
			),
		"131-wall-clock-equalized-sample-budget.png",
		width = 10,
		height = 6
	)
}

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

start_settle_summary_path <- file.path(data_dir, "typing-delay-start-settle-summary.csv")
if (file.exists(start_settle_summary_path)) {
	start_settle_summary <- read_csv(start_settle_summary_path, show_col_types = FALSE) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "10s", "60s")),
			delay_label = factor(paste0(delay_ms, "ms"), levels = paste0(sort(unique(delay_ms)), "ms")),
			sample_set = factor(sample_set, levels = c("throwaway first sample", "retained samples"))
		)

	start_settle_retained <- start_settle_summary %>%
		filter(sample_set == "retained samples")

	save_plot(
		ggplot(start_settle_retained, aes(delay_label, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.75
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Waiting before typing does not move the retained delay regimes",
				subtitle = "Large-post key-hold run; points are retained-sample p50s and bars are p10-p90",
				x = "Configured Playwright key-hold delay",
				y = "Latency (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"55-start-settle-retained-regimes.png",
		width = 9,
		height = 5.5
	)

	save_plot(
		ggplot(start_settle_summary, aes(delay_label, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.75
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			facet_wrap(~sample_set, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "The first sample after a delay is a different regime",
				subtitle = "Throwaway samples are fast even where retained samples are slow; start wait does not remove that",
				x = "Configured Playwright key-hold delay",
				y = "Latency p50 (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"56-start-settle-throwaway-vs-retained.png",
		width = 9,
		height = 7
	)
}

start_settle_fresh_summary_path <- file.path(data_dir, "typing-delay-start-settle-fresh-summary.csv")
if (file.exists(start_settle_fresh_summary_path)) {
	start_settle_fresh_summary <- read_csv(start_settle_fresh_summary_path, show_col_types = FALSE) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "10s", "60s")),
			delay_label = factor(paste0(delay_ms, "ms"), levels = paste0(sort(unique(delay_ms)), "ms")),
			sample_set = factor(sample_set, levels = c("throwaway first sample", "retained samples"))
		)

	start_settle_fresh_retained <- start_settle_fresh_summary %>%
		filter(sample_set == "retained samples")

	save_plot(
		ggplot(start_settle_fresh_retained, aes(delay_label, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.75
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Fresh-editor start waits still preserve the retained regimes",
				subtitle = "Fresh editor per delay; points are retained-sample p50s and bars are p10-p90",
				x = "Configured Playwright key-hold delay",
				y = "Latency (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"57-start-settle-fresh-retained-regimes.png",
		width = 9,
		height = 5.5
	)

	save_plot(
		ggplot(start_settle_fresh_summary, aes(delay_label, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.75
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			facet_wrap(~sample_set, ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Fresh-editor first samples cool down with longer start waits",
				subtitle = "The wait affects the first character more than the repeated key-hold regime",
				x = "Configured Playwright key-hold delay",
				y = "Latency p50 (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"58-start-settle-fresh-throwaway-vs-retained.png",
		width = 9,
		height = 7
	)
}

start_wait_first_char_summary_path <- file.path(data_dir, "typing-delay-start-wait-first-char-summary.csv")
if (file.exists(start_wait_first_char_summary_path)) {
	start_wait_first_char_summary <- read_csv(start_wait_first_char_summary_path, show_col_types = FALSE) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "1s", "5s", "10s", "30s", "60s"))
		)

	save_plot(
		ggplot(start_wait_first_char_summary, aes(settle_label, p50_ms, color = settle_label)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0.18, alpha = 0.78) +
			geom_point(size = 3.2) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE, guide = "none") +
			labs(
				title = "First character after setup slows as the start wait grows",
				subtitle = "Fresh editor per sample; first typed 1300ms key-hold character only; bars are p10-p90",
				x = "Wait after editor setup",
				y = "Latency p50 (ms)"
			),
		"59-start-wait-first-character-curve.png",
		width = 8,
		height = 5
	)

	start_wait_first_char_components <- start_wait_first_char_summary %>%
		select(settle_label, keydown_p50_ms, keypress_p50_ms, keyup_p50_ms) %>%
		pivot_longer(
			ends_with("_p50_ms"),
			names_to = "component",
			values_to = "p50_ms"
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
		ggplot(start_wait_first_char_components, aes(settle_label, p50_ms, color = component, shape = component)) +
			geom_point(size = 3.1, position = position_dodge(width = 0.45)) +
			facet_wrap(~component, ncol = 1, scales = "free_y") +
			scale_color_brewer(type = "qual", palette = "Set2", drop = FALSE, guide = "none") +
			labs(
				title = "Start wait changes the first keypress trace slice",
				subtitle = "Component p50s from six fresh-editor first-character samples at 1300ms",
				x = "Wait after editor setup",
				y = "Component p50 (ms)",
				shape = "Trace slice"
			),
		"60-start-wait-first-character-components.png",
		width = 8,
		height = 7
	)
}

start_wait_onset_summary_path <- file.path(data_dir, "typing-delay-start-wait-onset-summary.csv")
if (file.exists(start_wait_onset_summary_path)) {
	start_wait_onset <- read_csv(start_wait_onset_summary_path, show_col_types = FALSE) %>%
		mutate(
			wait_region = factor(
				case_when(
					settle_ms <= 50 ~ "0-50ms",
					settle_ms <= 1000 ~ "100ms-1s",
					TRUE ~ "1.5s-30s"
				),
				levels = c("0-50ms", "100ms-1s", "1.5s-30s")
			)
		)

	onset_breaks <- c(0, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000)
	onset_labels <- c("0", "50", "100", "250", "500", "1s", "2s", "5s", "10s", "30s")

	save_plot(
		ggplot(start_wait_onset, aes(settle_ms, p50_ms, color = wait_region, shape = wait_region)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0, alpha = 0.78) +
			geom_point(size = 3.1) +
			scale_x_continuous(
				trans = pseudo_log_trans(sigma = 100),
				breaks = onset_breaks,
				labels = onset_labels
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "The first-input idle penalty starts within hundreds of milliseconds",
				subtitle = "Fresh large-post first character at 1300ms; points are p50s and bars are p10-p90",
				x = "Wait after editor setup before typing",
				y = "Latency p50 (ms)",
				color = "Start-wait region",
				shape = "Start-wait region"
			),
		"68-start-wait-onset.png",
		width = 10,
		height = 5.5
	)

	save_plot(
		ggplot(start_wait_onset, aes(settle_ms, probability_sample_slower_than_0, color = wait_region, shape = wait_region)) +
			geom_hline(yintercept = 0.5, color = "gray65", linetype = "dashed") +
			geom_point(size = 3.1) +
			scale_x_continuous(
				trans = pseudo_log_trans(sigma = 100),
				breaks = onset_breaks,
				labels = onset_labels
			) +
			scale_y_continuous(labels = percent_format(accuracy = 1), limits = c(0.4, 1)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "By 250ms, almost every sample is slower than the 0ms control",
				subtitle = "Probability that a random sample at each start wait exceeds a random 0ms-start sample; 50% means no separation",
				x = "Wait after editor setup before typing",
				y = "Probability slower than 0ms control",
				color = "Start-wait region",
				shape = "Start-wait region"
			),
		"69-start-wait-onset-probability.png",
		width = 10,
		height = 5.5
	)
}

start_wait_sample_index_summary_path <- file.path(data_dir, "typing-delay-start-wait-sample-index-summary.csv")
if (file.exists(start_wait_sample_index_summary_path)) {
	start_wait_sample_index_summary <- read_csv(start_wait_sample_index_summary_path, show_col_types = FALSE) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "10s", "60s")),
			sample_label = factor(
				paste0("sample ", sample_index + 1),
				levels = paste0("sample ", sort(unique(sample_index)) + 1)
			)
		)

	save_plot(
		ggplot(start_wait_sample_index_summary, aes(sample_label, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.78
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Start wait mostly changes the first character",
				subtitle = "Fresh large-post editor; four consecutive 1300ms key-hold characters; bars are p10-p90",
				x = "Character within the measured burst",
				y = "Latency p50 (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"61-start-wait-sample-index.png",
		width = 9,
		height = 5.5
	)
}

start_wait_scenario_summary_path <- file.path(data_dir, "typing-delay-start-wait-scenario-first-char-summary.csv")
if (file.exists(start_wait_scenario_summary_path)) {
	start_wait_scenario_summary <- read_csv(start_wait_scenario_summary_path, show_col_types = FALSE) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "10s", "60s")),
			scenario_label = factor(
				scenario_label,
				levels = c("Native contenteditable", "Gutenberg empty post", "Gutenberg large post")
			)
		)

	save_plot(
		ggplot(start_wait_scenario_summary, aes(settle_label, p50_ms, color = scenario_label)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0.18, alpha = 0.78) +
			geom_point(size = 3.1) +
			facet_wrap(~scenario_label, ncol = 1, scales = "free_y") +
			scale_color_brewer(type = "qual", palette = "Set2", drop = FALSE, guide = "none") +
			labs(
				title = "Gutenberg workload amplifies first-input start-wait sensitivity",
				subtitle = "First 1300ms key-hold character after fresh setup; facets use separate y scales; bars are p10-p90",
				x = "Wait after setup",
				y = "Latency p50 (ms)"
			),
		"62-start-wait-scenario-controls.png",
		width = 8,
		height = 8
	)
}

start_wait_span_component_summary_path <- file.path(data_dir, "typing-delay-start-wait-span-component-summary.csv")
if (file.exists(start_wait_span_component_summary_path)) {
	start_wait_span_components <- read_csv(start_wait_span_component_summary_path, show_col_types = FALSE) %>%
		filter(
			component %in% c(
				"Browser EventDispatch latency",
				"Browser keypress trace slice",
				"RichText onInput total",
				"RichText registry.batch",
				"Data registry.batch root",
				"core/block-editor subscribers",
				"useSelect onChange",
				"useSelect mapSelect",
				"Browser keyup trace slice"
			)
		) %>%
		mutate(
			settle_label = factor(settle_label, levels = c("0s", "60s")),
			component = factor(
				component,
				levels = rev(c(
					"Browser EventDispatch latency",
					"Browser keypress trace slice",
					"RichText onInput total",
					"RichText registry.batch",
					"Data registry.batch root",
					"core/block-editor subscribers",
					"useSelect onChange",
					"useSelect mapSelect",
					"Browser keyup trace slice"
				))
			)
		)

	save_plot(
		ggplot(start_wait_span_components, aes(component, p50_ms, color = settle_label, shape = settle_label)) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 0.18,
				position = position_dodge(width = 0.55),
				alpha = 0.78
			) +
			geom_point(position = position_dodge(width = 0.55), size = 3) +
			coord_flip() +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Source spans show first-input work slows after a long start wait",
				subtitle = "Large-post first character at 1300ms; instrumentation changes absolute latency, so compare 0s vs 60s within this trace",
				x = NULL,
				y = "Duration p50 (ms)",
				color = "Wait after editor setup",
				shape = "Wait after editor setup"
			),
		"63-start-wait-source-span-components.png",
		width = 10,
		height = 6.5
	)
}

start_wait_span_component_delta_path <- file.path(data_dir, "typing-delay-start-wait-span-component-delta.csv")
if (file.exists(start_wait_span_component_delta_path)) {
	start_wait_span_deltas <- read_csv(start_wait_span_component_delta_path, show_col_types = FALSE) %>%
		filter(
			component %in% c(
				"Browser EventDispatch latency",
				"Browser keypress trace slice",
				"RichText onInput total",
				"RichText registry.batch",
				"Data registry.batch root",
				"core/block-editor subscribers",
				"useSelect onChange",
				"useSelect mapSelect",
				"Browser keyup trace slice"
			)
		) %>%
		mutate(
			component = fct_reorder(component, delta_ms),
			count_label = if_else(
				is.na(count_delta),
				"not counted",
				if_else(count_delta == 0, "same count", "count changed")
			)
		)

	save_plot(
		ggplot(start_wait_span_deltas, aes(component, delta_ms, color = count_label, shape = count_label)) +
			geom_hline(yintercept = 0, color = "gray65") +
			geom_point(size = 3.2) +
			coord_flip() +
			scale_color_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "The 60s start wait slows the same Gutenberg fanout",
				subtitle = "p50 delta from 0s to 60s in the large-post source-span trace; counted subscriber components keep the same count",
				x = NULL,
				y = "p50 delta (ms)",
				color = "Invocation count",
				shape = "Invocation count"
			),
		"64-start-wait-source-span-deltas.png",
		width = 10,
		height = 6
	)
}

start_wait_pretype_warmup_summary_path <- file.path(data_dir, "typing-delay-start-wait-pretype-warmup-summary.csv")
if (file.exists(start_wait_pretype_warmup_summary_path)) {
	start_wait_pretype_warmup <- read_csv(start_wait_pretype_warmup_summary_path, show_col_types = FALSE) %>%
		mutate(
			config_label = factor(
				config_label,
				levels = c(
					"0s wait",
					"0s + 1000ms warmup",
					"60s wait",
					"60s + 50ms warmup",
					"60s + 100ms warmup",
					"60s + 250ms warmup",
					"60s + 500ms warmup",
					"60s + 1000ms warmup"
				)
			),
			start_wait_label = factor(
				if_else(settle_ms == 0, "0s wait", "60s wait"),
				levels = c("0s wait", "60s wait")
			),
			warmup_label = factor(
				case_when(
					warmup_ms == 0 ~ "no warmup",
					warmup_ms == 50 ~ "50ms warmup",
					warmup_ms == 100 ~ "100ms warmup",
					warmup_ms == 250 ~ "250ms warmup",
					warmup_ms == 500 ~ "500ms warmup",
					warmup_ms == 1000 ~ "1000ms warmup",
					TRUE ~ paste0(warmup_ms, "ms warmup")
				),
				levels = c(
					"no warmup",
					"50ms warmup",
					"100ms warmup",
					"250ms warmup",
					"500ms warmup",
					"1000ms warmup"
				)
			)
		)

	save_plot(
		ggplot(start_wait_pretype_warmup, aes(config_label, p50_ms, color = start_wait_label, shape = warmup_label)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0.18, alpha = 0.78) +
			geom_point(size = 3.2) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Pre-typing main-thread warmup mostly removes the 60s first-input penalty",
				subtitle = "Fresh large-post first character at 1300ms; warmup runs after the configured start wait but before tracing and typing",
				x = NULL,
				y = "Latency p50 (ms)",
				color = "Start wait",
				shape = "Pre-typing warmup"
			) +
			theme(axis.text.x = element_text(angle = 25, hjust = 1)),
		"65-start-wait-pretype-warmup.png",
		width = 11,
		height = 5.8
	)

	warmup_dose_response <- start_wait_pretype_warmup %>%
		filter(settle_ms == 60000)
	reference_0s <- start_wait_pretype_warmup %>%
		filter(settle_ms == 0, warmup_ms == 0) %>%
		slice(1)
	reference_0s_warmup <- start_wait_pretype_warmup %>%
		filter(settle_ms == 0, warmup_ms == 1000) %>%
		slice(1)

	save_plot(
		ggplot(warmup_dose_response, aes(warmup_ms, p50_ms)) +
			geom_hline(
				data = reference_0s,
				aes(yintercept = p50_ms, color = "0s wait"),
				linetype = "dashed",
				linewidth = 0.6
			) +
			geom_hline(
				data = reference_0s_warmup,
				aes(yintercept = p50_ms, color = "0s + 1000ms warmup"),
				linetype = "dotted",
				linewidth = 0.7
			) +
			geom_errorbar(
				aes(ymin = p10_ms, ymax = p90_ms),
				width = 24,
				alpha = 0.78,
				color = "#1b9e77"
			) +
			geom_point(size = 3.2, color = "#1b9e77") +
			scale_x_continuous(breaks = c(0, 50, 100, 250, 500, 1000)) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Reference") +
			labs(
				title = "A short pre-typing warmup recovers most of the 60s idle penalty",
				subtitle = "Fresh large-post first character after a 60s start wait; points are p50s and bars are p10-p90",
				x = "Browser-main-thread warmup before tracing and typing (ms)",
				y = "Latency p50 (ms)"
			),
		"66-start-wait-pretype-warmup-dose-response.png",
		width = 9,
		height = 5.5
	)
}

start_wait_placement_summary_path <- file.path(data_dir, "typing-delay-start-wait-placement-summary.csv")
if (file.exists(start_wait_placement_summary_path)) {
	start_wait_placement <- read_csv(start_wait_placement_summary_path, show_col_types = FALSE) %>%
		mutate(
			placement_label = factor(
				placement_label,
				levels = c(
					"0s wait",
					"60s before setup",
					"60s after setup",
					"60s after setup + 50ms warmup",
					"60s after setup + 1000ms warmup"
				)
			),
			placement_kind = factor(
				case_when(
					before_setup_ms > 0 ~ "Idle before setup",
					after_setup_ms > 0 & warmup_ms == 0 ~ "Idle before typing",
					after_setup_ms > 0 & warmup_ms > 0 ~ "Idle, then immediate warmup",
					TRUE ~ "No added idle"
				),
				levels = c("No added idle", "Idle before setup", "Idle before typing", "Idle, then immediate warmup")
			)
		)

	save_plot(
		ggplot(start_wait_placement, aes(placement_label, p50_ms, color = placement_kind, shape = placement_kind)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0.18, alpha = 0.78) +
			geom_point(size = 3.2) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Idle hurts only when it is immediately before typing",
				subtitle = "Fresh large-post first character at 1300ms; a 60s idle before editor setup is erased by setup activity",
				x = NULL,
				y = "Latency p50 (ms)",
				color = "Placement",
				shape = "Placement"
			) +
			theme(axis.text.x = element_text(angle = 25, hjust = 1)),
		"67-start-wait-placement.png",
		width = 10.5,
		height = 5.8
	)
}

start_wait_timestamp_audit_summary_path <- file.path(data_dir, "typing-delay-start-wait-timestamp-audit-summary.csv")
start_wait_timestamp_audit_phases_path <- file.path(data_dir, "typing-delay-start-wait-timestamp-audit-phases.csv")
if (file.exists(start_wait_timestamp_audit_summary_path) && file.exists(start_wait_timestamp_audit_phases_path)) {
	timestamp_audit <- read_csv(start_wait_timestamp_audit_summary_path, show_col_types = FALSE) %>%
		mutate(
			placement_label = factor(
				placement_label,
				levels = c(
					"0ms control",
					"50ms after setup",
					"100ms after setup",
					"250ms after setup",
					"1000ms after setup",
					"1000ms before setup"
				)
			),
			placement_kind = factor(
				case_when(
					before_setup_ms > 0 ~ "Idle before setup",
					after_setup_ms > 0 ~ "Idle after setup",
					TRUE ~ "No added idle"
				),
				levels = c("No added idle", "Idle after setup", "Idle before setup")
			)
		)
	timestamp_phases <- read_csv(start_wait_timestamp_audit_phases_path, show_col_types = FALSE) %>%
		mutate(
			placement_label = factor(
				placement_label,
				levels = levels(timestamp_audit$placement_label)
			),
			phase = factor(
				phase,
				levels = c("pre-setup idle", "active editor setup", "post-setup idle", "setup-to-run gap")
			)
		)

	save_plot(
		ggplot(timestamp_phases, aes(placement_label, duration_p50_ms, fill = phase)) +
			geom_col(width = 0.72) +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "The configured wait is either before setup or after the editor is ready",
				subtitle = "Timestamp-audit p50 phase durations; run starts immediately after setupStopped when there is no pre-typing warmup",
				x = NULL,
				y = "p50 duration before measured input (ms)",
				fill = "Phase"
			) +
			theme(axis.text.x = element_text(angle = 25, hjust = 1)),
		"70-start-wait-timestamp-phases.png",
		width = 10.5,
		height = 5.8
	)

	save_plot(
		ggplot(timestamp_audit, aes(ready_to_run_p50_ms, latency_p50_ms, color = placement_kind, shape = placement_kind)) +
			geom_errorbar(aes(ymin = latency_p10_ms, ymax = latency_p90_ms), width = 18, alpha = 0.78) +
			geom_point(size = 3.2) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Latency follows idle after the editor is ready, not idle before setup",
				subtitle = "Fresh large-post first character at 1300ms; x axis is measured setupReady-to-runStart time",
				x = "Measured time from editor ready to run start (ms)",
				y = "Latency p50 (ms)",
				color = "Placement",
				shape = "Placement"
			),
		"71-start-wait-timestamp-latency.png",
		width = 8.5,
		height = 5.5
	)
}

ci_comparable_summary_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-summary.csv")
ci_comparable_samples_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-samples.csv")
ci_comparable_phases_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-phases.csv")
if (
	file.exists(ci_comparable_summary_path) &&
	file.exists(ci_comparable_samples_path) &&
	file.exists(ci_comparable_phases_path)
) {
	ci_comparable_summary <- read_csv(ci_comparable_summary_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(settle_after_editor_setup_ms, "ms"),
				levels = paste0(sort(settle_after_editor_setup_ms), "ms")
			)
		)
	ci_comparable_samples <- read_csv(ci_comparable_samples_path, show_col_types = FALSE) %>%
		filter(!is_throwaway) %>%
		mutate(
			wait_label = factor(
				paste0(settle_after_editor_setup_ms, "ms"),
				levels = levels(ci_comparable_summary$wait_label)
			)
		)
	ci_comparable_phases <- read_csv(ci_comparable_phases_path, show_col_types = FALSE) %>%
		pivot_longer(
			cols = c(
				pre_setup_idle_p50_ms,
				active_setup_p50_ms,
				post_setup_idle_p50_ms,
				setup_stop_to_run_start_p50_ms
			),
			names_to = "phase",
			values_to = "duration_p50_ms"
		) %>%
		mutate(
			wait_label = factor(
				paste0(settle_after_editor_setup_ms, "ms"),
				levels = levels(ci_comparable_summary$wait_label)
			),
			phase = factor(
				recode(
					phase,
					pre_setup_idle_p50_ms = "pre-setup idle",
					active_setup_p50_ms = "active CI-like setup",
					post_setup_idle_p50_ms = "post-setup idle",
					setup_stop_to_run_start_p50_ms = "setup-to-run gap"
				),
				levels = c("pre-setup idle", "active CI-like setup", "post-setup idle", "setup-to-run gap")
			)
		)

	save_plot(
		ggplot() +
			geom_jitter(
				data = ci_comparable_samples,
				aes(settle_after_editor_setup_ms, latency_ms),
				width = 18,
				height = 0,
				alpha = 0.32,
				size = 1.6,
				color = brewer_color("Greys", 6, type = "seq", n = 9)
			) +
			geom_errorbar(
				data = ci_comparable_summary,
				aes(
					x = settle_after_editor_setup_ms,
					ymin = latency_p10_ms,
					ymax = latency_p90_ms
				),
				width = 45,
				color = brewer_color("Dark2", 2)
			) +
			geom_point(
				data = ci_comparable_summary,
				aes(settle_after_editor_setup_ms, latency_p50_ms),
				size = 3.4,
				color = brewer_color("Dark2", 1)
			) +
			scale_x_continuous(
				breaks = ci_comparable_summary$settle_after_editor_setup_ms,
				labels = function(x) paste0(x, "ms")
			) +
			labs(
				title = "CI-comparable typing setup: retained samples overlap",
				subtitle = "Saved/reopened large-post draft; target.type() with 1000ms delay; points are retained samples, bars are p10-p90",
				x = "Extra wait after editor setup before target.type()",
				y = "Retained typing latency (ms)"
			),
		"72-ci-comparable-start-wait-latency.png",
		width = 10.5,
		height = 5.5
	)

	save_plot(
		ggplot(ci_comparable_phases, aes(wait_label, duration_p50_ms, fill = phase)) +
			geom_col(width = 0.72) +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "CI-comparable setup saves and reopens the large-post draft",
				subtitle = "Stacked p50 setup phases before the traced target.type() call",
				x = "Configured post-setup wait",
				y = "p50 duration before measured typing (ms)",
				fill = "Phase"
			),
		"73-ci-comparable-start-wait-phases.png",
		width = 8.5,
		height = 5.2
	)
}

ci_start_wait_curve_summary_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-summary.csv")
ci_start_wait_curve_samples_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-samples.csv")
ci_start_wait_curve_sample_index_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-sample-index-summary.csv")
ci_start_wait_curve_phases_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-phases.csv")
ci_start_wait_curve_draft_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-draft-summary.csv")
ci_start_wait_curve_sample_class_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-sample-class-summary.csv")
ci_start_wait_blocked_summary_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-blocked-summary.csv")
if (
	file.exists(ci_start_wait_curve_summary_path) &&
	file.exists(ci_start_wait_curve_sample_index_path) &&
	file.exists(ci_start_wait_curve_phases_path)
) {
	ci_start_wait_breaks <- c(0, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000)
	ci_start_wait_labels <- c("0", "50ms", "100ms", "250ms", "500ms", "1s", "2s", "5s", "10s", "30s", "60s")

	ci_start_wait_curve <- read_csv(ci_start_wait_curve_summary_path, show_col_types = FALSE)
	ci_start_wait_curve_long <- bind_rows(
		ci_start_wait_curve %>%
			transmute(
				settle_after_editor_setup_ms,
				metric = "retained CI metric",
				p10_ms = retained_latency_p10_ms,
				p50_ms = retained_latency_p50_ms,
				p90_ms = retained_latency_p90_ms
			),
		ci_start_wait_curve %>%
			transmute(
				settle_after_editor_setup_ms,
				metric = "discarded first character",
				p10_ms = throwaway_latency_p10_ms,
				p50_ms = throwaway_latency_p50_ms,
				p90_ms = throwaway_latency_p90_ms
			)
	) %>%
		mutate(
			metric = factor(metric, levels = c("retained CI metric", "discarded first character"))
		)

	save_plot(
		ggplot(ci_start_wait_curve_long, aes(settle_after_editor_setup_ms, p50_ms, color = metric, shape = metric)) +
			geom_errorbar(aes(ymin = p10_ms, ymax = p90_ms), width = 0, alpha = 0.78) +
			geom_point(size = 3.0) +
			facet_wrap(~metric, ncol = 1, scales = "free_y") +
			scale_x_continuous(
				trans = pseudo_log_trans(sigma = 100),
				breaks = ci_start_wait_breaks,
				labels = ci_start_wait_labels
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "CI-comparable retained typing is flat across start waits",
				subtitle = "Saved/reopened large-post draft; target.type() with 1000ms delay; points are p50s and bars are p10-p90",
				x = "Extra wait after editor setup before tracing and target.type()",
				y = "Latency (ms)",
				color = "Sample set",
				shape = "Sample set"
			) +
			theme(axis.text.x = element_text(angle = 35, hjust = 1)),
		"77-ci-comparable-start-wait-curve.png",
		width = 10.5,
		height = 7
	)

	ci_start_wait_sample_index <- read_csv(ci_start_wait_curve_sample_index_path, show_col_types = FALSE) %>%
		filter(settle_after_editor_setup_ms %in% c(0, 1000, 10000, 60000)) %>%
		mutate(
			wait_label = factor(
				case_when(
					settle_after_editor_setup_ms == 0 ~ "0",
					settle_after_editor_setup_ms == 1000 ~ "1s",
					settle_after_editor_setup_ms == 10000 ~ "10s",
					settle_after_editor_setup_ms == 60000 ~ "60s",
					TRUE ~ paste0(settle_after_editor_setup_ms, "ms")
				),
				levels = c("0", "1s", "10s", "60s")
			)
		)

	save_plot(
		ggplot(ci_start_wait_sample_index, aes(sample_index, latency_p50_ms, color = wait_label, shape = wait_label)) +
			geom_vline(xintercept = 0.5, linetype = "dashed", color = brewer_color("Greys", 6, type = "seq", n = 9)) +
			geom_line(linewidth = 0.65, alpha = 0.85) +
			geom_point(size = 2.7) +
			scale_x_continuous(
				breaks = 0:10,
				labels = c("0\nthrowaway", as.character(1:10))
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Only the beginning of the CI typing sequence is start-sensitive",
				subtitle = "Per-character p50s from 8 fresh CI-comparable drafts per wait; vertical line separates discarded and retained samples",
				x = "Character index within target.type()",
				y = "Latency p50 (ms)",
				color = "Start wait",
				shape = "Start wait"
			),
		"78-ci-comparable-start-wait-by-character.png",
		width = 10.5,
		height = 5.5
	)

	if (file.exists(ci_start_wait_curve_samples_path)) {
		ci_start_wait_keypress_samples <- read_csv(ci_start_wait_curve_samples_path, show_col_types = FALSE) %>%
			mutate(
				startup_wait_ms = settle_after_editor_setup_ms,
				keypress_index = sample_index + 1,
				keypress_label = factor(as.character(keypress_index), levels = as.character(1:11)),
				wait_label = factor(
					case_when(
						startup_wait_ms == 0 ~ "0",
						startup_wait_ms < 1000 ~ paste0(startup_wait_ms, "ms"),
						TRUE ~ paste0(startup_wait_ms / 1000, "s")
					),
					levels = ci_start_wait_labels
				),
				sample_class = factor(
					if_else(is_throwaway, "discarded first keypress", "retained keypress"),
					levels = c("discarded first keypress", "retained keypress")
				)
			)

		ci_start_wait_keypress_distribution <- ci_start_wait_keypress_samples %>%
			group_by(startup_wait_ms, wait_label, keypress_index, sample_index, sample_class) %>%
			summarize(
				n = n(),
				latency_p10_ms = quant(latency_ms, 0.1),
				latency_p25_ms = quant(latency_ms, 0.25),
				latency_p50_ms = median(latency_ms),
				latency_p75_ms = quant(latency_ms, 0.75),
				latency_p90_ms = quant(latency_ms, 0.9),
				latency_mean_ms = mean(latency_ms),
				latency_sd_ms = sd(latency_ms),
				latency_min_ms = min(latency_ms),
				latency_max_ms = max(latency_ms),
				.groups = "drop"
			)
		write_csv(
			ci_start_wait_keypress_distribution,
			file.path(data_dir, "typing-delay-ci-comparable-start-wait-keypress-distribution-summary.csv")
		)

		ci_start_wait_keypress_selected <- ci_start_wait_keypress_samples %>%
			filter(startup_wait_ms %in% c(0, 500, 1000, 2000, 5000, 60000)) %>%
			mutate(wait_label = fct_drop(wait_label))

		save_plot(
			ggplot(ci_start_wait_keypress_selected, aes(keypress_label, latency_ms, fill = sample_class)) +
				geom_vline(xintercept = 1.5, linetype = "dashed", color = brewer_color("Greys", 6, type = "seq", n = 9)) +
				geom_boxplot(outlier.shape = NA, width = 0.58, alpha = 0.62, color = brewer_color("Greys", 7, type = "seq", n = 9)) +
				geom_point(
					aes(color = sample_class),
					position = position_jitter(width = 0.13, height = 0, seed = 7),
					size = 1.0,
					alpha = 0.62,
					show.legend = FALSE
				) +
				facet_wrap(vars(wait_label), ncol = 2) +
				scale_x_discrete(labels = c("1\nthrowaway", as.character(2:11))) +
				scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "Latency distributions by keypress and startup wait",
					subtitle = "CI-comparable saved/reopened draft setup; n=8 runs per keypress/wait; dashed line separates the discarded first keypress",
					x = "Keypress within target.type()",
					y = "Latency (ms)",
					fill = "Sample class"
				) +
				theme(axis.text.x = element_text(size = 8)),
			"78b-ci-comparable-start-wait-keypress-distributions.png",
			width = 11,
			height = 8.6
		)

		save_plot(
			ggplot(ci_start_wait_keypress_distribution, aes(keypress_index, latency_p50_ms, color = sample_class, shape = sample_class)) +
				geom_vline(xintercept = 1.5, linetype = "dashed", color = brewer_color("Greys", 6, type = "seq", n = 9)) +
				geom_linerange(aes(ymin = latency_p10_ms, ymax = latency_p90_ms), alpha = 0.7, linewidth = 0.55) +
				geom_point(size = 1.8) +
				facet_wrap(vars(wait_label), ncol = 3) +
				scale_x_continuous(breaks = 1:11) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "Per-keypress distributions have the same shape across startup waits",
					subtitle = "Points are p50s and bars are p10-p90 across 8 CI-comparable runs per wait/key; keypress 1 is discarded by CI",
					x = "Keypress within target.type()",
					y = "Latency (ms)",
					color = "Sample class",
					shape = "Sample class"
				),
			"78c-ci-comparable-start-wait-keypress-p10-p90.png",
			width = 11.5,
			height = 8.6
		)

		ci_start_wait_first_three <- ci_start_wait_keypress_samples %>%
			filter(keypress_index <= 3) %>%
			mutate(
				keypress_name = factor(
					case_when(
						keypress_index == 1 ~ "keypress 1\n(discarded by CI)",
						keypress_index == 2 ~ "keypress 2\n(first retained)",
						keypress_index == 3 ~ "keypress 3\n(second retained)"
					),
					levels = c(
						"keypress 1\n(discarded by CI)",
						"keypress 2\n(first retained)",
						"keypress 3\n(second retained)"
					)
				)
			)

		ci_start_wait_first_three_summary <- ci_start_wait_first_three %>%
			group_by(startup_wait_ms, wait_label, keypress_index, keypress_name) %>%
			summarize(
				n = n(),
				latency_p10_ms = quant(latency_ms, 0.1),
				latency_p25_ms = quant(latency_ms, 0.25),
				latency_p50_ms = median(latency_ms),
				latency_p75_ms = quant(latency_ms, 0.75),
				latency_p90_ms = quant(latency_ms, 0.9),
				latency_mean_ms = mean(latency_ms),
				latency_sd_ms = sd(latency_ms),
				.groups = "drop"
			)
		write_csv(
			ci_start_wait_first_three_summary,
			file.path(data_dir, "typing-delay-ci-comparable-start-wait-first-three-keypresses.csv")
		)

		save_plot(
			ggplot(ci_start_wait_first_three, aes(wait_label, latency_ms)) +
				geom_point(
					aes(color = keypress_name),
					position = position_jitter(width = 0.12, height = 0, seed = 23),
					size = 1.5,
					alpha = 0.62,
					show.legend = FALSE
				) +
				geom_linerange(
					data = ci_start_wait_first_three_summary,
					aes(x = wait_label, ymin = latency_p10_ms, ymax = latency_p90_ms),
					color = brewer_color("Greys", 7, type = "seq", n = 9),
					linewidth = 0.62,
					inherit.aes = FALSE
				) +
				geom_point(
					data = ci_start_wait_first_three_summary,
					aes(wait_label, latency_p50_ms),
					shape = 95,
					size = 7,
					color = brewer_color("Set1", 1),
					inherit.aes = FALSE
				) +
				facet_wrap(vars(keypress_name), ncol = 1) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "The first three keypresses explain the startup-wait caveat",
					subtitle = "CI-comparable saved/reopened drafts; raw points are 8 runs per wait/key; red ticks are p50 and grey bars are p10-p90",
					x = "Extra wait after editor setup before typing starts",
					y = "Latency (ms)"
				) +
				theme(axis.text.x = element_text(angle = 35, hjust = 1)),
			"78e-ci-comparable-start-wait-first-three-keypresses.png",
			width = 10.5,
			height = 8.4
		)

		ci_start_wait_discard_policy <- crossing(
			discard_initial_keypresses = 0:4,
			ci_start_wait_keypress_samples
		) %>%
			filter(sample_index >= discard_initial_keypresses) %>%
			group_by(
				startup_wait_ms,
				wait_label,
				discard_initial_keypresses,
				run_id,
				round,
				editor_setup_index
			) %>%
			summarize(
				retained_keypresses = n(),
				run_latency_p50_ms = median(latency_ms),
				run_latency_mean_ms = mean(latency_ms),
				run_latency_p90_ms = quant(latency_ms, 0.9),
				.groups = "drop"
			) %>%
			group_by(startup_wait_ms, wait_label, discard_initial_keypresses) %>%
			summarize(
				run_count = n(),
				retained_keypresses = median(retained_keypresses),
				reported_q50_median_ms = median(run_latency_p50_ms),
				reported_q50_sd_ms = sd(run_latency_p50_ms),
				reported_mean_median_ms = median(run_latency_mean_ms),
				reported_p90_median_ms = median(run_latency_p90_ms),
				.groups = "drop"
			)
		write_csv(
			ci_start_wait_discard_policy,
			file.path(data_dir, "typing-delay-ci-comparable-start-wait-discard-policy-summary.csv")
		)

		ci_start_wait_discard_policy_plot <- ci_start_wait_discard_policy %>%
			filter(startup_wait_ms %in% c(0, 500, 1000, 2000, 5000, 60000)) %>%
			mutate(
				wait_label = fct_drop(wait_label),
				discard_label = factor(
					discard_initial_keypresses,
					levels = 0:4,
					labels = c("0", "1\ncurrent", "2", "3", "4")
				)
			) %>%
			select(
				wait_label,
				discard_label,
				`reported q50 median (ms)` = reported_q50_median_ms,
				`reported mean median (ms)` = reported_mean_median_ms,
				`reported p90 median (ms)` = reported_p90_median_ms,
				`run-to-run q50 sd (ms)` = reported_q50_sd_ms
			) %>%
			pivot_longer(
				cols = -c(wait_label, discard_label),
				names_to = "metric",
				values_to = "value"
			) %>%
			mutate(
				metric = factor(
					metric,
					levels = c(
						"reported q50 median (ms)",
						"reported mean median (ms)",
						"reported p90 median (ms)",
						"run-to-run q50 sd (ms)"
					)
				)
			)

		save_plot(
			ggplot(ci_start_wait_discard_policy_plot, aes(discard_label, value, color = wait_label, shape = wait_label)) +
				geom_point(size = 2.4, alpha = 0.9) +
				facet_wrap(vars(metric), ncol = 2, scales = "free_y") +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "Discard policy changes tails more than the reported q50",
					subtitle = "CI-comparable start-wait curve; each point summarizes 8 saved/reopened drafts per wait",
					x = "Initial keypresses discarded before computing the run metric",
					y = NULL,
					color = "Start wait",
					shape = "Start wait"
				),
			"78d-ci-comparable-start-wait-discard-policy.png",
			width = 10.8,
			height = 7
		)
	}

	ci_start_wait_phases <- read_csv(ci_start_wait_curve_phases_path, show_col_types = FALSE) %>%
		select(
			settle_after_editor_setup_ms,
			active_setup_p50_ms,
			post_setup_idle_p50_ms,
			setup_stop_to_run_start_p50_ms
		) %>%
		pivot_longer(
			cols = c(active_setup_p50_ms, post_setup_idle_p50_ms, setup_stop_to_run_start_p50_ms),
			names_to = "phase",
			values_to = "duration_ms"
		) %>%
		mutate(
			wait_label = factor(
				case_when(
					settle_after_editor_setup_ms == 0 ~ "0",
					settle_after_editor_setup_ms < 1000 ~ paste0(settle_after_editor_setup_ms, "ms"),
					TRUE ~ paste0(settle_after_editor_setup_ms / 1000, "s")
				),
				levels = ci_start_wait_labels
			),
			phase = factor(
				recode(
					phase,
					active_setup_p50_ms = "active CI-like setup",
					post_setup_idle_p50_ms = "post-setup idle",
					setup_stop_to_run_start_p50_ms = "setup-to-run gap"
				),
				levels = c("active CI-like setup", "post-setup idle", "setup-to-run gap")
			),
			duration_s = duration_ms / 1000
		)

	save_plot(
		ggplot(ci_start_wait_phases, aes(wait_label, duration_s, fill = phase)) +
			geom_col(width = 0.72) +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "Starting later costs wall time, not measured typing time",
				subtitle = "Stacked p50 setup phases before the traced target.type() call",
				x = "Configured post-setup wait",
				y = "p50 duration before measured typing (s)",
				fill = "Phase"
			),
		"79-ci-comparable-start-wait-phases.png",
		width = 10.5,
		height = 5.5
	)

	if (file.exists(ci_start_wait_curve_draft_path)) {
		ci_start_wait_draft <- read_csv(ci_start_wait_curve_draft_path, show_col_types = FALSE)

		save_plot(
			ggplot(ci_start_wait_draft, aes(settle_after_editor_setup_ms, retained_latency_p50_ms)) +
				geom_jitter(width = 0, height = 0, size = 2.2, alpha = 0.72, color = brewer_color("Dark2", 1)) +
				stat_summary(fun = median, geom = "point", size = 4.1, color = brewer_color("Set1", 1), shape = 95) +
				scale_x_continuous(
					trans = pseudo_log_trans(sigma = 100),
					breaks = ci_start_wait_breaks,
					labels = ci_start_wait_labels
				) +
				labs(
					title = "Per-draft retained medians do not trend with start wait",
					subtitle = "Each point is one fresh saved/reopened draft; red ticks are medians across drafts",
					x = "Extra wait after editor setup before tracing and target.type()",
					y = "Per-draft retained latency p50 (ms)"
				) +
				theme(axis.text.x = element_text(angle = 35, hjust = 1)),
			"80-ci-comparable-start-wait-per-draft.png",
			width = 10.5,
			height = 5.5
		)
	}

	if (file.exists(ci_start_wait_curve_sample_class_path)) {
		ci_start_wait_sample_class <- read_csv(ci_start_wait_curve_sample_class_path, show_col_types = FALSE) %>%
			filter(sample_class != "retained aggregate") %>%
			mutate(
				sample_class = factor(
					sample_class,
					levels = c("discarded first character", "first retained character", "retained characters 2-10")
				)
			)

		save_plot(
			ggplot(ci_start_wait_sample_class, aes(settle_after_editor_setup_ms, latency_p50_ms, color = sample_class, shape = sample_class)) +
				geom_errorbar(aes(ymin = latency_p10_ms, ymax = latency_p90_ms), width = 0, alpha = 0.72) +
				geom_point(size = 3.0) +
				facet_wrap(~sample_class, ncol = 1, scales = "free_y") +
				scale_x_continuous(
					trans = pseudo_log_trans(sigma = 100),
					breaks = ci_start_wait_breaks,
					labels = ci_start_wait_labels
				) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "The retained aggregate mixes two different sample classes",
					subtitle = "Points are p50s and bars are p10-p90 across all fresh drafts at each start wait",
					x = "Extra wait after editor setup before tracing and target.type()",
					y = "Latency (ms)",
					color = "Sample class",
					shape = "Sample class"
				) +
				theme(axis.text.x = element_text(angle = 35, hjust = 1)),
			"81-ci-comparable-start-wait-sample-classes.png",
			width = 10.5,
			height = 7
		)
	}

	if (file.exists(ci_start_wait_blocked_summary_path)) {
		ci_start_wait_blocked <- read_csv(ci_start_wait_blocked_summary_path, show_col_types = FALSE) %>%
			mutate(
				wait_label = factor(
					if_else(settle_after_editor_setup_ms == 0, "0ms", "60s"),
					levels = c("0ms", "60s")
				),
				block_label = factor(
					paste0(block_index, ": ", wait_label),
					levels = paste0(block_index, ": ", wait_label)
				)
			)

		save_plot(
			ggplot(ci_start_wait_blocked, aes(block_label, retained_latency_p50_ms, color = wait_label, shape = wait_label)) +
				geom_point(size = 3.5) +
				geom_errorbar(aes(ymin = retained_latency_p10_ms, ymax = retained_latency_p90_ms), width = 0.16, alpha = 0.78) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "Blocked extreme starts confirm the wait-order result",
					subtitle = "Order was 60s, 0ms, 60s, 0ms; four fresh drafts per block",
					x = "Block order and post-setup wait",
					y = "Retained typing latency (ms)",
					color = "Start wait",
					shape = "Start wait"
				),
			"82-ci-comparable-start-wait-blocked-extremes.png",
			width = 8.5,
			height = 5.2
		)
	}
}

post_editor_exact_summary_path <- file.path(data_dir, "typing-delay-post-editor-ci-start-wait-exact-summary.csv")
post_editor_exact_samples_path <- file.path(data_dir, "typing-delay-post-editor-ci-start-wait-exact-samples.csv")
if (file.exists(post_editor_exact_summary_path) && file.exists(post_editor_exact_samples_path)) {
	post_editor_exact_summary <- read_csv(post_editor_exact_summary_path, show_col_types = FALSE) %>%
		mutate(
			run_label = case_when(
				typing_start_wait_phase == "after-trace" ~ "trace starts\nbefore 60s wait",
				typing_start_wait_ms == 0 ~ paste0("block ", block_index, "\n0ms"),
				TRUE ~ paste0("block ", block_index, "\n60s")
			),
			run_label = factor(run_label, levels = run_label),
			wait_label = factor(
				case_when(
					typing_start_wait_phase == "after-trace" ~ "60s after trace starts",
					typing_start_wait_ms == 0 ~ "0ms before trace",
					TRUE ~ "60s before trace"
				),
				levels = c("0ms before trace", "60s before trace", "60s after trace starts")
			)
		)
	post_editor_exact_samples <- read_csv(post_editor_exact_samples_path, show_col_types = FALSE) %>%
		mutate(
			run_label = case_when(
				typing_start_wait_phase == "after-trace" ~ "trace starts\nbefore 60s wait",
				typing_start_wait_ms == 0 ~ paste0("block ", block_index, "\n0ms"),
				TRUE ~ paste0("block ", block_index, "\n60s")
			),
			run_label = factor(run_label, levels = levels(post_editor_exact_summary$run_label)),
			wait_label = factor(
				case_when(
					typing_start_wait_phase == "after-trace" ~ "60s after trace starts",
					typing_start_wait_ms == 0 ~ "0ms before trace",
					TRUE ~ "60s before trace"
				),
				levels = levels(post_editor_exact_summary$wait_label)
			)
		)

	save_plot(
		ggplot() +
			geom_jitter(
				data = post_editor_exact_samples,
				aes(run_label, latency_ms, color = wait_label),
				width = 0.08,
				height = 0,
				alpha = 0.38,
				size = 1.9
			) +
			geom_errorbar(
				data = post_editor_exact_summary,
				aes(run_label, ymin = latency_p10_ms, ymax = latency_p90_ms, color = wait_label),
				width = 0.16,
				linewidth = 0.7
			) +
			geom_point(
				data = post_editor_exact_summary,
				aes(run_label, latency_p50_ms, color = wait_label, shape = wait_label),
				size = 3.4
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "The exact post-editor Typing test also does not depend on start wait",
				subtitle = "Actual post-editor.spec.js Typing setup/run tests; points are retained samples, bars are p10-p90",
				x = "Run order and wait placement",
				y = "Retained typing latency (ms)",
				color = "Start wait",
				shape = "Start wait"
			),
		"83-post-editor-ci-start-wait-exact.png",
		width = 9.5,
		height = 5.4
	)
}

post_editor_randomized_summary_path <- file.path(data_dir, "typing-delay-post-editor-ci-start-wait-randomized-exact-summary.csv")
post_editor_randomized_samples_path <- file.path(data_dir, "typing-delay-post-editor-ci-start-wait-randomized-exact-samples.csv")
if (file.exists(post_editor_randomized_summary_path) && file.exists(post_editor_randomized_samples_path)) {
	post_editor_randomized_summary <- read_csv(post_editor_randomized_summary_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(if_else(typing_start_wait_ms >= 1000, paste0(typing_start_wait_ms / 1000, "s"), paste0(typing_start_wait_ms, "ms")), " before trace"),
				levels = c("0ms before trace", "1s before trace", "60s before trace")
			),
			run_order_label = factor(
				paste0("r", str_pad(run_order, 2, pad = "0"), "\n", str_remove(as.character(wait_label), " before trace")),
				levels = paste0("r", str_pad(run_order, 2, pad = "0"), "\n", str_remove(as.character(wait_label), " before trace"))
			)
		)
	post_editor_randomized_samples <- read_csv(post_editor_randomized_samples_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(if_else(typing_start_wait_ms >= 1000, paste0(typing_start_wait_ms / 1000, "s"), paste0(typing_start_wait_ms, "ms")), " before trace"),
				levels = levels(post_editor_randomized_summary$wait_label)
			),
			run_order_label = factor(
				paste0("r", str_pad(run_order, 2, pad = "0"), "\n", str_remove(as.character(wait_label), " before trace")),
				levels = levels(post_editor_randomized_summary$run_order_label)
			)
		)

	set.seed(51383)
	save_plot(
		ggplot() +
			geom_jitter(
				data = post_editor_randomized_samples,
				aes(run_order_label, latency_ms, color = wait_label),
				width = 0.08,
				height = 0,
				alpha = 0.35,
				size = 1.65
			) +
			geom_errorbar(
				data = post_editor_randomized_summary,
				aes(run_order_label, ymin = latency_p10_ms, ymax = latency_p90_ms, color = wait_label),
				width = 0.16,
				linewidth = 0.7
			) +
			geom_point(
				data = post_editor_randomized_summary,
				aes(run_order_label, latency_p50_ms, color = wait_label, shape = wait_label),
				size = 3
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Randomized exact post-editor Typing runs still show no start-wait penalty",
				subtitle = "Actual post-editor.spec.js Typing setup/run tests; points are retained samples, bars are p10-p90",
				x = "Randomized run order and post-setup wait",
				y = "Retained typing latency (ms)",
				color = "Start wait",
				shape = "Start wait"
			),
		"84-post-editor-ci-start-wait-randomized-exact.png",
		width = 10,
		height = 5.6
	)

	set.seed(51384)
	save_plot(
		ggplot(post_editor_randomized_summary, aes(wait_label, latency_p50_ms, color = wait_label)) +
			geom_jitter(aes(shape = wait_label), width = 0.09, height = 0, size = 3.1, alpha = 0.85) +
			stat_summary(
				fun = median,
				geom = "crossbar",
				width = 0.45,
				linewidth = 0.55,
				color = brewer_color("Greys", 8, type = "seq", n = 9),
				fill = NA
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "The randomized exact effect size is below run-to-run volatility",
				subtitle = "Each point is one exact post-editor.spec.js Typing invocation; crossbars are condition medians",
				x = "Post-setup wait before tracing and typing",
				y = "Per-run retained p50 (ms)",
				color = "Start wait",
				shape = "Start wait"
			),
		"85-post-editor-ci-start-wait-randomized-effect.png",
		width = 7.6,
		height = 5.2
	)
}

typing_delay_startup_summary_path <- file.path(data_dir, "typing-delay-post-editor-typing-delay-startup-grid-summary.csv")
if (file.exists(typing_delay_startup_summary_path)) {
	typing_delay_startup_summary <- read_csv(typing_delay_startup_summary_path, show_col_types = FALSE) %>%
		mutate(
			typing_delay_label = factor(
				paste0(typing_delay_ms, "ms typing delay"),
				levels = paste0(sort(unique(typing_delay_ms)), "ms typing delay")
			),
			startup_wait_label = factor(
				paste0(startup_wait_ms, "ms"),
				levels = paste0(sort(unique(startup_wait_ms)), "ms")
			)
		)

	save_plot(
		ggplot(typing_delay_startup_summary, aes(startup_wait_label, typing_delay_label, fill = latency_p50_ms)) +
			geom_tile(color = "white", linewidth = 0.35) +
			geom_text(aes(label = sprintf("%.1f", latency_p50_ms)), size = 3.1) +
			scale_fill_distiller(type = "seq", palette = "YlOrRd", direction = 1) +
			labs(
				title = "Typing delay dominates the independent startup-wait grid",
				subtitle = "Exact post-editor.spec.js Typing metric; one run per cell, 10 retained samples per run",
				x = "Startup wait before tracing and typing",
				y = "Delay between typed characters",
				fill = "Retained p50 (ms)"
			),
		"86-post-editor-typing-delay-startup-grid-heatmap.png",
		width = 9.8,
		height = 5.8
	)

	save_plot(
		ggplot(typing_delay_startup_summary, aes(startup_wait_ms, latency_p50_ms, color = typing_delay_label, shape = typing_delay_label)) +
			geom_point(size = 2.7, alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_x_continuous(
				trans = scales::pseudo_log_trans(sigma = 100),
				breaks = sort(unique(typing_delay_startup_summary$startup_wait_ms)),
				labels = function(x) paste0(x, "ms")
			) +
			facet_wrap(vars(typing_delay_label), ncol = 1, scales = "free_y") +
			labs(
				title = "Startup wait has no single trend once typing delay is held fixed",
				subtitle = "Scatter only: each point is one exact CI-shaped Typing invocation",
				x = "Startup wait before tracing and typing",
				y = "Retained typing p50 (ms)"
			) +
			theme(
				legend.position = "none",
				axis.text.x = element_text(angle = 35, hjust = 1)
			),
		"87-post-editor-typing-delay-startup-grid-scatter.png",
		width = 9.8,
		height = 8.5
	)

	save_plot(
		ggplot(typing_delay_startup_summary, aes(startup_wait_label, typing_delay_label, fill = suite_elapsed_s)) +
			geom_tile(color = "white", linewidth = 0.35) +
			geom_text(aes(label = sprintf("%.1f", suite_elapsed_s)), size = 3.1) +
			scale_fill_distiller(type = "seq", palette = "Blues", direction = 1) +
			labs(
				title = "Elapsed time rises with both independent waits",
				subtitle = "Elapsed seconds for the exact post-editor Typing setup/run pair",
				x = "Startup wait before tracing and typing",
				y = "Delay between typed characters",
				fill = "Elapsed (s)"
			),
		"88-post-editor-typing-delay-startup-grid-elapsed.png",
		width = 9.8,
		height = 5.8
	)

	save_plot(
		ggplot(typing_delay_startup_summary, aes(startup_wait_label, typing_delay_label, fill = latency_mean_ms)) +
			geom_tile(color = "white", linewidth = 0.35) +
			geom_text(aes(label = sprintf("%.1f", latency_mean_ms)), size = 3.1) +
			scale_fill_distiller(type = "seq", palette = "PuBu", direction = 1) +
			labs(
				title = "Mean latency is diagnostic, but CI reports q50",
				subtitle = "Exact post-editor.spec.js Typing metric; one run per cell, 10 retained samples per run",
				x = "Startup wait before tracing and typing",
				y = "Delay between typed characters",
				fill = "Retained mean (ms)"
			),
		"89-post-editor-typing-delay-startup-grid-mean.png",
		width = 9.8,
		height = 5.8
	)

	save_plot(
		ggplot(typing_delay_startup_summary, aes(startup_wait_label, typing_delay_label, fill = latency_cv)) +
			geom_tile(color = "white", linewidth = 0.35) +
			geom_text(aes(label = percent(latency_cv, accuracy = 1)), size = 3.1) +
			scale_fill_distiller(type = "seq", palette = "YlGnBu", direction = 1, labels = percent_format(accuracy = 1)) +
			labs(
				title = "Startup wait does not remove within-cell volatility",
				subtitle = "Coefficient of variation for each exact Typing run; lower is more repeatable",
				x = "Startup wait before tracing and typing",
				y = "Delay between typed characters",
				fill = "CV"
			),
		"90-post-editor-typing-delay-startup-grid-volatility.png",
		width = 9.8,
		height = 5.8
	)

	startup_wait_runtime_model <- tibble(
		startup_wait_ms = c(0, 50, 100, 250, 500, 750, 1000, 1500, 2000, 5000, 10000, 30000, 60000),
		explicit_wait_occurrences_per_branch = 76,
		normal_ci_compared_branches = 2
	) %>%
		mutate(
			per_branch_explicit_wait_s = explicit_wait_occurrences_per_branch * startup_wait_ms / 1000,
			per_branch_change_vs_current_s = per_branch_explicit_wait_s - explicit_wait_occurrences_per_branch,
			per_branch_saved_vs_current_s = explicit_wait_occurrences_per_branch - per_branch_explicit_wait_s,
			two_branch_ci_explicit_wait_s = normal_ci_compared_branches * per_branch_explicit_wait_s,
			two_branch_ci_change_vs_current_s = normal_ci_compared_branches * per_branch_change_vs_current_s,
			two_branch_ci_saved_vs_current_s = normal_ci_compared_branches * per_branch_saved_vs_current_s,
			two_branch_ci_change_vs_current_min = two_branch_ci_change_vs_current_s / 60,
			two_branch_ci_saved_vs_current_min = two_branch_ci_saved_vs_current_s / 60
		)
	write_csv(startup_wait_runtime_model, file.path(data_dir, "typing-delay-ci-startup-wait-runtime-model.csv"))

	startup_wait_runtime_plot <- startup_wait_runtime_model %>%
		filter(startup_wait_ms <= 5000) %>%
		mutate(
			startup_wait_label = factor(paste0(startup_wait_ms, "ms"), levels = paste0(startup_wait_ms, "ms")),
			label_vjust = if_else(two_branch_ci_change_vs_current_s > 0, -0.35, 1.15)
		)

	save_plot(
		ggplot(
			startup_wait_runtime_plot,
			aes(
				x = startup_wait_label,
				y = two_branch_ci_change_vs_current_s,
				fill = two_branch_ci_change_vs_current_s > 0
			)
		) +
			geom_hline(yintercept = 0, color = brewer_color("Greys", 7, type = "seq", n = 9), linewidth = 0.35) +
			geom_col(width = 0.72) +
			geom_text(
				aes(label = sprintf("%+.0fs", two_branch_ci_change_vs_current_s), vjust = label_vjust),
				size = 3.2
			) +
			scale_fill_brewer(type = "qual", palette = "Set1", guide = "none") +
			labs(
				title = "Explicit CI startup sleeps have a linear job-level cost",
				subtitle = "Normal PR/push comparisons run two branches; post/site editor specs contain 76 explicit waits per branch",
				x = "Explicit pre-measurement startup wait",
				y = "Two-branch CI job change vs current 1000ms setting (s)"
			),
		"91-ci-startup-wait-runtime-model.png",
		width = 9.4,
		height = 5.2
	)

	startup_wait_reliability_current_delay <- typing_delay_startup_summary %>%
		filter(typing_delay_ms == 1000) %>%
		transmute(
			startup_wait_ms,
			current_typing_delay_ms = typing_delay_ms,
			current_typing_delay_ci_q50_ms = latency_p50_ms,
			current_typing_delay_mean_ms = latency_mean_ms,
			current_typing_delay_cv = latency_cv,
			current_typing_delay_p10_p90_width_ms = latency_p90_ms - latency_p10_ms,
			current_typing_delay_exact_elapsed_s = suite_elapsed_s
		)
	startup_wait_reliability_all_delays <- typing_delay_startup_summary %>%
		group_by(startup_wait_ms) %>%
		summarize(
			tested_typing_delay_cells = n(),
			all_delay_ci_q50_median_ms = median(latency_p50_ms),
			all_delay_ci_q50_range_ms = max(latency_p50_ms) - min(latency_p50_ms),
			all_delay_cv_median = median(latency_cv),
			all_delay_cv_max = max(latency_cv),
			all_delay_p10_p90_width_median_ms = median(latency_p90_ms - latency_p10_ms),
			.groups = "drop"
		)
	startup_wait_run_to_run <- if (exists("post_editor_randomized_summary")) {
		post_editor_randomized_summary %>%
			group_by(startup_wait_ms = typing_start_wait_ms) %>%
			summarize(
				run_to_run_exact_runs = n(),
				run_to_run_ci_q50_sd_ms = sd(latency_p50_ms),
				run_to_run_ci_q50_range_ms = max(latency_p50_ms) - min(latency_p50_ms),
				run_to_run_suite_elapsed_median_s = median(suite_elapsed_s),
				.groups = "drop"
			)
	} else {
		tibble(
			startup_wait_ms = numeric(),
			run_to_run_exact_runs = numeric(),
			run_to_run_ci_q50_sd_ms = numeric(),
			run_to_run_ci_q50_range_ms = numeric(),
			run_to_run_suite_elapsed_median_s = numeric()
		)
	}
	startup_wait_run_to_run_ci_comparable_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-draft-summary.csv")
	startup_wait_run_to_run_ci_comparable <- if (file.exists(startup_wait_run_to_run_ci_comparable_path)) {
		read_csv(startup_wait_run_to_run_ci_comparable_path, show_col_types = FALSE) %>%
			group_by(startup_wait_ms = settle_after_editor_setup_ms) %>%
			summarize(
				ci_comparable_runs = n(),
				ci_comparable_q50_median_ms = median(retained_latency_p50_ms),
				ci_comparable_q50_mean_ms = mean(retained_latency_p50_ms),
				ci_comparable_q50_sd_ms = sd(retained_latency_p50_ms),
				ci_comparable_q50_range_ms = max(retained_latency_p50_ms) - min(retained_latency_p50_ms),
				ci_comparable_mean_median_ms = median(retained_latency_mean_ms),
				ci_comparable_run_duration_median_s = median(run_duration_ms) / 1000,
				.groups = "drop"
			)
	} else {
		tibble(
			startup_wait_ms = numeric(),
			ci_comparable_runs = numeric(),
			ci_comparable_q50_median_ms = numeric(),
			ci_comparable_q50_mean_ms = numeric(),
			ci_comparable_q50_sd_ms = numeric(),
			ci_comparable_q50_range_ms = numeric(),
			ci_comparable_mean_median_ms = numeric(),
			ci_comparable_run_duration_median_s = numeric()
		)
	}

	startup_wait_tradeoff <- startup_wait_runtime_model %>%
		left_join(startup_wait_reliability_current_delay, by = "startup_wait_ms") %>%
		left_join(startup_wait_reliability_all_delays, by = "startup_wait_ms") %>%
		left_join(startup_wait_run_to_run, by = "startup_wait_ms") %>%
		left_join(startup_wait_run_to_run_ci_comparable, by = "startup_wait_ms") %>%
		mutate(
			filled_run_to_run_runs = coalesce(ci_comparable_runs, run_to_run_exact_runs),
			filled_run_to_run_q50_sd_ms = coalesce(ci_comparable_q50_sd_ms, run_to_run_ci_q50_sd_ms),
			filled_run_to_run_q50_range_ms = coalesce(ci_comparable_q50_range_ms, run_to_run_ci_q50_range_ms),
			filled_run_to_run_source = case_when(
				!is.na(ci_comparable_q50_sd_ms) ~ "CI-comparable saved/reopened draft curve",
				!is.na(run_to_run_ci_q50_sd_ms) ~ "exact post-editor randomized run",
				TRUE ~ NA_character_
			)
		)
	write_csv(startup_wait_tradeoff, file.path(data_dir, "typing-delay-ci-startup-wait-runtime-reliability.csv"))

	startup_wait_tradeoff_plot <- startup_wait_tradeoff %>%
		filter(startup_wait_ms <= 5000) %>%
		mutate(startup_wait_label = factor(paste0(startup_wait_ms, "ms"), levels = paste0(startup_wait_ms, "ms"))) %>%
		select(
			startup_wait_ms,
			startup_wait_label,
			`Two-branch CI runtime delta vs current (s)` = two_branch_ci_change_vs_current_s,
			`CI q50 at current 1000ms typing delay (ms)` = current_typing_delay_ci_q50_ms,
			`CV at current 1000ms typing delay (%)` = current_typing_delay_cv,
			`Median CV across tested typing delays (%)` = all_delay_cv_median
		) %>%
		mutate(
			`CV at current 1000ms typing delay (%)` = 100 * `CV at current 1000ms typing delay (%)`,
			`Median CV across tested typing delays (%)` = 100 * `Median CV across tested typing delays (%)`
		) %>%
		pivot_longer(
			cols = -c(startup_wait_ms, startup_wait_label),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"Two-branch CI runtime delta vs current (s)",
					"CI q50 at current 1000ms typing delay (ms)",
					"CV at current 1000ms typing delay (%)",
					"Median CV across tested typing delays (%)"
				)
			),
			value_label = case_when(
				str_detect(as.character(metric), "runtime") ~ sprintf("%+.0fs", value),
				str_detect(as.character(metric), "%") ~ sprintf("%.0f%%", value),
				TRUE ~ sprintf("%.1f", value)
			)
		)
	startup_wait_tradeoff_hline <- tibble(
		metric = factor(
			"Two-branch CI runtime delta vs current (s)",
			levels = levels(startup_wait_tradeoff_plot$metric)
		),
		yintercept = 0
	)

	save_plot(
		ggplot(startup_wait_tradeoff_plot, aes(startup_wait_label, value, color = metric)) +
			geom_hline(
				data = startup_wait_tradeoff_hline,
				aes(yintercept = yintercept),
				color = brewer_color("Greys", 7, type = "seq", n = 9),
				linewidth = 0.35
			) +
			geom_point(size = 2.9, alpha = 0.9) +
			geom_text(aes(label = value_label), vjust = -0.7, size = 2.8, show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", guide = "none") +
			scale_y_continuous(expand = expansion(mult = c(0.12, 0.2))) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "Startup-wait runtime and reliability tradeoff",
				subtitle = "Runtime is deterministic; q50/CV are from exact post-editor Typing runs with independent startup waits",
				x = "Startup wait",
				y = NULL
			) +
			theme(axis.text.x = element_text(angle = 35, hjust = 1)),
		"92-ci-startup-wait-runtime-reliability-tradeoff.png",
		width = 10,
		height = 8.6
	)
}

ci_dense_summary_path <- file.path(data_dir, "typing-delay-ci-comparable-0-1400-dense-summary.csv")
if (file.exists(ci_dense_summary_path)) {
	ci_dense_summary <- read_csv(ci_dense_summary_path, show_col_types = FALSE)

	save_plot(
		ggplot(ci_dense_summary, aes(delay_ms, latency_p50_ms)) +
			geom_ribbon(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				fill = brewer_color("Blues", 3, type = "seq", n = 9),
				alpha = 0.25
			) +
			geom_point(color = brewer_color("Dark2", 1), size = 1.25) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Set1", 1)) +
			geom_vline(xintercept = 1200, linetype = "dotted", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			scale_x_continuous(breaks = seq(0, 1400, 100)) +
			labs(
				title = "CI-comparable setup preserves the measured 1000ms drop",
				subtitle = "Saved/reopened large-post draft per delay; 0-1400ms scan, 10ms steps; points are p50 and band is p10-p90",
				x = "Configured Playwright delay between key events",
				y = "Latency, keydown + keypress + keyup (ms)"
			),
		"74-ci-comparable-delay-curve-0-1400.png",
		width = 10.5,
		height = 5.5
	)

	save_plot(
		ggplot(ci_dense_summary, aes(delay_ms, latency_cv)) +
			geom_point(color = brewer_color("Dark2", 2), size = 1.25) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Set1", 1)) +
			scale_x_continuous(breaks = seq(0, 1400, 100)) +
			scale_y_continuous(labels = percent_format(accuracy = 1)) +
			labs(
				title = "CI-comparable volatility also depends on delay",
				subtitle = "Coefficient of variation by delay; n=10 retained samples per delay, so isolated outliers are visible",
				x = "Configured Playwright delay between key events",
				y = "Coefficient of variation"
			),
		"75-ci-comparable-coefficient-of-variation-0-1400.png",
		width = 10.5,
		height = 5.5
	)
}

ci_dense_n50_summary_path <- file.path(data_dir, "typing-delay-ci-comparable-0-1400-dense-n50-summary.csv")
if (file.exists(ci_dense_n50_summary_path)) {
	ci_dense_n50_summary <- read_csv(ci_dense_n50_summary_path, show_col_types = FALSE)

	save_plot(
		ggplot(ci_dense_n50_summary, aes(delay_ms, latency_cv)) +
			geom_point(color = brewer_color("Dark2", 3), size = 1.25) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Set1", 1)) +
			scale_x_continuous(breaks = seq(0, 1400, 100)) +
			scale_y_continuous(labels = percent_format(accuracy = 1)) +
			labs(
				title = "CI-comparable volatility with more samples",
				subtitle = "Coefficient of variation by delay; n=50 retained samples per delay",
				x = "Configured Playwright delay between key events",
				y = "Coefficient of variation"
			),
		"76-ci-comparable-coefficient-of-variation-0-1400-n50.png",
		width = 10.5,
		height = 5.5
	)
}

ci_start_wait_curve_draft_reliability_path <- file.path(data_dir, "typing-delay-ci-comparable-start-wait-curve-draft-summary.csv")
ci_startup_wait_run_reliability_out_path <- file.path(data_dir, "typing-delay-ci-startup-wait-run-reliability.csv")
ci_startup_runtime_model_path <- file.path(data_dir, "typing-delay-ci-startup-wait-runtime-model.csv")
if (file.exists(ci_start_wait_curve_draft_reliability_path)) {
	ci_startup_wait_run_reliability <- read_csv(ci_start_wait_curve_draft_reliability_path, show_col_types = FALSE) %>%
		group_by(startup_wait_ms = settle_after_editor_setup_ms) %>%
		summarize(
			run_count = n(),
			reported_q50_median_ms = median(retained_latency_p50_ms),
			reported_q50_mean_ms = mean(retained_latency_p50_ms),
			reported_q50_sd_ms = sd(retained_latency_p50_ms),
			reported_q50_min_ms = min(retained_latency_p50_ms),
			reported_q50_max_ms = max(retained_latency_p50_ms),
			reported_q50_range_ms = reported_q50_max_ms - reported_q50_min_ms,
			reported_q50_cv = reported_q50_sd_ms / reported_q50_mean_ms,
			reported_mean_median_ms = median(retained_latency_mean_ms),
			run_duration_median_ms = median(run_duration_ms),
			active_setup_median_ms = median(active_setup_ms),
			.groups = "drop"
		)

	if (file.exists(ci_startup_runtime_model_path)) {
		ci_startup_wait_run_reliability <- ci_startup_wait_run_reliability %>%
			left_join(
				read_csv(ci_startup_runtime_model_path, show_col_types = FALSE) %>%
					select(startup_wait_ms, two_branch_ci_change_vs_current_s, two_branch_ci_saved_vs_current_s),
				by = "startup_wait_ms"
			)
	}

	write_csv(ci_startup_wait_run_reliability, ci_startup_wait_run_reliability_out_path)

	ci_startup_reliability_plot <- ci_startup_wait_run_reliability %>%
		filter(startup_wait_ms <= 5000) %>%
		mutate(
			startup_wait_label = factor(paste0(startup_wait_ms, "ms"), levels = paste0(startup_wait_ms, "ms"))
		) %>%
		select(
			startup_wait_label,
			`two-branch runtime delta vs current (s)` = two_branch_ci_change_vs_current_s,
			`median reported Typing q50 (ms)` = reported_q50_median_ms,
			`run-to-run reported q50 sd (ms)` = reported_q50_sd_ms,
			`run-to-run reported q50 range (ms)` = reported_q50_range_ms
		) %>%
		pivot_longer(
			cols = -startup_wait_label,
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"two-branch runtime delta vs current (s)",
					"median reported Typing q50 (ms)",
					"run-to-run reported q50 sd (ms)",
					"run-to-run reported q50 range (ms)"
				)
			),
			value_label = case_when(
				str_detect(as.character(metric), "runtime") ~ sprintf("%+.0fs", value),
				TRUE ~ sprintf("%.1f", value)
			)
		)

	save_plot(
		ggplot(ci_startup_reliability_plot, aes(startup_wait_label, value, color = metric)) +
			geom_hline(
				data = ci_startup_reliability_plot %>%
					filter(metric == "two-branch runtime delta vs current (s)") %>%
					distinct(metric) %>%
					mutate(value = 0),
				aes(yintercept = value),
				color = brewer_color("Greys", 7, type = "seq", n = 9),
				linewidth = 0.35
			) +
			geom_point(size = 2.8, alpha = 0.9) +
			geom_text(aes(label = value_label), vjust = -0.7, size = 2.7, show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", guide = "none") +
			scale_y_continuous(expand = expansion(mult = c(0.12, 0.2))) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "CI-comparable startup wait: runtime changes, q50 stability mostly does not",
				subtitle = "Eight fresh saved/reopened large-post drafts per wait; current Typing already has 0ms extra post-setup wait",
				x = "Extra wait after editor setup",
				y = NULL
			) +
			theme(axis.text.x = element_text(angle = 35, hjust = 1)),
		"93-ci-startup-wait-run-reliability.png",
		width = 10,
		height = 8.6
	)
}

nontyping_startup_wait_exposure <- tribble(
	~spec, ~metric, ~wait_occurrences_per_branch, ~retained_samples,
	"post-editor", "focus / selecting blocks", 11, 10,
	"post-editor", "listViewOpen", 11, 10,
	"post-editor", "inserterOpen", 11, 10,
	"post-editor", "inserterSearch", 11, 10,
	"post-editor", "inserterHover", 11, 20,
	"post-editor", "loadPatterns", 11, 10,
	"site-editor", "loadPatterns", 10, 10
) %>%
	mutate(
		current_wait_ms = 1000,
		per_branch_wait_s = wait_occurrences_per_branch * current_wait_ms / 1000,
		two_branch_wait_s = 2 * per_branch_wait_s,
		two_branch_saved_if_zero_wait_s = two_branch_wait_s,
		metric_label = factor(
			paste(spec, metric, sep = "\n"),
			levels = paste(spec, metric, sep = "\n")
		)
	)
write_csv(
	nontyping_startup_wait_exposure,
	file.path(data_dir, "typing-delay-nontyping-startup-wait-exposure.csv")
)

save_plot(
	ggplot(nontyping_startup_wait_exposure, aes(metric_label, two_branch_wait_s, fill = spec)) +
		geom_col(width = 0.72) +
		geom_text(aes(label = sprintf("%.0fs", two_branch_wait_s)), vjust = -0.35, size = 3.0) +
		scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
		scale_y_continuous(expand = expansion(mult = c(0, 0.12))) +
		labs(
			title = "Seven non-Typing metrics still pay explicit startup sleeps",
			subtitle = "Current 1000ms MEASUREMENT_IDLE_WAIT_MS; normal performance CI compares two branches",
			x = NULL,
			y = "Two-branch explicit wait cost",
			fill = "Spec"
		) +
		theme(axis.text.x = element_text(angle = 35, hjust = 1)),
	"97-nontyping-startup-wait-exposure.png",
	width = 10.5,
	height = 5.8
)

startup_wait_change_trigger_contract_audit <- tribble(
	~trigger_question, ~current_answer, ~evidence, ~reopen_trigger, ~required_validation, ~decision_rule, ~scope,
	"Should the current Typing metric add a post-setup wait?",
	"No.",
	"Current Typing has 0ms extra post-setup wait. CI-comparable and exact post-editor runs show no retained-q50 stability win from adding 1s or 60s waits; the wall-clock cost is deterministic.",
	"Only reopen if the Typing setup, helper family, trace placement, retained/throwaway policy, browser revision, or CI runner class changes enough to invalidate the existing exact-spec anchor.",
	"Run the exact post-editor Typing setup/run pair with 0ms and the candidate wait in randomized order, using the real reporter output and the same retained-results array.",
	"Keep 0ms unless the added wait improves retained q50 stability or tail behavior by more than ordinary run-to-run spread while paying an acceptable runtime cost.",
	"closed for current CI Typing",
	"Does the first-character start-wait effect require changing retained q50?",
	"No for the current statistic.",
	"First character and the first retained key are slower, but changing startup wait does not remove that shape; discarding one extra key changes median q50 across startup waits by only -0.16ms while mean and p90 move more.",
	"Reopen if the reported statistic changes from retained q50 to first-input, mean, p90, p95, or a no-throwaway policy.",
	"Repeat the discard-policy table and first-three-keypress summaries under the new statistic.",
	"Do not use startup wait to hide first-input cost; create or report a first-input/tail metric if that is the product question.",
	"statistic scoped",
	"Can Typing evidence remove waits from non-Typing metrics?",
	"No.",
	"Typing uses target.type()/paragraph.type() and has no extra post-setup wait by default. The five interactive Post Editor non-Typing metrics now have their own local eight-run 0ms-versus-1000ms matrix; pattern-loading metrics remain separate readiness cases.",
	"Changing a non-Typing metric outside the five interaction metrics, or moving the interaction change from local evidence to CI behavior.",
	"For focus, listViewOpen, inserterOpen, inserterSearch, and inserterHover, validate 0ms against 1000ms on CI/mac/container lanes with retained counts, p50/mean/p90, failures, and two-branch runtime savings. For pattern metrics, use the pattern-specific readiness validation.",
	"0ms is the local candidate for the five interaction metrics; do not infer that result to pattern-loading or other future non-Typing metrics.",
	"metric-specific validation",
	"Does a CI image or runner change reopen the startup wait question?",
	"Only for absolute thresholds or when ordering changes.",
	"The local wait curve has overlapping retained-q50 bands and the blocked 60s/0ms order control shows no monotonic wait effect; a different runner may shift absolute p50 without making wait useful.",
	"Reopen if a compact CI lane shows retained q50 ordering, run-to-run sd, first-key behavior, or timeout/failure shape changes with startup wait.",
	"Run the portability validation lane with 0ms, 1s, and one long-wait control, plus environment metadata and per-run q50/sd/range.",
	"Do not add wait for absolute p50 drift alone; handle drift through threshold portability.",
	"portability trigger",
	"Does tracing placement change the decision?",
	"No for the tested exact-spec placement.",
	"Exact post-editor rows with 60s before trace, 0ms before trace, and 60s after tracing starts all stayed in the same low band.",
	"Reopen if metrics.startTracing(), trace categories, trace snapshots, or reporter extraction move relative to the idle wait or type() call.",
	"Repeat before-trace and after-trace wait placements with the exact spec and confirm retained q50, first-key, and reporter summary remain in band.",
	"Keep the start boundary unchanged unless a trace-placement change is intentionally redefining the metric.",
	"instrumentation trigger",
	"What is the fallback if a startup wait is reintroduced?",
	"Treat it as a metric-definition change with explicit runtime cost.",
	"Adding 1s to all explicit sleep sites costs 152s in the normal two-branch comparison; adding long waits scales linearly and gave no Typing retained-q50 benefit locally.",
	"Only consider if a reopened exact-spec validation shows a clear reliability win under the new setup.",
	"Publish per-branch and two-branch runtime deltas, reliability deltas, and which metrics pay the wait.",
	"Prefer a semantic readiness predicate or metric-specific fix over a blind fixed sleep.",
	"fallback policy"
)

write_csv(
	startup_wait_change_trigger_contract_audit,
	file.path(data_dir, "typing-delay-startup-wait-change-trigger-contract-audit.csv")
)

nontyping_focus_wait_pilot_path <- file.path(data_dir, "typing-delay-nontyping-focus-wait-pilot-summary.csv")
if (file.exists(nontyping_focus_wait_pilot_path)) {
	nontyping_focus_wait_pilot <- read_csv(nontyping_focus_wait_pilot_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = c("0ms", "1000ms")
			)
		)

	nontyping_focus_wait_pilot_plot <- nontyping_focus_wait_pilot %>%
		select(
			wait_label,
			run,
			`reported q50 (ms)` = focus_p50_ms,
			`reported mean (ms)` = focus_mean_ms,
			`reported p90 (ms)` = focus_p90_ms,
			`within-run sd (ms)` = focus_sd_ms
		) %>%
		pivot_longer(
			cols = -c(wait_label, run),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"reported q50 (ms)",
					"reported mean (ms)",
					"reported p90 (ms)",
					"within-run sd (ms)"
				)
			)
		)

	save_plot(
		ggplot(nontyping_focus_wait_pilot_plot, aes(wait_label, value, color = wait_label)) +
			geom_point(
				position = position_jitter(width = 0.08, height = 0, seed = 11),
				size = 2.2,
				alpha = 0.8,
				show.legend = FALSE
			) +
			stat_summary(fun = median, geom = "point", shape = 95, size = 7, color = brewer_color("Set1", 1), show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric), ncol = 2, scales = "free_y") +
			labs(
				title = "Pilot non-Typing metric is faster with the startup sleep removed",
				subtitle = "Exact post-editor Selecting blocks metric; 8 runs per wait; red ticks are medians",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = NULL
			),
		"98-nontyping-focus-wait-pilot.png",
		width = 9.5,
		height = 6.8
	)
}

nontyping_wait_screen_summary_path <- file.path(data_dir, "typing-delay-nontyping-wait-screen-summary.csv")
nontyping_wait_screen_by_metric_path <- file.path(data_dir, "typing-delay-nontyping-wait-screen-by-metric.csv")
post_interaction_wait_matrix_fresh_samples_path <- file.path(data_dir, "typing-delay-post-interaction-wait-matrix-fresh-samples.csv")
post_interaction_wait_matrix_runs_path <- file.path(data_dir, "typing-delay-post-interaction-wait-matrix-runs.csv")
post_interaction_wait_matrix_summary_path <- file.path(data_dir, "typing-delay-post-interaction-wait-matrix-summary.csv")
post_interaction_wait_matrix_deltas_path <- file.path(data_dir, "typing-delay-post-interaction-wait-matrix-deltas.csv")

post_interaction_metrics <- c("focus", "listViewOpen", "inserterOpen", "inserterSearch", "inserterHover")
read_post_interaction_wait_matrix <- function() {
	artifact_root <- file.path(repo_root, "test/performance/artifacts")
	if (!dir.exists(artifact_root)) {
		return(NULL)
	}

	raw_dirs <- list.dirs(artifact_root, recursive = FALSE, full.names = TRUE) %>%
		keep(~ str_detect(basename(.x), "^post-interaction-wait-matrix-[0-9]+$"))
	if (length(raw_dirs) == 0) {
		return(NULL)
	}

	sample_rows <- list()
	run_rows <- list()
	for (raw_dir in raw_dirs) {
		run_set <- basename(raw_dir)
		run_dirs <- list.dirs(raw_dir, recursive = FALSE, full.names = TRUE)
		for (run_dir in run_dirs) {
			run_name <- basename(run_dir)
			match <- str_match(run_name, "^wait-([0-9]+)-run-([0-9]+)$")
			if (is.na(match[1, 1])) {
				next
			}
			json_files <- list.files(run_dir, pattern = "^post-editor-results-.*\\.json$", full.names = TRUE)
			if (length(json_files) == 0) {
				next
			}

			raw <- fromJSON(json_files[[1]], flatten = TRUE)
			measurement_idle_wait_ms <- as.integer(raw$metadata$measurementIdleWaitMs %||% match[1, 2])
			local_run <- as.integer(match[1, 3])
			for (metric in post_interaction_metrics) {
				values <- as.numeric(raw$results[[metric]])
				if (length(values) == 0) {
					next
				}

				sample_rows[[length(sample_rows) + 1]] <- tibble(
					run_set = run_set,
					run_source = "fresh grouped interaction block",
					local_run = local_run,
					spec = "post-editor",
					metric = metric,
					metric_label = paste("post-editor", metric, sep = " / "),
					measurement_idle_wait_ms = measurement_idle_wait_ms,
					sample_index = seq_along(values),
					latency_ms = values
				)

				run_rows[[length(run_rows) + 1]] <- tibble(
					run_set = run_set,
					run_source = "fresh grouped interaction block",
					local_run = local_run,
					spec = "post-editor",
					metric = metric,
					metric_label = paste("post-editor", metric, sep = " / "),
					measurement_idle_wait_ms = measurement_idle_wait_ms,
					retained_samples = length(values),
					p10_ms = quant(values, 0.1),
					p50_ms = quant(values, 0.5),
					p90_ms = quant(values, 0.9),
					mean_ms = mean(values),
					sd_ms = sd(values)
				)
			}
		}
	}

	if (length(run_rows) == 0) {
		return(NULL)
	}

	list(
		samples = bind_rows(sample_rows) %>%
			arrange(measurement_idle_wait_ms, metric, local_run, sample_index),
		runs = bind_rows(run_rows) %>%
			arrange(measurement_idle_wait_ms, metric, local_run)
	)
}

if (file.exists(nontyping_wait_screen_summary_path) && file.exists(nontyping_wait_screen_by_metric_path)) {
	nontyping_metric_order <- c(
		"post-editor / focus",
		"post-editor / listViewOpen",
		"post-editor / inserterOpen",
		"post-editor / inserterSearch",
		"post-editor / inserterHover",
		"post-editor / loadPatterns",
		"site-editor / loadPatterns"
	)
	nontyping_wait_screen <- read_csv(nontyping_wait_screen_summary_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = c("0ms", "1000ms")
			),
			metric_label = factor(metric_label, levels = nontyping_metric_order)
		)

	save_plot(
		ggplot(nontyping_wait_screen, aes(wait_label, p50_ms, color = wait_label)) +
			geom_point(
				position = position_jitter(width = 0.08, height = 0, seed = 17),
				size = 2.1,
				alpha = 0.8,
				show.legend = FALSE
			) +
			stat_summary(fun = median, geom = "point", shape = 95, size = 7, color = brewer_color("Set1", 1), show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric_label), ncol = 2, scales = "free_y") +
			labs(
				title = "Non-Typing startup-wait impact is metric-dependent",
				subtitle = "Exact sleep-using post/site metrics; 4 runs per wait; red ticks are medians",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = "Reported q50"
			),
		"99-nontyping-wait-screen-q50.png",
		width = 10,
		height = 8
	)

	nontyping_wait_screen_by_metric <- read_csv(nontyping_wait_screen_by_metric_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = c("0ms", "1000ms")
			),
			metric_label = factor(metric_label, levels = nontyping_metric_order)
		)

	nontyping_wait_screen_deltas <- nontyping_wait_screen_by_metric %>%
		select(spec, metric, metric_label, measurement_idle_wait_ms, median_q50_ms, q50_sd_ms) %>%
		pivot_wider(
			names_from = measurement_idle_wait_ms,
			values_from = c(median_q50_ms, q50_sd_ms),
			names_sep = "_"
		) %>%
		mutate(
			median_q50_delta_0_minus_1000_ms = median_q50_ms_0 - median_q50_ms_1000,
			q50_sd_delta_0_minus_1000_ms = q50_sd_ms_0 - q50_sd_ms_1000
		)
	write_csv(
		nontyping_wait_screen_deltas,
		file.path(data_dir, "typing-delay-nontyping-wait-screen-deltas.csv")
	)

	save_plot(
		ggplot(nontyping_wait_screen_by_metric, aes(wait_label, q50_sd_ms, color = wait_label)) +
			geom_point(size = 3, alpha = 0.9, show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric_label), ncol = 2, scales = "free_y") +
			labs(
				title = "Run-to-run volatility usually rises with the 1000ms wait in the screen",
				subtitle = "Standard deviation of per-run reported q50; 4 runs per wait",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = "q50 sd across runs"
			),
		"100-nontyping-wait-screen-volatility.png",
		width = 10,
		height = 8
	)

	post_interaction_fresh <- read_post_interaction_wait_matrix()
	post_interaction_historical_runs <- nontyping_wait_screen %>%
		filter(spec == "post-editor", metric %in% post_interaction_metrics) %>%
		transmute(
			run_set = "nontyping-wait-screen",
			run_source = "original four-run screen",
			local_run = run,
			spec,
			metric,
			metric_label = as.character(metric_label),
			measurement_idle_wait_ms,
			retained_samples,
			p10_ms,
			p50_ms,
			p90_ms,
			mean_ms,
			sd_ms
		)
	post_interaction_fresh_runs <- if (!is.null(post_interaction_fresh)) {
		write_csv(post_interaction_fresh$samples, post_interaction_wait_matrix_fresh_samples_path)
		post_interaction_fresh$runs
	} else {
		NULL
	}

	post_interaction_runs <- bind_rows(
		post_interaction_historical_runs,
		post_interaction_fresh_runs
	) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = c("0ms", "1000ms")
			),
			metric_label = factor(metric_label, levels = nontyping_metric_order),
			run_source = factor(
				run_source,
				levels = c("original four-run screen", "fresh grouped interaction block")
			)
		)

	if (nrow(post_interaction_runs) > 0) {
		write_csv(post_interaction_runs, post_interaction_wait_matrix_runs_path)

		post_interaction_summary <- post_interaction_runs %>%
			group_by(spec, metric, metric_label, measurement_idle_wait_ms) %>%
			summarise(
				runs = n(),
				retained_samples_per_run = median(retained_samples),
				total_retained_samples = sum(retained_samples),
				median_run_q50_ms = median(p50_ms, na.rm = TRUE),
				mean_run_q50_ms = mean(p50_ms, na.rm = TRUE),
				run_to_run_q50_sd_ms = sd(p50_ms, na.rm = TRUE),
				median_run_mean_ms = median(mean_ms, na.rm = TRUE),
				median_run_p90_ms = median(p90_ms, na.rm = TRUE),
				median_within_run_sd_ms = median(sd_ms, na.rm = TRUE),
				min_run_q50_ms = min(p50_ms, na.rm = TRUE),
				max_run_q50_ms = max(p50_ms, na.rm = TRUE),
				.groups = "drop"
			) %>%
			mutate(
				two_branch_explicit_wait_s = 22 * measurement_idle_wait_ms / 1000,
				two_branch_saved_vs_1000ms_s = 22 * (1000 - measurement_idle_wait_ms) / 1000
			)
		write_csv(post_interaction_summary, post_interaction_wait_matrix_summary_path)

		post_interaction_deltas <- post_interaction_summary %>%
			select(
				spec,
				metric,
				metric_label,
				measurement_idle_wait_ms,
				median_run_q50_ms,
				run_to_run_q50_sd_ms,
				median_run_mean_ms,
				median_run_p90_ms
			) %>%
			pivot_wider(
				names_from = measurement_idle_wait_ms,
				values_from = c(
					median_run_q50_ms,
					run_to_run_q50_sd_ms,
					median_run_mean_ms,
					median_run_p90_ms
				),
				names_sep = "_"
			) %>%
			mutate(
				median_q50_delta_0_minus_1000_ms = median_run_q50_ms_0 - median_run_q50_ms_1000,
				q50_sd_delta_0_minus_1000_ms = run_to_run_q50_sd_ms_0 - run_to_run_q50_sd_ms_1000,
				mean_delta_0_minus_1000_ms = median_run_mean_ms_0 - median_run_mean_ms_1000,
				p90_delta_0_minus_1000_ms = median_run_p90_ms_0 - median_run_p90_ms_1000,
				two_branch_saved_if_zero_wait_s = 22,
				local_decision = if_else(
					median_q50_delta_0_minus_1000_ms < 0 & q50_sd_delta_0_minus_1000_ms < 0,
					"0ms wins locally",
					"needs more validation"
				)
			)
		write_csv(post_interaction_deltas, post_interaction_wait_matrix_deltas_path)

		save_plot(
			ggplot(post_interaction_runs, aes(wait_label, p50_ms, color = wait_label, shape = run_source)) +
				geom_point(
					position = position_jitter(width = 0.09, height = 0, seed = 29),
					size = 2.2,
					alpha = 0.78
				) +
				stat_summary(aes(group = wait_label), fun = median, geom = "crossbar", width = 0.45, linewidth = 0.35, color = "grey20", show.legend = FALSE) +
				scale_color_brewer(type = "qual", palette = "Dark2", name = "Wait") +
				scale_shape_manual(values = c(16, 17), name = "Run block") +
				facet_wrap(vars(metric_label), ncol = 2, scales = "free_y") +
				labs(
					title = "Post-editor interaction metrics stay faster with the fixed wait removed",
					subtitle = "Original four-run screen plus four fresh grouped runs; black bars are medians",
					x = "Wait before each interaction",
					y = "Reported q50"
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"159-post-interaction-wait-matrix-q50.png",
			width = 10.5,
			height = 8.2
		)

		post_interaction_delta_plot <- post_interaction_deltas %>%
			select(
				metric_label,
				`reported q50 delta` = median_q50_delta_0_minus_1000_ms,
				`run-to-run q50 sd delta` = q50_sd_delta_0_minus_1000_ms,
				`reported p90 delta` = p90_delta_0_minus_1000_ms
			) %>%
			pivot_longer(
				cols = -metric_label,
				names_to = "statistic",
				values_to = "delta_ms"
			) %>%
			mutate(
				statistic = factor(
					statistic,
					levels = c("reported q50 delta", "reported p90 delta", "run-to-run q50 sd delta")
				)
			)

		save_plot(
			ggplot(post_interaction_delta_plot, aes(delta_ms, metric_label, color = statistic, shape = statistic)) +
				geom_vline(xintercept = 0, color = "grey50", linetype = "dashed", linewidth = 0.35) +
				geom_point(size = 2.8, alpha = 0.9) +
				scale_color_brewer(type = "qual", palette = "Set2", name = "0ms minus 1000ms") +
				scale_shape_manual(values = c(16, 17, 15), name = "0ms minus 1000ms") +
				labs(
					title = "Removing the wait improves interaction q50 and volatility locally",
					subtitle = "Negative deltas mean the 0ms wait is lower; each point summarizes eight runs per wait",
					x = "Delta in milliseconds",
					y = NULL
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"160-post-interaction-wait-deltas.png",
			width = 10.5,
			height = 6.4
		)
	}
}

site_pattern_alternating_wait_path <- file.path(data_dir, "typing-delay-site-pattern-alternating-wait-summary.csv")
site_pattern_readiness_probe_samples_path <- file.path(data_dir, "typing-delay-pattern-readiness-probe-samples.csv")
site_pattern_readiness_probe_summary_path <- file.path(data_dir, "typing-delay-pattern-readiness-probe-summary.csv")
site_pattern_readiness_boundary_summary_path <- file.path(data_dir, "typing-delay-pattern-readiness-boundary-summary.csv")
site_pattern_readiness_risk_audit_path <- file.path(data_dir, "typing-delay-pattern-readiness-risk-audit.csv")
site_pattern_short_wait_runs_path <- file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-runs.csv")
site_pattern_short_wait_summary_path <- file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-summary.csv")
site_pattern_predicate_validation_samples_path <- file.path(data_dir, "typing-delay-pattern-readiness-predicate-validation-samples.csv")
site_pattern_predicate_validation_runs_path <- file.path(data_dir, "typing-delay-pattern-readiness-predicate-validation-runs.csv")
site_pattern_predicate_validation_summary_path <- file.path(data_dir, "typing-delay-pattern-readiness-predicate-validation-summary.csv")
site_pattern_predicate_validation_resource_path <- file.path(data_dir, "typing-delay-pattern-readiness-predicate-validation-resources.csv")
post_pattern_wait_matrix_samples_path <- file.path(data_dir, "typing-delay-post-pattern-wait-matrix-samples.csv")
post_pattern_wait_matrix_runs_path <- file.path(data_dir, "typing-delay-post-pattern-wait-matrix-runs.csv")
post_pattern_wait_matrix_summary_path <- file.path(data_dir, "typing-delay-post-pattern-wait-matrix-summary.csv")

read_site_pattern_short_wait_runs <- function() {
	raw_dirs <- c(
		file.path(repo_root, "test/performance/artifacts/site-pattern-short-wait-exact"),
		file.path(repo_root, "test/performance/artifacts/site-pattern-short-wait-exact-followup")
	)
	raw_dirs <- raw_dirs[dir.exists(raw_dirs)]
	if (length(raw_dirs) == 0) {
		return(NULL)
	}

	rows <- list()
	for (raw_dir in raw_dirs) {
		run_set <- basename(raw_dir)
		run_dirs <- list.dirs(raw_dir, recursive = FALSE, full.names = TRUE)
		for (run_dir in run_dirs) {
			run_name <- basename(run_dir)
			match <- str_match(run_name, "^r([0-9]+)-wait-([0-9]+)$")
			if (is.na(match[1, 1])) {
				next
			}
			json_files <- list.files(run_dir, pattern = "^site-editor-results-.*\\.json$", full.names = TRUE)
			if (length(json_files) == 0) {
				next
			}

			raw <- fromJSON(json_files[[1]], flatten = TRUE)
			values <- as.numeric(raw$results$loadPatterns)
			rows[[length(rows) + 1]] <- tibble(
				run_set = run_set,
				local_run = as.integer(match[1, 2]),
				measurement_idle_wait_ms = as.integer(match[1, 3]),
				retained_samples = length(values),
				p10_ms = quant(values, 0.1),
				p50_ms = quant(values, 0.5),
				p90_ms = quant(values, 0.9),
				mean_ms = mean(values),
				sd_ms = sd(values),
				min_ms = min(values),
				max_ms = max(values)
			)
		}
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows) %>%
		arrange(run_set, local_run) %>%
		mutate(run_order = row_number(), .before = run_set)
}

site_pattern_short_wait_runs_from_artifacts <- read_site_pattern_short_wait_runs()
if (!is.null(site_pattern_short_wait_runs_from_artifacts)) {
	site_pattern_short_wait_runs <- site_pattern_short_wait_runs_from_artifacts
	write_csv(site_pattern_short_wait_runs, site_pattern_short_wait_runs_path)

	site_pattern_short_wait_summary <- site_pattern_short_wait_runs %>%
		group_by(measurement_idle_wait_ms) %>%
		summarise(
			exact_runs = n(),
			median_reported_q50_ms = median(p50_ms),
			mean_reported_q50_ms = mean(p50_ms),
			run_to_run_q50_sd_ms = sd(p50_ms),
			median_mean_ms = median(mean_ms),
			median_p90_ms = median(p90_ms),
			median_within_run_sd_ms = median(sd_ms),
			min_q50_ms = min(p50_ms),
			max_q50_ms = max(p50_ms),
			.groups = "drop"
		) %>%
		mutate(
			two_branch_explicit_wait_s = 20 * measurement_idle_wait_ms / 1000,
			two_branch_saved_vs_1000ms_s = 20 * (1000 - measurement_idle_wait_ms) / 1000
		)
	write_csv(site_pattern_short_wait_summary, site_pattern_short_wait_summary_path)
}

read_site_pattern_predicate_validation <- function() {
	raw_dir <- file.path(repo_root, "test/performance/artifacts/site-pattern-readiness-predicate-validation")
	if (!dir.exists(raw_dir)) {
		return(NULL)
	}

	run_dirs <- list.dirs(raw_dir, recursive = FALSE, full.names = TRUE)
	sample_rows <- list()
	run_rows <- list()
	for (run_dir in run_dirs) {
		run_name <- basename(run_dir)
		match <- str_match(run_name, "^(.*)-r([0-9]+)$")
		if (is.na(match[1, 1])) {
			next
		}
		json_files <- list.files(run_dir, pattern = "^site-editor-results-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}

		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		values <- as.numeric(raw$results$loadPatterns)
		readiness <- as_tibble(raw$results$loadPatternsReadiness)
		condition <- match[1, 2]
		local_run <- as.integer(match[1, 3])
		if (nrow(readiness) == 0) {
			readiness <- tibble(sample_index = seq_along(values))
		}
		if (!"quietWindowSatisfied" %in% names(readiness)) {
			readiness$quietWindowSatisfied <- NA
		}
		if (!"compatiblePatternCount" %in% names(readiness)) {
			readiness$compatiblePatternCount <- NA_real_
		}
		if (!"quietWindowWaitMs" %in% names(readiness)) {
			readiness$quietWindowWaitMs <- NA_real_
		}

		samples <- readiness %>%
			mutate(
				condition = condition,
				local_run = local_run,
				sample_index = row_number(),
				load_patterns_ms = values,
				measurement_idle_wait_ms = raw$metadata$measurementIdleWaitMs %||% NA_real_,
				pattern_readiness_wait = raw$metadata$patternReadinessWait %||% NA_character_,
				pattern_readiness_timeout_ms = raw$metadata$patternReadinessTimeoutMs %||% NA_real_,
				pattern_readiness_quiet_window_ms = raw$metadata$patternReadinessQuietWindowMs %||% NA_real_,
				.before = 1
			)
		sample_rows[[length(sample_rows) + 1]] <- samples %>%
			select(
				condition,
				local_run,
				sample_index,
				load_patterns_ms,
				measurement_idle_wait_ms,
				pattern_readiness_wait,
				pattern_readiness_timeout_ms,
				pattern_readiness_quiet_window_ms,
				mode,
				waitMs,
				quietWindowWaitMs,
				quietWindowSatisfied,
				timedOut,
				waitResourceDelta,
				measurementResourceDelta,
				compatiblePatternCount,
				totalPatternCount,
				restPatternCount,
				settingsPatternCount,
				templateSlug,
				any_of("templateArea")
			)

		run_rows[[length(run_rows) + 1]] <- tibble(
			condition = condition,
			local_run = local_run,
			measurement_idle_wait_ms = raw$metadata$measurementIdleWaitMs %||% NA_real_,
			pattern_readiness_wait = raw$metadata$patternReadinessWait %||% NA_character_,
			pattern_readiness_timeout_ms = raw$metadata$patternReadinessTimeoutMs %||% NA_real_,
			pattern_readiness_quiet_window_ms = raw$metadata$patternReadinessQuietWindowMs %||% NA_real_,
			retained_samples = length(values),
			p10_ms = quant(values, 0.1),
			p50_ms = quant(values, 0.5),
			p90_ms = quant(values, 0.9),
			mean_ms = mean(values),
			sd_ms = sd(values),
			median_readiness_wait_ms = median(samples$waitMs, na.rm = TRUE),
			median_quiet_window_wait_ms = median(samples$quietWindowWaitMs, na.rm = TRUE),
			median_wait_resource_delta = median(samples$waitResourceDelta, na.rm = TRUE),
			median_measurement_resource_delta = median(samples$measurementResourceDelta, na.rm = TRUE),
			timed_out_samples = sum(samples$timedOut, na.rm = TRUE),
			quiet_window_satisfied_samples = sum(samples$quietWindowSatisfied, na.rm = TRUE),
			median_compatible_pattern_count = median(samples$compatiblePatternCount, na.rm = TRUE)
		)
	}

	if (length(sample_rows) == 0) {
		return(NULL)
	}

	list(
		samples = bind_rows(sample_rows),
		runs = bind_rows(run_rows)
	)
}

read_site_pattern_resource_detail <- function() {
	raw_dir <- file.path(repo_root, "test/performance/artifacts/site-pattern-readiness-resource-detail")
	if (!dir.exists(raw_dir)) {
		return(NULL)
	}

	run_dirs <- list.dirs(raw_dir, recursive = TRUE, full.names = TRUE)
	rows <- list()
	for (run_dir in run_dirs) {
		json_files <- list.files(run_dir, pattern = "^site-editor-results-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		run_name <- basename(run_dir)
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		readiness <- as_tibble(raw$results$loadPatternsReadiness)
		for (phase in c("wait", "measurement")) {
			resource_col <- paste0(phase, "Resources")
			if (!resource_col %in% names(readiness)) {
				next
			}
			for (sample_index in seq_len(nrow(readiness))) {
				resources <- readiness[[resource_col]][[sample_index]]
				if (is.null(resources) || nrow(resources) == 0) {
					next
				}
				rows[[length(rows) + 1]] <- as_tibble(resources) %>%
					mutate(
						run_name = run_name,
						sample_index = sample_index,
						phase = phase,
						condition = raw$metadata$patternReadinessWait %||% NA_character_,
						.before = 1
					)
			}
		}
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows) %>%
		mutate(
			resource_path = name %>%
				str_replace("^https?://[^/]+", "") %>%
				str_replace("\\?.*$", ""),
			resource_endpoint = case_when(
				str_detect(resource_path, "/wp-json/wp/v2/categories") ~ "categories",
				str_detect(resource_path, "/wp-json/wp/v2/posts") ~ "posts",
				str_detect(resource_path, "/wp-json/wp/v2/navigation") ~ "navigation",
				str_detect(resource_path, "/wp-json/wp/v2/template-parts") ~ "template parts",
				str_detect(resource_path, "/wp-json/wp/v2/types/post") ~ "post type",
				str_detect(resource_path, "/wp-json/wp/v2/users") ~ "users",
				str_detect(resource_path, "/wp-json/wp/v2/taxonomies/category") ~ "category taxonomy",
				str_detect(resource_path, "/wp-json/wp-block-editor/v1/navigation-fallback") ~ "navigation fallback",
				str_detect(resource_path, "/wp-json/wp/v2/pages") ~ "pages",
				str_detect(resource_path, "/wp-json/wp/v2/menus") ~ "menus",
				TRUE ~ resource_path
			)
		)
}

read_post_pattern_wait_matrix <- function() {
	artifact_root <- file.path(repo_root, "test/performance/artifacts")
	if (!dir.exists(artifact_root)) {
		return(NULL)
	}

	raw_dirs <- list.dirs(artifact_root, recursive = FALSE, full.names = TRUE) %>%
		keep(~ str_detect(basename(.x), "^post-pattern-wait-matrix-[0-9]+$"))
	if (length(raw_dirs) == 0) {
		return(NULL)
	}

	sample_rows <- list()
	run_rows <- list()
	for (raw_dir in raw_dirs) {
		run_set <- basename(raw_dir)
		run_dirs <- list.dirs(raw_dir, recursive = FALSE, full.names = TRUE)
		for (run_dir in run_dirs) {
			run_name <- basename(run_dir)
			match <- str_match(run_name, "^wait-([0-9]+)-run-([0-9]+)$")
			if (is.na(match[1, 1])) {
				next
			}
			json_files <- list.files(run_dir, pattern = "^post-editor-results-.*\\.json$", full.names = TRUE)
			if (length(json_files) == 0) {
				next
			}

			raw <- fromJSON(json_files[[1]], flatten = TRUE)
			values <- as.numeric(raw$results$loadPatterns)
			if (length(values) == 0) {
				next
			}
			measurement_idle_wait_ms <- as.integer(raw$metadata$measurementIdleWaitMs %||% match[1, 2])
			local_run <- as.integer(match[1, 3])

			sample_rows[[length(sample_rows) + 1]] <- tibble(
				run_set = run_set,
				local_run = local_run,
				measurement_idle_wait_ms = measurement_idle_wait_ms,
				sample_index = seq_along(values),
				load_patterns_ms = values
			)

			run_rows[[length(run_rows) + 1]] <- tibble(
				run_set = run_set,
				local_run = local_run,
				measurement_idle_wait_ms = measurement_idle_wait_ms,
				retained_samples = length(values),
				p10_ms = quant(values, 0.1),
				p25_ms = quant(values, 0.25),
				p50_ms = quant(values, 0.5),
				p75_ms = quant(values, 0.75),
				p90_ms = quant(values, 0.9),
				mean_ms = mean(values),
				sd_ms = sd(values),
				min_ms = min(values),
				max_ms = max(values)
			)
		}
	}

	if (length(run_rows) == 0) {
		return(NULL)
	}

	list(
		samples = bind_rows(sample_rows) %>%
			arrange(measurement_idle_wait_ms, local_run, sample_index),
		runs = bind_rows(run_rows) %>%
			arrange(measurement_idle_wait_ms, local_run)
	)
}

site_pattern_predicate_validation <- read_site_pattern_predicate_validation()
if (!is.null(site_pattern_predicate_validation)) {
	site_pattern_predicate_samples <- site_pattern_predicate_validation$samples %>%
		mutate(
			condition = factor(
				condition,
				levels = c(
					"fixed-0",
					"predicate-1000",
					"block-patterns-resource-quiet",
					"fixed-500",
					"fixed-1000"
				),
				labels = c(
					"fixed 0ms",
					"block-pattern predicate",
					"predicate + resource quiet",
					"fixed 500ms",
					"fixed 1000ms"
				)
			)
		)
	site_pattern_predicate_runs <- site_pattern_predicate_validation$runs %>%
		mutate(
			condition = factor(
				condition,
				levels = c(
					"fixed-0",
					"predicate-1000",
					"block-patterns-resource-quiet",
					"fixed-500",
					"fixed-1000"
				),
				labels = c(
					"fixed 0ms",
					"block-pattern predicate",
					"predicate + resource quiet",
					"fixed 500ms",
					"fixed 1000ms"
				)
			)
		)

	write_csv(site_pattern_predicate_samples, site_pattern_predicate_validation_samples_path)
	write_csv(site_pattern_predicate_runs, site_pattern_predicate_validation_runs_path)

	site_pattern_predicate_summary <- site_pattern_predicate_runs %>%
		group_by(condition) %>%
		summarise(
			runs = n(),
			median_run_p50_ms = median(p50_ms, na.rm = TRUE),
			mean_run_p50_ms = mean(p50_ms, na.rm = TRUE),
			run_to_run_q50_sd_ms = sd(p50_ms, na.rm = TRUE),
			min_run_p50_ms = min(p50_ms, na.rm = TRUE),
			max_run_p50_ms = max(p50_ms, na.rm = TRUE),
			median_readiness_wait_ms = median(median_readiness_wait_ms, na.rm = TRUE),
			median_wait_resource_delta = median(median_wait_resource_delta, na.rm = TRUE),
			median_measurement_resource_delta = median(median_measurement_resource_delta, na.rm = TRUE),
			timed_out_samples = sum(timed_out_samples, na.rm = TRUE),
			quiet_window_satisfied_samples = sum(quiet_window_satisfied_samples, na.rm = TRUE),
			median_compatible_pattern_count = median(median_compatible_pattern_count, na.rm = TRUE),
			.groups = "drop"
		)
	write_csv(site_pattern_predicate_summary, site_pattern_predicate_validation_summary_path)

	save_plot(
		ggplot(site_pattern_predicate_runs, aes(condition, p50_ms, color = condition)) +
			geom_point(size = 3, alpha = 0.86, position = position_jitter(width = 0.08, height = 0), show.legend = FALSE) +
			stat_summary(fun = median, geom = "crossbar", width = 0.48, linewidth = 0.35, color = "grey20") +
			scale_color_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "Block-pattern resolution alone does not replace the site-editor pattern sleep",
				subtitle = "Full Loading Patterns runs; three runs per condition, 10 retained samples per run",
				x = "Pre-click readiness strategy",
				y = "Reported loadPatterns q50"
			) +
			theme(axis.text.x = element_text(angle = 18, hjust = 1)),
		"153-site-pattern-readiness-predicate-validation.png",
		width = 10.5,
		height = 6
	)

	site_pattern_resource_shift <- site_pattern_predicate_summary %>%
		select(condition, median_wait_resource_delta, median_measurement_resource_delta) %>%
		pivot_longer(
			cols = starts_with("median_"),
			names_to = "phase",
			values_to = "median_resource_delta"
		) %>%
		mutate(
			phase = recode(
				phase,
				median_wait_resource_delta = "before timer",
				median_measurement_resource_delta = "inside measurement"
			),
			phase = factor(phase, levels = c("before timer", "inside measurement"))
		)

	save_plot(
		ggplot(site_pattern_resource_shift, aes(condition, median_resource_delta, color = phase, shape = phase)) +
			geom_point(size = 3.3, alpha = 0.9, position = position_dodge(width = 0.45)) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_shape_manual(values = c("before timer" = 16, "inside measurement" = 17), drop = FALSE) +
			labs(
				title = "The fixed sleep moves setup resources out of the measured interval",
				subtitle = "Median resource-entry deltas per retained sample",
				x = "Pre-click readiness strategy",
				y = "Resource entries",
				color = "Resource phase",
				shape = "Resource phase"
			) +
			theme(axis.text.x = element_text(angle = 18, hjust = 1), legend.position = "bottom"),
		"154-site-pattern-readiness-resource-shift.png",
		width = 10.5,
		height = 6
	)
}

site_pattern_resource_detail <- read_site_pattern_resource_detail()
if (!is.null(site_pattern_resource_detail)) {
	site_pattern_resource_detail_summary <- site_pattern_resource_detail %>%
		group_by(phase, resource_endpoint) %>%
		summarise(
			resource_entries = n(),
			total_duration_ms = sum(duration, na.rm = TRUE),
			median_duration_ms = median(duration, na.rm = TRUE),
			total_transfer_size = sum(transferSize, na.rm = TRUE),
			.groups = "drop"
		) %>%
		arrange(phase, desc(resource_entries))
	write_csv(site_pattern_resource_detail_summary, site_pattern_predicate_validation_resource_path)

	site_pattern_resource_detail_plot <- site_pattern_resource_detail_summary %>%
		group_by(phase) %>%
		slice_max(resource_entries, n = 8, with_ties = FALSE) %>%
		ungroup() %>%
		mutate(
			resource_endpoint = fct_reorder(resource_endpoint, resource_entries)
		)

	save_plot(
		ggplot(site_pattern_resource_detail_plot, aes(resource_endpoint, resource_entries, fill = phase)) +
			geom_col(show.legend = FALSE, alpha = 0.9) +
			coord_flip() +
			facet_wrap(vars(phase), scales = "free_y") +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "Resource-quiet wait is mostly moving REST setup requests",
				subtitle = "One diagnostic predicate + resource-quiet run; top endpoints by resource-entry count",
				x = "Endpoint",
				y = "Resource entries"
			),
		"155-site-pattern-readiness-resource-detail.png",
		width = 10,
		height = 6.5
	)
}

if (file.exists(site_pattern_alternating_wait_path)) {
	site_pattern_alternating_wait <- read_csv(site_pattern_alternating_wait_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = c("0ms", "1000ms")
			)
		)

	save_plot(
		ggplot(site_pattern_alternating_wait, aes(pair, p50_ms, color = wait_label)) +
			geom_line(aes(group = pair), color = "grey70", linewidth = 0.45, show.legend = FALSE) +
			geom_point(size = 2.8, alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_x_continuous(breaks = sort(unique(site_pattern_alternating_wait$pair))) +
			labs(
				title = "Site-editor pattern loading really is faster after the 1000ms wait",
				subtitle = "Exact existing Loading Patterns spec, alternating waits; lines connect adjacent paired runs",
				x = "Alternating pair",
				y = "Reported q50",
				color = "Wait"
			),
		"101-site-pattern-alternating-wait.png",
		width = 8.5,
		height = 5.2
	)
}

if (file.exists(site_pattern_readiness_probe_summary_path)) {
	site_pattern_readiness_probe <- read_csv(site_pattern_readiness_probe_summary_path, show_col_types = FALSE)

	site_pattern_readiness_probe_plot <- site_pattern_readiness_probe %>%
		transmute(
			waitMs,
			`reported q50 (ms)` = median_duration_ms,
			`requests during wait` = median_wait_requests_started,
			`requests during measurement` = median_measurement_requests_started,
			`resources added during wait` = median_wait_resource_delta,
			`resources added during measurement` = median_measurement_resource_delta
		) %>%
		pivot_longer(
			cols = -waitMs,
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"reported q50 (ms)",
					"requests during wait",
					"requests during measurement",
					"resources added during wait",
					"resources added during measurement"
				)
			)
		)

	save_plot(
		ggplot(site_pattern_readiness_probe_plot, aes(waitMs, value)) +
			geom_point(color = brewer_color("Dark2", 1), size = 2.3, alpha = 0.9) +
			geom_smooth(method = "loess", se = FALSE, color = brewer_color("Set1", 1), linewidth = 0.55) +
			facet_wrap(vars(metric), ncol = 2, scales = "free_y") +
			labs(
				title = "The explicit wait moves site-editor readiness requests before measurement",
				subtitle = "Probe adds observer overhead, so use it for phase attribution, not q50 deltas",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = NULL
			),
		"102-site-pattern-readiness-probe.png",
		width = 9.8,
		height = 7.2
	)
}

if (
	file.exists(site_pattern_readiness_probe_samples_path) &&
	file.exists(site_pattern_readiness_probe_summary_path) &&
	file.exists(site_pattern_short_wait_summary_path)
) {
	site_pattern_readiness_probe_samples <- read_csv(site_pattern_readiness_probe_samples_path, show_col_types = FALSE)
	site_pattern_readiness_probe <- read_csv(site_pattern_readiness_probe_summary_path, show_col_types = FALSE)
	site_pattern_short_wait_summary <- read_csv(site_pattern_short_wait_summary_path, show_col_types = FALSE)

	site_pattern_readiness_boundary <- site_pattern_readiness_probe_samples %>%
		mutate(
			wait_resource_plateau = wait_resource_delta >= 18,
			no_active_requests_at_start = activeRequestsAtStart == 0,
			low_measurement_resources = measurement_resource_delta <= 8,
			readiness_boundary_hit = wait_resource_plateau &
				no_active_requests_at_start &
				low_measurement_resources
		) %>%
		group_by(waitMs) %>%
		summarize(
			probe_samples = n(),
			readiness_boundary_hit_rate = mean(readiness_boundary_hit),
			wait_resource_plateau_rate = mean(wait_resource_plateau),
			no_active_requests_at_start_rate = mean(no_active_requests_at_start),
			low_measurement_resources_rate = mean(low_measurement_resources),
			median_active_requests_at_start = median(activeRequestsAtStart, na.rm = TRUE),
			median_wait_xhr_or_fetch_started = median(wait_xhr_or_fetch_started, na.rm = TRUE),
			median_wait_resource_delta = median(wait_resource_delta, na.rm = TRUE),
			median_measurement_resource_delta = median(measurement_resource_delta, na.rm = TRUE),
			median_measurement_requests_started = median(measurement_requests_started, na.rm = TRUE),
			probe_duration_median_ms = median(durationMs, na.rm = TRUE),
			.groups = "drop"
		) %>%
		left_join(
			site_pattern_short_wait_summary %>%
				transmute(
					waitMs = measurement_idle_wait_ms,
					exact_runs,
					exact_median_reported_q50_ms = median_reported_q50_ms,
					exact_run_to_run_q50_sd_ms = run_to_run_q50_sd_ms,
					two_branch_saved_vs_1000ms_s
				),
			by = "waitMs"
		) %>%
		left_join(
			site_pattern_readiness_probe %>%
				transmute(
					waitMs,
					probe_median_duration_ms = median_duration_ms,
					probe_median_measurement_long_task_duration_delta_ms =
						median_measurement_long_task_duration_delta_ms
				),
			by = "waitMs"
		) %>%
		mutate(
			readiness_interpretation = case_when(
				readiness_boundary_hit_rate == 0 ~ "not settled in probe",
				readiness_boundary_hit_rate < 1 ~ "partially settled in probe",
				TRUE ~ "settled in probe"
			)
		) %>%
		arrange(waitMs)

	write_csv(site_pattern_readiness_boundary, site_pattern_readiness_boundary_summary_path)

	site_pattern_readiness_boundary_plot <- site_pattern_readiness_boundary %>%
		transmute(
			waitMs,
			`exact reported q50 (ms)` = exact_median_reported_q50_ms,
			`probe readiness-boundary hit rate (%)` = 100 * readiness_boundary_hit_rate,
			`probe active requests at measurement start` = median_active_requests_at_start,
			`probe resources added during measurement` = median_measurement_resource_delta,
			`two-branch wait saved vs 1000ms (s)` = two_branch_saved_vs_1000ms_s
		) %>%
		pivot_longer(
			cols = -waitMs,
			names_to = "metric",
			values_to = "value"
		) %>%
		filter(!is.na(value)) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"exact reported q50 (ms)",
					"probe readiness-boundary hit rate (%)",
					"probe active requests at measurement start",
					"probe resources added during measurement",
					"two-branch wait saved vs 1000ms (s)"
				)
			)
		)

	save_plot(
		ggplot(site_pattern_readiness_boundary_plot, aes(waitMs, value, color = metric, shape = metric)) +
			geom_point(size = 2.8, alpha = 0.9, show.legend = FALSE) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_x_continuous(breaks = sort(unique(site_pattern_readiness_boundary$waitMs))) +
			labs(
				title = "The site-editor pattern readiness boundary is near 250ms locally",
				subtitle = "Count-based probe signals are diagnostic; exact q50 comes from the existing Loading Patterns spec shape",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = NULL
			),
		"127-site-pattern-readiness-boundary.png",
		width = 10.5,
		height = 9.5
	)
}

if (file.exists(site_pattern_short_wait_runs_path) && file.exists(site_pattern_short_wait_summary_path)) {
	site_pattern_short_wait_runs <- read_csv(site_pattern_short_wait_runs_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = paste0(sort(unique(measurement_idle_wait_ms)), "ms")
			)
		)
	site_pattern_short_wait_summary <- read_csv(site_pattern_short_wait_summary_path, show_col_types = FALSE) %>%
		mutate(
			wait_label = factor(
				paste0(measurement_idle_wait_ms, "ms"),
				levels = levels(site_pattern_short_wait_runs$wait_label)
			)
		)

	save_plot(
		ggplot(site_pattern_short_wait_runs, aes(wait_label, p50_ms, color = wait_label)) +
			geom_point(
				position = position_jitter(width = 0.08, height = 0, seed = 41),
				size = 2.4,
				alpha = 0.82,
				show.legend = FALSE
			) +
			stat_summary(fun = median, geom = "point", shape = 95, size = 8, color = brewer_color("Set1", 1), show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "Site-editor pattern loading needs a readiness wait, but not the full second",
				subtitle = "Exact existing Loading Patterns spec; red ticks are medians; n=4 for 0/100/750ms and n=10 for 250/500/1000ms",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = "Reported q50"
			),
		"103-site-pattern-short-wait-exact.png",
		width = 9.4,
		height = 5.6
	)

	site_pattern_short_wait_runtime_plot <- site_pattern_short_wait_summary %>%
		select(
			wait_label,
			`two-branch explicit wait saved vs 1000ms (s)` = two_branch_saved_vs_1000ms_s,
			`median reported q50 (ms)` = median_reported_q50_ms,
			`run-to-run q50 sd (ms)` = run_to_run_q50_sd_ms
		) %>%
		pivot_longer(
			cols = -wait_label,
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"two-branch explicit wait saved vs 1000ms (s)",
					"median reported q50 (ms)",
					"run-to-run q50 sd (ms)"
				)
			),
			value_label = case_when(
				str_detect(as.character(metric), "saved") ~ sprintf("%+.0fs", value),
				TRUE ~ sprintf("%.1f", value)
			)
		)

	save_plot(
		ggplot(site_pattern_short_wait_runtime_plot, aes(wait_label, value, color = wait_label)) +
			geom_hline(
				data = site_pattern_short_wait_runtime_plot %>%
					filter(metric == "two-branch explicit wait saved vs 1000ms (s)") %>%
					distinct(metric) %>%
					mutate(value = 0),
				aes(yintercept = value),
				color = brewer_color("Greys", 7, type = "seq", n = 9),
				linewidth = 0.35
			) +
			geom_point(size = 2.8, alpha = 0.9, show.legend = FALSE) +
			geom_text(aes(label = value_label), vjust = -0.75, size = 2.7, show.legend = FALSE) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_y_continuous(expand = expansion(mult = c(0.14, 0.22))) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "Pattern-loading short waits trade startup time against readiness coverage",
				subtitle = "Exact site-editor Loading Patterns spec; two-branch wait savings apply to this metric only",
				x = "MEASUREMENT_IDLE_WAIT_MS",
				y = NULL
			),
		"104-site-pattern-short-wait-runtime-reliability.png",
		width = 9.4,
		height = 8.2
	)
}

visual_latency_samples_path <- file.path(data_dir, "typing-delay-visual-latency-samples.csv")
visual_latency_summary_path <- file.path(data_dir, "typing-delay-visual-latency-summary.csv")

read_visual_latency_runs <- function() {
	raw_specs <- tribble(
		~input_mode, ~delay_mode, ~json_dir,
		"key held during delay", "keyboard", file.path(repo_root, "test/performance/artifacts/typing-delay-visual-keyhold"),
		"complete keypress then wait", "between-keys", file.path(repo_root, "test/performance/artifacts/typing-delay-visual-between-keys")
	) %>%
		filter(dir.exists(json_dir))

	if (nrow(raw_specs) == 0) {
		return(NULL)
	}

	rows <- list()
	for (i in seq_len(nrow(raw_specs))) {
		spec <- raw_specs[i, ]
		json_files <- list.files(spec$json_dir, pattern = "^typing-delay-benchmark-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		if (is.null(raw$records)) {
			next
		}

		rows[[length(rows) + 1]] <- as_tibble(raw$records) %>%
			filter(!isThrowaway) %>%
			transmute(
				input_mode = spec$input_mode,
				delay_mode = spec$delay_mode,
				delay_ms = delayMs,
				round,
				delay_sample_index = delaySampleIndex,
				latency_ms = latencyMs,
				keypress_ms = keypressMs,
				keydown_ms = keydownMs,
				keyup_ms = keyupMs,
				visual_window_name = visualWindowName,
				visual_input_window_name = visualInputWindowName,
				visual_mutation_window_name = visualMutationWindowName,
				visual_keydown_to_input_ms = visualKeydownToInputMs,
				visual_keydown_to_first_mutation_ms = visualKeydownToFirstMutationMs,
				visual_input_to_first_raf_ms = visualInputToFirstRafMs,
				visual_input_to_second_raf_ms = visualInputToSecondRafMs,
				visual_keydown_to_first_raf_ms = visualKeydownToFirstRafAfterInputMs,
				visual_keydown_to_second_raf_ms = visualKeydownToSecondRafAfterInputMs
			)
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows)
}

visual_latency_samples_from_artifacts <- read_visual_latency_runs()
if (!is.null(visual_latency_samples_from_artifacts)) {
	visual_latency_samples <- visual_latency_samples_from_artifacts
	write_csv(visual_latency_samples, visual_latency_samples_path)

	visual_latency_summary <- visual_latency_samples %>%
		group_by(input_mode, delay_mode, delay_ms) %>%
		summarise(
			retained_n = n(),
			latency_p50_ms = quant(latency_ms, 0.5),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_sd_ms = sd(latency_ms),
			keypress_p50_ms = quant(keypress_ms, 0.5),
			visual_keydown_to_input_p50_ms = quant(visual_keydown_to_input_ms, 0.5),
			visual_keydown_to_first_mutation_p50_ms = quant(visual_keydown_to_first_mutation_ms, 0.5),
			visual_input_to_first_raf_p50_ms = quant(visual_input_to_first_raf_ms, 0.5),
			visual_input_to_second_raf_p50_ms = quant(visual_input_to_second_raf_ms, 0.5),
			visual_keydown_to_first_raf_p50_ms = quant(visual_keydown_to_first_raf_ms, 0.5),
			visual_keydown_to_second_raf_p50_ms = quant(visual_keydown_to_second_raf_ms, 0.5),
			visual_keydown_to_second_raf_p90_ms = quant(visual_keydown_to_second_raf_ms, 0.9),
			visual_keydown_to_second_raf_sd_ms = sd(visual_keydown_to_second_raf_ms),
			missing_visual_input = sum(is.na(visual_keydown_to_input_ms)),
			missing_visual_second_raf = sum(is.na(visual_keydown_to_second_raf_ms)),
			.groups = "drop"
		)
	write_csv(visual_latency_summary, visual_latency_summary_path)
}

if (file.exists(visual_latency_samples_path) && file.exists(visual_latency_summary_path)) {
	visual_latency_samples <- read_csv(visual_latency_samples_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms"))
		)
	visual_latency_summary <- read_csv(visual_latency_summary_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			)
		)

	visual_latency_summary_plot <- visual_latency_summary %>%
		transmute(
			input_mode,
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms")),
			`EventDispatch trace latency` = latency_p50_ms,
			`keypress trace slice` = keypress_p50_ms,
			`keydown to input event` = visual_keydown_to_input_p50_ms,
			`keydown to next RAF after input` = visual_keydown_to_first_raf_p50_ms,
			`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"EventDispatch trace latency",
					"keypress trace slice",
					"keydown to input event",
					"keydown to next RAF after input",
					"keydown to second RAF after input"
				)
			)
		)

	save_plot(
		ggplot(visual_latency_summary_plot, aes(delay_label, value, color = input_mode, shape = input_mode)) +
			geom_point(size = 3.0, alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "The 1000ms key-hold drop appears in the next-frame proxy too",
				subtitle = "Opt-in visual proxy records input, mutation, next RAF, and second RAF; 24 retained samples per point",
				x = "Delay",
				y = "p50 duration",
				color = "Input mode",
				shape = "Input mode"
			),
		"105-visual-latency-summary.png",
		width = 9.6,
		height = 10.8
	)

	visual_latency_distribution_plot <- visual_latency_samples %>%
		select(
			input_mode,
			delay_label,
			`EventDispatch trace latency` = latency_ms,
			`keydown to second RAF after input` = visual_keydown_to_second_raf_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		)

	save_plot(
		ggplot(visual_latency_distribution_plot, aes(delay_label, value, color = input_mode)) +
			geom_point(
				position = position_jitter(width = 0.09, height = 0, seed = 53),
				size = 1.8,
				alpha = 0.55
			) +
			stat_summary(
				aes(group = input_mode),
				fun = median,
				geom = "point",
				shape = 95,
				size = 7,
				position = position_dodge(width = 0.35),
				color = brewer_color("Set1", 1),
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_grid(metric ~ input_mode, scales = "free_y") +
			labs(
				title = "Visual proxy preserves the key-hold shape across samples",
				subtitle = "Red ticks are medians; the second-RAF metric is a browser-frame proxy, not a calibrated paint timestamp",
				x = "Delay",
				y = NULL,
				color = "Input mode"
			),
		"106-visual-latency-distribution.png",
		width = 11.5,
		height = 7.8
	)
}

render_trace_samples_path <- file.path(data_dir, "typing-delay-render-trace-samples.csv")
render_trace_summary_path <- file.path(data_dir, "typing-delay-render-trace-summary.csv")

read_render_trace_runs <- function() {
	raw_specs <- tribble(
		~input_mode, ~delay_mode, ~json_dir,
		"key held during delay", "keyboard", file.path(repo_root, "test/performance/artifacts/typing-delay-render-keyhold"),
		"complete keypress then wait", "between-keys", file.path(repo_root, "test/performance/artifacts/typing-delay-render-between-keys")
	) %>%
		filter(dir.exists(json_dir))

	if (nrow(raw_specs) == 0) {
		return(NULL)
	}

	column_or <- function(data, column, value = NA_real_) {
		if (column %in% names(data)) {
			data[[column]]
		} else {
			rep(value, nrow(data))
		}
	}

	rows <- list()
	for (i in seq_len(nrow(raw_specs))) {
		spec <- raw_specs[i, ]
		json_files <- list.files(spec$json_dir, pattern = "^typing-delay-benchmark-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		if (is.null(raw$records)) {
			next
		}

		records <- as_tibble(raw$records) %>%
			filter(!isThrowaway)

		rows[[length(rows) + 1]] <- records %>%
			transmute(
				input_mode = spec$input_mode,
				delay_mode = spec$delay_mode,
				delay_ms = delayMs,
				round,
				delay_sample_index = delaySampleIndex,
				latency_ms = latencyMs,
				keypress_ms = keypressMs,
				visual_keydown_to_second_raf_ms = column_or(records, "visualKeydownToSecondRafAfterInputMs"),
				render_first_event_name = column_or(records, "renderFirstEventAfterKeydownName", NA_character_),
				render_first_event_ms = column_or(records, "renderFirstEventAfterKeydownMs"),
				render_event_count = column_or(records, "renderTraceEventCountAfterKeydown"),
				render_event_duration_ms = column_or(records, "renderTraceEventDurationAfterKeydownMs"),
				render_first_begin_frame_ms = column_or(records, "renderFirstBeginFrameAfterKeydownMs"),
				render_first_fire_animation_frame_ms = column_or(records, "renderFirstFireAnimationFrameAfterKeydownMs"),
				render_first_update_layout_tree_ms = column_or(records, "renderFirstUpdateLayoutTreeAfterKeydownMs"),
				render_first_layout_ms = column_or(records, "renderFirstLayoutAfterKeydownMs"),
				render_first_prepaint_ms = column_or(records, "renderFirstPrePaintAfterKeydownMs"),
				render_first_paint_ms = column_or(records, "renderFirstPaintAfterKeydownMs"),
				render_first_layerize_ms = column_or(records, "renderFirstLayerizeAfterKeydownMs"),
				render_first_composite_layers_ms = column_or(records, "renderFirstCompositeLayersAfterKeydownMs"),
				render_first_draw_frame_ms = column_or(records, "renderFirstDrawFrameAfterKeydownMs")
			)
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows)
}

render_trace_samples_from_artifacts <- read_render_trace_runs()
if (!is.null(render_trace_samples_from_artifacts)) {
	render_trace_samples <- render_trace_samples_from_artifacts
	write_csv(render_trace_samples, render_trace_samples_path)

	render_trace_summary <- render_trace_samples %>%
		group_by(input_mode, delay_mode, delay_ms) %>%
		summarise(
			retained_n = n(),
			latency_p50_ms = quant(latency_ms, 0.5),
			latency_p90_ms = quant(latency_ms, 0.9),
			keypress_p50_ms = quant(keypress_ms, 0.5),
			visual_keydown_to_second_raf_p50_ms = quant(visual_keydown_to_second_raf_ms, 0.5),
			render_first_layout_p50_ms = quant(render_first_layout_ms, 0.5),
			render_first_fire_animation_frame_p50_ms = quant(render_first_fire_animation_frame_ms, 0.5),
			render_first_prepaint_p50_ms = quant(render_first_prepaint_ms, 0.5),
			render_first_paint_p50_ms = quant(render_first_paint_ms, 0.5),
			render_first_layerize_p50_ms = quant(render_first_layerize_ms, 0.5),
			render_first_draw_frame_p50_ms = quant(render_first_draw_frame_ms, 0.5),
			render_event_count_p50 = quant(render_event_count, 0.5),
			render_event_duration_p50_ms = quant(render_event_duration_ms, 0.5),
			missing_render_paint = sum(is.na(render_first_paint_ms)),
			missing_render_draw_frame = sum(is.na(render_first_draw_frame_ms)),
			.groups = "drop"
		)
	write_csv(render_trace_summary, render_trace_summary_path)
}

if (file.exists(render_trace_samples_path) && file.exists(render_trace_summary_path)) {
	render_trace_samples <- read_csv(render_trace_samples_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms"))
		)
	render_trace_summary <- read_csv(render_trace_summary_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			)
		)

	render_trace_summary_plot <- render_trace_summary %>%
		transmute(
			input_mode,
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms")),
			`EventDispatch trace latency` = latency_p50_ms,
			`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms,
			`keydown to PrePaint trace event` = render_first_prepaint_p50_ms,
			`keydown to Paint trace event` = render_first_paint_p50_ms,
			`keydown to DrawFrame trace event` = render_first_draw_frame_p50_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"EventDispatch trace latency",
					"keydown to second RAF after input",
					"keydown to PrePaint trace event",
					"keydown to Paint trace event",
					"keydown to DrawFrame trace event"
				)
			)
		)

	save_plot(
		ggplot(render_trace_summary_plot, aes(delay_label, value, color = input_mode, shape = input_mode)) +
			geom_point(size = 3.0, alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "The key-hold cliff reaches Chrome render trace events",
				subtitle = "Heavier Chromium render tracing; Paint/DrawFrame are trace events, not calibrated screen presentation",
				x = "Delay",
				y = "p50 duration from keydown",
				color = "Input mode",
				shape = "Input mode"
			),
		"107-render-trace-summary.png",
		width = 9.6,
		height = 10.8
	)

	render_trace_distribution_plot <- render_trace_samples %>%
		select(
			input_mode,
			delay_label,
			`EventDispatch trace latency` = latency_ms,
			`keydown to Paint trace event` = render_first_paint_ms,
			`keydown to DrawFrame trace event` = render_first_draw_frame_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		)

	save_plot(
		ggplot(render_trace_distribution_plot, aes(delay_label, value, color = input_mode)) +
			geom_point(
				position = position_jitter(width = 0.09, height = 0, seed = 54),
				size = 1.8,
				alpha = 0.55
			) +
			stat_summary(
				aes(group = input_mode),
				fun = median,
				geom = "point",
				shape = 95,
				size = 7,
				position = position_dodge(width = 0.35),
				color = brewer_color("Set1", 1),
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_grid(metric ~ input_mode, scales = "free_y") +
			labs(
				title = "Render trace samples retain the key-hold-only 1000ms drop",
				subtitle = "Red ticks are medians; render events are extracted in a 150ms window after each keydown",
				x = "Delay",
				y = NULL,
				color = "Input mode"
			),
		"108-render-trace-distribution.png",
		width = 11.5,
		height = 8.4
	)
}

screenshot_trace_samples_path <- file.path(data_dir, "typing-delay-screenshot-trace-samples.csv")
screenshot_trace_summary_path <- file.path(data_dir, "typing-delay-screenshot-trace-summary.csv")

read_screenshot_trace_runs <- function() {
	raw_specs <- tribble(
		~input_mode, ~delay_mode, ~json_dir,
		"key held during delay", "keyboard", file.path(repo_root, "test/performance/artifacts/typing-delay-screenshot-keyhold"),
		"complete keypress then wait", "between-keys", file.path(repo_root, "test/performance/artifacts/typing-delay-screenshot-between-keys")
	) %>%
		filter(dir.exists(json_dir))

	if (nrow(raw_specs) == 0) {
		return(NULL)
	}

	column_or <- function(data, column, value = NA_real_) {
		if (column %in% names(data)) {
			data[[column]]
		} else {
			rep(value, nrow(data))
		}
	}

	rows <- list()
	for (i in seq_len(nrow(raw_specs))) {
		spec <- raw_specs[i, ]
		json_files <- list.files(spec$json_dir, pattern = "^typing-delay-benchmark-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		if (is.null(raw$records)) {
			next
		}

		records <- as_tibble(raw$records) %>%
			filter(!isThrowaway)

		rows[[length(rows) + 1]] <- records %>%
			transmute(
				input_mode = spec$input_mode,
				delay_mode = spec$delay_mode,
				delay_ms = delayMs,
				round,
				delay_sample_index = delaySampleIndex,
				latency_ms = latencyMs,
				keypress_ms = keypressMs,
				visual_keydown_to_second_raf_ms = column_or(records, "visualKeydownToSecondRafAfterInputMs"),
				screenshot_previous_before_keydown_ms = column_or(records, "screenshotPreviousBeforeKeydownMs"),
				screenshot_first_after_keydown_ms = column_or(records, "screenshotFirstAfterKeydownMs"),
				screenshot_first_changed_after_keydown_ms = column_or(records, "screenshotFirstChangedAfterKeydownMs"),
				screenshot_trace_event_count_after_keydown = column_or(records, "screenshotTraceEventCountAfterKeydown"),
				screenshot_first_changed_after_keydown_bytes = column_or(records, "screenshotFirstChangedAfterKeydownBytes")
			)
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows)
}

screenshot_trace_samples_from_artifacts <- read_screenshot_trace_runs()
if (!is.null(screenshot_trace_samples_from_artifacts)) {
	screenshot_trace_samples <- screenshot_trace_samples_from_artifacts
	write_csv(screenshot_trace_samples, screenshot_trace_samples_path)

	screenshot_trace_summary <- screenshot_trace_samples %>%
		group_by(input_mode, delay_mode, delay_ms) %>%
		summarise(
			retained_n = n(),
			latency_p50_ms = quant(latency_ms, 0.5),
			latency_p90_ms = quant(latency_ms, 0.9),
			keypress_p50_ms = quant(keypress_ms, 0.5),
			visual_keydown_to_second_raf_p50_ms = quant(visual_keydown_to_second_raf_ms, 0.5),
			screenshot_previous_before_keydown_p50_ms = quant(screenshot_previous_before_keydown_ms, 0.5),
			screenshot_first_after_keydown_p50_ms = quant(screenshot_first_after_keydown_ms, 0.5),
			screenshot_first_changed_after_keydown_p50_ms = quant(screenshot_first_changed_after_keydown_ms, 0.5),
			screenshot_first_changed_after_keydown_p90_ms = quant(screenshot_first_changed_after_keydown_ms, 0.9),
			screenshot_trace_event_count_after_keydown_p50 = quant(screenshot_trace_event_count_after_keydown, 0.5),
			missing_screenshot_first = sum(is.na(screenshot_first_after_keydown_ms)),
			missing_screenshot_changed = sum(is.na(screenshot_first_changed_after_keydown_ms)),
			.groups = "drop"
		)
	write_csv(screenshot_trace_summary, screenshot_trace_summary_path)
}

if (file.exists(screenshot_trace_samples_path) && file.exists(screenshot_trace_summary_path)) {
	screenshot_trace_samples <- read_csv(screenshot_trace_samples_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms"))
		)
	screenshot_trace_summary <- read_csv(screenshot_trace_summary_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			)
		)

	screenshot_trace_summary_plot <- screenshot_trace_summary %>%
		transmute(
			input_mode,
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms")),
			`EventDispatch trace latency` = latency_p50_ms,
			`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms,
			`keydown to first changed trace screenshot` = screenshot_first_changed_after_keydown_p50_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"EventDispatch trace latency",
					"keydown to second RAF after input",
					"keydown to first changed trace screenshot"
				)
			)
		)

	save_plot(
		ggplot(screenshot_trace_summary_plot, aes(delay_label, value, color = input_mode, shape = input_mode)) +
			geom_point(size = 3.1, alpha = 0.92) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "Trace screenshots show the key-hold-only 1000ms drop",
				subtitle = "First changed Chromium trace screenshot after keydown; 24 retained samples per point",
				x = "Delay",
				y = "p50 duration from keydown",
				color = "Input mode",
				shape = "Input mode"
			),
		"110-screenshot-trace-summary.png",
		width = 9.6,
		height = 8.8
	)

	screenshot_trace_distribution_plot <- screenshot_trace_samples %>%
		select(
			input_mode,
			delay_label,
			`EventDispatch trace latency` = latency_ms,
			`keydown to first changed trace screenshot` = screenshot_first_changed_after_keydown_ms
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		)

	save_plot(
		ggplot(screenshot_trace_distribution_plot, aes(delay_label, value, color = input_mode)) +
			geom_point(
				position = position_jitter(width = 0.09, height = 0, seed = 55),
				size = 1.8,
				alpha = 0.55
			) +
			stat_summary(
				aes(group = input_mode),
				fun = median,
				geom = "point",
				shape = 95,
				size = 7,
				position = position_dodge(width = 0.35),
				color = brewer_color("Set1", 1),
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_grid(metric ~ input_mode, scales = "free_y") +
			labs(
				title = "Screenshot samples preserve the same key-hold-only shape",
				subtitle = "Red ticks are medians; trace screenshots are Chromium snapshots, not high-speed-camera pixels",
				x = "Delay",
				y = NULL,
				color = "Input mode"
			),
		"111-screenshot-trace-distribution.png",
		width = 11.5,
		height = 7.8
	)
}

screenshot_pixel_samples_path <- file.path(data_dir, "typing-delay-screenshot-pixel-samples.csv")
screenshot_pixel_summary_path <- file.path(data_dir, "typing-delay-screenshot-pixel-summary.csv")

read_screenshot_pixel_runs <- function() {
	raw_specs <- tribble(
		~input_mode, ~delay_mode, ~json_dir,
		"key held during delay", "keyboard", file.path(repo_root, "test/performance/artifacts/typing-delay-screenshot-pixel-sharp-keyhold"),
		"complete keypress then wait", "between-keys", file.path(repo_root, "test/performance/artifacts/typing-delay-screenshot-pixel-sharp-between-keys")
	) %>%
		filter(dir.exists(json_dir))

	if (nrow(raw_specs) == 0) {
		return(NULL)
	}

	column_or <- function(data, column, value = NA) {
		if (column %in% names(data)) {
			data[[column]]
		} else {
			rep(value, nrow(data))
		}
	}

	rows <- list()
	for (i in seq_len(nrow(raw_specs))) {
		spec <- raw_specs[i, ]
		json_files <- list.files(spec$json_dir, pattern = "^typing-delay-benchmark-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		if (is.null(raw$records)) {
			next
		}

		records <- as_tibble(raw$records) %>%
			filter(!isThrowaway)

		rows[[length(rows) + 1]] <- records %>%
			transmute(
				input_mode = spec$input_mode,
				delay_mode = spec$delay_mode,
				delay_ms = delayMs,
				round,
				delay_sample_index = delaySampleIndex,
				latency_ms = latencyMs,
				text_length_before_run = column_or(records, "textLengthBeforeRun", NA_real_),
				text_length_after_run = column_or(records, "textLengthAfterRun", NA_real_),
				typed_character_text_index = column_or(records, "typedCharacterTextIndex", NA_real_),
				typed_character_box_x = column_or(records, "typedCharacterBoxX", NA_real_),
				typed_character_box_y = column_or(records, "typedCharacterBoxY", NA_real_),
				typed_character_box_width = column_or(records, "typedCharacterBoxWidth", NA_real_),
				typed_character_box_height = column_or(records, "typedCharacterBoxHeight", NA_real_),
				screenshot_first_changed_after_keydown_ms = column_or(records, "screenshotFirstChangedAfterKeydownMs", NA_real_),
				screenshot_changed_pixel_count = column_or(records, "screenshotChangedPixelCount", NA_real_),
				screenshot_changed_box_overlap_target_ratio = column_or(records, "screenshotChangedBoxOverlapTargetRatio", NA_real_),
				screenshot_changed_box_overlaps_target = column_or(records, "screenshotChangedBoxOverlapsTarget", NA),
				screenshot_changed_box_center_in_target = column_or(records, "screenshotChangedBoxCenterInTarget", NA),
				screenshot_changed_box_overlap_character_ratio = column_or(records, "screenshotChangedBoxOverlapCharacterRatio", NA_real_),
				screenshot_changed_box_overlaps_character = column_or(records, "screenshotChangedBoxOverlapsCharacter", NA),
				screenshot_changed_box_center_in_character = column_or(records, "screenshotChangedBoxCenterInCharacter", NA),
				screenshot_pixel_diff_failed = column_or(records, "screenshotPixelDiffFailed", FALSE),
				screenshot_pixel_diff_error = column_or(records, "screenshotPixelDiffError", NA_character_)
			)
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows)
}

screenshot_pixel_samples_from_artifacts <- read_screenshot_pixel_runs()
if (!is.null(screenshot_pixel_samples_from_artifacts)) {
	screenshot_pixel_samples <- screenshot_pixel_samples_from_artifacts
	write_csv(screenshot_pixel_samples, screenshot_pixel_samples_path)

	screenshot_pixel_summary <- screenshot_pixel_samples %>%
		group_by(input_mode, delay_mode, delay_ms) %>%
		summarise(
			retained_n = n(),
			decoded_n = sum(!is.na(screenshot_changed_pixel_count)),
			decode_failed_n = sum(screenshot_pixel_diff_failed %in% TRUE, na.rm = TRUE),
			overlap_target_n = sum(screenshot_changed_box_overlaps_target %in% TRUE, na.rm = TRUE),
			center_in_target_n = sum(screenshot_changed_box_center_in_target %in% TRUE, na.rm = TRUE),
			overlap_character_n = sum(screenshot_changed_box_overlaps_character %in% TRUE, na.rm = TRUE),
			center_in_character_n = sum(screenshot_changed_box_center_in_character %in% TRUE, na.rm = TRUE),
			latency_p50_ms = quant(latency_ms, 0.5),
			screenshot_first_changed_after_keydown_p50_ms = quant(screenshot_first_changed_after_keydown_ms, 0.5),
			screenshot_changed_pixel_count_p50 = quant(screenshot_changed_pixel_count, 0.5),
			screenshot_changed_box_overlap_target_ratio_p50 = quant(screenshot_changed_box_overlap_target_ratio, 0.5),
			screenshot_changed_box_overlap_character_ratio_p50 = quant(screenshot_changed_box_overlap_character_ratio, 0.5),
			typed_character_box_width_p50 = quant(typed_character_box_width, 0.5),
			typed_character_box_height_p50 = quant(typed_character_box_height, 0.5),
			.groups = "drop"
		)
	write_csv(screenshot_pixel_summary, screenshot_pixel_summary_path)
}

if (file.exists(screenshot_pixel_samples_path) && file.exists(screenshot_pixel_summary_path)) {
	screenshot_pixel_samples <- read_csv(screenshot_pixel_samples_path, show_col_types = FALSE) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms"))
		)

	screenshot_pixel_plot <- screenshot_pixel_samples %>%
		select(
			input_mode,
			delay_label,
			`changed-pixel count` = screenshot_changed_pixel_count,
			`changed-box overlap ratio with target` = screenshot_changed_box_overlap_target_ratio
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		)

	save_plot(
		ggplot(screenshot_pixel_plot, aes(delay_label, value, color = input_mode, shape = input_mode)) +
			geom_point(
				position = position_jitter(width = 0.09, height = 0, seed = 112),
				size = 2.1,
				alpha = 0.65
			) +
			stat_summary(
				aes(group = input_mode),
				fun = median,
				geom = "point",
				shape = 95,
				size = 7,
				position = position_dodge(width = 0.35),
				color = brewer_color("Set1", 1),
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_grid(metric ~ input_mode, scales = "free_y") +
			labs(
				title = "Changed trace-screenshot pixels are localized to the text box",
				subtitle = "Red ticks are medians; 8 retained samples per delay and input mode",
				x = "Delay",
				y = NULL,
				color = "Input mode",
				shape = "Input mode"
			),
		"112-screenshot-pixel-overlap.png",
		width = 11.5,
		height = 7.4
	)

	screenshot_character_plot <- screenshot_pixel_samples %>%
		select(
			input_mode,
			delay_label,
			`changed-box overlap ratio with typed x` = screenshot_changed_box_overlap_character_ratio
		) %>%
		pivot_longer(
			cols = -c(input_mode, delay_label),
			names_to = "metric",
			values_to = "value"
		)

	save_plot(
		ggplot(screenshot_character_plot, aes(delay_label, value, color = input_mode, shape = input_mode)) +
			geom_point(
				position = position_jitter(width = 0.09, height = 0, seed = 113),
				size = 2.1,
				alpha = 0.65
			) +
			stat_summary(
				aes(group = input_mode),
				fun = median,
				geom = "point",
				shape = 95,
				size = 7,
				position = position_dodge(width = 0.35),
				color = brewer_color("Set1", 1),
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			facet_wrap(vars(input_mode), nrow = 1) +
			labs(
				title = "Changed pixels overlap the exact typed-character range",
				subtitle = "Red ticks are medians; DOM range for the inserted x, 8 retained samples per delay and input mode",
				x = "Delay",
				y = "Changed-box overlap ratio with typed x",
				color = "Input mode",
				shape = "Input mode"
			),
		"113-screenshot-character-overlap.png",
		width = 11.5,
		height = 5.4
	)
}

visual_endpoint_drop_summary_path <- file.path(data_dir, "typing-delay-visual-endpoint-drop-summary.csv")
visual_endpoint_alignment_samples_path <- file.path(data_dir, "typing-delay-visual-endpoint-alignment-samples.csv")
visual_endpoint_alignment_summary_path <- file.path(data_dir, "typing-delay-visual-endpoint-alignment-summary.csv")
if (
	file.exists(visual_latency_summary_path) &&
	file.exists(render_trace_summary_path) &&
	file.exists(screenshot_trace_summary_path)
) {
	visual_endpoint_rows <- list(
		read_csv(visual_latency_summary_path, show_col_types = FALSE) %>%
			transmute(
				probe = "visual proxy",
				input_mode,
				delay_ms,
				`EventDispatch trace latency` = latency_p50_ms,
				`keydown to input event` = visual_keydown_to_input_p50_ms,
				`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms
			),
		read_csv(render_trace_summary_path, show_col_types = FALSE) %>%
			transmute(
				probe = "Chrome render trace",
				input_mode,
				delay_ms,
				`EventDispatch trace latency` = latency_p50_ms,
				`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms,
				`keydown to Paint trace event` = render_first_paint_p50_ms,
				`keydown to DrawFrame trace event` = render_first_draw_frame_p50_ms
			),
		read_csv(screenshot_trace_summary_path, show_col_types = FALSE) %>%
			transmute(
				probe = "Chrome trace screenshot",
				input_mode,
				delay_ms,
				`EventDispatch trace latency` = latency_p50_ms,
				`keydown to second RAF after input` = visual_keydown_to_second_raf_p50_ms,
				`keydown to first changed trace screenshot` = screenshot_first_changed_after_keydown_p50_ms
			)
	) %>%
		bind_rows() %>%
		pivot_longer(
			cols = -c(probe, input_mode, delay_ms),
			names_to = "endpoint",
			values_to = "p50_ms"
		) %>%
		filter(!is.na(p50_ms), delay_ms %in% c(990, 1000, 1300))

	visual_endpoint_drop_summary <- visual_endpoint_rows %>%
		group_by(probe, input_mode, endpoint) %>%
		summarise(
			p50_990_ms = p50_ms[delay_ms == 990][1],
			p50_1000_ms = p50_ms[delay_ms == 1000][1],
			p50_1300_ms = p50_ms[delay_ms == 1300][1],
			slow_neighbor_mean_ms = mean(c(p50_990_ms, p50_1300_ms), na.rm = TRUE),
			drop_vs_slow_neighbors_ms = slow_neighbor_mean_ms - p50_1000_ms,
			.groups = "drop"
		) %>%
		mutate(
			input_mode = factor(
				input_mode,
				levels = c("key held during delay", "complete keypress then wait")
			),
			probe = factor(
				probe,
				levels = c("visual proxy", "Chrome render trace", "Chrome trace screenshot")
			),
			endpoint = factor(
				endpoint,
				levels = c(
					"EventDispatch trace latency",
					"keydown to input event",
					"keydown to second RAF after input",
					"keydown to Paint trace event",
					"keydown to DrawFrame trace event",
					"keydown to first changed trace screenshot"
				)
			)
		) %>%
		arrange(probe, input_mode, endpoint)

	write_csv(visual_endpoint_drop_summary, visual_endpoint_drop_summary_path)

	save_plot(
		ggplot(
			visual_endpoint_drop_summary,
			aes(drop_vs_slow_neighbors_ms, endpoint, color = input_mode, shape = input_mode)
		) +
			geom_vline(xintercept = 0, linewidth = 0.4, linetype = "dashed", color = "grey50") +
			geom_point(
				size = 3.2,
				alpha = 0.9,
				position = position_dodge(width = 0.45)
			) +
			facet_wrap(vars(probe), ncol = 1, scales = "free_y") +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			labs(
				title = "The 1000ms key-hold drop survives through visual endpoints",
				subtitle = "Drop is mean(990ms, 1300ms) minus 1000ms p50 within each probe; trace screenshots are localized separately",
				x = "1000ms drop versus slow neighbors, p50 (ms)",
				y = NULL,
				color = "Input mode",
				shape = "Input mode"
			) +
			theme(legend.position = "bottom"),
		"114-visual-endpoint-drop-summary.png",
		width = 11,
		height = 8.5
	)
}

if (file.exists(render_trace_samples_path) && file.exists(screenshot_trace_samples_path)) {
	visual_endpoint_alignment_samples <- bind_rows(
		read_csv(render_trace_samples_path, show_col_types = FALSE) %>%
			transmute(
				probe = "Chrome render trace",
				input_mode,
				delay_ms,
				round,
				delay_sample_index,
				event_dispatch_ms = latency_ms,
				`second RAF after input` = visual_keydown_to_second_raf_ms,
				`Paint trace event` = render_first_paint_ms,
				`DrawFrame trace event` = render_first_draw_frame_ms
			),
		read_csv(screenshot_trace_samples_path, show_col_types = FALSE) %>%
			transmute(
				probe = "Chrome trace screenshot",
				input_mode,
				delay_ms,
				round,
				delay_sample_index,
				event_dispatch_ms = latency_ms,
				`second RAF after input` = visual_keydown_to_second_raf_ms,
				`first changed trace screenshot` = screenshot_first_changed_after_keydown_ms
			)
	) %>%
		pivot_longer(
			cols = -c(probe, input_mode, delay_ms, round, delay_sample_index, event_dispatch_ms),
			names_to = "endpoint",
			values_to = "endpoint_ms"
		) %>%
		filter(!is.na(endpoint_ms), delay_ms %in% c(990, 1000, 1300)) %>%
		mutate(
			endpoint_minus_event_dispatch_ms = endpoint_ms - event_dispatch_ms,
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("990ms", "1000ms", "1300ms")),
			input_mode = factor(input_mode, levels = c("key held during delay", "complete keypress then wait")),
			probe = factor(probe, levels = c("Chrome render trace", "Chrome trace screenshot"))
		)

	write_csv(visual_endpoint_alignment_samples, visual_endpoint_alignment_samples_path)

	visual_endpoint_alignment_summary <- visual_endpoint_alignment_samples %>%
		group_by(probe, input_mode, endpoint, delay_ms) %>%
		summarize(
			retained_n = n(),
			event_dispatch_p50_ms = median(event_dispatch_ms, na.rm = TRUE),
			endpoint_p50_ms = median(endpoint_ms, na.rm = TRUE),
			endpoint_minus_event_dispatch_p10_ms = quant(endpoint_minus_event_dispatch_ms, 0.1),
			endpoint_minus_event_dispatch_p50_ms = median(endpoint_minus_event_dispatch_ms, na.rm = TRUE),
			endpoint_minus_event_dispatch_p90_ms = quant(endpoint_minus_event_dispatch_ms, 0.9),
			event_endpoint_correlation = if (
				n() >= 3 &&
					sd(event_dispatch_ms, na.rm = TRUE) > 0 &&
					sd(endpoint_ms, na.rm = TRUE) > 0
			) {
				cor(event_dispatch_ms, endpoint_ms, use = "complete.obs")
			} else {
				NA_real_
			},
			endpoint_at_or_after_event_dispatch_count = sum(endpoint_ms >= event_dispatch_ms, na.rm = TRUE),
			.groups = "drop"
		) %>%
		arrange(probe, input_mode, endpoint, delay_ms)

	write_csv(visual_endpoint_alignment_summary, visual_endpoint_alignment_summary_path)

	visual_endpoint_alignment_plot <- visual_endpoint_alignment_samples %>%
		filter(input_mode == "key held during delay") %>%
		mutate(
			endpoint = factor(
				endpoint,
				levels = c(
					"second RAF after input",
					"Paint trace event",
					"DrawFrame trace event",
					"first changed trace screenshot"
				)
			)
		)

	save_plot(
		ggplot(visual_endpoint_alignment_plot, aes(event_dispatch_ms, endpoint_ms, color = delay_label)) +
			geom_abline(slope = 1, intercept = 0, linetype = "dashed", linewidth = 0.35, color = "grey50") +
			geom_point(alpha = 0.78, size = 2.2) +
			facet_grid(probe ~ endpoint, scales = "free") +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Delay") +
			labs(
				title = "Render and screenshot endpoints track the key-held EventDispatch drop per sample",
				subtitle = "Each point is one retained key; dashed line is endpoint time equal to EventDispatch latency",
				x = "EventDispatch trace latency (ms)",
				y = "Endpoint latency from keydown (ms)"
			) +
			theme(
				legend.position = "bottom",
				axis.text.x = element_text(angle = 25, hjust = 1)
			),
		"123-visual-endpoint-alignment.png",
		width = 13,
		height = 7.4
	)

	visual_endpoint_decomposition_summary <- visual_endpoint_alignment_summary %>%
		group_by(probe, input_mode, endpoint) %>%
		summarize(
			event_dispatch_p50_990_ms = event_dispatch_p50_ms[delay_ms == 990][1],
			event_dispatch_p50_1000_ms = event_dispatch_p50_ms[delay_ms == 1000][1],
			event_dispatch_p50_1300_ms = event_dispatch_p50_ms[delay_ms == 1300][1],
			post_dispatch_p50_990_ms = endpoint_minus_event_dispatch_p50_ms[delay_ms == 990][1],
			post_dispatch_p50_1000_ms = endpoint_minus_event_dispatch_p50_ms[delay_ms == 1000][1],
			post_dispatch_p50_1300_ms = endpoint_minus_event_dispatch_p50_ms[delay_ms == 1300][1],
			endpoint_p50_990_ms = endpoint_p50_ms[delay_ms == 990][1],
			endpoint_p50_1000_ms = endpoint_p50_ms[delay_ms == 1000][1],
			endpoint_p50_1300_ms = endpoint_p50_ms[delay_ms == 1300][1],
			.groups = "drop"
		) %>%
		filter(
			!is.na(event_dispatch_p50_990_ms),
			!is.na(event_dispatch_p50_1000_ms),
			!is.na(event_dispatch_p50_1300_ms),
			!is.na(post_dispatch_p50_990_ms),
			!is.na(post_dispatch_p50_1000_ms),
			!is.na(post_dispatch_p50_1300_ms),
			!is.na(endpoint_p50_990_ms),
			!is.na(endpoint_p50_1000_ms),
			!is.na(endpoint_p50_1300_ms)
		) %>%
		mutate(
			event_dispatch_slow_neighbor_mean_ms = (event_dispatch_p50_990_ms + event_dispatch_p50_1300_ms) / 2,
			post_dispatch_slow_neighbor_mean_ms = (post_dispatch_p50_990_ms + post_dispatch_p50_1300_ms) / 2,
			endpoint_slow_neighbor_mean_ms = (endpoint_p50_990_ms + endpoint_p50_1300_ms) / 2,
			event_dispatch_drop_vs_slow_neighbors_ms = event_dispatch_slow_neighbor_mean_ms - event_dispatch_p50_1000_ms,
			post_dispatch_drop_vs_slow_neighbors_ms = post_dispatch_slow_neighbor_mean_ms - post_dispatch_p50_1000_ms,
			endpoint_drop_vs_slow_neighbors_ms = endpoint_slow_neighbor_mean_ms - endpoint_p50_1000_ms,
			event_dispatch_share_of_endpoint_drop = event_dispatch_drop_vs_slow_neighbors_ms / endpoint_drop_vs_slow_neighbors_ms,
			post_dispatch_share_of_endpoint_drop = post_dispatch_drop_vs_slow_neighbors_ms / endpoint_drop_vs_slow_neighbors_ms
		) %>%
		arrange(probe, input_mode, endpoint)

	write_csv(
		visual_endpoint_decomposition_summary,
		file.path(data_dir, "typing-delay-visual-endpoint-decomposition-summary.csv")
	)

	visual_endpoint_decomposition_plot <- visual_endpoint_decomposition_summary %>%
		filter(input_mode == "key held during delay") %>%
		transmute(
			probe,
			endpoint,
			`endpoint total` = endpoint_drop_vs_slow_neighbors_ms,
			`EventDispatch slice` = event_dispatch_drop_vs_slow_neighbors_ms,
			`post-EventDispatch tail` = post_dispatch_drop_vs_slow_neighbors_ms
		) %>%
		pivot_longer(
			cols = c(`endpoint total`, `EventDispatch slice`, `post-EventDispatch tail`),
			names_to = "component",
			values_to = "drop_vs_slow_neighbors_ms"
		) %>%
		mutate(
			component = factor(
				component,
				levels = c("endpoint total", "EventDispatch slice", "post-EventDispatch tail")
			),
			endpoint = factor(
				endpoint,
				levels = c(
					"second RAF after input",
					"Paint trace event",
					"DrawFrame trace event",
					"first changed trace screenshot"
				)
			)
		)

	save_plot(
		ggplot(
			visual_endpoint_decomposition_plot,
			aes(drop_vs_slow_neighbors_ms, endpoint, color = component, shape = component)
		) +
			geom_vline(xintercept = 0, linewidth = 0.35, linetype = "dashed", color = "grey55") +
			geom_point(
				size = 3.1,
				alpha = 0.9,
				position = position_dodge(width = 0.45)
			) +
			facet_wrap(vars(probe), ncol = 1, scales = "free_y") +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Component") +
			labs(
				title = "The visual-endpoint speedup is mostly before post-dispatch rendering",
				subtitle = "Drops are mean(990ms, 1300ms) minus 1000ms p50; components use separate medians, so they are diagnostic rather than exactly additive",
				x = "1000ms drop versus slow neighbors, p50 (ms)",
				y = NULL,
				shape = "Component"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"126-visual-endpoint-drop-decomposition.png",
		width = 12,
		height = 7.4
	)

	presentation_calibration_contract_audit <- tribble(
		~presentation_question, ~current_local_answer, ~what_is_closed, ~remaining_caveat, ~calibration_contract, ~decision,
		"Is the cliff only a Chrome EventDispatch accounting artifact?",
		"No.",
		"Key-held 1000ms drops persist through editor input, second RAF, Paint, DrawFrame, first changed trace screenshot, and localized changed pixels.",
		"These endpoints are still browser-derived and not an external display measurement.",
		"No new calibration is needed for this internal-browser claim; keep reporting it as Chromium visual/render endpoint evidence, not hardware-to-screen latency.",
		"closed locally",
		"Is the changed trace screenshot unrelated to the typed character?",
		"No for these runs.",
		"Every decoded retained pixel-localization sample overlaps the target textbox and the typed x range in both input modes at 990ms, 1000ms, and 1300ms.",
		"Pixel overlap is not OCR and does not semantically prove the glyph a user perceived.",
		"An OCR or image-recognition pass should crop the DOM range, require recognition of the newly inserted glyph, and report first recognized-glyph timestamp against the same keydown/EventDispatch window.",
		"semantic recognition only",
		"Is post-EventDispatch rendering the main visual cliff?",
		"No.",
		"Paint and DrawFrame endpoint drops are about 12ms with only 0.2-0.8ms post-EventDispatch tail movement; first changed screenshots have a larger 2.3ms tail but still mostly follow EventDispatch.",
		"A calibrated presentation pipeline could add compositor/display tail that these traces do not measure.",
		"Compositor/presentation tracing should decompose keydown to EventDispatch, Paint/DrawFrame, compositor submit, swap/present, and screenshot/camera-visible glyph for the same retained samples.",
		"tail bounded internally",
		"Can trace screenshots be treated as screen presentation timestamps?",
		"No.",
		"Trace screenshots preserve the key-held shape and localize the changed pixels, but they are Chromium trace artifacts with endpoint-specific offsets.",
		"Actual display presentation, scanout, compositor buffering, and panel timing are unmeasured.",
		"Run compositor presentation traces or high-speed camera capture on the same 990ms, 1000ms, and 1300ms key-held and complete-keypress controls; success requires the 1000ms key-held drop to persist at first presented or first camera-visible glyph.",
		"external calibration required",
		"What can CI claim without external calibration?",
		"That the held-key artifact propagates to Chromium internal visual endpoints, not that a user saw the glyph at that exact timestamp.",
		"The complete-keypress-then-wait control stays flat while the held-key mode moves across multiple internal visual endpoints.",
		"Hardware-to-screen latency and semantic first-visible-glyph timing remain outside the current evidence.",
		"Keep CI/report language scoped to EventDispatch, render trace, and localized trace-screenshot endpoints unless an external presentation/OCR calibration is added.",
		"claim scoped"
	)

	write_csv(
		presentation_calibration_contract_audit,
		file.path(data_dir, "typing-delay-presentation-calibration-contract-audit.csv")
	)

	presentation_external_calibration_runbook_audit <- tribble(
		~validation_lane, ~endpoint_measured, ~required_controls, ~success_gate, ~failure_interpretation, ~claim_boundary,
		"Compositor/presentation trace",
		"Per-sample keydown, EventDispatch, Paint/DrawFrame, compositor submit, swap/present, and any available displayed-frame timestamp from the same browser trace configuration.",
		"Run the same 990ms, 1000ms, and 1300ms key-held rows and matching complete-keypress rows, with browser revision, trace categories, refresh rate, and retained-sample IDs recorded.",
		"The externally presented-frame endpoint preserves the key-held 1000ms drop direction while complete-keypress rows stay flat; the added compositor/display tail is reported separately from EventDispatch.",
		"If presentation timestamps flatten the 1000ms key-held drop, the current claim remains limited to Chromium internal visual endpoints, not presented frames.",
		"Needed only before claiming compositor/display presentation timing.",
		"Semantic glyph recognition",
		"First frame in which an OCR, template-match, or image-recognition pass recognizes the newly inserted glyph in a crop anchored to the DOM Range or textbox target box.",
		"Use the same retained samples as the screenshot-pixel probe, require target-box and typed-range overlap, and preserve the 990ms/1000ms/1300ms key-held plus complete-keypress controls.",
		"Recognized-glyph timing keeps the key-held 1000ms drop and agrees in ordering with localized changed-pixel timing within the declared recognition tolerance.",
		"If recognition disagrees with localized changed pixels, treat the current screenshot result as a pixel-localization result, not semantic first-visible-glyph proof.",
		"Needed only before claiming semantic first-visible-glyph timing.",
		"Trace observer control",
		"Visual endpoint rows with and without trace screenshots, heavy render categories, and the external calibration instrumentation enabled.",
		"Pair each observer-on row with an observer-off or lighter-observer row at the same delay/mode and compare p50 ordering, retained counts, and first-key behavior.",
		"The 1000ms key-held drop persists without relying on the observer that supplies the endpoint, and observer-on overhead is reported as a separate offset.",
		"If the observer creates or erases the drop, keep the result as instrumentation-specific and do not generalize it to user-visible timing.",
		"Required before using trace screenshots or external capture as causal evidence.",
		"High-speed camera/display lane",
		"Camera-visible glyph or display transition timestamp aligned to keydown or a visual trigger, with camera fps, shutter/exposure, display refresh rate, and panel mode recorded.",
		"Use the same delay/mode rows plus a calibration flash or equivalent alignment marker; keep browser trace IDs when possible so camera-visible frames can be joined to EventDispatch and internal visual endpoints.",
		"Camera-visible glyph timing preserves the key-held 1000ms drop direction and gives a stable additive display tail relative to compositor/presented-frame timing.",
		"If camera timing is too noisy or disagrees with compositor traces, report hardware/display timing as unresolved and keep CI claims internal.",
		"Needed only before claiming hardware-to-eye timing.",
		"Decision gate",
		"Joined per-sample table covering keydown, EventDispatch, RAF, Paint/DrawFrame, changed screenshot, localized pixels, presented frame if available, recognized glyph if available, and camera-visible glyph if used.",
		"Retain the CI p50 discard/window rules, the same input-mode controls, and the same per-sample source IDs so endpoint movement can be decomposed rather than compared across unrelated samples.",
		"The external endpoint confirms the same qualitative shape as the internal endpoint stack and any extra tail is smaller than, or clearly separable from, the EventDispatch-driven drop.",
		"If the joined endpoint stack changes the qualitative conclusion, narrow the report wording to the deepest endpoint that passed and keep the disagreement as the next open question.",
		"Defines when the report may widen beyond Chromium internal visual propagation."
	)

	write_csv(
		presentation_external_calibration_runbook_audit,
		file.path(data_dir, "typing-delay-presentation-external-calibration-runbook-audit.csv")
	)
}

taskpolicy_tier_samples_path <- file.path(data_dir, "typing-delay-taskpolicy-tier-samples.csv")
taskpolicy_tier_summary_path <- file.path(data_dir, "typing-delay-taskpolicy-tier-summary.csv")

read_taskpolicy_tier_runs <- function() {
	raw_base <- file.path(repo_root, "test/performance/artifacts/typing-delay-taskpolicy-tier")
	if (!dir.exists(raw_base)) {
		return(NULL)
	}

	run_dirs <- list.dirs(raw_base, recursive = FALSE, full.names = TRUE)
	rows <- list()
	for (json_dir in run_dirs) {
		mode <- basename(json_dir)
		match <- str_match(mode, "^external-background-taskpolicy-(latency|throughput)-(\\d+)-cpu-noop$")
		if (is.na(match[1, 1])) {
			next
		}
		json_files <- list.files(json_dir, pattern = "^typing-delay-benchmark-.*\\.json$", full.names = TRUE)
		if (length(json_files) == 0) {
			next
		}
		raw <- fromJSON(json_files[[1]], flatten = TRUE)
		if (is.null(raw$records)) {
			next
		}

		rows[[length(rows) + 1]] <- as_tibble(raw$records) %>%
			filter(!isThrowaway) %>%
			transmute(
				family = match[1, 2],
				tier = as.integer(match[1, 3]),
				mode,
				delay_ms = delayMs,
				round,
				delay_sample_index = delaySampleIndex,
				latency_ms = latencyMs,
				keypress_ms = keypressMs,
				keydown_ms = keydownMs,
				keyup_ms = keyupMs
			)
	}

	if (length(rows) == 0) {
		return(NULL)
	}

	bind_rows(rows)
}

taskpolicy_tier_samples_from_artifacts <- read_taskpolicy_tier_runs()
if (!is.null(taskpolicy_tier_samples_from_artifacts)) {
	taskpolicy_tier_samples <- taskpolicy_tier_samples_from_artifacts
	write_csv(taskpolicy_tier_samples, taskpolicy_tier_samples_path)

	taskpolicy_tier_summary <- taskpolicy_tier_samples %>%
		group_by(family, tier, mode, delay_ms) %>%
		summarise(
			retained_n = n(),
			latency_p10_ms = quant(latency_ms, 0.1),
			latency_p50_ms = quant(latency_ms, 0.5),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_sd_ms = sd(latency_ms),
			keypress_p50_ms = quant(keypress_ms, 0.5),
			keydown_p50_ms = quant(keydown_ms, 0.5),
			keyup_p50_ms = quant(keyup_ms, 0.5),
			.groups = "drop"
		)
	write_csv(taskpolicy_tier_summary, taskpolicy_tier_summary_path)
}

if (file.exists(taskpolicy_tier_summary_path)) {
	taskpolicy_tier_summary <- read_csv(taskpolicy_tier_summary_path, show_col_types = FALSE) %>%
		mutate(
			family = factor(family, levels = c("latency", "throughput")),
			family_label = fct_recode(
				family,
				`taskpolicy -l latency tier` = "latency",
				`taskpolicy -t throughput tier` = "throughput"
			)
		)

	save_plot(
		ggplot(taskpolicy_tier_summary, aes(tier, latency_p50_ms, color = family_label, shape = family_label)) +
			geom_linerange(aes(ymin = latency_p10_ms, ymax = latency_p90_ms), alpha = 0.45, linewidth = 0.9) +
			geom_point(size = 3.2, alpha = 0.95) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_x_continuous(breaks = 0:5) +
			labs(
				title = "Taskpolicy latency and throughput tiers still keep the no-op timer fast",
				subtitle = "1250ms no-op timer, 1300ms held key, one background CPU child; ranges are p10-p90 over 24 retained samples",
				x = "Tier",
				y = "Next EventDispatch duration (ms)",
				color = "Policy",
				shape = "Policy"
			),
		"109-taskpolicy-tier-sweep.png",
		width = 9.4,
		height = 6.4
	)
}

if (file.exists(ci_dense_n50_summary_path)) {
	ci_held_key_delay_runtime_reliability <- read_csv(ci_dense_n50_summary_path, show_col_types = FALSE) %>%
		transmute(
			input_mode = "current CI held key",
			delay_ms,
			retained_n,
			reported_q50_ms = latency_p50_ms,
			reported_mean_ms = latency_mean_ms,
			reported_sd_ms = latency_sd_ms,
			reported_cv = latency_cv,
			reported_p10_ms = latency_p10_ms,
			reported_p90_ms = latency_p90_ms,
			typing_metrics_per_branch = 5,
			compared_branches = 2,
			delay_intervals_per_metric = 11,
			two_branch_intentional_typing_wait_s =
				compared_branches * typing_metrics_per_branch * delay_intervals_per_metric * delay_ms / 1000,
			two_branch_change_vs_current_s = two_branch_intentional_typing_wait_s - 110,
			two_branch_saved_vs_current_s = 110 - two_branch_intentional_typing_wait_s
		)
	write_csv(
		ci_held_key_delay_runtime_reliability,
		file.path(data_dir, "typing-delay-ci-held-key-delay-runtime-reliability.csv")
	)

	ci_held_key_delay_plot <- ci_held_key_delay_runtime_reliability %>%
		filter(delay_ms <= 1400) %>%
		select(
			delay_ms,
			`two-branch runtime delta vs current (s)` = two_branch_change_vs_current_s,
			`reported q50 (ms)` = reported_q50_ms,
			`within-run CV (%)` = reported_cv
		) %>%
		mutate(`within-run CV (%)` = 100 * `within-run CV (%)`) %>%
		pivot_longer(
			cols = -delay_ms,
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			metric = factor(
				metric,
				levels = c(
					"two-branch runtime delta vs current (s)",
					"reported q50 (ms)",
					"within-run CV (%)"
				)
			)
		)

	save_plot(
		ggplot(ci_held_key_delay_plot, aes(delay_ms, value, color = metric)) +
			geom_hline(
				data = ci_held_key_delay_plot %>%
					filter(metric == "two-branch runtime delta vs current (s)") %>%
					distinct(metric) %>%
					mutate(value = 0),
				aes(yintercept = value),
				color = brewer_color("Greys", 7, type = "seq", n = 9),
				linewidth = 0.35
			) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			geom_point(size = 1.15, alpha = 0.85) +
			scale_x_continuous(breaks = seq(0, 1400, 100)) +
			scale_color_brewer(type = "qual", palette = "Dark2", guide = "none") +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "Reducing the current held-key delay saves time but changes the measured regime",
				subtitle = "CI-comparable saved/reopened large-post setup; n=50 retained samples per delay",
				x = "Current Playwright held-key delay",
				y = NULL
			),
		"94-ci-held-key-delay-runtime-reliability.png",
		width = 10.5,
		height = 8.6
	)
}

ci_key_mode_sample_path <- file.path(data_dir, "typing-delay-ci-key-mode-reliability-samples.csv")
ci_key_mode_run_path <- file.path(data_dir, "typing-delay-ci-key-mode-reliability-runs.csv")
ci_key_mode_summary_path <- file.path(data_dir, "typing-delay-ci-key-mode-reliability-summary.csv")
ci_key_mode_runtime_path <- file.path(data_dir, "typing-delay-ci-key-mode-runtime-reliability.csv")
ci_key_mode_artifact_dirs <- c(
	keyboard = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-mode-reliability-keyboard"),
	`between-keys` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-mode-reliability-between-keys")
)
ci_key_mode_json_paths <- map_chr(ci_key_mode_artifact_dirs, function(artifact_dir) {
	paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
	if (length(paths) == 0) {
		return(NA_character_)
	}
	paths[[which.max(file.info(paths)$mtime)]]
})
ci_key_mode_labels <- c(
	keyboard = "current CI held key",
	`between-keys` = "tap then wait"
)

if (all(!is.na(ci_key_mode_json_paths))) {
	ci_key_mode_samples <- map_dfr(ci_key_mode_json_paths, function(json_path) {
		raw <- fromJSON(json_path, flatten = TRUE)
		as_tibble(raw$records) %>%
			transmute(
				input_mode = ci_key_mode_labels[[raw$metadata$delayMode]],
				delay_mode = raw$metadata$delayMode,
				json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
				delay_ms = delayMs,
				round,
				editor_setup_index = editorSetupIndex,
				sample_index = sampleIndex,
				is_throwaway = isThrowaway,
				latency_ms = latencyMs,
				keydown_ms = keydownMs,
				keypress_ms = keypressMs,
				keyup_ms = keyupMs,
				run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
			)
	})
	write_csv(ci_key_mode_samples, ci_key_mode_sample_path)
} else if (file.exists(ci_key_mode_sample_path)) {
	ci_key_mode_samples <- read_csv(ci_key_mode_sample_path, show_col_types = FALSE)
} else {
	ci_key_mode_samples <- tibble()
}

if (nrow(ci_key_mode_samples) > 0) {
	ci_key_mode_retained <- ci_key_mode_samples %>% filter(!is_throwaway)
	ci_key_mode_runs <- ci_key_mode_retained %>%
		group_by(input_mode, delay_mode, json_path, delay_ms, round, editor_setup_index) %>%
		summarize(
			retained_n = n(),
			reported_q50_ms = median(latency_ms),
			reported_mean_ms = mean(latency_ms),
			reported_sd_ms = sd(latency_ms),
			reported_cv = reported_sd_ms / reported_mean_ms,
			reported_p10_ms = quant(latency_ms, 0.1),
			reported_p90_ms = quant(latency_ms, 0.9),
			run_duration_ms = first(run_duration_ms),
			.groups = "drop"
		)
	write_csv(ci_key_mode_runs, ci_key_mode_run_path)

	ci_key_mode_summary <- ci_key_mode_retained %>%
		group_by(input_mode, delay_mode, delay_ms) %>%
		summarize(
			retained_n = n(),
			latency_p10_ms = quant(latency_ms, 0.1),
			latency_p50_ms = median(latency_ms),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_mean_ms = mean(latency_ms),
			latency_sd_ms = sd(latency_ms),
			latency_cv = latency_sd_ms / latency_mean_ms,
			latency_min_ms = min(latency_ms),
			latency_max_ms = max(latency_ms),
			keydown_p50_ms = median(keydown_ms),
			keypress_p50_ms = median(keypress_ms),
			keyup_p50_ms = median(keyup_ms),
			.groups = "drop"
		) %>%
		left_join(
			ci_key_mode_runs %>%
				group_by(input_mode, delay_mode, delay_ms) %>%
				summarize(
					run_count = n(),
					run_reported_q50_median_ms = median(reported_q50_ms),
					run_reported_q50_sd_ms = sd(reported_q50_ms),
					run_reported_q50_min_ms = min(reported_q50_ms),
					run_reported_q50_max_ms = max(reported_q50_ms),
					run_reported_q50_range_ms = run_reported_q50_max_ms - run_reported_q50_min_ms,
					run_duration_median_ms = median(run_duration_ms),
					.groups = "drop"
				),
			by = c("input_mode", "delay_mode", "delay_ms")
		)
	write_csv(ci_key_mode_summary, ci_key_mode_summary_path)

	ci_key_mode_runtime <- ci_key_mode_summary %>%
		mutate(
			input_mode = factor(input_mode, levels = c("current CI held key", "tap then wait")),
			typing_metrics_per_branch = 5,
			compared_branches = 2,
			delay_intervals_per_metric = if_else(delay_mode == "between-keys", 10, 11),
			two_branch_intentional_typing_wait_s =
				compared_branches * typing_metrics_per_branch * delay_intervals_per_metric * delay_ms / 1000,
			two_branch_change_vs_current_held_key_s = two_branch_intentional_typing_wait_s - 110,
			two_branch_saved_vs_current_held_key_s = 110 - two_branch_intentional_typing_wait_s
		)
	write_csv(ci_key_mode_runtime, ci_key_mode_runtime_path)

	ci_key_mode_summary_plot <- ci_key_mode_summary %>%
		mutate(input_mode = factor(input_mode, levels = c("current CI held key", "tap then wait")))
	key_mode_dodge <- position_dodge(width = 28)

	save_plot(
		ggplot(ci_key_mode_summary_plot, aes(delay_ms, latency_p50_ms, color = input_mode)) +
			geom_linerange(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				position = key_mode_dodge,
				alpha = 0.7,
				linewidth = 0.8
			) +
			geom_point(position = key_mode_dodge, size = 2.7, alpha = 0.95) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			scale_x_continuous(breaks = sort(unique(ci_key_mode_summary_plot$delay_ms))) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Input mode") +
			labs(
				title = "Tap-then-wait is a different and more stable CI typing metric",
				subtitle = "Same saved/reopened large-post setup; points are p50, vertical bars are p10-p90; 40 retained samples per delay and mode",
				x = "Configured delay",
				y = "Latency, keydown + keypress + keyup (ms)"
			),
		"95-ci-key-mode-p50-comparison.png",
		width = 9.8,
		height = 5.6
	)

	ci_key_mode_reliability_plot <- ci_key_mode_runtime %>%
		select(
			input_mode,
			delay_ms,
			`two-branch runtime delta vs current held-key 1000ms (s)` = two_branch_change_vs_current_held_key_s,
			`run-to-run reported q50 sd (ms)` = run_reported_q50_sd_ms,
			`within-run CV (%)` = latency_cv
		) %>%
		mutate(`within-run CV (%)` = 100 * `within-run CV (%)`) %>%
		pivot_longer(
			cols = -c(input_mode, delay_ms),
			names_to = "metric",
			values_to = "value"
		) %>%
		mutate(
			input_mode = factor(input_mode, levels = c("current CI held key", "tap then wait")),
			metric = factor(
				metric,
				levels = c(
					"two-branch runtime delta vs current held-key 1000ms (s)",
					"run-to-run reported q50 sd (ms)",
					"within-run CV (%)"
				)
			)
		)

	save_plot(
		ggplot(ci_key_mode_reliability_plot, aes(delay_ms, value, color = input_mode)) +
			geom_hline(
				data = ci_key_mode_reliability_plot %>%
					filter(metric == "two-branch runtime delta vs current held-key 1000ms (s)") %>%
					distinct(metric) %>%
					mutate(value = 0),
				aes(yintercept = value),
				color = brewer_color("Greys", 7, type = "seq", n = 9),
				linewidth = 0.35
			) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			geom_point(position = key_mode_dodge, size = 2.5, alpha = 0.95) +
			scale_x_continuous(breaks = sort(unique(ci_key_mode_reliability_plot$delay_ms))) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Input mode") +
			facet_wrap(vars(metric), ncol = 1, scales = "free_y") +
			labs(
				title = "Tap mode removes most of the held-key delay volatility",
				subtitle = "Current CI holds each key during Playwright's delay; tap mode waits after keyup instead",
				x = "Configured delay",
				y = NULL
			),
		"96-ci-key-mode-runtime-reliability.png",
		width = 10,
		height = 8.2
	)
}

ci_hold_duration_sample_path <- file.path(data_dir, "typing-delay-ci-hold-duration-samples.csv")
ci_hold_duration_run_path <- file.path(data_dir, "typing-delay-ci-hold-duration-runs.csv")
ci_hold_duration_summary_path <- file.path(data_dir, "typing-delay-ci-hold-duration-summary.csv")
ci_hold_duration_runtime_path <- file.path(data_dir, "typing-delay-ci-hold-duration-runtime-reliability.csv")
ci_hold_duration_round_robustness_path <- file.path(data_dir, "typing-delay-ci-hold-duration-round-robustness.csv")
ci_hold_duration_round_sign_path <- file.path(data_dir, "typing-delay-ci-hold-duration-round-sign-check.csv")
ci_hold_duration_leave_one_path <- file.path(data_dir, "typing-delay-ci-hold-duration-leave-one-round.csv")
ci_hold_duration_leave_one_summary_path <- file.path(data_dir, "typing-delay-ci-hold-duration-leave-one-round-summary.csv")
ci_hold_duration_event_shape_path <- file.path(data_dir, "typing-delay-ci-hold-duration-event-shape.csv")
ci_hold_duration_sample_position_path <- file.path(data_dir, "typing-delay-ci-hold-duration-sample-position.csv")
ci_hold_duration_paired_difference_path <- file.path(data_dir, "typing-delay-ci-hold-duration-paired-differences.csv")
ci_hold_duration_throwaway_sensitivity_path <- file.path(data_dir, "typing-delay-ci-hold-duration-throwaway-sensitivity.csv")
ci_hold_duration_order_diagnostics_path <- file.path(data_dir, "typing-delay-ci-hold-duration-order-diagnostics.csv")
ci_hold_duration_keydown_sensitivity_path <- file.path(data_dir, "typing-delay-ci-hold-duration-keydown-sensitivity.csv")
ci_hold_duration_pooled_run_summary_path <- file.path(data_dir, "typing-delay-ci-hold-duration-pooled-run-summary.csv")
ci_code_path_sample_path <- file.path(data_dir, "typing-delay-ci-code-path-samples.csv")
ci_code_path_run_path <- file.path(data_dir, "typing-delay-ci-code-path-runs.csv")
ci_code_path_summary_path <- file.path(data_dir, "typing-delay-ci-code-path-summary.csv")
ci_fresh_code_path_sample_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-samples.csv")
ci_fresh_code_path_run_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-runs.csv")
ci_fresh_code_path_summary_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-summary.csv")
ci_fresh_code_path_paired_difference_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-paired-differences.csv")
ci_fresh_code_path_api_delta_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-api-deltas.csv")
ci_fresh_code_path_predictor_audit_path <- file.path(data_dir, "typing-delay-ci-fresh-code-path-predictor-audit.csv")
input_api_boundary_next_control_audit_path <- file.path(data_dir, "typing-delay-input-api-boundary-next-control-audit.csv")
ci_keyboard_prelude_control_sample_path <- file.path(data_dir, "typing-delay-ci-keyboard-prelude-control-samples.csv")
ci_keyboard_prelude_control_run_path <- file.path(data_dir, "typing-delay-ci-keyboard-prelude-control-runs.csv")
ci_keyboard_prelude_control_summary_path <- file.path(data_dir, "typing-delay-ci-keyboard-prelude-control-summary.csv")
ci_keyboard_prelude_control_delta_path <- file.path(data_dir, "typing-delay-ci-keyboard-prelude-control-deltas.csv")
ci_hold_duration_artifact_dirs <- c(
	`current CI held key` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-keyboard"),
	`100ms hold then wait` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-hold-100"),
	`50ms hold then wait` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-hold-50"),
	`tap then wait` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-between-keys")
)
ci_hold_duration_json_paths <- map_chr(ci_hold_duration_artifact_dirs, function(artifact_dir) {
	paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
	if (length(paths) == 0) {
		return(NA_character_)
	}
	paths[[which.max(file.info(paths)$mtime)]]
})

if (all(!is.na(ci_hold_duration_json_paths))) {
	ci_hold_duration_samples <- imap_dfr(ci_hold_duration_json_paths, function(json_path, input_mode) {
		raw <- fromJSON(json_path, flatten = TRUE)
		requested_hold_ms <- case_when(
			raw$metadata$delayMode == "keyboard" ~ NA_real_,
			raw$metadata$delayMode == "between-keys" ~ 0,
			TRUE ~ as.numeric(raw$metadata$keyHoldMs %||% NA_real_)
		)
		as_tibble(raw$records) %>%
			transmute(
				input_mode,
				run_key = case_when(
					raw$metadata$delayMode == "keyboard" ~ "keyboard",
					raw$metadata$delayMode == "between-keys" ~ "between-keys",
					TRUE ~ paste0("hold_", requested_hold_ms)
				),
				delay_mode = raw$metadata$delayMode,
				requested_hold_ms = requested_hold_ms,
				json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
				delay_ms = delayMs,
				round,
				editor_setup_index = editorSetupIndex,
				sample_index = sampleIndex,
				is_throwaway = isThrowaway,
				keydown_event_count = keydownEventCount,
				latency_ms = latencyMs,
				latency_all_keydowns_ms = latencyAllKeydownsMs,
				keydown_ms = keydownMs,
				keydown_all_ms = keydownAllMs,
				keypress_ms = keypressMs,
				keyup_ms = keyupMs,
				run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
			)
	}) %>%
		mutate(
			requested_hold_ms = as.numeric(requested_hold_ms),
			effective_hold_ms = case_when(
				delay_mode == "keyboard" ~ delay_ms,
				delay_mode == "between-keys" ~ 0,
				TRUE ~ pmin(requested_hold_ms, delay_ms)
			),
			post_keyup_wait_ms = case_when(
				delay_mode == "keyboard" ~ 0,
				delay_mode == "between-keys" ~ delay_ms,
				TRUE ~ pmax(delay_ms - effective_hold_ms, 0)
			)
		)
	write_csv(ci_hold_duration_samples, ci_hold_duration_sample_path)
} else if (file.exists(ci_hold_duration_sample_path)) {
	ci_hold_duration_samples <- read_csv(ci_hold_duration_sample_path, show_col_types = FALSE)
} else {
	ci_hold_duration_samples <- tibble()
}

if (all(!is.na(ci_hold_duration_json_paths))) {
	ci_hold_duration_delay_summaries <- imap_dfr(ci_hold_duration_json_paths, function(json_path, input_mode) {
		raw <- fromJSON(json_path, flatten = TRUE)
		requested_hold_ms <- case_when(
			raw$metadata$delayMode == "keyboard" ~ NA_real_,
			raw$metadata$delayMode == "between-keys" ~ 0,
			TRUE ~ as.numeric(raw$metadata$keyHoldMs %||% NA_real_)
		)
		as_tibble(raw$delayRunSummaries) %>%
			transmute(
				input_mode,
				delay_mode = raw$metadata$delayMode,
				requested_hold_ms = requested_hold_ms,
				json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
				delay_ms = delayMs,
				round,
				editor_setup_index = editorSetupIndex,
				setup_work_ms = editorSetupReadyAtEpochMs - editorSetupWorkStartedAtEpochMs,
				setup_total_ms = editorSetupStoppedAtEpochMs - editorSetupStartedAtEpochMs
			)
	})
} else {
	ci_hold_duration_delay_summaries <- tibble()
}

if (nrow(ci_hold_duration_samples) > 0) {
	ci_hold_duration_retained <- ci_hold_duration_samples %>% filter(!is_throwaway)
	ci_hold_duration_event_shape <- ci_hold_duration_samples %>%
		group_by(input_mode, delay_ms, round) %>%
		summarize(
			expected_key_groups = n(),
			observed_key_groups = sum(!is.na(latency_ms)),
			keydown_events = sum(keydown_event_count, na.rm = TRUE),
			keypress_events = sum(!is.na(keypress_ms)),
			keyup_events = sum(!is.na(keyup_ms)),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_event_shape, ci_hold_duration_event_shape_path)

	ci_hold_duration_sample_position <- ci_hold_duration_retained %>%
		filter(
			input_mode == "current CI held key",
			delay_ms %in% c(250, 500),
			sample_index %in% c(1, 10)
		) %>%
		group_by(delay_ms, sample_index) %>%
		summarize(
			median_latency_ms = median(latency_ms),
			median_keypress_ms = median(keypress_ms),
			sample_count = n(),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_sample_position, ci_hold_duration_sample_position_path)

	ci_hold_duration_runs <- ci_hold_duration_retained %>%
		group_by(
			input_mode,
			run_key,
			delay_mode,
			requested_hold_ms,
			effective_hold_ms,
			post_keyup_wait_ms,
			json_path,
			delay_ms,
			round,
			editor_setup_index
		) %>%
		summarize(
			retained_n = n(),
			reported_q50_ms = median(latency_ms),
			reported_mean_ms = mean(latency_ms),
			reported_sd_ms = sd(latency_ms),
			reported_cv = reported_sd_ms / reported_mean_ms,
			reported_p10_ms = quant(latency_ms, 0.1),
			reported_p90_ms = quant(latency_ms, 0.9),
			run_duration_ms = first(run_duration_ms),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_runs, ci_hold_duration_run_path)

	ci_hold_duration_summary <- ci_hold_duration_retained %>%
		group_by(
			input_mode,
			run_key,
			delay_mode,
			requested_hold_ms,
			effective_hold_ms,
			post_keyup_wait_ms,
			delay_ms
		) %>%
		summarize(
			retained_n = n(),
			latency_p10_ms = quant(latency_ms, 0.1),
			latency_p50_ms = median(latency_ms),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_mean_ms = mean(latency_ms),
			latency_sd_ms = sd(latency_ms),
			latency_cv = latency_sd_ms / latency_mean_ms,
			latency_min_ms = min(latency_ms),
			latency_max_ms = max(latency_ms),
			keydown_p50_ms = median(keydown_ms),
			keypress_p50_ms = median(keypress_ms),
			keyup_p50_ms = median(keyup_ms),
			.groups = "drop"
		) %>%
		left_join(
			ci_hold_duration_runs %>%
				group_by(
					input_mode,
					run_key,
					delay_mode,
					requested_hold_ms,
					effective_hold_ms,
					post_keyup_wait_ms,
					delay_ms
				) %>%
				summarize(
					run_count = n(),
					run_reported_q50_median_ms = median(reported_q50_ms),
					run_reported_q50_sd_ms = sd(reported_q50_ms),
					run_reported_q50_min_ms = min(reported_q50_ms),
					run_reported_q50_max_ms = max(reported_q50_ms),
					run_reported_q50_range_ms = run_reported_q50_max_ms - run_reported_q50_min_ms,
					run_duration_median_ms = median(run_duration_ms),
					.groups = "drop"
				),
			by = c(
				"input_mode",
				"run_key",
				"delay_mode",
				"requested_hold_ms",
				"effective_hold_ms",
				"post_keyup_wait_ms",
				"delay_ms"
			)
		)
	write_csv(ci_hold_duration_summary, ci_hold_duration_summary_path)

	ci_hold_duration_pooled_run_summary <- ci_hold_duration_summary %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		select(input_mode, delay_ms, pooled_p50_ms = latency_p50_ms) %>%
		left_join(
			ci_hold_duration_runs %>%
				filter(delay_ms %in% c(250, 500, 1000)) %>%
				group_by(input_mode, delay_ms) %>%
				summarize(
					median_run_q50_ms = median(reported_q50_ms),
					mean_run_q50_ms = mean(reported_q50_ms),
					run_q50_sd_ms = sd(reported_q50_ms),
					.groups = "drop"
				),
			by = c("input_mode", "delay_ms")
		) %>%
		mutate(
			pooled_minus_median_run_ms = pooled_p50_ms - median_run_q50_ms,
			pooled_minus_mean_run_ms = pooled_p50_ms - mean_run_q50_ms
		)
	write_csv(ci_hold_duration_pooled_run_summary, ci_hold_duration_pooled_run_summary_path)

	ci_hold_duration_paired_differences <- ci_hold_duration_runs %>%
		filter(delay_ms %in% c(100, 250, 500, 1000)) %>%
		select(delay_ms, round, input_mode, reported_q50_ms) %>%
		pivot_wider(names_from = input_mode, values_from = reported_q50_ms) %>%
		transmute(
			delay_ms,
			round,
			current_ci_held_key_q50_ms = `current CI held key`,
			tap_then_wait_q50_ms = `tap then wait`,
			hold_50_q50_ms = `50ms hold then wait`,
			hold_100_q50_ms = `100ms hold then wait`,
			full_minus_tap_ms = `current CI held key` - `tap then wait`,
			full_minus_50_ms = `current CI held key` - `50ms hold then wait`,
			full_minus_100_ms = `current CI held key` - `100ms hold then wait`,
			hold_100_minus_50_ms = `100ms hold then wait` - `50ms hold then wait`,
			hold_50_minus_tap_ms = `50ms hold then wait` - `tap then wait`,
			hold_100_minus_tap_ms = `100ms hold then wait` - `tap then wait`
		)
	write_csv(ci_hold_duration_paired_differences, ci_hold_duration_paired_difference_path)

	ci_hold_duration_throwaway_sensitivity <- ci_hold_duration_samples %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		cross_join(tibble(throwaway_n = c(0, 1, 2, 3, 5))) %>%
		filter(sample_index >= throwaway_n) %>%
		group_by(throwaway_n, delay_ms, input_mode) %>%
		summarize(
			sample_count = n(),
			latency_p50_ms = median(latency_ms),
			keypress_p50_ms = median(keypress_ms),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_throwaway_sensitivity, ci_hold_duration_throwaway_sensitivity_path)

	ci_hold_duration_keydown_sensitivity <- ci_hold_duration_retained %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		group_by(input_mode, delay_ms) %>%
		summarize(
			sample_count = n(),
			keydown_event_counts = paste(sort(unique(keydown_event_count)), collapse = ";"),
			last_keydown_p50_ms = median(keydown_ms),
			all_keydowns_p50_ms = median(keydown_all_ms),
			extra_keydown_p50_ms = median(keydown_all_ms - keydown_ms),
			latency_p50_ms = median(latency_ms),
			latency_all_keydowns_p50_ms = median(latency_all_keydowns_ms),
			all_keydowns_minus_standard_p50_ms =
				latency_all_keydowns_p50_ms - latency_p50_ms,
			.groups = "drop"
		)
	write_csv(ci_hold_duration_keydown_sensitivity, ci_hold_duration_keydown_sensitivity_path)

	if (nrow(ci_hold_duration_delay_summaries) > 0) {
		ci_hold_duration_order_diagnostics <- ci_hold_duration_runs %>%
			filter(delay_ms %in% c(250, 500, 1000)) %>%
			left_join(
				ci_hold_duration_delay_summaries,
				by = c(
					"input_mode",
					"delay_mode",
					"requested_hold_ms",
					"json_path",
					"delay_ms",
					"round",
					"editor_setup_index"
				)
			) %>%
			arrange(input_mode, round, editor_setup_index) %>%
			group_by(input_mode, round) %>%
			mutate(round_position = row_number()) %>%
			ungroup() %>%
			group_by(input_mode, delay_ms) %>%
			mutate(
				mode_delay_median_q50_ms = median(reported_q50_ms),
				q50_residual_ms = reported_q50_ms - mode_delay_median_q50_ms,
				q50_rank_low_to_high = rank(reported_q50_ms, ties.method = "average"),
				setup_work_rank_low_to_high = rank(setup_work_ms, ties.method = "average"),
				run_duration_rank_low_to_high = rank(run_duration_ms, ties.method = "average")
			) %>%
			ungroup()
		write_csv(ci_hold_duration_order_diagnostics, ci_hold_duration_order_diagnostics_path)
	}

	ci_hold_duration_runtime <- ci_hold_duration_summary %>%
		mutate(
			typing_metrics_per_branch = 5,
			compared_branches = 2,
			per_metric_intentional_typing_wait_ms = 10 * delay_ms + effective_hold_ms,
			two_branch_intentional_typing_wait_s =
				compared_branches * typing_metrics_per_branch * per_metric_intentional_typing_wait_ms / 1000,
			two_branch_change_vs_current_held_key_s = two_branch_intentional_typing_wait_s - 110,
			two_branch_saved_vs_current_held_key_s = 110 - two_branch_intentional_typing_wait_s
		)
	write_csv(ci_hold_duration_runtime, ci_hold_duration_runtime_path)

	ci_hold_duration_levels <- c(
		"current CI held key",
		"100ms hold then wait",
		"50ms hold then wait",
		"tap then wait"
	)
	ci_hold_duration_plot <- ci_hold_duration_summary %>%
		mutate(input_mode = factor(input_mode, levels = ci_hold_duration_levels))
	hold_duration_dodge <- position_dodge(width = 26)

	save_plot(
		ggplot(ci_hold_duration_plot, aes(delay_ms, latency_p50_ms, color = input_mode)) +
			geom_linerange(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				position = hold_duration_dodge,
				alpha = 0.65,
				linewidth = 0.8
			) +
			geom_point(position = hold_duration_dodge, size = 2.55, alpha = 0.95) +
			geom_vline(xintercept = 1000, linetype = "dashed", color = brewer_color("Greys", 7, type = "seq", n = 9)) +
			scale_x_continuous(breaks = sort(unique(ci_hold_duration_plot$delay_ms))) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Input mode") +
			labs(
				title = "Realistic short holds behave much more like tap-then-wait than full-delay holds",
				subtitle = "CI-comparable saved/reopened large-post setup; points are p50, vertical bars are p10-p90; 40 retained samples per delay and mode",
				x = "Configured delay",
				y = "Latency, keydown + keypress + keyup (ms)"
			),
		"95b-ci-key-hold-duration-p50-comparison.png",
		width = 10.2,
		height = 5.9
	)

	ci_hold_duration_throwaway_plot <- ci_hold_duration_throwaway_sensitivity %>%
		mutate(
			input_mode = factor(input_mode, levels = ci_hold_duration_levels),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms"))
		)

	save_plot(
		ggplot(
			ci_hold_duration_throwaway_plot,
			aes(throwaway_n, latency_p50_ms, color = input_mode, shape = input_mode)
		) +
			geom_point(
				position = position_dodge(width = 0.42),
				size = 2.6,
				alpha = 0.92
			) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_x_continuous(breaks = sort(unique(ci_hold_duration_throwaway_plot$throwaway_n))) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Input mode") +
			scale_shape_manual(
				values = c(16, 17, 15, 3),
				name = "Input mode"
			) +
			labs(
				title = "The full-hold result does not depend on discarding exactly one sample",
				subtitle = "Each point recomputes the aggregate p50 after dropping the first N samples from each delay run",
				x = "Thrown-away samples per delay run",
				y = "Aggregate p50 latency (ms)"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"144-ci-key-hold-duration-throwaway-sensitivity.png",
		width = 11.8,
		height = 5.8
	)

	ci_hold_duration_paired_difference_plot <- ci_hold_duration_paired_differences %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		select(delay_ms, round, full_minus_tap_ms, full_minus_50_ms, full_minus_100_ms) %>%
		pivot_longer(
			cols = starts_with("full_minus"),
			names_to = "comparison",
			values_to = "full_hold_delta_ms"
		) %>%
		mutate(
			comparison = recode(
				comparison,
				full_minus_tap_ms = "full hold - tap",
				full_minus_50_ms = "full hold - 50ms hold",
				full_minus_100_ms = "full hold - 100ms hold"
			),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms"))
		)

	save_plot(
		ggplot(
			ci_hold_duration_paired_difference_plot,
			aes(round, full_hold_delta_ms, color = comparison, shape = comparison)
		) +
			geom_hline(
				yintercept = 0,
				linetype = "dashed",
				color = brewer_color("Greys", 7, type = "seq", n = 9)
			) +
			geom_point(
				position = position_dodge(width = 0.38),
				size = 2.7,
				alpha = 0.92
			) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_x_continuous(breaks = sort(unique(ci_hold_duration_paired_difference_plot$round))) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Paired comparison") +
			scale_shape_manual(
				values = c(16, 17, 15),
				name = "Paired comparison"
			) +
			labs(
				title = "Full-delay hold is reliably slower at 250ms and 500ms, but not cleanly at 1000ms",
				subtitle = "Each point is a paired run q50 difference; positive means current CI full hold is slower",
				x = "Round",
				y = "Full-hold q50 minus comparison q50 (ms)"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"145-ci-key-hold-duration-paired-differences.png",
		width = 11.8,
		height = 5.8
	)

	ci_hold_duration_round_robustness <- ci_hold_duration_runs %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		mutate(input_mode = factor(input_mode, levels = ci_hold_duration_levels)) %>%
		group_by(delay_ms, input_mode) %>%
		summarize(
			run_count = n(),
			median_run_q50_ms = median(reported_q50_ms),
			run_q50_sd_ms = sd(reported_q50_ms),
			drop_round_2_median_run_q50_ms = median(reported_q50_ms[round != 2]),
			min_run_q50_ms = min(reported_q50_ms),
			max_run_q50_ms = max(reported_q50_ms),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_round_robustness, ci_hold_duration_round_robustness_path)

	ci_hold_duration_round_wide <- ci_hold_duration_runs %>%
		filter(delay_ms %in% c(250, 500)) %>%
		select(delay_ms, round, input_mode, reported_q50_ms) %>%
		pivot_wider(names_from = input_mode, values_from = reported_q50_ms)

	ci_hold_duration_round_sign <- tibble(
		comparison_mode = c("tap then wait", "50ms hold then wait", "100ms hold then wait")
	) %>%
		rowwise() %>%
		mutate(
			delay_set = "250ms and 500ms",
			round_comparisons = nrow(ci_hold_duration_round_wide),
			full_hold_higher = sum(ci_hold_duration_round_wide[["current CI held key"]] > ci_hold_duration_round_wide[[comparison_mode]], na.rm = TRUE),
			full_hold_not_higher = round_comparisons - full_hold_higher,
			full_hold_higher_share = full_hold_higher / round_comparisons,
			exception_rounds = paste(
				ci_hold_duration_round_wide$round[
					ci_hold_duration_round_wide[["current CI held key"]] <= ci_hold_duration_round_wide[[comparison_mode]]
				],
				collapse = ";"
			)
		) %>%
		ungroup()
	write_csv(ci_hold_duration_round_sign, ci_hold_duration_round_sign_path)

	ci_hold_duration_leave_one <- expand_grid(
		delay_ms = c(250, 500, 1000),
		comparison_mode = c("tap then wait", "50ms hold then wait", "100ms hold then wait"),
		dropped_round = sort(unique(ci_hold_duration_runs$round))
	) %>%
		mutate(
			full_hold_minus_comparison_ms = pmap_dbl(
				list(delay_ms, comparison_mode, dropped_round),
				function(delay_value, comparison_value, dropped_round_value) {
					round_medians <- ci_hold_duration_runs %>%
						filter(delay_ms == delay_value, round != dropped_round_value) %>%
						group_by(input_mode) %>%
						summarize(median_run_q50_ms = median(reported_q50_ms), .groups = "drop")
					round_medians$median_run_q50_ms[round_medians$input_mode == "current CI held key"] -
						round_medians$median_run_q50_ms[round_medians$input_mode == comparison_value]
				}
			)
		)
	write_csv(ci_hold_duration_leave_one, ci_hold_duration_leave_one_path)

	ci_hold_duration_leave_one_summary <- ci_hold_duration_leave_one %>%
		group_by(delay_ms, comparison_mode) %>%
		summarize(
			min_full_hold_minus_comparison_ms = min(full_hold_minus_comparison_ms),
			max_full_hold_minus_comparison_ms = max(full_hold_minus_comparison_ms),
			.groups = "drop"
		)
	write_csv(ci_hold_duration_leave_one_summary, ci_hold_duration_leave_one_summary_path)

	ci_hold_duration_round_plot <- ci_hold_duration_runs %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		mutate(
			input_mode = factor(input_mode, levels = ci_hold_duration_levels),
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms"))
		)

	save_plot(
		ggplot(
			ci_hold_duration_round_plot,
			aes(round, reported_q50_ms, color = input_mode, shape = input_mode)
		) +
			geom_point(
				position = position_dodge(width = 0.42),
				size = 2.6,
				alpha = 0.92
			) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_x_continuous(breaks = sort(unique(ci_hold_duration_round_plot$round))) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Input mode") +
			scale_shape_manual(
				values = c(16, 17, 15, 3),
				name = "Input mode"
			) +
			labs(
				title = "The full-hold result survives the low shuffled round",
				subtitle = "Each point is one run q50; round 2 is low for several 250ms/500ms modes, so p50 should be read with run-level spread",
				x = "Round",
				y = "Run q50 latency (ms)"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"143-ci-key-hold-duration-round-q50.png",
		width = 11.8,
		height = 5.8
	)
}

ci_code_path_specs <- tribble(
	~input_mode, ~input_api, ~requested_hold_ms, ~artifact_dir,
	"tap then wait", "tap", 0, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-between-keys"),
	"50ms page.keyboard hold", "page.keyboard", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-hold-50"),
	"100ms page.keyboard hold", "page.keyboard", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-hold-100"),
	"50ms locator.type hold", "locator.type", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-locator-type-50"),
	"100ms locator.type hold", "locator.type", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-locator-type-100"),
	"50ms locator.press hold", "locator.press", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-locator-press-50"),
	"75ms locator.press hold", "locator.press", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-codepath-locator-press-75"),
	"100ms locator.press hold", "locator.press", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-locator-press-100")
) %>%
	mutate(
		json_path = map_chr(artifact_dir, function(artifact_dir) {
			paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
			if (length(paths) == 0) {
				return(NA_character_)
			}
			paths[[which.max(file.info(paths)$mtime)]]
		})
	)

if (all(!is.na(ci_code_path_specs$json_path))) {
	ci_code_path_samples <- pmap_dfr(
		ci_code_path_specs,
		function(input_mode, input_api, requested_hold_ms, artifact_dir, json_path) {
			raw <- fromJSON(json_path, flatten = TRUE)
			as_tibble(raw$records) %>%
				transmute(
					input_mode,
					input_api,
					requested_hold_ms = as.numeric(requested_hold_ms),
					delay_mode = raw$metadata$delayMode,
					json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
					delay_ms = delayMs,
					round,
					editor_setup_index = editorSetupIndex,
					sample_index = sampleIndex,
					is_throwaway = isThrowaway,
					keydown_event_count = keydownEventCount,
					latency_ms = latencyMs,
					latency_all_keydowns_ms = latencyAllKeydownsMs,
					keydown_ms = keydownMs,
					keydown_all_ms = keydownAllMs,
					keypress_ms = keypressMs,
					keyup_ms = keyupMs,
					keydown_timestamp_ms = keydownTimestampMs,
					first_keydown_timestamp_ms = firstKeydownTimestampMs,
					keypress_timestamp_ms = keypressTimestampMs,
					keyup_timestamp_ms = keyupTimestampMs,
					run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
				)
		}
	) %>%
		mutate(
			effective_hold_ms = pmin(requested_hold_ms, delay_ms),
			post_keyup_wait_ms = pmax(delay_ms - effective_hold_ms, 0),
			observed_keydown_to_keyup_ms = keyup_timestamp_ms + keyup_ms - first_keydown_timestamp_ms,
			keypress_to_keyup_gap_ms = keyup_timestamp_ms - (keypress_timestamp_ms + keypress_ms)
		)
	write_csv(ci_code_path_samples, ci_code_path_sample_path)
} else if (file.exists(ci_code_path_sample_path)) {
	ci_code_path_samples <- read_csv(ci_code_path_sample_path, show_col_types = FALSE)
} else {
	ci_code_path_samples <- tibble()
}

if (nrow(ci_code_path_samples) > 0) {
	ci_code_path_retained <- ci_code_path_samples %>% filter(!is_throwaway)

	ci_code_path_runs <- ci_code_path_retained %>%
		group_by(
			input_mode,
			input_api,
			requested_hold_ms,
			delay_mode,
			json_path,
			delay_ms,
			round,
			editor_setup_index
		) %>%
		summarize(
			retained_n = n(),
			reported_q50_ms = median(latency_ms),
			keypress_q50_ms = median(keypress_ms),
			observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
			keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
			run_duration_ms = first(run_duration_ms),
			.groups = "drop"
		)
	write_csv(ci_code_path_runs, ci_code_path_run_path)

	ci_code_path_summary <- ci_code_path_retained %>%
		group_by(input_mode, input_api, requested_hold_ms, delay_mode, delay_ms) %>%
		summarize(
			retained_n = n(),
			latency_p10_ms = quant(latency_ms, 0.1),
			latency_p50_ms = median(latency_ms),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_mean_ms = mean(latency_ms),
			latency_sd_ms = sd(latency_ms),
			keydown_p50_ms = median(keydown_ms),
			keypress_p50_ms = median(keypress_ms),
			keyup_p50_ms = median(keyup_ms),
			observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
			keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
			.groups = "drop"
		) %>%
		left_join(
			ci_code_path_runs %>%
				group_by(input_mode, input_api, requested_hold_ms, delay_mode, delay_ms) %>%
				summarize(
					run_count = n(),
					run_reported_q50_median_ms = median(reported_q50_ms),
					run_reported_q50_sd_ms = sd(reported_q50_ms),
					run_reported_q50_min_ms = min(reported_q50_ms),
					run_reported_q50_max_ms = max(reported_q50_ms),
					.groups = "drop"
				),
			by = c("input_mode", "input_api", "requested_hold_ms", "delay_mode", "delay_ms")
		)
	write_csv(ci_code_path_summary, ci_code_path_summary_path)

	ci_code_path_plot <- ci_code_path_summary %>%
		filter(delay_ms %in% c(100, 250, 500, 1000)) %>%
		mutate(
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("100ms", "250ms", "500ms", "1000ms")),
			input_api = factor(input_api, levels = c("tap", "page.keyboard", "locator.type", "locator.press"))
		)

	save_plot(
		ggplot(
			ci_code_path_plot,
			aes(requested_hold_ms, latency_p50_ms, color = input_api, shape = input_api)
		) +
			geom_linerange(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				position = position_dodge(width = 7),
				alpha = 0.6,
				linewidth = 0.8
			) +
			geom_point(
				position = position_dodge(width = 7),
				size = 2.7,
				alpha = 0.92
			) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_x_continuous(breaks = c(0, 50, 75, 100)) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Input API") +
			scale_shape_manual(
				values = c(16, 17, 15, 3),
				name = "Input API"
			) +
			labs(
				title = "The 100ms locator and page-keyboard fixed holds are tap-like; 50ms is a separate slow boundary",
				subtitle = "Reused-editor stable-target code-path controls; points are p50, vertical bars are p10-p90; 40 retained samples per mode and delay",
				x = "Requested key hold before post-keyup wait (ms)",
				y = "Latency, keydown + keypress + keyup (ms)"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"146-ci-key-code-path-hold-boundary.png",
		width = 12.4,
		height = 5.8
	)
}

ci_fresh_code_path_specs <- tribble(
	~input_mode, ~input_api, ~requested_hold_ms, ~artifact_dir,
	"current CI held key", "page.keyboard.type", 0, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard"),
	"tap then wait", "tap", 0, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-tap"),
	"50ms page.keyboard hold", "page.keyboard", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-page-hold-50"),
	"75ms page.keyboard hold", "page.keyboard", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-page-hold-75"),
	"100ms page.keyboard hold", "page.keyboard", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-page-hold-100"),
	"50ms locator.type hold", "locator.type", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-type-50"),
	"75ms locator.type hold", "locator.type", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-type-75"),
	"100ms locator.type hold", "locator.type", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-type-100"),
	"50ms locator.press hold", "locator.press", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-50"),
	"75ms locator.press hold", "locator.press", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-75"),
	"100ms locator.press hold", "locator.press", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-100"),
	"50ms locator.press noWaitAfter hold", "locator.press noWaitAfter", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-no-wait-after-50"),
	"75ms locator.press noWaitAfter hold", "locator.press noWaitAfter", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-no-wait-after-75"),
	"100ms locator.press noWaitAfter hold", "locator.press noWaitAfter", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-locator-press-no-wait-after-100")
) %>%
	mutate(
		json_path = map_chr(artifact_dir, function(artifact_dir) {
			paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
			if (length(paths) == 0) {
				return(NA_character_)
			}
			paths[[which.max(file.info(paths)$mtime)]]
		})
	)

if (all(!is.na(ci_fresh_code_path_specs$json_path))) {
	ci_fresh_code_path_samples <- pmap_dfr(
		ci_fresh_code_path_specs,
		function(input_mode, input_api, requested_hold_ms, artifact_dir, json_path) {
			raw <- fromJSON(json_path, flatten = TRUE)
			as_tibble(raw$records) %>%
				transmute(
					input_mode,
					input_api,
					requested_hold_ms = as.numeric(requested_hold_ms),
					delay_mode = raw$metadata$delayMode,
					json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
					delay_ms = delayMs,
					round,
					editor_setup_index = editorSetupIndex,
					sample_index = sampleIndex,
					is_throwaway = isThrowaway,
					keydown_event_count = keydownEventCount,
					latency_ms = latencyMs,
					latency_all_keydowns_ms = latencyAllKeydownsMs,
					keydown_ms = keydownMs,
					keydown_all_ms = keydownAllMs,
					keypress_ms = keypressMs,
					keyup_ms = keyupMs,
					keydown_timestamp_ms = keydownTimestampMs,
					first_keydown_timestamp_ms = firstKeydownTimestampMs,
					keypress_timestamp_ms = keypressTimestampMs,
					keyup_timestamp_ms = keyupTimestampMs,
					run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
				)
		}
	) %>%
		mutate(
			effective_hold_ms = case_when(
				input_api == "page.keyboard.type" ~ delay_ms,
				input_api == "tap" ~ 0,
				TRUE ~ pmin(requested_hold_ms, delay_ms)
			),
			post_keyup_wait_ms = case_when(
				input_api == "page.keyboard.type" ~ 0,
				input_api == "tap" ~ delay_ms,
				TRUE ~ pmax(delay_ms - effective_hold_ms, 0)
			),
			observed_keydown_to_keyup_ms = keyup_timestamp_ms + keyup_ms - first_keydown_timestamp_ms,
			keypress_to_keyup_gap_ms = keyup_timestamp_ms - (keypress_timestamp_ms + keypress_ms)
		)
	write_csv(ci_fresh_code_path_samples, ci_fresh_code_path_sample_path)
} else if (file.exists(ci_fresh_code_path_sample_path)) {
	ci_fresh_code_path_samples <- read_csv(ci_fresh_code_path_sample_path, show_col_types = FALSE)
} else {
	ci_fresh_code_path_samples <- tibble()
}

if (nrow(ci_fresh_code_path_samples) > 0) {
	ci_fresh_code_path_retained <- ci_fresh_code_path_samples %>% filter(!is_throwaway)

	ci_fresh_code_path_runs <- ci_fresh_code_path_retained %>%
		group_by(
			input_mode,
			input_api,
			requested_hold_ms,
			effective_hold_ms,
			post_keyup_wait_ms,
			delay_mode,
			json_path,
			delay_ms,
			round,
			editor_setup_index
		) %>%
		summarize(
			retained_n = n(),
			reported_q50_ms = median(latency_ms),
			reported_mean_ms = mean(latency_ms),
			reported_sd_ms = sd(latency_ms),
			reported_p10_ms = quant(latency_ms, 0.1),
			reported_p90_ms = quant(latency_ms, 0.9),
			keypress_q50_ms = median(keypress_ms),
			observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
			keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
			run_duration_ms = first(run_duration_ms),
			.groups = "drop"
		)
	write_csv(ci_fresh_code_path_runs, ci_fresh_code_path_run_path)

	ci_fresh_code_path_summary <- ci_fresh_code_path_retained %>%
		group_by(
			input_mode,
			input_api,
			requested_hold_ms,
			effective_hold_ms,
			post_keyup_wait_ms,
			delay_mode,
			delay_ms
		) %>%
		summarize(
			retained_n = n(),
			latency_p10_ms = quant(latency_ms, 0.1),
			latency_p50_ms = median(latency_ms),
			latency_p90_ms = quant(latency_ms, 0.9),
			latency_mean_ms = mean(latency_ms),
			latency_sd_ms = sd(latency_ms),
			keydown_p50_ms = median(keydown_ms),
			keypress_p50_ms = median(keypress_ms),
			keyup_p50_ms = median(keyup_ms),
			latency_all_keydowns_p50_ms = median(latency_all_keydowns_ms),
			observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
			keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
			.groups = "drop"
		) %>%
		left_join(
			ci_fresh_code_path_runs %>%
				group_by(
					input_mode,
					input_api,
					requested_hold_ms,
					effective_hold_ms,
					post_keyup_wait_ms,
					delay_mode,
					delay_ms
				) %>%
				summarize(
					run_count = n(),
					run_reported_q50_median_ms = median(reported_q50_ms),
					run_reported_q50_sd_ms = sd(reported_q50_ms),
					run_reported_q50_min_ms = min(reported_q50_ms),
					run_reported_q50_max_ms = max(reported_q50_ms),
					.groups = "drop"
				),
			by = c(
				"input_mode",
				"input_api",
				"requested_hold_ms",
				"effective_hold_ms",
				"post_keyup_wait_ms",
				"delay_mode",
				"delay_ms"
			)
		)
	write_csv(ci_fresh_code_path_summary, ci_fresh_code_path_summary_path)

	ci_fresh_code_path_paired_differences <- ci_fresh_code_path_runs %>%
		filter(delay_ms %in% c(250, 500, 1000)) %>%
		select(delay_ms, round, input_mode, reported_q50_ms) %>%
		pivot_wider(names_from = input_mode, values_from = reported_q50_ms) %>%
		transmute(
			delay_ms,
			round,
			current_ci_held_key_q50_ms = `current CI held key`,
			tap_then_wait_q50_ms = `tap then wait`,
			page_hold_50_q50_ms = `50ms page.keyboard hold`,
			page_hold_75_q50_ms = `75ms page.keyboard hold`,
			page_hold_100_q50_ms = `100ms page.keyboard hold`,
			locator_type_hold_50_q50_ms = `50ms locator.type hold`,
			locator_type_hold_75_q50_ms = `75ms locator.type hold`,
			locator_type_hold_100_q50_ms = `100ms locator.type hold`,
			locator_press_hold_50_q50_ms = `50ms locator.press hold`,
			locator_press_hold_75_q50_ms = `75ms locator.press hold`,
			locator_press_hold_100_q50_ms = `100ms locator.press hold`,
			locator_press_no_wait_after_hold_50_q50_ms = `50ms locator.press noWaitAfter hold`,
			locator_press_no_wait_after_hold_75_q50_ms = `75ms locator.press noWaitAfter hold`,
			locator_press_no_wait_after_hold_100_q50_ms = `100ms locator.press noWaitAfter hold`,
			full_minus_tap_ms = `current CI held key` - `tap then wait`,
			full_minus_page_50_ms = `current CI held key` - `50ms page.keyboard hold`,
			full_minus_page_75_ms = `current CI held key` - `75ms page.keyboard hold`,
			full_minus_page_100_ms = `current CI held key` - `100ms page.keyboard hold`,
			full_minus_locator_type_50_ms = `current CI held key` - `50ms locator.type hold`,
			full_minus_locator_type_75_ms = `current CI held key` - `75ms locator.type hold`,
			full_minus_locator_type_100_ms = `current CI held key` - `100ms locator.type hold`,
			full_minus_locator_press_50_ms = `current CI held key` - `50ms locator.press hold`,
			full_minus_locator_press_75_ms = `current CI held key` - `75ms locator.press hold`,
			full_minus_locator_press_100_ms = `current CI held key` - `100ms locator.press hold`,
			full_minus_locator_press_no_wait_after_50_ms = `current CI held key` - `50ms locator.press noWaitAfter hold`,
			full_minus_locator_press_no_wait_after_75_ms = `current CI held key` - `75ms locator.press noWaitAfter hold`,
			full_minus_locator_press_no_wait_after_100_ms = `current CI held key` - `100ms locator.press noWaitAfter hold`
		)
	write_csv(ci_fresh_code_path_paired_differences, ci_fresh_code_path_paired_difference_path)

	ci_fresh_code_path_api_deltas <- ci_fresh_code_path_summary %>%
		filter(delay_ms %in% c(250, 500, 1000), input_api != "page.keyboard.type") %>%
		select(
			input_mode,
			input_api,
			requested_hold_ms,
			delay_ms,
			retained_n,
			latency_p50_ms,
			latency_p10_ms,
			latency_p90_ms,
			keypress_p50_ms,
			observed_keydown_to_keyup_p50_ms,
			keypress_to_keyup_gap_p50_ms
		) %>%
		left_join(
			ci_fresh_code_path_summary %>%
				filter(delay_ms %in% c(250, 500, 1000), input_api == "tap") %>%
				select(delay_ms, tap_latency_p50_ms = latency_p50_ms, tap_keypress_p50_ms = keypress_p50_ms),
			by = "delay_ms"
		) %>%
		left_join(
			ci_fresh_code_path_summary %>%
				filter(delay_ms %in% c(250, 500, 1000), input_api == "page.keyboard.type") %>%
				select(delay_ms, current_ci_latency_p50_ms = latency_p50_ms),
			by = "delay_ms"
		) %>%
		mutate(
			latency_minus_tap_p50_ms = latency_p50_ms - tap_latency_p50_ms,
			keypress_minus_tap_p50_ms = keypress_p50_ms - tap_keypress_p50_ms,
			latency_minus_current_ci_p50_ms = latency_p50_ms - current_ci_latency_p50_ms,
			phase_label = case_when(
				latency_minus_tap_p50_ms >= 2.5 ~ "slow",
				latency_minus_tap_p50_ms <= 1.0 ~ "tap-like",
				TRUE ~ "mixed"
			)
		) %>%
		arrange(delay_ms, input_api, requested_hold_ms)
	write_csv(ci_fresh_code_path_api_deltas, ci_fresh_code_path_api_delta_path)

	fresh_delta_value <- function(input_api_value, requested_hold_ms_value, delay_ms_value, column_name) {
		ci_fresh_code_path_api_deltas %>%
			filter(
				input_api == input_api_value,
				requested_hold_ms == requested_hold_ms_value,
				delay_ms == delay_ms_value
			) %>%
			pull(all_of(column_name)) %>%
			first()
	}

	fresh_summary_value <- function(input_api_value, requested_hold_ms_value, delay_ms_value, column_name) {
		ci_fresh_code_path_summary %>%
			filter(
				input_api == input_api_value,
				requested_hold_ms == requested_hold_ms_value,
				delay_ms == delay_ms_value
			) %>%
			pull(all_of(column_name)) %>%
			first()
	}

	format_fresh_ms <- function(value) {
		paste0(number(value, accuracy = 0.1), "ms")
	}

	ci_fresh_code_path_predictor_audit <- tribble(
		~candidate_predictor, ~candidate_rule_if_true, ~fresh_counterexample, ~current_answer, ~best_next_control,
		"requested hold duration",
		"Rows with the same requested physical hold should land in the same latency phase.",
		paste0(
			"At requested 50ms, page.keyboard is tap-like at 250ms (",
			format_fresh_ms(fresh_delta_value("page.keyboard", 50, 250, "latency_minus_tap_p50_ms")),
			" versus tap), while locator.type is slow (",
			format_fresh_ms(fresh_delta_value("locator.type", 50, 250, "latency_minus_tap_p50_ms")),
			") and locator.press(noWaitAfter) is also slow (",
			format_fresh_ms(fresh_delta_value("locator.press noWaitAfter", 50, 250, "latency_minus_tap_p50_ms")),
			")."
		),
		"Rejected as a global predictor. Hold duration is meaningful only inside an API family.",
		"Interleave hold durations within each API/delay if the product question requires a best short-hold value.",
		"observed down-to-up hold",
		"Rows with similar realized keydown-to-keyup duration should land in the same latency phase.",
		paste0(
			"page.keyboard 50ms is tap-like even though it realizes ",
			format_fresh_ms(fresh_summary_value("page.keyboard", 50, 500, "observed_keydown_to_keyup_p50_ms")),
			", while locator.type 75ms is slow at a nearby ",
			format_fresh_ms(fresh_summary_value("locator.type", 75, 500, "observed_keydown_to_keyup_p50_ms")),
			". locator.press 100ms is tap-like at ",
			format_fresh_ms(fresh_summary_value("locator.press", 100, 500, "observed_keydown_to_keyup_p50_ms")),
			"."
		),
		"Rejected as a single threshold. The same observed-hold band contains tap-like, mixed, and slow rows.",
		"Do not tune a universal physical-hold threshold from these data.",
		"post-keyup wait",
		"Rows with the same configured wait after keyup should land in the same latency phase.",
		paste0(
			"At delay 500ms and requested hold 50ms, page.keyboard and locator.type both have a configured ",
			format_fresh_ms(fresh_summary_value("page.keyboard", 50, 500, "post_keyup_wait_ms")),
			" post-keyup wait; page.keyboard is ",
			format_fresh_ms(fresh_delta_value("page.keyboard", 50, 500, "latency_minus_tap_p50_ms")),
			" versus tap, while locator.type is ",
			format_fresh_ms(fresh_delta_value("locator.type", 50, 500, "latency_minus_tap_p50_ms")),
			"."
		),
		"Rejected. Ordinary waiting after keyup is not enough to predict the phase.",
		"Further post-keyup work should focus on browser/runtime checkpoints rather than elapsed wait time.",
		"one-call keyboard.press path",
		"The shared low-level keyboard.press routine should determine the phase.",
		paste0(
			"locator.type and locator.press(noWaitAfter) both use keyboard.press internally and match at 50ms/75ms, but ordinary locator.press uses the same routine plus the press epilogue and stays tap-like: at 75ms/500ms, noWaitAfter is ",
			format_fresh_ms(fresh_delta_value("locator.press noWaitAfter", 75, 500, "latency_minus_tap_p50_ms")),
			" versus tap, while ordinary press is ",
			format_fresh_ms(fresh_delta_value("locator.press", 75, 500, "latency_minus_tap_p50_ms")),
			"."
		),
		"Partly rejected. The key routine matters less than the automation work around it.",
		"Use ordinary locator.press only as a checkpoint control, not as a model of pressSequentially/type.",
		"locator focus/check path without press epilogue",
		"Per-key locator focus/checks, when not followed by the press epilogue, should behave like locator.type.",
		paste0(
			"This is the best current local rule: locator.type and locator.press(noWaitAfter) are within ",
			format_fresh_ms(abs(fresh_delta_value("locator.press noWaitAfter", 75, 1000, "latency_p50_ms") - fresh_delta_value("locator.type", 75, 1000, "latency_p50_ms"))),
			" at 75ms/1000ms and within ",
			format_fresh_ms(abs(fresh_delta_value("locator.press noWaitAfter", 50, 250, "latency_p50_ms") - fresh_delta_value("locator.type", 50, 250, "latency_p50_ms"))),
			" at 50ms/250ms."
		),
		"Supported for 50ms/75ms. It does not explain page.keyboard's separate 75ms/100ms slow band.",
		"Run page.keyboard with a per-key locator.focus/evaluate checkpoint, and run page.keyboard.press({ delay }) plus post-keyup wait, to split focus/check work from explicit down/up timing.",
		"locator.press wait-for-signals epilogue",
		"The press epilogue should move locator.press away from the locator.type/noWaitAfter band.",
		paste0(
			"At 50ms, removing the epilogue raises ordinary locator.press by a median ",
			format_fresh_ms(median(
				(ci_fresh_code_path_runs %>% filter(input_mode == "50ms locator.press noWaitAfter hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)) -
					(ci_fresh_code_path_runs %>% filter(input_mode == "50ms locator.press hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)),
				na.rm = TRUE
			)),
			" in round-paired q50s; at 75ms the paired median is ",
			format_fresh_ms(median(
				(ci_fresh_code_path_runs %>% filter(input_mode == "75ms locator.press noWaitAfter hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)) -
					(ci_fresh_code_path_runs %>% filter(input_mode == "75ms locator.press hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)),
				na.rm = TRUE
			)),
			"."
		),
		"Supported. This closes why ordinary locator.press is not a valid pressSequentially/type proxy.",
		"No further local run needed unless Playwright changes this implementation.",
		"chronological drift",
		"Later runs should all move in the same direction if machine drift explains the matrix.",
		"Ordinary locator.press ran late and returned to tap-like, then the clean noWaitAfter sequence ran later and moved 50ms/75ms back into the slow locator.type band.",
		"Rejected as the primary explanation for the API split.",
		"Only repeat if absolute p50s, rather than the API-family sign, become the decision variable."
	)
	write_csv(ci_fresh_code_path_predictor_audit, ci_fresh_code_path_predictor_audit_path)

	input_api_boundary_next_control_audit <- tribble(
		~open_question, ~current_answer, ~existing_evidence, ~remaining_unknown, ~next_control, ~decision,
		"Does ordinary locator.press model pressSequentially?",
		"No. pressSequentially belongs with locator.type, not ordinary locator.press.",
		paste0(
			"Source inspection shows locator.pressSequentially delegates to type(), while ordinary locator.press runs frame.press with a wait-for-signals epilogue. In the fresh matrix, removing that epilogue raises ordinary locator.press by median ",
			format_fresh_ms(median(
				(ci_fresh_code_path_runs %>% filter(input_mode == "50ms locator.press noWaitAfter hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)) -
					(ci_fresh_code_path_runs %>% filter(input_mode == "50ms locator.press hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)),
				na.rm = TRUE
			)),
			" at 50ms and ",
			format_fresh_ms(median(
				(ci_fresh_code_path_runs %>% filter(input_mode == "75ms locator.press noWaitAfter hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)) -
					(ci_fresh_code_path_runs %>% filter(input_mode == "75ms locator.press hold") %>% arrange(delay_ms, round) %>% pull(reported_q50_ms)),
				na.rm = TRUE
			)),
			" at 75ms."
		),
		"Only whether a future Playwright version changes this implementation.",
		"No local benchmark needed unless the Playwright source changes.",
		"Use locator.press only as a checkpoint control; compare pressSequentially against locator.type.",
		"Can one realistic hold duration be chosen globally?",
		"No. Hold duration is API-family-specific.",
		paste0(
			"At requested 50ms, page.keyboard is tap-like at 250ms (",
			format_fresh_ms(fresh_delta_value("page.keyboard", 50, 250, "latency_minus_tap_p50_ms")),
			" versus tap) while locator.type is slow (",
			format_fresh_ms(fresh_delta_value("locator.type", 50, 250, "latency_minus_tap_p50_ms")),
			"). At requested 100ms, page.keyboard remains slow at 500ms (",
			format_fresh_ms(fresh_delta_value("page.keyboard", 100, 500, "latency_minus_tap_p50_ms")),
			") while locator.type is tap-like (",
			format_fresh_ms(fresh_delta_value("locator.type", 100, 500, "latency_minus_tap_p50_ms")),
			")."
		),
		"Which hold is best inside a chosen final API path.",
		"Interleave realistic holds only after choosing the input API path.",
		"Do not tune a universal 50ms/75ms/100ms rule from mixed API data.",
		"Does observed physical hold close the split?",
		"No. Similar measured keydown-to-keyup bands land in different phases.",
		paste0(
			"page.keyboard 50ms is tap-like with a realized ",
			format_fresh_ms(fresh_summary_value("page.keyboard", 50, 500, "observed_keydown_to_keyup_p50_ms")),
			" hold at 500ms, locator.type 75ms is slow with a nearby ",
			format_fresh_ms(fresh_summary_value("locator.type", 75, 500, "observed_keydown_to_keyup_p50_ms")),
			" hold, and ordinary locator.press 100ms is tap-like at ",
			format_fresh_ms(fresh_summary_value("locator.press", 100, 500, "observed_keydown_to_keyup_p50_ms")),
			"."
		),
		"The browser/editor phase boundary that makes similar physical holds behave differently.",
		"Do not add more hold-only controls; split the API path first.",
		"Treat measured hold as a descriptor, not the causal variable.",
		"Does configured post-keyup wait close the split?",
		"No. The same post-keyup wait can land in different phases.",
		paste0(
			"At 500ms delay and requested 50ms hold, page.keyboard and locator.type both wait ",
			format_fresh_ms(fresh_summary_value("page.keyboard", 50, 500, "post_keyup_wait_ms")),
			" after keyup; page.keyboard is ",
			format_fresh_ms(fresh_delta_value("page.keyboard", 50, 500, "latency_minus_tap_p50_ms")),
			" versus tap while locator.type is ",
			format_fresh_ms(fresh_delta_value("locator.type", 50, 500, "latency_minus_tap_p50_ms")),
			"."
		),
		"Which automation/browser checkpoint, not elapsed wall-clock wait, moves the runtime state.",
		"Keep post-keyup timing separate from Chromium-runtime checkpoint experiments.",
		"Do not explain the input API boundary as ordinary wait length.",
		"What still separates page.keyboard from locator.type?",
		"Only this narrower boundary remains open.",
		"locator.type and locator.press(noWaitAfter) match at 50ms/75ms, but page.keyboard has the opposite 50ms versus 100ms phase pattern under the matched fresh setup.",
		"Whether the cause is explicit down/up timing, page.keyboard.press one-call timing, per-key locator focus/check work, or their interaction with the editor phase.",
		"Run a compact split: page.keyboard.press('x', { delay: hold }) plus the same post-keyup wait, crossed with explicit page.keyboard down/up preceded by per-key locator focus/evaluate.",
		"Run this only if the CI implementation choice depends on page.keyboard versus locator.type equivalence.",
		"What would a CI switch to pressSequentially mean?",
		"It would switch the benchmark to the locator.type family; it would not be equivalent to ordinary locator.press or to explicit page.keyboard down/up.",
		"Source inspection and the noWaitAfter data both put pressSequentially/type on the locator-type side of the matrix.",
		"The exact full-delay CI distribution after implementing the final helper.",
		"After choosing the helper, run the exact CI settings once rather than proxying through locator.press.",
		"Make the API choice explicit in the benchmark before interpreting hold-duration differences."
	)
	write_csv(input_api_boundary_next_control_audit, input_api_boundary_next_control_audit_path)

	input_api_ci_helper_decision_contract_audit <- tribble(
		~decision_question, ~current_evidence, ~required_validation, ~pass_condition, ~fail_action, ~claim_scope,
		"What is the current CI helper family?",
		"The real post-editor and site-editor Typing metrics call target.type()/paragraph.type() with the configured delay; Playwright pressSequentially delegates to the same type() path, while locator.press() uses a different action wrapper.",
		"Record the exact helper name, Playwright version, delay option, retained/throwaway policy, fixture setup, and whether the target is a Locator or ElementHandle in each CI metric.",
		"Helper metadata shows the benchmark stayed in the type()/pressSequentially family with the same delay and sample policy.",
		"If the helper family changes, treat the result as a metric-definition change and rerun the exact CI comparison.",
		"CI helper identity",
		"Can ordinary locator.press proxy for pressSequentially or target.type?",
		"No. Source inspection and noWaitAfter data both show ordinary locator.press adds the wait-for-signals epilogue; removing that epilogue raises 50ms/75ms rows into the locator.type band.",
		"Do not use ordinary locator.press as a proxy. Keep it only as a checkpoint control when explaining automation effects.",
		"Any helper comparison that uses locator.press is labeled as checkpoint/control evidence, not a pressSequentially/type replacement.",
		"Reject any CI-helper conclusion that infers pressSequentially behavior from ordinary locator.press rows.",
		"proxy rejected",
		"What validates a switch from type() spelling to pressSequentially() spelling?",
		"Playwright's implementation currently aliases pressSequentially to type(), so the expected behavior is unchanged if all options and target objects are unchanged.",
		"Run one exact CI-settings comparison after the final helper spelling is chosen: same post fixture, same delay, same retained/throwaway count, same trace settings, same browser revision, and same start boundary.",
		"p50, p10-p90, CV, retained count, first-key behavior, EventDispatch/input payloads, and source-span ordering stay in the existing type() band.",
		"If the exact run moves phase, keep the old helper or document the change as a new benchmark definition.",
		"spelling-only change if passed",
		"What validates a switch from page.keyboard or explicit down/up to locator type/pressSequentially?",
		"The compact controls show page.keyboard.press, explicit down/up, locator.focus prelude, and locator.type occupy different phase bands under the same requested holds.",
		"Rerun the exact CI metric with the final helper, not a proxy. Include the compact discriminator rows only as explanation.",
		"The final helper's full-delay distribution is reported separately and the old/new helper comparison is described as an API-family change.",
		"Do not merge the result into old thresholds without a threshold-portability runbook.",
		"metric-definition change",
		"Can realistic hold duration be selected before choosing the helper?",
		"No. 50ms/75ms/100ms rows are API-family-specific: page-keyboard, locator.type, locator.press, and noWaitAfter rows cross different phase boundaries.",
		"After the helper is fixed, interleave 50ms and 100ms, and optionally 75ms, inside only that helper family with tap and current-delay controls.",
		"Hold-duration conclusions are reported only within the selected helper family.",
		"Discard any global 50ms/100ms ranking that pools multiple API families.",
		"hold choice scoped",
		"What lower-level mechanism remains open?",
		"The residual mechanism is progress.wait versus harness setTimeout, utility-world focus/checkpoint work, trace snapshot/runtime state, and Chromium scheduler interaction.",
		"Use the runtime trace runbook only if the project needs the browser mechanism; do not require it for the CI helper choice.",
		"Mechanism rows explain why phase bands differ but do not change the helper-family classification.",
		"Keep the CI decision local if the mechanism run is absent.",
		"mechanism optional",
		"What guards against Playwright version drift?",
		"The local conclusion depends on current Playwright source: pressSequentially delegates to type(), and locator.press uses the wait-for-signals action path.",
		"On Playwright upgrades, re-check the source path and rerun the compact discriminator rows only if pressSequentially/type/press implementation changed.",
		"Source path is unchanged, or the compact rows still classify pressSequentially with type() and locator.press as the checkpoint control.",
		"Refresh the helper decision contract before interpreting new CI numbers.",
		"upgrade guard"
	)

	write_csv(
		input_api_ci_helper_decision_contract_audit,
		file.path(data_dir, "typing-delay-input-api-ci-helper-decision-contract-audit.csv")
	)

	ci_fresh_code_path_plot <- ci_fresh_code_path_summary %>%
		filter(delay_ms %in% c(250, 500, 1000), input_api != "page.keyboard.type") %>%
		mutate(
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms")),
			input_api = factor(input_api, levels = c("tap", "page.keyboard", "locator.type", "locator.press", "locator.press noWaitAfter"))
		)
	ci_fresh_code_path_current_plot <- ci_fresh_code_path_summary %>%
		filter(delay_ms %in% c(250, 500, 1000), input_api == "page.keyboard.type") %>%
		mutate(delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms")))

	save_plot(
		ggplot(
			ci_fresh_code_path_plot,
			aes(requested_hold_ms, latency_p50_ms, color = input_api, shape = input_api)
		) +
			geom_segment(
				data = ci_fresh_code_path_current_plot,
				aes(x = -Inf, xend = Inf, y = latency_p50_ms, yend = latency_p50_ms),
				inherit.aes = FALSE,
				linetype = "dashed",
				linewidth = 0.45,
				color = brewer_color("Greys", 7, type = "seq", n = 9)
			) +
			geom_linerange(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				position = position_dodge(width = 7),
				alpha = 0.6,
				linewidth = 0.8
			) +
			geom_point(
				position = position_dodge(width = 7),
				size = 2.7,
				alpha = 0.92
			) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_x_continuous(breaks = c(0, 50, 75, 100)) +
			scale_color_brewer(type = "qual", palette = "Set2", name = "Input API") +
			scale_shape_manual(
				values = c(16, 17, 15, 3, 8),
				name = "Input API"
			) +
			labs(
				title = "Fresh-editor code-path controls move the slow band across API checkpoints",
				subtitle = "CI-comparable fresh saved/reopened setup; dashed line is current full-delay hold p50; points are p50 and bars are p10-p90",
				x = "Requested key hold before post-keyup wait (ms)",
				y = "Latency, keydown + keypress + keyup (ms)"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"147-ci-fresh-code-path-hold-boundary.png",
		width = 12.2,
		height = 5.8
	)

	ci_fresh_code_path_phase_map <- ci_fresh_code_path_api_deltas %>%
		mutate(
			delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms")),
			input_api = factor(input_api, levels = c("tap", "page.keyboard", "locator.type", "locator.press", "locator.press noWaitAfter")),
			hold_label = factor(
				paste0(requested_hold_ms, "ms"),
				levels = c("0ms", "50ms", "75ms", "100ms")
			),
			delta_label = sprintf("%+.1f", latency_minus_tap_p50_ms)
		)

	save_plot(
		ggplot(
			ci_fresh_code_path_phase_map,
			aes(hold_label, input_api, fill = latency_minus_tap_p50_ms)
		) +
			geom_tile(color = "white", linewidth = 0.45) +
			geom_text(aes(label = delta_label), size = 3.2, color = brewer_color("Greys", 9, type = "seq", n = 9)) +
			facet_wrap(vars(delay_label), nrow = 1) +
			scale_fill_distiller(
				type = "div",
				palette = "RdYlBu",
				direction = -1,
				limits = c(-1, 5),
				oob = squish,
				name = "p50 - tap (ms)"
			) +
			labs(
				title = "Fresh-editor phase map: no single hold-duration threshold explains the slow band",
				subtitle = "Cells show p50 latency minus same-delay tap; slow cells are relative to tap, not absolute latency",
				x = "Requested key hold before post-keyup wait",
				y = "Input API"
			) +
			theme(
				legend.position = "bottom",
				panel.grid = element_blank(),
				axis.text.x = element_text(angle = 0, hjust = 0.5)
			),
		"148-ci-fresh-code-path-phase-map.png",
		width = 12.2,
		height = 5.8
		)
	}

	ci_keyboard_prelude_control_specs <- tribble(
		~input_mode, ~input_api, ~requested_hold_ms, ~artifact_dir,
		"50ms page.keyboard.press hold", "page.keyboard.press", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-press-50"),
		"75ms page.keyboard.press hold", "page.keyboard.press", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-press-75"),
		"100ms page.keyboard.press hold", "page.keyboard.press", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-press-100"),
		"50ms page.keyboard + locator.focus hold", "page.keyboard + locator.focus", 50, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-locator-focus-50"),
		"75ms page.keyboard + locator.focus hold", "page.keyboard + locator.focus", 75, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-locator-focus-75"),
		"100ms page.keyboard + locator.focus hold", "page.keyboard + locator.focus", 100, file.path(repo_root, "test/performance/artifacts/typing-delay-ci-fresh-codepath-keyboard-locator-focus-100")
	) %>%
		mutate(
			json_path = map_chr(artifact_dir, function(artifact_dir) {
				paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
				if (length(paths) == 0) {
					return(NA_character_)
				}
				paths[[which.max(file.info(paths)$mtime)]]
			})
		)

	if (all(!is.na(ci_keyboard_prelude_control_specs$json_path))) {
		ci_keyboard_prelude_new_samples <- pmap_dfr(
			ci_keyboard_prelude_control_specs,
			function(input_mode, input_api, requested_hold_ms, artifact_dir, json_path) {
				raw <- fromJSON(json_path, flatten = TRUE)
				as_tibble(raw$records) %>%
					transmute(
						input_mode,
						input_api,
						requested_hold_ms = as.numeric(requested_hold_ms),
						delay_mode = raw$metadata$delayMode,
						json_path = sub(paste0(repo_root, "/"), "", json_path, fixed = TRUE),
						delay_ms = delayMs,
						round,
						editor_setup_index = editorSetupIndex,
						sample_index = sampleIndex,
						is_throwaway = isThrowaway,
						keydown_event_count = keydownEventCount,
						latency_ms = latencyMs,
						latency_all_keydowns_ms = latencyAllKeydownsMs,
						keydown_ms = keydownMs,
						keydown_all_ms = keydownAllMs,
						keypress_ms = keypressMs,
						keyup_ms = keyupMs,
						keydown_timestamp_ms = keydownTimestampMs,
						first_keydown_timestamp_ms = firstKeydownTimestampMs,
						keypress_timestamp_ms = keypressTimestampMs,
						keyup_timestamp_ms = keyupTimestampMs,
						run_duration_ms = runStoppedAtEpochMs - runStartedAtEpochMs
					)
			}
		) %>%
			mutate(
				effective_hold_ms = pmin(requested_hold_ms, delay_ms),
				post_keyup_wait_ms = pmax(delay_ms - effective_hold_ms, 0),
				observed_keydown_to_keyup_ms = keyup_timestamp_ms + keyup_ms - first_keydown_timestamp_ms,
				keypress_to_keyup_gap_ms = keyup_timestamp_ms - (keypress_timestamp_ms + keypress_ms)
			)

		ci_keyboard_prelude_control_samples <- bind_rows(
			ci_fresh_code_path_samples %>%
				filter(
					input_api %in% c(
						"tap",
						"page.keyboard",
						"locator.type",
						"locator.press noWaitAfter"
					)
				),
			ci_keyboard_prelude_new_samples
		) %>%
			arrange(input_api, requested_hold_ms, delay_ms, round, sample_index)

		write_csv(ci_keyboard_prelude_control_samples, ci_keyboard_prelude_control_sample_path)
	} else if (file.exists(ci_keyboard_prelude_control_sample_path)) {
		ci_keyboard_prelude_control_samples <- read_csv(ci_keyboard_prelude_control_sample_path, show_col_types = FALSE)
	} else {
		ci_keyboard_prelude_control_samples <- tibble()
	}

	if (nrow(ci_keyboard_prelude_control_samples) > 0) {
		ci_keyboard_prelude_retained <- ci_keyboard_prelude_control_samples %>%
			filter(!is_throwaway)

		ci_keyboard_prelude_runs <- ci_keyboard_prelude_retained %>%
			group_by(
				input_mode,
				input_api,
				requested_hold_ms,
				delay_mode,
				json_path,
				delay_ms,
				round,
				editor_setup_index
			) %>%
			summarize(
				retained_n = n(),
				reported_q50_ms = median(latency_ms),
				keypress_q50_ms = median(keypress_ms),
				observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
				keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
				run_duration_ms = first(run_duration_ms),
				.groups = "drop"
			)
		write_csv(ci_keyboard_prelude_runs, ci_keyboard_prelude_control_run_path)

		ci_keyboard_prelude_summary <- ci_keyboard_prelude_retained %>%
			group_by(input_mode, input_api, requested_hold_ms, delay_mode, delay_ms) %>%
			summarize(
				retained_n = n(),
				latency_p10_ms = quant(latency_ms, 0.1),
				latency_p50_ms = median(latency_ms),
				latency_p90_ms = quant(latency_ms, 0.9),
				latency_mean_ms = mean(latency_ms),
				latency_sd_ms = sd(latency_ms),
				keypress_p50_ms = median(keypress_ms),
				observed_keydown_to_keyup_p50_ms = median(observed_keydown_to_keyup_ms),
				keypress_to_keyup_gap_p50_ms = median(keypress_to_keyup_gap_ms),
				.groups = "drop"
			) %>%
			left_join(
				ci_keyboard_prelude_runs %>%
					group_by(input_mode, input_api, requested_hold_ms, delay_mode, delay_ms) %>%
					summarize(
						run_count = n(),
						run_reported_q50_median_ms = median(reported_q50_ms),
						run_reported_q50_sd_ms = sd(reported_q50_ms),
						run_reported_q50_min_ms = min(reported_q50_ms),
						run_reported_q50_max_ms = max(reported_q50_ms),
						.groups = "drop"
					),
				by = c("input_mode", "input_api", "requested_hold_ms", "delay_mode", "delay_ms")
			)
		write_csv(ci_keyboard_prelude_summary, ci_keyboard_prelude_control_summary_path)

		ci_keyboard_prelude_deltas <- ci_keyboard_prelude_summary %>%
			filter(input_api != "tap") %>%
			left_join(
				ci_keyboard_prelude_summary %>%
					filter(input_api == "tap") %>%
					transmute(
						delay_ms,
						tap_latency_p50_ms = latency_p50_ms,
						tap_keypress_p50_ms = keypress_p50_ms
					),
				by = "delay_ms"
			) %>%
			left_join(
				ci_keyboard_prelude_summary %>%
					filter(input_api == "locator.type") %>%
					transmute(
						requested_hold_ms,
						delay_ms,
						locator_type_latency_p50_ms = latency_p50_ms
					),
				by = c("requested_hold_ms", "delay_ms")
			) %>%
			left_join(
				ci_keyboard_prelude_summary %>%
					filter(input_api == "page.keyboard") %>%
					transmute(
						requested_hold_ms,
						delay_ms,
						page_keyboard_down_up_latency_p50_ms = latency_p50_ms
					),
				by = c("requested_hold_ms", "delay_ms")
			) %>%
			mutate(
				latency_minus_tap_p50_ms = latency_p50_ms - tap_latency_p50_ms,
				keypress_minus_tap_p50_ms = keypress_p50_ms - tap_keypress_p50_ms,
				latency_minus_locator_type_p50_ms =
					latency_p50_ms - locator_type_latency_p50_ms,
				latency_minus_page_down_up_p50_ms =
					latency_p50_ms - page_keyboard_down_up_latency_p50_ms,
				phase_label = case_when(
					latency_minus_tap_p50_ms >= 2.5 ~ "slow",
					latency_minus_tap_p50_ms >= 1.25 ~ "mixed",
					TRUE ~ "tap-like"
				)
			) %>%
			arrange(delay_ms, input_api, requested_hold_ms)
		write_csv(ci_keyboard_prelude_deltas, ci_keyboard_prelude_control_delta_path)

		ci_keyboard_prelude_levels <- c(
			"page.keyboard",
			"page.keyboard.press",
			"page.keyboard + locator.focus",
			"locator.type",
			"locator.press noWaitAfter"
		)

		ci_keyboard_prelude_plot <- ci_keyboard_prelude_summary %>%
			filter(input_api != "tap") %>%
			mutate(
				delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms")),
				input_api = factor(input_api, levels = ci_keyboard_prelude_levels)
			)

		save_plot(
			ggplot(
				ci_keyboard_prelude_plot,
				aes(requested_hold_ms, latency_p50_ms, color = input_api, shape = input_api)
			) +
				geom_linerange(
					aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
					position = position_dodge(width = 7),
					alpha = 0.55,
					linewidth = 0.75
				) +
				geom_point(
					position = position_dodge(width = 7),
					size = 2.6,
					alpha = 0.92
				) +
				facet_wrap(vars(delay_label), nrow = 1) +
				scale_x_continuous(breaks = c(50, 75, 100)) +
				scale_color_brewer(type = "qual", palette = "Set2", name = "Input path") +
				scale_shape_manual(values = c(16, 17, 15, 3, 8), name = "Input path") +
				labs(
					title = "Page-keyboard one-call press and locator focus both change the short-hold phase",
					subtitle = "CI-comparable fresh setup; points are p50 and bars are p10-p90 over retained EventDispatch samples",
					x = "Requested key hold before post-keyup wait (ms)",
					y = "Latency, keydown + keypress + keyup (ms)"
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"151-ci-keyboard-prelude-control-p50.png",
			width = 12.4,
			height = 5.8
		)

		ci_keyboard_prelude_phase_map <- ci_keyboard_prelude_deltas %>%
			filter(input_api %in% ci_keyboard_prelude_levels) %>%
			mutate(
				delay_label = factor(paste0(delay_ms, "ms"), levels = c("250ms", "500ms", "1000ms")),
				input_api = factor(input_api, levels = ci_keyboard_prelude_levels),
				hold_label = factor(paste0(requested_hold_ms, "ms"), levels = c("50ms", "75ms", "100ms")),
				delta_label = sprintf("%+.1f", latency_minus_tap_p50_ms)
			)

		save_plot(
			ggplot(
				ci_keyboard_prelude_phase_map,
				aes(hold_label, input_api, fill = latency_minus_tap_p50_ms)
			) +
				geom_tile(color = "white", linewidth = 0.45) +
				geom_text(aes(label = delta_label), size = 3.1, color = brewer_color("Greys", 9, type = "seq", n = 9)) +
				facet_wrap(vars(delay_label), nrow = 1) +
				scale_fill_distiller(
					type = "div",
					palette = "RdYlBu",
					direction = -1,
					limits = c(-1, 6),
					oob = squish,
					name = "p50 - tap (ms)"
				) +
				labs(
					title = "The remaining API split is mostly Playwright action phase, not physical hold duration",
					subtitle = "Cells show p50 latency minus same-delay tap in fresh CI-comparable runs",
					x = "Requested key hold before post-keyup wait",
					y = "Input path"
				) +
				theme(
					legend.position = "bottom",
					panel.grid = element_blank(),
					axis.text.x = element_text(angle = 0, hjust = 0.5)
				),
			"152-ci-keyboard-prelude-control-phase-map.png",
			width = 12.5,
			height = 6.2
		)
	}

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

rich_text_span_summary_path <- file.path(data_dir, "typing-delay-rich-text-span-summary.csv")
rich_text_batch_summary_path <- file.path(data_dir, "typing-delay-rich-text-batch-summary.csv")
data_batch_summary_path <- file.path(data_dir, "typing-delay-data-batch-summary.csv")

if (
	file.exists(rich_text_span_summary_path) &&
	file.exists(rich_text_batch_summary_path) &&
	file.exists(data_batch_summary_path)
) {
	rich_text_span_funnel <- read_csv(rich_text_span_summary_path, show_col_types = FALSE) %>%
		filter(
			name %in% c(
				"rich-text.onInput.total",
				"rich-text.handleChange.registryBatch"
			)
		) %>%
		select(run_id, mode_label, span_scenario_label, delayMs, name, median_ms) %>%
		pivot_wider(names_from = name, values_from = median_ms)

	rich_text_batch_funnel <- read_csv(rich_text_batch_summary_path, show_col_types = FALSE)

	rich_text_funnel <- rich_text_span_funnel %>%
		left_join(
			rich_text_batch_funnel,
			by = c("run_id", "mode_label", "span_scenario_label", "delayMs")
		) %>%
		transmute(
			mode_label,
			span_scenario_label,
			delayMs,
			`RichText onInput total` = `rich-text.onInput.total`,
			`RichText registry.batch` = `rich-text.handleChange.registryBatch`,
			`RichText non-batch overhead` = pmax(
				`rich-text.onInput.total` - `rich-text.handleChange.registryBatch`,
				0
			),
			`RichText direct callbacks` = selection_change_median_ms + on_change_median_ms,
			`RichText batch remainder` = batch_remainder_median_ms
		) %>%
		pivot_longer(
			cols = starts_with("RichText"),
			names_to = "stage",
			values_to = "median_ms"
		) %>%
		mutate(measurement_family = "RichText instrumentation")

	data_funnel <- read_csv(data_batch_summary_path, show_col_types = FALSE) %>%
		filter(
			component %in% c(
				"registry.batch total",
				"batch callback",
				"resume core/block-editor",
				"core/block-editor subscribers",
				"React external-store listener",
				"useSelect onChange",
				"useSelect mapSelect"
			)
		) %>%
		transmute(
			mode_label,
			span_scenario_label,
			delayMs,
			stage = recode(
				component,
				`registry.batch total` = "Data registry.batch total",
				`batch callback` = "Data batch callback",
				`resume core/block-editor` = "core/block-editor resume",
				`core/block-editor subscribers` = "core/block-editor subscribers",
				`React external-store listener` = "React external-store listener",
				`useSelect onChange` = "useSelect.onChange",
				`useSelect mapSelect` = "useSelect.mapSelect"
			),
			median_ms,
			measurement_family = "Data instrumentation"
		)

	input_attribution_funnel <- bind_rows(rich_text_funnel, data_funnel) %>%
		mutate(
			stage = factor(
				stage,
				levels = rev(c(
					"RichText onInput total",
					"RichText registry.batch",
					"RichText non-batch overhead",
					"RichText direct callbacks",
					"RichText batch remainder",
					"Data registry.batch total",
					"Data batch callback",
					"core/block-editor resume",
					"core/block-editor subscribers",
					"useSelect.onChange",
					"useSelect.mapSelect",
					"React external-store listener"
				))
			),
			mode_label = factor(
				mode_label,
				levels = c(
					"Playwright delay: key held down",
					"Complete keypress, then wait"
				)
			),
			case_label = case_when(
				mode_label == "Playwright delay: key held down" ~ paste0("key held, ", delayMs, "ms"),
				mode_label == "Complete keypress, then wait" ~ paste0("tap then wait, ", delayMs, "ms"),
				TRUE ~ paste0(mode_label, ", ", delayMs, "ms")
			),
			case_label = factor(
				case_label,
				levels = c(
					"key held, 990ms",
					"key held, 1000ms",
					"key held, 1300ms",
					"tap then wait, 1300ms"
				)
			)
		)

	write_csv(
		input_attribution_funnel,
		file.path(data_dir, "typing-delay-input-attribution-funnel.csv")
	)

	input_attribution_funnel_plot <- input_attribution_funnel %>%
		filter(
			span_scenario_label == "large post",
			!is.na(case_label),
			stage %in% rev(c(
				"RichText onInput total",
				"RichText registry.batch",
				"RichText non-batch overhead",
				"RichText batch remainder",
				"Data registry.batch total",
				"core/block-editor resume",
				"core/block-editor subscribers",
				"useSelect.onChange",
				"useSelect.mapSelect"
			))
		)

	save_plot(
		ggplot(
			input_attribution_funnel_plot,
			aes(median_ms, stage, color = case_label, shape = measurement_family)
		) +
			geom_point(size = 3.1, alpha = 0.92, position = position_dodge(width = 0.55)) +
			scale_color_brewer(type = "qual", palette = "Set1", drop = FALSE) +
			scale_shape_manual(values = c(
				`RichText instrumentation` = 16,
				`Data instrumentation` = 17
			), drop = FALSE) +
			labs(
				title = "The split RichText path points into data fanout, not DOM text work",
				subtitle = "Large-post diagnostic traces; RichText and data spans are separate instrumentation runs and are not additive",
				x = "Median duration (ms)",
				y = NULL,
				color = "Case",
				shape = "Instrumentation"
			),
		"132-input-attribution-funnel.png",
		width = 11,
		height = 7.5
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

cdp_checkpoint_summary_path <- file.path(data_dir, "typing-delay-cdp-checkpoint-summary.csv")
if (file.exists(cdp_checkpoint_summary_path)) {
	cdp_checkpoint_summary <- read_csv(cdp_checkpoint_summary_path, show_col_types = FALSE) %>%
		mutate(
			checkpoint = factor(
				checkpoint,
				levels = c(
					"Raw CDP only",
					"Runtime.evaluate sync",
					"Runtime.evaluate setTimeout(0)",
					"Runtime.evaluate RAF",
					"page.evaluate sync"
				)
			),
			checkpoint_label = recode(
				as.character(checkpoint),
				`Raw CDP only` = "raw CDP",
				`Runtime.evaluate sync` = "Runtime sync",
				`Runtime.evaluate setTimeout(0)` = "Runtime timeout",
				`Runtime.evaluate RAF` = "Runtime RAF",
				`page.evaluate sync` = "page.evaluate"
			),
			label_x = case_when(
				checkpoint_label == "Runtime timeout" ~ actual_post_keyup_gap_p50_ms * 0.86,
				checkpoint_label == "Runtime RAF" ~ actual_post_keyup_gap_p50_ms * 1.07,
				TRUE ~ actual_post_keyup_gap_p50_ms
			),
			label_y = case_when(
				checkpoint_label == "Runtime sync" ~ keypress_p50_ms + 0.45,
				checkpoint_label == "Runtime timeout" ~ keypress_p50_ms - 0.15,
				checkpoint_label == "Runtime RAF" ~ keypress_p50_ms + 0.5,
				TRUE ~ keypress_p50_ms + 0.45
			)
		)

	save_plot(
		ggplot(
			cdp_checkpoint_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = checkpoint,
				shape = checkpoint
			)
		) +
			geom_point(size = 3.3, alpha = 0.92) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.16,
				alpha = 0.45
			) +
			geom_text(
				aes(label_x, label_y, label = checkpoint_label),
				size = 3.2,
				check_overlap = FALSE,
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Set2") +
			labs(
				title = "Runtime checkpoints do not reproduce page.evaluate",
				subtitle = "Raw CDP 1300ms held-key input; vertical bars show p10-p90 keypress dispatch",
				x = "Observed previous keyup to next keydown, p50 (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = "Checkpoint",
				shape = "Checkpoint"
			) +
			theme(legend.position = "none"),
		"25b-cdp-checkpoint-follow-up.png",
		width = 10.5,
		height = 6.3
	)
}

playwright_trace_mode_summary_path <- file.path(data_dir, "typing-delay-playwright-trace-mode-summary.csv")
if (file.exists(playwright_trace_mode_summary_path)) {
	playwright_trace_mode_summary <- read_csv(playwright_trace_mode_summary_path, show_col_types = FALSE) %>%
		mutate(
			input_path = factor(
				input_path,
				levels = c(
					"multi-character keyboard.type",
					"per-key keyboard.press",
					"raw CDP",
					"raw CDP + page.evaluate"
				)
			),
			trace_mode = factor(trace_mode, levels = c("off", "on")),
			point_label = case_when(
				input_path == "multi-character keyboard.type" ~ "multi-key type, trace off",
				input_path == "per-key keyboard.press" & trace_mode == "off" ~ "press/key, trace off",
				input_path == "per-key keyboard.press" & trace_mode == "on" ~ "press/key, trace on",
				input_path == "raw CDP" ~ "raw CDP, trace off",
				input_path == "raw CDP + page.evaluate" & trace_mode == "off" ~ "page.evaluate, trace off",
				input_path == "raw CDP + page.evaluate" & trace_mode == "on" ~ "page.evaluate, trace on",
				TRUE ~ paste(input_path, trace_mode)
			),
			label_x = case_when(
				point_label == "multi-key type, trace off" ~ actual_post_keyup_gap_p50_ms * 1.8,
				point_label == "press/key, trace off" ~ actual_post_keyup_gap_p50_ms * 1.25,
				point_label == "raw CDP, trace off" ~ actual_post_keyup_gap_p50_ms * 1.45,
				point_label == "page.evaluate, trace off" ~ actual_post_keyup_gap_p50_ms * 1.12,
				point_label == "press/key, trace on" ~ actual_post_keyup_gap_p50_ms * 1.03,
				point_label == "page.evaluate, trace on" ~ actual_post_keyup_gap_p50_ms * 1.03,
				TRUE ~ actual_post_keyup_gap_p50_ms
			),
			label_y = case_when(
				point_label == "multi-key type, trace off" ~ keypress_p50_ms + 0.55,
				point_label == "press/key, trace off" ~ keypress_p50_ms - 0.35,
				point_label == "raw CDP, trace off" ~ keypress_p50_ms - 0.75,
				point_label == "page.evaluate, trace off" ~ keypress_p50_ms + 0.55,
				point_label == "press/key, trace on" ~ keypress_p50_ms - 0.45,
				point_label == "page.evaluate, trace on" ~ keypress_p50_ms + 0.45,
				TRUE ~ keypress_p50_ms
			)
		)

	save_plot(
		ggplot(
			playwright_trace_mode_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = trace_mode,
				shape = input_path
			)
		) +
			geom_point(size = 3.3, alpha = 0.92) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.16,
				alpha = 0.45
			) +
			geom_text(
				aes(label_x, label_y, label = point_label),
				size = 3.1,
				check_overlap = FALSE,
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Set1") +
			labs(
				title = "Playwright trace snapshots explain the per-key fast path",
				subtitle = "1300ms held-key input; vertical bars show p10-p90 keypress dispatch",
				x = "Observed previous keyup to next keydown, p50 (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = "Playwright trace",
				shape = "Input path"
			) +
			theme(legend.position = "bottom"),
		"25c-playwright-trace-mode.png",
		width = 11,
		height = 6.5
	)
}

eval_path_summary_path <- file.path(data_dir, "typing-delay-eval-path-summary.csv")
if (file.exists(eval_path_summary_path)) {
	eval_path_summary <- read_csv(eval_path_summary_path, show_col_types = FALSE) %>%
		mutate(
			evaluation_path = factor(
				evaluation_path,
				levels = c(
					"raw CDP only",
					"Runtime.evaluate",
					"Runtime.evaluate await/value/userGesture",
					"Runtime.callFunctionOn globalThis",
					"page.evaluate",
					"page.evaluateHandle",
					"main locator.evaluate",
					"frame locator.evaluate"
				)
			),
			evaluation_group = case_when(
				evaluation_path == "raw CDP only" ~ "raw input",
				str_starts(as.character(evaluation_path), "Runtime.") ~ "direct CDP runtime",
				str_detect(as.character(evaluation_path), "locator") ~ "Playwright locator",
				TRUE ~ "Playwright page evaluation"
			),
			point_label = recode(
				as.character(evaluation_path),
				`raw CDP only` = "raw CDP",
				`Runtime.evaluate` = "Runtime.evaluate",
				`Runtime.evaluate await/value/userGesture` = "Runtime.evaluate + flags",
				`Runtime.callFunctionOn globalThis` = "Runtime.callFunctionOn",
				`page.evaluate` = "page.evaluate",
				`page.evaluateHandle` = "evaluateHandle",
				`main locator.evaluate` = "main locator",
				`frame locator.evaluate` = "frame locator"
			),
			label_x = case_when(
				point_label == "raw CDP" ~ actual_post_keyup_gap_p50_ms * 1.25,
				point_label == "Runtime.evaluate" ~ actual_post_keyup_gap_p50_ms * 0.93,
				point_label == "Runtime.evaluate + flags" ~ actual_post_keyup_gap_p50_ms * 1.12,
				point_label == "Runtime.callFunctionOn" ~ actual_post_keyup_gap_p50_ms * 1.12,
				point_label == "page.evaluate" ~ actual_post_keyup_gap_p50_ms * 1.08,
				point_label == "evaluateHandle" ~ actual_post_keyup_gap_p50_ms * 1.08,
				point_label == "main locator" ~ actual_post_keyup_gap_p50_ms * 1.03,
				point_label == "frame locator" ~ actual_post_keyup_gap_p50_ms * 1.02,
				TRUE ~ actual_post_keyup_gap_p50_ms
			),
			label_y = case_when(
				point_label == "raw CDP" ~ keypress_p50_ms + 0.35,
				point_label == "Runtime.evaluate" ~ keypress_p50_ms + 0.45,
				point_label == "Runtime.evaluate + flags" ~ keypress_p50_ms - 0.2,
				point_label == "Runtime.callFunctionOn" ~ keypress_p50_ms + 0.4,
				point_label == "page.evaluate" ~ keypress_p50_ms + 0.35,
				point_label == "evaluateHandle" ~ keypress_p50_ms - 0.25,
				point_label == "main locator" ~ keypress_p50_ms + 0.35,
				point_label == "frame locator" ~ keypress_p50_ms + 0.35,
				TRUE ~ keypress_p50_ms
			)
		)

	save_plot(
		ggplot(
			eval_path_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = evaluation_group,
				shape = evaluation_group
			)
		) +
			geom_point(size = 3.2, alpha = 0.92) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.14,
				alpha = 0.45
			) +
			geom_text(
				aes(label_x, label_y, label = point_label),
				size = 3.0,
				check_overlap = FALSE,
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "Trace-off evaluation paths only partially explain the gap",
				subtitle = "Raw CDP 1300ms held-key input with Playwright trace disabled",
				x = "Observed previous keyup to next keydown, p50 (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = "Path",
				shape = "Path"
			) +
			theme(legend.position = "bottom"),
		"25d-trace-off-evaluation-path.png",
		width = 11,
		height = 6.5
		)
}

runtime_repeat_summary_path <- file.path(data_dir, "typing-delay-runtime-repeat-summary.csv")
if (file.exists(runtime_repeat_summary_path)) {
	runtime_repeat_summary <- read_csv(runtime_repeat_summary_path, show_col_types = FALSE) %>%
		mutate(
			repeat_mode = factor(
				repeat_mode,
				levels = c(
					"raw CDP only",
					"Runtime.evaluate",
					"Runtime.callFunctionOn"
				)
			),
			point_label = case_when(
				repeat_count == 0 ~ "raw",
				TRUE ~ as.character(repeat_count)
			),
			label_x = case_when(
				repeat_count == 0 ~ actual_post_keyup_gap_p50_ms + 0.9,
				TRUE ~ actual_post_keyup_gap_p50_ms
			),
			label_y = case_when(
				repeat_count == 0 ~ keypress_p50_ms + 0.35,
				repeat_count == 1 ~ keypress_p50_ms + 0.45,
				repeat_count == 17 ~ keypress_p50_ms - 0.45,
				TRUE ~ keypress_p50_ms + 0.25
			)
		)

	save_plot(
		ggplot(
			runtime_repeat_summary,
			aes(
				repeat_count,
				keypress_p50_ms,
				color = repeat_mode,
				shape = repeat_mode
			)
		) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.42,
				alpha = 0.45,
				position = position_dodge(width = 0.6)
			) +
			geom_point(
				size = 3.2,
				alpha = 0.92,
				position = position_dodge(width = 0.6)
			) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_x_continuous(breaks = c(0, 1, 3, 7, 11, 17)) +
			labs(
				title = "Direct runtime checkpoints shrink the next keypress span",
				subtitle = "Raw CDP 1300ms held-key input, Playwright trace disabled; vertical bars show p10-p90",
				x = "Direct runtime no-op calls between keys",
				y = "keypress EventDispatch duration (ms)",
				color = "Between-key action",
				shape = "Between-key action"
			) +
			theme(legend.position = "bottom"),
		"25e-runtime-repeat-dose-response.png",
		width = 11,
		height = 6.5
	)

	save_plot(
		ggplot(
			runtime_repeat_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = repeat_mode,
				shape = repeat_mode
			)
		) +
			geom_point(size = 3.2, alpha = 0.92) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.16,
				alpha = 0.45
			) +
			geom_text(
				aes(label_x, label_y, label = point_label),
				size = 3.0,
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			labs(
				title = "The residual gap tracks the inter-key checkpoint gap",
				subtitle = "Labels are repeat counts; raw CDP has no added runtime call",
				x = "Observed previous keyup to next keydown, p50 (ms)",
				y = "keypress EventDispatch duration (ms)",
				color = "Between-key action",
				shape = "Between-key action"
			) +
			theme(legend.position = "bottom"),
		"25f-runtime-repeat-gap-response.png",
		width = 11,
		height = 6.5
	)
}

input_path_summary_path <- file.path(data_dir, "typing-delay-input-path-summary.csv")
cdp_long_gap_summary_path <- file.path(data_dir, "typing-delay-cdp-long-gap-summary.csv")
wait_vs_checkpoint_summary_path <- file.path(data_dir, "typing-delay-wait-vs-checkpoint-summary.csv")
if (file.exists(input_path_summary_path) && file.exists(runtime_repeat_summary_path)) {
	explicit_wait_summary <- read_csv(input_path_summary_path, show_col_types = FALSE) %>%
		filter(input_path == "Raw CDP Input.dispatchKeyEvent") %>%
		transmute(
			mechanism = "explicit post-keyup wait only",
			mechanism_order = 1,
			point_label = paste0("wait ", requested_post_keyup_gap_ms, "ms"),
			n,
			actual_post_keyup_gap_p50_ms,
			keypress_p10_ms,
			keypress_p50_ms,
			keypress_p90_ms,
			source_run_id = run_id,
			json_path
		)
	if (file.exists(cdp_long_gap_summary_path)) {
		explicit_wait_summary <- bind_rows(
			explicit_wait_summary,
			read_csv(cdp_long_gap_summary_path, show_col_types = FALSE) %>%
				transmute(
					mechanism = "explicit post-keyup wait only",
					mechanism_order = 1,
					point_label = paste0("wait ", requested_post_keyup_gap_ms, "ms"),
					n,
					actual_post_keyup_gap_p50_ms,
					keypress_p10_ms,
					keypress_p50_ms,
					keypress_p90_ms,
					source_run_id = run_id,
					json_path
				)
		)
	}

	runtime_checkpoint_summary <- read_csv(runtime_repeat_summary_path, show_col_types = FALSE) %>%
		filter(repeat_mode %in% c("Runtime.evaluate", "Runtime.callFunctionOn")) %>%
		transmute(
			mechanism = paste0(repeat_mode, " checkpoints"),
			mechanism_order = if_else(repeat_mode == "Runtime.evaluate", 2, 3),
			point_label = paste0("x", repeat_count),
			n,
			actual_post_keyup_gap_p50_ms,
			keypress_p10_ms,
			keypress_p50_ms,
			keypress_p90_ms,
			source_run_id = run_id,
			json_path
		)

	wait_vs_checkpoint_summary <- bind_rows(
		explicit_wait_summary,
		runtime_checkpoint_summary
	) %>%
		mutate(
			mechanism = factor(
				mechanism,
				levels = c(
					"explicit post-keyup wait only",
					"Runtime.evaluate checkpoints",
					"Runtime.callFunctionOn checkpoints"
				)
			)
		) %>%
		arrange(mechanism_order, actual_post_keyup_gap_p50_ms)

	write_csv(wait_vs_checkpoint_summary, wait_vs_checkpoint_summary_path)

	save_plot(
		ggplot(
			wait_vs_checkpoint_summary,
			aes(
				actual_post_keyup_gap_p50_ms,
				keypress_p50_ms,
				color = mechanism,
				shape = mechanism
			)
		) +
			geom_errorbar(
				aes(ymin = keypress_p10_ms, ymax = keypress_p90_ms),
				width = 0.035,
				alpha = 0.35
			) +
			geom_point(size = 3.0, alpha = 0.9) +
			geom_text(
				aes(label = point_label),
				nudge_y = 0.55,
				size = 2.8,
				show.legend = FALSE
			) +
			scale_x_log10(breaks = c(3, 5, 10, 20, 40, 100, 300, 1000, 3000, 5000)) +
			scale_color_brewer(type = "qual", palette = "Set1") +
			labs(
				title = "Waiting and runtime checkpoints are not equivalent",
				subtitle = "Raw CDP 1300ms held-key input; explicit waits through 5s stay slow while runtime checkpoints shrink the next keypress slice",
				x = "Observed previous keyup to next keydown, p50 (ms, log scale)",
				y = "keypress EventDispatch duration, p50 (ms)",
				color = "Between-key mechanism",
				shape = "Between-key mechanism"
			) +
			theme(legend.position = "bottom"),
		"25i-explicit-wait-vs-runtime-checkpoints.png",
		width = 12,
		height = 7
	)
}

dip_1500_summary_path <- file.path(data_dir, "typing-delay-1500-dip-summary.csv")
if (file.exists(dip_1500_summary_path)) {
	dip_1500_summary <- read_csv(dip_1500_summary_path, show_col_types = FALSE) %>%
		mutate(
			run_label = factor(
				run_label,
				levels = c(
					"Original dense 1110-2000ms n=5",
					"Original paired trace n=8",
					"Same-shape Gutenberg 1110-1600ms n=5",
					"Focused Gutenberg 1450-1600ms n=16",
					"Original native key-hold n=8",
					"Focused native 1450-1600ms n=16"
				)
			),
			scenario_label = factor(
				scenario_label,
				levels = c("large post", "native contenteditable")
			),
			run_plot_label = recode(
				as.character(run_label),
				`Original dense 1110-2000ms n=5` = "Old dense n=5",
				`Original paired trace n=8` = "Old paired n=8",
				`Same-shape Gutenberg 1110-1600ms n=5` = "Same-shape rerun n=5",
				`Focused Gutenberg 1450-1600ms n=16` = "Focused rerun n=16",
				`Original native key-hold n=8` = "Old native n=8",
				`Focused native 1450-1600ms n=16` = "Focused native n=16"
			)
		)

	save_plot(
		ggplot(
			dip_1500_summary,
			aes(delay_ms, latency_p50_ms, color = run_plot_label, shape = source)
		) +
			annotate(
				"rect",
				xmin = 1510,
				xmax = 1550,
				ymin = -Inf,
				ymax = Inf,
				alpha = 0.08,
				fill = "gray45"
			) +
			geom_errorbar(
				aes(ymin = latency_p10_ms, ymax = latency_p90_ms),
				width = 1.8,
				alpha = 0.45
			) +
			geom_point(size = 2.9, alpha = 0.92) +
			facet_wrap(~scenario_label, scales = "free_y", ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_x_continuous(breaks = seq(1450, 1600, by = 30)) +
			labs(
				title = "The old 1510-1550ms trough did not reproduce",
				subtitle = "Shaded band marks the previously observed trough; points are p50 with p10-p90 bars",
				x = "Held-key delay (ms)",
				y = "EventDispatch latency p50 (ms)",
				color = "Run",
				shape = "Source"
			) +
			guides(
				color = guide_legend(nrow = 2, byrow = TRUE),
				shape = guide_legend(nrow = 1, byrow = TRUE)
			) +
			theme(
				legend.position = "bottom",
				legend.box = "vertical",
				legend.text = element_text(size = 9)
			),
		"25h-1500-dip-recheck.png",
		width = 13,
		height = 9
	)
}

native_runtime_repeat_summary_path <- file.path(data_dir, "typing-delay-native-runtime-repeat-summary.csv")
if (file.exists(runtime_repeat_summary_path) && file.exists(native_runtime_repeat_summary_path)) {
	gutenberg_runtime_repeat <- read_csv(runtime_repeat_summary_path, show_col_types = FALSE) %>%
		mutate(scenario_label = "Gutenberg large post")
	native_runtime_repeat <- read_csv(native_runtime_repeat_summary_path, show_col_types = FALSE) %>%
		mutate(scenario_label = "native contenteditable")
	runtime_repeat_control <- bind_rows(
		gutenberg_runtime_repeat,
		native_runtime_repeat
	) %>%
		group_by(scenario_label) %>%
		mutate(
			raw_keypress_p50_ms = keypress_p50_ms[repeat_count == 0][1],
			keypress_delta_from_raw_ms = keypress_p50_ms - raw_keypress_p50_ms
		) %>%
		ungroup() %>%
		mutate(
			repeat_mode = factor(
				repeat_mode,
				levels = c(
					"raw CDP only",
					"Runtime.evaluate",
					"Runtime.callFunctionOn"
				)
			),
			scenario_label = factor(
				scenario_label,
				levels = c("Gutenberg large post", "native contenteditable")
			)
		)

	save_plot(
		ggplot(
			runtime_repeat_control,
			aes(
				repeat_count,
				keypress_delta_from_raw_ms,
				color = scenario_label,
				shape = repeat_mode
			)
		) +
			geom_hline(yintercept = 0, color = "gray65", linewidth = 0.35) +
			geom_point(size = 3.1, alpha = 0.92) +
			scale_color_brewer(type = "qual", palette = "Dark2") +
			scale_x_continuous(breaks = c(0, 1, 3, 7, 11, 17)) +
			labs(
				title = "Native contenteditable has only a tiny runtime-checkpoint effect",
				subtitle = "1300ms raw-CDP held-key input; y-axis is the p50 keypress change from raw CDP",
				x = "Direct runtime no-op calls between keys",
				y = "Change from raw-CDP keypress p50 (ms)",
				color = "Scenario",
				shape = "Between-key action"
			) +
			theme(legend.position = "bottom"),
		"25g-runtime-repeat-native-control.png",
		width = 11,
		height = 6.5
	)
}

if (
	file.exists(wait_vs_checkpoint_summary_path) &&
	file.exists(playwright_trace_mode_summary_path) &&
	file.exists(eval_path_summary_path) &&
	file.exists(runtime_repeat_summary_path) &&
	file.exists(native_runtime_repeat_summary_path)
) {
	wait_vs_checkpoint_for_boundary <- read_csv(wait_vs_checkpoint_summary_path, show_col_types = FALSE)
	playwright_trace_for_boundary <- read_csv(playwright_trace_mode_summary_path, show_col_types = FALSE)
	eval_path_for_boundary <- read_csv(eval_path_summary_path, show_col_types = FALSE)
	runtime_repeat_for_boundary <- read_csv(runtime_repeat_summary_path, show_col_types = FALSE)
	native_runtime_repeat_for_boundary <- read_csv(native_runtime_repeat_summary_path, show_col_types = FALSE)

	cdp_boundary_consolidated <- bind_rows(
		wait_vs_checkpoint_for_boundary %>%
			filter(
				mechanism == "explicit post-keyup wait only",
				point_label %in% c("wait 0ms", "wait 16ms", "wait 1000ms", "wait 5000ms")
			) %>%
			transmute(
				family = "ordinary wait",
				family_order = 1,
				condition_label = point_label,
				n,
				observed_gap_p50_ms = actual_post_keyup_gap_p50_ms,
				keypress_p10_ms,
				keypress_p50_ms,
				keypress_p90_ms
			),
		wait_vs_checkpoint_for_boundary %>%
			filter(
				mechanism %in% c("Runtime.evaluate checkpoints", "Runtime.callFunctionOn checkpoints"),
				point_label %in% c("x1", "x7", "x17")
			) %>%
			transmute(
				family = "direct runtime checkpoints",
				family_order = 2,
				condition_label = paste0(
					if_else(
						mechanism == "Runtime.evaluate checkpoints",
						"Runtime.evaluate ",
						"Runtime.callFunctionOn "
					),
					point_label
				),
				n,
				observed_gap_p50_ms = actual_post_keyup_gap_p50_ms,
				keypress_p10_ms,
				keypress_p50_ms,
				keypress_p90_ms
			),
		eval_path_for_boundary %>%
			filter(evaluation_path %in% c("page.evaluate", "main locator.evaluate", "frame locator.evaluate")) %>%
			transmute(
				family = "trace-off Playwright evaluation",
				family_order = 3,
				condition_label = evaluation_path,
				n,
				observed_gap_p50_ms = actual_post_keyup_gap_p50_ms,
				keypress_p10_ms,
				keypress_p50_ms,
				keypress_p90_ms
			),
		playwright_trace_for_boundary %>%
			filter(
				(input_path == "raw CDP + page.evaluate" & trace_mode %in% c("off", "on")) |
					(input_path == "per-key keyboard.press" & trace_mode %in% c("off", "on"))
			) %>%
			transmute(
				family = "Playwright trace snapshot boundary",
				family_order = 4,
				condition_label = paste0(input_path, ", trace ", trace_mode),
				n,
				observed_gap_p50_ms = actual_post_keyup_gap_p50_ms,
				keypress_p10_ms,
				keypress_p50_ms,
				keypress_p90_ms
			)
	) %>%
		mutate(
			condition_order = row_number(),
			condition_label = factor(condition_label, levels = rev(condition_label)),
			family = factor(
				family,
				levels = c(
					"ordinary wait",
					"direct runtime checkpoints",
					"trace-off Playwright evaluation",
					"Playwright trace snapshot boundary"
				)
			)
		)

		cdp_boundary_theory_matrix <- tribble(
			~candidate_theory, ~status, ~strongest_measurement, ~remaining_gap,
			"Elapsed post-keyup time creates the fast path", "ruled out",
			"Raw CDP ordinary waits from about 4ms through 5008ms stay around 21-24ms keypress p50.",
		"Does not identify which Chromium state runtime checkpoints alter.",
		"DOM event payload or raw-CDP packet shape explains the slow path", "ruled out",
		"Corrected raw-CDP packets and matched DOM key/input signatures still stay slow.",
		"CDP/browser internals below DOM events remain possible.",
		"One generic renderer checkpoint is enough", "ruled out",
		"A single Runtime.evaluate, setTimeout(0), or RAF checkpoint improves only partway and does not reach page.evaluate with tracing.",
		"Many checkpoints do have a dose response.",
		"Playwright trace snapshots explain the full per-key fast path", "supported",
		"With trace on, per-key press and page.evaluate are about 11.3ms; with trace off they are about 22.1ms and 17.4ms.",
		"Trace snapshots are an automation artifact, not a user-typing mechanism.",
		"Runtime checkpoint count changes the measured Gutenberg input slice", "supported",
		"Direct runtime calls form a dose response: raw CDP is 21.5ms, x7 is about 15-16ms, and x17 is about 13ms.",
		"Exact Chromium runtime/scheduler state is still below this JS harness.",
		"Native/browser-only checkpoint effects explain the Gutenberg-scale artifact", "ruled out for scale",
		"Native contenteditable moves only about 0.3-0.4ms, while Gutenberg moves by several milliseconds.",
		"Gutenberg fanout explains scale, but the browser/runtime trigger is still lower-level.",
		"Exact Chromium internal mechanism is identified", "still open",
			"No current trace includes the renderer scheduler/runtime state that changes across those checkpoints.",
			"Needs Chromium tracing or lower-level runtime/scheduler instrumentation."
		)

		chromium_runtime_next_probe_audit <- tribble(
			~open_question, ~current_answer, ~strongest_evidence, ~what_is_closed, ~remaining_unknown, ~next_probe, ~decision,
			"Is the per-key fast path just elapsed post-keyup time?", "No.", "Raw CDP ordinary waits from about 4ms through 5008ms stay around 21-24ms keypress p50.", "Ordinary sleeping, queued-JS drain, and browser rest time are not sufficient explanations.", "None for this benchmark decision.", "No more ordinary-wait extensions unless a different browser build changes the result.", "closed",
			"Is one generic renderer task, timer, or frame checkpoint enough?", "No.", "A single Runtime.evaluate, setTimeout(0), or RAF checkpoint improves only partway and does not reach the trace-on page.evaluate band.", "The missing boundary is narrower than task, timer, or frame progression.", "Which runtime/protocol side effect accumulates when checkpoints are repeated.", "Trace direct Runtime.evaluate and Runtime.callFunctionOn repeat grids with Chromium scheduler/runtime categories.", "partially closed",
			"Do Playwright trace snapshots explain the full per-key fast path?", "Yes for the default trace-on performance configuration.", "With trace on, per-key keyboard.press and raw CDP plus page.evaluate are about 11.3ms; with trace off they are about 22.1ms and 17.4ms.", "Trace-on per-key Playwright actions are a measurement perturbation, not a human-typing model.", "Which snapshot subcommand or renderer state transition causes the speedup.", "Compare trace-on captureSnapshot windows with trace-off repeated Runtime.callFunctionOn windows in the same Chromium scheduler trace.", "supported",
			"Can direct runtime checkpoints reproduce the trace-off residual?", "Yes, by dose response.", "Direct runtime calls move raw CDP from 21.5ms to about 15-16ms at x7 and about 13ms at x17.", "A unique Playwright utility-script or locator semantic action is not required.", "Whether the driver is V8 microtask state, renderer scheduler priority, input queue state, cache/frequency side effects, or a combination.", "Hold raw CDP input fixed, vary checkpoint count, and trace renderer scheduler/runtime state around the prior keyup and next keydown.", "next browser-level work",
			"Is the checkpoint effect enough to explain Gutenberg-scale movement by itself?", "No.", "Native contenteditable moves only about 0.3-0.4ms while Gutenberg moves by several milliseconds.", "The browser/runtime trigger is real, but Gutenberg's data/RichText fanout supplies the scale.", "How much of the amplified cost survives realistic user/plugin workloads.", "Use real-workload replay for product lag; use Chromium tracing only for benchmark-artifact mechanism.", "split product from artifact"
		)

			chromium_runtime_trace_contract_audit <- tribble(
				~contrast, ~current_local_evidence, ~what_is_closed, ~still_invisible_to_this_harness, ~required_trace_contract, ~decision,
			"ordinary wait versus runtime checkpoint",
			"Raw CDP ordinary waits through 5008ms stay around 21-24ms keypress p50, while Runtime.evaluate and Runtime.callFunctionOn checkpoints reach about 15-16ms at x7 and about 13ms at x17.",
			"Elapsed post-keyup time, queued-JS drain, and generic browser rest are not sufficient explanations.",
			"Which renderer/runtime state differs after protocol runtime work but not after sleeping.",
			"Trace the same raw-CDP held-key path for wait 16ms, wait 1000ms, wait 5000ms, Runtime.evaluate x7/x17, and Runtime.callFunctionOn x7/x17; align prior keyup end, protocol command start/end, next keydown, and EventDispatch start/end.",
			"do not add more ordinary-wait rows",
			"single checkpoint versus repeated checkpoint",
			"A single Runtime.evaluate, setTimeout(0), or RAF checkpoint improves only partway; repeated direct runtime calls produce a clear dose response across the tested repeat counts.",
			"One generic task, timer, or frame boundary is not the missing boundary.",
			"Whether repeated checkpoints are changing V8 microtask state, execution-context state, renderer scheduler priority, input queue state, cache/frequency state, or a combination.",
			"Keep command payloads identical and vary only repeat count x0/x1/x3/x7/x17; record renderer main-thread task boundaries, V8 execution slices, microtask checkpoints if exposed, scheduler priority/queue slices if exposed, and the next EventDispatch duration.",
			"browser/runtime trace only",
			"direct CDP call versus Playwright utility path",
			"Direct Runtime.callFunctionOn against globalThis stays near 19.4ms, Playwright page.evaluate trace-off is about 17.4-18.5ms, and locator.evaluate adds more protocol work and stays near 17.8-17.9ms.",
			"The residual trace-off Playwright improvement is not just the CDP method name, awaitPromise/returnByValue/userGesture flags, or editor-frame targeting.",
			"Which part of Playwright's utility execution path, context resolution, handle lifecycle, or added protocol-command count creates the residual checkpoint effect.",
			"Trace direct Runtime.callFunctionOn, Playwright page.evaluate, page.evaluateHandle, and locator.evaluate with protocol-command markers, execution context IDs, and object-lifecycle markers around the same previous keyup to next keydown window.",
			"explain residual only; not needed for CI helper choice",
			"trace snapshot boundary",
			"Trace-on per-key keyboard.press and trace-on raw CDP plus page.evaluate both hit about 11.3ms, while their trace-off versions are much slower.",
			"The full per-key Playwright fast path is a trace-snapshot measurement perturbation, not evidence that per-key actions model human typing better.",
			"Which captureSnapshot subcommand or renderer state transition creates the large speedup.",
			"Compare trace-on captureSnapshot windows against trace-off runtime-repeat windows with a separate low-overhead protocol log; avoid using the same Playwright trace facility as both perturbation and observer unless the observer effect is explicitly controlled.",
			"artifact mechanism, not product-lag work",
			"native scale control",
			"Native contenteditable moves only about 0.3-0.4ms across the runtime-repeat grid, while the Gutenberg large-post path moves by several milliseconds.",
			"The browser checkpoint is real but cannot explain the Gutenberg-scale movement by itself.",
			"How much checkpoint sensitivity survives real editing histories, plugins, composition, selection, and correction flows.",
			"Use browser tracing to identify the artifact trigger; use recorded workload replay to decide product-lag relevance.",
				"split artifact tracing from workload replay"
			)

			chromium_runtime_trace_runbook_audit <- tribble(
				~runtime_trace_question, ~current_answer, ~required_rows, ~required_trace_channels, ~alignment_contract, ~would_support, ~would_weaken, ~decision,
				"What is the minimum wait-versus-checkpoint contrast?",
				"Ordinary elapsed time is ruled out, but the exact renderer/runtime state changed by checkpoints is still unknown.",
				"Raw CDP held-key wait 16ms, wait 1000ms, wait 5000ms, Runtime.evaluate x7/x17, Runtime.callFunctionOn x7/x17, plus raw CDP x0 baseline.",
				"Low-overhead protocol command log, renderer main-thread task boundaries, Chromium scheduler/task-queue categories, input task priority, V8 execution slices, microtask checkpoints if exposed, EventDispatch start/end, and optional OS power/scheduler counters.",
				"Align previous keyup end, post-keyup wait or protocol-command start/end, next keydown enqueue, EventDispatch start/end, and source-span ids per retained key sample.",
				"Runtime rows share a scheduler, V8, microtask, queue, or input-priority state absent from ordinary waits and that state tracks the lower EventDispatch duration.",
				"Wait and checkpoint rows have indistinguishable scheduler/runtime state during the key window, or differences are explained entirely by OS power/frequency counters.",
				"primary contrast",
				"How should checkpoint dose response be traced?",
				"Repeated direct runtime calls reproduce and exceed the trace-off Playwright evaluation residual, so repeat count is the controlled variable.",
				"Runtime.evaluate and Runtime.callFunctionOn x0/x1/x3/x7/x17 with identical command payloads and the same raw CDP held-key input path.",
				"Protocol command count and timing, execution context id, V8 run slices, microtask checkpoints if available, renderer scheduler queue slices, task priority, EventDispatch duration, and Gutenberg source spans.",
				"Keep command payloads, page state, input timing, trace categories, and fixture constant; align every checkpoint command between previous keyup and next keydown.",
				"A trace-state metric changes monotonically or stepwise with repeat count and matches the p50 dose response.",
				"Repeat count changes p50 without any corresponding runtime/scheduler trace-state difference, or the trace observer itself creates the dose response.",
				"dose-response gate",
				"How should Playwright trace snapshots be isolated?",
				"The full trace-on per-key fast path is a measurement perturbation, not a human typing model.",
				"Trace-on keyboard.press and raw CDP plus page.evaluate rows; trace-off runtime-repeat rows that match the observed gap; optional trace-on with snapshot subcommands disabled if feasible.",
				"Separate low-overhead protocol log for Playwright trace commands, captureSnapshot/DOMSnapshot markers, renderer scheduler categories, V8 slices, and screenshot/render trace markers.",
				"Do not use the same Playwright trace facility as both perturbation and observer unless a trace-off external log confirms the perturbing commands and timing.",
				"The trace-on fast band aligns with captureSnapshot or related snapshot protocol work and produces the same scheduler/runtime state as high-repeat runtime checkpoints.",
				"Trace-on speedup appears without identifiable snapshot/protocol work, or the observer setup alone changes trace-off control rows.",
				"snapshot perturbation gate",
				"How should the Playwright utility residual be scoped?",
				"The residual trace-off Playwright improvement is not needed for the CI helper choice but can explain the smaller page/locator evaluation gap.",
				"Direct Runtime.callFunctionOn, page.evaluate, page.evaluateHandle, locator.evaluate, and editor-frame locator.evaluate under trace off.",
				"Protocol command markers, utility-script evaluation markers if available, execution context ids, object/handle lifecycle events, injected-script calls, scheduler queue slices, and EventDispatch duration.",
				"Use the same previous-keyup to next-keydown window and the same target frame; record command count and object lifecycle per key.",
				"Playwright evaluation paths show extra protocol or utility checkpoints whose scheduler/runtime state explains their partial p50 improvement over direct runtime calls.",
				"The residual persists with no additional command, utility, context, lifecycle, or scheduler-state difference.",
				"residual only",
				"How should native scale be controlled?",
				"Browser checkpoints are real but too small in native contenteditable to explain Gutenberg-scale movement.",
				"Run the wait-versus-checkpoint and dose-response subset in both Gutenberg large-post and native contenteditable timer scenarios.",
				"Same browser/runtime trace channels plus Gutenberg source spans for the editor scenario and native listener spans for the native scenario.",
				"Keep input path, delay, repeat counts, trace categories, and browser revision matched across scenarios.",
				"Browser state changes are similar in native and Gutenberg, while Gutenberg source spans supply the multi-millisecond amplification.",
				"Native contenteditable shows a multi-millisecond checkpoint movement comparable to Gutenberg, or Gutenberg source spans do not account for the scale gap.",
				"scale control",
				"What report shape is required before naming the Chromium mechanism?",
				"Aggregated p50 rows are not enough for the final browser mechanism claim.",
				"All rows above, with retained-sample records and trace-state summaries rather than only run medians.",
				"Per-sample run id, sample index, retained/throwaway flag, browser revision, trace categories, protocol commands, task/queue/V8 slices, EventDispatch timing, source-span ids, environment metadata, and observer configuration.",
				"A mechanism claim must be made per contrast and must predict fast/slow samples across waits, runtime repeats, trace snapshots, Playwright utility paths, and native scale controls.",
				"The same trace-state variable predicts the p50 movement across the primary contrast, dose response, snapshot perturbation, and scale control.",
				"Different contrasts require unrelated explanations, or trace observer effects cannot be separated from the checkpoint effect.",
				"reporting gate"
			)

		write_csv(
			cdp_boundary_consolidated,
			file.path(data_dir, "typing-delay-cdp-boundary-consolidated.csv")
		)
		write_csv(
			cdp_boundary_theory_matrix,
			file.path(data_dir, "typing-delay-cdp-boundary-theory-matrix.csv")
		)
		write_csv(
			chromium_runtime_next_probe_audit,
			file.path(data_dir, "typing-delay-chromium-runtime-next-probe-audit.csv")
		)
			write_csv(
				chromium_runtime_trace_contract_audit,
				file.path(data_dir, "typing-delay-chromium-runtime-trace-contract-audit.csv")
			)
			write_csv(
				chromium_runtime_trace_runbook_audit,
				file.path(data_dir, "typing-delay-chromium-runtime-trace-runbook-audit.csv")
			)

		save_plot(
			ggplot(
			cdp_boundary_consolidated,
			aes(keypress_p50_ms, condition_label, color = family, shape = family)
		) +
			geom_point(size = 3.2, alpha = 0.92) +
			geom_text(
				aes(label = sprintf("%.1fms gap", observed_gap_p50_ms)),
				nudge_x = 0.42,
				size = 2.8,
				show.legend = FALSE
			) +
			geom_vline(
				xintercept = c(13, 22),
				linetype = c("dotted", "dashed"),
				color = brewer_color("Greys", 6, type = "seq", n = 9),
				linewidth = 0.35
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
			scale_x_continuous(breaks = seq(10, 25, 2.5), limits = c(10, 26.5)) +
			labs(
				title = "Runtime checkpoints, not ordinary waits, move raw-CDP input toward the fast band",
				subtitle = "1300ms held-key diagnostic runs; labels show observed previous-keyup to next-keydown gap p50",
				x = "keypress EventDispatch duration, p50 (ms)",
				y = NULL,
				color = "Boundary",
				shape = "Boundary"
			),
		"133-cdp-boundary-consolidated.png",
		width = 12,
		height = 8
	)
}

marker_summary_path <- file.path(data_dir, "typing-delay-marker-intervention-summary.csv")
marker_samples_path <- file.path(data_dir, "typing-delay-marker-intervention-samples.csv")
marker_paired_summary_path <- file.path(data_dir, "typing-delay-marker-paired-summary.csv")
marker_gap_dense_summary_path <- file.path(data_dir, "typing-delay-marker-gap-dense-paired-summary.csv")
fixed_hold_timer_rewrite_summary_path <- file.path(data_dir, "typing-delay-fixed-hold-timer-rewrite-paired-summary.csv")
task_end_proximity_samples_path <- file.path(data_dir, "typing-delay-task-end-proximity-paired-samples.csv")
task_end_proximity_summary_path <- file.path(data_dir, "typing-delay-task-end-proximity-paired-summary.csv")
native_busy_wait_control_summary_path <- file.path(data_dir, "typing-delay-native-busy-wait-control-summary.csv")
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

	if (file.exists(marker_gap_dense_summary_path)) {
		marker_gap_dense <- read_csv(marker_gap_dense_summary_path, show_col_types = FALSE) %>%
			filter(rows_with_marker_action > 0) %>%
			mutate(
				intervention = factor(
					intervention,
					levels = c("normal marker", "marker no-op", "stop/start typing")
				)
			) %>%
			select(
				intervention,
				delay_ms,
				marker_to_current_keydown_p50_ms,
				`next EventDispatch only` = latency_p50_ms,
				`timer callback + next EventDispatch` = marker_inclusive_latency_p50_ms
			) %>%
			pivot_longer(
				cols = c(`next EventDispatch only`, `timer callback + next EventDispatch`),
				names_to = "metric",
				values_to = "duration_ms"
			) %>%
			mutate(
				metric = factor(
					metric,
					levels = c("next EventDispatch only", "timer callback + next EventDispatch")
				)
			)

		save_plot(
			ggplot(
				marker_gap_dense,
				aes(
					marker_to_current_keydown_p50_ms,
					duration_ms,
					color = intervention,
					shape = intervention
				)
			) +
				geom_point(size = 3.1, alpha = 0.9) +
				facet_wrap(~metric, ncol = 1, scales = "free_y") +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`normal marker` = 16,
					`marker no-op` = 17,
					`stop/start typing` = 15
				), drop = FALSE) +
				scale_x_continuous(breaks = c(0, 50, 100, 150, 200, 300)) +
				labs(
					title = "The low event-only band depends on timer-to-key proximity",
					subtitle = "Dense 1000..1300ms paired trace; points are p50s by requested key-hold delay",
					x = "Timer callback to following keydown, p50 (ms)",
					y = "Duration, p50 (ms)",
					color = "Timer callback",
					shape = "Timer callback"
				),
			"48-marker-gap-decay.png",
			width = 11,
			height = 8
		)
	}

	if (file.exists(fixed_hold_timer_rewrite_summary_path)) {
		fixed_hold_timer_rewrite <- read_csv(fixed_hold_timer_rewrite_summary_path, show_col_types = FALSE) %>%
			filter(delay_ms == 1300, rows_with_marker_action > 0) %>%
			mutate(
				intervention = factor(
					intervention,
					levels = c("normal marker", "marker no-op", "stop/start typing")
				)
			) %>%
			select(
				intervention,
				rewrite_timeout_ms,
				marker_to_current_keydown_p50_ms,
				`next EventDispatch only` = latency_p50_ms,
				`timer callback + next EventDispatch` = marker_inclusive_latency_p50_ms
			) %>%
			pivot_longer(
				cols = c(`next EventDispatch only`, `timer callback + next EventDispatch`),
				names_to = "metric",
				values_to = "duration_ms"
			) %>%
			mutate(
				metric = factor(
					metric,
					levels = c("next EventDispatch only", "timer callback + next EventDispatch")
				)
			)

		save_plot(
			ggplot(
				fixed_hold_timer_rewrite,
				aes(
					marker_to_current_keydown_p50_ms,
					duration_ms,
					color = intervention,
					shape = intervention
				)
			) +
				geom_point(size = 3.3, alpha = 0.9) +
				facet_wrap(~metric, ncol = 1, scales = "free_y") +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`normal marker` = 16,
					`marker no-op` = 17,
					`stop/start typing` = 15
				), drop = FALSE) +
				scale_x_continuous(breaks = c(0, 50, 100, 200, 300)) +
				labs(
					title = "Moving the timer closer makes the same 1300ms hold fast again",
					subtitle = "Fixed 1300ms key hold; x-axis is observed p50 gap from rewritten timer callback to keydown",
					x = "Timer callback to following keydown, p50 (ms)",
					y = "Duration, p50 (ms)",
					color = "Timer callback",
					shape = "Timer callback"
				),
			"49-fixed-hold-timer-rewrite.png",
			width = 11,
			height = 8
		)
	}

	if (file.exists(task_end_proximity_summary_path)) {
		task_end_proximity <- read_csv(task_end_proximity_summary_path, show_col_types = FALSE) %>%
			filter(delay_ms == 1300, rows_with_intervention_event > 0) %>%
			mutate(
				intervention = factor(
					intervention,
						levels = c(
							"marker no-op",
							"busy wait 20ms",
							"busy wait 40ms",
						"no-op + busy wait 150ms",
						"worker busy wait 150ms",
						"worker busy wait 150ms, no message",
						"worker delay 150ms, no CPU",
						"external persistent CPU 150ms, no message",
						"external persistent delay 150ms, no message",
						"delayed no-op 150ms",
						"normal marker + busy wait 150ms",
						"stop/start + busy wait 150ms"
					)
				)
			) %>%
			filter(!is.na(intervention)) %>%
			mutate(
				intervention_label = fct_recode(
					intervention,
					`busy wait 150ms` = "no-op + busy wait 150ms",
					`worker CPU, msg` = "worker busy wait 150ms",
					`worker CPU, no msg` = "worker busy wait 150ms, no message",
					`worker delay, no CPU` = "worker delay 150ms, no CPU",
					`external CPU, no msg` = "external persistent CPU 150ms, no message",
					`external delay, no CPU` = "external persistent delay 150ms, no message",
					`delayed no-op` = "delayed no-op 150ms",
					`normal + busy wait` = "normal marker + busy wait 150ms",
					`stop/start + busy wait` = "stop/start + busy wait 150ms"
				)
			) %>%
			select(
				intervention_label,
				rewrite_timeout_ms,
				intervention_end_to_current_keydown_p50_ms,
				`next EventDispatch only` = latency_p50_ms,
				`timer/worker work + next EventDispatch` = intervention_inclusive_latency_p50_ms
			) %>%
			pivot_longer(
				cols = c(`next EventDispatch only`, `timer/worker work + next EventDispatch`),
				names_to = "metric",
				values_to = "duration_ms"
			) %>%
			mutate(
				metric = factor(
					metric,
					levels = c("next EventDispatch only", "timer/worker work + next EventDispatch")
				)
			)

		save_plot(
			ggplot(
				task_end_proximity,
				aes(
					intervention_end_to_current_keydown_p50_ms,
					duration_ms,
					color = intervention_label,
					shape = intervention_label
				)
			) +
				geom_point(size = 3.3, alpha = 0.9) +
				facet_wrap(~metric, ncol = 1, scales = "free_y") +
				scale_color_brewer(type = "qual", palette = "Paired", drop = FALSE) +
				scale_shape_manual(values = c(
					`marker no-op` = 17,
					`busy wait 20ms` = 3,
					`busy wait 40ms` = 8,
					`busy wait 150ms` = 4,
					`worker CPU, msg` = 7,
					`worker CPU, no msg` = 9,
					`worker delay, no CPU` = 10,
					`external CPU, no msg` = 12,
					`external delay, no CPU` = 13,
					`delayed no-op` = 11,
					`normal + busy wait` = 16,
					`stop/start + busy wait` = 15
				), drop = FALSE) +
				scale_x_continuous(breaks = c(0, 50, 100, 150, 200)) +
				labs(
					title = "Recent timer-side work can make the next event slice fast",
					subtitle = "Fixed 1300ms key hold; worker/external CPU without a page message is fast, no-CPU controls are slow",
					x = "Timer-side work end to following keydown, p50 (ms)",
					y = "Duration, p50 (ms)",
					color = "Timer-side work",
					shape = "Timer-side work"
				) +
				guides(
					color = guide_legend(nrow = 2, byrow = TRUE),
					shape = guide_legend(nrow = 2, byrow = TRUE)
				),
			"50-task-end-proximity.png",
			width = 13,
			height = 8
		)
	}

	if (file.exists(task_end_proximity_summary_path)) {
		worker_no_message_duration <- read_csv(task_end_proximity_summary_path, show_col_types = FALSE) %>%
			filter(
				delay_ms == 1300,
				rows_with_intervention_event > 0,
				intervention_end_to_current_keydown_p50_ms >= 40,
				intervention_end_to_current_keydown_p50_ms <= 60,
				intervention %in% c(
					"marker no-op",
					"busy wait 20ms",
					"busy wait 40ms",
					"no-op + busy wait 150ms",
					"worker busy wait 20ms, no message",
					"worker busy wait 40ms, no message",
					"worker busy wait 80ms, no message",
					"worker busy wait 150ms, no message",
					"worker delay 150ms, no message",
					"external persistent CPU 20ms, no message",
					"external persistent CPU 40ms, no message",
					"external persistent CPU 80ms, no message",
					"external persistent CPU 150ms, no message",
					"external persistent delay 150ms, no message"
				)
			) %>%
			mutate(
				work_type = case_when(
					intervention == "marker no-op" ~ "zero-duration no-op",
					intervention == "worker delay 150ms, no message" ~ "worker no CPU",
					intervention == "external persistent delay 150ms, no message" ~ "external no CPU",
					str_detect(intervention, "^worker busy") ~ "worker CPU, no message",
					str_detect(intervention, "^external persistent CPU") ~ "external CPU, no message",
					TRUE ~ "main-thread CPU"
				),
				work_type = factor(
					work_type,
					levels = c("zero-duration no-op", "main-thread CPU", "worker CPU, no message", "external CPU, no message", "worker no CPU", "external no CPU")
				)
			)

		save_plot(
			ggplot(
				worker_no_message_duration,
				aes(
					intervention_duration_p50_ms,
					latency_p50_ms,
					color = work_type,
					shape = work_type
				)
			) +
				geom_point(size = 3.4, alpha = 0.95) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`zero-duration no-op` = 17,
					`main-thread CPU` = 16,
					`worker CPU, no message` = 15,
					`external CPU, no message` = 3,
					`worker no CPU` = 4,
					`external no CPU` = 7
				), drop = FALSE) +
				scale_x_continuous(breaks = c(0, 20, 40, 80, 150)) +
				labs(
					title = "Off-main-thread CPU work has a duration response",
					subtitle = "Fixed 1300ms key hold; prestarted external child removes process-startup CPU from the timer boundary",
					x = "Timer-side work duration, p50 (ms)",
					y = "Next EventDispatch duration, p50 (ms)",
					color = "Work type",
					shape = "Work type"
				),
			"52-worker-no-message-duration.png",
			width = 9,
			height = 6
		)
	}

	if (file.exists(task_end_proximity_summary_path)) {
		worker_gap_decay <- read_csv(task_end_proximity_summary_path, show_col_types = FALSE) %>%
			filter(
				delay_ms == 1300,
				rows_with_intervention_event > 0,
				intervention %in% c(
					"no-op + busy wait 150ms",
					"worker busy wait 150ms",
					"worker busy wait 150ms, no message",
					"external CPU 150ms, no message"
				)
			) %>%
			mutate(
				work_type = fct_recode(
					intervention,
					`main-thread CPU` = "no-op + busy wait 150ms",
					`worker CPU, msg` = "worker busy wait 150ms",
					`worker CPU, no msg` = "worker busy wait 150ms, no message",
					`external CPU` = "external CPU 150ms, no message"
				)
			)

		save_plot(
			ggplot(
				worker_gap_decay,
				aes(
					intervention_end_to_current_keydown_p50_ms,
					latency_p50_ms,
					color = work_type,
					shape = work_type
				)
			) +
				geom_point(size = 3.4, alpha = 0.95) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = c(
					`main-thread CPU` = 16,
					`worker CPU, msg` = 15,
					`worker CPU, no msg` = 18,
					`external CPU` = 17
				), drop = FALSE) +
				scale_x_continuous(breaks = c(50, 100, 150, 200, 250)) +
				labs(
					title = "CPU-work speedup decays with distance from the next key",
					subtitle = "Fixed 1300ms key hold; 150ms CPU work moved earlier relative to keydown",
					x = "Timer-side work end to following keydown, p50 (ms)",
					y = "Next EventDispatch duration, p50 (ms)",
					color = "Work type",
					shape = "Work type"
				),
			"53-worker-gap-decay.png",
			width = 9,
			height = 6
			)
		}

	if (file.exists(task_end_proximity_samples_path)) {
		background_cpu_control <- read_csv(task_end_proximity_samples_path, show_col_types = FALSE) %>%
			filter(
				run_id %in% c(
					"task_end_noop_timeout_1250_delay_1300",
					"task_end_external_background_idle_noop_timeout_1250_delay_1300",
					"task_end_external_background_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_background_cpu_2_noop_timeout_1250_delay_1300",
					"task_end_external_background_cpu_4_noop_timeout_1250_delay_1300",
					"task_end_external_background_cpu_8_noop_timeout_1250_delay_1300",
					"task_end_external_background_nice_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_cpu_4_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_cpu_8_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_utility_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_qos_background_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_background_taskpolicy_maintenance_cpu_noop_timeout_1250_delay_1300",
					"task_end_external_persistent_delay_no_message_150_timeout_1100_delay_1300",
					"task_end_external_persistent_cpu_no_message_150_timeout_1100_delay_1300"
				)
			) %>%
			mutate(
				control = fct_recode(
					factor(run_id),
					`no-op timer` = "task_end_noop_timeout_1250_delay_1300",
					`idle child + no-op` = "task_end_external_background_idle_noop_timeout_1250_delay_1300",
					`background CPU x1 + no-op` = "task_end_external_background_cpu_noop_timeout_1250_delay_1300",
					`background CPU x2 + no-op` = "task_end_external_background_cpu_2_noop_timeout_1250_delay_1300",
					`background CPU x4 + no-op` = "task_end_external_background_cpu_4_noop_timeout_1250_delay_1300",
					`background CPU x8 + no-op` = "task_end_external_background_cpu_8_noop_timeout_1250_delay_1300",
					`nice +20 CPU x1 + no-op` = "task_end_external_background_nice_cpu_noop_timeout_1250_delay_1300",
					`taskpolicy -b CPU x1 + no-op` = "task_end_external_background_taskpolicy_cpu_noop_timeout_1250_delay_1300",
					`taskpolicy -b CPU x4 + no-op` = "task_end_external_background_taskpolicy_cpu_4_noop_timeout_1250_delay_1300",
					`taskpolicy -b CPU x8 + no-op` = "task_end_external_background_taskpolicy_cpu_8_noop_timeout_1250_delay_1300",
					`taskpolicy -c utility CPU + no-op` = "task_end_external_background_taskpolicy_utility_cpu_noop_timeout_1250_delay_1300",
					`taskpolicy -c background CPU + no-op` = "task_end_external_background_taskpolicy_qos_background_cpu_noop_timeout_1250_delay_1300",
					`taskpolicy -c maintenance CPU + no-op` = "task_end_external_background_taskpolicy_maintenance_cpu_noop_timeout_1250_delay_1300",
					`prestarted delay` = "task_end_external_persistent_delay_no_message_150_timeout_1100_delay_1300",
					`prestarted CPU burst` = "task_end_external_persistent_cpu_no_message_150_timeout_1100_delay_1300"
				),
				control = factor(
					control,
					levels = c(
						"no-op timer",
						"idle child + no-op",
						"background CPU x1 + no-op",
						"background CPU x2 + no-op",
						"background CPU x4 + no-op",
						"background CPU x8 + no-op",
						"nice +20 CPU x1 + no-op",
						"taskpolicy -b CPU x1 + no-op",
						"taskpolicy -b CPU x4 + no-op",
						"taskpolicy -b CPU x8 + no-op",
						"taskpolicy -c utility CPU + no-op",
						"taskpolicy -c background CPU + no-op",
						"taskpolicy -c maintenance CPU + no-op",
						"prestarted delay",
						"prestarted CPU burst"
					)
				)
			)

		background_cpu_control_levels <- levels(background_cpu_control$control)
		background_cpu_control_colors <- setNames(
			c(RColorBrewer::brewer.pal(8, "Set2"), RColorBrewer::brewer.pal(8, "Dark2"))[
				seq_along(background_cpu_control_levels)
			],
			background_cpu_control_levels
		)

		save_plot(
			ggplot(background_cpu_control, aes(latency_ms, control, color = control, shape = control)) +
				geom_jitter(width = 0, height = 0.12, alpha = 0.45, size = 2.1) +
				stat_summary(fun = median, geom = "point", size = 4.2, color = "black", show.legend = FALSE) +
				scale_color_manual(values = background_cpu_control_colors, drop = FALSE) +
				scale_shape_manual(values = c(
					`no-op timer` = 17,
					`idle child + no-op` = 2,
					`background CPU x1 + no-op` = 1,
					`background CPU x2 + no-op` = 5,
					`background CPU x4 + no-op` = 6,
					`background CPU x8 + no-op` = 8,
					`nice +20 CPU x1 + no-op` = 9,
					`taskpolicy -b CPU x1 + no-op` = 10,
					`taskpolicy -b CPU x4 + no-op` = 11,
					`taskpolicy -b CPU x8 + no-op` = 12,
					`taskpolicy -c utility CPU + no-op` = 13,
					`taskpolicy -c background CPU + no-op` = 14,
					`taskpolicy -c maintenance CPU + no-op` = 15,
					`prestarted delay` = 7,
					`prestarted CPU burst` = 3
				), drop = FALSE) +
				labs(
					title = "Low-priority background CPU still keeps the no-op timer fast",
					subtitle = "Fixed 1300ms key hold; count and priority controls distinguish CPU active state from timer work",
					x = "Next EventDispatch duration (ms)",
					y = NULL,
					color = "Control",
					shape = "Control"
				),
			"54-background-cpu-control.png",
			width = 11,
			height = 7
		)
	}

	if (file.exists(task_end_proximity_summary_path)) {
		task_end_cpu_controls <- read_csv(task_end_proximity_summary_path, show_col_types = FALSE) %>%
			filter(delay_ms == 1300, rows_with_intervention_event > 0) %>%
			mutate(
				is_near_key = between(intervention_end_to_current_keydown_p50_ms, 40, 65),
				is_background_control = str_detect(intervention, "background"),
				is_no_cpu_delay_control =
					intervention == "marker no-op" |
					str_detect(intervention, "background idle") |
					str_detect(intervention, "no CPU") |
					(str_detect(intervention, "delay|delayed") & !str_detect(intervention, "busy|CPU")),
				is_finite_cpu_control =
					!is_background_control &
					!str_detect(intervention, "normal marker|stop/start") &
					!str_detect(intervention, "no CPU") &
					str_detect(intervention, "busy wait|CPU"),
				is_continuous_fast_cpu =
					str_detect(intervention, "background") &
					str_detect(intervention, "CPU|nice|utility") &
					!str_detect(intervention, "taskpolicy CPU|QoS background|maintenance"),
				is_continuous_background_qos_cpu =
					str_detect(intervention, "taskpolicy CPU|QoS background|maintenance"),
				cpu_audit_class = case_when(
					is_no_cpu_delay_control ~ "near-key no CPU task",
					is_finite_cpu_control ~ "near-key finite CPU burst",
					is_continuous_fast_cpu ~ "continuous ordinary/utility CPU",
					is_continuous_background_qos_cpu ~ "continuous background/maintenance CPU",
					TRUE ~ NA_character_
				),
				cpu_audit_class = factor(
					cpu_audit_class,
					levels = c(
						"near-key no CPU task",
						"near-key finite CPU burst",
						"continuous ordinary/utility CPU",
						"continuous background/maintenance CPU"
					)
				)
			)

		cpu_qos_control_details <- task_end_cpu_controls %>%
			filter(is_near_key, !is.na(cpu_audit_class)) %>%
			transmute(
				control_class = cpu_audit_class,
				run_id,
				intervention,
				rewrite_timeout_ms,
				work_duration_p50_ms = intervention_duration_p50_ms,
				work_end_to_keydown_p50_ms = intervention_end_to_current_keydown_p50_ms,
				latency_p50_ms
			)

		cpu_qos_control_summary <- cpu_qos_control_details %>%
			group_by(control_class) %>%
			summarise(
				control_count = n(),
				latency_p50_median_ms = median(latency_p50_ms),
				latency_p50_min_ms = min(latency_p50_ms),
				latency_p50_max_ms = max(latency_p50_ms),
				work_duration_median_ms = median(work_duration_p50_ms),
				work_end_to_keydown_median_ms = median(work_end_to_keydown_p50_ms),
				.groups = "drop"
			)

		write_csv(
			cpu_qos_control_details,
			file.path(data_dir, "typing-delay-cpu-qos-control-details.csv")
		)
		write_csv(
			cpu_qos_control_summary,
			file.path(data_dir, "typing-delay-cpu-qos-control-summary.csv")
		)

		save_plot(
			ggplot(
				cpu_qos_control_summary,
				aes(latency_p50_median_ms, fct_rev(control_class), color = control_class)
			) +
				geom_linerange(
					aes(xmin = latency_p50_min_ms, xmax = latency_p50_max_ms),
					linewidth = 1.2,
					alpha = 0.75
				) +
				geom_point(size = 4.0, alpha = 0.95) +
				geom_text(
					aes(label = paste0("n=", control_count)),
					nudge_y = 0.18,
					size = 3.1,
					show.legend = FALSE
				) +
				geom_vline(
					xintercept = c(10, 24),
					linetype = c("dotted", "dashed"),
					color = brewer_color("Greys", 6, type = "seq", n = 9),
					linewidth = 0.35
				) +
				scale_color_brewer(type = "qual", palette = "Set2", guide = "none", drop = FALSE) +
				scale_x_continuous(breaks = seq(0, 30, 5), limits = c(0, 30)) +
				labs(
					title = "CPU policy, not near-key waiting, separates the remaining controls",
					subtitle = "Fixed 1300ms key hold; timer/control end is about 50ms before keydown; bars are min-max across control p50s",
					x = "Next EventDispatch duration, p50 (ms)",
					y = NULL
				),
			"120-cpu-qos-control-summary.png",
			width = 10.5,
			height = 5.8
		)

		finite_cpu_model_data <- task_end_cpu_controls %>%
			filter(is_finite_cpu_control, !is.na(intervention_end_to_current_keydown_p50_ms)) %>%
			mutate(
				work_origin = case_when(
					str_detect(intervention, "^worker") ~ "worker CPU",
					str_detect(intervention, "^external persistent") ~ "prestarted external CPU",
					str_detect(intervention, "^external") ~ "spawned external CPU",
					TRUE ~ "main-thread CPU"
				),
				work_origin = factor(
					work_origin,
					levels = c(
						"main-thread CPU",
						"worker CPU",
						"spawned external CPU",
						"prestarted external CPU"
					)
				)
			)

		if (nrow(finite_cpu_model_data) >= 4) {
			finite_cpu_model <- lm(
				latency_p50_ms ~ log1p(intervention_duration_p50_ms) +
					intervention_end_to_current_keydown_p50_ms,
				data = finite_cpu_model_data
			)
			finite_cpu_model_r_squared <- summary(finite_cpu_model)$r.squared
			finite_cpu_model_coefficients <- as_tibble(
				coef(summary(finite_cpu_model)),
				rownames = "term"
			)
			finite_cpu_model_predictions <- finite_cpu_model_data %>%
				mutate(
					predicted_latency_p50_ms = as.numeric(predict(finite_cpu_model, newdata = finite_cpu_model_data)),
					model_residual_ms = latency_p50_ms - predicted_latency_p50_ms,
					model_r_squared = finite_cpu_model_r_squared
				) %>%
				select(
					run_id,
					intervention,
					work_origin,
					rewrite_timeout_ms,
					work_duration_p50_ms = intervention_duration_p50_ms,
					work_end_to_keydown_p50_ms = intervention_end_to_current_keydown_p50_ms,
					latency_p50_ms,
					predicted_latency_p50_ms,
					model_residual_ms,
					model_r_squared
				)

			write_csv(
				finite_cpu_model_coefficients,
				file.path(data_dir, "typing-delay-finite-cpu-model-coefficients.csv")
			)
			write_csv(
				finite_cpu_model_predictions,
				file.path(data_dir, "typing-delay-finite-cpu-model-predictions.csv")
			)

			save_plot(
				ggplot(
					finite_cpu_model_predictions,
					aes(predicted_latency_p50_ms, latency_p50_ms, color = work_origin, shape = work_origin)
				) +
					geom_abline(
						slope = 1,
						intercept = 0,
						linetype = "dashed",
						color = brewer_color("Greys", 6, type = "seq", n = 9),
						linewidth = 0.45
					) +
					geom_point(size = 3.2, alpha = 0.9) +
					scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
					scale_shape_manual(values = c(
						`main-thread CPU` = 16,
						`worker CPU` = 15,
						`spawned external CPU` = 17,
						`prestarted external CPU` = 3
					), drop = FALSE) +
					scale_x_continuous(breaks = seq(5, 30, 5), limits = c(5, 30)) +
					scale_y_continuous(breaks = seq(5, 30, 5), limits = c(5, 30)) +
					labs(
						title = "A simple duration/proximity model explains most finite CPU controls",
						subtitle = sprintf(
							"Descriptive fit: latency ~ log1p(duration) + end-to-keydown gap; R^2 = %.2f across %d control rows",
							finite_cpu_model_r_squared,
							nrow(finite_cpu_model_predictions)
						),
						x = "Model-predicted EventDispatch p50 (ms)",
						y = "Observed EventDispatch p50 (ms)",
						color = "CPU work origin",
						shape = "CPU work origin"
					),
				"121-finite-cpu-duration-proximity-model.png",
				width = 8.8,
				height = 6.6
			)
		}

		system_mechanism_matrix <- tribble(
			~candidate_theory, ~status, ~evidence_strength, ~strongest_measurement, ~implication, ~remaining_gap,
			"Chrome EventDispatch accounting artifact only", "ruled out", 5,
			"Key-held visual endpoints drop with EventDispatch: DrawFrame, Paint, RAF, and changed screenshots all move in the same direction.",
			"The cliff is not just a Chromium trace-slice labeling problem.",
			"Visual endpoints are still browser-derived; a camera/display probe would be the external check.",
			"Gutenberg 1000ms timer callback existence is enough", "ruled out", 5,
			"Near-key no-CPU controls stay slow: median control p50 is 24.3ms across six controls.",
			"A callback, worker lifetime, delayed task, IPC shape, or idle child close to keydown does not by itself produce the fast band.",
			"Timer ordering still determines which regime is sampled, but it is not a sufficient mechanism.",
			"Any external CPU burn anywhere is enough", "ruled out", 5,
			"Continuous background/maintenance CPU stays slow: median control p50 is 24.2ms despite real CPU consumption.",
			"The CPU explanation is policy-sensitive, not generic load-sensitive.",
			"The exact lower-level boundary needs OS scheduler and power counters.",
			"taskpolicy tiering in general explains the split", "ruled out", 4,
			"`taskpolicy -l 0..5` and `taskpolicy -t 0..5` all stay in the fast 9.2-9.7ms band.",
			"The slow cases are specific to Darwin background priority and QoS background/maintenance clamps.",
			"Need OS-level traces to distinguish QoS scheduling from power-state effects.",
			"A large native/browser input effect is sufficient", "ruled out for large cliff", 4,
			"Native contenteditable moves in the same direction, but only from 1.20ms to 0.49ms.",
			"Browser/system state can modulate input cost, but Gutenberg's heavier path amplifies it into a 10ms+ cliff.",
			"Native controls do not identify which Gutenberg subscriptions are product-actionable.",
			"Recent finite CPU duration/proximity explains finite controls", "supported boundary", 4,
			"The two-term finite-burst model has R^2 = 0.71; longer CPU work and smaller end-to-keydown gaps predict lower p50.",
			"Duration and recency are real descriptive variables, not coincidental labels.",
			"The model is descriptive and does not identify P-core residency, frequency, cache, or scheduler state.",
			"Ordinary/utility-QoS CPU activity puts the path in the fast band", "supported boundary", 5,
			"Continuous ordinary/nice/utility CPU controls are low: median control p50 is 9.7ms, with utility at 9.4ms.",
			"The remaining system claim is specifically ordinary/utility-QoS CPU state interacting with the foreground browser/editor path.",
			"Requires external counters to prove which CPU/QoS/power-state component is causal.",
			"Gutenberg broad input path amplifies the system state", "supported boundary", 4,
			"Source traces find thousands of small data/RichText listener calls; native controls show only a sub-1ms version of the same direction.",
			"The product-visible cliff needs Gutenberg's broad input/subscriber path, not just native DOM event overhead.",
			"Exact source-level mitigation still needs an implementation prototype and regression check.",
			"Exact hardware or scheduler layer is identified", "still open", 2,
			"No current JS/browser trace includes per-core residency, frequency, cache, or scheduler/QoS transition counters.",
			"The honest current answer stops at a narrowed system-boundary hypothesis.",
			"Needs hardware counters, OS scheduler/QoS traces, or browser traces with OS scheduling categories."
			) %>%
				mutate(
					status = factor(
						status,
						levels = c(
						"ruled out",
						"ruled out for large cliff",
						"supported boundary",
						"still open"
					)
				),
				theory_order = row_number(),
					candidate_theory_wrapped = str_wrap(candidate_theory, width = 42)
				)

			cpu_qos_next_probe_audit <- tribble(
				~open_question, ~current_answer, ~strongest_evidence, ~what_is_closed, ~remaining_unknown, ~next_probe, ~decision,
				"Is the 1000ms timer callback or a nearby no-op task sufficient?", "No.", "Near-key no-CPU task controls have a median p50 of 24.3ms across six controls.", "Callback existence, worker lifetime, delayed task, IPC shape, and idle child lifetime do not produce the fast band.", "None for the system-level CPU/QoS claim.", "Do not add more no-CPU task variants unless they target a new concrete browser subsystem.", "closed",
				"Is any external CPU burn sufficient?", "No.", "Continuous background/maintenance CPU controls have a median p50 of 24.2ms despite consuming CPU.", "Generic load and generic process activity are not enough.", "Which policy or hardware state makes ordinary/utility CPU visible to the foreground browser path.", "Measure ordinary, utility, background, and maintenance controls with OS scheduler/QoS and power counters.", "partially closed",
				"Is ordinary/utility-QoS CPU activity sufficient locally?", "Yes, as a boundary result.", "Continuous ordinary/nice/utility controls have a median p50 of 9.7ms; taskpolicy -c utility is 9.4ms; taskpolicy -l/-t tiers stay 9.2-9.7ms.", "The split is not Unix nice and not taskpolicy machinery in general.", "Whether the causal layer is P-core residency, cluster frequency, cache warmth, scheduler priority, timer coalescing, or a combination.", "Run finite and continuous CPU controls with powermetrics/Instruments and browser scheduling traces.", "supported boundary",
				"Do finite CPU duration and recency matter?", "Yes, descriptively.", "A two-term finite-burst model has R^2 = 0.71; longer work lowers p50 and larger end-to-keydown gaps raise p50.", "Duration and recency are real variables, not coincidental labels.", "The model does not identify the hardware mechanism and does not cover continuous QoS-clamped controls.", "Pair the finite-burst grid with per-core residency/frequency counters and process QoS state.", "supported boundary",
				"Is the exact hardware or scheduler layer identified?", "No.", "No current JS/browser trace includes per-core residency, frequency, cache, or scheduler/QoS transition counters.", "The report can name the narrowed system boundary but not the lower-level causal component.", "Exact split between core residency, frequency, cache, QoS scheduling, timer coalescing, and browser scheduler state.", "Use OS/hardware counters first; use more JS benchmark rows only to reproduce a counter-backed hypothesis.", "still open",
				"What should product optimization do with this?", "Keep it separate from source-level mitigations.", "Native/browser controls move less than 1ms while Gutenberg's broad input path moves by many milliseconds.", "System state modulates the path, but Gutenberg fanout supplies the scale.", "How real plugin/human workloads interact with the system state.", "Use workload replay for product lag and selector/subscriber prototypes for source mitigation; use OS counters for the benchmark artifact.", "split artifact from product"
			)

				cpu_qos_counter_contract_audit <- tribble(
					~candidate_layer, ~why_it_remains_plausible, ~current_constraints, ~counter_or_trace_contract, ~would_support_if, ~would_weaken_if, ~decision,
				"P-core or cluster frequency/residency",
				"One ordinary or utility-QoS busy child is enough to move the no-op timer into the fast band, while background and maintenance QoS CPU remain slow despite consuming CPU.",
				"Generic CPU load is ruled out, and adding more ordinary busy children is not monotonically better.",
				"Capture per-core residency, cluster frequency, package power, and renderer process/core placement for no-op, ordinary CPU, nice CPU, utility CPU, taskpolicy -b, QoS background, QoS maintenance, and finite-burst gap-decay rows.",
				"Fast rows share higher performance-cluster residency or frequency during the keydown/EventDispatch window, and finite-burst rows decay as that state decays.",
				"Fast and slow QoS rows have the same frequency/residency and renderer placement during the measured key window.",
				"first OS-counter target",
				"Darwin scheduler or QoS placement",
				"The fast/slow split follows ordinary/utility versus background/maintenance policy more closely than Unix nice or taskpolicy latency/throughput tiers.",
				"`nice +20` remains fast; taskpolicy latency and throughput tiers remain fast; `taskpolicy -b`, QoS background, and QoS maintenance remain slow.",
				"Use Instruments System Trace or equivalent to record thread QoS, runnable-to-running latency, context switches, core IDs, and scheduler priority for the browser renderer, GPU/compositor if relevant, and helper CPU processes.",
				"Fast rows show lower renderer scheduling latency, different core placement, or different effective QoS/priority during key dispatch even when helper CPU duration is matched.",
				"Renderer scheduling latency and effective QoS are indistinguishable across ordinary/utility and background/maintenance controls.",
				"co-equal first target",
				"Cache or memory hierarchy state",
				"Recent CPU work lowers the measured Gutenberg input slice, and the broad Gutenberg path has thousands of small JS/data/RichText calls that could be sensitive to cache or memory latency.",
				"External child CPU and worker CPU can move the path, so the explanation cannot require warming Gutenberg-specific JS objects directly.",
				"Collect renderer cycles, instructions, cache misses, branch misses if available, and task-level CPU time around the same EventDispatch window for matched finite-burst and continuous-QoS rows.",
				"Fast rows show lower renderer stall or miss rate during EventDispatch without a matching scheduler/frequency difference.",
				"Renderer hardware-counter ratios are the same across fast and slow rows, or differences follow frequency/scheduling instead.",
				"second-order target",
				"Timer coalescing or wakeup latency",
				"Finite CPU recency matters, and OS policy can change timer and wakeup behavior.",
				"The measured movement is EventDispatch duration, not only time from timer/key scheduling to dispatch start; near-key no-CPU timers and delays stay slow.",
				"Align timer fire time, helper work start/end, next keydown enqueue, EventDispatch start, and renderer thread wakeups with OS wakeup and timer-coalescing records.",
				"Fast rows primarily reduce key enqueue-to-EventDispatch-start or renderer wakeup latency, with little change inside the EventDispatch work itself.",
				"EventDispatch starts at comparable times but its internal JS/data/RichText work duration changes.",
				"control, not leading theory",
				"Chromium/browser scheduler state",
				"Browser/runtime checkpoints and CPU/QoS controls both show that work charged to EventDispatch depends on state below Gutenberg selectors.",
				"Current Chromium render traces capture visual pipeline endpoints, not scheduler state for task queues or input budgets.",
				"Record Chromium scheduler/task-queue categories, renderer main-thread task boundaries, input task priority, V8 slices, and Gutenberg source spans in the same key windows used by the CPU/QoS controls.",
				"Fast rows show different input-task priority, queueing, or task splitting while OS counters alone do not explain the split.",
				"Browser scheduler traces are identical once OS frequency/residency/QoS counters are controlled.",
				"pair with OS counters",
				"Product/source mitigation path",
				"Native contenteditable moves by less than 1ms while Gutenberg moves by many milliseconds, so source fanout supplies the scale.",
				"System state modulates the benchmarked path but does not identify a safe Gutenberg code change.",
				"Keep selector/subscriber prototypes and workload replay separate from OS-counter experiments; use the same source spans only to confirm product-scale amplification.",
				"Source prototypes reduce the broad input work across both slow and fast system states.",
				"Source changes only change the artifact under one system policy and regress behavior or workload replay.",
					"separate artifact from product optimization"
				)

				cpu_qos_counter_runset_contract_audit <- tribble(
					~runset_question, ~current_answer, ~minimum_rows, ~current_local_result, ~required_counters, ~discriminates, ~acceptance_or_rejection_rule, ~decision,
					"What is the minimum slow negative control?",
					"A nearby callback, delayed task, worker lifetime, IPC shape, or idle child is not sufficient.",
					"near-key marker no-op, delayed no-op, worker delay with no message, external delay with no message, and idle child plus no-op.",
					"Near-key no-CPU task controls have median p50 24.3ms and min-max 22.2-24.6ms.",
					"Confirm no helper CPU work; align helper lifetime, timer fire, next keydown enqueue, EventDispatch start/end, renderer wakeups, process QoS, core ID, frequency, and residency.",
					"Callback/wakeup/no-CPU explanations versus CPU-state explanations.",
					"Rows must stay slow while fast CPU rows show a counter delta; if they become fast with the same counters, the CPU-state explanation is too narrow.",
					"negative control",
					"What is the minimum fast continuous control?",
					"Ordinary or utility-QoS CPU activity is sufficient locally.",
					"ordinary external CPU, nice +20 CPU, taskpolicy -c utility CPU, and one representative taskpolicy -l/-t tier row.",
					"Continuous ordinary/utility controls have median p50 9.7ms; taskpolicy -c utility is 9.4ms; taskpolicy -l/-t tiers are 9.2-9.7ms.",
					"Capture helper effective QoS, helper CPU consumption, renderer runnable-to-running latency, renderer core ID, performance-cluster residency, frequency, package power, and EventDispatch source spans.",
					"P-core/frequency/residency, ordinary/utility scheduler visibility, and foreground renderer scheduling improvements.",
					"Fast rows should share a measurable OS or browser-scheduler state not present in slow no-CPU and background/maintenance rows; otherwise this boundary remains descriptive only.",
					"fast policy control",
					"What is the minimum slow continuous policy contrast?",
					"CPU consumption alone is not enough when the helper is background or maintenance clamped.",
					"taskpolicy -b CPU x1/x4/x8, taskpolicy -c background CPU, and taskpolicy -c maintenance CPU.",
					"Continuous background/maintenance controls have median p50 24.2ms and min-max 24.0-24.7ms despite real CPU consumption.",
					"Verify helper CPU consumption and effective QoS; capture renderer scheduling latency, helper/renderer core placement, performance-cluster residency, frequency, package power, and browser input-task priority.",
					"Generic CPU load versus policy-visible CPU state.",
					"If background/maintenance rows consume CPU but lack the fast rows' residency, frequency, scheduler, or browser-task state, the policy-sensitive mechanism is supported; if counters match fast rows while latency stays slow, look at browser or cache state.",
					"policy contrast",
					"How should finite CPU duration and recency be tested?",
					"The finite-burst controls show a descriptive duration/proximity relationship, but not the lower-level cause.",
					"20ms, 40ms, 80ms, and 150ms worker/external/prestarted CPU rows near keydown, plus 150ms rows at earlier end-to-keydown gaps.",
					"The two-term finite-burst model has R^2 0.71; longer work lowers p50 and larger end-to-keydown gaps raise p50.",
					"Record helper work start/end, work duration, work-end-to-keydown gap, per-core residency/frequency decay, renderer scheduling latency, cache/memory counters if available, and EventDispatch subspans.",
					"Power/frequency decay, scheduler-state decay, cache warmth, or timer/wakeup latency.",
					"A valid mechanism must explain both the continuous QoS split and the finite-burst decay; explaining only the decay is not enough to close the CPU/QoS question.",
					"decay contract",
					"How should OS counters be separated from Chromium scheduler state?",
					"Current Chromium traces do not contain the scheduler/runtime state needed to split OS from browser mechanisms.",
					"Run the no-CPU slow row, one ordinary/utility fast row, one background/maintenance slow row, one finite-burst fast row, and one stale finite-burst slow row with matching Chromium scheduler/runtime traces.",
					"Browser/runtime checkpoints and CPU/QoS controls both show state below Gutenberg selectors, but current visual traces are render/screenshot oriented.",
					"Add Chromium scheduler/task-queue categories, renderer main-thread task boundaries, input task priority, V8 slices, protocol markers, and existing Gutenberg source spans to the same key windows as the OS counters.",
					"OS power/scheduler state versus Chromium input-task scheduling state.",
					"Claim a browser-scheduler mechanism only if OS frequency/residency/QoS counters do not explain the split and Chromium queue/priority/task boundaries do; otherwise keep the mechanism at the OS-counter layer.",
					"browser split gate",
					"What report shape is required before changing the mechanism claim?",
					"Aggregate p50 rows are not enough for the remaining mechanism layer.",
					"All rows above, with per-sample records rather than only class medians.",
					"Existing summaries identify the boundary classes but not the lower-level state.",
					"For each sample, report run id, sample index, retained/throwaway status, key timing, EventDispatch timing, helper work timing, helper QoS, renderer QoS, core IDs, frequency/residency, power/thermal metadata, browser scheduler slices, source-span ids, and environment metadata.",
					"Per-sample causal alignment versus aggregate coincidence.",
					"Do not revise the CPU/QoS mechanism claim unless the same per-sample counter state predicts the fast/slow split across slow no-CPU, fast ordinary/utility, slow background/maintenance, and finite decay rows.",
					"reporting gate"
				)

			write_csv(
				system_mechanism_matrix,
				file.path(data_dir, "typing-delay-system-mechanism-falsification-matrix.csv")
			)
			write_csv(
				cpu_qos_next_probe_audit,
				file.path(data_dir, "typing-delay-cpu-qos-next-probe-audit.csv")
			)
				write_csv(
					cpu_qos_counter_contract_audit,
					file.path(data_dir, "typing-delay-cpu-qos-counter-contract-audit.csv")
				)
				write_csv(
					cpu_qos_counter_runset_contract_audit,
					file.path(data_dir, "typing-delay-cpu-qos-counter-runset-contract-audit.csv")
				)

			save_plot(
				ggplot(
				system_mechanism_matrix,
				aes(
					evidence_strength,
					fct_reorder(candidate_theory_wrapped, theory_order, .desc = TRUE),
					color = status,
					shape = status
				)
			) +
				geom_point(size = 4.3, alpha = 0.95) +
				scale_color_brewer(type = "qual", palette = "Set1", drop = FALSE) +
				scale_shape_manual(values = c(
					`ruled out` = 4,
					`ruled out for large cliff` = 13,
					`supported boundary` = 16,
					`still open` = 1
				), drop = FALSE) +
				scale_x_continuous(breaks = 1:5, limits = c(1, 5.4)) +
				labs(
					title = "Most broad system-level explanations are already ruled out",
					subtitle = "Qualitative evidence matrix from visual, native, CPU/QoS, and taskpolicy controls",
					x = "Evidence strength from existing controls (1-5)",
					y = NULL,
					color = "Status",
					shape = "Status"
				),
			"129-system-mechanism-falsification-matrix.png",
			width = 11.5,
			height = 7.3
		)
	}

	if (file.exists(native_busy_wait_control_summary_path)) {
		native_busy_wait_control <- read_csv(native_busy_wait_control_summary_path, show_col_types = FALSE) %>%
			mutate(
				busy_wait_label = factor(
					paste0(busy_wait_ms, "ms"),
					levels = paste0(sort(unique(busy_wait_ms)), "ms")
				)
			)

		save_plot(
			ggplot(
				native_busy_wait_control,
				aes(
					busy_wait_ms,
					latency_p50_ms,
					color = busy_wait_label,
					shape = busy_wait_label
				)
			) +
				geom_point(size = 3.6, alpha = 0.95) +
				scale_color_brewer(type = "seq", palette = "Blues", direction = 1, drop = FALSE) +
				scale_shape_manual(values = c(`0ms` = 16, `20ms` = 17, `40ms` = 15, `150ms` = 18), drop = FALSE) +
				scale_x_continuous(breaks = c(0, 20, 40, 150)) +
				labs(
					title = "A native contenteditable shows only a tiny busy-timer effect",
					subtitle = "Fixed 1300ms key hold; timer rewritten so each busy wait ends about 50ms before keydown",
					x = "Native timer busy wait duration (ms)",
					y = "Next key event-only duration, p50 (ms)",
					color = "Busy wait",
					shape = "Busy wait"
				),
			"51-native-busy-wait-control.png",
			width = 9,
			height = 5.5
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
	"raw unknown action",
	"mark next not persistent"
)
marker_allspan_extended_interventions <- c(
	"normal marker",
	"marker no-op",
	"raw unknown action",
	"mark next not persistent",
	"stop/start typing",
	"toggle selection"
)
marker_allspan_core_shapes <- c(
	`normal marker` = 16,
	`marker no-op` = 17,
	`raw unknown action` = 4,
	`mark next not persistent` = 15
)
marker_allspan_extended_shapes <- c(
	marker_allspan_core_shapes,
	`stop/start typing` = 18,
	`toggle selection` = 8
)
marker_allspan_delta_shapes <- marker_allspan_core_shapes[
	names(marker_allspan_core_shapes) != "normal marker"
]
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_extended_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_extended_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
				scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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

redux_owner_source_audit_sites <- tribble(
	~source_path, ~source_line, ~source_site, ~subscription_scope, ~selector_audit,
	"packages/block-editor/src/components/block-list/index.js", 196, "BlockListItems useSelect", "per block list/root", "Reads block order, selection ids, visible blocks, zoom state, template lock, editing mode, block name, and appender eligibility.",
	"packages/editor/src/hooks/pattern-overrides.js", 40, "Pattern override support HOC", "per BlockEdit wrapper", "Reads block-editor settings and checks whether the current block name has supported binding attributes.",
	"packages/block-editor/src/components/block-list/block.js", 563, "BlockListBlockProvider useSelect", "per rendered block", "Reads the block record/attributes plus selection, mode, lock, movement, variation, section, overlay, and block-type state for one clientId.",
	"packages/block-editor/src/components/inner-blocks/index.js", 195, "useInnerBlocksProps useSelect", "per inner-blocks wrapper", "Reads block name, zoom state, template lock, root/parent client ids, editing mode, block settings, section root, and block type.",
	"packages/block-library/src/heading/edit.js", 35, "HeadingEdit anchor useSelect", "per heading block", "Reads block-editor settings and global table-of-contents block count for heading anchor generation."
)

if (file.exists(redux_listener_owner_summary_path)) {
	redux_listener_owner_source_summary <- read_csv(redux_listener_owner_summary_path, show_col_types = FALSE) %>%
		filter(
			!is.na(source_path),
			source_path != "",
			source_path != "(non-useSelect)",
			window_kind == "marker before input",
			intervention == "normal marker"
		)

	audited_marker_rows <- redux_listener_owner_source_summary %>%
		inner_join(
			redux_owner_source_audit_sites,
			by = c("source_path", "source_line")
		) %>%
		transmute(
			source_path,
			source_line,
			source_site,
			subscription_scope,
			selector_audit,
			owner_groups = 1L,
			marker_before_input_listener_duration_p50_ms = listener_duration_p50_ms,
			marker_before_input_listener_count_p50 = listener_count_p50,
			marker_before_input_per_listener_us = 1000 * listener_duration_p50_ms / listener_count_p50
		)

	other_marker_row <- redux_listener_owner_source_summary %>%
		anti_join(
			redux_owner_source_audit_sites,
			by = c("source_path", "source_line")
		) %>%
		summarise(
			source_path = "(other mapped owners)",
			source_line = NA_real_,
			source_site = "Other mapped owners",
			subscription_scope = "other mapped owners",
			selector_audit = "Aggregate of remaining source-mapped useSelect owners in the normal marker-before-input window.",
			owner_groups = n(),
			marker_before_input_listener_duration_p50_ms = sum(listener_duration_p50_ms, na.rm = TRUE),
			marker_before_input_listener_count_p50 = sum(listener_count_p50, na.rm = TRUE),
			marker_before_input_per_listener_us = 1000 * marker_before_input_listener_duration_p50_ms / marker_before_input_listener_count_p50,
			.groups = "drop"
		)

	redux_owner_source_audit <- bind_rows(audited_marker_rows, other_marker_row)

	if (file.exists(redux_listener_owner_diff_path)) {
		source_delta_rows <- read_csv(redux_listener_owner_diff_path, show_col_types = FALSE) %>%
			filter(
				window_kind %in% c("next input selectionChange", "next input updateBlockAttributes"),
				intervention %in% c("marker no-op", "mark next not persistent"),
				!is.na(source_path),
				source_path != ""
			) %>%
			mutate(
				delta_metric = paste0(
					recode(
						window_kind,
						`next input selectionChange` = "selection_change",
						`next input updateBlockAttributes` = "update_block_attributes"
					),
					"_",
					recode(
						intervention,
						`marker no-op` = "marker_no_op",
						`mark next not persistent` = "mark_next_not_persistent"
					),
					"_delta_p50_ms"
				)
			)

		audited_delta_rows <- source_delta_rows %>%
			inner_join(
				redux_owner_source_audit_sites,
				by = c("source_path", "source_line")
			) %>%
			group_by(source_path, source_line, delta_metric) %>%
			summarise(
				diff_listener_duration_p50_ms = sum(diff_listener_duration_p50_ms, na.rm = TRUE),
				.groups = "drop"
			)

		other_delta_rows <- source_delta_rows %>%
			anti_join(
				redux_owner_source_audit_sites,
				by = c("source_path", "source_line")
			) %>%
			group_by(delta_metric) %>%
			summarise(
				source_path = "(other mapped owners)",
				source_line = NA_real_,
				diff_listener_duration_p50_ms = sum(diff_listener_duration_p50_ms, na.rm = TRUE),
				.groups = "drop"
			) %>%
			select(source_path, source_line, delta_metric, diff_listener_duration_p50_ms)

		redux_owner_source_deltas <- bind_rows(audited_delta_rows, other_delta_rows) %>%
			pivot_wider(
				names_from = delta_metric,
				values_from = diff_listener_duration_p50_ms,
				values_fill = 0
			)

		redux_owner_source_audit <- redux_owner_source_audit %>%
			left_join(
				redux_owner_source_deltas,
				by = c("source_path", "source_line")
			)
	}

	redux_owner_source_audit <- redux_owner_source_audit %>%
		mutate(across(ends_with("_delta_p50_ms"), ~replace_na(.x, 0))) %>%
		arrange(desc(marker_before_input_listener_duration_p50_ms))

	write_csv(
		redux_owner_source_audit,
		file.path(data_dir, "typing-delay-redux-listener-source-audit.csv")
	)

	redux_owner_source_audit_plot <- redux_owner_source_audit %>%
		mutate(
			source_site = fct_reorder(source_site, marker_before_input_listener_duration_p50_ms),
			subscription_scope_plot = recode(
				subscription_scope,
				`per block list/root` = "per list/root",
				`per BlockEdit wrapper` = "per BlockEdit",
				`per rendered block` = "per block",
				`per inner-blocks wrapper` = "per inner-blocks",
				`per heading block` = "per heading",
				`other mapped owners` = "other mapped"
			),
			subscription_scope_plot = fct_reorder(subscription_scope_plot, marker_before_input_listener_duration_p50_ms, .fun = sum)
		)

	save_plot(
		ggplot(redux_owner_source_audit_plot, aes(
			marker_before_input_listener_duration_p50_ms,
			source_site,
			color = subscription_scope_plot,
			size = marker_before_input_listener_count_p50
		)) +
			geom_point(alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Set2") +
			scale_size_area(max_size = 8, labels = label_number()) +
			labs(
				title = "The marker fanout is mostly per-block and per-block-list subscriptions",
				subtitle = "Normal 1000ms marker-before-input window; top source sites audited against current source",
				x = "Redux listener duration, p50 (ms)",
				y = NULL,
				color = "Subscription scope",
				size = "p50 listener calls"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"115-redux-listener-source-audit.png",
		width = 12,
		height = 7
	)

	redux_owner_invalidation_matrix <- tribble(
		~source_site, ~state_category, ~text_update_relevance, ~notes,
		"BlockListItems useSelect", "target block text attributes", "not read", "The selector does not read content attributes.",
		"BlockListItems useSelect", "selection / caret", "possibly relevant", "Reads selected block ids and selected-root/appender state.",
		"BlockListItems useSelect", "block order / tree shape", "probably unchanged", "Reads child order and visible-block set; normal text insertion does not insert/remove/reorder blocks.",
		"BlockListItems useSelect", "global/editor settings", "probably unchanged", "Reads preview mode, zoom state, template lock, editing mode, and inserter capability.",
		"BlockListItems useSelect", "block type / global count", "not read", "No block-type count scan in this selector.",
		"Pattern override support HOC", "target block text attributes", "not read", "The selector checks block name support, not content.",
		"Pattern override support HOC", "selection / caret", "not read", "Selected state is used outside this useSelect result.",
		"Pattern override support HOC", "block order / tree shape", "not read", "No block order or tree traversal.",
		"Pattern override support HOC", "global/editor settings", "probably unchanged", "Reads __experimentalBlockBindingsSupportedAttributes from editor settings.",
		"Pattern override support HOC", "block type / global count", "probably unchanged", "Uses props.name; ordinary paragraph content insertion does not change block names.",
		"BlockListBlockProvider useSelect", "target block text attributes", "relevant for one block", "The selected paragraph instance reads its own attributes; the other block instances do not need the new text value.",
		"BlockListBlockProvider useSelect", "selection / caret", "possibly relevant", "Reads selection, multi-selection, selected-caret position, selected ancestry, and overlay state.",
		"BlockListBlockProvider useSelect", "block order / tree shape", "probably unchanged", "Reads block index, same-name blocks, section ancestry, and movement/removal capability.",
		"BlockListBlockProvider useSelect", "global/editor settings", "probably unchanged", "Reads block-editor settings, template locks, editing modes, and device/preview state.",
		"BlockListBlockProvider useSelect", "block type / global count", "probably unchanged", "Reads block type, variation, and same-name block list; ordinary text insertion keeps block identity/count stable.",
		"useInnerBlocksProps useSelect", "target block text attributes", "not read", "The selector reads wrapper/block-list state, not RichText content.",
		"useInnerBlocksProps useSelect", "selection / caret", "not read", "Selection is not part of this selector's returned value.",
		"useInnerBlocksProps useSelect", "block order / tree shape", "probably unchanged", "Reads parent/root ids and block settings; text insertion does not change child order.",
		"useInnerBlocksProps useSelect", "global/editor settings", "probably unchanged", "Reads zoom, template lock, editing mode, section root, and block settings.",
		"useInnerBlocksProps useSelect", "block type / global count", "probably unchanged", "Reads block name/type; ordinary text insertion keeps block type stable.",
		"HeadingEdit anchor useSelect", "target block text attributes", "not read", "Heading content is used by the component, but this useSelect only computes canGenerateAnchors.",
		"HeadingEdit anchor useSelect", "selection / caret", "not read", "No selection reads.",
		"HeadingEdit anchor useSelect", "block order / tree shape", "probably unchanged", "The global count selector depends on block order and identities, not attributes.",
		"HeadingEdit anchor useSelect", "global/editor settings", "probably unchanged", "Reads settings.generateAnchors.",
		"HeadingEdit anchor useSelect", "block type / global count", "probably unchanged", "Reads global table-of-contents block count; typing does not change that count."
	) %>%
		left_join(
			redux_owner_source_audit %>%
				select(
					source_site,
					marker_before_input_listener_duration_p50_ms,
					marker_before_input_listener_count_p50
				),
			by = "source_site"
		) %>%
		mutate(
			state_category = factor(
				state_category,
				levels = c(
					"target block text attributes",
					"selection / caret",
					"block order / tree shape",
					"global/editor settings",
					"block type / global count"
				)
			),
			text_update_relevance = factor(
				text_update_relevance,
				levels = c(
					"relevant for one block",
					"possibly relevant",
					"probably unchanged",
					"not read"
				)
			),
			source_site = fct_reorder(source_site, marker_before_input_listener_duration_p50_ms, .na_rm = TRUE)
		)

	write_csv(
		redux_owner_invalidation_matrix,
		file.path(data_dir, "typing-delay-redux-listener-invalidation-matrix.csv")
	)

	save_plot(
		ggplot(redux_owner_invalidation_matrix, aes(state_category, source_site, fill = text_update_relevance)) +
			geom_tile(color = "white", linewidth = 0.6) +
			scale_fill_brewer(type = "qual", palette = "Set2", drop = FALSE) +
			labs(
				title = "Most hot subscriptions read state that should not change on a text-only update",
				subtitle = "Manual source audit of the top marker-window Redux listener owners; rows ordered by marker p50 cost",
				x = NULL,
				y = NULL,
				fill = "Ordinary text insertion relevance"
			) +
			theme(
				axis.text.x = element_text(angle = 25, hjust = 1),
				legend.position = "bottom"
			),
		"116-redux-listener-invalidation-matrix.png",
		width = 12,
		height = 6.8
	)

	redux_owner_text_update_opportunity <- redux_owner_source_audit %>%
		filter(source_site %in% redux_owner_source_audit_sites$source_site | source_site == "Other mapped owners") %>%
		mutate(
			text_update_bucket = case_when(
				source_site == "BlockListItems useSelect" ~ "needs selection/tree validation",
				source_site == "BlockListBlockProvider useSelect" ~ "mostly skippable except edited block",
				source_site == "Other mapped owners" ~ "unknown/mixed",
				TRUE ~ "likely skippable for text-only edit"
			),
			estimated_skippable_listener_count_p50 = case_when(
				source_site == "BlockListBlockProvider useSelect" ~ pmax(marker_before_input_listener_count_p50 - 1, 0),
				text_update_bucket == "likely skippable for text-only edit" ~ marker_before_input_listener_count_p50,
				TRUE ~ 0
			),
			estimated_skippable_duration_p50_ms = case_when(
				source_site == "BlockListBlockProvider useSelect" & marker_before_input_listener_count_p50 > 0 ~
					marker_before_input_listener_duration_p50_ms *
						estimated_skippable_listener_count_p50 /
						marker_before_input_listener_count_p50,
				text_update_bucket == "likely skippable for text-only edit" ~ marker_before_input_listener_duration_p50_ms,
				TRUE ~ 0
			),
			estimated_kept_duration_p50_ms = marker_before_input_listener_duration_p50_ms - estimated_skippable_duration_p50_ms,
			text_update_bucket = factor(
				text_update_bucket,
				levels = c(
					"likely skippable for text-only edit",
					"mostly skippable except edited block",
					"needs selection/tree validation",
					"unknown/mixed"
				)
			)
		) %>%
		select(
			source_site,
			subscription_scope,
			text_update_bucket,
			marker_before_input_listener_duration_p50_ms,
			marker_before_input_listener_count_p50,
			estimated_skippable_duration_p50_ms,
			estimated_skippable_listener_count_p50,
			estimated_kept_duration_p50_ms,
			selector_audit
		) %>%
		arrange(desc(marker_before_input_listener_duration_p50_ms))

	write_csv(
		redux_owner_text_update_opportunity,
		file.path(data_dir, "typing-delay-redux-listener-text-update-opportunity.csv")
	)

	redux_owner_text_update_bucket_summary <- redux_owner_text_update_opportunity %>%
		group_by(text_update_bucket) %>%
		summarize(
			marker_before_input_listener_duration_p50_ms = sum(marker_before_input_listener_duration_p50_ms, na.rm = TRUE),
			estimated_skippable_duration_p50_ms = sum(estimated_skippable_duration_p50_ms, na.rm = TRUE),
			estimated_kept_duration_p50_ms = sum(estimated_kept_duration_p50_ms, na.rm = TRUE),
			marker_before_input_listener_count_p50 = sum(marker_before_input_listener_count_p50, na.rm = TRUE),
			estimated_skippable_listener_count_p50 = sum(estimated_skippable_listener_count_p50, na.rm = TRUE),
			.groups = "drop"
		)

	write_csv(
		redux_owner_text_update_bucket_summary,
		file.path(data_dir, "typing-delay-redux-listener-text-update-opportunity-summary.csv")
	)

	redux_owner_text_update_plot <- redux_owner_text_update_opportunity %>%
		mutate(
			source_site = fct_reorder(source_site, marker_before_input_listener_duration_p50_ms),
			text_update_bucket = fct_drop(text_update_bucket)
		)

	save_plot(
		ggplot(redux_owner_text_update_plot, aes(
			marker_before_input_listener_duration_p50_ms,
			source_site,
			color = text_update_bucket,
			size = marker_before_input_listener_count_p50
		)) +
			geom_point(alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Text-only update triage") +
			scale_size_area(max_size = 8, labels = label_number(), name = "p50 listener calls") +
			labs(
				title = "Most audited marker fanout is not intrinsically text-content work",
				subtitle = "Manual source triage of normal marker-before-input Redux listener owners; size is listener count",
				x = "Redux listener duration, p50 (ms)",
				y = NULL
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"122-redux-listener-text-update-opportunity.png",
		width = 12,
		height = 7
	)

	redux_owner_guard_candidate_rows <- tribble(
		~source_site, ~guard_candidate, ~guard_kind, ~prototype_risk, ~prototype_priority, ~candidate_notes,
		"(audited marker fanout total)", "Split persistence-only changes away from block-editor root notification", "store partition / branch-aware notification", "high", "prototype after local guards", "Would avoid waking block-tree subscribers for MARK_LAST_CHANGE_AS_PERSISTENT, but changes store subscription semantics and needs broad compatibility tests.",
		"Pattern override support HOC", "Cache supported binding attributes by block name and settings version", "settings/name guard", "low-medium", "first local prototype", "The selector reads getSettings().__experimentalBlockBindingsSupportedAttributes and props.name, not content or selection.",
		"BlockListBlockProvider useSelect", "Notify or recompute only the edited block for text-attribute-only updates", "clientId attribute guard", "medium-high", "second local prototype", "One instance reads the edited paragraph attributes; the other rendered blocks should not need the changed text value.",
		"useInnerBlocksProps useSelect", "Guard on root/order/settings versions, not text attributes", "root structural guard", "medium", "second local prototype", "The selector reads wrapper/root block-list state and settings, not RichText content.",
		"HeadingEdit anchor useSelect", "Guard on anchor-setting and table-of-contents block-count versions", "settings/count guard", "low", "first local prototype", "The hot selector computes whether heading anchors can be generated; paragraph text insertion should not change that.",
		"BlockListItems useSelect", "Guard on block order, visible blocks, selected IDs, zoom/template/editing/appender versions", "selection/tree guard", "high", "validation prototype", "This selector does not read content attributes, but selection and appender behavior make it the riskiest large bucket.",
		"Other mapped owners", "Audit remaining mapped owners before optimization", "unknown/mixed", "unknown", "defer", "The aggregate is smaller but mixed; do not optimize it blindly."
	)

	audited_total <- redux_owner_text_update_opportunity %>%
		summarize(
			source_site = "(audited marker fanout total)",
			candidate_duration_p50_ms = sum(marker_before_input_listener_duration_p50_ms, na.rm = TRUE),
			candidate_listener_count_p50 = sum(marker_before_input_listener_count_p50, na.rm = TRUE),
			estimated_skippable_duration_p50_ms = sum(estimated_skippable_duration_p50_ms, na.rm = TRUE),
			estimated_skippable_listener_count_p50 = sum(estimated_skippable_listener_count_p50, na.rm = TRUE),
			.groups = "drop"
		)

	guard_source_rows <- redux_owner_text_update_opportunity %>%
		transmute(
			source_site,
			candidate_duration_p50_ms = marker_before_input_listener_duration_p50_ms,
			candidate_listener_count_p50 = marker_before_input_listener_count_p50,
			estimated_skippable_duration_p50_ms,
			estimated_skippable_listener_count_p50
		)

	redux_owner_guard_candidates <- redux_owner_guard_candidate_rows %>%
		left_join(
			bind_rows(audited_total, guard_source_rows),
			by = "source_site"
		) %>%
		mutate(
			prototype_risk = factor(
				prototype_risk,
				levels = c("low", "low-medium", "medium", "medium-high", "high", "unknown")
			),
			prototype_priority = factor(
				prototype_priority,
				levels = c(
					"first local prototype",
					"second local prototype",
					"validation prototype",
					"prototype after local guards",
					"defer"
				)
			)
		) %>%
		arrange(prototype_priority, desc(candidate_duration_p50_ms))

	write_csv(
		redux_owner_guard_candidates,
		file.path(data_dir, "typing-delay-redux-listener-guard-candidates.csv")
	)

	redux_owner_guard_plot <- redux_owner_guard_candidates %>%
		mutate(
			guard_candidate = fct_reorder(guard_candidate, candidate_duration_p50_ms),
			plot_duration_p50_ms = if_else(
				source_site == "(audited marker fanout total)",
				estimated_skippable_duration_p50_ms,
				candidate_duration_p50_ms
			)
		)

	save_plot(
		ggplot(redux_owner_guard_plot, aes(
			plot_duration_p50_ms,
			guard_candidate,
			color = prototype_risk,
			shape = prototype_priority,
			size = candidate_listener_count_p50
		)) +
			geom_point(alpha = 0.92) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Prototype risk") +
			scale_size_area(max_size = 8, labels = label_number(), name = "p50 listener calls") +
			labs(
				title = "Concrete guard candidates for text-only editor updates",
				subtitle = "Duration is source-row p50 exposure, except the total row uses estimated skippable p50 from the audited marker fanout",
				x = "Candidate p50 exposure / estimated skippable time (ms)",
				y = NULL,
				shape = "Suggested next step"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"124-redux-listener-guard-candidates.png",
		width = 12.5,
		height = 7.4
	)

	redux_owner_guard_validation_matrix <- redux_owner_guard_candidates %>%
		mutate(
			validation_burden = case_when(
				source_site == "HeadingEdit anchor useSelect" ~ "low",
				source_site == "Pattern override support HOC" ~ "low-medium",
				source_site == "useInnerBlocksProps useSelect" ~ "medium",
				source_site == "BlockListBlockProvider useSelect" ~ "medium-high",
				source_site == "BlockListItems useSelect" ~ "high",
				source_site == "(audited marker fanout total)" ~ "high",
				TRUE ~ "defer"
			),
			validation_burden = factor(
				validation_burden,
				levels = c("low", "low-medium", "medium", "medium-high", "high", "defer")
			),
			validation_burden_score = case_when(
				validation_burden == "low" ~ 1,
				validation_burden == "low-medium" ~ 2,
				validation_burden == "medium" ~ 3,
				validation_burden == "medium-high" ~ 4,
				validation_burden == "high" ~ 5,
				TRUE ~ 6
			),
			required_behavior_checks = case_when(
				source_site == "Pattern override support HOC" ~ "Text insertion; block binding support settings change; block-name variation; pattern override behavior.",
				source_site == "HeadingEdit anchor useSelect" ~ "Text insertion outside headings; generateAnchors setting toggle; table-of-contents block insertion/removal.",
				source_site == "BlockListBlockProvider useSelect" ~ "Edited block updates; non-edited block remains fresh after selection, variation, movement/removal, overlay, and template-mode changes.",
				source_site == "useInnerBlocksProps useSelect" ~ "Text insertion; child insertion/removal/reorder; zoom/template lock/editing mode/layout changes.",
				source_site == "BlockListItems useSelect" ~ "Text insertion plus selection, visible block list, appender, template lock, zoom, block insertion/removal/reorder, and multi-select flows.",
				source_site == "(audited marker fanout total)" ~ "All local-guard checks plus persistence transition behavior in useBlockSync and compatibility for isLastBlockChangePersistent consumers.",
				TRUE ~ "Audit source and owner mix before writing an optimization."
			),
			stale_state_failure_mode = case_when(
				source_site == "Pattern override support HOC" ~ "Block binding UI/support state goes stale after settings or block-name changes.",
				source_site == "HeadingEdit anchor useSelect" ~ "Heading anchor affordance or table-of-contents-dependent behavior goes stale.",
				source_site == "BlockListBlockProvider useSelect" ~ "Non-edited block selection, movement/removal, variation, overlay, or block identity UI goes stale.",
				source_site == "useInnerBlocksProps useSelect" ~ "Inner-block layout, root, lock, zoom, or editing-mode state goes stale.",
				source_site == "BlockListItems useSelect" ~ "Block list selection, visibility, appender, template, zoom, or structural UI goes stale.",
				source_site == "(audited marker fanout total)" ~ "Persistence marker stops driving the correct onInput/onChange transition or external persistence consumers miss the signal.",
				TRUE ~ "Unknown until source owners are separated."
			),
			acceptance_measurement = case_when(
				source_site == "(audited marker fanout total)" ~ "Retains persistence semantics while reducing ordinary block-editor useSelect fanout in marker-only windows.",
				source_site == "Other mapped owners" ~ "No optimization until owner buckets are separated and a concrete stale-state risk is known.",
				TRUE ~ "Reduces this owner family's listener calls on paragraph text input without changing the required behavior checks."
			),
			plot_exposure_p50_ms = if_else(
				source_site == "(audited marker fanout total)",
				estimated_skippable_duration_p50_ms,
				candidate_duration_p50_ms
			)
		)

	write_csv(
		redux_owner_guard_validation_matrix,
		file.path(data_dir, "typing-delay-redux-listener-guard-validation-matrix.csv")
	)

	redux_owner_guard_validation_plot <- redux_owner_guard_validation_matrix %>%
		mutate(
			guard_candidate_plot = str_wrap(guard_candidate, 54),
			prototype_priority_plot = recode(
				prototype_priority,
				"first local prototype" = "first local",
				"second local prototype" = "second local",
				"validation prototype" = "validation",
				"prototype after local guards" = "after local guards",
				"defer" = "defer"
			)
		)

	save_plot(
		ggplot(
			redux_owner_guard_validation_plot,
			aes(
				plot_exposure_p50_ms,
				fct_reorder(guard_candidate_plot, validation_burden_score, .desc = TRUE),
				color = validation_burden,
				shape = prototype_priority_plot,
				size = candidate_listener_count_p50
			)
		) +
			geom_point(alpha = 0.92) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Validation burden") +
			scale_size_area(max_size = 8, labels = label_number(), name = "p50 listener calls") +
			labs(
				title = "High exposure is not the same as a safe first guard",
				subtitle = "Guard candidates ranked by validation burden; exposure is current source-row p50, except the total row uses audited skippable p50",
				x = "Current p50 exposure / estimated skippable time (ms)",
				y = NULL,
				shape = "Next step"
			) +
			guides(
				color = guide_legend(nrow = 2),
				shape = guide_legend(nrow = 2),
				size = guide_legend(nrow = 1)
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"134-redux-listener-guard-validation-matrix.png",
		width = 13.5,
		height = 8.0
	)

	audited_marker_fanout_p50_ms <- redux_owner_guard_validation_matrix %>%
		filter(source_site == "(audited marker fanout total)") %>%
		pull(candidate_duration_p50_ms) %>%
		first()
	audited_conservative_skippable_p50_ms <- redux_owner_guard_validation_matrix %>%
		filter(source_site == "(audited marker fanout total)") %>%
		pull(estimated_skippable_duration_p50_ms) %>%
		first()

	selector_guard_frontier <- redux_owner_guard_validation_matrix %>%
		filter(
			source_site %in% c(
				"Pattern override support HOC",
				"HeadingEdit anchor useSelect",
				"BlockListBlockProvider useSelect",
				"useInnerBlocksProps useSelect",
				"BlockListItems useSelect"
			)
		) %>%
		mutate(
			implementation_order = case_when(
				source_site == "Pattern override support HOC" ~ 1,
				source_site == "HeadingEdit anchor useSelect" ~ 2,
				source_site == "BlockListBlockProvider useSelect" ~ 3,
				source_site == "useInnerBlocksProps useSelect" ~ 4,
				source_site == "BlockListItems useSelect" ~ 5,
				TRUE ~ 99
			),
			stage = case_when(
				implementation_order <= 2 ~ "low-risk local guards",
				implementation_order <= 4 ~ "second local guards",
				TRUE ~ "validation prototype"
			),
			conservative_counted_skippable_ms = case_when(
				source_site == "BlockListItems useSelect" ~ 0,
				TRUE ~ estimated_skippable_duration_p50_ms
			),
			unvalidated_potential_ms = case_when(
				source_site == "BlockListItems useSelect" ~ candidate_duration_p50_ms,
				TRUE ~ 0
			),
			guard_short_name = case_when(
				source_site == "Pattern override support HOC" ~ "pattern override settings/name",
				source_site == "HeadingEdit anchor useSelect" ~ "heading anchor setting/count",
				source_site == "BlockListBlockProvider useSelect" ~ "non-edited block provider",
				source_site == "useInnerBlocksProps useSelect" ~ "inner-blocks root/order",
				source_site == "BlockListItems useSelect" ~ "block-list structural/selection",
				TRUE ~ source_site
			),
			order_label = paste0(implementation_order, ". ", guard_short_name)
		) %>%
		arrange(implementation_order) %>%
		mutate(
			cumulative_validation_burden_score = cumsum(validation_burden_score),
			cumulative_conservative_skippable_ms = cumsum(conservative_counted_skippable_ms),
			cumulative_possible_after_validation_ms = cumulative_conservative_skippable_ms + cumsum(unvalidated_potential_ms),
			share_of_audited_marker_fanout_pct = 100 * cumulative_conservative_skippable_ms / audited_marker_fanout_p50_ms,
			share_of_conservative_skippable_pct = 100 * cumulative_conservative_skippable_ms / audited_conservative_skippable_p50_ms,
			remaining_conservative_skippable_ms = audited_conservative_skippable_p50_ms - cumulative_conservative_skippable_ms,
			stage = factor(
				stage,
				levels = c("low-risk local guards", "second local guards", "validation prototype")
			)
		)

	write_csv(
		selector_guard_frontier,
		file.path(data_dir, "typing-delay-selector-guard-implementation-frontier.csv")
	)

	selector_guard_frontier_summary <- selector_guard_frontier %>%
		group_by(stage) %>%
		summarize(
			candidates = str_c(guard_short_name, collapse = "; "),
			stage_validation_burden_score = sum(validation_burden_score, na.rm = TRUE),
			stage_conservative_skippable_ms = sum(conservative_counted_skippable_ms, na.rm = TRUE),
			stage_unvalidated_potential_ms = sum(unvalidated_potential_ms, na.rm = TRUE),
			cumulative_validation_burden_score = max(cumulative_validation_burden_score, na.rm = TRUE),
			cumulative_conservative_skippable_ms = max(cumulative_conservative_skippable_ms, na.rm = TRUE),
			cumulative_possible_after_validation_ms = max(cumulative_possible_after_validation_ms, na.rm = TRUE),
			share_of_audited_marker_fanout_pct = max(share_of_audited_marker_fanout_pct, na.rm = TRUE),
			share_of_conservative_skippable_pct = max(share_of_conservative_skippable_pct, na.rm = TRUE),
			.groups = "drop"
		)

	write_csv(
		selector_guard_frontier_summary,
		file.path(data_dir, "typing-delay-selector-guard-frontier-summary.csv")
	)

	selector_guard_frontier_plot <- selector_guard_frontier %>%
		mutate(
			plot_label = case_when(
				implementation_order == 1 ~ "1 pattern",
				implementation_order == 2 ~ "2 heading",
				implementation_order == 3 ~ "3 provider",
				implementation_order == 4 ~ "4 inner blocks",
				implementation_order == 5 ~ "5 BlockListItems",
				TRUE ~ as.character(implementation_order)
			),
			label_y = case_when(
				implementation_order == 1 ~ cumulative_conservative_skippable_ms + 0.45,
				implementation_order == 2 ~ cumulative_conservative_skippable_ms + 0.45,
				implementation_order == 3 ~ cumulative_conservative_skippable_ms - 0.5,
				implementation_order == 4 ~ cumulative_conservative_skippable_ms + 0.45,
				TRUE ~ cumulative_conservative_skippable_ms - 0.55
			)
		)

	save_plot(
		ggplot(
			selector_guard_frontier_plot,
			aes(
				cumulative_validation_burden_score,
				cumulative_conservative_skippable_ms,
				color = stage,
				shape = stage,
				size = candidate_listener_count_p50
			)
		) +
			geom_hline(
				yintercept = audited_conservative_skippable_p50_ms,
				linetype = "dashed",
				linewidth = 0.4,
				color = "grey45"
			) +
			geom_point(alpha = 0.92) +
			geom_point(
				aes(y = cumulative_possible_after_validation_ms),
				alpha = 0.28,
				stroke = 1.2
			) +
			geom_text(
				aes(y = label_y, label = plot_label),
				size = 3.1,
				color = "grey20",
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Prototype stage") +
			scale_size_area(max_size = 8, labels = label_number(), name = "p50 listener calls") +
			scale_y_continuous(
				limits = c(0, max(selector_guard_frontier_plot$cumulative_possible_after_validation_ms, na.rm = TRUE) + 1),
				labels = label_number(suffix = "ms")
			) +
			labs(
				title = "Selector-guard frontier favors local guards before store surgery",
				subtitle = "Solid points count conservative skippable p50; faint duplicate point includes unvalidated BlockListItems potential",
				x = "Cumulative validation-burden score",
				y = "Cumulative skippable marker-window p50",
				shape = "Prototype stage"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"138-selector-guard-implementation-frontier.png",
		width = 12,
		height = 7.2
	)

	selector_guard_source_feasibility <- redux_owner_guard_validation_matrix %>%
		filter(
			source_site %in% c(
				"Pattern override support HOC",
				"HeadingEdit anchor useSelect",
				"BlockListBlockProvider useSelect",
				"useInnerBlocksProps useSelect",
				"BlockListItems useSelect"
			)
		) %>%
		mutate(
			implementation_candidate = case_when(
				source_site == "Pattern override support HOC" ~ "selected-only pattern override support check",
				source_site == "HeadingEdit anchor useSelect" ~ "shared heading-anchor capability signal",
				source_site == "BlockListBlockProvider useSelect" ~ "clientId-scoped text-attribute guard",
				source_site == "useInnerBlocksProps useSelect" ~ "root/order/settings structural guard",
				source_site == "BlockListItems useSelect" ~ "structural/selection-version guard",
				TRUE ~ guard_candidate
			),
			source_feasibility = case_when(
				source_site == "Pattern override support HOC" ~ "clear local split",
				source_site == "HeadingEdit anchor useSelect" ~ "needs shared/global signal",
				source_site %in% c("BlockListBlockProvider useSelect", "useInnerBlocksProps useSelect") ~ "needs invalidation prototype",
				source_site == "BlockListItems useSelect" ~ "validate before counting",
				TRUE ~ "unknown"
			),
			feasibility_score = case_when(
				source_feasibility == "clear local split" ~ 1,
				source_feasibility == "needs shared/global signal" ~ 3,
				source_feasibility == "needs invalidation prototype" ~ 4,
				source_feasibility == "validate before counting" ~ 5,
				TRUE ~ 6
			),
			source_finding = case_when(
				source_site == "Pattern override support HOC" ~ "The visible controls are already selected-only, but the support-check useSelect is mounted on every BlockEdit wrapper.",
				source_site == "HeadingEdit anchor useSelect" ~ "Every heading must react when generateAnchors changes or a table-of-contents block appears; a component-local memo does not remove the store subscription.",
				source_site == "BlockListBlockProvider useSelect" ~ "Only the edited paragraph needs changed text attributes, but the selector also carries selection, movement, overlay, variation, and identity state.",
				source_site == "useInnerBlocksProps useSelect" ~ "The selector is structural/root/settings-oriented, but it needs a versioned root/order/settings boundary.",
				source_site == "BlockListItems useSelect" ~ "The selector is large and not content-attribute work, but it is the block-list selection/appender/visibility surface.",
				TRUE ~ candidate_notes
			),
			revised_first_patch_decision = case_when(
				source_site == "Pattern override support HOC" ~ "do first",
				source_site == "HeadingEdit anchor useSelect" ~ "do after deciding on a shared capability signal",
				source_site == "BlockListBlockProvider useSelect" ~ "second local prototype",
				source_site == "useInnerBlocksProps useSelect" ~ "second local prototype",
				source_site == "BlockListItems useSelect" ~ "validation prototype only",
				TRUE ~ "defer"
			),
			conservative_source_audited_skippable_ms = case_when(
				source_site == "Pattern override support HOC" ~ candidate_duration_p50_ms * pmax(candidate_listener_count_p50 - 1, 0) / candidate_listener_count_p50,
				source_site == "HeadingEdit anchor useSelect" ~ 0,
				source_site == "BlockListItems useSelect" ~ 0,
				TRUE ~ estimated_skippable_duration_p50_ms
			),
			after_source_audit_conservative_calls = case_when(
				source_site == "Pattern override support HOC" ~ 1,
				source_site %in% c("HeadingEdit anchor useSelect", "BlockListItems useSelect") ~ candidate_listener_count_p50,
				TRUE ~ candidate_listener_count_p50 - estimated_skippable_listener_count_p50
			),
			source_paths = case_when(
				source_site == "Pattern override support HOC" ~ "packages/editor/src/hooks/pattern-overrides.js:37-59",
				source_site == "HeadingEdit anchor useSelect" ~ "packages/block-library/src/heading/edit.js:35-43,49-80",
				source_site == "BlockListBlockProvider useSelect" ~ "packages/block-editor/src/components/block-list/block.js:560-620",
				source_site == "useInnerBlocksProps useSelect" ~ "packages/block-editor/src/components/inner-blocks/index.js:195",
				source_site == "BlockListItems useSelect" ~ "packages/block-editor/src/components/block-list/index.js:196",
				TRUE ~ NA_character_
			),
			test_gap = case_when(
				source_site == "Pattern override support HOC" ~ "Focused HOC unit tests now cover unselected, selected-supported, selected-unsupported, selection transition, selected settings changes, and unsynced reset behavior; post-patch source-span microscope confirms selected-block-scale mount count.",
				source_site == "HeadingEdit anchor useSelect" ~ "Only native heading tests are present locally; add web tests for generateAnchors and table-of-contents insertion/removal before refactoring.",
				source_site == "BlockListBlockProvider useSelect" ~ required_behavior_checks,
				source_site == "useInnerBlocksProps useSelect" ~ required_behavior_checks,
				source_site == "BlockListItems useSelect" ~ required_behavior_checks,
				TRUE ~ required_behavior_checks
			),
			implementation_candidate = factor(
				implementation_candidate,
				levels = c(
					"selected-only pattern override support check",
					"shared heading-anchor capability signal",
					"clientId-scoped text-attribute guard",
					"root/order/settings structural guard",
					"structural/selection-version guard"
				)
			),
			source_feasibility = factor(
				source_feasibility,
				levels = c(
					"clear local split",
					"needs shared/global signal",
					"needs invalidation prototype",
					"validate before counting"
				)
			)
		) %>%
		arrange(feasibility_score, desc(conservative_source_audited_skippable_ms))

	write_csv(
		selector_guard_source_feasibility,
		file.path(data_dir, "typing-delay-selector-guard-source-feasibility.csv")
	)

	selector_guard_source_feasibility_summary <- selector_guard_source_feasibility %>%
		summarize(
			clear_local_split_skippable_ms = sum(conservative_source_audited_skippable_ms[source_feasibility == "clear local split"], na.rm = TRUE),
			needs_shared_signal_current_ms = sum(candidate_duration_p50_ms[source_feasibility == "needs shared/global signal"], na.rm = TRUE),
			needs_invalidation_prototype_skippable_ms = sum(conservative_source_audited_skippable_ms[source_feasibility == "needs invalidation prototype"], na.rm = TRUE),
			validate_before_counting_current_ms = sum(candidate_duration_p50_ms[source_feasibility == "validate before counting"], na.rm = TRUE),
			source_audited_conservative_skippable_ms = sum(conservative_source_audited_skippable_ms, na.rm = TRUE),
			share_of_prior_conservative_skippable_pct = 100 * source_audited_conservative_skippable_ms / audited_conservative_skippable_p50_ms,
			.groups = "drop"
		)

	write_csv(
		selector_guard_source_feasibility_summary,
		file.path(data_dir, "typing-delay-selector-guard-source-feasibility-summary.csv")
	)

	selector_guard_source_feasibility_plot <- selector_guard_source_feasibility %>%
		mutate(
			plot_label = case_when(
				source_site == "Pattern override support HOC" ~ "pattern selected-only split",
				source_site == "HeadingEdit anchor useSelect" ~ "heading shared signal",
				source_site == "BlockListBlockProvider useSelect" ~ "block provider",
				source_site == "useInnerBlocksProps useSelect" ~ "inner blocks",
				source_site == "BlockListItems useSelect" ~ "BlockListItems",
				TRUE ~ as.character(implementation_candidate)
			),
			label_x = case_when(
				source_site == "HeadingEdit anchor useSelect" ~ candidate_duration_p50_ms + 0.45,
				source_site == "BlockListItems useSelect" ~ candidate_duration_p50_ms - 0.18,
				source_site == "Pattern override support HOC" ~ candidate_duration_p50_ms - 0.35,
				source_site == "BlockListBlockProvider useSelect" ~ candidate_duration_p50_ms - 0.18,
				TRUE ~ candidate_duration_p50_ms
			),
			label_y = conservative_source_audited_skippable_ms + case_when(
				source_site == "Pattern override support HOC" ~ 0.45,
				source_site == "HeadingEdit anchor useSelect" ~ 0.42,
				source_site == "BlockListItems useSelect" ~ 0.42,
				source_site == "BlockListBlockProvider useSelect" ~ -0.42,
				TRUE ~ 0.42
			)
		)

	save_plot(
		ggplot(
			selector_guard_source_feasibility_plot,
			aes(
				candidate_duration_p50_ms,
				conservative_source_audited_skippable_ms,
				color = source_feasibility,
				shape = revised_first_patch_decision,
				size = candidate_listener_count_p50
			)
		) +
			geom_abline(linetype = "dashed", linewidth = 0.35, color = "grey55") +
			geom_point(alpha = 0.92) +
			geom_text(
				aes(x = label_x, y = label_y, label = plot_label),
				size = 3.1,
				color = "grey20",
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Source feasibility") +
			scale_size_area(max_size = 8, labels = label_number(), name = "p50 listener calls") +
			scale_x_continuous(labels = label_number(suffix = "ms"), expand = expansion(mult = c(0.08, 0.1))) +
			scale_y_continuous(labels = label_number(suffix = "ms")) +
			labs(
				title = "Source audit leaves one clear first selector guard",
				subtitle = "Pattern overrides can be split by selected block; heading anchor needs a shared/global signal before counting a win",
				x = "Current audited p50 exposure",
				y = "Source-audited conservative skippable p50",
				shape = "Revised decision"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"139-selector-guard-source-feasibility.png",
		width = 12,
		height = 7.4
	)

	selector_guard_current_action_stack <- selector_guard_source_feasibility %>%
		mutate(
			action_order = case_when(
				source_site == "Pattern override support HOC" ~ 1,
				source_site == "BlockListBlockProvider useSelect" ~ 2,
				source_site == "useInnerBlocksProps useSelect" ~ 3,
				source_site == "HeadingEdit anchor useSelect" ~ 4,
				source_site == "BlockListItems useSelect" ~ 5,
				TRUE ~ 99
			),
			action_label = case_when(
				source_site == "Pattern override support HOC" ~ "1. pattern override selected-only split",
				source_site == "BlockListBlockProvider useSelect" ~ "2. non-edited block provider guard",
				source_site == "useInnerBlocksProps useSelect" ~ "3. inner-blocks structural guard",
				source_site == "HeadingEdit anchor useSelect" ~ "4. heading shared capability signal",
				source_site == "BlockListItems useSelect" ~ "5. BlockListItems validation prototype",
				TRUE ~ as.character(source_site)
			),
			action_status = case_when(
				source_site == "Pattern override support HOC" ~ "source-span confirmed",
				source_site %in% c("BlockListBlockProvider useSelect", "useInnerBlocksProps useSelect") ~ "prototype local invalidation",
				source_site == "HeadingEdit anchor useSelect" ~ "needs shared signal",
				source_site == "BlockListItems useSelect" ~ "validate before counting",
				TRUE ~ "defer"
			),
			source_counted_skippable_ms = conservative_source_audited_skippable_ms,
			not_yet_counted_ms = pmax(candidate_duration_p50_ms - source_counted_skippable_ms, 0),
			current_scope_ms = candidate_duration_p50_ms
		) %>%
		arrange(action_order) %>%
		mutate(
			cumulative_source_counted_skippable_ms = cumsum(source_counted_skippable_ms),
			cumulative_possible_after_validation_ms = cumulative_source_counted_skippable_ms + cumsum(not_yet_counted_ms),
			action_status = factor(
				action_status,
				levels = c(
					"source-span confirmed",
					"prototype local invalidation",
					"needs shared signal",
					"validate before counting",
					"defer"
				)
			),
			action_label = factor(action_label, levels = rev(action_label))
		) %>%
		select(
			action_order,
			action_label,
			source_site,
			action_status,
			source_feasibility,
			current_scope_ms,
			source_counted_skippable_ms,
			not_yet_counted_ms,
			candidate_listener_count_p50,
			after_source_audit_conservative_calls,
			cumulative_source_counted_skippable_ms,
			cumulative_possible_after_validation_ms,
			revised_first_patch_decision,
			source_finding,
			test_gap
		)

	write_csv(
		selector_guard_current_action_stack,
		file.path(data_dir, "typing-delay-selector-guard-current-action-stack.csv")
	)

	selector_guard_current_action_plot <- selector_guard_current_action_stack %>%
		pivot_longer(
			cols = c(source_counted_skippable_ms, not_yet_counted_ms),
			names_to = "scope_component",
			values_to = "component_ms"
		) %>%
		filter(component_ms > 0) %>%
		mutate(
			scope_component = recode(
				scope_component,
				source_counted_skippable_ms = "source-feasible counted",
				not_yet_counted_ms = "not counted yet"
			),
			scope_component = factor(
				scope_component,
				levels = c("source-feasible counted", "not counted yet")
			)
		)

	selector_guard_current_action_labels <- selector_guard_current_action_stack %>%
		mutate(
			label_x = current_scope_ms + 0.16,
			label = case_when(
				source_counted_skippable_ms > 0 ~ paste0(number(source_counted_skippable_ms, accuracy = 0.1), "ms counted"),
				TRUE ~ paste0(number(current_scope_ms, accuracy = 0.1), "ms not counted")
			)
		)

	save_plot(
		ggplot(
			selector_guard_current_action_plot,
			aes(component_ms, action_label, fill = scope_component)
		) +
			geom_col(width = 0.64, alpha = 0.92) +
			geom_text(
				data = selector_guard_current_action_labels,
				aes(label_x, action_label, label = label),
				inherit.aes = FALSE,
				hjust = 0,
				size = 3.1,
				color = "grey20"
			) +
			scale_fill_brewer(type = "qual", palette = "Set2", name = "Current status") +
			scale_x_continuous(
				labels = label_number(suffix = "ms"),
				expand = expansion(mult = c(0, 0.2))
			) +
			labs(
				title = "Current selector-guard action stack after source feasibility",
				subtitle = "Heading and BlockListItems stay uncounted until a shared signal or validation prototype exists",
				x = "Current audited p50 scope",
				y = NULL
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"149-selector-guard-current-action-stack.png",
		width = 12.2,
		height = 6.8
	)

	redux_owner_other_breakdown <- redux_listener_owner_source_summary %>%
		anti_join(
			redux_owner_source_audit_sites,
			by = c("source_path", "source_line")
		) %>%
		mutate(
			source_label = paste0(source_path, ":", source_line),
			other_owner_bucket = case_when(
				source_path %in% c(
					"packages/block-editor/src/hooks/layout.js",
					"packages/block-editor/src/components/use-settings/index.js",
					"packages/editor/src/components/provider/use-block-editor-settings.js",
					"packages/block-editor/src/components/use-block-display-information/index.js",
					"packages/block-editor/src/hooks/block-bindings.js",
					"packages/block-editor/src/components/block-alignment-control/use-available-alignments.js",
					"packages/block-editor/src/hooks/block-hooks.js"
				) ~ "settings / block support",
				str_detect(source_path, "media|image") ~ "media / image settings",
				str_detect(source_path, "color|background|typography|dimensions|custom-css|block-title|block-card|block-visibility|block-variation") ~ "block-attribute style hooks",
				str_detect(source_path, "selection|writing-flow|block-tools|typewriter|block-breadcrumb|inspector|sidebar|collab|document-bar|header|post-title|preview-dropdown|layout/index|visual-editor|start-page|iframe|editor-styles|skip-to-selected") ~ "selection / editor chrome",
				str_detect(source_path, "block-directory|footnotes") ~ "block directory / global count",
				TRUE ~ "other singleton"
			),
			text_update_relevance = case_when(
				other_owner_bucket == "settings / block support" ~ "probably skippable settings",
				other_owner_bucket == "media / image settings" ~ "probably skippable settings",
				other_owner_bucket == "block directory / global count" ~ "probably unchanged global",
				other_owner_bucket == "block-attribute style hooks" ~ "possibly relevant singleton",
				other_owner_bucket == "selection / editor chrome" ~ "selection/chrome validation",
				TRUE ~ "unknown singleton"
			),
			optimization_note = case_when(
				other_owner_bucket == "settings / block support" ~ "Reads settings, block support, block name, or block settings; ordinary paragraph text should not change most returned values.",
				other_owner_bucket == "media / image settings" ~ "Mostly media/image capability and settings checks; not a typing-specific path.",
				other_owner_bucket == "block directory / global count" ~ "Global block-directory or block-type count checks; ordinary typing should not change counts.",
				other_owner_bucket == "block-attribute style hooks" ~ "Some rows read block attributes, but they are singleton/p50-zero in this trace and are not another high-fanout text path.",
				other_owner_bucket == "selection / editor chrome" ~ "Selection, editor chrome, iframe, sidebar, or layout UI selectors; validate behavior before skipping.",
				TRUE ~ "Long-tail singleton; leave out of the first optimization pass."
			)
		) %>%
		select(
			source_path,
			source_line,
			source_label,
			source_name,
			other_owner_bucket,
			text_update_relevance,
			listener_duration_p50_ms,
			listener_duration_p90_ms,
			listener_duration_sum_ms,
			listener_count_p50,
			use_select_instances_max,
			optimization_note,
			source_snippet
		) %>%
		arrange(desc(listener_duration_p50_ms), desc(listener_count_p50), source_label)

	write_csv(
		redux_owner_other_breakdown,
		file.path(data_dir, "typing-delay-redux-listener-other-owner-breakdown.csv")
	)

	redux_owner_other_bucket_summary <- redux_owner_other_breakdown %>%
		group_by(other_owner_bucket, text_update_relevance, optimization_note) %>%
		summarize(
			listener_duration_p50_sum_ms = sum(listener_duration_p50_ms, na.rm = TRUE),
			listener_duration_p90_sum_ms = sum(listener_duration_p90_ms, na.rm = TRUE),
			listener_count_p50_sum = sum(listener_count_p50, na.rm = TRUE),
			source_sites = n(),
			nonzero_p50_sites = sum(listener_duration_p50_ms > 0, na.rm = TRUE),
			.groups = "drop"
		) %>%
		arrange(desc(listener_duration_p50_sum_ms), desc(listener_count_p50_sum))

	write_csv(
		redux_owner_other_bucket_summary,
		file.path(data_dir, "typing-delay-redux-listener-other-owner-bucket-summary.csv")
	)

	save_plot(
		ggplot(
			redux_owner_other_bucket_summary %>%
				mutate(
					other_owner_bucket = fct_reorder(other_owner_bucket, listener_duration_p50_sum_ms)
				),
			aes(listener_duration_p50_sum_ms, other_owner_bucket, fill = text_update_relevance)
		) +
			geom_col(width = 0.68, alpha = 0.92) +
			geom_text(
				aes(label = paste0(source_sites, " sites / ", label_number()(listener_count_p50_sum), " calls")),
				hjust = -0.05,
				size = 3.2
			) +
			scale_fill_brewer(type = "qual", palette = "Set2", name = "Text-update relevance") +
			scale_x_continuous(expand = expansion(mult = c(0, 0.22))) +
			labs(
				title = "The residual mapped listener bucket is a small mixed tail",
				subtitle = "Breakdown of the 62 source-mapped owners outside the top audited marker-window sites",
				x = "Redux listener duration, p50 sum (ms)",
				y = NULL
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"125-redux-listener-other-owner-breakdown.png",
		width = 12.5,
		height = 6.8
	)
}

marker_allspan_action_summary_path <- file.path(data_dir, "typing-delay-marker-allspan-action-summary.csv")

if (file.exists(marker_allspan_action_summary_path)) {
	marker_state_fanout_summary <- read_csv(marker_allspan_action_summary_path, show_col_types = FALSE) %>%
		filter(
			(
				intervention == "normal marker" &
					action_name == "__unstableMarkLastChangeAsPersistent"
			) |
				(
					intervention == "raw unknown action" &
						action_name == "__unstableMarkLastChangeAsPersistent"
				) |
				(
					intervention == "mark next not persistent" &
						action_name %in% c(
							"__unstableMarkNextChangeAsNotPersistent",
							"__unstableMarkLastChangeAsPersistent"
						)
				)
		) %>%
		mutate(
			state_effect = case_when(
				intervention == "normal marker" ~ "root changes: blocks.isPersistentChange",
				intervention == "raw unknown action" ~ "root unchanged: unknown action ignored",
				intervention == "mark next not persistent" & action_name == "__unstableMarkNextChangeAsNotPersistent" ~ "root unchanged: closure flag only",
				intervention == "mark next not persistent" ~ "root unchanged: persistence already neutralized",
				TRUE ~ "other"
			),
			reads_changed_branch = "no audited hot owner reads blocks.isPersistentChange",
			action_label = case_when(
				intervention == "normal marker" ~ "normal marker",
				intervention == "raw unknown action" ~ "raw unknown action",
				action_name == "__unstableMarkNextChangeAsNotPersistent" ~ "mark-next action",
				TRUE ~ "later marker after mark-next"
			),
			action_label = factor(
				action_label,
				levels = rev(c(
					"normal marker",
					"raw unknown action",
					"mark-next action",
					"later marker after mark-next"
				))
			)
		) %>%
		transmute(
			action_label,
			intervention,
			action_name,
			state_effect,
			reads_changed_branch,
			action_duration_p50_ms,
			root_subscribe_duration_p50_ms,
			redux_listener_count_p50,
			use_select_on_change_count_p50,
			use_select_on_store_change_count_p50,
			use_select_react_listener_count_p50,
			use_select_map_select_count_p50
		)

	write_csv(
		marker_state_fanout_summary,
		file.path(data_dir, "typing-delay-marker-state-fanout-summary.csv")
	)

	marker_state_fanout_plot <- marker_state_fanout_summary %>%
		pivot_longer(
			cols = c(
				redux_listener_count_p50,
				use_select_on_change_count_p50,
				use_select_on_store_change_count_p50,
				use_select_map_select_count_p50
			),
			names_to = "metric",
			values_to = "count_p50"
		) %>%
		mutate(
			metric = recode(
				metric,
				redux_listener_count_p50 = "Redux listener wrappers",
				use_select_on_change_count_p50 = "useSelect.onChange",
				use_select_on_store_change_count_p50 = "useSelect.onStoreChange",
				use_select_map_select_count_p50 = "useSelect.mapSelect"
			),
			metric = factor(
				metric,
				levels = rev(c(
					"Redux listener wrappers",
					"useSelect.onChange",
					"useSelect.onStoreChange",
					"useSelect.mapSelect"
				))
			),
			state_effect_plot = recode(
				state_effect,
				`root changes: blocks.isPersistentChange` = "root changes",
				`root unchanged: unknown action ignored` = "root unchanged",
				`root unchanged: closure flag only` = "closure flag only",
				`root unchanged: persistence already neutralized` = "already neutralized"
			)
		)

	save_plot(
		ggplot(marker_state_fanout_plot, aes(count_p50, metric, color = state_effect_plot, shape = state_effect_plot)) +
			geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.45)) +
			facet_wrap(vars(action_label), ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Set2") +
			scale_shape_manual(values = c(16, 17, 15, 18), drop = FALSE) +
			labs(
				title = "One persistence-flag state change wakes thousands of unrelated subscribers",
				subtitle = "Marker-window action summaries from the trace-all-data-spans run; controls with unchanged store root wake zero listeners",
				x = "p50 callback count",
				y = NULL,
				color = "State effect",
				shape = "State effect"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"117-marker-state-fanout-summary.png",
		width = 11,
		height = 8
	)

	current_marker_root_subscribe_p50_ms <- marker_state_fanout_summary %>%
		filter(intervention == "normal marker") %>%
		pull(root_subscribe_duration_p50_ms) %>%
		first()
	current_marker_redux_listener_count_p50 <- marker_state_fanout_summary %>%
		filter(intervention == "normal marker") %>%
		pull(redux_listener_count_p50) %>%
		first()
	current_marker_use_select_count_p50 <- marker_state_fanout_summary %>%
		filter(intervention == "normal marker") %>%
		pull(use_select_on_change_count_p50) %>%
		first()

	estimated_local_guard_ms <- if (exists("redux_owner_guard_candidates")) {
		redux_owner_guard_candidates %>%
			filter(source_site == "(audited marker fanout total)") %>%
			pull(estimated_skippable_duration_p50_ms) %>%
			first()
	} else {
		NA_real_
	}
	source_feasible_local_guard_ms <- if (exists("selector_guard_source_feasibility_summary")) {
		selector_guard_source_feasibility_summary %>%
			pull(source_audited_conservative_skippable_ms) %>%
			first()
	} else {
		estimated_local_guard_ms
	}
	source_feasible_local_guard_count <- if (exists("selector_guard_source_feasibility")) {
		selector_guard_source_feasibility %>%
			summarize(
				count = sum(
					pmax(candidate_listener_count_p50 - after_source_audit_conservative_calls, 0),
					na.rm = TRUE
				),
				.groups = "drop"
			) %>%
			pull(count)
	} else {
		3655
	}

	store_invalidation_contract <- tribble(
		~design_option, ~design_family, ~preserves_persistence_semantics, ~avoids_ordinary_use_select_fanout, ~prototype_risk, ~prototype_order, ~estimated_scope_ms, ~estimated_scope_listener_count, ~source_evidence, ~design_note,
		"Silence MARK_LAST_CHANGE_AS_PERSISTENT", "do not do this", "no", "yes", "invalid", "reject", current_marker_root_subscribe_p50_ms, current_marker_redux_listener_count_p50, "The marker currently wakes thousands of listeners, but useBlockSync reads isLastBlockChangePersistent() and uses the persistence transition to choose onChange vs onInput.", "This would make the benchmark fast by dropping a semantic signal the editor uses.",
		"Local selector guards only", "local guard", "yes", "partial", "low-medium", "first local prototype", source_feasible_local_guard_ms, source_feasible_local_guard_count, "Hot audited useSelect owners mostly read settings, block identity, tree, or selection state, not text content or isPersistentChange; source feasibility removes the heading row until it has a shared signal.", "Good first patch class, but it does not fix the store-level wakeup contract.",
		"Persistence-aware side channel for useBlockSync", "subscriber partition", "yes", "yes for persistence-only markers", "medium-high", "store-boundary prototype", current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "The only observed production consumer of the marker transition in this path is useBlockSync; audited hot useSelect owners do not read blocks.isPersistentChange.", "Notify persistence-aware subscribers without invalidating ordinary block-editor useSelect subscribers.",
		"Split persistence state from core/block-editor", "store partition", "yes if public selector compatibility is addressed", "yes for persistence-only markers", "high", "after side-channel prototype", current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "The changed branch is only blocks.isPersistentChange, but isLastBlockChangePersistent is a documented public selector.", "Could keep isLastBlockChangePersistent as a wrapper while storing/versioning persistence separately, but public useSelect consumers need a notification answer.",
		"Branch-aware useSelect subscriptions", "branch-aware notification", "yes", "yes if dependencies are correct", "very high", "research prototype", current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "useSelect currently records active store names, not selector or state-branch dependencies; any root change invalidates the store subscriber.", "Most general design, but it changes the data subscription contract and needs broad compatibility tests.",
		"ClientId-scoped text-attribute invalidation", "text-update partition", "yes", "partial for text updates", "medium-high", "second local prototype", 3.4975648467210574, 1436, "Only the edited BlockListBlockProvider needs the changed paragraph attributes; other block instances are checking identity/selection/tree state.", "Targets ordinary text updates rather than the persistence-only marker."
	) %>%
		mutate(
			prototype_risk = factor(
				prototype_risk,
				levels = c("low-medium", "medium-high", "high", "very high", "invalid")
			),
			prototype_order = factor(
				prototype_order,
				levels = c(
					"first local prototype",
					"second local prototype",
					"store-boundary prototype",
					"after side-channel prototype",
					"research prototype",
					"reject"
				)
			),
			design_family = factor(
				design_family,
				levels = c(
					"local guard",
					"text-update partition",
					"subscriber partition",
					"store partition",
					"branch-aware notification",
					"do not do this"
				)
			)
		) %>%
		arrange(prototype_order)

	write_csv(
		store_invalidation_contract,
		file.path(data_dir, "typing-delay-store-invalidation-contract-candidates.csv")
	)

	store_invalidation_plot <- store_invalidation_contract %>%
		mutate(
			design_option = fct_reorder(design_option, estimated_scope_ms),
			plot_scope_ms = if_else(is.na(estimated_scope_ms), 0, estimated_scope_ms)
		)

	save_plot(
		ggplot(
			store_invalidation_plot,
			aes(plot_scope_ms, design_option, color = prototype_risk, shape = prototype_order, size = estimated_scope_listener_count)
		) +
			geom_point(alpha = 0.9) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Risk") +
			scale_size_area(max_size = 8, labels = label_number(), name = "Affected listener count") +
			labs(
				title = "Store-boundary fixes need to preserve the persistence signal",
				subtitle = "Scope is current marker root-subscribe p50 for store-boundary designs and audited skippable p50 for local guards",
				x = "Current p50 fanout scope / audited skippable scope (ms)",
				y = NULL,
				shape = "Suggested order"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"128-store-invalidation-contract-candidates.png",
		width = 12.5,
		height = 7.3
	)

	store_boundary_source_feasibility <- tribble(
		~design_option, ~source_feasibility, ~contract_surface_score, ~current_scope_ms, ~listener_scope, ~source_finding, ~compatibility_risk, ~revised_recommendation,
		"Source-feasible local selector guards", "source-feasible local work", 1, source_feasible_local_guard_ms, source_feasible_local_guard_count, "Pattern override can be split by selected block; block-provider and inner-blocks guards need local invalidation prototypes; no data subscription contract change.", "Local stale UI risk only; covered by component behavior tests.", "Do before store-boundary work.",
		"Persistence-aware useBlockSync side channel", "possible but contract-sensitive", 3, current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "useBlockSync is a store-specific block-editor subscriber, so it can be migrated to an explicit persistence-aware path more locally than a global-registry subscriber could.", "Needs a new persistence-aware subscription path or explicit useBlockSync registration; the side channel can preserve useBlockSync, but not public isLastBlockChangePersistent useSelect consumers by itself.", "Research after local guards; prototype the side channel before changing public notification semantics.",
		"Split persistence state out of block-editor root", "blocked without side channel", 5, current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "Moving the flag avoids the block-editor root change only if selector and notification semantics are replaced.", "isLastBlockChangePersistent is documented as a public selector; external useSelect consumers can observe stale state or miss the transition unless compatibility is explicitly handled.", "Do only after a side-channel design and public-selector compatibility decision.",
		"Branch-aware useSelect dependencies", "research only", 6, current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "useSelect records store names, not selector names, state branches, or dynamic selector dependencies.", "Broad data contract change; selectors can read conditionally and across stores.", "Treat as a separate data-layer research project.",
		"Silence MARK_LAST_CHANGE_AS_PERSISTENT", "invalid", 7, current_marker_root_subscribe_p50_ms, current_marker_redux_listener_count_p50, "This removes the persistence transition that useBlockSync uses to convert a previous transient edit into parent onChange.", "Breaks editor semantics to make the benchmark faster.", "Reject."
	) %>%
		mutate(
			source_feasibility = factor(
				source_feasibility,
				levels = c(
					"source-feasible local work",
					"possible but contract-sensitive",
					"blocked without side channel",
					"research only",
					"invalid"
				)
			),
			design_option = factor(
				design_option,
				levels = c(
					"Source-feasible local selector guards",
					"Persistence-aware useBlockSync side channel",
					"Split persistence state out of block-editor root",
					"Branch-aware useSelect dependencies",
					"Silence MARK_LAST_CHANGE_AS_PERSISTENT"
				)
			)
		)

	write_csv(
		store_boundary_source_feasibility,
		file.path(data_dir, "typing-delay-store-boundary-source-feasibility.csv")
	)

	store_boundary_source_feasibility_summary <- store_boundary_source_feasibility %>%
		summarize(
			source_feasible_local_guard_ms = current_scope_ms[design_option == "Source-feasible local selector guards"],
			source_feasible_local_guard_listener_scope = listener_scope[design_option == "Source-feasible local selector guards"],
			persistence_marker_root_scope_ms = current_marker_root_subscribe_p50_ms,
			persistence_marker_use_select_scope = current_marker_use_select_count_p50,
			local_guard_share_of_marker_root_scope_pct = 100 * source_feasible_local_guard_ms / persistence_marker_root_scope_ms,
			.groups = "drop"
		)

		write_csv(
			store_boundary_source_feasibility_summary,
			file.path(data_dir, "typing-delay-store-boundary-source-feasibility-summary.csv")
		)

		store_boundary_contract_risk_audit <- tribble(
			~contract_surface, ~source_reference, ~current_behavior, ~current_scope_ms, ~compatibility_risk_level, ~deeper_conclusion, ~prototype_implication,
			"Persistent-change reducer branch",
			"packages/block-editor/src/store/reducer.js:421-470",
			"MARK_LAST_CHANGE_AS_PERSISTENT changes blocks.isPersistentChange and therefore changes the block-editor root state.",
			current_marker_root_subscribe_p50_ms,
			"low",
			"The measured fanout is a real store-root invalidation, not timer-slot overhead.",
			"Do not try to tune the marker timer; change the notification boundary or local subscribers.",
			"useBlockSync subscription",
			"packages/block-editor/src/components/provider/use-block-sync.js:351-532",
			"useBlockSync subscribes to the block-editor store, reads isLastBlockChangePersistent(), and turns a previous transient edit into parent onChange when persistence flips true without a block-array identity change.",
			current_marker_root_subscribe_p50_ms,
			"medium",
			"The side-channel target is narrower than previously stated: useBlockSync is not a no-store global registry subscriber, so an explicit persistence-aware store path can cover the known in-tree semantic consumer.",
			"Prototype a private persistence-change subscription for useBlockSync while keeping the existing root notification at first to validate behavior.",
			"Documented public selector",
			"docs/reference-guides/data/data-core-block-editor.md:1135-1145; packages/block-editor/src/store/selectors.js:2895-2896",
			"isLastBlockChangePersistent is documented and exported from the public block-editor store selector surface.",
			current_marker_root_subscribe_p50_ms,
			"high",
			"Moving persistence out of the block-editor root can keep the selector return value correct but would make existing public useSelect consumers miss updates unless a compatibility notification remains.",
			"Do not split the state branch for performance until the public-selector compatibility policy is explicit.",
			"useSelect subscription model",
			"packages/data/src/components/use-select/index.ts:132-235",
			"useSelect tracks active store names and invalidates the cached selected value on any subscribed store change; it does not record selector names or state branches.",
			current_marker_root_subscribe_p50_ms,
			"high",
			"Ordinary useSelect subscribers cannot opt out of persistence-only root changes without a broader branch-aware subscription contract.",
			"Keep branch-aware useSelect as data-layer research, not the near-term benchmark patch.",
			"Redux store listener fanout",
			"packages/data/src/redux-store/index.ts:526-564",
			"The wrapped Redux store calls every registered listener whenever the root state identity changes.",
			current_marker_root_subscribe_p50_ms,
			"medium-high",
			"A branch-specific emitter would need to coexist with the public root listener set; replacing the root listener set would be a broad data contract change.",
			"Prefer a narrow persistence side channel over changing createReduxStore subscription semantics first.",
			"Direct in-tree selector consumers",
			"rg isLastBlockChangePersistent() in packages/",
			"The only production in-tree direct consumer found is useBlockSync; benchmark instrumentation also reads it.",
			current_marker_root_subscribe_p50_ms,
			"medium",
			"In-tree migration looks manageable, but public API exposure keeps the compatibility question open.",
			"Use in-tree consumer count to scope the prototype, not to claim the public contract is safe to change."
		) %>%
			mutate(
				compatibility_risk_level = factor(
					compatibility_risk_level,
					levels = c("low", "medium", "medium-high", "high")
				)
			)

		write_csv(
			store_boundary_contract_risk_audit,
			file.path(data_dir, "typing-delay-store-boundary-contract-risk-audit.csv")
		)

		store_boundary_side_channel_decision_audit <- tribble(
			~proposal, ~source_fact, ~what_it_solves, ~what_it_does_not_solve, ~required_validation, ~decision,
			"Add a private persistence-change side channel while keeping the root state update",
			"useBlockSync currently subscribes to the block-editor store with registry.subscribe( listener, blockEditorStore ) and reads isLastBlockChangePersistent().",
			"Creates a migration seam for the known in-tree semantic consumer and lets tests prove that the onInput to onChange handoff still works.",
			"Does not reduce ordinary useSelect fanout because MARK_LAST_CHANGE_AS_PERSISTENT still changes blocks.isPersistentChange and therefore the block-editor root state.",
			"useBlockSync tests for non-persistent onInput, persistent onChange, persistence flip after a previous block change with no block-array identity change, selection reporting, controlled inner blocks, fresh callbacks, and unmount cleanup.",
			"Useful prototype seam, not a performance win by itself.",
			"Move useBlockSync to the side channel and stop changing the block-editor root for persistence-only markers",
			"The hot marker action changes only blocks.isPersistentChange; audited hot selectors do not read that branch.",
			"Would preserve the known in-tree useBlockSync path and avoid waking thousands of ordinary block-editor useSelect subscribers for persistence-only markers.",
			"Breaks public subscription semantics for isLastBlockChangePersistent consumers because useSelect and registry.subscribe are store-level, not selector-level.",
			"Compatibility decision for public selector consumers; benchmark showing marker-only rootSubscribe/useSelect listener counts fall while useBlockSync still emits the same onChange/onInput sequence.",
			"Blocked for a production performance change until the public selector contract is resolved.",
			"Keep the selector value correct from an external persistence slot",
			"The public selector is currently a pure state selector returning state.blocks.isPersistentChange.",
			"Could make imperative select( blockEditorStore ).isLastBlockChangePersistent() return the latest value if the selector reads a separate slot.",
			"Would not notify existing useSelect or store subscribers when only that external slot changes, and would weaken the state-selector contract.",
			"Data-layer review before considering this; tests for direct select are not enough.",
			"Do not use as the compatibility answer.",
			"Add selector-aware or branch-aware subscriptions to @wordpress/data",
			"useSelect records active store names and invalidates on any subscribed store change; the Redux wrapper calls every listener on root identity change.",
			"Could preserve public isLastBlockChangePersistent useSelect notifications while letting unrelated block-editor selectors skip persistence-only changes.",
			"Broad data-layer contract change with dynamic selector dependencies, cross-store reads, conditional selectors, and plugin compatibility risk.",
			"Separate data-layer research prototype with selector dependency tests before applying to block-editor persistence.",
			"Only complete compatibility route found, but not a near-term typing benchmark patch.",
			"Do local selector guards before store partitioning",
			"Pattern override has a clear selected-only split; provider and inner-blocks have local invalidation prototypes; none changes public data subscription semantics.",
			"Reduces a source-feasible local envelope before taking on store-level compatibility risk.",
			"Does not remove the full persistence-marker fanout.",
			"Patch and measure pattern override first, then validate provider and inner-block invalidation keys.",
			"Recommended near-term order."
		)

		write_csv(
			store_boundary_side_channel_decision_audit,
			file.path(data_dir, "typing-delay-store-boundary-side-channel-decision-audit.csv")
		)

			public_selector_notification_contract_audit <- tribble(
				~contract_question, ~current_answer, ~source_evidence, ~why_private_side_channel_is_not_enough, ~required_compatibility_contract, ~decision,
			"What is the exact public compatibility blocker?",
			"Public notification semantics for isLastBlockChangePersistent(), not the in-tree useBlockSync consumer.",
			"isLastBlockChangePersistent() is documented as a core/block-editor selector and currently returns state.blocks.isPersistentChange; useSelect subscribes by store name and invalidates on any subscribed store change.",
			"A private persistence side channel can keep useBlockSync correct, but if MARK_LAST_CHANGE_AS_PERSISTENT stops changing the block-editor root, existing public useSelect consumers of isLastBlockChangePersistent() will not be notified.",
			"Either keep root notification, introduce selector/branch-aware public notifications, or explicitly change/deprecate the public notification contract with compatibility tests.",
			"public selector contract blocks performance win",
			"Can useBlockSync be migrated safely by itself?",
			"Probably yes as a behavior-preserving migration seam.",
			"useBlockSync is the only production in-tree direct consumer found by source search, and it already reads isLastBlockChangePersistent() from a store-specific registry subscription.",
			"The migration preserves the known in-tree semantic consumer but does not remove fanout unless the root state stops changing afterward.",
			"Prototype a private persistence-change subscription while still changing the root state; tests must cover onInput/onChange handoff, persistence flip after a previous block change, selection payloads, controlled inner blocks, fresh callbacks, and cleanup.",
			"side channel is a seam",
			"Can an external persistence slot preserve the selector?",
			"Only for imperative reads, not subscribed public reads.",
			"The selector could be rewritten to return an external slot, but current useSelect listeners are notified by store changes, not by selector-specific invalidation.",
			"Existing useSelect or registry.subscribe consumers would miss a persistence-only transition if the block-editor root remains unchanged.",
			"Do not treat direct select() correctness as compatibility; subscribed useSelect/registry consumers need an explicit notification answer.",
			"direct reads are insufficient",
			"Can @wordpress/data currently notify only this selector?",
			"No.",
			"useSelect records active store names from registry.__unstableMarkListeningStores() and calls registry.subscribe(onChange, storeName); the Redux wrapper calls all listeners on root identity changes.",
			"There is no selector name, branch path, or dependency key available to notify isLastBlockChangePersistent() consumers while skipping unrelated block-editor selectors.",
			"A complete compatibility route requires selector-aware or branch-aware subscriptions, with tests for dynamic selector dependencies, conditional reads, cross-store reads, and plugin compatibility.",
			"data-layer research required",
			"What is the near-term product order?",
			"Local selector guards first, then side-channel seam, then public notification design.",
			"The source-feasible local guard envelope is about 8.2ms and does not change public data subscription semantics; the full marker fanout is about 23.2ms but is blocked by public notifications.",
			"Going straight to store partitioning risks breaking public subscribers for a benchmark win that local guards can partially address first.",
			"Patch and measure pattern override first; prototype non-edited block-provider and inner-block invalidation next; use the side channel only after those prove the source-level shape.",
				"local guards remain first"
			)

			write_csv(
				public_selector_notification_contract_audit,
				file.path(data_dir, "typing-delay-public-selector-notification-contract-audit.csv")
			)

			public_selector_notification_design_runbook_audit <- tribble(
				~design_question, ~current_answer, ~required_prototype_or_test, ~compatibility_gate, ~performance_gate, ~decision,
				"What public behavior must be preserved?",
				"Subscribed consumers of isLastBlockChangePersistent() must be treated as compatibility-sensitive, not only imperative select() callers.",
				"Add an external-useSelect fixture and an explicit registry.subscribe fixture that observe isLastBlockChangePersistent() across non-persistent input, MARK_LAST_CHANGE_AS_PERSISTENT, and ordinary block changes.",
				"A subscribed consumer must observe the same persistence transition it observes today, and direct select( blockEditorStore ).isLastBlockChangePersistent() must agree before and after the transition.",
				"This gate alone does not reduce fanout; it defines what cannot regress.",
				"compatibility target",
				"What does a private useBlockSync side channel prove?",
				"It can validate the known in-tree semantic consumer while keeping the existing root update, but it is not a performance win by itself.",
				"Prototype a private persistence-change subscription for useBlockSync while MARK_LAST_CHANGE_AS_PERSISTENT still updates blocks.isPersistentChange.",
				"useBlockSync must keep the onInput/onChange handoff, persistence flip after a prior block-array change, selection payloads, controlled inner blocks, fresh callbacks, and cleanup behavior.",
				"No fanout claim is allowed while the block-editor root still changes and ordinary useSelect listeners still wake.",
				"behavior seam only",
				"Can an external persistence slot be the compatibility answer?",
				"No. It can preserve direct selector reads but not subscribed public reads.",
				"Test a direct select() reader and a useSelect reader against the same external-slot prototype.",
				"Direct select correctness is insufficient if useSelect or registry.subscribe consumers miss the persistence-only transition.",
				"If the root does not change and no selector-aware notification exists, ordinary fanout falls only by breaking subscribed compatibility.",
				"reject as complete answer",
				"Can keeping the root notification be the answer?",
				"It is compatible but gives up the measured fanout win.",
				"Keep blocks.isPersistentChange in the block-editor root and optionally add the private useBlockSync side channel.",
				"Existing useSelect and registry.subscribe consumers continue to wake on the root change.",
				"Marker-only rootSubscribe/useSelect listener counts remain in the current high-fanout band, so this cannot justify the 23.2ms performance claim.",
				"compatible no-win path",
				"What is the compatibility-preserving performance path?",
				"A selector-aware or branch-aware @wordpress/data subscription path is the only compatibility-preserving route identified for public useSelect consumers.",
				"Prototype useSelect dependency capture beyond store names: selector id or branch key, selector arguments where relevant, dynamic/conditional selector reads, cross-store reads, async mode, and unsubscribe/resubscribe behavior.",
				"isLastBlockChangePersistent() useSelect consumers must wake on persistence-only changes, while unrelated block-editor useSelect consumers must not; conditional and cross-store selectors must not stale.",
				"Marker-only ordinary block-editor useSelect fanout must collapse while persistence-specific subscribers still wake and registry.subscribe semantics are either preserved or explicitly scoped.",
				"data-layer prototype",
				"Can public registry.subscribe semantics be narrowed?",
				"Not as a near-term benchmark patch; it is a public data-layer policy/API decision.",
				"If attempted, build a public compatibility test matrix for registry.subscribe( listener, blockEditorStore ), useSelect, withSelect, conditional reads, and plugins that imperatively select during subscription callbacks.",
				"Existing public store subscribers must either keep root-change notification semantics or go through a documented compatibility/deprecation path.",
				"Narrowing registry.subscribe can reduce more fanout, but only after API policy explicitly accepts the compatibility change.",
				"policy decision",
				"What should be measured before claiming the fanout win?",
				"Both compatibility and source-span gates are required.",
				"Run the marker-only source-span benchmark before and after the data-layer prototype, plus behavior tests for useBlockSync and subscribed public selector consumers.",
				"No stale selector values, missed persistence transitions, incorrect onInput/onChange handoff, selection regression, or cleanup leak.",
				"Report rootSubscribe p50, data.reduxStore.listener count, useSelect.onChange count, persistence-specific subscriber count, and EventDispatch p50 before claiming the 23.2ms win.",
				"fanout claim gate",
				"What is the near-term order?",
				"Local guards first, then the useBlockSync side-channel seam, then a separate @wordpress/data notification prototype if the project wants the full fanout win.",
				"Do not bundle selector-aware data subscriptions with the pattern-override/provider/inner-block guard patches.",
				"Near-term patches must not change public data notification semantics.",
				"Only after local guards are measured should store-partition work attempt the broad compatibility-preserving fanout path.",
				"after local guards"
			)

			write_csv(
				public_selector_notification_design_runbook_audit,
				file.path(data_dir, "typing-delay-public-selector-notification-design-runbook-audit.csv")
			)

			branch_aware_use_select_compatibility_audit <- tribble(
				~contract_surface, ~source_reference, ~current_behavior, ~why_it_constrains_branch_aware_subscription, ~required_gate, ~risk_score, ~decision,
				"Store-name dependency capture",
				"packages/data/src/components/use-select/index.ts:132-235; packages/data/src/registry.ts:115-124",
				"`useSelect` records active store names through `registry.__unstableMarkListeningStores()` and subscribes with `registry.subscribe( onChange, storeName )`.",
				"There is no selector name, selector argument, state branch, or reducer path in the current dependency record; a branch-aware win needs a new dependency model.",
				"Prototype must record enough dependency metadata to wake `isLastBlockChangePersistent()` consumers while skipping unrelated block-editor selectors.",
				5,
				"core blocker",
				"Root listener fanout",
				"packages/data/src/redux-store/index.ts:526-564",
				"`createReduxStore` calls every registered listener whenever the wrapped root state identity changes.",
				"Even a perfect selector dependency model does not reduce fanout until the store can avoid calling unrelated store listeners, or those listeners can cheaply filter before invalidating.",
				"Marker-only source-span run must show `rootSubscribe`, `data.reduxStore.listener`, and unrelated `useSelect.onChange` counts collapse while persistence consumers still wake.",
				5,
				"core blocker",
				"Public store subscription",
				"packages/data/src/registry.ts:59-93; packages/data/src/index.ts:136-165",
				"`registry.subscribe( listener, storeName )` and exported `subscribe()` are documented as store-level change notifications.",
				"Unlike `useSelect`, a public store subscriber has no selected value or dependency key to filter against; narrowing it is an API semantics decision.",
				"Either preserve store-level notification for public subscribers or explicitly document/deprecate a narrowed contract with compatibility fixtures.",
				5,
				"policy/API decision",
				"Dynamic store-set growth",
				"packages/data/src/components/use-select/test/index.js:188-260",
				"`useSelect` incrementally subscribes to newly selected stores and keeps earlier store subscriptions; a later update to the old store still re-runs `mapSelect` even if it does not re-render.",
				"A branch-aware system cannot assume the dependency set is fixed after first render or that old dependencies disappear automatically.",
				"Tests must cover dependencies that expand, switch active branch, retain old subscriptions, and avoid stale values or unexpected missed reruns.",
				4,
				"must preserve edge case",
				"Conditional selector reads",
				"packages/data/src/components/use-select/test/index.js:556-620",
				"`mapSelect` can read different stores depending on component state and dependency-array values.",
				"Selector or branch dependencies are data-dependent and can change with React props/state; stale dependency metadata can miss a later branch.",
				"Tests must cover conditional branches where the active selected store changes and the next update wakes the new branch.",
				4,
				"must preserve edge case",
				"Registry-selector cross-store reads",
				"packages/data/src/components/use-select/test/index.js:520-555; packages/data/src/factory.ts:53-79",
				"`createRegistrySelector` lets a selector for one store read another store through the registry.",
				"Recording only the outer selector or outer store is insufficient; nested registry reads must contribute dependency metadata.",
				"Cross-store registry-selector tests must wake on nested-store changes and must not stale when selector indirection is used.",
				5,
				"core blocker",
				"Parent/child registries",
				"packages/data/src/components/use-select/test/index.js:622-656; packages/data/src/registry.ts:87-93",
				"`useSelect` in a sub-registry can subscribe to parent-registry stores.",
				"Dependency metadata has to cross registry boundaries and respect parent fallback semantics.",
				"Parent-registry and child-registry fixtures must still update from parent store changes.",
				4,
				"must preserve edge case",
				"Missing and late-registered stores",
				"packages/data/src/components/use-select/test/index.js:658-744; packages/data/src/registry.ts:87-93",
				"Selecting a not-yet-registered store falls back to a global subscription path for compatibility; late registration then becomes visible after a later dispatch.",
				"Selector/branch metadata cannot rely only on already-registered Redux stores or `getState()` branches.",
				"Late-registration fixtures must preserve today's blank-before-registration and update-after-dispatch behavior.",
				4,
				"must preserve edge case",
				"Render-to-subscription race",
				"packages/data/src/components/use-select/index.ts:143-160; packages/data/src/components/use-select/test/index.js:406-517",
				"`useSelect` snapshots store states on render and invalidates after subscribing if a store changed before the subscription was installed.",
				"A dependency filter that skips this second check can miss updates scheduled between render and effect/subscription.",
				"Race fixtures must cover store changes between render and subscription, including after selector/dependency changes.",
				5,
				"core blocker",
				"Async mode and render queue",
				"packages/data/src/components/use-select/index.ts:186-212,360-371; packages/data/src/components/use-select/test/index.js:766-1130",
				"Async `useSelect` queues updates through `renderQueue.add()` and cancels queued work on unmount, mapSelect change, registry change, and async-to-sync transition.",
				"Branch-aware filtering must not leave queued work for stale dependencies or miss updates when async work is cancelled and recomputed synchronously.",
				"Async-mode fixtures must cover queueing, cancellation, registry changes, and async-to-sync transitions with filtered notifications.",
				4,
				"must preserve edge case",
				"withSelect / no-deps callbacks",
				"packages/data/src/components/with-select/index.tsx:52-61; packages/data/src/components/use-select/test/index.js:1132-1186",
				"`withSelect` calls `useSelect` without a deps array so ownProps changes create fresh mapSelect callbacks; no-deps `useSelect` must see current closure values.",
				"Dependency metadata cannot assume a stable callback identity or stable selector arguments across renders.",
				"`withSelect` and no-deps tests must verify fresh props/closures and resubscription when selected stores change.",
				4,
				"must preserve edge case",
				"Custom generic stores",
				"packages/data/src/components/use-select/test/index.js:746-817; packages/data/src/components/use-select/index.ts:127-130",
				"Generic stores can lack Redux `getState()` behavior and even omit an unsubscribe return value.",
				"Branch-aware filtering cannot require reducer-state branch inspection for every store type.",
				"Generic-store fixtures must still update and unmount cleanly; branch filtering may need to fall back to store-level invalidation for generic stores.",
				3,
				"fallback to store-level",
				"Static store selection mode",
				"packages/data/src/components/use-select/index.ts:480-502; packages/data/src/components/use-select/test/index.js:1188-1216",
				"`useSelect( storeDescriptor )` returns selectors for imperative reads and intentionally does not subscribe reactively.",
				"Static selector mode should not be pulled into the reactive dependency system or used as evidence that subscribed consumers are covered.",
				"Static-mode tests must stay non-reactive while mapped `useSelect` remains reactive.",
				2,
				"keep out of scope",
				"Shallow-equality value contract",
				"packages/data/src/components/use-select/index.ts:347-354; packages/data/src/components/use-select/test/index.js:262-404",
				"`useSelect` keeps the previous returned value when the new map result is shallow-equal, even if `mapSelect` was re-run.",
				"A filtered-notification design must distinguish skipped recomputation from recomputation that returns shallow-equal output; both are observable through mapSelect call counts in tests.",
				"Test both render count and mapSelect call count, not only visible DOM output.",
				3,
				"must preserve edge case"
			) %>%
				mutate(
					decision = factor(
						decision,
						levels = c(
							"core blocker",
							"policy/API decision",
							"must preserve edge case",
							"fallback to store-level",
							"keep out of scope"
						)
					)
				)

			write_csv(
				branch_aware_use_select_compatibility_audit,
				file.path(data_dir, "typing-delay-branch-aware-use-select-compatibility-audit.csv")
			)

			branch_aware_use_select_compatibility_summary <- branch_aware_use_select_compatibility_audit %>%
				group_by(decision) %>%
				summarize(
					contract_surfaces = n(),
					max_risk_score = max(risk_score),
					example_surface = first(contract_surface),
					required_gate = first(required_gate),
					.groups = "drop"
				) %>%
				arrange(desc(max_risk_score), decision)

			write_csv(
				branch_aware_use_select_compatibility_summary,
				file.path(data_dir, "typing-delay-branch-aware-use-select-compatibility-summary.csv")
			)

			branch_aware_use_select_plot <- branch_aware_use_select_compatibility_audit %>%
				mutate(
					contract_surface_wrapped = str_wrap(contract_surface, width = 30),
					contract_surface_wrapped = fct_reorder(contract_surface_wrapped, risk_score)
				)

			save_plot(
				ggplot(
					branch_aware_use_select_plot,
					aes(
						risk_score,
						contract_surface_wrapped,
						color = decision,
						shape = decision
					)
				) +
					geom_point(size = 4.2, alpha = 0.9) +
					scale_color_brewer(type = "qual", palette = "Set1", name = "Decision") +
					scale_shape_manual(
						values = c(
							"core blocker" = 16,
							"policy/API decision" = 17,
							"must preserve edge case" = 15,
							"fallback to store-level" = 3,
							"keep out of scope" = 4
						),
						name = "Decision"
					) +
					scale_x_continuous(
						breaks = 1:5,
						limits = c(1.75, 5.25)
					) +
					labs(
						title = "Branch-aware data subscriptions have a broad compatibility surface",
						subtitle = "The current useSelect contract includes dynamic store sets, cross-store registry selectors, races, async queues, and public store subscribers",
						x = "Compatibility risk for a selector/branch-aware notification prototype",
						y = NULL
					) +
					theme(legend.position = "bottom", legend.box = "vertical"),
				"154-branch-aware-use-select-compatibility.png",
				width = 12,
				height = 7.6
			)

			pattern_override_first_patch_implementation_audit <- tribble(
			~implementation_question, ~current_answer, ~source_evidence, ~required_patch_contract, ~required_test_contract, ~decision,
			"What exactly should move?",
			"The support-check useSelect is now behind the selected-block gate.",
			"Before the patch, packages/editor/src/hooks/pattern-overrides.js called useSelect at the top of withPatternOverrideControls to read getSettings().__experimentalBlockBindingsSupportedAttributes[ props.name ], then rendered ControlsWithStoreSubscription only when props.isSelected && isSupportedBlock.",
			"withPatternOverrideControls now renders a selected-only child only when props.isSelected. That child runs the support check and returns ControlsWithStoreSubscription only for supported selected blocks.",
			"packages/editor/src/hooks/test/pattern-overrides.js asserts unselected supported blocks render BlockEdit without calling useSelect, while selected supported blocks still show PatternOverridesControls.",
			"implemented",
			"What should stay where it is?",
			"ControlsWithStoreSubscription stays inside the selected/supported path.",
			"The file already comments that ControlsWithStoreSubscription is split to avoid a store subscription on every block; it reads editorStore state, block editing mode, pattern source registration, synced/unsynced pattern state, and metadata bindings.",
			"The patch does not hoist editorStore or blockEditingMode reads into the outer HOC; they remain behind both selected and supported gates.",
			"The selected-unsupported test asserts one support-check useSelect call and no useBlockEditingMode call, so the store-backed controls path does not mount.",
			"inner subscription still gated",
			"Why is this safe for unselected blocks?",
			"Unselected blocks already show no pattern override controls.",
			"The current render condition is props.isSelected && isSupportedBlock; moving the support check into a child mounted by props.isSelected preserves the visible condition.",
			"For unselected blocks, render only BlockEdit. When a block becomes selected, mount the child and read current settings at that time.",
			"The selection-transition test renders unselected with no useSelect calls, then rerenders selected and verifies the controls appear.",
			"selected-only gate covered",
			"How should settings changes be handled?",
			"Only selected blocks need live support-setting updates.",
			"The support setting is read from block-editor settings and depends on props.name. An unselected block can read fresh settings when it is selected later.",
			"The selected-only child keeps useSelect subscribed while selected, with props.name as dependency; no cache outlives block-name or settings changes.",
			"The selected-settings test mutates __experimentalBlockBindingsSupportedAttributes and rerenders while selected, then verifies the support result toggles on.",
			"settings path covered while selected",
			"What is the least invasive test seam?",
			"Export the HOC as a named export while keeping the side-effect filter registration unchanged.",
			"packages/editor/src/hooks/index.js imports the hook module only for its addFilter side effect, and withPatternOverrideControls is currently not exported.",
			"The patch exports withPatternOverrideControls directly and still passes that same HOC to addFilter( 'editor.BlockEdit', ... ).",
			"Focused unit coverage now covers selected supported, selected unsupported, unselected supported, selection transition, settings change while selected, and the unsynced reset path.",
			"named test seam added",
			"What is not part of the first patch?",
			"Do not bundle heading, BlockListBlockProvider, useInnerBlocksProps, BlockListItems, or store-partition changes.",
			"Those rows need shared signals, local invalidation prototypes, validation prototypes, or public selector notification compatibility.",
			"Keep the first patch small: source move, focused unit coverage, then measurement. Broader invalidation rows should wait until the first patch result is measured.",
			"The patch should not change block-list selection, block identity, inner-block layout, heading anchor behavior, or persistence-marker notification semantics.",
			"single-row patch only",
			"How should success be measured?",
			"Behavior tests pass and the compact post-patch source-span microscope confirms the selected-block-scale mount count.",
			"The audited scope is about 3.6ms / 1436 skippable listener calls in the marker-window source audit, but runtime p50 can move with CI/system state.",
			"After rebuilding performance assets, the microscope found one editor-side pattern-override support-check useSelect metadata entry and one selected controls useSelect metadata entry.",
			"Keep the patch on behavior plus source-span fanout evidence; treat aggregate p50 as confirmation if a production magnitude claim is needed.",
			"source-span collapse confirmed"
		)

		write_csv(
			pattern_override_first_patch_implementation_audit,
			file.path(data_dir, "typing-delay-pattern-override-first-patch-implementation-audit.csv")
		)

		pattern_override_postpatch_source_span_audit <- tribble(
			~measurement_row, ~phase, ~evidence_type, ~measured_count, ~artifact_or_source, ~setup_style, ~scenario, ~delay_mode, ~delay_ms, ~samples_per_delay, ~throwaway_per_delay, ~trace_data_spans, ~trace_all_data_spans, ~use_browser_trace, ~use_select_id, ~metadata_entries, ~data_span_events, ~use_select_on_change_events, ~use_select_update_value_events, ~redux_store_listener_events, ~total_duration_ms, ~interpretation,
			"Pre-patch support HOC",
			"pre-patch source audit",
			"listener calls in audited p50 marker window",
			1437,
			"packages/editor/src/hooks/pattern-overrides.js:40",
			NA_character_,
			NA_character_,
			NA_character_,
			NA_real_,
			NA_real_,
			NA_real_,
			NA,
			NA,
			NA,
			NA_real_,
			NA_real_,
			NA_real_,
			NA_real_,
			NA_real_,
			1437,
			3.5974944472395882,
			"Before the selected-only split, the support-check useSelect was in the outer BlockEdit HOC and woke at per-block scale in the marker-window audit.",
			"Post-patch selected support check",
			"post-patch all-spans microscope",
			"mounted useSelect metadata entries",
			1,
			"test/performance/artifacts/typing-delay-pattern-override-postpatch-allspans-micro/typing-delay-benchmark-1777892526253.json; editor/index.min.js:204:65027",
			"benchmark-live-editor",
			"large-post-paragraph",
			"keyboard",
			1000,
			3,
			0,
			TRUE,
			TRUE,
			FALSE,
			14695,
			1,
			51,
			6,
			15,
			9,
			0.600001,
			"After rebuilding assets, the editor-side __experimentalBlockBindingsSupportedAttributes support check appears once, mounted only for the selected block path.",
			"Post-patch selected controls subscription",
			"post-patch all-spans microscope",
			"mounted useSelect metadata entries",
			1,
			"test/performance/artifacts/typing-delay-pattern-override-postpatch-allspans-micro/typing-delay-benchmark-1777892526253.json; editor/index.min.js:204:65293",
			"benchmark-live-editor",
			"large-post-paragraph",
			"keyboard",
			1000,
			3,
			0,
			TRUE,
			TRUE,
			FALSE,
			14697,
			1,
			9,
			0,
			9,
			0,
			0,
			"ControlsWithStoreSubscription remains behind the selected/supported path; the microscope found one selected store-backed controls useSelect metadata entry."
		)

		write_csv(
			pattern_override_postpatch_source_span_audit,
			file.path(data_dir, "typing-delay-pattern-override-postpatch-source-span-audit.csv")
		)

		pattern_override_postpatch_source_span_summary <- pattern_override_postpatch_source_span_audit %>%
			summarize(
				pre_patch_support_hoc_listener_calls = measured_count[measurement_row == "Pre-patch support HOC"],
				post_patch_support_metadata_entries = measured_count[measurement_row == "Post-patch selected support check"],
				post_patch_controls_metadata_entries = measured_count[measurement_row == "Post-patch selected controls subscription"],
				source_scale_collapse_ratio = pre_patch_support_hoc_listener_calls / post_patch_support_metadata_entries,
				post_patch_support_use_select_on_change_events = use_select_on_change_events[measurement_row == "Post-patch selected support check"],
				post_patch_support_total_duration_ms = total_duration_ms[measurement_row == "Post-patch selected support check"],
				artifact_caveat = "This is a compact all-data-spans microscope, not an aggregate p50 replacement; the CI-style locator run failed because the Empty block accessible-name target changed after typing, and the 33-key all-spans run exceeded JSON serialization limits.",
				.groups = "drop"
			)

		write_csv(
			pattern_override_postpatch_source_span_summary,
			file.path(data_dir, "typing-delay-pattern-override-postpatch-source-span-summary.csv")
		)

		pattern_override_postpatch_source_span_plot <- pattern_override_postpatch_source_span_audit %>%
			mutate(
				measurement_row_wrapped = str_wrap(measurement_row, width = 24),
				measurement_row_wrapped = factor(measurement_row_wrapped, levels = rev(unique(measurement_row_wrapped))),
				label_y = pmin(measured_count * 1.35, 1850),
				count_label = format(measured_count, big.mark = ",", scientific = FALSE, trim = TRUE)
			)

		save_plot(
			ggplot(
				pattern_override_postpatch_source_span_plot,
				aes(
					measured_count,
					measurement_row_wrapped,
					color = evidence_type,
					shape = evidence_type
				)
				) +
				geom_point(size = 4.2, alpha = 0.92) +
				geom_text(
					aes(x = label_y, label = count_label),
					size = 3.4,
					color = "grey20",
					show.legend = FALSE
				) +
				scale_color_brewer(type = "qual", palette = "Set2", name = "Evidence type") +
				scale_shape_manual(
					values = c(
						"listener calls in audited p50 marker window" = 16,
						"mounted useSelect metadata entries" = 17
					),
					name = "Evidence type"
				) +
				scale_x_log10(
					breaks = c(1, 10, 100, 1000),
					limits = c(0.8, 2000),
					labels = label_number()
				) +
				labs(
					title = "Pattern override support check collapses to selected-block scale",
					subtitle = "Post-patch all-data-spans microscope found one selected support check and one selected controls subscription",
					x = "Measured count (log scale)",
					y = NULL
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"150-pattern-override-postpatch-source-span-collapse.png",
			width = 11,
			height = 5.6
		)

		postpatch_residual_owner_audit <- tribble(
			~source_owner, ~source_path, ~source_line, ~metadata_count, ~data_span_events, ~use_select_on_change_events, ~use_select_map_select_events, ~use_select_update_value_events, ~use_select_render_queue_add_events, ~redux_store_listener_events, ~total_duration_ms, ~residual_priority, ~interpretation, ~recommended_next_step,
			"BlockListBlockProvider selected props",
			"packages/block-editor/src/components/block-list/block.js",
			562,
			1437,
			59467,
			8622,
			6253,
			6262,
			8580,
			12933,
			301.5,
			"hot local prototype",
			"Largest residual post-patch typed-window owner in the microscope; it still mixes text attributes with selection, movement, overlay, variation, section, settings, and identity state.",
			"Prototype a block-scoped selected-props boundary and prove non-edited text updates do not stale selection, movement, overlay, variation, template, or identity behavior.",
			"BlockListItems structural list",
			"packages/block-editor/src/components/block-list/index.js",
			195,
			580,
			24363,
			3480,
			3480,
			3483,
			0,
			5220,
			128.1,
			"hot validation prototype",
			"Hot residual structural owner; content attributes are not read, but the selector owns row order, selected ids, visible blocks, zoom, preview mode, and appender eligibility.",
			"Build a structural/selection/appender render-key prototype with broad behavior assertions before counting the win.",
			"useInnerBlocksProps structural props",
			"packages/block-editor/src/components/inner-blocks/index.js",
			194,
			580,
			23973,
			3480,
			2523,
			2526,
			3438,
			5220,
			66.3,
			"hot local prototype",
			"Hot residual owner whose ordinary text update path should not need root/drop-zone/layout props unless root, order, settings, editing mode, layout, or zoom changes.",
			"Prototype a root/order/settings boundary and test text insertion, child insertion/removal/reorder, zoom, template lock, editing mode, layout, and root changes.",
			"useSettings block settings",
			"packages/block-editor/src/components/use-settings/index.js",
			29,
			58,
			2418,
			348,
			261,
			285,
			306,
			522,
			13.1,
			"moderate follow-up",
			"Moderate residual owner with lower mount count; likely tied to per-block settings reads.",
			"Defer until the larger block-list and inner-block boundaries are understood.",
			"HeadingEdit anchor capability",
			"packages/block-library/src/heading/edit.js",
			35,
			202,
			8340,
			1212,
			873,
			873,
			1212,
			1818,
			12.2,
			"shared signal required",
			"Still hot enough to notice, but every heading must observe global generateAnchors and table-of-contents capability changes.",
			"Do not apply a local memo; design a shared/global capability signal first.",
			"Layout block-gap hook",
			"packages/block-editor/src/hooks/layout.js",
			439,
			1437,
			3813,
			546,
			405,
			414,
			546,
			819,
			5.4,
			"high mount low hotness",
			"Mounted at per-block scale but much colder than the top block-list owners in this typed-window microscope.",
			"Do not prioritize before the hotter residual rows unless a layout-specific benchmark makes it hot.",
			"Block bindings supported attributes hook",
			"packages/block-editor/src/hooks/block-bindings.js",
			45,
			1,
			102,
			15,
			15,
			15,
			0,
			21,
			4.1,
			"single selected owner",
			"A separate selected block-editor binding hook, not the pattern-override HOC fanout; it is one mounted owner in this run.",
			"Keep separate from the pattern-override fanout claim.",
			"Layout root-padding alignment hook",
			"packages/block-editor/src/hooks/layout.js",
			83,
			1438,
			12,
			0,
			0,
			12,
			0,
			0,
			0,
			"cold high mount",
			"Very high mount count but effectively no typed-window listener cost in this microscope.",
			"Do not rank by mount count alone.",
			"BlockEdit all binding sources",
			"packages/block-editor/src/components/block-edit/edit.js",
			64,
			1437,
			9,
			0,
			0,
			9,
			0,
			0,
			0,
			"cold high mount",
			"Per-block mounted binding-source read with no hot typed-window fanout in this run.",
			"Leave as a secondary source audit item.",
			"RichText binding UI support",
			"packages/block-editor/src/components/rich-text/index.js",
			172,
			1234,
			12,
			0,
			0,
			12,
			0,
			0,
			0,
			"cold high mount",
			"Broader block-editor binding UI support-attribute row remains mounted, but it is not hot in this ordinary text microscope.",
			"Do not confuse this with the now-collapsed pattern-override HOC row."
		) %>%
			mutate(
				residual_priority = factor(
					residual_priority,
					levels = c(
						"hot local prototype",
						"hot validation prototype",
						"shared signal required",
						"moderate follow-up",
						"high mount low hotness",
						"single selected owner",
						"cold high mount"
					)
				)
			)

		write_csv(
			postpatch_residual_owner_audit,
			file.path(data_dir, "typing-delay-postpatch-residual-owner-audit.csv")
		)

		postpatch_residual_owner_summary <- postpatch_residual_owner_audit %>%
			summarize(
				hot_local_prototype_total_ms = sum(total_duration_ms[residual_priority == "hot local prototype"]),
				hot_validation_prototype_total_ms = sum(total_duration_ms[residual_priority == "hot validation prototype"]),
				cold_high_mount_metadata_count = sum(metadata_count[residual_priority == "cold high mount"]),
				cold_high_mount_total_ms = sum(total_duration_ms[residual_priority == "cold high mount"]),
				top_owner = source_owner[which.max(total_duration_ms)],
				top_owner_total_ms = max(total_duration_ms),
				next_local_prototype = "BlockListBlockProvider first, then useInnerBlocksProps; keep BlockListItems as a validation prototype and do not chase cold high-mount rows first.",
				.groups = "drop"
			)

		write_csv(
			postpatch_residual_owner_summary,
			file.path(data_dir, "typing-delay-postpatch-residual-owner-summary.csv")
		)

		postpatch_residual_owner_plot <- postpatch_residual_owner_audit %>%
			mutate(
				plot_duration_ms = pmax(total_duration_ms, 0.05),
				owner_label = case_when(
					source_owner == "BlockListBlockProvider selected props" ~ "provider",
					source_owner == "BlockListItems structural list" ~ "BlockListItems",
					source_owner == "useInnerBlocksProps structural props" ~ "inner blocks",
					source_owner == "HeadingEdit anchor capability" ~ "heading",
					source_owner == "Layout block-gap hook" ~ "layout gap",
					source_owner == "Layout root-padding alignment hook" ~ "root padding",
					source_owner == "BlockEdit all binding sources" ~ "bindings sources",
					source_owner == "RichText binding UI support" ~ "RichText bindings",
					source_owner == "useSettings block settings" ~ "settings",
					source_owner == "Block bindings supported attributes hook" ~ "selected binding",
					TRUE ~ source_owner
				),
				label_y = metadata_count * case_when(
					source_owner == "Layout root-padding alignment hook" ~ 1.11,
					source_owner == "BlockEdit all binding sources" ~ 0.99,
					source_owner == "RichText binding UI support" ~ 0.86,
					source_owner == "BlockListItems structural list" ~ 1.13,
					source_owner == "useInnerBlocksProps structural props" ~ 0.87,
					TRUE ~ 1.04
				)
			)

		save_plot(
			ggplot(
				postpatch_residual_owner_plot,
				aes(
					plot_duration_ms,
					metadata_count,
					color = residual_priority,
					shape = residual_priority
				)
			) +
				geom_point(size = 3.8, alpha = 0.9) +
				geom_text(
					aes(y = label_y, label = owner_label),
					size = 3.1,
					color = "grey20",
					show.legend = FALSE
				) +
				scale_color_brewer(type = "qual", palette = "Set1", name = "Residual priority") +
				scale_shape_manual(
					values = c(
						"hot local prototype" = 16,
						"hot validation prototype" = 17,
						"shared signal required" = 15,
						"moderate follow-up" = 3,
						"high mount low hotness" = 7,
						"single selected owner" = 8,
						"cold high mount" = 4
					),
					name = "Residual priority"
				) +
				scale_x_log10(
					breaks = c(0.05, 0.1, 1, 10, 100, 300),
					labels = c("<0.1", "0.1", "1", "10", "100", "300"),
					limits = c(0.04, 430)
				) +
				scale_y_log10(
					breaks = c(1, 10, 100, 1000),
					labels = label_number()
				) +
				labs(
					title = "Post-patch residual fanout is hot in block-list owners, not every mounted row",
					subtitle = "Source-map audit of the three-sample all-data-spans microscope; totals are diagnostic, not aggregate p50",
					x = "Total source-span duration in microscope, ms (log scale)",
					y = "Mounted useSelect metadata entries (log scale)"
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"151-postpatch-residual-owner-fanout.png",
			width = 12,
			height = 7
		)

		next_local_selector_prototype_contract_audit <- tribble(
			~prototype_owner, ~source_anchor, ~current_total_ms, ~metadata_count, ~signal_group, ~source_reads, ~ordinary_text_update_effect, ~must_invalidate_for, ~stale_failure_mode, ~prototype_implication, ~risk_score,
			"BlockListBlockProvider",
			"packages/block-editor/src/components/block-list/block.js:562-907",
			301.5,
			1437,
			"own block identity and public attributes",
			"getBlockWithoutAttributes, getBlockAttributes, block type, default class name, reusable status, validity, metadata.blockVisibility, metadata.patternName-adjacent variation state, bindable attributes",
			"changes only for the edited block during ordinary paragraph typing; unrelated blocks should keep the same own identity/attribute result",
			"same-client attribute updates, block replacement, validity changes, className changes, metadata visibility/binding changes, block name/type changes, and active variation changes",
			"editor.BlockListBlock filters and PrivateBlockContext consumers see stale block/attributes/name/title/visibility/binding data for the block whose own state changed",
			"Do not use a selection-only guard. The prototype needs a per-clientId own-block dependency boundary so the edited block updates while unrelated blocks reuse their prior output.",
			5,
			"BlockListBlockProvider",
			"packages/block-editor/src/components/block-list/block.js:562-907",
			301.5,
			1437,
			"selection, caret, overlay, and drag state",
			"isBlockSelected, hasSelectedInnerBlock, isFirstMultiSelectedBlock, getMultiSelectedBlockClientIds, getSelectedBlocksInitialCaretPosition, isBlockHighlighted, isBlockBeingDragged, isDragging, active block overlay, full/partial multi-selection",
			"mostly unchanged after the first typed key, but not invariant across real editing",
			"select, deselect, multi-select, caret movement, child selection, drag start/end, overlay activation, highlight changes, and selection-unmergeable state changes",
			"wrong controls, outline, overlay, drag affordance, selected styling, initial caret, or synchronous rendering behavior",
			"The boundary must include a selection/interaction version that invalidates selected blocks, ancestors of selected blocks, and drag/overlay participants.",
			5,
			"BlockListBlockProvider",
			"packages/block-editor/src/components/block-list/block.js:562-907",
			301.5,
			1437,
			"structural, duplicate, and section context",
			"getBlockIndex, getBlocksByName, getParentSectionBlock, isSectionBlock, getBlockName for multi-selected blocks, rootClientId/root template lock",
			"unchanged by ordinary paragraph text",
			"insert, remove, move, duplicate/unique-block changes, root changes, section-block parent changes, and root template-lock changes",
			"stale index, stale originalBlockClientId warning, incorrect section controls, or wrong locked/movable/removable state",
			"The prototype needs a structural/root version, not only own-attribute and selection keys.",
			4,
			"BlockListBlockProvider",
			"packages/block-editor/src/components/block-list/block.js:562-907",
			301.5,
			1437,
			"editing-mode, template, and capability state",
			"getBlockEditingMode for client/root, canRemoveBlock, canMoveBlock, getTemplateLock, getEditedContentOnlySection, isSelectionEnabled, isBlockSubtreeDisabled, block support multiple/expose-controls",
			"unchanged by ordinary paragraph text",
			"template lock, editing mode, content-only section, permission/capability, block support, and subtree-disabled changes",
			"stale editability, missing disabled outline, incorrect remove/move controls, or stale parent controls",
			"Guard output must include editing/capability versions or explicitly prove those selectors are stable for the skipped action class.",
			5,
			"BlockListBlockProvider",
			"packages/block-editor/src/components/block-list/block.js:562-907",
			301.5,
			1437,
			"global settings, device, preview, and layout context",
			"getSettings supportsLayout/isPreviewMode/device type/bindable attributes, blockVisibility hook input, block default class name",
			"unchanged by ordinary paragraph text",
			"preview-mode toggles, device type changes, block-editor settings changes, theme/layout support changes, binding-support settings changes, and visibility metadata changes",
			"stale preview context, wrong wrapper class, stale visibility hiding, or stale binding affordance state",
			"Keep settings/device/preview as separate invalidation keys; the pattern-override patch does not remove broader block-editor binding UI responsibilities.",
			4,
			"useInnerBlocksProps",
			"packages/block-editor/src/components/inner-blocks/index.js:194-305",
			66.3,
			580,
			"root drop-zone state",
			"when clientId is absent: isZoomOut and getSectionRootClientId",
			"unchanged by ordinary paragraph text",
			"zoom in/out, auto-scaled zoom, and section-root changes",
			"root and section block lists both behave as active drop zones or both become disabled",
			"Root useInnerBlocksProps can be keyed by zoom/section-root state; ordinary text should not invalidate it.",
			3,
			"useInnerBlocksProps",
			"packages/block-editor/src/components/inner-blocks/index.js:194-305",
			66.3,
			580,
			"block identity, parent, type, and toolbar capture",
			"getBlockName, getBlockRootClientId, getBlockType, hasBlockSupport('__experimentalExposeControlsToChildren')",
			"unchanged by ordinary paragraph text unless the edited block is replaced or transformed",
			"block transform/replacement, parent/root move, block type registration/support changes, and parent changes",
			"wrong inner block component, stale toolbar capture, stale parentClientId, or wrong block type passed to InnerBlocks",
			"Use a clientId identity/root key; do not recompute this path for unrelated text attribute changes.",
			4,
			"useInnerBlocksProps",
			"packages/block-editor/src/components/inner-blocks/index.js:194-305",
			66.3,
			580,
			"layout settings and default layout",
			"getBlockSettings(clientId, 'layout'), block settings inherited from current block or ancestors, global __experimentalFeatures layout",
			"unchanged by ordinary text attributes, but can change when layout/settings attributes on the block or ancestors change",
			"layout attribute changes, ancestor settings changes, theme/global settings changes, and block supports settings changes",
			"stale layout class/default layout, incorrect child layout behavior, or stale manual placement handling",
			"The key must include layout/settings dependencies; getBlockSettings reads attributes of candidate ancestors, so an attributes-blind skip would be unsafe.",
			5,
			"useInnerBlocksProps",
			"packages/block-editor/src/components/inner-blocks/index.js:194-305",
			66.3,
			580,
			"editing mode, template lock, zoom, and drop-zone disablement",
			"getBlockEditingMode, getTemplateLock(parentClientId), isZoomOut, getSectionRootClientId",
			"unchanged by ordinary paragraph text",
			"editing-mode changes, parent template-lock changes, zoom changes, section-root changes, and drop-zone option changes",
			"drop zone accepts where it should not, refuses valid drops, or renders wrong lock state",
			"The prototype must include editability/template/zoom dependencies and behavior tests for drop-zone state.",
			5
		) %>%
			mutate(
				prototype_owner = factor(
					prototype_owner,
					levels = c("BlockListBlockProvider", "useInnerBlocksProps")
				)
			)

		write_csv(
			next_local_selector_prototype_contract_audit,
			file.path(data_dir, "typing-delay-next-local-selector-prototype-contract-audit.csv")
		)

		next_local_selector_prototype_summary <- next_local_selector_prototype_contract_audit %>%
			group_by(prototype_owner) %>%
			summarize(
				current_total_ms = first(current_total_ms),
				metadata_count = first(metadata_count),
				signal_groups = n(),
				max_risk_score = max(risk_score),
				ordinary_text_changed_groups = sum(str_detect(ordinary_text_update_effect, "changes only|unless the edited block")),
				prototype_rule = case_when(
					first(as.character(prototype_owner)) == "BlockListBlockProvider" ~ "Per-clientId own-block plus selection/structure/settings invalidation; selection-only or component-only memo is unsafe.",
					first(as.character(prototype_owner)) == "useInnerBlocksProps" ~ "Root/order/settings/editability dependency boundary; attributes-blind skip is unsafe because getBlockSettings can read layout settings from current or ancestor attributes.",
					TRUE ~ "Needs prototype contract."
				),
				.groups = "drop"
			)

		write_csv(
			next_local_selector_prototype_summary,
			file.path(data_dir, "typing-delay-next-local-selector-prototype-summary.csv")
		)

		next_local_selector_prototype_plot <- next_local_selector_prototype_contract_audit %>%
			mutate(
				signal_group_wrapped = str_wrap(signal_group, width = 34),
				signal_group_wrapped = fct_reorder(signal_group_wrapped, risk_score)
			)

		save_plot(
			ggplot(
				next_local_selector_prototype_plot,
				aes(
					risk_score,
					signal_group_wrapped,
					color = prototype_owner,
					shape = prototype_owner,
					size = metadata_count
				)
			) +
				geom_point(alpha = 0.88) +
				facet_grid(
					prototype_owner ~ .,
					scales = "free_y",
					space = "free_y"
				) +
				scale_color_brewer(type = "qual", palette = "Set1", name = "Prototype owner") +
				scale_shape_manual(
					values = c(
						"BlockListBlockProvider" = 16,
						"useInnerBlocksProps" = 17
					),
					name = "Prototype owner"
				) +
				scale_size_area(max_size = 8, labels = label_number(), name = "metadata entries") +
				scale_x_continuous(
					breaks = 1:5,
					limits = c(2.6, 5.35),
					labels = c("1" = "low", "2" = "", "3" = "medium", "4" = "high", "5" = "must test")
				) +
				labs(
					title = "Next selector prototypes need explicit invalidation boundaries",
					subtitle = "Provider is hotter but has public filter props; inner-blocks is smaller but getBlockSettings can read ancestor layout attributes",
					x = "Stale-UI risk if skipped incorrectly",
					y = NULL
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"152-next-local-selector-prototype-contract.png",
			width = 12,
			height = 7.2
		)

		selector_prototype_store_signal_audit <- tribble(
			~prototype_owner, ~dependency_boundary, ~existing_store_signal, ~signal_scope, ~why_it_is_not_enough_by_itself, ~required_prototype_signal, ~sufficiency_score, ~risk_score, ~decision,
			"BlockListBlockProvider",
			"own attributes",
			"`blocks.attributes` Map changes on `UPDATE_BLOCK_ATTRIBUTES`; `lastBlockAttributesChange` records the latest changed ids and attributes.",
			"client attribute state plus latest action",
			"`lastBlockAttributesChange` is only the latest attribute action and resets for non-attribute actions; the attributes Map has no exposed per-clientId version and reading it through `useSelect` still wakes every subscriber.",
			"private per-clientId own-attributes revision, with latest-attribute-action fast path only as an optimization",
			2,
			5,
			"partial fast path only",
			"BlockListBlockProvider",
			"block identity/name",
			"`blocks.byClientId` and `blocks.tree` change on `UPDATE_BLOCK`, insert, replace, remove, and reset paths.",
			"client identity and denormalized tree",
			"Existing selectors return values, not a stable identity-version key for unrelated blocks; replacement/removal also has to invalidate descendants and public filter props.",
			"per-clientId identity/tree revision, including replacement/removal invalidation",
			2,
			5,
			"needs private revision",
			"BlockListBlockProvider",
			"selection and interaction",
			"`selection`, `initialPosition`, `highlightedBlock`, `draggedBlocks`, spotlight/overlay-related state, and selection-enabled state change on their own action families.",
			"global interaction state",
			"Provider needs to invalidate selected blocks, ancestors of selected blocks, dragged/highlighted/overlay participants, and sometimes roots; there is no single existing selector that returns that affected set as a version.",
			"selection/interaction revision plus affected-client/root set",
			1,
			5,
			"needs affected-set design",
			"BlockListBlockProvider",
			"structure/root/section",
			"`blocks.order`, `blocks.parents`, and `blocks.tree` change on insert, move, replace, remove, reset, and controlled-inner-block paths.",
			"root order, parentage, and tree",
			"Provider needs per-root structure invalidation plus section-parent and duplicate-block-name invalidation; the existing maps are internal and not packaged as a cheap dependency key.",
			"root structural revision plus affected parent/section roots",
			2,
			4,
			"needs private root revision",
			"BlockListBlockProvider",
			"editability/capability/settings",
			"`blocks.blockEditingModes`, `derivedBlockEditingModes`, `blockListSettings`, `settings`, `blockVisibility`, and permission/capability selectors cover pieces of the result.",
			"mixed client, root, and global state",
			"The provider output combines client mode, root mode, template lock, edited content-only section, visibility, device, preview, and binding settings; no existing signal captures that combined invalidation safely.",
			"separate editability/capability/settings/device revisions, or keep this part in the selectedProps selector until proven stable",
			1,
			5,
			"needs split keys",
			"useInnerBlocksProps",
			"root drop-zone",
			"`isZoomOut()` and `getSectionRootClientId()` read zoom level and section-root settings.",
			"global/root editor state",
			"This boundary is small and could be recomputed directly, but it still lacks a named revision key for ordinary text-update skip decisions.",
			"zoom/section-root revision or direct read in a small root-only selector",
			3,
			3,
			"usable small boundary",
			"useInnerBlocksProps",
			"identity/root/type",
			"`getBlockName`, `getBlockRootClientId`, `getBlockType`, and block support selectors cover the needed values.",
			"client identity plus blocks registry",
			"Block replacement, transform, parent/root move, and block-type/support registration need to invalidate; existing selectors do not provide a cheap dependency key independent of recomputing the selector.",
			"client identity/root revision plus block-type/support revision",
			2,
			4,
			"needs private revision",
			"useInnerBlocksProps",
			"layout/default layout",
			"`getBlockSettings( clientId, 'layout' )` reads current or ancestor attributes, global settings, and runtime filters.",
			"client/ancestor attributes plus settings plus filters",
			"An attributes-blind skip is unsafe because ancestor layout/settings attributes can change the child's default layout; filters also make a purely reducer-owned version incomplete.",
			"layout-settings dependency key covering current block, ancestors, global settings, and filter invalidation policy",
			1,
			5,
			"hardest local key",
			"useInnerBlocksProps",
			"editing/template/drop-zone",
			"`getBlockEditingMode`, `getTemplateLock`, `isZoomOut`, and `getSectionRootClientId` cover the values.",
			"client, parent/root, and global state",
			"The values are available, but not as a single skip key; parent template lock and derived editing modes need parent/root invalidation.",
			"editability/template/zoom revision keyed by client and parent root",
			2,
			5,
			"needs parent/root key"
		) %>%
			mutate(
				prototype_owner = factor(
					prototype_owner,
					levels = c("BlockListBlockProvider", "useInnerBlocksProps")
				),
				decision = factor(
					decision,
					levels = c(
						"usable small boundary",
						"partial fast path only",
						"needs private revision",
						"needs private root revision",
						"needs parent/root key",
						"needs split keys",
						"needs affected-set design",
						"hardest local key"
					)
				)
			)

		write_csv(
			selector_prototype_store_signal_audit,
			file.path(data_dir, "typing-delay-selector-prototype-store-signal-audit.csv")
		)

		selector_prototype_store_signal_summary <- selector_prototype_store_signal_audit %>%
			group_by(prototype_owner) %>%
			summarize(
				boundaries = n(),
				usable_or_partial_boundaries = sum(sufficiency_score >= 2),
				insufficient_boundaries = sum(sufficiency_score < 2),
				max_risk_score = max(risk_score),
				key_blocker = case_when(
					first(as.character(prototype_owner)) == "BlockListBlockProvider" ~ "No single existing exposed selector gives the affected-client/root set for public props plus selection, structure, editability, and settings.",
					first(as.character(prototype_owner)) == "useInnerBlocksProps" ~ "getBlockSettings layout depends on current or ancestor attributes, global settings, and filters, so an attributes-blind skip is unsafe.",
					TRUE ~ "Needs store signal audit."
				),
				implementation_implication = case_when(
					first(as.character(prototype_owner)) == "BlockListBlockProvider" ~ "Prototype either adds private revisions/affected sets or keeps a conservative recompute path; lastBlockAttributesChange is not a full invalidation contract.",
					first(as.character(prototype_owner)) == "useInnerBlocksProps" ~ "Prototype can start with root/drop-zone and identity/root keys, but layout/settings must be handled before claiming a full skip.",
					TRUE ~ "Needs prototype."
				),
				.groups = "drop"
			)

		write_csv(
			selector_prototype_store_signal_summary,
			file.path(data_dir, "typing-delay-selector-prototype-store-signal-summary.csv")
		)

		selector_prototype_store_signal_plot <- selector_prototype_store_signal_audit %>%
			mutate(
				dependency_boundary_wrapped = str_wrap(dependency_boundary, width = 26),
				dependency_boundary_wrapped = fct_reorder(dependency_boundary_wrapped, sufficiency_score)
			)

		save_plot(
			ggplot(
				selector_prototype_store_signal_plot,
				aes(
					sufficiency_score,
					dependency_boundary_wrapped,
					color = prototype_owner,
					shape = decision,
					size = risk_score
				)
				) +
				geom_point(alpha = 0.9) +
				facet_grid(
					prototype_owner ~ .,
					scales = "free_y",
					space = "free_y"
				) +
				scale_color_brewer(type = "qual", palette = "Set1", name = "Prototype owner") +
				scale_shape_manual(
					values = c(
						"usable small boundary" = 16,
						"partial fast path only" = 17,
						"needs private revision" = 15,
						"needs private root revision" = 0,
						"needs parent/root key" = 2,
						"needs split keys" = 3,
						"needs affected-set design" = 4,
						"hardest local key" = 8
					),
					name = "Decision"
				) +
				scale_size_area(max_size = 7, breaks = 3:5, name = "stale risk") +
				scale_x_continuous(
					breaks = 1:3,
					limits = c(0.75, 3.25),
					labels = c("1" = "not enough", "2" = "partial", "3" = "usable")
				) +
				labs(
					title = "Existing store signals are not enough for the hot selector prototypes",
					subtitle = "Internal state slices exist, but most boundaries lack exposed per-client/root revision keys or affected sets",
					x = "Existing signal sufficiency for a skip decision",
					y = NULL
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"153-selector-prototype-store-signal-audit.png",
			width = 12,
			height = 7.4
		)

		store_boundary_source_feasibility_plot <- store_boundary_source_feasibility %>%
		mutate(
			plot_label = case_when(
				design_option == "Source-feasible local selector guards" ~ "local guards",
				design_option == "Persistence-aware useBlockSync side channel" ~ "useBlockSync side channel",
				design_option == "Split persistence state out of block-editor root" ~ "split persistence state",
				design_option == "Branch-aware useSelect dependencies" ~ "branch-aware useSelect",
				TRUE ~ "silence marker"
			),
			label_x = case_when(
				design_option == "Source-feasible local selector guards" ~ current_scope_ms + 1.2,
				design_option == "Persistence-aware useBlockSync side channel" ~ current_scope_ms - 2.5,
				design_option == "Split persistence state out of block-editor root" ~ current_scope_ms - 2.9,
				design_option == "Branch-aware useSelect dependencies" ~ current_scope_ms - 2.5,
				TRUE ~ current_scope_ms - 1.4
			),
			label_y = case_when(
				design_option == "Persistence-aware useBlockSync side channel" ~ contract_surface_score - 0.24,
				design_option == "Split persistence state out of block-editor root" ~ contract_surface_score - 0.18,
				design_option == "Branch-aware useSelect dependencies" ~ contract_surface_score + 0.22,
				TRUE ~ contract_surface_score + 0.18
			)
		)

	save_plot(
		ggplot(
			store_boundary_source_feasibility_plot,
			aes(
				current_scope_ms,
				contract_surface_score,
				color = source_feasibility,
				shape = source_feasibility,
				size = listener_scope
			)
		) +
			geom_point(alpha = 0.92) +
			geom_text(
				aes(label_x, label_y, label = plot_label),
				size = 3.1,
				color = "grey20",
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Set1", name = "Source feasibility") +
			scale_size_area(max_size = 8, labels = label_number(), name = "listener scope") +
			scale_x_continuous(labels = label_number(suffix = "ms")) +
			scale_y_continuous(
				breaks = 1:7,
				labels = c("local", "", "", "contract", "blocked", "research", "invalid"),
				limits = c(0.6, 7.4)
			) +
			labs(
				title = "Store-boundary fixes are larger than local selector guards",
				subtitle = "Marker-specific designs touch the registry/useSelect contract; local guards cover a smaller but source-feasible envelope",
				x = "Current p50 scope",
				y = "Contract surface / risk"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"140-store-boundary-source-feasibility.png",
		width = 12,
		height = 7.4
	)

	first_patch_test_readiness <- tribble(
		~candidate, ~source_site, ~current_scope_ms, ~listener_scope, ~source_feasibility, ~test_gap_score, ~implementation_seam, ~missing_test_surface, ~recommended_next,
		"Pattern override selected-only split", "packages/editor/src/hooks/pattern-overrides.js", 3.5974944472395882, 1436, "implemented and source-span confirmed", 1, "withPatternOverrideControls is exported for a focused HOC unit test while the same addFilter side effect remains in place; rebuilt assets were used for the post-patch source-span microscope.", "Selected supported block, selected unsupported block, unselected supported block, selection transition, selected settings support change, and unsynced reset control are covered; the microscope found one selected support-check metadata entry.", "Move to the non-edited BlockListBlockProvider and useInnerBlocksProps prototypes; run an aggregate before/after p50 only if a production magnitude claim is needed.",
		"Heading shared anchor capability", "packages/block-library/src/heading/edit.js", 0.4999997615814209, 202, "needs shared signal", 4, "The per-heading useSelect is semantically needed until a shared generateAnchors/table-of-contents capability signal exists.", "Web tests for generateAnchors setting changes and table-of-contents insertion/removal; native tests exist but do not cover the web source path.", "Design signal before optimizing.",
		"Non-edited BlockListBlockProvider guard", "packages/block-editor/src/components/block-list/block.js", 3.4975648467210574, 1436, "needs local invalidation prototype", 4, "The selector mixes attributes with selection, movement, overlay, variation, section, and identity state.", "Edited block update, non-edited selection, variation, movement/removal, overlay, template-mode, and block identity behavior.", "Prototype after pattern override.",
		"useInnerBlocksProps structural guard", "packages/block-editor/src/components/inner-blocks/index.js", 1.1000003814697266, 580, "needs local invalidation prototype", 3, "Needs a root/order/settings version boundary rather than a component-only memo.", "Text insertion, child insertion/removal/reorder, zoom, template lock, editing mode, layout, and root changes.", "Prototype after pattern override.",
		"BlockListItems structural/selection guard", "packages/block-editor/src/components/block-list/index.js", 5.299999952316284, 580, "validation prototype only", 5, "Large surface but owns selection, visible list, appender, template, zoom, and structural behavior.", "Selection, visible block list, appender, template lock, zoom, insertion/removal/reorder, and multi-select flows.", "Validate before counting a win."
	) %>%
		mutate(
			source_feasibility = factor(
				source_feasibility,
				levels = c(
					"implemented locally with export/test seam",
					"implemented and source-span confirmed",
					"needs shared signal",
					"needs local invalidation prototype",
					"validation prototype only"
				)
			),
			candidate = factor(
				candidate,
				levels = c(
					"Pattern override selected-only split",
					"Heading shared anchor capability",
					"Non-edited BlockListBlockProvider guard",
					"useInnerBlocksProps structural guard",
					"BlockListItems structural/selection guard"
				)
			)
		)

	write_csv(
		first_patch_test_readiness,
		file.path(data_dir, "typing-delay-first-patch-test-readiness.csv")
	)

	first_patch_readiness_summary <- first_patch_test_readiness %>%
		summarize(
			clear_first_patch_scope_ms = current_scope_ms[candidate == "Pattern override selected-only split"],
			clear_first_patch_listener_scope = listener_scope[candidate == "Pattern override selected-only split"],
			source_feasible_local_guard_ms = source_feasible_local_guard_ms,
			clear_first_patch_share_of_source_feasible_local_pct = 100 * clear_first_patch_scope_ms / source_feasible_local_guard_ms,
			test_gap_score = test_gap_score[candidate == "Pattern override selected-only split"],
			.groups = "drop"
		)

	write_csv(
		first_patch_readiness_summary,
		file.path(data_dir, "typing-delay-first-patch-readiness-summary.csv")
	)

	selector_guard_prototype_contract_audit <- tribble(
		~candidate, ~source_anchor, ~current_scope, ~safe_skip_condition, ~invalidation_contract, ~test_contract, ~decision,
		"Pattern override selected-only split",
		"packages/editor/src/hooks/pattern-overrides.js:37-55",
		"3.6ms / 1436 skippable listener calls",
		"The support check reads getSettings().__experimentalBlockBindingsSupportedAttributes[ props.name ]; unselected blocks do not render pattern override controls, and a newly selected block can read the current setting on mount.",
		"The patch moves the support-check useSelect into a selected-only child mounted by props.isSelected, then mounts ControlsWithStoreSubscription only for selected supported blocks. withPatternOverrideControls is exported as the focused test seam.",
		"Focused unit coverage verifies selected supported, selected unsupported, unselected supported, selection transition, selected support-setting update, and unsynced reset behavior.",
		"Implemented locally; post-patch all-data-spans microscope confirms one selected support-check metadata entry and one selected controls metadata entry.",
		"Heading shared anchor capability",
		"packages/block-library/src/heading/edit.js:35-44",
		"0.5ms / 202 listener calls, not counted in the source-feasible envelope",
		"Only safe after a shared capability signal invalidates on generateAnchors setting changes and core/table-of-contents block-count changes; a per-heading component memo would miss global changes.",
		"Introduce or reuse a shared canGenerateHeadingAnchors signal before removing each heading's store subscription.",
		"Web coverage for generateAnchors toggles, table-of-contents insertion/removal, existing heading content, and heading content changes; native-only tests are not enough for this source path.",
		"Do not include in the first patch.",
		"Non-edited BlockListBlockProvider guard",
		"packages/block-editor/src/components/block-list/block.js:560-741",
		"3.5ms / 1436 skippable listener calls",
		"Only the edited block needs the changed text attributes; non-edited blocks can skip text-only updates if their own attributes plus selection, variation, movement, overlay, section, settings, and identity signals are unchanged.",
		"Prototype a memoized/block-scoped selected-props boundary; do not rely on component memo alone because useSelect still wakes on the store root change.",
		"Edited block content updates, non-edited selection and multi-selection, variation changes, movement/removal, overlay/drag/highlight, content-only section state, template lock, and block identity replacement.",
		"Prototype after pattern override.",
		"useInnerBlocksProps structural guard",
		"packages/block-editor/src/components/inner-blocks/index.js:194-248",
		"1.1ms / 580 skippable listener calls",
		"Text attributes do not affect the returned root/drop-zone/layout props unless block name, editing mode, parent/root, template lock, section root, block settings, layout, or zoom state changes.",
		"Prototype a root/order/settings version boundary or memoized selector output for the useInnerBlocksProps data; a component-only memo is not enough.",
		"Text insertion no-op, child insert/remove/reorder, zoom in/out, template lock changes, editing mode changes, layout changes, and root/section changes.",
		"Prototype after pattern override.",
		"BlockListItems structural/selection guard",
		"packages/block-editor/src/components/block-list/index.js:195-259",
		"5.3ms / 580 listener calls, uncounted until validation",
		"Paragraph content attributes are not read, but the selector owns row order, selected ids, visible blocks, zoom state, preview mode, and appender eligibility.",
		"Prototype a structural/selection/appender render key before counting any win.",
		"Selection, multi-select, visible-list updates, appender eligibility, template/content-only mode, zoom, preview mode, insertion/removal/reorder, and selected-root flows.",
		"Validation prototype only."
	)

	write_csv(
		selector_guard_prototype_contract_audit,
		file.path(data_dir, "typing-delay-selector-guard-prototype-contract-audit.csv")
	)

	first_patch_test_readiness_plot <- first_patch_test_readiness %>%
		mutate(
			plot_label = case_when(
				candidate == "Pattern override selected-only split" ~ "pattern split",
				candidate == "Heading shared anchor capability" ~ "heading signal",
				candidate == "Non-edited BlockListBlockProvider guard" ~ "block provider",
				candidate == "useInnerBlocksProps structural guard" ~ "inner blocks",
				candidate == "BlockListItems structural/selection guard" ~ "BlockListItems",
				TRUE ~ as.character(candidate)
			),
			label_x = case_when(
				candidate == "BlockListItems structural/selection guard" ~ current_scope_ms - 0.15,
				candidate == "Heading shared anchor capability" ~ current_scope_ms + 0.55,
				TRUE ~ current_scope_ms + 0.14
			),
			label_y = case_when(
				candidate == "Pattern override selected-only split" ~ test_gap_score + 0.22,
				candidate == "Non-edited BlockListBlockProvider guard" ~ test_gap_score - 0.22,
				TRUE ~ test_gap_score + 0.2
			)
		)

	save_plot(
		ggplot(
			first_patch_test_readiness_plot,
			aes(
				current_scope_ms,
				test_gap_score,
				color = source_feasibility,
				shape = source_feasibility,
				size = listener_scope
			)
		) +
			geom_point(alpha = 0.92) +
			geom_text(
				aes(label_x, label_y, label = plot_label),
				size = 3.1,
				color = "grey20",
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Source/test readiness") +
			scale_size_area(max_size = 8, labels = label_number(), name = "listener scope") +
			scale_x_continuous(labels = label_number(suffix = "ms")) +
			scale_y_continuous(
				breaks = 1:5,
				labels = c("covered", "small seam", "prototype", "broad tests", "validate first"),
				limits = c(1.5, 5.4)
			) +
			labs(
				title = "Pattern override is the only source-feasible first patch",
				subtitle = "The first row now has behavior coverage and a post-patch source-span collapse; remaining rows need prototypes or signal design",
				x = "Current audited p50 scope",
				y = "Test gap / prototype burden"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"141-first-patch-test-readiness.png",
		width = 12,
		height = 7.4
	)

	blocklist_items_invalidation_audit <- tribble(
		~signal_group, ~source_reads, ~owned_output, ~ordinary_text_update_effect, ~must_invalidate_for, ~stale_failure_mode, ~guard_role, ~risk_score, ~surface_count,
		"Paragraph content attributes", "not read by BlockListItems", "none", "changed by the typing benchmark", "none", "none; this is the avoidable wakeup for ordinary text input", "must not be part of the render key", 1, 0,
		"Child order / root tree", "getBlockOrder( rootClientId )", "block rows, placeholder, default appender condition", "unchanged by ordinary text", "insert, remove, move, replace, or controlled inner-block root changes", "missing, duplicated, or stale block rows", "root structural version", 5, 3,
		"Selected block ids", "getSelectedBlockClientIds()", "sync/async mode and root appender eligibility", "usually unchanged after the first typed key", "select, clear selection, multi-select, or selected-root changes", "selected block rendered asynchronously or root appender shown/hidden incorrectly", "selection version", 5, 2,
		"Visible block set", "__unstableGetVisibleBlocks()", "AsyncModeProvider value for every row", "unchanged by ordinary text", "intersection-observer SET_BLOCK_VISIBILITY updates", "visible blocks scheduled asynchronously or hidden blocks forced synchronous", "visibility version", 4, 1,
		"Zoom state", "isZoomOut()", "zoom separators and appender suppression", "unchanged by ordinary text", "zoom-in, zoom-out, and auto-scaled zoom changes", "missing separators or stale zoom appender state", "zoom version", 4, 2,
		"Preview mode", "getSettings().isPreviewMode", "short-circuits selection, visibility, zoom, and appender reads", "unchanged by ordinary text", "preview/live mode transitions", "preview renders live editing affordances or vice versa", "settings preview version", 3, 4,
		"Template/editing/section/appender capability", "getTemplateLock, getBlockEditingMode, isSectionBlock, isContainerInsertableToInContentOnlyMode, canInsertBlockType", "BlockListAppender visibility", "unchanged for ordinary paragraph text", "template lock, content-only section, synced/unsynced pattern, edited section, default-block insertion, or selected block-name changes", "appender appears where insertion is forbidden or disappears where insertion is allowed", "root/appender capability version", 5, 5
	) %>%
		mutate(
			ordinary_text_update_effect = factor(
				ordinary_text_update_effect,
				levels = c(
					"changed by the typing benchmark",
					"usually unchanged after the first typed key",
					"unchanged by ordinary text",
					"unchanged for ordinary paragraph text"
				)
			),
			signal_group = factor(
				signal_group,
				levels = c(
					"Paragraph content attributes",
					"Child order / root tree",
					"Selected block ids",
					"Visible block set",
					"Zoom state",
					"Preview mode",
					"Template/editing/section/appender capability"
				)
			)
		)

	write_csv(
		blocklist_items_invalidation_audit,
		file.path(data_dir, "typing-delay-blocklistitems-invalidation-audit.csv")
	)

	blocklist_items_invalidation_summary <- blocklist_items_invalidation_audit %>%
		summarize(
			current_scope_ms = 5.299999952316284,
			listener_scope = 580,
			content_attribute_dependencies = sum(signal_group == "Paragraph content attributes" & source_reads != "not read by BlockListItems"),
			required_non_text_invalidation_groups = sum(signal_group != "Paragraph content attributes"),
			max_required_risk_score = max(risk_score[signal_group != "Paragraph content attributes"]),
			total_owned_surface_count = sum(surface_count),
			recommendation = "Prototype a structural/selection/appender render key before counting BlockListItems as skippable.",
			.groups = "drop"
		)

	write_csv(
		blocklist_items_invalidation_summary,
		file.path(data_dir, "typing-delay-blocklistitems-invalidation-summary.csv")
	)

	blocklist_items_invalidation_plot <- blocklist_items_invalidation_audit %>%
		mutate(
			plot_label = case_when(
				signal_group == "Paragraph content attributes" ~ "text attrs",
				signal_group == "Child order / root tree" ~ "order/tree",
				signal_group == "Selected block ids" ~ "selection",
				signal_group == "Visible block set" ~ "visibility",
				signal_group == "Zoom state" ~ "zoom",
				signal_group == "Preview mode" ~ "preview",
				TRUE ~ "appender capability"
			),
			label_x = risk_score + if_else(surface_count >= 4, -0.25, 0.18),
			label_y = surface_count + case_when(
				signal_group == "Paragraph content attributes" ~ 0.22,
				signal_group == "Preview mode" ~ -0.22,
				TRUE ~ 0.18
			)
		)

	save_plot(
		ggplot(
			blocklist_items_invalidation_plot,
			aes(
				risk_score,
				surface_count,
				color = ordinary_text_update_effect,
				shape = ordinary_text_update_effect,
				size = surface_count + 1
			)
		) +
			geom_point(alpha = 0.9) +
			geom_text(
				aes(label_x, label_y, label = plot_label),
				size = 3.05,
				color = "grey20",
				show.legend = FALSE
			) +
			scale_color_brewer(
				type = "qual",
				palette = "Set2",
				name = "Ordinary text update",
				labels = c(
					"text attribute changes",
					"selection usually same",
					"unchanged",
					"paragraph unchanged"
				)
			) +
			scale_shape_manual(
				values = c(16, 17, 15, 3),
				name = "Ordinary text update",
				labels = c(
					"text attribute changes",
					"selection usually same",
					"unchanged",
					"paragraph unchanged"
				)
			) +
			scale_size_area(max_size = 8, guide = "none") +
			scale_x_continuous(
				breaks = 1:5,
				labels = c("none", "low", "medium", "high", "highest"),
				limits = c(0.7, 5.5)
			) +
			scale_y_continuous(
				breaks = 0:5,
				limits = c(-0.2, 5.45)
			) +
			labs(
				title = "BlockListItems is a text-update opportunity, not a first patch",
				subtitle = "It does not read paragraph content, but it owns selection, visibility, zoom, order, and appender invalidation",
				x = "Stale-UI risk if the signal is missed",
				y = "Owned output surfaces"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"142-blocklistitems-invalidation-audit.png",
		width = 12,
		height = 7.4
	)
}

if (exists("marker_allspan_input_batch_path") && file.exists(marker_allspan_input_batch_path)) {
	subscriber_outcome_source <- read_csv(marker_allspan_input_batch_path, show_col_types = FALSE) %>%
		filter(intervention %in% c(
			"normal marker",
			"marker no-op",
			"raw unknown action",
			"mark next not persistent",
			"stop/start typing",
			"toggle selection"
		)) %>%
		mutate(
			async_queue_share = use_select_render_queue_add_count_p50 / use_select_on_change_count_p50,
			sync_map_select_share = use_select_map_select_count_p50 / use_select_on_change_count_p50
		)

	subscriber_outcome_summary <- subscriber_outcome_source %>%
		transmute(
			intervention,
			keypress_p50_ms,
			latency_p50_ms,
			use_select_on_change_count_p50,
			use_select_render_queue_add_count_p50,
			use_select_on_store_change_count_p50,
			use_select_update_value_count_p50,
			use_select_map_select_count_p50,
			async_queue_share,
			sync_map_select_share,
			use_select_on_change_duration_p50_ms,
			use_select_render_queue_add_duration_p50_ms,
			use_select_on_store_change_duration_p50_ms,
			use_select_update_value_duration_p50_ms,
			use_select_map_select_duration_p50_ms
		)

	write_csv(
		subscriber_outcome_summary,
		file.path(data_dir, "typing-delay-use-select-subscriber-outcome-summary.csv")
	)

	subscriber_outcome_plot <- subscriber_outcome_summary %>%
		pivot_longer(
			cols = c(
				use_select_on_change_count_p50,
				use_select_render_queue_add_count_p50,
				use_select_on_store_change_count_p50,
				use_select_update_value_count_p50,
				use_select_map_select_count_p50
			),
			names_to = "outcome",
			values_to = "count_p50"
		) %>%
		mutate(
			outcome = recode(
				outcome,
				use_select_on_change_count_p50 = "woken useSelect.onChange",
				use_select_render_queue_add_count_p50 = "queued async updates",
				use_select_on_store_change_count_p50 = "sync onStoreChange",
				use_select_update_value_count_p50 = "sync updateValue",
				use_select_map_select_count_p50 = "sync mapSelect"
			),
			outcome = factor(
				outcome,
				levels = rev(c(
					"woken useSelect.onChange",
					"queued async updates",
					"sync onStoreChange",
					"sync updateValue",
					"sync mapSelect"
				))
			),
			intervention = factor(
				intervention,
				levels = rev(c(
					"normal marker",
					"marker no-op",
					"raw unknown action",
					"mark next not persistent",
					"stop/start typing",
					"toggle selection"
				))
			)
		)

	save_plot(
		ggplot(subscriber_outcome_plot, aes(count_p50, outcome, color = outcome)) +
			geom_point(size = 3.2, alpha = 0.9) +
			facet_wrap(vars(intervention), ncol = 2) +
			scale_color_brewer(type = "qual", palette = "Set2", guide = "none") +
			labs(
				title = "Most woken useSelect subscribers are queued, not recomputed immediately",
				subtitle = "Next-input trace-all-data-spans run at 1000ms; 3828 of 4544 onChange callbacks go through renderQueue.add",
				x = "p50 callback count",
				y = NULL
			),
		"118-use-select-subscriber-outcome-funnel.png",
		width = 12,
		height = 8
	)
}

priority_queue_idle_events_path <- file.path(data_dir, "typing-delay-priority-queue-idle-events.csv")
if (file.exists(priority_queue_idle_events_path)) {
	priority_queue_idle_events <- read_csv(priority_queue_idle_events_path, show_col_types = FALSE) %>%
		mutate(
			delay_label = paste0(delay_ms, "ms"),
			sample_label = paste0("sample ", sample_index),
			crossing_label = if_else(
				crosses_next_input,
				"finishes after next input starts",
				"finishes before next input starts"
			)
		)

	priority_queue_idle_intervals <- priority_queue_idle_events %>%
		filter(!is_throwaway, has_next_input) %>%
		group_by(delay_ms, delay_label, sample_index, sample_label) %>%
		summarise(
			next_input_after_input_end_ms = first(next_input_after_input_end_ms),
			latency_ms = first(latency_ms),
			keypress_ms = first(keypress_ms),
			render_queue_add_count_in_interval = first(render_queue_add_count_in_interval),
			render_queue_add_duration_in_interval_ms = first(render_queue_add_duration_in_interval_ms),
			priority_idle_callbacks = n(),
			priority_idle_callback_duration_ms = sum(idle_callback_duration_ms, na.rm = TRUE),
			last_idle_finished_after_input_end_ms = max(finished_after_input_end_ms, na.rm = TRUE),
			any_idle_crosses_next_input = any(crosses_next_input),
			crossing_idle_callbacks = sum(crosses_next_input),
			.groups = "drop"
		)

	priority_queue_idle_summary <- priority_queue_idle_intervals %>%
		group_by(delay_ms) %>%
		summarise(
			retained_intervals_with_next_input = n(),
			intervals_with_idle_crossing_next_input = sum(any_idle_crosses_next_input),
			priority_idle_callbacks = sum(priority_idle_callbacks),
			priority_idle_callbacks_crossing_next_input = sum(crossing_idle_callbacks),
			latency_p50_ms = median(latency_ms, na.rm = TRUE),
			keypress_p50_ms = median(keypress_ms, na.rm = TRUE),
			render_queue_add_count_p50 = median(render_queue_add_count_in_interval, na.rm = TRUE),
			render_queue_add_duration_p50_ms = median(render_queue_add_duration_in_interval_ms, na.rm = TRUE),
			priority_idle_callback_duration_p50_ms = median(priority_idle_callback_duration_ms, na.rm = TRUE),
			last_idle_finished_after_input_end_p50_ms = median(last_idle_finished_after_input_end_ms, na.rm = TRUE),
			next_input_after_input_end_p50_ms = median(next_input_after_input_end_ms, na.rm = TRUE),
			.groups = "drop"
		) %>%
		left_join(
			priority_queue_idle_events %>%
				filter(!is_throwaway) %>%
				distinct(delay_ms, sample_index, latency_ms, keypress_ms) %>%
				group_by(delay_ms) %>%
				summarise(
					retained_samples = n(),
					latency_all_retained_p50_ms = median(latency_ms, na.rm = TRUE),
					keypress_all_retained_p50_ms = median(keypress_ms, na.rm = TRUE),
					.groups = "drop"
				),
			by = "delay_ms"
		)

	write_csv(
		priority_queue_idle_summary,
		file.path(data_dir, "typing-delay-priority-queue-idle-summary.csv")
	)

	priority_queue_idle_plot_events <- priority_queue_idle_events %>%
		filter(!is_throwaway, has_next_input) %>%
		mutate(
			sample_label = fct_rev(factor(sample_label)),
			delay_label = factor(delay_label, levels = paste0(sort(unique(delay_ms)), "ms")),
			crossing_label = factor(
				crossing_label,
				levels = c(
					"finishes before next input starts",
					"finishes after next input starts"
				)
			)
		)

	priority_queue_idle_plot_inputs <- priority_queue_idle_intervals %>%
		mutate(
			sample_label = fct_rev(factor(sample_label)),
			delay_label = factor(delay_label, levels = paste0(sort(unique(delay_ms)), "ms"))
		)

	save_plot(
		ggplot(priority_queue_idle_plot_events, aes(y = sample_label)) +
			geom_segment(
				aes(
					x = fired_after_input_end_ms,
					xend = finished_after_input_end_ms,
					yend = sample_label,
					color = crossing_label
				),
				linewidth = 2.2,
				alpha = 0.88
			) +
			geom_point(
				aes(x = scheduled_after_input_end_ms),
				shape = 21,
				size = 2.1,
				stroke = 0.55,
				fill = "white",
				color = "#404040",
				alpha = 0.8
			) +
			geom_point(
				data = priority_queue_idle_plot_inputs,
				aes(x = next_input_after_input_end_ms, y = sample_label),
				inherit.aes = FALSE,
				shape = 124,
				size = 8,
				stroke = 1.2,
				color = "#111111"
			) +
			facet_wrap(vars(delay_label), ncol = 1) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = NULL) +
			labs(
				title = "Priority-queue idle flushes do not explain the 1000ms low band",
				subtitle = "White dots show idle scheduling, colored bars show idle callback execution, black ticks show the next RichText input start",
				x = "ms after current RichText input ends",
				y = NULL
			),
		"119-priority-queue-idle-timing.png",
		width = 12,
		height = 7
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
			scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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
				cols = any_of(c("marker no-op", "raw unknown action", "mark next not persistent")),
				names_to = "intervention",
				values_to = "duration_p50_ms"
			) %>%
			mutate(
				delta_vs_normal_ms = duration_p50_ms - `normal marker`,
				intervention = factor(
					intervention,
					levels = c("marker no-op", "raw unknown action", "mark next not persistent")
				)
			)

		write_csv(use_select_subphase_deltas, file.path(data_dir, "typing-delay-use-select-subphase-deltas.csv"))

		save_plot(
			ggplot(use_select_subphase_deltas, aes(delta_vs_normal_ms, metric, color = intervention, shape = intervention)) +
				geom_vline(xintercept = 0, linewidth = 0.4, linetype = "dashed", color = "grey50") +
				geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.45)) +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				scale_shape_manual(values = marker_allspan_delta_shapes, drop = FALSE) +
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
					cols = any_of(c("marker no-op", "raw unknown action", "mark next not persistent")),
					names_to = "intervention",
					values_to = "duration_p50_ms"
				) %>%
				mutate(
					delta_vs_normal_ms = duration_p50_ms - `normal marker`,
					intervention = factor(
						intervention,
						levels = c("marker no-op", "raw unknown action", "mark next not persistent")
					)
				)

			write_csv(listener_wrapper_accounting, file.path(data_dir, "typing-delay-listener-wrapper-accounting.csv"))
			write_csv(listener_wrapper_deltas, file.path(data_dir, "typing-delay-listener-wrapper-deltas.csv"))

			save_plot(
				ggplot(listener_wrapper_deltas, aes(delta_vs_normal_ms, metric, color = intervention, shape = intervention)) +
					geom_vline(xintercept = 0, linewidth = 0.4, linetype = "dashed", color = "grey50") +
					geom_point(size = 3.2, alpha = 0.9, position = position_dodge(width = 0.45)) +
					scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
					scale_shape_manual(values = marker_allspan_delta_shapes, drop = FALSE) +
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
					scale_shape_manual(values = marker_allspan_core_shapes, drop = FALSE) +
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

react_render_boundary_inputs <- c(
	file.path(data_dir, "typing-delay-visual-endpoint-drop-summary.csv"),
	file.path(data_dir, "typing-delay-visual-endpoint-decomposition-summary.csv"),
	file.path(data_dir, "typing-delay-use-select-subphase-deltas.csv"),
	file.path(data_dir, "typing-delay-listener-wrapper-deltas.csv"),
	file.path(data_dir, "typing-delay-priority-queue-idle-summary.csv")
)
if (all(file.exists(react_render_boundary_inputs))) {
	visual_endpoint_drop_summary_existing <- read_csv(
		file.path(data_dir, "typing-delay-visual-endpoint-drop-summary.csv"),
		show_col_types = FALSE
	)
	visual_endpoint_decomposition_existing <- read_csv(
		file.path(data_dir, "typing-delay-visual-endpoint-decomposition-summary.csv"),
		show_col_types = FALSE
	)
	use_select_subphase_deltas_existing <- read_csv(
		file.path(data_dir, "typing-delay-use-select-subphase-deltas.csv"),
		show_col_types = FALSE
	)
	listener_wrapper_deltas_existing <- read_csv(
		file.path(data_dir, "typing-delay-listener-wrapper-deltas.csv"),
		show_col_types = FALSE
	)
	priority_queue_idle_summary_existing <- read_csv(
		file.path(data_dir, "typing-delay-priority-queue-idle-summary.csv"),
		show_col_types = FALSE
	)

	keyheld_endpoint_drop_reference_ms <- visual_endpoint_drop_summary_existing %>%
		filter(
			input_mode == "key held during delay",
			endpoint %in% c(
				"EventDispatch trace latency",
				"keydown to second RAF after input",
				"keydown to Paint trace event",
				"keydown to DrawFrame trace event",
				"keydown to first changed trace screenshot"
			)
		) %>%
		summarize(reference_ms = min(drop_vs_slow_neighbors_ms, na.rm = TRUE), .groups = "drop") %>%
		pull(reference_ms)

	if (length(keyheld_endpoint_drop_reference_ms) == 0 || !is.finite(keyheld_endpoint_drop_reference_ms)) {
		keyheld_endpoint_drop_reference_ms <- NA_real_
	}

	visual_render_bound_rows <- visual_endpoint_decomposition_existing %>%
		filter(input_mode == "key held during delay") %>%
		summarize(
			`EventDispatch slice in visual probes` = max(event_dispatch_drop_vs_slow_neighbors_ms, na.rm = TRUE),
			`post-EventDispatch visual/render tail` = max(post_dispatch_drop_vs_slow_neighbors_ms, na.rm = TRUE),
			`post-EventDispatch Chrome render-event tail` = max(
				post_dispatch_drop_vs_slow_neighbors_ms[probe == "Chrome render trace"],
				na.rm = TRUE
			),
			.groups = "drop"
		) %>%
		pivot_longer(everything(), names_to = "claim", values_to = "effect_p50_ms") %>%
		mutate(
			evidence_layer = case_when(
				claim == "EventDispatch slice in visual probes" ~ "measured input",
				TRUE ~ "post-input visual/render"
			),
			comparison = "mean(990ms, 1300ms) minus 1000ms, key held during delay",
			status = case_when(
				claim == "EventDispatch slice in visual probes" ~ "primary observed movement",
				TRUE ~ "bounded secondary contributor"
			),
			interpretation = case_when(
				claim == "EventDispatch slice in visual probes" ~ "The downstream endpoint speedup is already mostly present inside the measured input slice.",
				claim == "post-EventDispatch Chrome render-event tail" ~ "Chrome Paint/DrawFrame/RAF tail movement is sub-millisecond in the render-trace probe.",
				TRUE ~ "The largest post-dispatch tail movement is in the trace-screenshot probe and is still much smaller than the endpoint cliff."
			)
		)

	use_select_bound_rows <- use_select_subphase_deltas_existing %>%
		filter(metric %in% c(
			"rootSubscribe total",
			"Redux listener wrappers",
			"useSelect.onChange",
			"renderQueue.add",
			"useSelect.onStoreChange",
			"useSelect.reactListener",
			"useSelect.updateValue",
			"useSelect.mapSelect"
		)) %>%
		group_by(metric) %>%
		summarize(
			effect_p50_ms = max(delta_vs_normal_ms, na.rm = TRUE),
			min_delta_p50_ms = min(delta_vs_normal_ms, na.rm = TRUE),
			max_intervention = intervention[which.max(delta_vs_normal_ms)][1],
			.groups = "drop"
		) %>%
		transmute(
			claim = metric,
			evidence_layer = case_when(
				metric %in% c("rootSubscribe total", "Redux listener wrappers") ~ "input subscriber fanout",
				metric == "renderQueue.add" ~ "async render queue",
				metric == "useSelect.reactListener" ~ "React external-store listener",
				metric %in% c("useSelect.updateValue", "useSelect.mapSelect", "useSelect.onStoreChange") ~ "selector/cache body",
				TRUE ~ "useSelect wrapper"
			),
			comparison = paste0("largest p50 delta versus normal marker among slow timer controls; max in ", max_intervention),
			effect_p50_ms = pmax(effect_p50_ms, 0),
			status = case_when(
				metric %in% c("rootSubscribe total", "Redux listener wrappers") ~ "visible residual accounting",
				metric %in% c("renderQueue.add", "useSelect.reactListener", "useSelect.updateValue", "useSelect.mapSelect", "useSelect.onStoreChange") ~ "too small for primary cause",
				TRUE ~ "bounded wrapper movement"
			),
			interpretation = case_when(
				metric == "rootSubscribe total" ~ "The slow controls spend more p50 time in the same root-subscribe fanout shape.",
				metric == "Redux listener wrappers" ~ "The shared slow-control movement is in thousands of paused listener wrappers, not in more listeners.",
				metric == "useSelect.onChange" ~ "The outer useSelect wrapper moves, but child phases below it do not grow enough to explain the cliff.",
				metric == "renderQueue.add" ~ "Async render-queue insertion changes by only tenths of a millisecond.",
				metric == "useSelect.reactListener" ~ "React external-store listener duration is flat or lower in the slow controls.",
				metric == "useSelect.onStoreChange" ~ "Synchronous onStoreChange duration is flat or lower in the slow controls.",
				metric == "useSelect.updateValue" ~ "Selector cache update duration is flat or lower in the slow controls.",
				metric == "useSelect.mapSelect" ~ "Selector-body recomputation is flat or lower in the slow controls.",
				TRUE ~ "Bounded by nested span deltas."
			)
		)

	listener_wrapper_bound_rows <- listener_wrapper_deltas_existing %>%
		filter(metric %in% c(
			"Redux wrapper outside emitter.emit",
			"paused emitter.emit",
			"emitter.notifyListeners",
			"emitter.listener callbacks"
		)) %>%
		group_by(metric) %>%
		summarize(
			effect_p50_ms = max(delta_vs_normal_ms, na.rm = TRUE),
			min_delta_p50_ms = min(delta_vs_normal_ms, na.rm = TRUE),
			max_intervention = intervention[which.max(delta_vs_normal_ms)][1],
			.groups = "drop"
		) %>%
		transmute(
			claim = metric,
			evidence_layer = case_when(
				metric %in% c("Redux wrapper outside emitter.emit", "paused emitter.emit") ~ "paused wrapper accounting",
				TRUE ~ "resumed listener phase"
			),
			comparison = paste0("largest p50 delta versus normal marker among slow timer controls; max in ", max_intervention),
			effect_p50_ms = pmax(effect_p50_ms, 0),
			status = case_when(
				metric %in% c("Redux wrapper outside emitter.emit", "paused emitter.emit") ~ "visible residual accounting",
				TRUE ~ "not common slow-path cause"
			),
			interpretation = case_when(
				metric == "Redux wrapper outside emitter.emit" ~ "Part of the residual is wrapper overhead around the paused emitter call.",
				metric == "paused emitter.emit" ~ "The paused emitter child contributes, but it only marks the emitter pending.",
				metric == "emitter.notifyListeners" ~ "Resume/notify does not consistently grow in the slow controls.",
				metric == "emitter.listener callbacks" ~ "Real resumed listener callbacks do not consistently grow in the slow controls.",
				TRUE ~ "Bounded by nested wrapper deltas."
			)
		)

	priority_idle_row <- priority_queue_idle_summary_existing %>%
		summarize(
			fast_crossing = intervals_with_idle_crossing_next_input[delay_ms == 1000][1],
			fast_intervals = retained_intervals_with_next_input[delay_ms == 1000][1],
			slow_crossing = intervals_with_idle_crossing_next_input[delay_ms == 1300][1],
			slow_intervals = retained_intervals_with_next_input[delay_ms == 1300][1],
			fast_latency = latency_all_retained_p50_ms[delay_ms == 1000][1],
			slow_latency = latency_all_retained_p50_ms[delay_ms == 1300][1],
			.groups = "drop"
		) %>%
		transmute(
			claim = "priority queue drained before next input",
			evidence_layer = "async render queue",
			comparison = paste0(
				"1000ms fast crossing ",
				fast_crossing,
				"/",
				fast_intervals,
				"; 1300ms slow crossing ",
				slow_crossing,
				"/",
				slow_intervals
			),
			effect_p50_ms = 0,
			status = "wrong direction",
			interpretation = paste0(
				"The faster 1000ms probe had idle flushes crossing the following input, while the slower 1300ms probe drained before input; retained p50s were ",
				number(fast_latency, accuracy = 0.1),
				"ms and ",
				number(slow_latency, accuracy = 0.1),
				"ms."
			)
		)

	react_render_boundary_audit <- bind_rows(
		visual_render_bound_rows,
		use_select_bound_rows,
		listener_wrapper_bound_rows,
		priority_idle_row
	) %>%
		mutate(
			cliff_reference_ms = keyheld_endpoint_drop_reference_ms,
			share_of_min_keyheld_endpoint_drop = effect_p50_ms / cliff_reference_ms,
			claim_plot = str_wrap(claim, 38),
			plot_layer = case_when(
				evidence_layer == "measured input" ~ "measured input",
				evidence_layer %in% c("input subscriber fanout", "paused wrapper accounting") ~ "subscriber fanout / wrappers",
				evidence_layer %in% c("useSelect wrapper", "selector/cache body", "React external-store listener", "async render queue") ~ "React/useSelect child layer",
				evidence_layer == "resumed listener phase" ~ "resumed listener callbacks",
				evidence_layer == "post-input visual/render" ~ "post-input visual tail",
				TRUE ~ as.character(evidence_layer)
			),
			evidence_layer = factor(
				evidence_layer,
				levels = c(
					"measured input",
					"input subscriber fanout",
					"paused wrapper accounting",
					"useSelect wrapper",
					"selector/cache body",
					"React external-store listener",
					"async render queue",
					"resumed listener phase",
					"post-input visual/render"
				)
			),
			status = factor(
				status,
				levels = c(
					"primary observed movement",
					"visible residual accounting",
					"bounded wrapper movement",
					"bounded secondary contributor",
					"too small for primary cause",
					"not common slow-path cause",
					"wrong direction"
				)
			),
			plot_layer = factor(
				plot_layer,
				levels = c(
					"measured input",
					"subscriber fanout / wrappers",
					"React/useSelect child layer",
					"resumed listener callbacks",
					"post-input visual tail"
				)
			)
		) %>%
		arrange(desc(effect_p50_ms), evidence_layer, claim)

		write_csv(
			react_render_boundary_audit,
			file.path(data_dir, "typing-delay-react-render-boundary-audit.csv")
		)

		react_boundary_value <- function(claim_name) {
			values <- react_render_boundary_audit$effect_p50_ms[as.character(react_render_boundary_audit$claim) == claim_name]
			if (length(values) == 0 || all(!is.finite(values))) {
				return(NA_real_)
			}
			max(values, na.rm = TRUE)
		}

		react_profiler_event_dispatch_ms <- react_boundary_value("EventDispatch slice in visual probes")
		react_profiler_post_tail_ms <- react_boundary_value("post-EventDispatch visual/render tail")
		react_profiler_chrome_tail_ms <- react_boundary_value("post-EventDispatch Chrome render-event tail")
		react_profiler_on_change_ms <- react_boundary_value("useSelect.onChange")
		react_profiler_react_listener_ms <- react_boundary_value("useSelect.reactListener")
		react_profiler_render_queue_ms <- react_boundary_value("renderQueue.add")
		react_profiler_map_select_ms <- react_boundary_value("useSelect.mapSelect")
		react_profiler_root_subscribe_ms <- react_boundary_value("rootSubscribe total")
		react_profiler_listener_wrappers_ms <- react_boundary_value("Redux listener wrappers")

		react_profiler_decision_audit <- tribble(
			~question, ~current_answer, ~evidence, ~remaining_risk, ~next_profiler_target, ~priority,
			"Can React render explain the key-held 1000ms cliff?", "No; the primary movement is already in the EventDispatch/input slice.", paste0("The EventDispatch slice movement is ", number(react_profiler_event_dispatch_ms, accuracy = 0.1), "ms against a ", number(keyheld_endpoint_drop_reference_ms, accuracy = 0.1), "ms minimum visual endpoint drop; the largest post-EventDispatch visual/render tail is ", number(react_profiler_post_tail_ms, accuracy = 0.1), "ms."), "Profiler overhead and production/dev differences could affect component ownership, but not the already-observed timing boundary.", "Do not use React profiler as the next test for cliff causality; use it only after input-boundary and subscriber work are separated.", "closed for cliff causality",
			"Can renderQueue.add or idle draining explain the cliff?", "No; it is too small and the idle-drain chronology points the wrong way.", paste0("renderQueue.add moves by at most ", number(react_profiler_render_queue_ms, accuracy = 0.1), "ms, and the faster 1000ms idle probe had idle callbacks crossing the next input while the slower 1300ms probe drained before input."), "A larger real workload could make async queue ownership matter for product latency.", "Profile async commits after input in plugin-heavy or real editing histories, not this fixed-x cliff.", "secondary",
			"Can useSelect selector work or the React external-store listener explain it?", "No; the child phases under the useSelect wrapper are much smaller than the endpoint movement.", paste0("useSelect.reactListener moves by ", number(react_profiler_react_listener_ms, accuracy = 0.1), "ms, mapSelect by ", number(react_profiler_map_select_ms, accuracy = 0.1), "ms, and the outer onChange wrapper by ", number(react_profiler_on_change_ms, accuracy = 0.1), "ms."), "Selector ownership still matters once a specific guard patch is being sized.", "After a guard prototype, profile the components/selectors still recomputing after the changed store notification.", "secondary",
			"Where is the remaining input-side React/data work?", "Mostly in broad store-root subscriber fanout, not in React child rendering.", paste0("rootSubscribe moves by ", number(react_profiler_root_subscribe_ms, accuracy = 0.1), "ms and Redux listener wrappers by ", number(react_profiler_listener_wrappers_ms, accuracy = 0.1), "ms; resumed listener callbacks are not a common slow-path cause in the boundary audit."), "A store partition or persistence side channel has public selector compatibility risk.", "Use subscriber-count/source-owner instrumentation before changing @wordpress/data notification semantics.", "research after local guards",
			"What should a React profiler run answer?", "Only ownership of smaller after-input or whole-cycle cost.", paste0("The Chrome render-event post-dispatch tail is at most ", number(react_profiler_chrome_tail_ms, accuracy = 0.1), "ms and the trace-screenshot tail is ", number(react_profiler_post_tail_ms, accuracy = 0.1), "ms, so profiler output can rank residual commits but should not decide the CI input API or startup wait."), "Profiler captures could still uncover a product optimization unrelated to the 1000ms artifact.", "Capture production-like commit owners after RichText input and after async queue flushes, with the key-held artifact treated as context rather than target.", "useful later"
		)

		write_csv(
			react_profiler_decision_audit,
			file.path(data_dir, "typing-delay-react-profiler-decision-audit.csv")
		)

		react_residual_profiler_plan_audit <- tribble(
			~profiler_question, ~current_answer, ~why_now_or_not, ~measurement_contract, ~invalid_conclusion, ~decision,
			"Should a React profiler run be used for cliff causality?",
			"No.",
			paste0(
				"The input/EventDispatch slice already moves by ",
				number(react_profiler_event_dispatch_ms, accuracy = 0.1),
				"ms, while the largest post-EventDispatch visual/render tail is ",
				number(react_profiler_post_tail_ms, accuracy = 0.1),
				"ms."
			),
			"None for this claim; use the existing input, visual endpoint, useSelect subphase, and idle-queue evidence.",
			"A large commit in a profiled run would not move the observed EventDispatch boundary backward in time.",
			"Closed; do not run profiler to prove the 1000ms cliff.",
			"When should profiler be used after selector guards?",
			"After a concrete selector/subscriber patch changes the fanout shape.",
			"Before that, the profiler would mostly rank consequences of the known store-root fanout rather than decide which invalidation boundary is safe.",
			"Run before/after the exact patch, keep source-level subscriber-owner spans enabled, and attribute commits that start after the input EventDispatch/RichText span or after the async queue flush.",
			"Do not treat reduced commit time as proof that a selector guard is semantically safe; behavior tests and owner spans still decide that.",
			"Useful after the pattern-override patch and later invalidation prototypes.",
			"What should async render-queue profiling measure?",
			"Residual commit ownership after the input, not the low-band cause.",
			paste0(
				"renderQueue.add moves by only ",
				number(react_profiler_render_queue_ms, accuracy = 0.1),
				"ms, and the idle-drain chronology points the wrong way for the cliff."
			),
			"Capture queue insertion, idle callback start/end, commit start/end, and whether each idle flush crosses the following input.",
			"Do not conclude that draining the queue before input explains the fast band; the measured probe already contradicts that.",
			"Profile only for after-input product cost.",
			"What should whole-cycle profiling use as workload?",
			"Representative editing histories, not fixed-x cliff reproduction alone.",
			"The fixed-x benchmark is a stressor for the input artifact; it is not a complete product workload model.",
			"Profile replayed human/plugin-heavy sessions and compare whole-cycle commits against source-level data spans and visual endpoints.",
			"Do not use a profiler result from fixed-x insertion to rank real plugin or composition workloads.",
			"Defer until workload replay exists.",
			"Can profiler answer the public data-subscription question?",
			"No.",
			"Branch-aware or selector-aware notification is a data-layer contract question; profiler commits are downstream symptoms.",
			"Use profiler only after a data notification prototype exists, to check residual component owners and regressions.",
			"Do not use profiler output to justify breaking isLastBlockChangePersistent useSelect notification semantics.",
			"Keep data-contract work separate.",
			"What is the acceptable profiler claim?",
			"Component ownership of secondary after-input or whole-cycle cost.",
			paste0(
				"Chrome render-event tail is at most ",
				number(react_profiler_chrome_tail_ms, accuracy = 0.1),
				"ms and trace-screenshot tail is ",
				number(react_profiler_post_tail_ms, accuracy = 0.1),
				"ms in the current probes."
			),
			"Report commit owners with input-window boundaries, async-queue boundaries, build/profiling mode, and matched source-span IDs.",
			"Do not report profiler commit ownership as the primary cause of the 11-16ms endpoint drop.",
			"Useful later for product optimization."
		)

		write_csv(
			react_residual_profiler_plan_audit,
			file.path(data_dir, "typing-delay-react-residual-profiler-plan-audit.csv")
		)

		react_render_boundary_plot <- react_render_boundary_audit %>%
			filter(claim != "priority queue drained before next input") %>%
			mutate(
				claim_plot = fct_reorder(claim_plot, effect_p50_ms)
		)

	save_plot(
		ggplot(
			react_render_boundary_plot,
			aes(effect_p50_ms, claim_plot, fill = plot_layer)
		) +
			geom_col(width = 0.68, alpha = 0.92) +
			geom_vline(
				xintercept = keyheld_endpoint_drop_reference_ms,
				linetype = "dashed",
				linewidth = 0.45,
				color = "grey35"
			) +
			scale_fill_brewer(type = "qual", palette = "Dark2", name = "Evidence layer") +
			scale_x_continuous(labels = number_format(accuracy = 0.1)) +
			labs(
				title = "React/render child layers are too small to explain the key-held cliff",
				subtitle = paste0(
					"Bars are p50 movement from existing diagnostics; dashed line is the smallest key-held visual endpoint drop (",
					number(keyheld_endpoint_drop_reference_ms, accuracy = 0.1),
					"ms)"
				),
				x = "Largest observed p50 movement supporting that layer (ms)",
				y = NULL
			) +
			guides(fill = guide_legend(nrow = 2)) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"135-react-render-boundary-audit.png",
		width = 12.5,
		height = 8.6
	)
}

human_plugin_workload_contract_audit <- tribble(
	~workload_question, ~current_answer, ~local_evidence, ~remaining_gap, ~replay_contract, ~decision,
	"Can the current fixed-x large-post stressor explain the benchmark artifact?",
	"Yes, for the artifact and source-boundary investigation.",
	"The held-key 1000ms shape is reproduced across visual endpoints, source traces, CPU/QoS controls, and CDP boundary checks in the vanilla large-post fixture.",
	"It is still one repeated character in one Core fixture, not a representative editor workload.",
	"Keep this stressor as a diagnostic benchmark-artifact harness, but do not use it to rank product latency for plugin-heavy or realistic editing sessions.",
	"diagnostic stressor only",
	"Does the large cliff require Gutenberg-scale work?",
	"Yes.",
	"Native contenteditable controls move in the same direction but by less than 1ms; Gutenberg empty and large-post first-input controls amplify idle/system effects by about 4.6ms and 5.7ms; large-post listener totals are higher than empty-post totals.",
	"Which Gutenberg, plugin, theme, and document-shape features amplify the path in realistic sessions.",
	"Replay multiple document shapes with the same spans: empty post, large mixed post, long text-only post, media/pattern-heavy post, and plugin-heavy/P2-like documents.",
	"scale requires workload coverage",
	"Can source prototypes be judged on fixed-x insertion alone?",
	"No.",
	"Selector/subscriber audits identify likely text-update guards, but selection/tree/appender/template surfaces are known risk areas.",
	"Real editing includes selection changes, block insertion/removal, navigation, undo/redo, paste, composition, transforms, and plugin side effects.",
	"Each replay must include behavior assertions and source spans for text input, selection/caret changes, structural edits, async queue work, and visual endpoints before/after any selector/subscriber patch.",
	"use replay before ranking product wins",
	"What should be recorded from human/plugin-heavy sessions?",
	"Per-sample histories, not only aggregate delay buckets.",
	"The current report shows timing depends on event ordering, timer state, system state, API path, document scale, and source fanout.",
	"Without histories, replay cannot tell whether a slow key follows composition, correction, navigation, async work, plugin hooks, or ordinary text insertion.",
	"Record event type, key/text delta, inter-event gap, hold time if available, selection/caret state, block/clientId context, composition state, document size/type mix, plugin/theme set, session age, async queue markers, and source-span/visual endpoint IDs.",
	"history schema first",
	"How should replay decide whether the fixed-x findings generalize?",
	"By stratifying rather than averaging everything into one score.",
	"The fixed-x stressor isolates a known artifact; existing scenario/native controls prove absolute cost depends on fixture and path scale.",
	"Plugin-heavy and long-session workloads may expose different hot owners, async tails, or selection/structure costs.",
	"Report strata for ordinary text bursts, correction/backspace, IME/composition, selection/navigation, block operations, paste/transform, long-session idle return, and plugin-heavy side effects; compare owner rankings and endpoint drops against the fixed-x harness.",
	"stratified replay required",
	"What can CI change before workload replay exists?",
	"Only benchmark-artifact choices and low-risk source patches with focused behavior tests.",
	"The CI input-helper and presentation/runtime/system rows are already bounded locally; product ranking remains workload-limited.",
	"A fixed-x win may not improve, and could regress, realistic sessions if it ignores selection, structure, plugin, or composition paths.",
	"Use fixed-x results to choose measurement semantics and first low-risk patches; use workload replay to prioritize broader product work and React profiler runs.",
	"do not overclaim product coverage"
)

write_csv(
	human_plugin_workload_contract_audit,
	file.path(data_dir, "typing-delay-human-plugin-workload-contract-audit.csv")
)

workload_replay_schema_contract_audit <- tribble(
	~schema_question, ~current_answer, ~local_evidence, ~required_recording_fields, ~required_replay_or_reporting_contract, ~decision,
	"What is the unit of replay?",
	"Per editing event, not per delay bucket or averaged run.",
	"The current artifact depends on event ordering, key state, timer state, source fanout, document scale, and system state; aggregating by delay would erase those causal inputs.",
	"event_id, event_type, key_code_or_text_delta, input_type, is_composing, repeat, timestamp, inter_event_gap_ms, hold_ms_if_available, target_role, clientId, block_name, selection_anchor_focus, and pre/post text or structural delta hashes.",
	"Replay the event sequence in order with recorded gaps where relevant; report metrics per event and per stratum before any aggregate score.",
	"event history is the unit",
	"What document/session context is mandatory?",
	"Enough context to reconstruct the editor state that made the event slow.",
	"Native, empty-post, and large-post controls show that absolute cost changes with fixture scale; listener totals are higher in the large-post path than the empty-post path.",
	"editor_kind, post_type, document_shape, block_count, block_type_histogram, nested_depth, media/pattern counts, selected block context, plugin/theme set, viewport, browser revision, session_age, autosave/REST activity markers, and wp-env/host metadata.",
	"Replay from saved fixtures or generated equivalent fixtures with the same structural strata; do not mix document shapes into one score.",
	"document shape is a stratum",
	"Which strata are the minimum useful set?",
	"Text bursts alone are insufficient.",
	"Selector-guard risks include selection/tree/appender/template surfaces; React profiler usefulness depends on after-input or whole-cycle ownership in real workflows.",
	"ordinary text burst, correction/backspace, IME/composition, selection/caret navigation, long-session idle return, paste, transform, block insert/remove/reorder, media/pattern-heavy editing, and plugin-heavy/P2-like side effects.",
	"Report owner rankings and endpoint deltas separately for each stratum; a win that appears only in fixed-x insertion is not a product ranking result.",
	"stratify before ranking",
	"How should text input be replayed?",
	"Use human-like complete keypress/input semantics by default, with held-key only as an artifact control.",
	"The CI input-helper analysis shows held-key Playwright delay is not a human typing model; 50ms/100ms hold controls exist for realistic hold sensitivity, while complete-keypress-then-wait is the safer human baseline.",
	"recorded keydown/keypress/beforeinput/input/keyup order, inter-key gap, hold duration if available, repeat state, composition boundaries, and text delta.",
	"Replay ordinary text with complete keypress or direct lower-level event sequences that preserve the recorded order; keep held-key delay as a labeled diagnostic control, not the default human replay.",
	"do not replay humans as held keys",
	"What instrumentation must be attached to replay?",
	"Source spans plus visual/user-facing endpoints, not p50 alone.",
	"Existing source audits find high-fanout selector/subscriber owners; visual endpoint probes show when EventDispatch movement reaches RAF, Paint, DrawFrame, and changed pixels.",
	"source-span IDs, Redux/useSelect owner metadata, RichText spans, EventDispatch slices, RAF/render/screenshot or visual endpoint IDs, async queue markers, network/resource markers, and behavior assertion IDs.",
	"Each replay sample must produce owner-ranked source costs and at least one visual or behavior endpoint so source wins cannot hide user-visible regressions.",
	"source plus endpoint required",
	"How should behavior be guarded?",
	"Every replayed stratum needs assertions appropriate to its action class.",
	"The first selector-guard patch is safe only with focused behavior tests; broader provider, inner-block, and BlockListItems guards can stale selection, appender, template, or structural UI.",
	"pre/post serialized block tree hash, selection/caret state, visible block list, appender state, template lock/editing mode, undo level, pattern binding state, plugin-visible side effects, and accessibility-relevant focus state.",
	"Treat a replay result as invalid if behavior assertions fail, even if latency improves.",
	"behavior gates performance",
	"What can be claimed before real histories exist?",
	"Only benchmark-artifact decisions and narrowly tested source patches.",
	"The fixed-x stressor explains the artifact and can guide first low-risk selector patches, but it cannot rank plugin-heavy or human editing latency.",
	"existing fixed-x source spans, compact diagnostic controls, focused unit/e2e behavior tests, and optional synthetic document-shape strata.",
	"Do not claim product latency ranking, plugin-heavy improvement, or real typing improvement until recorded/replayed histories cover the relevant strata.",
	"scope claims to artifact",
	"How should patch acceptance use replay?",
	"Compare before/after by stratum and owner ranking, not a single scalar.",
	"A patch can reduce one fixed-character path while leaving correction, selection, composition, plugin hooks, or async tails unchanged or worse.",
	"per-stratum p50/p90, owner-rank deltas, visual endpoint deltas, behavior assertions, and sample counts for before/after runs.",
	"Accept product claims only when the affected strata improve or stay neutral with passing behavior checks; report regressions separately rather than averaging them away.",
	"stratum-level acceptance"
)

write_csv(
	workload_replay_schema_contract_audit,
	file.path(data_dir, "typing-delay-workload-replay-schema-contract-audit.csv")
)

portability_validation_contract_audit <- tribble(
	~portability_question, ~current_local_answer, ~evidence_already_available, ~remaining_gap, ~validation_contract, ~decision,
	"Are the absolute p50 values portable enough for thresholds?",
	"No.",
	"Fresh-editor, randomized exact, dense n=50, container-fixture, and cross-browser timer-ordering runs preserve the main causal story, but they are all local to this machine family and related browser builds.",
	"How p50, CV, and regime boundaries move across CI runner classes, browser revisions, containers, thermal state, and OS power policy.",
	"Before changing thresholds, rerun a compact score set and diagnostic controls on CI and at least one comparable local/container variant; report both absolute p50 movement and whether qualitative ordering is preserved.",
	"validation required before thresholds",
	"Which compact row set should be portable-validation minimum?",
	"Use discriminating rows, not the full dense sweep.",
	"The report identifies a small set that exercises the major mechanisms: tap/complete-keypress, current CI held key, 990/1000/1010/1300 key-held boundary, 50ms/100ms hold controls, pattern 500ms/1000ms predicate fallback, runtime checkpoint controls, CPU/QoS controls, and visual endpoint controls.",
	"Whether those rows are sufficient on every CI image or browser version.",
	"Run the compact row set first; expand only if a row changes qualitative band, variance, or timer/runtime ordering.",
	"compact validation first",
	"Do fresh/randomized/exact local runs close ordering and setup confounds?",
	"Mostly for local methodology, not for host portability.",
	"Randomized exact Typing runs show 0ms, 1000ms, and 60000ms start waits are within local run-to-run volatility; fresh-editor runs preserve the 990/1000/1010/1300 shape; start-wait placement shows idle-after-setup affects first input.",
	"Whether CI image startup, browser cache state, and runner scheduling produce different first-input and retained-sample behavior.",
	"On CI, run exact-spec randomized blocks with fresh saved/reopened drafts and preserve per-run p50, CV, first-three-key distribution, throwaway policy, and suite elapsed time.",
	"local confounds bounded",
	"Do cross-browser checks make Chrome absolute numbers portable?",
	"No.",
	"Firefox and WebKit timer-timeline runs reproduce the Gutenberg timer ordering qualitatively, but their listener metrics differ from Chromium EventDispatch and WebKit's absolute drop is smaller.",
	"How Chromium version, browser channel, and trace category behavior move the actual Chrome score.",
	"Validate the score on the exact Playwright-bundled Chromium used in CI, then run browser-timeline diagnostics on other engines only as causal portability checks, not as threshold-equivalent scores.",
	"causal portability only",
	"Do container/fixture controls close environment portability?",
	"No.",
	"The Columns container fixture preserves the key-hold versus complete-keypress split, but it is a smaller document fixture, not a host-versus-container isolation experiment.",
	"How Docker/wp-env resource limits, host CPU scheduling, storage, and browser sandboxing affect absolute p50 and CV.",
	"Run the compact score set inside the same wp-env/container shape used by CI and on the local host variant when possible; record CPU model, core count, OS version, browser revision, container limits, and background-load state.",
	"environment metadata required",
	"How should OS power and scheduler sensitivity affect portability claims?",
	"It makes absolute p50 portability especially fragile.",
	"CPU/QoS controls show ordinary/utility CPU and background/maintenance CPU can put the same no-op timer into different latency bands.",
	"Which CI and developer machines are in comparable frequency/residency/QoS states during typing samples.",
	"Pair compact validation with the CPU/QoS counter contract or at least record power mode, thermal pressure if available, process QoS, and background CPU load.",
	"power state must be recorded",
	"What can be merged before portability validation?",
	"Artifact-scoping fixes and low-risk source patches with behavior tests; not new absolute thresholds.",
	"The local report already closes several semantic decisions: do not model human typing with held-key delay; use the fixed-character stressor as diagnostic; keep presentation claims scoped.",
	"Whether the numeric acceptance band for CI should move.",
	"Use local evidence for code-path choice and prototype order; require CI/mac/container/browser validation before changing score thresholds or making absolute latency claims.",
	"separate decisions from thresholds"
)

write_csv(
	portability_validation_contract_audit,
	file.path(data_dir, "typing-delay-portability-validation-contract-audit.csv")
)

portability_validation_runbook_audit <- tribble(
	~validation_question, ~current_answer, ~required_lanes, ~minimum_rows, ~required_metadata, ~expansion_trigger, ~allowed_claim, ~decision,
	"What lanes are required before threshold changes?",
	"At least one CI lane plus one comparable local or container lane; browser alternatives are causal checks, not threshold lanes.",
	"Exact Playwright-bundled Chromium on CI, local host Chromium when available, same wp-env/container shape used by CI, and optional Firefox/WebKit timer-timeline lanes.",
	"Compact discriminating row set only; do not start with the full dense sweep.",
	"CPU model, core count, OS version, browser revision, Playwright version, wp-env/container limits, power mode, thermal pressure if available, process QoS, background load, and git/build identifiers.",
	"Expand to the full dense sweep only if a compact row changes qualitative band, variance class, timer ordering, or visual endpoint direction.",
	"May change absolute thresholds only after CI Chromium and at least one comparable lane preserve qualitative ordering and bound p50/CV movement.",
	"threshold gate",
	"Which score rows are the compact minimum?",
	"Rows should exercise mechanisms, not cover every delay.",
	"All threshold lanes; optional causal lanes use the subset with comparable metrics.",
	"CI current held key, tap/complete-keypress baseline, 990/1000/1010/1300 held-key boundary, 50ms and 100ms hold controls, pattern 500ms and 1000ms readiness rows, runtime checkpoint controls, CPU/QoS controls, and visual endpoint controls.",
	"For each score row, keep retained samples, throwaway count, per-run p50, p10/p90, CV, first-three-key distribution, sample order, and elapsed suite time.",
	"Missing retained-sample policy, first-key behavior, or sample-order data invalidates threshold interpretation.",
	"Can claim qualitative portability only when row ordering and regime labels match across lanes; cannot claim threshold portability from ordering alone.",
	"compact minimum",
	"How should startup/setup confounds be handled?",
	"Local randomized/exact and fresh-editor checks bound setup locally but not on CI.",
	"Repeat exact-spec randomized blocks on CI with fresh saved/reopened drafts and the current no-extra-wait Typing setup.",
	"0ms, 1000ms, and 60000ms start-wait controls where feasible; otherwise a smaller exact-spec 0ms versus current-CI setup pair.",
	"setupReady time, runStart time, first key timing, first-three-key distribution, retained/throwaway policy, resource counts moved before first key, and suite elapsed time.",
	"If first-input behavior or retained run-p50 medians diverge outside local volatility, add CI-specific startup/setup diagnostics before changing thresholds.",
	"May keep local measurement semantics if ordering holds; may not reuse local absolute p50 as a CI threshold.",
	"setup gate",
	"How should browser coverage be interpreted?",
	"Only Playwright-bundled Chromium should set Chrome thresholds; Firefox/WebKit are causal portability checks.",
	"Run Chrome threshold lane first; run Firefox/WebKit timer-timeline diagnostics only to verify timer ordering and broad mechanism direction.",
	"990/1000/1010 timer timeline, listener/input spans where supported, and visual endpoint checks when available.",
	"Browser engine, revision, trace categories, metric definitions, and whether spans are comparable to Chromium EventDispatch.",
	"If Firefox/WebKit preserve timer ordering but not magnitudes, do not use their p50 values for Chromium thresholds; if timer ordering changes, reopen the causal story.",
	"May cite causal portability across engines, not threshold equivalence.",
	"browser scope",
	"How should container and wp-env portability be separated?",
	"The existing Columns fixture is not a host-versus-container isolation experiment.",
	"Run the same compact row set inside the CI-like wp-env/container and on a comparable local host shape when possible.",
	"Same post fixture and same input helper across host/container lanes; include a separate fixture-size control only after host/container comparison.",
	"Docker resource limits, CPU/memory limits, storage backend, network mode, browser sandbox flags, wp-env config, and fixture hash.",
	"If host/container ordering differs, split threshold and product claims by environment before adding new benchmark rows.",
	"May set environment-specific thresholds only for environments with measured validation lanes.",
	"environment gate",
	"How should power and scheduler state affect validation?",
	"It is threshold-critical metadata because CPU/QoS controls can move the same path between slow and fast bands.",
	"Pair the compact row set with lightweight power/QoS metadata; pair suspicious rows with the CPU/QoS counter runset.",
	"At minimum include one no-CPU slow row, one ordinary/utility fast row, one background/maintenance slow row, and one finite-burst decay row when investigating system drift.",
	"Power mode, thermal pressure if available, process QoS, background CPU load, core/frequency/residency counters when available, and browser scheduler markers for suspicious rows.",
	"If p50 movement correlates with power/QoS state, thresholds must be stratified or rerun under controlled state; do not average states together.",
	"May explain drift as environment state only when metadata is present per sample or per run.",
	"power gate",
	"What can change before the runbook is executed?",
	"Measurement semantics and low-risk source patches can proceed; absolute thresholds cannot.",
	"Local source patches with behavior tests, artifact-scoping documentation, and compact diagnostic rows that do not assert new absolute thresholds.",
	"No threshold-moving rows required before these local decisions, but record which local evidence each decision uses.",
	"Patch identity, behavior-test result, benchmark helper semantics, and whether a claim is artifact, source, product, or threshold scoped.",
	"If a change needs a numeric CI acceptance band, this runbook must run first.",
	"May claim local causal or source-path evidence; may not claim portable p50/CV or move CI thresholds.",
	"claim scope"
)

write_csv(
	portability_validation_runbook_audit,
	file.path(data_dir, "typing-delay-portability-validation-runbook-audit.csv")
)

open_question_next_instrumentation_matrix <- tribble(
	~short_label, ~category, ~current_answer_strength, ~next_work_cost, ~impact_score, ~decision, ~current_answer, ~remaining_unknown, ~recommended_next_step,
	"Typing startup wait", "CI engineering", 5, 1, 2, "closed locally", "Change-trigger contract closes the operational question: current Typing has 0ms extra post-setup wait, added waits do not improve retained-q50 stability, first-input/tail questions need a separate statistic, and the five interactive non-Typing sleeps now have their own local 0ms candidate matrix.", "Whether a future CI image, helper family, trace placement, retained/throwaway policy, reported statistic, or non-local runner changes enough to invalidate the exact-spec anchor.", "Do not add a Typing startup wait under the current metric; reopen only on a trigger change. Validate the five interactive non-Typing 0ms candidates on CI/mac/container lanes before changing those sleeps.",
	"Pattern-loading wait", "CI engineering", 5, 3, 4, "predicate validation", "CI validation contract now has to be split by spec: Site Editor loadPatterns has an opt-in getBlockPatterns/resource-quiet predicate path and fixed 500ms is the best local fixed fallback, while a focused Post Editor loadPatterns matrix favors 0ms over the current fixed pre-inserter wait. A generic loadPatterns wait claim hides two different readiness contracts.", "Whether the Site Editor resource-quiet guard or fixed 500ms fallback is stable across CI, macOS versions, containers, and source-path changes; separately, whether the Post Editor 0ms result is portable across CI/mac/container lanes without preview/canvas misses, first-iteration artifacts, or resource movement.", "Validate Site Editor with predicate wait, timeout/fallback, resource movement, endpoint-group, retained-count, preview/canvas, q50 range, and environment telemetry; validate Post Editor 0ms against 1000ms with retained q50, q50 sd, p90/mean, first-iteration behavior, and source/resource telemetry before claiming full loadPatterns wait savings.",
		"Input API phase boundary", "CI engineering", 5, 1, 3, "closed locally", "CI helper decision contract closes the practical boundary: type() and pressSequentially are the same helper family when target/options match, ordinary locator.press is only a checkpoint control, helper-family switches are metric-definition changes, and realistic hold choices must be scoped inside the selected helper.", "Only the lower-level Playwright/Chromium runtime mechanism remains: progress.wait versus harness setTimeout, utility-world focus/checkpoint work, and their scheduler interaction.", "No more broad API-boundary sweeps; if the suite changes helper spelling, run one exact CI-settings check, and if it changes helper family, treat it as a new metric definition.",
	"Low-risk selector guards", "product optimization", 5, 2, 4, "first row source-span confirmed", "The pattern-override selected-only patch is implemented locally and now has a rebuilt all-data-spans microscope result: the editor-side support-check useSelect appears as one selected metadata entry, and the selected ControlsWithStoreSubscription path appears as one metadata entry. A source-map residual audit shows the remaining hot owners are BlockListBlockProvider, BlockListItems, and useInnerBlocksProps; the next-prototype and store-signal audits show that Provider and useInnerBlocksProps need explicit private revision or affected-set keys, not just existing broad selectors.", "Aggregate before/after p50 for the pattern patch if a production magnitude claim is needed, plus implementation evidence that the provider and inner-block prototypes preserve public filter props, selection/structure/editability/settings invalidation, layout/settings inheritance, and any new private revision/affected-set selector semantics.", "Prototype BlockListBlockProvider first with per-clientId own-block plus selection/structure/settings keys; use lastBlockAttributesChange only as an attribute fast path, not a full contract. Then prototype useInnerBlocksProps with root/order/settings/editability keys, including inherited layout settings.",
		"Store subscriber partition", "product optimization", 5, 4, 5, "research after local guards", "Public-selector and branch-aware compatibility audits narrow the viable paths: keeping the root notification is compatible but no-win, a private useBlockSync side channel is a behavior seam but no-win, an external slot fails subscribed compatibility, and selector-aware or branch-aware @wordpress/data subscriptions are the only compatibility-preserving fanout route found. The branch-aware route must preserve dynamic store sets, registry-selector cross-store reads, parent registries, late store registration, render/subscription races, async queue cancellation, no-deps withSelect closures, generic stores, shallow-equality semantics, and public store-level subscribe semantics.", "Whether the project accepts a broad data-layer selector/branch-aware subscription prototype, keeps root notification semantics and forgoes the 23.2ms fanout win, or explicitly changes/deprecates public isLastBlockChangePersistent and store-level subscribe notification behavior.", "After local guards, prototype the useBlockSync side channel only as a behavior seam; claim no fanout win until a data-layer notification prototype passes the branch-aware useSelect compatibility matrix plus marker-only source-span gates.",
	"React render ownership", "product optimization", 5, 2, 2, "secondary optimization", "Boundary and residual-profiler audits close React rendering for cliff causality; EventDispatch already contains the primary movement, while renderQueue.add, React external-store listener, selector recompute, and post-EventDispatch rendering are all secondary.", "Only component ownership of residual after-input or whole-cycle cost after a selector guard, store-notification prototype, or workload replay changes the work being attributed.", "Do not profile for the 1000ms cliff; later profiler runs must report commit owners with input-window boundaries, async-queue boundaries, build/profiling mode, and matched source-span IDs.",
		"Chromium runtime checkpoint", "automation/browser", 4, 5, 4, "outside JS harness", "Runtime trace runbook makes the remaining browser-state question concrete: ordinary waits are the slow negative control, repeated Runtime.evaluate/Runtime.callFunctionOn rows are the dose-response control, trace-on captureSnapshot rows isolate the perturbation, and native rows bound browser-only scale.", "Which Chromium renderer/runtime scheduler state is changed by captureSnapshot and repeated runtime-call checkpoints, and whether that state is scheduler queueing, V8/microtask execution, browser input priority, OS power state, or trace observer side effect.", "Run the runtime trace runbook with per-sample protocol-command, scheduler/task-queue, V8/microtask, EventDispatch, source-span, browser revision, trace-category, and observer-configuration alignment; do not add more JS-level delay rows.",
	"CPU/QoS mechanism", "system/browser", 4, 5, 3, "OS counter contract", "Counter-runset audit makes the remaining mechanism test concrete: near-key no-CPU rows are the slow negative control, ordinary/utility rows are the fast policy-visible control, background/maintenance rows are the slow policy contrast, and finite-burst rows test decay; exact hardware/scheduler state remains below this JS harness.", "Exact split between P-core or cluster frequency/residency, Darwin scheduler/QoS placement, cache or memory hierarchy state, timer wakeup behavior, and Chromium scheduler state.", "Run that row set with per-sample OS scheduler, power, hardware-counter, browser scheduler, and source-span alignment before adding more JS benchmark rows.",
	"Calibrated presentation", "user-facing measurement", 5, 5, 4, "external calibration contract", "External-calibration runbook closes the claim boundary: Chromium-internal endpoints already align across RAF, Paint, DrawFrame, changed screenshots, and localized pixels, while compositor/display/OCR/camera claims require the same 990ms/1000ms/1300ms held-key and complete-keypress controls with observer-effect gates.", "Externally presented frame timestamp and semantic first-visible-glyph timing outside Chromium trace screenshots.", "Run the external calibration runbook only if the report needs hardware/display or semantic glyph timing; otherwise keep claims scoped to Chromium internal visual endpoints.",
	"Human/plugin workload", "workload coverage", 4, 4, 4, "replay contract", "Workload schema audit turns the open item into a concrete replay contract: event histories, document/session context, minimum strata, source spans, visual or behavior endpoints, and behavior assertions are required before ranking real product latency.", "Actual recorded human/plugin-heavy histories and before/after replay results for P2-like, long-session, composition, correction, selection, paste, transform, structural-edit, media/pattern-heavy, and plugin side-effect strata.", "Build the recorder/replayer around the schema contract; report per-stratum owner rankings and endpoint deltas before making product-latency claims.",
	"Portability of absolute numbers", "methodology", 4, 3, 3, "validation contract", "Portability runbook audit separates threshold lanes from causal lanes: use exact Playwright-bundled Chromium on CI plus a comparable local/container lane, compact mechanism rows, environment metadata, and expansion triggers before changing absolute p50/CV claims.", "How compact score rows and key diagnostics move across actual CI runner classes, Playwright Chromium revisions, wp-env/container limits, OS/browser versions, and power/QoS state.", "Run the portability runbook first: compact mechanism rows with per-run p50/CV/order/first-key metadata on CI Chromium and one comparable lane; expand only when ordering, variance, timer, or visual endpoint behavior changes."
) %>%
	mutate(
		category = factor(
			category,
			levels = c(
				"CI engineering",
				"product optimization",
				"automation/browser",
				"system/browser",
				"user-facing measurement",
				"workload coverage",
				"methodology"
			)
		),
		decision = factor(
			decision,
			levels = c(
				"closed locally",
				"validate before change",
				"predicate validation",
				"targeted follow-up only",
				"patch first row",
				"first row implemented",
				"first row source-span confirmed",
				"prototype first",
				"research after local guards",
				"secondary optimization",
				"validation run",
				"validation contract",
				"needs workload data",
				"external calibration",
				"external calibration contract",
				"OS counter contract",
				"replay contract",
				"outside JS harness"
			)
		),
		short_label_wrapped = str_wrap(short_label, 18),
		evidence_band = case_when(
			current_answer_strength >= 5 ~ "strong local answer",
			current_answer_strength >= 4 ~ "bounded locally",
			current_answer_strength >= 3 ~ "partially bounded",
			TRUE ~ "not yet covered"
		),
		next_work_band = case_when(
			next_work_cost >= 5 ~ "different tooling",
			next_work_cost >= 4 ~ "new workload/prototype",
			next_work_cost >= 3 ~ "focused validation",
			TRUE ~ "little/no follow-up"
		),
		plot_x = current_answer_strength + case_when(
			short_label == "Pattern-loading wait" ~ -0.08,
			short_label == "Low-risk selector guards" ~ 0.08,
			short_label == "Chromium runtime checkpoint" ~ 0.08,
			short_label == "Calibrated presentation" ~ -0.08,
			TRUE ~ 0
		),
		plot_y = next_work_cost + case_when(
			short_label == "Pattern-loading wait" ~ -0.08,
			short_label == "Low-risk selector guards" ~ 0.08,
			short_label == "Chromium runtime checkpoint" ~ 0.08,
			short_label == "Calibrated presentation" ~ -0.08,
			TRUE ~ 0
		)
	)

write_csv(
	open_question_next_instrumentation_matrix,
	file.path(data_dir, "typing-delay-open-question-next-instrumentation-matrix.csv")
)

save_plot(
	ggplot(
		open_question_next_instrumentation_matrix,
		aes(
			plot_x,
			plot_y,
			color = category,
			shape = decision,
			size = impact_score
		)
	) +
		geom_point(alpha = 0.9) +
		geom_text(
			aes(label = short_label_wrapped),
			color = "grey20",
			size = 3.1,
			lineheight = 0.9,
			nudge_y = 0.18,
			show.legend = FALSE
		) +
		scale_x_continuous(
			breaks = 1:5,
			limits = c(1.5, 5.35),
			labels = c("1" = "weak", "2" = "low", "3" = "partial", "4" = "bounded", "5" = "strong")
		) +
		scale_y_continuous(
			breaks = 1:5,
			limits = c(0.75, 5.6),
			labels = c("1" = "none", "2" = "small", "3" = "validate", "4" = "prototype", "5" = "new tooling")
		) +
		scale_color_brewer(type = "qual", palette = "Dark2", name = "Question class") +
		scale_shape_manual(
			values = c(
				"closed locally" = 16,
				"validate before change" = 17,
				"predicate validation" = 17,
				"targeted follow-up only" = 13,
				"patch first row" = 0,
				"first row implemented" = 0,
				"first row source-span confirmed" = 0,
				"prototype first" = 15,
				"research after local guards" = 3,
				"secondary optimization" = 7,
				"validation run" = 8,
				"validation contract" = 8,
				"needs workload data" = 4,
				"external calibration" = 18,
				"external calibration contract" = 18,
				"OS counter contract" = 6,
				"replay contract" = 4,
				"outside JS harness" = 1
			)
		) +
		scale_size_area(max_size = 7, breaks = c(2, 3, 4, 5), name = "Decision impact") +
		labs(
			title = "Remaining questions are now mostly validation, product work, or outside the JS harness",
			subtitle = "Current answer strength versus the cost of the next credible measurement or prototype",
			x = "Current answer strength",
			y = "Next work cost",
			shape = "Decision"
		) +
		theme(legend.position = "bottom", legend.box = "vertical"),
	"136-open-question-next-instrumentation-matrix.png",
	width = 12.5,
	height = 8.4
)

pattern_wait_decision_inputs <- c(
	file.path(data_dir, "typing-delay-pattern-readiness-boundary-summary.csv"),
	file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-summary.csv")
)
if (all(file.exists(pattern_wait_decision_inputs))) {
	pattern_readiness_boundary_existing <- read_csv(
		file.path(data_dir, "typing-delay-pattern-readiness-boundary-summary.csv"),
		show_col_types = FALSE
	)
	pattern_short_wait_existing <- read_csv(
		file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-summary.csv"),
		show_col_types = FALSE
	)

	pattern_current_q50 <- pattern_short_wait_existing %>%
		filter(measurement_idle_wait_ms == 1000) %>%
		summarize(current_q50 = median(median_reported_q50_ms, na.rm = TRUE), .groups = "drop") %>%
		pull(current_q50)

	if (length(pattern_current_q50) == 0 || !is.finite(pattern_current_q50)) {
		pattern_current_q50 <- NA_real_
	}

	pattern_wait_decision_audit <- pattern_readiness_boundary_existing %>%
		filter(waitMs %in% pattern_short_wait_existing$measurement_idle_wait_ms) %>%
		left_join(
			pattern_short_wait_existing,
			by = c("waitMs" = "measurement_idle_wait_ms"),
			suffix = c("_probe", "_exact")
		) %>%
		mutate(
			exact_runs = coalesce(exact_runs_exact, exact_runs_probe),
			exact_median_reported_q50_ms = coalesce(median_reported_q50_ms, exact_median_reported_q50_ms),
			exact_run_to_run_q50_sd_ms = coalesce(run_to_run_q50_sd_ms, exact_run_to_run_q50_sd_ms),
			two_branch_saved_vs_1000ms_s = coalesce(two_branch_saved_vs_1000ms_s_exact, two_branch_saved_vs_1000ms_s_probe),
			wait_label = paste0(waitMs, "ms"),
			q50_delta_vs_1000_ms = exact_median_reported_q50_ms - pattern_current_q50,
			within_current_q50_band = abs(q50_delta_vs_1000_ms) <= 15,
			resource_shift_ratio = median_wait_resource_delta / pmax(median_wait_resource_delta + median_measurement_resource_delta, 1),
			decision = case_when(
				waitMs %in% c(0, 100) ~ "reject fixed wait",
				waitMs == 250 ~ "candidate but volatile",
				waitMs == 500 ~ "best fixed local candidate",
				waitMs == 750 ~ "settled but not better",
				waitMs == 1000 ~ "current baseline",
				TRUE ~ "diagnostic only"
			),
			decision_reason = case_when(
				waitMs == 0 ~ "Readiness probe misses the boundary; exact q50 is much slower because setup/resource work is inside the measurement.",
				waitMs == 100 ~ "Some readiness work moves earlier, but the probe still misses the boundary and exact q50 remains high.",
				waitMs == 250 ~ "Probe boundary is hit and q50 matches current, but exact run-to-run q50 sd is the highest among settled fixed waits.",
				waitMs == 500 ~ "Probe boundary is hit, q50 is in the current band, and exact run-to-run q50 sd is lower than the 1000ms baseline.",
				waitMs == 750 ~ "Probe boundary is hit, but the local exact median is higher than both 500ms and 1000ms with only four exact runs.",
				waitMs == 1000 ~ "Current behavior; keeps readiness work before the measured Design / Transform click but pays the full fixed sleep.",
				TRUE ~ "Used only by the diagnostic probe, not the exact short-wait sweep."
			),
			production_predicate_implication = case_when(
				waitMs %in% c(0, 100) ~ "Do not use this as a fixed replacement for site-editor pattern loading.",
				waitMs == 250 ~ "Could be a lower bound for a readiness predicate, but needs CI validation before replacing the sleep.",
				waitMs == 500 ~ "Best local fixed-wait replacement candidate if the benchmark keeps a sleep.",
				waitMs == 750 ~ "No local reason to prefer this over 500ms.",
				waitMs == 1000 ~ "Safe baseline but wastes 10s versus 500ms in the two-branch pattern metric.",
				TRUE ~ "Probe-only row."
			),
			decision = factor(
				decision,
				levels = c(
					"reject fixed wait",
					"candidate but volatile",
					"best fixed local candidate",
					"settled but not better",
					"current baseline",
					"diagnostic only"
				)
			)
		) %>%
		arrange(waitMs)

	write_csv(
		pattern_wait_decision_audit,
		file.path(data_dir, "typing-delay-pattern-readiness-decision-audit.csv")
	)

	if (file.exists(site_pattern_short_wait_runs_path) && file.exists(site_pattern_readiness_probe_samples_path)) {
		pattern_short_wait_runs_existing <- read_csv(site_pattern_short_wait_runs_path, show_col_types = FALSE)
		pattern_probe_samples_existing <- read_csv(site_pattern_readiness_probe_samples_path, show_col_types = FALSE)

		pattern_baseline_q50_values <- pattern_short_wait_runs_existing %>%
			filter(measurement_idle_wait_ms == 1000) %>%
			pull(p50_ms)

		pattern_bootstrap_median_delta <- function(values, baseline_values, seed_offset) {
			if (length(values) == 0 || length(baseline_values) == 0) {
				return(tibble(
					bootstrap_delta_vs_1000_p025_ms = NA_real_,
					bootstrap_delta_vs_1000_median_ms = NA_real_,
					bootstrap_delta_vs_1000_p975_ms = NA_real_
				))
			}

			set.seed(77896 + seed_offset)
			deltas <- replicate(
				20000,
				median(sample(values, length(values), replace = TRUE), na.rm = TRUE) -
					median(sample(baseline_values, length(baseline_values), replace = TRUE), na.rm = TRUE)
			)
			tibble(
				bootstrap_delta_vs_1000_p025_ms = unname(quantile(deltas, 0.025, na.rm = TRUE)),
				bootstrap_delta_vs_1000_median_ms = median(deltas, na.rm = TRUE),
				bootstrap_delta_vs_1000_p975_ms = unname(quantile(deltas, 0.975, na.rm = TRUE))
			)
		}

		pattern_baseline_stats <- tibble(
			baseline_median_q50_ms = median(pattern_baseline_q50_values, na.rm = TRUE),
			baseline_min_q50_ms = min(pattern_baseline_q50_values, na.rm = TRUE),
			baseline_max_q50_ms = max(pattern_baseline_q50_values, na.rm = TRUE),
			baseline_run_to_run_q50_sd_ms = sd(pattern_baseline_q50_values, na.rm = TRUE)
		)

		pattern_probe_boundary_by_wait <- pattern_probe_samples_existing %>%
			mutate(
				wait_resource_plateau = wait_resource_delta >= 18,
				no_active_requests_at_start = activeRequestsAtStart == 0,
				low_measurement_resources = measurement_resource_delta <= 8,
				readiness_boundary_hit = wait_resource_plateau &
					no_active_requests_at_start &
					low_measurement_resources
			) %>%
			group_by(waitMs) %>%
			summarise(
				probe_samples = n(),
				probe_readiness_hits = sum(readiness_boundary_hit),
				probe_readiness_misses = probe_samples - probe_readiness_hits,
				probe_active_requests_at_start_values = paste(activeRequestsAtStart, collapse = ";"),
				probe_wait_resource_delta_values = paste(wait_resource_delta, collapse = ";"),
				probe_measurement_resource_delta_values = paste(measurement_resource_delta, collapse = ";"),
				.groups = "drop"
			)

		pattern_readiness_risk_audit <- pattern_short_wait_runs_existing %>%
			group_by(measurement_idle_wait_ms) %>%
			summarise(
				exact_runs = n(),
				run_q50_values_ms = paste(sprintf("%.1f", p50_ms), collapse = ", "),
				run_q50_values = list(p50_ms),
				median_reported_q50_ms = median(p50_ms, na.rm = TRUE),
				min_reported_q50_ms = min(p50_ms, na.rm = TRUE),
				max_reported_q50_ms = max(p50_ms, na.rm = TRUE),
				run_to_run_q50_sd_ms = sd(p50_ms, na.rm = TRUE),
				.groups = "drop"
			) %>%
			mutate(
				waitMs = measurement_idle_wait_ms,
				bootstrap = map2(
					run_q50_values,
					row_number(),
					~ pattern_bootstrap_median_delta(.x, pattern_baseline_q50_values, .y)
				)
			) %>%
			unnest(bootstrap) %>%
			select(-run_q50_values) %>%
			mutate(.join_key = 1) %>%
			left_join(pattern_baseline_stats %>% mutate(.join_key = 1), by = ".join_key") %>%
			select(-.join_key) %>%
			left_join(pattern_probe_boundary_by_wait, by = "waitMs") %>%
			mutate(
				delta_vs_1000_median_q50_ms = median_reported_q50_ms - baseline_median_q50_ms,
				empirical_range_overlaps_1000_range =
					min_reported_q50_ms <= baseline_max_q50_ms &
					max_reported_q50_ms >= baseline_min_q50_ms,
				empirical_range_disjoint_slower_than_1000 =
					min_reported_q50_ms > baseline_max_q50_ms,
				runs_above_1000_median = map2_int(
					str_split(run_q50_values_ms, ", "),
					baseline_median_q50_ms,
					~ sum(as.numeric(.x) > .y)
				),
				runs_above_1000_max = map2_int(
					str_split(run_q50_values_ms, ", "),
					baseline_max_q50_ms,
					~ sum(as.numeric(.x) > .y)
				),
				q50_sd_ratio_vs_1000 = run_to_run_q50_sd_ms / baseline_run_to_run_q50_sd_ms,
				open_question_status = case_when(
					waitMs %in% c(0, 100) ~ "closed: do not use as fixed wait",
					waitMs == 250 ~ "open: predicate lower-bound only",
					waitMs == 500 ~ "open: best local fixed fallback",
					waitMs == 750 ~ "closed: no advantage over 500ms",
					waitMs == 1000 ~ "closed: current safe baseline",
					TRUE ~ "diagnostic only"
				),
				deeper_interpretation = case_when(
					waitMs == 0 ~ "All exact q50s are slower than the 1000ms empirical range and every probe sample misses the readiness boundary.",
					waitMs == 100 ~ "All exact q50s are slower than the 1000ms empirical range and every probe sample misses the readiness boundary.",
					waitMs == 250 ~ "The probe boundary is hit, but one exact run is above the 1000ms empirical max and run-to-run q50 sd is the highest settled value.",
					waitMs == 500 ~ "All exact q50s stay inside or below the 1000ms empirical range with the lowest settled run-to-run q50 sd.",
					waitMs == 750 ~ "It is settled locally but slower than 500ms and saves less runtime, so it does not answer a remaining decision question.",
					waitMs == 1000 ~ "This is the existing safe boundary; the remaining question is whether a semantic predicate can replace the blind sleep.",
					TRUE ~ "Diagnostic row only."
				)
			) %>%
			select(
				waitMs,
				exact_runs,
				run_q50_values_ms,
				median_reported_q50_ms,
				min_reported_q50_ms,
				max_reported_q50_ms,
				run_to_run_q50_sd_ms,
				delta_vs_1000_median_q50_ms,
				bootstrap_delta_vs_1000_p025_ms,
				bootstrap_delta_vs_1000_median_ms,
				bootstrap_delta_vs_1000_p975_ms,
				empirical_range_overlaps_1000_range,
				empirical_range_disjoint_slower_than_1000,
				runs_above_1000_median,
				runs_above_1000_max,
				q50_sd_ratio_vs_1000,
				probe_samples,
				probe_readiness_hits,
				probe_readiness_misses,
				probe_active_requests_at_start_values,
				probe_wait_resource_delta_values,
				probe_measurement_resource_delta_values,
				open_question_status,
				deeper_interpretation
			) %>%
			arrange(waitMs)

		write_csv(pattern_readiness_risk_audit, site_pattern_readiness_risk_audit_path)
	}

	pattern_readiness_predicate_candidates <- tribble(
		~candidate, ~classification, ~evidence, ~risk, ~recommended_action,
		"Fixed 0ms or 100ms wait", "reject", "Probe boundary hit rate is 0%; exact q50 is 96-146ms slower than the 1000ms baseline.", "Moves background pattern/resource work into the measured interval.", "Do not use for site-editor pattern loading.",
		"Fixed 250ms wait", "possible but volatile", "Probe boundary hit rate is 100% and exact q50 matches the 1000ms band, but q50 sd is 35.6ms.", "May sit too close to the readiness boundary on slower CI hosts.", "Validate in CI/container before considering.",
		"Fixed 500ms wait", "best fixed local candidate", "Probe boundary hit rate is 100%; exact q50 is 10.3ms lower than the 1000ms baseline with lower q50 sd.", "Still a blind sleep and may not track readiness on other hosts.", "Use only after CI/mac/container validation, or as a fallback cap for a predicate.",
		"Current fixed 1000ms wait", "safe baseline", "Probe boundary hit rate is 100% and exact q50 is in the settled band.", "Pays 10s more than 500ms for this two-branch metric.", "Keep until a predicate or validated shorter fixed wait replaces it.",
		"State predicate before Design / Transform click", "preferred prototype", "The intended boundary is block-pattern data readiness, not preview-canvas rendering.", "Needs a correct semantic predicate and timeout fallback.", "Wait for block-pattern resolution before the user action; keep preview rendering inside measurement.",
		"Resource quiet window only", "diagnostic support", "Resource counts explain the local boundary, but are not a stable product contract.", "Hard-codes host/network behavior and can mask the measured workload.", "Use only as a guardrail or validation signal, not the primary predicate.",
		"Wait for preview canvases", "invalid predicate", "The current measured workload includes named preview canvases rendering after the click.", "Would remove the actual pattern-loading work from the benchmark.", "Do not use as the readiness predicate."
	)

	write_csv(
		pattern_readiness_predicate_candidates,
		file.path(data_dir, "typing-delay-pattern-readiness-predicate-candidates.csv")
	)

		pattern_readiness_source_predicate_audit <- tribble(
			~predicate_component, ~classification, ~semantic_fit_score, ~measurement_boundary_risk_score, ~implementation_risk_score, ~evidence_strength_score, ~source_evidence, ~recommended_check,
			"Block-pattern REST resolution", "primary predicate", 5, 1, 2, 5, "core-data getBlockPatterns resolves /wp/v2/block-patterns/patterns; PostTransformPanel useAvailablePatterns reads getBlockPatterns before the Design panel opens.", "Before the Design / Transform click, wait for core hasFinishedResolution('getBlockPatterns') and a non-empty compatible pattern list.",
		"Design panel open event", "measurement start boundary", 5, 1, 1, 5, "site-editor.spec.js starts the timer before clicking Design / Transform, so the click and preview rendering are inside the measured interval.", "Keep this as the start of the measured user action, not as a readiness predicate.",
		"Pattern preview canvases", "invalid pre-wait", 1, 5, 3, 5, "site-editor.spec.js waits for named option preview canvases after the click; BlockPatternsList renders BlockPreview.Async children only when the PanelBody is opened.", "Do not wait for preview canvases before starting the metric.",
		"core/pattern placeholder replacement", "invalid pre-wait", 1, 5, 3, 5, "site-editor.spec.js waits until [data-type='core/pattern'] is gone after the click.", "Do not wait for placeholder replacement before starting the metric.",
		"Block-pattern category resolution", "optional guardrail", 2, 1, 2, 3, "use-block-editor-settings resolves getBlockPatternCategories for broader editor settings, but PostTransformPanel's template list uses patterns, current theme, and editor settings rather than categories.", "Only include if the goal is to preserve broad editor background readiness, not because this measured path needs it.",
		"User pattern category resolution", "not needed for this path", 1, 1, 3, 3, "use-block-editor-settings also resolves getUserPatternCategories, but the current site-editor Transform/Design template path is theme/template-pattern based.", "Do not make this part of the primary predicate for this benchmark.",
		"Resource quiet window", "diagnostic guardrail", 2, 3, 3, 4, "The local probe shows 19 wait-side resources before the q50 band settles, but resource counts are host- and cache-dependent.", "Use as an optional short guardrail after the semantic predicate or as validation telemetry.",
		"Fixed 500ms sleep", "fallback", 2, 2, 1, 4, "The exact local sweep keeps the 1000ms q50 band and lowers q50 sd, but it is still a blind sleep.", "Use only as a fallback cap or after CI/mac/container validation.",
			"Fixed 1000ms sleep", "current baseline", 1, 1, 1, 4, "Current benchmark behavior; preserves the existing boundary at the cost of 10s versus 500ms in the two-branch pattern metric.", "Keep until the semantic predicate or a validated shorter fixed wait replaces it."
		) %>%
			mutate(
				predicate_component = factor(predicate_component, levels = predicate_component),
			classification = factor(
				classification,
				levels = c(
					"primary predicate",
					"measurement start boundary",
					"optional guardrail",
					"diagnostic guardrail",
					"fallback",
					"current baseline",
					"not needed for this path",
					"invalid pre-wait"
				)
			),
			label = str_wrap(predicate_component, 16),
			plot_x = semantic_fit_score + case_when(
				predicate_component == "core/pattern placeholder replacement" ~ 0.18,
				predicate_component == "Fixed 1000ms sleep" ~ -0.16,
				TRUE ~ 0
			),
			plot_y = measurement_boundary_risk_score + case_when(
				predicate_component == "core/pattern placeholder replacement" ~ -0.18,
				predicate_component == "Fixed 1000ms sleep" ~ 0.16,
				TRUE ~ 0
			)
		)

		write_csv(
			pattern_readiness_source_predicate_audit,
			file.path(data_dir, "typing-delay-pattern-readiness-source-predicate-audit.csv")
		)

		pattern_readiness_prototype_audit <- tribble(
			~prototype_step, ~classification, ~source_evidence, ~recommended_check, ~remaining_risk,
			"Trigger the core-data resolver", "required", "core-data getBlockPatterns has a resolver that fetches /wp/v2/block-patterns/patterns and receive-dispatches blockPatterns.", "Before the measured click, call resolveSelect('core').getBlockPatterns() or otherwise trigger select('core').getBlockPatterns().", "If this is skipped, hasFinishedResolution can be false because the resolver was never requested in the current fresh editor sample.",
			"Use the no-argument resolution key", "required", "The provider-side selectBlockPatternsKey checks hasFinishedResolution('getBlockPatterns') with no args.", "Check select('core').hasFinishedResolution('getBlockPatterns') for the no-argument selector.", "Passing an argument array would check a different resolution key.",
			"Check a compatible non-empty pattern list", "primary predicate", "PostTransformPanel useAvailablePatterns merges editor settings blockPatterns with core getBlockPatterns, then filters by templateTypes or core/template-part/${area} while excluding core and pattern-directory sources.", "After resolution, read core/editor current post type/id and the edited entity record, merge settings and REST patterns, and require at least one compatible non-excluded pattern.", "A bare resolution-finished check can pass even if the current template has no compatible patterns or source filtering changes.",
			"Preserve the measurement start boundary", "required", "site-editor.spec.js starts timing immediately before clicking Design / Transform and then waits for preview canvases and core/pattern replacement.", "Run the predicate before startTime, then keep startTime immediately before the Design / Transform click.", "Moving startTime after the click or after preview readiness would redefine the metric.",
			"Do not pre-wait preview canvases or core/pattern replacement", "invalid pre-wait", "The spec waits for named option preview canvases and for [data-type='core/pattern'] removal after the click.", "Keep those waits after the click inside the measured interval.", "Pre-waiting them removes the actual workload the metric currently measures.",
			"Use timeout and telemetry", "required guardrail", "The local data supports 500ms as a fixed fallback, while the current 1000ms sleep is the safe baseline.", "Prototype the predicate with a timeout/fallback and record predicate wait time, resolution status, compatible pattern count, and whether fallback was used.", "Without telemetry, CI regressions would look like metric noise rather than predicate misses.",
			"Treat pattern categories as optional", "optional guardrail", "use-block-editor-settings resolves pattern categories for broader editor settings, but the measured Transform/Design template list is built from patterns and current template fields.", "Do not block the primary predicate on categories unless validation shows CI variance tied to category resolution.", "Category readiness can preserve broader setup semantics but is not required by the measured template list path."
		)

		write_csv(
			pattern_readiness_prototype_audit,
			file.path(data_dir, "typing-delay-pattern-readiness-prototype-audit.csv")
		)

		pattern_readiness_ci_validation_contract_audit <- tribble(
			~validation_question, ~current_local_evidence, ~decision_gate, ~telemetry_required, ~pass_condition, ~fail_action, ~scope,
			"Can pure getBlockPatterns replace the fixed wait?",
			"Rejected locally: median predicate wait is 0.15ms, 0 resources move before the timer, about 25 resources remain inside measurement, and run q50 stays closer to fixed 0ms than fixed 500ms or 1000ms.",
			"Only reconsider if a different host shows the pure predicate moving the same setup-resource boundary that fixed waits move.",
			"predicate wait time, hasFinishedResolution status, compatible pattern count, resources before timer, resources during measurement, active requests at start, run q50 range",
			"Pure predicate reaches the settled q50 band and moves setup resources before the timer without pre-waiting preview canvases.",
			"Do not use pure getBlockPatterns; keep it only as the semantic first step before a guardrail.",
			"closed locally",
			"Can getBlockPatterns plus resource quiet replace the sleep?",
			"Best predicate-shaped local candidate: median wait is about 301ms, all 30 retained samples satisfy the quiet window, 19 resources move before the timer, 7 remain inside measurement, and median run q50 is 734.6ms.",
			"Validate against fixed 500ms and fixed 1000ms in CI, local macOS, and comparable wp-env/container lanes before changing the benchmark.",
			"quiet window length, quiet elapsed time, timeout/fallback flag, active requests at start, resources before timer, resources during measurement, top resource endpoint groups, run q50 range, run-to-run q50 sd",
			"q50 range overlaps the fixed 1000ms settled band, run-to-run q50 sd is not worse than the fixed baseline, timeout/fallback use is rare and visible, and preview-canvas waits remain inside measurement.",
			"Use fixed 500ms if it validates, otherwise keep fixed 1000ms; do not silently accept timeout-heavy predicate runs.",
			"validation required",
			"Is fixed 500ms an acceptable fallback?",
			"Best local fixed fallback: all exact q50s stay inside or below the 1000ms empirical range, no run is above the 1000ms max, bootstrap delta spans -29.6ms to +12.1ms, and q50 sd is 0.62x the 1000ms baseline.",
			"Use as a fallback only if the same result holds in CI/mac/container lanes and the measured resource boundary matches fixed 1000ms.",
			"per-run q50 values, retained sample counts, missing preview/canvas counts, resources before timer, resources during measurement, active requests at start, environment metadata",
			"Every validation lane keeps fixed 500ms inside the fixed 1000ms q50 band with no preview/canvas misses and no extra variance warning.",
			"Keep fixed 1000ms as the conservative baseline.",
			"fallback validation",
			"Can resource quiet be the product predicate?",
			"No. It explains the local boundary but mostly moves broader REST setup work: categories, navigation, post type, users, taxonomies, navigation fallback, pages, template parts, and menus.",
			"Treat resource quiet as a benchmark guardrail or validation signal, not a semantic product contract.",
			"endpoint-group counts before timer and during measurement, transfer sizes, active request counts, cache state, REST URLs grouped by product subsystem",
			"Resource quiet is allowed only as an engineering guardrail after the semantic pattern predicate, with endpoint details reported.",
			"Do not replace the fixed sleep with an opaque resource-count threshold.",
			"guardrail only",
			"Is a source-specific readiness signal available?",
			"Not from the current local evidence. The pure block-pattern source predicate does not move the broader setup work that the fixed wait excludes from measurement.",
			"Only pursue a source-specific replacement after mapping the moved REST setup endpoints to the editor source path and deciding that those endpoints are part of the intended pre-measurement readiness boundary.",
			"source owner for each moved endpoint group, resolver/action span IDs, request start/end times, resource endpoint groups, measurement boundary labels",
			"A source-level signal predicts the same resource-drain and q50 boundary as fixed 500ms/1000ms without waiting for preview canvases or measured pattern replacement.",
			"Keep getBlockPatterns plus quiet as the candidate guardrail, or keep a fixed wait.",
			"research optional",
			"Does the validation preserve the metric definition?",
			"The metric currently starts immediately before the Design / Transform click and measures preview canvases plus core/pattern replacement after that click.",
			"Any replacement wait must happen before startTime and must not pre-wait the named preview canvases or core/pattern placeholder replacement.",
			"startTime placement, click timestamp, preview-canvas wait timestamps, core/pattern replacement timestamps, predicate completion timestamp",
			"Predicate completion happens before startTime, while preview-canvas and core/pattern replacement waits remain after the click inside the measured interval.",
			"Reject the replacement because it redefines the Loading Patterns metric.",
			"measurement guard"
		)

		write_csv(
			pattern_readiness_ci_validation_contract_audit,
			file.path(data_dir, "typing-delay-pattern-readiness-ci-validation-contract-audit.csv")
		)

		pattern_loading_wait_scope_split_audit <- tribble(
			~spec_metric, ~source_reference, ~current_wait_surface, ~wait_occurrences_per_branch, ~retained_samples, ~two_branch_wait_s, ~readiness_mode_available, ~workload_shape, ~current_evidence, ~next_validation, ~risk_score, ~decision,
			"site-editor loadPatterns",
			"test/performance/specs/site-editor.spec.js:20-33,90-341,645-735",
			"`waitForPatternReadiness()` before Design / Transform click; default mode is fixed 1000ms, opt-in modes are block-patterns and block-patterns-resource-quiet.",
			10,
			10,
			20,
			"implemented opt-in predicate",
			"Fresh Site Editor visit per sample; waits before opening the measured Design / Transform panel; measured interval includes preview canvases and core/pattern replacement.",
			"Pure getBlockPatterns is rejected locally; getBlockPatterns plus 100ms resource quiet waits about 301ms and matches the settled resource boundary; fixed 500ms is the best local fixed fallback.",
			"Validate block-patterns-resource-quiet and fixed 500ms against fixed 1000ms on CI, macOS, and container lanes with readiness telemetry, resource movement, preview/canvas misses, q50 range, and q50 sd.",
			4,
			"predicate validation",
			"post-editor loadPatterns",
			"test/performance/specs/post-editor.spec.js:645-820",
			"Fixed `MEASUREMENT_IDLE_WAIT_MS` before opening the global inserter on every iteration; no pattern-readiness predicate or readiness telemetry is wired here.",
			11,
			10,
			22,
			"not implemented",
			"One editor instance with injected local `__experimentalAdditionalBlockPatterns`; waits before opening the inserter, then measures clicking the local Test pattern category and waiting for preview canvases' first blocks.",
			"Separate local matrix with eight runs per wait shows no q50 or stability reason to keep the fixed wait: 0ms median run q50 is 345.6ms with 1.8ms run-to-run q50 sd, while 1000ms is 349.5ms with 2.4ms sd.",
			"Validate Post Editor loadPatterns 0ms versus 1000ms on CI/mac/container lanes with retained q50, run-to-run q50 sd, p90/mean, preview/canvas misses, first-iteration behavior, and source/resource telemetry before removing the wait in CI.",
			5,
			"CI validation required",
			"shared metric name",
			"test/performance/config/performance-reporter.ts:36,116",
			"Both specs append to `results.loadPatterns`, and the reporter curates each suite by q25/q50/q75.",
			21,
			20,
			42,
			"metric-name collision",
			"The same metric key hides two different setup/readiness contracts when discussing a generic 'pattern-loading wait'.",
			"Combining the two without spec labels would overstate the portability of the Site Editor predicate and understate the remaining Post Editor validation.",
			"Keep Site Editor and Post Editor rows separate in CI validation and runtime-savings claims.",
			5,
			"split reporting required",
			"other non-Typing sleeps",
			"test/performance/specs/post-editor.spec.js:361-640",
			"Focus, List View, Inserter open/search/hover also use `MEASUREMENT_IDLE_WAIT_MS`, but they are not pattern-readiness waits.",
			55,
			60,
			110,
			"not pattern-related",
			"Selection, list-view, and inserter interaction metrics now have a local eight-run 0ms-versus-1000ms matrix; all five are faster and less volatile at 0ms locally.",
			"Pattern-loading evidence should not be used to remove these sleeps.",
			"Validate the five interaction-metric 0ms candidates on CI/mac/container lanes before changing these waits.",
			3,
			"out of pattern scope"
		) %>%
			mutate(
				decision = factor(
					decision,
					levels = c(
						"predicate validation",
						"CI validation required",
						"separate validation required",
						"split reporting required",
						"out of pattern scope"
					)
				)
			)

		write_csv(
			pattern_loading_wait_scope_split_audit,
			file.path(data_dir, "typing-delay-pattern-loading-wait-scope-split-audit.csv")
		)

		pattern_loading_wait_scope_split_summary <- pattern_loading_wait_scope_split_audit %>%
			summarize(
				site_editor_two_branch_wait_s = two_branch_wait_s[spec_metric == "site-editor loadPatterns"],
				post_editor_two_branch_wait_s = two_branch_wait_s[spec_metric == "post-editor loadPatterns"],
				combined_load_patterns_two_branch_wait_s = two_branch_wait_s[spec_metric == "shared metric name"],
				other_nontyping_two_branch_wait_s = two_branch_wait_s[spec_metric == "other non-Typing sleeps"],
				key_conclusion = "Pattern-loading wait is not one contract: Site Editor has an opt-in predicate path, while Post Editor loadPatterns uses injected local patterns and the local matrix now favors removing the fixed wait.",
				recommended_next_step = "Validate Site Editor block-patterns-resource-quiet/fixed-500 against fixed-1000; validate Post Editor loadPatterns 0ms against fixed-1000 in CI/mac/container lanes before claiming full loadPatterns wait savings.",
				.groups = "drop"
			)

		write_csv(
			pattern_loading_wait_scope_split_summary,
			file.path(data_dir, "typing-delay-pattern-loading-wait-scope-split-summary.csv")
		)

		pattern_loading_wait_scope_split_plot <- pattern_loading_wait_scope_split_audit %>%
			filter(spec_metric != "shared metric name") %>%
			mutate(
				spec_metric_wrapped = str_wrap(spec_metric, width = 28),
				spec_metric_wrapped = fct_reorder(spec_metric_wrapped, two_branch_wait_s)
			)

		save_plot(
			ggplot(
				pattern_loading_wait_scope_split_plot,
				aes(
					two_branch_wait_s,
					spec_metric_wrapped,
					color = decision,
					shape = decision,
					size = risk_score
				)
			) +
				geom_point(alpha = 0.92) +
				scale_color_brewer(type = "qual", palette = "Dark2", name = "Decision") +
				scale_shape_manual(
					values = c(
						"predicate validation" = 16,
						"CI validation required" = 17,
						"separate validation required" = 17,
						"split reporting required" = 15,
						"out of pattern scope" = 3
					),
					name = "Decision"
				) +
				scale_size_area(max_size = 7, breaks = 3:5, name = "Risk") +
				scale_x_continuous(labels = label_number(suffix = "s")) +
				labs(
					title = "Pattern-loading wait must be split by spec",
					subtitle = "Site Editor has a predicate path; Post Editor now has a local 0ms candidate; other non-Typing sleeps are separate",
					x = "Two-branch fixed-wait exposure at current 1000ms wait",
					y = NULL
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"156-pattern-loading-wait-scope-split.png",
			width = 12,
			height = 5.8
		)

		save_plot(
			ggplot(
				pattern_readiness_source_predicate_audit,
			aes(
				plot_x,
				plot_y,
				color = classification,
				shape = classification,
				size = evidence_strength_score
			)
		) +
			geom_point(alpha = 0.9) +
			geom_text(
				aes(label = label),
				size = 3,
				color = "grey20",
				nudge_y = 0.2,
				lineheight = 0.9,
				show.legend = FALSE
			) +
			scale_x_continuous(
				breaks = 1:5,
				limits = c(0.6, 5.4),
				labels = c("1" = "poor", "2" = "low", "3" = "partial", "4" = "good", "5" = "direct")
			) +
			scale_y_continuous(
				breaks = 1:5,
				limits = c(0.6, 5.65),
				labels = c("1" = "low", "2" = "some", "3" = "medium", "4" = "high", "5" = "invalidates metric")
			) +
			scale_color_brewer(type = "qual", palette = "Set2", name = "Predicate role") +
			scale_shape_manual(
				values = c(
					"primary predicate" = 16,
					"measurement start boundary" = 18,
					"optional guardrail" = 15,
					"diagnostic guardrail" = 17,
					"fallback" = 7,
					"current baseline" = 8,
					"not needed for this path" = 3,
					"invalid pre-wait" = 4
				),
				drop = FALSE
			) +
			scale_size_area(max_size = 8, breaks = 1:5, name = "Source evidence") +
			labs(
				title = "Only block-pattern readiness is a valid pre-click predicate",
				subtitle = "Source audit of candidates for replacing the site-editor pattern-loading fixed sleep",
				x = "Semantic fit for pre-measurement readiness",
				y = "Risk of removing measured pattern-loading work",
				shape = "Predicate role"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"150-site-pattern-readiness-source-predicate-audit.png",
		width = 12.5,
		height = 8.2
	)

	pattern_wait_decision_plot <- pattern_wait_decision_audit %>%
		filter(!is.na(exact_median_reported_q50_ms)) %>%
		mutate(wait_label = factor(wait_label, levels = paste0(sort(waitMs), "ms")))

	save_plot(
		ggplot(
			pattern_wait_decision_plot,
			aes(
				two_branch_saved_vs_1000ms_s,
				exact_median_reported_q50_ms,
				color = readiness_interpretation,
				shape = decision,
				size = exact_run_to_run_q50_sd_ms
			)
		) +
			geom_hline(
				yintercept = pattern_current_q50,
				linetype = "dashed",
				linewidth = 0.4,
				color = "grey45"
			) +
			geom_point(alpha = 0.9) +
			geom_text(
				aes(label = wait_label),
				size = 3.2,
				color = "grey20",
				nudge_y = 15,
				show.legend = FALSE
			) +
			scale_color_brewer(type = "qual", palette = "Dark2", name = "Probe readiness") +
			scale_shape_manual(
				values = c(
					"reject fixed wait" = 4,
					"candidate but volatile" = 17,
					"best fixed local candidate" = 16,
					"settled but not better" = 15,
					"current baseline" = 18,
					"diagnostic only" = 1
				),
				drop = FALSE
			) +
			scale_size_area(max_size = 8, name = "run-to-run q50 sd (ms)") +
			labs(
				title = "500ms is the best local fixed-wait candidate for site-editor pattern loading",
				subtitle = "Exact spec sweep joined to the readiness probe; dashed line is the current 1000ms q50",
				x = "Two-branch explicit-wait time saved versus current 1000ms (s)",
				y = "Exact reported q50, median across runs (ms)",
				shape = "Decision"
			) +
			theme(legend.position = "bottom", legend.box = "vertical"),
		"137-site-pattern-readiness-decision-audit.png",
		width = 12,
		height = 7.6
	)
	}

	post_pattern_wait_matrix <- read_post_pattern_wait_matrix()
	if (!is.null(post_pattern_wait_matrix)) {
		post_pattern_wait_samples <- post_pattern_wait_matrix$samples %>%
			mutate(
				wait_label = factor(
					paste0(measurement_idle_wait_ms, "ms"),
					levels = paste0(sort(unique(measurement_idle_wait_ms)), "ms")
				)
			)
		post_pattern_wait_runs <- post_pattern_wait_matrix$runs %>%
			mutate(
				wait_label = factor(
					paste0(measurement_idle_wait_ms, "ms"),
					levels = paste0(sort(unique(measurement_idle_wait_ms)), "ms")
				)
			)

		write_csv(post_pattern_wait_samples, post_pattern_wait_matrix_samples_path)
		write_csv(post_pattern_wait_runs, post_pattern_wait_matrix_runs_path)

		post_pattern_wait_summary <- post_pattern_wait_runs %>%
			group_by(measurement_idle_wait_ms) %>%
			summarise(
				runs = n(),
				retained_samples_per_run = median(retained_samples),
				total_retained_samples = sum(retained_samples),
				median_run_q50_ms = median(p50_ms, na.rm = TRUE),
				mean_run_q50_ms = mean(p50_ms, na.rm = TRUE),
				run_to_run_q50_sd_ms = sd(p50_ms, na.rm = TRUE),
				median_run_mean_ms = median(mean_ms, na.rm = TRUE),
				median_run_p90_ms = median(p90_ms, na.rm = TRUE),
				median_within_run_sd_ms = median(sd_ms, na.rm = TRUE),
				min_run_q50_ms = min(p50_ms, na.rm = TRUE),
				max_run_q50_ms = max(p50_ms, na.rm = TRUE),
				.groups = "drop"
			) %>%
			mutate(
				two_branch_explicit_wait_s = 22 * measurement_idle_wait_ms / 1000,
				two_branch_saved_vs_1000ms_s = 22 * (1000 - measurement_idle_wait_ms) / 1000
			)

		post_pattern_baseline_q50 <- post_pattern_wait_summary %>%
			filter(measurement_idle_wait_ms == 1000) %>%
			pull(median_run_q50_ms)
		post_pattern_baseline_sd <- post_pattern_wait_summary %>%
			filter(measurement_idle_wait_ms == 1000) %>%
			pull(run_to_run_q50_sd_ms)
		if (length(post_pattern_baseline_q50) == 0 || !is.finite(post_pattern_baseline_q50)) {
			post_pattern_baseline_q50 <- NA_real_
		}
		if (length(post_pattern_baseline_sd) == 0 || !is.finite(post_pattern_baseline_sd)) {
			post_pattern_baseline_sd <- NA_real_
		}

		post_pattern_wait_summary <- post_pattern_wait_summary %>%
			mutate(
				q50_delta_vs_1000ms_ms = median_run_q50_ms - post_pattern_baseline_q50,
				q50_sd_delta_vs_1000ms_ms = run_to_run_q50_sd_ms - post_pattern_baseline_sd,
				local_decision = case_when(
					measurement_idle_wait_ms == 0 ~ "best local candidate",
					measurement_idle_wait_ms == 1000 ~ "current baseline",
					TRUE ~ "no local benefit"
				)
			)
		write_csv(post_pattern_wait_summary, post_pattern_wait_matrix_summary_path)

		save_plot(
			ggplot(post_pattern_wait_runs, aes(wait_label, p50_ms, color = wait_label)) +
				geom_jitter(width = 0.11, height = 0, size = 2.4, alpha = 0.82, show.legend = FALSE) +
				stat_summary(fun = median, geom = "crossbar", width = 0.46, linewidth = 0.35, color = "grey20") +
				scale_color_brewer(type = "qual", palette = "Dark2", drop = FALSE) +
				labs(
					title = "Post-editor pattern loading does not need the fixed wait locally",
					subtitle = "Exact Loading Patterns spec path; eight runs per wait, 10 retained samples per run",
					x = "MEASUREMENT_IDLE_WAIT_MS before opening the inserter",
					y = "Reported loadPatterns q50"
				),
			"157-post-pattern-wait-matrix-q50.png",
			width = 9.2,
			height = 5.8
		)

		post_pattern_wait_tradeoff <- post_pattern_wait_summary %>%
			select(
				measurement_idle_wait_ms,
				two_branch_saved_vs_1000ms_s,
				median_run_q50_ms,
				run_to_run_q50_sd_ms,
				median_run_p90_ms
			) %>%
			pivot_longer(
				cols = c(median_run_q50_ms, run_to_run_q50_sd_ms, median_run_p90_ms),
				names_to = "statistic",
				values_to = "value_ms"
			) %>%
			mutate(
				statistic = factor(
					statistic,
					levels = c("median_run_q50_ms", "median_run_p90_ms", "run_to_run_q50_sd_ms"),
					labels = c("median reported q50", "median reported p90", "run-to-run q50 sd")
				),
				wait_label = factor(
					paste0(measurement_idle_wait_ms, "ms"),
					levels = paste0(sort(unique(measurement_idle_wait_ms)), "ms")
				)
			)

		save_plot(
			ggplot(
				post_pattern_wait_tradeoff,
				aes(two_branch_saved_vs_1000ms_s, value_ms, color = wait_label)
			) +
				geom_point(size = 3.2, alpha = 0.9) +
				geom_text(
					aes(label = wait_label),
					size = 3.1,
					color = "grey20",
					nudge_y = 0.8,
					show.legend = FALSE
				) +
				scale_color_brewer(type = "qual", palette = "Dark2", name = "Wait") +
				scale_x_continuous(labels = label_number(suffix = "s")) +
				facet_wrap(vars(statistic), scales = "free_y", ncol = 1) +
				labs(
					title = "Post-editor pattern wait is pure cost in the local matrix",
					subtitle = "Saving the full 22s two-branch wait does not worsen the reported q50 or q50 volatility here",
					x = "Two-branch fixed-wait time saved versus current 1000ms",
					y = "Metric value"
				) +
				theme(legend.position = "bottom"),
			"158-post-pattern-wait-runtime-reliability.png",
			width = 9.5,
			height = 8.2
		)
	}

	wait_removal_ledger_path <- file.path(data_dir, "typing-delay-open-question-wait-removal-ledger.csv")
	wait_removal_rollup_path <- file.path(data_dir, "typing-delay-open-question-wait-removal-rollup.csv")

	build_wait_removal_ledger <- function() {
		rows <- list()

		if (file.exists(post_interaction_wait_matrix_deltas_path)) {
			post_interaction_deltas_existing <- read_csv(
				post_interaction_wait_matrix_deltas_path,
				show_col_types = FALSE
			)
			rows[[length(rows) + 1]] <- post_interaction_deltas_existing %>%
				transmute(
					metric_group = "Post Editor interactions",
					metric_label,
					candidate = "0ms",
					current_baseline = "1000ms",
					candidate_type = "local 0ms candidate",
					evidence = "8 runs per wait; original screen plus fresh grouped interaction block",
					current_two_branch_wait_s = two_branch_saved_if_zero_wait_s,
					candidate_two_branch_wait_s = 0,
					two_branch_wait_saved_s = two_branch_saved_if_zero_wait_s,
					q50_delta_vs_current_ms = median_q50_delta_0_minus_1000_ms,
					p90_delta_vs_current_ms = p90_delta_0_minus_1000_ms,
					q50_sd_delta_vs_current_ms = q50_sd_delta_0_minus_1000_ms,
					local_result = "0ms lower on q50, mean, p90, and run-to-run q50 sd",
					remaining_gate = "CI/mac/container failure and portability validation"
				)
		}

		if (file.exists(post_pattern_wait_matrix_summary_path)) {
			post_pattern_summary_existing <- read_csv(
				post_pattern_wait_matrix_summary_path,
				show_col_types = FALSE
			)
			post_pattern_candidate <- post_pattern_summary_existing %>%
				filter(measurement_idle_wait_ms == 0)
			post_pattern_baseline <- post_pattern_summary_existing %>%
				filter(measurement_idle_wait_ms == 1000)
			if (nrow(post_pattern_candidate) == 1 && nrow(post_pattern_baseline) == 1) {
				rows[[length(rows) + 1]] <- tibble(
					metric_group = "Post Editor pattern loading",
					metric_label = "post-editor / loadPatterns",
					candidate = "0ms",
					current_baseline = "1000ms",
					candidate_type = "local 0ms candidate",
					evidence = "8 exact runs per wait; 10 retained samples per run",
					current_two_branch_wait_s = post_pattern_baseline$two_branch_explicit_wait_s,
					candidate_two_branch_wait_s = post_pattern_candidate$two_branch_explicit_wait_s,
					two_branch_wait_saved_s = post_pattern_candidate$two_branch_saved_vs_1000ms_s,
					q50_delta_vs_current_ms = post_pattern_candidate$median_run_q50_ms - post_pattern_baseline$median_run_q50_ms,
					p90_delta_vs_current_ms = post_pattern_candidate$median_run_p90_ms - post_pattern_baseline$median_run_p90_ms,
					q50_sd_delta_vs_current_ms = post_pattern_candidate$run_to_run_q50_sd_ms - post_pattern_baseline$run_to_run_q50_sd_ms,
					local_result = "0ms lower on q50 and run-to-run q50 sd in the focused matrix",
					remaining_gate = "CI/mac/container validation with preview/canvas and resource telemetry"
				)
			}
		}

		if (file.exists(site_pattern_short_wait_summary_path)) {
			site_pattern_summary_existing <- read_csv(
				site_pattern_short_wait_summary_path,
				show_col_types = FALSE
			)
			site_pattern_candidate <- site_pattern_summary_existing %>%
				filter(measurement_idle_wait_ms == 500)
			site_pattern_baseline <- site_pattern_summary_existing %>%
				filter(measurement_idle_wait_ms == 1000)
			if (nrow(site_pattern_candidate) == 1 && nrow(site_pattern_baseline) == 1) {
				rows[[length(rows) + 1]] <- tibble(
					metric_group = "Site Editor pattern loading",
					metric_label = "site-editor / loadPatterns",
					candidate = "fixed 500ms",
					current_baseline = "1000ms",
					candidate_type = "fixed fallback candidate",
					evidence = "10 exact 500ms runs and 10 exact 1000ms runs",
					current_two_branch_wait_s = site_pattern_baseline$two_branch_explicit_wait_s,
					candidate_two_branch_wait_s = site_pattern_candidate$two_branch_explicit_wait_s,
					two_branch_wait_saved_s = site_pattern_candidate$two_branch_saved_vs_1000ms_s,
					q50_delta_vs_current_ms = site_pattern_candidate$median_reported_q50_ms - site_pattern_baseline$median_reported_q50_ms,
					p90_delta_vs_current_ms = site_pattern_candidate$median_p90_ms - site_pattern_baseline$median_p90_ms,
					q50_sd_delta_vs_current_ms = site_pattern_candidate$run_to_run_q50_sd_ms - site_pattern_baseline$run_to_run_q50_sd_ms,
					local_result = "500ms stays inside or below the 1000ms q50 range with lower q50 sd",
					remaining_gate = "CI/mac/container validation before replacing the blind sleep"
				)
			}
		}

		if (file.exists(site_pattern_predicate_validation_summary_path)) {
			site_predicate_summary_existing <- read_csv(
				site_pattern_predicate_validation_summary_path,
				show_col_types = FALSE
			)
			site_predicate_candidate <- site_predicate_summary_existing %>%
				filter(condition == "predicate + resource quiet")
			site_predicate_baseline <- site_predicate_summary_existing %>%
				filter(condition == "fixed 1000ms")
			if (nrow(site_predicate_candidate) == 1 && nrow(site_predicate_baseline) == 1) {
				predicate_wait_s <- 20 * site_predicate_candidate$median_readiness_wait_ms / 1000
				rows[[length(rows) + 1]] <- tibble(
					metric_group = "Site Editor pattern loading",
					metric_label = "site-editor / loadPatterns",
					candidate = "predicate + resource quiet",
					current_baseline = "1000ms",
					candidate_type = "semantic predicate candidate",
					evidence = "3 validation runs; not pooled with the 10-run fixed-wait sweep",
					current_two_branch_wait_s = 20,
					candidate_two_branch_wait_s = predicate_wait_s,
					two_branch_wait_saved_s = 20 - predicate_wait_s,
					q50_delta_vs_current_ms = site_predicate_candidate$median_run_p50_ms - site_predicate_baseline$median_run_p50_ms,
					p90_delta_vs_current_ms = NA_real_,
					q50_sd_delta_vs_current_ms = site_predicate_candidate$run_to_run_q50_sd_ms - site_predicate_baseline$run_to_run_q50_sd_ms,
					local_result = "best predicate-shaped local candidate, but only a small validation block",
					remaining_gate = "full CI/mac/container predicate validation with timeout and resource telemetry"
				)
			}
		}

		if (length(rows) == 0) {
			return(NULL)
		}

		bind_rows(rows) %>%
			mutate(
				candidate_type = factor(
					candidate_type,
					levels = c(
						"local 0ms candidate",
						"fixed fallback candidate",
						"semantic predicate candidate"
					)
				),
				metric_label = factor(
					metric_label,
					levels = rev(unique(metric_label))
				),
				q50_delta_label = sprintf("%+.1fms", q50_delta_vs_current_ms),
				saved_label = sprintf("%.1fs", two_branch_wait_saved_s)
			) %>%
			arrange(metric_group, as.character(metric_label), candidate)
	}

	wait_removal_ledger <- build_wait_removal_ledger()
	if (!is.null(wait_removal_ledger)) {
		write_csv(wait_removal_ledger, wait_removal_ledger_path)

		interaction_saved_s <- wait_removal_ledger %>%
			filter(metric_group == "Post Editor interactions") %>%
			summarise(value = sum(two_branch_wait_saved_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		post_pattern_saved_s <- wait_removal_ledger %>%
			filter(metric_group == "Post Editor pattern loading", candidate == "0ms") %>%
			summarise(value = sum(two_branch_wait_saved_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		site_fixed_saved_s <- wait_removal_ledger %>%
			filter(metric_group == "Site Editor pattern loading", candidate == "fixed 500ms") %>%
			summarise(value = sum(two_branch_wait_saved_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		site_predicate_saved_s <- wait_removal_ledger %>%
			filter(metric_group == "Site Editor pattern loading", candidate == "predicate + resource quiet") %>%
			summarise(value = sum(two_branch_wait_saved_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		interaction_current_s <- wait_removal_ledger %>%
			filter(metric_group == "Post Editor interactions") %>%
			summarise(value = sum(current_two_branch_wait_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		post_pattern_current_s <- wait_removal_ledger %>%
			filter(metric_group == "Post Editor pattern loading", candidate == "0ms") %>%
			summarise(value = sum(current_two_branch_wait_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		site_current_s <- wait_removal_ledger %>%
			filter(metric_group == "Site Editor pattern loading", candidate == "fixed 500ms") %>%
			summarise(value = sum(current_two_branch_wait_s, na.rm = TRUE), .groups = "drop") %>%
			pull(value)
		for (name in c(
			"interaction_saved_s",
			"post_pattern_saved_s",
			"site_fixed_saved_s",
			"site_predicate_saved_s",
			"interaction_current_s",
			"post_pattern_current_s",
			"site_current_s"
		)) {
			if (length(get(name)) == 0 || !is.finite(get(name))) {
				assign(name, 0)
			}
		}
		current_total_wait_s <- interaction_current_s + post_pattern_current_s + site_current_s
		conservative_saved_s <- interaction_saved_s + post_pattern_saved_s + site_fixed_saved_s
		predicate_saved_s <- interaction_saved_s + post_pattern_saved_s + site_predicate_saved_s

		wait_removal_rollup <- tribble(
			~scenario, ~current_two_branch_wait_s, ~candidate_two_branch_wait_s, ~two_branch_wait_saved_s, ~validation_status,
			"Current fixed waits", current_total_wait_s, current_total_wait_s, 0, "baseline",
			"Local candidates plus fixed 500ms Site fallback", current_total_wait_s, current_total_wait_s - conservative_saved_s, conservative_saved_s, "best conservative local candidate set; needs CI/mac/container validation",
			"Local candidates plus Site predicate", current_total_wait_s, current_total_wait_s - predicate_saved_s, predicate_saved_s, "higher-upside predicate path; needs fuller validation"
		) %>%
			mutate(
				wait_removed_pct = two_branch_wait_saved_s / current_two_branch_wait_s,
				scenario = factor(scenario, levels = scenario)
			)
		write_csv(wait_removal_rollup, wait_removal_rollup_path)

		save_plot(
			ggplot(
				wait_removal_ledger,
				aes(two_branch_wait_saved_s, metric_label, color = candidate_type, shape = candidate_type)
			) +
				geom_vline(xintercept = 0, color = brewer_color("Greys", 6, type = "seq", n = 9), linewidth = 0.35) +
				geom_point(size = 3.3, alpha = 0.9) +
				geom_text(aes(label = saved_label), nudge_x = 1.8, size = 2.8, color = "grey20", show.legend = FALSE) +
				scale_color_brewer(type = "qual", palette = "Dark2", name = "Candidate type") +
				scale_shape_manual(
					values = c(
						"local 0ms candidate" = 16,
						"fixed fallback candidate" = 17,
						"semantic predicate candidate" = 15
					),
					name = "Candidate type",
					drop = FALSE
				) +
				scale_x_continuous(labels = label_number(suffix = "s"), expand = expansion(mult = c(0.02, 0.18))) +
				labs(
					title = "Most remaining non-Typing fixed-wait savings are locally isolated",
					subtitle = "Each point is a local candidate against the current 1000ms baseline; Site Editor has two alternative candidates",
					x = "Two-branch explicit wait saved",
					y = NULL
				) +
				theme(legend.position = "bottom"),
			"161-open-question-wait-removal-ledger.png",
			width = 11,
			height = 6.8
		)

		wait_removal_tradeoff <- wait_removal_ledger %>%
			mutate(
				q50_sd_delta_abs = abs(q50_sd_delta_vs_current_ms),
				metric_label = fct_reorder(metric_label, two_branch_wait_saved_s)
			)

		save_plot(
			ggplot(
				wait_removal_tradeoff,
				aes(two_branch_wait_saved_s, q50_delta_vs_current_ms, color = candidate_type, shape = candidate_type)
			) +
				geom_hline(yintercept = 0, color = brewer_color("Greys", 6, type = "seq", n = 9), linewidth = 0.35, linetype = "dashed") +
				geom_point(aes(size = q50_sd_delta_abs), alpha = 0.88) +
				geom_text(aes(label = q50_delta_label), nudge_y = -2.0, size = 2.7, color = "grey20", show.legend = FALSE) +
				scale_color_brewer(type = "qual", palette = "Dark2", name = "Candidate type") +
				scale_shape_manual(
					values = c(
						"local 0ms candidate" = 16,
						"fixed fallback candidate" = 17,
						"semantic predicate candidate" = 15
					),
					name = "Candidate type",
					drop = FALSE
				) +
				scale_size_area(max_size = 6, name = "|q50 sd delta|") +
				scale_x_continuous(labels = label_number(suffix = "s")) +
				labs(
					title = "Local wait-removal candidates do not show a q50 penalty",
					subtitle = "Negative q50 deltas mean the candidate is faster than the current 1000ms baseline",
					x = "Two-branch explicit wait saved",
					y = "Candidate q50 minus current q50"
				) +
				theme(legend.position = "bottom", legend.box = "vertical"),
			"162-open-question-wait-removal-tradeoff.png",
			width = 11,
			height = 6.8
		)

		wait_removal_rollup_plot <- wait_removal_rollup %>%
			select(scenario, candidate_two_branch_wait_s, two_branch_wait_saved_s) %>%
			pivot_longer(
				cols = c(candidate_two_branch_wait_s, two_branch_wait_saved_s),
				names_to = "component",
				values_to = "seconds"
			) %>%
			mutate(
				component = factor(
					component,
					levels = c("two_branch_wait_saved_s", "candidate_two_branch_wait_s"),
					labels = c("wait saved", "wait remaining")
				),
				value_label = sprintf("%.1fs", seconds)
			)

		save_plot(
			ggplot(wait_removal_rollup_plot, aes(scenario, seconds, fill = component)) +
				geom_col(width = 0.65, alpha = 0.92) +
				geom_text(
					aes(label = if_else(seconds > 0, value_label, "")),
					position = position_stack(vjust = 0.5),
					size = 3.0,
					color = "grey15"
				) +
				scale_fill_brewer(type = "qual", palette = "Set2", name = "Two-branch wait") +
				scale_y_continuous(labels = label_number(suffix = "s")) +
				labs(
					title = "The local wait-removal envelope is about 142s to 146s per two-branch comparison",
					subtitle = "Current non-Typing fixed-wait exposure in these rows is 152s; the Site Editor choice determines the last few seconds",
					x = NULL,
					y = "Two-branch explicit wait"
				) +
				theme(axis.text.x = element_text(angle = 12, hjust = 1), legend.position = "bottom"),
			"163-open-question-wait-removal-rollup.png",
			width = 10.5,
			height = 6.8
		)
	}

	message("Wrote plots to: ", figure_dir)
