# ADR-002: Vue 3 + Vite + SFC Only

## Context

Source ownership is part of the wedge. Vue 3 Single File Components have a distinct compiler pipeline, and the MVP must prove one framework-specific source contract without pretending that instrumentation transfers automatically between frameworks.

## Decision

Technical MVP supports exactly:

```text
Vue 3 + Vite + .vue Single File Components
```

The source integration uses `vue/compiler-sfc` through the official Vite Vue plugin. Source semantics refer to native HTML elements inside `<template>`.

Next.js, Svelte, Angular and other frameworks are outside this task and require their own source-mapping spike and ADR before implementation.

## Alternatives

1. Framework-agnostic source maps: rejected because source maps alone do not give a deterministic DOM-to-template-host anchor.
2. All major frameworks from launch: rejected as scope expansion before the core is proven.

## Consequences

- Vue fixture and CI matrix is the MVP source-instrumentation contract;
- custom component attribute fallthrough is not the primary mapping contract;
- Shadow DOM is not included in Vue Spike 2A; the separate Spike 2B supports explicit mappings inside accessible `open ShadowRoot` trees;
- future framework work requires its own spike/ADR.

## Status

Accepted for the revised Technical MVP.
