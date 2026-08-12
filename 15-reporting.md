# Reporting

## MVP reporters

```text
terminal
JSON
process exit code
GitHub annotation
GitHub step summary
```

## Later

```text
HTML
JUnit
PR bot comment
hosted run history
```

## Terminal output

Failure example:

```text
Design Contract FAILED

checkout-desktop
Figma version: 987654321
Viewport: 1440 × 900

CheckoutCard · Figma 42:1337
  padding-left
  expected: 24px
  actual:   20px
  delta:    -4px
  tolerance: ±0.5px

  DOM: [data-design-node="42:1337"]
  Vue host: src/components/CheckoutCard.vue:82:5

Price · Figma 42:1400
  font-weight
  expected: 600
  actual:   500

  DOM: [data-design-node="42:1400"]
  Vue host: src/components/Price.vue:41:7

53 passed · 2 failed · 1 skipped
Result: DESIGN_FAILURE
Exit code: 1

Note: Vue host points to the native template element owner, not necessarily the CSS declaration that caused the mismatch.
```

Pass example:

```text
Design Contract PASSED

checkout-desktop
57 passed · 0 failed · 0 skipped

Result: PASS
Exit code: 0
```

## Default JSON report

Path comes from config, default:

```text
.design-contract/results.json
```

### JSON schema shape

`source` is optional on `matches[]` and `differences[]`. Spike 1 golden JSON omits it. After Vue Spike 2A passes, the supported Vue 3 + Vite run path must reject missing instrumentation before ordinary design findings are accepted, so final Technical MVP findings are expected to contain source.

```json
{
  "schemaVersion": 1,
  "status": "design-failed",
  "exitCode": 1,
  "tests": [
    {
      "testId": "checkout-desktop",
      "figmaVersion": "987654321",
      "status": "design-failed",
      "matches": [
        {
          "designNodeId": "42:1337",
          "runtimeSelector": "[data-design-node=\"42:1337\"]",
          "strategy": "explicit",
          "source": {
            "file": "src/components/CheckoutCard.vue",
            "line": 82,
            "column": 5
          }
        }
      ],
      "differences": [
        {
          "testId": "checkout-desktop",
          "designNodeId": "42:1337",
          "nodeName": "CheckoutCard",
          "property": "padding-left",
          "expected": 24,
          "actual": 20,
          "unit": "px",
          "delta": -4,
          "tolerance": 0.5,
          "selector": "[data-design-node=\"42:1337\"]",
          "source": {
            "file": "src/components/CheckoutCard.vue",
            "line": 82,
            "column": 5
          },
          "severity": "error"
        }
      ],
      "skipped": [],
      "mappingErrors": [],
      "passedChecks": 53,
      "failedChecks": 1,
      "skippedChecks": 0
    }
  ],
  "summary": {
    "tests": 1,
    "passedTests": 0,
    "failedTests": 1,
    "configurationErrors": 0,
    "runtimeErrors": 0,
    "passedChecks": 53,
    "failedChecks": 1,
    "skippedChecks": 0
  }
}
```

The JSON reporter is a direct serialized projection of canonical domain results. It must not invent adapter-specific fields. Optional fields that are `undefined`, including pre-Spike-2 `source`, are omitted rather than serialized as fake/empty locations.

## Stable JSON requirement

Default JSON intentionally omits:

- timestamps;
- wall-clock durations;
- process IDs;
- random IDs;
- temporary paths;
- request IDs;
- latest Figma metadata;
- machine hostname.

Ordering:

```text
test id
→ design node id
→ property order
```

Twenty pinned identical runs must produce byte-identical semantic JSON after the same line-ending convention.

An optional future diagnostic/timing output may be separate from the semantic report; do not put it into golden comparisons.

## GitHub annotations

MVP uses GitHub Actions workflow command annotations emitted to stdout/stderr. No GitHub App or API token is required for this feature.

For a source-backed difference, emit equivalent metadata to:

```text
file=src/components/CheckoutCard.vue
line=82
col=5
title=Design Contract: padding-left
message=expected 24px, actual 20px; Figma 42:1337; DOM [data-design-node="42:1337"]
```

The annotation message must not claim line 82 contains the CSS declaration.

Configuration/runtime errors without a safe source location use job-level error annotations without file/line metadata. A source-less `Difference` is valid only for Spike 1/internal capability fixtures; GitHub source annotations are not required until Spike 2. After Spike 2, the supported run path fails `SOURCE_LOCATION_UNKNOWN` instead of emitting a normal source-less finding.

## GitHub summary

When `github` reporter is active and `GITHUB_STEP_SUMMARY` is available, append a compact Markdown summary containing:

- overall status;
- test ids and Figma versions;
- pass/fail/skipped counts;
- finding table: node, property, expected, actual, Vue SFC native host;
- explicit note about source semantics.

The summary also surfaces skipped P0 checks with their reason. In particular, `font-family` without positive loaded CSS-connected-face evidence is shown as `font-availability-unverifiable`, never as a passed check.

Do not post a PR comment in MVP.

## Exit code mapping

```text
0 PASS
1 DESIGN_FAILURE
2 CONFIGURATION_ERROR
3 RUNTIME_ERROR
4 INTERNAL_ERROR
```

Report generation failures are `INTERNAL_ERROR` unless caused by an invalid user output path, which is configuration error.
