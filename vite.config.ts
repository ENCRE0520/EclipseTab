import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Custom plugin to inline SVG files as data URLs
// This fixes slow SVG loading in Firefox by eliminating extra HTTP requests
function svgInlinePlugin(): Plugin {
  return {
    name: 'svg-inline',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('.svg')) {
        const svgContent = fs.readFileSync(id, 'utf-8');
        const base64 = Buffer.from(svgContent).toString('base64');
        const dataUrl = `data:image/svg+xml;base64,${base64}`;
        return `export default "${dataUrl}"`;
      }
    },
  };
}

export default defineConfig({
  plugins: [svgInlinePlugin(), react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ========================================================================
  // 性能优化: esbuild 压缩配置 (移除 console 和 debugger)
  // ========================================================================
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'esnext',
    // CSS 代码分割
    cssCodeSplit: true,
    // ========================================================================
    // Rollup 优化配置
    // ========================================================================
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // 代码分割: 将 vendor 库分离到独立 chunk
        manualChunks: {
          // React 核心库单独打包（缓存友好）
          'vendor-react': ['react', 'react-dom'],
          // 工具库单独打包
          'vendor-utils': ['colord'],
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Tree-shaking 优化
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
  },
});

