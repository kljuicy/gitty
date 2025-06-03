import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "cobertura"],
      exclude: [
        "node_modules/",
        "dist/",
        "page/",
        "__tests__/",
        "integration-tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types.ts",
      ],
    },
  },
});
