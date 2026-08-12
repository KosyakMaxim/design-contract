# ADR-005: Vue SFC Build-Time Source Instrumentation

## Context

A DOM node does not natively know which native Vue SFC template element source location created it. Vue private runtime metadata is framework-version-sensitive. Source maps alone lack a deterministic DOM anchor.

## Decision

Spike 2A instruments native elements in Vue `<template>` ASTs at Vite build time using `vue/compiler-sfc` and the official Vite Vue plugin/compiler pipeline.

Runtime metadata:

```html
data-design-test-source="repo/relative/file.vue:line:column"
```

The attribute exists only in Design Contract dev/test builds. When `design-test run` starts the configured app command, CLI injects `DESIGN_CONTRACT=1` automatically. For externally managed `--no-start` apps, the caller enables instrumentation and the CLI validates metadata after Spike 2A.

The base domain source fields remain optional so Spike 1 can run before this capability exists. After Spike 2A passes, source presence becomes a supported-run acceptance invariant rather than a required field in a second domain model.

The source location means the native HTML element declared inside the Vue SFC `<template>`. It does not mean a custom component, CSS declaration or Vue runtime object.

Shadow DOM traversal is implemented separately in Spike 2B. The browser adapter may traverse accessible `open ShadowRoot` trees using standard DOM APIs, while source instrumentation remains owned by the Vue SFC/Vite compiler pipeline. Closed ShadowRoot and cross-origin iframe traversal remain unsupported.

## Alternatives

1. **Vue runtime internals:** rejected for stability and framework-version coupling.
2. **Regex parsing of `.vue`:** rejected because it cannot safely model SFC/template syntax.
3. **Manual source attribute:** rejected as duplicate setup and not a reliable compiler contract.
4. **Source-map-only inference:** rejected because it lacks a deterministic runtime DOM anchor.

## Consequences

- exact source can be fixture-tested;
- Vue compiler/build-tool integration is explicit and bounded;
- native host ownership is precise;
- custom component fallthrough is not relied upon;
- Other frameworks remain outside this task;
- Shadow DOM traversal is a separate, explicit-mapping-only adapter capability.

## Status

Accepted for the revised Technical MVP.
