# Normalization

This is a critical source-of-truth document. The P0 list and tolerances here must be used unchanged by extraction, runtime collection, diffing, fixtures, tests and reporting.

## Philosophy

Design Contract compares the observable supported result, not the CSS mechanism used to produce it.

```text
PROPERTY CONTRACT
Figma padding-left: 24px
Browser padding-left: 20px

RENDERED GEOMETRY CONTRACT
Figma width: 320px
Browser rendered border-box width: 319.4px
```

A CSS declaration is not itself the contract unless the visual property has a direct supported observable representation.

## Canonical property order

This exact order is used in JSON serialization and reporting:

```ts
export const PROPERTY_ORDER = [
  "width",
  "height",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-content",
  "color",
  "background-color",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "opacity",
] as const;
```

## P0 normalization table

| Property | Figma source | Runtime source | Canonical representation | Comparison | Default tolerance | Priority |
|---|---|---|---|---|---:|---|
| `width` | axis-aligned `absoluteBoundingBox.width` | `getBoundingClientRect().width` | finite CSS px number | rendered geometry | ±0.5px | P0 |
| `height` | axis-aligned `absoluteBoundingBox.height` | `getBoundingClientRect().height` | finite CSS px number | rendered geometry | ±0.5px | P0 |
| `padding-top` | `paddingTop` | computed `paddingTop` | px number | property | ±0.5px | P0 |
| `padding-right` | `paddingRight` | computed `paddingRight` | px number | property | ±0.5px | P0 |
| `padding-bottom` | `paddingBottom` | computed `paddingBottom` | px number | property | ±0.5px | P0 |
| `padding-left` | `paddingLeft` | computed `paddingLeft` | px number | property | ±0.5px | P0 |
| `font-family` | text style `fontFamily` | computed `fontFamily` + loaded CSS-connected FontFace evidence | normalized primary family string | declared primary CSS family + positive CSS-connected-face evidence | exact normalized string when verifiable | P0 limited |
| `font-size` | text style `fontSize` | computed `fontSize` | px number | property | ±0.1px | P0 |
| `font-weight` | text style numeric `fontWeight` | computed `fontWeight` | integer 1..1000 | property | exact | P0 |
| `line-height` | `lineHeightPx` | computed explicit px `lineHeight` | px number | property | ±0.1px | P0 limited |
| `letter-spacing` | text style `letterSpacing` | computed `letterSpacing` | px number | property | ±0.1px | P0 |
| `text-content` | `characters` | `textContent` | normalized string by policy | content | exact | P0 configurable |
| `color` | one visible solid text fill | computed `color` | sRGB RGBA | property | ±1 RGB channel; ±0.005 alpha | P0 limited |
| `background-color` | one visible solid fill | computed `backgroundColor` | sRGB RGBA | property | ±1 RGB channel; ±0.005 alpha | P0 limited |
| four border widths | simple `INSIDE` stroke width(s) | computed border width longhands | px number | property | ±0.5px | P0 limited |
| four border colors | one simple solid `INSIDE` stroke paint | computed border color longhands | sRGB RGBA | property | ±1 RGB channel; ±0.005 alpha | P0 limited |
| four corner radii | `cornerRadius` / `rectangleCornerRadii` with zero smoothing | computed radius longhands | one circular px radius per corner | property | ±0.5px | P0 limited |
| `opacity` | node `opacity`, default 1 | computed `opacity` | number 0..1 | local property | ±0.005 | P0 |

The tolerances are specification defaults. Spike 4 validates them against the controlled corpus; Spike 5 remains responsible for clean CI-environment repeatability. A coding agent must not change them silently in response to fixture failures.

Spike 4 evidence: 22 controlled acceptance cases pass with zero false positives and zero seeded supported false negatives. The real Vue MFE check for Figma node `341:34185` passes width, height, four paddings and opacity. A Figma `strokeWeight` without a visible solid stroke paint is not a border contract and is omitted from P0.

## Geometry

### Width and height

Figma and browser values are compared as rendered border-box geometry in a single explicit viewport.

Valid equivalence:

