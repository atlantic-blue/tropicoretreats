import { defineConfig } from "eslint/config";
import typescriptParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
]);
