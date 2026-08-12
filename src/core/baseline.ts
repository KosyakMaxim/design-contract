import { createHash } from "node:crypto";
import { BASELINE_SEMANTICS_VERSION } from "./domain.js";
import type { DesignBaseline, DesignNode, NormalizedProperty, PropertyName, UnsupportedProperty } from "./domain.js";

const PROPERTY_ORDER: PropertyName[] = ["width", "padding-left"];

// Стабилизирует числовое значение, устраняя -0 и нечисловые значения до сериализации.
function stableNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Baseline contains a non-finite numeric value.");
  }
  return Object.is(value, -0) ? 0 : value;
}

// Сериализует одно normalized property в каноническом порядке ключей.
function canonicalProperty(property: NormalizedProperty): NormalizedProperty {
  return {
    name: property.name,
    value: typeof property.value === "number" ? stableNumber(property.value) : property.value,
    unit: property.unit,
    reliability: property.reliability,
    provenance: property.provenance,
  };
}

// Сортирует unsupported diagnostics по каноническому порядку свойства и причине.
function canonicalUnsupported(items: UnsupportedProperty[]): UnsupportedProperty[] {
  return [...items].sort((left, right) => {
    const propertyOrder = PROPERTY_ORDER.indexOf(left.name) - PROPERTY_ORDER.indexOf(right.name);
    return propertyOrder === 0 ? left.reason.localeCompare(right.reason) : propertyOrder;
  });
}

// Собирает baseline без semanticHash — именно этот объект входит в SHA-256.
function baselineContent(baseline: DesignBaseline): Omit<DesignBaseline, "semanticHash"> {
  const nodes: Record<string, DesignNode> = {};
  for (const id of [...baseline.contractNodeIds].sort()) {
    const node = baseline.nodes[id];
    if (node === undefined) {
      throw new Error(`Baseline is missing node ${id}.`);
    }
    const properties: Partial<Record<PropertyName, NormalizedProperty>> = {};
    for (const propertyName of PROPERTY_ORDER) {
      const property = node.properties[propertyName];
      if (property !== undefined) {
        properties[propertyName] = canonicalProperty(property);
      }
    }
    nodes[id] = {
      id: node.id,
      name: node.name,
      type: node.type,
      ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
      properties,
      unsupported: canonicalUnsupported(node.unsupported),
    };
  }
  return {
    schemaVersion: baseline.schemaVersion,
    baselineSemanticsVersion: baseline.baselineSemanticsVersion,
    testId: baseline.testId,
    figma: {
      fileKey: baseline.figma.fileKey,
      version: baseline.figma.version,
      rootNodeId: baseline.figma.rootNodeId,
    },
    contractNodeIds: [...baseline.contractNodeIds].sort(),
    nodes,
  };
}

// Возвращает canonical JSON без hash с двух пробелами и финальным переводом строки.
export function canonicalBaselineJson(baseline: DesignBaseline): string {
  return `${JSON.stringify(baselineContent(baseline), null, 2)}\n`;
}

// Добавляет semantic SHA-256 к baseline после canonical normalization.
export function finalizeBaseline(baseline: DesignBaseline): DesignBaseline {
  const content = canonicalBaselineJson(baseline);
  const hash = createHash("sha256").update(content).digest("hex");
  return { ...baseline, semanticHash: `sha256:${hash}` };
}

// Сериализует полный baseline с hash и гарантированной финальной новой строкой.
export function serializeBaseline(baseline: DesignBaseline): string {
  const finalized = finalizeBaseline(baseline);
  return `${JSON.stringify({ ...baselineContent(finalized), semanticHash: finalized.semanticHash }, null, 2)}\n`;
}

// Проверяет hash и текущую baseline semantics version до offline run.
export function verifyBaseline(baseline: DesignBaseline): void {
  if (baseline.schemaVersion !== 1) {
    throw new Error("BASELINE_SCHEMA_UNSUPPORTED");
  }
  if (baseline.baselineSemanticsVersion !== BASELINE_SEMANTICS_VERSION) {
    throw new Error("BASELINE_SEMANTICS_MISMATCH");
  }
  const expected = finalizeBaseline(baseline).semanticHash;
  if (baseline.semanticHash !== expected) {
    throw new Error("BASELINE_HASH_INVALID");
  }
}

