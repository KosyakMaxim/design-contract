# Vite Instrumentation

## Purpose

Attach deterministic Vue SFC native-template ownership to rendered DOM elements during Design Contract dev/test builds.

Input:

```vue
<template>
  <button data-design-node="42:200">Pay</button>
</template>
```

Instrumented runtime:

```html
<button
  data-design-node="42:200"
  data-design-test-source="src/components/Button.vue:3:3"
>
  Pay
</button>
```

The source location means the native HTML element inside `<template>` that created the mapped DOM element. It does not locate CSS declarations and does not identify a custom component abstraction.

## Vite API contract

Use the official Vue toolchain:

- `vue/compiler-sfc` through the official Vite Vue plugin;
- a Vite plugin/compiler-options transform active only for Design Contract builds;
- Vue compiler template AST node transforms, never regular expressions over `.vue` text;
- Vite dev/HMR and Vite build.

Do not depend on Vue private runtime internals or experimental Vite APIs.

Reference: https://vite.dev/guide/api-plugin

## Activation

Instrumentation is enabled only when one of these is true:

```text
DESIGN_CONTRACT=1
explicit plugin option enabled: true
```

`DESIGN_CONTRACT=1` is the canonical activation variable. When `design-test run` starts `app.command`, the CLI injects it automatically. For `--no-start`, the external build/start process must enable it and the CLI validates the runtime metadata after Spike 2A.

Recommended consumer configuration:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { designContractVue } from 'design-contract/vite';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          nodeTransforms: [designContractVue({ enabled: process.env.DESIGN_CONTRACT === '1' })],
        },
      },
    }),
  ],
});
```

The implementation may wrap this integration in one public Vite plugin, but it must continue to use Vue compiler APIs and preserve the normal Vue plugin pipeline.

## Native element definition

Instrument only native HTML elements in a Vue `<template>` AST. Do not instrument:

- custom Vue components as component abstractions;
- component tags relying on automatic attribute fallthrough;
- template fragments, which have no DOM host;
- Vue runtime internals.

Native descendants declared inside a custom component's own SFC template are instrumented at their declaration site. The preferred explicit mapping contract remains:

```vue
<CheckoutCard>
  <div data-design-node="42:1337">...</div>
</CheckoutCard>
```

## Vue fixture semantics

- `v-if` branches are instrumented at their own native host locations;
- `v-for` instances may share one source location because they come from one template host;
- `v-bind="props"` cannot overwrite compiler-owned source metadata;
- `<script setup>` and TypeScript must not affect template source locations;
- fragments/multiple roots instrument each native root independently;
- custom component fallthrough is not the source contract.

## Source location format

Serialize exactly:

```text
<repo-relative-posix-path>:<1-based-line>:<1-based-column>
```

Example:

```text
src/components/Button.vue:3:3
```

Rules:

- use the Vue compiler element `loc.start` and the SFC template location offset;
- line and column refer to the `<` of the native template element;
- convert path separators to `/`;
- reject absolute paths and traversal outside `repoRoot`;
- never use regex parsing or Vue private runtime metadata.

## Source maps

The instrumentation must preserve the normal Vue/Vite compiler output and downstream sourcemaps. The plugin must not replace Vue compilation with handwritten generated JavaScript.

## HMR

Acceptance:

1. edit a Vue SFC by adding/removing lines before a native host;
2. Vite updates the module through normal HMR behavior;
3. the runtime element receives the updated exact source line;
4. no duplicate `data-design-test-source` attributes accumulate;
5. mapped DOM identity remains unchanged.

## Production behavior

A normal production build without `DESIGN_CONTRACT=1` contains zero injected `data-design-test-source` attributes. User-authored `data-design-node` remains intact.

## Shadow DOM boundary

Shadow DOM traversal is not part of Spike 2A. If a host application renders mapped nodes inside a `ShadowRoot`, that is a separate Spike 2B question and must not complicate the Vue SFC source proof.

## Spike 2A gate

The implementation is not accepted until the Vue SFC fixture matrix proves exact source lines for native elements, nested native elements, custom components, fragments/multiple roots, `v-if`, `v-for`, `v-bind`, `<script setup>`, TypeScript, HMR, Vite dev, instrumented build and clean production build.

The integration gate also proves:

- managed `design-test run` injects `DESIGN_CONTRACT=1` automatically;
- production build without activation has zero injected source attributes;
- uninstrumented `run --no-start` fails with `SOURCE_LOCATION_UNKNOWN` after Spike 2A;
