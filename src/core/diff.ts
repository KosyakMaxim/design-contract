import type { DesignBaseline, Difference, MappingError, NodeMatch, RuntimeNode, SkippedCheck, TestResult } from "./domain.js";

const PADDING_TOLERANCE = 0.5;

// Сравнивает один canonical padding-left с нормативной tolerance 0.5px.
function comparePaddingLeft(
  testId: string,
  baseline: DesignBaseline,
  match: NodeMatch,
  runtimeNode: RuntimeNode,
): Difference | undefined {
  const expected = baseline.nodes[match.designNodeId]?.properties["padding-left"]?.value;
  const actual = runtimeNode.properties["padding-left"]?.value;
  if (expected === undefined || actual === undefined || Math.abs(actual - expected) <= PADDING_TOLERANCE) {
    return undefined;
  }

  return {
    testId,
    designNodeId: match.designNodeId,
    nodeName: baseline.nodes[match.designNodeId]?.name ?? match.designNodeId,
    property: "padding-left",
    expected,
    actual,
    unit: "px",
    delta: actual - expected,
    tolerance: PADDING_TOLERANCE,
    selector: match.runtimeSelector,
    severity: "error",
  };
}

// Формирует deterministic TestResult с mapping errors prioritized over property differences.
export function diffSpike1(
  baseline: DesignBaseline,
  matches: NodeMatch[],
  mappingErrors: MappingError[],
  runtimeNodes: RuntimeNode[],
): TestResult {
  const testId = baseline.testId;
  if (mappingErrors.length > 0) {
    return {
      testId,
      figmaVersion: baseline.figma.version,
      status: "configuration-error",
      matches,
      differences: [],
      skipped: [],
      mappingErrors: [...mappingErrors].sort((left, right) => left.code.localeCompare(right.code)),
      passedChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
    };
  }

  const runtimeById = Object.fromEntries(runtimeNodes.map((node) => [node.designNodeId, node]));
  const skipped: SkippedCheck[] = [];
  const differences = matches
    .map((match) => {
      const runtimeNode = runtimeById[match.designNodeId];
      if (runtimeNode === undefined) {
        return undefined;
      }
      const designNode = baseline.nodes[match.designNodeId];
      const expected = designNode?.properties["padding-left"];
      if (expected === undefined) {
        const unsupported = designNode?.unsupported.find((item) => item.name === "padding-left");
        if (unsupported !== undefined) {
          skipped.push({ testId, designNodeId: match.designNodeId, property: "padding-left", reason: unsupported.reason });
        }
        return undefined;
      }
      return comparePaddingLeft(testId, baseline, match, runtimeNode);
    })
    .filter((difference): difference is Difference => difference !== undefined)
    .sort((left, right) => left.designNodeId.localeCompare(right.designNodeId));

  return {
    testId,
    figmaVersion: baseline.figma.version,
    status: skipped.length > 0 ? "configuration-error" : differences.length === 0 ? "passed" : "design-failed",
    matches,
    differences,
    skipped,
    mappingErrors: [],
    passedChecks: differences.length === 0 && skipped.length === 0 ? 1 : 0,
    failedChecks: differences.length,
    skippedChecks: skipped.length,
  };
}

// Создает run-level semantic result без duration, timestamp или абсолютных путей.
export function summarizeRun(test: TestResult): import("./domain.js").RunResult {
  const configurationErrors = test.status === "configuration-error" ? 1 : 0;
  const failedTests = test.status === "passed" ? 0 : 1;
  return {
    schemaVersion: 1,
    status: test.status,
    exitCode: test.status === "passed" ? 0 : test.status === "design-failed" ? 1 : 2,
    tests: [test],
    summary: {
      tests: 1,
      passedTests: test.status === "passed" ? 1 : 0,
      failedTests,
      configurationErrors,
      runtimeErrors: 0,
      passedChecks: test.passedChecks,
      failedChecks: test.failedChecks,
    skippedChecks: test.skippedChecks,
    },
  };
}
