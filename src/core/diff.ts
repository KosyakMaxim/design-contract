import { compareNormalized, PROPERTY_ORDER } from "./normalization.js";
import type { DesignBaseline, Difference, MappingError, NodeMatch, NormalizedProperty, PropertyName, RuntimeNode, SkippedCheck, TestResult } from "./domain.js";

// Возвращает property order index for deterministic result ordering.
function propertyIndex(name: PropertyName): number { return PROPERTY_ORDER.indexOf(name); }

// Создаёт deterministic skipped diagnostic for unsupported/unverifiable value.
function skippedCheck(testId: string, designNodeId: string, property: SkippedCheck["property"], reason: SkippedCheck["reason"]): SkippedCheck { return { testId, designNodeId, property, reason }; }

// Создаёт one canonical Difference from normalized expected/actual values.
function toDifference(testId: string, baseline: DesignBaseline, match: NodeMatch, expected: NormalizedProperty, actual: NormalizedProperty, comparison: ReturnType<typeof compareNormalized>): Difference {
  return { testId, designNodeId: match.designNodeId, nodeName: baseline.nodes[match.designNodeId]?.name ?? match.designNodeId, property: expected.name, expected: expected.value, actual: actual.value, unit: expected.unit, ...(comparison.delta === undefined ? {} : { delta: comparison.delta }), ...(comparison.tolerance === undefined ? {} : { tolerance: comparison.tolerance }), selector: match.runtimeSelector, severity: "error" };
}

// Выполняет P0 comparison for all normalized properties in documented canonical order.
export function diffP0(baseline: DesignBaseline, matches: NodeMatch[], mappingErrors: MappingError[], runtimeNodes: RuntimeNode[]): TestResult {
  const testId = baseline.testId;
  if (mappingErrors.length > 0) return { testId, figmaVersion: baseline.figma.version, status: "configuration-error", matches, differences: [], skipped: [], mappingErrors: [...mappingErrors].sort((left, right) => left.designNodeId.localeCompare(right.designNodeId) || left.code.localeCompare(right.code)), passedChecks: 0, failedChecks: 0, skippedChecks: 0 };
  const runtimeById = Object.fromEntries(runtimeNodes.map((node) => [node.designNodeId, node]));
  const differences: Difference[] = [];
  const skipped: SkippedCheck[] = [];
  const noComparable: MappingError[] = [];
  let passedChecks = 0;

  for (const match of [...matches].sort((left, right) => left.designNodeId.localeCompare(right.designNodeId))) {
    const design = baseline.nodes[match.designNodeId];
    const runtime = runtimeById[match.designNodeId];
    if (design === undefined || runtime === undefined) continue;
    let comparableForNode = 0;
    for (const property of PROPERTY_ORDER) {
      const expected = design.properties[property];
      if (expected === undefined) continue;
      const designUnsupported = design.unsupported.find((item) => item.name === property);
      const runtimeUnsupported = runtime.unsupported.find((item) => item.name === property);
      if (designUnsupported !== undefined || runtimeUnsupported !== undefined) {
        skipped.push(skippedCheck(testId, match.designNodeId, property, designUnsupported?.reason ?? runtimeUnsupported?.reason ?? "runtime-value-unparseable"));
        continue;
      }
      const actual = runtime.properties[property];
      if (actual === undefined) {
        skipped.push(skippedCheck(testId, match.designNodeId, property, "runtime-value-unparseable"));
        continue;
      }
      comparableForNode += 1;
      const comparison = compareNormalized(property, expected.value, actual.value);
      if (comparison.equal) passedChecks += 1;
      else differences.push(toDifference(testId, baseline, match, expected, actual, comparison));
    }
    if (comparableForNode === 0) noComparable.push({ code: "NO_COMPARABLE_PROPERTIES", testId, designNodeId: match.designNodeId, message: `No comparable P0 properties were available for ${match.designNodeId}.` });
  }

  const sortedSkipped = skipped.sort((left, right) => left.designNodeId.localeCompare(right.designNodeId) || propertyIndex(left.property) - propertyIndex(right.property) || left.reason.localeCompare(right.reason));
  const sortedDifferences = differences.sort((left, right) => left.designNodeId.localeCompare(right.designNodeId) || propertyIndex(left.property) - propertyIndex(right.property));
  const allMappingErrors = [...noComparable].sort((left, right) => left.designNodeId.localeCompare(right.designNodeId));
  return { testId, figmaVersion: baseline.figma.version, status: allMappingErrors.length > 0 ? "configuration-error" : sortedDifferences.length > 0 ? "design-failed" : "passed", matches: [...matches].sort((left, right) => left.designNodeId.localeCompare(right.designNodeId)), differences: sortedDifferences, skipped: sortedSkipped, mappingErrors: allMappingErrors, passedChecks, failedChecks: sortedDifferences.length, skippedChecks: sortedSkipped.length };
}

// Backward-compatible Spike 1 entrypoint now delegates to the canonical P0 engine.
export function diffSpike1(baseline: DesignBaseline, matches: NodeMatch[], mappingErrors: MappingError[], runtimeNodes: RuntimeNode[]): TestResult { return diffP0(baseline, matches, mappingErrors, runtimeNodes); }

// Создаёт run-level semantic result without timestamps/durations/absolute paths.
export function summarizeRun(test: TestResult): import("./domain.js").RunResult {
  const configurationErrors = test.status === "configuration-error" ? 1 : 0;
  const failedTests = test.status === "passed" ? 0 : 1;
  return { schemaVersion: 1, status: test.status, exitCode: test.status === "passed" ? 0 : test.status === "design-failed" ? 1 : 2, tests: [test], summary: { tests: 1, passedTests: test.status === "passed" ? 1 : 0, failedTests, configurationErrors, runtimeErrors: 0, passedChecks: test.passedChecks, failedChecks: test.failedChecks, skippedChecks: test.skippedChecks } };
}
