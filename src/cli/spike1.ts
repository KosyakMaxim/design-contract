import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { extractSpike1Baseline } from "../core/figma.js";
import { diffSpike1, summarizeRun } from "../core/diff.js";
import type { RunResult } from "../core/domain.js";
import { matchExplicitNodes } from "../core/match.js";
import { collectMappingCounts, collectRuntimeNodes } from "../browser/collect.js";

const rootDirectory = resolve(import.meta.dirname, "../..");
const fixtureDirectory = resolve(rootDirectory, "fixtures/vue-vite");
const rawFixturePath = resolve(rootDirectory, "fixtures/figma/raw/spike1-node.json");

// Выполняет полный Spike 1 flow: raw Figma fixture → Vite → Playwright → explicit diff.
export async function runSpike1(variant = "fail"): Promise<RunResult> {
  const rawFixture = JSON.parse(await readFile(rawFixturePath, "utf8"));
  const baseline = extractSpike1Baseline(rawFixture);
  const server = await createServer({ root: fixtureDirectory, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === "string") {
    await server.close();
    throw new Error("Could not resolve fixture server address.");
  }

  // Запускает только документированную pinned-версию Chromium из Playwright без временного override.
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, locale: "en-US", timezoneId: "UTC" });
    await page.goto(`http://127.0.0.1:${address.port}/?variant=${encodeURIComponent(variant)}`, { waitUntil: "networkidle" });
    const counts = await collectMappingCounts(page, baseline.contractNodeIds);
    const matching = matchExplicitNodes(baseline.testId, baseline, counts);
    const runtimeNodes = matching.mappingErrors.length === 0 ? await collectRuntimeNodes(page, baseline.contractNodeIds) : [];
    const testResult = diffSpike1(baseline, matching.matches, matching.mappingErrors, runtimeNodes);
    return summarizeRun(testResult);
  } finally {
    await browser.close();
    await server.close();
  }
}

// Преобразует semantic result в минимальный терминальный вывод без volatile данных.
function formatTerminal(result: RunResult): string {
  const test = result.tests[0];
  const difference = test?.differences[0];
  if (difference !== undefined) {
    return `${difference.property}\nexpected: ${difference.expected}px\nactual:   ${difference.actual}px\nDOM: ${difference.selector}\nFAIL`;
  }
  if (test?.mappingErrors[0] !== undefined) {
    return `${test.mappingErrors[0].code}\n${test.mappingErrors[0].message}`;
  }
  return "PASS";
}

// Запускает CLI только при прямом вызове файла и возвращает стабильный exit category.
async function main(): Promise<void> {
  const variant = process.argv[2] ?? "fail";
  const result = await runSpike1(variant);
  process.stdout.write(`${formatTerminal(result)}\n${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.exitCode;
}

// Не выполняет CLI при импорте в acceptance tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
