# Browser Adapter

## Responsibility

Use Playwright Chromium to turn a configured UI state into canonical `RuntimeNode` objects.

```text
config + baseline
→ launch pinned Chromium
→ explicit viewport/context
→ navigate
→ app readiness
→ deterministic setup
→ font/layout stabilization
→ collect mapped DOM hosts
→ normalize runtime properties
→ RuntimeNode[]
```

## Browser version

Use Playwright's bundled Chromium from the exact Playwright package locked by `package-lock.json`. CI installs the browser revision associated with that exact package.

Do not use arbitrary system Chrome for the MVP quality gate.

## Launch

One browser process per CLI run.
One fresh browser context and page per test case.
Tests execute sequentially for MVP determinism.

Recommended launch characteristics:

```text
headless: true
browser: chromium
deviceScaleFactor: 1
```

No custom rendering flags unless a spike proves they are required and an ADR records them.

## Context

Each test has explicit:

- viewport width/height;
- locale, default `en-US`;
- timezone, default `UTC`;
- color scheme, default `light`;
- reduced motion, default `reduce`;
- optional Playwright `storageState`.

Config may set shared runtime defaults, but every test has an explicit viewport.

## Route policy

`route` must be a same-origin path beginning with `/`.
Absolute external URLs are rejected by config validation.

Final URL:

```ts
new URL(test.route, config.app.baseUrl)
```

## App startup/readiness

The browser adapter itself does not require a particular process manager.
CLI waits for `app.baseUrl` before browser navigation. If configured, it also waits for `app.readySelector` after navigation.

Readiness sequence:

1. poll base URL until reachable or `startTimeoutMs` expires;
2. `page.goto(url, { waitUntil: "domcontentloaded" })`;
3. if `readySelector` configured, wait for it to be `visible`;
4. apply configured setup actions in order;
5. inject/retain stabilization CSS;
6. await font readiness;
7. wait two animation frames;
8. collect all contract nodes in one logical measurement phase.

## Animation stabilization

Before property collection inject a stylesheet that disables user-interface motion:

```css
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
}
```

Keep the style active through setup and collection where practical so clicks do not reintroduce transitions.

Do not use screenshot-only Playwright animation controls as the core property stabilization mechanism.

## Font readiness

Mandatory:

```ts
await document.fonts.ready;
```

with an explicit timeout.

This proves the document's font loading set has settled. It does not prove that every glyph rendered with the exact desired family.

For P0 `font-family`, readiness alone is not enough for a PASS. `FontFaceSet.check()` is **not** accepted as positive availability proof: by specification it can return `true` when the named font does not exist and fallback will be used. The runtime adapter therefore uses a conservative CSS-connected-face policy for a mapped node whose normalized primary computed family equals the expected Figma family:

1. wait for `document.fonts.ready`;
2. call `document.fonts.load()` for **only the expected primary family**, using the element's computed font size and stable sample text (the node's non-whitespace text when available, otherwise `"A"`);
3. require the returned `FontFace[]` to be non-empty and every returned face to have `status === "loaded"`;
4. if the array is empty, the promise rejects, or the evidence cannot be evaluated deterministically, mark `font-family` unsupported with reason `font-availability-unverifiable`;
5. after any load attempt, await `document.fonts.ready` again before the final geometry/style collection;
6. never convert an unverifiable availability case into PASS.

This deliberately skips direct system-font cases that cannot be positively identified through CSS-connected `FontFace` entries. That is preferable to a false PASS. If the normalized computed primary family already differs from Figma, that declaration-level disagreement remains a normal `font-family` difference; availability uncertainty does not hide the mismatch.

Even non-empty loaded-face evidence is only evidence for the **declared primary CSS family + a matching CSS-connected face for the sample text**. It does not prove glyph-level font provenance or absence of per-glyph fallback.

Normative reference: CSS Font Loading Module Level 3, `FontFaceSet.check()` special cases and `FontFaceSet.load()` semantics: https://www.w3.org/TR/css-font-loading-3/#font-face-set-check

If font readiness times out:

```text
FONT_NOT_READY
exit code 3
```

## Runtime collection

For every `contractNodeId`, build the deterministic locator:

```text
[data-design-node="<escaped-id>"]
```

The matcher validates count before property collection is accepted.

For one element collect:

- `tagName`;
- `data-design-test-source`;
- `getBoundingClientRect().width`;
- `getBoundingClientRect().height`;
- `getComputedStyle(element)` longhands needed by P0;
- `textContent` only when content policy is enabled.

Prefer a single `page.evaluate` collection for the final set after matching validation, minimizing timing drift between property reads.

## Runtime P0 fields

Read physical longhands:

