import type { Page } from "playwright";
import type { RuntimeNode } from "../core/domain.js";
import { selectorForDesignNode } from "../core/match.js";

// Собирает cardinality explicit mappings одним page.evaluate до property collection.
export async function collectMappingCounts(page: Page, ids: string[]): Promise<Record<string, number>> {
  return page.evaluate((designNodeIds) => {
    // Обходит document и все доступные open ShadowRoot без обращения к Vue runtime internals.
    const roots: Array<Document | ShadowRoot> = [document];
    const elements: Element[] = [];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      if (root === undefined) {
        continue;
      }
      for (const element of root.querySelectorAll("*")) {
        elements.push(element);
        if (element.shadowRoot !== null) {
          roots.push(element.shadowRoot);
        }
      }
    }

    // Считает explicit mappings одинаково в light DOM и в доступных ShadowRoot.
    const counts: Record<string, number> = {};
    for (const id of designNodeIds) {
      counts[id] = elements.filter((element) => element.getAttribute("data-design-node") === id).length;
    }
    return counts;
  }, ids);
}

// Собирает padding-left только после успешной cardinality validation.
export async function collectRuntimeNodes(page: Page, ids: string[]): Promise<RuntimeNode[]> {
  const collected = await page.evaluate((designNodeIds) => {
    // Обходит document и все доступные open ShadowRoot для получения реального native host.
    const roots: Array<Document | ShadowRoot> = [document];
    const elements: Element[] = [];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      if (root === undefined) {
        continue;
      }
      for (const element of root.querySelectorAll("*")) {
        elements.push(element);
        if (element.shadowRoot !== null) {
          roots.push(element.shadowRoot);
        }
      }
    }

    // Ищет ровно один explicit mapping по значению атрибута, не используя эвристики.
    return designNodeIds.map((id) => {
      const selector = `[data-design-node="${id}"]`;
      const element = elements.find((candidate) => candidate.getAttribute("data-design-node") === id);
      if (element === undefined || !(element instanceof HTMLElement)) {
        throw new Error(`Mapped element disappeared for ${id}.`);
      }

      const value = Number.parseFloat(window.getComputedStyle(element).paddingLeft);
      return {
        designNodeId: id,
        selector,
        tagName: element.tagName.toLowerCase(),
        value,
      };
    });
  }, ids);

  return collected.map((node) => ({
    designNodeId: node.designNodeId,
    selector: node.selector,
    tagName: node.tagName,
    properties: {
      "padding-left": {
        name: "padding-left",
        value: node.value,
        unit: "px",
        reliability: "high",
        provenance: "browser-computed-style",
      },
    },
    unsupported: [],
  }));
}

// Экспортирует selector helper рядом с browser adapter для прозрачной проверки canonical locator.
export { selectorForDesignNode };
