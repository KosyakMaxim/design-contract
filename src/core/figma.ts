import { BASELINE_SEMANTICS_VERSION } from "./domain.js";
import { normalizeFigmaColor, normalizeNumber, normalizeTextContent, propertyUnit } from "./normalization.js";
import type { DesignBaseline, DesignNode, NormalizedProperty, PropertyName, UnsupportedProperty } from "./domain.js";

export interface RawFigmaPaint {
  visible?: boolean;
  type: string;
  color?: { r: number; g: number; b: number };
  opacity?: number;
}

export interface RawFigmaNode {
  id: string;
  name?: string;
  type: string;
  absoluteBoundingBox?: { width?: number; height?: number };
  absoluteRenderBounds?: { width?: number; height?: number };
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  style?: { fontFamily?: string; fontSize?: number; fontWeight?: number; lineHeightPx?: number; letterSpacing?: number };
  fills?: RawFigmaPaint[];
  strokes?: RawFigmaPaint[];
  strokeAlign?: string;
  strokeWeight?: number;
  individualStrokeWeights?: { top?: number; right?: number; bottom?: number; left?: number };
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  cornerSmoothing?: number;
  opacity?: number;
  characters?: string;
  children?: RawFigmaNode[];
}

interface RawFigmaFixture {
  document: RawFigmaNode;
  version: string;
}

export interface FigmaExtractionInput {
  fileKey: string;
  version: string;
  testId: string;
  rootNodeId: string;
  contractNodeIds: string[];
}

const BORDER_WIDTH_NAMES: PropertyName[] = ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"];
const BORDER_COLOR_NAMES: PropertyName[] = ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"];
const RADIUS_NAMES: PropertyName[] = ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"];

// Создаёт normalized property только для finite Figma значения.
function numericProperty(name: PropertyName, value: number): NormalizedProperty | undefined {
  const normalized = normalizeNumber(value);
  return normalized === undefined ? undefined : { name, value: normalized, unit: propertyUnit(name), reliability: "high", provenance: "figma-rest" };
}

// Проверяет supported Figma node type перед canonical extraction.
function isSupportedNodeType(value: string): value is DesignNode["type"] {
  return value === "FRAME" || value === "COMPONENT" || value === "INSTANCE" || value === "TEXT" || value === "RECTANGLE";
}

// Возвращает единственный visible solid paint либо explicit unsupported reason.
function solidPaint(paints: RawFigmaPaint[] | undefined): { color?: ReturnType<typeof normalizeFigmaColor>; reason?: UnsupportedProperty["reason"] } {
  const visible = (paints ?? []).filter((paint) => paint.visible !== false);
  if (visible.length === 0) return {};
  if (visible.length !== 1) return { reason: "multiple-visible-fills" };
  const paint = visible[0];
  if (paint === undefined || paint.type !== "SOLID" || paint.color === undefined) return { reason: "non-solid-fill" };
  return { color: normalizeFigmaColor(paint.color, paint.opacity) };
}

