import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const rootDirectory = resolve(import.meta.dirname, "..");
const fixtureDirectory = resolve(rootDirectory, "fixtures/vue-vite");

// Собирает fixture с указанным instrumentation env и возвращает весь JS output.
async function buildFixture(instrumented: boolean): Promise<string> {
  const outputDirectory = await mkdtemp(resolve(tmpdir(), "design-contract-vue-build-"));
  const previousInstrumentation = process.env.DESIGN_CONTRACT;
  if (instrumented) {
    process.env.DESIGN_CONTRACT = "1";
  } else {
    delete process.env.DESIGN_CONTRACT;
  }

  try {
    await build({
      root: fixtureDirectory,
      configFile: resolve(fixtureDirectory, "vite.config.ts"),
      build: { outDir: outputDirectory, emptyOutDir: true },
    });
    const files = await readdir(resolve(outputDirectory, "assets"));
    const javascript = files.filter((file) => file.endsWith(".js"));
    const contents = await Promise.all(javascript.map((file) => readFile(resolve(outputDirectory, "assets", file), "utf8")));
    return contents.join("\n");
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
    if (previousInstrumentation === undefined) {
      delete process.env.DESIGN_CONTRACT;
    } else {
      process.env.DESIGN_CONTRACT = previousInstrumentation;
    }
  }
}

describe("Spike 2A: Vue Vite build gates", () => {
  it("keeps exact source attributes in an instrumented build", async () => {
    const output = await buildFixture(true);
    expect(output).toContain("src/FixtureApp.vue:34:7");
    expect(output).toContain("src/components/NativeCard.vue:3:5");
  });

  it("contains zero source attributes in a production build without instrumentation", async () => {
    const output = await buildFixture(false);
    expect(output).not.toContain("data-design-test-source");
    expect(output).not.toContain("src/FixtureApp.vue:");
  });
});
