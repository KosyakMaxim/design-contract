# Backlog

The backlog is scope-controlled. `POST-MVP`, `LATER` and `REJECTED` entries must not be implemented while building Technical MVP unless the specification is deliberately changed through ADR.

# SPIKES

## S1 One-node property contract

**Rationale:** proves the literal product claim before architecture grows.

**Dependencies:** fixture Vue 3 + Vite app, checked-in Figma-shaped node JSON, Playwright Chromium.

**Acceptance:** `padding-left 24 → 20`, exact mapping, deterministic pass/fail, 10/10 local repeats.

## S2 Vue SFC native host source

**Rationale:** source-linked finding is core differentiation for the MVP framework.

**Dependencies:** S1.

**Acceptance:** full Vue SFC source fixture matrix exact, HMR/build valid, clean production build, no Vue private runtime dependency. Shadow DOM is a separate S2B spike.

## S3 Version-pinned Figma snapshot

**Rationale:** immutable design oracle is required for CI trust and Figma rate-limit independence.

**Dependencies:** S1 domain shape; real controlled Figma access.

**Acceptance:** exact version, canonical baseline, offline run, explicit update Git diff.

## S4 P0 normalization corpus

**Rationale:** proves noise level before UI/workflow investment.

**Dependencies:** S1-S3 primitives.

**Acceptance:** controlled FP 0, seeded supported FN 0.

## S5 CI determinism

**Rationale:** CI wedge fails if output flakes.

**Dependencies:** S1-S4.

**Acceptance:** 20/20 byte-identical semantic results in pinned Linux environment.

# MVP

## M1 Canonical domain model

**Rationale:** adapters/reporters must share one contract.

**Dependencies:** spikes lock semantics.

**Acceptance:** types match `05-domain-model.md`; adapter/reporting compile-time tests use no duplicate shadow models.

## M2 Strict JSON config + validation

**Rationale:** deterministic setup and clear errors.

**Dependencies:** M1.

**Acceptance:** working example validates; unknown/invalid fields fail with `CONFIG_INVALID`; test IDs/node IDs/membership validated.

## M3 Baseline v1 store

**Rationale:** separates mutable Figma from run.

**Dependencies:** S3, M1.

**Acceptance:** canonical ordering, SHA-256, atomic write, schema + `baselineSemanticsVersion` gates, package-version independence, no volatile timestamps.

## M4 Figma update command

**Rationale:** explicit reviewed design change workflow.

**Dependencies:** M2, M3.

**Acceptance:** exact-version fetch, subtree validation, bounded 429 retry, `--figma-version`, `--dry-run`, safe errors.

## M5 Vite instrumentation integration

**Rationale:** source ownership in supported framework.

**Dependencies:** S2, M1.

**Acceptance:** `design-contract/vite` export, enabled only in contract build, managed CLI launch injects `DESIGN_CONTRACT=1`, uninstrumented `--no-start` fails after Spike 2, all source fixtures pass.

## M6 Browser runner

**Rationale:** observable implementation side.

**Dependencies:** M1, M2.

**Acceptance:** pinned Chromium, fresh context/test, explicit viewport, same-origin route, readiness/fonts/motion stabilization.

## M7 Bounded setup actions

**Rationale:** reach common UI states without creating E2E framework.

**Dependencies:** M6.

**Acceptance:** click/fill/press/waitFor + storageState only, classified failures, no arbitrary JS.

## M8 Explicit matcher

**Rationale:** identity must be deterministic.

**Dependencies:** M3, M6.

**Acceptance:** exactly-one invariant; all mapping errors; no heuristic imports/code paths.

## M9 Complete P0 normalizer

**Rationale:** core value.

**Dependencies:** S4, M3, M6.

**Acceptance:** exact `11-normalization.md` behavior and fixtures, including font-family availability-unverifiable skip semantics.

## M10 Diff engine

**Rationale:** deterministic causal failures.

**Dependencies:** M9.

**Acceptance:** tolerance rules, skips, ordering, aggregation, no adapter dependency.

## M11 Terminal reporter

**Rationale:** primary local UX.

**Dependencies:** M10.

**Acceptance:** exact expected/actual, DOM, Vue SFC native-host label, counts/result category.

## M12 Deterministic JSON reporter

**Rationale:** CI/artifact contract.

**Dependencies:** M10.

**Acceptance:** schema v1, no volatile fields, stable sort, golden files.

## M13 GitHub reporter

**Rationale:** selected PR wedge.

**Dependencies:** M10, M12.

**Acceptance:** workflow annotations + step summary without GitHub API/backend; source semantics clear.

## M14 Stable process exit codes

**Rationale:** PR gate automation.

**Dependencies:** CLI orchestration.

**Acceptance:** subprocess tests prove 0/1/2/3/4 categories.

## M15 Fixture corpus

**Rationale:** product evidence and regression safety.

**Dependencies:** all core MVP slices.

**Acceptance:** ≥30 mapped nodes, ≥24 supported seeded mismatches, mapping/source/font/equivalent/mobile scenarios.

## M16 Technical MVP GitHub workflow

**Rationale:** end-to-end PR gate.

