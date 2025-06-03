import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node22",
    outDir: "dist",
  },
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "node22",
    outDir: "dist",
  },
]);
