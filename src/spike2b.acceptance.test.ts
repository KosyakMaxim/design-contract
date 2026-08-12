import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { collectMappingCounts, collectRuntimeNodes } from "./browser/collect.js";

// Создаёт browser page для isolated ShadowRoot traversal acceptance tests.
async function createShadowPage(): Promise<{ browser: Awaited<ReturnType<typeof chromium.launch>>; page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>> }> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent("<main id=\"root\"></main>");
  return { browser, page };
}

describe("Spike 2B: explicit mapped nodes inside ShadowRoot", () => {
  it("collects a mapped native host from an open ShadowRoot", async () => {
    const { browser, page } = await createShadowPage();
    try {
      await page.evaluate(() => {
        const host = document.querySelector("#root");
        if (host === null) {
          throw new Error("Test host was not found.");
        }
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = '<button data-design-node="42:200" style="padding-left: 24px">Pay</button>';
      });
      await expect(collectMappingCounts(page, ["42:200"])).resolves.toEqual({ "42:200": 1 });
      const nodes = await collectRuntimeNodes(page, ["42:200"]);
      expect(nodes[0]?.tagName).toBe("button");
      expect(nodes[0]?.properties["padding-left"]?.value).toBe(24);
    } finally {
      await browser.close();
    }
  });

  it("traverses nested open ShadowRoots without Vue private runtime access", async () => {
    const { browser, page } = await createShadowPage();
    try {
      await page.evaluate(() => {
        const outerHost = document.querySelector("#root");
        if (outerHost === null) {
          throw new Error("Outer test host was not found.");
        }
        const outerShadow = outerHost.attachShadow({ mode: "open" });
        const innerHost = document.createElement("section");
        outerShadow.append(innerHost);
        const innerShadow = innerHost.attachShadow({ mode: "open" });
        innerShadow.innerHTML = '<div data-design-node="42:201" style="padding-left: 20px"></div>';
      });
      await expect(collectMappingCounts(page, ["42:201"])).resolves.toEqual({ "42:201": 1 });
    } finally {
      await browser.close();
    }
  });

  it("keeps missing and duplicate mappings as cardinality errors", async () => {
    const { browser, page } = await createShadowPage();
    try {
      await page.evaluate(() => {
        const host = document.querySelector("#root");
        if (host === null) {
          throw new Error("Test host was not found.");
        }
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = '<div data-design-node="42:202"></div><div data-design-node="42:202"></div>';
      });
      await expect(collectMappingCounts(page, ["42:203", "42:202"])).resolves.toEqual({ "42:203": 0, "42:202": 2 });
    } finally {
      await browser.close();
    }
  });
});
