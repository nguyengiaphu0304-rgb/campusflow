import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.CAMPUSFLOW_BASE_PATH ?? "/";
if (!base.startsWith("/") || !base.endsWith("/") || base.includes("//")) {
  throw new Error("CAMPUSFLOW_BASE_PATH must be a single absolute path ending in '/'.");
}

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
