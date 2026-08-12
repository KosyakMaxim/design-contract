import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runSpike3Offline } from "./cli/spike3.js";
import { extractFigmaBaseline } from "./core/figma.js";
import { serializeBaseline } from "./core/baseline.js";

// Создаёт committed-like baseline для deterministic pass/fail scenarios без Figma network.
async function createDeterminismBaseline(): Promise<{ directory: string; path: string }> {
  const directory = await mkdtemp(resolve(tmpdir(), "design-contract-spike5-"));
  const baseline = extractFigmaBaseline({ id: "0:0", name: "Fixture root", type: "DOCUMENT", children: [{ id: "42:1337", name: "Checkout", type: "FRAME", paddingLeft: 24 }] }, { fileKey: "spike5-fixture", version: "v5", testId: "spike5-padding-left", rootNodeId: "42:1337", contractNodeIds: ["42:1337"] });
  const path = resolve(directory, "baseline.json");
  await writeFile(path, serializeBaseline(baseline), "utf8");
  return { directory, path };
}

// Возвращает hash semantic JSON без временных/процессных полей.
function semanticHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

// Проверяет двадцать повторов одного сценария и одну exit category.
async function assertDeterministicScenario(path: string, variant: "pass" | "fail", expectedExitCode: 0 | 1): Promise<void> {
  const results = [];
  for (let index = 0; index < 20; index += 1) results.push(await runSpike3Offline(path, variant));
  expect(new Set(results.map((result) => semanticHash(result))).size).toBe(1);
  expect(new Set(results.map((result) => result.exitCode))).toEqual(new Set([expectedExitCode]));
  expect(results.every((result) => result.tests[0]?.differences.every((difference) => !("timestamp" in difference)))).toBe(true);
}

describe("Spike 5: pinned CI determinism", () => {
  it("produces one semantic hash for twenty pass and twenty seeded-failure runs", async () => {
    const fixture = await createDeterminismBaseline();
    try {
      await assertDeterministicScenario(fixture.path, "pass", 0);
      await assertDeterministicScenario(fixture.path, "fail", 1);
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  }, 180_000);
});
