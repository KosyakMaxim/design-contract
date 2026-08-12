import { createHash } from "node:crypto";
import { BASELINE_SEMANTICS_VERSION } from "./domain.js";
import { PROPERTY_ORDER, isCanonicalColor, normalizeNumber, propertyUnit } from "./normalization.js";
import type { CanonicalColor, DesignBaseline, DesignNode, NormalizedProperty, PropertyName, PropertyUnit, UnsupportedProperty, UnsupportedReason } from "./domain.js";

// Стабилизирует любой numeric value перед hash/JSON serialization.
function stableNumber(value: number): number {
  const normalized = normalizeNumber(value);
  if (normalized === undefined) throw new Error("Baseline contains a non-finite numeric value.");
  return normalized;
}

// Canonicalizes colors and scalar values without changing semantic type.
function canonicalValue(value: NormalizedProperty["value"]): NormalizedProperty["value"] {
  if (typeof value === "number") return stableNumber(value);
  if (isCanonicalColor(value)) return { r: value.r, g: value.g, b: value.b, a: Number(value.a.toFixed(6)) };
  return value;
}

// Сериализует property с фиксированным порядком полей и canonical value.
function canonicalProperty(property: NormalizedProperty): NormalizedProperty {
  return { name: property.name, value: canonicalValue(property.value), unit: property.unit, reliability: property.reliability, provenance: property.provenance };
}

// Сортирует unsupported diagnostics по единому P0 property order.
function canonicalUnsupported(items: UnsupportedProperty[]): UnsupportedProperty[] {
  return [...items].sort((left, right) => {
    const order = PROPERTY_ORDER.indexOf(left.name) - PROPERTY_ORDER.indexOf(right.name);
    return order === 0 ? left.reason.localeCompare(right.reason) : order;
  });
}

// Собирает baseline content без hash для deterministic semantic hashing.
function baselineContent(baseline: DesignBaseline): Omit<DesignBaseline, "semanticHash"> {
  const nodes: Record<string, DesignNode> = {};
  for (const id of [...baseline.contractNodeIds].sort()) {
    const node = baseline.nodes[id];
    if (node === undefined) throw new Error(`Baseline is missing node ${id}.`);
    const properties: Partial<Record<PropertyName, NormalizedProperty>> = {};
    for (const name of PROPERTY_ORDER) { const property = node.properties[name]; if (property !== undefined) properties[name] = canonicalProperty(property); }
    nodes[id] = { id: node.id, name: node.name, type: node.type, ...(node.parentId === undefined ? {} : { parentId: node.parentId }), properties, unsupported: canonicalUnsupported(node.unsupported) };
  }
  return { schemaVersion: baseline.schemaVersion, baselineSemanticsVersion: baseline.baselineSemanticsVersion, testId: baseline.testId, figma: { fileKey: baseline.figma.fileKey, version: baseline.figma.version, rootNodeId: baseline.figma.rootNodeId }, contractNodeIds: [...baseline.contractNodeIds].sort(), nodes };
}

// Возвращает canonical JSON без hash с финальным переводом строки.
export function canonicalBaselineJson(baseline: DesignBaseline): string { return `${JSON.stringify(baselineContent(baseline), null, 2)}\n`; }

// Добавляет semantic SHA-256 к normalized baseline.
export function finalizeBaseline(baseline: DesignBaseline): DesignBaseline { const hash = createHash("sha256").update(canonicalBaselineJson(baseline)).digest("hex"); return { ...baseline, semanticHash: `sha256:${hash}` }; }

// Сериализует baseline в deterministic committed representation.
export function serializeBaseline(baseline: DesignBaseline): string { const finalized = finalizeBaseline(baseline); return `${JSON.stringify({ ...baselineContent(finalized), semanticHash: finalized.semanticHash }, null, 2)}\n`; }

// Проверяет schema, semantics version и hash перед offline run.
export function verifyBaseline(baseline: DesignBaseline): void {
  if (baseline.schemaVersion !== 1) throw new Error("BASELINE_SCHEMA_UNSUPPORTED");
  if (baseline.baselineSemanticsVersion !== BASELINE_SEMANTICS_VERSION) throw new Error("BASELINE_SEMANTICS_MISMATCH");
  if (baseline.semanticHash !== finalizeBaseline(baseline).semanticHash) throw new Error("BASELINE_HASH_INVALID");
}

// Проверяет object shape из untrusted baseline JSON.
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

// Проверяет supported property name без type assertion.
function isPropertyName(value: unknown): value is PropertyName { return typeof value === "string" && PROPERTY_ORDER.some((name) => name === value); }

