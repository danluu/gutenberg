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
}

site_pattern_alternating_wait_path <- file.path(data_dir, "typing-delay-site-pattern-alternating-wait-summary.csv")
site_pattern_readiness_probe_samples_path <- file.path(data_dir, "typing-delay-pattern-readiness-probe-samples.csv")
site_pattern_readiness_probe_summary_path <- file.path(data_dir, "typing-delay-pattern-readiness-probe-summary.csv")
site_pattern_readiness_boundary_summary_path <- file.path(data_dir, "typing-delay-pattern-readiness-boundary-summary.csv")
site_pattern_short_wait_runs_path <- file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-runs.csv")
site_pattern_short_wait_summary_path <- file.path(data_dir, "typing-delay-site-pattern-short-wait-exact-summary.csv")

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
ci_hold_duration_artifact_dirs <- c(
	`50ms hold then wait` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-50ms"),
	`100ms hold then wait` = file.path(repo_root, "test/performance/artifacts/typing-delay-ci-hold-duration-100ms")
)
ci_hold_duration_json_paths <- map_chr(ci_hold_duration_artifact_dirs, function(artifact_dir) {
	paths <- Sys.glob(file.path(artifact_dir, "typing-delay-benchmark-*.json"))
	if (length(paths) == 0) {
		return(NA_character_)
	}
	paths[[which.max(file.info(paths)$mtime)]]
})

if (nrow(ci_key_mode_samples) > 0 && all(!is.na(ci_hold_duration_json_paths))) {
	ci_hold_duration_base_samples <- ci_key_mode_samples %>%
		filter(input_mode %in% c("current CI held key", "tap then wait")) %>%
		mutate(
			run_key = case_when(
				input_mode == "current CI held key" ~ "keyboard",
				input_mode == "tap then wait" ~ "between-keys",
				TRUE ~ NA_character_
			),
			requested_hold_ms = case_when(
				input_mode == "current CI held key" ~ delay_ms,
				input_mode == "tap then wait" ~ 0,
				TRUE ~ NA_real_
			),
			effective_hold_ms = requested_hold_ms,
			post_keyup_wait_ms = case_when(
				input_mode == "current CI held key" ~ 0,
				input_mode == "tap then wait" ~ delay_ms,
				TRUE ~ NA_real_
			)
		)

	ci_hold_duration_fixed_samples <- imap_dfr(ci_hold_duration_json_paths, function(json_path, input_mode) {
		raw <- fromJSON(json_path, flatten = TRUE)
		requested_hold_ms <- raw$metadata$keyHoldMs %||% NA_real_
		as_tibble(raw$records) %>%
			transmute(
				input_mode,
				run_key = paste0("hold_", requested_hold_ms),
				delay_mode = raw$metadata$delayMode,
				requested_hold_ms = requested_hold_ms,
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
	}) %>%
		mutate(
			requested_hold_ms = as.numeric(requested_hold_ms),
			effective_hold_ms = pmin(requested_hold_ms, delay_ms),
			post_keyup_wait_ms = pmax(delay_ms - effective_hold_ms, 0)
		)

	ci_hold_duration_samples <- bind_rows(
		ci_hold_duration_base_samples,
		ci_hold_duration_fixed_samples
	)
	write_csv(ci_hold_duration_samples, ci_hold_duration_sample_path)
} else if (file.exists(ci_hold_duration_sample_path)) {
	ci_hold_duration_samples <- read_csv(ci_hold_duration_sample_path, show_col_types = FALSE)
} else {
	ci_hold_duration_samples <- tibble()
}

if (nrow(ci_hold_duration_samples) > 0) {
	ci_hold_duration_retained <- ci_hold_duration_samples %>% filter(!is_throwaway)
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

	write_csv(
		cdp_boundary_consolidated,
		file.path(data_dir, "typing-delay-cdp-boundary-consolidated.csv")
	)
	write_csv(
		cdp_boundary_theory_matrix,
		file.path(data_dir, "typing-delay-cdp-boundary-theory-matrix.csv")
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

		write_csv(
			system_mechanism_matrix,
			file.path(data_dir, "typing-delay-system-mechanism-falsification-matrix.csv")
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

	store_invalidation_contract <- tribble(
		~design_option, ~design_family, ~preserves_persistence_semantics, ~avoids_ordinary_use_select_fanout, ~prototype_risk, ~prototype_order, ~estimated_scope_ms, ~estimated_scope_listener_count, ~source_evidence, ~design_note,
		"Silence MARK_LAST_CHANGE_AS_PERSISTENT", "do not do this", "no", "yes", "invalid", "reject", current_marker_root_subscribe_p50_ms, current_marker_redux_listener_count_p50, "The marker currently wakes thousands of listeners, but useBlockSync reads isLastBlockChangePersistent() and uses the persistence transition to choose onChange vs onInput.", "This would make the benchmark fast by dropping a semantic signal the editor uses.",
		"Local selector guards only", "local guard", "yes", "partial", "low-medium", "first local prototype", estimated_local_guard_ms, 3655, "Hot audited useSelect owners mostly read settings, block identity, tree, or selection state, not text content or isPersistentChange.", "Good first patch class, but it does not fix the store-level wakeup contract.",
		"Persistence-aware side channel for useBlockSync", "subscriber partition", "yes", "yes for persistence-only markers", "medium-high", "store-boundary prototype", current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "The only observed semantic consumer of the marker transition in this path is useBlockSync; audited hot useSelect owners do not read blocks.isPersistentChange.", "Notify persistence-aware subscribers without invalidating ordinary block-editor useSelect subscribers.",
		"Split persistence state from core/block-editor", "store partition", "yes if compatibility wrapper is kept", "yes for persistence-only markers", "high", "after side-channel prototype", current_marker_root_subscribe_p50_ms, current_marker_use_select_count_p50, "The changed branch is only blocks.isPersistentChange, but public selectors expose it through the block-editor store.", "Could keep isLastBlockChangePersistent as a wrapper while storing/versioning persistence separately.",
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

message("Wrote plots to: ", figure_dir)
