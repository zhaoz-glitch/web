import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this repo under /web/, so all built asset URLs
  // must be prefixed accordingly (leave undefined for local dev).
  base: process.env.GITHUB_PAGES === "true" ? "/web/" : "/",
  // Keep SSR CSS assets in the server build instead of letting the
  // react-router plugin delete them (its rm() call fails under the
  // sandboxed shell). Server output is unused in SPA mode anyway.
  build: {
    ssrEmitAssets: true,
    // Keep .vite/manifest.json in the output — skips the plugin's rm()
    // cleanup which fails under the sandboxed shell. Harmless extra file.
    manifest: true,
  },
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      // 将前端 /api 请求代理到 Flask 后端（端口 5000）
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // 健康检查接口也走代理
      "/health": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