**Dependencies:** M1-M15.

**Acceptance:** build/start/run/artifact/annotation; mismatch red, CSS fix green, no Figma token.

## M17 Determinism release gate

**Rationale:** preserve spike proof as ongoing quality policy.

**Dependencies:** M16.

**Acceptance:** 20 identical runs → one semantic hash.

# POST-MVP

## P1 Effective sibling spacing

**Rationale:** high-value layout check without enforcing `gap` declaration.

**Dependencies:** stable mapped parent/child geometry model.

**Acceptance:** geometry-based spacing passes equivalent gap/margin implementations; low-noise fixture corpus.

## P2 Parent-relative alignment/position

**Rationale:** catch local alignment drift without global x/y.

**Dependencies:** mapped parent-child relationships.

**Acceptance:** causal fixtures prove no cascade noise above agreed target.

## P3 Hover/focus setup actions

**Rationale:** common visual states after core action model proves stable.

**Dependencies:** runtime-state MVP.

**Acceptance:** deterministic state fixtures and no new generic E2E control flow.

## P4 Simple shadow subset

**Rationale:** additional visual fidelity after normalization evidence.

**Dependencies:** canonical shadow spec/fixtures.

**Acceptance:** zero controlled FP/FN for approved tuple subset.

## P5 Per-element screenshot evidence

**Rationale:** diagnostic help for unsupported visual effects/icons/images.

**Dependencies:** property finding remains primary gate.

**Acceptance:** non-blocking artifact, never changes pass/fail.

## P6 HTML / JUnit reporters

**Rationale:** ecosystem convenience after core usage exists.

**Dependencies:** stable `RunResult` JSON.

**Acceptance:** pure reporter adapters only.

## P7 PR bot comment

**Rationale:** richer collaboration if annotations/summary prove insufficient.

**Dependencies:** user demand and GitHub auth decision.

**Acceptance:** no change to core result semantics.

## P8 Mapping Setup Friction pilot

**Rationale:** raw `data-design-node` + contract membership proves deterministic identity but manual Figma-ID setup/duplication may be the largest adoption blocker.

**Dependencies:** Technical MVP exact mapping core complete; real pilot users.

**Acceptance:** measure setup/maintenance friction before selecting an ergonomic layer; preserve explicit deterministic identity and the principle `one canonical mapping declaration per runtime node`. Evaluate, without preselecting one: config mapping, logical stable key + manifest, helper API, optional Code Connect seed, and CLI/browser mapping authoring helper. No heuristic/fuzzy fallback.

# LATER

## L1 Next.js integration

**Rationale:** separate compiler/runtime scope.

**Dependencies:** Vue 3 + Vite product evidence.

**Acceptance:** dedicated source instrumentation ADR/spikes; no reuse by assumption.

## L2 Other framework adapters

**Rationale:** broaden market only after core value is proven.

**Dependencies:** stable adapter boundary.

**Acceptance:** own framework source-mapping proof; no framework is inferred from the Vue implementation.

## L3 CSS declaration provenance

**Rationale:** eventually point from DOM host to CSS module/Tailwind/style declaration.

**Dependencies:** core source ownership trusted; separate semantic model.

**Acceptance:** report distinguishes ownership vs actual style declaration and proves supported toolchains.

## L4 Figma Code Connect import/metadata

**Rationale:** one optional hypothesis inside the broader Mapping Setup Friction work; may seed explicit mapping/component context for eligible teams.

**Dependencies:** explicit mapping remains canonical; P8 pilot evidence.

**Acceptance:** no plan-dependent hard requirement and no silent/heuristic runtime match.

## L5 Hosted/team layer

**Rationale:** only if history/collaboration/central policy has proven demand.

**Dependencies:** commercial validation.

**Acceptance:** separate security/privacy architecture; not inherited from local MVP spec.

## L6 Optional opt-in anonymous telemetry

**Rationale:** product measurement only when needed.

**Dependencies:** explicit privacy decision.

**Acceptance:** obey forbidden field list in telemetry spec.

# REJECTED

## R1 Heuristic / zero-config matching

**Rationale:** destroys deterministic CI identity and scope.

**Acceptance:** no implementation.

## R2 AI vision as core

**Rationale:** non-deterministic/opaque for product contract and unnecessary for wedge proof.

**Acceptance:** no implementation.

## R3 Autofix / source patch generation

**Rationale:** beyond validation wedge and risks incorrect edits.

**Acceptance:** no MVP implementation.

## R4 Full-page pixel-diff CI oracle

**Rationale:** product is property-level design contract, not screenshot regression.

**Acceptance:** no implementation.

## R5 Latest Figma during run

**Rationale:** mutable oracle, rate limits, unreproducible CI.

**Acceptance:** explicit test proves Figma client cannot be reached by run path.

## R6 Framework-private runtime as source contract

**Rationale:** private/development internals are unstable.

**Acceptance:** no production dependency.

## R7 SaaS/billing/accounts during Technical MVP

**Rationale:** technical core and demand are not yet proven.

**Acceptance:** no implementation.

## R8 Figma-to-code / visual editor

**Rationale:** different product.

**Acceptance:** no implementation.
