import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    env: {
      NEXT_PUBLIC_DATA_MODE: "demo",
      NEXT_PUBLIC_DEFAULT_TIMEZONE: "Asia/Kolkata",
    },
  },
});
