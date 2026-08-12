# Domain Model

This file defines the canonical TypeScript model. Other documents may show subsets for examples, but field names and semantics must remain consistent with this model.

```ts
export type TestId = string;
export type DesignNodeId = string;

export type RunStatus =
  | "passed"
  | "design-failed"
  | "configuration-error"
  | "runtime-error"
  | "internal-error";

export type Reliability = "high" | "medium";

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

export interface SourceLocation {
  /** Repo-relative POSIX path. Never absolute. */
  file: string;
  /** 1-based source line. */
  line: number;
  /** 1-based source column. */
  column: number;
}

export interface CanonicalColor {
  /** Integers 0..255. */
  r: number;
  g: number;
  b: number;
  /** Float 0..1, rounded canonically. */
  a: number;
}

export type NormalizedValue = number | string | CanonicalColor;

export interface NormalizedProperty {
  name: PropertyName;
  value: NormalizedValue;
  unit: PropertyUnit;
  reliability: Reliability;
  provenance:
    | "figma-rest"
    | "browser-geometry"
    | "browser-computed-style"
    | "browser-dom";
}

export interface UnsupportedProperty {
  name: PropertyName;
  reason:
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
}

export interface DesignNode {
  id: DesignNodeId;
  name: string;
  type: "FRAME" | "COMPONENT" | "INSTANCE" | "TEXT" | "RECTANGLE";
  parentId?: DesignNodeId;
  properties: Partial<Record<PropertyName, NormalizedProperty>>;
  unsupported: UnsupportedProperty[];
}

export interface RuntimeNode {
  designNodeId: DesignNodeId;
  selector: string;
  tagName: string;
  /** Optional until Source Mapping capability is established by Spike 2. */
  source?: SourceLocation;
  properties: Partial<Record<PropertyName, NormalizedProperty>>;
  unsupported: UnsupportedProperty[];
}

export interface NodeMatch {
  designNodeId: DesignNodeId;
  runtimeSelector: string;
  strategy: "explicit";
  /** Optional in Spike 1; required by the supported run-path invariant after Spike 2. */
  source?: SourceLocation;
}

export interface Difference {
  testId: TestId;
  designNodeId: DesignNodeId;
  nodeName: string;
  property: PropertyName;
  expected: NormalizedValue;
  actual: NormalizedValue;
  unit: PropertyUnit;
  delta?: number;
  tolerance?: number;
  selector: string;
  /** Optional in the base domain model so Spike 1 can emit a real difference before source mapping exists. */
  source?: SourceLocation;
  severity: "error";
}

export type ContentPolicy =
  | "off"
  | "exact"
  | "trim"
  | "collapse-whitespace";

export type SetupAction =
  | {
      type: "click";
      selector: string;
      timeoutMs?: number;
    }
  | {
      type: "fill";
      selector: string;
      value: string;
      timeoutMs?: number;
    }
  | {
      type: "press";
      selector: string;
      key: string;
      timeoutMs?: number;
    }
  | {
      type: "waitFor";
      selector: string;
      state?: "attached" | "visible" | "hidden" | "detached";
      timeoutMs?: number;
    };

export interface Viewport {
  width: number;
  height: number;
}

export interface TestCase {
  id: TestId;
  route: string;
  figmaNodeId: DesignNodeId;
  /** Explicit design IDs that must each exist exactly once in DOM. */
  contractNodeIds: DesignNodeId[];
  viewport: Viewport;
  storageState?: string;
  contentPolicy: ContentPolicy;
  setup: SetupAction[];
}

export interface FigmaBaselineMetadata {
  fileKey: string;
  version: string;
  rootNodeId: DesignNodeId;
}

export interface DesignBaseline {
  schemaVersion: 1;
  /** Changes only when normalized baseline meaning/interpretation changes. */
  baselineSemanticsVersion: 1;
  testId: TestId;
  figma: FigmaBaselineMetadata;
  contractNodeIds: DesignNodeId[];
  nodes: Record<DesignNodeId, DesignNode>;
  semanticHash: string;
}

export interface SkippedCheck {
  testId: TestId;
  designNodeId: DesignNodeId;
  property: PropertyName;
  reason: UnsupportedProperty["reason"];
}

export interface MappingError {
  code:
    | "MAPPING_MISSING"
    | "MAPPING_DUPLICATE"
    | "MAPPING_INVALID_ID"
    | "MAPPING_OUTSIDE_SUBTREE";
  testId: TestId;
  designNodeId: DesignNodeId;
  message: string;
}

export interface TestResult {
  testId: TestId;
  figmaVersion: string;
  status: "passed" | "design-failed" | "configuration-error" | "runtime-error";
  matches: NodeMatch[];
  differences: Difference[];
  skipped: SkippedCheck[];
  mappingErrors: MappingError[];
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  /** Internal diagnostic only; default JSON reporter omits it. */
  durationMs?: number;
}

export interface RunSummary {
  tests: number;
  passedTests: number;
  failedTests: number;
  configurationErrors: number;
  runtimeErrors: number;
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
}

export interface RunResult {
  schemaVersion: 1;
  status: RunStatus;
  exitCode: 0 | 1 | 2 | 3 | 4;
  tests: TestResult[];
  summary: RunSummary;
  /** Internal only unless explicitly requested; excluded from semantic JSON. */
  durationMs?: number;
}
```

## Important semantics

### `contractNodeIds`

This is the explicit membership set for a test. It solves an otherwise impossible ambiguity: an absent DOM element cannot be detected as a missing mapping unless the engine knows the element was required. The mapping strategy is still the runtime `data-design-node` attribute; the config list only declares which Figma IDs are part of the contract.

Rules:

- unique within a test;
- non-empty;
- must include `figmaNodeId` in MVP;
- every ID must be inside the configured Figma subtree;
- every ID must resolve to exactly one DOM element at run time.

### Source semantics and capability phase

`SourceLocation` identifies the native HTML element inside a Vue SFC `<template>` that produced the mapped DOM element.

The base domain model deliberately keeps `RuntimeNode.source`, `NodeMatch.source`, and `Difference.source` optional. This is required so Spike 1 can prove mapping + property diff without implementing Spike 2 early or fabricating a source location.

Capability invariant:

```text
Spike 1: source may be absent.
Spike 2A+: supported Vue 3 + Vite instrumented run: source must be present for every required mapped host and every resulting Difference.
```

After Spike 2 passes, missing/invalid source metadata is rejected by orchestration as `SOURCE_LOCATION_UNKNOWN` before an ordinary supported finding is reported. This is an acceptance/runtime invariant, not a second incompatible `Difference` type.

Example:

```vue
<!-- src/components/Button.vue:41:3 -->
<button data-design-node="42:44">Pay</button>
```

If a parent renders `<Button className={styles.primary} />`, the source location reported for the DOM button is the host `<button>` definition, not necessarily the `<Button>` callsite and never a promise to locate `padding` in a CSS module.

### Baseline semantics version

`baselineSemanticsVersion` is independent of the npm/package version. It changes only when the meaning or structure of the normalized baseline changes, including extraction semantics, normalization semantics, canonical value interpretation, serialized baseline fields, or interpretation of existing fields. Reporter, CLI UX, documentation, or internal-refactor patch releases do not change it.

### `NormalizedProperty`

Adapters must not leak Figma field names or browser serialization into the diff engine. The diff engine only receives canonical property names/values.

### `unsupported`

Unsupported does not mean equal. Unsupported checks are surfaced as skipped. A test with zero comparable checks after mapping is a configuration error rather than a false pass.
