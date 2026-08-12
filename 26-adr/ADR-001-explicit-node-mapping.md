# ADR-001: Explicit Node Mapping

## Context

Figma and DOM trees differ in granularity, wrappers, repeated content, portals and component structure. A CI gate cannot safely infer identity from text, geometry or tree similarity. At the same time, a fully absent runtime element cannot be diagnosed as missing unless the test declares that the design node is required.

## Decision

MVP uses explicit mapping only.

Runtime identity is canonical:

```vue
<div data-design-node="42:1337" />
```

Each `TestCase` also contains `contractNodeIds`, the explicit set of Figma IDs that must exist exactly once in the configured state.

Invariant:

```text
configured Figma node ID
↔ exactly one DOM node with the same data-design-node value
```

The root `figmaNodeId` must be included in `contractNodeIds` for MVP.

No wrapper/helper component is public MVP API. Raw attribute is canonical.

## Alternatives

1. **Heuristic matching:** rejected because identity becomes probabilistic and noisy.
2. **Code Connect as required mapping:** rejected because it maps component concepts rather than concrete DOM instances and is plan-dependent.
3. **Runtime attributes without contract membership list:** rejected because an entirely absent required element is indistinguishable from an intentionally untested Figma descendant.
4. **Config selector map instead of raw attribute:** rejected as more verbose and less self-describing at runtime.

## Consequences

Positive:

- deterministic identity;
- simple missing/duplicate errors;
- partial coverage is explicit;
- framework dependence is low at matching layer.

Negative:

- developers maintain IDs in Vue templates and test config during Technical MVP;
- repeated list instances require distinct Figma IDs if individually contracted;
- teams may reject setup burden, which remains a commercial kill criterion.

Pilot note: this ADR fixes **identity semantics**, not final authoring UX. `Mapping Setup Friction` must be measured before pilot-scale adoption. Later explicit ergonomics should aim for one canonical mapping declaration per runtime node and may evaluate config mapping, logical keys, helper APIs, optional Code Connect seeds or authoring helpers. None may introduce heuristic fallback without a new ADR.

## Status

Accepted for Technical MVP.
