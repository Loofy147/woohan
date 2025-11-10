import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/index.ts",
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    reporters: ["default", "html"],
    outputFile: {
      html: "./test-results/index.html",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@server": path.resolve(import.meta.dirname, "./server"),
      "@tests": path.resolve(import.meta.dirname, "./tests"),
    },
  },
});
