import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "frontend/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    env: {
      NEXT_PUBLIC_SITE_URL: "https://example.test",
      NEXT_PUBLIC_API_URL: "/api",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_APP_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["shared/src/**", "backend/src/**"],
    },
  },
});
