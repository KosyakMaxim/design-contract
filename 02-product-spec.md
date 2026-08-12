# Product Specification

## JTBD

When a frontend engineer has finished implementing a Figma-designed UI, they need a deterministic pre-review check that tells them which supported rendered properties disagree with the pinned design specification, where the corresponding DOM element is, and which native Vue SFC template host owns it, so obvious design drift is fixed before designer or code review.

## Primary user

Frontend engineer or design engineer working in a Vue 3 + Vite product repository.

## Primary buyer

Frontend tech lead or design-system lead who owns UI quality and PR workflow.

## Usage moments

### Local

```text
implement UI
→ design-test run checkout-desktop
→ fix deterministic findings
→ rerun
→ open / move PR to review
```

### Baseline update

```text
approved Figma design changed
→ design-test update checkout-desktop
→ inspect baseline Git diff
→ commit baseline change
→ implementation may be updated separately or in same reviewed PR
```

### CI

```text
pull request
→ instrumented Vue 3 + Vite build
→ app starts
→ design-test run
→ terminal + JSON + GitHub annotations
→ exit code gates PR
```

## User flow

1. Run `design-test init` once.
2. Add the Vite instrumentation plugin.
3. Define a test case and explicit `contractNodeIds` in `design-contract.config.json`.
4. Put `data-design-node="<figma-id>"` on the actual DOM host elements represented by those Figma nodes.
5. Run `design-test update [test-id]` with `FIGMA_ACCESS_TOKEN` available.
6. Review and commit `.design-contract/baselines/<test-id>.json`.
7. Run `design-test run [test-id]`; when the CLI starts `app.command`, it enables Design Contract instrumentation automatically.
8. For externally started `--no-start` workflows, ensure the app was built/started with instrumentation; the CLI validates this after Spike 2A.
9. Fix differences or deliberately update the design baseline through the separate update workflow.
10. Configure the same run in GitHub Actions.

## Local success state

A clean run produces:

```text
PASS
0 design differences
0 mapping errors
0 runtime errors
```

and exit code `0`.

## Local failure states

### Design failure

A supported property differs outside tolerance. The finding contains:

- test id;
- Figma node id and name;
- canonical property name;
- expected value;
- actual value;
- tolerance where relevant;
- deterministic DOM selector;
- Vue SFC native template host source path/line/column.

Exit code: `1`.

### Configuration failure

Examples: baseline missing, duplicate mapping, configured node outside Figma subtree, unsupported baseline schema, missing source attribution in the supported instrumentation scope.

Exit code: `2`.

### Runtime/infrastructure failure

Examples: app did not start, navigation failed, browser failed, fonts did not become ready.

Exit code: `3`.

### Internal defect

Unexpected invariant violation or unclassified exception.

Exit code: `4`.

## Required acceptance criteria

### Identity

- Every `contractNodeId` resolves to exactly one runtime element.
- Duplicate, missing and invalid mappings do not degrade into guesses.
- Unlisted DOM nodes and unlisted Figma descendants do not create implicit checks.

### Baseline

- `update` stores the exact Figma version.
- `run` performs zero Figma calls.
- Baseline output is canonical, stable and reviewable in Git.
- A baseline semantic hash is verified before comparison.

### Runtime

- Browser version comes from the pinned Playwright package/browser revision.
- Viewport is explicit.
- DPR is `1`.
- Locale/timezone/color scheme/reduced motion are deterministic.
- Animations and transitions are disabled before measurement.
- Font readiness is a gate before measurement.
- A matching `font-family` is not counted as PASS unless a matching loaded CSS-connected face is positively confirmed for the sample text; otherwise that property is skipped as `font-availability-unverifiable`.

### Source

- Base domain source fields are optional so Spike 1 can run without fake metadata.
- After Spike 2A PASS, supported Vue 3 + Vite runs require source on every required mapped native host/finding.
- Source is a repo-relative path.
- Line/column come from the native Vue template element AST node.
- The source location is not described as a CSS declaration location.

### P0 comparison

The same P0 whitelist must be used by baseline extraction, runtime collection, normalization, diffing, fixtures, tests and reporting. See `11-normalization.md`.

### Reporting

- Terminal reporter is human-readable.
- JSON reporter is deterministic by default and omits volatile timings.
- GitHub annotations point to Vue SFC source when available.
- Result ordering is stable: test id → design node id → property order.

## Non-goals

The product does not attempt to infer design intent from CSS mechanism. It does not fail because one implementation uses `gap` and another uses margins if the compared P0 observable contract is otherwise correct. It does not infer HUG/FILL declarations, global x/y parity, vector equality, gradients, shadows, masks or arbitrary transforms.

## Product success criteria

Technical MVP:

```text
controlled FP = 0
controlled seeded FN = 0
20/20 repeated semantic results identical
```

Pilot targets, still `UNVERIFIED`:

```text
FP ≤ 5%
seeded supported FN ≤ 2%
actionable findings ≥ 80%
```
