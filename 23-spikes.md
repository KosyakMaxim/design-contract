# Technical Spikes

Implementation begins here. The coding agent must complete these spikes **in order** and stop immediately on a fundamental failure.

Passing a spike means its evidence is committed as tests/fixtures, not that someone observed a manual demo once.

---

# Spike 1: Explicit Figma node ↔ DOM node → one property difference

## Question

Can the core product statement produce one trustworthy deterministic finding?

## Objective

Prove:

```text
real Figma-shaped node data
↔ explicit DOM node
→ padding-left expected 24px / actual 20px
→ one CLI result
```

## Implementation

Implement the smallest vertical proof only:

1. checked-in sanitized raw Figma node fixture representing `42:1337`, with `paddingLeft = 24`;
2. minimal extraction of that one field to canonical `padding-left`;
3. Vue 3 + Vite fixture host:

```vue
<div data-design-node="42:1337" style={{ paddingLeft: 20 }}>
  Checkout
</div>
```

4. Playwright Chromium navigation to fixture app;
5. exact selector `[data-design-node="42:1337"]`;
6. runtime computed `padding-left`;
7. one comparison using the documented 0.5px tolerance;
8. minimal CLI output and exit category;
9. the resulting `Difference` contains no fake source and may omit `source` entirely.

Do **not** build Vite source instrumentation, generalized baseline migration, all P0 properties, GitHub reporter or framework abstraction in this spike. Spike 1 must not implement any part of Spike 2 merely to satisfy a required domain field.

## Fixtures

- `fixtures/figma/raw/spike1-node.json`
- one fixture route/component;
- passing runtime variant with `24px`;
- failing runtime variant with `20px`;
- duplicate and missing mapping variants may be tiny assertions around the same fixture.

## PASS

All are required:

```text
10/10 local repeated runs select exactly one node
failing variant always reports padding-left 24px → 20px
passing variant reports no difference
failing Difference serializes without source and without placeholder/fake SourceLocation
missing element produces MAPPING_MISSING
duplicate element produces MAPPING_DUPLICATE
no heuristic selector/match logic exists
```

The semantic result for repeated identical variants is byte-identical.

## FAIL

Any of:

- explicit ID cannot be resolved deterministically;
- browser value cannot be normalized reliably;
- output does not preserve exact expected/actual sides;
- code relies on geometry/text fuzzy matching;
- same input yields different semantic result.

## Consequence

```text
STOP.
```

Do not build the rest of the product. Emit `# BLOCKER` using the required format.

---

# Spike 2A: Vue SFC native template host → source file:line:column

## Question

Can a mapped runtime host element reliably identify the native HTML element in a Vue SFC `<template>` that created it without Vue private runtime internals?

## Objective

Prove Vue compiler/Vite build-time source instrumentation.

## Implementation

Build the minimal Vue SFC compiler transform from `08-vite-instrumentation.md` using `vue/compiler-sfc` and the official Vite Vue plugin. Do not parse `.vue` with regular expressions.

Runtime must expose:

```text
data-design-test-source="src/components/Button.vue:3:3"
```

This spike upgrades the same optional-source domain contracts used by Spike 1. It must not introduce a second `Difference`/`NodeMatch` type. After PASS, supported Vue 3 + Vite runs enforce source presence as a runtime acceptance invariant. Shadow DOM is explicitly deferred to Spike 2B.

## Fixtures

Minimum Vue source forms:

- `.vue` SFC native host;
- nested native elements;
- custom Vue component without relying on attribute fallthrough;
- fragment / multiple roots;
- `v-if`;
- `v-for`;
- `v-bind="props"`;
- `<script setup>`;
- TypeScript;
- HMR line movement;
- instrumented Vite build;
- normal production build without flag.

## PASS

```text
100% expected host paths/lines/columns correct
line tolerance = 0
HMR behavior preserved
instrumented build succeeds
sourcemaps remain valid in fixture assertion
normal production build has 0 injected source attrs
managed CLI launch injects DESIGN_CONTRACT=1 automatically
uninstrumented --no-start fails SOURCE_LOCATION_UNKNOWN
no Vue private runtime dependency
```

## FAIL

Any systematic source shift, generated-file path, HMR/build breakage, production leakage, regex `.vue` parsing or dependence on Vue private internals.

## Consequence

```text
STOP and reassess the source-linked product wedge.
```

Do not silently replace exact source ownership with component name, source map guess or Fiber metadata.

---

# Spike 2B: Explicit mapped nodes inside ShadowRoot

This is a separate follow-up spike and does not change the Vue Spike 2A source-instrumentation contract. It proves explicit mapping traversal through browser-standard `open ShadowRoot` boundaries without Vue private runtime internals or heuristic matching.

## Implementation

- traverse the document and accessible `open ShadowRoot` trees recursively through native DOM APIs;
- count `data-design-node` by exact attribute value across light DOM and shadow trees;
- collect computed P0 properties from the actual native mapped host element;
- preserve the shared `NodeMatch` and `MappingError` contracts;
- treat missing and duplicate IDs as configuration errors;
- do not access Vue internals, component instances or closed ShadowRoot contents.

## Evidence

```text
single open ShadowRoot: PASS
nested open ShadowRoots: PASS
missing mapping: cardinality error
duplicate mapping: cardinality error
real Vue MFE node 341:34185 inside ShadowRoot: PASS
padding-left 20px against pinned Figma version: PASS
```

## PASS

