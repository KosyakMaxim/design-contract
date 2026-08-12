# Node Matching

## Decision

MVP uses exactly one strategy:

```text
explicit mapping via data-design-node
```

No heuristic fallback exists.

## Canonical representation

```vue
<section data-design-node="42:1337">
  ...
</section>
```

At runtime:

```html
<section
  data-design-node="42:1337"
  data-design-test-source="src/components/CheckoutCard.vue:82:5"
>
  ...
</section>
```

## Contract membership

A test explicitly lists required IDs:

```json
{
  "id": "checkout-desktop",
  "figmaNodeId": "42:1337",
  "contractNodeIds": ["42:1337", "42:1400", "42:1402"]
}
```

This list is not a second matching algorithm. It declares what must exist. The attribute provides the actual Figma-node-to-DOM-node identity.

Without this membership list, a DOM element that is entirely absent could not be distinguished from an intentionally unmapped Figma descendant.

## Figma ID validation

MVP accepts canonical Figma node IDs in the form:

```text
<digits>:<digits>
```

Example:

```text
42:1337
```

Normalize only if Figma API input accepts an equivalent hyphenated URL form; internal canonical form remains colon-separated. Do not invent or fuzzy-normalize arbitrary strings.

## Matching algorithm

For each `contractNodeId`, in sorted deterministic order:

1. confirm ID exists in baseline nodes;
2. query the main document for `[data-design-node="<escaped-id>"]`;
3. count matches;
4. `0` → `MAPPING_MISSING`;
5. `>1` → `MAPPING_DUPLICATE`;
6. `1` → create `NodeMatch` with strategy `explicit`;
7. attach parsed `source` when metadata exists;
8. in Spike 1, continue even when `source` is absent;
9. after Vue Spike 2A PASS, supported run orchestration requires valid `data-design-test-source` and fails `SOURCE_LOCATION_UNKNOWN` if absent/invalid;
10. continue to runtime property collection.

## Exactly-one invariant

```text
one configured Figma node ID
↔ exactly one runtime DOM element
```

The invariant applies per test case and configured runtime state.

## Missing mapping

Example:

```text
contractNodeIds contains 42:1400
DOM count for [data-design-node="42:1400"] = 0
```

Result:

```text
MAPPING_MISSING
configuration error
exit code 2
```

A missing mapping is not a design-property difference because there is no reliable runtime element to compare.

## Duplicate mapping

Example:

```vue
{items.map(() => (
  <div data-design-node="42:1400" />
))}
```

If two instances render, result is:

```text
MAPPING_DUPLICATE
configuration error
exit code 2
```

The engine never chooses “the first”, closest geometry, closest text or closest tree position.

## Invalid ID

Invalid config IDs fail before browser execution when possible:

```text
MAPPING_INVALID_ID
configuration error
exit code 2
```

## Node outside configured subtree

Detected during `update`:

```text
contractNodeId exists elsewhere in Figma file
but not under test.figmaNodeId
```

Result:

```text
MAPPING_OUTSIDE_SUBTREE
configuration error
exit code 2
```

## Ignored nodes

- DOM nodes with no `data-design-node`: ignored.
- DOM nodes with a `data-design-node` not listed in this test's `contractNodeIds`: ignored by this test.
- Figma descendants not listed in `contractNodeIds`: ignored.

No warning is required for ordinary unlisted descendants because partial explicit coverage is a supported MVP workflow.

## Custom Vue components

Canonical mapping is runtime DOM identity, not Vue component identity.

Automatic attribute fallthrough is not the primary contract. Prefer an explicit native element inside the component:

```vue
<Button data-design-node="42:44" />
```

The fixture must make the mapped native host explicit and unique. Source semantics point to that native template element, because compiler instrumentation is attached there.

For the Technical MVP fixture suite, put `data-design-node` directly on native Vue template hosts to remove forwarding ambiguity.

## Helper API

A `DesignNode` wrapper or `asChild` helper is **not** part of MVP. It would add cloning/ref/prop-forwarding semantics that are unrelated to proving the core. Raw `data-design-node` is the only canonical public API for now.

## Mapping Setup Friction: pilot risk, not MVP redesign

Technical MVP intentionally uses raw explicit Figma IDs because they give the smallest deterministic identity contract. That does not mean the current authoring ergonomics are assumed acceptable for a real pilot. Manual copying of Figma node IDs into Vue templates plus `contractNodeIds` may become an adoption blocker.

Pilot/product-UX principle:

> One canonical mapping declaration per runtime node.

The Technical MVP may temporarily repeat an ID in `data-design-node` and contract membership because the membership list solves missing-element detection, but production UX should avoid making engineers maintain the same ID in three independent places. Before or during pilot, measure setup friction and investigate, without changing the deterministic matcher, these hypotheses:

### Option A: config mapping

```yaml
mappings:
  checkout-card:
    figmaNode: "42:1337"
    selector: "[data-testid=checkout-card]"
```

### Option B: logical stable key

```vue
<section data-design-key="checkout-card" />
```

with a manifest `checkout-card → Figma 42:1337`.

### Option C: helper API

```vue
<DesignNode id="42:1337">
  <CheckoutCard />
</DesignNode>
```

### Option D: optional Code Connect mapping seed

Use Code Connect metadata only as an optional seed/context source, never as a silent runtime heuristic.

### Option E: CLI/browser mapping helper

Interactively select a DOM element and Figma node, then write the explicit mapping declaration.

These are **POST-MVP / PILOT hypotheses**. Do not implement or select one during Spikes 1-5 or Technical MVP without evidence and an explicit scope decision. None permits fuzzy/confidence-based fallback.

## No heuristic fallback

Explicitly forbidden:

- text similarity;
- visual/geometry nearest-neighbor matching;
- DOM/Figma tree edit distance;
- image similarity;
- confidence scores;
- automatic candidate selection;
- “best effort” silent matches.

When explicit mapping fails, the run fails clearly.
