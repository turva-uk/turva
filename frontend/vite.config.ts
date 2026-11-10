import react from "@vitejs/plugin-react";
// From `vitest/config`, not `vite`: Vite's own `defineConfig` does not know
// about the `test` key and rejects it at typecheck time.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 so the dev server is reachable from outside its container.
    host: true,
    port: 5173,
    strictPort: true,
    // Proxy the API rather than calling Django cross-origin.
    //
    // This mirrors deployment, where Caddy serves the built bundle and the API
    // from one origin, so the session and CSRF cookies behave in development
    // exactly as they will in production. Developing against a cross-origin
    // setup would mean cookie behaviour that only ever gets exercised on a
    // laptop.
    //
    // `TURVA_API` points this somewhere else - a backend on another port, or a
    // shared one. CORS is configured server-side for that case.
    proxy: {
      "/api": {
        target: process.env.TURVA_API ?? "http://localhost:8000",
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
