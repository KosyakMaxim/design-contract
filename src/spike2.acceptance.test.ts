import { describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { collectSpike2Sources } from "./cli/spike2.js";

const fixtureRoot = resolve(import.meta.dirname, "../fixtures/vue-vite");
const fixtureSourcePath = resolve(fixtureRoot, "src/FixtureApp.vue");

describe("Spike 2A: Vue SFC source instrumentation", () => {
  it("maps every matrix native host to an exact Vue SFC location", async () => {
    const records = await collectSpike2Sources();
    const byNode = new Map(records.map((record) => [record.nodeId, record.source]));

    expect(byNode.get("42:1000")).toBe("src/FixtureApp.vue:34:7");
    expect(byNode.get("42:1001")).toBe("src/FixtureApp.vue:35:9");
    expect(byNode.get("42:1002")).toBe("src/FixtureApp.vue:38:7");
    expect(byNode.get("42:1003")).toBe("src/FixtureApp.vue:40:9");
    expect(byNode.get("42:1004")).toBe("src/FixtureApp.vue:40:9");
    expect(byNode.get("42:1010")).toBe("src/components/NativeCard.vue:3:5");
    expect(byNode.get("42:200")).toBe("src/FixtureApp.vue:44:7");
  });

  it("does not instrument custom component abstractions", async () => {
    const records = await collectSpike2Sources();
    expect(records.some((record) => record.nodeId === "NativeCard")).toBe(false);
  });

  it("keeps source locations exact after HMR line insertion and deletion", async () => {
    const previousInstrumentation = process.env.DESIGN_CONTRACT;
    const originalSource = await readFile(fixtureSourcePath, "utf8");
    process.env.DESIGN_CONTRACT = "1";
    const server = await createServer({ root: fixtureRoot, server: { host: "127.0.0.1", port: 0 } });
    await server.listen();
    const address = server.httpServer?.address();
    if (address === null || address === undefined || typeof address === "string") {
      await server.close();
      throw new Error("Could not resolve Vue HMR fixture server address.");
    }

    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${address.port}/?variant=matrix`, { waitUntil: "networkidle" });
      expect(await page.locator('[data-design-node="42:1000"]').getAttribute("data-design-test-source")).toBe("src/FixtureApp.vue:34:7");

      const insertedSource = originalSource.replace("      <section data-design-node=\"42:1000\">", "      <!-- HMR line insertion -->\n      <section data-design-node=\"42:1000\">");
      await writeFile(fixtureSourcePath, insertedSource, "utf8");
      await page.waitForFunction(() => document.querySelector('[data-design-node="42:1000"]')?.getAttribute("data-design-test-source") === "src/FixtureApp.vue:35:7");
      expect(await page.locator('[data-design-node="42:1000"]').getAttribute("data-design-test-source")).toBe("src/FixtureApp.vue:35:7");

      await writeFile(fixtureSourcePath, originalSource, "utf8");
      await page.waitForFunction(() => document.querySelector('[data-design-node="42:1000"]')?.getAttribute("data-design-test-source") === "src/FixtureApp.vue:34:7");
      expect(await page.locator('[data-design-node="42:1000"]').getAttribute("data-design-test-source")).toBe("src/FixtureApp.vue:34:7");
    } finally {
      await writeFile(fixtureSourcePath, originalSource, "utf8");
      if (browser !== undefined) {
        await browser.close();
      }
      await server.close();
      if (previousInstrumentation === undefined) {
        delete process.env.DESIGN_CONTRACT;
      } else {
        process.env.DESIGN_CONTRACT = previousInstrumentation;
      }
    }
  });
});
