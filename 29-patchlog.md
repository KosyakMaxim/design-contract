# Implementation Handoff Patch Log

## Summary

This patch repairs five cross-document inconsistencies found during independent review. The active framework scope is now recorded by FIX-006 below as Vue 3 + Vite + SFC; the explicit mapping strategy, pinned Figma baseline architecture, local/CI-first model, P0 property set, no-AI/no-autofix policy, and no-SaaS Technical MVP remain unchanged.

The main effect is to make the spike sequence implementable without type violations, decouple baseline semantics from package releases, make instrumentation automatic for managed app startup, explicitly track mapping setup friction as a pilot risk, and prevent `font-family` from receiving a false PASS when font availability is not sufficiently confirmable.

## FIX-001 Optional source location

### Problem

The original domain model required `SourceLocation` in runtime/match/difference structures even though Spike 1 intentionally precedes source instrumentation. This forced fake metadata or premature Spike 2 work.

### Before

```ts
RuntimeNode.source: SourceLocation
NodeMatch.source: SourceLocation
Difference.source: SourceLocation
```

### After

```ts
RuntimeNode.source?: SourceLocation
NodeMatch.source?: SourceLocation
Difference.source?: SourceLocation
```

Spike 1 may omit source. After Spike 2 PASS, supported Vue 3 + Vite runs enforce source presence as a runtime acceptance invariant and fail `SOURCE_LOCATION_UNKNOWN` if metadata is missing/invalid. One domain model serves both phases.

### Files changed

- `00-README.md`
- `02-product-spec.md`
- `04-architecture.md`
- `05-domain-model.md`
- `09-browser-adapter.md`
- `10-node-matching.md`
- `12-diff-engine.md`
- `15-reporting.md`
- `17-errors.md`
- `18-testing.md`
- `19-fixtures.md`
- `20-quality-gates.md`
- `23-spikes.md`
- `24-vertical-slices.md`
- `26-adr/ADR-005-build-time-source-instrumentation.md`
- `27-implementation-agent-prompt.md`
- `28-consistency-check.md`

### Why

Spike 1 can now prove the mapping/property core honestly, while Spike 2 adds source capability without changing the domain type contract.

## FIX-002 Baseline semantics version

### Problem

The original baseline used `extractorVersion` equal to the package version, so unrelated package releases could force baseline regeneration.

### Before

```json
{
  "schemaVersion": 1,
  "extractorVersion": "0.1.0"
}
```

### After

```json
{
  "schemaVersion": 1,
  "baselineSemanticsVersion": 1
}
```

No `toolVersion` is stored in semantic baseline content. The semantics version changes only when normalized baseline meaning/interpretation changes.

### Files changed

- `05-domain-model.md`
- `07-baseline-versioning.md`
- `13-config-and-cli.md`
- `17-errors.md`
- `18-testing.md`
- `19-fixtures.md`
- `20-quality-gates.md`
- `23-spikes.md`
- `24-vertical-slices.md`
- `25-backlog.md`
- `26-adr/ADR-003-pinned-figma-snapshots.md`
- `26-adr/ADR-011-baseline-semantics-versioning.md`
- `27-implementation-agent-prompt.md`
- `28-consistency-check.md`

### Why

A CLI/reporter/documentation patch must not create a design-baseline Git diff. Semantic incompatibility is now explicit and reviewable.

## FIX-003 Automatic instrumentation env

### Problem

A user could run the documented `design-test run` while the CLI started `app.command`, but still had to remember to prefix the command with `DESIGN_CONTRACT=1`.

### Before

```bash
DESIGN_CONTRACT=1 npx design-test run checkout-desktop
```

### After

```bash
npx design-test run checkout-desktop
```

When CLI manages `app.command`, it injects `DESIGN_CONTRACT=1` into the child process. `--no-start` remains externally managed; after Spike 2 an uninstrumented app fails `SOURCE_LOCATION_UNKNOWN`.

### Files changed

