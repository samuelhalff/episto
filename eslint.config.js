import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  // Build/CI scripts run under node, not in a browser or a bundle.
  {
    files: ["scripts/**/*.mjs", "ci/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
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
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.next/",
      "**/.next-turbo/", // legacy; harmless
      "**/drizzle/",
      "**/coverage/",
      "backend/dist/",
      "shared/dist/",
      "frontend/next-env.d.ts",
    ],
  },
);
