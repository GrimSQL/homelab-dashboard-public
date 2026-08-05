import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // New error-level rule in eslint-config-next 16. The three call sites we
      // have are deliberate: two defer time-dependent state to after mount so
      // SSR and the first client render match, and one syncs a card's
      // optimistic local state with refreshed props. Kept as a warning so new
      // occurrences still surface without failing the lint gate.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // globalIgnores replaces the default ignores of eslint-config-next, so the
  // package defaults are repeated here alongside our own.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
