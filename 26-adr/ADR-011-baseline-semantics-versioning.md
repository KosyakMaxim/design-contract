# ADR-011: Baseline Semantics Versioning

## Context

The baseline is a semantic contract committed to Git. Tying baseline compatibility to the overall npm package version would invalidate snapshots for unrelated reporter, CLI, instrumentation, documentation or refactoring releases and create noisy, unnecessary baseline regeneration.

## Decision

Use two independent baseline compatibility dimensions:

```text
schemaVersion: 1
baselineSemanticsVersion: 2
```

`schemaVersion` identifies the serialized baseline structure.

`baselineSemanticsVersion` identifies the meaning/interpretation of normalized baseline data and changes only when extraction semantics, normalization semantics, canonical values, semantic serialized fields, or interpretation of existing fields changes.

Do not store npm/tool package version in semantic baseline content. A package version change with unchanged `baselineSemanticsVersion` must continue to accept the same baseline.

`run` rejects a differing semantics version as `BASELINE_SEMANTICS_MISMATCH` / exit `2`.

## Alternatives

1. **Use npm package version as extractor version:** rejected because unrelated releases would invalidate baselines.
2. **No semantic compatibility version:** rejected because changed normalization/extraction meaning could silently compare incompatible data.
3. **Store toolVersion only as metadata outside the semantic hash:** deferred; it provides little MVP value and can still create review churn.

## Consequences

- baseline regeneration happens for semantic reasons, not release-number reasons;
- package patch/minor releases can preserve baseline compatibility;
- semantic changes require an explicit version bump, tests and ADR/documentation update;
- semantic hash covers `baselineSemanticsVersion`;
- old incompatible baselines fail clearly rather than being silently reinterpreted.

Version 2 records the Spike 4 P0 canonical value model, property order, color representation and explicit unsupported semantics. Existing version 1 baselines must be regenerated or are rejected with `BASELINE_SEMANTICS_MISMATCH`.

## Status

Accepted for Technical MVP patch reconciliation.