```css
/* implementation A */
width: 320px;

/* implementation B */
width: 100%;
max-width: 320px;
```

If both render a 320px border box in the configured state, Design Contract passes width.

Do not claim the responsive semantics are identical outside that test case.

### Transforms

If the configured Figma node has non-axis-aligned geometry/rotation that makes the bounding box an unsuitable direct contract, width/height are marked `transformed-geometry` and skipped.

Runtime arbitrary transforms are not separately asserted. If a transform changes the rendered `getBoundingClientRect` size, the resulting geometry naturally affects width/height.

## Box model

### Padding

Figma Auto Layout physical padding maps directly to computed CSS physical padding longhands.

No attempt is made to compare logical CSS declaration syntax such as `padding-inline-start`; `getComputedStyle` resolves the physical result.

### Margin

`margin` is never a P0 Figma contract. Figma has no universal semantic margin property that maps to arbitrary CSS layout.

### Gap

Raw CSS `gap`, `row-gap` or `column-gap` is not P0.

Reason: visual spacing may be implemented with margin, grid tracks or other layout mechanics. Enforcing a CSS gap declaration would violate the observable-result principle.

Effective sibling spacing is P1/Later and requires geometry-aware child relationships. It is not implemented in Technical MVP.

## Typography

### Font family

Figma gives a design font family, while browser `font-family` can contain a fallback list and does not prove which font rendered every glyph.

P0 rule:

1. parse the browser computed family list;
2. take the primary family token only;
3. remove matching single/double quotes;
4. trim surrounding whitespace;
5. normalize ASCII case for comparison;
6. compare with the similarly normalized Figma family;
7. always wait for `document.fonts.ready`;
8. when primary family equals Figma, query `document.fonts.load()` for only that expected family, using the computed font size and stable sample text;
9. require a non-empty returned `FontFace[]` whose entries are loaded; an empty result is not positive evidence because direct system-font availability is not reliably exposed as CSS-connected faces;
10. if availability cannot be confirmed, mark the property `font-availability-unverifiable` and skip it rather than counting it as PASS;
11. do not use `FontFaceSet.check()` as positive proof, because it can return `true` even when the named family does not exist and fallback would be used.

Example:

```text
Figma: Inter
Runtime: "Inter", Arial, sans-serif
Canonical: inter == inter
```

If the primary computed family differs from Figma, report the declaration-level mismatch normally; the availability guard exists specifically to prevent a matching CSS family list from becoming a false PASS when the required family cannot be confirmed as available.

Positive evidence is still described as **declared/resolved primary CSS family with a matching loaded CSS-connected face for the sample text**, not glyph-level font provenance. Per-glyph fallback, direct system-font verification, synthetic faces and exact glyph font provenance remain outside the MVP claim.

### Font size

Canonical finite px number.

### Font weight

Normalize browser keywords if they appear:

```text
normal → 400
bold → 700
```

Otherwise require a numeric computed value and compare the integer value exactly.

The MVP does not infer whether synthetic bold or a specific variable-font axis instance rendered.

### Line height

Figma expected value uses documented px line-height data.

Browser support is limited to a computed value that parses to px. If the runtime returns `normal` or another representation the engine cannot deterministically resolve to a used px line box, mark `runtime-value-unparseable` and skip. Do not guess `normal` from font size.

Spike 4 may prove a deterministic resolution mechanism; adopting it requires a documented change and tests, not an ad-hoc heuristic.

### Letter spacing

Canonical px number.

Browser `normal` is normalized to `0px` only after the fixture corpus confirms the pinned Chromium behavior required by Spike 4. Until then, encountering `normal` is an explicit unsupported case in the spike implementation.

## Text content

Each test chooses one `ContentPolicy`:

### `off`

No `text-content` expected property is stored or compared.

### `exact`

Normalize line endings to `\n`; otherwise preserve text exactly.

### `trim`

Apply `exact`, then trim leading/trailing Unicode whitespace.

### `collapse-whitespace`

Apply `exact`, replace one or more Unicode whitespace code points with one ASCII space, then trim.

The same function must normalize Figma and runtime values.

Default: `collapse-whitespace`.

