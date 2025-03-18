import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// パフォーマンス最適化のための設定
// 1. コードチャンキング: 遅延ロードでコードを複数の小さなチャンクに分割
// 2. ツリーシェイキング: 未使用のコードを削除
// 3. 圧縮最適化: terserを使用したJS圧縮

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  // 依存関係の最適化
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'wouter',
      '@radix-ui/react-slot',
      '@radix-ui/react-primitive'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  esbuild: {
    // グローバルな名前の定義
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    // トランスパイルの対象設定
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: ['console.log'],
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: true,
        propertyReadSideEffects: true,
        tryCatchDeoptimization: false
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks(id) {
          // Reactとその依存関係は全て同じチャンクに
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/@radix-ui/react-primitive') ||
              id.includes('node_modules/wouter')) {
            return 'vendor';
          }
          
          // Radix UIのコアユーティリティを一つのチャンクに
          if (id.includes('node_modules/@radix-ui/react-slot') ||
              id.includes('node_modules/@radix-ui/react-context') ||
              id.includes('node_modules/@radix-ui/react-compose-refs') ||
              id.includes('node_modules/@radix-ui/react-use-callback-ref') ||
              id.includes('node_modules/@radix-ui/react-use-controllable-state') ||
              id.includes('node_modules/@radix-ui/react-id') ||
              id.includes('node_modules/@radix-ui/react-direction') ||
              id.includes('node_modules/@radix-ui/react-use-layout-effect')) {
            return 'react-utils';
          }
          
          // UIコンポーネントライブラリをより大きなグループに
          if (id.includes('node_modules/@radix-ui') || 
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'ui';
          }
          
          // データ処理ライブラリ
          if (id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/jotai') ||
              id.includes('node_modules/date-fns')) {
            return 'data';
          }
          
          // グラフライブラリ
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          
          // フォームライブラリ
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/resolvers') ||
              id.includes('node_modules/zod')) {
            return 'forms';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.cjs')
  },
});
