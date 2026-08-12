# Design Contract: Implementation Handoff

## Status

**IMPLEMENTATION HANDOFF STATUS: READY**

This repository specification is ready for a coding agent to start **Spike 1 only**.
It does **not** mean the product has moved from `CONDITIONAL GO` to `GO`.

## What we are building

Design Contract is a local/CI-first developer tool with this contract:

```text
pinned Figma revision
        ↓
normalized design baseline committed to Git
        ↓
explicit DOM mapping
        ↓
observable browser runtime properties
        ↓
deterministic normalization
        ↓
expected / actual differences
        ↓
DOM element
        ↓
Vue SFC native host source file:line:column
        ↓
terminal / JSON / GitHub annotations
        ↓
PR pass or fail
```

Mental model:

> ESLint for Figma implementation fidelity.

Figma is the specification. The rendered DOM is the implementation. Design Contract reports deterministic disagreements in the supported contract surface.

It is **not** a screenshot comparator, Figma-to-code system, visual editor, AI fixer, or zero-config matcher.

The end-state chain includes Vue SFC source, but source attribution is deliberately introduced only in Spike 2A. The canonical domain types allow source to be absent in Spike 1; no fake source location is required. Shadow DOM traversal is a separate Spike 2B question.

## Resolved implementation choices

- Language: TypeScript.
- Runtime: Node.js 24 LTS; CI pins an exact Node 24 release.
- Package manager: npm with committed `package-lock.json`; CI uses `npm ci`.
- Framework scope: Vue 3 + Vite + Single File Components only.
- Browser: Playwright bundled Chromium, exact Playwright/browser revision pinned by lockfile.
- Tests: Vitest for unit/integration tests; Playwright for browser and end-to-end fixtures.
- Repository: one npm package with internal modules, not a monorepo.
- Figma access: REST API only during `design-test update`.
- Baseline: normalized JSON, exact Figma version, committed to Git.
- Mapping: explicit `data-design-node`; no heuristics or fallback.
- Source attribution: Vue compiler/Vite build-time instrumentation for native template elements.
- CI target: GitHub Actions first.
- Core gate: supported property differences only; screenshots are not part of Technical MVP.

## Repository layout

```text
design-contract/
  src/
    cli/
    core/
      domain.ts
      config.ts
      errors.ts
      normalization.ts
      diff.ts
      canonical-json.ts
    figma/
    browser/
    vite/
    reporting/
  fixtures/
    figma/
    vue-vite/
    baselines/
    expected/
  examples/
    vue-vite/
  docs/
  package.json
  package-lock.json
  tsconfig.json
```

The single-package layout is intentional. Internal dependency direction is documented in `04-architecture.md` and must be enforced by tests/lint rules rather than by prematurely splitting the code into packages.

## How to read these documents

Read in this order before implementation:

1. `01-decision.md`
2. `03-mvp-scope.md`
3. `05-domain-model.md`
4. `04-architecture.md`
5. `23-spikes.md`
6. `11-normalization.md`
7. `08-vite-instrumentation.md`
8. `09-browser-adapter.md`
9. `10-node-matching.md`
10. `12-diff-engine.md`
11. `18-testing.md`
12. `24-vertical-slices.md`
13. `27-implementation-agent-prompt.md`
14. `28-consistency-check.md`
15. `29-patchlog.md`

Adapter, CLI, CI and security documents are source-of-truth references for their respective implementation slices.

## Implementation order

```text
Spike 1
→ gate
Spike 2A
→ gate
Spike 3
→ gate
Spike 4
→ gate
Spike 5
→ gate
Slice 0
→ Slice 1
→ Slice 2
→ Slice 3
→ Slice 4
→ Slice 5
→ Slice 6
```

A failed fundamental spike stops implementation. Do not compensate by silently widening scope, changing architecture, introducing heuristics, or weakening the contract.

## Technical MVP complete when

All conditions below hold:

1. A real pinned Figma baseline exists.
2. A Vue 3 + Vite SFC fixture app runs in an instrumented test build.
3. Explicit mappings resolve uniquely.
4. The agreed P0 properties are collected and normalized.
5. Seeded mismatches produce the correct `expected → actual` values.
6. Every finding identifies the design node and DOM locator.
7. Every supported mapped native Vue template host identifies its source ownership.
8. Terminal and deterministic JSON reports are emitted.
9. Exit codes distinguish design failures, configuration failures, and runtime failures.
10. GitHub Actions fails on a design mismatch and annotates the Vue SFC host line.
11. Fixing the mismatch turns the same check green.
12. Twenty identical pinned CI runs yield identical semantic JSON.

## Pilot readiness

Technical MVP is not enough for pilot readiness. Pilot begins only after:

```text
controlled FP = 0
controlled seeded FN = 0
20/20 deterministic runs
critical documentation inconsistencies = 0
```

Real-pilot quality targets remain explicitly `UNVERIFIED` until measured. Mapping Setup Friction is also an explicit pilot concern: raw IDs stay canonical for Technical MVP, while ergonomic explicit-authoring options are evaluated only after the core is proven.