- `02-product-spec.md`
- `04-architecture.md`
- `08-vite-instrumentation.md`
- `09-browser-adapter.md`
- `13-config-and-cli.md`
- `16-ci.md`
- `17-errors.md`
- `18-testing.md`
- `19-fixtures.md`
- `20-quality-gates.md`
- `23-spikes.md`
- `24-vertical-slices.md`
- `25-backlog.md`
- `26-adr/ADR-005-build-time-source-instrumentation.md`
- `27-implementation-agent-prompt.md`
- `28-consistency-check.md`

### Why

The default local workflow is now hard to accidentally run uninstrumented, while CI/external startup remains explicit and verifiable.

## FIX-004 Mapping ergonomics risk

### Problem

Raw Figma IDs are correct for deterministic Technical MVP but may be cumbersome to author and duplicate across Vue templates/config at pilot scale.

### Before

The setup burden existed mostly as a commercial kill criterion; alternative authoring models were not organized as an explicit pilot hypothesis.

### After

A named product/UX risk, **Mapping Setup Friction**, is documented. Technical MVP remains unchanged. Pilot hypotheses are listed without selecting one: config mapping, logical stable key, helper API, optional Code Connect seed, and CLI/browser authoring helper. Target principle: one canonical mapping declaration per runtime node.

### Files changed

- `00-README.md`
- `01-decision.md`
- `03-mvp-scope.md`
- `10-node-matching.md`
- `20-quality-gates.md`
- `25-backlog.md`
- `26-adr/ADR-001-explicit-node-mapping.md`
- `27-implementation-agent-prompt.md`
- `28-consistency-check.md`

### Why

The core matcher stays deterministic, while pilot adoption risk is no longer hidden or accidentally treated as solved.

## FIX-005 Font-family verification semantics

### Problem

A matching computed `font-family` list does not necessarily prove the desired font was available/rendered. Counting that alone as PASS could create false confidence.

### Before

`document.fonts.ready` + normalized primary computed family equality was sufficient for the limited P0 check.

### After

The limited P0 contract is `declared/resolved primary CSS family + positive CSS-connected-face evidence`. After `document.fonts.ready`, a matching family requires `document.fonts.load()` for that exact primary family/sample text to return a non-empty set of loaded CSS-connected faces. `FontFaceSet.check()` is explicitly not sufficient because it can return true for a nonexistent family that will fall back. Empty/rejected/indeterminate evidence is skipped as `font-availability-unverifiable`, never passed. A different primary family remains a normal mismatch. Direct-system-font verification and glyph-level provenance remain explicitly outside MVP.

### Files changed

- `02-product-spec.md`
- `05-domain-model.md`
- `09-browser-adapter.md`
- `11-normalization.md`
- `12-diff-engine.md`
- `15-reporting.md`
- `17-errors.md`
- `18-testing.md`
- `19-fixtures.md`
- `20-quality-gates.md`
- `23-spikes.md`
- `24-vertical-slices.md`
- `25-backlog.md`
- `26-adr/ADR-007-p0-property-whitelist.md`
- `27-implementation-agent-prompt.md`
- `28-consistency-check.md`

### Why

The tool no longer equates a matching CSS family string with verified font availability, while keeping actual glyph-font verification outside Technical MVP.

## FIX-006 Revised framework scope: Vue 3 + Vite + SFC

### Decision

- Vue 3 + Vite + Single File Components is the only MVP framework.
- Framework instrumentation outside Vue moves outside this task.
- Spike 2A proves native Vue `<template>` source locations using `vue/compiler-sfc` through the official Vite Vue plugin.
- Shadow DOM traversal is not mixed into Spike 2A and is tracked as separate Spike 2B.
- Explicit mapping, pinned Figma snapshots, local/CI-first execution, no heuristics, and no AI remain unchanged.

### Validation required before the next spike

- exact `file:line:column` across the Vue fixture matrix;
- Vite dev, HMR, instrumented build, and clean production build;
- no Vue private runtime dependency and no `.vue` regex parser;
- real Vitest `4.1.10` and documented pinned Chromium without a temporary override.
