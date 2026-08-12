# Decision

## Decision

```text
DECISION: CONDITIONAL GO
```

The implementation documentation is ready to prove or falsify the technical core. The product itself remains conditional on the five spikes and later pilot evidence.

## ICP

Primary user:

```text
Frontend engineer / design engineer
in a product Vue 3 team where Figma is a required implementation specification.
```

Primary buyer:

```text
Frontend tech lead
or design-system lead.
```

Primary usage moment:

```text
Developer finishes UI implementation
→ runs Design Contract before moving the PR to review.
```

Secondary usage moment:

```text
UI PR
→ GitHub Actions
→ Design Contract
→ source-annotated design failures.
```

## Product wedge

Exactly one wedge is implemented:

> **Version-pinned, property-level Figma → PR design contract.**

Required differentiator:

> deterministic finding → explicit DOM node → native Vue template host source location.

## Main competitors

- Direct property-level competitor: Uiprobe.
- Workflow incumbent to watch: Percy and the broader visual-CI category.

This document does not perform new market research. Commercial conclusions remain those of the due-diligence phase.

## Core value

A reviewer should receive a causal, reviewable failure such as:

```text
src/components/CheckoutCard.vue:82:5

padding-left
expected: 24px
actual:   20px

Figma: 42:1337
DOM: [data-design-node="42:1337"]

FAIL
```

The source location means the native HTML element inside the Vue `<template>` that created the mapped DOM element. It does **not** promise to identify the stylesheet declaration that caused the difference.

## Main technical risk

The primary risk is false confidence or noisy failures caused by semantic differences between Figma layout concepts and browser layout results. Explicit mapping removes most identity ambiguity, but normalization, fonts, browser geometry and source instrumentation still require proof.

## Main commercial risk

The functionality may be valuable but too narrow to support a standalone product, or may be absorbed by an existing Figma / visual-CI / developer-agent platform. Technical feasibility must therefore be proved before SaaS or commercial infrastructure is built.

### Mapping Setup Friction

Raw explicit Figma IDs are the correct deterministic Technical-MVP contract, but the setup burden is an explicit product/UX risk. Manually maintaining `data-design-node` and contract membership may become the main adoption blocker at scale. Do not solve this with heuristic matching during MVP. Before product pilot, measure the friction and evaluate explicit ergonomic layers listed in `10-node-matching.md` / `25-backlog.md`, aiming for one canonical mapping declaration per runtime node.

## Technical MVP

A local/CI-first CLI for Vue 3 + Vite that:

1. pins a concrete Figma version during `update`;
2. stores a normalized baseline in Git;
3. runs with no Figma network request;
4. resolves only explicit mapped DOM nodes;
5. compares the supported P0 contract;
6. reports exact expected/actual values;
7. includes deterministic DOM identity and Vue SFC native host source ownership;
8. emits terminal, JSON and GitHub annotations;
9. returns category-specific exit codes.

## Non-goals

- Next.js.
- Svelte, Angular and other frameworks.
- Zero-config or fuzzy matching.
- AI vision.
- Autofix or patch generation.
- Figma-to-code.
- Screenshot or pixel diff as CI oracle.
- Hosted dashboard.
- User/team database.
- Billing/licensing.
- Source upload.
- CSS declaration provenance.
- Enterprise permissions or organization administration.

## Kill criteria

Stop the product or return to product validation if any of these become true:

1. Spike 1 cannot reliably produce the one-node one-property contract.
2. Vite instrumentation cannot produce exact supported Vue SFC native host locations without breaking Vite/HMR/build behavior.
3. A version-pinned normalized baseline cannot be fetched and replayed offline.
4. Controlled P0 fixtures produce unexplained false positives or miss seeded supported changes.
5. A pinned Linux/Chromium environment cannot produce 20/20 identical semantic results.
6. Real pilot false positives remain above 5% after unsupported cases are correctly excluded.
7. Explicit mapping is rejected by most qualified pilot teams.
8. The P0 surface must be reduced so far that the result is no more useful than a conventional overlay.
9. Teams use the tool only once and do not keep it in PR workflow.
10. Commercial willingness to pay remains absent after the planned qualified pilot.

## Confidence

```text
Technical confidence: MEDIUM until spikes pass.
Commercial confidence: LOW until pilot evidence exists.
```
