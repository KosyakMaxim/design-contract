import type { Page } from "playwright";
import type { CanonicalColor, NormalizedProperty, PropertyName, RuntimeNode } from "../core/domain.js";
import { selectorForDesignNode } from "../core/match.js";

// Собирает cardinality explicit mappings в light DOM и доступных open ShadowRoot.
export async function collectMappingCounts(page: Page, ids: string[]): Promise<Record<string, number>> {
  return page.evaluate((designNodeIds) => {
    const roots: Array<Document | ShadowRoot> = [document];
    const elements: Element[] = [];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      if (root === undefined) continue;
      for (const element of root.querySelectorAll("*")) {
        elements.push(element);
        if (element.shadowRoot !== null) roots.push(element.shadowRoot);
      }
    }
    const counts: Record<string, number> = {};
    for (const id of designNodeIds) counts[id] = elements.filter((element) => element.getAttribute("data-design-node") === id).length;
    return counts;
  }, ids);
}

// Собирает canonical P0 values с реального native host без Vue private runtime access.
export async function collectRuntimeNodes(page: Page, ids: string[]): Promise<RuntimeNode[]> {
  const collected = await page.evaluate(async (designNodeIds) => {
    const roots: Array<Document | ShadowRoot> = [document];
    const elements: Element[] = [];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      if (root === undefined) continue;
      for (const element of root.querySelectorAll("*")) {
        elements.push(element);
        if (element.shadowRoot !== null) roots.push(element.shadowRoot);
      }
    }
    await document.fonts.ready;
    const result: Array<RuntimeNode> = [];
    for (const id of designNodeIds) {
      const element = elements.find((candidate) => candidate.getAttribute("data-design-node") === id);
      if (element === undefined || !(element instanceof HTMLElement)) throw new Error(`Mapped element disappeared for ${id}.`);
      const style = window.getComputedStyle(element);
      const pxValues = new Map<string, number>();
      const pxCandidates = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft, style.fontSize, style.lineHeight, style.letterSpacing, style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth, style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
      for (const raw of pxCandidates) { const match = /^(-?(?:\d+\.?\d*|\.\d+))px$/u.exec(raw.trim()); if (match !== null) pxValues.set(raw, Number(match[1])); }
      const properties: Partial<Record<PropertyName, NormalizedProperty>> = {};
      const unsupported: RuntimeNode["unsupported"] = [];
      const selector = `[data-design-node="${id}"]`;
      const rect = element.getBoundingClientRect();
      properties.width = { name: "width", value: rect.width, unit: "px", reliability: "high", provenance: "browser-geometry" };
      properties.height = { name: "height", value: rect.height, unit: "px", reliability: "high", provenance: "browser-geometry" };
      const paddingValues: Array<[PropertyName, string]> = [["padding-top", style.paddingTop], ["padding-right", style.paddingRight], ["padding-bottom", style.paddingBottom], ["padding-left", style.paddingLeft]];
      for (const [name, raw] of paddingValues) { const value = pxValues.get(raw); if (value === undefined) unsupported.push({ name, reason: "runtime-value-unparseable" }); else properties[name] = { name, value, unit: "px", reliability: "high", provenance: "browser-computed-style" }; }
      const family = (style.fontFamily.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "").trim().toLocaleLowerCase("en-US");
      properties["font-family"] = { name: "font-family", value: family, unit: "font-family", reliability: "medium", provenance: "browser-computed-style" };
      const faces = family === "" ? [] : await document.fonts.load(`${style.fontSize} ${family}`, element.textContent ?? "Design Contract");
      if (faces.length === 0 || faces.some((face) => face.status !== "loaded")) unsupported.push({ name: "font-family", reason: "font-availability-unverifiable" });
      const fontSize = pxValues.get(style.fontSize); if (fontSize === undefined) unsupported.push({ name: "font-size", reason: "runtime-value-unparseable" }); else properties["font-size"] = { name: "font-size", value: fontSize, unit: "px", reliability: "high", provenance: "browser-computed-style" };
      const weight = style.fontWeight === "normal" ? 400 : style.fontWeight === "bold" ? 700 : Number(style.fontWeight); if (!Number.isInteger(weight) || weight < 1 || weight > 1000) unsupported.push({ name: "font-weight", reason: "runtime-value-unparseable" }); else properties["font-weight"] = { name: "font-weight", value: weight, unit: "number", reliability: "high", provenance: "browser-computed-style" };
      const lineHeight = pxValues.get(style.lineHeight); if (lineHeight === undefined) unsupported.push({ name: "line-height", reason: "runtime-value-unparseable" }); else properties["line-height"] = { name: "line-height", value: lineHeight, unit: "px", reliability: "high", provenance: "browser-computed-style" };
      const letterSpacing = pxValues.get(style.letterSpacing); if (letterSpacing === undefined) unsupported.push({ name: "letter-spacing", reason: "runtime-value-unparseable" }); else properties["letter-spacing"] = { name: "letter-spacing", value: letterSpacing, unit: "px", reliability: "high", provenance: "browser-computed-style" };
      properties["text-content"] = { name: "text-content", value: (element.textContent ?? "").replace(/\s+/gu, " ").trim(), unit: "text", reliability: "high", provenance: "browser-dom" };
      const textCanvas = document.createElement("canvas"); textCanvas.width = 1; textCanvas.height = 1; const textContext = textCanvas.getContext("2d"); let textColor: CanonicalColor | undefined; if (textContext !== null) { textContext.clearRect(0, 0, 1, 1); textContext.fillStyle = style.color; textContext.fillRect(0, 0, 1, 1); const pixel = textContext.getImageData(0, 0, 1, 1).data; textColor = { r: pixel[0] ?? 0, g: pixel[1] ?? 0, b: pixel[2] ?? 0, a: Number(((pixel[3] ?? 0) / 255).toFixed(6)) }; } if (textColor === undefined) unsupported.push({ name: "color", reason: "runtime-value-unparseable" }); else properties.color = { name: "color", value: textColor, unit: "rgba", reliability: "high", provenance: "browser-computed-style" };
      const backgroundCanvas = document.createElement("canvas"); backgroundCanvas.width = 1; backgroundCanvas.height = 1; const backgroundContext = backgroundCanvas.getContext("2d"); let backgroundColor: CanonicalColor | undefined; if (backgroundContext !== null) { backgroundContext.clearRect(0, 0, 1, 1); backgroundContext.fillStyle = style.backgroundColor; backgroundContext.fillRect(0, 0, 1, 1); const pixel = backgroundContext.getImageData(0, 0, 1, 1).data; backgroundColor = { r: pixel[0] ?? 0, g: pixel[1] ?? 0, b: pixel[2] ?? 0, a: Number(((pixel[3] ?? 0) / 255).toFixed(6)) }; } if (backgroundColor === undefined) unsupported.push({ name: "background-color", reason: "runtime-value-unparseable" }); else properties["background-color"] = { name: "background-color", value: backgroundColor, unit: "rgba", reliability: "high", provenance: "browser-computed-style" };
      const borderValues: Array<[PropertyName, string, PropertyName, string]> = [["border-top-width", style.borderTopWidth, "border-top-color", style.borderTopColor], ["border-right-width", style.borderRightWidth, "border-right-color", style.borderRightColor], ["border-bottom-width", style.borderBottomWidth, "border-bottom-color", style.borderBottomColor], ["border-left-width", style.borderLeftWidth, "border-left-color", style.borderLeftColor]];
      for (const [widthName, rawWidth, colorName, rawColor] of borderValues) { const width = pxValues.get(rawWidth); if (width === undefined) unsupported.push({ name: widthName, reason: "runtime-value-unparseable" }); else properties[widthName] = { name: widthName, value: width, unit: "px", reliability: "high", provenance: "browser-computed-style" }; const borderCanvas = document.createElement("canvas"); borderCanvas.width = 1; borderCanvas.height = 1; const borderContext = borderCanvas.getContext("2d"); let color: CanonicalColor | undefined; if (borderContext !== null) { borderContext.clearRect(0, 0, 1, 1); borderContext.fillStyle = rawColor; borderContext.fillRect(0, 0, 1, 1); const pixel = borderContext.getImageData(0, 0, 1, 1).data; color = { r: pixel[0] ?? 0, g: pixel[1] ?? 0, b: pixel[2] ?? 0, a: Number(((pixel[3] ?? 0) / 255).toFixed(6)) }; } if (color === undefined) unsupported.push({ name: colorName, reason: "runtime-value-unparseable" }); else properties[colorName] = { name: colorName, value: color, unit: "rgba", reliability: "high", provenance: "browser-computed-style" }; }
      const radiusValues: Array<[PropertyName, string]> = [["border-top-left-radius", style.borderTopLeftRadius], ["border-top-right-radius", style.borderTopRightRadius], ["border-bottom-right-radius", style.borderBottomRightRadius], ["border-bottom-left-radius", style.borderBottomLeftRadius]];
      for (const [name, raw] of radiusValues) { const value = pxValues.get(raw); if (value === undefined) unsupported.push({ name, reason: "runtime-value-unparseable" }); else properties[name] = { name, value, unit: "px", reliability: "high", provenance: "browser-computed-style" }; }
      const opacity = Number(style.opacity); if (!Number.isFinite(opacity)) unsupported.push({ name: "opacity", reason: "runtime-value-unparseable" }); else properties.opacity = { name: "opacity", value: opacity, unit: "number", reliability: "high", provenance: "browser-computed-style" };
      result.push({ designNodeId: id, selector, tagName: element.tagName.toLowerCase(), properties, unsupported });
    }
    return result;
  }, ids);
  return collected;
}

// Экспортирует canonical explicit selector helper.
export { selectorForDesignNode };
