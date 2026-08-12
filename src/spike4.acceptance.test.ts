import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { collectRuntimeNodes } from "./browser/collect.js";
import { diffP0 } from "./core/diff.js";
import { extractFigmaBaseline } from "./core/figma.js";
import type { DesignBaseline, NormalizedProperty, PropertyName, RuntimeNode } from "./core/domain.js";

// Создаёт минимальный baseline для controlled property matrix.
function baseline(properties: Partial<Record<PropertyName, NormalizedProperty>>, unsupported: DesignBaseline["nodes"][string]["unsupported"] = []): DesignBaseline {
  return { schemaVersion: 1, baselineSemanticsVersion: 2, testId: "spike4-fixture", figma: { fileKey: "fixture", version: "v4", rootNodeId: "42:1" }, contractNodeIds: ["42:1"], nodes: { "42:1": { id: "42:1", name: "Fixture", type: "FRAME", properties, unsupported }, }, semanticHash: "sha256:fixture" };
}

// Создаёт normalized fixture property с заданным canonical value.
function property(name: PropertyName, value: NormalizedProperty["value"]): NormalizedProperty {
  const color = typeof value === "object" && value !== null;
  return { name, value, unit: color ? "rgba" : name === "font-family" ? "font-family" : name === "text-content" ? "text" : name === "font-weight" || name === "opacity" ? "number" : "px", reliability: "high", provenance: "figma-rest" };
}

// Создаёт runtime node с теми же explicit identity и canonical properties.
function runtime(properties: Partial<Record<PropertyName, NormalizedProperty>>, unsupported: RuntimeNode["unsupported"] = []): RuntimeNode {
  return { designNodeId: "42:1", selector: '[data-design-node="42:1"]', tagName: "div", properties, unsupported };
}

const numericMutations: Array<[PropertyName, number, number]> = [["width", 100, 101], ["height", 100, 101], ["padding-top", 10, 11], ["padding-right", 10, 11], ["padding-bottom", 10, 11], ["padding-left", 10, 11], ["font-size", 16, 16.2], ["font-weight", 400, 700], ["line-height", 24, 24.2], ["letter-spacing", 0, 0.2], ["opacity", 1, 0.99]];
const semanticMutations: Array<[PropertyName, NormalizedProperty["value"], NormalizedProperty["value"]]> = [["color", { r: 10, g: 10, b: 10, a: 1 }, { r: 20, g: 10, b: 10, a: 1 }], ["background-color", { r: 10, g: 10, b: 10, a: 1 }, { r: 10, g: 20, b: 10, a: 1 }], ["border-top-color", { r: 10, g: 10, b: 10, a: 1 }, { r: 10, g: 10, b: 20, a: 1 }], ["text-content", "Pay", "Buy"], ["font-family", "inter", "arial"]];

// Запускает pure deterministic diff для одной property.
function compareOne(name: PropertyName, expected: NormalizedProperty["value"], actual: NormalizedProperty["value"]) {
  const design = baseline({ [name]: property(name, expected) });
  return diffP0(design, [{ designNodeId: "42:1", runtimeSelector: '[data-design-node="42:1"]', strategy: "explicit" }], [], [runtime({ [name]: property(name, actual) })]);
}

