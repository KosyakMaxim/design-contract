import type { DesignBaseline, MappingError, NodeMatch } from "./domain.js";

// Возвращает canonical CSS selector с явным ID, без fallback-selector или heuristic matching.
export function selectorForDesignNode(id: string): string {
  return `[data-design-node="${id}"]`;
}

// Проверяет cardinality каждого contract ID и создает match только для ровно одного DOM host.
export function matchExplicitNodes(
  testId: string,
  baseline: DesignBaseline,
  counts: Record<string, number>,
): { matches: NodeMatch[]; mappingErrors: MappingError[] } {
  const matches: NodeMatch[] = [];
  const mappingErrors: MappingError[] = [];

  for (const id of [...baseline.contractNodeIds].sort()) {
    const count = counts[id] ?? 0;
    const selector = selectorForDesignNode(id);

    if (count === 0) {
      mappingErrors.push({
        code: "MAPPING_MISSING",
        testId,
        designNodeId: id,
        message: `No DOM element found for required Figma node ${id}.`,
      });
      continue;
    }

    if (count > 1) {
      mappingErrors.push({
        code: "MAPPING_DUPLICATE",
        testId,
        designNodeId: id,
        message: `Expected exactly one DOM element for ${id}; found ${count}.`,
      });
      continue;
    }

    matches.push({ designNodeId: id, runtimeSelector: selector, strategy: "explicit" });
  }

  return { matches, mappingErrors };
}
