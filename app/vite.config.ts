import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  test: { include: ["src/**/*.test.ts"] },
});
