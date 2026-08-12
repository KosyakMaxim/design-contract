# Diff Engine

## Responsibility

Compare matched canonical design/runtime nodes and produce deterministic `Difference`, `SkippedCheck`, status and summary values.

The diff engine knows nothing about Figma HTTP, Playwright, Vite ASTs or GitHub formatting.

## Input

For one test:

```ts
{
  baseline: DesignBaseline,
  runtimeNodes: RuntimeNode[],
  matches: NodeMatch[]
}
```

Adapters must already have normalized values to `NormalizedProperty`.

## Mapping errors first

No property comparison is trustworthy until explicit identity is valid.

If any required mapping has:

- missing runtime element;
- duplicate runtime elements;
- invalid id;
- node outside baseline membership;

then the test is a configuration error. The engine does not emit design mismatches for the affected run.

## Property selection

For each matched node, iterate `PROPERTY_ORDER`.

A property is comparable when:

1. design node has a normalized expected property;
2. runtime node has a normalized actual property;
3. neither side marks that expected property unsupported.

If design value is absent because the property is not applicable to that design node, there is no check.

If design expects a P0 property but adapter/runtime explicitly cannot normalize the supported subset, emit `SkippedCheck` with reason.

A mapped node with zero comparable properties is `NO_COMPARABLE_PROPERTIES`, configuration error. This prevents an unsupported node from silently passing.

## Comparison rules

### Numeric px

```ts
Math.abs(actual - expected) <= tolerance
```

### Opacity

Same numeric comparison with opacity tolerance.

### Font weight

Exact integer equality.

### Font family

Exact canonical normalized string equality **only when the runtime adapter has not marked the property `font-availability-unverifiable`**. A matching primary family without a non-empty loaded CSS-connected FontFace result is skipped, not passed. A different primary family remains a normal mismatch.

### Text

Exact equality after the configured shared content normalization.

### Color

All channels must satisfy:

```text
abs(actual.r - expected.r) <= 1
abs(actual.g - expected.g) <= 1
abs(actual.b - expected.b) <= 1
abs(actual.a - expected.a) <= 0.005
```

## Severity

MVP has one design difference severity:

```text
error
```

A supported difference outside tolerance fails the design contract.

Do not introduce warning-level near misses in MVP. If a property is unreliable, mark it unsupported or move it out of P0 through an ADR rather than weakening it into noise.

## Skipped / unsupported

Skipped checks are not design failures and are never counted as passes.

They must be visible in summary counts and machine JSON.

Examples:

```text
line-height: skipped (runtime-value-unparseable)
font-family: skipped (font-availability-unverifiable)
border-top-color: skipped (stroke-alignment)
```

## Aggregation

Per-test/run result severity uses one ordering:

```text
internal error
> runtime error
> configuration error
> design failed
> passed
```

Runtime errors are generally produced before entering the pure diff engine, but the result model preserves them.

Run-level precedence:

```text
internal error  → exit 4
runtime error   → exit 3
config error    → exit 2
design failure  → exit 1
all pass        → exit 0
```

If multiple categories occur across tests, the highest infrastructure/configuration severity wins the process exit code. The JSON still contains all completed test results.

## Deterministic ordering

Before returning semantic results:

1. sort tests by `testId` using byte/lexicographic order;
2. sort matches by `designNodeId` lexicographically;
3. sort mapping errors by `designNodeId`, then error code;
4. sort differences by `designNodeId`, then `PROPERTY_ORDER` index;
5. sort skipped checks by the same node/property order.

No object insertion order from network/DOM traversal is trusted.

## `Difference` example

`Difference.source` is optional in the canonical type. Spike 1 must be able to create the same difference without source. After Vue Spike 2A, supported run orchestration guarantees source before ordinary findings reach reporters.

Post-Spike-2 example:

```ts
const difference: Difference = {
  testId: "checkout-desktop",
  designNodeId: "42:1337",
  nodeName: "CheckoutCard",
  property: "padding-left",
  expected: 24,
  actual: 20,
  unit: "px",
  delta: -4,
  tolerance: 0.5,
  selector: '[data-design-node="42:1337"]',
  source: {
    file: "src/components/CheckoutCard.vue",
    line: 82,
    column: 5,
  },
  severity: "error",
};
```

`delta` convention:

```text
actual - expected
```

## Pass/fail rules

A test passes only if all are true:

- all required mappings resolve uniquely;
- at least one comparable property exists per contract node;
- no runtime error occurred;
- every comparable supported property is within tolerance.

Skipped checks can coexist with pass only when other supported checks exist and the skip represents an explicitly unsupported subset.

Source-attribution validity is deliberately **not** a pure diff-engine rule because Spike 1 has no source capability. Once Vue Spike 2A passes, CLI/browser orchestration must enforce the supported Vue 3 + Vite source invariant before accepting the final Technical MVP result.

## Pseudocode

```ts
function diffTest(
  test: TestCase,
  baseline: DesignBaseline,
  runtimeNodes: RuntimeNode[],
  matches: NodeMatch[],
): TestResult {
  const mappingErrors = validateMatches(test, baseline, runtimeNodes);
  if (mappingErrors.length > 0) {
    return configErrorResult(test, baseline, matches, mappingErrors);
  }

  const differences: Difference[] = [];
  const skipped: SkippedCheck[] = [];
  let passedChecks = 0;

  for (const nodeId of sortIds(test.contractNodeIds)) {
    const design = baseline.nodes[nodeId];
    const runtime = runtimeNodesById(runtimeNodes).get(nodeId)!;
    let comparableForNode = 0;

    for (const property of PROPERTY_ORDER) {
      const expected = design.properties[property];
      if (!expected) continue;

      const runtimeSkip = findUnsupported(runtime, property);
      const designSkip = findUnsupported(design, property);
      if (designSkip || runtimeSkip) {
        skipped.push(toSkipped(test.id, nodeId, property, designSkip ?? runtimeSkip));
        continue;
      }

      const actual = runtime.properties[property];
      if (!actual) {
        skipped.push(toSkipped(test.id, nodeId, property, "runtime-value-unparseable"));
        continue;
      }

      comparableForNode++;
      const comparison = compareProperty(expected, actual);

      if (comparison.equal) passedChecks++;
      else differences.push(toDifference(test, design, runtime, comparison));
    }

    if (comparableForNode === 0) {
      throw new ConfigurationError("NO_COMPARABLE_PROPERTIES", nodeId);
    }
  }

  return canonicalizeTestResult({
    testId: test.id,
    figmaVersion: baseline.figma.version,
    status: differences.length ? "design-failed" : "passed",
    matches,
    differences,
    skipped,
    mappingErrors: [],
    passedChecks,
    failedChecks: differences.length,
    skippedChecks: skipped.length,
  });
}
```

## No cascade suppression in MVP

If changing one parent width legitimately causes child width differences, each supported mapped node may report its own mismatch. The engine does not guess a root cause and suppress descendants in MVP.

Reporter grouping by node makes this readable. Automatic root-cause attribution is Later.
