# Existing Antithesis Assertions

## Summary

No existing Antithesis SDK assertions or Antithesis-specific instrumentation were found in the scoped Gutenberg codepaths.

## Search Performed

Searched the repository for:

- `antithesis`
- `assert_always`
- `assert_sometimes`
- `assert_reachable`
- `assert_unreachable`
- `AlwaysOrUnreachable`
- `Sometimes(`
- `Reachable(`
- `Unreachable(`

Primary scope searched:

- `packages/`
- `lib/`
- `phpunit/`
- `test/`

## Result

No Antithesis SDK imports, assertion calls, lifecycle hooks, or Antithesis-specific test templates are present in the current scoped area.

## Implication

All instrumentation mentioned in the property evidence files should be treated as missing, not partially implemented.

## Assumptions

- The repository does not hide Antithesis instrumentation behind generated files outside the checked-in source tree.

## Open Questions

- None.
