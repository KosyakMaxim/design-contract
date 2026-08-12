import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFigmaBaseline } from "./core/figma.js";
import { serializeBaseline } from "./core/baseline.js";
import { loadOfflineBaseline, runSpike3Offline, updateSpike3 } from "./cli/spike3.js";

const rootDirectory = resolve(import.meta.dirname, "..");
const committedBaseline = resolve(rootDirectory, ".design-contract/baselines/spike3-padding-left.json");

interface MockFigmaState {
  version: string;
  paddingLeft: number;
  requests: Array<{ url: string; token: string | undefined }>;
}

// Запускает локальный HTTP server с теми же file и nodes endpoint shape, что и Figma REST.
async function startMockFigma(state: MockFigmaState): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer((request, response) => {
    const url = request.url ?? "";
    const tokenHeader = request.headers["x-figma-token"];
    state.requests.push({ url, token: typeof tokenHeader === "string" ? tokenHeader : undefined });
    response.setHeader("content-type", "application/json");
    if (url.startsWith("/v1/files/spike3-file/nodes")) {
      response.end(JSON.stringify({
        nodes: {
          "42:1337": {
            document: {
              id: "42:1337",
              name: "Checkout",
              type: "FRAME",
              layoutMode: "HORIZONTAL",
              paddingLeft: state.paddingLeft,
            },
          },
        },
      }));
      return;
    }
    response.end(JSON.stringify({
      version: state.version,
      document: { id: "0:0", name: "Mock file", type: "DOCUMENT", children: [] },
    }));
  });
  await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    throw new Error("Could not resolve mock Figma address.");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolvePromise, rejectPromise) => server.close((error) => error === undefined ? resolvePromise() : rejectPromise(error))),
  };
}

// Создаёт параметры controlled exact-version update для mock REST server.
function updateOptions(baseUrl: string, version: string, outputPath: string) {
  return {
    fileKey: "spike3-file",
    version,
    rootNodeId: "42:1337",
    contractNodeIds: ["42:1337"],
    testId: "spike3-padding-left",
    token: "secret-token-for-test",
    baseUrl,
    outputPath,
  };
}

