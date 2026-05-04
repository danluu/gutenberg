#!/usr/bin/env Rscript

suppressPackageStartupMessages({
	library(tidyverse)
	library(jsonlite)
})

args <- commandArgs(trailingOnly = FALSE)
file_arg <- "--file="
script_path <- sub(file_arg, "", args[grepl(file_arg, args)][1])
repo_root <- if (!is.na(script_path)) {
	normalizePath(file.path(dirname(script_path), "../../.."))
} else {
	normalizePath(".")
}

data_dir <- file.path(repo_root, "test/performance/reports/typing-delay-benchmark/data")
artifact_dir <- file.path(repo_root, "test/performance/artifacts")
dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)

target_delays <- seq(1450, 1600, by = 10)

quant <- function(x, p) {
	values <- sort(x[is.finite(x)])
	if (length(values) == 0) {
		return(NA_real_)
	}
	as.numeric(quantile(values, probs = p, names = FALSE, type = 7))
}

newest_json <- function(dir) {
	if (!dir.exists(dir)) {
		return(NA_character_)
	}
	files <- list.files(dir, pattern = "^typing-delay-benchmark-[0-9]+\\.json$", full.names = TRUE)
	if (length(files) == 0) {
		return(NA_character_)
	}
	files[order(file.info(files)$mtime, decreasing = TRUE)][1]
}

raw_run_records <- function(run_id, run_label, scenario_label, raw_dir) {
	json_path <- newest_json(file.path(artifact_dir, raw_dir))
	if (is.na(json_path)) {
		stop("Missing raw JSON for ", run_id, " in ", raw_dir, call. = FALSE)
	}

	raw <- fromJSON(json_path, simplifyVector = TRUE)
	raw$records %>%
		as_tibble() %>%
		filter(!isThrowaway, delayMs %in% target_delays) %>%
		transmute(
			run_id = run_id,
			run_label = run_label,
			scenario_label = scenario_label,
			source = "new focused rerun",
			delay_ms = delayMs,
			sample_index = sampleIndex,
			latency_ms = latencyMs,
			keydown_ms = keydownMs,
			keypress_ms = keypressMs,
			keyup_ms = keyupMs,
			json_path = sub(paste0(repo_root, .Platform$file.sep), "", json_path, fixed = TRUE)
		)
}

historical_records <- read_csv(
	file.path(data_dir, "typing-delay-records.csv"),
	show_col_types = FALSE
) %>%
	filter(
		run_id %in% c("dense_1110_2000", "mode_trace_keyhold", "native_keyhold_timer"),
		!is_throwaway,
		delay_ms %in% target_delays
	) %>%
	mutate(
		run_label = recode(
			run_id,
			dense_1110_2000 = "Original dense 1110-2000ms n=5",
			mode_trace_keyhold = "Original paired trace n=8",
			native_keyhold_timer = "Original native key-hold n=8"
		),
		source = "historical committed run",
		json_path = NA_character_
	) %>%
	transmute(
		run_id,
		run_label,
		scenario_label,
		source,
		delay_ms,
		sample_index,
		latency_ms,
		keydown_ms,
		keypress_ms,
		keyup_ms,
		json_path
	)

focused_records <- bind_rows(
	raw_run_records(
		"dip_focus_gutenberg_n16",
		"Focused Gutenberg 1450-1600ms n=16",
		"large post",
		"typing-delay-1500-dip-gutenberg-keyhold"
	),
	raw_run_records(
		"dip_replication_gutenberg_n5",
		"Same-shape Gutenberg 1110-1600ms n=5",
		"large post",
		"typing-delay-1500-dip-gutenberg-replication"
	),
	raw_run_records(
		"dip_focus_native_n16",
		"Focused native 1450-1600ms n=16",
		"native contenteditable",
		"typing-delay-1500-dip-native-keyhold"
	)
)

samples <- bind_rows(historical_records, focused_records) %>%
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
		)
	) %>%
	arrange(run_label, delay_ms, sample_index)

summary <- samples %>%
	group_by(run_id, run_label, scenario_label, source, delay_ms) %>%
	summarise(
		n = n(),
		latency_p10_ms = quant(latency_ms, 0.1),
		latency_p50_ms = quant(latency_ms, 0.5),
		latency_p90_ms = quant(latency_ms, 0.9),
		keypress_p10_ms = quant(keypress_ms, 0.1),
		keypress_p50_ms = quant(keypress_ms, 0.5),
		keypress_p90_ms = quant(keypress_ms, 0.9),
		json_path = first(na.omit(json_path), default = NA_character_),
		.groups = "drop"
	) %>%
	arrange(run_label, delay_ms)

write_csv(samples, file.path(data_dir, "typing-delay-1500-dip-samples.csv"))
write_csv(summary, file.path(data_dir, "typing-delay-1500-dip-summary.csv"))

cat("Wrote 1500ms dip CSVs to ", data_dir, "\n", sep = "")
