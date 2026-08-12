# Vertical Slices

These slices begin only after Spikes 1-5 pass. Spikes prove assumptions; slices turn those proofs into the supported product path without building horizontal subsystems in advance.

---

## Slice 0: One node, one property, final CLI path

### Objective

Harden the Spike 1 proof into the actual CLI/module boundaries:

```text
baseline
+ one explicit DOM node
+ padding-left
+ design-test run
+ terminal/JSON
```

### Implementation scope

- real config loader for one test;
- baseline store v1;
- one matcher path;
- one P0 property through shared domain/diff types;
- terminal + JSON reporter;
- `Difference.source` remains optional and the Spike-1-derived golden omits it;
- stable exit codes 0/1/2/3/4.

### Tests

- pass;
- `24 → 20` fail;
- exact JSON golden;
- real subprocess exit code.

### Acceptance

The public CLI uses no spike-only shortcut or hard-coded fixture ID.

### Dependency

All five spikes passed.

### Stop condition

Any generalized path cannot preserve the proven deterministic Spike 1 result.

---

## Slice 1: One component, complete P0 contract

### Objective

One mapped component is checked through the complete approved P0 normalization surface.

### Implementation scope

- shared P0 extraction/normalization from Spike 4;
- all `PROPERTY_ORDER` comparisons;
- skipped/unsupported reporting;
- at least one comparable property guard;
- content policy.

### Tests

- table-driven one-property mutations;
- tolerance boundaries;
- limited subsets for font/border/radius/background/text;
- font-family availability-confirmed pass, availability-unverifiable skip, and primary-family mismatch fail;
- no extra findings.

### Acceptance

```text
controlled FP = 0
seeded supported FN = 0
```

for the one-component matrix.

### Dependency

Slice 0.

### Stop condition

Any P0 semantics diverge from the passed Spike 4 contract.

---

## Slice 2: Ten explicit mappings + mapping errors

### Objective

Prove a realistic partial component tree can be checked with strict identity.

### Implementation scope

- `contractNodeIds` list;
- exact cardinality validation;
- baseline subtree membership;
- deterministic selectors;
- missing/duplicate/invalid/outside-subtree errors;
- ignore unlisted DOM/Figma nodes.

### Tests

- 10 mapped nodes pass;
- nested mappings;
- repeated list with unique IDs;
- missing;
- duplicate;
- unrelated unlisted elements.

### Acceptance

```text
10/10 required IDs uniquely matched
0 heuristic code paths
all four mapping error types deterministic
```

### Dependency

Slice 1.

### Stop condition

Any need to choose a candidate instead of failing exact identity.

---

## Slice 3: Differences + Vue SFC native host source ownership

### Objective

Every supported finding points to the mapped native Vue SFC host's repo-relative source location.

### Implementation scope

- production Vite Vue plugin API from Spike 2A;
- source attribute parser;
- populate the existing optional `SourceLocation` fields in `RuntimeNode`, `NodeMatch` and `Difference`;
- after this slice capability is active, enforce source presence for supported runs;
- `SOURCE_LOCATION_UNKNOWN` failure, including uninstrumented `--no-start`;
- managed app launch automatically injects `DESIGN_CONTRACT=1`;
- terminal wording explicitly says `Vue SFC native host`.

### Tests

- complete source fixture matrix;
- source included in JSON;
- normal production build clean.

### Acceptance

100% expected supported host locations are exact, and no second source-required domain type is introduced.

### Dependency

Slice 2.

### Stop condition

Any fallback to Fiber/source guessing or silent missing source.

---

## Slice 4: `design-test update` + pinned Git baseline

### Objective

Make Figma design changes a separate explicit reviewable workflow.

### Implementation scope

- real Figma REST adapter;
- exact version selection;
- full configured P0 extraction;
- canonical baseline v1;
- semantic hash;
- atomic write;
- `--figma-version`;
- `--dry-run`;
- baseline-semantics/schema gates;
- no coupling between baseline compatibility and npm/tool package version.

### Tests

- captured API fixtures;
- mock HTTP status mapping;
- real Spike 3 evidence remains valid;
- same exact input produces byte-identical baseline;
- `run` Figma-call guard.

### Acceptance

Current Figma edits never change `run` until explicit `update` changes Git baseline.

### Dependency

Slice 3.

### Stop condition

Any requirement to use latest Figma during run.

---

## Slice 5: Explicit viewport + bounded runtime state

### Objective

Run the same contract against deterministic desktop/mobile and simple UI states.

### Implementation scope

- fresh context per test;
- viewport/DPR/runtime defaults;
- optional `storageState`;
- `click`, `fill`, `press`, `waitFor` only;
- ready selector;
- font/motion stabilization;
- sequential tests.

### Tests

- desktop 1440×900;
- mobile 390×844;
- opened modal/dropdown;
- validation state;
- storageState fixture without leaking state;
- action/readiness failures classified as runtime errors.

### Acceptance

Every state is explicit in config and repeatable; no generic E2E DSL appears.

### Dependency

Slice 4.

### Stop condition

Need for arbitrary scripts/branching to satisfy basic MVP fixtures. Move complexity into host fixture setup instead.

---

## Slice 6: GitHub CI gate + source annotations

### Objective

Deliver the selected wedge in a PR workflow.

### Implementation scope

- GitHub workflow command reporter;
- step summary;
- CI workflow example;
- instrumented Vite build + preview;
- JSON artifact;
- stable exit categories;
- 20-run determinism job retained as quality gate.

### Tests

- reporter golden commands;
- summary golden Markdown;
- pass workflow;
- design-fail workflow;
- config/runtime failure workflow;
- JSON artifact produced on completed design failure.

### Acceptance

A seeded mismatch:

```text
fails GitHub job with exit 1
creates source-line annotation
shows expected/actual + Figma id + DOM selector
```

After fixing the fixture CSS, the same workflow passes without baseline changes.

### Dependency

Slice 5.

### Stop condition

GitHub integration requires a hosted backend, GitHub App or source upload to achieve the basic annotation/summary requirement. Use workflow-native output instead.