```text
explicit mapping remains the only locator
light DOM behavior remains unchanged
open ShadowRoot traversal is deterministic
native host computed style is collected correctly
no Vue private runtime dependency
no heuristic matching
```

## OUT OF SCOPE

```text
closed ShadowRoot
cross-origin iframe traversal
automatic Shadow DOM instrumentation
component abstraction matching
```

---

# Spike 3: Exact Figma version → normalized committed snapshot → offline run

## Question

Can Design Contract pin an actual Figma version, extract the required supported data and make subsequent runs independent of Figma?

## Objective

Prove the design baseline architecture, including a real REST request.

## Implementation

1. use a real controlled Figma file and token;
2. resolve/validate one exact version through official REST file endpoint;
3. fetch the configured root/node data using that exact version;
4. extract the Spike 1 property plus enough schema scaffolding to build a `DesignBaseline`;
5. stamp the current `baselineSemanticsVersion`, canonicalize and hash the baseline;
6. write it to `.design-contract/baselines/<test>.json`;
7. disable/remove token/network and run the same comparison from the committed baseline only;
8. change current Figma design after pinning and show offline run remains unchanged;
9. perform explicit update to the new exact version and show reviewable Git diff.

## Fixtures / evidence

- sanitized captured REST response for regression tests;
- real update command transcript/log with secrets redacted;
- baseline A;
- baseline B after explicit design update;
- test that spies/guards against Figma adapter invocation during `run`.

## PASS

```text
exact version recorded
baseline canonical/hash-valid
run succeeds with no FIGMA_ACCESS_TOKEN
run makes 0 Figma calls
latest/current Figma change does not alter pinned run
explicit update creates deterministic readable diff
package/tool version change alone does not invalidate the baseline
semantics-version mismatch fails clearly
```

## FAIL

- exact version cannot be reliably requested/identified;
- required supported raw data cannot be obtained;
- `run` needs Figma network/token;
- baseline includes unavoidable volatile semantic fields;
- repeated extraction of the same exact version yields different canonical baseline.

## Consequence

```text
STOP.
```

A mutable/latest design oracle is not an acceptable workaround.

---

# Spike 4: P0 normalization fixture corpus

## Question

Does the complete proposed P0 contract remain causally correct and noise-free in controlled fixtures?

## Objective

Implement and prove the entire `11-normalization.md` whitelist before broad CLI/product work.

## Implementation

Use the 30-node fixture corpus and 24 seeded supported mismatches from `19-fixtures.md`.

For every P0 property implement:

- Figma extraction;
- runtime collection;
- canonical representation;
- tolerance comparison;
- pass fixture;
- single-property fail mutation;
- unsupported-edge fixture where applicable.

## Fixtures

All `19-fixtures.md` P0, equivalent-layout, color, font, border, radius and unsupported cases.

## PASS

```text
controlled false positives = 0
seeded supported false negatives = 0
all expected values correct
all actual values correct
equivalent-width fixture passes
gap-vs-margin fixture creates no raw-gap P0 failure
unsupported mixed text/gradient/non-inside stroke are explicit skips
matching font-family without non-empty loaded CSS-connected-face evidence is explicit skip, never PASS
different primary font-family still produces the seeded mismatch
no node with zero comparable checks silently passes
```

The proposed tolerances are either validated as written or the spike fails. The coding agent does not edit them to pass.

## FAIL

Any unexplained false positive, supported seeded miss, semantic mislabeling or property that cannot meet the declared deterministic contract.

## Consequence

```text
STOP and emit BLOCKER.
```

The product/spec owner may later decide to move a property to P1 through ADR. The coding agent must not make that product decision itself.

---

# Spike 4 implementation status

```text
P0 extraction and browser normalization: PASS
controlled acceptance matrix: 22/22 PASS
controlled false positives: 0
seeded supported false negatives: 0
real Figma version 2384561952068938116 + Vue MFE: PASS
real MFE comparable checks: 7
real MFE differences: 0
baselineSemanticsVersion: 2
```

---

# Spike 5: CI determinism

## Question

Does the proven property engine remain deterministic in a clean pinned Linux CI environment?

## Objective

Prove twenty identical executions yield the same semantic result.

## Implementation

Pin:

```text
ubuntu-24.04
Node 24.19.0
npm lockfile
Playwright 1.62 bundled Chromium 151
DPR 1
explicit viewport
locale en-US
timezone UTC
color scheme light
reduced motion
bundled local fixture fonts
animations/transitions disabled
```

Run the same pass fixture and the same seeded-failure fixture 20 times in CI.
Hash default semantic JSON for each run.

## Fixtures

- one all-pass representative P0 test;
- one representative seeded-failure set;
- no external font CDN;
- deterministic fixture data.

## PASS

For each scenario:

```text
20 runs
1 unique semantic SHA-256
1 identical exit category
0 unexplained browser/runtime flakes
```

## Spike 5 implementation status

```text
ubuntu runner: pinned ubuntu-24.04
Node: pinned 24.19.0
Playwright: 1.62 lockfile + bundled Chromium
DPR: 1
viewport: 1260x900
locale/timezone: en-US / UTC
color scheme: light
reduced motion: reduce
animations/transitions: disabled
pass scenario: 20 runs / 1 semantic SHA-256
seeded-failure scenario: 20 runs / 1 semantic SHA-256
runtime flakes: 0
```

## FAIL

Any semantic value, difference set, mapping, source location, skipped set or pass/fail variation across identical runs.

## Consequence

```text
STOP.
```

Do not add retries to conceal a nondeterministic engine. Identify the environmental/semantic source or block the project.
