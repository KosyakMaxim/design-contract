export type PropertyName =
  | "width"
  | "height"
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "font-family"
  | "font-size"
  | "font-weight"
  | "line-height"
  | "letter-spacing"
  | "text-content"
  | "color"
  | "background-color"
  | "border-top-width"
  | "border-right-width"
  | "border-bottom-width"
  | "border-left-width"
  | "border-top-color"
  | "border-right-color"
  | "border-bottom-color"
  | "border-left-color"
  | "border-top-left-radius"
  | "border-top-right-radius"
  | "border-bottom-right-radius"
  | "border-bottom-left-radius"
  | "opacity";

export type PropertyUnit = "px" | "number" | "rgba" | "text" | "font-family";
export type NormalizedValue = number | string | CanonicalColor;

export const BASELINE_SEMANTICS_VERSION = 2;

export interface CanonicalColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface NormalizedProperty {
  name: PropertyName;
  value: NormalizedValue;
  unit: PropertyUnit;
  reliability: "high" | "medium";
  provenance: "figma-rest" | "browser-geometry" | "browser-computed-style" | "browser-dom";
}

export type UnsupportedReason =
  | "figma-value-absent"
  | "node-type-unsupported"
  | "mixed-text-style"
  | "multiple-visible-fills"
  | "non-solid-fill"
  | "corner-smoothing"
  | "stroke-alignment"
  | "complex-stroke"
  | "transformed-geometry"
  | "font-availability-unverifiable"
  | "runtime-value-unparseable"
  | "content-check-disabled";

export interface UnsupportedProperty {
  name: PropertyName;
  reason: UnsupportedReason;
}

export interface DesignNode {
  id: string;
  name: string;
  type: "FRAME" | "COMPONENT" | "INSTANCE" | "TEXT" | "RECTANGLE";
  parentId?: string;
  properties: Partial<Record<PropertyName, NormalizedProperty>>;
  unsupported: UnsupportedProperty[];
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
  unsupported: UnsupportedProperty[];
}

export interface NodeMatch {
  designNodeId: string;
  runtimeSelector: string;
  strategy: "explicit";
}

export interface MappingError {
  code: "MAPPING_MISSING" | "MAPPING_DUPLICATE" | "NO_COMPARABLE_PROPERTIES";
  testId: string;
  designNodeId: string;
  message: string;
}

export interface SkippedCheck {
  testId: string;
  designNodeId: string;
  property: PropertyName;
  reason: UnsupportedReason;
}

export interface Difference {
  testId: string;
  designNodeId: string;
  nodeName: string;
  property: PropertyName;
  expected: NormalizedValue;
  actual: NormalizedValue;
  unit: PropertyUnit;
  delta?: number;
  tolerance?: number;
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
