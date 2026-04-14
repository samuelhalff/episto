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
    include: ["**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_SITE_URL: "https://example.test",
      NEXT_PUBLIC_API_URL: "/api",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_APP_ENV: "test",
    },
    coverage: {
      all: false,
      provider: "v8",
      include: ["shared/src/**", "backend/src/**", "frontend/src/**"],
      exclude: [
        "frontend/src/app/layout.tsx",
        "frontend/src/app/global-error.tsx",
        "frontend/src/app/not-found.tsx",
        "frontend/src/app/[locale]/layout.tsx",
        "frontend/src/app/[locale]/error.tsx",
        "frontend/src/app/[locale]/loading.tsx",
        "frontend/src/app/[locale]/not-found.tsx",
        "frontend/src/app/[locale]/**/layout.tsx",
        "frontend/src/components/branding/**",
        "frontend/src/components/layout/**",
        "frontend/src/components/marketing/**",
        "frontend/src/i18n/**",
        "frontend/src/proxy.ts",
        "backend/src/scripts/**",
        "backend/src/db/schema/index.ts",
        "backend/src/db/schema/relations.ts",
        "backend/src/types/**",
        "backend/src/modules/admin/**",
        "backend/src/modules/ai/adapters/**",
        "backend/src/modules/ai/ai.service.ts",
        "backend/src/modules/dispatch/**",
        "backend/src/modules/drafting/dictation.routes.ts",
        "backend/src/modules/drafting/draft.service.ts",
        "backend/src/modules/files/**",
        "backend/src/modules/payments/adapters/**",
        "backend/src/modules/payments/payment.service.ts",
        "backend/src/modules/rendering/snapshot.service.ts",
        "backend/src/modules/sessions/**",
        "backend/src/shared/redis-lock.ts",
        "backend/src/workers/cleanup-assets.worker.ts",
        "backend/src/workers/dispatch-settlement.ts",
        "backend/src/workers/email.worker.ts",
      ],
      reporter: ["text", "lcov", "html", "json-summary"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
