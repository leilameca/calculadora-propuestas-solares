import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**", ".tmp/**", "tmp/**", "output/**", "qa-docx/**", "next-env.d.ts", "scripts/*.mjs", "postcss.config.js"] },
  { files: ["**/*.ts", "**/*.tsx"], extends: [js.configs.recommended, ...tseslint.configs.recommended], rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
  } },
);