// Проверяет unit against the property-specific canonical unit.
function isPropertyUnit(value: unknown, expected: PropertyUnit): value is PropertyUnit { return value === expected; }

// Проверяет canonical color shape и ranges.
function parseColor(value: unknown): CanonicalColor | undefined {
  if (!isRecord(value) || typeof value.r !== "number" || typeof value.g !== "number" || typeof value.b !== "number" || typeof value.a !== "number") return undefined;
  return { r: value.r, g: value.g, b: value.b, a: value.a };
}

// Проверяет unit/reliability/provenance pair for one normalized property.
function parseProperty(value: unknown, key: string): NormalizedProperty {
  if (!isRecord(value) || !isPropertyName(value.name) || value.name !== key || !isPropertyUnit(value.unit, propertyUnit(value.name)) || (value.reliability !== "high" && value.reliability !== "medium") || (value.provenance !== "figma-rest" && value.provenance !== "browser-geometry" && value.provenance !== "browser-computed-style" && value.provenance !== "browser-dom")) throw new Error("BASELINE_INVALID");
  const color = parseColor(value.value);
  const scalar = typeof value.value === "number" || typeof value.value === "string" ? value.value : undefined;
  if (color !== undefined) return { name: value.name, value: color, unit: value.unit, reliability: value.reliability, provenance: value.provenance };
  if (scalar !== undefined) return { name: value.name, value: scalar, unit: value.unit, reliability: value.reliability, provenance: value.provenance };
  throw new Error("BASELINE_INVALID");
}

// Проверяет unsupported reason из canonical baseline.
function isUnsupportedReason(value: unknown): value is UnsupportedReason {
  return typeof value === "string" && ["figma-value-absent", "node-type-unsupported", "mixed-text-style", "multiple-visible-fills", "non-solid-fill", "corner-smoothing", "stroke-alignment", "complex-stroke", "transformed-geometry", "font-availability-unverifiable", "runtime-value-unparseable", "content-check-disabled"].includes(value);
}

// Парсит properties object в deterministic typed representation.
function parseProperties(value: Record<string, unknown>): Partial<Record<PropertyName, NormalizedProperty>> {
  const properties: Partial<Record<PropertyName, NormalizedProperty>> = {};
  for (const [key, item] of Object.entries(value)) { if (!isPropertyName(key)) throw new Error("BASELINE_INVALID"); properties[key] = parseProperty(item, key); }
  return properties;
}

// Парсит explicit skipped diagnostics.
function parseUnsupported(value: unknown[]): UnsupportedProperty[] {
  return value.map((item) => { if (!isRecord(item) || !isPropertyName(item.name) || !isUnsupportedReason(item.reason)) throw new Error("BASELINE_INVALID"); return { name: item.name, reason: item.reason }; });
}

// Проверяет canonical DesignNode type из untrusted JSON.
function isDesignNodeType(value: unknown): value is DesignNode["type"] { return value === "FRAME" || value === "COMPONENT" || value === "INSTANCE" || value === "TEXT" || value === "RECTANGLE"; }

// Загружает and validates committed baseline JSON.
export function parseBaseline(text: string): DesignBaseline {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || typeof parsed.baselineSemanticsVersion !== "number" || typeof parsed.testId !== "string" || typeof parsed.semanticHash !== "string" || !isRecord(parsed.figma) || typeof parsed.figma.fileKey !== "string" || typeof parsed.figma.version !== "string" || typeof parsed.figma.rootNodeId !== "string" || !Array.isArray(parsed.contractNodeIds) || !parsed.contractNodeIds.every((id) => typeof id === "string") || !isRecord(parsed.nodes)) throw new Error("BASELINE_INVALID");
  const nodes: Record<string, DesignNode> = {};
  for (const [id, value] of Object.entries(parsed.nodes)) {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !isDesignNodeType(value.type) || !isRecord(value.properties) || !Array.isArray(value.unsupported)) throw new Error("BASELINE_INVALID");
    nodes[id] = { id: value.id, name: value.name, type: value.type, ...(typeof value.parentId === "string" ? { parentId: value.parentId } : {}), properties: parseProperties(value.properties), unsupported: parseUnsupported(value.unsupported) };
  }
  const baseline: DesignBaseline = { schemaVersion: 1, baselineSemanticsVersion: parsed.baselineSemanticsVersion, testId: parsed.testId, figma: { fileKey: parsed.figma.fileKey, version: parsed.figma.version, rootNodeId: parsed.figma.rootNodeId }, contractNodeIds: parsed.contractNodeIds, nodes, semanticHash: parsed.semanticHash };
  verifyBaseline(baseline);
  return baseline;
}
