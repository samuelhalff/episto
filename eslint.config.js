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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["backend/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/shared/src/**"],
              message:
                "Import shared contracts through @swiss-mail/shared, not shared/src paths.",
            },
            {
              group: [
                "@aws-sdk/*",
                "stripe",
                "@stripe/*",
                "openai",
                "@azure/ai-projects",
                "@azure/identity",
                "resend",
              ],
              message:
                "Import provider SDKs only inside backend adapter modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "backend/src/modules/ai/adapters/**/*.ts",
      "backend/src/modules/email/**/*.ts",
      "backend/src/modules/files/adapters/**/*.ts",
      "backend/src/modules/payments/adapters/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/shared/src/**"],
              message:
                "Import shared contracts through @swiss-mail/shared, not shared/src paths.",
            },
          ],
        },
      ],
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
