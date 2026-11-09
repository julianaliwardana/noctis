import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs directly, so FlatCompat is no longer needed.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // New in eslint-plugin-react-hooks 7 (bundled with eslint-config-next 16). They flag patterns
    // that work today but would trip the React Compiler. Warnings until those components are
    // reworked, so the Next 16 upgrade doesn't also have to rewrite ten components.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "public/**/*.js"]),
]);