describe("Spike 3: version-pinned Figma baseline", () => {
  it("performs two exact-version updates with identical semantic bytes", async () => {
    const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "design-contract-spike3-"));
    const state: MockFigmaState = { version: "v1", paddingLeft: 24, requests: [] };
    const mock = await startMockFigma(state);
    try {
      const firstPath = resolve(temporaryDirectory, "first.json");
      const secondPath = resolve(temporaryDirectory, "second.json");
      await updateSpike3(updateOptions(mock.baseUrl, "v1", firstPath));
      await updateSpike3(updateOptions(mock.baseUrl, "v1", secondPath));
      expect(await readFile(firstPath, "utf8")).toBe(await readFile(secondPath, "utf8"));
      expect(state.requests).toHaveLength(4);
      expect(state.requests.every((request) => request.token === "secret-token-for-test")).toBe(true);
      expect(state.requests.every((request) => request.url.includes("version=v1"))).toBe(true);
    } finally {
      await mock.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("rejects a response whose returned version differs from the requested version", async () => {
    const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "design-contract-spike3-version-"));
    const state: MockFigmaState = { version: "v2", paddingLeft: 24, requests: [] };
    const mock = await startMockFigma(state);
    try {
      await expect(updateSpike3(updateOptions(mock.baseUrl, "v1", resolve(temporaryDirectory, "mismatch.json")))).rejects.toMatchObject({ code: "FIGMA_VERSION_NOT_FOUND" });
    } finally {
      await mock.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("creates a readable diff when explicitly updated to a new version", async () => {
    const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "design-contract-spike3-diff-"));
    const state: MockFigmaState = { version: "v1", paddingLeft: 24, requests: [] };
    const mock = await startMockFigma(state);
    try {
      const baselinePath = resolve(temporaryDirectory, "baseline.json");
      await updateSpike3(updateOptions(mock.baseUrl, "v1", baselinePath));
      const versionA = await readFile(baselinePath, "utf8");
      state.version = "v2";
      state.paddingLeft = 28;
      await updateSpike3(updateOptions(mock.baseUrl, "v2", baselinePath));
      const versionB = await readFile(baselinePath, "utf8");
      expect(versionB).not.toBe(versionA);
      expect(versionA).toContain('"version": "v1"');
      expect(versionB).toContain('"version": "v2"');
      expect(versionA).toContain('"value": 24');
      expect(versionB).toContain('"value": 28');
    } finally {
      await mock.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("runs from committed baseline without calling Figma and without a token", async () => {
    const before = await loadOfflineBaseline(committedBaseline);
    const previousToken = process.env.FIGMA_ACCESS_TOKEN;
    delete process.env.FIGMA_ACCESS_TOKEN;
    try {
      const result = await runSpike3Offline(committedBaseline, "pass");
      expect(result.status).toBe("configuration-error");
      expect(result.tests[0]?.figmaVersion).toBe(before.figma.version);
    } finally {
      if (previousToken === undefined) {
        delete process.env.FIGMA_ACCESS_TOKEN;
      } else {
        process.env.FIGMA_ACCESS_TOKEN = previousToken;
      }
    }
  });

  it("does not serialize package version and rejects semantics mismatch", async () => {
    const baselineText = await readFile(committedBaseline, "utf8");
    expect(baselineText).not.toContain("toolVersion");
    expect(baselineText).not.toContain("packageVersion");
    const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "design-contract-spike3-semantics-"));
    const incompatiblePath = resolve(temporaryDirectory, "incompatible.json");
    try {
      await writeFile(incompatiblePath, baselineText.replace('"baselineSemanticsVersion": 2', '"baselineSemanticsVersion": 3'), "utf8");
      await expect(loadOfflineBaseline(incompatiblePath)).rejects.toThrow("BASELINE_SEMANTICS_MISMATCH");
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("keeps unsupported P0 values explicit instead of synthesizing a false expected value", () => {
    const baseline = extractFigmaBaseline({ id: "42:1337", name: "Unsupported", type: "FRAME" }, {
      fileKey: "spike3-file",
      version: "v1",
      testId: "unsupported",
      rootNodeId: "42:1337",
      contractNodeIds: ["42:1337"],
    });
    expect(baseline.nodes["42:1337"]?.properties["padding-left"]).toBeUndefined();
    expect(baseline.nodes["42:1337"]?.unsupported).toEqual([
      { name: "padding-top", reason: "figma-value-absent" },
      { name: "padding-right", reason: "figma-value-absent" },
      { name: "padding-bottom", reason: "figma-value-absent" },
      { name: "padding-left", reason: "figma-value-absent" },
    ]);
    const serialized = serializeBaseline(baseline);
    expect(serialized).toContain("figma-value-absent");
    expect(serialized).not.toContain('"value": 0');
  });

  it("sorts contract IDs and node objects independently of input order", () => {
    const baseline = extractFigmaBaseline({
      id: "0:0",
      name: "Root",
      type: "FRAME",
      children: [
        { id: "42:2", name: "Two", type: "FRAME", paddingLeft: 2 },
        { id: "42:1", name: "One", type: "FRAME", paddingLeft: 1 },
      ],
    }, {
      fileKey: "spike3-file",
      version: "v1",
      testId: "ordering",
      rootNodeId: "0:0",
      contractNodeIds: ["42:2", "42:1"],
    });
    const serialized = serializeBaseline(baseline);
    expect(serialized.indexOf('"42:1"')).toBeLessThan(serialized.indexOf('"42:2"'));
    expect(serialized.indexOf('"value": 1')).toBeLessThan(serialized.indexOf('"value": 2'));
  });
});
