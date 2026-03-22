import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["frontend/public/sw.js"],
    languageOptions: {
      globals: {
        caches: "readonly",
        self: "readonly",
      },
    },
  },
  {
    files: ["screenshot.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        setTimeout: "readonly",
        window: "readonly",
      },
    },
  },
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.next/",
      "**/drizzle/",
      "**/coverage/",
      "backend/dist/",
      "shared/dist/",
      "frontend/next-env.d.ts",
    ],
  },
);
