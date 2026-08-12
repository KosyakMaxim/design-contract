import { chromium } from "playwright";
import { createServer } from "vite";
import { resolve } from "node:path";

const rootDirectory = resolve(import.meta.dirname, "../..");
const fixtureDirectory = resolve(rootDirectory, "fixtures/vue-vite");

export interface Spike2SourceRecord {
  nodeId: string;
  source: string | null;
}

// Запускает instrumented Vue Vite dev server и возвращает source metadata реальных DOM host elements.
export async function collectSpike2Sources(variant = "matrix"): Promise<Spike2SourceRecord[]> {
  const previousInstrumentation = process.env.DESIGN_CONTRACT;
  process.env.DESIGN_CONTRACT = "1";
  const server = await createServer({ root: fixtureDirectory, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === "string") {
    await server.close();
    throw new Error("Could not resolve Vue fixture server address.");
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, locale: "en-US", timezoneId: "UTC" });
    await page.goto(`http://127.0.0.1:${address.port}/?variant=${encodeURIComponent(variant)}`, { waitUntil: "networkidle" });
    return await page.locator("[data-design-node]").evaluateAll((elements) => elements.map((element) => ({
      nodeId: element.getAttribute("data-design-node") ?? "",
      source: element.getAttribute("data-design-test-source"),
    })));
  } finally {
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
}

// Запускает CLI-проверку Spike 2A при прямом вызове файла.
async function main(): Promise<void> {
  const records = await collectSpike2Sources(process.argv[2] ?? "matrix");
  process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
}

// Не запускает CLI при импорте acceptance tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