describe("Spike 4: P0 normalization and deterministic diff", () => {
  it("normalizes the real Figma P0 shape deterministically", () => {
    const extracted = extractFigmaBaseline({ id: "42:1", name: "All P0", type: "FRAME", absoluteBoundingBox: { width: 320, height: 180 }, paddingTop: 10, paddingRight: 11, paddingBottom: 12, paddingLeft: 13, fills: [{ type: "SOLID", color: { r: 1, g: 0.5, b: 0 }, opacity: 0.8 }], strokeAlign: "INSIDE", strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }], strokeWeight: 1, cornerRadius: 8, opacity: 0.9 }, { fileKey: "fixture", version: "v4", testId: "shape", rootNodeId: "42:1", contractNodeIds: ["42:1"] });
    expect(extracted.nodes["42:1"]?.properties).toMatchObject({ width: { value: 320 }, height: { value: 180 }, "padding-left": { value: 13 }, "background-color": { value: { r: 255, g: 128, b: 0, a: 0.8 } }, "border-top-width": { value: 1 }, "border-bottom-right-radius": { value: 8 }, opacity: { value: 0.9 } });
  });

  it("passes exact canonical values across the full P0 fixture set", () => {
    const values: Partial<Record<PropertyName, NormalizedProperty>> = {
      width: property("width", 320), height: property("height", 180), "padding-top": property("padding-top", 10), "padding-right": property("padding-right", 11), "padding-bottom": property("padding-bottom", 12), "padding-left": property("padding-left", 13), "font-family": property("font-family", "inter"), "font-size": property("font-size", 16), "font-weight": property("font-weight", 700), "line-height": property("line-height", 24), "letter-spacing": property("letter-spacing", 0), "text-content": property("text-content", "Pay now"), color: property("color", { r: 32, g: 32, b: 32, a: 1 }), "background-color": property("background-color", { r: 255, g: 255, b: 255, a: 1 }), "border-top-width": property("border-top-width", 1), "border-right-width": property("border-right-width", 1), "border-bottom-width": property("border-bottom-width", 1), "border-left-width": property("border-left-width", 1), "border-top-color": property("border-top-color", { r: 0, g: 0, b: 0, a: 0.1 }), "border-right-color": property("border-right-color", { r: 0, g: 0, b: 0, a: 0.1 }), "border-bottom-color": property("border-bottom-color", { r: 0, g: 0, b: 0, a: 0.1 }), "border-left-color": property("border-left-color", { r: 0, g: 0, b: 0, a: 0.1 }), "border-top-left-radius": property("border-top-left-radius", 8), "border-top-right-radius": property("border-top-right-radius", 8), "border-bottom-right-radius": property("border-bottom-right-radius", 8), "border-bottom-left-radius": property("border-bottom-left-radius", 8), opacity: property("opacity", 0.9),
    };
    const result = diffP0(baseline(values), [{ designNodeId: "42:1", runtimeSelector: '[data-design-node="42:1"]', strategy: "explicit" }], [], [runtime(values)]);
    expect(result.status).toBe("passed");
    expect(result.passedChecks).toBe(27);
    expect(result.differences).toEqual([]);
  });

  it.each(numericMutations) ("detects supported numeric mutation for %s", (name, expected, actual) => {
    expect(compareOne(name, expected, actual).differences[0]?.property).toBe(name);
  });

  it.each(semanticMutations) ("detects supported semantic mutation for %s", (name, expected, actual) => {
    expect(compareOne(name, expected, actual).differences[0]?.property).toBe(name);
  });

  it("uses documented boundary tolerances without false positives", () => {
    expect(compareOne("width", 100, 100.5).status).toBe("passed");
    expect(compareOne("width", 100, 100.501).status).toBe("design-failed");
    expect(compareOne("font-size", 16, 16.099).status).toBe("passed");
    expect(compareOne("font-size", 16, 16.101).status).toBe("design-failed");
  });

  it("does not turn unsupported or unverifiable values into a pass", () => {
    const design = baseline({ width: property("width", 100), "font-family": property("font-family", "inter") });
    const result = diffP0(design, [{ designNodeId: "42:1", runtimeSelector: '[data-design-node="42:1"]', strategy: "explicit" }], [], [runtime({ width: property("width", 100), "font-family": property("font-family", "inter") }, [{ name: "font-family", reason: "font-availability-unverifiable" }])]);
    expect(result.status).toBe("passed");
    expect(result.passedChecks).toBe(1);
    expect(result.skipped).toEqual([{ testId: "spike4-fixture", designNodeId: "42:1", property: "font-family", reason: "font-availability-unverifiable" }]);
    const onlyUnsupported = diffP0(baseline({ width: property("width", 100) }), [{ designNodeId: "42:1", runtimeSelector: '[data-design-node="42:1"]', strategy: "explicit" }], [], [runtime({}, [{ name: "width", reason: "runtime-value-unparseable" }])]);
    expect(onlyUnsupported.status).toBe("configuration-error");
    expect(onlyUnsupported.mappingErrors[0]?.code).toBe("NO_COMPARABLE_PROPERTIES");
  });

  it("waits for document.fonts.ready and marks unavailable primary font as unverifiable", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.setContent('<div data-design-node="42:1" style="font-family: DefinitelyMissingDesignContractFont, sans-serif; font-size: 16px">Text</div>');
      const nodes = await collectRuntimeNodes(page, ["42:1"]);
      expect(nodes[0]?.unsupported).toContainEqual({ name: "font-family", reason: "font-availability-unverifiable" });
      expect(nodes[0]?.properties["font-family"]?.value).toBe("definitelymissingdesigncontractfont");
    } finally {
      await browser.close();
    }
  });

  it("produces byte-identical semantic results for ten repeated runs", () => {
    const results = Array.from({ length: 10 }, () => compareOne("padding-left", 24, 20));
    const hashes = new Set(results.map((result) => createHash("sha256").update(JSON.stringify(result)).digest("hex")));
    expect(hashes.size).toBe(1);
  });
});
