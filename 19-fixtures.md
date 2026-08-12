# Fixture Repository

Fixtures are executable product evidence, not illustrative examples.

## Structure

```text
fixtures/
  figma/
    raw/
      spike1-node.json
      p0-file-v1.json
    expected/
      p0-design-nodes.json
  vue-vite/
    index.html
    vite.config.ts
    src/
      main.ts
      FixtureApp.vue
      fixtures/
        NativeFixtures.vue
        MappingFixtures.vue
        SourceFixtures.vue
  baselines/
    p0-desktop.json
    p0-mobile.json
  expected/
    pass.json
    seeded-mismatches.json
    mapping-missing.json
    mapping-duplicate.json
    spike1-source-optional.json
    source-error.json
    font-unverifiable.json
    baseline-semantics-mismatch.json
    github-annotations.txt
```

## Figma fixture policy

Raw Figma fixtures are sanitized real REST-shaped responses for known nodes/versions. They must preserve field semantics required by extraction but contain no access token or unrelated proprietary design content.

For normal CI they are checked-in and network-free.

Spike 3 separately proves real exact-version REST access.

## Minimum 30 mapped nodes

The controlled corpus contains at least these 30 explicit contract nodes.

| ID | Fixture name | Primary purpose |
|---|---|---|
| `42:1001` | `WidthBox` | width |
| `42:1002` | `HeightBox` | height |
| `42:1003` | `PaddingTopBox` | padding-top |
| `42:1004` | `PaddingRightBox` | padding-right |
| `42:1005` | `PaddingBottomBox` | padding-bottom |
| `42:1006` | `PaddingLeftBox` | padding-left / Spike 1 pattern |
| `42:1007` | `FontFamilyText` | font-family |
| `42:1008` | `FontSizeText` | font-size |
| `42:1009` | `FontWeightText` | font-weight |
| `42:1010` | `LineHeightText` | line-height |
| `42:1011` | `LetterSpacingText` | letter-spacing |
| `42:1012` | `ContentText` | text-content |
| `42:1013` | `TextColorText` | text color |
| `42:1014` | `BackgroundBox` | single solid background |
| `42:1015` | `UniformBorderBox` | uniform inside border |
| `42:1016` | `IndividualBorderBox` | physical border sides |
| `42:1017` | `UniformRadiusBox` | uniform radius |
| `42:1018` | `IndividualRadiusBox` | four radii |
| `42:1019` | `OpacityBox` | local opacity |
| `42:1020` | `EquivalentWidthBox` | different CSS mechanism, same width |
| `42:1021` | `EquivalentSpacingStack` | proves raw gap is not P0 |
| `42:1022` | `MixedTextUnsupported` | mixed text styles explicitly skipped |
| `42:1023` | `GradientUnsupported` | gradient explicitly skipped |
| `42:1024` | `CenterStrokeUnsupported` | non-INSIDE stroke skipped |
| `42:1025` | `MissingMappingTarget` | missing mapping error fixture |
| `42:1026` | `DuplicateMappingTarget` | duplicate mapping error fixture |
| `42:1027` | `NestedSourceHost` | nested component source ownership |
| `42:1028` | `MappedListSourceHost` | `.map()` source semantics |
| `42:1029` | `WebFontText` | font readiness fixture |
| `42:1030` | `MobilePanel` | mobile viewport contract |

All 30 IDs must be present in at least one baseline/test manifest, but failure scenarios may intentionally alter runtime cardinality.

## Seeded design mismatches

At least 20 independent supported-property mutations must exist. The recommended corpus has 24. Each mutation changes exactly one supported semantic value unless the row explicitly tests mapping/runtime behavior.

| Seed | Node | Property | Expected | Actual | Expected result |
|---|---|---|---:|---:|---|
| `M01` | `42:1001` | width | 320px | 324px | one design mismatch |
| `M02` | `42:1002` | height | 80px | 76px | one design mismatch |
| `M03` | `42:1003` | padding-top | 24px | 20px | one design mismatch |
| `M04` | `42:1004` | padding-right | 24px | 16px | one design mismatch |
| `M05` | `42:1005` | padding-bottom | 24px | 28px | one design mismatch |
| `M06` | `42:1006` | padding-left | 24px | 20px | one design mismatch |
| `M07` | `42:1007` | font-family | Inter | Arial | one design mismatch |
| `M08` | `42:1008` | font-size | 16px | 18px | one design mismatch |
| `M09` | `42:1009` | font-weight | 600 | 500 | one design mismatch |
| `M10` | `42:1010` | line-height | 24px | 22px | one design mismatch |
| `M11` | `42:1011` | letter-spacing | 0.2px | 0.5px | one design mismatch |
| `M12` | `42:1012` | text-content | `Pay now` | `Pay` | one design mismatch |
| `M13` | `42:1013` | color | `rgba(20,20,20,1)` | `rgba(25,20,20,1)` | one design mismatch |
| `M14` | `42:1014` | background-color | `rgba(255,255,255,1)` | `rgba(245,245,245,1)` | one design mismatch |
| `M15` | `42:1016` | border-top-width | 1px | 2px | one design mismatch |
| `M16` | `42:1016` | border-right-width | 1px | 2px | one design mismatch |
| `M17` | `42:1016` | border-bottom-width | 1px | 2px | one design mismatch |
| `M18` | `42:1016` | border-left-width | 1px | 2px | one design mismatch |
| `M19` | `42:1015` | border-top-color | `rgba(0,0,0,1)` | `rgba(255,0,0,1)` | one design mismatch; other sides configured to remain equal |
| `M20` | `42:1018` | border-top-left-radius | 8px | 12px | one design mismatch |
| `M21` | `42:1018` | border-top-right-radius | 8px | 12px | one design mismatch |
| `M22` | `42:1018` | border-bottom-right-radius | 8px | 12px | one design mismatch |
| `M23` | `42:1018` | border-bottom-left-radius | 8px | 12px | one design mismatch |
| `M24` | `42:1019` | opacity | 0.8 | 0.6 | one design mismatch |

