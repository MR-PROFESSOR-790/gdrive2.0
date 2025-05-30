import { FlatCompat } from "@eslint/eslintrc";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  {
    plugins: {
      prettier: prettierPlugin,
    },
    extends: compat.extends("next/core-web-vitals", "next/typescript", "prettier"),

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/display-name": "off",
      "react/jsx-key": "off",
      "react/prop-types": "off",
      "prettier/prettier": [
        "warn",
        {
          endOfLine: "auto",
        },
      ],
    },

    ignores: [
      "node_modules/**",
      ".next/**",
      "contracts/deployedContracts.ts"
    ],
  },
]);
