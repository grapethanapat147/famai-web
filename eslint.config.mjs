import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Famai: lint เฉพาะโค้ด Next.js app — ไม่แตะไฟล์เดิมของ repo (ต้นแบบ/สคริปต์/เอกสาร)
    "tools/**",
    "prototype/**",
    "reference/**",
    "docs/**",
    "supabase/**",
    "index.html",
  ]),
]);

export default eslintConfig;