When border color is uniform in the raw Figma model, a fixture that wants exactly one side's color mismatch may instead use a separate node/style arrangement compatible with browser longhands. If Figma cannot express that simple side-specific color semantics in the chosen supported subset, keep the uniform color seed and update the expected difference set explicitly rather than faking data.

## Mapping/error seeds

These are additional to the 24 design mismatches:

| Seed | Scenario | Expected |
|---|---|---|
| `E01` | remove DOM element for `42:1025` | `MAPPING_MISSING`, exit 2 |
| `E02` | render two elements with `42:1026` | `MAPPING_DUPLICATE`, exit 2 |
| `E03` | Spike 1 mapped host without instrumentation | difference may omit `source`; no fake location |
| `E04` | post-Spike-2 / `--no-start` mapped host without instrumentation | `SOURCE_LOCATION_UNKNOWN`, exit 2 |
| `E05` | never-ready font fixture | `FONT_NOT_READY`, exit 3 |
| `E06` | matching computed primary family but no positive CSS-connected FontFace availability can be confirmed | `font-family` skipped: `font-availability-unverifiable` |
| `E07` | unavailable base URL | `APP_READY_TIMEOUT`, exit 3 |
| `E08` | baseline semantics version differs from running constant | `BASELINE_SEMANTICS_MISMATCH`, exit 2 |
| `E09` | npm/tool version differs but baseline semantics version is unchanged | baseline remains valid |

## Equivalent-layout fixtures

### Different CSS width mechanism, same rendered width

Design expected:

```text
width = 320px
```

Runtime A:

```css
width: 320px;
```

Runtime B:

```css
width: 100%;
max-width: 320px;
```

At the pinned viewport both render `320px`; both must pass width.

### Gap vs margin

A Figma stack may have 24px item spacing, while a runtime fixture achieves 24px visible spacing using child margin. Because raw gap is not P0, Technical MVP must not emit a false design mismatch claiming the CSS mechanism differs.

This fixture exists to protect the comparison philosophy. Effective spacing itself is not asserted until P1.

## Fonts

Font fixture set must contain:

1. local deterministic bundled webfont exposed through `@font-face` that yields a non-empty loaded `document.fonts.load()` result;
2. fallback list with correct primary CSS family and non-empty loaded CSS-connected-face evidence;
3. matching computed primary family where `document.fonts.load()` returns empty/rejects/is indeterminate → `font-availability-unverifiable` skip;
4. declared primary family different from Figma → deterministic mismatch;
5. explicit numeric weight;
6. explicit px line-height;
7. delayed/failed font resource for `FONT_NOT_READY` behavior.

Do not depend on public third-party font CDNs in CI fixtures.

## Source fixtures

Required Vue source forms:

- intrinsic host directly in component;
- nested custom component whose host is inside child definition;
- `v-if` conditional branch;
- `v-for` repeated runtime instances with unique IDs;
- fragment / multiple roots around native hosts;
- `v-bind="props"` before compiler-injected source attribute;
- `<script setup lang="ts">` and TypeScript;
- HMR line movement;
- clean instrumented build;
- custom component without relying on attribute fallthrough.

Golden source expectations are repo-relative `file:line:column` with zero line tolerance after Vue Spike 2A. A separate Spike 1 golden demonstrates that the same `Difference` schema legally omits `source`.

## Mobile viewport

`42:1030` is checked in a dedicated test such as:

```text
viewport 390 × 844
Figma root 42:2000
```

The fixture demonstrates that each viewport/frame pair is an independent contract. No desktop-to-mobile interpolation is performed.

## Expected artifacts

For each major fixture scenario store golden semantic output:

```text
fixtures/expected/<scenario>.json
```

Golden files contain no duration/timestamp and must compare byte-for-byte after canonical newline normalization. Baseline goldens contain `baselineSemanticsVersion` and never npm/tool package version.
