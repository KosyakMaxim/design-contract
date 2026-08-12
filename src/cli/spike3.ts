import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { fetchExactSnapshot } from "../figma/client.js";
import { extractFigmaBaseline } from "../core/figma.js";
import { diffSpike1, summarizeRun } from "../core/diff.js";
import { matchExplicitNodes } from "../core/match.js";
import { finalizeBaseline, parseBaseline, serializeBaseline, verifyBaseline } from "../core/baseline.js";
import type { DesignBaseline, RunResult } from "../core/domain.js";
import { collectMappingCounts, collectRuntimeNodes } from "../browser/collect.js";

const rootDirectory = resolve(import.meta.dirname, "../..");
const fixtureDirectory = resolve(rootDirectory, "fixtures/vue-vite");
const defaultBaselinePath = resolve(rootDirectory, ".design-contract/baselines/spike3-padding-left.json");

export interface Spike3UpdateOptions {
  fileKey: string;
  version: string;
  rootNodeId: string;
  contractNodeIds: string[];
  testId: string;
  token: string;
  baseUrl?: string;
  outputPath?: string;
  fetcher?: typeof fetch;
}

// Записывает baseline атомарно, чтобы не оставить частичный JSON после failed update.
async function writeBaselineAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, path);
}

// Выполняет update только через exact-version Figma API и возвращает canonical baseline.
export async function updateSpike3(options: Spike3UpdateOptions): Promise<DesignBaseline> {
  const snapshot = await fetchExactSnapshot(options, {
    fileKey: options.fileKey,
    version: options.version,
    testId: options.testId,
    rootNodeId: options.rootNodeId,
    contractNodeIds: options.contractNodeIds,
  });
  const baseline = finalizeBaseline(extractFigmaBaseline(snapshot.root, snapshot.input));
  const output = options.outputPath ?? defaultBaselinePath;
  await writeBaselineAtomic(output, serializeBaseline(baseline));
  return baseline;
}

// Загружает committed baseline и проверяет hash/semantics без импорта Figma client.
export async function loadOfflineBaseline(path = defaultBaselinePath): Promise<DesignBaseline> {
  const baseline = parseBaseline(await readFile(path, "utf8"));
  verifyBaseline(baseline);
  return baseline;
}

// Сравнивает committed baseline с уже работающей страницей без запуска Figma API.
async function compareBaselineWithUrl(baseline: DesignBaseline, url: string): Promise<RunResult> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Runtime URL must use http or https.");
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1260, height: 900 }, locale: "ru-RU", timezoneId: "UTC" });
    await page.goto(parsedUrl.toString(), { waitUntil: "networkidle" });
    const counts = await collectMappingCounts(page, baseline.contractNodeIds);
    const matching = matchExplicitNodes(baseline.testId, baseline, counts);
    const runtimeNodes = matching.mappingErrors.length === 0 ? await collectRuntimeNodes(page, baseline.contractNodeIds) : [];
    return summarizeRun(diffSpike1(baseline, matching.matches, matching.mappingErrors, runtimeNodes));
  } finally {
    if (browser !== undefined) {
      await browser.close();
    }
  }
}

// Выполняет token-free comparison committed baseline с внешним Vue/Vite runtime.
export async function runSpike3AtUrl(path: string = defaultBaselinePath, url: string): Promise<RunResult> {
  const baseline = await loadOfflineBaseline(path);
  return compareBaselineWithUrl(baseline, url);
}

// Выполняет полноценный Vue runtime comparison только из committed baseline.
export async function runSpike3Offline(path = defaultBaselinePath, variant = "fail"): Promise<RunResult> {
  const baseline = await loadOfflineBaseline(path);
  const server = await createServer({ root: fixtureDirectory, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === "string") {
    await server.close();
    throw new Error("Could not resolve offline fixture server address.");
  }

  try {
    return await compareBaselineWithUrl(baseline, `http://127.0.0.1:${address.port}/?variant=${encodeURIComponent(variant)}`);
  } finally {
    await server.close();
  }
}

// Разбирает минимальные update CLI arguments без добавления аргумент-парсера.
function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

// Выполняет update command с обязательными exact version, file key и token.
async function updateCommand(): Promise<void> {
  const fileKey = argument("--figma-file-key");
  const version = argument("--figma-version");
  const rootNodeId = argument("--root-node-id") ?? "42:1337";
  const testId = argument("--test-id") ?? "spike3-padding-left";
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (fileKey === undefined || version === undefined || token === undefined) {
    throw new Error("Usage: spike3:update --figma-file-key <key> --figma-version <version> with FIGMA_ACCESS_TOKEN.");
  }
  const baseline = await updateSpike3({
    fileKey,
    version,
    rootNodeId,
    contractNodeIds: [rootNodeId],
    testId,
    token,
    ...(process.env.DESIGN_CONTRACT_FIGMA_API_BASE_URL === undefined ? {} : { baseUrl: process.env.DESIGN_CONTRACT_FIGMA_API_BASE_URL }),
  });
  process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
}

// Выполняет token-free offline run и печатает только semantic result.
async function runCommand(): Promise<void> {
  const url = argument("--url");
  const result = url === undefined ? await runSpike3Offline() : await runSpike3AtUrl(defaultBaselinePath, url);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.exitCode;
}

// Выбирает update/run command только при прямом запуске CLI файла.
async function main(): Promise<void> {
  if (process.argv[2] === "update") {
    await updateCommand();
    return;
  }
  await runCommand();
}

// Не запускает CLI при импорте acceptance tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
