# Quality Gates

## Controlled fixtures

Non-negotiable:

```text
false positives = 0
seeded supported false negatives = 0
```

A controlled fixture is one where expected design value, runtime value, environment and mutation are intentionally known.

No tolerance inflation is allowed simply to make this gate pass.

## Determinism

Non-negotiable:

```text
20 identical pinned CI runs
→ one identical semantic JSON result
→ one identical result category / exit code
```

The semantic JSON contains no volatile fields, so the gate compares byte content or SHA-256 directly.

## Source instrumentation

Spike 1 is explicitly exempt from source presence; it must prove the base domain model can emit a source-less difference. After Vue Spike 2A passes, for the supported source fixture suite:

```text
expected Vue SFC native host locations correct = 100%
line error tolerance = 0
column convention = exact fixture expectation
production build without flag source metadata = 0 occurrences
managed CLI app launch instrumentation env = automatic
uninstrumented --no-start accepted after Spike 2A = 0 occurrences
```

## Mapping

```text
required exact mappings resolved = 100%
missing detected = 100%
duplicate detected = 100%
heuristic matches = 0
```

## Baseline

```text
run-time Figma calls = 0
baseline hash verification = 100%
exact version stored = 100%
volatile timestamps in semantic baseline = 0
npm/tool package version in semantic baseline = 0
package version bump with unchanged semantics invalidates baseline = 0
```

## Font-family limited-contract gate

```text
matching primary family + non-empty loaded CSS-connected `FontFace` evidence may be counted as comparable
matching primary family + empty/rejected/indeterminate CSS-connected-face evidence → skipped, never PASS
different primary family → deterministic mismatch
`FontFaceSet.check(true)` used as positive proof = 0
glyph-level/direct-system-font provenance claim = 0
```

## P0 fixture coverage

Every P0 property requires:

- one pass fixture;
- one seeded fail outside tolerance;
- tolerance boundary tests where numeric;
- explicit unsupported fixture for each known limited subset that otherwise risks false precision.

## Real pilot targets

These are product gates, not established industry standards:

```text
false-positive target ≤ 5%
seeded supported false-negative target ≤ 2%
actionable findings ≥ 80%
```

Mapping Setup Friction is also an explicit pilot risk. Before selecting an ergonomic mapping layer, measure setup/maintenance burden and whether duplicate raw Figma IDs are an adoption blocker. No numeric threshold or preferred Option A-E is established yet.

Status:

```text
UNVERIFIED
```

Definitions:

- **False positive:** a reported supported finding that the pilot team reasonably rejects as equivalent/incorrect/noisy under the documented contract.
- **Seeded false negative:** a deliberate supported-property change outside tolerance that is not reported.
- **Actionable finding:** a finding where the engineer agrees the expected/actual + DOM + Vue SFC native host information is enough to decide what to inspect/fix next without rediscovering the element manually.

## Stop gate

Any failure of a fundamental spike blocks subsequent implementation until the product/spec owner resolves it. The coding agent must emit the blocker format from `27-implementation-agent-prompt.md` rather than changing product semantics.
