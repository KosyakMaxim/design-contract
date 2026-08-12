import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { resolve } from "node:path";
import {
  createDesignContractVueSourcePlugin,
  createDesignContractVueTransform,
} from "../../src/vite/vue-source-transform.js";

// Настраивает официальный Vue Vite plugin и включает source instrumentation только в contract build.
export default defineConfig({
  plugins: [
    ...(process.env.DESIGN_CONTRACT === "1" ? [createDesignContractVueSourcePlugin()] : []),
    vue({
      template: {
        compilerOptions: {
          nodeTransforms: process.env.DESIGN_CONTRACT === "1"
            ? [createDesignContractVueTransform({
                repoRoot: process.cwd().endsWith("/fixtures/vue-vite")
                  ? process.cwd()
                  : resolve(process.cwd(), "fixtures/vue-vite"),
              })]
            : [],
        },
      },
    }),
  ],
});