```text
paddingTop / Right / Bottom / Left
fontFamily
fontSize
fontWeight
lineHeight
letterSpacing
color
backgroundColor
borderTop/Right/Bottom/LeftWidth
borderTop/Right/Bottom/LeftColor
borderTopLeft/TopRight/BottomRight/BottomLeftRadius
opacity
```

Geometry width/height come from `getBoundingClientRect()`, not from CSS `width` declarations.

## Box model semantics

Width and height are rendered border-box geometry in the configured viewport. This intentionally accepts different CSS mechanisms when they produce the same observable box.

## Text

Raw browser source is `element.textContent ?? ""`.
The shared normalizer applies the test's `ContentPolicy`.

Do not use `innerText` as canonical P0 because it introduces layout/visibility semantics beyond the simple Figma `characters` comparison.

## Source metadata

`data-design-test-source` is parsed into the shared optional `SourceLocation`.

Phase rule:

```text
Spike 1: metadata may be absent; RuntimeNode.source remains undefined.
After Vue Spike 2A PASS: supported Vue 3 + Vite run requires valid metadata on every required mapped native host.
```

After Vue Spike 2A is part of the run path, missing/invalid source metadata is `SOURCE_LOCATION_UNKNOWN`, a configuration/instrumentation failure, not a silent omission. The same check is the `--no-start` instrumentation preflight: externally started uninstrumented apps must fail before ordinary comparison/reporting.

## Same-document scope

MVP searches the main document only.

- portals are fine if they render into the main document;
- Shadow DOM traversal remains unsupported in Spike 2A and is deferred to Spike 2B;
- cross-origin iframes are unsupported;
- virtualized elements that are not rendered at the configured state produce `MAPPING_MISSING`.

## Errors

- `APP_READY_TIMEOUT`
- `BROWSER_LAUNCH_FAILED`
- `NAVIGATION_FAILED`
- `SETUP_ACTION_FAILED`
- `FONT_NOT_READY`
- `SOURCE_LOCATION_UNKNOWN`
- unexpected page/context closure → `BROWSER_RUNTIME_FAILED`

## Collection pseudocode

```ts
async function collectRuntimeNodes(page: Page, test: TestCase, baseline: DesignBaseline): Promise<RuntimeNode[]> {
  await assertMappingCardinality(page, test.contractNodeIds);
  await stabilize(page);
  await waitForFonts(page);

  const expectedFamilies = expectedFontFamilies(baseline, test.contractNodeIds);

  // Page-context helper; use only the expected primary family, not the fallback list.
  const fontAvailability = await page.evaluate(async ({ ids, expectedFamilies }) => {
    const result: Record<string, boolean | undefined> = {};

    for (const id of ids) {
      const selector = `[data-design-node="${CSS.escape(id)}"]`;
      const el = document.querySelector(selector)!;
      const css = getComputedStyle(el);
      const expectedFamily = expectedFamilies[id];
      const actualPrimary = normalizePrimaryFamily(css.fontFamily); // inline/pure page helper

      if (!expectedFamily || actualPrimary !== expectedFamily) continue;

      const sampleText = (el.textContent ?? "").trim() || "A";
      try {
        const faces = await document.fonts.load(
          `${css.fontSize} ${quoteCssFamily(expectedFamily)}`, // inline/pure page helper
          sampleText,
        );
        result[id] = faces.length > 0 && faces.every((face) => face.status === "loaded");
      } catch {
        result[id] = undefined;
      }
    }

    return result;
  }, { ids: test.contractNodeIds, expectedFamilies });

  // A load() call may itself complete a pending CSS-connected face. Re-stabilize font readiness
  // before the one final geometry/style snapshot.
  await waitForFonts(page);

  const raw = await page.evaluate(({ ids, fontAvailability }) => {
    return ids.map((id) => {
      const selector = `[data-design-node="${CSS.escape(id)}"]`;
      const el = document.querySelector(selector)!;
      const rect = el.getBoundingClientRect();
      const css = getComputedStyle(el);

      return {
        designNodeId: id,
        selector,
        tagName: el.tagName.toLowerCase(),
        source: el.getAttribute("data-design-test-source"),
        rect: { width: rect.width, height: rect.height },
        css: pickP0ComputedStyles(css),
        expectedFamilyAvailable: fontAvailability[id],
        textContent: el.textContent ?? "",
      };
    });
  }, { ids: test.contractNodeIds, fontAvailability });

  return raw.map((node) => normalizeRuntimeNode(node, test.contentPolicy));
  // normalizeRuntimeNode marks font-family as font-availability-unverifiable
  // only when primary family matches expected but a matching loaded CSS-connected face was not proven.
}
```
