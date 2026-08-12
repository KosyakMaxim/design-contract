import { BASELINE_SEMANTICS_VERSION } from "./domain.js";
import type { DesignBaseline, DesignNode, NormalizedProperty, PropertyName } from "./domain.js";

interface RawFigmaNode {
  id: string;
  name?: string;
  type: string;
  paddingLeft?: number;
  absoluteBoundingBox?: { width?: number; height?: number };
  layoutMode?: string;
  layoutAlign?: string;
  opacity?: number;
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

// Добавляет нормализованное свойство Figma с единым provenance и px unit.
function numericProperty(name: PropertyName, value: number): NormalizedProperty {
  return {
    name,
    value,
    unit: "px",
    reliability: "high",
    provenance: "figma-rest",
  };
}

// Проверяет поддержанный Figma node type до формирования canonical DesignNode.
function isSupportedNodeType(value: string): value is DesignNode["type"] {
  return value === "FRAME" || value === "COMPONENT" || value === "INSTANCE" || value === "TEXT" || value === "RECTANGLE";
}

// Извлекает P0-поле padding-left и явно фиксирует отсутствующие поддержанные поля.
function extractProperties(node: RawFigmaNode): { properties: DesignNode["properties"]; unsupported: DesignNode["unsupported"] } {
  const properties: DesignNode["properties"] = {};
  const unsupported: DesignNode["unsupported"] = [];
  if (node.paddingLeft !== undefined && Number.isFinite(node.paddingLeft)) {
    properties["padding-left"] = numericProperty("padding-left", node.paddingLeft);
  } else {
    unsupported.push({ name: "padding-left", reason: "figma-value-absent" });
  }
  if (node.absoluteBoundingBox?.width !== undefined && Number.isFinite(node.absoluteBoundingBox.width)) {
    properties.width = numericProperty("width", node.absoluteBoundingBox.width);
  }
  return { properties, unsupported };
}

// Извлекает один raw Figma node из дерева без эвристического поиска по имени или геометрии.
function findNodeById(node: RawFigmaNode, id: string): RawFigmaNode | undefined {
  if (node.id === id) {
    return node;
  }

  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

// Преобразует только документированное поле Figma paddingLeft в canonical padding-left.
export function extractSpike1Baseline(raw: RawFigmaFixture): DesignBaseline {
  return extractFigmaBaseline(raw.document, {
    fileKey: "spike1-fixture-file",
    version: raw.version,
    testId: "spike1-padding-left",
    rootNodeId: "42:1337",
    contractNodeIds: ["42:1337"],
  });
}

// Преобразует exact-version Figma subtree в canonical DesignBaseline без сетевой логики.
export function extractFigmaBaseline(root: RawFigmaNode, input: FigmaExtractionInput): DesignBaseline {
  const nodes: Record<string, DesignNode> = {};
  for (const id of [...input.contractNodeIds].sort()) {
    const node = findNodeById(root, id);
    if (node === undefined) {
      throw new Error(`Figma node ${id} was not found in the exact version subtree.`);
    }
    if (!isSupportedNodeType(node.type)) {
      throw new Error(`Figma node ${id} has unsupported type ${node.type}.`);
    }
    const extracted = extractProperties(node);
    nodes[id] = {
      id: node.id,
      name: node.name ?? node.id,
      type: node.type,
      properties: extracted.properties,
      unsupported: extracted.unsupported,
    };
  }

  return {
    schemaVersion: 1,
    baselineSemanticsVersion: BASELINE_SEMANTICS_VERSION,
    testId: input.testId,
    figma: {
      fileKey: input.fileKey,
      version: input.version,
      rootNodeId: input.rootNodeId,
    },
    contractNodeIds: [...input.contractNodeIds].sort(),
    nodes,
    semanticHash: "sha256:pending",
  };
}
