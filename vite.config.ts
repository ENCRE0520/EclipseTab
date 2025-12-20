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
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});

