# Consistency Check

## Status

```text
IMPLEMENTATION HANDOFF STATUS: READY
```

The revised handoff can start Spike 1 without violating the domain model or implementing Vue Spike 2A early. The same domain contracts continue through Spike 2A+ without a parallel source-required type; Shadow DOM remains a separate Spike 2B gate.

## Passed

- Canonical domain types remain defined once in `05-domain-model.md`.
- `RuntimeNode.source`, `NodeMatch.source`, and `Difference.source` are optional in the base model.
- Source attribution becomes a supported-run invariant only after Vue Spike 2A PASS.
- `schemaVersion` and `baselineSemanticsVersion` are distinct; npm/tool version is not semantic baseline compatibility.
- Semantic baseline contains no tool/package version or volatile timestamp.
- Managed `design-test run` automatically enables Vite instrumentation for `app.command`.
- Externally managed `--no-start` requires an instrumented app and is validated after Vue Spike 2A.
- Explicit `data-design-node` remains the only Technical-MVP matching identity; no heuristic fallback exists.
- Mapping Setup Friction is a POST-MVP/pilot risk, not a new MVP mapping architecture.
- `font-family` remains P0 limited and cannot produce PASS without non-empty loaded CSS-connected-face evidence.
- P0 property names and tolerances remain unchanged.
- Exit codes remain `0/1/2/3/4`.
- `run` makes zero Figma calls and does not require a Figma token.
- Source semantics mean native Vue template host ownership, never CSS-declaration provenance.

# Patch Reconciliation

## FIX-001 Optional source location

Status:
Resolved

Affected files:
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

Decision:

```text
RuntimeNode.source?: SourceLocation
NodeMatch.source?: SourceLocation
Difference.source?: SourceLocation
```

Spike 1 may produce a source-less difference. After Vue Spike 2A PASS, supported Vue 3 + Vite run orchestration requires valid source metadata and fails `SOURCE_LOCATION_UNKNOWN` when it is missing or invalid.

Validation:
- no fake SourceLocation is required for Spike 1;
- JSON omits undefined `source`;
- post-Spike-2 source fixtures require exact repo-relative path/line/column;
- no second `Difference` model exists.

## FIX-002 Baseline semantics version

Status:
Resolved

Affected files:
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

Decision:

```text
schemaVersion: 1
baselineSemanticsVersion: 1
```

No npm/tool package version is stored in semantic baseline content. Baseline compatibility changes only when normalized baseline meaning/interpretation changes.

Validation:
- semantic hash includes `baselineSemanticsVersion`;
- package version bump with unchanged semantics remains compatible;
- mismatch uses `BASELINE_SEMANTICS_MISMATCH`, exit `2`;
- obsolete package-coupled baseline-version terminology is forbidden in active contracts; historical `Before` text is allowed only in the patch log.

## FIX-003 Automatic instrumentation env

Status:
Resolved

Affected files:
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

Decision:
- managed app launch: CLI injects `DESIGN_CONTRACT=1`;
- user runs plain `design-test run`;
- external `--no-start`: caller builds/starts instrumented app;
- post-Spike-2 uninstrumented `--no-start` fails `SOURCE_LOCATION_UNKNOWN` / exit `2`.

Validation:
- local CLI example no longer requires manual environment prefix;
- CI example still sets env on the external Vite build;
- tests cover both managed injection and external preflight.

## FIX-004 Mapping ergonomics risk

Status:
Resolved

Affected files:
- `00-README.md`
- `01-decision.md`
- `03-mvp-scope.md`
- `10-node-matching.md`
- `20-quality-gates.md`
- `25-backlog.md`
- `26-adr/ADR-001-explicit-node-mapping.md`
- `27-implementation-agent-prompt.md`

Decision:
Technical MVP remains raw explicit `data-design-node` + `contractNodeIds`. Mapping ergonomics is a pilot hypothesis named **Mapping Setup Friction**. The target product-UX principle is one canonical mapping declaration per runtime node.

Unselected pilot options retained for evidence gathering:
- config mapping;
- stable logical key + manifest;
- helper API;
- optional Code Connect seed;
- CLI/browser authoring helper.

Validation:
- none is promoted to MVP;
- no heuristic/confidence/fuzzy fallback is introduced;
- implementation agent is explicitly forbidden from building the ergonomic layer during the technical core.

## FIX-005 Font-family verification semantics

Status:
Resolved

Affected files:
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

Decision:
`font-family` P0 means declared/resolved primary CSS family plus positive loaded CSS-connected-face evidence, not actual glyph provenance.

Policy:
1. wait `document.fonts.ready`;
2. normalize primary computed family;
3. if it differs from Figma, report a normal mismatch;
4. if it matches, require `document.fonts.load()` for only the expected family to return a non-empty set of loaded CSS-connected faces;
5. empty/rejected/indeterminate evidence → `font-availability-unverifiable` skipped check, never PASS;
6. `FontFaceSet.check()` returning true is explicitly insufficient because fallback/nonexistent-family cases can also return true;
7. even a pass makes no direct-system-font or per-glyph provenance claim.

Validation:
- fixtures cover non-empty loaded-face evidence, mismatching family, empty/rejected/indeterminate evidence and readiness timeout;
- skipped counts/reporting expose the unverifiable case;
- quality gate forbids glyph-provenance claims.

## Resolved pre-existing conflicts retained

The original handoff decisions remain unchanged:
- `gap` is not P0; effective spacing is Post-MVP/P1;
- hover/focus setup actions are not MVP;
- simple solid `INSIDE` border is P0 limited; other stroke semantics are skipped;
- build-time Vue SFC instrumentation is the only MVP source strategy; no Vue private-runtime fallback;
- Spike 5 is 20-run CI determinism;
- repository remains one npm package with internal module boundaries;
- screenshots are not the core CI gate;
- latest Figma is never read during `run`.

## Mechanical consistency checks

Executed after all patches and before ZIP creation:

```text
mechanical assertions executed = 278
failed assertions = 0
obsolete baseline-version field/error in active contracts = 0
required source field in RuntimeNode/NodeMatch/Difference active contracts = 0
manual instrumentation prefix required for CLI-managed local run = 0
heuristic/fuzzy strategy in active contracts = 0
CSS-family equality or FontFaceSet.check(true) treated as sufficient font PASS = 0
markdown code-fence errors = 0
missing referenced markdown files = 0
```

`29-patchlog.md` intentionally contains historical `Before` snippets and is excluded from obsolete-token grep assertions.

Canonical `PropertyName` and `PROPERTY_ORDER` contain the same 27 entries in the same order. Fixtures/tests/agent prompt refer to that canonical P0 contract and retain the same limited-property semantics and tolerances.

## Remaining unknowns

1. Mapping Setup Friction and the best explicit ergonomic layer: `UNVERIFIED`, pilot evidence required.
2. Proposed P0 numeric tolerances: must pass Spike 4/5; coding agent may not tune them silently.
3. Actual per-glyph font provenance/fallback: intentionally outside MVP; current family contract is limited and labeled.
4. Vue compiler/Vite transform behavior across realistic plugin chains: must be proven in Spike 2A fixtures.
5. Exact-version Figma replay under real account/rate-limit conditions: must be proven in Spike 3.
6. Linux/Chromium 20/20 semantic determinism: must be proven in Spike 5.
7. Real-pilot FP/FN/actionability/commercial thresholds remain `UNVERIFIED`.

None requires a new architectural decision before Spike 1.

## New Blocking Issues

None.

## Blocking inconsistencies

```text
NONE
```
