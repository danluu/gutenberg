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
];

const missing = requiredContracts
	.filter( ( contract ) => ! contract.pattern.test( source ) )
	.map( ( contract ) => contract.name );

if ( missing.length > 0 ) {
	console.error(
		`novelty monitor violates hard supervisor budget policy: ${ missing.join(
			','
		) }`
	);
	process.exit( 1 );
}

process.stdout.write(
	'novelty monitor hard supervisor budget policy: valid\n'
);