// Извлекает все документированные P0 properties из одного Figma node.
function extractProperties(node: RawFigmaNode): { properties: DesignNode["properties"]; unsupported: DesignNode["unsupported"] } {
  const properties: DesignNode["properties"] = {};
  const unsupported: DesignNode["unsupported"] = [];
  const box = node.absoluteBoundingBox ?? node.absoluteRenderBounds;
  const dimensions: Array<[PropertyName, number | undefined]> = [["width", box?.width], ["height", box?.height]];
  const paddings: Array<[PropertyName, number | undefined]> = [["padding-top", node.paddingTop], ["padding-right", node.paddingRight], ["padding-bottom", node.paddingBottom], ["padding-left", node.paddingLeft]];
  for (const [name, value] of [...dimensions, ...paddings]) {
    const property = value === undefined ? undefined : numericProperty(name, value);
    if (property !== undefined) properties[name] = property;
    if (value === undefined && name.startsWith("padding-")) unsupported.push({ name, reason: "figma-value-absent" });
  }

  const style = node.style;
  const typography: Array<[PropertyName, number | string | undefined]> = [["font-family", style?.fontFamily], ["font-size", style?.fontSize], ["font-weight", style?.fontWeight], ["line-height", style?.lineHeightPx], ["letter-spacing", style?.letterSpacing]];
  for (const [name, value] of typography) {
    if (value === undefined) continue;
    const property: NormalizedProperty | undefined = typeof value === "number" ? numericProperty(name, value) : { name, value: value.trim().toLocaleLowerCase("en-US"), unit: propertyUnit(name), reliability: "high", provenance: "figma-rest" };
    if (property !== undefined) properties[name] = property;
  }

  if (node.characters !== undefined && node.type === "TEXT") properties["text-content"] = { name: "text-content", value: normalizeTextContent(node.characters), unit: "text", reliability: "high", provenance: "figma-rest" };
  const fill = solidPaint(node.fills);
  if (fill.reason !== undefined) unsupported.push({ name: node.type === "TEXT" ? "color" : "background-color", reason: fill.reason });
  if (fill.color !== undefined) properties[node.type === "TEXT" ? "color" : "background-color"] = { name: node.type === "TEXT" ? "color" : "background-color", value: fill.color, unit: "rgba", reliability: "high", provenance: "figma-rest" };

  const hasVisibleStroke = (node.strokes ?? []).some((paint) => paint.visible !== false);
  if (hasVisibleStroke && node.strokeAlign !== undefined && node.strokeAlign !== "INSIDE") {
    for (const name of [...BORDER_WIDTH_NAMES, ...BORDER_COLOR_NAMES]) unsupported.push({ name, reason: "stroke-alignment" });
  } else if (hasVisibleStroke) {
    const stroke = solidPaint(node.strokes);
    const weights = node.individualStrokeWeights ?? { top: node.strokeWeight, right: node.strokeWeight, bottom: node.strokeWeight, left: node.strokeWeight };
    const sides: Array<[PropertyName, number | undefined, PropertyName]> = [["border-top-width", weights.top, "border-top-color"], ["border-right-width", weights.right, "border-right-color"], ["border-bottom-width", weights.bottom, "border-bottom-color"], ["border-left-width", weights.left, "border-left-color"]];
    for (const [widthName, width, colorName] of sides) {
      const widthProperty = width === undefined ? undefined : numericProperty(widthName, width);
      if (widthProperty !== undefined) properties[widthName] = widthProperty;
      if (stroke.color !== undefined) properties[colorName] = { name: colorName, value: stroke.color, unit: "rgba", reliability: "high", provenance: "figma-rest" };
      if (stroke.reason !== undefined) unsupported.push({ name: colorName, reason: stroke.reason });
    }
  }

  if (node.cornerSmoothing !== undefined && node.cornerSmoothing !== 0) {
    for (const name of RADIUS_NAMES) unsupported.push({ name, reason: "corner-smoothing" });
  } else if (node.rectangleCornerRadii !== undefined) {
    node.rectangleCornerRadii.forEach((value, index) => { const name = RADIUS_NAMES[index]; const property = name === undefined ? undefined : numericProperty(name, value); if (property !== undefined && name !== undefined) properties[name] = property; });
  } else if (node.cornerRadius !== undefined) {
    for (const name of RADIUS_NAMES) { const property = numericProperty(name, node.cornerRadius); if (property !== undefined) properties[name] = property; }
  }
  const opacity = numericProperty("opacity", node.opacity ?? 1);
  if (opacity !== undefined) { opacity.unit = "number"; properties.opacity = opacity; }
  return { properties, unsupported };
}

// Находит node только по exact Figma id, без поиска по имени, геометрии или сходству.
function findNodeById(node: RawFigmaNode, id: string): RawFigmaNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) { const found = findNodeById(child, id); if (found !== undefined) return found; }
  return undefined;
}

// Сохраняет исходный Spike 1 fixture API поверх расширенного P0 extractor.
export function extractSpike1Baseline(raw: RawFigmaFixture): DesignBaseline {
  return extractFigmaBaseline(raw.document, { fileKey: "spike1-fixture-file", version: raw.version, testId: "spike1-padding-left", rootNodeId: "42:1337", contractNodeIds: ["42:1337"] });
}

// Преобразует exact-version Figma subtree в canonical P0 DesignBaseline.
export function extractFigmaBaseline(root: RawFigmaNode, input: FigmaExtractionInput): DesignBaseline {
  const nodes: Record<string, DesignNode> = {};
  for (const id of [...input.contractNodeIds].sort()) {
    const node = findNodeById(root, id);
    if (node === undefined) throw new Error(`Figma node ${id} was not found in the exact version subtree.`);
    if (!isSupportedNodeType(node.type)) throw new Error(`Figma node ${id} has unsupported type ${node.type}.`);
    const extracted = extractProperties(node);
    nodes[id] = { id: node.id, name: node.name ?? node.id, type: node.type, properties: extracted.properties, unsupported: extracted.unsupported };
  }
  return { schemaVersion: 1, baselineSemanticsVersion: BASELINE_SEMANTICS_VERSION, testId: input.testId, figma: { fileKey: input.fileKey, version: input.version, rootNodeId: input.rootNodeId }, contractNodeIds: [...input.contractNodeIds].sort(), nodes, semanticHash: "sha256:pending" };
}
