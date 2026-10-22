import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["lucide-react", "clsx", "tailwind-merge"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-utils": ["axios", "zod"],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    host: true,
    // ── API Proxy ─────────────────────────────────────────────────────────────
    // All /api/* requests are proxied to the backend. The real backend URL is
    // NEVER exposed to the browser — only the Vite dev server URL is visible.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