// Проверяет JSON-поля baseline без использования небезопасного type assertion.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Проверяет допустимое имя свойства в сохранённом baseline.
function isPropertyName(value: unknown): value is PropertyName {
  return value === "padding-left" || value === "width";
}

// Проверяет допустимый unit canonical property.
function isPropertyUnit(value: unknown): value is NormalizedProperty["unit"] {
  return value === "px";
}

// Проверяет допустимый reliability canonical property.
function isReliability(value: unknown): value is NormalizedProperty["reliability"] {
  return value === "high";
}

// Проверяет допустимый provenance canonical property.
function isProvenance(value: unknown): value is NormalizedProperty["provenance"] {
  return value === "figma-rest" || value === "browser-computed-style";
}

// Проверяет допустимый тип DesignNode.
function isDesignNodeType(value: unknown): value is DesignNode["type"] {
  return value === "FRAME" || value === "COMPONENT" || value === "INSTANCE" || value === "TEXT" || value === "RECTANGLE";
}

// Проверяет допустимую причину unsupported P0 property.
function isUnsupportedReason(value: unknown): value is UnsupportedProperty["reason"] {
  return value === "figma-value-absent" || value === "node-type-unsupported" || value === "transformed-geometry";
}

// Парсит normalized properties из untrusted JSON в типизированный объект.
function parseProperties(value: Record<string, unknown>): Partial<Record<PropertyName, NormalizedProperty>> {
  const properties: Partial<Record<PropertyName, NormalizedProperty>> = {};
  for (const [key, propertyValue] of Object.entries(value)) {
    if (!isRecord(propertyValue) || !isPropertyName(propertyValue.name) || propertyValue.name !== key || typeof propertyValue.value !== "number" || !isPropertyUnit(propertyValue.unit) || !isReliability(propertyValue.reliability) || !isProvenance(propertyValue.provenance)) {
      throw new Error("BASELINE_INVALID");
    }
    properties[key] = {
      name: propertyValue.name,
      value: propertyValue.value,
      unit: propertyValue.unit,
      reliability: propertyValue.reliability,
      provenance: propertyValue.provenance,
    };
  }
  return properties;
}

// Парсит unsupported diagnostics из untrusted JSON.
function parseUnsupported(value: unknown[]): UnsupportedProperty[] {
  return value.map((item) => {
    if (!isRecord(item) || !isPropertyName(item.name) || !isUnsupportedReason(item.reason)) {
      throw new Error("BASELINE_INVALID");
    }
    return { name: item.name, reason: item.reason };
  });
}

// Загружает committed baseline и валидирует минимальную структуру для offline run.
export function parseBaseline(text: string): DesignBaseline {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || typeof parsed.baselineSemanticsVersion !== "number" || typeof parsed.testId !== "string" || typeof parsed.semanticHash !== "string" || !isRecord(parsed.figma) || typeof parsed.figma.fileKey !== "string" || typeof parsed.figma.version !== "string" || typeof parsed.figma.rootNodeId !== "string" || !Array.isArray(parsed.contractNodeIds) || !parsed.contractNodeIds.every((id) => typeof id === "string") || !isRecord(parsed.nodes)) {
    throw new Error("BASELINE_INVALID");
  }
  const nodes: Record<string, DesignNode> = {};
  for (const [id, value] of Object.entries(parsed.nodes)) {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !isDesignNodeType(value.type) || !isRecord(value.properties) || !Array.isArray(value.unsupported)) {
      throw new Error("BASELINE_INVALID");
    }
    nodes[id] = {
      id: value.id,
      name: value.name,
      type: value.type,
      properties: parseProperties(value.properties),
      unsupported: parseUnsupported(value.unsupported),
    };
  }
  const baseline: DesignBaseline = {
    schemaVersion: 1,
    baselineSemanticsVersion: parsed.baselineSemanticsVersion,
    testId: parsed.testId,
    figma: {
      fileKey: parsed.figma.fileKey,
      version: parsed.figma.version,
      rootNodeId: parsed.figma.rootNodeId,
    },
    contractNodeIds: parsed.contractNodeIds,
    nodes,
    semanticHash: parsed.semanticHash,
  };
  verifyBaseline(baseline);
  return baseline;
}
