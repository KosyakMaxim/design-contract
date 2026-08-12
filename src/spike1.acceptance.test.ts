import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runSpike1 } from "./cli/spike1.js";

// Проверяет полный acceptance matrix Spike 1 в реальном Chromium.
describe("Spike 1: explicit Figma node to DOM property difference", () => {
  // Проверяет seeded mismatch с сохранением обеих сторон сравнения.
  it("reports 24px expected and 20px actual as one design failure", async () => {
    const result = await runSpike1("fail");
    expect(result.exitCode).toBe(1);
    expect(result.tests[0]?.differences).toEqual([
      expect.objectContaining({
        property: "padding-left",
        expected: 24,
        actual: 20,
        selector: '[data-design-node="42:1337"]',
      }),
    ]);
    expect(result.tests[0]?.differences[0]).not.toHaveProperty("source");
  });

  // Проверяет зелёный runtime-вариант с тем же explicit mapping.
  it("passes when runtime padding-left is 24px", async () => {
    const result = await runSpike1("pass");
    expect(result.exitCode).toBe(0);
    expect(result.tests[0]?.differences).toEqual([]);
  });

  // Проверяет отсутствие обязательного DOM host как configuration error.
  it("returns MAPPING_MISSING as a configuration error", async () => {
    const result = await runSpike1("missing");
    expect(result.exitCode).toBe(2);
    expect(result.tests[0]?.mappingErrors[0]?.code).toBe("MAPPING_MISSING");
  });

  // Проверяет нарушение exactly-one mapping invariant.
  it("returns MAPPING_DUPLICATE as a configuration error", async () => {
    const result = await runSpike1("duplicate");
    expect(result.exitCode).toBe(2);
    expect(result.tests[0]?.mappingErrors[0]?.code).toBe("MAPPING_DUPLICATE");
  });

  // Проверяет byte-identical semantic result на десяти одинаковых запусках.
  it("produces an identical semantic result for ten repeated failing runs", async () => {
    const results = [];
    for (let index = 0; index < 10; index += 1) {
      results.push(await runSpike1("fail"));
    }

    const serialized = results.map((result) => JSON.stringify(result));
    const hashes = new Set(serialized.map((value) => createHash("sha256").update(value).digest("hex")));
    expect(hashes.size).toBe(1);
    expect(new Set(results.map((result) => result.exitCode)).size).toBe(1);
  }, 120_000);
});