Localization-sensitive tests should use `off` or pin localization state explicitly.

## Colors

### Figma → canonical sRGB RGBA

Figma REST color channels are 0..1. For a supported solid paint:

```ts
r8 = Math.round(clamp01(color.r) * 255)
g8 = Math.round(clamp01(color.g) * 255)
b8 = Math.round(clamp01(color.b) * 255)
a  = round6(clamp01(paint.opacity ?? 1))
```

Node-level opacity is **not** multiplied into paint alpha because `opacity` is its own P0 property.

### Runtime → canonical sRGB RGBA

Do not maintain a large handwritten CSS color parser. Use pinned Chromium as the CSS color parser and convert the resolved computed color into sRGB RGBA in the page context. A 1×1 canvas/getImageData conversion with explicit/default sRGB output is acceptable if Spike 4 proves stable results for the color fixture corpus.

The output stored in `CanonicalColor` is:

```ts
{ r: 0..255, g: 0..255, b: 0..255, a: 0..1 }
```

### Color comparison

Pass when each RGB channel differs by at most `1` and alpha differs by at most `0.005`.

The MVP does not claim wide-gamut fidelity beyond conversion to the canonical sRGB contract.

## Background

A Figma node background is P0 only when exactly one relevant visible fill is `SOLID`.

Skip:

- gradients;
- image fills;
- multiple visible fills;
- blend/compositing cases.

Runtime `background-color` is compared to that single design color. Background images are not inspected in P0.

## Borders

Borders are P0 **only for the simple inside-stroke subset on rectangular/frame-like nodes (`FRAME`, `COMPONENT`, `INSTANCE`, `RECTANGLE`)**. Text glyph strokes are not CSS-border contracts.

Supported Figma conditions:

```text
strokeAlign = INSIDE
one visible SOLID stroke paint
strokeDashes empty
no unsupported compositing/effect needed to interpret the stroke
width(s) numeric
```

If the node exposes individual physical stroke weights, normalize them to four sides. Otherwise one `strokeWeight` expands to all four sides.

Unsupported:

- `CENTER` or `OUTSIDE` stroke alignment;
- gradients/multiple stroke paints;
- dash patterns;
- vector-outline semantics that are not equivalent to a rectangular CSS border.

Runtime border style must be visible for a color/width contract to be meaningful. If computed style is `none`/`hidden`, width effectively normalizes to `0`; a Figma non-zero inside border therefore mismatches.

## Radius

Figma `rectangleCornerRadii` order is top-left, top-right, bottom-right, bottom-left.

Runtime parser supports one circular length per corner, for example `8px`.

Unsupported:

- percentage radii;
- unequal elliptical `x/y` radii;
- non-zero Figma corner smoothing.

## Opacity

Compare the node's local opacity to computed CSS `opacity`. Do not multiply ancestor opacity into the value. The contract intentionally answers whether the mapped element's local property matches, not total composited alpha.

## Canonical numbers

All numeric values:

1. must be finite;
2. normalize `-0` to `0`;
3. round to at most 6 decimal places for serialization;
4. retain enough precision for tolerance comparisons;
5. format for terminal output separately from stored value.

## SUPPORTED

P0 support, subject to conditions above:

```text
mapped identity
width / height
four paddings
font family when CSS family matches and availability is confirmable
font size
font weight
explicit line height
letter spacing
configured text content
solid text color
single solid background
simple INSIDE border widths/colors
four circular corner radii without smoothing
local opacity
```

## PARTIAL

Known design/runtime concepts retained as diagnostics or future work:

```text
font-family actual glyph usage / per-glyph fallback provenance
effective sibling spacing
parent-relative position
alignment result
simple shadow
text wrapping / line count
pseudo-elements
CSS variable/token provenance
```

## UNSUPPORTED

```text
global x/y
margin as design property
raw CSS gap mechanism equality
HUG = specific CSS declaration
FILL = specific CSS declaration
gradients
multiple fills
complex shadows
filters / blur
blend modes
masks
arbitrary transform equality
SVG/vector path equality
mixed-style text ranges
pixel-perfect full-page equality
```
