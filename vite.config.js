import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) =>{

  // 根据当前 mode 加载 .env 文件
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [vue(), vueJsx()],
    base: "/ai/",
    server: {
      port: 4000,
      proxy: {
        '/api': {
          target: 'http://localhost:5101/mcp-client',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/test-api': {
          target: 'http://10.0.20.102:8001/basis-manager',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/test-api/, '')
        }
      }
    },
    resolve: {
      alias: {
        // 设置路径
        "~": path.resolve(__dirname, "./"),
        // 设置别名
        "@": path.resolve(__dirname, "./src"),
        vue: "vue/dist/vue.esm-bundler.js",
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
  }})
