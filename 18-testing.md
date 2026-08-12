# Testing Strategy

This is one of the critical implementation documents. Tests are written with the code in every spike/slice, not afterward.

## Test stack

- TypeScript.
- Vitest 4.1.10 for unit/integration/orchestration tests; exact version locked in `package-lock.json`.
- Playwright 1.62 library for browser integration/E2E, with bundled Chromium 151 revision from that release.
- Node.js 24 LTS; CI Technical MVP lane pins Node 24.19.0.
- Vue 3 + Vite fixture app with `.vue` SFCs.
- No screenshot assertion library in Technical MVP.

## Test layers

### Unit tests

#### Canonical numbers

Test:

- finite validation;
- `-0 → 0`;
- six-decimal serialization rounding;
- numeric tolerance boundaries exactly inside/outside threshold.

#### Color conversion

Test Figma channel normalization:

```text
0 → 0
1 → 255
0.5 → 128
paint opacity default → 1
```

Browser CSS color conversion is tested in Chromium integration fixtures for:

- rgb;
- rgba;
- hex source resolved by CSSOM;
- transparent;
- modern CSS color converted to canonical sRGB where supported.

#### Typography normalization

Test:

- primary font family parsing;
- quotes/fallback list/case normalization;
- `font-availability-unverifiable` skip behavior;
- matching primary family + non-empty loaded CSS-connected-face evidence may pass only at the limited CSS-family contract level;
- differing primary family still fails even if availability is uncertain;
- numeric font weight;
- `normal/bold` fallback normalization if CSSOM emits keywords;
- px parsing;
- unsupported line-height representation;
- letter-spacing `normal` behavior once Spike 4 locks it.

#### Text policy

Table-test all four policies with:

- LF/CRLF;
- leading/trailing whitespace;
- multiple spaces;
- tabs/newlines;
- Unicode whitespace.

#### Radius/border

Test:

- Figma corner ordering;
- uniform radius expansion;
- elliptical/percentage runtime rejection;
- corner smoothing rejection;
- `INSIDE` solid stroke acceptance;
- `CENTER`/`OUTSIDE`, dashed, multiple/gradient strokes rejection.

#### Diff

For every P0 property:

- equal;
- just inside tolerance;
- exactly tolerance;
- just outside tolerance;
- deterministic `delta = actual - expected`;
- difference ordering;
- skipped not pass/fail;
- a `Difference` without `source` is valid and serializable for Spike 1;
- the same domain type carries `source` once Spike 2 instrumentation exists;
- zero comparable properties → config error.

#### Mapping validation

Test:

- one match;
- missing;
- duplicate;
- invalid id;
- outside subtree;
- unlisted DOM ignored;
- unlisted Figma descendant ignored.

### Integration tests

#### Figma adapter

Use checked-in sanitized raw REST fixtures rather than live network for normal test suite.

Validate:

```text
raw exact-version node fixture
→ expected DesignNode
→ expected canonical baseline
```

Network client tests use a local HTTP mock server built with Node's HTTP primitives where practical, covering status mapping and rate-limit retry without adding a heavy mock server dependency.

No Figma token is required for normal CI tests.

#### Vue SFC Vite instrumentation

Run real Vue compiler/Vite transforms and builds against fixture SFC source:

- `.vue`;
- `.ts` used by `<script setup lang="ts">`;
- intrinsic hosts;
- custom Vue components are not directly instrumented;
- fragments;
- spreads;
- conditions;
- `.map()`;
- TypeScript syntax;
- HMR/dev behavior;
- production build without flag contains no source attr;
- instrumented build contains exact repo-relative line/column;
- managed CLI app launch injects `DESIGN_CONTRACT=1`;
- `--no-start` against an uninstrumented app fails `SOURCE_LOCATION_UNKNOWN` after Spike 2;
- sourcemap remains valid.

#### Browser collection

Run fixture app in pinned Chromium and verify:

- viewport;
- DPR;
- locale/timezone/color scheme/reduced motion;
- `getBoundingClientRect` values;
- computed style P0 extraction;
- font readiness;
- `FontFaceSet.load()` returns a non-empty loaded CSS-connected-face set for the expected primary family;
- empty/rejected/indeterminate expected-family load evidence becomes skipped, not pass;
- text policies;
- source attribute parsing;
- animation/transition stabilization;
- mapping count errors.

#### Baseline store

Test:

- canonical key order;
- node/property sort;
- no volatile timestamp;
- semantic hash success/failure;
- atomic write;
- exact baseline semantics version gate;
- package/tool version change with unchanged semantics version does not invalidate baseline;
- semantics-version mismatch fails `BASELINE_SEMANTICS_MISMATCH`;
- config membership mismatch;
- `run` code path contains no Figma client invocation.

### End-to-end

Full controlled path:

```text
checked-in Figma raw fixture
→ design-test update-compatible extraction
→ committed baseline
→ Vue 3 + Vite instrumented fixture build
→ Playwright Chromium
→ explicit mapping
→ runtime collection
→ diff
→ terminal + JSON
→ CLI exit code
```

Required E2E scenarios:

1. all-pass fixture → exit `0`;
2. one `padding-left 24 → 20` mismatch → exit `1` and exact JSON;
3. duplicate mapping → exit `2`;
4. missing mapping → exit `2`;
5. Spike 1 source-less difference serializes without fake source;
6. post-Spike-2 source metadata absent / uninstrumented `--no-start` → exit `2`;
7. matching computed font family with empty/rejected/indeterminate CSS-connected-face evidence → skipped `font-availability-unverifiable`, never PASS for that property;
8. app unavailable → exit `3`;
9. seeded P0 matrix → all expected findings and no extras;
10. fix seeded mismatch → same scenario goes green;
11. GitHub reporter fixture → expected workflow command line and summary Markdown.

### CLI subprocess tests

Spawn the built CLI as a real child process to assert process exit codes rather than only calling internal functions.

Use temporary fixture copies inside OS temp directories, but canonical output must never include temp absolute paths.

## Fixture-driven development

Every supported property is introduced only with:

- a Figma raw fixture value;
- a passing runtime fixture;
- a failing runtime mutation;
- expected normalized value;
- expected JSON difference;
- tolerance boundary unit tests.

No property is considered implemented because a parser function exists.

## Controlled FP/FN gate

For the full fixture corpus:

```text
false positives = 0
seeded supported false negatives = 0
```

Any unexplained false positive blocks the spike/slice. Do not increase tolerance as the first response. Identify whether the property semantics are wrong, fixture is unsupported, or environment is unstable.

## Repeated determinism test

Spike 5 and release CI execute the same pinned E2E scenario twenty times in a clean/pinned Linux environment.

For each run capture default semantic JSON and SHA-256 it.

PASS:

```text
20 runs
1 unique semantic SHA-256
1 identical process result category
```

A duration/timestamp is not present in this JSON, so no field stripping is needed for the comparison.

## CI matrix

Technical MVP does **not** create a broad support matrix.

Required gate:

```text
ubuntu-24.04
Node 24.19.0
locked npm graph
Playwright 1.62 bundled Chromium 151
Vue 3 + Vite SFC fixture
DPR 1
```

Optional local developer runs on macOS/Windows are useful but do not change the Technical MVP gate until deterministic evidence exists.

## Regression rule

Every fixed bug receives a fixture or unit/integration regression test that reproduces the exact prior failure.

Do not accept a bug fix whose only verification is manual CLI output.
