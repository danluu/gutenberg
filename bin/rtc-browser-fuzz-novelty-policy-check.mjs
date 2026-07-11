#!/usr/bin/env node

import fs from 'node:fs';

const sourcePath = process.argv[ 2 ];
if ( ! sourcePath ) {
	console.error(
		'usage: rtc-browser-fuzz-novelty-policy-check.mjs <source>'
	);
	process.exit( 2 );
}

let source;
try {
	source = fs.readFileSync( sourcePath, 'utf8' );
} catch ( error ) {
	console.error(
		`unable to read novelty monitor source ${ sourcePath }: ${ error.message }`
	);
	process.exit( 2 );
}

const requiredContracts = [
	{
		name: 'deadline-and-strict-policy-hard-cap',
		pattern:
			/if\s*\(\s*isDeadlineBenchmarkCanaryBudgetCapActive\(\)\s*\|\|\s*STRICT_PRODUCER_BUDGET_CAP\s*\)\s*\{\s*return Math\.min\(\s*groupCount,\s*normalizedBaseLimit\s*\);\s*\}/s,
	},
	{
		name: 'bootstrap-publication-hard-cap',
		pattern:
			/const maxSupervisorGroupPublicationLimit\s*=\s*MAX_ENABLED_GROUPS\s*;/s,
	},
	{
		name: 'steady-state-publication-hard-cap',
		pattern:
			/const supervisorGroupLimit\s*=\s*Math\.min\(\s*baseSupervisorGroupLimit,\s*getPolicyProtectedSupervisorGroupLimit\(/s,
	},
	{
		name: 'enabled-group-budget-hard-cap',
		pattern:
			/const maxEnabledGroupBudgetLimit\s*=\s*MAX_ENABLED_GROUPS\s*;/s,
	},
	{
		name: 'strict-cap-single-owner-rotation',
		pattern:
			/const zeroCoverageRotationGroups\s*=\s*isDeadlineBenchmarkCanaryBudgetCapActive\(\)\s*\|\|\s*STRICT_PRODUCER_BUDGET_CAP\s*\?\s*\[\]\s*:\s*ZERO_COVERAGE_PRIORITY_GROUPS\s*;/s,
	},
	{
		name: 'isolated-overlay-excludes-control-plane',
		pattern:
			/const NOVELTY_GROUP_CONTROL_PLANE_BIN_FILES\s*=\s*new Set\(\s*\[\s*'rtc-browser-fuzz-live-analysis-monitor\.mjs',\s*'rtc-browser-fuzz-novelty-monitor\.mjs',\s*'rtc-browser-fuzz-novelty-policy-check\.mjs',\s*'rtc-browser-fuzz-supervisor\.mjs',\s*\]\s*\)/s,
	},
	{
		name: 'first-green-candidate-compatibility-scope',
		pattern:
			/const CURRENT_FIRST_GREEN_PRODUCT_EVIDENCE_SCOPE\s*=\s*SOURCE_MANIFEST\.candidate_head\s*&&\s*SOURCE_MANIFEST\.state_compatibility_sha256/s,
	},
	{
		name: 'first-green-monotonic-carry',
		pattern:
			/previouslySatisfiedRequiredFirstGreenProductGroups\.has\(\s*group\s*\)\s*\|\|\s*getCurrentOutputSuccessfulGroupRecordCount\(\s*group\s*\)\s*>\s*0/s,
	},
	{
		name: 'first-green-monotonic-consumer',
		pattern:
			/enabled\.has\(\s*group\s*\)\s*&&\s*!\s*satisfiedRequiredFirstGreenProductGroupSet\.has\(\s*group\s*\)/s,
	},
	{
		name: 'first-green-generic-backfill-exclusion',
		pattern:
			/rawOrderedGroups\.filter\(\s*\(\s*group\s*\)\s*=>\s*!\s*satisfiedRequiredFirstGreenProductGroupSet\.has\(\s*group\s*\)/s,
	},
	{
		name: 'first-green-benchmark-closure-carry',
		pattern:
			/function hasBenchmarkCanaryClosureEvidence\(\s*group\s*\)\s*\{\s*if\s*\(\s*hasScopedRequiredProductFirstGreenEvidence\(\s*group\s*\)\s*\)\s*\{\s*return true;/s,
	},
	{
		name: 'stale-head-promotion-blocker-retention',
		pattern:
			/function readBenchmarkCanaryFeedbackRows\(\)[\s\S]*?isBenchmarkCanaryFeedbackFreshForCurrentHead\(\s*row\s*\)\s*\|\|\s*isBenchmarkCanaryFeedbackPromotionBlockedRow\(\s*row\s*\)/s,
	},
	{
		name: 'authoritative-feedback-source-union',
		pattern:
			/sourceRows\.flatMap\(\s*\(\s*row\s*\)\s*=>\s*\[\s*row\.authoritative_feedback_tsv,\s*row\.explicit_feedback_tsv,\s*row\.latest_feedback_tsv,\s*row\.selected_feedback_tsv,/s,
	},
];

const missing = requiredContracts
	.filter( ( contract ) => ! contract.pattern.test( source ) )
	.map( ( contract ) => contract.name );

const exactStackPromotionBlockerBody = source.match(
	/function hasBenchmarkCanaryExactStackPromotionBlocker\(\s*group\s*\)\s*\{(?<body>[\s\S]*?)\n\}\n\nfunction isBenchmarkCanaryExplicitlyBlocked/
)?.groups?.body;
if (
	! exactStackPromotionBlockerBody ||
	/hasBenchmarkCanaryClosureEvidence\s*\(/.test(
		exactStackPromotionBlockerBody
	)
) {
	missing.push( 'exact-stack-blocker-independent-of-coverage-closure' );
}

if ( missing.length > 0 ) {
	console.error(
		`novelty monitor violates hard scheduling policy: ${ missing.join(
			','
		) }`
	);
	process.exit( 1 );
}

process.stdout.write( 'novelty monitor hard scheduling policy: valid\n' );
