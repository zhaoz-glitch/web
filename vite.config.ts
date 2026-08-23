import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
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
