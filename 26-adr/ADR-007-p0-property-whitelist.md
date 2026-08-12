# ADR-007: P0 Property Whitelist

## Context

The two due-diligence reports agreed on a small deterministic property set but differed in some classifications:

- one version placed direct flex/grid `gap` in P0, while the more complete report moved Figma item spacing/effective spacing to P1 because equivalent CSS may use margins or other layout mechanics;
- font-family appeared as P0 in the more complete report but as lower-confidence/P1 in an earlier table;
- border width/color ranged between P0 limited and P1 because Figma stroke alignment can differ from CSS border semantics;
- the implementation brief explicitly asks for font-family and simple border properties in the starting whitelist while forbidding CSS-mechanism equality.

## Decision

P0 is exactly the list in `11-normalization.md`:

```text
identity: required mapped node exists uniquely
geometry: width, height
box: four paddings
typography: font-family, font-size, font-weight, line-height, letter-spacing
content: text-content, configurable policy
color: text color, single solid background
shape: simple INSIDE border widths/colors, four circular radii, local opacity
```

Specific reconciliation:

### Gap

`gap` is **not P0**. Effective sibling spacing is P1/Later. Raw CSS gap declaration equality is never a valid substitute for rendered spacing.

### Font family

`font-family` remains **P0 limited**. It compares the normalized primary resolved CSS family to the Figma family and waits for `document.fonts.ready`. A matching family may count as PASS only when `document.fonts.load()` for that exact primary family and sample text returns a non-empty set of loaded CSS-connected `FontFace` objects. `FontFaceSet.check()` is not positive availability proof because it may return `true` for a nonexistent family that will fall back. Empty/rejected/indeterminate evidence is skipped as `font-availability-unverifiable`. A different primary family is still a normal mismatch. This deliberately does not claim direct-system-font verification, glyph-level actual font provenance, or absence of per-glyph fallback.

### Line height

`line-height` remains **P0 limited** for deterministically parseable explicit px used/computed values. Runtime `normal` is not guessed; it is skipped until a fixture-proven resolver exists.

### Border

Border width/color remains **P0 limited** only for one simple solid Figma stroke with `strokeAlign = INSIDE`, no dash/gradient/multiple-stroke complexity and rectangular CSS-border-compatible semantics. Other stroke alignments are explicit unsupported/skipped cases.

### Text

Text content is P0 configurable. Default policy is `collapse-whitespace`; localization-sensitive tests may set `off`.

## Alternatives

1. **Keep direct `gap` P0:** rejected because it enforces implementation mechanism and creates false positives for equivalent margin-based layout.
2. **Move all font-family to P1:** rejected because family is high-value and has a deterministic CSSOM-level contract when its limitation is stated honestly.
3. **Move all border to P1:** rejected because the `INSIDE` simple-stroke subset has a narrow direct comparison and is explicitly requested by the product scope.
4. **Support all Figma visual properties:** rejected due normalization noise and false precision.

## Consequences

- fixture corpus must prove limited subsets rather than pretending universal support;
- unsupported/unverifiable is surfaced as skipped, never as pass;
- adding/moving a P0 property requires ADR and fixture evidence;
- coding agent may not change tolerances or downgrade a failing property by itself.

## Status

Accepted for Technical MVP. This ADR resolves the report conflict.
