import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import korope from "./eslint/korope-plugin.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { korope },
    rules: {
      "korope/no-raw-style-values": "error",
      "korope/no-pill-buttons": "error",
      "korope/no-bad-copy": "error",
    },
  },
  {
    files: ["src/lib/copy.ts", "src/**/copy.ts"],
    plugins: { korope },
    rules: { "korope/no-bad-copy-strings": "error" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
    "supabase/functions/**",
    "public/sw.js",
    "tailwind.korope.js",
    "tailwind.config.js",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
