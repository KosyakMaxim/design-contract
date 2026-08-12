export type PropertyName = "padding-left" | "width";
export type PropertyUnit = "px";

export const BASELINE_SEMANTICS_VERSION = 1;

export interface NormalizedProperty {
  name: PropertyName;
  value: number;
  unit: PropertyUnit;
  reliability: "high";
  provenance: "figma-rest" | "browser-computed-style";
}

export interface DesignNode {
  id: string;
  name: string;
  type: "FRAME" | "COMPONENT" | "INSTANCE" | "TEXT" | "RECTANGLE";
  parentId?: string;
  properties: Partial<Record<PropertyName, NormalizedProperty>>;
  unsupported: UnsupportedProperty[];
}

export interface UnsupportedProperty {
  name: PropertyName;
  reason: "figma-value-absent" | "node-type-unsupported" | "transformed-geometry";
}

export interface FigmaBaselineMetadata {
  fileKey: string;
  version: string;
  rootNodeId: string;
}

export interface DesignBaseline {
  schemaVersion: 1;
  baselineSemanticsVersion: number;
  testId: string;
  figma: FigmaBaselineMetadata;
  contractNodeIds: string[];
  nodes: Record<string, DesignNode>;
  semanticHash: string;
}

export interface RuntimeNode {
  designNodeId: string;
  selector: string;
  tagName: string;
  properties: Partial<Record<PropertyName, NormalizedProperty>>;
  unsupported: never[];
}

export interface NodeMatch {
  designNodeId: string;
  runtimeSelector: string;
  strategy: "explicit";
}

export interface MappingError {
  code: "MAPPING_MISSING" | "MAPPING_DUPLICATE";
  testId: string;
  designNodeId: string;
  message: string;
}

export interface SkippedCheck {
  testId: string;
  designNodeId: string;
  property: PropertyName;
  reason: UnsupportedProperty["reason"];
}

export interface Difference {
  testId: string;
  designNodeId: string;
  nodeName: string;
  property: PropertyName;
  expected: number;
  actual: number;
  unit: PropertyUnit;
  delta: number;
  tolerance: number;
  selector: string;
  severity: "error";
}

export interface TestResult {
  testId: string;
  figmaVersion: string;
  status: "passed" | "design-failed" | "configuration-error";
  matches: NodeMatch[];
  differences: Difference[];
  skipped: SkippedCheck[];
  mappingErrors: MappingError[];
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
}

export interface RunResult {
  schemaVersion: 1;
  status: "passed" | "design-failed" | "configuration-error";
  exitCode: 0 | 1 | 2;
  tests: TestResult[];
  summary: {
    tests: number;
    passedTests: number;
    failedTests: number;
    configurationErrors: number;
    runtimeErrors: 0;
    passedChecks: number;
    failedChecks: number;
    skippedChecks: number;
  };
}
