import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs", "tests/**/*.test.js"],
    testTimeout: 30_000,
    hookTimeout: 10_000,
  },
});
