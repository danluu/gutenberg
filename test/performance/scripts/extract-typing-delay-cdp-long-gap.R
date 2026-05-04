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

read_long_gap_run <- function(requested_gap_ms) {
	json_path <- newest_json(file.path(artifact_dir, paste0("typing-delay-cdp-long-gap-", requested_gap_ms)))
	if (is.na(json_path)) {
		stop("Missing raw JSON for long CDP gap ", requested_gap_ms, "ms", call. = FALSE)
	}

	raw <- fromJSON(json_path, simplifyVector = TRUE)
	raw$records %>%
		as_tibble() %>%
		arrange(round, sampleIndex) %>%
		mutate(
			previous_keyup_end_ms = lag(keyupTimestampMs + keyupMs),
			actual_post_keyup_gap_ms = keydownTimestampMs - previous_keyup_end_ms
		) %>%
		filter(!isThrowaway) %>%
		transmute(
			run_id = paste0("cdp_long_gap_", requested_gap_ms),
			input_path = "Raw CDP Input.dispatchKeyEvent",
			delay_mode = "cdp-key-hold",
			requested_post_keyup_gap_ms = requested_gap_ms,
			delay_ms = delayMs,
			round,
			sample_index = sampleIndex,
			delay_sample_index = delaySampleIndex,
			actual_post_keyup_gap_ms,
			latency_ms = latencyMs,
			keydown_ms = keydownMs,
			keypress_ms = keypressMs,
			keyup_ms = keyupMs,
			json_path = sub(paste0(repo_root, .Platform$file.sep), "", json_path, fixed = TRUE)
		)
}

samples <- bind_rows(
	read_long_gap_run(2000),
	read_long_gap_run(5000)
) %>%
	arrange(requested_post_keyup_gap_ms, round, sample_index)

summary <- samples %>%
	group_by(run_id, input_path, delay_mode, requested_post_keyup_gap_ms, delay_ms) %>%
	summarise(
		n = n(),
		actual_post_keyup_gap_p10_ms = quant(actual_post_keyup_gap_ms, 0.1),
		actual_post_keyup_gap_p50_ms = quant(actual_post_keyup_gap_ms, 0.5),
		actual_post_keyup_gap_p90_ms = quant(actual_post_keyup_gap_ms, 0.9),
		keypress_p10_ms = quant(keypress_ms, 0.1),
		keypress_p50_ms = quant(keypress_ms, 0.5),
		keypress_p90_ms = quant(keypress_ms, 0.9),
		latency_p50_ms = quant(latency_ms, 0.5),
		json_path = first(json_path),
		.groups = "drop"
	) %>%
	arrange(requested_post_keyup_gap_ms)

write_csv(samples, file.path(data_dir, "typing-delay-cdp-long-gap-samples.csv"))
write_csv(summary, file.path(data_dir, "typing-delay-cdp-long-gap-summary.csv"))

cat("Wrote long CDP gap CSVs to ", data_dir, "\n", sep = "")
